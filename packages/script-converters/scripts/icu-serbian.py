"""Writes test/data/sr-icu.tsv: ICU's Serbian-Latin/BGN transform (Unicode License) applied to
the test sentences and the 20,000 most frequent words of the dictionaries package's sr/words.txt, as an independent check of
Cyrillic -> Latin. Calls the system's ICU 74 through ctypes; nothing else is needed.

    python3 -I scripts/icu-serbian.py
"""

import ctypes
import pathlib

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


t = open_transform("Serbian-Latin/BGN")
sentences = [l for l in (ROOT / "test/data/sr-sentences.txt").read_text("utf-8").split("\n") if l]
words = (ROOT.parent / "dictionaries/data/sr/words.txt").read_text("utf-8").split("\n")[:20000]
rows = [f"{s}\t{run(t, s)}" for s in sentences + words]
(ROOT / "test/data/sr-icu.tsv").write_text(
    "# Cyrillic, then ICU 74's Serbian-Latin/BGN, by scripts/icu-serbian.py.\n" + "\n".join(rows) + "\n",
    "utf-8",
)
print(len(rows), "rows")
