import { expect, test } from "@playwright/test";

import { PlaygroundPage, runMessage } from "../helpers/playground";

test.describe("failure handling", () => {
  test("shows a readable wait instead of engine output when rate limited", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", (route) =>
      route.fulfill({
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "7" },
        body: JSON.stringify({ ok: false, error: "rate limit exceeded", meta: { retryAfter: 7 } }),
      }),
    );

    await pg.setCode("1 + 1");
    await pg.runButton.click();

    await expect(
      runMessage(page, "Too many runs — the rate limit kicked in. Try again in 7 seconds."),
    ).toBeVisible();
  });

  test("explains an unreachable gateway", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", (route) => route.abort("failed"));

    await pg.setCode("1 + 1");
    await pg.runButton.click();

    await expect(runMessage(page, /Could not reach the engine service/)).toBeVisible();
  });

  test("explains a gateway that answers with something unreadable", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>nope</html>" }),
    );

    await pg.setCode("1 + 1");
    await pg.runButton.click();

    await expect(runMessage(page, /Run failed \(HTTP 200\)/)).toBeVisible();
  });

  test("warns when the engine truncated its own output", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          stdout: "Ldar a0\n".repeat(50),
          stderr: "",
          artifacts: [],
          meta: {
            engine: "v8",
            durationMs: 5,
            cacheHit: false,
            outputTruncated: true,
            outputLimitBytes: 2097152,
          },
        }),
      }),
    );

    await pg.setCode("1 + 1");
    await pg.runButton.click();

    await expect(runMessage(page, "Output hit the size cap and is truncated.")).toBeVisible();
  });

  test("still renders the visualizer when its trace service is down", async ({ page }) => {
    await page.route("**/api/trace/execute/**", (route) => route.abort("failed"));
    await page.goto("/equality");

    await expect(page.getByRole("textbox", { name: /expression to trace/i })).toBeVisible();
  });

  test("a slow engine leaves the run button usable again afterwards", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          stdout: "Ldar a0",
          stderr: "",
          artifacts: [],
          meta: { engine: "v8", durationMs: 1500, cacheHit: false },
        }),
      });
    });

    await pg.setCode("1 + 1");
    await pg.runButton.click();
    await expect(page.getByRole("button", { name: /^running$/i })).toBeVisible();
    await expect(pg.runButton).toBeEnabled({ timeout: 15_000 });
  });
});
