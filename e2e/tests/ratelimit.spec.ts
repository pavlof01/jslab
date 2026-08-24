import { expect, test } from "@playwright/test";

test("the gateway refuses runs past the heavy bucket with a Retry-After", async ({ request }) => {
  const attempts = 40;
  const responses = await Promise.all(
    Array.from({ length: attempts }, (_, i) =>
      request.post("/api/run", {
        data: { engine: "v8", sourceText: `${i} + ${i}` },
        failOnStatusCode: false,
      }),
    ),
  );
  const statuses = responses.map((r) => r.status());
  const limited = responses.filter((r) => r.status() === 429);

  expect(limited.length).toBeGreaterThan(0);
  for (const r of limited) {
    expect(r.headers()["retry-after"]).toBeTruthy();
  }
});
