import { LANGUAGES, REGIONS } from "@okb/layouts";
import { beforeEach, describe, expect, it } from "vitest";
import {
  SCRIPT_NAMES,
  bySlug,
  groupBy,
  pickerLanguage,
  recentSlugs,
  rememberLanguage,
  searchLanguages,
  suggestLanguages,
} from "./languages";

const LIST = LANGUAGES.map(pickerLanguage);
const slugs = (list: { slug: string }[]) => list.map((l) => l.slug);

describe("language search", () => {
  it.each([
    ["Persian", "farsi"],
    ["farsi", "farsi"],
    ["bengali", "bangla"],
    ["BANGLA", "bangla"],
    ["shah", "shahmukhi"],
    ["punjabi", "shahmukhi"],
    ["pushto", "pashto"],
    ["baluchi", "balochi"],
    ["اردو", "urdu"],
    ["اُردو", "urdu"],
    ["हिन्दी", "hindi"],
  ])("%s finds %s first", (query, slug) => {
    expect(searchLanguages(LIST, query)[0]?.slug).toBe(slug);
  });

  it("ranks names that start with the query before names that contain it", () => {
    // "ar" starts Arabic; it is only inside Farsi's alias Parsi and in Saraiki.
    const found = slugs(searchLanguages(LIST, "ar"));
    expect(found[0]).toBe("arabic");
    expect(found).toContain("saraiki");
  });

  it("returns nothing for a name we do not have", () => {
    expect(searchLanguages(LIST, "klingon")).toEqual([]);
  });

  it("returns every language for an empty query", () => {
    expect(searchLanguages(LIST, "  ")).toHaveLength(LIST.length);
  });
});

describe("suggestions from navigator.languages", () => {
  it("matches by language and script", () => {
    expect(slugs(suggestLanguages(LIST, ["ur-PK", "en-US"]))).toEqual(["urdu"]);
    expect(slugs(suggestLanguages(LIST, ["pa-PK"]))).toEqual(["shahmukhi"]);
    expect(slugs(suggestLanguages(LIST, ["pa-Arab"]))).toEqual(["shahmukhi"]);
    expect(slugs(suggestLanguages(LIST, ["bn-BD", "hi"]))).toEqual(["bangla", "hindi"]);
  });

  it("tells Punjabi in Gurmukhi from Shahmukhi", () => {
    expect(slugs(suggestLanguages(LIST, ["pa-IN"]))).toEqual(["punjabi"]);
    expect(slugs(suggestLanguages(LIST, ["pa"]))).toEqual(["punjabi"]);
    expect(slugs(suggestLanguages(LIST, ["pa-Guru"]))).toEqual(["punjabi"]);
  });

  it("ignores invalid tags", () => {
    // Dari's tag prs is an alias of fa-AF, so a Persian browser is offered both.
    expect(suggestLanguages(LIST, ["not a tag", "fa-IR"]).map((l) => l.slug)).toEqual([
      "farsi",
      "dari",
    ]);
  });
});

describe("recent languages", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the newest first, without repeats, at most five", () => {
    for (const s of ["urdu", "hindi", "urdu", "arabic", "farsi", "pashto", "sindhi"]) {
      rememberLanguage(s);
    }
    expect(recentSlugs()).toEqual(["sindhi", "pashto", "farsi", "arabic", "urdu"]);
    expect(slugs(bySlug(LIST, ["hindi", "gone", "urdu"]))).toEqual(["hindi", "urdu"]);
  });

  it("survives a damaged entry", () => {
    localStorage.setItem("likho:recent-languages", "{oops");
    expect(recentSlugs()).toEqual([]);
  });
});

describe("browsing", () => {
  it("every language has a script name and a region, so none is left out", () => {
    for (const l of LIST) {
      expect(SCRIPT_NAMES[l.script], l.slug).toBeTruthy();
      expect(REGIONS[l.region], l.slug).toBeTruthy();
    }
    const groups = groupBy(LIST, (l) => l.region, Object.keys(REGIONS) as (keyof typeof REGIONS)[]);
    expect(groups.flatMap(([, list]) => list)).toHaveLength(LIST.length);
  });
});
