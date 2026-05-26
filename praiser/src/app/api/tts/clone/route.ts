import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SAMPLE_BYTES = 10 * 1024 * 1024; // 10MB per sample
const FETCH_TIMEOUT_MS = 60_000;

/**
 * Clone a voice into ElevenLabs and return the voice_id. The frontend stores
 * that id on a PersonInfo.ttsVoiceId so future /api/tts calls speak with the
 * cloned voice.
 *
 * Requires ELEVENLABS_API_KEY. Returns 503 if unconfigured so the client can
 * surface a sensible message.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice cloning unavailable — ELEVENLABS_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const name = (formData.get("name") ?? "").toString().trim().slice(0, 80);
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Upload at least one audio sample" }, { status: 400 });
  }
  for (const f of files) {
    if (!f.type.startsWith("audio/")) {
      return NextResponse.json({ error: `Not an audio file: ${f.name}` }, { status: 400 });
    }
    if (f.size > MAX_SAMPLE_BYTES) {
      return NextResponse.json(
        { error: `${f.name} exceeds ${MAX_SAMPLE_BYTES} bytes` },
        { status: 413 },
      );
    }
  }

  const elFormData = new FormData();
  elFormData.append("name", name);
  for (const f of files) {
    elFormData.append("files", f, f.name);
  }
  const description = (formData.get("description") ?? "").toString().slice(0, 500);
  if (description) elFormData.append("description", description);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: elFormData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs ${response.status}`, details: detail.slice(0, 500) },
        { status: 502 },
      );
    }

    const data: { voice_id?: string } = await response.json();
    if (!data.voice_id) {
      return NextResponse.json({ error: "ElevenLabs returned no voice_id" }, { status: 502 });
    }
    return NextResponse.json({ voiceId: data.voice_id });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return NextResponse.json({ error: "Voice clone timed out" }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Clone failed", details: message }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.ELEVENLABS_API_KEY),
  });
}
