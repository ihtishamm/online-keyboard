import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { UR_ROMAN } from "./ur-roman";

/**
 * Roman Pashto → Pashto, starting from Roman Urdu with Pashto letter forms (ګ, ې, ټ ډ ړ ڼ)
 * and Pashto's own letters in their common Roman spellings: ts څ, dz ځ, x or sh ښ, zh ږ.
 * Endings tell ی ي ې ۍ apart only roughly; the word list decides. Written for this project.
 */
export const PS_ROMAN: TranslitScheme = extendScheme(UR_ROMAN, {
  id: "ps-roman",
  lang: "ps",
  letters: { ہ: "ه", گ: "ګ", ے: "ې", ٹ: "ټ", ڈ: "ډ", ڑ: "ړ", ں: "ن", ھ: "ه" },
  rules: [
    { in: "ts", out: "څ:0.1 تس:0.6" },
    { in: "dz", out: "ځ:0.1 دز:0.8" },
    { in: "x", out: "ښ:0.2 خ:0.8" },
    { in: "sh", out: "ش ښ:0.4" },
    { in: "zh", out: "ژ ږ:0.4" },
    { in: "kh", out: "خ" },
    { in: "gh", out: "غ" },
    { in: "t", out: "ت ټ:0.6 ط:1.2" },
    { in: "d", out: "د ډ:0.6 ض:2" },
    { in: "r", out: "ر ړ:0.6" },
    { in: "n", out: "ن ڼ:0.8", at: "notEnd" },
    { in: "n", out: "ن ڼ:0.8", at: "end", prev: "V" },
    { in: "g", out: "ګ غ:2" },
    // Endings: ی (masculine), ي (feminine, -ee), ې, ۍ.
    { in: "ay", at: "end", out: "ی:0.2 ې:0.3 ۍ:0.5 ي:0.6" },
    { in: "ai", at: "end", out: "ۍ:0.3 ی:0.4 ي:0.5" },
    { in: "e", at: "end", out: "ې:0.1 ه:0.6 ي:0.8" },
    { in: "i", at: "end", out: "ي:0.1 ی:0.4" },
    { in: "a", at: "end", out: "ه:0.1 ا:0.3 -:2" },
  ],
  capitals: { T: "ټ", D: "ډ", R: "ړ", N: "ڼ", X: "ښ" },
  // Pashto ends sentences with a full stop, not the Urdu ۔.
  punctuation: { ",": "،", "?": "؟", ";": "؛" },
  words: [
    ["za", "زه"],
    ["ta", "ته"],
    ["mung moong", "موږ"],
    ["taso tasu", "تاسو"],
    ["sta", "ستا"],
    ["zma", "زما"],
    ["de da", "د"],
    ["dey", "دی"],
    ["daa", "دا"],
    ["yam", "یم"],
    ["ye yay", "یې"],
    ["aw ao", "او"],
    ["ho", "هو"],
    ["na", "نه"],
    ["manana mana", "مننه"],
    ["pukhto pashto pakhto pukhtu", "پښتو"],
    ["tsanga sanga", "څنګه"],
    ["khushala", "خوشاله"],
    ["allah", "الله"],
    ["ok okay", "اوکې"],
  ],
});
