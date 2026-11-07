/**
 * Punjabi: Shahmukhi ↔ Gurmukhi (plan item 10.2). Gurmukhi is written in Shahmukhi by rule,
 * which is nearly mechanical; Shahmukhi is the pivot, and `Bridge` (bridge.ts) lets a word list
 * choose what the rules can't: the short vowels and doubling Shahmukhi leaves out, and which of
 * س ص ث a word uses. Digits and punctuation change too (੧੨ ↔ ۱۲, । ↔ ۔, ? ↔ ؟); Latin digits stay.
 */
import type { Pair, Side } from "./bridge.ts";

const NUKTA = "\u0A3C";
const VIRAMA = "\u0A4D";

function table(spec: string): Map<string, string[]> {
  return new Map(
    spec.split(",").map((row) => {
      const [k, ...v] = row.trim().split(" ");
      return [k!, v];
    }),
  );
}

// Gurmukhi consonant → a sound class (h, m and n matter below), Shahmukhi.
const G_CONSONANT = table(
  "ਕ k ک,ਖ kH کھ,ਗ g گ,ਘ gH گھ,ਙ n ن,ਚ c چ,ਛ cH چھ,ਜ j ج,ਝ jH جھ,ਞ n ن,ਟ T ٹ,ਠ TH ٹھ,ਡ D ڈ,ਢ DH ڈھ,ਣ n ن,ਤ t ت,ਥ tH تھ,ਦ d د,ਧ dH دھ,ਨ n ن,ਪ p پ,ਫ pH پھ,ਬ b ب,ਭ bH بھ,ਮ m م,ਯ y ی,ਰ r ر,ਲ l ل,ਵ w و,ੜ R ڑ,ਸ s س,ਹ h ہ",
);
// The same with a nukta below.
const G_NUKTA = table("ਸ S ش,ਖ x خ,ਗ G غ,ਜ z ز,ਫ f ف,ਲ l ل,ਕ k ق");

const G_SIGN = table(
  "ਾ A ا,ਿ _ _,ੀ y ی,\u0A41 _ _,\u0A42 w و,\u0A47 y ے,\u0A48 y ے,\u0A4B w و,\u0A4C w و",
);
// The vowel signs each independent vowel stands for (ਅ for none).
const G_INDEPENDENT = new Map([
  ["ਅ", ""],
  ["ਆ", "ਾ"],
  ["ਇ", "ਿ"],
  ["ਈ", "ੀ"],
  ["ਉ", "\u0A41"],
  ["ਊ", "\u0A42"],
  ["ਏ", "\u0A47"],
  ["ਐ", "\u0A48"],
  ["ਓ", "\u0A4B"],
  ["ਔ", "\u0A4C"],
]);

type Unit =
  | { t: "C"; key: string; sh: string }
  | { t: "V"; sign: string; free: boolean } // free: written as a letter of its own (ਆ, ਈ)
  | { t: "N" } // \u0A70 or \u0A02
  | { t: "G" }; // \u0A71

/** A Gurmukhi word as consonants, vowels and signs. */
function gurmukhiUnits(word: string): Unit[] {
  const units: Unit[] = [];
  // Every letter here is one UTF-16 unit.
  const chars = word;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (G_CONSONANT.has(c)) {
      let entry = G_CONSONANT.get(c)!;
      if (chars[i + 1] === NUKTA && G_NUKTA.has(c)) {
        entry = G_NUKTA.get(c)!;
        i++;
      }
      // A subjoined ਹ is the Shahmukhi ھ: ਪੜ੍ਹ is پڑھ.
      if (c === "ਹ" && chars[i - 1] === VIRAMA) units.push({ t: "C", key: "H", sh: "ھ" });
      else units.push({ t: "C", key: entry[0]!, sh: entry[1]! });
    } else if (G_SIGN.has(c)) {
      units.push({ t: "V", sign: c, free: false });
    } else if (G_INDEPENDENT.has(c)) {
      units.push({ t: "V", sign: G_INDEPENDENT.get(c)!, free: true });
    } else if (c === "ੲ" || c === "ੳ") {
      // A bare carrier with a sign after it, as some keyboards type ਇ.
      const next = chars[i + 1];
      if (next && G_SIGN.has(next)) {
        units.push({ t: "V", sign: next, free: true });
        i++;
      } else units.push({ t: "V", sign: c === "ੲ" ? "ਿ" : "\u0A41", free: true });
    } else if (c === "\u0A70" || c === "\u0A02") units.push({ t: "N" });
    else if (c === "\u0A71") units.push({ t: "G" });
    else if (c === "ਃ") units.push({ t: "C", key: "h", sh: "ہ" });
    // \u0A4D (handled by the letter after it), \u0A51, \u0A75 and other signs add nothing.
  }
  return units;
}

/** The Shahmukhi the rules write for a Gurmukhi word. */
function fromGurmukhi(word: string, beforeHWritten = true): string {
  const units = gurmukhiUnits(word);
  let sh = "";
  // The last unit that isn't a nasal sign.
  let end = units.length - 1;
  while (end > 0 && units[end]!.t === "N") end--;
  units.forEach((u, i) => {
    const next = units[i + 1];
    const last = i >= end;
    if (u.t === "C") {
      sh += u.sh;
    } else if (u.t === "G") {
      // Doubling isn't written in Shahmukhi.
    } else if (u.t === "N") {
      // Before ਮ or ਨ a tippi doubles the letter, like \u0A71: ਅੰਮ੍ਰਿਤਸਰ امرتسر.
      if (next?.t === "C" && (next.key === "m" || next.key === "n")) return;
      // ں at the end of a word (ਮੈਂ میں, ਹਾਂ ہاں), ن inside it (ਮੁੰਡਾ منڈا).
      sh += last ? "ں" : "ن";
    } else if (!u.free || i > 0) {
      // A vowel sign after a consonant, or a vowel letter after a sound, which Shahmukhi
      // writes with a hamza (ਆਇਆ آیا, ਗਈ گئی).
      const afterVowel = u.free;
      const nextFree = next?.t === "V" && next.free;
      const s = u.sign;
      if (s === "" || s === "ਿ" || s === "\u0A41") {
        // Short vowels aren't written, except before another vowel (ਦਰਿਆ دریا, ਦੁਆਰ دوار)
        // and before ਹ (ਅਜਿਹਾ اجیہا, ਉਹ اوہ).
        const beforeH = beforeHWritten && next?.t === "C" && next.key === "h";
        if ((nextFree || beforeH) && s !== "") {
          sh += s === "ਿ" ? "ی" : "و";
        } else if (afterVowel && s !== "") {
          sh += s === "ਿ" ? "ئ" : "ؤ";
        } else if (afterVowel) {
          sh += "ا";
        } else if (s === "ਿ" && i === 1 && units.length === 2) {
          // A word of one letter and ਿ is written with ہ: ਕਿ کہ. In longer words a final ਿ
          // isn't written (ਸਤਿ ست).
          sh += "ہ";
        }
      } else {
        const [k, letter] = G_SIGN.get(s)!;
        let written = letter!;
        // ی inside a word, ے at its end; ਏ after a vowel carries a hamza: ਗਏ گئے.
        if (written === "ے" && (!last || next?.t === "N")) written = "ی";
        if (afterVowel && (k === "y" || k === "w")) written = (k === "y" ? "ئ" : "") + written;
        sh += written;
      }
    } else {
      // A vowel letter at the start of a word: ا carries it.
      const s = u.sign;
      if (s === "ਾ") {
        sh += "آ";
      } else {
        const beforeH = beforeHWritten && next?.t === "C" && next.key === "h";
        const letter =
          s === "" || ((s === "ਿ" || s === "\u0A41") && !beforeH)
            ? ""
            : s === "ਿ"
              ? "ی"
              : s === "\u0A41"
                ? "و"
                : G_SIGN.get(s)![1]!;
        let written = letter === "ے" && (!last || next?.t === "N") ? "ی" : letter;
        if (written === "ا") written = "";
        sh += "ا" + written;
      }
    }
  });
  return sh;
}

// Shahmukhi letter → sound class, Gurmukhi.
const S_CONSONANT = new Map<string, [string, string]>(
  (
    "ب b ਬ,پ p ਪ,ت t ਤ,ٹ T ਟ,ث s ਸ,ج j ਜ,چ c ਚ,ح h ਹ,خ x ਖ" +
    NUKTA +
    ",د d ਦ,ڈ D ਡ,ذ z ਜ" +
    NUKTA +
    ",ر r ਰ,ڑ R ੜ,ز z ਜ" +
    NUKTA +
    ",ژ z ਜ" +
    NUKTA +
    ",س s ਸ,ش S ਸ" +
    NUKTA +
    ",ص s ਸ,ض z ਜ" +
    NUKTA +
    ",ط t ਤ,ظ z ਜ" +
    NUKTA +
    ",غ G ਗ" +
    NUKTA +
    ",ف f ਫ" +
    NUKTA +
    ",ق k ਕ,ک k ਕ,گ g ਗ,ل l ਲ,م m ਮ,ن n ਨ,ݨ n ਣ,ہ h ਹ"
  )
    .split(",")
    .map((row) => {
      const [k, key, g] = row.split(" ");
      return [k!, [key!, g!]];
    }),
);
const ASPIRATE = table("ਕ ਖ,ਗ ਘ,ਚ ਛ,ਜ ਝ,ਟ ਠ,ਡ ਢ,ਤ ਥ,ਦ ਧ,ਪ ਫ,ਬ ਭ");
const S_VOWEL = new Set(["ا", "آ", "و", "ی", "ے", "ع", "ء", "ئ", "ؤ"]);

/** Marks Shahmukhi usually leaves out, and joiners: dropped before anything else. */
function dropped(code: number): boolean {
  return (
    (code >= 0x64b && code <= 0x65f) ||
    code === 0x670 ||
    code === 0x640 ||
    (code >= 0x6ea && code <= 0x6ed) ||
    code === 0x200c ||
    code === 0x200e ||
    code === 0x200f
  );
}
const S_LETTER = new Map(
  ["ي ی", "ى ی", "ك ک", "ه ہ", "ۃ ہ", "ۀ ہ", "ۂ ہ", "ۓ ئے", "ݪ ل", "ڻ ݨ"].map(
    (pair) => pair.split(" ") as [string, string],
  ),
);
S_LETTER.set(String.fromCodePoint(0x8c7), "ل");
const HAMZA_ABOVE = String.fromCodePoint(0x654);

function normalizeShahmukhi(word: string): string {
  let out = "";
  const text = word.normalize("NFC");
  // Every letter here is one UTF-16 unit.
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === HAMZA_ABOVE && out.endsWith("ی")) out = out.slice(0, -1) + "ئ";
    else if (!dropped(text.charCodeAt(i))) out += S_LETTER.get(c) ?? c;
  }
  // Punjabi Wikipedia's bots write plurals such as علاقےآں for علاقیاں.
  return out.includes("ےآ") ? out.replaceAll("ےآ", "یا") : out;
}

/** Letters Gurmukhi can't tell apart, which only a word list can choose between. */
const SPELLING = new Map(
  ["ص س", "ث س", "ط ت", "ذ ز", "ض ز", "ظ ز", "ژ ز", "ح ہ", "ق ک", "أ ا", "ؤ و", "ݨ ن"].map(
    (pair) => pair.split(" ") as [string, string],
  ),
);
// Only carry a vowel, or (ع) are written as a vowel or not at all in Gurmukhi: ਇਲਮ علم.
for (const c of ["ئ", "ء", "ع"]) SPELLING.set(c, "");

/** Differences people make when they type, on top of SPELLING. */
const TYPING = new Map(
  // Letters a nukta makes in Gurmukhi, which many people leave out: ਖਬਰ for ਖ਼ਬਰ.
  ["غ گ", "خ کھ", "ف پھ", "ز ج"].map((pair) => pair.split(" ") as [string, string]),
);

/** A Shahmukhi spelling with the choices Gurmukhi can't make folded away. */
export function spellShahmukhi(word: string): string {
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    let to = SPELLING.get(c) ?? c;
    if (c === "آ" && out !== "") to = "ا";
    // ہہ is one h (ایہہ), and two alifs one vowel.
    if ((to === "ہ" || to === "ا") && out.endsWith(to)) continue;
    out += to;
  }
  // A final ہ after a consonant is often the vowel ا: بچہ ਬੱਚਾ, کمرہ ਕਮਰਾ.
  const before = out.at(-2);
  if (out.endsWith("ہ") && before && before !== "ا" && before !== "و") out = out.slice(0, -1) + "ا";
  return out;
}

function typed(word: string): string {
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!;
    const next = word[i + 1];
    // \u0A02 before ਬ or ਪ sounds m, and Shahmukhi often writes م: ਦਸੰਬਰ دسمبر.
    if (c === "ن" && (next === "ب" || next === "پ")) out += "م";
    else out += TYPING.get(c) ?? c;
  }
  return out;
}

/** Shahmukhi spellings that sound alike fold to one key; ع gives one key per way of reading it. */
export function foldShahmukhi(word: string): string[] {
  if (!word.includes("ع")) return [typed(spellShahmukhi(word))];
  const readings = [word, word.replaceAll("ع", "ا"), word.replaceAll("ع", "ی")];
  return [...new Set(readings.map((w) => typed(spellShahmukhi(w))))];
}

/** The Gurmukhi the rules write for a normalized Shahmukhi word: a guess at the vowels. */
function shahmukhiRules(word: string): string {
  const chars = [...word];
  let out = "";
  // Whether the last thing written was a consonant (with its inherent vowel) or ਅ.
  let bare = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    const next = chars[i + 1];
    const first = out === "";
    const final = i === chars.length - 1 || (i === chars.length - 2 && next === "ں");
    if (c === "ن" && next && !S_VOWEL.has(next) && next !== "ھ" && next !== "ں" && !first) {
      out += bare ? "\u0A70" : "\u0A02";
      bare = false;
    } else if (c === "ہ" && final && !first && bare && chars[i - 1] !== "ہ") {
      out += "ਾ";
      bare = false;
    } else if (S_CONSONANT.has(c)) {
      let g = S_CONSONANT.get(c)![1];
      if (next === "ھ") {
        g = ASPIRATE.get(g)?.[0] ?? g + VIRAMA + "ਹ";
        i++;
      }
      out += g;
      bare = true;
    } else if (c === "ھ") {
      out += "ਹ";
      bare = true;
    } else if (c === "ں") {
      out += "\u0A02";
      bare = false;
    } else if (c === "ا" || c === "آ" || c === "ع") {
      if (first || !bare) {
        if (c === "آ") out += "ਆ";
        else if (next === "ی" && first) {
          out += final || chars[i + 2] === undefined ? "ਈ" : "ਏ";
          i++;
        } else if (next === "و" && first) {
          out += "ਓ";
          i++;
        } else if (c === "ع" && !first) {
          // A medial ع leaves a vowel the consonant already has.
        } else out += first ? "ਅ" : "ਆ";
        bare = first;
      } else {
        out += c === "ع" ? "" : "ਾ";
        bare = c === "ع";
      }
    } else if (c === "و" || c === "ؤ") {
      if (first || (!bare && c === "و")) {
        out += "ਵ";
        bare = true;
      } else {
        out += c === "ؤ" ? "ਉ" : "\u0A4B";
        bare = false;
      }
    } else if (c === "ی") {
      if (first) {
        out += "ਯ";
        bare = true;
      } else if (bare && next === "ا") {
        out += "ਿਆ";
        i++;
        bare = false;
      } else if (bare) {
        out += "ੀ";
        bare = false;
      } else {
        out += final ? "ਈ" : "ਯ";
        bare = !final;
      }
    } else if (c === "ے") {
      out += bare ? "\u0A47" : "ਏ";
      bare = false;
    } else if (c === "ئ") {
      if (next === "ی") out += "ਈ";
      else if (next === "ے") out += "ਏ";
      else if (next === "و") out += "ਓ";
      else out += "ਇ";
      if (next === "ی" || next === "ے" || next === "و") i++;
      bare = false;
    } else if (c === "ء") {
      // A hamza on its own adds no letter.
    } else out += c;
  }
  return out.normalize("NFC");
}

// Marks first, so no letter comes before a mark in the class.
const GURMUKHI_WORD = /[\u{A70}-\u{A75}\u{A01}-\u{A65}]+/gu;
const SHAHMUKHI_WORD =
  /[\u{621}-\u{63A}\u{640}-\u{65F}\u{670}-\u{6D3}\u{6D5}\u{6FA}-\u{6FF}\u{750}-\u{77F}\u{8A0}-\u{8FF}\u{200C}\u{200E}-\u{200F}]+/gu;

export const gurmukhi: Side = {
  word: GURMUKHI_WORD,
  normalize: (word) => word.normalize("NFC"),
  // Shahmukhi writes ਿ and \u0A41 before ਹ in some words (ਜਿਹਾ جیہا) and not in others (ਮੁਹੱਬਤ محبت).
  pivot: (word) => {
    const written = fromGurmukhi(word);
    if (!word.includes("ਹ")) return [written];
    const other = fromGurmukhi(word, false);
    return other === written ? [written] : [written, other];
  },
};

export const shahmukhi: Side = {
  word: SHAHMUKHI_WORD,
  normalize: normalizeShahmukhi,
  pivot: (word) => [word],
};

const G_DIGIT = 0x0a66;
const S_DIGIT = 0x06f0;

/** Digits and punctuation from Gurmukhi to Shahmukhi. */
function othersToShahmukhi(text: string): string {
  return (
    text
      .replace(/[੦-੯]/g, (d) => String.fromCodePoint(S_DIGIT + d.codePointAt(0)! - G_DIGIT))
      .replace(/[।॥]/g, "۔")
      // A comma inside a number (1,000) stays.
      .replace(/,(?!\d)/g, "،")
      .replace(/\?/g, "؟")
      .replace(/;/g, "؛")
  );
}

/** Digits and punctuation from Shahmukhi to Gurmukhi. */
function othersToGurmukhi(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String.fromCodePoint(G_DIGIT + d.codePointAt(0)! - S_DIGIT))
    .replace(/[٠-٩]/g, (d) => String.fromCodePoint(G_DIGIT + d.codePointAt(0)! - 0x0660))
    .replace(/۔/g, "।")
    .replace(/،/g, ",")
    .replace(/؟/g, "?")
    .replace(/؛/g, ";");
}

export const GURMUKHI_TO_SHAHMUKHI: Pair = {
  from: gurmukhi,
  to: shahmukhi,
  spell: spellShahmukhi,
  fold: foldShahmukhi,
  weight: 1.5,
  rules: (word) => fromGurmukhi(word),
  others: othersToShahmukhi,
};

export const SHAHMUKHI_TO_GURMUKHI: Pair = {
  from: shahmukhi,
  to: gurmukhi,
  spell: spellShahmukhi,
  fold: foldShahmukhi,
  weight: 1.5,
  rules: shahmukhiRules,
  others: othersToGurmukhi,
};

export { fromGurmukhi, shahmukhiRules, normalizeShahmukhi };

/** Which script a text is mostly in, or null when it has no letters of either. */
export function punjabiScript(text: string): "gurmukhi" | "shahmukhi" | null {
  const g = text.match(/[\u{A05}-\u{A74}]/gu)?.length ?? 0;
  const s = text.match(/[\u{621}-\u{6D3}]/gu)?.length ?? 0;
  if (!g && !s) return null;
  return g >= s ? "gurmukhi" : "shahmukhi";
}
