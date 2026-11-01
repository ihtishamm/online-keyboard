// @ts-check
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { SITE_URL } from "./src/config/site-url.ts";
import { SECTIONS, sitemapSection } from "./src/config/sitemap.ts";
import serviceWorker from "./src/sw/build.ts";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  // The CSS is small (~8 KB); inlining it removes render-blocking requests on slow networks.
  build: { inlineStylesheets: "always" },
  integrations: [
    // Islands are written against React's API and run on Preact (preact/compat): the same
    // components for ~55 KB less JavaScript on every keyboard page.
    preact({ compat: true }),
    sitemap({
      filter: (page) => !/\/(share|voice-probe|offline|typing\/progress)\/?$/.test(page),
      // One file per section (src/config/sitemap.ts); the rest go to sitemap-pages-0.xml.
      chunks: Object.fromEntries(
        SECTIONS.map((section) => [
          section,
          (item) => (sitemapSection(item.url) === section ? item : undefined),
        ]),
      ),
    }),
    serviceWorker(),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Server rendering bundles React-API libraries, so that their `react` imports resolve
      // to preact/compat too. Setting this replaces @astrojs/preact's own list, repeated here.
      noExternal: ["react", "react-dom", "react/jsx-runtime", "lucide-react"],
    },
  },
});
