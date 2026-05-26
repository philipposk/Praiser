import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 60_000;
const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

const requestSchema = z.object({
  name: z.string().min(1).max(120),
  hint: z.string().max(500).optional(),
  style: z
    .enum(["portrait", "renaissance", "vintage", "sticker", "watercolour"])
    .optional()
    .default("portrait"),
  width: z.number().int().min(256).max(1024).optional().default(640),
  height: z.number().int().min(256).max(1024).optional().default(800),
});

const STYLE_PROMPTS: Record<string, string> = {
  portrait:
    "studio portrait, soft natural light, shallow depth of field, warm tones, detailed, magazine-quality, 50mm lens",
  renaissance:
    "Renaissance oil painting, chiaroscuro lighting, ornate frame, brushstroke texture, museum quality",
  vintage:
    "vintage 1970s film photograph, kodachrome, warm grain, soft focus, sun flare",
  sticker:
    "die-cut sticker illustration, flat colour, bold outlines, vector style, sticker pack",
  watercolour:
    "watercolour painting, soft washes, paper texture, expressive brushwork, light pastel palette",
};

/**
 * Generate a portrait image via Pollinations (free, no API key) and stash it
 * in Vercel Blob so the URL is durable. Returns {url} ready to drop into
 * personInfo.images.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stylePrompt = STYLE_PROMPTS[body.style] ?? STYLE_PROMPTS.portrait;
  const hintText = body.hint ? `. ${body.hint.slice(0, 200)}` : "";
  const prompt = `Portrait of ${body.name}${hintText}. ${stylePrompt}. Single subject, head and shoulders, eyes to camera, no text.`;

  // Pollinations is GET-only; prompt goes in the path.
  const seed = Math.floor(Math.random() * 2 ** 31);
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=${body.width}&height=${body.height}&model=flux&seed=${seed}&nologo=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/jpeg,image/png,image/*",
        "User-Agent": "PraiserBot/1.0",
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Pollinations ${response.status}`, details: detail.slice(0, 200) },
        { status: 502 },
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Empty image" }, { status: 502 });
    }
    if (buffer.byteLength > MAX_BLOB_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const extension = contentType.includes("png") ? "png" : "jpg";
    const filename = `portraits/${Date.now()}-${seed.toString(36)}.${extension}`;

    const blob = await put(filename, new Blob([buffer], { type: contentType }), {
      access: "public",
      contentType,
    });

    return NextResponse.json({
      url: blob.url,
      style: body.style,
      seed,
      pathname: blob.pathname,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return NextResponse.json({ error: "Generation timed out" }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Generation failed", details: message }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
