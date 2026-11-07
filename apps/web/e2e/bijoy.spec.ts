import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Bijoy ↔ Unicode Bangla (plan item 10.1). */
async function open(page: Page) {
  await page.goto("/bijoy-to-unicode");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Bijoy text" });
  await expect(input).toBeEditable();
  return input;
}

const unicode = (page: Page) => page.getByRole("textbox", { name: "Unicode Bangla" });

test("converts as you type, in either Bijoy spelling", async ({ page }) => {
  const input = await open(page);
  await input.fill("Avgvi †mvbvi evsjv");
  await expect(unicode(page)).toHaveValue("আমার সোনার বাংলা");
  await input.fill("we¯ÍvwiZ");
  await expect(unicode(page)).toHaveValue("বিস্তারিত");
  await input.fill("we¯—vwiZ");
  await expect(unicode(page)).toHaveValue("বিস্তারিত");
});

test("keeps words in other fonts when pasted from Word", async ({ page }) => {
  const input = await open(page);
  const html = `<p class=MsoNormal><span style='font-family:Calibri'>Report 2026: </span><span style='font-family:SutonnyMJ'>Avgvi evsjv</span></p>`;
  await input.evaluate((el, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", "Report 2026: Avgvi evsjv");
    el.focus();
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, html);
  await expect(unicode(page)).toHaveValue("Report 2026: আমার বাংলা");
  await expect(page.getByRole("status")).toContainText("Converted the Bijoy parts");
});

test("converts Unicode to Bijoy and copies it in SutonnyMJ", async ({
  page,
  context,
  browserName,
}) => {
  const input = await open(page);
  await input.fill("wek¦we`¨vjq");
  await page.getByRole("radio", { name: "Unicode → Bijoy" }).click();
  await expect(unicode(page)).toHaveValue("বিশ্ববিদ্যালয়".normalize("NFC"));
  await expect(page.getByRole("textbox", { name: "Bijoy text" })).toHaveValue("wek¦we`¨vjq");
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy for Bijoy" }).click();
    await expect(page.getByText("Copied: paste it into your Bijoy")).toBeVisible();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item!.getType("text/html")).text();
    });
    expect(html).toContain("font-family:'SutonnyMJ'");
  }
});

test("counts unknown codes, and says when text is already Unicode", async ({ page }) => {
  const input = await open(page);
  await input.fill("আমার সোনার বাংলা");
  await expect(page.getByRole("status")).toContainText("already Unicode Bangla");
  await input.fill("Avgvi@");
  await expect(page.getByRole("status")).toContainText("1 symbol has no Bangla letter in Bijoy");
});

test("is linked from the Bangla keyboard", async ({ page }) => {
  await page.goto("/bangla");
  await page.getByRole("link", { name: "Bijoy to Unicode" }).click();
  await expect(page).toHaveURL(/\/bijoy-to-unicode$/);
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("Avgvi †mvbvi evsjv");
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
