import { describe, expect, it } from "vitest";
import { compileScheme, desktopCharacters, parseOutputs, Transliterator } from "@okb/engine";
import { getLayout, LANGUAGES, SCHEME_LIST } from "../src";

describe("transliteration schemes", () => {
  // Chinese and Japanese convert through readings (engine test/phrase.test.ts), not rules.
  for (const scheme of SCHEME_LIST.filter((s) => !s.converter)) {
    describe(scheme.id, () => {
      const language = LANGUAGES.find((l) => l.lang === scheme.lang);

      it("compile, and belong to a language on the site", () => {
        expect(() => compileScheme(scheme)).not.toThrow();
        expect(language, `no language with lang ${scheme.lang}`).toBeDefined();
      });

      it("write only characters the language's own layouts type", () => {
        const typeable = new Set<string>([" "]);
        for (const id of language!.layouts) {
          for (const out of desktopCharacters(getLayout(id))) for (const c of out) typeable.add(c);
        }
        const outputs = [
          ...scheme.rules.flatMap((r) => parseOutputs(r.out).map((o) => o.text)),
          ...parseOutputs(scheme.omitted).map((o) => o.text),
          ...Object.values(scheme.capitals),
          ...scheme.words.flatMap(([, script]) => script.split(/\s+/)),
          ...Object.values(scheme.punctuation),
        ];
        const missing = new Set<string>();
        for (const text of outputs) for (const c of text) if (!typeable.has(c)) missing.add(c);
        expect([...missing].map((c) => `${c} U+${c.codePointAt(0)!.toString(16)}`)).toEqual([]);
      });

      it("convert a word without a dictionary", () => {
        const t = new Transliterator(scheme);
        expect(t.best("salam")).not.toBe("salam");
      });
    });
  }
});
