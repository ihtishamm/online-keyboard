import type { TranslitRule, TranslitScheme } from "@okb/engine";

export interface SchemeChanges {
  id: string;
  lang: string;
  /** Letters of the base scheme's outputs to write differently (Sindhi ک -> ڪ, ی -> ي);
   * a letter may become several characters. */
  letters?: Readonly<Record<string, string>>;
  /** Rules added before the base rules. A rule with the same input and context replaces the base one. */
  rules?: readonly TranslitRule[];
  /** Base rules to drop, by input (all contexts). */
  drop?: readonly string[];
  omitted?: string;
  capitals?: Readonly<Record<string, string>>;
  /** Replaces the base list: common words differ between languages. */
  words: TranslitScheme["words"];
  punctuation?: TranslitScheme["punctuation"];
}

const ruleKey = (r: TranslitRule) => `${r.in}|${r.at ?? ""}|${r.prev ?? ""}|${r.next ?? ""}`;

/**
 * A scheme defined as differences from another (plan item 6.2: Sindhi, Shahmukhi, Saraiki,
 * Kashmiri and Balochi start from Roman Urdu). Letter changes apply to the base outputs only;
 * the new rules are written in the target letters already.
 */
export function extendScheme(base: TranslitScheme, changes: SchemeChanges): TranslitScheme {
  const map = changes.letters ?? {};
  const rewrite = (text: string) => [...text].map((c) => map[c] ?? c).join("");
  const respell = (spec: string) =>
    spec
      .trim()
      .split(/\s+/)
      .map((part) => {
        const colon = part.lastIndexOf(":");
        return colon > 0 ? rewrite(part.slice(0, colon)) + part.slice(colon) : rewrite(part);
      })
      .join(" ");

  const replaced = new Set((changes.rules ?? []).map(ruleKey));
  const dropped = new Set(changes.drop ?? []);
  const inherited = base.rules
    .filter((r) => !replaced.has(ruleKey(r)) && !dropped.has(r.in))
    .map((r) => ({ ...r, out: respell(r.out) }));

  return {
    ...base,
    id: changes.id,
    lang: changes.lang,
    rules: [...(changes.rules ?? []), ...inherited],
    omitted: changes.omitted ?? respell(base.omitted),
    capitals: {
      ...Object.fromEntries(Object.entries(base.capitals).map(([k, v]) => [k, rewrite(v)])),
      ...changes.capitals,
    },
    words: changes.words,
    punctuation: changes.punctuation ?? base.punctuation,
  };
}
