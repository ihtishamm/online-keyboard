import { Lightbulb, LightbulbOff } from "lucide-react";
import type { PointerEvent } from "react";
import type { SuggestionState } from "./useSuggestions";

export interface CandidateBarProps {
  state: SuggestionState;
  /** Roman typing is active: items are conversions of the Latin word, picked with 1–6. */
  roman: boolean;
  /** BCP 47 tag and direction of the suggested words. */
  lang: string;
  dir: "ltr" | "rtl";
  predict: boolean;
  onTogglePredict: () => void;
  onPick: (index: number) => void;
  /** Roman mode: leave the Latin word as typed. */
  onKeep: () => void;
  /** Show 1–6 shortcut numbers (physical keyboards). */
  showNumbers: boolean;
}

/** Keep the caret in the editor: buttons act without taking focus from it. */
const keepFocus = (e: PointerEvent) => e.preventDefault();

const ITEM =
  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xl leading-tight text-text hover:bg-key-pressed focus-visible:bg-key-pressed";

export default function CandidateBar(props: CandidateBarProps) {
  const { state, roman, lang, dir, predict, onTogglePredict, onPick, onKeep, showNumbers } = props;
  const romanWord = state.mode === "roman" ? state.range?.word : undefined;
  const empty = state.items.length === 0;

  return (
    <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-surface px-1">
      <div
        role="group"
        aria-label={roman ? "Urdu spellings" : "Word suggestions"}
        dir={dir}
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
      >
        {empty && (
          <p className="truncate px-3 text-sm text-muted" dir="ltr">
            {roman
              ? "Type Urdu in English letters, e.g. “mera naam”, then press Space."
              : predict
                ? "Suggestions appear as you type."
                : "Word suggestions are off."}
          </p>
        )}
        {state.items.map((item, i) => (
          <button
            key={item}
            type="button"
            onPointerDown={keepFocus}
            onClick={() => onPick(i)}
            className={`${ITEM} ${i === 0 && roman ? "bg-accent/10 font-semibold" : ""}`}
          >
            {roman && showNumbers && (
              <span className="text-xs font-normal text-muted" dir="ltr" aria-hidden="true">
                {i + 1}
              </span>
            )}
            <span className="font-naskh" lang={lang}>
              {item}
            </span>
          </button>
        ))}
      </div>
      {romanWord && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={onKeep}
          title="Keep as typed (Esc)"
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted hover:bg-key-pressed hover:text-text"
        >
          <span className="sr-only">Keep as typed: </span>
          {romanWord}
        </button>
      )}
      {!roman && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={onTogglePredict}
          aria-pressed={predict}
          title={predict ? "Turn word suggestions off" : "Turn word suggestions on"}
          className="shrink-0 rounded-lg p-2 text-muted hover:bg-key-pressed hover:text-text"
        >
          {predict ? (
            <Lightbulb size={18} aria-hidden="true" />
          ) : (
            <LightbulbOff size={18} aria-hidden="true" />
          )}
          <span className="sr-only">Word suggestions</span>
        </button>
      )}
    </div>
  );
}
