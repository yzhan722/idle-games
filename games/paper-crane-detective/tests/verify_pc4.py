#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-4 Comprehensive Static, Behavioral, Reference, Asset & Main-Story Zero-Intrusion Verifier
for 《沉默侦探：千纸鹤的约定》 (games/paper-crane-detective).
"""

import ast
import os
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image
import rpy_syntax as rs  # noqa: E402  (strict_files: the save-compatibility `from` pass is not a story change)

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"

REQUIRED_UI_ICONS = [
    "images/ui/icon_crane_bookmark.png",
    "images/ui/icon_dossier_pin.png",
    "images/ui/icon_dossier_stamp.png",
    "images/ui/icon_red_thread_knot.png",
    "images/ui/icon_theater_clapper.png",
    "images/ui/icon_lighting_lamp.png",
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
    """Extract `init ... python:` blocks from a .rpy file."""
    lines = rpy_path.read_text(encoding="utf-8-sig").splitlines()
    blocks = []
    i = 0
    n = len(lines)
    header_re = re.compile(r"^(\s*)init(?:\s+[-+]?\d+)?\s+python(?:\s+in\s+\w+)?\s*:\s*(?:#.*)?$")
    while i < n:
        m = header_re.match(lines[i])
        if not m:
            i += 1
            continue
        base_indent = len(m.group(1))
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
            blocks.append((start_line, "\n".join(dedented)))
    return blocks


def check_rpy_python_syntax():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    assert len(rpy_files) >= 18, f"Expected >=18 .rpy files, found {len(rpy_files)}"
    total_blocks = 0
    total_inline = 0
    for rpy in rpy_files:
        for start_line, code in extract_python_blocks(rpy):
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
        f"({total_blocks} init python blocks + {total_inline} inline `$` statements)"
    )


def check_balanced_delimiters_and_references():
    rpy_files = sorted(GAME_DIR.rglob("*.rpy"))
    defined_screens = {
        # Built-in Ren'Py screens
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

    screen_re = re.compile(r"^\s*screen\s+([A-Za-z_]\w*)\s*\(")
    label_re = re.compile(r"^\s*label\s+([A-Za-z_]\w*)\s*(?:\(.*\))?\s*:")
    style_re = re.compile(r"^\s*style\s+([A-Za-z_]\w*)(?:\s+is\s+([A-Za-z_]\w*))?")
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

    for child_st, parent_st, loc in style_parents:
        assert parent_st in defined_styles, f"Style `{child_st}` inherits undefined `{parent_st}` at {loc}"

    # Validate indentation & colon-block structure in extra.rpy, screens.rpy, ui_shots.rpy
    style_prop_re = re.compile(r'^\s*style\s+"([A-Za-z_]\w*)"\s*$')
    for rel in ("game/extra.rpy", "game/screens.rpy", "game/tests/ui_shots.rpy"):
        lines = (ROOT / rel).read_text(encoding="utf-8-sig").splitlines()
        for i, ln in enumerate(lines):
            assert "\t" not in ln, f"Tab character found in {rel}:{i + 1}"
            msp = style_prop_re.match(ln)
            if msp:
                assert msp.group(1) in defined_styles, f"Undefined style `{msp.group(1)}` referenced at {rel}:{i + 1}"
            stripped = ln.strip()
            if not stripped or stripped.startswith("#"):
                continue
            # Remove trailing inline comments before checking colon block header
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
        "extras_truth",
        "extras_bookmarks",
        "extras_dossier",
        "dossier_fullboard",
        "extras_studio",
        "free_theater_stage",
        "studio_line_input_modal",
    ):
        assert req_scr in defined_screens, f"Missing required screen: {req_scr}"

    # Check jump / call / call screen / use / Show / Hide / ShowMenu references & literal asset paths
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
                # Voice sample in preferences is gated behind `if config.has_voice:` (False in options.rpy)
                if rel_asset.startswith("audio/voice/"):
                    continue
                asset_refs.add(rel_asset)
                if not (GAME_DIR / rel_asset).is_file():
                    missing_assets.append(f"{rel_asset} ({rpy.relative_to(ROOT)}:{lineno})")

    # Verify balanced parentheses/brackets/braces in modified .rpy files
    for rel in ("game/extra.rpy", "game/screens.rpy", "game/tests/ui_shots.rpy"):
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

    print(
        f"[PASS] Balanced delimiters & reference registry "
        f"({len(defined_screens)} screens, {len(defined_labels)} labels, {jump_count} jumps/calls, "
        f"{len(defined_styles)} styles, {len(asset_refs)} distinct asset refs)"
    )
    if missing_assets:
        raise AssertionError("Missing referenced assets:\n  " + "\n  ".join(sorted(set(missing_assets))))


def check_pc4_runtime_logic():
    """Execute extra.rpy + lighting.rpy data & helper functions in a clean Ren'Py mock harness."""
    lighting_src = (GAME_DIR / "lighting.rpy").read_text(encoding="utf-8-sig")
    bg_light_py = lighting_src.replace("define BG_LIGHT =", "BG_LIGHT =")

    class DummyPersistent:
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
        last_player_name = "陈默"

    class DummyMatrix:
        def __init__(self, tag):
            self.tag = tag

        def __mul__(self, other):
            return DummyMatrix(f"{self.tag}*{other.tag}")

    class DummySound:
        def play(self, *_a, **_kw):
            pass

    class DummyRenpy:
        sound = DummySound()

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

    class DummyAch:
        @staticmethod
        def clear_all():
            pass

        @staticmethod
        def sync():
            pass

    env = {
        "persistent": DummyPersistent(),
        "store": DummyPersistent(),
        "config": type("Cfg", (), {"label_callback": None, "screen_height": 720})(),
        "renpy": DummyRenpy(),
        "achievement": DummyAch(),
        "_history_list": [],
        "ACH_LIST": [0] * 14,
        "ach_count": lambda: 0,
        "ach_grant": lambda *_a: None,
        "ach_check_cg": lambda: None,
        "TintMatrix": lambda v: DummyMatrix(f"Tint({v})"),
        "BrightnessMatrix": lambda v: DummyMatrix(f"Bright({v})"),
        "SaturationMatrix": lambda v: DummyMatrix(f"Sat({v})"),
        "Color": lambda rgb=None: rgb,
        "Transform": lambda child, **kw: ("Transform", child, kw),
        "Null": lambda: ("Null",),
        "NullAction": lambda: ("NullAction",),
        "Show": lambda *a, **kw: ("Show", a, kw),
        "Hide": lambda *a, **kw: ("Hide", a, kw),
        "Start": lambda *a: ("Start", a),
        "Replay": lambda *a, **kw: ("Replay", a, kw),
        "MusicRoom": lambda **kw: type("MR", (), {"add": lambda self, *a, **k: None})(),
    }
    exec(bg_light_py, env)
    for _line, block in extract_python_blocks(GAME_DIR / "extra.rpy"):
        exec(block, env)

    tab_keys = [k for k, _lbl in env["EXTRAS_TABS"]]
    assert "dossier" in tab_keys and "studio" in tab_keys, f"Missing PC-4 tabs in {tab_keys}"

    cast = env["DOSSIER_CAST"]
    assert len(cast) >= 10, "Expected at least 10 core cast nodes on Relationship Whiteboard"
    mini_boxes = []
    full_boxes = []
    for ch in cast:
        cid = ch["id"]
        assert (GAME_DIR / "images" / f"side_{cid}_neutral.png").is_file(), f"Missing side_{cid}_neutral.png"
        assert (GAME_DIR / "images" / f"chara_{cid}_neutral.png").is_file(), f"Missing chara_{cid}_neutral.png"
        mx, my = ch["mini_pos"]
        fx, fy = ch["full_pos"]
        assert 47 <= mx <= 655 and 34 <= my <= 222, f"Mini corkboard node {cid} out of bounds: {(mx, my)}"
        assert 56 <= fx <= 656 and 46 <= fy <= 540, f"Full corkboard node {cid} out of bounds: {(fx, fy)}"
        for ocid, ox, oy in mini_boxes:
            assert abs(mx - ox) >= 98 or abs(my - oy) >= 72, f"Mini nodes overlap: {cid} vs {ocid}"
        for ocid, ox, oy in full_boxes:
            assert abs(fx - ox) >= 116 or abs(fy - oy) >= 96, f"Full nodes overlap: {cid} vs {ocid}"
        mini_boxes.append((cid, mx, my))
        full_boxes.append((cid, fx, fy))
        assert len(ch["affection_notes"]) >= 2 and len(ch["alibis"]) >= 1
        assert ch["pub_motive"] and ch["deep_motive"] and ch["foreshadowing"]

    p = env["persistent"]
    p.te_cleared = False
    p.truth_spoiler_confirmed = False
    assert not env["truth_spoiler_unlocked"]()
    p.truth_spoiler_confirmed = True
    assert env["truth_spoiler_unlocked"]()
    p.truth_spoiler_confirmed = False
    p.te_cleared = True
    assert env["truth_spoiler_unlocked"]()

    for c_key, _c_lbl in env["DOSSIER_CASES"]:
        links = env["dossier_visible_links"](c_key)
        assert len(links) >= 2, f"Expected >=2 links for case filter {c_key}"
        for s_id, d_id, *_rest in links:
            mx, my, dist, deg = env["dossier_thread_geom"](
                env["dossier_get_char"](s_id)["mini_pos"],
                env["dossier_get_char"](d_id)["mini_pos"],
            )
            assert dist >= 40 and -180.0 <= deg <= 180.0

    bg_light = env["BG_LIGHT"]
    for b_key, _b_title, _b_sub, _req in env["STUDIO_BG_LIST"]:
        assert (GAME_DIR / "images" / f"bg_{b_key}.png").is_file(), f"Missing bg_{b_key}.png"
        assert b_key in bg_light, f"bg_{b_key} missing from lighting.rpy BG_LIGHT"

    for c_key, _c_name, _c_col in env["STUDIO_CHARA_LIST"]:
        for e_key, _e_lbl in env["STUDIO_EXPR_LIST"]:
            assert (GAME_DIR / "images" / f"chara_{c_key}_{e_key}.png").is_file(), f"Missing chara_{c_key}_{e_key}.png"
            assert (GAME_DIR / "images" / f"side_{c_key}_{e_key}.png").is_file(), f"Missing side_{c_key}_{e_key}.png"

    for l_key, _lt, _ld in env["STUDIO_LIGHT_PRESETS"]:
        disp_bg = env["studio_bg_displayable"]("sunset", l_key, 1280, 720)
        assert disp_bg[0] == "Transform"
        for o_key, _ol in env["STUDIO_OUTFIT_LIST"]:
            disp_sp = env["studio_sprite_displayable"]("mo", "smile", "sunset", l_key, o_key, 561, dimmed=False)
            assert disp_sp[0] == "Transform"

    snap = env["snapshot_studio_state"]()
    env["studio_cycle_preset_line"]()
    assert p.studio_custom_line != ""
    env["studio_swap_slots"]()
    assert p.studio_slot1_char == "alice" and p.studio_slot2_char == "mo"
    who_lbl, _col, side_img, _is_note, disp_line, _slot_idx = env["studio_resolved_dialogue"]()
    assert who_lbl and (GAME_DIR / side_img).is_file() and disp_line
    env["restore_studio_state"](snap)
    assert p.studio_slot1_char == "mo"
    env["reset_all_progress"]()
    assert p.dossier_selected_char == "mo" and p.studio_bg == "agency"

    print("[PASS] PC-4 runtime logic, non-overlapping corkboard geometry, spoiler guard, lighting.rpy & 144-sprite matrix verified")


def check_ui_icons_and_zero_intrusion():
    # Zero intrusion on main story files (git status --porcelain)
    res = subprocess.run(
        ["git", "status", "--porcelain", "--", *rs.strict_files(MAIN_STORY_FILES)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert res.stdout.strip() == "", f"Main story files were modified! Output:\n{res.stdout}"

    # Zero Emoji / inline SVG in PC-4 diff
    diff_res = subprocess.run(
        ["git", "diff", "-U0", "--", "game/extra.rpy", "game/screens.rpy", "game/tests/ui_shots.rpy"],
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

    print("[PASS] Zero main-story intrusion & zero Emoji/SVG in PC-4 diff verified")

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

    print(f"[PASS] {len(REQUIRED_UI_ICONS)} RGBA UI icons verified (128x128 RGBA, corners=[0,0,0,0], crisp alpha)")


def check_4_route_ending_regression():
    """Verify definitions.rpy decide_ending & autoplay.rpy 4-route structure remain 100% intact."""
    def_src = (GAME_DIR / "definitions.rpy").read_text(encoding="utf-8-sig")
    decide_env = {}
    for _ln, blk in extract_python_blocks(GAME_DIR / "definitions.rpy"):
        if "def decide_ending" in blk:
            exec(blk, decide_env)
            break
    assert "decide_ending" in decide_env, "Could not locate decide_ending() in definitions.rpy"

    # Simulate the 4 canonical autoplay routes (best -> TE, no_truth -> HE, mixed -> NE, worst -> BE)
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
        "ui_09g_dossier_locked.png",
        "ui_09h_dossier_unlocked.png",
        "ui_09i_dossier_fullboard.png",
        "ui_09j_studio_panel.png",
        "ui_09k_studio_stage.png",
        "ui_09l_studio_clean.png",
    ):
        assert shot in ui_shots_src, f"Missing {shot} in game/tests/ui_shots.rpy"

    print("[PASS] 4-route ending regression (TE/HE/NE/BE) & ui_shots.rpy PC-4 coverage verified")


def main():
    check_rpy_python_syntax()
    check_pc4_runtime_logic()
    check_ui_icons_and_zero_intrusion()
    check_balanced_delimiters_and_references()
    check_4_route_ending_regression()
    print("PC4_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
