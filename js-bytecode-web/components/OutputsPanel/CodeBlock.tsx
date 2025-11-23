"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { BundledLanguage } from "shiki/bundle/web";
import type { Highlighter, TokensResult } from "shiki";
import { createHighlighter } from "shiki";

import v8bc from "./v8-bytecode.tmLanguage.json";
import DefaultEmptyCodeBlockState from "./components/DefaultEmptyCodeBlockState";
import { EngineKey } from "@/lib/types";
import CodeDisplay from "./components/Code";
import { compareOutputs } from "@/utils/diff-bytecode";

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
  EmptyCodeBlockState?: () => JSX.Element;
}

export function HighlightedCode({
  out = "",
  prev = "",
  showDiff = true,
  EmptyCodeBlockState = DefaultEmptyCodeBlockState,
}: Props) {
  const [tokens, setTokens] = useState<TokensResult>();

  useEffect(() => {
    void highlight(out, "v8bc", showDiff ? prev : "").then((node) => {
      console.log(node);
      setTokens(node);
    });
  }, [out, prev, showDiff]);

  if (!tokens || tokens.tokens.length === 0) return <EmptyCodeBlockState />;

  return <CodeDisplay {...tokens} />;
}

/** ── (Optional) Opcode glossary for future popovers ───────────── */
const OPCODE_INFO: Record<string, string> = {
  LdaZero: "Load accumulator with 0",
  LdaUndefined: "Load accumulator with undefined",
  LdaTrue: "Load accumulator with true",
  LdaFalse: "Load accumulator with false",
  LdaSmi: "Load small integer (Smi) into accumulator",
  LdaConstant: "Load constant pool entry into accumulator",
  LdaGlobal: "Load global property into accumulator",
  Ldar: "Load register into accumulator",
  Star0: "Store accumulator into r0",
  Star1: "Store accumulator into r1",
  Star2: "Store accumulator into r2",
  Star3: "Store accumulator into r3",
  Star4: "Store accumulator into r4",
  Star5: "Store accumulator into r5",
  Star6: "Store accumulator into r6",
  Star7: "Store accumulator into r7",
  Mov: "Move value between registers",
  Add: "Add: acc = x + y",
  Dec: "Decrement (feedback slot indexed)",
  GetNamedProperty: "acc = receiver[name]",
  StaInArrayLiteral: "Store into array literal element",
  CallRuntime: "Call V8 runtime function",
  CallProperty0: "Call property with 0 args",
  CallProperty1: "Call property with 1 arg",
  CallUndefinedReceiver1: "Call with undefined receiver, 1 arg",
  CreateArrayLiteral: "Create array literal",
  CreateArrayFromIterable: "Create array from iterable",
  GetIterator: "Get iterator from value",
  InvokeIntrinsic: "Call V8 intrinsic (internal op)",
  SwitchOnGeneratorState: "Jump based on generator state",
  SuspendGenerator: "Suspend current generator",
  ResumeGenerator: "Resume generator",
  Jump: "Unconditional jump",
  JumpLoop: "Backward jump for loops",
  JumpIfTrue: "Conditional jump if true",
  JumpIfFalse: "Conditional jump if false",
  JumpIfToBooleanTrue: "Jump if ToBoolean(acc) is true",
  JumpIfUndefinedOrNull: "Jump if value is undefined or null",
  TestGreaterThan: "Compare: acc > const?",
  TestReferenceEqual: "Reference equality compare",
  Throw: "Throw exception",
  ReThrow: "Re-throw pending exception",
  Return: "Return from function",
  SetPendingMessage: "Set pending message (exception detail)",
  ToNumeric: "ToNumeric conversion",
};

const TOKEN_INFO = {
  register: "Register (виртуальный регистр байткода V8: r0, r1…; a0 — аргумент)",
  range: "Диапазон регистров (например: r1–r2)",
  index: "Константа/слот/индекс (например: [0], [-1])",
  addr: "Адрес в потоке байткода (0x…)",
  offset: "Смещение инструкции (@ N :)",
  intrinsic: "Внутренняя функция V8 (intrinsic)",
};
