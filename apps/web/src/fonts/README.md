# Fonts made for this site

`noto-sans-spacing-accents.woff2` holds the four spacing accents (U+02CD ˍ, U+02D8 ˘,
U+02D9 ˙, U+02DB ˛) that dead keys type on their own on the Central European layouts.
Inter's web subsets leave them out, so `global.css` loads this file after Inter for those
characters only. They are cut from Noto Sans Regular (SIL Open Font License 1.1, `OFL.txt`):

```js
import subsetFont from "subset-font"; // npm, HarfBuzz
const woff2 = await subsetFont(notoSansRegularTtf, "ˍ˘˙˛", {
  targetFormat: "woff2",
});
```

`doulos-phonetic-symbols.woff2` is the IPA page's editor font: Doulos SIL 7.000
(software.sil.org/doulos, SIL Open Font License 1.1, `OFL-Doulos.txt`) cut to the 551
characters the IPA keyboard, its letter bar and sample can produce, plus ASCII and Latin-1 so
letters and their marks come from one font. Doulos is the only free font we found with every
character SIL's IPA keyboard types (the fontsource packages of Charis SIL and Noto Sans miss
over 100; Charis 6.1 misses the Unicode 14 modifier letters). "Doulos" and "SIL" are Reserved
Font Names, so the cut is renamed "Phonetic Symbols" (name IDs 1, 3, 4, 6, 16, 17, 21 and 22)
before it is cut, as the OFL requires of a modified font:

```js
// 1. rename: rewrite those name records in DoulosSIL-Regular.ttf, recompute the checksums
// 2. cut:
const woff2 = await subsetFont(renamedTtf, ipaCharacters, { targetFormat: "woff2" });
```

The character list is every key, rule (`before` and `add`) and long press of
`packages/layouts/languages/ipa/sil.json`, with `accents` and `sample` from its
`language.json`, U+25CC and typographic quotes and dashes. Cut it again when the IPA
keyboard gains characters: `src/fonts.test.ts` fails on any it cannot draw.

`noto-sans-zawgyi.woff2` draws Zawgyi on `/zawgyi-to-unicode`, where a Unicode font would garble
it. It is Noto Sans Zawgyi 14.0d3e4 (SIL Open Font License 1.1, `OFL-Noto-Zawgyi.txt`), from
github.com/saturngod/notosan-zawgyi, whose file merges it with Noto Sans for Latin. Cut to U+1000-109F, the spaces and the zero-width characters, 20 KB. Noto has no Reserved
Font Name, so it keeps its name:

```js
const woff2 = await subsetFont(notoZawgyiMergeTtf, myanmarBlock + spaces, {
  targetFormat: "woff2",
});
```
