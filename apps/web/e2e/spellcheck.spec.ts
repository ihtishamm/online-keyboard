import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TEXT = "پاکستان کی ہکومت نے تعلیم کی زرورت پر زور دیا۔ ";

async function open(page: Page) {
  await page.goto("/urdu");
  const editor = page.getByRole("textbox", { name: "Urdu text" });
  await expect(editor).toBeEditable();
  await editor.fill(TEXT);
  return editor;
}

test("underlines misspelled words and fixes them from the suggestion bar", async ({ page }) => {
  const editor = await open(page);
  const count = page.getByRole("button", { name: /possible misspelling/ });
  await expect(count).toHaveText("2 possible misspellings");
  await expect(page.locator(".spell-error")).toHaveText(["ہکومت", "زرورت"]);

  // The underline layer covers the editor's text area exactly.
  const [overlay, box] = await page.evaluate(() => {
    const ta = document.querySelector("textarea")!;
    const layer = document.querySelector(".spell-error")!.parentElement!;
    const r = ta.getBoundingClientRect();
    const o = layer.getBoundingClientRect();
    return [
      [o.x, o.y, o.width, o.height],
      [r.x + ta.clientLeft, r.y + ta.clientTop, ta.clientWidth, ta.clientHeight],
    ];
  });
  overlay.forEach((v, i) => expect(v).toBeCloseTo(box[i]!, 0));

  await count.click();
  const corrections = page.getByRole("group", { name: "Spelling corrections" });
  await corrections.getByRole("button", { name: "حکومت", exact: true }).click();
  await expect(editor).toHaveValue(TEXT.replace("ہکومت", "حکومت"));
  await expect(count).toHaveText("1 possible misspelling");

  await count.click();
  await corrections.getByRole("button", { name: "ضرورت", exact: true }).click();
  await expect(editor).toHaveValue(TEXT.replace("ہکومت", "حکومت").replace("زرورت", "ضرورت"));
  await expect(count).toBeHidden();
  await expect(page.locator(".spell-error")).toHaveCount(0);
});

test("remembers words added to the dictionary", async ({ page }) => {
  const editor = await open(page);
  await page.getByRole("button", { name: /possible misspelling/ }).click();
  await page.getByRole("button", { name: /to my dictionary/ }).click();
  await expect(page.getByRole("button", { name: /possible misspelling/ })).toHaveText(
    "1 possible misspelling",
  );
  await page.reload();
  await expect(editor).toBeEditable();
  await editor.fill(TEXT);
  await expect(page.getByRole("button", { name: /possible misspelling/ })).toHaveText(
    "1 possible misspelling",
  );
});

test("spell check has no serious accessibility violations", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /possible misspelling/ }).click();
  await expect(page.getByRole("group", { name: "Spelling corrections" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
