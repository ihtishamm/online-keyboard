// @vitest-environment node
/**
 * Every smart-accents example on a Latin-script language page runs through the real thing
 * (plan rule: examples on a page come from our own tool). The tips say "Type X and press
 * Space: smart accents writes Y", and "Words that are … both ways, like a and b or c and d":
 * the first must be what the shipped word list does, the second must be left alone, with the
 * accented spelling offered instead.
 */
import { AccentRestorer, makeDictionary, stripAccents } from "@okb/engine";
import { decodeDictionary } from "@okb/engine/compact";
import { LANGUAGES } from "@okb/layouts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WEB = process.cwd();
const DICTS = join(WEB, "../../packages/dictionaries/data");

const latin = LANGUAGES.filter(
  (l) => l.script === "Latn" && l.wordList && existsSync(join(DICTS, l.code, "dict.txt")),
);

describe.each(latin.map((l) => [l.slug, l] as const))("%s page examples", (_, l) => {
  const copy = readFileSync(join(WEB, `src/content/languages/${l.slug}.md`), "utf8");
  const { words, next, accents } = decodeDictionary(
    readFileSync(join(DICTS, l.code, "dict.txt"), "utf8"),
  );
  const latinWords = makeDictionary(words, next, l.code, accents).latin!;
  const restorer = new AccentRestorer(latinWords.words, latinWords.locale, latinWords.accents);

  // Latin writes macrons too rarely for smart accents to act: its tip says so instead.
  it.skipIf(l.code === "la")("restores what the tip says", () => {
    const m = /Type (\S+) and press Space: smart accents writes ([^\s.]+)\./u.exec(copy);
    expect(m, "a 'Type … and press Space' tip").not.toBeNull();
    expect(restorer.restore(m![1]!).auto).toBe(m![2]);
  });

  it("leaves both-way words alone and offers the other spelling", () => {
    const tip = copy
      .split("\n")
      .find((line) => /both ways|with and without|both correct/.test(line));
    expect(tip, "a tip on words that are right both ways").toBeDefined();
    const pairs = [...tip!.matchAll(/(\p{L}+) and (\p{L}+)/gu)]
      .map((m) => [m[1]!, m[2]!] as const)
      .filter(([a, b]) => a !== b && stripAccents(a) === stripAccents(b));
    expect(pairs.length).toBeGreaterThan(0);
    for (const [a, b] of pairs) {
      // Either may come first (kerek and kerék, té and te).
      const [plain, accented] = stripAccents(a) === a ? [a, b] : [b, a];
      const result = restorer.restore(plain);
      expect(result.auto, `${plain} stays`).toBeNull();
      expect(result.options, `${accented} is offered for ${plain}`).toContain(accented);
    }
  });
});
