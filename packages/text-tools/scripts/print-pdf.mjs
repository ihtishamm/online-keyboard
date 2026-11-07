/**
 * Prints test/data/pdf-sentences.tsv to a PDF with headless Chrome, one sentence a line, right
 * to left, in Noto Sans Arabic: the real PDF whose extracted text the tests repair.
 *
 * Run it where Playwright is installed, then extract the text with poppler's pdftotext:
 *   cd apps/web && node ../../packages/text-tools/scripts/print-pdf.mjs \
 *     ../../packages/text-tools/test/data/pdf-sentences.tsv /tmp/sentences.pdf
 *   pdftotext /tmp/sentences.pdf ../../packages/text-tools/test/data/pdf-pdftotext.txt
 *   pdftotext -raw /tmp/sentences.pdf ../../packages/text-tools/test/data/pdf-pdftotext-raw.txt
 * (2026-11-07: Chromium of Playwright 1.5x, pdftotext 24.02.)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(`${process.cwd()}/`)("@playwright/test");
const [tsv, out] = process.argv.slice(2);
if (!tsv || !out) throw new Error("usage: print-pdf.mjs SENTENCES.tsv OUT.pdf");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rows = readFileSync(tsv, "utf8")
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split("\t"));
const body = rows
  .map(([code, s]) => `<p lang="${code}" style="white-space:nowrap;margin:0 0 6px">${esc(s)}</p>`)
  .join("");
const html = `<html dir="rtl"><body style="font-family:'Noto Sans Arabic',serif;font-size:11px;margin:0">${body}</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: out, width: "16in", height: "30in" });
await browser.close();
