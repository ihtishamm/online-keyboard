"""Writes test/data/spellout-icu.tsv: numbers spelled out by ICU's rule-based number formatter
(the system's ICU 74, through ctypes) running CLDR's current spell-out rules for Urdu, Hindi,
Bangla and Indian English (Unicode License; ICU 74's own data has no Urdu or Bangla rules).

    python3 -I scripts/icu-spellout.py DIR

DIR holds ur.xml, hi.xml, bn.xml and en_IN.xml from
https://github.com/unicode-org/cldr/tree/main/common/rbnf (fetched 2026-11-07).
"""

import ctypes
import pathlib
import random
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
i18n = ctypes.CDLL("libicui18n.so.74")
UChar = ctypes.c_uint16
UNUM_PATTERN_RULEBASED = 9
UNUM_DEFAULT_RULESET = 6

i18n.unum_open_74.restype = ctypes.c_void_p
i18n.unum_open_74.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_int32, ctypes.c_char_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]
i18n.unum_setTextAttribute_74.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p, ctypes.c_int32, ctypes.POINTER(ctypes.c_int)]
i18n.unum_formatInt64_74.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]


def utf16(s: str):
    data = s.encode("utf-16-le")
    return (UChar * (len(data) // 2 + 1)).from_buffer_copy(data + b"\0\0"), len(data) // 2


def formatter(xml: str):
    # The spell-out group's rule text, as ICU reads it.
    group = re.search(r'type="SpelloutRules">\s*<rbnfRules><!\[CDATA\[(.*?)\]\]>', xml, re.S)
    rules, n = utf16(group.group(1))
    err = ctypes.c_int(0)
    fmt = i18n.unum_open_74(UNUM_PATTERN_RULEBASED, rules, n, b"und", None, ctypes.byref(err))
    if err.value > 0:
        raise RuntimeError(f"unum_open {err.value}")
    name, k = utf16("%spellout-cardinal")
    i18n.unum_setTextAttribute_74(fmt, UNUM_DEFAULT_RULESET, name, k, ctypes.byref(err))
    if err.value > 0:
        raise RuntimeError(f"default ruleset {err.value}")
    return fmt


def spell(fmt, n: int) -> str:
    buf = (UChar * 2000)()
    err = ctypes.c_int(0)
    k = i18n.unum_formatInt64_74(fmt, n, buf, 2000, None, ctypes.byref(err))
    if err.value > 0:
        raise RuntimeError(f"format {err.value}")
    return bytes(buf)[: 2 * k].decode("utf-16-le")


src = pathlib.Path(sys.argv[1])
# Every number to 1,000; then 1,000 more of every size up to 99 kharab, chosen by a fixed seed.
rng = random.Random(20261107)
numbers = list(range(0, 1001))
for digits in range(4, 14):
    numbers += [rng.randrange(10 ** (digits - 1), 10**digits) for _ in range(100)]
numbers += [10**k for k in range(3, 13)] + [10**5 + 1, 10**7 + 1, 10**9 + 1]
rows = []
for code in ["ur", "hi", "bn", "en_IN"]:
    fmt = formatter((src / f"{code}.xml").read_text("utf-8"))
    rows += [f"{code}\t{n}\t{spell(fmt, n)}" for n in numbers]
(ROOT / "test/data/spellout-icu.tsv").write_text(
    "# language, number, CLDR spell-out (main, 2026-11-07) run by ICU 74, by scripts/icu-spellout.py.\n"
    + "\n".join(rows)
    + "\n",
    "utf-8",
)
print(len(rows), "rows")
