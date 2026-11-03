import type { TranslitRule, TranslitScheme } from "@okb/engine";

/** Sukun: a Thaana consonant with no vowel after it carries this sign. */
const SUKUN = "\u07B0";
/** Alifu: the seat of a vowel with no consonant before it (އަ), and of a final or doubling stop. */
const ALIFU = "އ";

/** Thaana consonants by Latin spelling, in the official Malé Latin. */
const CONSONANTS: readonly (readonly [string, string])[] = [
  ["k", "ކ"],
  ["kh", "ޚ"],
  ["g", "ގ"],
  ["gh", "ޣ"],
  ["ch", "ޗ"],
  ["j", "ޖ"],
  ["ny", "ޏ"],
  ["t", "ޓ ތ:0.2"],
  ["th", "ތ ޘ:0.8"],
  ["d", "ޑ ދ:0.2"],
  ["dh", "ދ ޛ:1"],
  ["n", "ނ"],
  ["p", "ޕ"],
  ["f", "ފ"],
  ["b", "ބ"],
  ["m", "މ"],
  ["y", "ޔ"],
  ["r", "ރ"],
  ["l", "ލ"],
  ["lh", "ޅ"],
  ["v", "ވ"],
  ["w", "ވ"],
  ["s", "ސ ޞ:0.8"],
  ["sh", "ށ ޝ:0.5"],
  ["h", "ހ ޙ:0.8"],
  ["z", "ޒ ޜ:0.8 ޡ:1 ޟ:1"],
  ["q", "ޤ"],
  ["c", "ކ:0.3 ސ:0.6"],
  ["x", "ކްސ"],
];

/** Vowel signs (fili): the long ones are written double, the short ones can stand for them. */
const VOWELS: readonly (readonly [string, string, string])[] = [
  ["a", "\u07A6", "\u07A7"],
  ["aa", "\u07A7", ""],
  ["i", "\u07A8", "\u07A9"],
  ["ee", "\u07A9", ""],
  ["u", "\u07AA", "\u07AB"],
  ["oo", "\u07AB", ""],
  ["e", "\u07AC", "\u07AD"],
  ["ey", "\u07AD", ""],
  ["o", "\u07AE", "\u07AF"],
  ["oa", "\u07AF", ""],
];

const withSukun = (spec: string) =>
  spec
    .split(" ")
    .map((part) => {
      const [text, cost] = part.split(":");
      return `${text}${text!.endsWith(SUKUN) ? "" : SUKUN}${cost ? `:${cost}` : ""}`;
    })
    .join(" ");

/** A consonant bare before a vowel, and with a sukun before a consonant or at the end. */
const consonant = ([roman, spec]: readonly [string, string]): TranslitRule[] => [
  { in: roman, next: "V", out: spec },
  { in: roman, next: "C", out: withSukun(spec) },
  { in: roman, at: "end", out: withSukun(spec) },
];

const vowel = ([roman, sign, long]: readonly [string, string, string]): TranslitRule[] => {
  const after = (s: string) => (long ? `${s} ${s === sign ? long : ALIFU + long}:0.7` : s);
  return [
    { in: roman, at: "start", out: after(ALIFU + sign) },
    { in: roman, prev: "V", at: "notStart", out: after(ALIFU + sign) },
    { in: roman, prev: "C", at: "notStart", out: after(sign) },
  ];
};

/** Doubled sounds: a stop is doubled with alifu and sukun (ރާއްޖެ raajje), a nasal with its own. */
const doubled = (roman: string, letter: string, seat = ALIFU): TranslitRule => ({
  in: roman,
  next: "V",
  out: `${seat}${SUKUN}${letter}`,
});

/**
 * English letters → Dhivehi (Thaana), by the official Malé Latin the Maldives uses on signs and
 * in names: th ތ, dh ދ, lh ޅ, sh ށ, aa \u07A7, ee \u07A9, oo \u07AB, ey \u07AD, oa \u07AF. Every vowel is written, so the
 * rules read nearly letter by letter; the word list chooses between t ޓ and ތ, d ޑ and ދ, and
 * the long and short vowels that chat spelling mixes. Written for this project.
 */
export const DV_ROMAN: TranslitScheme = {
  id: "dv-roman",
  lang: "dv",
  vowels: "aeiou",
  doubledCost: 0,
  rules: [
    // ----- word endings: h is ށް after a vowel (-ah), or the stop އް (-eh) -----
    { in: "h", at: "end", prev: "V", out: `ށް ${ALIFU}${SUKUN}:0.1 ހް:1` },
    { in: "h", next: "C", prev: "V", out: `ށް ${ALIFU}${SUKUN}:0.3 ހް:0.8` },

    // ----- prenasalised stops: the nasal has no sukun (ހަނދު handhu, ޖަނބު janbu) -----
    { in: "ng", next: "V", out: "ނގ ންގ:0.6" },
    { in: "ndh", next: "V", out: "ނދ ންދ:0.6" },
    { in: "nd", next: "V", out: "ނޑ ނދ:0.2 ންދ:0.6 ންޑ:0.6" },
    { in: "mb", next: "V", out: "ނބ ންބ:0.6 މްބ:1" },
    { in: "nb", next: "V", out: "ނބ ންބ:0.4" },

    // ----- doubled consonants -----
    doubled("kk", "ކ"),
    doubled("gg", "ގ"),
    doubled("cch", "ޗ"),
    doubled("chch", "ޗ"),
    doubled("jj", "ޖ"),
    doubled("tt", "ޓ"),
    doubled("tth", "ތ"),
    doubled("thth", "ތ"),
    doubled("dd", "ޑ"),
    doubled("ddh", "ދ"),
    doubled("dhdh", "ދ"),
    doubled("pp", "ޕ"),
    doubled("ff", "ފ"),
    doubled("bb", "ބ"),
    doubled("yy", "ޔ"),
    doubled("rr", "ރ"),
    doubled("vv", "ވ"),
    doubled("ss", "ސ"),
    doubled("ssh", "ށ"),
    doubled("shsh", "ށ"),
    doubled("hh", "ހ"),
    { in: "mm", next: "V", out: `ނ${SUKUN}މ ${ALIFU}${SUKUN}މ:0.1 މ${SUKUN}މ:0.8` },
    doubled("nn", "ނ", "ނ"),
    { in: "ll", next: "V", out: `ލ${SUKUN}ލ ${ALIFU}${SUKUN}ލ:0.1` },

    ...CONSONANTS.flatMap(consonant),
    ...VOWELS.flatMap(vowel),
    { in: "'", out: "ޢ -:0.5" },
  ],
  omitted: "",
  capitals: {},
  words: [
    ["dhivehi divehi", "ދިވެހި"],
    ["dhivehin", "ދިވެހިން"],
    ["raajje raaje", "ރާއްޖެ"],
    ["maa", "މާ"],
    ["mi", "މި"],
    ["aharen", "އަހަރެން"],
    ["kaley", "ކަލޭ"],
    ["thiya", "ތިޔަ"],
    ["shukuriyya shukuriyaa", "ޝުކުރިއްޔާ"],
    ["assalaamu", "އައްސަލާމު"],
    ["alaikum", "ޢަލައިކުމް"],
    ["haalu", "ހާލު"],
    ["kihineh", "ކިހިނެއް"],
    ["ehen", "އެހެން"],
    ["aai", "އާއި"],
  ],
  punctuation: { ",": "،", "?": "؟", ";": "؛" },
};
