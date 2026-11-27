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
	## CI-11: Island 1 re-slotted to 7 buildings inside solid grass `[566.0..1046.7]` (Bridge 1 east landing -> customer
	## walkway edge), every adjacent clear gap = 28.05..28.18px (>= 28px), 0.0% overlap, `DairyWorkshop_1` in slot 4 next to
	## the meadow farmhouse. Scales: tree/cottage/tea 0.355, dairy 0.38, mortar 0.53, stall 0.375 (Island 3 runs 0.37..0.45).
	1: [
		{"id": "apple_tree_1",     "x": 585.9,  "tex_w": 112.0, "tex_h": 120.0, "scale": 0.355},
		{"id": "soil_plot_1",      "x": 665.9,  "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cottage_1",        "x": 746.9,  "tex_w": 118.0, "tex_h": 114.0, "scale": 0.355},
		{"id": "dairy_workshop_1", "x": 817.3,  "tex_w": 112.0, "tex_h": 104.0, "scale": 0.38},
		{"id": "mortar_1",         "x": 884.7,  "tex_w": 68.0,  "tex_h": 58.0,  "scale": 0.53},
		{"id": "tea_pavilion_1",   "x": 950.7,  "tex_w": 112.0, "tex_h": 104.0, "scale": 0.355},
		{"id": "stall_1",          "x": 1022.7, "tex_w": 128.0, "tex_h": 104.0, "scale": 0.375}
	],
	## CI-9: Island 2 re-slotted to 6 buildings inside solid moss `[67.0..492.0]` (Bridge 1 west endpoint),
	## every adjacent clear gap = 28.08..28.18px (>= 28px), 0.0% overlap, `ChefTastingPavilion_2` in the rightmost slot.
	2: [
		{"id": "left_hut_2",      "x": 89.1,  "tex_w": 112.0, "tex_h": 108.0, "scale": 0.395},
		{"id": "soil_plot_2",     "x": 171.4, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "cauldron_2",      "x": 253.6, "tex_w": 68.0,  "tex_h": 62.0,  "scale": 0.65},
		{"id": "greenhouse_2",    "x": 325.9, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.395},
		{"id": "windmill_2",      "x": 397.9, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.375},
		{"id": "chef_pavilion_2", "x": 469.9, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.395}
	],
	## CI-10: Island 3 re-slotted to 6 buildings inside the sand shelf `[1416.0..1836.0]` (Bridge 2 east landing -> east cape),
	## every adjacent clear gap = 28.04..28.10px (>= 28px), 0.0% overlap, `LighthouseHarbor_3` in slot 5 facing the east fishing cove.
	## (`coral_work_3` width = union of its mortar + cauldron sprites, see `Workshop.CORAL_VISUAL_WIDTH`.)
	## CI-12: slot 1 (Bridge 2 landing) now holds `PotteryKiln_3` instead of the decorative duplicate apple tree: same 112px
	## texture width at the same 0.39 scale (43.68px), so the kiln|soil gap stays 28.06px with zero re-layout. A 4th islet was
	## rejected because the fixed 1920x300 strip only has 64px of sky beyond Island 2 / Island 3 (it would sit off-screen).
	3: [
		{"id": "pottery_kiln_3", "x": 1437.8, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.39},
		{"id": "soil_plot_3",    "x": 1519.7, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "coral_work_3",   "x": 1601.3, "tex_w": 43.0,  "tex_h": 30.3,  "scale": 1.00},
		{"id": "hotspring_3",    "x": 1672.3, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.37},
		{"id": "lighthouse_3",   "x": 1743.4, "tex_w": 96.0,  "tex_h": 128.0, "scale": 0.45},
		{"id": "right_tiki_3",   "x": 1814.5, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.37}
	]
}

var tex_meadow: Texture2D
var tex_glowwood: Texture2D
var tex_coral: Texture2D
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
var coral_linked_workshop: Workshop
var cloud_greenhouse: CloudGreenhouse
var cloud_hotspring_inn: CloudHotspringInn
var cloud_windmill_bakery: CloudWindmillBakery
var cloud_tea_pavilion: CloudTeaPavilion
var chef_tasting_pavilion: ChefTastingPavilion
var lighthouse_harbor: LighthouseHarbor
var dairy_workshop: DairyWorkshop
var open_air_cinema: OpenAirCinema
var market_stall: MarketStall
var workers: Array[AnimalWorker] = []
var customers: Array[CustomerNPC] = []

var pottery_kiln: PotteryKiln
var island2_props: Array[Node2D] = []
var island3_props: Array[Node2D] = []
var tree_1_node: Sprite2D
var cot_1_node: Sprite2D
var left_hut_node: Sprite2D
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
var cloud_gift_sprite: Sprite2D
var cloud_gift_active: bool = false
var cloud_gift_timer: float:
	get: return GameManager.balloon_timer
	set(v): GameManager.balloon_timer = v
var cloud_gift_dir: float = 1.0
var cloud_gift_pos: Vector2 = Vector2(1148.0, -4.0)

## CI-4: East Harbor Floating Cargo Airship Caravan (`浮空飞艇远洋商队`)
const AIRSHIP_HARBOR_DOCK_POS := Vector2(1344.0, 24.0)
const AIRSHIP_DEPART_POS := Vector2(1496.0, 10.0)
const AIRSHIP_TARGET_W := 92.0
const AIRSHIP_TARGET_H := 64.0
var tex_airship_caravan: Texture2D
var airship_sprite: Sprite2D
var airship_pos: Vector2 = AIRSHIP_HARBOR_DOCK_POS
var airship_visual_alpha: float = 1.0

var special_visitor_timer: float = 24.0
var collector_visitor_timer: float = 20.0
var hotspring_vip_timer: float = 18.0

## CI-7: Cloud-Sea Gourmet Parade Float Festival (`云海美食花车巡游节`)
const PARADE_FLOAT_MIN_X := 660.0
const PARADE_FLOAT_MAX_X := 885.0
var tex_parade_float: Texture2D
var parade_float_sprite: Sprite2D
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
var moon_tea_boat_pos: Vector2 = Vector2(1192.0, MOON_TEA_BOAT_BASE_Y)
var moon_tea_boat_dir: float = 1.0
var tea_connoisseur_timer: float = 10.0

## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) on Lotus Pond & Island 3 coast shallows
const WISH_LANTERN_SCALE := 0.30
const WISH_LANTERN_TEX_SIZE := 64.0
const WISH_LANTERN_RESPAWN_SEC := 5.5
const ISLAND_1_TEX_ORIGIN := Vector2(560.0, 70.0)
const ISLAND_3_TEX_ORIGIN := Vector2(1396.0, 74.0)
const POND_BRIDGE_LOCAL_RECT := Rect2(1082.0, 118.0, 220.0, 38.0)
var tex_star_lantern: Texture2D
var wish_lanterns: Array[Dictionary] = []
var _island_water_images: Dictionary = {}

## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`) fishing boats on the Island 3 east cove
var tex_fishing_boat: Texture2D
var harbor_boats: Array[Dictionary] = []

## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) in the open sky lanes above Island 2 / Island 3 + seasonal dress-up props
## (`岛屿四季装扮`) in free 28px ground gaps with a per-season atmosphere tint. No new building, nothing shrunk or moved.
const ISLAND_2_TEX_ORIGIN := Vector2(64.0, 74.0)
var tex_kites: Dictionary = {}
var tex_kite_festival_icon: Texture2D
var tex_season_decos: Dictionary = {}
var kite_sprites: Array[Sprite2D] = []
var kite_fx_layer: Node2D
var season_deco_nodes: Array[Sprite2D] = []
var season_dress_id: String = ""
var season_tint: Color = Color.WHITE
var _season_deco_used_rects: Dictionary = {}

## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`): sky layer only. One emblem per free-sky pocket (Sprite2D, cropped to the
## art's solid used-rect) + rays / rain / rainbow / mist primitives drawn by `weather_sky_layer`, every piece clipped into the 4
## `EconomyConfig.SKY_WEATHER_ZONES`. The Islander Birthday Party lives in the HUD (no scene prop at all).
var tex_weather: Dictionary = {}
var weather_sky_layer: Node2D
var weather_emblems: Array[Sprite2D] = []
var weather_emblem_zone_idx: Array[int] = []
var weather_vis_id: String = ""
var weather_vis_alpha: float = 0.0
var weather_vis_time: float = 0.0

func _ready() -> void:
	z_index = EconomyConfig.Z_TERRAIN
	z_as_relative = false

	tex_meadow = load("res://assets/pixel_art/islands/island_meadow.png")
	tex_glowwood = load("res://assets/pixel_art/islands/island_glowwood.png")
	tex_coral = load("res://assets/pixel_art/islands/island_coral_coast.png")
	tex_bridge = load("res://assets/pixel_art/islands/bridge_wood.png")
	tex_tree = load("res://assets/pixel_art/buildings/apple_tree.png")
	tex_cottage = load("res://assets/pixel_art/buildings/cottage_mushroom.png")
	tex_left_hut = load("res://assets/pixel_art/buildings/landmark_left_hut.png")
	tex_right_tiki = load("res://assets/pixel_art/buildings/landmark_right_tiki.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_sky_balloon = _load_sky_balloon_texture()
	tex_airship_caravan = EconomyConfig.load_pixel_texture(EconomyConfig.AIRSHIP_CARAVAN_TEX)
	tex_parade_float = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	tex_moon_tea_boat = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)
	tex_star_lantern = EconomyConfig.load_pixel_texture(EconomyConfig.STAR_LANTERN_TEX)
	tex_fishing_boat = EconomyConfig.load_pixel_texture(EconomyConfig.FISHING_BOAT_TEX)

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
	_setup_decor()

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

	_build_wish_lanterns()
	_build_harbor_boats()

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
	_build_kite_and_season_props()
	_build_sky_weather_layer()

	EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)
	EventBus.language_changed.connect(_on_language_changed)
	EventBus.gourmet_parade_started.connect(_on_gourmet_parade_started)
	EventBus.moon_tea_gathering_started.connect(_on_moon_tea_gathering_started)
	EventBus.wish_lantern_festival_started.connect(_on_wish_lantern_festival_started)
	_apply_desktop_mode(GameManager.desktop_companion_mode)
	WindowController.snap_window_to_desktop(WindowController.current_dock)
	SoundManager.set_muted(GameManager.desktop_companion_mode)
	WindowController.apply_saved_sound()

## [building key, rect] of the building under `local_pos` ("" when there is none)
func get_building_at_local_point(local_pos: Vector2) -> Array:
	for b in ysort_layer.get_children():
		if not (b is Node2D) or not (b as Node2D).visible:
			continue
		var key := ""
		if b is SoilPlot or b is Workshop:
			key = String(b.call("get_building_key"))
		elif b is MarketStall:
			key = "stall"
		elif b is CloudGreenhouse:
			key = "greenhouse"
		elif b is CloudHotspringInn:
			key = "hotspring"
		elif b is CloudWindmillBakery:
			key = "windmill"
		elif b is CloudTeaPavilion:
			key = "tea_pavilion"
		elif b is ChefTastingPavilion:
			key = "chef_pavilion"
		elif b is LighthouseHarbor:
			key = "lighthouse_harbor"
		elif b is DairyWorkshop:
			key = "dairy_workshop"
		elif b is PotteryKiln:
			key = "pottery_kiln"
		if key == "":
			continue
		var r := Rect2((b as Node2D).position + Vector2(-27.0, -46.0), Vector2(54.0, 54.0))
		if r.has_point(local_pos):
			return [key, r]
	return ["", Rect2()]

func _update_hover_hint() -> void:
	if hud == null:
		return
	var mp := get_viewport().get_mouse_position()
	var on_desk := DisplayServer.mouse_get_position() - get_window().position
	var inside := Rect2i(Vector2i.ZERO, get_window().size).has_point(on_desk)
	EconomyConfig.hovered_building = ""
	if not inside or hud.get_hud_Hit_rect().has_point(mp) or (WindowController != null and WindowController.is_dragging):
		hud.show_hint("", "", Rect2())
		return
	var zoom := maxf(0.1, companion_zoom)
	var hit := get_building_at_local_point((mp - world_root.position) / zoom)
	var key := String(hit[0])
	if key == "":
		hud.show_hint("", "", Rect2())
		return
	EconomyConfig.hovered_building = key
	var lr: Rect2 = hit[1]
	var anchor := Rect2(world_root.position + lr.position * zoom, lr.size * zoom)
	if hud.is_building_built(key):
		hud.show_hint("%s  Lv.%d" % [hud.building_name(key), maxi(1, int(GameManager.building_levels.get(key, 1)))], hud.building_status(key), anchor)
	else:
		hud.show_hint(hud.building_name(key), UiKit.num(int(HUD.BUILD_SPECIAL[key][2])) + "G", anchor)

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

## The language changed: the few-second floating texts were written in the old one, so they are dropped
func _on_language_changed() -> void:
	if floating_text != null and floating_text.has_method("clear_all"):
		floating_text.clear_all()
	if hud != null:
		hud._sync_label_nodes()

func _apply_desktop_mode(enabled: bool) -> void:
	WindowController.apply_window_mode(enabled)
	queue_redraw()

func get_active_island_bounds() -> Rect2:
	var z := maxf(0.1, companion_zoom)
	var rx := clampf(world_root.position.x + 40.0 * z, 0.0, 1880.0)
	var ry := clampf(world_root.position.y + 8.0 * z, 0.0, 260.0)
	var rw := clampf(1840.0 * z, 200.0, 1920.0 - rx)
	var rh := clampf(230.0 * z, 100.0, 300.0 - ry)
	return Rect2(rx, ry, rw, rh)

func _build_landmarks_and_buildings() -> void:
	# Island 1 (Meadow, CI-11 7-slot re-lay): AppleTree (x=585.9), SoilPlot (x=665.9), Cottage (x=746.9), Dairy (x=817.3),
	# Mortar (x=884.7), TeaPavilion (x=950.7), Stall (x=1022.7)
	# GEMINI.md Law 3.3: `apple_tree.png` & `cottage_mushroom.png` have built-in grass base shadows -> NO procedural shadow!
	tree_1_node = _make_grounded_prop(tex_tree, 585.9, 120, 0.355)
	tree_1_node.name = "AppleTree_1"
	ysort_layer.add_child(tree_1_node)

	cot_1_node = _make_grounded_prop(tex_cottage, 746.9, 114, 0.355)
	cot_1_node.name = "MushroomCottage_1"
	ysort_layer.add_child(cot_1_node)

	# Island 2 (Glowwood): Left Hut (x=89.1), SoilPlot (x=171.4), Cauldron (x=253.6), Cloud Greenhouse (x=325.9), Cloud Windmill Bakery (x=397.9), Chef Tasting Pavilion (x=469.9)
	left_hut_node = _make_grounded_prop(tex_left_hut, 89.1, 108, 0.395)
	left_hut_node.name = "LeftHut_2"
	ysort_layer.add_child(left_hut_node)
	island2_props.append(left_hut_node)

	# Island 3 (Coral Coast, CI-10 re-slot + CI-12 kiln): Pottery Kiln (x=1437.8), SoilPlot (x=1519.7), Dual Workshop (x=1601.3),
	# Hot-Spring Inn (x=1672.3), Lighthouse Harbor (x=1743.4), Right Tiki (x=1814.5)
	pottery_kiln = PotteryKiln.new()
	pottery_kiln.name = "PotteryKiln_3"
	pottery_kiln.setup_pottery_kiln(3, Vector2(PotteryKiln.SLOT_X, GROUND_Y))
	ysort_layer.add_child(pottery_kiln)

	right_tiki_node = _make_grounded_prop(tex_right_tiki, 1814.5, 108, 0.37)
	right_tiki_node.name = "RightTiki_3"
	ysort_layer.add_child(right_tiki_node)
	island3_props.append(right_tiki_node)

	mortar_workshop = Workshop.new()
	mortar_workshop.name = "MortarWorkshop_1"
	mortar_workshop.setup_workshop("mortar", 1, Vector2(884.7, GROUND_Y))
	ysort_layer.add_child(mortar_workshop)

	dairy_workshop = DairyWorkshop.new()
	dairy_workshop.name = "DairyWorkshop_1"
	dairy_workshop.setup_dairy_workshop(1, Vector2(DairyWorkshop.SLOT_X, GROUND_Y))
	ysort_layer.add_child(dairy_workshop)

	cloud_tea_pavilion = CloudTeaPavilion.new()
	cloud_tea_pavilion.name = "CloudTeaPavilion_1"
	cloud_tea_pavilion.setup_tea_pavilion(1, Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y))
	ysort_layer.add_child(cloud_tea_pavilion)

	cauldron_workshop = Workshop.new()
	cauldron_workshop.name = "CauldronWorkshop_2"
	cauldron_workshop.setup_workshop("cauldron", 2, Vector2(253.6, GROUND_Y))
	ysort_layer.add_child(cauldron_workshop)

	cloud_greenhouse = CloudGreenhouse.new()
	cloud_greenhouse.name = "CloudGreenhouse_2"
	cloud_greenhouse.setup_greenhouse(2, Vector2(CloudGreenhouse.SLOT_X, GROUND_Y))
	ysort_layer.add_child(cloud_greenhouse)

	cloud_windmill_bakery = CloudWindmillBakery.new()
	cloud_windmill_bakery.name = "CloudWindmillBakery_2"
	cloud_windmill_bakery.setup_windmill_bakery(2, Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y))
	ysort_layer.add_child(cloud_windmill_bakery)

	chef_tasting_pavilion = ChefTastingPavilion.new()
	chef_tasting_pavilion.name = "ChefTastingPavilion_2"
	chef_tasting_pavilion.setup_chef_pavilion(2, Vector2(ChefTastingPavilion.SLOT_X, GROUND_Y))
	ysort_layer.add_child(chef_tasting_pavilion)

	coral_linked_workshop = Workshop.new()
	coral_linked_workshop.name = "CoralWorkshop_3"
	coral_linked_workshop.setup_workshop("coral_linked", 3, Vector2(1601.3, GROUND_Y))
	ysort_layer.add_child(coral_linked_workshop)

	cloud_hotspring_inn = CloudHotspringInn.new()
	cloud_hotspring_inn.name = "CloudHotspringInn_3"
	cloud_hotspring_inn.setup_hotspring_inn(3, Vector2(CloudHotspringInn.SLOT_X, GROUND_Y))
	ysort_layer.add_child(cloud_hotspring_inn)

	lighthouse_harbor = LighthouseHarbor.new()
	lighthouse_harbor.name = "LighthouseHarbor_3"
	lighthouse_harbor.setup_lighthouse_harbor(3, Vector2(LighthouseHarbor.SLOT_X, GROUND_Y))
	ysort_layer.add_child(lighthouse_harbor)

	market_stall = MarketStall.new()
	market_stall.name = "MarketStall_1"
	market_stall.position = Vector2(MarketStall.SLOT_X, GROUND_Y)
	ysort_layer.add_child(market_stall)

	# CI-11: night-only event prop on the Island 1 east headland (not a main building; shown only during the NIGHT phase)
	open_air_cinema = OpenAirCinema.new()
	open_air_cinema.name = "OpenAirCinema_1"
	open_air_cinema.setup_open_air_cinema(Vector2(OpenAirCinema.SLOT_X, GROUND_Y))
	ysort_layer.add_child(open_air_cinema)

	# Functional Miniature Landscapes (v2.5-2)
	# Island 1: Bee Hive (x=619.8, centered between AppleTree_1 [566.0..605.8] and SoilPlot_1 [633.9..697.9]; 24px wide)
	var tex_beehive: Texture2D = load("res://assets/pixel_art/buildings/decor_beehive.png") if ResourceLoader.exists("res://assets/pixel_art/buildings/decor_beehive.png") else tex_tree
	var node_beehive := _make_grounded_prop(tex_beehive, 619.8, 52, 0.42)
	node_beehive.name = "Landscape_BeeHive_1"
	node_beehive.visible = false
	ysort_layer.add_child(node_beehive)
	landscape_nodes["bee_hive"] = node_beehive

	# Island 2: Wind Chime (x=127.2 = LeftHut_2 right edge 111.2 + 16px decor offset, inside the 28px hut/soil gap)
	var tex_windchime: Texture2D = load("res://assets/pixel_art/buildings/decor_windchime.png") if ResourceLoader.exists("res://assets/pixel_art/buildings/decor_windchime.png") else tex_left_hut
	var node_windchime := _make_grounded_prop(tex_windchime, 127.2, 58, 0.50)
	node_windchime.name = "Landscape_WindChime_2"
	node_windchime.visible = false
	ysort_layer.add_child(node_windchime)
	island2_props.append(node_windchime)
	landscape_nodes["wind_chime"] = node_windchime

	# Island 3: Tiki Torch (x=1777.0 = RightTiki_3 left edge 1793.0 - 16px decor offset, inside the 28px lighthouse/tiki gap)
	var tex_torch: Texture2D = load("res://assets/pixel_art/buildings/decor_lamp.png")
	var node_torch := _make_grounded_prop(tex_torch, 1777.0, 66, 0.45)
	node_torch.name = "Landscape_TikiTorch_3"
	node_torch.visible = false
	ysort_layer.add_child(node_torch)
	island3_props.append(node_torch)
	landscape_nodes["tiki_torch"] = node_torch

func get_island_main_building_rects() -> Dictionary:
	var oy := world_root.position.y
	var p1_rect := soil_plots[0].get_screen_rect() if soil_plots.size() > 0 else Rect2(665.9 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p2_rect := soil_plots[1].get_screen_rect() if soil_plots.size() > 1 else Rect2(171.4 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var p3_rect := soil_plots[2].get_screen_rect() if soil_plots.size() > 2 else Rect2(1519.7 - 32.0, GROUND_Y - 26.0, 64.0, 26.0)
	var tp_rect := cloud_tea_pavilion.get_screen_rect() if cloud_tea_pavilion != null else Rect2(950.7 - 19.88, GROUND_Y - 36.92, 39.76, 36.92)
	var dw_rect := dairy_workshop.get_screen_rect() if dairy_workshop != null else Rect2(817.3 - 21.28, GROUND_Y - 39.52, 42.56, 39.52)
	var gh_rect := cloud_greenhouse.get_screen_rect() if cloud_greenhouse != null else Rect2(325.9 - 22.12, GROUND_Y - 41.08, 44.24, 41.08)
	var wm_rect := cloud_windmill_bakery.get_screen_rect() if cloud_windmill_bakery != null else Rect2(397.9 - 21.75, GROUND_Y - 40.50, 43.50, 40.50)
	var cp_rect := chef_tasting_pavilion.get_screen_rect() if chef_tasting_pavilion != null else Rect2(469.9 - 22.12, GROUND_Y - 41.08, 44.24, 41.08)
	var hs_rect := cloud_hotspring_inn.get_screen_rect() if cloud_hotspring_inn != null else Rect2(1672.3 - 21.46, GROUND_Y - 39.96, 42.92, 39.96)
	var lh_rect := lighthouse_harbor.get_screen_rect() if lighthouse_harbor != null else Rect2(1743.4 - 21.6, GROUND_Y - 57.6, 43.2, 57.6)
	var pk_rect := pottery_kiln.get_screen_rect() if pottery_kiln != null else Rect2(1437.8 - 21.84, GROUND_Y - 40.56, 43.68, 40.56)
	return {
		1: [
			{"name": "AppleTree_1",        "rect": _sprite_global_rect(tree_1_node, oy)},
			{"name": "SoilPlot_1",         "rect": Rect2(p1_rect.position + Vector2(0, oy), p1_rect.size)},
			{"name": "MushroomCottage_1",  "rect": _sprite_global_rect(cot_1_node, oy)},
			{"name": "DairyWorkshop_1",    "rect": Rect2(dw_rect.position + Vector2(0, oy), dw_rect.size)},
			{"name": "MortarWorkshop_1",   "rect": Rect2(mortar_workshop.get_screen_rect().position + Vector2(0, oy), mortar_workshop.get_screen_rect().size)},
			{"name": "CloudTeaPavilion_1", "rect": Rect2(tp_rect.position + Vector2(0, oy), tp_rect.size)},
			{"name": "MarketStall_1",      "rect": Rect2(market_stall.get_screen_rect().position + Vector2(0, oy), market_stall.get_screen_rect().size)}
		],
		2: [
			{"name": "LeftHut_2",             "rect": _sprite_global_rect(left_hut_node, oy)},
			{"name": "SoilPlot_2",            "rect": Rect2(p2_rect.position + Vector2(0, oy), p2_rect.size)},
			{"name": "CauldronWorkshop_2",    "rect": Rect2(cauldron_workshop.get_screen_rect().position + Vector2(0, oy), cauldron_workshop.get_screen_rect().size)},
			{"name": "CloudGreenhouse_2",     "rect": Rect2(gh_rect.position + Vector2(0, oy), gh_rect.size)},
			{"name": "CloudWindmillBakery_2", "rect": Rect2(wm_rect.position + Vector2(0, oy), wm_rect.size)},
			{"name": "ChefTastingPavilion_2", "rect": Rect2(cp_rect.position + Vector2(0, oy), cp_rect.size)}
		],
		3: [
			{"name": "PotteryKiln_3",       "rect": Rect2(pk_rect.position + Vector2(0, oy), pk_rect.size)},
			{"name": "SoilPlot_3",          "rect": Rect2(p3_rect.position + Vector2(0, oy), p3_rect.size)},
			{"name": "CoralWorkshop_3",     "rect": Rect2(coral_linked_workshop.get_screen_rect().position + Vector2(0, oy), coral_linked_workshop.get_screen_rect().size)},
			{"name": "CloudHotspringInn_3", "rect": Rect2(hs_rect.position + Vector2(0, oy), hs_rect.size)},
			{"name": "LighthouseHarbor_3",  "rect": Rect2(lh_rect.position + Vector2(0, oy), lh_rect.size)},
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
	p1.setup_plot(1, 0, "crop_0", Vector2(665.9, GROUND_Y))
	ysort_layer.add_child(p1)
	soil_plots.append(p1)

	var p2 := SoilPlot.new()
	p2.setup_plot(2, 0, "crop_2", Vector2(171.4, GROUND_Y))
	ysort_layer.add_child(p2)
	soil_plots.append(p2)

	var p3 := SoilPlot.new()
	p3.setup_plot(3, 0, "crop_3", Vector2(1519.7, GROUND_Y))
	ysort_layer.add_child(p3)
	soil_plots.append(p3)

func _spawn_all_roster_slots() -> void:
	var roster_defs := [
		# Island 1 (Meadow, CI-11 re-slot): Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(653.9, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 1, Vector2(677.9, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 0, Vector2(840.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 1, Vector2(853.4, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 1, 0, Vector2(866.7, GROUND_Y)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, 1, 0, Vector2(1045.3, GROUND_Y)],

		# Island 2 (Glowwood): Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 0, Vector2(161.4, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 1, Vector2(181.4, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 2, 0, Vector2(216.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 2, 0, Vector2(235.6, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 0, Vector2(284.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 1, Vector2(296.0, GROUND_Y)],

		# Island 3 (Coral Coast, CI-10 re-slot): Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 0, Vector2(1509.7, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 3, 1, Vector2(1529.7, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 0, Vector2(1561.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 3, 1, Vector2(1572.0, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 3, 0, Vector2(1583.3, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 3, 0, Vector2(1619.3, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 0, Vector2(1630.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 3, 1, Vector2(1642.0, GROUND_Y)]
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

## ------------------------------------------------------------------------------------------------------------------
## Decorations on the lawns: drag to move, the crew walks over and uses them; guests walk in as themselves
## ------------------------------------------------------------------------------------------------------------------
var decor_nodes: Dictionary = {}
var _decor_drag := ""
var _decor_grab := 0.0
var _decor_from := 0.0

func _setup_decor() -> void:
	EventBus.decor_changed.connect(sync_decor)
	EventBus.guest_arrived.connect(_on_guest_arrived)
	sync_decor()

func sync_decor() -> void:
	var seen := {}
	for d in GameManager.decor_placed:
		var id := String(d["id"])
		seen[id] = true
		if not decor_nodes.has(id):
			decor_nodes[id] = _make_decor(id)
			ysort_layer.add_child(decor_nodes[id])
		(decor_nodes[id] as Node2D).position = Vector2(float(d["x"]), GROUND_Y + Guests.lawn_dy(float(d["x"])))
	for k in decor_nodes.keys():
		if not seen.has(k):
			(decor_nodes[k] as Node2D).queue_free()
			decor_nodes.erase(k)

func _make_decor(id: String) -> Node2D:
	var root := Node2D.new()
	root.name = "Decor_" + id
	root.z_index = EconomyConfig.Z_UNIT + 1
	root.z_as_relative = false
	var tex := Guests.decor_tex(id)
	var used := Rect2(tex.get_image().get_used_rect())
	var sc := float(Guests.DECOR[id]["h"]) / maxf(1.0, used.size.y)
	var w := used.size.x * sc
	var shadow := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in range(16):
		var a := TAU * float(i) / 16.0
		pts.append(Vector2(cos(a) * w * 0.42, sin(a) * w * 0.084))
	shadow.polygon = pts
	shadow.color = Color(0.0, 0.0, 0.0, 0.20)
	root.add_child(shadow)
	var sp := Sprite2D.new()
	sp.name = "Pic"
	sp.texture = tex
	sp.region_enabled = true
	sp.region_rect = used
	sp.scale = Vector2(sc, sc)
	sp.position = Vector2(0.0, -float(Guests.DECOR[id]["h"]) * 0.5)
	root.add_child(sp)
	root.set_meta("size", Vector2(w, float(Guests.DECOR[id]["h"])))
	return root

func get_decor_at_local_point(p: Vector2) -> String:
	var best := ""
	var best_d := INF
	for id in decor_nodes.keys():
		var n: Node2D = decor_nodes[id]
		var sz: Vector2 = n.get_meta("size")
		if Rect2(n.position - Vector2(sz.x * 0.5, sz.y), sz).grow(3.0).has_point(p) and absf(n.position.x - p.x) < best_d:
			best = String(id)
			best_d = absf(n.position.x - p.x)
	return best

## A decoration on this worker's isle that nobody is using: {"id", "x"} or {}
func find_decor_for(worker: AnimalWorker) -> Dictionary:
	var taken: Array = []
	for w in workers:
		if is_instance_valid(w) and w != worker and w.decor_id != "":
			taken.append(w.decor_id)
	var lawn: Array = []
	for l in Guests.LAWNS:
		if int(l[0]) == worker.home_island:
			lawn = l
	var pool: Array = []
	for d in GameManager.decor_placed:
		if float(d["x"]) >= float(lawn[1]) and float(d["x"]) <= float(lawn[2]) and not taken.has(String(d["id"])):
			pool.append(d)
	if pool.is_empty():
		return {}
	var pick: Dictionary = pool[randi() % pool.size()]
	var half := float((decor_nodes[String(pick["id"])].get_meta("size") as Vector2).x) * 0.5 if decor_nodes.has(String(pick["id"])) else 12.0
	# beside it, on the side it comes from
	var side := -1.0 if worker.position.x < float(pick["x"]) else 1.0
	return {"id": String(pick["id"]), "x": clampf(float(pick["x"]) + side * (half + 12.0), float(lawn[1]), float(lawn[2])), "step": float(lawn[3]) - 4.0}

func _on_guest_arrived(guest: String, _keep: String) -> void:
	if GameManager.is_automated_test_mode and not _guest_walks_in_tests:
		return
	_spawn_customer(false).set_guest_look(Guests.sheet(guest))

var _guest_walks_in_tests := false

func _decor_drag_input(event: InputEvent) -> bool:
	if _decor_drag == "":
		return false
	var node: Node2D = decor_nodes.get(_decor_drag)
	if node == null:
		_decor_drag = ""
		return false
	if event is InputEventMouseMotion:
		var x: float = (event.position.x - world_root.position.x) / maxf(0.1, companion_zoom) + _decor_grab
		node.position.x = clampf(x, 40.0, 1880.0)
		return true
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		var id := _decor_drag
		_decor_drag = ""
		var moved := absf(node.position.x - _decor_from) > 3.0
		GameManager.place_decor(id, node.position.x)
		if moved and SoundManager != null:
			SoundManager.play_pop_sfx()
		GameManager.save_game()
		return true
	return false

## A click on a building that is not there yet opens the menu with its price; it never spends the savings by itself
func _ask_to_build(built: bool, tab: int) -> bool:
	if built:
		return false
	hud.open_drawer(tab)
	return true

func _unhandled_input(event: InputEvent) -> void:
	if WindowController.boss_stealth_active:
		if _decor_drag != "":
			if decor_nodes.has(_decor_drag):
				(decor_nodes[_decor_drag] as Node2D).position.x = _decor_from
			_decor_drag = ""
		return
	if _decor_drag_input(event):
		return
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
				# CI-13: flying kites in the sky lanes (above every building / badge row) are reeled in first
				var hit_kite := get_kite_at_local_point(local_pos)
				if hit_kite >= 0:
					interact_with_kite(hit_kite)
					return
				var hit_decor := get_decor_at_local_point(local_pos)
				if hit_decor != "":
					_decor_drag = hit_decor
					_decor_from = (decor_nodes[hit_decor] as Node2D).position.x
					_decor_grab = _decor_from - local_pos.x
					return
				if cloud_gift_active and cloud_gift_sprite != null and get_sky_balloon_local_hit_rect().has_point(local_pos):
					claim_sky_balloon()
					return
				if GameManager != null and GameManager.airship_docked and get_airship_local_hit_rect().has_point(local_pos):
					interact_with_docked_airship()
					return
				if cloud_greenhouse != null and cloud_greenhouse.visible and cloud_greenhouse.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("greenhouse"), 0):
						interact_with_greenhouse()
					return
				if cloud_tea_pavilion != null and cloud_tea_pavilion.visible and cloud_tea_pavilion.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("tea_pavilion"), 0):
						interact_with_tea_pavilion()
					return
				if dairy_workshop != null and dairy_workshop.visible and dairy_workshop.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("dairy_workshop"), 0):
						interact_with_dairy_workshop()
					return
				if open_air_cinema != null and open_air_cinema.visible and open_air_cinema.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(GameManager.open_air_cinema_unlocked, 2):
						interact_with_open_air_cinema()
					return
				if chef_tasting_pavilion != null and chef_tasting_pavilion.visible and chef_tasting_pavilion.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("chef_pavilion"), 0):
						interact_with_chef_pavilion()
					return
				var hit_lantern := get_wish_lantern_at_local_point(local_pos)
				if hit_lantern >= 0:
					interact_with_wish_lantern(hit_lantern)
					return
				if moon_tea_boat_sprite != null and moon_tea_boat_sprite.visible and get_moon_tea_boat_local_hit_rect().has_point(local_pos):
					interact_with_moon_tea_boat()
					return
				if cloud_windmill_bakery != null and cloud_windmill_bakery.visible and cloud_windmill_bakery.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("windmill"), 0):
						interact_with_windmill_bakery()
					return
				if GameManager != null and GameManager.is_gourmet_parade_active() and get_parade_float_local_hit_rect().has_point(local_pos):
					interact_with_parade_float()
					return
				if cloud_hotspring_inn != null and cloud_hotspring_inn.visible and cloud_hotspring_inn.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("hotspring"), 0):
						interact_with_hotspring_inn()
					return
				if lighthouse_harbor != null and lighthouse_harbor.visible and lighthouse_harbor.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("lighthouse_harbor"), 0):
						interact_with_lighthouse_harbor()
					return
				if pottery_kiln != null and pottery_kiln.visible and pottery_kiln.get_local_hit_rect().has_point(local_pos):
					if not _ask_to_build(hud.is_building_built("pottery_kiln"), 0):
						interact_with_pottery_kiln()
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
	cloud_gift_timer = randf_range(Pacing.BALLOON_GAP[0], Pacing.BALLOON_GAP[1])
	var bonus_gold := GameManager.income_gold(Pacing.BALLOON_SEC, 10)
	var bonus_amber := 1
	GameManager.add_gold(bonus_gold)
	GameManager.add_amber(bonus_amber)
	GameManager.trigger_carnival_frenzy(15.0)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.spawn_floating_text.emit(
		Vector2(cloud_gift_pos.x, maxf(18.0, cloud_gift_pos.y + 20.0)),
		EconomyConfig.tr_fmt("ft_gift_bag", [bonus_gold, bonus_amber]),
		Color("#FFE066")
	)
	return {"claimed": true, "gold": bonus_gold, "amber": bonus_amber}

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

func reload_ci5_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if cloud_greenhouse != null and cloud_greenhouse.has_method("reload_ci5_textures"):
		cloud_greenhouse.reload_ci5_textures()

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
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var b_res := GameManager.bundle_souvenir_gift_box("", false)
	if bool(b_res.get("bundled", false)):
		var b_name := EconomyConfig.get_item_display_name(String(b_res.get("box_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudGreenhouse.SLOT_X, GROUND_Y - 64.0),
			EconomyConfig.tr_fmt("ft_w_packed", [b_name, int(b_res.get("stock", 1))]),
			Color("#FFE066")
		)
		return {"ok": true, "action": "bundle", "box_id": String(b_res.get("box_id", ""))}
	var next_f := GameManager.cycle_greenhouse_flora()
	var f_name := EconomyConfig.get_item_display_name(next_f)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudGreenhouse.SLOT_X, GROUND_Y - 64.0),
		EconomyConfig.tr_fmt("ft_w_gh_cycle", [f_name]),
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_flora", "flora_id": next_f}

func reload_ci6_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if cloud_hotspring_inn != null and cloud_hotspring_inn.has_method("reload_ci6_textures"):
		cloud_hotspring_inn.reload_ci6_textures()

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
	parade_tourist_timer = 5.0
	_apply_parade_float_texture()
	parade_float_pos.y = GROUND_Y
	if parade_float_sprite != null:
		parade_float_sprite.visible = true
		parade_float_sprite.position = parade_float_pos
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
		EconomyConfig.tr_key("ft_w_parade"),
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
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var bake_res := GameManager.bake_windmill_bread("", true)
	if bool(bake_res.get("baked", false)):
		var b_name := EconomyConfig.get_item_display_name(String(bake_res.get("bread_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
			EconomyConfig.tr_fmt("ft_w_baked", [b_name, int(bake_res.get("qty", 1)), int(bake_res.get("stock", 1))]),
			Color("#FFE066")
		)
		return {"ok": true, "action": "bake", "bread_id": String(bake_res.get("bread_id", ""))}
	var mill_res := GameManager.mill_golden_wheat_flour(false, false)
	if bool(mill_res.get("milled", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
			EconomyConfig.tr_fmt("ft_w_milled", [int(mill_res.get("qty", 1)), int(mill_res.get("stock", 1))]),
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "mill"}
	if bool(bake_res.get("full", false)):
		return {"ok": true, "action": "status"}
	var next_b := GameManager.cycle_windmill_bread()
	var nb_name := EconomyConfig.get_item_display_name(next_b)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudWindmillBakery.SLOT_X, GROUND_Y - 64.0),
		EconomyConfig.tr_fmt("ft_w_wm_cycle", [nb_name]),
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
	tea_connoisseur_timer = 5.0
	_apply_moon_tea_boat_texture()
	moon_tea_boat_pos.x = clampf(moon_tea_boat_pos.x, MOON_TEA_BOAT_MIN_X, MOON_TEA_BOAT_MAX_X)
	moon_tea_boat_pos.y = MOON_TEA_BOAT_BASE_Y + sin(cloud_time * 2.2) * 1.5
	if moon_tea_boat_sprite != null:
		moon_tea_boat_sprite.visible = true
		moon_tea_boat_sprite.position = moon_tea_boat_pos
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
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var brew_res := GameManager.brew_artisan_tea("", true)
	if bool(brew_res.get("brewed", false)):
		var t_name := EconomyConfig.get_item_display_name(String(brew_res.get("tea_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_brewed_tea", [t_name, int(brew_res.get("qty", 1)), int(brew_res.get("stock", 1))]),
			Color("#88FFD0")
		)
		return {"ok": true, "action": "brew", "tea_id": String(brew_res.get("tea_id", ""))}
	var roast_res := GameManager.roast_tea_spring_leaves(false, false)
	if bool(roast_res.get("roasted", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_roasted", [int(roast_res.get("qty", 1)), int(roast_res.get("stock", 1))]),
			Color("#B2F2BB")
		)
		return {"ok": true, "action": "roast"}
	if bool(brew_res.get("full", false)):
		return {"ok": true, "action": "status"}
	var next_t := GameManager.cycle_tea_pavilion_recipe()
	var nt_name := EconomyConfig.get_item_display_name(next_t)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudTeaPavilion.SLOT_X, GROUND_Y - 58.0),
		EconomyConfig.tr_fmt("ft_w_tp_cycle", [nt_name]),
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_tea", "tea_id": next_t}

func _build_wish_lanterns() -> void:
	wish_lanterns.clear()
	for i in range(EconomyConfig.WISH_LANTERN_LANES.size()):
		var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[i]
		var sp := Sprite2D.new()
		sp.name = "WishStarLantern_%d" % i
		sp.centered = true
		sp.region_enabled = false
		sp.hframes = 1
		sp.vframes = 1
		sp.frame = 0
		sp.z_index = EconomyConfig.Z_UNIT
		sp.z_as_relative = false
		sp.visible = false
		ysort_layer.add_child(sp)
		var min_x := float(lane["min_x"])
		var max_x := float(lane["max_x"])
		var start_x := min_x + (max_x - min_x) * (0.35 + 0.30 * fmod(float(i) * 0.618, 1.0))
		wish_lanterns.append({"lane": i, "x": start_x, "age": 1.2, "respawn": 0.0, "phase": float(i) * 1.7, "sprite": sp})
	_apply_wish_lantern_textures()

func _apply_wish_lantern_textures() -> void:
	if tex_star_lantern == null:
		tex_star_lantern = EconomyConfig.load_pixel_texture(EconomyConfig.STAR_LANTERN_TEX)
	if tex_star_lantern == null:
		return
	var tw := maxf(1.0, float(tex_star_lantern.get_width()))
	var th := maxf(1.0, float(tex_star_lantern.get_height()))
	# Keep a constant ~19px on-water footprint whatever the final art resolution is
	var sc := WISH_LANTERN_SCALE * WISH_LANTERN_TEX_SIZE / maxf(tw, th)
	for wl in wish_lanterns:
		var sp: Sprite2D = wl["sprite"]
		if sp == null:
			continue
		sp.texture = tex_star_lantern
		sp.centered = true
		sp.region_enabled = false
		sp.hframes = 1
		sp.vframes = 1
		sp.frame = 0
		# GEMINI.md Law 2.2: bottom-center pivot -> `position` is the lantern's waterline contact point
		sp.offset = Vector2(0.0, -th * 0.5)
		sp.scale = Vector2(sc, sc)

func get_wish_lantern_visual_size() -> Vector2:
	if tex_star_lantern == null:
		return Vector2(WISH_LANTERN_TEX_SIZE, WISH_LANTERN_TEX_SIZE) * WISH_LANTERN_SCALE
	var tw := maxf(1.0, float(tex_star_lantern.get_width()))
	var th := maxf(1.0, float(tex_star_lantern.get_height()))
	var sc := WISH_LANTERN_SCALE * WISH_LANTERN_TEX_SIZE / maxf(tw, th)
	return Vector2(tw * sc, th * sc)

func _get_wish_lantern_bob(lane: Dictionary, phase: float) -> float:
	if int(lane.get("island", 1)) == 3:
		# Island 3 texture bobs by `roundf(sin(cloud_time * 0.55))` in `_draw()`; lanterns ride the same swell
		return roundf(sin(cloud_time * 0.55) * 1.0)
	return sin(cloud_time * 1.9 + phase) * 0.5

func _wish_lantern_world_pos(wl: Dictionary) -> Vector2:
	var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[int(wl["lane"])]
	return Vector2(float(wl["x"]), float(lane["waterline_y"]) + _get_wish_lantern_bob(lane, float(wl["phase"])))

func _release_wish_lantern(wl: Dictionary) -> void:
	var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[int(wl["lane"])]
	wl["x"] = float(lane["min_x"]) if float(lane["dir"]) > 0.0 else float(lane["max_x"])
	wl["age"] = 0.0
	wl["respawn"] = 0.0

func _update_wish_lanterns(delta: float, fest_active: bool, isl3_on: bool) -> void:
	if tex_star_lantern == null:
		_apply_wish_lantern_textures()
	for wl in wish_lanterns:
		var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[int(wl["lane"])]
		var sp: Sprite2D = wl["sprite"]
		if sp == null:
			continue
		var lane_open := fest_active and (int(lane["island"]) != 3 or isl3_on)
		if not lane_open:
			sp.visible = false
			continue
		if float(wl["respawn"]) > 0.0:
			wl["respawn"] = float(wl["respawn"]) - delta
			sp.visible = false
			if float(wl["respawn"]) <= 0.0:
				_release_wish_lantern(wl)
			continue
		var dir := float(lane["dir"])
		var min_x := float(lane["min_x"])
		var max_x := float(lane["max_x"])
		var nx := float(wl["x"]) + dir * float(lane["speed"]) * delta
		if (dir > 0.0 and nx >= max_x) or (dir < 0.0 and nx <= min_x):
			# Drifted to the end of its water lane -> a new lantern is released from the lane start
			_release_wish_lantern(wl)
			nx = float(wl["x"])
		wl["x"] = clampf(nx, min_x, max_x)
		wl["age"] = float(wl["age"]) + delta
		var dist_to_end := (max_x - float(wl["x"])) if dir > 0.0 else (float(wl["x"]) - min_x)
		var alpha := clampf(float(wl["age"]) / 1.2, 0.0, 1.0) * clampf(dist_to_end / 5.0, 0.2, 1.0)
		sp.visible = true
		sp.position = _wish_lantern_world_pos(wl)
		sp.modulate = Color(1.0, 1.0, 1.0, alpha)

func _on_wish_lantern_festival_started(_duration: float) -> void:
	_apply_wish_lantern_textures()
	for i in range(wish_lanterns.size()):
		var wl: Dictionary = wish_lanterns[i]
		var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[int(wl["lane"])]
		var min_x := float(lane["min_x"])
		var max_x := float(lane["max_x"])
		wl["x"] = min_x + (max_x - min_x) * (0.35 + 0.30 * fmod(float(i) * 0.618, 1.0))
		wl["age"] = 1.2
		wl["respawn"] = 0.0

## Texture-space water test (same classifier the lanes were sampled with): teal pond water / turquoise surf, never grass, sand or soil.
func _get_island_water_image(isl: int) -> Image:
	if _island_water_images.has(isl):
		return _island_water_images[isl]
	var tex: Texture2D = tex_meadow if isl == 1 else (tex_coral if isl == 3 else null)
	var img: Image = tex.get_image() if tex != null else null
	if img != null and img.is_compressed():
		img.decompress()
	_island_water_images[isl] = img
	return img

func is_island_texture_water(isl: int, local_pt: Vector2) -> bool:
	if isl != 1 and isl != 3:
		return false
	var img := _get_island_water_image(isl)
	if img == null:
		return false
	var origin := ISLAND_1_TEX_ORIGIN if isl == 1 else ISLAND_3_TEX_ORIGIN
	var tx := roundi(local_pt.x - origin.x)
	var ty := roundi(local_pt.y - origin.y)
	if tx < 0 or ty < 0 or tx >= img.get_width() or ty >= img.get_height():
		return false
	var c := img.get_pixel(tx, ty)
	return c.a > 0.78 and c.b8 >= c.r8 + 12 and c.g8 >= 120 and c.b8 >= 110

## Ripple footprint of a lantern (the lit lotus base + its water ring) relative to its waterline anchor.
func get_wish_lantern_contact_points(lane_idx: int, x: float, dy_extra: float = 0.0) -> Array[Vector2]:
	var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[clampi(lane_idx, 0, EconomyConfig.WISH_LANTERN_LANES.size() - 1)]
	var wl_y := float(lane["waterline_y"]) + dy_extra
	var pts: Array[Vector2] = []
	for dx in [-7.0, -3.0, 0.0, 3.0, 7.0]:
		for dy in [-6.0, -4.0, -2.0]:
			pts.append(Vector2(x + dx, wl_y + dy))
	return pts

func is_wish_lantern_on_water(lane_idx: int, x: float, dy_extra: float = 0.0) -> bool:
	var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[clampi(lane_idx, 0, EconomyConfig.WISH_LANTERN_LANES.size() - 1)]
	var isl := int(lane["island"])
	for pt in get_wish_lantern_contact_points(lane_idx, x, dy_extra):
		if not is_island_texture_water(isl, pt):
			return false
	return true

func get_wish_lantern_rect_at(lane_idx: int, x: float) -> Rect2:
	var lane: Dictionary = EconomyConfig.WISH_LANTERN_LANES[clampi(lane_idx, 0, EconomyConfig.WISH_LANTERN_LANES.size() - 1)]
	var sz := get_wish_lantern_visual_size()
	var wl_y := float(lane["waterline_y"])
	return Rect2(x - sz.x * 0.5, wl_y - sz.y, sz.x, sz.y)

func get_wish_lantern_local_rect(idx: int) -> Rect2:
	if idx < 0 or idx >= wish_lanterns.size():
		return Rect2()
	var wl: Dictionary = wish_lanterns[idx]
	var sp: Sprite2D = wl["sprite"]
	var pos := sp.position if sp != null else _wish_lantern_world_pos(wl)
	var sz := get_wish_lantern_visual_size()
	return Rect2(pos.x - sz.x * 0.5, pos.y - sz.y, sz.x, sz.y)

func get_wish_lantern_at_local_point(local_pos: Vector2) -> int:
	for i in range(wish_lanterns.size()):
		var sp: Sprite2D = wish_lanterns[i]["sprite"]
		if sp != null and sp.visible and sp.modulate.a > 0.2 and get_wish_lantern_local_rect(i).grow(4.0).has_point(local_pos):
			return i
	return -1

func get_wish_lantern_screen_rect(idx: int) -> Rect2:
	var lr := get_wish_lantern_local_rect(idx)
	if lr.size.x <= 0.0:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var top_left := world_root.position + lr.position * z
	return Rect2(top_left, lr.size * z)

func interact_with_wish_lantern(idx: int) -> Dictionary:
	if GameManager == null or idx < 0 or idx >= wish_lanterns.size():
		return {"ok": false}
	var wl: Dictionary = wish_lanterns[idx]
	var sp: Sprite2D = wl["sprite"]
	if sp == null or not sp.visible:
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var res := GameManager.claim_wish_lantern(idx, sp.position)
	var ok := bool(res.get("claimed", false))
	if ok:
		# The wish lantern is scooped up; a fresh one is released from the lane start a few seconds later
		sp.visible = false
		wl["respawn"] = WISH_LANTERN_RESPAWN_SEC
	return {"ok": ok, "reward": res}

func reload_ci9_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_star_lantern = EconomyConfig.load_pixel_texture(EconomyConfig.STAR_LANTERN_TEX)
	_apply_wish_lantern_textures()
	if chef_tasting_pavilion != null and chef_tasting_pavilion.has_method("reload_ci9_textures"):
		chef_tasting_pavilion.reload_ci9_textures()

func get_chef_pavilion_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)) or chef_tasting_pavilion == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := chef_tasting_pavilion.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

func interact_with_chef_pavilion() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(2, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.chef_pavilion_unlocked:
		var ok := GameManager.unlock_chef_pavilion(false)
		if not ok and hud != null:
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	# 1) A cooked dish is waiting -> invite the jury for a tasting challenge (pending challenge, or an encore during the lantern festival)
	var encore := GameManager.is_wish_lantern_festival_active() and GameManager.lantern_encores < Pacing.LANTERN_ENCORES
	if GameManager.has_pending_tasting_challenge() or encore:
		var pend_id := GameManager._pick_tasting_challenge_dish("")
		if int(GameManager.tasting_inventory.get(pend_id, 0)) > 0:
			if not GameManager.has_pending_tasting_challenge():
				GameManager.lantern_encores += 1
			var t_res := GameManager.run_tasting_challenge(pend_id)
			return {"ok": bool(t_res.get("judged", false)), "action": "tasting", "result": t_res}
	# 2) Cook the active combo dish from existing island ingredients
	var c_res := GameManager.cook_tasting_dish("", true)
	if bool(c_res.get("cooked", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(ChefTastingPavilion.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_cooked", [EconomyConfig.get_item_display_name(String(c_res.get("dish_id", ""))), int(c_res.get("stock", 1))]),
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "cook", "dish_id": String(c_res.get("dish_id", ""))}
	# 3) Nothing to cook with -> rotate the featured combo dish
	var next_d := GameManager.cycle_tasting_dish()
	EventBus.spawn_floating_text.emit(
		Vector2(ChefTastingPavilion.SLOT_X, GROUND_Y - 58.0),
		EconomyConfig.tr_fmt("ft_w_cp_cycle", [EconomyConfig.get_item_display_name(next_d)]),
		Color("#FFE066")
	)
	return {"ok": true, "action": "cycle_dish", "dish_id": next_d}

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
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var brew_res := GameManager.brew_hotspring_bath("", false)
	if bool(brew_res.get("brewed", false)):
		var b_name := EconomyConfig.get_item_display_name(String(brew_res.get("bath_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudHotspringInn.SLOT_X, GROUND_Y - 64.0),
			EconomyConfig.tr_fmt("ft_w_bath", [b_name, int(brew_res.get("stock", 1))]),
			Color("#FFE066")
		)
		return {"ok": true, "action": "brew", "bath_id": String(brew_res.get("bath_id", ""))}
	if bool(brew_res.get("full", false)):
		return {"ok": true, "action": "status"}
	var next_b := GameManager.cycle_hotspring_bath()
	var nb_name := EconomyConfig.get_item_display_name(next_b)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudHotspringInn.SLOT_X, GROUND_Y - 64.0),
		EconomyConfig.tr_fmt("ft_w_hs_cycle", [nb_name]),
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_bath", "bath_id": next_b}

## ==================================================================
## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`)
## ==================================================================
func _build_harbor_boats() -> void:
	harbor_boats.clear()
	for i in range(EconomyConfig.HARBOR_BOAT_COUNT):
		var sp := Sprite2D.new()
		sp.name = "HarborFishingBoat_%d" % i
		sp.centered = true
		sp.region_enabled = false
		sp.hframes = 1
		sp.vframes = 1
		sp.frame = 0
		sp.z_index = EconomyConfig.Z_UNIT
		sp.z_as_relative = false
		sp.visible = false
		ysort_layer.add_child(sp)
		harbor_boats.append({"idx": i, "sprite": sp, "state": "docked"})
	_apply_harbor_boat_textures()

func _apply_harbor_boat_textures() -> void:
	if tex_fishing_boat == null:
		tex_fishing_boat = EconomyConfig.load_pixel_texture(EconomyConfig.FISHING_BOAT_TEX)
	if tex_fishing_boat == null:
		return
	var tw := maxf(1.0, float(tex_fishing_boat.get_width()))
	var th := maxf(1.0, float(tex_fishing_boat.get_height()))
	# Constant ~22px on-water footprint whatever the final art resolution is
	var sc := EconomyConfig.HARBOR_BOAT_TARGET_PX / maxf(tw, th)
	for hb in harbor_boats:
		var sp: Sprite2D = hb["sprite"]
		if sp == null:
			continue
		sp.texture = tex_fishing_boat
		sp.centered = true
		sp.region_enabled = false
		sp.hframes = 1
		sp.vframes = 1
		sp.frame = 0
		# GEMINI.md Law 2.2: bottom-center pivot -> `position` is the boat's waterline contact point
		sp.offset = Vector2(0.0, -th * 0.5)
		sp.scale = Vector2(sc, sc)

func get_harbor_boat_visual_size() -> Vector2:
	if tex_fishing_boat == null:
		return Vector2(EconomyConfig.HARBOR_BOAT_TARGET_PX, EconomyConfig.HARBOR_BOAT_TARGET_PX)
	var tw := maxf(1.0, float(tex_fishing_boat.get_width()))
	var th := maxf(1.0, float(tex_fishing_boat.get_height()))
	var sc := EconomyConfig.HARBOR_BOAT_TARGET_PX / maxf(tw, th)
	return Vector2(tw * sc, th * sc)

## Island 3 texture bobs by `roundf(sin(cloud_time * 0.55))` in `_draw()`; boats ride the same swell (relative footprint is constant).
func get_island3_bob() -> float:
	return roundf(sin(cloud_time * 0.55) * 1.0)

func _update_harbor_boats(isl3_on: bool) -> void:
	var harbor_on := isl3_on and GameManager != null and GameManager.lighthouse_harbor_unlocked
	if harbor_on and tex_fishing_boat == null:
		_apply_harbor_boat_textures()
	var wl_y := float(EconomyConfig.HARBOR_BOAT_LANE["waterline_y"])
	for hb in harbor_boats:
		var sp: Sprite2D = hb["sprite"]
		if sp == null:
			continue
		if not harbor_on:
			sp.visible = false
			continue
		var vis := GameManager.get_harbor_boat_visual(int(hb["idx"]))
		hb["state"] = String(vis["state"])
		hb["facing"] = float(vis["facing"])
		sp.visible = bool(vis["visible"])
		if not sp.visible:
			continue
		sp.position = Vector2(float(vis["x"]), wl_y + get_island3_bob())
		# The boat art faces west (bow left): flip while heading out east toward the cape
		sp.flip_h = float(vis["facing"]) > 0.0
		sp.modulate = Color(1.0, 1.0, 1.0, float(vis["alpha"]))

## Hull + near ripple-ring footprint of a boat relative to its waterline anchor (same water classifier as the star lanterns).
func get_harbor_boat_contact_points(x: float, dy_extra: float = 0.0) -> Array[Vector2]:
	var wl_y := float(EconomyConfig.HARBOR_BOAT_LANE["waterline_y"]) + dy_extra
	var pts: Array[Vector2] = []
	for dx in EconomyConfig.HARBOR_BOAT_HULL_DX:
		for dy in EconomyConfig.HARBOR_BOAT_HULL_DY:
			pts.append(Vector2(x + dx, wl_y + dy))
	return pts

func is_harbor_boat_on_water(x: float, dy_extra: float = 0.0) -> bool:
	for pt in get_harbor_boat_contact_points(x, dy_extra):
		if not is_island_texture_water(3, pt):
			return false
	return true

func get_harbor_boat_rect_at(x: float) -> Rect2:
	var sz := get_harbor_boat_visual_size()
	var wl_y := float(EconomyConfig.HARBOR_BOAT_LANE["waterline_y"])
	return Rect2(x - sz.x * 0.5, wl_y - sz.y, sz.x, sz.y)

func get_lighthouse_screen_rect() -> Rect2:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(3, false)) or lighthouse_harbor == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := lighthouse_harbor.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(
		clampf(top_left.x, 0.0, 1900.0),
		clampf(top_left.y, 0.0, 280.0),
		lr.size.x * z,
		lr.size.y * z
	)

## Click on the lighthouse: build it, then ship the catch to the stall.
func interact_with_lighthouse_harbor() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(3, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.lighthouse_harbor_unlocked:
		var ok := GameManager.unlock_lighthouse_harbor(false)
		if not ok and hud != null:
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var shipped := GameManager.ship_harbor_seafood_to_stall(3)
	if shipped > 0:
		EventBus.spawn_floating_text.emit(
			Vector2(LighthouseHarbor.SLOT_X, GROUND_Y - 70.0),
			EconomyConfig.tr_fmt("ft_w_fish_shipped", [shipped]),
			Color("#88D8FF")
		)
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.news(hud.building_status("lighthouse_harbor"))
	return {"ok": true, "action": "status"}

func reload_ci10_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_fishing_boat = EconomyConfig.load_pixel_texture(EconomyConfig.FISHING_BOAT_TEX)
	_apply_harbor_boat_textures()
	if lighthouse_harbor != null and lighthouse_harbor.has_method("reload_ci10_textures"):
		lighthouse_harbor.reload_ci10_textures()

## ==================================================================
## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
## ==================================================================
func reload_ci11_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if dairy_workshop != null and dairy_workshop.has_method("reload_ci11_textures"):
		dairy_workshop.reload_ci11_textures()
	if open_air_cinema != null and open_air_cinema.has_method("reload_ci11_textures"):
		open_air_cinema.reload_ci11_textures()

func get_dairy_workshop_screen_rect() -> Rect2:
	if dairy_workshop == null:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := dairy_workshop.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(clampf(top_left.x, 0.0, 1900.0), clampf(top_left.y, 0.0, 280.0), lr.size.x * z, lr.size.y * z)

func get_open_air_cinema_screen_rect() -> Rect2:
	if open_air_cinema == null or not open_air_cinema.visible:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := open_air_cinema.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(clampf(top_left.x, 0.0, 1900.0), clampf(top_left.y, 0.0, 280.0), lr.size.x * z, lr.size.y * z)

func is_cinema_prop_shown() -> bool:
	return open_air_cinema != null and open_air_cinema.visible and open_air_cinema.show_alpha > 0.05

## Click on the dairy barn: build it -> craft cheese / pudding when milk is in the cold store -> milk the herd -> ship to the stall.
func interact_with_dairy_workshop() -> Dictionary:
	if GameManager == null:
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.dairy_workshop_unlocked:
		var ok := GameManager.unlock_dairy_workshop(false)
		if not ok and hud != null:
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var c_res := GameManager.craft_dairy_product("")
	if not bool(c_res.get("crafted", false)):
		for alt_id in EconomyConfig.DAIRY_RECIPE_ORDER:
			c_res = GameManager.craft_dairy_product(alt_id)
			if bool(c_res.get("crafted", false)):
				break
	if bool(c_res.get("crafted", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(DairyWorkshop.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_dairy_made", [EconomyConfig.get_item_display_name(String(c_res.get("item_id", ""))), int(c_res.get("stock", 1))]),
			Color("#FFF4D6")
		)
		return {"ok": true, "action": "craft", "item_id": String(c_res.get("item_id", ""))}
	var m_res := GameManager.milk_dairy_cows(false)
	if bool(m_res.get("milked", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(DairyWorkshop.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_milked", [int(m_res.get("qty", 0)), EconomyConfig.get_item_display_name(String(m_res.get("feed", "")))]),
			Color("#FFF4D6")
		)
		return {"ok": true, "action": "milk", "qty": int(m_res.get("qty", 0))}
	var shipped := GameManager.ship_dairy_to_stall(3)
	if shipped > 0:
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.news(EconomyConfig.tr_key("bn_no_items"))
	return {"ok": true, "action": "status"}

## Click on the night cinema: build it (dim night preview) -> sell intermission snacks / show the programme.
func interact_with_open_air_cinema() -> Dictionary:
	if GameManager == null or open_air_cinema == null or not open_air_cinema.visible:
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.open_air_cinema_unlocked:
		var ok := GameManager.unlock_open_air_cinema(false)
		if not ok and hud != null:
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	if GameManager.is_cinema_open() and GameManager.cinema_snacks_tonight >= Pacing.SNACKS_PER_NIGHT:
		return {"ok": true, "action": "status"}
	var snack := GameManager.sell_cinema_snacks(1)
	if int(snack.get("sold", 0)) > 0:
		EventBus.spawn_floating_text.emit(
			Vector2(OpenAirCinema.SLOT_X, GROUND_Y - 52.0),
			EconomyConfig.tr_fmt("ft_w_snack", [int(snack.get("gold", 0))]),
			Color("#FFE066")
		)
		return {"ok": true, "action": "snack", "gold": int(snack.get("gold", 0))}
	if hud != null:
		var sm := GameManager.get_cinema_status_summary()
		hud.news(EconomyConfig.tr_key("bn_night"))
	return {"ok": true, "action": "status"}

## ==================================================================
## CI-12: Cloud Pottery Kiln Workshop (`云端陶艺窑坊`)
## ==================================================================
func reload_ci12_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if pottery_kiln != null and pottery_kiln.has_method("reload_ci12_textures"):
		pottery_kiln.reload_ci12_textures()

func get_pottery_kiln_screen_rect() -> Rect2:
	if pottery_kiln == null or not pottery_kiln.visible:
		return Rect2()
	var z := maxf(0.1, companion_zoom)
	var lr := pottery_kiln.get_local_hit_rect()
	var top_left := world_root.position + lr.position * z
	return Rect2(clampf(top_left.x, 0.0, 1900.0), clampf(top_left.y, 0.0, 280.0), lr.size.x * z, lr.size.y * z)

## Click on the kiln: build it -> fire the active ware when clay + fuel are ready -> ship the shelf to the stall -> status.
func interact_with_pottery_kiln() -> Dictionary:
	if GameManager == null or pottery_kiln == null or not pottery_kiln.visible:
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.pottery_kiln_unlocked:
		var ok := GameManager.unlock_pottery_kiln(false)
		if not ok and hud != null:
			hud.news(EconomyConfig.tr_key("bn_no_gold"))
		return {"ok": ok, "action": "unlock"}
	var f_res := GameManager.fire_pottery("")
	if not bool(f_res.get("fired", false)):
		for alt_id in EconomyConfig.POTTERY_RECIPE_ORDER:
			f_res = GameManager.fire_pottery(alt_id)
			if bool(f_res.get("fired", false)):
				break
	if bool(f_res.get("fired", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(PotteryKiln.SLOT_X, GROUND_Y - 58.0),
			EconomyConfig.tr_fmt("ft_w_fired", [EconomyConfig.get_item_display_name(String(f_res.get("item_id", ""))), int(f_res.get("stock", 1))]),
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "fire", "item_id": String(f_res.get("item_id", ""))}
	var shipped := GameManager.ship_pottery_to_stall(3)
	if shipped > 0:
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.news(hud.building_status("pottery_kiln"))
	return {"ok": true, "action": "status"}

## ==================================================================
## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) & Island Four-Season Dress-Up (`岛屿四季装扮`) — no new building
## ==================================================================
func reload_ci13_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_kites.clear()
	for k_id in EconomyConfig.KITE_ORDER:
		tex_kites[k_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.KITE_TYPES[k_id]["tex"]))
	tex_kite_festival_icon = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_KITE_FESTIVAL_TEX)
	tex_season_decos.clear()
	_season_deco_used_rects.clear()
	for s_id in EconomyConfig.SEASON_ORDER:
		tex_season_decos[s_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SEASONS[s_id]["tex"]))
	for i in range(kite_sprites.size()):
		var k_id2 := String(EconomyConfig.KITE_SLOTS[i]["kite_id"])
		kite_sprites[i].texture = tex_kites.get(k_id2, null)
	_apply_season_dress(true)

func _build_kite_and_season_props() -> void:
	tex_kites.clear()
	for k_id in EconomyConfig.KITE_ORDER:
		tex_kites[k_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.KITE_TYPES[k_id]["tex"]))
	tex_kite_festival_icon = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_KITE_FESTIVAL_TEX)
	for s_id in EconomyConfig.SEASON_ORDER:
		tex_season_decos[s_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SEASONS[s_id]["tex"]))

	# Ribbon tails + festival icon, drawn just under the kites (sky layer, same space as `world_root`)
	kite_fx_layer = Node2D.new()
	kite_fx_layer.name = "KiteFestivalFxLayer"
	kite_fx_layer.z_index = EconomyConfig.Z_CARRY_EMOTE - 1
	kite_fx_layer.z_as_relative = false
	world_root.add_child(kite_fx_layer)
	kite_fx_layer.draw.connect(_draw_kite_fx)

	kite_sprites.clear()
	for i in range(EconomyConfig.KITE_SLOTS.size()):
		var sl: Dictionary = EconomyConfig.KITE_SLOTS[i]
		var ks := Sprite2D.new()
		ks.name = "Kite_%d_%s" % [i, String(sl["kite_id"])]
		ks.texture = tex_kites.get(String(sl["kite_id"]), null)
		ks.centered = true
		ks.region_enabled = false
		ks.hframes = 1
		ks.vframes = 1
		ks.frame = 0
		ks.scale = Vector2(EconomyConfig.KITE_SCALE, EconomyConfig.KITE_SCALE)
		ks.position = EconomyConfig.calc_kite_position(i, 0, 0.0)
		ks.z_index = EconomyConfig.Z_CARRY_EMOTE
		ks.z_as_relative = false
		ks.visible = false
		world_root.add_child(ks)
		kite_sprites.append(ks)

	# Seasonal dress-up props: small grounded decorations in free 28px gaps (non-building, z = Z_BUILDING like decor)
	season_deco_nodes.clear()
	for spot in EconomyConfig.SEASON_DECO_SPOTS:
		var dn := Sprite2D.new()
		dn.name = "SeasonDeco_%s" % String(spot["id"])
		dn.centered = true
		dn.region_enabled = false
		dn.hframes = 1
		dn.vframes = 1
		dn.frame = 0
		dn.position = Vector2(float(spot["x"]), GROUND_Y)
		dn.z_index = EconomyConfig.Z_BUILDING
		dn.z_as_relative = false
		ysort_layer.add_child(dn)
		season_deco_nodes.append(dn)
	_apply_season_dress(true)

	if EventBus != null:
		EventBus.season_changed.connect(_on_season_changed)
		EventBus.kite_collected.connect(_on_kite_collected)

func _on_season_changed(_season_id: String) -> void:
	_apply_season_dress(true)

## Swap every seasonal prop to the current season's texture (bottom-center pivot, GEMINI.md Law 2.2) and retarget the tint.
func _apply_season_dress(snap_tint: bool = false) -> void:
	if GameManager == null:
		return
	var s_id := GameManager.get_current_season_id()
	var tex: Texture2D = tex_season_decos.get(s_id, null)
	if tex == null:
		tex = EconomyConfig.load_pixel_texture(String(EconomyConfig.SEASONS[s_id]["tex"]))
		tex_season_decos[s_id] = tex
	for i in range(season_deco_nodes.size()):
		var dn: Sprite2D = season_deco_nodes[i]
		_apply_season_deco_texture(dn, tex)
		dn.position = Vector2(float(EconomyConfig.SEASON_DECO_SPOTS[i]["x"]), GROUND_Y)
		dn.flip_h = i % 2 == 1
	season_dress_id = s_id
	season_tint = EconomyConfig.SEASONS[s_id]["tint"]
	if snap_tint:
		self_modulate = season_tint
	_sync_season_deco_visibility()

## The prop's frame = the texture's solid used-rect (transparent margins cropped via `region_rect`, hframes = vframes = 1),
## so `offset = Vector2(0, -frame_h * 0.5)` (GEMINI.md Law 2.2) plants its lowest opaque row exactly on `GROUND_Y` whatever
## padding the final pixel art carries.
func _apply_season_deco_texture(sp: Sprite2D, tex: Texture2D) -> void:
	if sp == null:
		return
	sp.texture = tex
	sp.centered = true
	sp.hframes = 1
	sp.vframes = 1
	sp.frame = 0
	var used := Rect2(0.0, 0.0, float(tex.get_width()), float(tex.get_height())) if tex != null else Rect2()
	if tex != null:
		var key := tex.resource_path if tex.resource_path != "" else str(tex.get_instance_id())
		if _season_deco_used_rects.has(key):
			used = _season_deco_used_rects[key]
		else:
			var img := tex.get_image()
			if img != null and img.is_compressed():
				img.decompress()
			if img != null:
				# solid (alpha > 0.5) bounding box: faint anti-aliased fringe rows never decide the ground-contact row
				var x0 := img.get_width()
				var y0 := img.get_height()
				var x1 := -1
				var y1 := -1
				for py in range(img.get_height()):
					for px in range(img.get_width()):
						if img.get_pixel(px, py).a > 0.5:
							x0 = mini(x0, px)
							y0 = mini(y0, py)
							x1 = maxi(x1, px)
							y1 = maxi(y1, py)
				if x1 >= x0 and y1 >= y0:
					used = Rect2(float(x0), float(y0), float(x1 - x0 + 1), float(y1 - y0 + 1))
			_season_deco_used_rects[key] = used
	sp.region_enabled = tex != null
	sp.region_rect = used
	sp.offset = Vector2(0.0, -used.size.y * 0.5)
	sp.scale = Vector2(EconomyConfig.SEASON_DECO_SCALE, EconomyConfig.SEASON_DECO_SCALE)

func _sync_season_deco_visibility() -> void:
	for i in range(season_deco_nodes.size()):
		var isl := int(EconomyConfig.SEASON_DECO_SPOTS[i]["island"])
		season_deco_nodes[i].visible = GameManager != null and bool(GameManager.unlocked_islands.get(isl, false))

func get_season_tint() -> Color:
	return season_tint

## Rendered rect of seasonal prop `i` (local coords of `world_root`, from its texture + scale + bottom-center offset)
func get_season_deco_local_rect(i: int) -> Rect2:
	if i < 0 or i >= season_deco_nodes.size() or season_deco_nodes[i].texture == null:
		return Rect2()
	var dn: Sprite2D = season_deco_nodes[i]
	var fr := dn.region_rect.size if dn.region_enabled else Vector2(dn.texture.get_size())
	var w := fr.x * dn.scale.x
	var h := fr.y * dn.scale.y
	return Rect2(dn.position.x - w * 0.5, dn.position.y - h, w, h)

func _update_season_dress(delta: float) -> void:
	if GameManager == null:
		return
	if season_dress_id != GameManager.get_current_season_id():
		_apply_season_dress(false)
	_sync_season_deco_visibility()
	self_modulate = self_modulate.lerp(Color(season_tint, WindowController.get_ground_alpha()), minf(1.0, delta * 3.5))

## ---------------- Kite Festival (sky lanes above Island 2 and Island 3) ----------------
func get_kite_local_rect(slot_idx: int) -> Rect2:
	if slot_idx < 0 or slot_idx >= kite_sprites.size():
		return Rect2()
	return EconomyConfig.get_kite_footprint(kite_sprites[slot_idx].position)

## Kite slot under a local point (`-1` if none): only flying (uncollected) kites can be clicked
func get_kite_at_local_point(local_pt: Vector2) -> int:
	if GameManager == null or not GameManager.is_kite_festival_active():
		return -1
	for i in range(kite_sprites.size()):
		if kite_sprites[i].visible and GameManager.is_kite_available(i) and get_kite_local_rect(i).grow(2.0).has_point(local_pt):
			return i
	return -1

## Screen rects of the flying kites -> clickable notches in the desktop passthrough polygon
func get_kite_screen_rects() -> Array:
	var out: Array = []
	if GameManager == null or not GameManager.is_kite_festival_active():
		return out
	var z := maxf(0.1, companion_zoom)
	for i in range(kite_sprites.size()):
		if kite_sprites[i].visible and GameManager.is_kite_available(i):
			var lr := get_kite_local_rect(i).grow(2.0)
			out.append(Rect2(world_root.position + lr.position * z, lr.size * z))
	return out

func interact_with_kite(slot_idx: int) -> Dictionary:
	if GameManager == null:
		return {"collected": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var res := GameManager.collect_kite(slot_idx)
	if bool(res.get("collected", false)) and hud != null:
		var k_name := EconomyConfig.get_item_display_name(String(res.get("kite_id", "")))
		if bool(res.get("swept", false)):
			hud.news(EconomyConfig.tr_key("bn_medal"))
	return res

func _on_kite_collected(slot_idx: int, kite_id: String, gold: int) -> void:
	if slot_idx < 0 or slot_idx >= kite_sprites.size():
		return
	kite_sprites[slot_idx].visible = false
	EventBus.spawn_floating_text.emit(
		kite_sprites[slot_idx].position + Vector2(0.0, 26.0),
		"+%dG %s" % [gold, EconomyConfig.tr_name(String(EconomyConfig.KITE_TYPES.get(kite_id, {}).get("short_name", "风筝")))],
		Color("#9BE7FF")
	)
	if kite_fx_layer != null:
		kite_fx_layer.queue_redraw()

func _update_kite_festival(_delta: float) -> void:
	var active := GameManager != null and GameManager.is_kite_festival_active()
	var wv := GameManager.get_kite_wind_vector() if active else 0.0
	for i in range(kite_sprites.size()):
		var ks: Sprite2D = kite_sprites[i]
		var fly := active and GameManager.is_kite_available(i)
		ks.visible = fly
		if fly:
			ks.position = GameManager.get_kite_slot_position(i)
			# The art flies an east wind (ribbons / string stream to the right): mirror it when the gust blows west
			ks.flip_h = wv < 0.0
	if kite_fx_layer != null:
		kite_fx_layer.queue_redraw()

## The festival icon (spool + kite) in front of the sky badge (the kites' strings / ribbons are part of their pixel art)
func _draw_kite_fx() -> void:
	if kite_fx_layer == null or GameManager == null or not GameManager.is_kite_festival_active():
		return

## Island texture pixel under a local point (Island 1 / 2 / 3), used to prove seasonal props stand on solid ground
func _get_island_ground_image(isl: int) -> Image:
	if isl == 1 or isl == 3:
		return _get_island_water_image(isl)
	if _island_water_images.has(100 + isl):
		return _island_water_images[100 + isl]
	var img: Image = tex_glowwood.get_image() if tex_glowwood != null else null
	if img != null and img.is_compressed():
		img.decompress()
	_island_water_images[100 + isl] = img
	return img

func is_island_solid_ground(isl: int, local_pt: Vector2) -> bool:
	var img := _get_island_ground_image(isl)
	if img == null:
		return false
	var origin := ISLAND_1_TEX_ORIGIN if isl == 1 else (ISLAND_3_TEX_ORIGIN if isl == 3 else ISLAND_2_TEX_ORIGIN)
	var tx := roundi(local_pt.x - origin.x)
	var ty := roundi(local_pt.y - origin.y)
	if tx < 0 or ty < 0 or tx >= img.get_width() or ty >= img.get_height():
		return false
	if img.get_pixel(tx, ty).a <= 0.78:
		return false
	return isl == 2 or not is_island_texture_water(isl, local_pt)

## ==================================================================
## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`) — sky layer (the Birthday Party is a HUD panel)
## ==================================================================
var _used_rects: Dictionary = {}

func _get_used_rect(tex: Texture2D) -> Rect2:
	if tex == null:
		return Rect2()
	var key := tex.resource_path if tex.resource_path != "" else str(tex.get_instance_id())
	if _used_rects.has(key):
		return _used_rects[key]
	var used := Rect2(0.0, 0.0, float(tex.get_width()), float(tex.get_height()))
	var img := tex.get_image()
	if img != null and img.is_compressed():
		img.decompress()
	if img != null:
		var x0 := img.get_width()
		var y0 := img.get_height()
		var x1 := -1
		var y1 := -1
		for py in range(img.get_height()):
			for px in range(img.get_width()):
				if img.get_pixel(px, py).a > 0.5:
					x0 = mini(x0, px)
					y0 = mini(y0, py)
					x1 = maxi(x1, px)
					y1 = maxi(y1, py)
		if x1 >= x0 and y1 >= y0:
			used = Rect2(float(x0), float(y0), float(x1 - x0 + 1), float(y1 - y0 + 1))
	_used_rects[key] = used
	return used

func reload_ci15_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	_used_rects.clear()
	tex_weather.clear()
	for w_id in EconomyConfig.SKY_WEATHER_ORDER:
		tex_weather[w_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SKY_WEATHERS[w_id]["tex"]))
	_apply_weather_emblems()

func _build_sky_weather_layer() -> void:
	tex_weather.clear()
	for w_id in EconomyConfig.SKY_WEATHER_ORDER:
		tex_weather[w_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SKY_WEATHERS[w_id]["tex"]))
	weather_sky_layer = Node2D.new()
	weather_sky_layer.name = "CloudSeaWeatherLayer"
	weather_sky_layer.z_index = EconomyConfig.SKY_WEATHER_Z
	weather_sky_layer.z_as_relative = false
	world_root.add_child(weather_sky_layer)
	weather_sky_layer.draw.connect(_draw_sky_weather)
	weather_emblems.clear()
	weather_emblem_zone_idx.clear()
	for zi in range(EconomyConfig.SKY_WEATHER_ZONES.size()):
		if String(EconomyConfig.SKY_WEATHER_ZONES[zi]["kind"]) != "sky":
			continue
		var em := Sprite2D.new()
		em.name = "WeatherEmblem_%s" % String(EconomyConfig.SKY_WEATHER_ZONES[zi]["id"])
		em.centered = true
		em.hframes = 1
		em.vframes = 1
		em.frame = 0
		em.z_index = EconomyConfig.SKY_WEATHER_Z
		em.z_as_relative = false
		# added after the primitive layer -> drawn over the rays / rain at the same z
		world_root.add_child(em)
		weather_emblems.append(em)
		weather_emblem_zone_idx.append(zi)
	snap_sky_weather()

## Jump straight to the current weather (no cross-fade): start-up, self-test showcase
func snap_sky_weather() -> void:
	weather_vis_id = GameManager.get_sky_weather_id() if GameManager != null else "sunny"
	weather_vis_alpha = 1.0
	_apply_weather_emblems()
	_update_sky_weather(0.0)

## Emblem frame = the art's solid used-rect (transparent margins cropped), scaled so its longer side is 30px
func _apply_weather_emblems() -> void:
	var tex: Texture2D = tex_weather.get(weather_vis_id, null)
	if tex == null and weather_vis_id != "":
		tex = EconomyConfig.load_pixel_texture(String(EconomyConfig.get_sky_weather_info(weather_vis_id)["tex"]))
		tex_weather[weather_vis_id] = tex
	var used := _get_used_rect(tex)
	var sc := EconomyConfig.SKY_WEATHER_EMBLEM_PX / maxf(1.0, maxf(used.size.x, used.size.y))
	for em in weather_emblems:
		em.texture = tex
		em.region_enabled = tex != null
		em.region_rect = used
		em.offset = Vector2.ZERO
		em.scale = Vector2(sc, sc)

## Night hides the sun (clear night = stars only) and dims the rainbow
func get_weather_emblem_alpha_factor(w_id: String) -> float:
	var night := GameManager != null and GameManager.current_weather == GameManager.WeatherState.NIGHT
	if not night:
		return 1.0
	if w_id == "sunny":
		return 0.0
	if w_id == "rainbow":
		return 0.55
	return 1.0

func _update_sky_weather(delta: float) -> void:
	if GameManager == null:
		return
	var target := GameManager.get_sky_weather_id()
	weather_vis_time += delta
	if weather_vis_id != target:
		# cross-fade: the old weather fades out, then the new one fades in
		weather_vis_alpha = maxf(0.0, weather_vis_alpha - delta / EconomyConfig.SKY_WEATHER_FADE_SEC)
		if weather_vis_alpha <= 0.0:
			weather_vis_id = target
			_apply_weather_emblems()
	else:
		weather_vis_alpha = minf(1.0, weather_vis_alpha + delta / EconomyConfig.SKY_WEATHER_FADE_SEC)
	var em_a := weather_vis_alpha * get_weather_emblem_alpha_factor(weather_vis_id)
	for i in range(weather_emblems.size()):
		var em: Sprite2D = weather_emblems[i]
		em.position = EconomyConfig.get_sky_weather_emblem_center(weather_emblem_zone_idx[i], weather_vis_id, weather_vis_time)
		em.modulate.a = em_a
		em.visible = em.texture != null and em_a > 0.01
	if weather_sky_layer != null:
		weather_sky_layer.queue_redraw()

## Rendered rect of emblem `i` (local coords of `world_root`)
func get_weather_emblem_local_rect(i: int) -> Rect2:
	if i < 0 or i >= weather_emblems.size() or weather_emblems[i].texture == null:
		return Rect2()
	var em: Sprite2D = weather_emblems[i]
	var fr := em.region_rect.size if em.region_enabled else Vector2(em.texture.get_size())
	var sz := fr * em.scale
	return Rect2(em.position - sz * 0.5, sz)

## The primitives drawn right now (the self-test checks they all stay inside their zones)
func get_sky_weather_fx_now() -> Array:
	var night := GameManager != null and GameManager.current_weather == GameManager.WeatherState.NIGHT
	return EconomyConfig.build_sky_weather_fx(weather_vis_id, weather_vis_time, night, weather_vis_alpha)

func _draw_sky_weather() -> void:
	if weather_sky_layer == null or weather_vis_id == "":
		return
	for p in get_sky_weather_fx_now():
		match String(p["k"]):
			"rect":
				weather_sky_layer.draw_rect(p["r"], p["c"], true)
			"line":
				weather_sky_layer.draw_line(p["a"], p["b"], p["c"], float(p["w"]))
			"poly":
				weather_sky_layer.draw_polyline(p["p"], p["c"], float(p["w"]))
			"tex":
				var w_tex: Texture2D = tex_weather.get(String(p["w_id"]), null)
				if w_tex != null:
					weather_sky_layer.draw_texture_rect_region(w_tex, p["r"], _get_used_rect(w_tex), p["c"])

func dock_airship_at_harbor(force_new_order: bool = false) -> Dictionary:
	var ord := GameManager.dock_airship_caravan(force_new_order)
	airship_pos = AIRSHIP_HARBOR_DOCK_POS
	airship_visual_alpha = 1.0
	_apply_airship_texture()
	if airship_sprite != null:
		airship_sprite.visible = true
		airship_sprite.position = airship_pos
		airship_sprite.modulate.a = 1.0
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
				EconomyConfig.tr_fmt("ft_w_air_load", [loaded_cnt, str(sum["delivered"]), str(sum["required"])]),
				Color("#8CE99A")
			)
		elif hud != null:
			hud.news(String(sum["brief"]))
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
	# CI-13: the season's atmosphere tint (spring blush / summer glow / autumn amber / winter frost) layers on the weather
	_update_season_dress(delta)
	target_tint = Color(target_tint.r * season_tint.r, target_tint.g * season_tint.g, target_tint.b * season_tint.b, 1.0)
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
		chimney_wisps.append({"x": 740.2, "y": 80.0, "r": 3.2, "alpha": 0.55})
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

	var parade_active := GameManager != null and GameManager.is_gourmet_parade_active()
	var moon_tea_active := GameManager != null and GameManager.is_moon_tea_gathering_active()
	var wish_fest_active := GameManager != null and GameManager.is_wish_lantern_festival_active()
	var boat_visible := GameManager != null and (moon_tea_active or GameManager.tea_pavilion_unlocked)
	var max_cust_cap := (6 if (parade_active or moon_tea_active or wish_fest_active) else 4) if isl3_on else (5 if (parade_active or moon_tea_active or wish_fest_active) else 3)
	var spawn_rate_mult := 1.85 if (parade_active or moon_tea_active or wish_fest_active) else 1.0
	# CI-11: the night cinema draws extra night-market visitors (+1 visitor slot, faster arrivals) while it is open
	var cinema_open := GameManager != null and GameManager.is_cinema_open()
	if cinema_open:
		max_cust_cap += 1
		spawn_rate_mult *= GameManager.get_cinema_visitor_spawn_mult()
	_update_kite_festival(delta)
	# CI-15: the cloud-sea weather stacks on the event visitor rate (bonus capped at x2.20, a rain / mist dip always applies)
	if GameManager != null:
		spawn_rate_mult = GameManager.apply_sky_weather_visitor_mult(spawn_rate_mult)
	_update_sky_weather(delta)

	_update_wish_lanterns(delta, GameManager != null and GameManager.can_claim_wish_lantern(), isl3_on)
	_update_harbor_boats(isl3_on)

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
	else:
		if moon_tea_boat_sprite != null:
			moon_tea_boat_sprite.visible = false

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
	else:
		if parade_float_sprite != null:
			parade_float_sprite.visible = false

	customer_spawn_timer -= delta * spawn_rate_mult
	if customer_spawn_timer <= 0.0:
		var gap: Array[float] = Pacing.CUSTOMER_GAP if bool(GameManager.unlocked_islands.get(2, false)) else Pacing.CUSTOMER_GAP_START
		customer_spawn_timer = randf_range(gap[0], gap[1])
		if customers.size() < max_cust_cap:
			var roll_vip := randf() < GameManager.get_weather_vip_chance()
			_spawn_customer(roll_vip)

	special_visitor_timer -= delta
	if special_visitor_timer <= 0.0:
		special_visitor_timer = randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
		if customers.size() < max_cust_cap:
			if GameManager.has_surplus_crops_for_merchant() and randf() < 0.52:
				spawn_special_visitor(CustomerNPC.VisitorRole.CARAVAN_MERCHANT)
			else:
				spawn_special_visitor(CustomerNPC.VisitorRole.GOURMET_CRITIC)

	if isl3_on:
		vip_customer_timer -= delta
		if vip_customer_timer <= 0.0:
			vip_customer_timer = randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
			if customers.size() < max_cust_cap:
				_spawn_customer(true)

	collector_visitor_timer -= delta
	if collector_visitor_timer <= 0.0:
		collector_visitor_timer = randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
		if customers.size() < max_cust_cap and GameManager != null and GameManager.has_souvenir_box_for_collector():
			spawn_special_visitor(CustomerNPC.VisitorRole.COLLECTOR_TOURIST)

	if isl3_on:
		hotspring_vip_timer -= delta
		if hotspring_vip_timer <= 0.0:
			hotspring_vip_timer = randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
			if customers.size() < max_cust_cap and GameManager != null and GameManager.has_bath_for_vip_guest():
				spawn_special_visitor(CustomerNPC.VisitorRole.HOTSPRING_VIP_GUEST)

	if isl2_on and GameManager != null and GameManager.windmill_unlocked:
		parade_tourist_timer -= delta
		if parade_tourist_timer <= 0.0:
			parade_tourist_timer = randf_range(Pacing.FESTIVAL_VISITOR_GAP[0], Pacing.FESTIVAL_VISITOR_GAP[1]) if parade_active else randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
			if customers.size() < max_cust_cap and GameManager.has_bread_for_parade_tourist():
				spawn_special_visitor(CustomerNPC.VisitorRole.PARADE_GOURMET_TOURIST)

	if GameManager != null and GameManager.tea_pavilion_unlocked:
		tea_connoisseur_timer -= delta
		if tea_connoisseur_timer <= 0.0:
			tea_connoisseur_timer = randf_range(Pacing.FESTIVAL_VISITOR_GAP[0], Pacing.FESTIVAL_VISITOR_GAP[1]) if moon_tea_active else randf_range(Pacing.SPECIAL_GAP[0], Pacing.SPECIAL_GAP[1])
			if customers.size() < max_cust_cap and GameManager.has_tea_for_connoisseur():
				spawn_special_visitor(CustomerNPC.VisitorRole.TEA_CONNOISSEUR)

	_update_hover_hint()
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
			get_moon_tea_boat_screen_rect(),
			get_kite_screen_rects()
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
	if tex_glowwood != null:
		draw_texture(tex_glowwood, Vector2(64.0, oy + 74.0 + bob), isl2_tint)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(492.0, oy + 124.0 + bob + roundf(left_sag)), isl2_tint)

	var isl3_tint := Color.WHITE if bool(GameManager.unlocked_islands.get(3, false)) else Color(0.55, 0.62, 0.72, 0.42)
	if tex_bridge != null:
		draw_texture(tex_bridge, Vector2(1312.0, oy + 118.0 + bob + roundf(right_sag)), isl3_tint)
	if tex_coral != null:
		draw_texture(tex_coral, Vector2(1396.0, oy + 74.0 + bob), isl3_tint)

	if tex_meadow != null:
		draw_texture(tex_meadow, Vector2(560.0, oy + 70.0))

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
	# (CI-11: the bollard stands on the east headland, so it is stowed while the night cinema occupies the headland)
	if GameManager != null and GameManager.airship_docked and airship_visual_alpha > 0.35 and not is_cinema_prop_shown():
		draw_rect(Rect2(1338.0, oy + 110.0, 6.0, 14.0), Color("#5C3A21"), true)
		draw_rect(Rect2(1337.0, oy + 108.0, 8.0, 3.0), Color("#FFD43B"), true)
		draw_line(
			Vector2(1341.0, oy + 108.0),
			Vector2(airship_pos.x - 4.0, oy + airship_pos.y + 22.0),
			Color(0.92, 0.80, 0.52, 0.68 * airship_visual_alpha),
			1.5
		)

	# v2.3 Direction 1 + CI-2: Dusk/Night lotus pond fireflies, drizzle
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

		# CI-9: warm reflection streaks + rising wish sparks for each drifting star lantern (strictly on the water band)
		for wl in wish_lanterns:
			var wl_sp: Sprite2D = wl["sprite"]
			if wl_sp == null or not wl_sp.visible:
				continue
			var wl_a := wl_sp.modulate.a
			var wl_shimmer := 0.55 + 0.35 * sin(cloud_time * 3.4 + float(wl["phase"]))
			var wl_y := oy + wl_sp.position.y
			draw_rect(Rect2(roundf(wl_sp.position.x - 5.0), roundf(wl_y), 10.0, 1.0), Color(1.0, 0.86, 0.52, 0.55 * wl_shimmer * wl_a), true)
			var spark_t := fmod(cloud_time * 0.9 + float(wl["phase"]), 1.0)
			draw_rect(Rect2(roundf(wl_sp.position.x - 1.0 + sin(cloud_time * 2.0 + float(wl["phase"])) * 2.0), roundf(wl_y - 19.0 - spark_t * 10.0), 2.0, 2.0), Color(1.0, 0.95, 0.70, (1.0 - spark_t) * 0.75 * wl_a), true)

		# CI-10: short white wake streaks trailing a sailing fishing boat (kept inside the validated hull footprint rows)
		var lane_min_x := float(EconomyConfig.HARBOR_BOAT_LANE["berth_x"]) - 9.0
		var lane_max_x := float(EconomyConfig.HARBOR_BOAT_LANE["sea_x"]) + 9.0
		for hb in harbor_boats:
			var hb_sp: Sprite2D = hb["sprite"]
			if hb_sp == null or not hb_sp.visible or String(hb.get("state", "docked")) == "docked":
				continue
			var hb_dir := float(hb.get("facing", 1.0))
			var hb_a := hb_sp.modulate.a
			for wi in range(3):
				var wake_phase := fmod(cloud_time * 2.2 + float(wi) * 0.33, 1.0)
				var wx := clampf(hb_sp.position.x - hb_dir * (8.0 + float(wi) * 3.0 + wake_phase * 2.0), lane_min_x, lane_max_x - 3.0)
				draw_rect(Rect2(roundf(wx), roundf(oy + hb_sp.position.y - 3.0), 3.0, 1.0), Color(0.95, 1.0, 1.0, 0.55 * (1.0 - wake_phase) * hb_a), true)

	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func get_pond_koi_positions() -> Array[Vector2]:
	var out: Array[Vector2] = []
	for k in pond_koi:
		out.append(Vector2(float(k["x"]), float(k["y"])))
	return out
