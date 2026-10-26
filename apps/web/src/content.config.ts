import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Long-form help articles at /guides/<file name>. Original writing for this site. */
const guides = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/guides" }),
  schema: z.object({
    title: z.string(),
    /** Meta description and the summary on the guides index. */
    description: z.string(),
    /** The page's h1, when it should differ from the <title>. */
    heading: z.string().optional(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    /** Position on the guides index. */
    order: z.number(),
    /** The language page (slug) that lists this guide. */
    language: z.string(),
    /** A layout page (layout id) that links to this guide as well, e.g. "ur-roman". */
    layout: z.string().optional(),
    /** The keyboard page the guide points readers to. */
    cta: z.object({ label: z.string(), href: z.string() }),
  }),
});

export const collections = { guides };
