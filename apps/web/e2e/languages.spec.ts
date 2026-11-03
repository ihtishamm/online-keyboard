import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The regional language pack. Typing on each page is covered for every language by
 * language-smoke.spec.ts; the accessibility checks here run in the nightly suite.
 */
const LANGUAGES = [
  { path: "/arabic", name: "Arabic" },
  { path: "/farsi", name: "Farsi" },
  { path: "/pashto", name: "Pashto" },
  { path: "/sindhi", name: "Sindhi" },
  { path: "/shahmukhi", name: "Punjabi (Shahmukhi)" },
  { path: "/saraiki", name: "Saraiki" },
  { path: "/balochi", name: "Balochi" },
  { path: "/kashmiri", name: "Kashmiri" },
  { path: "/hindi/inscript", name: "Hindi" },
  { path: "/bangla/inscript", name: "Bangla" },
] as const;

const editor = (page: Page, name: string) => page.getByRole("textbox", { name: `${name} text` });

for (const { path, name } of LANGUAGES) {
  test(`${path} has no serious accessibility violations @nightly`, async ({ page }) => {
    await page.goto(path);
    await expect(editor(page, name)).toBeEditable();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
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

test("Tamil99 composes from the text already typed", async ({ page }) => {
  await page.goto("/tamil/tamil99");
  const box = editor(page, "Tamil");
  await box.click();
  await page.keyboard.type("lks/f");
  await expect(box).toHaveValue("தமிழ்");
  await page.keyboard.press("Space");
  // A doubled consonant gets its pulli, and a soft-hard pair too.
  await page.keyboard.type("akkq lbhkf");
  await expect(box).toHaveValue("தமிழ் அம்மா தங்கம்");
});
