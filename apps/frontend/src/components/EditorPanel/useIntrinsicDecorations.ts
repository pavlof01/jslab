import type * as Monaco from "monaco-editor";
import { type RefObject, useEffect, useRef } from "react";

type EditorRef = RefObject<Monaco.editor.IStandaloneCodeEditor | null>;

export function useIntrinsicDecorations(editorRef: EditorRef, code: string, ready: boolean): void {
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!ready || !editor) return;
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
  }, [editorRef, code, ready]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!ready || !editor) return;
    return () => {
      if (decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, [editorRef, ready]);
}
