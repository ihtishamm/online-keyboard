import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { UR_ROMAN } from "./ur-roman";

/**
 * Roman Balochi → Balochi (Arabic script as written in Pakistan), starting from Roman Urdu.
 * Beta: Balochi has no Wikipedia and no open word list yet, so conversions rest on the rules
 * and a few common words. Written for this project.
 */
export const BAL_ROMAN: TranslitScheme = extendScheme(UR_ROMAN, {
  id: "bal-roman",
  lang: "bal",
  // The Balochi layout types the Arabic ه, and has no do-chashmi ھ.
  letters: { ہ: "ه", ھ: "ه", ۂ: "ۀ" },
  rules: [],
  words: [
    ["man", "من"],
    ["tao tau", "تئو"],
    ["ma", "ما"],
    ["shuma", "شما"],
    ["ent int", "انت"],
    ["na nah", "نه"],
    ["haw", "هو"],
    ["balochi", "بلوچی"],
    ["baloch", "بلوچ"],
    ["allah", "الله"],
  ],
});
