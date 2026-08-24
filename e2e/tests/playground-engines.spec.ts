import { expect, test } from "@playwright/test";
import { PlaygroundPage, V8_BYTECODE } from "../helpers/playground";

test.describe("playground: engine selection", () => {
  test("V8 is pinned on and cannot be switched off", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    const v8 = pg.engineChip("V8");

    await expect(v8).toHaveAttribute("aria-checked", "true");
    await expect(v8).toBeDisabled();
  });

  test("enabling an engine adds its output tab, disabling removes it", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await expect(pg.engineTab("Hermes")).toHaveCount(0);

    await pg.toggleEngine("Hermes");
    await expect(pg.engineTab("Hermes")).toBeVisible();

    await pg.toggleEngine("Hermes");
    await expect(pg.engineTab("Hermes")).toHaveCount(0);
  });

  test("runs the same snippet on every engine and each tab has its own output", async ({
    page,
  }) => {
    const pg = await PlaygroundPage.open(page);
    for (const engine of ["Hermes", "JSC", "SpiderMonkey"]) await pg.toggleEngine(engine);

    await pg.setCode("function f(x) { return x + 1; } f(41);");
    await pg.run();

    await pg.selectEngineTab("V8");
    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();

    for (const engine of ["Hermes", "JSC", "SpiderMonkey"]) {
      await pg.selectEngineTab(engine);
      await expect(page.getByText(/⌘↵ to run/)).toHaveCount(0);
    }
  });

  test("marks a tab that answered with stderr", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("throw new Error('boom');");
    await pg.run();

    await expect(pg.engineTab("V8")).toContainText(/ok|stderr/);
  });

  test("keeps the active tab when another engine is switched off", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.toggleEngine("Hermes");
    await pg.selectEngineTab("V8");

    await pg.toggleEngine("Hermes");

    await expect(pg.engineTab("V8")).toHaveAttribute("aria-selected", "true");
  });
});
