import type { APIRoute } from "astro";
import { KEY_CODES, US_QWERTY } from "@okb/engine";
import { LANGUAGES, getLayout } from "@okb/layouts";
import type { LayoutCandidate } from "../../components/tester/logic";

/**
 * Every key layout on the site, and US QWERTY, as key → character without and with Shift:
 * the keyboard tester compares the computer's layout against these (plan item 8.3). Loaded
 * only when the tester needs it.
 */
export const GET: APIRoute = () => {
  const us: LayoutCandidate = {
    id: "en-us",
    name: "English – US QWERTY",
    n: Object.fromEntries(
      KEY_CODES.filter((c) => c !== "IntlRo" && c !== "IntlYen" && c !== "IntlBackslash").map(
        (c) => [c, US_QWERTY[c][0]],
      ),
    ),
    s: Object.fromEntries(
      KEY_CODES.filter((c) => c !== "IntlRo" && c !== "IntlYen" && c !== "IntlBackslash").map(
        (c) => [c, US_QWERTY[c][1]],
      ),
    ),
  };
  const ours: LayoutCandidate[] = LANGUAGES.flatMap((l) =>
    l.layouts
      .map(getLayout)
      .filter((layout) => !layout.translit)
      .map((layout) => {
        const n: Record<string, string> = {};
        const s: Record<string, string> = {};
        for (const code of KEY_CODES) {
          const def = layout.keys[code];
          if (def?.n) n[code] = def.n;
          if (def?.s) s[code] = def.s;
        }
        return { id: layout.id, name: `${l.name.en} – ${layout.name.en}`, n, s };
      }),
  );
  return new Response(JSON.stringify([us, ...ours]), {
    headers: { "Content-Type": "application/json" },
  });
};
