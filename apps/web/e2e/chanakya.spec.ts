import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Chanakya and Walkman Chanakya 905 ↔ Unicode (plan item 10.1). */
async function open(page: Page) {
  await page.goto("/chanakya-to-unicode");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Chanakya text" });
  await expect(input).toBeEditable();
  return input;
}

const unicode = (page: Page) => page.getByRole("textbox", { name: "Unicode Hindi" });
const font = (page: Page) => page.getByRole("combobox", { name: "Font" });

test("detects each encoding and converts as you type", async ({ page }) => {
  const input = await open(page);
  await input.fill("Øã ·¤æØü·ý¤× ãñÐ");
  await expect(unicode(page)).toHaveValue("यह कार्यक्रम है।");
  await expect(font(page).locator("option").first()).toHaveText("Detected: Chanakya");
  await input.fill(";g dk;ZØe gSA");
  await expect(unicode(page)).toHaveValue("यह कार्यक्रम है।");
  await expect(font(page).locator("option").first()).toHaveText("Detected: Walkman Chanakya 905");
});

test("lets the font be chosen by hand", async ({ page }) => {
  const input = await open(page);
  await input.fill("fiQj");
  await expect(unicode(page)).toHaveValue("फिर");
  await font(page).selectOption("Chanakya");
  await expect(unicode(page)).not.toHaveValue("फिर");
  await font(page).selectOption({ index: 0 });
  await expect(unicode(page)).toHaveValue("फिर");
});

test("keeps words in other fonts when pasted from Word", async ({ page }) => {
  const input = await open(page);
  const html = `<p class=MsoNormal><span style='font-family:Calibri'>Report 2026: </span><span style='font-family:"Walkman-Chanakya-905"'>Hkkjr dk LowQy</span></p>`;
  await input.evaluate((el, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", "Report 2026: Hkkjr dk LowQy");
    el.focus();
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, html);
  await expect(unicode(page)).toHaveValue("Report 2026: भारत का स्कूल");
  await expect(page.getByRole("status")).toContainText("Converted the Walkman Chanakya 905 parts");
});

test("converts Unicode to the chosen font and copies it in that font", async ({
  page,
  context,
  browserName,
}) => {
  const input = await open(page);
  await input.fill("¥æ·¤æàæ");
  await page.getByRole("radio", { name: "Unicode → Chanakya" }).click();
  await expect(unicode(page)).toHaveValue("आकाश");
  const legacy = page.getByRole("textbox", { name: "Chanakya text" });
  await expect(legacy).toHaveValue("¥æ·¤æàæ");
  await font(page).selectOption("Walkman Chanakya 905");
  await expect(legacy).toHaveValue("vkdk'k");
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy for Walkman Chanakya 905" }).click();
    await expect(page.getByText("Copied: paste it into your Walkman Chanakya 905")).toBeVisible();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item!.getType("text/html")).text();
    });
    expect(html).toContain("font-family:'Walkman-Chanakya-905'");
  }
});

test("counts unknown codes, and says when text is already Unicode", async ({ page }) => {
  const input = await open(page);
  await input.fill("नमस्ते");
  await expect(page.getByRole("status")).toContainText("already Unicode Hindi");
  await input.fill("·¤£ ·¤æ");
  await expect(page.getByRole("status")).toContainText("1 symbol has no Hindi letter in Chanakya");
});

test("is linked from the Hindi keyboard", async ({ page }) => {
  await page.goto("/hindi");
  await page.getByRole("link", { name: "Chanakya to Unicode" }).click();
  await expect(page).toHaveURL(/\/chanakya-to-unicode$/);
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("¥æ·¤æàæ");
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
