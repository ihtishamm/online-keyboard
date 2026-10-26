/**
 * What the printable charts are made from. If any of it changes, the committed PDFs in
 * public/cheat-sheets are stale: run `pnpm build && node scripts/make-cheatsheets.ts`.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { SITE_URL } from "../src/config/site-url.ts";

const WEB = join(dirname(new URL(import.meta.url).pathname), "..");
const ROOT = join(WEB, "../..");

const INPUTS = [
  "packages/layouts/data",
  "packages/layouts/src/index.ts",
  "apps/web/src/components/cheatsheet",
  "apps/web/src/components/keyboard/labels.ts",
  "apps/web/src/components/fonts.ts",
  "apps/web/src/content/languages.ts",
  "apps/web/src/config/site.ts",
];

function* files(path: string): Generator<string> {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path).sort()) yield* files(join(path, name));
  } else if (!path.endsWith(".test.ts")) yield path;
}

export function siteUrl(): string {
  return SITE_URL;
}

export function cheatsheetInputsHash(): string {
  const hash = createHash("sha256").update(SITE_URL);
  for (const input of INPUTS) {
    for (const file of files(join(ROOT, input))) {
      hash.update(relative(ROOT, file)).update(readFileSync(file));
    }
  }
  return hash.digest("hex").slice(0, 16);
}
