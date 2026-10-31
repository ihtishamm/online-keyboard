import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { UR_ROMAN } from "./ur-roman";

/**
 * Roman Punjabi → Shahmukhi, starting from Roman Urdu: the letters are Urdu's plus the
 * retroflex ݨ (paani پاݨی), and the everyday words are Punjabi. Written for this project.
 */
export const PNB_ROMAN: TranslitScheme = extendScheme(UR_ROMAN, {
  id: "pnb-roman",
  lang: "pa-Arab",
  rules: [
    { in: "nn", out: "ݨ:0.3 ن:0.3" },
    { in: "n", out: "ن ݨ:0.9", at: "notEnd" },
    { in: "n", out: "ں ن:0.3 ݨ:0.9", at: "end", prev: "V" },
  ],
  capitals: { N: "ݨ" },
  punctuation: { ".": "۔", ",": "،", "?": "؟" },
  words: [
    ["main mein me", "میں"],
    ["tusi tussi tusin", "تسی"],
    ["assi asi", "اسی"],
    ["tu toon", "توں"],
    ["ae ay", "اے"],
    ["eh ih", "ایہہ"],
    ["oh uh", "اوہ"],
    ["hai hay", "ہے"],
    ["han hain", "ہن"],
    ["si", "سی"],
    ["nahi nahin nai", "نہیں"],
    ["haan han", "ہاں"],
    ["ki kee", "کی"],
    ["da", "دا"],
    ["di", "دی"],
    ["de", "دے"],
    ["nu noo", "نوں"],
    ["vich wich", "وچ"],
    ["te", "تے"],
    ["ne", "نے"],
    ["kiwen kiven", "کیویں"],
    ["kithe", "کتھے"],
    ["kithon", "کتھوں"],
    ["changa", "چنگا"],
    ["punjabi", "پنجابی"],
    ["allah", "اللہ"],
    ["ok okay", "اوکے"],
  ],
});
