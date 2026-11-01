import type { Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { Heart, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FONT_CLASS } from "../fonts";
import { loadPreference, savePreference } from "../keyboard/preferences";
import { hasCoarsePointer } from "../keyboard/platform";
import { scoringFor } from "./drill";
import GameInput from "./GameInput";
import { addRecord } from "./history";
import { recordOf } from "./progress";
import { PRIMARY } from "./share";

/**
 * Falling words (plan item 8.2, an original design): words drift down the box; type one to
 * clear it. A word that reaches the bottom costs one of three lives. Every 10 words the level
 * goes up: words fall faster, come more often, and come from a rarer, longer word set.
 */
export interface FallingWordsProps {
  slug: string;
  lang: string;
  languageName: string;
  nativeName: string;
  layout: Layout;
  /** Word sets, easiest first (practice.ts gameData). */
  bands: readonly (readonly string[])[];
  script: string;
  dir: "rtl" | "ltr";
  font: FontId;
  ownKeyboard: boolean;
  keyboard: boolean;
}

interface Falling {
  id: number;
  word: string;
  /** Distance from the start edge, in % of the box. */
  x: number;
  /** Time to reach the bottom, ms. */
  ms: number;
}

const LIVES = 3;
const PER_LEVEL = 10;
const MAX_ON_SCREEN = 6;
/** Per level: ms between words, and ms to fall the height of the box. */
const PACE: readonly (readonly [number, number])[] = [
  [2600, 10000],
  [2200, 8800],
  [1900, 7600],
  [1600, 6600],
  [1350, 5800],
];

const nfd = (s: string) => s.normalize("NFD");

export default function FallingWords(props: FallingWordsProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [falling, setFalling] = useState<Falling[]>([]);
  const [value, setValue] = useState("");
  const [lives, setLives] = useState(LIVES);
  const [caught, setCaught] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const next = useRef(0);
  const run = useRef({ started: 0, chars: 0, keys: 0, good: 0 });
  const { length, unit } = scoringFor(props.script);
  const level = Math.min(Math.floor(caught / PER_LEVEL), PACE.length - 1);
  const band = props.bands[Math.min(level, props.bands.length - 1)] ?? [];
  const bestKey = `falling:${props.layout.id}`;

  useEffect(() => {
    const saved = Number(loadPreference(bestKey));
    setBest(saved > 0 ? saved : null);
  }, [bestKey]);

  // Pause while the page is hidden: words would otherwise land unseen.
  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Drop a new word every so often.
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const [every, ms] = PACE[level]!;
    const drop = () =>
      setFalling((list) => {
        if (list.length >= MAX_ON_SCREEN || !band.length) return list;
        const showing = new Set(list.map((f) => f.word));
        const fresh = band.filter((w) => !showing.has(w));
        const word = fresh[Math.floor(Math.random() * fresh.length)];
        if (!word) return list;
        return [...list, { id: next.current++, word, x: 4 + Math.random() * 62, ms }];
      });
    if (!falling.length) drop();
    const id = window.setInterval(drop, every);
    return () => window.clearInterval(id);
  }, [phase, paused, level, band]);

  const start = () => {
    setFalling([]);
    setValue("");
    setLives(LIVES);
    setCaught(0);
    run.current = { started: performance.now(), chars: 0, keys: 0, good: 0 };
    setPhase("playing");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // Phones: the box, the typing line and the keyboard all on screen.
      if (hasCoarsePointer()) rootRef.current?.scrollIntoView({ block: "start" });
    });
  };

  const end = (score: number) => {
    setPhase("over");
    setFalling([]);
    const r = run.current;
    const seconds = (performance.now() - r.started) / 1000;
    const per = unit === "wpm" ? 5 : 1;
    const speed = seconds > 0 ? Math.round(r.chars / per / (seconds / 60)) : 0;
    if (best === null || score > best) {
      savePreference(bestKey, String(score));
      setBest(score);
    }
    void addRecord(
      recordOf(
        {
          slug: props.slug,
          layout: props.layout.id,
          activity: "falling",
          phone: hasCoarsePointer(),
          detail: `level ${level + 1}`,
          score,
        },
        {
          netWpm: speed,
          unit,
          accuracy: r.keys ? Math.round((100 * r.good) / r.keys) : 100,
          seconds,
        },
        {},
      ),
    ).catch(() => {});
  };

  /** Check the box against the falling words: a whole word clears it. */
  const check = (text: string) => {
    const typed = nfd(text);
    const hit = falling.find((f) => nfd(f.word) === typed);
    if (hit) {
      setFalling((list) => list.filter((f) => f.id !== hit.id));
      run.current.chars += length(hit.word) + 1;
      setCaught((c) => c + 1);
      setValue("");
    } else setValue(text);
  };

  const type = (text: string) => {
    if (phase !== "playing") return;
    if (/^\s+$/u.test(text)) {
      setValue("");
      return;
    }
    const after = value + text;
    run.current.keys += [...text].length;
    if (falling.some((f) => nfd(f.word).startsWith(nfd(after))))
      run.current.good += [...text].length;
    check(after);
  };

  const missed = (id: number) => {
    setFalling((list) => list.filter((f) => f.id !== id));
    setLives((n) => Math.max(0, n - 1));
  };

  useEffect(() => {
    if (phase === "playing" && lives === 0) end(caught);
  }, [phase, lives]); // end and caught are read when the last life goes

  const font = FONT_CLASS[props.font];

  return (
    <div ref={rootRef} className="flex scroll-mt-2 flex-col gap-3" data-falling>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          Level <span className="font-semibold tabular-nums">{level + 1}</span> · Words{" "}
          <span className="font-semibold tabular-nums" data-caught>
            {caught}
          </span>
          {best !== null && <span className="text-muted"> · Best {best}</span>}
        </span>
        <span className="inline-flex gap-0.5" aria-label={`${lives} of ${LIVES} lives left`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <Heart
              key={i}
              size={18}
              aria-hidden
              className={i < lives ? "fill-bad text-bad" : "text-border"}
            />
          ))}
        </span>
      </div>

      <div
        className="relative h-48 overflow-hidden rounded-xl border border-border bg-surface short:h-28! sm:h-80"
        lang={props.lang}
        dir={props.dir}
        aria-label="Falling words"
        role="region"
      >
        {falling.map((f) => {
          const matching = value && nfd(f.word).startsWith(nfd(value));
          return (
            <span
              key={f.id}
              data-word={f.word}
              onAnimationEnd={() => missed(f.id)}
              className={`${font} absolute rounded-md px-1.5 text-[1.35rem] whitespace-nowrap ${
                matching ? "bg-accent-soft text-text" : "text-text"
              }`}
              style={{
                insetInlineStart: `${f.x}%`,
                animation: `fall ${f.ms}ms linear forwards`,
                animationPlayState: paused ? "paused" : "running",
              }}
            >
              {f.word}
            </span>
          );
        })}
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            {phase === "over" && (
              <p role="status" className="text-lg font-semibold">
                Game over: {caught} {caught === 1 ? "word" : "words"}, level {level + 1}.
              </p>
            )}
            <p className="max-w-sm text-sm text-muted">
              Type a falling word to clear it. Don't let three reach the bottom.
            </p>
            <button type="button" className={PRIMARY} onClick={start}>
              <Play size={16} aria-hidden />
              {phase === "over" ? "Play again" : "Start"}
            </button>
          </div>
        )}
      </div>

      <GameInput
        ref={inputRef}
        layout={props.layout}
        value={value}
        onType={type}
        onBackspace={() => setValue((v) => [...v].slice(0, -1).join(""))}
        onValue={(v) => {
          if (phase !== "playing") return;
          if (/\s$/u.test(v)) setValue("");
          else check(v);
        }}
        ownKeyboard={props.ownKeyboard}
        keyboard={props.keyboard}
        disabled={phase !== "playing"}
        label={`Type the falling ${props.languageName} words here`}
        lang={props.lang}
        dir={props.dir}
        font={props.font}
        nativeName={props.nativeName}
      />
    </div>
  );
}
