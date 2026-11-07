import {
  countText,
  READING_WPM,
  smsParts,
  SPEAKING_WPM,
  topWords,
  xLength,
  X_MAX,
  type ScriptCount,
} from "@okb/text-tools/counter";
import { Eraser } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";

const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-lg text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const icon = { size: 16, "aria-hidden": true } as const;
const n = (v: number) => v.toLocaleString("en");
/** Accented Latin letters, general punctuation and currency signs: easy to type by accident. */
const SURPRISING = /^[\u{80}-\u{36F}\u{1E00}-\u{1EFF}\u{2000}-\u{20CF}]/u;

/** Script names as the page shows them. */
const SCRIPT_NAMES: Partial<Record<ScriptCount["script"], string>> = {
  Bengali: "Bangla",
  Oriya: "Odia",
  Myanmar: "Burmese",
  Han: "Chinese characters (Han)",
  Hangul: "Korean (Hangul)",
  Ol_Chiki: "Ol Chiki",
  Nko: "N'Ko",
  Canadian_Aboriginal: "Canadian syllabics",
  Tai_Le: "Tai Le",
  New_Tai_Lue: "New Tai Lue",
  Tai_Tham: "Tai Tham",
  Meetei_Mayek: "Meetei Mayek",
};

function minutes(words: number, wpm: number): string {
  if (!words) return "0 sec";
  const seconds = Math.max(1, Math.round((words / wpm) * 60));
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/**
 * Word and character counter (plan item 10.3): characters as a reader sees them in every
 * script, words in Thai, Chinese and Japanese too, SMS parts and the length on X. Text never
 * leaves the page.
 */
export default function WordCounter() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const id = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const c = useMemo(() => countText(deferred), [deferred]);
  const sms = useMemo(() => smsParts(deferred), [deferred]);
  const x = useMemo(() => xLength(deferred), [deferred]);
  const top = useMemo(() => topWords(deferred, 10), [deferred]);
  // Punctuation and Latin letters first: a curly quote or an accent is the surprise; a
  // message in Urdu or Hindi is Unicode anyway.
  const culprits = useMemo(
    () => [...sms.nonGsm].sort((a, b) => Number(SURPRISING.test(b)) - Number(SURPRISING.test(a))),
    [sms],
  );

  const details: [string, number, string?][] = [
    ["Letters and digits", c.letters],
    ["Lines", c.lines, c.lines !== c.nonEmptyLines ? `${n(c.nonEmptyLines)} not empty` : undefined],
    ["Emoji", c.emoji],
    ["Code points", c.codePoints],
    ["UTF-16 units", c.utf16, "what maxlength and many counters count"],
    ["UTF-8 bytes", c.utf8Bytes],
  ];
  if (c.cjk)
    details.splice(1, 0, [
      "Chinese and Japanese characters",
      c.cjk,
      "each a word in Microsoft Word",
    ]);

  return (
    <div className="flex flex-col gap-5" data-ready={ready || undefined}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${id}-text`} className="text-sm font-medium">
            Your text
          </label>
          <button type="button" className={BTN} disabled={!text} onClick={() => setText("")}>
            <Eraser {...icon} /> Clear
          </button>
        </div>
        <textarea
          id={`${id}-text`}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={7}
          placeholder="Type or paste text in any language"
          className={`${AREA} min-h-44`}
          style={{ lineHeight: 1.8 }}
        />
      </div>

      <section aria-labelledby={`${id}-counts`}>
        <h2 id={`${id}-counts`} className="sr-only">
          Counts
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Words" value={n(c.words)} />
          <Stat label="Characters" value={n(c.characters)} />
          <Stat label="Without spaces" value={n(c.charactersNoSpaces)} />
          <Stat label="Sentences" value={n(c.sentences)} />
          <Stat label="Paragraphs" value={n(c.paragraphs)} />
          <Stat
            label="Reading time"
            value={minutes(c.words, READING_WPM)}
            hint={`aloud ${minutes(c.words, SPEAKING_WPM)}`}
          />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section
          aria-labelledby={`${id}-limits`}
          className="min-w-0 rounded-xl border border-border bg-surface p-4"
        >
          <h2 id={`${id}-limits`} className="mb-2 font-semibold">
            Message limits
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="font-medium">SMS</dt>
              <dd className="text-muted">
                {sms.parts === 0
                  ? "Empty"
                  : `${n(sms.parts)} ${sms.parts === 1 ? "message" : "messages"}, room for ${n(sms.remaining)} more`}
              </dd>
              <dd className="text-muted">
                {sms.encoding === "GSM-7"
                  ? `Plain GSM characters: ${sms.perPart} a ${sms.parts > 1 ? "part" : "message"}`
                  : `Unicode (UCS-2): ${sms.perPart} a ${sms.parts > 1 ? "part" : "message"}`}
              </dd>
              {culprits.length > 0 && (
                <dd className="mt-1 flex flex-wrap items-center gap-1 text-muted">
                  Unicode because of
                  {culprits.slice(0, 8).map((ch) => (
                    <kbd
                      key={ch}
                      className="rounded border border-border bg-surface-2 px-1.5 font-sans text-text"
                    >
                      <bdi>{ch}</bdi>
                    </kbd>
                  ))}
                  {culprits.length > 8 && <span>and {n(culprits.length - 8)} more</span>}
                </dd>
              )}
            </div>
            <div>
              <dt className="font-medium">X (Twitter)</dt>
              <dd className={x > X_MAX ? "font-medium text-bad" : "text-muted"}>
                {n(x)} of {n(X_MAX)}
                {x > X_MAX ? `, ${n(x - X_MAX)} over` : `, ${n(X_MAX - x)} left`}
              </dd>
            </div>
          </dl>
        </section>

        <section
          aria-labelledby={`${id}-details`}
          className="min-w-0 rounded-xl border border-border bg-surface p-4"
        >
          <h2 id={`${id}-details`} className="mb-2 font-semibold">
            More counts
          </h2>
          <dl className="flex flex-col gap-1 text-sm">
            {details.map(([label, value, hint]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted">
                  {label}
                  {hint && <span className="block text-xs">{hint}</span>}
                </dt>
                <dd className="text-end tabular-nums">{n(value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        {c.scripts.length > 0 && (
          <section
            aria-labelledby={`${id}-scripts`}
            className="min-w-0 rounded-xl border border-border bg-surface p-4"
          >
            <h2 id={`${id}-scripts`} className="mb-2 font-semibold">
              Scripts
            </h2>
            <dl className="flex flex-col gap-1 text-sm">
              {c.scripts.map((s) => (
                <div key={s.script} className="flex justify-between gap-4">
                  <dt className="text-muted">{SCRIPT_NAMES[s.script] ?? s.script}</dt>
                  <dd className="text-end tabular-nums">{n(s.characters)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {top.length > 0 && (
          <section
            aria-labelledby={`${id}-top`}
            className="min-w-0 rounded-xl border border-border bg-surface p-4"
          >
            <h2 id={`${id}-top`} className="mb-2 font-semibold">
              Most used words
            </h2>
            <ol className="flex flex-col gap-1 text-sm">
              {top.map((w) => (
                <li key={w.word} className="flex justify-between gap-4">
                  <span dir="auto" className="min-w-0 truncate">
                    {w.word}
                  </span>
                  <span className="text-end text-muted tabular-nums">{n(w.count)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
