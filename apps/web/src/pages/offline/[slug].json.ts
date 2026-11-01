import type { APIRoute, GetStaticPaths } from "astro";
import { LANGUAGES, type Language } from "@okb/layouts";
import { offlineManifest } from "../../content/offline";

/** The pages and data "Save for offline" stores for each language (src/sw/service-worker.js). */
export const getStaticPaths: GetStaticPaths = () =>
  LANGUAGES.map((language) => ({ params: { slug: language.slug }, props: { language } }));

export const GET: APIRoute = async ({ props }) =>
  new Response(JSON.stringify(await offlineManifest((props as { language: Language }).language)), {
    headers: { "Content-Type": "application/json" },
  });
