import { expect, test } from "@playwright/test";
import { PlaygroundPage, runMessage, V8_BYTECODE } from "../helpers/playground";

test.describe("playground: running code", () => {
  test("runs a snippet and shows V8 bytecode", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("function add(a, b) { return a + b; } add(1, 2);");
    await pg.run();

    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();
  });

  test("runs via ⌘/Ctrl+Enter inside the real editor", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "const doubled = 21 * 2;");
    await pg.runWithKeyboard();

    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();
  });

  test("refuses an empty editor without calling the gateway", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "");
    let calls = 0;
    await page.route("**/api/run", (route) => {
      calls += 1;
      return route.continue();
    });

    await pg.runButton.click();

    await expect(runMessage(page, "Nothing to run — the editor is empty.")).toBeVisible();
    expect(calls).toBe(0);
  });

  test("announces the outcome in the live region for screen readers", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "1 + 1");
    await pg.run();

    await expect(pg.announcer).toContainText(/run finished/i);
  });

  test("shows the run duration in the pane footer", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "2 + 2");
    await pg.run();

    await expect(runMessage(page, /Duration: \d+ ms/)).toBeVisible();
  });

  test("marks the second identical run as served from cache", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, `const cacheProbe = ${Date.now()};`);
    await pg.run();
    await pg.run();

    await expect(runMessage(page, /Duration: \d+ ms · cached/)).toBeVisible();
  });

  test("surfaces a syntax error from the engine instead of silence", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "function ( { syntax error");
    await pg.run();

    await expect(page.getByText(/SyntaxError|Unexpected/i).first()).toBeVisible();
  });

  test("keeps the editor content after a run", async ({ page }) => {
    const pg = await PlaygroundPage.openWith(page, "const KEEP_ME = 7;");
    await pg.run();

    await expect(pg.editor).toContainText("KEEP_ME");
  });
});
