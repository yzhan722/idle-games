extends Node2D
class_name SoilPlot
## 1.5D Feathered Soil Bed + Lv.25 Crop Auto-Evolution + 4-Tier Visual Upgrader (`src/entities/buildings/SoilPlot.gd`) — PRD Patch v2.2

@export var island_idx: int = 1
@export var plot_index_on_island: int = 0
@export var crop_id: String = "crop_0"

var tex_soil: Texture2D
var tex_crops: Texture2D
var visual_upgrader: BuildingVisualUpgrader

var sown: bool = true
var watered: bool = true
var growth: float = 0.35
var reserved_by_worker: bool = false
var sway_time: float = 0.0

func _ready() -> void:
	tex_soil = load("res://assets/pixel_art/islands/soil_plot.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	sway_time = randf() * 6.28

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	var b_key := "soil_" + str(island_idx)
	visual_upgrader.setup_upgrader(self, "soil", int(GameManager.building_levels.get(b_key, 1)))
	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func setup_plot(p_island: int, p_idx_on_island: int, p_crop_id: String, p_pos: Vector2) -> void:
	island_idx = p_island
	plot_index_on_island = p_idx_on_island
	crop_id = p_crop_id
	position = p_pos
	growth = randf_range(0.30, 0.88)
	watered = true
	_refresh_evolved_crop()

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == ("soil_" + str(island_idx)):
		_refresh_evolved_crop()
		if visual_upgrader != null and plot_index_on_island == 0:
			visual_upgrader.apply_level_visuals(new_level, true)

func _refresh_evolved_crop() -> void:
	var b_key := "soil_" + str(island_idx)
	var b_lv := int(GameManager.building_levels.get(b_key, 1))
	crop_id = EconomyConfig.get_evolved_crop_id(island_idx, b_lv)

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
		var base_dur := float(c_cfg.get("grow_time", 5.5))
		var b_key := "soil_" + str(island_idx)
		var b_lv := int(GameManager.building_levels.get(b_key, 1))
		var speed_mult := (1.35 if watered else 1.0) * (1.0 + 0.06 * float(b_lv - 1))
		growth = minf(1.0, growth + (delta * speed_mult) / base_dur)
	queue_redraw()

func harvest_crop_yield() -> int:
	_refresh_evolved_crop()
	var b_key := "soil_" + str(island_idx)
	var b_lv := int(GameManager.building_levels.get(b_key, 1))
	var qty := 1 + int(floor(float(b_lv) / 25.0))
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
		# Columns 0..2 in `crops_sheet.png` are soil-planted growth stages (Seed, Sprout, Mature Plant in soil);
		# Column 3 is the harvested produce icon carried by workers & shown in thought bubbles!
		var stage := clampi(int(floor(growth * 2.99)), 0, 2)
		var crop_reg := EconomyConfig.get_crop_stage_region(crop_id, stage)
		var sway_x := roundf(sin(sway_time * 1.4 + position.x * 0.05) * (1.0 if stage >= 2 else 0.0))
		draw_texture_rect_region(tex_crops, Rect2(-15 + sway_x, -26, 30, 30), crop_reg)
