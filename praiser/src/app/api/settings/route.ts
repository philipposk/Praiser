import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const SETTINGS_BLOB_KEY = "settings.json";
const SETTINGS_VERSION = 2;
const MAX_SETTINGS_BYTES = 5 * 1024 * 1024; // 5MB

const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  personInfo: null,
  praiseBarVisible: false,
  praiseMode: "crescendo" as const,
  manualPraiseVolume: 70,
  siteName: "Praiser",
  siteSubtitle: "AI Praise Assistant",
  chats: [],
};

let cachedBlobUrl: string | null = null;

const findSettingsBlob = async () => {
  const { blobs } = await list({ limit: 1000, prefix: SETTINGS_BLOB_KEY });
  return blobs.find((b) => b.pathname === SETTINGS_BLOB_KEY) ?? null;
};

const safeParseJson = (text: string): unknown | null => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fetchBlob = async (url: string) => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text.trim()) return null;
  const parsed = safeParseJson(text);
  return parsed && typeof parsed === "object" ? parsed : null;
};

export async function GET() {
  try {
    let settingsBlob = await findSettingsBlob().catch((error) => {
      console.error("Error listing blobs:", error);
      return null;
    });

    if (settingsBlob) {
      cachedBlobUrl = settingsBlob.url;
      const settings = await fetchBlob(settingsBlob.url);
      if (settings) {
        return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
      }
    }

    if (cachedBlobUrl) {
      const settings = await fetchBlob(cachedBlobUrl).catch(() => null);
      if (settings) {
        return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...settings } });
      }
      cachedBlobUrl = null;
    }

    return NextResponse.json({
      settings: DEFAULT_SETTINGS,
      message: "No custom settings found, using defaults",
    });
  } catch (error) {
    console.error("Error reading settings from blob:", error);
    return NextResponse.json({
      settings: DEFAULT_SETTINGS,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = body?.settings;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    const settingsJson = JSON.stringify(settings, null, 2);
    if (settingsJson.length > MAX_SETTINGS_BYTES) {
      return NextResponse.json(
        { error: `Settings exceed ${MAX_SETTINGS_BYTES} bytes` },
        { status: 413 },
      );
    }

    const settingsBlob = new Blob([settingsJson], { type: "application/json" });
    const blob = await put(SETTINGS_BLOB_KEY, settingsBlob, {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    cachedBlobUrl = blob.url;
    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    const err = error as { message?: string; code?: string };
    console.error("Error saving settings to blob:", err);

    const message = err.message ?? "";
    const isAuthError =
      message.includes("token") ||
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("403");

    if (isAuthError) {
      return NextResponse.json(
        {
          error: "Blob storage not configured",
          details: "Set BLOB_READ_WRITE_TOKEN environment variable.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save settings", details: message },
      { status: 500 },
    );
  }
}
