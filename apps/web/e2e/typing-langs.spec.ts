import AxeBuilder from "@axe-core/playwright";
import { deadStrokeMap, keystrokeMap, type Keystroke, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * The generated typing pages outside Latin script (plan item 8.1), and the /typing hub.
 * Latin ones are in latin-typing.spec.ts, Urdu's own pages in typing.spec.ts.
 */

/** Read directly: Node can't import @okb/layouts' JSON modules without import attributes. */
function layout(folder: string, file: string): Layout {
  return {
    deadkeys: [],
    ...JSON.parse(
      readFileSync(
        new URL(`../../../packages/layouts/languages/${folder}/${file}.json`, import.meta.url),
        "utf8",
      ),
    ),
  } as Layout;
}

const press = (page: Page, k: Keystroke) =>
  page.keyboard.press(`${k.altgr ? "Control+Alt+" : ""}${k.shift ? "Shift+" : ""}${k.code}`);

/** Press the physical keys that type `word` on a layout. */
async function typeWord(page: Page, l: Layout, word: string) {
  const keys = keystrokeMap(l);
  const dead = deadStrokeMap(l, keys);
  for (const ch of word) {
    const direct = keys.get(ch);
    const viaDead = dead.get(ch);
    if (direct) await press(page, direct);
    else if (viaDead) {
      await press(page, viaDead.first);
      await press(page, viaDead.then);
    } else throw new Error(`${l.id} cannot type ${ch}`);
  }
}

const current = (page: Page) => page.locator("[data-current]");
const input = (page: Page, language: string) =>
  page.getByRole("textbox", { name: new RegExp(`Type the ${language}`) });

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const serious = async (page: Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

test.describe("typing hub", () => {
  test("filters languages by English or native name", async ({ page }) => {
    await ready(page, "/typing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/in \d+ languages/);
    const filter = page.getByRole("searchbox", { name: "Find a language" });
    await filter.fill("हिन्दी");
    await expect(page.getByRole("link", { name: "Hindi typing test" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Spanish typing test" })).toBeHidden();
    await filter.fill("arabic");
    await expect(page.getByText("1 language")).toBeVisible();
    await page.getByRole("link", { name: "Arabic typing tutor" }).click();
    await expect(page).toHaveURL(/\/arabic-typing-tutor$/);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/typing");
    const found = await serious(page);
    expect(found, JSON.stringify(found, null, 2)).toEqual([]);
  });
});

test.describe("typing test outside Latin script", () => {
  test("scores Hindi words typed on InScript", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const inscript = layout("hindi", "inscript");
    await ready(page, "/hindi-typing-test");
    await expect(page.locator("h1 + span")).toHaveAttribute("lang", "hi");
    await input(page, "Hindi").focus();
    for (let i = 0; i < 3; i++) {
      await typeWord(page, inscript, (await current(page).textContent())!);
      await page.keyboard.press("Space");
    }
    await expect(page.locator(".text-good")).toHaveCount(3);
  });

  test("on phones the Arabic keyboard types right to left", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch devices only");
    await ready(page, "/arabic-typing-test");
    await expect(page.getByRole("group", { name: "On-screen keyboard" })).toBeVisible();
    await expect(input(page, "Arabic")).toHaveAttribute("dir", "rtl");
    const arabic = layout("arabic", "standard");
    await page.locator('button[data-key="KeyA"]').tap();
    await expect(input(page, "Arabic")).toHaveValue(arabic.keys.KeyA!.n!);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/hindi-typing-test");
    const found = await serious(page);
    expect(found, JSON.stringify(found, null, 2)).toEqual([]);
  });
});

test.describe("typing tutor outside Latin script", () => {
  test("passes the Arabic home row", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const arabic = layout("arabic", "standard");
    await ready(page, "/arabic-typing-tutor");
    await page.getByRole("button", { name: /Lesson 1\s*Home row/ }).click();
    await expect(input(page, "Arabic")).toBeFocused();
    while (await current(page).count()) {
      await typeWord(page, arabic, (await current(page).textContent())!);
      if (await current(page).count()) await page.keyboard.press("Space");
    }
    await expect(page.getByRole("heading", { name: "Lesson passed!" })).toBeVisible();
  });

  test("teaches Hindi Roman spellings in English letters", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    await ready(page, "/hindi-typing-tutor");
    await page.getByRole("button", { name: /Roman spellings/ }).click();
    const box = input(page, "Hindi");
    await expect(box).toBeFocused();
    // The text shows Devanagari; the cue under it is the spelling to type.
    await expect(current(page)).toHaveText(/\p{Script=Devanagari}/u);
    const cue = page.getByText("In English letters:").locator("span");
    for (let i = 0; i < 2; i++) {
      await page.keyboard.type((await cue.textContent())!);
      await page.keyboard.press("Space");
    }
    await expect(page.locator(".text-good")).toHaveCount(2);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/arabic-typing-tutor");
    await page.getByRole("button", { name: /Lesson 1/ }).click();
    const found = await serious(page);
    expect(found, JSON.stringify(found, null, 2)).toEqual([]);
  });
});
