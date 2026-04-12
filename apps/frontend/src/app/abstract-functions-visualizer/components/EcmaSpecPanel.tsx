"use client";

import * as React from "react";
import type { TraceStep } from "@/app/abstract-functions-visualizer/spec-runner";
import s from "./EcmaSpecPanel.module.css";

// ── Active step detection ────────────────────────────────────────────────────

function extractStepId(hint: string | undefined): string | null {
  if (!hint) return null;
  const m = hint.match(/^Step (\d+(?:[a-z](?:-[a-zA-Z0-9]+)?)?)/i);
  return m ? m[1] : null;
}

function getActiveSteps(trace: TraceStep[], idx: number): Map<string, string[]> {
  // Collect the most recent step per algoId up to idx, then also include
  // every step from the current frame stack so all active algorithms are highlighted.
  const result = new Map<string, string[]>();
  for (let i = 0; i <= idx; i++) {
    const step = trace[i];
    if (!step || step.kind === "call") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = step as any;
    const stepId = extractStepId(s.hint);
    if (s.algoId && stepId) {
      const existing = result.get(s.algoId as string);
      if (existing) {
        // Keep only the latest step per algo (replace last entry)
        existing[existing.length - 1] = stepId;
      } else {
        result.set(s.algoId as string, [stepId]);
      }
    }
  }
  return result;
}

// ── Main panel ───────────────────────────────────────────────────────────────

type Props = {
  trace: TraceStep[];
  selectedIndex: number;
  specHtml: string;
};

export const EcmaSpecPanel: React.FC<Props> = ({ trace, selectedIndex, specHtml }) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const specRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = specRef.current;
    if (!container) return;

    // Remove previous highlights
    container.querySelectorAll(`.${s.stepActive}`).forEach((el) => el.classList.remove(s.stepActive));
    container.querySelectorAll(`.${s.clauseActive}`).forEach((el) => el.classList.remove(s.clauseActive));

    const active = getActiveSteps(trace, selectedIndex);
    let lastStepEl: Element | null = null;

    for (const [algoId, stepIds] of active.entries()) {
      // Highlight clause title
      const clauseEl = container.querySelector(`#${algoId}`);
      clauseEl?.classList.add(s.clauseActive);
      // Highlight the latest active step for this algo (last in array)
      const stepId = stepIds[stepIds.length - 1];
      const stepEl = container.querySelector(`#${algoId}-step-${stepId}`);
      if (stepEl) {
        stepEl.classList.add(s.stepActive);
        // Only scroll to the current algo's step (top of call stack = last visited)
        const currentAlgoId = (() => {
          for (let i = selectedIndex; i >= 0; i--) {
            const st = trace[i];
            if (!st || st.kind === "call") continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (st as any).algoId as string | undefined;
          }
          return undefined;
        })();
        if (algoId === currentAlgoId) lastStepEl = stepEl;
      }
    }

    // Scroll so the active step is vertically centered in the panel
    if (lastStepEl && panelRef.current) {
      const panel = panelRef.current;
      const elTop = (lastStepEl as HTMLElement).offsetTop;
      const elHeight = (lastStepEl as HTMLElement).offsetHeight;
      const target = elTop - panel.clientHeight / 2 + elHeight / 2;
      panel.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [trace, selectedIndex]);

  return (
    <div ref={panelRef} className={s.panel}>
      <div
        ref={specRef}
        // ecmarkup-generated HTML: emu-clause, emu-alg, var, emu-val, emu-xref etc.
        dangerouslySetInnerHTML={{ __html: specHtml }}
      />
    </div>
  );
};
