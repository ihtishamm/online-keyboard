import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Shahmukhi ↔ Gurmukhi (plan item 10.2). */
async function open(page: Page) {
  await page.goto("/shahmukhi-to-gurmukhi");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Shahmukhi text" });
  await expect(input).toBeEditable();
  return input;
}

const output = (page: Page, name: string) => page.getByRole("textbox", { name: `${name} text` });
const listReady = (page: Page) => expect(page.locator("[data-list=ready]")).toBeAttached();

test("fills in the vowels from the word list as you type", async ({ page }) => {
  const input = await open(page);
  await input.fill("میں پنجابی بولدا ہاں۔");
  await listReady(page);
  await expect(output(page, "Gurmukhi")).toHaveText("ਮੈਂ ਪੰਜਾਬੀ ਬੋਲਦਾ ਹਾਂ।");
  await expect(page.getByRole("status")).toContainText("Every word was found");
});

test("underlines words the list lacks, and counts them", async ({ page }) => {
  const input = await open(page);
  await input.fill("پنجابی زبانوکھا");
  await listReady(page);
  await expect(page.getByRole("status")).toContainText(
    "1 word of 2 isn't in the Gurmukhi word list",
  );
  await expect(output(page, "Gurmukhi").locator("span[title]")).toHaveCount(1);
});

test("turns round by itself for Gurmukhi, and swaps back", async ({ page }) => {
  const input = await open(page);
  await input.fill("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ");
  await expect(page.getByRole("radio", { name: "Gurmukhi → Shahmukhi" })).toBeChecked();
  await listReady(page);
  await expect(output(page, "Shahmukhi")).toHaveText("ست سری اکال");
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(page.getByRole("textbox", { name: "Shahmukhi text" })).toHaveValue("ست سری اکال");
});

test("copies the result", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium's");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const input = await open(page);
  await input.fill("پانی");
  await listReady(page);
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ਪਾਣੀ");
});

test("opens the result in the Punjabi keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("پانی");
  await listReady(page);
  await page.getByRole("button", { name: "Edit in Gurmukhi keyboard" }).click();
  await expect(page).toHaveURL(/\/punjabi\/?$/);
});

test("is linked from both Punjabi keyboards", async ({ page }) => {
  for (const slug of ["punjabi", "shahmukhi"]) {
    await page.goto(`/${slug}`);
    const link = page.getByRole("link", { name: "Shahmukhi to Gurmukhi", exact: true });
    await expect(link).toHaveAttribute("href", "/shahmukhi-to-gurmukhi");
  }
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("پنجابی زبانوکھا");
  await listReady(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill("میں پنجابی بولدا ہاں۔ لاہور پنجاب دا دارالحکومت اے۔");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
