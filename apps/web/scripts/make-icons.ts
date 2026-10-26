/**
 * Renders the PWA and home-screen icons from the SVG logos with Playwright's Chromium:
 *
 *   node scripts/make-icons.ts
 *
 * public/favicon.svg -> icons/icon-192.png, icon-512.png
 * public/icons/maskable.svg (full bleed, logo inside the safe zone) -> icons/maskable-512.png and
 * apple-touch-icon.png (180; iOS rounds the corners itself and shows transparency as black)
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PUBLIC = join(dirname(new URL(import.meta.url).pathname), "../public");
const OUTPUTS: [source: string, size: number, out: string][] = [
  ["favicon.svg", 192, "icons/icon-192.png"],
  ["favicon.svg", 512, "icons/icon-512.png"],
  ["icons/maskable.svg", 180, "icons/apple-touch-icon.png"],
  ["icons/maskable.svg", 512, "icons/maskable-512.png"],
];

const browser = await chromium.launch();
for (const [source, size, out] of OUTPUTS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const svg = readFileSync(join(PUBLIC, source), "utf8");
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: join(PUBLIC, out), omitBackground: true });
  await page.close();
  console.log(out);
}
await browser.close();
