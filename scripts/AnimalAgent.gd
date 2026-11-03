extends Node2D
class_name AnimalAgent
## Cozy, Unhurried 4-Pose Hand-Drawn Animal Companion Agent (60x60 per frame -> 240x60 sheet):
## Phase 4+ Navigation & Animation Polish:
## - Waypoint Pathfinding via IslandWorld.build_navigation_path(): animals properly approach bridgeheads,
##   follow the arched wooden planks of the Left Bridge, Lotus Pond Footbridge, and Right Bridge,
##   and NEVER walk across open water, ocean surf, or sky gaps!
## - Richly nuanced walk cycle: sinusoidal stride arc, contact squash & mid-air stretch, gentle waddle tilt,
##   smooth turn-flip interpolation, dynamic shadow scaling, and footstep dust/water/sand puffs!

enum Role {
	MOON_BUNNY = 0,
	LOTUS_OTTER = 1,
	CARPENTER_SHIBA = 2,
	ANGLER_PENGUIN = 3,
	FOREST_FOX = 4,
	ISLAND_TOUCAN = 5
}

enum AgentState {
	MOVING = 0,
	WORKING = 1,
	SLEEPING = 2,
	EATING_SNACK = 3,
	IDLE_BREATHER = 4
}

const FRAME_SIZE := 60
const ROLE_NAMES: Array[String] = [
	"糯米白兔 · 播种收割农夫",
	"荷叶水獭 · 溪流浇水官",
	"木工柴犬 · 果园料理匠",
	"草帽企鹅 · 晨露垂钓手",
	"森谷小狐狸 · 荧光林农与炼金师",
	"大嘴鸟 · 暖沙果农与特调师"
]

var role: Role = Role.MOON_BUNNY
var agent_state: AgentState = AgentState.IDLE_BREATHER
var sheet_tex: Texture2D
var heart_tex: Texture2D
var world_ref: Node2D
var home_pos: Vector2
var target_pos: Vector2
var nav_waypoints: Array[Vector2] = []
var state_timer: float = 0.0
var anim_time: float = 0.0
var current_frame: int = 0
var facing_left: bool = false
var visual_flip: float = 1.0  # Smoothly interpolates between +1.0 (right) and -1.0 (left)
var last_step_index: int = -1
var footstep_puffs: Array[Dictionary] = []

var carrying_item: bool = false
var carrying_delicacy: bool = false
var carrying_water: bool = false
var carried_crop_id: int = 0
var carried_delicacy_id: int = 0
var going_to_workshop: bool = false

var pending_plot_idx: int = -1
var pending_plot_op: String = ""

var crops_tex: Texture2D
var delicacies_tex: Texture2D
var pet_boost_timer: float = 0.0
var frenzy_heart_timer: float = 0.0
var tasks_since_break: int = 0

func setup(
	p_role: Role,
	p_tex: Texture2D,
	p_crops_tex: Texture2D,
	p_delicacies_tex: Texture2D,
	p_heart_tex: Texture2D,
	p_start: Vector2,
	p_world: Node2D
) -> void:
	role = p_role
	sheet_tex = p_tex
	crops_tex = p_crops_tex
	delicacies_tex = p_delicacies_tex
	heart_tex = p_heart_tex
	position = p_start
	home_pos = p_start
	target_pos = p_start
	world_ref = p_world
	anim_time = randf() * 5.0
	state_timer = randf_range(0.4, 1.6)

func _set_navigation_target(dest: Vector2) -> void:
	target_pos = dest
	if world_ref != null and world_ref.has_method("build_navigation_path"):
		nav_waypoints = world_ref.build_navigation_path(position, dest)
	else:
		nav_waypoints = [dest]

func get_display_name() -> String:
	var lv: int = int(world_ref.game_manager.get_animal_level(int(role))) if (world_ref != null and world_ref.game_manager != null) else 1
	return ROLE_NAMES[int(role)] + " Lv." + str(lv)

func trigger_pet_boost() -> void:
	pet_boost_timer = 8.0
	frenzy_heart_timer = 8.0
	if agent_state == AgentState.SLEEPING:
		agent_state = AgentState.IDLE_BREATHER
		state_timer = 1.2
	if world_ref != null:
		world_ref.spawn_floating_cn_tag(position + Vector2(0, -56), "♥摸摸头! +2G", Color(1.0, 0.82, 0.88))
		if world_ref.game_manager != null:
			world_ref.game_manager.add_meso(2)
		if world_ref.sound_manager != null:
			world_ref.sound_manager.play_sfx("harvest_pop")

func _process(delta: float) -> void:
	if pet_boost_timer > 0.0:
		pet_boost_timer = maxf(0.0, pet_boost_timer - delta)
	if frenzy_heart_timer > 0.0:
		frenzy_heart_timer = maxf(0.0, frenzy_heart_timer - delta)

	# Update footstep & work puffs
	for i in range(footstep_puffs.size() - 1, -1, -1):
		footstep_puffs[i]["y"] -= 5.0 * delta
		footstep_puffs[i]["r"] += 2.2 * delta
		footstep_puffs[i]["alpha"] -= 0.75 * delta
		if float(footstep_puffs[i]["alpha"]) <= 0.02:
			footstep_puffs.remove_at(i)

	# Smooth horizontal turn interpolation (never an abrupt 1-frame snap)
	var target_flip := -1.0 if facing_left else 1.0
	visual_flip = move_toward(visual_flip, target_flip, delta * 11.0)
	if absf(visual_flip) < 0.15:
		visual_flip = 0.15 * signf(target_flip)

	var boost := 1.22 if (pet_boost_timer > 0.0 or frenzy_heart_timer > 0.0) else 1.0
	var speed_mult: float = world_ref.game_manager.get_animal_speed_multiplier(int(role)) * boost
	anim_time += delta * 2.15 * boost
	var move_speed: float = 22.0 * speed_mult

	if role == Role.ANGLER_PENGUIN:
		_process_penguin(delta, speed_mult)
		queue_redraw()
		return

	if agent_state == AgentState.IDLE_BREATHER:
		current_frame = 0
		state_timer += delta
		if state_timer >= 1.6:
			state_timer = 0.0
			agent_state = AgentState.MOVING
			_pick_next_task()
		queue_redraw()
		return

	if agent_state == AgentState.EATING_SNACK:
		current_frame = 2 if (int(anim_time * 1.1) % 2 == 0) else 0
		state_timer += delta
		if state_timer >= 3.8:
			state_timer = 0.0
			frenzy_heart_timer = 10.0
			agent_state = AgentState.IDLE_BREATHER
			if world_ref != null:
				world_ref.spawn_floating_cn_tag(position + Vector2(0, -58), "♥品尝茶点 · 心情愉悦!", Color(1.0, 0.88, 0.48))
				if world_ref.sound_manager != null:
					world_ref.sound_manager.play_sfx("harvest_pop", 0.05)
		queue_redraw()
		return

	if agent_state == AgentState.SLEEPING:
		current_frame = 3
		state_timer += delta
		if state_timer >= 6.5:
			state_timer = 0.0
			agent_state = AgentState.IDLE_BREATHER
		queue_redraw()
		return

	# Follow waypoint queue so animals always cross bridges and pond footbridges properly
	var cur_wp: Vector2 = nav_waypoints[0] if nav_waypoints.size() > 0 else target_pos
	var dist := position.distance_to(cur_wp)
	if dist > 3.5:
		agent_state = AgentState.MOVING
		var dir := (cur_wp - position).normalized()
		if absf(dir.x) > 0.05:
			facing_left = dir.x < 0.0
		var next_pos := position + dir * minf(dist, move_speed * delta)
		if world_ref != null and world_ref.has_method("constrain_to_walkable_surface"):
			next_pos = world_ref.constrain_to_walkable_surface(next_pos)
		position = next_pos
		current_frame = int(anim_time) % 2

		# Spawn delicate footstep dust puff at each foot-plant contact
		var step_idx := int(floor(anim_time))
		if step_idx != last_step_index:
			last_step_index = step_idx
			var heel_x := 6.0 if facing_left else -6.0
			footstep_puffs.append({
				"x": heel_x + randf_range(-2.0, 2.0),
				"y": -1.0,
				"r": 2.0,
				"alpha": 0.48
			})
	else:
		if nav_waypoints.size() > 1:
			nav_waypoints.remove_at(0)
			queue_redraw()
			return
		nav_waypoints.clear()
		agent_state = AgentState.WORKING
		state_timer += delta
		current_frame = 2 if (int(anim_time * 0.65) % 2 == 0) else 0
		var req_work_time := 2.8 if pending_plot_op != "" else 3.6
		if state_timer >= req_work_time:
			state_timer = 0.0
			_complete_current_work_session()
			tasks_since_break += 1
			if tasks_since_break >= 4 and not carrying_item and not carrying_delicacy and not carrying_water and pending_plot_op == "":
				tasks_since_break = 0
				if randf() < 0.60 and world_ref.game_manager.consume_snack_for_mood():
					agent_state = AgentState.EATING_SNACK
				else:
					agent_state = AgentState.SLEEPING
			else:
				agent_state = AgentState.IDLE_BREATHER
	queue_redraw()

func _complete_current_work_session() -> void:
	if pending_plot_op == "scoop_water":
		carrying_water = true
		pending_plot_op = ""
		if world_ref.sound_manager != null and randf() < 0.5:
			world_ref.sound_manager.play_sfx("water_splash", 0.04)
		return

	if pending_plot_idx >= 0 and pending_plot_op != "":
		var idx := pending_plot_idx
		var op := pending_plot_op
		pending_plot_idx = -1
		pending_plot_op = ""
		if op == "sow":
			world_ref.complete_plot_sow(idx, self)
		elif op == "water":
			carrying_water = false
			world_ref.complete_plot_water(idx, self)
		elif op == "harvest":
			world_ref.complete_plot_harvest(idx, self)

func _process_penguin(delta: float, speed_mult: float) -> void:
	state_timer += delta * speed_mult
	if state_timer < 8.5:
		current_frame = int(anim_time * 0.25) % 2
	elif state_timer < 11.5:
		current_frame = 2
	elif state_timer < 14.5:
		if current_frame != 3:
			current_frame = 3
			world_ref.game_manager.add_star_dew(1)
			world_ref.game_manager.add_market_goods(1, false, 0)
			world_ref.spawn_floating_cn_tag(position + Vector2(0, -48), "+1 晨露结晶", Color(0.68, 0.95, 1.0))
			if world_ref.sound_manager != null:
				world_ref.sound_manager.play_sfx("water_splash")
	else:
		state_timer = 0.0
		current_frame = 0

func _pick_next_task() -> void:
	match role:
		Role.MOON_BUNNY:
			if going_to_workshop:
				going_to_workshop = false
				carrying_item = false
				carrying_delicacy = true
				carried_delicacy_id = 0
				if world_ref.sound_manager != null:
					world_ref.sound_manager.play_sfx("wood_build", 0.05)
				_set_navigation_target(world_ref.get_market_stall_pos())
				return
			if carrying_delicacy:
				world_ref.game_manager.craft_two_stage_recipe(0)
				world_ref.spawn_floating_cn_tag(position + Vector2(0, -48), "+桂花糯米糕", Color(1.0, 0.95, 0.72))
				carrying_delicacy = false
			elif carrying_item:
				if world_ref.game_manager.mortar_level >= 1 and randf() < 0.70:
					going_to_workshop = true
					_set_navigation_target(world_ref.get_mortar_pos())
					return
				world_ref.game_manager.add_market_goods(1, false, 0)
				world_ref.spawn_floating_text(position + Vector2(0, -48), "+1")
				carrying_item = false

			var job: Dictionary = world_ref.claim_island_plot_job(0, int(role), true, false, true)
			if not job.is_empty():
				pending_plot_idx = int(job["index"])
				pending_plot_op = String(job["op"])
				_set_navigation_target((job["pos"] as Vector2) + Vector2(0, 4))
			else:
				_set_navigation_target(home_pos + Vector2(randf_range(-20, 20), randf_range(-4, 4)))

		Role.LOTUS_OTTER:
			if not carrying_water:
				var dry_job: Dictionary = world_ref.claim_island_plot_job(0, int(role), false, true, false)
				if not dry_job.is_empty():
					world_ref.release_plot_claim(int(dry_job["index"]), int(role))
					pending_plot_op = "scoop_water"
					_set_navigation_target(world_ref.get_stream_pos() + Vector2(randf_range(-6, 4), 0))
					return
				var sow_job: Dictionary = world_ref.claim_island_plot_job(0, int(role), true, false, false)
				if not sow_job.is_empty():
					pending_plot_idx = int(sow_job["index"])
					pending_plot_op = String(sow_job["op"])
					_set_navigation_target((sow_job["pos"] as Vector2) + Vector2(0, 4))
					return
				_set_navigation_target(world_ref.get_stream_pos() + Vector2(randf_range(-8, 4), 0))
			else:
				var water_job: Dictionary = world_ref.claim_island_plot_job(0, int(role), false, true, false)
				if not water_job.is_empty():
					pending_plot_idx = int(water_job["index"])
					pending_plot_op = "water"
					_set_navigation_target((water_job["pos"] as Vector2) + Vector2(0, 4))
				else:
					carrying_water = false
					_set_navigation_target(world_ref.get_stream_pos() + Vector2(randf_range(-8, 4), 0))

		Role.CARPENTER_SHIBA:
			if world_ref.has_active_snack_thief():
				_set_navigation_target(world_ref.get_snack_thief_pos())
				world_ref.chase_away_snack_thief()
				return
			if carrying_delicacy:
				world_ref.game_manager.craft_two_stage_recipe(1)
				world_ref.spawn_floating_cn_tag(position + Vector2(0, -48), "+苹果草莓派", Color(1.0, 0.85, 0.55))
				carrying_delicacy = false
				_set_navigation_target(world_ref.get_apple_tree_pos())
				return
			if going_to_workshop:
				going_to_workshop = false
				carrying_item = false
				carrying_delicacy = true
				carried_delicacy_id = 1
				if world_ref.sound_manager != null:
					world_ref.sound_manager.play_sfx("wood_build", 0.05)
				_set_navigation_target(world_ref.get_market_stall_pos())
				return
			if carrying_item:
				world_ref.game_manager.add_apple(1)
				going_to_workshop = true
				_set_navigation_target(world_ref.get_mortar_pos())
				return
			var shiba_job: Dictionary = world_ref.claim_island_plot_job(0, int(role), false, false, true)
			if not shiba_job.is_empty():
				pending_plot_idx = int(shiba_job["index"])
				pending_plot_op = "harvest"
				_set_navigation_target((shiba_job["pos"] as Vector2) + Vector2(0, 4))
			else:
				carrying_item = true
				carried_crop_id = 1
				_set_navigation_target(world_ref.get_apple_tree_pos())

		Role.FOREST_FOX:
			if carrying_delicacy:
				world_ref.game_manager.craft_two_stage_recipe(2)
				world_ref.spawn_floating_cn_tag(position + Vector2(0, -48), "+星露甘露饮", Color(0.62, 0.96, 1.0))
				carrying_delicacy = false
			elif going_to_workshop:
				going_to_workshop = false
				carrying_item = false
				carrying_delicacy = true
				carried_delicacy_id = 2
				if world_ref.sound_manager != null:
					world_ref.sound_manager.play_sfx("water_splash", 0.05)
				_set_navigation_target(world_ref.get_market_stall_pos())
				return
			elif carrying_item:
				going_to_workshop = true
				_set_navigation_target(world_ref.get_left_hut_pos())
				return

			var left_job: Dictionary = world_ref.claim_island_plot_job(1, int(role), true, true, true)
			if not left_job.is_empty():
				pending_plot_idx = int(left_job["index"])
				pending_plot_op = String(left_job["op"])
				_set_navigation_target((left_job["pos"] as Vector2) + Vector2(0, 4))
			else:
				going_to_workshop = true
				carrying_item = true
				carried_crop_id = 2
				_set_navigation_target(world_ref.get_left_hut_pos())

		Role.ISLAND_TOUCAN:
			if carrying_delicacy:
				world_ref.game_manager.craft_two_stage_recipe(3)
				world_ref.spawn_floating_cn_tag(position + Vector2(0, -48), "+菠萝椰汁特饮", Color(1.0, 0.92, 0.42))
				carrying_delicacy = false
			elif going_to_workshop:
				going_to_workshop = false
				carrying_item = false
				carrying_delicacy = true
				carried_delicacy_id = 3
				if world_ref.sound_manager != null:
					world_ref.sound_manager.play_sfx("harvest_pop", 0.05)
				_set_navigation_target(world_ref.get_market_stall_pos())
				return
			elif carrying_item:
				going_to_workshop = true
				_set_navigation_target(world_ref.get_right_tiki_pos())
				return

			var right_job: Dictionary = world_ref.claim_island_plot_job(2, int(role), true, true, true)
			if not right_job.is_empty():
				pending_plot_idx = int(right_job["index"])
				pending_plot_op = String(right_job["op"])
				_set_navigation_target((right_job["pos"] as Vector2) + Vector2(0, 4))
			else:
				going_to_workshop = true
				carrying_item = true
				carried_crop_id = 3
				_set_navigation_target(world_ref.get_right_tiki_pos())

func _draw() -> void:
	if sheet_tex == null:
		return

	# Compute sinusoidal stride bounce, squash/stretch, and waddle tilt
	var step_phase := fmod(anim_time * PI, TAU)
	var stride_lift := absf(sin(step_phase))
	var hop_y := 0.0
	var scale_x := 1.0
	var scale_y := 1.0
	var tilt_rad := 0.0

	if agent_state == AgentState.MOVING:
		hop_y = -roundf(stride_lift * 2.5)
		# Squash slightly on foot-plant contact (stride_lift ~ 0), stretch slightly at mid-step apex (stride_lift ~ 1)
		scale_x = 1.04 - stride_lift * 0.07
		scale_y = 0.96 + stride_lift * 0.08
		tilt_rad = sin(step_phase) * 0.055
	elif agent_state == AgentState.WORKING:
		var work_wave := sin(anim_time * 3.8)
		hop_y = -1.0 if work_wave > 0.2 else 0.0
		scale_x = 1.0 - work_wave * 0.03
		scale_y = 1.0 + work_wave * 0.04
		tilt_rad = work_wave * 0.045
	elif agent_state == AgentState.EATING_SNACK:
		var chew_wave := absf(sin(anim_time * 3.2))
		hop_y = -roundf(chew_wave * 2.0)
		scale_x = 1.03 - chew_wave * 0.05
		scale_y = 0.97 + chew_wave * 0.06
	else:
		# Gentle idle breathing
		var breath := sin(anim_time * 1.4)
		scale_x = 1.0 - breath * 0.015
		scale_y = 1.0 + breath * 0.022

	# 1. Dynamic ground shadow (shrinks & softens slightly when hopping up)
	var shadow_w := 28.0 * (1.0 + (0.0 if agent_state != AgentState.MOVING else -stride_lift * 0.16))
	var shadow_a := 0.28 * (1.0 + (0.0 if agent_state != AgentState.MOVING else -stride_lift * 0.22))
	draw_rect(Rect2(-shadow_w * 0.5, -3, shadow_w, 6), Color(0.08, 0.16, 0.06, shadow_a), true)

	# 2. Footstep dust puffs behind the heel
	for pf in footstep_puffs:
		draw_circle(Vector2(float(pf["x"]), float(pf["y"])), float(pf["r"]), Color(0.96, 0.92, 0.82, float(pf["alpha"])))

	# 3. Draw character sprite with squash-and-stretch, waddle tilt, and smooth turn flip
	draw_set_transform(Vector2(0.0, hop_y), tilt_rad, Vector2(scale_x * visual_flip, scale_y))
	var src := Rect2(current_frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE)
	var dst := Rect2(-FRAME_SIZE * 0.5, -FRAME_SIZE + 4, FRAME_SIZE, FRAME_SIZE)
	draw_texture_rect_region(sheet_tex, dst, src)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	if role == Role.ANGLER_PENGUIN:
		var bob_y := sin(anim_time * 1.2) * 1.8
		draw_line(Vector2(20, -26), Vector2(40, -4 + bob_y), Color(0.9, 0.95, 1.0, 0.78), 1.0)
		draw_circle(Vector2(40, -4 + bob_y), 3.0, Color(1.0, 0.3, 0.3, 1.0))

	if agent_state == AgentState.EATING_SNACK:
		if delicacies_tex != null:
			draw_texture_rect_region(delicacies_tex, Rect2(-10, -36 + hop_y, 22, 22), Rect2((int(role) % 4) * 36, 0, 36, 36))
		if heart_tex != null:
			draw_texture_rect(heart_tex, Rect2(-14, -FRAME_SIZE - 18 + hop_y, 28, 28), false)
	elif frenzy_heart_timer > 0.0 and heart_tex != null:
		draw_texture_rect(heart_tex, Rect2(12, -FRAME_SIZE - 6 + hop_y, 20, 20), false)

	if carrying_delicacy and delicacies_tex != null:
		var d_src := Rect2((carried_delicacy_id % 4) * 36, 0, 36, 36)
		draw_texture_rect_region(delicacies_tex, Rect2(-14, -FRAME_SIZE - 12 + hop_y, 28, 28), d_src)
	elif carrying_item and crops_tex != null:
		var icon_src := Rect2(3 * 40, (carried_crop_id % 4) * 40, 40, 40)
		draw_texture_rect_region(crops_tex, Rect2(-14, -FRAME_SIZE - 12 + hop_y, 28, 28), icon_src)
