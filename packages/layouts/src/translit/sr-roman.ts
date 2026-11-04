import { cyrillicScheme } from "./cyrillic";

/**
 * English letters → Serbian. This is Gajica, the Latin alphabet Serbian also writes in, one letter
 * for one letter: hvala, dobar dan. Typed without marks, c can be ц, ч or ћ, s can be с or ш, z can
 * be з or ж, and the word list decides; č ć đ š ž are read as they stand.
 */
export const SR_ROMAN = cyrillicScheme({
  id: "sr-roman",
  lang: "sr",
  extra: "čćđšž",
  letters: {
    lj: "љ лј:0.8",
    nj: "њ нј:0.8",
    dj: "ђ дј:0.8",
    dz: "џ дз:0.5",
    dž: "џ",
    ch: "ч ћ:0.2",
    sh: "ш",
    zh: "ж",
    č: "ч",
    ć: "ћ",
    đ: "ђ",
    š: "ш",
    ž: "ж",
    a: "а",
    b: "б",
    c: "ц ч:0.2 ћ:0.3",
    d: "д ђ:0.5",
    e: "е",
    f: "ф",
    g: "г",
    h: "х",
    i: "и",
    j: "ј",
    k: "к",
    l: "л",
    m: "м",
    n: "н",
    o: "о",
    p: "п",
    q: "к:0.5",
    r: "р",
    s: "с ш:0.2",
    t: "т",
    u: "у",
    v: "в",
    w: "в:0.3",
    x: "кс:0.3",
    y: "ј:0.3 и:0.8",
    z: "з ж:0.2",
  },
});
