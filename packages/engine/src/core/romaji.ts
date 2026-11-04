import type { Rewrite } from "./hangul";

/**
 * Romaji to hiragana as you type (Hepburn and Kunrei spellings, as Japanese input methods
 * take them). Letters wait in the text until they make a kana: k stays k, then ka becomes か.
 * Doubled consonants make っ, n before a consonant makes ん, and n' makes ん. nn is ん too, but
 * its second n stays open: konna is こんな and konnichiha こんにちは, as people spell them.
 */
const VOWELS = "aiueo";

const row = (latin: string, kana: string) =>
  Object.fromEntries([...VOWELS].map((v, i) => [latin + v, [...kana.split(" ")][i]!]));

/** Plain consonant plus や ゆ よ, and the e and a forms input methods also accept. */
const palatal = (latin: string, base: string) => ({
  [latin + "a"]: base + "ゃ",
  [latin + "u"]: base + "ゅ",
  [latin + "o"]: base + "ょ",
  [latin + "e"]: base + "ぇ",
  [latin + "i"]: base + "ぃ",
});

export const ROMAJI: Readonly<Record<string, string>> = {
  ...row("", "あ い う え お"),
  ...row("k", "か き く け こ"),
  ...row("s", "さ し す せ そ"),
  ...row("t", "た ち つ て と"),
  ...row("n", "な に ぬ ね の"),
  ...row("h", "は ひ ふ へ ほ"),
  ...row("m", "ま み む め も"),
  ...row("y", "や い ゆ いぇ よ"),
  ...row("r", "ら り る れ ろ"),
  ...row("w", "わ うぃ う うぇ を"),
  ...row("g", "が ぎ ぐ げ ご"),
  ...row("z", "ざ じ ず ぜ ぞ"),
  ...row("d", "だ ぢ づ で ど"),
  ...row("b", "ば び ぶ べ ぼ"),
  ...row("p", "ぱ ぴ ぷ ぺ ぽ"),
  ...row("f", "ふぁ ふぃ ふ ふぇ ふぉ"),
  ...row("j", "じゃ じ じゅ じぇ じょ"),
  ...row("v", "ゔぁ ゔぃ ゔ ゔぇ ゔぉ"),
  ...row("ch", "ちゃ ち ちゅ ちぇ ちょ"),
  ...row("sh", "しゃ し しゅ しぇ しょ"),
  ...row("ts", "つぁ つぃ つ つぇ つぉ"),
  ...row("x", "ぁ ぃ ぅ ぇ ぉ"),
  ...row("l", "ぁ ぃ ぅ ぇ ぉ"),
  ...palatal("ky", "き"),
  ...palatal("gy", "ぎ"),
  ...palatal("sy", "し"),
  ...palatal("zy", "じ"),
  ...palatal("jy", "じ"),
  ...palatal("ty", "ち"),
  ...palatal("cy", "ち"),
  ...palatal("dy", "ぢ"),
  ...palatal("ny", "に"),
  ...palatal("hy", "ひ"),
  ...palatal("by", "び"),
  ...palatal("py", "ぴ"),
  ...palatal("my", "み"),
  ...palatal("ry", "り"),
  xya: "ゃ",
  xyu: "ゅ",
  xyo: "ょ",
  lya: "ゃ",
  lyu: "ゅ",
  lyo: "ょ",
  xtu: "っ",
  ltu: "っ",
  xtsu: "っ",
  ltsu: "っ",
  xwa: "ゎ",
  lwa: "ゎ",
  thi: "てぃ",
  dhi: "でぃ",
  ca: "か",
  cu: "く",
  co: "こ",
  ci: "し",
  ce: "せ",
  qa: "くぁ",
  qi: "くぃ",
  qu: "く",
  qe: "くぇ",
  qo: "くぉ",
  "n'": "ん",
};

const LONGEST = Math.max(...Object.keys(ROMAJI).map((k) => k.length));
const CONSONANT = /^[bcdfghjklmpqrstvwxyz]$/;

/** The rewrite a key makes, or null when it just types itself. */
export function composeRomaji(before: string, key: string): Rewrite | null {
  if (key === "-" && /[ぁ-ゟ゠-ヿ]$/.test(before)) return { remove: 0, text: "ー" };
  const k = key.toLowerCase();
  if (!/^[a-z']$/.test(k)) return null;
  const tail = /[A-Za-z']*$/.exec(before.slice(-LONGEST))![0].toLowerCase();
  for (let len = Math.min(tail.length, LONGEST - 1); len >= 0; len--) {
    const kana = ROMAJI[tail.slice(tail.length - len) + k];
    if (kana) return { remove: len, text: kana };
  }
  const last = tail.slice(-1);
  if (before.endsWith("んn") && tail === "n") {
    if (k === "n") return { remove: 0, text: "" };
    if (CONSONANT.test(k)) return { remove: 1, text: k };
  }
  if (last === "n" && k === "n") return { remove: 1, text: "んn" };
  if (last === "n" && CONSONANT.test(k) && k !== "y") return { remove: 1, text: "ん" + k };
  if (last === k && CONSONANT.test(k)) return { remove: 1, text: "っ" + k };
  if (last === "t" && k === "c") return { remove: 1, text: "っ" + k };
  return null;
}

/** A word's romaji all at once (a trailing n counts as ん), for converting a run. */
export function romajiToKana(text: string): string {
  let out = "";
  for (const c of text) {
    const r = composeRomaji(out, c);
    if (r) out = out.slice(0, out.length - r.remove) + r.text;
    else out += c;
  }
  return out.replace(/ん?n$/i, "ん");
}

/** Hiragana to katakana. */
export const toKatakana = (kana: string): string =>
  kana.replace(/[ぁ-ゖ]/g, (c) => String.fromCodePoint(c.codePointAt(0)! + 0x60));
