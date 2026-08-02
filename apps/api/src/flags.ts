/**
 * Canonical per-engine flag catalog plus the sanitizer both layers run.
 *
 * MIRRORED FILE — `packages/engine-runtime/src/flags.ts` and
 * `apps/api/src/flags.ts` must stay byte-identical. The api gateway cannot take
 * a `file:` dependency on this package: its Dockerfile copies only `apps/api`
 * as the build context, and that Dockerfile plus the deploy workflows would
 * have to change in lockstep. The copy is kept honest by `flags.test.ts` in
 * apps/api, which fails the build the moment the two files differ — so the
 * catalog is still edited in exactly one place, then copied.
 */

export type CatalogEngine = "v8" | "hermes" | "sm" | "jsc";

/** Grouping used by the docs/UI so a student can find flags by topic. */
export type FlagCategory =
  | "bytecode"
  | "codegen"
  | "optimization"
  | "inline-caches"
  | "object-shapes"
  | "parser"
  | "regexp"
  | "wasm"
  | "gc"
  | "diagnostics"
  | "runtime";

export interface FlagSpec {
  /** Flag as the engine spells it, without any `=value` part. */
  flag: string;
  /** When true the flag is accepted only in `--flag=value` form. */
  takesValue?: boolean;
  /** Values a value-bearing flag may carry; anything else is rejected. */
  valuePattern?: RegExp;
  description: string;
  category: FlagCategory;
}

/**
 * A function-name pattern for d8's `--print-*-filter` flags. V8 matches these
 * against the function name with optional `*` wildcards, so identifier
 * characters plus `*` and `.` are all a legitimate filter can contain — which
 * also keeps anything argv-surprising out of the value.
 */
const FUNCTION_NAME_FILTER = /^[A-Za-z0-9_$*.]{1,64}$/;

export const flagCatalog: Record<CatalogEngine, readonly FlagSpec[]> = {
  v8: [
    {
      flag: "--allow-natives-syntax",
      description: "Enable %-prefixed runtime intrinsics such as %OptimizeFunctionOnNextCall.",
      category: "runtime",
    },
    { flag: "--no-liftoff", description: "Skip the Liftoff wasm baseline tier; compile with TurboFan directly.", category: "wasm" },
    { flag: "--no-wasm-async-compilation", description: "Compile WebAssembly synchronously so output stays ordered.", category: "wasm" },
    { flag: "--print-all-code", description: "Dump every code object V8 generates (very large output).", category: "codegen" },
    { flag: "--print-all-exceptions", description: "Print every thrown exception, including caught ones.", category: "diagnostics" },
    { flag: "--print-ast", description: "Print the abstract syntax tree produced by the parser.", category: "parser" },
    { flag: "--print-break-location", description: "Print source positions used as debugger break locations.", category: "diagnostics" },
    { flag: "--print-builtin-code", description: "Disassemble V8's built-in code objects.", category: "codegen" },
    { flag: "--print-builtin-size", description: "Report the code size of each built-in.", category: "codegen" },
    { flag: "--print-bytecode", description: "Print Ignition bytecode for every compiled function.", category: "bytecode" },
    {
      flag: "--print-bytecode-filter",
      takesValue: true,
      valuePattern: FUNCTION_NAME_FILTER,
      description: "Limit --print-bytecode to functions matching this name pattern (supports *).",
      category: "bytecode",
    },
    { flag: "--print-code", description: "Disassemble generated machine code.", category: "codegen" },
    { flag: "--print-code-verbose", description: "Disassemble generated code with relocation and metadata detail.", category: "codegen" },
    { flag: "--print-deopt-stress", description: "Print deoptimization points visited under deopt stress.", category: "optimization" },
    { flag: "--print-flag-values", description: "Print every V8 flag and its effective value.", category: "diagnostics" },
    { flag: "--print-maglev-code", description: "Disassemble code produced by the Maglev mid-tier compiler.", category: "optimization" },
    { flag: "--print-maglev-deopt-verbose", description: "Explain each Maglev deoptimization in detail.", category: "optimization" },
    { flag: "--print-maglev-graph", description: "Print the Maglev IR graph.", category: "optimization" },
    { flag: "--print-maglev-graphs", description: "Print the Maglev IR graph after each phase.", category: "optimization" },
    { flag: "--print-opt-code", description: "Disassemble optimized (TurboFan) code.", category: "optimization" },
    { flag: "--print-opt-source", description: "Print the source of functions that get optimized.", category: "optimization" },
    { flag: "--print-regexp-bytecode", description: "Print the bytecode of the regexp interpreter.", category: "regexp" },
    { flag: "--print-regexp-code", description: "Disassemble compiled regexp code.", category: "regexp" },
    { flag: "--print-regexp-graph", description: "Print the regexp compiler's graph.", category: "regexp" },
    { flag: "--print-scopes", description: "Print the scope chain the parser built.", category: "parser" },
    { flag: "--print-turbolev-frontend", description: "Print the Turbolev frontend graph.", category: "optimization" },
    { flag: "--print-turbolev-inline-functions", description: "Print functions inlined by Turbolev.", category: "optimization" },
    { flag: "--print-wasm-code", description: "Disassemble compiled WebAssembly code.", category: "wasm" },
    { flag: "--print-wasm-stub-code", description: "Disassemble WebAssembly stub code.", category: "wasm" },
    { flag: "--trace-deopt", description: "Log every deoptimization with its reason.", category: "optimization" },
    { flag: "--trace-ic", description: "Log inline-cache state transitions (monomorphic → polymorphic → megamorphic).", category: "inline-caches" },
    { flag: "--trace-ignition", description: "Trace bytecode execution in the Ignition interpreter.", category: "bytecode" },
    { flag: "--trace-maps", description: "Log hidden-class (Map) creation and transitions.", category: "object-shapes" },
    { flag: "--trace-maps-details", description: "Log hidden-class transitions with per-property detail.", category: "object-shapes" },
    { flag: "--trace-opt", description: "Log which functions get optimized and when.", category: "optimization" },
    { flag: "--trace-opt-verbose", description: "Log optimization decisions with the reasoning behind them.", category: "optimization" },
  ],
  hermes: [
    { flag: "-O", description: "Enable Hermes optimizations before emitting bytecode.", category: "optimization" },
    { flag: "-gc-sanitize-handles", description: "Move objects on every allocation to surface handle bugs.", category: "gc" },
    { flag: "-strict", description: "Compile the snippet in strict mode.", category: "runtime" },
  ],
  sm: [
    { flag: "--baseline-eager", description: "Compile with the Baseline JIT immediately instead of after warm-up.", category: "optimization" },
    { flag: "--ion-eager", description: "Compile with the IonMonkey optimizing JIT immediately.", category: "optimization" },
  ],
  jsc: [{ flag: "-d", description: "Dump JSC bytecode for the compiled script.", category: "bytecode" }],
};

export interface SanitizedFlags {
  /** Flags accepted, deduplicated by name, in the order they will be passed. */
  flags: string[];
  /**
   * Flags that were rejected, echoed verbatim so a caller can spot a typo.
   *
   * Only entries whose flag *name* never reached the engine appear here — a
   * repeated `--trace-opt`, or a second `--print-bytecode-filter=` with a bad
   * value after a good one, is not a typo the caller can act on and reporting
   * it made a working flag look broken in the UI.
   */
  dropped: string[];
}

/**
 * Filter client-supplied flags against the catalog for `engine`.
 *
 * Rejected flags are returned rather than silently swallowed: dropping a
 * mistyped flag quietly produces a clean run with mysteriously missing output,
 * which is indistinguishable from "the engine has nothing to say".
 */
export function sanitizeFlags(
  engine: string,
  flags: readonly unknown[],
  opts: { maxFlags: number; sort?: boolean },
): SanitizedFlags {
  const specs = flagCatalog[engine as CatalogEngine] ?? [];
  const byName = new Map(specs.map((spec) => [spec.flag, spec]));
  const seen = new Set<string>();
  const accepted: string[] = [];
  // Rejects are collected with the flag name they carried, then filtered once
  // the accepted set is known: an entry whose name was accepted elsewhere in
  // the list DID reach the engine, so reporting it would contradict the docs
  // and make a UI mark a working flag as a typo.
  const rejected: Array<{ raw: string; name: string }> = [];
  const drop = (raw: string, name: string) => {
    // A blank entry is nothing the caller can act on; reporting `""` as a
    // dropped flag is noise, not a typo hint.
    if (raw !== "") rejected.push({ raw, name });
  };
  const nameOf = (flag: string) => {
    const eq = flag.indexOf("=");
    return eq === -1 ? flag : flag.slice(0, eq);
  };

  flags.forEach((raw, index) => {
    if (typeof raw !== "string") {
      const text = String(raw);
      drop(text, nameOf(text));
      return;
    }
    const trimmed = raw.trim();
    const name = nameOf(trimmed);
    // The cap applies to the raw list so a caller cannot push the pod's flag
    // budget up by padding the request with junk that would be dropped anyway.
    if (index >= opts.maxFlags || !trimmed.startsWith("-")) {
      drop(trimmed, name);
      return;
    }

    const value = trimmed.length === name.length ? undefined : trimmed.slice(name.length + 1);
    const spec = byName.get(name);

    if (!spec) {
      drop(trimmed, name);
      return;
    }
    if (!spec.takesValue && value !== undefined) {
      drop(trimmed, name);
      return;
    }
    if (spec.takesValue && (value === undefined || !spec.valuePattern?.test(value))) {
      drop(trimmed, name);
      return;
    }
    // Dedupe by name: `--print-bytecode-filter` twice would otherwise let the
    // second occurrence silently override the first inside the engine.
    if (seen.has(name)) {
      drop(trimmed, name);
      return;
    }

    seen.add(name);
    accepted.push(trimmed);
  });

  if (opts.sort !== false) accepted.sort();
  // Report at most one cap's worth of rejects: the list exists to show a caller
  // their typo, not to echo a multi-megabyte junk array back at them.
  const dropped = rejected
    .filter((entry) => !seen.has(entry.name))
    .slice(0, opts.maxFlags)
    .map((entry) => entry.raw);
  return { flags: accepted, dropped };
}
