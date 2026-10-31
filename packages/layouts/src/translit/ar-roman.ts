import type { TranslitScheme } from "@okb/engine";

/**
 * English letters and the Arabic chat alphabet → Arabic. Covers plain spellings ("marhaba")
 * and Arabizi digits: 2 ء, 3 ع, 5 خ, 6 ط, 7 ح, with an apostrophe for the dotted letter
 * (3' غ, 6' ظ, 7' خ). 8 and 9 differ by region (ق, غ, ص), so both readings are offered.
 * Short vowels are not written; the word list decides. Written for this project.
 */
export const AR_ROMAN: TranslitScheme = {
  id: "ar-roman",
  lang: "ar",
  vowels: "aeiou",
  letters: "2356789",
  rules: [
    // ----- chat digits -----
    // Egyptian and Levantine chat write the glottal-stop ق as 2 too (2alb قلب).
    { in: "2", at: "start", out: "أ إ:0.5 ق:0.8 ء:1" },
    { in: "2", at: "notStart", out: "ء:0.3 أ:0.2 ئ:0.5 ؤ:0.6 ق:1.2" },
    { in: "3'", out: "غ" },
    { in: "3", out: "ع" },
    { in: "5", out: "خ" },
    { in: "6'", out: "ظ" },
    { in: "6", out: "ط" },
    { in: "7'", out: "خ" },
    { in: "7", out: "ح" },
    { in: "8", out: "ق:0.3 غ:0.6" },
    { in: "9", out: "ق:0.5 ص:0.5" },

    // ----- the article, with sun letters doubled: assalam -> السلام -----
    { in: "al", at: "start", next: "C", out: "ال" },
    // Before a vowel the article carries a hamza seat: alard الأرض, alislam الإسلام.
    { in: "al", at: "start", next: "V", out: "الأ:0.4 الإ:0.5 الا:0.5 ال:0.8" },
    { in: "el", at: "start", next: "V", out: "الأ:0.6 الإ:0.7 الا:0.7" },
    { in: "el", at: "start", next: "C", out: "ال:0.2" },
    { in: "il", at: "start", next: "C", out: "ال:0.4" },
    { in: "ul", at: "start", next: "C", out: "ال:0.6" },
    { in: "ash", at: "start", out: "الش:0.3 اش:0.5" },
    { in: "ass", at: "start", out: "الس:0.2 اس:0.6" },
    { in: "att", at: "start", out: "الت:0.2 ات:0.6" },
    { in: "add", at: "start", out: "الد:0.3 اد:0.6" },
    { in: "arr", at: "start", out: "الر:0.2 ار:0.6" },
    { in: "ann", at: "start", out: "الن:0.2 ان:0.6" },
    { in: "azz", at: "start", out: "الز:0.3 از:0.6" },

    // ----- consonant pairs -----
    { in: "th", out: "ث ذ:0.8 ت:1" },
    { in: "dh", out: "ذ ض:0.6 ظ:1 د:1" },
    { in: "kh", out: "خ" },
    { in: "gh", out: "غ" },
    { in: "sh", out: "ش" },
    { in: "ch", out: "ش:0.3 تش:1" },

    // ----- single consonants -----
    { in: "b", out: "ب" },
    { in: "p", out: "ب:0.3" },
    { in: "t", out: "ت ط:0.8" },
    { in: "j", out: "ج" },
    { in: "g", out: "ج:0.3 غ:1 ق:1" },
    { in: "h", out: "ه ح:0.6" },
    { in: "d", out: "د ض:0.8 ذ:1.2" },
    { in: "r", out: "ر" },
    { in: "z", out: "ز ظ:1 ذ:1.2" },
    { in: "s", out: "س ص:0.6 ث:1.4" },
    { in: "f", out: "ف" },
    { in: "v", out: "ف:0.3" },
    { in: "q", out: "ق" },
    { in: "k", out: "ك ق:0.8" },
    { in: "c", out: "ك:0.3 س:0.8" },
    { in: "l", out: "ل" },
    { in: "m", out: "م" },
    { in: "n", out: "ن" },
    { in: "w", out: "و" },
    { in: "y", out: "ي" },
    { in: "x", out: "كس:0.5" },
    { in: "'", out: "ء:0.5 ع:0.5 -:0.5" },

    // ----- vowels at the start: carried by alef (or ain) -----
    { in: "aa", at: "start", out: "آ ا:0.3 عا:1" },
    { in: "a", at: "start", out: "ا أ:0.2 ع:0.8 إ:1" },
    { in: "e", at: "start", out: "إ ا:0.2 أ:0.5 ع:1" },
    { in: "i", at: "start", out: "إ ا:0.2 ي:1 ع:1" },
    { in: "o", at: "start", out: "أ ا:0.2 ع:0.8 و:1" },
    { in: "u", at: "start", out: "أ ا:0.2 ع:0.8 و:1" },
    { in: "ee", at: "start", out: "إي:0.3 اي" },

    // ----- long vowels and diphthongs -----
    { in: "aa", at: "notStart", out: "ا آ:1.2 ى:1" },
    { in: "ee", at: "notStart", out: "ي" },
    { in: "ii", at: "notStart", out: "ي" },
    { in: "oo", at: "notStart", out: "و" },
    { in: "ou", at: "notStart", out: "و" },
    { in: "uu", at: "notStart", out: "و" },
    { in: "ai", at: "notStart", out: "ي:0.2 اي:0.6 ئي:0.6" },
    { in: "ay", at: "notStart", out: "ي:0.2 اي:0.4" },
    { in: "ei", at: "notStart", out: "ي:0.2" },
    { in: "aw", at: "notStart", out: "و:0.2 او:0.4" },
    { in: "au", at: "notStart", out: "و:0.2 او:0.5" },

    // ----- endings -----
    // Tanween: shukran شكرا, jiddan جدا; plain -an stays possible (lubnan لبنان).
    { in: "an", at: "end", prev: "C", out: "ا:0.3 ان:0.3 ن:0.6" },
    { in: "at", at: "end", prev: "V", out: "ة:0.5 ات:0.3 ت:0.5" },
    { in: "ah", at: "end", out: "ة:0.2 اه:0.8 ه:0.5" },
    { in: "eh", at: "end", out: "ة:0.3 ه:0.5" },
    { in: "a", at: "end", prev: "C", out: "ة:0.2 ا:0.2 ى:0.8 ه:1.2 -:2" },
    { in: "a", at: "end", prev: "V", out: "ا ء:1" },
    { in: "e", at: "end", out: "ة:0.4 ي:0.5 ه:0.8 -:1.5" },
    { in: "i", at: "end", out: "ي -:2" },
    { in: "o", at: "end", out: "و ه:1.2" },
    { in: "u", at: "end", out: "و -:2" },

    // ----- short vowels inside a word: usually not written -----
    { in: "a", at: "inner", next: "C", out: "- ا:0.4 ع:1.5" },
    { in: "a", at: "inner", next: "V", out: "ا:0.4 -:1 ع:1" },
    { in: "e", at: "inner", out: "- ي:0.6 ع:1.5" },
    { in: "i", at: "inner", out: "- ي:0.3 ع:1.5" },
    { in: "o", at: "inner", out: "- و:0.3 ع:1.5" },
    { in: "u", at: "inner", out: "- و:0.3 ع:1.5" },
  ],
  omitted: "ا:2 ي:2 و:2.2 ع:2 ء:2",
  capitals: { S: "ص", D: "ض", T: "ط", Z: "ظ", H: "ح", G: "غ" },
  words: [
    ["allah", "الله"],
    ["inshallah inshalla insha'allah inshaallah", "إن شاء الله"],
    ["mashallah masha'allah mashaallah", "ما شاء الله"],
    ["alhamdulillah alhamdolillah al7amdulillah", "الحمد لله"],
    ["wallah wallahi", "والله"],
    ["salam", "سلام"],
    ["assalamualaikum", "السلام عليكم"],
    ["marhaba mar7aba", "مرحبا"],
    ["ahlan", "أهلا"],
    ["shukran", "شكرا"],
    ["afwan 3afwan", "عفوا"],
    ["habibi 7abibi", "حبيبي"],
    ["yalla yallah", "يلا"],
    ["la", "لا"],
    ["na3am naam", "نعم"],
    ["ana", "أنا"],
    ["enta inta anta", "أنت"],
    ["enti inti", "أنت"],
    ["howa huwa", "هو"],
    ["hiya heya", "هي"],
    ["fi fee", "في"],
    ["min men", "من"],
    ["ma", "ما"],
    ["wa", "و"],
    ["ok okay", "أوكي"],
  ],
  punctuation: { ",": "،", "?": "؟", ";": "؛" },
};
