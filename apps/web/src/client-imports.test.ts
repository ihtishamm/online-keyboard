// @vitest-environment node
/**
 * Browser code must never import the layout registry ("@okb/layouts" at run time): it holds
 * every language's layouts, so each page would grow with every language we add. Islands get
 * their language as a prop (`languageBundle()` on the server); types are fine to import.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = new URL(".", import.meta.url).pathname;

function* clientFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* clientFiles(path);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

/** Runtime imports of the registry: `import { x } from "@okb/layouts"`, not `import type`. */
const REGISTRY_IMPORT = /^import\s+(?!type\b)[^;]*from\s+["']@okb\/layouts["']/m;

describe("client bundles", () => {
  it("do not import the layout registry at run time", () => {
    const offenders = [...clientFiles(join(SRC, "components"))]
      .filter((file) => REGISTRY_IMPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file));
    // sheets.ts runs only at build time (Astro pages), never in an island.
    expect(offenders.filter((f) => !f.endsWith("cheatsheet/sheets.ts"))).toEqual([]);
  });
});
