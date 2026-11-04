import { z } from "zod";
import { KEY_CODES, type KeyCode } from "./keycodes";

const keyCode = z.enum(KEY_CODES as [KeyCode, ...KeyCode[]]);

/** Output of one key on each modifier layer. Empty or missing means the key types nothing there. */
export const keyDefSchema = z
  .object({
    /** normal */
    n: z.string().optional(),
    /** shift */
    s: z.string().optional(),
    /** AltGr (right Alt, or Ctrl+Alt) */
    ag: z.string().optional(),
    /** Shift + AltGr */
    sag: z.string().optional(),
    /** How Caps Lock affects this key: "shift" swaps n/s (Latin letters), "none" ignores it. */
    caps: z.enum(["none", "shift"]).optional(),
    /**
     * Layers where this key types its character even though it is a dead-key trigger
     * elsewhere: French AltGr+9 types ^, while the key right of P is a dead ^.
     */
    live: z.array(z.enum(["n", "s", "ag", "sag"])).optional(),
  })
  .strict();

export const deadKeySchema = z
  .object({
    /** The character produced by the dead key itself (it is held, not typed). */
    trigger: z.string().min(1),
    /** The next character typed. */
    base: z.string().min(1),
    /** What replaces the pair. */
    out: z.string().min(1),
  })
  .strict();

/**
 * A key whose text depends on what is already typed (Tamil99: a vowel key types அ alone, but
 * its sign after a consonant). Most rules only add text; `remove` also takes back the end of
 * what is there (ITRANS: "a" after क् drops the virama).
 */
export const contextRuleSchema = z
  .object({
    /** The text just before the caret. The longest match wins. */
    before: z.string().min(1),
    /** What the key types by itself. */
    typed: z.string().min(1),
    /** What it adds instead, which can be nothing. */
    add: z.string(),
    /** UTF-16 units of `before` to delete first, counted from its end. */
    remove: z.number().int().positive().optional(),
    /** Rules do not apply to the next key press (Tamil99's delinking vowel, rule 6). */
    hold: z.boolean().optional(),
  })
  .strict();

export const layoutSchema = z
  .object({
    id: z.string().regex(/^[a-z]{2,3}(-[a-z0-9]+)+$/, "id must look like `ur-phonetic`"),
    /** BCP 47 language tag of the text produced, e.g. `ur`, `pa-Arab`. */
    lang: z.string().min(2),
    /** ISO 15924 script code, e.g. `Arab`, `Deva`. */
    script: z.string().length(4),
    dir: z.enum(["ltr", "rtl"]),
    name: z.object({ en: z.string().min(1), native: z.string().min(1) }).strict(),
    /** Where the mapping came from, so data provenance is auditable. */
    source: z.string().min(1),
    keys: z.partialRecord(keyCode, keyDefSchema),
    deadkeys: z.array(deadKeySchema).default([]),
    rules: z.array(contextRuleSchema).default([]),
    /** Mobile long-press alternates. */
    longpress: z.partialRecord(keyCode, z.array(z.string().min(1)).min(1)).default({}),
    /**
     * Hand-tuned phone rows (key codes, top to bottom, at most 11 a row). Without it the phone
     * layout is generated from the desktop one (see phone.ts).
     */
    mobile: z
      .object({
        rows: z.array(z.array(keyCode).min(1).max(11)).min(2).max(4),
        /** Extra phone long-press alternates, for letters of keys left off the rows. */
        longpress: z.partialRecord(keyCode, z.array(z.string().min(1)).min(1)).optional(),
      })
      .strict()
      .optional(),
    /**
     * An input method that rewrites the text as keys are typed: Hangul composition, Vietnamese
     * Telex or VNI, romaji to kana. Keys hold what they type by themselves.
     */
    composer: z.enum(["hangul", "telex", "vni", "romaji"]).optional(),
    /** Optional id of a transliteration scheme that pairs with this layout. */
    translit: z.string().optional(),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const triggers = new Set<string>();
    for (const def of Object.values(layout.keys)) {
      for (const v of [def?.n, def?.s, def?.ag, def?.sag]) if (v) triggers.add(v);
    }
    layout.rules.forEach((rule, i) => {
      if (rule.remove !== undefined && rule.remove > rule.before.length) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", i, "remove"],
          message: `context rule removes more than its "before" text`,
        });
      }
      if (!triggers.has(rule.typed)) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", i, "typed"],
          message: `context rule key "${rule.typed}" is not produced by any key`,
        });
      }
    });
    layout.deadkeys.forEach((dk, i) => {
      if (!triggers.has(dk.trigger)) {
        ctx.addIssue({
          code: "custom",
          path: ["deadkeys", i, "trigger"],
          message: `dead key trigger "${dk.trigger}" is not produced by any key`,
        });
      }
    });
  });

export type KeyDef = z.infer<typeof keyDefSchema>;
export type DeadKey = z.infer<typeof deadKeySchema>;
export type ContextRule = z.infer<typeof contextRuleSchema>;
/** Layout as written in JSON (defaults not yet applied). */
export type LayoutInput = z.input<typeof layoutSchema>;
/** Validated layout with defaults applied. */
export type Layout = z.output<typeof layoutSchema>;

export class LayoutValidationError extends Error {
  constructor(
    readonly layoutId: string,
    readonly issues: readonly string[],
  ) {
    super(`Invalid layout "${layoutId}":\n  ${issues.join("\n  ")}`);
    this.name = "LayoutValidationError";
  }
}

export function parseLayout(input: unknown): Layout {
  const result = layoutSchema.safeParse(input);
  if (result.success) return result.data;
  const id =
    typeof input === "object" && input !== null && "id" in input ? String(input.id) : "<unknown>";
  throw new LayoutValidationError(
    id,
    result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  );
}
