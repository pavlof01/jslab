export type V8TraceEventKind = "optimize" | "deopt" | "ic";

export interface V8TraceEvent {
  kind: V8TraceEventKind;
  /** Function name if V8 named one (from `<JSFunction name ...>` or `<JS Function name>`). */
  fn?: string;
  /** Deopt bailout kind (eager/lazy/soft) when present. */
  bailout?: string;
  /** Deopt reason / IC transition detail when present. */
  reason?: string;
  /** Source position like "file:3:10" when present. */
  location?: string;
  raw: string;
}

const FN_RE = /<JS(?:Function| Function)\s+([^\s(>]+)/;
const REASON_RE = /reason:\s*([^\]]+?)\s*[\]]?\s*$/;
const LOCATION_RE = /at\s+<?([\w./-]+)>?:(\d+):(\d+)/;
const BAILOUT_RE = /(?:DEOPT|deopt|kind:)\s*[-(]?\s*(eager|lazy|soft)/i;

function fnOf(line: string): string | undefined {
  return FN_RE.exec(line)?.[1];
}

function locOf(line: string): string | undefined {
  const m = LOCATION_RE.exec(line);
  return m ? `${m[1]}:${m[2]}:${m[3]}` : undefined;
}

export function parseV8Trace(output: string): V8TraceEvent[] {
  const events: V8TraceEvent[] = [];
  if (!output) return events;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    if (
      lower.includes("deoptimizing") ||
      lower.includes("bailout") ||
      lower.includes(";;; deoptimize")
    ) {
      const reason = REASON_RE.exec(line)?.[1];
      const fn = fnOf(line);
      if (!fn && (lower.startsWith(";;;") || lower.includes("deoptimize at")) && events.length) {
        const prev = events[events.length - 1];
        if (prev.kind === "deopt") {
          prev.reason = prev.reason ?? reason;
          prev.location = prev.location ?? locOf(line);
          continue;
        }
      }
      events.push({
        kind: "deopt",
        fn,
        bailout: BAILOUT_RE.exec(line)?.[1]?.toLowerCase(),
        reason,
        location: locOf(line),
        raw: line,
      });
      continue;
    }

    // --- Optimizations ---
    if (
      lower.includes("optimizing") ||
      lower.includes("for optimization") ||
      lower.includes("compiling method") ||
      lower.includes("completed optimizing")
    ) {
      events.push({
        kind: "optimize",
        fn: fnOf(line),
        reason: REASON_RE.exec(line)?.[1],
        raw: line,
      });
      continue;
    }

    // --- Inline caches (--trace-ic) ---
    const icMatch = /\b([A-Za-z]*IC)\b/.exec(line);
    if (icMatch && line.startsWith("[")) {
      const transition = /\((\w+->\w+|\w+)\)/.exec(line)?.[1];
      events.push({ kind: "ic", fn: fnOf(line), reason: transition, raw: line });
      continue;
    }
  }

  return events;
}

export interface V8TraceSummary {
  optimize: number;
  deopt: number;
  ic: number;
  deoptedFns: string[];
}

export function summarizeV8Trace(events: V8TraceEvent[]): V8TraceSummary {
  const deoptedFns = new Set<string>();
  let optimize = 0;
  let deopt = 0;
  let ic = 0;
  for (const e of events) {
    if (e.kind === "optimize") optimize++;
    else if (e.kind === "deopt") {
      deopt++;
      if (e.fn) deoptedFns.add(e.fn);
    } else if (e.kind === "ic") ic++;
  }
  return { optimize, deopt, ic, deoptedFns: [...deoptedFns] };
}
