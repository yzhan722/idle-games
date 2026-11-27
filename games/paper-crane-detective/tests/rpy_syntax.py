#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static Ren'Py script checker (no engine, standard library only): logical lines, indentation, blocks, quotes, brackets,
statement shapes, screen language (statement / property names, simple expressions), ATL, and Python code / expressions.

It mirrors the rules of Ren'Py 8's lexer / parser as closely as a stand-alone script can: the same logical-line splitting,
the same "this statement needs / does not take a block" rules, the same simple-expression grammar for screen properties.
Three rules look at the whole project instead of one file: what init code needs while it runs (files run in path order inside
one priority), functions used as screen actions (`Function(f)` ends the interaction when f returns anything but None), and
save compatibility (every label call has `from _call_...`, each name used once and never as a label).
It is stricter than nothing and weaker than `renpy lint` -- run the real lint when the SDK is available.

    python tests/rpy_syntax.py            # check every .rpy under game/ (with the project rules), exit code 1 if anything is reported
    python tests/rpy_syntax.py a.rpy ...  # check the given files
"""

import sys

sys.dont_write_bytecode = True  # never leave tests/__pycache__ behind in the repo

import ast  # noqa: E402
import functools  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
import warnings  # noqa: E402
from pathlib import Path  # noqa: E402

warnings.filterwarnings("ignore", category=SyntaxWarning)  # compile() of `3 (x)`: reported by the screen rules themselves

ROOT = Path(__file__).resolve().parent.parent
GAME_DIR = ROOT / "game"

NAME = r"[a-zA-Z_\u00a0-\ufffd][0-9a-zA-Z_\u00a0-\ufffd]*"
DOTTED = rf"{NAME}(?:\.{NAME})*"


class RpyError(Exception):
    def __init__(self, line, msg):
        super().__init__(msg)
        self.line = line
        self.msg = msg


################################################################################
# 1. Logical lines & blocks
################################################################################

def logical_lines(text):
    """[(line number, text with its indentation)]; raises RpyError like Ren'Py's list_logical_lines."""
    if not text.endswith("\n"):
        text += "\n"
    out, pos, number, n = [], 0, 1, len(text)
    while pos < n:
        start, line, depth, opened = number, [], 0, []
        while pos < n:
            c = text[pos]
            if c == "\t":
                raise RpyError(number, "tab character")
            if c == "\n" and not depth:
                if "".join(line).strip():
                    out.append((start, "".join(line)))
                pos += 1
                number += 1
                line = None
                break
            if c == "\n":
                number += 1
            if c == "\r":
                pos += 1
                continue
            if c == "\\" and pos + 1 < n and text[pos + 1] == "\n":
                pos += 2
                number += 1
                line.append("\\\n")
                continue
            if c in "([{":
                depth += 1
                opened.append((c, number))
            elif c in ")]}":
                if not opened:
                    raise RpyError(number, f"unmatched closing `{c}`")
                o, oln = opened.pop()
                if "([{".index(o) != ")]}".index(c):
                    raise RpyError(number, f"`{o}` (line {oln}) closed by `{c}`")
                depth -= 1
            if c == "#":
                while pos < n and text[pos] != "\n":
                    pos += 1
                continue
            if c in "\"'`":
                first = number
                end, number = _string_end(text, pos, number)
                if end is None:
                    raise RpyError(first, f"string opened with {c} is never closed")
                line.append(text[pos:end])
                pos = end
                continue
            line.append(c)
            pos += 1
        if line:
            where = opened[-1][1] if opened else start
            raise RpyError(where, "logical line is not terminated (check strings and parentheses)")
    return out


def _string_end(text, pos, number):
    c, n = text[pos], len(text)
    triple = text[pos:pos + 3] == c * 3
    i = pos + (3 if triple else 1)
    while i < n:
        ch = text[i]
        if ch == "\n":
            number += 1
        if ch == "\\":
            if i + 1 < n and text[i + 1] == "\n":
                number += 1
            i += 2
            continue
        if ch == c:
            if not triple:
                return i + 1, number
            if text[i:i + 3] == c * 3:
                return i + 3, number
        i += 1
    return None, number


def group(lines):
    """Nested blocks [(line, text, block)], same indentation rules as Ren'Py's group_logical_lines."""
    rows = []
    for ln, txt in lines:
        body = txt.lstrip(" ")
        rows.append((ln, len(txt) - len(body), body.rstrip()))

    def core(i, min_depth):
        out, depth = [], None
        while i < len(rows):
            ln, d, body = rows[i]
            if d < min_depth:
                break
            if depth is None:
                depth = d
            if d != depth:
                raise RpyError(ln, f"indentation mismatch ({d} spaces, the block uses {depth})")
            i += 1
            block, i = core(i, depth + 1)
            out.append((ln, body, block))
        return out, i

    if rows and rows[0][1]:
        raise RpyError(rows[0][0], "unexpected indentation at the start of the file")
    return core(0, 0)[0]


def python_source(block, depth=0):
    """Rebuild the Python source of a block (what Ren'Py's python_block does)."""
    out = []
    for _ln, body, sub in block:
        out.append(" " * depth + body)
        if sub:
            out.append(python_source(sub, depth + 4))
    return "\n".join(out)


################################################################################
# 2. A small lexer over one logical line
################################################################################

OPERATORS = re.compile(r"<>|<<|<=|<|>>|>=|>|!=|==|\||\^|&|\+|-|\*\*|\*|//|/|%|~|@|:=|\b(?:or|and|not|in|is)\b")
KEYWORDS = set("""$ as at behind call expression hide if elif else image init jump menu onlayer pass python return scene
show with while zorder""".split())


class Lex:
    def __init__(self, ln, text):
        self.ln, self.text, self.pos = ln, text, 0

    def err(self, msg):
        raise RpyError(self.ln, f"{msg}: {self.text.splitlines()[0][:120]!r}")

    def skip(self):
        m = re.compile(r"(?:\s|\\\n)*").match(self.text, self.pos)
        self.pos = m.end()

    def eol(self):
        self.skip()
        return self.pos >= len(self.text)

    def match(self, rx):
        self.skip()
        m = re.compile(rx).match(self.text, self.pos)
        if not m:
            return None
        self.pos = m.end()
        return m.group(0)

    def peek(self, rx):
        p = self.pos
        v = self.match(rx)
        self.pos = p
        return v

    def word(self):
        return self.match(NAME)

    def keyword(self, w):
        return self.match(re.escape(w) + r"(?![0-9a-zA-Z_\u00a0-\ufffd])")

    def name(self):
        p = self.pos
        w = self.word()
        if w in KEYWORDS:
            self.pos = p
            return None
        return w

    def string(self):
        self.skip()
        p = self.pos
        m = re.compile(r"[rRuUbBfF]?(?=[\"'`])").match(self.text, self.pos)
        if not m or m.end() >= len(self.text):
            return None
        end, _n = _string_end(self.text, m.end(), 0)
        if end is None:
            self.err("unterminated string")
        self.pos = end
        return self.text[p:end]

    def parens(self):
        self.skip()
        if self.pos >= len(self.text) or self.text[self.pos] not in "([{":
            return None
        p, depth = self.pos, 0
        while self.pos < len(self.text):
            c = self.text[self.pos]
            if c in "\"'`":
                end, _n = _string_end(self.text, self.pos, 0)
                if end is None:
                    self.err("unterminated string")
                self.pos = end
                continue
            if c in "([{":
                depth += 1
            elif c in ")]}":
                depth -= 1
                if not depth:
                    self.pos += 1
                    return self.text[p:self.pos]
            self.pos += 1
        self.err("unbalanced parentheses")

    def simple_expression(self, operators=True):
        """Ren'Py's simple_expression: no bare `a if b else c`, no bare lambda."""
        self.skip()
        start = self.pos
        while True:
            while operators and self.match(OPERATORS.pattern):
                pass
            if self.eol():
                break
            s = self.string()
            if s is None and self.match(r"(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"):
                s = "num"
            if s is None:
                s = self.parens()
            if s is None:
                w = self.word()
                s = w
            if s is None:
                break
            while True:
                if self.match(r"\."):
                    if not self.word():
                        self.err("expected a name after the dot")
                    continue
                if self.text[self.pos:self.pos + 1] in ("(", "[") and self.parens():
                    continue
                break
            if operators and self.match(OPERATORS.pattern):
                continue
            break
        txt = self.text[start:self.pos].strip()
        return txt or None

    def until_colon(self):
        """delimited_python(':')"""
        self.skip()
        p = self.pos
        while self.pos < len(self.text):
            c = self.text[self.pos]
            if c in "\"'`":
                end, _n = _string_end(self.text, self.pos, 0)
                if end is None:
                    self.err("unterminated string")
                self.pos = end
                continue
            if c in "([{":
                self.parens()
                continue
            if c == ":" and self.text[self.pos:self.pos + 2] != ":=":
                return self.text[p:self.pos].strip()
            self.pos += 1
        self.err("expected `:`")

    def rest(self):
        self.skip()
        r = self.text[self.pos:].strip()
        self.pos = len(self.text)
        return r


# every piece of Python seen while parsing, for verify_release's undefined-name check:
# (owner, line, code); owner is "" (script / store scope), "screen:<name>" or "transform:<name>"
PY_FRAGMENTS = []
_OWNER = [""]


def _record(ln, code):
    PY_FRAGMENTS.append((_OWNER[-1], ln, code))


def check_expr(ln, code, what="expression"):
    _record(ln, "(" + code.replace("\\\n", "\n") + "\n)")
    try:
        compile("(" + code.replace("\\\n", "\n") + "\n)", "<rpy>", "eval")
    except SyntaxError as e:
        raise RpyError(ln, f"bad Python {what} ({e.msg}): {code.splitlines()[0][:100]!r}")


def check_code(ln, code):
    _record(ln, code)
    try:
        compile(code, "<rpy>", "exec")  # (compiled, not only parsed: `return` outside a function, a late `global` ...)
    except SyntaxError as e:
        raise RpyError(ln + (e.lineno or 1) - 1, f"bad Python code ({e.msg})")


def check_params(ln, txt):
    _record(ln, f"def _params_{txt}: pass")
    try:
        ast.parse(f"def f{txt}: pass")
    except SyntaxError as e:
        raise RpyError(ln, f"bad parameter list ({e.msg}): {txt[:100]!r}")


def check_args(ln, txt):
    _record(ln, f"_args_{txt}")
    try:
        ast.parse(f"f{txt}", mode="eval")
    except SyntaxError as e:
        raise RpyError(ln, f"bad argument list ({e.msg}): {txt[:100]!r}")


################################################################################
# 3. Property tables
################################################################################

STYLE_PROPS = set("""aft_bar aft_gutter alt anchor altruby_style antialias adjust_spacing axis background bar_invert
bar_resizing bar_vertical black_color bold bottom_bar bottom_gutter bottom_margin bottom_padding box_align box_first_spacing
box_justify box_layout box_reverse box_wrap box_wrap_spacing caret child clipping color debug drop_shadow
drop_shadow_color emoji_font enable_hover extra_alt first_indent first_spacing fit_first focus_mask focus_rect foreground
font group_alt hinting hyperlink_functions hover_sound activate_sound instance italic justify kerning keyboard_focus
keyboard_focus_insets key_events language layout left_bar left_gutter left_margin left_padding line_leading line_overlap_split
line_spacing margin maximum min_width minimum minwidth mipmap modal mouse newline_indent offset order_reverse outline_scaling
outlines padding pos prefer_emoji rest_indent right_bar right_gutter right_margin right_padding ruby_line_leading ruby_style
shaper size size_group slow_abortable slow_cps slow_cps_multiplier slow_speed sound spacing strikethrough subpixel
text_align text_y_fudge textalign textshader thumb thumb_offset thumb_shadow thumb_align time_policy top_bar top_gutter
top_margin top_padding underline unscrollable vertical white_color xalign xanchor xcenter xfill xfit xmargin xmaximum xminimum
xoffset xpadding xpos xsize xspacing xycenter xysize yalign yanchor ycenter yfill yfit ymargin ymaximum yminimum yoffset
ypadding ypos ysize yspacing align area bar_fore_gutter base_bar fore_bar fore_gutter box_fit crop_relative_default
instance_char""".split())
PREFIXES = ["", "insensitive_", "hover_", "idle_", "activate_", "selected_", "selected_insensitive_", "selected_hover_",
            "selected_idle_", "selected_activate_"]
STYLE_ALL = {p + s for p in PREFIXES for s in STYLE_PROPS}
TRANSFORM_PROPS = set("""additive align alignaround alpha anchor anchorangle anchoraround anchorradius angle around blend blur
corner1 corner2 crop crop_relative debug delay events fit fps gl_anisotropic gl_blend_func gl_color_mask gl_cull_face gl_depth
gl_mipmap gl_pixel_perfect gl_texture_scaling gl_texture_wrap matrixanchor matrixcolor matrixtransform maxsize mesh mesh_pad
mipmap nearest offset orientation perspective point_to pos poi radius rotate rotate_pad shader size subpixel transform_anchor
xalign xanchor xanchoraround xaround xcenter xcoffset xoffset xpan xpos xrotate xsize xtile xycenter xysize xzoom yalign yanchor
yanchoraround yaround ycenter ycoffset yoffset ypan ypos yrotate ysize ytile yzoom zoom zpos zrotate zzoom show_cancels_hide
keep_transform rotate_pad""".split())
UI_COMMON = {"at", "default_focus", "extra_alt", "focus", "group_alt", "id", "prefer_screen_to_id", "style", "style_group",
             "style_prefix", "style_suffix", "tooltip", "arguments", "properties", "as", "sensitive", "alt", "when_activate"}
DISPLAYABLE_PROPS = {
    "add": set(), "bar": {"value", "range", "adjustment", "changed", "hovered", "unhovered", "released"},
    "button": {"action", "clicked", "hovered", "unhovered", "alternate", "selected", "keysym", "alternate_keysym",
               "role", "hover_sound", "activate_sound"},
    "dismiss": {"action", "modal", "keysym"},
    "drag": {"drag_name", "draggable", "droppable", "drag_raise", "dragged", "dropped", "drag_handle", "clicked", "hovered",
             "unhovered", "mouse_drop", "drag_offscreen", "dragging", "droppable", "activated", "alternate"},
    "fixed": set(), "frame": set(), "grid": {"transpose", "allow_underfull", "right_to_left"}, "hbox": set(),
    "hotbar": {"value", "range", "adjustment"}, "hotspot": {"action", "clicked", "hovered", "unhovered", "selected"},
    "imagebutton": {"auto", "idle", "hover", "insensitive", "selected_idle", "selected_hover", "selected_insensitive", "action",
                    "clicked", "hovered", "unhovered", "alternate", "selected", "keysym", "image_style"},
    "imagemap": {"ground", "idle", "hover", "insensitive", "selected_idle", "selected_hover", "auto", "alpha", "cache"},
    "input": {"default", "length", "pixel_width", "allow", "exclude", "copypaste", "prefix", "suffix", "changed", "value",
              "multiline", "mask", "arrowkeys", "caret_blink", "action"},
    "key": {"action", "activate_sound", "capture"}, "label": {"action", "clicked", "hovered", "unhovered"},
    "mousearea": {"hovered", "unhovered", "focus_mask"},
    "mousebutton": set(), "nearrect": {"rect", "focus", "prefer_top"}, "null": {"width", "height"}, "on": {"action"},
    "pagelist": set(), "side": {"spacing"}, "text": {"slow", "slow_done", "substitute", "scope", "slow_cps", "tokenized"},
    "textbutton": {"action", "clicked", "hovered", "unhovered", "alternate", "selected", "keysym", "text_style", "substitute",
                   "scope", "role", "alternate_keysym"},
    "timer": {"action", "repeat", "modal"}, "transform": set(), "vbar": {"value", "range", "adjustment", "changed", "hovered",
                                                                         "unhovered", "released"}, "vbox": set(),
    "viewport": {"child_size", "mousewheel", "draggable", "edgescroll", "xadjustment", "yadjustment", "xinitial", "yinitial",
                 "scrollbars", "arrowkeys", "pagekeys", "transclude"}, "window": set(), "areapicker": set(),
}
DISPLAYABLE_PROPS["vpgrid"] = DISPLAYABLE_PROPS["viewport"] | {"cols", "rows", "transpose", "allow_underfull"}
TRANSFORM_OK = {"add", "transform", "fixed", "frame", "hbox", "vbox", "button", "textbutton", "text", "imagebutton", "grid", "window",
                "label", "bar", "vbar", "null", "input", "viewport", "vpgrid", "side", "drag"}
# properties forwarded with a sub-style prefix: textbutton text_*, viewport side_* / scrollbar_*, label text_* ...
SUB_PREFIXES = {"textbutton": ("text_",), "label": ("text_",), "viewport": ("side_", "scrollbar_", "vscrollbar_"),
                "vpgrid": ("side_", "scrollbar_", "vscrollbar_"), "button": (), "imagebutton": ("image_",)}
POSITIONAL = {"add": 1, "text": 1, "textbutton": 1, "label": 1, "grid": 2, "key": 1, "timer": 1, "on": 1, "imagemap": 0,
              "hotspot": 1, "hotbar": 1, "side": 1, "null": 0, "input": 0, "areapicker": 0}
CHILDREN = {"button": True, "fixed": True, "frame": True, "grid": True, "hbox": True, "vbox": True, "side": True,
            "viewport": True, "vpgrid": True, "window": True, "drag": True, "imagemap": True, "transform": True, "draggroup": True,
            "mousearea": False, "textbutton": False, "text": False, "add": False, "null": False, "key": False, "timer": False,
            "bar": False, "vbar": False, "input": False, "label": False, "on": False, "imagebutton": False, "hotspot": True,
            "hotbar": False, "dismiss": False, "nearrect": True, "areapicker": True, "mousebutton": False}
SCREEN_PROPS = {"modal", "sensitive", "tag", "zorder", "variant", "style_prefix", "style_group", "layer", "roll_forward", "predict",
                "style", "properties"}
WARPERS = set("""linear ease easein easeout pause warp knot easein_back easein_bounce easein_circ easein_cubic easein_elastic
easein_expo easein_quad easein_quart easein_quint easeout_back easeout_bounce easeout_circ easeout_cubic easeout_elastic easeout_expo
easeout_quad easeout_quart easeout_quint ease_back ease_bounce ease_circ ease_cubic ease_elastic ease_expo ease_quad ease_quart
ease_quint""".split())


################################################################################
# 4. Screens & ATL
################################################################################

def no_block(ln, block, what):
    if block:
        raise RpyError(block[0][0], f"indented line after `{what}` (line {ln}), which does not take a block")


def need_block(ln, block, what):
    if not block:
        raise RpyError(ln, f"`{what}` expects a block")


# which style-property groups a displayable statement accepts (Ren'Py's sldisplayables); `add` takes transform properties only
POS = set("""anchor xanchor yanchor pos xpos ypos align xalign yalign xoffset yoffset offset maximum xmaximum ymaximum area clipping
xfill yfill xcenter ycenter xycenter xsize ysize xysize alt debug group_alt extra_alt minimum xminimum yminimum""".split())
TEXT = set("""antialias vertical black_color bold color drop_shadow drop_shadow_color first_indent font size hyperlink_functions italic
justify kerning language layout line_leading line_spacing line_overlap_split min_width newline_indent outlines outline_scaling
rest_indent ruby_style altruby_style slow_cps slow_cps_multiplier slow_abortable slow_speed strikethrough text_align textalign
text_y_fudge underline adjust_spacing mipmap axis instance shaper hinting emoji_font prefer_emoji textshader caret""".split())
WIN = set("""background foreground left_margin right_margin bottom_margin top_margin xmargin ymargin margin left_padding right_padding
top_padding bottom_padding xpadding ypadding padding size_group modal child""".split())
BTN = set("""sound mouse focus_mask child keyboard_focus keyboard_focus_insets key_events hover_sound activate_sound focus_rect""".split())
BAR = set("""bar_vertical bar_invert bar_resizing left_gutter right_gutter top_gutter bottom_gutter left_bar right_bar top_bar bottom_bar
base_bar thumb thumb_shadow thumb_offset thumb_align mouse unscrollable keyboard_focus bar_fore_gutter aft_bar fore_bar""".split())
BOX = set("""box_layout box_wrap box_wrap_spacing box_reverse box_justify box_align order_reverse spacing first_spacing fit_first xfit
yfit""".split())
GRID = set("spacing xspacing yspacing margin xmargin ymargin".split())
GROUPS = {
    "text": POS | TEXT, "hbox": POS | BOX, "vbox": POS | BOX, "fixed": POS | BOX, "grid": POS | GRID, "frame": POS | WIN, "window": POS | WIN,
    "button": POS | WIN | BTN, "textbutton": POS | WIN | BTN, "imagebutton": POS | WIN | BTN, "label": POS | WIN, "bar": POS | BAR,
    "vbar": POS | BAR, "null": POS, "add": set(), "input": POS | TEXT, "viewport": POS, "vpgrid": POS | GRID, "side": POS | {"spacing"},
    "key": set(), "timer": set(), "on": set(), "transform": set(), "drag": POS, "mousearea": POS, "imagemap": POS, "hotspot": POS | BTN,
    "hotbar": POS | BAR, "dismiss": {"keyboard_focus"}, "nearrect": POS, "areapicker": POS, "mousebutton": set(), "pagelist": set(),
    "use": set(),
}
SIDE_SUB = {"side_": POS | {"spacing"}, "scrollbar_": POS | BAR, "vscrollbar_": POS | BAR, "text_": POS | TEXT, "image_": POS}


def _in_group(prop, group):
    return any(prop.startswith(p) and prop[len(p):] in group for p in PREFIXES)


def prop_ok(kind, prop):
    if prop in DISPLAYABLE_PROPS.get(kind, ()):
        return True
    if kind in ("add", "transform"):
        return prop in TRANSFORM_PROPS or prop in ("at", "alt")
    if kind in ("key", "timer", "on"):
        return prop in ("at", "id", "style")
    if kind == "use":  # the block of `use name(...):` goes to transclude
        return prop in ("style_prefix", "style_group")
    if prop in UI_COMMON:
        return True
    for pre in SUB_PREFIXES.get(kind, ()):
        if prop.startswith(pre) and (_in_group(prop[len(pre):], SIDE_SUB[pre]) or prop[len(pre):] in UI_COMMON):
            return True
    return _in_group(prop, GROUPS.get(kind, STYLE_PROPS))


def parse_props(lx, kind, allowed=None, seen=None, after_python=False):
    """A run of `name simple_expression` pairs; stops at `:` or the end of the line. `seen` collects the names of the whole
    statement (its own line and the property lines of its block): Ren'Py rejects a repeated keyword, and after `$` / `python:`
    (or a child that runs Python) it rejects any value that is not a constant."""
    seen = [] if seen is None else seen
    while not lx.eol() and not lx.peek(r":"):
        p = lx.word()
        if not p:
            lx.err("expected a property name")
        if not (prop_ok(kind, p) if allowed is None else p in allowed):
            lx.err(f"`{p}` is not a property of `{kind}`")
        if p in seen:
            lx.err(f"property `{p}` appears more than once in this `{kind}`")
        if p == "at" and lx.keyword("transform"):
            seen.append(p)
            return seen
        e = lx.simple_expression()
        if e is None:
            lx.err(f"property `{p}` needs a value")
        while p == "at" and lx.match(r","):
            e2 = lx.simple_expression()
            if e2 is None:
                lx.err("trailing comma after at")
            e = f"{e}, {e2}"
        check_expr(lx.ln, e, f"value of `{p}`")
        if after_python and not _literal(e):
            lx.err(f"non-constant property `{p}` after a python block in this `{kind}`")
        seen.append(p)
    return seen


# statements that hold exactly one child: only these take `has`, and only before any child
ONE_CHILD = {"button", "frame", "window", "viewport", "drag", "transform", "nearrect"}


def _literal(expr):
    try:
        ast.literal_eval(expr)
        return True
    except (ValueError, SyntaxError):
        return False


def for_head(lx, head):
    """`for` targets / `index` / iterable of a screen: the iterable is a simple expression (no bare ternary), the targets are
    no Ren'Py keywords."""
    m = re.match(r"(.+?)\s+(?:index\s+(.+?)\s+)?in\s+(.+)$", head, re.S)
    if not m:
        lx.err("bad for statement")
    for n in re.findall(NAME, m.group(1)):
        if n in KEYWORDS:
            lx.err(f"`{n}` is a Ren'Py keyword and cannot be a loop variable")
    check_code(lx.ln, f"for {m.group(1)} in ({m.group(3)}\n):\n    pass")
    x = Lex(lx.ln, m.group(3))
    while x.simple_expression() is not None and x.match(r","):
        pass
    if not x.eol():
        lx.err("the iterable of a screen `for` must be a simple expression (put it in parentheses)")


def screen_block(block, kind, ctx, in_screen_root=False, seen=None, py=False, props=True):
    """Statements inside a screen (or inside a displayable `kind` of a screen). Returns True when the block runs Python: from
    there on Ren'Py (config.keyword_after_python = False) only accepts constant property values in the same displayable."""
    prev_if = None
    seen = [] if seen is None else seen
    leaf = CHILDREN.get(kind, True) is False  # takes properties, `if` and `pass` only
    had_child = False
    for ln, text, sub in block:
        lx = Lex(ln, text)
        if text.startswith("$"):
            no_block(ln, sub, "$")
            check_code(ln, text[1:].strip())
            if leaf:
                lx.err(f"`$` is not allowed inside `{kind}`")
            prev_if, py = None, True
            continue
        w = lx.word()
        if w is None:
            lx.err("unexpected start of a screen statement")
        if w in ("if", "elif", "else", "showif"):
            if w in ("elif", "else") and prev_if not in ("if", "elif", "showif"):
                lx.err(f"`{w}` without a matching `if`")
            if w != "else":
                cond = lx.until_colon()
                check_expr(ln, cond, "condition")
            if not lx.match(r":") or not lx.eol():
                lx.err(f"`{w}` must end with a colon")
            need_block(ln, sub, w)
            if w == "showif" and leaf:
                lx.err(f"`showif` is not allowed inside `{kind}`")
            shown = w == "showif" or (w in ("elif", "else") and prev_if == "showif")
            py = screen_block(sub, kind, ctx, in_screen_root and not shown, py=py, props=props and not shown) or py
            prev_if = "showif" if shown else w
            continue
        prev_if = None
        if w == "for":
            head = lx.until_colon()
            lx.match(r":")
            if not lx.eol():
                lx.err("text after the colon")
            for_head(lx, head)
            need_block(ln, sub, "for")
            if leaf:
                lx.err(f"`for` is not allowed inside `{kind}`")
            py = screen_block(sub, kind, ctx, False, py=py, props=False) or py
            continue
        if w in ("break", "continue", "pass") and lx.eol():
            no_block(ln, sub, w)
            continue
        if w == "default":
            m = re.match(rf"default\s+({NAME})\s*=\s*(.+)$", text, re.S)
            if not m:
                lx.err("bad default statement")
            no_block(ln, sub, "default")
            if leaf:
                lx.err(f"`default` is not allowed inside `{kind}`")
            check_expr(ln, m.group(2))
            _record(ln, f"{m.group(1)} = None")
            continue
        if w == "python" and lx.match(r":"):
            need_block(ln, sub, "python")
            if leaf:
                lx.err(f"`python` is not allowed inside `{kind}`")
            check_code(sub[0][0], python_source(sub))
            py = True
            continue
        if w == "use":
            if leaf:
                lx.err(f"`use` is not allowed inside `{kind}`")
            had_child = True
            if lx.keyword("expression"):
                e = lx.simple_expression()
                check_expr(ln, e or "")
            else:
                name = lx.word()
                if not name:
                    lx.err("use needs a screen name")
                ctx["use"].append((ln, name))
                a = lx.parens()
                if a:
                    check_args(ln, a)
            if lx.keyword("id"):
                lx.simple_expression()
            if lx.match(r":"):
                need_block(ln, sub, "use")
                if not lx.eol():
                    lx.err("text after the colon")
                screen_block(sub, "use", ctx)
            else:
                if not lx.eol():
                    lx.err("unexpected text after use")
                no_block(ln, sub, "use")
            continue
        if w == "transclude":
            no_block(ln, sub, w)
            if not lx.eol():
                lx.err("unexpected text after transclude")
            had_child = True
            continue
        if w == "at" and lx.keyword("transform"):
            if not lx.match(r":"):
                lx.err("at transform needs a colon")
            need_block(ln, sub, "at transform")
            atl_block(sub)
            continue
        if w == "has":
            if kind not in ONE_CHILD:
                lx.err(f"`has` is not allowed inside `{kind}`")
            if had_child:
                lx.err("`has` must come before the first child")
            had_child = True
            child = lx.word()
            if child not in DISPLAYABLE_PROPS:
                lx.err("has needs a layout")
            own = parse_props(lx, child)
            if lx.match(r":"):
                need_block(ln, sub, "has")
                py = screen_block(sub, child, ctx, seen=own) or py
            else:
                no_block(ln, sub, "has")
                kind, seen = child, own  # the rest of this block belongs to the layout named by `has`
            continue
        if w in DISPLAYABLE_PROPS and not (in_screen_root and w in SCREEN_PROPS) and not (
                w == "transform" and kind != "transform" and not lx.peek(r":|.")) :
            # `key` / `text` / `input` ... may also be property names of the enclosing displayable; a statement wins
            ln_kind = w
            need = POSITIONAL.get(w)
            if need is None:
                need = 0
            for _i in range(need):
                e = lx.simple_expression()
                if e is None:
                    lx.err(f"`{w}` expects {need} positional parameter(s)")
                check_expr(ln, e)
            own = parse_props(lx, ln_kind)
            if lx.match(r":"):
                if not lx.eol():
                    lx.err("text after the colon")
                need_block(ln, sub, w)
                py = screen_block(sub, w, ctx, seen=own) or py
            else:
                if not lx.eol():
                    lx.err(f"unexpected text after `{w}`")
                no_block(ln, sub, w)
            if leaf:
                lx.err(f"`{kind}` does not take children")
            had_child = had_child or w not in ("on", "key", "timer")
            if w == "grid":
                ctx["grid"].append((ln, text, sub))
            continue
        # otherwise: a property line of the enclosing displayable / screen
        lx.pos = 0
        if not props:
            lx.err(f"`{w}`: no property is allowed directly inside `for` / `showif`")
        if in_screen_root:
            parse_props(lx, "screen", SCREEN_PROPS, seen, py)
        else:
            parse_props(lx, kind, None, seen, py)
        if not lx.eol():
            lx.err("unexpected text after a property")
        no_block(ln, sub, w)
    return py


def atl_block(block):
    for ln, text, sub in block:
        lx = Lex(ln, text)
        w = lx.peek(NAME)
        if w in ("block", "parallel", "choice", "on", "contains") and not text.startswith("on_"):
            lx.word()
            if w == "choice" and not lx.peek(r":"):
                lx.simple_expression()
            elif w == "on":
                if not lx.word():
                    lx.err("on needs an event name")
                while lx.match(r","):
                    lx.word()
            elif w == "contains" and not lx.peek(r":"):
                e = lx.simple_expression()
                check_expr(ln, e or "")
                no_block(ln, sub, "contains")
                continue
            if not lx.match(r":") or not lx.eol():
                lx.err(f"ATL `{w}` must end with a colon")
            need_block(ln, sub, w)
            atl_block(sub)
            continue
        if w == "repeat":
            lx.word()
            if not lx.eol():
                check_expr(ln, lx.rest())
            no_block(ln, sub, w)
            continue
        if w in ("time", "function", "event"):
            lx.word()
            check_expr(ln, lx.rest())
            no_block(ln, sub, w)
            continue
        if w in ("pass", "animation") and text.strip() == w:
            no_block(ln, sub, w)
            continue
        if w == "pause":
            lx.word()
            e = lx.simple_expression()
            if e:
                check_expr(ln, e)
            if not lx.eol():
                lx.err("unexpected text after pause")
            no_block(ln, sub, w)
            continue
        if w in WARPERS:
            lx.word()
            if w == "warp":
                check_expr(ln, lx.simple_expression() or "")
            e = lx.simple_expression()
            if e is None:
                lx.err(f"`{w}` needs a duration")
            check_expr(ln, e)
        elif text[:1] in "\"'(" or (w and w not in TRANSFORM_PROPS):
            e = lx.simple_expression()
            if e is None:
                lx.err("unexpected ATL statement")
            check_expr(ln, e)
            if lx.keyword("with"):
                check_expr(ln, lx.simple_expression() or "")
            if not lx.eol() and not lx.peek(NAME):
                lx.err("unexpected ATL text")
        while not lx.eol():
            if lx.match(r","):
                continue
            p = lx.word()
            if p in ("clockwise", "counterclockwise"):
                continue
            if p == "circles":
                check_expr(ln, lx.simple_expression() or "")
                continue
            if p not in TRANSFORM_PROPS:
                lx.err(f"`{p}` is not a transform property")
            e = lx.simple_expression()
            if e is None:
                lx.err(f"transform property `{p}` needs a value")
            check_expr(ln, e)
            while lx.keyword("knot"):
                check_expr(ln, lx.simple_expression() or "")
        no_block(ln, sub, "ATL")


################################################################################
# 5. Script statements
################################################################################

USER_STATEMENTS = {"play", "queue", "stop", "voice", "pause", "window", "nvl", "centered", "extend"}


def image_spec(lx):
    """name components + at / as / behind / onlayer / zorder clauses."""
    comps = []
    if lx.keyword("expression"):
        e = lx.simple_expression()
        check_expr(lx.ln, e or "")
    else:
        while True:
            p = lx.pos
            c = lx.match(r"-?[0-9a-zA-Z_\u00a0-\ufffd]+")
            if c in KEYWORDS or c is None:
                lx.pos = p
                break
            comps.append(c)
        if not comps:
            lx.err("expected an image name")
    while True:
        if lx.keyword("at"):
            while True:
                e = lx.simple_expression()
                if e is None:
                    lx.err("at needs a transform")
                check_expr(lx.ln, e)
                if not lx.match(r","):
                    break
            continue
        if lx.keyword("as") or lx.keyword("onlayer"):
            if not lx.word():
                lx.err("expected a name")
            continue
        if lx.keyword("behind"):
            lx.word()
            while lx.match(r","):
                lx.word()
            continue
        if lx.keyword("zorder"):
            check_expr(lx.ln, lx.simple_expression() or "")
            continue
        break
    return comps


def with_clause(lx):
    if lx.keyword("with"):
        e = lx.simple_expression()
        if e is None:
            lx.err("with needs a transition")
        check_expr(lx.ln, e)


def say_tail(lx):
    lx.skip()
    if lx.text[lx.pos:lx.pos + 1] == "(":
        check_args(lx.ln, lx.parens())
    if lx.keyword("id"):
        lx.word()
    with_clause(lx)
    if not lx.eol():
        lx.err("unexpected text after a say statement")


def statements(block, ctx, where="script"):
    prev_if = None
    for ln, text, sub in block:
        lx = Lex(ln, text)
        ctx["n"] += 1
        if text.startswith("$"):
            no_block(ln, sub, "$")
            check_code(ln, text[1:].strip())
            prev_if = None
            continue
        if text[:1] in "\"'`":
            lx.string()
            while lx.string():
                pass
            say_tail(lx)
            no_block(ln, sub, "say")
            prev_if = None
            continue
        w = lx.word()
        if w is None:
            lx.err("unexpected start of a statement")
        if w in ("if", "elif", "else"):
            if w != "if" and prev_if not in ("if", "elif"):
                lx.err(f"`{w}` without a matching `if`")
            if w != "else":
                check_expr(ln, lx.until_colon(), "condition")
            if not lx.match(r":") or not lx.eol():
                lx.err(f"`{w}` must end with a colon")
            need_block(ln, sub, w)
            statements(sub, ctx, where)
            prev_if = w
            continue
        prev_if = None
        if w == "while":
            check_expr(ln, lx.until_colon(), "condition")
            lx.match(r":")
            need_block(ln, sub, w)
            statements(sub, ctx, where)
        elif w == "label":
            nm = lx.match(r"\.?" + DOTTED)
            if not nm:
                lx.err("label needs a name")
            ctx["label"].append((ln, nm))
            p = lx.parens()
            if p:
                check_params(ln, p)
            lx.keyword("hide")
            if not lx.match(r":") or not lx.eol():
                lx.err("label must end with a colon")
            statements(sub, ctx, where)  # an empty label is legal
        elif w == "menu":
            nm = lx.match(DOTTED)
            if nm:
                ctx["label"].append((ln, nm))
            a = lx.parens()
            if a:
                check_args(ln, a)
            if not lx.match(r":") or not lx.eol():
                lx.err("menu must end with a colon")
            need_block(ln, sub, w)
            menu_block(sub, ctx, where)
        elif w == "pass":
            no_block(ln, sub, w)
        elif w == "return":
            no_block(ln, sub, w)
            if not lx.eol():
                check_expr(ln, lx.rest())
        elif w == "jump":
            no_block(ln, sub, w)
            if lx.keyword("expression"):
                check_expr(ln, lx.rest())
            else:
                nm = lx.match(r"\.?" + DOTTED)
                if not nm or not lx.eol():
                    lx.err("bad jump")
                ctx["jump"].append((ln, nm))
        elif w == "call":
            no_block(ln, sub, w)
            if lx.keyword("screen"):
                nm = lx.word()
                ctx["screen_ref"].append((ln, nm))
                a = lx.parens()
                if a:
                    check_args(ln, a)
                lx.keyword("nopredict")
                with_clause(lx)
            elif lx.keyword("expression"):
                check_expr(ln, lx.simple_expression() or "")
                if lx.keyword("pass"):
                    check_args(ln, lx.parens() or "()")
            else:
                nm = lx.match(r"\.?" + DOTTED)
                if not nm:
                    lx.err("bad call")
                ctx["jump"].append((ln, nm))
                a = lx.parens()
                if a:
                    check_args(ln, a)
            if lx.keyword("from"):
                lx.match(DOTTED)
            if not lx.eol():
                lx.err("unexpected text after call")
        elif w in ("show", "hide") and lx.keyword("screen"):
            no_block(ln, sub, w)
            nm = lx.word()
            if not nm:
                lx.err("screen name expected")
            ctx["screen_ref"].append((ln, nm))
            a = lx.parens()
            if a:
                check_args(ln, a)
            for kw in ("nopredict",):
                lx.keyword(kw)
            while lx.keyword("as") or lx.keyword("onlayer") or lx.keyword("zorder"):
                lx.simple_expression()
            with_clause(lx)
            if not lx.eol():
                lx.err("unexpected text after a screen statement")
        elif w in ("scene", "show", "hide"):
            if w == "scene" and (lx.eol() or lx.peek(r"onlayer|with\b")):
                if lx.keyword("onlayer"):
                    lx.word()
                with_clause(lx)
            else:
                comps = image_spec(lx)
                ctx["image_ref"].append((ln, w, comps))
                with_clause(lx)
            if lx.match(r":"):
                if not lx.eol():
                    lx.err("text after the colon")
                need_block(ln, sub, w)
                atl_block(sub)
            else:
                if not lx.eol():
                    lx.err(f"unexpected text after {w}")
                no_block(ln, sub, w)
        elif w == "with":
            no_block(ln, sub, w)
            check_expr(ln, lx.rest())
        elif w == "image":
            comps = []
            while True:
                c = lx.match(r"-?[0-9a-zA-Z_\u00a0-\ufffd]+")
                if not c:
                    break
                comps.append(c)
            if not comps:
                lx.err("image needs a name")
            ctx["image_def"].append((ln, comps))
            if lx.match(r"="):
                no_block(ln, sub, w)
                check_expr(ln, lx.rest())
            elif lx.match(r":") and lx.eol():
                need_block(ln, sub, w)
                atl_block(sub)
            else:
                lx.err("bad image statement")
        elif w in ("define", "default"):
            no_block(ln, sub, w)
            lx.match(r"-?\d+")
            nm = lx.match(DOTTED)
            if not nm:
                lx.err(f"{w} needs a name")
            lx.skip()
            if lx.text[lx.pos:lx.pos + 1] == "[":
                lx.parens()
            if not lx.match(r"=|\+=|\|="):
                lx.err(f"{w} needs `=`")
            ctx[w].append((ln, nm))
            check_expr(ln, lx.rest())
        elif w == "transform":
            lx.match(r"-?\d+")
            nm = lx.match(DOTTED)
            _OWNER.append(f"transform:{nm}")
            try:
                p = lx.parens()
                if p:
                    check_params(ln, p)
                if not nm or not lx.match(r":") or not lx.eol():
                    lx.err("bad transform statement")
                ctx["transform"].append((ln, nm))
                need_block(ln, sub, w)
                atl_block(sub)
            finally:
                _OWNER.pop()
        elif w == "screen":
            nm = lx.word()
            _OWNER.append(f"screen:{nm}")
            try:
                p = lx.parens()
                if p:
                    check_params(ln, p)
                ctx["screen"].append((ln, nm, p or ""))
                parse_props(lx, "screen", SCREEN_PROPS)
                if not lx.match(r":") or not lx.eol():
                    lx.err("screen must end with a colon")
                screen_block(sub, "screen", ctx, True)
            finally:
                _OWNER.pop()
        elif w == "style":
            nm = lx.word()
            if not nm:
                lx.err("style needs a name")
            ctx["style"].append((ln, nm))
            style_line(lx)
            if lx.match(r":"):
                if not lx.eol():
                    lx.err("text after the colon")
                need_block(ln, sub, w)
                for l2, t2, s2 in sub:
                    no_block(l2, s2, "style property")
                    x2 = Lex(l2, t2)
                    style_line(x2)
                    if not x2.eol():
                        x2.err("unexpected text in a style block")
            else:
                if not lx.eol():
                    lx.err("unexpected text after style")
                no_block(ln, sub, w)
        elif w == "init":
            if lx.keyword("offset"):
                if not lx.match(r"="):
                    lx.err("init offset needs `=`")
                check_expr(ln, lx.rest())
                no_block(ln, sub, w)
                continue
            lx.match(r"-?\d+")
            if lx.keyword("python"):
                python_head(lx)
                need_block(ln, sub, w)
                check_code(sub[0][0], python_source(sub))
            elif lx.match(r":") and lx.eol():
                need_block(ln, sub, w)
                statements(sub, ctx, where)
            else:
                statements([(ln, lx.rest(), sub)], ctx, where)
        elif w == "python":
            python_head(lx)
            need_block(ln, sub, w)
            check_code(sub[0][0], python_source(sub))
        elif w == "translate":
            lang = lx.word()
            ident = lx.match(DOTTED)
            if not lang or not ident:
                lx.err("bad translate statement")
            if not lx.match(r":") or not lx.eol():
                lx.err("translate must end with a colon")
            if ident == "strings":
                for l2, t2, s2 in sub:
                    no_block(l2, s2, "old / new")
                    x2 = Lex(l2, t2)
                    if x2.word() not in ("old", "new") or x2.string() is None or not x2.eol():
                        x2.err("bad translate strings line")
            elif ident == "python":
                check_code(sub[0][0], python_source(sub))
            else:
                statements(sub, ctx, where)
        elif w in ("testcase", "testsuite"):
            ctx["testcase"].append((ln, text))  # test DSL: indentation / strings / brackets already checked
        elif w in USER_STATEMENTS and not (w == "centered"):
            no_block(ln, sub, w)
            if w in ("play", "queue"):
                if not lx.word():
                    lx.err(f"{w} needs a channel")
                e = lx.simple_expression()
                if e is None:
                    lx.err(f"{w} needs a file")
                check_expr(ln, e)
                ctx["audio_ref"].append((ln, e))
                while not lx.eol():
                    k = lx.word()
                    if k in ("loop", "noloop", "if_changed"):
                        continue
                    if k in ("fadein", "fadeout", "volume"):
                        check_expr(ln, lx.simple_expression() or "")
                        continue
                    lx.err(f"unexpected `{k}` after {w}")
            elif w == "stop":
                if not lx.word():
                    lx.err("stop needs a channel")
                while not lx.eol():
                    if lx.word() != "fadeout":
                        lx.err("unexpected text after stop")
                    check_expr(ln, lx.simple_expression() or "")
            elif w == "voice":
                e = lx.rest()
                check_expr(ln, e)
                ctx["audio_ref"].append((ln, e))
            elif w in ("pause",):
                if not lx.eol():
                    check_expr(ln, lx.rest())
            elif w == "window":
                k = lx.word()
                if k not in ("show", "hide", "auto", None):
                    lx.err("bad window statement")
                if not lx.eol() and k == "auto":
                    lx.rest()
                elif not lx.eol():
                    check_expr(ln, lx.rest())
            elif w == "extend":
                if lx.string() is None:
                    lx.err("extend needs a string")
                say_tail(lx)
        else:
            # say with a character expression, optional image attributes
            lx.pos = 0
            who = lx.simple_expression(operators=False)
            if who is None:
                lx.err("unknown statement")
            attrs = 0
            while lx.peek(r"-?[a-zA-Z_@]") and not lx.peek(r"[rRuU][\"']"):
                if not (lx.match(r"@") or lx.match(r"-?" + NAME)):
                    break
                attrs += 1
            if lx.string() is None:
                lx.err("unknown statement or a say statement without a string")
            while lx.string():
                pass
            ctx["say"].append((ln, who))
            say_tail(lx)
            no_block(ln, sub, "say")


def python_head(lx):
    while True:
        if lx.keyword("early") or lx.keyword("hide"):
            continue
        if lx.keyword("in"):
            if not lx.match(DOTTED):
                lx.err("python in needs a store name")
            continue
        break
    if not lx.match(r":") or not lx.eol():
        lx.err("python must end with a colon")


def style_line(lx):
    while not lx.eol() and not lx.peek(r":"):
        if lx.keyword("is"):
            if not lx.word():
                lx.err("style is needs a parent")
            continue
        if lx.keyword("clear"):
            continue
        if lx.keyword("take") or lx.keyword("del"):
            lx.word()
            continue
        if lx.keyword("variant"):
            check_expr(lx.ln, lx.simple_expression() or "")
            continue
        if lx.keyword("properties"):
            check_expr(lx.ln, lx.simple_expression() or "")
            continue
        p = lx.word()
        if p not in STYLE_ALL:
            lx.err(f"`{p}` is not a style property")
        e = lx.simple_expression()
        if e is None:
            lx.err(f"style property `{p}` needs a value")
        check_expr(lx.ln, e)


def menu_block(block, ctx, where):
    choices = 0
    for ln, text, sub in block:
        lx = Lex(ln, text)
        if lx.keyword("set"):
            check_expr(ln, lx.rest())
            no_block(ln, sub, "set")
            continue
        if lx.keyword("with"):
            check_expr(ln, lx.rest())
            no_block(ln, sub, "with")
            continue
        if text[:1] not in "\"'`":
            # who "caption"
            statements([(ln, text, sub)], ctx, where)
            continue
        lx.string()
        if lx.eol():
            no_block(ln, sub, "menu caption")
            continue
        lx.skip()
        if lx.text[lx.pos:lx.pos + 1] == "(":
            check_args(ln, lx.parens())
        if lx.keyword("if"):
            check_expr(ln, lx.until_colon(), "menu condition")
        if not lx.match(r":"):
            say_tail(lx)
            no_block(ln, sub, "menu caption")
            continue
        if not lx.eol():
            lx.err("text after a menu choice")
        need_block(ln, sub, "menu choice")
        statements(sub, ctx, where)
        choices += 1
    if not choices:
        raise RpyError(block[0][0], "menu without choices")


################################################################################
# 6. Entry points
################################################################################

CTX_KEYS = ("label", "jump", "screen", "screen_ref", "use", "image_def", "image_ref", "define", "default", "transform", "style",
            "audio_ref", "say", "testcase", "grid")


def check_file(path):
    """(errors [(line, message)], ctx). Like Ren'Py, keeps going after a bad top-level statement."""
    raw = Path(path).read_bytes()
    errors, ctx = [], {k: [] for k in CTX_KEYS}
    ctx["n"] = 0
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        return [(1, f"not valid UTF-8: {e}")], ctx
    try:
        blocks = group(logical_lines(text))
    except RpyError as e:
        return [(e.line, e.msg)], ctx
    i = 0
    while i < len(blocks):
        # keep an if / elif / else chain together
        j = i + 1
        while j < len(blocks) and re.match(r"(elif|else)\b", blocks[j][1]):
            j += 1
        try:
            statements(blocks[i:j], ctx)
        except RpyError as e:
            errors.append((e.line, e.msg))
        i = j
    return errors, ctx


def check_all(paths=None):
    paths = paths or sorted(GAME_DIR.rglob("*.rpy"))
    res = {}
    for p in paths:
        res[Path(p)] = check_file(p)
    return res


################################################################################
# 7. Project rules: init order, names that must not be overwritten, functions used as screen actions
################################################################################

# names the engine defines before any game code runs and the game redefines on purpose
ENGINE_REDEFINED = {"adv", "left", "center", "right", "centered", "narrator", "quick_menu", "store"}
# engine names a game must never assign: `_` / `_p` are the translation functions, the rest is engine state
RESERVED = {"_", "__", "___", "_p", "_args", "_kwargs", "_window", "_return", "_history", "_history_list", "_menu", "_rollback", "_skipping",
            "_in_replay", "_side_image", "_version", "_preferences", "_quit_slot", "_autosave", "_confirm_quit", "_game_menu_screen",
            "_load_prompt", "_dismiss_pause", "renpy", "config", "persistent", "gui", "build", "layout", "achievement", "preferences",
            "main_menu", "menu", "style", "ui", "im", "nvl", "extend", "Function", "Show", "Hide", "Start", "Replay", "Return"}


def _init_ops(sources):
    """[(priority, order, file, line, kind, payload)] of every statement that runs at init time, in Ren'Py's order: by
    priority, then by file path, then by line. `sources` = [(path relative to game/, text)]."""
    ops = []

    def add(prio, f, ln, kind, payload):
        ops.append((prio, len(ops), f, ln, kind, payload))

    def scan(blocks, f, off):
        for ln, t, sub in blocks:
            m = re.match(r"init offset\s*=\s*(-?\d+)", t)
            if m:
                off = int(m.group(1))
                continue
            m = re.match(r"init(?:\s+(-?\d+))?\s+python\b(.*):$", t)
            if m:
                if not re.search(r"\bin\b", m.group(2)):  # (a named store has its own names)
                    add(int(m.group(1) or 0) + off, f, ln, "python", python_source(sub))
                continue
            m = re.match(r"init(?:\s+(-?\d+))?:$", t)
            if m:
                for l2, t2, s2 in sub:
                    if t2.startswith("$"):
                        add(int(m.group(1) or 0) + off, f, l2, "python", t2[1:].strip())
                    elif t2.startswith("python"):
                        add(int(m.group(1) or 0) + off, f, l2, "python", python_source(s2))
                continue
            m = re.match(r"define\s+(-?\d+\s+)?([\w.]+)(?:\[.*?\])?\s*(?:\+|\|)?=\s*(.+)$", t, re.S)
            if m:
                add(int(m.group(1) or 0) + off, f, ln, "define", (m.group(2), m.group(3)))
                continue
            m = re.match(r"transform\s+(-?\d+\s+)?(\w+)", t)
            if m:
                add(int(m.group(1) or 0) + off, f, ln, "define", (m.group(2), "None"))
                continue
            m = re.match(r"image\s+[^=:]+=\s*(.+)$", t, re.S)
            if m:
                add(500 + off, f, ln, "expr", m.group(1))
                continue
            m = re.match(r"style\s+\w+", t)
            if m:
                for l2, t2, _s2 in sub:
                    x = Lex(l2, t2)
                    while not x.eol():
                        if x.word() in ("is", "take", "variant", "clear"):
                            x.simple_expression()
                            continue
                        e = x.simple_expression()
                        if e is None:
                            break
                        add(off, f, l2, "expr", e)

    for f, text in sorted(sources):
        scan(group(logical_lines(text)), f, 0)
    return sorted(ops, key=lambda o: (o[0], o[1]))


class _InitRun(ast.NodeVisitor):
    """Walks code in the order it runs and reports game names that are read before the game has defined them."""

    def __init__(self, state, where, stack=(), local=()):
        self.st, self.where, self.stack, self.local = state, where, stack, set(local)

    def _need(self, n):
        if n in self.st["game"] and n not in self.st["known"] and n not in self.local:
            self.st["bad"].append((*self.where, n, self.stack))

    def _bind(self, target):
        for x in ast.walk(target):
            if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store):
                (self.local.add if self.stack else self.st["known"].add)(x.id)
            elif isinstance(x, ast.Name):
                self._need(x.id)

    def visit_FunctionDef(self, node):
        for d in node.decorator_list + node.args.defaults + [x for x in node.args.kw_defaults if x]:
            self.visit(d)
        if not self.stack:
            self.st["known"].add(node.name)
            self.st["funcs"][node.name] = node

    def visit_ClassDef(self, node):
        for b in node.bases:
            self.visit(b)
        self.st["known"].add(node.name)

    def visit_Lambda(self, node):
        pass

    def visit_Global(self, node):
        pass

    def visit_Import(self, node):
        for a in node.names:
            (self.local if self.stack else self.st["known"]).add((a.asname or a.name).split(".")[0])

    visit_ImportFrom = visit_Import

    def visit_If(self, node):
        names = set(re.findall(r"'(\w+)' in globals\(\)", ast.unparse(node.test)))
        if names and not names <= self.st["known"]:  # `if "x" in globals():` -- and x does not exist yet
            for x in node.orelse:
                self.visit(x)
            return
        self.generic_visit(node)

    def visit_For(self, node):
        self.visit(node.iter)
        self._bind(node.target)
        for x in node.body + node.orelse:
            self.visit(x)

    def visit_Assign(self, node):
        self.visit(node.value)
        for t in node.targets:
            self._bind(t)

    def _comp(self, node):
        before = set(self.local)
        for g in node.generators:
            self.visit(g.iter)
            self.local |= {x.id for x in ast.walk(g.target) if isinstance(x, ast.Name)}
            for c in g.ifs:
                self.visit(c)
        for x in ([node.elt] if hasattr(node, "elt") else [node.key, node.value]):
            self.visit(x)
        self.local = before

    visit_ListComp = visit_SetComp = visit_DictComp = visit_GeneratorExp = _comp

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Load):
            self._need(node.id)
        else:
            self._bind(node)

    def visit_Attribute(self, node):
        if isinstance(node.value, ast.Name) and node.value.id in ("gui", "audio"):
            self._need(f"{node.value.id}.{node.attr}")
        self.generic_visit(node)

    def visit_Call(self, node):
        self.generic_visit(node)
        fn = self.st["funcs"].get(node.func.id) if isinstance(node.func, ast.Name) else None
        if fn is not None and fn.name not in self.stack and len(self.stack) < 6:  # the body runs now
            glob = {n for x in ast.walk(fn) if isinstance(x, ast.Global) for n in x.names}
            local = {a.arg for a in fn.args.posonlyargs + fn.args.args + fn.args.kwonlyargs}
            local |= {a.arg for a in (fn.args.vararg, fn.args.kwarg) if a}
            local |= {x.id for x in ast.walk(fn) if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store)} - glob
            sub = _InitRun(self.st, self.where, self.stack + (fn.name,), local)
            for x in fn.body:
                sub.visit(x)


def check_init_order(sources):
    """Problems [(file, line, message)]: init code that needs a name which a later init statement defines -- a NameError before
    the main menu. (club_mailbox.rpy did: it runs before definitions.rpy.)"""
    ops = _init_ops(sources)
    game = set()
    for _p, _i, _f, _ln, kind, payload in ops:
        if kind == "define":
            game.add(payload[0])  # (dotted: `define gui.x` / `define config.x` only promise that one attribute)
        elif kind == "python":
            for node in ast.parse(payload).body:
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    game.add(node.name)
                else:
                    game |= {x.id for x in ast.walk(node) if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store)}
    st = {"game": game - ENGINE_REDEFINED, "known": set(), "funcs": {}, "bad": []}
    for _p, _i, f, ln, kind, payload in ops:
        run = _InitRun(st, (f, ln))
        if kind == "python":
            run.visit(ast.parse(payload))
        elif kind == "define":
            run.visit(ast.parse("(" + payload[1] + "\n)", mode="eval"))
            st["known"].add(payload[0])
        else:
            run.visit(ast.parse("(" + payload + "\n)", mode="eval"))
    return sorted({(f, ln, f"init code needs `{n}`, which only a later init statement defines"
                    + (f" (through {' -> '.join(stack)})" if stack else "")) for f, ln, n, stack in st["bad"]})


def _value_returns(fn):
    """Does this function ever return something other than None?"""
    todo = list(fn.body)
    while todo:
        x = todo.pop()
        if isinstance(x, (ast.FunctionDef, ast.Lambda, ast.ClassDef)):
            continue
        if isinstance(x, ast.Return) and x.value is not None and not (isinstance(x.value, ast.Constant) and x.value.value is None):
            return True
        todo += list(ast.iter_child_nodes(x))
    return False


def _arity(fn):
    a = fn.args
    names = [x.arg for x in a.posonlyargs + a.args]
    return len(names) - len(a.defaults), (10 ** 6 if a.vararg else len(names)), names + [x.arg for x in a.kwonlyargs], bool(a.kwarg)


def check_actions(paths):
    """Problems [(file, line, message)] with `Function(f, ...)`: f returns a value (even False: the interaction ends and the menu
    page is closed), f is called with the wrong arguments, or an engine name is overwritten."""
    funcs, uses, bad = {}, [], []
    for p in paths:
        PY_FRAGMENTS.clear()
        _errs, ctx = check_file(p)
        for k in ("define", "default", "transform"):
            bad += [(p.name, ln, f"`{n}` is an engine name") for ln, n in ctx[k] if n in RESERVED]
        for owner, ln, code in PY_FRAGMENTS:
            try:
                tree = ast.parse(code)
            except SyntaxError:
                continue
            top = []
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and not node.name.startswith("_params_"):
                    funcs.setdefault(node.name, node)
                elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "Function" and node.args:
                    uses.append((p.name, ln, node))
            todo = list(tree.body)
            while todo:
                x = todo.pop()
                if isinstance(x, (ast.FunctionDef, ast.ClassDef)):
                    top.append(x.name)
                    continue
                if isinstance(x, (ast.Lambda, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
                    continue
                if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store):
                    top.append(x.id)
                todo += list(ast.iter_child_nodes(x))
            bad += [(p.name, ln, f"`{n}` is an engine name") for n in top if n in RESERVED]
    for f, ln, node in uses:
        args, quiet = list(node.args), False
        if isinstance(args[0], ast.Name) and args[0].id == "do_quietly":
            args, quiet = args[1:], True
        if not args or not isinstance(args[0], ast.Name) or args[0].id not in funcs:
            continue
        fn = funcs[args[0].id]
        if not quiet and _value_returns(fn):
            bad.append((f, ln, f"Function({fn.name}) ends the interaction: {fn.name} returns a value (use Function(do_quietly, {fn.name}, ...))"))
        lo, hi, names, kw = _arity(fn)
        given = {k.arg for k in node.keywords if k.arg and not k.arg.startswith("_")}
        if any(isinstance(x, ast.Starred) for x in args) or any(k.arg is None for k in node.keywords):
            continue
        n = len(args) - 1
        if n > hi or (not kw and not given <= set(names)) or set(names[:lo]) - set(names[:n]) - given:
            bad.append((f, ln, f"Function({fn.name}, ...) does not match the parameters of {fn.name}"))
    return bad


################################################################################
# 8. Save compatibility: every label call names its return point
################################################################################

# A save made inside a called label keeps the caller's return point. With `call x from _call_x` that point is the label
# `_call_x`, which survives any later edit of the script; without it Ren'Py falls back to the statement's generated name,
# which changes when lines around it change -- after a patch the save may no longer load. Names follow Ren'Py's own
# `add_from` (`_call_<target>`, then `_call_<target>_1`, ...). A released name never changes or moves; a new call gets a new
# name (so the rule checks presence, prefix and uniqueness -- never a numbering that a new call would shift).
CALL_FROM_PREFIX = "_call_"
_FROM_RX = re.compile(r"\s+from\s+(" + NAME + r")\s*$")
_LABEL_CALL_RX = re.compile(r"call\s+(?!screen\b)")


def call_from_problems(sources):
    """[(file, line, message)] for [(file, text)]: a label call without `from`, a `from` name without the prefix, used twice
    or equal to a label, and `from` on `call screen` (which does not take one)."""
    labels, froms, out = {}, {}, []
    for f, text in sources:
        try:
            lines = logical_lines(text)
        except RpyError:
            continue  # reported by the per-file check
        for ln, t in lines:
            body = t.strip()
            m = re.match(r"label\s+(" + NAME + ")", body)
            if m:
                labels.setdefault(m.group(1), (f, ln))
                continue
            if not re.match(r"call\s", body):
                continue
            fm = _FROM_RX.search(body)
            if not _LABEL_CALL_RX.match(body):
                if fm:
                    out.append((f, ln, "`call screen` takes no `from` clause"))
                continue
            if not fm:
                out.append((f, ln, "label call without `from`: a save made inside the called label may not load after the "
                                   "script changes (add `from %s<target>`)" % CALL_FROM_PREFIX))
                continue
            name = fm.group(1)
            if not name.startswith(CALL_FROM_PREFIX):
                out.append((f, ln, f"`from {name}`: return points are named {CALL_FROM_PREFIX}<target>[_<n>]"))
            if name in froms:
                out.append((f, ln, f"`from {name}` is already used at {froms[name][0]}:{froms[name][1]}"))
            else:
                froms[name] = (f, ln)
    for name, (f, ln) in froms.items():
        if name in labels:
            out.append((f, ln, f"`from {name}` is also a label ({labels[name][0]}:{labels[name][1]})"))
    return out


def strip_call_from(text):
    """`text` with the `from` clause of every label call removed; line endings and everything else untouched."""
    lines = text.split("\n")
    for ln, t in logical_lines(text):
        body = t.strip()
        if not (_LABEL_CALL_RX.match(body) and _FROM_RX.search(body)):
            continue
        end = ln - 1 + t.count("\n")  # the clause sits on the statement's last physical line
        cr = "\r" if lines[end].endswith("\r") else ""
        new, n = re.subn(r"\s+from\s+" + NAME + r"\s*$", "", lines[end][:len(lines[end]) - len(cr)])
        if n != 1:
            raise RpyError(end + 1, "`from` is not at the end of the call's last line")
        lines[end] = new + cr
    return "\n".join(lines)


@functools.lru_cache(maxsize=None)
def call_from_only_files():
    """Script files ("game/...") that differ from HEAD only by `from` clauses added to label calls (as git compares them:
    CRLF read as LF). The byte-for-byte guards of the older milestones accept exactly these; empty once committed or
    without git."""
    out = set()
    for p in sorted(GAME_DIR.rglob("*.rpy")):
        rel = p.relative_to(ROOT).as_posix()
        old = subprocess.run(["git", "show", f"HEAD:./{rel}"], cwd=str(ROOT), capture_output=True)
        if old.returncode:
            continue
        was = old.stdout.decode("utf-8-sig").replace("\r\n", "\n")
        now = p.read_bytes().decode("utf-8-sig").replace("\r\n", "\n")
        if now != was and strip_call_from(now) == was:
            out.add(rel)
    return frozenset(out)


def strict_files(paths):
    """`paths` minus the files whose only change is the save-compatibility `from` pass."""
    return [p for p in paths if p not in call_from_only_files()]


def check_project(game_dir=None):
    game_dir = Path(game_dir or GAME_DIR)
    files = [p for p in sorted(game_dir.rglob("*.rpy")) if p.parent.name != "tests"]
    sources = [(p.relative_to(game_dir).as_posix(), p.read_bytes().decode("utf-8-sig")) for p in files]
    every = [(p.relative_to(game_dir).as_posix(), p.read_bytes().decode("utf-8-sig")) for p in sorted(game_dir.rglob("*.rpy"))]
    return check_init_order(sources) + check_actions(files) + call_from_problems(every)


def main(argv):
    paths = [Path(a) for a in argv] or sorted(GAME_DIR.rglob("*.rpy"))
    res = check_all(paths)
    bad = 0
    n = 0
    for p, (errors, ctx) in res.items():
        n += ctx["n"]
        for ln, msg in errors:
            bad += 1
            print(f"{p.as_posix().split('paper-crane-detective/')[-1]}:{ln}: {msg}")
    if not argv and not bad:
        for f, ln, msg in check_project():
            bad += 1
            print(f"game/{f}:{ln}: {msg}")
    print(f"RPY_SYNTAX files={len(res)} statements={n} problems={bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
