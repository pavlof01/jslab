export type IntrinsicCategory =
  | "Optimisation (plan/trigger)"
  | "Deoptimisation / transitions"
  | "Status / code analysis"
  | "Array & map inspection"
  | "Debug printing"
  | "Memory & snapshots";

export interface Intrinsic {
  name: string;
  category: IntrinsicCategory;
  description: string;
  snippet: string;
  completion?: string;
  featured?: boolean;
}

export const INTRINSICS: Intrinsic[] = [
  {
    name: "PrepareFunctionForOptimization",
    category: "Optimisation (plan/trigger)",
    description:
      "Tells V8 to keep the feedback a function needs so it can legally be optimised on demand — the step before requesting optimisation.",
    snippet: "%PrepareFunctionForOptimization(fn);",
    completion: "%PrepareFunctionForOptimization(${1:fn});",
    featured: true,
  },
  {
    name: "OptimizeFunctionOnNextCall",
    category: "Optimisation (plan/trigger)",
    description:
      "Marks a function for optimised compilation, so the next call goes through the optimising tier instead of the interpreter.",
    snippet: "%OptimizeFunctionOnNextCall(fn);\nfn(1);",
    completion: "%OptimizeFunctionOnNextCall(${1:fn});",
    featured: true,
  },
  {
    name: "OptimizeMaglevOnNextCall",
    category: "Optimisation (plan/trigger)",
    description: "The same request aimed at Maglev, V8's mid-tier JIT, rather than TurboFan.",
    snippet: "%OptimizeMaglevOnNextCall(fn);\nfn(1);",
    completion: "%OptimizeMaglevOnNextCall(${1:fn});",
  },
  {
    name: "FinalizeOptimization",
    category: "Optimisation (plan/trigger)",
    description: "Waits for background optimisation work to finish, so what you print afterwards is settled.",
    snippet: "%FinalizeOptimization();",
    completion: "%FinalizeOptimization();",
  },
  {
    name: "OptimizeOsr",
    category: "Optimisation (plan/trigger)",
    description: "Forces an on-stack replacement, optimising a function while it is still inside a running loop.",
    snippet: "%OptimizeOsr(fn);",
    completion: "%OptimizeOsr(${1:fn});",
  },

  {
    name: "DeoptimizeFunction",
    category: "Deoptimisation / transitions",
    description: "Throws away a function's optimised code, sending it back to the interpreter.",
    snippet: "%DeoptimizeFunction(fn);",
    completion: "%DeoptimizeFunction(${1:fn});",
  },
  {
    name: "DeoptimizeNow",
    category: "Deoptimisation / transitions",
    description: "Deoptimises the current frame immediately — the bail-out shows up in --trace-deopt output.",
    snippet: "%DeoptimizeNow();",
    completion: "%DeoptimizeNow();",
  },

  {
    name: "GetOptimizationStatus",
    category: "Status / code analysis",
    description:
      "Returns a bitmask describing where the function currently runs — interpreted, baseline, optimised, or marked for deoptimisation.",
    snippet: "%GetOptimizationStatus(fn);",
    completion: "%GetOptimizationStatus(${1:fn});",
    featured: true,
  },
  {
    name: "DisassembleFunction",
    category: "Status / code analysis",
    description: "Disassembles and prints the code generated for a function, at whichever tier compiled it.",
    snippet: "%DisassembleFunction(fn);",
    completion: "%DisassembleFunction(${1:fn});",
  },
  {
    name: "ActiveTierIsTurbofan",
    category: "Status / code analysis",
    description: "Answers whether the frame currently executing is TurboFan-compiled code.",
    snippet: "%ActiveTierIsTurbofan();",
  },
  {
    name: "IsMaglevEnabled",
    category: "Status / code analysis",
    description: "Answers whether Maglev is available in this build and configuration.",
    snippet: "%IsMaglevEnabled();",
  },
  {
    name: "IsTurbofanEnabled",
    category: "Status / code analysis",
    description: "Answers whether TurboFan is enabled in this build and configuration.",
    snippet: "%IsTurbofanEnabled();",
  },

  {
    name: "HasFastProperties",
    category: "Array & map inspection",
    description: "Answers whether an object still uses fast in-object properties or has fallen back to a dictionary.",
    snippet: "%HasFastProperties(obj);",
    completion: "%HasFastProperties(${1:obj});",
    featured: true,
  },
  {
    name: "HasFastElements",
    category: "Array & map inspection",
    description: "Answers whether an object still uses the fast array element layout.",
    snippet: "%HasFastElements(arr);",
    completion: "%HasFastElements(${1:arr});",
  },
  {
    name: "HasPackedElements",
    category: "Array & map inspection",
    description: "Answers whether an array is packed — no holes anywhere in its backing store.",
    snippet: "%HasPackedElements(arr);",
  },
  {
    name: "HasHoleyElements",
    category: "Array & map inspection",
    description: "Answers whether an array is holey, which V8 can never undo once it happens.",
    snippet: "%HasHoleyElements(arr);",
  },
  {
    name: "HaveSameMap",
    category: "Array & map inspection",
    description: "Compares the hidden classes (maps) of two objects — the direct way to see a shape divergence.",
    snippet: "%HaveSameMap(a, b);",
    completion: "%HaveSameMap(${1:a}, ${2:b});",
  },

  {
    name: "DebugPrint",
    category: "Debug printing",
    description:
      "Prints V8's internal view of a value: its map, element kind, property layout and whether it is in dictionary mode.",
    snippet: "%DebugPrint(x);",
    completion: "%DebugPrint(${1:value});",
    featured: true,
  },
  {
    name: "DebugTrace",
    category: "Debug printing",
    description: "Turns on tracing for the execution that follows.",
    snippet: "%DebugTrace();",
    completion: "%DebugTrace();",
  },
  {
    name: "GlobalPrint",
    category: "Debug printing",
    description: "A global print helper that avoids triggering a garbage collection of its own.",
    snippet: "%GlobalPrint('hello');",
  },

  {
    name: "CollectGarbage",
    category: "Memory & snapshots",
    description: "Forces a garbage collection, so you can watch what survives it.",
    snippet: "%CollectGarbage(null);",
    completion: "%CollectGarbage(${1:null});",
    featured: true,
  },
  {
    name: "TakeHeapSnapshot",
    category: "Memory & snapshots",
    description: "Captures a heap snapshot for GC and memory-structure analysis.",
    snippet: "%TakeHeapSnapshot();",
    completion: "%TakeHeapSnapshot();",
  },
];

export const INTRINSIC_CATEGORIES: IntrinsicCategory[] = INTRINSICS.reduce<IntrinsicCategory[]>(
  (order, intrinsic) => (order.includes(intrinsic.category) ? order : [...order, intrinsic.category]),
  [],
);

export const intrinsicsByCategory = (category: IntrinsicCategory): Intrinsic[] =>
  INTRINSICS.filter((intrinsic) => intrinsic.category === category);

export const completableIntrinsics = (): Array<Intrinsic & { completion: string }> =>
  INTRINSICS.filter((intrinsic): intrinsic is Intrinsic & { completion: string } => Boolean(intrinsic.completion));

export const featuredIntrinsics = (): Intrinsic[] => INTRINSICS.filter((intrinsic) => intrinsic.featured);

export const V8_NATIVES_FLAG = "--allow-natives-syntax";
