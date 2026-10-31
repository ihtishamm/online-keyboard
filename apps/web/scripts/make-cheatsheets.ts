/**
 * Prints each printable keyboard chart (/cheat-sheets/<id>) to dist/cheat-sheets/<id>.pdf
 * with Playwright's Chromium. It is the second half of `pnpm build` (after `astro build`), so
 * the PDFs always match the layouts and the site address they print. They are not committed:
 * at a hundred languages they would weigh tens of megabytes in git.
 *
 * Set SKIP_PDFS=1 to build without them (CI's type/lint job, quick local builds).
 *
 * Pages are served straight from dist/ through request interception, so no server is needed.
 */
import { chromium } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const WEB = join(dirname(new URL(import.meta.url).pathname), "..");
const DIST = join(WEB, "dist");
const OUT = join(DIST, "cheat-sheets");
const ORIGIN = "http://sheets.local";

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

if (process.env.SKIP_PDFS) {
  console.log("SKIP_PDFS is set: no cheat-sheet PDFs");
  process.exit(0);
}
const pagesDir = OUT;
if (!existsSync(pagesDir)) throw new Error("Build the site first: pnpm build");
const ids = readdirSync(pagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(pagesDir, d.name, "index.html")))
  .map((d) => d.name)
  .sort();

const browser = await chromium.launch();
const context = await browser.newContext();
await context.route(`${ORIGIN}/**`, async (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  let file = join(DIST, path);
  if (!extname(file)) file = join(file, "index.html");
  if (!file.startsWith(DIST) || !existsSync(file)) return route.fulfill({ status: 404 });
  await route.fulfill({
    body: readFileSync(file),
    contentType: TYPES[extname(file)] ?? "application/octet-stream",
  });
});
// Show Nastaliq at once (Base.astro otherwise loads it when idle) and keep the light theme.
await context.addInitScript(() => {
  localStorage.setItem("likho:nastaliq", "1");
  localStorage.setItem("likho:theme", "light");
});

for (const id of ids) {
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/cheat-sheets/${id}`, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const texts = [...document.querySelectorAll<HTMLElement>("[data-sheet] [lang]")];
    await Promise.all(
      texts.map((el) =>
        document.fonts.load(`32px ${getComputedStyle(el).fontFamily}`, el.textContent ?? ""),
      ),
    );
    await document.fonts.ready;
  });
  await page.pdf({
    path: join(OUT, `${id}.pdf`),
    preferCSSPageSize: true,
    printBackground: true,
  });
  await page.close();
  console.log(`cheat-sheets/${id}.pdf`);
}
await browser.close();
