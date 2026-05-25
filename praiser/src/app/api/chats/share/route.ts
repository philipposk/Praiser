import { NextRequest, NextResponse } from "next/server";
import { list, put } from "@vercel/blob";
import { z } from "zod";

import type { Chat, Message, PersonInfo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHORTCODE_LENGTH = 8;
const SHORTCODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l ambiguity
const MAX_MESSAGES = 200;

type SharedChat = {
  shortcode: string;
  createdAt: string;
  person: Pick<PersonInfo, "name" | "extraInfo" | "images" | "mode">;
  chat: {
    name: string;
    messages: Message[];
  };
  language: "el" | "en";
};

const generateShortcode = (): string => {
  let out = "";
  const bytes = new Uint8Array(SHORTCODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < SHORTCODE_LENGTH; i++) {
    out += SHORTCODE_ALPHABET[bytes[i] % SHORTCODE_ALPHABET.length];
  }
  return out;
};

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string(),
  source: z.enum(["text", "voice", "system"]).optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        type: z.string(),
        name: z.string().optional(),
      }),
    )
    .optional(),
});

const requestSchema = z.object({
  chat: z.object({
    name: z.string().max(200),
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  }),
  person: z.object({
    name: z.string().max(200),
    extraInfo: z.string().max(8000).optional(),
    mode: z
      .enum(["praise", "roast", "hype", "birthday", "anniversary", "affirmation", "tribute"])
      .optional(),
    images: z
      .array(
        z.object({
          url: z.string(),
          type: z.string(),
          name: z.string().optional(),
        }),
      )
      .max(20)
      .optional(),
  }),
  language: z.enum(["el", "en"]).optional(),
});

const blobPath = (shortcode: string) => `shared-chats/${shortcode}.json`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const shortcode = generateShortcode();
    const payload: SharedChat = {
      shortcode,
      createdAt: new Date().toISOString(),
      person: {
        name: parsed.person.name,
        extraInfo: parsed.person.extraInfo ?? "",
        images: parsed.person.images ?? [],
        mode: parsed.person.mode,
      },
      chat: parsed.chat,
      language: parsed.language ?? "en",
    };

    const json = JSON.stringify(payload);
    if (json.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Chat too large to share" }, { status: 413 });
    }

    await put(blobPath(shortcode), new Blob([json], { type: "application/json" }), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    return NextResponse.json({ shortcode });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("share chat error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to share chat", details: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shortcode = (searchParams.get("code") ?? "").trim().toLowerCase();

  if (!shortcode || !/^[a-z0-9]{1,32}$/.test(shortcode)) {
    return NextResponse.json({ error: "Invalid shortcode" }, { status: 400 });
  }

  try {
    const { blobs } = await list({ prefix: blobPath(shortcode), limit: 5 });
    const exact = blobs.find((b) => b.pathname === blobPath(shortcode));
    if (!exact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const response = await fetch(exact.url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data: SharedChat = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("fetch shared chat error", error);
    return NextResponse.json({ error: "Failed to load shared chat" }, { status: 500 });
  }
}

export type { SharedChat };
