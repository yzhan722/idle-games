extends Node2D
class_name CloudHotspringInn
## Island 3 Cloud-Sea Hot-Spring Inn & Cute Spirit Bathhouse (`src/entities/buildings/CloudHotspringInn.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` so bottom of bathhouse aligns 100% flush with `GROUND_Y = 124.0`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.
## - 100% Godot native `Label + LabelSettings` (`EconomyConfig.create_pixel_label`, ZERO deprecated font, ZERO Emoji).

const SLOT_X := 1714.7
const TARGET_VISUAL_W := 64.96 # 116.0 * 0.56
const TARGET_VISUAL_H := 60.48 # 108.0 * 0.56

var island_idx: int = 3
var tex_hotspring: Texture2D
var tex_fallback_tiki: Texture2D
var tex_bath_icons: Dictionary = {}
var tex_vip_guest_icon: Texture2D

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var status_badge_label: Label

var anim_time: float = 0.0
var brew_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(0.56, 0.56)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback_tiki = load("res://assets/pixel_art/buildings/landmark_right_tiki.png")

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

	reload_ci6_textures()

	var cur_lv := get_hotspring_level()
	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "hotspring", cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.name = "HotspringLevelLabel"
	level_label.position = Vector2(-34.0, 2.0)
	level_label.custom_minimum_size = Vector2(68.0, 20.0)
	add_child(level_label)

	status_badge_label = EconomyConfig.create_pixel_label("★汤屋·艾草暖汤", 13, Color("#FFE066"), true)
	status_badge_label.name = "HotspringBadgeLabel"
	status_badge_label.custom_minimum_size = Vector2(118.0, 18.0)
	status_badge_label.scale = Vector2(0.76, 0.76)
	status_badge_label.position = Vector2(-45.0, -TARGET_VISUAL_H - 27.0)
	status_badge_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	status_badge_label.z_as_relative = false
	add_child(status_badge_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.hotspring_bath_brewed.connect(_on_hotspring_bath_brewed)
		EventBus.hotspring_unlocked_changed.connect(_on_hotspring_unlocked_changed)

	_sync_labels_and_tint()

func setup_hotspring_inn(p_island: int = 3, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci6_textures()
	_sync_labels_and_tint()

func reload_ci6_textures() -> void:
	tex_hotspring = EconomyConfig.load_pixel_texture(EconomyConfig.CLOUD_HOTSPRING_INN_TEX)
	tex_vip_guest_icon = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_VIP_HOTSPRING_GUEST_TEX)
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(bid, {})
		var bp := String(bcfg.get("icon_tex", ""))
		if bp != "":
			tex_bath_icons[bid] = EconomyConfig.load_pixel_texture(bp)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_hotspring if tex_hotspring != null else tex_fallback_tiki
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

func get_hotspring_level() -> int:
	if GameManager == null:
		return 1
	return maxi(1, int(GameManager.building_levels.get("hotspring", 1)))

func is_hotspring_built() -> bool:
	return GameManager != null and GameManager.hotspring_unlocked

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
	if category == "building" and key == "hotspring":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_labels_and_tint()

func _on_hotspring_bath_brewed(_bath_id: String, _qty: int) -> void:
	brew_flash_timer = 0.50
	_sync_labels_and_tint()

func _on_hotspring_unlocked_changed(_unlocked: bool) -> void:
	_sync_labels_and_tint()

func _sync_labels_and_tint() -> void:
	if GameManager == null:
		return
	var built := is_hotspring_built()
	var cur_lv := get_hotspring_level()
	if level_label != null:
		level_label.text = ("Lv." + str(cur_lv)) if built else "待建汤屋"
		if level_label.label_settings != null:
			level_label.label_settings.font_color = Color("#FFF4D6") if built else Color("#CBD5E1")
	if status_badge_label != null:
		if built:
			var bid := GameManager.active_hotspring_bath_id
			var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(bid, {})
			var sname := String(bcfg.get("short_name", "艾草汤"))
			var stock_cnt := GameManager.get_total_bath_stock_count()
			status_badge_label.text = "★" + sname + ("·汤" + str(stock_cnt) if stock_cnt > 0 else "")
			if status_badge_label.label_settings != null:
				status_badge_label.label_settings.font_color = Color("#FFE066") if stock_cnt > 0 else Color("#FFA8A8")
		else:
			status_badge_label.text = "★汤屋(" + str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G)"
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
	if brew_flash_timer > 0.0:
		brew_flash_timer = maxf(0.0, brew_flash_timer - delta)
	if body_sprite != null:
		if is_hotspring_built():
			var breathe := sin(anim_time * 2.9) * 0.014
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

	if not is_hotspring_built() or GameManager == null:
		return

	# Warm lantern/spring glow & rising pixel steam puffs above wooden tub
	var pulse := 0.85 + 0.15 * sin(anim_time * 2.6)
	var glow_a := 0.11 * pulse + (0.16 * (brew_flash_timer / 0.50) if brew_flash_timer > 0.0 else 0.0)
	draw_circle(Vector2(-12.0, -24.0), 16.0, Color(1.0, 0.86, 0.62, glow_a))

	for si in range(3):
		var phase := fmod(anim_time * 0.65 + float(si) * 0.33, 1.0)
		var sx := -18.0 + float(si) * 5.0 + sin(anim_time * 2.2 + float(si)) * 1.8
		var sy := -22.0 - phase * 22.0
		var sa := (1.0 - phase) * 0.42
		draw_rect(Rect2(roundf(sx), roundf(sy), 3.0, 3.0), Color(0.98, 0.96, 0.94, sa), true)

	var prog := GameManager.get_hotspring_steep_ratio()
	var bar_w := 38.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 6.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(1.0, 0.78, 0.38, 0.96), true)

	var bid := GameManager.active_hotspring_bath_id
	var b_tex: Texture2D = tex_bath_icons.get(bid, null)
	if b_tex != null:
		draw_texture_rect(b_tex, Rect2(bx - 16.0, by - 5.0, 14.0, 14.0), false)
