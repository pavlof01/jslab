import type { Metadata } from "next";

import { OG_CARD, ogCardUrl, SITE_ORIGIN } from "@/lib/site";

import LandingPage from "./(landing)/page";

const LANDING_CARD = ogCardUrl(SITE_ORIGIN, {
  title: "Interactive ECMAScript Explorer",
  subtitle: "Interactive traces, spec visualizers, and per-engine bytecode.",
});

export const metadata: Metadata = {
  title: "Interactive ECMAScript Explorer",
  description:
    "Understand JavaScript engine behavior and explore the ECMAScript specification with interactive traces, abstract operation visualizers, and per-engine bytecode.",
  keywords: [
    "ECMAScript explorer",
    "JavaScript engine internals",
    "ECMA-262 visualizer",
    "JavaScript bytecode",
    "abstract operations",
    "V8",
    "SpiderMonkey",
    "Hermes",
    "JavaScriptCore",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "JSLab | Interactive ECMAScript Explorer",
    description:
      "Explore ECMAScript internals with interactive traces, spec visualizers, and JavaScript engine tooling.",
    url: "/",
    siteName: "JSLab",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: LANDING_CARD,
        width: OG_CARD.width,
        height: OG_CARD.height,
        alt: "JSLab | Interactive ECMAScript Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSLab | Interactive ECMAScript Explorer",
    description:
      "Explore ECMAScript internals with interactive traces, spec visualizers, and JavaScript engine tooling.",
    images: [LANDING_CARD],
  },
};

export const dynamic = "force-dynamic";

const Page: React.FC = () => {
  return <LandingPage />;
};

export default Page;
