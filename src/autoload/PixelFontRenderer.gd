extends Node
## Native Godot Label & LabelSettings Factory (`src/autoload/PixelFontRenderer.gd`) — PRD v2.2 Unified Architecture
## - Registered as Autoload `PixelFontRenderer`.
## - `pixel_font_atlas.png` slicing is completely disabled and removed.
## - All UI text, building levels, and `+Gold` floating text use native Godot `Label` nodes
##   with `LabelSettings` (`font_size = 14`, pure white or `#FFE066` gold, `outline_size = 2`, `outline_color = Color.BLACK`).

const COLOR_GOLD := Color("#FFE066")
const COLOR_WHITE := Color.WHITE

var _cn_font: SystemFont = null

func get_pixel_cn_font() -> Font:
	if _cn_font == null:
		_cn_font = SystemFont.new()
		_cn_font.font_names = PackedStringArray(["Microsoft YaHei UI", "Microsoft YaHei", "YouYuan", "SimHei"])
		_cn_font.font_weight = 700
		_cn_font.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
		_cn_font.generate_mipmaps = false
		_cn_font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	return _cn_font

func make_label_settings(
	font_size: int = 14,
	font_col: Color = COLOR_GOLD,
	outline_sz: int = 2,
	outline_col: Color = Color.BLACK
) -> LabelSettings:
	var ls := LabelSettings.new()
	ls.font = get_pixel_cn_font()
	ls.font_size = font_size
	ls.font_color = font_col
	ls.outline_size = outline_sz
	ls.outline_color = outline_col
	return ls

func create_label(
	text_str: String = "",
	font_size: int = 14,
	font_col: Color = COLOR_GOLD,
	align_center: bool = false
) -> Label:
	var lbl := Label.new()
	lbl.text = text_str
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	lbl.label_settings = make_label_settings(font_size, font_col, 2, Color.BLACK)
	if align_center:
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return lbl

func draw_pixel_string(canvas: CanvasItem, pos: Vector2, text_str: String, modulate_col: Color = COLOR_GOLD, align_center: bool = false, _scale_f: float = 1.0) -> void:
	draw_pixel_cn(canvas, pos, text_str, 14, modulate_col, Color.BLACK, align_center)

func draw_pixel_cn(
	canvas: CanvasItem,
	pos: Vector2,
	text_str: String,
	font_size: int = 14,
	text_col: Color = COLOR_WHITE,
	outline_col: Color = Color.BLACK,
	align_center: bool = false
) -> void:
	var f := get_pixel_cn_font()
	if f == null:
		return
	var draw_pos := Vector2(roundf(pos.x), roundf(pos.y))
	if align_center:
		var sz := f.get_string_size(text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
		draw_pos.x = roundf(pos.x - sz.x * 0.5)
	canvas.draw_string_outline(f, draw_pos, text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, 2, outline_col)
	canvas.draw_string(f, draw_pos, text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, text_col)
