import type { Layout } from "@okb/engine";
import { Download, RotateCcw, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { datedName, downloadBlob } from "../keyboard/actions";
import { loadPreference, savePreference } from "../keyboard/preferences";
import { createDrill, extend, finish, isFinished, stats, type Drill } from "./drill";
import Segmented from "./Segmented";
import TypingDrill from "./TypingDrill";

export interface TypingTestProps {
  /** Language slug for preferences and file names, e.g. "urdu". */
  slug: string;
  lang: string;
  /** Language name in English and in the language, e.g. "Urdu", "اردو". */
  languageName: string;
  nativeName: string;
  /** Result card heading, e.g. "اردو ٹائپنگ ٹیسٹ" / "Urdu typing test". */
  nativeTitle: string;
  title: string;
  /** The layouts on offer (data, so the registry stays on the server). */
  layouts: readonly Layout[];
  words: readonly string[];
  passages: readonly string[];
}

type Source = "words" | "sentences";
const DURATIONS = [30, 60, 120] as const;
const BATCH = 80;

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const BTN_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm";
const BTN = `${BTN_BASE} border-border bg-surface text-text hover:bg-surface-2`;
const PRIMARY = `${BTN_BASE} border-accent bg-accent font-medium text-accent-fg hover:opacity-90`;

export default function TypingTest(props: TypingTestProps) {
  const [layoutId, setLayoutId] = useState(props.layouts[0]!.id);
  const [duration, setDuration] = useState<number>(60);
  const [source, setSource] = useState<Source>("words");
  const [keyboard, setKeyboard] = useState(true);
  const [ownKeyboard, setOwnKeyboard] = useState(false);
  const [drill, setDrill] = useState<Drill>(() => createDrill([]));
  const [now, setNow] = useState(0);
  const [best, setBest] = useState<{ previous: number | null; isNew: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const layout = props.layouts.find((l) => l.id === layoutId) ?? props.layouts[0]!;
  const bestKey = `typingBest:${layoutId}:${duration}:${source}`;
  const rootRef = useRef<HTMLDivElement>(null);

  const text = useCallback(
    (): string[] =>
      source === "words"
        ? shuffled(props.words).slice(0, BATCH)
        : shuffled(props.passages).flatMap((p) => p.split(/\s+/u)),
    [source, props.words, props.passages],
  );

  const restart = useCallback(() => {
    setDrill(createDrill(text()));
    setBest(null);
    setNow(0);
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLInputElement>("input[aria-label]")?.focus(),
    );
  }, [text]);

  // Saved choices, then a fresh text whenever the settings change.
  useEffect(() => {
    const saved = (key: string) => loadPreference(`typing:${key}`);
    const l = saved("layout");
    if (l && props.layouts.some((x) => x.id === l)) setLayoutId(l);
    const d = Number(saved("duration"));
    if ((DURATIONS as readonly number[]).includes(d)) setDuration(d);
    if (saved("source") === "sentences") setSource("sentences");
    if (saved("keyboard") === "off") setKeyboard(false);
    if (saved("own") === "on") setOwnKeyboard(true);
  }, [props.layouts]);
  useEffect(() => restart(), [restart, layoutId, duration]);

  const running = drill.startedAt !== null && !isFinished(drill);

  // Clock: ends the test when time is up.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (drill.startedAt !== null && t - drill.startedAt >= duration * 1000) {
        setDrill((d) => finish(d, (d.startedAt ?? t) + duration * 1000));
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running, drill.startedAt, duration]);

  // Never run out of words.
  useEffect(() => {
    if (!isFinished(drill) && drill.words.length && drill.index > drill.words.length - 30) {
      setDrill((d) => extend(d, text()));
    }
  }, [drill, text]);

  const result = isFinished(drill) ? stats(drill, now) : null;

  // Personal best, once per finished test.
  useEffect(() => {
    if (!result || best) return;
    const raw = loadPreference(bestKey);
    const previous = raw === null ? null : Number(raw);
    const isNew = result.netWpm > 0 && (previous === null || result.netWpm > previous);
    if (isNew) savePreference(bestKey, String(result.netWpm));
    setBest({ previous, isNew });
  }, [result, best, bestKey]);

  const live = stats(drill, running ? now : (drill.endedAt ?? 0));
  const left = drill.startedAt === null ? duration : Math.max(0, duration - live.seconds);
  const layoutName = layout.name.en;

  const card = async () => {
    const { drawResultCard } = await import("./result-card");
    const canvas = document.createElement("canvas");
    await drawResultCard(canvas, {
      wpm: result!.netWpm,
      accuracy: result!.accuracy,
      seconds: duration,
      layoutName,
      nativeTitle: props.nativeTitle,
      title: props.title,
      watermark: location.host,
    });
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG failed"))), "image/png"),
    );
  };
  const filename = datedName(`${props.slug}-typing-test`, "png");
  const canShareFiles = (() => {
    try {
      return !!navigator.canShare?.({ files: [new File([""], "x.png", { type: "image/png" })] });
    } catch {
      return false;
    }
  })();

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Keyboard layout"
          value={layoutId}
          options={props.layouts.map((l) => ({ value: l.id, label: l.name.en }))}
          onChange={(id) => {
            setLayoutId(id);
            savePreference("typing:layout", id);
          }}
        />
        <Segmented
          label="Test length"
          value={duration}
          options={DURATIONS.map((d) => ({ value: d, label: d < 60 ? `${d} s` : `${d / 60} min` }))}
          onChange={(d) => {
            setDuration(d);
            savePreference("typing:duration", String(d));
          }}
        />
        <Segmented
          label="Text"
          value={source}
          options={[
            { value: "words", label: "Words" },
            { value: "sentences", label: "Sentences" },
          ]}
          onChange={(s) => {
            setSource(s);
            savePreference("typing:source", s);
          }}
        />
        <button type="button" className={BTN} onClick={restart} title="New text (restart)">
          <RotateCcw size={16} aria-hidden />
          <span>Restart</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={keyboard}
            onChange={(e) => {
              setKeyboard(e.target.checked);
              savePreference("typing:keyboard", e.target.checked ? "on" : "off");
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          Show the on-screen keyboard
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={ownKeyboard}
            onChange={(e) => {
              setOwnKeyboard(e.target.checked);
              savePreference("typing:own", e.target.checked ? "on" : "off");
            }}
            className="size-4 accent-[var(--color-accent)]"
          />
          My device already types {props.languageName}
        </label>
      </div>

      <div
        role="timer"
        aria-label="Time left"
        className="flex items-baseline gap-6 rounded-xl border border-border bg-surface px-4 py-2"
      >
        <span className="text-3xl font-semibold tabular-nums">{Math.ceil(left)}</span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-text tabular-nums">{live.netWpm}</span> WPM
        </span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-text tabular-nums">{live.accuracy}%</span> accuracy
        </span>
        {drill.startedAt === null && !result && (
          <span className="ms-auto text-sm text-muted">The clock starts with your first key.</span>
        )}
      </div>

      {result ? (
        <section
          aria-labelledby="result-heading"
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
        >
          <h2 id="result-heading" className="text-lg font-semibold">
            Your result
          </h2>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <p>
              <span className="block text-6xl font-bold text-accent tabular-nums">
                {result.netWpm}
              </span>
              <span className="text-sm text-muted">words per minute</span>
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <dt className="text-muted">Accuracy</dt>
              <dd className="font-semibold tabular-nums">{result.accuracy}%</dd>
              <dt className="text-muted">Raw speed</dt>
              <dd className="font-semibold tabular-nums">{result.rawWpm} WPM</dd>
              <dt className="text-muted">Correct words</dt>
              <dd className="font-semibold text-good tabular-nums">{result.correctWords}</dd>
              <dt className="text-muted">Wrong words</dt>
              <dd className="font-semibold text-bad tabular-nums">{result.wrongWords}</dd>
            </dl>
          </div>
          <p className="text-sm text-muted" role="status">
            {best?.isNew
              ? best.previous === null
                ? `First result saved on this device: ${result.netWpm} WPM.`
                : `New personal best! Up from ${best.previous} WPM.`
              : best?.previous != null
                ? `Your best on this device: ${best.previous} WPM.`
                : ""}{" "}
            {layoutName} layout, {duration < 60 ? `${duration} seconds` : `${duration / 60} min`},{" "}
            {source}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={PRIMARY} onClick={restart}>
              <RotateCcw size={16} aria-hidden />
              Try again
            </button>
            <button
              type="button"
              className={BTN}
              onClick={async () => {
                downloadBlob(await card(), filename);
                setMessage(`Downloaded ${filename}`);
              }}
            >
              <Download size={16} aria-hidden />
              Download result image
            </button>
            {canShareFiles && (
              <button
                type="button"
                className={BTN}
                onClick={async () => {
                  try {
                    const file = new File([await card()], filename, { type: "image/png" });
                    await navigator.share({ files: [file] });
                  } catch {
                    /* cancelled */
                  }
                }}
              >
                <Share2 size={16} aria-hidden />
                Share result
              </button>
            )}
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-accent">
            {message}
          </p>
        </section>
      ) : (
        <TypingDrill
          key={`${layoutId}`}
          drill={drill}
          update={setDrill}
          layout={layout}
          lang={props.lang}
          nativeName={props.nativeName}
          hint={false}
          keyboard={keyboard}
          ownKeyboard={ownKeyboard}
          label={`Type the ${props.languageName} text here`}
        />
      )}
    </div>
  );
}
