"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, JSX } from "react";
import type { BundledLanguage } from "shiki/bundle/web";
import type { Highlighter, ThemedToken } from "shiki";
import { createHighlighter } from "shiki";

import v8bc from "./v8-bytecode.tmLanguage.json";
import DefaultEmptyCodeBlockState from "./components/DefaultEmptyCodeBlockState";
import { compareOutputs } from "@/utils/diff-bytcode";
import { Spinner } from "@chakra-ui/react";

type CustomLanguages = "v8bc";
const THEME = "ayu-dark";

/* ── Highlighter (singleton) ───────────────────────────────────── */
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

/* ── Shiki tokens result can vary by version; normalize it ─────── */
type TokensResult = ThemedToken[][] | { tokens: ThemedToken[][]; fg?: string; bg?: string };

function unpackTokens(res: TokensResult): {
  tokens: ThemedToken[][];
  fg?: string;
  bg?: string;
} {
  if (Array.isArray(res)) return { tokens: res };
  return { tokens: res.tokens, fg: res.fg, bg: res.bg };
}

type DiffKind = "keep" | "add" | "del";

interface DiffLine {
  type: DiffKind;
  prevLine?: number;
  nextLine?: number;
  tokens: ThemedToken[];
}

const linePresentation: Record<DiffKind, { prefix: string; background: string; accent: string }> = {
  keep: { prefix: " ", background: "transparent", accent: "inherit" },
  add: { prefix: "+", background: "rgba(72, 187, 120, 0.12)", accent: "#68d391" },
  del: { prefix: "-", background: "rgba(245, 101, 101, 0.12)", accent: "#fc8181" },
};

const normalizeForDiff = (line: string) =>
  line
    .replace(/\b0x[0-9a-fA-F]+\b/g, "0x____") // addresses
    .replace(/(@\s*)\d+/g, "$1<OFF>") // offsets like " @    17"
    .replace(/\s+/g, " "); // collapse whitespace runs

export async function highlight(code: string, lang: BundledLanguage | CustomLanguages, prevCode?: string) {
  const highlighter = await getHighlighter();
  const shikiLang = lang as unknown as BundledLanguage; // allow custom tmLanguage id

  const currentRaw = await highlighter.codeToTokens(code, { lang: shikiLang, theme: THEME });
  const { tokens: currentTokens, fg, bg } = unpackTokens(currentRaw);

  const isEmptyOutput = !code || code.trim().length === 0;
  const isPlaceholderOutput = /^\(no [^)]+\)$/i.test(code.trim());

  if (isEmptyOutput) {
    return <Spinner size="lg" />;
  }

  if (!prevCode || isPlaceholderOutput) {
    return (
      <CodeDisplay
        rows={currentTokens.map((tokens) => ({
          kind: "plain" as const,
          tokens,
        }))}
        fg={fg}
        bg={bg}
      />
    );
  }

  const prevRaw = await highlighter.codeToTokens(prevCode, { lang: shikiLang, theme: THEME });
  const { tokens: prevTokens } = unpackTokens(prevRaw);

  // External, non-destructive diff on the raw text
  const diff = compareOutputs(prevCode, code, { normalizeLine: normalizeForDiff });

  const diffLines: DiffLine[] = diff.changes.map((change) => {
    if (change.type === "keep") {
      return {
        type: "keep",
        prevLine: change.prevLine,
        nextLine: change.nextLine,
        tokens: currentTokens[(change.nextLine ?? 1) - 1] ?? [],
      };
    }
    if (change.type === "add") {
      return {
        type: "add",
        nextLine: change.nextLine,
        tokens: currentTokens[(change.nextLine ?? 1) - 1] ?? [],
      };
    }
    // del
    return {
      type: "del",
      prevLine: change.prevLine,
      tokens: prevTokens[(change.prevLine ?? 1) - 1] ?? [],
    };
  });

  return (
    <CodeDisplay
      rows={diffLines.map((line) => ({
        kind: "diff" as const,
        line,
      }))}
      fg={fg}
      bg={bg}
    />
  );
}

/* ── Unified renderer ──────────────────────────────────────────── */
type CodeDisplayRow = { kind: "plain"; tokens: ThemedToken[] } | { kind: "diff"; line: DiffLine };

interface CodeDisplayProps {
  rows: CodeDisplayRow[];
  fg?: string;
  bg?: string;
}

function CodeDisplay({ rows, fg, bg }: CodeDisplayProps) {
  return (
    <pre
      style={{
        margin: 0,
        padding: 16,
        overflowX: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: "0.85rem",
        lineHeight: 1.6,
        color: fg ?? "inherit",
        background: bg ?? "transparent",
      }}
    >
      {rows.map((row, idx) =>
        row.kind === "plain" ? (
          <PlainCodeRow key={`plain-${idx}`} tokens={row.tokens} />
        ) : (
          <DiffCodeLine
            key={`${row.line.type}-${row.line.prevLine ?? "x"}-${row.line.nextLine ?? "y"}-${idx}`}
            line={row.line}
          />
        )
      )}
    </pre>
  );
}

interface PlainCodeRowProps {
  tokens: ThemedToken[];
}

function PlainCodeRow({ tokens }: PlainCodeRowProps) {
  return (
    <span style={{ whiteSpace: "pre", display: "inline-block", minHeight: "1.65em" }}>
      {tokens.length ? tokens.map((token, index) => <TokenSpan key={index} token={token} />) : <span>&nbsp;</span>}
    </span>
  );
}

interface DiffCodeLineProps {
  line: DiffLine;
}

function DiffCodeLine({ line }: DiffCodeLineProps) {
  const meta = linePresentation[line.type];
  const prevLine = line.type === "add" ? "" : line.prevLine ?? "";
  const nextLine = line.type === "del" ? "" : line.nextLine ?? "";
  const showMergedNumber = prevLine !== "" && nextLine !== "" && String(prevLine) === String(nextLine);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "4ch 4ch 1.5ch minmax(0, 1fr)",
        alignItems: "stretch",
        paddingInline: 8,
        borderRadius: 4,
        backgroundColor: meta.background,
        minHeight: "1.65em",
      }}
    >
      <LineNumber value={nextLine} color={line.type === "del" ? meta.accent : undefined} />
      {/* <LineNumber value={showMergedNumber ? "" : nextLine} color={line.type === "add" ? meta.accent : undefined} /> */}
      <span
        style={{
          color: meta.accent,
          fontWeight: "bold",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {meta.prefix}
      </span>
      <span style={{ whiteSpace: "pre", display: "inline-block", minHeight: "1.65em" }}>
        {line.tokens.length ? (
          line.tokens.map((token, index) => <TokenSpan key={index} token={token} />)
        ) : (
          <span>&nbsp;</span>
        )}
      </span>
    </div>
  );
}

/* ── Tiny atoms ────────────────────────────────────────────────── */
interface LineNumberProps {
  value: number | string;
  color?: string;
}
function LineNumber({ value, color }: LineNumberProps) {
  return (
    <span
      style={{
        textAlign: "right",
        paddingInlineEnd: 8,
        opacity: 0.6,
        color,
        userSelect: "none",
      }}
    >
      {value}
    </span>
  );
}

interface TokenSpanProps {
  token: ThemedToken;
}
function TokenSpan({ token }: TokenSpanProps) {
  const style: CSSProperties = {
    color: token.color ?? "inherit",
    whiteSpace: "pre",
  };
  if (token.fontStyle) {
    if (token.fontStyle & 1) style.fontStyle = "italic";
    if (token.fontStyle & 2) style.fontWeight = "bold";
    if (token.fontStyle & 4) style.textDecoration = "underline";
  }
  return <span style={style}>{token.content || "\u00A0"}</span>;
}

/* ── Public component: async highlight + render ────────────────── */
interface Props {
  out?: string;
  prev?: string;
  EmptyCodeBlockState?: () => JSX.Element;
}

export function HighlightedCode({ out = "", prev, EmptyCodeBlockState = DefaultEmptyCodeBlockState }: Props) {
  const [parsedOut, setParsedOut] = useState<JSX.Element>();

  useEffect(() => {
    if (out || prev) {
      void highlight(out, "v8bc", prev).then(setParsedOut);
    } else {
      setParsedOut(undefined);
    }
  }, [out, prev]);

  return parsedOut ?? <EmptyCodeBlockState />;
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
