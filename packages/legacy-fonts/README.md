# @okb/legacy-fonts

Legacy font encodings to Unicode and back (plan Phase 10, item 10.1). Each font is its own
entry point, so a page loads only its own table:

- `@okb/legacy-fonts/krutidev`: Kruti Dev 010 (and DevLys 010, which uses the same codes).
- `@okb/legacy-fonts/chanakya`: the font named Chanakya, plus `detectChanakyaFont`.
- `@okb/legacy-fonts/walkman`: Walkman Chanakya 905.

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
