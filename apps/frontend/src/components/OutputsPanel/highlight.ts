import type { BundledLanguage, Highlighter } from "shiki/bundle/web";

import type { BytecodeLang } from "@/lib/engines";
import { getBytecodeHighlighter, getSourceHighlighter, THEME } from "@/lib/shiki";
import { compareOutputs, fillBlankRows } from "@/utils/diff-bytecode";

const normalizeForDiff = (line: string) =>
  line
    .replace(/\b0x[0-9a-fA-F]+\b/g, "0x____")
    .replace(/(@\s*)\d+/g, "$1<OFF>")
    .replace(/\[\s*\d+\s*\]/g, "[<OFF>]")
    .replace(/^(\s*)\d{5}:(?=\s)/, "$1<ADDR>:")
    .replace(/^(\s*)\d+:(?=\s+[A-Za-z_])/, "$1<OFF>:")
    .replace(/\s+/g, " ");

export const loadSourceHighlighter = async () =>
  (await getSourceHighlighter()) as unknown as Highlighter;

export async function highlight(
  code: string,
  lang: BundledLanguage | BytecodeLang,
  prevCode?: string,
  loadHighlighter: () => Promise<Highlighter> = getBytecodeHighlighter,
) {
  const highlighter = await loadHighlighter();
  const shikiLang = lang as BundledLanguage;

  const currentRaw = fillBlankRows(
    await highlighter.codeToTokens(code, { lang: shikiLang, theme: THEME }),
    code,
  );

  if (!prevCode) {
    return { tokens: currentRaw, highlighter };
  }

  const prevRaw = fillBlankRows(
    await highlighter.codeToTokens(prevCode, { lang: shikiLang, theme: THEME }),
    prevCode,
  );

  const diffTokens = compareOutputs(prevRaw, currentRaw, { normalizeLine: normalizeForDiff });

  return { tokens: diffTokens, highlighter };
}
