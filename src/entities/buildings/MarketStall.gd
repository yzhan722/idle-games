extends Node2D
class_name MarketStall
## Clean Market Stall Component (`src/entities/buildings/MarketStall.gd`) — PRD Patch v2.1
## - Pure Numeric Shelf Inventory: maintained in GameManager without extra stacked icons cluttering the stall sprite!
## - Supports unattended self-service checkout before Shiba Store Manager is hired,
##   and accelerated + PriceBonus checkout once Shiba is hired!

var tex_stall: Texture2D
var draw_offset: Vector2 = Vector2(-66.0, -102.0)

var queue_customers: Array[Node2D] = []
var anim_time: float = 0.0

func _ready() -> void:
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")

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
