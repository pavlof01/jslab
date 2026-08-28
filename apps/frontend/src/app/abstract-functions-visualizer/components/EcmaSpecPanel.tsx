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

const frameOf = (path: string) => path.slice(0, path.lastIndexOf(".") + 1);

function getFailedSteps(flatEntries: FlatEntry[], idx: number): string[] {
  const current = flatEntries[idx];
  if (!current) return [];
  const frame = frameOf(current.path);
  const failed: string[] = [];
  for (let i = 0; i <= idx; i++) {
    const entry = flatEntries[i];
    if (entry.step.kind !== "if" || entry.step.taken !== false) continue;
    if (frameOf(entry.path) !== frame) continue;
    const stepId = extractStepId(entry.step.hint);
    if (stepId) failed.push(`${entry.algoId}-step-${stepId}`);
  }
  return failed;
}

const cssAttrValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

type Props = {
  flatEntries: FlatEntry[];
  selectedIndex: number;
  specHtml: string;
};

const EcmaSpecPanel: React.FC<Props> = ({ flatEntries, selectedIndex, specHtml }) => {
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
    let currentStep: string | null = null;
    for (const [algoId, stepId] of active) {
      clauses.push(`[id="${cssAttrValue(algoId)}"] > h1`);
      const selector = `[id="${cssAttrValue(`${algoId}-step-${stepId}`)}"]`;
      if (algoId === currentAlgoId) currentStep = selector;
      else steps.push(selector);
    }
    if (!steps.length && !currentStep) return "";
    const rules = [`${clauses.join(",")}{color:var(--clause-active)}`];
    const currentId = currentStepId ? `${currentAlgoId}-step-${currentStepId}` : null;
    const failed = getFailedSteps(flatEntries, selectedIndex)
      .filter((id) => id !== currentId)
      .map((id) => `[id="${cssAttrValue(id)}"]`);
    if (failed.length) {
      rules.push(
        `${failed.join(",")}{color:var(--fg-dim)}`,
        `${failed.map((step) => `${step}::marker`).join(",")}{color:var(--fg-gutter)}`,
      );
    }
    if (steps.length) {
      rules.push(`${steps.join(",")}{background-color:var(--highlight-bg);color:var(--fg-code)}`);
    }
    if (currentStep) {
      rules.push(
        `${currentStep}{background-color:var(--highlight-bg);box-shadow:inset 2px 0 0 var(--accent);color:var(--highlight-fg)}`,
        `${currentStep}::marker{color:var(--accent)}`,
      );
    }
    return rules.join("");
  }, [active, currentAlgoId, currentStepId, flatEntries, selectedIndex]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !currentAlgoId || !currentStepId) return;

    const step = panel.querySelector<HTMLElement>(
      `[id="${cssAttrValue(`${currentAlgoId}-step-${currentStepId}`)}"]`,
    );
    if (!step) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.scrollTo({
      top: step.offsetTop - panel.clientHeight / 2 + step.offsetHeight / 2,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [currentAlgoId, currentStepId, specHtml]);

  return (
    <div ref={panelRef} className={s.panel}>
      {highlightCss ? <style>{highlightCss}</style> : null}
      {/* eslint-disable-next-line react/no-danger -- specHtml is spec markup rendered by our own trace-service (ecmarkup over the ECMAScript spec) and fetched server-side in server-data.ts. Rendering it as markup is the point of this panel; nothing user-supplied is interpolated. */}
      <div dangerouslySetInnerHTML={{ __html: specHtml }} />
    </div>
  );
};

export default EcmaSpecPanel;
