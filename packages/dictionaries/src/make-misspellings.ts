/**
 * Writes test/data/<code>-misspellings.tsv: synthetic misspellings for the spell-check
 * evaluation (plan item 6.6), for languages without a collected set. Each is a common word
 * (ranks 100–8,000) with one typical slip: a sound-alike letter swapped, a vowel sign or weak
 * letter dropped or doubled, or two letters swapped. Kept only when the result is not in the
 * 100k-word list. Fixed seed, so the files are reproducible. Real typists' errors would be
 * better; these are flagged as synthetic in the README.
 *
 * A set, once written, is a test set: it is kept as it is when the word lists are rebuilt.
 * Delete a file to make it again. Each language starts from the same seed, so a set does not
 * depend on the languages made before it (the first 12 sets were made in one run).
 *
 *   node src/make-misspellings.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { LATIN_LOCALES, foldLatin } from "@okb/engine/latin";

// Sound-alike groups for generating errors (deliberately broad: not the checker's tables).
const SOUND: Readonly<Record<string, readonly string[]>> = {
  vi: ["dr", "sx", "ckq", "iy", "aăâ", "eê", "oôơ", "uư"],
  ar: ["سصث", "زذظض", "تط", "هحة", "اأإ", "يى", "كق", "دض"],
  fa: ["سصث", "زذضظ", "تط", "هح", "قغ", "اع"],
  ps: ["سصث", "زذضظ", "تط", "هح", "یيې", "ښش", "ړر", "ډد", "ټت"],
  sd: ["سصث", "زذضظ", "تط", "هح", "ڪق", "دڊ", "نڻ"],
  pnb: ["سصث", "زذضظ", "تط", "ہح", "کق", "نݨ", "ڑر"],
  skr: ["سصث", "زذضظ", "تط", "ہح", "بٻ", "جڄ", "گڳ", "نݨ"],
  ks: ["سصث", "زذضظ", "تط", "ہح", "کق"],
  hi: ["\u093F\u0940", "\u0941\u0942", "शषस", "नण", "बव", "\u0947\u0948", "\u094B\u094C"],
  bn: ["\u09BF\u09C0", "\u09C1\u09C2", "শষস", "নণ", "জয"],
  // Latin: letters that sound alike, and accents mixed up (dropping them is smart accents' job).
  es: ["bv", "sz", "sc", "gj", "yi", "ck", "áa", "éeè", "óo"],
  fr: ["éèêe", "sc", "ck", "gj", "mn", "àa", "ùu", "ôo"],
  it: ["éèe", "cq", "zs", "àa", "ìi", "òo", "ùu"],
  de: ["dt", "fv", "sß", "bp", "gk", "äe", "iy"],
  pt: ["sçz", "gj", "xs", "áàâa", "éêe", "óôo"],
  tr: ["td", "kg", "bp", "cç", "ıi", "oö", "uü"],
  pl: ["óu", "żź", "ęe", "ąo", "bp", "dt", "wf"],
  nl: ["dt", "fv", "sz", "ëe", "ïi", "éèe"],
  ro: ["ăâ", "îâ", "ei", "ck"],
  cs: ["iy", "íý", "úů", "ěe", "sz", "dt"],
  hu: ["öő", "üű", "oó", "ií", "uú", "jy"],
  sv: ["åo", "äe", "ck", "vw", "sz"],
  ca: ["bv", "sz", "gj", "sç", "éèe", "óòo"],
  hr: ["čć", "ie", "bp", "dt", "sz"],
  sk: ["iy", "íý", "ľl", "äe", "ôo", "dt"],
  sl: ["čc", "šs", "žz", "bp", "dt"],
  sq: ["ëe", "çc", "rl", "bp", "dt"],
  lt: ["ąa", "ęe", "ėe", "įi", "ųu", "ūu", "iy"],
  lv: ["āa", "ēe", "īi", "ūu", "šs", "žz"],
  et: ["õö", "äe", "üu", "dt", "bp", "gk"],
  fi: ["äa", "öo", "yu", "dt"],
  nb: ["åo", "æe", "øo", "vw", "sz"],
  da: ["åo", "æe", "øo", "dt", "bp"],
  is: ["iy", "íý", "ðd", "áa", "óo", "úu"],
  fo: ["iy", "íý", "ðd", "áa", "óo", "úu"],
  ga: ["áa", "éei", "íi", "óo", "úu"],
  cy: ["ôo", "âa", "êe", "ŵw", "ŷy", "dt"],
  gd: ["àa", "èe", "ìi", "òo", "ùu"],
  mt: ["ħh", "ġg", "ċc", "żz", "ie"],
  gl: ["bv", "xs", "áa", "éeè", "óo", "ñn"],
  eo: ["ĉc", "ĝg", "ŝs", "ŭu", "ĵj"],
  la: ["uv", "iy", "ae", "bp", "dt"],
  af: ["fv", "dt", "êe", "ëe", "ôo"],
  az: ["əe", "ıi", "öo", "üu", "şs", "çc", "ğg"],
  tk: ["äa", "öo", "üu", "ýy", "ňn", "şs", "çc"],
  uz: ["xh", "qk", "ao", "ie"],
  kmr: ["êe", "îi", "ûu", "şs", "çc"],
  yo: ["ẹe", "ọo", "ṣs", "áa"],
  ig: ["ịi", "ọo", "ụu", "ṅn", "áa"],
  ha: ["ɓb", "ɗd", "ƙk", "ƴy"],
  wo: ["ëe", "ñn", "ŋn", "àa", "óo"],
  haw: ["āa", "ēe", "īi", "ōo", "ūu"],
  mi: ["āa", "ēe", "īi", "ōo", "ūu"],
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
  es: "aeiouhr",
  fr: "aeiouhst",
  it: "aeiouhlnrst",
  de: "aeiouhnrst",
  pt: "aeiouhmrs",
  tr: "aeıioöuünrl",
  pl: "aeiouyjnrwz",
  nl: "aeiounrt",
  ro: "aeiouinrl",
  cs: "aeiouynrlj",
  hu: "aeiotnlsz",
  sv: "aeiounrlt",
  ca: "aeiouhlnrs",
  hr: "aeiouijnr",
  sk: "aeiouyjnrl",
  sl: "aeiounrlj",
  sq: "aeiouëjnr",
  lt: "aeiouyjnrs",
  lv: "aeiousjnr",
  et: "aeiouäõrl",
  fi: "aeiouäöhnt",
  nb: "aeiounrlt",
  da: "aeiodnrlt",
  is: "aeiournð",
  fo: "aeiournð",
  ga: "aeiouhnr",
  cy: "aeiouywnr",
  gd: "aeiouhnr",
  mt: "aeiouhjr",
  gl: "aeiouhnrs",
  eo: "aeiojnrs",
  la: "aeiounrst",
  af: "aeiounrt",
  az: "aeəıiouürnl",
  tk: "aäeiouürnl",
  uz: "aeiourln",
  kmr: "aeêiîouûrn",
  yo: "aeẹioọun",
  ig: "aeiịoọuụn",
  ha: "aeiourn",
  wo: "aeioun",
  haw: "aeiou",
  mi: "aeiou",
  vi: "aeiouynhg",
};

const SEED = 20261031;
let seed = SEED;
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
  const out = new URL(`../test/data/${code}-misspellings.tsv`, import.meta.url);
  if (!existsSync(file) || existsSync(out)) continue;
  seed = SEED;
  const words = readFileSync(file, "utf8").split("\n").filter(Boolean);
  const locale = LATIN_LOCALES[code];
  const fold = (w: string) => (locale ? foldLatin(w, locale) : w);
  const known = new Set(words.map(fold));
  // Latin: names (capitalised) are not checked, so they make no test.
  const pool = words
    .slice(100, 8000)
    .filter((w) => [...w].length >= 4 && (!locale || w === fold(w)));
  const rows: string[] = [];
  const used = new Set<string>();
  for (let tries = 0; rows.length < 50 && tries < 20000; tries++) {
    const word = pick(pool);
    if (used.has(word)) continue;
    const wrong = slip(word, code);
    if (!wrong || known.has(fold(wrong))) continue;
    used.add(word);
    rows.push(`${wrong}\t${word}`);
  }
  const header =
    "# Synthetic misspellings (wrong<TAB>right): common words with one typical slip, made by\n" +
    "# src/make-misspellings.ts. Not collected from real typists; needs review.\n";
  writeFileSync(out, header + rows.join("\n") + "\n");
  console.log(`${code}: ${rows.length}`);
}
