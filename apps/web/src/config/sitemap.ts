/**
 * Sitemap sections (plan Phase 9, scaling work): one file per kind of page, so each stays
 * small at a hundred languages and Search Console reports coverage per section. The home
 * page and anything not matched go to sitemap-pages-0.xml.
 */
export type Section = "keyboards" | "typing" | "guides" | "cheat-sheets" | "tools";

const TOOLS = new Set(["case-converter", "inpage-to-unicode", "keyboard-tester"]);

/** The section of an absolute page URL, or null for the general one. */
export function sitemapSection(url: string): Section | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  if (first === "typing" || /-typing-(test|tutor|games)$/.test(first)) return "typing";
  if (first === "guides") return "guides";
  if (first === "cheat-sheets") return "cheat-sheets";
  if (TOOLS.has(first)) return "tools";
  // /<language>, /<language>/<layout> and /<language>/to-roman.
  return parts.length <= 2 ? "keyboards" : null;
}

export const SECTIONS: readonly Section[] = [
  "keyboards",
  "typing",
  "guides",
  "cheat-sheets",
  "tools",
];
