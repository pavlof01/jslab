import type { HighlighterGeneric } from "shiki";
import type { Highlighter } from "shiki/bundle/web";

import hermesbc from "@/components/OutputsPanel/tm/hermes-bytecode.tmLanguage.json";
import jscbc from "@/components/OutputsPanel/tm/jsc-bytecode.tmLanguage.json";
import smbc from "@/components/OutputsPanel/tm/spidermonkey-bytecode.tmLanguage.json";
import v8bc from "@/components/OutputsPanel/tm/v8-bytecode.tmLanguage.json";

export const THEME = "ayu-dark";

export const SOURCE_LANG = "javascript";

export const MACHINE_CODE_LANG = "actionscript-3";

let bytecodePromise: Promise<Highlighter> | null = null;
let sourcePromise: Promise<HighlighterGeneric<never, never>> | null = null;

export function getBytecodeHighlighter(): Promise<Highlighter> {
  if (!bytecodePromise) {
    bytecodePromise = (async () => {
      const { createHighlighter } = await import("shiki/bundle/web");
      const highlighter = await createHighlighter({ langs: [], themes: [THEME] });

      await Promise.all([
        highlighter.loadLanguage(v8bc),
        highlighter.loadLanguage(jscbc),
        highlighter.loadLanguage(smbc),
        highlighter.loadLanguage(hermesbc),
      ]);
      return highlighter;
    })().catch((error: unknown) => {
      bytecodePromise = null;
      throw error;
    });
  }
  return bytecodePromise;
}

export function getSourceHighlighter(): Promise<HighlighterGeneric<never, never>> {
  if (!sourcePromise) {
    sourcePromise = (async () => {
      const { createHighlighter } = await import("shiki");
      return (await createHighlighter({
        langs: [SOURCE_LANG, MACHINE_CODE_LANG],
        themes: [THEME],
      })) as unknown as HighlighterGeneric<never, never>;
    })().catch((error: unknown) => {
      sourcePromise = null;
      throw error;
    });
  }
  return sourcePromise;
}
