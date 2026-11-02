import type { TranslitScheme } from "@okb/engine";
import { abugidaRules } from "./indic";

/**
 * English letters → Telugu, as Telugu is typed in chats ("meeru ela unnaru"). Words end in a
 * vowel, often -u (తెలుగు) or -am written ం (గుమ్మం); a nasal before a consonant is the
 * anusvara (అనిపించే). "ee" and "oo" may be the long e and o (సేవ, లో) as well as ī and ū.
 * Retroflex letters are told apart by the word list or by capitals. Written for this project
 * from common usage.
 */
export const TE_ROMAN: TranslitScheme = {
  id: "te-roman",
  lang: "te",
  vowels: "aeiou",
  doubledCost: 0,
  splitCost: 1,
  rules: [
    // i then a is written i + ya ("asia").
    { in: "ia", prev: "C", out: "ియా:0.2 ియ:0.2" },
    { in: "ksh", out: "క్ష" },
    { in: "gn", out: "జ్ఞ:0.3" },
    { in: "jn", out: "జ్ఞ:0.3" },
    { in: "tr", out: "త్ర ట్ర:0.6" },
    { in: "shr", out: "శ్ర" },
    { in: "y", at: "end", prev: "C", out: "ి:0.3 ీ:0.5" },

    // ----- nasals: the anusvara before a consonant and for a final m -----
    { in: "n", next: "C", out: "ం:0.1" },
    { in: "m", next: "C", out: "ం:0.2" },
    { in: "m", at: "end", prev: "V", out: "ం" },
    { in: "ri", prev: "C", out: "ృ:0.5" },
    { in: "ru", prev: "C", out: "ృ:0.6" },

    ...abugidaRules({
      virama: "్",
      inherentCost: 0.8,
      finalVirama: 0.8,
      consonants: [
        ["k", "క"],
        ["kh", "ఖ"],
        ["g", "గ"],
        ["gh", "ఘ"],
        ["ch", "చ ఛ:0.6"],
        ["chh", "ఛ"],
        ["c", "క:0.2 చ:0.3 స:0.6"],
        ["j", "జ"],
        ["jh", "ఝ"],
        ["z", "జ"],
        ["t", "ట త:0.2"],
        ["th", "త థ:0.4 ఠ:0.8"],
        ["d", "డ ద:0.2"],
        ["dh", "ధ ద:0.4 ఢ:0.8"],
        ["n", "న ణ:0.4", "న ం:0.6"],
        ["p", "ప"],
        ["ph", "ఫ"],
        ["f", "ఫ"],
        ["b", "బ"],
        ["bh", "భ"],
        ["m", "మ"],
        ["y", "య"],
        ["r", "ర ఱ:1"],
        ["l", "ల ళ:0.4"],
        ["v", "వ"],
        ["w", "వ"],
        ["s", "స శ:0.4 ష:0.6"],
        ["sh", "శ ష:0.3"],
        ["h", "హ"],
        ["q", "క"],
        ["x", "క్స"],
      ],
      vowels: [
        { in: "a", independent: "అ ఆ:0.6", sign: "- ా:0.4", finalSign: "- ా:0.3" },
        { in: "aa", independent: "ఆ", sign: "ా" },
        { in: "i", independent: "ఇ ఈ:0.6", sign: "ి ీ:0.5" },
        { in: "ee", independent: "ఈ ఏ:0.3", sign: "ీ ే:0.3" },
        { in: "ii", independent: "ఈ", sign: "ీ" },
        { in: "u", independent: "ఉ ఊ:0.6", sign: "ు ూ:0.5" },
        { in: "oo", independent: "ఊ ఓ:0.3", sign: "ూ ో:0.3" },
        { in: "uu", independent: "ఊ", sign: "ూ" },
        { in: "e", independent: "ఎ ఏ:0.3", sign: "ె ే:0.3" },
        { in: "ae", independent: "ఏ", sign: "ే" },
        { in: "ai", independent: "ఐ", sign: "ై" },
        { in: "ei", independent: "ఐ:0.4", sign: "ై:0.4" },
        { in: "o", independent: "ఒ ఓ:0.3", sign: "ొ ో:0.3" },
        { in: "oa", independent: "ఓ", sign: "ో" },
        { in: "au", independent: "ఔ", sign: "ౌ" },
        { in: "ou", independent: "ఔ", sign: "ౌ" },
      ],
    }),
  ],
  omitted: "ం:1.4 ు:1.8 ా:2 ి:2",
  capitals: { T: "ట", D: "డ", N: "ణ", L: "ళ", S: "ష" },
  words: [
    ["namaskaram namaskaaram", "నమస్కారం"],
    ["dhanyavadalu dhanyavaadaalu", "ధన్యవాదాలు"],
    ["nenu", "నేను"],
    ["meeru miru", "మీరు"],
    ["nuvvu nuvu", "నువ్వు"],
    ["avunu", "అవును"],
    ["ledu", "లేదు"],
    ["emi", "ఏమి"],
    ["ela", "ఎలా"],
    ["bagunnara", "బాగున్నారా"],
    ["chala chaala", "చాలా"],
    ["telugu", "తెలుగు"],
  ],
  punctuation: {},
};
