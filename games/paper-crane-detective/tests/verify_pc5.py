#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-5 Comprehensive Static, Behavioral, Layout, Audio-Mixer, Mailbox-Case, Asset & Zero-Intrusion Verifier
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

REQUIRED_UI_ICONS = PC4_UI_ICONS + PC5_UI_ICONS

REQUIRED_13_BGM = [
    "audio/theme_main.ogg",
    "audio/prologue_calm.ogg",
    "audio/daily_morning.ogg",
    "audio/warm_piano.ogg",
    "audio/suspense_light.ogg",
    "audio/mystery_tense.ogg",
    "audio/confrontation.ogg",
    "audio/storm_coming.ogg",
    "audio/good_ending.ogg",
    "audio/true_ending.ogg",
    "audio/hidden_ending.ogg",
    "audio/normal_ending.ogg",
    "audio/bad_ending.ogg",
]

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

PC5_TOUCHED_FILES = [
    "game/extra.rpy",
    "game/club_mailbox.rpy",
    "game/screens.rpy",
    "game/definitions.rpy",
    "game/gameplay.rpy",
    "game/achievements.rpy",
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
            elif line.startswith(in_str, i):
                i += len(in_str) - 1
                in_str = None
        else:
            if ch == "#":
                break
            if line.startswith('"""', i) or line.startswith("'''", i):
                in_str = line[i : i + 3]
                i += 2
            elif ch in ('"', "'"):
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
    assert len(rpy_files) >= 23, f"Expected >=23 .rpy files (including club_mailbox.rpy), found {len(rpy_files)}"
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


def check_balanced_delimiters_and_references(allow_pending_pc5_icons: bool = False):
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
        "ui_icon_club_mailbox",
        "ui_icon_gramophone_disc",
        "ui_icon_rain_ambience",
        "ui_icon_book_ambience",
    ):
        assert req_img in defined_images, f"Missing PC-5 image definition `{req_img}` in definitions.rpy"

    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in PC5_TOUCHED_FILES:
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
        "extras_music",
        "extras_mailbox",
        "mailbox_case_result_card",
        "extras_achievements",
        "extras_truth",
        "extras_bookmarks",
        "extras_dossier",
        "dossier_fullboard",
        "extras_studio",
        "free_theater_stage",
    ):
        assert req_scr in defined_screens, f"Missing required screen: {req_scr}"

    for req_lbl in (
        "mailbox_case_m1",
        "mailbox_case_m2",
        "mailbox_case_m3",
        "mailbox_m1_investigate_loop",
        "mailbox_m2_investigate_loop",
        "mailbox_m3_investigate_loop",
        "mailbox_m1_showdown",
        "mailbox_m2_showdown",
        "mailbox_m3_showdown",
        "_mailbox_init_sandbox",
        "_mailbox_finish_case",
    ):
        assert req_lbl in defined_labels, f"Missing required PC-5 label: {req_lbl}"

    call_screen_re = re.compile(r"^\s*(?:call|show|hide)\s+screen\s+([A-Za-z_]\w*)\b")
    jump_call_re = re.compile(r"^\s*(?:jump|call)\s+([A-Za-z_]\w*)\b")
    use_scr_re = re.compile(r"^\s*use\s+([A-Za-z_]\w*)\b")
    show_scr_re = re.compile(r'\b(?:Show|Hide|ShowMenu)\(\s*["\']([A-Za-z_]\w*)["\']')
    asset_re = re.compile(r'["\']((?:images|gui|audio|fonts)/[^"\'%\{\}\[\]]+\.(?:png|jpg|webp|ogg|otf|ttf))["\']')

    jump_count = 0
    asset_refs = set()
    missing_assets = []
    pending_pc5_Set = set(PC5_UI_ICONS)

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
                    if allow_pending_pc5_icons and rel_asset in pending_pc5_Set:
                        continue
                    missing_assets.append(f"{rel_asset} ({rpy.relative_to(ROOT)}:{lineno})")

    for pc5_icon in PC5_UI_ICONS:
        assert pc5_icon in asset_refs, f"PC-5 icon `{pc5_icon}` is not wired into any .rpy file!"

    for rel in PC5_TOUCHED_FILES:
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


def check_layout_and_tab_bar_fit():
    """Measure exact pixel width of the 9-tab EXTRAS_TABS bar using game/fonts/NotoSansSC-Regular.otf."""
    font_path = GAME_DIR / "fonts" / "NotoSansSC-Regular.otf"
    assert font_path.is_file(), f"Missing font file: {font_path}"
    font_15 = ImageFont.truetype(str(font_path), 15)

    extra_src = (GAME_DIR / "extra.rpy").read_text(encoding="utf-8-sig")
    m_tabs = re.search(r"EXTRAS_TABS\s*=\s*\[(.*?)\]", extra_src, re.S)
    assert m_tabs, "Could not locate EXTRAS_TABS in extra.rpy"
    tabs = ast.literal_eval("[" + m_tabs.group(1) + "]")
    assert len(tabs) == 9, f"Expected 9 tabs in EXTRAS_TABS, got {len(tabs)}: {tabs}"
    tab_keys = [k for k, _lbl in tabs]
    assert "mailbox" in tab_keys and "music" in tab_keys

    # Style metrics from style extras_tab_button: xminimum 54, padding (8, 0), spacing 5
    xmin = 54
    hpad = 16
    spacing = 5
    widths = []
    for _k, lbl in tabs:
        bbox = font_15.getbbox(lbl)
        txt_w = bbox[2] - bbox[0]
        btn_w = max(xmin, txt_w + hpad)
        widths.append((lbl, btn_w))

    total_tab_px = sum(w for _, w in widths) + spacing * (len(tabs) - 1)
    # game_menu_content_frame: xpos=400, xsize=820, padding=(28, 24) => inner width = 764px; viewport = 722px
    assert total_tab_px <= 722, f"EXTRAS_TABS bar overflows 722px viewport width: {total_tab_px}px ({widths})"
    assert 400 + 28 + total_tab_px <= 1220, f"EXTRAS_TABS bar exceeds 1280px screen margin: {400 + 28 + total_tab_px}px"

    # Check achievements grid 2-column non-overlapping fit & odd-count null filler guard
    ach_src = (GAME_DIR / "achievements.rpy").read_text(encoding="utf-8-sig")
    assert "if len(ACH_LIST) % 2 == 1:" in ach_src and "null width 352 height 84" in ach_src, (
        "achievements.rpy must guard odd ACH_LIST length in 2-col grid"
    )
    assert 352 * 2 + 12 <= 722, "Achievement 2-column grid exceeds 722px viewport"

    print(
        f"[PASS] 1280x720 layout & 9-tab EXTRAS_TABS pixel audit: total_tab_width={total_tab_px}px <= 722px "
        f"(inner frame 764px, right edge x={400 + 28 + total_tab_px}px < 1280px)"
    )


def check_pc5_gramophone_and_mailbox_runtime():
    """Execute definitions.rpy + achievements.rpy + extra.rpy + club_mailbox.rpy in a stateful Ren'Py mock."""
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

        def get_playing(self, channel="music"):
            val = self.playing.get(channel)
            if isinstance(val, list):
                return val[0] if val else None
            return val

        def set_volume(self, volume, delay=0.0, channel="music"):
            self.volumes[channel] = float(volume)

    class MockSound:
        def __init__(self):
            self.played = []

        def play(self, fn, **_kw):
            self.played.append(fn)

    class MockPersistent:
        chapter_reached = 0
        te_cleared = False
        truth_spoiler_confirmed = False
        quote_bookmarks = []
        dossier_selected_char = "mo"
        dossier_case_filter = "all"
        studio_bg = "agency"
        studio_light = "auto"
        studio_slot1_char = "mo"
        studio_slot1_expr = "smile"
        studio_slot1_outfit = "standard"
        studio_slot2_char = "alice"
        studio_slot2_expr = "happy"
        studio_slot2_outfit = "standard"
        studio_speaker = "slot1_note"
        studio_custom_line = ""
        studio_show_textbox = True
        studio_hide_hud = False
        mailbox_cases = {}
        mailbox_selected_case = "m1"
        gramophone_rain_pct = 0
        gramophone_study_pct = 0
        gramophone_bgm_pct = 80
        gramophone_single_loop = False
        gramophone_stop_on_exit = True
        gramophone_preset = "pure_ost"
        gramophone_unlock_all = False
        gramophone_last_track = "audio/theme_main.ogg"
        last_player_name = "陈默"

    class MockAchievementBackend:
        def __init__(self):
            self.granted = set()
            self.registered = set()

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

    mock_music = MockMusic()
    mock_sound = MockSound()
    mock_ach = MockAchievementBackend()
    mock_persistent = MockPersistent()
    shown_screens = []

    class MockRenpy:
        music = mock_music
        sound = mock_sound

        @staticmethod
        def seen_image(_name):
            return False

        @staticmethod
        def save_persistent():
            pass

        @staticmethod
        def notify(_msg):
            pass

        @staticmethod
        def list_slots():
            return []

        @staticmethod
        def has_label(_lbl):
            return True

        @staticmethod
        def substitute(s):
            return s

        @staticmethod
        def get_screen(_name):
            return None

        @staticmethod
        def show_screen(name, *args, **kwargs):
            shown_screens.append((name, args, kwargs))

        @staticmethod
        def image(*_a, **_kw):
            pass

        @staticmethod
        def variant(_v):
            return True

    class DummyMatrix:
        def __init__(self, tag):
            self.tag = tag

        def __mul__(self, other):
            return DummyMatrix(f"{self.tag}*{other.tag}")

    class DummyMusicRoom:
        def __init__(self, **kwargs):
            self.single_track = kwargs.get("single_track", False)
            self.always = set()

        def add(self, fn, always_unlocked=False):
            if always_unlocked:
                self.always.add(fn)

        def is_unlocked(self, fn):
            return fn in self.always

    env = {
        "persistent": mock_persistent,
        "config": type("Cfg", (), {"label_callback": None, "screen_height": 720, "narrator_menu": True})(),
        "renpy": MockRenpy(),
        "achievement": mock_ach,
        "_history_list": [],
        "mo_favor": 0,
        "alice_favor": 0,
        "kako_clue": 0,
        "truth_route": False,
        "fail_count": 0,
        "intuition": 3,
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
        "full_run": False,
        "crane_given": False,
        "TintMatrix": lambda v: DummyMatrix(f"Tint({v})"),
        "BrightnessMatrix": lambda v: DummyMatrix(f"Bright({v})"),
        "SaturationMatrix": lambda v: DummyMatrix(f"Sat({v})"),
        "Color": lambda rgb=None: rgb,
        "adv": object(),
        "sprite_breathe": "sprite_breathe",
        "Character": lambda *a, **kw: type("Ch", (), {"who_args": {"color": kw.get("color", "#fff")}})(),
        "Transform": lambda child=None, **kw: ("Transform", child, kw),
        "At": lambda *a: ("At", a),
        "Null": lambda: ("Null",),
        "NullAction": lambda: ("NullAction",),
        "Show": lambda *a, **kw: ("Show", a, kw),
        "Hide": lambda *a, **kw: ("Hide", a, kw),
        "ShowMenu": lambda *a, **kw: ("ShowMenu", a, kw),
        "SetField": lambda *a, **kw: ("SetField", a, kw),
        "Function": lambda *a, **kw: ("Function", a, kw),
        "Start": lambda *a: ("Start", a),
        "Replay": lambda *a, **kw: ("Replay", a, kw),
        "MusicRoom": DummyMusicRoom,
        "_": lambda s: s,
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
    for rpy_name in ("achievements.rpy", "definitions.rpy", "extra.rpy", "club_mailbox.rpy"):
        for _ln, blk, is_init in extract_python_blocks(GAME_DIR / rpy_name):
            if is_init:
                exec(blk, env)

    # 1. Verify Ambient Channels & 13-Track Jukebox
    assert "amb_rain" in mock_music.channels and "amb_study" in mock_music.channels, (
        f"Ambient channels not registered: {mock_music.channels}"
    )
    bgm_files = [fn for fn, _t, _s in env["BGM_LIST"]]
    assert set(bgm_files) == set(REQUIRED_13_BGM) and len(bgm_files) == 13, (
        f"BGM_LIST mismatch vs required 13 tracks: {bgm_files}"
    )
    for fn in REQUIRED_13_BGM:
        assert (GAME_DIR / fn).is_file(), f"Missing audio track on disk: {fn}"
        assert env["BGM_MOOD_NOTES"].get(fn), f"Missing mood note for {fn}"

    # Verify all 4 presets & mixer sliders & cleanup
    assert len(env["GRAMOPHONE_PRESETS"]) == 4
    env["apply_gramophone_preset"]("rainy_bookstore")
    assert mock_persistent.gramophone_rain_pct == 65 and mock_persistent.gramophone_study_pct == 45
    assert mock_music.get_playing("amb_rain") == "audio/sfx_rain.ogg"
    assert mock_music.get_playing("amb_study") == "audio/sfx_page.ogg"
    assert mock_music.get_playing("music") == "audio/warm_piano.ogg"
    assert abs(mock_music.volumes["amb_rain"] - 0.65) < 1e-6
    assert abs(mock_music.volumes["music"] - 0.75) < 1e-6

    env["toggle_gramophone_loop"]()
    assert mock_persistent.gramophone_single_loop is True

    # Test gramophone_stop_on_exit = False keeps ambience when leaving extras, True stops it
    mock_persistent.gramophone_stop_on_exit = False
    env["gramophone_on_leave_extras"]()
    assert env["gramophone_ambience_active"]() is True

    mock_persistent.gramophone_stop_on_exit = True
    env["gramophone_on_leave_extras"]()
    assert env["gramophone_ambience_active"]() is False
    assert abs(mock_music.volumes["music"] - 1.0) < 1e-6

    # Even if stop_on_exit is False, entering a story label MUST force-stop ambience & restore music volume!
    mock_persistent.gramophone_stop_on_exit = False
    env["apply_gramophone_preset"]("storm_deduction")
    assert env["gramophone_ambience_active"]() is True
    env["_progress_label_callback"]("start", False)
    assert env["gramophone_ambience_active"]() is False
    assert abs(mock_music.volumes["music"] - 1.0) < 1e-6

    # 2. Verify Club Mailbox 3 Cases, Clues, Deduction Combine, Rating Upgrade & Achievement
    cases = env["MAILBOX_CASE_DEFS"]
    assert [c["id"] for c in cases] == ["m1", "m2", "m3"]
    club_src = (GAME_DIR / "club_mailbox.rpy").read_text(encoding="utf-8-sig")

    expected_pairs = {
        "m1": (
            ["书袋内侧蹭印：盖着昨日11.14紫印油的未干蹭痕", "门禁红外流水：16:54入馆记录与登记簿手写17:05相差十一分钟"],
            "张子谦证言：五点钟声响起前曾听见柜台回墨章轻响",
            env["MB_M1_HINTS"],
        ),
        "m2": (
            ["夕照走廊下的袖口痕迹：织物纤维粘结发硬且无炭粉脱落", "墨墨的色卡比对：橙红夕阳缺乏蓝波段，群青会显色为暗紫灰"],
            "画框擦痕检出甘油缓干剂：群青颜料两小时内仍可转印",
            env["MB_M2_HINTS"],
        ),
        "m3": (
            ["录音波形解析：第六响后1.15秒混入广播副喇叭延迟音与开水炉铜阀声", "礼堂东廊实测：距钟楼380米且紧邻一楼储物柜，头顶广播中继固定延迟2.2秒"],
            "钟楼齿轮日志：12:30半点凸轮仅有六齿，天台开阔无反射墙",
            env["MB_M3_HINTS"],
        ),
    }

    for cid in ("m1", "m2", "m3"):
        m_blk = re.search(rf"label mailbox_case_{cid}:(.*?)(?=label mailbox_case_m|\Z)", club_src, re.S)
        assert m_blk, f"Missing script block for mailbox_case_{cid}"
        blk = m_blk.group(1)
        cjk_chars = len(re.findall(r"[\u4e00-\u9fff]", blk))
        assert 1200 <= cjk_chars <= 3200, f"Case {cid} CJK length out of expected short-case range: {cjk_chars}"
        assert f"label mailbox_{cid}_showdown:" in blk
        assert f'call _mailbox_finish_case("{cid}", _mb_mistakes)' in blk

        # Check all `scene bg <name>` exist in BG_LIGHT (or black)
        for m_bg in re.finditer(r"^\s*scene\s+bg\s+(\w+)", blk, re.M):
            bg_name = m_bg.group(1)
            assert bg_name == "black" or bg_name in env["BG_LIGHT"], f"Unknown bg `{bg_name}` in {cid}"

        # Check all `show <char> <expr>` exist on disk
        for m_sp in re.finditer(r"^\s*show\s+(?!screen\b)(\w+)\s+(\w+)", blk, re.M):
            ch_k, ex_k = m_sp.group(1), m_sp.group(2)
            assert (GAME_DIR / "images" / f"chara_{ch_k}_{ex_k}.png").is_file(), f"Missing sprite {ch_k} {ex_k}"

        # Check all `add_evidence("...")` clues have registered flip-card details
        clues = re.findall(r'add_evidence\("([^"]+)"\)', blk)
        assert len(clues) == 4, f"Expected 4 clues in case {cid}, found {len(clues)}"
        for cl in clues:
            assert cl in env["EVIDENCE_DETAILS"], f"Clue `{cl}` missing register_evidence_detail()"

        # Simulate wrong pick -> Alice hint (no fail_count pollution!) -> right pick -> solved
        pair, distractor, hints_map = expected_pairs[cid]
        env["reset_combine_state"]()
        env["mailbox_combine_mistakes"] = 0
        before_fail = env["fail_count"]
        env["pick_combine_clue"](pair[0])
        env["pick_combine_clue"](distractor)
        env["evaluate_deduction_pair"](target_pair=pair, conclusion_title="T", conclusion_body="B", wrong_hints=hints_map)
        assert env["combine_feedback_kind"] == "wrong" and env["combine_feedback"], f"Missing Alice hint in {cid}"
        assert env["mailbox_combine_mistakes"] == 1 and env["fail_count"] == before_fail
        env["reset_combine_state"]()
        env["pick_combine_clue"](pair[0])
        env["pick_combine_clue"](pair[1])
        env["evaluate_deduction_pair"](target_pair=pair, conclusion_title="T", conclusion_body="B", wrong_hints=hints_map)
        assert env["combine_feedback_kind"] == "solved"

    # Test rating persistence & upgrade (`完美结案` -> `一击破局`) & `ach_mailbox` unlock
    mock_persistent.mailbox_cases = {}
    mock_ach.clear_all()
    r1 = env["mailbox_record_case_clear"]("m1", 2)
    assert r1["best_rating"] == "完美结案" and r1["replays"] == 1
    assert not mock_ach.has("ach_mailbox")

    r1_ace = env["mailbox_record_case_clear"]("m1", 0)
    assert r1_ace["best_rating"] == "一击破局" and r1_ace["replays"] == 2
    r1_replay = env["mailbox_record_case_clear"]("m1", 3)
    assert r1_replay["best_rating"] == "一击破局" and r1_replay["last_rating"] == "完美结案" and r1_replay["replays"] == 3

    env["mailbox_record_case_clear"]("m2", 0)
    assert not mock_ach.has("ach_mailbox")
    env["mailbox_record_case_clear"]("m3", 1)
    assert mock_ach.has("ach_mailbox"), "Expected `ach_mailbox` to unlock upon solving all 3 mailbox cases!"
    assert env["mailbox_solved_count"]() == 3 and env["mailbox_perfect_count"]() == 2 and env["mailbox_total_replays"]() == 5

    act = env["mailbox_launch_action"]("m2")
    assert any(isinstance(x, tuple) and x[0] == "Replay" and x[1][0] == "mailbox_case_m2" for x in act)

    env["reset_all_progress"]()
    assert env["mailbox_solved_count"]() == 0 and mock_persistent.gramophone_rain_pct == 0

    print(
        "[PASS] PC-5 runtime simulation verified: 13-track Gramophone + 2 ambient channels + 4 presets + "
        "3 Mailbox short cases + Alice hints + rating upgrade + ach_mailbox"
    )


def check_zero_intrusion_and_icons(allow_pending_pc5_icons: bool = False):
    res = subprocess.run(
        ["git", "status", "--porcelain", "--", *MAIN_STORY_FILES],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert res.stdout.strip() == "", f"Main story / autoplay files were modified! Output:\n{res.stdout}"

    # Check git diff of existing modified files AND entire club_mailbox.rpy for Emoji / <svg>
    diff_res = subprocess.run(
        ["git", "diff", "-U0", "--", *[f for f in PC5_TOUCHED_FILES if f != "game/club_mailbox.rpy"]],
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

    club_text = (ROOT / "game/club_mailbox.rpy").read_text(encoding="utf-8-sig")
    assert "<svg" not in club_text.lower(), "Forbidden <svg> in game/club_mailbox.rpy"
    m_club_em = EMOJI_RE.search(club_text)
    assert not m_club_em, f"Forbidden Emoji/dingbat `{m_club_em.group(0)}` in game/club_mailbox.rpy"

    print("[PASS] Zero main-story intrusion & zero Emoji/SVG across all PC-5 code verified")

    pending = []
    verified_count = 0
    for rel_icon in REQUIRED_UI_ICONS:
        p = GAME_DIR / rel_icon
        if not p.is_file():
            if allow_pending_pc5_icons and rel_icon in PC5_UI_ICONS:
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
            verified_count += 1

    if pending:
        print(f"[INFO] Verified {verified_count}/10 RGBA icons; awaiting {len(pending)} PC-5 icons from coordinator: {pending}")
    else:
        print(f"[PASS] All {verified_count}/10 RGBA UI icons verified (128x128 RGBA, corners=[0,0,0,0], crisp alpha)")
    return pending


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
        "ui_09m_gramophone_mixer.png",
        "ui_09n_mailbox_fresh.png",
        "ui_09o_mailbox_solved.png",
    ):
        assert shot in ui_shots_src, f"Missing {shot} in game/tests/ui_shots.rpy"

    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-5 coverage verified")


def main():
    allow_pending = "--allow-pending-pc5-icons" in sys.argv
    check_rpy_python_syntax()
    check_layout_and_tab_bar_fit()
    check_pc5_gramophone_and_mailbox_runtime()
    pending = check_zero_intrusion_and_icons(allow_pending_pc5_icons=allow_pending)
    check_balanced_delimiters_and_references(allow_pending_pc5_icons=allow_pending)
    check_4_route_ending_regression()
    if pending:
        print("PC5_CODE_READY_AWAITING_4_ICONS")
    else:
        print("PC5_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
