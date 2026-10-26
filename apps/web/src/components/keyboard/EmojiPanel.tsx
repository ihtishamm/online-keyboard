import {
  annotationLocale,
  buildIndex,
  loadAnnotations,
  loadEmoji,
  searchEmoji,
  SKIN_TONES,
  withSkin,
  type Annotations,
  type Emoji,
  type EmojiData,
  type EmojiIndex,
} from "@okb/emoji";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { loadPreference, savePreference } from "./preferences";

export interface EmojiPanelProps {
  /** BCP 47 tag of the page language; its CLDR keywords are searchable too. */
  lang: string;
  nativeName: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

const RECENT = -1;
const RECENT_MAX = 32;
/** One emoji stands for each group on its tab, in Unicode group order. */
const GROUP_ICONS = ["😀", "👋", "🐻", "🍔", "✈️", "⚽", "💡", "🔣", "🏁"];
const TONE_SWATCH = ["#f7c948", "#f7d7c4", "#e3b590", "#c68e64", "#8d5b3c", "#4b3226"];

interface Loaded {
  data: EmojiData;
  index: EmojiIndex;
  native: Annotations | null;
  byChar: ReadonlyMap<string, Emoji>;
}

function loadRecent(): string[] {
  try {
    const value: unknown = JSON.parse(loadPreference("emojiRecent") ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export default function EmojiPanel({ lang, nativeName, onPick, onClose }: EmojiPanelProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [group, setGroup] = useState(() => (loadRecent().length ? RECENT : 0));
  const [tone, setTone] = useState(() => {
    const saved = Number(loadPreference("emojiSkin"));
    return saved >= 0 && saved < SKIN_TONES.length ? saved : 0;
  });
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<Emoji | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    const locale = annotationLocale(lang);
    Promise.all([loadEmoji(), locale ? loadAnnotations(locale) : null])
      .then(([data, native]) => {
        if (!current) return;
        const byChar = new Map(data.emoji.map((e) => [e.char, e]));
        setLoaded({ data, native, byChar, index: buildIndex(data, native ?? undefined) });
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [lang]);

  const shown: Emoji[] = useMemo(() => {
    if (!loaded) return [];
    if (query.trim()) return searchEmoji(loaded.index, query);
    if (group === RECENT)
      return recent.map((c) => loaded.byChar.get(c)).filter((e): e is Emoji => !!e);
    return loaded.data.emoji.filter((e) => e.group === group);
  }, [loaded, query, group, recent]);

  // A new list starts at its first emoji.
  useEffect(() => {
    setActive(0);
    gridRef.current?.scrollTo({ top: 0 });
  }, [query, group]);

  const pick = (emoji: Emoji) => {
    onPick(withSkin(emoji, tone));
    const next = [emoji.char, ...recent.filter((c) => c !== emoji.char)].slice(0, RECENT_MAX);
    // The Recent tab keeps its order until it is reopened, so taps don't move what's under the finger.
    if (group !== RECENT || query) setRecent(next);
    savePreference("emojiRecent", JSON.stringify(next));
  };

  const nativeNameOf = (emoji: Emoji) => loaded?.native?.[emoji.char]?.split("|")[0];

  /** Arrow keys move through the grid; the row length is read from the layout. */
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(gridRef.current?.querySelectorAll("button") ?? [])];
    if (!buttons.length) return;
    const top = buttons[0]!.offsetTop;
    const firstRowEnd = buttons.findIndex((b) => b.offsetTop !== top);
    const perRow = firstRowEnd === -1 ? buttons.length : firstRowEnd;
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: perRow,
      ArrowUp: -perRow,
      Home: -active,
      End: buttons.length - 1 - active,
    };
    const delta = moves[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = Math.min(buttons.length - 1, Math.max(0, active + delta));
    setActive(next);
    buttons[next]!.focus();
  };

  const tabClass = (on: boolean) =>
    `inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-xl ${
      on ? "bg-accent-soft ring-1 ring-accent" : "hover:bg-surface-2"
    }`;

  const searching = query.trim().length > 0;
  const groupLabel = searching
    ? "Search results"
    : group === RECENT
      ? "Recently used"
      : (loaded?.data.groups[group] ?? "Emoji");
  const status = hovered ?? shown[active];

  return (
    <section
      aria-label="Emoji"
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-2 shadow-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {/* On phones the skin tones get their own row so the search box keeps its width. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search emoji</span>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || (e.key === "Enter" && shown[0])) {
                e.preventDefault();
                if (e.key === "Enter") pick(shown[0]!);
                else gridRef.current?.querySelector("button")?.focus();
              }
            }}
            placeholder={`Search in English or ${nativeName}`}
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-border bg-bg ps-9 pe-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <div
          role="radiogroup"
          aria-label="Skin tone"
          className="flex shrink-0 items-center gap-0.5 max-sm:order-1 max-sm:w-full max-sm:justify-center"
        >
          {SKIN_TONES.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={tone === i}
              aria-label={`${label} skin tone`}
              title={`${label} skin tone`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setTone(i);
                savePreference("emojiSkin", String(i));
              }}
              className={`inline-flex size-8 items-center justify-center rounded-full ${
                tone === i ? "ring-2 ring-accent" : ""
              }`}
            >
              <span
                aria-hidden="true"
                className="size-4 rounded-full border border-black/20"
                style={{ background: TONE_SWATCH[i] }}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          onMouseDown={(e) => e.preventDefault()}
          title="Close emoji"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-text hover:bg-surface-2"
        >
          <X size={18} aria-hidden />
          <span className="sr-only">Close emoji</span>
        </button>
      </div>

      <div
        role="toolbar"
        aria-label="Emoji categories"
        className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        <button
          type="button"
          aria-pressed={!searching && group === RECENT}
          title="Recently used"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("");
            setRecent(loadRecent());
            setGroup(RECENT);
          }}
          className={tabClass(!searching && group === RECENT)}
        >
          <span aria-hidden="true">🕘</span>
          <span className="sr-only">Recently used</span>
        </button>
        {(loaded?.data.groups ?? []).map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={!searching && group === i}
            title={name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              setGroup(i);
            }}
            className={tabClass(!searching && group === i)}
          >
            <span aria-hidden="true">{GROUP_ICONS[i]}</span>
            <span className="sr-only">{name}</span>
          </button>
        ))}
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label={groupLabel}
        onKeyDown={onGridKey}
        onMouseLeave={() => setHovered(null)}
        className="grid h-56 auto-rows-max grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] overflow-y-auto overscroll-contain sm:h-64"
      >
        {shown.map((emoji, i) => (
          <button
            key={emoji.char}
            type="button"
            tabIndex={i === active ? 0 : -1}
            aria-label={emoji.name}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setHovered(emoji)}
            onFocus={() => setActive(i)}
            onClick={() => pick(emoji)}
            className="flex h-11 items-center justify-center rounded-lg text-[1.75rem] leading-none hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            {withSkin(emoji, tone)}
          </button>
        ))}
        {!shown.length && (
          <p className="col-span-full self-center p-4 text-center text-sm text-muted">
            {failed
              ? "Couldn't load emoji. Check your connection and try again."
              : !loaded
                ? "Loading emoji…"
                : searching
                  ? "No emoji found."
                  : "Emoji you use will appear here."}
          </p>
        )}
      </div>

      <p className="flex min-h-6 items-center gap-2 px-1 text-sm text-muted" aria-hidden="true">
        {status && (
          <>
            <span className="text-lg leading-none">{withSkin(status, tone)}</span>
            <span className="truncate">{status.name}</span>
            {nativeNameOf(status) && (
              <>
                <span>·</span>
                <span className="font-script truncate" lang={lang} dir="auto">
                  {nativeNameOf(status)}
                </span>
              </>
            )}
          </>
        )}
      </p>
    </section>
  );
}
