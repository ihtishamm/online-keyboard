/**
 * The special keyboards of ours that have no upstream source (plan 9c, Batch 4): Arabic
 * romanisation and pinyin with tone marks. Both are US QWERTY with context rules, so they are
 * generated here rather than written by hand. test/special-layouts.test.ts fails while the
 * JSON files and this script disagree; UPDATE_LAYOUTS=1 rewrites them
 * (pnpm --filter @okb/layouts import:layouts).
 */
import { US_QWERTY, type KeyCode } from "@okb/engine/layout";
import type { ContextRule, KeyDef, LayoutInput } from "@okb/engine/layout";
import { deriveLongpress } from "./imports";

type Keys = Partial<Record<KeyCode, KeyDef>>;

/** US QWERTY, letters following Caps Lock. */
function usKeys(): Keys {
  const keys: Keys = {};
  for (const [code, [n, s]] of Object.entries(US_QWERTY) as [
    KeyCode,
    readonly [string, string],
  ][]) {
    if (code === "IntlBackslash" || code === "IntlRo" || code === "IntlYen") continue;
    keys[code] = /^[a-z]$/.test(n) ? { n, s, caps: "shift" } : { n, s };
  }
  return keys;
}

/** A letter's AltGr and Shift+AltGr characters. */
function altgr(keys: Keys, letter: string, lower: string): void {
  const code = `Key${letter.toUpperCase()}` as KeyCode;
  keys[code] = { ...keys[code], ag: lower, sag: lower.toUpperCase() };
}

/**
 * Arabic romanisation (DIN 31635, the German standard much of European scholarship uses): = after a
 * letter adds its mark (h= ḥ, a= ā) and a second = gives the letter's other form (h== ḫ).
 * ` types ʿ (ʿayn) and Shift+` ʾ (hamza).
 */
const ARABIC_MARKS: readonly (readonly [string, string, string?])[] = [
  ["a", "ā"],
  ["i", "ī"],
  ["u", "ū"],
  ["e", "ē"],
  ["o", "ō"],
  ["h", "ḥ", "ḫ"],
  ["s", "ṣ", "š"],
  ["d", "ḍ", "ḏ"],
  ["t", "ṭ", "ṯ"],
  ["z", "ẓ", "ž"],
  ["g", "ġ", "ǧ"],
  ["j", "ǧ"],
];

export function arabicTransliteration(): LayoutInput {
  const keys = usKeys();
  keys.Backquote = { n: "ʿ", s: "ʾ", ag: "`", sag: "~" };
  keys.BracketLeft = { ...keys.BracketLeft, ag: "ʻ" };
  keys.BracketRight = { ...keys.BracketRight, ag: "ʼ" };
  for (const [base, first] of ARABIC_MARKS) if (base !== "j") altgr(keys, base, first);
  keys.KeyJ = { ...keys.KeyJ, ag: "ǧ", sag: "Ǧ" };
  const rules: ContextRule[] = [];
  for (const upper of [false, true]) {
    const c = (s: string) => (upper ? s.toUpperCase() : s);
    for (const [base, first, second] of ARABIC_MARKS) {
      rules.push({ before: c(base), typed: "=", add: c(first), remove: 1 });
      if (second) rules.push({ before: c(first), typed: "=", add: c(second), remove: 1 });
    }
  }
  return {
    id: "arl-standard",
    lang: "ar-Latn",
    script: "Latn",
    dir: "ltr",
    name: { en: "Romanisation", native: "Romanisation" },
    source:
      "Ours: US QWERTY with DIN 31635 letters. = after a letter adds its mark (h= ḥ, a= ā), a second = its other form (h== ḫ, s== š, t== ṯ, d== ḏ, g== ǧ); ` types ʿ and Shift+` ʾ. AltGr types the marked letters at once, and AltGr+[ ] the ALA-LC ʻ ʼ.",
    keys,
    rules,
    longpress: deriveLongpress(keys, ARABIC_ACCENTS),
  };
}

/** The marked letters, offered first on a long press of their base letter. */
export const ARABIC_ACCENTS = "āīūēōḥḫṣšḍḏṭṯẓžġǧ";

/** Pinyin finals, with ü for v. */
const FINALS = [
  ...["a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "ong"],
  ...["er", "ia", "ie", "iao", "iu", "ian", "in", "iang", "ing", "iong", "ua", "uo", "uai"],
  ...["ui", "uan", "un", "uang", "ue", "üe", "üan", "ün"],
];
/** Finals that start a syllable, so may start a sentence or a name: Ài, Ōu. */
const CAPITAL_FINALS = ["A", "Ai", "Ao", "An", "Ang", "E", "Ei", "En", "Eng", "Er", "O", "Ou"];
const TONES = ["\u0304", "\u0301", "\u030C", "\u0300"];

/** The vowel that carries the tone: a or e, the o of ou, else the last vowel. */
export function toneMark(syllable: string, tone: number): string {
  const vowels = [...syllable]
    .map((c, i) => [c, i] as const)
    .filter(([c]) => /[aeiouüAEIOUÜ]/.test(c));
  const at =
    vowels.find(([c]) => /[aeAE]/.test(c))?.[1] ??
    (/ou/i.test(syllable) ? syllable.search(/[oO]u/) : vowels[vowels.length - 1]![1]);
  return (syllable.slice(0, at + 1) + TONES[tone - 1] + syllable.slice(at + 1)).normalize("NFC");
}

export function pinyinTones(): LayoutInput {
  const keys = usKeys();
  // Pinyin has no v: it types ü, as in every pinyin input method. AltGr+V types a v.
  keys.KeyV = { n: "ü", s: "Ü", ag: "v", sag: "V", caps: "shift" };
  const rules: ContextRule[] = [];
  for (const final of [...FINALS, ...CAPITAL_FINALS]) {
    for (let tone = 1; tone <= 4; tone++) {
      rules.push({
        before: final,
        typed: String(tone),
        add: toneMark(final, tone),
        remove: final.length,
      });
    }
    // 5 is the neutral tone, which has no mark (ma5 → ma).
    rules.push({ before: final, typed: "5", add: "" });
  }
  return {
    id: "py-tones",
    lang: "zh-Latn-pinyin",
    script: "Latn",
    dir: "ltr",
    name: { en: "Tone numbers", native: "Shēngdiào" },
    source:
      "Ours: US QWERTY. A tone number after a syllable becomes its mark, on the vowel the pinyin rules choose (ma3 mǎ, hao3 hǎo, liu2 liú); 5 is the neutral tone. v types ü, and AltGr+V a v.",
    keys,
    rules,
    longpress: deriveLongpress(keys, PINYIN_ACCENTS),
  };
}

/** Every toned vowel, offered on a long press of its vowel (a: ā á ǎ à). */
export const PINYIN_ACCENTS = [..."aeiouü"]
  .flatMap((v) => [1, 2, 3, 4].map((t) => toneMark(v, t)))
  .join("");

export const SPECIAL_LAYOUTS: readonly { file: string; build: () => LayoutInput }[] = [
  { file: "arabic-transliteration/standard.json", build: arabicTransliteration },
  { file: "pinyin-tones/tones.json", build: pinyinTones },
];
