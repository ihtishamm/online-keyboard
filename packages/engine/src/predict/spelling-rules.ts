import { ROWS, type KeyCode } from "../layout/keycodes";
import { phoneLayout } from "../layout/phone";
import type { Layout } from "../layout/schema";
import { WORD_NORMALIZERS } from "../text/normalize";
import { URDU_SPELLING, type SpellingRules } from "./spell";

/**
 * Spelling rules for every language with a word list (plan item 6.6). Sound-alike groups and
 * weak letters are written per language; keyboard slips come from the layouts themselves
 * (`keyboardNeighbours`), desktop and phone rows both.
 */

/** A letter typed for its neighbour: pairs of letters on adjacent keys of any row. */
export function keyboardNeighbours(layouts: readonly Layout[]): string[] {
  const pairs = new Set<string>();
  const add = (row: readonly KeyCode[], layout: Layout) => {
    for (let i = 0; i + 1 < row.length; i++) {
      for (const layer of ["n", "s"] as const) {
        const a = layout.keys[row[i]!]?.[layer];
        const b = layout.keys[row[i + 1]!]?.[layer];
        if (a && b && a !== b && [...a].length === 1 && [...b].length === 1) {
          if (/\p{L}|\p{M}/u.test(a) && /\p{L}|\p{M}/u.test(b)) pairs.add(a + b);
        }
      }
    }
  };
  for (const layout of layouts) {
    if (layout.translit) continue;
    for (const row of ROWS) add(row, layout);
    for (const row of phoneLayout(layout).rows) add(row, layout);
  }
  return [...pairs];
}

type Base = Omit<SpellingRules, "key">;

/**
 * Arabic written without hamza on the alef (اكبر for أكبر) or with ه / ي for a final ة / ى is
 * everyday usage, not a mistake: accept a word when its standard spelling is known.
 */
function arabicVariants(key: string): string[] {
  const out: string[] = [];
  const m = /^(ال|[وفبلك]|وال|بال|فال|لل)?ا(.*)$/u.exec(key);
  if (m) for (const alef of "أإآ") out.push(`${m[1] ?? ""}${alef}${m[2]}`);
  if (key.endsWith("ه")) out.push(key.slice(0, -1) + "ة");
  if (key.endsWith("ي")) out.push(key.slice(0, -1) + "ى");
  if (key.endsWith("ى")) out.push(key.slice(0, -1) + "ي");
  return out;
}

const URDU_BASE: Base = { ...URDU_SPELLING };

const BASES: Readonly<Record<string, Base>> = {
  ur: URDU_BASE,
  ar: {
    homophones: ["سصث", "زذظض", "تط", "هحة", "اأإآع", "يىئ", "كق", "ءأؤئإ", "ته"],
    nearMisses: ["دذ", "ضص", "طظ", "حخج", "عغ", "بتث", "ىي"],
    weak: "اويهع",
    optional: "ء",
    nonJoining: "اأإآدذرزوؤةء",
    variants: arabicVariants,
  },
  fa: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "قغ", "یئ"],
    nearMisses: ["بپ", "جچ", "زژ", "کگ", "خح"],
    weak: "اویهع",
    optional: "ءئ",
    nonJoining: "اآدذرزژوؤء",
  },
  ps: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "یيېۍ", "ښشخ", "ږژ", "ټت", "ډد", "ړر", "ڼن"],
    nearMisses: ["بپ", "جچ", "کګ", "څس", "ځز"],
    weak: "اویيهع",
    optional: "ءئ",
    nonJoining: "اآدډذرړزژږوؤء",
  },
  sd: {
    homophones: ["سصث", "زذضظ", "تط", "هح", "اعآ", "يئ", "ڪق"],
    nearMisses: ["بٻ", "جڄ", "گڳ", "دڏڊ", "نڻ", "رڙ", "ٽٺ", "تٿ", "ڪک"],
    weak: "اويهع",
    optional: "ءئ",
    nonJoining: "اآدذڊڌڏڍرڙزژو",
  },
  pnb: { ...URDU_BASE, nearMisses: [...URDU_BASE.nearMisses, "نݨ", "لڵ"], variants: undefined },
  skr: {
    ...URDU_BASE,
    nearMisses: [...URDU_BASE.nearMisses, "بٻ", "جڄ", "دݙ", "گڳ", "نݨ"],
    variants: undefined,
  },
  ks: { ...URDU_BASE, variants: undefined },
  hi: {
    script: "Devanagari",
    homophones: [
      "\u093F\u0940",
      "\u0941\u0942",
      "इई",
      "उऊ",
      "\u0902\u0901",
      "शषस",
      "नण",
      "बव",
      "\u0947\u0948",
      "\u094B\u094C",
    ],
    nearMisses: ["टत", "डद", "ढध", "ठथ", "कख", "गघ", "चछ", "जझ", "पफ", "बभ", "\u0902न"],
    weak: "\u094Dािीुूेैोौंँ़",
    optional: "\u093Cँ",
    nonJoining: "",
  },
  bn: {
    script: "Bengali",
    homophones: [
      "\u09BF\u09C0",
      "\u09C1\u09C2",
      "ইঈ",
      "উঊ",
      "শষস",
      "নণ",
      "জয",
      "\u0982ঙ",
      "ড\u09BCর",
    ],
    nearMisses: ["টত", "ডদ", "ঢধ", "ঠথ", "কখ", "গঘ", "চছ", "জঝ", "পফ", "বভ"],
    weak: "\u09CDািীুূেৈোৌংঁ",
    optional: "\u0981\u09BC",
    nonJoining: "",
  },
};

/** Languages the spell checker has rules for (data codes). */
export const SPELLING_LANGUAGES: readonly string[] = Object.keys(BASES);

/** The spelling rules of a language, with keyboard slips from its layouts. */
export function spellingRules(code: string, layouts: readonly Layout[] = []): SpellingRules | null {
  const base = BASES[code];
  const normalize = WORD_NORMALIZERS[code];
  if (!base || !normalize) return null;
  const key =
    code === "ur" ? URDU_SPELLING.key : (word: string) => normalize(word) ?? word.normalize("NFC");
  return {
    ...base,
    key,
    nearMisses: [...base.nearMisses, ...keyboardNeighbours(layouts)],
  };
}
