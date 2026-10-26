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
 * Speech recognition tag per language slug: only languages the major speech services
 * transcribe in the script this site types (Punjabi comes back in Gurmukhi, so Shahmukhi is
 * left out).
 */
const SPEECH_LANG: Readonly<Record<string, string>> = {
  urdu: "ur-PK",
  arabic: "ar-SA",
  farsi: "fa-IR",
  hindi: "hi-IN",
  bangla: "bn-BD",
};

export function speechLang(slug: string): string | null {
  return SPEECH_LANG[slug] ?? null;
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
