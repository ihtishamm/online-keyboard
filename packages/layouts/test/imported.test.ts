/**
 * Layouts in languages/ that come from upstream sources must match what scripts/imports.ts builds
 * from vendor/. Run with UPDATE_LAYOUTS=1 (pnpm --filter @okb/layouts import:layouts) to rewrite them.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importReport } from "../scripts/import-report";
import { IMPORTS, buildImport } from "../scripts/imports";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.env.UPDATE_LAYOUTS === "1";

/** JSON with invisible characters (marks, ZWJ/ZWNJ, bidi marks) escaped, as tools/invisible-chars.mjs requires. */
function toJson(value: unknown): string {
  return (
    JSON.stringify(value, null, 2).replace(
      /[\p{Mn}\p{Me}\p{Cf}]/gu,
      (ch) => "\\u" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"),
    ) + "\n"
  );
}

describe.each(IMPORTS.map((spec) => [spec.meta.id, spec] as const))("%s", (_id, spec) => {
  const sourcePath = join(
    ROOT,
    "vendor",
    "cldr" in spec.from ? spec.from.cldr : "xkb" in spec.from ? spec.from.xkb : spec.from.keyman,
  );
  const outPath = join(ROOT, "languages", spec.out);
  const { layout, warnings } = buildImport(spec, readFileSync(sourcePath, "utf8"));

  it("matches its upstream source", () => {
    if (UPDATE) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, toJson(layout));
      if (warnings.length) console.warn(`${spec.meta.id}:\n  ${warnings.join("\n  ")}`);
    }
    expect(
      existsSync(outPath),
      `${spec.out} missing: run pnpm --filter @okb/layouts import:layouts`,
    ).toBe(true);
    expect(JSON.parse(readFileSync(outPath, "utf8"))).toEqual(layout);
  });
});

it("IMPORTS.md is up to date", () => {
  const path = join(ROOT, "IMPORTS.md");
  const report = importReport(ROOT);
  if (UPDATE) writeFileSync(path, report);
  expect(
    existsSync(path) ? readFileSync(path, "utf8") : "",
    "run pnpm --filter @okb/layouts import:layouts",
  ).toBe(report);
});
