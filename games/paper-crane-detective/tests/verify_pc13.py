#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-13 Static, Behavioral, Pixel-Budget, Sports-Day Lost-and-Found Case (replayable, rated, reasoned
backwards from six lost items), Detective Club Case Notebook (read-only summary of the PC-10..PC-13
short cases with a snapshot proof of zero writes), Spoiler-Gate (side-channel proof), Salon Accordion
Sub-Bar (16 tabs / 5 groups, compact pills for 4-tab groups), Main-Menu 6th Chip Row, Asset &
Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's
init-python blocks inside the same mocked sandbox verify_pc12.py uses, plus the PC-13 module.
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
NEW_MODULE = "game/zephyr_relay_casebook.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc11 as pc11  # noqa: E402
import verify_pc12 as pc12  # noqa: E402

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

PC13_UI_ICONS = [
    "images/ui/icon_lost_found_box.png",
    "images/ui/icon_relay_baton.png",
    "images/ui/icon_case_notebook.png",
    "images/ui/icon_evidence_tag.png",
]

REQUIRED_UI_ICONS = pc12.REQUIRED_UI_ICONS + PC13_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC13_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

# every older extras module stays byte-identical (the notebook only *reads* PC-10 / PC-11 / PC-12 data)
OLDER_EXTRAS_MODULES = [
    "game/club_mailbox.rpy", "game/tea_party_lexicon.rpy", "game/bookstreet_seasons.rpy", "game/radio_origami.rpy",
    "game/stargazer_badges.rpy", "game/vanished_shelf_album.rpy", "game/wings_theater_capsule.rpy",
    "game/yearbook_atelier_wall.rpy", "game/dlc_stories.rpy", "game/gameplay.rpy",
]
# older verifiers edited only for forward compatibility (counts PC-13 legitimately changes)
FORWARD_COMPAT_TESTS = ["tests/verify_pc9.py", "tests/verify_pc10.py", "tests/verify_pc11.py", "tests/verify_pc12.py"]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_GROUPS_EXPECTED = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", ("library", "theater", "atelier", "sportsday")),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_KEYS = tuple(k for _g, ks in SALON_GROUPS_EXPECTED for k in ks)

CJK_LINE = pc10.CJK_LINE
NAV_RIGHT = 60 + 280  # gui.navigation_xpos + navigation_button xsize

OLDER_CASES = [  # (notebook key, case var, hotspots var, links var, tiers var, store, solve fn, get_record fn, tab)
    ("library", "LIBRARY_CASE", "LIBRARY_HOTSPOTS", "LIBRARY_CHAIN_LINKS", "LIBRARY_RATING_TIERS",
     "closed_library_record", "library_record_solve", "library_get_record", "library"),
    ("theater", "THEATER_CASE", "THEATER_HOTSPOTS", "THEATER_ACT_LINKS", "THEATER_RATING_TIERS",
     "theater_script_record", "theater_record_solve", "theater_get_record", "theater"),
    ("atelier", "ATELIER_CASE", "ATELIER_HOTSPOTS", "ATELIER_STROKE_LINKS", "ATELIER_RATING_TIERS",
     "atelier_painting_record", "atelier_record_solve", "atelier_get_record", "atelier"),
    ("sportsday", "SPORTS_CASE", "SPORTS_ITEMS", "SPORTS_RELAY_LEGS", "SPORTS_RATING_TIERS",
     "sports_lostfound_record", "sports_record_solve", "sports_get_record", "sportsday"),
]
CASE_STORES = [c[5] for c in OLDER_CASES]

LOG_REPORT = {}

# Forward compatibility (PC-14+): later modules initialise after this one and legitimately append a 5th tab to the
# "closedlib" group (one-icon quint pills), merge the main menu's extra-story chips -- including PC-13's sports-day and
# notebook chips -- into one "番外卷宗" folio entry (6 rows -> 4 rows) and add achievements 33-34. Those exact counts /
# widths are verified by their own milestone (verify_pc14); here the PC-13 contract is kept: its tabs stay in their groups,
# both PC-13 entries stay one click from the title screen, the column stays clear of the progress badge.
# PC-15 appends a 6th short case (48px sext pills), expands the case notebook to six pages in a new 3 x 2 page (the PC-13
# four-tab page stays defined, byte-identical), re-flows the 4 main-menu chip rows clear of the navigation column and adds
# achievements 35-36 (verified by verify_pc15).
# PC-16 appends a 7th short case (folio only), expands the casebook to seven pages and deletes PC-13's four-tab casebook page
# (no longer used by anything since PC-15; PC-13's read-only renderers, page modal and notebook_* styles stay and are still
# used by the expanded casebook) and adds achievements 37-38 (verified by verify_pc16).
LATER_MODULES = ["zoetrope_shadow_folio.rpy", "zubenelgenubi_meteor_casebook.rpy", "zwembad_locker_casebook.rpy"]


def _later_present():
    return [n for n in LATER_MODULES if (GAME_DIR / n).is_file()]


def _rows_reflowed():
    """PC-15 re-flows the main-menu chips into 4 + 3 + 3 + 4 rows moved clear of the navigation column (verify_pc15)."""
    return (GAME_DIR / "zubenelgenubi_meteor_casebook.rpy").is_file()


def _pc16_present():
    """PC-16 expands the casebook to seven pages and deletes PC-13's unused four-tab casebook page (verify_pc16)."""
    return (GAME_DIR / "zwembad_locker_casebook.rpy").is_file()


def _folio_merged():
    """PC-14 merged the main menu's extra-story chips into one "番外卷宗" folio entry (verify_pc14)."""
    return (GAME_DIR / "zoetrope_shadow_folio.rpy").is_file()


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18, 19)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (12, 13, 14, 17, 18, 19, 20, 21, 38, 40, 84)}
    return f, sf


################################################################################
# 0. Sandbox (PC-12 sandbox + PC-13 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc12._sandbox_env()
    for k, v in {
        "sports_lostfound_record": {}, "sports_selected_item": "h1", "case_notebook_record": {},
        "notebook_selected_case": "library",
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
    assert len(rpy_files) >= 31, f"Expected >=31 .rpy files (including zephyr_relay_casebook.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-13 module must initialise after yearbook_atelier_wall.rpy so its 2 achievements append last
    assert names.index("zephyr_relay_casebook.rpy") > names.index("yearbook_atelier_wall.rpy")
    later = _later_present()
    assert names[len(names) - 1 - len(later)] == "zephyr_relay_casebook.rpy", (
        f"PC-13 module must initialise after every older top-level module: {names[-3:]}")
    assert names[len(names) - len(later):] == sorted(later), f"Only later milestones may follow PC-13: {names[-3:]}"

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
    # screen-language property expressions of the new module (action / conditional style / formatted text) parse as Python
    n_expr = 0
    for ln in _read(NEW_MODULE).splitlines() + _read("game/extra.rpy").splitlines():
        m = re.match(r"^\s+(?:action|style) (.+?)\s*$", ln)
        if m and _paren_delta(m.group(1)) == 0 and not m.group(1).startswith('"'):
            ast.parse(m.group(1))
            n_expr += 1
    assert n_expr >= 40, n_expr
    print(f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
          f"({total_blocks} python blocks + {total_inline} inline `$` statements + {n_def} defines); PC-13 module initialises last")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def _main_menu_metrics(f, sf, scr_src):
    """Vertical stack of the main-menu title column (vbox yalign 0.29) with the 6th chip row."""
    blk = scr_src.split("screen main_menu():", 1)[1].split("## 进度徽记", 1)[0]
    blk = blk.split('style "main_menu_vbox"', 1)[1]
    # (PC-15+ nests the rows in one shifted wrapper vbox with a tighter spacing: count the row headers at any depth)
    chip_rows = len(re.findall(r"^(?P<ind> +)hbox:\n(?P=ind)    xalign 0\.5\n(?:(?P=ind)    xoffset -?\d+\n)?(?P=ind)    spacing \d+\n",
                               blk, re.M))
    nulls = [int(n) for n in re.findall(r"^ +null height (\d+)$", blk, re.M)]
    assert chip_rows == (4 if _folio_merged() else 6), f"Unexpected cozy-chip row count {chip_rows}"
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
    # (PC-16 deletes this module's four-tab notebook page -- unused since PC-15 -- so the page / evidence / chain markup the
    #  checks below look for is read from PC-15's expanded casebook page, which renders the same page with PC-13's styles)
    page_src = new_src + (_read("game/zubenelgenubi_meteor_casebook.rpy") if _pc16_present() else "")
    scr_src = _read("game/screens.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-13 registry added
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
                       ("EXTRAS_SPORTS_NOTEBOOK_TABS", ["sportsday", "notebook"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 16 tabs in the same 5 groups, each exactly once; EVERY open state <= 702px.
    #     Groups 4 / 5 now hold 4 tabs each and open with compact equal-width pills (salon_quad_pill);
    #     with PC-12's 66px pills those two states would overflow (measured below: the reason for the compact style).
    sb = pc10.measure_salon_subbar()
    if _later_present():
        # PC-14+ may append tabs to a group (each PC-13 group keeps its tabs first, in order; widths re-measured)
        assert [g[0] for g in sb["groups"]] == [g for g, _t in SALON_GROUPS_EXPECTED], sb["groups"]
        for (gkey, gtabs), g in zip(SALON_GROUPS_EXPECTED, sb["groups"]):
            assert tuple(g[3])[:len(gtabs)] == gtabs, (gkey, g[3])
        assert len(sb["keys"]) == len(set(sb["keys"])) and set(SALON_KEYS) <= set(sb["keys"]), sb["keys"]
    else:
        assert [(g[0], tuple(g[3])) for g in sb["groups"]] == SALON_GROUPS_EXPECTED, sb["groups"]
        assert len(sb["keys"]) == len(set(sb["keys"])) == 16
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    labels = {g[0]: g[1] for g in sb["groups"]}
    assert labels == {"salon": "侦探社沙龙", "bookstreet": "旧书街与四季", "starlit": "电波与星空",
                      "closedlib": "放学后短案", "keepsake": "纪念与寄语"}, labels
    assert sb["quad"] == (4, 60, 4), f"Compact pill rule changed: {sb['quad']}"
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    # (PC-15 expands the notebook to six pages: haunted house + meteor night appended after the four PC-13 pages)
    # (PC-16 appends the pool-locker page: seven pages)
    assert sb["totals"]["sportsday"] == 1 and sb["totals"]["notebook"] == (7 if _pc16_present() else 6 if _rows_reflowed() else 4)
    pill66 = lambda t: max(66, _w(f[11], t) + 12)  # noqa: E731
    pill60 = lambda t: max(60, _w(f[11], t) + 8)  # noqa: E731
    legacy = {}
    for okey, _ol, _oi, otabs in sb["groups"]:
        if len(otabs) < 4:
            continue
        w = 0
        for gkey, glabel, _gi, gtabs in sb["groups"]:
            if gkey == okey:
                for t in gtabs:
                    w += 14 + 4 + pill66(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}") + 4
            else:
                w += 14 + 4 + max(66, _w(f[11], glabel) + 12) + 4
        legacy[okey] = w - 4
        assert legacy[okey] > 702, "If 66px pills fit, the compact style would be unnecessary"
        widths = {pill60(f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}") for t in otabs}
        assert widths == {60}, f"Compact pills in `{okey}` are not equal-width: {widths}"
    report["SubBarWorst"] = sb["worst"]
    report["SubBarIf66pxPills"] = max(legacy.values())

    # 2.3 subtitle & vertical budget unchanged
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)
    avail = 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert sub_px <= avail and "侦探社沙龙" in sub
    assert "ysize 468" in extra_src and "spacing 7" in extra_src

    console_inner = 722 - 2 * int(_style_prop(new_src, "sports_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694
    page_inner = 722 - 2 * int(_style_prop(new_src, "notebook_page_card", "padding").strip("()").split(",")[0])
    assert page_inner == 694

    # ---------------- sports-day lost-and-found page ----------------
    case = env["SPORTS_CASE"]
    items = env["SPORTS_ITEMS"]
    legs = env["SPORTS_RELAY_LEGS"]
    tiers = env["SPORTS_RATING_TIERS"]
    batons = env["SPORTS_BATONS"]
    tag_w = int(_style_prop(new_src, "sports_tag_card", "xsize"))
    tag_pad = int(_style_prop(new_src, "sports_tag_card", "padding").strip("()").split(",")[0])
    assert "grid 3 2:" in new_src and len(items) == 6
    assert 3 * tag_w + 2 * 8 == console_inner, "Lost-item 3x2 grid must equal 694px"
    tag_inner = tag_w - 2 * tag_pad
    widest_tag = max_surface = 0
    for h in items:
        line = _wb(f[11], f"{h['code']} · {h['label']}") + 4 + _wb(f[10], "已检查")
        found = _w(f[10], f"拾获 {h['found']}")
        widest_tag = max(widest_tag, line, found)
        assert line <= tag_inner and found <= tag_inner, f"Lost-item tag `{h['label']}` overflows: {line}/{found}px"
        max_surface = max(max_surface, _lines(f[11], h["surface"], tag_inner))
        head = _wb(f[12], f"{h['code']} · {h['label']}（{h['finder']}拾获）")
        assert head <= console_inner - 20 - 20 - 8, f"Detail heading `{h['label']}` wraps: {head}px"
    assert max_surface <= 3, f"Lost-item surface text too long ({max_surface} lines)"
    report["LostItemTag"] = widest_tag
    slot_w = int(_style_prop(new_src, "sports_leg_slot", "xsize"))
    slot_h = int(_style_prop(new_src, "sports_leg_slot", "ysize"))
    slot_pad = [int(x) for x in _style_prop(new_src, "sports_leg_slot", "padding").strip("()").split(",")]
    assert 4 * slot_w + 3 * 8 <= console_inner, "Relay-leg slots overflow"
    assert 'add Solid(k_obj["color"]) xysize (151, 3)' in new_src and slot_w - 2 * slot_pad[0] == 151
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= slot_h - 2 * slot_pad[1], "Leg slot content too tall"
    for k in legs:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Leg short `{k['short']}` overflows slot ({_w(f[12], k['short'])}px)"
    tier_w = int(_style_prop(new_src, "sports_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    widest_tier = 0
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        widest_tier = max(widest_tier, chip)
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    report["StopwatchTierChip"] = widest_tier
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "秒表评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"

    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    hdr = 36 + 10 + 398 + hdr_right
    assert hdr <= console_inner, f"Sports header overflows: {hdr}px"
    assert _w(sf[19], "运动会失物招领箱的秘密") <= 398
    for s in ("已结案 · 四棒已倒着跑完 · 可随时重新打开失物箱冲击金秒表", "运动会后的第二天，六件没人认领的失物 · 一件一件读下去"):
        assert _w(f[12], s) <= 398, f"Sports header line wraps ({_w(f[12], s)}px): {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    band = len(batons) * 42 + (len(batons) - 1) * 4
    assert band <= 180 and len(batons) == 4 and "xysize (42, 5)" in new_src, f"Baton band {band}px wider than the 180px thumbnail"
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Sports time-tag line overflows 492px: {tag_line}px"
    lamp = 15 + 6 + _w(f[12], "光影：" + case["lighting_note"])
    assert lamp <= 492, f"Sports lighting line overflows: {lamp}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 六件失物全读完）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已读 6/6 件，可先翻看下方登记签，再打开失物箱）")
    assert arch_solved <= 492 and arch_open <= 492, f"Sports archive line overflows: {arch_solved}/{arch_open}px"
    report["SportsTagLine"] = tag_line
    report["SportsLighting"] = lamp
    report["SportsArchive"] = max(arch_solved, arch_open)
    sd_footer = (_w(f[12], "零失误倒跑完四棒可获金秒表 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
                 + 8 + max(146, _w(f[15], "重新打开失物箱") + 36, _w(f[15], "打开失物招领箱") + 36))
    assert sd_footer <= console_inner, f"Sports footer overflows: {sd_footer}px"
    report["SportsFooter"] = sd_footer
    quick = (20 + 10 + _w(sf[14], "推理笔记复盘本 · 四桩短案") + 10 + _w(f[12], "（已盖复盘章 4/4）")
             + 8 + max(84, _w(f[13], "翻开复盘本") + 22))
    assert quick <= 722 - 24, f"Sports quick row overflows: {quick}px"
    report["SportsQuickRow"] = quick

    # in-scene relay banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "sports_banner_slot", "xsize"))
    banner_h = int(_style_prop(new_src, "sports_banner_slot", "ysize"))
    assert 4 * banner_slot + 3 * 6 <= 728
    assert banner_slot - 16 == 160 and "xysize (160, 3)" in new_src
    assert 3 + round(10 * CJK_LINE) + round(11 * CJK_LINE) <= banner_h - 8, "Banner slot content too tall"
    for k in legs:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "失物招领 · 倒跑四棒") + 8 + _w(f[11], "已交接 4/4 · 失误只计入本案秒表评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen sports_relay_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    shots_src = _read("game/tests/ui_shots.rpy")
    shot_prompt = re.search(r'Show\("sports_relay_banner", legs_done=2, prompt_line="([^"]+)"\)', shots_src).group(1)
    assert shot_prompt == prompts[2][1], "ui_shots banner prompt must match the in-game third-leg prompt"
    report["RelayBannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 608 - 28 = 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "失物箱结案 · SD-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    assert len(batons) * 152 <= 608 and "xysize (152, 3)" in new_src
    widest_result = 0
    for s in ["本局失误 99 次（只计入失物箱评级，不影响主线）",
              "首次结案 · 倒跑四棒已写入鉴赏室「运动会失物」分页，复盘本添上了第四页",
              "重玩挑战 · 刷新个人纪录！这一次的交接比以往任何一次都更稳",
              "重玩挑战 · 再次按停金秒表，操场名侦探实至名归",
              "重玩挑战 · 零失误倒着跑完四棒，就能把金秒表挂上终点线"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        widest_result = max(widest_result, _w(f[12], s))
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    assert _w(f[13], case["mo_note_pub"]) <= 580, "Result-card mo note wraps"
    report["ResultCardLine"] = widest_result
    rm_head = 40 + 12 + _w(sf[20], f"SD-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    assert len(batons) * 173 <= 692 and "xysize (173, 3)" in new_src
    assert 6 + 8 + 658 <= 672 and "xsize 658" in new_src
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重新打开失物箱") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- case notebook page ----------------
    nb_cases = env["NOTEBOOK_CASES"]
    pages = [env["notebook_render_page"](n["key"]) for n in nb_cases]
    assert all(p["available"] for p in pages), "Every notebook page must find its case module in the sandbox"
    nb_hdr = (36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "复盘章 4/4") + 20) + 6
              + max(84, _w(f[13], "恢复遮罩") + 22, _w(f[13], "解锁剧透") + 22))
    assert nb_hdr <= page_inner, f"Notebook header overflows: {nb_hdr}px"
    assert _w(sf[19], "侦探社推理笔记复盘本") <= 398
    for s in ("四枚复盘章已全部盖好 · 下次遇到怪事，先翻这本本子。", "TRUE END 已通关 · 复盘本页边的续批已全部显影。",
              "已手动开启剧透许可 · 复盘本页边的续批当前可见。", "四桩短案的证物与推理 · 涉终章的页边续批由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Notebook header line wraps ({_w(f[12], s)}px): {s}"
    report["NotebookHeader"] = nb_hdr
    # index tabs: 4 x 173 + 3 x 10 = 722
    idx_w = int(_style_prop(new_src, "notebook_index_tab", "xsize"))
    idx_h = int(_style_prop(new_src, "notebook_index_tab", "ysize"))
    idx_pad = [int(x) for x in _style_prop(new_src, "notebook_index_tab", "padding").strip("()").split(",")]
    if _pc16_present():
        assert not re.search(r"^screen extras_case_notebook\b", new_src, re.M) and "grid 3 casebook_index_rows():" in page_src
        assert len(nb_cases) == 4 and 4 * idx_w + 3 * 10 == 722
    else:
        assert "grid 4 1:" in new_src and len(nb_cases) == 4 and 4 * idx_w + 3 * 10 == 722
    idx_inner = idx_w - 2 * idx_pad[0]
    assert round(11 * CJK_LINE) + 2 + round(13 * CJK_LINE) + 2 + round(11 * CJK_LINE) <= idx_h - 2 * idx_pad[1], "Index tab too tall"
    widest_idx = 0
    tier_names = ["待结案", "缺卷"] + [t["name"] for c in OLDER_CASES for t in env[c[4]]]
    for n, p in zip(nb_cases, pages):
        l1 = 7 + 5 + _wb(f[11], p["code"]) + 4 + max(_wb(f[10], s) for s in ("已盖章", "可盖章", "未结案", "缺卷"))
        l2 = _w(sf[13], p["short_title"])
        l3 = max(_w(f[11], f"{n['index_label']} · 最佳 {b}") for b in tier_names)
        widest_idx = max(widest_idx, l1, l2, l3)
        assert l1 <= idx_inner and l2 <= idx_inner and l3 <= idx_inner, f"Index tab `{n['key']}` overflows: {l1}/{l2}/{l3}px"
    report["NotebookIndexTab"] = widest_idx
    # page head, evidence grid (3 x 226 + 2 x 8 = 694), chain slots, footer
    cell_w = int(_style_prop(new_src, "notebook_evidence_cell", "xsize"))
    cell_pad = int(_style_prop(new_src, "notebook_evidence_cell", "padding").strip("()").split(",")[0])
    assert 3 * cell_w + 2 * 8 == page_inner and "null width 226 height 62" in page_src
    cell_inner = cell_w - 2 * cell_pad
    nslot_w = int(_style_prop(new_src, "notebook_chain_slot", "xsize"))
    nslot_h = int(_style_prop(new_src, "notebook_chain_slot", "ysize"))
    assert 4 * nslot_w + 3 * 8 <= page_inner and nslot_w - 16 == 151 and 'add Solid(_np["ink"]) xysize (151, 3)' in page_src
    assert 3 + 2 + round(11 * CJK_LINE) + 2 + round(12 * CJK_LINE) <= nslot_h - 10
    widest_head = widest_ev = max_ev_lines = widest_line = 0
    for p in pages:
        head = 6 + 8 + 86 + 8 + _w(sf[18], f"《{p['short_title']}》") + 10 + max(96, _w(f[12], p["best_name"]) + 20)
        widest_head = max(widest_head, head)
        assert head <= page_inner, f"Notebook page head `{p['key']}` overflows: {head}px"
        assert _wb(f[12], p["code"]) <= 86
        for s in (f"{p['index_label']}  ·  {p['time_tag']}",):
            widest_line = max(widest_line, _w(f[12], s))
            assert _w(f[12], s) <= page_inner, s
        assert len(p["evidence_rows"]) == 6
        for code, label, _ev, _seen in p["evidence_rows"]:
            assert _wb(f[10], f"{code} · {label}") <= cell_inner, f"Evidence cell head `{label}` overflows"
        hs = env[[c for c in OLDER_CASES if c[0] == p["key"]][0][2]]
        for h in hs:
            widest_ev = max(widest_ev, _wb(f[10], f"{h['code']} · {h['label']}"))
            max_ev_lines = max(max_ev_lines, _lines(f[11], h["evidence"], cell_inner))
        for k in env[[c for c in OLDER_CASES if c[0] == p["key"]][0][3]]:
            assert _wb(f[11], f"{k['step']} · {k['name']}") <= 151 and _w(f[12], k["short"]) <= 151, f"Chain slot `{k['short']}` overflows"
    assert max_ev_lines <= 3, f"Evidence text too long for a notebook cell ({max_ev_lines} lines)"
    tiers_all = [t for c in OLDER_CASES for t in env[c[4]]]
    best_line_max = max(_w(f[12], f"最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 已结案 99 次") for t in tiers_all)
    assert best_line_max <= page_inner
    report["NotebookPageHead"] = widest_head
    report["NotebookEvidenceHead"] = widest_ev
    report["NotebookEvidenceLines"] = f"{max_ev_lines} lines max"
    nb_foot = (_w(f[12], "已勘查 6/6 · 已结案 99 次") + 10
               + max(max(84, _w(f[13], "前往" + n["index_label"]) + 22) for n in nb_cases) + 8
               + max(84, _w(f[13], "展开整页") + 22) + 8 + max(146, _w(f[15], "已盖复盘章") + 36, _w(f[15], "盖上复盘章") + 36))
    assert nb_foot <= page_inner, f"Notebook footer overflows: {nb_foot}px"
    report["NotebookFooter"] = nb_foot
    for n in nb_cases:
        assert _w(f[12], f"{n['unit']} · 复盘（结案后显影）：") <= page_inner
    summ = (18 + 6 + _w(sf[13], "复盘总评") + 10
            + _w(f[11], "已结案 4/4 · 金评级 4/4 · 累计结案 99 次 · 最少失误合计 99 次"))
    assert summ <= 722 - 28, f"Notebook summary row overflows: {summ}px"
    report["NotebookSummary"] = summ
    nb_quick = (20 + 10 + _w(sf[14], "运动会失物 · SD-01 没有跑的第四棒") + 10 + _w(f[12], "（待结案）")
                + 8 + max(84, _w(f[13], "前往失物箱") + 22))
    assert nb_quick <= 722 - 24, f"Notebook quick row overflows: {nb_quick}px"
    report["NotebookQuickRow"] = nb_quick
    # notebook modal (740 - 48 = 692)
    pm_head = (40 + 12 + max(_w(sf[20], f"{p['code']} · 《{p['short_title']}》") for p in pages) + 10 + 28 + 6
               + _wb(f[13], "已盖复盘章"))
    assert pm_head <= 692, f"Notebook modal header overflows: {pm_head}px"
    for p in pages:
        assert 40 + 12 + _w(f[12], f"{p['index_label']} · {p['time_tag']}") <= 692 - 120
    pm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上这一页") + 10 + max(84, _w(f[13], "手动解锁剧透") + 22)
               + 8 + max(138, _w(f[14], "合上这一页") + 36))
    assert pm_foot <= 692, f"Notebook modal footer overflows: {pm_foot}px"
    report["NotebookModal"] = max(pm_head, pm_foot)

    # ---------------- main menu: 6th cozy row (2 chips), narrower than row 2, clear of nav & progress badge ----------------
    if _folio_merged():
        # PC-14 did what the row-7 note below demanded: the extra-story chips (PC-13's sports-day + notebook among them)
        # became folio cards, the menu shrank to 4 rows and the gap to the badge grew. Both PC-13 entries stay one click
        # away, every row stays within row 2's width and clear of the navigation column (verify_pc14's shared measurer).
        import verify_pc14 as pc14
        mmm = pc14.measure_main_menu()
        assert scr_src.count('style "main_menu_cozy_chip"') == 13 and scr_src.count('style "main_menu_folio_chip"') == 1
        assert {"sportsday", "notebook"} <= set(mmm["folio_tabs"]) and not {"sportsday", "notebook"} & set(mmm["chips"])
        assert len(mmm["rows"]) < 6 and mmm["gap"] > mmm["base"]["gap"] == 26, mmm
        # (PC-15 re-flows the chips into 4 + 3 + 3 + 4 rows: the reference becomes the wider of rows 1-2 and EVERY row,
        #  not only the 2-chip ones, must clear the navigation column -- measured at the rows' real offset)
        row2_w = max(mmm["row_w"][:2]) if _rows_reflowed() else mmm["row_w"][1]
        for i, w in enumerate(mmm["row_w"]):
            assert w <= 760 and (i < 2 or w <= row2_w), f"Main menu row {i + 1} ({w}px) wider than the reference row"
            if len(mmm["rows"][i]) <= 2 or _rows_reflowed():
                assert mmm["left"][i] > NAV_RIGHT, f"Row {i + 1} ({mmm['left'][i]:.0f}px) collides with the navigation column"
        row6_w = mmm["row_w"][-1]
        row6_left = mmm["left"][-1]
        mm = _main_menu_metrics(f, sf, scr_src)
        assert (mm["top"], mm["bottom"]) == (mmm["top"], mmm["bottom"]), (mm, mmm)
    else:
        assert scr_src.count('style "main_menu_cozy_chip"') == 18, "Expected 4 + 4 + 4 + 2 + 2 + 2 main-menu cozy chips"
        assert "at main_title_in(0.92)" in scr_src and scr_src.index("at main_title_in(0.86)") < scr_src.index("at main_title_in(0.92)")
        best_names = [t["name"] for t in tiers] + ["待结案"]
        row6 = [max(18 + 6 + _w(f[13], f"失物招领箱 ({b})") + 24 for b in best_names), 18 + 6 + _w(f[13], "复盘本 (4/4)") + 24]
        row6_w = sum(row6) + 10
        row2_w = sum(18 + 6 + _w(f[13], t) + 24 for t in ("古籍修复台 (3/3)", "四季信笺匣 (4/4)", "旧广播电台 (3/3)", "千纸鹤陈列柜 (12/12)")) + 30
        assert row6_w < row2_w <= 760, f"Main menu row 6 ({row6_w}px) not narrower than row 2 ({row2_w}px)"
        row6_left = 568 - row6_w / 2
        assert row6_left > NAV_RIGHT, f"Row 6 ({row6_left:.0f}px) collides with the navigation column (<= {NAV_RIGHT}px)"
        mm = _main_menu_metrics(f, sf, scr_src)
    assert mm["bottom"] + 12 <= mm["badge_top"], f"Main-menu column bottom {mm['bottom']}px too close to badge top {mm['badge_top']}px"
    assert mm["top"] >= 20, f"Main-menu column top {mm['top']}px too close to the window edge"
    # a 7th row of the same height would leave < 12px to the badge: the next milestone has to merge chips instead
    if not _folio_merged():
        assert mm["bottom"] + 38 - round(0.29 * 38) + 12 > mm["badge_top"], "Row-7 headroom note is stale"
    report["MainMenuRow6"] = row6_w
    report["MainMenuRow6Left"] = round(row6_left)
    report["MainMenuRow2"] = row2_w
    report["MainMenuColumn"] = f"{mm['top']}..{mm['bottom']} (badge@{mm['badge_top']}, gap {mm['badge_top'] - mm['bottom']})"

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    n_ach = 32 + 2 * len(_later_present())  # PC-14 -> 2x17 = 34 (verified by verify_pc14); PC-13's 32 is the state before
    assert "grid 2 ach_grid_rows():" in ach_src and f"2×{n_ach // 2} = {n_ach}" in ach_src and f"2×{n_ach // 2} 共 {n_ach} 枚" in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_sports_lostfound", "ach_case_notebook"):
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
# 3. Sandbox runtime: case, rating, notebook (read-only), stamps, spoiler gate
################################################################################

def _case_block(src):
    m = re.search(r"^label sports_lostfound_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label sports_lostfound_case"
    return m.group(1)


def _strings(obj):
    """Every string value inside a nested data structure."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _strings(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            yield from _strings(v)


def _persistent_snapshot(mp, exclude=()):
    return {k: copy.deepcopy(v) for k, v in vars(mp).items() if k not in exclude}


def check_pc13_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 32 achievements (2x16), PC-13 pair appended after PC-12 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 32 and env["ach_grid_rows"]() == 16 and len(ach_ids) % 2 == 0
    assert ach_ids[-6:] == ["ach_theater_script", "ach_time_capsule", "ach_atelier_painting", "ach_message_wall",
                            "ach_sports_lostfound", "ach_case_notebook"], ach_ids[-6:]
    assert "ach_sports_lostfound" in mock_ach.registered and "ach_case_notebook" in mock_ach.registered

    # ---- B. case data ----
    case, items, legs, tiers = env["SPORTS_CASE"], env["SPORTS_ITEMS"], env["SPORTS_RELAY_LEGS"], env["SPORTS_RATING_TIERS"]
    assert case["label"] == "sports_lostfound_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert case["code"] == "SD-01" and case["code"] not in ("T-01", "L-01", "TH-01", "AT-01")
    assert [h["id"] for h in items] == [f"h{i}" for i in range(1, 7)]
    assert [h["code"] for h in items] == [f"LF-0{i}" for i in range(1, 7)]
    # the twist: every hotspot is a lost item with its own lost-and-found tag (time · place · finder)
    for h in items:
        assert re.fullmatch(r"\d\d:\d\d · \S.+", h["found"]) and h["finder"], h["id"]
    assert [k["name"] for k in legs] == ["终点", "交接", "起点", "跑者"], "The relay is run backwards: finish -> handoff -> start -> runner"
    assert [k["step"] for k in legs] == ["第一棒", "第二棒", "第三棒", "第四棒"]
    bat = {b["name"]: b["color"] for b in env["SPORTS_BATONS"]}
    for k in legs:
        assert bat[k["baton"]] == k["color"] and re.fullmatch(r"#[0-9a-f]{6}", k["color"]), k["id"]
    assert len({k["color"] for k in legs}) == 4, "Each leg gets its own baton colour"
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"] and [t["name"] for t in tiers] == ["金秒表", "银秒表", "铜秒表"]
    older_tiers = ({t["name"] for t in env["LIBRARY_RATING_TIERS"]} | {t["name"] for t in env["THEATER_RATING_TIERS"]}
                   | {t["name"] for t in env["ATELIER_RATING_TIERS"]})
    assert not older_tiers & {t["name"] for t in tiers}, "Sports rating must not reuse bookmarks / ticket stubs / frames"
    for h in items:
        assert h["scene"] in env["BG_LIGHT"] and len(h["detail"]) >= 70 and h["evidence"] and h["surface"]
        assert env["EVIDENCE_DETAILS"][h["evidence"]] == (h["observer"], h["detail"]), f"{h['id']} flip detail not registered"
    assert len({h["evidence"] for h in items}) == 6
    older_ev = ({h["evidence"] for h in env["LIBRARY_HOTSPOTS"]} | {h["evidence"] for h in env["THEATER_HOTSPOTS"]}
                | {h["evidence"] for h in env["ATELIER_HOTSPOTS"]})
    assert not older_ev & {h["evidence"] for h in items}
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]

    # ---- C. script structure: 6 lost items -> backwards 4-leg relay -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "sports_case_investigate")
    for i in range(1, 7):
        assert f"if not _sd_h{i}:" in inv and f'$ sports_inspect_item("h{i}")' in inv, f"lost item h{i} not playable"
    assert inv.count("jump sports_case_investigate") == 6 and "jump sports_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"sports_relay_k{i}")
        assert f"show screen sports_relay_banner({i - 1}, " in kb
        assert kb.count("$ _sd_mistakes += 1") == 2 and kb.count(f"jump sports_relay_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _sd_legs = {i}" in kb
        for m_wrong in re.finditer(r"\$ _sd_mistakes \+= 1(.*?)jump sports_relay_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct leg always at the same menu slot: {correct_positions}"
    assert correct_positions not in ([2, 1, 0, 2], [1, 0, 2, 1], [0, 2, 1, 2]), "Answer slots must not copy PC-10 / PC-11 / PC-12"
    assert "call _sports_finish_case(_sd_mistakes)" in blk and "label sports_case_resolution:" in blk
    assert blk.index("show screen evidence_book") < blk.index("label sports_case_investigate:"), "Evidence HUD must be up before the items are read"
    assert "hide screen evidence_book" in _label_block(src, "_sports_finish_case")
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the sports-day case"
    assert "truth_spoiler_unlocked" not in blk, "The sports-day case is fully public"
    for kw in SECRET_KEYWORDS:
        assert kw not in blk, f"Spoiler keyword `{kw}` in the public sports-day case"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    scenes_used = set(re.findall(r"^\s*scene\s+bg\s+(\w+)", blk, re.M))
    assert {"agency", "storeroom", "rooftop", "canteen", "sunset", "corridor"} <= scenes_used, scenes_used
    cast = set()
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        cast.add(ch)
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    assert {"alice", "mo", "zhang", "ayi"} <= cast, cast
    assert not cast & {"zhixia", "doudou"}, "Sprite-less newcomers must never be `show`n"
    defs_src = _read("game/definitions.rpy")
    module_defines = dict(re.findall(r"^define (\w+)\s*=\s*Character\(\"([^\"]+)\"", src, re.M))
    assert module_defines == {"zhixia": "许知夏", "doudou": "豆豆"}, module_defines
    every_rpy = "\n".join(p.read_text(encoding="utf-8-sig") for p in GAME_DIR.rglob("*.rpy") if p.name != Path(NEW_MODULE).name)
    for var, nm in module_defines.items():
        assert not re.search(rf"^define {var}\b", every_rpy, re.M), f"`{var}` already defined elsewhere"
        assert nm not in every_rpy, f"New character name `{nm}` collides with existing copy"
    speakers = set(re.findall(r"^\s+(\w+) \"", blk, re.M))
    for speaker in speakers:
        assert (re.search(rf"^define {speaker}\s*=\s*Character\(", defs_src, re.M)
                or re.search(rf"store\.{speaker}\s*=\s*Character\(", defs_src)
                or speaker in module_defines), f"Undefined speaker `{speaker}`"
    assert {"zhang", "ayi", "alice", "mo_note", "mc", "zhixia", "doudou", "tongxue"} <= speakers, speakers
    _sprite_slots_ok(blk, "sports_lostfound_case")
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_sd_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("sports_lostfound_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "sports_lostfound_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["sports_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "sports_lostfound_case" and rp[0][2]["scope"]["player_name"] == "陈默"
    assert ("SetField", (mp, "extras_tab", "sportsday"), {}) in act

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "SD-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_sports_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_sd_h{i}"] is True for i in range(1, 7))
    assert env["_sd_mistakes"] == 8 and env["_sd_legs"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {h["evidence"] for h in items}
    assert env["sports_get_record"]()["inspected"] == [f"h{i}" for i in range(1, 7)]
    assert env["sports_inspect_item"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievement ----
    assert [env["sports_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.sports_lostfound_record = {}
    mp.case_notebook_record = {}
    assert env["sports_case_solved_count"]() == 0 and env["sports_best_short"]() == "待结案"
    v0 = env["sports_render_view"]()
    assert v0["display_solution"] == "" and not any(v0["leg_shorts"]) and not any(v0["leg_fulls"])
    assert env["notebook_render_page"]("sportsday")["status"] == "open"
    r = env["sports_record_solve"](5)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_sports_lostfound") and not mock_ach.has("ach_case_notebook")
    assert env["notebook_render_page"]("sportsday")["status"] == "ready"
    r = env["sports_record_solve"](2)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 2
    r = env["sports_record_solve"](2)
    assert not r["new_record"] and r["replays"] == 3
    assert env["sports_gold_count"]() == 0
    v = env["sports_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["leg_shorts"] == [k["short"] for k in legs]
    env["sports_open_report_modal"]()
    assert env["sports_get_record"]()["report_viewed"] and any(s[0] == "sports_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False
    assert (env["library_case_solved_count"]() == 0 and env["theater_case_solved_count"]() == 0
            and env["atelier_case_solved_count"]() == 0), "Older cases keep their own stores"

    # ---- F. accordion sub-bar helpers (16 tabs / 5 groups) ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if t not in SALON_KEYS:
                continue  # PC-14+ tab: its counter lives in a later module (pill text verified by that milestone)
            txt = env["salon_tab_pill_text"](t)
            assert re.fullmatch(r"\S+ \d+/\d+", txt), f"pill text `{txt}`"
    assert env["salon_open_group"]("sportsday") == "closedlib" and env["salon_open_group"]("notebook") == "keepsake"
    assert env["salon_tab_pill_text"]("sportsday") == "操场 1/1" and env["salon_tab_pill_text"]("notebook") == "复盘 0/4"
    assert env["salon_tab_icon"]("sportsday").endswith("icon_lost_found_box.png")
    assert env["salon_tab_icon"]("notebook").endswith("icon_case_notebook.png")
    saved_fn = env.pop("notebook_stamped_count")
    assert env["salon_tab_pill_text"]("notebook") == "复盘", "Pill text must degrade gracefully"
    env["notebook_stamped_count"] = saved_fn

    # ---- G. notebook data: where each page reads from, and its own copy ----
    nb = env["NOTEBOOK_CASES"]
    assert [n["key"] for n in nb] == [c[0] for c in OLDER_CASES] and [n["tab"] for n in nb] == [c[8] for c in OLDER_CASES]
    for n, c in zip(nb, OLDER_CASES):
        assert (n["case_var"], n["hotspots_var"], n["links_var"], n["tiers_var"], n["store"]) == c[1:6], n["key"]
        assert re.fullmatch(r"#[0-9a-f]{6}", n["ink"]) and n["unit"] and n["index_label"]
        assert len(n["lesson"]) >= 30 and len(n["mo_margin"]) >= 12 and len(n["margin_secret"]) >= 40
        for fld in ("lesson", "mo_margin", "index_label", "unit"):
            for kw in SECRET_KEYWORDS:
                assert kw not in n[fld], f"`{kw}` in public notebook copy {n['key']}.{fld}"
        assert any(kw in n["margin_secret"] for kw in SECRET_KEYWORDS), f"{n['key']}: the gated note should be endgame material"
    assert len({n["ink"] for n in nb}) == 4
    for kw in SECRET_KEYWORDS:
        assert kw not in env["NOTEBOOK_MASK_NOTICE"] and kw not in env["NOTEBOOK_VERDICT"]
    # the notebook copies nothing: no older copy (>= 8 chars) appears inside the notebook's own text, and no data is redefined
    nb_text = "".join(n["lesson"] + n["mo_margin"] + n["margin_secret"] for n in nb) + env["NOTEBOOK_VERDICT"]
    for c in OLDER_CASES[:3]:
        for var in c[1:5]:
            for s in _strings(env[var]):
                if len(s) >= 8:
                    assert s not in nb_text, f"Notebook duplicates {var} copy: {s[:16]}"
            assert f"{var} =" not in src and f"{var}.append" not in src, f"PC-13 must not redefine / extend {var}"
    # static proof: the module never assigns an older case store, and the notebook functions never write anything
    # except their own two persistent fields nor call any writer of the cases
    for store in CASE_STORES[:3] + ["photo_album_records", "time_capsule_record", "message_wall_record"]:
        assert not re.search(rf"persistent\.{store}\s*=", src), f"PC-13 must never write persistent.{store}"
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    nb_funcs = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.FunctionDef) and (node.name.startswith("notebook_") or node.name.startswith("_nb_")):
            nb_funcs += 1
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Assign, ast.AugAssign)):
                    targets = sub.targets if isinstance(sub, ast.Assign) else [sub.target]
                    for t in targets:
                        if isinstance(t, ast.Attribute) and isinstance(t.value, ast.Name) and t.value.id == "persistent":
                            assert t.attr in ("case_notebook_record", "notebook_selected_case"), f"{node.name} writes persistent.{t.attr}"
                        if isinstance(t, ast.Subscript):
                            raise AssertionError(f"{node.name} mutates a container in place")
                if isinstance(sub, ast.Call):
                    fn = sub.func.id if isinstance(sub.func, ast.Name) else (sub.func.attr if isinstance(sub.func, ast.Attribute) else "")
                    assert not re.search(r"(record_solve|inspect_|_ensure_(library|theater|atelier|sports)|_write$|^_library|^_theater|^_atelier|^_sports)", fn) \
                        or fn == "_nb_write", f"{node.name} calls `{fn}`"
                    # only _nb_write may .update() — and only the fresh dict() copy of the notebook's own store
                    assert fn not in ("update", "append", "pop", "clear", "setdefault", "extend", "remove", "insert") \
                        or (node.name == "_nb_write" and fn == "update"), f"{node.name} mutates a container via .{fn}()"
    nb_write_src = re.search(r"    def _nb_write\(updates\):\n((?:        .*\n)+)", src).group(1)
    assert "store_dict = dict(_ensure_notebook_store())" in nb_write_src and "persistent.case_notebook_record = store_dict" in nb_write_src
    assert nb_funcs >= 10, nb_funcs

    # ---- H. notebook pages mirror each case's own saved state (public APIs drive the state) ----
    for fld in CASE_STORES + ["case_notebook_record"]:
        setattr(mp, fld, {})
    mock_ach.granted.clear()
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    for n in nb:
        p = env["notebook_render_page"](n["key"])
        assert p["available"] and not p["solved"] and p["status"] == "open" and p["best_name"] == "待结案"
        assert p["inspected_count"] == 0 and all(not r[3] and r[2] == "" for r in p["evidence_rows"])
        assert all(c[2] == "" for c in p["chain"]) and not any(p["chain_fulls"]) and p["display_solution"] == ""
        assert p["display_lesson"] == "" and p["display_mo_margin"] == "" and p["display_secret"] == ""
    # partial progress: a few hotspots inspected through each case's own inspect function
    env["library_inspect_hotspot"]("h2")
    env["theater_inspect_hotspot"]("h1")
    env["theater_inspect_hotspot"]("h4")
    env["atelier_inspect_hotspot"]("h6")
    env["sports_inspect_item"]("h3")
    for c in OLDER_CASES:
        rec = env[c[7]]()
        p = env["notebook_render_page"](c[0])
        hs = env[c[2]]
        assert p["inspected_count"] == len(rec["inspected"]) > 0, c[0]
        for h, row in zip(hs, p["evidence_rows"]):
            assert row[:2] == (h["code"], h["label"]) and row[3] is (h["id"] in rec["inspected"])
            assert row[2] == (h["evidence"] if row[3] else "")
        assert not p["solved"] and all(ch[2] == "" for ch in p["chain"])
    # solve each case through its own API with different mistakes -> each page shows that case's own record
    mistakes = {"library": 0, "theater": 2, "atelier": 4, "sportsday": 1}
    for c in OLDER_CASES:
        env[c[6]](mistakes[c[0]])
    env["theater_record_solve"](1)
    for c in OLDER_CASES:
        rec = env[c[7]]()
        p = env["notebook_render_page"](c[0])
        tdef = {t["key"]: t for t in env[c[4]]}[rec["best_tier"]]
        assert p["solved"] and p["replays"] == rec["replays"] and p["best_tier"] == rec["best_tier"]
        assert p["best_mistakes"] == rec["best_mistakes"] and p["best_name"] == tdef["name"] and tdef["title"] in p["best_line"]
        assert p["inspected_count"] == len(env[c[2]]) and all(r[3] for r in p["evidence_rows"])
        assert [ch[2] for ch in p["chain"]] == [k["short"] for k in env[c[3]]]
        assert p["chain_fulls"] == [k["full"] for k in env[c[3]]] and p["display_solution"] == env[c[1]]["solution_pub"]
        assert p["code"] == env[c[1]]["code"] and p["short_title"] == env[c[1]]["short_title"] and p["status"] == "ready"
    assert env["notebook_render_page"]("theater")["best_mistakes"] == 1 and env["notebook_render_page"]("theater")["replays"] == 2
    summ = env["notebook_summary"]()
    assert summ["solved"] == 4 and summ["gold"] == 1 and summ["replays"] == 5 and summ["best_mistakes_sum"] == 0 + 1 + 4 + 1
    assert summ["display_verdict"] == env["NOTEBOOK_VERDICT"]
    # graceful degradation: a missing module, a non-dict store, garbage fields
    saved_case = env.pop("LIBRARY_CASE")
    pmiss = env["notebook_render_page"]("library")
    assert not pmiss["available"] and pmiss["status"] == "missing" and pmiss["evidence_rows"] == [] and pmiss["best_name"] == "缺卷"
    assert env["notebook_stamp"]("library") is None
    env["LIBRARY_CASE"] = saved_case
    lib_rec = mp.closed_library_record
    mp.closed_library_record = None
    pnone = env["notebook_render_page"]("library")
    assert mp.closed_library_record is None, "Reading a missing store must not create it"
    assert not pnone["solved"] and pnone["inspected_count"] == 0
    mp.closed_library_record = {"solved": "yes", "replays": "x", "best_tier": "platinum", "best_mistakes": "?", "inspected": "h1"}
    garbage = copy.deepcopy(mp.closed_library_record)
    pg = env["notebook_render_page"]("library")
    assert pg["replays"] == 0 and pg["best_tier"] is None and pg["best_mistakes"] is None and pg["inspected_count"] == 0
    assert mp.closed_library_record == garbage, "Garbage store must be read, never normalised in place"
    mp.closed_library_record = lib_rec
    assert env["notebook_render_page"]("bogus")["key"] == "library"

    # ---- I. read-only snapshot proof: every notebook action leaves every other persistent field byte-identical ----
    own = ("case_notebook_record", "notebook_selected_case")
    mp.case_notebook_record = {}
    snap_before = _persistent_snapshot(mp, own)
    n_ops = 0
    for _round in range(2):
        for n in nb + [{"key": "bogus"}]:
            env["notebook_render_page"](n["key"])
            env["notebook_select"](n["key"])
            env["notebook_open_page"](n["key"])
            env["notebook_stamp"](n["key"], _round == 1)
            env["notebook_summary"]()
            n_ops += 5
        mp.te_cleared = not mp.te_cleared
    mp.te_cleared = False
    snap_after = _persistent_snapshot(mp, own + ("te_cleared",))
    snap_before.pop("te_cleared", None)
    assert snap_after == snap_before, "Notebook actions wrote persistent state outside the notebook's own fields"
    for store in CASE_STORES:
        assert snap_after[store] == snap_before[store], store
    assert env["notebook_stamped_count"]() == 4 and mock_ach.has("ach_case_notebook")
    assert any(s[0] == "notebook_page_modal" for s in mock_renpy.shown_screens)
    assert env["notebook_get_record"]()["read"] == ["library", "theater", "atelier", "sportsday"]

    # ---- J. stamp flow: unsolved -> gentle hint; solved -> stamp; four stamps -> achievement ----
    for fld in CASE_STORES + ["case_notebook_record"]:
        setattr(mp, fld, {})
    mock_ach.granted.clear()
    n_before = len(mock_renpy.notifications)
    for n in nb:
        assert env["notebook_stamp"](n["key"]) is None
    assert len(mock_renpy.notifications) == n_before + 4 and env["notebook_stamped_count"]() == 0
    for i, c in enumerate(OLDER_CASES):
        env[c[6]](0)
        assert env["notebook_render_page"](c[0])["status"] == "ready"
        rec = env["notebook_stamp"](c[0], i == 0)
        assert rec is not None and c[0] in rec["stamped"] and env["notebook_render_page"](c[0])["status"] == "stamped"
        assert env["notebook_stamp"](c[0])["stamped"].count(c[0]) == 1, "Stamping twice must stay idempotent"
        assert mock_ach.has("ach_case_notebook") is (i == 3), f"Notebook achievement after {i + 1} stamps"
    assert any(s[0] == "notebook_page_modal" and s[2].get("case_key") == "library" for s in mock_renpy.shown_screens)
    assert env["notebook_summary"]()["gold"] == 4 and env["notebook_summary"]()["stamped"] == 4
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False

    # ---- K. zero-side-channel spoiler gate (strongest state: 4 cases solved, 4 stamps) ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _clean(view, where):
        for s in _strings(view):
            for kw in SECRET_KEYWORDS:
                assert kw not in s, f"Spoiler keyword `{kw}` leaked in {where}"

    for n in nb:
        p = env["notebook_render_page"](n["key"])
        _clean(p, n["key"])
        assert p["solved"] and p["display_secret"] == "" and p["display_masked_notice"] == env["NOTEBOOK_MASK_NOTICE"]
        assert p["display_lesson"] == n["lesson"] and p["display_mo_margin"] == n["mo_margin"] and not p["unlocked"]
    _clean(env["notebook_summary"](), "summary")
    _clean(env["sports_render_view"](), "sports")
    saved_nb = {n["key"]: copy.deepcopy(n) for n in nb}
    before_p = {n["key"]: env["notebook_render_page"](n["key"]) for n in nb}
    before_s = env["notebook_summary"]()
    proofs = 0
    for filler in ("X" * 333, "", "周可小雪" * 50, "[player_name]{b}", "续"):
        for n in nb:
            n["margin_secret"] = filler + n["key"]
        for n in nb:
            assert env["notebook_render_page"](n["key"]) == before_p[n["key"]], f"Locked {n['key']} page depends on secret text"
            proofs += 1
        assert env["notebook_summary"]() == before_s
        proofs += 1
    for n in nb:
        key = n["key"]
        n.clear()
        n.update(saved_nb[key])
    assert all(n == saved_nb[n["key"]] for n in nb) and [n["key"] for n in nb] == [c[0] for c in OLDER_CASES]
    # unlocked: secrets appear on solved pages only
    mp.te_cleared = True
    for n in nb:
        p = env["notebook_render_page"](n["key"])
        assert p["unlocked"] and p["display_secret"] == n["margin_secret"] and p["display_masked_notice"] == ""
    mp.sports_lostfound_record = {}
    assert env["notebook_render_page"]("sportsday")["display_secret"] == "", "Unsolved page must stay blank even when unlocked"
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert "小雪" in env["notebook_render_page"]("library")["display_secret"]
    assert "周可" in env["notebook_render_page"]("theater")["display_secret"]
    mp.truth_spoiler_confirmed = False
    secret_blob = "".join(n["margin_secret"] for n in nb)
    assert sum(1 for kw in SECRET_KEYWORDS if kw in secret_blob) >= 3

    # ---- L. reset_all_progress clears PC-13 state and leaves main-story vars alone ----
    mp.sports_selected_item = "h5"
    mp.notebook_selected_case = "atelier"
    mp.extras_salon_group = "keepsake"
    env["reset_all_progress"]()
    assert env["sports_case_solved_count"]() == 0 and env["notebook_stamped_count"]() == 0
    assert mp.sports_lostfound_record == {} and mp.case_notebook_record == {}
    assert mp.sports_selected_item == "h1" and mp.notebook_selected_case == "library" and mp.extras_salon_group == "salon"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50

    data_cjk = _cjk(str(case)) + sum(_cjk(str(h)) for h in items) + sum(_cjk(str(k)) for k in legs)
    nb_pub_cjk = sum(_cjk(n["lesson"] + n["mo_margin"]) for n in nb) + _cjk(env["NOTEBOOK_VERDICT"])
    nb_sec_cjk = sum(_cjk(n["margin_secret"]) for n in nb)
    LOG_REPORT.update({"CaseScriptCJK": cjk_case, "CaseDataCJK": data_cjk, "NotebookPublicCJK": nb_pub_cjk,
                       "NotebookSecretCJK": nb_sec_cjk, "CorrectSlots": [c + 1 for c in correct_positions],
                       "ReadOnlyOps": n_ops, "SideChannelProofs": proofs})
    print(f"[PASS] PC-13 runtime: sports-day case (script CJK={cjk_case}, data CJK={data_cjk}, 6 tagged lost items -> "
          f"backwards 4-leg relay, correct slots {[c + 1 for c in correct_positions]}, 8 gentle loops, fail_count untouched) | "
          f"gold/silver/bronze stopwatches + best-record replay ladder + ach_sports_lostfound | 4-page case notebook "
          f"(public CJK={nb_pub_cjk}, secret CJK={nb_sec_cjk}) mirroring PC-10/11/12/13 saved state, {n_ops} notebook actions "
          f"with every other persistent field byte-identical, 4 stamps -> ach_case_notebook | 32 achievements (2x16) | "
          f"zero-leak spoiler gate + 5-way side-channel proof ({proofs} renders byte-identical)")
    return cjk_case


################################################################################
# 4. Zero intrusion, icons, text safety
################################################################################

def check_zero_intrusion_and_icons():
    res = subprocess.run(["git", "status", "--porcelain", "--", *MAIN_STORY_FILES, *OLDER_EXTRAS_MODULES],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay / older extras modules were modified!\n{res.stdout}"
    diff = subprocess.run(["git", "diff", "--numstat", "--", *MAIN_STORY_FILES, *OLDER_EXTRAS_MODULES],
                          cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert diff.stdout.strip() == "", "Main story / older module files have a diff"
    # whole-project guard: among *tracked* files only the PC-13 targets and the forward-compatible verifier edits may
    # differ from HEAD (new untracked files — the PC-13 module, its icons, later milestones' modules — are not flagged)
    allowed = set(PC13_TOUCHED_FILES + FORWARD_COMPAT_TESTS + ["tests/verify_pc13.py"])
    if _folio_merged():
        allowed.add("tests/verify_pc14.py")  # PC-14's own verifier (tracked once PC-14 is committed)
    if _rows_reflowed():
        allowed.add("tests/verify_pc15.py")  # PC-15's own verifier (tracked once PC-15 is committed)
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

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC13_TOUCHED_FILES if p != NEW_MODULE], *FORWARD_COMPAT_TESTS],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            txt = line[1:]
            assert "<svg" not in txt.lower() and "�" not in txt and not EMOJI_RE.search(txt), f"Bad added line: {txt}"

    new_src = _read(NEW_MODULE)
    raw = (ROOT / NEW_MODULE).read_bytes()
    assert b"\r\n" not in raw, "PC-13 module must use LF line endings like its siblings"
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src
    for rel in PC13_TOUCHED_FILES:
        assert b"\r\n" not in (ROOT / rel).read_bytes(), f"{rel} gained CRLF line endings"

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every data-driven text that prints case / item / notebook copy opts out of interpolation
    for ln in new_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|SPORTS_CASE|h_obj|k_obj|t_obj|n_obj|r_obj|b_obj|_sh|_sv|_np|_ip|_pm|_mv|_rv|_ns|_ev|_ch|_fc)\[', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
        if re.match(r'text \(".*%s.*" % ', s) and re.search(r'\[("[a-z_]+"|\d)\]', s):
            assert "substitute False" in s, f"Formatted data text without `substitute False`: {s}"
        if re.match(r"text \(_\w+\[", s) or re.match(r"text \(_ip|text \(_np|text \(_pm", s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched; "
          f"{len(OLDER_EXTRAS_MODULES)} older extras modules byte-identical; only PC-13 targets + icons + forward-compatible "
          f"verifiers differ from HEAD), no Emoji/SVG/tabs/CRLF, {n_str} interpolation-safe CJK data strings")

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
            if rel_icon in PC13_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-13 set: {', '.join(Path(x).name for x in PC13_UI_ICONS)}")


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

    for img in ("ui_icon_lost_found_box", "ui_icon_relay_baton", "ui_icon_case_notebook", "ui_icon_evidence_tag"):
        assert img in images, f"Missing image alias {img}"
    # (PC-16 deletes the unused four-tab page extras_case_notebook; its page modal stays)
    for scr in ("extras_sports_lostfound", "sports_report_modal", "sports_relay_banner", "sports_result_card",
                *(() if _pc16_present() else ("extras_case_notebook",)), "notebook_page_modal", "extras_achievements", "deduction_cutin", "evidence_book",
                "confirm", "extras_closed_library", "extras_rainy_theater", "extras_atelier_painting"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("sports_lostfound_case", "sports_case_investigate", "sports_case_review_intro", "sports_relay_k1",
                "sports_relay_k2", "sports_relay_k3", "sports_relay_k4", "sports_case_resolution",
                "_sports_init_sandbox", "_sports_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"
    for t in ("sports_baton_spin", "notebook_tab_sway"):
        assert t in transforms
    # tinted panels are the pages' visual identity: they must wrap a real Frame and use only Ren'Py matrix helpers
    tinted = re.findall(r"background Transform\(Frame\(\"(gui/[a-z_]+\.png)\", \d+, \d+\), matrixcolor=TintMatrix\(\"#[0-9a-f]{6}\"\) \* SaturationMatrix\(0\.0\)\)", new_src)
    assert len(tinted) == 6 and all((GAME_DIR / g).is_file() for g in tinted), tinted
    # the compact sub-bar pill only overrides width / padding (text size and colours stay those of the 66px pills)
    blk = re.search(r"^style salon_quad_pill is bookstreet_subtab_pill:\n((?:    .*\n)+)", new_src, re.M).group(1)
    assert sorted(ln.split()[0] for ln in blk.strip().splitlines()) == ["padding", "xminimum"]
    assert re.search(r"^style salon_quad_pill_text is bookstreet_subtab_pill_text$", new_src, re.M)

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC13_TOUCHED_FILES:
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
    for icon in PC13_UI_ICONS:
        assert icon in refs, f"PC-13 icon {icon} is not wired into any .rpy"
    audio_src = _read("game/audio.rpy")
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", audio_src), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", audio_src), f"Undefined bgm {bgm}"
    for snd in set(re.findall(r'renpy\.sound\.play\("([^"]+)"\)', new_src)):
        assert (GAME_DIR / snd).is_file(), snd

    extra_src = _read("game/extra.rpy")
    assert '"sports_lostfound_case":' in extra_src
    assert extra_src.count("or name in _SPORTS_CASE_LABELS") == 2
    for older in ("_ATELIER_CASE_LABELS", "_THEATER_CASE_LABELS", "_CLOSED_LIBRARY_LABELS"):
        assert extra_src.count(f"or name in {older}") == 2, f"{older} callback wiring must stay intact"
    assert 'style ("salon_quad_pill" if len(_gtabs) >= 4 else "bookstreet_subtab_pill")' in extra_src
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("sports_lostfound_record", "sports_selected_item", "case_notebook_record", "notebook_selected_case"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld
    scr_src = _read("game/screens.rpy")
    assert 'SetField(persistent, "extras_tab", "sportsday")' in scr_src and 'SetField(persistent, "extras_tab", "notebook")' in scr_src
    assert "sports_best_short()" in scr_src and "notebook_stamped_count()" in scr_src

    for rel in PC13_TOUCHED_FILES:
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
    pc13_shots = ("ui_13a_sports_unsolved.png", "ui_13b_sports_gold.png", "ui_13c_sports_report.png",
                  "ui_13d_sports_relay_banner.png", "ui_13e_sports_result_card.png", "ui_13f_notebook_masked.png",
                  "ui_13g_notebook_partial.png", "ui_13h_notebook_unmasked.png", "ui_13i_notebook_page_modal.png")
    for shot in pc13_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    start = shots.index("_saved_sd_rec")
    pc13_seg = shots[start:].split("ui_07_confirm.png")[0]
    assert [pc13_seg.index(s) for s in pc13_shots] == sorted(pc13_seg.index(s) for s in pc13_shots), "PC-13 shots out of order"
    assert shots.index("ui_12h_wall_card_modal.png") < start, "PC-13 audit must run after the PC-12 block"
    for bad in ("ach_grant", "notebook_stamp(", "notebook_open_page(", "sports_record_solve(", "sports_inspect_item(",
                "atelier_record_solve(", "theater_record_solve(", "library_record_solve(", "wall_pin(", "capsule_place("):
        assert bad not in pc13_seg, f"UI audit must not call `{bad}` (would grant real progress/achievements)"
    for fld in ("sports_lostfound_record", "sports_selected_item", "case_notebook_record", "notebook_selected_case",
                "closed_library_record", "theater_script_record", "atelier_painting_record", "extras_salon_group",
                "te_cleared", "truth_spoiler_confirmed"):
        assert f"persistent.{fld} = _saved_" in pc13_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-13 coverage ({len(pc13_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc13_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC13_REPORT " + " ".join(f"{k}={v}" for k, v in LOG_REPORT.items()))
    print("PC13_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
