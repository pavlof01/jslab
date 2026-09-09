import { expect, test } from "@playwright/test";

import { bytecodeEmbedUrl } from "../helpers/embed";

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

    const trigger = page.getByRole("button", { name: "Explanation: Ready" });
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

    const warning = page.getByRole("button", { name: "Explanation: retry" });
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
