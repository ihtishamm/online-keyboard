import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Golden text for each regional language: US keys typed and the text they must produce. */
const LANGUAGES = [
  { path: "/arabic", name: "Arabic", keys: "lvpfh", text: "مرحبا" },
  { path: "/farsi", name: "Farsi", keys: "sghl", text: "سلام" },
  { path: "/pashto", name: "Pashto", keys: "FAj,", text: "پښتو" },
  { path: "/sindhi", name: "Sindhi", keys: "sn\\i", text: "سنڌي" },
  { path: "/shahmukhi", name: "Punjabi (Shahmukhi)", keys: "pnjabi", text: "پنجابی" },
  { path: "/saraiki", name: "Saraiki", keys: "sraEiki", text: "سرائیکی" },
  { path: "/balochi", name: "Balochi", keys: "blwcy", text: "بلوچی" },
  { path: "/kashmiri", name: "Kashmiri", keys: "k-xPr", text: "کٲشُر" },
  { path: "/hindi/inscript", name: "Hindi", keys: "vcmdls", text: "नमस्ते" },
  { path: "/bangla/inscript", name: "Bangla", keys: "yexne", text: "বাংলা" },
] as const;

const editor = (page: Page, name: string) => page.getByRole("textbox", { name: `${name} text` });

/** keyboard.type() sends capitals without Shift held, so press Shift+key for those. */
async function typeKeys(page: Page, keys: string) {
  for (const ch of keys) {
    if (/[A-Z]/.test(ch)) await page.keyboard.press(`Shift+Key${ch}`);
    else await page.keyboard.type(ch);
  }
}

for (const { path, name, keys, text } of LANGUAGES) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await expect(editor(page, name)).toBeEditable();
    });

    test(`types ${text} from the physical keyboard`, async ({ page, isMobile }) => {
      test.skip(isMobile, "physical keyboard test");
      await editor(page, name).click();
      await typeKeys(page, keys);
      await expect(editor(page, name)).toHaveValue(text);
    });

    test("has no serious accessibility violations", async ({ page }) => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  });
}

test("Arabic letters on punctuation keys stay on the phone keyboard", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch devices only");
  await page.goto("/arabic");
  await expect(editor(page, "Arabic")).toBeEditable();
  // ج, د, ك and ط live on [ ] ; ' in Arabic (101).
  for (const code of ["BracketLeft", "BracketRight", "Semicolon", "Quote"]) {
    await expect(page.locator(`button[data-key="${code}"]`)).toBeVisible();
  }
  await page.locator('button[data-key="BracketLeft"]').tap();
  await expect(editor(page, "Arabic")).toHaveValue("ج");
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewport.width,
  );
});

test("Hindi pages use a Devanagari font and skip Nastaliq", async ({ page }) => {
  await page.goto("/hindi");
  await expect(editor(page, "Hindi")).toHaveClass(/font-devanagari/);
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
  await expect(page.locator("html")).not.toHaveClass(/nastaliq-ready/);
});

// Balochi has no Wikipedia, so no word list (plan item 6.1).
test("Balochi hides the word-suggestion bar it has no word list for", async ({ page }) => {
  await page.goto("/balochi");
  await expect(editor(page, "Balochi")).toBeEditable();
  await expect(page.getByRole("group", { name: "Word suggestions" })).toHaveCount(0);
});

test("home page links every language", async ({ page }) => {
  await page.goto("/");
  for (const { path } of LANGUAGES) {
    const home = path.split("/").slice(0, 2).join("/");
    // The list by region shows first; the same links by script are a tab away.
    await expect(page.locator(`[data-browse="region"] a[href="${home}"]`)).toBeVisible();
    await expect(page.locator(`[data-browse="script"] a[href="${home}"]`)).toBeAttached();
  }
});
