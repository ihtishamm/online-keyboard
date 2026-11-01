import { deadStrokeMap, keystrokeMap } from "@okb/engine";
import { LANGUAGES, getLayout } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { TYPING_LANGUAGES, gameData } from "../../content/typing/practice";
import { URDU_PASSAGES, URDU_WORDS } from "../../content/typing/urdu";
import { createDrill, typeText, typeable } from "./drill";
import { finderLetters } from "./KeyFinder";
import { keyTotals } from "./KeyHeatmap";
import {
  badges,
  challengeNumber,
  dailyText,
  longestStreak,
  parseExport,
  recordOf,
  streak,
  sumKeys,
  utcDay,
  weakestKeys,
  wordsFor,
  type TypingRecord,
} from "./progress";

const record = (over: Partial<TypingRecord>): TypingRecord => ({
  slug: "urdu",
  layout: "ur-phonetic",
  activity: "test",
  at: Date.parse("2026-11-01T10:00:00Z"),
  day: "2026-11-01",
  speed: 30,
  unit: "wpm",
  accuracy: 95,
  seconds: 60,
  phone: false,
  keys: {},
  ...over,
});

describe("per-key counts", () => {
  it("counts each key against the character it should type", () => {
    let d = createDrill(["سب"]);
    d = typeText(d, "س", 0);
    d = typeText(d, "ک", 1); // wrong: should be ب
    expect(d.keyCounts).toEqual({ س: [1, 0], ب: [0, 1] });
  });

  it("counts keys after a mistake for nothing", () => {
    let d = createDrill(["abc", "d"], "Latn");
    d = typeText(d, "x", 0); // wrong for a
    d = typeText(d, "b", 1); // off track: not counted
    expect(d.keyCounts).toEqual({ a: [0, 1] });
  });

  it("counts both keys of a letter typed in parts for that letter", () => {
    let d = createDrill(["آپ"]);
    d = typeText(d, "ا", 0);
    d = typeText(d, "\u0653", 1); // madda: ا + ◌\u0653 = آ
    expect(d.keyCounts).toEqual({ آ: [2, 0] });
  });

  it("adds up over records and finds the weakest keys", () => {
    const keys = sumKeys([
      { keys: { a: [9, 1], b: [5, 5], c: [10, 0] } },
      { keys: { b: [2, 0], d: [1, 1] } },
    ]);
    expect(keys.get("b")).toEqual([7, 5]);
    // d has too few presses; c has no misses.
    expect(weakestKeys(keys)).toEqual(["b", "a"]);
  });

  it("finds practice words for weak keys, those with more of them first", () => {
    expect(wordsFor(["x", "y"], ["ax", "b", "xyz", "cy"])).toEqual(["xyz", "ax", "cy"]);
    expect(wordsFor([], ["a"])).toEqual([]);
  });

  it("puts each character on its key for the heatmap", () => {
    const layout = getLayout("ur-phonetic");
    const totals = keyTotals(
      layout,
      new Map([
        ["س", [3, 1] as const],
        ["آ", [2, 0] as const],
      ]),
    );
    expect(totals.get(keystrokeMap(layout).get("س")!.code)).toEqual([3, 1]);
    expect(totals.get(keystrokeMap(layout).get("آ")!.code)).toEqual([2, 0]);
  });
});

describe("streaks and the daily challenge", () => {
  it("counts days in a row, ending today or yesterday", () => {
    const days = ["2026-11-03", "2026-11-04", "2026-11-05"];
    expect(streak(days, "2026-11-05")).toBe(3);
    expect(streak(days, "2026-11-06")).toBe(3); // not played yet today
    expect(streak(days, "2026-11-07")).toBe(0);
    expect(streak([], "2026-11-07")).toBe(0);
    expect(streak(["2026-12-31", "2027-01-01"], "2027-01-01")).toBe(2);
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-05"])).toBe(2);
  });

  it("numbers challenges from the first day", () => {
    expect(challengeNumber("2026-11-01")).toBe(1);
    expect(challengeNumber("2026-12-01")).toBe(31);
    expect(utcDay(Date.parse("2026-11-01T23:59:59Z"))).toBe("2026-11-01");
  });

  it("gives everyone the same text on a day, and another the next day", () => {
    const a = dailyText("urdu", "2026-11-01", URDU_PASSAGES, URDU_WORDS);
    expect(dailyText("urdu", "2026-11-01", URDU_PASSAGES, URDU_WORDS)).toEqual(a);
    expect(dailyText("urdu", "2026-11-02", URDU_PASSAGES, URDU_WORDS)).not.toEqual(a);
    expect(a.length).toBeGreaterThanOrEqual(20);
    // Without sentences: 25 common words.
    const words = dailyText("balochi", "2026-11-01", [], URDU_WORDS);
    expect(words).toHaveLength(25);
    expect(new Set(words).size).toBe(25);
  });
});

describe("badges and records", () => {
  it("earns badges from the records", () => {
    const none = badges([], "2026-11-01");
    expect(none.every((b) => !b.earned)).toBe(true);
    const days = ["2026-11-01", "2026-11-02", "2026-11-03"];
    const some = badges(
      [
        ...days.map((day) => record({ day, activity: "daily", speed: 41 })),
        record({ slug: "hindi", accuracy: 99, seconds: 60 }),
        record({ slug: "spanish" }),
      ],
      "2026-11-03",
    );
    const earned = some.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual([
      "first",
      "daily",
      "streak-3",
      "wpm-20",
      "wpm-40",
      "accurate",
      "polyglot",
    ]);
  });

  it("makes a record of a finished drill", () => {
    const r = recordOf(
      { slug: "urdu", layout: "ur-phonetic", activity: "test", phone: true },
      { netWpm: 33, unit: "wpm", accuracy: 96, seconds: 59.6 },
      { س: [1, 0] },
      Date.parse("2026-11-02T01:00:00Z"),
    );
    expect(r).toMatchObject({ day: "2026-11-02", speed: 33, seconds: 60, phone: true });
  });

  it("reads back an export and drops anything malformed", () => {
    const good = record({ keys: { a: [1, 2] } });
    const json = JSON.stringify({
      format: "likho-typing",
      records: [good, { ...good, activity: "hack" }, { slug: 1 }, null],
    });
    expect(parseExport(json)).toEqual([good]);
    expect(parseExport(JSON.stringify([good]))).toEqual([good]);
    expect(() => parseExport("{}")).toThrow();
  });
});

describe("game text", () => {
  it("finds a layout's letters, without capitals of its small letters", () => {
    const spanish = finderLetters(getLayout("es-spain"));
    expect(spanish).toContain("ñ");
    expect(spanish).not.toContain("Ñ");
    const urdu = finderLetters(getLayout("ur-phonetic"));
    expect(urdu).toContain("ث"); // a Shift letter of its own
    expect(urdu.length).toBeGreaterThan(30);
  });

  it("builds falling-word levels that every layout can type", async () => {
    const urdu = LANGUAGES.find((l) => l.slug === "urdu")!;
    for (const l of [urdu, ...TYPING_LANGUAGES]) {
      const data = await gameData(
        l,
        l.slug === "urdu" ? { words: URDU_WORDS, passages: URDU_PASSAGES } : undefined,
      );
      expect(data.bands.length, l.slug).toBeGreaterThanOrEqual(l.wordList ? 3 : 1);
      const maps = data.layouts.map((layout) => {
        const keys = keystrokeMap(layout);
        return { keys, dead: deadStrokeMap(layout, keys) };
      });
      for (const band of data.bands) {
        expect(band.length, l.slug).toBeGreaterThanOrEqual(20);
        for (const w of band) {
          expect(
            maps.every((m) => typeable(w, m.keys, m.dead)),
            `${l.slug} ${w}`,
          ).toBe(true);
        }
      }
    }
  }, 120_000);
});
