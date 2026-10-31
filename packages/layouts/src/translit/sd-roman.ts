import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { UR_ROMAN } from "./ur-roman";

/**
 * Roman Sindhi → Sindhi, starting from Roman Urdu. Sindhi writes the Arabic ي and ه, ڪ for
 * k, single letters for most aspirates (ڀ ٿ ٺ ڦ ڇ ڌ ڍ, and ک for kh) and has four implosives,
 * typed doubled as in common usage (bb ٻ, jj ڄ, dd ڏ, gg ڳ). Written for this project.
 */
export const SD_ROMAN: TranslitScheme = extendScheme(UR_ROMAN, {
  id: "sd-roman",
  lang: "sd",
  letters: { ک: "ڪ", ی: "ي", ہ: "ه", ے: "ي", ٹ: "ٽ", ڈ: "ڊ", ڑ: "ڙ", ں: "ن" },
  rules: [
    // Sindhi writes long a more often than the Urdu rules assume (salam سلام, not سلم).
    { in: "a", at: "inner", next: "C", out: "- ا:0.45 ع:1.8 ه:2.2" },
    // Aspirates are letters of their own.
    { in: "bh", out: "ڀ ٻ:0.8 ٻه:1.5" },
    { in: "th", out: "ٿ ٺ:0.5 ث:1.5" },
    { in: "ph", out: "ڦ ف:0.6" },
    { in: "chh", out: "ڇ" },
    { in: "ch", out: "چ ڇ:0.6" },
    { in: "dh", out: "ڌ ڍ:0.5 ذ:1.5" },
    { in: "kh", out: "ک خ:0.3 ڪه:1.5" },
    { in: "gh", out: "گه غ:0.4 گھ:0.6" },
    { in: "jh", out: "جه جھ:0.4" },
    { in: "ng", out: "ڱ:0.4 نگ:0.2" },
    { in: "ny", out: "ڃ:0.4 ني:0.4" },
    // Implosives, and their plain letters.
    { in: "bb", out: "ٻ:0.2 ب:0.4" },
    { in: "jj", out: "ڄ:0.2 ج:0.4" },
    { in: "dd", out: "ڏ:0.3 ڊ:0.4 د:0.4" },
    { in: "gg", out: "ڳ:0.2 گ:0.4" },
    { in: "b", out: "ب ٻ:0.8" },
    { in: "j", out: "ج ڄ:0.8" },
    { in: "g", out: "گ ڳ:0.8 غ:2" },
    { in: "d", out: "د ڊ:0.6 ڏ:0.9 ض:2" },
    { in: "t", out: "ت ٽ:0.6 ط:1.2" },
    { in: "k", out: "ڪ ق:1 ک:1.2" },
    { in: "q", out: "ق ڪ:1.5" },
    { in: "n", out: "ن ڻ:1", at: "notEnd" },
    { in: "n", out: "ن ڻ:0.8", at: "end", prev: "V" },
    { in: "h", out: "ه ھ:0.4 ح:1" },
    // A final glottal stop after a vowel is common in Sindhi spelling (ڪندينء).
    { in: "a", at: "end", out: "ا:0.2 ي:0.6 ه:0.5 ع:2 -:2.5" },
  ],
  capitals: { T: "ٽ", D: "ڊ", R: "ڙ", N: "ڻ", S: "ص", Z: "ض", H: "ح", G: "غ" },
  words: [
    ["aahe ahe aahy", "آهي"],
    ["aahiyan ahiyan", "آهيان"],
    ["aahin ahin", "آهن"],
    ["ain aen", "۽"],
    ["mein main me", "۾"],
    ["ji", "جي"],
    ["jo", "جو"],
    ["ja", "جا"],
    ["je", "جي"],
    ["khe", "کي"],
    ["khan", "کان"],
    ["na", "نه"],
    ["haa haan", "ها"],
    ["sindhi", "سنڌي"],
    ["sindh", "سنڌ"],
    ["tawhan tawhaan", "توهان"],
    ["moon mun", "مون"],
    ["allah", "الله"],
    ["ok okay", "اوڪي"],
  ],
});
