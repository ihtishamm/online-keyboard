import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectPrecache, pageUrl, serviceWorkerSource } from "./build";

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "likho-sw-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

describe("service worker build", () => {
  it("maps pages to their URLs", () => {
    expect(pageUrl("index.html")).toBe("/");
    expect(pageUrl("urdu/index.html")).toBe("/urdu");
    expect(pageUrl("urdu/standard/index.html")).toBe("/urdu/standard");
    expect(pageUrl("404.html")).toBe("/404");
  });

  it("precaches pages and their static imports, not code loaded on demand", () => {
    const dist = fixture({
      "index.html": `<link rel="stylesheet" href="/_astro/site.css"><style>@font-face{src:url(/_astro/font.woff2)}</style>`,
      "urdu/index.html": `<astro-island component-url="/_astro/App.js" renderer-url="/_astro/client.js"></astro-island>`,
      "_astro/App.js": `import{a as b}from"./shared.js";import"./side.js";const e=()=>import("./emoji.js");export{x}from"./re.js";`,
      "_astro/client.js": `import{c}from"./shared.js";`,
      "_astro/shared.js": "export const a=1;",
      "_astro/side.js": "",
      "_astro/re.js": "export const x=1;",
      "_astro/emoji.js": `import{a}from"./shared.js";`,
      "_astro/site.css": "",
      "_astro/font.woff2": "",
      "favicon.svg": "<svg/>",
      "manifest.webmanifest": "{}",
    });
    const { precache, assets, version } = collectPrecache(dist);
    expect(precache).toEqual([
      "/",
      "/urdu",
      "/_astro/App.js",
      "/_astro/client.js",
      "/_astro/re.js",
      "/_astro/shared.js",
      "/_astro/side.js",
      "/_astro/site.css",
      "/favicon.svg",
      "/manifest.webmanifest",
    ]);
    expect(assets).toContain("/_astro/emoji.js");
    expect(assets).toContain("/_astro/font.woff2");
    expect(version).toMatch(/^[0-9a-f]{12}$/);
  });

  it("changes the version when a precached file changes", () => {
    const files = { "index.html": "<p>one</p>", "_astro/x.js": "" };
    const a = collectPrecache(fixture(files)).version;
    const b = collectPrecache(fixture({ ...files, "index.html": "<p>two</p>" })).version;
    expect(a).not.toBe(b);
    expect(collectPrecache(fixture(files)).version).toBe(a);
  });

  it("prepends the lists to the worker", () => {
    const source = serviceWorkerSource("/* worker */", {
      version: "abc",
      precache: ["/"],
      assets: ["/_astro/x.js"],
    });
    expect(source).toBe(
      'const VERSION = "abc";\nconst PRECACHE = ["/"];\nconst ASSETS = ["/_astro/x.js"];\n/* worker */',
    );
  });
});
