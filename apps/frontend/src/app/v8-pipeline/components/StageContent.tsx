"use client";

import { Box, Text } from "@chakra-ui/react";

import { HighlightedCode } from "@/components/OutputsPanel/CodeBlock";
import DefaultEmptyCodeBlockState from "@/components/OutputsPanel/components/DefaultEmptyCodeBlockState";
import { Callout } from "@/components/ui";
import { MACHINE_CODE_LANG } from "@/lib/shiki";
import { EngineKey } from "@/lib/types";

import type { Stage } from "../lib/stages";
import type { Token } from "../lib/tokenize";
import type { StageOutput } from "../lib/usePipelineRun";
import DeoptView from "./DeoptView";
import TokensPane from "./TokensPane";

type StageContentProps = {
  stage: Stage;
  output?: StageOutput;
  tokens: Token[];
  hasRun: boolean;
  source?: string;
};

const StageContent: React.FC<StageContentProps> = ({ stage, output, tokens, hasRun, source }) => {
  return (
    <>
      {stage.hint ? <StageHint>{stage.hint}</StageHint> : null}
      {output ? <StageError output={output} /> : null}
      <StageBody stage={stage} output={output} tokens={tokens} hasRun={hasRun} source={source} />
    </>
  );
};

type StageBodyProps = StageContentProps;

const StageBody: React.FC<StageBodyProps> = ({ stage, output, tokens, hasRun, source }) => {
  if (stage.view === "tokens") {
    if (!hasRun) return <DefaultEmptyCodeBlockState />;
    return <TokensPane tokens={tokens} />;
  }

  if (stage.view === "deoptEvents") {
    return (
      <DeoptView output={`${output?.stdout ?? ""}\n${output?.stderr ?? ""}`} source={source} />
    );
  }

  if (stage.view === "machineCode") {
    return (
      <HighlightedCode
        engineKey={EngineKey.v8}
        language={MACHINE_CODE_LANG}
        out={output?.stdout}
        source={source}
        showDiff={false}
      />
    );
  }

  return (
    <HighlightedCode
      engineKey={EngineKey.v8}
      out={output?.stdout}
      source={source}
      showDiff={false}
    />
  );
};

type StageHintProps = { children: React.ReactNode };

const StageHint: React.FC<StageHintProps> = ({ children }) => {
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
};

type StageErrorProps = { output: StageOutput };

const StageError: React.FC<StageErrorProps> = ({ output }) => {
  if (!output.stderr || output.stdout) return null;

  return (
    <Callout
      typeface="code"
      mx={4}
      my={2}
      px={3}
      border="1px solid"
      rounded="md"
      whiteSpace="pre-wrap"
    >
      {output.stderr}
    </Callout>
  );
};

export default StageContent;
