extends Node2D
class_name CustomerNPC
## Long-Cycle Island Customer & Crown VIP Tycoon (`src/entities/units/CustomerNPC.gd`) — PRD Patch v2.1
## - Rule 1.2 Unattended Self-Service Stall: Customers can check out on their own even before `shiba` is hired!
##   Once `shiba` is hired, checkout speed increases and `PriceBonus = 1.0 + 0.1 * L` applies.
## - Rule 3.4 Right Landmark Crown VIP Customer (`is_vip = true`):
##   Spawns from `landmark_right_tiki.png` every 35~50s after Island 3 is unlocked, wears a gleaming Golden Crown,
##   buys `3 ~ 5` items per visit, and pays a **2.0x Double Gold Tip**!

enum State {
	SPAWN_AND_STROLL,
	QUEUE_AT_STALL,
	PURCHASE,
	LEAVE
}

const TRAVELER_SHEETS: Array[String] = [
	"travelers/traveler_slime.png",
	"travelers/traveler_mushroom.png",
	"travelers/traveler_pig.png"
]

var state: State = State.SPAWN_AND_STROLL
var is_vip: bool = false
var sheet_key: String = "travelers/traveler_slime.png"
var tex_sheet: Texture2D
var tex_parchment: Texture2D
var tex_delicacies: Texture2D
var tex_crops: Texture2D
var tex_heart: Texture2D

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
	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

func setup_customer(p_spawn: Vector2, p_graph: WaypointGraph, p_stall: MarketStall, p_is_vip: bool = false) -> void:
	waypoint_graph = p_graph
	stall_ref = p_stall
	is_vip = p_is_vip
	spawn_pos = waypoint_graph.constrain_to_walkable_surface(p_spawn) if waypoint_graph != null else p_spawn
	position = spawn_pos

	sheet_key = TRAVELER_SHEETS[2 if is_vip else (randi() % TRAVELER_SHEETS.size())]
	tex_sheet = load("res://assets/pixel_art/" + sheet_key)

	if is_vip:
		# PRD v2.1 Rule 3.4: VIP Customer buys 3~5 high-tier items and pays 2.0x tip!
		desired_item_id = "delicacy_3" if bool(GameManager.unlocked_islands.get(3, false)) else "delicacy_2"
		desired_qty = randi_range(3, 5)
	else:
		# Pick desired item matching current island progression
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
	var queue_dest := stall_ref.get_queue_slot_pos(self) if stall_ref != null else Vector2(1008.0, 140.0)
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
				if position.distance_to(slot_pos) > 4.0:
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
				# PRD v2.1 Rule 1.2: Self-service takes 1.8s when Shiba unhired; Shiba speeds checkout to 1.0s!
				var req_time := 1.0 if GameManager.is_animal_hired("shiba") else 1.8
				if interact_timer >= req_time:
					var earned := GameManager.try_purchase_from_stall(desired_item_id, desired_qty, position, is_vip)
					if earned > 0:
						purchased_ok = true
						if is_vip:
							EventBus.spawn_floating_text.emit(position + Vector2(-28, -74), "👑富豪2x小费!", Color(1.0, 0.86, 0.22))
						_begin_leave()
			else:
				wait_timer += delta
				if wait_timer >= 12.0:
					disappointed = true
					EventBus.customer_left_unhappy.emit(position)
					EventBus.spawn_floating_text.emit(position + Vector2(-24, -52), "...缺货离开", Color(0.85, 0.85, 0.92))
					_begin_leave()

		State.LEAVE:
			if _follow_path(delta, 42.0):
				fade_alpha -= delta * 1.8
				modulate.a = maxf(0.0, fade_alpha)
				if fade_alpha <= 0.02:
					queue_free()

	queue_redraw()

func _begin_leave() -> void:
	if stall_ref != null:
		stall_ref.unregister_from_queue(self)
	state = State.LEAVE
	nav_path = waypoint_graph.compute_path(position, spawn_pos) if waypoint_graph != null else [spawn_pos]

func _follow_path(delta: float, spd: float) -> bool:
	if nav_path.size() == 0:
		return true
	var wp := nav_path[0]
	var to_wp := wp - position
	var dist := to_wp.length()
	if dist <= 3.5:
		position = waypoint_graph.constrain_to_walkable_surface(wp) if waypoint_graph != null else wp
		nav_path.remove_at(0)
		return nav_path.size() == 0
	if absf(to_wp.x) > 0.5:
		facing_left = to_wp.x < 0.0
	var next_p := position + (to_wp / dist) * spd * delta
	position = waypoint_graph.constrain_to_walkable_surface(next_p) if waypoint_graph != null else next_p
	return false

func _move_directly_toward(dest: Vector2, delta: float, spd: float) -> void:
	var diff := dest - position
	if diff.length() > 1.5:
		facing_left = diff.x < 0.0
		var next_p := position + diff.normalized() * spd * delta
		position = waypoint_graph.constrain_to_walkable_surface(next_p) if waypoint_graph != null else next_p

func _draw_vip_crown(top_y: float) -> void:
	# Gleaming Pixel Golden Crown with Ruby Gem for VIP Customer
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
	var frame_idx := (int(floor(anim_time * 6.0 / PI)) % 2) if is_walking else 0
	var hop_y := -absf(sin(anim_time * 6.0)) * 2.4 if is_walking else 0.0
	var tilt := sin(anim_time * 6.0) * 0.04 if is_walking else 0.0

	draw_circle(Vector2(0, 2), 11.0, Color(0.05, 0.04, 0.02, 0.32))

	var src_rect := EconomyConfig.get_frame_region(sheet_key, frame_idx)
	var cw := src_rect.size.x
	var ch := src_rect.size.y

	draw_set_transform(Vector2(0.0, hop_y), tilt, Vector2.ONE)
	draw_texture_rect_region(tex_sheet, Rect2(-cw * 0.5, -ch + 4.0, cw, ch), src_rect, Color.WHITE, facing_left)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	if is_vip:
		_draw_vip_crown(-ch + 2.0 + hop_y)

	# Overhead Thought Bubble: Desired Item + Qty, Happy Heart, or Regret "..."
	if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
		if tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-24, -78 + hop_y, 50, 26), false)
		if desired_item_id.begins_with("delicacy_") and tex_delicacies != null:
			var d_reg := EconomyConfig.get_delicacy_region(desired_item_id)
			draw_texture_rect_region(tex_delicacies, Rect2(-20, -75 + hop_y, 20, 20), d_reg)
		elif tex_crops != null:
			var c_reg := EconomyConfig.get_crop_stage_region(desired_item_id, 3)
			draw_texture_rect_region(tex_crops, Rect2(-20, -75 + hop_y, 20, 20), c_reg)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(2, -70 + hop_y), "x" + str(desired_qty), 11, Color(0.22, 0.10, 0.02), Color(1.0, 0.96, 0.85, 0.90), false)
	elif state == State.LEAVE:
		if purchased_ok and tex_heart != null:
			draw_texture_rect(tex_heart, Rect2(-10, -68 + hop_y, 20, 20), false)
		elif disappointed:
			if tex_parchment != null:
				draw_texture_rect(tex_parchment, Rect2(-16, -70 + hop_y, 32, 22), false)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(-10, -64 + hop_y), "...", 13, Color(0.35, 0.25, 0.20), Color.WHITE, false)
