import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { BTN } from "../typing/share";

/**
 * Touch-screen tester (plan item 8.3, for phones): every finger shows as a numbered circle,
 * with the most touches seen at once; the grid behind fills in where the screen has
 * responded, so dead areas stand out.
 */

const COLS = 6;
const ROWS = 10;

interface Point {
  x: number;
  y: number;
  n: number;
}

export default function TouchTester() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<ReadonlyMap<number, Point>>(new Map());
  const [most, setMost] = useState(0);
  const [cells, setCells] = useState<ReadonlySet<number>>(new Set());
  const counter = useRef(0);

  useEffect(() => setMost((m) => Math.max(m, points.size)), [points.size]);

  const place = (e: PointerEvent<HTMLDivElement>, start: boolean) => {
    const box = areaRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(e.clientY - box.top, 0), box.height);
    setPoints((list) => {
      if (!start && !list.has(e.pointerId)) return list;
      const next = new Map(list);
      next.set(e.pointerId, { x, y, n: list.get(e.pointerId)?.n ?? ++counter.current });
      return next;
    });
    const cell =
      Math.min(ROWS - 1, Math.floor((y / box.height) * ROWS)) * COLS +
      Math.min(COLS - 1, Math.floor((x / box.width) * COLS));
    setCells((c) => (c.has(cell) ? c : new Set(c).add(cell)));
  };

  const lift = (e: PointerEvent<HTMLDivElement>) =>
    setPoints((list) => {
      if (!list.has(e.pointerId)) return list;
      const next = new Map(list);
      next.delete(e.pointerId);
      if (!next.size) counter.current = 0;
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span data-touches>
          Touching now: <span className="font-semibold tabular-nums">{points.size}</span> · Most at
          once: <span className="font-semibold tabular-nums">{most}</span> · Screen tested:{" "}
          <span className="font-semibold tabular-nums">
            {Math.round((100 * cells.size) / (COLS * ROWS))}%
          </span>
        </span>
        <button
          type="button"
          className={BTN}
          onClick={() => {
            setPoints(new Map());
            setMost(0);
            setCells(new Set());
            counter.current = 0;
          }}
        >
          <RotateCcw size={16} aria-hidden />
          Reset
        </button>
      </div>
      <div
        ref={areaRef}
        role="application"
        aria-label="Touch area: touch with one or more fingers"
        className="relative grid h-[60vh] min-h-72 touch-none overflow-hidden rounded-xl border border-border bg-surface select-none"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          place(e, true);
        }}
        onPointerMove={(e) => place(e, false)}
        onPointerUp={lift}
        onPointerCancel={lift}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <span
            key={i}
            className={`border-[0.5px] border-border/60 ${cells.has(i) ? "bg-accent-soft" : ""}`}
          />
        ))}
        {[...points].map(([id, p]) => (
          <span
            key={id}
            className="pointer-events-none absolute flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-accent/25 text-lg font-semibold text-text"
            style={{ left: p.x, top: p.y }}
          >
            {p.n}
          </span>
        ))}
        {!points.size && !cells.size && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-muted">
            Touch here with one finger, then more. Slide over the whole area to find dead spots.
          </p>
        )}
      </div>
    </div>
  );
}
