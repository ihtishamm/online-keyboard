import type { TranslitRule } from "@okb/engine";

/**
 * Rules for Indic scripts (abugidas), generated from letter tables.
 *
 * - A consonant before another consonant takes a virama (क् + य = क्य), or keeps its inherent
 *   vowel (the dictionary decides: Hindi writes कमला, not कम्ला).
 * - A vowel after a consonant is written as its sign (matra): k + i = कि.
 * - A vowel at the start of a word, or after another vowel, is the independent letter: इ.
 */
export interface AbugidaSpec {
  virama: string;
  /** Extra cost of reading consonant + consonant with the inherent vowel instead of a virama. */
  inherentCost: number;
  /**
   * A consonant at the end of a word takes a virama, as in Tamil (வணக்கம்), Telugu, Kannada,
   * Malayalam and Sinhala; the inherent vowel stays possible at this extra cost. Without it,
   * a final consonant keeps its inherent vowel unwritten, as in Hindi (कमल).
   */
  finalVirama?: number;
  /**
   * [Latin, consonant alternatives] as in TranslitRule.out, without viramas, and optionally
   * the alternatives at the end of a word when they differ (a final n is mostly \u0902 in Hindi).
   */
  consonants: readonly (readonly [string, string, string?])[];
  vowels: readonly {
    in: string;
    /** At the start of a word or after a vowel. */
    independent: string;
    /** After a consonant; `-` for the inherent vowel. */
    sign: string;
    /** After a consonant at the end of the word, when different from `sign`. */
    finalSign?: string;
  }[];
}

/** Append `suffix` to each alternative of an output spec; `costDelta` raises each cost. */
function mapOutputs(spec: string, suffix: string, costDelta = 0): string {
  return spec
    .trim()
    .split(/\s+/)
    .map((part) => {
      const colon = part.lastIndexOf(":");
      const text = colon > 0 ? part.slice(0, colon) : part;
      const cost = (colon > 0 ? Number(part.slice(colon + 1)) : 0) + costDelta;
      return `${text}${suffix}${cost ? `:${Number(cost.toFixed(2))}` : ""}`;
    })
    .join(" ");
}

export function abugidaRules(spec: AbugidaSpec): TranslitRule[] {
  const rules: TranslitRule[] = [];
  const final = (out: string) =>
    spec.finalVirama === undefined
      ? out
      : `${mapOutputs(out, spec.virama)} ${mapOutputs(out, "", spec.finalVirama)}`;
  for (const [latin, out, endOut = final(out)] of spec.consonants) {
    rules.push({
      in: latin,
      next: "C",
      out: `${mapOutputs(out, spec.virama)} ${mapOutputs(out, "", spec.inherentCost)}`,
    });
    rules.push({ in: latin, next: "V", out });
    rules.push({ in: latin, at: "end", out: endOut });
  }
  for (const v of spec.vowels) {
    rules.push({ in: v.in, at: "start", out: v.independent });
    rules.push({ in: v.in, prev: "V", out: v.independent });
    if (v.finalSign) {
      rules.push({ in: v.in, prev: "C", at: "notEnd", out: v.sign });
      rules.push({ in: v.in, prev: "C", at: "end", out: v.finalSign });
    } else {
      rules.push({ in: v.in, prev: "C", out: v.sign });
    }
  }
  return rules;
}
