import { flagCatalog, type CatalogEngine, type FlagSpec } from "@jslab/engine-runtime";

/** Engine keys as the api gateway spells them on the wire. */
export const ENGINE_KEYS = ["v8", "hermes", "sm", "jsc"] as const;

export type EngineKey = (typeof ENGINE_KEYS)[number];

export interface EngineInfo {
  key: EngineKey;
  /** Name a human recognises, used in headings. */
  label: string;
  /** Spellings accepted on the command line besides the key itself. */
  aliases: readonly string[];
  /**
   * Flags `--bytecode` adds for this engine. Empty for the three engines whose
   * service already asks the binary to dump bytecode on every run — adding a
   * flag there would be a no-op the sanitizer would reject anyway.
   */
  bytecodeFlags: readonly string[];
  /** How this engine gets to bytecode, shown by `jslab engines`. */
  bytecodeNote: string;
}

export const ENGINES: Record<EngineKey, EngineInfo> = {
  v8: {
    key: "v8",
    label: "V8 (d8)",
    aliases: ["d8", "chrome", "node"],
    bytecodeFlags: ["--print-bytecode"],
    bytecodeNote: "d8 runs the snippet; --bytecode adds --print-bytecode for the Ignition dump.",
  },
  hermes: {
    key: "hermes",
    label: "Hermes",
    aliases: ["hbc"],
    bytecodeFlags: [],
    bytecodeNote: "the service always passes -dump-bytecode; no client flag needed.",
  },
  sm: {
    key: "sm",
    label: "SpiderMonkey",
    aliases: ["spidermonkey", "firefox", "moz"],
    bytecodeFlags: [],
    bytecodeNote: "the service disassembles the snippet with the shell's dis(); no client flag needed.",
  },
  jsc: {
    key: "jsc",
    label: "JavaScriptCore",
    aliases: ["javascriptcore", "safari", "webkit"],
    bytecodeFlags: [],
    bytecodeNote: "the service always passes -d; no client flag needed.",
  },
};

const BY_NAME = new Map<string, EngineKey>(
  ENGINE_KEYS.flatMap((key) => [
    [key, key] as const,
    ...ENGINES[key].aliases.map((alias) => [alias, key] as const),
  ]),
);

/** Resolve a user-typed engine name (key or alias); null when unknown. */
export function resolveEngine(name: string): EngineKey | null {
  return BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

/**
 * Flag catalog for an engine. The CLI reads the same catalog the gateway and
 * the engine services filter against (`@jslab/engine-runtime`), so `jslab
 * flags` can never list a flag the server would reject, and a typo is caught
 * before a request is spent on it.
 */
export function flagsFor(engine: EngineKey): readonly FlagSpec[] {
  return flagCatalog[engine satisfies CatalogEngine];
}
