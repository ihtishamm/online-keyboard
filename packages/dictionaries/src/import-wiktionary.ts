/**
 * Turns Wiktionary's script and Roman pairs (English Wiktionary, CC BY-SA 4.0, by way of the
 * kaikki.org JSON Lines export) into our evaluation files, for languages neither Dakshina nor
 * Aksharantar covers (plan 9a).
 *
 *   node src/import-wiktionary.ts --lang ug --file kaikki.org-dictionary-Uyghur.jsonl
 *
 * Writes test/data/<lang>-roman-{dev,test}.tsv in the format of the Dakshina pairs. Words are
 * split by a hash of the word, so a word's spellings stay on one side and every run agrees.
 *
 * Wiktionary's Roman spellings are scholarly (ULY for Uyghur, Hawar for Sorani, its own letters
 * for Dhivehi). They are put into English keyboard letters by the tables below, so a test
 * spelling is what its alphabet's users type without accents; it is not chat spelling collected
 * from people, and the results say so. With a word list built, only words in it are kept:
 * Wiktionary's rarer entries are not what people type. Jawi's word list comes from the same
 * pairs (src/import-jawi.ts), so its score says how well the list's words are found, not how
 * many words it holds.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { TEXT_RULES } from "./languages.ts";
import { hash53 } from "./urdu.ts";

/** Wiktionary letters → English keyboard letters, longest first. */
const LETTERS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  // Wiktionary's Dhivehi uses t ތ, d ދ, ṭ ޓ, ḍ ޑ; Malé Latin writes th, dh, t, d. A ring marks
  // a sukun, not written in Latin, except that a final stop (k̊, ʔ) is spelled h.
  dv: [
    ["k̊", "h"],
    ["\u030A", ""],
    ["ᵐb", "mb"],
    ["ⁿd", "ndh"],
    ["ⁿḍ", "nd"],
    ["ⁿg", "ng"],
    ["ā", "aa"],
    ["ī", "ee"],
    ["ū", "oo"],
    ["ē", "ey"],
    ["ō", "oa"],
    ["š", "sh"],
    ["ṣ", "sh"],
    ["ş", "s"],
    ["c", "ch"],
    ["x", "kh"],
    ["ţ", "t"],
    ["ñ", "ny"],
    ["t", "th"],
    ["d", "dh"],
    ["ṭ", "t"],
    ["ḍ", "d"],
    ["ḷ", "lh"],
    ["ṇ", "n"],
    ["ḥ", "h"],
    ["ẓ", "z"],
    ["ź", "z"],
    ["ž", "z"],
    ["ṯ", "th"],
    ["ḋ", "dh"],
    ["ġ", "gh"],
    ["ʿ", "'"],
  ],
  // Hawar: c is ج and j is ژ; the accented vowels are typed plain.
  ckb: [
    ["c", "j"],
    ["j", "zh"],
    ["ç", "ch"],
    ["ş", "sh"],
    ["ê", "e"],
    ["î", "i"],
    ["û", "u"],
    ["ū", "u"],
    ["ř", "r"],
    ["ł", "l"],
    ["ḷ", "l"],
    ["ḧ", "h"],
    ["ḥ", "h"],
    ["ẍ", "gh"],
    ["ā", "a"],
    ["á", "a"],
    ["â", "a"],
    ["ė", "e"],
    ["ə", "e"],
    ["æ", "e"],
    ["ː", ""],
    ["ʿ", "'"],
  ],
  // ULY: the accented vowels are typed plain.
  ug: [
    ["é", "e"],
    ["ë", "e"],
    ["ö", "o"],
    ["ü", "u"],
  ],
  zlm: [],
};

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    file: { type: "string" },
    /** Pairs kept per split at most. */
    pairs: { type: "string", default: "1000" },
    /** Every n-th word goes to the test split, the rest to dev. */
    "test-every": { type: "string", default: "2" },
  },
});
const code = args.lang ?? "";
const rules = TEXT_RULES[code];
const table = LETTERS[code];
if (!args.file || !rules || !table) {
  console.error(
    `Usage: import-wiktionary.ts --lang <${Object.keys(LETTERS).join("|")}> --file <jsonl>`,
  );
  process.exit(1);
}

/** A Wiktionary spelling in English keyboard letters, or null if a letter has no typed form. */
const typed = (roman: string): string | null => {
  let out = "";
  let text = roman.toLowerCase().normalize("NFC").replace(/-/g, "");
  if (code === "dv") text = text.replace(/k\u030A$/, "h");
  for (let i = 0; i < text.length;) {
    const hit = table.find(([from]) => text.startsWith(from, i));
    out += hit ? hit[1] : text[i];
    i += hit ? hit[0].length : 1;
  }
  out = out.normalize("NFD").replace(/\p{M}/gu, "");
  return /^[a-z']+$/.test(out) ? out : null;
};

interface Form {
  form?: string;
  tags?: string[];
}
interface Entry {
  word?: string;
  pos?: string;
  forms?: Form[];
}

/** [Roman, script] of an entry: Malay headwords are Rumi with a Jawi form; others the reverse. */
function pair(entry: Entry): readonly [string, string] | null {
  const forms = entry.forms ?? [];
  if (code === "zlm") {
    const jawi = forms.find((f) => f.tags?.includes("Jawi"))?.form;
    return jawi && entry.word ? [entry.word, jawi] : null;
  }
  const roman = forms.find((f) => f.tags?.includes("romanization"))?.form;
  return roman && entry.word ? [roman, entry.word] : null;
}

const dictWords = new URL(`../data/${code}/words.txt`, import.meta.url);
const known = existsSync(dictWords)
  ? new Set(readFileSync(dictWords, "utf8").split("\n").filter(Boolean))
  : null;

const byRoman = new Map<string, Set<string>>();
let read = 0;
for (const line of readFileSync(args.file, "utf8").split("\n")) {
  if (!line) continue;
  const entry = JSON.parse(line) as Entry;
  if (entry.pos === "character" || entry.pos === "suffix" || entry.pos === "prefix") continue;
  const found = pair(entry);
  if (!found) continue;
  read++;
  const roman = typed(found[0]);
  const word = rules.normalizeWord(found[1]);
  if (!roman || !word || (known && !known.has(word))) continue;
  const natives = byRoman.get(roman) ?? new Set<string>();
  natives.add(word);
  byRoman.set(roman, natives);
}

const every = Number(args["test-every"]);
/** Every n-th spelling, so the sample spans the alphabet. */
const split = (want: "dev" | "test") => {
  const romans = [...byRoman.keys()]
    .filter((roman) => (hash53(roman) % every === 0) === (want === "test"))
    .sort();
  const step = Math.max(1, Math.floor(romans.length / Number(args.pairs)));
  return romans
    .filter((_, i) => i % step === 0)
    .slice(0, Number(args.pairs))
    .map((roman) => `${roman}\t${[...byRoman.get(roman)!].join("|")}`);
};

for (const want of ["dev", "test"] as const) {
  const lines = split(want);
  writeFileSync(
    new URL(`../test/data/${code}-roman-${want}.tsv`, import.meta.url),
    [
      `# ${code}: Roman spelling -> accepted words (${want} split)`,
      "# From English Wiktionary (CC BY-SA 4.0), through kaikki.org: its Roman spellings put into",
      "# English keyboard letters by src/import-wiktionary.ts.",
      "# Native words normalised with packages/dictionaries/src/languages.ts.",
      ...lines,
      "",
    ].join("\n"),
  );
  console.log(`${code} ${want}: ${lines.length} pairs (from ${read} entries)`);
}
