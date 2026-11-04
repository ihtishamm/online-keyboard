import { expect, test, type Page } from "@playwright/test";

/** Keys go to the page's own typing engine, not a browser input method. */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  const editor = page.getByRole("textbox").first();
  await editor.click();
  return editor;
}

test.describe("input methods", () => {
  test.skip(({ isMobile }) => isMobile, "typed with a physical keyboard here");

  test("Korean joins letters into syllables, and Backspace takes one back", async ({ page }) => {
    const editor = await open(page, "/korean");
    await page.keyboard.type("gksrmf");
    await expect(editor).toHaveValue("한글");
    await page.keyboard.press("Backspace");
    await expect(editor).toHaveValue("한그");
    await page.keyboard.press("Backspace");
    await expect(editor).toHaveValue("한ㄱ");
  });

  test("Vietnamese Telex and its tone placement", async ({ page }) => {
    const editor = await open(page, "/vietnamese");
    await page.keyboard.type("tieengs vieetj hoaf");
    await expect(editor).toHaveValue("tiếng việt hoà");
    await page.getByRole("button", { name: "hòa (old)" }).click();
    await editor.fill("");
    await editor.click();
    await page.keyboard.type("hoaf");
    await expect(editor).toHaveValue("hòa");
  });

  test("Vietnamese VNI", async ({ page }) => {
    const editor = await open(page, "/vietnamese/vni");
    await page.keyboard.type("tie6ng1");
    await expect(editor).toHaveValue("tiếng");
  });

  test("Japanese turns romaji into kana, and Space into kanji", async ({ page }) => {
    const editor = await open(page, "/japanese");
    await page.keyboard.type("nihongo");
    await expect(editor).toHaveValue("にほんご");
    await expect(page.getByRole("button", { name: "日本語", exact: true }).first()).toBeVisible();
    await page.keyboard.press("Space");
    await expect(editor).toHaveValue("日本語");
  });

  test("Chinese converts pinyin with and without tones, and to Traditional", async ({ page }) => {
    const editor = await open(page, "/chinese-simplified");
    await page.keyboard.type("nihao");
    await expect(page.getByRole("button", { name: "你好", exact: true }).first()).toBeVisible();
    await page.keyboard.press("Space");
    await expect(editor).toHaveValue("你好");
    await page.keyboard.type("ma1ma5");
    await page.keyboard.press("Space");
    await expect(editor).toHaveValue("你好妈妈");
    await page.getByRole("button", { name: /to Traditional Chinese/ }).click();
    await expect(editor).toHaveValue("你好媽媽");
  });

  test("Traditional Chinese Zhuyin", async ({ page }) => {
    const editor = await open(page, "/chinese-traditional/zhuyin");
    await page.keyboard.type("su3cl3");
    await expect(editor).toHaveValue("ㄋㄧˇㄏㄠˇ");
    await page.keyboard.press("Space");
    await expect(editor).toHaveValue("你好");
  });

  test("Thai suggestions need no space between words", async ({ page }) => {
    const editor = await open(page, "/thai");
    await page.keyboard.type("l;ylfu");
    await expect(editor).toHaveValue("สวัสดี");
  });
});

test.describe("input methods on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "tapped on the on-screen keys");

  test("Korean on-screen keys join into syllables", async ({ page }) => {
    await page.goto("/korean", { waitUntil: "networkidle" });
    for (const code of ["KeyG", "KeyK", "KeyS"]) {
      await page.locator(`button[data-key="${code}"]`).tap();
    }
    await expect(page.getByRole("textbox").first()).toHaveValue("한");
  });

  test("Vietnamese Telex on-screen keys add the marks", async ({ page }) => {
    await page.goto("/vietnamese", { waitUntil: "networkidle" });
    for (const code of ["KeyV", "KeyI", "KeyE", "KeyE", "KeyT", "KeyJ"]) {
      await page.locator(`button[data-key="${code}"]`).tap();
    }
    await expect(page.getByRole("textbox").first()).toHaveValue("việt");
  });

  test("Chinese converts on the phone keys too", async ({ page }) => {
    await page.goto("/chinese-simplified", { waitUntil: "networkidle" });
    for (const code of ["KeyN", "KeyI", "KeyH", "KeyA", "KeyO", "space"]) {
      await page.locator(`button[data-key="${code}"]`).tap();
    }
    await expect(page.getByRole("textbox").first()).toHaveValue("你好");
  });
});
