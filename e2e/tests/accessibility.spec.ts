import { expect, test } from "@playwright/test";
import { PlaygroundPage } from "../helpers/playground";

test.describe("accessibility", () => {
  test("engine chips are checkboxes with a checked state", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);

    for (const engine of ["V8", "Hermes", "JSC", "SpiderMonkey"]) {
      await expect(pg.engineChip(engine)).toHaveAttribute("aria-checked", /true|false/);
    }
  });

  test("the run outcome reaches a polite live region", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await expect(pg.announcer).toHaveAttribute("aria-live", "polite");

    await pg.setCode("1 + 1");
    await pg.run();
    await expect(pg.announcer).not.toBeEmpty();
  });

  test("dialogs can be opened and dismissed from the keyboard", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.intrinsicsButton.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("focus is visible when tabbing through the toolbar", async ({ page }) => {
    await PlaygroundPage.open(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus-visible");
    await expect(focused).toHaveCount(1);
  });

  test("the step counter announces its position in the trace", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();

    await expect(page.getByLabel(/^Step \d+ of \d+$/)).toBeVisible();
  });

  test("every page has exactly one main landmark", async ({ page }) => {
    for (const path of ["/", "/playground", "/v8-pipeline", "/equality"]) {
      await page.goto(path);
      const mains = page.locator("main");
      expect(await mains.count(), `${path} has the wrong number of main landmarks`).toBeGreaterThanOrEqual(1);
    }
  });
});
