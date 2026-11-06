import { expect, test, type Page } from "@playwright/test";

/**
 * Special keyboards (plan 9c, Batch 4): IPA, Quranic Arabic, Arabic romanisation and pinyin
 * tone marks. Their letters come from rules on what is already typed, so these type through the
 * page as a person would and check the text.
 */

const open = async (page: Page, path: string, name: string) => {
  await page.addInitScript(() => localStorage.setItem("likho:phoneKeyboard", "off"));
  await page.goto(path);
  const editor = page.getByRole("textbox", { name: `${name} text` });
  await expect(editor).toBeEditable();
  return editor;
};

test.describe("special keyboards on a computer", () => {
  test.skip(({ isMobile }) => isMobile, "physical keyboard");

  test("IPA: a letter then = < > or ^ becomes its symbol", async ({ page }) => {
    const editor = await open(page, "/ipa", "IPA (Phonetic Alphabet)");
    await editor.click();
    for (const key of ["KeyN", "Shift+Period", "KeyE", "Equal", "KeyH", "Shift+Digit6"])
      await page.keyboard.press(key);
    await expect(editor).toHaveValue("ŋəʰ");
    // The table lists what the rules make, and the bar offers no capitals.
    await expect(page.getByRole("region", { name: "Letters you build with a key" })).toContainText(
      "ŋ",
    );
    const bar = page.getByRole("group", { name: "Special letters" });
    await page.keyboard.down("Shift");
    await expect(bar.getByRole("button", { name: "ə", exact: true })).toBeVisible();
    await page.keyboard.up("Shift");
  });

  test("Quranic Arabic: AltGr types the Quranic marks, the bar the harakat", async ({ page }) => {
    const editor = await open(page, "/quranic-arabic", "Quranic Arabic");
    await editor.click();
    // ح, fatha (Shift+Q), dagger alif (AltGr+Q).
    for (const key of ["KeyP", "Shift+KeyQ", "Control+Alt+KeyQ"]) await page.keyboard.press(key);
    await expect(editor).toHaveValue("حَٰ");
    await page
      .getByRole("group", { name: "Special letters" })
      .getByRole("button", { name: "sukun", exact: true })
      .click();
    await expect(editor).toHaveValue("حَْٰ");
  });

  test("Arabic romanisation: = adds the mark, ` types ʿ", async ({ page }) => {
    const editor = await open(page, "/arabic-transliteration", "Arabic Romanisation");
    await editor.click();
    for (const key of ["Backquote", "KeyH", "Equal", "KeyS", "Equal", "Equal"])
      await page.keyboard.press(key);
    await expect(editor).toHaveValue("ʿḥš");
  });

  test("pinyin: a tone number after a syllable becomes its mark", async ({ page }) => {
    const editor = await open(page, "/pinyin-tones", "Pinyin with Tone Marks");
    await editor.click();
    for (const key of ["KeyN", "KeyI", "Digit3", "Space", "KeyH", "KeyA", "KeyO", "Digit3"])
      await page.keyboard.press(key);
    await expect(editor).toHaveValue("nǐ hǎo");
  });
});

test("the home page lists the special keyboards apart from the languages", async ({ page }) => {
  await page.goto("/");
  const group = page.getByRole("region", { name: "Special keyboards" }).first();
  for (const name of ["IPA", "Quranic Arabic", "Arabic Romanisation", "Pinyin with Tone Marks"])
    await expect(group.getByRole("link", { name: new RegExp(name) })).toBeVisible();
});

test("pinyin on the phone keyboard: a tone from the symbols page marks the syllable", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phones only");
  // "off" means this page's keyboard rather than the phone's own.
  await page.addInitScript(() => localStorage.setItem("likho:phoneKeyboard", "off"));
  await page.goto("/pinyin-tones");
  const keyboard = page.getByRole("group", { name: "On-screen keyboard" });
  await expect(keyboard).toHaveAttribute("data-phone", "true");
  const editor = page.getByRole("textbox", { name: "Pinyin with Tone Marks text" });
  await expect(editor).not.toHaveAttribute("readonly", "");
  await keyboard.locator('button[data-key="KeyM"]').tap();
  await keyboard.locator('button[data-key="KeyA"]').tap();
  await page.getByRole("button", { name: "Numbers and symbols" }).tap();
  await page.locator('button[data-symbol="3"]').tap();
  await expect(editor).toHaveValue(/^mǎ$/i);
});
