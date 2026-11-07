import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_REMOVE,
  removeDiacritics,
  type DiacriticOptions,
  type MarkGroup,
} from "../src/diacritics.ts";

const strip = (text: string, opts: Partial<DiacriticOptions> = {}) =>
  removeDiacritics(text, { remove: DEFAULT_REMOVE, ...opts }).text;
const without = (...groups: MarkGroup[]) =>
  new Set([...DEFAULT_REMOVE].filter((g) => !groups.includes(g)));

describe("Arabic script", () => {
  it("removes harakat, tanween, shadda and sukun", () => {
    expect(strip("مَرْحَبًا بِكُمْ")).toBe("مرحبا بكم");
    expect(strip("مُحَمَّدٌ")).toBe("محمد");
  });

  it("keeps shadda when asked", () => {
    expect(strip("مُحَمَّدٌ", { remove: without("shadda") })).toBe("محمّد");
  });

  it("keeps letters whose hamza or madda is spelling", () => {
    expect(strip("آسمان سُؤال قائِل")).toBe("آسمان سؤال قائل");
    // decomposed alef + madda, waw + hamza
    expect(strip("ا\u{653}مَد و\u{654}").normalize("NFC")).toBe("آمد ؤ");
    // Urdu ۂ and ۓ
    expect(strip("خانۂ دیۓ")).toBe("خانۂ دیۓ");
  });

  it("writes hamza seats as plain alef only on request", () => {
    expect(strip("أَحْمَد إِسْلام آمِن")).toBe("أحمد إسلام آمن");
    expect(strip("أَحْمَد إِسْلام آمِن", { remove: new Set([...DEFAULT_REMOVE, "alef"]) })).toBe(
      "احمد اسلام امن",
    );
  });

  it("removes superscript alef, Quranic signs, alef wasla and tatweel", () => {
    expect(strip("هٰذَا")).toBe("هذا");
    expect(strip("ٱلرَّحْمَٰنِ")).toBe("الرحمن");
    // Quranic spelling keeps the long ā as \u0670; modern spelling writes it as ا.
    expect(strip("ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَۛ فِيهِۛ")).toBe("ذلك الكتب لا ريب فيه");
    expect(strip("ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَۛ فِيهِۛ", { quranSpelling: true })).toBe(
      "ذلك الكتاب لا ريب فيه",
    );
    expect(strip("هَٰذَا عَلَىٰ ٱلرَّحْمَٰنِ ٱلْعَٰلَمِينَ", { quranSpelling: true })).toBe(
      "هذا على الرحمن العالمين",
    );
    expect(strip("كـــتاب")).toBe("كتاب");
    expect(strip("كـــتاب", { remove: without("tatweel") })).toBe("كـــتاب");
  });

  it("counts what it removed", () => {
    const { removed } = removeDiacritics("مُحَمَّدٌ", { remove: DEFAULT_REMOVE });
    expect(removed.vowels).toBe(4); // \u064F \u064E \u064E \u064C
    expect(removed.shadda).toBe(1);
  });

  it("leaves Arabic-script digits and punctuation alone", () => {
    expect(strip("۱۲۳ ٤٥٦، ؟")).toBe("۱۲۳ ٤٥٦، ؟");
  });
});

describe("Hebrew", () => {
  it("removes niqqud, dots and cantillation", () => {
    expect(strip("שָׁלוֹם")).toBe("שלום");
    expect(strip("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים")).toBe("בראשית ברא אלהים");
  });

  it("can keep the shin and sin dots", () => {
    expect(strip("שָׁלוֹם שָׂדֶה", { remove: without("shinDots") })).toBe("ש\u{5c1}לום ש\u{5c2}דה");
  });

  it("can keep niqqud and remove only cantillation", () => {
    expect(strip("בָּרָ֣א", { remove: new Set(["cantillation"]) })).toBe("בָּרָא");
  });

  it("splits presentation forms", () => {
    expect(strip("\u{fb2a}\u{fb31}")).toBe("שב");
  });
});

describe("Latin, Greek and Cyrillic", () => {
  it("removes accents, including letters with strokes", () => {
    expect(strip("Łódź Ørsted Đorđe ñandú Việt Nam çà va")).toBe(
      "Lodz Orsted Dorde nandu Viet Nam ca va",
    );
  });

  it("keeps the letters asked for", () => {
    expect(strip("mañana Ñandú", { keep: "ñÑ" })).toBe("mañana Ñandu");
  });

  it("keeps ß, æ and þ unless plain ASCII is chosen", () => {
    expect(strip("Straße Ærø þing")).toBe("Straße Æro þing");
    expect(strip("Straße Ærø þing ĳs", { latin: "ascii" })).toBe("Strasse AEro thing ijs");
    expect(strip("Ærø", { latin: "ascii" })).toBe("AEro");
  });

  it("follows German and Danish spellings", () => {
    expect(strip("Müller Größe ÄRGER Äpfel GRÜN Ü", { spelling: "de" })).toBe(
      "Mueller Groesse AERGER Aepfel GRUEN UE",
    );
    expect(strip("Ålborg smørrebrød", { spelling: "da" })).toBe("Aalborg smoerrebroed");
  });

  it("removes Greek accents", () => {
    expect(strip("Καλημέρα ἄνθρωπος ϊ")).toBe("Καλημερα ανθρωπος ι");
  });

  it("removes Russian stress marks but keeps й and ё", () => {
    expect(strip("молоко́ за́мок йо́гурт ёлка")).toBe("молоко замок йогурт ёлка");
    expect(strip("ёлка Ёж", { remove: new Set([...DEFAULT_REMOVE, "yo"]) })).toBe("елка Еж");
  });

  it("leaves other scripts untouched", () => {
    const text = "हिन्दी क़लम বাংলা ไทย 中文 한국어";
    expect(strip(text)).toBe(text);
  });

  it("returns text with nothing to remove exactly as given", () => {
    const text = "plain text, ا\u{654} and n\u{303}";
    expect(strip(text, { remove: new Set(["vowels"]) })).toBe(text);
  });
});

describe("ICU's Latin-ASCII and de-ASCII (test/data/latin-icu.tsv)", () => {
  const rows = readFileSync(new URL("data/latin-icu.tsv", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string, string, string]);
  // IPA letters ICU leaves as they are, which plain ASCII spells; and the ordinal signs.
  const OURS_ONLY = /[ɑɐɔɛʃʒºª]/u;

  it("matches Latin-ASCII on every word but the IPA letters it keeps", () => {
    let same = 0;
    const other: string[] = [];
    for (const [, word, icu] of rows) {
      const ours = strip(word, { latin: "ascii" });
      if (ours === icu) same++;
      else if (!OURS_ONLY.test(word)) other.push(`${word}: ${ours} / ${icu}`);
    }
    expect(other).toEqual([]);
    expect(same / rows.length).toBeGreaterThan(0.999);
  });

  it("matches de-ASCII on every German word", () => {
    const de = rows.filter(([lang]) => lang === "de");
    expect(de.length).toBeGreaterThan(300);
    for (const [, word, , icu] of de) {
      expect(strip(word, { latin: "ascii", spelling: "de" })).toBe(icu);
    }
  });

  it("differs from Unicode decomposition alone only on letters with strokes", () => {
    for (const [, word] of rows) {
      const nfd = word
        .normalize("NFD")
        .replace(/\p{Mn}/gu, "")
        .normalize("NFC");
      const ours = strip(word);
      // a letter with a stroke or hook has no decomposition, so the difference is one of those
      const stroked = [...word].filter((c) => c.normalize("NFD") === c && strip(c) !== c);
      if (ours !== nfd) expect(stroked.length, word).toBeGreaterThan(0);
    }
  });
});

/** Rows of test/data/<code>-wiktionary.tsv: a word with its marks, and the entry title. */
function wiktionary(code: string): [string, string][] {
  return readFileSync(new URL(`data/${code}-wiktionary.tsv`, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t") as [string, string]);
}

/** Group each word that doesn't come out as its title by why, with the given kinds. */
function mismatches(
  rows: [string, string][],
  kinds: Record<string, (ours: string, title: string) => boolean>,
  opts: Partial<DiacriticOptions> = {},
) {
  const counts: Record<string, number> = { same: 0, other: 0 };
  const other: string[] = [];
  for (const [form, title] of rows) {
    const ours = strip(form, opts);
    if (ours === title) {
      counts.same!++;
      continue;
    }
    const kind = Object.keys(kinds).find((k) => kinds[k]!(ours, title));
    if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
    else {
      counts.other!++;
      other.push(`${form} → ${ours} (title ${title})`);
    }
  }
  return { counts, other };
}

/** Spaces, joiners, hyphens, maqaf and punctuation, which Wiktionary titles lay out their own way. */
const layout = (s: string) => s.replace(/[\s\p{Cf}\u{34f}\-־'"״!?.,،؟]/gu, "");

describe("Wiktionary: Hebrew (test/data/he-wiktionary.tsv)", () => {
  it("removes every mark; misses differ only by full spelling or layout", () => {
    // Modern spelling without niqqud adds ו and י as vowel letters (אֱלֹהִים → אלוהים), and
    // א for a in foreign words (פְּרָג → פראג).
    const vowelLetters = (s: string) => s.replace(/[ויא]/g, "");
    const { counts, other } = mismatches(wiktionary("he"), {
      fullSpelling: (o, t) => vowelLetters(o) === vowelLetters(t),
      layout: (o, t) => vowelLetters(layout(o)) === vowelLetters(layout(t)),
      // the headword has the article: הַכְּנֶסֶת for the entry כנסת
      article: (o, t) =>
        o.startsWith("ה") && vowelLetters(layout(o.slice(1))) === vowelLetters(layout(t)),
    });
    // Titles that are another word or phrase (תשריט for תסריט, a proverb's full form).
    expect(other.length).toBeLessThanOrEqual(5);
    // Measured 2026-11-07: 4,047 of 5,000 equal the title; the rest differ by vowel letters,
    // layout or the article.
    expect(counts.same).toBeGreaterThan(4000);
  });
});

describe("Wiktionary: Urdu (test/data/ur-wiktionary.tsv)", () => {
  const letters = (s: string) =>
    layout(s).replace(/ك/g, "ک").replace(/[يى]/g, "ی").replace(/ه/g, "ہ").replace(/ۂ/g, "ہ");
  it("removes every mark; misses are the titles' letter forms, layout or spelling", () => {
    const { counts, other } = mismatches(wiktionary("ur"), {
      // Arabic ك ي ه in a title, or ۂ written ہ
      letters: (o, t) => letters(o) === letters(t),
    });
    // Titles spelled differently from their own headword (typos, another form of the word).
    expect(other.length).toBeLessThanOrEqual(20);
    // Measured 2026-11-07: 4,968 of 5,000 equal the title.
    expect(counts.same).toBeGreaterThan(4950);
  });
});

describe("Wiktionary: Persian (test/data/fa-wiktionary.tsv)", () => {
  const letters = (s: string) => layout(s).replace(/ك/g, "ک").replace(/[يى]/g, "ی");
  it("removes every mark and the ezafe; misses are the forms' missing ZWNJ or letter forms", () => {
    const { counts, other } = mismatches(wiktionary("fa"), {
      // Wiktionary writes the vowelled form without the ZWNJ its title has (آهسته\u200Cتر)
      layout: (o, t) => letters(o) === letters(t),
    });
    // A title that is another spelling of the word (خلنج for خلنگ, کوریا for کره).
    expect(other.length).toBeLessThanOrEqual(10);
    // Measured 2026-11-07: 681 of 731 equal the title.
    expect(counts.same).toBeGreaterThan(670);
  });

  it("removes the ezafe from heh, but keeps Urdu's ۂ", () => {
    expect(strip("خانهٔ خدا")).toBe("خانه خدا");
    expect(strip("خانۀ خدا")).toBe("خانه خدا");
    expect(strip("خانۂ خدا")).toBe("خانۂ خدا");
    expect(strip("خانهٔ خدا", { remove: without("ezafe") })).toBe("خانهٔ خدا");
  });
});

describe("Wiktionary: Arabic (test/data/ar-wiktionary.tsv)", () => {
  it("removes every mark; misses are layout or another form of the word", () => {
    const { counts, other } = mismatches(wiktionary("ar"), {
      // punctuation and the space after و that titles drop (أهلا وسهلا)
      layout: (o, t) => layout(o) === layout(t),
    });
    // Titles that are an inflected form of the headword (يأمر for أَمَرَ) or drop the article.
    expect(other.length).toBeLessThanOrEqual(25);
    // Measured 2026-11-07: 4,975 of 5,000 equal the title.
    expect(counts.same).toBeGreaterThan(4950);
  });
});

describe("Wiktionary: Russian (test/data/ru-wiktionary.tsv)", () => {
  it("removes every stress mark; misses are layout or part of a longer title", () => {
    const clean = (s: string) => layout(s).replace(/[\u{301}\u{300}^*’]/gu, "");
    const { counts, other } = mismatches(wiktionary("ru"), {
      // a stray stress mark after a space, a space before a hyphen or !, ’ for '
      layout: (o, t) => clean(o) === clean(t),
      // one half of a proverb, whose title is the whole
      part: (o, t) => t.includes(o.replace(/[!?.]/g, "").trim()),
    });
    expect(other.length).toBeLessThanOrEqual(10);
    // Measured 2026-11-07: 3,942 of 3,999 equal the title.
    expect(counts.same).toBeGreaterThan(3900);
  });
});
