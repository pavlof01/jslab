"use client";

import dynamic from "next/dynamic";
import { Box, Skeleton } from "@chakra-ui/react";
import { useColorModeValue } from "../ui/color-mode";
import { useCallback, useEffect, useRef, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const v8NativeIntrinsics = [
  {
    name: "%OptimizeFunctionOnNextCall",
    insertText: "%OptimizeFunctionOnNextCall(${1:function});",
    detail: "V8 native · Optimise function on its next invocation",
  },
  {
    name: "%PrepareFunctionForOptimization",
    insertText: "%PrepareFunctionForOptimization(${1:function});",
    detail: "V8 native · Marks function so optimisation can be triggered",
  },
  {
    name: "%GetOptimizationStatus",
    insertText: "%GetOptimizationStatus(${1:function});",
    detail: "V8 native · Returns optimisation state bits",
  },
  {
    name: "%DebugPrint",
    insertText: "%DebugPrint(${1:value});",
    detail: "V8 native · Prints internal representation of value",
  },
  {
    name: "%DebugTrace",
    insertText: "%DebugTrace();",
    detail: "V8 native · Enables tracing for following execution",
  },
  {
    name: "%DisassembleFunction",
    insertText: "%DisassembleFunction(${1:function});",
    detail: "V8 native · Dumps generated code for the function",
  },
  {
    name: "%CollectGarbage",
    insertText: "%CollectGarbage(${1:space});",
    detail: "V8 native · Runs garbage collector for provided space",
  },
];

interface EditorPanelProps {
  code: string;
  onCodeChange: (value?: string) => void;
}

export function EditorPanel({ code, onCodeChange }: EditorPanelProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const completionRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const borderColor = useColorModeValue("brand.900", "brand.900");

  useEffect(() => () => completionRef.current?.dispose?.(), []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches("%[A-Za-z_][A-Za-z0-9_]*", false, true, false, null, true);
    const decorations = matches.map((match: { range: any }) => ({
      range: match.range,
      options: { inlineClassName: "token-native-intrinsic" },
    }));
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [code]);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, []);

  const onMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [1109],
    });
    completionRef.current?.dispose?.();
    completionRef.current = monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: ["%"],
      provideCompletionItems(model: any, position: any) {
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

        const suggestions = v8NativeIntrinsics.map((intrinsic) => ({
          label: intrinsic.name,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: intrinsic.detail,
          documentation: "Requires --allow-natives-syntax when running d8.",
          insertText: intrinsic.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });
  }, []);

  return (
    <Box flex="1" minH={0} position="relative">
      {!isEditorReady && <Skeleton position="absolute" inset={0} borderRadius="md" pointerEvents="none" />}
      <MonacoEditor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        theme="vs-dark"
        onChange={onCodeChange}
        onMount={onMount}
        options={{ minimap: { enabled: false }, fontSize: 14 }}
      />
    </Box>
  );
}
