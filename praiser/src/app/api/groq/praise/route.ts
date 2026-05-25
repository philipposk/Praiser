import { NextResponse } from "next/server";
import { z } from "zod";

import type { PersonInfo, MessageImage } from "@/lib/types";
import {
  AllModelsFailedError,
  ChainedRotator,
  type ChatMessage,
  type ChatResult,
} from "@/lib/llm-rotator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------- Rotator setup --------------------------- */

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
    throw new Error(
      "No LLM provider configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or NVCF_API_KEY.",
    );
  }
  return cachedChain;
};

/* --------------------------- Request schema --------------------------- */

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        images: z
          .array(
            z.object({
              url: z.string(),
              type: z.string(),
              name: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .min(1, "At least one message is required."),
  personInfo: z
    .object({
      name: z.string(),
      images: z.array(
        z.object({
          url: z.string(),
          type: z.string(),
          name: z.string().optional(),
        }),
      ),
      videos: z.array(
        z.object({
          url: z.string(),
          type: z.string(),
          name: z.string().optional(),
        }),
      ),
      urls: z.array(z.string()),
      extraInfo: z.string(),
      id: z.string().optional(),
      mode: z
        .enum(["praise", "roast", "hype", "birthday", "anniversary", "affirmation", "tribute"])
        .optional(),
    })
    .nullable()
    .optional(),
  praiseVolume: z.number().min(0).max(100),
});

/* --------------------------- Mode instructions --------------------------- */

const MODE_INSTRUCTIONS: Record<string, string> = {
  praise: "MODE: PRAISE. Celebrate the person. Find what's worthy and amplify it. Warm, sincere, occasionally lyrical.",
  roast: "MODE: ROAST. Affectionate teasing only. Light, witty, never cruel. Punch UP at the persona, never DOWN at sensitive traits. Keep it playful.",
  hype: "MODE: HYPE. Pure enthusiastic energy. Short sentences. Exclamations. Make the reader fired up about this person. Talk like a hype-man.",
  birthday: "MODE: BIRTHDAY. Write a warm, personal birthday message for this person. Reference what makes them special. End with a heartfelt wish.",
  anniversary: "MODE: ANNIVERSARY. Write a warm message celebrating a milestone with this person (or about them). Reflective, grateful, looking back AND forward.",
  affirmation: "MODE: AFFIRMATION. Daily positive affirmation TO the person, in second person ('you are…'). Calm, grounding, specific to who they are.",
  tribute: "MODE: TRIBUTE. Eulogistic but warm — celebrate the person's character and impact. Dignified, sincere, no jokes, no roast. Honour them.",
};

const modePrefix = (mode: string | undefined) =>
  MODE_INSTRUCTIONS[mode ?? "praise"] ?? MODE_INSTRUCTIONS.praise;

/* --------------------------- Response schema --------------------------- */

const praiseResponseSchema = z.object({
  message: z.string().describe("The assistant's response message"),
  should_send_image: z.boolean().optional().nullable(),
  image_praise: z.string().optional().nullable(),
});

/* --------------------------- Force-image keyword (strive pattern) --------------------------- */

// Detect when user explicitly asks for a photo. Forces should_send_image=true
// regardless of what the model returned. Bilingual EN/EL.
const FORCE_IMAGE_RE =
  /\b(?:show me|send (?:me )?(?:a |the )?(?:pic|picture|photo|image)|let me see|can i see|show pic|send pic|share pic|drop (?:a |the )?(?:pic|photo))\b|δείξε\s*μου|δειξεμου|στείλε\s*(?:φωτο|εικόνα|pic)|στειλε\s*(?:φωτο|εικόνα|pic)|ποστάρε\s*(?:φωτο|εικόνα)|φωτο\s*παρακαλώ|μια\s*φωτο/i;

const userWantsImage = (text: string) => FORCE_IMAGE_RE.test(text);

/* --------------------------- Language detection --------------------------- */

const greekRegex = /[Ͱ-Ͽἀ-῿]/;

const detectGreek = (
  history: Array<{ role: string; content: string }>,
): boolean => {
  const allText = history.map((m) => m.content).join(" ");
  const greekCount = (allText.match(/[Ͱ-Ͽἀ-῿]/g) || []).length;
  const significantGreek = greekCount > 5;

  const lastUser = history
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => m.content)
    .join(" ");
  const lastUserHasGreek = greekRegex.test(lastUser);

  const lastAssistant = history
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .map((m) => m.content)
    .join(" ");
  const lastAssistantHasGreek = greekRegex.test(lastAssistant);

  return lastUserHasGreek || lastAssistantHasGreek || significantGreek;
};

const detectAlphabet = (text: string): string | null => {
  if (/[Ͱ-Ͽἀ-῿]/.test(text)) return "Greek";
  if (/[Ѐ-ӿ]/.test(text)) return "Cyrillic";
  if (/[؀-ۿ]/.test(text)) return "Arabic";
  if (/[֐-׿]/.test(text)) return "Hebrew";
  if (/[一-鿿぀-ゟ゠-ヿ가-힯]/.test(text)) return "CJK";
  return null;
};

/* --------------------------- Message formatting --------------------------- */

// For text-only models: collapse images to a text tag.
const formatMessageForLLM = (msg: {
  role: string;
  content: string;
  images?: Array<{ url: string; type: string }>;
}): ChatMessage => {
  if (msg.role === "user" && msg.images && msg.images.length > 0) {
    const tag =
      msg.images.length === 1
        ? " [User attached 1 image]"
        : ` [User attached ${msg.images.length} images]`;
    return { role: "user", content: msg.content + tag };
  }
  return { role: msg.role as ChatMessage["role"], content: msg.content };
};

// For vision-capable models: pass images as content parts.
const formatMessageForVisionLLM = (msg: {
  role: string;
  content: string;
  images?: Array<{ url: string; type: string }>;
}): ChatMessage => {
  if (msg.role === "user" && msg.images && msg.images.length > 0) {
    const parts: import("@/lib/llm-rotator").ContentPart[] = [];
    if (msg.content) parts.push({ type: "text", text: msg.content });
    for (const img of msg.images) {
      parts.push({ type: "image_url", image_url: { url: img.url } });
    }
    return { role: "user", content: parts };
  }
  return { role: msg.role as ChatMessage["role"], content: msg.content };
};

const hasAnyAttachedImage = (
  messages: Array<{ role: string; images?: Array<unknown> }>,
): boolean => messages.some((m) => m.role === "user" && (m.images?.length ?? 0) > 0);

/* --------------------------- JSON extraction --------------------------- */

// Parses model output as JSON. If response_format isn't honoured (some
// non-Groq providers) the model may wrap JSON in markdown fences or include
// prose. Strip fences and try again. Last resort: treat the whole text as the
// `message` field so the chat doesn't die.
const parseModelResponse = (text: string): z.infer<typeof praiseResponseSchema> => {
  const tryParse = (s: string) => {
    try {
      const parsed = JSON.parse(s);
      const result = praiseResponseSchema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(text);
  if (direct) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fromFence = tryParse(fenced[1].trim());
    if (fromFence) return fromFence;
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    const fromSlice = tryParse(slice);
    if (fromSlice) return fromSlice;
  }

  // Last resort: treat the whole response as plain text.
  return { message: text.trim() || "…" };
};

/* --------------------------- POST handler --------------------------- */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, personInfo, praiseVolume } = requestSchema.parse(body);

    if (process.env.PRAISER_USE_GROQ_STUB === "true") {
      return NextResponse.json({
        assistantMessage: personInfo
          ? `Wow, ${personInfo.name} sounds absolutely incredible! They're clearly someone special. Want to know more about why they're amazing?`
          : "I'd love to praise someone! Who should we celebrate?",
        images: [],
      });
    }

    const rotator = getRotator();

    /* ---- Normal assistant path (no personInfo) ---- */

    if (!personInfo || !personInfo.name.trim()) {
      const shouldUseGreek = detectGreek(messages);
      const basePrompt =
        "You are a helpful AI assistant. Answer questions normally and be conversational. Do not mention anything about praising people or adding person info.";
      const systemContent = shouldUseGreek
        ? basePrompt +
          " 🚨 CRITICAL: The user IS WRITING IN GREEK. You MUST respond ENTIRELY in GREEK. Do NOT use English. Do NOT mix languages. ONLY GREEK. Maintain language consistency."
        : basePrompt;

      try {
        const result = await rotator.chat({
          messages: [
            { role: "system", content: systemContent },
            ...messages.slice(-10).map(formatMessageForLLM),
          ],
          temperature: 0.7,
        });
        return NextResponse.json({
          assistantMessage: result.text || "I'm here to help! What would you like to know?",
          separateImageMessage: null,
          model: result.model,
          provider: result.provider,
        });
      } catch (error) {
        console.error("Normal assistant response error:", error);
        return buildErrorResponse(error);
      }
    }

    /* ---- Praise path ---- */

    const prompt = buildPraisePrompt({
      personInfo,
      praiseVolume,
      conversationHistory: messages.slice(-10),
    });

    const lastUserText =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const forced = userWantsImage(lastUserText);
    const userHasAttachments = hasAnyAttachedImage(messages);
    const shouldUseJsonMode =
      (forced && personInfo.images.length > 0) || userHasAttachments;

    const systemContent = `${modePrefix(personInfo.mode)}\n\n${SYSTEM_PROMPT}`;

    if (shouldUseJsonMode) {
      // Image flow (forced keyword OR user uploaded photo): single-shot JSON.
      const personImageInfo =
        personInfo.images.length > 0 && praiseVolume >= 40
          ? `\n\nNOTE: You have access to ${personInfo.images.length} image(s) of ${personInfo.name}. When you want to analyze or praise specific details about their appearance, style, smile, energy, or posture, mention those details. You can request to send an image by setting should_send_image to true.`
          : "";

      const messagesPayload: ChatMessage[] = [
        { role: "system", content: systemContent },
        ...messages
          .slice(-10)
          .map(userHasAttachments ? formatMessageForVisionLLM : formatMessageForLLM),
        { role: "user", content: prompt + personImageInfo },
      ];

      let result: ChatResult;
      try {
        result = await rotator.chat({
          messages: messagesPayload,
          temperature: 0.7 + praiseVolume / 200,
          responseFormatJson: !userHasAttachments, // vision models may reject json mode
        });
      } catch (jsonModeError) {
        console.warn("JSON-mode failed, retrying without:", jsonModeError);
        try {
          result = await rotator.chat({
            messages: messagesPayload,
            temperature: 0.7 + praiseVolume / 200,
          });
        } catch (fallbackError) {
          return buildErrorResponse(fallbackError);
        }
      }

      const parsed = parseModelResponse(result.text);
      if (forced) parsed.should_send_image = true;

      const shouldSendImage =
        Boolean(parsed.should_send_image) && personInfo.images.length > 0;
      const imageToSend: MessageImage | null = shouldSendImage
        ? personInfo.images[Math.floor(Math.random() * personInfo.images.length)]
        : null;
      const imageCaption = shouldSendImage && imageToSend
        ? parsed.image_praise?.trim() || `Look at this photo of ${personInfo.name}`
        : null;

      return NextResponse.json({
        assistantMessage: parsed.message,
        separateImageMessage:
          shouldSendImage && imageCaption
            ? { content: imageCaption, images: [imageToSend!] }
            : null,
        model: result.model,
        provider: result.provider,
      });
    }

    // Streaming flow (no image needed). SSE: each event is JSON.
    const streamPayload: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...messages.slice(-10).map(formatMessageForLLM),
      { role: "user", content: prompt },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };
        try {
          const gen = rotator.chatStream({
            messages: streamPayload,
            temperature: 0.7 + praiseVolume / 200,
          });
          // Strip JSON wrapper if model emits {"message":"..."} despite no JSON mode.
          let firstChunk = true;
          let unwrapping: "none" | "checking" | "json" | "text" = "checking";
          let buffer = "";

          while (true) {
            const next = await gen.next();
            if (next.done) {
              if (unwrapping === "json" && buffer) {
                const parsed = parseModelResponse(buffer);
                send({ type: "delta", text: parsed.message });
              }
              send({
                type: "meta",
                model: next.value?.model,
                provider: next.value?.provider,
              });
              break;
            }
            let delta = next.value;
            if (firstChunk) {
              firstChunk = false;
              // Models in non-JSON mode usually emit plain text. But some
              // (especially preview ones) still wrap output. Sniff first token.
              const trimmed = delta.replace(/^\s+/, "");
              if (trimmed.startsWith("{") || trimmed.startsWith("```")) {
                unwrapping = "json";
              } else {
                unwrapping = "text";
              }
            }
            if (unwrapping === "json") {
              buffer += delta;
              continue;
            }
            send({ type: "delta", text: delta });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "stream failed";
          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Groq praise error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return buildErrorResponse(error);
  }
}

const buildErrorResponse = (error: unknown) => {
  if (error instanceof AllModelsFailedError) {
    const isCapacity = error.attempts.some(
      (a) => a.status === 503 || /over capacity/i.test(a.message),
    );
    if (isCapacity) {
      return NextResponse.json(
        {
          error: "All models are currently over capacity. Please try again in a few moments.",
          details: error.message,
          retryAfter: 30,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "All models failed.", details: error.message },
      { status: 502 },
    );
  }
  const err = error as { status?: number; message?: string };
  const message = err?.message ?? "Unknown error";
  return NextResponse.json(
    { error: "Failed to generate response.", details: message },
    { status: err?.status && err.status >= 400 && err.status < 600 ? err.status : 500 },
  );
};

/* --------------------------- System prompt + builder --------------------------- */

const SYSTEM_PROMPT = `You are Praiser, an enthusiastic AI that celebrates and praises a specific person while having intelligent conversations.

CORE BEHAVIOR:
- Answer the user's questions intelligently and helpfully
- Naturally weave in praise for the person throughout the conversation
- When praise volume is MAXIMUM (81-100), prioritize praise over answering questions - be more focused on celebrating
- Analyze images of the person and praise specific things about them (their smile, style, energy, etc.)
- Be creative, fun, and engaging
- Occasionally send images with engaging prompts like "u wanna see whose the boss?" or in Greek: "εεεεε; σε εφτιαξα; σου εφτιαξε τη μερα; στο πα, γαμαει"
- Make the conversation feel natural, not forced
- Connect ideas smoothly - make sentences flow together better

LANGUAGE MATCHING:
- CRITICAL: You MUST respond in the SAME LANGUAGE that the user is writing in
- If the user writes in Greek, respond entirely in Greek
- If the user writes in another language, respond in that language
- Match the user's language for ALL your responses, not just the person's name
- If the user writes in a different alphabet (Greek, Cyrillic, Arabic, Hebrew, CJK, etc.), you MUST:
  * Write the person's name in the SAME alphabet
  * Respond entirely in that language
  * Do NOT transliterate names to Latin/English characters when the user is using a different script

PRAISE VOLUME GUIDE:
- 0: ZERO PRAISE - Answer questions normally. Do NOT mention or praise the person at all. Just be helpful.
- 1-5: VERY MINIMAL PRAISE - Answer questions normally. Only mention the person if absolutely necessary. Keep it factual and neutral - no praise.
- 6-20: MINIMAL PRAISE - Answer questions normally. Only add very subtle, brief mentions if it naturally fits. Keep praise minimal and infrequent.
- 21-40: LIGHT PRAISE - Answer questions, include occasional warm compliments naturally
- 41-60: MODERATE PRAISE - Answer questions enthusiastically, celebrate the person frequently
- 61-80: HIGH PRAISE - Answer questions but heavily emphasize praise, be very enthusiastic
- 81-100: MAXIMUM PRAISE MODE - Don't answer questions subjectively, just praise! Redirect everything to celebrating the person

IMAGE ANALYSIS:
- When you see images of the person, analyze specific details:
  * Their appearance, style, energy, expression
  * Their smile, eyes, posture, confidence
  * The setting, what they're doing, their vibe
- Praise these specific things naturally in conversation
- Use image_praise field to highlight specific visual details

RESPONSE FORMAT:
You must respond in JSON format:
{
  "message": "Your response here - answer questions AND include praise",
  "should_send_image": true/false (omit if false),
  "image_praise": "Specific thing to praise about their photos" (omit if not needed)
}

IMPORTANT: Only include should_send_image and image_praise fields if you actually want to use them. Omit them entirely if not needed (don't set to null or false).
Set should_send_image to true when you want to send a picture of the person as a separate message.
When should_send_image is true, provide image_praise with a creative, engaging message to accompany the image. This can be a caption, comment, or message that connects the image to the conversation. Vary the style - be enthusiastic, casual, or descriptive.

Remember: Adjust your praise level based on the volume setting. At 0%, don't praise at all. At maximum, focus entirely on celebration!`;

type PromptOptions = {
  personInfo: PersonInfo;
  praiseVolume: number;
  conversationHistory: Array<{ role: string; content: string; images?: MessageImage[] }>;
};

const generateNameVariations = (name: string, isGreek: boolean): string => {
  if (!name) return "";
  const nameLower = name.toLowerCase().trim();
  const hasKou = nameLower.includes("kou") || nameLower.includes("κου");
  const hasK = nameLower.includes(" k") || nameLower.includes(" κ");
  const isMike = nameLower.includes("mike") || nameLower.includes("μάικ");
  const isMichalis = nameLower.includes("michalis") || nameLower.includes("μιχάλης");

  const variations: string[] = [];

  if (isGreek) {
    if (isMike) {
      variations.push("Μάικ");
      if (hasKou) variations.push("Μάικ Κου");
      if (hasK) variations.push("Μάικ Κ");
    }
    if (isMichalis) {
      variations.push("Μιχάλης");
      if (hasKou) variations.push("Μιχάλης Κου");
      if (hasK) variations.push("Μιχάλης Κ");
    }
    if (variations.length === 0) {
      variations.push(name);
      if (hasKou) variations.push(`${name} Κου`);
      if (hasK) variations.push(`${name} Κ`);
    }
  } else {
    if (isMike) {
      variations.push("Mike");
      if (hasKou) variations.push("Mike Kou");
      if (hasK) variations.push("Mike K.");
    }
    if (isMichalis) {
      variations.push("Michalis");
      if (hasKou) variations.push("Michalis Kou");
      if (hasK) variations.push("Michalis K.");
    }
    if (variations.length === 0) {
      variations.push(name);
      if (hasKou) variations.push(`${name} Kou`);
      if (hasK) variations.push(`${name} K.`);
    }
  }

  return variations.join(", ");
};

const buildPraisePrompt = ({ personInfo, praiseVolume, conversationHistory }: PromptOptions) => {
  const isMaximumPraise = praiseVolume >= 81;
  const allText = conversationHistory.map((m) => m.content).join(" ");

  const shouldUseGreek = detectGreek(conversationHistory);
  const detectedAlphabet = shouldUseGreek ? "Greek" : detectAlphabet(allText);

  const nameVariations = generateNameVariations(personInfo.name, shouldUseGreek);

  const languageInstruction =
    shouldUseGreek || detectedAlphabet
      ? `\n\n🚨 CRITICAL LANGUAGE INSTRUCTION - READ CAREFULLY 🚨
The user ${shouldUseGreek ? "IS WRITING IN GREEK" : `is writing in ${detectedAlphabet}`}.

YOU MUST:
1. Respond ENTIRELY in ${shouldUseGreek ? "GREEK" : detectedAlphabet || "the same language"} - EVERY SINGLE WORD
2. Use CORRECT ${shouldUseGreek ? "GREEK GRAMMAR" : "grammar"} - proper verb conjugations, noun cases, articles, and sentence structure
3. Use NATURAL ${shouldUseGreek ? "GREEK" : "language"} - write as a native speaker would, not a translation. Use idiomatic expressions and natural word order.
4. **NAME VARIATIONS**: When referring to the person, use natural name variations based on the language:
   ${
     shouldUseGreek
       ? `- In Greek, use variations like: ${nameVariations || "Μιχάλης, Μάικ, with or without Κου or Κ"}`
       : `- In English, use variations like: ${nameVariations || "Mike, Mike Kou, Mike K., Michalis, Michalis Kou, Michalis K."}`
   }
   - Vary the name naturally throughout the conversation - don't always use the same form
   - Use the appropriate script/alphabet for the language you're speaking
5. Do NOT use English at all - ${shouldUseGreek ? "ONLY GREEK" : `ONLY ${detectedAlphabet}`}
6. Continue in ${shouldUseGreek ? "GREEK" : detectedAlphabet || "that language"} for the ENTIRE response
7. Maintain language consistency

${
  shouldUseGreek
    ? `CRITICAL FOR GREEK: Your Greek must be grammatically correct and natural. Use proper Greek grammar rules.

STYLE GUIDELINES FOR GREEK:
- Write as a native Greek speaker would write - natural, flowing, and cohesive
- Occasionally use casual/slang Greek expressions to make it more authentic and engaging (e.g., "εεεεε; σε εφτιαξα;", "σου εφτιαξε τη μερα;", "στο πα, γαμαει", "κοίτα αυτό", "τι λες τώρα")
- Mix polite formal language with casual expressions naturally
- Make sentences flow together better - connect ideas smoothly
- Use natural Greek transitions and connectors
- Don't write broken, incorrect, or translated-sounding Greek
- When sending images, you can add casual expressions like "εεεεε; σε εφτιαξα; σου εφτιαξε τη μερα; στο πα, γαμαει" at the end to make it more engaging`
    : ""
}
DO NOT switch to English. DO NOT mix languages. ${shouldUseGreek ? "ONLY GREEK." : `ONLY ${detectedAlphabet}.`}`
      : "";

  const volumeDescriptor = isMaximumPraise
    ? "MAXIMUM PRAISE MODE: Don't answer questions subjectively - just praise! Redirect everything to celebrating the person."
    : praiseVolume === 0
      ? "ZERO PRAISE MODE: Answer questions normally. Do NOT mention or praise the person at all."
      : praiseVolume <= 5
        ? "VERY MINIMAL PRAISE MODE: Answer questions normally. Only mention the person if absolutely necessary. No praise."
        : praiseVolume < 20
          ? "MINIMAL PRAISE MODE: Answer questions normally. Add very subtle, brief mentions only if it naturally fits."
          : praiseVolume < 40
            ? "LIGHT PRAISE MODE: Answer questions helpfully, include occasional warm compliments naturally."
            : praiseVolume < 60
              ? "MODERATE PRAISE MODE: Answer questions enthusiastically, celebrate the person frequently."
              : "HIGH PRAISE MODE: Answer questions but heavily emphasize praise.";

  const imageAnalysisPrompt =
    personInfo.images.length > 0 && praiseVolume > 0
      ? `\nIMAGE ANALYSIS INSTRUCTIONS:
- You have ${personInfo.images.length} image(s) of ${personInfo.name} available
- When you decide to send an image (should_send_image: true), provide image_praise with a creative, engaging message
- Vary the style - sometimes enthusiastic, sometimes casual, sometimes descriptive
- Images will be sent as separate messages with your message`
      : "";

  const personContext = [
    `Person to praise: ${personInfo.name}${nameVariations ? ` (use variations: ${nameVariations})` : ""}`,
    personInfo.extraInfo ? `Extra info: ${personInfo.extraInfo}` : null,
    personInfo.images.length > 0
      ? `You have ${personInfo.images.length} image(s) of this person available to send.`
      : null,
    personInfo.videos.length > 0
      ? `You have ${personInfo.videos.length} video(s) of this person.`
      : null,
    personInfo.urls.length > 0
      ? `URLs to study about this person: ${personInfo.urls.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const lastUserMessage = conversationHistory[conversationHistory.length - 1];
  const userQuestion = lastUserMessage?.role === "user" ? lastUserMessage.content : "";

  return [
    "You are Praiser, an AI that celebrates a person while having intelligent conversations.",
    volumeDescriptor,
    languageInstruction,
    "",
    "PERSON CONTEXT:",
    personContext,
    imageAnalysisPrompt,
    "",
    "CONVERSATION APPROACH:",
    isMaximumPraise
      ? `- The user asked: '${userQuestion}'\n- In MAXIMUM PRAISE mode, don't answer this question directly\n- Instead, redirect to praising ${personInfo.name} with over-the-top enthusiasm`
      : praiseVolume === 0
        ? `- The user asked: '${userQuestion}'\n- Answer this question intelligently and helpfully\n- DO NOT mention or praise ${personInfo.name} at all`
        : praiseVolume <= 5
          ? `- The user asked: '${userQuestion}'\n- Answer this question intelligently and helpfully\n- DO NOT mention ${personInfo.name} unless absolutely necessary`
          : praiseVolume < 20
            ? `- The user asked: '${userQuestion}'\n- Answer this question intelligently and helpfully\n- Only add very subtle, brief mentions of ${personInfo.name} if it naturally fits`
            : `- The user asked: '${userQuestion}'\n- Answer this question intelligently and helpfully\n- Naturally weave in praise for ${personInfo.name} throughout your response`,
    "",
    "CONVERSATION HISTORY:",
    conversationHistory
      .slice(-6)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n"),
    "",
    isMaximumPraise
      ? `Now respond with MAXIMUM PRAISE for ${personInfo.name}! Don't answer the question - just celebrate!`
      : praiseVolume === 0
        ? `Now answer the user's question normally. Do NOT mention or praise ${personInfo.name} at all.`
        : praiseVolume <= 5
          ? `Now answer the user's question intelligently. Do NOT mention ${personInfo.name} unless absolutely necessary.`
          : praiseVolume < 20
            ? `Now answer the user's question intelligently. Only add very subtle mentions of ${personInfo.name} if it naturally fits.`
            : `Now respond intelligently to the user's question while naturally celebrating ${personInfo.name}!`,
    "",
    "If you set should_send_image to true, provide image_praise with a creative, engaging message connecting the image to the conversation.",
  ].join("\n");
};
