import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const TEXT = "اردو ہماری قومی زبان ہے۔";

async function openWithText(page: Page) {
  await page.goto("/urdu");
  const editor = page.getByRole("textbox", { name: "Urdu text" });
  await expect(editor).toBeEditable();
  await editor.fill(TEXT);
  return editor;
}

async function menu(page: Page, item: string) {
  if (page.viewportSize()!.width < 640) {
    // Phones: downloads are in the More sheet.
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page
      .getByRole("dialog", { name: "More tools" })
      .getByRole("button", { name: new RegExp(item.replace(/[().]/g, "\\$&")) })
      .click();
    return;
  }
  // The label is visually hidden on narrow screens, so click the summary itself.
  await page.locator('summary[title="Download"]').click();
  await page.getByRole("button", { name: item }).click();
}

/** The status line read out to screen readers (phones also show a toast copy). */
const status = (page: Page) => page.locator("[aria-live]").filter({ hasText: /\S/ });

test("downloads Word documents with the text", async ({ page }) => {
  await openWithText(page);
  const [download] = await Promise.all([page.waitForEvent("download"), menu(page, "Word (.docx)")]);
  expect(download.suggestedFilename()).toMatch(/^urdu-\d{4}-\d{2}-\d{2}\.docx$/);
  const bytes = await readFile((await download.path())!);
  // Entries are stored uncompressed, so the text is in the file as UTF-8.
  expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(bytes.includes(Buffer.from(TEXT))).toBe(true);
});

test("prints only the text for PDF", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => void (window as unknown as { printed: number }).printed++;
  });
  await openWithText(page);
  await menu(page, "PDF");
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { printed: number }).printed))
    .toBe(1);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#print-sheet")).toBeVisible();
  await expect(page.locator("#print-sheet")).toHaveText(TEXT);
  await expect(page.locator("#print-sheet")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("main")).toBeHidden();

  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("#print-sheet")).toHaveCount(0);
});

test("makes an image card", async ({ page }) => {
  await openWithText(page);
  await menu(page, "Image card");
  const dialog = page.getByRole("dialog", { name: "Image card" });
  await expect(dialog).toBeVisible();

  await dialog.getByText("Story").click();
  await dialog.getByText("Night").click();
  const canvas = dialog.getByRole("img", { name: /Preview of the image card/ });
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => `${c.width}x${c.height}`))
    .toBe("1080x1920");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download PNG" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^urdu-\d{4}-\d{2}-\d{2}\.png$/);
  const png = await readFile((await download.path())!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.length).toBeGreaterThan(20_000);

  const serious = (await new AxeBuilder({ page }).include("dialog").analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Urdu text" })).toBeFocused();
});

test("says when there is nothing to download", async ({ page }) => {
  await page.goto("/urdu");
  await expect(page.getByRole("textbox", { name: "Urdu text" })).toBeEditable();
  await menu(page, "Word (.docx)");
  await expect(status(page)).toHaveText("Nothing to download yet");
});
