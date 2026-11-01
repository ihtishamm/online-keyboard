/**
 * Typing progress (plan item 8.2): what is kept of each finished test, lesson and game, and
 * what is worked out from it: streaks, the daily challenge, badges and the weakest keys.
 * Everything stays on the device (history.ts); these functions are pure.
 */

export type Activity = "test" | "lesson" | "daily" | "falling" | "finder";

export interface TypingRecord {
  /** Language slug, e.g. "urdu". */
  slug: string;
  /** Layout id, e.g. "ur-phonetic". */
  layout: string;
  activity: Activity;
  /** When it finished (ms since 1970). */
  at: number;
  /** The UTC day it finished on, YYYY-MM-DD: daily challenges and streaks run on UTC days. */
  day: string;
  /** Net speed, in `unit`. */
  speed: number;
  unit: "wpm" | "cpm";
  /** 0-100. */
  accuracy: number;
  seconds: number;
  /** Typed on a touch screen. */
  phone: boolean;
  /** Keystrokes per target character: [right, wrong]. */
  keys: Record<string, readonly [number, number]>;
  /** Lesson id, game level, … */
  detail?: string;
  /** Game score (falling words: words caught). */
  score?: number;
}

const DAY_MS = 86_400_000;

/** A record of a finished drill. */
export function recordOf(
  o: Pick<TypingRecord, "slug" | "layout" | "activity" | "phone"> &
    Partial<Pick<TypingRecord, "detail" | "score">>,
  result: { netWpm: number; unit: "wpm" | "cpm"; accuracy: number; seconds: number },
  keys: TypingRecord["keys"],
  at = Date.now(),
): TypingRecord {
  return {
    ...o,
    at,
    day: utcDay(at),
    speed: result.netWpm,
    unit: result.unit,
    accuracy: result.accuracy,
    seconds: Math.round(result.seconds),
    keys: { ...keys },
  };
}

export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

/** The first daily challenge: number 1. */
const FIRST_DAY = "2026-11-01";

/** The challenge's number, the same for everyone on a UTC day (Day 1 was FIRST_DAY). */
export const challengeNumber = (day: string): number => dayNumber(day) - dayNumber(FIRST_DAY) + 1;

/**
 * Days in a row, ending today, or yesterday when today's isn't done yet, so a streak doesn't
 * look broken in the morning.
 */
export function streak(days: Iterable<string>, today: string): number {
  const done = new Set(days);
  let day = dayNumber(today);
  if (!done.has(today)) day--;
  let n = 0;
  while (done.has(utcDay(day * DAY_MS))) {
    n++;
    day--;
  }
  return n;
}

/** The longest run of consecutive days. */
export function longestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].map(dayNumber).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && d === sorted[i - 1]! + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** 53-bit string hash (cyrb53): the same seed on every device. */
export function hash(text: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** A seeded generator (mulberry32), for shuffles that are the same on every device. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Words in the daily challenge, about. */
const DAILY_WORDS = 25;

/**
 * The day's challenge text for a language: consecutive sentences from a seeded start until
 * about 25 words, or, without sentences, 25 of the commonest words in a seeded order. The
 * same for everyone on the same UTC day.
 */
export function dailyText(
  slug: string,
  day: string,
  passages: readonly string[],
  words: readonly string[],
): string[] {
  const random = seeded(hash(`${slug}:${day}`));
  if (passages.length) {
    const out: string[] = [];
    let i = Math.floor(random() * passages.length);
    while (out.length < DAILY_WORDS - 5 && out.length < 60) {
      out.push(...passages[i % passages.length]!.split(/\s+/u));
      i++;
    }
    return out;
  }
  const pool = [...words.slice(0, 200)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, DAILY_WORDS);
}

/** Key counts added up over records. */
export function sumKeys(
  records: readonly Pick<TypingRecord, "keys">[],
): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const r of records) {
    for (const [ch, [right, wrong]] of Object.entries(r.keys)) {
      const t = out.get(ch) ?? [0, 0];
      out.set(ch, [t[0] + right, t[1] + wrong]);
    }
  }
  return out;
}

export const keyAccuracy = ([right, wrong]: readonly [number, number]): number =>
  right + wrong ? right / (right + wrong) : 1;

/** Characters typed at least `min` times, least accurate first; only those under 100 %. */
export function weakestKeys(
  keys: ReadonlyMap<string, readonly [number, number]>,
  count = 4,
  min = 8,
): string[] {
  return [...keys]
    .filter(([ch, t]) => t[0] + t[1] >= min && t[1] > 0 && /[\p{L}\p{M}\p{N}]/u.test(ch))
    .sort((a, b) => keyAccuracy(a[1]) - keyAccuracy(b[1]) || b[1][1] - a[1][1])
    .slice(0, count)
    .map(([ch]) => ch);
}

/**
 * Practice words for the weakest keys: common words holding at least one of them, those with
 * more of them first, then by frequency.
 */
export function wordsFor(
  chars: readonly string[],
  frequency: readonly string[],
  count = 40,
): string[] {
  if (!chars.length) return [];
  const scored = frequency
    .map((w, rank) => ({ w, rank, hits: [...w].filter((c) => chars.includes(c)).length }))
    .filter((x) => x.hits > 0);
  scored.sort((a, b) => b.hits - a.hits || a.rank - b.rank);
  return scored.slice(0, count).map((x) => x.w);
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

/** Badges, worked out from the records (so they move with an export). */
export function badges(records: readonly TypingRecord[], today: string): Badge[] {
  const tests = records.filter((r) => r.activity === "test");
  const dailyDays = records.filter((r) => r.activity === "daily").map((r) => r.day);
  const allDays = records.map((r) => r.day);
  const bestWpm = Math.max(0, ...records.filter((r) => r.unit === "wpm").map((r) => r.speed));
  const languages = new Set(records.map((r) => r.slug)).size;
  const longest = Math.max(longestStreak(allDays), streak(allDays, today));
  const list: [string, string, string, boolean][] = [
    ["first", "First steps", "Finish a test, lesson or game.", records.length > 0],
    ["daily", "Daily player", "Finish a daily challenge.", dailyDays.length > 0],
    ["streak-3", "Three in a row", "Practise 3 days in a row.", longest >= 3],
    ["streak-7", "A full week", "Practise 7 days in a row.", longest >= 7],
    ["streak-30", "A month of practice", "Practise 30 days in a row.", longest >= 30],
    ["wpm-20", "20 WPM", "Reach 20 words per minute.", bestWpm >= 20],
    ["wpm-40", "40 WPM", "Reach 40 words per minute.", bestWpm >= 40],
    ["wpm-60", "60 WPM", "Reach 60 words per minute.", bestWpm >= 60],
    [
      "accurate",
      "Sharp shooter",
      "Finish a test of 1 minute or more with 98 % accuracy.",
      tests.some((r) => r.seconds >= 60 && r.accuracy >= 98),
    ],
    ["tests-25", "Regular", "Finish 25 typing tests.", tests.length >= 25],
    ["polyglot", "Polyglot", "Practise 3 languages.", languages >= 3],
  ];
  return list.map(([id, title, description, earned]) => ({ id, title, description, earned }));
}

const ACTIVITIES: ReadonlySet<string> = new Set(["test", "lesson", "daily", "falling", "finder"]);

/** Records from an export file, checked field by field; anything malformed is dropped. */
export function parseExport(json: string): TypingRecord[] {
  const data: unknown = JSON.parse(json);
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { records?: unknown }).records)
      ? (data as { records: unknown[] }).records
      : null;
  if (!list) throw new Error("Not a Likho typing export");
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  return list.flatMap((r): TypingRecord[] => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    if (
      typeof o.slug !== "string" ||
      typeof o.layout !== "string" ||
      typeof o.activity !== "string" ||
      !ACTIVITIES.has(o.activity) ||
      !num(o.at) ||
      !num(o.speed) ||
      !num(o.accuracy) ||
      !num(o.seconds) ||
      (o.unit !== "wpm" && o.unit !== "cpm")
    ) {
      return [];
    }
    const keys: Record<string, [number, number]> = {};
    if (o.keys && typeof o.keys === "object") {
      for (const [ch, v] of Object.entries(o.keys as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1])) keys[ch] = [v[0], v[1]];
      }
    }
    return [
      {
        slug: o.slug,
        layout: o.layout,
        activity: o.activity as Activity,
        at: o.at as number,
        day: utcDay(o.at as number),
        speed: o.speed as number,
        unit: o.unit,
        accuracy: o.accuracy as number,
        seconds: o.seconds as number,
        phone: o.phone === true,
        keys,
        ...(typeof o.detail === "string" ? { detail: o.detail } : {}),
        ...(num(o.score) ? { score: o.score as number } : {}),
      },
    ];
  });
}

/** Identity of a record, for merging an import without duplicates. */
export const recordId = (r: Pick<TypingRecord, "slug" | "activity" | "at">): string =>
  `${r.slug}:${r.activity}:${r.at}`;
