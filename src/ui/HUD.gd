extends Control
class_name HUD
## Native Label Retro Maple-Style HUD, 3s Auto-Collapse Capsule & Recruit-to-Promote Drawer (`src/ui/HUD.gd`)
## Strictly enforces PRD v2.2 & GEMINI.md Law 5:
## - 100% Native Godot `Label` nodes via `EconomyConfig.create_pixel_label` (`make_pixel_label_settings`).
## - Zero legacy bitmap font atlas usage anywhere.
## - Implements Desktop Companion Mode `ui_resource_pill.png` Gold Capsule:
##   * Hovering expands the bottom HUD bar / drawer (`hud_opacity = 1.0`);
##   * Moving mouse outside for `>= 3.0s` auto-collapses into the compact Gold Capsule at `40%` opacity (`hud_opacity = 0.40`).
## - Provides deterministic `open_drawer(tab_idx)` and `close_drawer()` API for both user interaction and `SelfTestRunner.gd`.

var tex_panel: Texture2D
var tex_drawer: Texture2D
var tex_card: Texture2D
var tex_card_hover: Texture2D
var tex_pill: Texture2D
var tex_icons: Texture2D
var tex_delicacies: Texture2D
var tex_btn_normal: Texture2D
var tex_btn_hover: Texture2D
var tex_btn_pressed: Texture2D

var active_tab: int = 0
var hovered_tab: int = -1
var hovered_card: int = -1
var prev_hovered_tab: int = -1
var prev_hovered_card: int = -1
var is_pressing_btn: bool = false
var displayed_gold: float = 120.0

var is_mouse_over_hud: bool = false
var is_collapsed_capsule: bool = false
var drawer_expanded: bool = false
var drawer_anim_t: float = 0.0
var mouse_outside_timer: float = 0.0
var hud_opacity: float = 1.0
var force_pin_open: bool = false

var offline_banner_timer: float = 0.0
var offline_banner_text: String = ""

var lbl_offline: Label
var lbl_capsule_gold: Label
var lbl_capsule_info: Label
var lbl_capsule_mute: Label

var lbl_bar_gold: Label
var lbl_bar_pipeline: Label
var lbl_bar_stall: Label
var lbl_tabs: Array[Label] = []

var lbl_drawer_title: Label
var lbl_drawer_mute: Label
var lbl_card_titles: Array[Label] = []
var lbl_card_subs: Array[Label] = []
var lbl_card_costs: Array[Label] = []

const CAPSULE_RECT := Rect2(770.0, 232.0, 380.0, 40.0)
const CAPSULE_MUTE_RECT := Rect2(1088.0, 236.0, 54.0, 32.0)
const FULL_BAR_RECT := Rect2(480.0, 230.0, 960.0, 58.0)
const DRAWER_RECT := Rect2(520.0, 122.0, 880.0, 106.0)
const TOP_RIGHT_MUTE_RECT := Rect2(1332.0, 130.0, 58.0, 24.0)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	tex_panel = load("res://assets/pixel_art/ui/panel_wood_9patch.png")
	tex_drawer = load("res://assets/pixel_art/ui/panel_drawer_parchment.png")
	tex_card = load("res://assets/pixel_art/ui/ui_drawer_card.png")
	tex_card_hover = load("res://assets/pixel_art/ui/ui_drawer_card_hover.png")
	tex_pill = load("res://assets/pixel_art/ui/ui_resource_pill.png")
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_btn_normal = load("res://assets/pixel_art/ui/btn_normal.png")
	tex_btn_hover = load("res://assets/pixel_art/ui/btn_hover.png")
	tex_btn_pressed = load("res://assets/pixel_art/ui/btn_pressed.png")

	displayed_gold = float(GameManager.gold)
	if GameManager.pending_offline_gold > 0:
		offline_banner_timer = 7.5
		offline_banner_text = "★离线挂机 " + str(GameManager.pending_offline_seconds) + "秒 · 自动结账 +" + str(GameManager.pending_offline_gold) + "G!"

	_build_native_labels()

func open_drawer(tab_idx: int = 0) -> void:
	active_tab = clampi(tab_idx, 0, 2)
	force_pin_open = true
	mouse_outside_timer = 0.0
	is_collapsed_capsule = false
	drawer_expanded = true
	drawer_anim_t = 1.0
	hud_opacity = 1.0
	modulate.a = 1.0
	_sync_label_nodes()
	queue_redraw()

func close_drawer(collapse_to_capsule: bool = false) -> void:
	force_pin_open = false
	drawer_expanded = false
	drawer_anim_t = 0.0
	is_collapsed_capsule = collapse_to_capsule
	hud_opacity = 0.40 if collapse_to_capsule else 1.0
	modulate.a = hud_opacity
	mouse_outside_timer = 3.5 if collapse_to_capsule else 0.0
	_sync_label_nodes()
	queue_redraw()

func _build_native_labels() -> void:
	lbl_offline = EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), true)
	lbl_offline.position = Vector2(680.0, 8.0)
	lbl_offline.custom_minimum_size = Vector2(560.0, 26.0)
	add_child(lbl_offline)

	lbl_capsule_gold = EconomyConfig.create_pixel_label("120G", 14, Color("#FFE066"), false)
	lbl_capsule_gold.position = Vector2(CAPSULE_RECT.position.x + 42.0, CAPSULE_RECT.position.y + 10.0)
	add_child(lbl_capsule_gold)

	lbl_capsule_info = EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), false)
	lbl_capsule_info.position = Vector2(CAPSULE_RECT.position.x + 114.0, CAPSULE_RECT.position.y + 10.0)
	add_child(lbl_capsule_info)

	lbl_capsule_mute = EconomyConfig.create_pixel_label("🔇静音", 14, Color("#FFE066"), false)
	lbl_capsule_mute.position = Vector2(CAPSULE_MUTE_RECT.position.x + 2.0, CAPSULE_MUTE_RECT.position.y + 6.0)
	add_child(lbl_capsule_mute)

	lbl_bar_gold = EconomyConfig.create_pixel_label("120G", 14, Color("#FFE066"), false)
	lbl_bar_gold.position = Vector2(534.0, 247.0)
	add_child(lbl_bar_gold)

	lbl_bar_pipeline = EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), true)
	lbl_bar_pipeline.position = Vector2(658.0, 247.0)
	lbl_bar_pipeline.custom_minimum_size = Vector2(192.0, 24.0)
	add_child(lbl_bar_pipeline)

	lbl_bar_stall = EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), true)
	lbl_bar_stall.position = Vector2(856.0, 247.0)
	lbl_bar_stall.custom_minimum_size = Vector2(192.0, 24.0)
	add_child(lbl_bar_stall)

	for i in range(4):
		var tl := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), true)
		tl.position = Vector2(1056.0 + float(i) * 78.0, 264.0)
		tl.custom_minimum_size = Vector2(84.0, 22.0)
		add_child(tl)
		lbl_tabs.append(tl)

	lbl_drawer_title = EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
	lbl_drawer_title.position = Vector2(544.0, 128.0)
	add_child(lbl_drawer_title)

	lbl_drawer_mute = EconomyConfig.create_pixel_label("🔇静音", 14, Color("#FFF4D6"), false)
	lbl_drawer_mute.position = Vector2(TOP_RIGHT_MUTE_RECT.position.x + 4.0, TOP_RIGHT_MUTE_RECT.position.y + 2.0)
	add_child(lbl_drawer_mute)

	for i in range(6):
		var ct := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
		var cs := EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), false)
		var cc := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
		cs.scale = Vector2(0.85, 0.85)
		cc.scale = Vector2(0.90, 0.90)
		add_child(ct)
		add_child(cs)
		add_child(cc)
		lbl_card_titles.append(ct)
		lbl_card_subs.append(cs)
		lbl_card_costs.append(cc)

func _process(delta: float) -> void:
	displayed_gold = lerpf(displayed_gold, float(GameManager.gold), minf(1.0, delta * 9.0))
	if absf(displayed_gold - float(GameManager.gold)) < 0.6:
		displayed_gold = float(GameManager.gold)

	if offline_banner_timer > 0.0:
		offline_banner_timer = maxf(0.0, offline_banner_timer - delta)

	var mpos := get_local_mouse_position()
	var hover_zone := _get_interactive_zone()
	is_mouse_over_hud = hover_zone.has_point(mpos)

	if force_pin_open:
		is_collapsed_capsule = false
		drawer_expanded = true
		drawer_anim_t = 1.0
		hud_opacity = 1.0
	elif GameManager.desktop_companion_mode:
		if is_mouse_over_hud:
			mouse_outside_timer = 0.0
			is_collapsed_capsule = false
			hud_opacity = lerpf(hud_opacity, 1.0, minf(1.0, delta * 10.0))
		else:
			mouse_outside_timer += delta
			if mouse_outside_timer >= 3.0:
				drawer_expanded = false
				is_collapsed_capsule = true
				hud_opacity = lerpf(hud_opacity, 0.40, minf(1.0, delta * 5.0))
	else:
		is_collapsed_capsule = false
		hud_opacity = 1.0

	if not force_pin_open:
		drawer_anim_t = lerpf(drawer_anim_t, 1.0 if drawer_expanded else 0.0, minf(1.0, delta * 10.0))
	modulate.a = hud_opacity

	hovered_tab = -1
	hovered_card = -1
	if not is_collapsed_capsule:
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

	if (hovered_tab != -1 and hovered_tab != prev_hovered_tab) or (hovered_card != -1 and hovered_card != prev_hovered_card):
		if SoundManager != null:
			SoundManager.play_hover_sfx()
	prev_hovered_tab = hovered_tab
	prev_hovered_card = hovered_card

	_sync_label_nodes()
	queue_redraw()

func _sync_label_nodes() -> void:
	var gold_str := str(int(round(displayed_gold))) + "G"
	var mute_lbl := "🔇静音" if (SoundManager != null and SoundManager.is_muted) else "🔊音效"

	lbl_offline.visible = (offline_banner_timer > 0.0)
	lbl_offline.text = offline_banner_text

	lbl_capsule_gold.visible = is_collapsed_capsule
	lbl_capsule_info.visible = is_collapsed_capsule
	lbl_capsule_mute.visible = is_collapsed_capsule
	if is_collapsed_capsule:
		lbl_capsule_gold.text = gold_str
		lbl_capsule_info.text = "摊位" + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()) + " · 悬停展开"
		lbl_capsule_mute.text = mute_lbl

	var show_bar := not is_collapsed_capsule
	lbl_bar_gold.visible = show_bar
	lbl_bar_pipeline.visible = show_bar
	lbl_bar_stall.visible = show_bar
	if show_bar:
		lbl_bar_gold.text = gold_str
		var mode_stage := "单兔全包" if not GameManager.is_island_otter_hired(1) else "专职产线"
		lbl_bar_pipeline.text = mode_stage + " · 缓存" + str(GameManager.get_island_basket_total(1)) + "/" + str(GameManager.get_raw_basket_max_cap(1))
		var shiba_txt := ("柴犬+" + str(int(GameManager.animal_levels.get("shiba", 0)) * 10) + "%") if GameManager.is_animal_hired("shiba") else "自助1x"
		lbl_bar_stall.text = "摊位" + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()) + " · " + shiba_txt

	var tab_names := ["建筑升级", "动物编制", "木桥开拓", ("★摸鱼置顶" if GameManager.desktop_companion_mode else "★常规窗口")]
	for i in range(4):
		lbl_tabs[i].visible = show_bar
		lbl_tabs[i].text = tab_names[i]

	var show_drawer := show_bar and drawer_expanded
	var slide_y := lerpf(40.0, 0.0, drawer_anim_t)
	lbl_drawer_title.visible = show_drawer
	lbl_drawer_mute.visible = show_drawer
	if show_drawer:
		var titles := [
			"【建筑升级】每25级作物/美食自动换代 + 建筑四阶外观蜕变!",
			"【动物编制与招满转进修】未满编时招募伙伴 · 招满后一键全队进修(Lv.+1)!",
			"【三岛固定槽位与木桥开拓】魔法密林(12x坩埚) · 天空海岸(52x双工坊+👑2x富豪)"
		]
		lbl_drawer_title.text = titles[clampi(active_tab, 0, 2)]
		lbl_drawer_title.position = Vector2(544.0, 128.0 + slide_y)
		lbl_drawer_mute.text = mute_lbl
		lbl_drawer_mute.position = Vector2(TOP_RIGHT_MUTE_RECT.position.x + 4.0, TOP_RIGHT_MUTE_RECT.position.y + 2.0 + slide_y)

	var cards: Array[Dictionary] = []
	if show_drawer:
		cards = _get_current_tab_cards()
	for i in range(6):
		var vis := show_drawer and (i < cards.size())
		lbl_card_titles[i].visible = vis
		lbl_card_subs[i].visible = vis
		lbl_card_costs[i].visible = vis
		if vis:
			var crect := _get_card_rect(i, cards.size())
			crect.position.y += slide_y
			var cdata: Dictionary = cards[i]
			lbl_card_titles[i].text = String(cdata["title"])
			lbl_card_titles[i].position = crect.position + Vector2(8.0, 3.0)
			lbl_card_subs[i].text = String(cdata["sub"])
			lbl_card_subs[i].position = crect.position + Vector2(8.0, 22.0)
			lbl_card_costs[i].text = String(cdata["cost"])
			lbl_card_costs[i].position = crect.position + Vector2(8.0, 38.0)

func _get_interactive_zone() -> Rect2:
	if drawer_expanded:
		return Rect2(476.0, 118.0, 968.0, 174.0)
	if is_collapsed_capsule:
		return CAPSULE_RECT.grow(8.0)
	return FULL_BAR_RECT.grow(6.0)

func get_hud_Hit_rect() -> Rect2:
	return _get_interactive_zone()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mpos: Vector2 = event.position
		if event.pressed:
			is_pressing_btn = true
			if Input.is_key_pressed(KEY_ALT) and WindowController != null:
				WindowController.begin_window_drag()
				accept_event()
				return
			var hitting_mute := (drawer_expanded and TOP_RIGHT_MUTE_RECT.has_point(mpos)) or (is_collapsed_capsule and CAPSULE_MUTE_RECT.has_point(mpos))
			if hovered_tab == -1 and hovered_card == -1 and not hitting_mute and _get_interactive_zone().has_point(mpos):
				if WindowController != null:
					WindowController.begin_window_drag()
					accept_event()
					return
		else:
			is_pressing_btn = false
			if WindowController != null and WindowController.is_dragging:
				WindowController.end_window_drag()
				accept_event()
				return

			if (drawer_expanded and TOP_RIGHT_MUTE_RECT.has_point(mpos)) or (is_collapsed_capsule and CAPSULE_MUTE_RECT.has_point(mpos)):
				if SoundManager != null:
					SoundManager.toggle_mute()
				accept_event()
				return

			if hovered_tab >= 0:
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if hovered_tab == 3:
					_toggle_companion_mode()
				else:
					force_pin_open = false
					active_tab = hovered_tab
					drawer_expanded = true
					mouse_outside_timer = 0.0
				accept_event()
				return

			if drawer_expanded and hovered_card >= 0:
				if SoundManager != null:
					SoundManager.play_click_sfx()
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
	return Rect2(1062.0 + float(idx) * 78.0, 235.0, 72.0, 44.0)

func _get_card_rect(idx: int, total: int) -> Rect2:
	var w := 196.0 if total <= 4 else 132.0
	var gap := 12.0 if total <= 4 else 8.0
	var start_x := 548.0 if total <= 4 else 538.0
	return Rect2(start_x + float(idx) * (w + gap), 156.0, w, 58.0)

func _get_current_tab_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	match active_tab:
		0:
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
		1:
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
					sub_str = "需先解锁新岛屿"
					act_str = "待解锁岛屿"
				elif next_isl > 0:
					sub_str = "编制 " + str(cur_rec) + "/" + str(max_cap) + " (岛" + str(next_isl) + ")"
					act_str = "招募 " + str(cost) + "G"
				else:
					sub_str = "满编 " + str(cur_rec) + "/" + str(max_cap) + " · Lv." + str(lv)
					act_str = "全队进修 Lv.+1 (" + str(cost) + "G)"

				list.append({
					"type": "animal",
					"key": a_key,
					"title": title_str,
					"sub": sub_str,
					"cost": act_str
				})
		2:
			var isl2_unlocked := bool(GameManager.unlocked_islands.get(2, false))
			var isl3_unlocked := bool(GameManager.unlocked_islands.get(3, false))
			list.append({
				"type": "unlock_island",
				"key": "2",
				"title": "木桥1 · 魔法密林" + (" (已通)" if isl2_unlocked else ""),
				"sub": "2x农田+12x坩埚+企鹅",
				"cost": "已解锁" if isl2_unlocked else "180G 解锁"
			})
			list.append({
				"type": "unlock_island",
				"key": "3",
				"title": "木桥2 · 天空海岸" + (" (已通)" if isl3_unlocked else ""),
				"sub": "双工坊52x+👑2x富豪",
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
					"sub": String(cfg["desc"]).substr(0, 12),
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

	if is_collapsed_capsule:
		if tex_pill != null:
			draw_texture_rect(tex_pill, CAPSULE_RECT, false)
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(CAPSULE_RECT.position.x + 10.0, CAPSULE_RECT.position.y + 6.0, 28.0, 28.0), Rect2(0, 0, 48, 48))
		return

	if tex_panel != null:
		draw_texture_rect(tex_panel, FULL_BAR_RECT, false)

	if tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(496.0, 239.0, 156.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(658.0, 239.0, 192.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(856.0, 239.0, 192.0, 36.0), false)

	if tex_icons != null:
		draw_texture_rect_region(tex_icons, Rect2(502.0, 242.0, 28.0, 28.0), Rect2(0, 0, 48, 48))

	var icon_indices := [6, 3, 4, 7]
	for i in range(4):
		var bx := 1062.0 + float(i) * 78.0
		var is_active_or_hov := (hovered_tab == i or (drawer_expanded and active_tab == i))
		var lift := -2.0 if is_active_or_hov else 0.0
		var btex := tex_btn_normal
		if hovered_tab == i and is_pressing_btn and tex_btn_pressed != null:
			btex = tex_btn_pressed
		elif is_active_or_hov and tex_btn_hover != null:
			btex = tex_btn_hover
		if btex != null:
			draw_texture_rect(btex, Rect2(bx + 12.0, 226.0 + lift, 42.0, 42.0), false)
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(bx + 15.0, 229.0 + lift, 36.0, 36.0), Rect2(float(icon_indices[i] * 48), 0.0, 48.0, 48.0))

	if drawer_expanded and tex_drawer != null:
		var slide_y := lerpf(40.0, 0.0, drawer_anim_t)
		var d_rect := Rect2(DRAWER_RECT.position.x, DRAWER_RECT.position.y + slide_y, DRAWER_RECT.size.x, DRAWER_RECT.size.y)
		draw_texture_rect(tex_drawer, d_rect, false)

		var m_rect := Rect2(TOP_RIGHT_MUTE_RECT.position.x, TOP_RIGHT_MUTE_RECT.position.y + slide_y, TOP_RIGHT_MUTE_RECT.size.x, TOP_RIGHT_MUTE_RECT.size.y)
		if tex_pill != null:
			draw_texture_rect(tex_pill, m_rect, false)

		var cards := _get_current_tab_cards()
		for i in range(cards.size()):
			var crect := _get_card_rect(i, cards.size())
			crect.position.y += slide_y
			var ctex := tex_card_hover if hovered_card == i else tex_card
			if ctex != null:
				draw_texture_rect(ctex, crect, false)
