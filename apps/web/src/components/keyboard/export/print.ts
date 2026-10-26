/**
 * PDF through the browser's print dialog ("Save as PDF"). The browser shapes the text itself,
 * so Nastaliq and Indic scripts come out right and stay selectable and searchable, which a
 * PDF drawn in JavaScript could not do without shipping a shaping engine.
 *
 * The text goes into #print-sheet; the print styles in global.css hide everything else while
 * html.printing is set.
 */

export interface PrintOptions {
  lang: string;
  dir: "ltr" | "rtl";
  /** Editor font class, e.g. "font-nastaliq". */
  fontClass: string;
  /** Suggested PDF file name (most browsers use the document title). */
  title: string;
}

export const PRINT_SHEET_ID = "print-sheet";

export function preparePrintSheet(text: string, options: PrintOptions): HTMLElement {
  document.getElementById(PRINT_SHEET_ID)?.remove();
  const sheet = document.createElement("div");
  sheet.id = PRINT_SHEET_ID;
  sheet.lang = options.lang;
  sheet.dir = options.dir;
  sheet.className = options.fontClass;
  for (const line of text.split(/\r\n|\r|\n/)) {
    const p = document.createElement("p");
    // A non-breaking space keeps blank lines from collapsing.
    p.textContent = line || " ";
    sheet.append(p);
  }
  document.body.append(sheet);
  return sheet;
}

export async function printText(text: string, options: PrintOptions): Promise<void> {
  const sheet = preparePrintSheet(text, options);
  const root = document.documentElement;
  const previousTitle = document.title;

  // Wait for the font so the first page is not printed in a fallback.
  try {
    const family = getComputedStyle(sheet).fontFamily;
    await document.fonts?.load(`16pt ${family}`, text.slice(0, 200));
  } catch {
    /* print with whatever is loaded */
  }

  const cleanUp = () => {
    root.classList.remove("printing");
    document.title = previousTitle;
    sheet.remove();
  };
  window.addEventListener("afterprint", cleanUp, { once: true });
  root.classList.add("printing");
  document.title = options.title;
  window.print();
}
