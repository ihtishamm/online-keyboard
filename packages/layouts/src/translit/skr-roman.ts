import type { TranslitScheme } from "@okb/engine";
import { extendScheme } from "./extend";
import { PNB_ROMAN } from "./pnb-roman";

/**
 * Roman Saraiki → Saraiki, starting from Roman Punjabi: adds the four implosives, typed
 * doubled as in common usage (bb ٻ, jj ڄ, dd ݙ, gg ڳ), and Saraiki words. Beta: there is
 * little written Saraiki to learn from. Written for this project.
 */
export const SKR_ROMAN: TranslitScheme = extendScheme(PNB_ROMAN, {
  id: "skr-roman",
  lang: "skr",
  rules: [
    { in: "bb", out: "ٻ:0.2 ب:0.4" },
    { in: "jj", out: "ڄ:0.2 ج:0.4" },
    { in: "dd", out: "ݙ:0.2 ڈ:0.3 د:0.4" },
    { in: "gg", out: "ڳ:0.2 گ:0.4" },
    { in: "b", out: "ب ٻ:0.8" },
    { in: "j", out: "ج ڄ:0.8" },
    { in: "g", out: "گ ڳ:0.8 غ:2" },
  ],
  words: [
    ["main mein", "میں"],
    ["tusaan tusan", "تساں"],
    ["assaan asan", "اساں"],
    ["tu", "توں"],
    ["ai ae", "اے"],
    ["hai", "ہے"],
    ["hin", "ہن"],
    ["haa", "ہا"],
    ["nahi nai", "نہیں"],
    ["haan", "ہاں"],
    ["da", "دا"],
    ["di", "دی"],
    ["de", "دے"],
    ["kun", "کوں"],
    ["vich wich", "وچ"],
    ["te", "تے"],
    ["saraiki seraiki", "سرائیکی"],
    ["allah", "اللہ"],
  ],
});
