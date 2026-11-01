/** Reading data/<code>/blocked.txt (made by src/blocklist.ts). No engine imports: plain Node runs this. */

export const BLOCKLIST_HEADER =
  "# Words and phrases kept out of typing practice. From LDNOOBW\n" +
  "# (https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words),\n" +
  "# CC BY 4.0; made by src/blocklist.ts. Build-time only.\n";

/** A data/<code>/blocked.txt file read back: words, and phrases of several words. */
export function readBlocklist(text: string): { words: Set<string>; phrases: string[] } {
  const entries = text.split("\n").filter((l) => l && !l.startsWith("#"));
  return {
    words: new Set(entries.filter((e) => !e.includes(" "))),
    phrases: entries.filter((e) => e.includes(" ")),
  };
}

/** True when the text holds a blocked word or phrase (case-insensitive, whole words). */
export function isBlocked(text: string, list: { words: Set<string>; phrases: string[] }): boolean {
  const lower = ` ${text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\u200C]+/gu, " ")} `;
  return (
    lower.split(" ").some((w) => list.words.has(w)) ||
    list.phrases.some((p) => lower.includes(` ${p} `))
  );
}
