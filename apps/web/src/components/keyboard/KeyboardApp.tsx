import {
  KEY_CODES,
  ModifierLatch,
  TypingMachine,
  US_QWERTY,
  isKeyCode,
  type KeyCode,
  type Modifiers,
} from "@okb/engine";
import { getLanguage, getLayout, getScheme, layoutSlug, type FontId } from "@okb/layouts";
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
import { hasDictionary } from "./dictionary";
import { deleteBackward, insertText } from "./editor-ops";
import { hasCoarsePointer, isAltGr } from "./platform";
import SpellOverlay from "./SpellOverlay";
import { loadPreference, savePreference } from "./preferences";
import Toolbar, { FONT_SIZES } from "./Toolbar";
import { useDrafts } from "./useDrafts";
import { useSuggestions } from "./useSuggestions";
import VirtualKeyboard, { type KeyAction } from "./VirtualKeyboard";

const EmojiPanel = lazy(() => import("./EmojiPanel"));

/** In Roman mode, characters that end a word (anything but letters, apostrophes and digits). */
const isBoundary = (text: string) => !/^[A-Za-z'0-9]*$/.test(text);

export interface KeyboardAppProps {
  /** Language slug, e.g. "urdu". */
  slug: string;
  /** Layout the page is about. */
  layoutId: string;
  /** True on a layout-specific URL (/urdu/standard); false on the language's main page. */
  explicitLayout: boolean;
}

export default function KeyboardApp({
  slug,
  layoutId: pageLayoutId,
  explicitLayout,
}: KeyboardAppProps) {
  const language = getLanguage(slug);
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

  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [passthrough, setPassthrough] = useState(false);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const [physicalCaps, setPhysicalCaps] = useState(false);
  /** False until hydrated: the server-rendered editor stays read-only so early keys don't type Latin. */
  const [hydrated, setHydrated] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [phoneKeyboard, setPhoneKeyboard] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [font, setFont] = useState<FontId>(language.fonts[0]!);
  const [fontSize, setFontSize] = useState<number>(FONT_SIZES.default);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [announcement, setAnnouncementText] = useState("");
  const announceTimer = useRef<number | undefined>(undefined);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const drafts = useDrafts(slug, editorRef);
  const [predict, setPredict] = useState(true);
  const [spellcheck, setSpellcheck] = useState(true);
  const scheme = layout.translit ? getScheme(layout.translit) : null;
  const roman = scheme !== null && !passthrough;
  const suggest = useSuggestions({
    slug,
    editorRef,
    scheme: roman ? scheme : null,
    predict: predict && !passthrough,
    spellcheck,
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
    setPhoneKeyboard(loadPreference("phoneKeyboard") === "on");
    if (loadPreference("predict") === "off") setPredict(false);
    if (loadPreference("spellcheck") === "off") setSpellcheck(false);
    const savedFont = loadPreference(`font:${slug}`) as FontId | null;
    if (savedFont && language.fonts.includes(savedFont)) setFont(savedFont);
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
   * Type `text` produced by a key. In Roman mode a word boundary (space, punctuation) first
   * converts the Roman word before the caret; punctuation becomes its Urdu form.
   */
  const typeText = (text: string) => {
    if (!roman || !isBoundary(text)) return insert(text);
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

  /** Roman mode: leave the word as typed and move on. */
  const keepRoman = () => {
    insert(" ");
    setAnnouncement("Kept as typed");
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
      if (/^[1-9]$/.test(e.key) && suggest.pick(Number(e.key) - 1)) {
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

    if (machine.pending !== null && (e.key === "Backspace" || e.key === " ")) {
      e.preventDefault();
      const trigger = machine.pending;
      machine.cancelPending();
      if (e.key === " ") insert(trigger);
      rerender();
      return;
    }

    const altgr = isAltGr(ne);
    if (!altgr && (e.ctrlKey || e.metaKey || e.altKey)) return; // browser/OS shortcuts
    if (!isKeyCode(e.code)) return; // Backspace, Enter, arrows... stay native

    e.preventDefault();
    const result = machine.press(e.code, {
      shift: e.shiftKey,
      altgr,
      caps: ne.getModifierState?.("CapsLock") ?? false,
    });
    if (result.kind === "text") typeText(result.text);
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
      const result = machine.press(code, latch.current());
      if (result.kind === "text") typeText(result.text);
    }
    latch.consume();
    rerender();
  };

  const onAlternate = (text: string) => {
    insert(text);
    latch.consume();
    rerender();
  };

  const onAction = (action: KeyAction) => {
    const el = editorRef.current;
    switch (action) {
      case "backspace":
        if (!machine.cancelPending() && el) deleteBackward(el);
        break;
      case "enter":
        if (!(roman && suggest.commit("\n"))) insert("\n");
        break;
      case "space": {
        const trigger = machine.pending;
        machine.cancelPending();
        if (trigger) insert(trigger);
        else if (!(roman && suggest.commit(" "))) insert(" ");
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
          className="inline-flex rounded-lg border border-border bg-surface p-0.5"
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  checked ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
                }`}
              >
                {l.name.en}
                <span className="font-script ms-1.5" lang={l.lang}>
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
        phoneKeyboard={
          coarse
            ? {
                enabled: phoneKeyboard,
                onToggle: () => {
                  const next = !phoneKeyboard;
                  setPhoneKeyboard(next);
                  savePreference("phoneKeyboard", next ? "on" : "off");
                  setAnnouncement(
                    next ? "Using your phone's keyboard" : "Using the on-screen keyboard",
                  );
                  editorRef.current?.blur();
                },
              }
            : undefined
        }
      />

      <div className="relative">
        <textarea
          ref={editorRef}
          dir={layout.dir}
          lang={language.lang}
          aria-label={`${language.name.en} text`}
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
            if (roman) suggest.afterNativeInput(e.nativeEvent as InputEvent);
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

      {(roman || hasDictionary(slug)) && (
        <CandidateBar
          state={suggest.state}
          roman={roman}
          lang={language.lang}
          dir={language.dir}
          predict={predict}
          onTogglePredict={() => {
            const next = !predict;
            setPredict(next);
            savePreference("predict", next ? "on" : "off");
            setAnnouncement(next ? "Word suggestions on" : "Word suggestions off");
          }}
          onPick={(i) => suggest.pick(i)}
          onKeep={keepRoman}
          showNumbers={!coarse}
          spelling={
            hasDictionary(slug)
              ? {
                  enabled: spellcheck,
                  onToggle: () => {
                    const next = !spellcheck;
                    setSpellcheck(next);
                    savePreference("spellcheck", next ? "on" : "off");
                    setAnnouncement(next ? "Spell check on" : "Spell check off");
                    if (next) suggest.load();
                  },
                  onIgnore: () => acceptWord(false),
                  onAdd: () => acceptWord(true),
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
        <span aria-live="polite" className="font-medium text-accent">
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

      {/* On phones the emoji panel takes the on-screen keyboard's place, as phone keyboards do. */}
      {!phoneKeyboard && !(coarse && emojiOpen) && (
        <VirtualKeyboard
          labelFor={(code) => machine.labelFor(code, displayMods)}
          longpress={layout.longpress}
          shift={latch.shift}
          altgr={latch.altgr}
          hasAltGr={Object.values(layout.keys).some((k) => k?.ag || k?.sag)}
          caps={displayMods.caps}
          passthrough={passthrough}
          nativeName={language.name.native}
          letterKeys={letterKeys}
          pressed={pressed}
          onChar={onChar}
          onAlternate={onAlternate}
          onAction={onAction}
        />
      )}
    </div>
  );
}
