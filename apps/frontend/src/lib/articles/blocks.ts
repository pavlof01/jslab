import { Lexer, type Token, type Tokens } from "marked";

import { decodeSnapshot, type EmbedSnapshot } from "@/lib/embedState";
import { decodeShareState, type ShareState } from "@/lib/shareState";
import { getSourceHighlighter, SOURCE_LANG, THEME } from "@/lib/shiki";

type Keyed = { key: string };

export type Inline = Keyed &
  (
    | { kind: "text"; text: string }
    | { kind: "strong" | "em" | "del"; children: Inline[] }
    | { kind: "code"; text: string }
    | { kind: "link"; href: string; children: Inline[] }
    | { kind: "break" }
  );

export type CodeToken = Keyed & { content: string; color?: string };

export type CodeLine = Keyed & { tokens: CodeToken[] };

export type ListItem = Keyed & { checked: boolean | null; blocks: Block[] };

export type TableCell = Keyed & {
  align: "left" | "center" | "right" | null;
  children: Inline[];
};

export type TableRow = Keyed & { cells: TableCell[] };

export type Block = Keyed &
  (
    | { kind: "heading"; depth: number; children: Inline[] }
    | { kind: "paragraph"; children: Inline[] }
    | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
    | { kind: "table"; header: TableCell[]; rows: TableRow[] }
    | { kind: "quote"; blocks: Block[] }
    | { kind: "code"; lang: string; text: string; lines: CodeLine[] | null }
    | { kind: "rule" }
    | { kind: "snapshot"; url: string; snapshot: EmbedSnapshot }
    | { kind: "editor"; url: string; state: ShareState }
  );

const EMBED = /^https:\/\/jslab\.su\/embed\/bytecode\?([sb])=([\w-]+)$/;

const HIGHLIGHTED = new Set(["js", "javascript"]);

type Next = () => string;

/** Whether the article already has its editor: every editor drives the one run store. */
type Seen = { editor: boolean };

// The lexer hands text and code spans back HTML-escaped; the tree is rendered
// by React, which escapes on its own.
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const unescape = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);

function inlines(tokens: Token[] = [], key: Next): Inline[] {
  return tokens.flatMap((token): Inline[] => {
    switch (token.type) {
      case "text":
        return "tokens" in token && token.tokens?.length
          ? inlines(token.tokens, key)
          : [{ key: key(), kind: "text", text: unescape(token.text) }];
      case "escape":
        return [{ key: key(), kind: "text", text: unescape(token.text) }];
      case "strong":
      case "em":
      case "del":
        return [{ key: key(), kind: token.type, children: inlines(token.tokens, key) }];
      case "codespan":
        return [{ key: key(), kind: "code", text: unescape(token.text) }];
      case "link":
        return [
          { key: key(), kind: "link", href: token.href, children: inlines(token.tokens, key) },
        ];
      case "br":
        return [{ key: key(), kind: "break" }];
      default:
        return "text" in token
          ? [{ key: key(), kind: "text", text: unescape(String(token.text)) }]
          : [];
    }
  });
}

async function highlight(lang: string, text: string, key: Next): Promise<CodeLine[] | null> {
  if (!HIGHLIGHTED.has(lang)) return null;
  const highlighter = await getSourceHighlighter();
  const { tokens } = await highlighter.codeToTokens(text, {
    lang: SOURCE_LANG as never,
    theme: THEME as never,
  });
  return tokens.map((line) => ({
    key: key(),
    tokens: line.map(({ content, color }) => ({ key: key(), content, color })),
  }));
}

// Matched on the paragraph's source, not its tokens, so GFM's autolink rules
// (which trim trailing punctuation such as `_`) never decide what the URL is.
async function embed(paragraph: Tokens.Paragraph, key: Next, seen: Seen): Promise<Block | null> {
  const url = paragraph.text.trim();
  const match = url.match(EMBED);
  if (!match) return null;
  if (match[1] === "b") {
    const snapshot = await decodeSnapshot(match[2]);
    return snapshot ? { key: key(), kind: "snapshot", url, snapshot } : null;
  }
  if (seen.editor) return null;
  const state = decodeShareState(match[2]);
  if (!state) return null;
  seen.editor = true;
  return { key: key(), kind: "editor", url, state };
}

async function blocks(tokens: Token[], key: Next, seen: Seen): Promise<Block[]> {
  const out: Block[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "heading":
        out.push({
          key: key(),
          kind: "heading",
          depth: token.depth,
          children: inlines(token.tokens, key),
        });
        break;
      case "paragraph": {
        const paragraph = token as Tokens.Paragraph;
        out.push(
          (await embed(paragraph, key, seen)) ?? {
            key: key(),
            kind: "paragraph",
            children: inlines(paragraph.tokens, key),
          },
        );
        break;
      }
      case "text":
        out.push({
          key: key(),
          kind: "paragraph",
          children: inlines("tokens" in token && token.tokens ? token.tokens : [token], key),
        });
        break;
      case "list": {
        const list = token as Tokens.List;
        const items: ListItem[] = [];
        for (const item of list.items) {
          items.push({
            key: key(),
            checked: item.task ? Boolean(item.checked) : null,
            blocks: await blocks(
              item.tokens.filter((child) => child.type !== "checkbox"),
              key,
              seen,
            ),
          });
        }
        out.push({
          key: key(),
          kind: "list",
          ordered: list.ordered,
          start: typeof list.start === "number" ? list.start : 1,
          items,
        });
        break;
      }
      case "table": {
        const table = token as Tokens.Table;
        const cell = (entry: Tokens.TableCell): TableCell => ({
          key: key(),
          align: entry.align,
          children: inlines(entry.tokens, key),
        });
        out.push({
          key: key(),
          kind: "table",
          header: table.header.map(cell),
          rows: table.rows.map((row) => ({ key: key(), cells: row.map(cell) })),
        });
        break;
      }
      case "blockquote":
        out.push({
          key: key(),
          kind: "quote",
          blocks: await blocks(token.tokens ?? [], key, seen),
        });
        break;
      case "code": {
        const lang = (token.lang ?? "").trim();
        out.push({
          key: key(),
          kind: "code",
          lang,
          text: token.text,
          lines: await highlight(lang, token.text, key),
        });
        break;
      }
      case "hr":
        out.push({ key: key(), kind: "rule" });
        break;
      default:
        break;
    }
  }
  return out;
}

export async function buildBlocks(markdown: string): Promise<Block[]> {
  let counter = 0;
  const key = () => `n${(counter += 1)}`;
  return blocks(new Lexer({ gfm: true }).lex(markdown), key, { editor: false });
}
