"use client";

import * as React from "react";
import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import type { Algorithm, Instr, TraceStep, TraceTransition } from "@/app/coercion-visualizer/spec-runner";
import { SPEC_REFERENCE_BY_ID, type SpecReferenceLine } from "@/app/coercion-visualizer/specReference";
import { nodePathKey } from "@/app/coercion-visualizer/lib/nodePathKey";
import type { NodePath } from "@/app/coercion-visualizer/traceModel";
import { useColorModeValue } from "@/components/ui/color-mode";

type TopStepGroup = {
  topIndex: number;
  lines: SpecReferenceLine[];
};

const STOP_WORDS = new Set<string>([
  "a",
  "an",
  "and",
  "are",
  "as",
  "assert",
  "be",
  "both",
  "called",
  "containing",
  "do",
  "either",
  "else",
  "exception",
  "following",
  "for",
  "from",
  "if",
  "in",
  "is",
  "it",
  "its",
  "language",
  "let",
  "normal",
  "not",
  "of",
  "optional",
  "or",
  "performs",
  "present",
  "return",
  "returns",
  "takes",
  "than",
  "that",
  "the",
  "then",
  "throw",
  "to",
  "type",
  "value",
  "when",
  "with",
  // Catalog/IR noise.
  "samevalue",
  "typetag",
]);

function groupSpecLines(lines: SpecReferenceLine[]): TopStepGroup[] {
  if (!lines.length) return [];
  const groups: TopStepGroup[] = [];
  let current: TopStepGroup | undefined;
  let topIndex = -1;

  for (const line of lines) {
    const startsTopStep = line.indent === 0 && /^\d+\.$/.test(line.marker);
    if (!current || startsTopStep) {
      topIndex += 1;
      current = { topIndex, lines: [line] };
      groups.push(current);
    } else {
      current.lines.push(line);
    }
  }

  return groups;
}

function flattenInstrNodePaths(body: Instr[], basePath: NodePath): NodePath[] {
  const out: NodePath[] = [];
  for (let i = 0; i < body.length; i++) {
    const instr = body[i];
    const nodePath: NodePath = [...basePath, i];
    out.push(nodePath);
    if (instr.op === "if") {
      out.push(...flattenInstrNodePaths(instr.then, [...nodePath, "then"]));
      out.push(...flattenInstrNodePaths(instr.else, [...nodePath, "else"]));
    }
  }
  return out;
}

function normalizeForMatch(text: string): string {
  return text
    .replace(/\barg\b/g, "argument")
    .toLowerCase()
    .replace(/[%?.,()«»[\]{}]/g, " ")
    .replace(/["'’]/g, "")
    .replace(/[→:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetForMatch(text: string): Set<string> {
  const norm = normalizeForMatch(text);
  const out = new Set<string>();
  if (!norm) return out;
  for (const tok of norm.split(" ")) {
    if (!tok) continue;
    if (STOP_WORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

type CoercionMoment = {
  count: number;
  firstStepIndex: number;
  lastStepIndex: number;
};

function countCoercions(transitions?: TraceTransition[]): number {
  if (!transitions?.length) return 0;
  let n = 0;
  for (const t of transitions) if (t.kind === "coercion") n += 1;
  return n;
}

export function AlgorithmStepsPanel({
  algo,
  trace,
  selectedIndex,
  onSelectIndex,
  frameId,
}: {
  algo?: Algorithm;
  trace: TraceStep[];
  selectedIndex: number;
  onSelectIndex?: (next: number) => void;
  frameId?: string;
}) {
  const primary = "#f9e31a";
  const panelBg = useColorModeValue("#ffffff", "rgba(20,20,20,0.30)");
  const border = useColorModeValue("#e2e8f0", "#262626");
  const mutedText = useColorModeValue("rgba(15,23,42,0.60)", "rgba(148,163,184,0.65)");
  const stepText = useColorModeValue("rgba(30,41,59,0.78)", "rgba(148,163,184,0.90)");
  const stepTextActive = useColorModeValue("rgba(15,23,42,0.92)", "rgba(226,232,240,0.96)");
  const numberText = useColorModeValue("rgba(15,23,42,0.85)", "rgba(226,232,240,0.92)");
  const introText = useColorModeValue("rgba(30,41,59,0.70)", "rgba(226,232,240,0.70)");
  const introBorder = useColorModeValue("rgba(226,232,240,0.8)", "rgba(38,38,38,1)");

  const algoId = algo?.id;
  const doc = React.useMemo(() => (algoId ? SPEC_REFERENCE_BY_ID[algoId] : undefined), [algoId]);
  const groups = React.useMemo(() => groupSpecLines(doc?.steps ?? []), [doc?.steps]);

  const matchIndex = React.useMemo(() => {
    const groupTokens: Array<{ topIndex: number; tokens: Set<string> }> = [];
    const freq = new Map<string, number>();

    for (const g of groups) {
      const topLine = g.lines[0];
      const tokens = tokenSetForMatch(topLine?.text ?? "");
      groupTokens.push({ topIndex: g.topIndex, tokens });
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    }

    const weights = new Map<string, number>();
    for (const [t, c] of freq) weights.set(t, 1 / c);

    return { groupTokens, weights };
  }, [groups]);

  const irOrdinals = React.useMemo(() => {
    const ordByKey = new Map<string, number>();
    if (!algo) return { ordByKey, count: 0 };
    const paths = flattenInstrNodePaths(algo.body, []);
    for (let i = 0; i < paths.length; i++) ordByKey.set(nodePathKey(paths[i]), i);
    return { ordByKey, count: paths.length };
  }, [algo]);

  const matchesContext = React.useCallback(
    (s: TraceStep) => {
      if (s.kind !== "let" && s.kind !== "if" && s.kind !== "return") return false;
      if (!algoId) return false;
      if (s.algoId !== algoId) return false;
      if (frameId && typeof s.frameId === "string" && s.frameId.length > 0 && s.frameId !== frameId) return false;
      return true;
    },
    [algoId, frameId],
  );

  const resolveGroupIndexForStepByTokens = React.useCallback(
    (s: TraceStep): number | undefined => {
      if (!matchIndex.groupTokens.length) return undefined;

      const descriptor =
        s.kind === "if"
          ? `${s.hint ?? ""} ${s.condPretty ?? ""}`
          : s.kind === "let"
            ? s.hint ?? ""
            : s.kind === "return"
              ? s.hint ?? ""
              : "";

      const stepTokens = tokenSetForMatch(descriptor);
      if (!stepTokens.size) return undefined;

      let bestTopIndex: number | undefined;
      let bestScore = 0;

      for (const g of matchIndex.groupTokens) {
        let score = 0;
        for (const t of stepTokens) {
          if (!g.tokens.has(t)) continue;
          score += matchIndex.weights.get(t) ?? 1;
        }
        if (score > bestScore) {
          bestScore = score;
          bestTopIndex = g.topIndex;
        }
      }

      if (bestTopIndex === undefined || bestScore <= 0) return undefined;
      return bestTopIndex;
    },
    [matchIndex.groupTokens, matchIndex.weights],
  );

  const shouldUseOrdinalFallback = React.useMemo(() => {
    if (!groups.length) return false;
    let sawAny = false;
    for (const s of trace) {
      if (!matchesContext(s)) continue;
      sawAny = true;
      if (resolveGroupIndexForStepByTokens(s) !== undefined) return false;
    }
    return sawAny;
  }, [groups.length, matchesContext, resolveGroupIndexForStepByTokens, trace]);

  const resolveGroupIndexForStep = React.useCallback(
    (s: TraceStep): number | undefined => {
      if (groups.length && "specStep" in s && typeof s.specStep === "number") {
        const idx = s.specStep - 1;
        if (!Number.isFinite(idx)) return undefined;
        return Math.max(0, Math.min(groups.length - 1, idx));
      }

      const byTokens = resolveGroupIndexForStepByTokens(s);
      if (byTokens !== undefined) return byTokens;
      if (!shouldUseOrdinalFallback) return undefined;
      if (!("nodePath" in s)) return undefined;
      if (!groups.length) return undefined;

      const ordinal = irOrdinals.ordByKey.get(nodePathKey(s.nodePath as NodePath));
      if (ordinal === undefined) return undefined;

      const denom = Math.max(1, irOrdinals.count - 1);
      const normalized = ordinal / denom;
      const idx = Math.floor(normalized * groups.length);
      return Math.max(0, Math.min(groups.length - 1, idx));
    },
    [groups.length, irOrdinals.count, irOrdinals.ordByKey, resolveGroupIndexForStepByTokens, shouldUseOrdinalFallback],
  );

  const activeTopIndex = React.useMemo(() => {
    if (!algoId) return undefined;
    const step = trace[selectedIndex];
    if (step && matchesContext(step)) return resolveGroupIndexForStep(step);

    for (let i = Math.min(selectedIndex, trace.length - 1); i >= 0; i--) {
      const s = trace[i];
      if (!matchesContext(s)) continue;
      const idx = resolveGroupIndexForStep(s);
      if (idx !== undefined) return idx;
    }
    return undefined;
  }, [algoId, matchesContext, resolveGroupIndexForStep, selectedIndex, trace]);

  const activeRowRef = React.useRef<HTMLDivElement | null>(null);
  const activeKey = React.useMemo(() => `${algoId ?? "unknown"}:${frameId ?? "noframe"}:${activeTopIndex ?? "none"}`, [algoId, activeTopIndex, frameId]);
  React.useEffect(() => {
    const el = activeRowRef.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeKey]);

  const { execByTopIndex, firstExecByTopIndex, coercionByTopIndex } = React.useMemo(() => {
    const exec = new Map<number, number>();
    const first = new Map<number, number>();
    const coercion = new Map<number, CoercionMoment>();

    for (let i = 0; i < trace.length; i++) {
      const s = trace[i];
      if (!matchesContext(s)) continue;
      const topIndex = resolveGroupIndexForStep(s);
      if (topIndex === undefined) continue;

      if (!first.has(topIndex)) first.set(topIndex, i);

      if ((s.kind === "let" || s.kind === "return") && s.transitions?.length) {
        const count = countCoercions(s.transitions);
        if (count) {
          const prev = coercion.get(topIndex);
          if (!prev) coercion.set(topIndex, { count, firstStepIndex: i, lastStepIndex: i });
          else coercion.set(topIndex, { count: prev.count + count, firstStepIndex: prev.firstStepIndex, lastStepIndex: i });
        }
      }
    }

    const max = Math.min(selectedIndex, trace.length - 1);
    for (let i = 0; i <= max; i++) {
      const s = trace[i];
      if (!matchesContext(s)) continue;
      const topIndex = resolveGroupIndexForStep(s);
      if (topIndex === undefined) continue;
      exec.set(topIndex, i);
    }

    return { execByTopIndex: exec, firstExecByTopIndex: first, coercionByTopIndex: coercion };
  }, [matchesContext, resolveGroupIndexForStep, selectedIndex, trace]);

  if (!algo) {
    return (
      <Box
        bg={panelBg}
        borderLeftWidth="1px"
        borderColor={border}
        h="full"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        minH={0}
      >
        <Box p={4} borderBottomWidth="1px" borderBottomColor={border}>
          <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color={mutedText}>
            Algorithm Steps
          </Text>
        </Box>
        <Box p={6} overflow="auto">
          <Text fontSize="sm" opacity={0.75}>
            No active algorithm.
          </Text>
        </Box>
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box
        bg={panelBg}
        borderLeftWidth="1px"
        borderColor={border}
        h="full"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        minH={0}
      >
        <Box p={4} borderBottomWidth="1px" borderBottomColor={border} bg="rgba(0,0,0,0.10)">
          <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color={mutedText}>
            ECMA-262 / Abstract Operation
          </Text>
          <Text fontSize="sm" fontWeight="semibold" mt={1} fontFamily="mono">
            {algo.title ?? algo.id} ( {algo.params.join(", ") || " "} )
          </Text>
        </Box>
        <Box flex="1" minH={0} overflow="auto" p={6}>
          <Text fontSize="sm" opacity={0.75}>
            Spec reference text is not available for <Text as="span" fontFamily="mono">{algo.id}</Text> yet.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      bg={panelBg}
      borderLeftWidth="1px"
      borderColor={border}
      h="full"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <Box p={4} borderBottomWidth="1px" borderBottomColor={border} bg="rgba(0,0,0,0.10)">
        <Text fontSize="10px" fontWeight="black" textTransform="uppercase" letterSpacing="0.2em" color={mutedText}>
          ECMA-262 / Abstract Operation
        </Text>
        <Text fontSize="sm" fontWeight="semibold" mt={1} fontFamily="mono">
          {doc.signature}
        </Text>
      </Box>

      <Box
        flex="1"
        minH={0}
        overflowY="auto"
        p={0}
        scrollbarWidth="thin"
        css={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: "#2d2d2d", borderRadius: "10px" },
        }}
      >
        <VStack align="stretch" gap={2} p={6}>
          <Text
            fontSize="11px"
            lineHeight="1.6"
            color={introText}
            borderLeftWidth="2px"
            borderLeftColor={introBorder}
            pl={4}
            py={1}
            mb={3}
          >
            {doc.intro}
          </Text>

          {groups.length === 0 ? (
            <Text fontSize="sm" opacity={0.75}>
              No steps.
            </Text>
          ) : (
            groups.map((group) => {
              const executedAt = execByTopIndex.get(group.topIndex);
              const isDone = executedAt !== undefined && executedAt <= selectedIndex;
              const isActive = activeTopIndex !== undefined && group.topIndex === activeTopIndex;
              const firstExec = firstExecByTopIndex.get(group.topIndex);
              const isFuture = !isDone && firstExec !== undefined;
              const isNever = !isDone && firstExec === undefined;

              const coercion = coercionByTopIndex.get(group.topIndex);
              const hasCoercion = !!coercion;
              const coercionIsPast = !!coercion && coercion.firstStepIndex <= selectedIndex;

              const opacity = isActive ? 1 : isDone ? 0.92 : isFuture ? 0.35 : isNever ? 0.22 : 0.35;
              const clickable = !!onSelectIndex && executedAt !== undefined;

              const explainText = (() => {
                if (!isActive) return undefined;
                const idx = executedAt ?? firstExec;
                if (idx === undefined) return undefined;
                const s = trace[idx];
                if (!s) return undefined;
                if (s.kind === "if") return s.hint ?? s.decision.why;
                if (s.kind === "let" || s.kind === "return") return s.hint;
                return undefined;
              })();

              return (
                <Box
                  key={group.topIndex}
                  ref={(el: HTMLDivElement | null) => {
                    if (isActive) activeRowRef.current = el;
                  }}
                  px={isActive ? 4 : 3}
                  py={isActive ? 4 : 3}
                  borderRadius={isActive ? "xl" : "lg"}
                  borderWidth={isActive ? "2px" : "1px"}
                  borderColor={isActive ? "rgba(249,227,26,0.20)" : "transparent"}
                  borderLeftWidth={isActive ? "3px" : "0px"}
                  borderLeftColor={isActive ? primary : "transparent"}
                  bg={isActive ? "rgba(249,227,26,0.06)" : "transparent"}
                  opacity={opacity}
                  cursor={clickable ? "pointer" : undefined}
                  onClick={
                    clickable
                      ? () => {
                          if (executedAt !== undefined) onSelectIndex?.(executedAt);
                        }
                      : undefined
                  }
                  _hover={
                    isActive
                      ? undefined
                      : {
                          opacity: 1,
                          bg: "rgba(255,255,255,0.03)",
                        }
                  }
                  transition="opacity 140ms ease, background-color 140ms ease, border-color 140ms ease"
                >
                  <VStack align="stretch" gap={1}>
                    {group.lines.map((line, lineIdx) => {
                      const indentPx = (line.indent ?? 0) * 12;
                      const isTopLine = lineIdx === 0;
                      return (
                        <Text
                          key={`${group.topIndex}:${lineIdx}:${line.marker}`}
                          pl={indentPx}
                          fontSize="11px"
                          lineHeight="1.6"
                          color={isActive && isTopLine ? stepTextActive : stepText}
                        >
                          <Box
                            as="span"
                            display="inline-flex"
                            minW="34px"
                            justifyContent="flex-end"
                            gap={2}
                            alignItems="center"
                            mr={3}
                          >
                            {isTopLine && hasCoercion ? (
                              <Box
                                boxSize="7px"
                                borderRadius="full"
                                bg={primary}
                                opacity={coercionIsPast ? 1 : 0.35}
                                flexShrink={0}
                              />
                            ) : null}
                            <Box
                              as="span"
                              fontWeight="black"
                              fontSize={isTopLine ? "sm" : "xs"}
                              color={isActive && isTopLine ? primary : numberText}
                              fontFamily="mono"
                            >
                              {line.marker}
                            </Box>
                          </Box>
                          <Box as="span">{line.text}</Box>
                        </Text>
                      );
                    })}

                    {explainText ? (
                      <Text
                        fontSize="10px"
                        lineHeight="1.6"
                        color={introText}
                        pl={3}
                        pt={1}
                        borderLeftWidth="2px"
                        borderLeftColor="rgba(249,227,26,0.18)"
                      >
                        {explainText}
                      </Text>
                    ) : null}
                  </VStack>
                </Box>
              );
            })
          )}
        </VStack>
      </Box>
    </Box>
  );
}
