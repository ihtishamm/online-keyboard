import type { TranslitRule, TranslitScheme } from "@okb/engine";

/**
 * English letters → a Cyrillic alphabet. Each language lists how its letters are typed; the word
 * list settles what the Latin letters leave open (e for е or э, i for и or ы). Written for this
 * project.
 */
export interface CyrillicSpec {
  id: string;
  lang: string;
  /** Latin spelling → `text` or `text:cost` alternatives. */
  letters: Readonly<Record<string, string>>;
  /** Soft sign (ь), which chat spelling leaves out, inside a word and at its end. */
  soft?: string;
  /** Letters people drop when they type, in `text:cost` form, beyond the soft sign. */
  omitted?: string;
  /** Accented letters also accepted as they are (Serbian Gajica's č ć đ š ž). */
  extra?: string;
}

const VOWELS = "aeiouy";

export function cyrillicScheme(spec: CyrillicSpec): TranslitScheme {
  const rules: TranslitRule[] = [];
  for (const [latin, out] of Object.entries(spec.letters)) {
    // After a vowel, y is the consonant: geroy, герой; elsewhere it is the language's vowel.
    if (latin === "y" && out.includes("й")) {
      const others = out
        .split(" ")
        .filter((alt) => !alt.startsWith("й"))
        .map((alt) => `${alt.split(":")[0]}:${Number(alt.split(":")[1] ?? 0) + 1}`);
      rules.push({ in: latin, out: ["й", ...others].join(" "), prev: "V" });
      rules.push({ in: latin, out, prev: "C" }, { in: latin, out, at: "start" });
      continue;
    }
    rules.push({ in: latin, out });
    // A consonant at the end of a word may carry a soft sign nobody typed: uchitel, учитель.
    if (spec.soft && !VOWELS.includes(latin[0]!) && latin !== "'") {
      const soft = out
        .split(" ")
        .map((alt) => {
          const [text, cost = "0"] = alt.split(":");
          return `${text}${spec.soft}:${Number(cost) + 0.4}`;
        })
        .join(" ");
      rules.push({ in: latin, out: `${out} ${soft}`, at: "end" });
    }
  }
  return {
    id: spec.id,
    lang: spec.lang,
    vowels: VOWELS,
    doubledCost: 0,
    ...(spec.extra ? { letters: spec.extra } : {}),
    rules,
    omitted: [spec.soft ? `${spec.soft}:0.6` : "", spec.omitted ?? ""].join(" ").trim(),
    capitals: {},
    words: [],
    punctuation: {},
  };
}
