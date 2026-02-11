"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { BundledLanguage, Highlighter } from "shiki/bundle/web";
import type { TokensResult } from "shiki";
import { Box } from "@chakra-ui/react";

import hermesbc from "./hermes-bytecode.tmLanguage.json";
import jscbc from "./jsc-bytecode.tmLanguage.json";
import smbc from "./spidermonkey-bytecode.tmLanguage.json";
import v8bc from "./v8-bytecode.tmLanguage.json";
import DefaultEmptyCodeBlockState from "./components/DefaultEmptyCodeBlockState";
import { EngineKey } from "@/lib/types";
import CodeDisplay from "./components/Code";
import { compareOutputs } from "@/utils/diff-bytecode";
import CopyButton from "./components/CopyButton";

type CustomLanguages = "v8bc" | "jscbc" | "smbc" | "hermesbc";
const THEME = "ayu-dark";

const langHighlighterByEngineKey: Record<EngineKey, CustomLanguages> = {
  [EngineKey.v8]: "v8bc",
  [EngineKey.jsc]: "jscbc",
  [EngineKey.sm]: "smbc",
  [EngineKey.hermes]: "hermesbc",
};

let highlighterPromise: Promise<Highlighter> | null = null;
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import("shiki/bundle/web");
      const highlighter = await createHighlighter({
        langs: [],
        themes: [THEME],
      });
      await Promise.all([
        highlighter.loadLanguage(v8bc),
        highlighter.loadLanguage(jscbc),
        highlighter.loadLanguage(smbc),
        highlighter.loadLanguage(hermesbc),
      ]);
      return highlighter;
    })();
  }
  return highlighterPromise;
}

const normalizeForDiff = (line: string) =>
  line
    .replace(/\b0x[0-9a-fA-F]+\b/g, "0x____")
    .replace(/(@\s*)\d+/g, "$1<OFF>")
    .replace(/\[\s*\d+\s*\]/g, "[<OFF>]")
    .replace(/^(\s*)\d{5}:(?=\s)/, "$1<ADDR>:")
    .replace(/^(\s*)\d+:(?=\s+[A-Za-z_])/, "$1<OFF>:")
    .replace(/\s+/g, " ");

export async function highlight(code: string, lang: BundledLanguage | CustomLanguages, prevCode?: string) {
  const highlighter = await getHighlighter();
  const shikiLang = lang as BundledLanguage;

  const currentRaw = await highlighter.codeToTokens(code, { lang: shikiLang, theme: THEME });

  if (!prevCode) {
    return currentRaw;
  }

  const prevRaw = await highlighter.codeToTokens(prevCode, { lang: shikiLang, theme: THEME });

  const diffTokens = compareOutputs(prevRaw, currentRaw, { normalizeLine: normalizeForDiff });

  return diffTokens;
}

interface Props {
  engineKey: EngineKey;
  out?: string;
  prev?: string;
  showDiff?: boolean;
  isLoading?: boolean;
  EmptyCodeBlockState?: () => JSX.Element;
}

export function HighlightedCode({
  engineKey,
  out = "",
  prev = "",
  isLoading = false,
  showDiff = true,
  EmptyCodeBlockState = DefaultEmptyCodeBlockState,
}: Props) {
  const [tokens, setTokens] = useState<TokensResult>();

  useEffect(() => {
    if (isLoading || !out) {
      setTokens(undefined);
      return;
    }

    const lang = langHighlighterByEngineKey[engineKey];
    let cancelled = false;
    void highlight(out, lang, showDiff ? prev : "").then((node) => {
      if (!cancelled) setTokens(node);
    });

    return () => {
      cancelled = true;
    };
  }, [engineKey, out, prev, showDiff, isLoading]);

  if (!tokens || tokens.tokens.length === 0) return <EmptyCodeBlockState />;

  return (
    <Box>
      <CopyButton out={out} />
      <CodeDisplay {...tokens} engineKey={engineKey} />
    </Box>
  );
}
