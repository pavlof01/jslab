"use client";

import { useCallback } from "react";

import EditorPanel from "@/components/EditorPanel";
import { useCode, useRunEngines, useSetCode } from "@/store/engineOutputsSelectors";

const EmbedEditor: React.FC = () => {
  const code = useCode();
  const setCode = useSetCode();
  const runEngines = useRunEngines();
  const onCodeChange = useCallback((value?: string) => setCode(value ?? ""), [setCode]);
  const run = useCallback(() => void runEngines(), [runEngines]);

  return <EditorPanel code={code} onCodeChange={onCodeChange} onRun={run} />;
};

export default EmbedEditor;
