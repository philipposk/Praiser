import type { MetadataRoute } from "next";

const SITE_URL = "https://praiser.6x7.gr";

/** AI crawlers named explicitly so letting them in is a stated choice. Same rules as "*". */
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot",
];

// Public pages are open to search engines; the signed-in app and API are not.
export default function robots(): MetadataRoute.Robots {
  return {
    // /api/og is the share-card image; it must stay fetchable even though the rest of /api is not.
    rules: [AI_CRAWLERS, "*"].map((userAgent) => ({ userAgent, allow: ["/", "/api/og"], disallow: ["/api/", "/c/"] })),
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
