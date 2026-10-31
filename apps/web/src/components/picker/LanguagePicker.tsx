import { Globe, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { bySlug, groupBy, recentSlugs, searchLanguages, type PickerLanguage } from "./languages";

export interface LanguagePickerProps {
  languages: readonly PickerLanguage[];
  /** Regions in display order, with their names. */
  regions: readonly (readonly [string, string])[];
  /** The page's language, marked as current in the list. */
  current?: string;
}

/**
 * The header's language picker: search by English or native name or alias, recent languages
 * first, the rest by region. A full-screen sheet on phones. Before hydration the button is a
 * link to the home page's list, so it works without JavaScript too.
 */
export default function LanguagePicker({ languages, regions, current }: LanguagePickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<PickerLanguage[]>([]);
  const titleId = useId();
  const listId = useId();

  const open = () => {
    setQuery("");
    setRecent(bySlug(languages, recentSlugs()));
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();

  // A tap on the backdrop (the dialog element itself, outside its panel) closes it.
  useEffect(() => {
    const d = dialogRef.current;
    const onClick = (e: MouseEvent) => e.target === d && d?.close();
    d?.addEventListener("click", onClick);
    return () => d?.removeEventListener("click", onClick);
  }, []);

  const results = useMemo(() => searchLanguages(languages, query), [languages, query]);
  const regionOrder = regions.map(([key]) => key);
  const regionName = Object.fromEntries(regions);

  /** Enter opens the first match; arrow keys move between results. */
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const links = [
      ...(dialogRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-language]") ?? []),
    ];
    if (e.key === "Enter" && e.target === inputRef.current && links[0]) {
      e.preventDefault();
      links[0].click();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = e.key === "ArrowDown" ? at + 1 : at - 1;
      if (next < 0) inputRef.current?.focus();
      else links[Math.min(next, links.length - 1)]?.focus();
    }
  };

  const item = (l: PickerLanguage) => (
    <li key={l.slug}>
      <a
        href={`/${l.slug}`}
        data-language={l.slug}
        aria-current={l.slug === current ? "page" : undefined}
        className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 text-text no-underline hover:bg-surface-2 focus:bg-surface-2 aria-[current=page]:font-semibold"
      >
        <span>
          {l.en}
          {query && l.aliases.length > 0 && (
            <span className="ms-2 text-sm text-muted">{l.aliases.join(", ")}</span>
          )}
        </span>
        <span className="font-script text-lg text-accent" lang={l.lang} dir={l.dir}>
          {l.native}
        </span>
      </a>
    </li>
  );

  const section = (key: string, title: string, list: PickerLanguage[]) => (
    <section key={key} aria-label={title} className="flex flex-col gap-1">
      <h3 className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted uppercase">
        {title}
      </h3>
      <ul className="flex flex-col">{list.map(item)}</ul>
    </section>
  );

  return (
    <>
      <a
        href="/#all-languages"
        onClick={(e) => {
          e.preventDefault();
          open();
        }}
        aria-haspopup="dialog"
        title="Languages"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-text no-underline hover:bg-surface-2 max-sm:size-11 max-sm:justify-center max-sm:px-0"
      >
        <Globe size={18} aria-hidden />
        <span className="max-sm:sr-only">Languages</span>
      </a>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="m-auto max-h-[85dvh] w-full max-w-lg rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/40 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:border-0"
      >
        <div className="flex h-full max-h-[inherit] flex-col">
          <div className="flex items-center gap-2 border-b border-border p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <h2 id={titleId} className="sr-only">
              Choose a language
            </h2>
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 focus-within:border-accent">
              <Search size={18} aria-hidden className="text-muted" />
              <span className="sr-only">Search languages</span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search languages, e.g. Persian"
                autoComplete="off"
                spellCheck={false}
                aria-controls={listId}
                className="h-11 w-full bg-transparent text-base focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div
            id={listId}
            className="flex-1 overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            {query ? (
              results.length ? (
                <ul aria-label="Matching languages" className="flex flex-col">
                  {results.map(item)}
                </ul>
              ) : (
                <p className="px-3 py-6 text-center text-muted">No language matches “{query}”.</p>
              )
            ) : (
              <>
                {recent.length > 0 && section("recent", "Recent", recent)}
                {groupBy(languages, (l) => l.region, regionOrder).map(([region, list]) =>
                  section(region, regionName[region] ?? region, list),
                )}
              </>
            )}
          </div>
          <p aria-live="polite" className="sr-only">
            {query ? `${results.length} languages` : ""}
          </p>
        </div>
      </dialog>
    </>
  );
}
