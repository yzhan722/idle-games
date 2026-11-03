extends Node2D
class_name PixelFontRenderer
## Artisan Dual-Layer Typography & Puffy Pixel Number Renderer:
## 1) Puffy Golden-Orange Outlined Numbers from res://assets/pixel_art/ui/pixel_font_atlas.png
## 2) High-Legibility Warm Bold Chinese Typography (YouYuan / Microsoft YaHei UI Bold / SimHei)
##    with a 2px dark-walnut drop shadow, 8-tap crisp stroke, and warm ivory-gold face.

const GLYPH_MAP := {
	"0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
	"5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
	"+": 10, "-": 11, "G": 12, "/": 13, "x": 14, "!": 15
}
const GLYPH_W := 18
const ATLAS_CELL_W := 24
const ATLAS_CELL_H := 32

static var _atlas_tex: Texture2D = null
static var _artisan_cn_font: SystemFont = null

static func get_atlas() -> Texture2D:
	if _atlas_tex == null:
		_atlas_tex = load("res://assets/pixel_art/ui/pixel_font_atlas.png")
	return _atlas_tex

static func get_pixel_cn_font() -> Font:
	if _artisan_cn_font == null:
		_artisan_cn_font = SystemFont.new()
		# YouYuan & Microsoft YaHei UI Bold provide thick, warm, rounded strokes that read cleanly on wood/parchment plaques
		_artisan_cn_font.font_names = PackedStringArray(["YouYuan", "Microsoft YaHei UI", "Microsoft YaHei", "SimHei"])
		_artisan_cn_font.font_weight = 700
		_artisan_cn_font.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
		_artisan_cn_font.generate_mipmaps = false
		_artisan_cn_font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
		_artisan_cn_font.hinting = TextServer.HINTING_NORMAL
	return _artisan_cn_font

static func draw_pixel_string(canvas: CanvasItem, pos: Vector2, text_str: String, modulate_col: Color = Color.WHITE, align_center: bool = false, scale_f: float = 1.0) -> void:
	var tex := get_atlas()
	if tex == null:
		return
	var step_w := roundf(GLYPH_W * scale_f)
	var cell_w := roundf(ATLAS_CELL_W * scale_f)
	var cell_h := roundf(ATLAS_CELL_H * scale_f)
	var total_w := text_str.length() * step_w
	var start_x := roundf(pos.x - (total_w * 0.5 if align_center else 0.0))
	var start_y := roundf(pos.y)
	for i in range(text_str.length()):
		var ch := text_str.substr(i, 1)
		if GLYPH_MAP.has(ch):
			var idx: int = GLYPH_MAP[ch]
			var src_rect := Rect2(idx * ATLAS_CELL_W, 0, ATLAS_CELL_W, ATLAS_CELL_H)
			var dst_rect := Rect2(start_x + i * step_w, start_y, cell_w, cell_h)
			canvas.draw_texture_rect_region(tex, dst_rect, src_rect, modulate_col)

static func draw_pixel_cn(
	canvas: CanvasItem,
	pos: Vector2,
	text_str: String,
	font_size: int = 13,
	text_col: Color = Color(1.0, 0.96, 0.86, 1.0),
	outline_col: Color = Color(0.14, 0.06, 0.02, 0.96),
	align_center: bool = false
) -> void:
	var f := get_pixel_cn_font()
	if f == null:
		return
	var draw_pos := Vector2(roundf(pos.x), roundf(pos.y))
	if align_center:
		var sz := f.get_string_size(text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
		draw_pos.x = roundf(pos.x - sz.x * 0.5)
	# 1) Deep walnut 2px drop shadow for 3D plaque depth
	canvas.draw_string(f, draw_pos + Vector2(0, 2), text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(0.06, 0.02, 0.01, 0.78))
	canvas.draw_string(f, draw_pos + Vector2(1, 2), text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(0.06, 0.02, 0.01, 0.78))
	# 2) Crisp 8-tap dark walnut border
	var offsets := [
		Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1),
		Vector2(-1, -1), Vector2(1, -1), Vector2(-1, 1), Vector2(1, 1)
	]
	for off in offsets:
		canvas.draw_string(f, draw_pos + off, text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, outline_col)
	# 3) Warm face glyph
	canvas.draw_string(f, draw_pos, text_str, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, text_col)
