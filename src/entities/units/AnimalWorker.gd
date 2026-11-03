extends Node2D
class_name AnimalWorker
## 6 Specialized Pipeline Animal Workers with Cold-Start Fallback & Smart Overflow (`src/entities/units/AnimalWorker.gd`) — PRD Patch v2.1
## - Rule 1.1 Single-Bunny Cold Start: When `otter` is unhired (Lv.0), `bunny` personally carries harvested crops
##   along WaypointGraph directly to `market_stall` for 1x sale!
## - Rule 1.3 Specialized Pipeline: Once `otter` is hired (Lv.>=1), `bunny` immediately returns to pure farming
##   (depositing crops into the backend numeric buffer `raw_baskets[1]`) while `otter` takes over hauling.
## - Rule 2.2 Smart Workshop Overflow: When `otter` / `toucan` hauls raw crops, if the target workshop input buffer
##   is full (cap 10) or the chef is unhired, it immediately diverts to `market_stall` for direct sale without waiting!
## - Rule 2.3 Full Buffer Sleep Bubble: When the farm buffer is full and no one is hauling, `bunny` pauses harvesting
##   and displays a clean `"Zzz..."` text bubble overhead.

enum RoleType {
	BUNNY_FARMER,      # 1. 兔子: 专职农夫 (冷启动期兼任直售搬运; 雇佣水獭后专职种地入缓存; 满仓显示 "Zzz...")
	OTTER_LOGISTICS,   # 2. 水獭: 岛内物流员 (缓存->研钵输入槽; 研钵满载或未雇狐狸时智能分流直售集市; 成品槽->集市)
	TOUCAN_TRADER,     # 3. 巨嘴鸟: 跨岛贸易专员 (跨木桥将岛2的12x料理与岛3的52x料理批量运回岛1主集市)
	FOX_MORTAR_CHEF,   # 4. 狐狸: 初级研钵主厨 (驻守岛1 workshop_mortar -> 研磨 3.5x 初级美食)
	PENGUIN_ALCHEMIST, # 5. 企鹅: 高级坩埚炼金师 (驻守岛2 workshop_cauldron & 岛3联动工坊 -> 炼制 12x / 52x 料理)
	SHIBA_MANAGER      # 6. 柴犬: 集市金牌店长 (驻守 market_stall -> 结账加速 + 全摊位售价加成 PriceBonus = 1.0 + 0.1*L)
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
	return int(GameManager.animal_levels.get(animal_key, 0))

func is_hired() -> bool:
	return GameManager.is_animal_hired(animal_key)

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
			var spd := EconomyConfig.calc_move_speed(animal_key, maxi(1, get_level())) * (1.35 if boost_timer > 0.0 else 1.0)
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
	is_sleeping_full = false
	work_duration = EconomyConfig.calc_work_duration(animal_key, maxi(1, get_level()))

	match role_type:
		RoleType.BUNNY_FARMER:
			# Check if farm buffer is full (when Otter is hired) or stall is full (when Otter is unhired)
			var otter_hired := GameManager.is_animal_hired("otter")
			if (otter_hired and GameManager.is_raw_basket_full(1)) or (not otter_hired and GameManager.is_stall_full()):
				is_sleeping_full = true
				worker_step = 99 # Sleep with "Zzz..." bubble until buffer space frees up
				return

			target_plot = world_ref.find_best_plot_for_bunny() if (world_ref != null and world_ref.has_method("find_best_plot_for_bunny")) else null
			if target_plot != null and (randi() % 3 != 0):
				target_plot.reserved_by_worker = true
				worker_step = 0
				_navigate_to(target_plot.position + Vector2(0, 4))
			else:
				target_plot = null
				worker_step = 0
				_navigate_to(waypoint_graph.get_named_pos("apple_tree"))

		RoleType.OTTER_LOGISTICS:
			# Priority 1: Carry finished 3.5x delicacies from Mortar Output to Market Stall
			if GameManager.get_workshop_output_total("mortar") > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(waypoint_graph.get_named_pos("mortar") + Vector2(14, 4))
			# Priority 2: Pick up raw crops from Island 1 numeric buffer
			elif GameManager.get_island_basket_total(1) > 0:
				worker_step = 0
				_navigate_to(waypoint_graph.get_named_pos("basket_1"))
			else:
				worker_step = 20
				_navigate_to(waypoint_graph.get_named_pos("basket_1"))

		RoleType.TOUCAN_TRADER:
			# Cross-bridge trade: Island 3 (52x delicacy) & Island 2 (12x delicacy) -> Main Market Stall
			if bool(GameManager.unlocked_islands.get(3, false)) and GameManager.get_workshop_output_total("orbis_linked") > 0 and not GameManager.is_stall_full():
				worker_step = 30
				_navigate_to(waypoint_graph.get_named_pos("basket_3"))
			elif bool(GameManager.unlocked_islands.get(2, false)) and GameManager.get_workshop_output_total("cauldron") > 0 and not GameManager.is_stall_full():
				worker_step = 10
				_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(12, 4))
			elif bool(GameManager.unlocked_islands.get(3, false)) and (randi() % 2 == 0):
				worker_step = 20
				_navigate_to(waypoint_graph.get_named_pos("soil_3_center"))
			elif bool(GameManager.unlocked_islands.get(2, false)):
				worker_step = 0
				_navigate_to(waypoint_graph.get_named_pos("soil_2_center"))
			else:
				worker_step = 40
				_navigate_to(waypoint_graph.get_named_pos("market_stall") + Vector2(-28, 4))

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
			if worker_step == 99:
				# Sleeping with "Zzz..." because buffer is full; wake up as soon as space is available
				var otter_hired := GameManager.is_animal_hired("otter")
				var still_full := (otter_hired and GameManager.is_raw_basket_full(1)) or (not otter_hired and GameManager.is_stall_full())
				if not still_full and state_timer >= 0.8:
					is_sleeping_full = false
					_assign_next_task()
				return

			if worker_step == 0:
				if state_timer >= work_duration * 0.65:
					var crop_got := "crop_0"
					var qty_got := 1
					if is_instance_valid(target_plot):
						crop_got = target_plot.crop_id
						qty_got = target_plot.harvest_crop_yield()
					else:
						crop_got = "crop_1"
						qty_got = 1

					# PRD v2.1 Rule 1.1 vs Rule 1.3:
					# - If Otter is NOT hired yet: Bunny personally carries crop to Market Stall for 1x sale!
					# - If Otter IS hired: Bunny immediately puts crop into Island 1 numeric buffer and keeps farming!
					if not GameManager.is_animal_hired("otter"):
						_set_carry_visual(crop_got, qty_got)
						worker_step = 2 # Walk directly to Market Stall!
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))
					else:
						GameManager.add_to_raw_basket(1, crop_got, qty_got)
						_set_carry_visual("", 0)
						_assign_next_task()

			elif worker_step == 2:
				# Single-Bunny Cold-Start Direct Delivery to Market Stall!
				if state_timer >= 0.45:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(cid, q)
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "鲜果直售+" + str(q), Color(0.78, 1.0, 0.65))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.OTTER_LOGISTICS:
			var cap := EconomyConfig.calc_carry_capacity("otter", maxi(1, get_level()))
			if worker_step == 20:
				if state_timer >= 0.8:
					_assign_next_task()
				return

			if worker_step == 0:
				if state_timer >= 0.45:
					var taken := GameManager.take_from_raw_basket(1, cap)
					if taken.is_empty():
						_assign_next_task()
						return
					var item_id := String(taken["item_id"])
					var qty := int(taken["qty"])
					_set_carry_visual(item_id, qty)

					# PRD v2.1 Rule 2.2 Smart Overflow:
					# If Fox is hired AND Mortar input is NOT full -> deliver to Mortar;
					# Otherwise (Mortar full or Fox unhired) -> divert directly to Market Stall for 1x sale!
					if GameManager.is_animal_hired("fox") and not GameManager.is_workshop_input_full("mortar"):
						worker_step = 1
						_navigate_to(waypoint_graph.get_named_pos("mortar") + Vector2(-14, 4))
					else:
						worker_step = 2 # Smart overflow direct to Market Stall!
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))

			elif worker_step == 1:
				if state_timer >= 0.45:
					var cid := carrying_item_id if carrying_item_id != "" else "crop_0"
					var q := maxi(1, carrying_qty)
					var accepted := GameManager.add_to_workshop_input("mortar", cid, q)
					var leftover := q - accepted
					if leftover > 0:
						# Overflow remainder goes straight to Market Stall!
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
					var out_taken := GameManager.take_from_workshop_output("mortar", cap)
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
			var cap := EconomyConfig.calc_carry_capacity("toucan", maxi(1, get_level()))
			if worker_step == 40:
				if state_timer >= 1.2:
					_assign_next_task()
				return

			if worker_step == 0:
				# Harvest / collect Island 2 glow_mushroom -> feed Cauldron or overflow to Market Stall
				if state_timer >= 0.55:
					if GameManager.is_animal_hired("penguin") and not GameManager.is_workshop_input_full("cauldron"):
						_set_carry_visual("crop_2", cap)
						worker_step = 1
						_navigate_to(waypoint_graph.get_named_pos("cauldron") + Vector2(-14, 4))
					else:
						_set_carry_visual("crop_2", cap)
						worker_step = 11
						_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 1:
				if state_timer >= 0.45:
					GameManager.add_to_workshop_input("cauldron", "crop_2", maxi(1, carrying_qty))
					_set_carry_visual("", 0)
					_assign_next_task()
			elif worker_step == 10:
				if state_timer >= 0.45:
					var out_taken := GameManager.take_from_workshop_output("cauldron", cap)
					var did := String(out_taken.get("item_id", "delicacy_2"))
					var q := maxi(1, int(out_taken.get("qty", 1)))
					_set_carry_visual(did, q)
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 20:
				# Island 3 Dual Linked Workshop (52x Royal Pineapple Feast)
				if state_timer >= 0.55:
					GameManager.add_to_workshop_output("orbis_linked", "delicacy_3", 1)
					var out_taken := GameManager.take_from_workshop_output("orbis_linked", cap)
					_set_carry_visual("delicacy_3", maxi(1, int(out_taken.get("qty", 1))))
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 30:
				if state_timer >= 0.45:
					var out_taken := GameManager.take_from_workshop_output("orbis_linked", cap)
					_set_carry_visual("delicacy_3", maxi(1, int(out_taken.get("qty", 1))))
					worker_step = 11
					_navigate_to(waypoint_graph.get_named_pos("market_stall"))
			elif worker_step == 11:
				if state_timer >= 0.45:
					var did := carrying_item_id if carrying_item_id != "" else "delicacy_2"
					var q := maxi(1, carrying_qty)
					GameManager.add_to_stall(did, q)
					var tag := "52x盛宴+" if did == "delicacy_3" else "跨岛运达+"
					EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), tag + str(q), Color(1.0, 0.88, 0.35))
					_set_carry_visual("", 0)
					_assign_next_task()

		RoleType.FOX_MORTAR_CHEF:
			var mortar_node: Workshop = world_ref.mortar_workshop if (world_ref != null and "mortar_workshop" in world_ref) else null
			if GameManager.get_workshop_input_total("mortar") <= 0 or GameManager.is_workshop_output_full("mortar"):
				if mortar_node != null:
					mortar_node.is_processing = false
				state_timer = 0.0
				return
			if mortar_node != null:
				mortar_node.is_processing = true
				mortar_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing("mortar")
				if used_crop != "":
					var out_del := "delicacy_1" if used_crop == "crop_1" else "delicacy_0"
					GameManager.add_to_workshop_output("mortar", out_del, 1)
					EventBus.spawn_floating_text.emit(position + Vector2(-22, -46), "3.5x美食+1", Color(1.0, 0.92, 0.55))
				if mortar_node != null:
					mortar_node.process_progress = 0.0

		RoleType.PENGUIN_ALCHEMIST:
			var cauldron_node: Workshop = world_ref.cauldron_workshop if (world_ref != null and "cauldron_workshop" in world_ref) else null
			if not bool(GameManager.unlocked_islands.get(2, false)):
				if cauldron_node != null:
					cauldron_node.is_processing = false
				return
			# Auto-gather from Island 2 farm if cauldron input is empty
			if GameManager.get_workshop_input_total("cauldron") <= 0 and not GameManager.is_workshop_output_full("cauldron"):
				GameManager.add_to_workshop_input("cauldron", "crop_2", 1)
			if GameManager.is_workshop_output_full("cauldron"):
				if cauldron_node != null:
					cauldron_node.is_processing = false
				state_timer = 0.0
				return
			if cauldron_node != null:
				cauldron_node.is_processing = true
				cauldron_node.process_progress = clampf(state_timer / maxf(0.5, work_duration), 0.0, 1.0)
			if state_timer >= work_duration:
				state_timer = 0.0
				var used_crop := GameManager.take_workshop_input_for_processing("cauldron")
				if used_crop != "":
					GameManager.add_to_workshop_output("cauldron", "delicacy_2", 1)
					EventBus.spawn_floating_text.emit(position + Vector2(-26, -48), "12x甘露+1", Color(0.75, 0.96, 1.0))
				if cauldron_node != null:
					cauldron_node.process_progress = 0.0

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

	# PRD v2.1 Rule 2.3: Full-Buffer Sleep Text Bubble ("Zzz...")
	if is_sleeping_full:
		var z_bob := sin(anim_time * 2.5) * 2.0
		PixelFontRenderer.draw_pixel_cn(self, Vector2(-14.0, -56.0 + z_bob), "Zzz...", 13, Color(0.86, 0.94, 1.0), Color(0.12, 0.06, 0.02, 0.95), true)
	elif boost_timer > 0.0 and tex_heart != null:
		draw_texture_rect(tex_heart, Rect2(8, -62 + hop_y, 20, 20), false)
