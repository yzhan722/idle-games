extends Node2D
class_name AnimalWorker
## Per-Island Multi-Slot Specialized Pipeline Animal Worker (`src/entities/units/AnimalWorker.gd`) — PRD Patch v2.2
## - Supports strict per-island Recruit Caps (`home_island: 1..3`, `slot_index: 0..1`):
##   * Island 1: Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
##   * Island 2: Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
##   * Island 3: Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
## - Supports Single-Bunny Cold-Start Fallback (when Island 1 has 0 Otters, Bunny carries straight to Market Stall),
##   Otter Smart Overflow Routing (diverts to Market Stall when Workshop input is full),
##   and Full-Buffer `"Zzz..."` Sleep Bubble!

enum RoleType {
	BUNNY_FARMER,
	OTTER_LOGISTICS,
	TOUCAN_TRADER,
	FOX_MORTAR_CHEF,
	PENGUIN_ALCHEMIST,
	SHIBA_MANAGER
}

@export var role_type: RoleType = RoleType.BUNNY_FARMER
@export var home_island: int = 1
@export var slot_index: int = 0

var animal_key: String = "bunny"
var sheet_key: String = "animals/bunny_sheet.png"

var tex_sheet: Texture2D
var tex_crops: Texture2D
var tex_delicacies: Texture2D
var tex_heart: Texture2D

@onready var carry_icon: Sprite2D = Sprite2D.new()

var waypoint_graph: WaypointGraph
var world_ref: Node2D
var nav_path: Array[Vector2] = []

var worker_step: int = 0
var state_timer: float = 0.0
var work_duration: float = 2.5
var anim_time: float = 0.0
var is_moving: bool = false
var is_sleeping_full: bool = false
var facing_left: bool = false
var visual_flip: float = 1.0

var carrying_item_id: String = ""
var carrying_qty: int = 0
var target_plot: SoilPlot = null
var boost_timer: float = 0.0
var footstep_puffs: Array[Dictionary] = []
var last_step_cycle: int = -1

func _ready() -> void:
	carry_icon.name = "CarryIcon"
	carry_icon.visible = false
	carry_icon.position = Vector2(0, -54)
	add_child(carry_icon)

	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

func setup_worker(p_role: RoleType, p_island: int, p_slot: int, p_pos: Vector2, p_graph: WaypointGraph, p_world: Node2D) -> void:
	role_type = p_role
	home_island = p_island
	slot_index = p_slot
	waypoint_graph = p_graph
	world_ref = p_world
	match role_type:
		RoleType.BUNNY_FARMER:
			animal_key = "bunny"
		RoleType.OTTER_LOGISTICS:
			animal_key = "otter"
		RoleType.TOUCAN_TRADER:
			animal_key = "toucan"
		RoleType.FOX_MORTAR_CHEF:
			animal_key = "fox"
		RoleType.PENGUIN_ALCHEMIST:
			animal_key = "penguin"
		RoleType.SHIBA_MANAGER:
			animal_key = "shiba"
	var cfg: Dictionary = EconomyConfig.ANIMALS[animal_key]
	sheet_key = String(cfg["sheet"])
	tex_sheet = load("res://assets/pixel_art/" + sheet_key)
	position = waypoint_graph.constrain_to_walkable_surface(p_pos) if waypoint_graph != null else p_pos
	anim_time = randf() * 3.14
	_assign_next_task()

func get_level() -> int:
	return maxi(1, int(GameManager.animal_levels.get(animal_key, 1)))

func is_hired() -> bool:
	if not bool(GameManager.unlocked_islands.get(home_island, false)):
		return false
	return GameManager.get_island_recruited_count(home_island, animal_key) > slot_index

func _set_carry_visual(item_id: String, qty: int) -> void:
	carrying_item_id = item_id
	carrying_qty = qty
	if item_id == "" or qty <= 0:
		carry_icon.visible = false
		return
	carry_icon.visible = true
	carry_icon.region_enabled = true
	if item_id.begins_with("delicacy_"):
		carry_icon.texture = tex_delicacies
		carry_icon.region_rect = EconomyConfig.get_delicacy_region(item_id)
		carry_icon.scale = Vector2(0.65, 0.65)
	else:
		carry_icon.texture = tex_crops
		carry_icon.region_rect = EconomyConfig.get_crop_stage_region(item_id, 3)
		carry_icon.scale = Vector2(0.60, 0.60)

func _navigate_to(dest: Vector2) -> void:
	if waypoint_graph != null:
		nav_path = waypoint_graph.compute_path(position, dest)
	else:
		nav_path = [dest]

func _get_home_workshop_id() -> String:
	if home_island == 1:
		return "mortar"
	elif home_island == 2:
		return "cauldron"
	return "orbis_linked"

func _get_home_workshop_pos() -> Vector2:
	if home_island == 1:
		return waypoint_graph.get_named_pos("mortar")
	elif home_island == 2:
		return Vector2(362.0, 130.0)
	return Vector2(1632.0, 118.0)

func _get_home_basket_pos() -> Vector2:
	if home_island == 1:
		return waypoint_graph.get_named_pos("basket_1")
	elif home_island == 2:
		return waypoint_graph.get_named_pos("basket_2")
	return waypoint_graph.get_named_pos("basket_3")

func _process(delta: float) -> void:
	visible = is_hired()
	if not visible:
		return

	anim_time += delta
	if boost_timer > 0.0:
		boost_timer = maxf(0.0, boost_timer - delta)

	for i in range(footstep_puffs.size() - 1, -1, -1):
		footstep_puffs[i]["y"] -= 5.0 * delta
		footstep_puffs[i]["r"] += 2.0 * delta
		footstep_puffs[i]["alpha"] -= 0.75 * delta
		if float(footstep_puffs[i]["alpha"]) <= 0.02:
			footstep_puffs.remove_at(i)

	var target_flip := -1.0 if facing_left else 1.0
	visual_flip = move_toward(visual_flip, target_flip, delta * 9.0)
	if absf(visual_flip) < 0.15:
		visual_flip = 0.15 * signf(target_flip)

	if nav_path.size() > 0:
		is_moving = true
		var wp := nav_path[0]
		var to_wp := wp - position
		var dist := to_wp.length()
		if dist <= 3.5:
			position = waypoint_graph.constrain_to_walkable_surface(wp) if waypoint_graph != null else wp
			nav_path.remove_at(0)
			if nav_path.size() == 0:
				is_moving = false
				state_timer = 0.0
		else:
			if absf(to_wp.x) > 0.5:
				facing_left = to_wp.x < 0.0
			var spd := EconomyConfig.calc_move_speed(animal_key, get_level())
			var next_pos := position + (to_wp / dist) * spd * delta
			position = waypoint_graph.constrain_to_walkable_surface(next_pos) if waypoint_graph != null else next_pos

			var cyc := int(floor(anim_time * 7.5 / PI))
			if cyc != last_step_cycle:
				last_step_cycle = cyc
				var heel_x := 6.0 if facing_left else -6.0
				footstep_puffs.append({"x": position.x + heel_x, "y": position.y + 1.0, "r": 2.0, "alpha": 0.42})
	else:
		is_moving = false
		state_timer += delta
		_update_role_work_step()

	if carry_icon != null and carry_icon.visible:
		carry_icon.position = Vector2(0.0, -54.0 - absf(sin(anim_time * 12.0)) * 3.0)

	queue_redraw()

func _assign_next_task() -> void:
	state_timer = 0.0
	is_sleeping_full = false
	work_duration = EconomyConfig.calc_work_duration(animal_key, get_level())

	match role_type:
		RoleType.BUNNY_FARMER:
			var otter_on_isl := GameManager.is_island_otter_hired(home_island)
			if (otter_on_isl and GameManager.is_raw_basket_full(home_island)) or (not otter_on_isl and home_island == 1 and GameManager.is_stall_full()):
				is_sleeping_full = true
				worker_step = 99
				return

			target_plot = world_ref.find_best_plot_for_island(home_island) if (world_ref != null and world_ref.has_method("find_best_plot_for_island")) else null
			if target_plot != null:
				target_plot.reserved_by_worker = true
				worker_step = 0
				_navigate_to(target_plot.position + Vector2(float(slot_index * 8), 4.0))
			else:
				worker_step = 0
				var fallback_pos := waypoint_graph.get_named_pos("apple_tree") if home_island == 1 else _get_home_basket_pos()
				_navigate_to(fallback_pos)

		RoleType.OTTER_LOGISTICS:
			var wid := _get_home_workshop_id()
			var wpos := _get_home_workshop_pos()
			if home_island == 1 and GameManager.get_workshop_output_total(wid) > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(wpos + Vector2(14, 4))
			elif GameManager.get_island_basket_total(home_island) > 0:
				worker_step = 0
				_navigate_to(_get_home_basket_pos() + Vector2(float(slot_index * 10), 0.0))
			else:
				worker_step = 20
				_navigate_to(_get_home_basket_pos() + Vector2(float(slot_index * 10), 0.0))

		RoleType.TOUCAN_TRADER:
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			var wpos := Vector2(1632.0, 118.0) if home_island == 3 else Vector2(362.0, 130.0)
			if GameManager.get_workshop_output_total(wid) > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(wpos + Vector2(12, 4))
			elif GameManager.get_island_basket_total(home_island) > 0 and not GameManager.is_stall_full():
				worker_step = 0
				_navigate_to(_get_home_basket_pos())
			else:
				worker_step = 40
				_navigate_to(wpos + Vector2(float(slot_index * 12), 8.0))

		RoleType.FOX_MORTAR_CHEF:
			worker_step = 0
			var fpos := Vector2(1612.0, 118.0) if home_island == 3 else (waypoint_graph.get_named_pos("mortar") + Vector2(-18, 4))
			_navigate_to(fpos)

		RoleType.PENGUIN_ALCHEMIST:
			worker_step = 0
			var ppos := Vector2(1652.0, 118.0) if home_island == 3 else Vector2(344.0, 130.0)
			_navigate_to(ppos)

		RoleType.SHIBA_MANAGER:
			worker_step = 0
			_navigate_to(waypoint_graph.get_named_pos("market_stall") + Vector2(22, 4))

func _update_role_work_step() -> void:
	match role_type:
		RoleType.BUNNY_FARMER:
			if worker_step == 99:
				var otter_on_isl := GameManager.is_island_otter_hired(home_island)
				var still_full := (otter_on_isl and GameManager.is_raw_basket_full(home_island)) or (not otter_on_isl and home_island == 1 and GameManager.is_stall_full())
				if not still_full and state_timer >= 0.8:
					is_sleeping_full = false
					_assign_next_task()
				return

			if worker_step == 0:
				if state_timer >= work_duration * 0.65:
					var b_lv := int(GameManager.building_levels.get("soil_" + str(home_island), 1))
					var crop_got := EconomyConfig.get_evolved_crop_id(home_island, b_lv)
					var qty_got := 1
					if is_instance_valid(target_plot):
						crop_got = target_plot.crop_id
						qty_got = target_plot.harvest_crop_yield()

					# PRD v2.2 Rule 1.1 vs Rule 1.3:
					# On Island 1 before Otter is hired: Bunny carries directly to Market Stall for 1x sale!
					if home_island == 1 and not GameManager.is_island_otter_hired(1):
						_set_carry_visual(crop_got, qty_got)
						worker_step = 2
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))
					else:
						GameManager.add_to_raw_basket(home_island, crop_got, qty_got)
						_set_carry_visual("", 0)
						_assign_next_task()

			elif worker_step == 2:
				if state_timer >= 0.45:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(cid, q)
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "鲜果直售+" + str(q), Color(0.78, 1.0, 0.65))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.OTTER_LOGISTICS:
			var cap := EconomyConfig.calc_carry_capacity("otter", get_level())
			var wid := _get_home_workshop_id()
			var wpos := _get_home_workshop_pos()
			if worker_step == 20:
				if state_timer >= 0.8:
					_assign_next_task()
				return

			if worker_step == 0:
				if state_timer >= 0.45:
					var taken := GameManager.take_from_raw_basket(home_island, cap)
					if taken.is_empty():
						_assign_next_task()
						return
					var item_id := String(taken["item_id"])
					var qty := int(taken["qty"])
					_set_carry_visual(item_id, qty)

					var chef_key := "fox" if home_island == 1 else "penguin"
					var chef_ready := GameManager.get_island_recruited_count(home_island, chef_key) >= 1
					if chef_ready and not GameManager.is_workshop_input_full(wid):
						worker_step = 1
						_navigate_to(wpos + Vector2(-14, 4))
					else:
						# PRD v2.2 Rule 2.2: Smart Overflow directly to Market Stall!
						worker_step = 2
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))

			elif worker_step == 1:
				if state_timer >= 0.45:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					var accepted := GameManager.add_to_workshop_input(wid, cid, q)
					var leftover := q - accepted
					if leftover > 0:
						_set_carry_visual(cid, leftover)
						worker_step = 2
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))
					else:
						_set_carry_visual("", 0)
						_assign_next_task()

			elif worker_step == 2:
				if state_timer >= 0.45:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(cid, q)
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "分流直售+" + str(q), Color(0.82, 0.96, 1.0))
					_set_carry_visual("", 0)
					_assign_next_task()

			elif worker_step == 10:
				if state_timer >= 0.45:
					var out_taken := GameManager.take_from_workshop_output(wid, cap)
					if out_taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(out_taken["item_id"]), int(out_taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))

			elif worker_step == 11:
				if state_timer >= 0.45:
					GameManager.add_to_stall(carrying_item_id, maxi(1, carrying_qty))
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "3.5x美食+" + str(maxi(1, carrying_qty)), Color(1.0, 0.92, 0.48))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.TOUCAN_TRADER:
			var cap := EconomyConfig.calc_carry_capacity("toucan", get_level())
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			if worker_step == 40:
				if state_timer >= 0.9:
					_assign_next_task()
				return

			if worker_step == 0:
				if state_timer >= 0.45:
					var taken := GameManager.take_from_raw_basket(home_island, cap)
					if taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(taken["item_id"]), int(taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))

			elif worker_step == 10:
				if state_timer >= 0.45:
					var out_taken := GameManager.take_from_workshop_output(wid, cap)
					if out_taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(out_taken["item_id"]), int(out_taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))

			elif worker_step == 11:
				if state_timer >= 0.45:
					var did := carrying_item_id if carrying_item_id != "" else "delicacy_2"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(did, q)
					var tag := "52x盛宴+" if home_island == 3 else "12x甘露+"
					EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), tag + str(q), Color(1.0, 0.88, 0.35))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.FOX_MORTAR_CHEF:
			var wid := "orbis_linked" if home_island == 3 else "mortar"
			var w_node: Workshop = (world_ref.orbis_linked_workshop if home_island == 3 else world_ref.mortar_workshop) if world_ref != null else null
			if GameManager.get_workshop_input_total(wid) <= 0 or GameManager.is_workshop_output_full(wid):
				if w_node != null:
					w_node.is_processing = false
				state_timer = 0.0
				return
			if w_node != null:
				w_node.is_processing = true
				w_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing(wid)
				if used_crop != "":
					var out_del := w_node.get_evolved_output_delicacy() if w_node != null else "delicacy_0"
					GameManager.add_to_workshop_output(wid, out_del, 1)
					var mult_txt := "52x精炼+1" if home_island == 3 else "3.5x美食+1"
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), mult_txt, Color(1.0, 0.92, 0.55))
				if w_node != null:
					w_node.process_progress = 0.0

		RoleType.PENGUIN_ALCHEMIST:
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			var w_node: Workshop = (world_ref.orbis_linked_workshop if home_island == 3 else world_ref.cauldron_workshop) if world_ref != null else null
			if GameManager.get_workshop_input_total(wid) <= 0 or GameManager.is_workshop_output_full(wid):
				if w_node != null:
					w_node.is_processing = false
				state_timer = 0.0
				return
			if w_node != null:
				w_node.is_processing = true
				w_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing(wid)
				if used_crop != "":
					var out_del := w_node.get_evolved_output_delicacy() if w_node != null else "delicacy_2"
					GameManager.add_to_workshop_output(wid, out_del, 1)
					var mult_txt := "52x星露宴+1" if home_island == 3 else "12x甘露+1"
					EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), mult_txt, Color(0.75, 0.96, 1.0))
				if w_node != null:
					w_node.process_progress = 0.0

		RoleType.SHIBA_MANAGER:
			facing_left = true

func _get_pose_index() -> int:
	if is_sleeping_full:
		return 4
	if is_moving:
		var walk_frame := int(floor(anim_time * 7.5 / PI)) % 2
		if carrying_item_id != "":
			return 2 if walk_frame == 0 else 1
		return walk_frame
	return 3

func _draw() -> void:
	if tex_sheet == null or not is_hired():
		return

	for puff in footstep_puffs:
		var local_p := Vector2(float(puff["x"]) - position.x, float(puff["y"]) - position.y)
		draw_circle(local_p, float(puff["r"]), Color(0.95, 0.91, 0.80, float(puff["alpha"])))

	var pose_idx := _get_pose_index()
	var hop_y := 0.0
	var scale_x := 1.0
	var scale_y := 1.0
	var tilt_rad := 0.0
	if is_moving:
		hop_y = -absf(sin(anim_time * 8.5)) * 3.2
		var squash := cos(anim_time * 17.0)
		scale_x = 1.0 - squash * 0.04
		scale_y = 1.0 + squash * 0.045
		tilt_rad = sin(anim_time * 8.5) * 0.045
	else:
		var breath := sin(anim_time * 3.2)
		scale_x = 1.0 + breath * 0.02
		scale_y = 1.0 - breath * 0.02

	var shadow_ratio := clampf(1.0 + hop_y * 0.08, 0.72, 1.0)
	draw_circle(Vector2(0, 2), 13.0 * shadow_ratio, Color(0.05, 0.04, 0.02, 0.34 * shadow_ratio))

	var src_rect := EconomyConfig.get_frame_region(sheet_key, pose_idx)
	var cw := src_rect.size.x
	var ch := src_rect.size.y

	draw_set_transform(Vector2(0.0, hop_y), tilt_rad, Vector2(scale_x * absf(visual_flip), scale_y))
	var dst_rect := Rect2(-cw * 0.5, -ch + 4.0, cw, ch)
	draw_texture_rect_region(tex_sheet, dst_rect, src_rect, Color.WHITE, facing_left)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	if is_sleeping_full:
		var z_bob := sin(anim_time * 2.5) * 2.0
		PixelFontRenderer.draw_pixel_cn(self, Vector2(-14.0, -56.0 + z_bob), "Zzz...", 13, Color(0.86, 0.94, 1.0), Color(0.12, 0.06, 0.02, 0.95), true)
