#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-11 Static, Behavioral, Pixel-Budget, Rainy-Theater Missing-Script Case (replayable, rated),
Detective Club Semester Time Capsule + Letters to the Future, Spoiler-Gate (side-channel proof),
Salon Accordion Sub-Bar (12 tabs / 4 groups), Asset & Zero-Intrusion Verifier for
《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's
init-python blocks inside the same mocked sandbox verify_pc10.py uses, plus the PC-11 module.
"""

import ast
import copy
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageFont

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
NEW_MODULE = "game/wings_theater_capsule.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402

extract_python_blocks = pc8.extract_python_blocks
_paren_delta = pc8._paren_delta
_w = pc9._w
_style_prop = pc9._style_prop
_cjk = pc9._cjk
_wb = pc10._wb
_read = pc10._read
_label_block = pc10._label_block
_sprite_slots_ok = pc10._sprite_slots_ok

PC11_UI_ICONS = [
    "images/ui/icon_theater_backstage.png",
    "images/ui/icon_missing_script.png",
    "images/ui/icon_time_capsule.png",
    "images/ui/icon_future_letter.png",
]

REQUIRED_UI_ICONS = pc10.REQUIRED_UI_ICONS + PC11_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC11_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", ("library", "theater", "album", "capsule")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

CJK_LINE = pc10.CJK_LINE

LOG_REPORT = {}

# Forward compatibility (PC-12+): later modules initialise after this one and legitimately add a 5th salon group
# (splitting "雨夜与纪念"), a 5th main-menu chip row and achievements 29-30. Those exact counts / widths are
# verified by their own milestone (verify_pc12); here the PC-11 contract is kept: its tabs, chips and module order.
LATER_MODULES = ["yearbook_atelier_wall.rpy", "zephyr_relay_casebook.rpy",  # PC-12, PC-13 (each adds one chip row)
                 "zoetrope_shadow_folio.rpy",  # PC-14 (merges the extra-story chips into one folio entry)
                 "zubenelgenubi_meteor_casebook.rpy",  # PC-15 (re-flows the 4 chip rows clear of the navigation column)
                 "zwembad_locker_casebook.rpy",  # PC-16 (7th short case, folio only; no chip row, no chip added)
                 "zymase_bakeoff_casebook.rpy"]  # PC-17 (8th short case, folio only; no chip row, no chip added)


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
    sf = {s: ImageFont.truetype(str(serif), s) for s in (13, 14, 17, 18, 19, 20, 21, 38, 40, 84)}
    return f, sf


def _line_h(font):
    asc, desc = font.getmetrics()
    return asc + desc


################################################################################
# 0. Sandbox (PC-10 sandbox + PC-11 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc10._sandbox_env()
    for k, v in {
        "theater_script_record": {}, "theater_selected_hotspot": "h1", "time_capsule_record": {},
        "capsule_selected_item": "c01",
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
    assert len(rpy_files) >= 29, f"Expected >=29 .rpy files (including wings_theater_capsule.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-11 module must initialise after vanished_shelf_album.rpy so its 2 achievements append last
    assert names.index("wings_theater_capsule.rpy") > names.index("vanished_shelf_album.rpy")
    later = _later_present()
    assert names[len(names) - 1 - len(later)] == "wings_theater_capsule.rpy", (
        f"PC-11 module must initialise after every older top-level module: {names[-3:]}")
    assert names[len(names) - len(later):] == sorted(later), f"Only later milestones may follow PC-11: {names[-3:]}"

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
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements); PC-11 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def _main_menu_metrics(f, sf, scr_src):
    """Vertical stack of the main-menu title column (vbox yalign 0.29) and the row widths."""
    blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    blk = blk.split('style "main_menu_vbox"', 1)[1]
    # (PC-15+ nests the rows in one shifted wrapper vbox with a tighter spacing: count the row headers at any depth)
    chip_rows = len(re.findall(r"^(?P<ind> +)hbox:\n(?P=ind)    xalign 0\.5\n(?:(?P=ind)    xoffset -?\d+\n)?(?P=ind)    spacing \d+\n",
                               blk, re.M))
    nulls = [int(n) for n in re.findall(r"^ +null height (\d+)$", blk, re.M)]
    assert chip_rows == (4 if _folio_merged() else 4 + len(_later_present())), f"Unexpected cozy-chip row count {chip_rows}"
    # element heights (Ren'Py text box = ascent + descent of the face, plus 2 x widest outline)
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
    return {"stack": stack, "top": round(top), "bottom": round(bottom), "badge_top": badge_top, "chip_rows": chip_rows}


def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    bs_src = _read("game/bookstreet_seasons.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-11 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_SALON_TABS", ["teaparty", "lexicon"]), ("EXTRAS_BOOKSTREET_TABS", ["restoration", "letterbox"]),
                       ("EXTRAS_RADIO_ORIGAMI_TABS", ["radio", "origami"]), ("EXTRAS_STARLIT_TABS", ["planetarium", "badges"]),
                       ("EXTRAS_CLOSED_LIBRARY_TABS", ["library", "album"]),
                       ("EXTRAS_THEATER_CAPSULE_TABS", ["theater", "capsule"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 12 tabs in the same 4 groups, each exactly once; EVERY open state <= 702px
    #     (PC-12+ regroups the 4th group into two once it would overflow: the 12 PC-11 tabs must all stay, each once,
    #      the first three groups untouched, library + theater still together in "closedlib")
    sb = pc10.measure_salon_subbar()
    if _later_present():
        assert len(sb["keys"]) == len(set(sb["keys"])) and set(SALON_KEYS) <= set(sb["keys"]), sb["keys"]
        # (PC-16 appends the meteor-night tab to the 3rd group "starlit": each of the first three PC-11 groups keeps its
        #  key and its PC-11 tabs first, in order)
        for (gk, gt), g in zip(SALON_GROUPS_EXPECTED[:3], sb["groups"][:3]):
            assert g[0] == gk and tuple(g[3])[:len(gt)] == gt, sb["groups"]
        closedlib_tabs = [tuple(g[3]) for g in sb["groups"] if g[0] == "closedlib"][0]
        assert closedlib_tabs[:2] == ("library", "theater"), closedlib_tabs
    else:
        assert [(g[0], tuple(g[3])) for g in sb["groups"]] == SALON_GROUPS_EXPECTED, sb["groups"]
        assert len(sb["keys"]) == len(set(sb["keys"])) == 12
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    if not _later_present():
        closedlib_label = [g[1] for g in sb["groups"] if g[0] == "closedlib"][0]
        assert closedlib_label == "雨夜与纪念", closedlib_label
    report["SubBarWorst"] = sb["worst"]
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    assert sb["totals"]["theater"] == 1 and sb["totals"]["capsule"] == 12

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)
    avail = 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert sub_px <= avail and "侦探社沙龙" in sub
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "theater_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694

    # ---------------- theater page ----------------
    case = env["THEATER_CASE"]
    hotspots = env["THEATER_HOTSPOTS"]
    acts = env["THEATER_ACT_LINKS"]
    tiers = env["THEATER_RATING_TIERS"]
    clue_w = int(_style_prop(bs_src, "restoration_clue_card", "xsize"))
    assert "grid 3 2:" in new_src and len(hotspots) == 6
    assert 3 * clue_w + 2 * 8 == console_inner, "Hotspot 3x2 grid must equal 694px"
    widest_hot = 0
    for h in hotspots:
        line = _wb(f[11], f"{h['code']} · {h['label']}") + 4 + _wb(f[10], "已勘查")
        widest_hot = max(widest_hot, line)
        assert line <= clue_w - 16, f"Hotspot label `{h['label']}` overflows: {line}px"
    report["TheaterHotspotLabel"] = widest_hot
    slot_w = int(_style_prop(new_src, "theater_act_slot", "xsize"))
    assert 4 * slot_w + 3 * 8 <= console_inner, "Act slots overflow"
    for k in acts:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Act short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    tier_w = int(_style_prop(new_src, "theater_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "票根评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"

    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    hdr = 36 + 10 + 398 + hdr_right
    assert hdr <= console_inner, f"Theater header overflows: {hdr}px"
    assert _w(sf[19], "雨夜剧场后台的失踪剧本") <= 398
    for s in ("已结案 · 推理四幕全部演完 · 可随时重返后台冲击金票根", "彩排前四十分钟，全社唯一的导演本不见了 · 六处后台等你勘查"):
        assert _w(f[12], s) <= 398, f"Theater header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Theater time-tag line overflows 492px: {tag_line}px"
    lamp = 15 + 6 + _w(f[12], "后台光影：" + case["lighting_note"])
    assert lamp <= 492, f"Theater lighting line overflows: {lamp}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 六处后台全勘查）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再推开礼堂的侧门）")
    assert arch_solved <= 492 and arch_open <= 492, f"Theater archive line overflows: {arch_solved}/{arch_open}px"
    report["TheaterTagLine"] = tag_line
    report["TheaterArchive"] = max(arch_solved, arch_open)
    th_footer = (_w(f[12], "零失误演完推理四幕可获金票根 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
                 + 8 + max(146, _w(f[15], "重返雨夜后台") + 36, _w(f[15], "推开礼堂侧门") + 36))
    assert th_footer <= console_inner, f"Theater footer overflows: {th_footer}px"
    report["TheaterFooter"] = th_footer
    quick = (20 + 10 + _w(sf[14], "时间胶囊 · C-11 彩排夜的票根") + 10 + _w(f[12], "（结案后留下）")
             + 8 + max(84, _w(f[13], "打开胶囊") + 22))
    assert quick <= 722 - 24, f"Theater quick row overflows: {quick}px"
    report["TheaterQuickRow"] = quick

    # in-scene act banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "theater_banner_slot", "xsize"))
    assert 4 * banner_slot + 3 * 6 <= 728
    for k in acts:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "雨夜剧场 · 推理四幕") + 8 + _w(f[11], "已演完 4/4 幕 · 失误只计入本案票根评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen theater_act_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    report["ActBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 608 - 28 = 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "雨夜剧场结案 · TH-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    widest_result = 0
    for s in ["本局失误 99 次（只计入雨夜剧场评级，不影响主线）",
              "首次结案 · 推理四幕已写入鉴赏室「雨夜剧场」分页，C-11 纪念物可以放进胶囊了",
              "重玩挑战 · 刷新个人纪录！这一场比以往任何一次都更少走错台位",
              "重玩挑战 · 再次以金票根谢幕，雨夜剧场名侦探实至名归",
              "重玩挑战 · 零失误演完推理四幕，就能把金票根夹进笔记本"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"TH-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重返雨夜后台") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- time-capsule page ----------------
    items = env["CAPSULE_ITEMS"]
    letters = env["CAPSULE_LETTERS"]
    card_w = int(_style_prop(new_src, "capsule_item_card", "xsize"))
    card_h = int(_style_prop(new_src, "capsule_item_card", "ysize"))
    card_pad = int(_style_prop(new_src, "capsule_item_card", "padding").strip("()").split(",")[0])
    well = int(_style_prop(new_src, "capsule_icon_well", "xsize"))
    assert "grid 3 ((len(CAPSULE_ITEMS) + 2) // 3):" in new_src and len(items) == 12
    assert 3 * card_w + 2 * 10 == 722, "Capsule 3-column grid must equal 722px"
    text_col = card_w - 2 * card_pad - well - 8
    assert "xsize 166" in new_src and text_col >= 166, f"Capsule card text column {text_col}px"
    stack = round(11 * CJK_LINE) + 2 + round(13 * CJK_LINE)
    assert max(well, stack) <= card_h - 12, f"Capsule card content too tall: {max(well, stack)}px"
    widest_card = 0
    for c in items:
        line1 = _wb(f[11], f"{c['code']} · {c['source']}") + 4 + _wb(f[10], "已放入")
        name = _w(sf[13], c["name"])
        widest_card = max(widest_card, line1, name)
        assert line1 <= 166, f"Capsule card head `{c['source']}` overflows: {line1}px"
        assert name <= 166, f"Capsule item name `{c['name']}` overflows: {name}px"
    report["CapsuleCardText"] = widest_card
    gauge = 12 * 16 + 11 * 3 + 12 + _w(f[11], "可放入 12 · 已放入 12 · 首次完成对应玩法即可留下纪念物")
    assert gauge <= 702, f"Capsule gauge bar overflows: {gauge}px"
    report["CapsuleGauge"] = gauge
    cap_hdr = 36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "已放入 12/12") + 20) + 6 + max(84, _w(f[13], "恢复遮罩") + 22)
    assert cap_hdr <= console_inner, f"Capsule header overflows: {cap_hdr}px"
    for s in ("胶囊已封存 · 约定一年后的今天，三个人一起打开。", "TRUE END 已通关 · 胶囊标签与信末的续笔已全部显影。",
              "已手动开启剧透许可 · 标签与信末的真约续笔当前可见。", "收好每项玩法留下的纪念物 · 涉终章的续笔已由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Capsule header line wraps ({_w(f[12], s)}px): {s}"
    big_well = int(_style_prop(new_src, "capsule_icon_well_big", "xsize"))
    det_head = big_well + 14 + 470 + max(96, _w(f[11], "已在胶囊里") + 20)
    assert det_head <= console_inner, f"Capsule detail header overflows: {det_head}px"
    widest_detail = 0
    for c in items:
        for s in (f"留下它的玩法：{c['source']}", f"放入条件：{c['condition']}（当前 {c['need']}/{c['need']}）"):
            widest_detail = max(widest_detail, _w(f[12], s))
            assert _w(f[12], s) <= 470, f"Capsule detail line wraps ({_w(f[12], s)}px): {s}"
        assert 86 + 6 + _w(sf[18], f"《{c['name']}》") <= 470, c["name"]
    report["CapsuleDetail"] = widest_detail
    cap_foot = (_w(f[12], "每一件纪念物都来自鉴赏室里的一项玩法") + 10
                + max(max(84, _w(f[13], "前往" + c["source"]) + 22) for c in items) + 8
                + max(146, _w(f[15], "已在胶囊里") + 36))
    assert cap_foot <= console_inner, f"Capsule footer overflows: {cap_foot}px"
    report["CapsuleFooter"] = cap_foot
    lt_head = 18 + 6 + _w(sf[13], "写给一年后的信 · 放入足够的纪念物后，就能拆开墨墨与艾丽丝留下的信")
    assert lt_head <= console_inner, f"Letters header overflows: {lt_head}px"
    lt_w = int(_style_prop(new_src, "capsule_letter_card", "xsize"))
    lt_pad = int(_style_prop(new_src, "capsule_letter_card", "padding").strip("()").split(",")[0])
    assert 2 * lt_w + 12 == console_inner, "Two letter cards must fill 694px"
    widest_letter = 0
    for lt in letters:
        status_w = max(_w(f[11], f"{lt['author']} · 已拆阅，可随时重读"), _w(f[11], f"{lt['author']} · 可以拆阅了"),
                       _w(f[11], f"{lt['author']} · 放入 {lt['need']} 件后可拆阅"))
        body_w = max(_w(sf[14], f"《{lt['title']}》"), status_w)
        row = 34 + 8 + body_w + 8 + max(84, _w(f[13], "重读") + 22)
        widest_letter = max(widest_letter, row)
        assert row <= lt_w - 2 * lt_pad, f"Letter card `{lt['title']}` overflows: {row}px"
    report["LetterCard"] = widest_letter
    seal_row = 20 + 10 + max(_w(sf[14], "已封存 · 封蜡上写着「一年后的今天」 · 封存 99 次"),
                             _w(sf[14], "放满十二件即可封存 · 还差 12 件")) + 10 + max(84, _w(f[13], "封存时间胶囊") + 22)
    assert seal_row <= 722 - 24, f"Seal row overflows: {seal_row}px"
    report["SealRow"] = seal_row
    lm_head = 40 + 12 + max(_w(sf[20], f"{lt['code']} · 《{lt['title']}》") for lt in letters) + 10 + 28 + 6 + _wb(f[13], "已放入 12/12")
    assert lm_head <= 692, f"Letter modal header overflows: {lm_head}px"
    for lt in letters:
        assert _w(f[12], f"执笔：{lt['author']} · 放入 {lt['need']} 件纪念物后拆阅") <= 692 - 52 - 120
        assert _w(f[13], lt["sign"]) <= 672
    lm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上信笺") + 10 + max(84, _w(f[13], "手动解锁剧透") + 22)
               + 8 + max(138, _w(f[14], "合上信笺") + 36))
    assert lm_foot <= 692, f"Letter modal footer overflows: {lm_foot}px"
    # the letter viewport (300px) must fit the longest unlocked letter without being a wall of text
    for lt in letters:
        lines_body = -(-_w(sf[14], lt["body_pub"]) // 672)
        lines_sec = -(-_w(f[13], lt["body_secret"]) // 672)
        h = lines_body * (_line_h(sf[14]) + 6) + 8 + _line_h(f[13]) + 8 + 1 + 8 + lines_sec * (_line_h(f[13]) + 4)
        assert h <= 300 + 60, f"Letter {lt['id']} far taller than its viewport: {h}px"

    # ---------------- main menu: 4th cozy row (2 chips), narrower than row 2, clear of the progress badge ----------------
    # PC-12 / PC-13 each append a centred row of 2 chips (verified by verify_pc12 / verify_pc13);
    # PC-14 merges the extra-story chips into one "番外卷宗" folio entry: 4 rows, 13 cozy chips + 1 folio chip
    nav_right = 60 + 280
    if _folio_merged():
        # The PC-11 contract still holds in the merged menu: the time capsule stays a direct chip, the rainy theater is a
        # folio card one click away, every row stays within row 2's width, 2-chip rows clear the navigation column and
        # the column clears the progress badge (geometry parsed from screens.rpy by verify_pc14's shared measurer).
        import verify_pc14 as pc14
        assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
        assert "at main_title_in(0.80)" in scr_src
        mmm = pc14.measure_main_menu()
        assert "capsule" in mmm["chips"] and "theater" in mmm["folio_tabs"] and "theater" not in mmm["chips"]
        # (PC-15 re-flows the chips into 4 + 3 + 3 + 4 rows: the reference becomes the wider of rows 1-2 and EVERY row,
        #  not only the 2-chip ones, must clear the navigation column -- measured at the rows' real offset)
        ref_w = max(mmm["row_w"][:2]) if _rows_reflowed() else mmm["row_w"][1]
        for i, w in enumerate(mmm["row_w"]):
            assert w <= 760 and (i < 2 or w <= ref_w), f"Main menu row {i + 1} ({w}px) wider than the reference row"
            if len(mmm["rows"][i]) <= 2 or _rows_reflowed():
                assert mmm["left"][i] > nav_right, f"Row {i + 1} ({mmm['left'][i]:.0f}px) collides with the navigation column"
        mm = _main_menu_metrics(f, sf, scr_src)
        assert (mm["top"], mm["bottom"]) == (mmm["top"], mmm["bottom"]), (mm, mmm)
        row4_w, row2_w = mmm["row_w"][3], mmm["row_w"][1]
    else:
        expected_chips = 14 + 2 * len(_later_present())
        assert scr_src.count('style "main_menu_cozy_chip"') == expected_chips, f"Expected {expected_chips} main-menu cozy chips"
        assert "at main_title_in(0.80)" in scr_src
        best_names = [t["name"] for t in tiers] + ["待结案"]
        row4 = [max(18 + 6 + _w(f[13], f"雨夜剧场 ({b})") + 24 for b in best_names), 18 + 6 + _w(f[13], "时间胶囊 (12/12)") + 24]
        row4_w = sum(row4) + 10
        row2_w = sum(18 + 6 + _w(f[13], t) + 24 for t in ("古籍修复台 (3/3)", "四季信笺匣 (4/4)", "旧广播电台 (3/3)", "千纸鹤陈列柜 (12/12)")) + 30
        assert row4_w < row2_w <= 760, f"Main menu row 4 ({row4_w}px) not narrower than row 2 ({row2_w}px)"
        row4_left = 568 - row4_w / 2
        assert row4_left > nav_right, f"Row 4 ({row4_left:.0f}px) collides with the navigation column (<= {nav_right}px)"
        mm = _main_menu_metrics(f, sf, scr_src)
    assert mm["bottom"] + 12 <= mm["badge_top"], f"Main-menu column bottom {mm['bottom']}px too close to badge top {mm['badge_top']}px"
    assert mm["top"] >= 20, f"Main-menu column top {mm['top']}px too close to the window edge"
    report["MainMenuRow4"] = row4_w
    report["MainMenuRow2"] = row2_w
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']})"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    # PC-12 extends the symmetric grid to 2x15 = 30 (verified by verify_pc12); PC-11's 28 must be the state before it
    n_ach = 28 + 2 * len(_later_present())  # PC-12 -> 2x15 = 30, PC-13 -> 2x16 = 32, PC-14 -> 2x17 = 34 (own milestones)
    grid_txt = (f"2×{n_ach // 2} = {n_ach}", f"2×{n_ach // 2} 共 {n_ach} 枚")
    assert "grid 2 ach_grid_rows():" in ach_src and grid_txt[0] in ach_src and grid_txt[1] in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_theater_script", "ach_time_capsule"):
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
# 3. Sandbox runtime: case, rating, capsule, letters, spoiler gate
################################################################################

def _case_block(src):
    m = re.search(r"^label rainy_theater_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label rainy_theater_case"
    return m.group(1)


def check_pc11_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 28 achievements (2x14), PC-11 pair appended after PC-10 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 28 and env["ach_grid_rows"]() == 14 and len(ach_ids) % 2 == 0
    assert ach_ids[-4:] == ["ach_closed_library", "ach_photo_album", "ach_theater_script", "ach_time_capsule"], ach_ids[-4:]
    assert "ach_theater_script" in mock_ach.registered and "ach_time_capsule" in mock_ach.registered

    # ---- B. case data ----
    case, hotspots, acts, tiers = env["THEATER_CASE"], env["THEATER_HOTSPOTS"], env["THEATER_ACT_LINKS"], env["THEATER_RATING_TIERS"]
    assert case["label"] == "rainy_theater_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert case["code"] == "TH-01" and case["code"] not in ("T-01", "L-01")
    assert [h["id"] for h in hotspots] == [f"h{i}" for i in range(1, 7)]
    assert [k["name"] for k in acts] == ["时刻", "去向", "动机", "执行人"]
    assert [k["step"] for k in acts] == ["第一幕", "第二幕", "第三幕", "第四幕"]
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金票根", "银票根", "铜票根"]
    lib_tiers = [t["name"] for t in env["LIBRARY_RATING_TIERS"]]
    assert not set(lib_tiers) & {t["name"] for t in tiers}, "Theater rating must not reuse the library bookmarks"
    for h in hotspots:
        assert h["scene"] in env["BG_LIGHT"] and len(h["detail"]) >= 70 and h["evidence"] and h["surface"]
        assert env["EVIDENCE_DETAILS"][h["evidence"]] == (h["observer"], h["detail"]), f"{h['id']} flip detail not registered"
    assert len({h["evidence"] for h in hotspots}) == 6
    lib_ev = {h["evidence"] for h in env["LIBRARY_HOTSPOTS"]}
    assert not lib_ev & {h["evidence"] for h in hotspots}
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]

    # ---- C. script structure: 6 hotspots -> 4-act chain -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "theater_case_investigate")
    for i in range(1, 7):
        assert f"if not _th_h{i}:" in inv and f'$ theater_inspect_hotspot("h{i}")' in inv, f"hotspot h{i} not playable"
    assert inv.count("jump theater_case_investigate") == 6 and "jump theater_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"theater_act_k{i}")
        assert f"show screen theater_act_banner({i - 1}, " in kb
        assert kb.count("$ _th_mistakes += 1") == 2 and kb.count(f"jump theater_act_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _th_acts = {i}" in kb
        for m_wrong in re.finditer(r"\$ _th_mistakes \+= 1(.*?)jump theater_act_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct act always at the same menu slot: {correct_positions}"
    assert correct_positions != [2, 1, 0, 2], "Answer slots must not copy the PC-10 library pattern"
    assert "call _theater_finish_case(_th_mistakes)" in blk and "label theater_case_resolution:" in blk
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the theater case"
    assert "truth_spoiler_unlocked" not in blk, "The theater case is fully public"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public theater case"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"banzhang", "lvfu", "joker", "zhang", "alice", "mo"} <= cast, cast
    defs_src = _read("game/definitions.rpy")
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)), f"Undefined speaker `{speaker}`"
    assert {"banzhang", "lvfu", "joker", "zhang", "alice", "mo_note", "mc"} <= speakers, speakers
    _sprite_slots_ok(blk, "rainy_theater_case")
    # Ren'Py interpolates [...] in dialogue: only the intended replay-best substitution is allowed
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_th_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("rainy_theater_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "rainy_theater_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["theater_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "rainy_theater_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "theater"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "TH-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_theater_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_th_h{i}"] is True for i in range(1, 7))
    assert env["_th_mistakes"] == 8 and env["_th_acts"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {h["evidence"] for h in hotspots}
    assert env["theater_get_record"]()["inspected"] == [f"h{i}" for i in range(1, 7)]
    assert env["theater_inspect_hotspot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievement ----
    assert [env["theater_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.theater_script_record = {}
    mp.time_capsule_record = {}
    assert env["theater_case_solved_count"]() == 0 and env["theater_best_short"]() == "待结案"
    v0 = env["theater_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["act_shorts"]) and not any(v0["act_fulls"])
    assert env["capsule_item_status"]("c11") == "locked"
    r = env["theater_record_solve"](6)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_theater_script") and not mock_ach.has("ach_closed_library")
    assert env["capsule_item_status"]("c11") == "earned", "Solving the theater case must leave the C-11 keepsake"
    r = env["theater_record_solve"](1)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 1
    r = env["theater_record_solve"](1)
    assert not r["new_record"] and r["replays"] == 3
    r = env["theater_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and r["best_mistakes"] == 0
    r = env["theater_record_solve"](4)
    assert r["last_tier"] == "bronze" and r["best_tier"] == "gold" and r["best_mistakes"] == 0 and r["replays"] == 5
    assert env["theater_best_short"]() == "金票根" and env["theater_gold_count"]() == 1
    v = env["theater_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["act_shorts"] == [k["short"] for k in acts]
    env["theater_open_report_modal"]()
    assert env["theater_get_record"]()["report_viewed"] and any(s[0] == "theater_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    # the library case keeps its own, untouched store
    assert env["library_case_solved_count"]() == 0

    # ---- F. accordion sub-bar helpers (12 tabs) ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if t not in SALON_KEYS:
                continue  # PC-12+ tab: its counter lives in a later module (pill text verified by that milestone)
            txt = env["salon_tab_pill_text"](t)
            assert re.fullmatch(r"\S+ \d+/\d+", txt), f"pill text `{txt}`"
    assert env["salon_tab_pill_text"]("theater") == "剧场 1/1"
    assert env["salon_tab_icon"]("theater").endswith("icon_theater_backstage.png")
    assert env["salon_tab_icon"]("capsule").endswith("icon_time_capsule.png")
    saved_fn = env.pop("capsule_placed_count")
    assert env["salon_tab_pill_text"]("capsule") == "胶囊", "Pill text must degrade gracefully"
    env["capsule_placed_count"] = saved_fn

    # ---- G. time capsule ----
    items = env["CAPSULE_ITEMS"]
    letters = env["CAPSULE_LETTERS"]
    assert [c["id"] for c in items] == [f"c{i:02d}" for i in range(1, 13)]
    assert [c["code"] for c in items] == [f"C-{i:02d}" for i in range(1, 13)]
    expect_tabs = ["mailbox", "teaparty", "lexicon", "restoration", "letterbox", "origami", "radio", "planetarium",
                   "badges", "library", "theater", "album"]
    assert [c["tab"] for c in items] == expect_tabs, "One keepsake per extras activity, in salon order"
    assert [c["id"] for c in items if c["spoiler"]] == ["c06", "c07", "c08"]
    c11 = [c for c in items if c["id"] == "c11"][0]
    for tell in ("可可", "吸墨", "吕芙", "熨斗", "吹风机", "服装间"):
        assert tell not in c11["name"] + c11["condition"], f"C-11 pre-solve label leaks the solution via `{tell}`"
        assert tell not in "时间胶囊 · C-11 " + c11["name"]
    assert len({c["name"] for c in items}) == 12 and len({c["icon"] for c in items}) == 12
    for c in items:
        assert (GAME_DIR / c["icon"]).is_file(), c["icon"]
        assert c["progress_key"] == "lexicon" or c["progress_key"] in env["_CAPSULE_PROGRESS_FNS"], c["id"]
        assert len(c["mo_tag"]) >= 25 and len(c["alice_tag"]) >= 25, f"{c['id']} tag too short"
        if c["spoiler"]:
            assert c.get("mo_tag_secret") and c.get("alice_tag_secret")
        else:
            assert "mo_tag_secret" not in c and "alice_tag_secret" not in c
    assert [lt["id"] for lt in letters] == ["lt_alice", "lt_mo"] and [lt["author"] for lt in letters] == ["艾丽丝", "墨墨"]
    assert [lt["need"] for lt in letters] == [4, 8] and all(lt["spoiler"] for lt in letters)
    for lt in letters:
        assert len(lt["body_pub"]) >= 150 and len(lt["body_secret"]) >= 40 and lt["sign"]
    for fn in env["_CAPSULE_PROGRESS_FNS"].values():
        assert fn in env, f"Capsule progress counter `{fn}` is not defined"

    mp.closed_library_record = {}
    mp.planetarium_records = {}
    mp.photo_album_records = {}
    mp.theater_script_record = {}
    mp.time_capsule_record = {}
    assert env["capsule_earned_count"]() == 0 and env["capsule_placed_count"]() == 0
    n_before = len(mock_renpy.notifications)
    assert env["capsule_place"]("c01") is None and len(mock_renpy.notifications) == n_before + 1
    assert env["capsule_item_status"]("c01") == "locked"
    assert env["capsule_seal"]() is None and not mock_ach.has("ach_time_capsule")
    assert env["capsule_open_letter"]("lt_alice") is False
    assert not any(s[0] == "capsule_letter_modal" for s in mock_renpy.shown_screens)

    def _first(key):
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
        elif key == "album":
            env["album_develop"]("ph01", False)

    # every keepsake must be earnable with spoilers locked (lexicon counts public entries only)
    assert mp.te_cleared is False and mp.truth_spoiler_confirmed is False
    for idx, c in enumerate(items):
        if env["capsule_item_status"](c["id"]) == "locked":
            _first(c["progress_key"])
        assert env["capsule_item_status"](c["id"]) == "earned", f"{c['id']} not earned after first {c['source']}"
        before = env["capsule_placed_count"]()
        rec = env["capsule_place"](c["id"])
        assert rec is not None and c["id"] in rec["placed"] and env["capsule_placed_count"]() == before + 1
        assert env["capsule_item_status"](c["id"]) == "placed"
        assert env["capsule_place"](c["id"])["placed"].count(c["id"]) == 1, "Placing twice must stay idempotent"
        n = idx + 1
        assert env["capsule_letter_readable"]("lt_alice") is (n >= 4)
        assert env["capsule_letter_readable"]("lt_mo") is (n >= 8)
        if n == 3:
            assert env["capsule_open_letter"]("lt_alice") is False
        if n == 4:
            assert env["capsule_open_letter"]("lt_alice") is True
            assert any(s[0] == "capsule_letter_modal" and s[2].get("letter_id") == "lt_alice" for s in mock_renpy.shown_screens)
            assert env["capsule_get_record"]()["letters_read"] == ["lt_alice"]
        if n < 12:
            assert env["capsule_can_seal"]() is False and env["capsule_seal"]() is None
    assert env["capsule_placed_count"]() == 12 and env["capsule_get_record"]()["placed"] == [c["id"] for c in items]
    assert not mock_ach.has("ach_time_capsule"), "Placing alone must not grant the capsule achievement"
    assert env["capsule_can_seal"]() is True
    sealed = env["capsule_seal"]()
    assert sealed["sealed"] and sealed["seal_count"] == 1 and mock_ach.has("ach_time_capsule")
    assert env["capsule_seal"]()["seal_count"] == 1 and env["capsule_can_seal"]() is False
    assert env["capsule_open_letter"]("lt_mo") is True and env["capsule_get_record"]()["letters_read"] == ["lt_alice", "lt_mo"]
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False

    # ---- H. zero-side-channel spoiler gate ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for k, val in view.items():
            if isinstance(val, str):
                for kw in SECRET_KEYWORDS:
                    assert kw not in val, f"Spoiler keyword `{kw}` leaked in {where}.{k}"

    for c in items:
        v = env["capsule_render_item"](c["id"])
        _clean(v, c["id"])
        assert v["placed"] is True
        if c["spoiler"]:
            assert v["unlocked"] is False and v["display_masked_notice"] == env["CAPSULE_SPOILER_NOTICE"]
            assert v["display_mo_secret"] == "" and v["display_alice_secret"] == ""
        else:
            assert v["unlocked"] is True and v["display_masked_notice"] == ""
    for lt in letters:
        v = env["capsule_render_letter"](lt["id"])
        _clean(v, lt["id"])
        assert v["readable"] and v["display_body"] == lt["body_pub"] and v["display_secret"] == ""
        assert v["display_masked_notice"] == env["CAPSULE_SPOILER_NOTICE"] and v["unlocked"] is False
    assert not any(kw in env["CAPSULE_SPOILER_NOTICE"] for kw in SECRET_KEYWORDS)
    for c in items:
        for k in ("name", "source", "condition", "mo_tag", "alice_tag"):
            for kw in SECRET_KEYWORDS:
                assert kw not in c[k], f"`{kw}` in public capsule field {c['id']}.{k}"
    for lt in letters:
        for k in ("title", "author", "body_pub", "sign"):
            for kw in SECRET_KEYWORDS:
                assert kw not in lt[k], f"`{kw}` in public letter field {lt['id']}.{k}"
    th_public = [blk, str(case)] + [str(h) for h in hotspots] + [str(k) for k in acts]
    for text in th_public:
        for kw in SECRET_KEYWORDS:
            assert kw not in text, f"`{kw}` appears in the public theater case"
    _clean(env["theater_render_view"](), "theater")
    # the secrets really are the endgame material the gate is protecting
    secret_blob = "".join(c.get("mo_tag_secret", "") + c.get("alice_tag_secret", "") for c in items) + \
        "".join(lt["body_secret"] for lt in letters)
    assert sum(1 for kw in SECRET_KEYWORDS if kw in secret_blob) >= 2

    # side channel: replacing / emptying every secret leaves every locked render byte-identical
    # (items placed + letters readable, i.e. the strongest state: secrets would show the instant the gate opened)
    saved_items = {c["id"]: copy.deepcopy(c) for c in items}
    saved_letters = {lt["id"]: copy.deepcopy(lt) for lt in letters}
    before_i = {c["id"]: env["capsule_render_item"](c["id"]) for c in items}
    before_l = {lt["id"]: env["capsule_render_letter"](lt["id"]) for lt in letters}
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}"):
        for c in items:
            if c["spoiler"]:
                c["mo_tag_secret"] = filler
                c["alice_tag_secret"] = filler[::-1] + "Z"
        for lt in letters:
            lt["body_secret"] = filler + "附言"
        for c in items:
            assert env["capsule_render_item"](c["id"]) == before_i[c["id"]], f"Locked {c['id']} view depends on secret text"
            proofs += 1
        for lt in letters:
            assert env["capsule_render_letter"](lt["id"]) == before_l[lt["id"]], f"Locked {lt['id']} view depends on secret text"
            proofs += 1
    for c in items:
        cid = c["id"]
        c.clear()
        c.update(saved_items[cid])
    for lt in letters:
        lid = lt["id"]
        lt.clear()
        lt.update(saved_letters[lid])
    # unplaced spoiler keepsake / unreadable letter shows nothing secret even when unlocked
    mp.time_capsule_record = {}
    mp.te_cleared = True
    for c in items:
        v = env["capsule_render_item"](c["id"])
        assert v["display_mo_secret"] == "" and v["display_mo_tag"] == "", "Unplaced keepsake must stay blank"
    for lt in letters:
        v = env["capsule_render_letter"](lt["id"])
        assert v["display_secret"] == "" and v["display_body"] == "" and v["display_sign"] == ""
    # unlock -> secrets appear on placed / readable entries only
    mp.time_capsule_record = {"placed": ["c01", "c06", "c07", "c08"], "sealed": False, "seal_count": 0, "letters_read": []}
    v8 = env["capsule_render_item"]("c08")
    assert v8["unlocked"] and "小可" in v8["display_mo_secret"] and v8["display_masked_notice"] == ""
    assert env["capsule_render_item"]("c01")["display_mo_secret"] == ""
    va = env["capsule_render_letter"]("lt_alice")
    assert va["readable"] and va["display_secret"] == saved_letters["lt_alice"]["body_secret"]
    assert env["capsule_render_letter"]("lt_mo")["display_secret"] == "", "lt_mo needs 8 keepsakes"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["capsule_render_item"]("c06")["display_alice_secret"] and env["capsule_render_letter"]("lt_alice")["display_secret"]
    mp.truth_spoiler_confirmed = False

    # ---- I. reset_all_progress clears PC-11 state and leaves main-story vars alone ----
    mp.theater_selected_hotspot = "h5"
    mp.capsule_selected_item = "c09"
    mp.extras_salon_group = "closedlib"
    env["reset_all_progress"]()
    assert env["theater_case_solved_count"]() == 0 and env["capsule_placed_count"]() == 0
    assert mp.theater_script_record == {} and mp.time_capsule_record == {}
    assert mp.theater_selected_hotspot == "h1" and mp.capsule_selected_item == "c01" and mp.extras_salon_group == "salon"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50

    tag_cjk = sum(_cjk(c["mo_tag"] + c["alice_tag"] + c.get("mo_tag_secret", "") + c.get("alice_tag_secret", "")) for c in items)
    letter_cjk = sum(_cjk(lt["body_pub"] + lt["body_secret"] + lt["sign"]) for lt in letters)
    data_cjk = _cjk(str(case)) + sum(_cjk(str(h)) for h in hotspots) + sum(_cjk(str(k)) for k in acts)
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "CapsuleTagCJK": tag_cjk, "LetterCJK": letter_cjk,
                       "CorrectSlots": [c + 1 for c in correct_positions], "SideChannelProofs": proofs})
    print(f"[PASS] PC-11 runtime: rainy-theater case (script CJK={cjk_case}, data CJK={data_cjk}, 6 hotspots -> 4-act chain, "
          f"correct slots {[c + 1 for c in correct_positions]}, 8 gentle loops, fail_count untouched) | gold/silver/bronze "
          f"ticket stubs + best-record replay ladder + ach_theater_script | 12-keepsake capsule (tags CJK={tag_cjk}) + "
          f"2 letters (CJK={letter_cjk}, unlock at 4/8) + seal -> ach_time_capsule | 28 achievements (2x14) | "
          f"zero-leak spoiler gate + 4-way side-channel proof ({proofs} renders byte-identical)")
    return cjk_case, tag_cjk, letter_cjk


################################################################################
# 4. Zero intrusion, icons, text safety
################################################################################

def check_zero_intrusion_and_icons():
    res = subprocess.run(["git", "status", "--porcelain", "--", *MAIN_STORY_FILES],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay files were modified!\n{res.stdout}"
    diff = subprocess.run(["git", "diff", "--numstat", "--", *MAIN_STORY_FILES],
                          cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert diff.stdout.strip() == "", "Main story files have a diff"

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC11_TOUCHED_FILES if p != NEW_MODULE]],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added = line[1:]
            assert "<svg" not in added.lower() and "�" not in added and not EMOJI_RE.search(added), f"Bad added line: {added}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw, "PC-11 module must use LF line endings like its siblings"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every data-driven text that prints case / keepsake / letter copy opts out of interpolation
    for ln in new_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|THEATER_CASE|h_obj|c_obj|_th|_cv|_lm|_lv)\["(summary_pub|detail|surface|display_\w+|label|name|title)"\]', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
        if re.match(r'text \(".*%s.*" % .*\["(lighting_note|time_tag|companions|condition|source|name|title|best_line|summary)"\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched), "
          f"no Emoji/SVG/tabs/CRLF, {n_str} interpolation-safe CJK data strings")

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
            if rel_icon in PC11_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-11 set: {', '.join(Path(x).name for x in PC11_UI_ICONS)}")


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

    for img in ("ui_icon_theater_backstage", "ui_icon_missing_script", "ui_icon_time_capsule", "ui_icon_future_letter"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_rainy_theater", "theater_report_modal", "theater_act_banner", "theater_result_card",
                "extras_time_capsule", "capsule_letter_modal", "extras_achievements", "deduction_cutin", "evidence_book", "confirm"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("rainy_theater_case", "theater_case_investigate", "theater_case_review_intro", "theater_act_k1",
                "theater_act_k2", "theater_act_k3", "theater_act_k4", "theater_case_resolution",
                "_theater_init_sandbox", "_theater_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    for t in ("theater_spot_sway", "capsule_tin_bob"):
        assert t in transforms

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC11_TOUCHED_FILES:
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
    for icon in PC11_UI_ICONS:
        assert icon in refs, f"PC-11 icon {icon} is not wired into any .rpy"
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", _read("game/audio.rpy")), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", _read("game/audio.rpy")), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd

    extra_src = _read("game/extra.rpy")
    assert '"rainy_theater_case":' in extra_src
    assert extra_src.count("or name in _THEATER_CASE_LABELS") == 2
    assert extra_src.count("or name in _CLOSED_LIBRARY_LABELS") == 2, "PC-10 callback wiring must stay intact"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("theater_script_record", "theater_selected_hotspot", "time_capsule_record", "capsule_selected_item"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld
    scr_src = _read("game/screens.rpy")
    assert 'SetField(persistent, "extras_tab", "theater")' in scr_src and 'SetField(persistent, "extras_tab", "capsule")' in scr_src
    assert "theater_best_short()" in scr_src and "capsule_placed_count()" in scr_src

    for rel in PC11_TOUCHED_FILES:
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
    pc11_shots = ("ui_11a_theater_unsolved.png", "ui_11b_theater_gold.png", "ui_11c_theater_report.png",
                  "ui_11d_theater_act_banner.png", "ui_11e_theater_result_card.png", "ui_11f_capsule_masked.png",
                  "ui_11g_capsule_unmasked.png", "ui_11h_capsule_letter_modal.png")
    for shot in pc11_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_th_rec")
    pc11_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert pc11_seg.index("ui_11a") < pc11_seg.index("ui_11h"), "PC-11 shots out of order"
    assert shots.index("ui_10h_album_photo_modal.png") < start, "PC-11 audit must run after the PC-10 block"
    for bad in ("ach_grant", "capsule_place(", "capsule_seal(", "capsule_open_letter(", "theater_record_solve(",
                "album_develop(", "library_record_solve("):
        assert bad not in pc11_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("theater_script_record", "theater_selected_hotspot", "time_capsule_record", "capsule_selected_item",
                "planetarium_records", "extras_salon_group", "te_cleared", "truth_spoiler_confirmed"):
        assert f"persistent.{fld} = _saved_" in pc11_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-11 coverage ({len(pc11_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc11_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC11_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC11_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
