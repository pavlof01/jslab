export type FrontMatter = Record<string, string | string[]>;

const FENCE = /^---\n([\s\S]*?)\n---\n/;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return JSON.parse(trimmed) as string;
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

export function parseFrontMatter(source: string): { data: FrontMatter; body: string } {
  const match = source.match(FENCE);
  if (!match) return { data: {}, body: source };

  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (const line of match[1].split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, value] = pair;
    if (value.trim() === "") {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body: source.slice(match[0].length) };
}
