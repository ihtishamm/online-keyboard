import AxeBuilder from "@axe-core/playwright";
import { deadStrokeMap, keystrokeMap, typingParts, type Keystroke, type Layout } from "@okb/engine";
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

/**
 * A smoke test for every language in the registry (plan Phase 9, scaling work), so a language
 * added as data is tested without writing a spec: its first key layout loads, types the first
 * word of the language's sample from the physical keyboard, and types letters by tapping the
 * phone keyboard. Accessibility checks per language are tagged @nightly: the pull-request run
 * leaves them to the nightly full run.
 */

/** AltGr is Ctrl+Alt to the page (Playwright has no AltGr key). */
const press = (page: Page, k: Keystroke) =>
  page.keyboard.press(`${k.altgr ? "Control+Alt+" : ""}${k.shift ? "Shift+" : ""}${k.code}`);

async function typeText(page: Page, layout: Layout, text: string) {
  const keys = keystrokeMap(layout);
  const dead = deadStrokeMap(layout, keys);
  // Hangul syllables come from their letters.
  for (const ch of layout.composer === "hangul" ? typingParts(text) : text) {
    if (keys.has(ch)) await press(page, keys.get(ch)!);
    else if (dead.has(ch)) {
      await press(page, dead.get(ch)!.first);
      await press(page, dead.get(ch)!.then);
    } else throw new Error(`${layout.id} cannot type ${ch}`);
  }
}

/**
 * The registry, read from its folders: Playwright's Node can't import @okb/layouts, whose
 * JSON imports rely on Vite.
 */
const DIR = new URL("../../../packages/layouts/languages/", import.meta.url);
const json = <T>(url: URL) => JSON.parse(readFileSync(url, "utf8")) as T;
interface LanguageFile {
  slug: string;
  order: number;
  name: { en: string };
  sample: string;
  layouts: string[];
}
const LANGUAGES = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => json<LanguageFile>(new URL(`${d.name}/language.json`, DIR)))
  .sort((a, b) => a.order - b.order);
/** Every layout file of a language, by id; a missing deadkeys list means none. */
function layoutsOf(slug: string): Map<string, Layout & { translit?: string }> {
  const folder = new URL(`${slug}/`, DIR);
  return new Map(
    readdirSync(folder)
      .filter((f) => f.endsWith(".json") && f !== "language.json")
      .map((f) => json<Layout & { translit?: string }>(new URL(f, folder)))
      .filter((l) => typeof l.id === "string" && l.keys)
      .map((l) => [l.id, { ...l, deadkeys: l.deadkeys ?? [] }]),
  );
}
/** "ur-phonetic" -> "phonetic", as in @okb/layouts. */
const layoutSlug = (id: string) => id.slice(id.indexOf("-") + 1);

/**
 * Layouts that build letters from several keys (GFF: a consonant, then a vowel; IPA: a letter,
 * then = < > or ^; pinyin: a syllable, then its tone): the keys to press for the sample's first
 * word, on a US keyboard.
 */
const TYPED_AS: Readonly<Record<string, string>> = {
  amharic: "selam",
  tigrinya: "selam",
  ipa: "}}i=nte=}na<s=e=ne=l",
  "pinyin-tones": "Ni3",
};
/** On the phone keyboard, GFF's letters are tapped as on a computer. */
const TAPPED_AS: Readonly<Record<string, string>> = { amharic: "selam", tigrinya: "selam" };

/** The US key for a character, with Shift where it needs it: page.keyboard.type drops Shift. */
const US_KEYS = ["Backquote", ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `Digit${d}`)];
US_KEYS.push("Minus", "Equal", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote");
US_KEYS.push("Comma", "Period", "Slash");
function usKey(ch: string): string {
  if (/^[a-z]$/.test(ch)) return `Key${ch.toUpperCase()}`;
  if (/^[A-Z]$/.test(ch)) return `Shift+Key${ch}`;
  const plain = "`1234567890-=[]\\;',./".indexOf(ch);
  if (plain >= 0) return US_KEYS[plain]!;
  const shifted = '~!@#$%^&*()_+{}|:"<>?'.indexOf(ch);
  if (shifted >= 0) return `Shift+${US_KEYS[shifted]}`;
  throw new Error(`no US key for ${ch}`);
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

for (const language of LANGUAGES) {
  // The first layout that types the script itself (Roman layouts convert words on Space).
  const layouts = layoutsOf(language.slug);
  const index = language.layouts.findIndex((id) => layouts.has(id) && !layouts.get(id)!.translit);
  if (index < 0) continue;
  const layout = layouts.get(language.layouts[index]!)!;
  const path = index === 0 ? `/${language.slug}` : `/${language.slug}/${layoutSlug(layout.id)}`;
  const word = language.sample.split(/[\s,.!?،؟۔।]+/u).find((w) => w.length > 1)!;
  const name = language.name.en;

  test.describe(path, () => {
    const editor = (page: Page) => page.getByRole("textbox", { name: `${name} text` });

    test.beforeEach(async ({ page }) => {
      // Skip the phone's first-visit question (phone.spec.ts covers it).
      await page.addInitScript(() => localStorage.setItem("likho:phoneKeyboard", "off"));
      await page.goto(path);
      await expect(editor(page)).toBeEditable();
    });

    test(`types ${word} from the physical keyboard`, async ({ page, isMobile }) => {
      test.skip(isMobile, "physical keyboard");
      await editor(page).click();
      const keys = TYPED_AS[language.slug];
      if (keys) for (const ch of keys) await page.keyboard.press(usKey(ch));
      else await typeText(page, layout, word);
      await expect(editor(page)).toHaveValue(word);
    });

    test("types letters on the phone keyboard", async ({ page, isMobile }) => {
      test.skip(!isMobile, "phones only");
      const keyboard = page.getByRole("group", { name: "On-screen keyboard" });
      await expect(keyboard).toHaveAttribute("data-phone", "true");
      // What each key shows on the first layer; tap the sample's letters found there.
      const shown = await keyboard
        .locator("button[data-key]")
        .evaluateAll((buttons) =>
          buttons.map((b) => [
            b.getAttribute("data-key")!,
            b.querySelector("span[aria-hidden]:not(.absolute)")?.textContent ?? "",
          ]),
        );
      // Keys with nothing on this layer (InScript has a few) show a blank label: skip them.
      const byChar = new Map(
        shown.filter(([, label]) => label?.trim()).map(([code, label]) => [label, code]),
      );
      // Hangul keys show letters that join: tap a whole word's letters and expect the syllables.
      const hangul = layout.composer === "hangul";
      // GFF builds the word from its sounds: tap s, e, l, a, m and expect ሰላም.
      const keysFor = TAPPED_AS[language.slug];
      if (keysFor) {
        for (const ch of keysFor)
          await keyboard.locator(`button[data-key="Key${ch.toUpperCase()}"]`).tap();
        await expect(editor(page)).toHaveValue(word);
        return;
      }
      // Lower case, unless that leaves the keyboard: Cherokee's lower case (ꭳ) is on no key.
      const lower = language.sample.toLowerCase();
      const cased = [...lower].filter((ch) => byChar.has(ch)).length > 1 ? lower : language.sample;
      const source = hangul ? typingParts(word) : cased;
      const letters = [...source].filter((ch) => byChar.has(ch));
      const typed = hangul ? letters : letters.slice(0, 5);
      expect(typed.length, `letters of "${language.sample}" on the keyboard`).toBeGreaterThan(1);
      for (const ch of typed) await keyboard.locator(`button[data-key="${byChar.get(ch)}"]`).tap();
      // A Latin keyboard may start in capitals.
      const expected = hangul ? word : typed.join("");
      await expect(editor(page)).toHaveValue(new RegExp(`^${escape(expected)}$`, "i"));
    });

    test("has no serious accessibility violations @nightly", async ({ page }) => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  });
}
