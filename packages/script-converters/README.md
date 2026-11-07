# @okb/script-converters

Converters between two scripts of one language (plan Phase 10, item 10.2), where one script
leaves out what the other writes, so a word list has to help:

- `@okb/script-converters/punjabi`: Shahmukhi ↔ Gurmukhi.
- `@okb/script-converters/bridge`: the engine they share.

## How it works

Shahmukhi leaves out short vowels and doubled letters (کتاب for ਕਿਤਾਬ), while Gurmukhi writes
one letter where Shahmukhi may have several (ਸ for س, ص or ث). Writing Gurmukhi in Shahmukhi by
rule is nearly mechanical, so Shahmukhi is the **pivot**:

1. Every word of the target script's word list gets a pivot spelling: its own spelling for
   Shahmukhi, the rules' Shahmukhi for Gurmukhi. Where the rules can't tell (ਿ and ੁ before ਹ
   are written in ਜਿਹਾ جیہا but not in ਮੁਹੱਬਤ محبت), a word gets both.
2. The pivot is **folded** in two steps. `spellShahmukhi` merges letters Gurmukhi can't tell
   apart (س ص ث, ت ط, ز ذ ض ظ, ہ ح, ک ق, a final ہ and ا, ع with or without a vowel). The key
   adds what people type alike: letters made with a nukta, which many leave out (ਖਬਰ for ਖ਼ਬਰ),
   and ن or م before ب.
3. A word is converted by looking up its key. Of the words found, the more frequent wins (in
   doublings of rank), unless its spelled pivot is further from the word's own (1.5 doublings per
   letter of difference, tuned on the dev pairs).
4. A word with no match keeps the rules' spelling, and the result says it was guessed; the page
   underlines it.

Digits and punctuation change with the script (੧੯੪੭ ↔ ۱۹۴۷, । ↔ ۔, `?` ↔ `؟`, `,` ↔ `،` except
inside a number). Latin digits stay.

A loose fold of consonants alone was tried for words the key misses, and dropped: it found more
words but put the wrong one in more often than the rules alone.

## Data (built 2026-11-07)

| File                                | What                                                                         | Source and licence                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `data/pa.txt`                       | 92,327 Gurmukhi words (all of the list), front-coded (`@okb/engine/compact`) | Punjabi Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)                |
| `data/pnb.txt`                      | 100,000 Shahmukhi words                                                      | Western Punjabi Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)        |
| `test/data/pa-pairs-{dev,test}.tsv` | 6,081 Shahmukhi–Gurmukhi word pairs, split by a hash                         | English Wiktionary via [kaikki.org](https://kaikki.org/) (CC BY-SA 4.0) |
| `test/data/pa-titles.tsv`           | 2,889 one-word article titles the two Wikipedias link                        | Punjabi Wikipedia `page` and `langlinks` dumps (CC BY-SA 4.0)           |
| `test/data/{pa,pnb}-sentences.txt`  | 1,000 sentences each from the middle of the dumps                            | Punjabi and Western Punjabi Wikipedia (CC BY-SA 4.0)                    |

`node scripts/build-lists.ts` rebuilds the lists; `scripts/import-pairs.ts`,
`scripts/import-titles.ts` and `scripts/import-sentences.ts` rebuild the test data (each file's
header says how). 100,000 words find about 5 % more of real Shahmukhi text than the 40,000 the
keyboards ship (89 % against 84 %), for about 290 KB gzipped per list; a page fetches only the
list of the script it writes.

Rejected: the SLPG Punjabi Transliteration Corpus on Hugging Face (no licence stated, and the data
files were removed) and learnpunjabi.org's lexicon (not published for reuse).

## Measured (2026-11-07)

`EVAL_VERBOSE=1 pnpm test` prints these. The rules were tuned on the dev pairs and the sentences;
the test pairs and the titles were scored once the rules were settled.

| Set                                   | Gurmukhi → Shahmukhi | Shahmukhi → Gurmukhi |
| ------------------------------------- | -------------------- | -------------------- |
| Wiktionary pairs, test (3,068)        | 85.1 %               | 64.0 %               |
| Wiktionary pairs, dev (3,013)         | 85.2 %               | 62.3 %               |
| Wikipedia titles (2,889)              | 54.1 %               | 50.7 %               |
| Running text: words found in the list | 95.1 % of 18,028     | 88.9 % of 20,790     |
| Running text: same after a round trip | 93.5 %               | 99.1 %               |

Comparisons treat a nukta or none, tippi or bindi, and ݨ or ن as the same, since both are in
use. With the rules alone, Shahmukhi → Gurmukhi gets 31 % of the pairs right.

What the numbers mean:

- **Wiktionary's pairs** lean to rare words and inflections, and its Shahmukhi often follows the
  Gurmukhi spelling (اسمان) where Wikipedia writes another (آسمان); ours follows Wikipedia. Most
  Shahmukhi → Gurmukhi misses are words written alike in Shahmukhi (تن: ਤਿੰਨ or ਤਨ; بچے: ਬਚੇ or
  ਬੱਚੇ), or spellings both in use (ਆਵਾਜ਼, ਅਵਾਜ਼).
- **The titles** are a weak reference: many are translations (ਭਾਸ਼ਾ and زبان) and foreign names
  are spelled freely.
- **Round trips** on Gurmukhi text mostly fail where Gurmukhi has two spellings of one word (ਵਿਚ
  and ਵਿੱਚ both become وچ, which comes back as ਵਿੱਚ), and where words are written alike in
  Shahmukhi (ਹੁਣ and ਹਨ both ہن).

## Known issues

- Words written alike in Shahmukhi always come out as the more frequent; the words around them
  aren't used yet.
- Western Punjabi Wikipedia writes ਣ as ن more than as ݨ, so the converter does too.
- No Punjabi speaker has reviewed the output.
