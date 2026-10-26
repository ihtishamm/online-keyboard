# Online Multilingual Keyboard: Competitive Teardown & Execution Plan

> Target analysed: `https://www.branah.com/urdu`, with spot checks of `/chinese`, `/japanese`, `/hindi`, `/arabic`, `/sindhi`, `/punjabi`, `/farsi`, `/bangla` and the home page.
> Method: REA (Reverse Engineering Agent) browser and JavaScript analysis, a headless Chrome capture, and a manual read of the shipped inline bundle.
> Date: 2026-10-26

---

## 0. Ground rules (legal and ethical)

- We studied **behaviour and architecture** so we can build something better. We do **not** copy Branah's code, CSS, branding, page text or layout data tables.
- Keyboard layouts are standards, not Branah's property. We source ours from openly licensed or standard references:
  - Unicode **CLDR keyboard** data
  - **SIL Keyman** keyboards (MIT/open licences)
  - Microsoft KLC layouts (as references only)
  - **CRULP** Urdu phonetic specs
  - Government InScript specs (Indic scripts)
- Dictionaries and corpora for prediction must have clear licences: Urdu Wikipedia dumps (CC BY-SA), Leipzig corpora, OSCAR, Hunspell `ur` (check its licence).

---

## 1. Reverse-engineering findings

### 1.1 Evidence ledger

| # | Finding | Evidence | Confidence |
|---|---------|----------|-----------|
| E1 | The page runs 2 scripts. The whole app is **one ~33.8 KB inline IIFE bundle** (esbuild-style output). The other script is the AdSense push. | REA `analyze_web_bundle` `ev_1c40a19b…93d1` (sha256 `e20d950a…2226`) | observed |
| E2 | The bundle has no network endpoints, routes, source maps or WebMCP. Urdu is 100 % client-side. | same Evidence: `endpoints: []`, `routes: []` | observed (static) |
| E3 | Static graph: 1 file, 0 modules, ~10k AST nodes, no parse failures. | REA `analyze_javascript_application` `ev_3bcf24bd…ae78` | derived |
| E4 | Third-party code: Google AdSense only (`ca-pub-…`), plus iframes from doubleclick. | CDP target list and HTML `<script src>` | observed |
| E5 | 98 language pages plus side tools (OCR, PDF to text, Braille, Unicode table, etc.). | Home page fetch | observed |
| E6 | CJK pages load **XML dictionaries** from `/xml/*.xml` and show candidates on the number row. | `/chinese`, `/japanese` HTML | observed (static) |
| E7 | Urdu has 2 layouts (Standard, Phonetic) and **no transliteration or word suggestions** on the web. Farsi has a "Transliteration" layout; Urdu does not. | Layout IDs in each page | observed |
| E8 | Punjabi is **Gurmukhi only** (InScript/Phonetic). There is no Shahmukhi. Balochi, Saraiki, Kashmiri, Hindko, Brahui and Shina are absent. | `/punjabi` layouts and the home language list | observed |

Gaps in coverage: we did not observe the server or CDN configuration, analytics beyond AdSense, or the mobile app internals. Other language pages got light static checks only, with no runtime capture.

### 1.2 Architecture (described in our own words)

```
Static HTML page per language (SSR/static, SEO text + FAQ)
 └─ Inline bundle
     ├─ util       : caret/selection helpers, surrogate-pair & emoji-cluster aware backspace,
     │               browser sniffing (mobile UA, Opera, Firefox keyCode quirks)
     ├─ layout     : data model for one layout (48 key slots k0..k47) + dead-key table
     ├─ keyboard   : renders buttons, holds modifier state, routes input, draws labels
     ├─ store      : localStorage wrapper keyed by page slug (undo, redo, layout, fontSize)
     └─ plugins    : installed via install(ctx)
          • layout switcher (radio buttons, persisted)
          • font size  (- / +, 14–36 px, step 2)
          • edit tools (Select All, Copy, Undo, Redo, Clear All)
          • share links (mailto, X intent, Google search, Google Translate sl=<lang>&tl=en)
          • save as .txt (Blob download, form-POST fallback)
 Page config object: { url slug, langAbbr, fontSize, layouts[{Id, Name, Json}] }
```

**Key mechanics observed:**

1. **Layout model.** Each key slot has a physical id (`k0`–`k47`, ANSI plus ISO key 47) and up to **6 layers**: normal, shift, AltGr, Shift+AltGr and two Caps "SGCap" layers. A per-key flag says whether Caps acts like Shift. Dead keys are `(trigger, base) → composed` pairs.
2. **Physical input.** `keydown` maps `event.code`, or the legacy `keyCode` for old browsers, to the slot index. The app looks up the active layer, then **prevents the default** and inserts the character itself at the caret. Ctrl+A/C/V/X/Y/Z pass through.
3. **Esc** toggles between the target layout and plain QWERTY passthrough.
4. **On-screen input.** Delegated pointer events on the keyboard container. Holding a key auto-repeats after about 300 ms (a 50 ms interval after 5 ticks). Hovering a modifier previews its layer.
5. **Responsive.** Below 640 px the HTML is a different, compact 3-row build. It is chosen **once at load** and does not react to resize or rotation. On mobile UAs the textarea is set to **readOnly** to suppress the OS keyboard.
6. **Emoji.** The emoji panel pages through **raw consecutive code points** from U+1F600, 14 per row. It has no categories or search, and it shows unassigned or invalid code points.
7. **Persistence.** Every 3 s, if the text changed, the app pushes a **full text snapshot** onto the undo stack in localStorage. There is no cap, so the stack grows without bound. On load it restores the last snapshot (autosave).
8. **Copy** uses the deprecated `document.execCommand('copy')` and falls back to an `alert()`.
9. **CJK IME.** An XML dictionary is fetched per input method. A buffer is matched to candidates, shown on the number keys with ◂/▸ paging, and Space picks the first.
10. **Rendering.** Text is shown in the browser's default font. There is **no Nastaliq font**, so Urdu renders in Naskh, which most Urdu readers dislike.

### 1.3 UX audit (from the screenshot and DOM)

- A cramped layout of the 2010s. Ads and "discover more" links push the editor down. No dark mode.
- There's no visual feedback on the on-screen key when you press a physical key.
- Key legends are tiny and pink-on-grey. Contrast is weak.
- Accessibility: buttons have no `aria-label`, and layer or modifier state isn't announced. The textarea has no label. Screen-reader users get little.
- There's one document with no titles, no history browser and no sync.
- The phone experience upsells the native app instead of being good on the web.

---

## 2. Where we win (positioning)

**"The best way to type Urdu (and every South-Asian / Arabic-script language) online, beautiful, smart, private, offline."**

Branah is broad (98 languages) but shallow. We go **deep on Urdu and its neighbouring languages first**, then scale breadth through a data-driven layout pipeline.

| Gap at Branah | Our answer |
|---|---|
| No Nastaliq rendering | Nastaliq by default (Noto Nastaliq Urdu, Mehr/Jameel-style open fonts), with a font switcher |
| No Roman-Urdu transliteration | **Type "mera naam" and get میرا نام** with ranked candidates. This is how most Pakistanis actually type. |
| No word prediction on web | Client-side n-gram/trie prediction, plus next-word suggestions |
| No spell check | Urdu spell check with suggestions (Hunspell/own wordlist, run in a Web Worker) |
| Naive emoji | Real emoji picker with categories, search and skin tones (CLDR annotations) |
| Plain .txt export only | Export .txt, .docx, .pdf and a **PNG/JPG "post image"** in Nastaliq for WhatsApp, Facebook and Instagram |
| No InPage support | **InPage ↔ Unicode converter** (big demand from Pakistani offices and journalists) |
| Missing languages | Shahmukhi Punjabi, Saraiki, Balochi, Kashmiri, Hindko, Brahui, Shina, Torwali, Khowar, Pashto variants |
| Fixed layout, resize-blind | Fluid responsive keyboard, landscape and tablet modes, split keyboard |
| Weak a11y | WCAG 2.2 AA, ARIA live layer announcements, high-contrast theme |
| Single doc, localStorage spam | IndexedDB multi-document drafts with capped history, plus optional cloud sync |
| No offline web | PWA, installable and fully offline |
| Ad-heavy | Light ads, with an ad-free Pro tier |

---

## 3. Product scope and priorities

### P0: MVP (parity plus the killer features)
1. Core typing engine (our own clean implementation; see §4.2) with physical `event.code` mapping, 6 layers, dead keys, RTL/LTR, auto-repeat and pressed-key highlighting.
2. Urdu layouts: **Phonetic** (CRULP-style), **Standard** (Windows/national standard) and **Roman-Urdu transliteration**.
3. Nastaliq rendering in the editor, with font size and line-height controls.
4. Toolbar: Copy (Clipboard API), Paste, Undo/Redo (native plus our own stack), Clear (with undo instead of `confirm()`), Download .txt, Share (Web Share API, WhatsApp, X, email).
5. Autosave to IndexedDB. Restore on load.
6. Responsive keyboard that reflows on resize. Mobile-first. Toggling the OS keyboard is optional instead of a forced readOnly.
7. Dark and light themes. Accessible markup.
8. SEO-ready static page per language and layout (fast LCP < 1.5 s, no layout shift from ads).

### P1: Differentiators
1. Word prediction and next-word suggestions (Urdu first).
2. Spell check with a red underline and suggestions.
3. Export to .docx, .pdf and a social **image card** (Nastaliq, themes, watermark optional).
4. InPage → Unicode (and reverse) converter page.
5. Voice typing (Web Speech API `ur-PK` where supported, with graceful fallback).
6. A full emoji panel.
7. Multi-document drafts sidebar.
8. A layout cheat-sheet overlay and a printable layout PDF.
9. A typing tutor and speed test for Urdu (a strong SEO and retention loop).
10. Add the regional language pack: Arabic, Farsi, Pashto, Sindhi, Shahmukhi Punjabi, Saraiki, Balochi, Kashmiri, Hindi, Bangla.

### P2: Scale and moat
1. AI assist (Claude API, server-side proxy): translate, fix grammar and diacritics (اعراب), convert messy Roman Urdu, and summarise. Rate-limited, with a Pro tier.
2. Custom layout editor (users build and share layouts as JSON).
3. Browser extension that types Urdu into any website.
4. An embeddable widget (`<script>`) for other sites (B2B/education).
5. Scale to 100+ languages via the layout import pipeline (Keyman/CLDR → our schema).
6. Account plus cloud sync (optional, privacy-first).
7. Image-to-text (Urdu OCR via Tesseract.js `urd` model, client-side).

---

## 4. Technical design

### 4.1 Stack
- **Framework:** Astro (static-first, best for hundreds of SEO pages) with React islands for the keyboard app. Next.js (App Router, SSG) is the alternative if we expect lots of app-like pages.
- **Language:** TypeScript, strict mode.
- **Styling:** Tailwind CSS with CSS variables for theming.
- **State:** Zustand (or signals) inside the island.
- **Storage:** IndexedDB via `idb-keyval`/Dexie.
- **Workers:** a Web Worker for transliteration, prediction and spellcheck, so the UI thread never blocks.
- **PWA:** Workbox service worker. Dictionaries are cached on demand per language.
- **Fonts:** self-hosted and subsetted WOFF2 (Noto Nastaliq Urdu, Noto Naskh Arabic, Noto Sans per script), `font-display: swap`.
- **Testing:** Vitest (engine unit tests), Playwright (E2E typing on desktop and mobile viewports), axe-core (a11y).
- **Hosting:** Cloudflare Pages or Vercel with edge caching. A small serverless API only for P2 AI features.
- **Analytics:** privacy-friendly (Plausible/Umami).

### 4.2 Core engine (`packages/engine`), framework-agnostic
```
engine/
  layout/schema.ts        # our JSON schema (zod-validated)
  layout/registry.ts      # lazy-load layouts per language
  input/physical.ts       # KeyboardEvent.code -> slot, modifier tracking, IME-safe
  input/virtual.ts        # pointer events, long-press popups (alternate chars), repeat
  compose/deadkeys.ts     # dead-key & multi-key compose state machine
  translit/engine.ts      # rule-based Roman->script transliteration (longest-match FST)
  translit/rank.ts        # candidate ranking with dictionary frequency
  predict/trie.ts         # prefix trie + bigram next-word model (binary packed)
  text/caret.ts           # setRangeText-based insert/delete, grapheme-aware (Intl.Segmenter)
  text/normalize.ts       # Unicode NFC, Urdu-specific normalisation (ی/ي, ک/ك, ہ/ه)
```

**Layout schema (our own design):**
```jsonc
{
  "id": "ur-phonetic",
  "lang": "ur", "script": "Arab", "dir": "rtl",
  "name": { "en": "Urdu Phonetic", "native": "اردو صوتی" },
  "base": "ansi",            // ansi | iso | jis | mobile
  "keys": { "KeyA": { "n": "…", "s": "…", "ag": "…", "sag": "…", "caps": "shift" } },
  "longpress": { "KeyA": ["…", "…"] },   // mobile alternates
  "deadkeys": [{ "trigger": "…", "base": "…", "out": "…" }],
  "translit": "ur-roman"     // optional transliteration scheme id
}
```
Keys are indexed by **`KeyboardEvent.code`** directly, not numeric slots, so ISO, JIS and mobile rows fit cleanly.

**Engine improvements over Branah:**
- Use `setRangeText` and `beforeinput`/`InputEvent` so native undo, autocorrect and IME composition keep working.
- Grapheme-aware delete with `Intl.Segmenter` (handles emoji ZWJ sequences, Urdu ligatures and diacritics) instead of hand-written code-point tables.
- Respect `compositionstart/end`, so we never fight the OS IME.
- Resize-aware rendering (ResizeObserver), with no full re-render on every key. Update only the labels that changed.

### 4.3 Transliteration (the killer feature)
- **Phase A: rules.** Longest-match tables, e.g. `kh→خ`, `gh→غ`, `sh→ش`, `ch→چ`, `aa→آ/ا`, `ee→ی`, `oo→و`, word-final `a→ہ/ا`, plus context rules.
- **Phase B: dictionary ranking.** Build a Roman↔Urdu word list (from a mined corpus and community contributions). Generate candidates from the rules, then re-rank them by dictionary frequency.
- **Phase C (P2): AI fallback** for whole-sentence conversion and ambiguous words.
- UX: an inline candidate bar above the keyboard. Space commits the top candidate, 1–9 picks one, Esc keeps the Roman text. A toggle switches between "Roman mode" and "Direct mode".

### 4.4 Prediction and spell check
- Ship per-language **binary-packed tries** (target < 1 MB gzipped for Urdu, top ~100k words) plus a bigram table.
- Load lazily after first input. Cache with the service worker.
- Spell check runs nspell/Hunspell in a worker. Results show as underlines on a mirrored overlay above the textarea, or we use a contenteditable editor (see the risk notes).

### 4.5 Editor choice
- MVP: `<textarea>` (simple, reliable with RTL and copy).
- P1: move to a light contenteditable editor (Lexical or ProseMirror) only if spell-underlines or rich export need it. Keep the plain-text model either way.

### 4.6 Repo layout
```
online-keyboard/
  apps/web/                 # Astro site
    src/pages/[lang]/index.astro         # e.g. /urdu, /arabic
    src/pages/[lang]/[layout].astro      # e.g. /urdu/phonetic
    src/pages/tools/inpage-converter.astro
    src/pages/typing-test/[lang].astro
    src/components/keyboard/*            # React island
    src/content/languages/*.md           # SEO copy, FAQs per language (original text)
  packages/engine/          # TS core (no DOM deps where possible)
  packages/layouts/         # JSON layouts + importer scripts (Keyman/CLDR -> schema)
  packages/dictionaries/    # build scripts -> packed tries per language
  packages/ui/              # shared components, themes
  tools/                    # corpus processing, font subsetting
```

---

## 5. Execution roadmap

### Phase 0: Foundations (week 1) ✅ done
- [x] Monorepo (pnpm workspaces), TS strict, ESLint/Prettier, Vitest, Playwright, CI (GitHub Actions).
- [x] Design tokens (light, dark, high-contrast), typography scale. *Font subset pipeline moved to Phase 3 (see Phase 1 notes).*
- [x] Layout JSON schema and validator. Importer prototype for Keyman `.kmn` (positional/mnemonic subset).
- [x] Added: `tools/invisible-chars.mjs` (escapes invisible characters, blocks bidi controls / Trojan Source).
- **Exit:** CI workflow written; all checks pass locally. *Not yet run on GitHub (no remote configured).*

### Phase 1: Engine and Urdu MVP (weeks 2–4) ✅ done
- [x] Physical-key engine (code→layer→insert) with Shift, AltGr, Caps and dead keys, plus Esc passthrough toggle.
- [x] Virtual keyboard component: responsive desktop/mobile rows, Backspace auto-repeat, long-press alternates, pressed-key highlighting.
- [x] Urdu Phonetic (CRULP-based) and Standard (Windows Urdu-based) layouts, plus AltGr diacritics and honorifics.
- [x] Toolbar: copy, share, download .txt, clear-with-undo, font size, font family, phone-keyboard switch.
- [x] Autosave in IndexedDB, multiple drafts (basic).
- [x] `/urdu` and `/urdu/standard` pages: editor above the fold, original SEO copy, FAQ + WebApplication JSON-LD, layout charts. *hreflang deferred until there is a translated UI.*
- **Exit:**
  - [x] Playwright types known sentences on both layouts and matches the expected Unicode (23 e2e tests, desktop + mobile).
  - [x] axe: 0 serious/critical violations.
  - [x] Lighthouse desktop: 100 / 100 / 100 / 100.
  - [ ] Lighthouse mobile: Accessibility, Best Practices, SEO 100; **Performance median ≈ 90** (runs vary 85–97 on a local preview server). Remaining cost is style/layout of Arabic-script text above the fold. Follow-up in Phase 3: subset display fonts (`subset-font`/HarfBuzz), measure on real hosting with a CDN.

### Phase 2: Roman Urdu and prediction (weeks 5–7) ✅ done
- [x] Transliteration rules engine with candidate bar: weighted rules + beam search constrained to dictionary prefixes, fixed chat-word list, omitted-letter insertion, capital hints (T→ٹ), context ranking from the next-word table. `/urdu/roman`: convert on Space/punctuation (one undo step), 1–6 to pick, Esc keeps English, phone keyboards convert after the space.
- [x] Corpus pipeline (`packages/dictionaries`): Urdu Wikipedia dump (1 Oct 2026, CC BY-SA 4.0, credited in the footer) → markup stripping, sentence dedup, normalisation, frequencies, next-word table. 100k words; 407 KB + 99 KB gzipped. The trie is built in a Web Worker (126 ms on desktop would block a phone) and transferred as typed arrays. *Shipped as a ranked text list rather than a binary trie: it compresses better and builds fast.*
- [x] Word completion and next-word suggestions on all layouts, with an on/off switch.
- [x] Test set: 663 Roman→Urdu pairs. **Top-1 86.9 %, top-5 99.2 %.** (Rules were tuned against this set.)
- **Exit:** [x] held-out set of 20 chat messages (not used for tuning): **6 corrections in 121 words (5.0 %)**, under the 1-in-10 bar. Remaining misses need sentence context or loanwords (کہ/کے, فون, کھانا/کہنا, دعا/دوا).
- Notes:
  - Lighthouse mobile on this machine is too noisy to compare (Phase 1 baseline itself 74–88 in alternating runs). The island grew by 7.6 KB gzipped; React's runtime (65.6 KB gzipped) is the main JS cost. Follow-up in Phase 3: try Preact (`preact/compat`, about 50 KB smaller) and measure on real hosting.
  - Evaluation runs in CI: `pnpm --filter @okb/dictionaries eval:ur` prints the misses.

### Phase 3: Regional language pack and tools (weeks 8–10)
- [x] Arabic, Farsi, Pashto, Sindhi, **Shahmukhi Punjabi**, **Saraiki**, **Balochi**, Kashmiri, Hindi, Bangla (layouts, fonts and page copy).
  - Layouts are generated from vendored open sources (`packages/layouts/vendor/`, licences included) by `pnpm --filter @okb/layouts import:layouts`; a test fails if `data/` drifts from them. Windows standards come from Unicode CLDR 43 (new `importCldr` in the engine): Arabic (101), Persian (Standard, ISIRI 9147), Pashto, Hindi InScript, Bengali InScript. Phonetic layouts come from Keyman (MIT): Sindhi (Rachitrali), Shahmukhi (SIL), Saraiki (Parvez Qadir), Balochi (SIL), Kashmiri (SIL).
  - Our changes are listed in each layout's `source` (shown under the layout chart): Sindhi spelling fixes (ڪ on K, ه, ي), Shahmukhi آ as one character, Urdu-style digits for Saraiki/Kashmiri, Balochi's Ctrl layer on AltGr, ZWJ/ZWNJ/₹/৳ on Shift+AltGr for InScript. All output is NFC.
  - Fonts: Noto Naskh/Nastaliq for Arabic script (Sindhi Naskh only: Nastaliq lacks ڪ), Noto Sans Devanagari/Bengali. Nastaliq is no longer fetched on pages that don't offer it.
  - Phones keep punctuation keys that carry letters (Arabic ج د ك ط, InScript ड च ट य, Sindhi ٿ ڱ ڌ ڳ). The suggestion bar is hidden for languages without a word list.
  - Golden typing tests per language (unit + e2e), alphabet coverage tests, axe on every page.
  - Follow-ups: dedicated mobile rows for the denser layouts; phonetic Hindi/Bangla (Avro-style) and Gurmukhi Punjabi; word lists for the new languages.
- [x] InPage ↔ Unicode converter. `/inpage-to-unicode`, linked from the home page.
  - `packages/inpage`: compound-file (OLE2) reader, paragraph-record extraction from the `InPage100/200` stream, decoder for `.inp` files and for text copied out of InPage (U+0004 + cp1252), and a Unicode → InPage encoder for pasting into InPage 2000/2002.
  - Character table compiled from two independent references (Kamal Abdali's InpToUni; zanysoft, MIT). They agree on every letter. Output matches Abdali's on a real 43-paragraph InPage 2000 file (not committed: no licence), once NFC and Urdu digits are applied. Codes neither source pins down show as � and are counted for the user.
  - InPage's one hamza code becomes ئ inside a word and ء at its end; آ/أ/ؤ/ۂ/ۓ are composed from letter + mark.
  - Tests: synthetic .inp files from a test compound-file writer (regular and mini streams), round trips, hamza, clipboard text; e2e for upload, paste, reverse, "Edit in Urdu keyboard", axe.
  - Not covered: InPage 3+ files (already Unicode; the page says so) and formatting (text only).
- [x] Export to .docx, .pdf and a Nastaliq image card. The toolbar's Download menu offers Text, Word, PDF and Image card; export code loads only when used.
  - .docx is written in the browser (small stored-ZIP writer, no dependency): one paragraph per line, with the editor's font, size, language and direction in the document defaults. Fonts are named, not embedded (Nastaliq is over 1 MB). Checked in LibreOffice.
  - PDF goes through the print dialog ("Save as PDF") with a print sheet holding only the text, so the browser shapes Nastaliq/Indic text and it stays selectable. A JavaScript-drawn PDF would need a shaping engine.
  - Image card: canvas PNG in the editor's font, in Square, Portrait (4:5) and Story (9:16) shapes, four colour themes, the largest font size that fits, an optional site-address watermark, and Share on devices that can share files.
  - On phones, toolbar menus open as a bottom sheet (the scrolling toolbar clipped them).
  - Tests: ZIP/CRC, docx parts, print sheet, text fitting (unit); e2e downloads the .docx and PNG, checks the print-only view, and runs axe on the dialog.
- [x] Emoji panel with search. Toolbar "Emoji" button; the panel loads on first open.
  - `packages/emoji`: 1,870 emoji (Unicode emoji-test.txt, capped at Emoji 15.0 so older phones draw them all), 305 with skin tones, CLDR 49 names and keywords in English plus every page language (Saraiki, Balochi and Kashmiri use Urdu; Shahmukhi gaps filled from Urdu). Built by a script from pinned sources; ~45 KB + ~25-50 KB gzipped per language.
  - Search matches word prefixes in English or the page language (پاکستان, خدا حافظ, नमस्ते), ignores case, accents and Arabic vowel marks, and folds ي/ی, ك/ک, ه/ہ. Enter inserts the top result.
  - Categories, Recently used, a remembered skin tone, arrow-key grid navigation, Escape to close. On phones the panel takes the on-screen keyboard's place.
  - Tests: data and search (unit); e2e for insertion, both-language search, skin tone + recents across reloads, keyboard navigation, whole-emoji backspace, phone layout, axe.
- [x] PWA offline mode. Installable (web manifest, 192/512 and maskable icons, apple-touch-icon, shortcuts to Urdu/Arabic/Hindi/InPage) and offline after the first visit.
  - Hand-written service worker (`src/sw/service-worker.js`), no Workbox. After `astro build`, an integration (`src/sw/build.ts`) writes `dist/sw.js` with the precache list: every page plus the scripts and styles they import statically (26 files, ~2 MB raw), versioned by a hash of their contents. Dynamic chunks (emoji keywords, exports), word lists and fonts are cached the first time they are fetched; the page also hands over what it loaded before the worker took control.
  - Pages are network-first (4 s timeout, then cache), so releases show up at once; hashed `/_astro/` files are cache-first, and files from earlier builds are dropped on activation. Cache lookups ignore `Vary` (servers send `Vary: Origin`, and fonts and module scripts carry an Origin header).
  - Registered in production builds only. The footer says "Works offline." once the worker controls the page.
  - Tests: precache list (static imports in, dynamic imports out, version changes with content); e2e on Chromium: offline reload types and renders Nastaliq, unvisited pages open offline, emoji used once works offline, manifest and icons.
- **Exit: met.** Every language passes its golden-text typing test (unit + e2e), and the site works offline after the first visit (e2e).
- Still open from earlier phases (not checklist items): subset display fonts, try Preact, measure Lighthouse on real hosting. They need a real deploy (and new packages for subsetting and Preact), so they wait for the first deployment.

### Phase 4: Engagement and growth (weeks 11–13)
- [x] Urdu typing tutor and speed test (WPM, accuracy, shareable result card). `/urdu-typing-test` and `/urdu-typing-tutor`, linked from the home page and `/urdu`.
  - Test: Phonetic or Standard, 30 s / 1 min / 2 min, common words or sentences; the clock starts with the first key. Net WPM (correct characters incl. spaces / 5 / minutes), raw WPM, keystroke accuracy, right/wrong words, personal best per layout and length (on the device), and a result image to download or share. "My device already types Urdu" leaves key presses to the OS keyboard.
  - Tutor: lessons generated from the layout (home, top, bottom rows, then each with Shift, then common words and sentences). Drill words come from the Urdu frequency list at build time, using only letters learned so far; early lessons are topped up with letter groups. The next key (and Shift) lights up on the on-screen keyboard, wrong keys ask for Backspace; 90% accuracy passes a lesson, progress is saved per layout.
  - Words are checked whole (colouring single letters would break Nastaliq joining); comparisons use NFD, so آ or ؤ typed as one key or as letter + mark both count. Practice text is original (everyday words, 12 short passages) and tested to be typeable on both layouts.
  - Engine: `keystrokeMap(layout)`, character -> key and modifiers.
  - Tests: drill scoring, NFD handling, next-key logic, lesson generation for both layouts (unit); e2e typing through the phonetic layout, timer and result (fake clock), result PNG, own-keyboard mode, phone keys, tutor highlight and a passed lesson, axe on both pages.
- [x] Spell check (Urdu). On `/urdu` (every layout), on by default, with a toggle in the suggestion bar. It runs in the browser on the existing 100k-word list, so nothing is sent anywhere.
  - Misspelled words get a wavy underline: a transparent copy of the text over the editor, sized to its content box and scrolled with it. The word being typed is underlined only once the caret leaves it. With the caret in a flagged word, the suggestion bar offers corrections, Ignore (this page view) and Add to my dictionary (saved on the device). The footer shows "N possible misspellings", which jumps to the next one.
  - Engine `SpellChecker`: corrections come from a weighted Damerau–Levenshtein search over the trie, with frequency as the tie-break. Sound-alike letters are cheap to swap (س/ص/ث, ز/ذ/ض/ظ, ت/ط, ہ/ح, ا/ع, ک/ق), and so are near misses on the keyboard (ت/ٹ, ہ/ھ, ہ/ے). Dropping a vowel letter or a hamza is cheap too.
  - What counts as correct:
    - Words run together after a non-joining letter (اورپھر, کےلیے).
    - ہ/ھ and ئے/یے variants (تمہارا, چاہئے).
    - Verb forms whose infinitive is in the list (سوچو, کرونگا).
    - Rare corpus words are flagged only when one cheap edit away from a word 10× more common, which catches typos that crept into the list (سحت, مسلہ).
  - Evaluation (`packages/dictionaries/test/spell-eval.test.ts`, original data):
    - 44 common misspellings: 43 flagged; the right word is first for 43 and in the top 3 for all 44.
    - 808 correct words from the Roman Urdu sets: 2 flagged (بلکل, مسلہ), both real misspellings.
    - The rules were tuned against both sets, so these figures are optimistic.
  - Tests: engine unit tests, component tests (underline, correct, jump, ignore/add, typing, toggle), and e2e on desktop and mobile (corrections, overlay geometry, personal dictionary across a reload, axe).
- [x] Voice typing. A "Voice typing" toolbar button on Urdu, Arabic, Farsi, Hindi and Bangla. It appears only where the browser has the Web Speech API (Chrome, Edge, Safari; not Firefox).
  - Privacy: the first use shows a notice that the browser sends the recording to its speech service (Google, Microsoft or Apple). Voice starts only after the user agrees, and the choice is remembered. Typed text still never leaves the device; the Urdu privacy FAQ says so, and a new FAQ explains voice typing.
  - Finished phrases are typed at the cursor, with a space before them when needed. Words not yet final show in a "Listening" strip with a Stop button. Urdu output gets Urdu letter forms. Spoken punctuation works in Urdu (فل سٹاپ ۔, سوالیہ نشان ؟, کوما ،, نئی لائن) and Hindi (पूर्ण विराम ।, अल्पविराम, नई पंक्ति).
  - Browsers end recognition on their own (after a pause, after each phrase on Android, after about a minute). A new session starts until the user presses Stop or an error occurs. Android runs one phrase per session, because continuous mode repeats results there.
  - Errors are explained: microphone blocked, no microphone, offline, language not supported, nothing heard.
  - Shahmukhi, Sindhi, Pashto and the other languages are left out until speech services return them in the script this site types; Punjabi comes back in Gurmukhi.
  - Also fixed: pressed toolbar buttons (Emoji, Voice typing) now look pressed. `bg-surface` had been overriding `bg-accent-soft`.
  - Tests: text clean-up, spacing and errors (unit); a fake recogniser for consent, dictation, interim text, restarts, a blocked microphone and the button hidden without support (component); e2e with a fake recogniser on desktop and mobile, plus axe.
- [ ] Printable layout cheat sheets (PDF) as SEO landing assets.
- [ ] Blog and guides in original content: "How to type Urdu on Windows/Mac/Android", "Roman Urdu to Urdu".

### Phase 5: Scale and monetise (week 14 onward)
- [ ] Bulk layout import to reach 100+ languages (prioritise by search volume).
- [ ] AI assist (Claude API via a server proxy, rate-limited) as a Pro feature.
- [ ] Browser extension (Chrome/Firefox) reusing `packages/engine`.
- [ ] Embeddable widget and an API for schools and publishers.
- [ ] Accounts and sync (optional).

---

## 6. UI and UX blueprint

- **Above the fold:** language switcher (searchable, native names), layout tabs (Phonetic / Standard / Roman), a big editor (Nastaliq, about 28 px default), and a candidate bar.
- **Keyboard:** large rounded keys with the native glyph big and the Latin hint small. The pressed key animates. The active modifier glows. On mobile there are full-width keys and long-press popups.
- **Toolbar:** icon buttons with tooltips: Copy, Share, Download ▾ (txt/docx/pdf/image), Undo, Redo, Clear, Font ▾, Theme, Fullscreen/Focus mode.
- **Focus mode:** hide everything except the editor and keyboard.
- **Ads:** one reserved slot below the keyboard and one in the sidebar on desktop. No ads inside the typing area. Fixed dimensions, so there's no CLS.
- **Trust:** a "Your text never leaves your device" badge (true for everything except opt-in AI).

---

## 7. SEO and growth plan

- One canonical page per language and per layout (`/urdu`, `/urdu/phonetic`, `/urdu/roman`), plus tool pages (`/inpage-to-unicode`, `/urdu-typing-test`).
- Target Urdu and English keywords: "urdu keyboard", "roman urdu to urdu", "type in urdu", "اردو کی بورڈ", "inpage to unicode", "urdu typing test".
- Bilingual pages: English UI with Urdu content blocks, `lang`/`dir` set correctly, hreflang alternates.
- Core Web Vitals: zero-JS SEO shell, keyboard island hydrated on idle/visible.
- Structured data: `FAQPage`, `SoftwareApplication`, `HowTo`.
- Shareable outputs (image cards, typing-test results) carry a subtle URL watermark, which gives a viral loop.
- Community: an open layout and dictionary contribution repo (credits, GitHub), which brings backlinks.

---

## 8. Monetisation

- **Free:** everything in the MVP and P1, with light ads.
- **Pro (≈ $2–3/mo or regional pricing in PKR):** no ads, AI assist, cloud sync, premium Nastaliq image templates, unlimited docs and history.
- **B2B:** embeddable widget, OCR/conversion API, school licences for the typing tutor.

---

## 9. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| LCP (mobile, p75) | < 1.8 s |
| Lighthouse a11y | ≥ 95 |
| Roman→Urdu top-1 accuracy | ≥ 85 % |
| Avg. session length on /urdu | > Branah's (benchmark via SimilarWeb) |
| Copy/share/export actions per session | ≥ 1.2 |
| Returning-user rate (7-day) | ≥ 25 % |
| Organic ranking | Top 5 for "urdu keyboard", top 3 for "roman urdu to urdu" |

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Nastaliq fonts are heavy (MBs) | Subset per page, `unicode-range`, lazy-load the full font |
| Transliteration quality | Rules plus dictionary first. Measure on a test set. Community corrections feedback loop. |
| Dictionary licensing | Use only CC/permissive corpora. Document provenance in `packages/dictionaries/SOURCES.md`. |
| contenteditable RTL bugs | Keep the textarea for the MVP. Adopt an editor only behind a feature flag. |
| Mobile OS keyboard conflict | Offer "use on-screen keyboard only" with `inputmode="none"` instead of readOnly, which keeps caret and selection working |
| Copying competitor IP | Independent implementation, layouts from standards, original copy (see §0) |

---

## 11. Immediate next steps

1. Approve the stack (Astro + React island + TS) or switch to Next.js.
2. Scaffold the monorepo (Phase 0).
3. Collect the Urdu layout specs (CRULP phonetic, Windows Urdu) and the corpus sources.
4. Build the engine and `/urdu` MVP (Phase 1). Then demo it.
