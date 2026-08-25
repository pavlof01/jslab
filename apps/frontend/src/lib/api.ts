import { toPositiveInt } from "@/lib/numbers";
import type { EngineKey } from "@/lib/types";

export interface RunFailure {
  status: number;
  message: string;
  retryAfterSeconds?: number;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  ms: number;
  cacheHit?: boolean;
  failure?: RunFailure;
  outputTruncated?: boolean;
  droppedFlags?: string[];
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
        stderr: (payload?.stderr ?? "").trim(),
        ms: payload?.meta?.durationMs ?? 0,
        failure: {
          status: response.status,
          message: payload?.error ?? `HTTP ${response.status}`,
          retryAfterSeconds:
            toPositiveInt(payload?.meta?.retryAfter) ??
            toPositiveInt(response.headers.get("retry-after")),
        },
      };
    }

    const droppedFlags = Array.isArray(payload.meta?.droppedFlags)
      ? payload.meta.droppedFlags.filter(
          (flag: unknown): flag is string => typeof flag === "string",
        )
      : undefined;

    return {
      stdout: (payload.stdout ?? "").trim(),
      stderr: (payload.stderr ?? "").trim(),
      ms: payload.meta?.durationMs ?? 0,
      cacheHit: payload.meta?.cacheHit === true,
      outputTruncated: payload.meta?.outputTruncated === true,
      droppedFlags: droppedFlags?.length ? droppedFlags : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      stdout: "",
      stderr: "",
      ms: 0,
      failure: { status: 0, message },
    };
  }
}
