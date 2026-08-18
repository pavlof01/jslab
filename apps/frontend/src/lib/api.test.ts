import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { runEngine } from "./api";
import { EngineKey } from "@/lib/types";

type FakeResponse = { ok: boolean; status: number; headers?: Record<string, string>; body: unknown };

const mockFetch = (response: FakeResponse | Error) => {
  const fetchMock = jest.fn(async () => {
    if (response instanceof Error) throw response;
    return {
      ok: response.ok,
      status: response.status,
      headers: { get: (name: string) => response.headers?.[name.toLowerCase()] ?? null },
      json: async () => response.body,
    };
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  return fetchMock;
};

const originalFetch = globalThis.fetch;

describe("runEngine", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
  });

  it("returns trimmed engine output and cache state on success", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { ok: true, stdout: "  bytecode\n", stderr: " warn ", meta: { durationMs: 42, cacheHit: true } },
    });

    const result = await runEngine(EngineKey.v8, "1+1");

    expect(result).toEqual({
      stdout: "bytecode",
      stderr: "warn",
      ms: 42,
      cacheHit: true,
      outputTruncated: false,
      droppedFlags: undefined,
    });
  });

  it("maps a rate-limited response to a typed failure instead of stderr text", async () => {
    mockFetch({
      ok: false,
      status: 429,
      body: { ok: false, error: "rate limit exceeded", meta: { retryAfter: 17 } },
    });

    const result = await runEngine(EngineKey.v8, "1+1");

    // The old behaviour folded "HTTP 429" into stderr, where the bytecode
    // highlighter rendered it as if the engine had printed it.
    expect(result.stderr).toBe("");
    expect(result.failure).toEqual({ status: 429, message: "rate limit exceeded", retryAfterSeconds: 17 });
  });

  it("falls back to the Retry-After header when the body carries no retryAfter", async () => {
    mockFetch({
      ok: false,
      status: 429,
      headers: { "retry-after": "3" },
      body: { ok: false, error: "engine busy" },
    });

    expect((await runEngine(EngineKey.jsc, "1+1")).failure?.retryAfterSeconds).toBe(3);
  });

  it("carries the API error message and status for non-429 failures", async () => {
    mockFetch({ ok: false, status: 502, body: { ok: false, error: "engine unavailable (503)" } });

    expect(await runEngine(EngineKey.hermes, "1+1")).toMatchObject({
      stdout: "",
      stderr: "",
      failure: { status: 502, message: "engine unavailable (503)" },
    });
  });

  it("reports an unparseable body as a plain HTTP failure", async () => {
    mockFetch({ ok: false, status: 500, body: null });

    expect((await runEngine(EngineKey.sm, "1+1")).failure).toEqual({
      status: 500,
      message: "HTTP 500",
      retryAfterSeconds: undefined,
    });
  });

  it("reports a network error with status 0", async () => {
    mockFetch(new Error("Failed to fetch"));

    expect((await runEngine(EngineKey.v8, "1+1")).failure).toEqual({ status: 0, message: "Failed to fetch" });
  });

  it("surfaces truncated output and the flags the gateway rejected", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: {
        ok: true,
        stdout: "partial",
        stderr: "",
        meta: { durationMs: 7, cacheHit: false, outputTruncated: true, droppedFlags: ["--nope", 42] },
      },
    });

    const result = await runEngine(EngineKey.v8, "1+1", { flags: ["--nope"] });

    // Overflow is a successful run now, so without these the UI would show a
    // half-printed dump as complete and a rejected flag as "no output".
    expect(result.outputTruncated).toBe(true);
    // Non-string entries are discarded rather than rendered as "42".
    expect(result.droppedFlags).toEqual(["--nope"]);
  });

  it("keeps engine stderr when the script itself failed (ok:true)", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { ok: true, stdout: "", stderr: "SyntaxError: unexpected token", meta: { durationMs: 5 } },
    });

    const result = await runEngine(EngineKey.v8, "const =");

    expect(result.stderr).toBe("SyntaxError: unexpected token");
    expect(result.failure).toBeUndefined();
  });
});
