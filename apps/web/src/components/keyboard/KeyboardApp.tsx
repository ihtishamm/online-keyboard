import {
  layoutRows,
  KEY_CODES,
  ModifierLatch,
  TypingMachine,
  US_QWERTY,
  isKeyCode,
  phoneLayout,
  type KeyCode,
  type Modifiers,
  type TonePlacement,
} from "@okb/engine";
import type { FontId } from "@okb/layouts";
import { bundleLayout, layoutSlug, type LanguageBundle } from "@okb/layouts/bundle";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FONT_CLASS } from "../fonts";
import { countText } from "./actions";
import CandidateBar from "./CandidateBar";
import {
  autocorrectByDefault,
  hasAutocorrect,
  hasDictionary,
  hasSpelling,
  spellingByDefault,
} from "./dictionary";
import {
  deleteBackward,
  deleteRange,
  insertText,
  moveCaret,
  replaceText,
  wordsBefore,
} from "./editor-ops";
import {
  DEFAULT_KEYBOARD_SETTINGS,
  loadKeyboardSettings,
  saveKeyboardSettings,
  type KeyboardSettings,
} from "./keyboard-settings";
import { hasCoarsePointer, isAltGr } from "./platform";
import SpellOverlay from "./SpellOverlay";
import { loadPreference, savePreference } from "./preferences";
import AccentBar from "./AccentBar";
import { frenchSpacing, spanishOpening, type Edit } from "./latin-typing";
import { convertChineseScript } from "./chinese-script";
import Toolbar, { FONT_SIZES } from "./Toolbar";
import { useDrafts } from "./useDrafts";
import { useKeyboardInset } from "./useKeyboardInset";
import { noteCopy, useInstallOffer } from "./install";
import { track } from "../../analytics/track";
import { useSuggestions } from "./useSuggestions";
import { useVoiceTyping } from "./useVoiceTyping";
import { dictationText, recognitionCtor, spaced, speechDialects } from "./voice";
import VoicePanel from "./VoicePanel";
import VirtualKeyboard, { type KeyAction } from "./VirtualKeyboard";

const EmojiPanel = lazy(() => import("./EmojiPanel"));

/** In Roman mode, characters that end a word (anything but letters, apostrophes and digits). */
const isBoundary = (text: string) => !/^[A-Za-z'0-9]*$/.test(text);

export interface KeyboardAppProps {
  /** The page's language with its layouts (only this language ships to the browser). */
  bundle: LanguageBundle;
  /** Layout the page is about. */
  layoutId: string;
  /** True on a layout-specific URL (/urdu/standard); false on the language's main page. */
  explicitLayout: boolean;
}

export default function KeyboardApp({
  bundle,
  layoutId: pageLayoutId,
  explicitLayout,
}: KeyboardAppProps) {
  const { language } = bundle;
  const slug = language.slug;
  const getLayout = (id: string) => bundleLayout(bundle, id);
  const [layoutId, setLayoutId] = useState(pageLayoutId);
  const layout = getLayout(layoutId);

  const machineRef = useRef<TypingMachine | null>(null);
  machineRef.current ??= new TypingMachine(layout);
  const machine = machineRef.current;
  const latch = useRef(new ModifierLatch()).current;

  const letterKeys = useMemo(
    () =>
      new Set(
        KEY_CODES.filter((code) =>
          [layout.keys[code]?.n, layout.keys[code]?.s].some((v) => v && /[\p{L}\p{M}]/u.test(v)),
        ),
      ),
    [layout],
  );

  const phone = useMemo(() => phoneLayout(layout), [layout]);
  const rows = useMemo(() => layoutRows(layout.keys), [layout]);
  const [keyboardSettings, setKeyboardSettings] =
    useState<KeyboardSettings>(DEFAULT_KEYBOARD_SETTINGS);
  /** Where the caret was when a Backspace slide began: the words before it get selected. */
  const slideAnchor = useRef<number | null>(null);

  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [passthrough, setPassthrough] = useState(false);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [physicalCaps, setPhysicalCaps] = useState(false);
  /** False until hydrated: the server-rendered editor stays read-only so early keys don't type Latin. */
  const [hydrated, setHydrated] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [phoneKeyboard, setPhoneKeyboard] = useState(false);
  /** Roman text pasted or shared in: offer to convert it all at once. */
  const [romanToConvert, setRomanToConvert] = useState(false);
  const [copies, setCopies] = useState(0);
  /** First visit on a touch screen: ask how the visitor wants to type. */
  const [askInput, setAskInput] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  /** Set once hydrated, where the browser can recognise this language's speech. */
  const [voiceLang, setVoiceLang] = useState<string | null>(null);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [font, setFont] = useState<FontId>(language.fonts[0]!);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.default);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [announcement, setAnnouncementText] = useState("");
  const announceTimer = useRef<number | undefined>(undefined);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const drafts = useDrafts(slug, editorRef);
  const [predict, setPredict] = useState(true);
  const [spellcheck, setSpellcheck] = useState(() => spellingByDefault(language.code));
  const [autocorrect, setAutocorrect] = useState(() => autocorrectByDefault(language.code));
  /** Vietnamese Telex and VNI: hoà (the default) or hòa. */
  const [tonePlacement, setTonePlacement] = useState<TonePlacement>("new");
  machine.tonePlacement = tonePlacement;
  const isLatin = language.script === "Latn";
  /** Latin: Space adds accents the word list is sure of (cancion → canción). */
  const [smartAccents, setSmartAccents] = useState(isLatin && hasDictionary(language.code));
  /** French spacing before ; : ! ? or Spanish ¿ ¡: the language's typing rule, if any. */
  const typingRule: ((text: string, caret: number) => Edit | null) | null =
    language.code === "fr" ? frenchSpacing : language.code === "es" ? spanishOpening : null;
  const [typography, setTypography] = useState(typingRule !== null);
  const scheme = layout.translit ? (bundle.schemes[layout.translit] ?? null) : null;
  const roman = scheme !== null && !passthrough;
  const suggest = useSuggestions({
    slug,
    code: language.code,
    editorRef,
    scheme: roman ? scheme : null,
    predict: predict && !passthrough,
    spellcheck: spellcheck && hasSpelling(language.code),
    autocorrect: autocorrect && hasAutocorrect(language.code),
    layouts: bundle.layouts,
    smartAccents: smartAccents && !passthrough,
  });

  /** Tell screen readers (and show briefly) what just happened. */
  const setAnnouncement = useCallback((message: string) => {
    window.clearTimeout(announceTimer.current);
    setAnnouncementText("");
    // A fresh node text makes repeated messages ("Copied") announce again.
    requestAnimationFrame(() => setAnnouncementText(message));
    announceTimer.current = window.setTimeout(() => setAnnouncementText(""), 4000);
  }, []);

  const { refresh: refreshSuggestions } = suggest;
  /** After the text changed without an input event (a draft was opened). */
  const refreshCounts = useCallback(() => {
    setCounts(countText(editorRef.current?.value ?? ""));
    refreshSuggestions();
  }, [refreshSuggestions]);
  // The first draft is put into the editor once drafts have loaded.
  const draftId = drafts.state?.currentId;
  useEffect(() => {
    if (draftId) refreshCounts();
  }, [draftId]); // only when the draft changes

  const switchLayout = useCallback(
    (id: string, opts: { updateUrl: boolean }) => {
      machine.setLayout(getLayout(id));
      latch.reset();
      setLayoutId(id);
      savePreference(`layout:${slug}`, id);
      track("layout", { layout: id });
      if (opts.updateUrl) {
        const path = id === language.layouts[0] ? `/${slug}` : `/${slug}/${layoutSlug(id)}`;
        history.replaceState(null, "", path);
      }
    },
    [machine, latch, slug, language.layouts],
  );

  useEffect(() => {
    setHydrated(true);
    setCoarse(hasCoarsePointer());
    savePreference("lastLanguage", slug);
    const savedInput = loadPreference("phoneKeyboard");
    setPhoneKeyboard(savedInput === "on");
    setAskInput(hasCoarsePointer() && savedInput === null);
    track("keyboard", {
      layout: layoutId,
      input: !hasCoarsePointer() ? "physical" : savedInput === "on" ? "phone" : "onscreen",
    });
    setKeyboardSettings(loadKeyboardSettings());
    if (loadPreference("predict") === "off") setPredict(false);
    // Per language: what suits one word list may not suit another.
    const savedSpelling = loadPreference(`spellcheck:${slug}`) ?? loadPreference("spellcheck");
    if (savedSpelling === "off" || savedSpelling === "on") setSpellcheck(savedSpelling === "on");
    const savedAutocorrect = loadPreference(`autocorrect:${slug}`);
    if (savedAutocorrect) setAutocorrect(savedAutocorrect === "on");
    const savedAccents = loadPreference(`accents:${slug}`);
    if (savedAccents && isLatin)
      setSmartAccents(savedAccents === "on" && hasDictionary(language.code));
    const savedTypography = loadPreference(`typography:${slug}`);
    if (savedTypography && typingRule) setTypography(savedTypography === "on");
    if (recognitionCtor()) {
      const saved = loadPreference(`voiceLang:${slug}`);
      // Only locales that return this script are listed (language.json `voice`).
      const locales = language.voice;
      setVoiceLang(saved && locales.includes(saved) ? saved : (locales[0] ?? null));
    }
    const savedFont = loadPreference(`font:${slug}`) as FontId | null;
    if (savedFont && language.fonts.includes(savedFont)) setFont(savedFont);
    if (loadPreference("tonePlacement") === "old") setTonePlacement("old");
    const savedSize = Number(loadPreference("fontSize"));
    if (savedSize >= FONT_SIZES.min && savedSize <= FONT_SIZES.max) setFontSize(savedSize);
    if (!explicitLayout) {
      const saved = loadPreference(`layout:${slug}`);
      if (saved && saved !== pageLayoutId && language.layouts.includes(saved)) {
        switchLayout(saved, { updateUrl: false });
      }
    }
    editorRef.current?.focus({ preventScroll: true });
  }, []); // mount only: page-level choices must not re-apply on later renders

  // Roman mode needs the word list for ranking: fetch it as soon as the mode is on. Other
  // modes wait for the first key press, so a page view alone downloads nothing extra.
  const { load: loadWords } = suggest;
  useEffect(() => {
    if (!roman) return;
    const idle = "requestIdleCallback" in window;
    const id = idle
      ? requestIdleCallback(loadWords, { timeout: 2000 })
      : window.setTimeout(loadWords, 500);
    return () => (idle ? cancelIdleCallback(id) : window.clearTimeout(id));
  }, [roman, loadWords]);

  const insert = (text: string) => {
    const el = editorRef.current;
    if (el && text) insertText(el, text);
  };

  /**
   * Type one character with the language's typing rule (French spacing, Spanish ¿ ¡) applied
   * in the same edit, so one Undo takes both back. Returns false when the rule has nothing to do.
   */
  const insertWithRule = (text: string): boolean => {
    const el = editorRef.current;
    if (!el || !typingRule || !typography || passthrough || [...text].length !== 1) return false;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const typed = value.slice(0, start) + text + value.slice(end);
    const caret = start + text.length;
    const edit = typingRule(typed, caret);
    if (!edit) return false;
    const from = Math.min(edit.start, start);
    const after = typed.slice(0, edit.start) + edit.text + typed.slice(edit.end);
    const newCaret = caret + edit.text.length - (edit.end - edit.start);
    replaceText(el, from, end, after.slice(from, newCaret));
    return true;
  };

  useKeyboardInset(coarse && phoneKeyboard);
  const installOffer = useInstallOffer(coarse, copies);

  // Text shared to the installed app (/share) opens in a new draft, once drafts have loaded.
  const draftsReady = drafts.state !== null;
  useEffect(() => {
    if (!draftsReady) return;
    let shared: string | null;
    try {
      shared = sessionStorage.getItem("likho:shared");
      sessionStorage.removeItem("likho:shared");
    } catch {
      return;
    }
    if (!shared) return;
    const text = shared;
    void drafts.create().then(() => {
      const el = editorRef.current;
      if (!el) return;
      el.value = text;
      el.setSelectionRange(text.length, text.length);
      drafts.onInput();
      refreshCounts();
      if (/[A-Za-z]/.test(text)) setRomanToConvert(true);
      setAnnouncement("Shared text opened in a new draft");
    });
  }, [draftsReady]); // once, when drafts are ready

  /** Convert every Roman word in the editor (one undo step). */
  const convertAllRoman = () => {
    const el = editorRef.current;
    if (!el || !suggest.convertText) return;
    replaceText(el, 0, el.value.length, suggest.convertText(el.value));
    track("convertAll", { layout: layoutId });
    setRomanToConvert(false);
    refreshCounts();
    setAnnouncement(`Converted to ${language.name.en}`);
  };

  const voice = useVoiceTyping({
    lang: voiceLang ?? "",
    languageName: language.name.en,
    onPhrase: (transcript) => {
      const el = editorRef.current;
      const text = dictationText(slug, transcript);
      if (el && text) insert(spaced(el.value.slice(0, el.selectionStart), text));
    },
  });

  const toggleVoice = () => {
    if (voice.listening) {
      voice.stop();
      setAnnouncement("Voice typing stopped");
    } else if (loadPreference("voice") === "on") {
      voice.start();
      track("voice", { layout: layoutId });
      setAnnouncement("Listening");
    } else setVoiceConsent(true);
  };

  /**
   * Type `text` produced by a key. In Roman mode a word boundary (space, punctuation) first
   * converts the Roman word before the caret; punctuation becomes its Urdu form.
   */
  /**
   * A context rule that rewrites the end of the text (ITRANS). Delete, then insert: Chromium's
   * insertText keeps part of a selection that starts inside a conjunct (स्क् + ृ).
   */
  /** Korean: Backspace takes one jamo off the syllable being composed. */
  const backspaceComposed = (): boolean => {
    const el = editorRef.current;
    if (!el || el.selectionStart !== el.selectionEnd) return false;
    const r = machine.backspace(textBeforeCaret());
    if (!r) return false;
    rewriteBeforeCaret(r.remove, r.text);
    return true;
  };

  const rewriteBeforeCaret = (remove: number, text: string) => {
    const el = editorRef.current;
    if (!el) return;
    replaceText(el, Math.max(0, el.selectionStart - remove), el.selectionEnd, "");
    insert(text);
  };

  /** What context rules read (Tamil99). The longest rule is far shorter than this. */
  const textBeforeCaret = () => {
    const el = editorRef.current;
    return el ? el.value.slice(Math.max(0, el.selectionStart - 32), el.selectionStart) : "";
  };

  const typeText = (text: string) => {
    if (!roman && text === " " && suggest.correctBefore(" ")) return;
    if (insertWithRule(text)) return;
    // Zhuyin's symbols are the word's own letters here, not punctuation.
    if (!roman || !isBoundary(text) || scheme?.letters?.includes(text)) return insert(text);
    const el = editorRef.current;
    const prev = el ? el.value[el.selectionStart - 1] : undefined;
    // Leave decimal points and times alone: 3.5, 10:30
    const out = prev && /\d/.test(prev) ? text : (suggest.punctuation[text] ?? text);
    if (!suggest.commit(out)) insert(out);
  };

  /** Stop flagging the misspelled word at the caret. */
  const acceptWord = (save: boolean) => {
    const word = suggest.state.mode === "spell" ? suggest.state.range?.word : undefined;
    if (!word) return;
    suggest.accept(word, save);
    setAnnouncement(save ? "Added to your dictionary" : "Ignored");
  };

  /** Select the next misspelled word after the caret (wrapping round), to fix it. */
  const nextMisspelling = () => {
    const el = editorRef.current;
    const issues = suggest.marks.issues;
    if (!el || !issues.length) return;
    const next = issues.find((i) => i.start >= el.selectionEnd) ?? issues[0]!;
    el.focus();
    // A collapsed caret at the word's end shows its corrections in the bar.
    el.setSelectionRange(next.end, next.end);
    suggest.refresh();
  };

  /** Backspace right after an autocorrection puts the typed word back. */
  const undoCorrection = (): boolean => {
    const word = suggest.undoCorrection();
    if (word) setAnnouncement(`Kept ${word}`);
    return word !== null;
  };

  /** Roman mode: leave the word as typed and move on. */
  const keepRoman = () => {
    suggest.keep();
    insert(" ");
    setAnnouncement("Kept in English. It stays in English on this device.");
  };

  const togglePassthrough = () => {
    const next = !passthrough;
    setPassthrough(next);
    setAnnouncement(next ? "English typing" : `${language.name.en} typing`);
    machine.cancelPending();
    latch.reset();
  };

  // ----- physical keyboard -----
  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const ne = e.nativeEvent;
    if (ne.isComposing || ne.keyCode === 229) return;
    setPressed((s) => (s.has(e.code) ? s : new Set(s).add(e.code)));
    if (ne.getModifierState) setPhysicalCaps(ne.getModifierState("CapsLock"));
    suggest.load();

    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (roman && plain && suggest.composing()) {
      if (e.key === "Escape") {
        e.preventDefault();
        keepRoman();
        return;
      }
      // Number keys pick a spelling, unless digits are letters here (Arabic chat: 3 = ع).
      const digitIsLetter = scheme?.letters?.includes(e.key) ?? false;
      if (/^[1-9]$/.test(e.key) && !digitIsLetter && suggest.pick(Number(e.key) - 1)) {
        e.preventDefault();
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        suggest.commit(e.key === " " ? " " : "\n");
        return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      togglePassthrough();
      return;
    }
    if (passthrough) return;

    if (e.key === "Backspace" && plain && undoCorrection()) {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace" && plain && backspaceComposed()) {
      e.preventDefault();
      rerender();
      return;
    }

    if (machine.pending !== null && (e.key === "Backspace" || e.key === " ")) {
      e.preventDefault();
      const trigger = machine.pending;
      machine.cancelPending();
      if (e.key === " ") insert(trigger);
      rerender();
      return;
    }

    if (e.key === " " && plain && !roman && suggest.correctBefore(" ")) {
      e.preventDefault();
      return;
    }

    const altgr = isAltGr(ne);
    if (!altgr && (e.ctrlKey || e.metaKey || e.altKey)) return; // browser/OS shortcuts
    if (!isKeyCode(e.code)) return; // Backspace, Enter, arrows... stay native

    e.preventDefault();
    const result = machine.press(
      e.code,
      {
        shift: e.shiftKey,
        altgr,
        caps: ne.getModifierState?.("CapsLock") ?? false,
      },
      textBeforeCaret(),
    );
    if (result.kind === "text") {
      if (result.remove) rewriteBeforeCaret(result.remove, result.text);
      else typeText(result.text);
    }
    rerender();
  };

  const onKeyUp = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    setPressed((s) => {
      if (!s.has(e.code)) return s;
      const next = new Set(s);
      next.delete(e.code);
      return next;
    });
  };

  // ----- on-screen keyboard -----
  const onChar = (code: KeyCode) => {
    suggest.load();
    if (passthrough) {
      const { shift, caps } = latch.current();
      const [lower, upper] = US_QWERTY[code];
      const isLetter = code.startsWith("Key");
      insert(shift !== (caps && isLetter) ? upper : lower);
    } else {
      const result = machine.press(code, latch.current(), textBeforeCaret());
      if (result.kind === "text") {
        if (result.remove) rewriteBeforeCaret(result.remove, result.text);
        else typeText(result.text);
      }
    }
    latch.consume();
    rerender();
  };

  const onAlternate = (text: string) => {
    if (!insertWithRule(text)) insert(text);
    latch.consume();
    rerender();
  };

  const onAction = (action: KeyAction) => {
    const el = editorRef.current;
    switch (action) {
      case "backspace":
        if (!machine.cancelPending() && !undoCorrection() && !backspaceComposed() && el) {
          deleteBackward(el);
        }
        break;
      case "enter":
        if (!(roman && suggest.commit("\n"))) insert("\n");
        break;
      case "space": {
        const trigger = machine.pending;
        machine.cancelPending();
        if (trigger) insert(trigger);
        else if (roman ? !suggest.commit(" ") : !suggest.correctBefore(" ")) insert(" ");
        break;
      }
      case "shift":
        latch.tapShift();
        setAnnouncement(
          `Shift ${latch.shift === "off" ? "off" : latch.shift === "once" ? "on" : "locked"}`,
        );
        break;
      case "altgr":
        latch.tapAltGr();
        setAnnouncement(
          `AltGr ${latch.altgr === "off" ? "off" : latch.altgr === "once" ? "on" : "locked"}`,
        );
        break;
      case "caps":
        latch.tapCaps();
        setAnnouncement(`Caps Lock ${latch.caps ? "on" : "off"}`);
        break;
      case "toggle":
        togglePassthrough();
        break;
    }
    rerender();
  };

  /** Space-bar slide: move the caret through the text. */
  const onCaret = (steps: number) => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    moveCaret(el, steps, layout.dir);
    suggest.refresh();
  };

  /** Backspace slide (select words, delete on release) and long hold (delete word by word). */
  const onDeleteWords = (words: number, done: boolean) => {
    const el = editorRef.current;
    if (!el) return;
    if (done && slideAnchor.current === null) {
      // Held Backspace: one more whole word.
      deleteRange(el, wordsBefore(el.value, el.selectionStart, words), el.selectionEnd);
      return;
    }
    slideAnchor.current ??= el.selectionStart;
    const end = slideAnchor.current;
    if (done) {
      slideAnchor.current = null;
      if (words > 0) deleteRange(el, wordsBefore(el.value, end, words), end);
      else el.setSelectionRange(end, end);
      return;
    }
    el.setSelectionRange(wordsBefore(el.value, end, words), end);
  };

  const changeKeyboardSettings = (next: KeyboardSettings) => {
    setKeyboardSettings(next);
    saveKeyboardSettings(next);
  };

  /** Type with the phone's own keyboard (true) or the keys on the page (false). */
  const chooseInput = (own: boolean) => {
    setPhoneKeyboard(own);
    setAskInput(false);
    savePreference("phoneKeyboard", own ? "on" : "off");
    track("input", { input: own ? "phone" : "onscreen" });
    setAnnouncement(own ? "Using your phone's keyboard" : "Using the on-screen keyboard");
    const el = editorRef.current;
    if (!el) return;
    // The OS keyboard opens only on a fresh focus once inputmode changes.
    el.blur();
    if (own) requestAnimationFrame(() => el.focus());
  };

  // Labels follow both tapped (latched) and physically held modifiers.
  const latched = latch.current();
  const displayMods: Modifiers = {
    shift: latched.shift || pressed.has("ShiftLeft") || pressed.has("ShiftRight"),
    altgr:
      latched.altgr ||
      pressed.has("AltRight") ||
      (pressed.has("ControlLeft") && pressed.has("AltLeft")),
    caps: latched.caps || physicalCaps,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label="Keyboard layout"
          className="inline-flex max-w-full rounded-lg border border-border bg-surface p-0.5"
        >
          {language.layouts.map((id) => {
            const l = getLayout(id);
            const checked = id === layoutId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => {
                  if (!checked) switchLayout(id, { updateUrl: true });
                  editorRef.current?.focus();
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium max-sm:px-2.5 ${
                  checked ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
                }`}
              >
                {l.name.en}
                {/* Small phones: the English names alone, so three layouts fit one row. */}
                <span className="font-script ms-1.5 max-[399px]:hidden" lang={l.lang}>
                  {l.name.native}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted max-sm:hidden">
          {passthrough
            ? "English typing"
            : roman
              ? "Roman typing: Space converts each word"
              : `${language.name.en} typing`}{" "}
          · press{" "}
          <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs">Esc</kbd>{" "}
          {roman ? "to keep a word in English" : "to switch"}
        </p>
      </div>

      <Toolbar
        editorRef={editorRef}
        fileBase={slug}
        translate={language.translate}
        lang={language.lang}
        dir={language.dir}
        announce={setAnnouncement}
        fonts={language.fonts}
        font={font}
        onFont={(f) => {
          setFont(f);
          savePreference(`font:${slug}`, f);
        }}
        fontSize={fontSize}
        onFontSize={(size) => {
          setFontSize(size);
          savePreference("fontSize", String(size));
        }}
        drafts={{
          state: drafts.state,
          select: (id) => void drafts.select(id).then(refreshCounts),
          create: () => void drafts.create().then(refreshCounts),
          remove: () => void drafts.remove().then(refreshCounts),
        }}
        emoji={{
          open: emojiOpen,
          onToggle: () => {
            setEmojiOpen(!emojiOpen);
            setAnnouncement(emojiOpen ? "Emoji closed" : "Emoji open");
          },
        }}
        voice={voiceLang ? { listening: voice.listening, onToggle: toggleVoice } : undefined}
        phoneKeyboard={
          coarse
            ? {
                enabled: phoneKeyboard,
                onToggle: () => chooseInput(!phoneKeyboard),
              }
            : undefined
        }
        onCopied={() => {
          noteCopy();
          track("copy", { layout: layoutId });
          setCopies((n) => n + 1);
        }}
        keyboardSettings={
          phoneKeyboard ? undefined : { value: keyboardSettings, onChange: changeKeyboardSettings }
        }
      />

      <div className="relative">
        <textarea
          ref={editorRef}
          dir={layout.dir}
          lang={language.lang}
          aria-label={`${language.name.en} text`}
          // For tests and tools: the word list has downloaded and been indexed.
          data-words={suggest.ready ? "ready" : undefined}
          placeholder={language.sample}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          readOnly={!hydrated}
          inputMode={coarse && !phoneKeyboard ? "none" : undefined}
          onKeyDown={phoneKeyboard ? undefined : onKeyDown}
          onKeyUp={onKeyUp}
          onInput={(e) => {
            const input = e.nativeEvent as InputEvent;
            if (roman) suggest.afterNativeInput(input);
            if (isLatin && !passthrough) {
              // The phone's own keyboard typed it: accents on Space, then the typing rule.
              suggest.afterNativeSpace(input);
              const el = editorRef.current;
              const edit =
                el && typography && input.inputType === "insertText" && input.data?.length === 1
                  ? typingRule?.(el.value, el.selectionStart)
                  : null;
              if (el && edit) {
                const caret = el.selectionStart;
                replaceText(el, edit.start, edit.end, edit.text);
                const moved = caret + edit.text.length - (edit.end - edit.start);
                el.setSelectionRange(moved, moved);
              }
            }
            if (
              roman &&
              input.inputType === "insertFromPaste" &&
              /[A-Za-z]/.test(input.data ?? editorRef.current?.value ?? "")
            )
              setRomanToConvert(true);
            drafts.onInput();
            refreshCounts();
          }}
          onSelect={suggest.refresh}
          onBlur={() => setPressed(new Set())}
          style={{ fontSize: `${fontSize}px` }}
          className={`${FONT_CLASS[font]} block min-h-32 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-text shadow-sm placeholder:text-muted/60 focus:border-accent focus:outline-none sm:min-h-56`}
        />
        {suggest.spellReady && (
          <SpellOverlay
            editorRef={editorRef}
            marks={suggest.marks}
            fontClass={FONT_CLASS[font]}
            fontSize={fontSize}
            dir={layout.dir}
            lang={language.lang}
          />
        )}
      </div>

      {(language.code === "zh" || language.code === "zht") && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span id="chinese-script" className="text-muted">
            Convert my text to
          </span>
          <div role="group" aria-labelledby="chinese-script" className="flex gap-1">
            {(
              [
                ["s2t", "繁體", "Traditional"],
                ["t2s", "简体", "Simplified"],
              ] as const
            ).map(([direction, label, name]) => (
              <button
                key={direction}
                type="button"
                lang={direction === "s2t" ? "zh-Hant" : "zh-Hans"}
                aria-label={`Convert my text to ${name} Chinese`}
                className="min-h-11 rounded-lg border border-border bg-surface px-3 text-muted hover:text-text"
                onClick={() => {
                  const el = editorRef.current;
                  if (!el?.value) return;
                  void convertChineseScript(direction, el.value).then((text) => {
                    if (text === null) setAnnouncement("Could not load the conversion table");
                    else {
                      replaceText(el, 0, el.value.length, text);
                      setAnnouncement(`Converted to ${name} Chinese`);
                    }
                  });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(layout.composer === "telex" || layout.composer === "vni") && !passthrough && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span id="tone-placement" className="text-muted">
            Tone marks
          </span>
          <div role="group" aria-labelledby="tone-placement" className="flex gap-1">
            {(
              [
                ["new", "hoà (new)"],
                ["old", "hòa (old)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tonePlacement === value}
                onClick={() => {
                  setTonePlacement(value);
                  savePreference("tonePlacement", value);
                }}
                className={`min-h-11 rounded-lg border px-3 ${
                  tonePlacement === value
                    ? "border-accent bg-accent-soft text-text"
                    : "border-border bg-surface text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {romanToConvert && roman && suggest.convertText && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-sm">
          <span className="grow">Turn the English-letter text into {language.name.en}?</span>
          <button
            type="button"
            onClick={convertAllRoman}
            className="min-h-10 rounded-lg bg-accent px-3 font-medium text-accent-fg"
          >
            Convert all
          </button>
          <button
            type="button"
            onClick={() => setRomanToConvert(false)}
            className="min-h-10 rounded-lg px-3 text-muted hover:text-text"
          >
            Not now
          </button>
        </div>
      )}

      {installOffer && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
          <span className="grow">
            {installOffer.kind === "prompt"
              ? "Add Likho to your home screen: it opens like an app and works offline."
              : "Add Likho to your home screen: tap Share, then “Add to Home Screen”."}
          </span>
          {installOffer.kind === "prompt" && (
            <button
              type="button"
              onClick={installOffer.install}
              className="min-h-10 rounded-lg bg-accent px-3 font-medium text-accent-fg"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={installOffer.dismiss}
            className="min-h-10 rounded-lg px-3 text-muted hover:text-text"
          >
            Not now
          </button>
        </div>
      )}

      {voiceLang && (voiceConsent || voice.listening || voice.error) && (
        <VoicePanel
          view={voice.listening ? "listening" : voiceConsent ? "consent" : "error"}
          languageName={language.name.en}
          lang={language.lang}
          dir={language.dir}
          interim={voice.interim}
          error={voice.error}
          onConsent={() => {
            savePreference("voice", "on");
            setVoiceConsent(false);
            editorRef.current?.focus({ preventScroll: true });
            voice.start();
            setAnnouncement("Listening");
          }}
          onCancel={() => {
            setVoiceConsent(false);
            voice.clearError();
            editorRef.current?.focus({ preventScroll: true });
          }}
          onStop={toggleVoice}
          dialects={
            speechDialects(language.voice).length
              ? {
                  options: speechDialects(language.voice),
                  value: voiceLang,
                  onChange: (tag) => {
                    savePreference(`voiceLang:${slug}`, tag);
                    setVoiceLang(tag);
                    // The session listens in the dialect it started with.
                    if (voice.listening) {
                      voice.stop();
                      setAnnouncement("Dialect changed. Start voice typing again to use it.");
                    }
                  },
                }
              : undefined
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
        <span>
          {counts.words} {counts.words === 1 ? "word" : "words"} · {counts.chars}{" "}
          {counts.chars === 1 ? "character" : "characters"}
        </span>
        {suggest.marks.issues.length > 0 && (
          <button
            type="button"
            onClick={nextMisspelling}
            className="rounded px-1 text-bad underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {suggest.marks.issues.length}{" "}
            {suggest.marks.issues.length === 1 ? "possible misspelling" : "possible misspellings"}
          </button>
        )}
        <span aria-live="polite" className="font-medium text-accent max-sm:sr-only">
          {announcement}
        </span>
        <span>
          {drafts.status === "saving"
            ? "Saving…"
            : drafts.status === "saved"
              ? "Saved on this device"
              : "Autosaves on this device"}
        </span>
      </div>

      {/*
        Phones: suggestions, emoji and the keyboard dock at the bottom of the screen, like a
        messaging app, so the keys stay in reach while the page scrolls.
      */}
      <div
        data-dock
        className="flex flex-col gap-3 phone:sticky phone:bottom-[var(--kb-inset,0px)] phone:z-20 phone:gap-1.5 phone:bg-bg phone:pt-1 phone:pb-[max(0.25rem,env(safe-area-inset-bottom))] max-sm:-mx-4 max-sm:px-1"
      >
        {announcement && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-text px-3 py-1.5 text-sm whitespace-nowrap text-bg shadow-lg sm:hidden"
          >
            {announcement}
          </p>
        )}
        {askInput && (
          <section
            aria-labelledby="input-choice"
            className="rounded-xl border border-accent bg-surface p-3 shadow-sm"
          >
            <h2 id="input-choice" className="mb-2 text-sm font-semibold">
              How would you like to type?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => chooseInput(false)}
                className="min-h-12 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
              >
                Tap the keys below
              </button>
              <button
                type="button"
                onClick={() => chooseInput(true)}
                className="min-h-12 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium"
              >
                {scheme ? "Use my phone keyboard (English letters)" : "Use my phone's keyboard"}
              </button>
            </div>
          </section>
        )}
        {(roman || hasDictionary(language.code)) && (
          <CandidateBar
            state={suggest.state}
            roman={roman}
            lang={language.lang}
            dir={language.dir}
            languageName={language.name.en}
            predict={predict}
            onTogglePredict={() => {
              const next = !predict;
              setPredict(next);
              savePreference("predict", next ? "on" : "off");
              setAnnouncement(next ? "Word suggestions on" : "Word suggestions off");
            }}
            onPick={(i) => {
              if (suggest.pick(i)) track("pick", { rank: i, roman });
            }}
            onKeep={keepRoman}
            showNumbers={!coarse}
            spelling={
              hasSpelling(language.code)
                ? {
                    enabled: spellcheck,
                    beta: !spellingByDefault(language.code),
                    onToggle: () => {
                      const next = !spellcheck;
                      setSpellcheck(next);
                      savePreference(`spellcheck:${slug}`, next ? "on" : "off");
                      setAnnouncement(next ? "Spell check on" : "Spell check off");
                      if (next) suggest.load();
                    },
                    onIgnore: () => acceptWord(false),
                    onAdd: () => acceptWord(true),
                    autocorrect: hasAutocorrect(language.code)
                      ? {
                          enabled: autocorrect,
                          onToggle: () => {
                            const next = !autocorrect;
                            setAutocorrect(next);
                            savePreference(`autocorrect:${slug}`, next ? "on" : "off");
                            setAnnouncement(next ? "Autocorrect on" : "Autocorrect off");
                          },
                        }
                      : undefined,
                  }
                : undefined
            }
          />
        )}

        {emojiOpen && (
          <Suspense
            fallback={
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
                Loading emoji…
              </p>
            }
          >
            <EmojiPanel
              lang={language.lang}
              nativeName={language.name.native}
              onPick={typeText}
              onClose={() => {
                setEmojiOpen(false);
                editorRef.current?.focus({ preventScroll: true });
              }}
            />
          </Suspense>
        )}

        {isLatin && language.accents && !passthrough && !(coarse && emojiOpen) && (
          <AccentBar
            accents={language.accents}
            upper={displayMods.shift !== displayMods.caps}
            lang={language.lang}
            onPick={(c) => {
              suggest.load();
              onAlternate(c);
            }}
            smartAccents={
              hasDictionary(language.code)
                ? {
                    enabled: smartAccents,
                    onToggle: () => {
                      const next = !smartAccents;
                      setSmartAccents(next);
                      savePreference(`accents:${slug}`, next ? "on" : "off");
                      setAnnouncement(next ? "Smart accents on" : "Smart accents off");
                      if (next) suggest.load();
                    },
                  }
                : undefined
            }
            typography={
              typingRule
                ? {
                    label: language.code === "fr" ? "Espaces fines" : "¿ ¡",
                    title:
                      language.code === "fr"
                        ? "French spacing: a narrow no-break space before ; : ! ? and inside « »"
                        : "Typing ? or ! at the end of a sentence adds ¿ or ¡ at its start",
                    enabled: typography,
                    onToggle: () => {
                      const next = !typography;
                      setTypography(next);
                      savePreference(`typography:${slug}`, next ? "on" : "off");
                      setAnnouncement(
                        `${language.code === "fr" ? "French spacing" : "Opening ¿ ¡"} ${next ? "on" : "off"}`,
                      );
                    },
                  }
                : undefined
            }
          />
        )}

        {/* On phones the emoji panel takes the on-screen keyboard's place, as phone keyboards do. */}
        {!phoneKeyboard && !(coarse && emojiOpen) && (
          <VirtualKeyboard
            labelFor={(code) => machine.labelFor(code, displayMods)}
            longpress={layout.longpress}
            rows={rows}
            shift={latch.shift}
            altgr={latch.altgr}
            hasAltGr={Object.values(layout.keys).some((k) => k?.ag || k?.sag)}
            caps={displayMods.caps}
            passthrough={passthrough}
            showToggle={!isLatin}
            nativeName={language.name.native}
            letterKeys={letterKeys}
            pressed={pressed}
            onChar={onChar}
            onAlternate={onAlternate}
            onAction={onAction}
            phone={phone}
            onCaret={onCaret}
            onDeleteWords={onDeleteWords}
            settings={keyboardSettings}
          />
        )}
      </div>
    </div>
  );
}
