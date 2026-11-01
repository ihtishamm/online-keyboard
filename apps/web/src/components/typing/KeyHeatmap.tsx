import { deadStrokeMap, keystrokeMap, layoutRows, type KeyCode, type Layout } from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { useMemo } from "react";
import { FONT_CLASS } from "../fonts";
import { keyName } from "./keys";

/**
 * Accuracy by key (plan item 8.2), drawn on the layout: each key coloured from red (often
 * missed) to green (rarely), counting every character it types. Keys never typed stay plain.
 * A dead-key letter counts for its second key (é for E), a letter typed in parts for its first.
 */
export interface KeyHeatmapProps {
  layout: Layout;
  counts: ReadonlyMap<string, readonly [number, number]>;
  lang: string;
  dir: "rtl" | "ltr";
  font: FontId;
}

/** Fewer presses than this and the colour is too uncertain to show. */
const MIN_PRESSES = 3;

export function keyTotals(
  layout: Layout,
  counts: ReadonlyMap<string, readonly [number, number]>,
): Map<KeyCode, [number, number]> {
  const keys = keystrokeMap(layout);
  const dead = deadStrokeMap(layout, keys);
  const out = new Map<KeyCode, [number, number]>();
  for (const [ch, [right, wrong]] of counts) {
    const code =
      keys.get(ch)?.code ?? dead.get(ch)?.then.code ?? keys.get(ch.normalize("NFD")[0]!)?.code;
    if (!code) continue;
    const t = out.get(code) ?? [0, 0];
    out.set(code, [t[0] + right, t[1] + wrong]);
  }
  return out;
}

export default function KeyHeatmap(props: KeyHeatmapProps) {
  const totals = useMemo(() => keyTotals(props.layout, props.counts), [props.layout, props.counts]);
  const font = FONT_CLASS[props.font];
  return (
    <figure className="flex flex-col gap-2">
      <div
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface-2 p-1.5"
        dir="ltr"
      >
        {layoutRows(props.layout.keys).map((row, i) => (
          <div key={i} className="flex gap-1" style={{ paddingInlineStart: `${i * 3}%` }}>
            {row.map((code) => {
              const [right, wrong] = totals.get(code) ?? [0, 0];
              const presses = right + wrong;
              const accuracy = presses ? right / presses : 1;
              const shown = presses >= MIN_PRESSES;
              // 100 % → good; 80 % or less → bad.
              const bad = Math.round(Math.min(1, Math.max(0, (1 - accuracy) / 0.2)) * 100);
              const label = props.layout.keys[code]?.n ?? "";
              return (
                <div
                  key={code}
                  data-key={code}
                  data-accuracy={shown ? Math.round(accuracy * 100) : undefined}
                  title={`${keyName(code)}: ${shown ? `${Math.round(accuracy * 100)}% of ${presses}` : "not enough presses yet"}`}
                  className="flex h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center rounded-md border-b-2 border-key-edge text-text sm:h-12"
                  style={{
                    // A light tint, so the key's text keeps its contrast.
                    background: shown
                      ? `color-mix(in oklab, color-mix(in oklab, var(--color-bad) ${bad}%, var(--color-good)) 40%, var(--color-key))`
                      : "var(--color-key)",
                  }}
                >
                  <span className={`${font} text-base leading-none sm:text-lg`} lang={props.lang}>
                    {label}
                  </span>
                  {shown && (
                    <span className="text-[0.6rem] leading-none tabular-nums sm:text-xs">
                      {Math.round(accuracy * 100)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm bg-good/40" aria-hidden /> 100 % right
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm bg-bad/40" aria-hidden /> 80 % or less
        </span>
        <span>Numbers: % of presses right. Plain keys: fewer than {MIN_PRESSES} presses.</span>
      </figcaption>
    </figure>
  );
}
