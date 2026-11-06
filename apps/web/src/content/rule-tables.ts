/**
 * Tables of what a layout's context rules type (RuleTable.astro), for keyboards where letters
 * come from a letter and then a key: IPA, Arabic romanisation, pinyin tone marks. Rows and
 * cells are worked out from the layout's own rules, so the table cannot drift from them.
 */
import type { Layout } from "@okb/engine/layout";

export interface RuleTableSpec {
  /** The table's caption. */
  caption: string;
  /** Column heads: the keys typed after the row's letters (== is = twice). */
  keys: readonly string[];
  /** Which rule contexts become rows; all with a result in some column by default. */
  row?: (before: string) => boolean;
}

export const RULE_TABLES: Readonly<Record<string, RuleTableSpec>> = {
  "ipa-sil": {
    caption: "Type the letter, then the key at the top of the column.",
    keys: ["=", "<", ">", "^"],
    row: (before) => /^[a-zA-Z?!.#]$/.test(before),
  },
  "arl-standard": {
    caption: "Type the letter, then = once or twice.",
    keys: ["=", "=="],
    row: (before) => /^[a-z]$/.test(before),
  },
  "py-tones": {
    caption: "Type the syllable, then its tone number. 5 is the neutral tone (ma5 ma).",
    keys: ["1", "2", "3", "4"],
    row: (before) => /^[a-zü]+$/.test(before),
  },
};

/** The text after typing `keys` after `before`, or null when a key has no rule there. */
export function applyRules(layout: Layout, before: string, keys: string): string | null {
  let text = before;
  for (const key of keys) {
    const rule = layout.rules
      .filter((r) => r.typed === key && text.endsWith(r.before))
      .sort((a, b) => b.before.length - a.before.length)[0];
    if (!rule) return null;
    text = text.slice(0, text.length - (rule.remove ?? 0)) + rule.add;
  }
  return text;
}

/** The table's rows: each context and what each column's keys make of it. */
export function ruleTable(
  layout: Layout,
  spec: RuleTableSpec,
): { before: string; cells: (string | null)[] }[] {
  const befores = [...new Set(layout.rules.map((r) => r.before))].filter(
    (b) => spec.row?.(b) ?? true,
  );
  // Single letters in keyboard order: small letters, capitals, then symbols.
  const rank = (b: string) => (/^[a-z]$/.test(b) ? 0 : /^[A-Z]$/.test(b) ? 1 : 2);
  if (befores.every((b) => b.length === 1))
    befores.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return befores
    .map((before) => ({
      before,
      cells: spec.keys.map((keys) => {
        const out = applyRules(layout, before, keys);
        return out === null || out === before ? null : out;
      }),
    }))
    .filter((row) => row.cells.some((c) => c !== null));
}
