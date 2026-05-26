import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ChainedRotator, type ChatMessage } from "@/lib/llm-rotator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEMORY_MAX_CHARS = 2000;
const MESSAGES_PASSED = 30;

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const requestSchema = z.object({
  personName: z.string().min(1).max(120),
  /** Existing memory (if any) so the model knows what's already captured. */
  previousMemory: z.string().max(MEMORY_MAX_CHARS * 2).optional().default(""),
  /** Trailing slice of conversation history — server caps it. */
  messages: z.array(messageSchema).min(2).max(200),
  lang: z.enum(["el", "en"]).optional().default("en"),
});

let cachedChain: ChainedRotator | null = null;
const getRotator = (): ChainedRotator => {
  if (cachedChain) return cachedChain;
  cachedChain = new ChainedRotator({
    groqKey: process.env.GROQ_API_KEY,
    openRouterKey: process.env.OPENROUTER_API_KEY,
    nvidiaKey: process.env.NVCF_API_KEY ?? process.env.NVIDIA_API_KEY,
    appUrl: process.env.PRAISER_PUBLIC_URL,
    appName: "Praiser",
  });
  if (cachedChain.providerCount === 0) {
    throw new Error("No LLM provider configured.");
  }
  return cachedChain;
};

const buildSystemPrompt = (lang: "el" | "en") =>
  lang === "el"
    ? "Είσαι σύστημα συμπύκνωσης γεγονότων. Διαβάζεις παρελθούσες συζητήσεις για ένα συγκεκριμένο πρόσωπο και εξάγεις σύντομες, σταθερές γνώσεις (στυλ ζωής, προτιμήσεις, σχέσεις, ψευδώνυμα, χρονολογίες, χιουμοριστικές αναφορές, αναφορές αντικειμένων). Αγνόησε το συναίσθημα, αγνόησε τα φιλοφρονήσεις. Επέστρεψε ΜΟΝΟ απλά bullet points, ένα γεγονός ανά γραμμή, χωρίς εισαγωγή ή κατακλείδα. Μέγιστο 12 bullets."
    : "You are a fact-summarising system. You read past conversations about a specific person and extract short, stable facts (life style, preferences, relationships, aliases, dates, recurring jokes, references to objects). Ignore sentiment, ignore compliments. Return ONLY plain bullet points, one fact per line, no preamble, no conclusion. Max 12 bullets.";

const buildUserPrompt = (
  personName: string,
  previousMemory: string,
  messages: ChatMessage[],
  lang: "el" | "en",
) => {
  const transcript = messages
    .map((m) => {
      const content = typeof m.content === "string" ? m.content : "";
      return `${m.role}: ${content}`;
    })
    .join("\n");
  const heading =
    lang === "el"
      ? `Πρόσωπο: ${personName}\n\nΠρογενέστερα γεγονότα:\n${previousMemory || "(κανένα)"}\n\nΠρόσφατη συζήτηση:\n${transcript}\n\nΕνημερώνω τα γεγονότα. Νέα bullet points (συμπεριλαμβάνοντας τα παλιά αν εξακολουθούν ισχυρά):`
      : `Person: ${personName}\n\nPrior facts:\n${previousMemory || "(none)"}\n\nRecent conversation:\n${transcript}\n\nUpdate the fact bullets (carry forward old facts that still hold). New bullets:`;
  return heading;
};

const mergeMemoryBullets = (text: string): string => {
  // Take raw model output, strip leading lists, trim to MEMORY_MAX_CHARS.
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[-*•·]\s*/, "- "))
    .map((l) => (l.startsWith("- ") ? l : `- ${l}`));

  // Dedupe by lowercase comparison.
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(l);
  }

  let joined = dedup.join("\n");
  if (joined.length > MEMORY_MAX_CHARS) joined = joined.slice(0, MEMORY_MAX_CHARS - 1) + "…";
  return joined;
};

export async function POST(request: NextRequest) {
  if (process.env.PRAISER_USE_GROQ_STUB === "true") {
    return NextResponse.json({ memory: "- Stub memory bullet (stub mode)." });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const trimmedMessages = body.messages.slice(-MESSAGES_PASSED);

  try {
    const rotator = getRotator();
    const payload: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(body.lang) },
      { role: "user", content: buildUserPrompt(body.personName, body.previousMemory, trimmedMessages, body.lang) },
    ];

    const result = await rotator.chat({
      messages: payload,
      temperature: 0.2,
      maxTokens: 600,
    });

    const memory = mergeMemoryBullets(result.text);
    return NextResponse.json({ memory, model: result.model, provider: result.provider });
  } catch (error) {
    console.error("memorize error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Memorize failed", details: message }, { status: 500 });
  }
}
