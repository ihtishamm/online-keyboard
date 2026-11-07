# @okb/legacy-fonts

Legacy font encodings to Unicode and back (plan Phase 10, item 10.1). Each font is its own
entry point, so a page loads only its own table:

- `@okb/legacy-fonts/krutidev`: Kruti Dev 010 (and DevLys 010, which uses the same codes).
- `@okb/legacy-fonts/chanakya`: the font named Chanakya, plus `detectChanakyaFont`.
- `@okb/legacy-fonts/walkman`: Walkman Chanakya 905.
- `@okb/legacy-fonts/bijoy`: Bijoy, for SutonnyMJ and the other MJ fonts.
- `@okb/legacy-fonts/zawgyi`: Zawgyi, with automatic detection. It works differently from the
  others: see [Zawgyi](#zawgyi-checked-2026-11-07).

`src/glyph.ts` is the shared engine for "glyph" fonts, which store Latin-1 codes in the order
the glyphs are drawn: it maps codes with a table, then moves the short-i sign (ि) past the
cluster that follows it and the reph (र्) back before the syllable it sits on. Unlike the
classic converters, it moves both past whole clusters (स्थिति, मर्त्य, वर्ल्ड).

## Sources and how the tables were checked

### Kruti Dev 010 (checked 2026-11-07)

| Source                                                                                                                          | Use                                                                                                                                       | Licence                                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [hindi-font-converter](https://github.com/manishprajapatidev/hindi-font-converter) by Manish Prajapati, `js/kd.js`              | The code → Unicode table our table starts from; its converter is the second reference in the tests (`test/reference/krutidev-classic.ts`) | MIT (`test/reference/LICENSE-hindi-font-converter`)          |
| [Remington GAIL (SIL)](https://github.com/keymanapp/keyboards/tree/master/release/r/remington_gail) 1.1.1, `remington_gail.kmn` | Independent check of every key's letter (`test/reference/remington-gail.ts`)                                                              | MIT, SIL Global (`test/reference/LICENSE-remington-gail.md`) |
| Kruti Dev 010 font (freeware, not open licensed)                                                                                | Every code drawn in the font beside our Unicode and compared by eye; **used for checking only, never copied or shipped**                  | —                                                            |

What the checks found:

- **The font agrees with the classic table on every code but one:** `•` draws a bullet, not
  ऽ. The font also draws 13 codes the classic table lacks; we added the ones whose glyph is
  clear (£ ख्र, ó स्त्र, ù द्म, ¢ े, ¨ and ® ो, © ौ, ´ ञ, » ÷, Û •, ø {, Ÿ त्त्, ‐ .).
  HinLegacy's DevLys table (MIT) independently has ¢, ¨ and © with the same values. Eight
  codes whose glyph is unclear (¤ § Ú ð õ ö ˜ ›) are counted as unknown and shown as �.
- **The classic converter reads `pkS` as चै; the font draws चौ** (`pS` is चै). We follow the
  font. The classic reph moves past one letter only (oYMZ → वल्र्ड, eR;Z → मत्र्य).
- **Remington GAIL agrees on 67 of 84 keys:** every letter and vowel sign. The other 17 are
  number-row and punctuation keys where Kruti Dev keeps older positions (`=` is त्र, `` ` ``
  is ृ, `+` is the nukta, `A` is ।); each was checked against the font.
- **Hindi Wikipedia's 100,000 most frequent words:** 99,843 convert to Kruti Dev and back
  unchanged; 128 come back in canonical form (ा+ॅ → ॉ, ंं → ं, a nukta after ि moved
  before it); 29 use letters Kruti Dev lacks (ऎ ॆ ॄ ॠ ऌ).
- **Against the classic converter on the same words:** we read its output correctly except
  369 words, all classic faults or odd source spellings, each kind counted by a test (चै 88,
  reph or nukta 108, spelling 131, order 42).

### Chanakya and Walkman Chanakya 905 (checked 2026-11-07)

**Two encodings share the name, and the sources mix them up.** Text in the font named Chanakya
looks like `¥æ·¤æàæ`; Walkman Chanakya 905 is a Remington layout close to Kruti Dev, so the same
word is `vkdk'k`. `hindi-font-converter` reads the first; HinLegacy and lipi read the second,
calling it Walkman Chanakya 905. (lipi's `mappings/chanakya.py`, with A = अ and k = क, matches
neither font and is not used.) `detectChanakyaFont` compares Latin-1 codes with ASCII letters:
wrong on 331 of 200,000 single words, mostly very short ones, so the page also has a picker.

| Source                                                                                                                                                                                                                                               | Use                                                                                                                                             | Licence                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [hindi-font-converter](https://github.com/manishprajapatidev/hindi-font-converter), `js/ch.js`                                                                                                                                                       | Chanakya table; its decoder is the second reference (`test/reference/chanakya-classic.ts`). Its encoder half is 4C Gandhi code and was not used | MIT                                      |
| [HinLegacy](https://github.com/satvikmishra44/HinLegacy) by Satvik Mishra                                                                                                                                                                            | Second reference for Walkman (`test/reference/hinlegacy-walkman.ts`)                                                                            | MIT (`test/reference/LICENSE-hinlegacy`) |
| [lipi](https://github.com/aparsoft/lipi) by Aparsoft                                                                                                                                                                                                 | The Q hook, and words quoted from real PDFs (`test/walkman.test.ts`)                                                                            | MIT                                      |
| `Chanakya.ttf`, `WACN____.PFB` and `.PFM` (Walkman-Chanakya905Normal), from [Hindi-Fonts-Mega-Archive](https://github.com/mohammadgolamrabbii/Hindi-Fonts-Mega-Archive) and [ubiquitous-tribble](https://github.com/SinhmarKaran/ubiquitous-tribble) | Every code drawn and compared by eye; **used for checking only, never copied or shipped**                                                       | Not open licensed                        |

The Type 1 font was read as data, with a small reader that decrypts its outlines and draws them
to SVG; running it through Ghostscript would have executed it.

**Chanakya, by the font:**

- The font agrees with `ch.js` on nearly every letter and sign. It overrules it on `ì` and `¨`
  (िं, not ॄ or ङ्क्ष) and `í` (र् + ि, not ॢ), and adds `_` ट्ठ, `ö` ह्ण, `ø` ॰, `ú` ॐ, `š` ँ.
- `¤` and `U` draw the right-hand flag of क फ र ट and add nothing to the text; the font draws
  them the same wherever they fall, so the encoder writes the letter and flag together.
- **The font could not settle these, and they rest on `ch.js` alone:** `€ Ž ž` and bytes 0x81,
  0x8D, 0x8F, 0x90 have no glyph in this TTF. `v`–`~` and `®` draw other shapes here, where
  `ch.js` reads Latin digits; we keep `ch.js`. This TTF may not be the build `ch.js` was made for.
- **`0`–`9` follow the font, not `ch.js`:** they draw Latin digits here, where `ch.js` reads
  Devanagari ones. The number is the same either way. Encoding, ०–९ become 0–9.
- Unknown, shown as �: `$ : – › œ £ ² ½ Þ î ï û` and byte 0x9D. The soft hyphen, `ch.js`'s ऌ,
  can't be seen in the font and passes through.

**Walkman Chanakya 905, by the font:**

- It agrees with Kruti Dev on every ASCII letter and sign except `( ) / = _ Q`. `Q` draws only a
  hook: फ = `iQ`, ऊ = `mQ`, and क = `oQ` as well as `d`. Signs may sit between (`oqQ` = कु), so
  the hook is moved back before decoding. `/` is a whole ध, so `/k` is धा here but ध in Kruti Dev.
- Above 0x7F the fonts differ almost everywhere: `é` क, `Â` न्न, `¼` द्ध, `€` ल्ल, `ö`–`ÿ` are
  Devanagari digits. Only `ª ¡ ± Å Ø ç æ Ù á â ã è Ñ Ö` agree. HinLegacy keeps Kruti Dev's values
  for many of these codes; we follow the font.
- Half फ has no glyph, so फ् is written `iQ~`.
- Unknown, shown as �: `= Q ˆ “ š œ ¢ ¤ ¥ ¦ § ¨ © ³ ´ À Ã Ô Õ Û Ü ä ï õ`. They are decorative or
  unclear; `Q` counts only when no letter takes it.

**Hindi Wikipedia's 100,000 most frequent words:**

|                                                                         | Chanakya | Walkman 905 |
| ----------------------------------------------------------------------- | -------: | ----------: |
| Back unchanged                                                          |   99,812 |      99,850 |
| Back in canonical form (ा+ॅ → ॉ, ंं → ं, a nukta moved onto its letter) |      166 |         128 |
| Letters the font lacks (ऎ ॆ ऒ ॊ ॄ ॖ ऌ ॡ)                                |       22 |          22 |

**How the second reference reads our output:**

|                                                                  | Classic, Chanakya | HinLegacy, Walkman |
| ---------------------------------------------------------------- | ----------------: | -----------------: |
| Same word                                                        |  97,942 of 99,812 |   95,281 of 99,850 |
| Code read differently from the font                              |                53 |              4,086 |
| Nukta on the wrong letter (the classic turns every `¸` into फ़्) |             1,176 |                425 |
| Reph moved past one letter only                                  |               379 |                  8 |
| ः read as a colon                                                |               215 |                  0 |
| ऍ read as ए + ॅ                                                  |                46 |                 42 |
| Letter order                                                     |                 1 |                  8 |

A test classifies each disagreement and fails on anything else. The 4,086 are words where only
the font backs us: HinLegacy, the one Walkman table, follows Kruti Dev there.

**Not checked:** no real Chanakya document, and for Walkman only the words lipi quotes from real
PDFs. Everything else is text from our own encoder. Which publishers used which encoding is not
established by any source here, so the page doesn't say.

### Bijoy (checked 2026-11-07)

**Two spellings of the same text are in use, and the font settles which one to write.** Both
open tables and the font disagree on a handful of codes. Three copies of SutonnyMJ, all
(c) Mustafa Jabbar / Ananda Computers, draw the same glyphs, so this is not a font-version
accident in one file.

| Text           | SutonnyMJ draws | poriborton and bondhon write | That code in SutonnyMJ  |
| -------------- | --------------- | ---------------------------- | ----------------------- |
| স্ত ন্ত        | `¯Í` `šÍ`       | `¯—` `š—`                    | `—` is a ড়             |
| রু, the hook ু | `iæ`            | `i“`                         | `“` is a curl           |
| ম্ন            | `gœ`            | `æ`                          | `æ` is the hook ু       |
| স্ন            | `¯œ`            | `ø`                          | `ø` is a ল-ফলা          |
| ত্ম            | `Z¥`            | `Í`                          | `Í` is a ত-ফলা          |
| ণ্ড            | `Ð`             | `Ê`                          | `Ê` is a curl           |
| প্ল ল্ল শ্ল…   | `cø` `jø` `kø`  | `c−` `j−` `k−` or U+00AD     | `−` is a ণ্ড; no U+00AD |
| স্প ম্প ষ্প    | `¯ú` `¤ú` `®ú`  | `¯c` `¤c` `®c`               | Draws, but set loose    |

Decoding reads both. Encoding writes the left column, because the point of the output is to look
right under the font. Where one code means different things in the two spellings, the letter
before it decides: `æ` after a letter is ু (but `wbæ` is নিম্ন, as ু can't follow ি), on its own
ম্ন; `ø` after a letter is ল-ফলা, on its own স্ন; `Í` after a half form is ত-ফলা, on its own ত্ম.
`—` and `“` read as ্ত and ু after a letter, and as themselves anywhere else; `”` is half চ only
before a letter. `−` is ্ল after `c e k j M` and ণ্ড elsewhere.

| Source                                                                  | Used for                                                                                                                                                                                                    | Licence           |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [poriborton](https://github.com/OpenBangla/poriborton) (OpenBangla)     | Conjunct table and the kar-shape rules; its 742 pairs are the reference in the tests (`test/reference/poriborton-pairs.ts`)                                                                                 | MIT               |
| [bondhon](https://github.com/banglakit/bondhon) (BanglaKit)             | Second table. poriborton credits it, so the two are not fully independent; they agree on 226 of 231 shared entries                                                                                          | MIT               |
| [Bijoy2Unicode](https://github.com/JehadurRE/Bijoy2Unicode) (Md. Jehad) | Read only, not copied or run: its notes first showed the two spellings in real documents. It credits Mad-FOX/bijoy2unicode (MPL), which we reject, as initial inspiration, so nothing of it is in this repo | MIT               |
| `SUTOM.TTF` and two other copies of SutonnyMJ                           | Every code drawn and compared by eye, and every conjunct and kar the encoder writes; **used for checking only, never copied or shipped**                                                                    | Not open licensed |

Both tables only encode, so the decoder is the encoder's table inverted, plus the half forms and
subjoined forms the font draws. `¹` গ্ন and `º` গ্দ are in the font and in neither table; `ÿ` is
ক্ষ in the font, where poriborton has ড়্গ, which has no glyph and is written `o&M`.

**Kars.** ু has four shapes, ূ three, ৃ two, and ে and ৈ two each, picked from the letter before;
the rules are poriborton's, with `æ` for its `“`. `chooseKars` marks the shape with a private code
before the table runs. Where the font has no glyph for a conjunct, the hasanta shows (`&`) and the
letters stand apart, so ি goes before the last one: পঙ্ক্তি is `cO&w³`. `splitUnjoined` adds a ZWNJ
there, the Unicode for the same look, which is why those words come back with a ZWNJ. The engine's
`keepJoiners` lets `র‍্য` (`i¨`) stay apart from the reph of `র্য` (`h©`).

Unknown, shown as �: `@` (a decorative mark) and bytes 0x81, 0x8D, 0x8F, 0x90, 0x9D (no glyph).

**Bangla Wikipedia's 100,000 most frequent words:**

|                                                                    |  Words |
| ------------------------------------------------------------------ | -----: |
| Back unchanged                                                     | 99,742 |
| Back with a ZWNJ where the font shows the hasanta                  |    241 |
| Back in standard spelling (typing slips such as ে + া typed apart) |     13 |
| A stray nukta the font can't show                                  |      4 |
| Unchanged words that the classic spelling misreads                 |      2 |

**What was not done.** Only SutonnyMJ was checked, not the other MJ fonts. Bijoy2Unicode was read
but not run against our output, and no other clean Bijoy → Unicode decoder was found, so nothing
reads our decoder's input independently: its checks are the font, the real-word samples and
poriborton's pairs. Apart from those samples, the tests use text our own encoder produced, not
documents.

### Zawgyi (checked 2026-11-07)

**Zawgyi is a different kind of problem.** The other fonts here store Latin-1 codes that a table can
map. Zawgyi uses the Myanmar Unicode block itself, with some code points changed in meaning, and
stores letters in the order they are drawn. So `zawgyi.ts` converts with reordering rules, and it
can't tell the encoding from any one character: that takes a statistical detector.

- `src/translit.ts` is a small engine for ICU transform rules. It keeps ICU's semantics, including
  quantifiers that never backtrack.
- `src/zawgyi-rules.ts` is CLDR's rule text with our changes marked `# ours:`, so a diff against CLDR
  shows exactly what differs.
- `src/zawgyi-detect.ts` and `src/zawgyi-model.ts` are Google's detector and its trained model.
- Text is converted line by line, so `^` and `$` in the rules mean a line's ends, and a document with
  both encodings comes out right. A line sure of its own encoding (about 95% each way) goes by that;
  a shorter one follows the whole text.

| Source                                                                                                 | Used for                                                                                                                                 | Licence                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| CLDR `my-t-my-s0-zawgyi`, `my-t-my-d0-zawgyi`, at commit db90e4a7a9                                    | The rules, with the changes below                                                                                                        | Unicode License           |
| [myanmar-tools](https://github.com/google/myanmar-tools) (Google)                                      | The detector and model, adapted; its government text and expected scores in the tests. Its rules are CLDR's, so it is not a second table | Apache-2.0                |
| [Rabbit](https://github.com/Rabbit-Converter/Rabbit) (saturngod)                                       | The independent reference: its rule tables are read as data in the tests (`test/reference/rabbit-rules.json`). None of its code runs     | WTFPL                     |
| ICU 74.2 (system library)                                                                              | Proves `translit.ts`: its output is stored in `test/reference/icu-zawgyi.json`                                                           | Unicode License           |
| Noto Sans Zawgyi 14.0d3e4, via [saturngod/notosan-zawgyi](https://github.com/saturngod/notosan-zawgyi) | Draws Zawgyi on the page (cut to the Myanmar block, 20 KB), and the pixel check below                                                    | SIL Open Font License 1.1 |
| Zawgyi-One 4.30, via [saturngod/mmwebfonts](https://github.com/saturngod/mmwebfonts)                   | The real target font, compared by eye; **used for checking only, never copied or shipped**                                               | Not open licensed         |

**The engine is proven before the rules are questioned.** With CLDR's rules unchanged, it gives the
same output as real ICU, both ways, on 48,187 lines of text and 60,000 lines of random code points.
The one difference: ICU's negated sets also match at the end of a text, so ICU reads a lone `၀` as ဝ.

**What we changed, and why.** Each came from a disagreement between CLDR, Rabbit, real text and the
fonts. The ICU checks above used the rules as published.

| CLDR                                                                                          | Ours                                                                                        | Found by                            |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| `အခန္း ၄` → `အခန်း ၎`: a line ending in ၄, starting with it, or a ၄ after a sign, becomes ၎   | Only `၄င္း` is ၎င်း. Every other ၄ is four                                                  | Reading the rules, confirmed on ICU |
| `လား3` → `လာ3း`: a typo (`\1u36` for `ံ`) moves း past `u`, `3`, `6`                          | Fixed, and း now moves past ံ as intended                                                   | Reading the rules, confirmed on ICU |
| ၀ typed for ဝ stays a digit in `အ၀တ္`, `အပါအ၀င္`, `ဒုတိယ၀န္ႀကီး`                              | A ၀ with no digit beside it that touches a letter or sign is ဝ. On its own it stays a digit | Rabbit, on real text                |
| ေ goes after a stack, so `သန္ဓေသား` comes back `သန္ဓသေား`                                     | ေ before the stack, ligatures, ဿ and kinzi with ya-pin                                      | Round trip, Zawgyi-One              |
| Sorts `103B` as Unicode ya-pin, but in Zawgyi it is medial ra: `အလှပြင်` comes back `အလြှပင်` | Dropped                                                                                     | Round trip                          |
| Reads `ဣေႁႏၵ` with ေ between the two letters                                                  | Moves ြ and ေ past the stack together                                                       | Round trip                          |
| ည with lower signs, dots and ှ takes its short form                                           | Keeps the full ည where the font wants it (`ညူး`, `ညှိုး`, `ကြည့်`)                          | Pixel check, real text              |
| Wrong or unusual orders for `ရှိ`, `ယနေ့`, `ခန့်`, `တွေ့`, `နွေး`, `လျှံ`, `ရုပ်`, `ယာဉ်`     | The forms in real text: `ရွိ`, `ယေန႔`, `ခန္႔`, `ေတြ႕`, `ေႏြး`, `လွ်ံ`, `႐ုပ္`, `ယာဥ္`       | Real text                           |

Neither table was enough alone. Rabbit gets the first five right and CLDR doesn't. But Rabbit's
encoder puts the stack of `ကမ္ဘာ` and `ပုစ္ဆာ` under the wrong letter, and these words only look right
because its decoder undoes that. CLDR draws them correctly, in both fonts.

**Checks and numbers:**

|                                                                                          |                  |
| ---------------------------------------------------------------------------------------- | ---------------- |
| Real Zawgyi lines read the same as Rabbit                                                | 66 of 66         |
| The same lines, differing from stock ICU (all six are ၀ → ဝ)                             | 6 of 66          |
| Burmese Wikipedia words back unchanged through Zawgyi                                    | 23,386 of 23,573 |
| Of the 187 that change: fragments such as a virama with nothing after it                 | 69               |
| Of the 187: typing slips in the word list (`ကို်`, `ခဲဲ့`), which come back spelled well | 118              |
| Real Zawgyi words decoded, encoded again, and back exactly as typed                      | 321 of 419       |
| Detector scores equal to Google's own                                                    | 50 of 50         |
| Lines and sentences detected right: real Zawgyi, Unicode, and Zawgyi from our encoder    | 397 of 397       |
| Single words detected right, read alone: Unicode, Zawgyi                                 | 97.6%, 95.7%     |

Most of the 98 real words that re-encode differently are `ထုိ` against `ထို`, the same shape typed in
either order (real text has both about equally, and we keep CLDR's), or ၀ → ဝ, which is the fix.

The pixel check draws each word's Unicode in Noto Sans Myanmar and its Zawgyi in Noto Sans Zawgyi,
which share a design, and scores the overlap. It found most of the bugs above, but it is a way to
find them and not a grade: the forms real text uses for `ဖွဲ့` and `မှူး` score lower than Rabbit's
tidier ones, as Noto draws them apart, and Zawgyi-One draws them well. Where the two disagreed, real
text won.

**What was not done.** The real Zawgyi here is one sample: 66 lines from a Myanmar government site
and Rabbit's handful of test sentences, a few hundred words. Everything else is text from our own
encoder. No Burmese speaker has reviewed the output. Single words detected alone are the weak spot,
which is why the page has a Font list, and why a line too short to judge follows its document. The
paste path trusts a font named Zawgyi, so Unicode text set in such a font and too short to judge is
misread.
