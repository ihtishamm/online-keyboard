// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cheatsheetInputsHash } from "../../../scripts/cheatsheet-inputs.ts";
import { allSheets } from "./sheets";

const OUT = new URL("../../../public/cheat-sheets/", import.meta.url);
const REGENERATE = "run `pnpm build && node scripts/make-cheatsheets.ts` in apps/web";

describe("printable charts", () => {
  const sheets = allSheets();

  it("cover every layout, with unique ids", () => {
    expect(sheets.length).toBe(13);
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length);
    expect(sheets.find((s) => s.id === "urdu-roman")?.kind).toBe("roman");
  });

  it("have an up-to-date PDF each", () => {
    const manifest = JSON.parse(readFileSync(new URL("manifest.json", OUT), "utf8")) as {
      hash: string;
      sheets: string[];
    };
    expect(manifest.hash, `The PDFs are out of date: ${REGENERATE}`).toBe(cheatsheetInputsHash());
    expect(manifest.sheets).toEqual(sheets.map((s) => s.id).sort());
    for (const { id } of sheets) {
      const pdf = new URL(`${id}.pdf`, OUT);
      expect(existsSync(pdf), `${id}.pdf is missing: ${REGENERATE}`).toBe(true);
      expect(readFileSync(pdf).subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});
