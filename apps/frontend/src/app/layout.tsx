import "./globals.css";

import type { Metadata, Viewport } from "next";

import ConditionalHeader from "@/components/ConditionalHeader";
import { SITE_ORIGIN } from "@/lib/site";

import Providers from "./providers";

export const viewport: Viewport = {
  themeColor: "#0C0D0E",
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
  metadataBase: new URL(SITE_ORIGIN),
  alternates: {
    canonical: SITE_ORIGIN,
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
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#e9c822" }],
  },
  manifest: "/site.webmanifest",
  other: { "msapplication-TileImage": "/mstile-150x150.png" },
  category: "developer tools",
};

const RootLayout: React.FC<
  Readonly<{
    children: React.ReactNode;
  }>
> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="google-site-verification"
          content="Ef6TZgGnNnoYy5eVp7xsHN73inP9oT5izQak78uVwuQ"
        />
      </head>
      <body suppressHydrationWarning>
        {/*
          THESIS: The page is the tool's own output, set well. Real bytecode and
          a real spec trace do the arguing; the design's whole job is to make
          them legible and get out of the way. Refuses the metaphor — no borrowed
          world — and equally refuses the category's laziest habits: eyebrow
          pill, centred hero over a stock code block, six identical icon cards.
          OWN-WORLD: Convention, executed at full craft. Near-black ground,
          hairline rules, one accent (#F9E31A) spent only on the live result and
          the primary action. Density is a feature: listings stay monospace,
          tabular and tight. Character comes from type scale, optical alignment
          and restraint, never ornament.
          STORY: A developer chasing "why is [] == ![] true" sees the spec
          executing, believes the steps are real, and steps into a tool.
          FIRST VIEWPORT: The expression, its verdict, and the five operations
          that actually ran — left. The four engines' bytecode for one snippet —
          right. Both real output, not illustration. Primary action sits under
          the trace.
          FORM: Category standard, taken by the user as the standing exit after
          two direction rounds; craft bar Linear / Vercel / Raycast / Astro /
          Bun / Deno / Compiler Explorer. Seed key 8354c7e8, not built.
          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, and DESIGN.md
        */}
        <Providers>
          <ConditionalHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
