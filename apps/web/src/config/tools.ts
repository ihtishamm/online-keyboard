/**
 * Stand-alone tool pages (plan Phase 10): their sitemap section, and the keyboard pages that
 * link to them. `languages` are keyboard page slugs.
 */
export interface ToolPage {
  path: string;
  /** Link text on keyboard pages. */
  name: string;
  languages: readonly string[];
}

export const TOOL_PAGES: readonly ToolPage[] = [
  { path: "/case-converter", name: "Case converter", languages: [] },
  { path: "/keyboard-tester", name: "Keyboard tester", languages: [] },
  { path: "/inpage-to-unicode", name: "InPage to Unicode", languages: ["urdu"] },
  { path: "/kruti-dev-to-unicode", name: "Kruti Dev to Unicode", languages: ["hindi", "marathi"] },
  { path: "/chanakya-to-unicode", name: "Chanakya to Unicode", languages: ["hindi"] },
  { path: "/bijoy-to-unicode", name: "Bijoy to Unicode", languages: ["bangla"] },
  { path: "/zawgyi-to-unicode", name: "Zawgyi to Unicode", languages: ["burmese"] },
  {
    path: "/shahmukhi-to-gurmukhi",
    name: "Shahmukhi to Gurmukhi",
    languages: ["punjabi", "shahmukhi"],
  },
  { path: "/urdu-to-hindi", name: "Urdu to Hindi", languages: ["urdu", "hindi"] },
  {
    path: "/serbian-cyrillic-to-latin",
    name: "Serbian Cyrillic to Latin",
    languages: ["serbian"],
  },
  {
    path: "/kazakh-cyrillic-to-latin",
    name: "Kazakh Cyrillic to Latin",
    languages: ["kazakh"],
  },
  {
    path: "/uzbek-cyrillic-to-latin",
    name: "Uzbek Cyrillic to Latin",
    languages: ["uzbek"],
  },
];

/** The tools a keyboard page links to. */
export function toolsFor(slug: string): ToolPage[] {
  return TOOL_PAGES.filter((t) => t.languages.includes(slug));
}
