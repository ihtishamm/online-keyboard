import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Serbian Cyrillic ↔ Latin (plan item 10.2). */
async function open(page: Page) {
  await page.goto("/serbian-cyrillic-to-latin");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Serbian Cyrillic text" });
  await expect(input).toBeEditable();
  return input;
}

const output = (page: Page, name: string) =>
  page.getByRole("textbox", { name: `Serbian ${name} text` });
const listReady = (page: Page) => expect(page.locator("[data-list=ready]")).toBeAttached();

test("writes Cyrillic in Latin as you type, with LJ in capitals", async ({ page }) => {
  const input = await open(page);
  await input.fill("ЉУБАВ и Љубав, Његош, џеп.");
  await expect(output(page, "Latin")).toHaveText("LJUBAV i Ljubav, Njegoš, džep.");
});

test("turns round for Latin and keeps digraphs, foreign words and numerals right", async ({
  page,
}) => {
  const input = await open(page);
  await input.fill("Odjednom Tanjug reče da će nadživeti injekciju, Luj XIV i Facebook.");
  await expect(page.getByRole("radio", { name: "Latin → Cyrillic" })).toBeChecked();
  await listReady(page);
  const out = output(page, "Cyrillic");
  await expect(out).toHaveText(
    "Одједном Танјуг рече да ће надживети инјекцију, Луј XIV и Facebook.",
  );
  await expect(out.locator("span[title='Left as it was']")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("2 words stay in Latin");
});

test("puts back marks typed without them, and can be told not to", async ({ page }) => {
  const input = await open(page);
  await input.fill("Medju nama, kuca je velika.");
  await listReady(page);
  const box = page.getByRole("checkbox", { name: /Add missing/ });
  await expect(box).toBeChecked();
  await expect(output(page, "Cyrillic")).toHaveText("Међу нама, кућа је велика.");
  await expect(page.getByRole("status")).toContainText("There is no č, ć, š, ž, đ in your text");
  await box.uncheck();
  await expect(output(page, "Cyrillic")).toHaveText("Медју нама, куца је велика.");
});

test("swaps the result back", async ({ page }) => {
  const input = await open(page);
  await input.fill("Добар дан");
  await page.getByRole("button", { name: "Swap" }).click();
  await expect(page.getByRole("textbox", { name: "Serbian Latin text" })).toHaveValue("Dobar dan");
  await expect(output(page, "Cyrillic")).toHaveText("Добар дан");
});

test("copies the result", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium's");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const input = await open(page);
  await input.fill("Ћирилица");
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Ćirilica");
});

test("opens Cyrillic in the Serbian keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("latinica");
  await listReady(page);
  await page.getByRole("button", { name: "Edit in Serbian keyboard" }).click();
  await expect(page).toHaveURL(/\/serbian\/?$/);
});

test("is linked from the Serbian keyboard", async ({ page }) => {
  await page.goto("/serbian");
  const link = page.getByRole("link", { name: "Serbian Cyrillic to Latin", exact: true });
  await expect(link).toHaveAttribute("href", "/serbian-cyrillic-to-latin");
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("Medju nama, kuca je na Facebook.");
  await listReady(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill("Брза вижљаста лија хоће да ђипи преко лењог флегматичног џукца.");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
