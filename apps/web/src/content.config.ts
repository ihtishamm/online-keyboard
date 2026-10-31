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

/**
 * Page copy for each language page, /<slug> (plan item 7.1): src/content/languages/<slug>.md,
 * the copy in the front matter. Original text, written for this site. Roman layouts keep
 * their copy with their spelling guide (src/content/roman.ts).
 */
const layoutCopy = z.object({
  /** Short description shown above the layout chart. */
  summary: z.string(),
  /** Who this layout suits. */
  bestFor: z.string(),
  /** Page title, heading and meta description when the defaults do not fit the search. */
  title: z.string().optional(),
  heading: z.string().optional(),
  description: z.string().optional(),
});
const languages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/languages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    headingNative: z.string(),
    intro: z.string(),
    /** By layout id. */
    layouts: z.record(z.string(), layoutCopy).default({}),
    tips: z.array(z.string()).min(1),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).min(1),
  }),
});

export const collections = { guides, languages };
