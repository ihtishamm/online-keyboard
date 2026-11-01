import AxeBuilder from "@axe-core/playwright";
import { deadStrokeMap, keystrokeMap, type Keystroke, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** Read directly: Node can't import @okb/layouts' JSON modules without import attributes. */
function layout(folder: string, file: string): Layout {
  // The registry defaults a missing deadkeys list to none; do the same.
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

/** AltGr is Ctrl+Alt to the page (Playwright has no AltGr key). */
const press = (page: Page, k: Keystroke) =>
  page.keyboard.press(`${k.altgr ? "Control+Alt+" : ""}${k.shift ? "Shift+" : ""}${k.code}`);

/** Press the physical keys that type `word` on a layout, dead keys included. */
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
  await expect(page.getByRole("radiogroup", { name: "Keyboard layout" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("Latin typing test", () => {
  test("scores Spanish words typed with dead keys", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const spain = layout("spanish", "spain");
    await ready(page, "/spanish-typing-test");
    await expect(page.locator("h1 + span")).toHaveAttribute("lang", "es");
    await expect(page.locator("h1 + span")).toHaveAttribute("dir", "ltr");
    await page.getByRole("radio", { name: "Spain" }).click();
    await page.getByRole("radio", { name: "Sentences" }).click();
    await input(page, "Spanish").focus();
    for (let i = 0; i < 4; i++) {
      await typeWord(page, spain, (await current(page).textContent())!);
      await page.keyboard.press("Space");
    }
    await typeWord(page, spain, "qqq");
    await page.keyboard.press("Space");
    await expect(page.locator(".text-good")).toHaveCount(4);
    await expect(page.locator(".text-bad")).toHaveCount(1);
  });

  test("types French on AZERTY", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const azerty = layout("french", "azerty");
    await ready(page, "/french-typing-test");
    await page.getByRole("radio", { name: azerty.name.en, exact: true }).click();
    await input(page, "French").focus();
    // KeyQ types a on AZERTY.
    await page.keyboard.press("KeyQ");
    await expect(input(page, "French")).toHaveValue("a");
    await page.keyboard.press("Backspace");
    for (let i = 0; i < 3; i++) {
      await typeWord(page, azerty, (await current(page).textContent())!);
      await page.keyboard.press("Space");
    }
    await expect(page.locator(".text-good")).toHaveCount(3);
  });

  test("on phones the on-screen keyboard types into the test", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch devices only");
    await ready(page, "/italian-typing-test");
    await expect(page.getByRole("group", { name: "On-screen keyboard" })).toBeVisible();
    await page.locator('button[data-key="KeyS"]').tap();
    await expect(input(page, "Italian")).toHaveValue("s");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/spanish-typing-test");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});

test.describe("Latin typing tutor", () => {
  test("passes the home row on Italian", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const italian = layout("italian", "standard");
    await ready(page, "/italian-typing-tutor");
    await page.getByRole("radio", { name: italian.name.en, exact: true }).click();
    await page.getByRole("button", { name: /Lesson 1\s*Home row/ }).click();
    await expect(input(page, "Italian")).toBeFocused();
    while (await current(page).count()) {
      await typeWord(page, italian, (await current(page).textContent())!);
      if (await current(page).count()) await page.keyboard.press("Space");
    }
    await expect(page.getByRole("heading", { name: "Lesson passed!" })).toBeVisible();
  });

  test("hints a dead key, then its letter", async ({ page, isMobile }) => {
    test.skip(isMobile, "physical keyboard");
    const spain = layout("spanish", "spain");
    const dead = deadStrokeMap(spain);
    await ready(page, "/spanish-typing-tutor");
    await page.getByRole("radio", { name: "Spain" }).click();
    await page.getByRole("button", { name: /Accents and AltGr/ }).click();
    const word = (await current(page).textContent())!;
    // Type up to the first letter that needs a dead key.
    const at = [...word].findIndex((ch) => dead.has(ch));
    await typeWord(page, spain, [...word].slice(0, at).join(""));
    const stroke = dead.get([...word][at]!)!;
    const key = (code: string) => page.locator(`button[data-key="${code}"]`);
    await expect(key(stroke.first.code)).toHaveAttribute("data-highlight", "true");
    await expect(page.getByText(/^Next key:/)).toBeVisible();
    await press(page, stroke.first);
    await expect(key(stroke.then.code)).toHaveAttribute("data-highlight", "true");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await ready(page, "/french-typing-tutor");
    await page.getByRole("button", { name: /Lesson 1/ }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
