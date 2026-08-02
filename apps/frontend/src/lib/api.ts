import type { EngineKey } from "@/lib/types";

/**
 * A run that never produced engine output: the gateway rejected it, the proxy
 * failed, or the network died. Kept separate from `stderr` so callers can render
 * it as UI chrome instead of feeding it to the bytecode syntax highlighter.
 */
export interface RunFailure {
  /** HTTP status from /api/run; 0 when the request never completed. */
  status: number;
  /** The API's JSON `error` field, or the network error message. */
  message: string;
  /** Seconds to wait before retrying — only present on 429. */
  retryAfterSeconds?: number;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  ms: number;
  cacheHit?: boolean;
  failure?: RunFailure;
  /**
   * The engine hit its output cap and this is a prefix. Overflow is a
   * successful run now, so without surfacing it a half-printed bytecode dump
   * looks complete.
   */
  outputTruncated?: boolean;
  /** Flags the allowlist rejected — otherwise a typo just looks like no output. */
  droppedFlags?: string[];
}

export interface RunOptions {
  flags?: string[];
}

const toPositiveInt = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : undefined;
};

/** Human-readable text for a failure, with 429 spelled out as a wait time. */
export function describeRunFailure(failure: RunFailure): string {
  if (failure.status === 429) {
    const wait = failure.retryAfterSeconds;
    return wait
      ? `Too many runs — the rate limit kicked in. Try again in ${wait} second${wait === 1 ? "" : "s"}.`
      : "Too many runs — the rate limit kicked in. Try again in a moment.";
  }
  if (failure.status === 0) {
    return `Could not reach the engine service: ${failure.message}`;
  }
  return `Run failed (HTTP ${failure.status}): ${failure.message}`;
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

    // The engine reports script errors with ok:true and a non-empty stderr, so
    // ok:false always means the request itself failed — never engine output.
    if (!response.ok || !payload?.ok) {
      return {
        stdout: (payload?.stdout ?? "").trim(),
        stderr: (payload?.stderr ?? "").trim(),
        ms: payload?.meta?.durationMs ?? 0,
        failure: {
          status: response.status,
          message: payload?.error ?? `HTTP ${response.status}`,
          // The Next.js proxy re-serialises the body and drops headers, so the
          // gateway's meta.retryAfter is the reliable source; the header is only
          // there when /api/run is called directly.
          retryAfterSeconds:
            toPositiveInt(payload?.meta?.retryAfter) ?? toPositiveInt(response.headers.get("retry-after")),
        },
      };
    }

    const droppedFlags = Array.isArray(payload.meta?.droppedFlags)
      ? payload.meta.droppedFlags.filter((flag: unknown): flag is string => typeof flag === "string")
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
