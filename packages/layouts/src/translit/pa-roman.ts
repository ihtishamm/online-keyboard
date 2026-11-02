import type { TranslitRule, TranslitScheme } from "@okb/engine";
import { abugidaRules } from "./indic";

/**
 * English letters → Punjabi in Gurmukhi, as Punjabi is typed in chats in India ("tusi kiwen
 * ho"). Gurmukhi rarely writes a virama: consonants mostly keep the inherent vowel, and a
 * doubled consonant is written once after an addak (ਪੱਕਾ "pakka"). Nasals are a tippi after
 * short vowels and a bindi after long ones (ਸੰਘ, ਹਾਂ); the word list decides. Letters with a
 * nukta are written as letter + nukta (NFC), as the word lists store them. Written for this
 * project from common usage.
 */

const NUKTA = "਼";
const ADDAK = "ੱ";

const CONSONANTS: readonly (readonly [string, string])[] = [
  ["k", "ਕ"],
  ["kh", `ਖ ਖ${NUKTA}:0.8`],
  ["g", "ਗ"],
  ["gh", `ਘ ਗ${NUKTA}:0.8`],
  ["ch", "ਚ ਛ:0.5"],
  ["chh", "ਛ"],
  ["c", "ਕ:0.1 ਚ:0.3"],
  ["j", `ਜ ਜ${NUKTA}:0.6 ਝ:0.8`],
  ["jh", "ਝ"],
  ["z", `ਜ${NUKTA} ਜ:0.2`],
  ["t", "ਤ ਟ:0.4"],
  ["th", "ਥ ਠ:0.4"],
  ["d", "ਦ ਡ:0.4 ੜ:0.8"],
  ["dh", "ਧ ਢ:0.5"],
  ["n", "ਨ ਣ:0.4"],
  ["p", "ਪ"],
  ["ph", `ਫ ਫ${NUKTA}:0.5`],
  ["f", `ਫ ਫ${NUKTA}:0.3`],
  ["b", "ਬ"],
  ["bh", "ਭ"],
  ["m", "ਮ"],
  ["y", "ਯ"],
  ["r", "ਰ ੜ:0.6"],
  ["rh", "ੜ:0.3"],
  ["l", `ਲ ਲ${NUKTA}:0.8`],
  ["v", "ਵ"],
  ["w", "ਵ"],
  ["s", `ਸ ਸ${NUKTA}:0.5`],
  ["sh", `ਸ${NUKTA} ਸ:0.6`],
  ["h", "ਹ"],
  ["q", `ਕ ਕ${NUKTA}:0.5`],
  ["x", "ਕਸ:0.5"],
];

/** "pakka", "sacchhe", "patti": a doubled consonant is an addak before the letter. */
function addak(): TranslitRule[] {
  const rules: TranslitRule[] = [];
  for (const [latin, out] of CONSONANTS) {
    if (latin === "h" || latin === "x") continue;
    const doubled = `${latin[0]}${latin}`;
    const outs = out
      .split(" ")
      .map((o) => ADDAK + o)
      .join(" ");
    rules.push({ in: doubled, out: outs });
  }
  // "sacchhe" ਸੱਚੇ: cch and chch double ਚ or ਛ.
  rules.push({ in: "cch", out: `${ADDAK}ਚ ${ADDAK}ਛ:0.3` });
  rules.push({ in: "chch", out: `${ADDAK}ਚ` });
  return rules;
}

export const PA_ROMAN: TranslitScheme = {
  id: "pa-roman",
  lang: "pa",
  vowels: "aeiou",
  doubledCost: 0.6,
  splitCost: 1,
  rules: [
    ...addak(),
    // Subscript ਰ and ਹ: ਪ੍ਰ, ਖੜ੍ਹਨ.
    { in: "r", prev: "C", out: "੍ਰ:0.3" },
    { in: "h", prev: "C", out: "੍ਹ:0.6" },
    { in: "y", at: "end", prev: "C", out: "ੀ:0.3" },
    // "dhakiya" ਢਕਿਆ, "saheliyan" ਸਹੇਲੀਆਂ: Gurmukhi writes no ਯ between vowels.
    { in: "y", prev: "V", next: "V", out: "-:0.2" },
    { in: "ia", prev: "C", out: "ਿਆ:0.1 ੀਆ:0.2" },
    { in: "a", prev: "V", at: "end", out: "ਆ:0.1" },

    // ----- nasals: tippi after short vowels, bindi after long ones -----
    { in: "n", next: "C", out: "ੰ:0.1 ਂ:0.2" },
    { in: "m", next: "C", out: "ੰ:0.4 ਂ:0.6" },
    { in: "n", at: "end", prev: "V", out: "ਂ:0.1 ੰ:0.3" },
    // -iaan, -ian, -aan: plural endings (ਕਾਪੀਆਂ, ਪੱਟੀਆਂ).
    { in: "an", at: "end", prev: "V", out: "ਆਂ:0.1" },
    { in: "an", at: "end", prev: "C", out: "ਾਂ:0.1" },
    { in: "aan", at: "end", prev: "V", out: "ਆਂ" },
    { in: "aan", at: "end", prev: "C", out: "ਾਂ" },

    ...abugidaRules({
      virama: "੍",
      // Consonants seldom join: "karda" is ਕਰਦਾ, not ਕ੍ਰਦਾ.
      inherentCost: 0,
      consonants: CONSONANTS,
      vowels: [
        { in: "a", independent: "ਅ ਆ:0.6", sign: "- ਾ:0.4", finalSign: "ਾ:0.1 -:0.4" },
        { in: "aa", independent: "ਆ", sign: "ਾ" },
        { in: "i", independent: "ਇ ਈ:0.5", sign: "ਿ ੀ:0.4", finalSign: "ੀ ਿ:0.6" },
        { in: "ee", independent: "ਈ", sign: "ੀ" },
        { in: "ii", independent: "ਈ", sign: "ੀ" },
        { in: "u", independent: "ਉ ਊ:0.6", sign: "ੁ ੂ:0.4", finalSign: "ੂ ੁ:0.4" },
        { in: "oo", independent: "ਊ", sign: "ੂ ੁ:0.6" },
        { in: "uu", independent: "ਊ", sign: "ੂ" },
        { in: "e", independent: "ਏ ਇ:0.8", sign: "ੇ" },
        { in: "ai", independent: "ਐ", sign: "ੈ" },
        { in: "ae", independent: "ਐ ਏ:0.3", sign: "ੈ ੇ:0.3" },
        { in: "ei", independent: "ਐ ਏ", sign: "ੈ ੇ" },
        { in: "o", independent: "ਓ", sign: "ੋ ੌ:0.6" },
        { in: "au", independent: "ਔ", sign: "ੌ" },
        { in: "ou", independent: "ਔ", sign: "ੌ" },
      ],
    }),
  ],
  omitted: "ਾ:1.6 ੁ:1.8 ਿ:2 ੀ:2 ੰ:1.4 ਂ:1.4 ੇ:2.2",
  capitals: { T: "ਟ", D: "ਡ", N: "ਣ", R: "ੜ" },
  words: [
    ["hai", "ਹੈ"],
    ["han", "ਹਨ"],
    ["nahi nahin nai", "ਨਹੀਂ"],
    ["main mai", "ਮੈਂ"],
    ["tusi tussi", "ਤੁਸੀਂ"],
    ["asi assi", "ਅਸੀਂ"],
    ["ki", "ਕੀ"],
    ["da", "ਦਾ"],
    ["di", "ਦੀ"],
    ["de", "ਦੇ"],
    ["nu nun", "ਨੂੰ"],
    ["te", "ਤੇ"],
    ["vich wich", "ਵਿੱਚ ਵਿਚ"],
    ["ji", "ਜੀ"],
    ["haan", "ਹਾਂ"],
    ["kiwen kiven kive", "ਕਿਵੇਂ"],
    ["sat", "ਸਤ"],
    ["sri shri", "ਸ੍ਰੀ"],
    ["akal", "ਅਕਾਲ"],
    ["dhanvad dhanwad", "ਧੰਨਵਾਦ"],
    ["punjabi panjabi", "ਪੰਜਾਬੀ"],
  ],
  punctuation: { ".": "।" },
};
