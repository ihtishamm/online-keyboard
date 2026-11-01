import { describe, expect, it } from "vitest";
import {
  AccentRestorer,
  foldLatin,
  latinWordBefore,
  matchCase,
  normalizeLatin,
  previousLatinWord,
  stripAccents,
} from "../src";

describe("Latin words", () => {
  it("normalises words for the word list", () => {
    expect(normalizeLatin("Canción")).toBe("Canción");
    expect(normalizeLatin("cancé")).toBe("cancé");
    expect(normalizeLatin("col·lecció")).toBe("col·lecció");
    expect(normalizeLatin("peut-être")).toBe("peut-être");
    expect(normalizeLatin("-word-")).toBe("word");
    expect(normalizeLatin("l'homme")).toBeNull();
    expect(normalizeLatin("abc1")).toBeNull();
    expect(normalizeLatin("пример")).toBeNull();
  });

  it("folds case by the language's rules", () => {
    expect(foldLatin("İstanbul", "tr")).toBe("istanbul");
    expect(foldLatin("IRMAK", "tr")).toBe("ırmak");
    expect(foldLatin("IRMAK", "en")).toBe("irmak");
    expect(foldLatin("Haus", "de")).toBe("haus");
  });

  it("strips accents the way plain keyboards type", () => {
    expect(stripAccents("canción")).toBe("cancion");
    expect(stripAccents("łódź")).toBe("lodz");
    expect(stripAccents("kız")).toBe("kiz");
    expect(stripAccents("straße")).toBe("strasse");
    expect(stripAccents("cœur")).toBe("coeur");
    expect(stripAccents("ñandú")).toBe("nandu");
  });

  it("takes the case the user typed", () => {
    expect(matchCase("cancion", "canción", "es")).toBe("canción");
    expect(matchCase("Cancion", "canción", "es")).toBe("Canción");
    expect(matchCase("CANCION", "canción", "es")).toBe("CANCIÓN");
    expect(matchCase("haus", "Haus", "de")).toBe("Haus");
    expect(matchCase("Istanbul", "istanbul", "tr")).toBe("İstanbul");
    expect(matchCase("A", "à", "it")).toBe("À");
  });

  it("finds the word before the caret", () => {
    expect(latinWordBefore("hola canci", 10)).toEqual({ start: 5, end: 10, word: "canci" });
    expect(latinWordBefore("c'est peut-ê", 12)?.word).toBe("peut-ê");
    expect(latinWordBefore("l'hom", 5)?.word).toBe("hom");
    expect(latinWordBefore("word-", 5)).toBeNull();
    expect(latinWordBefore("abc", 2)).toBeNull();
    expect(latinWordBefore("12 ", 3)).toBeNull();
  });

  it("reads the previous word for next-word suggestions", () => {
    expect(previousLatinWord("Buenos ", 7, "es")).toBe("buenos");
    expect(previousLatinWord("Fin. ", 5, "es")).toBeNull();
    expect(previousLatinWord("", 0, "es")).toBeNull();
    expect(previousLatinWord("hola", 4, "es")).toBeUndefined();
    expect(previousLatinWord("año 2024 ", 9, "es")).toBeUndefined();
  });
});

describe("smart accents", () => {
  // Most frequent first. "cancion" sits far down: a typo in the corpus, not a word.
  const words = ["de", "como", "está", "esta", "cómo", "canción", "Perú", "e", "è", "más", "mas"];
  const filler = Array.from(
    { length: 2000 },
    (_, i) => `palabra${String.fromCharCode(97 + (i % 26))}x${i}`,
  );
  const r = new AccentRestorer([...words, ...filler, "cancion"], "es");

  it("adds accents when the word list is sure", () => {
    expect(r.restore("cancion")).toEqual({ auto: "canción", options: ["canción"] });
    expect(r.restore("Cancion").auto).toBe("Canción");
    expect(r.restore("peru").auto).toBe("Perú");
  });

  it("never changes a word whose plain spelling is a word too", () => {
    expect(r.restore("esta")).toEqual({ auto: null, options: ["está"] });
    expect(r.restore("como")).toEqual({ auto: null, options: ["cómo"] });
    expect(r.restore("mas")).toEqual({ auto: null, options: ["más"] });
  });

  it("leaves words alone that need no accents, or were typed with them", () => {
    expect(r.restore("de")).toEqual({ auto: null, options: [] });
    expect(r.restore("canción")).toEqual({ auto: null, options: [] });
    expect(r.restore("xyz")).toEqual({ auto: null, options: [] });
  });

  it("offers competing accented spellings instead of choosing", () => {
    const it2 = new AccentRestorer(["perché", "là", "la", "città", "pero", "però", "peró"], "it");
    expect(it2.restore("citta").auto).toBe("città");
    // però and peró are about as common: both go to the bar.
    const close = new AccentRestorer(["x", "però", "peró"], "it");
    expect(close.restore("pero")).toEqual({ auto: null, options: ["però", "peró"] });
  });

  it("gives words the list lacks the accents of their ending", () => {
    const cion = ["nación", "canción", "acción", "función", "edición", "elección", "relación"];
    const more = ["población", "situación", "unión", "región", "camion", "anion", "ion"];
    const e = new AccentRestorer([...cion, ...more], "es");
    // Nine words end in -cion, all written -ción.
    expect(e.restore("rustificacion").auto).toBe("rustificación");
    expect(e.restore("Autorrotacion").auto).toBe("Autorrotación");
    // -ion alone is split (unión, camion, anion...): no change.
    expect(e.restore("xyzion")).toEqual({ auto: null, options: [] });
  });

  it("restores hyphenated words part by part", () => {
    const h = new AccentRestorer(["enseñanza", "aprendizaje", "teórico"], "es");
    expect(h.restore("ensenanza-aprendizaje").auto).toBe("enseñanza-aprendizaje");
    expect(h.restore("teorico-practico").auto).toBe("teórico-practico");
  });

  it("restores compounds part by part in languages that build words", () => {
    const de = new AccentRestorer(
      ["Gefäß", "Wänden", "Übergang", "Form", "schon", "schön", "Zeit"],
      "de",
    );
    expect(de.restore("Gefasswanden").auto).toBe("Gefäßwänden");
    // A joining s: Übergang + s + Form.
    expect(de.restore("Ubergangsform").auto).toBe("Übergangsform");
    // A part with two spellings (schon, schön) leaves the word alone.
    expect(de.restore("schonzeit").auto).toBeNull();
    // Spanish does not build words that way: no splitting.
    const es = new AccentRestorer(["están", "cielo"], "es");
    expect(es.restore("estancielo").auto).toBeNull();
  });

  it("gives a known word its ending's accents, where the ending rules are sure", () => {
    const ending = ["házának", "kertjének", "nevének", "ának", "fának", "lábának", "várának"];
    const hu = new AccentRestorer(["tárgyalás", ...ending, "szépének", "útjának"], "hu");
    expect(hu.restore("targyalasanak").auto).toBe("tárgyalásának");
  });

  it("knows rarer words from the dictionary's accents section, at their own ranks", () => {
    const base = ["de", ...Array.from({ length: 50 }, (_, i) => `w${i}`)];
    const r2 = new AccentRestorer(base, "es", [
      { word: "regían", rank: 60_000 },
      { word: "pulgon", rank: 90_000 },
      { word: "pulgón", rank: 61_000 },
    ]);
    expect(r2.restore("regian").auto).toBe("regían");
    // pulgon is in the list as written, but 30,000 places rarer: still no change unasked.
    expect(r2.restore("pulgon")).toEqual({ auto: null, options: ["pulgón"] });
  });
});

describe("compact dictionaries with Latin words", () => {
  it("round-trip words with ASCII letters and accents", async () => {
    const { decodeDictionary, encodeDictionary } = await import("../src");
    const words = ["de", "la", "Haus", "canción", "col·lecció", "peut-être", "A"];
    const decoded = decodeDictionary(encodeDictionary(words, "^\t0 1"));
    expect(new Set(decoded.words)).toEqual(new Set(words));
    expect(() => encodeDictionary(["two words"], "")).toThrow(/space/);
  });

  it("keep an accents section with approximate ranks", async () => {
    const { decodeDictionary, encodeDictionary, rankBand } = await import("../src");
    const accents = [
      { word: "regían", rank: 41_000 },
      { word: "pulgón", rank: 75_000 },
      { word: "Mulhacén", rank: 99_000 },
    ];
    const decoded = decodeDictionary(encodeDictionary(["de", "la"], "^\t0 1", accents));
    expect(decoded.words).toEqual(["de", "la"]);
    expect(decoded.next).toBe("^\t0 1");
    expect(decoded.accents.map((a) => a.word)).toEqual(["regían", "pulgón", "Mulhacén"]);
    for (const [i, a] of decoded.accents.entries())
      expect(rankBand(a.rank)).toBe(rankBand(accents[i]!.rank));
    expect(decodeDictionary(encodeDictionary(["de"], "")).accents).toEqual([]);
  });
});
