import type { AstroIntegration } from "astro";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Writes dist/sw.js after the build: src/sw/service-worker.js with the list of files to cache
 * on install. That list is the app shell (the home page and the offline page) plus the scripts
 * and styles they load statically. Every other page is cached when it is first opened, or
 * when its language is saved for offline (dist/offline/<slug>.json); at a hundred languages,
 * precaching every page would download hundreds of pages nobody asked for.
 */

export interface Precache {
  /** Hash of every page and precached file; a new build installs a new worker. */
  version: string;
  /** URLs to cache on install. */
  precache: string[];
  /** Every /_astro/ file in the build. */
  assets: string[];
}

/** Pages cached on install: the home page, and the page shown for pages not saved. */
export const SHELL = ["/", "/offline"];
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

/** Scripts and styles a page loads. The worker uses the same patterns (serviceWorkerSource). */
export const HTML_REFS = /["'(](\/_astro\/[^"'()\s]+?\.(?:js|css))["')]/g;
/** Static `import ... from "x"`, `import "x"` and `export ... from "x"`; not `import("x")`. */
export const JS_IMPORTS =
  /\b(?:import|export)\s*(?:[^"'();]*?\bfrom\s*)?["']((?:\.{1,2}|\/_astro)\/[^"']+)["']/g;

/** The scripts and styles the given pages load, following static imports. */
function staticAssets(dist: string, pages: string[], existing: Set<string>): string[] {
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
  return [...needed].sort();
}

export function collectPrecache(dist: string, shell: readonly string[] = SHELL): Precache {
  const files = walk(dist)
    .map((f) => relative(dist, f))
    .sort();
  const pages = files.filter((f) => f.endsWith(".html"));
  const assets = files
    .filter((f) => f.split(sep)[0] === "_astro")
    .map((f) => `/${f.split(sep).join("/")}`);
  const existing = new Set(files.map((f) => `/${f.split(sep).join("/")}`));
  const shellPages = pages.filter((p) => shell.includes(pageUrl(p)));
  const missing = shell.filter((url) => !shellPages.some((p) => pageUrl(p) === url));
  if (missing.length) throw new Error(`App shell pages missing from the build: ${missing}`);

  const precache = [
    ...shellPages.map(pageUrl),
    ...staticAssets(dist, shellPages, existing),
    ...EXTRA.filter((url) => existing.has(url)),
  ];
  // Every page counts: a changed page makes a new worker, which refreshes the saved copies.
  const hash = createHash("sha256");
  for (const page of pages) hash.update(page).update(readFileSync(join(dist, page)));
  for (const url of precache.filter((u) => !shell.includes(u))) {
    hash.update(url).update(readFileSync(join(dist, url)));
  }
  hash.update(assets.join("\n"));
  return { version: hash.digest("hex").slice(0, 12), precache, assets };
}

/**
 * Checks dist/offline/<slug>.json, the lists behind "Save for offline": every page and file
 * they name must be in the build. Returns how many languages there are.
 */
export function checkOfflineManifests(dist: string): number {
  const dir = join(dist, "offline");
  if (!existsSync(dir)) return 0;
  const manifests = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const name of manifests) {
    const { pages, files } = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      pages: string[];
      files: string[];
    };
    const absent = [
      ...pages.filter((p) => !existsSync(join(dist, p, "index.html"))),
      ...files.filter((f) => !existsSync(join(dist, f))),
    ];
    if (absent.length) throw new Error(`offline/${name} names files not in the build: ${absent}`);
  }
  return manifests.length;
}

export function serviceWorkerSource(template: string, data: Precache): string {
  return (
    `const VERSION = ${JSON.stringify(data.version)};\n` +
    `const PRECACHE = ${JSON.stringify(data.precache)};\n` +
    `const ASSETS = ${JSON.stringify(data.assets)};\n` +
    `const HTML_REFS = ${String(HTML_REFS)};\n` +
    `const JS_IMPORTS = ${String(JS_IMPORTS)};\n` +
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
        const languages = checkOfflineManifests(dist);
        logger.info(
          `sw.js ${data.version}: ${data.precache.length} files precached, ${languages} languages to save for offline`,
        );
      },
    },
  };
}
