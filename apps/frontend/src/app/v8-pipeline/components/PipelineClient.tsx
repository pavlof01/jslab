"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { Box, Button, Flex, Spinner, Splitter, Status, Tabs, Text, VStack, useBreakpointValue } from "@chakra-ui/react";
import { FaLongArrowAltRight } from "react-icons/fa";
import { CiPlay1 } from "react-icons/ci";
import { EditorPanel } from "@/components/EditorPanel";
import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import { EngineKey } from "@/lib/types";
import { tokenize, type Token } from "../lib/tokenize";
import { runEngine } from "@/lib/api";
import DefaultEmptyCodeBlockState from "@/components/OutputsPanel/components/DefaultEmptyCodeBlockState";
import TokensPane from "./TokensPane";
import Hint from "./Hint";
import CodeBlockShiki from "@/components/OutputsPanel/CodeBlockShiki";

const SAMPLE = `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 400; i++) add(i, i + 1);

// uncomment to enable maglev opt
// for (let i = 0; i < 500; i++) add(i, i + 1);

// uncomment to enable sparkplug opt
// for (let i = 0; i < 10001; i++) add(i, i + 1);


// uncomment to enable force opt
// %PrepareFunctionForOptimization(add);
// %OptimizeFunctionOnNextCall(add);

// add(1, 2)`;

type ApiStageId = "ast" | "bytecode" | "sparkplug" | "maglev" | "turbofan";
export type StageId = "tokens" | ApiStageId;

interface StageData {
  loading: boolean;
  stdout: string;
  stderr: string;
}

const EMPTY_STAGE: StageData = { loading: false, stdout: "", stderr: "" };

const STAGE_META: { id: StageId; label: string; tier: string }[] = [
  { id: "tokens", label: "Tokens", tier: "Lexer" },
  { id: "ast", label: "AST", tier: "Parser" },
  { id: "bytecode", label: "Bytecode", tier: "Ignition" },
  { id: "sparkplug", label: "Sparkplug", tier: "Baseline JIT" },
  { id: "maglev", label: "Maglev", tier: "Mid-tier JIT" },
  { id: "turbofan", label: "TurboFan", tier: "Opt JIT" },
];

const API_STAGES: { id: ApiStageId; flags: string[] }[] = [
  { id: "ast", flags: ["--print-ast", "--allow-natives-syntax"] },
  { id: "bytecode", flags: ["--print-bytecode", "--allow-natives-syntax"] },
  { id: "sparkplug", flags: ["--print-code", "--allow-natives-syntax"] },
  { id: "maglev", flags: ["--print-maglev-code", "--allow-natives-syntax"] },
  { id: "turbofan", flags: ["--print-opt-code", "--allow-natives-syntax"] },
];

// V8 informational messages printed to stderr when tracing flags are active.
// They are not errors — filter them so we show the JIT hint instead.
const V8_DIAGNOSTICS = ["Concurrent maglev has been disabled for tracing."];

function stripDiagnostics(text: string): string {
  return text
    .split("\n")
    .filter((line) => !V8_DIAGNOSTICS.some((d) => line.includes(d)))
    .join("\n")
    .trim();
}

export default function PipelineClient() {
  const [code, setCode] = useState(SAMPLE);
  const [active, setActive] = useState<StageId>("tokens");
  const [hasRun, setHasRun] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stages, setStages] = useState<Record<ApiStageId, StageData>>({
    ast: EMPTY_STAGE,
    bytecode: EMPTY_STAGE,
    sparkplug: EMPTY_STAGE,
    maglev: EMPTY_STAGE,
    turbofan: EMPTY_STAGE,
  });

  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const patchStage = useCallback((id: ApiStageId, patch: Partial<StageData>) => {
    setStages((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const analyze = useCallback(async () => {
    setHasRun(true);
    setTokens(tokenize(code));

    for (const s of API_STAGES) patchStage(s.id, { loading: true, stdout: "", stderr: "" });

    await Promise.all(
      API_STAGES.map(async ({ id, flags }) => {
        const res = await runEngine(EngineKey.v8, code, { flags });
        patchStage(id, {
          loading: false,
          stdout: stripDiagnostics(res.stdout),
          stderr: stripDiagnostics(res.stderr),
        });
      }),
    );
  }, [code, patchStage]);

  const visibleTokens = useMemo(() => tokens.filter((t) => t.kind !== "Whitespace"), [tokens]);

  // Status for stage bar dots
  const stageStatus = (id: StageId): "idle" | "loading" | "ok" | "empty" | "error" => {
    if (!hasRun) return "idle";
    if (id === "tokens") return tokens.length > 0 ? "ok" : "empty";
    const d = stages[id as ApiStageId];
    if (d.loading) return "loading";
    if (stripDiagnostics(d.stderr) && !d.stdout) return "error";
    if (d.stdout) return "ok";
    return "empty";
  };

  return (
    <Flex direction="column" height="calc(100dvh - var(--header-h))">
      <Flex
        h={14}
        bg="background.100"
        borderBottom="1px solid #262626"
        px={4}
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <Text fontSize="sm" fontWeight="700" color="whiteAlpha.500" letterSpacing="0.04em">
          V8 Compilation Pipeline
        </Text>
        <Button size="sm" w={28} onClick={analyze}>
          <CiPlay1 /> Run
        </Button>
      </Flex>

      <Splitter.Root
        orientation={isMobile ? "vertical" : "horizontal"}
        panels={[
          { id: "editor", minSize: 15, collapsible: true, collapsedSize: 5 },
          { id: "pipeline", minSize: 30 },
        ]}
        defaultSize={[40, 60]}
        height="100%"
        overflow="hidden"
      >
        <Splitter.Panel id="editor">
          <Flex h="100%" bg="background.100" overflow="hidden">
            <EditorPanel code={code} onCodeChange={(v) => setCode(v ?? "")} />
          </Flex>
        </Splitter.Panel>

        <Splitter.Context>
          {(ctx) => <Splitter.ResizeTrigger id="editor:pipeline" onDoubleClick={() => ctx.resetSizes()} />}
        </Splitter.Context>

        <Splitter.Panel id="pipeline">
          <Tabs.Root
            value={active}
            onValueChange={(d) => setActive(d.value as StageId)}
            variant="plain"
            display="flex"
            flexDirection="column"
            fitted
            h="100%"
            bg="background.200"
            lazyMount
          >
            <Box borderBottom="1px solid rgba(255,255,255,0.06)" px={4} py={3} flexShrink={0} overflowX="auto">
              <Tabs.List bg="surface.200" rounded="2xl" p={1} gap={0} minW="max-content">
                {STAGE_META.map((s, idx) => {
                  const status = stageStatus(s.id);
                  return (
                    <Fragment key={s.id}>
                      <Tabs.Trigger value={s.id} _selected={{ color: "brand.300" }} h="auto" px={3}>
                        <VStack>
                          <Status.Root>
                            {status === "loading" && <Spinner size="xs" color="brand.300" />}
                            {status === "ok" && <Status.Indicator bg="green.400" />}
                            {status === "error" && <Status.Indicator bg="red.400" />}
                          </Status.Root>
                          <Text fontSize="sm" fontWeight="700">
                            {s.label}
                          </Text>
                          <Text fontSize="10px" color="whiteAlpha.300">
                            {s.tier}
                          </Text>
                        </VStack>
                      </Tabs.Trigger>
                      {idx < STAGE_META.length - 1 && (
                        <Flex align="center" px={2}>
                          <FaLongArrowAltRight />
                        </Flex>
                      )}
                    </Fragment>
                  );
                })}
                <Tabs.Indicator bg="brand.800" borderWidth="1px" borderColor="brand.500" rounded="lg" />
              </Tabs.List>
            </Box>

            <Tabs.Content value="tokens" overflow="auto" display="flex" flex="1" flexDirection="column" pt={0}>
              <Hint stageId="tokens" />
              {hasRun ? <TokensPane tokens={visibleTokens} /> : <DefaultEmptyCodeBlockState />}
            </Tabs.Content>

            <Tabs.Content value="ast" overflow="auto" display="flex" flex="1">
              <HighlightedCode engineKey={EngineKey.v8} out={stages.ast.stdout} showDiff={false} />
            </Tabs.Content>

            <Tabs.Content value="bytecode" overflow="auto" display="flex" flex="1">
              <HighlightedCode engineKey={EngineKey.v8} out={stages.bytecode.stdout} showDiff={false} />
            </Tabs.Content>

            <Tabs.Content value="sparkplug" overflow="auto" flexDirection="column" display="flex" flex="1" pt={0}>
              <Hint stageId="sparkplug" />
              <CodeBlockShiki code={stages.sparkplug.stdout} />
            </Tabs.Content>

            <Tabs.Content value="maglev" overflow="auto" flexDirection="column" display="flex" flex="1" pt={0}>
              <Hint stageId="maglev" />
              <CodeBlockShiki code={stages.maglev.stdout} />
            </Tabs.Content>

            <Tabs.Content value="turbofan" overflow="auto" flexDirection="column" display="flex" flex="1" pt={0}>
              <Hint stageId="turbofan" />
              <CodeBlockShiki code={stages.turbofan.stdout} />
            </Tabs.Content>
          </Tabs.Root>
        </Splitter.Panel>
      </Splitter.Root>
    </Flex>
  );
}
