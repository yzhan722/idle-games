extends Node2D
class_name Workshop
## Mortar, Cauldron & Island 3 Dual Workshop + Ultra-Flat Contact Shadow + Native Level Label (`src/entities/buildings/Workshop.gd`) — Visual Polish Patch

@export var workshop_id: String = "mortar" # "mortar", "cauldron", or "orbis_linked"
@export var island_idx: int = 1
@export var draw_offset: Vector2 = Vector2(-34.0, -52.0)

var tex_building: Texture2D
var tex_secondary: Texture2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var is_processing: bool = false
var process_progress: float = 0.0

func _ready() -> void:
	_reload_texture()
	var b_key := "soil_3" if workshop_id == "orbis_linked" else workshop_id
	var cur_lv := int(GameManager.building_levels.get(b_key, 1))

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, workshop_id, cur_lv)

	level_label = PixelFontRenderer.create_label("Lv." + str(cur_lv), 14, Color("#FFE066"), true)
	level_label.position = Vector2(-28.0, 4.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func setup_workshop(p_id: String, p_island: int, p_pos: Vector2, p_offset: Vector2) -> void:
	workshop_id = p_id
	island_idx = p_island
	position = p_pos
	draw_offset = p_offset
	_reload_texture()

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
	if workshop_id == "cauldron":
		tex_building = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
		tex_secondary = null
	elif workshop_id == "orbis_linked":
		tex_building = load("res://assets/pixel_art/buildings/workshop_mortar.png")
		tex_secondary = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
	else:
		tex_building = load("res://assets/pixel_art/buildings/workshop_mortar.png")
		tex_secondary = null

func _process(_delta: float) -> void:
	visible = bool(GameManager.unlocked_islands.get(island_idx, false))
	queue_redraw()

func _draw() -> void:
	if tex_building == null:
		return
	# Visual Polish Patch Rule 2: Ultra-flat horizontal ellipse shadow (`scale.y = 0.2`, width = 60% of 68px = 40.8px -> radius 20.4px, `Color(0, 0, 0, 0.22)`)
	draw_set_transform(Vector2(0.0, 2.0), 0.0, Vector2(1.0, 0.2))
	draw_circle(Vector2.ZERO, 20.4, Color(0.0, 0.0, 0.0, 0.22))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	draw_texture(tex_building, draw_offset)
	if tex_secondary != null:
		draw_texture_rect(tex_secondary, Rect2(draw_offset.x + 26.0, draw_offset.y + 4.0, 46.0, 48.0), false)

	if is_processing:
		var bar_w := 36.0
		var bar_h := 5.0
		var bx := -bar_w * 0.5
		var by := draw_offset.y - 8.0
		draw_rect(Rect2(bx - 1, by - 1, bar_w + 2, bar_h + 2), Color(0.16, 0.08, 0.02, 0.92), true)
		draw_rect(Rect2(bx, by, bar_w * clampf(process_progress, 0.0, 1.0), bar_h), Color(0.45, 0.95, 0.42, 0.96), true)
