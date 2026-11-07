import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Kazakh Cyrillic ↔ Latin, 2021 and 2018 (plan item 10.2). */
async function open(page: Page) {
  await page.goto("/kazakh-cyrillic-to-latin");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Kazakh Cyrillic text" });
  await expect(input).toBeEditable();
  return input;
}

const output = (page: Page, name: string) =>
  page.getByRole("textbox", { name: `Kazakh ${name} text` });
const listReady = (page: Page) => expect(page.locator("[data-list=ready]")).toBeAttached();

test("writes Cyrillic in 2021 Latin as you type, and in 2018 when chosen", async ({ page }) => {
  const input = await open(page);
  await input.fill("Сәлеметсіз бе! ШАЙ ішеміз.");
  await expect(output(page, "Latin (2021)")).toHaveText("Sälemetsız be! ŞAİ ışemız.");
  await expect(
    page.getByText("Kazakhstan hasn't approved a Latin alphabet yet. This is the latest"),
  ).toBeVisible();
  await page.getByLabel("Latin alphabet").selectOption("2018");
  await expect(output(page, "Latin (2018)")).toHaveText("Sálemetsiz be! SHAI ishemiz.");
});

test("turns round for Latin and reads the version it was written in", async ({ page }) => {
  const input = await open(page);
  await input.fill("Iá, úıge keldim.");
  await expect(page.getByRole("radio", { name: "Latin → Cyrillic" })).toBeChecked();
  await expect(page.getByLabel("Latin alphabet")).toHaveValue("2018");
  await listReady(page);
  await expect(output(page, "Cyrillic")).toHaveText("Иә, үйге келдім.");
});

test("puts back marks typed without them", async ({ page }) => {
  const input = await open(page);
  await input.fill("Qazirgi uaqytta ozen jagasynda");
  await listReady(page);
  await expect(page.getByRole("checkbox", { name: /Add missing/ })).toBeChecked();
  await expect(output(page, "Cyrillic")).toHaveText("Қазіргі уақытта өзен жағасында");
});

test("opens Cyrillic in the Kazakh keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("Qazaqstan");
  await listReady(page);
  await page.getByRole("button", { name: "Edit in Kazakh keyboard" }).click();
  await expect(page).toHaveURL(/\/kazakh\/?$/);
});

test("is linked from the Kazakh keyboard", async ({ page }) => {
  await page.goto("/kazakh");
  const link = page.getByRole("link", { name: "Kazakh Cyrillic to Latin", exact: true });
  await expect(link).toHaveAttribute("href", "/kazakh-cyrillic-to-latin");
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("Qazaqstan jäne Facebook");
  await listReady(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill("Қазақстан Республикасының мемлекеттік рәміздері туралы");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
