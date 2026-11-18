#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-10 Static, Behavioral, Pixel-Budget, Closed-Library Vanished-Shelf Case (replayable, rated),
Detective Club Group-Photo Album, Spoiler-Gate (side-channel proof), Salon Accordion Sub-Bar,
Asset & Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the game's
init-python blocks inside the same mocked sandbox verify_pc9.py uses, plus the PC-10 module.
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
NEW_MODULE = "game/vanished_shelf_album.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402
import verify_pc9 as pc9  # noqa: E402

extract_python_blocks = pc8.extract_python_blocks
_paren_delta = pc8._paren_delta
_w = pc9._w
_style_prop = pc9._style_prop
_cjk = pc9._cjk

PC10_UI_ICONS = [
    "images/ui/icon_closed_library.png",
    "images/ui/icon_library_key.png",
    "images/ui/icon_photo_album.png",
    "images/ui/icon_club_photo.png",
]

REQUIRED_UI_ICONS = pc9.REQUIRED_UI_ICONS + PC10_UI_ICONS
MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC10_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/tests/ui_shots.rpy",
]

SECRET_KEYWORDS = pc9.SECRET_KEYWORDS
EMOJI_RE = pc8.EMOJI_RE

SALON_KEYS = ("teaparty", "lexicon", "restoration", "letterbox", "origami",
              "radio", "planetarium", "badges", "library", "album")

CJK_LINE = 1.45  # Noto Sans/Serif SC line box ~= 1.45 x size

# Forward compatibility (PC-11+): later milestones append salon tabs whose counters live in their own,
# later-initialising modules. They are loaded only into the sub-bar measuring sandbox (never into the PC-10
# runtime sandbox, so the 26-achievement / PC-10 behaviour checks below keep their original meaning).
LATER_SALON_MODULES = ["game/wings_theater_capsule.rpy", "game/yearbook_atelier_wall.rpy", "game/zephyr_relay_casebook.rpy",
                       "game/zoetrope_shadow_folio.rpy", "game/zubenelgenubi_meteor_casebook.rpy",
                       "game/zwembad_locker_casebook.rpy"]


def _later_salon_present():
    return any((ROOT / rel).is_file() for rel in LATER_SALON_MODULES)


def _pc12_present():
    """PC-12 adds a 5th salon group, a 5th main-menu chip row and achievements 29-30 (verified by verify_pc12)."""
    return (ROOT / "game/yearbook_atelier_wall.rpy").is_file()


def _pc13_present():
    """PC-13 adds a 4th tab to groups 4 and 5, a 6th main-menu chip row and achievements 31-32 (verified by verify_pc13)."""
    return (ROOT / "game/zephyr_relay_casebook.rpy").is_file()


def _pc14_present():
    """PC-14 adds a 5th tab to group 4, merges the main menu's extra-story chips into one "番外卷宗" folio entry
    (6 rows -> 4 rows) and adds achievements 33-34 (verified by verify_pc14)."""
    return (ROOT / "game/zoetrope_shadow_folio.rpy").is_file()


def _pc15_present():
    """PC-15 appends a 6th tab to group 4 (48px sext pills), re-flows the main-menu chips into 4 + 3 + 3 + 4 rows clear of
    the navigation column and adds achievements 35-36 (verified by verify_pc15)."""
    return (ROOT / "game/zubenelgenubi_meteor_casebook.rpy").is_file()


def _pc16_present():
    """PC-16 appends a 7th short case (the meteor-night tab moves to the "starlit" group, the pool case joins "closedlib"),
    expands the casebook to seven pages, removes PC-13's unused four-tab casebook page and adds achievements 37-38
    (verified by verify_pc16)."""
    return (ROOT / "game/zwembad_locker_casebook.rpy").is_file()


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (13, 14, 17, 18, 19, 20, 21, 40)}
    return f, sf


def _wb(fnt, text):
    """Synthetic-bold allowance: Ren'Py emboldens the regular face, ~6% wider."""
    return int(round(_w(fnt, text) * 1.06)) + 1


def _read(rel):
    return (ROOT / rel).read_text(encoding="utf-8-sig")


################################################################################
# 0. Sandbox (PC-9 sandbox + PC-10 module)
################################################################################

def _sandbox_env():
    env, mock_renpy, mock_ach, mp = pc9._sandbox_env()
    for k, v in {
        "closed_library_record": {}, "library_selected_hotspot": "h1", "photo_album_records": {},
        "album_selected_photo": "ph01", "extras_salon_group": "salon",
    }.items():
        setattr(mp, k, v)
    for _ln, code, is_init in extract_python_blocks(ROOT / NEW_MODULE):
        if is_init:
            exec(code, env)
    return env, mock_renpy, mock_ach, mp


def _literal(src, name, opener="[", closer="]"):
    m = re.search(rf"{name}\s*=\s*\{opener}(.*?)\n    \{closer}", src, re.S)
    assert m, f"Could not locate {name}"
    return ast.literal_eval(opener + m.group(1) + closer)


def measure_salon_subbar():
    """Measure every open-group state of the PC-10 accordion salon sub-bar (shared with verify_pc9)."""
    f, _sf = _fonts()
    extra_src = _read("game/extra.rpy")
    bs_src = _read("game/bookstreet_seasons.rpy")
    new_src = _read(NEW_MODULE)
    tp_src = _read("game/tea_party_lexicon.rpy")
    groups = ast.literal_eval("[" + re.search(r"EXTRAS_SALON_GROUPS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    pills = _literal(extra_src, "_SALON_TAB_PILLS", "{", "}")
    icons = _literal(extra_src, "_SALON_TAB_ICONS", "{", "}")

    env = _sandbox_env()[0]
    for rel in LATER_SALON_MODULES:
        if (ROOT / rel).is_file():
            for _ln, code, is_init in extract_python_blocks(ROOT / rel):
                if is_init:
                    exec(code, env)
    totals = {}
    for key, (_name, fn_name, total_src) in pills.items():
        totals[key] = total_src if isinstance(total_src, int) else len(env[total_src])
        assert fn_name in env, f"Sub-bar counter `{fn_name}` is not defined"

    pill_min = int(_style_prop(bs_src, "bookstreet_subtab_pill", "xminimum"))
    pill_pad = int(_style_prop(bs_src, "bookstreet_subtab_pill", "padding").strip("()").split(",")[0])
    pill_size = int(_style_prop(bs_src, "bookstreet_subtab_pill_text", "size"))
    grp_min = int(_style_prop(new_src, "salon_group_pill", "xminimum"))
    assert (pill_min, pill_pad, pill_size) == (66, 6, 11)
    assert re.search(r"^style salon_group_pill is bookstreet_subtab_pill:", new_src, re.M)
    assert re.search(r"^style salon_group_pill_text is bookstreet_subtab_pill_text:", new_src, re.M)
    inner = int(_style_prop(tp_src, "salon_subbar_frame", "xsize")) - 2 * 10
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    spacing = int(re.search(r"spacing (\d+)", blk).group(1))
    assert spacing == 4 and "for _gkey, _glabel, _gicon, _gtabs in EXTRAS_SALON_GROUPS:" in blk
    assert "add salon_tab_icon(_tkey) xysize (14, 14)" in blk and "add _gicon xysize (14, 14)" in blk

    # Forward compatibility (PC-13+): an open group holding `quad_n`+ tabs renders its pills in the compact style named
    # by extra.rpy's sub-bar (`style ("<quad>" if len(_gtabs) >= N else "bookstreet_subtab_pill")`); mirror that rule here
    quad = re.search(r'style \("(\w+)" if len\(_gtabs\) >= (\d+) else "bookstreet_subtab_pill"\)', blk)
    quad_n, quad_min, quad_pad = 10 ** 6, pill_min, pill_pad
    if quad:
        all_src = "\n".join(p.read_text(encoding="utf-8-sig") for p in sorted(GAME_DIR.glob("*.rpy")))
        quad_n = int(quad.group(2))
        quad_min = int(_style_prop(all_src, quad.group(1), "xminimum"))
        quad_pad = int(_style_prop(all_src, quad.group(1), "padding").strip("()").split(",")[0])
        assert re.search(rf"^style {quad.group(1)} is bookstreet_subtab_pill:", all_src, re.M)
        assert re.search(rf"^style {quad.group(1)}_text is bookstreet_subtab_pill_text$", all_src, re.M), "Compact pill text must keep size 11"

    # Forward compatibility (PC-14+): an open group holding `quint_n`+ tabs shows ONE leading icon (the current tab's) and
    # then its pills in the style named by extra.rpy's `if _gkey == _salon_open and len(_gtabs) >= N:` branch; mirror it here
    quint = re.search(r"if _gkey == _salon_open and len\(_gtabs\) >= (\d+):\n(.*?)\n\s+elif _gkey == _salon_open:", blk, re.S)
    quint_n, quint_min, quint_pad = 10 ** 6, pill_min, pill_pad
    # Forward compatibility (PC-15+): inside that one-icon branch a group holding `sext_n`+ tabs switches to an even more
    # compact pill (`style ("<sext>" if len(_gtabs) >= N else "<quint>")`); mirror that rule here as well
    sext, sext_n, sext_min, sext_pad = None, 10 ** 6, pill_min, pill_pad
    if quint:
        all_src = "\n".join(p.read_text(encoding="utf-8-sig") for p in sorted(GAME_DIR.glob("*.rpy")))
        qblk = quint.group(2)
        quint_n = int(quint.group(1))
        sext = re.search(r'style \("(\w+)" if len\(_gtabs\) >= (\d+) else "(\w+)"\)', qblk)
        qstyle = sext.group(3) if sext else re.search(r'style "(\w+)"', qblk).group(1)
        quint_min = int(_style_prop(all_src, qstyle, "xminimum"))
        quint_pad = int(_style_prop(all_src, qstyle, "padding").strip("()").split(",")[0])
        assert qblk.count("add salon_tab_icon(") == 1 and "add salon_tab_icon(_tkey)" not in qblk, "Quint group: one leading icon only"
        compact_styles = [qstyle]
        if sext:
            sext_n = int(sext.group(2))
            assert sext_n > quint_n, "The sext rule must apply to larger groups than the quint rule"
            sext_min = int(_style_prop(all_src, sext.group(1), "xminimum"))
            sext_pad = int(_style_prop(all_src, sext.group(1), "padding").strip("()").split(",")[0])
            compact_styles.append(sext.group(1))
        for st in compact_styles:
            assert re.search(rf"^style {st} is bookstreet_subtab_pill:", all_src, re.M)
            assert re.search(rf"^style {st}_text is bookstreet_subtab_pill_text$", all_src, re.M), "Compact pill text must keep size 11"

    def pill_w(text, compact=False, quint_style=False, sext_style=False):
        if sext_style:
            return max(sext_min, _w(f[pill_size], text) + 2 * sext_pad)
        if quint_style:
            return max(quint_min, _w(f[pill_size], text) + 2 * quint_pad)
        if compact:
            return max(quad_min, _w(f[pill_size], text) + 2 * quad_pad)
        return max(pill_min, _w(f[pill_size], text) + 2 * pill_pad)

    per_group = {}
    for gkey, glabel, gicon, gtabs in groups:
        assert (GAME_DIR / gicon).is_file(), gicon
        widths = []
        for okey, olabel, _oicon, otabs in groups:
            if okey == gkey and len(otabs) >= quint_n:
                is_sext = len(otabs) >= sext_n
                widths += [14] + [pill_w(f"{pills[t][0]} {totals[t]}/{totals[t]}", quint_style=not is_sext, sext_style=is_sext)
                                  for t in otabs]
            elif okey == gkey:
                for t in otabs:
                    name = pills[t][0]
                    widths += [14, pill_w(f"{name} {totals[t]}/{totals[t]}", len(otabs) >= quad_n)]
            else:
                widths += [14, max(grp_min, _w(f[pill_size], olabel) + 2 * pill_pad)]
        per_group[gkey] = sum(widths) + spacing * (len(widths) - 1)
    keys = [t for g in groups for t in g[3]]
    for k in keys:
        assert (GAME_DIR / icons[k]).is_file(), icons[k]
    return {"per_group": per_group, "worst": max(per_group.values()), "keys": keys, "inner": inner,
            "groups": groups, "pills": pills, "totals": totals, "quad": (quad_n, quad_min, quad_pad) if quad else None,
            "quint": (quint_n, quint_min, quint_pad) if quint else None,
            "sext": (sext_n, sext_min, sext_pad) if sext else None}


################################################################################
# 1. Python syntax
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 28, f"Expected >=28 .rpy files (including vanished_shelf_album.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    # the PC-10 module must initialise after stargazer_badges.rpy so its 2 achievements append last
    assert names.index("vanished_shelf_album.rpy") > names.index("stargazer_badges.rpy")
    assert names.index("vanished_shelf_album.rpy") > names.index("tea_party_lexicon.rpy")

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
          f"({total_blocks} python blocks + {total_inline} inline `$` statements)")


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = _read("game/extra.rpy")
    new_src = _read(NEW_MODULE)
    scr_src = _read("game/screens.rpy")
    bs_src = _read("game/bookstreet_seasons.rpy")
    env = _sandbox_env()[0]
    report = {}

    # 2.1 primary 9 tabs + every older sub-tab registry untouched; PC-10 registry added
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px
    for name, keys in (("EXTRAS_SALON_TABS", ["teaparty", "lexicon"]), ("EXTRAS_BOOKSTREET_TABS", ["restoration", "letterbox"]),
                       ("EXTRAS_RADIO_ORIGAMI_TABS", ["radio", "origami"]), ("EXTRAS_STARLIT_TABS", ["planetarium", "badges"]),
                       ("EXTRAS_CLOSED_LIBRARY_TABS", ["library", "album"])):
        reg = ast.literal_eval("[" + re.search(rf"{name}\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
        assert [k for k, _ in reg] == keys, f"{name} = {reg}"

    # 2.2 accordion sub-bar: 10 tabs in 4 groups, each exactly once; every open state <= 702px
    #     (PC-11+ may append tabs into these 4 groups: the 10 PC-10 tabs must all stay, each exactly once)
    sb = measure_salon_subbar()
    assert len(sb["keys"]) == len(set(sb["keys"])), f"Duplicate salon tab: {sb['keys']}"
    if _later_salon_present():
        assert set(SALON_KEYS) <= set(sb["keys"]), f"PC-10 salon tabs missing: {set(SALON_KEYS) - set(sb['keys'])}"
    else:
        assert sorted(sb["keys"]) == sorted(SALON_KEYS) and len(sb["keys"]) == 10
    # PC-12 splits the 4th group into "closedlib" + a 5th "keepsake" group (every open state re-measured by verify_pc12);
    # the four PC-10 group keys stay first, so persisted extras_salon_group values remain valid
    group_keys = [g[0] for g in sb["groups"]]
    assert group_keys[:4] == ["salon", "bookstreet", "starlit", "closedlib"], group_keys
    assert group_keys[4:] == (["keepsake"] if _pc12_present() else []), group_keys
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    report["SubBarWorst"] = sb["worst"]
    for k in SALON_KEYS:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"

    # 2.3 subtitle (unchanged since PC-9) still one line
    sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src).group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)
    avail = 1280 - 400 - (_w(sf[40], "鉴赏") + 8) - 16
    assert sub_px <= avail and "侦探社沙龙" in sub
    report["Subtitle"] = sub_px

    # 2.4 vertical budget of extras(): 34 + 7 + 30 + 7 + 468 == 546
    assert "ysize 468" in extra_src and "spacing 7" in extra_src
    assert int(_style_prop(_read("game/tea_party_lexicon.rpy"), "salon_subbar_frame", "ysize")) == 30
    assert int(_style_prop(bs_src, "bookstreet_subtab_pill", "ysize")) == 24

    # ---------------- library page ----------------
    case = env["LIBRARY_CASE"]
    hotspots = env["LIBRARY_HOTSPOTS"]
    links = env["LIBRARY_CHAIN_LINKS"]
    tiers = env["LIBRARY_RATING_TIERS"]
    console_inner = 722 - 2 * int(_style_prop(new_src, "library_console_card", "padding").strip("()").split(",")[0])
    assert console_inner == 694
    clue_w = int(_style_prop(bs_src, "restoration_clue_card", "xsize"))
    assert "grid 3 2:" in new_src and len(hotspots) == 6
    assert 3 * clue_w + 2 * 8 == console_inner, "Hotspot 3x2 grid must equal 694px"
    for h in hotspots:
        line = _wb(f[11], f"{h['code']} · {h['label']}") + 4 + _wb(f[10], "已勘查")
        assert line <= clue_w - 16, f"Hotspot label `{h['label']}` overflows: {line}px"
    slot_w = int(_style_prop(new_src, "library_chain_slot", "xsize"))
    assert 4 * slot_w + 3 * 8 <= console_inner, "Chain slots overflow"
    for k in links:
        assert _wb(f[11], f"{k['step']} · {k['name']}") <= slot_w - 16
        assert _w(f[12], k["short"]) <= slot_w - 16, f"Chain short `{k['short']}` overflows slot"
    tier_w = int(_style_prop(new_src, "library_tier_chip", "xsize"))
    scroll_inner = console_inner - 2 * 12
    assert 3 * tier_w + 2 * 8 <= scroll_inner, "Tier chips overflow 670px"
    for t in tiers:
        chip = _w(f[12], f"{t['name']}「{t['title']}」") + 8 + _w(f[11], t["rule"])
        assert chip <= tier_w - 16, f"Tier chip `{t['name']}` overflows: {chip}px"
    best_lines = [f"{t['name']}「{t['title']}」 · 最少失误 99 次" for t in tiers]
    rate_row = 16 + 6 + _w(sf[13], "书签评级 · 重玩挑战") + 10 + max(_w(f[11], "历史最佳：" + b) for b in best_lines)
    assert rate_row <= scroll_inner, f"Rating header row overflows: {rate_row}px"

    hdr_right = (max(96, 14 + 4 + _w(f[12], "最佳 待结案") + 20) + 6 + max(96, _w(f[12], "结案 99 次") + 20))
    hdr = 36 + 10 + 398 + hdr_right
    assert hdr <= console_inner, f"Library header overflows: {hdr}px"
    for s in ("已结案 · 四环推理链全部闭合 · 可随时重返闭馆夜冲击金书签", "周五闭馆后，一整架校友文集凭空消失 · 六处现场等你勘查"):
        assert _w(f[12], s) <= 398, f"Library header line wraps: {s}"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= console_inner
    assert 86 + 8 + _w(sf[17], f"《{case['short_title']}》") <= 492
    tag_line = _w(f[12], f"{case['time_tag']}  ·  {case['companions']}")
    assert tag_line <= 492, f"Library time-tag line overflows 492px: {tag_line}px"
    lamp = 15 + 6 + _w(f[12], "馆内光影：" + case["lighting_note"])
    assert lamp <= 492, f"Library lighting line overflows: {lamp}px"
    arch_solved = max(_w(f[12], f"结案档案：{b}（已结案 99 次 · 六处痕迹全勘查）") for b in best_lines)
    arch_open = _w(f[12], "结案档案：尚未结案（已勘查 6/6 处，可先翻看下方勘查点，再走进闭馆的图书馆）")
    assert arch_solved <= 492 and arch_open <= 492, f"Library archive line overflows: {arch_solved}/{arch_open}px"
    report["LibArchive"] = max(arch_solved, arch_open)

    lib_footer = (_w(f[12], "零失误复盘四环推理链可获金书签 · 已结案 99 次") + 10 + max(84, _w(f[13], "展阅结案报告") + 22)
                  + 8 + max(146, _w(f[15], "推开图书馆的门") + 36))
    assert lib_footer <= console_inner, f"Library footer overflows: {lib_footer}px"
    report["LibFooter"] = lib_footer
    quick = (20 + 10 + _w(sf[14], "合照相册 · P-10 闭馆夜书架合影") + 10 + _w(f[12], "（结案后拍摄）")
             + 8 + max(84, _w(f[13], "翻开相册") + 22))
    assert quick <= 722 - 24, f"Library quick row overflows: {quick}px"

    # in-scene banner (760 - 2 x 16 = 728 inner) and prompt lines parsed from the script
    banner_slot = int(_style_prop(new_src, "library_banner_slot", "xsize"))
    assert 4 * banner_slot + 3 * 6 <= 728
    for k in links:
        assert _wb(f[10], f"{k['step']} · {k['name']}") <= banner_slot - 16 and _w(f[11], k["short"]) <= banner_slot - 16
    head = 22 + 8 + _wb(f[12], "闭馆夜 · 推理链复盘") + 8 + _w(f[11], "已扣上 4/4 环 · 失误只计入本案书签评级，不影响主线")
    assert head <= 728, f"Banner header overflows: {head}px"
    prompts = re.findall(r'show screen library_chain_banner\((\d), "([^"]+)"\)', new_src)
    assert [int(p[0]) for p in prompts] == [0, 1, 2, 3]
    widest_prompt = max(_w(f[14], p[1]) for p in prompts)
    assert widest_prompt <= 728, f"Banner prompt wraps: {widest_prompt}px"
    report["BannerPrompt"] = widest_prompt

    # result card (660 - 2 x 26 = 608; inner hud frame 608 - 28 = 580) & report modal (740 - 48 = 692)
    title_row = 54 + 14 + max(_wb(f[13], "闭馆夜结案 · L-01"), _w(sf[21], f"《{case['short_title']}》"),
                              max(_w(f[14], f"本局评级：【{t['name']} · {t['title']}】") for t in tiers))
    assert title_row <= 608
    for s in ["本局失误 99 次（只计入闭馆夜评级，不影响主线）",
              "首次结案 · 推理链与结案报告已写入鉴赏室「闭馆图书馆」分页，P-10 合照可以冲洗了",
              "重玩挑战 · 刷新个人纪录！这一局比以往任何一次都更少走弯路",
              "重玩挑战 · 再次以金书签结案，闭馆夜名侦探实至名归",
              "重玩挑战 · 零失误复盘四环推理链，就能把金书签夹进笔记本"] + \
             [f"历史最佳：{t['name']}「{t['title']}」 · 最少失误 99 次 · 累计结案 99 次" for t in tiers]:
        assert _w(f[12], s) <= 580, f"Result-card line wraps ({_w(f[12], s)}px): {s}"
    rm_head = 40 + 12 + _w(sf[20], f"L-01 · 《{case['short_title']}》") + 10 + 30 + 6 + _wb(f[13], "待结案")
    assert rm_head <= 692
    rm_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上结案报告") + 10 + max(84, _w(f[13], "重返闭馆夜") + 22)
               + 10 + max(116, _w(f[14], "合上报告") + 36))
    assert rm_foot <= 692, f"Report modal footer overflows: {rm_foot}px"

    # ---------------- album page ----------------
    photos = env["ALBUM_PHOTOS"]
    card_w = int(_style_prop(new_src, "album_photo_card", "xsize"))
    card_h = int(_style_prop(new_src, "album_photo_card", "ysize"))
    thumb_fw = int(_style_prop(new_src, "album_thumb_frame", "xsize"))
    thumb_fh = int(_style_prop(new_src, "album_thumb_frame", "ysize"))
    assert "grid 4 ((len(ALBUM_PHOTOS) + 3) // 4):" in new_src and len(photos) == 12
    assert 4 * card_w + 3 * 10 == 722, "Album 4-column wall must equal 722px"
    assert thumb_fw == card_w - 18 and "xysize (151, 54)" in new_src and (thumb_fw - 4, thumb_fh - 4) == (151, 54)
    card_stack = thumb_fh + 3 + round(11 * CJK_LINE) + 3 + round(13 * CJK_LINE)
    assert card_stack <= card_h - 14, f"Album card content too tall: {card_stack}px"
    for p in photos:
        assert _w(sf[13], p["title"]) <= thumb_fw, f"Album title `{p['title']}` overflows card"
        assert _wb(f[11], p["code"]) + 6 + _wb(f[10], "已冲洗") <= thumb_fw
    polaroid_w = int(_style_prop(new_src, "album_polaroid_frame", "xsize"))
    assert polaroid_w == 184 and "xysize (172, 94)" in new_src
    det_head = polaroid_w + 14 + 380 + max(96, _w(f[11], "已冲洗 99 次") + 20)
    assert det_head <= console_inner, f"Album detail header overflows: {det_head}px"
    widest_detail = 0
    for p in photos:
        for s in (f"拍摄地点：{p['place']}", f"同框：{p['cast']}",
                  f"冲洗条件：{p['condition']}（当前 {p['need']}/{p['need']}）"):
            widest_detail = max(widest_detail, _w(f[12], s))
            assert _w(f[12], s) <= 380, f"Album detail line wraps ({_w(f[12], s)}px): {s}"
        assert 86 + 6 + _w(sf[18], f"《{p['title']}》") <= 380
    report["AlbumDetail"] = widest_detail
    rule = (16 + 6 + _w(f[11], "可冲洗 12 · 已冲洗 12 · 首次完成对应玩法即可冲洗合照") + 12
            + _w(f[11], "集齐十二张解锁成就「侦探社合照收藏家」"))
    assert rule <= 702, f"Album rule bar overflows: {rule}px"
    report["AlbumRuleBar"] = rule
    al_hdr = 36 + 10 + 398 + max(96, 14 + 4 + _w(f[12], "已冲洗 12/12") + 20) + 6 + max(84, _w(f[13], "恢复遮罩") + 22)
    assert al_hdr <= console_inner
    for s in ("TRUE END 已通关 · 十二张合照背面的续笔已全部显影。", "已手动开启剧透许可 · 合照背面的真约续笔当前可见。",
              "收录鉴赏室每项玩法的合照 · 涉终章的背面续笔已由防剧透火漆保护。"):
        assert _w(f[12], s) <= 398, f"Album header line wraps: {s}"
    al_foot = (_w(f[12], "每一张合照都对应鉴赏室里的一项玩法") + 10
               + max(max(84, _w(f[13], "前往" + p["source"]) + 22) + 8 for p in photos if p["tab"] != "album")
               + max(146, _w(f[15], "展开相片") + 36))
    assert al_foot <= console_inner, f"Album footer overflows: {al_foot}px"
    report["AlbumFooter"] = al_foot
    big_w = int(_style_prop(new_src, "album_polaroid_big", "xsize"))
    assert big_w + 16 + 376 == 692 and "xysize (280, 158)" in new_src
    md_head = 40 + 12 + max(_w(sf[20], f"{p['code']} · 《{p['title']}》") for p in photos) + 10 + 28 + 6 + _wb(f[13], "已冲洗 12/12")
    assert md_head <= 692, f"Album modal header overflows: {md_head}px"
    md_foot = (_w(f[12], "按 Esc / 空格 或点击右侧按钮合上相册") + 10 + max(84, _w(f[13], "手动解锁剧透") + 22)
               + 8 + max(138, _w(f[14], "合上相册") + 36))
    assert md_foot <= 692

    # ---------------- main menu: 3rd cozy row now 4 chips, never wider than row 2 ----------------
    # PC-11 appends a centred 4th row of 2 chips (4 + 4 + 4 + 2; row-4 width verified by verify_pc11);
    # PC-12 appends a centred 5th row of 2 chips (4 + 4 + 4 + 2 + 2; row-5 width verified by verify_pc12);
    # PC-13 appends a centred 6th row of 2 chips (4 + 4 + 4 + 2 + 2 + 2; row-6 width verified by verify_pc13);
    # PC-14 merges the extra-story chips (library / theater / atelier / sports-day / notebook) into one "番外卷宗" folio
    # entry: 4 + 4 + 4 + (1 + folio) cozy chips in 4 rows, row 3 = planetarium, badges, album, capsule (verified by verify_pc14)
    expected_chips = 13 if _pc14_present() else (
        18 if _pc13_present() else (16 if _pc12_present() else (14 if "icon_time_capsule.png" in scr_src else 12)))
    assert scr_src.count('style "main_menu_cozy_chip"') == expected_chips, f"Expected {expected_chips} main-menu cozy chips"
    best_names = [t["name"] for t in tiers] + ["待结案"]
    # the PC-10 entries stay one click from the title screen: the album as a direct chip, the closed library as a folio card
    assert 'SetField(persistent, "extras_tab", "album"), ShowMenu("extras")' in scr_src
    if _pc14_present():
        folio = scr_src.split("screen extras_folio_modal(", 1)[1].split("\nscreen ", 1)[0]
        assert 'SetField(persistent, "extras_tab", "library")' in folio and "library_best_short()" in folio
        row3 = [18 + 6 + _w(f[13], "钟楼星象馆 (3/3)") + 24, 18 + 6 + _w(f[13], "铜章手账册 (9/9)") + 24,
                18 + 6 + _w(f[13], "合照相册 (12/12)") + 24, 18 + 6 + _w(f[13], "时间胶囊 (12/12)") + 24]
    else:
        row3 = [18 + 6 + _w(f[13], "钟楼星象馆 (3/3)") + 24, 18 + 6 + _w(f[13], "铜章手账册 (9/9)") + 24,
                max(18 + 6 + _w(f[13], f"闭馆图书馆 ({b})") + 24 for b in best_names),
                18 + 6 + _w(f[13], "合照相册 (12/12)") + 24]
    row3_w = sum(row3) + 10 * 3
    row2_w = sum(18 + 6 + _w(f[13], t) + 24 for t in ("古籍修复台 (3/3)", "四季信笺匣 (4/4)", "旧广播电台 (3/3)", "千纸鹤陈列柜 (12/12)")) + 30
    assert row3_w <= row2_w <= 760, f"Main menu row 3 ({row3_w}px) wider than row 2 ({row2_w}px)"
    if _pc15_present():
        # PC-15 re-flows the chips (4 + 3 + 3 + 4, compact chips): measure the real rows with verify_pc14's shared
        # measurer -- the album chip's row must still be on the title screen and clear the navigation column
        import verify_pc14 as pc14
        mmm = pc14.measure_main_menu()
        album_row = [i for i, r in enumerate(mmm["rows"]) if "album" in r][0]
        assert mmm["left"][album_row] > 60 + 280, f"Album row collides with the navigation column: {mmm['left'][album_row]}"
        row3_w = mmm["row_w"][album_row]
    report["MainMenuRow3"] = row3_w
    report["MainMenuRow2"] = row2_w

    # ---------------- achievements ----------------
    ach_src = _read("game/achievements.rpy")
    # PC-11 extends the symmetric grid to 2x14 = 28 (verified by verify_pc11), PC-12 to 2x15 = 30 (verify_pc12),
    # PC-13 to 2x16 = 32 (verify_pc13), PC-14 to 2x17 = 34 (verify_pc14); PC-10's 26 must be the state before them
    expected_grid = ("2×19 = 38" if _pc16_present() else "2×18 = 36" if _pc15_present() else "2×17 = 34" if _pc14_present() else ("2×16 = 32" if _pc13_present() else
                     ("2×15 = 30" if _pc12_present() else ("2×14 = 28" if _later_salon_present() else "2×13 = 26"))))
    assert "grid 2 ach_grid_rows():" in ach_src and expected_grid in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_closed_library", "ach_photo_album"):
        m = re.search(rf'"{aid}",\s*"([^"]+)",\s*"([^"]+)"', new_src)
        assert m, f"Missing registration for {aid}"
        assert _w(sf[19], m.group(1)) <= ach_text_w and _w(f[14], m.group(2)) <= ach_text_w, f"{aid} copy wraps"

    print("[PASS] 1280x720 pixel audit: "
          + ", ".join(f"{k}={v}px" for k, v in report.items())
          + " | sub-bar per open group " + ", ".join(f"{g}={px}" for g, px in sb["per_group"].items())
          + " (all <=702)")
    return report, sb


################################################################################
# 3. Sandbox runtime: case, rating, album, spoiler gate
################################################################################

def _case_block(src):
    m = re.search(r"^label closed_library_case:\n(.*)\Z", src, re.S | re.M)
    assert m, "Missing label closed_library_case"
    return m.group(1)


def _label_block(src, name):
    m = re.search(rf"^label {name}(?:\([^)\n]*\))?:\n(.*?)(?=^label |\Z)", src, re.S | re.M)
    assert m, f"Missing label {name}"
    return m.group(1)


def _sprite_slots_ok(text, where):
    slots, pos_of = {}, {}
    for ln in text.splitlines():
        s = ln.strip()
        if s.startswith("scene "):
            slots.clear()
            pos_of.clear()
            continue
        mh = re.match(r"hide (\w+)$", s)
        if mh and mh.group(1) in pos_of:
            slots.pop(pos_of.pop(mh.group(1)), None)
            continue
        ms = re.match(r"show (\w+) (\w+) at (left|center|right)$", s)
        if ms:
            tag, pos = ms.group(1), ms.group(3)
            if tag in pos_of:
                slots.pop(pos_of[tag], None)
            assert slots.get(pos) in (None, tag), f"{where}: `{tag}` shown at {pos} over `{slots.get(pos)}`: {s}"
            slots[pos] = tag
            pos_of[tag] = pos


def check_pc10_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    src = _read(NEW_MODULE)

    # ---- A. 26 achievements (2x13), PC-10 pair appended after PC-9 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 26 and env["ach_grid_rows"]() == 13
    assert ach_ids[-4:] == ["ach_planetarium", "ach_badge_journal", "ach_closed_library", "ach_photo_album"], ach_ids[-4:]
    assert "ach_closed_library" in mock_ach.registered and "ach_photo_album" in mock_ach.registered

    # ---- B. case data ----
    case, hotspots, links, tiers = env["LIBRARY_CASE"], env["LIBRARY_HOTSPOTS"], env["LIBRARY_CHAIN_LINKS"], env["LIBRARY_RATING_TIERS"]
    assert case["label"] == "closed_library_case" and case["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / case["bg_thumb"]).is_file()
    assert [h["id"] for h in hotspots] == [f"h{i}" for i in range(1, 7)]
    assert [k["name"] for k in links] == ["去向", "路径", "动机", "执行人"]
    assert [t["key"] for t in tiers] == ["gold", "silver", "bronze"]
    for h in hotspots:
        assert h["scene"] in env["BG_LIGHT"] and len(h["detail"]) >= 70 and h["evidence"] and h["surface"]
        assert env["EVIDENCE_DETAILS"][h["evidence"]] == (h["observer"], h["detail"]), f"{h['id']} flip detail not registered"
    assert len({h["evidence"] for h in hotspots}) == 6
    assert len(case["solution_pub"]) >= 120 and case["mo_note_pub"] and case["alice_note_pub"]

    # ---- C. script structure: 6 hotspots -> 4-link chain -> resolution ----
    blk = _case_block(src)
    cjk_case = _cjk(blk)
    assert 4000 <= cjk_case <= 7500, f"Case CJK count {cjk_case} outside 4,000-7,500"
    inv = _label_block(src, "library_case_investigate")
    for i in range(1, 7):
        assert f"if not _lb_h{i}:" in inv and f'$ library_inspect_hotspot("h{i}")' in inv, f"hotspot h{i} not playable"
    assert inv.count("jump library_case_investigate") == 6 and "jump library_case_review_intro" in inv
    correct_positions = []
    for i in range(1, 5):
        kb = _label_block(src, f"library_chain_k{i}")
        assert f"show screen library_chain_banner({i - 1}, " in kb
        assert kb.count("$ _lb_mistakes += 1") == 2 and kb.count(f"jump library_chain_k{i}") == 2, f"k{i}: needs 2 gentle wrong loops"
        assert kb.count("play sound se_correct") == 1 and f"$ _lb_links = {i}" in kb
        for m_wrong in re.finditer(r"\$ _lb_mistakes \+= 1(.*?)jump library_chain_k" + str(i), kb, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"k{i}: wrong branch lacks a gentle hint"
        opts = re.findall(r'^        "([^"]+)":\n(.*?)(?=^        "|^    mc |\Z)', kb, re.S | re.M)
        assert len(opts) == 3, f"k{i}: expected 3 options, got {len(opts)}"
        correct_positions.append([j for j, (_t, body) in enumerate(opts) if "se_correct" in body][0])
    assert len(set(correct_positions)) >= 3, f"Correct link always at the same menu slot: {correct_positions}"
    assert 'call _library_finish_case(_lb_mistakes)' in blk and "label library_case_resolution:" in blk
    for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(",
                      "truth_route =", "add_favor(", "kako_clue"):
        assert forbidden not in blk, f"Case touches main-story state via `{forbidden}`"
    assert not re.search(r'^\s+mo "', blk, re.M), "墨墨 must stay silent (mo_note only) in the library case"
    assert "truth_spoiler_unlocked" not in blk, "The library case is fully public"
    for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
        name = m_bg.group(1)
        assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
    for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
        ch, ex = m_ch.group(1), m_ch.group(2)
        if ch in ("screen", "layer", "bg", "cg"):
            continue
        assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png"
    _sprite_slots_ok(blk, "closed_library_case")
    # Ren'Py interpolates [...] in dialogue: only the intended replay-best substitution is allowed
    for ln in blk.splitlines():
        if re.match(r"\s*(\$ |show screen |call |if |elif |jump )", ln):
            continue
        for tok in re.findall(r"\[([^\]]*)\]", ln):
            assert tok == "_lb_best_text", f"Unexpected interpolation [{tok}] in: {ln.strip()}"

    # label callback & launch action
    mp.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("closed_library_case", False)
    assert env["gramophone_ambience_active"]() is False and env["store"].current_chapter_label == "closed_library_case"
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["library_launch_action"]()
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    rp = [x for x in act if isinstance(x, tuple) and x[0] == "Replay"]
    assert rp and rp[0][1][0] == "closed_library_case" and rp[0][2]["scope"]["player_name"] == "陈默"

    # ---- D. step-execute every `$` line of sandbox init + case (all branches, in text order) ----
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_mystery": "m", "bgm_prologue": "p"}.items():
        env[k] = v
    env["_in_replay"] = False
    env["session_save_title"] = "L-01"
    env["evidence"] = []
    env["fail_count"] = 0
    env["mo_favor"] = 50
    init_blk = _label_block(src, "_library_init_sandbox")
    for ln in init_blk.splitlines() + blk.splitlines():
        if ln.strip().startswith("$ "):
            exec(ln.strip()[2:], env)
    assert all(env[f"_lb_h{i}"] is True for i in range(1, 7))
    assert env["_lb_mistakes"] == 8 and env["_lb_links"] == 4
    assert env["fail_count"] == 0, "Case must never mutate main-story fail_count"
    assert len(env["evidence"]) == 6 and set(env["evidence"]) == {h["evidence"] for h in hotspots}
    assert env["library_get_record"]()["inspected"] == [f"h{i}" for i in range(1, 7)]
    assert env["library_inspect_hotspot"]("bogus") is False
    env["fail_count"] = 0
    env["mo_favor"] = 50

    # ---- E. rating tiers, replay best-record, achievement ----
    assert [env["library_rate"](m)["key"] for m in (0, 1, 2, 3, 8)] == ["gold", "silver", "silver", "bronze", "bronze"]
    mp.closed_library_record = {}
    assert env["library_case_solved_count"]() == 0 and env["library_best_short"]() == "待结案"
    assert env["library_render_view"]()["display_solution"] == "" and not any(env["library_render_view"]()["chain_shorts"])
    r = env["library_record_solve"](5)
    assert r["is_first"] and not r["new_record"] and r["last_tier"] == "bronze" and r["best_tier"] == "bronze"
    assert mock_ach.has("ach_closed_library")
    r = env["library_record_solve"](2)
    assert not r["is_first"] and r["new_record"] and r["best_tier"] == "silver" and r["best_mistakes"] == 2
    r = env["library_record_solve"](2)
    assert not r["new_record"] and r["replays"] == 3
    assert env["album_status"]("ph11") == "locked", "Gold photo must wait for a zero-mistake run"
    r = env["library_record_solve"](0)
    assert r["new_record"] and r["best_tier"] == "gold" and r["best_mistakes"] == 0
    r = env["library_record_solve"](3)
    assert r["last_tier"] == "bronze" and r["best_tier"] == "gold" and r["best_mistakes"] == 0 and r["replays"] == 5
    assert env["library_best_short"]() == "金书签" and env["library_gold_count"]() == 1
    v = env["library_render_view"]()
    assert v["solved"] and v["display_solution"] == case["solution_pub"] and v["chain_shorts"] == [k["short"] for k in links]
    env["library_open_report_modal"]()
    assert env["library_get_record"]()["report_viewed"] and any(s[0] == "library_report_modal" for s in mock_renpy.shown_screens)
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False

    # ---- F. accordion sub-bar helpers ----
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            if t not in SALON_KEYS:
                continue  # PC-11+ tab: its counter lives in a later module (pill text verified by that milestone)
            txt = env["salon_tab_pill_text"](t)
            assert re.fullmatch(r"\S+ \d+/\d+", txt), f"pill text `{txt}`"
    mp.extras_salon_group = "starlit"
    assert env["salon_open_group"]("endings") == "starlit"
    mp.extras_salon_group = "bogus"
    assert env["salon_open_group"]("endings") == "salon" and env["salon_group_of"]("endings") is None
    saved_fn = env.pop("album_developed_count")
    assert env["salon_tab_pill_text"]("album") == "相册", "Pill text must degrade gracefully"
    env["album_developed_count"] = saved_fn

    # ---- G. album ----
    photos = env["ALBUM_PHOTOS"]
    assert [p["id"] for p in photos] == [f"ph{i:02d}" for i in range(1, 13)]
    valid_tabs = {"mailbox", "teaparty", "lexicon", "restoration", "letterbox", "origami", "radio", "planetarium",
                  "badges", "library", "album"}
    assert {p["tab"] for p in photos} == valid_tabs
    assert [p["id"] for p in photos if p["spoiler"]] == ["ph06", "ph07", "ph08", "ph12"]
    assert len({p["bg_thumb"] for p in photos}) == 12, "Every photo uses its own backdrop"
    for p in photos:
        assert (GAME_DIR / p["bg_thumb"]).is_file()
        assert len(p["mo_caption"]) >= 30 and len(p["alice_caption"]) >= 30, f"{p['id']} caption too short"
        if p["spoiler"]:
            assert p.get("mo_caption_secret") and p.get("alice_caption_secret")
        else:
            assert "mo_caption_secret" not in p and "alice_caption_secret" not in p
    assert photos[-1]["need"] == len(photos) - 1

    mp.closed_library_record = {}
    mp.planetarium_records = {}
    mp.photo_album_records = {}
    assert env["album_earned_count"]() == 0 and env["album_developed_count"]() == 0
    n_before = len(mock_renpy.notifications)
    assert env["album_develop"]("ph01", True) is None and len(mock_renpy.notifications) == n_before + 1
    assert env["album_get_record"]("ph01")["developed"] is False

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
            for c in env["MAILBOX_CASE_DEFS"]:
                env["mailbox_record_case_clear"](c["id"], 0)
            env["badge_stamp"]("bd01", False)
        elif key == "library":
            env["library_record_solve"](4)
        elif key == "library_gold":
            env["library_record_solve"](0)

    # lexicon photo must be earnable with spoilers locked (only public entries count)
    assert mp.te_cleared is False and mp.truth_spoiler_confirmed is False
    for idx, p in enumerate(photos[:11]):
        cur, need = env["album_progress"](p["id"])
        if env["album_status"](p["id"]) == "locked":
            _first(p["progress_key"])
        assert env["album_status"](p["id"]) == "earned", f"{p['id']} not earned after first {p['source']}"
        assert env["album_develop"](p["id"], open_modal=(idx == 9))["developed"] is True
        assert env["album_status"](p["id"]) == "developed"
    assert any(s[0] == "album_photo_modal" and s[2].get("photo_id") == "ph10" for s in mock_renpy.shown_screens)
    assert env["album_progress"]("ph12") == (11, 11) and env["album_status"]("ph12") == "earned"
    assert not mock_ach.has("ach_photo_album")
    env["album_develop"]("ph12", False)
    assert env["album_developed_count"]() == 12 and mock_ach.has("ach_photo_album"), "ach_photo_album must unlock at 12/12"
    assert env["album_develop"]("ph12", False)["develop_count"] == 2, "Re-developing a photo stays allowed"
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

    for p in photos:
        v = env["album_render_view"](p["id"])
        _clean(v, p["id"])
        if p["spoiler"]:
            assert v["unlocked"] is False and v["display_masked_notice"] == env["ALBUM_SPOILER_NOTICE"]
            assert v["display_mo_secret"] == "" and v["display_alice_secret"] == ""
        else:
            assert v["unlocked"] is True and v["display_masked_notice"] == ""
    assert not any(kw in env["ALBUM_SPOILER_NOTICE"] for kw in SECRET_KEYWORDS)
    for p in photos:
        for k in ("title", "source", "place", "cast", "condition", "mo_caption", "alice_caption"):
            for kw in SECRET_KEYWORDS:
                assert kw not in p[k], f"`{kw}` in public album field {p['id']}.{k}"
    # the whole library case (script + data) is public
    lib_public = [blk] + [str(case)] + [str(h) for h in hotspots] + [str(k) for k in links]
    for text in lib_public:
        for kw in SECRET_KEYWORDS:
            assert kw not in text, f"`{kw}` appears in the public library case"
    _clean(env["library_render_view"](), "library")

    # side channel: replacing / emptying every secret leaves every locked render byte-identical
    saved = {p["id"]: copy.deepcopy(p) for p in photos}
    before = {p["id"]: env["album_render_view"](p["id"]) for p in photos}
    for filler in ("X" * 333, "", "周可小雪" * 50):
        for p in photos:
            if p["spoiler"]:
                p["mo_caption_secret"] = filler
                p["alice_caption_secret"] = filler[::-1] + "Z"
        for p in photos:
            assert env["album_render_view"](p["id"]) == before[p["id"]], f"Locked {p['id']} view depends on secret text"
    for p in photos:
        pid = p["id"]
        p.clear()
        p.update(saved[pid])
    # undeveloped spoiler photo shows nothing secret even when unlocked
    mp.photo_album_records = {}
    mp.te_cleared = True
    for p in photos:
        v = env["album_render_view"](p["id"])
        assert v["display_mo_secret"] == "" and v["display_mo_caption"] == "", "Undeveloped photo must stay blank"
    # unlock -> secrets appear on developed photos only
    mp.photo_album_records = {pid: {"developed": True, "develop_count": 1, "viewed": True} for pid in ("ph06", "ph08", "ph12", "ph01")}
    v12 = env["album_render_view"]("ph12")
    assert v12["unlocked"] and "明天见" in v12["display_mo_secret"] and v12["display_masked_notice"] == ""
    assert "小可" in env["album_render_view"]("ph08")["display_mo_secret"]
    assert env["album_render_view"]("ph01")["display_mo_secret"] == ""
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["album_render_view"]("ph06")["display_alice_secret"]
    mp.truth_spoiler_confirmed = False

    # ---- I. reset_all_progress clears PC-10 state and leaves main-story vars alone ----
    mp.extras_salon_group = "closedlib"
    mp.library_selected_hotspot = "h4"
    env["reset_all_progress"]()
    assert env["library_case_solved_count"]() == 0 and env["album_developed_count"]() == 0
    assert mp.closed_library_record == {} and mp.photo_album_records == {}
    assert mp.library_selected_hotspot == "h1" and mp.album_selected_photo == "ph01" and mp.extras_salon_group == "salon"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50

    cap_cjk = sum(_cjk(p["mo_caption"] + p["alice_caption"] + p.get("mo_caption_secret", "") + p.get("alice_caption_secret", ""))
                  for p in photos)
    print(f"[PASS] PC-10 runtime: closed-library case (CJK={cjk_case}, 6 hotspots -> 4-link chain, correct slots "
          f"{[c + 1 for c in correct_positions]}, 8 gentle loops, fail_count untouched) | gold/silver/bronze rating + "
          f"best-record replay ladder + ach_closed_library | 12-photo album (captions CJK={cap_cjk}) + ach_photo_album | "
          f"26 achievements (2x13) | zero-leak spoiler gate + 3-way side-channel proof")
    return cjk_case, cap_cjk


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

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC10_TOUCHED_FILES if p != NEW_MODULE]],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added = line[1:]
            assert "<svg" not in added.lower() and "�" not in added and not EMOJI_RE.search(added), f"Bad added line: {added}"

    new_src = _read(NEW_MODULE)
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src) and "\t" not in new_src

    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    n_str = 0
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            n_str += 1
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    for ln in new_src.splitlines():
        if re.search(r'text \(".*%s" % \w+\["lighting_note"\]\)', ln):
            assert "substitute False" in ln, f"lighting_note text without `substitute False`: {ln.strip()}"
    # every data-driven text that prints case / photo copy opts out of interpolation
    for ln in new_src.splitlines():
        s = ln.strip()
        if re.match(r'text (_\w+|LIBRARY_CASE|h_obj|_lh)\["(summary_pub|detail|surface|display_\w+|label)"\]', s):
            assert "substitute False" in s, f"Data text without `substitute False`: {s}"
    print(f"[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched), "
          f"no Emoji/SVG/tabs, {n_str} interpolation-safe CJK data strings")

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
            if rel_icon in PC10_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/{len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-10 set: {', '.join(Path(x).name for x in PC10_UI_ICONS)}")


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

    for img in ("ui_icon_closed_library", "ui_icon_library_key", "ui_icon_photo_album", "ui_icon_club_photo"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_closed_library", "library_report_modal", "library_chain_banner", "library_result_card",
                "extras_photo_album", "album_photo_modal", "extras_achievements", "deduction_cutin", "evidence_book"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("closed_library_case", "library_case_investigate", "library_case_review_intro", "library_chain_k1",
                "library_chain_k2", "library_chain_k3", "library_chain_k4", "library_case_resolution",
                "_library_init_sandbox", "_library_finish_case"):
        assert lbl in labels, f"Missing label {lbl}"
    new_src = _read(NEW_MODULE)
    for t in set(re.findall(r"\bat (\w+)", new_src)):
        assert t in transforms or t in ("left", "right", "center"), f"Undefined transform `{t}`"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC10_TOUCHED_FILES:
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
    for icon in PC10_UI_ICONS:
        assert icon in refs, f"PC-10 icon {icon} is not wired into any .rpy"
    for se in set(re.findall(r"play sound (se_\w+)", new_src)):
        assert re.search(rf"define audio\.{se}\s*=", _read("game/audio.rpy")), f"Undefined sound {se}"
    for bgm in set(re.findall(r"play_bgm\((bgm_\w+)", new_src)):
        assert re.search(rf"define audio\.{bgm}\s*=", _read("game/audio.rpy")), f"Undefined bgm {bgm}"

    extra_src = _read("game/extra.rpy")
    assert '"closed_library_case":' in extra_src
    assert extra_src.count("or name in _CLOSED_LIBRARY_LABELS") == 2
    assert extra_src.count("or name in _PLANETARIUM_LABELS") == 2, "PC-9 callback wiring must stay intact"
    reset_src = extra_src.split("def reset_all_progress")[1].split("\nscreen ")[0]
    for fld in ("closed_library_record", "library_selected_hotspot", "photo_album_records", "album_selected_photo",
                "extras_salon_group"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in reset_src, fld

    for rel in PC10_TOUCHED_FILES:
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
    pc10_shots = ("ui_10a_library_unsolved.png", "ui_10b_library_gold.png", "ui_10c_library_report.png",
                  "ui_10d_library_chain_banner.png", "ui_10e_library_result_card.png", "ui_10f_album_masked.png",
                  "ui_10g_album_unmasked.png", "ui_10h_album_photo_modal.png")
    for shot in pc10_shots:
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    seg = shots.split("ui_10a_library_unsolved.png")[0].rsplit("_saved_lb_rec", 1)[0]
    pc10_seg = shots[len(seg):].split("ui_07_confirm.png")[0]
    for bad in ("ach_grant", "album_develop(", "library_record_solve("):
        assert bad not in pc10_seg, f"UI audit must not call `{bad}` (would grant real achievements)"
    for fld in ("closed_library_record", "photo_album_records", "album_selected_photo", "library_selected_hotspot",
                "extras_salon_group"):
        assert f"persistent.{fld} = _saved_" in pc10_seg, f"UI audit does not restore persistent.{fld}"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print(f"[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-10 coverage ({len(pc10_shots)} shots, state restored)")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc10_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC10_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
