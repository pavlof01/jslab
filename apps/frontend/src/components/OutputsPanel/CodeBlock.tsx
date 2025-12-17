"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { BundledLanguage } from "shiki/bundle/web";
import type { Highlighter, TokensResult } from "shiki";
import { createHighlighter } from "shiki";
import { Box } from "@chakra-ui/react";

import v8bc from "./v8-bytecode.tmLanguage.json";
import DefaultEmptyCodeBlockState from "./components/DefaultEmptyCodeBlockState";
import { EngineKey } from "@/lib/types";
import CodeDisplay from "./components/Code";
import { compareOutputs } from "@/utils/diff-bytecode";
import CopyButton from "./components/CopyButton";

type CustomLanguages = "v8bc";
const THEME = "ayu-dark";

const langHighlighterByEngineKey: Record<EngineKey, CustomLanguages> = {
  [EngineKey.v8]: "v8bc",
  [EngineKey.jsc]: "v8bc",
  [EngineKey.sm]: "v8bc",
  [EngineKey.hermes]: "v8bc",
};

let highlighterPromise: Promise<Highlighter> | null = null;
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const highlighter = await createHighlighter({
        langs: [],
        themes: [THEME],
      });
      await highlighter.loadLanguage(v8bc);
      return highlighter;
    })();
  }
  return highlighterPromise;
}

const normalizeForDiff = (line: string) =>
  line
    .replace(/\b0x[0-9a-fA-F]+\b/g, "0x____")
    .replace(/(@\s*)\d+/g, "$1<OFF>")
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
  out?: string;
  prev?: string;
  showDiff?: boolean;
  isLoading?: boolean;
  EmptyCodeBlockState?: () => JSX.Element;
}

export function HighlightedCode({
  out = "",
  prev = "",
  isLoading = false,
  showDiff = true,
  EmptyCodeBlockState = DefaultEmptyCodeBlockState,
}: Props) {
  const [tokens, setTokens] = useState<TokensResult>();

  useEffect(() => {
    if (isLoading || !out) return;
    void highlight(out, "v8bc", showDiff ? prev : "").then((node) => {
      setTokens(node);
    });
  }, [out, prev, showDiff, isLoading]);

  if (!tokens || tokens.tokens.length === 0) return <EmptyCodeBlockState />;

  return (
    <Box>
      <CopyButton out={out} />
      <CodeDisplay {...tokens} />
    </Box>
  );
}
