"use client";

import { Box } from "@chakra-ui/react";
import { useCallback } from "react";

import EditorPanel from "@/components/EditorPanel";
import { useCode, useSetCode } from "@/store/engineOutputsSelectors";

import * as styles from "./playground.styles";
import { useRunAndRecord } from "./useRunAndRecord";

const PlaygroundEditor: React.FC = () => {
  const code = useCode();
  const setCode = useSetCode();
  const run = useRunAndRecord();
  const onCodeChange = useCallback((value?: string) => setCode(value ?? ""), [setCode]);

  return (
    <Box css={styles.editorPane}>
      <Box css={styles.editorHost}>
        <EditorPanel code={code} onCodeChange={onCodeChange} onRun={run} />
      </Box>
    </Box>
  );
};

export default PlaygroundEditor;
