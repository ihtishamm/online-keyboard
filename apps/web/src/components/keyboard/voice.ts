import { normalizeUrdu } from "@okb/engine";

/**
 * Voice typing through the browser's Web Speech API. Chrome and Edge send the audio to their
 * vendor's speech service; Safari uses Apple's. Firefox has no recognition, so the feature is
 * hidden there.
 */

/** The parts of SpeechRecognition used here (not in TypeScript's DOM types everywhere). */
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecognitionCtor = new () => Recognition;

export function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, RecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * The regional variants offered for a language's voice typing (its `voice` locales in
 * language.json), named by region, or an empty list when there is no choice. Arabic
 * dialects differ enough that recognition is much better in the speaker's own.
 */
export function speechDialects(
  locales: readonly string[],
): readonly [tag: string, region: string][] {
  if (locales.length < 2) return [];
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return locales.map((tag) => {
    const region = new Intl.Locale(tag).region;
    return [tag, (region && names.of(region)) ?? tag] as const;
  });
}

/** Spoken punctuation: phrases said on their own, replaced by the mark. */
const COMMANDS: Readonly<Record<string, readonly [phrase: string, mark: string][]>> = {
  urdu: [
    ["فل سٹاپ", "۔"],
    ["فل اسٹاپ", "۔"],
    ["سوالیہ نشان", "؟"],
    ["کوما", "،"],
    ["کاما", "،"],
    ["نئی لائن", "\n"],
    ["نئی سطر", "\n"],
  ],
  hindi: [
    ["पूर्ण विराम", "।"],
    ["प्रश्नवाचक चिह्न", "?"],
    ["अल्पविराम", ","],
    ["नई पंक्ति", "\n"],
    ["नई लाइन", "\n"],
  ],
};

/** Clean up a recognised phrase: letter forms, spoken punctuation, spacing around marks. */
export function dictationText(slug: string, transcript: string): string {
  let text = slug === "urdu" ? normalizeUrdu(transcript) : transcript.normalize("NFC");
  for (const [phrase, mark] of COMMANDS[slug] ?? []) {
    text = text.replace(new RegExp(`(^|\\s)${phrase}(?=\\s|$)`, "gu"), (_, space: string) =>
      mark === "\n" ? "\n" : space + mark,
    );
  }
  return text
    .replace(/[ \t]+([۔؟،।?,!.])/gu, "$1") // no space before a mark
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** `text` with a space in front if it would otherwise run into the word before the caret. */
export function spaced(before: string, text: string): string {
  if (!text || !before || /\s$/.test(before) || /^[\s۔؟،।?,!.]/u.test(text)) return text;
  return " " + text;
}

/** What to tell the user when recognition fails. Null: nothing went wrong worth saying. */
export function voiceError(code: string, languageName: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow it in your browser's site settings, then try again.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Voice typing needs an internet connection.";
    case "language-not-supported":
      return `Your browser can't recognise ${languageName} speech.`;
    case "no-speech":
      return "Didn't hear anything. Press the microphone and speak.";
    case "aborted":
      return null;
    default:
      return "Voice typing stopped unexpectedly.";
  }
}
