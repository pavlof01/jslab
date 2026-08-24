import { expect, test } from "@playwright/test";
import { PlaygroundPage, runMessage } from "../helpers/playground";

test.describe("playground: flags", () => {
  test("shows a picker for V8 and reports how many flags are selected", async ({ page }) => {
    await PlaygroundPage.open(page);
    await expect(page.getByText(/\d+ v8 flags?/i).first()).toBeVisible();
  });

  test("picking a flag changes the run's output", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("function f(a) { return a * 2; } f(21);");

    await page
      .getByText(/v8 flags?/i)
      .first()
      .click();
    await page.getByRole("option", { name: /^print-ast/ }).click();
    await page.keyboard.press("Escape");

    await pg.run();

    await expect(page.getByText(/FUNC|RETURN|VARIABLE|BINARY/).first()).toBeVisible();
  });

  test("offers a separate picker for each enabled engine", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await expect(page.getByText(/hermes flags?/i)).toHaveCount(0);

    await pg.toggleEngine("Hermes");

    await expect(page.getByText(/hermes flags?/i).first()).toBeVisible();
  });

  test("reports flags the gateway refused instead of dropping them silently", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await page.route("**/api/run", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const options = (body.options ?? {}) as Record<string, unknown>;
      const flags = Array.isArray(options.flags) ? options.flags : [];
      await route.continue({
        postData: JSON.stringify({
          ...body,
          options: { ...options, flags: [...flags, "--totally-made-up"] },
        }),
      });
    });

    await pg.setCode("1 + 1");
    await pg.run();

    await expect(runMessage(page, /ignored by this engine: --totally-made-up/)).toBeVisible();
  });
});
