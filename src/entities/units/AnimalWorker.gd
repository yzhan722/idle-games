extends Node2D
class_name AnimalWorker
## Per-Island Multi-Slot Specialized Pipeline Animal Worker (`src/entities/units/AnimalWorker.gd`)
## Strictly enforces GEMINI.md Laws 2, 3, 4, 5:
## - Root `position.y = GROUND_Y` (`z_index = 10`, `z_as_relative = false`).
## - `body_sprite`: `region_enabled = false`, `hframes = 4`, `vframes = 1`, `frame = pose_idx` (`60x60` per frame, aspect 1.0).
## - `body_sprite`: `centered = true`, `offset = Vector2(0.0, -float(60) * 0.5) = Vector2(0.0, -30.0)`.
## - `carry_icon`: `z_index = 20`, `z_as_relative = false`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` (`shadow_width = 44 * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`).

const FRAME_W := 60
const FRAME_H := 60
const VISUAL_WIDTH := 44.0

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

@onready var body_sprite: Sprite2D = Sprite2D.new()
@onready var carry_icon: Sprite2D = Sprite2D.new()
var sleep_label: Label

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

var carrying_item_id: String = ""
var carrying_qty: int = 0
var target_plot: SoilPlot = null
var boost_timer: float = 0.0
var total_distance_moved: float = 0.0

func _ready() -> void:
	z_index = EconomyConfig.Z_UNIT
	z_as_relative = false

	# GEMINI.md Law 2.2 & Law 4: Fixed grid slicing (`hframes = 4, vframes = 1, region_enabled = false`) + Bottom-Center Pivot
	body_sprite.name = "BodySprite"
	body_sprite.region_enabled = false
	body_sprite.hframes = 4
	body_sprite.vframes = 1
	body_sprite.frame = 0
	body_sprite.centered = true
	body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)
	body_sprite.z_index = EconomyConfig.Z_UNIT
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	carry_icon.name = "CarryIcon"
	carry_icon.visible = false
	carry_icon.centered = true
	carry_icon.position = Vector2(0.0, -56.0)
	carry_icon.z_index = EconomyConfig.Z_CARRY_EMOTE
	carry_icon.z_as_relative = false
	add_child(carry_icon)

	sleep_label = EconomyConfig.create_pixel_label("Zzz...", 14, Color("#FFF4D6"), true)
	sleep_label.position = Vector2(-30.0, -68.0)
	sleep_label.custom_minimum_size = Vector2(60.0, 20.0)
	sleep_label.visible = false
	sleep_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	sleep_label.z_as_relative = false
	add_child(sleep_label)

	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
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
	var m_entry := EconomyConfig.get_manifest_entry(sheet_key)
	var norm_path := String(m_entry.get("normalized_sheet", "res://assets/pixel_art/" + sheet_key))
	tex_sheet = load(norm_path)
	if body_sprite != null:
		body_sprite.texture = tex_sheet
		body_sprite.region_enabled = false
		body_sprite.hframes = 4
		body_sprite.vframes = 1
		body_sprite.frame = 0
		body_sprite.offset = Vector2(0.0, -float(FRAME_H) * 0.5)
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
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
	carry_icon.region_enabled = false
	if item_id.begins_with("delicacy_"):
		var d_data: Dictionary = EconomyConfig.DELICACIES.get(item_id, EconomyConfig.DELICACIES["delicacy_0"])
		carry_icon.texture = tex_delicacies
		carry_icon.hframes = 4
		carry_icon.vframes = 1
		carry_icon.frame = clampi(int(d_data.get("idx", 0)), 0, 3)
		carry_icon.scale = Vector2(0.65, 0.65)
	else:
		var c_data: Dictionary = EconomyConfig.CROPS.get(item_id, EconomyConfig.CROPS["crop_0"])
		var row := clampi(int(c_data.get("crop_row", 0)), 0, 3)
		carry_icon.texture = tex_crops
		carry_icon.hframes = 4
		carry_icon.vframes = 4
		carry_icon.frame = row * 4 + 3
		carry_icon.scale = Vector2(0.60, 0.60)

func _navigate_to(dest: Vector2) -> void:
	var grounded_dest := Vector2(dest.x, EconomyConfig.GROUND_Y)
	if waypoint_graph != null:
		nav_path = waypoint_graph.compute_path(position, grounded_dest)
	else:
		nav_path = [grounded_dest]

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
		return waypoint_graph.get_named_pos("cauldron")
	return waypoint_graph.get_named_pos("orbis_linked")

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

	if nav_path.size() > 0:
		is_moving = true
		var spd := EconomyConfig.calc_move_speed(animal_key, get_level())
		var rem_move := spd * delta
		while rem_move > 0.0 and nav_path.size() > 0:
			var wp := Vector2(nav_path[0].x, EconomyConfig.GROUND_Y)
			var diff_x := wp.x - position.x
			var dist := absf(diff_x)
			if absf(diff_x) > 0.2:
				facing_left = diff_x < 0.0
			if dist <= rem_move or dist <= 1.5:
				total_distance_moved += dist
				position = wp
				rem_move -= dist
				nav_path.remove_at(0)
			else:
				var step_x := signf(diff_x) * rem_move
				total_distance_moved += absf(step_x)
				position = Vector2(position.x + step_x, EconomyConfig.GROUND_Y)
				rem_move = 0.0
		if nav_path.size() == 0:
			is_moving = false
			state_timer = 0.0
	else:
		is_moving = false
		position.y = EconomyConfig.GROUND_Y
		state_timer += delta
		_update_role_work_step()

	var pose_idx := _get_pose_index()
	var hop_y := 0.0
	var scale_x := 1.0
	var scale_y := 1.0
	if is_moving:
		hop_y = -absf(sin(anim_time * 8.5)) * 2.5
		var squash := cos(anim_time * 17.0)
		scale_x = 1.0 - squash * 0.03
		scale_y = 1.0 + squash * 0.03
	else:
		var breath := sin(anim_time * 3.2)
		scale_x = 1.0 + breath * 0.02
		scale_y = 1.0 - breath * 0.02

	rotation = 0.0
	if body_sprite != null and tex_sheet != null:
		body_sprite.texture = tex_sheet
		body_sprite.region_enabled = false
		body_sprite.hframes = 4
		body_sprite.vframes = 1
		body_sprite.frame = clampi(pose_idx, 0, 2)
		body_sprite.flip_h = facing_left
		body_sprite.position = Vector2(0.0, hop_y)
		body_sprite.rotation = 0.0
		body_sprite.scale = Vector2(scale_x, scale_y)

	if carry_icon != null and carry_icon.visible:
		carry_icon.position = Vector2(0.0, -56.0 + hop_y)
		carry_icon.rotation = 0.0

	if sleep_label != null:
		sleep_label.visible = is_sleeping_full
		if is_sleeping_full:
			sleep_label.position = Vector2(-30.0, -68.0 + sin(anim_time * 2.5) * 2.0)

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
				_navigate_to(target_plot.position + Vector2(float(slot_index * 10), 0.0))
			else:
				worker_step = 0
				var fallback_pos := waypoint_graph.get_named_pos("apple_tree") if home_island == 1 else _get_home_basket_pos()
				_navigate_to(fallback_pos)

		RoleType.OTTER_LOGISTICS:
			var wid := _get_home_workshop_id()
			var wpos := _get_home_workshop_pos()
			if home_island == 1 and GameManager.get_workshop_output_total(wid) > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(wpos + Vector2(14.0, 0.0))
			elif GameManager.get_island_basket_total(home_island) > 0:
				worker_step = 0
				_navigate_to(_get_home_basket_pos() + Vector2(float(slot_index * 10), 0.0))
			else:
				worker_step = 20
				_navigate_to(_get_home_basket_pos() + Vector2(float(slot_index * 10), 0.0))

		RoleType.TOUCAN_TRADER:
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			var wpos := _get_home_workshop_pos()
			if GameManager.get_workshop_output_total(wid) > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(wpos + Vector2(12.0, 0.0))
			elif GameManager.get_island_basket_total(home_island) > 0 and not GameManager.is_stall_full():
				worker_step = 0
				_navigate_to(_get_home_basket_pos())
			else:
				worker_step = 40
				_navigate_to(wpos + Vector2(float(slot_index * 12), 0.0))

		RoleType.FOX_MORTAR_CHEF:
			worker_step = 0
			var fpos := _get_home_workshop_pos() + Vector2(-18.0, 0.0)
			_navigate_to(fpos)

		RoleType.PENGUIN_ALCHEMIST:
			worker_step = 0
			var ppos := _get_home_workshop_pos() + Vector2(-18.0, 0.0)
			_navigate_to(ppos)

		RoleType.SHIBA_MANAGER:
			worker_step = 0
			_navigate_to(waypoint_graph.get_named_pos("market_stall") + Vector2(22.0, 0.0))

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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), "鲜果直售+" + str(q), Color("#FFE066"))
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
						_navigate_to(wpos + Vector2(-14.0, 0.0))
					else:
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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), "分流直售+" + str(q), Color("#FFF4D6"))
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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), "3.5x美食+" + str(maxi(1, carrying_qty)), Color("#FFE066"))
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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), tag + str(q), Color("#FFE066"))
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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), mult_txt, Color("#FFE066"))
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
					EventBus.spawn_floating_text.emit(position + Vector2(0, -48), mult_txt, Color("#FFE066"))
				if w_node != null:
					w_node.process_progress = 0.0

		RoleType.SHIBA_MANAGER:
			facing_left = true

func _get_pose_index() -> int:
	# Strictly keep all animal poses upright (0 = Idle/Stand, 1 = Walk, 2 = Active Work).
	# Never select frame 3 (horizontal lying-down sleep pose) to prevent sudden 90-degree sideways sprite flips.
	if is_sleeping_full or worker_step == 20 or worker_step == 40 or worker_step == 99:
		return 0
	if is_moving:
		return int(floor(anim_time * 7.5 / PI)) % 2
	if role_type == RoleType.SHIBA_MANAGER:
		return 0
	return 2 if (int(floor(anim_time * 4.2)) % 2 == 0) else 0

func _draw() -> void:
	if not is_hired():
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, VISUAL_WIDTH)
