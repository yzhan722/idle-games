extends Node2D
class_name Workshop
## Mortar & Cauldron Workshop Component (`src/entities/buildings/Workshop.gd`) — PRD Phase 2
## Includes:
## - Input Slot Buffer visualization (left side)
## - Active Crafting Progress Bar when Fox / Penguin is crafting
## - Output Slot Buffer visualization (right side)

@export var workshop_id: String = "mortar" # "mortar" or "cauldron"
@export var draw_offset: Vector2 = Vector2(-34.0, -52.0)

var tex_building: Texture2D
var tex_crops: Texture2D
var tex_delicacies: Texture2D
var is_processing: bool = false
var process_progress: float = 0.0
var active_delicacy_id: String = "delicacy_0"
var anim_time: float = 0.0

func _ready() -> void:
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")
	_reload_texture()

func setup_workshop(p_id: String, p_pos: Vector2, p_offset: Vector2) -> void:
	workshop_id = p_id
	position = p_pos
	draw_offset = p_offset
	_reload_texture()

func _reload_texture() -> void:
	if workshop_id == "cauldron":
		tex_building = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
		active_delicacy_id = "delicacy_2"
	else:
		tex_building = load("res://assets/pixel_art/buildings/workshop_mortar.png")
		active_delicacy_id = "delicacy_0"

func _process(delta: float) -> void:
	anim_time += delta
	var isl := 2 if workshop_id == "cauldron" else 1
	visible = bool(GameManager.unlocked_islands.get(isl, true))
	queue_redraw()

func _draw() -> void:
	if tex_building == null:
		return
	draw_circle(Vector2(0, 2), 20.0, Color(0.06, 0.04, 0.02, 0.30))
	draw_texture(tex_building, draw_offset)

	# 1. Input Slot Buffer (left of workshop)
	var in_total := GameManager.get_workshop_input_total(workshop_id)
	if in_total > 0 and tex_crops != null:
		var in_crop := "crop_2" if workshop_id == "cauldron" else "crop_0"
		var c_reg := EconomyConfig.get_crop_stage_region(in_crop, 3)
		draw_texture_rect_region(tex_crops, Rect2(-32, -22, 18, 18), c_reg)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(-34, -24), "入" + str(in_total), 11, Color(0.82, 0.98, 1.0), Color(0.12, 0.05, 0.02, 0.95), false)

	# 2. Output Slot Buffer (right of workshop)
	var out_total := GameManager.get_workshop_output_total(workshop_id)
	if out_total > 0 and tex_delicacies != null:
		var d_reg := EconomyConfig.get_delicacy_region(active_delicacy_id)
		var bob := roundf(sin(anim_time * 2.2) * 1.5)
		draw_texture_rect_region(tex_delicacies, Rect2(14, -24 + bob, 20, 20), d_reg)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(14, -26 + bob), "出" + str(out_total), 11, Color(1.0, 0.94, 0.55), Color(0.14, 0.06, 0.02, 0.95), false)

	# 3. Active Crafting Progress Bar above Workshop
	if is_processing:
		var bar_w := 40.0
		var bar_h := 6.0
		var bx := -bar_w * 0.5
		var by := draw_offset.y - 10.0
		draw_rect(Rect2(bx - 1, by - 1, bar_w + 2, bar_h + 2), Color(0.16, 0.08, 0.02, 0.95), true)
		draw_rect(Rect2(bx, by, bar_w * clampf(process_progress, 0.0, 1.0), bar_h), Color(0.45, 0.95, 0.42, 0.98), true)
		if tex_delicacies != null:
			var d_reg := EconomyConfig.get_delicacy_region(active_delicacy_id)
			draw_texture_rect_region(tex_delicacies, Rect2(-10, by - 20, 18, 18), d_reg)
