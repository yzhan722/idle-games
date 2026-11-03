extends Node2D
class_name IslandWorld
## Artisan 1.5D Oblique Diorama Island World (1920x260 low-profile viewport) — Phase 4 Deep Polish Edition:
## - High-detail layered floating island dioramas with back-row horizon clouds, animated chimney smoke wisps,
##   and shimmering lotus pond water ripples.
## - Unhurried, cozy casual pacing: slow traveler spawns (10.5s), slow floating numbers, gentle island breathing.

var game_manager: LegacyGameManager
var window_controller: WindowController
var sound_manager: LegacySoundManager

var tex_henesys: Texture2D
var tex_ellinia: Texture2D
var tex_orbis: Texture2D
var tex_bridge: Texture2D
var tex_soil: Texture2D
var tex_crops: Texture2D
var tex_delicacies: Texture2D
var tex_stall: Texture2D
var tex_tree: Texture2D
var tex_cottage: Texture2D
var tex_left_hut: Texture2D
var tex_right_tiki: Texture2D
var tex_mortar: Texture2D
var tex_cauldron: Texture2D
var tex_signpost: Texture2D
var tex_lamp: Texture2D
var tex_scarecrow: Texture2D
var tex_parchment: Texture2D
var tex_icons: Texture2D
var tex_heart: Texture2D

var traveler_textures: Array[Texture2D] = []
var animal_agents: Array[AnimalAgent] = []
var plot_nodes: Array[YSortedProp] = []
var dynamic_prop_nodes: Array[YSortedProp] = []

var plots: Array[Dictionary] = []
var floating_texts: Array[Dictionary] = []
var floating_cn_tags: Array[Dictionary] = []
var coin_particles: Array[Dictionary] = []
var env_particles: Array[Dictionary] = []
var chimney_wisps: Array[Dictionary] = []

var traveler_timer: float = 5.5
var thief_event_timer: float = 48.0
var magic_rain_cooldown: float = 65.0
var magic_rain_timer: float = 0.0
var magic_cloud_x: float = 650.0
var cloud_time: float = 0.0
var chimney_timer: float = 0.0

var active_traveler: TravelerAgent = null
var active_thief: TravelerAgent = null
var fox_spawned: bool = false
var toucan_spawned: bool = false

@onready var ysort_layer: Node2D = Node2D.new()

func _ready() -> void:
	position = Vector2(0.0, 36.0)
	ysort_layer.y_sort_enabled = true
	add_child(ysort_layer)

	tex_henesys = load("res://assets/pixel_art/islands/island_henesys.png")
	tex_ellinia = load("res://assets/pixel_art/islands/island_ellinia.png")
	tex_orbis = load("res://assets/pixel_art/islands/island_orbis_coast.png")
	tex_bridge = load("res://assets/pixel_art/islands/bridge_wood.png")
	tex_soil = load("res://assets/pixel_art/islands/soil_plot.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")
	tex_stall = load("res://assets/pixel_art/buildings/market_stall.png")
	tex_tree = load("res://assets/pixel_art/buildings/apple_tree.png")
	tex_cottage = load("res://assets/pixel_art/buildings/cottage_mushroom.png")
	tex_left_hut = load("res://assets/pixel_art/buildings/landmark_left_hut.png")
	tex_right_tiki = load("res://assets/pixel_art/buildings/landmark_right_tiki.png")
	tex_mortar = load("res://assets/pixel_art/buildings/workshop_mortar.png")
	tex_cauldron = load("res://assets/pixel_art/buildings/workshop_cauldron.png")
	tex_signpost = load("res://assets/pixel_art/buildings/decor_signpost.png")
	tex_lamp = load("res://assets/pixel_art/buildings/decor_lamp.png")
	tex_scarecrow = load("res://assets/pixel_art/buildings/decor_scarecrow.png")
	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	tex_heart = load("res://assets/pixel_art/ui/emote_heart.png")

	traveler_textures = [
		load("res://assets/pixel_art/travelers/traveler_slime.png"),
		load("res://assets/pixel_art/travelers/traveler_mushroom.png"),
		load("res://assets/pixel_art/travelers/traveler_pig.png")
	]

	_init_env_particles()
	_spawn_back_row_buildings()
	refresh_world_layout()
	_spawn_starter_animals()

func _init_env_particles() -> void:
	env_particles.clear()
	for i in range(18):
		env_particles.append({
			"x": randf_range(560.0, 1340.0),
			"y": randf_range(36.0, 172.0),
			"phase": randf() * 6.28,
			"speed": randf_range(6.0, 12.0)
		})

func _spawn_back_row_buildings() -> void:
	var tree_node := YSortedProp.new()
	tree_node.setup_static(tex_tree, Vector2(632, 114), Vector2(-58, -114), "晨风红苹果树 · 果园双段食材")
	ysort_layer.add_child(tree_node)

	var cot_node := YSortedProp.new()
	cot_node.setup_static(tex_cottage, Vector2(842, 112), Vector2(-62, -112), "晨风风车木屋 · 小动物农舍")
	ysort_layer.add_child(cot_node)

	var stall_node := YSortedProp.new()
	stall_node.setup_market_stall(tex_stall, tex_crops, tex_delicacies, Vector2(1022, 116), Vector2(-66, -102), self)
	ysort_layer.add_child(stall_node)

func refresh_world_layout() -> void:
	_rebuild_plots()
	_rebuild_workshops_and_decor()
	_ensure_expansion_companions()

func _ensure_expansion_companions() -> void:
	if game_manager == null:
		return
	if game_manager.unlocked_left_ellinia and not fox_spawned:
		var fox_tex: Texture2D = load("res://assets/pixel_art/animals/fox_sheet.png")
		if fox_tex != null:
			fox_spawned = true
			var fox := AnimalAgent.new()
			fox.setup(AnimalAgent.Role.FOREST_FOX, fox_tex, tex_crops, tex_delicacies, tex_heart, Vector2(205, 128), self)
			ysort_layer.add_child(fox)
			animal_agents.append(fox)
	if game_manager.unlocked_right_orbis and not toucan_spawned:
		var toucan_tex: Texture2D = load("res://assets/pixel_art/animals/toucan_sheet.png")
		if toucan_tex != null:
			toucan_spawned = true
			var toucan := AnimalAgent.new()
			toucan.setup(AnimalAgent.Role.ISLAND_TOUCAN, toucan_tex, tex_crops, tex_delicacies, tex_heart, Vector2(1635, 118), self)
			ysort_layer.add_child(toucan)
			animal_agents.append(toucan)

func _rebuild_workshops_and_decor() -> void:
	for dn in dynamic_prop_nodes:
		if is_instance_valid(dn):
			dn.queue_free()
	dynamic_prop_nodes.clear()

	if game_manager == null:
		return

	if game_manager.unlocked_left_ellinia and tex_left_hut != null:
		var lh_node := YSortedProp.new()
		lh_node.setup_static(tex_left_hut, Vector2(138, 120), Vector2(-58, -108), "荧光森谷树洞草药屋 · 小狐狸炼金地标")
		ysort_layer.add_child(lh_node)
		dynamic_prop_nodes.append(lh_node)

	if game_manager.unlocked_right_orbis and tex_right_tiki != null:
		var rt_node := YSortedProp.new()
		rt_node.setup_static(tex_right_tiki, Vector2(1748, 120), Vector2(-60, -108), "海滩椰壳冷饮吧 · 大嘴鸟特调地标")
		ysort_layer.add_child(rt_node)
		dynamic_prop_nodes.append(rt_node)

	if game_manager.mortar_level >= 1 and tex_mortar != null:
		var m_node := YSortedProp.new()
		m_node.setup_workshop(
			tex_mortar,
			tex_delicacies,
			0,
			Vector2(942, 126),
			Vector2(-34, -52),
			self,
			"桂花石臼坊 Lv." + str(game_manager.mortar_level) + " · 锤打桂花糯米糕 & 苹果草莓派"
		)
		ysort_layer.add_child(m_node)
		dynamic_prop_nodes.append(m_node)

	if game_manager.cauldron_level >= 1 and tex_cauldron != null:
		var c_node := YSortedProp.new()
		c_node.setup_workshop(
			tex_cauldron,
			tex_delicacies,
			2,
			Vector2(602, 130),
			Vector2(-34, -56),
			self,
			"森之炼金釜 Lv." + str(game_manager.cauldron_level) + " · 熬制星露荧光甘露饮"
		)
		ysort_layer.add_child(c_node)
		dynamic_prop_nodes.append(c_node)

	if game_manager.decor_level >= 1 and tex_signpost != null:
		var s_node := YSortedProp.new()
		s_node.setup_static(tex_signpost, Vector2(648, 144), Vector2(-22, -50), "晨风指路木牌 · 旅人打赏+8%")
		ysort_layer.add_child(s_node)
		dynamic_prop_nodes.append(s_node)

	if game_manager.decor_level >= 2 and tex_lamp != null:
		var l_node := YSortedProp.new()
		l_node.setup_streetlamp(tex_lamp, Vector2(978, 120), Vector2(-22, -62), self)
		ysort_layer.add_child(l_node)
		dynamic_prop_nodes.append(l_node)

	if game_manager.decor_level >= 3 and tex_scarecrow != null:
		var sc_node := YSortedProp.new()
		sc_node.setup_static(tex_scarecrow, Vector2(746, 108), Vector2(-24, -52), "暖阳稻草人 · 守护良田全收益+8%")
		ysort_layer.add_child(sc_node)
		dynamic_prop_nodes.append(sc_node)

func _rebuild_plots() -> void:
	for pn in plot_nodes:
		if is_instance_valid(pn):
			pn.queue_free()
	plot_nodes.clear()
	plots.clear()

	# Center Island (island_henesys): flat green lawn is y = 104 .. 138 (above the cobblestone path at y = 146!)
	var cols_center := 4
	if game_manager != null:
		cols_center = clampi(2 + game_manager.plot_tier, 3, 5)
	var start_x := 686.0 - float(cols_center - 4) * 16.0
	for row in range(2):
		for col in range(cols_center):
			var ppos := Vector2(start_x + col * 38 + row * 6, 115 + row * 17)
			plots.append({
				"pos": ppos,
				"island": 0,
				"sown": true,
				"watered": (col % 2 == 0),
				"crop_id": row % 2,
				"growth": randf_range(0.18, 0.82),
				"reserved_by": -1
			})
	# Left Island (island_ellinia): flat emerald moss clearing is y = 108 .. 136, x = 210 .. 340
	if game_manager != null and game_manager.unlocked_left_ellinia:
		for row in range(2):
			for col in range(3):
				plots.append({
					"pos": Vector2(218 + col * 42 + row * 6, 114 + row * 17),
					"island": 1,
					"sown": true,
					"watered": (col % 2 == 0),
					"crop_id": 2,
					"growth": randf_range(0.15, 0.78),
					"reserved_by": -1
				})
	# Right Island (island_orbis_coast): flat golden beach plateau is y = 96 .. 124, x = 1465 .. 1620 (above water waves!)
	if game_manager != null and game_manager.unlocked_right_orbis:
		for row in range(2):
			for col in range(3):
				plots.append({
					"pos": Vector2(1476 + col * 42 + row * 6, 102 + row * 17),
					"island": 2,
					"sown": true,
					"watered": (col % 2 == 0),
					"crop_id": 3,
					"growth": randf_range(0.15, 0.78),
					"reserved_by": -1
				})

	for i in range(plots.size()):
		var pn := YSortedProp.new()
		pn.setup_plot(i, plots[i]["pos"], tex_soil, tex_crops, self)
		ysort_layer.add_child(pn)
		plot_nodes.append(pn)

func _spawn_starter_animals() -> void:
	var bunny := AnimalAgent.new()
	bunny.setup(AnimalAgent.Role.MOON_BUNNY, load("res://assets/pixel_art/animals/bunny_sheet.png"), tex_crops, tex_delicacies, tex_heart, Vector2(760, 134), self)
	ysort_layer.add_child(bunny)
	animal_agents.append(bunny)

	var otter := AnimalAgent.new()
	otter.setup(AnimalAgent.Role.LOTUS_OTTER, load("res://assets/pixel_art/animals/otter_sheet.png"), tex_crops, tex_delicacies, tex_heart, Vector2(905, 138), self)
	ysort_layer.add_child(otter)
	animal_agents.append(otter)

	var shiba := AnimalAgent.new()
	shiba.setup(AnimalAgent.Role.CARPENTER_SHIBA, load("res://assets/pixel_art/animals/shiba_sheet.png"), tex_crops, tex_delicacies, tex_heart, Vector2(665, 126), self)
	ysort_layer.add_child(shiba)
	animal_agents.append(shiba)

	var penguin := AnimalAgent.new()
	penguin.setup(AnimalAgent.Role.ANGLER_PENGUIN, load("res://assets/pixel_art/animals/penguin_sheet.png"), tex_crops, tex_delicacies, tex_heart, Vector2(1076, 142), self)
	ysort_layer.add_child(penguin)
	animal_agents.append(penguin)

	_ensure_expansion_companions()

func trigger_magic_rain_shower() -> void:
	magic_rain_timer = 14.0
	magic_cloud_x = 640.0
	for i in range(plots.size()):
		plots[i]["watered"] = true
	spawn_floating_cn_tag(Vector2(820, 48), "★精灵魔力阵雨 · 全岛免浇水滋润!", Color(0.68, 0.96, 1.0))
	if sound_manager != null:
		sound_manager.play_sfx("water_splash")

func has_active_snack_thief() -> bool:
	return is_instance_valid(active_thief) and not active_thief.has_purchased

func get_snack_thief_pos() -> Vector2:
	if is_instance_valid(active_thief):
		return active_thief.position
	return Vector2(942, 134)

func chase_away_snack_thief() -> void:
	if is_instance_valid(active_thief):
		active_thief.scare_away_and_drop_reward()

func get_world_hover_info(mpos: Vector2) -> Dictionary:
	if is_instance_valid(active_thief) and active_thief.position.distance_to(mpos) < 32.0:
		return {"pos": active_thief.position + Vector2(0, -56), "title": active_thief.get_display_name(), "sub": "正在偷吃桂花糯米糕! 左键点击驱赶!"}
	for ag in animal_agents:
		if is_instance_valid(ag) and ag.position.distance_to(mpos) < 30.0:
			var st_txt := "悠闲劳作中"
			if ag.agent_state == AnimalAgent.AgentState.SLEEPING:
				st_txt = "正在小憩Zzz (点击轻抚唤醒)"
			elif ag.agent_state == AnimalAgent.AgentState.EATING_SNACK:
				st_txt = "♥正在品尝茶点补充元气"
			elif ag.agent_state == AnimalAgent.AgentState.IDLE_BREATHER:
				st_txt = "正在欣赏花园风景"
			elif ag.frenzy_heart_timer > 0.0:
				st_txt = "♥心情愉悦 · 步履轻快"
			return {"pos": ag.position + Vector2(0, -62), "title": ag.get_display_name(), "sub": st_txt}
	if is_instance_valid(active_traveler) and active_traveler.position.distance_to(mpos) < 28.0:
		return {"pos": active_traveler.position + Vector2(0, -56), "title": active_traveler.get_display_name(), "sub": "正在漫步逛集市"}
	for dn in dynamic_prop_nodes:
		if is_instance_valid(dn) and dn.prop_title != "" and dn.position.distance_to(mpos) < 36.0:
			return {"pos": dn.position + Vector2(0, -58), "title": dn.prop_title, "sub": "云端景观与工坊设施"}
	if mpos.distance_to(Vector2(1022, 116)) < 46.0 and game_manager != null:
		return {
			"pos": Vector2(1022, 52),
			"title": "云端集市摊位 Lv." + str(game_manager.market_level) + " (可视化货架)",
			"sub": "双段料理:" + str(game_manager.get_total_delicacy_count()) + " 鲜果:" + str(game_manager.market_stock) + " 红苹果:" + str(game_manager.apple_stock)
		}
	return {}

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if window_controller != null and window_controller.is_dragging:
			return
		var mpos := get_local_mouse_position()
		if is_instance_valid(active_thief) and not active_thief.has_purchased and active_thief.position.distance_to(mpos) < 36.0:
			active_thief.scare_away_and_drop_reward()
			return
		for ag in animal_agents:
			if ag.position.distance_to(mpos) < 34.0:
				ag.trigger_pet_boost()
				return
		# Player does NOT manually click farm plots — 100% of sowing, watering, and harvesting is performed autonomously by animals!

func _process(delta: float) -> void:
	cloud_time += delta
	var crop_mult := game_manager.get_crop_grow_multiplier() if game_manager != null else 1.0
	if magic_rain_timer > 0.0:
		magic_rain_timer = maxf(0.0, magic_rain_timer - delta)
		magic_cloud_x += 14.0 * delta
		crop_mult *= 1.8

	# Cozy chimney smoke wisps rising gently from the Windmill Farmhouse chimney
	chimney_timer += delta
	if chimney_timer >= 1.4:
		chimney_timer = 0.0
		chimney_wisps.append({"x": 866.0, "y": 24.0, "r": 3.5, "alpha": 0.55})
	for w_i in range(chimney_wisps.size() - 1, -1, -1):
		chimney_wisps[w_i]["y"] -= 7.5 * delta
		chimney_wisps[w_i]["x"] += sin(cloud_time + float(w_i)) * 4.0 * delta
		chimney_wisps[w_i]["r"] += 1.8 * delta
		chimney_wisps[w_i]["alpha"] -= 0.16 * delta
		if float(chimney_wisps[w_i]["alpha"]) <= 0.02:
			chimney_wisps.remove_at(w_i)

	var target_tint := Color(1.0, 1.0, 1.0, 1.0)
	var phase_idx := game_manager.get_phase_index() if game_manager != null else 0
	if sound_manager != null:
		sound_manager.set_ambient_phase(3 if magic_rain_timer > 0.0 else phase_idx)
	match phase_idx:
		0: target_tint = Color(1.0, 1.0, 1.0, 1.0)
		1: target_tint = Color(1.04, 0.91, 0.80, 1.0)
		2: target_tint = Color(0.80, 0.87, 1.04, 1.0)
		3: target_tint = Color(1.03, 1.02, 1.05, 1.0)
	ysort_layer.modulate = ysort_layer.modulate.lerp(target_tint, delta * 1.5)

	for i in range(plots.size()):
		var p: Dictionary = plots[i]
		var cid: int = p["crop_id"]
		var is_sown: bool = bool(p.get("sown", true))
		if is_sown and cid >= 0 and float(p["growth"]) < 1.0:
			var grow_dur: float = float(LegacyGameManager.CROP_DATA[cid]["grow_time"])
			var mult := (1.50 if bool(p["watered"]) else 1.0) * crop_mult
			p["growth"] = minf(1.0, float(p["growth"]) + (delta * mult) / grow_dur)
		if i < plot_nodes.size() and is_instance_valid(plot_nodes[i]):
			plot_nodes[i].queue_redraw()

	traveler_timer -= delta
	if traveler_timer <= 0.0:
		traveler_timer = 10.5
		if game_manager != null and game_manager.get_total_stall_items() > 0 and not is_instance_valid(active_traveler):
			_spawn_traveler(false)

	thief_event_timer -= delta
	if thief_event_timer <= 0.0:
		thief_event_timer = randf_range(55.0, 75.0)
		if not is_instance_valid(active_thief):
			_spawn_traveler(true)

	magic_rain_cooldown -= delta
	if magic_rain_cooldown <= 0.0:
		magic_rain_cooldown = randf_range(70.0, 95.0)
		trigger_magic_rain_shower()

	# Slow, gentle floating text rise (13 px/s)
	for i in range(floating_texts.size() - 1, -1, -1):
		floating_texts[i]["y"] -= 13.0 * delta
		floating_texts[i]["ttl"] -= delta
		if float(floating_texts[i]["ttl"]) <= 0.0:
			floating_texts.remove_at(i)

	for i in range(floating_cn_tags.size() - 1, -1, -1):
		floating_cn_tags[i]["y"] -= 12.0 * delta
		floating_cn_tags[i]["ttl"] -= delta
		if float(floating_cn_tags[i]["ttl"]) <= 0.0:
			floating_cn_tags.remove_at(i)

	# Gentle coin bounce arc
	for i in range(coin_particles.size() - 1, -1, -1):
		coin_particles[i]["vy"] += 120.0 * delta
		coin_particles[i]["x"] += float(coin_particles[i]["vx"]) * delta
		coin_particles[i]["y"] += float(coin_particles[i]["vy"]) * delta
		coin_particles[i]["ttl"] -= delta
		if float(coin_particles[i]["ttl"]) <= 0.0:
			coin_particles.remove_at(i)

	queue_redraw()

func _spawn_traveler(as_thief: bool = false) -> void:
	var tr := TravelerAgent.new()
	var m_idx := 2 if as_thief else (randi() % traveler_textures.size())
	var tex: Texture2D = traveler_textures[m_idx]
	var start_pos := Vector2(610.0, 140.0) if not game_manager.unlocked_left_ellinia else Vector2(130.0, 134.0)
	var exit_pos := Vector2(1296.0, 140.0) if not game_manager.unlocked_right_orbis else Vector2(1790.0, 120.0)
	var target_spot := Vector2(942.0, 132.0) if as_thief else Vector2(1022.0, 140.0)
	tr.setup(m_idx, tex, tex_parchment, tex_icons, tex_delicacies, start_pos, target_spot, exit_pos, self, as_thief)
	ysort_layer.add_child(tr)
	if as_thief:
		active_thief = tr
	else:
		active_traveler = tr

## Multi-island & bridge/pond navigation path builder:
## Ensures animals & travelers always enter at bridgeheads, follow arched bridge planks,
## walk across the Lotus Pond Wooden Footbridge (never open pond water), and stay on the
## dry golden sand of the Right Island (never stepping into the turquoise ocean surf!).
func build_navigation_path(from_pos: Vector2, to_pos: Vector2) -> Array[Vector2]:
	var clean_end := constrain_to_walkable_surface(to_pos)
	var gates: Array[Vector2] = [
		Vector2(486.0, 136.0),   # Left Island -> Left Suspension Bridgehead
		Vector2(540.0, 131.5),   # Left Suspension Bridge Arch Crown
		Vector2(594.0, 138.0),   # Left Suspension Bridgehead -> Center Island
		Vector2(1082.0, 139.0),  # Center Island -> Lotus Pond Footbridge West Pier
		Vector2(1192.0, 134.5),  # Lotus Pond Footbridge Arch Crown
		Vector2(1302.0, 139.0),  # Lotus Pond Footbridge East Pier
		Vector2(1358.0, 125.0),  # Right Suspension Bridge Arch Crown
		Vector2(1416.0, 120.0)   # Right Suspension Bridgehead -> Right Island Dry Golden Beach
	]
	var waypoints: Array[Vector2] = []
	if clean_end.x > from_pos.x + 8.0:
		for g in gates:
			if g.x > from_pos.x + 6.0 and g.x < clean_end.x - 6.0:
				waypoints.append(g)
	elif clean_end.x < from_pos.x - 8.0:
		for i in range(gates.size() - 1, -1, -1):
			var g := gates[i]
			if g.x < from_pos.x - 6.0 and g.x > clean_end.x + 6.0:
				waypoints.append(g)
	waypoints.append(clean_end)
	return waypoints

## Continuous walkable-surface constraint:
## Clamps any character position to the exact bridge arch curve or dry ground band at position.x.
func constrain_to_walkable_surface(pos: Vector2) -> Vector2:
	var x := clampf(pos.x, 96.0, 1824.0)
	var y := pos.y
	if x < 486.0:
		# Left Island (Glowwood Mystic Forest): flat emerald moss clearing
		y = clampf(y, 112.0, 136.0)
	elif x <= 594.0:
		# Left Suspension Bridge: arched wooden planks
		var t := clampf((x - 486.0) / 108.0, 0.0, 1.0)
		var arch_y := lerpf(136.0, 138.0, t) - 5.0 * sin(t * PI)
		y = arch_y + _get_bridge_weight_sag(486.0, 594.0)
	elif x < 1082.0:
		# Center Island Meadow & Cobblestone Path
		y = clampf(y, 112.0, 142.0)
	elif x <= 1302.0:
		# Center Island Lotus Pond Wooden Plank Footbridge (never walk on raw lotus pond water!)
		var t := clampf((x - 1082.0) / 220.0, 0.0, 1.0)
		var arch_y := 139.0 - 4.5 * sin(t * PI)
		y = arch_y + _get_bridge_weight_sag(1082.0, 1302.0)
	elif x <= 1416.0:
		# Right Suspension Bridge: rises from Center Island East Pier (y=139) to Right Island Dry Beach (y=120)
		var t := clampf((x - 1302.0) / 114.0, 0.0, 1.0)
		var arch_y := lerpf(139.0, 120.0, t) - 4.5 * sin(t * PI)
		y = arch_y + _get_bridge_weight_sag(1302.0, 1416.0)
	else:
		# Right Island (Coral Sunlit Beach): strictly dry golden sand plateau (y <= 122, above ocean surf waves!)
		y = clampf(y, 100.0, 122.0)
	return Vector2(x, y)

func _get_bridge_weight_sag(min_x: float, max_x: float) -> float:
	var mid_x := (min_x + max_x) * 0.5
	var half_span := maxf(20.0, (max_x - min_x) * 0.5)
	var max_sag := 0.0
	for ag in animal_agents:
		if is_instance_valid(ag) and ag.position.x >= min_x and ag.position.x <= max_x:
			var w := 1.0 - absf(ag.position.x - mid_x) / half_span
			max_sag = maxf(max_sag, w * 1.6)
	if is_instance_valid(active_traveler) and active_traveler.position.x >= min_x and active_traveler.position.x <= max_x:
		var w := 1.0 - absf(active_traveler.position.x - mid_x) / half_span
		max_sag = maxf(max_sag, w * 1.8)
	if is_instance_valid(active_thief) and active_thief.position.x >= min_x and active_thief.position.x <= max_x:
		var w := 1.0 - absf(active_thief.position.x - mid_x) / half_span
		max_sag = maxf(max_sag, w * 1.8)
	return max_sag

func release_plot_claim(idx: int, role_id: int) -> void:
	if idx >= 0 and idx < plots.size():
		if int(plots[idx].get("reserved_by", -1)) == role_id:
			plots[idx]["reserved_by"] = -1

func claim_island_plot_job(island_id: int, role_id: int, allow_sow: bool, allow_water: bool, allow_harvest: bool) -> Dictionary:
	for i in range(plots.size()):
		if int(plots[i].get("reserved_by", -1)) == role_id:
			plots[i]["reserved_by"] = -1

	# Priority 1: Sow empty tilled 1.5D beds on this island
	if allow_sow:
		for i in range(plots.size()):
			var p: Dictionary = plots[i]
			if int(p.get("island", 0)) == island_id and not bool(p.get("sown", true)) and int(p.get("reserved_by", -1)) == -1:
				p["reserved_by"] = role_id
				return {"index": i, "pos": p["pos"], "op": "sow"}

	# Priority 2: Harvest mature crops on this island
	if allow_harvest:
		for i in range(plots.size()):
			var p: Dictionary = plots[i]
			if int(p.get("island", 0)) == island_id and bool(p.get("sown", true)) and float(p.get("growth", 0.0)) >= 0.96 and int(p.get("reserved_by", -1)) == -1:
				p["reserved_by"] = role_id
				return {"index": i, "pos": p["pos"], "op": "harvest"}

	# Priority 3: Water dry sown beds on this island (or any island for Otter!)
	if allow_water:
		for i in range(plots.size()):
			var p: Dictionary = plots[i]
			var isl_match := (int(p.get("island", 0)) == island_id) or (role_id == int(AnimalAgent.Role.LOTUS_OTTER))
			if isl_match and bool(p.get("sown", true)) and not bool(p.get("watered", false)) and float(p.get("growth", 0.0)) < 0.94 and int(p.get("reserved_by", -1)) == -1:
				p["reserved_by"] = role_id
				return {"index": i, "pos": p["pos"], "op": "water"}

	return {}

func complete_plot_sow(idx: int, _agent: AnimalAgent) -> void:
	if idx < 0 or idx >= plots.size():
		return
	plots[idx]["sown"] = true
	plots[idx]["growth"] = 0.08
	plots[idx]["reserved_by"] = -1
	var isl := int(plots[idx].get("island", 0))
	if isl == 0:
		plots[idx]["crop_id"] = mini(1, game_manager.selected_crop_id) if game_manager != null else (idx % 2)
	elif isl == 1:
		plots[idx]["crop_id"] = 2
	else:
		plots[idx]["crop_id"] = 3
	if sound_manager != null and randf() < 0.45:
		sound_manager.play_sfx("harvest_pop", 0.04)

func complete_plot_water(idx: int, _agent: AnimalAgent) -> void:
	if idx < 0 or idx >= plots.size():
		return
	plots[idx]["watered"] = true
	plots[idx]["growth"] = minf(1.0, float(plots[idx]["growth"]) + 0.14)
	plots[idx]["reserved_by"] = -1
	if sound_manager != null and randf() < 0.45:
		sound_manager.play_sfx("water_splash", 0.04)

func complete_plot_harvest(idx: int, agent: AnimalAgent) -> void:
	if idx < 0 or idx >= plots.size():
		return
	agent.carrying_item = true
	agent.carried_crop_id = int(plots[idx]["crop_id"])
	plots[idx]["sown"] = false
	plots[idx]["watered"] = false
	plots[idx]["growth"] = 0.0
	plots[idx]["reserved_by"] = -1
	if sound_manager != null and randf() < 0.55:
		sound_manager.play_sfx("harvest_pop", 0.04)

func get_plot_world_pos(idx: int) -> Vector2:
	return plots[idx]["pos"]

func get_stream_pos() -> Vector2:
	return Vector2(1075, 142)

func get_apple_tree_pos() -> Vector2:
	return Vector2(656, 122)

func get_left_hut_pos() -> Vector2:
	return Vector2(168, 128)

func get_right_tiki_pos() -> Vector2:
	return Vector2(1705, 118)

func get_mortar_pos() -> Vector2:
	return Vector2(942, 130)

func get_cauldron_pos() -> Vector2:
	return Vector2(604, 132)

func get_market_stall_pos() -> Vector2:
	return Vector2(1022, 132)

func spawn_floating_text(pos: Vector2, txt: String) -> void:
	floating_texts.append({"x": pos.x, "y": pos.y, "txt": txt, "ttl": 2.0})

func spawn_floating_cn_tag(pos: Vector2, txt: String, col: Color = Color(1.0, 0.94, 0.45)) -> void:
	floating_cn_tags.append({"x": pos.x, "y": pos.y, "txt": txt, "col": col, "ttl": 2.2})

func spawn_bouncing_meso(pos: Vector2) -> void:
	for i in range(3):
		coin_particles.append({
			"x": pos.x,
			"y": pos.y,
			"vx": randf_range(-28.0, 28.0),
			"vy": randf_range(-68.0, -45.0),
			"ttl": 0.95
		})

func get_active_island_bounds() -> Rect2:
	var min_x := 540.0
	var max_x := 1380.0
	if game_manager != null:
		if game_manager.unlocked_left_ellinia:
			min_x = 40.0
		if game_manager.unlocked_right_orbis:
			max_x = 1880.0
	return Rect2(min_x, 0.0, max_x - min_x, 300.0)

func _draw() -> void:
	# Very slow, serene 1px breathing float for sub-islands
	var bob := roundf(sin(cloud_time * 0.55) * 1.0)
	var phase_idx := game_manager.get_phase_index() if game_manager != null else 0
	var pros_tier := game_manager.get_prosperity_tier() if game_manager != null else 1
	var deck_tint := ysort_layer.modulate

	# 0. Delicate Low-Profile Horizon Clouds & Optional Rainbow Arch behind the islands
	var cloud_spots := [Vector2(690, 58), Vector2(965, 48), Vector2(1210, 62)]
	for c_idx in range(cloud_spots.size()):
		var cpos: Vector2 = cloud_spots[c_idx]
		var drift_x := sin(cloud_time * 0.18 + float(c_idx) * 2.1) * 14.0
		var col_c := Color(1.0, 0.98, 0.94, 0.24) if phase_idx != 2 else Color(0.75, 0.85, 1.0, 0.16)
		draw_circle(Vector2(cpos.x + drift_x - 14, cpos.y + 3), 10.0, col_c)
		draw_circle(Vector2(cpos.x + drift_x, cpos.y), 13.0, col_c)
		draw_circle(Vector2(cpos.x + drift_x + 14, cpos.y + 3), 10.0, col_c)

	if phase_idx == 3 or magic_rain_timer > 0.0:
		var rainbow_cols := [
			Color(1.0, 0.42, 0.42, 0.30),
			Color(1.0, 0.78, 0.35, 0.30),
			Color(0.45, 0.95, 0.55, 0.30),
			Color(0.42, 0.78, 1.0, 0.30)
		]
		for r_i in range(rainbow_cols.size()):
			draw_arc(Vector2(960, 155), 260.0 - r_i * 6.0, PI * 1.12, PI * 1.88, 36, rainbow_cols[r_i], 5.0)

	# 1. Left 1.5D Diorama Island Deck: Glowwood Mystic Forest
	var left_sag := _get_bridge_weight_sag(486.0, 594.0)
	var pond_sag := _get_bridge_weight_sag(1082.0, 1302.0)
	var right_sag := _get_bridge_weight_sag(1302.0, 1416.0)
	if game_manager != null and game_manager.unlocked_left_ellinia:
		draw_texture(tex_ellinia, Vector2(64, 74 + bob), deck_tint)
		draw_texture(tex_bridge, Vector2(492, 124 + bob + roundf(left_sag)), deck_tint)

	# 2. Right 1.5D Diorama Island Deck: Coral Sunlit Beach
	if game_manager != null and game_manager.unlocked_right_orbis:
		draw_texture(tex_bridge, Vector2(1312, 118 + bob + roundf(right_sag)), deck_tint)
		draw_texture(tex_orbis, Vector2(1396, 74 + bob), deck_tint)

	# 3. Center 1.5D Diorama Island Deck: Cloudbrook Wide Meadow
	draw_texture(tex_henesys, Vector2(560, 70), deck_tint)

	# 3.5 Lotus Pond Wooden Plank Footbridge (荷花池木栈桥) with Cedar Pilings & Water Ripples
	var ripple_alpha := 0.30 + 0.18 * sin(cloud_time * 1.6)
	var piling_xs := [1096.0, 1188.0, 1284.0]
	for px in piling_xs:
		# Submerged water reflection & concentric ripple ring around each cedar piling
		var ring_r := 6.0 + fmod(cloud_time * 4.5 + px * 0.1, 5.0) + pond_sag * 1.5
		draw_arc(Vector2(px, 146.0), ring_r, 0.0, PI * 2.0, 16, Color(0.88, 0.99, 1.0, ripple_alpha * 0.85), 1.0)
		draw_rect(Rect2(px - 3.0, 134.0 + roundf(pond_sag), 6.0, 13.0), Color(0.36, 0.21, 0.11, 0.95), true)
		draw_rect(Rect2(px - 2.0, 134.0 + roundf(pond_sag), 2.0, 12.0), Color(0.55, 0.35, 0.18, 0.95), true)
	if tex_bridge != null:
		draw_texture_rect(tex_bridge, Rect2(1082.0, 118.0 + roundf(pond_sag), 114.0, 38.0), false, deck_tint)
		draw_texture_rect(tex_bridge, Rect2(1188.0, 118.0 + roundf(pond_sag), 114.0, 38.0), false, deck_tint)

	# 4. Farmhouse Chimney Smoke Wisps & Lotus Pond Water Shimmer
	for wisp in chimney_wisps:
		draw_circle(Vector2(float(wisp["x"]), float(wisp["y"])), float(wisp["r"]), Color(0.98, 0.96, 0.92, float(wisp["alpha"])))

	draw_line(Vector2(1132, 150), Vector2(1152, 150), Color(0.92, 0.99, 1.0, ripple_alpha), 1.0)
	draw_line(Vector2(1224, 152), Vector2(1244, 152), Color(0.92, 0.99, 1.0, ripple_alpha), 1.0)

	# 6. Magic Rain Cloud Micro-Event
	if magic_rain_timer > 0.0:
		var cx := roundf(magic_cloud_x)
		var cy := 34.0 + roundf(sin(cloud_time * 1.4) * 2.0)
		draw_circle(Vector2(cx - 18, cy + 4), 14.0, Color(0.68, 0.58, 0.95, 0.90))
		draw_circle(Vector2(cx, cy), 18.0, Color(0.76, 0.68, 1.0, 0.95))
		draw_circle(Vector2(cx + 18, cy + 4), 14.0, Color(0.68, 0.58, 0.95, 0.90))
		for r_drop in range(6):
			var dx := cx - 22.0 + float(r_drop) * 9.0
			var dy := cy + 16.0 + fmod(cloud_time * 52.0 + float(r_drop) * 19.0, 96.0)
			draw_line(Vector2(dx, dy), Vector2(dx - 1, dy + 7), Color(0.55, 0.95, 1.0, 0.82), 2.0)

	# 7. Slow, Serene Atmospheric Particles
	for ep in env_particles:
		var px := float(ep["x"]) + sin(cloud_time * 0.45 + float(ep["phase"])) * 14.0
		var py := float(ep["y"]) + cos(cloud_time * 0.55 + float(ep["phase"])) * 8.0
		var alpha := 0.45 + 0.40 * sin(cloud_time * 1.4 + float(ep["phase"]))
		if phase_idx == 2:
			draw_rect(Rect2(roundf(px) - 2, roundf(py) - 2, 4, 4), Color(0.65, 1.0, 0.32, alpha * 0.45), true)
			draw_rect(Rect2(roundf(px) - 1, roundf(py) - 1, 2, 2), Color(0.95, 1.0, 0.65, alpha), true)
		elif pros_tier >= 4:
			draw_rect(Rect2(roundf(px), roundf(py), 4, 3), Color(1.0, 0.62, 0.22, alpha * 0.82), true)
		elif phase_idx == 1:
			draw_rect(Rect2(roundf(px), roundf(py), 2, 2), Color(1.0, 0.78, 0.35, alpha * 0.62), true)
		elif phase_idx == 3:
			draw_rect(Rect2(roundf(px), roundf(py), 3, 3), Color(1.0, 0.96, 0.68, alpha * 0.82), true)

	# 8. Bouncing Gold Coins & Floating Numbers
	if tex_icons != null:
		for cp in coin_particles:
			draw_texture_rect_region(tex_icons, Rect2(float(cp["x"]) - 12, float(cp["y"]) - 12, 24, 24), Rect2(0, 0, 48, 48))

	for ft in floating_texts:
		PixelFontRenderer.draw_pixel_string(self, Vector2(float(ft["x"]), float(ft["y"])), String(ft["txt"]), Color.WHITE, true, 0.85)

	for ct in floating_cn_tags:
		PixelFontRenderer.draw_pixel_cn(self, Vector2(float(ct["x"]), float(ct["y"])), String(ct["txt"]), 13, ct["col"], Color(0.14, 0.06, 0.02, 0.96), true)
