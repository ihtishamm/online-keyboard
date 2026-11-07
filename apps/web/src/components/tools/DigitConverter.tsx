import { convertDigits, digitsOf, DIGIT_SYSTEMS, type Grouping } from "@okb/text-tools/digits";
import { Copy, Download, Eraser } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText, downloadText } from "../keyboard/actions";

/** The sets most visitors want, as one-tap buttons; the rest are in the list. */
const QUICK = ["latn", "arab", "arabext", "deva", "beng"] as const;
const NAMES = new Map(DIGIT_SYSTEMS.map((s) => [s.id, s.name]));

/** A first guess at the set a visitor wants, from the browser's language. */
const BY_LANGUAGE: Readonly<Record<string, string>> = {
  ar: "arab",
  fa: "arabext",
  ur: "arabext",
  ps: "arabext",
  sd: "arabext",
  hi: "deva",
  mr: "deva",
  ne: "deva",
  bn: "beng",
  pa: "guru",
  gu: "gujr",
  ta: "tamldec",
  te: "telu",
  kn: "knda",
  ml: "mlym",
  th: "thai",
  my: "mymr",
  km: "khmr",
  lo: "laoo",
};

interface Settings {
  to: string;
  separators: boolean;
  skipLatin: boolean;
  grouping: Grouping;
}
const STORE = "digit-converter:settings";

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-lg text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const SELECT =
  "min-h-11 rounded-lg border border-border bg-surface px-2 text-base text-text sm:min-h-9 sm:text-sm";
const icon = { size: 16, "aria-hidden": true } as const;
const sample = (id: string) => digitsOf(id).slice(0, 4).join("");

/**
 * Digit converter (plan item 10.3): every digit in the text written in the chosen set, live as
 * you type, with Arabic separators and lakh grouping on request. Text never leaves the page.
 */
export default function DigitConverter() {
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<Settings>({
    to: "arabext",
    separators: true,
    skipLatin: true,
    grouping: "keep",
  });
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const inputId = useId();
  const output = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let saved: Partial<Settings> | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<Settings> | null;
    } catch {
      // nothing saved, or storage blocked
    }
    const guess = BY_LANGUAGE[navigator.language.toLowerCase().split("-")[0]!];
    setSettings((s) => ({ ...s, ...(guess ? { to: guess } : {}), ...saved }));
    setReady(true);
  }, []);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };

  const result = useMemo(
    () =>
      convertDigits(text, settings.to, {
        separators: settings.separators,
        skipLatin: settings.skipLatin,
        grouping: settings.grouping,
      }),
    [text, settings],
  );

  const summary = useMemo(() => {
    const found = Object.entries(result.found)
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => `${n.toLocaleString("en")} ${NAMES.get(id) ?? "other"}`);
    if (!text) return "";
    if (!found.length) return "No digits in this text.";
    return `Found ${found.join(", ")} ${found.length === 1 && result.found[found[0]!] === 1 ? "digit" : "digits"}; ${result.converted.toLocaleString("en")} changed.`;
  }, [result, text]);

  const copy = async () => {
    if (output.current && (await copyText(output.current))) setAnnouncement("Copied");
  };
  const target = DIGIT_SYSTEMS.find((s) => s.id === settings.to)!;

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined}>
      <div>
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
          Your text
        </label>
        <textarea
          id={inputId}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={4}
          spellCheck={false}
          placeholder="Type or paste text with numbers: 2025, ١٢٣, ۴۵۶, १२३"
          className={`${AREA} min-h-28 font-naskh`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id={`${inputId}-to`} className="text-sm font-medium">
          Convert to
        </span>
        <div role="group" aria-labelledby={`${inputId}-to`} className="flex flex-wrap gap-2">
          {QUICK.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={settings.to === id}
              onClick={() => update({ to: id })}
              className={`min-h-11 rounded-lg border px-3 text-sm sm:min-h-9 ${
                settings.to === id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface text-text hover:bg-surface-2"
              }`}
            >
              {NAMES.get(id)} <span className="font-naskh">{sample(id)}</span>
            </button>
          ))}
          <label className="sr-only" htmlFor={`${inputId}-all`}>
            All digit sets
          </label>
          <select
            id={`${inputId}-all`}
            value={settings.to}
            onChange={(e) => update({ to: e.currentTarget.value })}
            className={SELECT}
          >
            {DIGIT_SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {sample(s.id)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted">Used for {target.used}.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${inputId}-out`} className="text-sm font-medium">
            In {target.name} digits
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN} disabled={!text} onClick={() => void copy()}>
              <Copy {...icon} /> Copy
            </button>
            <button
              type="button"
              className={BTN}
              disabled={!text}
              onClick={() =>
                setAnnouncement(`Downloaded ${downloadText(result.text, `digits-${settings.to}`)}`)
              }
            >
              <Download {...icon} /> Download .txt
            </button>
            <button type="button" className={BTN} disabled={!text} onClick={() => setText("")}>
              <Eraser {...icon} /> Clear
            </button>
          </div>
        </div>
        <textarea
          id={`${inputId}-out`}
          ref={output}
          readOnly
          dir="auto"
          value={result.text}
          rows={4}
          className={`${AREA} min-h-28 font-naskh`}
        />
        <p className="text-sm text-muted" aria-live="polite">
          {summary}
        </p>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3">
        <legend className="px-1 text-sm font-semibold">Options</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
          <input
            type="checkbox"
            checked={settings.separators}
            onChange={(e) => update({ separators: e.currentTarget.checked })}
          />
          <span>
            Separators to match
            <span className="block text-xs text-muted">
              ٫ ٬ ٪ with Arabic and Persian digits; . , % with the others
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
          <input
            type="checkbox"
            checked={settings.skipLatin}
            onChange={(e) => update({ skipLatin: e.currentTarget.checked })}
          />
          <span>
            Leave numbers in English words alone
            <span className="block text-xs text-muted">COVID-19, MP3, H2O</span>
          </span>
        </label>
        <label className="mt-1 flex flex-col gap-1 text-sm">
          <span>Group large numbers</span>
          <select
            value={settings.grouping}
            onChange={(e) => update({ grouping: e.currentTarget.value as Grouping })}
            className={SELECT}
          >
            <option value="keep">As typed</option>
            <option value="indian">Lakh and crore: 1,25,00,075</option>
            <option value="western">Thousands: 12,500,075</option>
            <option value="none">No grouping: 12500075</option>
          </select>
        </label>
      </fieldset>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
