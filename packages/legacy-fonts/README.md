# @okb/legacy-fonts

Legacy font encodings to Unicode and back (plan Phase 10, item 10.1). Each font is its own
entry point, so a page loads only its own table:

- `@okb/legacy-fonts/krutidev`: Kruti Dev 010 (and DevLys 010, which uses the same codes).

`src/glyph.ts` is the shared engine for "glyph" fonts, which store Latin-1 codes in the order
the glyphs are drawn: it maps codes with a table, then moves the short-i sign (ि) past the
cluster that follows it and the reph (र्) back before the syllable it sits on. Unlike the
classic converters, it moves both past whole clusters (स्थिति, मर्त्य, वर्ल्ड).

## Sources and how the tables were checked

### Kruti Dev 010 (checked 2026-11-07)

| Source | Use | Licence |
| --- | --- | --- |
| [hindi-font-converter](https://github.com/manishprajapatidev/hindi-font-converter) by Manish Prajapati, `js/kd.js` | The code → Unicode table our table starts from; its converter is the second reference in the tests (`test/reference/krutidev-classic.ts`) | MIT (`test/reference/LICENSE-hindi-font-converter`) |
| [Remington GAIL (SIL)](https://github.com/keymanapp/keyboards/tree/master/release/r/remington_gail) 1.1.1, `remington_gail.kmn` | Independent check of every key's letter (`test/reference/remington-gail.ts`) | MIT, SIL Global (`test/reference/LICENSE-remington-gail.md`) |
| Kruti Dev 010 font (freeware, not open licensed) | Every code drawn in the font beside our Unicode and compared by eye; **used for checking only, never copied or shipped** | — |

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
