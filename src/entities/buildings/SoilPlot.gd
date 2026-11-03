extends Node2D
class_name SoilPlot
## 1.5D Feathered Soil Bed + Crop Growth + Fieldside RawStorageBasket (`src/entities/buildings/SoilPlot.gd`) — PRD Phase 2
## - Supports autonomous Bunny Farmer tending/harvesting into RawStorageBasket
## - Supports manual player click to accelerate growth / harvest into RawStorageBasket

@export var island_idx: int = 1
@export var crop_id: String = "crop_0"
@export var is_basket_anchor: bool = false
@export var basket_offset: Vector2 = Vector2(-34.0, 4.0)

var tex_soil: Texture2D
var tex_crops: Texture2D
var tex_parchment: Texture2D

var sown: bool = true
var watered: bool = true
var growth: float = 0.25
var reserved_by_worker: bool = false
var sway_time: float = 0.0

func _ready() -> void:
	tex_soil = load("res://assets/pixel_art/islands/soil_plot.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	sway_time = randf() * 6.28

func setup_plot(p_island: int, p_crop_id: String, p_pos: Vector2, p_is_basket_anchor: bool = false) -> void:
	island_idx = p_island
	crop_id = p_crop_id
	position = p_pos
	is_basket_anchor = p_is_basket_anchor
	growth = randf_range(0.18, 0.82)
	watered = (randi() % 2 == 0)

func _process(delta: float) -> void:
	sway_time += delta
	if not bool(GameManager.unlocked_islands.get(island_idx, true)):
		visible = false
		return
	visible = true

	if sown and growth < 1.0:
		var c_cfg: Dictionary = EconomyConfig.CROPS.get(crop_id, EconomyConfig.CROPS["crop_0"])
		var base_dur := float(c_cfg.get("grow_time", 7.0))
		var b_key := "soil_" + str(island_idx)
		var b_lv := int(GameManager.building_levels.get(b_key, 1))
		var speed_mult := (1.35 if watered else 1.0) * (1.0 + 0.06 * float(b_lv - 1))
		growth = minf(1.0, growth + (delta * speed_mult) / base_dur)
	queue_redraw()

func handle_manual_click(world_mouse: Vector2) -> bool:
	if not visible:
		return false
	if position.distance_to(world_mouse) <= 22.0:
		if not sown:
			sown = true
			watered = true
			growth = 0.25
			EventBus.spawn_floating_text.emit(position + Vector2(-18, -28), "加速播种!", Color(0.75, 1.0, 0.65))
		elif growth < 1.0:
			watered = true
			growth = minf(1.0, growth + 0.40)
			EventBus.spawn_floating_text.emit(position + Vector2(-18, -28), "生长+40%", Color(0.68, 0.95, 1.0))
		else:
			var qty := harvest_into_basket()
			EventBus.spawn_floating_text.emit(position + Vector2(-20, -32), "入篮+" + str(qty), Color(1.0, 0.92, 0.45))
		return true
	return false

func harvest_into_basket() -> int:
	var b_key := "soil_" + str(island_idx)
	var b_lv := int(GameManager.building_levels.get(b_key, 1))
	var qty := 1 + int(floor(float(b_lv) / 5.0))
	GameManager.add_to_raw_basket(island_idx, crop_id, qty)
	sown = true
	watered = false
	growth = 0.05
	reserved_by_worker = false
	return qty

func _draw() -> void:
	if tex_soil != null:
		var st_idx := 0
		if sown:
			if growth >= 0.96:
				st_idx = 3
			elif watered:
				st_idx = 2
			else:
				st_idx = 1
		var soil_reg := EconomyConfig.get_frame_region("islands/soil_plot.png", st_idx)
		draw_texture_rect_region(tex_soil, Rect2(-20, -9, 40, 18), soil_reg)

	if sown and tex_crops != null:
		var stage := clampi(int(floor(growth * 3.99)), 0, 3)
		var crop_reg := EconomyConfig.get_crop_stage_region(crop_id, stage)
		var sway_x := roundf(sin(sway_time * 1.4 + position.x * 0.05) * (1.0 if stage >= 2 else 0.0))
		draw_texture_rect_region(tex_crops, Rect2(-15 + sway_x, -26, 30, 30), crop_reg)

	# Render the Fieldside RawStorageBasket (【田边菜篮】) if this plot is the island's basket anchor
	if is_basket_anchor:
		var bx := basket_offset.x
		var by := basket_offset.y
		# Woven wicker basket base & rim
		draw_circle(Vector2(bx, by + 3), 12.0, Color(0.08, 0.05, 0.02, 0.35))
		draw_rect(Rect2(bx - 12, by - 6, 24, 11), Color(0.58, 0.36, 0.16, 0.98), true)
		draw_rect(Rect2(bx - 13, by - 8, 26, 4), Color(0.76, 0.52, 0.24, 0.98), true)
		draw_rect(Rect2(bx - 12, by - 6, 24, 11), Color(0.28, 0.14, 0.04, 0.95), false, 1.0)

		var total_raw := GameManager.get_island_basket_total(island_idx)
		if total_raw > 0 and tex_crops != null:
			var show_n := mini(total_raw, 3)
			for i in range(show_n):
				var c_reg := EconomyConfig.get_crop_stage_region(crop_id, 3)
				draw_texture_rect_region(tex_crops, Rect2(bx - 11 + i * 5, by - 19 - (i % 2) * 2, 16, 16), c_reg)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(bx - 12, by - 20), "篮x" + str(total_raw), 11, Color(1.0, 0.95, 0.68), Color(0.16, 0.06, 0.02, 0.95), false)
