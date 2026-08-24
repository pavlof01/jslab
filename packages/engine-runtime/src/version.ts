import type { SpawnOptions } from "node:child_process";

import { runCommand } from "./run.js";

export interface VersionProbe {
  cmd: string;
  candidates: readonly (readonly string[])[];
  parse: (raw: string) => string | null;
  spawnOptions?: Pick<SpawnOptions, "cwd" | "env">;
}

const PROBE_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_VERSION_CHARS = 80;

async function runProbe(probe: VersionProbe, args: readonly string[]): Promise<string | null> {
  const result = await runCommand(probe.cmd, [...args], {
    timeoutMs: PROBE_TIMEOUT_MS,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    spawnOptions: probe.spawnOptions,
  });
  if (result.spawnError || result.timedOut) return null;
  const raw = `${result.stdout}${result.stderr}`;
  return raw.trim() === "" ? null : raw;
}

export async function detectVersion(probe: VersionProbe): Promise<string | null> {
  for (const args of probe.candidates) {
    const raw = await runProbe(probe, args);
    if (raw === null) continue;
    const parsed = probe.parse(raw)?.trim();
    if (parsed) return parsed.slice(0, MAX_VERSION_CHARS);
  }
  return null;
}

export function matchVersion(raw: string, pattern: RegExp): string | null {
  return raw.match(pattern)?.[1]?.trim() ?? null;
}
