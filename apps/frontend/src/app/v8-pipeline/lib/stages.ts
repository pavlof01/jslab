export type ApiStageId = "ast" | "bytecode" | "sparkplug" | "maglev" | "turbofan" | "deopt";

export type StageId = "tokens" | ApiStageId;

export type StageView = "tokens" | "bytecode" | "machineCode" | "deoptEvents";

export interface Stage {
  id: StageId;
  label: string;
  tier: string;
  view: StageView;
  flags?: string[];
  hint?: string;
}

const NATIVES = "--allow-natives-syntax";

export const STAGES: Stage[] = [
  {
    id: "tokens",
    label: "Tokens",
    tier: "Lexer",
    view: "tokens",
    hint:
      "This tokenizer runs entirely in the browser and approximates V8's lexer. " +
      "The real V8 scanner is written in C++ and handles edge cases (Unicode escapes, template literal nesting, regex disambiguation) differently.",
  },
  { id: "ast", label: "AST", tier: "Parser", view: "bytecode", flags: ["--print-ast", NATIVES] },
  {
    id: "bytecode",
    label: "Bytecode",
    tier: "Ignition",
    view: "bytecode",
    flags: ["--print-bytecode", NATIVES],
  },
  {
    id: "sparkplug",
    label: "Sparkplug",
    tier: "Baseline JIT",
    view: "machineCode",
    flags: ["--print-code", NATIVES],
    hint:
      "Sparkplug compiles bytecode directly to machine code without optimization passes. " +
      "It kicks in after a function has been interpreted a few times (~dozens of calls).",
  },
  {
    id: "maglev",
    label: "Maglev",
    tier: "Mid-tier JIT",
    view: "machineCode",
    flags: ["--print-maglev-code", NATIVES],
    hint: "The JIT mid-tier compiler only processes hot functions. Add a loop that calls your function ~500+ times.",
  },
  {
    id: "turbofan",
    label: "TurboFan",
    tier: "Opt JIT",
    view: "machineCode",
    flags: ["--print-opt-code", NATIVES],
    hint:
      "The optimizing JIT only processes very hot, type-stable functions. " +
      "Add a loop that calls your function ~10 000+ times.",
  },
  {
    id: "deopt",
    label: "Deopts",
    tier: "Runtime",
    view: "deoptEvents",
    flags: ["--trace-opt", "--trace-deopt", NATIVES],
  },
];

export const API_STAGES = STAGES.filter(
  (stage): stage is Stage & { id: ApiStageId; flags: string[] } => stage.flags !== undefined,
);

const DIAGNOSTICS = ["Concurrent maglev has been disabled for tracing."];

export function stripDiagnostics(text: string): string {
  return text
    .split("\n")
    .filter((line) => !DIAGNOSTICS.some((diagnostic) => line.includes(diagnostic)))
    .join("\n")
    .trim();
}
