import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";

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
  title: "Asset-Bridge: Use Your Real Logo in ChatGPT, Claude & AI Artifacts",
  description:
    "Stop using placeholder images. Convert your brand assets into hosted React components or direct links usable in ChatGPT presentations, Claude Artifacts, and V0.dev. Free & Open Source.",
  keywords: [
    "logo in chatgpt",
    "images in claude artifacts",
    "svg to react",
    "host images for ai",
    "brand assets for llms",
    "asset bridge",
    "logo hosting",
    "react component converter",
  ],
  openGraph: {
    title: "Asset-Bridge: Your Brand Assets in AI",
    description: "Don't let AI hallucinate your logo. Get a direct link for your brand assets instantly.",
    type: "website",
    url: "https://asset-bridge-app.vercel.app",
    siteName: "Asset-Bridge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset-Bridge: Your Brand Assets in AI",
    description: "Don't let AI hallucinate your logo. Get a direct link for your brand assets instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
