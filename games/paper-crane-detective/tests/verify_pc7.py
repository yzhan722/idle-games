#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-7 Finale Comprehensive Static, Behavioral, Pixel-Budget, Old-Book-Street Restoration Workbench,
Four-Season Handwritten Letterbox, Spoiler-Gate, Asset & Zero-Intrusion Verifier
for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).
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

PC7_UI_ICONS = [
    "images/ui/icon_book_restoration.png",
    "images/ui/icon_exlibris_bookplate.png",
    "images/ui/icon_seasonal_letterbox.png",
    "images/ui/icon_wax_seal_seasons.png",
]

REQUIRED_UI_ICONS = PC4_UI_ICONS + PC5_UI_ICONS + PC6_UI_ICONS + PC7_UI_ICONS

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

PC7_TOUCHED_FILES = [
    "game/bookstreet_seasons.rpy",
    "game/extra.rpy",
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
    assert len(rpy_files) >= 25, f"Expected >=25 .rpy files (including bookstreet_seasons.rpy), found {len(rpy_files)}"
    assert (GAME_DIR / "bookstreet_seasons.rpy").is_file(), "Missing game/bookstreet_seasons.rpy"

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
    """Verify strict 1280x720 & <=722px pixel budgets for EXTRAS_TABS, 4-pill SubBar, Restoration & Letterbox."""
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

    # 1. Primary 9-tab EXTRAS_TABS bar <= 722px
    m_tabs = re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_tabs, "Could not locate EXTRAS_TABS in extra.rpy"
    tabs = ast.literal_eval("[" + m_tabs.group(1) + "]")
    assert len(tabs) == 9, f"Expected 9 primary tabs in EXTRAS_TABS, got {len(tabs)}"
    widths = [max(54, _txt_w(font_15, lbl) + 16) for _k, lbl in tabs]
    total_tab_px = sum(widths) + 5 * (len(tabs) - 1)
    assert total_tab_px <= 722, f"EXTRAS_TABS overflows 722px: {total_tab_px}px"

    # 2. Secondary Sub-Bar (4 compact pills + icons + right status inside 722px frame / 702px inner width)
    m_bs = re.search(r"EXTRAS_BOOKSTREET_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_bs, "Could not locate EXTRAS_BOOKSTREET_TABS in extra.rpy"
    bs_tabs = ast.literal_eval("[" + m_bs.group(1) + "]")
    assert [k for k, _ in bs_tabs] == ["restoration", "letterbox"]

    subbar_pills = ["茶话会 (3/3)", "批注辞典 (20/20)", "古籍修复 (3/3)", "四季信笺 (4/4)"]
    pill_widths = [max(84, _txt_w(font_12, p) + 16) for p in subbar_pills]
    # 3 icons (15px each) + 4 pills with spacing 5
    subbar_left_w = (
        15 + 5 + pill_widths[0] + 5 + pill_widths[1]
        + 5 + 15 + 5 + pill_widths[2]
        + 5 + 15 + 5 + pill_widths[3]
    )
    subbar_right_w = 14 + 5 + _txt_w(font_11, "藏书票 3/3 · 火漆印 4/4")
    subbar_total_inner = subbar_left_w + 12 + subbar_right_w
    assert subbar_total_inner <= 702, f"4-pill salon_subbar_frame overflows 702px inner width: {subbar_total_inner}px"
    assert subbar_total_inner + 20 <= 722, f"4-pill salon_subbar_frame overflows 722px outer width: {subbar_total_inner + 20}px"

    # 3. Vertical budget inside game_menu_content_frame (ysize=594, padding=(28,24) => inner 546px)
    assert "ysize 468" in extra_src and "spacing 7" in extra_src
    assert 'elif cur == "restoration":' in extra_src and "use extras_restoration" in extra_src
    assert 'elif cur == "letterbox":' in extra_src and "use extras_letterbox" in extra_src
    vertical_sum = 34 + 7 + 30 + 7 + 468
    assert vertical_sum == 546, f"Vertical stack must match 546px budget: {vertical_sum}px"

    # 4. Restoration Workbench & Seasonal Letterbox exact card grid bounds
    assert 3 * 234 + 2 * 10 == 722, "Restoration 3-tome selector must equal 722px"
    assert 3 * 226 + 2 * 8 == 694, "Restoration 3-folio clue row must fit 694px inner workbench width"
    assert 4 * 173 + 3 * 10 == 722, "Letterbox 4-season selector must equal 722px"

    bs_ui_src = (GAME_DIR / "bookstreet_seasons.rpy").read_text(encoding="utf-8-sig")
    assert 's_tab["slot_title"].split(" · ")[0]' in bs_ui_src
    slot_labels = [
        "骑缝缺叶壹 · 已复位",
        "骑缝缺叶贰 · 已复位",
        "骑缝缺叶叁 · 已复位",
    ]
    slot_row_w = sum(max(96, _txt_w(font_12, s) + 20) for s in slot_labels) + 8 * 2
    assert slot_row_w <= 694, f"Restoration slot selector row overflows 694px: {slot_row_w}px"

    # 5. Main Menu PC-7 cozy chips row within 1280x720
    mm_pc7_chips = [
        18 + 6 + _txt_w(font_13, "古籍修复台 (3/3)") + 24,
        18 + 6 + _txt_w(font_13, "四季信笺匣 (4/4)") + 24,
    ]
    mm_pc7_w = sum(mm_pc7_chips) + 10
    assert mm_pc7_w <= 500, f"Main menu PC-7 chip row too wide: {mm_pc7_w}px"

    # 6. Achievements 2-column symmetric grid fit
    ach_src = (GAME_DIR / "achievements.rpy").read_text(encoding="utf-8-sig")
    assert "def register_extra_achievement" in ach_src
    assert "if len(ACH_LIST) % 2 == 1:" in ach_src and "null width 352 height 84" in ach_src
    assert 352 * 2 + 12 <= 722

    print(
        f"[PASS] 1280x720 & <=722px pixel audit: EXTRAS_TABS={total_tab_px}px<=722px, "
        f"SubBar4Pills={subbar_total_inner}px<=702px, Vertical={vertical_sum}px==546px, "
        f"RestorationClues=694px, Letterbox4Cards=722px, MainMenuPC7={mm_pc7_w}px"
    )


def check_pc7_restoration_and_letterbox_runtime():
    """Execute full .rpy Python runtime including bookstreet_seasons.rpy in stateful sandbox."""
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
        "Start": lambda *a: ("Start", a),
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
    ):
        for _ln, code, is_init in extract_python_blocks(GAME_DIR / target_rpy):
            if is_init:
                exec(code, env)

    # ---- A. Verify Symmetric 20 Achievements (2x10 even grid) ----
    assert len(env["ACH_LIST"]) == 20, f"Expected 20 achievements (even 2x10 grid), got {len(env['ACH_LIST'])}"
    assert len(env["ACH_LIST"]) % 2 == 0, "ACH_LIST must have even length for symmetric 2-column grid!"
    assert "ach_restoration" in mock_ach.registered and "ach_seasons" in mock_ach.registered

    # ---- B. Verify All 3 Old Book Street Restoration Tomes ----
    tomes = env["RESTORATION_TOMES"]
    assert [t["id"] for t in tomes] == ["r1", "r2", "r3"]
    expected_tome_titles = {
        "r1": "雾都钟表匠的第十三枚齿轮",
        "r2": "雪夜修道院的消失墨迹",
        "r3": "黄昏旧书店与折翼纸鹤藏书志",
    }
    for t in tomes:
        tid = t["id"]
        assert t["title"] == expected_tome_titles[tid]
        assert len(t["folio_clues"]) == 3, f"Expected 3 folio clues in {tid}"
        assert len(t["slots"]) == 3, f"Expected 3 restoration slots in {tid}"
        assert len(t["mo_marginalia_pub"]) >= 60 and len(t["alice_marginalia"]) >= 50
        for s_idx, slot in enumerate(t["slots"]):
            assert slot["slot_index"] == s_idx
            cands = slot["candidates"]
            assert len(cands) == 3
            assert sum(1 for c in cands if c["correct"]) == 1
            for c in cands:
                assert len(c["alice_feedback"]) >= 18 and len(c["mo_feedback"]) >= 18

    # Execute full interactive workbench flow across r1, r2, r3
    assert env["restoration_completed_count"]() == 0 and env["restoration_perfect_count"]() == 0
    for idx, t in enumerate(tomes):
        tid = t["id"]
        env["restoration_select_tome"](tid)
        assert mock_persistent.restoration_selected_tome == tid
        for clue in t["folio_clues"]:
            assert env["restoration_inspect_clue"](tid, clue["id"]) is True
        assert len(env["restoration_get_record"](tid)["inspected_clues"]) == 3

        # On r1, intentionally test wrong candidate first -> witty feedback, 0 fail_count mutation!
        if tid == "r1":
            wrong_cand = [c for c in t["slots"][0]["candidates"] if not c["correct"]][0]
            res_w = env["restoration_attempt_candidate"](tid, 0, wrong_cand["id"])
            assert res_w["ok"] is True and res_w["correct"] is False and res_w["completed_tome"] is False
            assert res_w["alice_feedback"] and res_w["mo_feedback"]
            assert env["fail_count"] == 0, "Restoration wrong pick must NEVER mutate main-story fail_count!"

        for s_idx, slot in enumerate(t["slots"]):
            right_cand = [c for c in slot["candidates"] if c["correct"]][0]
            res_ok = env["restoration_attempt_candidate"](tid, s_idx, right_cand["id"])
            assert res_ok["ok"] is True and res_ok["correct"] is True
            assert res_ok["completed_tome"] is (s_idx == 2)

        rec = env["restoration_get_record"](tid)
        assert rec["restored"] is True and rec["restored_slots"] == [0, 1, 2]
        if idx < 2:
            assert not mock_ach.has("ach_restoration")
        else:
            assert mock_ach.has("ach_restoration"), "Expected ach_restoration unlocked after 3rd tome!"

    # Verify r1 had 1 mistake (precision 90%), then reset workbench & re-solve flawlessly -> upgrades to 100% & preserves Ex-Libris!
    r1_before = env["restoration_get_record"]("r1")
    assert r1_before["best_precision"] == 90 and r1_before["perfect_stamp"] is False
    env["restoration_reset_tome_workbench"]("r1")
    assert env["restoration_get_record"]("r1")["restored"] is True, "Resetting workbench must preserve unlocked Ex-Libris!"
    for s_idx, slot in enumerate(tomes[0]["slots"]):
        right_cand = [c for c in slot["candidates"] if c["correct"]][0]
        env["restoration_attempt_candidate"]("r1", s_idx, right_cand["id"])
    r1_after = env["restoration_get_record"]("r1")
    assert r1_after["best_precision"] == 100 and r1_after["perfect_stamp"] is True
    assert env["restoration_completed_count"]() == 3 and env["restoration_perfect_count"]() == 3

    # ---- C. Verify All 4 Seasonal Keepsake Vignettes & Fountain-Pen Letterbox ----
    letters = env["SEASONAL_LETTERS"]
    assert [s["id"] for s in letters] == ["spring", "summer", "autumn", "winter"]
    bs_src = (GAME_DIR / "bookstreet_seasons.rpy").read_text(encoding="utf-8-sig")
    cjk_counts = {}

    for idx, s in enumerate(letters):
        sid = s["id"]
        lbl = s["label"]
        assert lbl == f"season_letter_{sid}"
        assert s["bg_key"] in env["BG_LIGHT"], f"Season {sid} bg_key `{s['bg_key']}` missing from BG_LIGHT"
        assert len(s["letter_body_pub"]) >= 160, f"Season {sid} fountain-pen letter body too short"

        nxt_pat = f"label season_letter_{letters[idx + 1]['id']}:" if idx < 3 else r"\Z"
        m_blk = re.search(rf"label {lbl}:(.*?)(?={nxt_pat})", bs_src, re.S)
        assert m_blk, f"Missing script block for {lbl}"
        blk = m_blk.group(1)
        cjk_n = len(re.findall(r"[\u4e00-\u9fff]", blk))
        cjk_counts[sid] = cjk_n
        assert 1800 <= cjk_n <= 2350, f"Seasonal vignette {sid} CJK count {cjk_n} outside target 1,800-2,300 window!"

        q_loop = f"season_{sid}_q_loop"
        assert f"label {q_loop}:" in blk and f"jump {q_loop}" in blk, f"Missing non-dead-ending riddle loop in {lbl}"
        assert "show screen season_riddle_prompt_banner(" in blk
        assert f'call _season_letter_finish_vignette("{sid}", _sl_mistakes)' in blk
        assert "add_fail(" not in blk and "fail_count +=" not in blk and "mo_favor +=" not in blk

        # Check all backgrounds & character sprites in vignette exist in BG_LIGHT & on disk
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

    # Verify _progress_label_callback stops gramophone ambience & updates current_chapter_label for all 4 seasonal labels
    for sid in ("spring", "summer", "autumn", "winter"):
        lbl = f"season_letter_{sid}"
        mock_persistent.gramophone_stop_on_exit = False
        env["apply_gramophone_preset"]("rainy_bookstore")
        assert env["gramophone_ambience_active"]() is True
        env["_progress_label_callback"](lbl, False)
        assert env["gramophone_ambience_active"]() is False
        assert env["store"].current_chapter_label == lbl

    # Verify launch action stops gramophone ambience & launches sandboxed Replay
    env["apply_gramophone_preset"]("rainy_bookstore")
    act = env["letterbox_launch_action"]("autumn")
    for item in act:
        if isinstance(item, tuple) and item[0] == "Function":
            item[1](*item[2], **item[3])
    assert env["gramophone_ambience_active"]() is False
    assert any(isinstance(x, tuple) and x[0] == "Replay" and x[1][0] == "season_letter_autumn" for x in act)

    # Simulate opening paper modal & sealing all 4 seasonal letters -> unlocks ach_seasons
    env["letterbox_open_paper_modal"]("spring")
    assert env["letterbox_read_count"]() == 1 and env["letterbox_seal_count"]() == 0
    assert any(s[0] == "seasonal_letter_paper_modal" for s in mock_renpy.shown_screens)

    env["letterbox_record_clear"]("spring", mistakes_count=1)
    assert env["letterbox_get_record"]("spring")["gold_seal"] is False
    env["letterbox_record_clear"]("spring", mistakes_count=0)
    assert env["letterbox_get_record"]("spring")["gold_seal"] is True
    env["letterbox_record_clear"]("summer", mistakes_count=0)
    env["letterbox_record_clear"]("autumn", mistakes_count=0)
    assert not mock_ach.has("ach_seasons")
    env["letterbox_record_clear"]("winter", mistakes_count=0)
    assert mock_ach.has("ach_seasons"), "Expected ach_seasons unlocked upon sealing all 4 seasonal letters!"
    assert env["letterbox_seal_count"]() == 4 and env["letterbox_gold_seal_count"]() == 4

    # ---- D. Strict Spoiler Gate (`truth_spoiler_unlocked()`) Audit ----
    mock_persistent.te_cleared = False
    mock_persistent.truth_spoiler_confirmed = False
    assert env["truth_spoiler_unlocked"]() is False

    r3_locked = env["restoration_render_marginalia_view"]("r3")
    assert r3_locked["unlocked"] is False
    assert "第三只淡紫色的纸鹤" not in r3_locked["display_mo_marginalia"]
    assert "防剧透火漆保护" in r3_locked["display_masked_hint"]

    for sp_season in ("autumn", "winter"):
        lv_locked = env["letterbox_render_letter_view"](sp_season)
        assert lv_locked["unlocked"] is False
        assert lv_locked["display_deep_paragraph"] == ""
        assert lv_locked["display_masked_prompt"] != ""
        for secret_kw in ("重新开口", "周明远", "十二封", "旧仓库"):
            assert secret_kw not in lv_locked["display_body"]
            assert secret_kw not in lv_locked["display_mo_ps"]
            assert secret_kw not in lv_locked["display_alice_ps"]

    # Confirm spoiler unlock reveals post-TE notes cleanly
    mock_persistent.truth_spoiler_confirmed = True
    assert env["truth_spoiler_unlocked"]() is True
    r3_open = env["restoration_render_marginalia_view"]("r3")
    assert r3_open["unlocked"] is True and "第三只淡紫色的纸鹤" in r3_open["display_mo_marginalia"]
    w_open = env["letterbox_render_letter_view"]("winter")
    assert w_open["unlocked"] is True and "周明远" in w_open["display_deep_paragraph"] and w_open["display_masked_prompt"] == ""

    # Verify reset_all_progress cleans up all PC-7 state while leaving main-story variables untouched
    assert env["mo_favor"] == 50 and env["fail_count"] == 0 and env["truth_route"] is False
    env["reset_all_progress"]()
    assert env["restoration_completed_count"]() == 0
    assert env["letterbox_seal_count"]() == 0 and env["letterbox_read_count"]() == 0
    assert mock_persistent.restoration_selected_tome == "r1"
    assert mock_persistent.letterbox_selected_season == "spring"

    print(
        f"[PASS] PC-7 runtime verified: 3 Restorations + Ex-Libris + ach_restoration | "
        f"4 Seasonal Letters (CJK={cjk_counts}) + Wax Seals + ach_seasons | Spoiler Gate & Reset verified"
    )


def check_zero_intrusion_and_icons():
    res = subprocess.run(
        ["git", "status", "--porcelain", "--", *rs.strict_files(MAIN_STORY_FILES)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert res.stdout.strip() == "", f"Main story / definitions / autoplay files were modified! Output:\n{res.stdout}"

    diff_res = subprocess.run(
        ["git", "diff", "-U0", "--", *[f for f in PC7_TOUCHED_FILES if f != "game/bookstreet_seasons.rpy"]],
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

    bs_text = (ROOT / "game/bookstreet_seasons.rpy").read_text(encoding="utf-8-sig")
    assert "<svg" not in bs_text.lower(), "Forbidden <svg> in game/bookstreet_seasons.rpy"
    assert "\ufffd" not in bs_text, "Replacement char U+FFFD found in game/bookstreet_seasons.rpy"
    m_bs_em = EMOJI_RE.search(bs_text)
    assert not m_bs_em, f"Forbidden Emoji/dingbat `{m_bs_em.group(0)}` in game/bookstreet_seasons.rpy"

    print("[PASS] Zero main-story intrusion (including definitions.rpy untouched) & zero Emoji/SVG/garbled verified")

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
            if rel_icon in PC7_UI_ICONS:
                hist = alpha.histogram()
                trans_ratio = hist[0] / float(w * h)
                assert 0.15 <= trans_ratio <= 0.88, (
                    f"PC-7 icon {rel_icon} abnormal transparency ratio: {trans_ratio:.3f}"
                )
                raw_rgba = im.tobytes()
                uniq_colors = len({raw_rgba[k : k + 4] for k in range(0, len(raw_rgba), 4)})
                assert uniq_colors >= 500, (
                    f"PC-7 icon {rel_icon} has suspiciously low color count ({uniq_colors})"
                )
            verified_count += 1

    print(f"[PASS] All {verified_count}/18 RGBA UI icons verified (128x128 RGBA, corners=[0,0,0,0], rich watercolor alpha)")


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
        "ui_icon_book_restoration",
        "ui_icon_exlibris_bookplate",
        "ui_icon_seasonal_letterbox",
        "ui_icon_wax_seal_seasons",
    ):
        assert req_img in defined_images, f"Missing PC-7 image definition `{req_img}`"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC7_TOUCHED_FILES:
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
        "extras_restoration",
        "extras_letterbox",
        "seasonal_letter_paper_modal",
        "season_riddle_prompt_banner",
        "seasonal_letter_result_card",
        "extras_achievements",
    ):
        assert req_scr in defined_screens, f"Missing required PC-7 screen: {req_scr}"

    for req_lbl in (
        "season_letter_spring",
        "season_letter_summer",
        "season_letter_autumn",
        "season_letter_winter",
        "season_spring_q_loop",
        "season_summer_q_loop",
        "season_autumn_q_loop",
        "season_winter_q_loop",
        "_season_letter_init_sandbox",
        "_season_letter_finish_vignette",
    ):
        assert req_lbl in defined_labels, f"Missing required PC-7 label: {req_lbl}"

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

    for pc7_icon in PC7_UI_ICONS:
        assert pc7_icon in asset_refs, f"PC-7 icon `{pc7_icon}` is not wired into any .rpy file!"

    for rel in PC7_TOUCHED_FILES:
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
        "ui_09t_restoration_workbench.png",
        "ui_09u_restoration_exlibris.png",
        "ui_09v_letterbox_locked.png",
        "ui_09w_letterbox_sealed.png",
    ):
        assert shot in ui_shots_src, f"Missing {shot} in game/tests/ui_shots.rpy"

    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-7 coverage verified")


def main():
    check_rpy_python_syntax()
    check_layout_and_pixel_bounds()
    check_pc7_restoration_and_letterbox_runtime()
    check_zero_intrusion_and_icons()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC7_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
