import { describe, expect, it } from "@jest/globals";

import { encodeSnapshot } from "@/lib/embedState";
import { encodeShareState } from "@/lib/shareState";
import { EngineKey } from "@/lib/types";

import { type Block, buildBlocks } from "./blocks";

const kinds = (blocks: Block[]) => blocks.map((block) => block.kind);

describe("buildBlocks", () => {
  it("builds tables with alignment and inline formatting", async () => {
    const [table] = await buildBlocks("| A | B |\n|---|:-:|\n| `x` | **y** |");
    expect(table).toMatchObject({ kind: "table" });
    if (table.kind !== "table") throw new Error("not a table");
    expect(table.header.map((cell) => cell.align)).toEqual([null, "center"]);
    expect(table.rows[0].cells[0].children[0]).toMatchObject({ kind: "code", text: "x" });
    expect(table.rows[0].cells[1].children[0]).toMatchObject({ kind: "strong" });
  });

  it("marks task list items as checked or unchecked", async () => {
    const [list] = await buildBlocks("- [ ] open\n- [x] done\n- plain");
    if (list.kind !== "list") throw new Error("not a list");
    expect(list.items.map((item) => item.checked)).toEqual([false, true, null]);
  });

  it("highlights JavaScript blocks and leaves text blocks plain", async () => {
    const blocks = await buildBlocks(
      "```js\nconst a = 1;\nprint(a);\n```\n\n```text\nLdar a1\n```",
    );
    expect(kinds(blocks)).toEqual(["code", "code"]);
    const [js, text] = blocks;
    if (js.kind !== "code" || text.kind !== "code") throw new Error("not code");
    expect(js.lines?.map((line) => line.tokens.map((token) => token.content).join(""))).toEqual([
      "const a = 1;",
      "print(a);",
    ]);
    expect(text.lines).toBeNull();
  });

  it("turns a lone snapshot or editor URL into an embed block", async () => {
    const snapshot = await encodeSnapshot({
      code: "f()",
      engine: EngineKey.v8,
      flags: ["--print-bytecode"],
      output: "Ldar a1",
      title: "14.9.0",
    });
    const state = encodeShareState({ code: "f()", engines: [EngineKey.v8], flags: {} });
    const blocks = await buildBlocks(
      `https://jslab.su/embed/bytecode?b=${snapshot}\n\nhttps://jslab.su/embed/bytecode?s=${state}`,
    );
    expect(kinds(blocks)).toEqual(["snapshot", "editor"]);
    expect(blocks[0]).toMatchObject({ snapshot: { output: "Ldar a1", title: "14.9.0" } });
    expect(blocks[1]).toMatchObject({ state: { code: "f()" } });
  });

  it("hands text and code spans over unescaped", async () => {
    const [heading, paragraph] = await buildBlocks(
      '# A & B\n\nit\'s "q" \\& `a < b && c` **x > y**',
    );
    expect(heading).toMatchObject({ children: [{ kind: "text", text: "A & B" }] });
    expect(paragraph).toMatchObject({
      children: [
        { kind: "text", text: 'it\'s "q" ' },
        { kind: "text", text: "&" },
        { kind: "text", text: " " },
        { kind: "code", text: "a < b && c" },
        { kind: "text", text: " " },
        { kind: "strong", children: [{ kind: "text", text: "x > y" }] },
      ],
    });
  });

  it("makes only the first editor URL an editor", async () => {
    const url = (code: string) =>
      `https://jslab.su/embed/bytecode?s=${encodeShareState({ code, engines: [EngineKey.v8], flags: {} })}`;
    const blocks = await buildBlocks(`${url("a()")}\n\n${url("b()")}`);
    expect(kinds(blocks)).toEqual(["editor", "paragraph"]);
    expect(blocks[0]).toMatchObject({ state: { code: "a()" } });
  });

  it("keeps a corrupt embed URL as a plain link", async () => {
    const [block] = await buildBlocks("https://jslab.su/embed/bytecode?b=1notgzip");
    expect(block).toMatchObject({ kind: "paragraph" });
    if (block.kind !== "paragraph") throw new Error("not a paragraph");
    expect(block.children[0]).toMatchObject({ kind: "link" });
  });

  it("keeps a link inside prose as prose", async () => {
    const [block] = await buildBlocks("See https://jslab.su/embed/bytecode?b=1x for more.");
    expect(block.kind).toBe("paragraph");
  });

  it("gives every node a unique key", async () => {
    const blocks = await buildBlocks("# A\n\n- one\n- two\n\n| a |\n|---|\n| b |");
    const keys: string[] = [];
    JSON.stringify(blocks, (name, value: unknown) => {
      if (name === "key") keys.push(String(value));
      return value;
    });
    expect(new Set(keys).size).toBe(keys.length);
  });
});
