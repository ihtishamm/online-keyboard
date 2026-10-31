/**
 * Field Web Vitals from real visitors (LCP, CLS, INP), reported once per page view when the
 * page is hidden. Small hand-written observers: the numbers match the web-vitals library's
 * definitions closely enough for p75 dashboards, without the dependency.
 */
import { analyticsEnabled, track } from "./track";

export function reportVitals(): void {
  if (!analyticsEnabled() || typeof PerformanceObserver === "undefined") return;
  let lcp = 0;
  let cls = 0;
  let sessionValue = 0;
  let sessionStart = 0;
  let sessionLast = 0;
  let inp = 0;

  const observe = (type: string, fn: (entries: PerformanceEntryList) => void, opts = {}) => {
    try {
      new PerformanceObserver((list) => fn(list.getEntries())).observe({
        type,
        buffered: true,
        ...opts,
      });
    } catch {
      /* entry type unsupported (Safari has no LCP/INP): skip it */
    }
  };

  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcp = last.startTime;
  });
  // CLS: the largest burst of shifts (gaps < 1 s, burst < 5 s), ignoring shifts after input.
  observe("layout-shift", (entries) => {
    for (const e of entries as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (e.hadRecentInput) continue;
      if (sessionValue && e.startTime - sessionLast < 1000 && e.startTime - sessionStart < 5000) {
        sessionValue += e.value;
      } else {
        sessionValue = e.value;
        sessionStart = e.startTime;
      }
      sessionLast = e.startTime;
      cls = Math.max(cls, sessionValue);
    }
  });
  // INP, simplified: the slowest interaction (fine for pages with few interactions per view).
  observe(
    "event",
    (entries) => {
      for (const e of entries as (PerformanceEntry & { interactionId?: number })[]) {
        if (e.interactionId) inp = Math.max(inp, e.duration);
      }
    },
    { durationThreshold: 40 },
  );

  let sent = false;
  addEventListener("visibilitychange", () => {
    if (sent || document.visibilityState !== "hidden") return;
    sent = true;
    track("vitals", {
      lcp: Math.round(lcp),
      cls: Math.round(cls * 1000) / 1000,
      inp: Math.round(inp),
    });
  });
}
