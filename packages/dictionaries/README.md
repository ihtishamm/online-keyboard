# @okb/dictionaries

Word lists for prediction and Roman transliteration, and the pipeline that builds them.

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
