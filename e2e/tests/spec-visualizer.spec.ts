import { expect, test, type Page } from "@playwright/test";

const expression = (page: Page) => page.getByRole("textbox", { name: /expression to trace/i });
const traceButton = (page: Page) => page.getByRole("button", { name: /^trac/i });
const stepCounter = (page: Page) => page.getByLabel(/^Step \d+ of \d+$/);
const nextButton = (page: Page) => page.getByRole("button", { name: /^next$/i });
const prevButton = (page: Page) => page.getByRole("button", { name: /^prev$/i });
const playButton = (page: Page) => page.getByRole("button", { name: /^(play|pause|replay)$/i });

async function currentStep(page: Page): Promise<number> {
  const label = (await stepCounter(page).getAttribute("aria-label")) ?? "";
  return Number(/^Step (\d+)/.exec(label)?.[1] ?? 0);
}

test.describe("equality visualizer", () => {
  test("traces the preset the landing page advertises", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();

    await expect(page.getByText("true").first()).toBeVisible();
    await expect(stepCounter(page)).toBeVisible();
  });

  test("traces the + operator, which the service learned recently", async ({ page }) => {
    await page.goto("/equality");
    await expression(page).fill("[] + {}");
    await expression(page).press("Enter");

    await expect(page.getByText('"[object Object]"').first()).toBeVisible();
    await expect(page.getByText(/ApplyStringOrNumericBinaryOperator/).first()).toBeVisible();
  });

  test("steps forward and back through the trace", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await expect(stepCounter(page)).toBeVisible();

    const start = await currentStep(page);
    await nextButton(page).click();
    expect(await currentStep(page)).toBe(start + 1);

    await prevButton(page).click();
    expect(await currentStep(page)).toBe(start);
  });

  test("steps with the arrow keys", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await expect(stepCounter(page)).toBeVisible();

    const start = await currentStep(page);
    await page.keyboard.press("ArrowRight");
    expect(await currentStep(page)).toBe(start + 1);

    await page.keyboard.press("ArrowLeft");
    expect(await currentStep(page)).toBe(start);
  });

  test("plays through the trace and stops at the end", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await expect(stepCounter(page)).toBeVisible();

    await playButton(page).click();
    await expect(page.getByRole("button", { name: /^replay$/i })).toBeVisible({ timeout: 20_000 });
    await expect(nextButton(page)).toBeDisabled();
  });

  test("pauses playback when a step is picked by hand", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await expect(stepCounter(page)).toBeVisible();

    await playButton(page).click();
    await expect(page.getByRole("button", { name: /^pause$/i })).toBeVisible();
    await prevButton(page).click();

    await expect(page.getByRole("button", { name: /^(play|replay)$/i })).toBeVisible();
  });

  test("explains an expression it cannot parse instead of hanging", async ({ page }) => {
    await page.goto("/equality");
    await expression(page).fill("42");
    await expression(page).press("Enter");

    await expect(page.getByText(/expected a binary expression/i)).toBeVisible();
  });

  test("names every operator it supports in that message", async ({ page }) => {
    await page.goto("/equality");
    await expression(page).fill("42");
    await expression(page).press("Enter");

    await expect(page.getByText(/\+/).first()).toBeVisible();
  });

  test("moves the highlight in the spec panel as steps advance", async ({ page }) => {
    await page.goto("/equality");
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await expect(stepCounter(page)).toBeVisible();

    await expect(page.getByText(/IsLooselyEqual|ToPrimitive|ToNumber/).first()).toBeVisible();
    await nextButton(page).click();
    await nextButton(page).click();
    await expect(page.getByText(/IsLooselyEqual|ToPrimitive|ToNumber/).first()).toBeVisible();
  });
});

test.describe("type-conversion visualizer", () => {
  test("traces the default conversion on load", async ({ page }) => {
    await page.goto("/type-conversion");
    await expect(stepCounter(page)).toBeVisible();
  });

  test("switches the abstract operation with the picker", async ({ page }) => {
    await page.goto("/type-conversion");
    await page.getByRole("combobox", { name: /abstract operation to trace/i }).click();
    await page.getByRole("option", { name: "ToString", exact: true }).click();

    await expect(page.getByText("ToString").first()).toBeVisible();
    await expect(stepCounter(page)).toBeVisible();
  });

  test("runs every advertised operation the service exposes", async ({ page }) => {
    await page.goto("/type-conversion");

    for (const op of ["ToNumeric", "ToObject", "ToPropertyKey", "ToIndex"]) {
      await page.getByRole("combobox", { name: /abstract operation to trace/i }).click();
      await page.getByRole("option", { name: op, exact: true }).click();
      await expression(page).fill("2");
      await expression(page).press("Enter");

      await expect(stepCounter(page), `${op} produced no steps`).toBeVisible();
      await expect(page.getByText(/error|failed/i)).toHaveCount(0);
    }
  });

  test("retraces when the expression changes", async ({ page }) => {
    await page.goto("/type-conversion");
    await expression(page).fill("'42'");
    await expression(page).press("Enter");
    await expect(page.getByText("42").first()).toBeVisible();

    await expression(page).fill("{ valueOf: () => 7 }");
    await expression(page).press("Enter");
    await expect(page.getByText("7").first()).toBeVisible();
  });

  test("keeps the trace button usable while a trace is in flight", async ({ page }) => {
    await page.goto("/type-conversion");
    await expression(page).fill("'123'");
    await traceButton(page).click();

    await expect(traceButton(page)).toHaveText(/^trace$/i, { timeout: 15_000 });
  });
});
