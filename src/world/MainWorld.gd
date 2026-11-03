extends Node2D
class_name MainWorld
## Panoramic 3-Island World & Desktop Companion UX Controller (`src/world/MainWorld.gd`) — PRD Patch v2.1
## - Rule 1 Zero-Click Cold Start: No manual plot clicking; starts on Island 1 with 1 SoilPlot, 1 AppleTree,
##   1 MarketStall, and 1 Starter Bunny.
## - Rule 3 3-Island Supply Chain & VIP Crown Customers:
##   * Island 1 (Henesys): Raw crops (1x) + Fox Mortar Workshop (3.5x)
##   * Island 2 (Ellinia): Unlocked via Bridge 1 -> Penguin Cauldron Workshop (12.0x)
##   * Island 3 (Orbis Coast): Unlocked via Bridge 2 -> Dual Mortar+Cauldron Linked Workshop (52.0x)
##     + Right Tiki Landmark spawns a Crown VIP Customer every 35~50s (buys 3~5 items, pays 2.0x tip!).
## - Rule 4 Desktop Companion UX:
##   * Supports `Alt + Left Mouse Button` drag to reposition the 3-island dock view on the desktop
##   * Supports Mouse Wheel zoom within `0.4x ~ 1.5x` in Desktop Companion Mode!

var tex_henesys: Texture2D
var tex_ellinia: Texture2D
var tex_orbis: Texture2D
var tex_bridge: Texture2D
var tex_tree: Texture2D
var tex_cottage: Texture2D
var tex_left_hut: Texture2D
var tex_right_tiki: Texture2D
var tex_signpost: Texture2D
var tex_lamp: Texture2D
var tex_scarecrow: Texture2D

var waypoint_graph: WaypointGraph
var camera_controller: CameraController
var window_controller: WindowController
var sound_manager: SoundManager
var hud: HUD
var floating_text: FloatingText

@onready var world_root: Node2D = Node2D.new()
@onready var ysort_layer: Node2D = Node2D.new()

var soil_plots: Array[SoilPlot] = []
var mortar_workshop: Workshop
var cauldron_workshop: Workshop
var orbis_linked_workshop: Workshop
var market_stall: MarketStall
var workers: Array[AnimalWorker] = []
var customers: Array[CustomerNPC] = []

var island2_props: Array[Node2D] = []
var island3_props: Array[Node2D] = []

var customer_spawn_timer: float = 4.0
var vip_customer_timer: float = 38.0 # PRD v2.1 Rule 3.4: 35 ~ 50s VIP Crown Customer timer
var companion_zoom: float = 1.0      # PRD v2.1 Rule 4.1: 0.4x ~ 1.5x wheel zoom in Desktop Mode
var cloud_time: float = 0.0
var chimney_timer: float = 0.0
var chimney_wisps: Array[Dictionary] = []

func _ready() -> void:
	tex_henesys = load("res://assets/pixel_art/islands/island_henesys.png")
	tex_ellinia = load("res://assets/pixel_art/islands/island_ellinia.png")
	tex_orbis = load("res://assets/pixel_art/islands/island_orbis_coast.png")
	tex_bridge = load("res://assets/pixel_art/islands/bridge_wood.png")
	tex_tree = load("res://assets/pixel_art/buildings/apple_tree.png")
	tex_cottage = load("res://assets/pixel_art/buildings/cottage_mushroom.png")
	tex_left_hut = load("res://assets/pixel_art/buildings/landmark_left_hut.png")
	tex_right_tiki = load("res://assets/pixel_art/buildings/landmark_right_tiki.png")
	tex_signpost = load("res://assets/pixel_art/buildings/decor_signpost.png")
	tex_lamp = load("res://assets/pixel_art/buildings/decor_lamp.png")
	tex_scarecrow = load("res://assets/pixel_art/buildings/decor_scarecrow.png")

	world_root.name = "WorldOffsetRoot"
	world_root.position = Vector2(0.0, 36.0)
	add_child(world_root)

	waypoint_graph = WaypointGraph.new()
	waypoint_graph.name = "WaypointGraph"
	world_root.add_child(waypoint_graph)

	ysort_layer.name = "YSortLayer"
	ysort_layer.y_sort_enabled = true
	world_root.add_child(ysort_layer)

	camera_controller = CameraController.new()
	camera_controller.name = "CameraController"
	add_child(camera_controller)

	sound_manager = SoundManager.new()
	sound_manager.name = "SoundManager"
	add_child(sound_manager)

	floating_text = FloatingText.new()
	floating_text.name = "FloatingText"
	world_root.add_child(floating_text)

	var canvas_layer := CanvasLayer.new()
	canvas_layer.layer = 10
	add_child(canvas_layer)

	hud = HUD.new()
	hud.name = "HUD"
	canvas_layer.add_child(hud)

	window_controller = WindowController.new()
	window_controller.name = "WindowController"
	add_child(window_controller)
	window_controller.setup(self, hud)
	hud.window_controller = window_controller

	_build_landmarks_and_buildings()
	_build_soil_plots()
	_spawn_six_specialized_workers()

	EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)
	_apply_desktop_mode(GameManager.desktop_companion_mode)

func _on_toggle_desktop_mode(enabled: bool) -> void:
	_apply_desktop_mode(enabled)

func _apply_desktop_mode(enabled: bool) -> void:
	if enabled:
		get_tree().root.transparent_bg = true
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_TRANSPARENT, true)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_BORDERLESS, true)
	else:
		get_tree().root.transparent_bg = false
	queue_redraw()

func get_active_island_bounds() -> Rect2:
	return Rect2(40.0, 0.0, 1840.0, 300.0)

func _build_landmarks_and_buildings() -> void:
	# Island 1 (Henesys) Core Buildings: Apple Tree, Farmhouse, Signpost, Lamp, Market Stall, Mortar
	var isl1_defs := [
		[tex_tree, Vector2(632, 114), Vector2(-58, -114)],
		[tex_scarecrow, Vector2(746, 108), Vector2(-24, -52)],
		[tex_cottage, Vector2(842, 112), Vector2(-62, -112)],
		[tex_lamp, Vector2(978, 120), Vector2(-22, -62)],
		[tex_signpost, Vector2(648, 144), Vector2(-22, -50)]
	]
	for sd in isl1_defs:
		var sp := Sprite2D.new()
		sp.texture = sd[0]
		sp.centered = false
		sp.position = sd[1]
		sp.offset = sd[2]
		ysort_layer.add_child(sp)

	# Island 2 (Ellinia) Left Landmark Hut
	var left_sp := Sprite2D.new()
	left_sp.texture = tex_left_hut
	left_sp.centered = false
	left_sp.position = Vector2(138, 120)
	left_sp.offset = Vector2(-58, -108)
	ysort_layer.add_child(left_sp)
	island2_props.append(left_sp)

	# Island 3 (Orbis Coast) Right Tiki Landmark
	var right_sp := Sprite2D.new()
	right_sp.texture = tex_right_tiki
	right_sp.centered = false
	right_sp.position = Vector2(1748, 120)
	right_sp.offset = Vector2(-60, -108)
	ysort_layer.add_child(right_sp)
	island3_props.append(right_sp)

	# Island 1 Primary Mortar Workshop (3.5x)
	mortar_workshop = Workshop.new()
	mortar_workshop.setup_workshop("mortar", 1, Vector2(942.0, 126.0), Vector2(-34.0, -52.0))
	ysort_layer.add_child(mortar_workshop)

	# Island 2 Alchemy Cauldron Workshop (12.0x)
	cauldron_workshop = Workshop.new()
	cauldron_workshop.setup_workshop("cauldron", 2, Vector2(362.0, 128.0), Vector2(-34.0, -56.0))
	ysort_layer.add_child(cauldron_workshop)

	# Island 3 Dual Mortar+Cauldron Linked Workshop (52.0x!)
	orbis_linked_workshop = Workshop.new()
	orbis_linked_workshop.setup_workshop("orbis_linked", 3, Vector2(1632.0, 118.0), Vector2(-34.0, -52.0))
	ysort_layer.add_child(orbis_linked_workshop)

	# Main Market Stall (Island 1)
	market_stall = MarketStall.new()
	market_stall.position = Vector2(1022.0, 116.0)
	ysort_layer.add_child(market_stall)

func _build_soil_plots() -> void:
	# Island 1 (Henesys): Up to 8 plots; starts with 1 plot unlocked at Cold Start (`soil_1 == 1`)!
	var idx1 := 0
	for row in range(2):
		for col in range(4):
			var p := SoilPlot.new()
			var cid := "crop_0" if (idx1 % 2 == 0) else "crop_1"
			var pos := Vector2(686.0 + col * 38.0 + row * 6.0, 115.0 + row * 17.0)
			p.setup_plot(1, idx1, cid, pos)
			ysort_layer.add_child(p)
			soil_plots.append(p)
			idx1 += 1

	# Island 2 (Ellinia): Up to 6 plots
	var idx2 := 0
	for row in range(2):
		for col in range(3):
			var p := SoilPlot.new()
			var pos := Vector2(218.0 + col * 42.0 + row * 6.0, 114.0 + row * 17.0)
			p.setup_plot(2, idx2, "crop_2", pos)
			ysort_layer.add_child(p)
			soil_plots.append(p)
			idx2 += 1

	# Island 3 (Orbis Coast Dry Sand): Up to 6 plots
	var idx3 := 0
	for row in range(2):
		for col in range(3):
			var p := SoilPlot.new()
			var pos := Vector2(1476.0 + col * 42.0 + row * 6.0, 102.0 + row * 17.0)
			p.setup_plot(3, idx3, "crop_3", pos)
			ysort_layer.add_child(p)
			soil_plots.append(p)
			idx3 += 1

func _spawn_six_specialized_workers() -> void:
	var specs := [
		[AnimalWorker.RoleType.BUNNY_FARMER, Vector2(700.0, 128.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, Vector2(838.0, 136.0)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, Vector2(1495.0, 118.0)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, Vector2(920.0, 130.0)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, Vector2(344.0, 130.0)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, Vector2(1042.0, 136.0)]
	]
	for s in specs:
		var w := AnimalWorker.new()
		w.setup_worker(s[0], s[1], waypoint_graph, self)
		ysort_layer.add_child(w)
		workers.append(w)

func find_best_plot_for_bunny() -> SoilPlot:
	for p in soil_plots:
		if p.island_idx == 1 and p.is_plot_active() and not p.reserved_by_worker and p.growth >= 0.85:
			return p
	for p in soil_plots:
		if p.island_idx == 1 and p.is_plot_active() and not p.reserved_by_worker:
			return p
	return soil_plots[0] if soil_plots.size() > 0 else null

func _unhandled_input(event: InputEvent) -> void:
	# PRD v2.1 Rule 1.1: Zero manual plot clicking!
	# PRD v2.1 Rule 4.1: Alt + Left Mouse Button drags the 3-island dock view; Mouse Wheel scales 0.4x ~ 1.5x!
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and Input.is_key_pressed(KEY_ALT) and window_controller != null:
				window_controller.begin_window_drag()
				return
			elif not event.pressed and window_controller != null and window_controller.is_dragging:
				window_controller.end_window_drag()
				return
		elif event.pressed and GameManager.desktop_companion_mode:
			if event.button_index == MOUSE_BUTTON_WHEEL_UP:
				companion_zoom = clampf(companion_zoom + 0.08, 0.4, 1.5)
				_apply_companion_zoom()
			elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
				companion_zoom = clampf(companion_zoom - 0.08, 0.4, 1.5)
				_apply_companion_zoom()

func _apply_companion_zoom() -> void:
	# Scale around the bottom-center of the 1920x300 dock strip
	world_root.scale = Vector2(companion_zoom, companion_zoom)
	world_root.position = Vector2(960.0 * (1.0 - companion_zoom), 36.0 + 200.0 * (1.0 - companion_zoom))
	queue_redraw()

func _process(delta: float) -> void:
	cloud_time += delta

	var isl2_on := bool(GameManager.unlocked_islands.get(2, false))
	var isl3_on := bool(GameManager.unlocked_islands.get(3, false))
	for n in island2_props:
		n.visible = isl2_on
	for n in island3_props:
		n.visible = isl3_on

	chimney_timer += delta
	if chimney_timer >= 1.4:
		chimney_timer = 0.0
		chimney_wisps.append({"x": 866.0, "y": 60.0, "r": 3.5, "alpha": 0.55})
	for i in range(chimney_wisps.size() - 1, -1, -1):
		chimney_wisps[i]["y"] = float(chimney_wisps[i]["y"]) - 7.5 * delta
		chimney_wisps[i]["x"] = float(chimney_wisps[i]["x"]) + sin(cloud_time + float(i)) * 4.0 * delta
		chimney_wisps[i]["r"] = float(chimney_wisps[i]["r"]) + 1.8 * delta
		chimney_wisps[i]["alpha"] = float(chimney_wisps[i]["alpha"]) - 0.16 * delta
		if float(chimney_wisps[i]["alpha"]) <= 0.02:
			chimney_wisps.remove_at(i)

	for i in range(customers.size() - 1, -1, -1):
		if not is_instance_valid(customers[i]):
			customers.remove_at(i)

	# Regular Long-Cycle Customer Spawner (18.0 ~ 30.0s)
	customer_spawn_timer -= delta
	if customer_spawn_timer <= 0.0:
		customer_spawn_timer = randf_range(18.0, 30.0)
		if customers.size() < 4:
			_spawn_customer(false)

	# PRD v2.1 Rule 3.4: Right Landmark Crown VIP Customer Spawner (every 35 ~ 50s once Island 3 is unlocked!)
	if isl3_on:
		vip_customer_timer -= delta
		if vip_customer_timer <= 0.0:
			vip_customer_timer = randf_range(35.0, 50.0)
			if customers.size() < 4:
				_spawn_customer(true)

	queue_redraw()

func _spawn_customer(as_vip: bool) -> void:
	var c := CustomerNPC.new()
	var sp := Vector2(610.0, 140.0)
	if as_vip:
		sp = waypoint_graph.get_named_pos("spawn_right")
	elif bool(GameManager.unlocked_islands.get(2, false)) and (randi() % 2 == 0):
		sp = waypoint_graph.get_named_pos("spawn_left")
	c.setup_customer(sp, waypoint_graph, market_stall, as_vip)
	ysort_layer.add_child(c)
	customers.append(c)

func _get_bridge_weight_sag(min_x: float, max_x: float) -> float:
	var mid_x := (min_x + max_x) * 0.5
	var half_span := maxf(20.0, (max_x - min_x) * 0.5)
	var max_sag := 0.0
	for w in workers:
		if is_instance_valid(w) and w.visible and w.position.x >= min_x and w.position.x <= max_x:
			max_sag = maxf(max_sag, (1.0 - absf(w.position.x - mid_x) / half_span) * 1.6)
	for c in customers:
		if is_instance_valid(c) and c.position.x >= min_x and c.position.x <= max_x:
			max_sag = maxf(max_sag, (1.0 - absf(c.position.x - mid_x) / half_span) * 1.8)
	return max_sag

func _draw() -> void:
	var oy := 36.0
	var bob := roundf(sin(cloud_time * 0.55) * 1.0)

	if not GameManager.desktop_companion_mode:
		draw_rect(Rect2(0, 0, 1920, 300), Color(0.45, 0.74, 0.96, 1.0), true)
		draw_rect(Rect2(0, 180, 1920, 120), Color(0.68, 0.88, 1.0, 1.0), true)

	draw_set_transform(world_root.position - Vector2(0.0, oy * companion_zoom), 0.0, world_root.scale)

	var left_sag := _get_bridge_weight_sag(486.0, 594.0)
	var pond_sag := _get_bridge_weight_sag(1082.0, 1302.0)
	var right_sag := _get_bridge_weight_sag(1302.0, 1416.0)

	# 1. Island 2 (Ellinia Forest) + Bridge 1 (shown when unlocked, or ghostly silhouette before unlock)
	var isl2_tint := Color.WHITE if bool(GameManager.unlocked_islands.get(2, false)) else Color(0.55, 0.62, 0.72, 0.42)
	if tex_ellinia != null:
		draw_texture(tex_ellinia, Vector2(64.0, oy + 74.0 + bob), isl2_tint)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(492.0, oy + 124.0 + bob + roundf(left_sag)), isl2_tint)

	# 2. Island 3 (Orbis Coast) + Bridge 2
	var isl3_tint := Color.WHITE if bool(GameManager.unlocked_islands.get(3, false)) else Color(0.55, 0.62, 0.72, 0.42)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(1312.0, oy + 118.0 + bob + roundf(right_sag)), isl3_tint)
	if tex_orbis != null:
		draw_texture(tex_orbis, Vector2(1396.0, oy + 74.0 + bob), isl3_tint)

	# 3. Island 1 (Henesys Meadow — Always Unlocked)
	if tex_henesys != null:
		draw_texture(tex_henesys, Vector2(560.0, oy + 70.0))

	# 4. Lotus Pond Wooden Plank Footbridge (荷花池木栈桥)
	var ripple_alpha := 0.30 + 0.18 * sin(cloud_time * 1.6)
	for px in [1096.0, 1188.0, 1284.0]:
		var ring_r := 6.0 + fmod(cloud_time * 4.5 + px * 0.1, 5.0) + pond_sag * 1.5
		draw_arc(Vector2(px, oy + 146.0), ring_r, 0.0, PI * 2.0, 16, Color(0.88, 0.99, 1.0, ripple_alpha * 0.85), 1.0)
		draw_rect(Rect2(px - 3.0, oy + 134.0 + roundf(pond_sag), 6.0, 13.0), Color(0.36, 0.21, 0.11, 0.95), true)
	if tex_bridge != null:
		draw_texture_rect(tex_bridge, Rect2(1082.0, oy + 118.0 + roundf(pond_sag), 114.0, 38.0), false)
		draw_texture_rect(tex_bridge, Rect2(1188.0, oy + 118.0 + roundf(pond_sag), 114.0, 38.0), false)

	for wisp in chimney_wisps:
		draw_circle(Vector2(float(wisp["x"]), float(wisp["y"])), float(wisp["r"]), Color(0.98, 0.96, 0.92, float(wisp["alpha"])))

	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
