/**
 * Page copy for each language: the `languages` content collection (src/content/languages/),
 * with the Roman layouts' copy from roman.ts merged in.
 */
import { getLanguage } from "@okb/layouts";
import { getEntry } from "astro:content";
import { ROMAN } from "./roman";

export interface LayoutCopy {
  /** Short description shown above the layout chart. */
  summary: string;
  /** Who this layout suits. */
  bestFor: string;
  /** Page title, heading and meta description when the defaults do not fit the search. */
  title?: string;
  heading?: string;
  description?: string;
}

export interface LanguageCopy {
  title: string;
  description: string;
  heading: string;
  headingNative: string;
  intro: string;
  layouts: Record<string, LayoutCopy>;
  tips: string[];
  faqs: { q: string; a: string }[];
}

export async function copyFor(slug: string): Promise<LanguageCopy> {
  const entry = await getEntry("languages", slug);
  if (!entry) throw new Error(`No page copy for "${slug}" (src/content/languages/${slug}.md)`);
  const copy = entry.data;
  // Roman layouts keep their copy with their spelling guide (roman.ts).
  const roman = Object.fromEntries(
    getLanguage(slug).layouts.flatMap((id) => (ROMAN[id] ? [[id, ROMAN[id].page]] : [])),
  );
  const romanId = getLanguage(slug).layouts.find((id) => ROMAN[id]);
  const tips =
    romanId && !copy.tips.some((t) => t.includes("Roman layout"))
      ? [
          ...copy.tips.slice(0, 1),
          `On the Roman layout, type words in English letters (${ROMAN[romanId]!.example[0]}) and press Space. Press 1 to 6 to pick another spelling, or Esc to keep a word in English.`,
          ...copy.tips.slice(1),
        ]
      : copy.tips;
  return { ...copy, tips, layouts: { ...roman, ...copy.layouts } };
}
