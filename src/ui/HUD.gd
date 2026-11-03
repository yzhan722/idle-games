extends Control
class_name HUD
## Retro Maple-Style Artisan HUD & 3-Tab Upgrade Drawer (`src/ui/HUD.gd`) — PRD v2.0 Phase 4
## - Flush-bottom Carved Walnut & Brass Dock Bar (`960x58` at `x=480, y=238`)
## - One-click toggle for 【摸鱼透明置顶模式 (Desktop Companion Mode)】 vs 【常规全景模式】
## - 3-Tab Bottom Drawer Menu:
##   1. 【建筑升级】 (Buildings: Soil 1/2/3, Mortar, Cauldron, Market Stall)
##   2. 【动物升职】 (6 Specialized Pipeline Animals: Bunny, Otter, Toucan, Fox, Penguin, Shiba)
##   3. 【岛屿开拓】 (Islands & Bridges + Offline Earnings & Save)

var tex_panel: Texture2D
var tex_drawer: Texture2D
var tex_card: Texture2D
var tex_card_hover: Texture2D
var tex_pill: Texture2D
var tex_icons: Texture2D
var tex_delicacies: Texture2D

var active_tab: int = -1 # -1 = closed, 0 = 建筑升级, 1 = 动物升职, 2 = 岛屿开拓, 3 = 摸鱼切换, 4 = 产线总览, 5 = 存档设置
var hovered_tab: int = -1
var hovered_card: int = -1
var displayed_gold: float = 360.0
var offline_banner_timer: float = 0.0
var offline_banner_text: String = ""

var window_controller: WindowController

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
		offline_banner_text = "★离线挂机 " + str(GameManager.pending_offline_seconds) + "秒 · 柴犬店长自动结账 +" + str(GameManager.pending_offline_gold) + "G!"

func _process(delta: float) -> void:
	displayed_gold = lerpf(displayed_gold, float(GameManager.gold), minf(1.0, delta * 9.0))
	if absf(displayed_gold - float(GameManager.gold)) < 0.6:
		displayed_gold = float(GameManager.gold)

	if offline_banner_timer > 0.0:
		offline_banner_timer = maxf(0.0, offline_banner_timer - delta)

	var mpos := get_local_mouse_position()
	hovered_tab = -1
	for i in range(6):
		if _get_tab_button_rect(i).has_point(mpos):
			hovered_tab = i
			break

	hovered_card = -1
	if active_tab >= 0:
		var cards := _get_current_tab_cards()
		for i in range(cards.size()):
			if _get_card_rect(i, cards.size()).has_point(mpos):
				hovered_card = i
				break

	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mpos: Vector2 = event.position
		if event.pressed:
			# Allow smooth dragging anywhere on the HUD bar outside interactive buttons
			if hovered_tab == -1 and hovered_card == -1 and not _get_close_rect().has_point(mpos) and not _get_mode_pill_rect().has_point(mpos):
				if get_hud_Hit_rect().has_point(mpos) and window_controller != null:
					window_controller.begin_window_drag()
					accept_event()
					return
		else:
			if window_controller != null and window_controller.is_dragging:
				window_controller.end_window_drag()
				accept_event()
				return

			if _get_mode_pill_rect().has_point(mpos):
				_toggle_companion_mode()
				accept_event()
				return

			if active_tab >= 0 and _get_close_rect().has_point(mpos):
				active_tab = -1
				accept_event()
				return

			if hovered_tab >= 0:
				if hovered_tab == 3:
					_toggle_companion_mode()
				else:
					active_tab = -1 if active_tab == hovered_tab else hovered_tab
				accept_event()
				return

			if active_tab >= 0 and hovered_card >= 0:
				_activate_card(hovered_card)
				accept_event()
				return

func _toggle_companion_mode() -> void:
	GameManager.desktop_companion_mode = not GameManager.desktop_companion_mode
	EventBus.toggle_desktop_mode.emit(GameManager.desktop_companion_mode)
	GameManager.save_game()

func get_hud_Hit_rect() -> Rect2:
	if active_tab >= 0:
		return Rect2(476.0, 126.0, 968.0, 174.0)
	return Rect2(476.0, 234.0, 968.0, 66.0)

func _get_mode_pill_rect() -> Rect2:
	return Rect2(922.0, 247.0, 114.0, 36.0)

func _get_tab_button_rect(idx: int) -> Rect2:
	return Rect2(1048.0 + float(idx) * 61.0, 243.0, 56.0, 44.0)

func _get_close_rect() -> Rect2:
	return Rect2(1318.0, 142.0, 56.0, 22.0)

func _get_card_rect(idx: int, total: int) -> Rect2:
	var w := 196.0 if total <= 4 else 132.0
	var gap := 12.0 if total <= 4 else 8.0
	var start_x := 548.0 if total <= 4 else 538.0
	return Rect2(start_x + float(idx) * (w + gap), 166.0, w, 58.0)

func _get_current_tab_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	match active_tab:
		0: # Tab 1: 【建筑升级】 (Buildings)
			for b_key in ["soil_1", "mortar", "stall", "cauldron"]:
				var cfg: Dictionary = EconomyConfig.BUILDINGS[b_key]
				var lv := int(GameManager.building_levels.get(b_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				var val := int(round(EconomyConfig.calc_milestone_value(float(cfg["base_value"]), lv)))
				list.append({
					"type": "building",
					"key": b_key,
					"title": String(cfg["name"]) + " Lv." + str(lv),
					"sub": String(cfg["desc"]) + " (产出:" + str(val) + ")",
					"cost": str(cost) + "G"
				})
		1: # Tab 2: 【动物招募与升职】 (6 Specialized Animals)
			for a_key in ["bunny", "otter", "toucan", "fox", "penguin", "shiba"]:
				var cfg: Dictionary = EconomyConfig.ANIMALS[a_key]
				var lv := int(GameManager.animal_levels.get(a_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				list.append({
					"type": "animal",
					"key": a_key,
					"title": String(cfg["name"]).split(" · ")[0] + " Lv." + str(lv),
					"sub": String(cfg["role_tag"]).substr(0, 11),
					"cost": str(cost) + "G"
				})
		2: # Tab 3: 【岛屿与木桥开拓】 (Islands & High-Tier Farms)
			for b_key in ["soil_2", "soil_3"]:
				var cfg: Dictionary = EconomyConfig.BUILDINGS[b_key]
				var lv := int(GameManager.building_levels.get(b_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				list.append({
					"type": "building",
					"key": b_key,
					"title": String(cfg["name"]) + " Lv." + str(lv),
					"sub": String(cfg["desc"]),
					"cost": str(cost) + "G"
				})
			list.append({
				"type": "mode",
				"key": "toggle_mode",
				"title": "切换: " + ("透明置顶摸鱼" if GameManager.desktop_companion_mode else "常规蓝天窗口"),
				"sub": "支持天空鼠标点击穿透与60FPS拖拽",
				"cost": "点击切换"
			})
			list.append({
				"type": "save",
				"key": "save_now",
				"title": "立即保存云岛进度",
				"sub": "JSON存档 + 离线收益自动结算",
				"cost": "已开启"
			})
		4: # Tab 5: 【产线与食谱增值总览】
			var rules := [
				["桂花糯米糕 (3.5x)", "兔子种草莓→水獭运研钵→狐狸研磨", "delicacy_0"],
				["焦糖苹果派 (3.5x)", "兔子采甜果→水獭运研钵→狐狸研磨", "delicacy_1"],
				["星露甘露饮 (12x)", "密林荧光菇→巨嘴鸟跨桥→企鹅炼制", "delicacy_2"],
				["凤梨椰奶冻 (12x)", "海岸黄金凤梨→巨嘴鸟运回主集市", "delicacy_3"]
			]
			for r in rules:
				list.append({
					"type": "info",
					"key": r[2],
					"title": r[0],
					"sub": r[1],
					"cost": "在售x" + str(int(GameManager.stall_inventory.get(r[2], 0)))
				})
		5: # Tab 6: 【系统设置】
			list.append({
				"type": "mode",
				"key": "toggle_mode",
				"title": "桌面透明置顶摸鱼模式",
				"sub": "当前: " + ("开启 (透明置顶+穿透)" if GameManager.desktop_companion_mode else "关闭 (蓝天背景)"),
				"cost": "切换"
			})
			list.append({
				"type": "save",
				"key": "save_now",
				"title": "手动保存至 savegame.json",
				"sub": "繁荣度评分: " + str(GameManager.get_prosperity_score()),
				"cost": "立即存档"
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
		GameManager.upgrade_animal(k)
	elif t == "mode":
		_toggle_companion_mode()
	elif t == "save":
		GameManager.save_game()
		offline_banner_timer = 3.5
		offline_banner_text = "★存档已写入 user://savegame.json!"

func _draw() -> void:
	# 1. Offline Earnings / System Toast Banner at Top Center
	if offline_banner_timer > 0.0 and tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(680.0, 6.0, 560.0, 30.0), false)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(704.0, 26.0), offline_banner_text, 13, Color(1.0, 0.95, 0.55), Color(0.14, 0.06, 0.02, 0.96), true)

	# 2. Flush-Bottom Carved Walnut & Brass HUD Dock Bar (x=480, y=238, w=960, h=58)
	if tex_panel != null:
		draw_texture_rect(tex_panel, Rect2(480.0, 238.0, 960.0, 58.0), false)

	if tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(496.0, 247.0, 144.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(644.0, 247.0, 134.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(782.0, 247.0, 136.0, 36.0), false)
		draw_texture_rect(tex_pill, _get_mode_pill_rect(), false)

	# Pill 1: Gold Coin Counter
	if tex_icons != null:
		draw_texture_rect_region(tex_icons, Rect2(502.0, 250.0, 28.0, 28.0), Rect2(0, 0, 48, 48))
	PixelFontRenderer.draw_pixel_string(self, Vector2(532.0, 254.0), str(int(round(displayed_gold))) + "G", Color.WHITE, false, 0.64)

	# Pill 2: Pipeline Basket & Prosperity
	if tex_icons != null:
		draw_texture_rect_region(tex_icons, Rect2(649.0, 251.0, 26.0, 26.0), Rect2(48, 0, 48, 48))
	var basket_sum := GameManager.get_island_basket_total(1) + GameManager.get_island_basket_total(2) + GameManager.get_island_basket_total(3)
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(677.0, 269.0),
		"繁" + str(GameManager.get_prosperity_score()) + " 篮" + str(basket_sum),
		13,
		Color(0.84, 0.96, 1.0),
		Color(0.14, 0.06, 0.02, 0.96),
		true
	)

	# Pill 3: Market Stall Shelf Stock
	if tex_delicacies != null:
		draw_texture_rect_region(tex_delicacies, Rect2(787.0, 251.0, 26.0, 26.0), Rect2(0, 0, 36, 36))
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(817.0, 269.0),
		"货架 " + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()),
		13,
		Color(1.0, 0.94, 0.72),
		Color(0.14, 0.06, 0.02, 0.96),
		true
	)

	# Pill 4: Desktop Companion Mode One-Click Toggle
	var mode_txt := "★摸鱼置顶" if GameManager.desktop_companion_mode else "★常规窗口"
	PixelFontRenderer.draw_pixel_cn(self, Vector2(936.0, 269.0), mode_txt, 13, Color(1.0, 0.96, 0.78), Color(0.14, 0.06, 0.02, 0.96), true)

	# 6 Action Tab Buttons on Right Half of HUD Bar
	var tab_labels := ["建筑", "动物", "开拓", "摸鱼", "产线", "设置"]
	var icon_indices := [6, 3, 4, 2, 5, 7]
	for i in range(6):
		var bx := 1048.0 + float(i) * 61.0
		var lift := -2.0 if (hovered_tab == i or active_tab == i) else 0.0
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(bx + 2.0, 240.0 + lift, 42.0, 42.0), Rect2(float(icon_indices[i] * 48), 0.0, 48.0, 48.0))
		var lbl_col := Color(1.0, 0.98, 0.72) if (hovered_tab == i or active_tab == i) else Color(1.0, 0.94, 0.82)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(bx + 10.0, 287.0), tab_labels[i], 13, lbl_col, Color(0.16, 0.06, 0.02, 0.98), true)

	# 3. Open 3-Tab Upgrade Drawer Panel (x=520, y=132, w=880, h=104)
	if active_tab >= 0 and tex_drawer != null:
		draw_texture_rect(tex_drawer, Rect2(520.0, 132.0, 880.0, 104.0), false)
		var titles := [
			"【建筑升级】Cost(L)=Base*1.15^(L-1) · 每25级产能翻倍突破!",
			"【六大专职动物升职】农夫→物流→跨桥贸易→研钵3.5x→坩埚12x→柴犬店长",
			"【岛屿与木桥开拓】魔法密林菌圃 · 天空海岸黄金凤梨 · 桌面置顶切换",
			"【桌面摸鱼模式】",
			"【专职流水线与深加工增值总览】原料1x → 研钵3.5x → 炼金坩埚12.0x",
			"【系统设置与JSON自动存档】user://savegame.json"
		]
		PixelFontRenderer.draw_pixel_cn(self, Vector2(548.0, 154.0), titles[active_tab], 13, Color(1.0, 0.95, 0.72), Color(0.16, 0.06, 0.02, 0.98), true)

		if tex_pill != null:
			draw_texture_rect(tex_pill, _get_close_rect(), false)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(1328.0, 157.0), "×收起", 12, Color(1.0, 0.88, 0.78), Color(0.16, 0.06, 0.02, 0.98), true)

		var cards := _get_current_tab_cards()
		for i in range(cards.size()):
			var crect := _get_card_rect(i, cards.size())
			var ctex := tex_card_hover if hovered_card == i else tex_card
			if ctex != null:
				draw_texture_rect(ctex, crect, false)
			var cdata: Dictionary = cards[i]
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 20.0), String(cdata["title"]), 12, Color(1.0, 0.96, 0.82), Color(0.16, 0.06, 0.02, 0.96), true)
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 36.0), String(cdata["sub"]), 11, Color(0.84, 0.98, 0.80), Color(0.14, 0.06, 0.02, 0.96), false)
			PixelFontRenderer.draw_pixel_cn(self, crect.position + Vector2(10.0, 51.0), String(cdata["cost"]), 11, Color(1.0, 0.88, 0.34), Color(0.16, 0.06, 0.02, 0.96), false)
