import { CASE_MODES, convertCase, hasCase, textCounts, type CaseMode } from "@okb/engine/case";
import { Copy } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText } from "../keyboard/actions";

/** Languages with case rules of their own, then the rest of Europe's big ones. */
const LANGUAGES: readonly [string, string][] = [
  ["en", "English"],
  ["tr", "Turkish"],
  ["az", "Azerbaijani"],
  ["de", "German"],
  ["el", "Greek"],
  ["nl", "Dutch"],
  ["ga", "Irish"],
  ["fr", "French"],
  ["es", "Spanish"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["lt", "Lithuanian"],
  ["pl", "Polish"],
  ["ru", "Russian"],
];

/** Each style's name, written in its own style. */
const LABELS: Readonly<Record<CaseMode, string>> = {
  upper: "UPPER CASE",
  lower: "lower case",
  sentence: "Sentence case",
  title: "Title Case",
  capitalise: "Capitalise Each Word",
  inverse: "iNVERSE cASE",
  alternating: "aLtErNaTiNg cAsE",
};

/** What a language changes, shown under the picker. */
const NOTES: Readonly<Record<string, string>> = {
  tr: "Turkish has a dotted and a dotless i: i ↔ İ and ı ↔ I.",
  az: "Azerbaijani has a dotted and a dotless i: i ↔ İ and ı ↔ I.",
  de: "ß becomes SS in capitals, or the capital ẞ if you prefer.",
  el: "Capitals drop the accent (Μάιος → ΜΑΪΟΣ), and lower case ends words in ς.",
  nl: "IJ is capitalised together: IJsland, IJsselmeer.",
  ga: "Prefixes stay small before a capital: an tAthair, i mBaile, na hÉireann.",
  en: "Title case keeps short words like of, the and and small.",
  fr: "Title case keeps short words like de, la and et small.",
  es: "Title case keeps short words like de, la and y small.",
  it: "Title case keeps short words like di, della and e small.",
  pt: "Title case keeps short words like de, da and e small.",
};

const STORE = "case-converter:language";
const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";

/**
 * Case converter (plan item 7.6): every style at once, live as you type, each with its own
 * Copy button, following the chosen language's rules. Text never leaves the page.
 */
export default function CaseConverter() {
  const [text, setText] = useState("");
  const [locale, setLocale] = useState("en");
  const [capitalSharpS, setCapitalSharpS] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const inputId = useId();
  const outputs = useRef<Partial<Record<CaseMode, HTMLTextAreaElement | null>>>({});

  // The last language chosen, or the browser's, if it is one of ours.
  useEffect(() => {
    const saved = localStorage.getItem(STORE);
    const browser = navigator.language.toLowerCase().split("-")[0]!;
    const pick = [saved, browser].find((l) => l && LANGUAGES.some(([code]) => code === l));
    if (pick) setLocale(pick);
    setReady(true);
  }, []);

  const choose = (l: string) => {
    setLocale(l);
    localStorage.setItem(STORE, l);
  };

  const results = useMemo(
    () =>
      CASE_MODES.map((mode) => [mode, convertCase(text, mode, { locale, capitalSharpS })] as const),
    [text, locale, capitalSharpS],
  );
  const counts = useMemo(() => textCounts(text, locale), [text, locale]);
  const caseless = text.trim() !== "" && !hasCase(text);

  const copy = async (mode: CaseMode) => {
    const el = outputs.current[mode];
    if (el && (await copyText(el))) setAnnouncement(`${LABELS[mode]} copied`);
  };

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Language rules</span>
          <select
            value={locale}
            onChange={(e) => choose(e.currentTarget.value)}
            className="min-h-11 rounded-lg border border-border bg-surface px-2 text-text sm:min-h-9"
          >
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {locale === "de" && (
          <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
            <input
              type="checkbox"
              checked={capitalSharpS}
              onChange={(e) => setCapitalSharpS(e.currentTarget.checked)}
            />
            Capital ẞ instead of SS
          </label>
        )}
      </div>
      {NOTES[locale] && <p className="-mt-2 text-sm text-muted">{NOTES[locale]}</p>}

      <div>
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
          Your text
        </label>
        <textarea
          id={inputId}
          lang={locale}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={5}
          spellCheck={false}
          placeholder="Type or paste text here"
          className={`${AREA} min-h-32`}
        />
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {counts.characters.toLocaleString("en")} characters · {counts.words.toLocaleString("en")}{" "}
          words · {counts.lines.toLocaleString("en")} lines
        </p>
        {caseless && (
          <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            This script has no capital letters (Arabic, Devanagari and Chinese, for example), so
            every style shows the text unchanged.
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {results.map(([mode, out]) => (
          <section key={mode} aria-label={LABELS[mode]} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{LABELS[mode]}</h2>
              <button
                type="button"
                className={BTN}
                disabled={!out}
                onClick={() => void copy(mode)}
                aria-label={`Copy ${LABELS[mode]}`}
              >
                <Copy aria-hidden="true" size={16} /> Copy
              </button>
            </div>
            <textarea
              ref={(el) => {
                outputs.current[mode] = el;
              }}
              readOnly
              lang={locale}
              value={out}
              rows={3}
              aria-label={`${LABELS[mode]} result`}
              className={AREA}
            />
          </section>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
