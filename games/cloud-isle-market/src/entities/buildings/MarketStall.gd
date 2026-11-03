extends Node2D
class_name MarketStall
## Clean Market Stall Component + Ultra-Flat Contact Shadow + Native Level Label (`src/entities/buildings/MarketStall.gd`) — Visual Polish Patch

var tex_stall: Texture2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var draw_offset: Vector2 = Vector2(-64.0, -100.0)

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0

func _ready() -> void:
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")
	var cur_lv := int(GameManager.building_levels.get("stall", 1))

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "stall", cur_lv)

	level_label = PixelFontRenderer.create_label("Lv." + str(cur_lv), 14, Color("#FFE066"), true)
	level_label.position = Vector2(-28.0, 4.0)
	level_label.custom_minimum_size = Vector2(56.0, 20.0)
	add_child(level_label)

	EventBus.upgrade_purchased.connect(_on_upgrade_purchased)

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
	# Visual Polish Patch Rule 2: Ultra-flat horizontal ellipse shadow (`scale.y = 0.2`, width = 60% of 128px = 76.8px -> radius 38.4px, `Color(0, 0, 0, 0.22)`)
	draw_set_transform(Vector2(0.0, 0.0), 0.0, Vector2(1.0, 0.2))
	draw_circle(Vector2.ZERO, 38.4, Color(0.0, 0.0, 0.0, 0.22))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	draw_texture(tex_stall, draw_offset)
