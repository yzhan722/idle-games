extends Node2D
class_name OpenAirCinema
## Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`, `src/entities/buildings/OpenAirCinema.gd`)
## A NIGHT-ONLY EVENT PROP (not a main building): the screen, benches and projector are set up on the Island 1 east headland
## (solid grass `[1313..1356]` between the Lotus Pond east bridge and Bridge 2) when the NIGHT phase begins and are packed
## away at dawn. Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(1334.5, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` (`Vector2(0.0, -52.0)`) so the grass tile tip sits on `GROUND_Y`.
## - Visual `39.2 x 36.4` (`112x104 * 0.35`), >= 28px from every Island 1 main building (nearest: `MarketStall_1`, ~268px).
## - Screening light = soft glow circles only (no programmatic polygons as art).
## - 100% Godot native `Label + LabelSettings` (own `LabelSettings` copy, ZERO deprecated font, ZERO Emoji, ZERO SVG).

const SLOT_X := 1334.5 # == EconomyConfig.OPEN_AIR_CINEMA_SLOT_X
const BASE_SPRITE_SCALE := 0.35 # == EconomyConfig.OPEN_AIR_CINEMA_SCALE
const TARGET_VISUAL_W := 39.2 # 112.0 * 0.35
const TARGET_VISUAL_H := 36.4 # 104.0 * 0.35
## Projection canvas centre and projector lens in texture pixels of the 112x104 art (glows follow any same-size repaint)
const SCREEN_TEX_CENTER := Vector2(43.0, 36.0)
const PROJECTOR_TEX_POS := Vector2(78.0, 64.0)
## Marquee badge: just above the screen frame and below the docked airship's `★商队` badge (`y <= 72.2` incl. bob)
const BADGE_Y := -TARGET_VISUAL_H - 14.0
const FADE_SPEED := 3.0

var tex_cinema: Texture2D
var tex_fallback: Texture2D
var tex_ticket: Texture2D
var tex_pudding: Texture2D

var body_sprite: Sprite2D
## Film-light layer drawn ABOVE the body sprite (a node's own `_draw` renders under its children)
var screen_light_layer: Node2D
var marquee_label: Label

var anim_time: float = 0.0
var show_alpha: float = 0.0
var settle_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(BASE_SPRITE_SCALE, BASE_SPRITE_SCALE)

func _ready() -> void:
	z_index = EconomyConfig.Z_BUILDING
	z_as_relative = false

	tex_fallback = load("res://assets/pixel_art/buildings/market_stall.png")

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

	screen_light_layer = Node2D.new()
	screen_light_layer.name = "ScreenLightLayer"
	screen_light_layer.z_index = EconomyConfig.Z_BUILDING + 1
	screen_light_layer.z_as_relative = false
	add_child(screen_light_layer)
	screen_light_layer.draw.connect(_draw_screen_light)

	marquee_label = EconomyConfig.create_pixel_label("★星空露天影院", 13, Color("#FFD8A8"), true)
	marquee_label.name = "OpenAirCinemaMarqueeLabel"
	# Own LabelSettings copy: recolouring the marquee must never leak into other shared 13px labels
	marquee_label.label_settings = marquee_label.label_settings.duplicate() as LabelSettings
	marquee_label.scale = Vector2(0.74, 0.74)
	marquee_label.position = Vector2(-40.0, BADGE_Y)
	marquee_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	marquee_label.z_as_relative = false
	add_child(marquee_label)

	if EventBus != null:
		EventBus.open_air_cinema_unlocked_changed.connect(_on_cinema_unlocked_changed)
		EventBus.cinema_screening_settled.connect(_on_cinema_screening_settled)

	_sync_visibility(true)
	_sync_labels_and_tint()

func setup_open_air_cinema(p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci11_textures()
	_sync_labels_and_tint()

func reload_ci11_textures() -> void:
	tex_cinema = EconomyConfig.load_pixel_texture(EconomyConfig.OPEN_AIR_CINEMA_TEX)
	tex_ticket = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOVIE_TICKET_TEX)
	tex_pudding = EconomyConfig.load_pixel_texture(EconomyConfig.CLOUD_PUDDING_TEX)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_cinema if tex_cinema != null else tex_fallback
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

func is_cinema_built() -> bool:
	return GameManager != null and GameManager.open_air_cinema_unlocked

## The prop only exists on the headland during the NIGHT phase (built: open cinema, unbuilt: a dim "for hire" preview).
func is_night_now() -> bool:
	return GameManager != null and GameManager.current_weather == GameManager.WeatherState.NIGHT

func get_screen_rect() -> Rect2:
	var w := TARGET_VISUAL_W * absf(scale.x)
	var h := TARGET_VISUAL_H * absf(scale.y)
	if body_sprite != null and body_sprite.texture != null:
		w = float(body_sprite.texture.get_width()) * absf(base_scale_vec.x) * absf(scale.x)
		h = float(body_sprite.texture.get_height()) * absf(base_scale_vec.y) * absf(scale.y)
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func get_local_hit_rect() -> Rect2:
	if not visible:
		return Rect2()
	return get_screen_rect().grow(4.0)

func get_badge_local_rect() -> Rect2:
	if marquee_label == null:
		return Rect2()
	return Rect2(position + marquee_label.position, marquee_label.size * marquee_label.scale)

func _tex_to_local(tex_pt: Vector2) -> Vector2:
	var tw := 112.0
	var th := 104.0
	if body_sprite != null and body_sprite.texture != null:
		tw = float(body_sprite.texture.get_width())
		th = float(body_sprite.texture.get_height())
	return Vector2((tex_pt.x - tw * 0.5) * base_scale_vec.x, -(th - tex_pt.y) * base_scale_vec.y)

func get_screen_glow_local() -> Vector2:
	return _tex_to_local(SCREEN_TEX_CENTER)

func _on_cinema_unlocked_changed(_unlocked: bool) -> void:
	_sync_labels_and_tint()

func _on_cinema_screening_settled(_film_id: String, _audience: int, _ticket_gold: int, _snack_gold: int) -> void:
	settle_flash_timer = 0.8
	_sync_labels_and_tint()

## Snaps (`instant`) or fades the prop in at night / out at dawn.
func _sync_visibility(instant: bool = false, delta: float = 0.0) -> void:
	var target := 1.0 if is_night_now() else 0.0
	if instant:
		show_alpha = target
	else:
		show_alpha = move_toward(show_alpha, target, delta * FADE_SPEED)
	visible = show_alpha > 0.02
	modulate = Color(1.0, 1.0, 1.0, show_alpha)

func _sync_labels_and_tint() -> void:
	if GameManager == null or marquee_label == null or marquee_label.label_settings == null:
		return
	var built := is_cinema_built()
	if not built:
		marquee_label.text = "★露天影院(" + str(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD) + "G)"
		marquee_label.label_settings.font_color = Color("#CBD5E1")
	else:
		var sm := GameManager.get_cinema_status_summary()
		if bool(sm["screening"]):
			marquee_label.text = "★放映%d/%d·%s %ds" % [int(sm["slot"]) + 1, int(sm["slot_count"]), String(sm["film_short"]), maxi(1, int(ceili(float(sm["remaining"]))))]
			marquee_label.label_settings.font_color = Color("#FFE066")
		elif int(sm["slot"]) >= 0:
			marquee_label.text = "★幕间零食·%ds" % maxi(1, int(ceili(float(sm["intermission_left"]))))
			marquee_label.label_settings.font_color = Color("#FFD8A8")
		elif bool(sm["open"]):
			marquee_label.text = "★今夜散场·影票%d" % int(GameManager.cinema_screenings_tonight)
			marquee_label.label_settings.font_color = Color("#FFF4D6")
		else:
			marquee_label.text = "★星空露天影院"
			marquee_label.label_settings.font_color = Color("#FFD8A8")
	marquee_label.size = Vector2.ZERO
	marquee_label.position = Vector2(-marquee_label.size.x * marquee_label.scale.x * 0.5 + 4.0, BADGE_Y)
	if body_sprite != null:
		body_sprite.modulate = Color.WHITE if built else Color(0.70, 0.76, 0.86, 0.70)

func _process(delta: float) -> void:
	anim_time += delta
	if settle_flash_timer > 0.0:
		settle_flash_timer = maxf(0.0, settle_flash_timer - delta)
	_sync_visibility(false, delta)
	if not visible:
		return
	if body_sprite != null:
		body_sprite.scale = base_scale_vec
	_sync_labels_and_tint()
	queue_redraw()
	if screen_light_layer != null:
		screen_light_layer.queue_redraw()

## Film light on the canvas while a screening runs: a soft glow drifting through warm / moonlit / sea-blue scene tints,
## plus the projector lamp (glow circles only, no programmatic polygons as art).
func _draw_screen_light() -> void:
	if not visible or not is_cinema_built() or GameManager == null:
		return
	if not GameManager.is_cinema_screening_active():
		if settle_flash_timer > 0.0 and tex_pudding != null:
			# Intermission snack pop: a cloud pudding rises above the benches after each settled screening
			var rise := (1.0 - settle_flash_timer / 0.8) * 8.0
			screen_light_layer.draw_texture_rect(tex_pudding, Rect2(8.0, -22.0 - rise, 9.0, 9.0), false, Color(1.0, 1.0, 1.0, settle_flash_timer / 0.8))
		return
	var scene_t := fmod(anim_time * 0.7, 3.0)
	var tint := Color(1.0, 0.72, 0.36) if scene_t < 1.0 else (Color(0.50, 0.66, 1.0) if scene_t < 2.0 else Color(0.40, 0.92, 0.80))
	var flicker := 0.82 + 0.18 * sin(anim_time * 9.0) * sin(anim_time * 3.3)
	var sc_pos := get_screen_glow_local()
	screen_light_layer.draw_circle(sc_pos, 9.0, Color(tint.r, tint.g, tint.b, 0.16 * flicker))
	screen_light_layer.draw_circle(sc_pos, 5.0, Color(tint.r, tint.g, tint.b, 0.30 * flicker))
	screen_light_layer.draw_circle(_tex_to_local(PROJECTOR_TEX_POS), 2.2, Color(1.0, 0.97, 0.78, 0.80 * flicker))

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	# Ticket stub icon at the left end of the marquee
	if tex_ticket != null and marquee_label != null:
		draw_texture_rect(tex_ticket, Rect2(marquee_label.position.x - 12.0, BADGE_Y + 0.5, 11.0, 11.0), false)

