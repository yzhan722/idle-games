extends Node2D
class_name SoilPlot
## Enlarged 1.5D Soil Bed (`64x26`), 3-Stage Crop Growth, Buffer Cap 10 & Lv.25 Auto-Evolution (`src/entities/buildings/SoilPlot.gd`)
## Strictly enforces PRD v2.2 & GEMINI.md Laws 2, 3, 4, 5:
## - Root `position = Vector2(slot_x, GROUND_Y)` is the bottom-center grounding point.
## - `soil_sprite`: `z_index = -2`, `hframes = 4, vframes = 1`, `region_enabled = false`, `centered = true`, `offset = Vector2(0.0, -float(18) * 0.5)`.
## - `crop_sprite`: `z_index = 1`, `hframes = 4, vframes = 4`, `region_enabled = false`, `centered = true`, `offset = Vector2(0.0, -float(40) * 0.5)`.
## - Implements 3 growth stages (`Stage 0: Seed -> Stage 1: Sprout -> Stage 2: Mature`) on `crops_sheet_normalized.png`.
## - Enforces pure numeric buffer cap (default `10`, `+5/lv`), pausing growth/harvest when full so Bunny displays `"Zzz..."` bubble.
## - Every 25 building levels (`Lv.25 / Lv.50 / Lv.75`), automatically evolves crop species to the next row and doubles (`2x`) harvest yield!

const VISUAL_WIDTH := 64.0
const VISUAL_HEIGHT := 26.0
const DEFAULT_BASKET_CAP := 10

enum GrowthStage {
	SEED = 0,
	SPROUT = 1,
	MATURE = 2
}

@export var island_idx: int = 1
@export var plot_index_on_island: int = 0
@export var crop_id: String = "crop_0"

var tex_soil: Texture2D
var tex_crops: Texture2D
var soil_sprite: Sprite2D
var crop_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label

var sown: bool = true
var watered: bool = true
var growth: float = 0.35
var current_stage: GrowthStage = GrowthStage.SEED
var reserved_by_worker: bool = false
var sway_time: float = 0.0
var harvest_count: int = 0
var total_crops_harvested: int = 0

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false
	tex_soil = load("res://assets/pixel_art/islands/soil_plot_normalized.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	sway_time = randf() * TAU

	# GEMINI.md Law 2.2 & 2.3 & 4.2: Soil base Sprite2D (`z_index = -2`, `hframes = 4, vframes = 1`, `region_enabled = false`, bottom-center pivot)
	soil_sprite = Sprite2D.new()
	soil_sprite.name = "SoilBaseSprite"
	soil_sprite.texture = tex_soil
	soil_sprite.region_enabled = false
	soil_sprite.hframes = 4
	soil_sprite.vframes = 1
	soil_sprite.frame = 2
	soil_sprite.centered = true
	soil_sprite.offset = Vector2(0.0, -float(18) * 0.5)
	soil_sprite.scale = Vector2(1.6, 1.44)
	soil_sprite.z_index = EconomyConfig.Z_SOIL_BASE
	soil_sprite.z_as_relative = false
	add_child(soil_sprite)

	# GEMINI.md Law 2.2 & 2.3 & 4.2: Crop Sprite2D (`z_index = 1`, `hframes = 4, vframes = 4`, `region_enabled = false`, bottom-center pivot)
	crop_sprite = Sprite2D.new()
	crop_sprite.name = "CropSprite"
	crop_sprite.texture = tex_crops
	crop_sprite.region_enabled = false
	crop_sprite.hframes = 4
	crop_sprite.vframes = 4
	crop_sprite.frame = 0
	crop_sprite.centered = true
	crop_sprite.offset = Vector2(0.0, -float(40) * 0.5)
	crop_sprite.position = Vector2(0.0, -6.0)
	crop_sprite.scale = Vector2(0.85, 0.85)
	crop_sprite.z_index = EconomyConfig.Z_CROP
	crop_sprite.z_as_relative = false
	add_child(crop_sprite)

	var cur_lv := get_building_level()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "soil", cur_lv)

	if plot_index_on_island == 0:
		level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
		level_label.position = Vector2(-28.0, 2.0)
		level_label.custom_minimum_size = Vector2(56.0, 20.0)
		add_child(level_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
	_refresh_evolved_crop()
	_sync_sprites()

func setup_plot(p_island: int, p_idx_on_island: int, p_crop_id: String, p_pos: Vector2) -> void:
	island_idx = p_island
	plot_index_on_island = p_idx_on_island
	crop_id = p_crop_id
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	growth = randf_range(0.35, 0.88)
	watered = true
	_refresh_evolved_crop()
	_sync_sprites()

func get_building_key() -> String:
	return "soil_" + str(island_idx)

func get_building_level() -> int:
	return maxi(1, int(GameManager.building_levels.get(get_building_key(), 1)))

func get_milestone_tier() -> int:
	return int(floor(float(get_building_level()) / 25.0))

func get_milestone_yield_multiplier() -> int:
	return int(round(pow(2.0, float(get_milestone_tier()))))

func get_basket_capacity() -> int:
	if GameManager != null:
		return GameManager.get_raw_basket_max_cap(island_idx)
	return DEFAULT_BASKET_CAP

func is_output_buffer_blocked() -> bool:
	if GameManager == null:
		return false
	var otter_hired := GameManager.is_island_otter_hired(island_idx)
	if otter_hired:
		return GameManager.is_raw_basket_full(island_idx)
	elif island_idx == 1:
		return GameManager.is_stall_full()
	return GameManager.is_raw_basket_full(island_idx)

func get_screen_rect() -> Rect2:
	var w := VISUAL_WIDTH * scale.x
	var h := VISUAL_HEIGHT * scale.y
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == get_building_key():
		_refresh_evolved_crop()
		if level_label != null:
			level_label.text = "Lv." + str(new_level)
		if visual_upgrader != null and plot_index_on_island == 0:
			visual_upgrader.apply_level_visuals(new_level, true)

func _refresh_evolved_crop() -> void:
	crop_id = EconomyConfig.get_evolved_crop_id(island_idx, get_building_level())

func is_plot_active() -> bool:
	if not bool(GameManager.unlocked_islands.get(island_idx, false)):
		return false
	return plot_index_on_island < GameManager.get_unlocked_plot_count(island_idx)

func _compute_growth_stage(g: float) -> GrowthStage:
	if g >= 0.72:
		return GrowthStage.MATURE
	elif g >= 0.34:
		return GrowthStage.SPROUT
	return GrowthStage.SEED

func is_ready_for_harvest() -> bool:
	return sown and growth >= 0.72

func apply_farmer_tending(tending_delta: float) -> void:
	watered = true
	if sown and growth < 1.0:
		growth = minf(1.0, growth + tending_delta * 0.24)
		current_stage = _compute_growth_stage(growth)
		_sync_sprites()

func _process(delta: float) -> void:
	sway_time += delta
	visible = is_plot_active()
	if not visible:
		return

	if sown and growth < 1.0:
		var c_cfg: Dictionary = EconomyConfig.CROPS.get(crop_id, EconomyConfig.CROPS["crop_0"])
		var base_dur := float(c_cfg.get("grow_time", 5.2))
		var b_lv := get_building_level()
		var weather_mult := GameManager.get_weather_crop_growth_multiplier() if GameManager != null else 1.0
		var speed_mult := (1.35 if watered else 1.0) * (1.0 + 0.06 * float(b_lv - 1)) * weather_mult
		growth = minf(1.0, growth + (delta * speed_mult) / maxf(1.0, base_dur))

	current_stage = _compute_growth_stage(growth)
	_sync_sprites()

func _sync_sprites() -> void:
	if soil_sprite != null:
		var st_idx := 0
		if sown:
			if growth >= 0.92:
				st_idx = 3
			elif watered:
				st_idx = 2
			else:
				st_idx = 1
		soil_sprite.frame = clampi(st_idx, 0, 3)

	if crop_sprite != null:
		crop_sprite.visible = sown
		if sown:
			var c_data: Dictionary = EconomyConfig.CROPS.get(crop_id, EconomyConfig.CROPS["crop_0"])
			var row := clampi(int(c_data.get("crop_row", 0)), 0, 3)
			var stage_col := int(current_stage) # 0 = Seed, 1 = Sprout, 2 = Mature in-ground
			crop_sprite.frame = row * 4 + clampi(stage_col, 0, 2)
			var sway_amp := 1.2 if current_stage == GrowthStage.MATURE else (0.5 if current_stage == GrowthStage.SPROUT else 0.0)
			var sway_x := roundf(sin(sway_time * 1.6 + position.x * 0.05) * sway_amp)
			crop_sprite.position = Vector2(sway_x, -6.0)

func harvest_crop_yield() -> int:
	_refresh_evolved_crop()
	# PRD v2.2 Section 3 & 4: Multiplies unlocked ridge slot count (`1x -> 2x` at Lv.2+) and Lv.25 milestone (`2x` per 25 levels)!
	var ridge_slots := maxi(1, GameManager.get_unlocked_plot_count(island_idx)) if GameManager != null else 1
	var qty := maxi(1, get_milestone_yield_multiplier() * ridge_slots)
	harvest_count += 1
	total_crops_harvested += qty
	sown = true
	watered = true
	growth = 0.05
	current_stage = GrowthStage.SEED
	reserved_by_worker = false
	_sync_sprites()

	if crop_sprite != null and is_inside_tree():
		var tw := create_tween()
		tw.tween_property(crop_sprite, "scale", Vector2(1.02, 0.72), 0.06)
		tw.tween_property(crop_sprite, "scale", Vector2(0.85, 0.85), 0.10)

	if EventBus != null:
		EventBus.item_produced.emit(island_idx, crop_id, qty)
	return qty
