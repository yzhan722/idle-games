extends Node2D
class_name DairyWorkshop
## Island 1 Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`, `src/entities/buildings/DairyWorkshop.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` (`Vector2(0.0, -52.0)`) so the barn's grass tile tip sits on `GROUND_Y`.
## - Island 1 slot 4 (`x = 817.3`, visual `42.56 x 39.52`) between `MushroomCottage_1` and `MortarWorkshop_1`,
##   >= 28px clear gap to both neighbours after the CI-11 7-slot re-lay of Island 1.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.

const SLOT_X := 817.3 # == EconomyConfig.DAIRY_WORKSHOP_SLOT_X
const BASE_SPRITE_SCALE := 0.38
const TARGET_VISUAL_W := 42.56 # 112.0 * 0.38
const TARGET_VISUAL_H := 39.52 # 104.0 * 0.38

var island_idx: int = 1
var tex_dairy: Texture2D
var tex_fallback_cottage: Texture2D
var tex_dairy_icons: Dictionary = {}

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader

var anim_time: float = 0.0
var craft_flash_timer: float = 0.0
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

	reload_ci11_textures()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "dairy_workshop", get_dairy_level())

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.dairy_workshop_unlocked_changed.connect(_on_dairy_unlocked_changed)
		EventBus.dairy_milked.connect(_on_dairy_milked)
		EventBus.dairy_product_crafted.connect(_on_dairy_product_crafted)

	_sync_tint()

func setup_dairy_workshop(p_island: int = 1, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci11_textures()
	_sync_tint()

func reload_ci11_textures() -> void:
	tex_dairy = EconomyConfig.load_pixel_texture(EconomyConfig.DAIRY_WORKSHOP_TEX)
	for d_id in EconomyConfig.DAIRY_CODEX_ORDER:
		var dcfg: Dictionary = EconomyConfig.DAIRY_ITEMS.get(d_id, {})
		var ip := String(dcfg.get("icon_tex", ""))
		if ip != "":
			tex_dairy_icons[d_id] = EconomyConfig.load_pixel_texture(ip)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_dairy if tex_dairy != null else tex_fallback_cottage
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

func get_dairy_level() -> int:
	if GameManager == null:
		return 1
	return GameManager.get_dairy_level()

func is_dairy_built() -> bool:
	return GameManager != null and GameManager.dairy_workshop_unlocked

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
	if category == "building" and key == "dairy_workshop":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_tint()

func _on_dairy_unlocked_changed(_unlocked: bool) -> void:
	_sync_tint()

func _on_dairy_milked(_qty: int, _stock: int) -> void:
	craft_flash_timer = 0.40
	_sync_tint()

func _on_dairy_product_crafted(_item_id: String, _qty: int, _stock: int) -> void:
	craft_flash_timer = 0.55
	_sync_tint()

func _sync_tint() -> void:
	if body_sprite != null and GameManager != null:
		body_sprite.modulate = Color.WHITE if is_dairy_built() else Color(0.74, 0.80, 0.86, 0.72)

func _process(delta: float) -> void:
	var isl_open := GameManager != null and bool(GameManager.unlocked_islands.get(island_idx, true))
	visible = isl_open
	if not visible:
		return
	anim_time += delta
	if craft_flash_timer > 0.0:
		craft_flash_timer = maxf(0.0, craft_flash_timer - delta)
	if body_sprite != null:
		if is_dairy_built():
			var breathe := sin(anim_time * 2.4) * 0.010
			body_sprite.scale = Vector2(base_scale_vec.x, base_scale_vec.y * (1.0 - breathe))
		else:
			body_sprite.scale = base_scale_vec
	_sync_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_dairy_built() or GameManager == null:
		return

	# Warm creamery glow at the barn door (brighter for a moment after each milking / craft)
	var pulse := 0.86 + 0.14 * sin(anim_time * 2.2)
	var glow_a := 0.10 * pulse + (0.18 * (craft_flash_timer / 0.55) if craft_flash_timer > 0.0 else 0.0)
	draw_circle(Vector2(0.0, -14.0), 12.0, Color(1.0, 0.96, 0.84, glow_a))

	# Milking-cycle progress bar + the active recipe icon (cheese wheel / cloud pudding) + milk bottle
	# the bar and its icon only show while the mouse is on the building
	if EconomyConfig.hovered_building != "dairy_workshop":
		return
	var prog := GameManager.get_dairy_cycle_ratio()
	var bar_w := 30.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 5.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(1.0, 0.94, 0.72, 0.96), true)
	var r_tex: Texture2D = tex_dairy_icons.get(GameManager.active_dairy_recipe_id, null)
	if r_tex != null:
		draw_texture_rect(r_tex, Rect2(bx - 15.0, by - 4.5, 13.0, 13.0), false)
