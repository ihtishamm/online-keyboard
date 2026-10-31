import { expect, test } from "@playwright/test";

/**
 * Each page downloads only the fonts of its own script (plan item 7.2): the @font-face rules
 * for every script are in the CSS, but their unicode-range subsets load only for text that
 * uses them.
 */
const PAGES = [
  { path: "/hindi", own: /noto-sans-devanagari/, others: /noto-(naskh|nastaliq|sans-bengali)/ },
  { path: "/bangla", own: /noto-sans-bengali/, others: /noto-(naskh|nastaliq|sans-devanagari)/ },
  {
    path: "/arabic",
    own: /noto-naskh-arabic/,
    others: /noto-(nastaliq|sans-devanagari|sans-bengali)/,
  },
];

for (const { path, own, others } of PAGES) {
  test(`${path} loads only its script's fonts`, async ({ page }) => {
    const fonts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "font") fonts.push(r.url());
    });
    await page.goto(path);
    await expect(page.getByRole("textbox")).toBeEditable();
    await page.evaluate(() => document.fonts.ready);
    expect(
      fonts.some((f) => own.test(f)),
      fonts.join("\n"),
    ).toBe(true);
    expect(fonts.filter((f) => others.test(f))).toEqual([]);
  });
}
