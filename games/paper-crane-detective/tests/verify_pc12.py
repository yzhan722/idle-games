#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-12 Static, Behavioral, Pixel-Budget, Art-Room Missing-Painting Case (replayable, rated),
Detective Club Graduation Message Wall + Photo Labels (read-only ties to the PC-10 album and the
PC-11 time capsule), Spoiler-Gate (side-channel proof), Salon Accordion Sub-Bar (14 tabs / 5 groups),
Asset & Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's
init-python blocks inside the same mocked sandbox verify_pc11.py uses, plus the PC-12 module.
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
NEW_MODULE = "game/yearbook_atelier_wall.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import casefile_checks as cf  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import rpy_syntax as rs  # noqa: E402  (strict_files: the save-compatibility `from` pass is not a story change)

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

PC12_UI_ICONS = [
    "images/ui/icon_art_room.png",
    "images/ui/icon_missing_painting.png",
    "images/ui/icon_message_wall.png",
    "images/ui/icon_graduation_card.png",
]

REQUIRED_UI_ICONS = pc11.REQUIRED_UI_ICONS + PC12_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC12_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

# PC-12 only *reads* these modules (album / capsule state); they must stay byte-identical
READ_ONLY_MODULES = ["game/vanished_shelf_album.rpy", "game/wings_theater_capsule.rpy"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", ("library", "theater", "atelier")),
    ("keepsake", ("album", "capsule", "wall")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

CJK_LINE = pc10.CJK_LINE
NAV_RIGHT = 60 + 280  # gui.navigation_xpos + navigation_button xsize

LOG_REPORT = {}

# Forward compatibility (PC-13+): later modules initialise after this one and legitimately append a 4th tab to the
# "closedlib" / "keepsake" groups (rendered with compact pills), a 6th main-menu chip row and achievements 31-32.
# Those exact counts / widths are verified by their own milestone (verify_pc13); here the PC-12 contract is kept:
# its tabs stay first in their groups, its chip row stays, its module initialises after every older module.
# PC-14 appends a 5th tab to "closedlib" (one-icon quint pills), merges the main menu's extra-story chips into one
# "番外卷宗" folio entry (6 rows -> 4 rows) and adds achievements 33-34 (verified by verify_pc14).
# PC-15 appends a 6th tab to "closedlib" (48px sext pills), re-flows the 4 main-menu chip rows clear of the navigation
# column and adds achievements 35-36 (verified by verify_pc15).
# PC-16 appends a 7th short case (folio only), moves the meteor-night tab into "starlit", expands the casebook to seven
# pages and adds achievements 37-38 (verified by verify_pc16).
LATER_MODULES = ["zephyr_relay_casebook.rpy", "zoetrope_shadow_folio.rpy", "zubenelgenubi_meteor_casebook.rpy",
                 "zwembad_locker_casebook.rpy", "zymase_bakeoff_casebook.rpy"]


def _later_present():
    return [n for n in LATER_MODULES if (GAME_DIR / n).is_file()]


def _rows_reflowed():
    """PC-15 re-flows the main-menu chips into 4 + 3 + 3 + 4 rows moved clear of the navigation column (verify_pc15)."""
    return (GAME_DIR / "zubenelgenubi_meteor_casebook.rpy").is_file()


def _folio_merged():
    """PC-14 merged the main menu's extra-story chips into one "番外卷宗" folio entry (6 rows -> 4 rows; verify_pc14)."""
    return (GAME_DIR / "zoetrope_shadow_folio.rpy").is_file()


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18, 19)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (12, 13, 14, 17, 18, 19, 20, 21, 38, 40, 84)}
    return f, sf


def _lines(font, text, width):
    """Greedy CJK wrap estimate (Ren'Py breaks CJK anywhere)."""
    n, cur = 1, ""
    for ch in text:
        if _w(font, cur + ch) > width:
            n += 1
            cur = ch
        else:
            cur += ch
    return n


################################################################################
# 0. Sandbox (PC-11 sandbox + PC-12 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc11._sandbox_env()
    for k, v in {
        "atelier_painting_record": {}, "atelier_selected_hotspot": "h1", "message_wall_record": {},
        "wall_selected_card": "w01",
    }.items():
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
    assert len(rpy_files) >= 30, f"Expected >=30 .rpy files (including yearbook_atelier_wall.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-12 module must initialise after wings_theater_capsule.rpy so its 2 achievements append last
    assert names.index("yearbook_atelier_wall.rpy") > names.index("wings_theater_capsule.rpy")
    later = _later_present()
    assert names[len(names) - 1 - len(later)] == "yearbook_atelier_wall.rpy", (
        f"PC-12 module must initialise after every older top-level module: {names[-3:]}")
    assert names[len(names) - len(later):] == sorted(later), f"Only later milestones may follow PC-12: {names[-3:]}"

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
    # top-level `define X = Character(...)` lines of the new module must parse as Python too
    n_def = 0
    for ln in _read(NEW_MODULE).splitlines():
        m = re.match(r"^define (\w+)\s*=\s*(.+)$", ln)
        if m:
            ast.parse(f"{m.group(1)} = {m.group(2)}")
            n_def += 1
    assert n_def == 2
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines); PC-12 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def _main_menu_metrics(f, sf, scr_src):
    """Vertical stack of the main-menu title column (vbox yalign 0.29) with the 5th chip row."""
    blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    blk = blk.split('style "main_menu_vbox"', 1)[1]
    # (PC-15+ nests the rows in one shifted wrapper vbox with a tighter spacing: count the row headers at any depth)
    chip_rows = len(re.findall(r"^(?P<ind> +)hbox:\n(?P=ind)    xalign 0\.5\n(?:(?P=ind)    xoffset -?\d+\n)?(?P=ind)    spacing \d+\n",
                               blk, re.M))
    nulls = [int(n) for n in re.findall(r"^ +null height (\d+)$", blk, re.M)]
    assert chip_rows == (4 if _folio_merged() else 5 + len(_later_present())), f"Unexpected cozy-chip row count {chip_rows}"
    particle = round(96 * 0.52)
    kicker = _line_h(f[15]) + 2 * 2
    title = _line_h(sf[84]) + 2 * 10
    rule = 10
    title_sub = _line_h(sf[38]) + 2 * 3
    subtitle = _line_h(f[19]) + 2 * 2
    stack = particle + kicker + title + rule + title_sub + rule + subtitle + chip_rows * 30 + sum(nulls)
    top = 0.29 * (720 - stack)
    bottom = top + stack
    badge_top = 720 - 14 - (2 * 5 + max(_line_h(f[15]), round(22 * 0.78)))
    row5_top = bottom - 30
    return {"stack": stack, "top": round(top), "bottom": round(bottom), "badge_top": badge_top,
            "chip_rows": chip_rows, "row5_top": round(row5_top)}


def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    bs_src = _read("game/bookstreet_seasons.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-12 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_SALON_TABS", ["teaparty", "lexicon"]), ("EXTRAS_BOOKSTREET_TABS", ["restoration", "letterbox"]),
                       ("EXTRAS_RADIO_ORIGAMI_TABS", ["radio", "origami"]), ("EXTRAS_STARLIT_TABS", ["planetarium", "badges"]),
                       ("EXTRAS_CLOSED_LIBRARY_TABS", ["library", "album"]),
                       ("EXTRAS_THEATER_CAPSULE_TABS", ["theater", "capsule"]),
                       ("EXTRAS_ATELIER_WALL_TABS", ["atelier", "wall"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 14 tabs in 5 groups, each exactly once; EVERY open state <= 702px.
    #     Keeping PC-11's 4 groups would put 6 pills in group 4 -> measured below, it overflows (the reason for a 5th group).
    sb = pc10.measure_salon_subbar()
    cf.check_subbar(sb, SALON_KEYS, extra_src, report)  # (PC-G2: the short cases are one 「案卷」 pill)

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)
    avail = 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert sub_px <= avail and "侦探社沙龙" in sub
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "atelier_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- atelier page ----------------
    case = env["ATELIER_CASE"]
    hotspots = env["ATELIER_HOTSPOTS"]
    links = env["ATELIER_STROKE_LINKS"]
    tiers = env["ATELIER_RATING_TIERS"]
    pigments = env["ATELIER_PIGMENTS"]
    clue_w = int(_style_prop(bs_src, "restoration_clue_card", "xsize"))
    assert "grid 3 2:" in new_src and len(hotspots) == 6
    assert 3 * clue_w + 2 * 8 == console_inner, "Hotspot 3x2 grid must equal 694px"
    widest_hot = 0
    for h in hotspots:
        line = _wb(f[11], f"{h['code']} · {h['label']}") + 4 + _wb(f[10], "已勘查")
        widest_hot = max(widest_hot, line)
        assert line <= clue_w - 16, f"Hotspot label `{h['label']}` overflows: {line}px"
    report["AtelierHotspotLabel"] = widest_hot
    slot_w = int(_style_prop(new_src, "atelier_stroke_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "atelier_stroke_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "atelier_stroke_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Stroke slots overflow"
    assert "add Solid(k_obj[\"color\"]) xysize (151, 3)" in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Stroke slot content too tall"
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Stroke short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    tier_w = int(_style_prop(new_src, "atelier_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["AtelierTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"

    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    hdr = 36 + 10 + 398 + hdr_right
    assert hdr <= console_inner, f"Atelier header overflows: {hdr}px"
    assert _w(sf[19], "美术室消失的油画") <= 398
    for s in ("已结案 · 四笔推理全部画完 · 可随时重返北窗画室冲击金牌", "开展前一天，画了三年的压轴油画不见了 · 六处痕迹等你勘查"):
        assert _w(f[12], s) <= 398, f"Atelier header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(_read("game/extra.rpy"), "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    band = len(pigments) * 22 + (len(pigments) - 1) * 2
    assert band <= 180 and len(pigments) == 6, f"Pigment band {band}px wider than the 180px thumbnail"
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Atelier time-tag line overflows 492px: {tag_line}px"
    lamp = 15 + 6 + _w(f[12], "画室光影：" + case["lighting_note"])
    assert lamp <= 492, f"Atelier lighting line overflows: {lamp}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 六处痕迹全勘查）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方痕迹，再推开美术室的门）")
    assert arch_solved <= 492 and arch_open <= 492, f"Atelier archive line overflows: {arch_solved}/{arch_open}px"
    report["AtelierTagLine"] = tag_line
    report["AtelierArchive"] = max(arch_solved, arch_open)
    at_footer = (_w(f[12], "零失误画完四笔推理可获金牌 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
                 + 8 + max(146, _w(f[15], "重返北窗画室") + 36, _w(f[15], "推开美术室的门") + 36))
    assert at_footer <= console_inner, f"Atelier footer overflows: {at_footer}px"
    report["AtelierFooter"] = at_footer
    quick = (20 + 10 + _w(sf[14], "寄语墙 · W-01 给万事屋的眼睛") + 10 + _w(f[12], "（结案后写好）")
             + 8 + max(84, _w(f[13], "前往寄语墙") + 22))
    assert quick <= 722 - 24, f"Atelier quick row overflows: {quick}px"
    report["AtelierQuickRow"] = quick

    # in-scene stroke banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "atelier_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "atelier_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728
    assert banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8, "Banner slot content too tall"
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "美术室 · 四笔推理") + 8 + _w(f[11], "已落笔 4/4 · 失误只计入本案评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen atelier_stroke_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    report["StrokeBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 608 - 28 = 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "美术室结案 · AT-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(pigments) * 101 <= 608 and "xysize (101, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入本案评级，不影响主线）",
              "首次结案 · 四笔推理已写入鉴赏室「美术室油画」分页，寄语墙的前两张寄语卡写好了",
              "重玩挑战 · 刷新个人纪录！这一次落笔比以往任何一次都更稳",
              "重玩挑战 · 再次拿下金牌，北窗画室名侦探实至名归",
              "重玩挑战 · 零失误画完四笔推理，就能拿下金牌",
              env["ATELIER_CASE"]["mo_note_pub"]] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"AT-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(pigments) * 115 <= 692 and "xysize (115, 3)" in new_src
    assert 6 + 8 + 658 <= 672 and "xsize 658" in new_src
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重返北窗画室") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- message-wall page ----------------
    cards = env["WALL_CARDS"]
    plabels = env["WALL_PHOTO_LABELS"]
    card_w = int(_style_prop(new_src, "wall_card_button", "xsize"))
    card_h = int(_style_prop(new_src, "wall_card_button", "ysize"))
    card_pad = [int(x) for x in _style_prop(new_src, "wall_card_button", "padding").strip("()").split(",")]
    assert "$ _wall_rows = (len(WALL_CARDS) + 3) // 4\n        grid 4 _wall_rows:" in new_src and len(cards) == 12
    assert 4 * card_w + 3 * 10 == 722, "Wall 4-column grid must equal 722px"
    inner_w = card_w - 2 * card_pad[0]
    stack = round(11 * CJK_LINE) + 2 + round(11 * CJK_LINE) + 2 + round(13 * CJK_LINE)
    assert stack <= card_h - 2 * card_pad[1], f"Wall card content too tall: {stack}px"
    widest_card = 0
    for c in cards:
        line1 = 7 + 5 + _wb(f[11], c["code"]) + 4 + _wb(f[10], "已钉上")
        line2 = _w(f[11], f"{c['writer']} → {c['recipient']}")
        title = _w(sf[13], c["title"])
        widest_card = max(widest_card, line1, line2, title)
        assert line1 <= inner_w and line2 <= inner_w, f"Wall card head `{c['code']}` overflows: {line1}/{line2}px"
        assert title <= inner_w, f"Wall card title `{c['title']}` overflows: {title}px"
    report["WallCardText"] = widest_card
    w_hdr = 36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "已钉上 12/12") + 20) + 6 + max(84, _w(f[13], "恢复遮罩") + 22)
    assert w_hdr <= console_inner, f"Wall header overflows: {w_hdr}px"
    assert _w(sf[19], "侦探社毕业纪念寄语墙") <= 398
    for s in ("十二张寄语卡已全部钉上 · 毕业那天，一张一张收进相册。", "TRUE END 已通关 · 寄语卡与合影标签的续笔已全部显影。",
              "已手动开启剧透许可 · 寄语卡与合影标签的续笔当前可见。", "万事屋门边的软木公告板 · 涉终章的续笔已由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Wall header line wraps ({_w(f[12], s)}px): {s}"
    rule = (16 + 6 + _w(f[11], "可钉上 12 · 已钉上 12 · 寄语卡会随结案、合照与胶囊的进度陆续写好") + 10
            + _w(f[11], "钉满十二张解锁成就「毕业寄语墙的执笔人」"))
    assert rule <= 702, f"Wall rule bar overflows: {rule}px"
    report["WallRuleBar"] = rule
    well = int(_style_prop(new_src, "wall_icon_well", "xsize"))
    det_head = well + 14 + 470 + max(96, _w(f[11], "已钉上墙") + 20)
    assert det_head <= console_inner, f"Wall detail header overflows: {det_head}px"
    widest_detail = 0
    for c in cards:
        for s in (f"执笔：{c['writer']} → {c['recipient']}", f"钉上条件：{c['condition']}（当前 {c['need']}/{c['need']}）"):
            widest_detail = max(widest_detail, _w(f[12], s))
            assert _w(f[12], s) <= 470, f"Wall detail line wraps ({_w(f[12], s)}px): {s}"
        assert 86 + 6 + _w(sf[18], f"《{c['title']}》") <= 470, c["title"]
    report["WallDetail"] = widest_detail
    w_foot = (_w(f[12], "每一张寄语卡，都写给万事屋里的某个人") + 10
              + max(max(84, _w(f[13], "前往" + c["source"]) + 22) for c in cards if c["tab"] != "wall") + 8
              + max(84, _w(f[13], "展开卡片") + 22) + 8 + max(146, _w(f[15], "钉上寄语墙") + 36))
    assert w_foot <= console_inner, f"Wall footer overflows: {w_foot}px"
    report["WallFooter"] = w_foot
    # photo-label strip: 3 x 226 + 2 x 8 = 694 inside the 14px-padded card
    lab_w = int(_style_prop(new_src, "wall_photo_label", "xsize"))
    lab_pad = int(_style_prop(new_src, "wall_photo_label", "padding").strip("()").split(",")[0])
    thumb = int(_style_prop(new_src, "wall_label_thumb", "xsize"))
    assert 3 * lab_w + 2 * 8 == console_inner and "grid 3 2:" in new_src and len(plabels) == 6
    lab_inner = lab_w - 2 * lab_pad
    side_col = lab_inner - thumb - 6
    strip_head = 18 + 6 + _w(sf[13], "合影标签 · 墙角钉着的六张合照（读取合照相册与时间胶囊的进度）") + 10 + _w(f[11], "已冲洗 6/6")
    assert strip_head <= console_inner, f"Photo-label header overflows: {strip_head}px"
    widest_label = 0
    for pl in plabels:
        pv = env["wall_render_photo_label"](pl["id"])
        code_line = _wb(f[10], f"{pv['photo_code']} · 未冲洗")
        ptitle = _w(sf[12], pv["photo_title"])
        cap = _w(f[10], f"{pv['capsule_code']} · {pv['capsule_name']}") + 4 + _w(f[10], "未放入胶囊")
        widest_label = max(widest_label, code_line, ptitle, cap)
        assert code_line <= side_col and ptitle <= side_col, f"Label head `{pv['photo_title']}` overflows {side_col}px"
        assert cap <= lab_inner, f"Label capsule line `{pv['capsule_name']}` overflows: {cap}px"
        body_lines = _lines(f[11], f"{pl['writer']}：{pl['label']}", lab_inner)
        sec_lines = _lines(f[11], "续笔：" + pl.get("label_secret", ""), lab_inner) if pl["spoiler"] else 0
        assert body_lines <= 4 and sec_lines <= 3, f"{pl['id']} label too long ({body_lines}+{sec_lines} lines)"
    assert _lines(f[10], env["WALL_LABEL_MASK_NOTICE"], lab_inner) <= 2
    report["PhotoLabelText"] = widest_label
    strip_foot = (_w(f[11], "照片在合照相册里冲洗，纪念物在时间胶囊里放入——寄语墙只把它们并排钉在一起") + 10
                  + max(84, _w(f[13], "打开相册") + 22) + 8 + max(84, _w(f[13], "打开胶囊") + 22))
    assert strip_foot <= console_inner, f"Photo-label footer overflows: {strip_foot}px"
    report["PhotoLabelFooter"] = strip_foot
    w_quick = (20 + 10 + _w(sf[14], "美术室油画 · AT-01 北窗下的三年") + 10 + _w(f[12], "（待结案）")
               + 8 + max(84, _w(f[13], "前往美术室") + 22))
    assert w_quick <= 722 - 24, f"Wall quick row overflows: {w_quick}px"
    report["WallQuickRow"] = w_quick
    # card modal (740 - 48 = 692), body in a 280px viewport
    cm_head = 40 + 12 + max(_w(sf[20], f"{c['code']} · 《{c['title']}》") for c in cards) + 10 + 28 + 6 + _wb(f[13], "已钉上 12/12")
    assert cm_head <= 692, f"Card modal header overflows: {cm_head}px"
    for c in cards:
        assert 40 + 12 + _w(f[12], f"执笔：{c['writer']} → {c['recipient']} · 钉在万事屋门边的软木公告板上") <= 692 - 120
        h = (_lines(sf[14], c["body"], 672) * (_line_h(sf[14]) + 6) + 8 + _line_h(f[13]) + 8 + 1 + 8
             + (_lines(f[13], "续笔：" + c.get("body_secret", ""), 672) * (_line_h(f[13]) + 4) if c["spoiler"] else 0))
        assert h <= 280 + 40, f"Card {c['id']} far taller than its viewport: {h}px"
    cm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮收好寄语卡") + 10 + max(84, _w(f[13], "手动解锁剧透") + 22)
               + 8 + max(138, _w(f[14], "收好寄语卡") + 36))
    assert cm_foot <= 692, f"Card modal footer overflows: {cm_foot}px"

    # ---------------- main menu: 5th cozy row (2 chips), narrower than row 2, clear of nav & progress badge ----------------
    if _folio_merged():
        # PC-14 merged the extra-story chips into one "番外卷宗" folio entry (4 rows). The PC-12 contract still holds:
        # the message wall stays a direct chip, the art-room case is a folio card one click away, the wall's row is
        # narrower than row 2 and clear of the navigation column, the column clears the progress badge
        # (geometry parsed from screens.rpy by verify_pc14's shared measurer).
        import verify_pc14 as pc14
        assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
        mmm = pc14.measure_main_menu()
        assert "wall" in mmm["chips"] and "atelier" in mmm["folio_tabs"] and "atelier" not in mmm["chips"]
        wall_row = [i for i, r in enumerate(mmm["rows"]) if "wall" in r][0]
        # (PC-15 re-flows the chips into 4 + 3 + 3 + 4 rows: the wall row is compared with the wider of rows 1-2 and its
        #  left edge is measured at the rows' real offset)
        row5_w, row2_w = mmm["row_w"][wall_row], (max(mmm["row_w"][:2]) if _rows_reflowed() else mmm["row_w"][1])
        assert row5_w < row2_w <= 760, f"Main menu wall row ({row5_w}px) not narrower than the reference row ({row2_w}px)"
        row5_left = mmm["left"][wall_row]
        assert row5_left > NAV_RIGHT, f"Wall row ({row5_left:.0f}px) collides with the navigation column (<= {NAV_RIGHT}px)"
        mm = _main_menu_metrics(f, sf, scr_src)
        assert (mm["top"], mm["bottom"]) == (mmm["top"], mmm["bottom"]), (mm, mmm)
    else:
        expected_chips = 16 + 2 * len(_later_present())  # PC-13 appends a 6th row of 2 chips (verified by verify_pc13)
        assert scr_src.count('style "main_menu_cozy_chip"') == expected_chips, f"Expected {expected_chips} main-menu cozy chips"
        assert "at main_title_in(0.86)" in scr_src and scr_src.index("at main_title_in(0.80)") < scr_src.index("at main_title_in(0.86)")
        best_names = [t["name"] for t in tiers] + ["待结案"]
        row5 = [max(18 + 6 + _w(f[13], f"美术室油画 ({b})") + 24 for b in best_names), 18 + 6 + _w(f[13], "寄语墙 (12/12)") + 24]
        row5_w = sum(row5) + 10
        row2_w = sum(18 + 6 + _w(f[13], t) + 24 for t in ("古籍修复台 (3/3)", "四季信笺匣 (4/4)", "旧广播电台 (3/3)", "千纸鹤陈列柜 (12/12)")) + 30
        assert row5_w < row2_w <= 760, f"Main menu row 5 ({row5_w}px) not narrower than row 2 ({row2_w}px)"
        row5_left = 568 - row5_w / 2
        assert row5_left > NAV_RIGHT, f"Row 5 ({row5_left:.0f}px) collides with the navigation column (<= {NAV_RIGHT}px)"
        mm = _main_menu_metrics(f, sf, scr_src)
    assert mm["bottom"] + 12 <= mm["badge_top"], f"Main-menu column bottom {mm['bottom']}px too close to badge top {mm['badge_top']}px"
    assert mm["top"] >= 20, f"Main-menu column top {mm['top']}px too close to the window edge"
    report["MainMenuRow5"] = row5_w
    report["MainMenuRow5Left"] = round(row5_left)
    report["MainMenuRow2"] = row2_w
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['badge_top'] - mm['bottom']})"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    n_ach = 30 + 2 * len(_later_present())  # PC-13 -> 2x16 = 32, PC-14 -> 2x17 = 34 (own milestones); PC-12's 30 is the state before
    assert "grid 2 ach_grid_rows():" in ach_src and f"2×{n_ach // 2} = {n_ach}" in ach_src and f"2×{n_ach // 2} 共 {n_ach} 枚" in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_atelier_painting", "ach_message_wall"):
        m = re.search(rf'"{aid}",\s*"([^"]+)",\s*"([^"]+)"', new_src)
        assert m, f"Missing registration for {aid}"
        assert _w(sf[19], m.group(1)) <= ach_text_w and _w(f[14], m.group(2)) <= ach_text_w, f"{aid} copy wraps"

    LOG_REPORT.update(report)
    print("[PASS] 1280x720 pixel audit: "
          + ", ".join(f"{k}={v}" + ("" if isinstance(v, str) else "px") for k, v in report.items())
          + " | sub-bar per open group " + ", ".join(f"{g}={px}" for g, px in sb["per_group"].items())
          + " (all <=702)")
    return report, sb


################################################################################
# 3. Sandbox runtime: case, rating, wall, photo labels, spoiler gate
################################################################################

def _case_block(src):
    m = re.search(r"^label atelier_painting_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label atelier_painting_case"
    return m.group(1)


def _first_completion(env, mp, key):
    """Complete the first item of one older extras activity through its own public API (spoilers stay locked)."""
    if key == "mailbox":
        env["mailbox_record_case_clear"](env["MAILBOX_CASE_DEFS"][0]["id"], 0)
    elif key == "teaparty":
        env["tea_party_record_clear"](env["TEA_PARTY_SESSIONS"][0]["id"], 0)
    elif key == "lexicon":
        pub = [e for e in env["LEXICON_ENTRIES"] if not e.get("spoiler")]
        env["lexicon_mark_read"](pub[0]["id"])
    elif key == "restoration":
        mp.book_restoration_records = {env["RESTORATION_TOMES"][0]["id"]: {"restored": True}}
    elif key == "letterbox":
        env["letterbox_record_clear"](env["SEASONAL_LETTERS"][0]["id"], 0)
    elif key == "origami":
        env["origami_fold_and_inspect"](env["ORIGAMI_CRANE_PATTERNS"][0]["id"], False)
    elif key == "radio":
        env["radio_record_clear"](env["RADIO_BROADCASTS"][0]["id"], 0)
    elif key == "planetarium":
        env["planetarium_record_solve"]("s1", 1)
    elif key == "badges":
        for cdef in env["MAILBOX_CASE_DEFS"]:
            env["mailbox_record_case_clear"](cdef["id"], 0)
        env["badge_stamp"]("bd01", False)
    elif key == "library":
        env["library_record_solve"](2)
    elif key == "theater":
        env["theater_record_solve"](2)
    else:
        raise AssertionError(key)


def check_pc12_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 30 achievements (2x15), PC-12 pair appended after PC-11 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 30 and env["ach_grid_rows"]() == 15 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_theater_script", "ach_time_capsule", "ach_atelier_painting", "ach_message_wall"], ach_ids[-4:]
    assert "ach_atelier_painting" in mock_ach.registered and "ach_message_wall" in mock_ach.registered

    # ---- B. case data ----
    case, hotspots, links, tiers = env["ATELIER_CASE"], env["ATELIER_HOTSPOTS"], env["ATELIER_STROKE_LINKS"], env["ATELIER_RATING_TIERS"]
    assert case["label"] == "atelier_painting_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert case["code"] == "AT-01" and case["code"] not in ("T-01", "L-01", "TH-01")
    assert [h["id"] for h in hotspots] == [f"h{i}" for i in range(1, 7)]
    assert [k["name"] for k in links] == ["去向", "藏法", "动机", "执行人"]
    assert [k["step"] for k in links] == ["第一笔", "第二笔", "第三笔", "第四笔"]
    pig = {p["name"]: p["color"] for p in env["ATELIER_PIGMENTS"]}
    for k in links:
        assert pig[k["pigment"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
    assert len({k["color"] for k in links}) == 4, "Each stroke gets its own pigment"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金牌", "银牌", "铜牌"]
    older_tiers = {t["name"] for t in env["LIBRARY_RATING_TIERS"]} | {t["name"] for t in env["THEATER_RATING_TIERS"]}
    assert [t["name"] for t in tiers] == cf.GRADE_NAMES  # (PC-G2: one set of rating names for all eight cases)
    for h in hotspots:
        assert h["scene"] in env["BG_LIGHT"] and len(h["detail"]) >= 70 and h["evidence"] and h["surface"]
        assert env["EVIDENCE_DETAILS"][h["evidence"]] == (h["observer"], h["detail"]), f"{h['id']} flip detail not registered"
    assert len({h["evidence"] for h in hotspots}) == 6
    older_ev = {h["evidence"] for h in env["LIBRARY_HOTSPOTS"]} | {h["evidence"] for h in env["THEATER_HOTSPOTS"]}
    assert not older_ev & {h["evidence"] for h in hotspots}
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]

    # ---- C. script structure: 6 hotspots -> 4-stroke chain -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "atelier_case_investigate")
    for i in range(1, 7):
        assert f"if not _at_h{i}:" in inv and f'$ atelier_inspect_hotspot("h{i}")' in inv, f"hotspot h{i} not playable"
    assert inv.count("jump atelier_case_investigate") == 6 and "jump atelier_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"atelier_stroke_k{i}")
        assert f"show screen atelier_stroke_banner({i - 1}, " in kb
        assert kb.count("$ _at_mistakes += 1") == 2 and kb.count(f"jump atelier_stroke_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _at_strokes = {i}" in kb
        for m_wrong in re.finditer(r"\$ _at_mistakes \+= 1(.*?)jump atelier_stroke_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct stroke always at the same menu slot: {correct_positions}"
    assert correct_positions not in ([2, 1, 0, 2], [1, 0, 2, 1]), "Answer slots must not copy the PC-10 / PC-11 patterns"
    assert "call _atelier_finish_case(_at_mistakes)" in blk and "label atelier_case_resolution:" in blk
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the atelier case"
    assert "truth_spoiler_unlocked" not in blk, "The atelier case is fully public"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public atelier case"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"classroom", "storeroom", "corridor", "sunset", "agency"} <= scenes_used, scenes_used
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"alice", "mo", "lin", "zhang"} <= cast, cast
    assert not cast & {"sutang", "xiaoman"}, "Sprite-less newcomers must never be `show`n"
    defs_src = _read("game/definitions.rpy")
    module_defines = dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", src, re.M))
    assert module_defines == {"sutang": "苏棠", "xiaoman": "温小满"}, module_defines
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"lin", "zhang", "alice", "mo_note", "mc", "sutang", "xiaoman"} <= speakers, speakers
    _sprite_slots_ok(blk, "atelier_painting_case")
    # Ren'Py interpolates [...] in dialogue: only the intended replay-best substitution is allowed
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_at_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("atelier_painting_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "atelier_painting_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["atelier_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "atelier_painting_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "atelier"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "AT-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_atelier_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_at_h{i}"] is True for i in range(1, 7))
    assert env["_at_mistakes"] == 8 and env["_at_strokes"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {h["evidence"] for h in hotspots}
    assert env["atelier_get_record"]()["inspected"] == [f"h{i}" for i in range(1, 7)]
    assert env["atelier_inspect_hotspot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievement ----
    assert [env["atelier_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.atelier_painting_record = {}
    mp.message_wall_record = {}
    assert env["atelier_case_solved_count"]() == 0 and env["atelier_best_short"]() == "待结案"
    v0 = env["atelier_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["stroke_shorts"]) and not any(v0["stroke_fulls"])
    assert env["wall_card_status"]("w01") == "locked"
    r = env["atelier_record_solve"](5)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_atelier_painting") and not mock_ach.has("ach_theater_script")
    assert env["wall_card_status"]("w01") == "ready" and env["wall_card_status"]("w02") == "ready"
    assert env["wall_card_status"]("w11") == "locked", "W-11 needs the gold frame"
    r = env["atelier_record_solve"](2)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 2
    r = env["atelier_record_solve"](2)
    assert not r["new_record"] and r["replays"] == 3
    assert env["atelier_gold_count"]() == 0
    v = env["atelier_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["stroke_shorts"] == [k["short"] for k in links]
    env["atelier_open_report_modal"]()
    assert env["atelier_get_record"]()["report_viewed"] and any(s[0] == "atelier_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    assert env["library_case_solved_count"]() == 0 and env["theater_case_solved_count"]() == 0, "Older cases keep their own stores"

    # ---- F. accordion sub-bar helpers (14 tabs / 5 groups) ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if t not in SALON_KEYS or t in cf.CASE_TABS:
                continue  # later milestone's tab, or a short case (PC-G2: no pill of its own, it lives in the case file)
            txt = env["salon_tab_pill_text"](t)
            assert re.fullmatch(r"\S+ \d+/\d+", txt), f"pill text `{txt}`"
    for t, g in (("library", "closedlib"), ("theater", "closedlib"), ("atelier", "closedlib"),
                 ("album", "keepsake"), ("capsule", "keepsake"), ("wall", "keepsake")):
        assert env["salon_open_group"](t) == g
    assert env["salon_tab_pill_text"]("wall") == "寄语 0/12"
    assert env["salon_tab_icon"]("atelier").endswith("icon_art_room.png")
    assert env["salon_tab_icon"]("wall").endswith("icon_message_wall.png")
    saved_fn = env.pop("wall_pinned_count")
    assert env["salon_tab_pill_text"]("wall") == "寄语", "Pill text must degrade gracefully"
    env["wall_pinned_count"] = saved_fn
    mp.extras_salon_group = "keepsake"
    assert env["salon_open_group"]("endings") == "keepsake", "The new group is remembered like the others"
    mp.extras_salon_group = "salon"

    # ---- G. message wall: data ----
    cards = env["WALL_CARDS"]
    plabels = env["WALL_PHOTO_LABELS"]
    assert [c["id"] for c in cards] == [f"w{i:02d}" for i in range(1, 13)]
    assert [c["code"] for c in cards] == [f"W-{i:02d}" for i in range(1, 13)]
    core = {"艾丽丝", "墨墨", "陈默"}
    core_pairs = [(c["writer"], c["recipient"]) for c in cards[:6]]
    assert sorted(core_pairs) == sorted((a, b) for a in core for b in core if a != b), "Six cards: each core member writes to each other"
    assert [c["writer"] for c in cards[6:11]] == ["张子谦", "吕芙", "小林", "班长", "苏棠"]
    assert [c["id"] for c in cards if c["spoiler"]] == ["w01", "w02", "w05", "w06", "w12"]
    assert len({c["title"] for c in cards}) == 12
    for c in cards:
        assert c["progress_key"] == "wall" or c["progress_key"] in env["_WALL_PROGRESS_FNS"], c["id"]
        assert len(c["body"]) >= 50 and c["sign"] and c["condition"] and re.fullmatch(r"#[0-9a-f]{6}", c["pin"])
        if c["spoiler"]:
            assert len(c.get("body_secret", "")) >= 30
        else:
            assert "body_secret" not in c
        # a card that talks about the atelier solution may only become pinnable after the case is solved
        if any(tell in c["body"] for tell in ("衬布", "画背面", "软木塞", "温小满")):
            assert c["progress_key"] in ("atelier", "atelier_gold", "wall"), f"{c['id']} leaks the atelier solution early"
    for fn in env["_WALL_PROGRESS_FNS"].values():
        assert fn in env, f"Wall progress counter `{fn}` is not defined"
    assert [c["need"] for c in cards if c["progress_key"] == "album"] == [4, 8]
    assert [c["need"] for c in cards if c["progress_key"] == "capsule"] == [4, 8]
    assert [c for c in cards if c["progress_key"] == "wall"] == [cards[-1]] and cards[-1]["need"] == 11

    # ---- G2. message wall: pin flow (spoilers locked the whole way; every card earnable) ----
    for fld in ("mailbox_cases", "tea_party_records", "lexicon_read", "book_restoration_records", "seasonal_letter_records",
                "radio_booth_records", "origami_cabinet_records", "planetarium_records", "badge_journal_records"):
        setattr(mp, fld, [] if fld == "lexicon_read" else {})
    mp.closed_library_record = {}
    mp.photo_album_records = {}
    mp.theater_script_record = {}
    mp.time_capsule_record = {}
    mp.atelier_painting_record = {}
    mp.message_wall_record = {}
    mock_ach.granted.clear()
    assert mp.te_cleared is False and mp.truth_spoiler_confirmed is False
    assert all(env["wall_card_status"](c["id"]) == "locked" for c in cards), "Fresh wall must be fully locked"
    n_before = len(mock_renpy.notifications)
    assert env["wall_pin"]("w01") is None and len(mock_renpy.notifications) == n_before + 1
    assert env["wall_open_card"]("w01") is False
    assert not any(s[0] == "wall_card_modal" for s in mock_renpy.shown_screens)

    def _pin(cid, modal=False):
        before = env["wall_pinned_count"]()
        rec = env["wall_pin"](cid, modal)
        assert rec is not None and cid in rec["pinned"] and env["wall_pinned_count"]() == before + 1, cid
        assert env["wall_card_status"](cid) == "pinned"
        assert env["wall_pin"](cid, False)["pinned"].count(cid) == 1, "Pinning twice must stay idempotent"

    env["atelier_record_solve"](1)
    assert [c["id"] for c in cards if env["wall_card_status"](c["id"]) == "ready"] == ["w01", "w02"]
    _pin("w01", True)
    assert any(s[0] == "wall_card_modal" and s[2].get("card_id") == "w01" for s in mock_renpy.shown_screens)
    _pin("w02")
    assert env["wall_open_card"]("w02") is True and env["wall_get_record"]()["read"] == ["w01", "w02"]

    order = ["mailbox", "teaparty", "lexicon", "restoration", "letterbox", "origami", "radio", "planetarium", "badges",
             "library", "theater"]
    photo_of = {p["progress_key"]: p["id"] for p in env["ALBUM_PHOTOS"]}
    item_of = {c["progress_key"]: c["id"] for c in env["CAPSULE_ITEMS"]}
    for key in order:
        _first_completion(env, mp, key)
        if key in photo_of:
            assert env["album_develop"](photo_of[key], False) is not None
        assert env["capsule_place"](item_of[key]) is not None
        dev, placed = env["album_developed_count"](), env["capsule_placed_count"]()
        assert (env["wall_card_status"]("w03") != "locked") is (dev >= 4), (key, dev)
        assert (env["wall_card_status"]("w05") != "locked") is (dev >= 8), (key, dev)
        assert (env["wall_card_status"]("w04") != "locked") is (placed >= 4), (key, placed)
        assert (env["wall_card_status"]("w06") != "locked") is (placed >= 8), (key, placed)
        assert env["wall_card_status"]("w12") != "ready", "W-12 waits for the other eleven"
        for c in cards:
            if env["wall_card_status"](c["id"]) == "ready" and c["id"] not in ("w12",):
                _pin(c["id"])
    pinned_now = env["wall_get_record"]()["pinned"]
    assert set(pinned_now) == {"w01", "w02", "w03", "w04", "w05", "w06", "w07", "w08", "w09"}, pinned_now
    assert env["wall_card_status"]("w10") == "locked" and env["wall_card_status"]("w11") == "locked"
    env["theater_record_solve"](0)
    _pin("w10")
    env["atelier_record_solve"](0)
    _pin("w11")
    assert env["wall_card_status"]("w12") == "ready" and env["wall_progress"]("w12") == (11, 11)
    assert not mock_ach.has("ach_message_wall"), "Eleven cards must not grant the wall achievement"
    _pin("w12")
    assert env["wall_pinned_count"]() == 12 and mock_ach.has("ach_message_wall")
    assert env["wall_ready_count"]() == 0
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False

    # ---- H. photo labels read the PC-10 album / PC-11 capsule state without copying or writing it ----
    album_by_id = {p["id"]: p for p in env["ALBUM_PHOTOS"]}
    cap_by_id = {c["id"]: c for c in env["CAPSULE_ITEMS"]}
    assert [l["id"] for l in plabels] == [f"pl{i}" for i in range(1, 7)]
    assert len({l["photo_id"] for l in plabels}) == 6 and len({l["capsule_id"] for l in plabels}) == 6
    assert [l["id"] for l in plabels if l["spoiler"]] == ["pl3", "pl4", "pl6"]
    for l in plabels:
        p, c = album_by_id[l["photo_id"]], cap_by_id[l["capsule_id"]]
        assert p["tab"] == c["tab"], f"{l['id']}: photo and keepsake come from different activities"
        assert bool(l["spoiler"]) == bool(p["spoiler"]), f"{l['id']}: spoiler flag disagrees with its photo"
        blob = str(l)
        for copied in (p["title"], p["mo_caption"], p["alice_caption"], c["name"], c["mo_tag"], c["alice_tag"]):
            assert copied not in blob, f"{l['id']} duplicates PC-10/PC-11 copy: {copied[:16]}"
        if l["spoiler"]:
            assert l.get("label_secret")
        else:
            assert "label_secret" not in l
    for kw in ("ALBUM_PHOTOS", "CAPSULE_ITEMS"):
        assert f"{kw} =" not in src and f"{kw}.append" not in src, f"PC-12 must not redefine / extend {kw}"
    for store_name in ("photo_album_records", "time_capsule_record"):
        assert f"persistent.{store_name} =" not in src, f"PC-12 must never write persistent.{store_name}"
    album_snap = copy.deepcopy(mp.photo_album_records)
    cap_snap = copy.deepcopy(mp.time_capsule_record)
    # state now: ph01..ph10 developed except ph11/ph12; every capsule item 01..11 placed
    for l in plabels:
        pv = env["wall_render_photo_label"](l["id"])
        p = album_by_id[l["photo_id"]]
        assert pv["photo_title"] == p["title"] and pv["photo_code"] == p["code"] and pv["bg_thumb"] == p["bg_thumb"]
        assert pv["capsule_name"] == cap_by_id[l["capsule_id"]]["name"]
        assert pv["developed"] is env["album_get_record"](l["photo_id"])["developed"]
        assert pv["capsule_placed"] is (env["capsule_item_status"](l["capsule_id"]) == "placed")
        assert (pv["display_label"] == l["label"]) is pv["developed"] and (pv["display_label"] == "") is (not pv["developed"])
    assert env["wall_render_photo_label"]("pl6")["developed"] is False and env["wall_render_photo_label"]("pl6")["capsule_placed"] is False
    assert env["wall_labels_developed_count"]() == 5
    assert mp.photo_album_records == album_snap and mp.time_capsule_record == cap_snap, "Rendering labels wrote album/capsule state"
    # finish the album (ph11 gold bookmark, then the family photo) and the capsule; labels follow automatically
    env["library_record_solve"](0)
    for p in env["ALBUM_PHOTOS"]:
        if env["album_status"](p["id"]) == "earned":
            env["album_develop"](p["id"], False)
    assert env["album_developed_count"]() == 12
    for c in env["CAPSULE_ITEMS"]:
        if env["capsule_item_status"](c["id"]) == "earned":
            env["capsule_place"](c["id"])
    v6 = env["wall_render_photo_label"]("pl6")
    assert v6["developed"] and v6["capsule_placed"] and v6["display_label"] and env["wall_labels_developed_count"]() == 6
    album_snap = copy.deepcopy(mp.photo_album_records)
    cap_snap = copy.deepcopy(mp.time_capsule_record)
    for c in cards:
        env["wall_render_card"](c["id"])
        env["wall_select"](c["id"])
        env["wall_pin"](c["id"], False)
        env["wall_open_card"](c["id"])
    for l in plabels:
        env["wall_render_photo_label"](l["id"])
    assert mp.photo_album_records == album_snap and mp.time_capsule_record == cap_snap, "Wall actions wrote album/capsule state"
    # degrade gracefully when the older modules are absent
    saved = {k: env.pop(k) for k in ("album_get_def", "album_get_record", "capsule_get_def", "capsule_item_status")}
    dv = env["wall_render_photo_label"]("pl1")
    assert dv["developed"] is False and dv["display_label"] == "" and dv["photo_title"] == "" and dv["capsule_placed"] is False
    env.update(saved)

    # ---- I. zero-side-channel spoiler gate (strongest state: 12 cards pinned, 6 photos developed) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for k, val in view.items():
            if isinstance(val, str):
                for kw in SECRET_KEYWORDS:
                    assert kw not in val, f"Spoiler keyword `{kw}` leaked in {where}.{k}"

    for c in cards:
        v = env["wall_render_card"](c["id"])
        _clean(v, c["id"])
        assert v["pinned"] is True and v["display_body"] == c["body"] and v["display_secret"] == ""
        if c["spoiler"]:
            assert v["unlocked"] is False and v["display_masked_notice"] == env["WALL_SPOILER_NOTICE"]
        else:
            assert v["unlocked"] is True and v["display_masked_notice"] == ""
    for l in plabels:
        v = env["wall_render_photo_label"](l["id"])
        _clean(v, l["id"])
        assert v["developed"] and v["display_secret"] == ""
        assert v["display_masked_notice"] == (env["WALL_LABEL_MASK_NOTICE"] if l["spoiler"] else "")
    for notice in (env["WALL_SPOILER_NOTICE"], env["WALL_LABEL_MASK_NOTICE"]):
        assert not any(kw in notice for kw in SECRET_KEYWORDS)
    for c in cards:
        for k in ("writer", "recipient", "title", "source", "condition", "body", "sign"):
            for kw in SECRET_KEYWORDS:
                assert kw not in c[k], f"`{kw}` in public card field {c['id']}.{k}"
    for l in plabels:
        for kw in SECRET_KEYWORDS:
            assert kw not in l["label"] and kw not in l["writer"], f"`{kw}` in public label {l['id']}"
    at_public = [blk, str(case)] + [str(h) for h in hotspots] + [str(k) for k in links]
    for text in at_public:
        for kw in SECRET_KEYWORDS:
            assert kw not in text, f"`{kw}` appears in the public atelier case"
    _clean(env["atelier_render_view"](), "atelier")
    secret_blob = "".join(c.get("body_secret", "") for c in cards) + "".join(l.get("label_secret", "") for l in plabels)
    assert sum(1 for kw in SECRET_KEYWORDS if kw in secret_blob) >= 4, "Secrets should really be the endgame material"

    saved_cards = {c["id"]: copy.deepcopy(c) for c in cards}
    saved_labels = {l["id"]: copy.deepcopy(l) for l in plabels}
    before_c = {c["id"]: env["wall_render_card"](c["id"]) for c in cards}
    before_l = {l["id"]: env["wall_render_photo_label"](l["id"]) for l in plabels}
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}"):
        for c in cards:
            if c["spoiler"]:
                c["body_secret"] = filler + "续"
        for l in plabels:
            if l["spoiler"]:
                l["label_secret"] = filler[::-1] + "Z"
        for c in cards:
            assert env["wall_render_card"](c["id"]) == before_c[c["id"]], f"Locked {c['id']} view depends on secret text"
            proofs += 1
        for l in plabels:
            assert env["wall_render_photo_label"](l["id"]) == before_l[l["id"]], f"Locked {l['id']} view depends on secret text"
            proofs += 1
    for c in cards:
        cid = c["id"]
        c.clear()
        c.update(saved_cards[cid])
    for l in plabels:
        lid = l["id"]
        l.clear()
        l.update(saved_labels[lid])
    assert [c["id"] for c in cards] == [f"w{i:02d}" for i in range(1, 13)] and [l["id"] for l in plabels] == [f"pl{i}" for i in range(1, 7)]
    assert all(c == saved_cards[c["id"]] for c in cards) and all(l == saved_labels[l["id"]] for l in plabels)
    # unpinned spoiler card / undeveloped photo shows nothing secret even when unlocked
    wall_snap = copy.deepcopy(mp.message_wall_record)
    album_full = copy.deepcopy(mp.photo_album_records)
    mp.message_wall_record = {}
    mp.photo_album_records = {}
    mp.te_cleared = True
    for c in cards:
        v = env["wall_render_card"](c["id"])
        assert v["display_secret"] == "" and v["display_body"] == "" and v["display_sign"] == "", "Unpinned card must stay blank"
    for l in plabels:
        v = env["wall_render_photo_label"](l["id"])
        assert v["display_secret"] == "" and v["display_label"] == "", "Undeveloped photo label must stay blank"
    # unlock -> secrets appear on pinned cards / developed photos only
    mp.message_wall_record = {"pinned": ["w01", "w03", "w06"], "read": []}
    mp.photo_album_records = {"ph08": {"developed": True, "develop_count": 1, "viewed": True}}
    v1 = env["wall_render_card"]("w01")
    assert v1["unlocked"] and "小雪" in v1["display_secret"] and v1["display_masked_notice"] == ""
    assert "小可" in env["wall_render_card"]("w06")["display_secret"]
    assert env["wall_render_card"]("w03")["display_secret"] == "" and env["wall_render_card"]("w02")["display_secret"] == ""
    assert "周可" in env["wall_render_photo_label"]("pl4")["display_secret"]
    assert env["wall_render_photo_label"]("pl3")["display_secret"] == "", "pl3's photo is not developed"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["wall_render_card"]("w06")["display_secret"] and env["wall_render_photo_label"]("pl4")["display_secret"]
    mp.truth_spoiler_confirmed = False
    mp.message_wall_record = wall_snap
    mp.photo_album_records = album_full

    # ---- J. reset_all_progress clears PC-12 state and leaves main-story vars alone ----
    mp.atelier_selected_hotspot = "h5"
    mp.wall_selected_card = "w09"
    mp.extras_salon_group = "keepsake"
    env["reset_all_progress"]()
    assert env["atelier_case_solved_count"]() == 0 and env["wall_pinned_count"]() == 0
    assert mp.atelier_painting_record == {} and mp.message_wall_record == {}
    assert mp.atelier_selected_hotspot == "h1" and mp.wall_selected_card == "w01" and mp.extras_salon_group == "salon"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50

    card_pub_cjk = sum(_cjk(c["body"] + c["sign"] + c["title"]) for c in cards)
    card_sec_cjk = sum(_cjk(c.get("body_secret", "")) for c in cards)
    label_cjk = sum(_cjk(l["label"] + l.get("label_secret", "")) for l in plabels)
    data_cjk = _cjk(str(case)) + sum(_cjk(str(h)) for h in hotspots) + sum(_cjk(str(k)) for k in links)
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "WallCardCJK": card_pub_cjk,
                       "WallSecretCJK": card_sec_cjk, "PhotoLabelCJK": label_cjk,
                       "CorrectSlots": [c + 1 for c in correct_positions], "SideChannelProofs": proofs})
    print(f"[PASS] PC-12 runtime: art-room case (script CJK={cjk_case}, data CJK={data_cjk}, 6 hotspots -> 4-stroke chain, "
          f"correct slots {[c + 1 for c in correct_positions]}, 8 gentle loops, fail_count untouched) | gold/silver/bronze "
          f"frames + best-record replay ladder + ach_atelier_painting | 12-card message wall (public CJK={card_pub_cjk}, "
          f"secret CJK={card_sec_cjk}) pinned via atelier/album/capsule/mailbox/theater/library progress -> ach_message_wall | "
          f"6 photo labels (CJK={label_cjk}) reading PC-10 album + PC-11 capsule state read-only | 30 achievements (2x15) | "
          f"zero-leak spoiler gate + 4-way side-channel proof ({proofs} renders byte-identical)")
    return cjk_case, card_pub_cjk, label_cjk


################################################################################
# 4. Zero intrusion, icons, text safety
################################################################################

def check_zero_intrusion_and_icons():
    res = subprocess.run(["git", "status", "--porcelain", "--", *rs.strict_files(MAIN_STORY_FILES), *cf.unchanged_modules(READ_ONLY_MODULES)],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay / PC-10 / PC-11 modules were modified!\n{res.stdout}"
    diff = subprocess.run(["git", "diff", "--numstat", "--", *rs.strict_files(MAIN_STORY_FILES), *cf.unchanged_modules(READ_ONLY_MODULES)],
                          cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert diff.stdout.strip() == "", "Main story / read-only module files have a diff"
    cf.check_story_frozen()  # (the modules the release touches keep their stories)

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC12_TOUCHED_FILES if p != NEW_MODULE]],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    added = 0
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"
    # `added` is 0 on a clean checkout once PC-12 is committed; only the added-line content is checked here.

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw, "PC-12 module must use LF line endings like its siblings"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every data-driven text that prints case / card / label copy opts out of interpolation
    for ln in new_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|ATELIER_CASE|h_obj|c_obj|l_obj|_ah|_wv|_cm|_lv|_mv|_rv)\["[a-z_]+"\]', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\["[a-z_]+"\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"PC-10 / PC-11 modules byte-identical), no Emoji/SVG/tabs/CRLF, {n_str} interpolation-safe CJK data strings")

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
            if rel_icon in PC12_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-12 set: {', '.join(Path(x).name for x in PC12_UI_ICONS)}")


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

    for img in ("ui_icon_art_room", "ui_icon_missing_painting", "ui_icon_message_wall", "ui_icon_graduation_card"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_atelier_painting", "atelier_report_modal", "atelier_stroke_banner", "atelier_result_card",
                "extras_message_wall", "wall_card_modal", "extras_achievements", "deduction_cutin", "evidence_book", "confirm",
                "extras_photo_album", "extras_time_capsule"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("atelier_painting_case", "atelier_case_investigate", "atelier_case_review_intro", "atelier_stroke_k1",
                "atelier_stroke_k2", "atelier_stroke_k3", "atelier_stroke_k4", "atelier_case_resolution",
                "_atelier_init_sandbox", "_atelier_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    for t in ("atelier_easel_sway", "wall_pin_wobble"):
        assert t in transforms
    # tinted panels are the page's visual identity: they must wrap a real Frame and use only Ren'Py matrix helpers
    tinted = re.findall(r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)", new_src)
    assert len(tinted) == 5 and all((GAME_DIR / g).is_file() for g in tinted), tinted

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC12_TOUCHED_FILES:
        lines = _read(rel).splitlines()
        for i, ln in enumerate(lines):
            assert "\t" not in ln, f"Tab in {rel}:{i + 1}"
            if (m := style_prop_re.match(ln)):
                assert m.group(1) in styles, f"Undefined style `{m.group(1)}` at {rel}:{i + 1}"
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
    for icon in PC12_UI_ICONS:
        assert icon in refs, f"PC-12 icon {icon} is not wired into any .rpy"
    audio_src = _read("game/audio.rpy")
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", audio_src), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", audio_src), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd

    extra_src = _read("game/extra.rpy")
    assert '"atelier_painting_case":' in extra_src
    assert extra_src.count("or name in _ATELIER_CASE_LABELS") == 2
    assert extra_src.count("or name in _THEATER_CASE_LABELS") == 2, "PC-11 callback wiring must stay intact"
    assert extra_src.count("or name in _CLOSED_LIBRARY_LABELS") == 2, "PC-10 callback wiring must stay intact"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("atelier_painting_record", "atelier_selected_hotspot", "message_wall_record", "wall_selected_card"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld
    scr_src = _read("game/screens.rpy")
    # (PC-G2: the case opens from the data-driven case file)
    assert '("atelier",' in extra_src.split("CASEFILE_CASES = [", 1)[1].split("\n    ]", 1)[0]
    assert 'SetField(persistent, "extras_tab", "wall")' in scr_src
    assert "wall_pinned_count()" in scr_src

    for rel in PC12_TOUCHED_FILES:
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
    pc12_shots = ("ui_12a_atelier_unsolved.png", "ui_12b_atelier_gold.png", "ui_12c_atelier_report.png",
                  "ui_12d_atelier_stroke_banner.png", "ui_12e_atelier_result_card.png", "ui_12f_wall_masked.png",
                  "ui_12g_wall_unmasked.png", "ui_12h_wall_card_modal.png")
    for shot in pc12_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_at_rec")
    pc12_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc12_seg.index(s) for s in pc12_shots] == sorted(pc12_seg.index(s) for s in pc12_shots), "PC-12 shots out of order"
    assert shots.index("ui_11h_capsule_letter_modal.png") < start, "PC-12 audit must run after the PC-11 block"
    for bad in ("ach_grant", "wall_pin(", "wall_open_card(", "atelier_record_solve(", "capsule_place(", "capsule_seal(",
                "album_develop(", "theater_record_solve(", "library_record_solve("):
        assert bad not in pc12_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("atelier_painting_record", "atelier_selected_hotspot", "message_wall_record", "wall_selected_card",
                "photo_album_records", "time_capsule_record", "planetarium_records", "extras_salon_group",
                "te_cleared", "truth_spoiler_confirmed"):
        assert f"persistent.{fld} = _saved_" in pc12_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-12 coverage ({len(pc12_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc12_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC12_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC12_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
