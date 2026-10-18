"use client";

import { Flex } from "@chakra-ui/react";
import { useCallback } from "react";

import EditorPanel from "@/components/EditorPanel";

import { usePipeline } from "../lib/pipelineContext";

const PipelineEditor: React.FC = () => {
  const { code, setCode, analyze } = usePipeline();
  const onCodeChange = useCallback((value?: string) => setCode(value ?? ""), [setCode]);

  return (
    <Flex h="100%" bg="surface.band" overflow="hidden">
      <EditorPanel code={code} onCodeChange={onCodeChange} onRun={analyze} />
    </Flex>
  );
};

export default PipelineEditor;
