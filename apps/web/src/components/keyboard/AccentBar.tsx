import type { PointerEvent } from "react";

export interface AccentBarProps {
  /**
   * The language's special letters (lower case, then capitals) and its own punctuation, or
   * the marks of a script (Quranic Arabic's tashkeel).
   */
  accents: string;
  /** The editor's font class, so marks and letters look as they will in the text. */
  fontClass?: string;
  /** Shift or Caps Lock is on: offer the capitals. */
  upper: boolean;
  lang: string;
  onPick: (text: string) => void;
  /** Add accents on Space when the word list is sure; undefined without a word list. */
  smartAccents?: { enabled: boolean; onToggle: () => void };
  /** French spacing or Spanish ¿ ¡: the language's typing rule, if it has one. */
  typography?: { label: string; title: string; enabled: boolean; onToggle: () => void };
}

const keepFocus = (e: PointerEvent) => e.preventDefault();

/** Names screen readers lack for the marks letter bars offer (Quranic Arabic's). */
const MARK_NAMES: Readonly<Record<string, string>> = {
  "\u064E": "fatha",
  "\u064B": "fathatan",
  "\u064F": "damma",
  "\u064C": "dammatan",
  "\u0650": "kasra",
  "\u064D": "kasratan",
  "\u0652": "sukun",
  "\u0651": "shadda",
  "\u0670": "dagger alif",
  "\u0653": "maddah",
  "\u06E1": "Quranic sukun",
  "\u06E2": "small meem",
  "\u06E5": "small waw",
  "\u06E6": "small yeh",
  "\u06D6": "pause sign sala",
  "\u06D7": "pause sign qala",
  "\u06D8": "pause sign meem",
  "\u06D9": "pause sign la",
  "\u06DA": "pause sign jeem",
  "\u06DB": "pause sign three dots",
  "\u06DC": "small high seen",
};

/** A screen reader's name for a lone mark, or its code point. */
const markName = (c: string) =>
  MARK_NAMES[c] ?? `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;

const KEY =
  "flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-lg bg-surface px-2 text-lg text-text shadow-sm hover:bg-key-pressed sm:min-h-9";
const TOGGLE =
  "min-h-11 shrink-0 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap sm:min-h-9";

/**
 * One tap for each of the language's special letters (plan item 7.5), on computers and
 * phones alike; Shift gives the capitals. People with an English keyboard reach é or ñ here
 * without learning dead keys.
 */
export default function AccentBar(props: AccentBarProps) {
  const chars = [...props.accents];
  const lower = chars.filter((c) => !/\p{L}/u.test(c) || c === c.toLowerCase());
  // One letter for one: ß in capitals is the capital ẞ here, not the two letters SS.
  const upperOf = (c: string) => {
    if (!/\p{L}/u.test(c)) return c;
    const up = c.toLocaleUpperCase(props.lang);
    return [...up].length === 1 ? up : c === "ß" ? "ẞ" : c;
  };
  // Capitals whose small letter is on every keyboard (Turkish İ, from i) join the capitals.
  const extra = chars.filter((c) => !lower.includes(c) && !lower.map(upperOf).includes(c));
  // IPA has no capitals: Shift leaves its bar as it is.
  const cased = chars.some((c) => c !== c.toLowerCase());
  const shown = props.upper && cased ? [...new Set([...lower.map(upperOf), ...extra])] : lower;
  const toggle = (on: boolean) =>
    `${TOGGLE} ${on ? "border-accent bg-accent-soft text-text" : "border-border text-muted"}`;

  return (
    <div
      role="group"
      aria-label="Special letters"
      className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 [scrollbar-width:none]"
    >
      {shown.map((c) => (
        <button
          key={c}
          type="button"
          tabIndex={-1}
          lang={props.lang}
          onPointerDown={keepFocus}
          onClick={() => props.onPick(c)}
          className={`${KEY} ${props.fontClass ?? ""}`}
          aria-label={/^\p{M}/u.test(c) ? markName(c) : undefined}
        >
          {/* A mark alone has nothing to sit on: show it on a dotted circle. */}
          {/^\p{M}/u.test(c) ? `\u25CC${c}` : c}
        </button>
      ))}
      <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
      {props.smartAccents && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={props.smartAccents.onToggle}
          aria-pressed={props.smartAccents.enabled}
          title="Type plain letters: Space adds the accents when the word is certain (cancion → canción). Words with two spellings go to the suggestions."
          className={toggle(props.smartAccents.enabled)}
        >
          Smart accents
        </button>
      )}
      {props.typography && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={props.typography.onToggle}
          aria-pressed={props.typography.enabled}
          title={props.typography.title}
          className={toggle(props.typography.enabled)}
        >
          {props.typography.label}
        </button>
      )}
    </div>
  );
}
