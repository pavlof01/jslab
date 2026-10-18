import type * as Monaco from "monaco-editor";

import { completableIntrinsics, V8_NATIVES_FLAG } from "@/lib/v8Intrinsics";

type MonacoApi = typeof Monaco;

export function registerIntrinsicCompletions(monaco: MonacoApi): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider("javascript", {
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
      const range = new monaco.Range(
        position.lineNumber,
        startColumn,
        position.lineNumber,
        word.endColumn,
      );

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
}
