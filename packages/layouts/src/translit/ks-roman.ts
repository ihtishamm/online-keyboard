import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { UR_ROMAN } from "./ur-roman";

/**
 * Roman Kashmiri → Kashmiri (Perso-Arabic), starting from Roman Urdu. Kashmiri writes vowels
 * Urdu has no letters for: ٲ (the open a of kǝshur), ۄ (o), and the marks \u0655 and \u065A for the
 * central vowels, which Roman spellings show as "a", "e" or "u". Beta: rules only, tuned on
 * a small word list. Written for this project.
 */
export const KS_ROMAN: TranslitScheme = extendScheme(UR_ROMAN, {
  id: "ks-roman",
  lang: "ks",
  // The Kashmiri layout has no ئ: it is typed as ی and the hamza mark.
  letters: { ئ: "یٔ" },
  rules: [
    { in: "aa", at: "notStart", out: "ا ٲ:0.6 آ:1.2" },
    { in: "o", at: "inner", out: "و ۄ:0.5 -:1" },
    { in: "o", at: "end", out: "و ۄ:0.6" },
    // Central vowels: a mark on the consonant before (کٔر kar, تہٕ te).
    { in: "a", at: "inner", next: "C", out: "- \u0654:0.6 ا:0.8" },
    { in: "e", at: "end", out: "ہٕ:0.4 ے:0.5 ی:1" },
    { in: "u", at: "inner", next: "C", out: "- و:0.4 \u0655:1" },
  ],
  omitted: "ی:2 ا:2 و:2.2 ہ:2.2 \u0655:1.8 \u0654:1.8",
  words: [
    ["ba bi", "بہٕ"],
    ["tse tsi", "ژٕ"],
    ["su", "سہ"],
    ["chhu chu", "چھ"],
    ["chhe che", "چھےٚ"],
    ["chhi chi", "چھ"],
    ["te ti", "تہٕ"],
    ["kashur koshur", "کٲشر"],
    ["kashmir", "کشمیر"],
    ["allah", "اللہ"],
  ],
});
