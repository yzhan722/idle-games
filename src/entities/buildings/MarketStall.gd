extends Node2D
class_name MarketStall
## Clean Market Stall Component + 4-Tier Visual Upgrader (`src/entities/buildings/MarketStall.gd`) — PRD Patch v2.2

var tex_stall: Texture2D
var visual_upgrader: BuildingVisualUpgrader
var draw_offset: Vector2 = Vector2(-66.0, -102.0)

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0

func _ready() -> void:
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")
	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "stall", int(GameManager.building_levels.get("stall", 1)))
	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "stall" and visual_upgrader != null:
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
	return position + Vector2(-14.0 - float(idx) * 26.0, 22.0)

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
	draw_texture(tex_stall, draw_offset)
