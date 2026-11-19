extends Node2D
class_name LighthouseHarbor
## Island 3 Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`, `src/entities/buildings/LighthouseHarbor.gd`)
## Strictly enforces GEMINI.md Laws 1~6:
## - Root `position = Vector2(slot_x, GROUND_Y)` (`GROUND_Y = 124.0`) is the bottom-center grounding point (`z_index = 0`).
## - `body_sprite`: `centered = true`, `hframes = 1`, `vframes = 1`, `region_enabled = false`,
##   `offset = Vector2(0.0, -float(tex_h) * 0.5)` (`Vector2(0.0, -64.0)`) so the stone quay + pier legs sit flush on `GROUND_Y`.
## - Island 3 slot 5 (`x = 1743.4`, visual `43.2 x 57.6`), >= 28px clear gap to `CloudHotspringInn_3` and `RightTiki_3`.
## - The east cove below the pier is the fishing-boat lane, so there is NO `Lv.` label under the building:
##   level, catch stock and the Specialty Auction status live in the badges above the lamp room.
## - 5:1 Ultra-Flat Polygon Drop Shadow at `Vector2(0, 0)` via `EconomyConfig.draw_drop_shadow`.
## - 100% Godot native `Label + LabelSettings` (own `LabelSettings` copies, ZERO deprecated font, ZERO Emoji, ZERO SVG).

const SLOT_X := 1743.4 # == EconomyConfig.LIGHTHOUSE_HARBOR_SLOT_X
const BASE_SPRITE_SCALE := 0.45
const TARGET_VISUAL_W := 43.2 # 96.0 * 0.45
const TARGET_VISUAL_H := 57.6 # 128.0 * 0.45
## Lamp room of the tower in texture pixels (96x128 art) -> beacon glow anchor
const LAMP_TEX_POS := Vector2(32.0, 26.0)
## Badges are centred over the tower (west half of the art), keeping clear of visitor bubbles at the east Tiki spawn
const BADGE_CENTER_X := -6.0

var island_idx: int = 3
var tex_lighthouse: Texture2D
var tex_fallback_tiki: Texture2D
var tex_seafood: Texture2D
var tex_gavel: Texture2D
var tex_lot_icons: Dictionary = {}

var body_sprite: Sprite2D
var visual_upgrader: BuildingVisualUpgrader
var status_badge_label: Label
var auction_badge_label: Label

var anim_time: float = 0.0
var landing_flash_timer: float = 0.0
var base_scale_vec: Vector2 = Vector2(BASE_SPRITE_SCALE, BASE_SPRITE_SCALE)

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

	reload_ci10_textures()

	visual_upgrader = BuildingVisualUpgrader.new()
	add_child(visual_upgrader)
	visual_upgrader.setup_upgrader(self, "lighthouse_harbor", get_harbor_level())

	status_badge_label = EconomyConfig.create_pixel_label(EconomyConfig.tr_key("wl_lh_init"), 13, Color("#88D8FF"), true)
	status_badge_label.name = "LighthouseHarborBadgeLabel"
	# Own LabelSettings copy: tinting this badge must never recolour other shared 13px labels
	status_badge_label.label_settings = status_badge_label.label_settings.duplicate() as LabelSettings
	status_badge_label.custom_minimum_size = Vector2(118.0, 18.0)
	status_badge_label.scale = Vector2(0.74, 0.74)
	status_badge_label.position = Vector2(-43.7, -TARGET_VISUAL_H - 27.0)
	status_badge_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	status_badge_label.z_as_relative = false
	add_child(status_badge_label)

	auction_badge_label = EconomyConfig.create_pixel_label(EconomyConfig.tr_key("wl_au_init"), 13, Color("#FFD8A8"), true)
	auction_badge_label.name = "SpecialtyAuctionBadgeLabel"
	auction_badge_label.label_settings = auction_badge_label.label_settings.duplicate() as LabelSettings
	auction_badge_label.custom_minimum_size = Vector2(136.0, 18.0)
	auction_badge_label.scale = Vector2(0.74, 0.74)
	auction_badge_label.position = Vector2(-50.3, -TARGET_VISUAL_H - 44.0)
	auction_badge_label.z_index = EconomyConfig.Z_CARRY_EMOTE
	auction_badge_label.z_as_relative = false
	auction_badge_label.visible = false
	add_child(auction_badge_label)

	if EventBus != null:
		EventBus.upgrade_purchased.connect(_on_upgrade_purchased)
		EventBus.lighthouse_harbor_unlocked_changed.connect(_on_harbor_unlocked_changed)
		EventBus.seafood_catch_landed.connect(_on_seafood_catch_landed)

	_sync_labels_and_tint()

func setup_lighthouse_harbor(p_island: int = 3, p_pos: Vector2 = Vector2(SLOT_X, EconomyConfig.GROUND_Y)) -> void:
	island_idx = p_island
	position = Vector2(p_pos.x, EconomyConfig.GROUND_Y)
	reload_ci10_textures()
	_sync_labels_and_tint()

func reload_ci10_textures() -> void:
	tex_lighthouse = EconomyConfig.load_pixel_texture(EconomyConfig.LIGHTHOUSE_HARBOR_TEX)
	tex_seafood = EconomyConfig.load_pixel_texture(EconomyConfig.SEAFOOD_CATCH_TEX)
	tex_gavel = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_AUCTION_GAVEL_TEX)
	for lot_id in EconomyConfig.AUCTION_LOT_ORDER:
		var lcfg: Dictionary = EconomyConfig.AUCTION_LOTS.get(lot_id, {})
		var lp := String(lcfg.get("icon_tex", ""))
		if lp != "":
			tex_lot_icons[lot_id] = EconomyConfig.load_pixel_texture(lp)
	_apply_body_texture()

func _apply_body_texture() -> void:
	if body_sprite == null:
		return
	var active_tex := tex_lighthouse if tex_lighthouse != null else tex_fallback_tiki
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

func get_harbor_level() -> int:
	if GameManager == null:
		return 1
	return GameManager.get_harbor_level()

func is_harbor_built() -> bool:
	return GameManager != null and GameManager.lighthouse_harbor_unlocked

func get_screen_rect() -> Rect2:
	var w := TARGET_VISUAL_W * absf(scale.x)
	var h := TARGET_VISUAL_H * absf(scale.y)
	if body_sprite != null and body_sprite.texture != null:
		w = float(body_sprite.texture.get_width()) * absf(base_scale_vec.x) * absf(scale.x)
		h = float(body_sprite.texture.get_height()) * absf(base_scale_vec.y) * absf(scale.y)
	return Rect2(position.x - w * 0.5, position.y - h, w, h)

func get_local_hit_rect() -> Rect2:
	return get_screen_rect().grow(5.0)

## Beacon (lamp room) position in the parent's local space, derived from the art so it follows any same-size repaint.
func get_lamp_local_offset() -> Vector2:
	var tw := 96.0
	var th := 128.0
	if body_sprite != null and body_sprite.texture != null:
		tw = float(body_sprite.texture.get_width())
		th = float(body_sprite.texture.get_height())
	return Vector2((LAMP_TEX_POS.x - tw * 0.5) * base_scale_vec.x, -(th - LAMP_TEX_POS.y) * base_scale_vec.y)

func _on_upgrade_purchased(category: String, key: String, new_level: int) -> void:
	if category == "building" and key == "lighthouse_harbor":
		if visual_upgrader != null:
			visual_upgrader.apply_level_visuals(new_level, true)
		_sync_labels_and_tint()

func _on_harbor_unlocked_changed(_unlocked: bool) -> void:
	_sync_labels_and_tint()

func _on_seafood_catch_landed(_boat_idx: int, _qty: int, _stock: int) -> void:
	landing_flash_timer = 0.6
	_sync_labels_and_tint()

func _sync_labels_and_tint() -> void:
	if GameManager == null:
		return
	var built := is_harbor_built()
	var auction_on := built and GameManager.island_auction_active
	if status_badge_label != null and status_badge_label.label_settings != null:
		if not built:
			status_badge_label.text = EconomyConfig.tr_fmt("wl_lh_cost", [EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD])
			status_badge_label.label_settings.font_color = Color("#CBD5E1")
		elif auction_on:
			var sm := GameManager.get_auction_status_summary()
			if String(sm["high_bidder"]) == "":
				status_badge_label.text = EconomyConfig.tr_fmt("wl_au_open", [int(sm["next_bid"]), String(sm["cur_tag"])])
				status_badge_label.label_settings.font_color = Color("#FFF4D6")
			else:
				# zh keeps the full bidder name; en / ja use the short one so the badge stays inside its zh footprint
				var lead_txt := EconomyConfig.tr_key("wl_au_you") if bool(sm["player_leading"]) else (String(sm["leader_name"]) if EconomyConfig.is_zh() else EconomyConfig.get_auction_bidder_short_name(String(sm["high_bidder"])))
				status_badge_label.text = EconomyConfig.tr_fmt("wl_au_now", [int(sm["high_bid"]), String(sm["cur_tag"]), lead_txt])
				status_badge_label.label_settings.font_color = Color("#8CE99A") if bool(sm["player_leading"]) else Color("#FFA8A8")
		else:
			status_badge_label.text = EconomyConfig.tr_fmt("wl_lh_lv", [get_harbor_level(), GameManager.get_harbor_seafood_stock()])
			status_badge_label.label_settings.font_color = Color("#88D8FF")
	if auction_badge_label != null:
		auction_badge_label.visible = auction_on
		if auction_on:
			var sm2 := GameManager.get_auction_status_summary()
			auction_badge_label.text = EconomyConfig.tr_key("wl_au_on") % [int(sm2["lot_index"]) + 1, int(sm2["lot_count"]), String(sm2["lot_short"]), maxi(1, int(ceili(float(sm2["timer"]))))]
	_center_badge(status_badge_label, -TARGET_VISUAL_H - 27.0)
	_center_badge(auction_badge_label, -TARGET_VISUAL_H - 44.0)
	if body_sprite != null:
		body_sprite.modulate = Color.WHITE if built else Color(0.74, 0.80, 0.86, 0.72)

## Keeps a badge horizontally centred over the lighthouse whatever its text width (a Label never shrinks on its own).
func _center_badge(lbl: Label, base_y: float) -> void:
	if lbl == null:
		return
	lbl.size = Vector2.ZERO
	lbl.position = Vector2(BADGE_CENTER_X - lbl.size.x * lbl.scale.x * 0.5, base_y)

func get_badge_local_rect(lbl: Label) -> Rect2:
	if lbl == null:
		return Rect2()
	return Rect2(position + lbl.position, lbl.size * lbl.scale)

func _process(delta: float) -> void:
	var isl_open := GameManager != null and bool(GameManager.unlocked_islands.get(island_idx, false))
	visible = isl_open
	if not visible:
		return
	anim_time += delta
	if landing_flash_timer > 0.0:
		landing_flash_timer = maxf(0.0, landing_flash_timer - delta)
	if body_sprite != null:
		body_sprite.scale = base_scale_vec
	_sync_labels_and_tint()
	queue_redraw()

func _draw() -> void:
	if not visible:
		return
	# GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow at origin `Vector2(0, 0)`
	EconomyConfig.draw_drop_shadow(self, TARGET_VISUAL_W)

	if not is_harbor_built() or GameManager == null:
		return

	# Warm beacon glow pulsing in the lamp room (brighter for a moment whenever a boat lands its catch)
	var lamp := get_lamp_local_offset()
	var pulse := 0.80 + 0.20 * sin(anim_time * 3.1)
	var flash := (0.22 * (landing_flash_timer / 0.6)) if landing_flash_timer > 0.0 else 0.0
	draw_circle(lamp, 7.5 * pulse, Color(1.0, 0.92, 0.55, 0.20 * pulse + flash))
	draw_circle(lamp, 3.5, Color(1.0, 0.97, 0.78, 0.38 * pulse + flash))

	# Next-catch progress bar (two boats half a rota apart) + seafood icon
	var prog := GameManager.get_harbor_trip_ratio()
	var bar_w := 30.0
	var bar_h := 4.5
	var bx := -bar_w * 0.5 + 6.0
	var by := -TARGET_VISUAL_H - 7.0
	draw_rect(Rect2(bx - 1.0, by - 1.0, bar_w + 2.0, bar_h + 2.0), Color(0.10, 0.07, 0.04, 0.92), true)
	draw_rect(Rect2(bx, by, bar_w * prog, bar_h), Color(0.53, 0.85, 1.0, 0.96), true)
	if tex_seafood != null:
		draw_texture_rect(tex_seafood, Rect2(bx - 15.0, by - 4.5, 13.0, 13.0), false)

	# Specialty Auction podium icons flanking the auction badge
	if GameManager.island_auction_active and auction_badge_label != null and auction_badge_label.visible:
		var ab_y := auction_badge_label.position.y + 0.5
		var ab_w := auction_badge_label.size.x * auction_badge_label.scale.x
		if tex_gavel != null:
			draw_texture_rect(tex_gavel, Rect2(auction_badge_label.position.x - 12.0, ab_y, 12.0, 12.0), false)
		var lot_tex: Texture2D = tex_lot_icons.get(GameManager.get_auction_lot_id(), null)
		if lot_tex != null:
			draw_texture_rect(lot_tex, Rect2(auction_badge_label.position.x + ab_w + 0.5, ab_y, 12.0, 12.0), false)
