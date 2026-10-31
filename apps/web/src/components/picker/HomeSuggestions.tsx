import { useEffect, useState } from "react";
import { bySlug, recentSlugs, suggestLanguages, type PickerLanguage } from "./languages";

/**
 * The home page's "For you" row: recent keyboards, then languages the browser says its user
 * reads (`navigator.languages`). Nothing renders until hydration, and nothing when neither
 * gives a match, so the page never shifts for visitors with no match.
 */
export default function HomeSuggestions({ languages }: { languages: readonly PickerLanguage[] }) {
  const [list, setList] = useState<PickerLanguage[]>([]);
  useEffect(() => {
    const recent = bySlug(languages, recentSlugs());
    const browser = suggestLanguages(languages, navigator.languages ?? [navigator.language]);
    setList([...new Set([...recent, ...browser])].slice(0, 6));
  }, [languages]);

  if (!list.length) return null;
  return (
    <section aria-labelledby="for-you-heading" className="mx-auto mb-8 max-w-3xl">
      <h2 id="for-you-heading" className="mb-3 text-xl font-semibold">
        For you
      </h2>
      <ul className="flex flex-wrap gap-2">
        {list.map((l) => (
          <li key={l.slug}>
            <a
              href={`/${l.slug}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-text no-underline hover:border-accent"
            >
              {l.en}
              <span className="font-script text-accent" lang={l.lang} dir={l.dir}>
                {l.native}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
