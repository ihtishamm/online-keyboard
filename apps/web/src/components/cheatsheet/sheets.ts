import { LANGUAGES, getLayout, layoutSlug, type Language, isRomanLayout } from "@okb/layouts";
import { romanFor } from "../../content/roman";

/** A printable one-page chart of a layout: its keys, or for Roman typing the spelling guide. */
export interface Sheet {
  /** e.g. "urdu-phonetic": the page is /cheat-sheets/<id>, the PDF /cheat-sheets/<id>.pdf. */
  id: string;
  language: Language;
  layoutId: string;
  kind: "keys" | "roman";
}

export function allSheets(): Sheet[] {
  return LANGUAGES.flatMap((language) =>
    language.layouts.flatMap((layoutId): Sheet[] => {
      const roman = isRomanLayout(getLayout(layoutId));
      if (roman && !romanFor(layoutId)) return [];
      const id = `${language.slug}-${layoutSlug(layoutId)}`;
      return [{ id, language, layoutId, kind: roman ? "roman" : "keys" }];
    }),
  );
}

export const sheetPath = (id: string) => `/cheat-sheets/${id}`;
export const pdfPath = (id: string) => `/cheat-sheets/${id}.pdf`;

/** The keyboard page a sheet's layout lives on. */
export function keyboardPath(sheet: Sheet): string {
  const { language, layoutId } = sheet;
  return layoutId === language.layouts[0]
    ? `/${language.slug}`
    : `/${language.slug}/${layoutSlug(layoutId)}`;
}
