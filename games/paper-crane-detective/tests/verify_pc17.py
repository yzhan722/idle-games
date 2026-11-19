#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-17 Static, Behavioral, Pixel-Budget, Baking-Contest "Second Cake" Case (replayable, rated, realistic: four layers of a
cake method -> timing -> provenance -> baker), Case-Notebook Expansion (7 -> 8 pages, read-only, zero-write),
Folio 2 x 5 Layout (eight cases + the casebook + one blank cell), Salon Sub-Bar Regroup (20 tabs / 5 groups, every open
state <= 702px), Main Menu (no new chip, zero overlap with the navigation column, nav gap >= 14px, badge gap >= 80px),
Spoiler-Gate (side-channel proof), Reused-Icon Pairing, Glyph, Asset & Zero-Intrusion Verifier for
《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's init-python blocks
inside the same mocked sandbox verify_pc16.py uses, plus the PC-17 module.
Nothing here depends on uncommitted changes: on a clean, committed checkout every check still runs.
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import hashlib  # noqa: E402
import re  # noqa: E402
from pathlib import Path  # noqa: E402
from PIL import Image, ImageFont  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
NEW_MODULE = "game/zymase_bakeoff_casebook.rpy"
PC16_MODULE = "game/zwembad_locker_casebook.rpy"
PC13_MODULE = "game/zephyr_relay_casebook.rpy"
PC15_MODULE = "game/zubenelgenubi_meteor_casebook.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import verify_pc12 as pc12  # noqa: E402
import verify_pc13 as pc13  # noqa: E402
import verify_pc14 as pc14  # noqa: E402
import verify_pc15 as pc15  # noqa: E402
import verify_pc16 as pc16  # noqa: E402
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
_lines = pc12._lines
_strings = pc13._strings
_persistent_snapshot = pc13._persistent_snapshot
_fonts = pc16._fonts
_git = pc16._git
_screen_blocks = pc16._screen_blocks

PC17_UI_ICONS = [
    "images/ui/icon_bake_contest.png",
    "images/ui/icon_second_cake.png",
    "images/ui/icon_oven_log.png",
    "images/ui/icon_rolling_pin.png",
]
# the PC-17 set re-uses existing formal art under new names (image quota): copy -> original it was copied from
REUSED_ICON_SOURCES = {
    "images/ui/icon_bake_contest.png": "images/ui/icon_bronze_badge.png",
    "images/ui/icon_second_cake.png": "images/ui/icon_time_capsule.png",
    "images/ui/icon_oven_log.png": "images/ui/icon_missing_script.png",
    "images/ui/icon_rolling_pin.png": "images/ui/icon_relay_baton.png",
}
ALL_REUSED_PAIRS = dict(pc16.REUSED_ICON_SOURCES, **REUSED_ICON_SOURCES)

REQUIRED_UI_ICONS = pc16.REQUIRED_UI_ICONS + PC17_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC17_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

# every older extras module stays byte-identical (the casebook page, the folio and the sub-bar only *read* their data by name)
OLDER_EXTRAS_MODULES = pc16.OLDER_EXTRAS_MODULES + [PC13_MODULE, PC16_MODULE]
# older verifiers edited only for forward compatibility (counts / layout PC-17 legitimately changes)
FORWARD_COMPAT_TESTS = ["tests/verify_pc10.py", "tests/verify_pc11.py", "tests/verify_pc12.py", "tests/verify_pc13.py",
                        "tests/verify_pc14.py", "tests/verify_pc15.py", "tests/verify_pc16.py"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon", "bake")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges", "astro")),
    ("closedlib", ("library", "theater", "atelier", "sportsday", "haunted", "pool")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

PC15_MAIN_MENU_ROWS = pc14.PC15_MAIN_MENU_ROWS
NAV_RIGHT = pc15.NAV_RIGHT
NAV_GAP_MIN = 14  # PC-17 milestone: every chip row keeps at least 14px of air to the navigation column
HERO_BOOK_X = pc15.HERO_BOOK_X
MENU_BADGE_GAP = 80  # the chip column's bottom keeps at least 80px to the progress badge

FOLIO_CASE_TABS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "pool", "bake", "notebook"]
CASE_STORES = pc16.CASE_STORES + ["bake_cake_record"]
NOTEBOOK_KEYS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "pool", "bake"]

CJK_LINE = pc10.CJK_LINE

LOG_REPORT = {}


################################################################################
# 0. Sandbox (PC-16 sandbox + PC-17 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc16._sandbox_env()
    for k, v in {"bake_cake_record": {}, "bake_selected_spot": "s1"}.items():
        setattr(mp, k, v)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    return env, mock_renpy, mock_ach, mp


################################################################################
# 1. Python syntax & init order
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 35, f"Expected >=35 .rpy files (including zymase_bakeoff_casebook.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-17 module must initialise after zwembad_locker_casebook.rpy (achievements append last, NOTEBOOK_CASES
    # already holds PC-16's seven pages, the casebook styles exist)
    assert names.index("zymase_bakeoff_casebook.rpy") > names.index("zwembad_locker_casebook.rpy")
    assert names.index("zymase_bakeoff_casebook.rpy") > names.index("zubenelgenubi_meteor_casebook.rpy")
    assert names[-1] == "zymase_bakeoff_casebook.rpy", f"PC-17 module must be the last top-level module: {names[-3:]}"

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
    assert n_def == 4
    # screen-language property / `use` / grid expressions of the PC-17 code parse as Python
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
    assert n_expr >= 190, n_expr
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines, {n_expr} screen expressions); "
          f"PC-17 module initialises last")


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

    # 2.1 primary 9 tabs untouched; PC-17 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_POOL_TABS", ["pool"]), ("EXTRAS_BAKE_TABS", ["bake"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 20 tabs in the same 5 groups, each exactly once; EVERY open state <= 702px.
    #     An 8th short case in "closedlib" would need seven pills (PC-16 measured > 702px even with 48px sext pills); the
    #     two-tab "salon" group (tea party + lexicon: the same afternoon-tea theme) takes it instead and opens as three
    #     icon + 66px pill pairs, exactly like the three-tab "bookstreet" group.
    sb = pc10.measure_salon_subbar()
    assert [(g[0], tuple(g[3])) for g in sb["groups"]] == SALON_GROUPS_EXPECTED, sb["groups"]
    assert len(sb["keys"]) == len(set(sb["keys"])) == 20
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    labels = {g[0]: g[1] for g in sb["groups"]}
    assert labels == {"salon": "侦探社沙龙", "bookstreet": "旧书街与四季", "starlit": "电波与星空",
                      "closedlib": "放学后短案", "keepsake": "纪念与寄语"}, labels
    assert sb["quad"] == (4, 60, 4) and sb["quint"] == (5, 56, 4) and sb["sext"] == (6, 48, 4), (sb["quad"], sb["quint"], sb["sext"])
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    assert sb["totals"]["bake"] == 1 and sb["totals"]["pool"] == 1 and sb["totals"]["notebook"] == 8
    pill = lambda t, mn, pad: max(mn, _w(f[11], t) + 2 * pad)  # noqa: E731
    grp = lambda lbl: max(66, _w(f[11], lbl) + 12)  # noqa: E731
    # counterfactual: the baking contest added to "closedlib" (one icon + seven 48px sext pills)
    seven = ("library", "theater", "atelier", "sportsday", "haunted", "pool", "bake")
    items = [14] + [pill(f"{sb['pills'][t][0]} 1/1", 48, 4) for t in seven]
    for gkey, glabel, _gi, _gt in sb["groups"]:
        if gkey != "closedlib":
            items += [14, grp(glabel)]
    if_closedlib = sum(items) + 4 * (len(items) - 1)
    assert if_closedlib > 702, "If seven sext pills fit, joining the salon group would be unnecessary"
    # the salon group's three pills: one 14px icon + one 66px pill each (bookstreet_subtab_pill), equal width
    widths3 = {pill(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}", 66, 6) for t in SALON_GROUPS_EXPECTED[0][1]
               if t != "lexicon"}
    assert widths3 == {66}, f"Salon pills are not equal-width: {widths3}"
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    assert 'style ("salon_quad_pill" if len(_gtabs) >= 4 else "bookstreet_subtab_pill")' in blk
    report["SubBarWorst"] = sb["worst"]
    report["SubBarSalon"] = sb["per_group"]["salon"]
    report["SubBarIfBakeInClosedlib"] = if_closedlib

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    assert _w(f[18], sub) + 2 * len(sub) <= 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "bake_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- baking-contest page ----------------
    case = env["BAKE_CASE"]
    spots = env["BAKE_SPOTS"]
    links = env["BAKE_LAYER_LINKS"]
    tiers = env["BAKE_RATING_TIERS"]
    layers = env["BAKE_LAYERS"]
    card_w = int(_style_prop(new_src, "bake_spot_card", "xsize"))
    card_pad = int(_style_prop(new_src, "bake_spot_card", "padding").strip("()").split(",")[0])
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
    # yminimum 88: the tallest card (heading + location + three surface lines) still fits
    assert round(11 * CJK_LINE) + 2 + round(10 * CJK_LINE) + 2 + 3 * round(11 * CJK_LINE) + 2 * 2 <= 88 + 40
    report["SpotCard"] = widest_card
    slot_w = int(_style_prop(new_src, "bake_layer_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "bake_layer_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "bake_layer_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Layer slots overflow"
    assert 'add Solid(l_obj["color"]) xysize (151, 3)' in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Layer slot content too tall"
    widest_short = 0
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        widest_short = max(widest_short, _w(f[12], k["short"]))
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Layer short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    report["LayerShort"] = widest_short
    tier_w = int(_style_prop(new_src, "bake_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["TrayTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "烤盘评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"
    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    assert 36 + 10 + 398 + hdr_right <= console_inner, "Bake header overflows"
    assert _w(sf[19], case["title"]) <= 398
    for s in ("已结案 · 蛋糕四层已全部切开 · 可随时重回家政教室冲击金烤盘", "评审桌上多出一块蛋糕，插着第六组的旗 · 它是谁烤的"):
        assert s in new_src and _w(f[12], s) <= 398, f"Bake header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert len(layers) * 40 + (len(layers) - 1) * 6 <= 178 and "xysize (40, 5)" in new_src
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Bake time-tag line overflows 492px: {tag_line}px"
    light = 15 + 6 + _w(f[12], "光影：" + case["lighting_note"])
    assert light <= 492, f"Bake lighting line overflows 492px: {light}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 勘查点全查完）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再回到家政教室）")
    assert arch_solved <= 492 and arch_open <= 492, f"Bake archive line overflows: {arch_solved}/{arch_open}px"
    report["BakeTagLine"] = tag_line
    report["BakeLighting"] = light
    report["BakeArchive"] = max(arch_solved, arch_open)
    for s in ("勘查点 · 点击翻看六处线索（亲自查过的，会显影现场手记）：", "蛋糕四层 · 复盘（手法 → 时机 → 来历 → 烘焙人，结案后显影）："):
        assert s in new_src and _wb(f[12], s) <= console_inner, s
    margin_inner = console_inner - 2 * int(_style_prop(new_src, "bake_margin_box", "padding").strip("()").split(",")[0])
    margin_head = (16 + 6 + _wb(f[12], "墨墨的页边续批 · 防剧透火漆") + 10
                   + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert margin_head <= margin_inner
    notice = _w(f[11], env["BAKE_MASK_NOTICE"])
    assert notice <= margin_inner, f"Mask notice wraps ({notice}px > {margin_inner}px)"
    assert _lines(f[12], case["margin_secret"], margin_inner) <= 3
    for s in ("结案报告：切完蛋糕四层之后，墨墨会把推理链和完整的结案报告写在这里。",
              "剧透许可已开启 · 切完蛋糕四层结案之后，墨墨的续批会显影在这里。",
              "还没有亲自勘查这一处。回到家政教室查过之后，现场手记会显影在这里。"):
        assert s in new_src and _w(f[12], s) <= margin_inner, s
    assert _lines(f[12], case["solution_pub"], scroll_inner) <= 4
    assert _w(f[12], case["mo_note_pub"]) <= scroll_inner and _lines(f[12], case["alice_note_pub"], scroll_inner) <= 1
    footer = (_w(f[12], "零失误切完蛋糕四层可获金烤盘 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
              + 8 + max(146, _w(f[15], "重回家政教室") + 36, _w(f[15], "走进家政教室") + 36))
    assert footer <= console_inner, f"Bake footer overflows: {footer}px"
    report["BakeFooter"] = footer
    quick = (20 + 10 + _w(sf[14], "推理笔记复盘本 · 扩容收录本案") + 10 + _w(f[12], "（已盖复盘章 8/8）")
             + 8 + max(84, _w(f[13], "翻开复盘本") + 22))
    assert quick <= 722 - 24, f"Casebook quick row overflows: {quick}px"
    report["BakeQuickRow"] = quick

    # in-scene layer banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "bake_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "bake_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728 and banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "家政教室 · 蛋糕四层") + 8 + _w(f[11], "已切开 4/4 · 失误只计入本案烤盘评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen bake_layer_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    shots_src = _read("game/tests/ui_shots.rpy")
    shot_prompt = re.search(r'Show\("bake_layer_banner", layers_done=2, prompt_line="([^"]+)"\)', shots_src).group(1)
    assert shot_prompt == prompts[2][1], "ui_shots banner prompt must match the in-game third-layer prompt"
    report["LayerBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "烘焙赛结案 · BK-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(layers) * 152 <= 608 and "xysize (152, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入烘焙赛烤盘评级，不影响主线）",
              "首次结案 · 蛋糕四层已写入鉴赏室「家政课烘焙赛」分页，复盘本扩容到了八页",
              "重玩挑战 · 刷新个人纪录！这一次的四层比以往任何一次都切得更齐",
              "重玩挑战 · 再次摘下金烤盘，烘焙名侦探实至名归",
              "重玩挑战 · 零失误切完蛋糕四层，就能把金烤盘摆上家政教室的评审桌"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    assert _w(f[13], case["mo_note_pub"]) <= 580 and _lines(f[13], case["alice_note_pub"], 580) <= 2
    assert max(96, _w(f[15], "收好组号旗并返回鉴赏室") + 36) <= 248 + 40
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"BK-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(layers) * 173 <= 692 and "xysize (173, 3)" in new_src and "xsize 658" in new_src
    for k in links:
        assert _lines(f[13], f"{k['step']} · {k['name']}（{k['layer']}）：{k['full']}", 658) <= 4, f"Modal text too long: {k['id']}"
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重回家政教室") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- expanded casebook: eight pages in PC-15's 3-column index grid (3 x 3, one empty cell) ----------------
    nb_cases = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb_cases] == NOTEBOOK_KEYS
    pages = [env["notebook_render_page"](n["key"]) for n in nb_cases]
    assert all(p["available"] for p in pages), "Every casebook page must find its case module in the sandbox"
    page_inner = 722 - 2 * int(_style_prop(zr_src, "notebook_page_card", "padding").strip("()").split(",")[0])
    assert page_inner == 694
    cn = env["casebook_count_cn"](len(nb_cases))
    assert cn == "八"
    for s in (f"{cn}枚复盘章已全部盖好 · 下次遇到怪事，先翻这本本子。", "TRUE END 已通关 · 复盘本页边的续批已全部显影。",
              "已手动开启剧透许可 · 复盘本页边的续批当前可见。", f"{cn}桩短案的证物与推理 · 涉终章的页边续批由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Casebook header line wraps ({_w(f[12], s)}px): {s}"
    cb_hdr = (36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "复盘章 8/8") + 20) + 6
              + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert cb_hdr <= page_inner, f"Casebook header overflows: {cb_hdr}px"
    report["CasebookHeader"] = cb_hdr
    idx_w = int(_style_prop(cb_src, "casebook_index_tab", "xsize"))
    idx_h = int(_style_prop(zr_src, "notebook_index_tab", "ysize"))
    idx_pad = [int(x) for x in _style_prop(zr_src, "notebook_index_tab", "padding").strip("()").split(",")]
    rows = env["casebook_index_rows"]()
    assert "grid 3 casebook_index_rows():" in cb_src and 3 * idx_w + 2 * 10 == 722 and rows == 3
    assert "for _cbpad in range((3 - _ncount % 3) % 3):" in cb_src and (3 - len(nb_cases) % 3) % 3 == 1
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
    report["CasebookIndexGrid"] = f"3x{rows} ({grid_h}px tall, 1 empty cell)"
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
    bake_page = env["CASEBOOK_BAKE_PAGE"]
    for h in spots:
        ln = _lines(f[11], h["evidence"], cell_inner)
        max_ev_lines = max(max_ev_lines, ln)
        assert ln <= 2, f"Bake evidence `{h['evidence']}` needs {ln} lines in a {cell_inner}px cell"
        assert _wb(f[10], f"{h['code']} · {h['label']}") <= cell_inner
    for k in links:
        assert _w(f[12], k["short"]) <= 151 and _wb(f[11], f"{k['step']} · {k['name']}") <= 151
    for s in (bake_page["lesson"], bake_page["mo_margin"]):
        assert _lines(f[12], s, page_inner - 24) <= 2, f"Bake casebook margin line too long: {s}"
    assert _lines(f[12], bake_page["margin_secret"], page_inner - 24) <= 3
    assert _w(f[12], f"{bake_page['unit']} · 复盘（结案后显影）：") <= page_inner
    best_line_max = max(_w(f[12], f"最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 已结案 99 次") for t in tiers)
    assert best_line_max <= page_inner
    report["CasebookPageHead"] = widest_head
    report["CasebookBakeEvidenceLines"] = f"{max_ev_lines} lines max"
    summary = 18 + 6 + _w(sf[13], "复盘总评") + 10 + _w(f[11], "已结案 8/8 · 金评级 8/8 · 累计结案 99 次 · 最少失误合计 99 次")
    assert summary <= 722 - 28, f"Casebook summary row overflows: {summary}px"
    assert _lines(f[12], env["CASEBOOK_VERDICT"] % cn, 722 - 28) <= 2
    assert _w(f[12], f"{cn}桩短案全部结案之后，艾丽丝会在这里写下她的复盘总评。") <= 722 - 28
    report["CasebookSummary"] = summary
    hdr_modal = 40 + 12 + _w(sf[20], f"BK-01 · 《{case['short_title']}》") + 10 + 28 + 6 + _wb(f[13], "已盖复盘章")
    assert hdr_modal <= 692
    report["CasebookModalHead"] = hdr_modal

    # ---------------- folio modal: eight cases + the eight-page casebook in one 2 x 5 grid (one blank cell) ----------------
    folio = pc14._folio_block(scr_src)
    panel_w = int(_style_prop(scr_src, "folio_panel", "xsize"))
    panel_pad = [int(x) for x in _style_prop(scr_src, "folio_panel", "padding").strip("()").split(",")]
    fcard_w = int(_style_prop(scr_src, "folio_card", "xsize"))
    fcard_h = int(_style_prop(scr_src, "folio_card", "ysize"))
    fcard_pad = [int(x) for x in _style_prop(scr_src, "folio_card", "padding").strip("()").split(",")]
    panel_inner = panel_w - 2 * panel_pad[0]
    assert panel_inner == 2 * fcard_w + 12 == 712 and "grid 2 5:" in folio and "xspacing 12" in folio
    grid_blk = folio.split("grid 2 5:", 1)[1].split("\n            hbox:", 1)[0]
    cells = [ln.strip() for ln in grid_blk.splitlines()[1:] if ln.strip() and not ln.strip().startswith(("xspacing", "yspacing", "#"))]
    assert len(cells) == 10, f"A 2 x 5 grid needs exactly ten children (Ren'Py rejects a partly-filled grid): {cells}"
    assert sum(1 for c in cells if c.startswith("use extras_folio_case_card(")) == 9 and cells[-1] == "null", cells[-1]
    assert fcard_w - 2 * fcard_pad[0] >= 34 + 10 + 278 and "                xsize 278\n" in scr_src
    card_titles = re.findall(r'use extras_folio_case_card\("[^"]+", _\("([^"]+)"\)', folio)
    assert len(card_titles) == 9 and card_titles[-2:] == ["家政课烘焙赛", "推理笔记复盘本"], card_titles
    statuses = ["待结案"]
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS",
                "HAUNTED_RATING_TIERS", "ASTRO_RATING_TIERS", "POOL_RATING_TIERS", "BAKE_RATING_TIERS"):
        statuses += [t["name"] for t in env[var]]
    widest_title = 0
    for t in card_titles:
        for st in statuses + ["复盘章 8/8"]:
            row = _w(sf[15], t) + 6 + _wb(f[12], st)
            widest_title = max(widest_title, row)
            assert row <= 278, f"Folio card `{t}` + `{st}` overflows 278px: {row}px"
    case_lines = [env["folio_case_line"](v, u) for v, u in re.findall(r'folio_case_line\("(\w+)", "([^"]+)"\)', folio)]
    assert len(case_lines) == 8 and "----" not in case_lines
    case_lines += re.findall(r'use extras_folio_case_card\("[^"]+", _\("[^"]+"\), _\("([^"]+)"\)', folio)
    assert len(case_lines) == 9 and "八桩" in case_lines[-1]
    widest_line = max(_w(f[11], s) for s in case_lines)
    assert widest_line <= 278, f"Folio card sub-line overflows: {widest_line}px"
    sec_h = round(12 * CJK_LINE)
    head_h = max(44, round(22 * CJK_LINE) + 2 + round(12 * CJK_LINE))
    f_h = (2 * panel_pad[1] + head_h + 8 + 1 + 8 + sec_h + 8 + fcard_h + 8 + sec_h + 8 + (5 * fcard_h + 4 * 8) + 8 + 34)
    pc16_h = f_h - (fcard_h + 8)
    assert f_h <= 720 - 2 * 24, f"Folio modal taller than the window minus margins: {f_h}px"
    seal_w = max(max(96, _w(f[12], s) + 20) for s in ("火漆 · 已通关解封", "火漆 · 手动解封", "火漆 · 封存中"))
    f_head = (44 + 12 + max(_w(sf[22], "番外卷宗"), _w(f[12], pc14.folio_header_sub(folio)))
              + 10 + max(96, _w(f[12], "已完成 11/11") + 20) + 6 + seal_w)
    assert f_head <= panel_inner, f"Folio header overflows: {f_head}px"
    report["FolioCardTitle"] = widest_title
    report["FolioCardLine"] = widest_line
    report["FolioHeader"] = f_head
    report["FolioHeight"] = f"{f_h} (PC-16 {pc16_h}, max 672)"

    # ---------------- main menu: no new chip, rows unchanged, nav gap >= 14px, badge gap >= 80px ----------------
    mm = pc14.measure_main_menu(env)
    assert env["folio_total_count"]() == 11
    assert mm["rows"] == PC15_MAIN_MENU_ROWS, mm["rows"]
    assert sorted(mm["chips"]) == sorted(k for r in PC15_MAIN_MENU_ROWS for k in r) and len(mm["chips"]) == 14
    assert "bake" not in mm["chips"] and "bake" in mm["folio_tabs"], "The baking contest is reachable only via the folio"
    assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
    assert mm["separators"] == [8, 8, 8], mm["separators"]
    nav = pc15._nav_column_extent()
    gaps = []
    for i, (w, lft, rgt) in enumerate(zip(mm["row_w"], mm["left"], mm["right"])):
        gaps.append(round(lft - NAV_RIGHT, 1))
        assert lft >= NAV_RIGHT + NAV_GAP_MIN, f"Row {i + 1} left edge {lft:.1f}px is within {NAV_GAP_MIN}px of the nav column"
        assert rgt <= HERO_BOOK_X, f"Row {i + 1} right edge {rgt:.1f}px runs into the title art's heroine"
    assert len(set(mm["centers"])) == 1
    assert mm["gap"] >= MENU_BADGE_GAP, f"Badge gap shrank: {mm}"
    folio_row = [i for i, r in enumerate(mm["rows"]) if "folio" in r][0]
    report["MainMenuRows"] = "/".join(str(len(r)) for r in mm["rows"]) + " (no new chip)"
    report["MainMenuRowWidths"] = "/".join(str(round(w)) for w in mm["row_w"])
    report["MainMenuNavGap"] = "/".join(str(g) for g in gaps) + f" (min {min(gaps)} >= {NAV_GAP_MIN})"
    report["FolioChip"] = round(mm["chip_w"]["folio"])
    report["FolioRowLeft"] = round(mm["left"][folio_row], 1)
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['gap']} >= {MENU_BADGE_GAP})"
    report["NavColumnY"] = f"{nav['max'][0]}..{nav['max'][1]}"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    assert "grid 2 ach_grid_rows():" in ach_src and "2×20 = 40" in ach_src and "2×20 共 40 枚" in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_bake_cake", "ach_golden_tray"):
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
    m = re.search(r"^label bake_cake_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label bake_cake_case"
    return m.group(1)


# every layer of the chain must be traceable to the clues it rests on (spot ids) and say so in its own words
LAYER_TRACE = {
    "k1": {"s1": "蓝格烘焙纸", "s2": "第六格"},
    "k2": {"s3": "15:08", "s5": "15:00"},
    "k3": {"s4": "赤藓糖醇", "s1": "颜色浅", "s5": "只看不尝"},
    "k4": {"s3": "绿笔", "s2": "便签", "s6": "计时"},
}
OLDER_SLOTS = pc16.OLDER_SLOTS + ([2, 0, 1, 1],)  # PC-10 .. PC-16


def check_pc17_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 40 achievements (2x20), PC-17 pair appended after PC-16 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 40 and env["ach_grid_rows"]() == 20 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_pool_locker", "ach_golden_wave", "ach_bake_cake", "ach_golden_tray"], ach_ids[-4:]
    assert "ach_bake_cake" in mock_ach.registered and "ach_golden_tray" in mock_ach.registered

    # ---- B. case data ----
    case, spots, links, tiers = env["BAKE_CASE"], env["BAKE_SPOTS"], env["BAKE_LAYER_LINKS"], env["BAKE_RATING_TIERS"]
    assert case["label"] == "bake_cake_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    all_codes = set(re.findall(r'"code": "([A-Z]+-\d+)"', "\n".join(
        p.read_text(encoding="utf-8-sig") for p in GAME_DIR.glob("*.rpy") if p.name != Path(NEW_MODULE).name)))
    assert case["code"] == "BK-01" and case["code"] not in all_codes
    assert [s["id"] for s in spots] == [f"s{i}" for i in range(1, 7)]
    assert [s["code"] for s in spots] == [f"CK-0{i}" for i in range(1, 7)] and not all_codes & {s["code"] for s in spots}
    for s in spots:
        assert s["where"] and s["keeper"] and s["scene"] in env["BG_LIGHT"], s["id"]
        assert len(s["detail"]) >= 70 and s["evidence"] and s["surface"]
        assert env["EVIDENCE_DETAILS"][s["evidence"]] == (s["observer"], s["detail"]), f"{s['id']} flip detail not registered"
    assert len({s["evidence"] for s in spots}) == 6
    older_ev = set()
    for var in ("LIBRARY_HOTSPOTS", "THEATER_HOTSPOTS", "ATELIER_HOTSPOTS", "SPORTS_ITEMS", "HAUNTED_SPOTS", "ASTRO_SPOTS",
                "POOL_SPOTS"):
        older_ev |= {h["evidence"] for h in env[var]}
    assert not older_ev & {s["evidence"] for s in spots}
    # the clue icons named after the round's art are used by the matching clue only
    assert [s["id"] for s in spots if s["icon"].endswith("icon_second_cake.png")] == ["s1"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_oven_log.png")] == ["s3"]
    assert [s["id"] for s in spots if s["icon"].endswith("icon_rolling_pin.png")] == ["s4"]
    assert not any(s["icon"] in REUSED_ICON_SOURCES.values() for s in spots), "A clue may not show an original of a PC-17 copy"
    assert [k["name"] for k in links] == ["手法", "时机", "来历", "烘焙人"], "Four layers: method -> timing -> provenance -> baker"
    assert [k["step"] for k in links] == ["胚底层", "果酱层", "奶油层", "裱花层"], "Cake order: sponge, jam, cream, piping"
    layer_col = {b["name"]: b["color"] for b in env["BAKE_LAYERS"]}
    for k in links:
        assert layer_col[k["layer"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
        assert k["step"].startswith(k["layer"])
    assert len({k["color"] for k in links}) == 4, "Each layer gets its own colour"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金烤盘", "银烤盘", "铜烤盘"]
    older_tiers = set()
    for var in ("LIBRARY_RATING_TIERS", "THEATER_RATING_TIERS", "ATELIER_RATING_TIERS", "SPORTS_RATING_TIERS",
                "HAUNTED_RATING_TIERS", "ASTRO_RATING_TIERS", "POOL_RATING_TIERS"):
        older_tiers |= {t["name"] for t in env[var]} | {t["title"] for t in env[var]}
    assert not older_tiers & ({t["name"] for t in tiers} | {t["title"] for t in tiers}), "Tray ratings must be new"
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]
    for word in ("乔穗", "赤藓糖醇", "3 号烤箱", "第六格", "便签", "郁老师", "控糖"):
        assert word in case["solution_pub"], f"Solution does not name `{word}`"
    for word in ("鬼魂", "灵异", "附身", "诅咒", "超自然", "闹鬼", "幽灵", "外星", "魔法", "鬼"):
        assert word not in case["solution_pub"] + "".join(k["full"] for k in links) + case["summary_pub"], \
            f"Supernatural wording `{word}`"
    used = set()
    for k in links:
        for sid, word in LAYER_TRACE[k["id"]].items():
            assert word in k["full"], f"{k['id']} does not cite {sid} (`{word}`)"
            spot_text = next(s for s in spots if s["id"] == sid)
            assert word in spot_text["detail"] + spot_text["surface"] + spot_text["evidence"] + spot_text["label"] \
                or (word == "颜色浅" and "颜色浅" in spot_text["evidence"]), f"{k['id']} cites `{word}` but clue {sid} never shows it"
            used.add(sid)
    assert used == {s["id"] for s in spots}, f"Clues not used by the chain: {set(s['id'] for s in spots) - used}"
    public = "".join(str(case[k]) for k in case if k != "margin_secret") + str(spots) + str(links) + env["BAKE_MASK_NOTICE"]
    for kw in SECRET_KEYWORDS:
        assert kw not in public, f"Spoiler keyword `{kw}` in public baking-contest copy"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in case["margin_secret"]) >= 2, "The gated note should be endgame material"

    # ---- C. script structure: 6 spots -> four cake layers -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "bake_case_investigate")
    for i in range(1, 7):
        assert f"if not _bk_s{i}:" in inv and f'$ bake_inspect_spot("s{i}")' in inv, f"spot s{i} not playable"
    assert inv.count("jump bake_case_investigate") == 6 and "jump bake_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"bake_layer_k{i}")
        assert f"show screen bake_layer_banner({i - 1}, " in kb
        assert kb.count("$ _bk_mistakes += 1") == 2 and kb.count(f"jump bake_layer_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _bk_layers = {i}" in kb
        for m_wrong in re.finditer(r"\$ _bk_mistakes \+= 1(.*?)jump bake_layer_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
        # the line Chen Mo says after the right answer is the layer's own `full` text (one source of truth)
        after = kb.split("\n    mc \"", 1)[1].split("\"\n", 1)[0]
        assert after == links[i - 1]["full"], f"k{i}: the spoken deduction differs from BAKE_LAYER_LINKS"
    assert len(set(correct_positions)) >= 3, f"Correct layer always at the same menu slot: {correct_positions}"
    assert correct_positions not in OLDER_SLOTS, "Answer slots must not copy PC-10 .. PC-16"
    assert "call _bake_finish_case(_bk_mistakes)" in blk and "label bake_case_resolution:" in blk
    assert blk.index("show screen evidence_book") < blk.index("label bake_case_investigate:"), "Evidence HUD must be up first"
    assert "hide screen evidence_book" in _label_block(src, "_bake_finish_case")
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the baking-contest case"
    assert "truth_spoiler_unlocked" not in blk, "The baking-contest script is fully public (only the page margin is gated)"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public baking-contest case"
    for phrase in ("蛋糕从头到尾，都没有离开过家政教室", "一张掉进缝里的便签", "只看不尝", "一格只放一盒", "没有老师签字"):
        assert phrase in blk, f"Resolution must spell out the real mechanism (`{phrase}`)"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"classroom", "storeroom", "corridor", "agency"} <= scenes_used, scenes_used
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"alice", "mo", "lin", "zhang"} <= cast, cast
    defs_src = _read("game/definitions.rpy")
    module_defines = dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", src, re.M))
    assert module_defines == {"chulao": "褚老师", "muzhen": "穆蓁蓁", "qiaosui": "乔穗", "yulao": "郁老师"}, module_defines
    assert not cast & set(module_defines), "Sprite-less newcomers must never be `show`n"
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert not re.search(rf"\b{var}\s*=", every_rpy), f"`{var}` already assigned elsewhere"
        assert not re.search(rf"\b{var}\b", every_rpy), f"`{var}` already used elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    # every newcomer of PC-10 .. PC-16 (sprite-less module defines) stays out of this case: no name re-use across cases
    older_new = {}
    for p in sorted(GAME_DIR.glob("*.rpy")):
        if p.name in ("definitions.rpy", Path(NEW_MODULE).name):
            continue
        older_new.update(dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", p.read_text(encoding="utf-8-sig"), re.M)))
    for var, nm in older_new.items():
        assert not re.search(rf"\b{var}\b", src), f"PC-17 re-uses an older newcomer's variable `{var}`"
        assert nm not in src, f"PC-17 re-uses an older newcomer's name `{nm}`"
    # the case-local prefix `_bk_` and the module's identifiers are new
    prod_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.glob("*.rpy") if p.name != Path(NEW_MODULE).name)
    assert "_bk_" not in every_rpy and not re.search(r"\bbake_\w+\s*\(", prod_rpy.replace("bake_case_solved_count", "")
                                                                         .replace("bake_best_short", "")), \
        "Only the folio / sub-bar may call into the PC-17 module"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"chulao", "muzhen", "qiaosui", "yulao", "lin", "zhang", "alice", "mo_note", "mc", "sysmsg"} <= speakers, speakers
    _sprite_slots_ok(blk, "bake_cake_case")
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_bk_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("bake_cake_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "bake_cake_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["bake_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "bake_cake_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "bake"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p", "bgm_daily": "d"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "BK-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_bake_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_bk_s{i}"] is True for i in range(1, 7))
    assert env["_bk_mistakes"] == 8 and env["_bk_layers"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {s["evidence"] for s in spots}
    assert env["bake_get_record"]()["inspected"] == [f"s{i}" for i in range(1, 7)]
    assert env["bake_inspect_spot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievements (gold run -> ach_golden_tray) ----
    assert [env["bake_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.bake_cake_record = {}
    mock_ach.granted.clear()
    assert env["bake_case_solved_count"]() == 0 and env["bake_best_short"]() == "待结案"
    v0 = env["bake_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["layer_shorts"]) and not any(v0["layer_fulls"])
    r = env["bake_record_solve"](5)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_bake_cake") and not mock_ach.has("ach_golden_tray")
    r = env["bake_record_solve"](1)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 1
    assert not mock_ach.has("ach_golden_tray")
    r = env["bake_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and mock_ach.has("ach_golden_tray")
    r = env["bake_record_solve"](2)
    assert not r["new_record"] and r["replays"] == 4 and r["best_tier"] == "gold" and r["last_tier"] == "silver"
    assert env["bake_gold_count"]() == 1 and env["bake_best_short"]() == "金烤盘"
    v = env["bake_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["layer_shorts"] == [k["short"] for k in links]
    env["bake_open_report_modal"]()
    assert env["bake_get_record"]()["report_viewed"] and any(s[0] == "bake_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    for fn in ("library_case_solved_count", "theater_case_solved_count", "atelier_case_solved_count",
               "sports_case_solved_count", "haunted_case_solved_count", "astro_case_solved_count", "pool_case_solved_count"):
        assert env[fn]() == 0, f"Older case store touched ({fn})"

    # ---- F. accordion sub-bar helpers (20 tabs / 5 groups; the baking contest opens "salon") ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            assert re.fullmatch(r"\S+ \d+/\d+", env["salon_tab_pill_text"](t)), t
    assert env["salon_open_group"]("bake") == "salon" and env["salon_tab_pill_text"]("bake") == "烘焙 1/1"
    assert env["salon_open_group"]("pool") == "closedlib" and env["salon_open_group"]("astro") == "starlit"
    assert env["salon_tab_icon"]("bake").endswith("icon_bake_contest.png")
    assert env["salon_tab_pill_text"]("notebook") == "复盘 0/8"
    mp.extras_salon_group = "salon"
    assert env["salon_open_group"]("endings") == "salon", "A remembered group still opens on non-salon tabs"

    # ---- G. zero-side-channel spoiler gate on the page margin (strongest state: solved, gold) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for s in _strings(view):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` leaked in {where}"

    locked = env["bake_render_view"]()
    _clean(locked, "baking-contest view")
    assert locked["display_secret"] == "" and locked["display_masked_notice"] == env["BAKE_MASK_NOTICE"] and not locked["unlocked"]
    saved_secret = case["margin_secret"]
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}", "续"):
        case["margin_secret"] = filler
        assert env["bake_render_view"]() == locked, "Locked baking-contest view depends on the gated text"
        proofs += 1
    case["margin_secret"] = saved_secret
    mp.te_cleared = True
    un = env["bake_render_view"]()
    assert un["unlocked"] and un["display_secret"] == saved_secret and un["display_masked_notice"] == ""
    mp.bake_cake_record = {}
    assert env["bake_render_view"]()["display_secret"] == "", "Unsolved case must stay blank even when unlocked"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["bake_render_view"]()["display_secret"] == ""
    env["bake_record_solve"](1)
    assert "小雪" in env["bake_render_view"]()["display_secret"]
    mp.truth_spoiler_confirmed = False
    assert env["bake_render_view"]()["display_secret"] == ""

    # ---- H. casebook 7 -> 8 pages: older pages untouched, read-only, stamps, achievement, spoiler gate ----
    pc16_env = pc16._sandbox_env()[0]
    nb = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb] == NOTEBOOK_KEYS
    assert nb[:7] == pc16_env["NOTEBOOK_CASES"], "The seven older pages must stay exactly as registered"
    assert nb[7] is env["CASEBOOK_BAKE_PAGE"] and set(env["_NOTEBOOK_BY_KEY"]) == set(NOTEBOOK_KEYS)
    pg = env["CASEBOOK_BAKE_PAGE"]
    assert pg["tab"] == pg["key"] == "bake" and pg["store"] in CASE_STORES and re.fullmatch(r"#[0-9a-f]{6}", pg["ink"])
    assert {pg["case_var"], pg["hotspots_var"], pg["links_var"], pg["tiers_var"]} <= set(env)
    for s in (pg["lesson"], pg["mo_margin"], pg["index_label"], pg["unit"]):
        for kw in SECRET_KEYWORDS:
            assert kw not in s, f"Spoiler keyword `{kw}` in public casebook copy (bake)"
    assert sum(1 for kw in SECRET_KEYWORDS if kw in pg["margin_secret"]) >= 2, "bake gated note"
    assert re.search(r"[\[\]{}]", pg["margin_secret"] + pg["lesson"] + pg["mo_margin"]) is None
    assert len({n["ink"] for n in nb}) == 8, "Every casebook page has its own ink colour"
    # the module merges its page once, never twice (re-running the init block is idempotent)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    assert [n["key"] for n in env["NOTEBOOK_CASES"]] == NOTEBOOK_KEYS
    nb = env["NOTEBOOK_CASES"]
    assert env["casebook_index_rows"]() == 3 and env["casebook_count_cn"](len(nb)) == "八"

    # read-only: rendering every page / the summary / the folio leaves every persistent field byte-identical
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.bake_cake_record = {"solved": True, "replays": 1, "best_tier": "silver", "best_mistakes": 2,
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
        env["casebook_count_cn"](8)
        env["folio_done_count"]()
        env["folio_case_line"]("BAKE_CASE", "蛋糕四层")
        env["bake_render_view"]()
        n_ops += 6
    assert _persistent_snapshot(mp) == snap, "Casebook / folio / page rendering wrote persistent state"
    mp.bake_cake_record = None
    assert env["bake_render_view"]()["solved"] is False and mp.bake_cake_record is None, "Reading never creates the store"
    mp.bake_cake_record = {"solved": True, "replays": 1, "best_tier": "silver", "best_mistakes": 2, "inspected": ["s1", "s4"]}
    pp = env["notebook_render_page"]("bake")
    assert pp["solved"] and pp["best_name"] == "银烤盘" and pp["inspected_count"] == 2 and pp["hotspot_total"] == 6
    assert pp["unit"] == "蛋糕四层" and pp["status"] == "ready" and pp["code"] == "BK-01"
    assert [r[3] for r in pp["evidence_rows"]] == [True, False, False, True, False, False]
    assert [r[2] for r in pp["evidence_rows"] if not r[3]] == ["", "", "", ""], "Uninspected evidence must stay blank"
    assert pp["chain"] == [(k["step"], k["name"], k["short"]) for k in links]
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    tree = ast.parse(init_code)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith(("bake_render", "bake_best", "bake_case_solved",
                                                                       "bake_gold", "bake_get", "bake_tier", "bake_rate",
                                                                       "bake_spoiler")):
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Assign, ast.AugAssign)):
                    for t in (sub.targets if isinstance(sub, ast.Assign) else [sub.target]):
                        assert not (isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "persistent"), \
                            f"{node.name} writes persistent.{t.attr}"
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute):
                    assert sub.func.attr not in ("save_persistent", "append", "update"), f"{node.name} calls .{sub.func.attr}()"
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name):
                    assert sub.func.id not in ("_ensure_bake_store", "_bake_write"), f"{node.name} calls {sub.func.id}()"
    # summary & verdict: written for eight pages, shown only when all eight are solved
    s0 = env["casebook_summary"]()
    assert s0["total"] == 8 and s0["count_cn"] == "八" and s0["display_verdict"] == ""
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve",
                  "haunted_record_solve", "astro_record_solve", "pool_record_solve"):
        env[solve](0)
    s1 = env["casebook_summary"]()
    assert s1["solved"] == 8 and "八桩案子" in s1["display_verdict"] and "七桩" not in s1["display_verdict"]
    _clean(s1, "casebook summary")
    # stamps: only the casebook's own store (and the selected page) change; PC-13's achievement keeps its "four PC-13 pages" rule
    mp.case_notebook_record = {}
    mock_ach.granted.clear()
    before = _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case"))
    for key in ("bake", "pool", "astro", "haunted"):
        assert env["casebook_stamp"](key) is not None
    assert env["notebook_stamped_count"]() == 4 and not mock_ach.has("ach_case_notebook"), \
        "Four stamps that are not PC-13's four pages must not grant 「推理笔记的复盘人」 early"
    for key in ("library", "theater", "atelier"):
        env["casebook_stamp"](key)
    assert not mock_ach.has("ach_case_notebook")
    env["casebook_stamp"]("sportsday")
    assert mock_ach.has("ach_case_notebook") and env["notebook_stamped_count"]() == 8
    assert env["casebook_stamp"]("bake")["stamped"].count("bake") == 1, "Stamping twice must stay idempotent"
    assert _persistent_snapshot(mp, exclude=("case_notebook_record", "notebook_selected_case")) == before, \
        "Stamping touched a store other than the casebook's own"
    mp.bake_cake_record = {}
    mp.case_notebook_record = {}
    assert env["casebook_stamp"]("bake") is None and "bake" not in env["notebook_get_record"]()["stamped"]
    # bake page spoiler gate: a locked page never depends on its gated note
    mp.bake_cake_record = {"solved": True, "replays": 1, "best_tier": "gold", "best_mistakes": 0, "inspected": []}
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    lockedp = env["notebook_render_page"]("bake")
    _clean(lockedp, "casebook page bake")
    assert lockedp["display_secret"] == "" and lockedp["display_masked_notice"] != ""
    saved = pg["margin_secret"]
    for filler in ("Z" * 280, "", "小雪周可" * 30, "[b]"):
        pg["margin_secret"] = filler
        assert env["notebook_render_page"]("bake") == lockedp, "Locked casebook page bake depends on its gated note"
        proofs += 1
    pg["margin_secret"] = saved
    mp.te_cleared = True
    assert env["notebook_render_page"]("bake")["display_secret"] == saved
    mp.te_cleared = False

    # ---- I. folio: eight cases + the eight-page casebook, counts, graceful degradation, wiring ----
    for fld in CASE_STORES:
        setattr(mp, fld, {})
    mp.dlc_alice_done = False
    mp.dlc_mo_done = False
    assert env["folio_done_count"]() == 0 and env["folio_total_count"]() == 11
    for solve in ("library_record_solve", "theater_record_solve", "atelier_record_solve", "sports_record_solve",
                  "haunted_record_solve", "astro_record_solve", "pool_record_solve", "bake_record_solve"):
        env[solve](1)
    mp.dlc_alice_done = mp.dlc_mo_done = True
    assert env["folio_done_count"]() == 10, "Casebook not fully stamped yet"
    for key in NOTEBOOK_KEYS:
        env["casebook_stamp"](key)
    assert env["folio_done_count"]() == 11 == env["folio_total_count"]()
    saved_counter = env.pop("bake_case_solved_count")
    assert env["folio_done_count"]() == 10, "A missing counter must count as not done, never crash"
    env["bake_case_solved_count"] = saved_counter
    line = env["folio_case_line"]("BAKE_CASE", "蛋糕四层")
    _clean(line, "folio bake line")
    assert line == "BK-01 《第六组的第二块蛋糕》 · 蛋糕四层"
    scr_src = _read("game/screens.rpy")
    extra_src = _read("game/extra.rpy")
    folio = pc14._folio_block(scr_src)
    mm = pc14.measure_main_menu(env)
    assert mm["folio_tabs"] == FOLIO_CASE_TABS, mm["folio_tabs"]
    assert re.search(r'"images/ui/icon_bake_contest\.png", _\("家政课烘焙赛"\), folio_case_line\("BAKE_CASE", "蛋糕四层"\), '
                     r'bake_best_short\(\), bake_case_solved_count\(\) > 0, SetField\(persistent, "extras_tab", "bake"\), from_extras\)$',
                     folio, re.M)
    assert re.search(r'notebook_stamped_count\(\) >= len\(NOTEBOOK_CASES\), SetField\(persistent, "extras_tab", "notebook"\), from_extras\)$',
                     folio, re.M)
    card = scr_src.split("screen extras_folio_case_card(", 1)[1].split("\nscreen ", 1)[0]
    assert card.startswith("icon, title, line, status, done, tab_action, from_extras=False):")
    assert 'action ([Hide("extras_folio_modal"), tab_action] + ([] if from_extras else [ShowMenu("extras")]))' in card
    assert "Start(" not in folio and "Replay(" not in folio and not re.findall(r"SetField\(persistent, \"(?!extras_tab)", folio)
    assert "bake_case_solved_count" in extra_src.split("FOLIO_CASE_COUNTERS = ", 1)[1].split(")", 1)[0]

    # ---- J. main menu: no new chip, the case only in the folio ----
    main_blk = scr_src.split("screen main_menu():", 1)[1].split("\nstyle ", 1)[0]
    assert "bake" not in main_blk and "icon_bake_contest" not in main_blk, "The main menu may not gain a baking-contest chip"
    assert main_blk.count('Show("extras_folio_modal")') == 1 and "folio" in mm["chips"]

    # ---- K. extras routing: the page, the expanded casebook (eight pages) ----
    assert re.search(r'elif cur == "bake":\n\s+use extras_bake_contest\n', extra_src)
    assert re.search(r'elif cur == "pool":\n\s+use extras_pool_locker\n', extra_src)
    assert re.search(r'elif cur == "notebook":\n(?:\s+##.*\n)?\s+use extras_casebook_expanded\n', extra_src)
    assert env["casebook_summary"]()["total"] == 8
    env["notebook_open_page"]("bake")
    assert any(s[0] == "notebook_page_modal" and s[2].get("case_key") == "bake" for s in mock_renpy.shown_screens)

    # ---- L. reset_all_progress clears PC-17 state and leaves main-story vars alone ----
    mp.bake_selected_spot = "s5"
    mp.extras_salon_group = "starlit"
    env["reset_all_progress"]()
    assert env["bake_case_solved_count"]() == 0 and mp.bake_cake_record == {} and mp.bake_selected_spot == "s1"
    assert mp.extras_salon_group == "salon" and env["fail_count"] == 0 and env["mo_favor"] == 50
    assert env["notebook_stamped_count"]() == 0

    data_cjk = _cjk(str({k: v for k, v in case.items() if k != "margin_secret"})) + sum(_cjk(str(s)) for s in spots) \
        + sum(_cjk(str(k)) for k in links)
    page_cjk = _cjk(pg["lesson"] + pg["mo_margin"])
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "SecretCJK": _cjk(case["margin_secret"]),
                       "CasebookBakePublicCJK": page_cjk, "CasebookBakeSecretCJK": _cjk(pg["margin_secret"]),
                       "CorrectSlots": [c + 1 for c in correct_positions], "ReadOnlyOps": n_ops,
                       "SideChannelProofs": proofs})
    print(f"[PASS] PC-17 runtime: baking-contest case (script CJK={cjk_case}, data CJK={data_cjk}, 6 spots -> cake layers "
          f"method/timing/provenance/baker, every layer cites its clues, correct slots {[c + 1 for c in correct_positions]}, "
          f"8 gentle loops, fail_count untouched) | gold/silver/bronze-tray ratings + best-record replay ladder + "
          f"ach_bake_cake / ach_golden_tray (gold run only) | 40 achievements (2x20) | page-margin spoiler gate "
          f"(zero leak) | casebook 7 -> 8 pages (older seven identical, {n_ops} reads byte-identical, stamps write only the "
          f"casebook, 「推理笔记的复盘人」 still needs PC-13's four pages, verdict for eight) | folio 11/11 + graceful "
          f"degradation | main menu: no new chip | {proofs} side-channel proofs")
    return cjk_case


################################################################################
# 4. Zero intrusion, icons (incl. reused-art pairing), text safety
################################################################################

def check_zero_intrusion_and_icons():
    # a protected UI module may differ from HEAD only by the approved tofu-symbol swap (verify_glyphs.GLYPH_SWAP,
    # byte-exact, every occurrence, nothing else); main-story files never qualify
    swapped = glyphs.glyph_swap_only_files()
    assert not swapped & set(MAIN_STORY_FILES)
    older = [m for m in OLDER_EXTRAS_MODULES if m not in swapped]
    assert PC16_MODULE in older and PC13_MODULE in older and PC15_MODULE in older
    res = _git("status", "--porcelain", "--", *MAIN_STORY_FILES, *older)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay / older extras modules were modified!\n{res.stdout}"
    diff = _git("diff", "--numstat", "--", *MAIN_STORY_FILES, *older)
    assert diff.stdout.strip() == "", "Main story / older module files have a diff"
    LOG_REPORT["GlyphSwap"] = ",".join(sorted(Path(s).name for s in swapped)) or "none"
    # whole-project guard: among *tracked* files only the PC-17 targets and the forward-compatible verifier edits may
    # differ from HEAD (untracked new files are not flagged; on a clean committed checkout nothing differs at all)
    allowed = set(PC17_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc17.py"]) | swapped
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

    diff = _git("diff", "-U0", "--", *[p for p in PC17_TOUCHED_FILES if p != NEW_MODULE], *FORWARD_COMPAT_TESTS)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"
            assert not re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", txt), f"Control character in added line: {txt!r}"
    # the older verifiers only gain forward-compatibility switches: none of their PC-specific assertions is deleted
    removed_asserts = [ln for ln in diff.stdout.splitlines() if ln.startswith("-") and not ln.startswith("---")
                       and ln[1:].lstrip().startswith("assert") and "tests/" in diff.stdout]
    for ln in removed_asserts:
        assert any(tok in ln for tok in ("_pc16_present", "== 7", "== 10", "== 19", "2×19", "grid 2 4", "names[-1]", "FOLIO_CASE_TABS",
                                         "SALON_GROUPS_EXPECTED", "PC16_SALON_GROUPS", "case_lines", "card_titles",
                                         "f_h", "salon_tab_pill_text", "folio_total_count", "folio_done_count", "grid_blk",
                                         "panel_inner")), f"Older verifier assertion dropped: {ln}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw and not raw.startswith(b"\xef\xbb\xbf"), "PC-17 module must use LF line endings, no BOM"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src
    for rel in PC17_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc17.py"]:
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
        if re.match(r'text (_\w+|BAKE_CASE|k_obj|l_obj|w_obj|r_obj|b_obj|_ks|_kv|_rv|_cv|_dv|_fseal|'
                    r'title|status|line|prompt_line)\b', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
            n_sub += 1
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\[("[a-z_]+"|\d)\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"{len(OLDER_EXTRAS_MODULES)} older extras modules byte-identical incl. PC-13 / PC-15 / PC-16; "
          f"only PC-17 targets + forward-compatible verifiers differ from HEAD), no Emoji/SVG/tabs/CRLF/control chars, "
          f"{n_str} interpolation-safe CJK data strings, {n_sub} data texts with substitute False")

    verified = 0
    for rel_icon in REQUIRED_UI_ICONS:
        p = GAME_DIR / rel_icon
        assert p.is_file(), f"Missing icon game/{rel_icon}"
        with Image.open(p) as im:
            assert im.format == "PNG" and im.mode == "RGBA" and im.size == (128, 128), f"{rel_icon}: {im.mode} {im.size}"
            a = im.getchannel("A")
            corners = [a.getpixel((0, 0)), a.getpixel((127, 0)), a.getpixel((0, 127)), a.getpixel((127, 127))]
            assert all(c == 0 for c in corners), f"{rel_icon} corners {corners}"
            lo, hi = a.getextrema()
            assert lo == 0 and hi > 200
            if rel_icon in PC17_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    reused = []
    for copy_rel, src_rel in REUSED_ICON_SOURCES.items():
        assert src_rel not in pc16.REUSED_ICON_SOURCES and src_rel not in REUSED_ICON_SOURCES, \
            f"{src_rel} is itself a re-used copy: copy formal art only"
        same = hashlib.sha256((GAME_DIR / copy_rel).read_bytes()).digest() == hashlib.sha256((GAME_DIR / src_rel).read_bytes()).digest()
        reused.append(f"{Path(copy_rel).stem}{'=' if same else '!='}{Path(src_rel).stem}")
    LOG_REPORT["ReusedIcons"] = ",".join(reused)
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA PNG, transparent corners); "
          f"PC-17 set: {', '.join(Path(x).name for x in PC17_UI_ICONS)} (reuse: {', '.join(reused)})")


def check_reused_icon_pairing():
    """No page shows a re-used PC-16 / PC-17 icon next to the original it was copied from: every extras tab (sub-bar
    state + the page screen, its `use`d screens and its data-driven clue icons), every PC-17 modal, the folio and the main menu."""
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

    pairs = list(ALL_REUSED_PAIRS.items())

    def clash(icons, where):
        for c, o in pairs:
            assert not (c in icons and o in icons), f"{where} shows {Path(c).name} next to its original {Path(o).name}"

    extra_src = all_src["extra.rpy"]
    route = dict(re.findall(r'elif cur == "(\w+)":\n(?:\s+##.*\n)?\s+use (\w+)\n', extra_src))
    assert route.get("bake") == "extras_bake_contest"
    data_icons = {"library": "LIBRARY_HOTSPOTS", "theater": "THEATER_HOTSPOTS", "atelier": "ATELIER_HOTSPOTS",
                  "sportsday": "SPORTS_ITEMS", "haunted": "HAUNTED_SPOTS", "astro": "ASTRO_SPOTS", "pool": "POOL_SPOTS",
                  "bake": "BAKE_SPOTS", "capsule": "CAPSULE_ITEMS"}
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
    for scr in ("bake_report_modal", "bake_layer_banner", "bake_result_card", "extras_bake_contest", "extras_folio_modal",
                "notebook_page_modal", "extras_casebook_expanded", "main_menu"):
        clash(screen_icons(scr), f"screen {scr}")
    # the folio opened over the title screen sits on an ~88% opaque veil (the title screen's chips underneath are dimmed)
    veil = re.search(r'add "#0c0814([0-9a-f]{2})"', screens["extras_folio_modal"]).group(1)
    assert int(veil, 16) >= 0xd0, "The folio veil must keep the title screen's chips dimmed"
    LOG_REPORT["IconPairingStates"] = n_states
    print(f"[PASS] Reused-icon pairing: {n_states} extras tab / sub-bar states + 8 screens never show a PC-16 / PC-17 copy "
          f"next to its original (folio veil alpha 0x{veil} over the title screen)")


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

    for img in ("ui_icon_bake_contest", "ui_icon_second_cake", "ui_icon_oven_log", "ui_icon_rolling_pin"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_bake_contest", "bake_report_modal", "bake_layer_banner", "bake_result_card",
                "extras_casebook_expanded", "notebook_page_modal", "extras_folio_modal", "extras_folio_case_card",
                "extras_achievements", "deduction_cutin", "evidence_book", "confirm", "extras_pool_locker"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("bake_cake_case", "bake_case_investigate", "bake_case_review_intro", "bake_layer_k1",
                "bake_layer_k2", "bake_layer_k3", "bake_layer_k4", "bake_case_resolution",
                "_bake_init_sandbox", "_bake_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    assert "bake_steam" in transforms
    tint_re = r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)"
    tinted = re.findall(tint_re, new_src)
    assert len(tinted) == 2 and all((GAME_DIR / g).is_file() for g in tinted), tinted
    # every PC-17 style is used by a PC-17 screen
    for st in re.findall(r"^style (bake_\w+) is", new_src, re.M):
        assert style_users.get(st), f"PC-17 style {st} is never used"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC17_TOUCHED_FILES:
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
    for icon in PC17_UI_ICONS:
        assert icon in refs, f"PC-17 icon {icon} is not wired into any .rpy"
    folio = pc14._folio_block(scr_src)
    assert '"images/ui/icon_bake_contest.png"' in folio, "The folio card uses the baking-contest entry icon"
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
    assert '"bake_cake_case":' in extra_src
    for lbls in ("_BAKE_CASE_LABELS", "_POOL_CASE_LABELS", "_ASTRO_CASE_LABELS", "_HAUNTED_CASE_LABELS", "_SPORTS_CASE_LABELS",
                 "_ATELIER_CASE_LABELS", "_THEATER_CASE_LABELS", "_CLOSED_LIBRARY_LABELS"):
        assert extra_src.count(f"or name in {lbls}") == 2, f"{lbls} callback wiring must be in both branches"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("bake_cake_record", "bake_selected_spot"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld

    for rel in PC17_TOUCHED_FILES:
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
    pc17_shots = ("ui_17a_bake_unsolved.png", "ui_17b_bake_gold_masked.png", "ui_17c_bake_unmasked.png",
                  "ui_17d_bake_report.png", "ui_17e_bake_layer_banner.png", "ui_17f_bake_result_card.png",
                  "ui_17g_subbar_salon_bake.png", "ui_17h_casebook_eight_pages.png", "ui_17i_casebook_bake_page.png",
                  "ui_17j_folio_eight_cases.png", "ui_17k_main_menu_no_new_chip.png")
    for shot in pc17_shots:
        assert shots.count(shot) == 1, f"Missing / duplicate {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_bc_rec")
    pc17_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc17_seg.index(s) for s in pc17_shots] == sorted(pc17_seg.index(s) for s in pc17_shots), "PC-17 shots out of order"
    assert shots.index("ui_16j_folio_seven_cases.png") < start < shots.index("ui_16k_main_menu_no_new_chip.png"), \
        "PC-17 extras-page audit runs after PC-16's, before the return to the main menu"
    assert pc17_seg.index("ui_17j_folio_eight_cases.png") < pc17_seg.index('pause until screen "main_menu"') \
        < pc17_seg.index("ui_16k_main_menu_no_new_chip.png") < pc17_seg.index("ui_17k_main_menu_no_new_chip.png")
    # the PC-15 / PC-16 segments' own assertions follow the PC-17 layout (eight pages, eleven folio entries)
    assert shots.count("len(NOTEBOOK_CASES) == 8") == 3 and shots.count("folio_total_count() == 11") == 6
    for stale in ("len(NOTEBOOK_CASES) == 7", "folio_total_count() == 10", "len(NOTEBOOK_CASES) == 6", "folio_total_count() == 9"):
        assert stale not in shots, f"Stale assertion `{stale}` would fail in the real UI run"
    for bad in ("ach_grant", "bake_record_solve(", "bake_inspect_spot(", "casebook_stamp(", "notebook_stamp(",
                "notebook_open_page(", "pool_record_solve(", "reset_all_progress"):
        assert bad not in pc17_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("bake_cake_record", "bake_selected_spot", "case_notebook_record", "notebook_selected_case",
                "extras_salon_group", "te_cleared", "truth_spoiler_confirmed"):
        assert f"persistent.{fld} = _saved_" in pc17_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-17 coverage ({len(pc17_shots)} shots, "
          f"state restored, PC-15 / PC-16 asserts updated)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc17_runtime()
    check_zero_intrusion_and_icons()
    check_reused_icon_pairing()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    glyphs.check_glyph_coverage()  # every displayed .rpy character has a glyph in all three bundled fonts (no tofu)
    LOG_REPORT.update(glyphs.LOG_REPORT)
    print("PC17_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC17_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
