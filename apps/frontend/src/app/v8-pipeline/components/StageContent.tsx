"use client";

import { Box, Text } from "@chakra-ui/react";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import CodeBlockShiki from "@/components/OutputsPanel/CodeBlockShiki";
import DefaultEmptyCodeBlockState from "@/components/OutputsPanel/components/DefaultEmptyCodeBlockState";
import { EngineKey } from "@/lib/types";

import type { Stage } from "../lib/stages";
import type { Token } from "../lib/tokenize";
import type { StageOutput } from "../lib/usePipelineRun";
import DeoptView from "./DeoptView";
import TokensPane from "./TokensPane";

export function StageContent({
  stage,
  output,
  tokens,
  hasRun,
}: {
  stage: Stage;
  output?: StageOutput;
  tokens: Token[];
  hasRun: boolean;
}) {
  return (
    <>
      {stage.hint ? <StageHint>{stage.hint}</StageHint> : null}
      {output ? <StageError output={output} /> : null}
      <StageBody stage={stage} output={output} tokens={tokens} hasRun={hasRun} />
    </>
  );
}

function StageBody({
  stage,
  output,
  tokens,
  hasRun,
}: {
  stage: Stage;
  output?: StageOutput;
  tokens: Token[];
  hasRun: boolean;
}) {
  if (stage.view === "tokens") {
    if (!hasRun) return <DefaultEmptyCodeBlockState />;
    return <TokensPane tokens={tokens} />;
  }

  if (stage.view === "deoptEvents") {
    return <DeoptView output={`${output?.stdout ?? ""}\n${output?.stderr ?? ""}`} />;
  }

  if (stage.view === "machineCode") {
    return <CodeBlockShiki code={output?.stdout ?? ""} />;
  }

  return <HighlightedCode engineKey={EngineKey.v8} out={output?.stdout} showDiff={false} />;
}

function StageHint({ children }: { children: React.ReactNode }) {
  return (
    <Box bg="surface.accentSoft" py={2} px={4}>
      <Text fontSize="xs" color="ink.2">
        <Text as="span" color="accent" fontWeight="700">
          Tip:{" "}
        </Text>
        {children}
      </Text>
    </Box>
  );
}

function StageError({ output }: { output: StageOutput }) {
  if (!output.stderr || output.stdout) return null;

  return (
    <Box
      textStyle="code"
      role="alert"
      mx={4}
      my={2}
      px={3}
      py={2}
      bg="status.errorSoft"
      border="1px solid"
      borderColor="status.errorRule"
      rounded="md"
      color="status.error"
      whiteSpace="pre-wrap"
    >
      {output.stderr}
    </Box>
  );
}
