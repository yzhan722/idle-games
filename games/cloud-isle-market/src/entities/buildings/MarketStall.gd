extends Node2D
class_name MarketStall
## Central Cloud Isle Market Stall, Queue Dispatcher & Shiba Manager Checkout Hub (`src/entities/buildings/MarketStall.gd`)
## Strictly enforces PRD v2.2 & GEMINI.md Laws 2, 3, 5:
## - Root `position = Vector2(slot_x, GROUND_Y)` is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(104) * 0.5) = Vector2(0.0, -52.0)`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` (`shadow_width = w * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).
## - Supports zero-Shiba self-service checkout (`1.8s` duration, `1.0x` price bonus) and Shiba Manager accelerated checkout (`1.0s` duration, `PriceBonus = 1.0 + 0.1 * L`).
## - Pure numeric inventory buffer (`GameManager.stall_inventory`, default cap = 10, +5 per building level) with zero icon clutter on the counter.

const BASE_SPRITE_SCALE := 0.72
const VISUAL_WIDTH := 92.16 # 128 * 0.72
const VISUAL_HEIGHT := 74.88 # 104 * 0.72
const QUEUE_BASE_OFFSET_X := 28.0
const QUEUE_SPACING_X := 16.0
const MAX_VISIBLE_QUEUE := 5

const SELF_SERVICE_CHECKOUT_SEC := 1.8
const SHIBA_MANAGER_CHECKOUT_SEC := 1.0

var tex_stall: Texture2D
var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0
var checkout_flash_timer: float = 0.0
var total_customers_served: int = 0
var total_gold_collected: int = 0

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

	var cur_lv := get_stall_level()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "stall", cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.position = Vector2(-28.0, 2.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.customer_paid.connect(_on_customer_paid)

func get_stall_level() -> int:
	return maxi(1, int(GameManager.building_levels.get("stall", 1)))

func get_shiba_level() -> int:
	if not GameManager.is_animal_hired("shiba"):
		return 0
	return maxi(1, int(GameManager.animal_levels.get("shiba", 1)))

func is_shiba_manager_active() -> bool:
	return GameManager.is_animal_hired("shiba")

func get_checkout_duration() -> float:
	if not is_shiba_manager_active():
		return SELF_SERVICE_CHECKOUT_SEC
	var shiba_lv := get_shiba_level()
	return maxf(0.45, SHIBA_MANAGER_CHECKOUT_SEC * pow(0.97, float(shiba_lv - 1)))

func get_price_bonus_multiplier() -> float:
	return EconomyConfig.calc_shiba_price_bonus(get_shiba_level())

func get_current_stock_count() -> int:
	return GameManager.get_total_stall_count()

func get_max_stock_capacity() -> int:
	return GameManager.get_stall_max_capacity()

func has_available_stock() -> bool:
	return get_current_stock_count() > 0

func get_inventory_snapshot() -> Dictionary:
	return GameManager.stall_inventory.duplicate()

func execute_customer_checkout(preferred_item_id: String, desired_qty: int, customer_pos: Vector2, is_vip: bool = false) -> int:
	return GameManager.try_purchase_from_stall(preferred_item_id, desired_qty, customer_pos, is_vip)

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

func _on_customer_paid(_recipe_id: String, _qty: int, total_gold: int, _world_pos: Vector2) -> void:
	total_customers_served += 1
	total_gold_collected += total_gold
	checkout_flash_timer = 0.35

func register_in_queue(cust: Node2D) -> int:
	_cleanup_queue()
	if not queue_customers.has(cust):
		queue_customers.append(cust)
	return queue_customers.find(cust)

func unregister_from_queue(cust: Node2D) -> void:
	queue_customers.erase(cust)
	_cleanup_queue()

func get_queue_slot_pos(cust: Node2D) -> Vector2:
	var idx := clampi(register_in_queue(cust), 0, MAX_VISIBLE_QUEUE)
	var slot_x := position.x + QUEUE_BASE_OFFSET_X + float(idx) * QUEUE_SPACING_X
	if GameManager != null and not bool(GameManager.unlocked_islands.get(3, false)):
		slot_x = minf(slot_x, 1078.0)
	return Vector2(slot_x, EconomyConfig.GROUND_Y)

func is_front_of_queue(cust: Node2D) -> bool:
	_cleanup_queue()
	return queue_customers.size() > 0 and queue_customers[0] == cust

func get_queue_length() -> int:
	_cleanup_queue()
	return queue_customers.size()

func _cleanup_queue() -> void:
	for i in range(queue_customers.size() - 1, -1, -1):
		if not is_instance_valid(queue_customers[i]):
			queue_customers.remove_at(i)

func _process(delta: float) -> void:
	anim_time += delta
	if checkout_flash_timer > 0.0:
		checkout_flash_timer = maxf(0.0, checkout_flash_timer - delta)
	queue_redraw()

func _draw() -> void:
	if tex_stall == null:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)

	# Subtle warm lantern glow under the stall awning (enhanced when Shiba manager or Lv.25+ lamp is active)
	var pulse := 0.85 + 0.15 * sin(anim_time * 3.0)
	var base_alpha := (0.14 if is_shiba_manager_active() else 0.08) * pulse
	if checkout_flash_timer > 0.0:
		base_alpha += 0.18 * (checkout_flash_timer / 0.35)
	draw_circle(Vector2(-10.0, -34.0), 14.0, Color(1.0, 0.86, 0.38, base_alpha))
