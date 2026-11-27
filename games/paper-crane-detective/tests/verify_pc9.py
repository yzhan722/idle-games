#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-9 Static, Behavioral, Pixel-Budget, Clock-Tower Planetarium Star-Cipher Night,
Detective Club Bronze Badge Journal, Spoiler-Gate, Asset & Zero-Intrusion Verifier
for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).

No Ren'Py SDK is required: every check is static (AST / regex / font metrics) or runs the
game's init-python blocks inside a mocked sandbox, the same way verify_pc8.py does.
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
NEW_MODULE = "game/stargazer_badges.rpy"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pc8 as pc8  # noqa: E402  (reuse the PC-8 parser helpers verbatim)
import rpy_syntax as rs  # noqa: E402  (strict_files: the save-compatibility `from` pass is not a story change)

extract_python_blocks = pc8.extract_python_blocks
_paren_delta = pc8._paren_delta

PC9_UI_ICONS = [
    "images/ui/icon_clocktower_planetarium.png",
    "images/ui/icon_star_cipher_chart.png",
    "images/ui/icon_badge_journal.png",
    "images/ui/icon_bronze_badge.png",
]

REQUIRED_UI_ICONS = pc8.REQUIRED_UI_ICONS + PC9_UI_ICONS

MAIN_STORY_FILES = pc8.MAIN_STORY_FILES

PC9_TOUCHED_FILES = [
    NEW_MODULE,
    "game/extra.rpy",
    "game/radio_origami.rpy",
    "game/screens.rpy",
    "game/achievements.rpy",
    "game/bookstreet_seasons.rpy",
    "game/tests/ui_shots.rpy",
]

SECRET_KEYWORDS = ("周可", "小雪", "小可", "重新开口", "周明远", "十二封", "旧仓库", "八分钟", "门缝", "第三只千纸鹤")

EMOJI_RE = pc8.EMOJI_RE


def _fonts():
    sans = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans.is_file() and serif.is_file(), "Missing Noto fonts"
    f = {s: ImageFont.truetype(str(sans), s) for s in (10, 11, 12, 13, 14, 15, 18)}
    sf = {s: ImageFont.truetype(str(serif), s) for s in (13, 14, 17, 18, 19, 21, 40)}
    return f, sf


def _w(fnt, text):
    """Advance width (what Ren'Py lays out with), never smaller than the ink box."""
    bb = fnt.getbbox(text)
    return max(int(round(fnt.getlength(text))), bb[2] - bb[0])


def _style_prop(src, style_name, prop):
    m = re.search(rf"^style {style_name}\b[^\n]*:\n((?:[ \t]+[^\n]*\n)+)", src, re.M)
    assert m, f"Style `{style_name}` not found"
    mp = re.search(rf"^\s+{prop}\s+(.+)$", m.group(1), re.M)
    assert mp, f"Style `{style_name}` has no `{prop}`"
    return mp.group(1).strip()


def _cjk(s):
    return len(re.findall(r"[一-鿿]", s))


################################################################################
# 1. Python syntax
################################################################################

def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 27, f"Expected >=27 .rpy files (including stargazer_badges.rpy), found {len(rpy_files)}"
    assert (ROOT / NEW_MODULE).is_file(), f"Missing {NEW_MODULE}"
    # stargazer_badges.rpy must initialise after radio_origami.rpy so the 2 new achievements append last
    names = [p.name for p in sorted(GAME_DIR.glob("*.rpy"))]
    assert names.index("stargazer_badges.rpy") > names.index("radio_origami.rpy")

    total_blocks = 0
    total_inline = 0
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

    print(
        f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
        f"({total_blocks} python blocks + {total_inline} inline `$` statements)"
    )


################################################################################
# 2. 1280x720 pixel budgets
################################################################################

def _subbar_items(extra_src):
    """Parse the salon_subbar_frame block of screen extras() into ordered (kind, text) items."""
    m = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S)
    assert m, "Could not locate salon_subbar_frame block in extra.rpy"
    blk = m.group(1)
    items = []
    for ln in blk.splitlines():
        s = ln.strip()
        mi = re.match(r'add "(images/ui/[^"]+\.png)" xysize \((\d+), (\d+)\)', s)
        if mi:
            items.append(("icon", int(mi.group(2))))
            continue
        mt = re.match(r'textbutton \("([^"]+)" % (.+)\):$', s)
        if mt:
            items.append(("pill", mt.group(1)))
            continue
        mx = re.match(r'text \("([^"]+)" % .+\) size (\d+)', s)
        if mx:
            items.append(("text", mx.group(1)))
    return blk, items


def _max_fill(fmt):
    """Fill `%d/N` with N/N and `%d/%d` with the widest real lexicon total (20/20)."""
    out = re.sub(r"%d/(\d+)", lambda mm: f"{mm.group(1)}/{mm.group(1)}", fmt)
    return out.replace("%d/%d", "20/20")


def check_layout_and_pixel_bounds():
    f, sf = _fonts()
    extra_src = (GAME_DIR / "extra.rpy").read_text(encoding="utf-8-sig")
    sg_src = (ROOT / NEW_MODULE).read_text(encoding="utf-8-sig")
    ro_src = (GAME_DIR / "radio_origami.rpy").read_text(encoding="utf-8-sig")
    scr_src = (GAME_DIR / "screens.rpy").read_text(encoding="utf-8-sig")
    tp_src = (GAME_DIR / "tea_party_lexicon.rpy").read_text(encoding="utf-8-sig")
    bs_src = (GAME_DIR / "bookstreet_seasons.rpy").read_text(encoding="utf-8-sig")
    ex_styles = extra_src + "\n" + tp_src + "\n" + bs_src + "\n" + scr_src + "\n" + sg_src
    report = {}

    # 2.1 Primary 9-tab bar unchanged and <= 722px
    tabs = ast.literal_eval("[" + re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert len(tabs) == 9, f"Expected 9 primary tabs, got {len(tabs)}"
    tab_px = sum(max(54, _w(f[15], lbl) + 16) for _k, lbl in tabs) + 5 * (len(tabs) - 1)
    assert tab_px <= 722, f"EXTRAS_TABS overflows 722px: {tab_px}px"
    report["Tabs"] = tab_px

    st = ast.literal_eval("[" + re.search(r"EXTRAS_STARLIT_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert [k for k, _ in st] == ["planetarium", "badges"], f"Unexpected EXTRAS_STARLIT_TABS: {st}"
    ro_tabs = ast.literal_eval("[" + re.search(r"EXTRAS_RADIO_ORIGAMI_TABS\s*=\s*\[(.*?)\]", extra_src, re.S).group(1) + "]")
    assert [k for k, _ in ro_tabs] == ["radio", "origami"], "PC-8 sub-tab registry must stay intact"

    # 2.2 Salon sub-bar parsed from source: 8 pills + 7 icons inside 702px inner width (722 - 2 x 10 padding)
    pill_min = int(_style_prop(bs_src, "bookstreet_subtab_pill", "xminimum"))
    pill_pad = int(_style_prop(bs_src, "bookstreet_subtab_pill", "padding").strip("()").split(",")[0])
    pill_size = int(_style_prop(bs_src, "bookstreet_subtab_pill_text", "size"))
    assert (pill_min, pill_pad, pill_size) == (66, 6, 11)
    subbar_inner = int(_style_prop(tp_src, "salon_subbar_frame", "xsize")) - 2 * 10
    assert subbar_inner == 702
    if "EXTRAS_SALON_GROUPS" in extra_src:
        # PC-10 regrouped the (then full) flat bar into a 4-group accordion; verify_pc10 measures every open state.
        # PC-9's contract still holds: all 8 PC-9-era tabs stay reachable and the widest state fits 702px.
        import verify_pc10 as pc10
        sb = pc10.measure_salon_subbar()
        for key in ("teaparty", "lexicon", "restoration", "letterbox", "radio", "origami", "planetarium", "badges"):
            assert key in sb["keys"], f"Sub-bar is missing the `{key}` pill"
        assert sb["worst"] <= subbar_inner, f"Salon sub-bar overflows {subbar_inner}px: {sb['worst']}px"
        report["SubBarGroupedWorst"] = sb["worst"]
    else:
        blk, items = _subbar_items(extra_src)
        pills = [t for k, t in items if k == "pill"]
        icons = [t for k, t in items if k == "icon"]
        assert len(pills) == 8 and len(icons) == 7, f"Expected 8 pills + 7 icons in sub-bar, got {len(pills)} + {len(icons)}"
        assert not [t for k, t in items if k == "text"], "Sub-bar must not carry a trailing text indicator any more"
        for key in ("teaparty", "lexicon", "restoration", "letterbox", "radio", "origami", "planetarium", "badges"):
            assert f'selected (cur == "{key}")' in blk, f"Sub-bar is missing the `{key}` pill"
        sub_spacing = int(re.search(r"spacing (\d+)", blk).group(1))
        widths = []
        for kind, val in items:
            if kind == "icon":
                widths.append(val)
            else:
                widths.append(max(pill_min, _w(f[pill_size], _max_fill(val)) + 2 * pill_pad))
        subbar_px = sum(widths) + sub_spacing * (len(widths) - 1)
        assert subbar_px <= subbar_inner, f"Salon sub-bar overflows {subbar_inner}px: {subbar_px}px"
        report["SubBar8Pills"] = subbar_px

    # 2.3 Extras subtitle now fits on ONE line next to the 40px serif title (xpos 400 -> 1280)
    m_sub = re.search(r'use game_menu\(_\("鉴赏"\), subtitle=_\("([^"]+)"\)\)', extra_src)
    assert m_sub, "Could not find extras() subtitle"
    sub = m_sub.group(1)
    sub_px = _w(f[18], sub) + 2 * len(sub)            # size 18 + kerning 2 (game_menu_subtitle)
    title_px = _w(sf[40], "鉴赏") + 4 * 2              # size 40 + kerning 4 (game_menu_title)
    avail = 1280 - 400 - title_px - 16
    assert sub_px <= avail, f"Extras subtitle wraps: {sub_px}px > {avail}px"
    assert "侦探社沙龙" in sub
    report["Subtitle"] = sub_px

    # 2.4 Vertical budget of extras(): 34 + 7 + 30 + 7 + 468 == 546
    assert "ysize 468" in extra_src and "spacing 7" in extra_src
    assert 'elif cur == "planetarium":' in extra_src and "use extras_planetarium" in extra_src
    assert 'elif cur == "badges":' in extra_src and "use extras_badge_journal" in extra_src
    assert 34 + 7 + 30 + 7 + 468 == 546

    # 2.5 Card rows in the new screens are exactly the 722px / 694px content widths
    card_w = int(_style_prop(sg_src, "planetarium_cipher_card", "xsize"))
    medal_w = int(_style_prop(sg_src, "badge_medal_card", "xsize"))
    clue_w = int(_style_prop(bs_src, "restoration_clue_card", "xsize"))
    assert 3 * card_w + 2 * 10 == 722, "Planetarium 3-cipher selector must equal 722px"
    assert 3 * medal_w + 2 * 10 == 722, "Badge 3x3 grid row must equal 722px"
    assert 3 * clue_w + 2 * 8 == 694, "Planetarium 3-clue row must equal 694px console inner width"
    thumb_w = int(_style_prop(extra_src, "mailbox_thumb_frame", "xsize"))
    assert thumb_w + 14 + 492 <= 694, "Planetarium console header row overflows 694px"
    assert 64 + 12 + 440 + max(96, _w(f[11], "已拓印 99 次") + 20) <= 694, "Badge detail header overflows 694px"
    assert "$ _badge_rows = (len(BADGE_DEFS) + 2) // 3\n        grid 3 _badge_rows:" in sg_src

    # 2.6 Text that lives inside fixed-size cards
    data = _load_new_module_data()
    for c in data["PLANETARIUM_CIPHERS"]:
        assert _w(sf[14], c["short_title"]) <= card_w - 20, f"short_title `{c['short_title']}` overflows cipher card"
        assert _w(f[11], c["sky_tag"]) <= card_w - 20, f"sky_tag `{c['sky_tag']}` overflows cipher card"
        for clue in c["star_clues"]:
            assert _w(f[11], clue["label"]) + 4 + _w(f[10], "已核对") <= clue_w - 16, f"Clue label `{clue['label']}` overflows"
        quick = 20 + 10 + _w(sf[14], f"{c['code']} · {c['title']}") + 10 + _w(f[12], "（北辰首席解码）")
        quick += 8 + max(84, _w(f[13], "再访穹顶") + 22)
        assert quick <= 722 - 24, f"Planetarium quick row overflows: {quick}px"
    medal_text_w = medal_w - 20 - 40 - 8
    assert medal_text_w == 166
    for b in data["BADGE_DEFS"]:
        assert _w(sf[14], b["name"]) <= medal_text_w, f"Badge name `{b['name']}` overflows medal card"
        total = {"origami": 12, "lexicon": 13, "letterbox": 4, "journal": 8}.get(b["progress_key"], 3)
        assert _w(f[11], f"{b['source']} · {total}/{total}") <= medal_text_w, f"Badge source line overflows: {b['source']}"
        assert _w(f[11], b["code"]) + 6 + _w(f[10], "已拓印") <= medal_text_w

    # 2.7 Header / footer / rule-bar rows
    hdr_right = max(96, 14 + 4 + _w(f[12], "已解星图 3/3") + 20) + 6 + max(84, _w(f[13], "恢复遮罩") + 22)
    assert 36 + 10 + 398 + hdr_right <= 694, f"Planetarium header overflows: {36 + 10 + 398 + hdr_right}px"
    bj_right = max(96, 14 + 4 + _w(f[12], "已拓印 9/9") + 20) + 6 + max(84, _w(f[13], "恢复遮罩") + 22)
    assert 36 + 10 + 398 + bj_right <= 694, "Badge journal header overflows"

    pl_footer = (_w(f[12], "三笺暗号全部破译解锁成就「钟楼星象解码人」 · 一次破译 3/3") + 10
                 + max(84, _w(f[13], "展阅星图批注") + 22) + 8 + max(146, _w(f[15], "推开星象馆铜门") + 36))
    assert pl_footer <= 694, f"Planetarium footer overflows: {pl_footer}px"
    report["PlanetFooter"] = pl_footer

    rule = (16 + 6 + _w(f[11], "可拓印 9 · 已拓印 9 · 完成对应玩法即可领取铜章") + 12
            + _w(f[11], "集齐九枚解锁成就「铜章手账收藏家」"))
    assert rule <= 702, f"Badge rule bar overflows 702px: {rule}px"
    report["BadgeRuleBar"] = rule

    bj_footer = _w(f[12], "每一枚铜章都对应鉴赏室里的一项玩法") + 10 + max(146, _w(f[15], "展阅手账页") + 36)
    bj_footer += max(max(84, _w(f[13], "前往" + b["source"]) + 22) + 8 for b in data["BADGE_DEFS"] if b["tab"] != "badges")
    assert bj_footer <= 694, f"Badge detail footer overflows: {bj_footer}px"
    report["BadgeFooter"] = bj_footer

    # 2.8 Origami C-08 cross-link pill (radio_origami.rpy 4D row) still fits in 694px
    assert 'if _cview["id"] == "c08":' in ro_src and 'SetField(persistent, "extras_tab", "planetarium")' in ro_src
    worst = 0
    for c in pc8_crane_defs():
        vow = c["vow_slip"] if not c["spoiler"] else c["public_vow_slip"]
        vows = [vow, c["vow_slip"]]
        for v in vows:
            left = _w(f[12], "誓约短册：" + v[:34] + ("…" if len(v) > 34 else ""))
            right = max(176, _w(f[14], "亲手折纸并展阅誓约签") + 36)
            if c["id"] == "c08":
                right += max(84, _w(f[13], "钟楼星象馆") + 22) + 8
                worst = max(worst, left + 10 + right)
                assert left + 10 + right <= 694, f"Origami C-08 row overflows: {left + 10 + right}px"
    report["OrigamiC08Row"] = worst

    # 2.9 Main menu 3rd cozy-chip row (2 chips) stays narrower than row 2
    row3 = [18 + 6 + _w(f[13], "钟楼星象馆 (3/3)") + 24, 18 + 6 + _w(f[13], "铜章手账册 (9/9)") + 24]
    row3_w = sum(row3) + 10
    row2_w = sum(18 + 6 + _w(f[13], t) + 24 for t in ("古籍修复台 (3/3)", "四季信笺匣 (4/4)", "旧广播电台 (3/3)", "千纸鹤陈列柜 (12/12)")) + 30
    assert row3_w < row2_w <= 760, f"Main menu chip rows too wide: row2={row2_w} row3={row3_w}"
    # PC-10 appends 2 chips to row 3 (4 + 4 + 4; exact count & row-3 width verified by verify_pc10);
    # PC-11 adds a centred 4th row of 2 chips (4 + 4 + 4 + 2; verified by verify_pc11);
    # PC-12 adds a centred 5th row of 2 chips (4 + 4 + 4 + 2 + 2; verified by verify_pc12);
    # PC-13 adds a centred 6th row of 2 chips (4 + 4 + 4 + 2 + 2 + 2; verified by verify_pc13);
    # PC-14 merges the extra-story chips into one "番外卷宗" folio entry (main_menu_folio_chip): 4 rows, 13 cozy chips
    # (verified by verify_pc14). PC-9's planetarium / badge-journal chips stay direct chips on row 3 either way.
    expected_chips = (13 if "main_menu_folio_chip" in scr_src else
                      (18 if "icon_case_notebook.png" in scr_src else
                       (16 if "icon_message_wall.png" in scr_src else
                        (14 if "icon_time_capsule.png" in scr_src else (12 if "icon_photo_album.png" in scr_src else 10)))))
    assert scr_src.count('style "main_menu_cozy_chip"') == expected_chips, f"Expected {expected_chips} main-menu cozy chips"
    assert "at main_title_in(0.74)" in scr_src
    for key in ("planetarium", "badges"):
        assert f'SetField(persistent, "extras_tab", "{key}"), ShowMenu("extras")' in scr_src, f"Main menu lost the `{key}` chip"
    report["MainMenuRow3"] = row3_w

    # 2.10 Achievement grid 2x12 & new achievement copy fits a single 258px line
    ach_src = (GAME_DIR / "achievements.rpy").read_text(encoding="utf-8-sig")
    assert "def ach_grid_rows():" in ach_src and "grid 2 ach_grid_rows():" in ach_src
    ach_text_w = 352 - 24 - 56 - 14
    for aid in ("ach_planetarium", "ach_badge_journal"):
        m = re.search(rf'"{aid}",\s*"([^"]+)",\s*"([^"]+)"', sg_src)
        assert m, f"Missing registration for {aid}"
        assert _w(sf[19], m.group(1)) <= ach_text_w and _w(f[14], m.group(2)) <= ach_text_w, f"{aid} copy wraps"

    print(
        "[PASS] 1280x720 pixel audit: "
        + ", ".join(f"{k}={v}px" for k, v in report.items())
        + " (SubBar<=702, Subtitle<=" + str(avail) + ", footers<=694)"
    )


def pc8_crane_defs():
    env = _sandbox_env()[0]
    return env["ORIGAMI_CRANE_PATTERNS"]


################################################################################
# 3. Sandbox runtime
################################################################################

_DATA_CACHE = {}


def _load_new_module_data():
    if not _DATA_CACHE:
        env = _sandbox_env()[0]
        _DATA_CACHE["PLANETARIUM_CIPHERS"] = env["PLANETARIUM_CIPHERS"]
        _DATA_CACHE["BADGE_DEFS"] = env["BADGE_DEFS"]
    return _DATA_CACHE


def _sandbox_env():
    lighting_src = (GAME_DIR / "lighting.rpy").read_text(encoding="utf-8-sig")
    bg_light_py = lighting_src.replace("define BG_LIGHT =", "BG_LIGHT =")

    class MockMusic:
        def __init__(self):
            self.playing = {}

        def register_channel(self, name, **kwargs):
            pass

        def play(self, filenames, channel="music", **kwargs):
            self.playing[channel] = filenames

        def stop(self, channel="music", **kwargs):
            self.playing.pop(channel, None)

        def set_volume(self, volume, delay=0, channel="music"):
            pass

        def get_playing(self, channel="music"):
            return self.playing.get(channel)

    class MockSound:
        def __init__(self):
            self.played = []

        def play(self, fn, **kwargs):
            self.played.append(fn)

    class MockRenpy:
        def __init__(self):
            self.music = MockMusic()
            self.sound = MockSound()
            self.shown_screens = []
            self.notifications = []
            self.saved_count = 0

        def get_screen(self, _n):
            return None

        def show_screen(self, name, *a, **kw):
            self.shown_screens.append((name, a, kw))

        def restart_interaction(self):
            pass

        def notify(self, msg):
            self.notifications.append(msg)

        def save_persistent(self):
            self.saved_count += 1

        def seen_image(self, _i):
            return False

        def seen_audio(self, _f):
            return False

        def list_slots(self):
            return []

        def unlink_save(self, _s):
            pass

        def has_label(self, _l):
            return True

        def substitute(self, s):
            return s

        def get_say_image_tag(self):
            return None

        def get_attributes(self, _t):
            return ()

        def image(self, *a, **kw):
            pass

    class MockAchievement:
        def __init__(self):
            self.registered = []
            self.granted = set()

        def register(self, aid, **kw):
            self.registered.append(aid)

        def has(self, aid):
            return aid in self.granted

        def grant(self, aid):
            self.granted.add(aid)

        def sync(self):
            pass

        def clear_all(self):
            self.granted.clear()

    class MockPersistent:
        def __getattr__(self, k):
            # Ren'Py persistent returns None for unknown fields
            return None

    mock_renpy = MockRenpy()
    mock_ach = MockAchievement()
    mp = MockPersistent()
    for k, v in {
        "chapter_reached": 0, "te_cleared": False, "truth_spoiler_confirmed": False,
        "end_te": False, "end_he": False, "end_ne": False, "end_be": False, "end_hidden": False,
        "extras_tab": "endings", "quote_bookmarks": [], "dossier_selected_char": "mo", "dossier_case_filter": "all",
        "studio_bg": "agency", "studio_light": "auto", "studio_slot1_char": "mo", "studio_slot1_expr": "smile",
        "studio_slot1_outfit": "standard", "studio_slot2_char": "alice", "studio_slot2_expr": "happy",
        "studio_slot2_outfit": "standard", "studio_speaker": "slot1_note", "studio_custom_line": "",
        "studio_show_textbox": True, "studio_hide_hud": False, "mailbox_cases": {}, "mailbox_selected_case": "m1",
        "tea_party_records": {}, "tea_party_selected": "t1", "lexicon_read": [], "lexicon_cat_filter": "all",
        "lexicon_search_query": "", "lexicon_selected_id": "lex_c01", "book_restoration_records": {},
        "restoration_selected_tome": "r1", "seasonal_letter_records": {}, "letterbox_selected_season": "spring",
        "radio_booth_records": {}, "radio_selected_broadcast": "b1", "origami_cabinet_records": {},
        "origami_selected_crane": "c01", "origami_cat_filter": "all", "planetarium_records": {},
        "planetarium_selected_cipher": "s1", "badge_journal_records": {}, "badge_selected_id": "bd01",
        "gramophone_rain_pct": 0, "gramophone_study_pct": 0, "gramophone_bgm_pct": 80,
        "gramophone_single_loop": False, "gramophone_stop_on_exit": True, "gramophone_preset": "pure_ost",
        "gramophone_unlock_all": False, "gramophone_last_track": "audio/theme_main.ogg", "last_player_name": "陈默",
    }.items():
        setattr(mp, k, v)

    class DummyMatrix:
        def __init__(self, tag):
            self.tag = tag

        def __mul__(self, other):
            return DummyMatrix(f"{self.tag}*{other.tag}")

    class DummyMusicRoom:
        def __init__(self, **_kw):
            self.tracks = []

        def add(self, fn, always_unlocked=False):
            self.tracks.append(fn)

        def is_unlocked(self, _fn):
            return True

    env = {
        "renpy": mock_renpy, "achievement": mock_ach, "persistent": mp,
        "config": type("Cfg", (), {"label_callback": None, "screen_height": 720, "skipping": False})(),
        "_history_list": [], "adv": None, "player_name": "陈默", "mo_favor": 50, "alice_favor": 25,
        "kako_clue": 2, "truth_route": False, "fail_count": 0, "intuition": 3, "full_run": False,
        "crane_given": False, "current_chapter_label": "prologue", "save_name": "", "evidence": [],
        "inspected_evidence": [], "expanded_evidence": "", "unlocked_deductions": [], "combine_slot_a": "",
        "combine_slot_b": "", "combine_feedback": "", "combine_feedback_kind": "idle", "combine_solved_title": "",
        "current_ambient_mode": "clear", "mailbox_combine_mistakes": 0,
        "Character": lambda *a, **kw: ("Character", a, kw),
        "TintMatrix": lambda v: DummyMatrix(f"Tint({v})"),
        "BrightnessMatrix": lambda v: DummyMatrix(f"Bright({v})"),
        "SaturationMatrix": lambda v: DummyMatrix(f"Sat({v})"),
        "Color": lambda rgb=None: rgb, "Transform": lambda child=None, **kw: ("Transform", child, kw),
        "At": lambda *a: ("At", a), "Null": lambda: ("Null",), "NullAction": lambda: ("NullAction",),
        "Show": lambda *a, **kw: ("Show", a, kw), "Hide": lambda *a, **kw: ("Hide", a, kw),
        "ShowMenu": lambda *a, **kw: ("ShowMenu", a, kw), "SetField": lambda *a, **kw: ("SetField", a, kw),
        "Function": lambda fn, *a, **kw: ("Function", fn, a, kw), "Start": lambda *a, **kw: ("Start", a),
        "Replay": lambda *a, **kw: ("Replay", a, kw), "MusicRoom": DummyMusicRoom, "_": lambda s: s,
        "sprite_breathe": "sprite_breathe",
    }

    class _StoreProxy:
        def __getattr__(self, k):
            if k in env:
                return env[k]
            raise AttributeError(k)

        def __setattr__(self, k, v):
            env[k] = v

    env["store"] = _StoreProxy()
    exec(bg_light_py, env)
    for target in ("achievements.rpy", "definitions.rpy", "extra.rpy", "club_mailbox.rpy",
                   "tea_party_lexicon.rpy", "bookstreet_seasons.rpy", "radio_origami.rpy", "stargazer_badges.rpy"):
        for _ln, code, is_init in extract_python_blocks(GAME_DIR / target):
            if is_init:
                exec(code, env)
    return env, mock_renpy, mock_ach, mp


def _scene_blocks(src):
    out = {}
    order = ["s1", "s2", "s3"]
    for i, sid in enumerate(order):
        nxt = rf"label planetarium_cipher_{order[i + 1]}:" if i < 2 else r"\Z"
        m = re.search(rf"label planetarium_cipher_{sid}:(.*?)(?={nxt})", src, re.S)
        assert m, f"Missing script block for planetarium_cipher_{sid}"
        out[sid] = m.group(1)
    return out


def check_pc9_planetarium_and_badges_runtime():
    env, mock_renpy, mock_ach, mp = _sandbox_env()
    sg_src = (ROOT / NEW_MODULE).read_text(encoding="utf-8-sig")

    # ---- A. Symmetric 24 achievements (2x12), PC-9 pair appended after PC-8 ----
    ach_ids = [a[0] for a in env["ACH_LIST"]]
    assert len(ach_ids) == 24 and len(ach_ids) % 2 == 0, f"Expected 24 achievements, got {len(ach_ids)}"
    assert env["ach_grid_rows"]() == 12
    assert ach_ids[-4:] == ["ach_radio_booth", "ach_origami_cabinet", "ach_planetarium", "ach_badge_journal"], ach_ids[-4:]
    assert "ach_planetarium" in mock_ach.registered and "ach_badge_journal" in mock_ach.registered

    # ---- B. Three playable star-cipher scenes ----
    ciphers = env["PLANETARIUM_CIPHERS"]
    assert [c["id"] for c in ciphers] == ["s1", "s2", "s3"]
    expected_titles = {"s1": "斗柄西指的铜钥匙", "s2": "四象星柜与南斗的抽屉", "s3": "鹤喙双星与天河上的渡口"}
    blocks = _scene_blocks(sg_src)
    cjk_counts = {}
    for c in ciphers:
        cid = c["id"]
        assert c["label"] == f"planetarium_cipher_{cid}" and c["title"] == expected_titles[cid]
        assert c["bg_key"] in env["BG_LIGHT"] and (GAME_DIR / c["bg_thumb"]).is_file()
        assert len(c["star_clues"]) == 3
        assert len(c["annotation_pub"]) >= 120, f"{cid} annotation too short"
        assert c["cipher_text"] and c["mo_note_pub"] and c["alice_note_pub"]
        blk = blocks[cid]
        cjk_counts[cid] = _cjk(blk)
        assert 1500 <= cjk_counts[cid] <= 2300, f"Scene {cid} CJK count {cjk_counts[cid]} outside 1,500-2,300"
        inv, ql = f"planetarium_{cid}_investigate", f"planetarium_{cid}_q_loop"
        assert f"label {inv}:" in blk and blk.count(f"jump {inv}") == 2, f"{cid}: needs 2 investigate loopbacks"
        assert f"label {ql}:" in blk and blk.count(f"jump {ql}") == 2, f"{cid}: needs exactly 2 gentle wrong-answer loopbacks"
        assert blk.count("$ _pl_mistakes += 1") == 2 and blk.count("play sound se_correct") == 1
        assert "show screen planetarium_prompt_banner(" in blk
        assert f'call _planetarium_finish_cipher("{cid}", _pl_mistakes)' in blk
        for forbidden in ("add_fail(", "fail_count +=", "fail_count -=", "mo_favor +=", "alice_favor +=", "add_kako(", "truth_route ="):
            assert forbidden not in blk, f"{cid} touches main-story state via `{forbidden}`"
        # each wrong branch is followed by a gentle hint (mo_note) before looping back
        for m_wrong in re.finditer(r"\$ _pl_mistakes \+= 1(.*?)jump " + ql, blk, re.S):
            assert "mo_note " in m_wrong.group(1) and "alice " in m_wrong.group(1), f"{cid}: wrong branch lacks a gentle hint"
        for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
            name = m_bg.group(1)
            assert name == "black" or (name in env["BG_LIGHT"] and (GAME_DIR / "images" / f"bg_{name}.png").is_file()), name
        for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
            ch, ex = m_ch.group(1), m_ch.group(2)
            if ch in ("screen", "layer", "bg", "cg"):
                continue
            assert (GAME_DIR / "images" / f"chara_{ch}_{ex}.png").is_file(), f"Missing sprite chara_{ch}_{ex}.png in {cid}"

    # label callback: gramophone ambience stops & bookmarks know where we are
    for c in ciphers:
        mp.gramophone_stop_on_exit = False
        env["apply_gramophone_preset"]("rainy_bookstore")
        assert env["gramophone_ambience_active"]() is True
        env["_progress_label_callback"](c["label"], False)
        assert env["gramophone_ambience_active"]() is False
        assert env["store"].current_chapter_label == c["label"]

    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["planetarium_launch_action"]("s2")
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    assert any(isinstance(x, tuple) and x[0] == "Replay" and x[1][0] == "planetarium_cipher_s2" for x in act)

    # observation clues, annotation modal, rating upgrade, achievement
    assert env["planetarium_solved_count"]() == 0
    for clue in ciphers[0]["star_clues"]:
        assert env["planetarium_observe_clue"]("s1", clue["id"]) is True
    assert env["planetarium_observe_clue"]("s1", "bogus") is False
    assert len(env["planetarium_get_record"]("s1")["observed_clues"]) == 3
    env["planetarium_open_annotation_modal"]("s1")
    assert any(s[0] == "planetarium_annotation_modal" for s in mock_renpy.shown_screens)
    assert env["planetarium_get_record"]("s1")["annotation_viewed"] is False, "Unsolved cipher must not count as annotated"
    assert env["planetarium_render_view"]("s1")["display_annotation"] == "", "Annotation must stay hidden until solved"

    r1 = env["planetarium_record_solve"]("s1", 2)
    assert r1["solved"] and not r1["first_try"] and r1["best_badge"] == env["PLANETARIUM_WARM_BADGE"]
    assert env["fail_count"] == 0, "Planetarium mistakes must never mutate main-story fail_count"
    assert env["planetarium_render_view"]("s1")["display_annotation"] == ciphers[0]["annotation_pub"]
    r1b = env["planetarium_record_solve"]("s1", 0)
    assert r1b["first_try"] and r1b["best_badge"] == env["PLANETARIUM_GOLD_BADGE"] and r1b["replays"] == 2
    r1c = env["planetarium_record_solve"]("s1", 1)
    assert r1c["best_badge"] == env["PLANETARIUM_GOLD_BADGE"] and r1c["last_badge"] == env["PLANETARIUM_WARM_BADGE"]
    env["planetarium_record_solve"]("s2", 0)
    assert not mock_ach.has("ach_planetarium")
    env["planetarium_record_solve"]("s3", 0)
    assert mock_ach.has("ach_planetarium") and env["planetarium_solved_count"]() == 3

    # step-execute every `$` line of the sandbox init + each scene
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop()
    for k, v in {"bgm_warm": "w", "bgm_suspense": "s", "bgm_prologue": "p", "bgm_te": "te"}.items():
        env[k] = v
    env["_in_replay"] = False
    init_blk = re.search(r"label _planetarium_init_sandbox.*?:(.*?)label _planetarium_finish_cipher", sg_src, re.S).group(1)
    for cid, blk in blocks.items():
        env["session_save_title"] = cid
        env["init_ambient"] = "night"
        for ln in init_blk.splitlines():
            if ln.strip().startswith("$ "):
                exec(ln.strip()[2:], env)
        for ln in blk.splitlines():
            if ln.strip().startswith("$ "):
                exec(ln.strip()[2:], env)
        assert env[f"_{cid}_c1"] is True and env[f"_{cid}_c2"] is True
        assert env["_pl_mistakes"] == 2 and env["fail_count"] == 0
    env["mo_favor"] = 50
    env["fail_count"] = 0

    # ---- C. Bronze badge journal ----
    badges = env["BADGE_DEFS"]
    assert [b["id"] for b in badges] == [f"bd{i:02d}" for i in range(1, 10)]
    valid_tabs = {"mailbox", "teaparty", "lexicon", "restoration", "letterbox", "origami", "radio", "planetarium", "badges"}
    assert {b["tab"] for b in badges} == valid_tabs
    for b in badges:
        assert len(b["mo_memo"]) >= 25 and len(b["alice_memo"]) >= 25, f"{b['id']} memo too short"
        if b["spoiler"]:
            assert b.get("mo_memo_secret") and b.get("alice_memo_secret")
    assert [b["id"] for b in badges if b["spoiler"]] == ["bd06", "bd07", "bd08", "bd09"]

    # Fresh profile: every badge but the planetarium one (solved above) is locked
    mp.planetarium_records = {}
    assert env["badge_earned_count"]() == 0 and env["badge_stamped_count"]() == 0
    assert env["badge_stamp"]("bd01", True) is None and mock_renpy.notifications, "Locked badge must only show a gentle notice"
    assert env["badge_get_record"]("bd01")["stamped"] is False

    def _complete(key):
        if key == "mailbox":
            for c in env["MAILBOX_CASE_DEFS"]:
                env["mailbox_record_case_clear"](c["id"], 0)
        elif key == "teaparty":
            for s in env["TEA_PARTY_SESSIONS"]:
                env["tea_party_record_clear"](s["id"], 0)
        elif key == "lexicon":
            for e in env["LEXICON_ENTRIES"]:
                env["lexicon_mark_read"](e["id"])
        elif key == "restoration":
            mp.book_restoration_records = {t["id"]: {"restored": True} for t in env["RESTORATION_TOMES"]}
        elif key == "letterbox":
            for s in env["SEASONAL_LETTERS"]:
                env["letterbox_record_clear"](s["id"], 0)
        elif key == "origami":
            for c in env["ORIGAMI_CRANE_PATTERNS"]:
                env["origami_fold_and_inspect"](c["id"], False)
        elif key == "radio":
            for b in env["RADIO_BROADCASTS"]:
                env["radio_record_clear"](b["id"], 0)
        elif key == "planetarium":
            for c in env["PLANETARIUM_CIPHERS"]:
                env["planetarium_record_solve"](c["id"], 0)

    # Lexicon badge must be earnable WITHOUT any spoiler unlock (only public entries count)
    assert mp.te_cleared is False and mp.truth_spoiler_confirmed is False
    for idx, b in enumerate(badges[:8]):
        cur, tot = env["badge_progress"](b["id"])
        assert cur < tot and env["badge_status"](b["id"]) == "locked", f"{b['id']} earned too early ({cur}/{tot})"
        _complete(b["progress_key"])
        cur, tot = env["badge_progress"](b["id"])
        assert cur == tot and env["badge_status"](b["id"]) == "earned", f"{b['id']} not earned after completing {b['source']}"
        assert env["badge_stamp"](b["id"], open_modal=(idx == 7))["stamped"] is True
        assert env["badge_status"](b["id"]) == "stamped"
    assert env["badge_progress"]("bd01") == (3, 3)
    assert env["badge_progress"]("bd03")[1] == sum(1 for e in env["LEXICON_ENTRIES"] if not e.get("spoiler"))
    assert any(s[0] == "badge_journal_page_modal" and s[2].get("badge_id") == "bd08" for s in mock_renpy.shown_screens)
    assert env["badge_status"]("bd09") == "earned" and not mock_ach.has("ach_badge_journal")
    env["badge_stamp"]("bd09", False)
    assert env["badge_stamped_count"]() == 9 and mock_ach.has("ach_badge_journal"), "ach_badge_journal must unlock at 9/9"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50 and env["truth_route"] is False

    # ---- D. Zero-side-channel spoiler gate ----
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    def _fields_clean(view, where):
        for k, v in view.items():
            if isinstance(v, str):
                for kw in SECRET_KEYWORDS:
                    assert kw not in v, f"Spoiler keyword `{kw}` leaked in {where}.{k}"

    s3_locked = env["planetarium_render_view"]("s3")
    assert s3_locked["unlocked"] is False and s3_locked["solved"] is True
    assert s3_locked["display_annotation_secret"] == "" and s3_locked["display_masked_prompt"]
    _fields_clean(s3_locked, "planetarium.s3")
    for b in badges:
        v = env["badge_render_view"](b["id"])
        _fields_clean(v, b["id"])
        if b["spoiler"]:
            assert v["unlocked"] is False and v["display_masked_notice"]
            assert v["display_mo_secret"] == "" and v["display_alice_secret"] == ""
        else:
            assert v["display_masked_notice"] == ""

    # Public data never carries secret keywords, even before rendering
    pub_keys = ("title", "short_title", "sky_tag", "chart_source", "summary_pub", "cipher_text", "annotation_pub",
                "mo_note_pub", "alice_note_pub", "masked_spoiler_hint", "lighting_note", "companions")
    for c in ciphers:
        for k in pub_keys:
            for kw in SECRET_KEYWORDS:
                assert kw not in c.get(k, ""), f"`{kw}` in public field {c['id']}.{k}"
        for clue in c["star_clues"]:
            for kw in SECRET_KEYWORDS:
                assert kw not in clue["label"] + clue["surface"] + clue["detail"]
    for b in badges:
        for k in ("name", "row", "source", "condition", "mo_memo", "alice_memo"):
            for kw in SECRET_KEYWORDS:
                assert kw not in b[k], f"`{kw}` in public badge field {b['id']}.{k}"
    assert env["BADGE_SPOILER_NOTICE"] and not any(kw in env["BADGE_SPOILER_NOTICE"] for kw in SECRET_KEYWORDS)

    # Side-channel proof: rewriting every secret string leaves the locked render byte-identical
    saved_c = copy.deepcopy(ciphers[2])
    saved_b = {b["id"]: copy.deepcopy(b) for b in badges}
    before_s3 = env["planetarium_render_view"]("s3")
    before_b = {b["id"]: env["badge_render_view"](b["id"]) for b in badges}
    for k in ("annotation_secret", "mo_note_secret", "alice_note_secret"):
        ciphers[2][k] = "X" * 333
    for b in badges:
        if b["spoiler"]:
            b["mo_memo_secret"] = "Y" * 211
            b["alice_memo_secret"] = "Z" * 97
    assert env["planetarium_render_view"]("s3") == before_s3, "Locked S-03 view depends on secret text (side channel)"
    for b in badges:
        assert env["badge_render_view"](b["id"]) == before_b[b["id"]], f"Locked {b['id']} view depends on secret text"
    ciphers[2].clear()
    ciphers[2].update(saved_c)
    for b in badges:
        bid = b["id"]
        b.clear()
        b.update(saved_b[bid])

    # In-scene: secret keywords only inside the `if truth_spoiler_unlocked():` branch of S-03
    s3 = blocks["s3"]
    m_branch = re.search(r"\n    if truth_spoiler_unlocked\(\):\n(.*?)\n    else:\n(.*?)\n    play sound", s3, re.S)
    assert m_branch, "S-03 must branch on truth_spoiler_unlocked()"
    secret_part, public_part = m_branch.group(1), m_branch.group(2)
    outside = s3.replace(secret_part, "")
    for kw in SECRET_KEYWORDS:
        assert kw not in outside, f"`{kw}` appears outside the spoiler branch of S-03"
    assert "周可" in secret_part and re.search(r'^\s+mo "', secret_part, re.M)
    for cid in ("s1", "s2"):
        assert "truth_spoiler_unlocked" not in blocks[cid]
        for kw in SECRET_KEYWORDS:
            assert kw not in blocks[cid], f"`{kw}` in non-spoiler scene {cid}"
    # 墨墨 only speaks aloud in the spoiler branch; everywhere else she communicates through mo_note
    assert re.search(r'^\s+mo_note "', public_part, re.M)
    assert not re.search(r'^\s+mo "', s3.replace(secret_part, ""), re.M), "墨墨 must stay silent outside the spoiler branch"
    for cid in ("s1", "s2"):
        assert not re.search(r'^\s+mo "', blocks[cid], re.M), f"墨墨 must stay silent in {cid}"

    # Unlock -> secrets appear
    mp.te_cleared = True
    assert env["truth_spoiler_unlocked"]() is True
    s3_open = env["planetarium_render_view"]("s3")
    assert s3_open["unlocked"] and "小雪" in s3_open["display_annotation_secret"] and s3_open["display_masked_prompt"] == ""
    bd09_open = env["badge_render_view"]("bd09")
    assert bd09_open["unlocked"] and "明天见" in bd09_open["display_mo_secret"] and bd09_open["display_masked_notice"] == ""
    mp.te_cleared = False
    mp.truth_spoiler_confirmed = True
    assert env["badge_render_view"]("bd07")["display_alice_secret"]

    # ---- E. reset_all_progress clears PC-9 state and leaves main-story vars alone ----
    env["reset_all_progress"]()
    assert env["planetarium_solved_count"]() == 0 and env["badge_stamped_count"]() == 0
    assert env["badge_earned_count"]() == 0
    assert mp.planetarium_selected_cipher == "s1" and mp.badge_selected_id == "bd01"
    assert env["fail_count"] == 0 and env["mo_favor"] == 50

    print(
        f"[PASS] PC-9 runtime: 3 star-cipher scenes (CJK={cjk_counts}) + ach_planetarium | "
        f"9 bronze badges stamped 9/9 + ach_badge_journal | 24 achievements (2x12) | zero-leak spoiler gate + side-channel proof"
    )
    return cjk_counts


################################################################################
# 4. Zero intrusion, icons, text safety
################################################################################

def check_zero_intrusion_and_icons():
    res = subprocess.run(["git", "status", "--porcelain", "--", *rs.strict_files(MAIN_STORY_FILES)],
                         cwd=str(ROOT), capture_output=True, text=True, check=True)
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay files were modified!\n{res.stdout}"

    diff = subprocess.run(["git", "diff", "-U0", "--", *[p for p in PC9_TOUCHED_FILES if p != NEW_MODULE]],
                          cwd=str(ROOT), capture_output=True, text=True, encoding="utf-8", check=True)
    for line in diff.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added = line[1:]
            assert "<svg" not in added.lower(), f"Inline <svg> in diff: {added}"
            assert "�" not in added, f"U+FFFD in diff: {added}"
            assert not EMOJI_RE.search(added), f"Emoji in diff: {added}"

    new_src = (ROOT / NEW_MODULE).read_text(encoding="utf-8-sig")
    assert "<svg" not in new_src.lower() and "�" not in new_src and not EMOJI_RE.search(new_src)
    assert "\t" not in new_src

    # Ren'Py evaluates `[...]` in displayed text; data strings must not contain brackets or text-tag braces
    init_code = "\n".join(code for _l, code, is_init in extract_python_blocks(ROOT / NEW_MODULE) if is_init)
    for node in ast.walk(ast.parse(init_code)):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and re.search(r"[一-鿿]", node.value):
            assert not re.search(r"[\[\]{}]", node.value), f"Interpolation-unsafe data string: {node.value[:40]}"
    # every lighting_note shown on screen opts out of interpolation (fixes PC-7/PC-8 `BG_LIGHT[...]` crash)
    for rel in ("game/radio_origami.rpy", "game/bookstreet_seasons.rpy", NEW_MODULE):
        for ln in (ROOT / rel).read_text(encoding="utf-8-sig").splitlines():
            if re.search(r'text \(".*%s" % _\w+\["lighting_note"\]\)', ln):
                assert "substitute False" in ln, f"lighting_note text without `substitute False` in {rel}: {ln.strip()}"

    print("[PASS] Zero main-story intrusion (prologue..chapter6, interlude, definitions.rpy, autoplay untouched), "
          "no Emoji/SVG, interpolation-safe data strings")

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
            if rel_icon in PC9_UI_ICONS:
                ratio = a.histogram()[0] / float(128 * 128)
                assert 0.15 <= ratio <= 0.88, f"{rel_icon} transparency ratio {ratio:.3f}"
        verified += 1
    print(f"[PASS] All {verified}/26 RGBA UI icons verified (128x128 RGBA, transparent corners); "
          f"PC-9 set: {', '.join(Path(x).name for x in PC9_UI_ICONS)}")


################################################################################
# 5. References / delimiters
################################################################################

def check_balanced_delimiters_and_references():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    screens, labels, styles, images = set(pc8_builtin_screens()), {"main_menu", "start", "splashscreen"}, set(pc8_builtin_styles()), set()
    screen_re = re.compile(r"^\s*screen\s+([A-Za-z_]\w*)\s*\(")
    label_re = re.compile(r"^\s*label\s+([A-Za-z_]\w*)\s*(?:\(.*\))?\s*:")
    style_re = re.compile(r"^\s*style\s+([A-Za-z_]\w*)(?:\s+is\s+([A-Za-z_]\w*))?")
    image_re = re.compile(r"^\s*image\s+([A-Za-z0-9_\s]+?)\s*(?:=|:)")
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
    for child, parent, loc in parents:
        assert parent in styles, f"Style `{child}` inherits undefined `{parent}` at {loc}"

    for img in ("ui_icon_clocktower_planetarium", "ui_icon_star_cipher_chart", "ui_icon_badge_journal", "ui_icon_bronze_badge"):
        assert img in images, f"Missing image alias {img}"
    for scr in ("extras_planetarium", "planetarium_annotation_modal", "planetarium_prompt_banner",
                "planetarium_result_card", "extras_badge_journal", "badge_journal_page_modal", "extras_achievements"):
        assert scr in screens, f"Missing screen {scr}"
    for lbl in ("planetarium_cipher_s1", "planetarium_cipher_s2", "planetarium_cipher_s3",
                "planetarium_s1_investigate", "planetarium_s2_investigate", "planetarium_s3_investigate",
                "planetarium_s1_q_loop", "planetarium_s2_q_loop", "planetarium_s3_q_loop",
                "_planetarium_init_sandbox", "_planetarium_finish_cipher"):
        assert lbl in labels, f"Missing label {lbl}"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC9_TOUCHED_FILES:
        lines = (ROOT / rel).read_text(encoding="utf-8-sig").splitlines()
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
    for icon in PC9_UI_ICONS:
        assert icon in refs, f"PC-9 icon {icon} is not wired into any .rpy"

    # Every label PLANETARIUM_CIPHERS launches is registered for the label callback
    extra_src = (GAME_DIR / "extra.rpy").read_text(encoding="utf-8-sig")
    for sid in ("s1", "s2", "s3"):
        assert f'"planetarium_cipher_{sid}":' in extra_src
    assert extra_src.count("or name in _PLANETARIUM_LABELS") == 2
    for fld in ("planetarium_records", "planetarium_selected_cipher", "badge_journal_records", "badge_selected_id"):
        assert f"default persistent.{fld} =" in extra_src and f"persistent.{fld} =" in extra_src.split("def reset_all_progress")[1]

    for rel in PC9_TOUCHED_FILES:
        src = (ROOT / rel).read_text(encoding="utf-8-sig")
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


def pc8_builtin_screens():
    return ["main_menu", "say", "input", "choice", "quick_menu", "navigation", "game_menu", "save", "load",
            "preferences", "history", "help", "about", "confirm", "skip_indicator", "notify"]


def pc8_builtin_styles():
    return ["default", "text", "button", "button_text", "bar", "vbar", "slider", "vslider", "scrollbar", "vscrollbar",
            "frame", "window", "vbox", "hbox", "grid", "fixed", "viewport", "vpgrid", "input", "say_label",
            "say_dialogue", "namebox", "confirm_frame", "confirm_prompt", "page_label", "page_label_text"]


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
    for shot in ("ui_09zc_planetarium_locked.png", "ui_09zd_planetarium_annotated.png", "ui_09ze_planetarium_modal.png",
                 "ui_09zf_badge_journal_locked.png", "ui_09zg_badge_journal_stamped.png", "ui_09zh_badge_journal_page.png"):
        assert shot in shots, f"Missing {shot} in game/tests/ui_shots.rpy"
    assert "ach_grant" not in shots.split("ui_09zc_planetarium_locked.png")[1].split("ui_07_confirm.png")[0], \
        "UI audit must not grant real achievements"
    assert not EMOJI_RE.search(Path(__file__).read_text(encoding="utf-8-sig"))
    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-9 coverage (6 shots) verified")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc9_planetarium_and_badges_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC9_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
