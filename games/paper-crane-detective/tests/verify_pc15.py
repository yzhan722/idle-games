#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-15 Static, Behavioral, Pixel-Budget, Astronomy-Club "Meteor Night Missing Telescope" Case (replayable, rated,
realistic: four stars method -> whereabouts -> timing -> holder), Case-Notebook Expansion (4 -> 6 pages: haunted house +
meteor night, read-only, zero-write), Main-Menu Chip Re-flow (zero horizontal overlap with the navigation column, rows not
increased, badge gap kept), Folio Six-Case Layout, Salon Sub-Bar (18 tabs / 5 groups, 48px sext pills for the 6-tab group),
Spoiler-Gate (side-channel proof), Asset & Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》
(games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's init-python blocks
inside the same mocked sandbox verify_pc14.py uses, plus the PC-15 module.
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
NEW_MODULE = "game/zubenelgenubi_meteor_casebook.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import verify_pc12 as pc12  # noqa: E402
import verify_pc13 as pc13  # noqa: E402
import verify_pc14 as pc14  # noqa: E402
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

PC15_UI_ICONS = [
    "images/ui/icon_astro_club.png",
    "images/ui/icon_missing_telescope.png",
    "images/ui/icon_meteor_chart.png",
    "images/ui/icon_lens_cap.png",
    "images/ui/icon_star_lamp.png",
]

REQUIRED_UI_ICONS = pc14.REQUIRED_UI_ICONS + PC15_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC15_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

# every older extras module stays byte-identical (the casebook pages and the folio only *read* their data by name)
OLDER_EXTRAS_MODULES = pc14.OLDER_EXTRAS_MODULES + ["game/zoetrope_shadow_folio.rpy"]
# older verifiers edited only for forward compatibility (counts / layout PC-15 legitimately changes)
FORWARD_COMPAT_TESTS = ["tests/verify_pc9.py", "tests/verify_pc10.py", "tests/verify_pc11.py", "tests/verify_pc12.py",
                        "tests/verify_pc13.py", "tests/verify_pc14.py"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", ("library", "theater", "atelier", "sportsday", "haunted", "astro")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

# PC-14's main menu: 4 rows, 4 + 4 + 4 + 2 chips centred at x=568 with 12px-padded chips (18px icons, 13px text, 10px
# row spacing). Its first three rows start left of the navigation column's right edge (x=340): the bug PC-15 fixes.
PC14_MAIN_MENU_ROWS = pc14.PC14_MAIN_MENU_ROWS
PC14_CHIP = {"pad": 12, "icon": 18, "ambience": 15, "inner": 6, "size": 13, "row_sp": 10, "xoffset": 0}
PC14_MENU_GAP = 80  # PC14_REPORT MainMenuColumn=52..593 (badge@673, gap 80)
PC15_MAIN_MENU_ROWS = pc14.PC15_MAIN_MENU_ROWS
NAV_RIGHT = 60 + 280  # gui.navigation_xpos + navigation_button xsize
NAV_CLEARANCE = 12  # every chip row keeps at least this much air to the navigation column
HERO_BOOK_X = 900  # the title art's heroine holds a book from x~865; rows may not run further right than PC-14 did (+~3%)

FOLIO_CASE_TABS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "notebook"]
CASE_STORES = ["closed_library_record", "theater_script_record", "atelier_painting_record", "sports_lostfound_record",
               "case_notebook_record", "haunted_house_record", "astro_telescope_record"]
NOTEBOOK_KEYS = ["library", "theater", "atelier", "sportsday", "haunted", "astro"]

CJK_LINE = pc10.CJK_LINE

LOG_REPORT = {}

# Forward compatibility (PC-16+): later modules initialise after this one and legitimately append a 7th short case. PC-16
# moves the meteor-night tab from "closedlib" into the star-themed "starlit" group (the pool case takes its place, so the
# open "closedlib" state keeps six 48px sext pills), puts the seven cases and the seven-page casebook into one 2 x 4 folio
# grid (the full-width casebook card goes away), deletes PC-13's four-tab casebook page (unused since PC-15) and adds
# achievements 37-38. Those exact counts / widths are verified by their own milestone (verify_pc16); here the PC-15
# contract is kept: its tab, case, casebook pages, spoiler gates, main-menu re-flow and module order.
LATER_MODULES = ["zwembad_locker_casebook.rpy", "zymase_bakeoff_casebook.rpy"]
PC16_SALON_GROUPS = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges", "astro")),
    ("closedlib", ("library", "theater", "atelier", "sportsday", "haunted", "pool")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
# PC-17 adds the baking-contest tab to the two-tab "salon" group (verify_pc17)
PC17_SALON_GROUPS = [("salon", ("teaparty", "lexicon", "bake"))] + PC16_SALON_GROUPS[1:]


def _later_present():
    return [n for n in LATER_MODULES if (GAME_DIR / n).is_file()]


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
# 0. Sandbox (PC-14 sandbox + PC-15 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc14._sandbox_env()
    for k, v in {"astro_telescope_record": {}, "astro_selected_spot": "s1"}.items():
        setattr(mp, k, v)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    return env, mock_renpy, mock_ach, mp


def _pc14_menu_baseline(f, mm_now):
    """PC-14's chip rows re-measured with PC-14's chip metrics (texts taken from the current chips: PC-15 changed only
    the metrics and the row assignment, never a chip's text)."""
    scr_src = _read("game/screens.rpy")
    blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    fmts = {}
    chip_re = re.compile(r'^(?P<ind> +)button:\n(?P=ind)    style "(\w+)"\n(?P=ind)    action (.+)\n((?:(?P=ind)    .*\n)+)', re.M)
    for m in chip_re.finditer(blk):
        action, body = m.group(3).strip(), m.group(4)
        key = "folio" if action == 'Show("extras_folio_modal")' else re.search(r'"extras_tab", "(\w+)"', action).group(1)
        fmts[key] = (re.search(r'text (?:_\(|\()"([^"]+)"', body).group(1),
                     len(re.findall(r'add "images/ui/[^"]+\.png" xysize', body)))
    env = _sandbox_env()[0]
    totals = {"lexicon": len(env["LEXICON_ENTRIES"]), "album": len(env["ALBUM_PHOTOS"]),
              "capsule": len(env["CAPSULE_ITEMS"]), "wall": len(env["WALL_CARDS"]), "folio": 8}
    c = PC14_CHIP
    f13 = ImageFont.truetype(str(GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"), c["size"])
    rows = []
    for keys in PC14_MAIN_MENU_ROWS:
        widths = []
        for k in keys:
            fmt, n_icons = fmts[k]
            text = fmt.replace("%d/%d", f"{totals.get(k, 99)}/{totals.get(k, 99)}")
            text = re.sub(r"%d/(\d+)", lambda mm: f"{mm.group(1)}/{mm.group(1)}", text)
            icons = c["icon"] + c["ambience"] * (n_icons - 1)
            widths.append(2 * c["pad"] + icons + c["inner"] * n_icons + _w(f13, text))
        rw = sum(widths) + c["row_sp"] * (len(widths) - 1)
        rows.append((keys, rw, 568 + c["xoffset"] - rw / 2, 568 + c["xoffset"] + rw / 2))
    return rows


def _nav_column_extent():
    """Worst case (chapter select + hidden epilogue shown): primary 60 + null 6 + 7 x 50 + null 14 + quit 50, spacing 6."""
    scr_src = _read("game/screens.rpy")
    prim = int(_style_prop(scr_src, "navigation_primary_button", "ysize"))
    btn = int(_style_prop(scr_src, "navigation_button", "ysize"))
    sp = int(re.search(r"define gui\.navigation_spacing = (\d+)", _read("game/gui.rpy")).group(1))
    out = {}
    for name, n_btn in (("min", 5), ("max", 7)):  # 读档/设置/帮助/关于 + 鉴赏 (+ 章节选择 + 隐藏后日谈)
        children = 1 + 1 + n_btn + 1 + 1  # primary, null 6, buttons, null 14, quit
        h = prim + 6 + n_btn * btn + 14 + btn + sp * (children - 1)
        out[name] = (round((720 - h) / 2), round((720 + h) / 2))
    return out


################################################################################
# 1. Python syntax & init order
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 33, f"Expected >=33 .rpy files (including zubenelgenubi_meteor_casebook.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-15 module must initialise after zoetrope_shadow_folio.rpy (achievements append last, NOTEBOOK_CASES exists)
    assert names.index("zubenelgenubi_meteor_casebook.rpy") > names.index("zoetrope_shadow_folio.rpy")
    assert names.index("zubenelgenubi_meteor_casebook.rpy") > names.index("zephyr_relay_casebook.rpy")
    later = _later_present()
    assert names[-1 - len(later)] == "zubenelgenubi_meteor_casebook.rpy", f"PC-15 module must be the last top-level module: {names[-3:]}"
    assert names[len(names) - len(later):] == sorted(later), "Later milestones' modules initialise after PC-15's"

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
    assert n_def == 3
    # screen-language property / `use` / `text` / grid expressions of the PC-15 code parse as Python
    n_expr = 0
    for ln in _read(NEW_MODULE).splitlines() + _read("game/extra.rpy").splitlines() + _read("game/screens.rpy").splitlines():
        m = re.match(r"^\s+(?:action|style|xsize) (.+?)\s*$", ln)
        if m and _paren_delta(m.group(1)) == 0 and not m.group(1).startswith('"'):
            ast.parse(m.group(1))
            n_expr += 1
        mu = re.match(r"^\s+use (extras_folio_\w+\(.*\))\s*$", ln)
        if mu:
            ast.parse(mu.group(1))
            n_expr += 1
        mg = re.match(r"^\s+grid (\d+) (.+):$", ln)
        if mg:
            ast.parse(mg.group(2))
            n_expr += 1
    assert n_expr >= 160, n_expr
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines, {n_expr} screen expressions); "
          f"PC-15 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    zr_src = _read("game/zephyr_relay_casebook.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-15 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_SPORTS_NOTEBOOK_TABS", ["sportsday", "notebook"]), ("EXTRAS_HAUNTED_TABS", ["haunted"]),
                       ("EXTRAS_ASTRO_TABS", ["astro"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 18 tabs in the same 5 groups, each exactly once; EVERY open state <= 702px.
    #     Group 4 now holds 6 tabs: one leading icon + six 48px sext pills. With PC-14's 56px quint pills that state would
    #     overflow (measured below: the reason for the new style).
    sb = pc10.measure_salon_subbar()
    expected_groups = PC17_SALON_GROUPS if _pc17_present() else PC16_SALON_GROUPS if _pc16_present() else SALON_GROUPS_EXPECTED
    assert [(g[0], tuple(g[3])) for g in sb["groups"]] == expected_groups, sb["groups"]
    assert len(sb["keys"]) == len(set(sb["keys"])) == 18 + len(_later_present())
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    assert sb["quad"] == (4, 60, 4) and sb["quint"] == (5, 56, 4), (sb["quad"], sb["quint"])
    assert sb["sext"] == (6, 48, 4), f"Sext pill rule changed: {sb['sext']}"
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    assert sb["totals"]["astro"] == 1 and sb["totals"]["notebook"] == 6 + len(_later_present())
    pill = lambda t, mn, pad: max(mn, _w(f[11], t) + 2 * pad)  # noqa: E731
    six = [g for g in sb["groups"] if len(g[3]) >= 6]
    assert [g[0] for g in six] == ["closedlib"]
    with_quint = sb["per_group"]["closedlib"] + sum(pill(f"{sb['pills'][t][0]} 1/1", 56, 4) - pill(f"{sb['pills'][t][0]} 1/1", 48, 4)
                                                    for t in six[0][3])
    assert with_quint > 702, "If 56px quint pills fit six tabs, the sext style would be unnecessary"
    widths = {pill(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}", 48, 4) for t in six[0][3]}
    assert widths == {48}, f"Sext pills are not equal-width: {widths}"
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    assert 'style ("salon_sext_pill" if len(_gtabs) >= 6 else "salon_quint_pill")' in blk
    assert "add salon_tab_icon(cur if cur in _gtabs else _gtabs[0]) xysize (14, 14) yalign 0.5" in blk
    report["SubBarWorst"] = sb["worst"]
    report["SubBarClosedlib"] = sb["per_group"]["closedlib"]
    report["SubBarIfQuintPills"] = with_quint

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    assert _w(f[18], sub) + 2 * len(sub) <= 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "astro_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- meteor-night page ----------------
    case = env["ASTRO_CASE"]
    spots = env["ASTRO_SPOTS"]
    links = env["ASTRO_STAR_LINKS"]
    tiers = env["ASTRO_RATING_TIERS"]
    stars = env["ASTRO_STARS"]
    card_w = int(_style_prop(new_src, "astro_spot_card", "xsize"))
    card_pad = int(_style_prop(new_src, "astro_spot_card", "padding").strip("()").split(",")[0])
    assert "grid 3 2:" in new_src and len(spots) == 6
    assert 3 * card_w + 2 * 8 == console_inner, "Spot 3x2 grid must equal 694px"
    card_inner = card_w - 2 * card_pad
    widest_card = max_surface = 0
    for s in spots:
        line = _wb(f[11], f"{s['code']} · {s['label']}") + 4 + _wb(f[10], "已勘查")
        where = _w(f[10], f"位置 {s['where']}")
        widest_card = max(widest_card, line, where)
        assert line <= card_inner and where <= card_inner, f"Spot card `{s['label']}` overflows: {line}/{where}px"
        max_surface = max(max_surface, _lines(f[11], s["surface"], card_inner))
        head = _wb(f[12], f"{s['code']} · {s['label']}（经手：{s['keeper']}）")
        assert head <= console_inner - 20 - 20 - 8, f"Detail heading `{s['label']}` wraps: {head}px"
        assert _lines(f[12], s["detail"], console_inner - 20 - 28) <= 4, f"Detail of `{s['label']}` too long"
        assert (GAME_DIR / s["icon"]).is_file(), s["icon"]
    assert max_surface <= 3, f"Spot surface text too long ({max_surface} lines)"
    report["SpotCard"] = widest_card
    slot_w = int(_style_prop(new_src, "astro_star_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "astro_star_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "astro_star_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Star slots overflow"
    assert 'add Solid(k_obj["color"]) xysize (151, 3)' in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Star slot content too tall"
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Star short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    tier_w = int(_style_prop(new_src, "astro_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["StarTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "星等评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"
    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    assert 36 + 10 + 398 + hdr_right <= console_inner, "Meteor-night header overflows"
    assert _w(sf[19], case["title"]) <= 398
    for s in ("已结案 · 四颗星已全部连起 · 可随时重回天台冲击一等星", "双子座流星雨极大夜，三脚架上只剩空云台 · 望远镜去了哪"):
        assert _w(f[12], s) <= 398, f"Meteor-night header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert len(stars) * 40 + (len(stars) - 1) * 6 <= 178 and "xysize (40, 5)" in new_src
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Meteor-night time-tag line overflows 492px: {tag_line}px"
    assert 15 + 6 + _w(f[12], "光影：" + case["lighting_note"]) <= 492
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 勘查点全查完）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再回到天台）")
    assert arch_solved <= 492 and arch_open <= 492, f"Meteor-night archive line overflows: {arch_solved}/{arch_open}px"
    report["AstroTagLine"] = tag_line
    report["AstroArchive"] = max(arch_solved, arch_open)
    margin_inner = console_inner - 2 * int(_style_prop(new_src, "astro_margin_box", "padding").strip("()").split(",")[0])
    margin_head = (16 + 6 + _wb(f[12], "墨墨的页边续批 · 防剧透火漆") + 10
                   + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert margin_head <= margin_inner
    notice = _w(f[11], env["ASTRO_MASK_NOTICE"])
    assert notice <= margin_inner, f"Mask notice wraps ({notice}px > {margin_inner}px)"
    assert _lines(f[12], case["margin_secret"], margin_inner) <= 3
    footer = (_w(f[12], "零失误连起四颗星可获一等星 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
              + 8 + max(146, _w(f[15], "重回流星夜") + 36, _w(f[15], "走上天台") + 36))
    assert footer <= console_inner, f"Meteor-night footer overflows: {footer}px"
    report["AstroFooter"] = footer
    quick = (20 + 10 + _w(sf[14], "推理笔记复盘本 · 扩容收录本案") + 10 + _w(f[12], "（已盖复盘章 6/6）")
             + 8 + max(84, _w(f[13], "翻开复盘本") + 22))
    assert quick <= 722 - 24, f"Casebook quick row overflows: {quick}px"
    report["AstroQuickRow"] = quick

    # in-scene star banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "astro_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "astro_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728 and banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "流星夜 · 连起四颗星") + 8 + _w(f[11], "已连起 4/4 · 失误只计入本案星等评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen astro_star_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    shots_src = _read("game/tests/ui_shots.rpy")
    shot_prompt = re.search(r'Show\("astro_star_banner", stars_done=2, prompt_line="([^"]+)"\)', shots_src).group(1)
    assert shot_prompt == prompts[2][1], "ui_shots banner prompt must match the in-game third-star prompt"
    report["StarBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "流星夜结案 · MN-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(stars) * 152 <= 608 and "xysize (152, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入流星夜星等评级，不影响主线）",
              "首次结案 · 四颗星已写入鉴赏室「天文社流星夜」分页，复盘本扩容到了六页",
              "重玩挑战 · 刷新个人纪录！这一次的四颗星比以往任何一次都连得更稳",
              "重玩挑战 · 再次摘下一等星，流星夜名侦探实至名归",
              "重玩挑战 · 零失误连起四颗星，就能把一等星挂上天文社的星图"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    assert _w(f[13], case["mo_note_pub"]) <= 580 and _lines(f[13], case["alice_note_pub"], 580) <= 2
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"MN-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(stars) * 173 <= 692 and "xysize (173, 3)" in new_src and "xsize 658" in new_src
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重回流星夜") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- expanded casebook (3 x 2 index tabs over PC-13's page) ----------------
    nb_cases = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb_cases] == NOTEBOOK_KEYS
    pages = [env["notebook_render_page"](n["key"]) for n in nb_cases]
    assert all(p["available"] for p in pages), "Every casebook page must find its case module in the sandbox"
    page_inner = 722 - 2 * int(_style_prop(zr_src, "notebook_page_card", "padding").strip("()").split(",")[0])
    assert page_inner == 694
    cn = env["casebook_count_cn"](len(nb_cases))
    assert cn == "六"
    for s in (f"{cn}枚复盘章已全部盖好 · 下次遇到怪事，先翻这本本子。", "TRUE END 已通关 · 复盘本页边的续批已全部显影。",
              "已手动开启剧透许可 · 复盘本页边的续批当前可见。", f"{cn}桩短案的证物与推理 · 涉终章的页边续批由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Casebook header line wraps ({_w(f[12], s)}px): {s}"
    cb_hdr = (36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "复盘章 6/6") + 20) + 6
              + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert cb_hdr <= page_inner, f"Casebook header overflows: {cb_hdr}px"
    report["CasebookHeader"] = cb_hdr
    idx_w = int(_style_prop(new_src, "casebook_index_tab", "xsize"))
    assert re.search(r"^style casebook_index_tab is notebook_index_tab:\n    xsize 234\n\n", new_src, re.M), \
        "The expanded index tab may only widen PC-13's tab (same height, padding, colours)"
    idx_h = int(_style_prop(zr_src, "notebook_index_tab", "ysize"))
    idx_pad = [int(x) for x in _style_prop(zr_src, "notebook_index_tab", "padding").strip("()").split(",")]
    assert "grid 3 casebook_index_rows():" in new_src and 3 * idx_w + 2 * 10 == 722 and env["casebook_index_rows"]() == 2
    assert "null width 234 height 70" in new_src and idx_h == 70
    idx_inner = idx_w - 2 * idx_pad[0]
    assert round(11 * CJK_LINE) + 2 + round(13 * CJK_LINE) + 2 + round(11 * CJK_LINE) <= idx_h - 2 * idx_pad[1]
    tier_names = ["待结案", "缺卷"]
    for n in nb_cases:
        tier_names += [t["name"] for t in env[n["tiers_var"]]]
    widest_idx = 0
    for n, p in zip(nb_cases, pages):
        l1 = 7 + 5 + _wb(f[11], p["code"]) + 4 + max(_wb(f[10], s) for s in ("已盖章", "可盖章", "未结案", "缺卷"))
        l2 = _w(sf[13], p["short_title"])
        l3 = max(_w(f[11], f"{n['index_label']} · 最佳 {b}") for b in tier_names)
        widest_idx = max(widest_idx, l1, l2, l3)
        assert l1 <= idx_inner and l2 <= idx_inner and l3 <= idx_inner, f"Index tab `{n['key']}` overflows: {l1}/{l2}/{l3}px"
    report["CasebookIndexTab"] = widest_idx
    cell_w = int(_style_prop(zr_src, "notebook_evidence_cell", "xsize"))
    cell_inner = cell_w - 2 * int(_style_prop(zr_src, "notebook_evidence_cell", "padding").strip("()").split(",")[0])
    assert 3 * cell_w + 2 * 8 == page_inner and "null width 226 height 62" in new_src
    widest_head = max_ev_lines = 0
    for n, p in zip(nb_cases, pages):
        head = 6 + 8 + 86 + 8 + _w(sf[18], f"《{p['short_title']}》") + 10 + max(96, _w(f[12], p["best_name"]) + 20)
        widest_head = max(widest_head, head)
        assert head <= page_inner, f"Casebook page head `{n['key']}` overflows: {head}px"
        assert _w(f[12], f"{p['index_label']}  ·  {p['time_tag']}") <= page_inner
        assert len(p["chain"]) == 4, f"Casebook page `{n['key']}` needs exactly 4 chain slots"
        hotspots = env[n["hotspots_var"]]
        assert len(hotspots) == 6 and len(p["evidence_rows"]) == 6
        if n["key"] in ("haunted", "astro"):
            for h in hotspots:
                ln = _lines(f[11], h["evidence"], cell_inner)
                max_ev_lines = max(max_ev_lines, ln)
                assert ln <= 2, f"Annex evidence `{h['evidence']}` needs {ln} lines in a {cell_inner}px cell"
                assert _wb(f[10], f"{h['code']} · {h['label']}") <= cell_inner
            for k in env[n["links_var"]]:
                assert _w(f[12], k["short"]) <= 151 and _wb(f[11], f"{k['step']} · {k['name']}") <= 151
            for s in (n["lesson"], n["mo_margin"]):
                assert _lines(f[12], s, page_inner - 24) <= 2, f"Annex margin line too long: {s}"
            assert _lines(f[12], n["margin_secret"], page_inner - 24) <= 3
        foot = (_w(f[12], "已勘查 6/6 · 已结案 99 次") + 10 + max(84, _w(f[13], "前往" + n["index_label"]) + 22) + 8
                + max(84, _w(f[13], "展开整页") + 22) + 8 + max(146, _w(f[15], "已盖复盘章") + 36))
        assert foot <= page_inner, f"Casebook footer `{n['key']}` overflows: {foot}px"
    report["CasebookPageHead"] = widest_head
    report["CasebookEvidenceLines"] = f"{max_ev_lines} lines max"
    summary = 18 + 6 + _w(sf[13], "复盘总评") + 10 + _w(f[11], "已结案 6/6 · 金评级 6/6 · 累计结案 99 次 · 最少失误合计 99 次")
    assert summary <= 722 - 28, f"Casebook summary row overflows: {summary}px"
    assert _lines(f[12], env["CASEBOOK_VERDICT"] % cn, 722 - 28) <= 2
    assert _w(f[12], f"{cn}桩短案全部结案之后，艾丽丝会在这里写下她的复盘总评。") <= 722 - 28
    cb_quick = (20 + 10 + _w(sf[14], "天文社流星夜 · MN-01 流星夜的空三脚架") + 10 + _w(f[12], "（待结案）")
                + 8 + max(84, _w(f[13], "前往天文社") + 22))
    assert cb_quick <= 722 - 24, f"Casebook quick row overflows: {cb_quick}px"
    report["CasebookSummary"] = summary
    report["CasebookQuickRow"] = cb_quick

    # ---------------- folio modal: six cases in the 2 x 3 grid + the six-page casebook as a full-width card ----------------
    folio = pc14._folio_block(scr_src)
    panel_w = int(_style_prop(scr_src, "folio_panel", "xsize"))
    panel_pad = [int(x) for x in _style_prop(scr_src, "folio_panel", "padding").strip("()").split(",")]
    fcard_w = int(_style_prop(scr_src, "folio_card", "xsize"))
    fcard_h = int(_style_prop(scr_src, "folio_card", "ysize"))
    fcard_pad = [int(x) for x in _style_prop(scr_src, "folio_card", "padding").strip("()").split(",")]
    panel_inner = panel_w - 2 * panel_pad[0]
    if _pc16_present():
        # (PC-16: the seven cases + the casebook share one 2 x 4 grid of 350px cards; the wide card is gone -- verify_pc16)
        # (PC-17: the eight cases + the casebook share one 2 x 5 grid with one blank cell -- verify_pc17)
        assert panel_inner == 2 * fcard_w + 12 == 712 and ("grid 2 5:" if _pc17_present() else "grid 2 4:") in folio and "xspacing 12" in folio
        assert "folio_wide_card" not in scr_src and "wide=True" not in folio
    else:
        wide_w = int(_style_prop(scr_src, "folio_wide_card", "xsize"))
        assert re.search(r"^style folio_wide_card is folio_card:\n    xsize 712\n", scr_src, re.M), "Wide card = same card, wider"
        assert panel_inner == 2 * fcard_w + 12 == wide_w == 712 and "grid 2 3:" in folio and "xspacing 12" in folio
        grid_blk = folio.split("grid 2 3:", 1)[1].split("\n            use ", 1)[0]
        assert grid_blk.count("use extras_folio_case_card(") == 6, "The 2 x 3 grid holds exactly the six short cases"
        assert 'xsize (648 if wide else 278)' in scr_src and wide_w - 2 * fcard_pad[0] == 34 + 10 + 648
    card_titles = re.findall(r'use extras_folio_case_card\("[^"]+", _\("([^"]+)"\)', folio)
    assert len(card_titles) == 7 + len(_later_present()), card_titles
    statuses = ["待结案"]
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS",
                "HAUNTED_RATING_TIERS", "ASTRO_RATING_TIERS"):
        statuses += [t["name"] for t in env[var]]
    widest_title = 0
    for t in card_titles:
        for st in statuses + ["复盘章 6/6"]:
            row = _w(sf[15], t) + 6 + _wb(f[12], st)
            widest_title = max(widest_title, row)
            assert row <= 278, f"Folio card `{t}` + `{st}` overflows 278px: {row}px"
    # (cards of later milestones are measured by their own verifier: their case data is not in this sandbox)
    case_lines = [env["folio_case_line"](v, u) for v, u in re.findall(r'folio_case_line\("(\w+)", "([^"]+)"\)', folio)
                  if v in env]
    assert len(case_lines) == 6 and max(_w(f[11], s) for s in case_lines) <= 278
    wide_lines = re.findall(r'use extras_folio_case_card\("[^"]+", _\("[^"]+"\), _\("([^"]+)"\).*, wide=True\)$', folio, re.M)
    if _pc16_present():
        assert wide_lines == []
        wide_lines = re.findall(r'use extras_folio_case_card\("[^"]+", _\("推理笔记复盘本"\), _\("([^"]+)"\)', folio)
        assert len(wide_lines) == 1 and _w(f[11], wide_lines[0]) <= 278
    else:
        assert len(wide_lines) == 1 and _w(f[11], wide_lines[0]) <= 648 and "六桩" in wide_lines[0]
    sec_h = round(12 * CJK_LINE)
    head_h = max(44, round(22 * CJK_LINE) + 2 + round(12 * CJK_LINE))
    if _pc16_present():  # (2 x 4 grid, no wide card: the same height as PC-15's 2 x 3 grid + wide card)
        g_rows = 5 if _pc17_present() else 4  # (PC-17: one more grid row, still <= 672px -- verify_pc17)
        f_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8
               + (g_rows * fcard_h + (g_rows - 1) * 8) + 8 + 34)
    else:
        f_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8 + (3 * fcard_h + 2 * 8) + 8
               + fcard_h + 8 + 34)
    assert f_h <= 720 - 2 * 24, f"Folio modal taller than the window: {f_h}px"
    f_head = (44 + 12 + max(_w(sf[22], "番外卷宗"), _w(f[12], pc14.folio_header_sub(folio)))
              + 10 + max(96, _w(f[12], "已完成 9/9") + 20) + 6 + max(96, _w(f[12], "火漆 · 已通关解封") + 20))
    assert f_head <= panel_inner
    report["FolioCardTitle"] = widest_title
    report["FolioWideLine"] = _w(f[11], wide_lines[0])
    report["FolioHeight"] = f"{f_h} (PC-14 444)"

    # ---------------- main menu: 4 rows kept, re-flowed 4 + 3 + 3 + 4, zero horizontal overlap with the nav column ----------------
    mm = pc14.measure_main_menu(env)
    base = _pc14_menu_baseline(f, mm)
    assert [r[0] for r in base] == PC14_MAIN_MENU_ROWS
    base_overlap = [round(NAV_RIGHT - r[2], 1) for r in base]
    assert [i for i, o in enumerate(base_overlap) if o > 0] == [0, 1, 2], f"PC-14 baseline re-measured as {base_overlap}"
    nav = _nav_column_extent()
    row_tops = [mm["bottom"] - 30 * (len(mm["rows"]) - i) - 8 * (len(mm["rows"]) - 1 - i) for i in range(len(mm["rows"]))]
    for i, top in enumerate(row_tops):
        for name, (ny0, ny1) in nav.items():
            assert ny0 < top + 30 and top < ny1, f"Row {i + 1} does not vertically meet the nav column ({name}): fix unneeded?"
    assert mm["rows"] == PC15_MAIN_MENU_ROWS, mm["rows"]
    assert len(mm["rows"]) <= len(PC14_MAIN_MENU_ROWS), "PC-15 must not add main-menu rows"
    assert sorted(mm["chips"]) == sorted(k for r in PC14_MAIN_MENU_ROWS for k in r), "Same 14 chips as PC-14, no new chip"
    assert "astro" not in mm["chips"] and "astro" in mm["folio_tabs"], "The meteor-night case is reachable only via the folio"
    assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
    assert mm["separators"] == [8, 8, 8], mm["separators"]
    gaps = []
    for i, (w, lft, rgt) in enumerate(zip(mm["row_w"], mm["left"], mm["right"])):
        gaps.append(round(lft - NAV_RIGHT, 1))
        assert lft >= NAV_RIGHT + NAV_CLEARANCE, f"Row {i + 1} left edge {lft:.1f}px is within {NAV_CLEARANCE}px of the nav column"
        assert rgt <= HERO_BOOK_X, f"Row {i + 1} right edge {rgt:.1f}px runs into the title art's heroine"
        assert w <= max(mm["row_w"][:2]), f"Row {i + 1} ({w}px) wider than rows 1-2"
    assert len(set(mm["centers"])) == 1, "All chip rows share one centre line"
    # the shift sits on ONE untransformed wrapper vbox: an ATL `at` transform inherits only its child's pos / anchor,
    # never its offsets, so an xoffset written on an `at main_title_in(...)` row would silently be dropped in game
    menu_blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    wrap = re.search(r"^        vbox:\n            xalign 0\.5\n            xoffset (\d+)\n            spacing 0\n            hbox:\n",
                     menu_blk, re.M)
    assert wrap and mm["centers"][0] == 568 + int(wrap.group(1)), "Chip rows must be shifted by an untransformed wrapper vbox"
    wrap_head = menu_blk[:wrap.start()].rsplit("\n", 3)[-3:]
    assert not any(ln.strip().startswith("at ") for ln in wrap_head), "The wrapper itself must not carry an ATL transform"
    assert not re.search(r"^ +hbox:\n +xalign 0\.5\n +xoffset", menu_blk, re.M), "No xoffset on an `at`-transformed row"
    row_ats = re.findall(r"^            hbox:\n                xalign 0\.5\n                spacing \d+\n                at (main_title_in\([\d.]+\))\n",
                         menu_blk, re.M)
    assert row_ats == ["main_title_in(0.62)", "main_title_in(0.68)", "main_title_in(0.74)", "main_title_in(0.80)"], row_ats
    assert mm["bottom"] == 593 and mm["gap"] >= PC14_MENU_GAP, f"Column bottom / badge gap changed: {mm}"
    assert mm["top"] >= 20
    assert int(_style_prop(scr_src, "main_menu_cozy_chip", "ysize")) == 30
    assert not re.search(r"^style main_menu_folio_chip is main_menu_cozy_chip:\n(?:    .*\n)*    (?:ysize|padding)", scr_src, re.M)
    main_blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    sizes = [int(x) for x in re.findall(r'\) size (\d+) color', main_blk)]
    icons = [int(x) for x in re.findall(r'add "images/ui/icon_(?!rain_ambience|book_ambience)\w+\.png" xysize \((\d+), \d+\)', main_blk)]
    assert sizes and min(sizes) >= 12 and len(icons) == 14 and min(icons) >= 16, "Chips stay legible (>= 12px text, 16px icons)"
    report["MainMenuRows"] = "/".join(str(len(r)) for r in mm["rows"]) + " (PC-14 4/4/4/2)"
    report["MainMenuRowWidths"] = "/".join(str(round(w)) for w in mm["row_w"])
    report["PC14NavOverlap"] = "/".join(str(o) for o in base_overlap)
    report["PC15NavGap"] = "/".join(str(g) for g in gaps)
    report["MainMenuRight"] = f"{max(mm['right']):.0f} (PC-14 {max(r[3] for r in base):.0f})"
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['gap']}; PC-14 gap {PC14_MENU_GAP})"
    report["NavColumnY"] = f"{nav['max'][0]}..{nav['max'][1]} (fewest buttons {nav['min'][0]}..{nav['min'][1]})"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    grid_txt = ("2×20 = 40", "2×20 共 40 枚") if _pc17_present() else ("2×19 = 38", "2×19 共 38 枚") if _pc16_present() else ("2×18 = 36", "2×18 共 36 枚")  # (PC-16: 2x19, verify_pc16)
    assert "grid 2 ach_grid_rows():" in ach_src and grid_txt[0] in ach_src and grid_txt[1] in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_astro_telescope", "ach_first_magnitude"):
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
# 3. Sandbox runtime: case, rating, spoiler gates, casebook expansion, folio, main menu
################################################################################

def _case_block(src):
    m = re.search(r"^label astro_telescope_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label astro_telescope_case"
    return m.group(1)


# every star of the chain must be traceable to the clues it rests on (spot ids) and say so in its own words
STAR_TRACE = {
    "k1": {"s1": "卸镜步骤", "s3": "防潮垫"},
    "k2": {"s2": "路灯", "s4": "茉莉", "s5": "镜头盖", "s6": "红光"},
    "k3": {"s1": "20:48", "s3": "20:52", "s4": "开水房"},
    "k4": {"s2": "记录表", "s3": "登记", "s6": "手电"},
}
OLDER_SLOTS = ([2, 1, 0, 2], [1, 0, 2, 1], [0, 2, 1, 2], [1, 2, 0, 1], [2, 0, 1, 0])  # PC-10 .. PC-14


def check_pc15_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 36 achievements (2x18), PC-15 pair appended after PC-14 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 36 and env["ach_grid_rows"]() == 18 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_haunted_house", "ach_seventh_shadow", "ach_astro_telescope", "ach_first_magnitude"], ach_ids[-4:]
    assert "ach_astro_telescope" in mock_ach.registered and "ach_first_magnitude" in mock_ach.registered

    # ---- B. case data ----
    case, spots, links, tiers = env["ASTRO_CASE"], env["ASTRO_SPOTS"], env["ASTRO_STAR_LINKS"], env["ASTRO_RATING_TIERS"]
    assert case["label"] == "astro_telescope_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert case["code"] == "MN-01" and case["code"] not in ("T-01", "L-01", "TH-01", "AT-01", "SD-01", "HH-01")
    assert [s["id"] for s in spots] == [f"s{i}" for i in range(1, 7)]
    assert [s["code"] for s in spots] == [f"MS-0{i}" for i in range(1, 7)]
    for s in spots:
        assert s["where"] and s["keeper"] and s["scene"] in env["BG_LIGHT"], s["id"]
        assert len(s["detail"]) >= 70 and s["evidence"] and s["surface"]
        assert env["EVIDENCE_DETAILS"][s["evidence"]] == (s["observer"], s["detail"]), f"{s['id']} flip detail not registered"
    assert len({s["evidence"] for s in spots}) == 6
    older_ev = set()
    for var in ("LIBRARY_HOTSPOTS", "THEATER_HOTSPOTS", "ATELIER_HOTSPOTS", "SPORTS_ITEMS", "HAUNTED_SPOTS"):
        older_ev |= {h["evidence"] for h in env[var]}
    assert not older_ev & {s["evidence"] for s in spots}
    # the five formal icons are all used by the case: entry, case badge and the three clue icons named after them
    assert {s["icon"] for s in spots} >= {"images/ui/icon_meteor_chart.png", "images/ui/icon_lens_cap.png",
                                           "images/ui/icon_star_lamp.png", "images/ui/icon_missing_telescope.png"}
    assert [s["id"] for s in spots if s["icon"].endswith("icon_meteor_chart.png")] == ["s2"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_lens_cap.png")] == ["s5"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_star_lamp.png")] == ["s6"]
    assert [k["name"] for k in links] == ["手法", "去向", "时机", "掌镜人"], "Four stars: method -> whereabouts -> timing -> holder"
    assert [k["step"] for k in links] == ["第一颗星", "第二颗星", "第三颗星", "第四颗星"]
    star_col = {b["name"]: b["color"] for b in env["ASTRO_STARS"]}
    for k in links:
        assert star_col[k["star"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
    assert len({k["color"] for k in links}) == 4, "Each star gets its own colour"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["一等星", "二等星", "三等星"]
    older_tiers = set()
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS", "HAUNTED_RATING_TIERS"):
        older_tiers |= {t["name"] for t in env[var]}
    assert not older_tiers & {t["name"] for t in tiers}, "Magnitude rating must not reuse bookmarks / stubs / frames / stopwatches / lanterns"
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]
    for word in ("卸镜", "软包", "南门", "魏师傅", "土星"):
        assert word in case["solution_pub"], f"Solution does not name `{word}`"
    for word in ("鬼魂", "灵异", "附身", "诅咒", "超自然", "闹鬼", "幽灵", "外星"):
        assert word not in case["solution_pub"] + "".join(k["full"] for k in links), f"Supernatural wording `{word}`"
    used = set()
    for k in links:
        for sid, word in STAR_TRACE[k["id"]].items():
            assert word in k["full"], f"{k['id']} does not cite {sid} (`{word}`)"
            spot_text = next(s for s in spots if s["id"] == sid)
            assert word in spot_text["detail"] + spot_text["surface"] + spot_text["evidence"] + spot_text["label"], \
                f"{k['id']} cites `{word}` but clue {sid} never shows it"
            used.add(sid)
    assert used == {s["id"] for s in spots}, f"Clues not used by the chain: {set(s['id'] for s in spots) - used}"
    public = "".join(str(case[k]) for k in case if k != "margin_secret") + str(spots) + str(links) + env["ASTRO_MASK_NOTICE"]
    for kw in SECRET_KEYWORDS:
        assert kw not in public, f"Spoiler keyword `{kw}` in public meteor-night copy"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in case["margin_secret"]) >= 2, "The gated note should be endgame material"

    # ---- C. script structure: 6 spots -> four stars -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "astro_case_investigate")
    for i in range(1, 7):
        assert f"if not _at_s{i}:" in inv and f'$ astro_inspect_spot("s{i}")' in inv, f"spot s{i} not playable"
    assert inv.count("jump astro_case_investigate") == 6 and "jump astro_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"astro_star_k{i}")
        assert f"show screen astro_star_banner({i - 1}, " in kb
        assert kb.count("$ _at_mistakes += 1") == 2 and kb.count(f"jump astro_star_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _at_stars = {i}" in kb
        for m_wrong in re.finditer(r"\$ _at_mistakes \+= 1(.*?)jump astro_star_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct star always at the same menu slot: {correct_positions}"
    assert correct_positions not in OLDER_SLOTS, "Answer slots must not copy PC-10 .. PC-14"
    assert "call _astro_finish_case(_at_mistakes)" in blk and "label astro_case_resolution:" in blk
    assert blk.index("show screen evidence_book") < blk.index("label astro_case_investigate:"), "Evidence HUD must be up first"
    assert "hide screen evidence_book" in _label_block(src, "_astro_finish_case")
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the meteor-night case"
    assert "truth_spoiler_unlocked" not in blk, "The meteor-night script is fully public (only the page margin is gated)"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public meteor-night case"
    for phrase in ("望远镜从头到尾，都没有离开过学校", "按步骤卸下来的望远镜", "红光手电", "茉莉花茶"):
        assert phrase in blk, f"Resolution must spell out the real mechanism (`{phrase}`)"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"rooftop", "corridor", "gate", "agency"} <= scenes_used, scenes_used
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"alice", "mo", "lin", "zhang", "huang"} <= cast, cast
    defs_src = _read("game/definitions.rpy")
    module_defines = dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", src, re.M))
    assert module_defines == {"jiyao": "季遥", "xiaohe": "沈小禾", "laowei": "魏师傅"}, module_defines
    assert not cast & set(module_defines), "Sprite-less newcomers must never be `show`n"
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert not re.search(rf"\b{var}\s*=", every_rpy), f"`{var}` already assigned elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"jiyao", "huang", "lin", "zhang", "alice", "mo_note", "mc", "xiaohe", "laowei", "sysmsg"} <= speakers, speakers
    _sprite_slots_ok(blk, "astro_telescope_case")
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_at_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("astro_telescope_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "astro_telescope_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["astro_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "astro_telescope_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "astro"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "MN-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_astro_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_at_s{i}"] is True for i in range(1, 7))
    assert env["_at_mistakes"] == 8 and env["_at_stars"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {s["evidence"] for s in spots}
    assert env["astro_get_record"]()["inspected"] == [f"s{i}" for i in range(1, 7)]
    assert env["astro_inspect_spot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievements (gold run -> ach_first_magnitude) ----
    assert [env["astro_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.astro_telescope_record = {}
    mock_ach.granted.clear()
    assert env["astro_case_solved_count"]() == 0 and env["astro_best_short"]() == "待结案"
    v0 = env["astro_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["star_shorts"]) and not any(v0["star_fulls"])
    r = env["astro_record_solve"](4)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_astro_telescope") and not mock_ach.has("ach_first_magnitude")
    r = env["astro_record_solve"](2)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 2
    assert not mock_ach.has("ach_first_magnitude")
    r = env["astro_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and mock_ach.has("ach_first_magnitude")
    r = env["astro_record_solve"](3)
    assert not r["new_record"] and r["replays"] == 4 and r["best_tier"] == "gold" and r["last_tier"] == "bronze"
    assert env["astro_gold_count"]() == 1 and env["astro_best_short"]() == "一等星"
    v = env["astro_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["star_shorts"] == [k["short"] for k in links]
    env["astro_open_report_modal"]()
    assert env["astro_get_record"]()["report_viewed"] and any(s[0] == "astro_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    for fn in ("library_case_solved_count", "theater_case_solved_count", "atelier_case_solved_count",
               "sports_case_solved_count", "haunted_case_solved_count"):
        assert env[fn]() == 0, f"Older case store touched ({fn})"

    # ---- F. accordion sub-bar helpers (18 tabs / 5 groups) ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if env["_SALON_TAB_PILLS"][t][1] in env:  # (later milestones' counters are not in this sandbox)
                assert re.fullmatch(r"\S+ \d+/\d+", env["salon_tab_pill_text"](t)), t
    assert env["salon_open_group"]("astro") == ("starlit" if _pc16_present() else "closedlib")
    assert env["salon_tab_pill_text"]("astro") == "天文 1/1"
    assert env["salon_tab_icon"]("astro").endswith("icon_astro_club.png")
    assert env["salon_tab_pill_text"]("notebook") == "复盘 0/6"

    # ---- G. zero-side-channel spoiler gate on the page margin (strongest state: solved, gold) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for s in _strings(view):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` leaked in {where}"

    locked = env["astro_render_view"]()
    _clean(locked, "meteor-night view")
    assert locked["display_secret"] == "" and locked["display_masked_notice"] == env["ASTRO_MASK_NOTICE"] and not locked["unlocked"]
    saved_secret = case["margin_secret"]
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}", "续"):
        case["margin_secret"] = filler
        assert env["astro_render_view"]() == locked, "Locked meteor-night view depends on the gated text"
        proofs += 1
    case["margin_secret"] = saved_secret
    mp.te_cleared = True
    un = env["astro_render_view"]()
    assert un["unlocked"] and un["display_secret"] == saved_secret and un["display_masked_notice"] == ""
    mp.astro_telescope_record = {}
    assert env["astro_render_view"]()["display_secret"] == "", "Unsolved case must stay blank even when unlocked"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["astro_render_view"]()["display_secret"] == ""
    env["astro_record_solve"](1)
    assert "小雪" in env["astro_render_view"]()["display_secret"]
    mp.truth_spoiler_confirmed = False
    assert env["astro_render_view"]()["display_secret"] == ""

    # ---- H. casebook expansion: 4 -> 6 pages, PC-13 pages untouched, read-only, stamps, achievement, spoiler gate ----
    pc13_env = pc13._sandbox_env()[0]
    nb = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb] == NOTEBOOK_KEYS
    assert nb[:4] == pc13_env["NOTEBOOK_CASES"], "PC-13's four pages must stay exactly as registered by PC-13"
    assert nb[4:] == env["CASEBOOK_ANNEX_PAGES"] and set(env["_NOTEBOOK_BY_KEY"]) == set(NOTEBOOK_KEYS)
    assert [n["key"] for n in env["CASEBOOK_ANNEX_PAGES"]] == ["haunted", "astro"]
    for n in env["CASEBOOK_ANNEX_PAGES"]:
        assert n["tab"] == n["key"] and n["store"] in CASE_STORES and re.fullmatch(r"#[0-9a-f]{6}", n["ink"])
        assert {n["case_var"], n["hotspots_var"], n["links_var"], n["tiers_var"]} <= set(env), n["key"]
        for s in (n["lesson"], n["mo_margin"], n["index_label"], n["unit"]):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` in public casebook copy ({n['key']})"
        assert sum(1 for kw in SECRET_KEYWORDS if kw in n["margin_secret"]) >= 2, f"{n['key']} gated note"
        assert re.search(r"[\[\]{}]", n["margin_secret"] + n["lesson"] + n["mo_margin"]) is None
    inks = [n["ink"] for n in nb]
    assert len(set(inks)) == 6, "Every casebook page has its own ink colour"
    # the module merges its pages once, never twice (re-running the init block is idempotent)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    assert [n["key"] for n in env["NOTEBOOK_CASES"]] == NOTEBOOK_KEYS
    nb = env["NOTEBOOK_CASES"]

    # read-only: rendering every page / the summary leaves every persistent field byte-identical
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.haunted_house_record = {"solved": True, "replays": 2, "best_tier": "gold", "best_mistakes": 0,
                               "inspected": ["h1", "h2", "h3", "h4", "h5", "h6"]}
    mp.astro_telescope_record = {"solved": True, "replays": 1, "best_tier": "silver", "best_mistakes": 2,
                                 "inspected": ["s2", "s5"]}
    mp.notebook_selected_case = "library"
    snap = _persistent_snapshot(mp)
    n_ops = 0
    for _round in range(3):
        for key in NOTEBOOK_KEYS + ["bogus"]:
            env["notebook_render_page"](key)
            n_ops += 1
        env["casebook_summary"]()
        env["casebook_index_rows"]()
        env["casebook_count_cn"](6)
        n_ops += 3
    assert _persistent_snapshot(mp) == snap, "Casebook rendering wrote persistent state"
    ph = env["notebook_render_page"]("haunted")
    pa = env["notebook_render_page"]("astro")
    assert ph["solved"] and ph["best_name"] == "金灯笼" and ph["status"] == "ready" and ph["unit"] == "四盏灯"
    assert pa["solved"] and pa["best_name"] == "二等星" and pa["inspected_count"] == 2 and pa["hotspot_total"] == 6
    assert [r[3] for r in pa["evidence_rows"]] == [False, True, False, False, True, False]
    assert [r[2] for r in pa["evidence_rows"] if not r[3]] == ["", "", "", ""], "Uninspected evidence must stay blank"
    assert pa["chain"] == [(k["step"], k["name"], k["short"]) for k in links]
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_cb_fn = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("casebook_"):
            n_cb_fn += 1
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Assign, ast.AugAssign)):
                    for t in (sub.targets if isinstance(sub, ast.Assign) else [sub.target]):
                        assert not (isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "persistent"), \
                            f"{node.name} writes persistent.{t.attr}"
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute):
                    assert sub.func.attr not in ("update", "append", "pop", "clear", "setdefault", "extend", "remove",
                                                 "insert", "save_persistent"), f"{node.name} calls .{sub.func.attr}()"
    assert n_cb_fn == 4, n_cb_fn
    # summary & verdict: written for six pages, shown only when all six are solved
    s0 = env["casebook_summary"]()
    assert s0["total"] == 6 and s0["count_cn"] == "六" and s0["display_verdict"] == ""
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve"):
        env[solve](0)
    s1 = env["casebook_summary"]()
    assert s1["solved"] == 6 and "六桩案子" in s1["display_verdict"] and "四桩" not in s1["display_verdict"]
    _clean(s1, "casebook summary")
    # stamps: only the casebook's own store (and the selected page) change; PC-13's achievement keeps its "four PC-13 pages" rule
    mp.case_notebook_record = {}
    mock_ach.granted.clear()
    before = _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case"))
    for i, key in enumerate(["haunted", "astro", "library", "theater"]):
        assert env["casebook_stamp"](key) is not None
    assert env["notebook_stamped_count"]() == 4 and not mock_ach.has("ach_case_notebook"), \
        "Four stamps that are not PC-13's four pages must not grant 「推理笔记的复盘人」 early"
    env["casebook_stamp"]("atelier")
    assert not mock_ach.has("ach_case_notebook")
    env["casebook_stamp"]("sportsday")
    assert mock_ach.has("ach_case_notebook") and env["notebook_stamped_count"]() == 6
    assert env["casebook_stamp"]("sportsday")["stamped"].count("sportsday") == 1, "Stamping twice must stay idempotent"
    assert _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case")) == before, \
        "Stamping touched a store other than the casebook's own"
    mp.case_notebook_record = {}
    mock_ach.granted.clear()
    for key in ("library", "theater", "atelier", "sportsday"):
        env["casebook_stamp"](key)
    assert mock_ach.has("ach_case_notebook") and env["notebook_stamped_count"]() == 4, "PC-13's four pages still grant it"
    mp.astro_telescope_record = {}
    assert env["casebook_stamp"]("astro") is None and "astro" not in env["notebook_get_record"]()["stamped"]
    # annex-page spoiler gate: locked pages never depend on their gated note
    mp.astro_telescope_record = {"solved": True, "replays": 1, "best_tier": "gold", "best_mistakes": 0, "inspected": []}
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    for key in ("haunted", "astro"):
        ndef = env["_NOTEBOOK_BY_KEY"][key]
        lockedp = env["notebook_render_page"](key)
        _clean(lockedp, f"casebook page {key}")
        assert lockedp["display_secret"] == "" and lockedp["display_masked_notice"] != ""
        saved = ndef["margin_secret"]
        for filler in ("Z" * 280, "", "小雪周可" * 30):
            ndef["margin_secret"] = filler
            assert env["notebook_render_page"](key) == lockedp, f"Locked casebook page {key} depends on its gated note"
            proofs += 1
        ndef["margin_secret"] = saved
        mp.te_cleared = True
        assert env["notebook_render_page"](key)["display_secret"] == saved
        mp.te_cleared = False

    # ---- I. folio: six cases + the six-page casebook, counts, graceful degradation, wiring ----
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.dlc_alice_done = False
    mp.dlc_mo_done = False
    n_total = 9 + len(_later_present())  # (PC-16's 7th case counts as "not done" here: its counter is not in this sandbox)
    assert env["folio_done_count"]() == 0 and env["folio_total_count"]() == n_total
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve",
                  "haunted_record_solve", "astro_record_solve"):
        env[solve](1)
    mp.dlc_alice_done = mp.dlc_mo_done = True
    assert env["folio_done_count"]() == 8, "Casebook not fully stamped yet"
    for key in NOTEBOOK_KEYS:
        env["casebook_stamp"](key)
    assert env["folio_done_count"]() == 9 and env["folio_total_count"]() == n_total
    saved_counter = env.pop("astro_case_solved_count")
    assert env["folio_done_count"]() == 8, "A missing counter must count as not done, never crash"
    env["astro_case_solved_count"] = saved_counter
    line = env["folio_case_line"]("ASTRO_CASE", "四颗星")
    _clean(line, "folio astro line")
    assert line == "MN-01 《流星夜的空三脚架》 · 四颗星"
    scr_src = _read("game/screens.rpy")
    extra_src = _read("game/extra.rpy")
    folio = pc14._folio_block(scr_src)
    mm = pc14.measure_main_menu(env)
    assert mm["folio_tabs"] == FOLIO_CASE_TABS[:-1] + (["pool"] if _pc16_present() else []) + (["bake"] if _pc17_present() else []) + FOLIO_CASE_TABS[-1:], mm["folio_tabs"]
    assert re.search(r'astro_best_short\(\), astro_case_solved_count\(\) > 0, SetField\(persistent, "extras_tab", "astro"\), from_extras\)', folio)
    card = scr_src.split("screen extras_folio_case_card(", 1)[1].split("\nscreen ", 1)[0]
    assert 'action ([Hide("extras_folio_modal"), tab_action] + ([] if from_extras else [ShowMenu("extras")]))' in card
    if _pc16_present():  # (PC-16: the casebook card is an ordinary card again; the wide variant is removed)
        assert re.search(r'notebook_stamped_count\(\) >= len\(NOTEBOOK_CASES\), SetField\(persistent, "extras_tab", "notebook"\), from_extras\)$', folio, re.M)
        assert card.startswith("icon, title, line, status, done, tab_action, from_extras=False):")
    else:
        assert re.search(r'notebook_stamped_count\(\) >= len\(NOTEBOOK_CASES\), SetField\(persistent, "extras_tab", "notebook"\), from_extras, wide=True\)', folio)
        assert card.startswith("icon, title, line, status, done, tab_action, from_extras=False, wide=False):")
        assert 'style ("folio_wide_card" if wide else "folio_card")' in card
    assert "Start(" not in folio and "Replay(" not in folio and not re.findall(r"SetField\(persistent, \"(?!extras_tab)", folio)
    assert "astro_case_solved_count" in extra_src.split("FOLIO_CASE_COUNTERS = ", 1)[1].split(")", 1)[0]

    # ---- J. main menu: no new chip, the case only in the folio ----
    main_blk = scr_src.split("screen main_menu():", 1)[1].split("\nstyle ", 1)[0]
    assert "astro" not in main_blk and "icon_astro_club" not in main_blk, "The main menu may not gain a meteor-night chip"
    assert main_blk.count('Show("extras_folio_modal")') == 1 and "folio" in mm["chips"]

    # ---- K. extras routing: the expanded casebook replaces PC-13's four-tab page; the old page is never used ----
    assert re.search(r'elif cur == "notebook":\n(?:\s+##.*\n)?\s+use extras_casebook_expanded\n', extra_src)
    assert re.search(r'elif cur == "astro":\n\s+use extras_astro_telescope\n', extra_src)
    users = [p.name for p in GAME_DIR.rglob("*.rpy") if re.search(r"^\s*use extras_case_notebook\b", p.read_text(encoding="utf-8-sig"), re.M)]
    assert users == [], f"PC-13's four-tab casebook page (grid 4 1) is still used by {users}"
    if _pc16_present():  # (PC-16 deletes the unused page; the line-exact diff is checked by verify_pc16)
        assert not re.search(r"^screen extras_case_notebook\b", _read("game/zephyr_relay_casebook.rpy"), re.M)
    else:
        assert "grid 4 1:" in _read("game/zephyr_relay_casebook.rpy"), "PC-13's page stays byte-identical (kept, not edited)"

    # ---- L. reset_all_progress clears PC-15 state and leaves main-story vars alone ----
    mp.astro_selected_spot = "s5"
    mp.extras_salon_group = "closedlib"
    env["reset_all_progress"]()
    assert env["astro_case_solved_count"]() == 0 and mp.astro_telescope_record == {} and mp.astro_selected_spot == "s1"
    assert mp.extras_salon_group == "salon" and env["fail_count"] == 0 and env["mo_favor"] == 50
    assert env["notebook_stamped_count"]() == 0

    data_cjk = _cjk(str({k: v for k, v in case.items() if k != "margin_secret"})) + sum(_cjk(str(s)) for s in spots) \
        + sum(_cjk(str(k)) for k in links)
    annex_cjk = sum(_cjk(n["lesson"] + n["mo_margin"]) for n in env["CASEBOOK_ANNEX_PAGES"])
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "SecretCJK": _cjk(case["margin_secret"]),
                       "CasebookAnnexPublicCJK": annex_cjk,
                       "CorrectSlots": [c + 1 for c in correct_positions], "CasebookReadOnlyOps": n_ops,
                       "SideChannelProofs": proofs})
    print(f"[PASS] PC-15 runtime: meteor-night case (script CJK={cjk_case}, data CJK={data_cjk}, 6 spots -> four stars "
          f"method/whereabouts/timing/holder, every star cites its clues, correct slots {[c + 1 for c in correct_positions]}, "
          f"8 gentle loops, fail_count untouched) | 1st/2nd/3rd-magnitude ratings + best-record replay ladder + "
          f"ach_astro_telescope / ach_first_magnitude (gold run only) | 36 achievements (2x18) | page-margin spoiler gate "
          f"(zero leak) | casebook 4 -> 6 pages (PC-13 pages identical, {n_ops} reads byte-identical, stamps write only "
          f"the casebook, 「推理笔记的复盘人」 still needs PC-13's four pages, verdict for six) | folio 9/9 + graceful "
          f"degradation | main menu: no new chip | {proofs} side-channel proofs")
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
    # whole-project guard: among *tracked* files only the PC-15 targets and the forward-compatible verifier edits may
    # differ from HEAD (untracked new files are not flagged; on a clean committed checkout nothing differs at all)
    allowed = set(PC15_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc15.py"]) | swapped
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

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC15_TOUCHED_FILES if p != NEW_MODULE], *FORWARD_COMPAT_TESTS],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw and not raw.startswith(b"\xef\xbb\xbf"), "PC-15 module must use LF line endings, no BOM"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src
    for rel in PC15_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc15.py"]:
        assert b"\r\n" not in (ROOT / rel).read_bytes(), f"{rel} gained CRLF line endings"
    scr_new = _read("game/screens.rpy").split("screen main_menu():", 1)[1].split("\n## 游戏菜单", 1)[0]
    for name, txt in ((NEW_MODULE, new_src), ("screens.rpy main menu + folio", scr_new)):
        assert not EMOJI_RE.search(txt) and "<svg" not in txt.lower(), f"Emoji / SVG in {name}"

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every data-driven text that prints case / spot / casebook / folio copy opts out of interpolation
    folio_src = _read("game/screens.rpy").split("screen extras_folio_modal(", 1)[1].split("\nstyle folio_panel", 1)[0]
    for ln in new_src.splitlines() + folio_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|ASTRO_CASE|s_obj|k_obj|t_obj|r_obj|b_obj|n_obj|_as|_av|_mv|_rv|_np|_ns|_ip|_ev|_ch|_dv|_fseal|'
                    r'title|status|line|prompt_line)\b', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\[("[a-z_]+"|\d)\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"{len(OLDER_EXTRAS_MODULES)} older extras modules byte-identical incl. PC-13 casebook + PC-14; only PC-15 targets + "
          f"icons + forward-compatible verifiers may differ from HEAD), no Emoji/SVG/tabs/CRLF, {n_str} interpolation-safe CJK data strings")

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
            if rel_icon in PC15_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                # (the missing telescope is intentionally a dashed outline: mostly transparent, still within bounds)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-15 set: {', '.join(Path(x).name for x in PC15_UI_ICONS)}")


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
    screen_defs = {}
    for rpy in rpy_files:
        for lineno, line in enumerate(rpy.read_text(encoding="utf-8-sig").splitlines(), 1):
            if (m := screen_re.match(line)):
                screens.add(m.group(1))
                screen_defs.setdefault(m.group(1), []).append(rpy.name)
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
    dup = {k: v for k, v in screen_defs.items() if len(v) > 1 and "tl" not in v}
    assert not dup, f"Screens defined more than once: {dup}"

    for img in ("ui_icon_astro_club", "ui_icon_missing_telescope", "ui_icon_meteor_chart", "ui_icon_lens_cap", "ui_icon_star_lamp"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_astro_telescope", "astro_report_modal", "astro_star_banner", "astro_result_card",
                "extras_casebook_expanded", "notebook_page_modal", "extras_folio_modal", "extras_folio_case_card",
                "extras_achievements", "deduction_cutin", "evidence_book", "confirm", "extras_haunted_house"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("astro_telescope_case", "astro_case_investigate", "astro_case_review_intro", "astro_star_k1",
                "astro_star_k2", "astro_star_k3", "astro_star_k4", "astro_case_resolution",
                "_astro_init_sandbox", "_astro_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    assert "astro_star_twinkle" in transforms and "notebook_tab_sway" in transforms
    tint_re = r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)"
    tinted = re.findall(tint_re, new_src)
    assert len(tinted) == 2 and all((GAME_DIR / g).is_file() for g in tinted), tinted
    blk = re.search(r"^style salon_sext_pill is bookstreet_subtab_pill:\n((?:    .*\n)+)", new_src, re.M).group(1)
    assert sorted(ln.split()[0] for ln in blk.strip().splitlines()) == ["padding", "xminimum"]
    assert re.search(r"^style salon_sext_pill_text is bookstreet_subtab_pill_text$", new_src, re.M)
    # the casebook reuses PC-13's own styles for everything but the wider index tab
    exp = new_src.split("screen extras_casebook_expanded():", 1)[1].split("\n####", 1)[0]
    used_styles = set(re.findall(r'style "(\w+)"', exp))
    assert used_styles == {"notebook_header_card", "mailbox_stat_chip", "gramophone_mini_pill", "casebook_index_tab",
                           "notebook_page_card", "mailbox_code_badge", "notebook_evidence_cell", "notebook_chain_slot",
                           "notebook_margin_box", "pill_button", "notebook_summary_card", "mailbox_quick_row"}, used_styles

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC15_TOUCHED_FILES:
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
    for icon in PC15_UI_ICONS:
        assert icon in refs, f"PC-15 icon {icon} is not wired into any .rpy"
    folio = pc14._folio_block(scr_src)
    assert '"images/ui/icon_astro_club.png"' in folio, "The folio card uses the astronomy-club entry icon"
    audio_src = _read("game/audio.rpy")
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", audio_src), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", audio_src), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd

    extra_src = _read("game/extra.rpy")
    assert '"astro_telescope_case":' in extra_src
    assert extra_src.count("or name in _ASTRO_CASE_LABELS") == 2
    for older in ("_HAUNTED_CASE_LABELS", "_SPORTS_CASE_LABELS", "_ATELIER_CASE_LABELS", "_THEATER_CASE_LABELS", "_CLOSED_LIBRARY_LABELS"):
        assert extra_src.count(f"or name in {older}") == 2, f"{older} callback wiring must stay intact"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("astro_telescope_record", "astro_selected_spot"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld

    for rel in PC15_TOUCHED_FILES:
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
          f"{jumps} jumps/calls, {len(styles)} styles, {len(refs)} distinct asset refs, no duplicate screen names)")


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
    pc15_shots = ("ui_15a_astro_unsolved.png", "ui_15b_astro_gold_masked.png", "ui_15c_astro_unmasked.png",
                  "ui_15d_astro_report.png", "ui_15e_astro_star_banner.png", "ui_15f_astro_result_card.png",
                  "ui_15g_casebook_expanded_masked.png", "ui_15h_casebook_expanded_unmasked.png",
                  "ui_15i_casebook_astro_page.png", "ui_15j_folio_six_cases.png", "ui_15k_main_menu_reflowed.png")
    for shot in pc15_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_mn_rec")
    pc15_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc15_seg.index(s) for s in pc15_shots] == sorted(pc15_seg.index(s) for s in pc15_shots), "PC-15 shots out of order"
    assert shots.index("ui_14g_folio_from_extras.png") < start < shots.index("ui_14h_folio_main_locked.png"), \
        "PC-15 extras-page audit runs after PC-14's, before the return to the main menu"
    assert pc15_seg.index("ui_15j_folio_six_cases.png") < pc15_seg.index('pause until screen "main_menu"') \
        < pc15_seg.index("ui_15k_main_menu_reflowed.png")
    for bad in ("ach_grant", "astro_record_solve(", "astro_inspect_spot(", "casebook_stamp(", "notebook_stamp(",
                "notebook_open_page(", "haunted_record_solve(", "haunted_inspect_spot(", "sports_record_solve(",
                "atelier_record_solve(", "theater_record_solve(", "library_record_solve(", "wall_pin(", "capsule_place(",
                "reset_all_progress"):
        assert bad not in pc15_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("astro_telescope_record", "astro_selected_spot", "case_notebook_record", "notebook_selected_case",
                "haunted_house_record", "extras_salon_group", "te_cleared", "truth_spoiler_confirmed", "chapter_reached"):
        assert f"persistent.{fld} = _saved_" in pc15_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-15 coverage ({len(pc15_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc15_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC15_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC15_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
