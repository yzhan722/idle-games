extends Node2D
class_name CustomerNPC
## Long-Cycle Island Customer & Crown VIP Tycoon (`src/entities/units/CustomerNPC.gd`)
## Strictly enforces GEMINI.md Laws 2, 3, 4, 5:
## - Root `position.y = GROUND_Y` (`z_index = 10`, `z_as_relative = false`).
## - `body_sprite`: `region_enabled = false`, `hframes = 2`, `vframes = 1`, `frame = frame_idx` (`48x48` per frame, aspect 1.0).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(48) * 0.5) = Vector2(0.0, -24.0)`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` (`shadow_width = 40 * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).

const FRAME_W := 48
const FRAME_H := 48
const VISUAL_WIDTH := 40.0

enum State {
	SPAWN_AND_STROLL,
	QUEUE_AT_STALL,
	PURCHASE,
	LEAVE
}

const TRAVELER_KEYS: Array[String] = [
	"travelers/traveler_slime.png",
	"travelers/traveler_mushroom.png",
	"travelers/traveler_pig.png"
]

const TRAVELER_NORMALIZED_PATHS: Array[String] = [
	"res://assets/pixel_art/travelers/traveler_slime_normalized.png",
	"res://assets/pixel_art/travelers/traveler_mushroom_normalized.png",
	"res://assets/pixel_art/travelers/traveler_pig_normalized.png"
]

var state: State = State.SPAWN_AND_STROLL
var is_vip: bool = false
var sheet_key: String = "travelers/traveler_slime.png"
var tex_sheet: Texture2D
var tex_parchment: Texture2D
var tex_delicacies: Texture2D
var tex_crops: Texture2D
var tex_heart: Texture2D

@onready var body_sprite: Sprite2D = Sprite2D.new()
var bubble_label: Label

var waypoint_graph: WaypointGraph
var stall_ref: MarketStall
var spawn_pos: Vector2
var nav_path: Array[Vector2] = []

var desired_item_id: String = "crop_0"
var desired_qty: int = 1
var wait_timer: float = 0.0
var interact_timer: float = 0.0
var purchased_ok: bool = false
var disappointed: bool = false

var anim_time: float = 0.0
var facing_left: bool = false
var fade_alpha: float = 1.0

func _ready() -> void:
	z_index = EconomyConfig.Z_UNIT
	z_as_relative = false

	# GEMINI.md Law 2.2 & Law 4: Fixed grid slicing (`hframes = 2, vframes = 1, region_enabled = false`) + Bottom-Center Pivot
	body_sprite.name = "BodySprite"
	body_sprite.region_enabled = false
	body_sprite.hframes = 2
	body_sprite.vframes = 1
	body_sprite.frame = 0
	body_sprite.centered = true
	body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)
	body_sprite.z_index = EconomyConfig.Z_UNIT
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	bubble_label = EconomyConfig.create_pixel_label("x1", 14, Color("#FFF4D6"), false)
	bubble_label.position = Vector2(2.0, -76.0)
	bubble_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	bubble_label.z_as_relative = false
	add_child(bubble_label)

	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

func setup_customer(p_spawn: Vector2, p_graph: WaypointGraph, p_stall: MarketStall, p_is_vip: bool = false) -> void:
	waypoint_graph = p_graph
	stall_ref = p_stall
	is_vip = p_is_vip
	spawn_pos = Vector2(p_spawn.x, EconomyConfig.GROUND_Y)
	position = spawn_pos

	var t_idx := 2 if is_vip else (randi() % TRAVELER_KEYS.size())
	sheet_key = TRAVELER_KEYS[t_idx]
	tex_sheet = load(TRAVELER_NORMALIZED_PATHS[t_idx])
	if body_sprite != null:
		body_sprite.texture = tex_sheet
		body_sprite.region_enabled = false
		body_sprite.hframes = 2
		body_sprite.vframes = 1
		body_sprite.frame = 0
		body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)

	if is_vip:
		desired_item_id = "delicacy_3" if bool(GameManager.unlocked_islands.get(3, false)) else "delicacy_2"
		desired_qty = randi_range(3, 5)
	else:
		var pool: Array[String] = ["crop_0", "crop_1"]
		if GameManager.is_animal_hired("fox"):
			pool.append_array(["delicacy_0", "delicacy_1"])
		if bool(GameManager.unlocked_islands.get(2, false)):
			pool.append("delicacy_2")
		if bool(GameManager.unlocked_islands.get(3, false)):
			pool.append("delicacy_3")
		desired_item_id = pool[randi() % pool.size()]
		desired_qty = randi_range(1, 3)

	state = State.SPAWN_AND_STROLL
	var queue_dest := stall_ref.get_queue_slot_pos(self) if stall_ref != null else Vector2(996.0, EconomyConfig.GROUND_Y)
	nav_path = waypoint_graph.compute_path(position, queue_dest) if waypoint_graph != null else [queue_dest]

func _process(delta: float) -> void:
	anim_time += delta

	match state:
		State.SPAWN_AND_STROLL:
			if _follow_path(delta, 42.0):
				state = State.QUEUE_AT_STALL
				wait_timer = 0.0

		State.QUEUE_AT_STALL:
			if stall_ref != null:
				var slot_pos := stall_ref.get_queue_slot_pos(self)
				if absf(position.x - slot_pos.x) > 4.0:
					_move_directly_toward(slot_pos, delta, 36.0)
				if stall_ref.is_front_of_queue(self):
					state = State.PURCHASE
					interact_timer = 0.0
					wait_timer = 0.0
			else:
				state = State.PURCHASE

		State.PURCHASE:
			var has_stock := GameManager.get_total_stall_count() > 0
			if has_stock:
				interact_timer += delta
				var req_time := 1.0 if GameManager.is_animal_hired("shiba") else 1.8
				if interact_timer >= req_time:
					var earned := GameManager.try_purchase_from_stall(desired_item_id, desired_qty, position, is_vip)
					if earned > 0:
						purchased_ok = true
						if is_vip:
							EventBus.spawn_floating_text.emit(position + Vector2(0, -76), "👑富豪2x小费!", Color("#FFE066"))
						_begin_leave()
			else:
				wait_timer += delta
				if wait_timer >= 12.0:
					disappointed = true
					EventBus.customer_left_unhappy.emit(position)
					EventBus.spawn_floating_text.emit(position + Vector2(0, -54), "...缺货离开", Color("#FFF4D6"))
					_begin_leave()

		State.LEAVE:
			if _follow_path(delta, 42.0):
				fade_alpha -= delta * 1.8
				modulate.a = maxf(0.0, fade_alpha)
				if fade_alpha <= 0.02:
					queue_free()

	var is_walking := (state == State.SPAWN_AND_STROLL or state == State.LEAVE) and nav_path.size() > 0
	var frame_idx := (int(floor(anim_time * 6.0 / PI)) % 2) if is_walking else 0
	var hop_y := -absf(sin(anim_time * 6.0)) * 2.2 if is_walking else 0.0
	var tilt := sin(anim_time * 6.0) * 0.03 if is_walking else 0.0

	if body_sprite != null and tex_sheet != null:
		body_sprite.texture = tex_sheet
		body_sprite.region_enabled = false
		body_sprite.hframes = 2
		body_sprite.vframes = 1
		body_sprite.frame = clampi(frame_idx, 0, 1)
		body_sprite.flip_h = facing_left
		body_sprite.position = Vector2(0.0, hop_y)
		body_sprite.rotation = tilt

	if bubble_label != null:
		if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
			bubble_label.visible = true
			bubble_label.text = "x" + str(desired_qty)
			bubble_label.position = Vector2(2.0, -78.0 + hop_y)
		elif state == State.LEAVE and disappointed:
			bubble_label.visible = true
			bubble_label.text = "..."
			bubble_label.position = Vector2(-8.0, -72.0 + hop_y)
		else:
			bubble_label.visible = false

	queue_redraw()

func _begin_leave() -> void:
	if stall_ref != null:
		stall_ref.unregister_from_queue(self)
	state = State.LEAVE
	nav_path = waypoint_graph.compute_path(position, spawn_pos) if waypoint_graph != null else [spawn_pos]

func _follow_path(delta: float, spd: float) -> bool:
	if nav_path.size() == 0:
		return true
	var rem_move := spd * delta
	while rem_move > 0.0 and nav_path.size() > 0:
		var wp := Vector2(nav_path[0].x, EconomyConfig.GROUND_Y)
		var diff_x := wp.x - position.x
		var dist := absf(diff_x)
		if absf(diff_x) > 0.2:
			facing_left = diff_x < 0.0
		if dist <= rem_move or dist <= 1.5:
			position = wp
			rem_move -= dist
			nav_path.remove_at(0)
		else:
			position = Vector2(position.x + signf(diff_x) * rem_move, EconomyConfig.GROUND_Y)
			rem_move = 0.0
	return nav_path.size() == 0

func _move_directly_toward(dest: Vector2, delta: float, spd: float) -> void:
	var diff_x := dest.x - position.x
	if absf(diff_x) > 1.5:
		facing_left = diff_x < 0.0
		position = Vector2(position.x + signf(diff_x) * minf(absf(diff_x), spd * delta), EconomyConfig.GROUND_Y)

func _draw_vip_crown(top_y: float) -> void:
	var cx := 0.0
	var cy := top_y
	draw_rect(Rect2(cx - 9, cy - 6, 18, 6), Color(1.0, 0.84, 0.16, 0.98), true)
	draw_colored_polygon(PackedVector2Array([
		Vector2(cx - 9, cy - 6), Vector2(cx - 9, cy - 12), Vector2(cx - 4, cy - 7),
		Vector2(cx, cy - 14), Vector2(cx + 4, cy - 7), Vector2(cx + 9, cy - 12), Vector2(cx + 9, cy - 6)
	]), Color(1.0, 0.90, 0.25, 0.98))
	draw_circle(Vector2(cx, cy - 4), 2.2, Color(0.96, 0.18, 0.28, 1.0))

func _draw() -> void:
	if tex_sheet == null:
		return
	var is_walking := (state == State.SPAWN_AND_STROLL or state == State.LEAVE) and nav_path.size() > 0
	var hop_y := -absf(sin(anim_time * 6.0)) * 2.2 if is_walking else 0.0

	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)

	if is_vip:
		_draw_vip_crown(-46.0 + hop_y)

	if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
		if tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-24, -78 + hop_y, 54, 26), false)
		if desired_item_id.begins_with("delicacy_") and tex_delicacies != null:
			var d_reg := EconomyConfig.get_delicacy_region(desired_item_id)
			draw_texture_rect_region(tex_delicacies, Rect2(-20, -75 + hop_y, 20, 20), d_reg)
		elif tex_crops != null:
			var c_reg := EconomyConfig.get_crop_stage_region(desired_item_id, 3)
			draw_texture_rect_region(tex_crops, Rect2(-20, -75 + hop_y, 20, 20), c_reg)
	elif state == State.LEAVE:
		if purchased_ok and tex_heart != null:
			draw_texture_rect(tex_heart, Rect2(-10, -68 + hop_y, 20, 20), false)
		elif disappointed and tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-16, -72 + hop_y, 32, 22), false)
