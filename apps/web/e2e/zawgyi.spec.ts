import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Zawgyi ↔ Unicode Burmese (plan item 10.1). */
async function open(page: Page) {
  await page.goto("/zawgyi-to-unicode");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Zawgyi text" });
  await expect(input).toBeEditable();
  return input;
}

const unicode = (page: Page) => page.getByRole("textbox", { name: "Unicode Burmese" });
const font = (page: Page) => page.getByRole("combobox", { name: "Font" });

const ZAWGYI = "ႏိုင္ငံေတာ္၏ အတိုင္ပင္ခံပုဂၢိဳလ္သည္ ျပည္ေထာင္စုဝန္ႀကီးႏွင့္ အတူ";
const UNICODE = "နိုင်ငံတော်၏ အတိုင်ပင်ခံပုဂ္ဂိုလ်သည် ပြည်ထောင်စုဝန်ကြီးနှင့် အတူ";

test("finds Zawgyi by itself and converts as you type", async ({ page }) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  await expect(unicode(page)).toHaveValue(UNICODE);
  await expect(font(page).locator("option").first()).toHaveText("Detected: Zawgyi");
});

test("says when text is already Unicode", async ({ page }) => {
  const input = await open(page);
  await input.fill(UNICODE);
  await expect(unicode(page)).toHaveValue(UNICODE);
  await expect(page.getByRole("status")).toContainText("already Unicode Burmese");
  await expect(font(page).locator("option").first()).toHaveText("Detected: Unicode");
});

test("converts only the Zawgyi lines of a mixed document, and says so", async ({ page }) => {
  const input = await open(page);
  await input.fill(`${UNICODE}\n${ZAWGYI}`);
  await expect(unicode(page)).toHaveValue(`${UNICODE}\n${UNICODE}`);
  await expect(page.getByRole("status")).toContainText("Converted 1 of 2 lines");
});

test("keeps numbers as numbers, and reads ၀ typed for ဝ", async ({ page }) => {
  const input = await open(page);
  await input.fill("အခန္း ၄\nအ၀တ္အထည္ ၂၀၂၆");
  await expect(unicode(page)).toHaveValue("အခန်း ၄\nအဝတ်အထည် ၂၀၂၆");
});

test("the Font list can force or stop the conversion", async ({ page }) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  await font(page).selectOption("unicode");
  await expect(unicode(page)).toHaveValue(ZAWGYI);
  await input.fill(UNICODE);
  await font(page).selectOption("zawgyi");
  await expect(page.getByRole("status")).toHaveCount(0);
  await font(page).selectOption("auto");
  await expect(page.getByRole("status")).toContainText("already Unicode");
});

test("keeps words in other fonts when pasted from Word", async ({ page }) => {
  const input = await open(page);
  // ျမန္မာ alone is too short to detect: its font says what it is.
  const html = `<p class=MsoNormal><span style='font-family:Calibri'>Report 2026: </span><span style='font-family:"Zawgyi-One"'>ျမန္မာ</span></p>`;
  await input.evaluate((el, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", "Report 2026: ျမန္မာ");
    el.focus();
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, html);
  await expect(unicode(page)).toHaveValue("Report 2026: မြန်မာ");
  await expect(page.getByRole("status")).toContainText("Converted the Zawgyi parts");
});

test("converts Unicode to Zawgyi and copies it in Zawgyi-One", async ({
  page,
  context,
  browserName,
}) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  await page.getByRole("radio", { name: "Unicode → Zawgyi" }).click();
  await expect(unicode(page)).toHaveValue(UNICODE);
  const zawgyi = page.getByRole("textbox", { name: "Zawgyi text" });
  await expect(zawgyi).toHaveValue(/ျပည္ေထာင္စုဝန္ႀကီး/);
  await expect(font(page)).toHaveCount(0);
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy for Zawgyi" }).click();
    await expect(page.getByText("Copied: paste it into your Zawgyi")).toBeVisible();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item!.getType("text/html")).text();
    });
    expect(html).toContain("font-family:'Zawgyi-One'");
  }
});

test("warns about text that is already Zawgyi, and letters Zawgyi lacks", async ({ page }) => {
  await open(page);
  await page.getByRole("radio", { name: "Unicode → Zawgyi" }).click();
  const input = page.getByRole("textbox", { name: "Unicode Burmese" });
  await input.fill(ZAWGYI);
  await expect(page.getByRole("status")).toContainText("looks like Zawgyi already");
  await expect(page.getByRole("textbox", { name: "Zawgyi text" })).toHaveValue(ZAWGYI);
  await input.fill("မြန်မာ ꧢ");
  await expect(page.getByRole("status")).toContainText("Zawgyi has no code for");
});

test("draws Zawgyi in a Zawgyi font, so it isn't garbled", async ({ page }) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('20px "Noto Sans Zawgyi"', "ျမ")))
    .toBe(true);
  await expect(input).toHaveCSS("font-family", /Noto Sans Zawgyi/);
  await expect(unicode(page)).toHaveCSS("font-family", /Noto Sans Myanmar/);
});

test("opens the result in the Burmese keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  await page.getByRole("button", { name: "Edit in Burmese keyboard" }).click();
  await expect(page).toHaveURL(/\/burmese\/?$/);
});

test("is linked from the Burmese keyboard", async ({ page }) => {
  await page.goto("/burmese");
  const link = page.getByRole("link", { name: "Zawgyi to Unicode", exact: true });
  await expect(link).toHaveAttribute("href", "/zawgyi-to-unicode");
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill(ZAWGYI);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact!));
  expect(serious).toEqual([]);
});

test("fits a 360 px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const input = await open(page);
  await input.fill(ZAWGYI);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
