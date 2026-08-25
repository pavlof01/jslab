import type { RunFailure } from "@/lib/api";

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

export function describeRunNotice(
  truncated: boolean,
  droppedFlags: readonly string[],
): string | undefined {
  const parts: string[] = [];
  if (truncated) parts.push("Output hit the size cap and is truncated.");
  if (droppedFlags.length) {
    parts.push(
      `${droppedFlags.length === 1 ? "Flag" : "Flags"} ignored by this engine: ${droppedFlags.join(", ")}.`,
    );
  }
  return parts.length ? parts.join(" ") : undefined;
}

export function formatRunMeta(durationMs: number, cacheHit: boolean): string {
  if (!durationMs) return "";
  return `Duration: ${durationMs} ms${cacheHit ? " · cached" : ""}`;
}
