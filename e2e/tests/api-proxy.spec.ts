import { expect, test } from "@playwright/test";
import { runViaProxy, uniqueSnippet } from "../helpers/api";

test.describe("frontend API proxy: /api/run", () => {
  test("forwards a run and relays the engine's answer", async ({ request }) => {
    const { status, json } = await runViaProxy(request, {
      engine: "v8",
      sourceText: uniqueSnippet("proxy"),
      options: { flags: ["--print-bytecode"] },
    });

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(String(json.stdout)).toMatch(/Ldar|Star|Return|LdaSmi/);
    expect(json.meta).toMatchObject({ engine: "v8" });
  });

  test("reports the flags the allowlist refused", async ({ request }) => {
    const { status, json } = await runViaProxy(request, {
      engine: "v8",
      sourceText: uniqueSnippet("dropped"),
      options: { flags: ["--print-bytecode", "--totally-made-up"] },
    });

    expect(status).toBe(200);
    expect((json.meta as Record<string, unknown>).droppedFlags).toContain("--totally-made-up");
  });

  test("rejects an unknown engine before reaching a pod", async ({ request }) => {
    const { status } = await runViaProxy(request, { engine: "nonsense", sourceText: "1+1" });
    expect(status).toBe(400);
  });

  test("rejects malformed JSON with 400, not a 500", async ({ request }) => {
    const res = await request.post("/api/run", {
      headers: { "content-type": "application/json" },
      data: "{ not json",
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(400);
  });

  test("refuses a GET on the run route", async ({ request }) => {
    const res = await request.get("/api/run", { failOnStatusCode: false });
    expect(res.status()).toBe(405);
  });

  test("caps source text at the documented limit", async ({ request }) => {
    const { status } = await runViaProxy(request, { engine: "v8", sourceText: "a".repeat(20_001) });
    expect(status).toBe(400);
  });

  test("serves a repeated run from cache and says so", async ({ request }) => {
    const sourceText = uniqueSnippet("cache");
    const first = await runViaProxy(request, { engine: "v8", sourceText });
    const second = await runViaProxy(request, { engine: "v8", sourceText });

    expect((first.json.meta as Record<string, unknown>).cacheHit).toBe(false);
    expect((second.json.meta as Record<string, unknown>).cacheHit).toBe(true);
  });

  test("runs on every engine key the catalog advertises", async ({ request }) => {
    for (const engine of ["v8", "hermes", "sm", "jsc"]) {
      const { status, json } = await runViaProxy(request, { engine, sourceText: `/* ${engine} */ 1 + 1` });
      expect(status, `${engine} failed`).toBe(200);
      expect(json.ok, `${engine} returned not-ok`).toBe(true);
    }
  });
});

test.describe("frontend API proxy: trace routes", () => {
  test("traces a type conversion", async ({ request }) => {
    const res = await request.post("/api/trace/execute/type-conversion", {
      data: { functionName: "ToNumber", input: "'42'" },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result).toMatchObject({ type: "Number" });
  });

  test("traces an equality expression", async ({ request }) => {
    const res = await request.post("/api/trace/execute/equality", {
      data: { input: "[] == ![]" },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.effectiveAlgoId).toBe("IsLooselyEqual");
  });

  test("traces the + operator through every layer", async ({ request }) => {
    const res = await request.post("/api/trace/execute/equality", {
      data: { input: "[] + {}" },
      failOnStatusCode: false,
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.result).toMatchObject({ type: "String", value: "[object Object]" });
  });

  test("requires input to be source text, the way all three schemas now agree", async ({ request }) => {
    for (const input of [0, null, false, [], {}]) {
      const res = await request.post("/api/trace/execute/type-conversion", {
        data: { functionName: "ToNumber", input },
        failOnStatusCode: false,
      });
      expect(res.status(), `input ${JSON.stringify(input)} must be refused`).toBe(400);
    }

    for (const input of ["0", "null", "false"]) {
      const res = await request.post("/api/trace/execute/type-conversion", {
        data: { functionName: "ToNumber", input },
        failOnStatusCode: false,
      });
      expect(res.status(), `source text ${input} must be accepted`).toBe(200);
    }
  });

  test("404s an unknown trace category without calling upstream", async ({ request }) => {
    const res = await request.post("/api/trace/execute/nonsense", { data: { input: "1" }, failOnStatusCode: false });
    expect(res.status()).toBe(404);
  });

  test("lists the operations the service can trace", async ({ request }) => {
    const res = await request.get("/api/trace/functions");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.available_functions).toEqual(expect.arrayContaining(["ToNumber", "ToString", "ToPrimitive"]));
    expect(body.supported_operators).toEqual(expect.arrayContaining(["==", "===", "+"]));
  });

  test("serves the rendered spec clause for an operation", async ({ request }) => {
    const res = await request.get("/api/spec/ToNumber");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
    expect(await res.text()).toContain("ToNumber");
  });

  test("refuses a spec name that tries to escape the allowlist", async ({ request }) => {
    for (const name of ["../../etc/passwd", "ToNumber?x=1", "1Bad"]) {
      const res = await request.get(`/api/spec/${encodeURIComponent(name)}`, { failOnStatusCode: false });
      expect(res.status(), `${name} must be refused`).toBeGreaterThanOrEqual(400);
    }
  });
});
