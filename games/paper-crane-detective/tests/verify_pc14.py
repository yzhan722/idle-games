#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-14 Static, Behavioral, Pixel-Budget, Culture-Festival Haunted House "Seventh Shadow" Case (replayable,
rated, realistic: four lamps light -> silhouette -> timing -> lamp-holder), Main-Menu Extra-Story Chip Merge
into one grouped "番外卷宗" folio entry (6 rows -> 4 rows, wider gap to the progress badge), Folio Spoiler-Gate
& Unlock-Condition Parity (side-channel proof), Salon Accordion Sub-Bar (17 tabs / 5 groups, one-icon quint
pills for the 5-tab group), Asset & Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》
(games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's
init-python blocks inside the same mocked sandbox verify_pc13.py uses, plus the PC-14 module.
Nothing here depends on uncommitted changes: on a clean, committed checkout every check still runs.
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import copy  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
from pathlib import Path  # noqa: E402
from PIL import Image, ImageFont  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
NEW_MODULE = "game/zoetrope_shadow_folio.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import verify_pc12 as pc12  # noqa: E402
import verify_pc13 as pc13  # noqa: E402
import verify_glyphs as glyphs  # noqa: E402

extract_python_blocks = pc8.extract_python_blocks
_paren_delta = pc8._paren_delta
_w = pc9._w
_style_prop = pc9._style_prop
_cjk = pc9._cjk
_wb = pc10._wb
_read = pc10._read
_label_block = pc10._label_block
_sprite_slots_ok = pc10._sprite_slots_ok
_line_h = pc11._line_h
_lines = pc12._lines
_strings = pc13._strings
_persistent_snapshot = pc13._persistent_snapshot

PC14_UI_ICONS = [
    "images/ui/icon_haunted_house.png",
    "images/ui/icon_seventh_shadow.png",
    "images/ui/icon_flashlight.png",
    "images/ui/icon_festival_ticket.png",
    "images/ui/icon_extras_folio.png",
]

REQUIRED_UI_ICONS = pc13.REQUIRED_UI_ICONS + PC14_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC14_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

# every older extras module stays byte-identical (the folio and the case only *read* their data by name)
OLDER_EXTRAS_MODULES = pc13.OLDER_EXTRAS_MODULES + ["game/zephyr_relay_casebook.rpy"]
# older verifiers edited only for forward compatibility (counts / layout PC-14 legitimately changes)
FORWARD_COMPAT_TESTS = ["tests/verify_pc9.py", "tests/verify_pc10.py", "tests/verify_pc11.py", "tests/verify_pc12.py",
                        "tests/verify_pc13.py"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", ("library", "theater", "atelier", "sportsday", "haunted")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

# PC-13's main menu: 6 rows / 18 chips (ending 26px above the progress badge). PC-14 merges the five extra-story chips
# (the four replayable short cases + the case notebook) into ONE grouped folio entry and re-flows the keepsakes.
PC13_MAIN_MENU_ROWS = [
    ["mailbox", "teaparty", "lexicon", "music"],
    ["restoration", "letterbox", "radio", "origami"],
    ["planetarium", "badges", "library", "album"],
    ["theater", "capsule"],
    ["atelier", "wall"],
    ["sportsday", "notebook"],
]
MERGED_INTO_FOLIO = ["library", "theater", "atelier", "sportsday", "notebook"]
PC14_MAIN_MENU_ROWS = [
    ["mailbox", "teaparty", "lexicon", "music"],
    ["restoration", "letterbox", "radio", "origami"],
    ["planetarium", "badges", "album", "capsule"],
    ["wall", "folio"],
]
PC13_MENU_GAP = 26  # PC13_REPORT MainMenuColumn=30..647 (badge@673, gap 26)
FOLIO_CASE_TABS = ["library", "theater", "atelier", "sportsday", "haunted", "notebook"]
FOLIO_CASE_FUNCS = {  # tab -> (status function, solved counter) the folio card shows / the old chip showed
    "library": ("library_best_short", "library_case_solved_count"),
    "theater": ("theater_best_short", "theater_case_solved_count"),
    "atelier": ("atelier_best_short", "atelier_case_solved_count"),
    "sportsday": ("sports_best_short", "sports_case_solved_count"),
    "haunted": ("haunted_best_short", "haunted_case_solved_count"),
}
CASE_STORES = ["closed_library_record", "theater_script_record", "atelier_painting_record", "sports_lostfound_record",
               "case_notebook_record", "haunted_house_record"]

CJK_LINE = pc10.CJK_LINE
NAV_RIGHT = 60 + 280  # gui.navigation_xpos + navigation_button xsize

LOG_REPORT = {}

# Forward compatibility (PC-15+): later modules initialise after this one and legitimately append a 6th short case to the
# "closedlib" group (48px sext pills) and to the folio (the six cases fill the 2 x 3 grid, the casebook -- expanded to six
# pages -- moves to a full-width card below it), re-flow the main-menu chips (4 rows kept, every row moved clear of the
# navigation column) and add achievements 35-36. Those exact counts / widths are verified by their own milestone
# (verify_pc15); here the PC-14 contract is kept: its tab, folio entry, case cards, spoiler gates and module order.
# PC-16 appends a 7th short case (folio only: the seven cases and the seven-page casebook share one 2 x 4 grid, the
# full-width card goes away), moves the meteor-night tab into "starlit", deletes PC-13's unused four-tab casebook page and
# adds achievements 37-38 (verified by verify_pc16).
LATER_MODULES = ["zubenelgenubi_meteor_casebook.rpy", "zwembad_locker_casebook.rpy", "zymase_bakeoff_casebook.rpy"]
PC15_MAIN_MENU_ROWS = [
    ["mailbox", "teaparty", "lexicon", "music"],
    ["restoration", "letterbox", "origami"],
    ["radio", "planetarium", "badges"],
    ["album", "capsule", "wall", "folio"],
]


def _later_present():
    return [n for n in LATER_MODULES if (GAME_DIR / n).is_file()]


def _pc15_present():
    return (GAME_DIR / "zubenelgenubi_meteor_casebook.rpy").is_file()


def _pc16_present():
    return (GAME_DIR / "zwembad_locker_casebook.rpy").is_file()


def _pc17_present():
    """PC-17 appends an 8th short case (the baking-contest tab joins the "salon" group), expands the casebook to eight
    pages, puts the eight cases + the casebook into a 2 x 5 folio grid and adds achievements 39-40 (verify_pc17)."""
    return (GAME_DIR / "zymase_bakeoff_casebook.rpy").is_file()


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18, 19)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 38, 40, 84)}
    return f, sf


################################################################################
# 0. Sandbox (PC-13 sandbox + PC-14 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc13._sandbox_env()
    for k, v in {"haunted_house_record": {}, "haunted_selected_spot": "h1"}.items():
        setattr(mp, k, v)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    return env, mock_renpy, mock_ach, mp


def _folio_block(scr_src):
    return scr_src.split("screen extras_folio_modal(", 1)[1].split("\nscreen ", 1)[0]


def folio_header_sub(folio):
    """The folio's one-line header subtitle (12px, under the 22px serif title), parsed from the screen -- never assumed
    (shared with verify_pc15 / verify_pc16, so a copy edit is measured as written)."""
    m = re.search(r'text _\("番外卷宗"\) font gui\.name_text_font size 22 color "#fff1d6"\n +text _\("([^"]+)"\) size 12 ', folio)
    assert m, "Folio header subtitle not found"
    return m.group(1)


def folio_footer_hint(folio):
    """The folio's footer hint left of the 「合上卷宗」 pill (must still name the Esc key), parsed from the screen."""
    m = re.search(r'text _\("([^"]+)"\) size 12 color "#b39d7a" yalign 0\.5\n +textbutton _\("合上卷宗"\):', folio)
    assert m and "Esc" in m.group(1), "Folio footer hint (Esc key) not found"
    return m.group(1)


def measure_main_menu(env=None):
    """Parse screen main_menu's title column from screens.rpy and measure it at 1280x720 (shared with verify_pc10..13, 15).

    Returns the chip rows (extras_tab keys, "folio" for the grouped entry), every row's widest width and its left / right
    edge (title column x=568 + the xoffset of the row / of the vbox wrapping the rows, worst-case chip contents), the column's
    top / bottom against the progress badge, the PC-13 baseline (same column with PC-13's six rows) and the folio's
    card targets parsed from screen extras_folio_modal."""
    f, sf = _fonts()
    scr_src = _read("game/screens.rpy")
    blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    col = blk.split('style "main_menu_vbox"', 1)[1]
    # a chip row: `hbox:` + `xalign 0.5` (+ optional `xoffset N`) + `spacing N`, at any depth (PC-15 wraps the four rows in
    # one untransformed `vbox` carrying `xalign 0.5` + `xoffset N`, because the rows' ATL `at` transforms would drop a
    # child's own offset); a row's centre is the title column's x=568 plus those offsets, its width the chips plus the row
    # spacing (geometry parsed, never assumed)
    row_head_re = re.compile(r"^(?P<ind> +)hbox:\n(?P=ind)    xalign 0\.5\n(?:(?P=ind)    xoffset (-?\d+)\n)?(?P=ind)    spacing (\d+)\n", re.M)
    heads = list(row_head_re.finditer(col))
    head = col[:heads[0].start()]
    wrap = re.search(r"^        vbox:\n            xalign 0\.5\n            xoffset (-?\d+)\n", head, re.M)
    block_xoff = int(wrap.group(1)) if wrap else 0
    row_srcs = [col[m.end():(heads[i + 1].start() if i + 1 < len(heads) else len(col))] for i, m in enumerate(heads)]
    nulls = [int(n) for n in re.findall(r"^ +null height (\d+)$", col, re.M)]
    head_nulls = [int(n) for n in re.findall(r"^ +null height (\d+)$", head, re.M)]
    if env is None:
        env = _sandbox_env()[0]
    totals = {"lexicon": len(env["LEXICON_ENTRIES"]), "album": len(env["ALBUM_PHOTOS"]),
              "capsule": len(env["CAPSULE_ITEMS"]), "wall": len(env["WALL_CARDS"]), "folio": env["folio_total_count"]()}
    chip_pad = int(_style_prop(scr_src, "main_menu_cozy_chip", "padding").strip("()").split(",")[0])
    chip_re = re.compile(r'^(?P<ind> +)button:\n(?P=ind)    style "(\w+)"\n(?P=ind)    action (.+)\n((?:(?P=ind)    .*\n)+)', re.M)
    rows, row_w, styles, chip_w, left, right, centers = [], [], {}, {}, [], [], []
    for hm, rs in zip(heads, row_srcs):
        keys, widths = [], []
        xoff, row_sp = block_xoff + int(hm.group(2) or 0), int(hm.group(3))
        for m in chip_re.finditer(rs):
            style, action, body = m.group(2), m.group(3).strip(), m.group(4)
            if action == 'Show("extras_folio_modal")':
                key = "folio"
            else:
                mk = re.fullmatch(r'\[SetField\(persistent, "extras_tab", "(\w+)"\), ShowMenu\("extras"\)\]', action)
                assert mk, f"Unexpected main-menu chip action: {action}"
                key = mk.group(1)
            fmt = re.search(r'text (?:_\(|\()"([^"]+)"', body).group(1)
            size = int(re.search(r'text (?:_\(|\()"[^"]+".*? size (\d+) ', body).group(1))
            inner_sp = int(re.search(r"^ +spacing (\d+)$", body, re.M).group(1))
            icons = [int(x) for x in re.findall(r'add "images/ui/[^"]+\.png" xysize \((\d+), \d+\)', body)]
            text = fmt.replace("%d/%d", f"{totals.get(key, 99)}/{totals.get(key, 99)}")
            text = re.sub(r"%d/(\d+)", lambda mm: f"{mm.group(1)}/{mm.group(1)}", text)
            assert "%" not in text, f"Chip `{key}` format not measurable: {fmt}"
            if size not in f:
                f[size] = ImageFont.truetype(str(GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"), size)
            # padding x 2 + worst-case icons (all conditional ambience icons shown) + hbox spacing between items + text
            w = 2 * chip_pad + sum(icons) + inner_sp * len(icons) + _w(f[size], text)
            keys.append(key)
            widths.append(w)
            styles[key] = style
            chip_w[key] = w
        rows.append(keys)
        rw = sum(widths) + row_sp * (len(widths) - 1)
        row_w.append(rw)
        centers.append(568 + xoff)
        left.append(568 + xoff - rw / 2)
        right.append(568 + xoff + rw / 2)
    particle = round(96 * 0.52)
    fixed = (particle + _line_h(f[15]) + 2 * 2 + _line_h(sf[84]) + 2 * 10 + 10 + _line_h(sf[38]) + 2 * 3 + 10
             + _line_h(f[19]) + 2 * 2)

    def column(n_rows, null_sum):
        stack = fixed + n_rows * 30 + null_sum
        top = 0.29 * (720 - stack)
        return round(top), round(top + stack)

    badge_top = 720 - 14 - (2 * 5 + max(_line_h(f[15]), round(22 * 0.78)))
    top, bottom = column(len(rows), sum(nulls))
    base_top, base_bottom = column(len(PC13_MAIN_MENU_ROWS), sum(head_nulls) + 8 * (len(PC13_MAIN_MENU_ROWS) - 1))
    folio = _folio_block(scr_src)
    return {
        "rows": rows, "row_w": row_w, "styles": styles, "chip_w": chip_w, "left": left, "right": right, "centers": centers,
        "chips": [k for r in rows for k in r], "folio_tabs": re.findall(r'SetField\(persistent, "extras_tab", "(\w+)"\)', folio),
        "folio_dlc": re.findall(r'use extras_folio_dlc_card\("(\w+)"\)', folio),
        "top": top, "bottom": bottom, "badge_top": badge_top, "gap": badge_top - bottom,
        "base": {"top": base_top, "bottom": base_bottom, "gap": badge_top - base_bottom},
        "separators": nulls[len(head_nulls):],
    }


################################################################################
# 1. Python syntax & init order
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 32, f"Expected >=32 .rpy files (including zoetrope_shadow_folio.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-14 module must initialise after zephyr_relay_casebook.rpy so its 2 achievements append last
    assert names.index("zoetrope_shadow_folio.rpy") > names.index("zephyr_relay_casebook.rpy")
    later = _later_present()
    assert names[len(names) - 1 - len(later)] == "zoetrope_shadow_folio.rpy", (
        f"PC-14 module must initialise after every older top-level module: {names[-3:]}")
    assert names[len(names) - len(later):] == sorted(later), f"Only later milestones may follow PC-14: {names[-3:]}"

    total_blocks = total_inline = 0
    for rpy in rpy_files:
        for start_line, code, _is_init in extract_python_blocks(rpy):
            total_blocks += 1
            try:
                ast.parse(code, filename=f"{rpy.name}:{start_line}")
            except SyntaxError as exc:
                raise AssertionError(f"Python syntax error in {rpy.relative_to(ROOT)} block@{start_line}: {exc}") from exc
        lines = rpy.read_text(encoding="utf-8-sig").splitlines()
        idx = 0
        while idx < len(lines):
            s = lines[idx].strip()
            if s.startswith("$ "):
                lineno = idx + 1
                parts = [s[2:].strip()]
                depth = _paren_delta(parts[0])
                idx += 1
                while depth > 0 and idx < len(lines):
                    nxt = lines[idx].strip()
                    parts.append(nxt)
                    depth += _paren_delta(nxt)
                    idx += 1
                total_inline += 1
                try:
                    ast.parse("\n".join(parts), filename=f"{rpy.name}:{lineno}")
                except SyntaxError as exc:
                    raise AssertionError(f"Inline `$` syntax error in {rpy.relative_to(ROOT)}:{lineno}: {exc}") from exc
            else:
                idx += 1
    n_def = 0
    for ln in _read(NEW_MODULE).splitlines():
        m = re.match(r"^define (\w+)\s*=\s*(.+)$", ln)
        if m:
            ast.parse(f"{m.group(1)} = {m.group(2)}")
            n_def += 1
    assert n_def == 2
    # screen-language property / `use` / `text` expressions of the PC-14 code parse as Python
    n_expr = 0
    for ln in _read(NEW_MODULE).splitlines() + _read("game/extra.rpy").splitlines() + _read("game/screens.rpy").splitlines():
        m = re.match(r"^\s+(?:action|style) (.+?)\s*$", ln)
        if m and _paren_delta(m.group(1)) == 0 and not m.group(1).startswith('"'):
            ast.parse(m.group(1))
            n_expr += 1
        mu = re.match(r"^\s+use (extras_folio_\w+\(.*\))\s*$", ln)
        if mu:
            ast.parse(mu.group(1))
            n_expr += 1
    assert n_expr >= 100, n_expr
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines, {n_expr} screen expressions); "
          f"PC-14 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-14 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_SALON_TABS", ["teaparty", "lexicon"]), ("EXTRAS_BOOKSTREET_TABS", ["restoration", "letterbox"]),
                       ("EXTRAS_RADIO_ORIGAMI_TABS", ["radio", "origami"]), ("EXTRAS_STARLIT_TABS", ["planetarium", "badges"]),
                       ("EXTRAS_CLOSED_LIBRARY_TABS", ["library", "album"]),
                       ("EXTRAS_THEATER_CAPSULE_TABS", ["theater", "capsule"]),
                       ("EXTRAS_ATELIER_WALL_TABS", ["atelier", "wall"]),
                       ("EXTRAS_SPORTS_NOTEBOOK_TABS", ["sportsday", "notebook"]),
                       ("EXTRAS_HAUNTED_TABS", ["haunted"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 17 tabs in the same 5 groups, each exactly once; EVERY open state <= 702px.
    #     Group 4 now holds 5 tabs: one leading icon (the current tab's) + five 56px compact pills (salon_quint_pill).
    #     With PC-13's "icon per tab + 60px pill" rule that state would overflow (measured below: the reason for the change).
    sb = pc10.measure_salon_subbar()
    if _later_present():
        # PC-15+ may append tabs to a group (each PC-14 group keeps its tabs first, in order; widths re-measured)
        assert [g[0] for g in sb["groups"]] == [g for g, _t in SALON_GROUPS_EXPECTED], sb["groups"]
        for (gkey, gtabs), g in zip(SALON_GROUPS_EXPECTED, sb["groups"]):
            assert tuple(g[3])[:len(gtabs)] == gtabs, (gkey, g[3])
        assert len(sb["keys"]) == len(set(sb["keys"])) and set(SALON_KEYS) <= set(sb["keys"]), sb["keys"]
    else:
        assert [(g[0], tuple(g[3])) for g in sb["groups"]] == SALON_GROUPS_EXPECTED, sb["groups"]
        assert len(sb["keys"]) == len(set(sb["keys"])) == 17
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    labels = {g[0]: g[1] for g in sb["groups"]}
    assert labels == {"salon": "侦探社沙龙", "bookstreet": "旧书街与四季", "starlit": "电波与星空",
                      "closedlib": "放学后短案", "keepsake": "纪念与寄语"}, labels
    assert sb["quad"] == (4, 60, 4), f"Compact pill rule changed: {sb['quad']}"
    assert sb["quint"] == (5, 56, 4), f"Quint pill rule changed: {sb['quint']}"
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    assert sb["totals"]["haunted"] == 1
    pill = lambda t, mn, pad: max(mn, _w(f[11], t) + 2 * pad)  # noqa: E731
    grp = lambda lbl: max(66, _w(f[11], lbl) + 12)  # noqa: E731
    quint_tabs = [g for g in sb["groups"] if len(g[3]) >= 5]
    assert [g[0] for g in quint_tabs] == ["closedlib"]
    legacy = 0
    for gkey, glabel, _gi, gtabs in sb["groups"]:
        if gkey == "closedlib":
            legacy += sum(14 + 4 + pill(f"{sb['pills'][t][0]} 1/1", 60, 4) + 4 for t in gtabs)
        else:
            legacy += 14 + 4 + grp(glabel) + 4
    legacy -= 4
    assert legacy > 702, "If per-tab icons + 60px pills fit, the quint style would be unnecessary"
    widths = {pill(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}", 56, 4) for t in quint_tabs[0][3]}
    assert widths == {56}, f"Quint pills are not equal-width: {widths}"
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    assert "add salon_tab_icon(cur if cur in _gtabs else _gtabs[0]) xysize (14, 14) yalign 0.5" in blk
    assert 'style ("salon_quad_pill" if len(_gtabs) >= 4 else "bookstreet_subtab_pill")' in blk, "PC-13 quad rule must stay"
    report["SubBarWorst"] = sb["worst"]
    report["SubBarClosedlib"] = sb["per_group"]["closedlib"]
    report["SubBarIfPerTabIcons"] = legacy

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)
    avail = 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert sub_px <= avail and "侦探社沙龙" in sub
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "haunted_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- haunted-house page ----------------
    case = env["HAUNTED_CASE"]
    spots = env["HAUNTED_SPOTS"]
    links = env["HAUNTED_LAMP_LINKS"]
    tiers = env["HAUNTED_RATING_TIERS"]
    lanterns = env["HAUNTED_LANTERNS"]
    card_w = int(_style_prop(new_src, "haunted_spot_card", "xsize"))
    card_pad = int(_style_prop(new_src, "haunted_spot_card", "padding").strip("()").split(",")[0])
    assert "grid 3 2:" in new_src and len(spots) == 6
    assert 3 * card_w + 2 * 8 == console_inner, "Spot 3x2 grid must equal 694px"
    card_inner = card_w - 2 * card_pad
    widest_card = max_surface = 0
    for h in spots:
        line = _wb(f[11], f"{h['code']} · {h['label']}") + 4 + _wb(f[10], "已勘查")
        where = _w(f[10], f"位置 {h['where']}")
        widest_card = max(widest_card, line, where)
        assert line <= card_inner and where <= card_inner, f"Spot card `{h['label']}` overflows: {line}/{where}px"
        max_surface = max(max_surface, _lines(f[11], h["surface"], card_inner))
        head = _wb(f[12], f"{h['code']} · {h['label']}（经手：{h['keeper']}）")
        assert head <= console_inner - 20 - 20 - 8, f"Detail heading `{h['label']}` wraps: {head}px"
    assert max_surface <= 3, f"Spot surface text too long ({max_surface} lines)"
    report["SpotCard"] = widest_card
    slot_w = int(_style_prop(new_src, "haunted_lamp_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "haunted_lamp_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "haunted_lamp_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Lamp slots overflow"
    assert 'add Solid(k_obj["color"]) xysize (151, 3)' in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Lamp slot content too tall"
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Lamp short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    tier_w = int(_style_prop(new_src, "haunted_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["LanternTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "灯笼评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"
    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    hdr = 36 + 10 + 398 + hdr_right
    assert hdr <= console_inner, f"Haunted header overflows: {hdr}px"
    assert _w(sf[19], "文化祭鬼屋的第七个影子") <= 398
    for s in ("已结案 · 四盏灯已全部点亮 · 可随时重新走进鬼屋冲击金灯笼", "文化祭第一天，幕布后只站着六个人 · 第七个影子从哪来"):
        assert _w(f[12], s) <= 398, f"Haunted header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert 7 * 22 + 6 * 4 <= 178 and "xysize (22, 5)" in new_src and "for _si in range(7):" in new_src
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Haunted time-tag line overflows 492px: {tag_line}px"
    lamp = 15 + 6 + _w(f[12], "光影：" + case["lighting_note"])
    assert lamp <= 492, f"Haunted lighting line overflows: {lamp}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 六处勘查点全查完）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再走进鬼屋）")
    assert arch_solved <= 492 and arch_open <= 492, f"Haunted archive line overflows: {arch_solved}/{arch_open}px"
    report["HauntedTagLine"] = tag_line
    report["HauntedArchive"] = max(arch_solved, arch_open)
    margin_inner = console_inner - 2 * int(_style_prop(new_src, "haunted_margin_box", "padding").strip("()").split(",")[0])
    margin_head = (16 + 6 + _wb(f[12], "墨墨的页边续批 · 防剧透火漆") + 10
                   + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert margin_head <= margin_inner, f"Margin box header overflows: {margin_head}px"
    notice = _w(f[11], env["HAUNTED_MASK_NOTICE"])
    assert notice <= margin_inner, f"Mask notice wraps ({notice}px > {margin_inner}px)"
    assert _lines(f[12], case["margin_secret"], margin_inner) <= 3
    report["MaskNotice"] = notice
    footer = (_w(f[12], "零失误点亮四盏灯可获金灯笼 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
              + 8 + max(146, _w(f[15], "重新走进鬼屋") + 36, _w(f[15], "走进影子回廊") + 36))
    assert footer <= console_inner, f"Haunted footer overflows: {footer}px"
    report["HauntedFooter"] = footer
    quick = (20 + 10 + _w(sf[14], "番外卷宗 · 番外与短案合订本") + 10 + _w(f[12], "（已完成 8/8）")
             + 8 + max(84, _w(f[13], "翻开番外卷宗") + 22))
    assert quick <= 722 - 24, f"Folio quick row overflows: {quick}px"
    report["FolioQuickRow"] = quick

    # in-scene lamp banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "haunted_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "haunted_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728
    assert banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8, "Banner slot content too tall"
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "影子回廊 · 点亮四盏灯") + 8 + _w(f[11], "已点亮 4/4 · 失误只计入本案灯笼评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen haunted_lamp_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    shots_src = _read("game/tests/ui_shots.rpy")
    shot_prompt = re.search(r'Show\("haunted_lamp_banner", lamps_done=2, prompt_line="([^"]+)"\)', shots_src).group(1)
    assert shot_prompt == prompts[2][1], "ui_shots banner prompt must match the in-game third-lamp prompt"
    report["LampBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 608 - 28 = 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "鬼屋结案 · HH-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(lanterns) * 152 <= 608 and "xysize (152, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入鬼屋灯笼评级，不影响主线）",
              "首次结案 · 四盏灯已写入鉴赏室「文化祭鬼屋」分页，番外卷宗添上了第五桩短案",
              "重玩挑战 · 刷新个人纪录！这一次的四盏灯比以往任何一次都点得更稳",
              "重玩挑战 · 再次摘下金灯笼，鬼屋名侦探实至名归",
              "重玩挑战 · 零失误点亮四盏灯，就能把金灯笼挂上鬼屋出口"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    assert _w(f[13], case["mo_note_pub"]) <= 580, "Result-card mo note wraps"
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"HH-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(lanterns) * 173 <= 692 and "xysize (173, 3)" in new_src
    assert 6 + 8 + 658 <= 672 and "xsize 658" in new_src
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重新走进鬼屋") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- folio modal (screens.rpy): 760 - 2 x 24 = 712 = 2 x 350 + 12 ----------------
    panel_w = int(_style_prop(scr_src, "folio_panel", "xsize"))
    panel_pad = [int(x) for x in _style_prop(scr_src, "folio_panel", "padding").strip("()").split(",")]
    fcard_w = int(_style_prop(scr_src, "folio_card", "xsize"))
    fcard_h = int(_style_prop(scr_src, "folio_card", "ysize"))
    fcard_pad = [int(x) for x in _style_prop(scr_src, "folio_card", "padding").strip("()").split(",")]
    folio = _folio_block(scr_src)
    panel_inner = panel_w - 2 * panel_pad[0]
    # (PC-16 puts the seven cases and the casebook into one 2 x 4 grid; PC-14 / PC-15 use a 2 x 3 grid)
    grid_rows = int(re.search(r"^            grid 2 (\d+):$", folio, re.M).group(1))
    assert panel_inner == 2 * fcard_w + 12 == 712 and grid_rows == (5 if _pc17_present() else 4 if _pc16_present() else 3) and "xspacing 12" in folio
    assert fcard_w - 2 * fcard_pad[0] >= 34 + 10 + 278, "Folio card content wider than the card"
    text_w = 278
    assert round(15 * CJK_LINE) + 2 + round(11 * CJK_LINE) <= fcard_h - 2 * fcard_pad[1], "Folio card content too tall"
    statuses = ["待结案"] + [t["name"] for t in env["LIBRARY_RATING_TIERS"] + env["THEATER_RATING_TIERS"]
                             + env["ATELIER_RATING_TIERS"] + env["SPORTS_RATING_TIERS"] + tiers]
    case_titles = re.findall(r'use extras_folio_case_card\("[^"]+", _\("([^"]+)"\)', folio)
    assert len(case_titles) == 6 + len(_later_present()), case_titles
    widest_card_title = 0
    for t in case_titles:
        for st in statuses + ["复盘章 4/4"]:
            row = _w(sf[15], t) + 6 + _wb(f[12], st)
            widest_card_title = max(widest_card_title, row)
            assert row <= text_w, f"Folio card `{t}` + `{st}` overflows {text_w}px: {row}px"
    # (cards of later milestones are measured by their own verifier: their case data is not in this sandbox)
    case_lines = [env["folio_case_line"](v, u) for v, u in re.findall(r'folio_case_line\("(\w+)", "([^"]+)"\)', folio)
                  if v in env]
    # a full-width card (PC-15's expanded casebook, `wide=True`) is measured against its own 648px text column
    wide_lines = re.findall(r'use extras_folio_case_card\("[^"]+", _\("[^"]+"\), _\("([^"]+)"\).*, wide=True\)$', folio, re.M)
    case_lines += [ln for ln in re.findall(r'use extras_folio_case_card\("[^"]+", _\("[^"]+"\), _\("([^"]+)"\)', folio)
                   if ln not in wide_lines]
    assert len(case_lines) + len(wide_lines) == 6, (case_lines, wide_lines)
    assert len(wide_lines) == (0 if _pc16_present() else len(_later_present())), wide_lines
    for ln in wide_lines:
        assert int(_style_prop(scr_src, "folio_wide_card", "xsize")) == panel_inner
        assert _w(f[11], ln) <= panel_inner - 2 * fcard_pad[0] - 34 - 10, f"Wide folio card line overflows: {ln}"
    widest_line = max(_w(f[11], s) for s in case_lines)
    assert widest_line <= text_w, f"Folio card sub-line overflows: {widest_line}px"
    mp = env["persistent"]
    dlc_rows = []
    for cr in (0, 6):
        for te, conf in ((False, False), (False, True), (True, False)):
            mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = cr, te, conf
            for d in env["DLC_LIST"]:
                dlc_rows.append(env["folio_dlc_view"](d[0]))
    mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = 0, False, False
    widest_dlc = 0
    for v in dlc_rows:
        row = _w(sf[15], f"{v['badge']} · {v['title']}") + 6 + _wb(f[12], v["status"])
        widest_dlc = max(widest_dlc, row, _w(f[11], v["note"]))
        assert row <= text_w and _w(f[11], v["note"]) <= text_w, f"Folio DLC card overflows: {row}px / {v['note']}"
    report["FolioCardTitle"] = max(widest_card_title, widest_dlc)
    report["FolioCardLine"] = widest_line
    seal_w = max(max(96, _w(f[12], s) + 20) for s in ("火漆 · 已通关解封", "火漆 · 手动解封", "火漆 · 封存中"))
    f_head = (44 + 12 + max(_w(sf[22], "番外卷宗"), _w(f[12], folio_header_sub(folio)))
              + 10 + max(96, _w(f[12], "已完成 8/8") + 20) + 6 + seal_w)
    assert f_head <= panel_inner, f"Folio header overflows: {f_head}px"
    sections = re.findall(r'^            text _\("([^"]+)"\) size 12 color "#e8c88a" bold True$', folio, re.M)
    assert len(sections) == 2, sections
    for s in sections:
        assert _wb(f[12], s) <= panel_inner, s
    f_foot = (_w(f[12], folio_footer_hint(folio)) + 10
              + max(128, _w(f[14], "合上卷宗") + 36))
    assert f_foot <= panel_inner, f"Folio footer overflows: {f_foot}px"
    head_h = max(44, round(22 * CJK_LINE) + 2 + round(12 * CJK_LINE))
    sec_h = round(12 * CJK_LINE)
    f_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8
           + (grid_rows * fcard_h + (grid_rows - 1) * 8) + 8 + 34
           + len(wide_lines) * (fcard_h + 8))  # PC-15: the casebook's full-width card below the 2 x 3 case grid (PC-16: 2 x 4, no wide card)
    assert f_h <= 720 - 2 * 24, f"Folio modal taller than the window: {f_h}px"
    report["FolioHeader"] = f_head
    report["FolioFooter"] = f_foot
    report["FolioHeight"] = f_h

    # ---------------- main menu: 6 rows -> 4 rows, folio entry, gap to the progress badge widened ----------------
    mm = measure_main_menu(env)
    assert mm["rows"] == (PC15_MAIN_MENU_ROWS if _pc15_present() else PC14_MAIN_MENU_ROWS), mm["rows"]
    assert len(mm["rows"]) < len(PC13_MAIN_MENU_ROWS), "The merge must remove main-menu rows"
    assert mm["styles"]["folio"] == "main_menu_folio_chip" and [s for k, s in mm["styles"].items() if k != "folio"] == \
        ["main_menu_cozy_chip"] * 13
    assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
    assert mm["separators"] == [8, 8, 8], mm["separators"]
    for i, w in enumerate(mm["row_w"]):
        assert w <= 760, f"Main menu row {i + 1} wider than 760px: {w}px"
        if _pc15_present():
            # PC-15 re-flows the chips (4 + 3 + 3 + 4): no row may outgrow the first two, and EVERY row clears the nav column
            assert w <= max(mm["row_w"][:2]), f"Main menu row {i + 1} ({w}px) wider than rows 1-2"
            assert mm["left"][i] > NAV_RIGHT, f"Row {i + 1} ({mm['left'][i]:.0f}px) collides with the navigation column"
            continue
        if i >= 2:
            assert w <= mm["row_w"][1], f"Main menu row {i + 1} ({w}px) wider than row 2 ({mm['row_w'][1]}px)"
        if len(mm["rows"][i]) <= 2:
            assert 568 - w / 2 > NAV_RIGHT, f"Row {i + 1} ({568 - w / 2:.0f}px) collides with the navigation column"
    assert mm["base"]["gap"] == PC13_MENU_GAP, f"PC-13 baseline re-measured as {mm['base']}"
    assert mm["bottom"] + 12 <= mm["badge_top"] and mm["gap"] > PC13_MENU_GAP, mm
    assert mm["top"] >= 20, f"Main-menu column top {mm['top']}px too close to the window edge"
    fol = re.search(r'style "main_menu_folio_chip"\n(?:.*\n){7}', scr_src)
    assert fol and "main_title_in(0.80)" in scr_src and "main_title_in(0.86)" not in scr_src and "main_title_in(0.92)" not in scr_src
    assert int(_style_prop(scr_src, "main_menu_cozy_chip", "ysize")) == 30
    assert not re.search(r"^style main_menu_folio_chip is main_menu_cozy_chip:\n(?:    .*\n)*    (?:ysize|padding)", scr_src, re.M), \
        "The folio chip must keep the cozy chip's height / padding (row height unchanged)"
    report["MainMenuRows"] = f"{len(PC13_MAIN_MENU_ROWS)}->{len(mm['rows'])}"
    report["MainMenuRowWidths"] = "/".join(str(w) for w in mm["row_w"])
    report["MainMenuColumn"] = (f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['gap']}; "
                                f"PC-13 {mm['base']['top']}..{mm['base']['bottom']}, gap {mm['base']['gap']})")

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    n_ach = 34 + 2 * len(_later_present())  # PC-15 -> 2x18 = 36 (verified by verify_pc15); PC-14's 34 is the state before
    assert "grid 2 ach_grid_rows():" in ach_src and f"2×{n_ach // 2} = {n_ach}" in ach_src and f"2×{n_ach // 2} 共 {n_ach} 枚" in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_haunted_house", "ach_seventh_shadow"):
        m = re.search(rf'"{aid}",\s*"([^"]+)",\s*"([^"]+)"', new_src)
        assert m, f"Missing registration for {aid}"
        assert _w(sf[19], m.group(1)) <= ach_text_w and _w(f[14], m.group(2)) <= ach_text_w, f"{aid} copy wraps"

    LOG_REPORT.update(report)
    print("[PASS] 1280x720 pixel audit: "
          + ", ".join(f"{k}={v}" + ("" if isinstance(v, str) else "px") for k, v in report.items())
          + " | sub-bar per open group " + ", ".join(f"{g}={px}" for g, px in sb["per_group"].items())
          + " (all <=702)")
    return report, mm


################################################################################
# 3. Sandbox runtime: case, rating, spoiler gate, folio gating, read-only folio
################################################################################

def _case_block(src):
    m = re.search(r"^label haunted_house_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label haunted_house_case"
    return m.group(1)


# every lamp of the chain must be traceable to the clues it rests on (spot ids) and say so in its own words
LAMP_TRACE = {
    "k1": {"h3": "小窗", "h6": "照片"},
    "k2": {"h1": "排班表", "h4": "红纸"},
    "k3": {"h2": "粉色儿童票", "h5": "留言卡"},
    "k4": {"h1": "排班表", "h3": "小窗", "h4": "剪刀"},
}


def check_pc14_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 34 achievements (2x17), PC-14 pair appended after PC-13 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 34 and env["ach_grid_rows"]() == 17 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_sports_lostfound", "ach_case_notebook", "ach_haunted_house", "ach_seventh_shadow"], ach_ids[-4:]
    assert "ach_haunted_house" in mock_ach.registered and "ach_seventh_shadow" in mock_ach.registered

    # ---- B. case data ----
    case, spots, links, tiers = env["HAUNTED_CASE"], env["HAUNTED_SPOTS"], env["HAUNTED_LAMP_LINKS"], env["HAUNTED_RATING_TIERS"]
    assert case["label"] == "haunted_house_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert case["code"] == "HH-01" and case["code"] not in ("T-01", "L-01", "TH-01", "AT-01", "SD-01")
    assert [h["id"] for h in spots] == [f"h{i}" for i in range(1, 7)]
    assert [h["code"] for h in spots] == [f"HS-0{i}" for i in range(1, 7)]
    for h in spots:
        assert h["where"] and h["keeper"] and h["scene"] in env["BG_LIGHT"], h["id"]
        assert len(h["detail"]) >= 70 and h["evidence"] and h["surface"]
        assert env["EVIDENCE_DETAILS"][h["evidence"]] == (h["observer"], h["detail"]), f"{h['id']} flip detail not registered"
    assert len({h["evidence"] for h in spots}) == 6
    older_ev = ({h["evidence"] for h in env["LIBRARY_HOTSPOTS"]} | {h["evidence"] for h in env["THEATER_HOTSPOTS"]}
                | {h["evidence"] for h in env["ATELIER_HOTSPOTS"]} | {h["evidence"] for h in env["SPORTS_ITEMS"]})
    assert not older_ev & {h["evidence"] for h in spots}
    assert [k["name"] for k in links] == ["光源", "投影", "时机", "掌灯人"], "Four lamps: light -> silhouette -> timing -> lamp-holder"
    assert [k["step"] for k in links] == ["第一盏", "第二盏", "第三盏", "第四盏"]
    lant = {b["name"]: b["color"] for b in env["HAUNTED_LANTERNS"]}
    for k in links:
        assert lant[k["lantern"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
    assert len({k["color"] for k in links}) == 4, "Each lamp gets its own lantern colour"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金灯笼", "银灯笼", "铜灯笼"]
    older_tiers = set()
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS"):
        older_tiers |= {t["name"] for t in env[var]}
    assert not older_tiers & {t["name"] for t in tiers}, "Lantern rating must not reuse bookmarks / stubs / frames / stopwatches"
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]
    # realistic, traceable explanation: the report names the physical means, every lamp cites its clues,
    # and every clue is used by at least one lamp
    for word in ("手电", "剪", "竹签", "小窗", "六个人"):
        assert word in case["solution_pub"], f"Solution does not name `{word}`"
    for word in ("鬼魂", "灵异", "附身", "诅咒", "超自然"):
        assert word not in case["solution_pub"] + "".join(k["full"] for k in links), f"Supernatural wording `{word}`"
    used = set()
    for k in links:
        for hid, word in LAMP_TRACE[k["id"]].items():
            assert word in k["full"], f"{k['id']} does not cite {hid} (`{word}`)"
            used.add(hid)
    assert used == {h["id"] for h in spots}, f"Clues not used by the chain: {set(h['id'] for h in spots) - used}"
    public = "".join(str(case[k]) for k in case if k != "margin_secret") + str(spots) + str(links) + env["HAUNTED_MASK_NOTICE"]
    for kw in SECRET_KEYWORDS:
        assert kw not in public, f"Spoiler keyword `{kw}` in public haunted-house copy"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in case["margin_secret"]) >= 2, "The gated note should be endgame material"

    # ---- C. script structure: 6 spots -> four lamps -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "haunted_case_investigate")
    for i in range(1, 7):
        assert f"if not _hh_h{i}:" in inv and f'$ haunted_inspect_spot("h{i}")' in inv, f"spot h{i} not playable"
    assert inv.count("jump haunted_case_investigate") == 6 and "jump haunted_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"haunted_lamp_k{i}")
        assert f"show screen haunted_lamp_banner({i - 1}, " in kb
        assert kb.count("$ _hh_mistakes += 1") == 2 and kb.count(f"jump haunted_lamp_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _hh_lamps = {i}" in kb
        for m_wrong in re.finditer(r"\$ _hh_mistakes \+= 1(.*?)jump haunted_lamp_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct lamp always at the same menu slot: {correct_positions}"
    assert correct_positions not in ([2, 1, 0, 2], [1, 0, 2, 1], [0, 2, 1, 2], [1, 2, 0, 1]), \
        "Answer slots must not copy PC-10 / PC-11 / PC-12 / PC-13"
    assert "call _haunted_finish_case(_hh_mistakes)" in blk and "label haunted_case_resolution:" in blk
    assert blk.index("show screen evidence_book") < blk.index("label haunted_case_investigate:"), "Evidence HUD must be up first"
    assert "hide screen evidence_book" in _label_block(src, "_haunted_finish_case")
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the haunted-house case"
    assert "truth_spoiler_unlocked" not in blk, "The haunted-house script is fully public (only the page margin is gated)"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public haunted-house case"
    assert "幕布后面，从来都只有六个人" in blk and "手电" in blk and "剪纸" in blk, "Resolution must spell out the real mechanism"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"corridor", "classroom", "rooftop", "agency"} <= scenes_used, scenes_used
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"alice", "mo", "banzhang", "lin", "zhang", "huang"} <= cast, cast
    assert not cast & {"ningyou", "lele"}, "Sprite-less newcomers must never be `show`n"
    defs_src = _read("game/definitions.rpy")
    module_defines = dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", src, re.M))
    assert module_defines == {"ningyou": "宁柚", "lele": "乐乐"}, module_defines
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"banzhang", "lin", "zhang", "huang", "alice", "mo_note", "mc", "ningyou", "lele", "sysmsg"} <= speakers, speakers
    _sprite_slots_ok(blk, "haunted_house_case")
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_hh_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("haunted_house_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "haunted_house_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["haunted_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "haunted_house_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "haunted"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "HH-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_haunted_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_hh_h{i}"] is True for i in range(1, 7))
    assert env["_hh_mistakes"] == 8 and env["_hh_lamps"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {h["evidence"] for h in spots}
    assert env["haunted_get_record"]()["inspected"] == [f"h{i}" for i in range(1, 7)]
    assert env["haunted_inspect_spot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievements (gold run -> ach_seventh_shadow) ----
    assert [env["haunted_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.haunted_house_record = {}
    mock_ach.granted.clear()
    assert env["haunted_case_solved_count"]() == 0 and env["haunted_best_short"]() == "待结案"
    v0 = env["haunted_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["lamp_shorts"]) and not any(v0["lamp_fulls"])
    r = env["haunted_record_solve"](4)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_haunted_house") and not mock_ach.has("ach_seventh_shadow")
    r = env["haunted_record_solve"](1)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 1
    assert not mock_ach.has("ach_seventh_shadow")
    r = env["haunted_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and mock_ach.has("ach_seventh_shadow")
    r = env["haunted_record_solve"](3)
    assert not r["new_record"] and r["replays"] == 4 and r["best_tier"] == "gold" and r["last_tier"] == "bronze"
    assert env["haunted_gold_count"]() == 1 and env["haunted_best_short"]() == "金灯笼"
    v = env["haunted_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["lamp_shorts"] == [k["short"] for k in links]
    env["haunted_open_report_modal"]()
    assert env["haunted_get_record"]()["report_viewed"] and any(s[0] == "haunted_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    assert (env["library_case_solved_count"]() == 0 and env["theater_case_solved_count"]() == 0
            and env["atelier_case_solved_count"]() == 0 and env["sports_case_solved_count"]() == 0), "Older cases keep their stores"

    # ---- F. accordion sub-bar helpers (17 tabs / 5 groups) ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if t not in SALON_KEYS:
                continue  # PC-15+ tab: its counter lives in a later module (pill text verified by that milestone)
            txt = env["salon_tab_pill_text"](t)
            assert re.fullmatch(r"\S+ \d+/\d+", txt), f"pill text `{txt}`"
    assert env["salon_open_group"]("haunted") == "closedlib" and env["salon_tab_pill_text"]("haunted") == "鬼屋 1/1"
    assert env["salon_tab_icon"]("haunted").endswith("icon_haunted_house.png")
    saved_fn = env.pop("haunted_case_solved_count")
    assert env["salon_tab_pill_text"]("haunted") == "鬼屋", "Pill text must degrade gracefully"
    env["haunted_case_solved_count"] = saved_fn

    # ---- G. zero-side-channel spoiler gate on the page margin (strongest state: solved, gold) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for s in _strings(view):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` leaked in {where}"

    locked = env["haunted_render_view"]()
    _clean(locked, "haunted view")
    assert locked["display_secret"] == "" and locked["display_masked_notice"] == env["HAUNTED_MASK_NOTICE"] and not locked["unlocked"]
    saved_secret = case["margin_secret"]
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}", "续"):
        case["margin_secret"] = filler
        assert env["haunted_render_view"]() == locked, "Locked haunted view depends on the gated text"
        proofs += 1
    case["margin_secret"] = saved_secret
    mp.te_cleared = True
    un = env["haunted_render_view"]()
    assert un["unlocked"] and un["display_secret"] == saved_secret and un["display_masked_notice"] == ""
    mp.haunted_house_record = {}
    assert env["haunted_render_view"]()["display_secret"] == "", "Unsolved case must stay blank even when unlocked"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["haunted_render_view"]()["display_secret"] == ""
    env["haunted_record_solve"](2)
    assert "小雪" in env["haunted_render_view"]()["display_secret"]
    mp.truth_spoiler_confirmed = False
    assert env["haunted_render_view"]()["display_secret"] == ""

    # ---- H. folio: unlock conditions mirror the original entries, spoiler-gated titles, read-only, counts ----
    scr_src = _read("game/screens.rpy")
    extra_src = _read("game/extra.rpy")
    nav = scr_src.split("screen navigation(", 1)[1].split("\nstyle ", 1)[0]
    assert re.search(r'if persistent\.chapter_reached and persistent\.chapter_reached >= 1:\n\s+textbutton _\("章节选择"\) action ShowMenu\("chapter_select"\)', nav), \
        "Navigation unlock condition for chapter select changed"
    assert "if (dlc_need_te and not persistent.te_cleared)" in extra_src, "Chapter-select DLC spoiler prompt changed"
    dlcs = env["DLC_LIST"]
    assert [d[0] for d in dlcs] == ["dlc_alice_ledger", "dlc_mo_bookstreet"] and [d[6] for d in dlcs] == [False, True]
    n_states = 0
    for cr in (None, 0, 1, 3, 6):
        for te in (False, True):
            for conf in (False, True):
                mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = cr, te, conf
                is_open = bool(cr and cr >= 1)
                assert env["folio_chapter_select_open"]() is is_open
                unlocked = bool(te or conf)
                for d in dlcs:
                    fv = env["folio_dlc_view"](d[0])
                    n_states += 1
                    assert fv["open"] is is_open and fv["badge"] == d[1]
                    assert fv["masked"] is (d[6] and not unlocked)
                    assert fv["title"] == (env["FOLIO_DLC_MASKED_TITLE"] if fv["masked"] else d[2])
                    assert ("建议通关真结局后体验" in fv["note"]) is (is_open and d[6] and not te), (cr, te, conf, d[0], fv["note"])
                    if not is_open:
                        assert fv["status"] == "未开放" and "序章" in fv["note"]
                    if fv["masked"]:
                        _clean(fv, f"folio {d[0]}")
                        assert d[3] not in str(fv) and d[2] not in str(fv)
                    assert d[3] not in str(fv), "The folio never shows a DLC blurb"
                _clean(env["folio_seal_view"](), "folio seal")
    # side-channel: the locked view of a TRUE-END epilogue does not depend on its title or blurb
    mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = 6, False, False
    before = env["folio_dlc_view"]("dlc_mo_bookstreet")
    for filler in ("Y" * 200, "", "周可与小雪的第三只千纸鹤"):
        env["DLC_LIST"] = [d if not d[6] else (d[0], d[1], filler, filler, d[4], d[5], d[6]) for d in dlcs]
        assert env["folio_dlc_view"]("dlc_mo_bookstreet") == before, "Masked folio row depends on the epilogue title"
        proofs += 1
    env["DLC_LIST"] = dlcs
    assert env["folio_dlc_view"]("bogus")["title"] == "缺卷" and not env["folio_dlc_view"]("bogus")["open"]
    for v_, u_ in (("LIBRARY_CASE", "四环推理链"), ("THEATER_CASE", ""), ("HAUNTED_CASE", "四盏灯")):
        line = env["folio_case_line"](v_, u_)
        _clean(line, "folio case line")
        assert line.startswith(env[v_]["code"] + " 《" + env[v_]["short_title"] + "》")
    assert env["folio_case_line"]("NO_SUCH_CASE") == "----"
    # done count: two DLC flags + five solved cases + a full notebook = 8 = total; degrades gracefully
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.dlc_alice_done = False
    mp.dlc_mo_done = False
    # PC-15 adds a 6th short case to the folio; its counter lives in the later module (absent from this sandbox), so here it
    # can only count as "not done" -- exactly the graceful degradation checked below
    n_total = 8 + len(_later_present())
    assert env["folio_done_count"]() == 0 and env["folio_total_count"]() == n_total
    mp.dlc_alice_done = True
    assert env["folio_done_count"]() == 1
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve", "haunted_record_solve"):
        env[solve](1)
    assert env["folio_done_count"]() == 6
    for key in ("library", "theater", "atelier"):
        env["notebook_stamp"](key)
    assert env["folio_done_count"]() == 6, "A partly stamped notebook is not done"
    env["notebook_stamp"]("sportsday")
    mp.dlc_mo_done = True
    assert env["folio_done_count"]() == 8 and env["folio_total_count"]() == n_total
    saved_counter = env.pop("haunted_case_solved_count")
    assert env["folio_done_count"]() == 7, "A missing counter must count as not done, never crash"
    env["haunted_case_solved_count"] = saved_counter
    # read-only proof: every folio helper leaves every persistent field byte-identical
    snap_before = _persistent_snapshot(mp)
    n_ops = 0
    for _round in range(3):
        for d in dlcs + [("bogus",)]:
            env["folio_dlc_view"](d[0])
            n_ops += 1
        for v_ in ("LIBRARY_CASE", "THEATER_CASE", "ATELIER_CASE", "SPORTS_CASE", "HAUNTED_CASE", "NOPE"):
            env["folio_case_line"](v_, "x")
            n_ops += 1
        env["folio_done_count"]()
        env["folio_total_count"]()
        env["folio_seal_view"]()
        env["folio_chapter_select_open"]()
        n_ops += 4
    assert _persistent_snapshot(mp) == snap_before, "Folio helpers wrote persistent state"
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(GAME_DIR / "extra.rpy") if is_init)
    n_folio_fn = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("folio_"):
            n_folio_fn += 1
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Assign, ast.AugAssign)):
                    for t in (sub.targets if isinstance(sub, ast.Assign) else [sub.target]):
                        assert not (isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "persistent"), \
                            f"{node.name} writes persistent.{t.attr}"
                        assert not isinstance(t, ast.Subscript), f"{node.name} mutates a container in place"
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute):
                    assert sub.func.attr not in ("update", "append", "pop", "clear", "setdefault", "extend", "remove", "insert",
                                                 "save_persistent"), f"{node.name} calls .{sub.func.attr}()"
    assert n_folio_fn == 7, n_folio_fn

    # ---- I. folio screen & main menu wiring (static): the merged chips keep their exact old actions ----
    folio = _folio_block(scr_src)
    mm = measure_main_menu(env)
    assert mm["folio_dlc"] == [d[0] for d in dlcs], mm["folio_dlc"]
    expected_tabs = (FOLIO_CASE_TABS[:-1] + (["astro"] if _pc15_present() else []) + (["pool"] if _pc16_present() else [])
                     + (["bake"] if _pc17_present() else []) + FOLIO_CASE_TABS[-1:])
    assert mm["folio_tabs"] == expected_tabs, mm["folio_tabs"]
    for t in mm["folio_tabs"]:
        assert f'elif cur == "{t}":' in extra_src, f"extras() does not route folio tab `{t}`"
    for t, (status_fn, count_fn) in FOLIO_CASE_FUNCS.items():
        assert re.search(rf'{status_fn}\(\), {count_fn}\(\) > 0, SetField\(persistent, "extras_tab", "{t}"\), from_extras\)', folio), t
    assert re.search(r'notebook_stamped_count\(\) >= len\(NOTEBOOK_CASES\), SetField\(persistent, "extras_tab", "notebook"\), from_extras(?:, wide=True)?\)', folio)
    card = scr_src.split("screen extras_folio_case_card(", 1)[1].split("\nscreen ", 1)[0]
    assert 'action ([Hide("extras_folio_modal"), tab_action] + ([] if from_extras else [ShowMenu("extras")]))' in card
    dcard = scr_src.split("screen extras_folio_dlc_card(", 1)[1].split("\nstyle ", 1)[0]
    assert 'action ([Hide("extras_folio_modal"), ShowMenu("chapter_select")] if _dv["open"] else None)' in dcard
    for blk_ in (folio, card, dcard):
        assert not re.search(r"\$ persistent\.\w+\s*=", blk_) and "SetField(persistent, \"extras_tab\"" not in blk_.replace(
            'SetField(persistent, "extras_tab", "', ""), "Folio screens may only navigate"
        assert "Start(" not in blk_ and "Replay(" not in blk_, "The folio never launches a story directly"
        assert not re.findall(r"SetField\(persistent, \"(?!extras_tab)", blk_), "Folio screens may only set extras_tab"
    assert 'action Show("extras_folio_modal", from_extras=True)' in src
    pc13_keys = [k for r in PC13_MAIN_MENU_ROWS for k in r]
    for k in pc13_keys:
        assert (k in mm["chips"]) != (k in mm["folio_tabs"]), f"PC-13 chip `{k}` must be reachable exactly one way"
    assert [k for k in pc13_keys if k in mm["folio_tabs"]] == MERGED_INTO_FOLIO
    assert mm["chips"].count("folio") == 1 and "haunted" not in mm["chips"]
    main_blk = scr_src.split("screen main_menu():", 1)[1].split("\nstyle ", 1)[0]
    assert main_blk.count('Show("extras_folio_modal")') == 1

    # ---- J. reset_all_progress clears PC-14 state and leaves main-story vars alone ----
    mp.haunted_selected_spot = "h5"
    mp.extras_salon_group = "closedlib"
    env["reset_all_progress"]()
    assert env["haunted_case_solved_count"]() == 0 and mp.haunted_house_record == {} and mp.haunted_selected_spot == "h1"
    assert mp.extras_salon_group == "salon" and env["fail_count"] == 0 and env["mo_favor"] == 50

    data_cjk = _cjk(str({k: v for k, v in case.items() if k != "margin_secret"})) + sum(_cjk(str(h)) for h in spots) \
        + sum(_cjk(str(k)) for k in links)
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "SecretCJK": _cjk(case["margin_secret"]),
                       "CorrectSlots": [c + 1 for c in correct_positions], "FolioGateStates": n_states,
                       "FolioReadOnlyOps": n_ops, "SideChannelProofs": proofs})
    print(f"[PASS] PC-14 runtime: haunted-house case (script CJK={cjk_case}, data CJK={data_cjk}, 6 spots -> four lamps "
          f"light/silhouette/timing/lamp-holder, every lamp cites its clues, correct slots {[c + 1 for c in correct_positions]}, "
          f"8 gentle loops, fail_count untouched) | gold/silver/bronze lanterns + best-record replay ladder + "
          f"ach_haunted_house / ach_seventh_shadow (gold run only) | 34 achievements (2x17) | page-margin spoiler gate "
          f"(zero leak) | folio: {n_states} DLC states mirror the original chapter-select unlock + TE prompt, epilogue title "
          f"sealed, {n_ops} folio reads with every persistent field byte-identical, 8/8 done count | {proofs} side-channel proofs")
    return cjk_case


################################################################################
# 4. Zero intrusion, icons, text safety
################################################################################

def check_zero_intrusion_and_icons():
    # a protected UI module may differ from HEAD only by the approved tofu-symbol swap (verify_glyphs.GLYPH_SWAP,
    # byte-exact, every occurrence, nothing else); main-story files never qualify
    swapped = glyphs.glyph_swap_only_files()
    assert not swapped & set(MAIN_STORY_FILES)
    older = [m for m in OLDER_EXTRAS_MODULES if m not in swapped]
    if _pc16_present():
        # PC-16 deletes PC-13's four-tab casebook page (unused since PC-15) from zephyr_relay_casebook.rpy: that one older
        # module may differ from HEAD only by removed lines and added `##` comment lines (line-exact check: verify_pc16)
        older.remove("game/zephyr_relay_casebook.rpy")
        zd = subprocess.run(["git", "diff", "-U0", "--", "game/zephyr_relay_casebook.rpy"],
                            cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
        for ln in zd.stdout.splitlines():
            if ln.startswith("+") and not ln.startswith("+++"):
                assert not ln[1:].strip() or ln[1:].lstrip().startswith("##"), f"PC-13 module gained code: {ln}"
    res = subprocess.run(["git", "status", "--porcelain", "--", *MAIN_STORY_FILES, *older],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay / older extras modules were modified!\n{res.stdout}"
    diff = subprocess.run(["git", "diff", "--numstat", "--", *MAIN_STORY_FILES, *older],
                          cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert diff.stdout.strip() == "", "Main story / older module files have a diff"
    # whole-project guard: among *tracked* files only the PC-14 targets and the forward-compatible verifier edits may
    # differ from HEAD (untracked new files are not flagged; on a clean committed checkout nothing differs at all)
    allowed = set(PC14_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc14.py"]) | swapped
    if _pc15_present():
        allowed.add("tests/verify_pc15.py")  # PC-15's own verifier (tracked once PC-15 is committed)
    if _pc16_present():
        allowed.update({"game/zephyr_relay_casebook.rpy", "tests/verify_pc16.py"})  # PC-16 cleanup + its own verifier
    st = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no", "--", "."],
                        cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    stray = []
    for line in st.stdout.splitlines():
        rel = line[3:].strip().strip('"').split("paper-crane-detective/", 1)[-1]
        if rel not in allowed:
            stray.append(rel)
    assert not stray, f"Unexpected modified tracked files: {stray}"
    for bad in ("game/cache", "dists", "tests/__pycache__"):
        assert not (ROOT / bad).exists(), f"Build artefact {bad} present in the repo"
    assert not list(ROOT.rglob("*.rpyc")) and not list(ROOT.rglob("__pycache__")), "No .rpyc / __pycache__ may be created"

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC14_TOUCHED_FILES if p != NEW_MODULE], *FORWARD_COMPAT_TESTS],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw and not raw.startswith(b"\xef\xbb\xbf"), "PC-14 module must use LF line endings, no BOM"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src
    for rel in PC14_TOUCHED_FILES + ["tests/verify_pc14.py"]:
        assert b"\r\n" not in (ROOT / rel).read_bytes(), f"{rel} gained CRLF line endings"
    # whole new code (not just the uncommitted diff): the module and the main-menu column + folio screens
    # (this verifier itself is checked for Emoji in check_4_route_ending_regression)
    scr_new = _read("game/screens.rpy").split("screen main_menu():", 1)[1].split("\n## 游戏菜单", 1)[0]
    for name, txt in ((NEW_MODULE, new_src), ("screens.rpy main menu + folio", scr_new)):
        assert not EMOJI_RE.search(txt) and "<svg" not in txt.lower(), f"Emoji / SVG in {name}"

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every data-driven text that prints case / spot / folio copy opts out of interpolation
    folio_src = "\n".join(_read("game/screens.rpy").split("screen extras_folio_modal(", 1)[1].split("\nstyle folio_panel", 1)[:1])
    for ln in new_src.splitlines() + folio_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|HAUNTED_CASE|h_obj|k_obj|t_obj|r_obj|b_obj|_hs|_hv|_mv|_rv|_dv|_fseal|title|status|line|prompt_line)\b', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\[("[a-z_]+"|\d)\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"{len(OLDER_EXTRAS_MODULES)} older extras modules byte-identical incl. PC-13; only PC-14 targets + icons + "
          f"forward-compatible verifiers may differ from HEAD), no Emoji/SVG/tabs/CRLF, {n_str} interpolation-safe CJK data strings")

    verified = 0
    for rel_icon in REQUIRED_UI_ICONS:
        p = GAME_DIR / rel_icon
        assert p.is_file(), f"Missing icon game/{rel_icon}"
        with Image.open(p) as im:
            assert im.mode == "RGBA" and im.size == (128, 128), f"{rel_icon}: {im.mode} {im.size}"
            a = im.getchannel("A")
            corners = [a.getpixel((0, 0)), a.getpixel((127, 0)), a.getpixel((0, 127)), a.getpixel((127, 127))]
            assert all(c == 0 for c in corners), f"{rel_icon} corners {corners}"
            lo, hi = a.getextrema()
            assert lo == 0 and hi > 200
            if rel_icon in PC14_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-14 set: {', '.join(Path(x).name for x in PC14_UI_ICONS)}")


################################################################################
# 5. References / delimiters
################################################################################

def check_balanced_delimiters_and_references():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    screens = set(pc9.pc8_builtin_screens())
    labels = {"main_menu", "start", "splashscreen"}
    styles = set(pc9.pc8_builtin_styles())
    images = set()
    screen_re = re.compile(r"^\s*screen\s+([A-Za-z_]\w*)\s*\(")
    label_re = re.compile(r"^\s*label\s+([A-Za-z_]\w*)\s*(?:\(.*\))?\s*:")
    style_re = re.compile(r"^\s*style\s+([A-Za-z_]\w*)(?:\s+is\s+([A-Za-z_]\w*))?")
    image_re = re.compile(r"^\s*image\s+([A-Za-z0-9_\s]+?)\s*(?:=|:)")
    transforms = set()
    parents = []
    for rpy in rpy_files:
        for lineno, line in enumerate(rpy.read_text(encoding="utf-8-sig").splitlines(), 1):
            if (m := screen_re.match(line)):
                screens.add(m.group(1))
            if (m := label_re.match(line)):
                labels.add(m.group(1))
            if (m := style_re.match(line)):
                styles.add(m.group(1))
                if m.group(2):
                    parents.append((m.group(1), m.group(2), f"{rpy.name}:{lineno}"))
            if (m := image_re.match(line)):
                images.add(" ".join(m.group(1).split()))
            if (m := re.match(r"^\s*transform\s+([A-Za-z_]\w*)", line)):
                transforms.add(m.group(1))
    for child, parent, loc in parents:
        assert parent in styles, f"Style `{child}` inherits undefined `{parent}` at {loc}"

    for img in ("ui_icon_haunted_house", "ui_icon_seventh_shadow", "ui_icon_flashlight", "ui_icon_festival_ticket",
                "ui_icon_extras_folio"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_haunted_house", "haunted_report_modal", "haunted_lamp_banner", "haunted_result_card",
                "extras_folio_modal", "extras_folio_case_card", "extras_folio_dlc_card", "extras_achievements",
                "deduction_cutin", "evidence_book", "confirm", "chapter_select",
                *(() if _pc16_present() else ("extras_case_notebook",)),  # (PC-16 deletes PC-13's unused four-tab page)
                "extras_sports_lostfound"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("haunted_house_case", "haunted_case_investigate", "haunted_case_review_intro", "haunted_lamp_k1",
                "haunted_lamp_k2", "haunted_lamp_k3", "haunted_lamp_k4", "haunted_case_resolution",
                "_haunted_init_sandbox", "_haunted_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    for t in set(re.findall(r"\bat (\w+)", new_src)) | set(re.findall(r"\bat (folio_\w+)", scr_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    for t in ("haunted_lantern_sway", "folio_cover_sway"):
        assert t in transforms
    tint_re = r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)"
    tinted = re.findall(tint_re, new_src)
    assert len(tinted) == 2 and all((GAME_DIR / g).is_file() for g in tinted), tinted
    tinted_scr = re.findall(r"(?:hover_)?" + tint_re, scr_src)
    assert len(tinted_scr) >= 2 and all((GAME_DIR / g).is_file() for g in tinted_scr), tinted_scr
    blk = re.search(r"^style salon_quint_pill is bookstreet_subtab_pill:\n((?:    .*\n)+)", new_src, re.M).group(1)
    assert sorted(ln.split()[0] for ln in blk.strip().splitlines()) == ["padding", "xminimum"]
    assert re.search(r"^style salon_quint_pill_text is bookstreet_subtab_pill_text$", new_src, re.M)

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC14_TOUCHED_FILES:
        lines = _read(rel).splitlines()
        for i, ln in enumerate(lines):
            assert "\t" not in ln, f"Tab in {rel}:{i + 1}"
            if (m := style_prop_re.match(ln)):
                assert m.group(1) in styles, f"Undefined style `{m.group(1)}` at {rel}:{i + 1}"
            if (m := re.match(r'^\s*style \("(\w+)" if .* else "(\w+)"\)\s*$', ln)):
                assert m.group(1) in styles and m.group(2) in styles, f"Undefined conditional style at {rel}:{i + 1}"
            s = ln.strip()
            if not s or s.startswith("#"):
                continue
            code = ln.split("#", 1)[0].rstrip()
            if code.endswith(":") and _paren_delta(code) == 0:
                cur = len(ln) - len(ln.lstrip(" "))
                j = i + 1
                while j < len(lines) and (not lines[j].strip() or lines[j].strip().startswith("#")):
                    j += 1
                assert j < len(lines), f"Dangling block at EOF {rel}:{i + 1}"
                assert len(lines[j]) - len(lines[j].lstrip(" ")) > cur, f"Expected indented block after {rel}:{i + 1}"

    call_screen_re = re.compile(r"^\s*(?:call|show|hide)\s+screen\s+([A-Za-z_]\w*)\b")
    jump_call_re = re.compile(r"^\s*(?:jump|call)\s+([A-Za-z_]\w*)\b")
    use_re = re.compile(r"^\s*use\s+([A-Za-z_]\w*)\b")
    show_re = re.compile(r'\b(?:Show|Hide|ShowMenu)\(\s*["\']([A-Za-z_]\w*)["\']')
    show_screen_fn_re = re.compile(r'renpy\.show_screen\(\s*["\']([A-Za-z_]\w*)["\']')
    asset_re = re.compile(r'["\']((?:images|gui|audio|fonts)/[^"\'%\{\}\[\]]+\.(?:png|jpg|webp|ogg|otf|ttf))["\']')
    refs, missing, jumps = set(), [], 0
    for rpy in rpy_files:
        if "tl" in rpy.parts:
            continue
        for lineno, line in enumerate(rpy.read_text(encoding="utf-8-sig").splitlines(), 1):
            if line.strip().startswith("#"):
                continue
            if (m := call_screen_re.match(line)):
                assert m.group(1) in screens, f"Undefined screen {m.group(1)} at {rpy.name}:{lineno}"
                continue
            if (m := jump_call_re.match(line)) and m.group(1) != "expression":
                jumps += 1
                assert m.group(1) in labels, f"Undefined label {m.group(1)} at {rpy.name}:{lineno}"
            if (m := use_re.match(line)) and m.group(1) != "expression":
                assert m.group(1) in screens, f"Undefined `use {m.group(1)}` at {rpy.name}:{lineno}"
            for ms in list(show_re.finditer(line)) + list(show_screen_fn_re.finditer(line)):
                assert ms.group(1) in screens, f"Undefined screen {ms.group(1)} at {rpy.name}:{lineno}"
            for ma in asset_re.finditer(line):
                rel = ma.group(1)
                if rel.startswith("audio/voice/"):
                    continue
                refs.add(rel)
                if not (GAME_DIR / rel).is_file():
                    missing.append(f"{rel} ({rpy.name}:{lineno})")
    assert not missing, "Missing assets:\n  " + "\n  ".join(sorted(set(missing)))
    for icon in PC14_UI_ICONS:
        assert icon in refs, f"PC-14 icon {icon} is not wired into any .rpy"
    assert '"images/ui/icon_extras_folio.png"' in scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    audio_src = _read("game/audio.rpy")
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", audio_src), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", audio_src), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd

    extra_src = _read("game/extra.rpy")
    assert '"haunted_house_case":' in extra_src
    assert extra_src.count("or name in _HAUNTED_CASE_LABELS") == 2
    for older in ("_SPORTS_CASE_LABELS", "_ATELIER_CASE_LABELS", "_THEATER_CASE_LABELS", "_CLOSED_LIBRARY_LABELS"):
        assert extra_src.count(f"or name in {older}") == 2, f"{older} callback wiring must stay intact"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("haunted_house_record", "haunted_selected_spot"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld

    for rel in PC14_TOUCHED_FILES:
        src = _read(rel)
        stack, in_str, esc, i = [], None, False, 0
        while i < len(src):
            ch = src[i]
            if in_str:
                if esc:
                    esc = False
                elif ch == "\\":
                    esc = True
                elif src.startswith(in_str, i):
                    i += len(in_str) - 1
                    in_str = None
            else:
                if ch == "#":
                    while i < len(src) and src[i] != "\n":
                        i += 1
                    continue
                if src.startswith('"""', i) or src.startswith("'''", i):
                    in_str = src[i:i + 3]
                    i += 2
                elif ch in ('"', "'"):
                    in_str = ch
                elif ch in "([{":
                    stack.append(ch)
                elif ch in ")]}":
                    assert stack and stack[-1] == {")": "(", "]": "[", "}": "{"}[ch], f"Unbalanced `{ch}` in {rel} @{i}"
                    stack.pop()
            i += 1
        assert not stack, f"Unclosed delimiter in {rel}"

    print(f"[PASS] Balanced delimiters & reference registry ({len(screens)} screens, {len(labels)} labels, "
          f"{jumps} jumps/calls, {len(styles)} styles, {len(refs)} distinct asset refs)")


################################################################################
# 6. Four-ending regression & UI shot coverage
################################################################################

def check_4_route_ending_regression():
    env = {}
    for _ln, blk, _i in extract_python_blocks(GAME_DIR / "definitions.rpy"):
        if "def decide_ending" in blk:
            exec(blk, env)
            break
    assert "decide_ending" in env
    for name, state, exp in [
        ("best", {"mo_favor": 100, "kako_clue": 4, "truth_route": True, "fail_count": 0}, "ending_te"),
        ("no_truth", {"mo_favor": 100, "kako_clue": 4, "truth_route": False, "fail_count": 0}, "ending_he"),
        ("mixed", {"mo_favor": 66, "kako_clue": 4, "truth_route": True, "fail_count": 0}, "ending_ne"),
        ("worst", {"mo_favor": 30, "kako_clue": 0, "truth_route": False, "fail_count": 3}, "ending_be"),
    ]:
        env.update(state)
        assert env["decide_ending"]() == exp, f"Route {name}: expected {exp}"
    autoplay = (GAME_DIR / "tests" / "autoplay.rpy").read_text(encoding="utf-8-sig")
    for strat, exp in [("best", "ending_te"), ("no_truth", "ending_he"), ("mixed", "ending_ne"), ("worst", "ending_be")]:
        assert strat in autoplay and exp in autoplay

    shots = (GAME_DIR / "tests" / "ui_shots.rpy").read_text(encoding="utf-8-sig")
    pc14_shots = ("ui_14a_haunted_unsolved.png", "ui_14b_haunted_gold_masked.png", "ui_14c_haunted_unmasked.png",
                  "ui_14d_haunted_report.png", "ui_14e_haunted_lamp_banner.png", "ui_14f_haunted_result_card.png",
                  "ui_14g_folio_from_extras.png", "ui_14h_folio_main_locked.png", "ui_14i_folio_main_open.png")
    for shot in pc14_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_hh_rec")
    pc14_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc14_seg.index(s) for s in pc14_shots] == sorted(pc14_seg.index(s) for s in pc14_shots), "PC-14 shots out of order"
    assert shots.index("ui_13i_notebook_page_modal.png") < start, "PC-14 audit must run after the PC-13 block"
    assert pc14_seg.index("ui_14g_folio_from_extras.png") < pc14_seg.index('pause until screen "main_menu"') \
        < pc14_seg.index("ui_14h_folio_main_locked.png"), "Folio shots: once from the extras page, then from the main menu"
    for bad in ("ach_grant", "haunted_record_solve(", "haunted_inspect_spot(", "notebook_stamp(", "notebook_open_page(",
                "sports_record_solve(", "atelier_record_solve(", "theater_record_solve(", "library_record_solve(",
                "wall_pin(", "capsule_place(", "reset_all_progress"):
        assert bad not in pc14_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("haunted_house_record", "haunted_selected_spot", "extras_salon_group", "te_cleared",
                "truth_spoiler_confirmed", "chapter_reached"):
        assert f"persistent.{fld} = _saved_" in pc14_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-14 coverage ({len(pc14_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc14_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC14_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC14_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
