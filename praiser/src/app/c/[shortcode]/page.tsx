import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { SharedChat } from "@/app/api/chats/share/route";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://praiser.vercel.app";

type Params = { shortcode: string };

const fetchShared = async (shortcode: string): Promise<SharedChat | null> => {
  try {
    const response = await fetch(
      `${SITE_URL}/api/chats/share?code=${encodeURIComponent(shortcode)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as SharedChat;
  } catch {
    return null;
  }
};

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { shortcode } = await params;
  const data = await fetchShared(shortcode);
  if (!data) {
    return { title: "Praiser — shared chat" };
  }
  const firstAssistant = data.chat.messages.find((m) => m.role === "assistant");
  const text = firstAssistant?.content ?? data.chat.name;
  const firstImage = data.person.images?.[0]?.url;
  const ogParams = new URLSearchParams({
    text: truncate(text, 280),
    name: data.person.name,
    lang: data.language,
  });
  if (firstImage) ogParams.set("image", firstImage);
  const ogUrl = `${SITE_URL}/api/og?${ogParams.toString()}`;
  const title = `${data.person.name} — Praiser`;
  const description = truncate(text, 200);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: data.person.name }],
      type: "article",
      url: `${SITE_URL}/c/${shortcode}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

const formatRoleLabel = (role: string, lang: "el" | "en") => {
  if (role === "user") return lang === "el" ? "Ερώτηση" : "Question";
  return lang === "el" ? "Praiser" : "Praiser";
};

export default async function SharedChatPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { shortcode } = await params;
  const data = await fetchShared(shortcode);
  if (!data) notFound();

  const lang = data.language;
  const visibleMessages = data.chat.messages.filter((m) => m.role !== "system");
  const ctaText = lang === "el" ? "Επαίνεσε κάποιον δικό σου →" : "Praise someone of your own →";
  const sharedLabel = lang === "el" ? "Κοινοποιημένο" : "Shared chat";

  return (
    <main className="main" style={{ height: "100vh", overflow: "auto" }}>
      <div
        className="topbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        }}
      >
        <div className="topbar-left">
          <a href="/" style={{ display: "flex", textDecoration: "none" }}>
            <span className="brand-mark">
              praiser<em style={{ color: "var(--clay)" }}>.</em>
            </span>
          </a>
        </div>
        <div className="topbar-right">
          <span className="label" style={{ marginRight: 12 }}>
            {sharedLabel}
          </span>
        </div>
      </div>

      <div className="chat-scroll" style={{ paddingBottom: 80 }}>
        <div className="chat-inner">
          <header style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 24, paddingBottom: 28 }}>
            <span className="label">
              {lang === "el" ? "Έπαινος για" : "Praise for"}
            </span>
            <h1 className="serif" style={{ fontSize: 44, margin: 0, color: "var(--ink)" }}>
              {data.person.name}
            </h1>
            {data.person.extraInfo && (
              <p style={{ color: "var(--muted)", fontSize: 14, maxWidth: 560, lineHeight: 1.55, margin: 0 }}>
                {truncate(data.person.extraInfo, 220)}
              </p>
            )}
          </header>

          <div className="messages">
            {visibleMessages.map((m) => {
              const isUser = m.role === "user";
              const isVoice = m.source === "voice";
              return (
                <div key={m.id} className={"msg " + m.role + (isVoice ? " has-voice" : "")}>
                  <div className="msg-meta">
                    <span className="name">{formatRoleLabel(m.role, lang)}</span>
                    {isVoice && <span>· {lang === "el" ? "φωνητικό" : "voice"}</span>}
                  </div>
                  <div className="msg-body">
                    {m.content}
                    {m.images && m.images.length > 0 && (
                      <div className={"msg-images " + (m.images.length === 1 ? "single" : "")}>
                        {m.images.map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={img.url} alt={img.name || ""} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--line-soft)" }}>
            <a
              href="/"
              className="new-chat"
              style={{
                display: "inline-flex",
                width: "auto",
                padding: "10px 18px",
                textDecoration: "none",
              }}
            >
              <span>{ctaText}</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
