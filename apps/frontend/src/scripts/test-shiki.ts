// scripts/test-shiki.ts

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHighlighter } from "shiki";

async function main() {
  // --- load grammar JSON synchronously (no top-level await) ---
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const grammarPath = resolve(
    __dirname,
    "../components/OutputsPanel/tm/v8-bytecode.tmLanguage.json",
  );
  const v8GrammarJson = JSON.parse(readFileSync(grammarPath, "utf8"));

  const highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: [], // load explicitly
  });

  await highlighter.loadLanguage(v8GrammarJson);

  // sanity check
  console.log("loaded languages:", highlighter.getLoadedLanguages());

  const sample = `
0x149a001000a0 @    0 : 13 00             LdaConstant [0]
0x149a001000a2 @    2 : d1                Star1
0x149a001000a3 @    3 : 1b fe f7          Mov <closure>, r2
0x149a001000a6 @    6 : 6e 70 01 f8 02    CallRuntime [DeclareGlobals], r1-r2
0x149a001000b7 @   23 : b7                Return
`.trim();

  const html = highlighter.codeToHtml(sample, { lang: "v8bc", theme: "github-dark" });
  console.log(html);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
