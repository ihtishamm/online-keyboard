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
