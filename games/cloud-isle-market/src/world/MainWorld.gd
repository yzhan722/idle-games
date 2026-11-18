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
	## (`orbis_work_3` width = union of its mortar + cauldron sprites, see `Workshop.ORBIS_VISUAL_WIDTH`.)
	## CI-12: slot 1 (Bridge 2 landing) now holds `PotteryKiln_3` instead of the decorative duplicate apple tree: same 112px
	## texture width at the same 0.39 scale (43.68px), so the kiln|soil gap stays 28.06px with zero re-layout. A 4th islet was
	## rejected because the fixed 1920x300 strip only has 64px of sky beyond Island 2 / Island 3 (it would sit off-screen).
	3: [
		{"id": "pottery_kiln_3", "x": 1437.8, "tex_w": 112.0, "tex_h": 104.0, "scale": 0.39},
		{"id": "soil_plot_3",    "x": 1519.7, "tex_w": 64.0,  "tex_h": 26.0,  "scale": 1.00},
		{"id": "orbis_work_3",   "x": 1601.3, "tex_w": 43.0,  "tex_h": 30.3,  "scale": 1.00},
		{"id": "hotspring_3",    "x": 1672.3, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.37},
		{"id": "lighthouse_3",   "x": 1743.4, "tex_w": 96.0,  "tex_h": 128.0, "scale": 0.45},
		{"id": "right_tiki_3",   "x": 1814.5, "tex_w": 116.0, "tex_h": 108.0, "scale": 0.37}
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

## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) on Lotus Pond & Island 3 coast shallows
const WISH_LANTERN_SCALE := 0.30
const WISH_LANTERN_TEX_SIZE := 64.0
const WISH_LANTERN_RESPAWN_SEC := 5.5
const ISLAND_1_TEX_ORIGIN := Vector2(560.0, 70.0)
const ISLAND_3_TEX_ORIGIN := Vector2(1396.0, 74.0)
const POND_BRIDGE_LOCAL_RECT := Rect2(1082.0, 118.0, 220.0, 38.0)
var tex_star_lantern: Texture2D
var wish_lanterns: Array[Dictionary] = []
var wish_lantern_label: Label
var _island_water_images: Dictionary = {}

## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`) fishing boats on the Island 3 east cove
var tex_fishing_boat: Texture2D
var harbor_boats: Array[Dictionary] = []

## CI-12: Islander Autumn Sports Day (`岛民秋季运动会`) on the Lotus Pond bridge track (event props only, no building)
const SPORTS_BADGE_Y := 24.0
const SPORTS_LANE_SPACING := 9.0
const SPORTS_TUG_MAX_SHIFT := 10.0
const SPORTS_TUG_INNER_DX := 34.0
const SPORTS_TUG_STEP_DX := 30.0
const SPORTS_ROPE_HAND_Y := 21.0
var tex_sports_flag: Texture2D
var tex_gold_medal: Texture2D
var sports_flag_west: Sprite2D
var sports_flag_east: Sprite2D
var sports_medal_sprite: Sprite2D
var sports_badge_label: Label
var sports_rope_layer: Node2D
var sports_athletes: Dictionary = {}

## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) in the open sky lanes above Island 2 / Island 3 + seasonal dress-up props
## (`岛屿四季装扮`) in free 28px ground gaps with a per-season atmosphere tint. No new building, nothing shrunk or moved.
const ISLAND_2_TEX_ORIGIN := Vector2(64.0, 74.0)
const KITE_BADGE_WIND_COLORS: Array[Color] = [Color("#C5F6FA"), Color("#9BE7FF"), Color("#FFE066")]
var tex_kites: Dictionary = {}
var tex_kite_festival_icon: Texture2D
var tex_season_decos: Dictionary = {}
var kite_sprites: Array[Sprite2D] = []
var kite_fx_layer: Node2D
var kite_badge_label: Label
var season_deco_nodes: Array[Sprite2D] = []
var season_dress_id: String = ""
var season_tint: Color = Color.WHITE
var _season_deco_used_rects: Dictionary = {}

## CI-14: Cloud-Isle Photo Tour (`云岛观光摄影打卡`): 3 photo-spot signposts on the free ground next to the named landmarks
## + the straw-hat sightseer (a unit, z = Z_UNIT) whose camera / flash / photo card are drawn at hand height. The Islander
## Wish Board lives in the HUD (tab 2 card -> board panel): no scene building, nothing shrunk or moved.
var tex_photo_marker: Texture2D
var tex_photo_card: Texture2D
var tex_photo_camera: Texture2D
var tex_photo_tourist: Texture2D
var photo_marker_nodes: Array[Sprite2D] = []
var photo_tourist_root: Node2D
var photo_tourist_body: Sprite2D
var photo_fx_layer: Node2D
var photo_tourist_anim: float = 0.0
var _photo_used_rects: Dictionary = {}

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
	_build_sports_day_props()
	_build_kite_and_season_props()
	_build_photo_tour_props()
	_build_sky_weather_layer()

	EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)
	EventBus.gourmet_parade_started.connect(_on_gourmet_parade_started)
	EventBus.moon_tea_gathering_started.connect(_on_moon_tea_gathering_started)
	EventBus.wish_lantern_festival_started.connect(_on_wish_lantern_festival_started)
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
	# Island 1 (Henesys, CI-11 7-slot re-lay): AppleTree (x=585.9), SoilPlot (x=665.9), Cottage (x=746.9), Dairy (x=817.3),
	# Mortar (x=884.7), TeaPavilion (x=950.7), Stall (x=1022.7)
	# GEMINI.md Law 3.3: `apple_tree.png` & `cottage_mushroom.png` have built-in grass base shadows -> NO procedural shadow!
	tree_1_node = _make_grounded_prop(tex_tree, 585.9, 120, 0.355)
	tree_1_node.name = "AppleTree_1"
	ysort_layer.add_child(tree_1_node)

	cot_1_node = _make_grounded_prop(tex_cottage, 746.9, 114, 0.355)
	cot_1_node.name = "MushroomCottage_1"
	ysort_layer.add_child(cot_1_node)

	# Island 2 (Ellinia): Left Hut (x=89.1), SoilPlot (x=171.4), Cauldron (x=253.6), Cloud Greenhouse (x=325.9), Cloud Windmill Bakery (x=397.9), Chef Tasting Pavilion (x=469.9)
	left_hut_node = _make_grounded_prop(tex_left_hut, 89.1, 108, 0.395)
	left_hut_node.name = "LeftHut_2"
	ysort_layer.add_child(left_hut_node)
	island2_props.append(left_hut_node)

	# Island 3 (Orbis Coast, CI-10 re-slot + CI-12 kiln): Pottery Kiln (x=1437.8), SoilPlot (x=1519.7), Dual Workshop (x=1601.3),
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

	orbis_linked_workshop = Workshop.new()
	orbis_linked_workshop.name = "OrbisWorkshop_3"
	orbis_linked_workshop.setup_workshop("orbis_linked", 3, Vector2(1601.3, GROUND_Y))
	ysort_layer.add_child(orbis_linked_workshop)

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
			{"name": "OrbisWorkshop_3",     "rect": Rect2(orbis_linked_workshop.get_screen_rect().position + Vector2(0, oy), orbis_linked_workshop.get_screen_rect().size)},
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
		# Island 1 (Henesys, CI-11 re-slot): Bunny Max 2, Otter Max 2, Fox Max 1, Shiba Max 1
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 0, Vector2(653.9, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 1, 1, Vector2(677.9, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 0, Vector2(840.0, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 1, 1, Vector2(853.4, GROUND_Y)],
		[AnimalWorker.RoleType.FOX_MORTAR_CHEF, 1, 0, Vector2(866.7, GROUND_Y)],
		[AnimalWorker.RoleType.SHIBA_MANAGER, 1, 0, Vector2(1045.3, GROUND_Y)],

		# Island 2 (Ellinia): Bunny Max 2, Otter Max 1, Penguin Max 1, Toucan Max 2
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 0, Vector2(161.4, GROUND_Y)],
		[AnimalWorker.RoleType.BUNNY_FARMER, 2, 1, Vector2(181.4, GROUND_Y)],
		[AnimalWorker.RoleType.OTTER_LOGISTICS, 2, 0, Vector2(216.0, GROUND_Y)],
		[AnimalWorker.RoleType.PENGUIN_ALCHEMIST, 2, 0, Vector2(235.6, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 0, Vector2(284.0, GROUND_Y)],
		[AnimalWorker.RoleType.TOUCAN_TRADER, 2, 1, Vector2(296.0, GROUND_Y)],

		# Island 3 (Orbis Coast, CI-10 re-slot): Bunny Max 2, Otter Max 2, Fox Max 1, Penguin Max 1, Toucan Max 2
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
				# CI-13: flying kites in the sky lanes (above every building / badge row) are reeled in first
				var hit_kite := get_kite_at_local_point(local_pos)
				if hit_kite >= 0:
					interact_with_kite(hit_kite)
					return
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
				if dairy_workshop != null and dairy_workshop.visible and dairy_workshop.get_local_hit_rect().has_point(local_pos):
					interact_with_dairy_workshop()
					return
				if open_air_cinema != null and open_air_cinema.visible and open_air_cinema.get_local_hit_rect().has_point(local_pos):
					interact_with_open_air_cinema()
					return
				if chef_tasting_pavilion != null and chef_tasting_pavilion.visible and chef_tasting_pavilion.get_local_hit_rect().has_point(local_pos):
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
					interact_with_windmill_bakery()
					return
				if GameManager != null and GameManager.is_gourmet_parade_active() and get_parade_float_local_hit_rect().has_point(local_pos):
					interact_with_parade_float()
					return
				if cloud_hotspring_inn != null and cloud_hotspring_inn.visible and cloud_hotspring_inn.get_local_hit_rect().has_point(local_pos):
					interact_with_hotspring_inn()
					return
				if lighthouse_harbor != null and lighthouse_harbor.visible and lighthouse_harbor.get_local_hit_rect().has_point(local_pos):
					interact_with_lighthouse_harbor()
					return
				if pottery_kiln != null and pottery_kiln.visible and pottery_kiln.get_local_hit_rect().has_point(local_pos):
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

## ==================================================================
## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) & Mountain-Sea Master Chef Tasting Pavilion (`山海特级食神品鉴席`)
## ==================================================================
## Festival badge floats on the open pond water below the twin bridges (clear of the Moon Tea Boat roof & its badge)
const WISH_LANTERN_LABEL_POS := Vector2(1150.0, 157.0)

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

	wish_lantern_label = EconomyConfig.create_pixel_label("★星灯祈愿水灯节", 13, Color("#FFD8A8"), true)
	wish_lantern_label.label_settings = wish_lantern_label.label_settings.duplicate() as LabelSettings
	wish_lantern_label.name = "WishLanternFestivalBadgeLabel"
	wish_lantern_label.custom_minimum_size = Vector2(120.0, 18.0)
	wish_lantern_label.scale = Vector2(0.74, 0.74)
	wish_lantern_label.position = WISH_LANTERN_LABEL_POS
	wish_lantern_label.z_index = EconomyConfig.Z_FLOATING_UI
	wish_lantern_label.z_as_relative = false
	wish_lantern_label.visible = false
	world_root.add_child(wish_lantern_label)

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
	if wish_lantern_label != null:
		wish_lantern_label.visible = fest_active
		if fest_active and GameManager != null:
			wish_lantern_label.text = "★星灯祈愿水灯节(%ds)" % maxi(1, int(ceili(GameManager.wish_lantern_festival_timer)))

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
	var tex: Texture2D = tex_henesys if isl == 1 else (tex_orbis if isl == 3 else null)
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
	if hud != null and hud.has_method("reload_ci9_textures"):
		hud.reload_ci9_textures()

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
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【山海食神品鉴席】需 " + str(EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	# 1) A cooked dish is waiting -> invite the jury for a tasting challenge (pending challenge, or an encore during the lantern festival)
	if GameManager.has_pending_tasting_challenge() or GameManager.is_wish_lantern_festival_active():
		var pend_id := GameManager._pick_tasting_challenge_dish("")
		if int(GameManager.tasting_inventory.get(pend_id, 0)) > 0:
			var t_res := GameManager.run_tasting_challenge(pend_id)
			return {"ok": bool(t_res.get("judged", false)), "action": "tasting", "result": t_res}
	# 2) Cook the active combo dish from existing island ingredients
	var c_res := GameManager.cook_tasting_dish("", true)
	if bool(c_res.get("cooked", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(ChefTastingPavilion.SLOT_X, GROUND_Y - 58.0),
			"★烹制【" + EconomyConfig.get_item_display_name(String(c_res.get("dish_id", ""))) + "】(肴存" + str(int(c_res.get("stock", 1))) + ")",
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "cook", "dish_id": String(c_res.get("dish_id", ""))}
	# 3) Nothing to cook with -> rotate the featured combo dish
	var next_d := GameManager.cycle_tasting_dish()
	EventBus.spawn_floating_text.emit(
		Vector2(ChefTastingPavilion.SLOT_X, GROUND_Y - 58.0),
		"★品鉴席切换名菜【" + EconomyConfig.get_item_display_name(next_d) + "】",
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
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云海温泉汤屋】需 " + str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var brew_res := GameManager.brew_hotspring_bath("", false)
	if bool(brew_res.get("brewed", false)):
		var b_name := EconomyConfig.get_item_display_name(String(brew_res.get("bath_id", "")))
		EventBus.spawn_floating_text.emit(
			Vector2(CloudHotspringInn.SLOT_X, GROUND_Y - 64.0),
			"★熬制【" + b_name + "】x1 (汤存" + str(int(brew_res.get("stock", 1))) + ")",
			Color("#FFE066")
		)
		return {"ok": true, "action": "brew", "bath_id": String(brew_res.get("bath_id", ""))}
	var next_b := GameManager.cycle_hotspring_bath()
	var nb_name := EconomyConfig.get_item_display_name(next_b)
	EventBus.spawn_floating_text.emit(
		Vector2(CloudHotspringInn.SLOT_X, GROUND_Y - 64.0),
		"★汤屋切换药浴【" + nb_name + "】",
		Color("#8CE99A")
	)
	return {"ok": true, "action": "cycle_bath", "bath_id": next_b}

## ==================================================================
## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`) & Islander Specialty Market Auction (`岛民名物集市拍卖会`)
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

## `Lv.` level label boxes under the Island 3 buildings (world-local space) -> the boat lane must keep clear of them.
func get_island3_level_label_rects() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var owners: Array = [
		["SoilPlot_3", soil_plots[2] if soil_plots.size() > 2 else null],
		["OrbisWorkshop_3", orbis_linked_workshop],
		["CloudHotspringInn_3", cloud_hotspring_inn]
	]
	for pair in owners:
		var holder: Node2D = pair[1]
		if holder == null:
			continue
		var lbl: Label = holder.get("level_label")
		if lbl == null or not lbl.visible:
			continue
		out.append({"name": String(pair[0]), "rect": Rect2(holder.position + lbl.position, lbl.size * lbl.scale)})
	return out

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

## Click on the lighthouse: build it -> bid during the Specialty Auction -> open the auction when it is due -> ship catch to the stall.
func interact_with_lighthouse_harbor() -> Dictionary:
	if GameManager == null or not bool(GameManager.unlocked_islands.get(3, false)):
		return {"ok": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if not GameManager.lighthouse_harbor_unlocked:
		var ok := GameManager.unlock_lighthouse_harbor(false)
		if not ok and hud != null:
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云海灯塔渔港】需 " + str(EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	if GameManager.island_auction_active:
		var bid := GameManager.place_auction_bid()
		if not bool(bid.get("ok", false)) and hud != null:
			hud.offline_banner_timer = 3.5
			if String(bid.get("reason", "")) == "leading":
				hud.offline_banner_text = "★你正以 " + str(int(bid.get("amount", 0))) + GameManager.get_auction_currency_tag() + " 领先，静候落槌!"
			else:
				hud.offline_banner_text = "★出价需 " + str(int(bid.get("amount", 0))) + GameManager.get_auction_currency_tag() + "，当前余额不足!"
			hud._sync_label_nodes()
		return {"ok": bool(bid.get("ok", false)), "action": "bid", "result": bid}
	if GameManager.auction_cooldown_timer <= 0.0:
		var started := GameManager.start_island_auction()
		return {"ok": started, "action": "start_auction"}
	var shipped := GameManager.ship_harbor_seafood_to_stall(3)
	if shipped > 0:
		EventBus.spawn_floating_text.emit(
			Vector2(LighthouseHarbor.SLOT_X, GROUND_Y - 70.0),
			"★鲜货上摊 +" + str(shipped) + " 云海鲜渔获",
			Color("#88D8FF")
		)
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.offline_banner_timer = 3.8
		hud.offline_banner_text = "★灯塔渔港: 渔船轮班出海中 · 存鲜" + str(GameManager.get_harbor_seafood_stock()) + " · 名物拍卖会 " + str(int(ceili(GameManager.auction_cooldown_timer))) + "s 后开槌!"
		hud._sync_label_nodes()
	return {"ok": true, "action": "status"}

func reload_ci10_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_fishing_boat = EconomyConfig.load_pixel_texture(EconomyConfig.FISHING_BOAT_TEX)
	_apply_harbor_boat_textures()
	if lighthouse_harbor != null and lighthouse_harbor.has_method("reload_ci10_textures"):
		lighthouse_harbor.reload_ci10_textures()
	if hud != null and hud.has_method("reload_ci10_textures"):
		hud.reload_ci10_textures()

## ==================================================================
## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
## ==================================================================
func reload_ci11_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	if dairy_workshop != null and dairy_workshop.has_method("reload_ci11_textures"):
		dairy_workshop.reload_ci11_textures()
	if open_air_cinema != null and open_air_cinema.has_method("reload_ci11_textures"):
		open_air_cinema.reload_ci11_textures()
	if hud != null and hud.has_method("reload_ci11_textures"):
		hud.reload_ci11_textures()

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
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云端牧场乳品工坊】需 " + str(EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
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
			"★制成【" + EconomyConfig.get_item_display_name(String(c_res.get("item_id", ""))) + "】(存" + str(int(c_res.get("stock", 1))) + ")",
			Color("#FFF4D6")
		)
		return {"ok": true, "action": "craft", "item_id": String(c_res.get("item_id", ""))}
	var m_res := GameManager.milk_dairy_cows(false)
	if bool(m_res.get("milked", false)):
		EventBus.spawn_floating_text.emit(
			Vector2(DairyWorkshop.SLOT_X, GROUND_Y - 58.0),
			"★挤奶 +" + str(int(m_res.get("qty", 0))) + " 云朵鲜奶 (饲" + EconomyConfig.get_item_display_name(String(m_res.get("feed", ""))) + ")",
			Color("#FFF4D6")
		)
		return {"ok": true, "action": "milk", "qty": int(m_res.get("qty", 0))}
	var shipped := GameManager.ship_dairy_to_stall(3)
	if shipped > 0:
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.offline_banner_timer = 3.8
		hud.offline_banner_text = "★乳品工坊: 农田篮里没有鲜草作物可喂云朵奶牛 · 等月兔收获后再来挤奶!"
		hud._sync_label_nodes()
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
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "搭建【星空夜市露天电影院】需 " + str(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
		return {"ok": ok, "action": "unlock"}
	var snack := GameManager.sell_cinema_snacks(1)
	if int(snack.get("sold", 0)) > 0:
		EventBus.spawn_floating_text.emit(
			Vector2(OpenAirCinema.SLOT_X, GROUND_Y - 52.0),
			"★影院零食 +" + str(int(snack.get("gold", 0))) + "G",
			Color("#FFE066")
		)
		return {"ok": true, "action": "snack", "gold": int(snack.get("gold", 0))}
	if hud != null:
		var sm := GameManager.get_cinema_status_summary()
		hud.offline_banner_timer = 3.8
		hud.offline_banner_text = "★露天影院: 今夜已映 " + str(int(sm["tonight"])) + "/3 场 · 每场观众 " + str(int(sm["audience"])) + " 位 × 影票 " + str(int(sm["ticket_price"])) + "G · 乳品工坊的云朵布丁/鲜奶可作影院零食!"
		hud._sync_label_nodes()
	return {"ok": true, "action": "status"}

## ==================================================================
## CI-12: Cloud Pottery Kiln Workshop (`云端陶艺窑坊`) & Islander Autumn Sports Day (`岛民秋季运动会`)
## ==================================================================
func reload_ci12_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	tex_sports_flag = EconomyConfig.load_pixel_texture(EconomyConfig.SPORTS_FLAG_TEX)
	tex_gold_medal = EconomyConfig.load_pixel_texture(EconomyConfig.GOLD_RIBBON_MEDAL_TEX)
	for fl in [sports_flag_west, sports_flag_east]:
		if fl != null:
			_apply_grounded_sprite_texture(fl, tex_sports_flag, EconomyConfig.SPORTS_FLAG_SCALE)
	if sports_medal_sprite != null:
		sports_medal_sprite.texture = tex_gold_medal
	if pottery_kiln != null and pottery_kiln.has_method("reload_ci12_textures"):
		pottery_kiln.reload_ci12_textures()
	if hud != null and hud.has_method("reload_ci12_textures"):
		hud.reload_ci12_textures()

func _apply_grounded_sprite_texture(sp: Sprite2D, tex: Texture2D, sc: float) -> void:
	if sp == null:
		return
	sp.texture = tex
	sp.centered = true
	sp.region_enabled = false
	sp.hframes = 1
	sp.vframes = 1
	sp.frame = 0
	# GEMINI.md Law 2.2: Bottom-Center Pivot (`offset = Vector2(0.0, -float(frame_h) * 0.5)`)
	sp.offset = Vector2(0.0, -float(tex.get_height()) * 0.5) if tex != null else Vector2.ZERO
	sp.scale = Vector2(sc, sc)

func _build_sports_day_props() -> void:
	tex_sports_flag = EconomyConfig.load_pixel_texture(EconomyConfig.SPORTS_FLAG_TEX)
	tex_gold_medal = EconomyConfig.load_pixel_texture(EconomyConfig.GOLD_RIBBON_MEDAL_TEX)
	# Event props (not main buildings): start / finish pennants planted just inside the Lotus Pond bridge ends
	sports_flag_west = Sprite2D.new()
	sports_flag_west.name = "SportsFlagWest"
	sports_flag_east = Sprite2D.new()
	sports_flag_east.name = "SportsFlagEast"
	for fl_pair in [[sports_flag_west, EconomyConfig.SPORTS_FLAG_WEST_X, false], [sports_flag_east, EconomyConfig.SPORTS_FLAG_EAST_X, true]]:
		var fl: Sprite2D = fl_pair[0]
		_apply_grounded_sprite_texture(fl, tex_sports_flag, EconomyConfig.SPORTS_FLAG_SCALE)
		fl.position = Vector2(float(fl_pair[1]), GROUND_Y)
		fl.flip_h = bool(fl_pair[2])
		fl.z_index = EconomyConfig.Z_BUILDING
		fl.z_as_relative = false
		fl.visible = false
		ysort_layer.add_child(fl)

	sports_medal_sprite = Sprite2D.new()
	sports_medal_sprite.name = "SportsGoldRibbonMedal"
	sports_medal_sprite.texture = tex_gold_medal
	sports_medal_sprite.centered = true
	sports_medal_sprite.region_enabled = false
	sports_medal_sprite.hframes = 1
	sports_medal_sprite.vframes = 1
	sports_medal_sprite.frame = 0
	sports_medal_sprite.scale = Vector2(0.30, 0.30)
	sports_medal_sprite.z_index = EconomyConfig.Z_CARRY_EMOTE
	sports_medal_sprite.z_as_relative = false
	sports_medal_sprite.visible = false
	world_root.add_child(sports_medal_sprite)

	sports_badge_label = EconomyConfig.create_pixel_label("★岛民秋季运动会", 13, Color("#FFE066"), true)
	sports_badge_label.name = "SportsDayBadgeLabel"
	# Own LabelSettings copy: the badge recolours per phase and must never leak into other shared 13px labels
	sports_badge_label.label_settings = sports_badge_label.label_settings.duplicate() as LabelSettings
	sports_badge_label.scale = Vector2(0.74, 0.74)
	sports_badge_label.position = Vector2(EconomyConfig.SPORTS_TRACK_CENTER_X - 50.0, SPORTS_BADGE_Y)
	sports_badge_label.z_index = EconomyConfig.Z_FLOATING_UI
	sports_badge_label.z_as_relative = false
	sports_badge_label.visible = false
	world_root.add_child(sports_badge_label)

	# The tug-of-war rope is held in the athletes' paws -> drawn on the carry layer (`Z_CARRY_EMOTE`) like any carried item
	sports_rope_layer = Node2D.new()
	sports_rope_layer.name = "SportsRopeLayer"
	sports_rope_layer.z_index = EconomyConfig.Z_CARRY_EMOTE
	sports_rope_layer.z_as_relative = false
	world_root.add_child(sports_rope_layer)
	sports_rope_layer.draw.connect(_draw_sports_rope)

	if EventBus != null:
		EventBus.sports_day_ended.connect(_on_sports_day_ended)

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
			hud.offline_banner_timer = 3.5
			hud.offline_banner_text = "建造【云端陶艺窑坊】需 " + str(EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD) + "G 金币!"
			hud._sync_label_nodes()
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
			"★出窑【" + EconomyConfig.get_item_display_name(String(f_res.get("item_id", ""))) + "】(存" + str(int(f_res.get("stock", 1))) + ")",
			Color("#FFD8A8")
		)
		return {"ok": true, "action": "fire", "item_id": String(f_res.get("item_id", ""))}
	var shipped := GameManager.ship_pottery_to_stall(3)
	if shipped > 0:
		return {"ok": true, "action": "ship", "qty": shipped}
	if hud != null:
		hud.offline_banner_timer = 3.8
		var st := GameManager.get_pottery_kiln_status()
		hud.offline_banner_text = "★陶艺窑坊: 土仓 " + str(GameManager.get_pottery_stock(EconomyConfig.POTTERY_CLAY_ID)) + " 份" + (" · 缺秸秆柴 (农田篮里没有收获作物)" if st == "fuel" else " · 月兔收获时会翻出陶土，茶碗 1 份土 / 陶花瓶 2 份土")
		hud._sync_label_nodes()
	return {"ok": true, "action": "status"}

## ---------------- Autumn Sports Day on the Lotus Pond bridge track ----------------
func _find_sports_athlete(team_key: String) -> AnimalWorker:
	for w in workers:
		if is_instance_valid(w) and w.home_island == 1 and w.animal_key == team_key and w.is_hired():
			return w
	return null

## Lane offset of team `lane_idx` among `n` teams (keeps the line-ups readable instead of one stacked sprite)
func _sports_lane_offset(lane_idx: int, n: int) -> float:
	return (float(lane_idx) - float(maxi(1, n) - 1) * 0.5) * SPORTS_LANE_SPACING

## Pure function of `GameManager` sports state: where team `team_key` stands / runs right now on the pond bridge track.
## Returns `{x, facing (+1 right / -1 left / 0 auto), pull}`.
func get_sports_athlete_target(team_key: String) -> Dictionary:
	var teams: Array[String] = GameManager.sports_teams
	var n := teams.size()
	var lane := teams.find(team_key)
	if lane < 0 or not GameManager.is_sports_day_active():
		return {"x": EconomyConfig.SPORTS_TRACK_WEST_X, "facing": 0.0, "pull": false}
	var west := EconomyConfig.SPORTS_TRACK_WEST_X
	var east := EconomyConfig.SPORTS_TRACK_EAST_X
	var center := EconomyConfig.SPORTS_TRACK_CENTER_X
	var off := _sports_lane_offset(lane, n)
	var phase := GameManager.get_sports_phase()
	var k := GameManager.get_sports_focus_event_index()
	if phase == "award":
		# Award ceremony on the centre pier: champion in the middle, the others fanned out on both sides facing in
		var champ := GameManager.sports_last_champion
		if team_key == champ:
			return {"x": center, "facing": 1.0, "pull": false}
		var others: Array[String] = []
		for t in teams:
			if t != champ:
				others.append(t)
		var j := others.find(team_key)
		var side := -1.0 if j % 2 == 0 else 1.0
		var dist := 30.0 + 26.0 * floorf(float(j) * 0.5)
		return {"x": center + side * dist, "facing": -side, "pull": false}
	if k == 1 and (phase == "event" or phase == "break"):
		# Tug-of-war: alternate teams on the west / east rope ends, the rope creeps toward the strongest team's side
		var w_side := -1.0 if lane % 2 == 0 else 1.0
		var slot := floorf(float(lane) * 0.5)
		var base_x := center + w_side * (SPORTS_TUG_INNER_DX + SPORTS_TUG_STEP_DX * slot)
		var shift := get_sports_rope_shift() if phase == "event" else 0.0
		# Both teams face the rope centre and heave backwards
		return {"x": base_x + shift, "facing": -w_side, "pull": phase == "event"}
	if k == 0:
		if phase == "event":
			var r0 := maxi(0, GameManager.get_sports_team_rank(team_key, 0))
			var arrive0 := 0.55 + 0.10 * float(r0)
			var p0 := clampf(GameManager.get_sports_event_progress() / arrive0, 0.0, 1.0)
			return {"x": lerpf(west + 4.0 + off, east - 11.0 * float(r0), p0), "facing": 1.0, "pull": false}
		# March-in: line up on the west start line
		return {"x": west + 4.0 + off, "facing": 1.0, "pull": false}
	# k == 2: harvest-carry race runs east -> west after lining up on the east end
	if phase == "event":
		var r2 := maxi(0, GameManager.get_sports_team_rank(team_key, 2))
		var arrive2 := 0.60 + 0.10 * float(r2)
		var p2 := clampf(GameManager.get_sports_event_progress() / arrive2, 0.0, 1.0)
		return {"x": lerpf(east - 4.0 - off, west + 11.0 * float(r2), p2), "facing": -1.0, "pull": false}
	return {"x": east - 4.0 - off, "facing": -1.0, "pull": false}

func _update_sports_day(_delta: float) -> void:
	var active := GameManager != null and GameManager.is_sports_day_active()
	if not active:
		if not sports_athletes.is_empty():
			for t_key in sports_athletes.keys():
				var aw: AnimalWorker = sports_athletes[t_key]
				if is_instance_valid(aw):
					aw.exit_sports_mode()
			sports_athletes.clear()
		for fl in [sports_flag_west, sports_flag_east]:
			if fl != null:
				fl.visible = false
		if sports_badge_label != null:
			sports_badge_label.visible = false
		if sports_medal_sprite != null:
			sports_medal_sprite.visible = false
		if sports_rope_layer != null:
			sports_rope_layer.queue_redraw()
		return
	for t_key in GameManager.sports_teams:
		var w: AnimalWorker = sports_athletes.get(t_key, null)
		if w == null or not is_instance_valid(w) or not w.is_hired():
			w = _find_sports_athlete(t_key)
			if w == null:
				continue
			sports_athletes[t_key] = w
		var tgt := get_sports_athlete_target(t_key)
		if not w.sports_mode:
			w.enter_sports_mode(float(tgt["x"]))
		w.sports_target_x = float(tgt["x"])
		w.sports_facing = float(tgt["facing"])
		w.sports_pull_pose = bool(tgt["pull"])
	for fl in [sports_flag_west, sports_flag_east]:
		if fl != null:
			fl.visible = true
			fl.position.y = GROUND_Y
	if sports_rope_layer != null:
		sports_rope_layer.queue_redraw()
	var sm := GameManager.get_sports_status_summary()
	if sports_badge_label != null and sports_badge_label.label_settings != null:
		var phase := String(sm["phase"])
		var txt := "★秋季运动会"
		if phase == "gather":
			txt = "★秋季运动会·入场(%ds)" % maxi(1, int(ceili(EconomyConfig.SPORTS_GATHER_SEC - GameManager.sports_day_clock)))
		elif phase == "award":
			txt = "★金丝带颁奖·" + String(EconomyConfig.SPORTS_TEAM_NAMES.get(GameManager.sports_last_champion, ""))
		else:
			txt = "★运动会·%s %d/%d" % [String(sm["event_short"]), int(sm["event_idx"]) + 1, int(sm["event_count"])]
		sports_badge_label.text = txt
		sports_badge_label.label_settings.font_color = Color("#FFE066") if phase != "award" else Color("#FFD43B")
		sports_badge_label.visible = true
		sports_badge_label.size = Vector2.ZERO
		sports_badge_label.position = Vector2(EconomyConfig.SPORTS_TRACK_CENTER_X - sports_badge_label.size.x * sports_badge_label.scale.x * 0.5, SPORTS_BADGE_Y)
	if sports_medal_sprite != null:
		var champ_w: AnimalWorker = sports_athletes.get(GameManager.sports_last_champion, null)
		var show_medal := String(sm["phase"]) == "award" and champ_w != null and is_instance_valid(champ_w)
		sports_medal_sprite.visible = show_medal
		if show_medal:
			sports_medal_sprite.position = Vector2(champ_w.position.x, GROUND_Y - 66.0 + sin(cloud_time * 3.0) * 1.5)

func get_sports_badge_local_rect() -> Rect2:
	if sports_badge_label == null or not sports_badge_label.visible:
		return Rect2()
	return Rect2(sports_badge_label.position, sports_badge_label.size * sports_badge_label.scale)

## Tug-of-war rope endpoints (local) while event 2 runs, empty otherwise
func get_sports_rope_segment() -> Array[Vector2]:
	var out: Array[Vector2] = []
	if GameManager == null or not GameManager.is_sports_day_active() or GameManager.get_sports_focus_event_index() != 1:
		return out
	var phase := GameManager.get_sports_phase()
	if phase != "event" and phase != "break":
		return out
	var min_x := 99999.0
	var max_x := -99999.0
	for t_key in sports_athletes.keys():
		var aw: AnimalWorker = sports_athletes[t_key]
		if is_instance_valid(aw):
			min_x = minf(min_x, aw.position.x)
			max_x = maxf(max_x, aw.position.x)
	if max_x - min_x < 8.0:
		return out
	out.append(Vector2(min_x + 4.0, GROUND_Y - SPORTS_ROPE_HAND_Y))
	out.append(Vector2(max_x - 4.0, GROUND_Y - SPORTS_ROPE_HAND_Y))
	return out

## Rope + red centre ribbon in the athletes' paws (local coords of `world_root`, same space as the athletes)
func _draw_sports_rope() -> void:
	var seg := get_sports_rope_segment()
	if seg.size() != 2 or sports_rope_layer == null:
		return
	var ra: Vector2 = seg[0]
	var rb: Vector2 = seg[1]
	sports_rope_layer.draw_line(ra, rb, Color("#C9A26B"), 2.0)
	sports_rope_layer.draw_line(ra + Vector2(0.0, 1.0), rb + Vector2(0.0, 1.0), Color(0.36, 0.22, 0.10, 0.85), 1.0)
	var mid_x := EconomyConfig.SPORTS_TRACK_CENTER_X + get_sports_rope_shift()
	sports_rope_layer.draw_rect(Rect2(roundf(mid_x - 1.5), roundf(ra.y - 3.0), 3.0, 7.0), Color("#E03131"), true)

## How far the rope centre has been hauled toward the strongest team (`0` outside the tug-of-war)
func get_sports_rope_shift() -> float:
	if GameManager == null or GameManager.get_sports_event_index() != 1:
		return 0.0
	var teams: Array[String] = GameManager.sports_teams
	var win_lane := 0
	for li in range(teams.size()):
		if GameManager.get_sports_team_rank(teams[li], 1) == 0:
			win_lane = li
	var win_side := -1.0 if win_lane % 2 == 0 else 1.0
	return win_side * SPORTS_TUG_MAX_SHIFT * smoothstep(0.0, 1.0, GameManager.get_sports_event_progress())

func _on_sports_day_ended(champion_key: String, _medal_total: int) -> void:
	# `冠军干劲`: every Island 1 worker of the champion species gets the 8s pet-boost haste
	for w in workers:
		if is_instance_valid(w) and w.home_island == 1 and w.animal_key == champion_key and w.is_hired():
			w.boost_timer = AnimalWorker.PET_BOOST_DURATION

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
	if hud != null and hud.has_method("reload_ci13_textures"):
		hud.reload_ci13_textures()

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

	kite_badge_label = EconomyConfig.create_pixel_label("★云海风筝节", 13, Color("#9BE7FF"), false)
	kite_badge_label.name = "KiteFestivalBadgeLabel"
	# Own LabelSettings copy: the badge recolours per gust and must never leak into other shared 13px labels
	kite_badge_label.label_settings = kite_badge_label.label_settings.duplicate() as LabelSettings
	kite_badge_label.scale = Vector2(EconomyConfig.KITE_BADGE_SCALE, EconomyConfig.KITE_BADGE_SCALE)
	kite_badge_label.position = EconomyConfig.KITE_BADGE_POS
	kite_badge_label.z_index = EconomyConfig.Z_FLOATING_UI
	kite_badge_label.z_as_relative = false
	kite_badge_label.visible = false
	world_root.add_child(kite_badge_label)

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
	self_modulate = self_modulate.lerp(season_tint, minf(1.0, delta * 3.5))

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

func get_kite_badge_local_rect() -> Rect2:
	if kite_badge_label == null:
		return Rect2()
	kite_badge_label.size = Vector2.ZERO
	return Rect2(kite_badge_label.position, kite_badge_label.size * kite_badge_label.scale)

func interact_with_kite(slot_idx: int) -> Dictionary:
	if GameManager == null:
		return {"collected": false}
	if SoundManager != null:
		SoundManager.play_click_sfx()
	var res := GameManager.collect_kite(slot_idx)
	if bool(res.get("collected", false)) and hud != null:
		var k_name := EconomyConfig.get_item_display_name(String(res.get("kite_id", "")))
		hud.offline_banner_timer = 3.5
		if bool(res.get("swept", false)):
			hud.offline_banner_text = "★风筝满天！收下全部 %d 只风筝 · 风筝满天勋章 x%d · +%d琥珀 +%d图鉴券!" % [EconomyConfig.KITE_SLOTS.size(), GameManager.kite_medals, int(res.get("amber", 0)), int(res.get("vouchers", 0))]
		else:
			hud.offline_banner_text = "★收下【%s】+%dG%s · 风力%s 产销加成中 · 余 %d 只" % [k_name, int(res.get("gold", 0)), (" +%d琥珀" % int(res.get("amber", 0))) if int(res.get("amber", 0)) > 0 else "", GameManager.get_kite_wind_name(), GameManager.get_kite_remaining_count()]
		hud._sync_label_nodes()
	return res

func _on_kite_collected(slot_idx: int, kite_id: String, gold: int) -> void:
	if slot_idx < 0 or slot_idx >= kite_sprites.size():
		return
	kite_sprites[slot_idx].visible = false
	EventBus.spawn_floating_text.emit(
		kite_sprites[slot_idx].position + Vector2(0.0, 26.0),
		"+%dG %s" % [gold, String(EconomyConfig.KITE_TYPES.get(kite_id, {}).get("short_name", "风筝"))],
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
	if kite_badge_label != null:
		kite_badge_label.visible = active
		if active:
			var sm := GameManager.get_kite_status_summary()
			kite_badge_label.text = "★风筝节·%s 售x%.2f 余%ds 筝%d/%d" % [String(sm["wind_name"]), float(sm["sale_mult"]), maxi(1, int(ceili(float(sm["seconds_left"])))), int(sm["remaining"]), EconomyConfig.KITE_SLOTS.size()]
			var w_lvl := EconomyConfig.calc_kite_wind_level_idx(GameManager.kite_festival_idx, GameManager.kite_festival_clock)
			kite_badge_label.label_settings.font_color = KITE_BADGE_WIND_COLORS[clampi(w_lvl, 0, KITE_BADGE_WIND_COLORS.size() - 1)]
			kite_badge_label.size = Vector2.ZERO
	if kite_fx_layer != null:
		kite_fx_layer.queue_redraw()

## The festival icon (spool + kite) in front of the sky badge (the kites' strings / ribbons are part of their pixel art)
func _draw_kite_fx() -> void:
	if kite_fx_layer == null or GameManager == null or not GameManager.is_kite_festival_active():
		return
	if kite_badge_label != null and kite_badge_label.visible and tex_kite_festival_icon != null:
		kite_fx_layer.draw_texture_rect(tex_kite_festival_icon, Rect2(EconomyConfig.KITE_BADGE_POS.x - 12.0, EconomyConfig.KITE_BADGE_POS.y, 11.0, 11.0), false)

## Island texture pixel under a local point (Island 1 / 2 / 3), used to prove seasonal props stand on solid ground
func _get_island_ground_image(isl: int) -> Image:
	if isl == 1 or isl == 3:
		return _get_island_water_image(isl)
	if _island_water_images.has(100 + isl):
		return _island_water_images[100 + isl]
	var img: Image = tex_ellinia.get_image() if tex_ellinia != null else null
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
## CI-14: Cloud-Isle Photo Tour (`云岛观光摄影打卡`) — signposts + sightseer (the Wish Board is a HUD panel)
## ==================================================================
func reload_ci14_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	_photo_used_rects.clear()
	tex_photo_marker = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_SPOT_MARKER_TEX)
	tex_photo_card = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_CARD_TEX)
	tex_photo_camera = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PHOTO_TOUR_TEX)
	tex_photo_tourist = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_TOURIST_TRAVELER_TEX)
	for mk in photo_marker_nodes:
		_apply_photo_marker_texture(mk, tex_photo_marker)
	if photo_tourist_body != null:
		photo_tourist_body.texture = tex_photo_tourist
	if hud != null and hud.has_method("reload_ci14_textures"):
		hud.reload_ci14_textures()

func _build_photo_tour_props() -> void:
	tex_photo_marker = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_SPOT_MARKER_TEX)
	tex_photo_card = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_CARD_TEX)
	tex_photo_camera = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PHOTO_TOUR_TEX)
	tex_photo_tourist = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_TOURIST_TRAVELER_TEX)

	# Signposts: small grounded props (decor, z = Z_BUILDING) on the free ground beside each landmark
	photo_marker_nodes.clear()
	for s_id in EconomyConfig.PHOTO_SPOT_ORDER:
		var sp: Dictionary = EconomyConfig.PHOTO_SPOTS[s_id]
		var mk := Sprite2D.new()
		mk.name = "PhotoSpotMarker_%s" % s_id
		mk.position = Vector2(float(sp["marker_x"]), GROUND_Y)
		mk.z_index = EconomyConfig.Z_BUILDING
		mk.z_as_relative = false
		mk.visible = false
		ysort_layer.add_child(mk)
		_apply_photo_marker_texture(mk, tex_photo_marker)
		photo_marker_nodes.append(mk)

	# Sightseer: a unit like the market visitors (root on GROUND_Y, 2 x 48px frames, bottom-centre pivot, 5:1 drop shadow)
	photo_tourist_root = Node2D.new()
	photo_tourist_root.name = "PhotoTourist"
	photo_tourist_root.z_index = EconomyConfig.Z_UNIT
	photo_tourist_root.z_as_relative = false
	photo_tourist_root.visible = false
	photo_tourist_root.position = Vector2(float(EconomyConfig.PHOTO_SPOTS["pond_bank"]["pose_x"]), GROUND_Y)
	ysort_layer.add_child(photo_tourist_root)
	photo_tourist_root.draw.connect(_draw_photo_tourist_shadow)
	photo_tourist_body = Sprite2D.new()
	photo_tourist_body.name = "BodySprite"
	photo_tourist_body.texture = tex_photo_tourist
	photo_tourist_body.region_enabled = false
	photo_tourist_body.hframes = 2
	photo_tourist_body.vframes = 1
	photo_tourist_body.frame = 0
	photo_tourist_body.centered = true
	photo_tourist_body.offset = Vector2(0.0, -float(CustomerNPC.FRAME_H) * 0.5)
	photo_tourist_body.self_modulate = Color(1.0, 0.97, 0.90, 1.0)
	photo_tourist_body.z_index = EconomyConfig.Z_UNIT
	photo_tourist_body.z_as_relative = false
	photo_tourist_root.add_child(photo_tourist_body)

	# Camera + flash + photo card (hand height, z = Z_CARRY_EMOTE like every carried icon)
	photo_fx_layer = Node2D.new()
	photo_fx_layer.name = "PhotoTourFxLayer"
	photo_fx_layer.z_index = EconomyConfig.Z_CARRY_EMOTE
	photo_fx_layer.z_as_relative = false
	world_root.add_child(photo_fx_layer)
	photo_fx_layer.draw.connect(_draw_photo_fx)
	_sync_photo_markers()

## Solid (alpha > 0.5) bounding box of a texture, cached per texture (transparent margins never decide the ground row)
func _get_photo_used_rect(tex: Texture2D) -> Rect2:
	if tex == null:
		return Rect2()
	var key := tex.resource_path if tex.resource_path != "" else str(tex.get_instance_id())
	if _photo_used_rects.has(key):
		return _photo_used_rects[key]
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
	_photo_used_rects[key] = used
	return used

## Signpost frame = the art's solid used-rect (`region_rect`, hframes = vframes = 1); `offset = (0, -frame_h * 0.5)` plants its
## lowest opaque row exactly on GROUND_Y (GEMINI.md Law 2.2) whatever padding the final pixel art carries.
func _apply_photo_marker_texture(sp: Sprite2D, tex: Texture2D) -> void:
	if sp == null:
		return
	var used := _get_photo_used_rect(tex)
	sp.texture = tex
	sp.centered = true
	sp.hframes = 1
	sp.vframes = 1
	sp.frame = 0
	sp.region_enabled = tex != null
	sp.region_rect = used
	sp.offset = Vector2(0.0, -used.size.y * 0.5)
	sp.scale = Vector2(EconomyConfig.PHOTO_MARKER_SCALE, EconomyConfig.PHOTO_MARKER_SCALE)

## Signpost visible while its island is open; the cape lawn signpost folds away while the night cinema stands on the cape
func is_photo_marker_shown(spot_id: String) -> bool:
	if GameManager == null or not EconomyConfig.PHOTO_SPOTS.has(spot_id):
		return false
	var sp: Dictionary = EconomyConfig.PHOTO_SPOTS[spot_id]
	if not bool(GameManager.unlocked_islands.get(int(sp["island"]), false)):
		return false
	if bool(sp.get("day_only", false)):
		if GameManager.current_weather == GameManager.WeatherState.NIGHT:
			return false
		if open_air_cinema != null and open_air_cinema.visible:
			return false
	return true

func _sync_photo_markers() -> void:
	for i in range(photo_marker_nodes.size()):
		photo_marker_nodes[i].visible = is_photo_marker_shown(EconomyConfig.PHOTO_SPOT_ORDER[i])

## Rendered rect of signpost `i` (local coords of `world_root`)
func get_photo_marker_local_rect(i: int) -> Rect2:
	if i < 0 or i >= photo_marker_nodes.size() or photo_marker_nodes[i].texture == null:
		return Rect2()
	var mk: Sprite2D = photo_marker_nodes[i]
	var fr := mk.region_rect.size if mk.region_enabled else Vector2(mk.texture.get_size())
	var w := fr.x * mk.scale.x
	var h := fr.y * mk.scale.y
	return Rect2(mk.position.x - w * 0.5, mk.position.y - h, w, h)

## The sightseer's visible body rect (its 48px frame, bottom-centre on GROUND_Y)
func get_photo_tourist_local_rect() -> Rect2:
	if photo_tourist_root == null:
		return Rect2()
	var fw := float(CustomerNPC.FRAME_W)
	var fh := float(CustomerNPC.FRAME_H)
	return Rect2(photo_tourist_root.position.x - fw * 0.5, photo_tourist_root.position.y - fh, fw, fh)

func _update_photo_tour(delta: float) -> void:
	if GameManager == null:
		return
	# the night cinema screen (and its dawn fade-out) owns the east cape: the cape lawn spot closes meanwhile
	GameManager.photo_cape_prop_blocked = open_air_cinema != null and open_air_cinema.visible
	_sync_photo_markers()
	var active := GameManager.is_photo_tour_active()
	if photo_tourist_root != null:
		photo_tourist_root.visible = active
		if active:
			photo_tourist_anim += delta
			var posing := GameManager.is_photo_tourist_posing()
			photo_tourist_root.position = Vector2(GameManager.photo_tour_x, GROUND_Y)
			photo_tourist_root.modulate.a = GameManager.get_photo_tourist_alpha()
			if photo_tourist_body != null:
				photo_tourist_body.frame = 0 if posing else (int(floor(photo_tourist_anim * 6.0 / PI)) % 2)
				photo_tourist_body.flip_h = GameManager.photo_tour_facing < 0.0
				photo_tourist_body.position = Vector2(0.0, 0.0 if posing else -absf(sin(photo_tourist_anim * 6.0)) * 2.0)
			photo_tourist_root.queue_redraw()
	if photo_fx_layer != null:
		photo_fx_layer.queue_redraw()

func _draw_photo_tourist_shadow() -> void:
	if photo_tourist_root == null:
		return
	# GEMINI.md Law 3.3: 5:1 ultra-flat drop shadow at the feet (shadow_width = 40 * 0.55)
	EconomyConfig.draw_drop_shadow(photo_tourist_root, CustomerNPC.VISUAL_WIDTH)

## Camera at hand height while posing, a white flash at the shutter, then the photo card slides out and rises 4px as it fades.
func _draw_photo_fx() -> void:
	if photo_fx_layer == null or GameManager == null or not GameManager.is_photo_tourist_posing():
		return
	var s_id := GameManager.get_photo_tour_current_spot()
	if s_id == "":
		return
	var facing := float(EconomyConfig.PHOTO_SPOTS[s_id]["facing"])
	var feet := Vector2(float(EconomyConfig.PHOTO_SPOTS[s_id]["pose_x"]), GROUND_Y)
	photo_fx_layer.draw_set_transform(feet, 0.0, Vector2(facing, 1.0))
	if tex_photo_camera != null:
		photo_fx_layer.draw_texture_rect(tex_photo_camera, EconomyConfig.PHOTO_CAMERA_LOCAL, false)
	var age := GameManager.photo_tour_last_shot_age
	if GameManager.photo_tour_shutter_done and age < EconomyConfig.PHOTO_CARD_FX_SEC:
		if age < EconomyConfig.PHOTO_FLASH_SEC:
			var fa := 1.0 - age / EconomyConfig.PHOTO_FLASH_SEC
			var lens := EconomyConfig.PHOTO_CAMERA_LOCAL.get_center()
			photo_fx_layer.draw_rect(Rect2(lens - Vector2(2.0, 2.0), Vector2(4.0, 4.0)), Color(1.0, 1.0, 1.0, 0.95 * fa), true)
			photo_fx_layer.draw_rect(Rect2(lens + Vector2(-4.0, -0.5), Vector2(8.0, 1.0)), Color(1.0, 0.98, 0.80, 0.85 * fa), true)
			photo_fx_layer.draw_rect(Rect2(lens + Vector2(-0.5, -4.0), Vector2(1.0, 8.0)), Color(1.0, 0.98, 0.80, 0.85 * fa), true)
		if tex_photo_card != null:
			var k := clampf(age / EconomyConfig.PHOTO_CARD_FX_SEC, 0.0, 1.0)
			var card := EconomyConfig.PHOTO_CARD_LOCAL
			card.position.y -= roundf(EconomyConfig.PHOTO_CARD_RISE_PX * k)
			photo_fx_layer.draw_texture_rect(tex_photo_card, card, false, Color(1.0, 1.0, 1.0, 1.0 - k * k))
	photo_fx_layer.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

## ==================================================================
## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`) — sky layer (the Birthday Party is a HUD panel)
## ==================================================================
func reload_ci15_textures() -> void:
	EconomyConfig._pixel_tex_cache.clear()
	_photo_used_rects.clear()
	tex_weather.clear()
	for w_id in EconomyConfig.SKY_WEATHER_ORDER:
		tex_weather[w_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SKY_WEATHERS[w_id]["tex"]))
	_apply_weather_emblems()
	if hud != null and hud.has_method("reload_ci15_textures"):
		hud.reload_ci15_textures()

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
	var used := _get_photo_used_rect(tex)
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
					weather_sky_layer.draw_texture_rect_region(w_tex, p["r"], _get_photo_used_rect(w_tex), p["c"])

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

	var fest_active := GameManager != null and GameManager.is_lantern_festival_active()
	var parade_active := GameManager != null and GameManager.is_gourmet_parade_active()
	var moon_tea_active := GameManager != null and GameManager.is_moon_tea_gathering_active()
	var wish_fest_active := GameManager != null and GameManager.is_wish_lantern_festival_active()
	var boat_visible := GameManager != null and (moon_tea_active or GameManager.tea_pavilion_unlocked)
	var max_cust_cap := (6 if (parade_active or moon_tea_active or wish_fest_active) else 4) if isl3_on else (5 if (parade_active or moon_tea_active or wish_fest_active) else 3)
	var spawn_rate_mult := 1.85 if (fest_active or parade_active or moon_tea_active or wish_fest_active) else 1.0
	# CI-11: the night cinema draws extra night-market visitors (+1 visitor slot, faster arrivals) while it is open
	var cinema_open := GameManager != null and GameManager.is_cinema_open()
	if cinema_open:
		max_cust_cap += 1
		spawn_rate_mult *= GameManager.get_cinema_visitor_spawn_mult()
	# CI-12: sports-day spectators crowd the pond banks (+1 visitor slot, faster arrivals) while the games run
	if GameManager != null and GameManager.is_sports_day_active():
		max_cust_cap += 1
		spawn_rate_mult *= GameManager.get_sports_visitor_spawn_mult()
	_update_sports_day(delta)
	_update_kite_festival(delta)
	# CI-14: a sightseeing group out on the photo tour draws a few extra visitors to the market
	if GameManager != null and GameManager.is_photo_tour_active():
		spawn_rate_mult *= GameManager.get_photo_tour_visitor_spawn_mult()
	_update_photo_tour(delta)
	# CI-15: the cloud-sea weather stacks on the event visitor rate (bonus capped at x2.20, a rain / mist dip always applies)
	if GameManager != null:
		spawn_rate_mult = GameManager.apply_sky_weather_visitor_mult(spawn_rate_mult)
	_update_sky_weather(delta)

	_update_wish_lanterns(delta, wish_fest_active, isl3_on)
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
				# CI-12: the pond is the sports-day stadium -> the idle boat caption gives way to the athletes' heads
				if GameManager.is_sports_day_active():
					moon_tea_boat_label.visible = false
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
