import { expect, test } from "@playwright/test";
import { PlaygroundPage, V8_BYTECODE } from "../helpers/playground";

test.describe("playground: run history", () => {
  test("starts empty and explains itself", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.historyButton.click();

    await expect(page.getByText(/no runs yet/i)).toBeVisible();
  });

  test("records a successful run and restores it into the editor", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    const marker = `const HISTORY_${Date.now()} = 1;`;

    await pg.setCode(marker);
    await pg.run();

    await pg.setCode("const somethingElse = 2;");
    await pg.historyButton.click();
    await expect(page.getByText(/run history/i).first()).toBeVisible();
    await page.getByText(marker.slice(0, 20), { exact: false }).first().click();

    await expect(pg.editor).toContainText("HISTORY_");
  });

  test("does not record a refused run", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("   ");
    await pg.runButton.click();
    await expect(page.getByText("Nothing to run — the editor is empty.")).toBeVisible();

    await pg.historyButton.click();
    await expect(page.getByText(/no runs yet/i)).toBeVisible();
  });

  test("clears the history on demand", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode(`const CLEARED_${Date.now()} = 1;`);
    await pg.run();

    await pg.historyButton.click();
    await page.getByRole("button", { name: /^clear$/i }).click();

    await expect(page.getByText(/no runs yet/i)).toBeVisible();
  });

  test("restores the engine selection along with the code", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.toggleEngine("Hermes");
    await pg.setCode(`const WITH_HERMES_${Date.now()} = 1;`);
    await pg.run();

    await pg.toggleEngine("Hermes");
    await expect(pg.engineTab("Hermes")).toHaveCount(0);

    await pg.historyButton.click();
    await page.getByText(/WITH_HERMES_/).first().click();

    await expect(pg.engineTab("Hermes")).toBeVisible();
  });

  test("survives a reload, because history lives in localStorage", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode(`const RELOADED_${Date.now()} = 1;`);
    await pg.run();
    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible();

    await page.reload();
    await pg.editorReady();
    await pg.historyButton.click();

    await expect(page.getByText(/RELOADED_/).first()).toBeVisible();
  });
});
