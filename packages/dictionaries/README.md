# @okb/dictionaries

Word lists for prediction and Roman transliteration, and the pipeline that builds them.

## Languages

Each language with a Wikipedia has `data/<code>/` built from its article dump (the latest
dumps, downloaded in October 2026; Urdu's source is described below):

| Code  | Wikipedia       | Pages   | Words read | Words kept | Shipped to the browser |
| ----- | --------------- | ------- | ---------- | ---------- | ---------------------- |
| `ur`  | Urdu            | 704,532 | 58.0M      | 100,000    | 40,000                 |
| `ar`  | Arabic          | 146,244 | 65.9M      | 100,000    | 40,000                 |
| `fa`  | Persian         | 210,065 | 61.6M      | 100,000    | 40,000                 |
| `ps`  | Pashto          | 23,433  | 13.3M      | 100,000    | 40,000                 |
| `sd`  | Sindhi          | 23,040  | 9.0M       | 66,700     | 40,000                 |
| `pnb` | Western Punjabi | 76,471  | 32.2M      | 100,000    | 40,000                 |
| `skr` | Saraiki         | 25,059  | 8.9M       | 70,705     | 40,000                 |
| `ks`  | Kashmiri        | 11,837  | 0.9M       | 21,396     | 21,396                 |
| `hi`  | Hindi           | 175,824 | 45.1M      | 100,000    | 35,000                 |
| `bn`  | Bengali         | 192,129 | 68.8M      | 100,000    | 35,000                 |

Balochi has no Wikipedia: its Roman typing runs on rules alone, and it has no suggestions or
spell check yet.

Files per language:

- `words.txt`, `next.txt`, `stats.json`: as for Urdu below.
- `dict.txt`: what the site downloads. The most common words and the next-word table for the
  3,000 commonest, front-coded (`src/compact.ts`, format in `@okb/engine`'s `compact.ts`).
  At most 150 KB gzipped: the word count shrinks in steps of 2,500 until it fits.
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
