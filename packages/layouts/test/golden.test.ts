import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANGUAGES, SCHEME_LIST, allLayouts, languageBundle, type Language } from "../src";

/**
 * Golden snapshot of the language registry (plan item 7.1): every language, layout and
 * scheme, exactly as the site receives them. Moving the registry into data must not change
 * any of it. Refresh deliberately with UPDATE_GOLDEN=1 when a change is intended. Languages
 * added after the move (Phase 7 on) are not in the snapshot: their own tests cover them.
 */
const FILE = new URL("./golden/registry.json", import.meta.url);

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);

const old = ({ slug, code, lang, dir, name, fonts, layouts, sample }: Language) => ({
  slug,
  code,
  lang,
  dir,
  name,
  fonts,
  layouts,
  sample,
});

const golden = JSON.parse(readFileSync(FILE, "utf8")) as { languages: { slug: string }[] };
const SNAPSHOT = new Set(golden.languages.map((l) => l.slug));

describe("registry golden snapshot", () => {
  it("is unchanged", () => {
    const languages = LANGUAGES.filter((l) => SNAPSHOT.has(l.slug));
    const layoutIds = new Set(languages.flatMap((l) => l.layouts));
    const now = JSON.stringify(
      {
        // The fields the site had before the move; fields added since are checked elsewhere.
        languages: languages.map(old),
        // Order only matters to tests: compare by id.
        layouts: allLayouts()
          .filter((l) => layoutIds.has(l.id))
          .sort(byId),
        schemes: [...SCHEME_LIST].sort(byId),
        bundles: languages.map((l) => {
          const bundle = languageBundle(l.slug);
          return { ...bundle, language: old(bundle.language) };
        }),
      },
      null,
      1,
    );
    if (process.env.UPDATE_GOLDEN === "1") writeFileSync(FILE, now + "\n");
    // Compared as data, so reformatting the file changes nothing.
    expect(JSON.parse(now)).toEqual(golden);
  });
});
