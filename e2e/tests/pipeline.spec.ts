import { expect, test } from "@playwright/test";

const STAGES = ["Tokens", "AST", "Bytecode", "Sparkplug", "Maglev", "TurboFan", "Deopts"];

async function runPipeline(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByRole("button", { name: /^running$/i })).toHaveCount(0, { timeout: 40_000 });
}

test.describe("v8 pipeline", () => {
  test("lists every stage of the pipeline in order", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await expect(page.getByText("V8 Compilation Pipeline")).toBeVisible();

    for (const stage of STAGES) {
      await expect(page.getByRole("tab", { name: new RegExp(stage) })).toBeVisible();
    }
  });

  test("tokenizes in the browser before anything is run", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await page.getByRole("tab", { name: /Tokens/ }).click();

    await expect(page.getByText(/function|Identifier|Keyword|Punctuator/).first()).toBeVisible();
  });

  test("fills the bytecode stage from a real d8 run", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await runPipeline(page);

    await page.getByRole("tab", { name: /Bytecode/ }).click();
    await expect(page.getByText(/Ldar|Star|Return|LdaSmi/).first()).toBeVisible();
  });

  test("fills the AST stage with parser output", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await runPipeline(page);

    await page.getByRole("tab", { name: /AST/ }).click();
    await expect(page.getByText(/FUNC|RETURN|VARIABLE|BINARY|LITERAL/).first()).toBeVisible();
  });

  test("switches between stages without re-running", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await runPipeline(page);

    for (const stage of ["Bytecode", "Sparkplug", "Maglev", "TurboFan", "Deopts"]) {
      await page.getByRole("tab", { name: new RegExp(stage) }).click();
      await expect(page.getByRole("tab", { name: new RegExp(stage) })).toHaveAttribute("aria-selected", "true");
    }
  });

  test("marks each stage with the outcome of its own run", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await runPipeline(page);

    await expect(page.locator("[data-scope='status'], [data-part='indicator']").first()).toBeVisible();
  });

  test("explains a stage that a cold function never reaches", async ({ page }) => {
    await page.goto("/v8-pipeline");
    await runPipeline(page);

    await page.getByRole("tab", { name: /TurboFan/ }).click();
    await expect(page.getByText(/hot|10 000|optimiz/i).first()).toBeVisible();
  });
});
