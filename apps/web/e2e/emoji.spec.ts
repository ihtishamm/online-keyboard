import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.getByRole("textbox", { name: "Urdu text" });
const panel = (page: Page) => page.getByRole("region", { name: "Emoji" });
const search = (page: Page) => panel(page).getByRole("searchbox", { name: "Search emoji" });
const grid = (page: Page) => panel(page).locator('[role="group"]');

async function openPanel(page: Page, path = "/urdu") {
  await page.goto(path);
  await expect(page.getByRole("textbox", { name: /text$/ })).toBeEditable();
  await page.getByRole("button", { name: "Emoji" }).click();
  // Loaded once the first category has emoji in it.
  await expect(grid(page).getByRole("button").first()).toBeVisible();
}

test("inserts emoji at the caret", async ({ page }) => {
  await page.goto("/urdu");
  await expect(editor(page)).toBeEditable();
  await editor(page).fill("سلام");
  await page.getByRole("button", { name: "Emoji" }).click();
  await panel(page).getByRole("button", { name: "grinning face", exact: true }).click();
  await panel(page).getByRole("button", { name: "red heart", exact: true }).click();
  await expect(editor(page)).toHaveValue("سلام😀❤️");
});

test("searches in English and in the page language", async ({ page }) => {
  await openPanel(page);
  await search(page).fill("pakistan");
  await expect(grid(page).getByRole("button").first()).toHaveAccessibleName("flag: Pakistan");

  await search(page).fill("خدا حافظ");
  await expect(grid(page).getByRole("button", { name: "waving hand" })).toBeVisible();

  await search(page).fill("qqqq");
  await expect(panel(page).getByText("No emoji found.")).toBeVisible();

  // Enter inserts the best match.
  await search(page).fill("thumbs up");
  await search(page).press("Enter");
  await expect(editor(page)).toHaveValue("👍");
});

test("remembers a skin tone and recent emoji", async ({ page }) => {
  await openPanel(page);
  await panel(page).getByRole("radio", { name: "Medium skin tone", exact: true }).click();
  await panel(page).getByRole("button", { name: "People & Body" }).click();
  await panel(page).getByRole("button", { name: "waving hand", exact: true }).click();
  await expect(editor(page)).toHaveValue("👋🏽");

  await page.reload();
  await expect(editor(page)).toBeEditable();
  await page.getByRole("button", { name: "Emoji" }).click();
  // Opens on Recently used, in the saved tone.
  await expect(panel(page).getByRole("button", { name: "Recently used" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(grid(page).getByRole("button", { name: "waving hand" })).toHaveText("👋🏽");
});

test("moves through the grid with arrow keys and closes on Escape", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard navigation");
  await openPanel(page);
  await panel(page).getByRole("button", { name: "Smileys & Emotion" }).click();
  await grid(page).getByRole("button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(grid(page).getByRole("button").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(grid(page).locator("button:focus")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(editor(page)).not.toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(editor(page)).toBeFocused();
});

test("backspace deletes a whole emoji", async ({ page, isMobile }) => {
  test.skip(isMobile, "physical keyboard");
  await openPanel(page);
  await search(page).fill("woman technologist");
  await panel(page).getByRole("radio", { name: "Dark skin tone", exact: true }).click();
  await grid(page).getByRole("button").first().click();
  await expect(editor(page)).toHaveValue("👩🏿‍💻");
  await editor(page).focus();
  await page.keyboard.press("Backspace");
  await expect(editor(page)).toHaveValue("");
});

test("replaces the on-screen keyboard on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch devices only");
  await openPanel(page);
  await expect(page.getByRole("group", { name: "On-screen keyboard" })).toBeHidden();
  await panel(page).getByRole("button", { name: "Close emoji" }).click();
  await expect(page.getByRole("group", { name: "On-screen keyboard" })).toBeVisible();
});

test("searches Hindi keywords on the Hindi page", async ({ page }) => {
  await openPanel(page, "/hindi");
  await search(page).fill("नमस्ते");
  await expect(grid(page).getByRole("button").first()).toBeVisible();
  await expect(panel(page).getByPlaceholder(/Search in English or/)).toBeVisible();
});

test("emoji panel has no serious accessibility violations", async ({ page }) => {
  await openPanel(page);
  const results = await new AxeBuilder({ page }).include('[aria-label="Emoji"]').analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
