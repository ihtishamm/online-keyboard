import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function noSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test("lists a chart and a PDF for every layout", async ({ page }) => {
  await page.goto("/cheat-sheets");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Printable keyboard charts");
  const charts = page.getByRole("link", { name: /^(?!PDF).* chart$/ });
  // 47 keyboard layouts (12, then 35 Latin in 7.5 and 7.7) and 11 Roman schemes.
  await expect(charts).toHaveCount(58);
  await expect(
    page.getByRole("link", { name: "PDF for the Urdu Roman Urdu chart" }),
  ).toHaveAttribute("href", "/cheat-sheets/urdu-roman.pdf");
  await noSeriousViolations(page);
});

test("shows the layout, offers the PDF, and prints the sheet alone", async ({ page }) => {
  await page.goto("/cheat-sheets/urdu-phonetic");
  const sheet = page.getByRole("article", { name: /Urdu Phonetic keyboard layout/ });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Type online for free at");

  const href = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
  const pdf = await page.request.get(href!);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.emulateMedia({ media: "print" });
  await expect(sheet).toBeVisible();
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeHidden();
  await expect(page.locator("body > header")).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  // On phones the sheet scrolls inside its frame; the page itself does not.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await noSeriousViolations(page);
});

test("keyboard pages link to their printable chart", async ({ page }) => {
  await page.goto("/urdu/standard");
  await page.getByRole("link", { name: "Printable Standard chart" }).click();
  await expect(page).toHaveURL(/\/cheat-sheets\/urdu-standard$/);
  await expect(page.getByRole("article", { name: /Urdu Standard keyboard layout/ })).toBeVisible();
});
