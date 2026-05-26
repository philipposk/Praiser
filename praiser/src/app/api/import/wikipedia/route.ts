import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;
const MAX_EXTRACT_CHARS = 2000;

type WikipediaSummary = {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

const sanitizeTitle = (q: string): string => {
  // Strip leading/trailing spaces, replace internal spaces with underscores,
  // and limit length. Wikipedia REST tolerates spaces too, but underscores
  // are safer for path components.
  return encodeURIComponent(q.trim().replace(/\s+/g, "_").slice(0, 200));
};

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const langRaw = (searchParams.get("lang") ?? "en").trim().toLowerCase();
  const lang = /^[a-z]{2,3}$/.test(langRaw) ? langRaw : "en";

  if (!q || q.length > 200) {
    return NextResponse.json({ error: "Missing or invalid q parameter" }, { status: 400 });
  }

  const title = sanitizeTitle(q);
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}?redirect=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PraiserBot/1.0 (+https://github.com/philipposk/Praiser)",
      },
    });

    if (response.status === 404) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: `Wikipedia returned ${response.status}` },
        { status: 502 },
      );
    }

    const data: WikipediaSummary = await response.json();

    // Skip disambiguation / list pages — they're rarely useful as bios.
    if (data.type === "disambiguation") {
      return NextResponse.json(
        { error: "Disambiguation page — try a more specific name" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      title: data.title ?? q,
      description: data.description ?? "",
      extract: truncate((data.extract ?? "").trim(), MAX_EXTRACT_CHARS),
      thumbnail: data.originalimage?.source ?? data.thumbnail?.source ?? null,
      pageUrl: data.content_urls?.desktop?.page ?? null,
      lang,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      return NextResponse.json({ error: "Wikipedia timed out" }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Fetch failed", details: message }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
