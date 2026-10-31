import type { TranslateCodes } from "@okb/layouts";

/**
 * The look-up menu (plan item 7.4): send the selection, or the text, to a translator, a
 * dictionary or a search engine. Nothing leaves the page until the user clicks a link, and the
 * menu says that each link opens another site.
 */
export interface LookupLink {
  /** Short id for analytics: google, bing, deepl, wiktionary, search. */
  id: string;
  label: string;
  href: string;
}

/** Translation sites cap their URLs; keep well under the shortest limit. */
const MAX_CHARS = 1500;

export function lookupLinks(text: string, translate: TranslateCodes): LookupLink[] {
  const q = text.trim().slice(0, MAX_CHARS);
  if (!q) return [];
  const e = encodeURIComponent(q);
  const links: LookupLink[] = [];
  if (translate.google) {
    links.push({
      id: "google",
      label: "Translate with Google",
      href: `https://translate.google.com/?sl=${translate.google}&tl=en&text=${e}&op=translate`,
    });
  }
  if (translate.bing) {
    links.push({
      id: "bing",
      label: "Translate with Bing",
      href: `https://www.bing.com/translator?from=${translate.bing}&to=en&text=${e}`,
    });
  }
  if (translate.deepl) {
    // DeepL reads the text from the fragment; a slash in it must be escaped.
    links.push({
      id: "deepl",
      label: "Translate with DeepL",
      href: `https://www.deepl.com/translator#${translate.deepl}/en/${encodeURIComponent(q.replace(/\//g, "\\/"))}`,
    });
  }
  // Wiktionary looks up one word or phrase: the first line is enough.
  const term = q.split(/\n/)[0]!.trim();
  links.push({
    id: "wiktionary",
    label: "Look up in Wiktionary",
    href: `https://en.wiktionary.org/w/index.php?search=${encodeURIComponent(term)}&go=Go`,
  });
  links.push({ id: "search", label: "Search the web", href: `https://duckduckgo.com/?q=${e}` });
  return links;
}

/** The selected text, or all of it when nothing is selected. */
export function lookupText(el: HTMLTextAreaElement | null): string {
  if (!el) return "";
  const { selectionStart: a, selectionEnd: b, value } = el;
  return a !== b ? value.slice(Math.min(a, b), Math.max(a, b)) : value;
}
