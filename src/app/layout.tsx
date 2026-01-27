import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { Analytics } from "@vercel/analytics/react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Fix Broken Images in Claude Artifacts & Cursor AI | Asset-Bridge",
  description:
    "Stop seeing broken image icons in AI previews. Host local images & custom logos instantly for Claude Artifacts, Cursor Composer, ChatGPT Canvas & Base44. Get permanent links in seconds. Free.",
  keywords: [
    "host local images for claude artifacts",
    "fix broken image icon cursor ai",
    "custom logo in ai generated website",
    "svg hosting for ai prototypes",
    "render local assets chatgpt canvas",
    "claude artifacts broken images",
    "cursor composer image hosting",
    "ai preview image fix",
    "base44 image hosting",
    "logo hosting for developers",
  ],
  authors: [{ name: "Asset-Bridge" }],
  creator: "Asset-Bridge",
  publisher: "Asset-Bridge",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.assetbridge.app",
    siteName: "Asset-Bridge",
    title: "Fix Broken Images in Claude Artifacts & Cursor AI Previews",
    description: "Stop seeing broken image icons. Host your custom logos & local assets instantly for AI prototypes. Works with Claude, Cursor, ChatGPT Canvas & Base44.",
    images: [
      {
        url: "https://www.assetbridge.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Asset-Bridge - Fix broken images in AI previews",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@assetbridge",
    creator: "@assetbridge",
    title: "Fix Broken Images in Claude Artifacts & Cursor AI",
    description: "No more broken image icons. Host your custom logos instantly for AI prototypes. Free & open source.",
    images: ["https://www.assetbridge.app/og-image.png"],
  },
  alternates: {
    canonical: "https://www.assetbridge.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Asset-Bridge",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Host local images and custom logos instantly for AI previews. Fix broken image icons in Claude Artifacts, Cursor Composer, ChatGPT Canvas, and Base44. Get permanent links for your assets in seconds.",
    "featureList": [
      "Instant image hosting for AI prototypes",
      "Custom logo rendering in Claude Artifacts",
      "Fix broken images in Cursor Composer",
      "ChatGPT Canvas asset integration",
      "SVG to React component conversion",
      "Permanent CDN links for local files",
      "Base44 image hosting support"
    ],
    "url": "https://www.assetbridge.app",
    "screenshot": "https://www.assetbridge.app/og-image.png",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1"
    },
    "author": {
      "@type": "Organization",
      "name": "Asset-Bridge",
      "url": "https://www.assetbridge.app"
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
