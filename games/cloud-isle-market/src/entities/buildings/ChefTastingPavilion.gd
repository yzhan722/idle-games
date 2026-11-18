extends Node2D
class_name ChefTastingPavilion
## Island 2 Mountain-Sea Master Chef Tasting Pavilion (`山海特级食神品鉴席`, `src/entities/buildings/ChefTastingPavilion.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` (`Vector2(0.0, -52.0)`) so the pavilion's bottom row sits 100% flush on `GROUND_Y = 124.0`.
## - Rightmost Island 2 slot (`x = 469.9`, visual `44.24 x 41.08`), every neighbour >= 28px clear gap & 0.0% overlap.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.
## - 100% Godot native `Label + LabelSettings` (`EconomyConfig.create_pixel_label`, ZERO deprecated font, ZERO Emoji, ZERO SVG).

const SLOT_X := 469.9 # == EconomyConfig.CHEF_PAVILION_SLOT_X
const BASE_SPRITE_SCALE := 0.395
const TARGET_VISUAL_W := 44.24 # 112.0 * 0.395
const TARGET_VISUAL_H := 41.08 # 104.0 * 0.395

var island_idx: int = 2
var tex_pavilion: Texture2D
var tex_fallback_cottage: Texture2D
var tex_dish_icons: Dictionary = {}
var tex_chef_medal: Texture2D

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var level_label: Label
var status_badge_label: Label

var anim_time: float = 0.0
var cook_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(BASE_SPRITE_SCALE, BASE_SPRITE_SCALE)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback_cottage = load("res://assets/pixel_art/buildings/cottage_mushroom.png")

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

	reload_ci9_textures()

	var cur_lv := get_chef_pavilion_level()
	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "chef_pavilion", cur_lv)

	level_label = EconomyConfig.create_pixel_label("Lv." + str(cur_lv), 14, Color("#FFF4D6"), true)
	level_label.name = "ChefPavilionLevelLabel"
	# Own LabelSettings copy: tinting this label must never recolour other shared `Lv.` labels
	level_label.label_settings = level_label.label_settings.duplicate() as LabelSettings
	level_label.position = Vector2(-34.0, 2.0)
	level_label.custom_minimum_size = Vector2(68.0, 20.0)
	add_child(level_label)

	status_badge_label = EconomyConfig.create_pixel_label("★食神·灌汤小笼", 13, Color("#FFD8A8"), true)
	status_badge_label.name = "ChefPavilionBadgeLabel"
	status_badge_label.label_settings = status_badge_label.label_settings.duplicate() as LabelSettings
	status_badge_label.custom_minimum_size = Vector2(118.0, 18.0)
	status_badge_label.scale = Vector2(0.74, 0.74)
	status_badge_label.position = Vector2(-44.0, -TARGET_VISUAL_H - 27.0)
	status_badge_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	status_badge_label.z_as_relative = false
	add_child(status_badge_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.tasting_dish_cooked.connect(_on_tasting_dish_cooked)
		EventBus.tasting_challenge_judged.connect(_on_tasting_challenge_judged)
		EventBus.chef_pavilion_unlocked_changed.connect(_on_chef_pavilion_unlocked_changed)

	_sync_labels_and_tint()

func setup_chef_pavilion(p_island: int = 2, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci9_textures()
	_sync_labels_and_tint()

func reload_ci9_textures() -> void:
	tex_pavilion = EconomyConfig.load_pixel_texture(EconomyConfig.CHEF_TASTING_PAVILION_TEX)
	tex_chef_medal = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_CHEF_MEDAL_TEX)
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(td_id, {})
		var dp := String(dcfg.get("icon_tex", ""))
		if dp != "":
			tex_dish_icons[td_id] = EconomyConfig.load_pixel_texture(dp)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_pavilion if tex_pavilion != null else tex_fallback_cottage
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

func get_chef_pavilion_level() -> int:
	if GameManager == null:
		return 1
	return maxi(1, int(GameManager.building_levels.get("chef_pavilion", 1)))

func is_chef_pavilion_built() -> bool:
	return GameManager != null and GameManager.chef_pavilion_unlocked

func get_screen_rect() -> Rect2:
	var w := TARGET_VISUAL_W * absf(scale.x)
	var h := TARGET_VISUAL_H * absf(scale.y)
	if body_sprite != null and body_sprite.texture != null:
		w = float(body_sprite.texture.get_width()) * absf(base_scale_vec.x) * absf(scale.x)
		h = float(body_sprite.texture.get_height()) * absf(base_scale_vec.y) * absf(scale.y)
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func get_local_hit_rect() -> Rect2:
	var r := get_screen_rect()
	return r.grow(5.0)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "chef_pavilion":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_labels_and_tint()

func _on_tasting_dish_cooked(_dish_id: String, _qty: int) -> void:
	cook_flash_timer = 0.50
	_sync_labels_and_tint()

func _on_tasting_challenge_judged(_dish_id: String, _score: int, passed: bool, _g: int, _a: int, _v: int) -> void:
	cook_flash_timer = 0.80 if passed else 0.30
	_sync_labels_and_tint()

func _on_chef_pavilion_unlocked_changed(_unlocked: bool) -> void:
	_sync_labels_and_tint()

func _sync_labels_and_tint() -> void:
	if GameManager == null:
		return
	var built := is_chef_pavilion_built()
	var cur_lv := get_chef_pavilion_level()
	if level_label != null:
		level_label.text = ("Lv." + str(cur_lv)) if built else "待建食神席"
		if level_label.label_settings != null:
			level_label.label_settings.font_color = Color("#FFF4D6") if built else Color("#CBD5E1")
	if status_badge_label != null:
		if built:
			var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(GameManager.active_tasting_dish_id, {})
			var sname := String(dcfg.get("short_name", "灌汤小笼"))
			var passed_cnt := GameManager.get_passed_tasting_challenge_count()
			var medal_seg := ("·勋" + str(GameManager.chef_medals)) if GameManager.chef_medals > 0 else ("·鉴" + str(passed_cnt) + "/3")
			status_badge_label.text = "★" + sname + medal_seg
			if status_badge_label.label_settings != null:
				status_badge_label.label_settings.font_color = Color("#FFE066") if GameManager.chef_medals > 0 else Color("#FFD8A8")
		else:
			status_badge_label.text = "★食神席(" + str(EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD) + "G)"
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
	if cook_flash_timer > 0.0:
		cook_flash_timer = maxf(0.0, cook_flash_timer - delta)
	if body_sprite != null:
		if is_chef_pavilion_built():
			var breathe := sin(anim_time * 2.6) * 0.010
			body_sprite.scale = Vector2(base_scale_vec.x, base_scale_vec.y * (1.0 - breathe))
		else:
			body_sprite.scale = base_scale_vec
	_sync_labels_and_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_chef_pavilion_built() or GameManager == null:
		return

	# Warm hot-pot glow & rising pixel steam motes above the tasting tables
	var pulse := 0.86 + 0.14 * sin(anim_time * 2.4)
	var glow_a := 0.11 * pulse + (0.18 * (cook_flash_timer / 0.80) if cook_flash_timer > 0.0 else 0.0)
	draw_circle(Vector2(0.0, -18.0), 15.0, Color(1.0, 0.78, 0.48, glow_a))
	for mi in range(3):
		var phase := fmod(anim_time * 0.62 + float(mi) * 0.33, 1.0)
		var mx := -6.0 + float(mi) * 5.0 + sin(anim_time * 2.0 + float(mi)) * 1.5
		var my := -30.0 - phase * 14.0
		var ma := (1.0 - phase) * 0.46
		draw_rect(Rect2(roundf(mx), roundf(my), 2.5, 2.5), Color(1.0, 0.97, 0.90, ma), true)

	var prog := GameManager.get_chef_cook_ratio()
	var bar_w := 32.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 5.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(1.0, 0.66, 0.36, 0.96), true)

	var d_tex: Texture2D = tex_dish_icons.get(GameManager.active_tasting_dish_id, tex_dish_icons.get("dish_cloud_dumplings", null))
	if d_tex != null:
		draw_texture_rect(d_tex, Rect2(bx - 15.0, by - 4.5, 13.0, 13.0), false)
	if GameManager.chef_medals > 0 and tex_chef_medal != null:
		draw_texture_rect(tex_chef_medal, Rect2(bx + bar_w + 2.0, by - 5.0, 12.0, 12.0), false)
