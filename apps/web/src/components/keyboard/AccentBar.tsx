import type { PointerEvent } from "react";

export interface AccentBarProps {
  /** The language's special letters (lower case, then capitals) and its own punctuation. */
  accents: string;
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
  const shown = props.upper
    ? lower.map((c) => (/\p{L}/u.test(c) ? c.toLocaleUpperCase(props.lang) : c))
    : lower;
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
          className={KEY}
        >
          {c}
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
