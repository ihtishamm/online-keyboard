import type { Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { Copy, Download, Flame, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SITE } from "../../config/site";
import { downloadBlob } from "../keyboard/actions";
import { hasCoarsePointer } from "../keyboard/platform";
import { createDrill, isFinished, stats, type Drill } from "./drill";
import { addRecord, listRecords } from "./history";
import { challengeNumber, dailyText, recordOf, streak, utcDay } from "./progress";
import { BTN, PRIMARY, cardBlob, canShareFiles } from "./share";
import TypingDrill from "./TypingDrill";

/**
 * The daily challenge (plan item 8.2): one text per language per UTC day, the same for
 * everyone, typed once through. Finishing it keeps the streak going; the result can be shared
 * as text ("Day 12 · 48 WPM · 97 %") or as an image.
 */
export interface DailyChallengeProps {
  slug: string;
  lang: string;
  languageName: string;
  nativeName: string;
  layout: Layout;
  passages: readonly string[];
  words: readonly string[];
  script: string;
  dir: "rtl" | "ltr";
  font: FontId;
  ownKeyboard: boolean;
  keyboard: boolean;
}

interface Done {
  speed: number;
  accuracy: number;
  unit: "wpm" | "cpm";
  streak: number;
}

export default function DailyChallenge(props: DailyChallengeProps) {
  // The day is read on the device (never at build time), and again on each new attempt.
  const [day, setDay] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill>(() => createDrill([]));
  const [done, setDone] = useState<Done | null>(null);
  const [today, setToday] = useState<{ best: number; unit: string } | null>(null);
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const words = useMemo(
    () => (day ? dailyText(props.slug, day, props.passages, props.words) : []),
    [day, props.slug, props.passages, props.words],
  );
  const number = day ? challengeNumber(day) : 0;

  const refresh = async (d: string) => {
    const records = (await listRecords(props.slug)).filter((r) => r.activity === "daily");
    setCurrent(
      streak(
        records.map((r) => r.day),
        d,
      ),
    );
    const mine = records.filter((r) => r.day === d);
    setToday(
      mine.length ? { best: Math.max(...mine.map((r) => r.speed)), unit: mine[0]!.unit } : null,
    );
  };

  const start = () => {
    const d = utcDay(Date.now());
    setDay(d);
    setDone(null);
    setMessage("");
    void refresh(d).catch(() => {});
    requestAnimationFrame(() =>
      rootRef.current?.querySelector<HTMLInputElement>("input[aria-label]")?.focus(),
    );
  };
  useEffect(start, [props.slug]); // a new day on each visit
  useEffect(() => setDrill(createDrill(words, props.script)), [words, props.script, props.layout]);

  // Save the finished challenge, then show the streak with it.
  useEffect(() => {
    if (!isFinished(drill) || done || !day) return;
    const result = stats(drill, drill.endedAt!);
    const record = recordOf(
      {
        slug: props.slug,
        layout: props.layout.id,
        activity: "daily",
        phone: hasCoarsePointer(),
        detail: `#${number}`,
      },
      result,
      drill.keyCounts,
    );
    const show = (n: number) =>
      setDone({ speed: result.netWpm, accuracy: result.accuracy, unit: result.unit, streak: n });
    addRecord(record)
      .then(() => listRecords(props.slug))
      .then((all) => {
        const days = all.filter((r) => r.activity === "daily").map((r) => r.day);
        show(streak(days, day));
        void refresh(day);
      })
      .catch(() => show(1));
  }, [drill, done, day, number, props.slug, props.layout.id]);

  const UNIT = done?.unit === "cpm" ? "CPM" : "WPM";
  const summary = done ? `Day ${done.streak} · ${done.speed} ${UNIT} · ${done.accuracy} %` : "";
  const shareText = done
    ? `${SITE.name} ${props.languageName} daily typing challenge #${number}: ${summary}`
    : "";
  const card = () =>
    cardBlob({
      wpm: done!.speed,
      unit: UNIT,
      accuracy: done!.accuracy,
      seconds: 0,
      layoutName: props.layout.name.en,
      nativeTitle: props.nativeName,
      title: `${props.languageName} daily challenge #${number}`,
      line: `Day ${done!.streak} · ${done!.accuracy}% accuracy · ${props.layout.name.en}`,
      watermark: location.host,
      font: props.font,
      dir: props.dir,
    });
  const filename = `${props.slug}-daily-${number}.png`;

  return (
    <div ref={rootRef} className="flex flex-col gap-4" data-daily>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="font-semibold">
          Challenge #{number || "…"}
          {day && <span className="font-normal text-muted"> · {day} (UTC)</span>}
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame size={16} aria-hidden className="text-accent" />
          <span data-streak>
            {current === 0
              ? "Start a streak today"
              : `${current} ${current === 1 ? "day" : "days"} in a row`}
          </span>
        </span>
        {today && (
          <span className="text-muted">
            Done today: best {today.best} {today.unit === "cpm" ? "CPM" : "WPM"}
          </span>
        )}
      </div>

      {done ? (
        <section
          aria-labelledby="daily-result"
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5"
        >
          <h3 id="daily-result" className="text-lg font-semibold">
            Challenge #{number} done
          </h3>
          <p className="text-3xl font-bold text-accent" data-summary>
            {summary}
          </p>
          <p className="text-sm text-muted">
            {done.streak > 1
              ? `${done.streak} days in a row. Come back tomorrow for challenge #${number + 1}.`
              : `Your streak starts today. Come back tomorrow for challenge #${number + 1}.`}{" "}
            Everyone typing {props.languageName} gets the same text today.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={PRIMARY}
              onClick={async () => {
                const url = location.href.split("#")[0]!;
                if (navigator.share) {
                  try {
                    await navigator.share({ text: shareText, url });
                    return;
                  } catch {
                    /* cancelled, or not allowed: copy instead */
                  }
                }
                try {
                  await navigator.clipboard.writeText(`${shareText}\n${url}`);
                  setMessage("Copied your result");
                } catch {
                  setMessage(shareText);
                }
              }}
            >
              {typeof navigator !== "undefined" && "share" in navigator ? (
                <Share2 size={16} aria-hidden />
              ) : (
                <Copy size={16} aria-hidden />
              )}
              Share result
            </button>
            <button
              type="button"
              className={BTN}
              onClick={async () => {
                const blob = await card();
                if (canShareFiles()) {
                  try {
                    await navigator.share({
                      files: [new File([blob], filename, { type: "image/png" })],
                    });
                    return;
                  } catch {
                    /* cancelled: download instead */
                  }
                }
                downloadBlob(blob, filename);
                setMessage(`Downloaded ${filename}`);
              }}
            >
              <Download size={16} aria-hidden />
              Result image
            </button>
            <button type="button" className={BTN} onClick={start}>
              <RotateCcw size={16} aria-hidden />
              Type it again
            </button>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-accent">
            {message}
          </p>
        </section>
      ) : (
        <TypingDrill
          key={`${props.layout.id}:${day}`}
          drill={drill}
          update={setDrill}
          layout={props.layout}
          lang={props.lang}
          dir={props.dir}
          font={props.font}
          nativeName={props.nativeName}
          hint={false}
          keyboard={props.keyboard}
          ownKeyboard={props.ownKeyboard}
          label={`Type today's ${props.languageName} challenge here`}
        />
      )}
    </div>
  );
}
