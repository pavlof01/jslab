import { expect, test } from "@playwright/test";

import { bytecodeEmbedUrl } from "../helpers/embed";
import { PlaygroundPage } from "../helpers/playground";
import { shareUrl } from "../helpers/share";

const source = `/* @annotation
match: status: ready
highlight: ready
title: Ready
text: The operation finished. Execution can continue.
*/
/* @annotation
match: warning: retry
highlight: retry
text: Retry the operation.
*/
print("status: ready");`;

for (const engine of ["v8", "jsc", "sm", "hermes"]) {
  test(`annotations explain stdout and stderr for ${engine}`, async ({ page }, testInfo) => {
    await page.goto(
      bytecodeEmbedUrl({
        code: source,
        engine,
        flags: [],
        output: "header\nstatus: ready\nfooter",
        stderr: "warning: retry",
        title: "Output annotations",
      }),
    );

    const trigger = page.getByRole("button", { name: "ready" });
    await expect(trigger).toHaveText("ready");
    await trigger.hover();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await trigger.click();
    const popover = page.getByRole("dialog", { name: /Ready/ });
    await expect(popover).toContainText("Execution can continue.");
    if (engine === "jsc")
      await page.screenshot({ path: testInfo.outputPath("annotations-desktop.png") });
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();

    const warning = page.getByRole("button", { name: "retry" });
    await warning.click();
    await expect(page.getByRole("dialog", { name: /retry/ })).toContainText("Retry the operation.");
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 360, height: 640 });
    await trigger.click();
    await expect(popover).toContainText("Execution can continue.");
    const bounds = await popover.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360);
    if (engine === "jsc")
      await page.screenshot({ path: testInfo.outputPath("annotations-mobile.png") });
  });
}

test("a shared playground link keeps its annotations through a real d8 run", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(shareUrl(source, ["v8"], { v8: ["--print-bytecode"] }));
  const pg = new PlaygroundPage(page);
  await pg.editorReady();

  await pg.shareButton.click();
  await page.getByRole("menuitem", { name: /copy link/i }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());

  const fresh = await context.newPage();
  await fresh.goto(url);
  const restored = new PlaygroundPage(fresh);
  await restored.editorReady();
  await restored.run();

  const trigger = fresh.getByRole("button", { name: "ready" }).first();
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await expect(fresh.getByRole("dialog", { name: /Ready/ })).toContainText(
    "Execution can continue.",
  );
});

test("the help loads an annotated example that explains real V8 bytecode", async ({ page }) => {
  const pg = await PlaygroundPage.open(page);
  await page.getByRole("button", { name: "How to annotate the output" }).click();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(pg.editor).toContainText("@annotation");

  await pg.run();
  const add = page.getByRole("button", { name: "Add", exact: true });
  await expect(add).toBeVisible({ timeout: 20_000 });
  await add.click();
  await expect(page.getByRole("dialog", { name: /Add with feedback/ })).toContainText(
    "feedback vector",
  );
});

test("typing @ at the start of a line offers the annotation template", async ({ page }) => {
  const pg = await PlaygroundPage.open(page);
  await page.locator(".monaco-editor .view-lines").first().click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.type("@annot");
  const suggestion = page.locator(".monaco-editor .suggest-widget").getByText("@annotation");
  await expect(suggestion).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(pg.editor).toContainText("match:");
  await expect(pg.editor).toContainText("text to find in the output");
});
