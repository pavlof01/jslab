import type { EngineKey } from "@/lib/types";

export interface RunResult {
  stdout: string;
  stderr: string;
  ms: number;
}

export interface RunOptions {
  flags?: string[];
}

export async function runEngine(
  engine: EngineKey,
  sourceText: string,
  options: RunOptions = {},
): Promise<RunResult> {
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ engine, sourceText, options }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      return {
        stdout: (payload?.stdout ?? "").trim(),
        stderr: (payload?.error ?? payload?.stderr ?? `HTTP ${response.status}`).trim(),
        ms: payload?.meta?.durationMs ?? 0,
      };
    }

    return {
      stdout: (payload.stdout ?? "").trim(),
      stderr: (payload.stderr ?? "").trim(),
      ms: payload.meta?.durationMs ?? 0,
    };
  } catch (err) {
    return {
      stdout: "",
      stderr: err instanceof Error ? err.message : "Unknown error",
      ms: 0,
    };
  }
}
