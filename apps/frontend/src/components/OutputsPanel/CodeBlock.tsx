"use client";

import { Box, type BoxProps, Stack } from "@chakra-ui/react";
import { memo, useEffect, useState } from "react";
import type { TokensResult } from "shiki";
import type { BundledLanguage, Highlighter } from "shiki/bundle/web";

import { LogoLoader } from "@/components/ui";
import { type BytecodeLang, engineLang } from "@/lib/engines";
import { getBytecodeHighlighter, THEME } from "@/lib/shiki";
import type { EngineKey } from "@/lib/types";
import { compareOutputs } from "@/utils/diff-bytecode";

import CodeDisplay from "./components/Code";
import CopyButton from "./components/CopyButton";
import DefaultEmptyCodeBlockState, {
  type DefaultEmptyCodeBlockStateProps,
} from "./components/DefaultEmptyCodeBlockState";

const normalizeForDiff = (line: string) =>
  line
    .replace(/\b0x[0-9a-fA-F]+\b/g, "0x____")
    .replace(/(@\s*)\d+/g, "$1<OFF>")
    .replace(/\[\s*\d+\s*\]/g, "[<OFF>]")
    .replace(/^(\s*)\d{5}:(?=\s)/, "$1<ADDR>:")
    .replace(/^(\s*)\d+:(?=\s+[A-Za-z_])/, "$1<OFF>:")
    .replace(/\s+/g, " ");

export async function highlight(
  code: string,
  lang: BundledLanguage | BytecodeLang,
  prevCode?: string,
) {
  const highlighter = await getBytecodeHighlighter();
  const shikiLang = lang as BundledLanguage;

  const currentRaw = await highlighter.codeToTokens(code, { lang: shikiLang, theme: THEME });

  if (!prevCode) {
    return { tokens: currentRaw, highlighter };
  }

  const prevRaw = await highlighter.codeToTokens(prevCode, { lang: shikiLang, theme: THEME });

  const diffTokens = compareOutputs(prevRaw, currentRaw, { normalizeLine: normalizeForDiff });

  return { tokens: diffTokens, highlighter };
}

type Props = {
  engineKey: EngineKey;
  out?: string;
  prev?: string;
  showDiff?: boolean;
  isLoading?: boolean;
  EmptyCodeBlockState?: React.ComponentType<DefaultEmptyCodeBlockStateProps>;
  boxProps?: BoxProps;
};

export const HighlightedCode = memo(function HighlightedCode({
  engineKey,
  out = "",
  prev = "",
  isLoading = false,
  showDiff = true,
  EmptyCodeBlockState = DefaultEmptyCodeBlockState,
  boxProps,
}: Props) {
  const [tokens, setTokens] = useState<TokensResult>();
  const [highlighter, setHighlighter] = useState<Highlighter>();

  useEffect(() => {
    if (isLoading || !out) {
      setTokens(undefined);
      return;
    }

    const lang = engineLang(engineKey);
    let cancelled = false;
    void highlight(out, lang, showDiff ? prev : "").then((node) => {
      if (!cancelled) {
        setTokens(node.tokens);
        setHighlighter(node.highlighter);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [engineKey, out, prev, showDiff, isLoading]);

  if (isLoading) {
    return (
      <Stack
        flex={1}
        align="center"
        justify="center"
        p={6}
        aria-busy="true"
        aria-label="Running engine"
      >
        <LogoLoader size={64} />
      </Stack>
    );
  }

  if (!tokens || tokens.tokens.length === 0) return <EmptyCodeBlockState />;

  return (
    <Box flex={1} {...boxProps} bgColor={highlighter?.getTheme(THEME).bg}>
      <CopyButton out={out} />
      <CodeDisplay {...tokens} engineKey={engineKey} />
    </Box>
  );
});
