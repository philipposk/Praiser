import { ImageResponse } from "next/og";

export const runtime = "edge";

const COLORS = {
  bg: "#F2EBDC",
  surface: "#FAF5E9",
  ink: "#1B1611",
  ink2: "#3D352A",
  muted: "#7A6E5C",
  clay: "#B8451F",
  line: "#DDD2B9",
};

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = truncate((searchParams.get("text") || "Tell me about someone.").trim(), 280);
  const name = truncate((searchParams.get("name") || "Praiser").trim(), 60);
  const imageUrl = searchParams.get("image");
  const lang = searchParams.get("lang") === "el" ? "el" : "en";

  const headerLabel = `${lang === "el" ? "Έπαινος για" : "Praise for"} · ${name}`;
  const subtitleLabel = lang === "el" ? "AI που επαινεί" : "AI Praise Assistant";
  const quoted = `“${text}”`;
  const fontSize = text.length > 180 ? 32 : text.length > 100 ? 40 : 52;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          background: COLORS.bg,
          fontFamily: "serif",
          color: COLORS.ink,
        }}
      >
        <div
          style={{
            width: 470,
            height: 630,
            display: "flex",
            flexShrink: 0,
            borderRight: `1px solid ${COLORS.line}`,
            background: COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              width={470}
              height={630}
              style={{ objectFit: "cover", width: 470, height: 630 }}
            />
          ) : (
            <span style={{ fontSize: 168, color: COLORS.clay, fontStyle: "italic" }}>
              praiser.
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "56px 56px 36px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLORS.muted,
                fontFamily: "sans-serif",
                fontWeight: 600,
              }}
            >
              {headerLabel}
            </div>
            <div
              style={{
                display: "flex",
                fontSize,
                lineHeight: 1.18,
                color: COLORS.ink,
                letterSpacing: "-0.01em",
                whiteSpace: "pre-wrap",
              }}
            >
              {quoted}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderTop: `1px solid ${COLORS.line}`,
              paddingTop: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 36, color: COLORS.ink, letterSpacing: "-0.02em" }}>
              <span>praiser</span>
              <span style={{ color: COLORS.clay }}>.</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: COLORS.muted,
                fontFamily: "sans-serif",
              }}
            >
              {subtitleLabel}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
