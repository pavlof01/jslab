import type { Metadata } from "next";

import LandingPage from "./(landing)/page";

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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JSLab | Interactive ECMAScript Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JSLab | Interactive ECMAScript Explorer",
    description:
      "Explore ECMAScript internals with interactive traces, spec visualizers, and JavaScript engine tooling.",
    images: ["/og-image.png"],
  },
};

export const dynamic = "force-dynamic";

const Page: React.FC = () => {
  return <LandingPage />;
};

export default Page;
