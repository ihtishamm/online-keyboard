import type { TranslitScheme } from "@okb/engine";

/**
 * Rumi (Malay in English letters) → Jawi. Jawi spelling is not phonetic: final and open-syllable
 * vowels are often left out (saya ساي, kata کات, bahasa بهاس), so each vowel offers both forms and
 * the word list, of spellings attested in Wiktionary, chooses. The rules follow the letters of
 * Malay Jawi: ng ڠ, ny ڽ, sy ش, kh خ, gh غ, p ڤ, g ݢ, c چ, v ۏ, and a final k as ق (tidak تيدق).
 * Written for this project.
 */
export const ZLM_ROMAN: TranslitScheme = {
  id: "zlm-roman",
  lang: "ms-Arab",
  vowels: "aeiou",
  rules: [
    // ----- consonant pairs -----
    { in: "ng", out: "ڠ نݢ:0.8" },
    { in: "ny", out: "ڽ ني:0.8" },
    { in: "sy", out: "ش" },
    { in: "sh", out: "ش" },
    { in: "kh", out: "خ" },
    { in: "gh", out: "غ" },
    { in: "dz", out: "ذ" },
    { in: "th", out: "ث ت:0.8" },

    // ----- single consonants -----
    { in: "b", out: "ب" },
    { in: "c", out: "چ" },
    { in: "d", out: "د ض:1" },
    { in: "f", out: "ف" },
    { in: "g", out: "ݢ" },
    { in: "h", out: "ه ح:0.6" },
    { in: "j", out: "ج" },
    { in: "k", at: "end", out: "ق ک:0.4" },
    { in: "k", at: "notEnd", out: "ک ق:0.6" },
    { in: "l", out: "ل" },
    { in: "m", out: "م" },
    { in: "n", out: "ن" },
    { in: "p", out: "ڤ" },
    { in: "q", out: "ق" },
    { in: "r", out: "ر" },
    { in: "s", out: "س ص:0.8 ث:1" },
    { in: "t", out: "ت ط:0.8" },
    { in: "v", out: "ۏ" },
    { in: "w", out: "و" },
    { in: "x", out: "کس" },
    { in: "y", out: "ي" },
    { in: "z", out: "ز ظ:1 ذ:1" },
    { in: "'", out: "ء ع:0.3 -:0.5" },

    // ----- vowels at the start -----
    { in: "a", at: "start", out: "ا ع:1" },
    { in: "e", at: "start", out: "ا اي:0.3" },
    { in: "i", at: "start", out: "اي ا:0.5" },
    { in: "o", at: "start", out: "او" },
    { in: "u", at: "start", out: "او" },
    { in: "ai", at: "start", out: "اي" },
    { in: "au", at: "start", out: "او" },

    // ----- vowels inside a word: written or left out -----
    { in: "a", at: "inner", out: "ا:0.2 -:0.2" },
    { in: "e", at: "inner", out: "-:0.1 ي:0.5" },
    { in: "i", at: "inner", out: "ي -:0.8" },
    { in: "o", at: "inner", out: "و -:1.2" },
    { in: "u", at: "inner", out: "و -:1.2" },
    // Two vowels in a row are kept apart by hamza: kerajaan کراجاءن, kaunter کاءونتر, poin ڤوءين.
    { in: "aa", at: "inner", out: "اء" },
    { in: "ai", at: "inner", out: "اي ي:0.2 اءي:0.3" },
    { in: "au", at: "inner", out: "او و:0.2 اءو:0.3" },
    { in: "oi", at: "inner", out: "وءي" },
    { in: "ua", at: "inner", out: "وا" },
    { in: "ia", at: "inner", out: "يا" },

    // ----- vowels at the end -----
    { in: "a", at: "end", out: "- ا:0.4" },
    { in: "e", at: "end", out: "ي -:0.4" },
    { in: "i", at: "end", out: "ي" },
    { in: "o", at: "end", out: "و" },
    { in: "u", at: "end", out: "و" },
    { in: "ai", at: "end", out: "اي ي:0.2" },
    { in: "au", at: "end", out: "او و:0.2" },
  ],
  omitted: "",
  capitals: {},
  words: [
    ["di", "د"],
    ["ke", "ک"],
    ["dan", "دان"],
    ["yang", "يڠ"],
    ["saya", "ساي"],
    ["ini", "اين"],
    ["itu", "ايت"],
    ["kita", "کيت"],
    ["ada", "اد"],
    ["apa", "اڤ"],
    ["tidak", "تيدق"],
    ["dengan", "دڠن"],
    ["untuk", "اونتوق"],
    ["bahasa", "بهاس"],
    ["melayu", "ملايو"],
    ["jawi", "جاوي"],
    ["dari", "دري"],
    ["pada", "ڤد"],
    ["oleh", "اوليه"],
    ["terima", "تريما"],
    ["kasih", "کاسيه"],
    ["selamat", "سلامت"],
  ],
  punctuation: { ",": "،", "?": "؟" },
};
