extends Node2D
class_name PotteryKiln
## Island 3 Cloud Pottery Kiln Workshop (`云端陶艺窑坊`, `src/entities/buildings/PotteryKiln.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` (`Vector2(0.0, -52.0)`) so the kiln yard's tile tip sits on `GROUND_Y`.
## - Island 3 slot 1 (`x = 1437.8`, visual `43.68 x 40.56` = `112x104 * 0.39`) at the Bridge 2 landing, the slot of the former
##   decorative duplicate apple tree (same texture width & scale), `28.06px` clear of `SoilPlot_3` -> zero re-layout.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.
## - Kiln fire = soft glow circles at the firing mouth only (no programmatic polygons as art).

const SLOT_X := 1437.8 # == EconomyConfig.POTTERY_KILN_SLOT_X
const BASE_SPRITE_SCALE := 0.39 # == EconomyConfig.POTTERY_KILN_SCALE
const TARGET_VISUAL_W := 43.68 # 112.0 * 0.39
const TARGET_VISUAL_H := 40.56 # 104.0 * 0.39
## Firing mouth and chimney top in texture pixels of the 112x104 art (glow & smoke follow any same-size repaint)
const FIRE_TEX_POS := Vector2(46.0, 56.0)
const CHIMNEY_TEX_POS := Vector2(62.0, 16.0)

var island_idx: int = 3
var tex_kiln: Texture2D
var tex_fallback: Texture2D
var tex_pottery_icons: Dictionary = {}

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader

var anim_time: float = 0.0
var fire_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(BASE_SPRITE_SCALE, BASE_SPRITE_SCALE)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback = load("res://assets/pixel_art/buildings/cottage_mushroom.png")

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

	reload_ci12_textures()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "pottery_kiln", get_kiln_level())

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.pottery_kiln_unlocked_changed.connect(_on_kiln_unlocked_changed)
		EventBus.pottery_fired.connect(_on_pottery_fired)
		EventBus.pottery_clay_dug.connect(_on_pottery_clay_dug)

	_sync_tint()

func setup_pottery_kiln(p_island: int = 3, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci12_textures()
	_sync_tint()

func reload_ci12_textures() -> void:
	tex_kiln = EconomyConfig.load_pixel_texture(EconomyConfig.POTTERY_KILN_TEX)
	for p_id in EconomyConfig.POTTERY_CODEX_ORDER:
		var pcfg: Dictionary = EconomyConfig.POTTERY_ITEMS.get(p_id, {})
		var ip := String(pcfg.get("icon_tex", ""))
		if ip != "":
			tex_pottery_icons[p_id] = EconomyConfig.load_pixel_texture(ip)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_kiln if tex_kiln != null else tex_fallback
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

func get_kiln_level() -> int:
	if GameManager == null:
		return 1
	return GameManager.get_pottery_kiln_level()

func is_kiln_built() -> bool:
	return GameManager != null and GameManager.pottery_kiln_unlocked

## Texture-pixel point -> local point under the bottom-center pivot (follows any same-size repaint of the art)
func tex_to_local(tex_pt: Vector2) -> Vector2:
	var tw := 112.0
	var th := 104.0
	if body_sprite != null and body_sprite.texture != null:
		tw = float(body_sprite.texture.get_width())
		th = float(body_sprite.texture.get_height())
	return Vector2((tex_pt.x - tw * 0.5) * base_scale_vec.x, (tex_pt.y - th) * base_scale_vec.y)

func get_screen_rect() -> Rect2:
	var w := TARGET_VISUAL_W * absf(scale.x)
	var h := TARGET_VISUAL_H * absf(scale.y)
	if body_sprite != null and body_sprite.texture != null:
		w = float(body_sprite.texture.get_width()) * absf(base_scale_vec.x) * absf(scale.x)
		h = float(body_sprite.texture.get_height()) * absf(base_scale_vec.y) * absf(scale.y)
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func get_local_hit_rect() -> Rect2:
	return get_screen_rect().grow(5.0)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "pottery_kiln":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_tint()

func _on_kiln_unlocked_changed(_unlocked: bool) -> void:
	_sync_tint()

func _on_pottery_fired(_item_id: String, _qty: int, _stock: int) -> void:
	fire_flash_timer = 0.55
	_sync_tint()

func _on_pottery_clay_dug(_qty: int, _stock: int) -> void:
	_sync_tint()

func _sync_tint() -> void:
	if body_sprite != null and GameManager != null:
		body_sprite.modulate = Color.WHITE if is_kiln_built() else Color(0.74, 0.80, 0.86, 0.72)

func _process(delta: float) -> void:
	var isl_open := GameManager != null and bool(GameManager.unlocked_islands.get(island_idx, false))
	visible = isl_open
	if not visible:
		return
	anim_time += delta
	if fire_flash_timer > 0.0:
		fire_flash_timer = maxf(0.0, fire_flash_timer - delta)
	if body_sprite != null:
		body_sprite.scale = base_scale_vec
	_sync_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_kiln_built() or GameManager == null:
		return

	# Warm firing glow at the kiln mouth (brighter for a moment after each firing) + rising chimney smoke motes
	var fire_pt := tex_to_local(FIRE_TEX_POS)
	var flicker := 0.80 + 0.20 * sin(anim_time * 7.3) * sin(anim_time * 3.1 + 0.7)
	var glow_a := 0.16 * flicker + (0.22 * (fire_flash_timer / 0.55) if fire_flash_timer > 0.0 else 0.0)
	draw_circle(fire_pt, 7.5, Color(1.0, 0.62, 0.22, glow_a))
	draw_circle(fire_pt, 3.5, Color(1.0, 0.88, 0.46, glow_a * 1.4))
	var chim := tex_to_local(CHIMNEY_TEX_POS)
	for mi in range(3):
		var phase := fmod(anim_time * 0.50 + float(mi) * 0.33, 1.0)
		var mx := chim.x + sin(anim_time * 1.9 + float(mi) * 1.7) * 1.5 + phase * 2.0
		var my := chim.y - 3.0 - phase * 11.0
		draw_rect(Rect2(roundf(mx), roundf(my), 2.5, 2.5), Color(0.94, 0.92, 0.88, (1.0 - phase) * 0.45), true)

	# Firing-cycle progress bar + the active ware icon (tea bowl / vase)
	# the bar and its icon only show while the mouse is on the building
	if EconomyConfig.hovered_building != "pottery_kiln":
		return
	var prog := GameManager.get_pottery_cycle_ratio()
	var bar_w := 30.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 5.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(1.0, 0.72, 0.42, 0.96), true)
	var r_tex: Texture2D = tex_pottery_icons.get(GameManager.active_pottery_recipe_id, null)
	if r_tex != null:
		draw_texture_rect(r_tex, Rect2(bx - 15.0, by - 4.5, 13.0, 13.0), false)
