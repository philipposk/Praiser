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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://praiser.vercel.app";

export const metadata: Metadata = {
  title: "Praiser — AI that celebrates anyone you love",
  description:
    "Free AI that praises, hypes, and celebrates anyone — friend, family, partner, hero. Multi-language (EN + EL). Voice + live conversation. No signup.",
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
    description:
      "Free AI that praises, hypes, and celebrates anyone. Voice + live conversation. EN + EL.",
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
    description:
      "Free AI that praises, hypes, and celebrates anyone. EN + EL.",
    images: ["/api/og"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// Inline script: read saved theme from localStorage before hydration to avoid FOUC.
const THEME_BOOT = `
(function(){try{
  var c=document.cookie.match(/praiser-theme=(dark|light)/);
  var v=c?c[1]:(localStorage.getItem('praiser-theme')||'light');
  if(v==='dark'){document.documentElement.setAttribute('data-theme','dark');}
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
