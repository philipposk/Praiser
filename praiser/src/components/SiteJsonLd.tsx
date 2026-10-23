/** Site-wide structured data (WebSite, Organization, SoftwareApplication) for search engines. */
const SITE_URL = "https://praiser.6x7.gr";
/** The one description used by meta, Open Graph, Twitter and JSON-LD. */
export const SITE_DESCRIPTION =
  "Free AI that praises, hypes, and celebrates anyone — friend, family, partner, hero. Multi-language (EN + EL). Voice + live conversation. No signup.";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Praiser",
      description: SITE_DESCRIPTION,
      publisher: { "@id": "https://6x7.gr/#organization" },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": "https://6x7.gr/#organization",
      name: "6x7",
      url: "https://6x7.gr",
    },
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${SITE_URL}/#app`,
      name: "Praiser",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "LifestyleApplication",
      image: `${SITE_URL}/api/og`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      inLanguage: ["en", "el"],
      featureList: [
        "Praise, odes and stories about anyone you describe",
        "Send a photo and get something kind said about the person",
        "Voice notes and live voice conversation",
        "Preset personas such as Socrates, Mr. Rogers and Bob Ross",
        "English and Greek; no signup needed",
      ],
      operatingSystem: "Web",
      publisher: { "@id": "https://6x7.gr/#organization" },
    },
  ],
};

export function SiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
