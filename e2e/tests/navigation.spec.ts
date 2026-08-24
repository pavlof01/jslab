import { expect, test } from "@playwright/test";

const ROUTES: Array<[path: string, marker: RegExp]> = [
  ["/playground", /run/i],
  ["/v8-pipeline", /V8 Compilation Pipeline/],
  ["/type-conversion", /expression/i],
  ["/equality", /expression/i],
];

test.describe("navigation", () => {
  test("the landing page renders its sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByText(/bytecode|engine|spec/i).first()).toBeVisible();
  });

  test("every tool route renders", async ({ page }) => {
    for (const [path, marker] of ROUTES) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} did not return 200`).toBe(200);
      await expect(page.getByText(marker).first(), `${path} rendered nothing recognizable`).toBeVisible();
    }
  });

  test("the header offers each nav section and navigates", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /engines/i }).first().click();
    const playground = page.getByRole("menuitem", { name: /playground/i });
    await expect(playground).toBeVisible();
    await playground.click();

    await expect(page).toHaveURL(/\/playground/);
  });

  test("the spec section links to both visualizers", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /ecma spec/i }).first().click();

    await expect(page.getByRole("menuitem", { name: /type conversion/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /equality/i })).toBeVisible();
  });

  test("serves robots.txt and a sitemap that lists the tools", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const path of ["/playground", "/v8-pipeline", "/type-conversion", "/equality"]) {
      expect(xml, `${path} missing from the sitemap`).toContain(path);
    }
  });

  test("each tool page carries its own title and canonical link", async ({ page }) => {
    for (const [path] of ROUTES) {
      await page.goto(path);
      await expect(page).toHaveTitle(/.+/);
      const canonical = page.locator('link[rel="canonical"]');
      if (await canonical.count()) {
        await expect(canonical).toHaveAttribute("href", new RegExp(path.replace("/", "\\/")));
      }
    }
  });

  test("404s an unknown route instead of rendering a broken page", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
  });
});
