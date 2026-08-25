import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";

import { TRACES } from "../../landing-data";
import { cycleStylesheet, planCycle, stepName, verdictName } from "./traceCycle";

const cycle = planCycle(TRACES);
const css = cycleStylesheet(TRACES);

const stopAt = (name: string, declarations: string) => {
  const body = css.match(new RegExp(`@keyframes ${name}\\{(.*?)\\}(?=@|$)`, "s"))?.[1] ?? "";
  const stop = body.match(new RegExp(`([\\d.]+)%\\{${declarations}\\}`));
  return stop ? Number(stop[1]) : null;
};

describe("the trace cycle", () => {
  it("gives every trace a turn as long as it needs, plus the hold", () => {
    TRACES.forEach((trace, index) => {
      expect(cycle.slotMs[index]).toBe(trace.steps.length * 440 + 320 + 5000);
    });

    expect(cycle.totalMs).toBe(cycle.slotMs.reduce((sum, ms) => sum + ms, 0));
  });

  it("starts each turn where the one before it ended", () => {
    expect(cycle.startMs[0]).toBe(0);
    cycle.startMs.slice(1).forEach((start, index) => {
      expect(start).toBe(cycle.startMs[index] + cycle.slotMs[index]);
    });
  });

  it("lights a step 440ms after the step before it", () => {
    const first = stopAt(stepName(0, 0), "opacity:1");
    const second = stopAt(stepName(0, 1), "opacity:1");

    expect(first).not.toBeNull();
    expect(Math.abs(((second! - first!) / 100) * cycle.totalMs - 440)).toBeLessThan(1);
  });

  it("holds the verdict until its trace's turn is over", () => {
    const lit = stopAt(verdictName(0), "opacity:1");

    expect(
      Math.abs((lit! / 100) * cycle.totalMs - (TRACES[0].steps.length * 440 + 320)),
    ).toBeLessThan(1);
  });

  it("stops the round and shows one whole trace under reduced motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
    expect(css).toContain('[data-trace]:not([data-trace="0"]){display:none}');
  });
});
