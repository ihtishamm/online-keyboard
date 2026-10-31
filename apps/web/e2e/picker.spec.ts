import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** The language picker, home page suggestions and the look-up menu (plan item 7.4). */
async function openPicker(page: Page) {
  const button = page.getByRole("link", { name: "Languages" });
  // The link works before hydration too (it goes to the home page list); wait for the island.
  await expect(button).toHaveAttribute("aria-haspopup", "dialog");
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Choose a language" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("finds a language by an alias and opens it with Enter", async ({ page }) => {
  await page.goto("/urdu");
  const dialog = await openPicker(page);
  const search = dialog.getByRole("searchbox", { name: "Search languages" });
  await expect(search).toBeFocused();
  await search.fill("persian");
  await expect(dialog.getByRole("link").first()).toContainText("Farsi");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/farsi$/);
});

test("lists recent languages first, then regions; Escape closes it", async ({ page }) => {
  await page.goto("/hindi");
  await page.goto("/sindhi");
  const dialog = await openPicker(page);
  const recent = dialog.getByRole("region", { name: "Recent" });
  await expect(recent.getByRole("link")).toHaveText([/Sindhi/, /Hindi/]);
  await expect(dialog.getByRole("region", { name: "South Asia" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Sindhi/ }).first()).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("is a full-screen sheet on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phones only");
  await page.goto("/");
  const dialog = await openPicker(page);
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.round(box.width)).toBe(viewport.width);
  expect(Math.round(box.height)).toBe(viewport.height);
});

test("the open picker has no serious accessibility violations", async ({ page }) => {
  await page.goto("/arabic");
  await openPicker(page);
  const results = await new AxeBuilder({ page }).include("dialog").analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test.describe("home page", () => {
  test.use({ locale: "bn-BD" });

  test("suggests languages from the browser and recent keyboards", async ({ page }) => {
    await page.goto("/pashto");
    await page.goto("/");
    const forYou = page.getByRole("region", { name: "For you" });
    await expect(forYou.getByRole("link")).toHaveText([/Pashto/, /Bangla/]);
  });

  test("browses by region or by script without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const all = page.locator("#all-languages");
    await expect(all.getByRole("region", { name: "South Asia" })).toBeVisible();
    await expect(all.getByRole("region", { name: "Devanagari" })).toBeHidden();
    await all.getByText("By script").click();
    await expect(all.getByRole("region", { name: "Devanagari" })).toBeVisible();
    await expect(all.getByRole("region", { name: "South Asia" })).toBeHidden();
    await expect(page.getByRole("region", { name: "For you" })).toHaveCount(0);
    await context.close();
  });
});

test("look-up menu links to translators for the selected text, in a new tab", async ({
  page,
  isMobile,
}) => {
  await page.goto("/urdu");
  const editor = page.getByRole("textbox", { name: "Urdu text" });
  await expect(editor).toBeEditable();
  await editor.fill("کتاب اچھی ہے");
  await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, 4));
  let menu;
  if (isMobile) {
    await page.getByRole("button", { name: "More" }).click();
    menu = page
      .getByRole("dialog", { name: "More tools" })
      .getByRole("region", { name: "Look up" });
  } else {
    await page.getByText("Look up", { exact: true }).click();
    menu = page.locator("details[open]");
  }
  await expect(menu.getByText("Opens another site in a new tab.")).toBeVisible();
  const google = menu.getByRole("link", { name: /Translate with Google/ });
  await expect(google).toHaveAttribute("target", "_blank");
  await expect(google).toHaveAttribute(
    "href",
    `https://translate.google.com/?sl=ur&tl=en&text=${encodeURIComponent("کتاب")}&op=translate`,
  );
  await expect(menu.getByRole("link", { name: /Bing/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /DeepL/ })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: /Wiktionary/ })).toBeVisible();
});
