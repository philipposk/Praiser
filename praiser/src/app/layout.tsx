import type { Metadata } from "next";
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://praiser.6x7.gr").toLowerCase();

export const metadata: Metadata = {
  alternates: { canonical: "./" },
  robots: { index: true, follow: true },
  title: "Praiser — AI that celebrates anyone you love",
  description: SITE_DESCRIPTION,
  applicationName: "Praiser",
  metadataBase: new URL(SITE_URL),
  appleWebApp: {
    capable: true,
    title: "Praiser",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  openGraph: {
    title: "Praiser — AI that celebrates anyone you love",
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Praiser",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Praiser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Praiser — AI that celebrates anyone you love",
    description: SITE_DESCRIPTION,
    images: ["/api/og"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

import { headers } from "next/headers";
import { THEME_BOOT } from "@/lib/theme";
import { SITE_DESCRIPTION, SiteJsonLd } from "@/components/SiteJsonLd";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by src/proxy.ts; the CSP only lets scripts with this nonce run.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en">
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      >
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
