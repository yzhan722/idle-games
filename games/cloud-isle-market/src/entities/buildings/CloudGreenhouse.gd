extends Node2D
class_name CloudGreenhouse
## Cloud Greenhouse Hybrid Flora Nursery (`src/entities/buildings/CloudGreenhouse.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` so bottom of greenhouse aligns 100% flush with `GROUND_Y = 124.0`.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.

## CI-9: Island 2 re-slotted to 6 buildings (with `ChefTastingPavilion_2`), every adjacent clear gap >= 28px
const SLOT_X := 325.9
const TARGET_VISUAL_W := 44.24 # 112.0 * 0.395
const TARGET_VISUAL_H := 41.08 # 104.0 * 0.395

var island_idx: int = 2
var tex_greenhouse: Texture2D
var tex_fallback_hut: Texture2D
var tex_flora_icons: Dictionary = {}
var tex_souvenir_icons: Dictionary = {}

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader

var anim_time: float = 0.0
var harvest_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(0.395, 0.395)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback_hut = load("res://assets/pixel_art/buildings/cottage_mushroom.png")

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

	reload_ci5_textures()

	var cur_lv := get_greenhouse_level()
	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "greenhouse", cur_lv)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.hybrid_flora_harvested.connect(_on_hybrid_flora_harvested)
		EventBus.greenhouse_unlocked_changed.connect(_on_greenhouse_unlocked_changed)

	_sync_tint()

func setup_greenhouse(p_island: int = 2, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci5_textures()
	_sync_tint()

func reload_ci5_textures() -> void:
	tex_greenhouse = EconomyConfig.load_pixel_texture(EconomyConfig.CLOUD_GREENHOUSE_TEX)
	for fid in EconomyConfig.HYBRID_FLORA_ORDER:
		var fcfg: Dictionary = EconomyConfig.HYBRID_FLORA.get(fid, {})
		var fp := String(fcfg.get("icon_tex", ""))
		if fp != "":
			tex_flora_icons[fid] = EconomyConfig.load_pixel_texture(fp)
	for bid in EconomyConfig.SOUVENIR_BOX_ORDER:
		var bcfg: Dictionary = EconomyConfig.SOUVENIR_BOXES.get(bid, {})
		var bp := String(bcfg.get("icon_tex", ""))
		if bp != "":
			tex_souvenir_icons[bid] = EconomyConfig.load_pixel_texture(bp)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_greenhouse if tex_greenhouse != null else tex_fallback_hut
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

func get_greenhouse_level() -> int:
	if GameManager == null:
		return 1
	return maxi(1, int(GameManager.building_levels.get("greenhouse", 1)))

func is_greenhouse_built() -> bool:
	return GameManager != null and GameManager.greenhouse_unlocked

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
	if category == "building" and key == "greenhouse":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_tint()

func _on_hybrid_flora_harvested(_flora_id: String, _qty: int) -> void:
	harvest_flash_timer = 0.45
	_sync_tint()

func _on_greenhouse_unlocked_changed(_unlocked: bool) -> void:
	_sync_tint()

func _sync_tint() -> void:
	if body_sprite != null and GameManager != null:
		body_sprite.modulate = Color.WHITE if is_greenhouse_built() else Color(0.74, 0.80, 0.86, 0.72)

func _process(delta: float) -> void:
	var isl_open := GameManager != null and bool(GameManager.unlocked_islands.get(island_idx, false))
	visible = isl_open
	if not visible:
		return
	anim_time += delta
	if harvest_flash_timer > 0.0:
		harvest_flash_timer = maxf(0.0, harvest_flash_timer - delta)
	if body_sprite != null:
		if is_greenhouse_built():
			var breathe := sin(anim_time * 3.2) * 0.015
			body_sprite.scale = Vector2(base_scale_vec.x * (1.0 + breathe), base_scale_vec.y * (1.0 - breathe))
		else:
			body_sprite.scale = base_scale_vec
	_sync_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_greenhouse_built() or GameManager == null:
		return

	# Subtle warm greenhouse sunlight aura & cultivation progress bar
	var pulse := 0.85 + 0.15 * sin(anim_time * 2.8)
	var glow_a := 0.12 * pulse + (0.16 * (harvest_flash_timer / 0.45) if harvest_flash_timer > 0.0 else 0.0)
	draw_circle(Vector2(0.0, -28.0), 18.0, Color(0.62, 0.98, 0.74, glow_a))

	# the bar and its icon only show while the mouse is on the building
	if EconomyConfig.hovered_building != "greenhouse":
		return
	var prog := GameManager.get_greenhouse_growth_ratio()
	var bar_w := 38.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 6.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(0.55, 0.95, 0.68, 0.96), true)

	var fid := GameManager.active_greenhouse_flora_id
	var f_tex: Texture2D = tex_flora_icons.get(fid, null)
	if f_tex != null:
		draw_texture_rect(f_tex, Rect2(bx - 16.0, by - 5.0, 14.0, 14.0), false)
