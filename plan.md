# Likho: 100 Languages, Mobile First. Execution Plan (Phases 5–11)

> Written 2026-10-31, after Phases 0–4 shipped. The full notes for Phases 0–4 (Branah teardown, technical design, what shipped and why) are in git: `git show 19faad7:plan.md`.
>
> Inputs:
> - The owner's brief: 100 languages; learning and typing tests in those languages; Lexilogos-style keyboards and converters (Arabic, French, Spanish, Italian, case converter); English-to-Hindi typing; Roman-to-script tools for every current language; "English to Spanish/Italian typing"; a keyboard layout tester; typing practice and games; voice, suggestions and correction in more languages; about **70 % of traffic is on phones**.
> - A look at the Lexilogos pages named in the brief.
> - The current code.

---

## 0. How to use this plan (for Claude)

1. Work through the phases in order. Inside a phase, do the items in order unless an item says it can run in parallel.
2. At the start and end of every phase, run the **phase protocol** (§5.1). Tick the **Definition of Done** (§5.2) and the **mobile checklist** (§5.3) for every item. For work on a language, use the **tier checklist** (§5.4).
3. When an item is done:
   - tick it here and add short notes under it (what shipped, measured numbers, deviations, known issues), as in Phases 0–4;
   - commit with `feat(scope): …; Phase N item M done`.
4. If part of this plan turns out to be wrong (a licence, a browser limit, an unrealistic target), say so in the notes and change the plan. Never quietly work around it.
5. Open decisions for the owner are in §11. Ask before building anything that depends on one of them.

---

## 1. Where we are (Phases 0–4, done)

- **Languages.** 11 languages with 13 layouts:
  - Urdu: Phonetic, Standard and Roman.
  - Arabic, Farsi, Pashto, Sindhi, Punjabi (Shahmukhi), Saraiki, Balochi, Kashmiri.
  - Hindi (InScript) and Bangla (InScript).
- **Engine** (`packages/engine`):
  - physical keys, 4 layers, dead keys and long-press;
  - grapheme-aware editing;
  - CLDR and Keyman importers;
  - transliteration (weighted rules plus a dictionary beam search);
  - lexicon trie, next-word model and spell checker.
- **Urdu only:**
  - Roman Urdu (top-1 86.9 %, top-5 99.2 %);
  - a 100k-word list built from Urdu Wikipedia (CC BY-SA);
  - suggestions and spell check;
  - typing test and tutor;
  - four guides.
- **Site-wide:**
  - Nastaliq rendering;
  - export to .txt, .docx, PDF and image card;
  - emoji search in every page language;
  - InPage ↔ Unicode;
  - voice typing (Urdu, Arabic, Farsi, Hindi, Bangla);
  - printable cheat sheets;
  - PWA offline mode;
  - drafts.
- **Not done yet:**
  - deploy to the real domain (`PUBLIC_SITE_URL` still defaults to `https://likho.example`);
  - analytics;
  - font subsetting;
  - the Preact trial;
  - Lighthouse on real hosting.
- **Problems that will grow with 100 languages:**
  - **Every keyboard page bundles every layout.** `KeyboardApp.tsx` imports the whole registry from `@okb/layouts`.
  - **The service worker precaches every page.** That works at 30 pages but won't at 700.
  - **Cheat-sheet PDFs are committed to git.** They take 2 MB for 14 sheets and would take about 30 MB at 200.
  - **Phones have no real phone layout.** Punctuation keys are hidden instead, and there is no numbers/symbols page.
  - **Each language is hand-wired in TypeScript.** `LANGUAGES` and `RAW_LAYOUTS` in `packages/layouts/src/index.ts`, plus copy in `apps/web/src/content/languages.ts`.

---

## 2. Ground rules (every phase)

- **Copy behaviour, not code.** We may study what competitors do. We never copy their code, CSS, page text, images or data tables (Lexilogos' shortcut tables included). Facts such as "Alt+0233 types é" may be stated in our own words.
- **Clean data licences.** Use only sources whose licence allows a commercial, ad-supported site. For each source:
  - record it in the package README/SOURCES file with its URL, date and licence;
  - credit it in the footer when the licence asks for attribution;
  - see §8.
- **Privacy.** Typed text stays on the device. Some features send text: voice typing, AI assist, look-up links and "report a wrong word". Each of these:
  - says so before its first use;
  - runs only when the user asks.
- **Mobile first.** Design at 360 px wide, then scale up. Phones are 70 % of visitors.
- **Honest quality.** Every language feature has a measured number. Below target, the page labels it **Beta**; it is never hidden or overstated.
- **Language value.** A language gets a page only when we offer something the user's own keyboard doesn't. That leaves out plain-ASCII languages such as Indonesian or Swahili (see §11).
- **Original games.** Use genre ideas such as falling words or races. Never recreate a specific existing game.
- **URLs are permanent.** Existing URLs keep working (`/urdu`, `/urdu/roman`, `/urdu-typing-test`, …). A rename needs a redirect.

---

## 3. How we stand out (competitor map)

Each item's competitor check (§5.1) refreshes this table. Rows marked *(check)* are assumptions to verify in that phase.

| Competitor | What they do well | Their gap | Our answer |
|---|---|---|---|
| **Lexilogos** (keyboards, case converter) | About 200 scripts. Typing shortcuts (`e=` é, `c=` ç, `n=` ñ, `??` ¿). Dictionary and translate links. | Shortcuts must be learnt per site. The case converter is upper/lower only (checked 2026-10-31). No suggestions or spell check. Phone UX *(check)*. | The standard US-International dead keys people already know, an accent bar, and **smart accents** (type `como estas`, get `cómo estás`). Locale-aware case converter. A real phone keyboard. |
| **Branah** | 98 languages | No transliteration or suggestions for Urdu. No Nastaliq. The phone layout is chosen once at load (Phase 0 teardown). | Deep features per language, plus a phone keyboard as good as Gboard. |
| **English-to-Hindi sites** (easyhindityping and similar) | Phonetic Hindi typing with suggestions. Kruti Dev converters. Large Indian audience. | Mostly Hindi only. Many depend on an online service for each word, so offline doesn't work *(check)*. Heavy ads *(check)*. | Roman typing for 30+ South Asian languages, offline and private, with a measured accuracy number. |
| **Typing-test sites** (monkeytype, 10fastfingers, typing.com) | Polished tests, games and streaks | English/Latin first. Weak on Nastaliq, Indic shaping and phones *(check)*. | Script-correct scoring (graphemes, NFD, CPM for Thai/CJK) in 100+ languages, on phones too. |
| **Keyboard-tester sites** | Large search volume | Single-purpose *(check)* | A tester plus layout mapping, plus a Unicode inspector that shows ZWJ, ZWNJ and RLM. |
| **Case-converter sites** | Large search volume | English rules only *(check)* | Turkish İ/ı, German ß, Greek tonos, Dutch IJ, Irish prefixes |
| **Gboard / SwiftKey** (native) | The bar for mobile typing feel | Not on desktop. No export, image cards, InPage, cheat sheets or tests. | Match their feel on the web (Phase 5), and offer what they can't |

**Our position:** deep where our audience lives (South Asian and Arabic-script languages, with flagship features), broad everywhere else (110 languages, all with a good phone keyboard). Private, offline, and every tool works on a phone.

---

## 4. Roadmap at a glance

| Phase | Theme | Why in this order | Size |
|---|---|---|---|
| **5** | Mobile keyboard 2.0 (plus deploy and measure) | 70 % of visitors are on phones. Every later feature reuses this keyboard, so fix it once, before multiplying it by 100 languages. | L |
| **6** | Roman typing and smart typing for the 11 current languages | Our biggest differentiator, already proven on Urdu. The pages exist. "English to Hindi/Bangla/Arabic typing" are large searches. Phone users can type Roman on their own keyboard. | XL |
| **7** | 100-language platform, Latin toolkit, Wave 1 (14 European languages), case converter | Make every feature language-generic before adding languages in bulk. Covers the Lexilogos keyboards and English → Spanish/Italian typing. | XL |
| **8** | Learning hub (tests, tutor, games, daily challenge) and keyboard tester | Built generic, so every language added in Phase 9 gets it free. Large search volume and a retention loop. | L |
| **9** | Waves 2–4: reach about 110 languages | Mostly data work once Phases 7–8 are generic. Our audience first (South Asia), then global demand, then the long tail. | XXL (3 sub-phases) |
| **10** | Converters and text tools (Kruti Dev, Bijoy, Zawgyi, Shahmukhi ↔ Gurmukhi, …) | Each one is a stand-alone search page. | M |
| **11** | AI assist, accounts, extension, UI languages, monetisation | Needs a server and a budget. Builds on everything above. | L, ongoing |

Sizes are relative: Phase 4 was about M.

**Quick wins that may be pulled forward** if SEO pages need to launch sooner: the case converter (7.6) and the keyboard tester (8.3). Both stand alone and take a day or two each.

---

## 5. Checklists Claude follows

### 5.1 Phase protocol

**At the start of a phase**
- [ ] Re-read §2 (ground rules), the phase section, and `LANGUAGES.md` (once it exists).
- [ ] **Competitor check** for each item. Look at behaviour only:
  - Open the competitors named in §3 and in the item, at desktop size and at 360 px.
  - Write a 3–5 line **beat list** into the phase notes: what they do, what they miss, and what we will do better.
  - Update §3 if something changed.
- [ ] Confirm every data source and licence the phase needs **before** writing code that depends on it. Record them in §8 and the package's SOURCES/README.
- [ ] Check §11 for open decisions this phase needs, and ask the owner.

**For each item**
- [ ] Definition of Done (§5.2).
- [ ] Mobile checklist (§5.3) for any UI change.
- [ ] Tier checklist (§5.4) for any language work.
- [ ] One or more commits ending `Phase N item M done`.

**At the end of a phase**
- [ ] Full suite passes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. The e2e run covers desktop, Pixel 7, iPhone (WebKit) and a 360 px Android viewport.
- [ ] Lighthouse mobile on the deployed preview. Performance budgets hold (§6, item 5.7).
- [ ] **Beat-list review.** Every advantage we claimed is real and visible in the product. Drop any claim that isn't.
- [ ] Notes under the phase: what shipped, numbers, deviations and known issues. Mark the phase ✅ and commit `…; Phase N done`.

### 5.2 Definition of Done (every item)

**Works**
- [ ] On desktop and phones, in RTL and LTR.
- [ ] With every input the feature claims: a physical keyboard, our on-screen keyboard, and the phone's own keyboard (Gboard, iOS).
- [ ] Offline after the first visit, or the UI says why not (voice, AI).
- [ ] Typed text never leaves the device unless the user switched on a feature that says it will.

**Tested and measured**
- [ ] Unit tests for logic and component tests for UI states.
- [ ] e2e tests on desktop, Pixel 7 and iPhone.
- [ ] axe: 0 serious or critical issues.
- [ ] Language features are measured on an evaluation set, and the numbers go in the notes. Say so when rules were tuned on the same set.
- [ ] Code is split so pages that don't use it don't load it. Performance budgets still hold.
- [ ] No new dependency without checking its size, licence and upkeep. Prefer small code of our own, as with the .docx writer and the service worker.

**Content and SEO**
- [ ] Copy is original and the facts are checked. Every example runs through our own tool, as with the guides.
- [ ] Title, meta description, H1, canonical URL, JSON-LD and sitemap entry.
- [ ] Internal links from the relevant keyboard pages and from the home page.
- [ ] Data provenance: source, licence and date recorded, and footer credit when the licence asks for it.

**Hygiene**
- [ ] Lint, typecheck and the invisible-character check pass. Plan notes are updated.

### 5.3 Mobile checklist (every UI change)

- [ ] Designed at 360×640 first. No horizontal scroll at 320 px. Checked in landscape.
- [ ] Touch targets are at least 44×44 px. Keys may be narrower but are at least 40 px tall, with hit areas that extend into the gaps.
- [ ] Primary actions (Copy, Share) sit within thumb reach in the bottom half. Menus open as bottom sheets.
- [ ] Nothing covers the editor or the keyboard: no ads, banners or toasts. Toasts appear above the keyboard.
- [ ] Handles `visualViewport`, the OS keyboard and safe-area insets. Inputs use at least 16 px text, so iOS doesn't zoom on focus.
- [ ] Works with Gboard/iOS composition events when the phone's own keyboard is in use.
- [ ] A tap shows a visible response within 100 ms on a 4× CPU throttle.
- [ ] Respects reduced motion. Haptics and sounds are optional.

### 5.4 Language tiers and the per-language checklist

Every language declares a `tier` in its `language.json` (Phase 7). A **tier-gate test** checks that each required piece exists and that the latest evaluation numbers meet the targets. A language can't claim a tier it hasn't earned. `pnpm roster` writes the status table to `LANGUAGES.md`.

**Tier C: Keyboard** (every language)
- [ ] **Layouts.** Taken from an open source or a documented standard:
  - the licence is in `vendor/`;
  - our changes are listed in `source`;
  - output is NFC and the layout passes schema validation.
- [ ] **Tests.** A golden typing test and an alphabet-coverage test (unit), plus an e2e smoke test on desktop and phone.
- [ ] **Phone layout.** Generated or hand-tuned. Every character is reachable, directly or by long-press. A symbols page has the language's punctuation and digits.
- [ ] **Fonts.** The no-tofu test passes, `lang` and `dir` are correct, and the sample sentence renders.
- [ ] **Page.** An original intro and layout summary, plus:
  - a table of the special letters, generated from the data;
  - "how to type these without this site" (Windows, Mac, phone);
  - at least 4 FAQs;
  - a cheat sheet;
  - look-up links;
  - emoji names, if CLDR has the language.
- [ ] **Typing tutor.** Lessons generated from the layout.

**Tier B: Smart** (Tier C, plus)
- [ ] A licence-clean word list of at least 20k words, plus a next-word table, built by the pipeline. It stays within its size budget.
- [ ] Suggestions and spell check with per-language settings. Its misspelling set meets the targets.
- [ ] Non-Latin scripts: Roman typing whose evaluation set meets target, or the page says Beta.
- [ ] Latin scripts with diacritics: smart accents that meet target.
- [ ] A typing test with words and sentences.
- [ ] Voice typing, wherever the locale probe shows the browser returns this script.

**Tier A: Flagship** (Tier B, plus)
- [ ] A hand-tuned phone layout.
- [ ] Native-speaker review of the page copy and of 50 random Roman conversions. The owner arranges the reviewer.
- [ ] Held-out message test: fewer than 1 correction per 10 words.
- [ ] Guides for Windows, Mac, Android and iPhone.
- [ ] Game word sets and a daily challenge.
- [ ] Related converters, where any exist.

---

## 6. Phases

### Phase 5: Mobile keyboard 2.0 (size L)

**Why first:** 70 % of visitors are on phones, and every later feature runs on this keyboard.

**Stand-out bar:** it feels like a phone keyboard, not a web page.
- The editor and keyboard fill the screen like a messaging app.
- Every character is one tap or one slide away.
- The phone's own keyboard is a first-class choice, not a fallback.

- [ ] **5.1 Deploy and measure (baseline first).**
  - [ ] If the site isn't live on its domain yet:
    - deploy it and set `PUBLIC_SITE_URL`;
    - regenerate the cheat-sheet PDFs, because they print the site address;
    - run Lighthouse on real hosting (carried over from Phase 3).
  - [ ] Add privacy-friendly analytics with no cookies, and **never record typed text**. Events:
    - keyboard mode (on-screen or phone keyboard), layout, Copy, Share, Download;
    - voice start, picking a Roman candidate, errors.
    - Add a line about analytics to the privacy FAQ.
  - [ ] Field Web Vitals (LCP, INP, CLS) by device class, sent to analytics.
  - [ ] After 2 weeks, write the baseline into these notes:
    - phone share, top viewport widths and browsers;
    - LCP and INP at p75;
    - copies and shares per phone session;
    - on-screen keyboard vs phone-keyboard usage.
- [ ] **5.2 Phone-first page layout.**
  - [ ] **Compose mode on phones:**
    - the editor sits on top and the keyboard is docked at the bottom;
    - safe-area insets are respected;
    - the editor resizes with `visualViewport` (iOS URL bar, Android OS keyboard);
    - the page doesn't jump while you type.
  - [ ] SEO content stays below the editor and is reachable ("More about Urdu typing ↓").
  - [ ] **Sticky action row:**
    - a big Copy button;
    - Share, with WhatsApp first where available (`https://wa.me/?text=`);
    - Undo/Clear;
    - everything else in a **More** bottom sheet.
  - [ ] A "Copied" toast above the keyboard, and a **Copy and open WhatsApp** action.
- [ ] **5.3 Real phone layouts (schema and generator).**
  - [ ] Schema: an optional `mobile` block holding:
    - letter rows of key references, at most 11 keys per row;
    - a `symbols` page;
    - `digits` (native and Western).
  - [ ] Generator: builds the phone layout of any language from its desktop layout.
    - Keep every letter, ordered by frequency (from the word list when there is one).
    - Move rare letters into the long-press list of a related letter.
  - [ ] Hand-tuned overrides for Urdu, Arabic, Hindi and Bangla.
  - [ ] **Symbols page** (`?123`, `١٢٣`, `१२३`):
    - the language's punctuation first (۔ ، ؟ ؛ for Urdu, । ॥ for Hindi);
    - native and Western digits;
    - currency (₨ ₹ ৳ ﷼) and common symbols.
  - [ ] Test, for every layout: every character the desktop layout types can be reached on the phone layout.
- [ ] **5.4 Touch mechanics.**
  - [ ] A key-preview bubble above the finger, showing the enlarged glyph in the script's font.
  - [ ] Long-press: slide to an alternate and release to type it (no second tap). A small corner hint marks keys with alternates.
  - [ ] Slide on the space bar to move the caret. Slide left from Backspace to select words to delete. Backspace repeat speeds up to whole words after about 1.5 s.
  - [ ] Hit areas extend into the gaps between keys, so near misses go to the nearest key.
  - [ ] Optional haptic tick (Android `navigator.vibrate`; iOS has none) and an optional key sound, off by default.
  - [ ] Latency: a tap shows its glyph in the editor within 50 ms on a 4× CPU throttle. Pressing a key doesn't re-render the whole keyboard (measure with the React profiler).
- [ ] **5.5 Comfort settings**, remembered per device.
  - [ ] Keyboard height (S/M/L), a one-handed mode (left or right), a landscape layout, and wider or split keys on tablets.
  - [ ] Key label size, and a high-contrast keys option.
- [ ] **5.6 "Use my phone's keyboard" as a first-class mode.**
  - [ ] First visit on a phone: one screen with the choice "Tap keys here" or "Use my phone keyboard". For languages with Roman typing, the second option reads "type in English letters". The choice is remembered.
  - [ ] In phone-keyboard mode:
    - the suggestion bar sits just above the OS keyboard (`visualViewport`);
    - it works with Gboard, SwiftKey and iOS composition (`insertCompositionText`, `insertReplacementText`);
    - autocorrect and autocapitalize are off in Roman mode.
  - [ ] e2e tests that simulate composition events, as Gboard sends them.
- [ ] **5.7 Speed on low-end phones.**
  - [ ] **Each page ships only its own layouts.** Load the layout in the island instead of importing the whole registry. Add a test that fails if a keyboard page's JS grows when another language is added.
  - [ ] Try Preact (`preact/compat`). Keep it if every e2e test passes and it saves at least 30 KB gzipped.
  - [ ] Subset fonts per page with `unicode-range` (carried over from Phase 3).
  - [ ] **Budgets, enforced in CI:**
    - at most 90 KB gzipped of initial JS on keyboard pages;
    - CLS below 0.05.
  - [ ] **Field targets:** LCP p75 under 2.0 s and INP p75 under 150 ms on phones.
- [ ] **5.8 Install and share loop.**
  - [ ] An install prompt on Android after the 2nd visit or 3rd copy (`beforeinstallprompt`), and an "Add to Home Screen" hint sheet on iOS.
  - [ ] **Web Share Target** (installed PWA on Android): text shared into Likho from WhatsApp or any app opens in the editor. On a Roman layout it can be converted in one tap.
- [ ] **5.9 Phone testing.**
  - [ ] Add Playwright projects for iPhone 15 (WebKit) and a 360×640 Android viewport, and run every mobile spec on both.
  - [ ] Manual device pass, recorded in the notes:
    - browsers: Android Chrome, Samsung Internet, iOS Safari, iOS Chrome;
    - languages: Urdu, Hindi, Arabic;
    - in portrait and landscape.

**Exit**
- Mobile e2e passes on Pixel 7, iPhone 15 and 360 px.
- No overflow at 320 px.
- The CI budgets hold.
- Field LCP and INP meet their targets, or the gap is written down with a reason.
- **Hallway test**, which the owner runs with 5 people: write a 20-word Urdu message on a phone and share it to WhatsApp. Everyone finishes without help; record their times.
- Copies and shares per phone session are up against the 5.1 baseline.

---

### Phase 6: Roman typing and smart typing for every current language (size XL)

**Why now:** this feature is proven on Urdu, the pages already exist, and phone users can type English letters on their own keyboard.

**Stand-out bar:**
- every current language converts offline, with a published accuracy number;
- Arabizi digits (`3` ع, `7` ح) work;
- Persian gets correct ZWNJ;
- Hindi and Bangla match the chat spellings people actually use.

Page names, from the owner's table (title and H1; URL stays `/<lang>/roman`):

| Language | Page title | Example |
|---|---|---|
| Urdu | Roman Urdu to Urdu Keyboard (live) | `mera naam` → میرا نام |
| Arabic | English to Arabic Typing | `marhaba` → مرحبا |
| Farsi | Finglish to Persian Keyboard | `salam` → سلام |
| Pashto | Roman Pashto to Pashto | → پښتو |
| Sindhi | Roman Sindhi to Sindhi | → سنڌي |
| Punjabi (Shahmukhi) | Roman Punjabi to Shahmukhi | → پنجابی |
| Saraiki | Roman Saraiki to Saraiki | → سرائیکی |
| Balochi | Roman Balochi to Balochi | → بلوچی |
| Kashmiri | Roman Kashmiri to Kashmiri | → کٲشُر |
| Hindi | English to Hindi Typing | `namaste` → नमस्ते |
| Bangla | English to Bangla Typing | `ami` → আমি |

- [ ] **6.1 Word lists for every current language** (the dictionary pipeline goes multilingual).
  - [ ] `build --lang <code>` works on any Wikipedia dump. Each language gets its own normaliser:
    - Arabic: strip tatweel and harakat for lookup, and unify alef forms.
    - Farsi: ی/ک, with ZWNJ kept inside the word.
    - Hindi: nukta, and anusvara vs chandrabindu.
    - Bangla: khanda ta.
    - Sindhi, Pashto, Shahmukhi, Saraiki, Kashmiri, Balochi: their letter variants.
  - [ ] A second, conversational source for chat words, if its licence is confirmed (§8). Wikipedia alone lacks everyday words.
  - [ ] **Small or missing Wikipedias.** Saraiki and Kashmiri are small, and Balochi may have none (check). Fall back to:
    - rules;
    - words shared with Urdu or Farsi;
    - a hand-written list.
    - The tier stays honest.
  - [ ] Budget: at most 150 KB gzipped per language (words plus next-word table). Loaded lazily and cached for offline use.
- [ ] **6.2 Transliteration schemes.**
  - [ ] **Scheme inheritance** (`extends: "ur-roman"` plus differences) for Shahmukhi, Saraiki, Kashmiri, Balochi and Sindhi.
  - [ ] **Hindi:**
    - Hinglish chat spellings (`kya`, `hai`, `mein` में / `main` मैं);
    - schwa deletion, left to the dictionary beam;
    - ं vs ँ;
    - capital letters as hints (T ट, D ड, N ण, Sh ष).
  - [ ] **Bangla:** Bangladeshi and Indian chat spellings (`ami`, `tumi`, `kemon acho`), using our own rules.
  - [ ] **Arabic:**
    - English-letter spellings (`marhaba`);
    - the chat alphabet: 2 ء, 3 ع, 5 خ, 6 ط, 7 ح, with apostrophe forms (3' غ, 6' ظ, 7' خ);
    - regional variants for 8 and 9 offered as alternatives.
  - [ ] **Farsi (Finglish):**
    - kh خ, gh غ/ق, sh ش, zh ژ, ch چ;
    - **automatic ZWNJ**: `mikonam` → می‌کنم, `ketabha` → کتاب‌ها.
  - [ ] **Pashto:** ښ ږ ټ ډ ړ ڼ ځ څ ې ۍ, with common Roman conventions (x or sh, zh or g', ts, dz).
- [ ] **6.3 Evaluation sets (the quality gate).**
  - [ ] **Hindi, Bangla and Sindhi** (and a re-check of Urdu): test splits from the Google **Dakshina** romanisation lexicons (CC BY-SA 4.0, confirmed). Never tune on the test split.
  - [ ] **Arabic, Farsi, Pashto, Shahmukhi, Saraiki, Balochi and Kashmiri:** original sets written for this project:
    - at least 300 word pairs;
    - 20 held-out chat messages each;
    - native-speaker spot checks for Tier A languages (the owner arranges them).
  - [ ] **Targets:**
    - Hindi, Bangla, Arabic, Farsi, Shahmukhi, Pashto, Sindhi: top-1 ≥ 85 %, top-5 ≥ 97 %, fewer than 1 correction per 10 words in held-out messages.
    - Saraiki, Balochi, Kashmiri: top-1 ≥ 70 % and top-5 ≥ 90 %. Labelled Beta until they reach the higher bar.
  - [ ] `eval:<lang>` runs in CI and writes a results JSON that the tier gate reads.
- [ ] **6.4 Roman pages.**
  - [ ] Pages for all ten languages above (`/hindi/roman`, `/bangla/roman`, `/arabic/roman`, …), each with:
    - the example shown above the editor;
    - a spelling guide (like `RomanGuide`);
    - a cheat-sheet PDF for the Roman scheme.
  - [ ] Same keys as Urdu: Space converts, 1–6 pick, Esc keeps English. They work on our on-screen Latin keyboard and on the phone's own keyboard.
  - [ ] English words the user keeps go into the personal dictionary, so they aren't converted again.
  - [ ] **"Report a wrong word"** (opt-in, with a consent notice): sends only the Roman word and the chosen output, to feed the next rule update. Needs a tiny endpoint, or a `mailto` until one exists.
  - [ ] Default tab on `/hindi` and `/bangla`: see decision §11.1.
- [ ] **6.5 Reverse: script → Roman.**
  - [ ] "Urdu to Roman Urdu", "Hindi to English letters" and the same for each language. Two styles:
    - **Chat style**: the most common spelling attested in the evaluation data.
    - **Scholarly**: ISO 15919/IAST for Hindi, ALA-LC style for Arabic-script languages.
  - [ ] The copy says plainly that this changes the letters, not the meaning. Translation comes with AI assist (Phase 11).
- [ ] **6.6 Suggestions, correction and autocorrect for every current language.**
  - [ ] Per-language settings for `SpellChecker`:
    - sound-alike groups;
    - cheap vowel and hamza drops;
    - joinable words.
    - **Keyboard-neighbour costs are generated from the layout data**, both desktop and phone rows.
  - [ ] **Join and split corrections** (`buon giorno` → `buongiorno` in Phase 7): offered when the joined (or split) form is much more common.
  - [ ] Misspelling set per language: at least 40 misspellings and 500 correct words. Targets:
    - at least 90 % of misspellings flagged;
    - the right word in the top 3 for at least 90 %;
    - false flags under 1 %.
  - [ ] **Autocorrect on Space** for high-confidence fixes, as phones do. Backspace right after undoes it.
    - Off by default.
    - On by default only where the evaluation shows fewer than 1 % wrong replacements.
  - [ ] Completion and next-word suggestions on every layout of these languages, not just Urdu.
- [ ] **6.7 Wider voice typing.**
  - [ ] A locale probe on Chrome desktop, Android Chrome and Safari. Record which locales return text in the script we type, and publish the table in the notes.
  - [ ] Enable voice only where the probe passes. Add a dialect picker for Arabic (ar-SA, ar-EG, ar-AE, …).

**Exit**
- All 10 new Roman pages are live, each at its target or labelled Beta.
- Suggestions and spell check run in every current language that has a word list.
- The voice table is published.
- e2e passes for each Roman page on desktop and in both phone modes.

---

### Phase 7: Platform for 100 languages, Latin toolkit and Wave 1 (size XL)

**Why now:** every feature has to be language-generic before languages are added in bulk.

**Stand-out bar:**
- the page cost stays flat as languages are added;
- no language ever shows tofu (missing-glyph boxes);
- Latin languages get smart accents that type the accents for you, not shortcuts you must learn.

- [ ] **7.1 Language registry as data.**
  - [ ] One folder per language: `packages/layouts/languages/<slug>/`, holding:
    - `language.json` (lang, script, dir, fonts, layouts, voice locales, scheme, word list, tier);
    - the layouts;
    - phone-layout overrides.
  - [ ] Page copy moves to an Astro content collection, `src/content/languages/<slug>.md`, with a zod schema.
  - [ ] Migrate the 11 current languages. **Golden tests prove that no output or URL changed.**
  - [ ] Languages load per page (builds on 5.7). The bundle-growth test stays green.
  - [ ] The tier-gate test (§5.4) and `pnpm roster` → `LANGUAGES.md`.
- [ ] **7.2 Scripts and fonts.**
  - [ ] A script registry: ISO 15924 code → font stack (Noto, through fontsource), direction, digits, punctuation, whether the script has case, and whether letters join.
  - [ ] **No-tofu test:** every character any layout can type must be in the page's font. Read the font's cmap at build time.
  - [ ] Only the page's script fonts load, subset with `unicode-range`.
- [ ] **7.3 Importers at scale.**
  - [ ] CLDR 43 keyboards for every Windows layout we need.
  - [ ] The Keyman importer covers more of `.kmn`: stores with `any`/`index`, contexts, more deadkey forms. Layouts it can't express are **reported, never imported wrongly**.
  - [ ] Evaluate xkeyboard-config (X11 layouts) as a third source. Check its licence per file.
  - [ ] Add the ABNT2 (`IntlRo`) and JIS (`IntlYen`) keys to `keycodes.ts`.
  - [ ] An import report for each layout: source, licence, coverage and our changes.
- [ ] **7.4 Language picker and look-up.**
  - [ ] **Searchable picker:**
    - finds English and native names plus aliases (Farsi/Persian, Bangla/Bengali);
    - shows recent languages first;
    - groups languages by region;
    - opens as a full-screen sheet on phones.
  - [ ] **Home page:** suggests languages from `navigator.languages`, and lets you browse all of them by script or region.
  - [ ] **Look-up menu** on every keyboard (the Lexilogos "Search & Translation" idea):
    - Translate (Google, Bing or DeepL where they support the language);
    - Wiktionary;
    - web search.
    - It opens a new tab only on click and is labelled as leaving the site.
- [ ] **7.5 Latin toolkit** (Lexilogos keyboards, and the owner's English → Spanish/Italian typing).
  - [ ] **Default mode for Latin languages: "Easy accents".** Most people searching "French keyboard" have an English keyboard. The mode combines:
    - **QWERTY with US-International dead keys** (`'` `` ` `` `^` `"` `~`, and `'` + `c` → ç), the convention Windows and Linux users already know;
    - an **accent bar**: one tap for each of the language's special letters (Shift for capitals), on desktop and phone;
    - **smart accents**, the "English to Spanish typing" page title. Type plain letters, and Space adds the accent when the dictionary is sure (`cancion` → `canción`). **Ambiguous pairs** (`esta`/`está`, `e`/`è`, `como`/`cómo`) go to the candidate bar and are never changed automatically.
  - [ ] **Spanish ¿ ¡:** typing `?` or `!` at the end of a sentence adds `¿` or `¡` at its start, as one undo step. `hola como estas?` → `hola ¿cómo estás?` (with `cómo` picked from the bar). The owner's example also adds a comma after `hola`. That is grammar, so it goes to AI assist (11.1).
  - [ ] **Italian:** `perche` → `perché`, `citta` → `città`, and the join correction `buon giorno` → `buongiorno` (6.6).
  - [ ] **French typography option:** a narrow no-break space before `; : ! ?` and inside `« »`. On by default for fr-FR.
  - [ ] **National layouts:**
    - French AZERTY (and Belgian), German and Swiss QWERTZ;
    - Spanish (Spain and Latin America), Italian;
    - Portuguese (PT, and BR ABNT2);
    - Turkish Q and F;
    - Polish programmer; Czech, Hungarian, Romanian, Nordic.
  - [ ] Copy on each Latin page: how to type these letters without us (Windows Alt codes or US-International, Mac Option keys, long-press on phones), in our own words.
  - [ ] **Smart-accent evaluation, per language:**
    - Strip accents from 2,000 held-out Wikipedia sentences, then restore them.
    - Target: at least 97 % of accent-needing words restored correctly.
    - Ambiguous pairs must appear in the top 3.
- [ ] **7.6 Case converter** (`/case-converter`), better than Lexilogos' upper/lower.
  - [ ] **Modes:** UPPER, lower, Sentence case, Title Case, Capitalise Each Word, iNVERSE, alternating. Each is live as you type, with its own Copy button.
  - [ ] **Language-aware rules:**
    - Turkish and Azeri İ i / I ı;
    - German ß → SS (optional ẞ);
    - Greek all-caps drops the tonos, as Greek typography does, and lowercase uses final ς;
    - Dutch `IJ` in title case;
    - Irish prefixes (`an tAthair`);
    - title-case small words for en, fr, es, de, it and pt.
  - [ ] Works in any script. Scripts without case (Arabic, Devanagari, …) get a short note. Grapheme-aware counts of characters, words and lines.
- [ ] **7.7 Wave 1 languages (14):**
  - Spanish, French, Italian, German, Portuguese, Turkish;
  - Polish, Dutch, Romanian, Czech, Hungarian, Swedish, Catalan, Croatian.
  - Every one reaches Tier B. Target Tier A: Spanish, French, Italian, German, Portuguese, Turkish (word lists from Wikipedia, §8).

**Exit**
- 25 languages are live.
- The 11 original languages migrated with no change in output.
- The tier gate and the bundle-growth test pass.
- The no-tofu test passes everywhere.
- Smart accents meet their target in the Tier A Latin languages.
- The case converter's e2e tests cover the Turkish, Greek, German and Irish cases.

---

### Phase 8: Learning hub and keyboard tester (size L)

**Why now:** built once and generic, so every language added in Phase 9 gets tests, lessons and games automatically.

**Stand-out bar:**
- typing tests that score Nastaliq, Indic, Thai and CJK correctly;
- practice that works on phones;
- a keyboard tester that also checks layouts and invisible characters.

- [ ] **8.1 Typing test and tutor in every language.**
  - [ ] Generalise `TypingTest` and `TypingTutor`. Content comes from:
    - lessons generated from any layout, including phone layouts, plus "learn the Roman spellings" lessons for Roman schemes;
    - drill words from the word list;
    - sentences from **Tatoeba** (CC BY 2.0 FR, credited).
  - [ ] Sentences are filtered so they:
    - can be typed on the layout;
    - fall within a length range;
    - contain no offensive words (a filter list, plus a manual sample review for Tier A languages).
  - [ ] URLs: `/<slug>-typing-test` and `/<slug>-typing-tutor` (the Urdu URLs don't change), plus a `/typing` hub with the language picker.
  - [ ] **Script-correct scoring:**
    - compare graphemes in NFD (generalised from Urdu);
    - handle Indic conjuncts and vowel signs;
    - Korean counts syllables;
    - Thai and CJK use characters per minute (the norm for them); other languages use WPM.
  - [ ] Phone test mode (on-screen keys or the phone's own keyboard), with separate personal bests. A result card with the language name in its own script.
- [ ] **8.2 Practice and games** (original designs; §2).
  - [ ] **Daily challenge:**
    - one passage per language per day, seeded by the date, so it's the same for everyone;
    - a streak counter;
    - a share card ("Day 12 · 48 WPM · 97 %").
  - [ ] **Falling-words game.** Word sets come from frequency bands for each level. Playable on phones with the on-screen keyboard.
  - [ ] **Key-finder drill.** A letter appears and you tap or press its key. It's the fastest way to learn a layout on a phone.
  - [ ] **Ghost race** against your own personal best.
  - [ ] **Progress page:**
    - history per language;
    - an accuracy-by-key heatmap drawn on the keyboard;
    - drills generated for your weakest keys;
    - export and import as JSON.
    - Everything stays local (IndexedDB). Global leaderboards wait for accounts (11.3).
  - [ ] Badges for streaks and milestones, stored locally.
- [ ] **8.3 Keyboard tester** (`/keyboard-tester`, the owner's "Keyboard Layout Tester").
  - [ ] **On-screen board.** Physical keys light up as pressed, in ANSI, ISO, ABNT2 or JIS shape. Each press shows `key`, `code`, `location`, `repeat`, the modifiers and timing. A progress bar tracks "all keys tested".
  - [ ] **Fault checks:**
    - chatter: two presses less than 30 ms apart are flagged;
    - stuck keys;
    - rollover: how many held keys register at once.
  - [ ] **OS layout detection** through the Keyboard Map API (Chromium), otherwise inferred from `event.key`.
  - [ ] **Layout mapping:** pick any of our layouts and see, for each key, what it types next to what the OS types.
  - [ ] **Special-characters inspector:** paste text and see each character's code point, Unicode name, script, direction and normalisation.
    - Invisible characters (ZWJ, ZWNJ, RLM, NBSP) are highlighted.
    - Name data loads lazily, per Unicode block.
  - [ ] **On phones:** a multi-touch screen tester, plus the inspector.

**Exit**
- Test and tutor are live for every Tier B language or higher (at least 25).
- Games are live for the Tier A languages.
- The tester's e2e tests cover ISO and ABNT2 keys.
- axe and Lighthouse pass on every new page.

---

### Phase 9: Waves 2–4, reaching about 110 languages (size XXL, run as 9a, 9b and 9c)

**Why now:** Phases 7–8 made everything generic, so this phase is mostly data, engines for the special scripts, and copy.

**Stand-out bar:** "English to Tamil/Telugu/Marathi/Gujarati typing" pages with accuracy numbers. Real input methods for Korean, Japanese, Chinese and Vietnamese. Every language works on phones.

**Scaling work** (do it before 9a):
- [ ] **Cheat-sheet PDFs:** generate them during the deploy build and stop committing them.
- [ ] **Offline:** precache the app shell plus the pages the user has visited, and add a **"Save this language for offline"** button. Stop precaching every page.
- [ ] **Tests:** golden tests for every language stay in the unit tests. e2e runs a smoke test per language (load, then type the golden text on desktop and phone), with a full nightly e2e run.
- [ ] **Build:** split the sitemap by section. CI must stay under 10 minutes.
- [ ] **Emoji:** names and keywords for every new language that CLDR annotates, added automatically.

- [ ] **9a. Wave 2: South Asia and Arabic script** (our core audience, 23 languages).
  - [ ] **Languages:**
    - Indic: Punjabi (Gurmukhi), Marathi, Nepali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, Sinhala, Sanskrit, Konkani, Maithili;
    - Dhivehi;
    - Arabic script: Kurdish (Sorani), Uyghur, Dari, Hindko, Brahui, Shina, Khowar, Malay (Jawi).
  - [ ] **Roman typing:**
    - The Dakshina languages (Gujarati, Kannada, Malayalam, Marathi, Punjabi, Sinhala, Tamil, Telugu) use Dakshina evaluation sets.
    - Others use Aksharantar (licence split by data part; check, §8).
    - Page titles: "English to Tamil Typing" and so on.
  - [ ] **Standards:** InScript (CLDR), Tamil99, Nepali Traditional and Romanised, Sinhala Wijesekara, ITRANS and IAST for Sanskrit.
  - [ ] **Hindko, Brahui, Shina and Khowar:** only if an openly licensed layout exists, or we design one with a native speaker. Otherwise defer them and write down why.
- [ ] **9b. Wave 3: global majors** (23 languages).
  - [ ] **Languages:**
    - Cyrillic: Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Macedonian, Kazakh, Kyrgyz, Tajik, Mongolian;
    - Greek, Hebrew, Armenian, Georgian;
    - South-East Asia: Thai, Lao, Khmer, Burmese, Vietnamese;
    - East Asia: Korean, Japanese, Chinese (Simplified), Chinese (Traditional).
  - [ ] **Engines:**
    - **Korean:** Hangul 2-set composition, with a Backspace that removes one jamo at a time.
    - **Japanese:** romaji → kana. Kanji conversion only with a licence-clean dictionary (check Mozc's data, §8); otherwise ship kana only and say so.
    - **Chinese:** pinyin → hanzi with CC-CEDICT (CC BY-SA 4.0) plus Wikipedia frequencies. Accept toneless and tone-number input. Simplified ↔ Traditional through OpenCC data (Apache-2.0). A Zhuyin layout for Taiwan.
    - **Vietnamese:** Telex and VNI, with a choice of old or new tone placement.
    - **Roman → Cyrillic** ("translit") for Russian, Ukrainian and Bulgarian, plus a phonetic layout.
    - **Greek:** Greeklish → Greek. **Hebrew:** phonetic layout and niqqud.
    - **Thai** Kedmanee, **Khmer** NiDA, **Burmese** Unicode (Zawgyi conversion in Phase 10).
- [ ] **9c. Wave 4: long tail to about 110** (40 languages, plus special keyboards).
  - [ ] **Latin:**
    - Europe: Slovak, Slovenian, Albanian, Lithuanian, Latvian, Estonian, Finnish, Norwegian, Danish, Icelandic, Faroese, Irish, Welsh, Scottish Gaelic, Maltese, Galician, Esperanto, Latin, Afrikaans;
    - Turkic and Kurdish: Azerbaijani, Turkmen, Uzbek, Kurdish (Kurmanji);
    - Africa and the Pacific: Yoruba, Igbo, Hausa, Wolof, Hawaiian, Māori.
  - [ ] **Other scripts:**
    - Amharic and Tigrinya: Ge'ez, with syllable input from Roman letters;
    - Tibetan, Syriac, Yiddish;
    - Cherokee and Inuktitut: syllabaries;
    - Santali: Ol Chiki;
    - Bodo: Devanagari;
    - Tatar and Bashkir.
  - [ ] **Special keyboards** (not counted as languages):
    - IPA;
    - Quranic Arabic, with full tashkeel;
    - Arabic romanisation (ā ḥ ṣ ʿ ʾ);
    - pinyin with tone marks.

**Exit**
- At least 100 languages at Tier C or above, at least 50 at Tier B or above, and about 15 at Tier A. `LANGUAGES.md` is published.
- The no-tofu test and axe pass on every page.
- Build and CI times stay within budget.
- Per-page JS is flat.

---

### Phase 10: Converters and text tools (size M)

**Why now:** each converter is a stand-alone search page for an audience we already serve.

**Stand-out bar:**
- conversions are checked against two independent references, as InPage was;
- nothing is uploaded;
- every tool works on a phone.

- [ ] **10.1 Legacy-font converters.**
  - [ ] Kruti Dev ↔ Unicode (Hindi; a very large search), then Chanakya.
  - [ ] Bijoy ↔ Unicode (Bangla; Bangladesh).
  - [ ] Zawgyi ↔ Unicode (Burmese), with automatic detection (check Google myanmar-tools, Apache-2.0).
  - [ ] Each one follows the InPage method:
    - tables built from two independent references with clean licences;
    - round-trip tests;
    - unknown codes are counted and shown to the user.
- [ ] **10.2 Script converters.**
  - [ ] Shahmukhi ↔ Gurmukhi, with dictionary help for vowels.
  - [ ] Hindi ↔ Urdu (Hindustani), with dictionary help. Show its quality number.
  - [ ] Serbian Cyrillic ↔ Latin.
  - [ ] Kazakh and Uzbek Cyrillic ↔ Latin. Check which official alphabet version is current.
- [ ] **10.3 Text tools.**
  - [ ] **Diacritics remover:** Arabic and Urdu harakat, Hebrew niqqud, Latin accents.
  - [ ] **Digit converter:** ٠١٢ / ۰۱۲ / ०१२ / 012.
  - [ ] **Number to words** in Urdu, Hindi, Arabic and Bangla (cheque writing, with lakh and crore).
  - [ ] **Word and character counter** for all scripts, grapheme-aware.
  - [ ] **"Fix Urdu/Arabic text copied from a PDF":** turn presentation forms back into normal letters and undo reversed order. This is a common pain point.
- [ ] Each tool:
  - links from the relevant keyboard pages;
  - is in the sitemap;
  - gets e2e and axe tests on desktop and phone.

**Exit**
- Every converter matches its reference outputs on its test corpus.
- Every tool is linked and indexed.

---

### Phase 11: AI assist, reach and revenue (size L, ongoing)

- [ ] **11.1 AI assist** (opt-in; text goes through our server proxy to the Claude API; use the `claude-api` skill to choose models and set up caching).
  - [ ] **Features:**
    - translate (the real "Hindi to English");
    - fix grammar and spelling in whole sentences;
    - add diacritics (اعراب, tashkeel, niqqud);
    - add punctuation (the comma in `hola, ¿cómo estás?`);
    - whole-sentence Roman conversion when the rules are unsure;
    - rewrite the tone.
  - [ ] **Safeguards:**
    - a clear notice that text is sent;
    - rate limits and a monthly cost cap;
    - typed text is never logged.
- [ ] **11.2 UI in more languages.** Urdu, Hindi, Arabic, Bangla, Spanish, French, Portuguese, Farsi and Turkish, plus `hreflang` (deferred since Phase 1).
- [ ] **11.3 Optional accounts and sync:**
  - drafts, personal dictionary and typing progress;
  - global leaderboards with an anti-cheat check on keystroke timing.
- [ ] **11.4 Browser extension** (Chrome, Firefox, Edge): Roman → script in any text box, built on `packages/engine`.
- [ ] **11.5 Embeddable widget** and a classroom mode for schools.
- [ ] **11.6 Experiment:** glide (swipe) typing on the on-screen keyboard for Tier A languages, decoding the swipe path against the word list.
- [ ] **11.7 Monetisation:**
  - **Ads:** fixed slots with no layout shift. Never over the editor or keyboard, and never between them on phones.
  - **Pro tier:** no ads, an AI assist quota, and sync.

---

## 7. Language roster (about 110)

The target tier for each language is decided by data after Phase 5 analytics. The starting proposal is below. ★ marks a Tier A candidate.

| Group | Languages | Phase |
|---|---|---|
| Current (11) | Urdu ★, Hindi ★, Bangla ★, Arabic ★, Farsi ★, Punjabi (Shahmukhi) ★, Pashto ★, Sindhi ★, Saraiki, Balochi, Kashmiri | 6 |
| Wave 1 (14) | Spanish ★, French ★, Italian ★, German ★, Portuguese ★, Turkish ★, Polish, Dutch, Romanian, Czech, Hungarian, Swedish, Catalan, Croatian | 7 |
| Wave 2 (23) | Punjabi (Gurmukhi), Marathi, Nepali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, Sinhala, Sanskrit, Konkani, Maithili, Dhivehi, Kurdish (Sorani), Uyghur, Dari, Hindko, Brahui, Shina, Khowar, Malay (Jawi) | 9a |
| Wave 3 (23) | Russian, Ukrainian, Belarusian, Bulgarian, Serbian, Macedonian, Kazakh, Kyrgyz, Tajik, Mongolian, Greek, Hebrew, Armenian, Georgian, Thai, Lao, Khmer, Burmese, Vietnamese, Korean, Japanese, Chinese (Simplified), Chinese (Traditional) | 9b |
| Wave 4 (40) | Slovak, Slovenian, Albanian, Lithuanian, Latvian, Estonian, Finnish, Norwegian, Danish, Icelandic, Faroese, Irish, Welsh, Scottish Gaelic, Maltese, Galician, Esperanto, Latin, Afrikaans, Azerbaijani, Turkmen, Uzbek, Kurdish (Kurmanji), Yoruba, Igbo, Hausa, Wolof, Hawaiian, Māori, Amharic, Tigrinya, Tibetan, Syriac, Yiddish, Cherokee, Inuktitut, Santali, Tatar, Bashkir, Bodo | 9c |
| Special keyboards | IPA, Quranic Arabic, Arabic romanisation, pinyin tones | 9c |

That makes 111 languages. Some Wave 2 languages may slip (Hindko, Brahui, Shina, Khowar) if no open layout exists. Wave 4 has room to add Bhojpuri, Dogri or Manipuri (Meetei Mayek) instead.

---

## 8. Data sources and licences

Check each one again at the start of the phase that uses it. "Confirmed" means checked on 2026-10-31.

| Source | Use | Licence | Status |
|---|---|---|---|
| Wikipedia dumps (per language) | Word lists, next-word tables, smart-accent evaluation | CC BY-SA 4.0 (credit; derived lists are CC BY-SA) | In use (Urdu) |
| Google Dakshina | Roman evaluation and attested spellings for 12 South Asian languages | CC BY-SA 4.0 | Confirmed (repo README) |
| AI4Bharat Aksharantar | Roman evaluation for other Indic languages | Split: CC BY for the manually collected part, CC0 for the mined part (AI4Bharat page) | Check the Hugging Face card and the IndicXlit repo before use |
| Tatoeba | Typing-test sentences | CC BY 2.0 FR (some CC0); credit with a link | Confirmed |
| Unicode CLDR 43 | Keyboards, emoji names | Unicode License v3 | In use |
| SIL Keyman keyboards | Layouts | Mostly MIT (per keyboard) | In use; check each one |
| xkeyboard-config | Latin and Cyrillic national layouts | X11/MIT-style, varies by file | Check per file |
| CC-CEDICT | Pinyin → hanzi | CC BY-SA 4.0 | Check at 9b |
| OpenCC data | Simplified ↔ Traditional | Apache-2.0 | Check at 9b |
| Mozc dictionary data | Kana → kanji | Mixed | **Check carefully**; ship kana only if unclear |
| Google myanmar-tools | Zawgyi detection | Apache-2.0 | Check at 10.1 |
| Subtitle-based frequency lists | Chat words | Unclear (the underlying subtitles' rights) | **Avoid** unless the licence is clear |
| Leipzig Corpora Collection | — | Sources conflict (CC BY vs CC BY-NC) | **Don't use** without written confirmation (the old plan listed it) |
| Hunspell dictionaries | — | GPL/LGPL/MPL, varies | **Don't ship** in the client bundle unless the licence fits; our own spell checker covers this |

---

## 9. Success metrics

| Metric | Target |
|---|---|
| Phone LCP p75 / INP p75 (field) | < 2.0 s / < 150 ms |
| Initial JS on keyboard pages | ≤ 90 KB gzipped, flat as languages are added |
| Copies and shares per phone session | Up against the Phase 5 baseline (set the target number once the baseline is known) |
| Languages at Tier C / B / A | ≥ 100 / ≥ 50 / ≈ 15 at the end of Phase 9 |
| Roman top-1 (Tier A non-Latin) | ≥ 85 % |
| Smart accents (Tier A Latin) | ≥ 97 % of accent-needing words |
| Spell check false flags | < 1 % |
| 7-day returning users | ≥ 25 % (daily challenge and streaks help here) |
| Rankings | Top 5 for "<language> keyboard" and "English to <language> typing" in each Tier A language within 6 months of launch |

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| 100 thin pages hurt SEO and trust | Tiers and the tier gate. Minimum content for every page, original copy, and a real feature on each page (§2 "Language value"). |
| The bundle grows with each language | Per-page layout loading, plus the bundle-growth test (5.7, 7.1) |
| Build, test and precache sizes explode | PDFs built at deploy, precache only visited pages, e2e smoke per language plus a nightly full run (Phase 9 scaling work) |
| A licence trap in a dataset | §8 is checked at the start of each phase, and nothing ships without a recorded licence |
| Low quality in low-resource languages | Beta labels, published numbers, "Report a wrong word", native-speaker review for Tier A |
| Voice depends on browser vendors (none in Firefox; Android quirks) | The locale probe, voice enabled only where verified, honest UI copy |
| iOS limits (no vibration, WebKit quirks) | iPhone e2e project, manual device pass every phase |
| CJK dictionaries are large | Lazy loading per language, cached offline, a size budget per language |
| Mobile ads covering the keyboard | Ad rules in 11.7 and the mobile checklist §5.3 |

---

## 11. Decisions for the owner

1. **Default tab on `/hindi` and `/bangla`.** Recommendation: make **English → Hindi/Bangla (Roman)** the default, because that is what most visitors search for, and keep InScript as a tab. Check against analytics after Phase 5.
2. **Domain and analytics.** Which domain goes in `PUBLIC_SITE_URL`, and which privacy-friendly analytics tool to use (needed for 5.1).
3. **Tier A list.** Confirm the ★ languages in §7 once two weeks of analytics are in.
4. **Native-speaker reviewers** for Tier A languages, paid or volunteer (needed from Phase 6).
5. **Plain-ASCII languages** (Indonesian, Swahili, Tagalog, …). Recommendation: leave them out of the count of 100, because a keyboard adds nothing for them.
6. **AI budget and Pro pricing** (Phase 11).
