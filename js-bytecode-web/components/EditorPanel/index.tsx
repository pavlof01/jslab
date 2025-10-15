"use client";

import Editor from "@monaco-editor/react";
import { Box } from "@chakra-ui/react";
import { useColorModeValue } from "../ui/color-mode";

interface EditorPanelProps {
  code: string;
  onCodeChange: (value?: string) => void;
  onEditorMount: (editor: any, monaco: any) => void;
}

export function EditorPanel({ code, onCodeChange, onEditorMount }: EditorPanelProps) {
  return (
    <Box flex="1" minH={0} borderTop="1px solid" borderColor={useColorModeValue("#e2e8f0", "#334155")}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        theme="vs-dark"
        onChange={onCodeChange}
        onMount={onEditorMount}
        options={{ minimap: { enabled: false }, fontSize: 14 }}
      />
    </Box>
  );
}
