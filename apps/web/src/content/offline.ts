import { getLayout, layoutSlug, type Language, isRomanLayout } from "@okb/layouts";
import { getCollection } from "astro:content";
import { allSheets, sheetPath } from "../components/cheatsheet/sheets";
import { TYPING_LANGUAGES } from "./typing/practice";

/**
 * What "Save for offline" stores for a language (plan Phase 9, scaling work): its pages and
 * the data they load on demand. The service worker adds each page's scripts and styles.
 */
export interface OfflineManifest {
  slug: string;
  pages: string[];
  files: string[];
}

/** Word lists and Roman chat spellings, as hashed asset URLs (the same files the pages fetch). */
const DICTS = import.meta.glob<string>("../../../../packages/dictionaries/data/*/dict.txt", {
  query: "?url",
  import: "default",
  eager: true,
});
const CHAT = import.meta.glob<string>("../../../../packages/dictionaries/data/*/chat.tsv", {
  query: "?url",
  import: "default",
  eager: true,
});
const byCode = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split("/").at(-2)!, url]));
const DICT = byCode(DICTS);
const CHATS = byCode(CHAT);

export async function offlineManifest(language: Language): Promise<OfflineManifest> {
  const { slug, code } = language;
  const typing = slug === "urdu" || TYPING_LANGUAGES.some((l) => l.slug === slug);
  const guides = await getCollection("guides", (g) => g.data.language === slug);
  const pages = [
    `/${slug}`,
    ...language.layouts.slice(1).map((id) => `/${slug}/${layoutSlug(id)}`),
    ...(language.layouts.some((id) => isRomanLayout(getLayout(id))) ? [`/${slug}/to-roman`] : []),
    ...(typing ? ["tutor", "test", "games"].map((p) => `/${slug}-typing-${p}`) : []),
    ...guides.map((g) => `/guides/${g.id}`).sort(),
    ...allSheets()
      .filter((s) => s.language.slug === slug)
      .map((s) => sheetPath(s.id)),
  ];
  // Small files are inlined into the scripts as data: URLs and need no download.
  const files = [DICT[code], CHATS[code], typing ? `/typing/data/${slug}.json` : undefined].filter(
    (f): f is string => !!f?.startsWith("/"),
  );
  return { slug, pages, files };
}
