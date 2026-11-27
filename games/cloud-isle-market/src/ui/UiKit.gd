extends RefCounted
class_name UiKit
## Shared look of every panel (`src/ui/UiKit.gd`): one font family, one size scale, one palette, nine-patch frames from the
## game's own pixel art. Text is always drawn at its real font size: no Label is ever scaled to make it fit.

const FONT_REGULAR_PATH := "res://assets/fonts/NotoSansSC-Regular.otf"
const FONT_BOLD_PATH := "res://assets/fonts/NotoSansSC-Bold.otf"
const ART := "res://assets/pixel_art/"

## Logical font sizes (multiplied by the menu's interface-size factor). Nothing in the game is smaller than `MIN`.
const MIN := 15
const BODY := 16
const BUTTON := 17
const CARD_TITLE := 19
const SECTION := 18
const TITLE := 26

const CREAM := Color("#FFF4D6")
const MUTED := Color("#E3CFA8")
const GOLD := Color("#FFE066")
const GREEN := Color("#B6F2A0")
const RED := Color("#FFB3A7")
const BLUE := Color("#9FD8FF")

static var _regular: Font = null
static var _bold: Font = null
static var _boxes: Dictionary = {}
static var _atlas: Dictionary = {}

static func font(bold: bool = false) -> Font:
	if _bold == null:
		_bold = load(FONT_BOLD_PATH) as Font
		# The regular weight is a touch thin on the wooden panels: thickened to about a medium weight
		var v := FontVariation.new()
		v.base_font = load(FONT_REGULAR_PATH) as Font
		v.variation_embolden = 0.35
		_regular = v
	return _bold if bold else _regular

static func settings(size: int, color: Color, bold: bool = false, outline: int = 0) -> LabelSettings:
	var ls := LabelSettings.new()
	ls.font = font(bold)
	ls.font_size = size
	ls.font_color = color
	if outline > 0:
		ls.outline_size = outline
		ls.outline_color = Color("#1A120B")
	return ls

## A label with its own LabelSettings (recolouring one never leaks into another)
static func label(text: String, size: int, color: Color, bold: bool = false, outline: int = 0) -> Label:
	var l := Label.new()
	l.text = text
	l.label_settings = settings(size, color, bold, outline)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l

## Nine-patch style box: `m` = texture margins [l, t, r, b], `c` = content margins [l, t, r, b]
static func box(tex_path: String, m: Array, c: Array, mod: Color = Color.WHITE) -> StyleBoxTexture:
	var key := "%s|%s|%s|%s" % [tex_path, str(m), str(c), mod.to_html()]
	if _boxes.has(key):
		return _boxes[key]
	var b := StyleBoxTexture.new()
	b.texture = load(ART + tex_path)
	b.texture_margin_left = float(m[0])
	b.texture_margin_top = float(m[1])
	b.texture_margin_right = float(m[2])
	b.texture_margin_bottom = float(m[3])
	b.content_margin_left = float(c[0])
	b.content_margin_top = float(c[1])
	b.content_margin_right = float(c[2])
	b.content_margin_bottom = float(c[3])
	b.modulate_color = mod
	_boxes[key] = b
	return b

static func flat(color: Color, c: Array = [0, 0, 0, 0]) -> StyleBoxFlat:
	var b := StyleBoxFlat.new()
	b.bg_color = color
	b.content_margin_left = float(c[0])
	b.content_margin_top = float(c[1])
	b.content_margin_right = float(c[2])
	b.content_margin_bottom = float(c[3])
	return b

static func pill_box(c: Array = [12, 2, 12, 2]) -> StyleBoxTexture:
	return box("ui/ui_resource_pill.png", [12, 10, 12, 10], c)

## Wooden plate; "off" = resting, "on" = hovered / selected, "pressed"
static func button_box(state: String, c: Array = [12, 4, 12, 4]) -> StyleBoxTexture:
	var tex := "ui/btn_normal.png"
	if state == "on":
		tex = "ui/btn_hover.png"
	elif state == "pressed":
		tex = "ui/btn_pressed.png"
	return box(tex, [11, 11, 11, 11], c)

static func icon_rect(px: float) -> TextureRect:
	var t := TextureRect.new()
	t.custom_minimum_size = Vector2(px, px)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

static func atlas(tex_path: String, region: Rect2) -> AtlasTexture:
	var key := tex_path + str(region)
	if not _atlas.has(key):
		var a := AtlasTexture.new()
		a.atlas = load(ART + tex_path)
		a.region = region
		_atlas[key] = a
	return _atlas[key]

## Short number in the player's language: zh / ja 1.2万, 3.4亿; en 12.3K, 4.5M
static func num(n: int) -> String:
	var v := float(absi(n))
	var neg := "-" if n < 0 else ""
	if EconomyConfig.current_lang == "en_US":
		if v >= 1.0e12:
			return neg + _trim(v / 1.0e12) + "T"
		if v >= 1.0e9:
			return neg + _trim(v / 1.0e9) + "B"
		if v >= 1.0e6:
			return neg + _trim(v / 1.0e6) + "M"
		if v >= 1.0e4:
			return neg + _trim(v / 1.0e3) + "K"
		return str(n)
	if v >= 1.0e12:
		return neg + _trim(v / 1.0e12) + ("兆" if EconomyConfig.current_lang == "ja_JP" else "万亿")
	if v >= 1.0e8:
		return neg + _trim(v / 1.0e8) + ("億" if EconomyConfig.current_lang == "ja_JP" else "亿")
	if v >= 1.0e4:
		return neg + _trim(v / 1.0e4) + ("万")
	return str(n)

static func _trim(v: float) -> String:
	# rounded down, so a price is never shown as affordable one step too early
	if v >= 100.0:
		return str(int(floor(v)))
	var t := "%.1f" % (floor(v * 10.0) / 10.0)
	return t.trim_suffix(".0")

static func clock(sec: float) -> String:
	var s := maxi(0, int(ceil(sec)))
	if s >= 3600:
		return "%d:%02d:%02d" % [s / 3600, (s / 60) % 60, s % 60]
	return "%d:%02d" % [s / 60, s % 60]

static func text_width(lbl: Label) -> float:
	return lbl.label_settings.font.get_string_size(lbl.text, HORIZONTAL_ALIGNMENT_LEFT, -1, lbl.label_settings.font_size).x

## Drops the cached fonts, frames and icon slices (the game is closing)
static func release() -> void:
	_regular = null
	_bold = null
	_boxes.clear()
	_atlas.clear()
