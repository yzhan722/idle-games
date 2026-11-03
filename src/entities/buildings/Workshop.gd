extends Node2D
class_name Workshop
## Mortar, Cauldron & Island 3 Dual Workshop (`src/entities/buildings/Workshop.gd`)
## Strictly enforces GEMINI.md Laws 2, 3, 5:
## - Root `position = Vector2(slot_x, GROUND_Y)` is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(frame_h) * 0.5)`.
## - `shadow_layer`: `z_index = -5`, draws 5:1 polygon drop shadow (`shadow_width = w * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).

const BASE_SPRITE_Scale := 0.85
const VISUAL_WIDTH := 57.8 # 68 * 0.85
const VISUAL_HEIGHT := 51.0

@export var workshop_id: String = "mortar" # "mortar", "cauldron", or "orbis_linked"
@export var island_idx: int = 1

var tex_building: Texture2D
var tex_secondary: Texture2D
var body_sprite: Sprite2D
var secondary_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var is_processing: bool = false
var process_progress: float = 0.0

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	body_sprite = Sprite2D.new()
	body_sprite.name = "BodySprite"
	body_sprite.centered = true
	body_sprite.scale = Vector2(BASE_SPRITE_Scale, BASE_SPRITE_Scale)
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
	var b_key := "soil_3" if workshop_id == "orbis_linked" else workshop_id
	var cur_lv := int(GameManager.building_levels.get(b_key, 1))

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, workshop_id, cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.position = Vector2(-28.0, 2.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func setup_workshop(p_id: String, p_island: int, p_pos: Vector2, _p_offset: Vector2 = Vector2.ZERO) -> void:
	workshop_id = p_id
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	_reload_texture()

func get_screen_rect() -> Rect2:
	var w := VISUAL_WIDTH * scale.x
	var h := VISUAL_HEIGHT * scale.y
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	var target_key := "soil_3" if workshop_id == "orbis_linked" else workshop_id
	if category == "building" and key == target_key:
		if level_label != null:
			level_label.text = "Lv." + str(new_level)
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)

func get_evolved_output_delicacy() -> String:
	var b_key := "soil_3" if workshop_id == "orbis_linked" else workshop_id
	var lv := int(GameManager.building_levels.get(b_key, 1))
	return EconomyConfig.get_evolved_delicacy_id(workshop_id, lv)

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

	if secondary_sprite != null:
		secondary_sprite.visible = (tex_secondary != null)
		if tex_secondary != null:
			secondary_sprite.texture = tex_secondary
			secondary_sprite.centered = true
			secondary_sprite.offset = Vector2(0.0, -float(62) * 0.5)

func _process(_delta: float) -> void:
	visible = bool(GameManager.unlocked_islands.get(island_idx, false))
	queue_redraw()

func _draw() -> void:
	if tex_building == null:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)

	if is_processing:
		var bar_w := 36.0
		var bar_h := 5.0
		var bx := -bar_w * 0.5
		var by := -VISUAL_HEIGHT - 8.0
		draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
		draw_rect(Rect2(bx, by, bar_w * clampf(process_progress, 0.0, 1.0), bar_h), Color(0.45, 0.95, 0.42, 0.96), true)
