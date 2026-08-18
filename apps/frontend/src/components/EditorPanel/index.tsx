"use client";

import dynamic from "next/dynamic";
import { Box, Skeleton } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type * as Monaco from "monaco-editor";

import { completableIntrinsics, V8_NATIVES_FLAG } from "@/lib/v8Intrinsics";
import { EDITOR_OPTIONS, JSL_THEME } from "./monacoConfig";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type JavascriptDefaults = {
  setDiagnosticsOptions(options: {
    noSemanticValidation?: boolean;
    noSyntaxValidation?: boolean;
    diagnosticCodesToIgnore?: number[];
  }): void;
};

const javascriptDefaults = (languages: typeof Monaco.languages): JavascriptDefaults =>
  (languages as unknown as { typescript: { javascriptDefaults: JavascriptDefaults } }).typescript.javascriptDefaults;

interface EditorPanelProps {
  code: string;
  onCodeChange: (value?: string) => void;
  onRun?: () => void;
}

export function EditorPanel({ code, onCodeChange, onRun }: EditorPanelProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const completionRef = useRef<Monaco.IDisposable | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Monaco commands are registered once on mount and capture their closure, so
  // read the handler through a ref to avoid firing a stale run.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => () => completionRef.current?.dispose(), []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches("%[A-Za-z_][A-Za-z0-9_]*", false, true, false, null, true);
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      matches.map((match) => ({
        range: match.range,
        options: { inlineClassName: "token-native-intrinsic" },
      })),
    );
  }, [code]);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, []);

  const onMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme("jsl", JSL_THEME);
    monaco.editor.setTheme("jsl");
    setIsEditorReady(true);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
    javascriptDefaults(monaco.languages).setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1109],
    });
    completionRef.current?.dispose();
    completionRef.current = monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: ["%"],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const beforeWordRange = new monaco.Range(
          position.lineNumber,
          Math.max(1, word.startColumn - 1),
          position.lineNumber,
          word.startColumn,
        );
        const beforeWord = model.getValueInRange(beforeWordRange);
        const startColumn = beforeWord === "%" ? Math.max(1, word.startColumn - 1) : word.startColumn;
        const range = new monaco.Range(position.lineNumber, startColumn, position.lineNumber, word.endColumn);

        return {
          suggestions: completableIntrinsics().map((intrinsic) => ({
            label: `%${intrinsic.name}`,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: `V8 native · ${intrinsic.description}`,
            documentation: `Requires ${V8_NATIVES_FLAG} when running d8.`,
            insertText: intrinsic.completion,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        };
      },
    });
  }, []);

  return (
    <Box flex="1" minH="20vh" position="relative" background="surface.band">
      {!isEditorReady && <Skeleton position="absolute" inset={0} borderRadius="0" pointerEvents="none" />}
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
}
