import { expect, test } from "@playwright/test";
import { PlaygroundPage, V8_BYTECODE } from "../helpers/playground";

test.describe("playground: reading the output", () => {
  test("diffs a run against the previous run of the same engine", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("function f(a) { return a + 1; } f(1);");
    await pg.run();

    await pg.setCode("function f(a) { return a * 2; } f(1);");
    await pg.run();

    await expect(pg.diffButton).toBeVisible();
    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();
  });

  test("turns diffing off and back on", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("1 + 1");
    await pg.run();

    await pg.diffButton.click();
    await pg.diffButton.click();

    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();
  });

  test("explains an opcode when it is clicked", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("function f(a) { return a + 1; } f(1);");
    await pg.run();

    const opcode = page.getByRole("button", { name: /^(Ldar|Star|Return|Add)/ }).first();
    await opcode.click();

    await expect(page.getByRole("dialog").or(page.locator("[data-scope='popover']")).first()).toBeVisible();
  });

  test("opens the V8 intrinsics reference and closes it again", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.intrinsicsButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("V8 intrinsics");
    await expect(dialog).toContainText("%");
    await expect(dialog.getByText(/allow-natives-syntax/)).toBeVisible();

    await page.getByRole("button", { name: /close intrinsics reference/i }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("shows the empty state before the first run", async ({ page }) => {
    await PlaygroundPage.open(page);
    await expect(page.getByText("⌘↵ to run").first()).toBeVisible();
  });
});
