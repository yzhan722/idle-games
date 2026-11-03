extends Control
class_name HUD
## Retro Maple-Style Artisan HUD, Recruit-to-Promote Cards, One-Click Mute & Auto-Collapsing Capsule (`src/ui/HUD.gd`) — PRD Patch v2.2

var tex_panel: Texture2D
var tex_drawer: Texture2D
var tex_card: Texture2D
var tex_card_hover: Texture2D
var tex_pill: Texture2D
var tex_icons: Texture2D
var tex_delicacies: Texture2D

var active_tab: int = 0
var hovered_tab: int = -1
var hovered_card: int = -1
var displayed_gold: float = 120.0

var is_mouse_over_hud: bool = false
var drawer_expanded: bool = false
var drawer_anim_t: float = 0.0
var mouse_outside_timer: float = 0.0
var hud_opacity: float = 1.0

var offline_banner_timer: float = 0.0
var offline_banner_text: String = ""

var window_controller: WindowController

const CAPSULE_RECT := Rect2(770.0, 246.0, 380.0, 42.0)
const CAPSULE_MUTE_RECT := Rect2(1088.0, 251.0, 54.0, 32.0)
const FULL_BAR_RECT := Rect2(480.0, 238.0, 960.0, 58.0)
const DRAWER_RECT := Rect2(520.0, 130.0, 880.0, 106.0)
const TOP_RIGHT_MUTE_RECT := Rect2(1332.0, 138.0, 58.0, 24.0)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	tex_panel = load("res://assets/pixel_art/ui/panel_wood_9patch.png")
	tex_drawer = load("res://assets/pixel_art/ui/panel_drawer_parchment.png")
	tex_card = load("res://assets/pixel_art/ui/ui_drawer_card.png")
	tex_card_hover = load("res://assets/pixel_art/ui/ui_drawer_card_hover.png")
	tex_pill = load("res://assets/pixel_art/ui/ui_resource_pill.png")
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")

	displayed_gold = float(GameManager.gold)
	if GameManager.pending_offline_gold > 0:
		offline_banner_timer = 7.5
		offline_banner_text = "★离线挂机 " + str(GameManager.pending_offline_seconds) + "秒 · 自动结账 +" + str(GameManager.pending_offline_gold) + "G!"

func _process(delta: float) -> void:
	displayed_gold = lerpf(displayed_gold, float(GameManager.gold), minf(1.0, delta * 9.0))
	if absf(displayed_gold - float(GameManager.gold)) < 0.6:
		displayed_gold = float(GameManager.gold)

	if offline_banner_timer > 0.0:
		offline_banner_timer = maxf(0.0, offline_banner_timer - delta)

	var mpos := get_local_mouse_position()
	var hover_zone := _get_interactive_zone()
	is_mouse_over_hud = hover_zone.has_point(mpos)

	if GameManager.desktop_companion_mode:
		if is_mouse_over_hud:
			mouse_outside_timer = 0.0
			drawer_expanded = true
			hud_opacity = lerpf(hud_opacity, 1.0, minf(1.0, delta * 10.0))
		else:
			mouse_outside_timer += delta
			if mouse_outside_timer >= 3.0:
				drawer_expanded = false
				hud_opacity = lerpf(hud_opacity, 0.40, minf(1.0, delta * 5.0))
	else:
		hud_opacity = 1.0

	drawer_anim_t = lerpf(drawer_anim_t, 1.0 if drawer_expanded else 0.0, minf(1.0, delta * 10.0))
	modulate.a = hud_opacity

	hovered_tab = -1
	hovered_card = -1
	if drawer_expanded or not GameManager.desktop_companion_mode:
		for i in range(4):
			if _get_tab_button_rect(i).has_point(mpos):
				hovered_tab = i
				break
		if drawer_expanded:
			var cards := _get_current_tab_cards()
			for i in range(cards.size()):
				if _get_card_rect(i, cards.size()).has_point(mpos):
					hovered_card = i
					break

	queue_redraw()

func _get_interactive_zone() -> Rect2:
	if drawer_expanded:
		return Rect2(476.0, 124.0, 968.0, 176.0)
	if GameManager.desktop_companion_mode:
		return CAPSULE_RECT.grow(8.0)
	return FULL_BAR_RECT.grow(6.0)

func get_hud_Hit_rect() -> Rect2:
	return _get_interactive_zone()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mpos: Vector2 = event.position
		if event.pressed:
			if Input.is_key_pressed(KEY_ALT) and window_controller != null:
				window_controller.begin_window_drag()
				accept_event()
				return
			var hitting_mute := (drawer_expanded and TOP_RIGHT_MUTE_RECT.has_point(mpos)) or (not drawer_expanded and CAPSULE_MUTE_RECT.has_point(mpos))
			if hovered_tab == -1 and hovered_card == -1 and not hitting_mute and _get_interactive_zone().has_point(mpos):
				if window_controller != null:
					window_controller.begin_window_drag()
					accept_event()
					return
		else:
			if window_controller != null and window_controller.is_dragging:
				window_controller.end_window_drag()
				accept_event()
				return

			if (drawer_expanded and TOP_RIGHT_MUTE_RECT.has_point(mpos)) or (not drawer_expanded and CAPSULE_MUTE_RECT.has_point(mpos)):
				if SoundManager != null:
					SoundManager.toggle_mute()
				accept_event()
				return

			if hovered_tab >= 0:
				if hovered_tab == 3:
					_toggle_companion_mode()
				else:
					active_tab = hovered_tab
					drawer_expanded = true
					mouse_outside_timer = 0.0
				accept_event()
				return

			if drawer_expanded and hovered_card >= 0:
				_activate_card(hovered_card)
				mouse_outside_timer = 0.0
				accept_event()
				return

func _toggle_companion_mode() -> void:
	GameManager.desktop_companion_mode = not GameManager.desktop_companion_mode
	drawer_expanded = not GameManager.desktop_companion_mode
	EventBus.toggle_desktop_mode.emit(GameManager.desktop_companion_mode)
	GameManager.save_game()

func _get_tab_button_rect(idx: int) -> Rect2:
	return Rect2(1062.0 + float(idx) * 78.0, 243.0, 72.0, 44.0)

func _get_card_rect(idx: int, total: int) -> Rect2:
	var w := 196.0 if total <= 4 else 132.0
	var gap := 12.0 if total <= 4 else 8.0
	var start_x := 548.0 if total <= 4 else 538.0
	return Rect2(start_x + float(idx) * (w + gap), 164.0, w, 58.0)

func _get_current_tab_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	match active_tab:
		0: # Tab 1: 【建筑升级与25级四阶视觉蜕变】
			for b_key in ["soil_1", "mortar", "stall", "cauldron"]:
				var cfg: Dictionary = EconomyConfig.BUILDINGS[b_key]
				var lv := int(GameManager.building_levels.get(b_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				var next_ms := (int(floor(float(lv) / 25.0)) + 1) * 25
				list.append({
					"type": "building",
					"key": b_key,
					"title": String(cfg["name"]) + " Lv." + str(lv),
					"sub": "下个2x蜕变: Lv." + str(next_ms),
					"cost": "升级 " + str(cost) + "G"
				})
		1: # Tab 2: 【动物编制招募与招满转全队进修】 (PRD v2.2 Section 3)
			for a_key in ["bunny", "otter", "fox", "shiba", "penguin", "toucan"]:
				var cfg: Dictionary = EconomyConfig.ANIMALS[a_key]
				var cur_rec := GameManager.get_total_recruited(a_key)
				var max_cap := GameManager.get_total_max_cap(a_key)
				var next_isl := GameManager.find_next_recruit_island(a_key)
				var lv := maxi(1, int(GameManager.animal_levels.get(a_key, 0)))
				var cost_step := cur_rec + lv
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), cost_step)

				var title_str := String(cfg["name"]).split(" · ")[0]
				var sub_str := ""
				var act_str := ""
				if max_cap <= 0:
					sub_str = "需先解锁魔法密林/天空海岸"
					act_str = "待解锁岛屿"
				elif next_isl > 0:
					sub_str = "编制 " + str(cur_rec) + "/" + str(max_cap) + " (岛" + str(next_isl) + "可招)"
					act_str = "招募 " + str(cost) + "G"
				else:
					# Reached Recruit Cap -> Automatically switch button to 【全队进修 (Lv.+1)】!
					sub_str = "已满编 " + str(cur_rec) + "/" + str(max_cap) + " · 进修Lv." + str(lv)
					act_str = "全队进修Lv.+1 (" + str(cost) + "G)"

				list.append({
					"type": "animal",
					"key": a_key,
					"title": title_str,
					"sub": sub_str,
					"cost": act_str
				})
		2: # Tab 3: 【三岛木桥开拓与双工坊】
			var isl2_unlocked := bool(GameManager.unlocked_islands.get(2, false))
			var isl3_unlocked := bool(GameManager.unlocked_islands.get(3, false))
			list.append({
				"type": "unlock_island",
				"key": "2",
				"title": "木桥1 · 魔法密林" + (" (已通)" if isl2_unlocked else ""),
				"sub": "2x农田+12x坩埚+企鹅/巨嘴鸟",
				"cost": "已解锁" if isl2_unlocked else "180G 解锁"
			})
			list.append({
				"type": "unlock_island",
				"key": "3",
				"title": "木桥2 · 天空海岸" + (" (已通)" if isl3_unlocked else ""),
				"sub": "双工坊52x精炼+👑2x皇冠富豪",
				"cost": "已解锁" if isl3_unlocked else "480G 解锁"
			})
			for b_key in ["soil_2", "soil_3"]:
				var cfg: Dictionary = EconomyConfig.BUILDINGS[b_key]
				var lv := int(GameManager.building_levels.get(b_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				list.append({
					"type": "building",
					"key": b_key,
					"title": String(cfg["name"]) + " Lv." + str(lv),
					"sub": String(cfg["desc"]).substr(0, 14),
					"cost": "升级 " + str(cost) + "G"
				})
	return list

func _activate_card(idx: int) -> void:
	var cards := _get_current_tab_cards()
	if idx < 0 or idx >= cards.size():
		return
	var c: Dictionary = cards[idx]
	var t := String(c["type"])
	var k := String(c["key"])
	if t == "building":
		GameManager.upgrade_building(k)
	elif t == "animal":
		if GameManager.get_total_max_cap(k) > 0:
			GameManager.upgrade_animal(k)
	elif t == "unlock_island":
		GameManager.unlock_island(int(k))

func _draw() -> void:
	if offline_banner_timer > 0.0 and tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(680.0, 6.0, 560.0, 30.0), false)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(704.0, 26.0), offline_banner_text, 13, Color(1.0, 0.95, 0.55), Color(0.14, 0.06, 0.02, 0.96), true)

	var mute_lbl := "🔇静音" if (SoundManager != null and SoundManager.is_muted) else "🔊音效"

	# Collapsed Gold Capsule Floating Orb in Desktop Companion Mode
	if GameManager.desktop_companion_mode and not drawer_expanded:
		if tex_pill != null:
			draw_texture_rect(tex_pill, CAPSULE_RECT, false)
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(CAPSULE_RECT.position.x + 10.0, CAPSULE_RECT.position.y + 7.0, 28.0, 28.0), Rect2(0, 0, 48, 48))
		PixelFontRenderer.draw_pixel_string(self, Vector2(CAPSULE_RECT.position.x + 42.0, CAPSULE_RECT.position.y + 11.0), str(int(round(displayed_gold))) + "G", Color.WHITE, false, 0.64)
		PixelFontRenderer.draw_pixel_cn(
			self,
			Vector2(CAPSULE_RECT.position.x + 154.0, CAPSULE_RECT.position.y + 26.0),
			"摊位" + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()) + " · 悬停展开",
			12,
			Color(1.0, 0.95, 0.76),
			Color(0.14, 0.06, 0.02, 0.96),
			true
		)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(CAPSULE_MUTE_RECT.position.x + 4.0, CAPSULE_MUTE_RECT.position.y + 21.0), mute_lbl, 11, Color(0.85, 0.96, 1.0), Color(0.14, 0.06, 0.02, 0.96), false)
		return

	if tex_panel != null:
		draw_texture_rect(tex_panel, FULL_BAR_RECT, false)

	if tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(496.0, 247.0, 156.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(658.0, 247.0, 192.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(856.0, 247.0, 192.0, 36.0), false)

	if tex_icons != null:
		draw_texture_rect_region(tex_icons, Rect2(502.0, 250.0, 28.0, 28.0), Rect2(0, 0, 48, 48))
	PixelFontRenderer.draw_pixel_string(self, Vector2(532.0, 254.0), str(int(round(displayed_gold))) + "G", Color.WHITE, false, 0.64)

	var mode_stage := "单兔全包期" if not GameManager.is_island_otter_hired(1) else "专职流水线"
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(672.0, 269.0),
		mode_stage + " · 缓存" + str(GameManager.get_island_basket_total(1)) + "/" + str(GameManager.get_raw_basket_max_cap(1)),
		12,
		Color(0.84, 0.96, 1.0),
		Color(0.14, 0.06, 0.02, 0.96),
		true
	)

	var shiba_txt := ("柴犬+" + str(int(GameManager.animal_levels.get("shiba", 0)) * 10) + "%") if GameManager.is_animal_hired("shiba") else "自助结账1x"
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(868.0, 269.0),
		"摊位" + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()) + " · " + shiba_txt,
		12,
		Color(1.0, 0.94, 0.72),
		Color(0.14, 0.06, 0.02, 0.96),
		true
	)

	var tab_labels := ["建筑升级", "动物编制", "木桥开拓", ("★摸鱼置顶" if GameManager.desktop_companion_mode else "★常规窗口")]
	var icon_indices := [6, 3, 4, 7]
	for i in range(4):
		var bx := 1062.0 + float(i) * 78.0
		var lift := -2.0 if (hovered_tab == i or active_tab == i) else 0.0
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(bx + 14.0, 239.0 + lift, 40.0, 40.0), Rect2(float(icon_indices[i] * 48), 0.0, 48.0, 48.0))
		var lbl_col := Color(1.0, 0.98, 0.72) if (hovered_tab == i or active_tab == i) else Color(1.0, 0.94, 0.82)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(bx + 8.0, 287.0), tab_labels[i], 12, lbl_col, Color(0.16, 0.06, 0.02, 0.98), true)

	if drawer_expanded and tex_drawer != null:
		var slide_y := lerpf(40.0, 0.0, drawer_anim_t)
		var d_rect := Rect2(DRAWER_RECT.position.x, DRAWER_RECT.position.y + slide_y, DRAWER_RECT.size.x, DRAWER_RECT.size.y)
		draw_texture_rect(tex_drawer, d_rect, false)
		var titles := [
			"【建筑升级】每25级作物/美食自动换代 + 建筑四阶外观蜕变(稻草人/蒸汽/银星/金辉)!",
			"【动物编制与招满转进修】未满编时招募新伙伴 · 招满上限后一键全队进修(Lv.+1)!",
			"【三岛固定槽位与木桥开拓】魔法密林(12x坩埚) · 天空海岸(52x双工坊+👑2x富豪顾客)"
		]
		PixelFontRenderer.draw_pixel_cn(self, Vector2(548.0, 152.0 + slide_y), titles[clampi(active_tab, 0, 2)], 13, Color(1.0, 0.95, 0.72), Color(0.16, 0.06, 0.02, 0.98), true)

		# Top-Right One-Click Mute Button (🔊/🔇)
		var m_rect := Rect2(TOP_RIGHT_MUTE_RECT.position.x, TOP_RIGHT_MUTE_RECT.position.y + slide_y, TOP_RIGHT_MUTE_RECT.size.x, TOP_RIGHT_MUTE_RECT.size.y)
		if tex_pill != null:
			draw_texture_rect(tex_pill, m_rect, false)
		PixelFontRenderer.draw_pixel_cn(self, m_rect.position + Vector2(6.0, 17.0), mute_lbl, 12, Color(0.86, 0.98, 1.0), Color(0.14, 0.06, 0.02, 0.96), false)

		var cards := _get_current_tab_cards()
		for i in range(cards.size()):
			var crect := _get_card_rect(i, cards.size())
			crect.position.y += slide_y
			var ctex := tex_card_hover if hovered_card == i else tex_card
			if ctex != null:
				draw_texture_rect(ctex, crect, false)
			var cdata: Dictionary = cards[i]
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 20.0), String(cdata["title"]), 12, Color(1.0, 0.96, 0.82), Color(0.16, 0.06, 0.02, 0.96), true)
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 36.0), String(cdata["sub"]), 11, Color(0.84, 0.98, 0.80), Color(0.14, 0.06, 0.02, 0.96), false)
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 51.0), String(cdata["cost"]), 11, Color(1.0, 0.88, 0.34), Color(0.16, 0.06, 0.02, 0.96), false)
