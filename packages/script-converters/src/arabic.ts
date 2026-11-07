/**
 * The Arabic-script side shared by Shahmukhi and Urdu: reading a word into one spelling, and
 * folding the letters the other script can't tell apart (see bridge.ts).
 */

/** Marks Urdu and Shahmukhi usually leave out, and joiners: dropped before anything else. */
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

/** One form of each letter, without marks: the spelling looked up and compared. */
export function normalizeArabic(word: string): string {
  let out = "";
  const text = word.normalize("NFC");
  // Every letter here is one UTF-16 unit.
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === HAMZA_ABOVE && out.endsWith("ی")) out = out.slice(0, -1) + "ئ";
    else if (!dropped(text.charCodeAt(i))) out += S_LETTER.get(c) ?? c;
  }
  // Western Punjabi Wikipedia's bots write plurals such as علاقےآں for علاقیاں.
  return out.includes("ےآ") ? out.replaceAll("ےآ", "یا") : out;
}

/** Letters Gurmukhi and Devanagari can't tell apart, which only a word list can choose between. */
const SPELLING = new Map(
  ["ص س", "ث س", "ط ت", "ذ ز", "ض ز", "ظ ز", "ژ ز", "ح ہ", "ق ک", "أ ا", "ؤ و", "ݨ ن"].map(
    (pair) => pair.split(" ") as [string, string],
  ),
);
// Only carry a vowel, or (ع) are written as a vowel or not at all: ਇਲਮ and इल्म علم.
for (const c of ["ئ", "ء", "ع"]) SPELLING.set(c, "");

/** Differences people make when they type, on top of SPELLING. */
const TYPING = new Map(
  // Letters a nukta makes, which many people leave out: ਖਬਰ for ਖ਼ਬਰ, खबर for ख़बर.
  ["غ گ", "خ کھ", "ف پھ", "ز ج"].map((pair) => pair.split(" ") as [string, string]),
);

/** An Arabic-script spelling with the choices the other script can't make folded away. */
export function spellArabic(word: string): string {
  let out = "";
  // An initial عا is the vowel آ writes: عادت ਆਦਤ आदत.
  const start = word.startsWith("عا") ? "آ" + word.slice(2) : word;
  for (let i = 0; i < start.length; i++) {
    const c = start[i]!;
    let to = SPELLING.get(c) ?? c;
    if (c === "آ" && out !== "") to = "ا";
    // ہہ is one h (ایہہ), and two alifs one vowel.
    if ((to === "ہ" || to === "ا") && out.endsWith(to)) continue;
    out += to;
  }
  // A final ہ after a consonant is often the vowel ا: بچہ ਬੱਚਾ, کمرہ ਕਮਰਾ. Not in words of two
  // letters, where it is a short vowel: کہ ਕਿ कि, نہ न.
  const before = out.at(-2);
  if (out.length > 2 && out.endsWith("ہ") && before !== "ا" && before !== "و") {
    out = out.slice(0, -1) + "ا";
  }
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

/** Spellings that sound alike fold to one key; ع gives one key per way of reading it. */
export function foldArabic(word: string): string[] {
  if (!word.includes("ع")) return [typed(spellArabic(word))];
  const readings = [
    word,
    word.replaceAll("ع", "ا"),
    word.replaceAll("ع", "ی"),
    // عادت ਆਦਤ आदत: ع and ا together are the vowel آ writes.
    word.replaceAll("عا", "آ"),
  ];
  return [...new Set(readings.map((w) => typed(spellArabic(w))))];
}

/** One word in the Arabic script, with the joiners and marks inside it. */
export const ARABIC_WORD =
  /[\u{621}-\u{63A}\u{640}-\u{65F}\u{670}-\u{6D3}\u{6D5}\u{6FA}-\u{6FF}\u{750}-\u{77F}\u{8A0}-\u{8FF}\u{200C}\u{200E}-\u{200F}]+/gu;
