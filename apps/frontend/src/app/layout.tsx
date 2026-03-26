import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { HeaderBar } from "@/components/HeaderBar";

export const viewport: Viewport = {
  themeColor: "#111827",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
    url: "https://jslab.su",
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
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          <HeaderBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
