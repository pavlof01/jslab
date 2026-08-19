import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { executeTrace } from "./traceApi";

const originalFetch = global.fetch;

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;

beforeEach(() => {
  fetchMock = jest.fn(async () => reply(200, { success: true, root: { algoId: "ToNumber", inputs: [], steps: [] } }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("executeTrace", () => {
  it("posts a type-conversion trace with the function name", async () => {
    await executeTrace("typeConversion", "ToNumber", "'42'");

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/trace/execute/type-conversion");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ functionName: "ToNumber", input: "'42'" });
  });

  it("posts an equality trace with just the expression", async () => {
    // The operator is detected server-side, so the algo name is not sent.
    await executeTrace("equality", "BinaryExpression", "[] == ![]");

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe("/api/trace/execute/equality");
    expect(JSON.parse(init!.body as string)).toEqual({ input: "[] == ![]" });
  });

  it("returns the trace tree and its result", async () => {
    const root = { algoId: "ToNumber", inputs: [], steps: [] };
    fetchMock.mockResolvedValueOnce(
      reply(200, {
        success: true,
        root,
        result: { type: "Number", value: 42 },
        effectiveAlgoId: "ToNumber",
        detectedOperator: "==",
      }),
    );

    expect(await executeTrace("typeConversion", "ToNumber", "'42'")).toEqual({
      root,
      result: { type: "Number", value: 42 },
      effectiveAlgoId: "ToNumber",
      detectedOperator: "==",
    });
  });

  it("normalizes a successful-but-empty trace to nulls the UI can render", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { success: true }));

    expect(await executeTrace("equality", "BinaryExpression", "1 == 1")).toEqual({
      root: null,
      result: undefined,
      effectiveAlgoId: null,
      detectedOperator: null,
    });
  });

  it("throws the server's message on an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(reply(400, { error: "execution budget exceeded" }));
    await expect(executeTrace("equality", "BinaryExpression", "x")).rejects.toThrow("execution budget exceeded");
  });

  it("throws a status-bearing message when the error body has none", async () => {
    fetchMock.mockResolvedValueOnce(reply(503, {}));
    await expect(executeTrace("equality", "BinaryExpression", "x")).rejects.toThrow("trace-service error 503");
  });

  it("throws when the body is not JSON at all", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("not json");
      },
    } as unknown as Response);

    await expect(executeTrace("equality", "BinaryExpression", "x")).rejects.toThrow("trace-service error 502");
  });

  it("treats a 200 that reports failure as a failure", async () => {
    // The trace service answers 200 with success:false for spec-level errors.
    fetchMock.mockResolvedValueOnce(reply(200, { success: false, error: "Unknown function: ToFoo" }));
    await expect(executeTrace("typeConversion", "ToFoo", "1")).rejects.toThrow("Unknown function: ToFoo");

    fetchMock.mockResolvedValueOnce(reply(200, { success: false }));
    await expect(executeTrace("typeConversion", "ToFoo", "1")).rejects.toThrow("trace-service returned failure");
  });

  it("lets a network failure propagate", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(executeTrace("equality", "BinaryExpression", "1 == 1")).rejects.toThrow("Failed to fetch");
  });
});
