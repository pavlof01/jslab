"use client";

import * as React from "react";
import type { FlatEntry } from "@/app/abstract-functions-visualizer/flatten";
import s from "./EcmaSpecPanel.module.css";

// ── Active step detection ────────────────────────────────────────────────────

function extractStepId(hint: string | undefined): string | null {
  if (!hint) return null;
  const m = hint.match(/^Step (\d+(?:[a-z](?:-[a-zA-Z0-9]+)?)?)/i);
  return m ? m[1] : null;
}

function getActiveSteps(flatEntries: FlatEntry[], idx: number): Map<string, string[]> {
  // Collect the most recent step per algoId up to idx so all active
  // algorithms (the path from root to the current frame) get highlighted.
  const result = new Map<string, string[]>();
  for (let i = 0; i <= idx; i++) {
    const entry = flatEntries[i];
    if (!entry) continue;
    const stepId = extractStepId(entry.step.hint);
    if (!stepId) continue;
    const existing = result.get(entry.algoId);
    if (existing) {
      existing[existing.length - 1] = stepId;
    } else {
      result.set(entry.algoId, [stepId]);
    }
  }
  return result;
}

// ── Main panel ───────────────────────────────────────────────────────────────

type Props = {
  flatEntries: FlatEntry[];
  selectedIndex: number;
  specHtml: string;
};

export const EcmaSpecPanel: React.FC<Props> = ({ flatEntries, selectedIndex, specHtml }) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const specRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = specRef.current;
    if (!container) return;

    container.querySelectorAll(`.${s.stepActive}`).forEach((el) => el.classList.remove(s.stepActive));
    container.querySelectorAll(`.${s.clauseActive}`).forEach((el) => el.classList.remove(s.clauseActive));

    const active = getActiveSteps(flatEntries, selectedIndex);
    const currentAlgoId = flatEntries[selectedIndex]?.algoId;
    let lastStepEl: Element | null = null;

    for (const [algoId, stepIds] of active.entries()) {
      // CSS.escape so algoIds like `Number::equal` (containing `:`) work in selectors.
      const escAlgo = CSS.escape(algoId);
      const clauseEl = container.querySelector(`#${escAlgo}`);
      clauseEl?.classList.add(s.clauseActive);
      const stepId = stepIds[stepIds.length - 1];
      const stepEl = container.querySelector(`#${escAlgo}-step-${CSS.escape(stepId)}`);
      if (stepEl) {
        stepEl.classList.add(s.stepActive);
        if (algoId === currentAlgoId) lastStepEl = stepEl;
      }
    }

    if (lastStepEl && panelRef.current) {
      const panel = panelRef.current;
      const elTop = (lastStepEl as HTMLElement).offsetTop;
      const elHeight = (lastStepEl as HTMLElement).offsetHeight;
      const target = elTop - panel.clientHeight / 2 + elHeight / 2;
      panel.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [flatEntries, selectedIndex]);

  return (
    <div ref={panelRef} className={s.panel}>
      <div ref={specRef} dangerouslySetInnerHTML={{ __html: specHtml }} />
    </div>
  );
};
