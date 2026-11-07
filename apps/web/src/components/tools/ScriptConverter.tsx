import { ArrowLeftRight, Copy, Download, Keyboard } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { decodeDictionary } from "@okb/engine/compact";
import { Bridge, type Converted, type Pair } from "@okb/script-converters/bridge";
import { downloadText } from "../keyboard/actions";
import { openInNewDraft } from "../keyboard/drafts";

/** One script of a pair: Gurmukhi, Shahmukhi… */
export interface Script {
  id: string;
  /** "Gurmukhi" */
  name: string;
  lang: string;
  dir: "ltr" | "rtl";
  fontClass: string;
  /** The keyboard page to keep editing on. */
  slug: string;
  placeholder: string;
  /** The word list that picks this script's spellings (a hashed asset URL). */
  list: string;
}

export interface ScriptConverterProps {
  scripts: readonly [Script, Script];
  /** From the first script to the second, and back. */
  pairs: readonly [Pair, Pair];
  /** Which script a text is mostly in, by id, or null. */
  detect: (text: string) => string | null;
}

type ListState = "loading" | "ready" | "failed";

const BTN =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50 sm:min-h-9";
const AREA =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const icon = { size: 16, "aria-hidden": true } as const;
/** Words indexed between pauses, so the page answers taps while a list loads. */
const CHUNK = 4000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Fetches a word list and indexes it a part at a time. */
async function loadBridge(pair: Pair, url: string): Promise<Bridge> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}`);
  const { words } = decodeDictionary(await response.text());
  const bridge = new Bridge(pair);
  for (let i = 0; i < words.length; i += CHUNK) {
    bridge.add(words.slice(i, i + CHUNK));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return bridge;
}

/**
 * A converter between two scripts of one language, live as you type (plan item 10.2). Rules
 * write each word at once; the target script's word list, fetched on first use, then picks the
 * real spelling. Words it doesn't have stay as the rules wrote them and are underlined.
 */
export default function ScriptConverter({ scripts, pairs, detect }: ScriptConverterProps) {
  // 0: from scripts[0] to scripts[1]; 1: back.
  const [way, setWay] = useState<0 | 1>(0);
  const [input, setInput] = useState("");
  const [lists, setLists] = useState<Record<string, ListState>>({});
  const bridges = useRef(new Map<string, Bridge>());
  const [announcement, setAnnouncement] = useState("");
  const inputId = useId();
  const outputId = useId();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const from = scripts[way];
  const to = scripts[way === 0 ? 1 : 0];
  const pair = pairs[way];
  // With no word list yet, an empty one: every word is spelled by rule.
  const rulesOnly = useMemo(() => pairs.map((p) => new Bridge(p)), [pairs]);

  const announce = (text: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(text));
  };

  // Load the target's list once there is something to convert.
  const hasText = input.trim() !== "";
  useEffect(() => {
    if (!hasText || lists[to.id]) return;
    setLists((l) => ({ ...l, [to.id]: "loading" }));
    loadBridge(pair, to.list).then(
      (bridge) => {
        bridges.current.set(to.id, bridge);
        setLists((l) => ({ ...l, [to.id]: "ready" }));
      },
      () => setLists((l) => ({ ...l, [to.id]: "failed" })),
    );
  }, [hasText, to, pair, lists]);

  const state = lists[to.id];
  const bridge = (state === "ready" && bridges.current.get(to.id)) || rulesOnly[way]!;
  const result: Converted | null = hasText ? bridge.convert(input) : null;

  const change = (text: string) => {
    // Text in the other script turns the converter round.
    const script = detect(text);
    if (script === to.id) {
      setWay(way === 0 ? 1 : 0);
      announce(`Reading ${to.name}, writing ${from.name}`);
    }
    setInput(text);
  };

  const swap = () => {
    setInput(result?.text ?? "");
    setWay(way === 0 ? 1 : 0);
  };

  let status: string | null = null;
  if (result && result.words) {
    if (state === "loading" || state === undefined) {
      status = `Loading the ${to.name} word list. Until it arrives, every word is spelled by rule.`;
    } else if (state === "failed") {
      status = `The ${to.name} word list didn't load (are you offline?), so every word is spelled by rule. Check the vowels.`;
    } else if (result.guessed.length) {
      status = `${plural(result.guessed.length, "word", "words")} of ${result.words} ${
        result.guessed.length === 1 ? "isn't" : "aren't"
      } in the ${to.name} word list and ${result.guessed.length === 1 ? "is" : "are"} spelled by rule: ${
        result.guessed.length === 1 ? "it is" : "they are"
      } underlined. Check ${result.guessed.length === 1 ? "it" : "them"}.`;
    } else {
      status = `Every word was found in the ${to.name} word list.`;
    }
  }

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      announce("Copied");
    } catch {
      // No clipboard permission: select the output so the user can copy it.
      const el = document.getElementById(outputId);
      if (el) getSelection()?.selectAllChildren(el);
      announce("Copy failed: the text is selected, copy it from the menu");
    }
  };

  return (
    <div className="flex flex-col gap-4" data-ready={ready || undefined} data-list={state}>
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Conversion direction"
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
        >
          {([0, 1] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={way === w}
              onClick={() => w !== way && swap()}
              className={`min-h-11 rounded-md px-3 text-sm font-medium sm:min-h-9 ${
                way === w ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
              }`}
            >
              {scripts[w].name} → {scripts[w === 0 ? 1 : 0].name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          {from.name} text
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => change(e.target.value)}
          spellCheck={false}
          placeholder={from.placeholder}
          lang={from.lang}
          dir={from.dir}
          className={`${AREA} ${from.fontClass} min-h-36 resize-y text-xl`}
        />
        <p className="text-xs text-muted">
          Paste text in either script: the page turns round by itself.
        </p>
      </div>

      {status && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state === "failed" || result?.guessed.length
              ? "border-focus text-text"
              : "border-border text-muted"
          }`}
        >
          {status}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={`${outputId}-label`} className="text-sm font-medium">
            {to.name} text
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
                announce(`Downloaded ${downloadText(result!.text, to.name.toLowerCase())}`)
              }
            >
              <Download {...icon} /> Download .txt
            </button>
            <button type="button" className={BTN} disabled={!result} onClick={swap}>
              <ArrowLeftRight {...icon} /> Swap
            </button>
            <button
              type="button"
              className={BTN}
              disabled={!result}
              onClick={() =>
                void openInNewDraft(to.slug, result!.text).then(() =>
                  location.assign(`/${to.slug}`),
                )
              }
            >
              <Keyboard {...icon} /> Edit in {to.name} keyboard
            </button>
          </div>
        </div>
        <div
          id={outputId}
          role="textbox"
          aria-readonly="true"
          aria-multiline="true"
          aria-labelledby={`${outputId}-label`}
          tabIndex={0}
          lang={to.lang}
          dir={to.dir}
          className={`${AREA} ${to.fontClass} min-h-36 text-xl break-words whitespace-pre-wrap`}
        >
          {result?.parts.map((p, i) =>
            p.guess ? (
              <span
                key={i}
                title="Not in the word list: spelled by rule"
                className="underline decoration-focus decoration-dotted decoration-2 underline-offset-4"
              >
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
