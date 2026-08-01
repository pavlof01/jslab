/**
 * Parses a v8.log profiler file (produced by `d8 --prof` / `node --prof`) into
 * a compact summary: hottest functions by sampled ticks, largest generated
 * code, and deopt count. This is not a full tick-processor — it focuses on the
 * three event kinds that give the most insight for a snippet-sized log:
 *
 *   code-creation,<type>,<kind>,<time>,<addrHex>,<sizeDec>,"<name>",...
 *   tick,<pcHex>,<time>,<isExternal>,<tosHex>,<vmstate>,<stackHex...>
 *   code-deopt / deopt lines
 *
 * Ticks are attributed to the code entry whose [addr, addr+size) range contains
 * the program counter, giving approximate self-time per function.
 */

export interface CodeEntry {
  name: string;
  type: string;
  start: number;
  size: number;
  ticks: number;
}

export interface V8LogSummary {
  totalTicks: number;
  attributedTicks: number;
  deopts: number;
  /** Functions with at least one tick, hottest first. */
  hottest: Array<{ name: string; type: string; ticks: number; share: number }>;
  /** Largest generated code objects, biggest first. */
  largestCode: Array<{ name: string; type: string; size: number }>;
}

/** Split a CSV line honoring double-quoted fields (names may contain commas). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function hex(v: string | undefined): number {
  if (!v) return NaN;
  const n = parseInt(v, 16);
  return Number.isNaN(n) ? NaN : n;
}

export function parseV8Log(text: string): V8LogSummary {
  const entries: CodeEntry[] = [];
  const ticks: number[] = [];
  let deopts = 0;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const f = splitCsvLine(line);
    const kind = f[0];

    if (kind === "code-creation") {
      // f: [code-creation, type, kindNum, time, addrHex, sizeDec, name, ...]
      const start = hex(f[4]);
      const size = Number(f[5]);
      if (Number.isNaN(start) || Number.isNaN(size)) continue;
      entries.push({ name: f[6] || "(anonymous)", type: f[1] || "", start, size, ticks: 0 });
    } else if (kind === "tick") {
      // f: [tick, pcHex, time, isExternal, tosHex, vmstate, ...stack]
      const pc = hex(f[1]);
      if (!Number.isNaN(pc)) ticks.push(pc);
    } else if (kind === "code-deopt" || kind === "deopt") {
      deopts++;
    }
  }

  // Attribute ticks by address range. Sort entries by start for a binary search.
  entries.sort((a, b) => a.start - b.start);
  let attributed = 0;
  for (const pc of ticks) {
    let lo = 0;
    let hi = entries.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const e = entries[mid];
      if (pc < e.start) hi = mid - 1;
      else if (pc >= e.start + e.size) lo = mid + 1;
      else {
        found = mid;
        break;
      }
    }
    if (found >= 0) {
      entries[found].ticks++;
      attributed++;
    }
  }

  const totalTicks = ticks.length;
  const hottest = entries
    .filter((e) => e.ticks > 0)
    .sort((a, b) => b.ticks - a.ticks)
    .slice(0, 25)
    .map((e) => ({ name: e.name, type: e.type, ticks: e.ticks, share: totalTicks ? e.ticks / totalTicks : 0 }));

  const largestCode = [...entries]
    .sort((a, b) => b.size - a.size)
    .slice(0, 25)
    .map((e) => ({ name: e.name, type: e.type, size: e.size }));

  return { totalTicks, attributedTicks: attributed, deopts, hottest, largestCode };
}
