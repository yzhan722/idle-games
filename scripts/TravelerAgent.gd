extends Node2D
class_name TravelerAgent
## Unhurried, Cozy 48x48 Original Woodland Travelers (背篓小刺猬, 草帽胖橘猫, 红领巾小浣熊)
## Phase 4+ Navigation & Walk Animation Polish:
## - Follows IslandWorld.build_navigation_path() & constrain_to_walkable_surface() so travelers
##   properly arch over the Left Suspension Bridge, cross the Lotus Pond Wooden Footbridge,
##   and climb onto the dry golden sand of the Right Island (NEVER walking on open water or ocean surf!).
## - Richly animated stroll with sinusoidal stride bounce, squash/stretch, waddle tilt, and footstep dust!

const FRAME_SIZE := 48
const TRAVELER_NAMES: Array[String] = [
	"背篓小刺猬 · 森谷旅人",
	"草帽胖橘猫 · 美食食客",
	"红领巾小浣熊 · 云岛行商"
]

var monster_idx: int = 0
var is_snack_thief: bool = false
var sheet_tex: Texture2D
var ui_parchment_tex: Texture2D
var icons_tex: Texture2D
var delicacies_tex: Texture2D
var world_ref: Node2D
var stall_pos: Vector2
var exit_pos: Vector2
var nav_waypoints: Array[Vector2] = []
var anim_time: float = 0.0
var has_purchased: bool = false
var pause_at_stall: float = 0.0
var facing_left: bool = false
var last_step_index: int = -1
var footstep_puffs: Array[Dictionary] = []

func setup(
	p_monster_idx: int,
	p_tex: Texture2D,
	p_parch: Texture2D,
	p_icons: Texture2D,
	p_delicacies: Texture2D,
	p_start: Vector2,
	p_stall: Vector2,
	p_exit: Vector2,
	p_world: Node2D,
	p_is_thief: bool = false
) -> void:
	monster_idx = p_monster_idx
	is_snack_thief = p_is_thief
	sheet_tex = p_tex
	ui_parchment_tex = p_parch
	icons_tex = p_icons
	delicacies_tex = p_delicacies
	world_ref = p_world
	position = world_ref.constrain_to_walkable_surface(p_start) if (world_ref != null and world_ref.has_method("constrain_to_walkable_surface")) else p_start
	stall_pos = p_stall
	exit_pos = p_exit
	if world_ref != null and world_ref.has_method("build_navigation_path"):
		nav_waypoints = world_ref.build_navigation_path(position, stall_pos)
	else:
		nav_waypoints = [stall_pos]

func get_display_name() -> String:
	if is_snack_thief:
		return "贪吃小馋狸 (左键点击驱赶爆金币!)"
	return TRAVELER_NAMES[monster_idx % TRAVELER_NAMES.size()]

func scare_away_and_drop_reward() -> void:
	if has_purchased:
		return
	has_purchased = true
	if world_ref != null:
		if world_ref.has_method("build_navigation_path"):
			nav_waypoints = world_ref.build_navigation_path(position, exit_pos)
		else:
			nav_waypoints = [exit_pos]
		world_ref.game_manager.add_meso(45)
		world_ref.spawn_floating_text(position + Vector2(0, -54), "+45G")
		world_ref.spawn_floating_cn_tag(position + Vector2(0, -72), "★成功护糕! 掉落金币!", Color(1.0, 0.92, 0.32))
		world_ref.spawn_bouncing_meso(position + Vector2(0, -28))
		if world_ref.sound_manager != null:
			world_ref.sound_manager.play_sfx("meso_coin")

func _process(delta: float) -> void:
	anim_time += delta * (2.6 if is_snack_thief else 1.85)
	for i in range(footstep_puffs.size() - 1, -1, -1):
		footstep_puffs[i]["y"] -= 4.5 * delta
		footstep_puffs[i]["r"] += 2.0 * delta
		footstep_puffs[i]["alpha"] -= 0.75 * delta
		if float(footstep_puffs[i]["alpha"]) <= 0.02:
			footstep_puffs.remove_at(i)

	var dest := stall_pos if not has_purchased else exit_pos
	var cur_wp: Vector2 = nav_waypoints[0] if nav_waypoints.size() > 0 else dest
	var dist := position.distance_to(cur_wp)
	var decor_speed_bonus := 1.0 + float(world_ref.game_manager.decor_level) * 0.05 if (world_ref != null and world_ref.game_manager != null) else 1.0
	var spd := (34.0 if has_purchased and is_snack_thief else 20.0) * decor_speed_bonus

	if dist > 3.5:
		var dir := (cur_wp - position).normalized()
		if absf(dir.x) > 0.05:
			facing_left = dir.x < 0.0
		var next_pos := position + dir * minf(dist, spd * delta)
		if world_ref != null and world_ref.has_method("constrain_to_walkable_surface"):
			next_pos = world_ref.constrain_to_walkable_surface(next_pos)
		position = next_pos

		var step_idx := int(floor(anim_time))
		if step_idx != last_step_index:
			last_step_index = step_idx
			footstep_puffs.append({
				"x": (5.0 if facing_left else -5.0),
				"y": -1.0,
				"r": 1.8,
				"alpha": 0.44
			})
	else:
		if nav_waypoints.size() > 1:
			nav_waypoints.remove_at(0)
			queue_redraw()
			return
		nav_waypoints.clear()
		if not has_purchased:
			pause_at_stall += delta
			if pause_at_stall >= 3.8:
				if is_snack_thief:
					scare_away_and_drop_reward()
				else:
					has_purchased = true
					if world_ref != null and world_ref.has_method("build_navigation_path"):
						nav_waypoints = world_ref.build_navigation_path(position, exit_pos)
					else:
						nav_waypoints = [exit_pos]
					var res: Dictionary = world_ref.game_manager.sell_from_stall()
					var earned: int = int(res.get("earned", 0))
					var is_delicacy: bool = bool(res.get("is_delicacy", false))
					var r_id: int = int(res.get("recipe_id", 0))
					if earned > 0:
						world_ref.spawn_floating_text(position + Vector2(0, -54), "+" + str(earned) + "G")
						if is_delicacy:
							var r_name: String = GameManager.RECIPE_DATA[r_id % 4]["name"]
							world_ref.spawn_floating_cn_tag(position + Vector2(0, -72), "★品尝" + r_name + "!", Color(1.0, 0.92, 0.38))
						world_ref.spawn_bouncing_meso(position + Vector2(0, -28))
						if world_ref.sound_manager != null:
							world_ref.sound_manager.play_sfx("meso_coin")
		else:
			queue_free()
	queue_redraw()

func _draw() -> void:
	if sheet_tex == null:
		return
	var is_walking := (nav_waypoints.size() > 0 or position.distance_to(stall_pos if not has_purchased else exit_pos) > 3.5)
	var step_phase := fmod(anim_time * PI, TAU)
	var stride_lift := absf(sin(step_phase)) if is_walking else 0.0
	var hop_y := -roundf(stride_lift * 2.2)
	var scale_x := (1.03 - stride_lift * 0.06) if is_walking else 1.0
	var scale_y := (0.97 + stride_lift * 0.07) if is_walking else (1.0 + sin(anim_time * 1.5) * 0.02)
	var tilt_rad := (sin(step_phase) * 0.048) if is_walking else 0.0

	var shadow_w := 24.0 * (1.0 - stride_lift * 0.15)
	draw_rect(Rect2(-shadow_w * 0.5, -3, shadow_w, 5), Color(0.08, 0.16, 0.06, 0.25), true)

	for pf in footstep_puffs:
		draw_circle(Vector2(float(pf["x"]), float(pf["y"])), float(pf["r"]), Color(0.96, 0.92, 0.82, float(pf["alpha"])))

	var frame := (int(anim_time) % 2) if is_walking else 0
	var flip_x := -1.0 if facing_left else 1.0
	draw_set_transform(Vector2(0.0, hop_y), tilt_rad, Vector2(scale_x * flip_x, scale_y))
	var src := Rect2(frame * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE)
	draw_texture_rect_region(sheet_tex, Rect2(-FRAME_SIZE * 0.5, -FRAME_SIZE + 4, FRAME_SIZE, FRAME_SIZE), src)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	if is_snack_thief and not has_purchased:
		PixelFontRenderer.draw_pixel_cn(self, Vector2(0, -FRAME_SIZE - 10 + hop_y), "★偷糕小馋狸 (点击驱赶)", 13, Color(1.0, 0.68, 0.52), Color(0.18, 0.05, 0.02), true)
	elif not has_purchased and position.distance_to(stall_pos) < 46.0 and ui_parchment_tex != null:
		draw_texture_rect(ui_parchment_tex, Rect2(-20, -FRAME_SIZE - 34, 40, 34), false)
		var wants_delicacy: bool = (world_ref != null and world_ref.game_manager != null and world_ref.game_manager.get_total_delicacy_count() > 0)
		if wants_delicacy and delicacies_tex != null:
			draw_texture_rect_region(delicacies_tex, Rect2(-13, -FRAME_SIZE - 30, 26, 26), Rect2((monster_idx % 4) * 36, 0, 36, 36))
		elif icons_tex != null:
			draw_texture_rect_region(icons_tex, Rect2(-14, -FRAME_SIZE - 31, 28, 28), Rect2(0, 0, 48, 48))
