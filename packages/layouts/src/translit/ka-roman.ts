import type { TranslitScheme } from "@okb/engine";

/**
 * English letters → Georgian: gamarjoba, madloba. Capitals ask for the letter the Georgian QWERTY
 * layout has on Shift (T თ, W ჭ, R ღ); without them the word list tells the letters apart.
 * Written for this project.
 */
export const KA_ROMAN: TranslitScheme = {
  id: "ka-roman",
  lang: "ka",
  vowels: "aeiou",
  doubledCost: 0,
  rules: [
    { in: "sh", out: "შ" },
    { in: "ch", out: "ჩ ჭ:0.2" },
    { in: "zh", out: "ჟ" },
    { in: "kh", out: "ხ" },
    { in: "gh", out: "ღ" },
    { in: "dz", out: "ძ" },
    { in: "ts", out: "ც წ:0.2" },
    { in: "tch", out: "ჭ:0.1" },
    { in: "a", out: "ა" },
    { in: "b", out: "ბ" },
    { in: "c", out: "ც ჩ:0.3 წ:0.5" },
    { in: "d", out: "დ" },
    { in: "e", out: "ე" },
    { in: "f", out: "ფ" },
    { in: "g", out: "გ" },
    { in: "h", out: "ჰ" },
    { in: "i", out: "ი" },
    { in: "j", out: "ჯ" },
    { in: "k", out: "კ ქ:0.2" },
    { in: "l", out: "ლ" },
    { in: "m", out: "მ" },
    { in: "n", out: "ნ" },
    { in: "o", out: "ო" },
    { in: "p", out: "პ ფ:0.2" },
    { in: "q", out: "ქ ყ:0.2" },
    { in: "r", out: "რ" },
    { in: "s", out: "ს" },
    { in: "t", out: "თ ტ:0.2" },
    { in: "u", out: "უ" },
    { in: "v", out: "ვ" },
    { in: "w", out: "წ ვ:0.3" },
    { in: "x", out: "ხ" },
    { in: "y", out: "ყ" },
    { in: "z", out: "ზ" },
  ],
  omitted: "",
  capitals: { T: "თ", W: "ჭ", R: "ღ", S: "შ", J: "ჟ", Z: "ძ", C: "ჩ" },
  words: [],
  punctuation: {},
};
