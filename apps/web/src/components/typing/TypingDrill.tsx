import { deadStrokeMap, keystrokeMap, layoutRows, type Layout } from "@okb/engine";
import { useLayoutEffect, useMemo, useRef } from "react";
import type { FontId } from "@okb/layouts";
import { FONT_CLASS } from "../fonts";
import VirtualKeyboard from "../keyboard/VirtualKeyboard";
import {
  backspace,
  currentWord,
  isFinished,
  nextKeystroke,
  onTrack,
  setTyped,
  typeText,
  type Drill,
} from "./drill";
import { strokeName } from "./keys";
import { useLayoutInput } from "./useLayoutInput";

export interface TypingDrillProps {
  drill: Drill;
  update: (change: (d: Drill) => Drill) => void;
  layout: Layout;
  lang: string;
  nativeName: string;
  /** Point out the next key on the on-screen keyboard (the tutor). */
  hint: boolean;
  /** Show the on-screen keyboard on computers too (it is always shown on touch screens). */
  keyboard: boolean;
  /** The computer already types the language: leave key presses alone. */
  ownKeyboard: boolean;
  /** Accessible name of the typing box. */
  label: string;
  /** Writing direction and font of the language (default: Urdu's). */
  dir?: "rtl" | "ltr";
  font?: FontId;
  /**
   * Roman spelling lessons: the words are typed in English letters, and the box shows each
   * one as the language writes it (target → shown). The input is then Latin script.
   */
  cues?: Readonly<Record<string, string>>;
}

/** Nastaliq needs tall lines; other scripts are set a little smaller and tighter. */
const SIZE: Partial<Record<FontId, { box: string; input: string }>> = {
  nastaliq: {
    box: "h-[calc(3*2.2em+1rem)] text-[1.6rem] leading-[2.2] sm:text-[1.75rem]",
    input: "h-16 text-[1.6rem] leading-[2.2]",
  },
};
const DEFAULT_SIZE = {
  box: "h-[calc(3*1.9em+1rem)] text-[1.35rem] leading-[1.9] sm:text-[1.5rem]",
  input: "h-14 text-[1.35rem]",
};

export default function TypingDrill(props: TypingDrillProps) {
  const { drill, update, layout } = props;
  const finished = isFinished(drill);
  const type = (text: string) => update((d) => typeText(d, text, performance.now()));
  const input = useLayoutInput(layout, {
    disabled: finished,
    ownKeyboard: props.ownKeyboard,
    type,
    backspace: () => update(backspace),
  });
  const { machine, coarse } = input;
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const keys = useMemo(() => keystrokeMap(layout), [layout]);
  const dead = useMemo(() => deadStrokeMap(layout, keys), [layout, keys]);
  const dir = props.dir ?? "rtl";
  const font = props.font ?? "nastaliq";
  const size = SIZE[font] ?? DEFAULT_SIZE;
  const cues = props.cues;
  // What the input holds: the language, or its English-letter spelling.
  const typed = cues
    ? { lang: `${props.lang}-Latn`, dir: "ltr" as const, font: "latin" as FontId }
    : { lang: props.lang, dir, font };

  // Keep the current word on the second line, so the line just typed stays visible.
  useLayoutEffect(() => {
    const box = wordsRef.current;
    const word = box?.querySelector<HTMLElement>("[data-current]");
    if (box && word) box.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
  }, [drill.index, drill.words]);

  const next = props.hint ? nextKeystroke(drill, keys, dead, machine.pending) : null;
  const highlight = useMemo(() => {
    const set = new Set<string>();
    if (next === "space" || next === "backspace") set.add(next);
    else if (next) {
      set.add(next.code);
      if (next.shift) set.add("shift");
      if (next.altgr) set.add("altgr");
    }
    return set;
  }, [next]);

  const showKeyboard = (props.keyboard || coarse) && !props.ownKeyboard;
  const track = onTrack(drill);
  const target = currentWord(drill);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wordsRef}
        lang={props.lang}
        dir={dir}
        onClick={() => inputRef.current?.focus()}
        className={`${FONT_CLASS[font]} relative ${size.box} cursor-text overflow-hidden rounded-xl border border-border bg-surface px-4 py-2`}
        aria-hidden="true"
      >
        {drill.words.map((word, i) => {
          const result = drill.results[i];
          const current = i === drill.index && !finished;
          const cls = result
            ? result.correct
              ? "text-good"
              : "text-bad underline decoration-wavy decoration-1 underline-offset-8"
            : current
              ? `rounded-md px-1 ${track ? "bg-accent-soft" : "bg-bad-soft"}`
              : "text-muted";
          return (
            <span key={i}>
              <span data-current={current || undefined} className={cls}>
                {cues?.[word] ?? word}
              </span>{" "}
            </span>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        {cues && !finished && (
          <p className="text-sm text-muted">
            In English letters:{" "}
            <span lang={typed.lang} className="font-mono text-base font-semibold text-text">
              {target}
            </span>
          </p>
        )}
        <input
          ref={inputRef}
          value={drill.typed}
          onChange={(e) =>
            update((d) => setTyped(d, e.target.value.normalize("NFC"), performance.now()))
          }
          {...input.handlers}
          disabled={finished}
          lang={typed.lang}
          dir={typed.dir}
          aria-label={props.label}
          aria-describedby="typing-target"
          aria-invalid={!track}
          inputMode={coarse && !props.ownKeyboard ? "none" : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`${FONT_CLASS[typed.font]} ${(SIZE[typed.font] ?? DEFAULT_SIZE).input} w-full rounded-xl border-2 bg-surface px-4 focus:outline-none disabled:opacity-60 ${
            track ? "border-border text-text focus:border-accent" : "border-bad text-bad"
          }`}
        />
        <p id="typing-target" className="sr-only" lang={typed.lang}>
          {finished ? "Finished" : `Type: ${target}`}
        </p>
        {props.hint && !finished && (
          <p className="min-h-6 text-sm text-muted" aria-live="polite">
            {next === "backspace"
              ? "Press Backspace to fix the mistake."
              : next === "space"
                ? "Press Space for the next word."
                : next
                  ? `Next key: ${strokeName(next)}`
                  : ""}
          </p>
        )}
      </div>

      {showKeyboard && (
        <VirtualKeyboard
          {...input.keyboard}
          rows={layoutRows(layout.keys)}
          nativeName={props.nativeName}
          highlight={highlight}
        />
      )}
    </div>
  );
}
