import {
  CURRENCIES,
  numberToWords,
  parseAmount,
  type EnglishSystem,
  type WordsLanguage,
} from "@okb/text-tools/number-words";
import { Copy } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText } from "../keyboard/actions";

const LANGUAGES: readonly { id: WordsLanguage; name: string; native: string; lang: string }[] = [
  { id: "ur", name: "Urdu", native: "اردو", lang: "ur" },
  { id: "hi", name: "Hindi", native: "हिन्दी", lang: "hi" },
  { id: "bn", name: "Bangla", native: "বাংলা", lang: "bn" },
  { id: "ar", name: "Arabic", native: "العربية", lang: "ar" },
  { id: "en", name: "English", native: "English", lang: "en" },
];
const RTL = new Set<WordsLanguage>(["ur", "ar"]);
const FONT: Readonly<Record<WordsLanguage, string>> = {
  ur: "font-nastaliq",
  ar: "font-naskh",
  hi: "font-devanagari",
  bn: "font-bengali",
  en: "",
};
/** Currencies with lakh and crore in English; the rest use million and billion. */
const INDIAN = new Set(["PKR", "INR", "BDT", "NPR"]);
const ONLY_WORD: Readonly<Record<WordsLanguage, string>> = {
  ur: "صرف",
  hi: "मात्र",
  bn: "মাত্র",
  ar: "فقط … لا غير",
  en: "Only",
};

interface Settings {
  language: WordsLanguage;
  currency: string;
  only: boolean;
  croreOnly: boolean;
  miah: boolean;
  system: EnglishSystem;
}
const DEFAULTS: Settings = {
  language: "ur",
  currency: "PKR",
  only: true,
  croreOnly: false,
  miah: false,
  system: "indian",
};
const STORE = "number-to-words:settings";
const BY_BROWSER: Readonly<Record<string, Partial<Settings>>> = {
  ur: { language: "ur", currency: "PKR" },
  hi: { language: "hi", currency: "INR" },
  bn: { language: "bn", currency: "BDT" },
  ar: { language: "ar", currency: "SAR" },
};

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const SELECT =
  "min-h-11 rounded-lg border border-border bg-surface px-2 text-base text-text sm:min-h-9 sm:text-sm";
const CHECK = "flex min-h-11 items-center gap-2 text-sm sm:min-h-9";
const icon = { size: 16, "aria-hidden": true } as const;

const REASONS = {
  invalid: "Type a number, such as 125000 or 1,25,000.50.",
  "too-large": "Numbers up to 18 digits can be spelled.",
  decimals: "has fewer decimal places than that.",
} as const;

/**
 * Number to words (plan item 10.3): an amount in Urdu, Hindi, Bangla, Arabic or English, as
 * it goes on a cheque, with the English line beside it. Text never leaves the page.
 */
export default function NumberToWords() {
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const id = useId();
  const outputs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    let saved: Partial<Settings> | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<Settings> | null;
    } catch {
      // nothing saved, or storage blocked
    }
    const guess = BY_BROWSER[navigator.language.toLowerCase().split("-")[0]!];
    setSettings((s) => ({ ...s, ...guess, ...saved }));
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
  const chooseLanguage = (language: WordsLanguage) => {
    const list = CURRENCIES[language] as { id: string }[];
    const currency = list.some((c) => c.id === settings.currency)
      ? settings.currency
      : settings.currency
        ? list[0]!.id
        : "";
    update({ language, currency });
  };

  const currencies = CURRENCIES[settings.language] as {
    id: string;
    name: string;
    decimals: number;
  }[];
  const currency = currencies.find((c) => c.id === settings.currency);
  const southAsian = ["ur", "hi", "bn"].includes(settings.language);
  const englishCurrency = (CURRENCIES.en as { id: string }[]).some(
    (c) => c.id === settings.currency,
  )
    ? settings.currency
    : "";
  const englishSystem: EnglishSystem =
    settings.language === "en"
      ? settings.system
      : settings.currency
        ? INDIAN.has(settings.currency)
          ? "indian"
          : "international"
        : settings.language === "ar"
          ? "international"
          : "indian";

  const results = useMemo(() => {
    if (!input.trim()) return [];
    const opts = {
      only: settings.only && !!settings.currency,
      croreOnly: settings.croreOnly,
      miah: settings.miah,
    };
    const main = numberToWords(input, settings.language, {
      ...opts,
      currency: settings.currency,
      system: settings.system,
    });
    const out = [{ language: settings.language, result: main }];
    if (settings.language !== "en") {
      out.push({
        language: "en" as WordsLanguage,
        result: numberToWords(input, "en", {
          ...opts,
          currency: englishCurrency,
          system: englishSystem,
        }),
      });
    }
    return out;
  }, [input, settings, englishCurrency, englishSystem]);

  const figures = useMemo(() => {
    const amount = parseAmount(input);
    if (!amount) return "";
    const grouping = englishSystem === "indian" ? "en-IN" : "en-US";
    const int = new Intl.NumberFormat(grouping).format(amount.int);
    const decimals = currency?.decimals ?? amount.frac.length;
    const frac = decimals ? `.${amount.frac.padEnd(decimals, "0").slice(0, decimals)}` : "";
    return `${settings.currency ? `${settings.currency} ` : ""}${int}${frac}${settings.currency && settings.only ? "/-" : ""}`;
  }, [input, englishSystem, currency, settings.currency, settings.only]);

  const copy = async (i: number) => {
    const el = outputs.current[i];
    if (el && (await copyText(el))) setAnnouncement("Copied");
  };
  const error = results.find((r) => !r.result.ok)?.result;

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-n`} className="text-sm font-medium">
          Number or amount
        </label>
        <input
          id={`${id}-n`}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="125000.50"
          aria-describedby={`${id}-err`}
          className="min-h-12 w-full max-w-md rounded-xl border border-border bg-surface px-4 text-xl text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
        />
        <p id={`${id}-err`} className="min-h-5 text-sm text-muted" aria-live="polite">
          {error && !error.ok
            ? error.reason === "decimals"
              ? `${currency?.name ?? "This currency"} ${REASONS.decimals}`
              : REASONS[error.reason]
            : figures && `In figures: ${figures}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span id={`${id}-lang`} className="text-sm font-medium">
          Language
        </span>
        <div role="group" aria-labelledby={`${id}-lang`} className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={settings.language === l.id}
              onClick={() => chooseLanguage(l.id)}
              className={`min-h-11 rounded-lg border px-3 text-sm sm:min-h-9 ${
                settings.language === l.id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface text-text hover:bg-surface-2"
              }`}
            >
              {l.name}
              {l.id !== "en" && (
                <span lang={l.lang} className={`ms-1.5 ${FONT[l.id]}`}>
                  {l.native}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Currency</span>
          <select
            value={settings.currency}
            onChange={(e) => update({ currency: e.currentTarget.value })}
            className={SELECT}
          >
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
            <option value="">None: just the number</option>
          </select>
        </label>
        {settings.language === "en" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Numbering</span>
            <select
              value={settings.system}
              onChange={(e) => update({ system: e.currentTarget.value as EnglishSystem })}
              className={SELECT}
            >
              <option value="indian">Lakh and crore</option>
              <option value="international">Million and billion</option>
            </select>
          </label>
        )}
      </div>
      <div className="-mt-2 flex flex-wrap gap-x-5">
        {settings.currency && (
          <label className={CHECK}>
            <input
              type="checkbox"
              checked={settings.only}
              onChange={(e) => update({ only: e.currentTarget.checked })}
            />
            <span>
              Add “only” for a cheque{" "}
              <span lang={settings.language} className={FONT[settings.language]}>
                ({ONLY_WORD[settings.language]})
              </span>
            </span>
          </label>
        )}
        {southAsian && (
          <label className={CHECK}>
            <input
              type="checkbox"
              checked={settings.croreOnly}
              onChange={(e) => update({ croreOnly: e.currentTarget.checked })}
            />
            Above 99 crore, count in crores (100 crore, not 1 arab)
          </label>
        )}
        {settings.language === "ar" && (
          <label className={CHECK}>
            <input
              type="checkbox"
              checked={settings.miah}
              onChange={(e) => update({ miah: e.currentTarget.checked })}
            />
            <span>
              Write hundred as <span lang="ar">مئة</span>, not <span lang="ar">مائة</span>
            </span>
          </label>
        )}
      </div>

      {results.map(({ language, result }, i) => {
        const l = LANGUAGES.find((x) => x.id === language)!;
        const label = `In ${l.name}`;
        return (
          <section key={language} aria-label={label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{label}</h2>
              <button
                type="button"
                className={BTN}
                disabled={!result.ok}
                onClick={() => void copy(i)}
                aria-label={`Copy ${label}`}
              >
                <Copy {...icon} /> Copy
              </button>
            </div>
            <textarea
              ref={(el) => {
                outputs.current[i] = el;
              }}
              readOnly
              rows={3}
              lang={l.lang}
              dir={RTL.has(language) ? "rtl" : "ltr"}
              value={result.ok ? result.text : ""}
              aria-label={`${label} result`}
              className={`min-h-24 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-xl text-text shadow-sm [field-sizing:content] ${FONT[language]}`}
            />
          </section>
        );
      })}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
