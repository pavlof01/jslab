import { expect, test } from "@playwright/test";

import { GATEWAY_URL } from "../helpers/api";

test("the heavy bucket refuses surplus runs with a Retry-After", async ({ request }) => {
  const probe = await request
    .get(`${GATEWAY_URL}/healthz`, { failOnStatusCode: false })
    .catch(() => null);
  test.skip(!probe?.ok(), `gateway not reachable at ${GATEWAY_URL}`);

  const created = await request.post(`${GATEWAY_URL}/api/keys`, {
    data: {},
    failOnStatusCode: false,
  });
  test.skip(created.status() === 429, "key issuance rate limit reached");
  expect(created.status()).toBe(201);
  const { apiKey } = await created.json();

  const salt = Date.now();
  const responses = await Promise.all(
    Array.from({ length: 80 }, (_, i) =>
      request.post(`${GATEWAY_URL}/api/run`, {
        headers: { "x-api-key": apiKey },
        data: { engine: "v8", sourceText: `/* ${salt} */ ${i} + ${i}` },
        failOnStatusCode: false,
      }),
    ),
  );
  const limited = responses.filter((r) => r.status() === 429);
  const bodies = await Promise.all(limited.map((r) => r.json()));

  expect(bodies.some((b) => b.error === "rate limit exceeded")).toBe(true);
  for (const r of limited) {
    expect(r.headers()["retry-after"]).toBeTruthy();
  }

  await request.delete(`${GATEWAY_URL}/api/keys`, { headers: { "x-api-key": apiKey } });
});
