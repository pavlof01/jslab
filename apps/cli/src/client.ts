import type { EngineKey } from "./engines.js";

export interface RunFailure {
  /** HTTP status, or null when the request never got a response. */
  status: number | null;
  message: string;
  retryAfterSeconds?: number;
}

export interface EngineOutcome {
  engine: EngineKey;
  flags: string[];
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Wall-clock time the CLI waited, including transport. */
  elapsedMs: number;
  /** Time the gateway reports for the run itself, when it answered. */
  durationMs?: number;
  cacheHit?: boolean;
  outputTruncated?: boolean;
  droppedFlags?: string[];
  failure?: RunFailure;
}

export interface RunClientOptions {
  apiUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Injected in tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected in tests; defaults to Date.now. */
  now?: () => number;
}

/**
 * Slack added to the engine timeout before the CLI gives up on the request.
 * The gateway has to queue, spawn a process and stream the output back, so
 * aborting at exactly `timeoutMs` would report a client timeout for runs the
 * server was about to answer.
 */
const TRANSPORT_SLACK_MS = 15_000;

/** Fallback deadline when no `--timeout` was given, matching the server default. */
const DEFAULT_ENGINE_TIMEOUT_MS = 5_000;

/**
 * Sent on every request so gateway logs can tell CLI traffic from the site's.
 * Deliberately version-less: the version lives in package.json and a copy here
 * would silently drift from it.
 */
const USER_AGENT = "jslab-cli";

/** Run one snippet on one engine through `POST /api/run`. Never throws. */
export async function runOnEngine(
  engine: EngineKey,
  sourceText: string,
  flags: string[],
  options: RunClientOptions,
): Promise<EngineOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const started = now();
  const base: Pick<EngineOutcome, "engine" | "flags"> = { engine, flags };

  let response: Response;
  try {
    response = await fetchImpl(`${options.apiUrl}/api/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": USER_AGENT,
        ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
      },
      body: JSON.stringify({
        engine,
        sourceText,
        options: { flags, ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}) },
      }),
      signal: AbortSignal.timeout((options.timeoutMs ?? DEFAULT_ENGINE_TIMEOUT_MS) + TRANSPORT_SLACK_MS),
    });
  } catch (err) {
    return {
      ...base,
      ok: false,
      stdout: "",
      stderr: "",
      elapsedMs: now() - started,
      failure: { status: null, message: describeNetworkError(err, options.apiUrl) },
    };
  }

  const payload = (await response.json().catch(() => null)) as ApiPayload | null;
  const elapsedMs = now() - started;
  const meta = payload?.meta ?? {};

  if (!response.ok || !payload?.ok) {
    return {
      ...base,
      ok: false,
      stdout: str(payload?.stdout),
      stderr: str(payload?.stderr),
      elapsedMs,
      durationMs: num(meta.durationMs),
      failure: {
        status: response.status,
        message: str(payload?.error) || `HTTP ${response.status}`,
        retryAfterSeconds: num(meta.retryAfter) ?? num(response.headers.get("retry-after")),
      },
    };
  }

  return {
    ...base,
    ok: true,
    stdout: str(payload.stdout),
    stderr: str(payload.stderr),
    elapsedMs,
    durationMs: num(meta.durationMs),
    cacheHit: meta.cacheHit === true,
    outputTruncated: meta.outputTruncated === true,
    droppedFlags: strings(meta.droppedFlags),
  };
}

export interface HealthResult {
  ok: boolean;
  status: number | null;
  detail: string;
}

/**
 * Probe the gateway's `/healthz`. Only the gateway itself serves it — the
 * public site proxies `/api/*` and nothing else — so a 404 is reported as
 * "reachable, but this is not a gateway" rather than as a failure.
 */
export async function checkHealth(apiUrl: string, fetchImpl: typeof fetch = fetch): Promise<HealthResult> {
  let response: Response;
  try {
    response = await fetchImpl(`${apiUrl}/healthz`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    return { ok: false, status: null, detail: describeNetworkError(err, apiUrl) };
  }
  if (response.status === 404) {
    return { ok: true, status: 404, detail: "reachable (no /healthz — runs still go through /api/run)" };
  }
  const payload = (await response.json().catch(() => null)) as { ok?: unknown; redis?: unknown } | null;
  if (!response.ok || payload?.ok !== true) {
    return { ok: false, status: response.status, detail: `unhealthy (HTTP ${response.status})` };
  }
  return { ok: true, status: response.status, detail: `healthy${payload.redis ? ` (redis: ${String(payload.redis)})` : ""}` };
}

interface ApiPayload {
  ok?: unknown;
  stdout?: unknown;
  stderr?: unknown;
  error?: unknown;
  meta?: Record<string, unknown>;
}

function describeNetworkError(err: unknown, apiUrl: string): string {
  if (err instanceof Error && err.name === "TimeoutError") return `no response from ${apiUrl} before the deadline`;
  // undici's own message is a bare "fetch failed"; the syscall-level reason
  // (ECONNREFUSED, ENOTFOUND, certificate errors) hides one level down in
  // `cause`, and it is the only part that tells the user what to fix.
  const reason = err instanceof Error ? err.message : String(err);
  // Read through an index type rather than `err.cause`: the package targets
  // ES2021, whose lib has no `cause` on Error even though the runtime sets it.
  const cause = (err as { cause?: unknown } | null)?.cause;
  const detail = cause instanceof Error ? cause.message : "";
  return `cannot reach ${apiUrl}: ${detail || reason}`;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((entry): entry is string => typeof entry === "string");
  return list.length ? list : undefined;
}
