import { expect, test } from "@playwright/test";
import { PlaygroundPage } from "../helpers/playground";

test.describe("playground: samples", () => {
  test("loads a built-in sample into the editor", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.samplesButton.click();

    await expect(page.getByRole("dialog", { name: "Select a sample" })).toBeVisible();
    await page.getByRole("button", { name: /select generator sample/i }).click();

    await expect(pg.editor).toContainText("fibonacci");
  });

  test("loads a V8-internals sample from its own library", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.v8SamplesButton.click();

    await expect(page.getByRole("dialog", { name: "V8 internals" })).toBeVisible();
    await page
      .getByRole("button", { name: /select .* sample/i })
      .first()
      .click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("saves, lists, renames and deletes a custom snippet", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    const name = `probe-${Date.now()}`;

    await pg.setCode("const custom = 'sample';");
    await pg.saveSampleButton.click();
    await page.getByPlaceholder("Sample name").fill(name);
    await page
      .getByRole("button", { name: /^save$/i })
      .last()
      .click();

    await pg.samplesButton.click();
    const browse = page.getByRole("dialog", { name: "Select a sample" });
    await expect(browse).toContainText("Saved samples");
    await expect(browse).toContainText(name);

    const renamed = `${name}-renamed`;
    await page
      .getByRole("button", { name: /^rename$/i })
      .first()
      .click();
    await page.getByPlaceholder("Sample name").fill(renamed);
    await page
      .getByRole("dialog", { name: "Rename snippet" })
      .getByRole("button", { name: /^save$/i })
      .click();
    await expect(browse).toContainText(renamed);

    await page
      .getByRole("button", { name: /^delete$/i })
      .first()
      .click();
    const confirm = page.getByRole("dialog", { name: "Delete snippet" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByRole("dialog", { name: "Select a sample" })).not.toContainText(renamed);
  });

  test("refuses a duplicate snippet name", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    const name = `dupe-${Date.now()}`;

    await pg.setCode("const first = 1;");
    await pg.saveSampleButton.click();
    await page.getByPlaceholder("Sample name").fill(name);
    await page
      .getByRole("button", { name: /^save$/i })
      .last()
      .click();

    await pg.setCode("const second = 2;");
    await pg.saveSampleButton.click();
    await page.getByPlaceholder("Sample name").fill(name);
    await page
      .getByRole("button", { name: /^save$/i })
      .last()
      .click();

    await expect(page.getByRole("dialog", { name: "Save current snippet" })).toBeVisible();
    await expect(page.getByText(/already|taken|exists/i).first()).toBeVisible();
  });

  test("keeps custom snippets across a reload", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    const name = `persist-${Date.now()}`;

    await pg.setCode("const persisted = true;");
    await pg.saveSampleButton.click();
    await page.getByPlaceholder("Sample name").fill(name);
    await page
      .getByRole("button", { name: /^save$/i })
      .last()
      .click();

    await page.reload();
    await pg.editorReady();
    await pg.samplesButton.click();

    await expect(page.getByRole("dialog", { name: "Select a sample" })).toContainText(name);
  });
});
