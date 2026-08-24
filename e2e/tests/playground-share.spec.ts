import { expect, test } from "@playwright/test";
import { PlaygroundPage, V8_BYTECODE } from "../helpers/playground";

test.describe("playground: sharing", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("a copied link restores code, engines and flags in a fresh page", async ({
    page,
    context,
  }) => {
    const pg = await PlaygroundPage.open(page);
    const marker = `const SHARED_${Date.now()} = 42;`;
    await pg.toggleEngine("Hermes");
    await pg.setCode(marker);

    await pg.shareButton.click();
    await page.getByRole("menuitem", { name: /copy link/i }).click();
    await expect(page.getByRole("button", { name: /share this snippet/i })).toContainText(
      /link copied/i,
    );

    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("?s=");

    const fresh = await context.newPage();
    await fresh.goto(url);
    const restored = new PlaygroundPage(fresh);
    await restored.editorReady();

    await expect(restored.editor).toContainText("SHARED_");
    await expect(restored.engineTab("Hermes")).toBeVisible();
  });

  test("the embed snippet is a usable iframe pointing at the embed route", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("const embedded = 1;");

    await pg.shareButton.click();
    await page.getByRole("menuitem", { name: /copy embed code/i }).click();

    const snippet = await page.evaluate(() => navigator.clipboard.readText());
    expect(snippet).toContain("<iframe");
    expect(snippet).toContain("/embed/playground?s=");
  });

  test("the article link is offered only once there is output to snapshot", async ({ page }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode(`const SNAP_${Date.now()} = 1;`);

    await pg.shareButton.click();
    await expect(page.getByRole("menuitem", { name: /article link/i })).toBeDisabled();
    await page.keyboard.press("Escape");

    await pg.run();

    await pg.shareButton.click();
    const article = page.getByRole("menuitem", { name: /article link/i });
    await expect(article).toBeEnabled();
    await article.click();

    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("/embed/bytecode?b=");
  });

  test("an article link renders the captured dump in the bytecode embed", async ({
    page,
    context,
  }) => {
    const pg = await PlaygroundPage.open(page);
    await pg.setCode("function snapshotMe(a) { return a + 1; } snapshotMe(1);");
    await pg.run();

    await pg.shareButton.click();
    await page.getByRole("menuitem", { name: /article link/i }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());

    const embed = await context.newPage();
    await embed.goto(url);

    await expect(embed.getByText("V8").first()).toBeVisible();
    await expect(embed.getByText(V8_BYTECODE).first()).toBeVisible();
    await expect(embed.getByRole("navigation")).toHaveCount(0);
  });

  test("an old flat-array share link still opens", async ({ page }) => {
    const legacy = Buffer.from(
      JSON.stringify({ c: "const legacy = 1;", e: ["v8"], f: ["--print-bytecode"] }),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await page.goto(`/playground?s=${legacy}`);
    const pg = new PlaygroundPage(page);
    await pg.editorReady();

    await expect(pg.editor).toContainText("legacy");
  });
});
