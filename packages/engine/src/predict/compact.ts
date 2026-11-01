/**
 * A compact text format for a word list plus next-word table, small enough to download per
 * language (about 120 KB gzipped for 40,000 words; the plain rank-ordered list is 160 KB).
 *
 * Words are sorted and front-coded: each line holds how many leading characters it shares
 * with the previous word, the rest of the word, and a frequency band (a quarter of a binary
 * order of magnitude of its rank). Decoding orders words by band, then alphabetically, which
 * is the rank order up to ties inside a band; that is all the ranking uses. The next-word
 * table follows a `--` line, in the format NextWords.parse reads, with ranks in decoded order.
 *
 * Latin languages may end with an `-- accents <first band>` section: words beyond the shipped
 * list that smart accents needs (accents.ts), front-coded the same way, bands counted from
 * the first band. Decoded ranks are the middle of each band.
 *
 *   likho-dict 1
 *   0کتابC        (shares 0 characters, "کتاب", band C)
 *   4وںE          (shares "کتاب", so "کتابوں", band E)
 *   --
 *   ^	0 3 12
 *   0	5 9
 */
const MAGIC = "likho-dict 1";
const PREFIX0 = 48; // '0': shared-prefix length 0
const BAND0 = 65; // 'A': band 0; bands stay one byte ('~') up to rank 39,000

/** Band of a 0-based rank: 4 bands per doubling. */
export function rankBand(rank: number): number {
  return Math.floor(4 * Math.log2(rank + 1));
}

/** A word outside the shipped list, with its rank in the full word list. */
export interface RankedWord {
  word: string;
  rank: number;
}

const ACCENTS = "-- accents";

/** Front-coded lines for words sorted by code unit, each with a band (0-based, one byte). */
function frontCode(entries: readonly { word: string; band: number }[]): string[] {
  const lines: string[] = [];
  let prev = "";
  for (const { word, band } of entries) {
    // Lines are positional (prefix count first, band last), so any letters fit between;
    // only line breaks and other spaces would break the file.
    if (/\s/.test(word))
      throw new Error(`Word with a space or line break: ${JSON.stringify(word)}`);
    let shared = 0;
    while (shared < word.length && shared < prev.length && word[shared] === prev[shared]) shared++;
    shared = Math.min(shared, 9 + 26); // keep the prefix count one character ('0'-'9', ':'...)
    lines.push(
      String.fromCharCode(PREFIX0 + shared) +
        word.slice(shared) +
        String.fromCharCode(BAND0 + band),
    );
    prev = word;
  }
  return lines;
}

function frontDecode(lines: readonly string[]): { word: string; band: number }[] {
  const entries: { word: string; band: number }[] = [];
  let prev = "";
  for (const line of lines) {
    if (!line) continue;
    const shared = line.charCodeAt(0) - PREFIX0;
    const word = prev.slice(0, shared) + line.slice(1, -1);
    entries.push({ word, band: line.charCodeAt(line.length - 1) - BAND0 });
    prev = word;
  }
  return entries;
}

const byWord = <T extends { word: string }>(a: T, b: T) =>
  a.word < b.word ? -1 : a.word > b.word ? 1 : 0;

/** The order decoding produces: by band, then by code unit. */
function decodedOrder(words: readonly string[]): { word: string; band: number; rank: number }[] {
  return words
    .map((word, rank) => ({ word, band: rankBand(rank), rank }))
    .sort((a, b) => a.band - b.band || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

/**
 * Encode a rank-ordered word list and its next-word table (NextWords text, ranks into
 * `words`). Followers outside the list are dropped.
 */
export function encodeDictionary(
  words: readonly string[],
  next: string,
  accents: readonly RankedWord[] = [],
): string {
  const order = decodedOrder(words);
  const newRank = new Map<number, number>();
  order.forEach((e, i) => newRank.set(e.rank, i));

  const lines = [MAGIC, ...frontCode([...order].sort(byWord))];
  lines.push("--");
  for (const line of next.split("\n")) {
    if (!line) continue;
    const [head, rest = ""] = line.split("\t");
    const h = head === "^" ? "^" : newRank.get(Number(head));
    if (h === undefined) continue;
    const followers = rest
      .split(" ")
      .map((r) => newRank.get(Number(r)))
      .filter((r): r is number => r !== undefined);
    if (followers.length) lines.push(`${h}\t${followers.join(" ")}`);
  }
  if (accents.length) {
    const first = Math.min(...accents.map((a) => rankBand(a.rank)));
    lines.push(`${ACCENTS} ${first}`);
    const banded = accents.map(({ word, rank }) => ({ word, band: rankBand(rank) - first }));
    lines.push(...frontCode(banded.sort(byWord)));
  }
  return lines.join("\n") + "\n";
}

/** Decode to a rank-ordered word list, NextWords text and the accent words, if any. */
export function decodeDictionary(text: string): {
  words: string[];
  next: string;
  accents: RankedWord[];
} {
  const lines = text.split("\n");
  if (lines[0] !== MAGIC) throw new Error("Not a Likho dictionary file");
  const end = lines.indexOf("--");
  const entries = frontDecode(lines.slice(1, end < 0 ? lines.length : end));
  // Already sorted by word; a stable sort by band gives the decoded order.
  entries.sort((a, b) => a.band - b.band);
  const rest = end < 0 ? [] : lines.slice(end + 1);
  const at = rest.findIndex((l) => l.startsWith(ACCENTS));
  const accents: RankedWord[] = [];
  if (at >= 0) {
    const first = Number(rest[at]!.slice(ACCENTS.length + 1));
    for (const { word, band } of frontDecode(rest.slice(at + 1)))
      accents.push({ word, rank: Math.round(2 ** ((first + band + 0.5) / 4)) - 1 });
    accents.sort((a, b) => a.rank - b.rank);
  }
  return {
    words: entries.map((e) => e.word),
    next: (at >= 0 ? rest.slice(0, at) : rest).join("\n"),
    accents,
  };
}
