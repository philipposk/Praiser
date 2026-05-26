import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

import { ChainedRotator, type ChatMessage } from "@/lib/llm-rotator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 20;
const MAX_REPLY_CHARS = 3500; // Telegram caps text messages at 4096 chars.

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number; type?: string; first_name?: string; username?: string };
    text?: string;
    from?: { id?: number; first_name?: string; username?: string };
  };
};

type TelegramChat = {
  chatId: number;
  language: "el" | "en";
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

let cachedChain: ChainedRotator | null = null;
const getRotator = (): ChainedRotator => {
  if (cachedChain) return cachedChain;
  cachedChain = new ChainedRotator({
    groqKey: process.env.GROQ_API_KEY,
    openRouterKey: process.env.OPENROUTER_API_KEY,
    nvidiaKey: process.env.NVCF_API_KEY ?? process.env.NVIDIA_API_KEY,
    appName: "Praiser-Telegram",
  });
  if (cachedChain.providerCount === 0) {
    throw new Error("No LLM provider configured.");
  }
  return cachedChain;
};

const blobPath = (chatId: number) => `telegram-chats/${chatId}.json`;

const loadChat = async (chatId: number): Promise<TelegramChat | null> => {
  try {
    const { blobs } = await list({ prefix: blobPath(chatId), limit: 1 });
    const exact = blobs.find((b) => b.pathname === blobPath(chatId));
    if (!exact) return null;
    const response = await fetch(exact.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as TelegramChat;
  } catch {
    return null;
  }
};

const saveChat = async (chat: TelegramChat): Promise<void> => {
  const trimmed: TelegramChat = {
    ...chat,
    history: chat.history.slice(-HISTORY_LIMIT),
  };
  await put(blobPath(chat.chatId), new Blob([JSON.stringify(trimmed)], { type: "application/json" }), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
};

const sendTelegramMessage = async (
  token: string,
  chatId: number,
  text: string,
): Promise<void> => {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, MAX_REPLY_CHARS),
      parse_mode: "Markdown",
    }),
  }).catch((error) => {
    console.error("Telegram sendMessage failed", error);
  });
};

const detectLanguage = (text: string): "el" | "en" =>
  /[Ͱ-Ͽἀ-῿]/.test(text) ? "el" : "en";

const BASE_SYSTEM_PROMPT_EN = `You are Praiser, a warm, witty, fast-thinking assistant on Telegram. You celebrate people, write personalised messages, and answer questions. Keep replies under 600 characters unless asked otherwise. Use light Markdown (*bold*, _italic_) sparingly.`;

const BASE_SYSTEM_PROMPT_EL = `Είσαι ο Praiser, ένας ζεστός, πνευματώδης, γρήγορος βοηθός στο Telegram. Επαινείς ανθρώπους, γράφεις προσωποποιημένα μηνύματα, απαντάς σε ερωτήσεις. Κράτα τις απαντήσεις κάτω από 600 χαρακτήρες εκτός κι αν ζητηθεί διαφορετικά. Χρησιμοποίησε ελαφρύ Markdown με μέτρο.`;

const handleCommand = (text: string, lang: "el" | "en"): string | null => {
  const lower = text.trim().toLowerCase();
  if (lower === "/start") {
    return lang === "el"
      ? "Γεια! Είμαι ο Praiser. Πες μου ποιον θες να επαινέσω και θα φτιάξουμε κάτι όμορφο. Στείλε /reset για να ξεκινήσουμε φρέσκια συζήτηση."
      : "Hi! I'm Praiser. Tell me who you want me to celebrate and we'll write something good. Send /reset to start a fresh conversation.";
  }
  if (lower === "/reset") {
    return lang === "el" ? "Καθάρισα το ιστορικό. Ποιον επαινούμε;" : "History cleared. Who shall we praise?";
  }
  if (lower === "/help") {
    return lang === "el"
      ? "Εντολές: /start, /reset, /help. Άλλα στείλε ένα μήνυμα και θα απαντήσω."
      : "Commands: /start, /reset, /help. Otherwise just send a message and I'll reply.";
  }
  return null;
};

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Telegram bot not configured (TELEGRAM_BOT_TOKEN unset)" },
      { status: 503 },
    );
  }

  // Optional shared-secret check. Telegram sends this header if you used
  // setWebhook with secret_token. Recommended to set it.
  const requiredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (requiredSecret) {
    const incoming = request.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== requiredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = (message?.text ?? "").trim();
  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  const lang = detectLanguage(text);

  // Slash-command handling never hits the LLM.
  const cmdReply = handleCommand(text, lang);
  if (cmdReply !== null) {
    if (text.trim().toLowerCase() === "/reset") {
      await saveChat({ chatId, language: lang, history: [] }).catch(() => {});
    }
    await sendTelegramMessage(token, chatId, cmdReply);
    return NextResponse.json({ ok: true });
  }

  // Load history (may be null on first contact).
  const stored = await loadChat(chatId);
  const history = stored?.history ?? [];

  // Build LLM payload.
  const systemContent = lang === "el" ? BASE_SYSTEM_PROMPT_EL : BASE_SYSTEM_PROMPT_EN;
  const llmMessages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history.slice(-HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: text },
  ];

  // Respond async so Telegram doesn't time out (it expects a fast 200 ACK).
  // We've already validated the secret; return 200 immediately, send reply in
  // the background.
  void (async () => {
    try {
      const result = await getRotator().chat({
        messages: llmMessages,
        temperature: 0.8,
        maxTokens: 600,
      });
      const reply = result.text.trim();
      const nextHistory = [
        ...history,
        { role: "user" as const, content: text },
        { role: "assistant" as const, content: reply },
      ];
      await Promise.all([
        sendTelegramMessage(token, chatId, reply || (lang === "el" ? "Μπλόκαρα. Δοκίμασε ξανά." : "I blanked. Try again.")),
        saveChat({ chatId, language: lang, history: nextHistory }),
      ]);
    } catch (error) {
      console.error("Telegram chat error", error);
      const fallback =
        lang === "el"
          ? "Έπαθα κάτι. Δοκίμασε σε λίγο ή στείλε /reset."
          : "Something broke on my end. Try again or /reset.";
      await sendTelegramMessage(token, chatId, fallback);
    }
  })();

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Health probe: confirms route is alive without revealing secrets.
  return NextResponse.json({
    available: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    secretRequired: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  });
}
