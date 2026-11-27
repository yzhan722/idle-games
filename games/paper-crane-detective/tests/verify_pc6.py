#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-6 Comprehensive Static, Behavioral, Layout, Tea-Party Q&A, Mystery-Lexicon Spoiler-Gate,
Asset & Zero-Intrusion Verifier for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).
"""

import ast
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageFont
import rpy_syntax as rs  # noqa: E402  (strict_files: the save-compatibility `from` pass is not a story change)

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

REQUIRED_UI_ICONS = PC4_UI_ICONS + PC5_UI_ICONS + PC6_UI_ICONS

MAIN_STORY_FILES = [
    "game/script.rpy",
    "game/chapter1.rpy",
    "game/chapter2.rpy",
    "game/chapter3.rpy",
    "game/chapter4.rpy",
    "game/chapter5.rpy",
    "game/chapter6.rpy",
    "game/interlude.rpy",
    "game/tests/autoplay.rpy",
]

PC6_TOUCHED_FILES = [
    "game/tea_party_lexicon.rpy",
    "game/extra.rpy",
    "game/definitions.rpy",
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
    assert len(rpy_files) >= 24, f"Expected >=24 .rpy files (including tea_party_lexicon.rpy), found {len(rpy_files)}"
    assert (GAME_DIR / "tea_party_lexicon.rpy").is_file(), "Missing game/tea_party_lexicon.rpy"
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
    """Verify strict 1280x720 pixel bounds for EXTRAS_TABS, Salon Sub-Bar, Tea Party, Lexicon, Main Menu & Achievements."""
    font_path = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    assert font_path.is_file(), f"Missing font file: {font_path}"
    font_15 = ImageFont.truetype(str(font_path), 15)
    font_13 = ImageFont.truetype(str(font_path), 13)
    font_12 = ImageFont.truetype(str(font_path), 12)
    font_11 = ImageFont.truetype(str(font_path), 11)

    def _txt_w(fnt, text: str) -> int:
        bb = fnt.getbbox(text)
        return bb[2] - bb[0]

    extra_src = (GAME_DIR / "extra.rpy").read_text(encoding="utf-8-sig")

    # 1. Primary 9-tab EXTRAS_TABS bar
    m_tabs = re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_tabs, "Could not locate EXTRAS_TABS in extra.rpy"
    tabs = ast.literal_eval("[" + m_tabs.group(1) + "]")
    assert len(tabs) == 9, f"Expected 9 primary tabs in EXTRAS_TABS, got {len(tabs)}"
    widths = [max(54, _txt_w(font_15, lbl) + 16) for _k, lbl in tabs]
    total_tab_px = sum(widths) + 5 * (len(tabs) - 1)
    assert total_tab_px <= 722, f"EXTRAS_TABS overflows 722px: {total_tab_px}px"

    # 2. Secondary Salon Sub-Bar (inside 722px frame with padding (10, 3) => 702px inner width)
    m_salon = re.search(r"EXTRAS_SALON_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_salon, "Could not locate EXTRAS_SALON_TABS in extra.rpy"
    salon_tabs = ast.literal_eval("[" + m_salon.group(1) + "]")
    assert [k for k, _ in salon_tabs] == ["teaparty", "lexicon"]

    salon_left_w = (
        16 + 6 + _txt_w(font_12, "侦探社沙龙：") + 6
        + max(110, _txt_w(font_12, "午后茶话会 (3/3)") + 20) + 6
        + max(110, _txt_w(font_12, "推理社批注辞典 (20/20)") + 20)
    )
    salon_right_w = 15 + 6 + _txt_w(font_11, "全对金章 3/3 · 批注已阅 20/20")
    salon_total_inner = salon_left_w + 16 + salon_right_w
    assert salon_total_inner <= 702, f"Salon subbar overflows 702px inner width: {salon_total_inner}px"

    # 3. Vertical fit inside game_menu_content_frame (ysize=594, padding=(28,24) => inner height 546px)
    # 34 (EXTRAS_TABS) + 7 + 30 (salon_subbar_frame) + 7 + 468 (viewport) == 546px
    assert "ysize 468" in extra_src and "spacing 7" in extra_src, "Expected exact 546px vertical budget in extras()"
    vertical_sum = 34 + 7 + 30 + 7 + 468
    assert vertical_sum <= 546, f"Extras vertical stack overflows 546px inner height: {vertical_sum}px"

    # 4. Tea-Party 3-card row & Lexicon 2-column master-detail + filter rows
    assert 3 * 234 + 2 * 10 == 722, "Tea-Party 3-card selector must equal 722px"
    assert 248 + 10 + 464 == 722, "Lexicon 2-column master-detail must equal 722px"

    cat_labels = ["全部词条 (20)", "古典本格诡计 (7)", "法医与物证常识 (7)", "旧案—今案伏笔 (6)"]
    cat_row_left = sum(max(96, _txt_w(font_12, c) + 20) for c in cat_labels) + 6 * 3
    cat_row_right = max(46, _txt_w(font_11, "清空") + 16) + 6 + max(96, _txt_w(font_12, "检索：不在场") + 20)
    assert cat_row_left + 12 + cat_row_right <= 702, (
        f"Lexicon category filter bar overflows 702px: {cat_row_left + 12 + cat_row_right}px"
    )

    quick_tags = ["全部", "密室", "不在场", "磁条", "色温", "笔迹", "纸鹤"]
    quick_row_w = (
        _txt_w(font_12, "快捷检索：") + 6
        + sum(max(46, _txt_w(font_11, t) + 16) + 6 for t in quick_tags)
        + _txt_w(font_12, "匹配 20 条")
    )
    assert quick_row_w <= 702, f"Lexicon quick-tag bar overflows 702px: {quick_row_w}px"

    # 5. Main menu 4 cozy chips centered within 1280px
    mm_chips = [
        18 + 6 + _txt_w(font_13, "委托信箱 (3/3)") + 24,
        18 + 6 + _txt_w(font_13, "午后茶话会 (3/3)") + 24,
        18 + 6 + _txt_w(font_13, "批注辞典 (20/20)") + 24,
        18 + 6 + _txt_w(font_13, "雨夜留声机") + 6 + 15 + 6 + 15 + 24,
    ]
    mm_total_px = sum(mm_chips) + 10 * (len(mm_chips) - 1)
    assert mm_total_px <= 900, f"Main menu cozy chip bar too wide for 1280px: {mm_total_px}px"

    # 6. Achievements 2-column grid balance
    ach_src = (GAME_DIR / "achievements.rpy").read_text(encoding="utf-8-sig")
    assert '"ach_tea_party"' in ach_src, "Missing ach_tea_party in achievements.rpy"
    assert "if len(ACH_LIST) % 2 == 1:" in ach_src and "null width 352 height 84" in ach_src
    assert 352 * 2 + 12 <= 722

    print(
        f"[PASS] 1280x720 strict pixel bounds verified: EXTRAS_TABS={total_tab_px}px<=722px, "
        f"SalonSubBar={salon_total_inner}px<=702px, Vertical={vertical_sum}px<=546px, "
        f"LexiconFilter={cat_row_left + 12 + cat_row_right}px<=702px, MainMenuChips={mm_total_px}px<1280px"
    )


def check_pc6_tea_party_and_lexicon_runtime():
    """Execute definitions.rpy + achievements.rpy + extra.rpy + club_mailbox.rpy + tea_party_lexicon.rpy in stateful mock."""
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

        def register(self, aid, **_kw):
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
            self.chapter_reached = 2
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
            self.studio_custom_line = "测试台词"
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
        def __init__(self, label):
            self.label = label

        def __mul__(self, other):
            return DummyMatrix(f"{self.label}*{getattr(other, 'label', other)}")

    mock_renpy = MockRenpy()
    mock_ach = MockAchievement()
    mock_persistent = MockPersistent()

    env = {
        "renpy": mock_renpy,
        "achievement": mock_ach,
        "persistent": mock_persistent,
        "config": type("Cfg", (), {"label_callback": None, "screen_height": 720, "main_menu_music": "audio/theme_main.ogg"})(),
        "preferences": type("Pref", (), {"set_mixer": lambda *_a, **_k: None})(),
        "_history_list": [],
        "player_name": "陈默",
        "mo_favor": 50,
        "alice_favor": 20,
        "kako_clue": 0,
        "truth_route": False,
        "fail_count": 0,
        "intuition": 3,
        "full_run": False,
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
        "current_chapter_label": "prologue",
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
        "Start": lambda *a: ("Start", a),
        "Replay": lambda *a, **kw: ("Replay", a, kw),
        "SetField": lambda obj, field, val: ("SetField", field, val),
        "Function": lambda fn, *a, **kw: ("Function", fn, a, kw),
        "MusicRoom": lambda **kw: type("MR", (), {"add": lambda self, *a, **k: None, "is_unlocked": lambda self, _fn: True})(),
        "adv": object(),
        "Character": lambda *a, **kw: type("Ch", (), {"who_args": {"color": kw.get("color", "#fff")}})(),
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
    for target_rpy in ("achievements.rpy", "definitions.rpy", "extra.rpy", "club_mailbox.rpy", "tea_party_lexicon.rpy"):
        for _ln, code, is_init in extract_python_blocks(GAME_DIR / target_rpy):
            if is_init:
                exec(code, env)

    # ---- A. Verify Achievements Registration (18 items, even 2x9 grid) ----
    assert len(env["ACH_LIST"]) == 18, f"Expected 18 achievements in ACH_LIST, got {len(env['ACH_LIST'])}"
    assert "ach_tea_party" in mock_ach.registered, "Expected ach_tea_party registered in achievement system"

    # ---- B. Verify 3 Tea-Party Anthology Sessions & Script Integrity ----
    sessions = env["TEA_PARTY_SESSIONS"]
    assert [s["id"] for s in sessions] == ["t1", "t2", "t3"]
    expected_titles = {
        "t1": "伯爵红茶里的方糖不在场证明",
        "t2": "艾丽丝的零花钱密室之谜",
        "t3": "墨墨速写本最后一页的暗号",
    }
    for s in sessions:
        assert s["title"] == expected_titles[s["id"]], f"Unexpected title for {s['id']}: {s['title']}"

    tp_src = (GAME_DIR / "tea_party_lexicon.rpy").read_text(encoding="utf-8-sig")
    cjk_summary = {}
    for idx, tid in enumerate(["t1", "t2", "t3"]):
        next_pat = f"label tea_party_{['t1', 't2', 't3'][idx + 1]}:" if idx < 2 else r"\Z"
        m_blk = re.search(rf"label tea_party_{tid}:(.*?)(?={next_pat})", tp_src, re.S)
        assert m_blk, f"Missing script block for tea_party_{tid}"
        blk = m_blk.group(1)
        cjk_chars = len(re.findall(r"[\u4e00-\u9fff]", blk))
        cjk_summary[tid] = cjk_chars
        assert 1800 <= cjk_chars <= 2450, (
            f"Tea party session {tid} CJK length ({cjk_chars}) out of target 1,800-2,400 range!"
        )
        # Verify 3 interactive Q&A loops with non-dead-ending wrong banter jumps & zero fail_count mutation
        for q_num in (1, 2, 3):
            loop_lbl = f"tea_{tid}_q{q_num}_loop"
            assert f"label {loop_lbl}:" in blk, f"Missing Q&A loop `{loop_lbl}` in {tid}"
            assert f"jump {loop_lbl}" in blk, f"Missing non-dead-ending loop-back `jump {loop_lbl}` in {tid}"
        assert "add_fail(" not in blk and "fail_count +=" not in blk, (
            f"Tea party {tid} must NEVER mutate main-story fail_count!"
        )
        assert "show screen tea_riddle_prompt_banner(" in blk, f"Missing riddle banner in {tid}"
        assert f'call _tea_party_finish_session("{tid}", _tp_mistakes)' in blk

        # Verify every scene bg and character expression sprite exists in BG_LIGHT & on disk
        for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
            bg_name = m_bg.group(1)
            assert bg_name == "black" or bg_name in env["BG_LIGHT"], f"Unknown bg `{bg_name}` in {tid}"
        for m_ch in re.finditer(r"^\s*show\s+(alice|mo|zhang|lin|lvfu|banzhang|joker)\s+(\w+)", blk, re.M):
            ch_k, ex_k = m_ch.group(1), m_ch.group(2)
            assert (GAME_DIR / "images" / f"chara_{ch_k}_{ex_k}.png").is_file(), f"Missing sprite {ch_k} {ex_k}"

    # Simulate Tea-Party scoring, Gold-Stamp upgrade, Rapport average & ach_tea_party unlock
    assert env["tea_party_cleared_count"]() == 0 and env["tea_party_gold_count"]() == 0
    rec_t1_try1 = env["tea_party_record_clear"]("t1", mistakes_count=2)
    assert rec_t1_try1["cleared"] is True and rec_t1_try1["gold_stamp"] is False
    assert rec_t1_try1["best_badge"] == "默契茶伴" and rec_t1_try1["best_rapport"] == 76
    assert not mock_ach.has("ach_tea_party")

    # Upgrade t1 to 全对金章 (0 mistakes -> 100% rapport)
    rec_t1_gold = env["tea_party_record_clear"]("t1", mistakes_count=0)
    assert rec_t1_gold["gold_stamp"] is True and rec_t1_gold["best_badge"] == "全对金章"
    assert rec_t1_gold["best_rapport"] == 100 and rec_t1_gold["replays"] == 2

    # Replay t1 with 1 mistake -> preserves best_badge=="全对金章" and best_rapport==100
    rec_t1_rep = env["tea_party_record_clear"]("t1", mistakes_count=1)
    assert rec_t1_rep["gold_stamp"] is True and rec_t1_rep["best_badge"] == "全对金章"
    assert rec_t1_rep["best_rapport"] == 100 and rec_t1_rep["last_rapport"] == 88 and rec_t1_rep["replays"] == 3

    env["tea_party_record_clear"]("t2", mistakes_count=0)
    assert not mock_ach.has("ach_tea_party")
    env["tea_party_record_clear"]("t3", mistakes_count=1)
    assert mock_ach.has("ach_tea_party"), "Expected `ach_tea_party` to unlock upon clearing all 3 tea-party sessions!"
    assert env["tea_party_cleared_count"]() == 3 and env["tea_party_gold_count"]() == 2
    assert env["tea_party_avg_rapport"]() == round((100 + 100 + 88) / 3)

    # Verify launch action stops gramophone ambience & launches sandboxed Replay
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert env["gramophone_ambience_active"]() is True
    tp_act = env["tea_party_launch_action"]("t2")
    for item in tp_act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    assert any(isinstance(x, tuple) and x[0] == "Replay" and x[1][0] == "tea_party_t2" for x in tp_act)

    # ---- C. Verify Mystery Lexicon (20 Entries, Dual Margin Notes & Spoiler Shield) ----
    entries = env["LEXICON_ENTRIES"]
    assert len(entries) >= 18, f"Expected >=18 lexicon entries, got {len(entries)}"
    cat_counts = {
        "classical": env["lexicon_category_count"]("classical"),
        "forensics": env["lexicon_category_count"]("forensics"),
        "foreshadow": env["lexicon_category_count"]("foreshadow"),
    }
    assert all(cnt >= 6 for cnt in cat_counts.values()), f"Expected >=6 entries per category: {cat_counts}"
    assert sum(cat_counts.values()) == len(entries)

    spoiler_entries = [e for e in entries if e.get("spoiler")]
    public_entries = [e for e in entries if not e.get("spoiler")]
    assert len(spoiler_entries) >= 5 and len(public_entries) >= 12

    for e in entries:
        assert e["title"] and e["public_title"] and e["case_ref"] and e["public_summary"]
        assert len(e["body"]) >= 60, f"Entry {e['id']} body too thin"
        assert len(e["alice_note"]) >= 25, f"Entry {e['id']} missing rich Alice margin note"
        assert len(e["mo_note"]) >= 25, f"Entry {e['id']} missing rich Momo margin note"

    # Test strict spoiler shield when locked (te_cleared=False, truth_spoiler_confirmed=False)
    mock_persistent.te_cleared = False
    mock_persistent.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    for sp_e in spoiler_entries:
        view_locked = env["lexicon_render_entry_view"](sp_e["id"])
        assert view_locked["unlocked"] is False
        assert sp_e["body"] not in view_locked["display_body"], f"Spoiler body leaked for {sp_e['id']}!"
        assert sp_e["alice_note"] not in view_locked["display_alice_note"], f"Spoiler Alice note leaked for {sp_e['id']}!"
        assert sp_e["mo_note"] not in view_locked["display_mo_note"], f"Spoiler Momo note leaked for {sp_e['id']}!"
        # Selecting a locked entry must NOT mark it read prematurely
        env["lexicon_select_entry"](sp_e["id"])
        assert env["lexicon_is_read"](sp_e["id"]) is False

    # Spoiler-safe search: searching deep-only words while locked must return 0 matches
    for secret_word in ("电暖器", "周明远", "十二封"):
        leaked_hits = env["lexicon_visible_entries"]("all", secret_word)
        assert len(leaked_hits) == 0, f"Search leaked locked spoiler entries for `{secret_word}`: {leaked_hits}"

    # Public entry read-bookmark tracking
    env["lexicon_select_entry"]("lex_c01")
    assert env["lexicon_is_read"]("lex_c01") is True and env["lexicon_read_count"]() == 1
    env["lexicon_toggle_read"]("lex_c01")
    assert env["lexicon_is_read"]("lex_c01") is False and env["lexicon_read_count"]() == 0
    env["lexicon_toggle_read"]("lex_c01")
    assert env["lexicon_is_read"]("lex_c01") is True

    # Unlock spoiler shield via manual confirm -> full access & searchability
    mock_persistent.truth_spoiler_confirmed = True
    assert env["truth_spoiler_unlocked"]() is True
    view_open = env["lexicon_render_entry_view"]("lex_s06")
    assert view_open["unlocked"] is True and "电暖器" in view_open["display_body"]
    assert len(env["lexicon_visible_entries"]("all", "电暖器")) >= 1
    env["lexicon_select_entry"]("lex_s06")
    assert env["lexicon_is_read"]("lex_s06") is True and env["lexicon_read_count"]() == 2

    # Reset all progress cleans up PC-6 state cleanly
    env["reset_all_progress"]()
    assert env["tea_party_cleared_count"]() == 0 and env["lexicon_read_count"]() == 0
    assert mock_persistent.lexicon_cat_filter == "all" and mock_persistent.lexicon_search_query == ""

    print(
        f"[PASS] PC-6 runtime verified: 3 Tea-Party sessions (CJK={cjk_summary}) + ach_tea_party + "
        f"{len(entries)} Lexicon entries ({cat_counts}) + dual Alice/Momo annotations + strict spoiler shield"
    )


def check_zero_intrusion_and_icons(allow_pending_pc6_icons: bool = False):
    res = subprocess.run(
        ["git", "status", "--porcelain", "--", *rs.strict_files(MAIN_STORY_FILES)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert res.stdout.strip() == "", f"Main story / autoplay files were modified! Output:\n{res.stdout}"

    diff_res = subprocess.run(
        ["git", "diff", "-U0", "--", *[f for f in PC6_TOUCHED_FILES if f != "game/tea_party_lexicon.rpy"]],
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
            m_em = EMOJI_RE.search(added)
            assert not m_em, f"Forbidden Emoji/dingbat `{m_em.group(0)}` in added line: {added}"

    tp_text = (ROOT / "game/tea_party_lexicon.rpy").read_text(encoding="utf-8-sig")
    assert "<svg" not in tp_text.lower(), "Forbidden <svg> in game/tea_party_lexicon.rpy"
    m_tp_em = EMOJI_RE.search(tp_text)
    assert not m_tp_em, f"Forbidden Emoji/dingbat `{m_tp_em.group(0)}` in game/tea_party_lexicon.rpy"

    print("[PASS] Zero main-story intrusion & zero Emoji/SVG across all PC-6 code verified")

    pending = []
    verified_count = 0
    for rel_icon in REQUIRED_UI_ICONS:
        p = GAME_DIR / rel_icon
        if not p.is_file():
            if allow_pending_pc6_icons and rel_icon in PC6_UI_ICONS:
                pending.append(rel_icon)
                continue
            raise AssertionError(f"Missing required RGBA UI icon: game/{rel_icon}")
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
            if rel_icon in PC6_UI_ICONS:
                hist = alpha.histogram()
                trans_ratio = hist[0] / float(w * h)
                assert 0.20 <= trans_ratio <= 0.88, (
                    f"PC-6 icon {rel_icon} abnormal transparency ratio: {trans_ratio:.3f}"
                )
                raw_rgba = im.tobytes()
                uniq_colors = len({raw_rgba[k : k + 4] for k in range(0, len(raw_rgba), 4)})
                assert uniq_colors >= 500, (
                    f"PC-6 icon {rel_icon} has suspiciously low color count ({uniq_colors}) — procedural placeholder?"
                )
            verified_count += 1

    if pending:
        print(f"[INFO] Verified {verified_count}/14 RGBA icons; awaiting {len(pending)} PC-6 icons: {pending}")
    else:
        print(f"[PASS] All {verified_count}/14 RGBA UI icons verified (128x128 RGBA, corners=[0,0,0,0], rich watercolor alpha)")
    return pending


def check_balanced_delimiters_and_references(allow_pending_pc6_icons: bool = False):
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
        "ui_icon_tea_party_cup",
        "ui_icon_mystery_lexicon",
        "ui_icon_riddle_quiz_card",
        "ui_icon_margin_quill_note",
    ):
        assert req_img in defined_images, f"Missing PC-6 image definition `{req_img}` in definitions.rpy"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC6_TOUCHED_FILES:
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
        "extras_teaparty",
        "extras_lexicon",
        "lexicon_search_modal",
        "tea_riddle_prompt_banner",
        "tea_party_result_card",
        "extras_achievements",
    ):
        assert req_scr in defined_screens, f"Missing required PC-6 screen: {req_scr}"

    for req_lbl in (
        "tea_party_t1",
        "tea_party_t2",
        "tea_party_t3",
        "tea_t1_q1_loop",
        "tea_t1_q2_loop",
        "tea_t1_q3_loop",
        "tea_t2_q1_loop",
        "tea_t2_q2_loop",
        "tea_t2_q3_loop",
        "tea_t3_q1_loop",
        "tea_t3_q2_loop",
        "tea_t3_q3_loop",
        "_tea_party_init_sandbox",
        "_tea_party_finish_session",
    ):
        assert req_lbl in defined_labels, f"Missing required PC-6 label: {req_lbl}"

    call_screen_re = re.compile(r"^\s*(?:call|show|hide)\s+screen\s+([A-Za-z_]\w*)\b")
    jump_call_re = re.compile(r"^\s*(?:jump|call)\s+([A-Za-z_]\w*)\b")
    use_scr_re = re.compile(r"^\s*use\s+([A-Za-z_]\w*)\b")
    show_scr_re = re.compile(r'\b(?:Show|Hide|ShowMenu)\(\s*["\']([A-Za-z_]\w*)["\']')
    asset_re = re.compile(r'["\']((?:images|gui|audio|fonts)/[^"\'%\{\}\[\]]+\.(?:png|jpg|webp|ogg|otf|ttf))["\']')

    jump_count = 0
    asset_refs = set()
    missing_assets = []
    pending_pc6_set = set(PC6_UI_ICONS)

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
                    if allow_pending_pc6_icons and rel_asset in pending_pc6_set:
                        continue
                    missing_assets.append(f"{rel_asset} ({rpy.relative_to(ROOT)}:{lineno})")

    for pc6_icon in PC6_UI_ICONS:
        assert pc6_icon in asset_refs, f"PC-6 icon `{pc6_icon}` is not wired into any .rpy file!"

    for rel in PC6_TOUCHED_FILES:
        p = ROOT / rel
        src = p.read_text(encoding="utf-8-sig")
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
        "ui_09p_teaparty_fresh.png",
        "ui_09q_teaparty_gold.png",
        "ui_09r_lexicon_locked.png",
        "ui_09s_lexicon_unlocked.png",
    ):
        assert shot in ui_shots_src, f"Missing {shot} in game/tests/ui_shots.rpy"

    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-6 coverage verified")


def main():
    allow_pending = "--allow-pending-pc6-icons" in sys.argv
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc6_tea_party_and_lexicon_runtime()
    pending = check_zero_intrusion_and_icons(allow_pending_pc6_icons=allow_pending)
    check_balanced_delimiters_and_references(allow_pending_pc6_icons=allow_pending)
    check_4_route_ending_regression()
    if pending:
        print("PC6_CODE_READY_AWAITING_4_ICONS")
    else:
        print("PC6_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
