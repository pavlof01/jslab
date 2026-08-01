import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#111827",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinning it to 1 blocks pinch-zoom, a WCAG 1.4.4 failure.
};

export const metadata: Metadata = {
  title: {
    default: "JSLab — Explore JS Engines",
    template: "%s | JSLab",
  },
  description:
    "Explore JavaScript engines interactively — view bytecode, analyze execution stages, and compare performance across V8, SpiderMonkey, JavaScriptCore, and Hermes.",
  keywords: [
    "Alexey Pavlov",
    "JavaScript",
    "V8",
    "bytecode",
    "JS engines",
    "disassembly",
    "compiler",
    "JS bytecode",
    "SpiderMonkey",
    "JavaScriptCore",
    "Hermes",
    "JIT",
    "interpreter",
    "AST",
  ],
  authors: { name: "Pavlov Alexey", url: "https://github.com/pavlof01" },
  creator: "Pavlov Alexey",
  publisher: "Pavlov Alexey",
  metadataBase: new URL("https://jslab.su"),
  alternates: {
    canonical: "https://jslab.su",
  },
  openGraph: {
    title: "JSLab — Explore JS Engines",
    description:
      "Dive deep into JavaScript engine internals. Visualize bytecode, optimization stages, and performance across V8, SpiderMonkey, JavaScriptCore, and Hermes.",
    url: "/",
    siteName: "JSLab",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JSLab — Explore JS Engines",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48 64x64", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/icon.png", sizes: "256x256", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  category: "developer tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="Ef6TZgGnNnoYy5eVp7xsHN73inP9oT5izQak78uVwuQ" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
