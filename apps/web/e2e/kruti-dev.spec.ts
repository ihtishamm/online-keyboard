import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Kruti Dev ↔ Unicode (plan item 10.1). */
async function open(page: Page) {
  await page.goto("/kruti-dev-to-unicode");
  await expect(page.locator("[data-ready]")).toBeAttached();
  const input = page.getByRole("textbox", { name: "Kruti Dev text" });
  await expect(input).toBeEditable();
  return input;
}

test("converts Kruti Dev to Unicode as you type", async ({ page }) => {
  const input = await open(page);
  await input.fill("fgUnh esa dk;ZØe dh fLFkfr");
  await expect(page.getByRole("textbox", { name: "Unicode Hindi" })).toHaveValue(
    "हिन्दी में कार्यक्रम की स्थिति",
  );
});

test("keeps words in other fonts when pasted from Word", async ({ page }) => {
  const input = await open(page);
  const html = `<p class=MsoNormal><span style='font-family:Calibri'>Report 2026: </span><span style='font-family:"Kruti Dev 010"'>ueLrs Hkkjr</span></p>`;
  await input.evaluate((el, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", "Report 2026: ueLrs Hkkjr");
    el.focus();
    el.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, html);
  await expect(input).toHaveValue("Report 2026: ueLrs Hkkjr");
  await expect(page.getByRole("textbox", { name: "Unicode Hindi" })).toHaveValue(
    "Report 2026: नमस्ते भारत",
  );
  await expect(page.getByRole("status")).toContainText("kept 1 run in other fonts");
});

test("says when text is already Unicode, and counts unknown codes", async ({ page }) => {
  const input = await open(page);
  await input.fill("नमस्ते");
  await expect(page.getByRole("status")).toContainText("already Unicode Hindi");
  await input.fill("d¤");
  await expect(page.getByRole("status")).toContainText("1 symbol has no Hindi letter");
});

test("converts Unicode to Kruti Dev and copies it in the font", async ({
  page,
  context,
  browserName,
}) => {
  const input = await open(page);
  await input.fill("fgUnh");
  await page.getByRole("radio", { name: "Unicode → Kruti Dev" }).click();
  // The result carries over to the other side.
  const unicode = page.getByRole("textbox", { name: "Unicode Hindi" });
  await expect(unicode).toHaveValue("हिन्दी");
  await unicode.fill("मर्त्य स्थिति");
  const legacy = page.getByRole("textbox", { name: "Kruti Dev text" });
  await expect(legacy).toHaveValue("eR;Z fLFkfr");
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy for Kruti Dev" }).click();
    await expect(page.getByText("Copied: paste it into your Kruti Dev document")).toBeVisible();
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item!.getType("text/html")).text();
    });
    expect(html).toContain("font-family:'Kruti Dev 010'");
    expect(html).toContain("eR;Z fLFkfr");
  }
});

test("opens the result in the Hindi keyboard", async ({ page }) => {
  const input = await open(page);
  await input.fill("ueLrs");
  await page.getByRole("button", { name: "Edit in Hindi keyboard" }).click();
  await page.waitForURL("**/hindi");
  await expect(page.getByRole("textbox", { name: "Hindi text" })).toHaveValue("नमस्ते");
});

test("is linked from the Hindi keyboard", async ({ page }) => {
  await page.goto("/hindi");
  await page.getByRole("link", { name: "Kruti Dev to Unicode" }).click();
  await expect(page).toHaveURL(/\/kruti-dev-to-unicode$/);
});

test("has no serious accessibility violations", async ({ page }) => {
  const input = await open(page);
  await input.fill("fgUnh");
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
