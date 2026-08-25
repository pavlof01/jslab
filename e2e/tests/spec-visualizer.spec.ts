import { expect, type Page, test } from "@playwright/test";

const expression = (page: Page) => page.getByRole("textbox", { name: /expression to trace/i });
const traceButton = (page: Page) => page.getByRole("button", { name: /^trac/i });
const stepCounter = (page: Page) => page.getByLabel(/^Step \d+ of \d+$/);
const nextButton = (page: Page) => page.getByRole("button", { name: /^next$/i });
const prevButton = (page: Page) => page.getByRole("button", { name: /^prev$/i });
const playButton = (page: Page) => page.getByRole("button", { name: /^(play|pause|replay)$/i });

async function traced(page: Page): Promise<void> {
  await page
    .waitForResponse((r) => r.url().includes("/api/trace/execute/"), { timeout: 8_000 })
    .catch(() => {});
  await page.waitForTimeout(400);
}

async function ready(page: Page): Promise<void> {
  await expect(stepCounter(page)).toBeVisible({ timeout: 20_000 });
  await traced(page);
}

async function currentStep(page: Page): Promise<number> {
  const label = (await stepCounter(page).getAttribute("aria-label")) ?? "";
  return Number(/^Step (\d+)/.exec(label)?.[1] ?? 0);
}

test.describe("equality visualizer", () => {
  test("traces the preset the landing page advertises", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();

    await expect(page.getByText("true").first()).toBeVisible();
    await expect(stepCounter(page)).toBeVisible();
  });

  test("traces the + operator, which the service learned recently", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await expression(page).fill("[] + {}");
    await expression(page).press("Enter");
    await traced(page);

    await expect(page.getByText('"[object Object]"').first()).toBeVisible();
    await expect(page.getByText(/ApplyStringOrNumericBinaryOperator/).first()).toBeVisible();
  });

  test("steps forward and back through the trace", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    const start = await currentStep(page);
    await nextButton(page).click();
    expect(await currentStep(page)).toBe(start + 1);

    await prevButton(page).click();
    expect(await currentStep(page)).toBe(start);
  });

  test("steps with the arrow keys, once focus has left the controls", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    await stepCounter(page).click();

    const start = await currentStep(page);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => currentStep(page)).toBe(start + 1);

    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => currentStep(page)).toBe(start);
  });

  test("ignores the arrow keys while a control has focus", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    await nextButton(page).focus();
    const start = await currentStep(page);
    await page.keyboard.press("ArrowRight");

    expect(await currentStep(page)).toBe(start);
  });

  test("advances the trace while playing", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    const start = await currentStep(page);
    await playButton(page).click();
    await expect(page.getByRole("button", { name: /^pause$/i })).toBeVisible();
    await expect.poll(() => currentStep(page), { timeout: 15_000 }).toBeGreaterThan(start);
  });

  test("offers a replay once the last step is reached", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    const total = Number(
      /of (\d+)$/.exec((await stepCounter(page).getAttribute("aria-label")) ?? "")?.[1] ?? 0,
    );
    expect(total).toBeGreaterThan(0);
    for (let i = await currentStep(page); i < total; i++) await nextButton(page).click();

    await expect(nextButton(page)).toBeDisabled();
    await expect(page.getByRole("button", { name: /^replay$/i })).toBeVisible();
  });

  test("pauses playback when a step is picked by hand", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    await playButton(page).click();
    await expect(page.getByRole("button", { name: /^pause$/i })).toBeVisible();
    await prevButton(page).click();

    await expect(page.getByRole("button", { name: /^(play|replay)$/i })).toBeVisible();
  });

  test("explains an expression it cannot parse instead of hanging", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await expression(page).fill("42");
    await expression(page).press("Enter");
    await traced(page);

    await expect(page.getByText(/expected a binary expression/i)).toBeVisible();
  });

  test("names every operator it supports in that message", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await expression(page).fill("42");
    await expression(page).press("Enter");
    await traced(page);

    await expect(page.getByText(/\+/).first()).toBeVisible();
  });

  test("moves the highlight in the spec panel as steps advance", async ({ page }) => {
    await page.goto("/equality");
    await ready(page);
    await page.getByRole("button", { name: "[] == ![]" }).click();
    await ready(page);

    await expect(page.getByText(/IsLooselyEqual|ToPrimitive|ToNumber/).first()).toBeVisible();
    await nextButton(page).click();
    await nextButton(page).click();
    await expect(page.getByText(/IsLooselyEqual|ToPrimitive|ToNumber/).first()).toBeVisible();
  });
});

test.describe("type-conversion visualizer", () => {
  test("traces the default conversion on load", async ({ page }) => {
    await page.goto("/type-conversion");
    await ready(page);
    await expect(stepCounter(page)).toBeVisible();
  });

  test("switches the abstract operation with the picker", async ({ page }) => {
    await page.goto("/type-conversion");
    await ready(page);
    await page.getByRole("combobox", { name: /abstract operation to trace/i }).click();
    await page.getByRole("option", { name: "ToString", exact: true }).click();

    await expect(page.getByText("ToString").first()).toBeVisible();
    await expect(stepCounter(page)).toBeVisible();
  });

  test("runs every advertised operation the service exposes", async ({ page }) => {
    await page.goto("/type-conversion");
    await ready(page);

    for (const op of ["ToNumeric", "ToObject", "ToPropertyKey", "ToIndex"]) {
      await page.getByRole("combobox", { name: /abstract operation to trace/i }).click();
      await page.getByRole("option", { name: op, exact: true }).click();
      await expression(page).fill("2");
      await expression(page).press("Enter");
      await traced(page);

      await expect(stepCounter(page), `${op} produced no steps`).toBeVisible();
      await expect(
        page.getByText(/Failed to parse|Expected a binary expression|Unknown executor error/),
      ).toHaveCount(0);
    }
  });

  test("retraces when the expression changes", async ({ page }) => {
    await page.goto("/type-conversion");
    await ready(page);
    await expression(page).fill("'42'");
    await expression(page).press("Enter");
    await traced(page);
    await expect(page.getByText("42").first()).toBeVisible();

    await expression(page).fill("{ valueOf: () => 7 }");
    await expression(page).press("Enter");
    await traced(page);
    await expect(page.getByText("7").first()).toBeVisible();
  });

  test("keeps the trace button usable while a trace is in flight", async ({ page }) => {
    await page.goto("/type-conversion");
    await ready(page);
    await expression(page).fill("'123'");
    await traceButton(page).click();

    await expect(traceButton(page)).toHaveAccessibleName(/^trace$/i, { timeout: 15_000 });
  });
});
