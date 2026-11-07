import { ArrowLeftRight, Copy, Download, Keyboard } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Converted } from "@okb/script-converters/alphabet";
import { downloadText } from "../keyboard/actions";
import { openInNewDraft } from "../keyboard/drafts";

/** Latin → Cyrillic, with or without a word list. */
export interface CyrillicWriter {
  toCyrillic(text: string, options?: { restore?: boolean; alphabet?: string }): Converted;
}

export interface LatinAlphabet {
  id: string;
  /** In the list: "1995 (in use)". */
  label: string;
  /** In the text boxes' names, when shorter: "1995". */
  short?: string;
  /** Shown under the choice: whether it is official, and since when. */
  note?: string;
}

export interface AlphabetConverterProps {
  /** "Serbian" */
  language: string;
  /** The keyboard page for the language. */
  slug: string;
  /** Which alphabet that keyboard types; its output gets "Edit in … keyboard". Cyrillic by default. */
  keyboardScript?: "cyrillic" | "latin";
  /** BCP 47 tags of the two alphabets: sr-Cyrl, sr-Latn. */
  cyrillicLang: string;
  latinLang: string;
  placeholders: { cyrillic: string; latin: string };
  toLatin(text: string, alphabet?: string): Converted;
  /** The rules alone, until `load` gives the word list's writer. */
  rules: CyrillicWriter;
  load?: () => Promise<CyrillicWriter>;
  detect(text: string): "cyrillic" | "latin" | null;
  /**
   * Letters with marks the list can put back ("č ć š ž đ"), and how to tell they're missing;
   * either may depend on the Latin alphabet.
   */
  marks?: {
    letters: string | ((alphabet: string) => string);
    missing(text: string, alphabet?: string): boolean;
  };
  /** Latin alphabets to choose from, the default first (Kazakh 2021 and 2018). */
  alphabets?: {
    options: readonly LatinAlphabet[];
    /** Which one a Latin text is in, or null when it can't tell. */
    detect?(text: string, writer: CyrillicWriter): string | null;
  };
  /** A third way, between the Latin alphabets (Uzbek 1995 ↔ 2027). */
  latinPair?: {
    label: string;
    convert(text: string): { text: string; from: string; to: string };
  };
}

type Way = "toLatin" | "toCyrillic" | "latinPair";
type ListState = "loading" | "ready" | "failed";

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const AREA =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const icon = { size: 16, "aria-hidden": true } as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A converter between the Cyrillic and Latin alphabets of one language, live as you type (plan
 * item 10.2). Cyrillic → Latin is a table. Latin → Cyrillic uses a word list, fetched on first
 * use, for digraphs and missing marks; words it leaves in Latin and words it spelled by rule are
 * marked.
 */
export default function AlphabetConverter(props: AlphabetConverterProps) {
  const { language, rules, load, marks, alphabets, latinPair } = props;
  const [way, setWay] = useState<Way>("toLatin");
  const [alphabet, setAlphabet] = useState(alphabets?.options[0]?.id ?? "");
  const alphabetId = useId();
  const [input, setInput] = useState("");
  // null: decided by the text.
  const [restoreChoice, setRestoreChoice] = useState<boolean | null>(null);
  const [list, setList] = useState<ListState | undefined>(load ? undefined : "ready");
  const writer = useRef<CyrillicWriter | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputId = useId();
  const outputId = useId();
  const restoreId = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const current = alphabets?.options.find((a) => a.id === alphabet);
  const names = {
    cyrillic: `${language} Cyrillic`,
    latin: current ? `${language} Latin (${current.short ?? current.label})` : `${language} Latin`,
  };
  const from = way === "toLatin" ? "cyrillic" : "latin";
  const to = way === "toCyrillic" ? "cyrillic" : "latin";

  const announce = (text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  };

  const hasText = input.trim() !== "";
  useEffect(() => {
    if (!load || way !== "toCyrillic" || !hasText || list) return;
    setList("loading");
    load().then(
      (w) => {
        writer.current = w;
        setList("ready");
      },
      () => setList("failed"),
    );
  }, [load, way, hasText, list]);

  const missing = useMemo(
    () => !!marks && marks.missing(input, alphabet || undefined),
    [marks, input, alphabet],
  );
  const restore = marks ? (restoreChoice ?? missing) : false;
  const letters = typeof marks?.letters === "function" ? marks.letters(alphabet) : marks?.letters;
  let result: Converted | null = null;
  let pair: { from: string; to: string } | null = null;
  if (hasText) {
    if (way === "latinPair" && latinPair) {
      const r = latinPair.convert(input);
      pair = r;
      result = {
        text: r.text,
        parts: [{ text: r.text }],
        words: 0,
        kept: [],
        guessed: [],
        unknown: [],
        restored: false,
      };
    } else
      result =
        way === "toLatin"
          ? props.toLatin(input, alphabet || undefined)
          : (writer.current ?? rules).toCyrillic(input, {
              restore,
              alphabet: alphabet || undefined,
            });
  }
  const inputName = pair ? `${language} Latin (${pair.from})` : names[from];
  const outputName = pair ? `${language} Latin (${pair.to})` : names[to];

  const change = (text: string) => {
    const script = props.detect(text);
    let next = way;
    if (script === "cyrillic" && way !== "toLatin") next = "toLatin";
    else if (script === "latin" && way === "toLatin") next = "toCyrillic";
    const messages: string[] = [];
    if (next !== way) {
      setWay(next);
      messages.push(
        next === "toLatin"
          ? `Reading ${names.cyrillic}, writing ${names.latin}`
          : `Reading ${language} Latin, writing ${names.cyrillic}`,
      );
    }
    // Pasted Latin in the other alphabet: read it as that one.
    if (next === "toCyrillic" && alphabets?.detect) {
      const found = alphabets.detect(text, writer.current ?? rules);
      const option = alphabets.options.find((a) => a.id === found);
      if (option && option.id !== alphabet) {
        setAlphabet(option.id);
        messages.push(`Reading the ${option.short ?? option.label} Latin alphabet`);
      }
    }
    if (messages.length) announce(messages.join(". "));
    if (!text.trim()) setRestoreChoice(null);
    setInput(text);
  };

  const swap = () => {
    setInput(result?.text ?? "");
    setRestoreChoice(null);
    if (way !== "latinPair") setWay(way === "toLatin" ? "toCyrillic" : "toLatin");
  };

  const choose = (w: Way) => {
    if (w === way) return;
    if (w === "latinPair" || way === "latinPair") {
      setWay(w);
      setRestoreChoice(null);
      // Latin stays Latin; Cyrillic text only makes sense going to Latin.
      if (w === "toCyrillic" && props.detect(input) === "cyrillic") setInput("");
      if (w === "latinPair" && props.detect(input) === "cyrillic") setInput(result?.text ?? "");
      return;
    }
    swap();
  };

  const notes: string[] = [];
  if (result) {
    if (way === "toCyrillic" && list === "loading")
      notes.push("Loading the word list. Until it arrives, every word is spelled by rule.");
    if (way === "toCyrillic" && list === "failed")
      notes.push("The word list didn't load (are you offline?), so every word is spelled by rule.");
    if (restore && letters)
      notes.push(
        `${missing && restoreChoice === null ? `There is no ${letters.split(" ").join(", ")} in your text, so the` : "The"} word list puts the marks back.`,
      );
    if (result.guessed.length)
      notes.push(
        `${plural(result.guessed.length, "word", "words")} ${result.guessed.length === 1 ? "isn't" : "aren't"} in the word list and ${result.guessed.length === 1 ? "is" : "are"} spelled by rule: underlined.`,
      );
    if (result.kept.length)
      notes.push(
        way === "toCyrillic"
          ? `${plural(result.kept.length, "word stays", "words stay")} in Latin (foreign words, links, Roman numerals, units): shown in grey.`
          : `${plural(result.kept.length, "word has", "words have")} letters ${language} doesn't use (${result.unknown.join(" ")}) and ${result.kept.length === 1 ? "is" : "are"} left as ${result.kept.length === 1 ? "it is" : "they are"}: shown in grey.`,
      );
  }

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      announce("Copied");
    } catch {
      const el = document.getElementById(outputId);
      if (el) getSelection()?.selectAllChildren(el);
      announce("Copy failed: the text is selected, copy it from the menu");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined} data-list={list}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="radiogroup"
          aria-label="Conversion direction"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {(latinPair
            ? (["toLatin", "toCyrillic", "latinPair"] as const)
            : (["toLatin", "toCyrillic"] as const)
          ).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={way === w}
              onClick={() => choose(w)}
              className={`min-h-11 rounded-md px-3 text-sm font-medium sm:min-h-9 ${
                way === w ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
              }`}
            >
              {w === "toLatin"
                ? "Cyrillic → Latin"
                : w === "toCyrillic"
                  ? "Latin → Cyrillic"
                  : latinPair!.label}
            </button>
          ))}
        </div>
        {alphabets && way !== "latinPair" && (
          <label
            htmlFor={alphabetId}
            className="inline-flex min-h-11 items-center gap-2 text-sm sm:min-h-9"
          >
            Latin alphabet
            <select
              id={alphabetId}
              value={alphabet}
              onChange={(e) => setAlphabet(e.target.value)}
              className="min-h-11 rounded-lg border border-border bg-surface px-2 text-sm text-text sm:min-h-9"
            >
              {alphabets.options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {letters && way === "toCyrillic" && (
          <label
            htmlFor={restoreId}
            className="inline-flex min-h-11 items-center gap-2 text-sm sm:min-h-9"
          >
            <input
              id={restoreId}
              type="checkbox"
              checked={restore}
              onChange={(e) => setRestoreChoice(e.target.checked)}
              className="size-4 accent-accent"
            />
            Add missing {letters}
          </label>
        )}
      </div>
      {current?.note && way !== "latinPair" && (
        <p className="-mt-2 text-xs text-muted">{current.note}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {inputName} text
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => change(e.target.value)}
          spellCheck={false}
          placeholder={props.placeholders[from]}
          lang={from === "cyrillic" ? props.cyrillicLang : props.latinLang}
          className={`${AREA} min-h-36 resize-y text-lg`}
        />
        <p className="text-xs text-muted">
          Paste text in either alphabet: the page turns round by itself.
        </p>
      </div>

      {notes.length > 0 && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            list === "failed" || result?.guessed.length
              ? "border-focus text-text"
              : "border-border text-muted"
          }`}
        >
          {notes.join(" ")}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={`${outputId}-label`} className="text-sm font-medium">
            {outputName} text
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN} disabled={!result} onClick={() => void copy()}>
              <Copy {...icon} /> Copy
            </button>
            <button
              type="button"
              className={BTN}
              disabled={!result}
              onClick={() =>
                announce(
                  `Downloaded ${downloadText(result!.text, `${language}-${to}`.toLowerCase())}`,
                )
              }
            >
              <Download {...icon} /> Download .txt
            </button>
            <button type="button" className={BTN} disabled={!result} onClick={swap}>
              <ArrowLeftRight {...icon} /> Swap
            </button>
            {to === (props.keyboardScript ?? "cyrillic") && (
              <button
                type="button"
                className={BTN}
                disabled={!result}
                onClick={() =>
                  void openInNewDraft(props.slug, result!.text).then(() =>
                    location.assign(`/${props.slug}`),
                  )
                }
              >
                <Keyboard {...icon} /> Edit in {language} keyboard
              </button>
            )}
          </div>
        </div>
        <div
          id={outputId}
          role="textbox"
          aria-readonly="true"
          aria-multiline="true"
          aria-labelledby={`${outputId}-label`}
          tabIndex={0}
          lang={to === "cyrillic" ? props.cyrillicLang : props.latinLang}
          className={`${AREA} min-h-36 text-lg break-words whitespace-pre-wrap`}
        >
          {result?.parts.map((p, i) =>
            p.kind === "guess" ? (
              <span
                key={i}
                title="Not in the word list: spelled by rule"
                className="underline decoration-focus decoration-dotted decoration-2 underline-offset-4"
              >
                {p.text}
              </span>
            ) : p.kind === "kept" ? (
              <span key={i} title="Left as it was" className="text-muted">
                {p.text}
              </span>
            ) : (
              p.text
            ),
          )}
        </div>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm font-medium text-accent">
        {announcement}
      </p>
    </div>
  );
}
