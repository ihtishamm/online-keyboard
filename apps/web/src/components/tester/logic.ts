/**
 * Keyboard tester state (plan item 8.3), as pure functions of key events:
 * - every key seen, for the "all keys tested" bar;
 * - chatter: a key pressed again less than 30 ms after its last press (a bouncing switch);
 * - keys held now, and for how long (a key held for seconds without the user meaning it is
 *   stuck);
 * - rollover: the most keys held at once.
 */

export interface KeyEventInfo {
  type: "down" | "up";
  code: string;
  key: string;
  location: number;
  repeat: boolean;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  altgr: boolean;
  /** ms, from performance.now() or event.timeStamp. */
  t: number;
}

export interface LogEntry extends KeyEventInfo {
  /** ms since the previous event. */
  gap: number | null;
  /** For a key-up: how long the key was held. */
  held: number | null;
  chatter: boolean;
}

export interface TesterState {
  tested: ReadonlySet<string>;
  /** Keys down now → when they went down. */
  held: ReadonlyMap<string, number>;
  lastDown: ReadonlyMap<string, number>;
  /** Chatter events per key. */
  chatter: ReadonlyMap<string, number>;
  rollover: number;
  /** Newest first. */
  log: readonly LogEntry[];
  /** What the OS typed on each key without modifiers, for layout detection. */
  typed: ReadonlyMap<string, string>;
}

/** Two presses of a key closer than this are chatter. */
export const CHATTER_MS = 30;
/** A key down this long is reported as possibly stuck. */
export const STUCK_MS = 2000;
const LOG_SIZE = 40;

export const emptyState = (): TesterState => ({
  tested: new Set(),
  held: new Map(),
  lastDown: new Map(),
  chatter: new Map(),
  rollover: 0,
  log: [],
  typed: new Map(),
});

export function keyEvent(state: TesterState, e: KeyEventInfo): TesterState {
  const previous = state.log[0];
  const gap = previous ? Math.round(e.t - previous.t) : null;
  if (e.type === "down") {
    const last = state.lastDown.get(e.code);
    const chatter = !e.repeat && last !== undefined && e.t - last < CHATTER_MS;
    const held = new Map(state.held);
    if (!held.has(e.code)) held.set(e.code, e.t);
    const lastDown = new Map(state.lastDown);
    if (!e.repeat) lastDown.set(e.code, e.t);
    const chatterCounts = new Map(state.chatter);
    if (chatter) chatterCounts.set(e.code, (chatterCounts.get(e.code) ?? 0) + 1);
    const typed = new Map(state.typed);
    if ([...e.key].length === 1 && !e.ctrl && !e.alt && !e.meta && !e.altgr && !e.shift) {
      typed.set(e.code, e.key);
    }
    return {
      ...state,
      tested: state.tested.has(e.code) ? state.tested : new Set(state.tested).add(e.code),
      held,
      lastDown,
      chatter: chatterCounts,
      rollover: Math.max(state.rollover, held.size),
      typed,
      log: [{ ...e, gap, held: null, chatter }, ...state.log].slice(0, LOG_SIZE),
    };
  }
  const since = state.held.get(e.code);
  const held = new Map(state.held);
  held.delete(e.code);
  return {
    ...state,
    held,
    // A key-up alone counts too: some keys (PrintScreen) send no key-down to the page.
    tested: state.tested.has(e.code) ? state.tested : new Set(state.tested).add(e.code),
    log: [
      { ...e, gap, held: since === undefined ? null : Math.round(e.t - since), chatter: false },
      ...state.log,
    ].slice(0, LOG_SIZE),
  };
}

/** The page lost focus: the OS may swallow key-ups, so forget held keys. */
export const releaseAll = (state: TesterState): TesterState => ({ ...state, held: new Map() });

/** Keys held for longer than STUCK_MS at time `now`. */
export const stuckKeys = (state: TesterState, now: number): string[] =>
  [...state.held].filter(([, at]) => now - at >= STUCK_MS).map(([code]) => code);

export interface LayoutCandidate {
  id: string;
  /** e.g. "German – Germany (QWERTZ)". */
  name: string;
  /** Key code → character without modifiers. */
  n: Readonly<Record<string, string>>;
  /** Key code → character with Shift. */
  s?: Readonly<Record<string, string>>;
}

export interface LayoutMatch {
  candidate: LayoutCandidate;
  matched: number;
  compared: number;
}

/**
 * The layouts that best explain what the OS types on each key, best first. Only keys both
 * sides know are compared; letters are compared without case (Caps Lock).
 */
export function matchLayouts(
  os: ReadonlyMap<string, string>,
  candidates: readonly LayoutCandidate[],
): LayoutMatch[] {
  const fold = (s: string) => s.toLocaleLowerCase();
  return candidates
    .map((candidate) => {
      let matched = 0;
      let compared = 0;
      for (const [code, ch] of os) {
        const theirs = candidate.n[code];
        if (!theirs) continue;
        compared++;
        if (fold(theirs) === fold(ch)) matched++;
      }
      return { candidate, matched, compared };
    })
    .filter((m) => m.compared > 0)
    .sort(
      (a, b) =>
        b.matched / b.compared - a.matched / a.compared ||
        b.compared - a.compared ||
        a.candidate.name.localeCompare(b.candidate.name),
    );
}
