"use client";

import { Box, Skeleton } from "@chakra-ui/react";
import type * as Monaco from "monaco-editor";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";

import { MONACO_CDN_ORIGIN } from "@/lib/links";

import { registerIntrinsicCompletions } from "./completions";
import { EDITOR_OPTIONS, JSL_THEME } from "./monacoConfig";
import { useIntrinsicDecorations } from "./useIntrinsicDecorations";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type JavascriptDefaults = {
  setDiagnosticsOptions(options: {
    noSemanticValidation?: boolean;
    noSyntaxValidation?: boolean;
    diagnosticCodesToIgnore?: number[];
  }): void;
};

const javascriptDefaults = (languages: typeof Monaco.languages): JavascriptDefaults =>
  (languages as unknown as { typescript: { javascriptDefaults: JavascriptDefaults } }).typescript
    .javascriptDefaults;

type Props = {
  code: string;
  onCodeChange: (value?: string) => void;
  onRun?: () => void;
};

const EditorPanel: React.FC<Props> = ({ code, onCodeChange, onRun }) => {
  preconnect(MONACO_CDN_ORIGIN);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const completionsRef = useRef<Monaco.IDisposable[]>([]);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useIntrinsicDecorations(editorRef, code, isEditorReady);

  // Monaco commands are registered once on mount and capture their closure, so
  // read the handler through a ref to avoid firing a stale run.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(
    () => () => {
      completionsRef.current.forEach((completion) => completion.dispose());
    },
    [],
  );

  const onMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      editorRef.current = editor;
      monaco.editor.defineTheme("jsl", JSL_THEME);
      monaco.editor.setTheme("jsl");
      setIsEditorReady(true);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
      javascriptDefaults(monaco.languages).setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [1109],
      });
      completionsRef.current.forEach((completion) => completion.dispose());
      completionsRef.current = [registerIntrinsicCompletions(monaco)];
    },
    [],
  );

  return (
    <Box flex="1" minH="20vh" position="relative" background="surface.band">
      {!isEditorReady && (
        <Skeleton position="absolute" inset={0} borderRadius="0" pointerEvents="none" />
      )}
      <MonacoEditor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        theme="jsl"
        onChange={onCodeChange}
        onMount={onMount}
        options={EDITOR_OPTIONS}
      />
    </Box>
  );
};

export default EditorPanel;
