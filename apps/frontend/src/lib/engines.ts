import { EngineKey } from "@/lib/types";

export type BytecodeLang = "v8bc" | "jscbc" | "smbc" | "hermesbc";

export interface EngineDescriptor {
  short: string;
  long: string;
  lang: BytecodeLang;
}

export const ENGINES: Record<EngineKey, EngineDescriptor> = {
  [EngineKey.v8]: {
    short: "V8",
    long: "V8 (d8)",
    lang: "v8bc",
  },
  [EngineKey.sm]: {
    short: "SpiderMonkey",
    long: "SpiderMonkey (js)",
    lang: "smbc",
  },
  [EngineKey.hermes]: {
    short: "Hermes",
    long: "Hermes (hermesc)",
    lang: "hermesbc",
  },
  [EngineKey.jsc]: {
    short: "JSC",
    long: "JavaScriptCore (jsc)",
    lang: "jscbc",
  },
};

export const engineLabel = (engine: EngineKey): string => ENGINES[engine].short;

export const engineLang = (engine: EngineKey): BytecodeLang => ENGINES[engine].lang;

export type EngineVersions = Partial<Record<EngineKey, string>>;
