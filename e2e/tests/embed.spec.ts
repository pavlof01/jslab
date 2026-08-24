import { expect, test } from "@playwright/test";
import { PlaygroundPage, V8_BYTECODE } from "../helpers/playground";

test.describe("embed widgets", () => {
  test("the playground embed runs code without the site chrome", async ({ page }) => {
    await page.goto("/embed/playground");
    await expect(page.getByText("JSLab").first()).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);

    const pg = new PlaygroundPage(page);
    await pg.editorReady();
    await page.getByRole("button", { name: /^run$/i }).click();

    await expect(page.getByText(V8_BYTECODE).first()).toBeVisible({ timeout: 30_000 });
  });

  test("the playground embed links back to the full site", async ({ page }) => {
    await page.goto("/embed/playground");
    const open = page.getByRole("link", { name: /open in jslab/i });
    await expect(open).toHaveAttribute("href", /\/playground/);
    await expect(open).toHaveAttribute("target", "_blank");
  });

  test("the bytecode embed explains an undecodable snapshot", async ({ page }) => {
    await page.goto("/embed/bytecode");
    await expect(page.getByText(/no readable snapshot/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open jslab/i })).toHaveAttribute("href", "/playground");
  });

  test("the bytecode embed advertises oEmbed discovery in its head", async ({ page }) => {
    await page.goto("/embed/bytecode");
    const link = page.locator('link[rel="alternate"][type="application/json+oembed"]');
    await expect(link).toHaveAttribute("href", /\/embed\/oembed\?format=json&url=/);
  });

  test("embed pages ask not to be indexed", async ({ page }) => {
    for (const path of ["/embed/playground", "/embed/bytecode"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });
});

test.describe("oEmbed provider", () => {
  test("returns a rich document for a playground URL", async ({ request, baseURL }) => {
    const target = `${baseURL}/embed/playground?s=abc`;
    const res = await request.get(`/embed/oembed?url=${encodeURIComponent(target)}`);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ version: "1.0", type: "rich", provider_name: "JSLab" });
    expect(body.html).toContain("<iframe");
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    expect(res.headers()["cache-control"]).toContain("max-age=3600");
  });

  test("refuses a foreign host, a non-embeddable path and a missing snapshot", async ({ request, baseURL }) => {
    const foreign = await request.get(`/embed/oembed?url=${encodeURIComponent("https://evil.example/embed/playground")}`);
    expect(foreign.status()).toBe(404);

    const notEmbeddable = await request.get(`/embed/oembed?url=${encodeURIComponent(`${baseURL}/playground`)}`);
    expect(notEmbeddable.status()).toBe(404);

    const noSnapshot = await request.get(`/embed/oembed?url=${encodeURIComponent(`${baseURL}/embed/bytecode`)}`);
    expect(noSnapshot.status()).toBe(404);
  });

  test("refuses a format it does not speak", async ({ request, baseURL }) => {
    const res = await request.get(
      `/embed/oembed?format=xml&url=${encodeURIComponent(`${baseURL}/embed/playground`)}`,
    );
    expect(res.status()).toBe(501);
  });

  test("clamps the dimensions a consumer asks for", async ({ request, baseURL }) => {
    const res = await request.get(
      `/embed/oembed?maxwidth=9000&maxheight=9000&url=${encodeURIComponent(`${baseURL}/embed/playground`)}`,
    );
    const body = await res.json();
    expect(body.width).toBeLessThanOrEqual(1200);
    expect(body.height).toBeLessThanOrEqual(900);
  });
});
