extends Node2D
class_name SoilPlot
## 1.5D Feathered Soil Bed + Autonomous Crop Growth (`src/entities/buildings/SoilPlot.gd`) — PRD Patch v2.1
## - 100% Zero-Click Idle: NO manual player click harvesting or acceleration!
## - Clean Pixel Art: RawStorageBasket is maintained purely as a backend numeric buffer in GameManager
##   (no visual stacked icons drawn beside the soil plots!).

@export var island_idx: int = 1
@export var plot_index_on_island: int = 0
@export var crop_id: String = "crop_0"

var tex_soil: Texture2D
var tex_crops: Texture2D

var sown: bool = true
var watered: bool = true
var growth: float = 0.35
var reserved_by_worker: bool = false
var sway_time: float = 0.0

func _ready() -> void:
	tex_soil = load("res://assets/pixel_art/islands/soil_plot.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	sway_time = randf() * 6.28

func setup_plot(p_island: int, p_idx_on_island: int, p_crop_id: String, p_pos: Vector2) -> void:
	island_idx = p_island
	plot_index_on_island = p_idx_on_island
	crop_id = p_crop_id
	position = p_pos
	growth = randf_range(0.30, 0.88)
	watered = true

func is_plot_active() -> bool:
	if not bool(GameManager.unlocked_islands.get(island_idx, false)):
		return false
	return plot_index_on_island < GameManager.get_unlocked_plot_count(island_idx)

func _process(delta: float) -> void:
	sway_time += delta
	visible = is_plot_active()
	if not visible:
		return

	if sown and growth < 1.0:
		var c_cfg: Dictionary = EconomyConfig.CROPS.get(crop_id, EconomyConfig.CROPS["crop_0"])
		var base_dur := float(c_cfg.get("grow_time", 6.0))
		var b_key := "soil_" + str(island_idx)
		var b_lv := int(GameManager.building_levels.get(b_key, 1))
		var speed_mult := (1.35 if watered else 1.0) * (1.0 + 0.06 * float(b_lv - 1))
		growth = minf(1.0, growth + (delta * speed_mult) / base_dur)
	queue_redraw()

func harvest_crop_yield() -> int:
	var b_key := "soil_" + str(island_idx)
	var b_lv := int(GameManager.building_levels.get(b_key, 1))
	var qty := 1 + int(floor(float(b_lv) / 5.0))
	sown = true
	watered = true
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
