import {
  DEFAULT_REMOVE,
  removeDiacritics,
  type LatinSpelling,
  type MarkGroup,
} from "@okb/text-tools/diacritics";
import { Copy, Download, Eraser } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText, downloadText } from "../keyboard/actions";

/** Each choice on the page: the group it controls, its label, and the script it belongs to. */
const CHOICES: readonly { group: MarkGroup; label: string; hint?: string }[][] = [
  [
    {
      group: "vowels",
      label: "Vowel marks",
      hint: "zabar, zer, pesh, tanween, jazm (fatha, kasra, damma, sukun)",
    },
    { group: "shadda", label: "Shadda (tashdid) ّ" },
    { group: "dagger", label: "Superscript alef (khari zabar) ٰ" },
    { group: "quranic", label: "Quranic signs, and ٱ as ا" },
    { group: "tatweel", label: "Tatweel (kashida) ـ" },
    { group: "ezafe", label: "Persian ezafe (خانهٔ → خانه)" },
    { group: "alef", label: "Hamza and madda on alef (أ إ آ → ا)" },
  ],
  [
    { group: "niqqud", label: "Niqqud", hint: "vowel points, dagesh, meteg" },
    { group: "shinDots", label: "Shin and sin dots (שׁ שׂ)" },
    { group: "cantillation", label: "Cantillation (te'amim)" },
  ],
  [
    { group: "accents", label: "Accents (é ñ ł ø, Greek tonos)" },
    { group: "stress", label: "Russian stress marks (молоко́)" },
    { group: "yo", label: "ё as е" },
  ],
];
const HEADINGS = ["Arabic, Urdu and Persian", "Hebrew", "Latin, Greek and Cyrillic"];

const SPELLINGS: readonly [LatinSpelling, string][] = [
  ["none", "Remove the marks only"],
  ["de", "German: ä → ae, ö → oe, ü → ue, ß → ss"],
  ["da", "Danish and Norwegian: å → aa, æ → ae, ø → oe"],
];

/** What each group's count is called in the summary. */
const COUNT_NAMES: Readonly<Record<MarkGroup, [string, string]>> = {
  vowels: ["vowel mark", "vowel marks"],
  shadda: ["shadda", "shaddas"],
  dagger: ["superscript alef", "superscript alefs"],
  quranic: ["Quranic sign", "Quranic signs"],
  tatweel: ["tatweel", "tatweels"],
  ezafe: ["ezafe sign", "ezafe signs"],
  alef: ["hamza or madda", "hamzas and maddas"],
  niqqud: ["niqqud mark", "niqqud marks"],
  shinDots: ["shin or sin dot", "shin and sin dots"],
  cantillation: ["cantillation mark", "cantillation marks"],
  accents: ["accent", "accents"],
  stress: ["stress mark", "stress marks"],
  yo: ["ё", "ё"],
};

interface Settings {
  remove: MarkGroup[];
  ascii: boolean;
  spelling: LatinSpelling;
  keep: string;
  quranSpelling: boolean;
}
const DEFAULTS: Settings = {
  remove: [...DEFAULT_REMOVE],
  ascii: false,
  spelling: "none",
  keep: "",
  quranSpelling: false,
};
const STORE = "remove-diacritics:settings";

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-lg text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const SCRIPT_FONTS = {
  fontFamily: '"Inter Variable", "Noto Naskh Arabic", "Noto Sans Hebrew", system-ui, sans-serif',
  lineHeight: 2,
};
const icon = { size: 16, "aria-hidden": true } as const;

/**
 * Diacritics remover (plan item 10.3): harakat, niqqud, accents and stress marks, live as you
 * type, with a choice for each kind of mark. Text never leaves the page.
 */
export default function DiacriticsRemover() {
  const [text, setText] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const inputId = useId();
  const keepId = useId();
  const output = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<Settings> | null;
      if (saved) setSettings({ ...DEFAULTS, ...saved });
    } catch {
      // nothing saved, or storage blocked: keep the defaults
    }
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
  const toggle = (group: MarkGroup, on: boolean) =>
    update({
      remove: on ? [...settings.remove, group] : settings.remove.filter((g) => g !== group),
    });

  const result = useMemo(
    () =>
      removeDiacritics(text, {
        remove: new Set(settings.remove),
        latin: settings.ascii ? "ascii" : "accents",
        spelling: settings.spelling,
        keep: settings.keep,
        quranSpelling: settings.quranSpelling,
      }),
    [text, settings],
  );

  const summary = useMemo(() => {
    const parts = (Object.entries(result.removed) as [MarkGroup, number][])
      .filter(([, n]) => n > 0)
      .map(([g, n]) => `${n.toLocaleString("en")} ${COUNT_NAMES[g][n === 1 ? 0 : 1]}`);
    if (!text) return "";
    return parts.length ? `Removed ${parts.join(", ")}.` : "Nothing to remove with these choices.";
  }, [result, text]);

  const copy = async () => {
    if (output.current && (await copyText(output.current))) setAnnouncement("Copied");
  };

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
          rows={5}
          spellCheck={false}
          placeholder="Paste text with diacritics: مُحَمَّدٌ, שָׁלוֹם, café, молоко́"
          className={`${AREA} min-h-32`}
          style={SCRIPT_FONTS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${inputId}-out`} className="text-sm font-medium">
            Without diacritics
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
                setAnnouncement(`Downloaded ${downloadText(result.text, "no-diacritics")}`)
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
          rows={5}
          className={`${AREA} min-h-32`}
          style={SCRIPT_FONTS}
        />
        <p className="text-sm text-muted" aria-live="polite">
          {summary}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CHOICES.map((choices, i) => (
          <fieldset
            key={HEADINGS[i]}
            className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <legend className="px-1 text-sm font-semibold">{HEADINGS[i]}</legend>
            <div className="flex flex-col">
              {choices.map(({ group, label, hint }) => (
                <label key={group} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
                  <input
                    type="checkbox"
                    checked={settings.remove.includes(group)}
                    onChange={(e) => toggle(group, e.currentTarget.checked)}
                  />
                  <span>
                    {label}
                    {hint && <span className="block text-xs text-muted">{hint}</span>}
                  </span>
                </label>
              ))}
              {i === 0 && (
                <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
                  <input
                    type="checkbox"
                    checked={settings.quranSpelling}
                    onChange={(e) => update({ quranSpelling: e.currentTarget.checked })}
                  />
                  <span>
                    Quranic text: write ٰ as ا
                    <span className="block text-xs text-muted">ٱلْكِتَٰبُ → الكتاب, not الكتب</span>
                  </span>
                </label>
              )}
              {i === 2 && (
                <>
                  <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
                    <input
                      type="checkbox"
                      checked={settings.ascii}
                      onChange={(e) => update({ ascii: e.currentTarget.checked })}
                    />
                    <span>
                      Plain ASCII letters
                      <span className="block text-xs text-muted">ß → ss, æ → ae, þ → th</span>
                    </span>
                  </label>
                  <label className="mt-2 flex flex-col gap-1 text-sm">
                    <span>Spelling</span>
                    <select
                      value={settings.spelling}
                      onChange={(e) => update({ spelling: e.currentTarget.value as LatinSpelling })}
                      className="min-h-11 rounded-lg border border-border bg-surface px-2 text-text sm:min-h-9"
                    >
                      {SPELLINGS.map(([value, name]) => (
                        <option key={value} value={value}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor={keepId} className="mt-2 text-sm">
                    Keep these letters
                  </label>
                  <input
                    id={keepId}
                    value={settings.keep}
                    onChange={(e) => update({ keep: e.currentTarget.value })}
                    placeholder="e.g. ñÑ for Spanish"
                    className="mt-1 min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-text sm:min-h-9"
                  />
                </>
              )}
            </div>
          </fieldset>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
