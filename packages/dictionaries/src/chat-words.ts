/**
 * Writes data/<code>/chat.tsv: the chat spelling of words in English letters, for the
 * script → Roman converter (plan item 6.5). Taken from the dev splits only (the Urdu set for
 * Urdu, which has no split); test splits never ship. For each word, the Roman spelling seen
 * most often wins, then the one listed first.
 *
 *   node src/chat-words.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TEST_DATA = new URL("../test/data/", import.meta.url);
const DATA = new URL("../data/", import.meta.url);

const SOURCES: Readonly<Record<string, { file: string; credit: string }>> = {
  ur: { file: "ur-roman-pairs.tsv", credit: "Likho Roman Urdu set" },
  hi: { file: "hi-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  bn: { file: "bn-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  sd: { file: "sd-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  mr: { file: "mr-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  gu: { file: "gu-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  pa: { file: "pa-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  ta: { file: "ta-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  te: { file: "te-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  kn: { file: "kn-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  ml: { file: "ml-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  si: { file: "si-roman-dev.tsv", credit: "Dakshina dataset v1.0 (Google Research), CC BY-SA 4.0" },
  ar: { file: "ar-roman-dev.tsv", credit: "Likho Arabic dev set" },
  fa: { file: "fa-roman-dev.tsv", credit: "Likho Persian dev set" },
};

for (const [code, { file, credit }] of Object.entries(SOURCES)) {
  const path = new URL(file, TEST_DATA);
  if (!existsSync(path)) continue;
  const counts = new Map<string, Map<string, number>>();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [roman, natives] = line.split("\t");
    if (!roman || !natives) continue;
    // The first listed spelling is the preferred one.
    const word = natives.trim().split("|")[0]!;
    const forWord = counts.get(word) ?? new Map<string, number>();
    forWord.set(roman.trim(), (forWord.get(roman.trim()) ?? 0) + 1);
    counts.set(word, forWord);
  }
  const rows = [...counts]
    .map(([word, romans]) => {
      // Stable sort: on a tie, the spelling listed first wins (sets list the usual one first).
      const best = [...romans].sort((a, b) => b[1] - a[1])[0]![0];
      return `${word}\t${best}`;
    })
    .sort();
  const header = `# Chat spellings in English letters (word<TAB>roman). Source: ${credit}.\n`;
  writeFileSync(new URL(`${code}/chat.tsv`, DATA), header + rows.join("\n") + "\n");
  console.log(`data/${code}/chat.tsv: ${rows.length} words`);
}
