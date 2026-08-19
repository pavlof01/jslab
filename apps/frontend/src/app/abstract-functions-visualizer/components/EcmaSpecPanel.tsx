"use client";

import * as React from "react";

import type { FlatEntry } from "@/app/abstract-functions-visualizer/flatten";
import s from "./EcmaSpecPanel.module.css";

function extractStepId(hint: string | undefined): string | null {
  if (!hint) return null;
  const m = hint.match(/^Step (\d+(?:[a-z](?:-[a-zA-Z0-9]+)?)?)/i);
  return m ? m[1] : null;
}

function getActiveSteps(flatEntries: FlatEntry[], idx: number): Map<string, string> {
  const active = new Map<string, string>();
  for (let i = 0; i <= idx; i++) {
    const entry = flatEntries[i];
    if (!entry) continue;
    const stepId = extractStepId(entry.step.hint);
    if (stepId) active.set(entry.algoId, stepId);
  }
  return active;
}

const cssAttrValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

type Props = {
  flatEntries: FlatEntry[];
  selectedIndex: number;
  specHtml: string;
};

export const EcmaSpecPanel: React.FC<Props> = ({ flatEntries, selectedIndex, specHtml }) => {
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const active = React.useMemo(
    () => getActiveSteps(flatEntries, selectedIndex),
    [flatEntries, selectedIndex],
  );
  const currentAlgoId = flatEntries[selectedIndex]?.algoId;
  const currentStepId = currentAlgoId ? active.get(currentAlgoId) : undefined;

  const highlightCss = React.useMemo(() => {
    const clauses: string[] = [];
    const steps: string[] = [];
    for (const [algoId, stepId] of active) {
      clauses.push(`[id="${cssAttrValue(algoId)}"] > h1`);
      steps.push(`[id="${cssAttrValue(`${algoId}-step-${stepId}`)}"]`);
    }
    if (!steps.length) return "";
    return [
      `${clauses.join(",")}{color:var(--clause-active)}`,
      `${steps.join(",")}{background-color:var(--highlight-bg);border-radius:3px;color:#f0e68c}`,
    ].join("");
  }, [active]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !currentAlgoId || !currentStepId) return;

    const step = panel.querySelector<HTMLElement>(
      `[id="${cssAttrValue(`${currentAlgoId}-step-${currentStepId}`)}"]`,
    );
    if (!step) return;

    panel.scrollTo({
      top: step.offsetTop - panel.clientHeight / 2 + step.offsetHeight / 2,
      behavior: "smooth",
    });
  }, [currentAlgoId, currentStepId, specHtml]);

  return (
    <div ref={panelRef} className={s.panel}>
      {highlightCss ? <style>{highlightCss}</style> : null}
      <div dangerouslySetInnerHTML={{ __html: specHtml }} />
    </div>
  );
};
