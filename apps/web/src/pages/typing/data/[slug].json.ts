import type { APIRoute, GetStaticPaths } from "astro";
import { LANGUAGES, type Language } from "@okb/layouts";
import { TYPING_LANGUAGES, gameData } from "../../../content/typing/practice";
import { URDU_PASSAGES, URDU_WORDS } from "../../../content/typing/urdu";

/**
 * What the progress page needs of a language (plan item 8.2), fetched when that language is
 * shown: its typing layouts, for the accuracy heatmap, and its commonest words, for drills on
 * the weakest keys. Static files, so the page itself stays small.
 */
export const getStaticPaths: GetStaticPaths = () => {
  const urdu = LANGUAGES.find((l) => l.slug === "urdu")!;
  return [urdu, ...TYPING_LANGUAGES].map((language) => ({
    params: { slug: language.slug },
    props: { language },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const l = (props as { language: Language }).language;
  const data = await gameData(
    l,
    l.slug === "urdu" ? { words: URDU_WORDS, passages: URDU_PASSAGES } : undefined,
  );
  return new Response(JSON.stringify({ layouts: data.layouts, words: data.frequent }), {
    headers: { "Content-Type": "application/json" },
  });
};
