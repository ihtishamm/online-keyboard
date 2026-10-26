#!/usr/bin/env node
/**
 * Keeps invisible characters out of source files.
 *
 * - In .ts/.mts/.js/.mjs/.json files, combining marks (Mn/Me) and format characters (Cf:
 *   ZWJ, ZWNJ, LRM, RLM, bidi controls...) must be written as \uXXXX escapes so layouts and
 *   tests stay reviewable. `--fix` rewrites them. (Escapes are valid in string, template and
 *   regex literals, and harmless in comments.)
 * - In every checked file, including .tsx/.astro/.md, bidi embedding/override/isolate controls
 *   are rejected outright: they can make code display differently from how it runs
 *   ("Trojan Source", CVE-2021-42574).
 *
 * Usage: node tools/invisible-chars.mjs [--fix]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
]);
const ESCAPABLE_EXT = new Set([".ts", ".mts", ".js", ".mjs", ".json"]);
const CHECK_EXT = new Set([...ESCAPABLE_EXT, ".tsx", ".astro", ".md", ".css", ".yml", ".yaml"]);
const SKIP_FILES = new Set(["pnpm-lock.yaml"]);

const INVISIBLE = /[\p{Mn}\p{Me}\p{Cf}]/gu;
const BIDI_CONTROL = /[\u202A-\u202E\u2066-\u2069]/gu;

const fix = process.argv.includes("--fix");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (CHECK_EXT.has(extname(name)) && !SKIP_FILES.has(name)) yield path;
  }
}

const escape = (ch) => "\\u" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");

let problems = 0;
for (const path of walk(ROOT)) {
  const rel = relative(ROOT, path);
  const text = readFileSync(path, "utf8");

  for (const m of text.matchAll(BIDI_CONTROL)) {
    const line = text.slice(0, m.index).split("\n").length;
    console.error(`${rel}:${line}: bidi control ${escape(m[0])} is not allowed`);
    problems++;
  }

  if (!ESCAPABLE_EXT.has(extname(path))) continue;
  const invisible = [...text.matchAll(INVISIBLE)];
  if (invisible.length === 0) continue;
  if (fix) {
    writeFileSync(path, text.replace(INVISIBLE, escape));
    console.log(`${rel}: escaped ${invisible.length} invisible character(s)`);
  } else {
    for (const m of invisible) {
      const line = text.slice(0, m.index).split("\n").length;
      console.error(`${rel}:${line}: write ${escape(m[0])} as an escape (run with --fix)`);
      problems++;
    }
  }
}

if (problems > 0) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
