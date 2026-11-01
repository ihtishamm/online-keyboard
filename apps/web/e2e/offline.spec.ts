import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page, name = "Urdu") => page.getByRole("textbox", { name: `${name} text` });
const key = (page: Page, code: string) => page.locator(`button[data-key="${code}"]`);

/** Everything the page has fetched from the site is in the service worker's caches. */
async function allCached(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const urls = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((url) => url.startsWith(location.origin) && !url.endsWith("/sw.js"));
    const hits = await Promise.all(
      urls.map((u) => caches.match(u, { ignoreSearch: true, ignoreVary: true })),
    );
    return hits.every(Boolean);
  });
}

/** First visit: wait until the worker controls the page and has cached what it used. */
async function firstVisit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("Pages you open work offline.")).toBeVisible({ timeout: 15_000 });
  if (path === "/urdu") await expect(page.locator("html.nastaliq-ready")).toHaveCount(1);
  await expect.poll(() => allCached(page), { timeout: 15_000 }).toBe(true);
}

test.describe("offline", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "service worker tests use Chromium");

  test("the keyboard works offline after the first visit", async ({ page, context, isMobile }) => {
    await firstVisit(page, "/urdu");
    await context.setOffline(true);

    await page.reload();
    await expect(editor(page)).toBeEditable();
    if (isMobile) await key(page, "KeyA").tap();
    else await key(page, "KeyA").click();
    await expect(editor(page)).toHaveValue("ا");
    // Nastaliq comes from the cache.
    const nastaliq = await page.evaluate(async () => {
      await document.fonts.load('20px "Noto Nastaliq Urdu"', "ا");
      return [...document.fonts].some(
        (f) => f.family.includes("Nastaliq") && f.status === "loaded",
      );
    });
    expect(nastaliq).toBe(true);

    // The home page is always there; a page never opened says it isn't saved and lists
    // the pages that are.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/hindi");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await expect(page.getByText("/hindi isn't saved on this device")).toBeVisible();
    await expect(page.getByRole("link", { name: /Urdu Keyboard/ }).first()).toBeVisible();
  });

  test("a saved language works offline, every page of it", async ({ page, context }) => {
    await firstVisit(page, "/hindi");
    const box = page.getByRole("region", { name: "Use it offline" });
    await box.getByRole("button", { name: "Save Hindi for offline" }).click();
    await expect(box.getByRole("status")).toContainText(/Saved \d+ pages/, { timeout: 60_000 });
    await expect(box.getByRole("button", { name: "Remove Hindi from this device" })).toBeVisible();
    await context.setOffline(true);

    // Pages never opened, with their scripts.
    await page.goto("/hindi/inscript");
    await expect(editor(page, "Hindi")).toBeEditable();
    await page.goto("/hindi-typing-test");
    await expect(page.getByRole("textbox").first()).toBeVisible();
    await page.goto("/hindi/to-roman");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
    // The emoji panel, loaded on first use, was fetched while saving.
    await page.goto("/hindi");
    await expect(editor(page, "Hindi")).toBeEditable();
    await page.getByRole("button", { name: "Emoji" }).click();
    await expect(
      page.getByRole("region", { name: "Emoji" }).locator('[role="group"] button').first(),
    ).toBeVisible();

    // Removing it frees the pages again.
    await context.setOffline(false);
    await page.reload();
    await box.getByRole("button", { name: "Remove Hindi from this device" }).click();
    await expect(box.getByRole("status")).toContainText("removed");
    await context.setOffline(true);
    await page.goto("/hindi-typing-test");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  });

  test("emoji used once keeps working offline", async ({ page, context }) => {
    await firstVisit(page, "/urdu");
    await page.getByRole("button", { name: "Emoji" }).click();
    const panel = page.getByRole("region", { name: "Emoji" });
    await expect(panel.locator('[role="group"] button').first()).toBeVisible();
    await expect.poll(() => allCached(page), { timeout: 15_000 }).toBe(true);
    await context.setOffline(true);

    await page.reload();
    await expect(editor(page)).toBeEditable();
    await page.getByRole("button", { name: "Emoji" }).click();
    await panel.getByRole("searchbox", { name: "Search emoji" }).fill("پاکستان");
    await panel.locator('[role="group"] button').first().click();
    await expect(editor(page)).toHaveValue("🇵🇰");
  });

  test("the site is installable", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await (await page.request.get(href!)).json();
    expect(manifest).toMatchObject({ start_url: "/", display: "standalone", short_name: "Likho" });
    for (const icon of manifest.icons as { src: string; type: string }[]) {
      const response = await page.request.get(icon.src);
      expect(response.ok(), icon.src).toBe(true);
      expect(response.headers()["content-type"]).toContain(icon.type.split("+")[0]);
    }
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });
});
