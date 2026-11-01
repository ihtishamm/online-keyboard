import { deadStrokeMap, keystrokeMap } from "@okb/engine";
import { getLayout } from "@okb/layouts";
import { describe, expect, it } from "vitest";
import { TYPING_COPY } from "../../content/typing/latin-copy";
import { TYPING_LANGUAGES, practiceText, typingLayouts } from "../../content/typing/latin";
import { URDU_PASSAGES, URDU_WORDS } from "../../content/typing/urdu";
import {
  backspace,
  createDrill,
  extend,
  finish,
  nextKeystroke,
  setTyped,
  stats,
  typeable,
  typeText,
} from "./drill";
import { buildLessons } from "./lessons";

const phonetic = keystrokeMap(getLayout("ur-phonetic"));
const standard = keystrokeMap(getLayout("ur-standard"));

describe("drill", () => {
  it("moves word by word and scores whole words", () => {
    let d = createDrill(["سلام", "دنیا"]);
    d = typeText(d, "سلام ", 0);
    expect(d.index).toBe(1);
    d = typeText(d, "دنیا", 60_000);
    expect(d.endedAt).toBe(60_000);
    expect(d.results).toEqual([
      { typed: "سلام", correct: true },
      { typed: "دنیا", correct: true },
    ]);
    // 4 + space + 4 = 9 characters in a minute.
    expect(stats(d, 60_000)).toMatchObject({ netWpm: 2, accuracy: 100, correctWords: 2 });
  });

  it("counts wrong keystrokes and wrong words", () => {
    let d = createDrill(["سلام", "دنیا", "اور"]);
    d = typeText(d, "سلم ", 0); // wrong word: س ل correct, م wrong, space wrong
    d = typeText(d, "دنیا ", 1000);
    const s = stats(d, 1000);
    expect(s).toMatchObject({ correctWords: 1, wrongWords: 1 });
    // 9 keystrokes, 7 right: س ل (2) + د ن ی ا + space (5).
    expect(s.accuracy).toBe(Math.round((100 * 7) / 9));
    expect(d.results[0]).toEqual({ typed: "سلم", correct: false });
  });

  it("ignores a space before any letter and handles Backspace", () => {
    let d = createDrill(["سلام", "دنیا"]);
    d = typeText(d, "  سا", 0);
    expect(d.index).toBe(0);
    d = backspace(d);
    expect(d.typed).toBe("س");
    d = typeText(d, "لام ", 0);
    expect(d.results[0]!.correct).toBe(true);
  });

  it("treats composed and decomposed forms alike", () => {
    let d = createDrill(["آپ", "گاؤں"]);
    d = typeText(d, "آپ ", 0); // alef + madda
    d = typeText(d, "گاؤں", 0); // waw + hamza above
    expect(d.results.every((r) => r.correct)).toBe(true);
    expect(stats(d, 1).accuracy).toBe(100);
  });

  it("syncs with an input's value", () => {
    let d = createDrill(["سلام", "دنیا"]);
    d = setTyped(d, "سل", 0);
    d = setTyped(d, "س", 0);
    expect(d.typed).toBe("س");
    d = setTyped(d, "سلام دن", 0);
    expect(d.index).toBe(1);
    expect(d.typed).toBe("دن");
  });

  it("counts a word cut off by the timer as far as it is right", () => {
    let d = createDrill(["سلام", "دنیا"]);
    d = typeText(d, "سلام دن", 0);
    d = finish(d, 30_000);
    expect(stats(d, 99_999)).toMatchObject({ seconds: 30, correctChars: 7, netWpm: 3 });
    expect(extend(createDrill(["a"]), ["b"]).words).toEqual(["a", "b"]);
  });

  it("names the next key, preferring a single key for composed letters", () => {
    let d = createDrill(["آپ"]);
    expect(nextKeystroke(d, phonetic)).toEqual({ code: "KeyA", shift: true, altgr: false });
    d = typeText(d, "آ", 0);
    expect(nextKeystroke(d, phonetic)).toEqual({ code: "KeyP", shift: false, altgr: false });
    d = typeText(createDrill(["آپ", "x"]), "ب", 0);
    expect(nextKeystroke(d, phonetic)).toBe("backspace");
    d = typeText(createDrill(["آپ", "x"]), "آپ", 0);
    expect(nextKeystroke(d, phonetic)).toBe("space");
  });
});

describe("Urdu practice text", () => {
  it("can be typed on both layouts", () => {
    for (const text of [...URDU_WORDS, ...URDU_PASSAGES]) {
      expect(typeable(text, phonetic), text).toBe(true);
      expect(typeable(text, standard), text).toBe(true);
    }
  });

  it("is NFC with no repeated words", () => {
    for (const text of [...URDU_WORDS, ...URDU_PASSAGES]) expect(text).toBe(text.normalize("NFC"));
    expect(new Set(URDU_WORDS).size).toBe(URDU_WORDS.length);
    expect(URDU_WORDS.length).toBeGreaterThan(200);
  });
});

describe("lessons", () => {
  const frequency = ["اس", "کا", "سال", "دل", "کام", "پر", "ہے", "سے", "آپ", "ڈال", "سلام"];
  const extra = { words: URDU_WORDS, passages: URDU_PASSAGES };

  it("follows the rows of the layout and only uses letters learned so far", () => {
    const layout = getLayout("ur-phonetic");
    const lessons = buildLessons(layout, frequency, extra);
    expect(lessons.map((l) => l.id)).toEqual([
      "home",
      "top",
      "bottom",
      "home-shift",
      "top-shift",
      "bottom-shift",
      "words",
      "sentences",
    ]);
    expect(lessons[0]!.letters).toEqual(["ا", "س", "د", "ف", "گ", "ح", "ج", "ک", "ل"]);
    const home = lessons[0]!.words;
    expect(home.slice(0, 4)).toEqual(["اس", "کا", "سال", "دل"]);
    // Topped up with letter groups made of home-row letters only.
    expect(home.length).toBeGreaterThanOrEqual(24);
    expect(home.every((w) => [...w].every((ch) => lessons[0]!.letters.includes(ch)))).toBe(true);
    // پر needs پ from the top row; سے needs ے (top row) too.
    expect(lessons[1]!.words).toEqual(expect.arrayContaining(["پر", "ہے", "سے"]));
    expect(lessons[2]!.words).toContain("کام");
    expect(lessons[3]!.letters).toContain("آ");
    expect(lessons[3]!.words).toContain("آپ");
  });

  it("works for the standard layout too", () => {
    const lessons = buildLessons(getLayout("ur-standard"), frequency, extra);
    expect(lessons[0]!.letters).toEqual(["م", "و", "ر", "ن", "ل", "ہ", "ا", "ک", "ی"]);
    const typing = keystrokeMap(getLayout("ur-standard"));
    for (const lesson of lessons)
      for (const w of lesson.words) expect(typeable(w, typing), w).toBe(true);
  });
});

describe("Latin-script typing pages", () => {
  it("cover every Latin-script language with a word list", () => {
    const slugs = TYPING_LANGUAGES.map((l) => l.slug);
    expect(slugs).toEqual(expect.arrayContaining(["spanish", "french", "italian"]));
    for (const l of TYPING_LANGUAGES) expect(TYPING_COPY[l.code], l.code).toBeDefined();
  });

  it.each(TYPING_LANGUAGES.map((l) => [l.code, l] as const))(
    "%s: enough text, typeable on every layout",
    async (_, l) => {
      const text = await practiceText(l);
      expect(text.passages.length).toBeGreaterThanOrEqual(50);
      expect(text.words.length).toBe(200);
      expect(new Set(text.ids).size).toBe(text.ids.length);
      const layouts = typingLayouts(l);
      expect(layouts.length).toBeGreaterThan(0);
      for (const layout of layouts) {
        const id = layout.id;
        const keys = keystrokeMap(layout);
        const dead = deadStrokeMap(layout, keys);
        for (const t of [...text.words, ...text.passages])
          expect(typeable(t, keys, dead), `${id}: ${t}`).toBe(true);
        // Every lesson word types on its layout, the accented letters included.
        for (const lesson of buildLessons(layout, text.frequency, text))
          for (const w of lesson.words) expect(typeable(w, keys, dead), `${id}: ${w}`).toBe(true);
      }
    },
  );

  it("teach the accented letters, and hint dead keys one press at a time", async () => {
    const spain = getLayout("es-spain");
    const es = TYPING_LANGUAGES.find((l) => l.code === "es")!;
    const lessons = buildLessons(spain, (await practiceText(es)).frequency, {
      words: [],
      passages: [],
    });
    const accents = lessons.find((x) => x.id === "accents")!;
    expect(accents.letters).toEqual(expect.arrayContaining(["á", "é", "í", "ó", "ú"]));
    expect(lessons.find((x) => x.id === "home")!.letters).toContain("ñ");

    const keys = keystrokeMap(spain);
    const dead = deadStrokeMap(spain, keys);
    const d = createDrill(["está"]);
    const typed = setTyped(d, "est", 0);
    // á on Spain's layout: the ´ key (Quote), then A.
    expect(nextKeystroke(typed, keys, dead)).toEqual({ code: "Quote", shift: false, altgr: false });
    expect(nextKeystroke(typed, keys, dead, "´")).toEqual({
      code: "KeyA",
      shift: false,
      altgr: false,
    });
  });
});
