import type { Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { Award, Download, Target, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FONT_CLASS } from "../fonts";
import { datedName, downloadBlob } from "../keyboard/actions";
import { hasCoarsePointer } from "../keyboard/platform";
import { createDrill, isFinished, stats, type Drill } from "./drill";
import { addRecord, addRecords, clearRecords, listRecords, persistent } from "./history";
import KeyHeatmap from "./KeyHeatmap";
import {
  badges,
  keyAccuracy,
  parseExport,
  recordOf,
  streak,
  sumKeys,
  utcDay,
  weakestKeys,
  wordsFor,
  type Activity,
  type TypingRecord,
} from "./progress";
import { BTN, PRIMARY } from "./share";
import TypingDrill from "./TypingDrill";

/**
 * The progress page (plan item 8.2): history per language, accuracy by key on the keyboard,
 * drills for the weakest keys, badges, and export/import. Everything is read from this
 * device's history (history.ts); the language's layouts and words load when it is shown.
 */
export interface ProgressLanguage {
  slug: string;
  name: string;
  native: string;
  lang: string;
  dir: "rtl" | "ltr";
  font: FontId;
  script: string;
}

const ACTIVITY: Record<Activity, string> = {
  test: "Typing test",
  lesson: "Tutor lesson",
  daily: "Daily challenge",
  falling: "Falling words",
  finder: "Key finder",
};

const DRILL_WORDS = 15;

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Speed over time, as a small line chart (the table below has the numbers). */
function SpeedChart({ records }: { records: readonly TypingRecord[] }) {
  if (records.length < 2) return null;
  const w = 320;
  const h = 80;
  const max = Math.max(...records.map((r) => r.speed), 1);
  const points = records.map((r, i) => [
    (i / (records.length - 1)) * (w - 8) + 4,
    h - 4 - (r.speed / max) * (h - 8),
  ]);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-20 w-full max-w-md text-accent"
      role="img"
      aria-label={`Speed in your last ${records.length} tests, from ${records[0]!.speed} to ${records.at(-1)!.speed}; best ${max}`}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        points={points.map((p) => p.join(",")).join(" ")}
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}

export default function TypingProgress({ languages }: { languages: readonly ProgressLanguage[] }) {
  const [records, setRecords] = useState<TypingRecord[] | null>(null);
  const [saved, setSaved] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [data, setData] = useState<{ slug: string; layouts: Layout[]; words: string[] } | null>(
    null,
  );
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    const all = await listRecords();
    setRecords(all);
    setSlug((s) => s ?? all.at(-1)?.slug ?? null);
  }, []);
  useEffect(() => {
    void reload().catch(() => setRecords([]));
    void persistent().then(setSaved);
  }, [reload]);

  const language = languages.find((l) => l.slug === slug) ?? null;
  const mine = useMemo(() => (records ?? []).filter((r) => r.slug === slug), [records, slug]);

  // The language's layouts and words, when it is shown.
  useEffect(() => {
    if (!slug || data?.slug === slug) return;
    let live = true;
    fetch(`/typing/data/${slug}.json`)
      .then((r) => r.json() as Promise<{ layouts: Layout[]; words: string[] }>)
      .then((d) => live && setData({ slug, ...d }))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [slug, data?.slug]);

  // The layout used most, unless one is picked.
  const layouts = data?.slug === slug ? data.layouts : [];
  const used = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of mine) n.set(r.layout, (n.get(r.layout) ?? 0) + 1);
    return n;
  }, [mine]);
  const keyLayouts = layouts.filter((l) => used.has(l.id));
  const layout =
    keyLayouts.find((l) => l.id === layoutId) ??
    [...keyLayouts].sort((a, b) => used.get(b.id)! - used.get(a.id)!)[0] ??
    null;
  const onLayout = useMemo(() => mine.filter((r) => r.layout === layout?.id), [mine, layout]);
  const counts = useMemo(() => sumKeys(onLayout), [onLayout]);
  const weak = useMemo(() => weakestKeys(counts), [counts]);
  const drillWords = useMemo(
    () => (data && weak.length ? wordsFor(weak, data.words) : []),
    [data, weak],
  );

  const today = utcDay(Date.now());
  const tests = mine.filter((r) => r.activity === "test");
  const bestTest = tests.length ? Math.max(...tests.map((r) => r.speed)) : null;
  const unit = (mine.find((r) => r.unit)?.unit ?? "wpm") === "cpm" ? "CPM" : "WPM";
  const minutes = Math.round(mine.reduce((t, r) => t + r.seconds, 0) / 60);
  const dailyStreak = streak(
    mine.filter((r) => r.activity === "daily").map((r) => r.day),
    today,
  );
  const allBadges = useMemo(() => badges(records ?? [], today), [records, today]);

  // Save the weak-keys drill when it is done.
  useEffect(() => {
    if (!drill || !isFinished(drill) || !layout || !slug) return;
    const result = stats(drill, drill.endedAt!);
    void addRecord(
      recordOf(
        {
          slug,
          layout: layout.id,
          activity: "lesson",
          phone: hasCoarsePointer(),
          detail: "weak-keys",
        },
        result,
        drill.keyCounts,
      ),
    )
      .then(reload)
      .catch(() => {});
    setMessage(`Drill done: ${result.netWpm} ${unit}, ${result.accuracy}% accuracy.`);
    setDrill(null);
  }, [drill, layout, slug, reload, unit]);

  if (records === null) return <p className="text-muted">Loading your progress…</p>;

  const exportAll = () => {
    const body = JSON.stringify(
      { format: "likho-typing", version: 1, exported: new Date().toISOString(), records },
      null,
      1,
    );
    const filename = datedName("typing-progress", "json");
    downloadBlob(new Blob([body], { type: "application/json" }), filename);
    setMessage(`Downloaded ${filename}`);
  };

  const importFile = async (file: File) => {
    try {
      const added = await addRecords(parseExport(await file.text()));
      setMessage(`Imported ${added} new ${added === 1 ? "result" : "results"}.`);
      await reload();
    } catch {
      setMessage("That file is not a typing progress export.");
    }
  };

  const tools = (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BTN} onClick={exportAll} disabled={!records.length}>
        <Download size={16} aria-hidden />
        Export (JSON)
      </button>
      <label className={`${BTN} cursor-pointer`}>
        <Upload size={16} aria-hidden />
        Import
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {records.length > 0 && (
        <button
          type="button"
          className={BTN}
          onClick={async () => {
            if (!confirm("Delete all your typing results on this device?")) return;
            await clearRecords();
            setSlug(null);
            await reload();
            setMessage("Your typing history is deleted.");
          }}
        >
          <Trash2 size={16} aria-hidden />
          Delete my history
        </button>
      )}
    </div>
  );

  if (!records.length) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-border bg-surface p-5">
          No results yet. Take a{" "}
          <a className="text-accent underline" href="/typing">
            typing test
          </a>
          , a tutor lesson or a game, and your progress shows up here.
        </p>
        {tools}
        <p aria-live="polite" className="min-h-5 text-sm text-accent">
          {message}
        </p>
      </div>
    );
  }

  const practised = languages.filter((l) => records.some((r) => r.slug === l.slug));
  const font = language ? FONT_CLASS[language.font] : "";

  return (
    <div className="flex flex-col gap-8">
      {!saved && (
        <p className="rounded-xl border border-bad bg-bad-soft p-3 text-sm">
          This browser isn't keeping data (private browsing?): results last until you close the
          page. Export them to keep them.
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="progress-language" className="text-sm font-medium">
          Language
        </label>
        <select
          id="progress-language"
          value={slug ?? ""}
          onChange={(e) => {
            setSlug(e.target.value);
            setLayoutId(null);
            setDrill(null);
          }}
          className="h-11 max-w-xs rounded-xl border border-border bg-surface px-3 text-text"
        >
          {practised.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name} ({l.native})
            </option>
          ))}
        </select>
      </div>

      {language && (
        <section aria-labelledby="summary-heading" className="flex flex-col gap-4">
          <h2 id="summary-heading" className="text-xl font-semibold">
            {language.name}{" "}
            <span className={`${font} text-accent`} lang={language.lang} dir={language.dir}>
              {language.native}
            </span>
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Best test", bestTest === null ? "–" : `${bestTest} ${unit}`],
              ["Tests", String(tests.length)],
              ["Practice", `${minutes} min`],
              ["Daily streak", `${dailyStreak} ${dailyStreak === 1 ? "day" : "days"}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-surface px-4 py-3">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <SpeedChart records={tests.slice(-30)} />
        </section>
      )}

      {language && (
        <section aria-labelledby="keys-heading" className="flex flex-col gap-3">
          <h2 id="keys-heading" className="text-xl font-semibold">
            Accuracy by key
          </h2>
          {keyLayouts.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Layout">
              {keyLayouts.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={l.id === layout?.id}
                  onClick={() => setLayoutId(l.id)}
                  className={`${BTN} aria-pressed:border-accent aria-pressed:text-accent`}
                >
                  {l.name.en}
                </button>
              ))}
            </div>
          )}
          {layout ? (
            <>
              <KeyHeatmap
                layout={layout}
                counts={counts}
                lang={language.lang}
                dir={language.dir}
                font={language.font}
              />
              {weak.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
                  <p>
                    Keys you miss most:{" "}
                    {weak.map((ch, i) => (
                      <span key={ch}>
                        {i > 0 && ", "}
                        <span className={`${font} text-lg text-accent`} lang={language.lang}>
                          {ch}
                        </span>{" "}
                        <span className="text-sm text-muted tabular-nums">
                          {Math.round(keyAccuracy(counts.get(ch)!) * 100)}%
                        </span>
                      </span>
                    ))}
                  </p>
                  {drill ? (
                    <TypingDrill
                      drill={drill}
                      update={(change) => setDrill((d) => (d ? change(d) : d))}
                      layout={layout}
                      lang={language.lang}
                      dir={language.dir}
                      font={language.font}
                      nativeName={language.native}
                      hint
                      keyboard
                      ownKeyboard={false}
                      label={`Type the ${language.name} words here`}
                    />
                  ) : drillWords.length >= 5 ? (
                    <button
                      type="button"
                      className={`${PRIMARY} self-start`}
                      onClick={() => {
                        setMessage("");
                        setDrill(
                          createDrill(shuffled(drillWords).slice(0, DRILL_WORDS), language.script),
                        );
                      }}
                    >
                      <Target size={16} aria-hidden />
                      Practise these keys
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No weak keys yet: keep practising and the keys you miss show up here.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Loading the keyboard…</p>
          )}
        </section>
      )}

      {language && (
        <section aria-labelledby="history-heading" className="flex flex-col gap-3">
          <h2 id="history-heading" className="text-xl font-semibold">
            History
          </h2>
          <div
            role="region"
            aria-label="Your typing history"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border"
          >
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-start">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">Date</th>
                  <th className="px-3 py-2 text-start font-medium">Activity</th>
                  <th className="px-3 py-2 text-end font-medium">Speed</th>
                  <th className="px-3 py-2 text-end font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {[...mine]
                  .reverse()
                  .slice(0, 50)
                  .map((r) => (
                    <tr key={`${r.at}:${r.activity}`} className="border-t border-border">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(r.at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        {ACTIVITY[r.activity]}
                        {r.score !== undefined && ` · ${r.score} words`}
                        {r.phone && <span className="text-muted"> · phone</span>}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">
                        {r.speed} {r.unit === "cpm" ? "CPM" : "WPM"}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">{r.accuracy}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="badges-heading" className="flex flex-col gap-3">
        <h2 id="badges-heading" className="text-xl font-semibold">
          Badges
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {allBadges.map((b) => (
            <li
              key={b.id}
              data-badge={b.id}
              data-earned={b.earned}
              className={`flex gap-2 rounded-xl border p-3 ${
                b.earned ? "border-accent bg-accent-soft" : "border-border bg-surface text-muted"
              }`}
            >
              <Award
                size={20}
                aria-hidden
                className={b.earned ? "shrink-0 text-accent" : "shrink-0"}
              />
              <span className="flex flex-col">
                <span className="font-medium">
                  {b.title}
                  <span className="sr-only">{b.earned ? " (earned)" : " (not yet)"}</span>
                </span>
                <span className="text-xs">{b.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data-heading" className="flex flex-col gap-3">
        <h2 id="data-heading" className="text-xl font-semibold">
          Your data
        </h2>
        <p className="text-sm text-muted">
          {records.length} results, kept in this browser only. Export them to a file to move them to
          another device.
        </p>
        {tools}
        <p aria-live="polite" className="min-h-5 text-sm text-accent">
          {message}
        </p>
      </section>
    </div>
  );
}
