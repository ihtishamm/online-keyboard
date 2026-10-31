/**
 * Writes test/data/<code>-misspellings.tsv: synthetic misspellings for the spell-check
 * evaluation (plan item 6.6), for languages without a collected set. Each is a common word
 * (ranks 100–8,000) with one typical slip: a sound-alike letter swapped, a vowel sign or weak
 * letter dropped or doubled, or two letters swapped. Kept only when the result is not in the
 * 100k-word list. Fixed seed, so the files are reproducible. Real typists' errors would be
 * better; these are flagged as synthetic in the README.
 *
 *   node src/make-misspellings.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Sound-alike groups for generating errors (deliberately broad: not the checker's tables).
const SOUND: Readonly<Record<string, readonly string[]>> = {
  ar: ["سصث", "زذظض", "تط", "هحة", "اأإ", "يى", "كق", "دض"],
  fa: ["سصث", "زذضظ", "تط", "هح", "قغ", "اع"],
  ps: ["سصث", "زذضظ", "تط", "هح", "یيې", "ښش", "ړر", "ډد", "ټت"],
  sd: ["سصث", "زذضظ", "تط", "هح", "ڪق", "دڊ", "نڻ"],
  pnb: ["سصث", "زذضظ", "تط", "ہح", "کق", "نݨ", "ڑر"],
  skr: ["سصث", "زذضظ", "تط", "ہح", "بٻ", "جڄ", "گڳ", "نݨ"],
  ks: ["سصث", "زذضظ", "تط", "ہح", "کق"],
  hi: ["\u093F\u0940", "\u0941\u0942", "शषस", "नण", "बव", "\u0947\u0948", "\u094B\u094C"],
  bn: ["\u09BF\u09C0", "\u09C1\u09C2", "শষস", "নণ", "জয"],
};
const WEAK: Readonly<Record<string, string>> = {
  ar: "اوي",
  fa: "اوی",
  ps: "اوی",
  sd: "اوي",
  pnb: "اویہ",
  skr: "اویہ",
  ks: "اویہ",
  hi: "ािीुूेैोौं्",
  bn: "ািীুূেোং্",
};

let seed = 20261031;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;

function slip(word: string, code: string): string | null {
  const chars = [...word];
  const kind = Math.floor(rand() * 4);
  if (kind === 0) {
    const spots = chars.flatMap((c, i) => (SOUND[code]!.some((g) => g.includes(c)) ? [i] : []));
    if (!spots.length) return null;
    const i = pick(spots);
    const group = SOUND[code]!.find((g) => g.includes(chars[i]!))!;
    const others = [...group].filter((c) => c !== chars[i]);
    chars[i] = pick(others);
  } else if (kind === 1) {
    const spots = chars.flatMap((c, i) => (i > 0 && WEAK[code]!.includes(c) ? [i] : []));
    if (!spots.length) return null;
    chars.splice(pick(spots), 1);
  } else if (kind === 2) {
    const i = 1 + Math.floor(rand() * (chars.length - 1));
    chars.splice(i, 0, chars[i - 1]!);
  } else {
    if (chars.length < 4) return null;
    const i = 1 + Math.floor(rand() * (chars.length - 2));
    [chars[i], chars[i + 1]] = [chars[i + 1]!, chars[i]!];
  }
  const out = chars.join("");
  return out === word ? null : out;
}

for (const code of Object.keys(SOUND)) {
  const file = new URL(`../data/${code}/words.txt`, import.meta.url);
  if (!existsSync(file)) continue;
  const words = readFileSync(file, "utf8").split("\n").filter(Boolean);
  const known = new Set(words);
  const pool = words.slice(100, 8000).filter((w) => [...w].length >= 4);
  const rows: string[] = [];
  const used = new Set<string>();
  for (let tries = 0; rows.length < 50 && tries < 20000; tries++) {
    const word = pick(pool);
    if (used.has(word)) continue;
    const wrong = slip(word, code);
    if (!wrong || known.has(wrong)) continue;
    used.add(word);
    rows.push(`${wrong}\t${word}`);
  }
  const header =
    "# Synthetic misspellings (wrong<TAB>right): common words with one typical slip, made by\n" +
    "# src/make-misspellings.ts. Not collected from real typists; needs review.\n";
  writeFileSync(
    new URL(`../test/data/${code}-misspellings.tsv`, import.meta.url),
    header + rows.join("\n") + "\n",
  );
  console.log(`${code}: ${rows.length}`);
}
