import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const GUIDES = [
  "/guides/type-urdu-on-windows",
  "/guides/type-urdu-on-mac",
  "/guides/type-urdu-on-android-and-iphone",
  "/guides/roman-urdu-to-urdu",
];

async function noSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("the guides index lists every guide in order", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guides");
  const links = page.locator("main li a");
  await expect(links).toHaveCount(GUIDES.length);
  for (const [i, href] of GUIDES.entries())
    await expect(links.nth(i)).toHaveAttribute("href", href);
  await noSeriousViolations(page);
});

for (const path of GUIDES) {
  test(`${path} renders with working links`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    );
    expect(ld["@type"]).toBe("Article");
    expect(ld.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Every table of contents entry points at a heading on the page.
    for (const href of await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      await expect(page.locator(href)).toHaveCount(1);
    }

    // Every internal link in the article resolves.
    const hrefs = await page
      .locator("article a[href^='/']")
      .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(2);
    for (const href of hrefs) {
      const res = await page.request.get(href);
      expect(res.status(), href).toBe(200);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await noSeriousViolations(page);
  });
}

test("the Urdu pages link to the guides", async ({ page }) => {
  await page.goto("/urdu");
  await page
    .getByRole("navigation", { name: "Guides" })
    .getByRole("link", { name: "How to type Urdu on a Mac" })
    .click();
  await expect(page).toHaveURL(/\/guides\/type-urdu-on-mac$/);

  await page.goto("/urdu/roman");
  await page.getByRole("link", { name: "Full guide: Roman Urdu to Urdu" }).click();
  await expect(page).toHaveURL(/\/guides\/roman-urdu-to-urdu$/);
});
