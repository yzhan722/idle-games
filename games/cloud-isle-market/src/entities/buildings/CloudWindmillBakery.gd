extends Node2D
class_name CloudWindmillBakery
## Island 2 Cloud Windmill Bakery (`src/entities/buildings/CloudWindmillBakery.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` so stone base aligns 100% flush with `GROUND_Y = 124.0`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.
## - 100% Godot native `Label + LabelSettings` (`EconomyConfig.create_pixel_label`, ZERO deprecated font, ZERO Emoji, ZERO SVG).

## CI-9: Island 2 re-slotted to 6 buildings (with `ChefTastingPavilion_2`), every adjacent clear gap >= 28px
const SLOT_X := 397.9
const TARGET_VISUAL_W := 43.50 # 116.0 * 0.375
const TARGET_VISUAL_H := 40.50 # 108.0 * 0.375

var island_idx: int = 2
var tex_windmill: Texture2D
var tex_fallback_hut: Texture2D
var tex_bakery_icons: Dictionary = {}
var tex_parade_float_icon: Texture2D

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var status_badge_label: Label

var anim_time: float = 0.0
var bake_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(0.375, 0.375)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback_hut = load("res://assets/pixel_art/buildings/landmark_left_hut.png")

	body_sprite = Sprite2D.new()
	body_sprite.name = "BodySprite"
	body_sprite.centered = true
	body_sprite.region_enabled = false
	body_sprite.hframes = 1
	body_sprite.vframes = 1
	body_sprite.frame = 0
	body_sprite.z_index = EconomyConfig.Z_BUILDING
	body_sprite.z_as_relative = false
	add_child(body_sprite)

	reload_ci7_textures()

	var cur_lv := get_windmill_level()
	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "windmill", cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.name = "WindmillLevelLabel"
	level_label.position = Vector2(-34.0, 2.0)
	level_label.custom_minimum_size = Vector2(68.0, 20.0)
	add_child(level_label)

	status_badge_label = EconomyConfig.create_pixel_label(EconomyConfig.tr_key("wl_wm_init"), 13, Color("#FFE066"), true)
	status_badge_label.name = "WindmillBadgeLabel"
	status_badge_label.custom_minimum_size = Vector2(118.0, 18.0)
	status_badge_label.scale = Vector2(0.76, 0.76)
	status_badge_label.position = Vector2(-45.0, -TARGET_VISUAL_H - 39.0)
	status_badge_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	status_badge_label.z_as_relative = false
	add_child(status_badge_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.bakery_bread_baked.connect(_on_bakery_bread_baked)
		EventBus.flour_milled.connect(_on_flour_milled)
		EventBus.windmill_unlocked_changed.connect(_on_windmill_unlocked_changed)

	_sync_labels_and_tint()

func setup_windmill_bakery(p_island: int = 2, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci7_textures()
	_sync_labels_and_tint()

func reload_ci7_textures() -> void:
	tex_windmill = EconomyConfig.load_pixel_texture(EconomyConfig.CLOUD_WINDMILL_BAKERY_TEX)
	tex_parade_float_icon = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	for bid in EconomyConfig.BAKERY_CODEX_ORDER:
		var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(bid, {})
		var bp := String(bcfg.get("icon_tex", ""))
		if bp != "":
			tex_bakery_icons[bid] = EconomyConfig.load_pixel_texture(bp)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_windmill if tex_windmill != null else tex_fallback_hut
	if active_tex == null:
		return
	body_sprite.texture = active_tex
	body_sprite.centered = true
	body_sprite.region_enabled = false
	body_sprite.hframes = 1
	body_sprite.vframes = 1
	body_sprite.frame = 0
	var tw := maxf(1.0, float(active_tex.get_width()))
	var th := maxf(1.0, float(active_tex.get_height()))
	# GEMINI.md Law 2.2: Bottom-Center Pivot (`offset = Vector2(0.0, -float(frame_h) * 0.5)`)
	body_sprite.offset = Vector2(0.0, -th * 0.5)
	var sc := minf(TARGET_VISUAL_W / tw, TARGET_VISUAL_H / th)
	base_scale_vec = Vector2(sc, sc)
	body_sprite.scale = base_scale_vec

func get_windmill_level() -> int:
	if GameManager == null:
		return 1
	return maxi(1, int(GameManager.building_levels.get("windmill", 1)))

func is_windmill_built() -> bool:
	return GameManager != null and GameManager.windmill_unlocked

func get_screen_rect() -> Rect2:
	var w := TARGET_VISUAL_W * absf(scale.x)
	var h := TARGET_VISUAL_H * absf(scale.y)
	if body_sprite != null and body_sprite.texture != null:
		w = float(body_sprite.texture.get_width()) * absf(body_sprite.scale.x) * absf(scale.x)
		h = float(body_sprite.texture.get_height()) * absf(body_sprite.scale.y) * absf(scale.y)
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func get_local_hit_rect() -> Rect2:
	var r := get_screen_rect()
	return r.grow(6.0)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "windmill":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_labels_and_tint()

func _on_bakery_bread_baked(_bread_id: String, _qty: int) -> void:
	bake_flash_timer = 0.50
	_sync_labels_and_tint()

func _on_flour_milled(_qty: int, _stock: int) -> void:
	bake_flash_timer = 0.38
	_sync_labels_and_tint()

func _on_windmill_unlocked_changed(_unlocked: bool) -> void:
	_sync_labels_and_tint()

func _sync_labels_and_tint() -> void:
	if GameManager == null:
		return
	var built := is_windmill_built()
	var cur_lv := get_windmill_level()
	if level_label != null:
		level_label.text = ("Lv." + str(cur_lv)) if built else EconomyConfig.tr_key("wl_wm_unbuilt")
		if level_label.label_settings != null:
			level_label.label_settings.font_color = Color("#FFF4D6") if built else Color("#CBD5E1")
	if status_badge_label != null:
		if built:
			var bid := GameManager.active_windmill_bread_id
			var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(bid, {})
			var sname := EconomyConfig.tr_name(String(bcfg.get("short_name", "舒芙蕾包")))
			var bread_cnt := GameManager.get_total_bread_stock_count()
			var flour_cnt := GameManager.get_flour_stock_count()
			status_badge_label.text = EconomyConfig.tr_fmt("wl_badge", [sname, EconomyConfig.tr_fmt("wl_seg_bread", [bread_cnt]) if bread_cnt > 0 else EconomyConfig.tr_fmt("wl_seg_flour", [flour_cnt])])
			if status_badge_label.label_settings != null:
				status_badge_label.label_settings.font_color = Color("#FFE066") if bread_cnt > 0 else Color("#FFD8A8")
		else:
			status_badge_label.text = EconomyConfig.tr_fmt("wl_wm_cost", [EconomyConfig.WINDMILL_UNLOCK_COST_GOLD])
			if status_badge_label.label_settings != null:
				status_badge_label.label_settings.font_color = Color("#CBD5E1")
	if body_sprite != null:
		body_sprite.modulate = Color.WHITE if built else Color(0.74, 0.80, 0.86, 0.72)

func _process(delta: float) -> void:
	var isl_open := GameManager != null and bool(GameManager.unlocked_islands.get(island_idx, false))
	visible = isl_open
	if not visible:
		return
	anim_time += delta
	if bake_flash_timer > 0.0:
		bake_flash_timer = maxf(0.0, bake_flash_timer - delta)
	if body_sprite != null:
		if is_windmill_built():
			var breathe := sin(anim_time * 3.1) * 0.014
			body_sprite.scale = Vector2(base_scale_vec.x * (1.0 + breathe), base_scale_vec.y * (1.0 - breathe))
		else:
			body_sprite.scale = base_scale_vec
	_sync_labels_and_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_windmill_built() or GameManager == null:
		return

	# Warm wheat-aroma baking aura (`麦香烘焙光环`) & rising golden chimney aroma motes
	var pulse := 0.86 + 0.14 * sin(anim_time * 2.7)
	var glow_a := 0.12 * pulse + (0.18 * (bake_flash_timer / 0.50) if bake_flash_timer > 0.0 else 0.0)
	draw_circle(Vector2(2.0, -24.0), 18.0, Color(1.0, 0.82, 0.42, glow_a))

	for mi in range(3):
		var phase := fmod(anim_time * 0.62 + float(mi) * 0.33, 1.0)
		var mx := -13.0 + float(mi) * 4.5 + sin(anim_time * 2.4 + float(mi)) * 1.6
		var my := -42.0 - phase * 18.0
		var ma := (1.0 - phase) * 0.46
		draw_rect(Rect2(roundf(mx), roundf(my), 3.0, 3.0), Color(1.0, 0.92, 0.68, ma), true)

	var prog := GameManager.get_windmill_bake_ratio()
	var bar_w := 38.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 6.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(1.0, 0.82, 0.34, 0.96), true)

	var bid := GameManager.active_windmill_bread_id
	var b_tex: Texture2D = tex_bakery_icons.get(bid, tex_bakery_icons.get("flour_golden_wheat", null))
	if b_tex != null:
		draw_texture_rect(b_tex, Rect2(bx - 16.0, by - 5.0, 14.0, 14.0), false)
