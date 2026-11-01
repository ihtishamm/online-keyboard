import { keystrokeMap, type Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { Play, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { FONT_CLASS } from "../fonts";
import { hasCoarsePointer } from "../keyboard/platform";
import GameInput from "./GameInput";
import { addRecord } from "./history";
import { recordOf } from "./progress";
import { BTN, PRIMARY } from "./share";

/**
 * Key finder (plan item 8.2): a letter of the layout appears; press or tap the key that types
 * it. A wrong key lights the right one up on the on-screen keyboard. 20 letters a round, timed.
 */
export interface KeyFinderProps {
  slug: string;
  lang: string;
  languageName: string;
  nativeName: string;
  layout: Layout;
  dir: "rtl" | "ltr";
  font: FontId;
  ownKeyboard: boolean;
  keyboard: boolean;
}

const ROUND = 20;
/** Shown before a combining mark, so the mark has something to sit on. */
const CIRCLE = "◌";
const isMark = (ch: string) => /^\p{M}$/u.test(ch);

/**
 * The letters a layout's keys type with or without Shift. Shifted capitals of letters already
 * on the plain layer are left out: finding Q again after q teaches nothing.
 */
export function finderLetters(layout: Layout): string[] {
  const plain = new Set<string>();
  const shifted: string[] = [];
  for (const def of Object.values(layout.keys)) {
    if (def?.n && /^[\p{L}\p{M}]$/u.test(def.n)) plain.add(def.n);
    if (def?.s && /^[\p{L}\p{M}]$/u.test(def.s)) shifted.push(def.s);
  }
  const extra = shifted.filter((s) => !plain.has(s.toLocaleLowerCase()) && !plain.has(s));
  return [...plain, ...new Set(extra)];
}

interface Run {
  targets: string[];
  index: number;
  started: number;
  misses: number;
  keys: Record<string, [number, number]>;
  /** A wrong key was pressed for the current letter. */
  wrong: string | null;
}

export default function KeyFinder(props: KeyFinderProps) {
  const letters = useMemo(() => finderLetters(props.layout), [props.layout]);
  const strokes = useMemo(() => keystrokeMap(props.layout), [props.layout]);
  const [run, setRun] = useState<Run | null>(null);
  const [result, setResult] = useState<{ seconds: number; accuracy: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const start = () => {
    const targets: string[] = [];
    while (targets.length < ROUND && letters.length) {
      const ch = letters[Math.floor(Math.random() * letters.length)]!;
      if (ch !== targets.at(-1)) targets.push(ch);
    }
    setRun({ targets, index: 0, started: 0, misses: 0, keys: {}, wrong: null });
    setResult(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // Phones: bring the letter and the keyboard on screen together.
      if (hasCoarsePointer()) rootRef.current?.scrollIntoView({ block: "start" });
    });
  };

  const finish = (r: Run) => {
    const seconds = (performance.now() - r.started) / 1000;
    const accuracy = Math.round((100 * ROUND) / (ROUND + r.misses));
    setResult({ seconds, accuracy });
    setRun(null);
    void addRecord(
      recordOf(
        {
          slug: props.slug,
          layout: props.layout.id,
          activity: "finder",
          phone: hasCoarsePointer(),
        },
        // Letters found per minute.
        { netWpm: Math.round(ROUND / (seconds / 60)), unit: "cpm", accuracy, seconds },
        r.keys,
      ),
    ).catch(() => {});
  };

  const press = (text: string) => {
    if (!run || /^\s*$/u.test(text)) return;
    const target = run.targets[run.index]!;
    const now = performance.now();
    const started = run.started || now;
    const t = run.keys[target] ?? [0, 0];
    if (text.normalize("NFC") === target) {
      const firstTry = run.wrong === null;
      const next: Run = {
        ...run,
        started,
        index: run.index + 1,
        wrong: null,
        keys: firstTry ? { ...run.keys, [target]: [t[0] + 1, t[1]] } : run.keys,
      };
      if (next.index >= run.targets.length) finish(next);
      else setRun(next);
    } else {
      setRun({
        ...run,
        started,
        misses: run.misses + 1,
        wrong: text,
        keys: { ...run.keys, [target]: [t[0], t[1] + 1] },
      });
    }
  };

  const target = run?.targets[run.index];
  const highlight = useMemo(() => {
    const set = new Set<string>();
    const stroke = run?.wrong != null && target ? strokes.get(target) : undefined;
    if (stroke) {
      set.add(stroke.code);
      if (stroke.shift) set.add("shift");
      if (stroke.altgr) set.add("altgr");
    }
    return set;
  }, [run?.wrong, target, strokes]);

  const font = FONT_CLASS[props.font];
  const show = (ch: string) => (isMark(ch) ? CIRCLE + ch : ch);

  return (
    <div ref={rootRef} className="flex scroll-mt-2 flex-col gap-3" data-finder>
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-center">
        {run && target ? (
          <>
            <span className="text-sm text-muted tabular-nums">
              {run.index + 1} of {ROUND}
            </span>
            <span
              className={`${font} text-5xl leading-[2] text-accent`}
              lang={props.lang}
              dir={props.dir}
              data-target={target}
            >
              {show(target)}
            </span>
            <span className="min-h-5 text-sm text-muted" aria-live="polite">
              {run.wrong !== null
                ? `That key types ${show(run.wrong)}. The right one is lit up.`
                : "Press or tap the key that types this letter."}
            </span>
          </>
        ) : result ? (
          <div role="status" className="flex flex-col items-center gap-2">
            <p className="text-lg font-semibold">
              {ROUND} letters in {result.seconds.toFixed(1)} s · {result.accuracy}% right first time
            </p>
            <p className="text-sm text-muted">
              {(result.seconds / ROUND).toFixed(2)} s a letter. Play again to beat it.
            </p>
            <button type="button" className={PRIMARY} onClick={start}>
              <RotateCcw size={16} aria-hidden />
              Play again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="max-w-sm text-sm text-muted">
              A {props.languageName} letter appears: find its key as fast as you can.{" "}
              {letters.length} letters on the {props.layout.name.en} layout.
            </p>
            <button type="button" className={PRIMARY} onClick={start}>
              <Play size={16} aria-hidden />
              Start
            </button>
          </div>
        )}
      </div>
      {run && (
        <GameInput
          ref={inputRef}
          layout={props.layout}
          value=""
          onType={press}
          onBackspace={() => {}}
          onValue={(v) => press([...v].at(-1) ?? "")}
          ownKeyboard={props.ownKeyboard}
          keyboard={props.keyboard}
          highlight={highlight}
          label={`Press the key for the ${props.languageName} letter shown`}
          lang={props.lang}
          dir={props.dir}
          font={props.font}
          nativeName={props.nativeName}
          placeholder="Tap here, then press keys"
          invisible
        />
      )}
      {run && (
        <button type="button" className={`${BTN} self-start`} onClick={() => setRun(null)}>
          Stop
        </button>
      )}
    </div>
  );
}
