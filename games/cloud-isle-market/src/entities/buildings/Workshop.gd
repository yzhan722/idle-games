extends Node2D
class_name Workshop
## Mortar, Cauldron & Island 3 Dual Workshop (`src/entities/buildings/Workshop.gd`)
## Strictly enforces PRD v2.2 & GEMINI.md Laws 2, 3, 5:
## - Root `position = Vector2(slot_x, GROUND_Y)` is the bottom-center grounding point (`z_index = 0`).
## - Supports `workshop_mortar.png` (3.5x), `workshop_cauldron.png` (12x), and Island 3 linked dual workshop (`orbis_linked`, 52x).
## - Manages dual numeric Input & Output buffers (`GameManager.workshop_inputs` & `workshop_outputs`, base cap = 10, +5/lv).
## - Renders both a circular progress ring and a crisp horizontal progress bar above the workshop during active crafting.
## - Every 25 workshop levels (`Lv.25 / Lv.50 / Lv.75`), automatically evolves output recipe along `delicacies_sheet_normalized.png` and doubles value (`2x`)!

const BASE_SPRITE_SCALE := 0.85
const VISUAL_WIDTH := 57.8 # 68 * 0.85
const VISUAL_HEIGHT := 51.0
## CI-11: Island 1 re-slotted to 7 buildings (incl. `DairyWorkshop_1`) -> mortar footprint 36.04px keeps every gap >= 28px
const MORTAR_SPRITE_SCALE := 0.53
const MORTAR_VISUAL_WIDTH := 36.04 # 68 * 0.53
const MORTAR_VISUAL_HEIGHT := 30.74 # 58 * 0.53
## CI-9: Island 2 re-slotted to 6 buildings (incl. `ChefTastingPavilion_2`) -> cauldron footprint 44.2px keeps every gap >= 28px
const CAULDRON_SPRITE_SCALE := 0.65
const CAULDRON_VISUAL_WIDTH := 44.2 # 68 * 0.65
const CAULDRON_VISUAL_HEIGHT := 40.3 # 62 * 0.65
## CI-10: Island 3 re-slotted to 6 buildings (incl. `LighthouseHarbor_3`) -> the dual mortar + cauldron workshop keeps its
## original composition (cauldron 0.8x the mortar, offset to the right so the mortar bowl peeks out) scaled to 61%, and now
## reports its honest union footprint: mortar (68*0.522 = 35.5px @ x-3.75) + cauldron (68*0.4176 = 28.4px @ x+7.3) = 43.0px.
const ORBIS_SPRITE_SCALE := 0.522
const ORBIS_SECONDARY_SCALE := 0.4176
const ORBIS_BODY_X := -3.75
const ORBIS_SECONDARY_X := 7.3
const ORBIS_VISUAL_WIDTH := 43.0
const ORBIS_VISUAL_HEIGHT := 30.3 # 58 * 0.522
const DEFAULT_BUFFER_CAP := 10

@export var workshop_id: String = "mortar" # "mortar", "cauldron", or "orbis_linked"
@export var island_idx: int = 1

var tex_building: Texture2D
var tex_secondary: Texture2D
var tex_delicacies: Texture2D
var body_sprite: Sprite2D
var secondary_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label

var is_processing: bool = false
var _was_processing: bool = false
var process_progress: float = 0.0
var _chef_progress: Dictionary = {}
var work_anim_time: float = 0.0
var crafted_count: int = 0

func set_chef_progress(chef_key: String, prog: float, active: bool) -> void:
	if active:
		_chef_progress[chef_key] = clampf(prog, 0.0, 1.0)
	else:
		_chef_progress.erase(chef_key)
	if _chef_progress.is_empty():
		is_processing = false
		process_progress = 0.0
	else:
		is_processing = true
		var best_p := 0.0
		for k in _chef_progress.keys():
			best_p = maxf(best_p, float(_chef_progress[k]))
		process_progress = best_p

func get_base_sprite_scale() -> float:
	if workshop_id == "cauldron":
		return CAULDRON_SPRITE_SCALE
	if workshop_id == "orbis_linked":
		return ORBIS_SPRITE_SCALE
	return MORTAR_SPRITE_SCALE if workshop_id == "mortar" else BASE_SPRITE_SCALE

func get_visual_width() -> float:
	if workshop_id == "cauldron":
		return CAULDRON_VISUAL_WIDTH
	if workshop_id == "orbis_linked":
		return ORBIS_VISUAL_WIDTH
	return MORTAR_VISUAL_WIDTH if workshop_id == "mortar" else VISUAL_WIDTH

func get_visual_height() -> float:
	if workshop_id == "cauldron":
		return CAULDRON_VISUAL_HEIGHT
	if workshop_id == "orbis_linked":
		return ORBIS_VISUAL_HEIGHT
	return MORTAR_VISUAL_HEIGHT if workshop_id == "mortar" else VISUAL_HEIGHT

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")

	var base_sc := get_base_sprite_scale()
	body_sprite = Sprite2D.new()
	body_sprite.name = "BodySprite"
	body_sprite.centered = true
	body_sprite.scale = Vector2(base_sc, base_sc)
	body_sprite.z_index = EconomyConfig.Z_BUILDING
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	secondary_sprite = Sprite2D.new()
	secondary_sprite.name = "SecondarySprite"
	secondary_sprite.centered = true
	secondary_sprite.visible = false
	secondary_sprite.scale = Vector2(0.68, 0.68)
	secondary_sprite.position = Vector2(18.0, 0.0)
	secondary_sprite.z_index = EconomyConfig.Z_BUILDING
	secondary_sprite.z_as_relative = false
	add_child(secondary_sprite)

	_reload_texture()
	var cur_lv := get_workshop_level()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, workshop_id, cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.position = Vector2(-28.0, 2.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func setup_workshop(p_id: String, p_island: int, p_pos: Vector2, _p_offset: Vector2 = Vector2.ZERO) -> void:
	workshop_id = p_id
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	_reload_texture()
	if body_sprite != null:
		var base_sc := get_base_sprite_scale()
		body_sprite.scale = Vector2(base_sc, base_sc)
	var cur_lv := get_workshop_level()
	if level_label != null:
		level_label.text = "Lv." + str(cur_lv)
	if visual_upgrader != null:
		visual_upgrader.building_kind = workshop_id
		visual_upgrader.apply_level_visuals(cur_lv, false)

func get_building_key() -> String:
	return "soil_3" if workshop_id == "orbis_linked" else workshop_id

func get_workshop_level() -> int:
	return maxi(1, int(GameManager.building_levels.get(get_building_key(), 1)))

func get_buffer_capacity() -> int:
	if GameManager != null:
		return GameManager.get_workshop_buffer_cap(workshop_id)
	return DEFAULT_BUFFER_CAP

func get_input_buffer_count() -> int:
	return GameManager.get_workshop_input_total(workshop_id) if GameManager != null else 0

func get_output_buffer_count() -> int:
	return GameManager.get_workshop_output_total(workshop_id) if GameManager != null else 0

func is_input_buffer_full() -> bool:
	return GameManager.is_workshop_input_full(workshop_id) if GameManager != null else false

func is_output_buffer_full() -> bool:
	return GameManager.is_workshop_output_full(workshop_id) if GameManager != null else false

func get_value_multiplier() -> float:
	if workshop_id == "orbis_linked":
		return EconomyConfig.MULTIPLIER_ORBIS_LINKED
	elif workshop_id == "cauldron":
		return EconomyConfig.MULTIPLIER_CAULDRON
	return EconomyConfig.MULTIPLIER_MORTAR

func get_screen_rect() -> Rect2:
	var w := get_visual_width() * scale.x
	var h := get_visual_height() * scale.y
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == get_building_key():
		if level_label != null:
			level_label.text = "Lv." + str(new_level)
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)

func get_evolved_output_delicacy() -> String:
	return EconomyConfig.get_evolved_delicacy_id(workshop_id, get_workshop_level())

func _reload_texture() -> void:
	var frame_h := 58
	if workshop_id == "cauldron":
		tex_building = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
		tex_secondary = null
		frame_h = 62
	elif workshop_id == "orbis_linked":
		tex_building = load("res://assets/pixel_art/buildings/workshop_mortar.png")
		tex_secondary = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
		frame_h = 58
	else:
		tex_building = load("res://assets/pixel_art/buildings/workshop_mortar.png")
		tex_secondary = null
		frame_h = 58

	if body_sprite != null and tex_building != null:
		body_sprite.texture = tex_building
		body_sprite.centered = true
		# GEMINI.md Law 2.2: sprite.offset = Vector2(0.0, -float(frame_h) * 0.5)
		body_sprite.offset = Vector2(0.0, -float(frame_h) * 0.5)
		body_sprite.position = Vector2(ORBIS_BODY_X if workshop_id == "orbis_linked" else 0.0, 0.0)

	if secondary_sprite != null:
		secondary_sprite.visible = (tex_secondary != null)
		if tex_secondary != null:
			secondary_sprite.texture = tex_secondary
			secondary_sprite.centered = true
			secondary_sprite.offset = Vector2(0.0, -float(62) * 0.5)
			if workshop_id == "orbis_linked":
				secondary_sprite.position = Vector2(ORBIS_SECONDARY_X, 0.0)
				secondary_sprite.scale = Vector2(ORBIS_SECONDARY_SCALE, ORBIS_SECONDARY_SCALE)

func _process(delta: float) -> void:
	visible = bool(GameManager.unlocked_islands.get(island_idx, false))
	if not visible:
		return

	var base_sc := get_base_sprite_scale()
	if is_processing:
		work_anim_time += delta * 10.0
		if body_sprite != null:
			var squash := sin(work_anim_time) * 0.03
			body_sprite.scale = Vector2(base_sc * (1.0 + squash), base_sc * (1.0 - squash))
		queue_redraw()
	else:
		if body_sprite != null:
			body_sprite.scale = Vector2(base_sc, base_sc)
		if _was_processing:
			queue_redraw()
	_was_processing = is_processing

func _draw() -> void:
	if tex_building == null:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, get_visual_width())

	if is_processing:
		var prog := clampf(process_progress, 0.0, 1.0)
		var bar_w := 36.0
		var bar_h := 5.0
		var bx := -bar_w * 0.5
		var by := -get_visual_height() - 22.0
		draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
		var fill_col := Color(0.45, 0.95, 0.42, 0.96) if workshop_id == "mortar" else Color(0.42, 0.88, 1.0, 0.96)
		draw_rect(Rect2(bx, by, bar_w * prog, bar_h), fill_col, true)

		# Circular progress ring beside the bar
		var ring_center := Vector2(bx - 9.0, by + 2.5)
		draw_circle(ring_center, 5.5, Color(0.10, 0.07, 0.04, 0.90))
		draw_arc(ring_center, 4.2, -PI * 0.5, -PI * 0.5 + prog * TAU, 16, Color("#FFE066"), 1.6)
