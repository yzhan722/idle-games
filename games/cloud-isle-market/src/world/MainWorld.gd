extends Node2D
class_name MainWorld
## Panoramic 3-Island World with 110px~140px Spacious Building Layout (`src/world/MainWorld.gd`) — Visual Polish Patch
## Calibrated X-Coordinates (110px~140px clean spacing, zero overlap):
## - Island 1 (Henesys): AppleTree (596, 112), SoilPlots (692, 128) & (760, 128), Cottage (796, 110),
##   Mortar Workshop (912, 122), MarketStall (1038, 118)
## - Island 2 (Ellinia): Left Hut (128, 118), SoilPlots (246, 126) & (312, 126), Cauldron Workshop (422, 124)
## - Island 3 (Orbis Coast): AppleTree (1432, 110), SoilPlots (1518, 116) & (1582, 116), Dual Workshop (1668, 116), Right Tiki (1782, 118)

var tex_henesys: Texture2D
var tex_ellinia: Texture2D
var tex_orbis: Texture2D
var tex_bridge: Texture2D
var tex_tree: Texture2D
var tex_cottage: Texture2D
var tex_left_hut: Texture2D
var tex_right_tiki: Texture2D

var waypoint_graph: WaypointGraph
var camera_controller: CameraController
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
var vip_customer_timer: float = 38.0
var companion_zoom: float = 1.0
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

	floating_text = FloatingText.new()
	floating_text.name = "FloatingText"
	world_root.add_child(floating_text)

	var canvas_layer := CanvasLayer.new()
	canvas_layer.layer = 10
	add_child(canvas_layer)

	var hud_scene: PackedScene = load("res://src/ui/HUD.tscn")
	hud = hud_scene.instantiate() as HUD
	hud.name = "HUD"
	canvas_layer.add_child(hud)

	if WindowController != null:
		WindowController.setup(self, hud)

	_build_landmarks_and_buildings()
	_build_soil_plots()
	_spawn_all_roster_slots()

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
		if SoundManager != null:
			SoundManager.set_muted(true)
	else:
		get_tree().root.transparent_bg = false
	queue_redraw()

func get_active_island_bounds() -> Rect2:
	return Rect2(40.0, 0.0, 1840.0, 300.0)

func _build_landmarks_and_buildings() -> void:
	# Island 1 (Henesys) — Spacious 110px~140px building spacing:
	# Apple Tree at x=596 -> SoilPlots at x=692..760 -> Cottage at x=796 -> Mortar at x=912 -> Market Stall at x=1038
	var tree_1 := Sprite2D.new()
	tree_1.texture = tex_tree
	tree_1.centered = false
	tree_1.position = Vector2(596.0, 112.0)
	tree_1.offset = Vector2(-58.0, -114.0)
	ysort_layer.add_child(tree_1)

	var cot_1 := Sprite2D.new()
	cot_1.texture = tex_cottage
	cot_1.centered = false
	cot_1.position = Vector2(796.0, 110.0)
	cot_1.offset = Vector2(-62.0, -112.0)
	ysort_layer.add_child(cot_1)

	# Island 2 (Ellinia): Left Landmark Hut (x=128) -> SoilPlots (x=246..312) -> Cauldron Workshop (x=422)
	var left_sp := Sprite2D.new()
	left_sp.texture = tex_left_hut
	left_sp.centered = false
	left_sp.position = Vector2(128.0, 118.0)
	left_sp.offset = Vector2(-58.0, -108.0)
	ysort_layer.add_child(left_sp)
	island2_props.append(left_sp)

	# Island 3 (Orbis Coast): Apple Tree (x=1432) -> SoilPlots (x=1518..1582) -> Dual Workshop (x=1668) -> Right Tiki (x=1782)
	var tree_3 := Sprite2D.new()
	tree_3.texture = tex_tree
	tree_3.centered = false
	tree_3.position = Vector2(1432.0, 110.0)
	tree_3.offset = Vector2(-58.0, -114.0)
	ysort_layer.add_child(tree_3)
	island3_props.append(tree_3)

	var right_sp := Sprite2D.new()
	right_sp.texture = tex_right_tiki
	right_sp.centered = false
	right_sp.position = Vector2(1782.0, 118.0)
	right_sp.offset = Vector2(-60.0, -108.0)
	ysort_layer.add_child(right_sp)
	island3_props.append(right_sp)

	# Island 1 Mortar Workshop (x=912, 116px right of Cottage and 126px left of Market Stall!)
	mortar_workshop = Workshop.new()
	mortar_workshop.setup_workshop("mortar", 1, Vector2(912.0, 122.0), Vector2(-34.0, -52.0))
	ysort_layer.add_child(mortar_workshop)

	# Island 2 Cauldron Workshop (x=422, 110px right of SoilPlots)
	cauldron_workshop = Workshop.new()
	cauldron_workshop.setup_workshop("cauldron", 2, Vector2(422.0, 124.0), Vector2(-34.0, -56.0))
	ysort_layer.add_child(cauldron_workshop)

	# Island 3 Dual Mortar + Cauldron Linked Workshop (x=1668, 114px left of Right Tiki)
	orbis_linked_workshop = Workshop.new()
	orbis_linked_workshop.setup_workshop("orbis_linked", 3, Vector2(1668.0, 116.0), Vector2(-34.0, -52.0))
	ysort_layer.add_child(orbis_linked_workshop)

	# Island 1 Main Market Stall (x=1038, 126px right of Mortar Workshop — zero overlap!)
	market_stall = MarketStall.new()
	market_stall.position = Vector2(1038.0, 118.0)
	ysort_layer.add_child(market_stall)

func _build_soil_plots() -> void:
	# Island 1 (Henesys): 2x SoilPlot (64x26 enlarged beds)
	var isl1_coords := [Vector2(692.0, 128.0), Vector2(760.0, 132.0)]
	for i in range(2):
		var p := SoilPlot.new()
		p.setup_plot(1, i, "crop_0", isl1_coords[i])
		ysort_layer.add_child(p)
		soil_plots.append(p)

	# Island 2 (Ellinia): 2x SoilPlot
	var isl2_coords := [Vector2(246.0, 126.0), Vector2(312.0, 130.0)]
	for i in range(2):
		var p := SoilPlot.new()
		p.setup_plot(2, i, "crop_2", isl2_coords[i])
		ysort_layer.add_child(p)
		soil_plots.append(p)

	# Island 3 (Orbis Coast Dry Sand): 2x SoilPlot
	var isl3_coords := [Vector2(1518.0, 114.0), Vector2(1582.0, 118.0)]
	for i in range(2):
		var p := SoilPlot.new()
		p.setup_plot(3, i, "crop_3", isl3_coords[i])
		ysort_layer.add_child(p)
		soil_plots.append(p)

func _spawn_all_roster_slots() -> void:
	var roster_defs := [
		# Island 1 (Henesys): Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(692.0, 132.0)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 1, Vector2(760.0, 134.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 0, Vector2(822.0, 136.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 1, Vector2(856.0, 136.0)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 1, 0, Vector2(892.0, 128.0)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, 1, 0, Vector2(1058.0, 136.0)],

		# Island 2 (Ellinia): Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 0, Vector2(246.0, 130.0)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 1, Vector2(312.0, 132.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 2, 0, Vector2(352.0, 132.0)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 2, 0, Vector2(400.0, 128.0)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 0, Vector2(442.0, 132.0)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 1, Vector2(468.0, 132.0)],

		# Island 3 (Orbis Coast): Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 0, Vector2(1518.0, 118.0)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 1, Vector2(1582.0, 120.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 0, Vector2(1612.0, 118.0)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 1, Vector2(1632.0, 118.0)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 3, 0, Vector2(1646.0, 118.0)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 3, 0, Vector2(1690.0, 118.0)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 0, Vector2(1716.0, 118.0)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 1, Vector2(1742.0, 118.0)]
	]
	for rd in roster_defs:
		var w := AnimalWorker.new()
		w.setup_worker(rd[0], rd[1], rd[2], rd[3], waypoint_graph, self)
		ysort_layer.add_child(w)
		workers.append(w)

func find_best_plot_for_island(isl_idx: int) -> SoilPlot:
	for p in soil_plots:
		if p.island_idx == isl_idx and p.is_plot_active() and not p.reserved_by_worker and p.growth >= 0.85:
			return p
	for p in soil_plots:
		if p.island_idx == isl_idx and p.is_plot_active() and not p.reserved_by_worker:
			return p
	return null

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed and Input.is_key_pressed(KEY_ALT) and WindowController != null:
				WindowController.begin_window_drag()
				return
			elif not event.pressed and WindowController != null and WindowController.is_dragging:
				WindowController.end_window_drag()
				return
		elif event.pressed and GameManager.desktop_companion_mode:
			if event.button_index == MOUSE_BUTTON_WHEEL_UP:
				companion_zoom = clampf(companion_zoom + 0.08, 0.4, 1.5)
				_apply_companion_zoom()
			elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
				companion_zoom = clampf(companion_zoom - 0.08, 0.4, 1.5)
				_apply_companion_zoom()

func _apply_companion_zoom() -> void:
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
		chimney_wisps.append({"x": 820.0, "y": 58.0, "r": 3.5, "alpha": 0.55})
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

	customer_spawn_timer -= delta
	if customer_spawn_timer <= 0.0:
		customer_spawn_timer = randf_range(18.0, 30.0)
		if customers.size() < 4:
			_spawn_customer(false)

	if isl3_on:
		vip_customer_timer -= delta
		if vip_customer_timer <= 0.0:
			vip_customer_timer = randf_range(35.0, 50.0)
			if customers.size() < 4:
				_spawn_customer(true)

	if WindowController != null and hud != null:
		WindowController.update_passthrough_polygon(get_active_island_bounds(), hud.get_hud_Hit_rect())

	queue_redraw()

func _spawn_customer(as_vip: bool) -> void:
	var c := CustomerNPC.new()
	var sp := Vector2(610.0, 140.0)
	if as_vip:
		sp = waypoint_graph.get_named_pos("spawn_right")
	elif bool(GameManager.unlocked_islands.get(2, false)):
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

	var isl2_tint := Color.WHITE if bool(GameManager.unlocked_islands.get(2, false)) else Color(0.55, 0.62, 0.72, 0.42)
	if tex_ellinia != null:
		draw_texture(tex_ellinia, Vector2(64.0, oy + 74.0 + bob), isl2_tint)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(492.0, oy + 124.0 + bob + roundf(left_sag)), isl2_tint)

	var isl3_tint := Color.WHITE if bool(GameManager.unlocked_islands.get(3, false)) else Color(0.55, 0.62, 0.72, 0.42)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(1312.0, oy + 118.0 + bob + roundf(right_sag)), isl3_tint)
	if tex_orbis != null:
		draw_texture(tex_orbis, Vector2(1396.0, oy + 74.0 + bob), isl3_tint)

	if tex_henesys != null:
		draw_texture(tex_henesys, Vector2(560.0, oy + 70.0))

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
