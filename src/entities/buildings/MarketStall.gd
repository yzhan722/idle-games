extends Node2D
class_name MarketStall
## Market Stall Component (`src/entities/buildings/MarketStall.gd`) — PRD Phase 2
## - Renders market_stall.png + 2-tier stacked visual shelf (raw crops + crafted delicacies)
## - Manages customer waiting queue slots (up to 4 customers concurrently)

var tex_stall: Texture2D
var tex_crops: Texture2D
var tex_delicacies: Texture2D
var draw_offset: Vector2 = Vector2(-66.0, -102.0)

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0

func _ready() -> void:
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")

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
	draw_circle(Vector2(0, 4), 28.0, Color(0.06, 0.04, 0.02, 0.32))
	draw_texture(tex_stall, draw_offset)

	# Warm lantern glow on Market Stall eaves
	var glow_a := 0.22 + 0.08 * sin(anim_time * 2.2)
	draw_circle(draw_offset + Vector2(18, 42), 14.0, Color(1.0, 0.85, 0.38, glow_a))

	# Top Shelf: Raw fruits & crops
	var raw_total := int(GameManager.stall_inventory.get("crop_0", 0)) + int(GameManager.stall_inventory.get("crop_1", 0)) + int(GameManager.stall_inventory.get("crop_2", 0)) + int(GameManager.stall_inventory.get("crop_3", 0))
	if tex_crops != null and raw_total > 0:
		var show_raw := mini(raw_total, 5)
		for i in range(show_raw):
			var cid := "crop_" + str(i % 4)
			var reg := EconomyConfig.get_crop_stage_region(cid, 3)
			draw_texture_rect_region(tex_crops, Rect2(draw_offset.x + 24 + i * 13, draw_offset.y + 44, 16, 16), reg)

	# Bottom Shelf: Crafted Delicacies (up to 6 visible dishes)
	if tex_delicacies != null:
		var slot_idx := 0
		for d_i in range(4):
			var did := "delicacy_" + str(d_i)
			var cnt := int(GameManager.stall_inventory.get(did, 0))
			for _k in range(cnt):
				if slot_idx >= 6:
					break
				var d_reg := EconomyConfig.get_delicacy_region(did)
				draw_texture_rect_region(
					tex_delicacies,
					Rect2(draw_offset.x + 20 + slot_idx * 12.5, draw_offset.y + 56 - (slot_idx % 2) * 3, 18, 18),
					d_reg
				)
				slot_idx += 1
