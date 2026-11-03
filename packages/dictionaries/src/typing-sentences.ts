/**
 * Sentences for the typing test and tutor (plan items 7.7 and 8.1), from Tatoeba
 * (https://tatoeba.org, CC BY 2.0 FR). Each line keeps its Tatoeba sentence number, for the
 * credit.
 *
 *   node src/typing-sentences.ts --lang de --tsv deu_sentences.tsv
 *
 * Writes data/<code>/typing.txt: 80 sentences of 5 to 16 words (--min-words for the small
 * sets), chosen by a hash of the sentence number, so the choice is the same on every run.
 * Left out: the spell-check test sentences (test/data/<code>-everyday.txt), Tatoeba's
 * stand-in names Tom and Mary in the language's script, digits, quotes or brackets, words on
 * the blocklist (data/<code>/blocked.txt, src/blocklist.ts), and any word the word-list rules
 * do not accept as the language's. Outside Latin script every word must also be in the word
 * list (Tatoeba's small sets hold sentences in neighbouring languages: Urdu among the Sindhi
 * ones), and Arabic-script sentences may not carry short-vowel marks, which nobody types in
 * everyday text (Balochi writes ءَ and ءُ as words, so keeps them). Typographic apostrophes
 * become ', and no-break spaces (French ? and !) plain ones, as a keyboard types them. Fewer
 * than 20 sentences write no file. The web tests check every sentence types on every layout.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { isBlocked, readBlocklist } from "./blocked.ts";
import { TEXT_RULES } from "./languages.ts";
import { hash53 } from "./urdu.ts";

const { values: args } = parseArgs({
  options: {
    lang: { type: "string" },
    tsv: { type: "string" },
    sentences: { type: "string", default: "80" },
    "min-words": { type: "string", default: "5" },
  },
});
const rules = TEXT_RULES[args.lang ?? ""];
if (!args.tsv || !rules) {
  console.error("Usage: typing-sentences.ts --lang <code> --tsv <xxx_sentences.tsv>");
  process.exit(1);
}

const testFile = new URL(`../test/data/${rules.code}-everyday.txt`, import.meta.url);
const tested = new Set(
  existsSync(testFile)
    ? readFileSync(testFile, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => l.split("\t")[1]!.toLowerCase())
    : [],
);

const dataFile = (name: string) => new URL(`../data/${rules.code}/${name}`, import.meta.url);
const blocked = readBlocklist(
  existsSync(dataFile("blocked.txt")) ? readFileSync(dataFile("blocked.txt"), "utf8") : "",
);
const latin = rules.run.source.includes("Latin");
/** Outside Latin script, the word list (if there is one) decides what is the language's. */
const known = existsSync(dataFile("words.txt"))
  ? new Set(readFileSync(dataFile("words.txt"), "utf8").split("\n"))
  : null;

/**
 * Letters, spaces, and the punctuation every layout of the script has a key for: the Catalan
 * middle dot; Arabic-script ، ؟ ۔ and ZWNJ (Farsi می\u200Cروم); the Indic danda।
 */
const ALLOWED = latin ? /^[\p{L}\p{M} .,?!'·-]+$/u : /^[\p{L}\p{M} .,?!،؟۔।\u200C]+$/u;
/** What is left of a sentence without its words: spaces and punctuation, never another script. */
const BETWEEN = /^[ .,?!'·،؟۔।\u200C-]*$/u;
const ARABIC_MARKS = /[\u064B-\u0652]/u;
/** Tom and Mary as Tatoeba writes them in each script, and Arabic Tatoeba's Sami and Layla. */
const NAMES =
  /(?<![\p{L}\p{M}])(?:Tom|Mary|تۆم|مێری|مارى|مەرى|توم|تام|ٹوم|ٹام|ماري|ماری|مری|میری|سامي|ليلى|टॉम|मैरी|টম|মেরি)(?![\p{L}\p{M}])/u;
const MIN_WORDS = Number(args["min-words"]);
const MIN_SENTENCES = 20;

const clean = (text: string) =>
  text
    .normalize("NFC")
    .replace(/[\u2019\u02BC]/g, "'")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ok = (text: string) => {
  if (!ALLOWED.test(text) || NAMES.test(text) || isBlocked(text, blocked)) return false;
  if (latin && /^[^\p{Lu}]/u.test(text)) return false;
  if (!latin && rules.code !== "bal" && ARABIC_MARKS.test(text)) return false;
  if (tested.has(text.toLowerCase()) || text.length > 110) return false;
  const words = text.split(" ");
  if (words.length < MIN_WORDS || words.length > 16) return false;
  if (!BETWEEN.test(text.replace(rules.run, ""))) return false;
  const runs = text.match(rules.run) ?? [];
  return runs.every((w) => {
    const word = rules.normalizeWord(w);
    return word !== null && (latin || !known || known.has(word));
  });
};

const seen = new Set<string>();
const picked = readFileSync(args.tsv, "utf8")
  .split("\n")
  .map((line) => line.split("\t"))
  .filter(([id, , text]) => id && text)
  .map(([id, , text]) => ({ id: id!, text: clean(text!) }))
  .filter((r) => ok(r.text))
  .sort((a, b) => hash53(a.id) - hash53(b.id))
  .filter((r) => !seen.has(r.text.toLowerCase()) && seen.add(r.text.toLowerCase()))
  .slice(0, Number(args.sentences))
  .sort((a, b) => Number(a.id) - Number(b.id));

if (picked.length < MIN_SENTENCES) {
  console.log(`${rules.code}: only ${picked.length} usable sentences; no typing.txt written`);
  process.exit(0);
}

const header =
  "# Sentences from Tatoeba (https://tatoeba.org), CC BY 2.0 FR: sentence number, tab,\n" +
  "# sentence. Chosen by src/typing-sentences.ts for the typing test and tutor.\n";
const dir = new URL(`../data/${rules.code}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(
  new URL("typing.txt", dir),
  header + picked.map((r) => `${r.id}\t${r.text}`).join("\n") + "\n",
);
console.log(`${rules.code}: ${picked.length} typing sentences`);
