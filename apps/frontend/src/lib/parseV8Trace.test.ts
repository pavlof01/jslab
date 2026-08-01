import { describe, it, expect } from "@jest/globals";
import { parseV8Trace, summarizeV8Trace } from "./parseV8Trace";

// Representative --trace-opt / --trace-deopt output (wording as V8 emits it).
const OPT = `[marking 0x3e2 <JSFunction add (sfi = 0x1)> for optimization to TURBOFAN, ConcurrencyMode::kConcurrent, reason: hot and stable]
[compiling method 0x3e2 <JSFunction add> (target TURBOFAN)]
[optimizing 0x3e2 <JSFunction add> - took 0.1, 0.2, 0.3 ms]`;

const DEOPT = `[deoptimizing (DEOPT eager): begin 0x3e2 <JSFunction add (sfi = 0x1)> (opt id 0) @1, FP to SP delta: 24]
            ;;; deoptimize at <stdin>:3:10, reason: Insufficient type feedback for binary operation`;

describe("parseV8Trace", () => {
  it("extracts optimization events with function names", () => {
    const evs = parseV8Trace(OPT);
    expect(evs.every((e) => e.kind === "optimize")).toBe(true);
    expect(evs.map((e) => e.fn)).toEqual(["add", "add", "add"]);
  });

  it("extracts a deopt with bailout kind, reason, and location", () => {
    const evs = parseV8Trace(DEOPT);
    const deopt = evs.find((e) => e.kind === "deopt")!;
    expect(deopt.fn).toBe("add");
    expect(deopt.bailout).toBe("eager");
    expect(deopt.reason).toContain("Insufficient type feedback");
    expect(deopt.location).toBe("stdin:3:10");
  });

  it("attaches a ';;; deoptimize at' continuation to the preceding deopt", () => {
    // The continuation line has no function of its own.
    const evs = parseV8Trace(DEOPT);
    expect(evs.filter((e) => e.kind === "deopt")).toHaveLength(1);
  });

  it("parses --trace-ic transitions", () => {
    const evs = parseV8Trace("[LoadIC in 0x1 <JSFunction add> (MONOMORPHIC->POLYMORPHIC) map 0x2]");
    expect(evs[0].kind).toBe("ic");
    expect(evs[0].reason).toBe("MONOMORPHIC->POLYMORPHIC");
  });

  it("ignores noise and never throws", () => {
    expect(parseV8Trace("hello world\n\nrandom d8 output")).toEqual([]);
    expect(parseV8Trace("")).toEqual([]);
  });

  it("summarizes counts and deopted functions", () => {
    const s = summarizeV8Trace(parseV8Trace(`${OPT}\n${DEOPT}`));
    expect(s.optimize).toBe(3);
    expect(s.deopt).toBe(1);
    expect(s.deoptedFns).toEqual(["add"]);
  });
});
