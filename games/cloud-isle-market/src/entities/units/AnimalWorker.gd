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
var tex_carry_rig: Texture2D
var tex_heart: Texture2D

var body_sprite: Sprite2D = Sprite2D.new()
var carry_icon: Sprite2D = Sprite2D.new()
var carry_front_grip: Sprite2D = Sprite2D.new()
var heart_icon: Sprite2D = Sprite2D.new()
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
var cooking_crop_id: String = ""
var target_plot: SoilPlot = null
const PET_BOOST_DURATION := 8.0
const PET_COOLDOWN_DURATION := 4.5
const PET_JUMP_DURATION := 0.48
var boost_timer: float = 0.0
var pet_cooldown_timer: float = 0.0
var pet_jump_timer: float = 0.0
var pet_motes: Array[Sprite2D] = []
var total_distance_moved: float = 0.0
var _was_hired: bool = false

func _ready() -> void:
	z_index = EconomyConfig.Z_UNIT
	z_as_relative = false

	# GEMINI.md Law 2.2 & Law 4: Fixed grid slicing (`hframes = 4, vframes = 1, region_enabled = false`) + Bottom-Center Pivot
	body_sprite.name = "BodySprite"
	if tex_sheet != null:
		body_sprite.texture = tex_sheet
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
	carry_icon.position = Vector2(15.0, -22.0)
	carry_icon.z_index = EconomyConfig.Z_CARRY_EMOTE
	carry_icon.z_as_relative = false
	add_child(carry_icon)

	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_carry_rig = load("res://assets/pixel_art/animals/carry_rig_sheet.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

	carry_front_grip.name = "CarryFrontGrip"
	carry_front_grip.texture = tex_carry_rig
	carry_front_grip.region_enabled = false
	carry_front_grip.hframes = 3
	carry_front_grip.vframes = 1
	carry_front_grip.frame = 0
	carry_front_grip.visible = false
	carry_front_grip.centered = true
	carry_front_grip.position = Vector2(14.0, -18.0)
	carry_front_grip.z_index = EconomyConfig.Z_CARRY_EMOTE + 1
	carry_front_grip.z_as_relative = false
	add_child(carry_front_grip)

	sleep_label = EconomyConfig.create_pixel_label("Zzz...", 14, Color("#FFF4D6"), true)
	sleep_label.position = Vector2(-30.0, -68.0)
	sleep_label.custom_minimum_size = Vector2(60.0, 20.0)
	sleep_label.visible = false
	sleep_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	sleep_label.z_as_relative = false
	add_child(sleep_label)

	heart_icon.name = "HeartIcon"
	heart_icon.texture = tex_heart
	heart_icon.visible = false
	heart_icon.centered = true
	heart_icon.scale = Vector2(0.55, 0.55)
	heart_icon.position = Vector2(0.0, -68.0)
	heart_icon.z_index = EconomyConfig.Z_CARRY_EMOTE
	heart_icon.z_as_relative = false
	add_child(heart_icon)

	for mi in range(2):
		var mote := Sprite2D.new()
		mote.name = "HeartMote_" + str(mi)
		mote.texture = tex_heart
		mote.visible = false
		mote.centered = true
		mote.scale = Vector2(0.32, 0.32)
		mote.z_index = EconomyConfig.Z_CARRY_EMOTE + 1
		mote.z_as_relative = false
		add_child(mote)
		pet_motes.append(mote)

func get_pet_hit_rect() -> Rect2:
	return Rect2(position.x - 24.0, position.y - 54.0, 48.0, 56.0)

func can_be_petted() -> bool:
	return visible and is_hired() and pet_cooldown_timer <= 0.0

func trigger_pet_boost() -> bool:
	if not visible or not is_hired():
		return false
	if pet_cooldown_timer > 0.0:
		return false
	boost_timer = PET_BOOST_DURATION
	pet_cooldown_timer = PET_COOLDOWN_DURATION
	pet_jump_timer = PET_JUMP_DURATION
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.spawn_floating_text.emit(position + Vector2(0.0, -64.0), "★干劲满满 加速8s!", Color("#FFE066"))
	return true

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
	_was_hired = is_hired()
	visible = _was_hired
	if _was_hired:
		_assign_next_task()

func get_level() -> int:
	return maxi(1, int(GameManager.animal_levels.get(animal_key, 1)))

func get_effective_harvest_bonus() -> int:
	return EconomyConfig.calc_bunny_harvest_trait_bonus(get_level())

func is_hired() -> bool:
	if not bool(GameManager.unlocked_islands.get(home_island, false)):
		return false
	return GameManager.get_island_recruited_count(home_island, animal_key) > slot_index

func _set_carry_visual(item_id: String, qty: int) -> void:
	carrying_item_id = item_id
	carrying_qty = qty
	if item_id == "" or qty <= 0:
		carry_icon.visible = false
		carry_front_grip.visible = false
		return
	carry_icon.visible = true
	carry_icon.region_enabled = false
	if item_id.begins_with("delicacy_"):
		var d_data: Dictionary = EconomyConfig.DELICACIES.get(item_id, EconomyConfig.DELICACIES["delicacy_0"])
		carry_icon.texture = tex_delicacies
		carry_icon.hframes = 4
		carry_icon.vframes = 1
		carry_icon.frame = clampi(int(d_data.get("idx", 0)), 0, 3)
		carry_icon.scale = Vector2(0.50, 0.50)
	else:
		var c_data: Dictionary = EconomyConfig.CROPS.get(item_id, EconomyConfig.CROPS["crop_0"])
		var row := clampi(int(c_data.get("crop_row", 0)), 0, 3)
		carry_icon.texture = tex_crops
		carry_icon.hframes = 4
		carry_icon.vframes = 4
		carry_icon.frame = row * 4 + 3
		carry_icon.scale = Vector2(0.44, 0.44)

	carry_front_grip.visible = true
	carry_front_grip.region_enabled = false
	carry_front_grip.hframes = 3
	carry_front_grip.vframes = 1
	if role_type == RoleType.OTTER_LOGISTICS:
		carry_front_grip.frame = 1
	elif role_type == RoleType.TOUCAN_TRADER:
		carry_front_grip.frame = 2
	else:
		carry_front_grip.frame = 0
	_sync_carry_rig_transform(0.0)

func _sync_carry_rig_transform(hop_y: float) -> void:
	var dir_sign := -1.0 if facing_left else 1.0
	var rig_x := 14.0
	var rig_y := -18.0
	var item_x := 15.0
	var item_y := -22.0
	if role_type == RoleType.OTTER_LOGISTICS:
		rig_x = 15.0
		rig_y = -18.0
		item_x = 16.0
		item_y = -21.0
	elif role_type == RoleType.TOUCAN_TRADER:
		rig_x = 14.0
		rig_y = -15.0
		item_x = 15.0
		item_y = -19.0

	if carry_icon != null and carry_icon.visible:
		carry_icon.position = Vector2(dir_sign * item_x, item_y + hop_y)
		carry_icon.flip_h = facing_left
		carry_icon.rotation = 0.0

	if carry_front_grip != null and carry_front_grip.visible:
		carry_front_grip.position = Vector2(dir_sign * rig_x, rig_y + hop_y)
		carry_front_grip.flip_h = facing_left
		carry_front_grip.rotation = 0.0

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

func _get_workshop_dock_pos(dock_suffix: String) -> Vector2:
	var prefix := "mortar"
	if home_island == 2:
		prefix = "cauldron"
	elif home_island == 3:
		prefix = "orbis"
	if waypoint_graph != null:
		if home_island == 3 and dock_suffix == "chef":
			var chef_dock := "orbis_chef_penguin" if role_type == RoleType.PENGUIN_ALCHEMIST else "orbis_chef_fox"
			return waypoint_graph.get_dock_pos(chef_dock)
		return waypoint_graph.get_dock_pos(prefix + "_" + dock_suffix)
	return _get_home_workshop_pos()

func _get_home_basket_pos() -> Vector2:
	if waypoint_graph != null:
		return waypoint_graph.get_dock_pos("basket_%d_pickup" % home_island)
	return Vector2(785.2, EconomyConfig.GROUND_Y)

func _is_home_chef_hired() -> bool:
	if home_island == 1:
		return GameManager.get_island_recruited_count(1, "fox") >= 1
	elif home_island == 2:
		return GameManager.get_island_recruited_count(2, "penguin") >= 1
	return GameManager.get_island_recruited_count(3, "fox") >= 1 or GameManager.get_island_recruited_count(3, "penguin") >= 1

func _try_deposit_to_stall(item_id: String, qty: int, _float_prefix: String, _float_col: Color) -> bool:
	var safe_id := item_id if item_id != "" else "crop_0"
	var safe_qty := maxi(1, qty)
	var accepted := GameManager.add_to_stall(safe_id, safe_qty)
	var rem := safe_qty - accepted
	if rem > 0:
		# Route any stall-cap overflow back into the home buffer so no items are lost and workers never loiter at the stall counter
		if safe_id.begins_with("delicacy_"):
			GameManager.add_to_workshop_output(_get_home_workshop_id(), safe_id, rem)
		else:
			GameManager.add_to_raw_basket(home_island, safe_id, rem)
	_set_carry_visual("", 0)
	is_sleeping_full = false
	return true

func _process(delta: float) -> void:
	var now_hired := is_hired()
	if now_hired and not _was_hired:
		_was_hired = true
		visible = true
		_assign_next_task()
		queue_redraw()
	elif not now_hired and _was_hired:
		_was_hired = false
		visible = false
		queue_redraw()
	if not visible:
		return

	anim_time += delta
	if boost_timer > 0.0:
		boost_timer = maxf(0.0, boost_timer - delta)
	if pet_cooldown_timer > 0.0:
		pet_cooldown_timer = maxf(0.0, pet_cooldown_timer - delta)
	if pet_jump_timer > 0.0:
		pet_jump_timer = maxf(0.0, pet_jump_timer - delta)

	var haste_mult := 1.0
	if boost_timer > 0.0:
		haste_mult *= 1.55
	if GameManager != null and GameManager.frenzy_timer > 0.0:
		haste_mult *= 1.5

	if nav_path.size() > 0:
		is_moving = true
		var spd := EconomyConfig.calc_move_speed(animal_key, get_level()) * haste_mult
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
		state_timer += delta * haste_mult
		_update_role_work_step(delta * haste_mult)

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

	if pet_jump_timer > 0.0:
		var jump_t := 1.0 - clampf(pet_jump_timer / PET_JUMP_DURATION, 0.0, 1.0)
		var bounce_arc := absf(sin(jump_t * PI * 2.0))
		hop_y -= bounce_arc * 9.5
		scale_x *= (1.0 - bounce_arc * 0.06)
		scale_y *= (1.0 + bounce_arc * 0.09)

	rotation = 0.0
	if body_sprite != null and tex_sheet != null:
		body_sprite.frame = clampi(pose_idx, 0, 2)
		body_sprite.flip_h = facing_left
		body_sprite.position = Vector2(0.0, hop_y)
		body_sprite.rotation = 0.0
		body_sprite.scale = Vector2(scale_x, scale_y)

	if carry_icon != null and carry_icon.visible:
		_sync_carry_rig_transform(hop_y)

	if heart_icon != null:
		heart_icon.visible = (boost_timer > 0.0)
		if heart_icon.visible:
			var pulse_s := 0.55 + (0.14 if pet_jump_timer > 0.0 else 0.03 * sin(anim_time * 7.0))
			heart_icon.scale = Vector2(pulse_s, pulse_s)
			heart_icon.position = Vector2(0.0, -62.0 + hop_y + sin(anim_time * 6.0) * 2.0)
			heart_icon.rotation = 0.0

	for mi in range(pet_motes.size()):
		var mote := pet_motes[mi]
		if mote == null:
			continue
		mote.visible = (pet_jump_timer > 0.0)
		if mote.visible:
			var prog := 1.0 - clampf(pet_jump_timer / PET_JUMP_DURATION, 0.0, 1.0)
			var side_dir := -1.0 if mi == 0 else 1.0
			mote.position = Vector2(side_dir * (10.0 + prog * 8.0), -54.0 - prog * 20.0 + hop_y * 0.5)
			mote.modulate.a = clampf(1.15 - prog, 0.0, 1.0)
			mote.rotation = 0.0

	if sleep_label != null:
		sleep_label.visible = is_sleeping_full and (boost_timer <= 0.0)
		if sleep_label.visible:
			sleep_label.position = Vector2(-30.0, -68.0 + sin(anim_time * 2.5) * 2.0)

func _assign_next_task() -> void:
	state_timer = 0.0
	is_sleeping_full = false
	work_duration = EconomyConfig.calc_work_duration(animal_key, get_level())

	match role_type:
		RoleType.BUNNY_FARMER:
			target_plot = world_ref.find_best_plot_for_island(home_island) if (world_ref != null and world_ref.has_method("find_best_plot_for_island")) else null
			var soil_dock_key := "soil_%d_slot_%d" % [home_island, clampi(slot_index, 0, 1)]
			var dock_dest := waypoint_graph.get_dock_pos(soil_dock_key) if waypoint_graph != null else (target_plot.position if target_plot != null else position)
			var otter_on_isl := GameManager.is_island_otter_hired(home_island)
			var downstream_blocked := GameManager.is_raw_basket_full(home_island) if (otter_on_isl or home_island != 1) else GameManager.is_stall_full()
			if downstream_blocked:
				is_sleeping_full = true
				worker_step = 99
				_navigate_to(dock_dest)
				return

			worker_step = 0
			_navigate_to(dock_dest)

		RoleType.OTTER_LOGISTICS:
			var wid := _get_home_workshop_id()
			var can_deliver_output := (home_island == 1) and (GameManager.get_workshop_output_total(wid) > 0) and (not GameManager.is_stall_full())
			var can_feed_workshop := _is_home_chef_hired() and (not GameManager.is_workshop_input_full(wid))
			var can_divert_to_stall := not GameManager.is_stall_full()
			if can_deliver_output:
				worker_step = 10
				_navigate_to(_get_workshop_dock_pos("output"))
			elif GameManager.get_island_basket_total(home_island) > 0 and (can_feed_workshop or can_divert_to_stall):
				worker_step = 0
				_navigate_to(_get_home_basket_pos() + Vector2(14.0 + float(slot_index * 8), 0.0))
			else:
				worker_step = 20
				is_sleeping_full = (GameManager.get_island_basket_total(home_island) > 0 and not can_feed_workshop and not can_divert_to_stall) or (home_island == 1 and GameManager.get_workshop_output_total(wid) > 0 and GameManager.is_stall_full())
				_navigate_to(_get_home_basket_pos() + Vector2(14.0 + float(slot_index * 8), 0.0))

		RoleType.TOUCAN_TRADER:
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			var can_take_raw_fallback := (not _is_home_chef_hired()) or GameManager.is_workshop_input_full(wid) or (not GameManager.is_island_otter_hired(home_island))
			if GameManager.get_workshop_output_total(wid) > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(_get_workshop_dock_pos("output"))
			elif GameManager.get_island_basket_total(home_island) > 0 and can_take_raw_fallback and not GameManager.is_stall_full():
				worker_step = 0
				_navigate_to(_get_home_basket_pos())
			else:
				worker_step = 40
				is_sleeping_full = GameManager.is_stall_full() and (GameManager.get_workshop_output_total(wid) > 0 or GameManager.get_island_basket_total(home_island) > 0)
				_navigate_to(_get_workshop_dock_pos("output") + Vector2(float(slot_index * 12), 0.0))

		RoleType.FOX_MORTAR_CHEF:
			worker_step = 0
			_navigate_to(_get_workshop_dock_pos("chef"))

		RoleType.PENGUIN_ALCHEMIST:
			worker_step = 0
			_navigate_to(_get_workshop_dock_pos("chef"))

		RoleType.SHIBA_MANAGER:
			worker_step = 0
			_navigate_to(waypoint_graph.get_dock_pos("stall_manager") if waypoint_graph != null else (waypoint_graph.get_named_pos("market_stall") + Vector2(22.0, 0.0)))

func _update_role_work_step(eff_delta: float = 0.016) -> void:
	match role_type:
		RoleType.BUNNY_FARMER:
			if worker_step == 99:
				var otter_on_isl := GameManager.is_island_otter_hired(home_island)
				var still_full := GameManager.is_raw_basket_full(home_island) if (otter_on_isl or home_island != 1) else GameManager.is_stall_full()
				if not still_full and state_timer >= 0.6:
					is_sleeping_full = false
					_assign_next_task()
				return

			if worker_step == 0:
				facing_left = (slot_index > 0)
				if is_instance_valid(target_plot):
					target_plot.apply_farmer_tending(eff_delta)
				var plot_ready := (not is_instance_valid(target_plot)) or target_plot.is_ready_for_harvest() or (state_timer >= work_duration * 1.15)
				if state_timer >= work_duration * 0.65 and plot_ready:
					var b_lv := int(GameManager.building_levels.get("soil_" + str(home_island), 1))
					var crop_got := EconomyConfig.get_evolved_crop_id(home_island, b_lv)
					var qty_got := 1
					if is_instance_valid(target_plot):
						crop_got = target_plot.crop_id
						qty_got = target_plot.harvest_crop_yield()
					qty_got += get_effective_harvest_bonus()

					_set_carry_visual(crop_got, qty_got)
					if home_island == 1 and not GameManager.is_island_otter_hired(1):
						worker_step = 2
						_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))
					else:
						worker_step = 1
						_navigate_to(_get_home_basket_pos() + Vector2(-14.0 + float(slot_index * 6), 0.0))

			elif worker_step == 1:
				facing_left = false
				if state_timer >= 0.35:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					var accepted := GameManager.add_to_raw_basket(home_island, cid, q)
					var rem := q - accepted
					if rem > 0:
						_set_carry_visual(cid, rem)
						is_sleeping_full = true
						state_timer = 0.0
					else:
						_set_carry_visual("", 0)
						is_sleeping_full = false
						_assign_next_task()

			elif worker_step == 2:
				facing_left = false
				if state_timer >= 0.45:
					if _try_deposit_to_stall(carrying_item_id, carrying_qty, "鲜果直售+", Color("#FFE066")):
						_assign_next_task()

		RoleType.OTTER_LOGISTICS:
			var cap := EconomyConfig.calc_carry_capacity("otter", get_level())
			var wid := _get_home_workshop_id()
			if worker_step == 20:
				if state_timer >= 0.7:
					_assign_next_task()
				return

			if worker_step == 0:
				facing_left = true
				if state_timer >= 0.40:
					var can_feed := _is_home_chef_hired() and (not GameManager.is_workshop_input_full(wid))
					var can_stall := not GameManager.is_stall_full()
					if not can_feed and not can_stall:
						_assign_next_task()
						return
					var taken := GameManager.take_from_raw_basket(home_island, cap)
					if taken.is_empty():
						_assign_next_task()
						return
					var item_id := String(taken["item_id"])
					var qty := int(taken["qty"])
					_set_carry_visual(item_id, qty)

					if can_feed:
						worker_step = 1
						_navigate_to(_get_workshop_dock_pos("input"))
					else:
						worker_step = 2
						_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))

			elif worker_step == 1:
				facing_left = false
				if state_timer >= 0.40:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					var accepted := GameManager.add_to_workshop_input(wid, cid, q)
					var leftover := q - accepted
					if leftover > 0:
						_set_carry_visual(cid, leftover)
						worker_step = 2
						_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))
					else:
						_set_carry_visual("", 0)
						_assign_next_task()

			elif worker_step == 2:
				facing_left = false
				if state_timer >= 0.45:
					if _try_deposit_to_stall(carrying_item_id, carrying_qty, "分流直售+", Color("#FFF4D6")):
						_assign_next_task()

			elif worker_step == 10:
				facing_left = true
				if state_timer >= 0.40:
					if GameManager.is_stall_full():
						_assign_next_task()
						return
					var out_taken := GameManager.take_from_workshop_output(wid, cap)
					if out_taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(out_taken["item_id"]), int(out_taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))

			elif worker_step == 11:
				facing_left = false
				if state_timer >= 0.45:
					if _try_deposit_to_stall(carrying_item_id, carrying_qty, "3.5x美食+", Color("#FFE066")):
						_assign_next_task()

		RoleType.TOUCAN_TRADER:
			var cap := EconomyConfig.calc_carry_capacity("toucan", get_level())
			var wid := "orbis_linked" if home_island == 3 else "cauldron"
			if worker_step == 40:
				if state_timer >= 0.8:
					_assign_next_task()
				return

			if worker_step == 0:
				facing_left = true
				if state_timer >= 0.40:
					if GameManager.is_stall_full():
						_assign_next_task()
						return
					var taken := GameManager.take_from_raw_basket(home_island, cap)
					if taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(taken["item_id"]), int(taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))

			elif worker_step == 10:
				facing_left = true
				if state_timer >= 0.40:
					if GameManager.is_stall_full():
						_assign_next_task()
						return
					var out_taken := GameManager.take_from_workshop_output(wid, cap)
					if out_taken.is_empty():
						_assign_next_task()
						return
					_set_carry_visual(String(out_taken["item_id"]), int(out_taken["qty"]))
					worker_step = 11
					_navigate_to(waypoint_graph.get_dock_pos("stall_restock"))

			elif worker_step == 11:
				facing_left = false
				if state_timer >= 0.45:
					var did := carrying_item_id if carrying_item_id != "" else "delicacy_2"
					var tag := "跨岛鲜果+"
					if did.begins_with("delicacy_"):
						tag = "52x盛宴+" if home_island == 3 else "12x甘露+"
					if _try_deposit_to_stall(did, carrying_qty, tag, Color("#FFE066")):
						_assign_next_task()

		RoleType.FOX_MORTAR_CHEF, RoleType.PENGUIN_ALCHEMIST:
			_update_chef_work_step()

		RoleType.SHIBA_MANAGER:
			facing_left = false

func _update_chef_work_step() -> void:
	var is_penguin := (role_type == RoleType.PENGUIN_ALCHEMIST)
	var wid := "orbis_linked" if home_island == 3 else ("cauldron" if is_penguin else "mortar")
	var w_node: Workshop = null
	if world_ref != null:
		if home_island == 3:
			w_node = world_ref.orbis_linked_workshop
		elif is_penguin:
			w_node = world_ref.cauldron_workshop
		else:
			w_node = world_ref.mortar_workshop

	# Face toward the center of the workshop (`fox`/`cauldron_chef` at dx=-20 face right; on Island 3 `penguin` at dx=+18 faces left)
	facing_left = (home_island == 3 and is_penguin)
	var chef_slot_key := animal_key + "_" + str(home_island)

	if worker_step == 0:
		if w_node != null:
			w_node.set_chef_progress(chef_slot_key, 0.0, false)
		if GameManager.is_workshop_output_full(wid):
			is_sleeping_full = (GameManager.get_workshop_input_total(wid) > 0)
			state_timer = 0.0
			return
		var claimed := GameManager.take_workshop_input_for_processing(wid)
		if claimed == "":
			is_sleeping_full = false
			state_timer = 0.0
			return
		cooking_crop_id = claimed
		is_sleeping_full = false
		worker_step = 1
		state_timer = 0.0

	elif worker_step == 1:
		var w_speed_mult := GameManager.get_workshop_speed_multiplier(home_island) if GameManager != null else 1.0
		var eff_duration := maxf(0.4, work_duration / w_speed_mult)
		var prog := clampf(state_timer / eff_duration, 0.0, 1.0)
		if w_node != null:
			w_node.set_chef_progress(chef_slot_key, prog, true)
		if state_timer >= eff_duration:
			worker_step = 2
			state_timer = 0.0

	elif worker_step == 2:
		if GameManager.is_workshop_output_full(wid):
			is_sleeping_full = true
			if w_node != null:
				w_node.set_chef_progress(chef_slot_key, 1.0, false)
			return
		var default_del := "delicacy_2" if is_penguin else "delicacy_0"
		var out_del := w_node.get_evolved_output_delicacy() if w_node != null else default_del
		var added := GameManager.add_to_workshop_output(wid, out_del, 1)
		if added > 0:
			cooking_crop_id = ""
			is_sleeping_full = false
			if w_node != null:
				w_node.crafted_count += 1
				w_node.set_chef_progress(chef_slot_key, 0.0, false)
			worker_step = 0
			state_timer = 0.0

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
