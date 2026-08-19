import type { Trace } from "../../landing-data";

const STEP_MS = 440;
const VERDICT_MS = 320;
const FADE_MS = 240;
const HOLD_MS = 5000;

export const revealMs = (trace: Trace) => trace.steps.length * STEP_MS + VERDICT_MS;

export type Cycle = {
  totalMs: number;
  startMs: number[];
  slotMs: number[];
};

export function planCycle(traces: Trace[]): Cycle {
  const slotMs = traces.map((trace) => revealMs(trace) + HOLD_MS);
  const startMs = slotMs.map((_, index) => slotMs.slice(0, index).reduce((sum, ms) => sum + ms, 0));

  return { totalMs: slotMs.reduce((sum, ms) => sum + ms, 0), startMs, slotMs };
}

export const blockName = (trace: number) => `jslTraceBlock${trace}`;
export const stepName = (trace: number, step: number) => `jslTraceStep${trace}_${step}`;
export const cursorName = (trace: number, step: number) => `jslTraceCursor${trace}_${step}`;
export const verdictName = (trace: number) => `jslTraceVerdict${trace}`;
export const tabName = (trace: number) => `jslTraceTab${trace}`;

const EPSILON = 0.001;

type Stop = [percent: number, declarations: string];

function keyframes(name: string, stops: Stop[]): string {
  const seen = new Map<string, string>();
  for (const [percent, declarations] of stops) {
    const key = Math.min(100, Math.max(0, percent)).toFixed(4);
    seen.set(key, declarations);
  }
  const body = [...seen.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([percent, declarations]) => `${percent}%{${declarations}}`)
    .join("");

  return `@keyframes ${name}{${body}}`;
}

function litForTurn(
  startMs: number,
  litAtMs: number,
  endMs: number,
  totalMs: number,
  off: string,
  on: string,
  fadeMs: number,
): Stop[] {
  const at = (ms: number) => (ms / totalMs) * 100;

  return [
    [0, off],
    [at(litAtMs), off],
    [at(litAtMs + fadeMs), on],
    [at(endMs) - EPSILON, on],
    [at(endMs), off],
    [100, off],
    ...(startMs === 0 ? [] : ([[at(startMs) - EPSILON, off]] as Stop[])),
  ];
}

export function cycleStylesheet(traces: Trace[]): string {
  const { totalMs, startMs, slotMs } = planCycle(traces);
  const at = (ms: number) => (ms / totalMs) * 100;
  const rules: string[] = [];

  traces.forEach((trace, index) => {
    const start = startMs[index];
    const end = start + slotMs[index];
    const verdictAt = start + trace.steps.length * STEP_MS;

    rules.push(
      keyframes(blockName(index), [
        [0, "opacity:0;visibility:hidden"],
        [at(start) - EPSILON, "opacity:0;visibility:hidden"],
        [at(start), "opacity:1;visibility:visible"],
        [at(end) - EPSILON, "opacity:1;visibility:visible"],
        [at(end), "opacity:0;visibility:hidden"],
        [100, "opacity:0;visibility:hidden"],
      ]),
    );

    trace.steps.forEach((_, step) => {
      const stepAt = start + step * STEP_MS;
      rules.push(
        keyframes(
          stepName(index, step),
          litForTurn(start, stepAt, end, totalMs, "opacity:0.14", "opacity:1", FADE_MS),
        ),
      );
      rules.push(
        keyframes(cursorName(index, step), [
          [0, "opacity:0"],
          [at(stepAt) - EPSILON, "opacity:0"],
          [at(stepAt), "opacity:1"],
          [at(stepAt + STEP_MS), "opacity:1"],
          [at(stepAt + STEP_MS) + EPSILON, "opacity:0"],
          [100, "opacity:0"],
        ]),
      );
    });

    rules.push(
      keyframes(
        verdictName(index),
        litForTurn(start, verdictAt, end, totalMs, "opacity:0", "opacity:1", VERDICT_MS),
      ),
    );

    const quiet = "color:var(--chakra-colors-ink-label);border-bottom-color:transparent";
    const loud =
      "color:var(--chakra-colors-accent);border-bottom-color:var(--chakra-colors-accent)";
    rules.push(
      keyframes(tabName(index), [
        [0, quiet],
        [at(start) - EPSILON, quiet],
        [at(start), loud],
        [at(end) - EPSILON, loud],
        [at(end), quiet],
        [100, quiet],
      ]),
    );
  });

  rules.push(
    "@media (prefers-reduced-motion:reduce){" +
      "[data-trace]{animation:none!important}" +
      '[data-trace]:not([data-trace="0"]){display:none}' +
      '[data-trace="0"]{opacity:1!important;visibility:visible!important}' +
      "[data-reveal]{animation:none!important;opacity:1!important}" +
      "[data-cursor]{animation:none!important;opacity:0!important}" +
      "[data-tab]{animation:none!important}" +
      '[data-tab="0"]{color:var(--chakra-colors-accent)!important;border-bottom-color:var(--chakra-colors-accent)!important}' +
      "}",
  );

  return rules.join("");
}
