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

function getActiveSteps(trace: TraceStep[], idx: number): Map<string, string> {
  const result = new Map<string, string>();
  for (let i = 0; i <= idx; i++) {
    const step = trace[i];
    if (!step || step.kind === "call" || step.kind === "ret") continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = step as any;
    const stepId = extractStepId(s.hint);
    if (s.algoId && stepId) result.set(s.algoId as string, stepId);
  }
  return result;
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function EcmaSpecPanel({
  trace,
  selectedIndex,
  specHtml,
}: {
  trace: TraceStep[];
  selectedIndex: number;
  specHtml: string;
}) {
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

    for (const [algoId, stepId] of active.entries()) {
      // Highlight the step <li>
      const stepEl = container.querySelector(`#${algoId}-step-${stepId}`);
      if (stepEl) {
        stepEl.classList.add(s.stepActive);
        lastStepEl = stepEl;
      }
      // Highlight the clause title
      const clauseEl = container.querySelector(`#${algoId}`);
      clauseEl?.classList.add(s.clauseActive);
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
}
