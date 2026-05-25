import { NextResponse } from "next/server";
import { z } from "zod";

import { buildProviders, synthesizeWithFallback } from "@/lib/tts-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TTS_CHARS = 4000;

const requestSchema = z.object({
  text: z.string().min(1).max(MAX_TTS_CHARS),
  language: z.string().optional(),
  voiceId: z.string().optional(),
});

export async function POST(request: Request) {
  const providers = buildProviders();
  if (providers.length === 0) {
    // No server-side provider configured — client should fall back to browser TTS.
    return new NextResponse(null, {
      status: 204,
      headers: { "X-TTS-Provider": "none" },
    });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const json = await request.json();
    body = requestSchema.parse(json);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await synthesizeWithFallback({
      text: body.text,
      language: body.language,
      voiceId: body.voiceId,
    });

    if (!result) {
      return new NextResponse(null, {
        status: 204,
        headers: { "X-TTS-Provider": "none" },
      });
    }

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": result.mime,
        "X-TTS-Provider": result.provider,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS error", error);
    return NextResponse.json(
      {
        error: "TTS failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}

export async function GET() {
  // Capability probe — client can ask whether server TTS is available.
  const providers = buildProviders();
  return NextResponse.json({
    serverProviders: providers.map((p) => p.name),
    available: providers.length > 0,
  });
}
