import AxeBuilder from "@axe-core/playwright";
import { deadStrokeMap, keystrokeMap, type Keystroke, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Wave 1 languages (plan item 7.7): each page types its sample sentence on its national
 * layout from the physical keyboard, does what its own smart-accents tip says, and has no
 * serious accessibility problems.
 */
const WAVE1 = [
  ["german", "German", "germany"],
  ["portuguese", "Portuguese", "brazil"],
  ["turkish", "Turkish", "q"],
  ["polish", "Polish", "programmer"],
  ["dutch", "Dutch", "standard"],
  ["romanian", "Romanian", "standard"],
  ["czech", "Czech", "qwertz"],
  ["hungarian", "Hungarian", "standard"],
  ["swedish", "Swedish", "standard"],
  ["catalan", "Catalan", "spain"],
  ["croatian", "Croatian", "standard"],
] as const;

const ROOT = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), "utf8");

/** AltGr is Ctrl+Alt to the page (Playwright has no AltGr key). */
const press = (page: Page, k: Keystroke) =>
  page.keyboard.press(`${k.altgr ? "Control+Alt+" : ""}${k.shift ? "Shift+" : ""}${k.code}`);

async function typeText(page: Page, layout: Layout, text: string) {
  const keys = keystrokeMap(layout);
  const dead = deadStrokeMap(layout, keys);
  for (const ch of text) {
    if (ch === " ") await page.keyboard.press("Space");
    else if (keys.has(ch)) await press(page, keys.get(ch)!);
    else if (dead.has(ch)) {
      await press(page, dead.get(ch)!.first);
      await press(page, dead.get(ch)!.then);
    } else throw new Error(`${layout.id} cannot type ${ch}`);
  }
}

for (const [slug, name, file] of WAVE1) {
  const language = JSON.parse(read(`packages/layouts/languages/${slug}/language.json`)) as {
    sample: string;
    layouts: string[];
  };
  // A language's first layout is its page, /<slug>; the others are /<slug>/<layout>.
  const path = language.layouts[0]!.endsWith(`-${file}`) ? `/${slug}` : `/${slug}/${file}`;
  // The registry defaults a missing deadkeys list to none; do the same.
  const layout = {
    deadkeys: [],
    ...JSON.parse(read(`packages/layouts/languages/${slug}/${file}.json`)),
  } as Layout;
  const tip = /Type (\S+) and press Space: smart accents writes ([^\s.]+)\./u.exec(
    read(`apps/web/src/content/languages/${slug}.md`),
  )!;

  test.describe(`/${slug}`, () => {
    test(`types the sample on ${layout.name.en}`, async ({ page, isMobile }) => {
      test.skip(isMobile, "physical keyboard");
      await page.goto(path);
      const editor = page.getByRole("textbox", { name: `${name} text` });
      await expect(editor).toBeEditable();
      // Smart accents would leave the sample as it is, but only the keys are tested here.
      await page.getByRole("button", { name: "Smart accents" }).click();
      await editor.click();
      await typeText(page, layout, language.sample);
      await expect(editor).toHaveValue(language.sample);
    });

    test(`smart accents: ${tip[1]} becomes ${tip[2]}`, async ({ page }) => {
      const words = page.waitForResponse((r) => /\/dict\.[^/]+\.txt$/.test(r.url()));
      await page.goto(`/${slug}`);
      const editor = page.getByRole("textbox", { name: `${name} text` });
      await expect(editor).toBeEditable();
      await editor.fill("x");
      await words;
      await expect(editor).toHaveAttribute("data-words", "ready");
      await editor.fill(tip[1]!);
      await editor.press("Space");
      await expect(editor).toHaveValue(`${tip[2]} `);
    });

    test("has no serious accessibility violations", async ({ page }) => {
      await page.goto(`/${slug}`);
      await expect(page.getByRole("textbox", { name: `${name} text` })).toBeEditable();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  });
}

test("Turkish capitals show İ in the letter bar, German ones ẞ", async ({ page }) => {
  for (const [path, name, capital] of [
    ["/turkish", "Turkish", "İ"],
    ["/german", "German", "ẞ"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("textbox", { name: `${name} text` })).toBeEditable();
    const letters = page.getByRole("group", { name: "Special letters" });
    await expect(letters.getByRole("button", { name: capital, exact: true })).toHaveCount(0);
    await page.locator('[data-key="shift"]').first().click();
    await expect(letters.getByRole("button", { name: capital, exact: true })).toBeVisible();
  }
});
