import type { EngineOutcome } from "./client.js";
import { ENGINES, flagsFor, type EngineKey } from "./engines.js";

export interface Theme {
  color: boolean;
  /** Width used for the rules around engine headings. */
  width: number;
}

export const DEFAULT_WIDTH = 80;

export function theme(color: boolean, columns: number | undefined = process.stdout.columns): Theme {
  // Clamped: a maximised terminal would otherwise draw a 300-character rule
  // over every heading, and a narrow one would wrap it onto a second line.
  const width = Math.max(40, Math.min(columns || DEFAULT_WIDTH, 100));
  return { color, width };
}

type Style = "bold" | "dim" | "red" | "green" | "yellow" | "cyan";

const CODES: Record<Style, [number, number]> = {
  bold: [1, 22],
  dim: [2, 22],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  cyan: [36, 39],
};

export function paint(text: string, style: Style, { color }: Theme): string {
  if (!color) return text;
  const [on, off] = CODES[style];
  return `\u001b[${on}m${text}\u001b[${off}m`;
}

/** The full report for one engine: heading, stdout, stderr, and any failure. */
export function renderOutcome(outcome: EngineOutcome, t: Theme): string {
  const lines = [renderHeading(outcome, t)];

  if (outcome.flags.length) lines.push(paint(`flags: ${outcome.flags.join(" ")}`, "dim", t));
  if (outcome.droppedFlags?.length) {
    lines.push(paint(`dropped by the server: ${outcome.droppedFlags.join(" ")}`, "yellow", t));
  }
  if (outcome.failure) {
    const status = outcome.failure.status ? `HTTP ${outcome.failure.status}: ` : "";
    const retry = outcome.failure.retryAfterSeconds ? ` (retry in ${outcome.failure.retryAfterSeconds}s)` : "";
    lines.push(paint(`${status}${outcome.failure.message}${retry}`, "red", t));
  }

  const stdout = outcome.stdout.replace(/\s+$/, "");
  const stderr = outcome.stderr.replace(/\s+$/, "");
  if (stdout) lines.push(stdout);
  if (stderr) {
    lines.push(paint("--- stderr ---", "dim", t));
    lines.push(stderr);
  }
  if (!stdout && !stderr && !outcome.failure) lines.push(paint("(no output)", "dim", t));
  if (outcome.outputTruncated) lines.push(paint("--- output truncated by the engine's byte cap ---", "yellow", t));

  return lines.join("\n");
}

function renderHeading(outcome: EngineOutcome, t: Theme): string {
  const marks = [
    `${Math.round(outcome.durationMs ?? outcome.elapsedMs)} ms`,
    ...(outcome.cacheHit ? ["cached"] : []),
    ...(outcome.failure ? ["failed"] : []),
  ];
  const label = `${ENGINES[outcome.engine].label} · ${marks.join(" · ")}`;
  const painted = paint(label, outcome.failure ? "red" : "bold", t);
  const rule = "─".repeat(Math.max(3, t.width - label.length - 4));
  return `${paint("──", "dim", t)} ${painted} ${paint(rule, "dim", t)}`;
}

/** One-line tally, printed after a multi-engine run. */
export function renderSummary(outcomes: readonly EngineOutcome[], t: Theme): string {
  const failed = outcomes.filter((outcome) => !outcome.ok);
  const parts = [`${outcomes.length} engines`, paint(`${outcomes.length - failed.length} ok`, "green", t)];
  if (failed.length) parts.push(paint(`${failed.length} failed: ${failed.map((o) => o.engine).join(", ")}`, "red", t));
  return paint(parts.join(" · "), "dim", t);
}

/** `jslab flags` — the shared catalog, grouped by category. */
export function renderFlags(engines: readonly EngineKey[], category: string | undefined, t: Theme): string {
  const blocks: string[] = [];

  for (const engine of engines) {
    const specs = flagsFor(engine).filter((spec) => !category || spec.category === category);
    const heading = paint(`${ENGINES[engine].label}  (--engine ${engine})`, "bold", t);
    if (!specs.length) {
      blocks.push(`${heading}\n  ${paint(`no flags in category ${category}`, "dim", t)}`);
      continue;
    }

    const byCategory = new Map<string, string[]>();
    const width = Math.max(...specs.map((spec) => spec.flag.length + (spec.takesValue ? 6 : 0)));
    for (const spec of specs) {
      const name = spec.takesValue ? `${spec.flag}=VALUE` : spec.flag;
      const line = `  ${paint(name.padEnd(width), "cyan", t)}  ${spec.description}`;
      byCategory.set(spec.category, [...(byCategory.get(spec.category) ?? []), line]);
    }

    const body = [...byCategory.entries()]
      .map(([name, lines]) => [paint(`  [${name}]`, "dim", t), ...lines].join("\n"))
      .join("\n");
    blocks.push(`${heading}\n${body}`);
  }

  return blocks.join("\n\n");
}

/** `jslab engines` — what each engine prints, and what it needs to print it. */
export function renderEngines(t: Theme): string {
  return (Object.keys(ENGINES) as EngineKey[])
    .map((key) => {
      const info = ENGINES[key];
      const aliases = info.aliases.length ? paint(` (also: ${info.aliases.join(", ")})`, "dim", t) : "";
      return `${paint(key.padEnd(7), "cyan", t)} ${info.label}${aliases}\n        ${paint(info.bytecodeNote, "dim", t)}`;
    })
    .join("\n");
}

/** Machine-readable form of a run, for `--json`. */
export function toJson(apiUrl: string, sourceText: string, outcomes: readonly EngineOutcome[]): string {
  return `${JSON.stringify(
    {
      ok: outcomes.every((outcome) => outcome.ok),
      api: apiUrl,
      sourceBytes: Buffer.byteLength(sourceText, "utf8"),
      results: outcomes,
    },
    null,
    2,
  )}\n`;
}
