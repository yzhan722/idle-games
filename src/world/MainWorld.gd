extends Node2D
class_name MainWorld
## Panoramic 3-Island World (`src/world/MainWorld.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Unified `GROUND_Y = 124.0` (`EconomyConfig.GROUND_Y`) across all islands.
## - Bottom-center grounding pivot (`centered = true`, `offset = Vector2(0.0, -float(frame_h) * 0.5)`) on all buildings & props.
## - Strict `z_index` layering (`Z_SKY = -100`, `Z_TERRAIN = -20`, `Z_SHADOW = -5`, `Z_SOIL_BASE = -2`, `Z_BUILDING = 0`, `Z_CROP = 1`, `Z_UNIT = 10`, `Z_CARRY_EMOTE = 20`, `Z_FLOATING_UI = 50`).
## - 1D Slot Allocator & Anti-Overlap Assertion (`|X_A - X_B| >= (W_A + W_B)/2 + 28px`, 0% horizontal overlap).

const GROUND_Y := 124.0

## GEMINI.md Law 3.1 & 3.2: 1D Slot Definitions (every adjacent pair satisfies `|X_A - X_B| >= (W_A + W_B)/2 + 28.0`)
const ISLAND_SLOTS: Dictionary = {
	1: [
		{"id": "apple_tree_1", "x": 612.4, "tex_w": 112.0, "tex_h": 120.0, "scale": 0.65},
		{"id": "soil_plot_1",  "x": 710.8, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cottage_1",    "x": 811.2, "tex_w": 118.0, "tex_h": 114.0, "scale": 0.65},
		{"id": "mortar_1",     "x": 908.4, "tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.85},
		{"id": "stall_1",      "x": 1013.4,"tex_w": 128.0, "tex_h": 104.0, "scale": 0.72}
	],
	2: [
		{"id": "left_hut_2",   "x": 144.0, "tex_w": 112.0, "tex_h": 108.0, "scale": 0.68},
		{"id": "soil_plot_2",  "x": 272.0, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cauldron_2",   "x": 397.0, "tex_w": 68.0,  "tex_h": 62.0,  "scale": 0.85}
	],
	3: [
		{"id": "apple_tree_3", "x": 1462.0,"tex_w": 112.0, "tex_h": 120.0, "scale": 0.65},
		{"id": "soil_plot_3",  "x": 1562.4,"tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "orbis_work_3", "x": 1655.3,"tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.85},
		{"id": "right_tiki_3", "x": 1755.6,"tex_w": 116.0, "tex_h": 108.0, "scale": 0.68}
	]
}

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
var tree_1_node: Sprite2D
var cot_1_node: Sprite2D
var left_hut_node: Sprite2D
var tree_3_node: Sprite2D
var right_tiki_node: Sprite2D

var customer_spawn_timer: float = 4.0
var vip_customer_timer: float = 38.0
var companion_zoom: float = 1.0
var cloud_time: float = 0.0
var chimney_timer: float = 0.0
var chimney_wisps: Array[Dictionary] = []

func _ready() -> void:
	z_index = EconomyConfig.Z_TERRAIN
	z_as_relative = false

	tex_henesys = load("res://assets/pixel_art/islands/island_henesys.png")
	tex_ellinia = load("res://assets/pixel_art/islands/island_ellinia.png")
	tex_orbis = load("res://assets/pixel_art/islands/island_orbis_coast.png")
	tex_bridge = load("res://assets/pixel_art/islands/bridge_wood.png")
	tex_tree = load("res://assets/pixel_art/buildings/apple_tree.png")
	tex_cottage = load("res://assets/pixel_art/buildings/cottage_mushroom.png")
	tex_left_hut = load("res://assets/pixel_art/buildings/landmark_left_hut.png")
	tex_right_tiki = load("res://assets/pixel_art/buildings/landmark_right_tiki.png")

	_assert_1d_slot_layout()

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

func _assert_1d_slot_layout() -> void:
	for isl_idx in ISLAND_SLOTS.keys():
		var slots: Array = ISLAND_SLOTS[isl_idx]
		for i in range(slots.size() - 1):
			var a: Dictionary = slots[i]
			var b: Dictionary = slots[i + 1]
			var wa := float(a["tex_w"]) * float(a["scale"])
			var wb := float(b["tex_w"]) * float(b["scale"])
			var dist := absf(float(b["x"]) - float(a["x"]))
			var min_req := (wa + wb) * 0.5 + EconomyConfig.MIN_BUILDING_PADDING
			assert(dist >= min_req - 0.5, "Building Overlap Detected on Island %d between %s and %s!" % [isl_idx, str(a["id"]), str(b["id"])])

func _make_grounded_prop(tex: Texture2D, slot_x: float, frame_h: int, sc: float) -> Sprite2D:
	var sp := Sprite2D.new()
	sp.texture = tex
	# GEMINI.md Law 2.2: Bottom-Center Pivot (`centered = true`, `offset = Vector2(0.0, -float(frame_h) * 0.5)`)
	sp.centered = true
	sp.offset = Vector2(0.0, -float(frame_h) * 0.5)
	sp.scale = Vector2(sc, sc)
	sp.position = Vector2(slot_x, GROUND_Y)
	sp.z_index = EconomyConfig.Z_BUILDING
	sp.z_as_relative = false
	return sp

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
	# Island 1 (Henesys): AppleTree (x=612.4), SoilPlot (x=710.8), Cottage (x=811.2), Mortar (x=908.4), Stall (x=1013.4)
	# GEMINI.md Law 3.3: `apple_tree.png` & `cottage_mushroom.png` have built-in grass base shadows -> NO procedural shadow!
	tree_1_node = _make_grounded_prop(tex_tree, 612.4, 120, 0.65)
	tree_1_node.name = "AppleTree_1"
	ysort_layer.add_child(tree_1_node)

	cot_1_node = _make_grounded_prop(tex_cottage, 811.2, 114, 0.65)
	cot_1_node.name = "MushroomCottage_1"
	ysort_layer.add_child(cot_1_node)

	# Island 2 (Ellinia): Left Hut (x=144.0), SoilPlot (x=272.0), Cauldron (x=397.0)
	left_hut_node = _make_grounded_prop(tex_left_hut, 144.0, 108, 0.68)
	left_hut_node.name = "LeftHut_2"
	ysort_layer.add_child(left_hut_node)
	island2_props.append(left_hut_node)

	# Island 3 (Orbis Coast): AppleTree (x=1462.0), SoilPlot (x=1562.4), Dual Workshop (x=1655.3), Right Tiki (x=1755.6)
	tree_3_node = _make_grounded_prop(tex_tree, 1462.0, 120, 0.65)
	tree_3_node.name = "AppleTree_3"
	ysort_layer.add_child(tree_3_node)
	island3_props.append(tree_3_node)

	right_tiki_node = _make_grounded_prop(tex_right_tiki, 1755.6, 108, 0.68)
	right_tiki_node.name = "RightTiki_3"
	ysort_layer.add_child(right_tiki_node)
	island3_props.append(right_tiki_node)

	mortar_workshop = Workshop.new()
	mortar_workshop.name = "MortarWorkshop_1"
	mortar_workshop.setup_workshop("mortar", 1, Vector2(908.4, GROUND_Y))
	ysort_layer.add_child(mortar_workshop)

	cauldron_workshop = Workshop.new()
	cauldron_workshop.name = "CauldronWorkshop_2"
	cauldron_workshop.setup_workshop("cauldron", 2, Vector2(397.0, GROUND_Y))
	ysort_layer.add_child(cauldron_workshop)

	orbis_linked_workshop = Workshop.new()
	orbis_linked_workshop.name = "OrbisWorkshop_3"
	orbis_linked_workshop.setup_workshop("orbis_linked", 3, Vector2(1655.3, GROUND_Y))
	ysort_layer.add_child(orbis_linked_workshop)

	market_stall = MarketStall.new()
	market_stall.name = "MarketStall_1"
	market_stall.position = Vector2(1013.4, GROUND_Y)
	ysort_layer.add_child(market_stall)

func get_island_main_building_rects() -> Dictionary:
	var oy := world_root.position.y
	var p1_rect := soil_plots[0].get_screen_rect() if soil_plots.size() > 0 else Rect2(710.8 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p2_rect := soil_plots[1].get_screen_rect() if soil_plots.size() > 1 else Rect2(272.0 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p3_rect := soil_plots[2].get_screen_rect() if soil_plots.size() > 2 else Rect2(1562.4 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	return {
		1: [
			{"name": "AppleTree_1",       "rect": _sprite_global_rect(tree_1_node, oy)},
			{"name": "SoilPlot_1",        "rect": Rect2(p1_rect.position + Vector2(0, oy), p1_rect.size)},
			{"name": "MushroomCottage_1", "rect": _sprite_global_rect(cot_1_node, oy)},
			{"name": "MortarWorkshop_1",  "rect": Rect2(mortar_workshop.get_screen_rect().position + Vector2(0, oy), mortar_workshop.get_screen_rect().size)},
			{"name": "MarketStall_1",     "rect": Rect2(market_stall.get_screen_rect().position + Vector2(0, oy), market_stall.get_screen_rect().size)}
		],
		2: [
			{"name": "LeftHut_2",         "rect": _sprite_global_rect(left_hut_node, oy)},
			{"name": "SoilPlot_2",        "rect": Rect2(p2_rect.position + Vector2(0, oy), p2_rect.size)},
			{"name": "CauldronWorkshop_2","rect": Rect2(cauldron_workshop.get_screen_rect().position + Vector2(0, oy), cauldron_workshop.get_screen_rect().size)}
		],
		3: [
			{"name": "AppleTree_3",       "rect": _sprite_global_rect(tree_3_node, oy)},
			{"name": "SoilPlot_3",        "rect": Rect2(p3_rect.position + Vector2(0, oy), p3_rect.size)},
			{"name": "OrbisWorkshop_3",   "rect": Rect2(orbis_linked_workshop.get_screen_rect().position + Vector2(0, oy), orbis_linked_workshop.get_screen_rect().size)},
			{"name": "RightTiki_3",       "rect": _sprite_global_rect(right_tiki_node, oy)}
		]
	}

func _sprite_global_rect(sp: Sprite2D, oy: float) -> Rect2:
	if sp == null or sp.texture == null:
		return Rect2()
	var w := float(sp.texture.get_width()) * absf(sp.scale.x)
	var h := float(sp.texture.get_height()) * absf(sp.scale.y)
	return Rect2(sp.position.x - w * 0.5, sp.position.y + oy - h, w, h)

func _build_soil_plots() -> void:
	var p1 := SoilPlot.new()
	p1.setup_plot(1, 0, "crop_0", Vector2(710.8, GROUND_Y))
	ysort_layer.add_child(p1)
	soil_plots.append(p1)

	var p2 := SoilPlot.new()
	p2.setup_plot(2, 0, "crop_2", Vector2(272.0, GROUND_Y))
	ysort_layer.add_child(p2)
	soil_plots.append(p2)

	var p3 := SoilPlot.new()
	p3.setup_plot(3, 0, "crop_3", Vector2(1562.4, GROUND_Y))
	ysort_layer.add_child(p3)
	soil_plots.append(p3)

func _spawn_all_roster_slots() -> void:
	var roster_defs := [
		# Island 1 (Henesys): Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(698.0, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 1, Vector2(724.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 0, Vector2(852.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 1, Vector2(868.0, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 1, 0, Vector2(890.0, GROUND_Y)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, 1, 0, Vector2(1036.0, GROUND_Y)],

		# Island 2 (Ellinia): Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 0, Vector2(262.0, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 1, Vector2(282.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 2, 0, Vector2(335.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 2, 0, Vector2(378.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 0, Vector2(426.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 1, Vector2(448.0, GROUND_Y)],

		# Island 3 (Orbis Coast): Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 0, Vector2(1552.0, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 1, Vector2(1572.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 0, Vector2(1608.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 1, Vector2(1624.0, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 3, 0, Vector2(1638.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 3, 0, Vector2(1674.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 0, Vector2(1702.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 1, Vector2(1722.0, GROUND_Y)]
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
		chimney_wisps.append({"x": 796.0, "y": 54.0, "r": 3.5, "alpha": 0.55})
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
	var sp := Vector2(612.4, GROUND_Y)
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
