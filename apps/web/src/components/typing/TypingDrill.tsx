import {
  layoutRows,
  KEY_CODES,
  ModifierLatch,
  TypingMachine,
  deadStrokeMap,
  isKeyCode,
  keystrokeMap,
  type KeyCode,
  type Layout,
  type Modifiers,
} from "@okb/engine";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { FontId } from "@okb/layouts";
import { FONT_CLASS } from "../fonts";
import { hasCoarsePointer, isAltGr } from "../keyboard/platform";
import VirtualKeyboard, { type KeyAction } from "../keyboard/VirtualKeyboard";
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
  const machineRef = useRef<TypingMachine | null>(null);
  machineRef.current ??= new TypingMachine(layout);
  const machine = machineRef.current;
  const latch = useRef(new ModifierLatch()).current;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [coarse, setCoarse] = useState(false);
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

  useEffect(() => setCoarse(hasCoarsePointer()), []);
  useEffect(() => {
    machine.setLayout(layout);
    latch.reset();
  }, [layout, machine, latch]);

  // Keep the current word on the second line, so the line just typed stays visible.
  useLayoutEffect(() => {
    const box = wordsRef.current;
    const word = box?.querySelector<HTMLElement>("[data-current]");
    if (box && word) box.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
  }, [drill.index, drill.words]);

  const finished = isFinished(drill);
  const type = (text: string) => update((d) => typeText(d, text, performance.now()));

  // ----- physical keyboard -----
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const ne = e.nativeEvent;
    if (ne.isComposing || ne.keyCode === 229) return;
    setPressed((s) => (s.has(e.code) ? s : new Set(s).add(e.code)));
    if (props.ownKeyboard || finished) return;
    if (e.key === " ") {
      e.preventDefault();
      const trigger = machine.pending;
      machine.cancelPending();
      type(trigger ?? " ");
      return;
    }
    if (e.key === "Backspace" && machine.cancelPending()) {
      e.preventDefault();
      return;
    }
    const altgr = isAltGr(ne);
    if (!altgr && (e.ctrlKey || e.metaKey || e.altKey)) return;
    if (!isKeyCode(e.code)) return; // Backspace and the like work natively on the input
    e.preventDefault();
    const result = machine.press(e.code, {
      shift: e.shiftKey,
      altgr,
      caps: ne.getModifierState?.("CapsLock") ?? false,
    });
    if (result.kind === "text") type(result.text);
    rerender();
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLInputElement>) =>
    setPressed((s) => {
      if (!s.has(e.code)) return s;
      const next = new Set(s);
      next.delete(e.code);
      return next;
    });

  // ----- on-screen keyboard -----
  const onChar = (code: KeyCode) => {
    if (finished) return;
    const result = machine.press(code, latch.current());
    if (result.kind === "text") type(result.text);
    latch.consume();
    rerender();
  };

  const onAction = (action: KeyAction) => {
    if (action === "backspace") {
      if (!machine.cancelPending()) update(backspace);
    } else if (action === "space" || action === "enter") {
      const trigger = machine.pending;
      machine.cancelPending();
      type(trigger ?? " ");
    } else if (action === "shift") latch.tapShift();
    else if (action === "altgr") latch.tapAltGr();
    else if (action === "caps") latch.tapCaps();
    rerender();
  };

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

  const latched = latch.current();
  const mods: Modifiers = {
    shift: latched.shift || pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
    altgr: latched.altgr || pressed.has("AltRight"),
    caps: latched.caps,
  };
  const letterKeys = useMemo(
    () =>
      new Set(
        KEY_CODES.filter((code) =>
          [layout.keys[code]?.n, layout.keys[code]?.s].some((v) => v && /[\p{L}\p{M}]/u.test(v)),
        ),
      ),
    [layout],
  );
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
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => setPressed(new Set())}
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
          labelFor={(code) => machine.labelFor(code, mods)}
          longpress={layout.longpress}
          rows={layoutRows(layout.keys)}
          shift={latch.shift}
          altgr={latch.altgr}
          hasAltGr={Object.values(layout.keys).some((k) => k?.ag || k?.sag)}
          caps={mods.caps}
          passthrough={false}
          nativeName={props.nativeName}
          letterKeys={letterKeys}
          pressed={pressed}
          onChar={onChar}
          onAlternate={(text) => type(text)}
          onAction={onAction}
          highlight={highlight}
          showToggle={false}
        />
      )}
    </div>
  );
}
