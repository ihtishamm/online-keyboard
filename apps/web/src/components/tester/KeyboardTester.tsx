import { KEY_CODES, US_QWERTY, type KeyCode } from "@okb/engine";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadPreference, savePreference } from "../keyboard/preferences";
import { isAltGr } from "../keyboard/platform";
import { keyName } from "../typing/keys";
import Segmented from "../typing/Segmented";
import { BTN } from "../typing/share";
import {
  BOARD_NAMES,
  NAV,
  boardCodes,
  boardRows,
  isGap,
  rowWidth,
  type BoardId,
  type Row,
} from "./boards";
import {
  CHATTER_MS,
  STUCK_MS,
  emptyState,
  keyEvent,
  matchLayouts,
  releaseAll,
  stuckKeys,
  type KeyEventInfo,
  type LayoutCandidate,
  type TesterState,
} from "./logic";

/**
 * The keyboard tester (plan item 8.3): every key lights up as it is pressed, on an ANSI, ISO,
 * ABNT2 or JIS board, with what the browser reports for it, checks for chatter, stuck keys and
 * rollover, the computer's layout, and a comparison with any of our layouts.
 */

const LOCATION = ["Standard", "Left", "Right", "Numpad"];
/** The keys only some shapes have, as people would describe them. */
const EXTRA_KEY: Record<string, string> = {
  IntlBackslash: "an extra key left of Z",
  IntlRo: "an extra key right of the slash key",
  IntlYen: "the yen key",
};
const BOARDS = Object.keys(BOARD_NAMES) as BoardId[];

/** Keys the browser would act on (scroll, focus, menus): kept for the tester. */
const FORM = new Set(["INPUT", "TEXTAREA", "SELECT"]);

interface KeyboardApi {
  getLayoutMap?: () => Promise<Map<string, string>>;
}

function modifiers(e: Pick<KeyEventInfo, "shift" | "ctrl" | "alt" | "meta" | "altgr">): string {
  return (
    [
      e.ctrl && "Ctrl",
      e.alt && !e.altgr && "Alt",
      e.altgr && "AltGr",
      e.shift && "Shift",
      e.meta && "Meta",
    ]
      .filter(Boolean)
      .join(" + ") || "–"
  );
}

function Board(props: {
  rows: Row[];
  units: number;
  state: TesterState;
  stuck: ReadonlySet<string>;
  legend: (code: string, label?: string) => string;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ flex: `${props.units} ${props.units} 0` }}>
      {props.rows.map((row, i) => (
        <div key={i} className="flex h-10 gap-1 sm:h-11">
          {row.map((x, j) => {
            if (isGap(x)) return <span key={j} style={{ flex: `${x.gap} ${x.gap} 0` }} />;
            const w = x.w ?? 1;
            const down = props.state.held.has(x.code);
            const chatter = props.state.chatter.has(x.code);
            const stuck = props.stuck.has(x.code);
            const tested = props.state.tested.has(x.code);
            return (
              <span
                key={j}
                data-code={x.code}
                data-tested={tested || undefined}
                data-down={down || undefined}
                title={x.code}
                className={`flex min-w-0 items-center justify-center overflow-hidden rounded-md border-b-2 px-0.5 text-xs whitespace-nowrap transition-colors duration-75 sm:text-sm ${
                  stuck
                    ? "border-bad bg-bad-soft text-text"
                    : down
                      ? "border-accent bg-accent text-accent-fg"
                      : tested
                        ? "border-key-edge bg-accent-soft text-text"
                        : "border-key-edge bg-key text-muted"
                } ${chatter ? "ring-2 ring-bad" : ""}`}
                style={{ flex: `${w} ${w} 0` }}
              >
                {props.legend(x.code, x.label)}
              </span>
            );
          })}
          {/* Rows shorter than the block (the arrow rows) keep their keys at full size. */}
          {rowWidth(row) < props.units && (
            <span
              style={{ flex: `${props.units - rowWidth(row)} ${props.units - rowWidth(row)} 0` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function KeyboardTester() {
  const [board, setBoard] = useState<BoardId>("ansi");
  const [state, setState] = useState<TesterState>(emptyState);
  const [now, setNow] = useState(0);
  const [osMap, setOsMap] = useState<Map<string, string> | null>(null);
  const [apiState, setApiState] = useState<"checking" | "yes" | "no">("checking");
  const [candidates, setCandidates] = useState<LayoutCandidate[] | null>(null);
  const [compare, setCompare] = useState("");
  const [shapeNote, setShapeNote] = useState("");

  useEffect(() => {
    const saved = loadPreference("tester:board");
    if (saved && (BOARDS as string[]).includes(saved)) setBoard(saved as BoardId);
  }, []);
  const pickBoard = (b: BoardId) => {
    setBoard(b);
    savePreference("tester:board", b);
  };

  // Keys anywhere on the page, except while typing in a form field.
  useEffect(() => {
    const handle = (type: "down" | "up") => (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && FORM.has(target.tagName)) return;
      // Keep the browser's own action off (F5, Space scrolling, Alt menus), except what keyboard
      // users need: Tab moves focus, and Enter or Space press the focused button.
      const activates =
        (e.key === "Enter" || e.key === " ") && target?.closest("button, a, summary, [tabindex]");
      if (!e.ctrlKey && !e.metaKey && e.code !== "" && e.key !== "Tab" && !activates) {
        e.preventDefault();
      }
      const info: KeyEventInfo = {
        type,
        code: e.code || `(${e.key})`,
        key: e.key,
        location: e.location,
        repeat: e.repeat,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey,
        altgr: isAltGr(e),
        t: e.timeStamp || performance.now(),
      };
      setState((s) => keyEvent(s, info));
      // The keys only some shapes have tell which shape this is.
      if (type === "down") {
        const shape: BoardId | null =
          e.code === "IntlYen"
            ? "jis"
            : e.code === "IntlRo"
              ? "abnt2"
              : e.code === "IntlBackslash"
                ? "iso"
                : null;
        if (shape) {
          setBoard((b) => {
            if (
              b === shape ||
              (shape === "iso" && b === "abnt2") ||
              (shape === "abnt2" && b === "jis")
            )
              return b;
            setShapeNote(
              `Switched to ${BOARD_NAMES[shape]}: your keyboard has ${EXTRA_KEY[e.code]}.`,
            );
            return shape;
          });
        }
      }
    };
    const down = handle("down");
    const up = handle("up");
    const blur = () => setState(releaseAll);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  // A clock while keys are held, for the stuck-key check.
  useEffect(() => {
    if (!state.held.size) return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [state.held.size]);

  // The computer's layout, where the browser tells (Chromium's Keyboard Map API).
  useEffect(() => {
    const api = (navigator as Navigator & { keyboard?: KeyboardApi }).keyboard;
    if (!api?.getLayoutMap) {
      setApiState("no");
      return;
    }
    api
      .getLayoutMap()
      .then((map) => {
        // An empty map (no keyboard attached, headless browsers): work it out from key presses.
        if (!map.size) {
          setApiState("no");
          return;
        }
        setOsMap(new Map(map));
        setApiState("yes");
      })
      .catch(() => setApiState("no"));
  }, []);

  // Our layouts, once there is something to compare them with.
  const os = osMap ?? state.typed;
  const wantLayouts = os.size >= 8 || compare !== "";
  useEffect(() => {
    if (!wantLayouts || candidates) return;
    fetch("/keyboard-tester/layouts.json")
      .then((r) => r.json() as Promise<LayoutCandidate[]>)
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, [wantLayouts, candidates]);
  const matches = useMemo(
    () => (candidates && os.size >= 8 ? matchLayouts(os, candidates).slice(0, 3) : []),
    [candidates, os],
  );

  const codes = useMemo(() => boardCodes(board), [board]);
  const testedOnBoard = codes.filter((c) => state.tested.has(c)).length;
  const stuck = new Set(stuckKeys(state, now || performance.now()));
  const last = state.log[0];
  const legend = (code: string, label?: string) =>
    label ??
    os.get(code)?.toLocaleUpperCase() ??
    US_QWERTY[code as KeyCode]?.[0].toLocaleUpperCase() ??
    code;
  const compared = candidates?.find((c) => c.id === compare);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Keyboard shape"
          value={board}
          options={BOARDS.map((b) => ({ value: b, label: BOARD_NAMES[b] }))}
          onChange={pickBoard}
        />
        <button
          type="button"
          className={BTN}
          onClick={() => {
            setState(emptyState());
            setShapeNote("");
          }}
        >
          <RotateCcw size={16} aria-hidden />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span>
            Press every key. <span className="text-muted">{shapeNote}</span>
          </span>
          <span className="tabular-nums" data-progress>
            {testedOnBoard} of {codes.length} keys tested
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Keys tested"
          aria-valuemin={0}
          aria-valuemax={codes.length}
          aria-valuenow={testedOnBoard}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full bg-accent"
            style={{ width: `${(100 * testedOnBoard) / codes.length}%` }}
          />
        </div>
      </div>

      {/* The board scrolls sideways on its own on narrow screens; the page doesn't. */}
      <div
        role="region"
        aria-label="Keyboard"
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-2"
        data-board={board}
      >
        <div className="flex min-w-[46rem] gap-4" dir="ltr">
          <Board rows={boardRows(board)} units={15} state={state} stuck={stuck} legend={legend} />
          <Board rows={NAV} units={3} state={state} stuck={stuck} legend={legend} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="last-key"
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2 id="last-key" className="mb-2 font-semibold">
            Last key
          </h2>
          {last ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" data-last>
              <dt className="text-muted">key</dt>
              <dd className="font-mono" data-field="key">
                {JSON.stringify(last.key)}
              </dd>
              <dt className="text-muted">code</dt>
              <dd className="font-mono" data-field="code">
                {last.code}
              </dd>
              <dt className="text-muted">location</dt>
              <dd>
                {last.location} ({LOCATION[last.location] ?? "?"})
              </dd>
              <dt className="text-muted">repeat</dt>
              <dd>{last.repeat ? "yes (held down)" : "no"}</dd>
              <dt className="text-muted">modifiers</dt>
              <dd>{modifiers(last)}</dd>
              <dt className="text-muted">timing</dt>
              <dd className="tabular-nums">
                {last.gap === null ? "first event" : `${last.gap} ms after the previous event`}
                {last.held !== null && `, held ${last.held} ms`}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-muted">Press any key.</p>
          )}
        </section>

        <section
          aria-labelledby="faults"
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2 id="faults" className="mb-2 font-semibold">
            Checks
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="font-medium">Chatter (a press within {CHATTER_MS} ms of the last)</dt>
              <dd data-chatter className={state.chatter.size ? "text-bad" : "text-muted"}>
                {state.chatter.size
                  ? [...state.chatter].map(([code, n]) => `${code} ×${n}`).join(", ")
                  : "None so far."}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Held now</dt>
              <dd data-held className={stuck.size ? "text-bad" : "text-muted"}>
                {state.held.size
                  ? [...state.held]
                      .map(([code, at]) => `${code} ${(((now || at) - at) / 1000).toFixed(1)} s`)
                      .join(", ")
                  : "Nothing."}
                {stuck.size > 0 &&
                  ` Held over ${STUCK_MS / 1000} s: if you aren't holding ${stuck.size === 1 ? "it" : "them"}, the key is stuck.`}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Rollover: most keys held at once</dt>
              <dd data-rollover>
                <span className="font-semibold tabular-nums">{state.rollover}</span>{" "}
                <span className="text-muted">
                  Hold down as many keys as you can. Many keyboards stop at 6, or miss some
                  combinations.
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="layout-heading" className="flex flex-col gap-3">
        <h2 id="layout-heading" className="text-xl font-semibold">
          Your keyboard layout
        </h2>
        <p className="text-sm text-muted" data-detect>
          {apiState === "yes"
            ? "Your browser reports the layout your computer is set to."
            : apiState === "no"
              ? os.size < 8
                ? "Your browser doesn't report the layout. Press 8 or more letter keys and we'll work it out from what they type."
                : "Worked out from the keys you pressed."
              : "Checking…"}
        </p>
        {matches.length > 0 && (
          <ol className="flex flex-col gap-1" data-matches>
            {matches.map((m, i) => (
              <li key={m.candidate.id} className={i === 0 ? "font-semibold" : "text-muted"}>
                {m.candidate.name}: {m.matched} of {m.compared} keys match
                {i === 0 && m.matched === m.compared ? " (exact)" : ""}
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="compare-layout" className="text-sm font-medium">
            Compare with one of our layouts
          </label>
          <select
            id="compare-layout"
            value={compare}
            onChange={(e) => setCompare(e.target.value)}
            className="h-11 max-w-md rounded-xl border border-border bg-surface px-3 text-text"
          >
            <option value="">Choose a layout…</option>
            {(candidates ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {compared && (
          <div
            role="region"
            aria-label="Key-by-key comparison"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-border"
          >
            <table className="w-full text-sm" data-mapping>
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">Key</th>
                  <th className="px-3 py-2 text-start font-medium">Your computer types</th>
                  <th className="px-3 py-2 text-start font-medium">{compared.name} types</th>
                  <th className="px-3 py-2 text-start font-medium">With Shift</th>
                </tr>
              </thead>
              <tbody>
                {KEY_CODES.filter((code) => compared.n[code] || os.has(code)).map((code) => {
                  const mine = os.get(code);
                  const theirs = compared.n[code];
                  const differ =
                    mine !== undefined &&
                    theirs !== undefined &&
                    mine.toLocaleLowerCase() !== theirs.toLocaleLowerCase();
                  return (
                    <tr
                      key={code}
                      data-code={code}
                      className={`border-t border-border ${differ ? "bg-accent-soft" : ""}`}
                    >
                      <td className="px-3 py-1.5">{keyName(code)}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {mine ?? <span className="text-muted">press it</span>}
                      </td>
                      <td className="px-3 py-1.5 text-lg">{theirs ?? "–"}</td>
                      <td className="px-3 py-1.5 text-lg">{compared.s?.[code] ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="log-heading" className="flex flex-col gap-2">
        <h2 id="log-heading" className="text-xl font-semibold">
          Event log
        </h2>
        <div
          role="region"
          aria-label="Event log"
          tabIndex={0}
          className="overflow-x-auto rounded-xl border border-border"
        >
          <table className="w-full text-sm" data-log>
            <thead className="bg-surface-2">
              <tr>
                {["Event", "key", "code", "location", "repeat", "modifiers", "gap", "held"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 text-start font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {state.log.slice(0, 15).map((e, i) => (
                <tr
                  key={`${e.t}:${e.type}:${e.code}:${i}`}
                  className={`border-t border-border ${e.chatter ? "text-bad" : ""}`}
                >
                  <td className="px-3 py-1">{e.type === "down" ? "down" : "up"}</td>
                  <td className="px-3 py-1 font-mono">{JSON.stringify(e.key)}</td>
                  <td className="px-3 py-1 font-mono">{e.code}</td>
                  <td className="px-3 py-1">{LOCATION[e.location] ?? e.location}</td>
                  <td className="px-3 py-1">{e.repeat ? "yes" : ""}</td>
                  <td className="px-3 py-1">{modifiers(e)}</td>
                  <td className="px-3 py-1 tabular-nums">{e.gap === null ? "" : `${e.gap} ms`}</td>
                  <td className="px-3 py-1 tabular-nums">
                    {e.held === null ? "" : `${e.held} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
