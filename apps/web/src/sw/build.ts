import type { AstroIntegration } from "astro";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Writes dist/sw.js after the build: src/sw/service-worker.js with the list of files to cache
 * on install. That list is every page plus the scripts and styles the pages load statically.
 * Code and data loaded on demand (dynamic imports such as emoji keywords, word lists) and fonts
 * are left out; the worker caches them when they are first used.
 */

export interface Precache {
  version: string;
  /** URLs to cache on install. */
  precache: string[];
  /** Every /_astro/ file in the build. */
  assets: string[];
}

/** Other public files worth having offline. */
const EXTRA = ["/favicon.svg", "/manifest.webmanifest", "/icons/icon-192.png"];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

/** "urdu/standard/index.html" -> "/urdu/standard"; "index.html" -> "/". */
export function pageUrl(file: string): string {
  const path = `/${file.split(sep).join("/")}`.replace(/(\/index)?\.html$/, "");
  return path || "/";
}

const HTML_REFS = /["'(](\/_astro\/[^"'()\s]+?\.(?:js|css))["')]/g;
/** Static `import ... from "x"`, `import "x"` and `export ... from "x"`; not `import("x")`. */
const JS_IMPORTS =
  /\b(?:import|export)\s*(?:[^"'();]*?\bfrom\s*)?["']((?:\.{1,2}|\/_astro)\/[^"']+)["']/g;

export function collectPrecache(dist: string): Precache {
  const files = walk(dist).map((f) => relative(dist, f));
  const pages = files.filter((f) => f.endsWith(".html"));
  const assets = files
    .filter((f) => f.split(sep)[0] === "_astro")
    .map((f) => `/${f.split(sep).join("/")}`)
    .sort();
  const existing = new Set(files.map((f) => `/${f.split(sep).join("/")}`));

  const needed = new Set<string>();
  const queue: string[] = [];
  const add = (url: string) => {
    if (!needed.has(url) && existing.has(url)) {
      needed.add(url);
      queue.push(url);
    }
  };
  for (const page of pages) {
    for (const m of readFileSync(join(dist, page), "utf8").matchAll(HTML_REFS)) add(m[1]!);
  }
  while (queue.length) {
    const url = queue.shift()!;
    if (!url.endsWith(".js")) continue;
    const code = readFileSync(join(dist, url), "utf8");
    for (const m of code.matchAll(JS_IMPORTS)) {
      add(m[1]!.startsWith("/") ? m[1]! : posix.join(posix.dirname(url), m[1]!));
    }
  }

  const precache = [
    ...pages.map(pageUrl).sort(),
    ...[...needed].sort(),
    ...EXTRA.filter((url) => existing.has(url)),
  ];
  const hash = createHash("sha256");
  for (const url of precache) {
    const file =
      url.startsWith("/_astro/") || EXTRA.includes(url)
        ? url
        : pages.find((p) => pageUrl(p) === url)!;
    hash.update(url).update(readFileSync(join(dist, file)));
  }
  return { version: hash.digest("hex").slice(0, 12), precache, assets };
}

export function serviceWorkerSource(template: string, data: Precache): string {
  return (
    `const VERSION = ${JSON.stringify(data.version)};\n` +
    `const PRECACHE = ${JSON.stringify(data.precache)};\n` +
    `const ASSETS = ${JSON.stringify(data.assets)};\n` +
    template
  );
}

export default function serviceWorker(): AstroIntegration {
  let root: URL;
  return {
    name: "likho:service-worker",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = config.root;
      },
      "astro:build:done": ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const template = readFileSync(new URL("src/sw/service-worker.js", root), "utf8");
        const data = collectPrecache(dist);
        writeFileSync(join(dist, "sw.js"), serviceWorkerSource(template, data));
        logger.info(`sw.js ${data.version}: ${data.precache.length} files precached`);
      },
    },
  };
}
