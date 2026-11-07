import { fixPdfText, type PdfFixChanges, type PdfOrder } from "@okb/text-tools/pdf-text";
import { Copy, Download, Eraser } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { loadDictionary } from "../keyboard/dictionary";
import { copyText, downloadText } from "../keyboard/actions";

const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-lg text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const SELECT =
  "min-h-11 rounded-lg border border-border bg-surface px-2 text-base text-text sm:min-h-9 sm:text-sm";
const SCRIPT_FONTS = {
  fontFamily: '"Noto Naskh Arabic", "Inter Variable", system-ui, sans-serif',
  lineHeight: 2,
};
const icon = { size: 16, "aria-hidden": true } as const;

const ORDERS: readonly [PdfOrder, string][] = [
  ["auto", "Automatic, line by line"],
  ["letters", "Every line is backwards, letter by letter"],
  ["words", "Every line has its words backwards"],
  ["keep", "The order is right; fix the letters only"],
];
const STORE = "fix-pdf-text:order";

/** Which word list to check words against: Urdu and Persian letters give the language away. */
function languageOf(text: string): "ur" | "fa" | "ar" | null {
  if (!/\p{Script=Arabic}/u.test(text)) return null;
  if (/[ٹڈڑںےۓھہ\u{FB66}-\u{FBAF}]/u.test(text)) return "ur";
  if (/[پچژگکی\u{FB56}-\u{FB59}\u{FB7A}-\u{FB7D}\u{FB8A}-\u{FB95}\u{FBFC}-\u{FBFF}]/u.test(text))
    return "fa";
  return "ar";
}

const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

function summarize(c: PdfFixChanges): string {
  const parts: string[] = [];
  if (c.forms)
    parts.push(`turned ${plural(c.forms, "letter shape", "letter shapes")} into letters`);
  if (c.letterLines)
    parts.push(`reversed ${plural(c.letterLines, "line", "lines")} letter by letter`);
  if (c.wordLines) parts.push(`put the words of ${plural(c.wordLines, "line", "lines")} in order`);
  if (c.controls)
    parts.push(`removed ${plural(c.controls, "hidden direction mark", "hidden direction marks")}`);
  if (c.allah) parts.push(`mended ${plural(c.allah, "الله", "الله")}`);
  if (c.lamAlef) parts.push(`mended ${plural(c.lamAlef, "word with لا", "words with لا")}`);
  if (!parts.length) return "Nothing to fix: the text looks right already.";
  const s = parts.join(", ");
  return `${s[0]!.toUpperCase()}${s.slice(1)}.`;
}

/**
 * Fix Urdu, Arabic and Persian text copied from a PDF (plan item 10.3): letter shapes back to
 * letters, backwards lines and words put in order, hidden marks removed. Text never leaves
 * the page.
 */
export default function PdfTextFixer() {
  const [text, setText] = useState("");
  const [order, setOrder] = useState<PdfOrder>("auto");
  const [rank, setRank] = useState<{ code: string; rank: (w: string) => number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const id = useId();
  const output = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved && ORDERS.some(([o]) => o === saved)) setOrder(saved as PdfOrder);
    } catch {
      // storage blocked: the default stands
    }
    setReady(true);
  }, []);

  // The word list mends لا that came out as ال; fetched only once there is text to check.
  const language = languageOf(text);
  useEffect(() => {
    if (!language || rank?.code === language) return;
    let cancelled = false;
    void loadDictionary(language).then((dict) => {
      if (!cancelled && dict) setRank({ code: language, rank: (w) => dict.lexicon.rank(w) });
    });
    return () => {
      cancelled = true;
    };
  }, [language, rank?.code]);

  const result = useMemo(
    () => fixPdfText(text, { order, ...(rank ? { wordRank: rank.rank } : {}) }),
    [text, order, rank],
  );

  const chooseOrder = (o: PdfOrder) => {
    setOrder(o);
    try {
      localStorage.setItem(STORE, o);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };
  const copy = async () => {
    if (output.current && (await copyText(output.current))) setAnnouncement("Copied");
  };

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-in`} className="text-sm font-medium">
          Text copied from the PDF
        </label>
        <textarea
          id={`${id}-in`}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={5}
          spellCheck={false}
          placeholder="Paste the broken text here, such as ﻥﺎﺘﺴﮐﺎﭘ or ﻢﻜﻴﻠﻋ ﻡﻼﺴﻟﺍ"
          className={`${AREA} min-h-32`}
          style={SCRIPT_FONTS}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Line order</span>
        <select
          value={order}
          onChange={(e) => chooseOrder(e.currentTarget.value as PdfOrder)}
          className={`${SELECT} max-w-full self-start`}
        >
          {ORDERS.map(([o, label]) => (
            <option key={o} value={o}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${id}-out`} className="text-sm font-medium">
            Fixed text
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
                setAnnouncement(`Downloaded ${downloadText(result.text, "fixed-text")}`)
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
          id={`${id}-out`}
          ref={output}
          readOnly
          dir="auto"
          value={result.text}
          rows={5}
          className={`${AREA} min-h-32`}
          style={SCRIPT_FONTS}
        />
        <p className="text-sm text-muted" aria-live="polite">
          {text ? summarize(result.changes) : ""}
        </p>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
