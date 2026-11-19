#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Glyph-Coverage Verifier for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

Ren'Py has no automatic font fallback: a code point missing from the font a text is drawn with renders as the font's
.notdef glyph (a tofu box). Every text in this game is drawn with one of the three bundled fonts (gui.rpy ->
game/fonts/*.otf), so every character in every displayed .rpy string must be in the cmap of all three of them.

    python tests/verify_glyphs.py          (from games/paper-crane-detective; verify_pc16.py also runs it)

What is checked:
  * the bundled fonts are exactly the ones gui.rpy points at, and no .rpy text switches to another font
    (`font` style property / `{font=}` text tag) -- otherwise the cmap check below would test the wrong font;
  * every character inside every string literal (comments excluded, escapes such as \\u2726 decoded) of every
    game/**/*.rpy is in the cmap of all three fonts -- CJK included, so a rare ideograph is caught as well;
  * not displayed, so not checked: `old` lines of `translate ... strings` blocks (the engine's English source text;
    config.language is "schinese") and the `new` lines whose source comment is renpy/common/_developer/* (Ren'Py's
    developer tools: Shift+D menu, image-load log -- disabled in release builds). Both are counted in the report.

The cmap is read with a small stdlib OpenType parser (no fontTools needed); when fontTools is importable the parsed
cmaps are cross-checked against fontTools' getBestCmap().

It also provides glyph_swap_only_files(): the zero-intrusion guards of verify_pc13..16 accept a protected UI module
(gameplay.rpy / options.rpy) that differs from HEAD *only* by the approved one-to-one symbol swap GLYPH_SWAP
(the two tofu symbols replaced by glyphs the fonts have) -- byte-exact after git's own eol normalisation, every
occurrence swapped, nothing else changed. Once that swap is committed HEAD has no source symbol left, so the guards
are exactly as strict as before.
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import re  # noqa: E402
import struct  # noqa: E402
import subprocess  # noqa: E402
import unicodedata  # noqa: E402
from pathlib import Path  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
FONT_DIR = GAME_DIR / "fonts"

# the approved one-to-one UI symbol swap (old symbol missing from all three fonts -> replacement all three fonts have)
GLYPH_SWAP = {
    "✦": "◆",  # BLACK FOUR POINTED STAR -> BLACK DIAMOND (separators, section / banner bullets, "new" dot)
    "✎": "※",  # LOWER RIGHT PENCIL -> REFERENCE MARK (note-card corner, evidence-back annotation heading)
}
# protected (byte-identical-to-HEAD) modules in which the swap was applied; main-story files are never listed here
GLYPH_SWAP_FILES = ("game/gameplay.rpy", "game/options.rpy")
_MAIN_STORY_PREFIXES = ("game/script.rpy", "game/chapter", "game/interlude.rpy", "game/definitions.rpy",
                        "game/tests/autoplay.rpy")
assert not any(f.startswith(_MAIN_STORY_PREFIXES) for f in GLYPH_SWAP_FILES), "main-story files never take the swap"

# same range verify_pc4..16 forbid in added lines (Emoji, Misc Symbols, Dingbats)
EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF☀-⛿✀-➿]")

DEV_TOOL_SOURCE = "renpy/common/_developer/"

LOG_REPORT = {}


################################################################################
# git helpers (zero-intrusion support)
################################################################################

def _git(*args, input_bytes=None, check=True):
    return subprocess.run(["git", *args], cwd=str(ROOT), input=input_bytes, capture_output=True, check=check)


def glyph_swap_only_files(root=None):
    """Files of GLYPH_SWAP_FILES that git sees as modified and whose content is exactly HEAD with GLYPH_SWAP applied
    (every occurrence, nothing else). Compared as git blob ids: `git hash-object <file>` applies the same clean / eol
    conversion `git add` would, the expected blob is hashed as-is -- so CRLF working copies compare like git status."""
    assert root is None or Path(root).resolve() == ROOT
    table = {ord(k): v for k, v in GLYPH_SWAP.items()}
    out = set()
    for rel in GLYPH_SWAP_FILES:
        if not _git("status", "--porcelain", "--", rel).stdout.strip():
            continue  # unchanged: the original byte-identical guard passes on its own
        head = _git("cat-file", "blob", f"HEAD:./{rel}", check=False)
        if head.returncode != 0:
            continue
        head_txt = head.stdout.decode("utf-8")
        if not any(k in head_txt for k in GLYPH_SWAP):
            continue  # nothing left to swap (already committed): any change is a real change
        expected = head_txt.translate(table).encode("utf-8")
        want = _git("hash-object", "--stdin", "--no-filters", input_bytes=expected).stdout.strip()
        got = _git("hash-object", "--", rel).stdout.strip()
        if want and want == got:
            out.add(rel)
    return out


################################################################################
# 1. Fonts: which ones, and their cmaps (stdlib OpenType parser)
################################################################################

# the subtable priority of fontTools' getBestCmap()
_CMAP_PREFS = [(3, 10), (0, 6), (0, 4), (3, 1), (0, 3), (0, 2), (0, 1), (0, 0)]


def _table(data, tag):
    if data[:4] == b"ttcf":
        raise AssertionError("font collections are not used by this game")
    num = struct.unpack(">H", data[4:6])[0]
    for i in range(num):
        rec = data[12 + 16 * i: 28 + 16 * i]
        if rec[:4] == tag:
            off, length = struct.unpack(">II", rec[8:16])
            return data[off: off + length]
    raise AssertionError(f"font has no {tag!r} table")


def _subtable_codepoints(t):
    fmt = struct.unpack(">H", t[:2])[0]
    cps = set()
    if fmt == 4:
        segx2 = struct.unpack(">H", t[6:8])[0]
        n = segx2 // 2
        ends = struct.unpack(f">{n}H", t[14: 14 + segx2])
        starts = struct.unpack(f">{n}H", t[16 + segx2: 16 + 2 * segx2])
        deltas = struct.unpack(f">{n}h", t[16 + 2 * segx2: 16 + 3 * segx2])
        ro_pos = 16 + 3 * segx2
        ranges = struct.unpack(f">{n}H", t[ro_pos: ro_pos + segx2])
        for i in range(n):
            for c in range(starts[i], ends[i] + 1):
                if c == 0xFFFF:
                    continue
                if ranges[i] == 0:
                    gid = (c + deltas[i]) & 0xFFFF
                else:
                    pos = ro_pos + 2 * i + ranges[i] + 2 * (c - starts[i])
                    gid = struct.unpack(">H", t[pos: pos + 2])[0]
                    if gid:
                        gid = (gid + deltas[i]) & 0xFFFF
                if gid:
                    cps.add(c)
    elif fmt == 12:
        ngroups = struct.unpack(">I", t[12:16])[0]
        for i in range(ngroups):
            s, e, g = struct.unpack(">III", t[16 + 12 * i: 28 + 12 * i])
            for c in range(s, e + 1):
                if g + (c - s):
                    cps.add(c)
    elif fmt == 0:
        cps.update(c for c, g in enumerate(t[6:262]) if g)
    else:
        raise AssertionError(f"unsupported cmap subtable format {fmt}")
    return cps


def font_cmap(path):
    """Code points the font maps to a real glyph (glyph id != 0), from its best Unicode cmap subtable."""
    cmap = _table(Path(path).read_bytes(), b"cmap")
    num = struct.unpack(">H", cmap[2:4])[0]
    subs = {}
    for i in range(num):
        pid, eid, off = struct.unpack(">HHI", cmap[4 + 8 * i: 12 + 8 * i])
        subs[(pid, eid)] = off
    for key in _CMAP_PREFS:
        if key in subs:
            return _subtable_codepoints(cmap[subs[key]:])
    raise AssertionError(f"{Path(path).name}: no Unicode cmap subtable")


def bundled_fonts():
    """The fonts gui.rpy assigns, which must be exactly the font files shipped in game/fonts."""
    gui = (GAME_DIR / "gui.rpy").read_text(encoding="utf-8-sig")
    used = set(re.findall(r'^define gui\.\w+_font = "(fonts/[^"]+)"', gui, re.M))
    shipped = {f"fonts/{p.name}" for p in FONT_DIR.iterdir() if p.suffix.lower() in (".otf", ".ttf", ".ttc")}
    assert used == shipped and len(shipped) == 3, f"gui.rpy fonts {sorted(used)} != shipped fonts {sorted(shipped)}"
    return sorted(shipped)


def check_fonts():
    fonts = bundled_fonts()
    cmaps = {f: font_cmap(GAME_DIR / f) for f in fonts}
    try:
        from fontTools.ttLib import TTFont  # optional cross-check
    except ImportError:
        cross = "fontTools not installed, stdlib parser only"
    else:
        for f, cps in cmaps.items():
            best = set(TTFont(str(GAME_DIR / f), lazy=True).getBestCmap())
            assert cps == best, f"{f}: stdlib cmap parser disagrees with fontTools ({len(cps)} vs {len(best)})"
        cross = "matches fontTools getBestCmap()"
    # no text may be drawn with any other font: style `font` properties name a gui.*_font or a bundled file,
    # and no `{font=...}` text tag / FontGroup points anywhere else
    n_font_refs = 0
    for p in sorted(GAME_DIR.rglob("*.rpy")):
        for ln in _code_lines(p.read_text(encoding="utf-8-sig")):
            for m in re.finditer(r'^\s*font\s+(\S+)', ln):
                n_font_refs += 1
                v = m.group(1).strip("\"'")
                assert re.fullmatch(r"gui\.\w+_font", v) or v in fonts, f"{p.name}: text drawn with another font: {ln.strip()}"
            for m in re.finditer(r"\{font=([^}]*)\}", ln):
                assert m.group(1) in fonts, f"{p.name}: {{font=}} tag with a non-bundled font: {ln.strip()}"
            assert "FontGroup" not in ln, f"{p.name}: a FontGroup needs its own glyph check: {ln.strip()}"
    inter = set.intersection(*cmaps.values())
    for new in GLYPH_SWAP.values():
        assert ord(new) in inter, f"swap target U+{ord(new):04X} is not in every bundled font"
        assert not EMOJI_RE.search(new), f"swap target U+{ord(new):04X} is in the forbidden Emoji/Dingbat range"
    LOG_REPORT["Fonts"] = "+".join(Path(f).stem for f in fonts)
    print(f"[PASS] Bundled fonts = gui.rpy fonts ({', '.join(Path(f).name for f in fonts)}; "
          f"{', '.join(str(len(c)) for c in cmaps.values())} code points; {cross}); {n_font_refs} style `font` "
          f"properties all point at them, no {{font=}} tag / FontGroup; swap targets "
          f"{' '.join(f'U+{ord(v):04X}' for v in GLYPH_SWAP.values())} in all three fonts and outside the Emoji range")
    return cmaps


################################################################################
# 2. Strings of every .rpy file
################################################################################

def _code_lines(src):
    """Lines with comments blanked out (string-aware), for the `font` property scan."""
    out, cur = [], []
    for kind, _line, text in _tokens(src):
        if kind == "code":
            cur.append(text)
        elif kind == "string":
            cur.append('"' + text.replace("\n", " ") + '"')
        if kind == "nl":
            out.append("".join(cur))
            cur = []
    out.append("".join(cur))
    return out


def _tokens(src):
    """Yield (kind, line_no, text) with kind in code / string / comment / nl. Strings: '...', "...", `...` and their
    triple-quoted forms (Ren'Py allows all of them; Ren'Py strings may span lines); escapes decoded unless raw."""
    i, n, line = 0, len(src), 1
    code_start = 0
    while i < n:
        c = src[i]
        if c == "\n":
            if code_start < i:
                yield "code", line, src[code_start:i]
            yield "nl", line, "\n"
            line += 1
            i += 1
            code_start = i
        elif c == "#":
            if code_start < i:
                yield "code", line, src[code_start:i]
            j = src.find("\n", i)
            j = n if j < 0 else j
            yield "comment", line, src[i:j]
            i = code_start = j
        elif c in "\"'`":
            if code_start < i:
                yield "code", line, src[code_start:i]
            k = i - 1
            while k >= 0 and src[k].isalpha():
                k -= 1
            prefix = src[k + 1:i].lower()
            raw = prefix in ("r", "rb", "br", "fr", "rf")
            q = c * 3 if src.startswith(c * 3, i) else c
            j, buf, start_line = i + len(q), [], line
            while True:
                assert j < n, f"unterminated string starting on line {start_line}"
                if src.startswith(q, j):
                    break
                ch = src[j]
                if ch == "\\" and not raw and j + 1 < n:
                    nx = src[j + 1]
                    m = re.match(r"u([0-9a-fA-F]{4})|U([0-9a-fA-F]{8})|x([0-9a-fA-F]{2})|N\{([^}\n]+)\}", src[j + 1: j + 90])
                    if m:
                        hexv = m.group(1) or m.group(2) or m.group(3)
                        buf.append(chr(int(hexv, 16)) if hexv else unicodedata.lookup(m.group(4)))
                        j += 1 + m.end()
                        continue
                    buf.append({"n": "\n", "t": "\t", "r": "\r"}.get(nx, nx))
                    if nx == "\n":
                        line += 1
                    j += 2
                    continue
                if ch == "\n":
                    line += 1
                buf.append(ch)
                j += 1
            yield "string", start_line, "".join(buf)
            i = code_start = j + len(q)
        else:
            i += 1
    if code_start < n:
        yield "code", line, src[code_start:]


def displayed_strings(path):
    """(line, text, exempt_reason) for every string literal of one .rpy file."""
    src = path.read_text(encoding="utf-8-sig")
    lines = src.split("\n")
    in_tl = "tl" in path.relative_to(GAME_DIR).parts[:1]
    last_source = ""
    source_by_line = {}
    for no, ln in enumerate(lines, 1):
        m = re.match(r"\s*#\s*(renpy/\S+|game/\S+)", ln)
        if m:
            last_source = m.group(1)
        source_by_line[no] = last_source
    out = []
    for kind, no, text in _tokens(src):
        if kind != "string":
            continue
        reason = ""
        if in_tl:
            head = lines[no - 1].lstrip()
            if head.startswith("old "):
                reason = "old"
            elif head.startswith("new ") and source_by_line[no].startswith(DEV_TOOL_SOURCE):
                reason = "devtool"
        out.append((no, text, reason))
    return out


def _is_cjk(ch):
    o = ord(ch)
    return (0x3400 <= o <= 0x4DBF or 0x4E00 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF or 0x20000 <= o <= 0x3134F)


def check_glyph_coverage(cmaps=None):
    cmaps = cmaps or check_fonts()
    inter = set.intersection(*cmaps.values())
    missing = []
    n_files = n_strings = 0
    chars, symbols = set(), set()
    exempt = {"old": 0, "devtool": 0}
    exempt_missing = set()
    for p in sorted(GAME_DIR.rglob("*.rpy")):
        rel = p.relative_to(ROOT).as_posix()
        n_files += 1
        for no, text, reason in displayed_strings(p):
            if reason:
                exempt[reason] += 1
                exempt_missing.update(ch for ch in text if ord(ch) not in inter and ch not in "\n\r\t")
                continue
            n_strings += 1
            for ch in text:
                if ch in "\n\r\t":
                    continue
                chars.add(ch)
                if ord(ch) > 0x7E and not _is_cjk(ch):
                    symbols.add(ch)
                if ord(ch) not in inter:
                    lacking = [Path(f).stem for f, c in cmaps.items() if ord(ch) not in c]
                    missing.append(f"{rel}:{no}: U+{ord(ch):04X} {unicodedata.name(ch, '?')} "
                                   f"(missing in {', '.join(lacking)}) in {text[:40]!r}")
    assert not missing, "Characters without a glyph in the bundled fonts (would render as tofu boxes):\n  " + \
        "\n  ".join(missing)
    for old in GLYPH_SWAP:
        assert old not in chars, f"U+{ord(old):04X} is still displayed somewhere"
    assert n_files >= 30 and n_strings > 5000, f"scanner found too little ({n_files} files, {n_strings} strings)"
    LOG_REPORT["GlyphCheck"] = f"{n_strings}strings/{len(chars)}chars/{len(symbols)}symbols"
    ex_chars = " ".join(f"U+{ord(c):04X}" for c in sorted(exempt_missing)) or "none"
    print(f"[PASS] Glyph coverage: {n_strings} displayed strings in {n_files} .rpy files, {len(chars)} distinct "
          f"characters ({len(symbols)} non-CJK symbols) all in the cmap of all three bundled fonts; not displayed, "
          f"not checked: {exempt['old']} translation `old` source strings + {exempt['devtool']} developer-tool "
          f"strings (their glyph-less characters: {ex_chars})")


def main():
    cmaps = check_fonts()
    check_glyph_coverage(cmaps)
    swapped = sorted(glyph_swap_only_files())
    print(f"[INFO] Protected modules differing from HEAD only by the approved symbol swap: {swapped or 'none'}")
    print("GLYPHS_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("GLYPHS_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
