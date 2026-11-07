# @okb/text-tools

Text tools for the site's stand-alone pages (plan Phase 10, item 10.3). Each tool is its own
entry point, so a page loads only its own code:

- `@okb/text-tools/diacritics`: removes Arabic and Urdu harakat, Hebrew niqqud and
  cantillation, Latin and Greek accents and Russian stress marks, group by group
  (`/remove-diacritics`).
- `@okb/text-tools/digits`: converts digits between the 21 decimal systems people pick from
  (Western, Arabic, Persian/Urdu, Devanagari, Bangla, Thai…), reads any Unicode digit, and
  regroups numbers in thousands or lakhs (`/digit-converter`).
- `@okb/text-tools/number-words`: spells an amount in Urdu, Hindi, Bangla, Arabic and English,
  with lakh and crore and the currency words for a cheque (`/number-to-words`).
- `@okb/text-tools/counter`: words, characters (grapheme clusters), sentences, paragraphs,
  scripts, SMS parts and the length on X (`/word-counter`).
- `@okb/text-tools/pdf-text`: mends Urdu, Arabic and Persian copied out of a PDF
  (`/fix-urdu-arabic-pdf-text`).

Test data under `test/data/` is built by the scripts in `scripts/`; each file's header names
its source. Nothing from a source is shipped to the browser except the tables noted below.

## Remove diacritics (checked 2026-11-07)

| Source                                                                              | Use                                                                                                                                  | Licence         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Unicode Character Database 17                                                       | Which marks belong to which group; Hebrew presentation forms split with NFKD                                                         | Unicode License |
| ICU 74 transliterators Latin-ASCII and de-ASCII, run through `scripts/icu-latin.py` | Reference for plain ASCII and German spelling (`test/data/latin-icu.tsv`, 17,600 words of 47 languages from `packages/dictionaries`) | Unicode License |
| English Wiktionary through kaikki.org, `scripts/import-wiktionary.ts`               | Words with their marks and the entry's plain title (`test/data/*-wiktionary.tsv`), tests only                                        | CC BY-SA 4.0    |

What the checks found:

- **Plain ASCII matches ICU's Latin-ASCII on 99.97% of 951,894 words** of the word lists; the
  rest are IPA letters (ɑ ɐ ɔ ɛ ʃ ʒ) and º ª, which ICU leaves alone. German spelling matches
  de-ASCII on all 15,096 German words.
- **Wiktionary:** the marked form comes out as the title for 4,975 of 5,000 Arabic words, 4,968
  of 5,000 Urdu, 3,942 of 3,999 Russian and 681 of 731 Persian; the tests sort the rest into
  spacing, punctuation, letter forms or another form of the word. Hebrew: 4,047 of 5,000; 848
  others differ only by the vowel letters ו and י of everyday spelling (ktiv male), which the
  remover doesn't add.

## Digit converter (checked 2026-11-07)

| Source                                                   | Use                                                                                      | Licence         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------- |
| UnicodeData.txt (UCD 17)                                 | The 77 zeros of the decimal digit blocks, in `src/digits.ts`                             | Unicode License |
| ICU through `Intl.NumberFormat` (CLDR numbering systems) | Second reference for every system's digits and for Arabic, Persian and Bangla formatting | Unicode License |

Every code point is checked: `digitValue` finds a value exactly for the `\p{Nd}` characters.

## Number to words (checked 2026-11-07)

| Source                                                                               | Use                                                                                                                                                                                           | Licence         |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| CLDR main RBNF rules for ur, hi, bn and en_IN (fetched 2026-11-07)                   | Words 0–99 and scales (`scripts/make-number-words.py` → `src/number-words-data.ts`); run by ICU 74 as the reference (`scripts/icu-spellout.py` → `test/data/spellout-icu.tsv`, 8,056 numbers) | Unicode License |
| English Wiktionary through kaikki.org, `scripts/import-wiktionary-numbers.ts`        | Second reference for the words 0–99 (`test/data/*-numbers-wiktionary.tsv`), tests only                                                                                                        | CC BY-SA 4.0    |
| [tafqit](https://github.com/MohsenAlyafei/tafqit) by Mohsen Alyafei, README examples | Reference for Arabic: its 30 default-style examples. Read as data; code read but not run or copied                                                                                            | MIT             |

What the checks found:

- **CLDR, run by ICU:** the same words for every one of 2,014 numbers per language, except where
  we chose Wiktionary's spelling (Urdu 54, Hindi 389, Bangla 42 numbers): ترپن, पंद्रह, -वे for
  91–99, বাহান্ন. English with lakh and crore matches en_IN below 10¹².
- **Wiktionary:** every word 0–99 is Wiktionary's except seven kept from CLDR (چھ, تئیس,
  تریسٹھ; चौवालीस, तिरेपन, तिरेसठ; চৌদ্দ).
- **CLDR's Arabic rules were set aside:** they give ثلاثة مائة for 300 and إحدى عشر for a
  masculine 11. Three of tafqit's feminine examples (ثلاثة ليرات) contradict its own code and
  the grammar; we follow the grammar.
- Not checked by a native speaker yet; the place of Urdu صرف on a cheque has no source.

## Word counter (checked 2026-11-07)

| Source                                                                                                                   | Use                                                                                                                                 | Licence              |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Unicode UAX #29 through `Intl.Segmenter` (ICU 78 in Node)                                                                | Characters, words and sentences                                                                                                     | Unicode License      |
| [Universal Dependencies](https://universaldependencies.org/) PUD treebanks, 12 languages, `scripts/import-ud.ts`         | Words checked against hand-made tokens and against spaces (`test/data/ud-pud-words.tsv`, 2,600 of the 12,000 sentences), tests only | CC BY-SA 4.0         |
| Unicode's GSM0338.TXT (3GPP TS 23.038)                                                                                   | The GSM 7-bit alphabet in `src/counter.ts`; `test/data/GSM0338.TXT`                                                                 | Unicode terms of use |
| [message-segment-calculator](https://github.com/TwilioDevEd/message-segment-calculator) by Twilio, `tests/index.test.js` | Its 48 segment cases, restated in `test/counter.test.ts`; code not used                                                             | MIT                  |
| [twitter-text](https://github.com/twitter/twitter-text) `config/v3.json` and `conformance/validate.yml`                  | The weight ranges in `src/counter.ts`; 24 weighted-length cases copied to `test/data/twitter-text-weighted.yml`                     | Apache 2.0           |
| Brysbaert (2019), "How many words do we read per minute?", _J. Memory and Language_ 109                                  | 238 words a minute silently, 183 aloud                                                                                              | —                    |

What the checks found (all 1,000 sentences of each treebank):

- **Space-separated languages:** our word count equals the number of chunks between spaces in
  every sentence of Hindi, Arabic, Korean, Turkish, Indonesian, Russian, English, German and
  French. Before word pieces joined by punctuation were counted once (10월, 2004'te, و"تويتر"),
  Korean matched in 60% of sentences and Turkish in 89.5%.
- **Without spaces:** against the treebanks' hand-made words, Chinese comes out 0.5% high and
  Japanese 3% low. Thai is 13% high: ICU's Thai dictionary splits compounds such as เดินทาง
  that the treebank keeps whole. Fixing that needs our own Thai word list (not done).
- **SMS:** every GSM character of Unicode's table is one septet, every extension character
  two; 0x09 is Ç as in the standard, Android and Twilio (Unicode's file says ç). All 48 Twilio
  cases match.
- **X:** 22 of the 24 weighted-length cases match; the other two test which web addresses X
  accepts as links (labels over 63 letters, a long Punycode host), where we count any as 23.
- Browsers carry their own segmentation data, so Thai, Lao, Khmer, Burmese, Chinese and
  Japanese counts can differ slightly between them. Without `Intl.Segmenter` (Firefox before 125) the counter falls back to rough rules.

## PDF text fixer (checked 2026-11-07)

| Source                                                                                                   | Use                                                                                                          | Licence          |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- |
| UnicodeData.txt and DerivedJoiningType.txt (UCD 17)                                                      | The initial, medial and final forms in `src/pdf-text.ts`; the synthetic damage of `scripts/pdf-synthetic.ts` | Unicode License  |
| Wikipedia (Urdu and Persian articles, extracts fetched 2026-11-07) and the Arabic PUD treebank           | 792 sentences, `scripts/pdf-sentences.ts` → `test/data/pdf-sentences.tsv`, tests only                        | CC BY-SA 4.0     |
| Chrome (Playwright) printing those sentences, read by poppler's pdftotext 24.02, `scripts/print-pdf.mjs` | Real extracted text, as pdftotext reads it and in `-raw` order (`test/data/pdf-pdftotext*.txt`)              | —                |
| `packages/dictionaries` word frequencies (ur, fa, ar)                                                    | Turning ال back into لا only where that makes a far more common word                                         | see that package |

What the fixer does: presentation forms back to letters; lines laid out backwards (found from
the letter shapes) reversed letter by letter, keeping Latin words and numbers in order as
UAX #9 groups them; lines whose words run backwards (found from the full stop, then by a vote
of the whole text) reversed word by word, pieces split by direction marks included; direction
marks removed; marks read before their letter moved back; and the lam ligatures read back the
wrong way round mended (اهلل, عىل, األ, اًل, a lone ال, then ال → لا by the word list).

What the checks found:

- **pdftotext:** none of the 792 sentences comes out right; after the fixer 743 do (94%):
  Urdu 189 of 192, Persian 291 of 300, Arabic 263 of 300. More than half the misses are words
  where ال and لا are both words (طالب, طلاب) or the word isn't in the list.
- **pdftotext -raw:** Urdu 191 of 192 and Arabic 223 of 300. Persian only 77 of 300: that mode
  breaks lines at words joined with ZWNJ, which no line-by-line fix can join again.
- **Synthetic damage**, every third sentence: in letter shapes, backwards letter by letter
  with marks after or before their letter, and with words backwards; 1,055 of 1,056 restored.
- **Correct text:** 47,901 words of Urdu, Persian and Arabic (the Wikipedia extracts and the
  Arabic treebank) come through unchanged. A ratio of 10 for the ال → لا swap would have
  changed two (تالش, a town; ثالثة); at 40 it changes none and still mends 401 words.
