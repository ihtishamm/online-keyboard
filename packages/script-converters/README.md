# @okb/script-converters

Converters between two scripts of one language (plan Phase 10, item 10.2), where one script
leaves out what the other writes, so a word list has to help:

- `@okb/script-converters/punjabi`: Shahmukhi ↔ Gurmukhi.
- `@okb/script-converters/hindustani`: Urdu ↔ Hindi (Devanagari).
- `@okb/script-converters/bridge`: the engine they share.
- `@okb/script-converters/serbian`: Serbian Cyrillic ↔ Latin, which needs a word list only for
  digraphs and missing marks (see [Serbian](#serbian-cyrillic--latin)).

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

Urdu ↔ Hindi works the same way, with Urdu as the pivot (`src/arabic.ts` holds what the two
Arabic-script sides share). Hindi differs from Gurmukhi in a few rules: a doubled letter after a
virama is written once (बच्चा بچہ), a final ि of a longer word is ی (जाति جاتی), ीय is one ی, and
a lone consonant may take ہ (न نہ). Hindi writes some pronouns and postpositions as one word that
Urdu writes as two (जिसका جس کا, इसमें اس میں); a word the list lacks is split there and each part
looked up.

Digits and punctuation change with the script (੧੯੪੭ ↔ ۱۹۴۷, । ↔ ۔, `?` ↔ `؟`, `,` ↔ `،` except
inside a number). Latin digits stay.

A loose fold of consonants alone was tried for words the key misses, and dropped: it found more
words but put the wrong one in more often than the rules alone.

## Data (built 2026-11-07)

| File                                | What                                                                         | Source and licence                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `data/pa.txt`                       | 92,327 Gurmukhi words (all of the list), front-coded (`@okb/engine/compact`) | Punjabi Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)                |
| `data/pnb.txt`                      | 100,000 Shahmukhi words                                                      | Western Punjabi Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)        |
| `data/hi.txt`, `data/ur.txt`        | 100,000 Hindi and 100,000 Urdu words (358 and 272 KB gzipped)                | Hindi and Urdu Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)         |
| `test/data/pa-pairs-{dev,test}.tsv` | 6,081 Shahmukhi–Gurmukhi word pairs, split by a hash                         | English Wiktionary via [kaikki.org](https://kaikki.org/) (CC BY-SA 4.0) |
| `test/data/pa-titles.tsv`           | 2,889 one-word article titles the two Wikipedias link                        | Punjabi Wikipedia `page` and `langlinks` dumps (CC BY-SA 4.0)           |
| `test/data/{pa,pnb}-sentences.txt`  | 1,000 sentences each from the middle of the dumps                            | Punjabi and Western Punjabi Wikipedia (CC BY-SA 4.0)                    |
| `test/data/hi-pairs-{dev,test}.tsv` | 13,554 Urdu–Hindi word pairs, split by a hash                                | English Wiktionary via kaikki.org (CC BY-SA 4.0)                        |
| `test/data/hi-titles.tsv`           | 8,229 one-word article titles the two Wikipedias link                        | Hindi Wikipedia `page` and `langlinks` dumps (CC BY-SA 4.0)             |
| `test/data/{hi,ur}-sentences.txt`   | 1,000 sentences each from the middle of the dumps                            | Hindi and Urdu Wikipedia (CC BY-SA 4.0)                                 |

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

### Shahmukhi ↔ Gurmukhi

| Set                                   | Gurmukhi → Shahmukhi | Shahmukhi → Gurmukhi |
| ------------------------------------- | -------------------- | -------------------- |
| Wiktionary pairs, test (3,068)        | 85.3 %               | 64.0 %               |
| Wiktionary pairs, dev (3,013)         | 85.4 %               | 62.3 %               |
| Wikipedia titles (2,889)              | 54.1 %               | 50.7 %               |
| Running text: words found in the list | 95.1 % of 18,028     | 88.9 % of 20,790     |
| Running text: same after a round trip | 93.6 %               | 99.1 %               |

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

### Urdu ↔ Hindi

| Set                                   | Hindi → Urdu     | Urdu → Hindi     |
| ------------------------------------- | ---------------- | ---------------- |
| Wiktionary pairs, test (6,848)        | 82.2 %           | 58.2 %           |
| Wiktionary pairs, dev (6,706)         | 82.9 %           | 59.0 %           |
| Wikipedia titles (8,229)              | 36.6 %           | 29.1 %           |
| Running text: words found in the list | 80.3 % of 16,495 | 88.8 % of 22,109 |
| Running text: same after a round trip | 92.8 %           | 99.4 %           |

Comparisons treat a nukta or none and chandrabindu or anusvara as the same. With the rules
alone, the test pairs score 72.3 % (Hindi → Urdu) and 32.4 % (Urdu → Hindi).

- **Hindi text** finds fewer words because much of Hindi Wikipedia's vocabulary is Sanskrit that
  Urdu Wikipedia doesn't use (प्रतियोगिता, सामाजिक, क्षेत्र, संविधान): the rules spell those and
  the page underlines them. An Urdu reader would use another word, which no converter between
  scripts can give.
- **Urdu → Hindi** misses are mostly words written alike in Urdu (دل: दिल or दल; بچہ: बच्चा or
  बचा), and Wiktionary listing both spellings in use (आयरलैंड, आयरलैण्ड).
- **The titles** are weaker still than for Punjabi: many are translations, and foreign names are
  spelled differently in each Wikipedia (آئسٹالا, आइशतला).

## Serbian Cyrillic ↔ Latin

Serbian writes both alphabets letter for letter, so Cyrillic → Latin is a table (`toLatin`). Љ,
Њ and Џ become LJ, NJ, DŽ in a word in capitals and Lj, Nj, Dž otherwise, judged by the nearest
letters as ICU does (А-Љ is A-LJ). A word with letters Serbian lacks (Russian я, щ, ь) is left
whole and counted. Montenegrin с́ and з́ become ś and ź.

Latin → Cyrillic (`SerbianCyrillic`) is the same table read backwards, plus three decisions:

1. **Digraphs.** lj, nj and dž are one letter unless the Cyrillic word list (100,000 words from
   Serbian Wikipedia, `data/sr.txt`) spells the word with two (конјугација), or a stem rule says so
   for words the list lacks: nad-, pod-, pred-, feld- before ž (надживети), a few od-ž stems
   (одживети, but оџак), and in-, kon-, an-, ken-, tan-, van- before j in borrowed words
   (инјекција, конјунктура, Танјуг).
2. **Missing marks.** A text with none of č ć š ž đ was typed on an English keyboard, so each word
   is looked up by its letters without marks (`bare`: č ć → c, đ → dj, dž → dz). The most frequent
   list word wins; each mark it adds costs one doubling of frequency, which hardly matters
   (97.9–98.0 % on dev sentences for weights 0 to 3; 1 is used). A word the list lacks is spelled
   by rule and marked: dj is ђ and dz is џ except after od-, pod-, nad- and the like (одједном,
   надзор), and surnames typed -ovic, -evic, -ic get ћ.
3. **Words that stay Latin**, as Serbian Cyrillic text keeps them: links, addresses, handles and
   file names; Roman numerals (XIV; a lone I only mid-sentence, and none in a text all in
   capitals, where MI and VI are words); unit symbols after a number (15 km, 20 °C), as Serbian
   Wikipedia writes them; words with letters Serbian lacks (q w x y ä…) or mixed capitals
   (iPhone, but BiH is Serbian); and, if the list doesn't have the word, words Serbian
   Wikipedia's Cyrillic text keeps in Latin (`data/sr-latin.txt`, 1,065 words), Ćirilizator's
   common foreign words and beginnings (Facebook, username, mailom), and English-looking letter
   pairs (gh, ph, th but not across a prefix as in prethodan, a doubled consonant except in
   capitals as in SSSR, oo or ee near the end, ch when marks are typed). A word with a mark, lj
   or nj is always Serbian.

Ligatures (ǈ, ǌ, ĳ, ﬁ) and Ð are read as their letters, and Latin letters inside a Cyrillic word
(Бeoград with a Latin e) are changed.

### Data (built 2026-11-07)

| File                                | What                                                              | Source and licence                                                                           |
| ----------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `data/sr.txt`                       | 100,000 Cyrillic words, front-coded (about 270 KB gzipped)        | Serbian Wikipedia, by `@okb/dictionaries` (CC BY-SA 4.0)                                     |
| `data/sr-latin.txt`                 | 1,065 words srwiki's Cyrillic sentences keep in Latin             | Nine 4 MB slices of the srwiki dump (at 5–65 %), by `scripts/import-latin.ts` (CC BY-SA 4.0) |
| `test/data/sr-pairs-{dev,test}.tsv` | 38,767 Latin–Cyrillic word pairs, split by a hash                 | English Wiktionary via kaikki.org (CC BY-SA 4.0), by `scripts/import-serbian-pairs.ts`       |
| `test/data/sr-sentences.txt`        | 2,000 sentences, no two opening alike                             | Three other srwiki slices (15, 30, 88 %), by `scripts/import-sentences.ts --distinct`        |
| `test/data/sr-icu.tsv`              | ICU 74's Serbian-Latin/BGN on the sentences and 20,000 list words | ICU (Unicode License), by `scripts/icu-serbian.py`                                           |
| in `src/serbian.ts`                 | Common foreign words and word beginnings                          | [Ćirilizator](https://github.com/turanjanin/cirilizator) (Jovan Turanjanin, MIT)             |

The Latin list and the test sentences come from different slices, so the round trip doesn't
see its own foreign words. Turanjanin's
[Serbian Transliterator](https://github.com/turanjanin/serbian-transliterator) (MIT), which takes
its data from Ćirilizator, was read, not run: its test sentences and digraph exceptions are
restated in `test/serbian.test.ts` as data.

### Measured (2026-11-07)

| Set                                         | Result                                 |
| ------------------------------------------- | -------------------------------------- |
| ICU's Serbian-Latin, 22,000 rows            | 100 % the same Latin                   |
| Wiktionary pairs, test (19,355): → Latin    | 99.9 %                                 |
| Wiktionary pairs, test: → Cyrillic          | 99.8 % (99.6 % of 1,874 with nj lj dž) |
| Wiktionary pairs, dev (19,412): → Cyrillic  | 99.9 % (99.8 % of 1,783 with nj lj dž) |
| Ćirilizator's digraph exceptions (44 stems) | all split but injaric and ssrnj        |
| srwiki sentences: Cyrillic → Latin → back   | 97.8 % of 2,000 unchanged              |
| srwiki sentences typed without marks        | 97.8 % of 27,037 words right           |
| Wiktionary pairs typed without marks        | 82.7 % (test), mostly names            |

- The 22 Wiktionary pairs that don't match → Latin are Wiktionary's own slips (Abadzic for
  Абаџић). → Cyrillic misses are foreign words Wiktionary writes in Cyrillic and we keep (Allah,
  Matteo), odd entries (кетцхуп), rare compounds (crnook црноок), Поџабље (we split pod-ž), and
  spellings srwiki and Wiktionary differ on (Нетанјаху, Нетањаху).
- Round-trip misses: Latin abbreviations srwiki keeps beside Serbian ones in Cyrillic (ICMP, RSA
  and ССО), km and км both in use, Latin taxa and phrases srwiki writes in Cyrillic (ex situ),
  and Latin letters typed into Cyrillic words, which we correct.
- Missing marks: words alike without them (reci: реци or речи; kos: кос or кош), Hungarian and
  Croatian names the list lacks.
- The sentences were also used while building the rules, so those two lines aren't independent.
  We differ from Ćirilizator on purpose in one test sentence: muzzičkog changes, as č makes it
  Serbian.

## Known issues

- Words written alike in Shahmukhi always come out as the more frequent; the words around them
  aren't used yet.
- Western Punjabi Wikipedia writes ਣ as ن more than as ݨ, so the converter does too.
- No Punjabi, Hindi or Urdu speaker has reviewed the output.
- Serbian: Latin abbreviations are converted unless they look foreign (ICMP becomes ИЦМП);
  homographs without marks get the more frequent word; no Serbian speaker has reviewed the output.
