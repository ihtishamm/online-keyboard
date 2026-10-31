/**
 * A transliteration scheme: how Latin (Roman) spellings map to a script.
 *
 * Roman spellings are ambiguous ("s" can be س, ص or ث), so each rule lists weighted
 * alternatives. The engine explores them and lets the dictionary decide which spellings are
 * real words. Costs are in "surprise" units: 0 is the expected reading, ~1 is plausible,
 * 2+ is unusual.
 */
export interface TranslitRule {
  /** Lowercase Latin letters matched, e.g. "kh". */
  in: string;
  /**
   * Alternatives separated by spaces, each `text` or `text:cost` (cost defaults to 0).
   * `-` stands for no output (e.g. a short vowel that Urdu does not write).
   */
  out: string;
  /** Where in the word the match may sit. */
  at?: "start" | "end" | "inner" | "notStart" | "notEnd";
  /** Class of the Latin letter before the match: V(owel) or C(onsonant). */
  prev?: "V" | "C";
  /** Class of the Latin letter after the match. */
  next?: "V" | "C";
}

export interface TranslitScheme {
  id: string;
  /** BCP 47 tag of the output. */
  lang: string;
  /** Latin letters treated as vowels by `prev`/`next`. */
  vowels: string;
  /**
   * Characters besides a–z and the apostrophe that belong to a Roman word, such as the
   * digits of the Arabic chat alphabet (`3` for ع, `7` for ح). A word still needs a letter.
   */
  letters?: string;
  /**
   * Extra cost of spelling a doubled Latin consonant ("pakka") as two letters. Default 0.5:
   * Urdu writes it once. Hindi and Bangla write both (with a virama), so they use 0.
   */
  doubledCost?: number;
  /**
   * Extra cost of reading a consonant on its own when it starts an h digraph the scheme has
   * ("khana" as k + h, کہنا, rather than kh, کھانا). Default 0.
   */
  splitCost?: number;
  rules: readonly TranslitRule[];
  /**
   * Letters a hurried spelling may leave out ("bht" for بہت, "mn" for میں), in the same
   * `text:cost` format. The engine may insert one between any two Latin letters.
   */
  omitted: string;
  /** Capital letters that ask for a particular letter, e.g. T for ٹ. Ignored at word start. */
  capitals: Readonly<Record<string, string>>;
  /**
   * Common words with fixed conversions, as [Roman spellings, script words]. Both sides are
   * space-separated; the first script word is the default.
   */
  words: readonly (readonly [string, string])[];
  /** Punctuation converted as it is typed in Roman mode. */
  punctuation: Readonly<Record<string, string>>;
}

export interface CompiledOutput {
  text: string;
  cost: number;
}

export interface CompiledRule {
  in: string;
  outputs: readonly CompiledOutput[];
  at: TranslitRule["at"];
  prev: TranslitRule["prev"];
  next: TranslitRule["next"];
}

/** Parse `"ا ع:1.5 -:2"` into outputs. */
export function parseOutputs(spec: string): CompiledOutput[] {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const colon = part.lastIndexOf(":");
      const text = colon > 0 ? part.slice(0, colon) : part;
      const cost = colon > 0 ? Number(part.slice(colon + 1)) : 0;
      if (!Number.isFinite(cost)) throw new Error(`Bad cost in "${part}"`);
      return { text: text === "-" ? "" : text, cost };
    });
}

export interface CompiledScheme {
  scheme: TranslitScheme;
  /** Rules by first letter, longest input first. */
  byFirst: ReadonlyMap<string, readonly CompiledRule[]>;
  omitted: readonly CompiledOutput[];
  /** Fixed words by lowercase Roman spelling. */
  words: ReadonlyMap<string, readonly string[]>;
  isVowel: (c: string | undefined) => boolean;
}

export function compileScheme(scheme: TranslitScheme): CompiledScheme {
  const byFirst = new Map<string, CompiledRule[]>();
  for (const rule of scheme.rules) {
    if (rule.in !== rule.in.toLowerCase() || rule.in.length === 0) {
      throw new Error(`Rule input must be lowercase letters: "${rule.in}"`);
    }
    const compiled: CompiledRule = {
      in: rule.in,
      outputs: parseOutputs(rule.out),
      at: rule.at,
      prev: rule.prev,
      next: rule.next,
    };
    const list = byFirst.get(rule.in[0]!) ?? [];
    list.push(compiled);
    byFirst.set(rule.in[0]!, list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.in.length - a.in.length);

  const words = new Map<string, string[]>();
  for (const [romans, scripts] of scheme.words) {
    const outs = scripts.split(/\s+/).filter(Boolean);
    for (const roman of romans.toLowerCase().split(/\s+/).filter(Boolean)) {
      const list = words.get(roman) ?? [];
      for (const o of outs) if (!list.includes(o)) list.push(o);
      words.set(roman, list);
    }
  }

  const vowels = new Set(scheme.vowels);
  return {
    scheme,
    byFirst,
    omitted: parseOutputs(scheme.omitted),
    words,
    isVowel: (c) => c !== undefined && vowels.has(c),
  };
}
