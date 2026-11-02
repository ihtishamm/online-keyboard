import type { TranslitScheme } from "@okb/engine";
import { abugidaRules } from "./indic";

/**
 * English letters → Sinhala, as Sinhala is typed in chats ("kohomada", "mama hondin"). A final
 * consonant takes the al-lakuna (පාන්); r and y after a consonant join it as rakaransaya and
 * yansaya, written with ZWJ (ප්\u200Dර, \u0DCA\u200Dය) as the word lists store them. "nd", "ng" and "mb" may be
 * the half-nasal letters (ඳ, ඟ, ඹ), and "ae" is ඇ/ැ. Written for this project from common
 * usage.
 */
const ZWJ = "\u200D";

export const SI_ROMAN: TranslitScheme = {
  id: "si-roman",
  lang: "si",
  vowels: "aeiou",
  doubledCost: 0,
  splitCost: 1,
  rules: [
    // i then a is written i + ya ("asia").
    { in: "ia", prev: "C", out: "\u0DD2යා:0.2 \u0DD2ය:0.2" },
    { in: "ksh", out: "ක්ෂ" },
    { in: "gn", out: "ඥ:0.3" },
    // Rakaransaya and yansaya: the consonant before has already taken its al-lakuna.
    { in: "r", prev: "C", next: "V", out: `${ZWJ}ර` },
    { in: "y", prev: "C", next: "V", out: `${ZWJ}ය` },
    // Half-nasal letters and the anusvara.
    { in: "ng", next: "V", out: "ංග ඟ:0.2 න්ග:0.6" },
    { in: "ng", at: "end", out: "ං" },
    { in: "nd", next: "V", out: "න්ද:0.2 ඳ:0.3 ණ්ඩ:0.5 ඬ:0.5" },
    { in: "mb", next: "V", out: "ම්බ ඹ:0.3" },
    { in: "n", next: "C", out: "ං:0.3" },
    { in: "m", next: "C", out: "ං:0.5" },
    // "aarakshawai" ආරක්ෂාවයි: i after a vowel is often යි.
    { in: "i", prev: "V", out: "යි:0.3" },
    { in: "ri", prev: "C", out: "ෘ:0.6" },

    ...abugidaRules({
      virama: "\u0DCA",
      inherentCost: 0.6,
      finalVirama: 0.6,
      consonants: [
        ["k", "ක"],
        ["kh", "ඛ ක:0.3"],
        ["g", "ග"],
        ["gh", "ඝ ග:0.3"],
        ["ch", "ච ඡ:0.5"],
        ["c", "ක:0.2 ච:0.3 ස:0.6"],
        ["j", "ජ"],
        ["jh", "ඣ ජ:0.3"],
        ["t", "ට ත:0.3"],
        ["th", "ත ථ:0.4"],
        ["d", "ද ඩ:0.3"],
        ["dh", "ධ ද:0.3"],
        ["n", "න ණ:0.4"],
        ["p", "ප"],
        ["ph", "ඵ ෆ:0.3"],
        ["f", "ෆ ප:0.6"],
        ["b", "බ"],
        ["bh", "භ බ:0.3"],
        ["m", "ම"],
        ["y", "ය"],
        ["r", "ර"],
        ["l", "ල ළ:0.4"],
        ["v", "ව"],
        ["w", "ව"],
        ["s", "ස ශ:0.3 ෂ:0.4"],
        ["sh", "ශ ෂ:0.3"],
        ["h", "හ"],
        ["q", "ක"],
        ["z", "ස"],
        ["x", "ක්ස"],
      ],
      vowels: [
        { in: "a", independent: "අ ආ:0.5", sign: "- ා:0.4", finalSign: "- ා:0.3" },
        { in: "aa", independent: "ආ", sign: "ා" },
        { in: "ae", independent: "ඇ ඈ:0.4", sign: "ැ ෑ:0.4" },
        { in: "aae", independent: "ඈ", sign: "ෑ" },
        { in: "i", independent: "ඉ ඊ:0.5", sign: "\u0DD2 \u0DD3:0.5" },
        { in: "ee", independent: "ඊ ඒ:0.3", sign: "\u0DD3 ේ:0.3" },
        { in: "ii", independent: "ඊ", sign: "\u0DD3" },
        { in: "u", independent: "උ ඌ:0.5", sign: "\u0DD4 \u0DD6:0.5" },
        { in: "oo", independent: "ඌ ඕ:0.3", sign: "\u0DD6 ෝ:0.3" },
        { in: "uu", independent: "ඌ", sign: "\u0DD6" },
        { in: "e", independent: "එ ඒ:0.4 ඇ:0.6", sign: "ෙ ේ:0.4 ැ:0.6" },
        { in: "ai", independent: "ඓ:0.6", sign: "ෛ:0.6" },
        { in: "o", independent: "ඔ ඕ:0.4", sign: "ො ෝ:0.4" },
        { in: "au", independent: "ඖ", sign: "ෞ" },
      ],
    }),
  ],
  omitted: "\u0DCA:1.6 \u0DD4:1.8 ා:2 \u0DD2:2",
  capitals: { T: "ට", D: "ඩ", N: "ණ", L: "ළ" },
  words: [
    ["ayubowan aayubowan", "ආයුබෝවන්"],
    ["sthuthi stuti isthuthi", "ස්තුති"],
    ["mama", "මම"],
    ["oya", "ඔයා"],
    ["eya", "එයා"],
    ["ow ou", "ඔව්"],
    ["naha nehe", "නැහැ"],
    ["mokakda", "මොකක්ද"],
    ["kohomada", "කොහොමද"],
    ["hari", "හරි"],
    ["sinhala", "සිංහල"],
  ],
  punctuation: {},
};
