extends Node2D
class_name CustomerNPC
## Long-Cycle Island Customer NPC (`src/entities/units/CustomerNPC.gd`) — PRD v2.0 Section 4.2
## State Machine:
## 1. SPAWN_AND_STROLL: Strolls from landmark_left_hut or landmark_right_tiki (~60% worker speed)
##    with overhead bubble showing desired delicacy + quantity (1~3).
## 2. QUEUE_AT_STALL: Lines up at MarketStall queue slot.
## 3. PURCHASE:
##    - If in stock: interacts with Shiba Store Manager for 1.5s -> deducts stock -> happy emote + gold coin pop -> LEAVE.
##    - If out of stock: waits patiently up to 12.0s; if restocked in time, completes purchase; else shows "..." bubble -> LEAVE.
## 4. LEAVE: Strolls leisurely back to spawn landmark and fades out.

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
var sheet_key: String = "travelers/traveler_slime.png"
var tex_sheet: Texture2D
var tex_parchment: Texture2D
var tex_delicacies: Texture2D
var tex_heart: Texture2D

var waypoint_graph: WaypointGraph
var stall_ref: MarketStall
var spawn_pos: Vector2
var nav_path: Array[Vector2] = []

var desired_item_id: String = "delicacy_0"
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
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

func setup_customer(p_spawn: Vector2, p_graph: WaypointGraph, p_stall: MarketStall) -> void:
	waypoint_graph = p_graph
	stall_ref = p_stall
	spawn_pos = waypoint_graph.constrain_to_walkable_surface(p_spawn) if waypoint_graph != null else p_spawn
	position = spawn_pos

	sheet_key = TRAVELER_SHEETS[randi() % TRAVELER_SHEETS.size()]
	tex_sheet = load("res://assets/pixel_art/" + sheet_key)

	var pool := ["delicacy_0", "delicacy_1", "delicacy_2", "delicacy_3"]
	desired_item_id = pool[randi() % pool.size()]
	desired_qty = randi_range(1, 3)

	state = State.SPAWN_AND_STROLL
	var queue_dest := stall_ref.get_queue_slot_pos(self) if stall_ref != null else Vector2(1008.0, 140.0)
	nav_path = waypoint_graph.compute_path(position, queue_dest) if waypoint_graph != null else [queue_dest]

func _process(delta: float) -> void:
	anim_time += delta

	match state:
		State.SPAWN_AND_STROLL:
			if _follow_path(delta, 40.0): # ~60% of worker speed (68 * 0.6 ~= 40 px/s)
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
				if interact_timer >= 1.5:
					var earned := GameManager.try_purchase_from_stall(desired_item_id, desired_qty, position)
					if earned > 0:
						purchased_ok = true
						_begin_leave()
			else:
				wait_timer += delta
				if wait_timer >= 12.0:
					disappointed = true
					EventBus.customer_left_unhappy.emit(position)
					EventBus.spawn_floating_text.emit(position + Vector2(-24, -52), "...缺货离开", Color(0.85, 0.85, 0.92))
					_begin_leave()

		State.LEAVE:
			if _follow_path(delta, 40.0):
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

	# Overhead Thought Bubble: Desired Delicacy + Qty, Happy Heart, or Regret "..."
	if state == State.SPAWN_AND_STROLL or state == State.QUEUE_AT_STALL or state == State.PURCHASE:
		if tex_parchment != null:
			draw_texture_rect(tex_parchment, Rect2(-22, -74 + hop_y, 46, 26), false)
		if tex_delicacies != null:
			var d_reg := EconomyConfig.get_delicacy_region(desired_item_id)
			draw_texture_rect_region(tex_delicacies, Rect2(-18, -71 + hop_y, 20, 20), d_reg)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(2, -66 + hop_y), "x" + str(desired_qty), 11, Color(0.22, 0.10, 0.02), Color(1.0, 0.96, 0.85, 0.90), false)
	elif state == State.LEAVE:
		if purchased_ok and tex_heart != null:
			draw_texture_rect(tex_heart, Rect2(-10, -68 + hop_y, 20, 20), false)
		elif disappointed:
			if tex_parchment != null:
				draw_texture_rect(tex_parchment, Rect2(-16, -70 + hop_y, 32, 22), false)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(-10, -64 + hop_y), "...", 13, Color(0.35, 0.25, 0.20), Color.WHITE, false)
