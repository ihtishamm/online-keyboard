import type { TranslitScheme } from "@okb/engine";

/** Zero-width non-joiner: keeps می and ها apart from the word without a space. */
const Z = "\u200C";

/**
 * Finglish → Persian. Short vowels are not written; final e/a is usually ه (khane خانه).
 * The verb prefixes mi-/nemi- and the plural -ha get a zero-width non-joiner automatically
 * (mikonam → می\u200Cکنم, ketabha → کتاب\u200Cها), as careful Persian typing does. Written for this
 * project from common usage.
 */
export const FA_ROMAN: TranslitScheme = {
  id: "fa-roman",
  lang: "fa",
  vowels: "aeiou",
  // Some Finglish borrows the Arabic chat digit 3 for ع (ba3d بعد).
  letters: "3",
  rules: [
    { in: "3", out: "ع" },
    // ----- automatic ZWNJ -----
    { in: "mi", at: "start", next: "C", out: `می${Z}:0.1 می:0.4 م:1` },
    { in: "nemi", at: "start", next: "C", out: `نمی${Z}:0.1 نمی:0.4` },
    { in: "ha", at: "end", prev: "C", out: `${Z}ها:0.2 ها:0.2 ه:0.6 ح:0.9` },
    { in: "haye", at: "end", out: `${Z}های:0.2 های:0.3` },
    { in: "hai", at: "end", out: `${Z}های:0.3 های:0.3` },

    // ----- consonant pairs -----
    { in: "kh", out: "خ" },
    { in: "gh", out: "غ ق:0.3" },
    { in: "sh", out: "ش" },
    { in: "zh", out: "ژ" },
    { in: "ch", out: "چ" },
    { in: "th", out: "ت:0.3 ث:0.8" },

    // ----- single consonants -----
    { in: "b", out: "ب" },
    { in: "p", out: "پ" },
    { in: "t", out: "ت ط:0.8" },
    { in: "j", out: "ج" },
    { in: "d", out: "د" },
    { in: "r", out: "ر" },
    { in: "z", out: "ز ذ:0.8 ض:0.9 ظ:1" },
    { in: "s", out: "س ص:0.6 ث:1" },
    { in: "f", out: "ف" },
    { in: "q", out: "ق غ:0.3" },
    { in: "k", out: "ک" },
    { in: "c", out: "ک:0.3 س:0.8" },
    { in: "g", out: "گ" },
    { in: "l", out: "ل" },
    { in: "m", out: "م" },
    { in: "n", out: "ن" },
    { in: "v", out: "و" },
    { in: "w", out: "و" },
    { in: "y", out: "ی" },
    { in: "h", out: "ه ح:0.6" },
    { in: "x", out: "خ:0.4 کس:0.6" },
    { in: "'", out: "ع:0.3 ء:0.6 -:0.6" },

    // ----- vowels at the start: alef (or ain) -----
    { in: "aa", at: "start", out: "آ عا:1" },
    { in: "a", at: "start", out: "ا آ:0.4 ع:0.8" },
    { in: "e", at: "start", out: "ا ع:0.8" },
    { in: "i", at: "start", out: "ای ا:0.6 ع:1" },
    { in: "ee", at: "start", out: "ای" },
    { in: "o", at: "start", out: "ا او:0.4 ع:0.8" },
    { in: "u", at: "start", out: "او ا:0.6" },
    { in: "oo", at: "start", out: "او" },
    { in: "ey", at: "start", out: "ای" },

    // ----- long vowels and diphthongs -----
    { in: "aa", at: "notStart", out: "ا آ:1.2" },
    { in: "ee", at: "notStart", out: "ی" },
    { in: "oo", at: "notStart", out: "و" },
    { in: "ou", at: "notStart", out: "و" },
    { in: "ow", at: "notStart", out: "و:0.2 او:0.5" },
    { in: "ey", at: "notStart", out: "ی:0.2 ای:0.5" },
    { in: "ei", at: "notStart", out: "ی:0.2" },
    { in: "ai", at: "notStart", out: "ای:0.3 ی:0.4" },

    // ----- endings -----
    { in: "e", at: "end", out: "ه ی:0.8 -:1.5" },
    { in: "eh", at: "end", out: "ه" },
    // Arabic loans keep a final ی (hatta حتی) or tanween ا (maamoolan معمولا).
    { in: "a", at: "end", prev: "C", out: "ا:0.2 ه:0.3 ی:0.9 -:2" },
    { in: "an", at: "end", prev: "C", out: "ان ا:0.8 ن:0.6" },
    { in: "a", at: "end", prev: "V", out: "ا" },
    { in: "i", at: "end", out: "ی" },
    { in: "o", at: "end", out: "و ه:1" },
    { in: "u", at: "end", out: "و" },

    // ----- short vowels inside a word: not written -----
    { in: "a", at: "inner", next: "C", out: "- ا:0.5 ع:1.5" },
    { in: "a", at: "inner", next: "V", out: "ا:0.3 -:1 ع:1" },
    { in: "e", at: "inner", out: "- ی:1 ع:1.5" },
    { in: "i", at: "inner", out: "ی -:0.6" },
    { in: "o", at: "inner", out: "- و:0.4 ع:1.5" },
    { in: "u", at: "inner", out: "و -:0.6" },
  ],
  omitted: "ا:2 ی:2 و:2.2 ه:2.2",
  capitals: { S: "ص", Z: "ظ", T: "ط", H: "ح" },
  words: [
    ["salam", "سلام"],
    ["merci mersi", "مرسی"],
    ["mamnoon mamnun", "ممنون"],
    ["khoobi khubi", "خوبی"],
    ["chetori", "چطوری"],
    ["man", "من"],
    ["to", "تو"],
    ["ma", "ما"],
    ["shoma", "شما"],
    ["oo u", "او"],
    ["ye", "یه یک"],
    ["yek", "یک"],
    ["ke", "که"],
    ["ba", "با"],
    ["az", "از"],
    ["be", "به"],
    ["dar", "در"],
    ["ham", "هم"],
    ["na", "نه"],
    ["are areh", "آره"],
    ["bale baleh", "بله"],
    ["chi", "چی"],
    ["chera", "چرا"],
    ["koja", "کجا"],
    ["khoda", "خدا"],
    ["dige", "دیگه"],
    ["mikham", `می${Z}خوام`],
    ["nemidoonam nemidunam", `نمی${Z}دونم`],
    ["ok okay", "اوکی"],
  ],
  punctuation: { ",": "،", "?": "؟", ";": "؛" },
};
