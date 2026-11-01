import { expect, test, type Page } from "@playwright/test";

/**
 * Latin toolkit (plan item 7.5): the accent bar, smart accents, Spanish ¿ ¡, French spacing
 * and the national layouts' extra ISO key. Every word here is checked against the shipped
 * word lists by these tests themselves.
 */
async function open(page: Page, path: string, name: string) {
  const words = page.waitForResponse((r) => /\/dict\.[^/]+\.txt$/.test(r.url()));
  await page.goto(path);
  const editor = page.getByRole("textbox", { name: `${name} text` });
  await expect(editor).toBeEditable();
  return { editor, words };
}

const letters = (page: Page) => page.getByRole("group", { name: "Special letters" });

test("Spanish: the accent bar types special letters, capitals with Shift", async ({ page }) => {
  const { editor } = await open(page, "/spanish", "Spanish");
  await editor.fill("a");
  await letters(page).getByRole("button", { name: "ñ", exact: true }).click();
  await expect(editor).toHaveValue("añ");
  await page.locator('[data-key="shift"]').first().click();
  await letters(page).getByRole("button", { name: "Á", exact: true }).click();
  await expect(editor).toHaveValue("añÁ");
});

test("Spanish: smart accents on Space, Backspace undoes, two spellings wait in the bar", async ({
  page,
}) => {
  const { editor, words } = await open(page, "/spanish", "Spanish");
  await editor.fill("la");
  await words;
  await expect(editor).toHaveAttribute("data-words", "ready");
  await editor.fill("la cancion");
  await editor.press("Space");
  await expect(editor).toHaveValue("la canción ");
  await editor.press("Backspace");
  await expect(editor).toHaveValue("la cancion");

  await editor.fill("esta");
  await expect(
    page.getByRole("group", { name: "Word suggestions" }).getByRole("button", { name: /^está/ }),
  ).toBeVisible();
  await editor.press("Space");
  await expect(editor).toHaveValue("esta ");

  await letters(page).getByRole("button", { name: "Smart accents" }).click();
  await editor.fill("la cancion");
  await editor.press("Space");
  await expect(editor).toHaveValue("la cancion ");
});

test("Spanish: ending a question adds ¿ at its start, as one undo step", async ({ page }) => {
  const { editor } = await open(page, "/spanish", "Spanish");
  await editor.fill("Hola. Que tal");
  await editor.press("Shift+Slash");
  await expect(editor).toHaveValue("Hola. ¿Que tal?");
  await editor.press("Control+z");
  await expect(editor).toHaveValue("Hola. Que tal");
});

test("Italian: perche becomes perché on Space", async ({ page }) => {
  const { editor, words } = await open(page, "/italian", "Italian");
  await editor.fill("ma");
  await words;
  await expect(editor).toHaveAttribute("data-words", "ready");
  await editor.fill("ma perche");
  await editor.press("Space");
  await expect(editor).toHaveValue("ma perché ");
});

test("French: a narrow no-break space goes before ? and can be turned off", async ({ page }) => {
  const { editor } = await open(page, "/french", "French");
  await editor.fill("Vraiment");
  await editor.press("Shift+Slash");
  await expect(editor).toHaveValue("Vraiment\u202F?");
  await letters(page).getByRole("button", { name: "Espaces fines" }).click();
  await editor.fill("Vraiment");
  await editor.press("Shift+Slash");
  await expect(editor).toHaveValue("Vraiment?");
});

test("layouts with the extra key beside Shift show it; others do not", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phone keyboards have no ISO key");
  for (const [path, iso] of [
    ["/spanish/spain", 1],
    ["/french/azerty", 1],
    ["/urdu", 0],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('[data-key="IntlBackslash"]')).toHaveCount(iso);
  }
});
