import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { FA_ROMAN } from "./fa-roman";

const Z = "\u200C";

/**
 * English letters → Dari, starting from Finglish: the two write the same letters and share a
 * word list. Dari chat keeps the long o and e of Afghan speech ("khob", "sher"), and spells
 * its own everyday words differently. Written for this project.
 */
export const PRS_ROMAN: TranslitScheme = extendScheme(FA_ROMAN, {
  id: "prs-roman",
  lang: "prs",
  rules: [
    { in: "o", at: "inner", out: "- و:0.2 ع:1.5" },
    { in: "e", at: "inner", out: "- ی:0.6 ع:1.5" },
  ],
  words: [
    ["salam salaam", "سلام"],
    ["tashakor tashakur", "تشکر"],
    ["dari", "دری"],
    ["afghanistan", "افغانستان"],
    ["kabul kabol", "کابل"],
    ["man", "من"],
    ["to", "تو"],
    ["ma", "ما"],
    ["shoma", "شما"],
    ["oo u", "او"],
    ["ke", "که"],
    ["ba", "با"],
    ["az", "از"],
    ["be", "به"],
    ["dar", "در"],
    ["ham", "هم"],
    ["na", "نه"],
    ["bale", "بله"],
    ["ast", "است"],
    ["hast", "هست"],
    ["chi", "چی"],
    ["chera", "چرا"],
    ["koja", "کجا"],
    ["khoda", "خدا"],
    ["khob khoob", "خوب"],
    ["mikonam", `می${Z}کنم`],
    ["mekonam", `می${Z}کنم`],
    ["mekhaham", `می${Z}خواهم`],
    ["mikhaham", `می${Z}خواهم`],
  ],
});
