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
		{"id": "apple_tree_1",   "x": 596.9, "tex_w": 112.0, "tex_h": 120.0, "scale": 0.47},
		{"id": "soil_plot_1",    "x": 683.4, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cottage_1",      "x": 770.7, "tex_w": 118.0, "tex_h": 114.0, "scale": 0.46},
		{"id": "mortar_1",       "x": 849.8, "tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.70},
		{"id": "tea_pavilion_1", "x": 926.9, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.45},
		{"id": "stall_1",        "x": 1013.4,"tex_w": 128.0, "tex_h": 104.0, "scale": 0.52}
	],
	2: [
		{"id": "left_hut_2",   "x": 96.2,  "tex_w": 112.0, "tex_h": 108.0, "scale": 0.52},
		{"id": "soil_plot_2",  "x": 186.0, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cauldron_2",   "x": 275.6, "tex_w": 68.0,  "tex_h": 62.0,  "scale": 0.85},
		{"id": "greenhouse_2", "x": 365.7, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.58},
		{"id": "windmill_2",   "x": 459.4, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.56}
	],
	3: [
		{"id": "apple_tree_3", "x": 1445.5,"tex_w": 112.0, "tex_h": 120.0, "scale": 0.52},
		{"id": "soil_plot_3",  "x": 1535.2,"tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "orbis_work_3", "x": 1624.7,"tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.85},
		{"id": "hotspring_3",  "x": 1714.7,"tex_w": 116.0, "tex_h": 108.0, "scale": 0.56},
		{"id": "right_tiki_3", "x": 1805.9,"tex_w": 116.0, "tex_h": 108.0, "scale": 0.52}
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

var world_root: Node2D = Node2D.new()
var ysort_layer: Node2D = Node2D.new()

var soil_plots: Array[SoilPlot] = []
var mortar_workshop: Workshop
var cauldron_workshop: Workshop
var orbis_linked_workshop: Workshop
var cloud_greenhouse: CloudGreenhouse
var cloud_hotspring_inn: CloudHotspringInn
var cloud_windmill_bakery: CloudWindmillBakery
var cloud_tea_pavilion: CloudTeaPavilion
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
var landscape_nodes: Dictionary = {}

var customer_spawn_timer: float = 4.0
var vip_customer_timer: float = 38.0
var companion_zoom: float = 1.0
var cloud_time: float = 0.0
var chimney_timer: float = 0.0
var chimney_wisps: Array[Dictionary] = []

## v2.6-2: Lotus Pond Swimming Pixel Koi (`x: 1100..1280`) & Eco Micro-Animation
const POND_KOI_MIN_X := 1108.0
const POND_KOI_MAX_X := 1272.0
var pond_koi: Array[Dictionary] = [
	{"x": 1134.0, "y": 106.0, "speed": 13.5, "dir": 1.0, "phase": 0.0, "variant": 0},
	{"x": 1192.0, "y": 112.0, "speed": 11.0, "dir": -1.0, "phase": 2.1, "variant": 1},
	{"x": 1244.0, "y": 108.0, "speed": 12.5, "dir": 1.0, "phase": 4.2, "variant": 0}
]

## CI-1: Drifting Sky Hot-Air Balloon / Wishing Gift Bag (`云端热气球 / 许愿礼袋`)
const SKY_BALLOON_MIN_X := 590.0
const SKY_BALLOON_MAX_X := 1180.0
var tex_delicacies: Texture2D
var tex_sky_balloon: Texture2D
var tex_lantern_garland: Texture2D
var cloud_gift_sprite: Sprite2D
var cloud_gift_label: Label
var cloud_gift_active: bool = false
var cloud_gift_timer: float = 6.0
var cloud_gift_dir: float = 1.0
var cloud_gift_pos: Vector2 = Vector2(1148.0, -4.0)

## CI-4: East Harbor Floating Cargo Airship Caravan (`浮空飞艇远洋商队`)
const AIRSHIP_HARBOR_DOCK_POS := Vector2(1344.0, 24.0)
const AIRSHIP_DEPART_POS := Vector2(1496.0, 10.0)
const AIRSHIP_TARGET_W := 92.0
const AIRSHIP_TARGET_H := 64.0
var tex_airship_caravan: Texture2D
var airship_sprite: Sprite2D
var airship_badge_label: Label
var airship_pos: Vector2 = AIRSHIP_HARBOR_DOCK_POS
var airship_visual_alpha: float = 1.0

## CI-2: Night Cloud Firework & Lantern Festival (`云端花火灯会`) & Special Visitors
var fest_fireworks: Array[Dictionary] = []
var fest_firework_timer: float = 0.0
var special_visitor_timer: float = 24.0
var collector_visitor_timer: float = 20.0
var hotspring_vip_timer: float = 18.0

## CI-7: Cloud-Sea Gourmet Parade Float Festival (`云海美食花车巡游节`)
const PARADE_FLOAT_MIN_X := 660.0
const PARADE_FLOAT_MAX_X := 885.0
var tex_parade_float: Texture2D
var parade_float_sprite: Sprite2D
var parade_float_label: Label
var parade_float_pos: Vector2 = Vector2(730.0, GROUND_Y)
var parade_float_dir: float = 1.0
var parade_tourist_timer: float = 8.0

## CI-8: Lotus Pond Moon-Boat Tea Gathering (`荷塘月色画舫品茗雅集`)
const MOON_TEA_BOAT_MIN_X := 1142.0
const MOON_TEA_BOAT_MAX_X := 1244.0
const MOON_TEA_BOAT_BASE_Y := 108.0
const MOON_TEA_BOAT_SCALE := 0.78
var tex_moon_tea_boat: Texture2D
var moon_tea_boat_sprite: Sprite2D
var moon_tea_boat_label: Label
var moon_tea_boat_pos: Vector2 = Vector2(1192.0, MOON_TEA_BOAT_BASE_Y)
var moon_tea_boat_dir: float = 1.0
var tea_connoisseur_timer: float = 10.0

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
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_sky_balloon = _load_sky_balloon_texture()
	tex_lantern_garland = EconomyConfig.load_pixel_texture("res://assets/pixel_art/ui/fest_lantern_garland.png")
	tex_airship_caravan = EconomyConfig.load_pixel_texture(EconomyConfig.AIRSHIP_CARAVAN_TEX)
	tex_parade_float = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	tex_moon_tea_boat = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)

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
	camera_controller.setup_world(self)

	floating_text = FloatingText.new()
	floating_text.name = "FloatingText"
	world_root.add_child(floating_text)

	cloud_gift_sprite = Sprite2D.new()
	cloud_gift_sprite.name = "CloudGiftSprite"
	cloud_gift_sprite.texture = tex_sky_balloon if tex_sky_balloon != null else tex_delicacies
	cloud_gift_sprite.region_enabled = false
	cloud_gift_sprite.hframes = 1 if tex_sky_balloon != null else 4
	cloud_gift_sprite.vframes = 1
	cloud_gift_sprite.frame = 0 if tex_sky_balloon != null else 3
	cloud_gift_sprite.centered = true
	cloud_gift_sprite.scale = Vector2(0.72, 0.72) if tex_sky_balloon != null else Vector2(0.85, 0.85)
	cloud_gift_sprite.visible = false
	cloud_gift_sprite.z_index = EconomyConfig.Z_CARRY_EMOTE
	cloud_gift_sprite.z_as_relative = false
	world_root.add_child(cloud_gift_sprite)

	cloud_gift_label = EconomyConfig.create_pixel_label("★许愿礼袋", 13, Color("#FFE066"), false)
	cloud_gift_label.custom_minimum_size = Vector2(76.0, 18.0)
	cloud_gift_label.position = Vector2(30.0, -9.0)
	cloud_gift_sprite.add_child(cloud_gift_label)

	airship_sprite = Sprite2D.new()
	airship_sprite.name = "AirshipCaravanSprite"
	airship_sprite.centered = true
	airship_sprite.region_enabled = false
	airship_sprite.hframes = 1
	airship_sprite.vframes = 1
	airship_sprite.frame = 0
	airship_sprite.z_index = EconomyConfig.Z_CARRY_EMOTE
	airship_sprite.z_as_relative = false
	airship_sprite.position = AIRSHIP_HARBOR_DOCK_POS
	world_root.add_child(airship_sprite)
	_apply_airship_texture()

	airship_badge_label = EconomyConfig.create_pixel_label("★远洋商队", 13, Color("#FFE066"), true)
	airship_badge_label.name = "AirshipBadgeLabel"
	airship_badge_label.custom_minimum_size = Vector2(112.0, 18.0)
	airship_badge_label.scale = Vector2(0.82, 0.82)
	airship_badge_label.position = AIRSHIP_HARBOR_DOCK_POS + Vector2(-46.0, 31.0)
	airship_badge_label.z_index = EconomyConfig.Z_FLOATING_UI
	airship_badge_label.z_as_relative = false
	world_root.add_child(airship_badge_label)

	parade_float_sprite = Sprite2D.new()
	parade_float_sprite.name = "GourmetParadeFloatSprite"
	parade_float_sprite.centered = true
	parade_float_sprite.region_enabled = false
	parade_float_sprite.hframes = 1
	parade_float_sprite.vframes = 1
	parade_float_sprite.frame = 0
	parade_float_sprite.position = parade_float_pos
	parade_float_sprite.z_index = EconomyConfig.Z_UNIT
	parade_float_sprite.z_as_relative = false
	parade_float_sprite.visible = false
	ysort_layer.add_child(parade_float_sprite)
	_apply_parade_float_texture()

	parade_float_label = EconomyConfig.create_pixel_label("★美食花车巡游", 13, Color("#FFE066"), true)
	parade_float_label.name = "ParadeFloatBadgeLabel"
	parade_float_label.custom_minimum_size = Vector2(114.0, 18.0)
	parade_float_label.scale = Vector2(0.76, 0.76)
	parade_float_label.position = parade_float_pos + Vector2(-43.0, -64.0)
	parade_float_label.z_index = EconomyConfig.Z_FLOATING_UI
	parade_float_label.z_as_relative = false
	parade_float_label.visible = false
	world_root.add_child(parade_float_label)

	moon_tea_boat_sprite = Sprite2D.new()
	moon_tea_boat_sprite.name = "MoonTeaBoatSprite"
	moon_tea_boat_sprite.centered = true
	moon_tea_boat_sprite.region_enabled = false
	moon_tea_boat_sprite.hframes = 1
	moon_tea_boat_sprite.vframes = 1
	moon_tea_boat_sprite.frame = 0
	moon_tea_boat_sprite.position = moon_tea_boat_pos
	moon_tea_boat_sprite.z_index = EconomyConfig.Z_UNIT
	moon_tea_boat_sprite.z_as_relative = false
	moon_tea_boat_sprite.visible = false
	ysort_layer.add_child(moon_tea_boat_sprite)
	_apply_moon_tea_boat_texture()

	moon_tea_boat_label = EconomyConfig.create_pixel_label("★月色画舫雅集", 13, Color("#FFE066"), true)
	moon_tea_boat_label.name = "MoonTeaBoatBadgeLabel"
	moon_tea_boat_label.custom_minimum_size = Vector2(120.0, 18.0)
	moon_tea_boat_label.scale = Vector2(0.75, 0.75)
	moon_tea_boat_label.position = moon_tea_boat_pos + Vector2(-45.0, -50.0)
	moon_tea_boat_label.z_index = EconomyConfig.Z_FLOATING_UI
	moon_tea_boat_label.z_as_relative = false
	moon_tea_boat_label.visible = false
	world_root.add_child(moon_tea_boat_label)

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
	EventBus.gourmet_parade_started.connect(_on_gourmet_parade_started)
	EventBus.moon_tea_gathering_started.connect(_on_moon_tea_gathering_started)
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
	var z := maxf(0.1, companion_zoom)
	var rx := clampf(world_root.position.x + 40.0 * z, 0.0, 1880.0)
	var ry := clampf(world_root.position.y + 8.0 * z, 0.0, 260.0)
	var rw := clampf(1840.0 * z, 200.0, 1920.0 - rx)
	var rh := clampf(230.0 * z, 100.0, 300.0 - ry)
	return Rect2(rx, ry, rw, rh)

func _build_landmarks_and_buildings() -> void:
	# Island 1 (Henesys): AppleTree (x=596.9), SoilPlot (x=683.4), Cottage (x=770.7), Mortar (x=849.8), TeaPavilion (x=926.9), Stall (x=1013.4)
	# GEMINI.md Law 3.3: `apple_tree.png` & `cottage_mushroom.png` have built-in grass base shadows -> NO procedural shadow!
	tree_1_node = _make_grounded_prop(tex_tree, 596.9, 120, 0.47)
	tree_1_node.name = "AppleTree_1"
	ysort_layer.add_child(tree_1_node)

	cot_1_node = _make_grounded_prop(tex_cottage, 770.7, 114, 0.46)
	cot_1_node.name = "MushroomCottage_1"
	ysort_layer.add_child(cot_1_node)

	# Island 2 (Ellinia): Left Hut (x=96.2), SoilPlot (x=186.0), Cauldron (x=275.6), Cloud Greenhouse (x=365.7), Cloud Windmill Bakery (x=459.4)
	left_hut_node = _make_grounded_prop(tex_left_hut, 96.2, 108, 0.52)
	left_hut_node.name = "LeftHut_2"
	ysort_layer.add_child(left_hut_node)
	island2_props.append(left_hut_node)

	# Island 3 (Orbis Coast): AppleTree (x=1445.5), SoilPlot (x=1535.2), Dual Workshop (x=1624.7), Hot-Spring Inn (x=1714.7), Right Tiki (x=1805.9)
	tree_3_node = _make_grounded_prop(tex_tree, 1445.5, 120, 0.52)
	tree_3_node.name = "AppleTree_3"
	ysort_layer.add_child(tree_3_node)
	island3_props.append(tree_3_node)

	right_tiki_node = _make_grounded_prop(tex_right_tiki, 1805.9, 108, 0.52)
	right_tiki_node.name = "RightTiki_3"
	ysort_layer.add_child(right_tiki_node)
	island3_props.append(right_tiki_node)

	mortar_workshop = Workshop.new()
	mortar_workshop.name = "MortarWorkshop_1"
	mortar_workshop.setup_workshop("mortar", 1, Vector2(849.8, GROUND_Y))
	ysort_layer.add_child(mortar_workshop)

	cloud_tea_pavilion = CloudTeaPavilion.new()
	cloud_tea_pavilion.name = "CloudTeaPavilion_1"
	cloud_tea_pavilion.setup_tea_pavilion(1, Vector2(926.9, GROUND_Y))
	ysort_layer.add_child(cloud_tea_pavilion)

	cauldron_workshop = Workshop.new()
	cauldron_workshop.name = "CauldronWorkshop_2"
	cauldron_workshop.setup_workshop("cauldron", 2, Vector2(275.6, GROUND_Y))
	ysort_layer.add_child(cauldron_workshop)

	cloud_greenhouse = CloudGreenhouse.new()
	cloud_greenhouse.name = "CloudGreenhouse_2"
	cloud_greenhouse.setup_greenhouse(2, Vector2(365.7, GROUND_Y))
	ysort_layer.add_child(cloud_greenhouse)

	cloud_windmill_bakery = CloudWindmillBakery.new()
	cloud_windmill_bakery.name = "CloudWindmillBakery_2"
	cloud_windmill_bakery.setup_windmill_bakery(2, Vector2(459.4, GROUND_Y))
	ysort_layer.add_child(cloud_windmill_bakery)

	orbis_linked_workshop = Workshop.new()
	orbis_linked_workshop.name = "OrbisWorkshop_3"
	orbis_linked_workshop.setup_workshop("orbis_linked", 3, Vector2(1624.7, GROUND_Y))
	ysort_layer.add_child(orbis_linked_workshop)

	cloud_hotspring_inn = CloudHotspringInn.new()
	cloud_hotspring_inn.name = "CloudHotspringInn_3"
	cloud_hotspring_inn.setup_hotspring_inn(3, Vector2(1714.7, GROUND_Y))
	ysort_layer.add_child(cloud_hotspring_inn)

	market_stall = MarketStall.new()
	market_stall.name = "MarketStall_1"
	market_stall.position = Vector2(1013.4, GROUND_Y)
	ysort_layer.add_child(market_stall)

	# Functional Miniature Landscapes (v2.5-2)
	# Island 1: Bee Hive (x=637.3, centered between AppleTree_1 [570.58..623.22] and SoilPlot_1 [651.40..715.40])
	var tex_beehive: Texture2D = load("res://assets/pixel_art/buildings/decor_beehive.png") if ResourceLoader.exists("res://assets/pixel_art/buildings/decor_beehive.png") else tex_tree
	var node_beehive := _make_grounded_prop(tex_beehive, 637.3, 52, 0.50)
	node_beehive.name = "Landscape_BeeHive_1"
	node_beehive.visible = false
	ysort_layer.add_child(node_beehive)
	landscape_nodes["bee_hive"] = node_beehive

	# Island 2: Wind Chime (x=139.6)
	var tex_windchime: Texture2D = load("res://assets/pixel_art/buildings/decor_windchime.png") if ResourceLoader.exists("res://assets/pixel_art/buildings/decor_windchime.png") else tex_left_hut
	var node_windchime := _make_grounded_prop(tex_windchime, 139.6, 58, 0.58)
	node_windchime.name = "Landscape_WindChime_2"
	node_windchime.visible = false
	ysort_layer.add_child(node_windchime)
	island2_props.append(node_windchime)
	landscape_nodes["wind_chime"] = node_windchime

	# Island 3: Tiki Torch (x=1761.5)
	var tex_torch: Texture2D = load("res://assets/pixel_art/buildings/decor_lamp.png")
	var node_torch := _make_grounded_prop(tex_torch, 1761.5, 66, 0.58)
	node_torch.name = "Landscape_TikiTorch_3"
	node_torch.visible = false
	ysort_layer.add_child(node_torch)
	island3_props.append(node_torch)
	landscape_nodes["tiki_torch"] = node_torch

func get_island_main_building_rects() -> Dictionary:
	var oy := world_root.position.y
	var p1_rect := soil_plots[0].get_screen_rect() if soil_plots.size() > 0 else Rect2(683.4 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p2_rect := soil_plots[1].get_screen_rect() if soil_plots.size() > 1 else Rect2(186.0 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p3_rect := soil_plots[2].get_screen_rect() if soil_plots.size() > 2 else Rect2(1535.2 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var tp_rect := cloud_tea_pavilion.get_screen_rect() if cloud_tea_pavilion != null else Rect2(926.9 - 25.20, GROUND_Y - 46.80, 50.40, 46.80)
	var gh_rect := cloud_greenhouse.get_screen_rect() if cloud_greenhouse != null else Rect2(365.7 - 32.48, GROUND_Y - 60.32, 64.96, 60.32)
	var wm_rect := cloud_windmill_bakery.get_screen_rect() if cloud_windmill_bakery != null else Rect2(459.4 - 32.48, GROUND_Y - 60.48, 64.96, 60.48)
	var hs_rect := cloud_hotspring_inn.get_screen_rect() if cloud_hotspring_inn != null else Rect2(1714.7 - 32.48, GROUND_Y - 60.48, 64.96, 60.48)
	return {
		1: [
			{"name": "AppleTree_1",        "rect": _sprite_global_rect(tree_1_node, oy)},
			{"name": "SoilPlot_1",         "rect": Rect2(p1_rect.position + Vector2(0, oy), p1_rect.size)},
			{"name": "MushroomCottage_1",  "rect": _sprite_global_rect(cot_1_node, oy)},
			{"name": "MortarWorkshop_1",   "rect": Rect2(mortar_workshop.get_screen_rect().position + Vector2(0, oy), mortar_workshop.get_screen_rect().size)},
			{"name": "CloudTeaPavilion_1", "rect": Rect2(tp_rect.position + Vector2(0, oy), tp_rect.size)},
			{"name": "MarketStall_1",      "rect": Rect2(market_stall.get_screen_rect().position + Vector2(0, oy), market_stall.get_screen_rect().size)}
		],
		2: [
			{"name": "LeftHut_2",             "rect": _sprite_global_rect(left_hut_node, oy)},
			{"name": "SoilPlot_2",            "rect": Rect2(p2_rect.position + Vector2(0, oy), p2_rect.size)},
			{"name": "CauldronWorkshop_2",    "rect": Rect2(cauldron_workshop.get_screen_rect().position + Vector2(0, oy), cauldron_workshop.get_screen_rect().size)},
			{"name": "CloudGreenhouse_2",     "rect": Rect2(gh_rect.position + Vector2(0, oy), gh_rect.size)},
			{"name": "CloudWindmillBakery_2", "rect": Rect2(wm_rect.position + Vector2(0, oy), wm_rect.size)}
		],
		3: [
			{"name": "AppleTree_3",         "rect": _sprite_global_rect(tree_3_node, oy)},
			{"name": "SoilPlot_3",          "rect": Rect2(p3_rect.position + Vector2(0, oy), p3_rect.size)},
			{"name": "OrbisWorkshop_3",     "rect": Rect2(orbis_linked_workshop.get_screen_rect().position + Vector2(0, oy), orbis_linked_workshop.get_screen_rect().size)},
			{"name": "CloudHotspringInn_3", "rect": Rect2(hs_rect.position + Vector2(0, oy), hs_rect.size)},
			{"name": "RightTiki_3",         "rect": _sprite_global_rect(right_tiki_node, oy)}
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
	p1.setup_plot(1, 0, "crop_0", Vector2(683.4, GROUND_Y))
	ysort_layer.add_child(p1)
	soil_plots.append(p1)

	var p2 := SoilPlot.new()
	p2.setup_plot(2, 0, "crop_2", Vector2(186.0, GROUND_Y))
	ysort_layer.add_child(p2)
	soil_plots.append(p2)

	var p3 := SoilPlot.new()
	p3.setup_plot(3, 0, "crop_3", Vector2(1535.2, GROUND_Y))
	ysort_layer.add_child(p3)
	soil_plots.append(p3)

func _spawn_all_roster_slots() -> void:
	var roster_defs := [
		# Island 1 (Henesys): Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(671.4, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 1, Vector2(695.4, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 0, Vector2(805.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 1, Vector2(819.0, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 1, 0, Vector2(831.8, GROUND_Y)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, 1, 0, Vector2(1036.0, GROUND_Y)],

		# Island 2 (Ellinia): Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 0, Vector2(176.0, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 1, Vector2(196.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 2, 0, Vector2(230.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 2, 0, Vector2(257.6, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 0, Vector2(316.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 1, Vector2(332.0, GROUND_Y)],

		# Island 3 (Orbis Coast): Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 0, Vector2(1525.0, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 1, Vector2(1545.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 0, Vector2(1578.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 1, Vector2(1592.0, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 3, 0, Vector2(1607.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 3, 0, Vector2(1643.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 0, Vector2(1668.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 1, Vector2(1682.0, GROUND_Y)]
	]
	for rd in roster_defs:
		var w := AnimalWorker.new()
		w.setup_worker(rd[0], rd[1], rd[2], rd[3], waypoint_graph, self)
		ysort_layer.add_child(w)
		workers.append(w)

func find_best_plot_for_island(isl_idx: int) -> SoilPlot:
	for p in soil_plots:
		if p.island_idx == isl_idx and p.is_plot_active():
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
			elif event.pressed:
				var local_pos: Vector2 = (event.position - world_root.position) / maxf(0.1, companion_zoom)
				if cloud_gift_active and cloud_gift_sprite != null and get_sky_balloon_local_hit_rect().has_point(local_pos):
					claim_sky_balloon()
					return
				if GameManager != null and GameManager.airship_docked and get_airship_local_hit_rect().has_point(local_pos):
					interact_with_docked_airship()
					return
				if cloud_greenhouse != null and cloud_greenhouse.visible and cloud_greenhouse.get_local_hit_rect().has_point(local_pos):
					interact_with_greenhouse()
					return
				if cloud_tea_pavilion != null and cloud_tea_pavilion.visible and cloud_tea_pavilion.get_local_hit_rect().has_point(local_pos):
					interact_with_tea_pavilion()
					return
				if moon_tea_boat_sprite != null and moon_tea_boat_sprite.visible and get_moon_tea_boat_local_hit_rect().has_point(local_pos):
					interact_with_moon_tea_boat()
					return
				if cloud_windmill_bakery != null and cloud_windmill_bakery.visible and cloud_windmill_bakery.get_local_hit_rect().has_point(local_pos):
					interact_with_windmill_bakery()
					return
				if GameManager != null and GameManager.is_gourmet_parade_active() and get_parade_float_local_hit_rect().has_point(local_pos):
					interact_with_parade_float()
					return
				if cloud_hotspring_inn != null and cloud_hotspring_inn.visible and cloud_hotspring_inn.get_local_hit_rect().has_point(local_pos):
					interact_with_hotspring_inn()
					return
				for w in workers:
					if is_instance_valid(w) and w.visible and w.get_pet_hit_rect().has_point(local_pos):
						w.trigger_pet_boost()
						return

func _load_sky_balloon_texture() -> Texture2D:
	var res_path := "res://assets/pixel_art/ui/sky_balloon_gift.png"
	if ResourceLoader.exists(res_path):
		var loaded := load(res_path) as Texture2D
		if loaded != null:
			return loaded
	var abs_path := ProjectSettings.globalize_path(res_path)
	if FileAccess.file_exists(abs_path):
		var img := Image.load_from_file(abs_path)
		if img != null and not img.is_empty():
			return ImageTexture.create_from_image(img)
	return null

func spawn_sky_balloon_at(x_pos: float = 1160.0) -> void:
	cloud_gift_active = true
	cloud_gift_pos = Vector2(clampf(x_pos, SKY_BALLOON_MIN_X, SKY_BALLOON_MAX_X), -4.0)
	if cloud_gift_sprite != null:
		cloud_gift_sprite.visible = true
		cloud_gift_sprite.position = cloud_gift_pos

func get_sky_balloon_local_hit_rect() -> Rect2:
	if not cloud_gift_active:
		return Rect2()
	return Rect2(cloud_gift_pos.x - 28.0, cloud_gift_pos.y - 26.0, 110.0, 54.0)

func get_sky_balloon_screen_rect() -> Rect2:
	if not cloud_gift_active:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var center := world_root.position + cloud_gift_pos * z
	return Rect2(
		clampf(center.x - 30.0 * z, 0.0, 1900.0),
		clampf(center.y - 26.0 * z, 0.0, 260.0),
		114.0 * z,
		56.0 * z
	)

func claim_sky_balloon() -> Dictionary:
	if not cloud_gift_active:
		return {"claimed": false, "gold": 0, "amber": 0}
	cloud_gift_active = false
	if cloud_gift_sprite != null:
		cloud_gift_sprite.visible = false
	cloud_gift_timer = randf_range(38.0, 62.0)
	var bonus_gold := maxi(65, int(round(GameManager.estimate_idle_gold_per_sec() * 25.0)))
	var bonus_amber := 1
	GameManager.add_gold(bonus_gold)
	GameManager.add_amber(bonus_amber)
	GameManager.trigger_carnival_frenzy(15.0)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.spawn_floating_text.emit(
		Vector2(cloud_gift_pos.x, maxf(18.0, cloud_gift_pos.y + 20.0)),
		"★许愿礼袋+" + str(bonus_gold) + "G +" + str(bonus_amber) + "琥珀 · 狂欢15s!",
		Color("#FFE066")
	)
	return {"claimed": true, "gold": bonus_gold, "amber": bonus_amber}

func _claim_cloud_gift() -> void:
	claim_sky_balloon()

func _apply_airship_texture() -> void:
	if airship_sprite == null:
		return
	if tex_airship_caravan == null:
		tex_airship_caravan = EconomyConfig.load_pixel_texture(EconomyConfig.AIRSHIP_CARAVAN_TEX)
	if tex_airship_caravan != null:
		airship_sprite.texture = tex_airship_caravan
		airship_sprite.hframes = 1
		airship_sprite.vframes = 1
		airship_sprite.frame = 0
		var tw := maxf(1.0, float(tex_airship_caravan.get_width()))
		var th := maxf(1.0, float(tex_airship_caravan.get_height()))
		var sc := minf(AIRSHIP_TARGET_W / tw, AIRSHIP_TARGET_H / th)
		airship_sprite.scale = Vector2(sc, sc)
	elif tex_sky_balloon != null:
		airship_sprite.texture = tex_sky_balloon
		airship_sprite.hframes = 1
		airship_sprite.vframes = 1
		airship_sprite.frame = 0
		airship_sprite.scale = Vector2(0.85, 0.85)

func reload_ci4_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_airship_caravan = EconomyConfig.load_pixel_texture(EconomyConfig.AIRSHIP_CARAVAN_TEX)
	_apply_airship_texture()
	if hud != null and hud.has_method("reload_ci4_textures"):
		hud.reload_ci4_textures()

func reload_ci5_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if cloud_greenhouse != null and cloud_greenhouse.has_method("reload_ci5_textures"):
		cloud_greenhouse.reload_ci5_textures()
	if hud != null and hud.has_method("reload_ci5_textures"):
		hud.reload_ci5_textures()

func get_greenhouse_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)) or cloud_greenhouse == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := cloud_greenhouse.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func interact_with_greenhouse() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.greenhouse_unlocked:
		var ok := GameManager.unlock_greenhouse(false)
		if not ok and hud != null:
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云端温室培育房】需 " + str(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var b_res := GameManager.bundle_souvenir_gift_box("", false)
	if bool(b_res.get("bundled", false)):
		var b_name := EconomyConfig.get_item_display_name(String(b_res.get("box_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudGreenhouse.SLOT_X, GROUND_Y - 64.0),
			"★打包【" + b_name + "】x1 (库存" + str(int(b_res.get("stock", 1))) + ")",
			Color("#FFE066")
		)
		return {"ok": true, "action": "bundle", "box_id": String(b_res.get("box_id", ""))}
	var next_f := GameManager.cycle_greenhouse_flora()
	var f_name := EconomyConfig.get_item_display_name(next_f)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudGreenhouse.SLOT_X, GROUND_Y - 64.0),
		"★温室切换培育【" + f_name + "】",
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_flora", "flora_id": next_f}

func reload_ci6_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if cloud_hotspring_inn != null and cloud_hotspring_inn.has_method("reload_ci6_textures"):
		cloud_hotspring_inn.reload_ci6_textures()
	if hud != null and hud.has_method("reload_ci6_textures"):
		hud.reload_ci6_textures()

func _apply_parade_float_texture() -> void:
	if parade_float_sprite == null:
		return
	if tex_parade_float == null:
		tex_parade_float = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	if tex_parade_float != null:
		parade_float_sprite.texture = tex_parade_float
		parade_float_sprite.centered = true
		parade_float_sprite.region_enabled = false
		parade_float_sprite.hframes = 1
		parade_float_sprite.vframes = 1
		parade_float_sprite.frame = 0
		var tw := maxf(1.0, float(tex_parade_float.get_width()))
		var th := maxf(1.0, float(tex_parade_float.get_height()))
		parade_float_sprite.offset = Vector2(0.0, -th * 0.5)
		var sc := minf(48.6 / tw, 48.6 / th)
		parade_float_sprite.scale = Vector2(sc, sc)

func reload_ci7_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_parade_float = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	_apply_parade_float_texture()
	if cloud_windmill_bakery != null and cloud_windmill_bakery.has_method("reload_ci7_textures"):
		cloud_windmill_bakery.reload_ci7_textures()
	if hud != null and hud.has_method("reload_ci7_textures"):
		hud.reload_ci7_textures()

func get_windmill_bakery_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)) or cloud_windmill_bakery == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := cloud_windmill_bakery.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func get_parade_float_local_hit_rect() -> Rect2:
	if GameManager == null or not GameManager.is_gourmet_parade_active():
		return Rect2()
	return Rect2(parade_float_pos.x - 28.0, GROUND_Y - 54.0, 56.0, 56.0)

func _on_gourmet_parade_started(_duration: float) -> void:
	_apply_parade_float_texture()
	parade_float_pos.y = GROUND_Y
	if parade_float_sprite != null:
		parade_float_sprite.visible = true
		parade_float_sprite.position = parade_float_pos
	if parade_float_label != null:
		parade_float_label.visible = true
		parade_float_label.position = parade_float_pos + Vector2(-43.0, -64.0)
	var has_parade_guest := false
	for c in customers:
		if is_instance_valid(c) and c.visitor_role == CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST:
			has_parade_guest = true
			break
	if not has_parade_guest and customers.size() < 6:
		spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)

func interact_with_parade_float() -> Dictionary:
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var b_res := GameManager.bake_windmill_bread("", true)
	EventBus.spawn_floating_text.emit(
		Vector2(parade_float_pos.x, GROUND_Y - 62.0),
		"★美食花车巡游庆典！鲜烤欧包可颂溢价 1.75x~1.90x 热卖中!",
		Color("#FFE066")
	)
	return {"ok": true, "baked": bool(b_res.get("baked", false))}

func interact_with_windmill_bakery() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.windmill_unlocked:
		var ok := GameManager.unlock_windmill_bakery(false)
		if not ok and hud != null:
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云端风车烘焙面坊】需 " + str(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var bake_res := GameManager.bake_windmill_bread("", true)
	if bool(bake_res.get("baked", false)):
		var b_name := EconomyConfig.get_item_display_name(String(bake_res.get("bread_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
			"★出炉【" + b_name + "】x" + str(int(bake_res.get("qty", 1))) + " (包存" + str(int(bake_res.get("stock", 1))) + ")",
			Color("#FFE066")
		)
		if not GameManager.is_gourmet_parade_active() and GameManager.get_total_bread_stock_count() >= 2:
			GameManager.start_gourmet_parade_festival()
		return {"ok": true, "action": "bake", "bread_id": String(bake_res.get("bread_id", ""))}
	var mill_res := GameManager.mill_golden_wheat_flour(false, false)
	if bool(mill_res.get("milled", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
			"★研磨【金麦云朵面粉】+" + str(int(mill_res.get("qty", 1))) + " (粉存" + str(int(mill_res.get("stock", 1))) + ")",
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "mill"}
	var next_b := GameManager.cycle_windmill_bread()
	var nb_name := EconomyConfig.get_item_display_name(next_b)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
		"★面坊切换烘焙【" + nb_name + "】",
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_bread", "bread_id": next_b}

func _apply_moon_tea_boat_texture() -> void:
	if moon_tea_boat_sprite == null:
		return
	if tex_moon_tea_boat == null:
		tex_moon_tea_boat = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)
	if tex_moon_tea_boat != null:
		moon_tea_boat_sprite.texture = tex_moon_tea_boat
		moon_tea_boat_sprite.centered = true
		moon_tea_boat_sprite.region_enabled = false
		moon_tea_boat_sprite.hframes = 1
		moon_tea_boat_sprite.vframes = 1
		moon_tea_boat_sprite.frame = 0
		# Hull waterline aligned with Lotus Pond turquoise water strip (`y ~ 108..120`)
		moon_tea_boat_sprite.offset = Vector2(0.0, -16.0)
		moon_tea_boat_sprite.scale = Vector2(MOON_TEA_BOAT_SCALE, MOON_TEA_BOAT_SCALE)

func reload_ci8_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_moon_tea_boat = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)
	_apply_moon_tea_boat_texture()
	if cloud_tea_pavilion != null and cloud_tea_pavilion.has_method("reload_ci8_textures"):
		cloud_tea_pavilion.reload_ci8_textures()
	if hud != null and hud.has_method("reload_ci8_textures"):
		hud.reload_ci8_textures()

func get_tea_pavilion_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(1, true)) or cloud_tea_pavilion == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := cloud_tea_pavilion.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func get_moon_tea_boat_local_hit_rect() -> Rect2:
	if moon_tea_boat_sprite == null or not moon_tea_boat_sprite.visible:
		return Rect2()
	return Rect2(moon_tea_boat_pos.x - 28.0, moon_tea_boat_pos.y - 40.0, 56.0, 56.0)

func get_moon_tea_boat_screen_rect() -> Rect2:
	var lr := get_moon_tea_boat_local_hit_rect()
	if lr.size.x <= 0.0 or lr.size.y <= 0.0:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func _on_moon_tea_gathering_started(_duration: float) -> void:
	_apply_moon_tea_boat_texture()
	moon_tea_boat_pos.x = clampf(moon_tea_boat_pos.x, MOON_TEA_BOAT_MIN_X, MOON_TEA_BOAT_MAX_X)
	moon_tea_boat_pos.y = MOON_TEA_BOAT_BASE_Y + sin(cloud_time * 2.2) * 1.5
	if moon_tea_boat_sprite != null:
		moon_tea_boat_sprite.visible = true
		moon_tea_boat_sprite.position = moon_tea_boat_pos
	if moon_tea_boat_label != null:
		moon_tea_boat_label.visible = true
		moon_tea_boat_label.position = moon_tea_boat_pos + Vector2(-45.0, -50.0)
	var has_tea_guest := false
	for c in customers:
		if is_instance_valid(c) and c.visitor_role == CustomerNPC.VisitorRole.TEA_CONNOISSEUR:
			has_tea_guest = true
			break
	if not has_tea_guest and customers.size() < 6:
		spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)

func interact_with_moon_tea_boat() -> Dictionary:
	if GameManager == null:
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var claim_res := GameManager.claim_moon_tea_boat_reward(moon_tea_boat_pos)
	var ok := bool(claim_res.get("claimed", false))
	if ok:
		var has_tea_guest := false
		for c in customers:
			if is_instance_valid(c) and c.visitor_role == CustomerNPC.VisitorRole.TEA_CONNOISSEUR:
				has_tea_guest = true
				break
		if not has_tea_guest and customers.size() < 6:
			spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)
	return {"ok": ok, "reward": claim_res}

func interact_with_tea_pavilion() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(1, true)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.tea_pavilion_unlocked:
		var ok := GameManager.unlock_tea_pavilion(false)
		if not ok and hud != null:
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云端茗香制茶坊】需 " + str(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var brew_res := GameManager.brew_artisan_tea("", true)
	if bool(brew_res.get("brewed", false)):
		var t_name := EconomyConfig.get_item_display_name(String(brew_res.get("tea_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
			"★沏泡【" + t_name + "】x" + str(int(brew_res.get("qty", 1))) + " (茗存" + str(int(brew_res.get("stock", 1))) + ")",
			Color("#88FFD0")
		)
		if not GameManager.is_moon_tea_gathering_active() and GameManager.get_total_brewed_tea_stock_count() >= 2:
			GameManager.start_moon_tea_gathering()
		return {"ok": true, "action": "brew", "tea_id": String(brew_res.get("tea_id", ""))}
	var roast_res := GameManager.roast_tea_spring_leaves(false, false)
	if bool(roast_res.get("roasted", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
			"★杀青【云雾春芽】+" + str(int(roast_res.get("qty", 1))) + " (芽存" + str(int(roast_res.get("stock", 1))) + ")",
			Color("#B2F2BB")
		)
		return {"ok": true, "action": "roast"}
	var next_t := GameManager.cycle_tea_pavilion_recipe()
	var nt_name := EconomyConfig.get_item_display_name(next_t)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
		"★茶坊切换沏制【" + nt_name + "】",
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_tea", "tea_id": next_t}

func get_hotspring_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(3, false)) or cloud_hotspring_inn == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := cloud_hotspring_inn.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func interact_with_hotspring_inn() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(3, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.hotspring_unlocked:
		var ok := GameManager.unlock_hotspring_inn(false)
		if not ok and hud != null:
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云海温泉汤屋】需 " + str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var brew_res := GameManager.brew_hotspring_bath("", false)
	if bool(brew_res.get("brewed", false)):
		var b_name := EconomyConfig.get_item_display_name(String(brew_res.get("bath_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(1714.7, GROUND_Y - 64.0),
			"★熬制【" + b_name + "】x1 (汤存" + str(int(brew_res.get("stock", 1))) + ")",
			Color("#FFE066")
		)
		return {"ok": true, "action": "brew", "bath_id": String(brew_res.get("bath_id", ""))}
	var next_b := GameManager.cycle_hotspring_bath()
	var nb_name := EconomyConfig.get_item_display_name(next_b)
	EventBus.spawn_floating_text.emit(
		Vector2(1714.7, GROUND_Y - 64.0),
		"★汤屋切换药浴【" + nb_name + "】",
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_bath", "bath_id": next_b}

func dock_airship_at_harbor(force_new_order: bool = false) -> Dictionary:
	var ord := GameManager.dock_airship_caravan(force_new_order)
	airship_pos = AIRSHIP_HARBOR_DOCK_POS
	airship_visual_alpha = 1.0
	_apply_airship_texture()
	if airship_sprite != null:
		airship_sprite.visible = true
		airship_sprite.position = airship_pos
		airship_sprite.modulate.a = 1.0
	if airship_badge_label != null:
		airship_badge_label.visible = true
		airship_badge_label.position = airship_pos + Vector2(-46.0, 31.0)
	return ord

func get_airship_local_hit_rect() -> Rect2:
	if GameManager == null or not GameManager.airship_docked:
		return Rect2()
	return Rect2(airship_pos.x - 50.0, airship_pos.y - 34.0, 100.0, 80.0)

func get_airship_screen_rect() -> Rect2:
	if GameManager == null or not GameManager.airship_docked:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var center := world_root.position + airship_pos * z
	return Rect2(
		clampf(center.x - 52.0 * z, 0.0, 1900.0),
		clampf(center.y - 34.0 * z, 0.0, 260.0),
		104.0 * z,
		82.0 * z
	)

func interact_with_docked_airship() -> Dictionary:
	if GameManager == null or not GameManager.airship_docked:
		return {"loaded": 0, "completed": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var res := GameManager.fulfill_airship_bulk_order_from_stock()
	var loaded_cnt := int(res.get("loaded", 0))
	var done_ok := bool(res.get("completed", false))
	if not done_ok:
		var sum := GameManager.get_airship_order_progress_summary()
		if loaded_cnt > 0:
			EventBus.spawn_floating_text.emit(
				Vector2(airship_pos.x, airship_pos.y + 18.0),
				"★远洋装船 +" + str(loaded_cnt) + "件 (" + str(sum["delivered"]) + "/" + str(sum["required"]) + ")",
				Color("#8CE99A")
			)
		elif hud != null:
			hud.offline_banner_timer = 4.0
			hud.offline_banner_text = "★远洋飞艇大订单需求: " + String(sum["brief"]) + " · 集齐奖励 +" + str(sum["reward_amber"]) + "琥珀 +" + str(sum["reward_vouchers"]) + "稀有图鉴券!"
			hud._sync_label_nodes()
	return res

func _apply_companion_zoom() -> void:
	if camera_controller != null:
		camera_controller.target_zoom = clampf(companion_zoom, CameraController.MIN_ZOOM, CameraController.MAX_ZOOM)
	world_root.scale = Vector2(companion_zoom, companion_zoom)
	queue_redraw()

func _sync_landscape_nodes() -> void:
	if GameManager == null:
		return
	if landscape_nodes.has("bee_hive") and is_instance_valid(landscape_nodes["bee_hive"]):
		landscape_nodes["bee_hive"].visible = GameManager.is_landscape_unlocked("bee_hive")
	if landscape_nodes.has("wind_chime") and is_instance_valid(landscape_nodes["wind_chime"]):
		var isl2_open: bool = bool(GameManager.unlocked_islands.get(2, false))
		landscape_nodes["wind_chime"].visible = isl2_open and GameManager.is_landscape_unlocked("wind_chime")
	if landscape_nodes.has("tiki_torch") and is_instance_valid(landscape_nodes["tiki_torch"]):
		var isl3_open: bool = bool(GameManager.unlocked_islands.get(3, false))
		landscape_nodes["tiki_torch"].visible = isl3_open and GameManager.is_landscape_unlocked("tiki_torch")

func _process(delta: float) -> void:
	cloud_time += delta
	_sync_landscape_nodes()

	# v2.3 Direction 1: Weather & Time-of-Day ambient lighting interpolation
	var target_tint := Color.WHITE
	if GameManager != null:
		match GameManager.current_weather:
			1:
				target_tint = Color(1.0, 0.94, 0.86, 1.0)
			2:
				target_tint = Color(0.88, 0.92, 1.0, 1.0)
			3:
				target_tint = Color(0.92, 0.96, 1.0, 1.0)
	var win_op: float = WindowController.get_window_opacity() if WindowController != null else 1.0
	var target_alpha := 0.0 if (WindowController != null and WindowController.boss_stealth_active) else win_op
	target_tint.a = target_alpha
	world_root.modulate = world_root.modulate.lerp(target_tint, minf(1.0, delta * 3.5))
	world_root.modulate.a = target_alpha

	# CI-1: Drifting Sky Hot-Air Balloon / Wishing Gift Bag (`x: 590..1320`, `screen y ~ 32`)
	if cloud_gift_active:
		cloud_gift_pos.x += cloud_gift_dir * 26.0 * delta
		if cloud_gift_pos.x >= SKY_BALLOON_MAX_X:
			cloud_gift_pos.x = SKY_BALLOON_MAX_X
			cloud_gift_dir = -1.0
		elif cloud_gift_pos.x <= SKY_BALLOON_MIN_X:
			cloud_gift_pos.x = SKY_BALLOON_MIN_X
			cloud_gift_dir = 1.0
		cloud_gift_pos.y = -4.0 + sin(cloud_time * 2.2) * 3.2
		if cloud_gift_sprite != null:
			cloud_gift_sprite.visible = true
			cloud_gift_sprite.position = cloud_gift_pos
	else:
		cloud_gift_timer -= delta
		if cloud_gift_timer <= 0.0:
			spawn_sky_balloon_at(SKY_BALLOON_MIN_X + 40.0)
			cloud_gift_dir = 1.0

	# CI-4: East Harbor Floating Cargo Airship docking & departure animation
	if GameManager != null:
		if tex_airship_caravan == null:
			_apply_airship_texture()
		if GameManager.airship_docked:
			var target_dock := Vector2(AIRSHIP_HARBOR_DOCK_POS.x, AIRSHIP_HARBOR_DOCK_POS.y + sin(cloud_time * 1.8) * 2.4)
			airship_pos = airship_pos.lerp(target_dock, minf(1.0, delta * 4.5))
			airship_visual_alpha = lerpf(airship_visual_alpha, 1.0, minf(1.0, delta * 5.0))
		else:
			airship_pos = airship_pos.lerp(AIRSHIP_DEPART_POS, minf(1.0, delta * 2.5))
			airship_visual_alpha = lerpf(airship_visual_alpha, 0.0, minf(1.0, delta * 3.5))
		if airship_sprite != null:
			airship_sprite.visible = airship_visual_alpha > 0.04
			airship_sprite.position = airship_pos
			airship_sprite.modulate.a = airship_visual_alpha
		if airship_badge_label != null:
			airship_badge_label.visible = GameManager.airship_docked and airship_visual_alpha > 0.45
			if airship_badge_label.visible:
				var asum := GameManager.get_airship_order_progress_summary()
				airship_badge_label.text = "★商队%d/%d(+%d珀+%d券)" % [
					int(asum["delivered"]),
					int(asum["required"]),
					int(asum["reward_amber"]),
					int(asum["reward_vouchers"])
				]
				airship_badge_label.position = airship_pos + Vector2(-46.0, 31.0)

	var isl2_on := bool(GameManager.unlocked_islands.get(2, false))
	var isl3_on := bool(GameManager.unlocked_islands.get(3, false))
	for n in island2_props:
		n.visible = isl2_on
	for n in island3_props:
		n.visible = isl3_on

	# v2.6-2: Update lotus pond koi strictly within [POND_KOI_MIN_X, POND_KOI_MAX_X] (`1100..1280`)
	for k in pond_koi:
		var kx := float(k["x"]) + float(k["speed"]) * float(k["dir"]) * delta
		if kx >= POND_KOI_MAX_X:
			kx = POND_KOI_MAX_X
			k["dir"] = -1.0
		elif kx <= POND_KOI_MIN_X:
			kx = POND_KOI_MIN_X
			k["dir"] = 1.0
		k["x"] = clampf(kx, POND_KOI_MIN_X, POND_KOI_MAX_X)
		k["phase"] = float(k["phase"]) + delta * 5.0

	chimney_timer += delta
	if chimney_timer >= 1.4:
		chimney_timer = 0.0
		chimney_wisps.append({"x": 762.0, "y": 68.0, "r": 3.2, "alpha": 0.55})
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

	var fest_active := GameManager != null and GameManager.is_lantern_festival_active()
	var parade_active := GameManager != null and GameManager.is_gourmet_parade_active()
	var moon_tea_active := GameManager != null and GameManager.is_moon_tea_gathering_active()
	var boat_visible := GameManager != null and (moon_tea_active or GameManager.tea_pavilion_unlocked)
	var max_cust_cap := (6 if (parade_active or moon_tea_active) else 4) if isl3_on else (5 if (parade_active or moon_tea_active) else 3)
	var spawn_rate_mult := 1.85 if (fest_active or parade_active or moon_tea_active) else 1.0

	if boat_visible:
		if tex_moon_tea_boat == null:
			_apply_moon_tea_boat_texture()
		var boat_spd := 15.0 if moon_tea_active else 8.0
		moon_tea_boat_pos.x += moon_tea_boat_dir * boat_spd * delta
		if moon_tea_boat_pos.x >= MOON_TEA_BOAT_MAX_X:
			moon_tea_boat_pos.x = MOON_TEA_BOAT_MAX_X
			moon_tea_boat_dir = -1.0
		elif moon_tea_boat_pos.x <= MOON_TEA_BOAT_MIN_X:
			moon_tea_boat_pos.x = MOON_TEA_BOAT_MIN_X
			moon_tea_boat_dir = 1.0
		moon_tea_boat_pos.y = MOON_TEA_BOAT_BASE_Y + sin(cloud_time * 2.2) * 1.5
		if moon_tea_boat_sprite != null:
			moon_tea_boat_sprite.visible = true
			moon_tea_boat_sprite.position = moon_tea_boat_pos
			moon_tea_boat_sprite.flip_h = moon_tea_boat_dir < 0.0
		if moon_tea_boat_label != null:
			moon_tea_boat_label.visible = true
			if moon_tea_active:
				moon_tea_boat_label.text = "★月色画舫雅集(%ds)" % maxi(1, int(ceili(GameManager.moon_tea_gathering_timer)))
				if moon_tea_boat_label.label_settings != null:
					moon_tea_boat_label.label_settings.font_color = Color("#FFE066")
			else:
				moon_tea_boat_label.text = "★月色画舫雅集"
				if moon_tea_boat_label.label_settings != null:
					moon_tea_boat_label.label_settings.font_color = Color("#88FFD0")
			moon_tea_boat_label.position = moon_tea_boat_pos + Vector2(-45.0, -50.0)
	else:
		if moon_tea_boat_sprite != null:
			moon_tea_boat_sprite.visible = false
		if moon_tea_boat_label != null:
			moon_tea_boat_label.visible = false

	if parade_active:
		if tex_parade_float == null:
			_apply_parade_float_texture()
		parade_float_pos.x += parade_float_dir * 24.0 * delta
		if parade_float_pos.x >= PARADE_FLOAT_MAX_X:
			parade_float_pos.x = PARADE_FLOAT_MAX_X
			parade_float_dir = -1.0
		elif parade_float_pos.x <= PARADE_FLOAT_MIN_X:
			parade_float_pos.x = PARADE_FLOAT_MIN_X
			parade_float_dir = 1.0
		parade_float_pos.y = GROUND_Y
		if parade_float_sprite != null:
			parade_float_sprite.visible = true
			parade_float_sprite.position = parade_float_pos
			parade_float_sprite.flip_h = parade_float_dir < 0.0
		if parade_float_label != null:
			parade_float_label.visible = true
			parade_float_label.text = "★美食花车巡游(%ds)" % maxi(1, int(ceili(GameManager.parade_festival_timer)))
			parade_float_label.position = parade_float_pos + Vector2(-43.0, -64.0)
	else:
		if parade_float_sprite != null:
			parade_float_sprite.visible = false
		if parade_float_label != null:
			parade_float_label.visible = false

	if fest_active:
		fest_firework_timer -= delta
		if fest_firework_timer <= 0.0:
			fest_firework_timer = randf_range(1.1, 2.2)
			spawn_festival_firework_burst(
				randf_range(680.0, 1230.0),
				randf_range(22.0, 62.0)
			)
	for fi in range(fest_fireworks.size() - 1, -1, -1):
		var fw: Dictionary = fest_fireworks[fi]
		fw["age"] = float(fw["age"]) + delta
		if float(fw["age"]) >= float(fw["life"]):
			fest_fireworks.remove_at(fi)

	customer_spawn_timer -= delta * spawn_rate_mult
	if customer_spawn_timer <= 0.0:
		customer_spawn_timer = randf_range(18.0, 30.0)
		if customers.size() < max_cust_cap:
			var roll_vip := randf() < GameManager.get_weather_vip_chance()
			_spawn_customer(roll_vip)

	special_visitor_timer -= delta * (1.55 if fest_active else 1.0)
	if special_visitor_timer <= 0.0:
		special_visitor_timer = randf_range(28.0, 44.0)
		if customers.size() < max_cust_cap:
			if GameManager.has_surplus_crops_for_merchant() and randf() < 0.52:
				spawn_special_visitor(CustomerNPC.VisitorRole.CARAVAN_MERCHANT)
			else:
				spawn_special_visitor(CustomerNPC.VisitorRole.GOURMET_CRITIC)

	if isl3_on:
		vip_customer_timer -= delta * (1.35 if fest_active else 1.0)
		if vip_customer_timer <= 0.0:
			vip_customer_timer = randf_range(35.0, 50.0)
			if customers.size() < max_cust_cap:
				_spawn_customer(true)

	collector_visitor_timer -= delta * (1.45 if fest_active else 1.0)
	if collector_visitor_timer <= 0.0:
		collector_visitor_timer = randf_range(22.0, 34.0)
		if customers.size() < max_cust_cap and GameManager != null and GameManager.has_souvenir_box_for_collector():
			spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)

	if isl3_on:
		hotspring_vip_timer -= delta * (1.45 if fest_active else 1.0)
		if hotspring_vip_timer <= 0.0:
			hotspring_vip_timer = randf_range(20.0, 32.0)
			if customers.size() < max_cust_cap and GameManager != null and GameManager.has_bath_for_vip_guest():
				spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)

	if isl2_on and GameManager != null and GameManager.windmill_unlocked:
		parade_tourist_timer -= delta * (2.25 if parade_active else 0.75)
		if parade_tourist_timer <= 0.0:
			parade_tourist_timer = randf_range(12.0, 20.0) if parade_active else randf_range(24.0, 36.0)
			if customers.size() < max_cust_cap and GameManager.has_bread_for_parade_tourist():
				spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)

	if GameManager != null and GameManager.tea_pavilion_unlocked:
		tea_connoisseur_timer -= delta * (2.30 if moon_tea_active else 0.80)
		if tea_connoisseur_timer <= 0.0:
			tea_connoisseur_timer = randf_range(12.0, 20.0) if moon_tea_active else randf_range(24.0, 36.0)
			if customers.size() < max_cust_cap and GameManager.has_tea_for_connoisseur():
				spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)

	if WindowController != null and hud != null:
		var active_drawer_rect: Rect2 = hud.get_active_drawer_rect() if hud.drawer_expanded else Rect2()
		WindowController.update_passthrough_polygon(
			get_active_island_bounds(),
			hud.get_hud_Hit_rect(),
			active_drawer_rect,
			get_sky_balloon_screen_rect(),
			get_airship_screen_rect(),
			get_greenhouse_screen_rect(),
			get_hotspring_screen_rect(),
			get_windmill_bakery_screen_rect(),
			get_tea_pavilion_screen_rect(),
			get_moon_tea_boat_screen_rect()
		)

	queue_redraw()

func _spawn_customer(as_vip: bool) -> CustomerNPC:
	var role := CustomerNPC.VisitorRole.VIP if as_vip else CustomerNPC.VisitorRole.REGULAR
	return spawn_special_visitor(role)

func spawn_special_visitor(role: int) -> CustomerNPC:
	var c := CustomerNPC.new()
	var sp := Vector2(1075.0, GROUND_Y)
	if bool(GameManager.unlocked_islands.get(3, false)):
		sp = waypoint_graph.get_named_pos("spawn_right")
	c.setup_customer(sp, waypoint_graph, market_stall, role == CustomerNPC.VisitorRole.VIP, role)
	ysort_layer.add_child(c)
	customers.append(c)
	return c

func spawn_festival_firework_burst(cx: float = 960.0, cy: float = 38.0) -> void:
	var palette: Array[Color] = [
		Color("#FFE066"),
		Color("#FF922B"),
		Color("#FFA8A8"),
		Color("#8CE99A")
	]
	fest_fireworks.append({
		"x": cx,
		"y": cy,
		"age": 0.0,
		"life": 1.35,
		"radius": randf_range(16.0, 26.0),
		"color": palette[randi() % palette.size()]
	})

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
	# v2.6-2: Draw swimming orange-white pixel koi & dynamic wake ripples inside Lotus Pond (`x: 1100..1280`)
	for k in pond_koi:
		var kx := roundf(float(k["x"]))
		var ky := roundf(oy + float(k["y"]) + sin(float(k["phase"]) * 0.5) * 1.5)
		var kdir := float(k["dir"])
		var tail_wag := roundf(sin(float(k["phase"])) * 1.0)
		var wake_r := 3.5 + fmod(float(k["phase"]) * 0.9, 3.5)
		draw_arc(Vector2(kx - kdir * 4.0, ky + 1.0), wake_r, 0.0, PI * 2.0, 12, Color(0.88, 0.99, 1.0, ripple_alpha * 0.65), 1.0)
		var c_orange := Color("#FF6B2B") if int(k["variant"]) == 0 else Color("#FF8533")
		var c_white := Color("#FFF8EE")
		draw_rect(Rect2(kx - 4.0, ky - 2.0, 8.0, 4.0), c_orange, true)
		draw_rect(Rect2(kx + (1.0 if kdir > 0.0 else -4.0), ky - 2.0, 3.0, 3.0), c_white, true)
		draw_rect(Rect2(kx - kdir * 6.0, ky - 1.0 + tail_wag, 3.0, 3.0), c_orange, true)
	for px in [1096.0, 1188.0, 1284.0]:
		var ring_r := 6.0 + fmod(cloud_time * 4.5 + px * 0.1, 5.0) + pond_sag * 1.5
		draw_arc(Vector2(px, oy + 146.0), ring_r, 0.0, PI * 2.0, 16, Color(0.88, 0.99, 1.0, ripple_alpha * 0.85), 1.0)
		draw_rect(Rect2(px - 3.0, oy + 134.0 + roundf(pond_sag), 6.0, 13.0), Color(0.36, 0.21, 0.11, 0.95), true)
	if tex_bridge != null:
		draw_texture_rect(tex_bridge, Rect2(1082.0, oy + 118.0 + roundf(pond_sag), 114.0, 38.0), false)
		draw_texture_rect(tex_bridge, Rect2(1188.0, oy + 118.0 + roundf(pond_sag), 114.0, 38.0), false)

	for wisp in chimney_wisps:
		draw_circle(Vector2(float(wisp["x"]), float(wisp["y"])), float(wisp["r"]), Color(0.98, 0.96, 0.92, float(wisp["alpha"])))

	# CI-4: East Harbor wooden mooring bollard (grounded at oy + GROUND_Y) & warm mooring line when airship is docked
	if GameManager != null and GameManager.airship_docked and airship_visual_alpha > 0.35:
		draw_rect(Rect2(1338.0, oy + 110.0, 6.0, 14.0), Color("#5C3A21"), true)
		draw_rect(Rect2(1337.0, oy + 108.0, 8.0, 3.0), Color("#FFD43B"), true)
		draw_line(
			Vector2(1341.0, oy + 108.0),
			Vector2(airship_pos.x - 4.0, oy + airship_pos.y + 22.0),
			Color(0.92, 0.80, 0.52, 0.68 * airship_visual_alpha),
			1.5
		)

	# v2.3 Direction 1 + CI-2: Dusk/Night lotus pond pixel fireflies; Night Lantern Festival garlands & pixel fireworks
	if GameManager != null and not (WindowController != null and WindowController.boss_stealth_active):
		var w_state := GameManager.current_weather
		if w_state == 1 or w_state == 2:
			for fi in range(6):
				var fx := 1104.0 + float(fi) * 34.0 + sin(cloud_time * 1.8 + float(fi) * 1.3) * 8.0
				var fy := oy + 126.0 + cos(cloud_time * 2.3 + float(fi) * 0.9) * 6.0
				var fa := 0.55 + 0.40 * sin(cloud_time * 4.0 + float(fi))
				draw_rect(Rect2(fx, fy, 3.0, 3.0), Color(1.0, 0.94, 0.42, fa), true)
		elif w_state == 3:
			for ri in range(14):
				var rx := fmod(580.0 + float(ri) * 52.0 + cloud_time * 95.0, 720.0) + 580.0
				var ry := oy + fmod(float(ri) * 23.0 + cloud_time * 160.0, 75.0) + 72.0
				draw_line(Vector2(rx, ry), Vector2(rx - 3.0, ry + 8.0), Color(0.78, 0.92, 1.0, 0.42), 1.0)

		if GameManager.is_lantern_festival_active():
			if tex_lantern_garland != null:
				var sway := roundf(sin(cloud_time * 2.1) * 1.5)
				for gx in [634.0, 834.0, 966.0, 1112.0]:
					draw_texture_rect(tex_lantern_garland, Rect2(gx, oy + 18.0 + sway, 84.0, 33.0), false)
			for fw in fest_fireworks:
				var prog := clampf(float(fw["age"]) / maxf(0.1, float(fw["life"])), 0.0, 1.0)
				var fcx := float(fw["x"])
				var fcy := oy + float(fw["y"])
				var max_r := float(fw["radius"])
				var cur_r := max_r * (1.0 - pow(1.0 - prog, 2.0))
				var fcol: Color = fw["color"]
				var falpha := clampf(1.15 - prog * 1.15, 0.0, 1.0)
				for ray in range(8):
					var ang := float(ray) * PI * 0.25 + prog * 0.25
					var sx := roundf(fcx + cos(ang) * cur_r)
					var sy := roundf(fcy + sin(ang) * cur_r + prog * prog * 6.0)
					draw_rect(Rect2(sx - 1.5, sy - 1.5, 3.0, 3.0), Color(fcol.r, fcol.g, fcol.b, falpha), true)
					var tx := roundf(fcx + cos(ang) * cur_r * 0.58)
					var ty := roundf(fcy + sin(ang) * cur_r * 0.58 + prog * prog * 3.0)
					draw_rect(Rect2(tx - 1.0, ty - 1.0, 2.0, 2.0), Color(1.0, 0.96, 0.78, falpha * 0.75), true)

		if GameManager.is_gourmet_parade_active() and parade_float_sprite != null and parade_float_sprite.visible:
			EconomyConfig.draw_drop_shadow(self, 46.0, Vector2(parade_float_pos.x, oy + GROUND_Y))
			var conf_cols: Array[Color] = [Color("#FFE066"), Color("#FF922B"), Color("#FFA8A8"), Color("#8CE99A")]
			for ci in range(8):
				var cx := parade_float_pos.x - 28.0 + float(ci) * 8.0 + sin(cloud_time * 3.1 + float(ci) * 1.1) * 4.0
				var cy := oy + GROUND_Y - 52.0 + fmod(cloud_time * 16.0 + float(ci) * 6.5, 24.0)
				var cc := conf_cols[ci % conf_cols.size()]
				draw_rect(Rect2(roundf(cx), roundf(cy), 2.5, 2.5), Color(cc.r, cc.g, cc.b, 0.82), true)

		if moon_tea_boat_sprite != null and moon_tea_boat_sprite.visible:
			# Moonlit turquoise water ripples & floating lotus lantern reflections beneath the Moon Tea Boat
			var r_pulse := 0.55 + 0.30 * sin(cloud_time * 3.0)
			var water_y := oy + moon_tea_boat_pos.y + 11.5
			draw_rect(Rect2(roundf(moon_tea_boat_pos.x - 22.0), roundf(water_y), 44.0, 2.0), Color(0.62, 0.98, 0.90, 0.42 * r_pulse), true)
			draw_rect(Rect2(roundf(moon_tea_boat_pos.x - 14.0), roundf(water_y + 3.0), 28.0, 1.5), Color(1.0, 0.92, 0.55, 0.48 * r_pulse), true)
			if GameManager != null and GameManager.is_moon_tea_gathering_active():
				for mi in range(5):
					var mx := moon_tea_boat_pos.x - 22.0 + float(mi) * 11.0 + sin(cloud_time * 2.4 + float(mi) * 1.3) * 3.0
					var my := oy + moon_tea_boat_pos.y - 30.0 - fmod(cloud_time * 9.0 + float(mi) * 4.5, 16.0)
					draw_rect(Rect2(roundf(mx), roundf(my), 2.0, 2.0), Color(1.0, 0.93, 0.62, 0.72), true)

	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func get_pond_koi_positions() -> Array[Vector2]:
	var out: Array[Vector2] = []
	for k in pond_koi:
		out.append(Vector2(float(k["x"]), float(k["y"])))
	return out
