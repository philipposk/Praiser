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

export const metadata: Metadata = {
  title: "Praiser",
  description:
    "Praiser is an AI that celebrates and praises the person you choose.",
  applicationName: "Praiser",
  appleWebApp: {
    capable: true,
    title: "Praiser",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
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
