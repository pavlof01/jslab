import { describe, it, expect } from "@jest/globals";
import { parseV8Log, splitCsvLine } from "./parseV8Log";

// Two functions at 0x1000 (size 0x100) and 0x2000 (size 0x100). Ticks land in
// each range; one tick is unattributed (0x9999).
const LOG = [
  'code-creation,LazyCompile,10,100,0x1000,256,"add app.js:1:13"',
  'code-creation,LazyCompile,10,120,0x2000,256,"mul app.js:5:13"',
  "tick,0x1010,200,0,0x0,0",
  "tick,0x1020,210,0,0x0,0",
  "tick,0x2050,220,0,0x0,0",
  "tick,0x9999,230,0,0x0,0",
  "code-deopt,240,64,0x1000,eager",
].join("\n");

describe("splitCsvLine", () => {
  it("keeps commas inside quoted fields together", () => {
    expect(splitCsvLine('code-creation,Stub,0,1,0x1,2,"a, b, c"')).toEqual([
      "code-creation",
      "Stub",
      "0",
      "1",
      "0x1",
      "2",
      "a, b, c",
    ]);
  });
});

describe("parseV8Log", () => {
  it("counts total and attributed ticks", () => {
    const s = parseV8Log(LOG);
    expect(s.totalTicks).toBe(4);
    expect(s.attributedTicks).toBe(3); // 0x9999 falls outside both ranges
  });

  it("attributes ticks to the containing function, hottest first", () => {
    const s = parseV8Log(LOG);
    expect(s.hottest[0]).toMatchObject({ name: "add app.js:1:13", ticks: 2 });
    expect(s.hottest[1]).toMatchObject({ name: "mul app.js:5:13", ticks: 1 });
    expect(s.hottest[0].share).toBeCloseTo(0.5);
  });

  it("counts deopts", () => {
    expect(parseV8Log(LOG).deopts).toBe(1);
  });

  it("lists largest code objects", () => {
    const s = parseV8Log(LOG);
    expect(s.largestCode).toHaveLength(2);
    expect(s.largestCode[0].size).toBe(256);
  });

  it("handles an empty / non-log file gracefully", () => {
    const s = parseV8Log("not a v8 log\n\n");
    expect(s).toMatchObject({ totalTicks: 0, attributedTicks: 0, deopts: 0, hottest: [], largestCode: [] });
  });
});
