#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-16 Static, Behavioral, Pixel-Budget, Pool-Locker "Misplaced Key" Case (replayable, rated, realistic: four laps of a
medley method -> timing -> whereabouts -> wearer), Case-Notebook Expansion (6 -> 7 pages, read-only, zero-write),
Old-Screen Cleanup (PC-13's unused four-tab casebook page deleted, line-exact), Folio 2 x 4 Layout, Salon Sub-Bar Regroup
(19 tabs / 5 groups, every open state <= 702px), Main Menu (no new chip, zero overlap with the navigation column, badge gap
kept), Spoiler-Gate (side-channel proof), Reused-Icon Pairing, Asset & Zero-Intrusion Verifier for
《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's init-python blocks
inside the same mocked sandbox verify_pc15.py uses, plus the PC-16 module.
Nothing here depends on uncommitted changes: on a clean, committed checkout every check still runs.
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import hashlib  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
from pathlib import Path  # noqa: E402
from PIL import Image, ImageFont  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
NEW_MODULE = "game/zwembad_locker_casebook.rpy"
PC13_MODULE = "game/zephyr_relay_casebook.rpy"
PC15_MODULE = "game/zubenelgenubi_meteor_casebook.rpy"
PC15_COMMIT = "044e40f"  # the committed PC-15 state the PC-13 cleanup is diffed against (line-exact)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import verify_pc12 as pc12  # noqa: E402
import verify_pc13 as pc13  # noqa: E402
import verify_pc14 as pc14  # noqa: E402
import verify_pc15 as pc15  # noqa: E402
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

PC16_UI_ICONS = [
    "images/ui/icon_pool_locker.png",
    "images/ui/icon_locker_key.png",
    "images/ui/icon_swim_cap.png",
    "images/ui/icon_pool_pass.png",
]
# the PC-16 set re-uses existing formal art under new names (image quota): copy -> original it was copied from
REUSED_ICON_SOURCES = {
    "images/ui/icon_pool_locker.png": "images/ui/icon_origami_cabinet.png",
    "images/ui/icon_locker_key.png": "images/ui/icon_library_key.png",
    "images/ui/icon_swim_cap.png": "images/ui/icon_rain_ambience.png",
    "images/ui/icon_pool_pass.png": "images/ui/icon_festival_ticket.png",
}

REQUIRED_UI_ICONS = pc15.REQUIRED_UI_ICONS + PC16_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC16_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
    PC13_MODULE,  # only the deletion of PC-13's unused four-tab casebook page (line-exact check below)
]

# every other older extras module stays byte-identical (the casebook page and the folio only *read* their data by name)
OLDER_EXTRAS_MODULES = [m for m in pc15.OLDER_EXTRAS_MODULES if m != PC13_MODULE] + [PC15_MODULE]
# older verifiers edited only for forward compatibility (counts / layout PC-16 legitimately changes)
FORWARD_COMPAT_TESTS = ["tests/verify_pc10.py", "tests/verify_pc11.py", "tests/verify_pc12.py", "tests/verify_pc13.py",
                        "tests/verify_pc14.py", "tests/verify_pc15.py"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges", "astro")),
    ("closedlib", ("library", "theater", "atelier", "sportsday", "haunted", "pool")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

PC15_MAIN_MENU_ROWS = pc14.PC15_MAIN_MENU_ROWS
NAV_RIGHT = pc15.NAV_RIGHT
NAV_CLEARANCE = pc15.NAV_CLEARANCE
HERO_BOOK_X = pc15.HERO_BOOK_X
MENU_BADGE_GAP = 80  # PC-14 / PC-15: the chip column's bottom keeps at least 80px to the progress badge

FOLIO_CASE_TABS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "pool", "notebook"]
CASE_STORES = pc15.CASE_STORES + ["pool_locker_record"]
NOTEBOOK_KEYS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "pool"]

CJK_LINE = pc10.CJK_LINE

LOG_REPORT = {}

# Forward compatibility (PC-17+): PC-17 appends an 8th short case in its own, later-initialising module: the baking-contest
# tab joins the two-tab "salon" group, the casebook grows to eight pages, the folio grid becomes 2 x 5 (one blank cell) and
# achievements 39-40 are added. Those exact counts / widths are verified by their own milestone (verify_pc17); here the
# PC-16 contract is kept: its case, casebook page, spoiler gates, cleanup, main menu and module order.
LATER_MODULES = ["zymase_bakeoff_casebook.rpy"]
PC17_SALON_GROUPS = [("salon", ("teaparty", "lexicon", "bake"))] + SALON_GROUPS_EXPECTED[1:]


def _later_present():
    return [n for n in LATER_MODULES if (GAME_DIR / n).is_file()]


def _pc17_present():
    return (GAME_DIR / "zymase_bakeoff_casebook.rpy").is_file()

# PC-16 header line and section comment that replace PC-13's module header line / four-tab page (line-exact)
PC13_HEADER_OLD = "##   3. 「侦探社推理笔记复盘本」（screen extras_case_notebook + 整页展开弹窗）："
PC13_HEADER_NEW = "##   3. 「侦探社推理笔记复盘本」（只读渲染函数 + 整页展开弹窗；四签页面已在 PC-16 删除，改由 PC-15 的扩容页面承载）："
PC13_SECTION_NEW = (
    "################################################################################\n"
    "## 四、鉴赏分页界面 B：侦探社推理笔记复盘本\n"
    "##   · PC-16：本模块原有的四签单行复盘本页面（screen extras_case_notebook，grid 4 1）自 PC-15 起已无任何引用，\n"
    "##     随 PC-16 删除；鉴赏页「复盘」分页由 PC-15 的 extras_casebook_expanded 承载（PC-16 起七页）。\n"
    "##   · 上方的只读渲染函数（notebook_render_page / notebook_summary / notebook_stamp / notebook_open_page 等）、\n"
    "##     下方的整页展开弹窗 notebook_page_modal 与 notebook_* 样式原样保留，仍被扩容后的复盘本调用。\n"
    "################################################################################\n"
    "\n"
)
PC13_OLD_SECTION_START = (
    "################################################################################\n"
    "## 四、鉴赏分页界面 B：侦探社推理笔记复盘本（screen extras_case_notebook）\n"
    "################################################################################\n"
    "\n"
    "screen extras_case_notebook():\n"
)
PC13_OLD_SECTION_END = "## 复盘本整页展开弹窗（推理链全文、结案报告与页边批注；全部在运行期从该案自己的数据里读出）\n"


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18, 19)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 38, 40, 84)}
    return f, sf


def _git(*args, check=True):
    return subprocess.run(["git", *args], cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=check)


################################################################################
# 0. Sandbox (PC-15 sandbox + PC-16 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc15._sandbox_env()
    for k, v in {"pool_locker_record": {}, "pool_selected_spot": "s1"}.items():
        setattr(mp, k, v)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    return env, mock_renpy, mock_ach, mp


def _screen_blocks(src):
    """{screen name: body} for every top-level `screen` statement of a .rpy source."""
    out = {}
    for m in re.finditer(r"^screen (\w+)\(.*?\):\n(.*?)(?=^\S|\Z)", src, re.S | re.M):
        out[m.group(1)] = m.group(2)
    return out


################################################################################
# 1. Python syntax & init order
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 34, f"Expected >=34 .rpy files (including zwembad_locker_casebook.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-16 module must initialise after zubenelgenubi_meteor_casebook.rpy (achievements append last, NOTEBOOK_CASES
    # already holds PC-15's six pages, the casebook styles exist)
    assert names.index("zwembad_locker_casebook.rpy") > names.index("zubenelgenubi_meteor_casebook.rpy")
    assert names.index("zwembad_locker_casebook.rpy") > names.index("zephyr_relay_casebook.rpy")
    later = _later_present()
    assert names[len(names) - len(later):] == later, f"Later milestone modules must initialise last: {names[-3:]}"
    assert names[-1 - len(later)] == "zwembad_locker_casebook.rpy", f"PC-16 module must be the last top-level module: {names[-3:]}"

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
    # screen-language property / `use` / grid expressions of the PC-16 code parse as Python
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
    assert n_expr >= 180, n_expr
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines, {n_expr} screen expressions); "
          f"PC-16 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    zr_src = _read(PC13_MODULE)
    cb_src = _read(PC15_MODULE)
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-16 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_HAUNTED_TABS", ["haunted"]), ("EXTRAS_ASTRO_TABS", ["astro"]), ("EXTRAS_POOL_TABS", ["pool"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 19 tabs in the same 5 groups, each exactly once; EVERY open state <= 702px.
    #     A 7th tab in "closedlib" would overflow even with PC-15's 48px sext pills (measured below: the reason for the
    #     regroup); the meteor-night tab moves into the star-themed "starlit" group, whose 4-tab open state follows
    #     PC-13's quad rule (an icon per tab + 60px pills), and the pool case takes its place in "closedlib".
    sb = pc10.measure_salon_subbar()
    assert [(g[0], tuple(g[3])) for g in sb["groups"]] == (PC17_SALON_GROUPS if _pc17_present() else SALON_GROUPS_EXPECTED), sb["groups"]
    assert len(sb["keys"]) == len(set(sb["keys"])) == 19 + len(_later_present())
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    labels = {g[0]: g[1] for g in sb["groups"]}
    assert labels == {"salon": "侦探社沙龙", "bookstreet": "旧书街与四季", "starlit": "电波与星空",
                      "closedlib": "放学后短案", "keepsake": "纪念与寄语"}, labels
    assert sb["quad"] == (4, 60, 4) and sb["quint"] == (5, 56, 4) and sb["sext"] == (6, 48, 4), (sb["quad"], sb["quint"], sb["sext"])
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    assert sb["totals"]["pool"] == 1 and sb["totals"]["astro"] == 1 and sb["totals"]["notebook"] == 7 + len(_later_present())
    pill = lambda t, mn, pad: max(mn, _w(f[11], t) + 2 * pad)  # noqa: E731
    grp = lambda lbl: max(66, _w(f[11], lbl) + 12)  # noqa: E731
    # counterfactual: all seven short cases kept in "closedlib" (one icon + seven 48px sext pills)
    seven = ("library", "theater", "atelier", "sportsday", "haunted", "astro", "pool")
    items = [14] + [pill(f"{sb['pills'][t][0]} 1/1", 48, 4) for t in seven]
    for gkey, glabel, _gi, _gt in sb["groups"]:
        if gkey != "closedlib":
            items += [14, grp(glabel)]
    if_seven = sum(items) + 4 * (len(items) - 1)
    assert if_seven > 702, "If seven sext pills fit, the regroup would be unnecessary"
    sext_texts = [_w(f[11], f"{sb['pills'][t][0]} 1/1") for t in seven]
    assert min(sext_texts) >= 40, "Seven pills cannot be shortened below 48px without dropping characters"
    widths = {pill(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}", 48, 4) for t in SALON_GROUPS_EXPECTED[3][1]}
    assert widths == {48}, f"Sext pills are not equal-width: {widths}"
    widths4 = {pill(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}", 60, 4) for t in SALON_GROUPS_EXPECTED[2][1]}
    assert widths4 == {60}, f"Starlit quad pills are not equal-width: {widths4}"
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    assert 'style ("salon_sext_pill" if len(_gtabs) >= 6 else "salon_quint_pill")' in blk
    assert 'style ("salon_quad_pill" if len(_gtabs) >= 4 else "bookstreet_subtab_pill")' in blk
    report["SubBarWorst"] = sb["worst"]
    report["SubBarStarlit"] = sb["per_group"]["starlit"]
    report["SubBarClosedlib"] = sb["per_group"]["closedlib"]
    report["SubBarIfSevenInClosedlib"] = if_seven

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    assert _w(f[18], sub) + 2 * len(sub) <= 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "pool_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- pool-locker page ----------------
    case = env["POOL_CASE"]
    spots = env["POOL_SPOTS"]
    links = env["POOL_LAP_LINKS"]
    tiers = env["POOL_RATING_TIERS"]
    strokes = env["POOL_STROKES"]
    card_w = int(_style_prop(new_src, "pool_spot_card", "xsize"))
    card_pad = int(_style_prop(new_src, "pool_spot_card", "padding").strip("()").split(",")[0])
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
    slot_w = int(_style_prop(new_src, "pool_lap_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "pool_lap_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "pool_lap_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Lap slots overflow"
    assert 'add Solid(l_obj["color"]) xysize (151, 3)' in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Lap slot content too tall"
    widest_short = 0
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        widest_short = max(widest_short, _w(f[12], k["short"]))
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Lap short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    report["LapShort"] = widest_short
    tier_w = int(_style_prop(new_src, "pool_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["WaveTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "浪花评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"
    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    assert 36 + 10 + 398 + hdr_right <= console_inner, "Pool header overflows"
    assert _w(sf[19], case["title"]) <= 398
    for s in ("已结案 · 混合泳四段已全部游完 · 可随时重回泳池冲击金浪花", "区赛前一天，队长的钥匙开不了自己的柜子 · 队帽去了哪"):
        assert _w(f[12], s) <= 398, f"Pool header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert len(strokes) * 40 + (len(strokes) - 1) * 6 <= 178 and "xysize (40, 5)" in new_src
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Pool time-tag line overflows 492px: {tag_line}px"
    light = 15 + 6 + _w(f[12], "光影：" + case["lighting_note"])
    assert light <= 492, f"Pool lighting line overflows 492px: {light}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 勘查点全查完）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再回到游泳馆）")
    assert arch_solved <= 492 and arch_open <= 492, f"Pool archive line overflows: {arch_solved}/{arch_open}px"
    report["PoolTagLine"] = tag_line
    report["PoolLighting"] = light
    report["PoolArchive"] = max(arch_solved, arch_open)
    for s in ("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：", "混合泳四段 · 复盘（手法 → 时机 → 去向 → 戴帽人，结案后显影）："):
        assert _wb(f[12], s) <= console_inner, s
    margin_inner = console_inner - 2 * int(_style_prop(new_src, "pool_margin_box", "padding").strip("()").split(",")[0])
    margin_head = (16 + 6 + _wb(f[12], "墨墨的页边续批 · 防剧透火漆") + 10
                   + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert margin_head <= margin_inner
    notice = _w(f[11], env["POOL_MASK_NOTICE"])
    assert notice <= margin_inner, f"Mask notice wraps ({notice}px > {margin_inner}px)"
    assert _lines(f[12], case["margin_secret"], margin_inner) <= 3
    for s in ("结案报告：游完混合泳四段之后，墨墨会把推理链和完整的结案报告写在这里。",
              "剧透许可已开启 · 游完混合泳四段结案之后，墨墨的续批会显影在这里。",
              "还没有亲自勘查这一处。回到游泳馆查过之后，现场手记会显影在这里。"):
        assert _w(f[12], s) <= margin_inner, s
    assert _lines(f[12], case["solution_pub"], scroll_inner) <= 4
    assert _w(f[12], case["mo_note_pub"]) <= scroll_inner and _lines(f[12], case["alice_note_pub"], scroll_inner) <= 1
    footer = (_w(f[12], "零失误游完混合泳四段可获金浪花 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
              + 8 + max(146, _w(f[15], "重回游泳馆") + 36, _w(f[15], "走进游泳馆") + 36))
    assert footer <= console_inner, f"Pool footer overflows: {footer}px"
    report["PoolFooter"] = footer
    quick = (20 + 10 + _w(sf[14], "推理笔记复盘本 · 扩容收录本案") + 10 + _w(f[12], "（已盖复盘章 7/7）")
             + 8 + max(84, _w(f[13], "翻开复盘本") + 22))
    assert quick <= 722 - 24, f"Casebook quick row overflows: {quick}px"
    report["PoolQuickRow"] = quick

    # in-scene lap banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "pool_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "pool_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728 and banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "游泳馆 · 混合泳四段") + 8 + _w(f[11], "已游完 4/4 · 失误只计入本案浪花评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen pool_lap_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    shots_src = _read("game/tests/ui_shots.rpy")
    shot_prompt = re.search(r'Show\("pool_lap_banner", laps_done=2, prompt_line="([^"]+)"\)', shots_src).group(1)
    assert shot_prompt == prompts[2][1], "ui_shots banner prompt must match the in-game third-lap prompt"
    report["LapBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "更衣柜结案 · SW-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(strokes) * 152 <= 608 and "xysize (152, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入更衣柜浪花评级，不影响主线）",
              "首次结案 · 混合泳四段已写入鉴赏室「游泳池更衣柜」分页，复盘本扩容到了七页",
              "重玩挑战 · 刷新个人纪录！这一次的四段比以往任何一次都游得更顺",
              "重玩挑战 · 再次摘下金浪花，泳池名侦探实至名归",
              "重玩挑战 · 零失误游完混合泳四段，就能把金浪花挂上游泳馆的白板"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    assert _w(f[13], case["mo_note_pub"]) <= 580 and _lines(f[13], case["alice_note_pub"], 580) <= 2
    assert max(96, _w(f[15], "收好号码牌并返回鉴赏室") + 36) <= 248 + 40
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"SW-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(strokes) * 173 <= 692 and "xysize (173, 3)" in new_src and "xsize 658" in new_src
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重回游泳馆") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- expanded casebook: seven pages in PC-15's 3-column index grid (3 x 3, two empty cells) ----------------
    nb_cases = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb_cases] == NOTEBOOK_KEYS
    pages = [env["notebook_render_page"](n["key"]) for n in nb_cases]
    assert all(p["available"] for p in pages), "Every casebook page must find its case module in the sandbox"
    page_inner = 722 - 2 * int(_style_prop(zr_src, "notebook_page_card", "padding").strip("()").split(",")[0])
    assert page_inner == 694
    cn = env["casebook_count_cn"](len(nb_cases))
    assert cn == "七"
    for s in (f"{cn}枚复盘章已全部盖好 · 下次遇到怪事，先翻这本本子。", "TRUE END 已通关 · 复盘本页边的续批已全部显影。",
              "已手动开启剧透许可 · 复盘本页边的续批当前可见。", f"{cn}桩短案的证物与推理 · 涉终章的页边续批由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Casebook header line wraps ({_w(f[12], s)}px): {s}"
    cb_hdr = (36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "复盘章 7/7") + 20) + 6
              + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert cb_hdr <= page_inner, f"Casebook header overflows: {cb_hdr}px"
    report["CasebookHeader"] = cb_hdr
    idx_w = int(_style_prop(cb_src, "casebook_index_tab", "xsize"))
    idx_h = int(_style_prop(zr_src, "notebook_index_tab", "ysize"))
    idx_pad = [int(x) for x in _style_prop(zr_src, "notebook_index_tab", "padding").strip("()").split(",")]
    rows = env["casebook_index_rows"]()
    assert "grid 3 casebook_index_rows():" in cb_src and 3 * idx_w + 2 * 10 == 722 and rows == 3
    assert "for _cbpad in range((3 - _ncount % 3) % 3):" in cb_src and (3 - len(nb_cases) % 3) % 3 == 2
    assert "null width 234 height 70" in cb_src and idx_h == 70
    idx_inner = idx_w - 2 * idx_pad[0]
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
    grid_h = rows * idx_h + (rows - 1) * 10
    report["CasebookIndexGrid"] = f"3x{rows} ({grid_h}px tall, 2 empty cells)"
    cell_w = int(_style_prop(zr_src, "notebook_evidence_cell", "xsize"))
    cell_inner = cell_w - 2 * int(_style_prop(zr_src, "notebook_evidence_cell", "padding").strip("()").split(",")[0])
    assert 3 * cell_w + 2 * 8 == page_inner and "null width 226 height 62" in cb_src
    widest_head = max_ev_lines = 0
    for n, p in zip(nb_cases, pages):
        head = 6 + 8 + 86 + 8 + _w(sf[18], f"《{p['short_title']}》") + 10 + max(96, _w(f[12], p["best_name"]) + 20)
        widest_head = max(widest_head, head)
        assert head <= page_inner, f"Casebook page head `{n['key']}` overflows: {head}px"
        assert _w(f[12], f"{p['index_label']}  ·  {p['time_tag']}") <= page_inner
        assert len(p["chain"]) == 4 and len(p["evidence_rows"]) == 6
        foot = (_w(f[12], "已勘查 6/6 · 已结案 99 次") + 10 + max(84, _w(f[13], "前往" + n["index_label"]) + 22) + 8
                + max(84, _w(f[13], "展开整页") + 22) + 8 + max(146, _w(f[15], "已盖复盘章") + 36))
        assert foot <= page_inner, f"Casebook footer `{n['key']}` overflows: {foot}px"
    pool_page = env["CASEBOOK_POOL_PAGE"]
    for h in spots:
        ln = _lines(f[11], h["evidence"], cell_inner)
        max_ev_lines = max(max_ev_lines, ln)
        assert ln <= 2, f"Pool evidence `{h['evidence']}` needs {ln} lines in a {cell_inner}px cell"
        assert _wb(f[10], f"{h['code']} · {h['label']}") <= cell_inner
    for k in links:
        assert _w(f[12], k["short"]) <= 151 and _wb(f[11], f"{k['step']} · {k['name']}") <= 151
    for s in (pool_page["lesson"], pool_page["mo_margin"]):
        assert _lines(f[12], s, page_inner - 24) <= 2, f"Pool casebook margin line too long: {s}"
    assert _lines(f[12], pool_page["margin_secret"], page_inner - 24) <= 3
    assert _w(f[12], f"{pool_page['unit']} · 复盘（结案后显影）：") <= page_inner
    best_line_max = max(_w(f[12], f"最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 已结案 99 次") for t in tiers)
    assert best_line_max <= page_inner
    report["CasebookPageHead"] = widest_head
    report["CasebookPoolEvidenceLines"] = f"{max_ev_lines} lines max"
    summary = 18 + 6 + _w(sf[13], "复盘总评") + 10 + _w(f[11], "已结案 7/7 · 金评级 7/7 · 累计结案 99 次 · 最少失误合计 99 次")
    assert summary <= 722 - 28, f"Casebook summary row overflows: {summary}px"
    assert _lines(f[12], env["CASEBOOK_VERDICT"] % cn, 722 - 28) <= 2
    assert _w(f[12], f"{cn}桩短案全部结案之后，艾丽丝会在这里写下她的复盘总评。") <= 722 - 28
    report["CasebookSummary"] = summary
    # page modal (740 - 48 = 692): the pool page's chain text at 658px
    for k in links:
        assert _lines(f[13], f"{k['step']} · {k['name']}：{k['full']}", 658) <= 4, f"Modal chain text too long: {k['id']}"
    hdr_modal = 40 + 12 + _w(sf[20], f"SW-01 · 《{case['short_title']}》") + 10 + 28 + 6 + _wb(f[13], "已盖复盘章")
    assert hdr_modal <= 692
    report["CasebookModalHead"] = hdr_modal

    # ---------------- folio modal: seven cases + the seven-page casebook in one 2 x 4 grid ----------------
    folio = pc14._folio_block(scr_src)
    panel_w = int(_style_prop(scr_src, "folio_panel", "xsize"))
    panel_pad = [int(x) for x in _style_prop(scr_src, "folio_panel", "padding").strip("()").split(",")]
    fcard_w = int(_style_prop(scr_src, "folio_card", "xsize"))
    fcard_h = int(_style_prop(scr_src, "folio_card", "ysize"))
    fcard_pad = [int(x) for x in _style_prop(scr_src, "folio_card", "padding").strip("()").split(",")]
    panel_inner = panel_w - 2 * panel_pad[0]
    grid_hdr = "grid 2 5:" if _pc17_present() else "grid 2 4:"  # (PC-17: 2 x 5 with one blank cell -- verify_pc17)
    assert panel_inner == 2 * fcard_w + 12 == 712 and grid_hdr in folio and "xspacing 12" in folio
    grid_blk = folio.split(grid_hdr, 1)[1].split("\n            hbox:", 1)[0]
    assert grid_blk.count("use extras_folio_case_card(") == 8 + len(_later_present()), "The grid holds the cases + the casebook"
    assert "folio_wide_card" not in scr_src and "wide=" not in scr_src, "PC-15's wide card is gone (no longer referenced)"
    assert fcard_w - 2 * fcard_pad[0] >= 34 + 10 + 278 and "                xsize 278\n" in scr_src
    card_titles = re.findall(r'use extras_folio_case_card\("[^"]+", _\("([^"]+)"\)', folio)
    assert len(card_titles) == 8 + len(_later_present()) and "游泳池更衣柜" in card_titles and card_titles[-1] == "推理笔记复盘本", card_titles
    statuses = ["待结案"]
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS",
                "HAUNTED_RATING_TIERS", "ASTRO_RATING_TIERS", "POOL_RATING_TIERS"):
        statuses += [t["name"] for t in env[var]]
    widest_title = 0
    for t in card_titles:
        for st in statuses + ["复盘章 7/7"]:
            row = _w(sf[15], t) + 6 + _wb(f[12], st)
            widest_title = max(widest_title, row)
            assert row <= 278, f"Folio card `{t}` + `{st}` overflows 278px: {row}px"
    # (cards of later milestones are measured by their own verifier: their case data is not in this sandbox)
    case_lines = [env["folio_case_line"](v, u) for v, u in re.findall(r'folio_case_line\("(\w+)", "([^"]+)"\)', folio) if v in env]
    assert len(case_lines) == 7 and "----" not in case_lines
    case_lines += re.findall(r'use extras_folio_case_card\("[^"]+", _\("[^"]+"\), _\("([^"]+)"\)', folio)
    assert len(case_lines) == 8 and ("八桩" if _pc17_present() else "七桩") in case_lines[-1]
    widest_line = max(_w(f[11], s) for s in case_lines)
    assert widest_line <= 278, f"Folio card sub-line overflows: {widest_line}px"
    sec_h = round(12 * CJK_LINE)
    head_h = max(44, round(22 * CJK_LINE) + 2 + round(12 * CJK_LINE))
    g_rows = 5 if _pc17_present() else 4
    f_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8 + (g_rows * fcard_h + (g_rows - 1) * 8) + 8 + 34)
    pc15_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8 + (3 * fcard_h + 2 * 8) + 8
              + fcard_h + 8 + 34)
    assert f_h <= 720 - 2 * 24 and (f_h == pc15_h or _pc17_present()), f"Folio modal height {f_h}px (PC-15 {pc15_h}px)"
    seal_w = max(max(96, _w(f[12], s) + 20) for s in ("火漆 · 已通关解封", "火漆 · 手动解封", "火漆 · 封存中"))
    f_head = (44 + 12 + max(_w(sf[22], "番外卷宗"), _w(f[12], pc14.folio_header_sub(folio)))
              + 10 + max(96, _w(f[12], "已完成 10/10") + 20) + 6 + seal_w)
    assert f_head <= panel_inner, f"Folio header overflows: {f_head}px"
    report["FolioCardTitle"] = widest_title
    report["FolioCardLine"] = widest_line
    report["FolioHeader"] = f_head
    report["FolioHeight"] = f"{f_h} (PC-15 {pc15_h})"

    # ---------------- main menu: no new chip, rows unchanged, zero overlap with the nav column, badge gap kept ----------------
    mm = pc14.measure_main_menu(env)
    assert env["folio_total_count"]() == 10 + len(_later_present())
    assert mm["rows"] == PC15_MAIN_MENU_ROWS, mm["rows"]
    assert sorted(mm["chips"]) == sorted(k for r in PC15_MAIN_MENU_ROWS for k in r) and len(mm["chips"]) == 14
    assert "pool" not in mm["chips"] and "pool" in mm["folio_tabs"], "The pool case is reachable only via the folio"
    assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
    assert mm["separators"] == [8, 8, 8], mm["separators"]
    nav = pc15._nav_column_extent()
    gaps = []
    for i, (w, lft, rgt) in enumerate(zip(mm["row_w"], mm["left"], mm["right"])):
        gaps.append(round(lft - NAV_RIGHT, 1))
        assert lft >= NAV_RIGHT + NAV_CLEARANCE, f"Row {i + 1} left edge {lft:.1f}px is within {NAV_CLEARANCE}px of the nav column"
        assert rgt <= HERO_BOOK_X, f"Row {i + 1} right edge {rgt:.1f}px runs into the title art's heroine"
        assert w <= max(mm["row_w"][:2]), f"Row {i + 1} ({w}px) wider than rows 1-2"
    assert len(set(mm["centers"])) == 1
    assert mm["bottom"] == 593 and mm["gap"] >= MENU_BADGE_GAP, f"Column bottom / badge gap changed: {mm}"
    folio_row = [i for i, r in enumerate(mm["rows"]) if "folio" in r][0]
    old_chip = 2 * 9 + 16 + 5 + _w(ImageFont.truetype(str(GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"), 12), "番外卷宗 (9/9)")
    report["MainMenuRows"] = "/".join(str(len(r)) for r in mm["rows"]) + " (no new chip)"
    report["MainMenuRowWidths"] = "/".join(str(round(w)) for w in mm["row_w"])
    report["MainMenuNavGap"] = "/".join(str(g) for g in gaps) + f" (min {min(gaps)})"
    report["FolioChip"] = f"{round(mm['chip_w']['folio'])} (PC-15 {round(old_chip)})"
    report["FolioRowLeft"] = round(mm["left"][folio_row], 1)
    report["MainMenuRight"] = f"{max(mm['right']):.0f}"
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['gap']})"
    report["NavColumnY"] = f"{nav['max'][0]}..{nav['max'][1]}"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    grid_txt = ("2×20 = 40", "2×20 共 40 枚") if _pc17_present() else ("2×19 = 38", "2×19 共 38 枚")  # (PC-17: verify_pc17)
    assert "grid 2 ach_grid_rows():" in ach_src and grid_txt[0] in ach_src and grid_txt[1] in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_pool_locker", "ach_golden_wave"):
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
# 3. Sandbox runtime: case, rating, spoiler gates, casebook expansion, folio, cleanup, main menu
################################################################################

def _case_block(src):
    m = re.search(r"^label pool_locker_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label pool_locker_case"
    return m.group(1)


# every lap of the chain must be traceable to the clues it rests on (spot ids) and say so in its own words
LAP_TRACE = {
    "k1": {"s1": "小铁环", "s2": "八只"},
    "k2": {"s2": "16:36", "s3": "剪齐"},
    "k3": {"s3": "侧缝", "s5": "看台", "s6": "备用泳帽"},
    "k4": {"s1": "07", "s4": "7 号柜", "s2": "丸子头"},
}
OLDER_SLOTS = pc15.OLDER_SLOTS + ([1, 2, 0, 2],)  # PC-10 .. PC-15


def check_pc16_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 38 achievements (2x19), PC-16 pair appended after PC-15 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 38 and env["ach_grid_rows"]() == 19 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_astro_telescope", "ach_first_magnitude", "ach_pool_locker", "ach_golden_wave"], ach_ids[-4:]
    assert "ach_pool_locker" in mock_ach.registered and "ach_golden_wave" in mock_ach.registered

    # ---- B. case data ----
    case, spots, links, tiers = env["POOL_CASE"], env["POOL_SPOTS"], env["POOL_LAP_LINKS"], env["POOL_RATING_TIERS"]
    assert case["label"] == "pool_locker_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    all_codes = set(re.findall(r'"code": "([A-Z]+-\d+)"', "\n".join(
        p.read_text(encoding="utf-8-sig") for p in GAME_DIR.glob("*.rpy") if p.name != Path(NEW_MODULE).name)))
    assert case["code"] == "SW-01" and case["code"] not in all_codes
    assert [s["id"] for s in spots] == [f"s{i}" for i in range(1, 7)]
    assert [s["code"] for s in spots] == [f"LK-0{i}" for i in range(1, 7)] and not all_codes & {s["code"] for s in spots}
    for s in spots:
        assert s["where"] and s["keeper"] and s["scene"] in env["BG_LIGHT"], s["id"]
        assert len(s["detail"]) >= 70 and s["evidence"] and s["surface"]
        assert env["EVIDENCE_DETAILS"][s["evidence"]] == (s["observer"], s["detail"]), f"{s['id']} flip detail not registered"
    assert len({s["evidence"] for s in spots}) == 6
    older_ev = set()
    for var in ("LIBRARY_HOTSPOTS", "THEATER_HOTSPOTS", "ATELIER_HOTSPOTS", "SPORTS_ITEMS", "HAUNTED_SPOTS", "ASTRO_SPOTS"):
        older_ev |= {h["evidence"] for h in env[var]}
    assert not older_ev & {s["evidence"] for s in spots}
    # the clue icons named after the round's art are used by the matching clue only
    assert [s["id"] for s in spots if s["icon"].endswith("icon_locker_key.png")] == ["s1"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_swim_cap.png")] == ["s3"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_pool_pass.png")] == ["s4"]
    assert [k["name"] for k in links] == ["手法", "时机", "去向", "戴帽人"], "Four laps: method -> timing -> whereabouts -> wearer"
    assert [k["step"] for k in links] == ["蝶泳段", "仰泳段", "蛙泳段", "自由泳段"], "Medley order: fly, back, breast, free"
    stroke_col = {b["name"]: b["color"] for b in env["POOL_STROKES"]}
    for k in links:
        assert stroke_col[k["stroke"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
        assert k["step"].startswith(k["stroke"])
    assert len({k["color"] for k in links}) == 4, "Each lap gets its own colour"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金浪花", "银浪花", "铜浪花"]
    older_tiers = set()
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS",
                "HAUNTED_RATING_TIERS", "ASTRO_RATING_TIERS"):
        older_tiers |= {t["name"] for t in env[var]} | {t["title"] for t in env[var]}
    assert not older_tiers & ({t["name"] for t in tiers} | {t["title"] for t in tiers}), "Wave ratings must be new"
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]
    for word in ("23 号手环", "7 号柜", "队帽", "补测", "缝好"):
        assert word in case["solution_pub"], f"Solution does not name `{word}`"
    for word in ("鬼魂", "灵异", "附身", "诅咒", "超自然", "闹鬼", "幽灵", "外星", "水鬼", "鬼"):
        assert word not in case["solution_pub"] + "".join(k["full"] for k in links) + case["summary_pub"], \
            f"Supernatural wording `{word}`"
    used = set()
    for k in links:
        for sid, word in LAP_TRACE[k["id"]].items():
            assert word in k["full"], f"{k['id']} does not cite {sid} (`{word}`)"
            spot_text = next(s for s in spots if s["id"] == sid)
            assert word in spot_text["detail"] + spot_text["surface"] + spot_text["evidence"] + spot_text["label"], \
                f"{k['id']} cites `{word}` but clue {sid} never shows it"
            used.add(sid)
    assert used == {s["id"] for s in spots}, f"Clues not used by the chain: {set(s['id'] for s in spots) - used}"
    public = "".join(str(case[k]) for k in case if k != "margin_secret") + str(spots) + str(links) + env["POOL_MASK_NOTICE"]
    for kw in SECRET_KEYWORDS:
        assert kw not in public, f"Spoiler keyword `{kw}` in public pool-locker copy"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in case["margin_secret"]) >= 2, "The gated note should be endgame material"

    # ---- C. script structure: 6 spots -> medley laps -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "pool_case_investigate")
    for i in range(1, 7):
        assert f"if not _lk_s{i}:" in inv and f'$ pool_inspect_spot("s{i}")' in inv, f"spot s{i} not playable"
    assert inv.count("jump pool_case_investigate") == 6 and "jump pool_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"pool_lap_k{i}")
        assert f"show screen pool_lap_banner({i - 1}, " in kb
        assert kb.count("$ _lk_mistakes += 1") == 2 and kb.count(f"jump pool_lap_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _lk_laps = {i}" in kb
        for m_wrong in re.finditer(r"\$ _lk_mistakes \+= 1(.*?)jump pool_lap_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
        # the line Chen Mo says after the right answer is the lap's own `full` text (one source of truth)
        after = kb.split("\n    mc \"", 1)[1].split("\"\n", 1)[0]
        assert after == links[i - 1]["full"], f"k{i}: the spoken deduction differs from POOL_LAP_LINKS"
    assert len(set(correct_positions)) >= 3, f"Correct lap always at the same menu slot: {correct_positions}"
    assert correct_positions not in OLDER_SLOTS, "Answer slots must not copy PC-10 .. PC-15"
    assert "call _pool_finish_case(_lk_mistakes)" in blk and "label pool_case_resolution:" in blk
    assert blk.index("show screen evidence_book") < blk.index("label pool_case_investigate:"), "Evidence HUD must be up first"
    assert "hide screen evidence_book" in _label_block(src, "_pool_finish_case")
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the pool-locker case"
    assert "truth_spoiler_unlocked" not in blk, "The pool-locker script is fully public (only the page margin is gated)"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public pool-locker case"
    for phrase in ("帽子从头到尾，都没有离开过游泳馆", "一枚换了手环的号码牌", "不戴泳帽，不许下水", "铆死"):
        assert phrase in blk, f"Resolution must spell out the real mechanism (`{phrase}`)"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"hall", "corridor", "clubroom", "storeroom", "agency"} <= scenes_used, scenes_used
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
    assert module_defines == {"gulan": "顾澜", "xiaoli": "方小鲤", "geayi": "葛阿姨"}, module_defines
    assert not cast & set(module_defines), "Sprite-less newcomers must never be `show`n"
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert not re.search(rf"\b{var}\s*=", every_rpy), f"`{var}` already assigned elsewhere"
        assert not re.search(rf"\b{var}\b", every_rpy), f"`{var}` already used elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    # the case-local prefix `_lk_` and the module's identifiers are new (PC-15 once collided with PC-12)
    prod_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.glob("*.rpy") if p.name != Path(NEW_MODULE).name)
    assert "_lk_" not in every_rpy and not re.search(r"\bpool_\w+\s*\(", prod_rpy.replace("pool_case_solved_count", "")
                                                                                .replace("pool_best_short", "")), \
        "Only the folio / sub-bar may call into the PC-16 module"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"gulan", "geayi", "huang", "lin", "zhang", "alice", "mo_note", "mc", "xiaoli", "sysmsg"} <= speakers, speakers
    _sprite_slots_ok(blk, "pool_locker_case")
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_lk_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("pool_locker_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "pool_locker_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["pool_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "pool_locker_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "pool"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p", "bgm_daily": "d"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "SW-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_pool_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_lk_s{i}"] is True for i in range(1, 7))
    assert env["_lk_mistakes"] == 8 and env["_lk_laps"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {s["evidence"] for s in spots}
    assert env["pool_get_record"]()["inspected"] == [f"s{i}" for i in range(1, 7)]
    assert env["pool_inspect_spot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievements (gold run -> ach_golden_wave) ----
    assert [env["pool_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.pool_locker_record = {}
    mock_ach.granted.clear()
    assert env["pool_case_solved_count"]() == 0 and env["pool_best_short"]() == "待结案"
    v0 = env["pool_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["lap_shorts"]) and not any(v0["lap_fulls"])
    r = env["pool_record_solve"](5)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_pool_locker") and not mock_ach.has("ach_golden_wave")
    r = env["pool_record_solve"](1)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 1
    assert not mock_ach.has("ach_golden_wave")
    r = env["pool_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and mock_ach.has("ach_golden_wave")
    r = env["pool_record_solve"](2)
    assert not r["new_record"] and r["replays"] == 4 and r["best_tier"] == "gold" and r["last_tier"] == "silver"
    assert env["pool_gold_count"]() == 1 and env["pool_best_short"]() == "金浪花"
    v = env["pool_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["lap_shorts"] == [k["short"] for k in links]
    env["pool_open_report_modal"]()
    assert env["pool_get_record"]()["report_viewed"] and any(s[0] == "pool_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    for fn in ("library_case_solved_count", "theater_case_solved_count", "atelier_case_solved_count",
               "sports_case_solved_count", "haunted_case_solved_count", "astro_case_solved_count"):
        assert env[fn]() == 0, f"Older case store touched ({fn})"

    # ---- F. accordion sub-bar helpers (19 tabs / 5 groups; the meteor night now opens "starlit") ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if env["_SALON_TAB_PILLS"][t][1] in env:  # (later milestones' counters are not in this sandbox)
                assert re.fullmatch(r"\S+ \d+/\d+", env["salon_tab_pill_text"](t)), t
    assert env["salon_open_group"]("pool") == "closedlib" and env["salon_tab_pill_text"]("pool") == "泳池 1/1"
    assert env["salon_open_group"]("astro") == "starlit" and env["salon_tab_pill_text"]("astro") == "天文 0/1"
    assert env["salon_tab_icon"]("pool").endswith("icon_pool_locker.png")
    assert env["salon_tab_pill_text"]("notebook") == "复盘 0/7"
    mp.extras_salon_group = "closedlib"
    assert env["salon_open_group"]("endings") == "closedlib", "A remembered group still opens on non-salon tabs"

    # ---- G. zero-side-channel spoiler gate on the page margin (strongest state: solved, gold) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for s in _strings(view):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` leaked in {where}"

    locked = env["pool_render_view"]()
    _clean(locked, "pool-locker view")
    assert locked["display_secret"] == "" and locked["display_masked_notice"] == env["POOL_MASK_NOTICE"] and not locked["unlocked"]
    saved_secret = case["margin_secret"]
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}", "续"):
        case["margin_secret"] = filler
        assert env["pool_render_view"]() == locked, "Locked pool-locker view depends on the gated text"
        proofs += 1
    case["margin_secret"] = saved_secret
    mp.te_cleared = True
    un = env["pool_render_view"]()
    assert un["unlocked"] and un["display_secret"] == saved_secret and un["display_masked_notice"] == ""
    mp.pool_locker_record = {}
    assert env["pool_render_view"]()["display_secret"] == "", "Unsolved case must stay blank even when unlocked"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["pool_render_view"]()["display_secret"] == ""
    env["pool_record_solve"](1)
    assert "小雪" in env["pool_render_view"]()["display_secret"]
    mp.truth_spoiler_confirmed = False
    assert env["pool_render_view"]()["display_secret"] == ""

    # ---- H. casebook 6 -> 7 pages: PC-13 / PC-15 pages untouched, read-only, stamps, achievement, spoiler gate ----
    pc15_env = pc15._sandbox_env()[0]
    nb = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb] == NOTEBOOK_KEYS
    assert nb[:6] == pc15_env["NOTEBOOK_CASES"], "PC-13's four pages + PC-15's two pages must stay exactly as registered"
    assert nb[6] is env["CASEBOOK_POOL_PAGE"] and set(env["_NOTEBOOK_BY_KEY"]) == set(NOTEBOOK_KEYS)
    pg = env["CASEBOOK_POOL_PAGE"]
    assert pg["tab"] == pg["key"] == "pool" and pg["store"] in CASE_STORES and re.fullmatch(r"#[0-9a-f]{6}", pg["ink"])
    assert {pg["case_var"], pg["hotspots_var"], pg["links_var"], pg["tiers_var"]} <= set(env)
    for s in (pg["lesson"], pg["mo_margin"], pg["index_label"], pg["unit"]):
        for kw in SECRET_KEYWORDS:
            assert kw not in s, f"Spoiler keyword `{kw}` in public casebook copy (pool)"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in pg["margin_secret"]) >= 2, "pool gated note"
    assert re.search(r"[\[\]{}]", pg["margin_secret"] + pg["lesson"] + pg["mo_margin"]) is None
    assert len({n["ink"] for n in nb}) == 7, "Every casebook page has its own ink colour"
    # the module merges its page once, never twice (re-running the init block is idempotent)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    assert [n["key"] for n in env["NOTEBOOK_CASES"]] == NOTEBOOK_KEYS
    nb = env["NOTEBOOK_CASES"]
    assert env["casebook_index_rows"]() == 3 and env["casebook_count_cn"](len(nb)) == "七"

    # read-only: rendering every page / the summary leaves every persistent field byte-identical
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.pool_locker_record = {"solved": True, "replays": 1, "best_tier": "silver", "best_mistakes": 2,
                             "inspected": ["s1", "s4"]}
    mp.notebook_selected_case = "library"
    snap = _persistent_snapshot(mp)
    n_ops = 0
    for _round in range(3):
        for key in NOTEBOOK_KEYS + ["bogus"]:
            env["notebook_render_page"](key)
            n_ops += 1
        env["casebook_summary"]()
        env["casebook_index_rows"]()
        env["casebook_count_cn"](7)
        env["folio_done_count"]()
        env["folio_case_line"]("POOL_CASE", "混合泳四段")
        n_ops += 5
    assert _persistent_snapshot(mp) == snap, "Casebook / folio rendering wrote persistent state"
    pp = env["notebook_render_page"]("pool")
    assert pp["solved"] and pp["best_name"] == "银浪花" and pp["inspected_count"] == 2 and pp["hotspot_total"] == 6
    assert pp["unit"] == "混合泳四段" and pp["status"] == "ready" and pp["code"] == "SW-01"
    assert [r[3] for r in pp["evidence_rows"]] == [True, False, False, True, False, False]
    assert [r[2] for r in pp["evidence_rows"] if not r[3]] == ["", "", "", ""], "Uninspected evidence must stay blank"
    assert pp["chain"] == [(k["step"], k["name"], k["short"]) for k in links]
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    tree = ast.parse(init_code)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith(("pool_render", "pool_best", "pool_case_solved",
                                                                       "pool_gold", "pool_get", "pool_tier", "pool_rate",
                                                                       "pool_spoiler")):
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Assign, ast.AugAssign)):
                    for t in (sub.targets if isinstance(sub, ast.Assign) else [sub.target]):
                        assert not (isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "persistent"), \
                            f"{node.name} writes persistent.{t.attr}"
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute):
                    assert sub.func.attr not in ("save_persistent", "append", "update"), f"{node.name} calls .{sub.func.attr}()"
    # summary & verdict: written for seven pages, shown only when all seven are solved
    s0 = env["casebook_summary"]()
    assert s0["total"] == 7 and s0["count_cn"] == "七" and s0["display_verdict"] == ""
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve",
                  "haunted_record_solve", "astro_record_solve"):
        env[solve](0)
    s1 = env["casebook_summary"]()
    assert s1["solved"] == 7 and "七桩案子" in s1["display_verdict"] and "六桩" not in s1["display_verdict"]
    _clean(s1, "casebook summary")
    # stamps: only the casebook's own store (and the selected page) change; PC-13's achievement keeps its "four PC-13 pages" rule
    mp.case_notebook_record = {}
    mock_ach.granted.clear()
    before = _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case"))
    for key in ("pool", "astro", "haunted", "library"):
        assert env["casebook_stamp"](key) is not None
    assert env["notebook_stamped_count"]() == 4 and not mock_ach.has("ach_case_notebook"), \
        "Four stamps that are not PC-13's four pages must not grant 「推理笔记的复盘人」 early"
    for key in ("theater", "atelier"):
        env["casebook_stamp"](key)
    assert not mock_ach.has("ach_case_notebook")
    env["casebook_stamp"]("sportsday")
    assert mock_ach.has("ach_case_notebook") and env["notebook_stamped_count"]() == 7
    assert env["casebook_stamp"]("pool")["stamped"].count("pool") == 1, "Stamping twice must stay idempotent"
    assert _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case")) == before, \
        "Stamping touched a store other than the casebook's own"
    mp.pool_locker_record = {}
    mp.case_notebook_record = {}
    assert env["casebook_stamp"]("pool") is None and "pool" not in env["notebook_get_record"]()["stamped"]
    # pool page spoiler gate: a locked page never depends on its gated note
    mp.pool_locker_record = {"solved": True, "replays": 1, "best_tier": "gold", "best_mistakes": 0, "inspected": []}
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    lockedp = env["notebook_render_page"]("pool")
    _clean(lockedp, "casebook page pool")
    assert lockedp["display_secret"] == "" and lockedp["display_masked_notice"] != ""
    saved = pg["margin_secret"]
    for filler in ("Z" * 280, "", "小雪周可" * 30, "[b]"):
        pg["margin_secret"] = filler
        assert env["notebook_render_page"]("pool") == lockedp, "Locked casebook page pool depends on its gated note"
        proofs += 1
    pg["margin_secret"] = saved
    mp.te_cleared = True
    assert env["notebook_render_page"]("pool")["display_secret"] == saved
    mp.te_cleared = False

    # ---- I. folio: seven cases + the seven-page casebook, counts, graceful degradation, wiring ----
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.dlc_alice_done = False
    mp.dlc_mo_done = False
    assert env["folio_done_count"]() == 0 and env["folio_total_count"]() == 10 + len(_later_present())
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve",
                  "haunted_record_solve", "astro_record_solve", "pool_record_solve"):
        env[solve](1)
    mp.dlc_alice_done = mp.dlc_mo_done = True
    assert env["folio_done_count"]() == 9, "Casebook not fully stamped yet"
    for key in NOTEBOOK_KEYS:
        env["casebook_stamp"](key)
    assert env["folio_done_count"]() == 10 == env["folio_total_count"]() - len(_later_present())
    saved_counter = env.pop("pool_case_solved_count")
    assert env["folio_done_count"]() == 9, "A missing counter must count as not done, never crash"
    env["pool_case_solved_count"] = saved_counter
    line = env["folio_case_line"]("POOL_CASE", "混合泳四段")
    _clean(line, "folio pool line")
    assert line == "SW-01 《错位的二十三号钥匙》 · 混合泳四段"
    scr_src = _read("game/screens.rpy")
    extra_src = _read("game/extra.rpy")
    folio = pc14._folio_block(scr_src)
    mm = pc14.measure_main_menu(env)
    assert mm["folio_tabs"] == FOLIO_CASE_TABS[:-1] + (["bake"] if _pc17_present() else []) + FOLIO_CASE_TABS[-1:], mm["folio_tabs"]
    assert re.search(r'"images/ui/icon_pool_locker\.png", _\("游泳池更衣柜"\), folio_case_line\("POOL_CASE", "混合泳四段"\), '
                     r'pool_best_short\(\), pool_case_solved_count\(\) > 0, SetField\(persistent, "extras_tab", "pool"\), from_extras\)$',
                     folio, re.M)
    assert re.search(r'notebook_stamped_count\(\) >= len\(NOTEBOOK_CASES\), SetField\(persistent, "extras_tab", "notebook"\), from_extras\)$',
                     folio, re.M)
    card = scr_src.split("screen extras_folio_case_card(", 1)[1].split("\nscreen ", 1)[0]
    assert card.startswith("icon, title, line, status, done, tab_action, from_extras=False):")
    assert 'action ([Hide("extras_folio_modal"), tab_action] + ([] if from_extras else [ShowMenu("extras")]))' in card
    assert 'style "folio_card"' in card and "wide" not in card
    assert "Start(" not in folio and "Replay(" not in folio and not re.findall(r"SetField\(persistent, \"(?!extras_tab)", folio)
    assert "pool_case_solved_count" in extra_src.split("FOLIO_CASE_COUNTERS = ", 1)[1].split(")", 1)[0]

    # ---- J. main menu: no new chip, the case only in the folio ----
    main_blk = scr_src.split("screen main_menu():", 1)[1].split("\nstyle ", 1)[0]
    assert "pool" not in main_blk and "icon_pool_locker" not in main_blk, "The main menu may not gain a pool-locker chip"
    assert main_blk.count('Show("extras_folio_modal")') == 1 and "folio" in mm["chips"]

    # ---- K. extras routing & the old-screen cleanup: PC-13's four-tab page is gone, its renderers stay in use ----
    assert re.search(r'elif cur == "pool":\n\s+use extras_pool_locker\n', extra_src)
    assert re.search(r'elif cur == "astro":\n\s+use extras_astro_telescope\n', extra_src)
    assert re.search(r'elif cur == "notebook":\n(?:\s+##.*\n)?\s+use extras_casebook_expanded\n', extra_src)
    code_refs = []
    for p in GAME_DIR.rglob("*.rpy"):
        for i, ln in enumerate(p.read_text(encoding="utf-8-sig").splitlines(), 1):
            if ("extras_case_notebook" in ln and not ln.strip().startswith("#")
                    and 'not renpy.has_screen("extras_case_notebook")' not in ln):  # (the UI audit asserts its absence)
                code_refs.append(f"{p.name}:{i}")
    assert code_refs == [], f"PC-13's deleted page is still referenced by code: {code_refs}"
    cb_src = _read(PC15_MODULE)
    exp = cb_src.split("screen extras_casebook_expanded():", 1)[1].split("\n####", 1)[0]
    for fn in ("notebook_render_page(", "notebook_select", "notebook_open_page", "casebook_stamp", "casebook_summary()"):
        assert fn in exp, f"The expanded casebook no longer uses `{fn}`"
    zr_src = _read(PC13_MODULE)
    pc13_init = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / PC13_MODULE) if is_init)
    pc13_fns = {n.name for n in ast.walk(ast.parse(pc13_init)) if isinstance(n, ast.FunctionDef) and n.name.startswith(("notebook_", "_nb_"))}
    assert {"notebook_render_page", "notebook_summary", "notebook_stamp", "notebook_open_page", "notebook_select",
            "notebook_stamped_count", "notebook_get_record", "_nb_read_record", "_nb_case_parts"} <= pc13_fns
    assert env["casebook_summary"]()["total"] == 7 and "notebook_summary()" in cb_src and "notebook_stamp(case_key)" in cb_src
    assert re.search(r"^screen notebook_page_modal\(", zr_src, re.M), "PC-13's page modal stays (used by 「展开整页」)"
    for st in ("notebook_header_card", "notebook_page_card", "notebook_evidence_cell", "notebook_chain_slot",
               "notebook_margin_box", "notebook_summary_card"):
        assert re.search(rf"^style {st} is default:", zr_src, re.M) and f'style "{st}"' in exp, f"PC-13 style {st} unused"
    assert re.search(r"^style notebook_index_tab is button:", zr_src, re.M) and \
        re.search(r"^style casebook_index_tab is notebook_index_tab:", cb_src, re.M), "The index tab style stays (parent of PC-15's)"
    env["notebook_open_page"]("pool")
    assert any(s[0] == "notebook_page_modal" and s[2].get("case_key") == "pool" for s in mock_renpy.shown_screens)

    # ---- L. reset_all_progress clears PC-16 state and leaves main-story vars alone ----
    mp.pool_selected_spot = "s5"
    mp.extras_salon_group = "starlit"
    env["reset_all_progress"]()
    assert env["pool_case_solved_count"]() == 0 and mp.pool_locker_record == {} and mp.pool_selected_spot == "s1"
    assert mp.extras_salon_group == "salon" and env["fail_count"] == 0 and env["mo_favor"] == 50
    assert env["notebook_stamped_count"]() == 0

    data_cjk = _cjk(str({k: v for k, v in case.items() if k != "margin_secret"})) + sum(_cjk(str(s)) for s in spots) \
        + sum(_cjk(str(k)) for k in links)
    page_cjk = _cjk(pg["lesson"] + pg["mo_margin"])
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "SecretCJK": _cjk(case["margin_secret"]),
                       "CasebookPoolPublicCJK": page_cjk, "CasebookPoolSecretCJK": _cjk(pg["margin_secret"]),
                       "CorrectSlots": [c + 1 for c in correct_positions], "ReadOnlyOps": n_ops,
                       "SideChannelProofs": proofs})
    print(f"[PASS] PC-16 runtime: pool-locker case (script CJK={cjk_case}, data CJK={data_cjk}, 6 spots -> medley laps "
          f"method/timing/whereabouts/wearer, every lap cites its clues, correct slots {[c + 1 for c in correct_positions]}, "
          f"8 gentle loops, fail_count untouched) | gold/silver/bronze-wave ratings + best-record replay ladder + "
          f"ach_pool_locker / ach_golden_wave (gold run only) | 38 achievements (2x19) | page-margin spoiler gate "
          f"(zero leak) | casebook 6 -> 7 pages (older six identical, {n_ops} reads byte-identical, stamps write only the "
          f"casebook, 「推理笔记的复盘人」 still needs PC-13's four pages, verdict for seven) | folio 10/10 + graceful "
          f"degradation | PC-13 four-tab page gone, its renderers in use | main menu: no new chip | {proofs} side-channel proofs")
    return cjk_case


################################################################################
# 4. Zero intrusion, PC-13 line-exact cleanup, icons (incl. reused-art pairing), text safety
################################################################################

def _expected_pc13_module(old_src):
    """PC-15's committed zephyr_relay_casebook.rpy with exactly the PC-16 cleanup applied."""
    assert old_src.count(PC13_HEADER_OLD) == 1 and old_src.count(PC13_OLD_SECTION_START) == 1
    assert old_src.count(PC13_OLD_SECTION_END) == 1
    a = old_src.index(PC13_OLD_SECTION_START)
    b = old_src.index(PC13_OLD_SECTION_END)
    removed = old_src[a:b]
    # the removed span is exactly one screen definition: no style / label / transform / init / define / image / default
    tops = [ln for ln in removed.splitlines() if ln and not ln.startswith((" ", "#"))]
    assert tops == ["screen extras_case_notebook():"], tops
    return old_src[:a].replace(PC13_HEADER_OLD, PC13_HEADER_NEW) + PC13_SECTION_NEW + old_src[b:], removed


def check_zero_intrusion_and_icons():
    # a protected UI module may differ from HEAD only by the approved tofu-symbol swap (verify_glyphs.GLYPH_SWAP,
    # byte-exact, every occurrence, nothing else); main-story files never qualify
    swapped = glyphs.glyph_swap_only_files()
    assert not swapped & set(MAIN_STORY_FILES)
    older = [m for m in OLDER_EXTRAS_MODULES if m not in swapped]
    res = _git("status", "--porcelain", "--", *MAIN_STORY_FILES, *older)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay / older extras modules were modified!\n{res.stdout}"
    diff = _git("diff", "--numstat", "--", *MAIN_STORY_FILES, *older)
    assert diff.stdout.strip() == "", "Main story / older module files have a diff"
    LOG_REPORT["GlyphSwap"] = ",".join(sorted(Path(s).name for s in swapped)) or "none"
    # whole-project guard: among *tracked* files only the PC-16 targets and the forward-compatible verifier edits may
    # differ from HEAD (untracked new files are not flagged; on a clean committed checkout nothing differs at all)
    allowed = set(PC16_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc16.py"]) | swapped
    st = _git("status", "--porcelain", "--untracked-files=no", "--", ".")
    stray = []
    for line in st.stdout.splitlines():
        rel = line[3:].strip().strip('"').split("paper-crane-detective/", 1)[-1]
        if rel not in allowed:
            stray.append(rel)
    assert not stray, f"Unexpected modified tracked files: {stray}"
    for bad in ("game/cache", "dists", "tests/__pycache__"):
        assert not (ROOT / bad).exists(), f"Build artefact {bad} present in the repo"
    assert not list(ROOT.rglob("*.rpyc")) and not list(ROOT.rglob("__pycache__")), "No .rpyc / __pycache__ may be created"

    # PC-13 module: identical to PC-15's committed file minus the four-tab page (+ the two comment edits), line-exact
    cur = _read(PC13_MODULE)
    old = _git("show", f"{PC15_COMMIT}:./{PC13_MODULE}", check=False)
    if old.returncode == 0:
        expected, removed = _expected_pc13_module(old.stdout)
        assert cur == expected, "zephyr_relay_casebook.rpy differs from PC-15 by more than the page deletion"
        cleanup = f"{len(removed.splitlines())} lines removed (1 screen), line-exact vs {PC15_COMMIT}"
    else:  # shallow checkout without PC-15's commit: structural check only
        assert not re.search(r"^screen extras_case_notebook\b", cur, re.M) and PC13_SECTION_NEW in cur and PC13_HEADER_NEW in cur
        cleanup = "structural (PC-15 commit unavailable)"
    zd = _git("diff", "-U0", "--", PC13_MODULE)
    for ln in zd.stdout.splitlines():
        if ln.startswith("+") and not ln.startswith("+++"):
            assert not ln[1:].strip() or ln[1:].lstrip().startswith("##"), f"PC-13 module gained code: {ln}"
    LOG_REPORT["PC13Cleanup"] = cleanup

    diff = _git("diff", "-U0", "--", *[p for p in PC16_TOUCHED_FILES if p != NEW_MODULE], *FORWARD_COMPAT_TESTS)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"
            assert not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", txt), f"Control character in added line: {txt!r}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw and not raw.startswith(b"\xef\xbb\xbf"), "PC-16 module must use LF line endings, no BOM"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src
    for rel in PC16_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc16.py"]:
        data = (ROOT / rel).read_bytes()
        assert b"\r\n" not in data, f"{rel} gained CRLF line endings"
        assert not re.search(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]", data), f"{rel} contains a control character"
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
    n_sub = 0
    for ln in new_src.splitlines() + folio_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|POOL_CASE|p_obj|l_obj|w_obj|q_obj|b_obj|_ps|_pv|_qv|_wv|_dv|_fseal|'
                    r'title|status|line|prompt_line)\b', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
            n_sub += 1
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\[("[a-z_]+"|\d)\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"{len(OLDER_EXTRAS_MODULES)} older extras modules byte-identical incl. PC-14 + PC-15; PC-13 casebook module: {cleanup}; "
          f"only PC-16 targets + forward-compatible verifiers differ from HEAD), no Emoji/SVG/tabs/CRLF/control chars, "
          f"{n_str} interpolation-safe CJK data strings, {n_sub} data texts with substitute False")

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
            if rel_icon in PC16_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    reused = []
    for copy_rel, src_rel in REUSED_ICON_SOURCES.items():
        same = hashlib.sha256((GAME_DIR / copy_rel).read_bytes()).digest() == hashlib.sha256((GAME_DIR / src_rel).read_bytes()).digest()
        reused.append(f"{Path(copy_rel).stem}{'=' if same else '!='}{Path(src_rel).stem}")
    LOG_REPORT["ReusedIcons"] = ",".join(reused)
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-16 set: {', '.join(Path(x).name for x in PC16_UI_ICONS)} (reuse: {', '.join(reused)})")


def check_reused_icon_pairing():
    """No page shows a re-used PC-16 icon next to the original it was copied from: every extras tab (sub-bar state +
    the page screen, its `use`d screens and its data-driven clue icons), every PC-16 modal, the folio and the main menu."""
    all_src = {p.name: p.read_text(encoding="utf-8-sig") for p in sorted(GAME_DIR.glob("*.rpy"))}
    screens = {}
    for src in all_src.values():
        screens.update(_screen_blocks(src))
    env = _sandbox_env()[0]
    icon_re = re.compile(r'"(images/ui/icon_\w+\.png)"')

    def screen_icons(name, seen=None):
        seen = set() if seen is None else seen
        if name in seen or name not in screens:
            return set()
        seen.add(name)
        body = screens[name]
        out = set(icon_re.findall(body))
        for used in re.findall(r"^\s*use (\w+)", body, re.M):
            out |= screen_icons(used, seen)
        return out

    pairs = [(c, o) for c, o in REUSED_ICON_SOURCES.items()]

    def clash(icons, where):
        for c, o in pairs:
            assert not (c in icons and o in icons), f"{where} shows {Path(c).name} next to its original {Path(o).name}"

    extra_src = all_src["extra.rpy"]
    route = dict(re.findall(r'elif cur == "(\w+)":\n(?:\s+##.*\n)?\s+use (\w+)\n', extra_src))
    data_icons = {"library": "LIBRARY_HOTSPOTS", "theater": "THEATER_HOTSPOTS", "atelier": "ATELIER_HOTSPOTS",
                  "sportsday": "SPORTS_ITEMS", "haunted": "HAUNTED_SPOTS", "astro": "ASTRO_SPOTS", "pool": "POOL_SPOTS",
                  "capsule": "CAPSULE_ITEMS"}
    groups = env["EXTRAS_SALON_GROUPS"]
    n_states = 0
    for tab, scr in route.items():
        page = screen_icons(scr)
        if tab in data_icons:
            page |= {d["icon"] for d in env[data_icons[tab]] if isinstance(d, dict) and d.get("icon")}
        open_g = env["salon_group_of"](tab)
        for remembered in ([open_g] if open_g else [g[0] for g in groups]):
            bar = set()
            for gkey, _gl, gicon, gtabs in groups:
                if gkey == remembered and len(gtabs) >= 5:
                    bar.add(env["salon_tab_icon"](tab if tab in gtabs else gtabs[0]))
                elif gkey == remembered:
                    bar |= {env["salon_tab_icon"](t) for t in gtabs}
                else:
                    bar.add(gicon)
            clash(page | bar, f"extras tab `{tab}` (open group {remembered})")
            n_states += 1
    for scr in ("pool_report_modal", "pool_lap_banner", "pool_result_card", "extras_folio_modal", "notebook_page_modal",
                "extras_casebook_expanded", "main_menu"):
        clash(screen_icons(scr), f"screen {scr}")
    # the folio opened over the title screen sits on an ~88% opaque veil (the origami-cabinet chip underneath is dimmed)
    veil = re.search(r'add "#0c0814([0-9a-f]{2})"', screens["extras_folio_modal"]).group(1)
    assert int(veil, 16) >= 0xd0, "The folio veil must keep the title screen's chips dimmed"
    LOG_REPORT["IconPairingStates"] = n_states
    print(f"[PASS] Reused-icon pairing: {n_states} extras tab / sub-bar states + 7 screens never show a PC-16 copy next to "
          f"its original (folio veil alpha 0x{veil} over the title screen)")


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
    style_users = {}
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
            for su in re.findall(r'style "(\w+)"', line):
                style_users.setdefault(su, 0)
                style_users[su] += 1
    for child, parent, loc in parents:
        assert parent in styles, f"Style `{child}` inherits undefined `{parent}` at {loc}"
    dup = {k: v for k, v in screen_defs.items() if len(v) > 1 and "tl" not in v}
    assert not dup, f"Screens defined more than once: {dup}"
    assert "extras_case_notebook" not in screens, "PC-13's unused four-tab page must be deleted"
    assert "folio_wide_card" not in styles, "PC-15's wide folio card style is no longer referenced and must be deleted"

    for img in ("ui_icon_pool_locker", "ui_icon_locker_key", "ui_icon_swim_cap", "ui_icon_pool_pass"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_pool_locker", "pool_report_modal", "pool_lap_banner", "pool_result_card",
                "extras_casebook_expanded", "notebook_page_modal", "extras_folio_modal", "extras_folio_case_card",
                "extras_achievements", "deduction_cutin", "evidence_book", "confirm", "extras_astro_telescope"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("pool_locker_case", "pool_case_investigate", "pool_case_review_intro", "pool_lap_k1",
                "pool_lap_k2", "pool_lap_k3", "pool_lap_k4", "pool_case_resolution",
                "_pool_init_sandbox", "_pool_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    assert "pool_ripple" in transforms
    tint_re = r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)"
    tinted = re.findall(tint_re, new_src)
    assert len(tinted) == 2 and all((GAME_DIR / g).is_file() for g in tinted), tinted
    # every PC-16 style is used by a PC-16 screen
    for st in re.findall(r"^style (pool_\w+) is", new_src, re.M):
        assert style_users.get(st), f"PC-16 style {st} is never used"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC16_TOUCHED_FILES:
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
    for icon in PC16_UI_ICONS:
        assert icon in refs, f"PC-16 icon {icon} is not wired into any .rpy"
    folio = pc14._folio_block(scr_src)
    assert '"images/ui/icon_pool_locker.png"' in folio, "The folio card uses the pool-locker entry icon"
    audio_src = _read("game/audio.rpy")
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", audio_src), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", audio_src), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd
    for mode in set(re.findall(r'set_ambient\("(\w+)"\)', new_src)):
        assert re.search(rf'"{mode}"\s*:', _read("game/definitions.rpy")), f"Undefined ambient mode {mode}"

    extra_src = _read("game/extra.rpy")
    assert '"pool_locker_case":' in extra_src
    for lbls in ("_POOL_CASE_LABELS", "_ASTRO_CASE_LABELS", "_HAUNTED_CASE_LABELS", "_SPORTS_CASE_LABELS",
                 "_ATELIER_CASE_LABELS", "_THEATER_CASE_LABELS", "_CLOSED_LIBRARY_LABELS"):
        assert extra_src.count(f"or name in {lbls}") == 2, f"{lbls} callback wiring must be in both branches"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("pool_locker_record", "pool_selected_spot"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld

    for rel in PC16_TOUCHED_FILES:
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
          f"{jumps} jumps/calls, {len(styles)} styles, {len(refs)} distinct asset refs, no duplicate screen names, "
          f"extras_case_notebook / folio_wide_card gone)")


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
    pc16_shots = ("ui_16a_pool_unsolved.png", "ui_16b_pool_gold_masked.png", "ui_16c_pool_unmasked.png",
                  "ui_16d_pool_report.png", "ui_16e_pool_lap_banner.png", "ui_16f_pool_result_card.png",
                  "ui_16g_subbar_starlit_astro.png", "ui_16h_casebook_seven_pages.png", "ui_16i_casebook_pool_page.png",
                  "ui_16j_folio_seven_cases.png", "ui_16k_main_menu_no_new_chip.png")
    for shot in pc16_shots:
        assert shots.count(shot) == 1, f"Missing / duplicate {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_sw_rec")
    pc16_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc16_seg.index(s) for s in pc16_shots] == sorted(pc16_seg.index(s) for s in pc16_shots), "PC-16 shots out of order"
    assert shots.index("ui_15j_folio_six_cases.png") < start < shots.index("ui_15k_main_menu_reflowed.png"), \
        "PC-16 extras-page audit runs after PC-15's, before the return to the main menu"
    assert pc16_seg.index("ui_16j_folio_seven_cases.png") < pc16_seg.index('pause until screen "main_menu"') \
        < pc16_seg.index("ui_15k_main_menu_reflowed.png") < pc16_seg.index("ui_16k_main_menu_no_new_chip.png")
    # the PC-15 segment's own assertions follow the PC-16 layout (seven pages, ten folio entries, meteor night in "starlit")
    # (PC-17 moves these UI-run assertions on to eight pages / eleven folio entries -- verify_pc17)
    for upd in (('salon_open_group("astro") == "starlit"', "len(NOTEBOOK_CASES) == 8", "folio_total_count() == 11") if _pc17_present()
                else ('salon_open_group("astro") == "starlit"', "len(NOTEBOOK_CASES) == 7", "folio_total_count() == 10")):
        assert upd in shots, f"ui_shots.rpy still asserts the PC-15 state instead of `{upd}`"
    for stale in ('salon_open_group("astro") == "closedlib"', "len(NOTEBOOK_CASES) == 6", "folio_total_count() == 9"):
        assert stale not in shots, f"Stale PC-15 assertion `{stale}` would fail in the real UI run"
    assert 'not renpy.has_screen("extras_case_notebook")' in pc16_seg
    for bad in ("ach_grant", "pool_record_solve(", "pool_inspect_spot(", "casebook_stamp(", "notebook_stamp(",
                "notebook_open_page(", "astro_record_solve(", "haunted_record_solve(", "reset_all_progress"):
        assert bad not in pc16_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("pool_locker_record", "pool_selected_spot", "case_notebook_record", "notebook_selected_case",
                "extras_salon_group", "te_cleared", "truth_spoiler_confirmed"):
        assert f"persistent.{fld} = _saved_" in pc16_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-16 coverage ({len(pc16_shots)} shots, "
          f"state restored, PC-15 asserts updated)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc16_runtime()
    check_zero_intrusion_and_icons()
    check_reused_icon_pairing()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    glyphs.check_glyph_coverage()  # every displayed .rpy character has a glyph in all three bundled fonts (no tofu)
    LOG_REPORT.update(glyphs.LOG_REPORT)
    print("PC16_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC16_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
