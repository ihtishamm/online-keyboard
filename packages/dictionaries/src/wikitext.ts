/**
 * Turns MediaWiki markup into plain prose. Deliberately lossy: anything that is not running
 * text (templates, tables, references, file links, URLs) is dropped, because only word
 * frequencies and word pairs are kept.
 */

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(lt|gt|quot|apos|nbsp|amp);/g, (m) => ENTITIES[m] ?? m);
}

/** Remove balanced `open … close` spans, including nested ones. Unclosed spans run to the end. */
export function removeNested(text: string, open: string, close: string): string {
  let out = "";
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(open, i)) {
      depth++;
      i += open.length;
    } else if (depth > 0 && text.startsWith(close, i)) {
      depth--;
      i += close.length;
      if (depth === 0) out += " ";
    } else {
      if (depth === 0) out += text[i];
      i++;
    }
  }
  return out;
}

/** Replace `[[target|label]]` with its label, innermost first; namespaced links vanish. */
function replaceLinks(text: string): string {
  const link = /\[\[([^[\]]*)\]\]/g;
  for (let guard = 0; guard < 10 && text.includes("[["); guard++) {
    const next = text.replace(link, (_, body: string) => {
      const bar = body.lastIndexOf("|");
      const target = bar >= 0 ? body.slice(0, body.indexOf("|")) : body;
      // File:, Category:, زمرہ:, تصویر:, interlanguage en: ...
      if (/^\s*[^:\s][^:]{0,20}:/.test(target)) return " ";
      return bar >= 0 ? body.slice(bar + 1) : body;
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

export function stripWikitext(source: string): string {
  let s = decodeEntities(source);
  s = s.replace(/<!--[\s\S]*?(-->|$)/g, " ");
  s = s.replace(/<ref\b[^>]*\/>/gi, " ");
  s = s.replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, " ");
  s = s.replace(
    /<(math|code|pre|syntaxhighlight|source|gallery|timeline|score|chem|hiero|graph|mapframe|imagemap|poem)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    " ",
  );
  s = removeNested(s, "{{", "}}");
  s = removeNested(s, "{|", "|}");
  s = s.replace(/<[^>]*>/g, " ");
  s = replaceLinks(s);
  s = s.replace(/\[(?:https?:|ftp:)?\/\/[^\s\]]*\s*([^\]]*)\]/g, " $1 ");
  s = s.replace(/(?:https?:|ftp:)\/\/\S+/g, " ");
  s = s.replace(/'{2,}/g, "");
  s = s.replace(/__[A-Z_]+__/g, " ");
  s = s.replace(/^[=]+|[=]+$/gm, " ");
  s = s.replace(/^[*#:;]+/gm, " ");
  return s;
}

export interface WikiPage {
  title: string;
  ns: number;
  text: string;
}

/**
 * Streaming parser for a pages-articles XML dump: feed it lines, get pages back.
 * Only the fields used here are read; it is not a general XML parser.
 */
export class DumpReader {
  private title = "";
  private ns = -1;
  private inText = false;
  private text: string[] = [];

  /** Returns a page when `line` completes one. */
  line(line: string): WikiPage | null {
    if (this.inText) {
      const end = line.indexOf("</text>");
      if (end < 0) {
        this.text.push(line);
        return null;
      }
      this.text.push(line.slice(0, end));
      return this.finish();
    }
    const t = line.indexOf("<title>");
    if (t >= 0) {
      this.title = decodeEntities(line.slice(t + 7, line.indexOf("</title>")));
      this.ns = -1;
      return null;
    }
    const n = line.indexOf("<ns>");
    if (n >= 0) {
      this.ns = Number(line.slice(n + 4, line.indexOf("</ns>")));
      return null;
    }
    const open = line.indexOf("<text");
    if (open >= 0) {
      const close = line.indexOf(">", open);
      if (line[close - 1] === "/") return null; // <text ... /> : empty page
      const rest = line.slice(close + 1);
      const end = rest.indexOf("</text>");
      if (end >= 0) {
        this.text = [rest.slice(0, end)];
        return this.finish();
      }
      this.inText = true;
      this.text = [rest];
    }
    return null;
  }

  private finish(): WikiPage {
    const page = { title: this.title, ns: this.ns, text: this.text.join("\n") };
    this.inText = false;
    this.text = [];
    return page;
  }
}

/** Redirect pages hold no prose. Urdu Wikipedia also uses the localised keyword. */
export function isRedirect(text: string): boolean {
  // `#REDIRECT [[…]]` in English or the wiki's own word (#رجوع_مکرر, #تحويل, #अनुप्रेषित, …).
  return /^\s*#\s*(redirect|رجوع[_ ]مکرر)/i.test(text) || /^\s*#[^\s[]+\s*\[\[/u.test(text);
}
