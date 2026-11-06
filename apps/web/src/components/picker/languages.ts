import type { LanguageFile, Region } from "@okb/layouts";

/**
 * What the language picker and the home page need to know about a language (plan item 7.4).
 * Kept small: every page carries this list for the picker in its header.
 */
export interface PickerLanguage {
  slug: string;
  lang: string;
  dir: "ltr" | "rtl";
  script: string;
  region: Region;
  en: string;
  native: string;
  aliases: readonly string[];
}

export function pickerLanguage(l: LanguageFile): PickerLanguage {
  return {
    slug: l.slug,
    lang: l.lang,
    dir: l.dir,
    script: l.script,
    region: l.region,
    en: l.name.en,
    native: l.name.native,
    aliases: l.aliases,
  };
}

/** Script names for browsing, by ISO 15924 code. */
export const SCRIPT_NAMES: Readonly<Record<string, string>> = {
  Cyrl: "Cyrillic",
  Grek: "Greek",
  Hebr: "Hebrew",
  Armn: "Armenian",
  Ethi: "Ethiopic",
  Tibt: "Tibetan",
  Syrc: "Syriac",
  Cher: "Cherokee",
  Cans: "Canadian syllabics",
  Olck: "Ol Chiki",
  Geor: "Georgian",
  Thai: "Thai",
  Laoo: "Lao",
  Khmr: "Khmer",
  Mymr: "Myanmar",
  Hang: "Hangul",
  Jpan: "Japanese",
  Hans: "Chinese (Simplified)",
  Hant: "Chinese (Traditional)",
  Arab: "Arabic script",
  Deva: "Devanagari",
  Beng: "Bengali script",
  Guru: "Gurmukhi",
  Gujr: "Gujarati script",
  Taml: "Tamil script",
  Telu: "Telugu script",
  Knda: "Kannada script",
  Mlym: "Malayalam script",
  Orya: "Odia script",
  Sinh: "Sinhala script",
  Thaa: "Thaana",
  Latn: "Latin alphabet",
};

/** Lower case without accents or Arabic vowel marks, so "farsí" finds Farsi and "اُردو" finds اردو. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").trim();
}

/**
 * Languages matching a search, best first: a name that starts with the query, then a word in
 * a name that does (so "shah" finds Punjabi (Shahmukhi)), then a name that contains it.
 */
export function searchLanguages(list: readonly PickerLanguage[], query: string): PickerLanguage[] {
  const q = fold(query);
  if (!q) return [...list];
  const scored: [PickerLanguage, number][] = [];
  for (const l of list) {
    const names = [l.en, l.native, ...l.aliases, l.slug].map(fold);
    let best = Infinity;
    for (const name of names) {
      if (name.startsWith(q)) best = Math.min(best, 0);
      else if (name.split(/[\s()-]+/).some((w) => w.startsWith(q))) best = Math.min(best, 1);
      else if (name.includes(q)) best = Math.min(best, 2);
    }
    if (best < Infinity) scored.push([l, best]);
  }
  return scored.sort((a, b) => a[1] - b[1]).map(([l]) => l);
}

/**
 * Languages to suggest from the browser's languages (`navigator.languages`). A tag matches
 * when its language and likely script agree, so pa-IN (Gurmukhi) does not suggest Shahmukhi.
 */
export function suggestLanguages(
  list: readonly PickerLanguage[],
  tags: readonly string[],
): PickerLanguage[] {
  const out: PickerLanguage[] = [];
  for (const tag of tags) {
    let wanted: Intl.Locale;
    try {
      wanted = new Intl.Locale(tag).maximize();
    } catch {
      continue;
    }
    for (const l of list) {
      const ours = new Intl.Locale(l.lang).maximize();
      if (ours.language !== wanted.language) continue;
      if (wanted.script && ours.script && wanted.script !== ours.script) continue;
      if (!out.includes(l)) out.push(l);
    }
  }
  return out;
}

const RECENT_KEY = "likho:recent-languages";
const RECENT_MAX = 5;

/** Slugs of the keyboards opened most recently, newest first. */
export function recentSlugs(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function rememberLanguage(slug: string): void {
  try {
    const next = [slug, ...recentSlugs().filter((s) => s !== slug)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: no recents */
  }
}

export function bySlug(list: readonly PickerLanguage[], slugs: readonly string[]) {
  return slugs.flatMap((s) => list.filter((l) => l.slug === s));
}

/** Languages grouped by a key, groups in the order given. */
export function groupBy<K extends string>(
  list: readonly PickerLanguage[],
  key: (l: PickerLanguage) => K,
  order: readonly K[],
): [K, PickerLanguage[]][] {
  return order
    .map((k) => [k, list.filter((l) => key(l) === k)] as [K, PickerLanguage[]])
    .filter(([, ls]) => ls.length > 0);
}
