import { SpellChecker, type Dictionary, type Layout } from "@okb/engine";
import { spellingRules } from "@okb/engine/spelling";

/**
 * The spell checker for a language, loaded with its word list: the rules (sound-alike
 * letters, keyboard neighbours, normalisers for every language) stay out of the page's
 * first download.
 */
export function createChecker(
  dictionary: Dictionary,
  code: string,
  layouts: readonly Layout[],
): SpellChecker | null {
  const rules = spellingRules(code, layouts);
  return rules ? new SpellChecker(dictionary.lexicon, rules, dictionary.latin) : null;
}
