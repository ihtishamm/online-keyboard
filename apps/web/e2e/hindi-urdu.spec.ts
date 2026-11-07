import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Urdu ↔ Hindi (plan item 10.2). */
async function open(page: Page) {
  await page.goto("/urdu-to-hindi");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Urdu text" });
  await expect(input).toBeEditable();
  return input;
}

const output = (page: Page, name: string) => page.getByRole("textbox", { name: `${name} text` });
const listReady = (page: Page) => expect(page.locator("[data-list=ready]")).toBeAttached();

test("fills in the vowels from the word list as you type", async ({ page }) => {
  const input = await open(page);
  await input.fill("پاکستان کی قومی زبان اردو ہے۔");
  await listReady(page);
  await expect(output(page, "Hindi")).toHaveText("पाकिस्तान की क़ौमी ज़बान उर्दू है।");
  await expect(page.getByRole("status")).toContainText("Every word was found");
});

test("underlines words the list lacks, and counts them", async ({ page }) => {
  const input = await open(page);
  await input.fill("پانی زبانوکھا");
  await listReady(page);
  await expect(page.getByRole("status")).toContainText("1 word of 2 isn't in the Hindi word list");
  await expect(output(page, "Hindi").locator("span[title]")).toHaveCount(1);
});

test("turns round by itself for Hindi, and swaps back", async ({ page }) => {
  const input = await open(page);
  await input.fill("भारत की राजधानी दिल्ली है।");
  await expect(page.getByRole("radio", { name: "Hindi → Urdu" })).toBeChecked();
  await listReady(page);
  await expect(output(page, "Urdu")).toHaveText("بھارت کی راجدھانی دلی ہے۔");
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(page.getByRole("textbox", { name: "Urdu text" })).toHaveValue(
    "بھارت کی راجدھانی دلی ہے۔",
  );
});

test("copies the result", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium's");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const input = await open(page);
  await input.fill("کتاب");
  await listReady(page);
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("किताब");
});

test("opens the result in the Hindi keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("کتاب");
  await listReady(page);
  await page.getByRole("button", { name: "Edit in Hindi keyboard" }).click();
  await expect(page).toHaveURL(/\/hindi\/?$/);
});

test("is linked from the Urdu and Hindi keyboards", async ({ page }) => {
  for (const slug of ["urdu", "hindi"]) {
    await page.goto(`/${slug}`);
    const link = page.getByRole("link", { name: "Urdu to Hindi", exact: true });
    await expect(link).toHaveAttribute("href", "/urdu-to-hindi");
  }
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("پانی زبانوکھا");
  await listReady(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill("پاکستان کی قومی زبان اردو ہے۔ لاہور پنجاب کا دارالحکومت ہے۔");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
