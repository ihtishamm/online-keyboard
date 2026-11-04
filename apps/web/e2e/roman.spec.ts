import { expect, test, type Page } from "@playwright/test";
import { ROMAN } from "../src/content/roman";

/**
 * Every Roman (English letters) page converts its example (plan item 6.4): from the physical
 * keyboard, from our on-screen keys, and from the phone's own keyboard.
 */
// [layout id, page, editor name]. Hindi, Bangla, the Wave 2 Indic languages and Jawi open on Roman typing.
const PAGES = (
  [
    ["ur-roman", "/urdu/roman", "Urdu"],
    ["el-roman", "/greek/roman", "Greek"],
    ["he-roman", "/hebrew/roman", "Hebrew"],
    ["hy-roman", "/armenian/roman", "Armenian"],
    ["ka-roman", "/georgian/roman", "Georgian"],
    ["ru-roman", "/russian/roman", "Russian"],
    ["uk-roman", "/ukrainian/roman", "Ukrainian"],
    ["be-roman", "/belarusian/roman", "Belarusian"],
    ["bg-roman", "/bulgarian/roman", "Bulgarian"],
    ["sr-roman", "/serbian/roman", "Serbian"],
    ["mk-roman", "/macedonian/roman", "Macedonian"],
    ["kk-roman", "/kazakh/roman", "Kazakh"],
    ["ky-roman", "/kyrgyz/roman", "Kyrgyz"],
    ["tg-roman", "/tajik/roman", "Tajik"],
    ["mn-roman", "/mongolian/roman", "Mongolian"],
    ["ar-roman", "/arabic/roman", "Arabic"],
    ["fa-roman", "/farsi/roman", "Farsi"],
    ["ps-roman", "/pashto/roman", "Pashto"],
    ["sd-roman", "/sindhi/roman", "Sindhi"],
    ["pnb-roman", "/shahmukhi/roman", "Punjabi (Shahmukhi)"],
    ["skr-roman", "/saraiki/roman", "Saraiki"],
    ["bal-roman", "/balochi/roman", "Balochi"],
    ["ks-roman", "/kashmiri/roman", "Kashmiri"],
    ["hi-roman", "/hindi", "Hindi"],
    ["bn-roman", "/bangla", "Bangla"],
    ["mr-roman", "/marathi", "Marathi"],
    ["gu-roman", "/gujarati", "Gujarati"],
    ["pa-roman", "/punjabi", "Punjabi (Gurmukhi)"],
    ["ta-roman", "/tamil", "Tamil"],
    ["te-roman", "/telugu", "Telugu"],
    ["kn-roman", "/kannada", "Kannada"],
    ["ml-roman", "/malayalam", "Malayalam"],
    ["si-roman", "/sinhala", "Sinhala"],
    ["ne-roman", "/nepali", "Nepali"],
    ["or-roman", "/odia", "Odia"],
    ["as-roman", "/assamese", "Assamese"],
    ["sa-roman", "/sanskrit", "Sanskrit"],
    ["kok-roman", "/konkani", "Konkani"],
    ["mai-roman", "/maithili", "Maithili"],
    ["dv-roman", "/dhivehi/roman", "Dhivehi"],
    ["ckb-roman", "/sorani/roman", "Kurdish (Sorani)"],
    ["ug-roman", "/uyghur/roman", "Uyghur"],
    ["prs-roman", "/dari/roman", "Dari"],
    ["zlm-roman", "/jawi", "Malay (Jawi)"],
  ] as const
).map(([id, path, name]) => ({
  path,
  name,
  example: ROMAN[id]!.example,
  // Balochi has no word list yet.
  hasDictionary: id !== "bal-roman",
}));

const editor = (page: Page, name: string) => page.getByRole("textbox", { name: `${name} text` });

/** Open the page with the phone's own keyboard on or off, and wait for the word list. */
async function open(page: Page, path: string, name: string, hasDictionary: boolean, own = false) {
  await page.addInitScript(
    (value) => localStorage.setItem("likho:phoneKeyboard", value),
    own ? "on" : "off",
  );
  const words = hasDictionary
    ? page.waitForResponse((r) => /\/dict\.[^/]+\.txt$/.test(r.url()))
    : null;
  await page.goto(path);
  await expect(editor(page, name)).toBeEditable();
  if (words) {
    expect((await words).ok()).toBe(true);
    await expect(editor(page, name)).toHaveAttribute("data-words", "ready");
  }
}

test("every Roman layout has a page here", () => {
  expect(PAGES).toHaveLength(Object.keys(ROMAN).length);
});

for (const { path, name, example, hasDictionary } of PAGES) {
  const [roman, script] = example;

  test.describe(path, () => {
    test("shows its example above the editor", async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId("roman-example")).toContainText(roman);
      await expect(page.getByTestId("roman-example")).toContainText(script);
    });

    test(`converts "${roman}" from the physical keyboard`, async ({ page, isMobile }) => {
      test.skip(isMobile, "physical keyboard test");
      await open(page, path, name, hasDictionary);
      await editor(page, name).click();
      await page.keyboard.type(`${roman} `);
      await expect(editor(page, name)).toHaveValue(`${script} `);
    });

    test(`converts "${roman}" from the on-screen keys`, async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch devices only");
      await open(page, path, name, hasDictionary);
      for (const c of `${roman} `) {
        const code = c === " " ? "space" : `Key${c.toUpperCase()}`;
        await page.locator(`button[data-key="${code}"]`).tap();
      }
      await expect(editor(page, name)).toHaveValue(`${script} `);
    });

    test(`converts "${roman}" from the phone's own keyboard`, async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch devices only");
      await open(page, path, name, hasDictionary, true);
      // Phone keyboards commit each word as a composition, then type a space.
      await editor(page, name).evaluate((el: HTMLTextAreaElement, words: string[]) => {
        for (const word of words) {
          el.value += `${word} `;
          el.setSelectionRange(el.value.length, el.value.length);
          el.dispatchEvent(
            new InputEvent("input", { bubbles: true, inputType: "insertText", data: " " }),
          );
        }
      }, roman.split(" "));
      await expect(editor(page, name)).toHaveValue(`${script} `);
    });
  });
}
