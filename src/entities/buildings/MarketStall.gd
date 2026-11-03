extends Node2D
class_name MarketStall
## Clean Market Stall Component (`src/entities/buildings/MarketStall.gd`)
## Strictly enforces GEMINI.md Laws 2, 3, 5:
## - Root `position = Vector2(slot_x, GROUND_Y)` is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(104) * 0.5) = Vector2(0.0, -52.0)`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` (`shadow_width = w * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).

const BASE_SPRITE_SCALE := 0.72
const VISUAL_WIDTH := 92.16 # 128 * 0.72
const VISUAL_HEIGHT := 74.88 # 104 * 0.72

var tex_stall: Texture2D
var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")

	# GEMINI.md Law 2.2: Bottom-Center Pivot (`centered = true`, `offset = Vector2(0.0, -float(frame_h) * 0.5)`)
	body_sprite = Sprite2D.new()
	body_sprite.name = "BodySprite"
	body_sprite.texture = tex_stall
	body_sprite.centered = true
	body_sprite.offset = Vector2(0.0, -float(104) * 0.5)
	body_sprite.scale = Vector2(BASE_SPRITE_SCALE, BASE_SPRITE_SCALE)
	body_sprite.z_index = EconomyConfig.Z_BUILDING
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	var cur_lv := int(GameManager.building_levels.get("stall", 1))

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "stall", cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.position = Vector2(-28.0, 2.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func get_screen_rect() -> Rect2:
	var w := VISUAL_WIDTH * scale.x
	var h := VISUAL_HEIGHT * scale.y
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "stall":
		if level_label != null:
			level_label.text = "Lv." + str(new_level)
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)

func register_in_queue(cust: Node2D) -> int:
	_cleanup_queue()
	if not queue_customers.has(cust):
		queue_customers.append(cust)
	return queue_customers.find(cust)

func unregister_from_queue(cust: Node2D) -> void:
	queue_customers.erase(cust)
	_cleanup_queue()

func get_queue_slot_pos(cust: Node2D) -> Vector2:
	var idx := register_in_queue(cust)
	return Vector2(position.x - 16.0 - float(idx) * 26.0, EconomyConfig.GROUND_Y)

func is_front_of_queue(cust: Node2D) -> bool:
	_cleanup_queue()
	return queue_customers.size() > 0 and queue_customers[0] == cust

func _cleanup_queue() -> void:
	for i in range(queue_customers.size() - 1, -1, -1):
		if not is_instance_valid(queue_customers[i]):
			queue_customers.remove_at(i)

func _process(delta: float) -> void:
	anim_time += delta
	queue_redraw()

func _draw() -> void:
	if tex_stall == null:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)
