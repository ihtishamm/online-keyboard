import { useCallback, useEffect, useRef, useState } from "react";
import { recognitionCtor, voiceError, type Recognition } from "./voice";

export interface VoiceTypingOptions {
  /** Speech recognition language, e.g. "ur-PK". */
  lang: string;
  languageName: string;
  /** A finished phrase, as recognised. */
  onPhrase: (transcript: string) => void;
}

/**
 * One voice typing session at a time. Browsers end recognition on their own (after a pause,
 * after each phrase on Android, after about a minute on desktop), so while the user wants to
 * keep talking a new session starts whenever one ends; errors and Stop end it for good.
 */
export function useVoiceTyping({ lang, languageName, onPhrase }: VoiceTypingOptions) {
  const [listening, setListening] = useState(false);
  /** Words heard so far in the current phrase, not final yet. */
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const phrase = useRef(onPhrase);
  phrase.current = onPhrase;

  const begin = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    // Android repeats earlier results in continuous mode; one phrase per session avoids it.
    r.continuous = !/Android/i.test(navigator.userAgent);
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) phrase.current(text);
        else pending += text;
      }
      setInterim(pending);
    };
    r.onerror = (event) => {
      const message = voiceError(event.error, languageName);
      // Silence ends the session; anything else (blocked, offline) would just fail again.
      wanted.current = false;
      if (message) setError(message);
    };
    r.onend = () => {
      if (recognition.current !== r) return;
      setInterim("");
      if (wanted.current) {
        begin();
      } else {
        recognition.current = null;
        setListening(false);
      }
    };
    recognition.current = r;
    try {
      r.start();
    } catch {
      wanted.current = false;
      recognition.current = null;
      setListening(false);
      setError(voiceError("", languageName));
    }
  }, [lang, languageName]);

  const start = useCallback(() => {
    if (wanted.current) return;
    wanted.current = true;
    setError(null);
    setInterim("");
    setListening(true);
    begin();
  }, [begin]);

  const stop = useCallback(() => {
    wanted.current = false;
    // stop() lets the phrase being spoken finish and arrive; onend then tidies up.
    recognition.current?.stop();
  }, []);

  // A different language, or leaving the page: end the session without its last phrase.
  useEffect(
    () => () => {
      wanted.current = false;
      const r = recognition.current;
      recognition.current = null;
      r?.abort();
      setListening(false);
      setInterim("");
    },
    [lang],
  );

  return { listening, interim, error, start, stop, clearError: () => setError(null) };
}
