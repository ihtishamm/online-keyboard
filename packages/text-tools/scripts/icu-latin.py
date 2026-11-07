"""Writes test/data/latin-icu.tsv: ICU's Latin-ASCII and de-ASCII transforms (Unicode License)
applied to the 400 most frequent words with a non-ASCII Latin letter in each language of the
dictionaries package, as an independent check of the diacritics remover's Latin side. Calls the
system's ICU 74 through ctypes; nothing else is needed.

    python3 -I scripts/icu-latin.py
"""

import ctypes
import pathlib
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
i18n = ctypes.CDLL("libicui18n.so.74")
UChar = ctypes.c_uint16


def utf16(s: str):
    data = s.encode("utf-16-le")
    return (UChar * (len(data) // 2 + 1)).from_buffer_copy(data + b"\0\0"), len(data) // 2


def open_transform(name: str):
    err = ctypes.c_int(0)
    buf, n = utf16(name)
    i18n.utrans_openU_74.restype = ctypes.c_void_p
    t = i18n.utrans_openU_74(buf, n, 0, None, 0, None, ctypes.byref(err))
    if err.value > 0:
        raise RuntimeError(f"utrans_openU {err.value}")
    return ctypes.c_void_p(t)


def run(t, s: str) -> str:
    cap = len(s) * 4 + 16
    data = s.encode("utf-16-le")
    buf = (UChar * cap).from_buffer_copy(data + b"\0" * (cap * 2 - len(data)))
    length = ctypes.c_int(len(data) // 2)
    limit = ctypes.c_int(len(data) // 2)
    err = ctypes.c_int(0)
    i18n.utrans_transUChars_74(t, buf, ctypes.byref(length), cap, 0, ctypes.byref(limit), ctypes.byref(err))
    if err.value > 0:
        raise RuntimeError(f"utrans_transUChars {err.value}")
    return bytes(buf)[: length.value * 2].decode("utf-16-le")


LATIN = ("Latin",)
latin_ascii = open_transform("Latin-ASCII")
de_ascii = open_transform("de-ASCII")
data = ROOT.parent / "dictionaries/data"
rows = []
for lang in sorted(p.name for p in data.iterdir()):
    f = data / lang / "words.txt"
    if not f.exists():
        continue
    taken = 0
    for line in f.read_text("utf-8").split("\n"):
        w = line.split("\t")[0].strip()
        if not w or w.isascii():
            continue
        # Latin letters, marks, apostrophes and hyphens only
        if not all(
            c in "'’-" or unicodedata.category(c).startswith("M") or "LATIN" in unicodedata.name(c, "")
            for c in w
        ) or not any("LATIN" in unicodedata.name(c, "") for c in w):
            continue
        de = run(de_ascii, w) if lang == "de" else ""
        rows.append(f"{lang}\t{w}\t{run(latin_ascii, w)}\t{de}")
        taken += 1
        if taken == 400:
            break
(ROOT / "test/data/latin-icu.tsv").write_text(
    "# language, word, ICU 74 Latin-ASCII, ICU 74 de-ASCII (German only), by scripts/icu-latin.py.\n"
    + "\n".join(rows)
    + "\n",
    "utf-8",
)
print(len(rows), "rows")
