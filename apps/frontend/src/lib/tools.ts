export type NavGroup = "engines" | "spec" | "learn";

export interface Tool {
  href: string;
  label: string;
  description: string;
  detail?: string;
  group: NavGroup;
  kind: "engines" | "spec";
  priority: number;
}

export interface ExternalLink {
  href: string;
  label: string;
  description: string;
  group: NavGroup;
  external: true;
}

export const tools: Tool[] = [
  {
    href: "/playground",
    label: "Playground",
    description: "Run a snippet across V8, SpiderMonkey, Hermes and JSC and diff their bytecode.",
    detail:
      "Run a snippet across V8, SpiderMonkey, Hermes and JSC, diff their bytecode, and call V8 intrinsics like %DebugPrint or %OptimizeFunctionOnNextCall.",
    group: "engines",
    kind: "engines",
    priority: 0.9,
  },
  {
    href: "/v8-pipeline",
    label: "V8 Pipeline",
    description:
      "Watch one function move through tokens, AST, Ignition, Sparkplug, Maglev and TurboFan.",
    group: "engines",
    kind: "engines",
    priority: 0.9,
  },
  {
    href: "/type-conversion",
    label: "Type Conversion",
    description: "Step through ToNumber, ToPrimitive and friends exactly as ECMA-262 defines them.",
    group: "spec",
    kind: "spec",
    priority: 0.8,
  },
  {
    href: "/equality",
    label: "Equality Operators",
    description:
      "Trace ==, ===, relational comparison and + through the spec algorithms, step by step.",
    group: "spec",
    kind: "spec",
    priority: 0.8,
  },
];

export const externalLinks: ExternalLink[] = [
  {
    href: "https://tc39.es/ecma262/",
    label: "ECMA-262",
    description: "Open the official ECMAScript specification.",
    group: "spec",
    external: true,
  },
  {
    href: "/api/docs",
    label: "Public API",
    description: "Run engines programmatically — issue a key and read the docs.",
    group: "learn",
    external: true,
  },
];

export const NAV_GROUPS: Array<{ group: NavGroup; label: string }> = [
  { group: "engines", label: "Engines" },
  { group: "spec", label: "ECMA Spec" },
  { group: "learn", label: "Learn" },
];

export type NavEntry = { href: string; label: string; description: string; external?: boolean };

export function navEntries(group: NavGroup): NavEntry[] {
  return [
    ...tools
      .filter((tool) => tool.group === group)
      .map(({ href, label, description }) => ({ href, label, description })),
    ...externalLinks
      .filter((link) => link.group === group)
      .map(({ href, label, description }) => ({
        href,
        label,
        description,
        external: true as const,
      })),
  ];
}
