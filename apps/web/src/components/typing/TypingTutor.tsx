import type { Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPreference, savePreference } from "../keyboard/preferences";
import { createDrill, isFinished, stats, type Drill } from "./drill";
import type { Lesson } from "./lessons";
import Segmented from "./Segmented";
import TypingDrill from "./TypingDrill";

export interface TypingTutorProps {
  lang: string;
  languageName: string;
  nativeName: string;
  /** Lessons for each layout, in layout order. */
  lessons: Readonly<Record<string, readonly Lesson[]>>;
  /** Layouts by id, for every key of `lessons`. */
  layouts: Readonly<Record<string, Layout>>;
  /** Writing direction and font of the language (default: Urdu's). */
  dir?: "rtl" | "ltr";
  font?: FontId;
}

/** Accuracy needed to pass a lesson. */
const PASS = 90;
const DRILL_WORDS = 15;

interface Score {
  wpm: number;
  accuracy: number;
}

function loadProgress(layoutId: string): Record<string, Score> {
  try {
    const value: unknown = JSON.parse(loadPreference(`tutor:${layoutId}`) ?? "{}");
    return value && typeof value === "object" ? (value as Record<string, Score>) : {};
  } catch {
    return {};
  }
}

function drillFor(lesson: Lesson): Drill {
  if (lesson.sentences?.length) {
    const passage = lesson.sentences[Math.floor(Math.random() * lesson.sentences.length)]!;
    return createDrill(passage.split(/\s+/u));
  }
  const pool = [...lesson.words];
  const words: string[] = [];
  while (words.length < DRILL_WORDS && pool.length) {
    words.push(pool.splice(Math.floor(Math.random() * Math.min(pool.length, 25)), 1)[0]!);
  }
  return createDrill(words);
}

const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm text-text hover:bg-surface-2";
const PRIMARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-accent bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90";

export default function TypingTutor(props: TypingTutorProps) {
  const layoutIds = Object.keys(props.lessons);
  const [layoutId, setLayoutId] = useState(layoutIds[0]!);
  const [progress, setProgress] = useState<Record<string, Score>>({});
  const [active, setActive] = useState<number | null>(null);
  const [drill, setDrill] = useState<Drill>(() => createDrill([]));
  const [saved, setSaved] = useState(false);
  const lessons = props.lessons[layoutId] ?? [];
  const layout = props.layouts[layoutId]!;
  const lesson = active === null ? null : lessons[active]!;

  useEffect(() => {
    const saved = loadPreference("typing:layout");
    if (saved && layoutIds.includes(saved)) setLayoutId(saved);
  }, []); // mount only
  useEffect(() => setProgress(loadProgress(layoutId)), [layoutId]);

  const start = (index: number) => {
    setActive(index);
    setDrill(drillFor(lessons[index]!));
    setSaved(false);
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>("[data-tutor] input[aria-label]")?.focus(),
    );
  };

  const done = isFinished(drill) && lesson !== null;
  const result = done ? stats(drill, drill.endedAt!) : null;
  const passed = !!result && result.accuracy >= PASS;

  // Record the lesson's best score once it is finished.
  useEffect(() => {
    if (!result || !lesson || saved) return;
    const previous = progress[lesson.id];
    const better =
      !previous ||
      result.accuracy > previous.accuracy ||
      (result.accuracy === previous.accuracy && result.netWpm > previous.wpm);
    if (better) {
      const next = { ...progress, [lesson.id]: { wpm: result.netWpm, accuracy: result.accuracy } };
      setProgress(next);
      savePreference(`tutor:${layoutId}`, JSON.stringify(next));
    }
    setSaved(true);
  }, [result, lesson, saved, progress, layoutId]);

  if (!lesson) {
    const doneCount = lessons.filter((l) => (progress[l.id]?.accuracy ?? 0) >= PASS).length;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            label="Keyboard layout"
            value={layoutId}
            options={layoutIds.map((id) => ({ value: id, label: props.layouts[id]!.name.en }))}
            onChange={(id) => {
              setLayoutId(id);
              savePreference("typing:layout", id);
            }}
          />
          <p className="text-sm text-muted">
            {doneCount} of {lessons.length} lessons passed
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map((l, i) => {
            const score = progress[l.id];
            const ok = (score?.accuracy ?? 0) >= PASS;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => start(i)}
                  className={`flex h-full w-full flex-col gap-2 rounded-xl border bg-surface p-4 text-start hover:border-accent ${
                    ok ? "border-accent" : "border-border"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm text-muted">
                    Lesson {i + 1}
                    {ok && (
                      <span className="inline-flex items-center gap-1 text-good">
                        <Check size={14} aria-hidden /> Passed
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">{l.title}</span>
                  {l.letters.length > 0 && (
                    <span
                      className="font-script text-xl text-accent"
                      lang={props.lang}
                      dir={props.dir ?? "rtl"}
                    >
                      {l.letters.join(" ")}
                    </span>
                  )}
                  <span className="text-sm text-muted">
                    {score
                      ? `Best: ${score.wpm} WPM, ${score.accuracy}% accuracy`
                      : "Not tried yet"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-tutor>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={BTN} onClick={() => setActive(null)}>
          <ArrowLeft size={16} aria-hidden />
          All lessons
        </button>
        <h2 className="text-lg font-semibold">
          Lesson {active! + 1}: {lesson.title}{" "}
          {lesson.letters.length > 0 && (
            <span
              className="font-script ms-1 text-accent"
              lang={props.lang}
              dir={props.dir ?? "rtl"}
            >
              {lesson.letters.join(" ")}
            </span>
          )}
        </h2>
        <button type="button" className={BTN} onClick={() => start(active!)}>
          <RotateCcw size={16} aria-hidden />
          New words
        </button>
      </div>

      {result ? (
        <section
          aria-labelledby="lesson-result"
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
        >
          <h3 id="lesson-result" className="text-lg font-semibold">
            {passed ? "Lesson passed!" : `Almost: aim for ${PASS}% accuracy`}
          </h3>
          <p role="status">
            <span className="text-3xl font-bold text-accent tabular-nums">{result.netWpm}</span> WPM
            ·{" "}
            <span className={`font-semibold ${passed ? "text-good" : "text-bad"}`}>
              {result.accuracy}% accuracy
            </span>{" "}
            · {result.correctWords} of {drill.words.length} words right
          </p>
          <div className="flex flex-wrap gap-2">
            {passed && active! + 1 < lessons.length ? (
              <button type="button" className={PRIMARY} onClick={() => start(active! + 1)}>
                Next lesson
                <ArrowRight size={16} aria-hidden />
              </button>
            ) : null}
            <button type="button" className={passed ? BTN : PRIMARY} onClick={() => start(active!)}>
              <RotateCcw size={16} aria-hidden />
              Practise again
            </button>
          </div>
        </section>
      ) : (
        <TypingDrill
          key={`${layoutId}-${active}`}
          drill={drill}
          update={setDrill}
          layout={layout}
          lang={props.lang}
          dir={props.dir}
          font={props.font}
          nativeName={props.nativeName}
          hint
          keyboard
          ownKeyboard={false}
          label={`Type the ${props.languageName} words here`}
        />
      )}
    </div>
  );
}
