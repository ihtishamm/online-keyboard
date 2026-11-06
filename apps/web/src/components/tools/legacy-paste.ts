/**
 * Font-aware paste for legacy-font converters. Text copied from Word or Google Docs carries
 * HTML with each run's font. A document typed in Kruti Dev usually has English words, digits
 * or headings in other fonts; converting all of it would garble those. This converts only
 * the runs set in the legacy font and keeps the rest as they are.
 */

export interface MixedResult {
  text: string;
  /** Runs converted, and runs kept because they are in another font. */
  converted: number;
  kept: number;
  unknown: number;
}

const BLOCKS = new Set([
  "P",
  "DIV",
  "LI",
  "TR",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "TABLE",
  "UL",
  "OL",
]);

/** Font families set by class in the clipboard's <style> (Word: p.MsoNormal {font-family: …}). */
function classFonts(doc: Document): Map<string, string> {
  const fonts = new Map<string, string>();
  for (const style of doc.querySelectorAll("style")) {
    const css = (style.textContent ?? "").replace(/\/\*[\s\S]*?\*\/|<!--|-->/g, "");
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const family = /font-family\s*:\s*([^;]+)/i.exec(body!)?.[1];
      if (!family) continue;
      for (const selector of selectors!.split(",")) {
        const cls = /\.([\w-]+)\s*$/.exec(selector.trim())?.[1];
        if (cls) fonts.set(cls, family);
      }
    }
  }
  return fonts;
}

function fontOf(el: Element | null, classes: Map<string, string>): string {
  for (let node = el; node; node = node.parentElement) {
    const inline = (node as HTMLElement).style?.fontFamily;
    if (inline) return inline;
    const face = node.getAttribute("face");
    if (node.tagName === "FONT" && face) return face;
    for (const cls of node.classList) {
      const family = classes.get(cls);
      if (family) return family;
    }
  }
  return "";
}

/**
 * Converts the runs of `html` whose font matches `isLegacyFont`, or returns null when no run
 * does (then the plain text is all there is to go on).
 */
export function convertLegacyRuns(
  html: string,
  isLegacyFont: (family: string) => boolean,
  convert: (text: string) => { text: string; unknown: number },
): MixedResult | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const classes = classFonts(doc);
  const runs: { text: string; legacy: boolean }[] = [];
  let out = "";
  const result = { converted: 0, kept: 0, unknown: 0 };

  const flush = () => {
    for (const run of runs) {
      if (run.text.trim()) result[run.legacy ? "converted" : "kept"]++;
      if (run.legacy) {
        const converted = convert(run.text);
        out += converted.text;
        result.unknown += converted.unknown;
      } else {
        out += run.text;
      }
    }
    runs.length = 0;
  };
  const push = (text: string, legacy: boolean) => {
    const last = runs.at(-1);
    if (last && last.legacy === legacy) last.text += text;
    else runs.push({ text, legacy });
  };

  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent ?? "").replace(/[\r\n\t ]+/g, " ");
        if (!text) continue;
        // A space belongs to no font: keep it with the run around it.
        const legacy = text.trim()
          ? isLegacyFont(fontOf(child.parentElement, classes))
          : (runs.at(-1)?.legacy ?? false);
        push(text, legacy);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (["STYLE", "SCRIPT", "HEAD", "TITLE", "META"].includes(el.tagName)) continue;
        if (el.tagName === "BR") {
          flush();
          out += "\n";
          continue;
        }
        const block = BLOCKS.has(el.tagName);
        walk(el);
        if (block) {
          flush();
          if (out && !out.endsWith("\n")) out += "\n";
        }
      }
    }
  };
  walk(doc.body);
  flush();
  if (result.converted === 0) return null;
  return { text: out.replace(/ *\n */g, "\n").trim(), ...result };
}
