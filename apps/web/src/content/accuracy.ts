import accents from "../../../../packages/dictionaries/results/accents.json";

/**
 * Published Roman typing accuracy, read from the evaluation results that
 * packages/dictionaries/test/roman-langs.test.ts writes and checks (plan item 6.3).
 */
export interface Accuracy {
  scheme: string;
  source: string;
  pairs: number;
  top1: number;
  top5: number;
  messageWords: number;
  correctionsPer10Words: number;
  beta: boolean;
  /** Fewer test pairs than the 300 the plan asks for. */
  smallSet?: boolean;
}

const RESULTS = import.meta.glob<Accuracy>(
  "../../../../packages/dictionaries/results/*-roman.json",
  {
    import: "default",
    eager: true,
  },
);

const BY_SCHEME = new Map(Object.values(RESULTS).map((r) => [r.scheme, r]));

export function accuracyFor(scheme: string): Accuracy | undefined {
  return BY_SCHEME.get(scheme);
}

export const percent = (x: number) => `${Math.round(x * 1000) / 10}%`;

/**
 * Smart accents on held-out Wikipedia text, read from the results that
 * packages/dictionaries/test/accents-eval.test.ts writes and checks (plan item 7.5).
 */
export interface AccentAccuracy {
  sentences: number;
  accentWords: number;
  auto: number;
  offered: number;
  restored: number;
  plainWords: number;
  wrongChanges: number;
  meetsTarget: boolean;
}

export function accentAccuracyFor(code: string): AccentAccuracy | undefined {
  return (accents as Record<string, AccentAccuracy>)[code];
}
