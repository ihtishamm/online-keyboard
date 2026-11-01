import { Transliterator, type TranslitScheme } from "@okb/engine";
import { romanize, type RomanStyle } from "@okb/engine/romanize";
import { Copy } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { copyText } from "../keyboard/actions";
import { loadDictionary } from "../keyboard/dictionary";
import { ROMAN_TABLES as TABLES, schemeWords } from "./roman-tables";

/** Attested chat spellings per data code, fetched on demand. */
const CHAT = import.meta.glob<string>("../../../../../packages/dictionaries/data/*/chat.tsv", {
  query: "?raw",
  import: "default",
});

function parseChat(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [word, roman] = line.split("\t");
    if (word && roman) map.set(word, roman);
  }
  return map;
}

const AREA =
  "w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none";
const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50";

export interface RomanizeToolProps {
  code: string;
  lang: string;
  dir: "ltr" | "rtl";
  /** Font class for the script. */
  font: string;
  languageName: string;
  scheme: TranslitScheme;
  placeholder: string;
}

export default function RomanizeTool(props: RomanizeToolProps) {
  const { code, lang, dir, font, languageName, scheme, placeholder } = props;
  const table = TABLES[code]!;
  const [text, setText] = useState("");
  const [style, setStyle] = useState<RomanStyle>("chat");
  const [words, setWords] = useState<Map<string, string>>(() => schemeWords(scheme));
  const [translit, setTranslit] = useState<Transliterator | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const inputId = useId();
  const outputId = useId();
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // The chat list and the word list (to check vowelled spellings) load once the page is idle.
  useEffect(() => {
    let live = true;
    const loader = Object.entries(CHAT).find(([path]) => path.split("/").at(-2) === code)?.[1];
    void loader?.().then((tsv) => {
      if (live) setWords(new Map([...parseChat(tsv), ...schemeWords(scheme)]));
    });
    if (table.kind === "arabic") {
      void loadDictionary(code).then((dictionary) => {
        if (!live || !dictionary) return;
        const t = new Transliterator(scheme);
        t.setLexicon(dictionary.lexicon);
        setTranslit(t);
      });
    }
    return () => {
      live = false;
    };
  }, [code, scheme, table]);

  const output = useMemo(() => {
    if (!text) return "";
    const cache = new Map<string, string>();
    const confirm = translit
      ? (roman: string) => {
          let hit = cache.get(roman);
          if (hit === undefined) cache.set(roman, (hit = translit.best(roman)));
          return hit;
        }
      : undefined;
    return romanize(text, table, { style, words, confirm });
  }, [text, style, words, translit, table]);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="radiogroup"
        aria-label="Spelling style"
        className="inline-flex self-start rounded-lg border border-border bg-surface p-0.5"
      >
        {(
          [
            ["chat", "Chat style"],
            ["scholarly", "Scholarly"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={style === value}
            onClick={() => setStyle(value)}
            className={`min-h-11 rounded-md px-3 py-1.5 text-sm font-medium sm:min-h-0 ${
              style === value ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            {languageName} text
          </label>
          <textarea
            id={inputId}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder={placeholder}
            rows={6}
            lang={lang}
            dir={dir}
            spellCheck={false}
            className={`${AREA} ${font} text-xl`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={outputId} className="text-sm font-medium">
              In English letters
            </label>
            <button
              type="button"
              className={BTN}
              disabled={!output}
              onClick={() =>
                void copyText(outputRef.current!).then((ok) =>
                  setAnnouncement(ok ? "Copied" : "Copy failed"),
                )
              }
            >
              <Copy size={16} aria-hidden /> Copy
            </button>
          </div>
          <textarea
            id={outputId}
            ref={outputRef}
            value={output}
            readOnly
            rows={6}
            lang={`${lang}-Latn`}
            className={`${AREA} text-lg`}
          />
        </div>
      </div>
      <p className="text-sm text-muted">
        {style === "chat"
          ? "Chat style spells words the way people text them. Words we have not seen are spelled letter by letter."
          : table.kind === "indic"
            ? "Scholarly style follows ISO 15919: every letter and vowel sign has its own spelling, so nothing is lost."
            : "Scholarly style follows ALA-LC romanisation, letter by letter. Short vowels are only shown where the text marks them, because the script does not write them."}{" "}
        This changes the letters, not the meaning: it is not a translation.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
