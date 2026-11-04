/**
 * Hangul 2-set composition (KS X 5002): each key types a jamo, and jamo join the syllable before
 * the caret. Pure functions on text, so an editor needs no hidden composition buffer.
 */
const L = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const V = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const T = "\0ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

/** Two jamo written as one: [first, second, joined]. */
const VOWEL_PAIRS: Readonly<Record<string, string>> = {
  ㅗㅏ: "ㅘ",
  ㅗㅐ: "ㅙ",
  ㅗㅣ: "ㅚ",
  ㅜㅓ: "ㅝ",
  ㅜㅔ: "ㅞ",
  ㅜㅣ: "ㅟ",
  ㅡㅣ: "ㅢ",
};
const FINAL_PAIRS: Readonly<Record<string, string>> = {
  ㄱㅅ: "ㄳ",
  ㄴㅈ: "ㄵ",
  ㄴㅎ: "ㄶ",
  ㄹㄱ: "ㄺ",
  ㄹㅁ: "ㄻ",
  ㄹㅂ: "ㄼ",
  ㄹㅅ: "ㄽ",
  ㄹㅌ: "ㄾ",
  ㄹㅍ: "ㄿ",
  ㄹㅎ: "ㅀ",
  ㅂㅅ: "ㅄ",
};
const invert = (pairs: Readonly<Record<string, string>>) =>
  new Map(Object.entries(pairs).map(([pair, joined]) => [joined, pair]));
const VOWEL_PARTS = invert(VOWEL_PAIRS);
const FINAL_PARTS = invert(FINAL_PAIRS);

const BASE = 0xac00;
const isJamo = (c: string) => L.includes(c) || V.includes(c);

interface Syllable {
  l: number;
  v: number;
  t: number;
}

function split(c: string): Syllable | null {
  const n = c.charCodeAt(0) - BASE;
  if (c.length !== 1 || n < 0 || n > 11171) return null;
  return { l: Math.floor(n / 588), v: Math.floor((n % 588) / 28), t: n % 28 };
}

const join = (s: Syllable) => String.fromCharCode(BASE + s.l * 588 + s.v * 28 + s.t);

export interface Rewrite {
  /** UTF-16 units to delete before the caret. */
  remove: number;
  text: string;
}

/** What typing `jamo` after `before` does; a character that is not a jamo is typed as it is. */
export function composeHangul(before: string, jamo: string): Rewrite {
  const plain = { remove: 0, text: jamo };
  if (!isJamo(jamo)) return plain;
  const last = before.slice(-1);
  const isVowel = V.includes(jamo);

  // A lone jamo before the caret.
  if (L.includes(last) && last !== "") {
    if (!isVowel) return plain;
    return { remove: 1, text: join({ l: L.indexOf(last), v: V.indexOf(jamo), t: 0 }) };
  }
  if (V.includes(last) && last !== "") {
    const joined = isVowel ? VOWEL_PAIRS[last + jamo] : undefined;
    return joined ? { remove: 1, text: joined } : plain;
  }

  const s = split(last);
  if (!s) return plain;
  if (s.t === 0) {
    if (isVowel) {
      const joined = VOWEL_PAIRS[V[s.v]! + jamo];
      return joined ? { remove: 1, text: join({ ...s, v: V.indexOf(joined) }) } : plain;
    }
    const t = T.indexOf(jamo);
    return t > 0 ? { remove: 1, text: join({ ...s, t }) } : plain;
  }
  const final = T[s.t]!;
  if (!isVowel) {
    const joined = FINAL_PAIRS[final + jamo];
    return joined ? { remove: 1, text: join({ ...s, t: T.indexOf(joined) }) } : plain;
  }
  // A vowel takes the last final as its first consonant: 갑 + ㅏ → 가바, 값 + ㅏ → 갑사.
  const parts = FINAL_PARTS.get(final);
  const keep = parts ? T.indexOf(parts[0]!) : 0;
  const moved = parts ? parts[1]! : final;
  return {
    remove: 1,
    text: join({ ...s, t: keep }) + join({ l: L.indexOf(moved), v: V.indexOf(jamo), t: 0 }),
  };
}

/** Backspace inside a syllable takes one jamo off it; null when the last character is not Hangul. */
export function backspaceHangul(before: string): Rewrite | null {
  const last = before.slice(-1);
  if (!last) return null;
  const vowelParts = VOWEL_PARTS.get(last);
  if (vowelParts) return { remove: 1, text: vowelParts[0]! };
  const s = split(last);
  if (!s) return null;
  if (s.t > 0) {
    const parts = FINAL_PARTS.get(T[s.t]!);
    return { remove: 1, text: join({ ...s, t: parts ? T.indexOf(parts[0]!) : 0 }) };
  }
  const parts = VOWEL_PARTS.get(V[s.v]!);
  if (parts) return { remove: 1, text: join({ ...s, v: V.indexOf(parts[0]!) }) };
  return { remove: 1, text: L[s.l]! };
}

const SPLIT: Readonly<Record<string, string>> = Object.fromEntries(
  [...Object.entries(VOWEL_PAIRS), ...Object.entries(FINAL_PAIRS)].map(([pair, one]) => [one, pair]),
);

/** A syllable as the letters typed for it, in order: 과 is ㄱㅗㅏ, 값 is ㄱㅏㅂㅅ. */
export function hangulLetters(text: string): string {
  return text.replace(/[\uAC00-\uD7A3]/g, (syllable) => {
    const n = syllable.codePointAt(0)! - 0xac00;
    const v = V[Math.floor(n / 28) % 21]!;
    const t = n % 28 ? T[n % 28]! : "";
    return L[Math.floor(n / 588)]! + (SPLIT[v] ?? v) + (SPLIT[t] ?? t);
  });
}
