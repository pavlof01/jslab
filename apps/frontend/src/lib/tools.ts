/**
 * Every shipped tool, in one place. The landing grid and the footer both read
 * from here so a new page can't be launched and then stay undiscoverable.
 */
export interface Tool {
  label: string;
  href: string;
  description: string;
}

export const tools: Tool[] = [
  {
    label: "Playground",
    href: "/playground",
    description: "Run a snippet across V8, SpiderMonkey, Hermes and JSC and diff their bytecode.",
  },
  {
    label: "V8 Pipeline",
    href: "/v8-pipeline",
    description: "Watch one function move through tokens, AST, Ignition, Sparkplug, Maglev and TurboFan.",
  },
  {
    label: "v8.log Viewer",
    href: "/v8-log",
    description: "Drop in a --prof log and see the hottest functions and deopt reasons.",
  },
  {
    label: "Type Conversion",
    href: "/type-conversion",
    description: "Step through ToNumber, ToPrimitive and friends exactly as ECMA-262 defines them.",
  },
  {
    label: "Equality Operators",
    href: "/equality",
    description: "Trace == and === through the abstract comparison algorithms, step by step.",
  },
  {
    label: "Coercion Quiz",
    href: "/quiz",
    description: "Predict what tricky expressions print, then replay the spec steps behind the answer.",
  },
];
