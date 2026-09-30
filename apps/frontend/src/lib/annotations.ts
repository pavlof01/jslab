import { tokenizer, tokTypes } from "acorn";

export type OutputAnnotation = {
  id: string;
  start: number;
  end: number;
  title: string;
  text: string;
};

export type AnnotationDiagnostic = { line: number; message: string };

type Rule = {
  line: number;
  match: string;
  highlight: string;
  title: string;
  text: string;
  occurrence?: number;
};

type Block = { body: string; line: number };

const FIELDS = new Set(["match", "highlight", "title", "text", "occurrence"]);

function annotationBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  if (!source.includes("@annotation")) return blocks;

  const tokens = tokenizer(source, {
    ecmaVersion: "latest",
    locations: true,
    onComment(block, comment, _start, _end, location) {
      if (!block) return;
      const directive = comment.match(/^\s*@annotation\b([^\r\n]*)([\s\S]*)$/);
      if (directive && location) {
        blocks.push({ body: `${directive[1]}${directive[2]}`, line: location.line });
      }
    },
  });
  try {
    // Reading tokens is what reports the comments; it also skips strings,
    // templates and regexes, so directive-shaped text inside them is ignored.
    for (let token = tokens.getToken(); token.type !== tokTypes.eof; token = tokens.getToken());
  } catch (error) {
    // An unterminated literal leaves the remaining comment boundaries ambiguous.
    // Keep the directives already read so an engine syntax error still renders.
    if (!(error instanceof SyntaxError)) throw error;
  }

  return blocks;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed[0] === '"' && trimmed.at(-1) === '"') ||
      (trimmed[0] === "'" && trimmed.at(-1) === "'"))
  )
    return trimmed.slice(1, -1);
  return trimmed;
}

const indentation = (line: string) => line.length - line.trimStart().length;

function parseRule(block: Block, diagnostics: AnnotationDiagnostic[]): Rule | undefined {
  const values = new Map<string, string>();
  const lines = block.body.split(/\r?\n/);
  const initialErrors = diagnostics.length;
  const report = (message: string) => diagnostics.push({ line: block.line, message });

  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].trim()) continue;
    const field = lines[index].match(/^(\s*)([a-z]+)\s*:\s*(.*)$/);
    if (!field) {
      report("Expected a field in the form `name: value`.");
      continue;
    }
    const [, indent, name, raw] = field;
    let value = unquote(raw);
    if (raw.trim() === "|") {
      const body: string[] = [];
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (next.trim() && indentation(next) <= indent.length) break;
        body.push(next);
        index++;
      }
      const nonBlank = body.filter((line) => line.trim());
      const commonIndent = nonBlank.length ? Math.min(...nonBlank.map(indentation)) : 0;
      value = body
        .map((line) => line.slice(commonIndent))
        .join("\n")
        .replace(/\n+$/, "");
      if (name !== "text" && value.includes("\n"))
        report(`\`${name}\` cannot hold a multiline value; only \`text\` can.`);
    }
    if (!FIELDS.has(name)) report(`Unknown annotation field \`${name}\`.`);
    else if (values.has(name)) report(`Field \`${name}\` is declared more than once.`);
    else values.set(name, value);
  }

  const match = values.get("match") ?? "";
  const text = values.get("text") ?? "";
  if (!match.trim()) report("A non-empty `match` is required.");
  if (!text.trim()) report("A non-empty `text` is required.");

  const highlight = values.get("highlight") ?? match;
  const focus = match.indexOf(highlight);
  if (!highlight.trim() || focus < 0) report("`highlight` must be a non-empty part of `match`.");
  else if (match.indexOf(highlight, focus + 1) >= 0) {
    report("`highlight` occurs more than once inside `match`; use a more specific fragment.");
  }

  const occurrence = values.get("occurrence") ?? "all";
  if (
    occurrence !== "all" &&
    (!/^[1-9]\d*$/.test(occurrence) || !Number.isSafeInteger(Number(occurrence)))
  ) {
    report("`occurrence` must be `all` or a positive integer (starting at 1).");
  }

  if (diagnostics.length !== initialErrors) return undefined;
  return {
    line: block.line,
    match,
    highlight,
    title: values.get("title") || highlight,
    text,
    occurrence: occurrence === "all" ? undefined : Number(occurrence),
  };
}

export function uniqueDiagnostics(diagnostics: AnnotationDiagnostic[]): AnnotationDiagnostic[] {
  return [...new Map(diagnostics.map((item) => [`${item.line}-${item.message}`, item])).values()];
}

export type AnnotationRules = {
  rules: readonly Rule[];
  diagnostics: readonly AnnotationDiagnostic[];
};

export function parseAnnotationSource(source: string): AnnotationRules {
  const diagnostics: AnnotationDiagnostic[] = [];
  const rules: Rule[] = [];
  for (const block of annotationBlocks(source)) {
    const rule = parseRule(block, diagnostics);
    if (rule) rules.push(rule);
  }
  return { rules, diagnostics: uniqueDiagnostics(diagnostics) };
}

export function matchAnnotations(
  { rules }: AnnotationRules,
  output: string,
): { annotations: OutputAnnotation[]; diagnostics: AnnotationDiagnostic[] } {
  const diagnostics: AnnotationDiagnostic[] = [];
  const candidates: (OutputAnnotation & { line: number; order: number })[] = [];

  rules.forEach((rule, order) => {
    const focus = rule.match.indexOf(rule.highlight);
    let cursor = 0;
    let occurrence = 0;

    while (cursor <= output.length - rule.match.length) {
      const index = output.indexOf(rule.match, cursor);
      if (index < 0) break;
      cursor = index + rule.match.length;
      occurrence++;
      if (rule.occurrence !== undefined && rule.occurrence !== occurrence) continue;
      const start = index + focus;
      candidates.push({
        id: `annotation-${order}-${start}`,
        start,
        end: start + rule.highlight.length,
        title: rule.title,
        text: rule.text,
        line: rule.line,
        order,
      });
      if (rule.occurrence !== undefined) break;
    }
  });

  candidates.sort((left, right) => left.start - right.start || left.order - right.order);
  const annotations: OutputAnnotation[] = [];
  for (const candidate of candidates) {
    const previous = annotations.at(-1);
    if (previous && candidate.start < previous.end) {
      diagnostics.push({
        line: candidate.line,
        message: "Overlapping annotation skipped; use a more specific match.",
      });
      continue;
    }
    const { id, start, end, title, text } = candidate;
    annotations.push({ id, start, end, title, text });
  }
  return { annotations, diagnostics: uniqueDiagnostics(diagnostics) };
}

export function compileAnnotations({ source, output }: { source: string; output: string }): {
  annotations: OutputAnnotation[];
  diagnostics: AnnotationDiagnostic[];
} {
  const parsed = parseAnnotationSource(source);
  const matched = matchAnnotations(parsed, output);
  return {
    annotations: matched.annotations,
    diagnostics: uniqueDiagnostics([...parsed.diagnostics, ...matched.diagnostics]),
  };
}
