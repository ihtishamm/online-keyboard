import type { TranslitScheme } from "@okb/engine";

/**
 * English letters → Uyghur (Arabic-based script), from the Latin alphabet ULY: ch چ, sh ش, zh ژ,
 * gh غ, ng ڭ, x خ, q ق, w ۋ. On an English keyboard ö, ü and é are typed o, u and e (the word list
 * tells them apart), or oe, ue and ee. Uyghur writes every vowel, and a vowel starting a word sits
 * on ئ. An apostrophe keeps n and g apart (ۋېن'گرىيە) or marks ئ inside a word. Written for this
 * project.
 */
export const UG_ROMAN: TranslitScheme = {
  id: "ug-roman",
  lang: "ug",
  vowels: "aeiou",
  doubledCost: 0,
  rules: [
    // ----- consonant pairs -----
    { in: "ch", out: "چ" },
    { in: "gh", out: "غ" },
    { in: "kh", out: "خ" },
    { in: "ng", out: "ڭ نگ:1" },
    { in: "sh", out: "ش" },
    { in: "zh", out: "ژ" },

    // ----- single consonants -----
    { in: "b", out: "ب" },
    { in: "c", out: "ك:0.6 س:0.8" },
    { in: "d", out: "د" },
    { in: "f", out: "ف" },
    { in: "g", out: "گ" },
    { in: "h", out: "ھ" },
    { in: "j", out: "ج" },
    { in: "k", out: "ك" },
    { in: "l", out: "ل" },
    { in: "m", out: "م" },
    { in: "n", out: "ن" },
    { in: "p", out: "پ" },
    { in: "q", out: "ق" },
    { in: "r", out: "ر" },
    { in: "s", out: "س" },
    { in: "t", out: "ت" },
    { in: "v", out: "ۋ" },
    { in: "w", out: "ۋ" },
    { in: "x", out: "خ" },
    { in: "y", out: "ي" },
    { in: "z", out: "ز" },
    { in: "'", next: "V", out: "ئ -:0.3" },
    { in: "'", out: "-" },

    // ----- vowels at the start, or after another vowel: on ئ -----
    { in: "a", at: "start", out: "ئا" },
    { in: "e", at: "start", out: "ئە ئې:0.3" },
    { in: "ee", at: "start", out: "ئې" },
    { in: "i", at: "start", out: "ئى" },
    { in: "o", at: "start", out: "ئو ئۆ:0.3" },
    { in: "oe", at: "start", out: "ئۆ" },
    { in: "u", at: "start", out: "ئۇ ئۈ:0.3" },
    { in: "ue", at: "start", out: "ئۈ" },
    { in: "a", prev: "V", at: "notStart", out: "ئا ا:0.3" },
    { in: "e", prev: "V", at: "notStart", out: "ئە ئې:0.3 ە:0.3" },
    { in: "i", prev: "V", at: "notStart", out: "ئى ى:0.3" },
    { in: "o", prev: "V", at: "notStart", out: "ئو ئۆ:0.3 و:0.3" },
    { in: "u", prev: "V", at: "notStart", out: "ئۇ ئۈ:0.3 ۇ:0.3" },

    // ----- vowels after a consonant -----
    { in: "a", prev: "C", at: "notStart", out: "ا ە:1" },
    { in: "e", prev: "C", at: "notStart", out: "ە ې:0.2 ى:1" },
    { in: "ee", prev: "C", at: "notStart", out: "ې" },
    { in: "i", prev: "C", at: "notStart", out: "ى ې:0.8" },
    { in: "o", prev: "C", at: "notStart", out: "و ۆ:0.3" },
    { in: "oe", prev: "C", at: "notStart", out: "ۆ" },
    { in: "u", prev: "C", at: "notStart", out: "ۇ ۈ:0.3" },
    { in: "ue", prev: "C", at: "notStart", out: "ۈ" },
  ],
  omitted: "",
  capitals: {},
  words: [
    ["uyghur uighur", "ئۇيغۇر"],
    ["uyghurche", "ئۇيغۇرچە"],
    ["salam", "سالام"],
    ["rehmet rahmat", "رەھمەت"],
    ["yaxshi yakhshi", "ياخشى"],
    ["men", "مەن"],
    ["sen", "سەن"],
    ["siz", "سىز"],
    ["biz", "بىز"],
    ["u", "ئۇ"],
    ["ular", "ئۇلار"],
    ["bu", "بۇ"],
    ["we", "ۋە"],
    ["bilen", "بىلەن"],
    ["uchun", "ئۈچۈن"],
    ["ene", "ئەنە"],
  ],
  punctuation: { ",": "،", "?": "؟", ";": "؛" },
};
