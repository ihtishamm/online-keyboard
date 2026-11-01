import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkOfflineManifests,
  collectPrecache,
  HTML_REFS,
  JS_IMPORTS,
  pageUrl,
  serviceWorkerSource,
} from "./build";

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

  it("precaches the app shell and its static imports, not other pages or code loaded on demand", () => {
    const dist = fixture({
      "index.html": `<link rel="stylesheet" href="/_astro/site.css"><style>@font-face{src:url(/_astro/font.woff2)}</style><astro-island component-url="/_astro/App.js" renderer-url="/_astro/client.js"></astro-island>`,
      "offline/index.html": `<link rel="stylesheet" href="/_astro/site.css">`,
      "urdu/index.html": `<script src="/_astro/Urdu.js"></script>`,
      "_astro/App.js": `import{a as b}from"./shared.js";import"./side.js";const e=()=>import("./emoji.js");export{x}from"./re.js";`,
      "_astro/client.js": `import{c}from"./shared.js";`,
      "_astro/shared.js": "export const a=1;",
      "_astro/side.js": "",
      "_astro/re.js": "export const x=1;",
      "_astro/emoji.js": `import{a}from"./shared.js";`,
      "_astro/Urdu.js": "",
      "_astro/site.css": "",
      "_astro/font.woff2": "",
      "favicon.svg": "<svg/>",
      "manifest.webmanifest": "{}",
    });
    const { precache, assets, version } = collectPrecache(dist);
    expect(precache).toEqual([
      "/",
      "/offline",
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
    expect(assets).toContain("/_astro/Urdu.js");
    expect(assets).toContain("/_astro/font.woff2");
    expect(version).toMatch(/^[0-9a-f]{12}$/);
  });

  it("needs the shell pages in the build", () => {
    expect(() => collectPrecache(fixture({ "index.html": "" }))).toThrow(/\/offline/);
  });

  it("changes the version when any page changes", () => {
    const files = { "index.html": "", "offline/index.html": "", "urdu/index.html": "<p>one</p>" };
    const a = collectPrecache(fixture(files)).version;
    const b = collectPrecache(fixture({ ...files, "urdu/index.html": "<p>two</p>" })).version;
    expect(a).not.toBe(b);
    expect(collectPrecache(fixture(files)).version).toBe(a);
  });

  it("checks that saved-language lists name only built files", () => {
    const files = {
      "urdu/index.html": "",
      "urdu-typing-test/index.html": "",
      "_astro/dict.txt": "",
    };
    const ok = { slug: "urdu", pages: ["/urdu", "/urdu-typing-test"], files: ["/_astro/dict.txt"] };
    expect(
      checkOfflineManifests(fixture({ ...files, "offline/urdu.json": JSON.stringify(ok) })),
    ).toBe(1);
    const bad = { ...ok, pages: [...ok.pages, "/urdu/gone"] };
    expect(() =>
      checkOfflineManifests(fixture({ ...files, "offline/urdu.json": JSON.stringify(bad) })),
    ).toThrow(/\/urdu\/gone/);
  });

  it("prepends the lists and patterns to the worker", () => {
    const source = serviceWorkerSource("/* worker */", {
      version: "abc",
      precache: ["/"],
      assets: ["/_astro/x.js"],
    });
    expect(source).toBe(
      'const VERSION = "abc";\nconst PRECACHE = ["/"];\nconst ASSETS = ["/_astro/x.js"];\n' +
        `const HTML_REFS = ${String(HTML_REFS)};\nconst JS_IMPORTS = ${String(JS_IMPORTS)};\n` +
        "/* worker */",
    );
    // The patterns survive the trip as source text.
    const refs = new Function(`${source}; return [HTML_REFS, JS_IMPORTS];`)() as RegExp[];
    expect([...'<script src="/_astro/a.js">'.matchAll(refs[0]!)].map((m) => m[1])).toEqual([
      "/_astro/a.js",
    ]);
    expect([...'import"./b.js";import("./c.js")'.matchAll(refs[1]!)].map((m) => m[1])).toEqual([
      "./b.js",
    ]);
  });
});
