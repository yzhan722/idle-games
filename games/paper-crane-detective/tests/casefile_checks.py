#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PC-G2 shared checks: the unified 「案卷」 (two bonus stories + eight replayable short cases, one difficulty note, one set of
rating names). verify_pc10 .. verify_pc17 call these instead of the superseded folio / sub-bar layouts they used to measure;
verify_release.py runs them on the full sandbox.
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import difflib  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
from pathlib import Path  # noqa: E402
from PIL import ImageFont  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rpy_syntax as rs  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"

# files the release consolidation (PC-G2 / PC-G3 / PC-COM1) edits on top of the older milestones: the per-milestone
# "nothing but my targets differs from HEAD" guards accept them (main-story files are never listed here)
RELEASE_TOUCHED_FILES = frozenset(
    [f"game/{n}.rpy" for n in (
        "extra", "screens", "achievements", "options", "credits", "audio", "dlc_stories", "club_mailbox", "gameplay", "bookstreet_seasons",
        "radio_origami",
        "tea_party_lexicon", "stargazer_badges", "vanished_shelf_album",
        "wings_theater_capsule", "yearbook_atelier_wall", "zephyr_relay_casebook", "zoetrope_shadow_folio",
        "zubenelgenubi_meteor_casebook", "zwembad_locker_casebook", "zymase_bakeoff_casebook", "tests/ui_shots")]
    + [f"tests/verify_pc{i}.py" for i in range(4, 18)]
    + ["tests/verify_glyphs.py", "game/fonts/LICENSE-OFL.txt", "README_如何运行.md", "build.bat", "lint.bat", "run.bat", "reset_progress.bat"])

CASE_TABS = ["library", "theater", "atelier", "sportsday", "haunted", "astro", "pool", "bake"]
CASE_MODULES = {
    "library": ("LIBRARY", "vanished_shelf_album.rpy", "LIBRARY_HOTSPOTS", "LIBRARY_CHAIN_LINKS", r"label library_chain_k\d:"),
    "theater": ("THEATER", "wings_theater_capsule.rpy", "THEATER_HOTSPOTS", "THEATER_ACT_LINKS", r"label theater_act_k\d:"),
    "atelier": ("ATELIER", "yearbook_atelier_wall.rpy", "ATELIER_HOTSPOTS", "ATELIER_STROKE_LINKS", r"label atelier_stroke_k\d:"),
    "sportsday": ("SPORTS", "zephyr_relay_casebook.rpy", "SPORTS_ITEMS", "SPORTS_RELAY_LEGS", r"label sports_relay_k\d:"),
    "haunted": ("HAUNTED", "zoetrope_shadow_folio.rpy", "HAUNTED_SPOTS", "HAUNTED_LAMP_LINKS", r"label haunted_lamp_k\d:"),
    "astro": ("ASTRO", "zubenelgenubi_meteor_casebook.rpy", "ASTRO_SPOTS", "ASTRO_STAR_LINKS", r"label astro_star_k\d:"),
    "pool": ("POOL", "zwembad_locker_casebook.rpy", "POOL_SPOTS", "POOL_LAP_LINKS", r"label pool_lap_k\d:"),
    "bake": ("BAKE", "zymase_bakeoff_casebook.rpy", "BAKE_SPOTS", "BAKE_LAYER_LINKS", r"label bake_layer_k\d:"),
}
DLC_LABELS = ["dlc_alice_ledger", "dlc_mo_bookstreet"]
GRADE_NAMES = ["金牌", "银牌", "铜牌"]

SALON_GROUPS = [
    ("salon", ("teaparty", "lexicon")),
    ("bookstreet", ("restoration", "letterbox", "origami")),
    ("starlit", ("radio", "planetarium", "badges")),
    ("closedlib", tuple(CASE_TABS)),
    ("keepsake", ("album", "capsule", "wall", "notebook")),
]
SALON_LABELS = {"salon": "侦探社沙龙", "bookstreet": "旧书街与四季", "starlit": "电波与星空", "closedlib": "案卷", "keepsake": "纪念与寄语"}


def release_touched(rel):
    """`rel` as git prints it (non-ASCII names may be octal-quoted). Also a script file whose only change is the
    save-compatibility pass (`from` clauses on label calls, rpy_syntax.call_from_only_files)."""
    return (rel in RELEASE_TOUCHED_FILES or (rel.startswith("README_") and rel.endswith(".md"))
            or rel in rs.call_from_only_files())


def unchanged_modules(mods):
    """The older modules a per-milestone zero-intrusion guard still protects byte for byte."""
    return [m for m in mods if m not in RELEASE_TOUCHED_FILES]


def story_lines(text):
    """Everything inside `label` blocks, one logical line each, indentation dropped."""
    out = []

    def walk(blocks):
        for _ln, t, sub in blocks:
            out.append(t)
            walk(sub)

    for ln, t, sub in rs.group(rs.logical_lines(text.replace("\r\n", "\n"))):
        if re.match(r"label\b", t):
            walk([(ln, t, sub)])
    return out


def check_story_frozen():
    """The release edits the files above, but not their stories: the label bodies of every script file are the committed ones.
    Only the two `sysmsg "【..."` lines per short case that name the top rating may be reworded (they must say 金牌).
    Replaces the per-milestone "this module is byte-identical" guards for the touched modules. Returns the number of files compared
    (0 without git)."""
    n = 0
    for p in sorted(GAME_DIR.glob("*.rpy")):
        old = subprocess.run(["git", "show", f"HEAD:./game/{p.name}"], cwd=str(ROOT), capture_output=True)
        if old.returncode:
            continue
        n += 1
        # the save-compatibility pass adds `from` clauses to label calls: not a story change
        a = story_lines(rs.strip_call_from(old.stdout.decode("utf-8-sig")))
        b = story_lines(rs.strip_call_from(p.read_bytes().decode("utf-8-sig")))
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if op == "equal":
                continue
            was, now = a[i1:i2], b[j1:j2]
            assert len(was) == len(now) and all(x.startswith('sysmsg "【') and y.startswith('sysmsg "【') and "金牌" in y
                                                for x, y in zip(was, now)), f"{p.name}: story changed\n  - {was[:2]}\n  + {now[:2]}"
    return n


def pc13_line_ok(ln):
    """Lines the PC-13 module may have gained since it was frozen: comments, the reworded rating copy (PC-G2), the shared
    reading of old records and the `from` clause of a label call (save compatibility)."""
    txt = ln[1:]
    if re.match(r"\s*call\s+(?!screen\b)", txt) and re.search(r"\sfrom\s+" + rs.CALL_FROM_PREFIX + r"\w+\s*$", txt):
        return True
    return not txt.strip() or txt.lstrip().startswith("##") or any(t in txt for t in (
        "牌", "评级", "复盘章", "add Solid(", "save_int(raw.get(", "casefile_best_key(raw)", "isinstance(last_tier, str)"))


def _read(rel):
    return (ROOT / rel).read_text(encoding="utf-8-sig")


def _font(size, serif=False, bold=False):
    name = "NotoSerifSC-Bold.otf" if serif else "NotoSansSC-Bold.otf" if bold else "NotoSansSC-Regular.otf"
    return ImageFont.truetype(str(GAME_DIR / "fonts" / name), size)


def _w(font, text):
    return round(font.getlength(text))


def _prop(src, style, prop):
    m = re.search(rf"^style {style}(?: is \w+)?:\n((?:    .*\n)+)", src, re.M)
    return re.search(rf"^    {prop} (.+)$", m.group(1), re.M).group(1)


def screen_source(src, name):
    m = re.search(rf"^screen {name}\(.*?(?=^(?:screen|style|transform|label|init|default|define|image)\b|^##)", src, re.M | re.S)
    return m.group(0)


def check_subbar(sb, keys, extra_src, report):
    """The salon sub-bar: five groups, 20 tabs each once, the eight short cases behind one 「案卷」 pill that opens the
    case file instead of expanding; every open state <= 702px."""
    assert [(g[0], tuple(g[3])) for g in sb["groups"]] == SALON_GROUPS, sb["groups"]
    assert len(sb["keys"]) == len(set(sb["keys"])) == 20 and set(keys) <= set(sb["keys"]), sb["keys"]
    assert {g[0]: g[1] for g in sb["groups"]} == SALON_LABELS
    assert sb["inner"] == 702
    for gkey, px in sb["per_group"].items():
        assert px <= sb["inner"], f"Sub-bar with `{gkey}` open overflows 702px: {px}px"
    assert sb["quad"] == (4, 60, 4) and sb["quint"] is None and sb["sext"] is None, (sb["quad"], sb["quint"], sb["sext"])
    assert not set(CASE_TABS) & set(sb["pills"]), "The short cases have no sub-bar pills of their own any more"
    assert sb["totals"] == {"teaparty": 3, "lexicon": 20, "restoration": 3, "letterbox": 4, "origami": 12, "radio": 3, "planetarium": 3,
                            "badges": 9, "album": 12, "capsule": 12, "wall": 12, "notebook": 8}, sb["totals"]
    assert {g[0]: g[2] for g in sb["groups"]}["keepsake"] == "images/ui/icon_graduation_card.png"
    for g in sb["groups"]:  # the compact style is used where it is needed, and its pills are equally wide
        if len(g[3]) >= 4 and g[0] != "closedlib":
            texts = [f"{sb['pills'][t][0]} {sb['totals'][t]}/{sb['totals'][t]}" for t in g[3]]
            assert {max(60, _w(_font(11), t) + 8) for t in texts} == {60}, f"compact pills of `{g[0]}` are not equal-width"
            wide = sum(max(66, _w(_font(11), t) + 12) - 60 for t in texts)
            assert sb["per_group"][g[0]] + wide > 702, f"`{g[0]}` fits with 66px pills: the compact style is unnecessary"
    blk = re.search(r'style "salon_subbar_frame"\n(.*?)\n\s+viewport:', extra_src, re.S).group(1)
    assert 'style ("salon_quad_pill" if len(_gtabs) >= 4 else "bookstreet_subtab_pill")' in blk and "add salon_tab_icon(_tkey)" in blk
    launcher = blk.split("if _gkey == CASEFILE_GROUP:", 1)[1].split("elif _gkey == _salon_open:", 1)[0]
    assert 'action Show("extras_folio_modal", from_extras=True)' in launcher and "selected (cur in _gtabs)" in launcher
    assert "salon_sext_pill" not in blk and "salon_quint_pill" not in blk
    for k in keys:
        assert f'elif cur == "{k}":' in extra_src, f"extras() viewport does not route `{k}`"
    report["SubBarWorst"] = sb["worst"]


def check_pill_texts(env):
    seen = 0
    for g in env["EXTRAS_SALON_GROUPS"]:
        for t in g[3]:
            assert env["salon_group_of"](t) == g[0] and env["salon_open_group"](t) == g[0]
            assert (GAME_DIR / env["salon_tab_icon"](t)).is_file()
            if t in env["_SALON_TAB_PILLS"] and env["_SALON_TAB_PILLS"][t][1] in env:
                assert re.fullmatch(r"\S+ \d+/\d+", env["salon_tab_pill_text"](t)), t
                seen += 1
    fn = env["_SALON_TAB_PILLS"]["wall"][1]
    if fn in env:  # a counter that is missing degrades to the bare name, the extras page never crashes
        saved = env.pop(fn)
        assert env["salon_tab_pill_text"]("wall") == "寄语"
        env[fn] = saved
    for t in CASE_TABS:
        assert env["salon_open_group"](t) == "closedlib" and t not in env["_SALON_TAB_PILLS"]
    return seen


def check_layout(env, report):
    """screens.rpy extras_folio_modal: one screen without scrolling, ten big cards (icon, title, best grade), one legend."""
    scr = _read("game/screens.rpy")
    folio = screen_source(scr, "extras_folio_modal")
    card = screen_source(scr, "extras_folio_case_card")
    pw = int(_prop(scr, "folio_panel", "xsize"))
    ppx, ppy = ast.literal_eval(_prop(scr, "folio_panel", "padding"))
    cw, ch = int(_prop(scr, "folio_card", "xsize")), int(_prop(scr, "folio_card", "ysize"))
    cpx, cpy = ast.literal_eval(_prop(scr, "folio_card", "padding"))
    inner = pw - 2 * ppx
    assert inner == 2 * cw + 12 == 712 and "grid 2 5:" in folio and "xspacing 12" in folio and "yspacing 8" in folio
    grid = folio.split("grid 2 5:", 1)[1].split("\n\n", 1)[0]
    assert re.search(r"for _row in casefile_rows\(\):\n\s+use extras_folio_case_card\(_row, from_extras, view_only\)", grid)
    rows = env["casefile_rows"]()
    assert len(rows) == 10, "A 2 x 5 grid needs exactly ten children (Ren'Py rejects a partly-filled grid)"
    sizes = [int(x) for x in re.findall(r" size (\d+)", folio + card)]
    assert min(sizes) >= 16, f"Case file text must be big: {sorted(sizes)}"
    icon = int(re.search(r'add row\["icon"\] xysize \((\d+), \d+\)', card).group(1))
    t_size = int(re.search(r'text row\["title"\].*? size (\d+)', card).group(1))
    g_size = int(re.search(r'text row\["grade"\] size (\d+)', card).group(1))
    gap = int(re.search(r"hbox:\n\s+spacing (\d+)", card).group(1))
    assert len(re.findall(r"^\s+text ", card, re.M)) == 2, "A card shows a title and the best grade, nothing else"
    text_w = cw - 2 * cpx - icon - gap
    widest = 0
    titles = {r["title"] for r in rows} | {d[2] for d in env["DLC_LIST"]} | {env["FOLIO_DLC_MASKED_TITLE"]}
    for t in titles:
        widest = max(widest, _w(_font(t_size, serif=True), t))
    for g in GRADE_NAMES + ["未结案", "已读", "未读", "序章后开放"]:
        widest = max(widest, _w(_font(g_size, bold=True), g))
    assert widest <= text_w, f"Case file card text overflows {text_w}px: {widest}px"
    line = 1.45
    assert round(t_size * line) + 2 + round(g_size * line) <= ch - 2 * cpy and icon <= ch - 2 * cpy
    legend = re.search(r'text \("([^"]+)" % \(CASE_CLUES, CASE_STEPS, CASE_CHOICES\)\) size (\d+)', folio)
    leg_w = _w(_font(int(legend.group(2))), legend.group(1) % (env["CASE_CLUES"], env["CASE_STEPS"], env["CASE_CHOICES"]))
    assert leg_w <= inner, leg_w
    chips = sum(_w(_font(16, bold=True), g["name"]) + 8 + _w(_font(16), g["rule"]) for g in env["CASE_GRADES"]) + 2 * 22
    assert chips <= inner
    height = 2 * ppy + max(44, round(28 * line)) + 10 + 1 + 10 + round(16 * line) + 4 + round(16 * line) + 10 \
        + 5 * ch + 4 * 8 + 10 + 34
    assert height <= 720 - 2 * 24, f"Case file taller than the window minus margins: {height}px"
    assert 'text _("合上案卷")' in folio or 'textbutton _("合上案卷")' in folio
    assert 'key "K_ESCAPE" action Hide("extras_folio_modal")' in folio
    assert "viewport" not in folio, "The case file must fit one screen"
    for blk in (folio, card):
        for ln in blk.splitlines():
            if re.match(r'\s+text (row|_g)\[', ln):
                assert "substitute False" in ln, ln
        assert "Start(" not in blk and "Replay(" not in blk and "SetField(" not in blk, "Actions live in casefile_action"
        assert not re.search(r"\$ persistent\.\w+\s*=", blk)
    assert "extras_folio_dlc_card" not in scr and "folio_case_line" not in scr
    report["CaseFileCard"] = widest
    report["CaseFileLegend"] = max(leg_w, chips)
    report["CaseFileHeight"] = height


def check_entries():
    """Entries only shrink: title chip + sub-bar pill open the case file; no other production screen launches one of the ten."""
    scr, extra = _read("game/screens.rpy"), _read("game/extra.rpy")
    assert scr.count('Show("extras_folio_modal")') == 1
    prod = {p.name: p.read_text(encoding="utf-8-sig") for p in GAME_DIR.glob("*.rpy")}
    openers = {n: len(re.findall(r'Show\("extras_folio_modal"', s)) for n, s in prod.items() if 'Show("extras_folio_modal"' in s}
    # sub-bar pill + the confirm's way back + back after a bonus story; title chip + the in-game menu (look only)
    assert openers == {"extra.rpy": 3, "screens.rpy": 2}, openers
    nav = screen_source(scr, "navigation")
    in_game = nav.split("        else:\n", 1)[1]
    assert nav.count('Show("extras_folio_modal", view_only=True)') == 1 and 'view_only=True' in in_game, \
        "The in-game menu opens the case file to look only"
    assert len(re.findall(r"^\s+textbutton ", in_game, re.M)) == 9, "In-game menu: one new entry, no other change"
    assert "casefile_after_replay()" in _read("game/options.rpy")
    chap = screen_source(extra, "chapter_select")
    assert "DLC_LIST" not in chap and "dlc_" not in chap, "Bonus stories start from the case file only"
    assert "for idx, (lbl, title, need) in enumerate(CHAPTER_LIST):" in chap
    assert 'text ("案卷 %d/%d" % (folio_done_count(), folio_total_count()))' in scr
    for n, s in prod.items():
        for lbl in DLC_LABELS:
            assert not re.search(rf'(Start|Replay|Jump)\("{lbl}"', s), f"{n} launches {lbl} directly"


def check_grades(env, keys=CASE_TABS):
    """All eight cases use the one rating table: same keys, names, rules, thresholds; only the honorific differs."""
    grades = env["CASE_GRADES"]
    assert [g["key"] for g in grades] == ["gold", "silver", "bronze"] and [g["name"] for g in grades] == GRADE_NAMES
    for key in keys:
        tiers = env[CASE_MODULES[key][0] + "_RATING_TIERS"]
        for field in ("key", "name", "rule", "max_mistakes"):
            assert [t[field] for t in tiers] == [g[field] for g in grades], f"{key}: {field} differs from CASE_GRADES"
        rate = env[CASE_MODULES[key][0].lower() + "_rate"]
        for m in (0, 1, 2, 3, 8, 99):
            assert rate(m)["key"] == env["case_grade_for"](m)["key"], (key, m)


def check_runtime(env, mp, keys, snapshot, strings, secrets):
    """Bonus-story gate, masked title (side-channel proof), old-save conversion, actions, counts, read-only."""
    saved = {k: getattr(mp, k, None) for k in ("chapter_reached", "te_cleared", "truth_spoiler_confirmed", "extras_tab")}
    dlcs = env["DLC_LIST"]
    assert [d[0] for d in dlcs] == DLC_LABELS and [d[6] for d in dlcs] == [False, True]
    states = proofs = 0
    for cr in (None, 0, 1, 3, 6):
        for te in (False, True):
            for conf in (False, True):
                mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = cr, te, conf
                is_open = bool(cr and cr >= 1)
                assert env["folio_chapter_select_open"]() is is_open
                for d in dlcs:
                    states += 1
                    fv = env["folio_dlc_view"](d[0])
                    prompt = env["folio_dlc_prompt"](d[0])
                    assert fv["open"] is is_open and fv["masked"] is (d[6] and not (te or conf))
                    assert fv["title"] == (env["FOLIO_DLC_MASKED_TITLE"] if fv["masked"] else d[2])
                    assert ("建议达成真结局后再看" in prompt) is (d[6] and not te), prompt
                    assert fv["status"] == ("未读" if is_open else "序章后开放")
                    if fv["masked"]:
                        for s in list(strings(fv)) + [prompt]:
                            assert d[2] not in s and not any(kw in s for kw in secrets), s
                    assert d[3] not in str(fv) + prompt, "The case file never shows a blurb"
                    row = [r for r in env["casefile_rows"]() if r["key"] == d[0]][0]
                    act = env["casefile_action"](row, False)
                    assert (act is None) is (not is_open)
                    if is_open:  # a bonus story runs as a replay and the case file opens again after it
                        assert "Replay" in repr(act) and d[0] in repr(act) and "Start" not in repr(act)
                        yes = act[1][2]["yes_action"]
                        assert yes[1][0] == "Replay" and yes[2][0] == "Show" and yes[2][1] == ("extras_folio_modal",)
                    assert env["casefile_action"](row, False, True) is None, "In-game: look only"
    mp.chapter_reached, mp.te_cleared, mp.truth_spoiler_confirmed = 6, False, False
    before = (env["folio_dlc_view"](DLC_LABELS[1]), env["folio_dlc_prompt"](DLC_LABELS[1]))
    for filler in ("Y" * 200, "", "周可与小雪的第三只千纸鹤"):
        env["DLC_LIST"] = [d if not d[6] else (d[0], d[1], filler, filler, d[4], d[5], d[6]) for d in dlcs]
        assert (env["folio_dlc_view"](DLC_LABELS[1]), env["folio_dlc_prompt"](DLC_LABELS[1])) == before
        proofs += 1
    env["DLC_LIST"] = dlcs
    assert env["folio_dlc_view"]("bogus")["title"] == "缺卷" and not env["folio_dlc_view"]("bogus")["open"]

    # old saves: every shape the eight stores ever had, plus damaged ones
    conv = env["casefile_best_key"]
    for rec, want in (
            (None, None), ({}, None), ([], None), ({"solved": False, "inspected": ["h1"]}, None),
            ({"solved": True, "best_tier": "gold", "best_mistakes": 0}, "gold"),
            ({"solved": True, "best_tier": "silver", "best_mistakes": 2}, "silver"),
            ({"solved": True, "best_tier": "bronze", "best_mistakes": 9}, "bronze"),
            ({"solved": True, "best_mistakes": 0}, "gold"), ({"solved": True, "best_mistakes": 2}, "silver"),
            ({"solved": True, "best_mistakes": 3}, "bronze"), ({"solved": True, "best_tier": "??", "best_mistakes": 1}, "silver"),
            ({"solved": True}, "bronze"), ({"solved": True, "best_mistakes": "x"}, "bronze"),
            ({"best_tier": "gold"}, "gold"),
            # no number, a negative one, a number as text, far more than three, an old display name, unhashable rubbish
            ({"solved": True, "best_mistakes": None}, "bronze"), ({"solved": True, "best_mistakes": -1}, "bronze"),
            ({"solved": True, "best_mistakes": "0"}, "gold"), ({"solved": True, "best_mistakes": "2"}, "silver"),
            ({"solved": True, "best_mistakes": 4}, "bronze"), ({"solved": True, "best_mistakes": 5000}, "bronze"),
            ({"solved": True, "best_mistakes": 1.0}, "silver"), ({"solved": True, "best_mistakes": float("nan")}, "bronze"),
            ({"solved": True, "best_tier": "金书签", "best_mistakes": 1}, "silver"), ({"solved": True, "best_tier": "金书签"}, "bronze"),
            ({"solved": True, "best_tier": None, "best_mistakes": 0}, "gold"), ({"solved": True, "best_tier": ["gold"]}, "bronze"),
            ({"solved": 1, "best_tier": {}, "best_mistakes": []}, "bronze"), ({"best_mistakes": 0}, None), ("gold", None), (7, None)):
        assert conv(rec) == want, (rec, conv(rec), want)
        if want is not None:  # every case page and the casebook read a record exactly like the case file does
            for key in keys:
                low, store = CASE_MODULES[key][0].lower(), {c[0]: c[2] for c in env["CASEFILE_CASES"]}[key]
                setattr(mp, store, dict(rec))
                got, view = env[low + "_get_record"](), env[low + "_render_view"]()
                assert got["best_tier"] == want == view["best_tier"] and isinstance(got["replays"], int) and got["replays"] >= 0, (key, rec, got)
                assert got["best_mistakes"] is None or got["best_mistakes"] >= 0, (key, rec, got)
                assert env[low + "_best_short"]() == view["best_name"] == GRADE_NAMES[["gold", "silver", "bronze"].index(want)], (key, rec)
                if key in {n["key"] for n in env["NOTEBOOK_CASES"]}:
                    assert env["notebook_render_page"](key)["best_tier"] == want, (key, rec)
                env[low + "_record_solve"](0)  # a damaged record never blocks the next solve
                after = getattr(mp, store)
                assert after["best_tier"] == "gold" and after["best_mistakes"] == 0 and after["replays"] >= 1, (key, rec, after)
                setattr(mp, store, {})
    for value, want in ((None, None), (-3, None), ("x", None), ("", None), ([], None), (0, 0), ("7", 7), (True, 1), (3.9, 3)):
        assert env["save_int"](value) == want, (value, env["save_int"](value))
    assert env["save_int"](None, 0) == 0 and env["do_quietly"](lambda a, b=1: a + b, 2, b=3) is None
    stores = {c[0]: c[2] for c in env["CASEFILE_CASES"]}
    assert list(stores) == CASE_TABS
    for s in stores.values():
        setattr(mp, s, {})
    mp.dlc_alice_done = mp.dlc_mo_done = False
    mp.te_cleared = False
    assert env["folio_done_count"]() == 0 and env["folio_total_count"]() == 10
    assert [r["grade"] for r in env["casefile_rows"]()[2:]] == ["未结案"] * 8
    for n, key in enumerate(keys, 1):  # the real per-case recorder, then the case file's own reading of that record
        low = CASE_MODULES[key][0].lower()
        for m, want in ((8, "铜牌"), (1, "银牌"), (0, "金牌"), (5, "金牌")):
            env[low + "_record_solve"](m)
            row = [r for r in env["casefile_rows"]() if r["key"] == key][0]
            assert row["grade"] == want == env[low + "_best_short"](), (key, m, row["grade"])
        assert env["folio_done_count"]() == n
    mp.dlc_alice_done = True
    assert env["folio_done_count"]() == len(keys) + 1
    mp.dlc_mo_done = True
    assert env["folio_done_count"]() == len(keys) + 2
    assert [r["grade"] for r in env["casefile_rows"]()[:2]] == ["已读", "已读"]
    for r in env["casefile_rows"]():
        if r["kind"] == "case":
            a, b = env["casefile_action"](r, False), env["casefile_action"](r, True)
            assert len(a) == 4 and len(b) == 3, "From the extras page the case file only switches the tab"
            assert ("SetField", (env["store"], "casefile_back_tab", r["key"]), {}) in b
            assert env["casefile_action"](r, False, True) is None and env["casefile_action"](r, True, True) is None
            assert r["open"] and (GAME_DIR / r["icon"]).is_file()

    snap = snapshot(mp)
    for _i in range(3):
        for r in env["casefile_rows"]():
            env["casefile_action"](r, bool(_i % 2))
        for lbl in DLC_LABELS + ["bogus"]:
            env["folio_dlc_view"](lbl)
            env["folio_dlc_prompt"](lbl)
        env["folio_done_count"]()
        env["folio_total_count"]()
    assert snapshot(mp) == snap, "Case file helpers wrote persistent state"
    for k, v in saved.items():
        setattr(mp, k, v)
    for s in stores.values():
        setattr(mp, s, {})
    mp.dlc_alice_done = mp.dlc_mo_done = False
    return states, proofs

