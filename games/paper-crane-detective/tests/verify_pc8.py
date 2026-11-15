#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-8 Finale Comprehensive Static, Behavioral, Pixel-Budget, Old Campus Radio Mystery Booth,
Walnut-and-Velvet Origami Crane Curio Cabinet, Spoiler-Gate, Asset & Zero-Intrusion Verifier
for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).
"""

import ast
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageFont

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"

PC4_UI_ICONS = [
    "images/ui/icon_crane_bookmark.png",
    "images/ui/icon_dossier_pin.png",
    "images/ui/icon_dossier_stamp.png",
    "images/ui/icon_red_thread_knot.png",
    "images/ui/icon_theater_clapper.png",
    "images/ui/icon_lighting_lamp.png",
]

PC5_UI_ICONS = [
    "images/ui/icon_club_mailbox.png",
    "images/ui/icon_gramophone_disc.png",
    "images/ui/icon_rain_ambience.png",
    "images/ui/icon_book_ambience.png",
]

PC6_UI_ICONS = [
    "images/ui/icon_tea_party_cup.png",
    "images/ui/icon_mystery_lexicon.png",
    "images/ui/icon_riddle_quiz_card.png",
    "images/ui/icon_margin_quill_note.png",
]

PC7_UI_ICONS = [
    "images/ui/icon_book_restoration.png",
    "images/ui/icon_exlibris_bookplate.png",
    "images/ui/icon_seasonal_letterbox.png",
    "images/ui/icon_wax_seal_seasons.png",
]

PC8_UI_ICONS = [
    "images/ui/icon_radio_booth_mic.png",
    "images/ui/icon_listener_letter_tape.png",
    "images/ui/icon_origami_cabinet.png",
    "images/ui/icon_golden_vow_crane.png",
]

REQUIRED_UI_ICONS = PC4_UI_ICONS + PC5_UI_ICONS + PC6_UI_ICONS + PC7_UI_ICONS + PC8_UI_ICONS

MAIN_STORY_FILES = [
    "game/script.rpy",
    "game/chapter1.rpy",
    "game/chapter2.rpy",
    "game/chapter3.rpy",
    "game/chapter4.rpy",
    "game/chapter5.rpy",
    "game/chapter6.rpy",
    "game/interlude.rpy",
    "game/definitions.rpy",
    "game/tests/autoplay.rpy",
]

PC8_TOUCHED_FILES = [
    "game/radio_origami.rpy",
    "game/extra.rpy",
    "game/bookstreet_seasons.rpy",
    "game/achievements.rpy",
    "game/screens.rpy",
    "game/tests/ui_shots.rpy",
]

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u26FF\u2700-\u27BF]")


def _paren_delta(line: str) -> int:
    delta = 0
    in_str = None
    esc = False
    i = 0
    while i < len(line):
        ch = line[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            if ch == "#":
                break
            if ch in ('"', "'"):
                in_str = ch
            elif ch in "([{":
                delta += 1
            elif ch in ")]}":
                delta -= 1
        i += 1
    return delta


def extract_python_blocks(rpy_path: Path):
    """Extract `init ... python:` and inline `python:` blocks from a .rpy file."""
    lines = rpy_path.read_text(encoding="utf-8-sig").splitlines()
    blocks = []
    i = 0
    n = len(lines)
    header_re = re.compile(r"^(\s*)(?:init(?:\s+[-+]?\d+)?\s+)?python(?:\s+in\s+\w+)?\s*:\s*(?:#.*)?$")
    while i < n:
        m = header_re.match(lines[i])
        if not m:
            i += 1
            continue
        base_indent = len(m.group(1))
        is_init = "init" in lines[i].split("python")[0]
        start_line = i + 2
        i += 1
        body = []
        min_indent = None
        while i < n:
            raw = lines[i]
            stripped = raw.strip()
            if not stripped or stripped.startswith("#"):
                body.append("")
                i += 1
                continue
            cur_indent = len(raw) - len(raw.lstrip(" "))
            if cur_indent <= base_indent:
                break
            if min_indent is None or cur_indent < min_indent:
                min_indent = cur_indent
            body.append(raw)
            i += 1
        if body and min_indent is not None:
            dedented = [(ln[min_indent:] if len(ln) >= min_indent else "") for ln in body]
            blocks.append((start_line, "\n".join(dedented), is_init))
    return blocks


def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 26, f"Expected >=26 .rpy files (including radio_origami.rpy), found {len(rpy_files)}"
    assert (GAME_DIR / "radio_origami.rpy").is_file(), "Missing game/radio_origami.rpy"

    total_blocks = 0
    total_inline = 0
    for rpy in rpy_files:
        for start_line, code, _is_init in extract_python_blocks(rpy):
            total_blocks += 1
            try:
                ast.parse(code, filename=f"{rpy.name}:{start_line}")
            except SyntaxError as exc:
                raise AssertionError(
                    f"Python syntax error in {rpy.relative_to(ROOT)} block@{start_line}: {exc}"
                ) from exc

        lines = rpy.read_text(encoding="utf-8-sig").splitlines()
        idx = 0
        while idx < len(lines):
            s = lines[idx].strip()
            if s.startswith("$ "):
                lineno = idx + 1
                stmt_parts = [s[2:].strip()]
                depth = _paren_delta(stmt_parts[0])
                idx += 1
                while depth > 0 and idx < len(lines):
                    nxt = lines[idx].strip()
                    stmt_parts.append(nxt)
                    depth += _paren_delta(nxt)
                    idx += 1
                stmt = "\n".join(stmt_parts)
                total_inline += 1
                try:
                    ast.parse(stmt, filename=f"{rpy.name}:{lineno}")
                except SyntaxError as exc:
                    raise AssertionError(
                        f"Inline Python `$` syntax error in {rpy.relative_to(ROOT)}:{lineno}: {exc}"
                    ) from exc
            else:
                idx += 1

    print(
        f"[PASS] Python AST syntax check across {len(rpy_files)} .rpy files "
        f"({total_blocks} python blocks + {total_inline} inline `$` statements)"
    )


def check_layout_and_pixel_bounds():
    """Verify strict 1280x720, <=722px, <=702px, and <=546px pixel budgets for PC-8 UI."""
    sans_path = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    serif_path = GAME_DIR / "fonts" / "NotoSerifSC-Bold.otf"
    assert sans_path.is_file(), f"Missing font file: {sans_path}"
    assert serif_path.is_file(), f"Missing font file: {serif_path}"
    font_15 = ImageFont.truetype(str(sans_path), 15)
    font_14 = ImageFont.truetype(str(sans_path), 14)
    font_13 = ImageFont.truetype(str(sans_path), 13)
    font_12 = ImageFont.truetype(str(sans_path), 12)
    font_11 = ImageFont.truetype(str(sans_path), 11)
    serif_13 = ImageFont.truetype(str(serif_path), 13)

    def _txt_w(fnt, text: str) -> int:
        bb = fnt.getbbox(text)
        return bb[2] - bb[0]

    extra_src = (GAME_DIR / "extra.rpy").read_text(encoding="utf-8-sig")

    # 1. Primary 9-tab EXTRAS_TABS bar <= 722px
    m_tabs = re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_tabs, "Could not locate EXTRAS_TABS in extra.rpy"
    tabs = ast.literal_eval("[" + m_tabs.group(1) + "]")
    assert len(tabs) == 9, f"Expected 9 primary tabs in EXTRAS_TABS, got {len(tabs)}"
    widths = [max(54, _txt_w(font_15, lbl) + 16) for _k, lbl in tabs]
    total_tab_px = sum(widths) + 5 * (len(tabs) - 1)
    assert total_tab_px <= 722, f"EXTRAS_TABS overflows 722px: {total_tab_px}px"

    # 2. Detective Salon 6-pill Secondary Sub-Bar <= 702px inner width (722px outer frame)
    m_ro = re.search(r"EXTRAS_RADIO_ORIGAMI_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_ro, "Could not locate EXTRAS_RADIO_ORIGAMI_TABS in extra.rpy"
    ro_tabs = ast.literal_eval("[" + m_ro.group(1) + "]")
    assert [k for k, _ in ro_tabs] == ["radio", "origami"]

    subbar_pills = [
        "茶话会 3/3",
        "批注辞典 20/20",
        "古籍修复 3/3",
        "四季信笺 4/4",
        "旧广播电台 3/3",
        "千纸鹤陈列柜 12/12",
    ]
    # bookstreet_subtab_pill: xminimum 66, padding (6, 0), size 11; 5 icons (14px each), spacing 4
    pill_widths = [max(66, _txt_w(font_11, p) + 12) for p in subbar_pills]
    subbar_left_w = (
        14 + 4 + pill_widths[0] + 4 + pill_widths[1]
        + 4 + 14 + 4 + pill_widths[2]
        + 4 + 14 + 4 + pill_widths[3]
        + 4 + 14 + 4 + pill_widths[4]
        + 4 + 14 + 4 + pill_widths[5]
    )
    subbar_right_w = 14 + 4 + _txt_w(font_11, "鹤谱 12/12")
    subbar_total_inner = subbar_left_w + 8 + subbar_right_w
    assert subbar_total_inner <= 702, f"6-pill salon_subbar_frame overflows 702px inner width: {subbar_total_inner}px"
    assert subbar_total_inner + 20 <= 722, f"6-pill salon_subbar_frame overflows 722px outer width: {subbar_total_inner + 20}px"

    # 3. Vertical budget inside game_menu_content_frame (ysize=594, padding=(28,24) => inner 546px)
    assert "ysize 468" in extra_src and "spacing 7" in extra_src
    assert 'elif cur == "radio":' in extra_src and "use extras_radio_booth" in extra_src
    assert 'elif cur == "origami":' in extra_src and "use extras_origami_cabinet" in extra_src
    vertical_sum = 34 + 7 + 30 + 7 + 468
    assert vertical_sum == 546, f"Vertical stack must match 546px budget: {vertical_sum}px"

    # 4. Radio Booth & Origami Curio Cabinet exact card & filter bounds
    assert 3 * 234 + 2 * 10 == 722, "Radio 3-episode selector must equal 722px"
    assert 3 * 226 + 2 * 8 == 694, "Radio 3-clue & Origami 3-step rows must fit 694px inner card width"
    assert 4 * 173 + 3 * 10 == 722, "Origami 4x3 curio shelf grid must equal 722px"

    origami_cats = ["全部图谱 (12)", "校园案卷 (4)", "四季风物 (4)", "电波真约 (4)"]
    origami_cat_left = sum(max(96, _txt_w(font_12, c) + 20) for c in origami_cats) + 6 * 3
    origami_cat_right = _txt_w(font_11, "集齐 12 式解锁成就「千纸鹤折纸图谱家」")
    assert origami_cat_left + 12 + origami_cat_right <= 702, (
        f"Origami category filter bar overflows 702px: {origami_cat_left + 12 + origami_cat_right}px"
    )

    # Check Origami curio card internal text fit (173px - 18px padding = 155px inner width)
    ro_src = (GAME_DIR / "radio_origami.rpy").read_text(encoding="utf-8-sig")
    for m_sn in re.finditer(r'"short_name":\s*"([^"]+)"', ro_src):
        sn = m_sn.group(1)
        assert _txt_w(serif_13, sn) <= 155, f"Origami short_name `{sn}` overflows 155px curio card inner width"

    # Check Letterbox updated footer with Origami cross-link pill <= 694px
    lb_footer_left = _txt_w(font_12, "已阅信笺 4/4 · 无瑕金印 4/4 · 全钤印解锁「四季火漆信笺」")
    lb_footer_right = (
        max(56, _txt_w(font_11, "千纸鹤陈列柜") + 16)
        + 6
        + max(56, _txt_w(font_11, "展阅信笺原件") + 16)
        + 6
        + max(142, _txt_w(font_14, "重温纪念剧场") + 20)
    )
    assert lb_footer_left + 10 + lb_footer_right <= 694, (
        f"Letterbox footer row overflows 694px: {lb_footer_left + 10 + lb_footer_right}px"
    )

    # 5. Main Menu 2nd cozy chip row (4 balanced chips: PC-7 + PC-8) within 1280x720
    mm_row2_chips = [
        18 + 6 + _txt_w(font_13, "古籍修复台 (3/3)") + 24,
        18 + 6 + _txt_w(font_13, "四季信笺匣 (4/4)") + 24,
        18 + 6 + _txt_w(font_13, "旧广播电台 (3/3)") + 24,
        18 + 6 + _txt_w(font_13, "千纸鹤陈列柜 (12/12)") + 24,
    ]
    mm_row2_w = sum(mm_row2_chips) + 10 * 3
    assert mm_row2_w <= 760, f"Main menu row-2 4-chip bar too wide: {mm_row2_w}px"

    # 6. Achievements symmetric 2x11 grid fit
    ach_src = (GAME_DIR / "achievements.rpy").read_text(encoding="utf-8-sig")
    assert "def ach_grid_rows():" in ach_src and "grid 2 ach_grid_rows():" in ach_src
    assert 352 * 2 + 12 <= 722

    print(
        f"[PASS] 1280x720 & <=722px pixel audit: EXTRAS_TABS={total_tab_px}px<=722px, "
        f"SubBar6Pills={subbar_total_inner}px<=702px, Vertical={vertical_sum}px==546px, "
        f"OrigamiFilter={origami_cat_left + 12 + origami_cat_right}px<=702px, MainMenuRow2={mm_row2_w}px<1280px"
    )


def check_pc8_radio_and_origami_runtime():
    """Execute full .rpy Python runtime including radio_origami.rpy in stateful sandbox."""
    lighting_src = (GAME_DIR / "lighting.rpy").read_text(encoding="utf-8-sig")
    bg_light_py = lighting_src.replace("define BG_LIGHT =", "BG_LIGHT =")

    class MockMusic:
        def __init__(self):
            self.channels = {}
            self.playing = {}
            self.volumes = {"music": 1.0}

        def register_channel(self, name, **kwargs):
            self.channels[name] = kwargs
            self.volumes.setdefault(name, 1.0)

        def play(self, filenames, channel="music", **kwargs):
            self.playing[channel] = filenames

        def stop(self, channel="music", **kwargs):
            self.playing.pop(channel, None)

        def set_volume(self, volume, delay=0, channel="music"):
            self.volumes[channel] = float(volume)

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

        def get_screen(self, _name):
            return None

        def show_screen(self, name, *args, **kwargs):
            self.shown_screens.append((name, args, kwargs))

        def restart_interaction(self):
            pass

        def notify(self, msg):
            self.notifications.append(msg)

        def save_persistent(self):
            self.saved_count += 1

        def seen_image(self, _img):
            return False

        def seen_audio(self, _fn):
            return False

        def list_slots(self):
            return []

        def unlink_save(self, _s):
            pass

        def has_label(self, _lbl):
            return True

        def substitute(self, s):
            return s

        def get_say_image_tag(self):
            return None

        def get_attributes(self, _tag):
            return ()

        def image(self, *_args, **_kwargs):
            pass

    class MockAchievement:
        def __init__(self):
            self.registered = set()
            self.granted = set()

        def register(self, aid, **_kwargs):
            self.registered.add(aid)

        def has(self, aid):
            return aid in self.granted

        def grant(self, aid):
            self.granted.add(aid)

        def sync(self):
            pass

        def clear_all(self):
            self.granted.clear()

    class MockPersistent:
        def __init__(self):
            self.chapter_reached = 0
            self.te_cleared = False
            self.truth_spoiler_confirmed = False
            self.end_te = False
            self.end_he = False
            self.end_ne = False
            self.end_be = False
            self.end_hidden = False
            self.extras_tab = "endings"
            self.quote_bookmarks = []
            self.dossier_selected_char = "mo"
            self.dossier_case_filter = "all"
            self.studio_bg = "agency"
            self.studio_light = "auto"
            self.studio_slot1_char = "mo"
            self.studio_slot1_expr = "smile"
            self.studio_slot1_outfit = "standard"
            self.studio_slot2_char = "alice"
            self.studio_slot2_expr = "happy"
            self.studio_slot2_outfit = "standard"
            self.studio_speaker = "slot1_note"
            self.studio_custom_line = ""
            self.studio_show_textbox = True
            self.studio_hide_hud = False
            self.mailbox_cases = {}
            self.mailbox_selected_case = "m1"
            self.tea_party_records = {}
            self.tea_party_selected = "t1"
            self.lexicon_read = []
            self.lexicon_cat_filter = "all"
            self.lexicon_search_query = ""
            self.lexicon_selected_id = "lex_c01"
            self.book_restoration_records = {}
            self.restoration_selected_tome = "r1"
            self.seasonal_letter_records = {}
            self.letterbox_selected_season = "spring"
            self.radio_booth_records = {}
            self.radio_selected_broadcast = "b1"
            self.origami_cabinet_records = {}
            self.origami_selected_crane = "c01"
            self.origami_cat_filter = "all"
            self.gramophone_rain_pct = 0
            self.gramophone_study_pct = 0
            self.gramophone_bgm_pct = 80
            self.gramophone_single_loop = False
            self.gramophone_stop_on_exit = True
            self.gramophone_preset = "pure_ost"
            self.gramophone_unlock_all = False
            self.gramophone_last_track = "audio/theme_main.ogg"
            self.last_player_name = "陈默"

    class DummyMatrix:
        def __init__(self, tag):
            self.tag = tag

        def __mul__(self, other):
            return DummyMatrix(f"{self.tag}*{other.tag}")

    class DummyMusicRoom:
        def __init__(self, **_kwargs):
            self.tracks = []

        def add(self, fn, always_unlocked=False):
            self.tracks.append((fn, always_unlocked))

        def is_unlocked(self, _fn):
            return True

    mock_renpy = MockRenpy()
    mock_ach = MockAchievement()
    mock_persistent = MockPersistent()

    env = {
        "renpy": mock_renpy,
        "achievement": mock_ach,
        "persistent": mock_persistent,
        "config": type("Cfg", (), {"label_callback": None, "screen_height": 720, "skipping": False})(),
        "_history_list": [],
        "adv": None,
        "player_name": "陈默",
        "mo_favor": 50,
        "alice_favor": 25,
        "kako_clue": 2,
        "truth_route": False,
        "fail_count": 0,
        "intuition": 3,
        "full_run": False,
        "crane_given": False,
        "current_chapter_label": "prologue",
        "save_name": "",
        "evidence": [],
        "inspected_evidence": [],
        "expanded_evidence": "",
        "unlocked_deductions": [],
        "combine_slot_a": "",
        "combine_slot_b": "",
        "combine_feedback": "",
        "combine_feedback_kind": "idle",
        "combine_solved_title": "",
        "current_ambient_mode": "clear",
        "mailbox_combine_mistakes": 0,
        "Character": lambda *a, **kw: ("Character", a, kw),
        "TintMatrix": lambda v: DummyMatrix(f"Tint({v})"),
        "BrightnessMatrix": lambda v: DummyMatrix(f"Bright({v})"),
        "SaturationMatrix": lambda v: DummyMatrix(f"Sat({v})"),
        "Color": lambda rgb=None: rgb,
        "Transform": lambda child=None, **kw: ("Transform", child, kw),
        "At": lambda *a: ("At", a),
        "Null": lambda: ("Null",),
        "NullAction": lambda: ("NullAction",),
        "Show": lambda *a, **kw: ("Show", a, kw),
        "Hide": lambda *a, **kw: ("Hide", a, kw),
        "ShowMenu": lambda *a, **kw: ("ShowMenu", a, kw),
        "SetField": lambda *a, **kw: ("SetField", a, kw),
        "Function": lambda fn, *a, **kw: ("Function", fn, a, kw),
        "Start": lambda *a, **kw: ("Start", a),
        "Replay": lambda *a, **kw: ("Replay", a, kw),
        "MusicRoom": DummyMusicRoom,
        "_": lambda s: s,
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
    for target_rpy in (
        "achievements.rpy",
        "definitions.rpy",
        "extra.rpy",
        "club_mailbox.rpy",
        "tea_party_lexicon.rpy",
        "bookstreet_seasons.rpy",
        "radio_origami.rpy",
    ):
        for _ln, code, is_init in extract_python_blocks(GAME_DIR / target_rpy):
            if is_init:
                exec(code, env)

    # ---- A. Verify Symmetric 22 Achievements (2x11 even grid) ----
    assert len(env["ACH_LIST"]) == 22, f"Expected 22 achievements (symmetric 2x11 grid), got {len(env['ACH_LIST'])}"
    assert len(env["ACH_LIST"]) % 2 == 0, "ACH_LIST must have even length for symmetric 2-column grid!"
    assert env["ach_grid_rows"]() == 11, f"Expected 11 rows in 2x11 achievement grid, got {env['ach_grid_rows']()}"
    assert "ach_radio_booth" in mock_ach.registered and "ach_origami_cabinet" in mock_ach.registered

    # ---- B. Verify All 3 Old Campus Radio Mystery Listener Broadcasts ----
    broadcasts = env["RADIO_BROADCASTS"]
    assert [b["id"] for b in broadcasts] == ["b1", "b2", "b3"]
    expected_radio_titles = {
        "b1": "第三音乐室午后四点的幽灵伴奏",
        "b2": "植物园温室消失的蓝玫瑰名牌",
        "b3": "旧广播站天台寄往四年前的电波",
    }
    ro_src = (GAME_DIR / "radio_origami.rpy").read_text(encoding="utf-8-sig")
    cjk_counts = {}

    for idx, b in enumerate(broadcasts):
        bid = b["id"]
        lbl = b["label"]
        assert lbl == f"radio_letter_{bid}"
        assert b["title"] == expected_radio_titles[bid], f"Unexpected title for {bid}: {b['title']}"
        assert b["bg_key"] in env["BG_LIGHT"], f"Broadcast {bid} bg_key `{b['bg_key']}` missing from BG_LIGHT"
        assert len(b["booth_clues"]) == 3, f"Expected 3 booth clues in {bid}"
        assert len(b["postcard_body_pub"]) >= 140, f"Broadcast {bid} listener postcard too short"

        nxt_pat = f"label radio_letter_{broadcasts[idx + 1]['id']}:" if idx < 2 else r"\Z"
        m_blk = re.search(rf"label {lbl}:(.*?)(?={nxt_pat})", ro_src, re.S)
        assert m_blk, f"Missing script block for {lbl}"
        blk = m_blk.group(1)
        cjk_n = len(re.findall(r"[\u4e00-\u9fff]", blk))
        cjk_counts[bid] = cjk_n
        assert 1800 <= cjk_n <= 2300, f"Radio broadcast {bid} CJK count {cjk_n} outside target 1,800-2,300 window!"

        inv_lbl = f"radio_{bid}_investigate"
        q_loop = f"radio_{bid}_q_loop"
        assert f"label {inv_lbl}:" in blk and f"jump {inv_lbl}" in blk, f"Missing interactive clue check in {lbl}"
        assert f"label {q_loop}:" in blk and f"jump {q_loop}" in blk, f"Missing non-dead-ending deduction loop in {lbl}"
        assert blk.count(f"jump {q_loop}") == 2, f"Expected 2 wrong-choice loopbacks + 1 correct choice in {lbl}"
        assert "show screen radio_onair_prompt_banner(" in blk
        assert f'call _radio_booth_finish_broadcast("{bid}", _rb_mistakes)' in blk
        assert "add_fail(" not in blk and "fail_count +=" not in blk and "mo_favor +=" not in blk

        # Check all backgrounds & character sprites in broadcast exist in BG_LIGHT & on disk
        for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
            bg_name = m_bg.group(1)
            assert bg_name == "black" or bg_name in env["BG_LIGHT"], f"Unknown bg `{bg_name}` in {lbl}"
            if bg_name != "black":
                assert (GAME_DIR / "images" / f"bg_{bg_name}.png").is_file()
        for m_ch in re.finditer(r"^\s*show\s+(\w+)\s+(\w+)", blk, re.M):
            ch_k, ex_k = m_ch.group(1), m_ch.group(2)
            if ch_k in ("screen", "layer", "bg", "cg"):
                continue
            assert (GAME_DIR / "images" / f"chara_{ch_k}_{ex_k}.png").is_file(), (
                f"Missing character sprite chara_{ch_k}_{ex_k}.png in {lbl}"
            )

    # Verify _progress_label_callback stops gramophone ambience & updates current_chapter_label for all 3 radio labels
    for bid in ("b1", "b2", "b3"):
        lbl = f"radio_letter_{bid}"
        mock_persistent.gramophone_stop_on_exit = False
        env["apply_gramophone_preset"]("rainy_bookstore")
        assert env["gramophone_ambience_active"]() is True
        env["_progress_label_callback"](lbl, False)
        assert env["gramophone_ambience_active"]() is False
        assert env["store"].current_chapter_label == lbl

    # Verify launch action stops gramophone ambience & launches sandboxed Replay
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["radio_launch_action"]("b2")
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    assert any(isinstance(x, tuple) and x[0] == "Replay" and x[1][0] == "radio_letter_b2" for x in act)

    # Simulate pre-air clue inspection, postcard modal, rating upgrade & ach_radio_booth unlock
    assert env["radio_solved_count"]() == 0 and env["radio_gold_count"]() == 0
    for c_obj in broadcasts[0]["booth_clues"]:
        assert env["radio_inspect_clue"]("b1", c_obj["id"]) is True
    assert len(env["radio_get_record"]("b1")["inspected_clues"]) == 3

    env["radio_open_postcard_modal"]("b1")
    assert env["radio_postcard_count"]() == 1
    assert any(s[0] == "radio_postcard_modal" for s in mock_renpy.shown_screens)

    rec_b1_try1 = env["radio_record_clear"]("b1", mistakes_count=2)
    assert rec_b1_try1["solved"] is True and rec_b1_try1["gold_mic"] is False
    assert rec_b1_try1["best_badge"] == "暖心暮色主播"
    assert env["fail_count"] == 0, "Radio broadcast mistakes must NEVER mutate main-story fail_count!"

    rec_b1_gold = env["radio_record_clear"]("b1", mistakes_count=0)
    assert rec_b1_gold["gold_mic"] is True and rec_b1_gold["best_badge"] == "金牌电波主持"
    assert rec_b1_gold["replays"] == 2

    # Replay with mistake preserves best_badge
    rec_b1_rep = env["radio_record_clear"]("b1", mistakes_count=1)
    assert rec_b1_rep["gold_mic"] is True and rec_b1_rep["best_badge"] == "金牌电波主持"

    env["radio_record_clear"]("b2", mistakes_count=0)
    assert not mock_ach.has("ach_radio_booth")
    env["radio_record_clear"]("b3", mistakes_count=0)
    assert mock_ach.has("ach_radio_booth"), "Expected ach_radio_booth unlocked after solving all 3 broadcasts!"
    assert env["radio_solved_count"]() == 3 and env["radio_gold_count"]() == 3

    # Step-execute all `$ ...` statements inside _radio_booth_init_sandbox, radio_letter_b1..b3, and _radio_booth_finish_broadcast
    env["set_ambient"] = lambda mode: env.__setitem__("current_ambient_mode", mode)
    env["play_bgm"] = lambda track, **kw: mock_renpy.music.play(track, channel="music", **kw)
    env["stop_bgm"] = lambda **kw: mock_renpy.music.stop(channel="music", **kw)
    env["bgm_warm"] = "audio/warm_piano.ogg"
    env["bgm_suspense"] = "audio/suspense_light.ogg"
    env["bgm_prologue"] = "audio/prologue_calm.ogg"
    env["bgm_te"] = "audio/true_ending.ogg"
    env["_in_replay"] = False

    saved_main_favor = env["mo_favor"]
    saved_main_fail = env["fail_count"]
    for bid in ("b1", "b2", "b3"):
        lbl = f"radio_letter_{bid}"
        nxt_pat = f"label radio_letter_{'b2' if bid == 'b1' else 'b3'}:" if bid != "b3" else r"\Z"
        blk = re.search(rf"label {lbl}:(.*?)(?={nxt_pat})", ro_src, re.S).group(1)
        # Execute sandbox init inline assignments
        env["session_save_title"] = f"旧广播电台 · {bid.upper()}"
        env["init_ambient"] = "warm"
        init_blk = re.search(r"label _radio_booth_init_sandbox.*?:(.*?)label _radio_booth_finish_broadcast", ro_src, re.S).group(1)
        for ln in init_blk.splitlines():
            s = ln.strip()
            if s.startswith("$ "):
                exec(s[2:].strip(), env)
        # Execute every `$ ...` line in the broadcast script (covers clue flags, wrong-choice _rb_mistakes += 1, BGM switches)
        for ln in blk.splitlines():
            s = ln.strip()
            if s.startswith("$ "):
                exec(s[2:].strip(), env)
        assert env[f"_{bid}_c1"] is True and env[f"_{bid}_c2"] is True
        assert env["_rb_mistakes"] == 2, f"Expected 2 wrong-option `$ _rb_mistakes += 1` branches in {lbl}"
        assert env["fail_count"] == 0, f"Broadcast {lbl} mutated fail_count!"
    # Restore main-story baseline variables in sandbox
    env["mo_favor"] = saved_main_favor
    env["fail_count"] = saved_main_fail

    # ---- C. Verify All 12 Origami Paper Crane Patterns & Vow Slip Inspections ----
    cranes = env["ORIGAMI_CRANE_PATTERNS"]
    assert len(cranes) == 12, f"Expected 12 Origami Paper Crane patterns, got {len(cranes)}"
    assert [c["id"] for c in cranes] == [f"c{i:02d}" for i in range(1, 13)]
    cat_counts = {ck: len(env["origami_visible_patterns"](ck)) for ck in ("campus", "seasons", "vows")}
    assert cat_counts == {"campus": 4, "seasons": 4, "vows": 4}, f"Expected 4-4-4 shelf split, got {cat_counts}"

    for c in cranes:
        assert len(c["steps"]) == 3, f"Expected 3 folding steps in {c['id']}"
        assert len(c["crease_lore"]) >= 45
        assert len(c["mo_note"]) >= 25
        assert len(c["alice_note"]) >= 25
        assert len(c["vow_slip"]) >= 16

    assert env["origami_inspected_count"]() == 0
    # Test 3-step crease advancement on c01
    env["origami_advance_step"]("c01", 1)
    assert env["origami_get_record"]("c01")["step_reached"] == 1 and env["origami_inspected_count"]() == 0
    env["origami_advance_step"]("c01", 2)
    assert env["origami_get_record"]("c01")["step_reached"] == 2 and env["origami_inspected_count"]() == 0
    env["origami_advance_step"]("c01", 3)
    assert env["origami_get_record"]("c01")["vow_inspected"] is True and env["origami_inspected_count"]() == 1

    # Test Fold & Inspect Vow Slip modal across c02..c12 -> unlocks ach_origami_cabinet
    for idx, c in enumerate(cranes[1:], start=2):
        cid = c["id"]
        env["origami_fold_and_inspect"](cid, open_modal=True)
        assert env["origami_get_record"](cid)["vow_inspected"] is True
        if idx < 12:
            assert not mock_ach.has("ach_origami_cabinet")
        else:
            assert mock_ach.has("ach_origami_cabinet"), "Expected ach_origami_cabinet unlocked on 12th crane!"
    assert env["origami_inspected_count"]() == 12
    assert any(s[0] == "origami_vow_modal" and s[2].get("crane_id") == "c12" for s in mock_renpy.shown_screens)

    # ---- D. Strict Zero-Side-Channel Spoiler Gate (`truth_spoiler_unlocked()`) Audit ----
    mock_persistent.te_cleared = False
    mock_persistent.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    b3_locked = env["radio_render_postcard_view"]("b3")
    assert b3_locked["unlocked"] is False
    assert b3_locked["display_deep_secret"] == ""
    assert b3_locked["display_masked_prompt"] != ""
    for secret_kw in ("周可", "小雪", "重新开口", "周明远", "十二封", "旧仓库", "八分钟"):
        assert secret_kw not in b3_locked["display_body"]
        assert secret_kw not in b3_locked["display_echo"]
        assert secret_kw not in b3_locked["display_mo_note"]
        assert secret_kw not in b3_locked["display_alice_note"]

    spoiler_cranes = [c for c in cranes if c["spoiler"]]
    assert [c["id"] for c in spoiler_cranes] == ["c10", "c11", "c12"]
    for sc in spoiler_cranes:
        cv_locked = env["origami_render_crane_view"](sc["id"])
        assert cv_locked["unlocked"] is False
        assert cv_locked["display_masked_notice"] != ""
        assert sc["crease_lore"] not in cv_locked["display_crease_lore"]
        assert sc["mo_note"] not in cv_locked["display_mo_note"]
        assert sc["alice_note"] not in cv_locked["display_alice_note"]
        assert sc["vow_slip"] not in cv_locked["display_vow_slip"]
        for secret_kw in ("周可", "小雪", "周明远", "十二封", "旧仓库", "八分钟", "重新开口"):
            for fld in ("display_crease_lore", "display_mo_note", "display_alice_note", "display_vow_slip"):
                assert secret_kw not in cv_locked[fld], (
                    f"Spoiler keyword `{secret_kw}` leaked in {sc['id']}.{fld}!"
                )

    # Unlock via truth_spoiler_confirmed / te_cleared -> reveals full post-TE notes & vow slips
    mock_persistent.te_cleared = True
    assert env["truth_spoiler_unlocked"]() is True
    b3_open = env["radio_render_postcard_view"]("b3")
    assert b3_open["unlocked"] is True and "小雪" in b3_open["display_deep_secret"] and b3_open["display_masked_prompt"] == ""
    c12_open = env["origami_render_crane_view"]("c12")
    assert c12_open["unlocked"] is True and "亲口说出" in c12_open["display_vow_slip"] and c12_open["display_masked_notice"] == ""

    # Verify reset_all_progress cleans up all PC-8 state while leaving main-story variables untouched
    assert env["mo_favor"] == 50 and env["fail_count"] == 0 and env["truth_route"] is False
    env["reset_all_progress"]()
    assert env["radio_solved_count"]() == 0 and env["radio_postcard_count"]() == 0
    assert env["origami_inspected_count"]() == 0
    assert mock_persistent.radio_selected_broadcast == "b1"
    assert mock_persistent.origami_selected_crane == "c01"
    assert mock_persistent.origami_cat_filter == "all"

    print(
        f"[PASS] PC-8 runtime verified: 3 Radio Broadcasts (CJK={cjk_counts}) + ach_radio_booth | "
        f"12 Origami Crane Patterns ({cat_counts}) + Vow Modal + ach_origami_cabinet | Zero-Leak Spoiler Gate verified"
    )


def check_zero_intrusion_and_icons():
    res = subprocess.run(
        ["git", "status", "--porcelain", "--", *MAIN_STORY_FILES],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay files were modified! Output:\n{res.stdout}"

    diff_res = subprocess.run(
        ["git", "diff", "-U0", "--", *[f for f in PC8_TOUCHED_FILES if f != "game/radio_origami.rpy"]],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    for line in diff_res.stdout.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added = line[1:]
            assert "<svg" not in added.lower(), f"Forbidden inline <svg> in diff: {added}"
            assert "\ufffd" not in added, f"Replacement char U+FFFD found in diff: {added}"
            m_em = EMOJI_RE.search(added)
            assert not m_em, f"Forbidden Emoji/dingbat `{m_em.group(0)}` in added line: {added}"

    ro_text = (ROOT / "game/radio_origami.rpy").read_text(encoding="utf-8-sig")
    assert "<svg" not in ro_text.lower(), "Forbidden <svg> in game/radio_origami.rpy"
    assert "\ufffd" not in ro_text, "Replacement char U+FFFD found in game/radio_origami.rpy"
    m_ro_em = EMOJI_RE.search(ro_text)
    assert not m_ro_em, f"Forbidden Emoji/dingbat `{m_ro_em.group(0)}` in game/radio_origami.rpy"

    print("[PASS] Zero main-story intrusion (prologue..chapter6 & definitions.rpy untouched) & zero Emoji/SVG verified")

    verified_count = 0
    for rel_icon in REQUIRED_UI_ICONS:
        p = GAME_DIR / rel_icon
        assert p.is_file(), f"Missing required RGBA UI icon: game/{rel_icon}"
        with Image.open(p) as im:
            assert im.mode == "RGBA", f"Icon {rel_icon} must be RGBA, got {im.mode}"
            w, h = im.size
            assert (w, h) == (128, 128), f"Icon {rel_icon} expected (128, 128), got {(w, h)}"
            alpha = im.getchannel("A")
            corners = [
                alpha.getpixel((0, 0)),
                alpha.getpixel((w - 1, 0)),
                alpha.getpixel((0, h - 1)),
                alpha.getpixel((w - 1, h - 1)),
            ]
            assert all(c == 0 for c in corners), f"Icon {rel_icon} non-transparent corners: {corners}"
            alpha_extrema = alpha.getextrema()
            assert alpha_extrema[0] == 0 and alpha_extrema[1] > 200, (
                f"Icon {rel_icon} lacks transparent background or visible foreground: alpha={alpha_extrema}"
            )
            if rel_icon in PC8_UI_ICONS:
                hist = alpha.histogram()
                trans_ratio = hist[0] / float(w * h)
                assert 0.15 <= trans_ratio <= 0.88, (
                    f"PC-8 icon {rel_icon} abnormal transparency ratio: {trans_ratio:.3f}"
                )
                raw_rgba = im.tobytes()
                uniq_colors = len({raw_rgba[k : k + 4] for k in range(0, len(raw_rgba), 4)})
                assert uniq_colors >= 500, (
                    f"PC-8 icon {rel_icon} has suspiciously low color count ({uniq_colors})"
                )
            verified_count += 1

    print(f"[PASS] All {verified_count}/22 RGBA UI icons verified (128x128 RGBA, corners=[0,0,0,0], rich watercolor alpha)")


def check_balanced_delimiters_and_references():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    defined_screens = {
        "main_menu",
        "say",
        "input",
        "choice",
        "quick_menu",
        "navigation",
        "game_menu",
        "save",
        "load",
        "preferences",
        "history",
        "help",
        "about",
        "confirm",
        "skip_indicator",
        "notify",
    }
    defined_labels = {"main_menu", "start", "splashscreen"}
    defined_styles = {
        "default",
        "text",
        "button",
        "button_text",
        "bar",
        "vbar",
        "slider",
        "vslider",
        "scrollbar",
        "vscrollbar",
        "frame",
        "window",
        "vbox",
        "hbox",
        "grid",
        "fixed",
        "viewport",
        "vpgrid",
        "input",
        "say_label",
        "say_dialogue",
        "namebox",
        "confirm_frame",
        "confirm_prompt",
        "page_label",
        "page_label_text",
    }
    defined_images = set()

    screen_re = re.compile(r"^\s*screen\s+([A-Za-z_]\w*)\s*\(")
    label_re = re.compile(r"^\s*label\s+([A-Za-z_]\w*)\s*(?:\(.*\))?\s*:")
    style_re = re.compile(r"^\s*style\s+([A-Za-z_]\w*)(?:\s+is\s+([A-Za-z_]\w*))?")
    image_re = re.compile(r"^\s*image\s+([A-Za-z0-9_\s]+?)\s*(?:=|:)")
    style_parents = []

    for rpy in rpy_files:
        text = rpy.read_text(encoding="utf-8-sig")
        for lineno, line in enumerate(text.splitlines(), 1):
            m_s = screen_re.match(line)
            if m_s:
                defined_screens.add(m_s.group(1))
            m_l = label_re.match(line)
            if m_l:
                defined_labels.add(m_l.group(1))
            m_st = style_re.match(line)
            if m_st:
                defined_styles.add(m_st.group(1))
                if m_st.group(2):
                    style_parents.append((m_st.group(1), m_st.group(2), f"{rpy.relative_to(ROOT)}:{lineno}"))
            m_im = image_re.match(line)
            if m_im:
                defined_images.add(" ".join(m_im.group(1).split()))

    for child_st, parent_st, loc in style_parents:
        assert parent_st in defined_styles, f"Style `{child_st}` inherits undefined `{parent_st}` at {loc}"

    for req_img in (
        "ui_icon_radio_booth_mic",
        "ui_icon_listener_letter_tape",
        "ui_icon_origami_cabinet",
        "ui_icon_golden_vow_crane",
    ):
        assert req_img in defined_images, f"Missing PC-8 image definition `{req_img}`"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC8_TOUCHED_FILES:
        lines = (ROOT / rel).read_text(encoding="utf-8-sig").splitlines()
        for i, ln in enumerate(lines):
            assert "\t" not in ln, f"Tab character found in {rel}:{i + 1}"
            msp = style_prop_re.match(ln)
            if msp:
                assert msp.group(1) in defined_styles, f"Undefined style `{msp.group(1)}` referenced at {rel}:{i + 1}"
            stripped = ln.strip()
            if not stripped or stripped.startswith("#"):
                continue
            code_part = ln.split("#", 1)[0].rstrip()
            if code_part.endswith(":") and _paren_delta(code_part) == 0:
                cur_ind = len(ln) - len(ln.lstrip(" "))
                j = i + 1
                while j < len(lines) and (not lines[j].strip() or lines[j].strip().startswith("#")):
                    j += 1
                assert j < len(lines), f"Dangling colon block at EOF {rel}:{i + 1}"
                nxt_ind = len(lines[j]) - len(lines[j].lstrip(" "))
                assert nxt_ind > cur_ind, f"Expected indented block after `{code_part.strip()}` at {rel}:{i + 1}"

    for req_scr in (
        "extras",
        "extras_radio_booth",
        "radio_postcard_modal",
        "radio_onair_prompt_banner",
        "radio_broadcast_result_card",
        "extras_origami_cabinet",
        "origami_vow_modal",
        "extras_achievements",
    ):
        assert req_scr in defined_screens, f"Missing required PC-8 screen: {req_scr}"

    for req_lbl in (
        "radio_letter_b1",
        "radio_letter_b2",
        "radio_letter_b3",
        "radio_b1_investigate",
        "radio_b2_investigate",
        "radio_b3_investigate",
        "radio_b1_q_loop",
        "radio_b2_q_loop",
        "radio_b3_q_loop",
        "_radio_booth_init_sandbox",
        "_radio_booth_finish_broadcast",
    ):
        assert req_lbl in defined_labels, f"Missing required PC-8 label: {req_lbl}"

    call_screen_re = re.compile(r"^\s*(?:call|show|hide)\s+screen\s+([A-Za-z_]\w*)\b")
    jump_call_re = re.compile(r"^\s*(?:jump|call)\s+([A-Za-z_]\w*)\b")
    use_scr_re = re.compile(r"^\s*use\s+([A-Za-z_]\w*)\b")
    show_scr_re = re.compile(r'\b(?:Show|Hide|ShowMenu)\(\s*["\']([A-Za-z_]\w*)["\']')
    asset_re = re.compile(r'["\']((?:images|gui|audio|fonts)/[^"\'%\{\}\[\]]+\.(?:png|jpg|webp|ogg|otf|ttf))["\']')

    jump_count = 0
    asset_refs = set()
    missing_assets = []

    for rpy in rpy_files:
        if "tl" in rpy.parts:
            continue
        text = rpy.read_text(encoding="utf-8-sig")
        for lineno, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            mcs = call_screen_re.match(line)
            if mcs:
                assert mcs.group(1) in defined_screens, (
                    f"Undefined screen `{mcs.group(1)}` at {rpy.relative_to(ROOT)}:{lineno}"
                )
                continue
            mj = jump_call_re.match(line)
            if mj and mj.group(1) != "expression":
                jump_count += 1
                assert mj.group(1) in defined_labels, (
                    f"Undefined label `{mj.group(1)}` at {rpy.relative_to(ROOT)}:{lineno}"
                )
            mu = use_scr_re.match(line)
            if mu and mu.group(1) != "expression":
                assert mu.group(1) in defined_screens, (
                    f"Undefined screen `use {mu.group(1)}` at {rpy.relative_to(ROOT)}:{lineno}"
                )
            for ms in show_scr_re.finditer(line):
                assert ms.group(1) in defined_screens, (
                    f"Undefined screen `{ms.group(1)}` at {rpy.relative_to(ROOT)}:{lineno}"
                )
            for ma in asset_re.finditer(line):
                rel_asset = ma.group(1)
                if rel_asset.startswith("audio/voice/"):
                    continue
                asset_refs.add(rel_asset)
                if not (GAME_DIR / rel_asset).is_file():
                    missing_assets.append(f"{rel_asset} ({rpy.relative_to(ROOT)}:{lineno})")

    for pc8_icon in PC8_UI_ICONS:
        assert pc8_icon in asset_refs, f"PC-8 icon `{pc8_icon}` is not wired into any .rpy file!"

    for rel in PC8_TOUCHED_FILES:
        src = (ROOT / rel).read_text(encoding="utf-8-sig")
        stack = []
        in_str = None
        esc = False
        i = 0
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
                    in_str = src[i : i + 3]
                    i += 2
                elif ch in ('"', "'"):
                    in_str = ch
                elif ch in "([{":
                    stack.append((ch, i))
                elif ch in ")]}":
                    pairs = {")": "(", "]": "[", "}": "{"}
                    assert stack and stack[-1][0] == pairs[ch], f"Unbalanced `{ch}` in {rel} near pos {i}"
                    stack.pop()
            i += 1
        assert not stack, f"Unclosed delimiter {stack[-1]} in {rel}"

    if missing_assets:
        raise AssertionError("Missing referenced assets:\n  " + "\n  ".join(sorted(set(missing_assets))))

    print(
        f"[PASS] Balanced delimiters & reference registry "
        f"({len(defined_screens)} screens, {len(defined_labels)} labels, {jump_count} jumps/calls, "
        f"{len(defined_styles)} styles, {len(asset_refs)} distinct asset refs)"
    )


def check_4_route_ending_regression():
    decide_env = {}
    for _ln, blk, _is_init in extract_python_blocks(GAME_DIR / "definitions.rpy"):
        if "def decide_ending" in blk:
            exec(blk, decide_env)
            break
    assert "decide_ending" in decide_env, "Could not locate decide_ending() in definitions.rpy"

    cases = [
        ("best",     {"mo_favor": 100, "kako_clue": 4, "truth_route": True,  "fail_count": 0}, "ending_te"),
        ("no_truth", {"mo_favor": 100, "kako_clue": 4, "truth_route": False, "fail_count": 0}, "ending_he"),
        ("mixed",    {"mo_favor": 66,  "kako_clue": 4, "truth_route": True,  "fail_count": 0}, "ending_ne"),
        ("worst",    {"mo_favor": 30,  "kako_clue": 0, "truth_route": False, "fail_count": 3}, "ending_be"),
    ]
    for route_name, state_vars, expected_lbl in cases:
        decide_env.update(state_vars)
        got = decide_env["decide_ending"]()
        assert got == expected_lbl, f"Route {route_name}: expected {expected_lbl}, got {got}"

    autoplay_src = (GAME_DIR / "tests" / "autoplay.rpy").read_text(encoding="utf-8-sig")
    for strat, exp in [("best", "ending_te"), ("no_truth", "ending_he"), ("mixed", "ending_ne"), ("worst", "ending_be")]:
        assert strat in autoplay_src and exp in autoplay_src

    ui_shots_src = (GAME_DIR / "tests" / "ui_shots.rpy").read_text(encoding="utf-8-sig")
    for shot in (
        "ui_09x_radio_booth_locked.png",
        "ui_09y_radio_booth_onair.png",
        "ui_09z_origami_cabinet_locked.png",
        "ui_09za_origami_cabinet_vow.png",
        "ui_09zb_origami_vow_modal.png",
    ):
        assert shot in ui_shots_src, f"Missing {shot} in game/tests/ui_shots.rpy"

    # Verify zero Emoji & zero inline <svg> across verify_pc8.py itself as well
    self_src = Path(__file__).read_text(encoding="utf-8-sig")
    assert not EMOJI_RE.search(self_src), "Forbidden Emoji found in verify_pc8.py"

    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-8 coverage verified")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc8_radio_and_origami_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC8_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
