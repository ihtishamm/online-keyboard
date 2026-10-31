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
export function encodeDictionary(words: readonly string[], next: string): string {
  const order = decodedOrder(words);
  const newRank = new Map<number, number>();
  order.forEach((e, i) => newRank.set(e.rank, i));

  const sorted = [...order].sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
  const lines = [MAGIC];
  let prev = "";
  for (const { word, band } of sorted) {
    if (/[^\u0080-\uffff]/.test(word)) throw new Error(`Word with ASCII characters: "${word}"`);
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
  return lines.join("\n") + "\n";
}

/** Decode to a rank-ordered word list and NextWords text. */
export function decodeDictionary(text: string): { words: string[]; next: string } {
  const lines = text.split("\n");
  if (lines[0] !== MAGIC) throw new Error("Not a Likho dictionary file");
  const entries: { word: string; band: number }[] = [];
  let prev = "";
  let i = 1;
  for (; i < lines.length && lines[i] !== "--"; i++) {
    const line = lines[i]!;
    if (!line) continue;
    const shared = line.charCodeAt(0) - PREFIX0;
    const word = prev.slice(0, shared) + line.slice(1, -1);
    entries.push({ word, band: line.charCodeAt(line.length - 1) - BAND0 });
    prev = word;
  }
  // Already sorted by word; a stable sort by band gives the decoded order.
  entries.sort((a, b) => a.band - b.band);
  return { words: entries.map((e) => e.word), next: lines.slice(i + 1).join("\n") };
}
