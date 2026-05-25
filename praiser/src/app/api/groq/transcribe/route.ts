import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Groq Whisper hard limit

const getGroqClient = (() => {
  let client: Groq | null = null;
  return () => {
    if (client) return client;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }
    client = new Groq({ apiKey });
    return client;
  };
})();

export async function POST(request: Request) {
  try {
    if (process.env.PRAISER_USE_GROQ_STUB === "true") {
      return NextResponse.json({
        text: "This is a stub transcription. Swap PRAISER_USE_GROQ_STUB to false to hit Groq.",
      });
    }

    const formData = await request.formData();
    const file = formData.get("audio");
    const langRaw = formData.get("language");
    const language =
      typeof langRaw === "string" && /^[a-zA-Z-]{2,10}$/.test(langRaw)
        ? langRaw.toLowerCase().slice(0, 2)
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio exceeds ${MAX_AUDIO_BYTES} bytes` },
        { status: 413 },
      );
    }

    const client = getGroqClient();

    const result = await client.audio.transcriptions.create({
      file,
      model: MODEL,
      response_format: "json",
      temperature: 0.2,
      ...(language ? { language } : {}),
    });

    const text = typeof result?.text === "string" ? result.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "Transcription returned no text" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Groq transcription error", message);
    return NextResponse.json(
      { error: "Failed to transcribe audio.", details: message },
      { status: 500 },
    );
  }
}
