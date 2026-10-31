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
  - analytics (code done in Phase 5; needs an endpoint);
  - font subsetting (moved to Phase 7, item 7.2);
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

### Phase 5: Mobile keyboard 2.0 (size L) ✅ (owner follow-ups listed under "Open")

**Why first:** 70 % of visitors are on phones, and every later feature runs on this keyboard.

**Stand-out bar:** it feels like a phone keyboard, not a web page.
- The editor and keyboard fill the screen like a messaging app.
- Every character is one tap or one slide away.
- The phone's own keyboard is a first-class choice, not a fallback.

**Beat list** (from the Phase 0 teardown and §3; no competitor was re-opened this phase):
- Branah picks a fixed layout at load and has no symbols page; we build a phone layout for every layout and show the language's own digits, punctuation and currency on `?123`.
- Web keyboards shrink the desktop rows; ours has Gboard-style touches: key preview, slide-to-alternate, space-bar caret, Backspace word delete.
- None we know of offers the phone's own keyboard *with* Roman conversion; we ask on the first visit and convert Gboard/iOS compositions.

- [ ] **5.1 Deploy and measure (baseline first).** Code done; deploy and baseline wait on the owner.
  - [ ] Deploy and set `PUBLIC_SITE_URL`, then Lighthouse on real hosting. **Open:** the domain is still the `likho.example` placeholder (owner decision, §11). PDFs are now built with the site (see 5.7), so they pick up the real address on the first deploy.
  - [x] Privacy-friendly analytics, provider-agnostic: `src/analytics/track.ts` posts small JSON events with `sendBeacon` to `PUBLIC_ANALYTICS_ENDPOINT`; with no endpoint set nothing is sent. No cookies, no IDs, and property values must match `^[\w.:/-]{1,40}$`, so typed text cannot be sent by mistake (unit-tested). Events: `pageview`, `keyboard` (layout, on-screen or phone keyboard), `layout`, `copy`, `share`, `download`, `voice`, `pick`, `convertAll`, `input`, `install`.
  - [x] Field Web Vitals (`src/analytics/vitals.ts`): LCP, CLS (session windows) and INP (longest interaction), sent on page hide with the device class (phone/tablet/desktop).
  - [ ] Baseline after 2 weeks of real traffic. **Open:** needs the deploy and an endpoint.
- [x] **5.2 Phone-first page layout.**
  - [x] Compose mode: the suggestion bar, emoji panel and keyboard sit in a dock that sticks to the bottom of the screen (`phone:sticky`), above the OS keyboard (`--kb-inset` from `visualViewport`) and the safe area. The viewport uses `interactive-widget=resizes-content` and `viewport-fit=cover`. e2e: the dock stays on screen after scrolling, on /urdu, /arabic, /hindi, /urdu/roman and /bangla.
  - [x] On phones the intro is clipped to two lines, with a "More about … typing ↓" link to the page copy.
  - [x] Phone action row: a big Copy button, Share (the native share sheet, else WhatsApp), Undo, Emoji, Voice and **More**. More is a bottom sheet with Send to WhatsApp, the downloads, Redo, Clear, text size, font, drafts, the phone-keyboard switch and keyboard settings.
  - [x] Toast above the keyboard ("Copied to clipboard"), hidden from screen readers; the status line remains the screen-reader announcement.
- [x] **5.3 Real phone layouts (schema and generator).**
  - [x] Schema: optional `mobile: { rows, longpress }` (2–4 rows of at most 11 key codes). The symbols page and digits are derived, not stored. That is one place less to go wrong per layout.
  - [x] Generator (`packages/engine/src/layout/phone.ts`). It keeps the QWERTY letter rows, so muscle memory from the desktop layout carries over. Letter keys from the number and punctuation rows move into the shortest rows (rows hold at most 11/11/10). Keys that still don't fit become long-press alternates of their neighbour. **Deviation:** the plan said "ordered by frequency". Keeping key positions was better for people who already know the layout, and no current layout needed frequency to decide anything.
  - [x] Hand-tuned: Arabic (ج د ك ط stay on the letter rows, ئ under ء, لا/لآ under ل). Urdu Phonetic's generated rows are already the hand-tuned answer (test pins `قوعرتےءیہپ / اسدفگحجکل / زشچطبنم`). **Deferred:** Hindi and Bangla. Their pages default to Roman typing in Phase 6, so InScript's phone rows matter less; tune them then.
  - [x] Symbols page (`?۱۲۳`, `?१२३` …): native digits first (found on any layer; InScript has them on AltGr), then Western digits, then the language's punctuation (۔ ، ؟ ؛, । ॥), its currency (₨ ₹ ৳ ؋ ﷼) and € £ ¥, then ASCII symbols. Pages of 3 rows of 10, with a 1/2 page key.
  - [x] Test for every layout (13): every desktop character is reachable on the phone layout, rows fit, keys are unique (`packages/layouts/test/phone.test.ts`).
- [x] **5.4 Touch mechanics.**
  - [x] Key preview bubble in the script's font, for touch and pen only.
  - [x] Long-press: slide to an alternate and release (existing). A corner hint on phone keys shows the first alternate.
  - [x] Space-bar slide moves the caret by grapheme (RTL-aware). Backspace slide selects whole words and deletes them on release. Held Backspace repeats, then deletes whole words after 1.5 s.
  - [x] Hit areas reach half a gap past each key edge, so a tap between keys goes to the nearer one.
  - [x] Optional haptic tick (on by default where `navigator.vibrate` exists) and key sound (off by default).
  - [x] Latency (`e2e/perf.spec.ts`, Pixel 7 profile, 4× CPU throttle, run on its own after the other tests): median **19 ms** from pointer press to the frame showing the letter, slowest of 10 taps ~70 ms (target 50 ms). The first measurement was ~64 ms: corrections for a word with no completions were looked up inside the tap. Suggestions now refresh after the next paint, and quick taps share one lookup. **Not done:** profiling whether a key press re-renders the whole keyboard. Latency is within target, so this waits for Phase 7, when keyboards get bigger.
- [x] **5.5 Comfort settings**, remembered per device (More → Keyboard settings).
  - [x] Key height S/M/L, one-handed mode (left/right), large letters, vibration, key sound. **Landscape** keeps the phone layout with lower keys (the `short:` variant; e2e). **Tablets** (640 px and wider) get the full desktop keyboard, which already has room. **Deviation:** no split keyboard; revisit if tablet analytics show demand.
  - [x] High contrast: the site's existing Contrast theme covers the keys; there is no separate key-only switch.
- [x] **5.6 "Use my phone's keyboard" as a first-class mode.**
  - [x] First phone visit asks "How would you like to type?": **Tap the keys below** or **Use my phone keyboard** (on Roman layouts: "…(English letters)"). The choice is remembered and can be changed in More.
  - [x] In that mode the dock (with the suggestion bar) sits above the OS keyboard. Roman conversion handles `insertText`, `insertCompositionText` and `insertReplacementText`, never edits while `isComposing`, and skips when text is selected. Autocorrect, autocapitalize and spellcheck are off on the editor.
  - [x] Pasting Roman text offers **Convert all**. Unit and e2e tests simulate Gboard-style compositions.
- [x] **5.7 Speed on low-end phones.**
  - [x] Each page ships only its own layouts. The page passes a `LanguageBundle` (its language, layouts and Roman scheme) to the island, and client components may import `@okb/layouts` only for types (`src/client-imports.test.ts` fails otherwise). Before: all 13 layouts in a 17.5 KB gz chunk on every keyboard page.
  - [x] **Preact (`preact/compat`) adopted.** Initial JS per keyboard page went from **100.9 KB to 42.5 KB gzipped** (−58 KB, bar was −30 KB). All e2e and unit tests pass on Preact. Unit tests run on Preact too (aliases in `vitest.config.ts`, `@testing-library/preact`). `lucide-react` is bundled for SSR so its `react` imports resolve to compat.
  - [ ] Font subsetting with `unicode-range`. **Moved to Phase 7 item 7.2** (scripts and fonts), which already plans per-page `unicode-range` subsets.
  - [x] Budgets in CI: `pnpm --filter @okb/web check:budgets` (≤ 90 KB gz initial JS on every keyboard page, today 42.5 KB). CLS on /urdu at 4× throttle: **0.011** (budget 0.05, `e2e/perf.spec.ts`).
  - [ ] Field targets (LCP p75 < 2.0 s, INP p75 < 150 ms). **Open:** needs field data after the deploy.
  - Also: cheat-sheet PDFs are now generated by `pnpm build` into `dist/` instead of being committed (pulled forward from Phase 9; `SKIP_PDFS=1` skips them in the CI check job).
- [x] **5.8 Install and share loop.**
  - [x] Install offer from the 2nd visit or 3rd copy: Android uses `beforeinstallprompt`; iOS Safari gets an "Add to Home Screen" hint. "Not now" is remembered.
  - [x] Web Share Target (`/share`, noindex): shared text opens in a new draft on the last-used language, and Roman text can be converted in one tap (e2e).
- [x] **5.9 Phone testing.**
  - [x] Playwright projects: `android-360` (360×640) runs the phone spec. `iphone` (iPhone 15, WebKit) runs only in CI (`CI` or `E2E_WEBKIT`), because WebKit's system libraries can't be installed on the dev machine without sudo. CI installs Chromium and WebKit with their dependencies.
  - [ ] Manual device pass (Android Chrome, Samsung Internet, iOS Safari and Chrome; Urdu, Hindi, Arabic; portrait and landscape). **Open:** needs real devices; owner.

**Exit**
- [x] Mobile e2e passes on Pixel 7 and 360 px (214 tests: 176 passed, 38 skipped by design). iPhone 15 runs in CI; not yet seen green locally.
- [x] No overflow at 320 px: the layout switcher drops native names below 400 px (e2e).
- [x] CI budgets hold (42.5 KB, CLS 0.011).
- [ ] Field LCP/INP. **Open:** after deploy.
- [ ] Hallway test (owner, 5 people, 20-word Urdu message shared to WhatsApp). **Open.**
- [ ] Copies and shares per phone session against the 5.1 baseline. **Open:** after deploy.

**Known issues**
- Suggestions appear one frame after the letter (by design, see 5.4).
- On a 320 px screen, three native layout names don't fit, so only the English names show.

---

### Phase 6: Roman typing and smart typing for every current language (size XL) ✅ (owner follow-ups listed under "Open")

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

**Beat list** (from §3; no competitor was re-opened this phase):
- Romanised typing sites (Google Input Tools-style pages, Lexilogos) convert online, or by fixed rules with no word list; ours runs offline, ranks by a word list and publishes its accuracy per language.
- Arabizi pages rarely accept the chat digits with apostrophe forms (3' غ) or regional 8/9; ours does, and offers both readings.
- Finglish converters leave out the half-space; ours writes می‌کنم and کتاب‌ها.
- No competitor we know of offers script → Roman in chat style, or a spell checker for Pashto, Shahmukhi or Saraiki.

- [x] **6.1 Word lists for every current language.** Details, sources and stats: `packages/dictionaries/README.md`.
  - [x] `build --lang <code>` builds from any Wikipedia dump (several parts comma-separated). Per-language normalisers now live in `@okb/engine/normalize`, shared by the build and the browser: Arabic drops tatweel and harakat and keeps alef forms apart (the spell checker accepts hamza-less alef as a variant); Persian keeps ZWNJ inside words; Hindi and Bangla compose nukta forms; the Urdu-family languages keep their own letters.
  - [ ] A second, conversational source. **Not done:** no licence-clean chat corpus was found. This is the main reason Arabic and Persian stay Beta (formal word lists against colloquial chat).
  - [x] Small Wikipedias: Kashmiri (21,396 words) and Saraiki (70,705) are built from their own Wikipedias. Balochi has none: Roman typing runs on rules alone, with no suggestions or spell check, and the page says so. **Not done:** borrowing words from Urdu or Farsi.
  - [x] Budget: a compact front-coded format (`likho-dict 1`, `@okb/engine/compact`), at most 150 KB gzipped per language (40,000 words, or 35,000 for Hindi and Bangla, plus next words for the 3,000 commonest). The site fetches it on the first keystroke; the service worker caches it for offline use.
- [x] **6.2 Transliteration schemes.**
  - [x] Scheme inheritance (`packages/layouts/src/translit/extend.ts`) for Shahmukhi, Saraiki, Kashmiri, Balochi, Sindhi and Pashto.
  - [x] Hindi: Hinglish chat spellings, schwa deletion by the dictionary beam, ं/ँ, and capital hints (T ट, D ड, N ण, Sh ष).
  - [x] Bangla: Bangladeshi and Indian chat spellings, with our own rules.
  - [x] Arabic: English-letter spellings, the chat digits with apostrophe forms, and both regional readings of 8 and 9.
  - [x] Farsi: kh gh sh zh ch, plus automatic ZWNJ.
  - [x] Pashto: ښ ږ ټ ډ ړ ڼ ځ څ ې ۍ, with x/sh, zh/g', ts, dz.
  - New engine options: `doubledCost`, `letters` (digits as letters) and `splitCost` (prefer kh as one letter over k + h).
- [x] **6.3 Evaluation sets.** `pnpm --filter @okb/dictionaries eval` scores the test split, then writes and checks `results/<scheme>.json`, which the pages publish. Rules were tuned only on dev splits, except Urdu (its set predates the split, and the README says so).

  | Scheme | Test set | Top-1 | Top-5 | Corrections / 10 words | Status |
  |---|---|---|---|---|---|
  | Urdu | Likho, 663 pairs | 87.8 % | 99.2 % | 0.50 | at target |
  | Hindi | Dakshina | 42.5 % | 52.0 % | 1.86 | Beta |
  | Bangla | Dakshina | 39.4 % | 46.5 % | 3.00 | Beta |
  | Sindhi | Dakshina | 54.6 % | 75.6 % | 3.16 | Beta |
  | Arabic | Likho | 68.7 % | 87.8 % | 3.45 | Beta |
  | Farsi | Likho | 81.4 % | 94.3 % | 1.21 | Beta |
  | Pashto | Likho, 219 pairs | 66.2 % | 83.6 % | 2.78 | Beta |
  | Shahmukhi | Likho, 167 pairs | 86.2 % | 98.2 % | 1.30 | Beta |
  | Saraiki | Likho, 124 pairs | 71.0 % | 93.5 % | 2.03 | Beta |
  | Balochi | Likho, 81 pairs | 53.1 % | 79.0 % | 4.38 | Beta |
  | Kashmiri | Likho, 81 pairs | 61.7 % | 80.2 % | 4.07 | Beta |

  - **Deviations:** only Urdu meets its target. Dakshina samples reach deep into rare words: only about half the Hindi test words are among the 35,000 shipped, which caps top-5 at about 52 %. The Likho sets for Pashto, Shahmukhi, Saraiki, Balochi and Kashmiri are smaller than the 300 pairs planned; the pages say so. None of the Likho sets has had a native-speaker check yet. **Open (owner):** arrange spot checks.
  - [ ] CI tier gate. The eval runs in `pnpm test` and fails if a non-Beta language drops below target or the published numbers go stale. The tier-gate test itself comes with `language.json` in Phase 7.
- [x] **6.4 Roman pages.** Pages for all ten new schemes, each with the example above the editor (run through the scheme and the shipped word list by `src/content/roman.test.ts`), a spelling guide, a cheat-sheet PDF, the accuracy table and a Beta badge where it applies.
  - [x] Space converts, 1–6 pick, Esc keeps English, on our on-screen keys and on the phone's own keyboard (`e2e/roman.spec.ts`: every page, desktop and both phone modes).
  - [x] Kept English words are remembered per language (`kept:<slug>`); picking a conversion for one makes it convert again.
  - [x] "Report a wrong word": a `mailto` link to `words@likho.example`, which sends only what the user writes. **Open:** an endpoint, and the real address once the domain is chosen.
  - [x] /hindi and /bangla open on Roman typing (decision §11.1); InScript moved to `/hindi/inscript` and `/bangla/inscript`.
- [x] **6.5 Script → Roman** (`/<lang>/to-roman`, 11 pages, `@okb/engine/romanize`). Chat style uses the commonest attested spelling (`data/<code>/chat.tsv`, taken from the dev splits only, so the test splits stay unseen), then letter rules. For Arabic-script text, a vowelled spelling is confirmed by converting it back. Scholarly style follows ISO 15919 for Hindi and Bangla, and ALA-LC for Arabic script. The copy says it changes the letters, not the meaning.
- [x] **6.6 Suggestions, spell check and autocorrect for every current language with a word list.**
  - [x] Per-language spelling rules (`@okb/engine/spelling`): sound-alike groups, cheap vowel and hamza drops, letters that don't join (for run-together words), and accepted variants (Arabic without hamza on the alef, ه/ة, ي/ى). Keyboard-neighbour pairs are generated from each language's layouts, desktop and phone rows both.
  - [x] Join and split: run-together words were already split. The suggestion bar now also offers the joined word when a stray space splits one (کیو نکہ → کیونکہ).
  - [x] Misspelling sets and evaluation (`test/spell-langs.test.ts`, results in `results/spelling.json`):

    | Language | Flagged | Right word in top 3 | False flags | Wrong autocorrections | Spell check | Autocorrect |
    |---|---|---|---|---|---|---|
    | Urdu | 100 % | 100 % | 0.4 % of 808 | 0.0 % | on | on |
    | Pashto | 98 % | 100 % | 0.0 % of 299 | 0.0 % | on | offered, off |
    | Shahmukhi | 98 % | 96 % | 0.4 % of 249 | 0.0 % | on | offered, off |
    | Saraiki | 100 % | 94 % | 0.5 % of 213 | 0.0 % | on | offered, off |
    | Farsi | 92 % | 96 % | 4.7 % of 344 | 0.8 % | Beta, off | no |
    | Arabic | 100 % | 98 % | 7.5 % of 359 | 0.7 % | Beta, off | no |
    | Sindhi | 96 % | 96 % | 7.8 % of 1,329 | 1.5 % | Beta, off | no |
    | Kashmiri | 76 % | 100 % | 18.8 % of 239 | 1.0 % | Beta, off | no |
    | Hindi | 100 % | 98 % | 38.0 % of 1,335 | 10.0 % | Beta, off | no |
    | Bangla | 100 % | 98 % | 33.7 % of 1,352 | 9.3 % | Beta, off | no |

    **Deviations:** apart from Urdu, the 50 misspellings per language are synthetic (`src/make-misspellings.ts`: a common word with one typical slip) and need native review. The correct words are the native side of the Roman sets, and only Hindi, Bangla and Sindhi reach 500. Their false flags are mostly Dakshina's rare words that the 35,000-word lists lack; Arabic's are colloquial words (كتير, عايز).
  - [x] Autocorrect on Space (physical, on-screen and our Space key): only clear fixes, where the best correction beats the next by a margin. Backspace right after it puts the typed word back and leaves it alone for the visit. It is offered only where spell check meets its bars and under 1 % of words would be changed wrongly. It is on by default only for Urdu, whose misspellings were not made up. The settings are remembered per language.
  - [x] Completions and next words on every layout of these languages. Persian half-spaces stay inside a word. Bug fixed: with spell check off, text from the phone's own keyboard never loaded the word list.
  - JS: spelling rules load with the word list. `@okb/engine` is now `sideEffects: false`, so pages drop the to-Roman tables they don't use. Keyboard pages: 43.8 KB gzipped (was 42.5 KB).
- [x] **6.7 Wider voice typing.**
  - [x] Locale probe: `/voice-probe` (noindex, not in the sitemap). It tries each candidate locale, classifies the script of the result and copies a table. **Open (owner):** run it on Chrome desktop, Android Chrome and Safari, and paste the tables below. Until then, voice stays on the five locales enabled in Phase 4 (Urdu, Arabic, Farsi, Hindi, Bangla). Shahmukhi stays off: Punjabi comes back in Gurmukhi.

    | Locale | Chrome desktop | Android Chrome | Safari |
    |---|---|---|---|
    | ur-PK, ar-SA, fa-IR, hi-IN, bn-BD | not yet probed | not yet probed | not yet probed |
    | ps-AF, sd-IN, pa-PK | not yet probed | not yet probed | not yet probed |
  - [x] Dialect picker (Arabic: 11 regions; also Urdu Pakistan/India and Bangla Bangladesh/India), in the voice panel and remembered per language.

**Exit**
- [x] All 10 new Roman pages are live with published numbers. Urdu is at target; the rest are labelled Beta.
- [x] Suggestions and spell check run in every current language with a word list. Spell check is Beta (off by default) where it misses its bars.
- [ ] The voice table is published. **Open:** waiting on the owner's probe run.
- [x] e2e passes for each Roman page on desktop and in both phone modes.

**Known issues**
- Hindi and Bangla Roman typing are far below target. The fix is a larger word list within budget, or a chat word source.
- The misspelling sets for nine languages are synthetic.
- The "Report a wrong word" address is a placeholder until the domain is chosen.
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
- [x] **7.3 Importers at scale.**
  - [x] CLDR 43 keyboards for every Windows layout we need. 26 Latin keyboards vendored (French, Belgian, Swiss, German, Spanish, Latin American, Italian, Portuguese PT/ABNT/ABNT2, Turkish Q/F, Polish 214/Programmers, Czech, Hungarian, Romanian, Nordic, Dutch, US-International); all import with no warnings. Dead keys import as `deadkeys` (two-character transforms); `transform="no"` layers are marked `live`, so the trigger types literally there.
  - [x] The Keyman importer covers more of `.kmn`: stores (ranges, key lists), `any`/`index`, `nul`, `dk()`/`deadkey()` with a spacing form as the trigger. Other context rules and dead keys without a spacing form are **reported, never imported wrongly**. Existing imports unchanged; Kashmiri's digit patch is gone (the importer reads its `any(nums)` rule).
  - [x] Evaluated xkeyboard-config: permissive MIT/HPND notices in the project `COPYING`, most `symbols/` files carry none of their own. Not used yet (CLDR covers every layout we need); recorded in `packages/layouts/IMPORTS.md`.
  - [x] Added the ABNT2 (`IntlRo`) and JIS (`IntlYen`) keys to `keycodes.ts`.
  - [x] An import report for each layout: `packages/layouts/IMPORTS.md` (source, licence, coverage, skipped rules, our changes computed from the patch), kept fresh by `test/imported.test.ts`.
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
