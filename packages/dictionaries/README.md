# @okb/dictionaries

Word lists for prediction and Roman transliteration, and the pipeline that builds them.

## Languages

Each language with a Wikipedia has `data/<code>/` built from its article dump (the latest
dumps, downloaded in October 2026; Urdu's source is described below):

| Code  | Wikipedia             | Pages   | Words read | Words kept | Shipped to the browser |
| ----- | --------------------- | ------- | ---------- | ---------- | ---------------------- |
| `ur`  | Urdu                  | 704,532 | 58.0M      | 100,000    | 40,000                 |
| `ar`  | Arabic                | 146,244 | 65.9M      | 100,000    | 40,000                 |
| `fa`  | Persian               | 210,065 | 61.6M      | 100,000    | 40,000                 |
| `ps`  | Pashto                | 23,433  | 13.3M      | 100,000    | 40,000                 |
| `sd`  | Sindhi                | 23,040  | 9.0M       | 66,700     | 40,000                 |
| `pnb` | Western Punjabi       | 76,471  | 32.2M      | 100,000    | 40,000                 |
| `skr` | Saraiki               | 25,059  | 8.9M       | 70,705     | 40,000                 |
| `ks`  | Kashmiri              | 11,837  | 0.9M       | 21,396     | 21,396                 |
| `ckb` | Central Kurdish       | 85,153  | 11.0M      | 100,000    | 40,000                 |
| `ug`  | Uyghur                | 10,658  | 3.7M       | 89,217     | 40,000                 |
| `dv`  | Dhivehi               | 4,621   | 0.7M       | 28,440     | 28,440                 |
| `hi`  | Hindi                 | 175,824 | 45.1M      | 100,000    | 35,000                 |
| `bn`  | Bengali               | 192,129 | 68.8M      | 100,000    | 35,000                 |
| `es`  | Spanish               | 3,835   | 13.4M      | 100,000    | 40,000 + 10,500 accent |
| `fr`  | French                | 3,244   | 12.1M      | 100,000    | 40,000 + 14,100 accent |
| `it`  | Italian               | 7,975   | 14.1M      | 100,000    | 40,000 + 3,200 accent  |
| `de`  | German                | 3,469   | 12.5M      | 100,000    | 37,500 + 10,600 accent |
| `pt`  | Portuguese            | 5,838   | 12.6M      | 100,000    | 40,000 + 9,200 accent  |
| `tr`  | Turkish               | 11,476  | 9.1M       | 100,000    | 40,000 + 24,600 accent |
| `pl`  | Polish                | 4,173   | 4.8M       | 100,000    | 40,000 + 18,500 accent |
| `nl`  | Dutch                 | 4,204   | 6.9M       | 100,000    | 37,500 + 3,000 accent  |
| `ro`  | Romanian              | 6,657   | 5.2M       | 87,516     | 40,000 + 12,800 accent |
| `cs`  | Czech                 | 3,530   | 4.8M       | 100,000    | 40,000 + 23,500 accent |
| `hu`  | Hungarian             | 4,414   | 5.4M       | 100,000    | 37,500 + 21,500 accent |
| `sv`  | Swedish               | 5,102   | 5.1M       | 97,115     | 40,000 + 16,800 accent |
| `ca`  | Catalan               | 4,501   | 5.9M       | 74,643     | 40,000 + 6,300 accent  |
| `hr`  | Croatian              | 7,701   | 4.8M       | 100,000    | 40,000 + 12,300 accent |
| `ru`  | Russian               | 7,092   | 17.8M      | 100,000    | 37,500                 |
| `uk`  | Ukrainian             | 16,145  | 12.6M      | 100,000    | 37,500                 |
| `be`  | Belarusian            | 39,944  | 9.4M       | 100,000    | 37,500                 |
| `bg`  | Bulgarian             | 25,395  | 13.7M      | 100,000    | 40,000                 |
| `sr`  | Serbian               | 16,707  | 11.4M      | 100,000    | 40,000                 |
| `mk`  | Macedonian            | 35,683  | 12.1M      | 100,000    | 40,000                 |
| `kk`  | Kazakh                | 105,009 | 12.0M      | 100,000    | 37,500                 |
| `ky`  | Kyrgyz                | 77,191  | 7.6M       | 100,000    | 35,000                 |
| `tg`  | Tajik                 | 116,286 | 7.4M       | 100,000    | 37,500                 |
| `mn`  | Mongolian             | 32,236  | 8.2M       | 100,000    | 37,500                 |
| `el`  | Greek                 | 17,642  | 13.7M      | 100,000    | 35,000                 |
| `he`  | Hebrew                | 11,624  | 15.8M      | 100,000    | 40,000                 |
| `hy`  | Armenian              | 30,807  | 9.6M       | 100,000    | 40,000                 |
| `ka`  | Georgian              | 39,986  | 8.2M       | 100,000    | 35,000                 |
| `th`  | Thai                  | 18,548  | 16.0M      | 35,245     | 35,245                 |
| `lo`  | Lao                   | 6,173   | 1.1M       | 11,195     | 11,195                 |
| `km`  | Khmer                 | 14,701  | 6.8M       | 36,195     | 32,500                 |
| `my`  | Burmese               | 104,549 | 14.6M      | 23,573     | 23,573                 |
| `vi`  | Vietnamese            | 9,666   | 19.2M      | 53,180     | 35,000                 |
| `ko`  | Korean                | 15,409  | 10.6M      | 100,000    | 37,500                 |
| `ja`  | Japanese              | 6,216   | 22.5M      | 98,114     | 35,000                 |
| `zh`  | Chinese               | 8,058   | 15.3M      | 55,712     | 35,000                 |
| `sk`  | Slovak                | 23,008  | 8.3M       | 100,000    | see `dict.txt`         |
| `sl`  | Slovenian             | 21,825  | 8.4M       | 100,000    | see `dict.txt`         |
| `sq`  | Albanian              | 29,318  | 9.8M       | 100,000    | see `dict.txt`         |
| `lt`  | Lithuanian            | 31,014  | 7.5M       | 100,000    | see `dict.txt`         |
| `lv`  | Latvian               | 22,878  | 6.7M       | 100,000    | see `dict.txt`         |
| `et`  | Estonian              | 25,030  | 8.2M       | 100,000    | see `dict.txt`         |
| `fi`  | Finnish               | 9,459   | 8.3M       | 100,000    | see `dict.txt`         |
| `nb`  | Norwegian (Bokmål)    | 16,100  | 10.1M      | 100,000    | see `dict.txt`         |
| `da`  | Danish                | 19,355  | 9.9M       | 100,000    | see `dict.txt`         |
| `is`  | Icelandic             | 39,878  | 7.8M       | 100,000    | see `dict.txt`         |
| `fo`  | Faroese               | 14,266  | 1.6M       | 42,454     | see `dict.txt`         |
| `ga`  | Irish                 | 61,945  | 8.0M       | 95,236     | see `dict.txt`         |
| `cy`  | Welsh                 | 59,286  | 7.0M       | 83,083     | see `dict.txt`         |
| `gd`  | Scottish Gaelic       | 16,134  | 1.6M       | 28,402     | see `dict.txt`         |
| `mt`  | Maltese               | 8,089   | 6.8M       | 77,884     | see `dict.txt`         |
| `gl`  | Galician              | 18,097  | 10.7M      | 100,000    | see `dict.txt`         |
| `eo`  | Esperanto             | 21,336  | 15.5M      | 100,000    | see `dict.txt`         |
| `la`  | Latin                 | 43,377  | 6.0M       | 100,000    | see `dict.txt`         |
| `af`  | Afrikaans             | 20,526  | 9.6M       | 100,000    | see `dict.txt`         |
| `az`  | Azerbaijani           | 22,032  | 8.6M       | 100,000    | see `dict.txt`         |
| `tk`  | Turkmen               | 8,352   | 1.3M       | 49,166     | see `dict.txt`         |
| `uz`  | Uzbek                 | 99,998  | 4.0M       | 89,841     | see `dict.txt`         |
| `kmr` | Kurdish (Kurmanji)    | 90,800  | 5.8M       | 96,186     | see `dict.txt`         |
| `yo`  | Yoruba                | 42,456  | 4.3M       | 57,262     | see `dict.txt`         |
| `ig`  | Igbo                  | 28,218  | 10.5M      | 83,997     | see `dict.txt`         |
| `ha`  | Hausa                 | 33,367  | 11.2M      | 83,575     | see `dict.txt`         |
| `wo`  | Wolof                 | 1,811   | 0.5M       | 11,233     | see `dict.txt`         |
| `haw` | Hawaiian              | 3,022   | 0.4M       | 5,750      | see `dict.txt`         |
| `mi`  | Māori                 | 8,117   | 0.2M       | 4,955      | see `dict.txt`         |
| `tt`  | Tatar                 | 66,339  | 3.4M       | 98,695     | see `dict.txt`         |
| `ba`  | Bashkir               | 36,607  | 4.3M       | 94,944     | see `dict.txt`         |
| `yi`  | Yiddish               | 15,925  | 3.3M       | 50,175     | see `dict.txt`         |
| `am`  | Amharic               | 16,377  | 1.5M       | 56,215     | see `dict.txt`         |
| `ti`  | Tigrinya              | 560     | 104k       | 4,290      | see `dict.txt`         |
| `bo`  | Tibetan (syllables)   | 15,249  | 10.5M      | 11,119     | see `dict.txt`         |
| `syr` | Syriac (from arcwiki) | 1,969   | 56k        | 3,117      | see `dict.txt`         |
| `chr` | Cherokee              | 1,056   | 22k        | 1,377      | see `dict.txt`         |
| `iu`  | Inuktitut             | 615     | 18k        | 1,003      | see `dict.txt`         |
| `sat` | Santali               | 17,358  | 4.6M       | 58,024     | see `dict.txt`         |

The Latin-script languages (plan 7.5, 7.7) read the first 20 to 40 MB of their dump (the oldest, most
edited articles), and add everyday sentences from [Tatoeba](https://tatoeba.org) through
`--text` (`src/import-tatoeba.ts --train`): an encyclopedia rarely says "I" or "you"
(voudrais, compraste) or names everyday things. All Tatoeba sentences together count half as
much as the dump (`--text-share`); the 1,000 sentences each spell-check test uses are left
out, and so are the names Tom and Mary, which Tatoeba gives nearly everyone, in every form a
language gives them (Toma, Tomovi, Tomnak, Toms, Maria): capitalised words of Tom or
Mary/Mari and up to four letters, unless the file writes them in lower case at least a
quarter as often (Spanish toma stays). Smaller Tatoeba sets weigh more per sentence, so
Catalan's 10,000 and Croatian's 5,500 sentences count 40 and 84 times. Words keep the case
they are most often written in mid-sentence (Madrid, la), and lookups fold case. Turkish
endings after an apostrophe (Türkiye'nin) belong to the name before them; Romanian's old
cedilla letters ş ţ are read as the comma letters ș ț.
Every 50th article is held out for the smart-accent test (`test/data/<code>-heldout.txt`).

Wave 4's European languages (plan 9c) read the first 40 MB of each compressed dump. A Tatoeba set
under 20,000 sentences now counts in proportion, up to the half share at 20,000: 16 Faroese
sentences had put their words at the top of the list. Lists built earlier were not rebuilt.

Balochi has no Wikipedia: its Roman typing runs on rules alone, and it has no suggestions or
spell check yet.

Two Wave 2 languages have no Wikipedia of their own:

- **Dari** (`prs`) shares Farsi's files, from Persian Wikipedia: the same letters, but Iranian
  usage, so some Afghan words (پوهنتون, موتر) rank low or are missing. Its typing sentences are
  Farsi's too; Tatoeba has no Dari.
- **Malay in Jawi** (`zlm`) has no Jawi dump. `src/import-jawi.ts` takes 6,735 spellings from
  English Wiktionary (CC BY-SA 4.0, through kaikki.org) and ranks them by how often the first
  60 MB of Malay Wikipedia uses the same word in Rumi; reading that text through the pairs gives
  the next-word table. Wiktionary lists headwords, so most words with me-, ber- or -kan are
  missing and Roman typing spells them by rules. No typing sentences: Tatoeba has too few in
  Jawi, and Dhivehi too few at all, so both typing tests have words only.

- **Wave 3** (plan 9b) read the first 60 MB of each compressed dump (all of a smaller one), with Tatoeba where it has at
  least 2,000 sentences. Thai, Lao, Khmer, Burmese, Chinese and Japanese write no spaces between
  words, so ICU's `Intl.Segmenter` splits them, both here and while typing; its boundaries are
  a machine's guess. Lao has 11,195 words, under the 20,000 Tier B asks for. Traditional Chinese
  has no list of its own: it types by conversion. Khmer's deprecated ឣ and ឤ are written អ and អា.
- **Chinese and Japanese readings** (`data/{zh,zht,ja}/readings.txt`, `src/build-readings.ts`)
  map what is typed to words for the converter, about 450 KB gzipped each and fetched on the first
  key. Chinese is CC-CEDICT, ranked by the word list. Japanese is the Mozc open source dictionary
  (`vendor/mozc/`), ranked by the word list and then Mozc's cost.
- **Simplified and Traditional** (`data/zh/opencc-{s2t,t2s}.txt`) are OpenCC's tables
  (`vendor/opencc/`), fetched when the button is pressed.
- **Serbian** has no pairs on Wiktionary (it is filed under Serbo-Croatian, in Latin), so
  `src/import-serbian.ts` generates its test pairs from the word list in Gajica. Its Roman score is
  therefore not comparable with any other language's.

Files per language:

- `words.txt`, `next.txt`, `stats.json`: as for Urdu below.
- `dict.txt`: what the site downloads. The most common words and the next-word table for the
  3,000 commonest, front-coded (`src/compact.ts`, format in `@okb/engine`'s `compact.ts`).
  At most 150 KB gzipped: the word count shrinks in steps of 2,500 until it fits.
  Latin languages add an accents section (at most 80 KB more): the rarer words that change
  what smart accents does, so it behaves as with all 100,000 words (95 % of accented words
  restored with 40,000, 97 % with 100,000).
- `chat.tsv` (ur, hi, bn, sd, ar, fa): the commonest English-letter spelling of each word,
  for the script-to-Roman converter, taken from the **dev** splits of the evaluation sets
  (`src/chat-words.ts`). Hindi, Bangla and Sindhi spellings come from Dakshina (below).

Each language has its own normaliser (`@okb/engine/normalize`): Arabic drops tatweel and
harakat; Persian keeps ZWNJ inside words; Hindi and Bangla compose nukta forms; the
Urdu-family languages keep their own letters (ݨ ڵ ٻ ڄ ݙ ڳ, Kashmiri vowel signs).

### Licence

Wikipedia text is © Wikipedia contributors under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), so **every `data/<code>/`
is shared under CC BY-SA 4.0** with attribution to that language's Wikipedia. Each
language's pages credit it in the footer.

The Hindi, Bangla and Sindhi evaluation pairs (`test/data/{hi,bn,sd}-roman-{dev,test}.tsv`)
and their `chat.tsv` files come from the
[Dakshina dataset v1.0](https://github.com/google-research-datasets/dakshina) (Google
Research), also CC BY-SA 4.0 (`src/import-dakshina.ts`); those pages credit it too.

The Latin-script lists also count sentences from [Tatoeba](https://tatoeba.org)
(CC BY 2.0 FR), and `test/data/<code>-everyday.txt` and `data/<code>/typing.txt` (the
typing test and tutor's sentences, `src/typing-sentences.ts`) are Tatoeba sentences, with
their sentence numbers. Those pages credit Tatoeba too.

`data/<code>/blocked.txt` (words kept out of the typing tests, lessons and games) are built by
`src/blocklist.ts` from the offensive-word lists of
[LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
(`vendor/ldnoobw/`, CC BY 4.0, commit 5faf2ba). They are read at build time only and never
reach a page.

Chinese readings derive from [CC-CEDICT](https://cc-cedict.org/) (CC BY-SA 4.0, `vendor/cedict/`).
Simplified and Traditional tables are [OpenCC](https://github.com/BYVoid/OpenCC)'s (Apache-2.0,
`vendor/opencc/LICENSE`). Japanese readings derive from the [Mozc](https://github.com/google/mozc)
open source dictionary (BSD 3-Clause, with the IPAdic and Okinawa dictionary notices:
`vendor/mozc/`). ICU's word segmentation (Unicode License) is the one in Node and the browser;
none of it is copied here. Those pages credit their sources in the footer.

### Building another language

```sh
curl -O https://dumps.wikimedia.org/hiwiki/latest/hiwiki-latest-pages-articles.xml.bz2
pnpm --filter @okb/dictionaries build:words -- --lang hi --dump "$PWD/hiwiki-latest-pages-articles.xml.bz2"
```

Large Wikipedias come in parts: pass them comma-separated to `--dump`. The build writes
`dict.txt` at the end; `pnpm --filter @okb/dictionaries compact` rewrites it alone.

### Quality gates

- **Roman typing** (`test/roman-langs.test.ts`, `pnpm --filter @okb/dictionaries eval`): top-1
  and top-5 on the test split, corrections per 10 words on held-out messages. Writes and
  checks `results/<scheme>.json`, which the site publishes. Rules are tuned on dev splits
  only. Languages below target are labelled Beta.
  - Dakshina's word samples reach into rare words: only about half the Hindi test words are
    among the 35,000 shipped, which caps accuracy there.
  - Arabic and Persian chat is colloquial, and the Wikipedia lists are formal.
  - Dhivehi, Sorani, Uyghur and Jawi are scored on English Wiktionary's word pairs, put into
    English keyboard letters by `src/import-wiktionary.ts`. These are spellings from each
    language's Latin alphabet, not chat collected from people, so they read higher than the
    Dakshina and Aksharantar scores and the two should not be compared. Jawi's word list comes
    from the same pairs, so its score says how well listed words are found, not how many are
    listed. Their held-out messages, and all of Dari's set, were written for this project and
    are not reviewed by native speakers.
  - The Arabic, Persian, Pashto, Shahmukhi, Saraiki, Balochi and Kashmiri sets were written
    for this project and are not yet reviewed by native speakers. Pashto, Shahmukhi,
    Saraiki, Balochi and Kashmiri have fewer than the planned 300 pairs; the site says so.
- **Spell check** (`test/spell-langs.test.ts`): misspellings flagged, right word in the top
  3, false flags on correct text, and wrong autocorrections. Writes and checks
  `results/spelling.json`. Spell check is on by default only where it flags at least 90 %,
  ranks the fix in the top 3 for at least 90 % and flags under 1 % of correct words;
  elsewhere it is offered as Beta, off. Autocorrect is offered only where, in addition,
  under 1 % of words would be changed wrongly, and it is on by default only for Urdu.
  - The Urdu misspellings were written for this project. The other languages' 50 each are
    **synthetic** (`src/make-misspellings.ts`: a common word with one typical slip) and
    need review by native speakers.
  - Correct words are the native side of the Roman evaluation sets, so Hindi, Bangla and
    Sindhi are measured on Dakshina's rare words, which their word lists often lack.
  - Latin languages are measured on 1,000 everyday Tatoeba sentences. Their false flags on
    held-out Wikipedia prose, full of names and jargon, are recorded too (`prose`: 1.3 to
    9.8 %). Words with a capital letter are names there and are not checked; plurals,
    feminines, adverbs and regular verb forms count as known when their base word is
    (`@okb/engine` spelling rules).
- **Smart accents** (`test/accents-eval.test.ts`): strips the accents from 2,000 held-out
  Wikipedia sentences and does what Space does. At least 97 % of the words that need one of
  the language's own accented letters must come back right (on Space, or in the top 3 of the
  bar when both spellings are words), and at most 0.5 % of the other words may change.
  Words with other languages' letters (Nações in Italian text) are counted apart, not
  scored. Writes and checks `results/accents.json`, which the site publishes; languages
  below the target are published as Beta, and the test fails if one that met it drops.
  Rules are chosen on development sentences, never on the test split: `src/dev-sentences.ts`
  takes them from the middle of a dump, far past what the word list reads, and
  `EVAL_DEV=…/{code}-dev.txt` scores them. German, Dutch, Swedish, Hungarian and Turkish
  words the list lacks are also tried as compounds of known words, or a known word and an
  ending (Gefäß + wänden, tárgyalás + ának).

## Urdu (`data/ur/`)

| File         | Contents                                                                |
| ------------ | ----------------------------------------------------------------------- |
| `words.txt`  | 100,000 words, most frequent first. The line number is the word's rank. |
| `next.txt`   | For the 10,000 most common words, the 6 words that most often follow.   |
| `stats.json` | Counts from the last build.                                             |

Words are stored without diacritics, with Urdu letter forms (ی ک ہ, not ي ك ه), so text
typed on any layout looks them up the same way.

### Source and licence

Built from the Urdu Wikipedia article dump of 1 October 2026
(`urwiki-latest-pages-articles.xml.bz2`, <https://dumps.wikimedia.org/urwiki/>).
Wikipedia text is © Wikipedia contributors under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The word lists are derived
from it, so **`data/ur/` is shared under CC BY-SA 4.0** too, with attribution to Urdu
Wikipedia. The site credits it in the page footer. The code in `src/` is part of this
project and not covered by that licence.

### Rebuilding

```sh
curl -O https://dumps.wikimedia.org/urwiki/latest/urwiki-latest-pages-articles.xml.bz2
pnpm --filter @okb/dictionaries build:ur -- --dump "$PWD/urwiki-latest-pages-articles.xml.bz2"
```

About 12 minutes and 1 GB of temporary disk (`--work`, default: the OS temp directory).
Needs `bzcat`. Steps: strip wiki markup, split sentences, drop repeated sentences (bot-made
stub articles repeat the same sentences millions of times), normalise and count words, then
count word pairs among the kept words. `--limit 3000` builds from the first pages only, for
a quick trial.

## Evaluation

```sh
pnpm --filter @okb/dictionaries eval:ur   # prints the misses
```

- `test/data/ur-roman-pairs.tsv`: 663 Roman → Urdu word pairs in chat spellings. Targets:
  top-1 ≥ 80 %, top-5 ≥ 95 %. The rules were tuned against this set.
- `test/data/ur-roman-messages.tsv`: 20 held-out chat messages (121 words), used only to
  measure the Phase 2 exit criterion: fewer than 1 correction per 10 words.

Both sets were written for this project.

## Typing practice without a word list

Brahui, Shina and Khowar have no Wikipedia. `data/<code>/practice-words.txt` holds English Wiktionary's entries in Arabic script (category `<Language> lemmas`, CC BY-SA 4.0), used only for typing practice, never for suggestions or spell check. Hindko has too few entries, so it has none.
