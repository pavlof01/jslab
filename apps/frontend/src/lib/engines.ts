import { EngineKey } from "@/lib/types";

export type BytecodeLang = "v8bc" | "jscbc" | "smbc" | "hermesbc";

export interface EngineDescriptor {
  short: string;
  long: string;
  executes: boolean;
  summary: string;
  quirks: string[];
  lang: BytecodeLang;
}

export const ENGINES: Record<EngineKey, EngineDescriptor> = {
  [EngineKey.v8]: {
    short: "V8",
    long: "V8 (d8)",
    executes: true,
    summary: "Runs your code and dumps Ignition bytecode.",
    quirks: [
      "The default output is a bytecode dump because --print-bytecode is on by default — clear it to see program output alone.",
      "Use print() to write to stdout; %Natives require --allow-natives-syntax.",
    ],
    lang: "v8bc",
  },
  [EngineKey.sm]: {
    short: "SpiderMonkey",
    long: "SpiderMonkey (js)",
    executes: false,
    summary: "Compiles and disassembles only — your code is not executed.",
    quirks: [
      "The shell wraps your source in a function and disassembles it, so print() produces no output.",
      "Only --baseline-eager and --ion-eager are accepted.",
    ],
    lang: "smbc",
  },
  [EngineKey.hermes]: {
    short: "Hermes",
    long: "Hermes (hermesc)",
    executes: false,
    summary: "Compiles and disassembles only — your code is not executed.",
    quirks: [
      "hermesc -dump-bytecode stops after codegen, so there is never any program output.",
      "Hermes ships a reduced runtime: some Intl and newer built-ins are absent.",
    ],
    lang: "hermesbc",
  },
  [EngineKey.jsc]: {
    short: "JSC",
    long: "JavaScriptCore (jsc)",
    executes: true,
    summary: "Runs your code and dumps JSC bytecode.",
    quirks: [
      "This shell executes your code; console is shimmed to print(), so console.log lands on stdout.",
      "Bytecode and program output are interleaved in the same stream.",
    ],
    lang: "jscbc",
  },
};

export const engineLabel = (engine: EngineKey): string => ENGINES[engine].short;

export const engineLang = (engine: EngineKey): BytecodeLang => ENGINES[engine].lang;
