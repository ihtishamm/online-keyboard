import { useEffect, useMemo, useState } from "react";
import {
  BIDI,
  CATEGORY,
  UNICODE_VERSION,
  hex,
  invisibleLabel,
  lookup,
  normalForms,
  type CharInfo,
} from "./unicode";

/**
 * Special-characters inspector (plan item 8.3): paste text and see every code point with its
 * Unicode name, script, direction and category, how it decomposes, and which normalisation
 * forms the text is in. Invisible characters (ZWNJ, ZWJ, RLM, NBSP…) are labelled where they
 * sit. Names load per Unicode block, only for the blocks the text uses.
 */

/** Code points listed; the summary still counts them all. */
const MAX_ROWS = 400;

const EXAMPLES: { label: string; text: string }[] = [
  { label: "Farsi with ZWNJ", text: "می‌خواهم" },
  { label: "Urdu with RLM", text: "قیمت‏ 500 روپے" },
  { label: "Hindi conjunct", text: "क्षमा" },
  { label: "é two ways", text: "café café" },
  { label: "Emoji with ZWJ", text: "👩‍💻" },
];

export default function CharInspector() {
  const [text, setText] = useState("");
  const [info, setInfo] = useState<Map<number, CharInfo & { block: string }>>(new Map());
  const [error, setError] = useState(false);
  const cps = useMemo(() => [...text].map((c) => c.codePointAt(0)!), [text]);
  const forms = useMemo(() => normalForms(text), [text]);
  const invisible = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cp of cps) {
      const label = invisibleLabel(cp);
      if (label && cp !== 0x0a && cp !== 0x20) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, [cps]);
  const graphemes = useMemo(
    () => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length,
    [text],
  );

  useEffect(() => {
    const want = cps.slice(0, MAX_ROWS).filter((cp) => !info.has(cp));
    if (!want.length) return;
    let live = true;
    lookup(want)
      .then((found) => {
        if (!live) return;
        setError(false);
        setInfo((old) => new Map([...old, ...found]));
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [cps, info]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="inspect-text" className="text-sm font-medium">
          Paste or type text to inspect
        </label>
        <textarea
          id="inspect-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          dir="auto"
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-surface p-3 text-base text-text focus:border-accent focus:outline-none"
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted">Try:</span>
          {EXAMPLES.map((x) => (
            <button
              key={x.label}
              type="button"
              className="h-9 rounded-lg border border-border bg-surface px-2.5 hover:border-accent"
              onClick={() => setText(x.text)}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {text && (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-summary>
            <div className="rounded-xl border border-border bg-surface px-3 py-2">
              <dt className="text-muted">Code points</dt>
              <dd className="text-xl font-semibold tabular-nums">{cps.length}</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-2">
              <dt className="text-muted">Characters as seen</dt>
              <dd className="text-xl font-semibold tabular-nums">{graphemes}</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-2">
              <dt className="text-muted">Invisible</dt>
              <dd className="font-semibold" data-invisible>
                {invisible.size
                  ? [...invisible].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(", ")
                  : "none"}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-2">
              <dt className="text-muted">Normalised as</dt>
              <dd className="font-semibold" data-forms>
                {Object.entries(forms)
                  .filter(([, yes]) => yes)
                  .map(([f]) => f)
                  .join(", ") || "none (mixed)"}
              </dd>
            </div>
          </dl>

          <div>
            <h2 className="mb-1 text-sm font-medium">The text, with invisible characters shown</h2>
            <p
              dir="auto"
              className="rounded-xl border border-border bg-surface p-3 text-lg leading-loose break-words whitespace-pre-wrap"
              data-preview
            >
              {[...text].map((ch, i) => {
                const label = invisibleLabel(ch.codePointAt(0)!);
                return label && ch !== "\n" && ch !== " " ? (
                  <mark
                    key={i}
                    className="mx-px rounded bg-accent-soft px-1 align-middle font-mono text-xs text-accent"
                  >
                    {label}
                  </mark>
                ) : (
                  <span key={i}>{ch}</span>
                );
              })}
            </p>
          </div>

          {error && (
            <p className="text-sm text-bad">
              Character names couldn't load (offline?). Code points are shown without them.
            </p>
          )}
          <div
            role="region"
            aria-label="Characters in the text"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border"
          >
            <table className="w-full text-sm" data-chars>
              <thead className="bg-surface-2">
                <tr>
                  {[
                    "",
                    "Code point",
                    "Name",
                    "Script",
                    "Direction",
                    "Category",
                    "Decomposes to",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-start font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cps.slice(0, MAX_ROWS).map((cp, i) => {
                  const ch = String.fromCodePoint(cp);
                  const label = invisibleLabel(cp);
                  const facts = info.get(cp);
                  const nfd = ch.normalize("NFD");
                  const nfkd = ch.normalize("NFKD");
                  const parts = nfd !== ch ? nfd : nfkd !== ch ? nfkd : "";
                  return (
                    <tr
                      key={i}
                      data-cp={hex(cp)}
                      className={`border-t border-border ${label ? "bg-accent-soft" : ""}`}
                    >
                      <td className="px-3 py-1.5 text-center text-xl">
                        {label ? (
                          <span className="font-mono text-xs text-accent">{label}</span>
                        ) : /^\p{M}$/u.test(ch) ? (
                          `◌${ch}`
                        ) : (
                          ch
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">U+{hex(cp)}</td>
                      <td className="px-3 py-1.5">{facts?.name ?? "…"}</td>
                      <td className="px-3 py-1.5">{facts?.script ?? ""}</td>
                      <td className="px-3 py-1.5">
                        {facts ? (BIDI[facts.bidi] ?? facts.bidi) : ""}
                      </td>
                      <td className="px-3 py-1.5">
                        {facts ? (CATEGORY[facts.category] ?? facts.category) : ""}
                      </td>
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                        {parts
                          ? `${[...parts].map((p) => `U+${hex(p.codePointAt(0)!)}`).join(" ")}${nfd === ch ? " (compat.)" : ""}`
                          : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cps.length > MAX_ROWS && (
            <p className="text-sm text-muted">Showing the first {MAX_ROWS} code points.</p>
          )}
          <p className="text-xs text-muted">
            Character data: Unicode {UNICODE_VERSION}, © Unicode, Inc. (Unicode License v3).
          </p>
        </>
      )}
    </div>
  );
}
