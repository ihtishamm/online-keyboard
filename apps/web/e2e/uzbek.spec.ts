import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Uzbek Cyrillic ↔ Latin, 1995 and 2027 (plan item 10.2). */
async function open(page: Page) {
  await page.goto("/uzbek-cyrillic-to-latin");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Uzbek Cyrillic text" });
  await expect(input).toBeEditable();
  return input;
}

const output = (page: Page, name: string) =>
  page.getByRole("textbox", { name: `Uzbek ${name} text` });
const listReady = (page: Page) => expect(page.locator("[data-list=ready]")).toBeAttached();

test("writes Cyrillic in Latin, and in the 2027 alphabet when chosen", async ({ page }) => {
  const input = await open(page);
  await input.fill("Ўзбекистон, шаҳар, маъно, Исҳоқ");
  await expect(output(page, "Latin (1995)")).toHaveText("Oʻzbekiston, shahar, maʼno, Isʼhoq");
  await page.getByLabel("Latin alphabet").selectOption("2027");
  await expect(output(page, "Latin (2027)")).toHaveText("Özbekiston, şahar, maʼno, Isʼhoq");
});

test("turns round for Latin with any apostrophe, and gets Russian words right", async ({
  page,
}) => {
  const input = await open(page);
  await input.fill("O'zbekiston konsertlari iyunda");
  await expect(page.getByRole("radio", { name: "Latin → Cyrillic" })).toBeChecked();
  await listReady(page);
  await expect(output(page, "Cyrillic")).toHaveText("Ўзбекистон концертлари июньда");
});

test("reads 2027 Latin and switches between the two Latin alphabets", async ({ page }) => {
  const input = await open(page);
  await input.fill("Özbekiston, çoy");
  await expect(page.getByLabel("Latin alphabet")).toHaveValue("2027");
  await expect(output(page, "Cyrillic")).toHaveText("Ўзбекистон, чой");
  await page.getByRole("radio", { name: "1995 ↔ 2027" }).click();
  await expect(output(page, "Latin (1995)")).toHaveText("Oʻzbekiston, choy");
});

test("opens Latin in the Uzbek keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("Ўзбекча");
  await page.getByRole("button", { name: "Edit in Uzbek keyboard" }).click();
  await expect(page).toHaveURL(/\/uzbek\/?$/);
});

test("is linked from the Uzbek keyboard", async ({ page }) => {
  await page.goto("/uzbek");
  const link = page.getByRole("link", { name: "Uzbek Cyrillic to Latin", exact: true });
  await expect(link).toHaveAttribute("href", "/uzbek-cyrillic-to-latin");
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("Oʻzbekiston va Facebook");
  await listReady(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill("Барча одамлар эркин, қадр-қиммат ва ҳуқуқларда тенг бўлиб туғиладилар.");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
