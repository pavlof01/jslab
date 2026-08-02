import { EngineKey } from "@/lib/types";

/**
 * Static, per-engine facts about what the underlying CLI shell actually does.
 * The shells differ in a way that silently confuses people: only d8 and jsc run
 * the script, so `print()` in a Hermes or SpiderMonkey snippet produces nothing
 * and looks like a broken playground.
 */
export interface EngineCapability {
  label: string;
  /** True when the shell runs the snippet; false when it only compiles + disassembles. */
  executes: boolean;
  /** One-liner used as the selector tooltip. */
  summary: string;
  /** Extra gotchas rendered under the output tabs. */
  quirks: string[];
}

export const ENGINE_CAPABILITIES: Record<EngineKey, EngineCapability> = {
  [EngineKey.v8]: {
    label: "V8 (d8)",
    executes: true,
    summary: "Runs your code and dumps Ignition bytecode.",
    quirks: [
      "The default output is a bytecode dump because --print-bytecode is on by default — clear it to see program output alone.",
      "Use print() to write to stdout; %Natives require --allow-natives-syntax.",
    ],
  },
  [EngineKey.sm]: {
    label: "SpiderMonkey (js)",
    executes: false,
    summary: "Compiles and disassembles only — your code is not executed.",
    quirks: [
      "The shell wraps your source in a function and disassembles it, so print() produces no output.",
      "Only --baseline-eager and --ion-eager are accepted.",
    ],
  },
  [EngineKey.hermes]: {
    label: "Hermes (hermesc)",
    executes: false,
    summary: "Compiles and disassembles only — your code is not executed.",
    quirks: [
      "hermesc -dump-bytecode stops after codegen, so there is never any program output.",
      "Hermes ships a reduced runtime: some Intl and newer built-ins are absent.",
    ],
  },
  [EngineKey.jsc]: {
    label: "JavaScriptCore (jsc)",
    executes: true,
    summary: "Runs your code and dumps JSC bytecode.",
    quirks: [
      "This shell executes your code; console is shimmed to print(), so console.log lands on stdout.",
      "Bytecode and program output are interleaved in the same stream.",
    ],
  },
};
