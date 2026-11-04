import type { Rewrite } from "./hangul";

/**
 * Vietnamese Telex and VNI: letters and digits typed after a word change that word. Works on the
 * text before the caret, so a word can be corrected by typing on: the tone is always worked out
 * again for the whole word, as hòa becomes hoàn when an n follows.
 */
export type TonePlacement = "new" | "old";
export type VietnameseMethod = "telex" | "vni";

/** Combining marks of the five tones. */
const TONE_MARKS = "\u0301\u0300\u0309\u0303\u0323";
const TONE_RE = /[\u0301\u0300\u0309\u0303\u0323]/g;

const TONE_KEYS: Readonly<Record<VietnameseMethod, Readonly<Record<string, number>>>> = {
  telex: { s: 0, f: 1, r: 2, x: 3, j: 4 },
  vni: { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 },
};
const CLEAR_KEY = { telex: "z", vni: "0" } as const;

/** Word without its tone: the letters keep their ă â ê ô ơ ư. */
const toneless = (word: string) => word.normalize("NFD").replace(TONE_RE, "").normalize("NFC");

/** The tone a word carries, or -1. */
function toneOf(word: string): number {
  const m = /[\u0301\u0300\u0309\u0303\u0323]/.exec(word.normalize("NFD"));
  return m ? TONE_MARKS.indexOf(m[0]) : -1;
}

const VOWELS = "aăâeêioôơuưy";
const isVowel = (c: string | undefined) => !!c && VOWELS.includes(c.toLowerCase());
const CODA = /^(c|ch|m|n|ng|nh|p|t)?$/;
const STOP_CODA = /^(c|ch|p|t)$/;
const ONSET = /^(b|c|ch|d|đ|g|gh|gi|h|k|kh|l|m|n|ng|ngh|nh|p|ph|qu|r|s|t|th|tr|v|x)?$/;

interface Parts {
  onset: string;
  nucleus: string;
  coda: string;
}

/** Split a toneless word into its parts, or null when it cannot be a Vietnamese syllable. */
function parse(word: string): Parts | null {
  const lower = word.toLowerCase();
  let i = 0;
  while (i < lower.length && !isVowel(lower[i])) i++;
  // gi and qu are onsets when a vowel follows: gia, quê.
  if (lower.startsWith("qu", i - 1) && i >= 1 && isVowel(lower[i + 1])) i++;
  else if (lower.startsWith("gi", i - 1) && i >= 1 && isVowel(lower[i + 1])) i++;
  let j = i;
  while (j < lower.length && isVowel(lower[j])) j++;
  const parts = { onset: word.slice(0, i), nucleus: word.slice(i, j), coda: word.slice(j) };
  if (!parts.nucleus || parts.nucleus.length > 3) return null;
  if (!ONSET.test(parts.onset.toLowerCase()) || !CODA.test(parts.coda.toLowerCase())) return null;
  return parts;
}

/** Which letter of the nucleus carries the tone. */
function toneIndex(parts: Parts, placement: TonePlacement): number {
  const n = parts.nucleus.toLowerCase();
  // ươ puts it on the ơ; any other single marked vowel takes it.
  if (n.includes("ươ")) return n.indexOf("ơ");
  const marked = [...n].findIndex((c) => "ăâêôơư".includes(c));
  if (marked >= 0 && !(n[marked] === "ư" && n.length > 1 && n[marked + 1] === "a")) return marked;
  if (n.length === 3) return 1;
  if (n.length === 1) return 0;
  if (parts.coda) return 1;
  if (/^(oa|oe|uy)$/.test(n)) return placement === "new" ? 1 : 0;
  return 0;
}

/** Put tone `tone` (-1: none) on a toneless word. Null when it cannot carry one. */
function withTone(word: string, tone: number, placement: TonePlacement): string | null {
  if (tone < 0) return word;
  const parts = parse(word);
  if (!parts) return null;
  // Stop finals take only the acute and the dot: anything else is not a Vietnamese word.
  if (STOP_CODA.test(parts.coda.toLowerCase()) && tone !== 0 && tone !== 4) return null;
  const at = parts.onset.length + toneIndex(parts, placement);
  const c = word[at]!;
  return word.slice(0, at) + (c + TONE_MARKS[tone]).normalize("NFC") + word.slice(at + 1);
}

/** Replacement letters by mark, for each base letter. */
const MARKS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  circumflex: { a: "â", e: "ê", o: "ô" },
  breve: { a: "ă" },
  horn: { o: "ơ", u: "ư" },
};

const sameCase = (from: string, to: string) =>
  from === from.toLowerCase() ? to : to.toUpperCase();

/** Mark the last suitable vowel. `undo` is what a repeated key restores. */
function mark(word: string, kind: string): string | null {
  const table = MARKS[kind]!;
  const values = Object.values(table);
  for (let i = word.length - 1; i >= 0; i--) {
    const c = word[i]!;
    const lower = c.toLowerCase();
    if (table[lower]) return word.slice(0, i) + sameCase(c, table[lower]) + word.slice(i + 1);
    if (values.includes(lower)) return null;
    if (isVowel(c)) continue;
    if (i < word.length - 3) break;
  }
  return null;
}

/** Take a mark off again, for a repeated key: â + a → aa. */
function unmark(word: string, kind: string): string | null {
  const table = MARKS[kind]!;
  for (let i = word.length - 1; i >= 0; i--) {
    const lower = word[i]!.toLowerCase();
    const base = Object.keys(table).find((k) => table[k] === lower);
    if (base) return word.slice(0, i) + sameCase(word[i]!, base) + word.slice(i + 1);
  }
  return null;
}

const WORD_END = /[\p{L}\p{M}]+$/u;

/** The word `key` changes it to, or null when it simply follows the word. */
function apply(
  method: VietnameseMethod,
  word: string,
  key: string,
  placement: TonePlacement,
): string | null {
  const lower = key.toLowerCase();
  const tone = toneOf(word);
  const plain = toneless(word);
  const finish = (next: string | null, t = tone) => {
    if (next === null) return null;
    return withTone(next, t, placement) ?? next;
  };

  if (lower === CLEAR_KEY[method]) return tone >= 0 ? plain : null;
  const toneKey = TONE_KEYS[method][lower];
  if (toneKey !== undefined) {
    if (!plain.split("").some(isVowel)) return null;
    // The same tone again takes it off and types the key.
    if (tone === toneKey) return plain + key;
    return withTone(plain, toneKey, placement);
  }

  const dStroke = () => {
    if (/^d/i.test(plain)) return finish(sameCase(plain[0]!, "đ") + plain.slice(1));
    if (/^đ/i.test(plain) && method === "telex") {
      return finish(sameCase(plain[0]!, "d") + plain.slice(1) + key);
    }
    return null;
  };

  if (method === "vni") {
    if (key === "9") return dStroke();
    if (key === "6" || key === "8") {
      return finish(mark(plain, key === "6" ? "circumflex" : "breve"));
    }
    if (key === "7") {
      const n = plain.toLowerCase();
      if (n.includes("uo")) {
        const at = n.indexOf("uo");
        const pair = sameCase(plain[at]!, "ư") + sameCase(plain[at + 1]!, "ơ");
        return finish(plain.slice(0, at) + pair + plain.slice(at + 2));
      }
      return finish(mark(plain, "horn"));
    }
  } else {
    if (lower === "d") return dStroke();
    if (lower === "a" || lower === "e" || lower === "o") {
      const circled = MARKS.circumflex![lower]!;
      if (plain.toLowerCase().includes(circled)) {
        const undone = unmark(plain, "circumflex");
        return undone === null ? null : finish(undone + key);
      }
      // Only the vowel it matches: "ie" + e is iê, but "ta" + e stays two letters.
      const at = plain.toLowerCase().lastIndexOf(lower);
      if (at < 0 || !/^[\p{L}]*$/u.test(plain.slice(at + 1))) return null;
      if (
        plain
          .slice(at + 1)
          .split("")
          .some((c) => !isVowel(c) && !CODA.test(c.toLowerCase()))
      ) {
        return null;
      }
      return finish(plain.slice(0, at) + sameCase(plain[at]!, circled) + plain.slice(at + 1));
    }
    if (lower === "w") {
      const n = plain.toLowerCase();
      // ư typed first, then o: w makes the pair (ngư, ngưo, ngươ).
      if (n.includes("ưo")) {
        const at = n.indexOf("ưo");
        return finish(plain.slice(0, at + 1) + sameCase(plain[at + 1]!, "ơ") + plain.slice(at + 2));
      }
      if (/[ăơư]/.test(n)) {
        const undoneHorn = unmark(plain, "horn") ?? unmark(plain, "breve");
        return undoneHorn === null ? null : finish(undoneHorn + key);
      }
      if (n.includes("uo")) {
        const at = n.indexOf("uo");
        const pair = sameCase(plain[at]!, "ư") + sameCase(plain[at + 1]!, "ơ");
        return finish(plain.slice(0, at) + pair + plain.slice(at + 2));
      }
      return finish(mark(plain, "horn") ?? mark(plain, "breve"));
    }
  }

  // An ordinary letter: the tone may have to move (hòa + n → hoàn).
  if (tone >= 0 && /\p{L}/u.test(key)) return withTone(plain + key, tone, placement);
  return null;
}

/** What `key` does after `before`. `key` is the single character the key types. */
export function composeVietnamese(
  method: VietnameseMethod,
  before: string,
  key: string,
  placement: TonePlacement = "new",
): Rewrite {
  const word = WORD_END.exec(before)?.[0] ?? "";
  // A lone w is ư in Telex, at the start of a word or after a consonant.
  if (!word)
    return {
      remove: 0,
      text: method === "telex" && key === "w" ? "ư" : key === "W" && method === "telex" ? "Ư" : key,
    };
  const next = apply(method, word, key, placement);
  if (next === null) return { remove: 0, text: key };
  let same = 0;
  while (same < word.length && same < next.length && word[same] === next[same]) same++;
  return { remove: word.length - same, text: next.slice(same) };
}
