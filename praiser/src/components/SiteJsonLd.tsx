/** Site-wide structured data (WebSite, Organization, SoftwareApplication) for search engines. */
const SITE_URL = "https://praiser.6x7.gr";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Praiser",
      description: "AI that writes warm, specific compliments for anyone you love.",
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
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: "Praiser",
      url: SITE_URL,
      description: "AI that writes warm, specific compliments for anyone you love.",
      applicationCategory: "LifestyleApplication",
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
