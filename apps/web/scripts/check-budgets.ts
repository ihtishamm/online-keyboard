/**
 * Performance budgets, checked on the built site (dist/):
 *
 *   pnpm build && node scripts/check-budgets.ts
 *
 * For each keyboard page, adds up the JavaScript a phone downloads before it can type: the
 * island's component and renderer and everything they import statically (dynamic imports such
 * as emoji or exports load on demand and are not counted), plus page-level module scripts.
 * Sizes are gzipped, as served. Fails (exit 1) when a page goes over budget.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = join(dirname(new URL(import.meta.url).pathname), "../dist");
/** Initial JavaScript on a keyboard page, gzipped. */
export const JS_BUDGET_KB = Number(process.env.JS_BUDGET_KB ?? 90);

const gz = (file: string) => gzipSync(readFileSync(file)).length;

/** Static imports of a built chunk: `import{a}from"./x.js"` and bare `import"./x.js"`. */
function staticImports(file: string): string[] {
  const code = readFileSync(file, "utf8");
  const found = new Set<string>();
  for (const m of code.matchAll(/(?:^|[;\s}])import\s*(?:[\w${},*\s]+from\s*)?["']([^"']+)["']/g)) {
    found.add(join(dirname(file), m[1]!));
  }
  for (const m of code.matchAll(/\bfrom\s*["'](\.\/[^"']+)["']/g))
    found.add(join(dirname(file), m[1]!));
  return [...found].filter((f) => f.endsWith(".js") && existsSync(f));
}

export function initialJs(html: string): { files: string[]; bytes: number } {
  const roots = new Set<string>();
  for (const m of html.matchAll(/(?:component-url|renderer-url)="([^"]+)"/g)) {
    roots.add(join(DIST, m[1]!));
  }
  for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)) {
    roots.add(join(DIST, m[1]!));
  }
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    staticImports(file).forEach(visit);
  };
  roots.forEach(visit);
  let bytes = 0;
  for (const f of seen) bytes += gz(f);
  // Inline module scripts (Astro hoists small ones into the page).
  for (const m of html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) {
    bytes += gzipSync(m[1]!).length;
  }
  return { files: [...seen], bytes };
}

function keyboardPages(): string[] {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "index.html" && readFileSync(path, "utf8").includes("KeyboardApp")) {
        pages.push(path);
      }
    }
  };
  walk(DIST);
  return pages.sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(DIST)) throw new Error("Build the site first: pnpm build");
  let failed = false;
  for (const page of keyboardPages()) {
    const { bytes, files } = initialJs(readFileSync(page, "utf8"));
    const kb = bytes / 1024;
    const over = kb > JS_BUDGET_KB;
    failed ||= over;
    const name = page.slice(DIST.length).replace(/\/index\.html$/, "") || "/";
    console.log(
      `${over ? "OVER " : "ok   "} ${name.padEnd(28)} ${kb.toFixed(1)} KB in ${files.length} files`,
    );
  }
  console.log(`budget: ${JS_BUDGET_KB} KB gzipped initial JS per keyboard page`);
  if (failed) process.exit(1);
}
