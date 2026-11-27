#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Release readiness verifier (PC-G2 unified case file, PC-G3 packaging / counts, PC-COM1 licence list, PC-COM6 store copy)
for 《沉默侦探：千纸鹤的约定》. No Ren'Py SDK required: static parsing of every .rpy (tests/rpy_syntax.py) plus the mocked
init-python sandbox of verify_pc17.py. It is not a substitute for `renpy lint` and the engine test cases.

    python tests/verify_release.py
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import builtins  # noqa: E402
import re  # noqa: E402
import symtable  # noqa: E402
from collections import Counter, defaultdict  # noqa: E402
from pathlib import Path  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"
sys.path.insert(0, str(Path(__file__).resolve().parent))

import casefile_checks as cf  # noqa: E402
import rpy_syntax as rs  # noqa: E402
import verify_pc10 as pc10  # noqa: E402
import verify_pc13 as pc13  # noqa: E402
import verify_pc17 as pc17  # noqa: E402

REPORT = {}

# names the engine itself provides to scripts (only those this game uses; anything else must be defined by the game)
ENGINE_NAMES = set("""_ _p centered narrator _in_replay _history_list renpy config gui style store persistent achievement layout main_menu build preferences
audio menu adv dissolve fade move moveinleft moveinright moveoutleft moveoutright vpunch Dissolve Fade Frame Solid Tile Null Image
Transform At Character TintMatrix SaturationMatrix BrightnessMatrix Color Borders MusicRoom SideImage AnimatedValue FieldValue
FieldInputValue FilePageNameInputValue Function Hide Show ShowMenu SetField SetVariable ToggleField ToggleScreenVariable NullAction
Notify Play Start Replay EndReplay Return Rollback Skip Preference MainMenu Quit FilePage FilePagePrevious FilePageNext FileAction
FileLoadable FileScreenshot FileTime FileSaveName FileDelete SensitiveIf""".split())
ENGINE_SCREENS = {"_developer", "_layout"}
ENGINE_LABELS = {"start", "quit", "after_load", "splashscreen", "main_menu", "before_main_menu", "main_menu_screen"}
# the renpy.* functions this game may call (all exist in Ren'Py 8)
RENPY_API = set("""save_persistent sound.play show_screen notify end_replay restart_interaction variant get_screen pause image seen_image
music.play get_say_image_tag get_attributes version_only unlink_save substitute sound.is_playing music.stop music.get_playing
list_slots input has_label get_showing_tags has_screen music.register_channel music.set_volume""".split())
TEXT_TAGS = set("b i u s size color font k w p nw fast alpha plain rb rt a image space vspace cps noalt alt outlinecolor".split())


def _read(rel):
    return (ROOT / rel).read_text(encoding="utf-8-sig")


def _prod_files():
    return sorted(GAME_DIR.glob("*.rpy"))


################################################################################
# 1. Syntax of every .rpy, and the reference registry built from it
################################################################################

def check_syntax():
    res = rs.check_all()
    problems = [f"{p.name}:{ln}: {msg}" for p, (errs, _c) in res.items() for ln, msg in errs]
    assert not problems, "Ren'Py syntax problems:\n  " + "\n  ".join(problems)
    n = sum(c["n"] for _e, c in res.values())
    assert len(res) >= 35 and n > 15000, (len(res), n)
    # the checker itself must still catch the defects it was written for
    for bad, what in (
            ('label a:\n    "x"\n        "y"\n', "does not take a block"),
            ("screen a():\n    grid 3 ((len(x) + 2) // 3):\n        null\n", "positional"),
            ('label a:\n    "never closed\n', "never closed"),
            ("label a:\n    $ x = (1,\n", "not terminated"),
            ("screen a():\n    text 'x' sizze 12\n", "not a property"),
            ("label a:\n    if x\n        pass\n", "expected `:`"),
            ('label a:\n    menu:\n        "only a caption"\n', "menu without choices"),
            ("label a:\n   \"x\"\n  \"y\"\n", "indentation mismatch"),
            ("label a:\n\t\"x\"\n", "tab"),
            ("label a:\n    $ x = 1 +\n", "bad Python"),
            ("label a:\n    $ return 1\n", "bad Python"),
            ("screen a():\n    frame:\n        $ w = 3\n        xsize w\n", "after a python block"),
            ("screen a():\n    vbox:\n        frame:\n            $ w = 3\n        spacing gap\n", "after a python block"),
            ("screen a():\n    vbox:\n        for i in x:\n            spacing 3\n", "directly inside `for`"),
            ("screen a():\n    vbox:\n        showif x:\n            spacing 3\n", "directly inside `for` / `showif`"),
            ("screen a():\n    for i in x if y else z:\n        null\n", "simple expression"),
            ("screen a():\n    for image in x:\n        null\n", "keyword"),
            ("screen a():\n    textbutton 'x':\n        $ w = 3\n", "not allowed inside `textbutton`"),
            ("screen a():\n    textbutton 'x':\n        for i in y:\n            null\n", "not allowed inside `textbutton`"),
            ("screen a():\n    vbox:\n        has hbox\n", "`has` is not allowed"),
            ("screen a():\n    button:\n        null\n        has vbox\n", "before the first child"),
            ("screen a():\n    use b():\n        xalign 0.5\n", "not a property of `use`")):
        try:
            blocks = rs.group(rs.logical_lines(bad))
            ctx = {k: [] for k in rs.CTX_KEYS}
            ctx["n"] = 0
            rs.statements(blocks, ctx)
        except rs.RpyError as e:
            assert what in e.msg, (bad, e.msg)
        else:
            raise AssertionError(f"rpy_syntax accepts broken script: {bad!r}")
    REPORT["Syntax"] = f"{len(res)}files/{n}statements"
    print(f"[PASS] rpy_syntax: {len(res)} .rpy files, {n} statements, 0 problems (22 self-test defects all caught)")
    return res


def check_project_rules():
    """Init order, overwritten engine names, values returned by screen actions -- and the rules themselves still bite."""
    problems = rs.check_project()
    assert not problems, "Project rules:\n  " + "\n  ".join(f"game/{f}:{ln}: {m}" for f, ln, m in problems)
    late = "init python:\n    def helper(x):\n        return x\n"
    for sources, want in (
            ([("a.rpy", "init python:\n    helper(1)\n"), ("b.rpy", late)], 1),                   # needed before it exists
            ([("a.rpy", "init 1 python:\n    helper(1)\n"), ("b.rpy", late)], 0),                 # later priority: fine
            ([("b.rpy", late), ("c.rpy", "init python:\n    helper(1)\n")], 0),                   # later file: fine
            ([("a.rpy", "init python:\n    def f():\n        return helper(1)\n"), ("b.rpy", late)], 0),   # only when called
            ([("a.rpy", "init python:\n    def f():\n        return helper(1)\n    f()\n"), ("b.rpy", late)], 1),
            ([("a.rpy", "init python:\n    if \"helper\" in globals():\n        helper(1)\n"), ("b.rpy", late)], 0),
            ([("a.rpy", "define x = y + 1\n"), ("b.rpy", "define y = 2\n")], 1),
            ([("a.rpy", "style s:\n    font gui.zz_font\n"), ("b.rpy", "define gui.zz_font = \"f\"\n")], 1)):
        got = rs.check_init_order(sources)
        assert len(got) == want, (sources, got)
    # save compatibility: every label call has its own `from _call_...`; drop one from a real file and the rule reports it
    real = (GAME_DIR / "chapter1.rpy").read_text(encoding="utf-8")
    assert real.count(" from _call_reason_wrong\n") == 1
    for sources, want in (
            ([("chapter1.rpy", real.replace(" from _call_reason_wrong\n", "\n"))], 1),        # missing
            ([("a.rpy", "label a:\n    call b from _call_b\n    call b from _call_b\n")], 1),  # used twice
            ([("a.rpy", "label _call_b:\n    call b from _call_b\n")], 1),                   # also a label
            ([("a.rpy", "label a:\n    call b from back_b\n")], 1),                          # unprefixed
            ([("a.rpy", "label a:\n    call screen s from _call_s\n")], 1),                  # call screen takes none
            ([("a.rpy", "label a:\n    call b(\n        1) from _call_b\n    call screen s\n")], 0)):
        got = rs.call_from_problems(sources)
        assert len(got) == want, (sources[0][0], got)
    assert rs.strip_call_from("label a:\r\n    call b(\r\n        1) from _call_b\r\n") == "label a:\r\n    call b(\r\n        1)\r\n"
    assert (GAME_DIR / "club_mailbox.rpy").read_text(encoding="utf-8").count("\ninit 1 python:\n") == 1
    quiet = sum(len(re.findall(r"Function\(do_quietly, \w+_\w+", p.read_text(encoding="utf-8-sig"))) for p in _prod_files())
    assert quiet >= 17, quiet
    # text the player types, and say text that is already substituted, never goes through substitution / tags again
    scr, tea, extra = _read("game/screens.rpy"), _read("game/tea_party_lexicon.rpy"), _read("game/extra.rpy")
    card = cf.screen_source(scr, "centered_say")
    shown = [ln for ln in card.splitlines() if re.match(r"\s+text (?:parts\[\d\]|extra\b)", ln)]
    assert len(shown) == 9 and all("substitute False" in ln for ln in shown), shown
    parts = re.search(r'_re\.sub\(r"([^"]+)", "", p\)', scr).group(1)
    for tag in ("{size=50}", "{size=+6}", "{size=-4}", "{size=*1.5}", "{/size}"):
        assert re.sub(parts, "", tag + "x") == "x", f"_card_parts keeps {tag}"
    assert re.sub(parts, "", "{color=#fff}x{/color}") == "{color=#fff}x{/color}"
    assert 'exclude "[]{}"' in cf.screen_source(tea, "lexicon_search_modal")
    assert 'raw_line.replace("{", "{{")' in extra and 'text (player_name if ch_key == "mc" else ch_name) style "bond_name" size 20 color ' \
        '"#f2e6ff" substitute False' in _read("game/gameplay.rpy")
    # every replay / direct start carries the player's own name
    for p in _prod_files():
        for ln in p.read_text(encoding="utf-8-sig").splitlines():
            if re.search(r"\bReplay\([a-zA-Z]", ln) and not ln.lstrip().startswith("#"):
                assert 'scope={"player_name": persistent.last_player_name or "陈默"}' in ln, f"{p.name}: {ln.strip()}"
    assert "store.player_name = persistent.last_player_name" in extra
    n = cf.check_story_frozen()
    print(f"[PASS] project rules: init order of {len(_prod_files())} files, {quiet} value-returning actions wrapped, typed text escaped, "
          f"stories of {n} files unchanged")
    REPORT["Rules"] = f"quiet{quiet}/frozen{n}"


# assertions per verifier when PC-G2 / PC-G3 were reviewed: a later milestone may add to them, never shrink them
MIN_ASSERTS = {
    "casefile_checks.py": 78, "verify_glyphs.py": 13, "verify_pc10.py": 229, "verify_pc11.py": 264,
    "verify_pc12.py": 309, "verify_pc13.py": 311, "verify_pc14.py": 242, "verify_pc15.py": 311, "verify_pc16.py": 328,
    "verify_pc17.py": 318, "verify_pc4.py": 51, "verify_pc5.py": 76, "verify_pc6.py": 101, "verify_pc7.py": 127,
    "verify_pc8.py": 143, "verify_pc9.py": 182, "verify_release.py": 88,
}


def check_verifiers():
    got = {p.name: sum(isinstance(x, ast.Assert) for x in ast.walk(ast.parse(p.read_text(encoding="utf-8"))))
           for p in sorted(Path(__file__).resolve().parent.glob("*.py"))}
    low = {n: (got.get(n, 0), m) for n, m in MIN_ASSERTS.items() if got.get(n, 0) < m}
    assert not low, f"Assertions were removed from the verifiers: {low}"
    for p in sorted(Path(__file__).resolve().parent.glob("verify_*.py")):
        for x in ast.walk(ast.parse(p.read_text(encoding="utf-8"))):
            if isinstance(x, ast.Assert) and isinstance(x.test, ast.BoolOp) and isinstance(x.test.op, ast.Or):
                assert not any(isinstance(v, ast.Constant) and v.value for v in x.test.values), f"{p.name}:{x.lineno}: an assertion that cannot fail"
    print(f"[PASS] verifiers: {sum(got.values())} assertions in {len(got)} files, none below its recorded count, none that cannot fail")


def check_references(res):
    labels, screens, defs = {}, {}, set()
    images, transforms = set(), {}
    for p, (_e, c) in res.items():
        if p.parent.name == "tests":
            continue
        for ln, n in c["label"]:
            assert n not in labels, f"label {n} defined twice: {labels.get(n)} and {p.name}:{ln}"
            labels[n] = f"{p.name}:{ln}"
        for ln, n, params in c["screen"]:
            assert n not in screens, f"screen {n} defined twice"
            screens[n] = (f"{p.name}:{ln}", params)
        for _ln, comps in c["image_def"]:
            images.add(tuple(comps))
        for k in ("define", "default"):
            defs |= {n for _ln, n in c[k]}
        for ln, n in c["transform"]:
            transforms[n] = f"{p.name}:{ln}"
    missing = []
    n_jump = n_scr = n_img = n_aud = 0
    # renpy.image() loops of definitions.rpy: every character x expression
    dsrc = _read("game/definitions.rpy")
    keys = ast.literal_eval(re.search(r"_CHARA_KEYS = (\[.*?\])", dsrc, re.S).group(1))
    exprs = ast.literal_eval(re.search(r"_CHARA_EXPRS = (\[.*?\])", dsrc, re.S).group(1))
    for k in keys:
        images.add(("side", k))
        for e in exprs:
            images.add((k, e))
            images.add(("side", k, e))
            for f in (f"chara_{k}_{e}.png", f"side_{k}_{e}.png"):
                assert (GAME_DIR / "images" / f).is_file(), f"Missing images/{f}"
    tags = {i[0] for i in images}
    audio_names = {n.split(".", 1)[1] for n in defs if n.startswith("audio.")}
    for p, (_e, c) in res.items():
        if p.parent.name == "tests":
            continue
        src = p.read_text(encoding="utf-8-sig")
        for ln, n in c["jump"]:
            n_jump += 1
            if n not in labels:
                missing.append(f"{p.name}:{ln} jump / call -> label {n}")
        for m in re.finditer(r'\b(?:Start|Replay|Jump|Call)\(\s*"(\w+)"', src):
            n_jump += 1
            if m.group(1) not in labels:
                missing.append(f"{p.name} Start/Replay -> label {m.group(1)}")
        for ln, n in c["screen_ref"] + c["use"]:
            n_scr += 1
            if n not in screens and n not in ENGINE_SCREENS:
                missing.append(f"{p.name}:{ln} screen {n}")
        for m in re.finditer(r'\b(?:Show|Hide|ShowMenu|ToggleScreen)\(\s*"(\w+)"|renpy\.(?:show_screen|get_screen|hide_screen|has_screen)\(\s*"(\w+)"', src):
            n_scr += 1
            n = m.group(1) or m.group(2)
            if n not in screens:
                missing.append(f"{p.name} screen {n}")
        for ln, kind, comps in c["image_ref"]:
            n_img += 1
            if comps[0] == "layer":  # `show layer master at ...`
                continue
            if kind == "hide":
                if comps and comps[0] not in tags:
                    missing.append(f"{p.name}:{ln} hide {' '.join(comps)}")
                continue
            if tuple(comps) not in images and comps not in (["black"], ["white"]):
                missing.append(f"{p.name}:{ln} {kind} {' '.join(comps)} (no such image)")
        for ln, e in c["audio_ref"]:
            n_aud += 1
            if re.fullmatch(r"[a-z_]\w*", e):
                if e not in audio_names:
                    missing.append(f"{p.name}:{ln} audio name {e}")
        for m in re.finditer(r'"((?:audio|images|gui|fonts)/[^"%<>\[\]{}]+\.\w{3,4})"', src):
            n_img += 1
            if not (GAME_DIR / m.group(1)).is_file():
                missing.append(f"{p.name} file {m.group(1)}")
    assert not missing, "Unresolved references:\n  " + "\n  ".join(sorted(set(missing)))
    # ("black" / "white" without a tag are engine image names)
    for ln_name in ("_LABEL_TO_CHAPTER", "_LABEL_TO_ENDING"):
        blk = re.search(rf"{ln_name} = \{{(.*?)\n    \}}", _read("game/extra.rpy"), re.S).group(1)
        for lbl in re.findall(r'^\s+"(\w+)":', blk, re.M):
            assert lbl in labels, f"{ln_name} names a missing label {lbl}"
    for lbl, *_rest in pc17._sandbox_env()[0]["CHAPTER_LIST"]:
        assert lbl in labels, lbl
    REPORT["Refs"] = f"{len(labels)}labels/{len(screens)}screens/{n_jump}jumps/{n_img}images"
    print(f"[PASS] references: {len(labels)} labels (no duplicates), {len(screens)} screens, {n_jump} jump/call/Start/Replay targets, "
          f"{n_scr} screen references, {n_img} image / file references, {n_aud} audio references")
    return labels, screens, defs


################################################################################
# 2. Undefined names, call signatures, text interpolation & tags
################################################################################

def _global_refs(code):
    refs, asg, params = set(), set(), set()

    def walk(t):
        for sym in t.get_symbols():
            n = sym.get_name()
            if t.get_type() == "module":
                if sym.is_assigned() or sym.is_imported() or sym.is_namespace():
                    asg.add(n)
                if sym.is_referenced():
                    refs.add(n)
            elif sym.is_global():
                if sym.is_referenced():
                    refs.add(n)
                if sym.is_assigned():
                    asg.add(n)
        for ch in t.get_children():
            if ch.get_name() == "_params_":
                params.update(ch.get_parameters())
            walk(ch)

    walk(symtable.symtable(code, "x", "exec"))
    return refs - {"_args_"}, asg | params


def check_names():
    """Every name used by Python code, conditions, screens, actions and ATL is defined by the game or is an engine name."""
    known = set(dir(builtins)) | ENGINE_NAMES
    owned = defaultdict(set)
    items, says, audio = [], [], set()
    for p in _prod_files():
        rs.PY_FRAGMENTS.clear()
        _errs, c = rs.check_file(p)
        audio_lines = {ln for ln, _e in c["audio_ref"]}
        for k in ("define", "default", "transform"):
            for _ln, n in c[k]:
                known.add(n.split(".")[0])
                if n.startswith("audio."):
                    audio.add(n.split(".", 1)[1])
        for owner, ln, code in rs.PY_FRAGMENTS:
            try:
                refs, asg = _global_refs(code)
            except SyntaxError:
                continue
            if owner:
                owned[(p.name, owner)] |= asg
            else:
                known |= asg
            items.append((p.name, owner, ln, refs, (not owner) and ln in audio_lines))
        says += [(p.name, ln, w) for ln, w in c["say"]]
    unknown = defaultdict(list)
    for fn, owner, ln, refs, is_audio in items:
        for n in refs - known - owned[(fn, owner)]:
            if is_audio and n in audio:
                continue  # `play music x` / `play sound x` look names up in the audio namespace; Python code does not
            unknown[n].append(f"{fn}:{ln}")
    assert not unknown, "Undefined names (NameError at run time):\n  " + "\n  ".join(f"{n}: {w[:4]}" for n, w in sorted(unknown.items()))
    for fn, ln, who in says:
        assert who.split(".")[0] in known, f"{fn}:{ln} unknown speaker {who}"
    api = Counter()
    for p in _prod_files():
        for m in re.finditer(r"(?<![\w.])renpy\.([a-z_]+(?:\.[a-z_]+)?)", p.read_text(encoding="utf-8-sig")):
            name = m.group(1)
            if name in ("music", "sound", "store", "exports"):
                continue
            api[name] += 1
    bad = {n for n in api if n not in RENPY_API and not n.startswith("store.")}
    assert not bad, f"renpy.* functions not on the reviewed list: {bad}"
    # the store-level aliases `$ play_bgm(bgm_x)` relies on
    asrc = _read("game/audio.rpy")
    used = set()
    for p in _prod_files():
        used |= set(re.findall(r"^\s*\$ play_bgm\((bgm_\w+)", p.read_text(encoding="utf-8-sig"), re.M))
    for n in used:
        assert re.search(rf"^define {n}\s*= audio\.{n}$", asrc, re.M), f"play_bgm({n}) has no store-level alias"
    print(f"[PASS] names: {len(items)} Python fragments and {len(says)} speakers use only defined / engine names; "
          f"{len(api)} renpy.* functions reviewed; {len(used)} play_bgm tracks resolvable from Python")


def check_screen_closures():
    """Screens run their Python with the screen scope as *locals*: a generator expression / lambda (and, before Python 3.12, any
    comprehension) cannot see screen variables in its body, only in its first iterable."""
    bad, n = [], 0
    for p in _prod_files():
        rs.PY_FRAGMENTS.clear()
        rs.check_file(p)
        frags = [(o, ln, ast.parse(code)) for o, ln, code in rs.PY_FRAGMENTS if o.startswith("screen:")]
        scope = defaultdict(set)
        for o, _ln, t in frags:
            for x in ast.walk(t):
                if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store):
                    scope[o].add(x.id)
                if isinstance(x, ast.FunctionDef) and x.name == "_params_":
                    scope[o] |= {a.arg for a in x.args.args}
        for o, ln, t in frags:
            for x in ast.walk(t):
                inner, own = set(), set()
                if isinstance(x, (ast.GeneratorExp, ast.ListComp, ast.SetComp, ast.DictComp)):
                    body = [x.elt] if hasattr(x, "elt") else [x.key, x.value]
                    for i, g in enumerate(x.generators):
                        own |= {y.id for y in ast.walk(g.target) if isinstance(y, ast.Name)}
                        body += g.ifs + ([g.iter] if i else [])
                elif isinstance(x, ast.Lambda):
                    body, own = [x.body], {a.arg for a in x.args.args}
                else:
                    continue
                n += 1
                for b in body:
                    inner |= {y.id for y in ast.walk(b) if isinstance(y, ast.Name)}
                if (inner - own) & scope[o]:
                    bad.append(f"{p.name}:{ln} {o}: {sorted((inner - own) & scope[o])}")
    assert not bad, "Screen variables used inside a nested Python scope:\n  " + "\n  ".join(bad)
    print(f"[PASS] screen closures: {n} comprehensions / lambdas in screens, none reads a screen variable from its inner scope")


def _signature(params):
    """(min positional, max positional, names) of a parameter list text like `(a, b=1)`."""
    fn = ast.parse(f"def f{params or '()'}: pass").body[0]
    a = fn.args
    names = [x.arg for x in a.posonlyargs + a.args]
    return len(names) - len(a.defaults), (10 ** 6 if a.vararg else len(names)), names + [x.arg for x in a.kwonlyargs], bool(a.kwarg)


def _call_ok(call, sig):
    lo, hi, names, kw = sig
    if any(isinstance(x, ast.Starred) for x in call.args) or any(k.arg is None for k in call.keywords):
        return True
    n = len(call.args)
    given = {k.arg for k in call.keywords}
    if n > hi or (not kw and not given <= set(names)):
        return False
    return len(set(names[:lo]) - set(names[:n]) - given) == 0


def check_calls(res):
    """Calls of the game's own functions, labels and screens match their parameter lists."""
    funcs, screens, labels = {}, {}, {}
    dup = set()
    for p in _prod_files():
        for _ln, code, _i in pc17.extract_python_blocks(p):
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            for node in tree.body:
                if isinstance(node, ast.FunctionDef):
                    if node.name in funcs:
                        dup.add(node.name)
                    a = node.args
                    names = [x.arg for x in a.posonlyargs + a.args]
                    funcs[node.name] = (len(names) - len(a.defaults), 10 ** 6 if a.vararg else len(names),
                                        names + [x.arg for x in a.kwonlyargs], bool(a.kwarg))
        src = p.read_text(encoding="utf-8-sig")
        for m in re.finditer(r"^label (\w+)(\(.*?\))?(?: hide)?:", src, re.M):
            labels[m.group(1)] = _signature(m.group(2))
    for p, (_e, c) in res.items():
        for _ln, n, params in c["screen"]:
            screens[n] = _signature(params)
    bad, n_calls = [], 0
    for p in _prod_files():
        src = p.read_text(encoding="utf-8-sig")
        rs.PY_FRAGMENTS.clear()
        rs.check_file(p)
        for owner, ln, code in rs.PY_FRAGMENTS:
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call):
                    continue
                name = node.func.id if isinstance(node.func, ast.Name) else None
                if name in funcs and name not in dup:
                    n_calls += 1
                    if not _call_ok(node, funcs[name]):
                        bad.append(f"{p.name}:{ln} {name}() called with the wrong arguments")
                attr = node.func.attr if isinstance(node.func, ast.Attribute) else None
                if (name in ("Show", "ShowMenu") or attr == "show_screen") and node.args and isinstance(node.args[0], ast.Constant):
                    scr = node.args[0].value
                    if scr in screens:
                        n_calls += 1
                        rest = node.args[2:] if name == "Show" else node.args[1:]  # Show(screen, transition, *args)
                        kws = [k for k in node.keywords if k.arg is None or not k.arg.startswith("_")]
                        if not _call_ok(ast.Call(func=node.func, args=rest, keywords=kws), screens[scr]):
                            bad.append(f"{p.name}:{ln} screen {scr} shown with the wrong arguments")
        for ln, text in rs.logical_lines(src):
            lx = rs.Lex(ln, text.strip())
            kind, nm = None, None
            if lx.match(r"(?:call|show) screen "):
                kind, nm = "screen", lx.word()
            elif lx.match(r"use (?!expression)"):
                kind, nm = "screen", lx.word()
            elif lx.match(r"call (?!expression|screen)"):
                kind, nm = "label", lx.word()
            table = screens if kind == "screen" else labels
            if not kind or nm not in table:
                continue
            args = lx.parens() or "()"
            n_calls += 1
            if not _call_ok(ast.parse(f"f{args}", mode="eval").body, table[nm]):
                bad.append(f"{p.name}:{ln} {kind} {nm}{args[:60]} does not match its parameters")
    assert not bad, "Calls that do not match their definition:\n  " + "\n  ".join(sorted(set(bad)))
    print(f"[PASS] call signatures: {n_calls} calls of {len(funcs)} functions, {len(screens)} screens and {len(labels)} labels")


def check_text():
    """Say / menu strings: interpolated names exist, text tags are known and balanced."""
    known = set(dir(builtins)) | ENGINE_NAMES
    n_str = n_int = n_tag = 0
    bad = []
    store_names = set()
    for p in _prod_files():
        src = p.read_text(encoding="utf-8-sig")
        store_names |= set(re.findall(r"^\s*\$ (\w+)\s*(?:=|\+=)", src, re.M))
        store_names |= set(re.findall(r"^(?:define|default)\s+(\w+)", src, re.M))
        store_names |= {n for _l, code, _i in pc17.extract_python_blocks(p) for n in re.findall(r"^    ?(?:def )?(\w+)", code, re.M)}
        store_names |= set(re.findall(r"^    def (\w+)", src, re.M))
    for p in _prod_files():
        src = p.read_text(encoding="utf-8-sig")
        scr_spans = [(m.start(), m.end()) for m in re.finditer(r"^screen \w+.*?(?=^\S)", src + "\nend", re.M | re.S)]
        offs = 0
        for ln, line in enumerate(src.splitlines(True), 1):
            start = offs
            offs += len(line)
            s = line.strip()
            if any(a <= start < b for a, b in scr_spans) or s.startswith("#"):
                continue
            m = re.match(r'(?:(?!image|define|default|voice|play|queue|\$|return|style|text|add)[a-z_]\w*\s+(?:@?\s*[a-z]+\s+)*)?"((?:[^"\\]|\\.)*)"\s*(?::|\(|if\b.*:|with\b.*|id\b.*)?$', s)
            if not m or not re.search(r"[一-鿿]", m.group(1)):
                continue
            txt = m.group(1)
            n_str += 1
            for im in re.finditer(r"\[\[|\[([^\[\]]+)\]", txt):
                if not im.group(1):
                    continue
                n_int += 1
                root = re.match(r"[A-Za-z_]\w*", im.group(1))
                if not root or (root.group(0) not in store_names and root.group(0) not in known):
                    bad.append(f"{p.name}:{ln} [{im.group(1)}]")
            stack = []
            for tm in re.finditer(r"\{\{|\{(/?)([a-z]+)(?:=[^{}]*)?\}|\{", txt):
                if tm.group(0) == "{{":
                    continue
                n_tag += 1
                if tm.group(2) is None or tm.group(2) not in TEXT_TAGS:
                    bad.append(f"{p.name}:{ln} text tag {txt[tm.start():tm.start() + 16]}")
                elif tm.group(1):
                    if not stack or stack.pop() != tm.group(2):
                        bad.append(f"{p.name}:{ln} unbalanced {{/{tm.group(2)}}}")
                elif tm.group(2) not in ("w", "p", "nw", "fast", "image", "space", "vspace"):
                    stack.append(tm.group(2))
            if stack:
                bad.append(f"{p.name}:{ln} unclosed {stack}")
    assert not bad, "Text problems:\n  " + "\n  ".join(bad[:20])
    assert n_str > 9000, n_str
    print(f"[PASS] text: {n_str} dialogue / menu strings, {n_int} interpolations resolve, {n_tag} text tags known and balanced")


################################################################################
# 3. Persistent fields
################################################################################

def check_persistent():
    used, defaults = defaultdict(set), {}
    for p in _prod_files():
        src = "\n".join(ln for ln in p.read_text(encoding="utf-8-sig").splitlines() if not ln.lstrip().startswith("#"))
        for m in re.finditer(r"^default persistent\.(\w+)\s*=\s*(.+?)(?:\s+#.*)?$", src, re.M):
            assert m.group(1) not in defaults, f"default persistent.{m.group(1)} twice"
            defaults[m.group(1)] = m.group(2)
        for m in re.finditer(r'(?<!default )\bpersistent\.(\w+)|\b(?:SetField|ToggleField|FieldValue|FieldInputValue|getattr|setattr)\(\s*persistent\s*,\s*"(\w+)"', src):
            used[m.group(1) or m.group(2)].add(p.name)
    env, _r, _a, _mp = pc17._sandbox_env()
    for f in [e[0] for e in env["ENDING_LIST"]] + [d[5] for d in env["DLC_LIST"]] + [c[2] for c in env["CASEFILE_CASES"]] \
            + [n["store"] for n in env["NOTEBOOK_CASES"]]:
        used[f].add("data tables")
    missing = {k: sorted(v) for k, v in used.items() if k not in defaults and not k.startswith("_")}
    assert not missing, f"persistent fields without a default: {missing}"
    # the one-key reset clears every progress field
    extra = _read("game/extra.rpy")
    blk = extra[extra.index("    def reset_all_progress"):extra.index("screen extras():")]
    studio = extra[extra.index("def reset_studio_defaults"):extra.index("def reset_studio_defaults") + 2500]
    special = {e[0] for e in env["ENDING_LIST"]} | {d[5] for d in env["DLC_LIST"]} | {"extras_tab"}
    assert "for d in DLC_LIST:" in blk and "for end_field, _t, _s, _cg, _lbl in ENDING_LIST:" in blk
    left = [k for k in defaults if f"persistent.{k} " not in blk + studio and k not in special]
    assert not left, f"reset_all_progress does not reset: {left}"
    print(f"[PASS] persistent: {len(used)} fields used, {len(defaults)} defaults, every field has a default and the one-key reset covers them")


################################################################################
# 4. Unified case file (PC-G2)
################################################################################

def check_casefile():
    report = {}
    env, _mock, _ach, mp = pc17._sandbox_env()
    for k, v in {"chapter_reached": 0, "te_cleared": False, "truth_spoiler_confirmed": False, "dlc_alice_done": False,
                 "dlc_mo_done": False}.items():
        setattr(mp, k, v)
    cf.check_subbar(pc10.measure_salon_subbar(), pc17.SALON_KEYS, _read("game/extra.rpy"), report)
    cf.check_pill_texts(env)
    cf.check_layout(env, report)
    cf.check_entries()
    cf.check_grades(env)
    states, proofs = cf.check_runtime(env, mp, cf.CASE_TABS, pc13._persistent_snapshot, pc13._strings, pc17.SECRET_KEYWORDS)
    # one difficulty: 6 clues, 4 steps, 3 choices per step with exactly one correct, in all eight cases
    assert (env["CASE_CLUES"], env["CASE_STEPS"], env["CASE_CHOICES"]) == (6, 4, 3)
    for key in cf.CASE_TABS:
        prefix, module, spots, links, step_re = cf.CASE_MODULES[key]
        src = _read(f"game/{module}")
        assert len(env[spots]) == env["CASE_CLUES"], key
        assert len(env[links]) == env["CASE_STEPS"], key
        steps = re.findall(step_re, src)
        assert len(steps) == env["CASE_STEPS"], (key, steps)
        for s in steps:
            blk = src.split(s, 1)[1]
            blk = blk.split("    menu:\n", 1)[1]
            blk = re.split(r"^(?:    \S|label )", blk, maxsplit=1, flags=re.M)[0]
            choices = re.findall(r'^        "[^"]+":$', blk, re.M)
            assert len(choices) == env["CASE_CHOICES"], (key, s, choices)
            assert blk.count("play sound se_correct") == 1 and blk.count("play sound se_wrong") == env["CASE_CHOICES"] - 1, (key, s)
        assert "失误只计入本案评级，不影响主线" in src, f"{key}: the shared rating sentence is missing"
        assert "零失误可获金牌" in src
    # the old per-case rating names are gone from every displayed string (keepsake copy and achievement titles may stay)
    old = re.compile(r"(金|银|铜)(书签|票根|画框|秒表|灯笼|浪花|烤盘)|(一|二|三)等星")
    for key in cf.CASE_TABS:
        for ln in _read(f"game/{cf.CASE_MODULES[key][1]}").splitlines():
            if old.search(ln) and not ln.lstrip().startswith("#"):
                assert any(t in ln for t in ("金书签再访", "mo_caption", "alice_caption", "的影子侦探", "的观星侦探", "的泳池侦探", "的烘焙侦探")), ln.strip()[:100]
    assert env["CASEBOOK_PC13_KEYS"] == tuple(n["key"] for n in env["NOTEBOOK_CASES"][:4]), "「前四页」 in ach_case_notebook's description"
    # a save from before PC-G2: remembered group / tab keys still work
    for grp in ("salon", "bookstreet", "starlit", "closedlib", "keepsake", "bogus", None):
        mp.extras_salon_group = grp
        assert env["salon_open_group"]("endings") in {g[0] for g in env["EXTRAS_SALON_GROUPS"]}
    REPORT.update(report)
    print(f"[PASS] case file: 10 cards on one screen ({report['CaseFileHeight']}px <= 672), min text 16px, one difficulty (6/4/3) and one "
          f"rating table in 8 cases, 30 old-save shapes converted, {states} bonus-story gate states, {proofs} side-channel proofs, "
          f"entries: 1 title chip + 1 sub-bar pill")


################################################################################
# 5. Counts: UI copy, README, licence list, store copy
################################################################################

CN = {1: "一", 2: "两", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十", 12: "十二"}


def check_counts():
    env = pc17._sandbox_env()[0]
    n = {
        "ach": len(env["ACH_LIST"]), "cg": len(env["CG_LIST"]), "end": len(env["ENDING_LIST"]), "bgm": len(env["BGM_LIST"]),
        "chap": len(env["CHAPTER_LIST"]), "dlc": len(env["DLC_LIST"]), "case": len(env["CASEFILE_CASES"]),
        "tea": len(env["TEA_PARTY_SESSIONS"]), "tome": len(env["RESTORATION_TOMES"]), "letter": len(env["SEASONAL_LETTERS"]),
        "crane": len(env["ORIGAMI_CRANE_PATTERNS"]), "radio": len(env["RADIO_BROADCASTS"]), "star": len(env["PLANETARIUM_CIPHERS"]),
        "badge": len(env["BADGE_DEFS"]), "photo": len(env["ALBUM_PHOTOS"]), "capsule": len(env["CAPSULE_ITEMS"]),
        "wall": len(env["WALL_CARDS"]), "mail": len(env["MAILBOX_CASE_DEFS"]),
    }
    n["extras"] = n["end"] + n["cg"] + n["ach"]
    img = [p.name for p in (GAME_DIR / "images").glob("*.png")]
    files = {
        "chara": sum(x.startswith("chara_") for x in img), "side": sum(x.startswith("side_") for x in img),
        "bg": sum(x.startswith("bg_") for x in img), "cg": sum(x.startswith("cg_") for x in img),
        "ui": len(list((GAME_DIR / "images/ui").glob("*.png"))), "gui": len(list((GAME_DIR / "gui").glob("*.png"))),
        "sfx": len(list((GAME_DIR / "audio").glob("sfx_*.ogg"))), "voice": len(list((GAME_DIR / "audio/voice").glob("*.ogg"))),
        "music": len([p for p in (GAME_DIR / "audio").glob("*.ogg") if not p.name.startswith("sfx_")]),
        "font": len(list((GAME_DIR / "fonts").glob("*.otf"))),
    }
    assert files["cg"] == n["cg"] and files["music"] == n["bgm"], (files, n)
    voice_used = set()
    for p in _prod_files():
        voice_used |= set(re.findall(r'voice "audio/voice/(\w+\.ogg)"', p.read_text(encoding="utf-8-sig")))
    assert len(voice_used) == files["voice"], f"{files['voice']} voice files, {len(voice_used)} used"
    voices = Counter(re.sub(r"_\d+\.ogg$", "", x) for x in voice_used)

    # "%d/N" and "%d/N" counters written into the UI: the denominator equals the data behind the counter
    denominators = {
        "mailbox_solved_count()": n["mail"], "tea_party_cleared_count()": n["tea"], "restoration_completed_count()": n["tome"],
        "letterbox_seal_count()": n["letter"], "origami_inspected_count()": n["crane"], "radio_solved_count()": n["radio"],
        "planetarium_solved_count()": n["star"], "badge_stamped_count()": n["badge"],
    }
    scr = _read("game/screens.rpy")
    checked = 0
    for fn, want in denominators.items():
        m = re.search(rf'text \("[^"]*%d/(\d+)" % {re.escape(fn)}\)', scr)
        assert m and int(m.group(1)) == want, f"main-menu chip of {fn}: {m and m.group(1)} != {want}"
        checked += 1
    per_file = {
        "bookstreet_seasons.rpy": {"藏书票": n["tome"], "无瑕拓印": n["tome"], "火漆印": n["letter"], "已阅信笺": n["letter"],
                                   "无瑕金印": n["letter"], "四季火漆进度：": n["letter"],
                                   "骑缝合璧": 3, "待修复": 3, "缺叶（": 3},
        "radio_origami.rpy": {"已解来信": n["radio"], "金牌电波": n["radio"], "当前金牌主持": n["radio"], "电台归档进度：": n["radio"],
                              "已折检": n["crane"]},
        "stargazer_badges.rpy": {"已解星图": n["star"], "一次破译": n["star"], "星象馆进度：": n["star"], "已拓印": n["badge"]},
        "tea_party_lexicon.rpy": {"已品茗": n["tea"]},
    }
    for fn, table in per_file.items():
        src = _read(f"game/{fn}")
        for m in re.finditer(r"([一-鿿：（]+) ?%d/(\d+)", src):
            key = [k for k in table if m.group(1).endswith(k.rstrip()) or k in m.group(1)]
            assert key, f"{fn}: counter `{m.group(0)}` is not on the reviewed list"
            assert int(m.group(2)) == table[key[0]], f"{fn}: {m.group(0)} but the data says {table[key[0]]}"
            checked += 1
    for key in cf.CASE_TABS:
        src = _read(f"game/{cf.CASE_MODULES[key][1]}")
        for m in re.finditer(r"已(?:勘查|读) %d/(\d+)", src):
            assert int(m.group(1)) == env["CASE_CLUES"], (key, m.group(0))
            checked += 1
    for t in env["RESTORATION_TOMES"]:
        assert len(t["slots"]) == 3 and [s["slot_index"] for s in t["slots"]] == [0, 1, 2], t["id"]

    # numbers spelled out in copy
    allsrc = "\n".join(p.read_text(encoding="utf-8-sig") for p in _prod_files())
    for pat, want in (
            (r"破解委托信箱里的全部(\S)桩", n["mail"]), (r"完成侦探社午后茶话会的全部(\S)场", n["tea"]),
            (r"集齐四季纪念日手写信笺匣的全部(\S)枚", n["letter"]), (r"推理来信电台的全部(\S)封", n["radio"]),
            (r"在铜章手账册中拓印集齐(\S)枚", n["badge"]), (r"集齐(\S)枚解锁成就「铜章手账收藏家」", n["badge"]),
            (r"冲洗集齐(\S+?)张合照", n["photo"]), (r"集齐(\S+?)张解锁成就「侦探社合照收藏家」", n["photo"]),
            (r"集齐全部(\S)个结局", n["end"]), (r"钉满(\S+?)张解锁成就", n["wall"]), (r"破解钟楼星象馆的全部(.)笺", n["star"])):
        found = re.findall(pat, allsrc)
        assert found and all(f == CN[want] for f in found), (pat, found, want)
        checked += 1
    for m in re.finditer(r"序章至终章共(\S)段剧情、(\S)种结局", _read("game/options.rpy") + scr):
        assert m.group(1) == CN[n["chap"]] and m.group(2) == CN[n["end"]], m.group(0)
        checked += 1
    about = re.findall(r"另有(\S)篇番外与(\S)桩可重玩短案", _read("game/options.rpy") + scr)
    assert len(about) == 2 and all(a == CN[n["dlc"]] and b == CN[n["case"]] for a, b in about), about
    ach_src = _read("game/achievements.rpy")
    assert f"2×{n['ach'] // 2} = {n['ach']}" in ach_src and f"2×{n['ach'] // 2} 共 {n['ach']} 枚" in ach_src

    # main-line length claimed in the About page
    cjk = 0
    for rel in ["script", "interlude"] + [f"chapter{i}" for i in range(1, 7)]:
        for _ln, t in rs.logical_lines(_read(f"game/{rel}.rpy")):
            m = re.match(r'(?:[a-z_]\w*(?: [a-z@]+)* )?"(.*)":?$', t.strip(), re.S)
            if m:
                cjk += len(re.findall(r"[一-鿿]", m.group(1)))
    assert 150000 <= cjk <= 162000, f"main line is {cjk} characters, the copy says about 15.5 万"

    # README / licence list / store copy
    readme, lic, store = _read("README_如何运行.md"), _read("ASSETS_LICENSE.md"), _read("docs/store/steam_store.md")
    base_ach = len(ast.literal_eval("[" + re.search(r"ACH_LIST = \[(.*?)\n    \]", ach_src, re.S).group(1) + "]"))
    need_readme = [
        f"(n/{n['extras']})", f"{n['extras']} = {n['end']} 结局 + {n['cg']} CG + {n['ach']} 成就", f"成就 {n['ach']} 项", f"里 {base_ach} 项",
        f"{n['bgm']} 首 BGM", f"{n['dlc']} 篇番外与 {n['case']} 桩可重玩短案", "6 条线索、4 步推理、每步 3 选 1",
        f"立绘 {files['chara']} 张", f"侧边头像 {files['side']} 张", f"背景 {files['bg']} 张", f"剧情 CG {files['cg']} 张",
        f"玩法图标 {files['ui']} 张", f"GUI 纹理 {files['gui']} 张", f"{files['sfx']} 个音效", f"{files['voice']} 条配音",
        f"墨墨 {voices['v_mo']}、幼年 {voices['v_young']}、周可 {voices['v_zhouke']}、艾丽丝 {voices['v_alice']}",
    ]
    for s in need_readme:
        assert s in readme, f"README does not say `{s}`"
    for s in (f"{files['chara']} 张", f"{files['side']} 张", f"{files['bg']} 张", f"{files['cg']} 张", f"{files['ui']} 张",
              f"{files['gui']} 张", f"{n['bgm']} 首", f"{files['sfx']} 个", f"{files['voice']} 条", f"{files['font']} 个 `.otf`"):
        assert s in lic, f"ASSETS_LICENSE.md does not say `{s}`"
    for s in (f"{n['ach']} 项", f"{n['cg']} 张 CG", f"{n['bgm']} 首配乐", f"{files['voice']} 条", f"{n['cg']} CGs", f"{n['bgm']} music tracks",
              f"{n['ach']} achievements", "eight replayable short cases", "two bonus stories"):
        assert s in store, f"steam_store.md does not say `{s}`"
    assert "待定" in store and store.count("价格") and "AI 内容披露" in store
    # privacy paragraph: save location, no engine cloud sync screen, player name typed by the player and kept on this machine
    for s in (re.search(r'config\.save_directory = "([^"]+)"', _read("game/options.rpy")).group(1), "没有用引擎自带的存档云同步", "你起的名字", "两篇番外与八桩短案由 AI 辅助续写"):
        assert s in store, f"steam_store.md does not say `{s}`"
    prod = "\n".join(p.read_text(encoding="utf-8-sig") for p in _prod_files())
    assert not re.search(r"UploadSync|DownloadSync|OpenURL|\{a=", prod), "cloud sync or a web link was added: update the privacy paragraph"
    assert "renpy.input(" in prod and "persistent.last_player_name" in prod
    # directories the old README listed but the repository does not have must be described as missing
    for d in ("素材", "设计文档", "steam_kit"):
        assert not (ROOT / d).exists() and f"`{d}/`" in readme.split("仓库里没有的东西", 1)[1], d
    for rel in re.findall(r"^├─ ([\w./]+(?: / [\w.]+)*)", readme, re.M):
        for part in rel.split(" / "):
            assert (ROOT / part).exists(), f"README lists {part}, which does not exist"
    for rel in re.findall(r"`python (tests/\w+\.py)`", readme):
        assert (ROOT / rel).is_file(), rel
    REPORT["Counts"] = f"ach{n['ach']}/extras{n['extras']}/cg{n['cg']}/bgm{n['bgm']}/voice{files['voice']}"
    print(f"[PASS] counts: {checked} UI numbers match their data; README / ASSETS_LICENSE / store copy match "
          f"({n['ach']} achievements, {n['cg']} CG, {n['end']} endings, {n['bgm']} BGM, {files['voice']} voice lines, {cjk} CJK characters in the main line)")


################################################################################
# 6. Build rules, packaging script, font licence, credits
################################################################################

def _match(pattern, path):
    """Ren'Py's build pattern language: ** matches everything, * everything but / (plus one trailing /), case-insensitive."""
    rx, i = "", 0
    while i < len(pattern):
        if pattern.startswith("**", i):
            rx += ".*"
            i += 2
        elif pattern[i] == "*":
            rx += "[^/]*/?"
            i += 1
        else:
            rx += re.escape(pattern[i])
            i += 1
    return re.fullmatch(rx, path, re.I) is not None


def check_build():
    opt = _read("game/options.rpy")
    rules = [(a, None if b == "None" else ast.literal_eval(b)) for a, b in re.findall(r"build\.classify\('([^']+)', (None|'\w+')\)", opt)]
    assert len(rules) >= 30

    def where(path):
        # like the distributor: folders are classified first, and an excluded folder is never entered
        # (`x/**` does not exclude the folder x/ itself, only what is inside)
        bits = path.split("/")
        for i in range(1, len(bits)):
            folder = "/".join(bits[:i]) + "/"
            for pat, target in rules:
                if _match(pat, folder):
                    if target is None and pat.rstrip("*") != pat and _match(pat.rstrip("*"), folder):
                        continue
                    if target is None:
                        return None
                    break
        for pat, target in rules:
            if _match(pat, path):
                return target
        return "default"

    tracked = []
    for p in ROOT.rglob("*"):
        if p.is_file() and not any(x in p.parts for x in (".git",)) and "renpy-" not in str(p):
            tracked.append(p.relative_to(ROOT).as_posix())
    seen = Counter()
    for rel in tracked:
        t = where(rel)
        seen[t] += 1
        if rel.startswith("game/"):
            if rel.startswith(("game/tests/", "game/saves/", "game/cache/")):
                assert t is None, f"{rel} would be packaged as {t}"
            elif rel == "game/presplash.png":
                assert t == "all", rel
            elif rel.endswith(".rpy"):
                assert t is None, rel
            elif rel.endswith((".png", ".ogg", ".otf")):
                assert t == "archive", (rel, t)
            elif rel.startswith("game/fonts/") and rel.endswith(".txt"):
                assert t == "all", rel
            else:
                raise AssertionError(f"unclassified game file {rel} -> {t}")
        elif rel == "icon.ico":
            pass  # consumed by the engine's own rule
        else:
            assert t is None, f"{rel} would be packaged as {t}"
    for extra_path, want in (("docs/store/x.png", None), ("renpy-8.5.3-sdk/renpy.py", None), ("renpy-8.6.0-sdk/x", None), ("lint.txt", None),
                             ("log.txt", None), ("errors.txt", None), ("steam_appid.txt", None), ("game/x.rpyc", "archive"),
                             ("game/tl/schinese/common.rpyc", "archive"), ("game/tests/autoplay.rpyc", None), ("dists/a.zip", None),
                             (".gitignore", None)):
        assert where(extra_path) == want, (extra_path, where(extra_path))
    assert re.search(r'^define config\.save_directory = "SilentDetective-1683720000"$', opt, re.M), "old saves live in this directory"
    assert re.search(r'^define build\.name = "SilentDetective"$', opt, re.M) and re.search(r'^define config\.version = "\d+\.\d+\.\d+"$', opt, re.M)
    assert 'define config.window_icon = "gui/window_icon.png"' in opt and (GAME_DIR / "gui/window_icon.png").is_file()
    ico = (ROOT / "icon.ico").read_bytes()
    assert ico[:4] == b"\x00\x00\x01\x00" and int.from_bytes(ico[4:6], "little") >= 4, "icon.ico must hold several sizes"

    ps = (ROOT / "tools/build_release.ps1").read_bytes()
    assert ps.startswith(b"\xef\xbb\xbf"), "Windows PowerShell 5.1 needs the BOM to read the Chinese messages"
    txt = ps.decode("utf-8-sig")
    for s in ("[string]$SdkPath = $env:RENPY_SDK", "renpy.py", "launcher", "--version", "lint", "'distribute'", "'--package'", "manifest.json",
              "Stop-Build 2", "[string]$OldGame", "old-game", "-win.zip", "-mac.zip", "-linux.tar.bz2", "game/archive.rpa", "game/fonts/LICENSE-OFL.txt", "rpy_syntax.py"):
        assert s in txt, f"build_release.ps1 misses {s}"
    for s in ("Invoke-WebRequest", "curl", "Start-BitsTransfer", "DownloadFile", "Invoke-RestMethod", "Get-WmiObject", "Get-CimInstance"):
        assert s not in txt, f"build_release.ps1 must not use {s}"
    for bat in ("run.bat", "lint.bat"):
        b = (ROOT / bat).read_text(encoding="ascii")
        assert "RENPY_SDK" in b and "not found" in b, f"{bat} must explain a missing SDK"
    assert "build_release.ps1" in (ROOT / "build.bat").read_text(encoding="ascii")

    lic = (GAME_DIR / "fonts/LICENSE-OFL.txt").read_text(encoding="utf-8")
    assert "SIL OPEN FONT LICENSE Version 1.1" in lic and "PERMISSION & CONDITIONS" in lic.upper().replace("PERMISSION AND", "PERMISSION &")
    for f in (GAME_DIR / "fonts").glob("*.otf"):
        assert f.name in lic, f"{f.name} is not listed in LICENSE-OFL.txt"
        data = f.read_bytes()
        assert "SIL Open Font License".encode("utf-16-be") in data, f"{f.name} carries no OFL notice in its name table"
    cred = _read("game/credits.rpy")
    lines = ast.literal_eval("[" + re.search(r"CREDITS_LINES = \[(.*?)\n    \]", cred, re.S).group(1) + "]")
    table = dict(lines)
    assert table["剧本"] and table["语音"] == "AI 合成" and "AI 生成" in table["角色 · 背景 · CG · 主视觉"], table
    assert "SIL Open Font License" in table["字体"] and "Ren'Py" in table["引擎"]
    assert not re.search(r"https?://", cred)
    for p in _prod_files():
        assert not re.search(r"https?://|renpy\.fetch|urllib|requests\.|socket\.", p.read_text(encoding="utf-8-sig")), f"{p.name}: network access"
    REPORT["Build"] = f"archive{seen['archive']}/all{seen['all']}/excluded{seen[None]}"
    print(f"[PASS] build rules: {seen['archive']} files archived, {seen['all']} loose, {seen[None]} excluded; packaging script, launch scripts, "
          f"font licence ({len(list((GAME_DIR / 'fonts').glob('*.otf')))} fonts), credits and offline check")


def main():
    res = check_syntax()
    check_project_rules()
    check_verifiers()
    check_references(res)
    check_names()
    check_screen_closures()
    check_calls(res)
    check_text()
    check_persistent()
    check_casefile()
    check_counts()
    check_build()
    print("RELEASE_REPORT " + " ".join(f"{k}={v}" for k, v in REPORT.items()))
    print("RELEASE_VERIFY_STATUS=PASS")


if __name__ == "__main__":
    main()
