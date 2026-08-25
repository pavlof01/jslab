import { expect, test } from "@playwright/test";

import { GATEWAY_URL } from "../helpers/api";

test.describe("api gateway", () => {
  test.beforeEach(async ({ request }) => {
    const probe = await request
      .get(`${GATEWAY_URL}/healthz`, { failOnStatusCode: false })
      .catch(() => null);
    test.skip(!probe || !probe.ok(), `gateway not reachable at ${GATEWAY_URL}`);
  });

  test("reports its own health and its Redis connection", async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/healthz`);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.redis).toBe("ready");
  });

  test("serves the flag catalog for every engine", async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/api/flags`);
    const body = await res.json();

    expect(Object.keys(body.engines)).toEqual(["v8", "hermes", "sm", "jsc"]);
    expect(body.engines.v8.length).toBeGreaterThan(10);
    expect(body.engines.v8[0]).toMatchObject({
      flag: expect.any(String),
      description: expect.any(String),
    });
  });

  test("reports the version behind every engine key", async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/api/engines`);
    const body = await res.json();

    expect(body.engines).toHaveLength(4);
    for (const entry of body.engines) {
      expect(entry.ok, `${entry.engine} is not answering`).toBe(true);
    }
    const v8 = body.engines.find((e: { engine: string }) => e.engine === "v8");
    expect(v8.version).toMatch(/\d+\.\d+/);
  });

  test("answers the second /api/engines call from cache", async ({ request }) => {
    await request.get(`${GATEWAY_URL}/api/engines`);
    const second = await request.get(`${GATEWAY_URL}/api/engines`);
    expect((await second.json()).meta.cacheHit).toBe(true);
  });

  test("exposes Prometheus metrics for runs, cache and rate limiting", async ({ request }) => {
    await request.post(`${GATEWAY_URL}/api/run`, {
      data: { engine: "v8", sourceText: `/* metrics ${Date.now()} */ 1+1` },
      failOnStatusCode: false,
    });

    const res = await request.get(`${GATEWAY_URL}/metrics`);
    const body = await res.text();

    expect(body).toContain("jslab_api_runs_total");
    expect(body).toContain("jslab_api_cache_events_total");
    expect(body).toContain("jslab_api_run_duration_seconds");
  });

  test("publishes an OpenAPI document that describes its real routes", async ({ request }) => {
    const res = await request.get(`${GATEWAY_URL}/api/openapi.json`);
    const doc = await res.json();

    expect(doc.openapi).toMatch(/^3\./);
    for (const path of ["/api/run", "/api/flags", "/api/engines", "/api/trace/execute/equality"]) {
      expect(doc.paths, `${path} missing from the document`).toHaveProperty(path);
    }
  });

  test("renders the API reference page", async ({ page }) => {
    await page.goto(`${GATEWAY_URL}/api/docs`);
    await expect(page.locator("body")).toContainText(/api|jslab/i);
  });

  test("mints and revokes a self-service API key", async ({ request }) => {
    const created = await request.post(`${GATEWAY_URL}/api/keys`, { failOnStatusCode: false });
    test.skip(created.status() === 429, "key issuance rate limit reached");
    expect(created.status()).toBe(201);

    const { key } = await created.json();
    expect(key).toBeTruthy();

    const run = await request.post(`${GATEWAY_URL}/api/run`, {
      headers: { "x-api-key": key },
      data: { engine: "v8", sourceText: `/* keyed ${Date.now()} */ 1+1` },
      failOnStatusCode: false,
    });
    expect(run.status()).toBe(200);

    const revoked = await request.delete(`${GATEWAY_URL}/api/keys`, {
      headers: { "x-api-key": key },
    });
    expect(revoked.ok()).toBe(true);
  });

  test("refuses a request presenting an invalid API key", async ({ request }) => {
    const res = await request.post(`${GATEWAY_URL}/api/run`, {
      headers: { "x-api-key": "definitely-not-a-key" },
      data: { engine: "v8", sourceText: "1+1" },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });
});
