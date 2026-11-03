extends Node2D
class_name AnimalWorker
## 6 Specialized Pipeline Animal Workers (`src/entities/units/AnimalWorker.gd`) — PRD v2.0 Section 4.1
## - Reads frame regions dynamically from `EconomyConfig.get_frame_region(sheet_key, frame_idx)` (`sprite_manifest.json`)
## - Moves along `WaypointGraph` with sinusoidal bounce (`-abs(sin(time * 12.0)) * 4.0`), squash-and-stretch, waddle tilt, and footstep dust
## - Mounts `CarryIcon (Sprite2D)` overhead to display carried raw crops or delicacies in real time

enum RoleType {
	BUNNY_FARMER,      # 1. 兔子: 专职农夫 (巡视耕地/果树 -> 播种照料 -> 收割入【田边菜篮】)
	OTTER_LOGISTICS,   # 2. 水獭: 岛内物流员 (【田边菜篮】->【工坊输入槽】; 【工坊成品槽】->【集市摊位】)
	TOUCAN_TRADER,     # 3. 巨嘴鸟: 跨岛贸易专员 (跨木桥将2/3岛原料与高阶炼金美食大批量运回主岛集市)
	FOX_MORTAR_CHEF,   # 4. 狐狸: 初级研钵主厨 (驻守 workshop_mortar -> 研磨 3.5x 初级美食)
	PENGUIN_ALCHEMIST, # 5. 企鹅: 高级坩埚炼金师 (驻守 workshop_cauldron -> 炼制 12.0x 精制美食)
	SHIBA_MANAGER      # 6. 柴犬: 集市金牌店长 (驻守 market_stall -> 整理货架 + 收银结账售价加成)
}

@export var role_type: RoleType = RoleType.BUNNY_FARMER
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

func setup_worker(p_role: RoleType, p_pos: Vector2, p_graph: WaypointGraph, p_world: Node2D) -> void:
	role_type = p_role
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
	_assign_next_task()

func get_level() -> int:
	return int(GameManager.animal_levels.get(animal_key, 1))

func trigger_pet_boost() -> void:
	boost_timer = 8.0
	EventBus.spawn_floating_text.emit(position + Vector2(-24, -52), "♥元气加速!", Color(1.0, 0.72, 0.86))

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

func _process(delta: float) -> void:
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
			var spd := EconomyConfig.calc_move_speed(animal_key, get_level()) * (1.35 if boost_timer > 0.0 else 1.0)
			var next_pos := position + (to_wp / dist) * spd * delta
			position = waypoint_graph.constrain_to_walkable_surface(next_pos) if waypoint_graph != null else next_pos

			var cyc := int(floor(anim_time * 7.5 / PI))
			if cyc != last_step_cycle:
				last_step_cycle = cyc
				var heel_x := 6.0 if facing_left else -6.0
				footstep_puffs.append({"x": position.x + heel_x, "y": position.y + 1.0, "r": 2.0, "alpha": 0.42})
	else:
		is_moving = false
		state_timer += delta * (1.35 if boost_timer > 0.0 else 1.0)
		_update_role_work_step()

	if carry_icon != null and carry_icon.visible:
		carry_icon.position = Vector2(0.0, -54.0 - absf(sin(anim_time * 12.0)) * 3.0)

	queue_redraw()

func _assign_next_task() -> void:
	state_timer = 0.0
	work_duration = EconomyConfig.calc_work_duration(animal_key, get_level())

	match role_type:
		RoleType.BUNNY_FARMER:
			# Step 0: Find a plot on Island 1 to tend/harvest -> Step 1: Deposit into Island 1 RawStorageBasket
			target_plot = world_ref.find_best_plot_for_bunny() if (world_ref != null and world_ref.has_method("find_best_plot_for_bunny")) else null
			if target_plot != null:
				target_plot.reserved_by_worker = true
				worker_step = 0
				_navigate_to(target_plot.position + Vector2(0, 4))
			else:
				worker_step = 0
				_navigate_to(waypoint_graph.get_named_pos("apple_tree"))

		RoleType.OTTER_LOGISTICS:
			# Priority A: If Mortar output has delicacies, carry to Market Stall
			if GameManager.get_workshop_output_total("mortar") > 0:
				worker_step = 10 # Go pick up from mortar output
				_navigate_to(waypoint_graph.get_named_pos("mortar") + Vector2(14, 4))
			# Priority B: Pick up raw crops from Island 1 RawStorageBasket -> deliver to Mortar input
			else:
				worker_step = 0
				_navigate_to(waypoint_graph.get_named_pos("basket_1"))

		RoleType.TOUCAN_TRADER:
			# Cross-bridge trade between Island 2 (Ellinia), Island 3 (Orbis), and Island 1 Market Stall
			if GameManager.get_workshop_output_total("cauldron") > 0:
				worker_step = 10 # Pick up refined 12x delicacy from Cauldron
				_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(12, 4))
			elif (randi() % 2 == 0) and bool(GameManager.unlocked_islands.get(3, true)):
				worker_step = 20 # Visit Island 3 (Orbis) basket
				_navigate_to(waypoint_graph.get_named_pos("basket_3"))
			else:
				worker_step = 0 # Visit Island 2 (Ellinia) basket
				_navigate_to(waypoint_graph.get_named_pos("basket_2"))

		RoleType.FOX_MORTAR_CHEF:
			worker_step = 0
			_navigate_to(waypoint_graph.get_named_pos("mortar") + Vector2(-18, 4))

		RoleType.PENGUIN_ALCHEMIST:
			worker_step = 0
			_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(-18, 4))

		RoleType.SHIBA_MANAGER:
			worker_step = 0
			_navigate_to(waypoint_graph.get_named_pos("market_stall") + Vector2(22, 4))

func _update_role_work_step() -> void:
	match role_type:
		RoleType.BUNNY_FARMER:
			if worker_step == 0:
				if state_timer >= work_duration * 0.65:
					var crop_got := "crop_0"
					var qty_got := 1
					if is_instance_valid(target_plot):
						crop_got = target_plot.crop_id
						target_plot.watered = true
						if target_plot.growth >= 0.90:
							qty_got = target_plot.harvest_into_basket()
						else:
							target_plot.growth = minf(1.0, target_plot.growth + 0.55)
							GameManager.add_to_raw_basket(1, crop_got, 1)
						target_plot.reserved_by_worker = false
					else:
						crop_got = "crop_1"
						GameManager.add_to_raw_basket(1, "crop_1", 1)
					_set_carry_visual(crop_got, qty_got)
					worker_step = 1
					_navigate_to(waypoint_graph.get_named_pos("basket_1"))
			elif worker_step == 1:
				if state_timer >= 0.5:
					EventBus.spawn_floating_text.emit(position + Vector2(-18, -42), "入菜篮+" + str(maxi(1, carrying_qty)), Color(0.78, 1.0, 0.65))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.OTTER_LOGISTICS:
			var cap := EconomyConfig.calc_carry_capacity("otter", get_level())
			if worker_step == 0:
				if state_timer >= 0.6:
					var taken := GameManager.take_from_raw_basket(1, cap)
					var item_id := String(taken.get("item_id", "crop_0"))
					var qty := maxi(1, int(taken.get("qty", 1)))
					_set_carry_visual(item_id, qty)
					worker_step = 1
					_navigate_to(waypoint_graph.get_named_pos("mortar") + Vector2(-14, 4))
			elif worker_step == 1:
				if state_timer >= 0.5:
					GameManager.add_to_workshop_input("mortar", carrying_item_id if carrying_item_id != "" else "crop_0", maxi(1, carrying_qty))
					EventBus.spawn_floating_text.emit(position + Vector2(-20, -44), "送入研钵x" + str(maxi(1, carrying_qty)), Color(0.75, 0.95, 1.0))
					_set_carry_visual("", 0)
					_assign_next_task()
			elif worker_step == 10:
				if state_timer >= 0.5:
					var out_taken := GameManager.take_from_workshop_output("mortar", cap)
					var del_id := String(out_taken.get("item_id", "delicacy_0"))
					var qty := maxi(1, int(out_taken.get("qty", 1)))
					_set_carry_visual(del_id, qty)
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 11:
				if state_timer >= 0.5:
					var did := carrying_item_id if carrying_item_id != "" else "delicacy_0"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(did, q)
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "上架美食+" + str(q), Color(1.0, 0.92, 0.48))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.TOUCAN_TRADER:
			var cap := EconomyConfig.calc_carry_capacity("toucan", get_level())
			if worker_step == 0:
				# At Island 2 (Ellinia) basket -> pick up glow_mushroom -> carry to Cauldron input
				if state_timer >= 0.6:
					var taken := GameManager.take_from_raw_basket(2, cap)
					var cid := String(taken.get("item_id", "crop_2"))
					var q := maxi(1, int(taken.get("qty", 2)))
					_set_carry_visual(cid, q)
					worker_step = 1
					_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(-14, 4))
			elif worker_step == 1:
				if state_timer >= 0.5:
					GameManager.add_to_workshop_input("cauldron", carrying_item_id if carrying_item_id != "" else "crop_2", maxi(1, carrying_qty))
					_set_carry_visual("", 0)
					worker_step = 10
					_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(12, 4))
			elif worker_step == 10:
				# Pick up 12x delicacy from Cauldron output -> transport to Market Stall
				if state_timer >= 0.5:
					var out_taken := GameManager.take_from_workshop_output("cauldron", cap)
					var did := String(out_taken.get("item_id", "delicacy_2"))
					var q := maxi(1, int(out_taken.get("qty", 1)))
					_set_carry_visual(did, q)
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 20:
				# At Island 3 (Orbis) basket -> pick up golden pineapple / coconut delicacy -> carry across bridges to Market Stall
				if state_timer >= 0.6:
					GameManager.take_from_raw_basket(3, cap)
					_set_carry_visual("delicacy_3", cap)
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 11:
				if state_timer >= 0.5:
					var did := carrying_item_id if carrying_item_id != "" else "delicacy_2"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(did, q)
					EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), "跨岛运达+" + str(q), Color(1.0, 0.88, 0.35))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.FOX_MORTAR_CHEF:
			var mortar_node: Workshop = world_ref.mortar_workshop if (world_ref != null and "mortar_workshop" in world_ref) else null
			if mortar_node != null:
				mortar_node.is_processing = true
				mortar_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing("mortar")
				var out_del := "delicacy_1" if used_crop == "crop_1" else "delicacy_0"
				if mortar_node != null:
					mortar_node.active_delicacy_id = out_del
					mortar_node.process_progress = 0.0
				GameManager.add_to_workshop_output("mortar", out_del, 1)
				EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "研磨完成! (3.5x)", Color(1.0, 0.92, 0.55))

		RoleType.PENGUIN_ALCHEMIST:
			var cauldron_node: Workshop = world_ref.cauldron_workshop if (world_ref != null and "cauldron_workshop" in world_ref) else null
			if cauldron_node != null:
				cauldron_node.is_processing = true
				cauldron_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing("cauldron")
				var out_del := "delicacy_3" if used_crop == "crop_3" else "delicacy_2"
				if cauldron_node != null:
					cauldron_node.active_delicacy_id = out_del
					cauldron_node.process_progress = 0.0
				GameManager.add_to_workshop_output("cauldron", out_del, 1)
				EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), "炼成甘露! (12x)", Color(0.75, 0.96, 1.0))

		RoleType.SHIBA_MANAGER:
			facing_left = true
			if state_timer >= 6.0:
				state_timer = 0.0
				# Keep Islands 2 & 3 raw baskets slowly replenished too
				GameManager.add_to_raw_basket(2, "crop_2", 1)
				GameManager.add_to_raw_basket(3, "crop_3", 1)

func _get_pose_index() -> int:
	if is_moving:
		var walk_frame := int(floor(anim_time * 7.5 / PI)) % 2
		if carrying_item_id != "":
			return 2 if walk_frame == 0 else 1
		return walk_frame
	return 3 # Active crafting / harvesting / store-managing pose

func _draw() -> void:
	if tex_sheet == null:
		return

	for puff in footstep_puffs:
		var local_p := Vector2(float(puff["x"]) - position.x, float(puff["y"]) - position.y)
		draw_circle(local_p, float(puff["r"]), Color(0.95, 0.91, 0.80, float(puff["alpha"])))

	var pose_idx := _get_pose_index()
	# PRD 3.2 sinusoidal bounce: -abs(sin(time * 12.0)) * 4.0 while moving
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

	if boost_timer > 0.0 and tex_heart != null:
		draw_texture_rect(tex_heart, Rect2(8, -62 + hop_y, 20, 20), false)
