import { BookPlus, EyeOff, Lightbulb, LightbulbOff, SpellCheck } from "lucide-react";
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
  /** Spell checking; undefined when the language has no word list. */
  spelling?: {
    enabled: boolean;
    onToggle: () => void;
    /** Stop flagging the word at the caret: for now, or for good. */
    onIgnore: () => void;
    onAdd: () => void;
  };
}

/** Keep the caret in the editor: buttons act without taking focus from it. */
const keepFocus = (e: PointerEvent) => e.preventDefault();

const TOOL = "shrink-0 rounded-lg p-2 text-muted hover:bg-key-pressed hover:text-text";

const ITEM =
  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xl leading-tight text-text hover:bg-key-pressed focus-visible:bg-key-pressed";

export default function CandidateBar(props: CandidateBarProps) {
  const { state, roman, lang, dir, predict, onTogglePredict, onPick, onKeep, showNumbers } = props;
  const { spelling } = props;
  const romanWord = state.mode === "roman" ? state.range?.word : undefined;
  const misspelled = state.mode === "spell" ? state.range?.word : undefined;
  const empty = state.items.length === 0;

  return (
    <div className="flex h-12 items-center gap-1 rounded-xl border border-border bg-surface px-1">
      <div
        role="group"
        aria-label={
          misspelled ? "Spelling corrections" : roman ? "Urdu spellings" : "Word suggestions"
        }
        dir={dir}
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
      >
        {empty && (
          <p className="truncate px-3 text-sm text-muted" dir="ltr">
            {misspelled ? (
              <>
                No suggestions for{" "}
                <span className="font-script" lang={lang}>
                  {misspelled}
                </span>
              </>
            ) : roman ? (
              "Type Urdu in English letters, e.g. “mera naam”, then press Space."
            ) : predict ? (
              "Suggestions appear as you type."
            ) : (
              "Word suggestions are off."
            )}
          </p>
        )}
        {state.items.map((item, i) => (
          <button
            key={item}
            type="button"
            onPointerDown={keepFocus}
            onClick={() => onPick(i)}
            className={`${ITEM} ${i === 0 && (roman || misspelled) ? "bg-accent/10 font-semibold" : ""}`}
          >
            {roman && showNumbers && (
              <span className="text-xs font-normal text-muted" dir="ltr" aria-hidden="true">
                {i + 1}
              </span>
            )}
            <span className="font-script" lang={lang}>
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
      {misspelled && spelling && (
        <>
          <button
            type="button"
            onPointerDown={keepFocus}
            onClick={spelling.onIgnore}
            title="Ignore this word"
            className={TOOL}
          >
            <EyeOff size={18} aria-hidden="true" />
            <span className="sr-only">
              Ignore{" "}
              <span lang={lang} dir={dir}>
                {misspelled}
              </span>
            </span>
          </button>
          <button
            type="button"
            onPointerDown={keepFocus}
            onClick={spelling.onAdd}
            title="Add to my dictionary"
            className={TOOL}
          >
            <BookPlus size={18} aria-hidden="true" />
            <span className="sr-only">
              Add{" "}
              <span lang={lang} dir={dir}>
                {misspelled}
              </span>{" "}
              to my dictionary
            </span>
          </button>
        </>
      )}
      {spelling && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={spelling.onToggle}
          aria-pressed={spelling.enabled}
          title={spelling.enabled ? "Turn spell check off" : "Turn spell check on"}
          className={`${TOOL} ${spelling.enabled ? "" : "opacity-60"}`}
        >
          <SpellCheck size={18} aria-hidden="true" />
          <span className="sr-only">Spell check</span>
        </button>
      )}
      {!roman && (
        <button
          type="button"
          onPointerDown={keepFocus}
          onClick={onTogglePredict}
          aria-pressed={predict}
          title={predict ? "Turn word suggestions off" : "Turn word suggestions on"}
          className={TOOL}
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
