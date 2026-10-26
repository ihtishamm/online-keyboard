import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.getByRole("textbox", { name: "Urdu text" });
const key = (page: Page, code: string) => page.locator(`button[data-key="${code}"]`);

/** Open a page and wait for the keyboard island to hydrate (the editor is read-only until then). */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(editor(page)).toBeEditable();
}

test.describe("desktop typing", () => {
  test.skip(({ isMobile }) => isMobile, "physical keyboard tests");

  test("types a sentence on the phonetic layout", async ({ page }) => {
    await open(page, "/urdu");
    await editor(page).click();
    // "urdu hmari qwmi zban hE." -> اردو ہماری قومی زبان ہے۔  (o = ہ, y = ے, . = ۔)
    await page.keyboard.type("ardw omari qwmi zban oy.");
    await expect(editor(page)).toHaveValue("اردو ہماری قومی زبان ہے۔");
  });

  test("types پاکستان on the standard layout page", async ({ page }) => {
    await open(page, "/urdu/standard");
    await expect(page.getByRole("radio", { name: /Standard/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await editor(page).click();
    await page.keyboard.type("yjkvujf");
    await expect(editor(page)).toHaveValue("پاکستان");
  });

  test("Shift and Esc work from the physical keyboard", async ({ page }) => {
    await open(page, "/urdu");
    await editor(page).click();
    await page.keyboard.press("Shift+KeyT"); // ٹ
    await page.keyboard.press("Escape");
    await page.keyboard.type("ok");
    await page.keyboard.press("Escape");
    await page.keyboard.type("b");
    await expect(editor(page)).toHaveValue("ٹokب");
  });

  test("native undo restores text after typing", async ({ page }) => {
    await open(page, "/urdu");
    await editor(page).click();
    await page.keyboard.type("slam");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor(page)).not.toHaveValue("سلام");
  });

  test("copies to the clipboard", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only here");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page, "/urdu");
    await editor(page).click();
    await page.keyboard.type("slam");
    await page.getByRole("button", { name: "Copy" }).click();
    await expect(page.getByText("Copied to clipboard")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("سلام");
  });
});

test("types with on-screen keys, including a long-press alternate", async ({ page, isMobile }) => {
  await open(page, "/urdu");
  const tap = async (code: string) => (isMobile ? key(page, code).tap() : key(page, code).click());
  await tap("KeyP");
  await tap("KeyA");
  await tap("KeyK");
  await expect(editor(page)).toHaveValue("پاک");

  // Long-press ا for آ.
  const box = (await key(page, "KeyA").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.getByRole("menuitem", { name: "آ" }).click();
  await expect(editor(page)).toHaveValue("پاکآ");
});

test("switching layout updates the URL and remembers the choice", async ({ page }) => {
  await open(page, "/urdu");
  await page.getByRole("radio", { name: /Standard/ }).click();
  await expect(page).toHaveURL(/\/urdu\/standard$/);
  await open(page, "/urdu");
  await expect(page.getByRole("radio", { name: /Standard/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("autosaves and restores text after a reload", async ({ page }) => {
  await open(page, "/urdu");
  await key(page, "KeyS").click();
  await key(page, "KeyL").click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor(page)).toBeEditable();
  await expect(editor(page)).toHaveValue("سل");
});

test("mobile keeps the OS keyboard hidden until asked", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch devices only");
  await open(page, "/urdu");
  await expect(editor(page)).toHaveAttribute("inputmode", "none");
  await page.getByRole("button", { name: "Phone keyboard" }).tap();
  await expect(editor(page)).not.toHaveAttribute("inputmode", "none");
  await expect(page.getByRole("group", { name: "On-screen keyboard" })).toHaveCount(0);
});

test("whole keyboard fits on a phone screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch devices only");
  await open(page, "/urdu");
  const kb = (await page.getByRole("group", { name: "On-screen keyboard" }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(kb.x).toBeGreaterThanOrEqual(0);
  expect(kb.x + kb.width).toBeLessThanOrEqual(viewport.width);
  // No horizontal page scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewport.width,
  );
});

for (const path of ["/urdu", "/urdu/standard"]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("ships SEO metadata and FAQ structured data", async ({ page }) => {
  await open(page, "/urdu");
  await expect(page).toHaveTitle(/Urdu Keyboard Online/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/urdu$/);
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(ld!) as { "@type": string }[];
  expect(data.map((d) => d["@type"])).toEqual(["WebApplication", "FAQPage"]);
});
