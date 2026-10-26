import type { FontId } from "@okb/layouts";
import { zipStore } from "./zip";

/**
 * Plain-text .docx: one paragraph per line, in the editor's font and direction. Fonts are named,
 * not embedded (Nastaliq alone is over 1 MB); Word falls back to an installed font for the
 * script when the named one is missing.
 */

export interface DocxOptions {
  /** BCP 47 tag of the text, e.g. "ur". */
  lang: string;
  dir: "ltr" | "rtl";
  font: FontId;
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const FONT_NAME: Record<FontId, string> = {
  nastaliq: "Noto Nastaliq Urdu",
  naskh: "Noto Naskh Arabic",
  devanagari: "Noto Sans Devanagari",
  bengali: "Noto Sans Bengali",
};

/** Font size in half-points: Nastaliq reads small at the sizes Naskh and Indic fonts use. */
const HALF_POINTS: Record<FontId, number> = {
  nastaliq: 32,
  naskh: 28,
  devanagari: 28,
  bengali: 28,
};

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function escapeXml(text: string): string {
  return (
    text
      // Characters XML forbids or discourages: controls other than tab, newline and carriage
      // return, lone surrogates and noncharacters such as U+FFFE.
      .replace(/(?![\t\n\r])[\p{Cc}\p{Cs}\p{Noncharacter_Code_Point}]/gu, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  );
}

function paragraph(line: string): string {
  if (!line) return "<w:p/>";
  const runs = line
    .split("\t")
    .map(
      (part, i) =>
        (i ? "<w:tab/>" : "") + (part ? `<w:t xml:space="preserve">${escapeXml(part)}</w:t>` : ""),
    )
    .join("");
  return `<w:p><w:r>${runs}</w:r></w:p>`;
}

export function documentXml(text: string): string {
  const body = text
    .split(/\r\n|\r|\n/)
    .map(paragraph)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W}"><w:body>${body}` +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`
  );
}

/** Document defaults carry the font, size, language and direction, so every paragraph gets them. */
export function stylesXml({ lang, dir, font }: DocxOptions): string {
  const name = escapeXml(FONT_NAME[font]);
  const size = HALF_POINTS[font];
  const rtl = dir === "rtl";
  const rPr =
    `<w:rFonts w:ascii="${name}" w:hAnsi="${name}" w:eastAsia="${name}" w:cs="${name}"/>` +
    (rtl ? "<w:rtl/>" : "") +
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>` +
    `<w:lang w:val="${escapeXml(lang)}" w:bidi="${escapeXml(lang)}"/>`;
  const pPr =
    (rtl ? "<w:bidi/>" : "") +
    `<w:spacing w:after="160" w:line="${rtl ? 360 : 300}" w:lineRule="auto"/>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="${W}"><w:docDefaults>` +
    `<w:rPrDefault><w:rPr>${rPr}</w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr>${pPr}</w:pPr></w:pPrDefault>` +
    `</w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    `</w:styles>`
  );
}

const CONTENT_TYPES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
  `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
  `</Types>`;

const RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const ROOT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${RELS}/officeDocument" Target="word/document.xml"/>` +
  `</Relationships>`;

const DOCUMENT_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="${RELS}/styles" Target="styles.xml"/>` +
  `</Relationships>`;

export function buildDocx(text: string, options: DocxOptions): Uint8Array {
  const utf8 = new TextEncoder();
  return zipStore([
    { name: "[Content_Types].xml", data: utf8.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: utf8.encode(ROOT_RELS) },
    { name: "word/document.xml", data: utf8.encode(documentXml(text)) },
    { name: "word/_rels/document.xml.rels", data: utf8.encode(DOCUMENT_RELS) },
    { name: "word/styles.xml", data: utf8.encode(stylesXml(options)) },
  ]);
}
