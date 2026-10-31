import { expect, test, type Page } from "@playwright/test";

/**
 * Suggestions, spell check and autocorrect beyond Urdu (plan item 6.6). Every example here
 * is checked against the shipped word lists by these tests themselves.
 */
async function open(page: Page, path: string, name: string) {
  const words = page.waitForResponse((r) => /\/dict\.[^/]+\.txt$/.test(r.url()));
  await page.goto(path);
  const editor = page.getByRole("textbox", { name: `${name} text` });
  await expect(editor).toBeEditable();
  return { editor, words };
}

const count = (page: Page) => page.getByRole("button", { name: /possible misspelling/ });

test("Pashto: spell check is on and underlines a misspelling", async ({ page }) => {
  const { editor, words } = await open(page, "/pashto", "Pashto");
  await editor.fill("زه کور ته ځم ");
  await words;
  await expect(editor).toHaveAttribute("data-words", "ready");
  await editor.fill("زه کور ته ځم یونن ");
  await expect(count(page)).toHaveText("1 possible misspelling");
  await count(page).click();
  const corrections = page.getByRole("group", { name: "Spelling corrections" });
  await corrections.getByRole("button", { name: "یونان", exact: true }).click();
  await expect(editor).toHaveValue("زه کور ته ځم یونان ");
  await expect(count(page)).toBeHidden();
});

test("Hindi: completions on InScript; spell check is Beta and off until turned on", async ({
  page,
}) => {
  const { editor, words } = await open(page, "/hindi/inscript", "Hindi");
  await editor.fill("किता");
  await words;
  const bar = page.getByRole("group", { name: "Word suggestions" });
  await expect(bar.getByRole("button", { name: /किताब/ }).first()).toBeVisible();

  await editor.fill("यह आवशयक है ");
  await expect(count(page)).toBeHidden();
  const toggle = page.getByRole("button", { name: "Spell check" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveAttribute("title", /Beta/);
  await toggle.click();
  await expect(count(page)).toHaveText("1 possible misspelling");
});

test("Urdu: autocorrect is on; Space fixes a clear misspelling and Backspace undoes it", async ({
  page,
}) => {
  const { editor, words } = await open(page, "/urdu", "Urdu");
  await editor.fill("میرا نام");
  await words;
  await expect(editor).toHaveAttribute("data-words", "ready");
  await expect(page.getByRole("button", { name: "Autocorrect" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await editor.fill("ملک کی زرورت");
  await editor.press("Space");
  await expect(editor).toHaveValue("ملک کی ضرورت ");
  await editor.press("Backspace");
  await expect(editor).toHaveValue("ملک کی زرورت");
  await editor.press("Space");
  await expect(editor).toHaveValue("ملک کی زرورت ");
});
