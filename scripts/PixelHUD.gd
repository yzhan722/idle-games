extends Control
class_name PixelHUD
## Phase 4 Masterpiece Artisan Pixel HUD Bar (y=238..296, flush bottom of 1920x300 viewport) +
## Collapsible Ornate Parchment Drawer Sub-Panel (y=132..236) +
## Effortless 60FPS Window Dragging (hold & drag anywhere on HUD or floating islands!).

signal drawer_toggled

var game_manager: LegacyGameManager
var island_world: IslandWorld
var window_controller: WindowController
var sound_manager: LegacySoundManager

var tex_panel: Texture2D
var tex_drawer: Texture2D
var tex_parchment: Texture2D
var tex_pill: Texture2D
var tex_card: Texture2D
var tex_card_hover: Texture2D
var tex_btn_normal: Texture2D
var tex_btn_hover: Texture2D
var tex_btn_pressed: Texture2D
var tex_icons: Texture2D
var tex_delicacies: Texture2D
var tex_crops: Texture2D

var buttons: Array[Dictionary] = []
var drawer_cards: Array[Dictionary] = []
var resource_pills: Array[Dictionary] = []
var hovered_btn: int = -1
var pressed_btn: int = -1
var hovered_card: int = -1
var hovered_pill: int = -1

var drawer_open: bool = false
var active_tab: int = 0  # 0: 工坊与良田, 1: 六大动物伙伴, 2: 双岛地标与合成, 3: 双段食谱与信物, 4: 桌面伴侣设置

# Smooth Drag Detection State (4px threshold separates click from drag)
var _press_watching_drag: bool = false
var _press_screen_origin: Vector2i = Vector2i.ZERO
var _drag_started_this_press: bool = false

const HUD_RECT := Rect2(480, 238, 960, 58)
const DRAWER_RECT := Rect2(520, 132, 880, 104)
const PILL_GOLD_RECT := Rect2(496, 247, 144, 36)
const PILL_DEW_RECT := Rect2(644, 247, 134, 36)
const PILL_STALL_RECT := Rect2(782, 247, 136, 36)
const WEATHER_BADGE_RECT := Rect2(922, 247, 114, 36)
const CLOSE_DRAWER_RECT := Rect2(1318, 142, 56, 22)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	tex_panel = load("res://assets/pixel_art/ui/panel_wood_9patch.png")
	tex_drawer = load("res://assets/pixel_art/ui/panel_drawer_parchment.png")
	tex_parchment = load("res://assets/pixel_art/ui/panel_parchment_9patch.png")
	tex_pill = load("res://assets/pixel_art/ui/ui_resource_pill.png")
	tex_card = load("res://assets/pixel_art/ui/ui_drawer_card.png")
	tex_card_hover = load("res://assets/pixel_art/ui/ui_drawer_card_hover.png")
	tex_btn_normal = load("res://assets/pixel_art/ui/btn_normal.png")
	tex_btn_hover = load("res://assets/pixel_art/ui/btn_hover.png")
	tex_btn_pressed = load("res://assets/pixel_art/ui/btn_pressed.png")
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet.png")

	resource_pills = [
		{"rect": PILL_GOLD_RECT, "id": "gold"},
		{"rect": PILL_DEW_RECT, "id": "dew"},
		{"rect": PILL_STALL_RECT, "id": "stall"},
		{"rect": WEATHER_BADGE_RECT, "id": "weather"}
	]

	var bx := 1048.0
	var actions := ["crop", "tab_workshop", "tab_animals", "tab_islands", "tab_codex", "tab_settings"]
	var icon_indices := [2, 6, 3, 4, 5, 7]
	var titles := [
		"切换农作物种子 (当前自动轮播)",
		"工坊与良田升级 (打开卷轴抽屉)",
		"六大驻岛动物伙伴进修 (打开抽屉)",
		"左右副岛地标与双段料理 (打开抽屉)",
		"双段料理食谱与旅人信物 (打开抽屉)",
		"桌面伴侣设置: 多屏投送/缩放/白噪音"
	]
	for i in range(actions.size()):
		buttons.append({
			"id": actions[i],
			"rect": Rect2(bx + i * 61.0, 242.0, 46.0, 46.0),
			"icon": icon_indices[i],
			"title": titles[i]
		})
	_rebuild_drawer_cards()

func get_active_drawer_rect() -> Rect2:
	return DRAWER_RECT if drawer_open else Rect2()

func _rebuild_drawer_cards() -> void:
	drawer_cards.clear()
	if not drawer_open or game_manager == null:
		return

	var card_w := 196.0
	var card_h := 58.0
	var start_x := 548.0
	var gap := 12.0
	var cy := 166.0

	match active_tab:
		0:  # 工坊与良田
			drawer_cards = [
				{
					"id": "up_mortar",
					"rect": Rect2(start_x + 0 * (card_w + gap), cy, card_w, card_h),
					"title": "桂花石臼坊 Lv." + str(game_manager.mortar_level),
					"sub": "锤打桂花糕 & 苹果草莓派",
					"cost": str(game_manager.get_mortar_upgrade_cost()) + "G"
				},
				{
					"id": "up_cauldron",
					"rect": Rect2(start_x + 1 * (card_w + gap), cy, card_w, card_h),
					"title": ("建造森之炼金釜" if game_manager.cauldron_level == 0 else "森之炼金釜 Lv." + str(game_manager.cauldron_level)),
					"sub": "荧光菇+晨露→星露甘露饮",
					"cost": str(game_manager.get_cauldron_upgrade_cost()) + "G"
				},
				{
					"id": "up_plots",
					"rect": Rect2(start_x + 2 * (card_w + gap), cy, card_w, card_h),
					"title": "晨风良田 Lv." + str(game_manager.plot_tier),
					"sub": ("已达最大10块良田" if game_manager.plot_tier >= 3 else "固定点位扩建+2块菜地"),
					"cost": ("已满级" if game_manager.plot_tier >= 3 else str(game_manager.get_plot_tier_cost()) + "G")
				},
				{
					"id": "up_stall",
					"rect": Rect2(start_x + 3 * (card_w + gap), cy, card_w, card_h),
					"title": "云端集市摊位 Lv." + str(game_manager.market_level),
					"sub": "可视化货架容量+" + str(game_manager.get_market_capacity()),
					"cost": str(game_manager.get_market_upgrade_cost()) + "G"
				}
			]
		1:  # 六大动物伙伴
			drawer_cards = [
				{
					"id": "up_bunny",
					"rect": Rect2(start_x + 0 * (card_w + gap), cy, card_w, card_h),
					"title": "白兔Lv." + str(game_manager.bunny_level) + " 水獭Lv." + str(game_manager.otter_level),
					"sub": "提升播种捣糕与溪流浇水效率",
					"cost": str(game_manager.get_animal_upgrade_cost(0)) + "G"
				},
				{
					"id": "up_shiba",
					"rect": Rect2(start_x + 1 * (card_w + gap), cy, card_w, card_h),
					"title": "柴犬Lv." + str(game_manager.shiba_level) + " 企鹅Lv." + str(game_manager.penguin_level),
					"sub": "提升摘红苹果与垂钓晨露效率",
					"cost": str(game_manager.get_animal_upgrade_cost(2)) + "G"
				},
				{
					"id": "up_fox",
					"rect": Rect2(start_x + 2 * (card_w + gap), cy, card_w, card_h),
					"title": "森谷小狐狸 Lv." + str(game_manager.fox_level),
					"sub": ("驻扎左岛树洞屋熬制甘露饮" if game_manager.unlocked_left_ellinia else "解锁左岛后自动入驻!"),
					"cost": (str(game_manager.get_animal_upgrade_cost(4)) + "G" if game_manager.unlocked_left_ellinia else "需左岛")
				},
				{
					"id": "up_toucan",
					"rect": Rect2(start_x + 3 * (card_w + gap), cy, card_w, card_h),
					"title": "大嘴鸟快递员 Lv." + str(game_manager.toucan_level),
					"sub": ("驻扎右岛冷饮吧特调菠萝饮" if game_manager.unlocked_right_orbis else "解锁右岛后自动入驻!"),
					"cost": (str(game_manager.get_animal_upgrade_cost(5)) + "G" if game_manager.unlocked_right_orbis else "需右岛")
				}
			]
		2:  # 左右副岛地标与双段料理合成
			drawer_cards = [
				{
					"id": "unlock_left",
					"rect": Rect2(start_x + 0 * (card_w + gap), cy, card_w, card_h),
					"title": "左扩: 荧光森谷浮岛",
					"sub": ("已建树洞草药屋+小狐狸入驻" if game_manager.unlocked_left_ellinia else "建树洞草药屋+招募小狐狸"),
					"cost": ("已开启" if game_manager.unlocked_left_ellinia else "180G")
				},
				{
					"id": "unlock_right",
					"rect": Rect2(start_x + 1 * (card_w + gap), cy, card_w, card_h),
					"title": "右扩: 椰风暖沙浮岛",
					"sub": ("已建椰壳冷饮吧+大嘴鸟入驻" if game_manager.unlocked_right_orbis else "建椰壳冷饮吧+招募大嘴鸟"),
					"cost": ("已开启" if game_manager.unlocked_right_orbis else "320G")
				},
				{
					"id": "up_decor",
					"rect": Rect2(start_x + 2 * (card_w + gap), cy, card_w, card_h),
					"title": "繁荣景观 Lv." + str(game_manager.decor_level) + "/3",
					"sub": "当前: " + game_manager.get_prosperity_title(),
					"cost": ("已集齐" if game_manager.decor_level >= 3 else str(game_manager.get_decor_upgrade_cost()) + "G")
				},
				{
					"id": "craft_now",
					"rect": Rect2(start_x + 3 * (card_w + gap), cy, card_w, card_h),
					"title": "立即手作双段料理",
					"sub": "苹果:" + str(game_manager.apple_stock) + " 晨露:" + str(game_manager.star_dew) + " → 合成上架",
					"cost": "立即制作"
				}
			]
		3:  # 两段式合成食谱与森林旅人信物
			for r_i in range(4):
				var r_data: Dictionary = LegacyGameManager.RECIPE_DATA[r_i]
				var cnt: int = int(game_manager.recipe_stocks[r_i])
				drawer_cards.append({
					"id": "recipe_" + str(r_i),
					"rect": Rect2(start_x + r_i * (card_w + gap), cy, card_w, card_h),
					"title": String(r_data["name"]) + " (" + str(r_data["sell"]) + "G)",
					"sub": String(r_data["formula"]),
					"cost": "货架:" + str(cnt) + "份"
				})
		4:  # 桌面伴侣设置
			var scale_lbl := window_controller.get_scale_label() if window_controller != null else "100%"
			var mon_lbl := window_controller.get_monitor_label() if window_controller != null else "屏幕 1/1"
			var mute_lbl := "已静音" if (sound_manager != null and sound_manager.is_muted) else "随昼夜切换中"
			drawer_cards = [
				{
					"id": "set_scale",
					"rect": Rect2(start_x + 0 * (card_w + gap), cy, card_w, card_h),
					"title": "浮岛缩放比例: " + scale_lbl,
					"sub": "一键切换 75% / 100% / 125%",
					"cost": "切换大小"
				},
				{
					"id": "set_monitor",
					"rect": Rect2(start_x + 1 * (card_w + gap), cy, card_w, card_h),
					"title": "多屏投送: " + mon_lbl,
					"sub": "一键投送到副屏/切换顶底停靠",
					"cost": "投送屏幕"
				},
				{
					"id": "set_mute",
					"rect": Rect2(start_x + 2 * (card_w + gap), cy, card_w, card_h),
					"title": "环境白噪音: " + mute_lbl,
					"sub": "晴天鸟鸣/黄昏风铃/夏夜虫鸣",
					"cost": ("开启声音" if (sound_manager != null and sound_manager.is_muted) else "一键静音")
				},
				{
					"id": "set_weather",
					"rect": Rect2(start_x + 3 * (card_w + gap), cy, card_w, card_h),
					"title": "天气与魔力阵雨奇遇",
					"sub": game_manager.get_phase_name(),
					"cost": "切换/降雨"
				}
			]

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var mpos: Vector2 = get_local_mouse_position()
		if _press_watching_drag and not _drag_started_this_press and window_controller != null:
			var dist_Moved := Vector2(DisplayServer.mouse_get_position() - _press_screen_origin).length()
			if dist_Moved >= 4.0:
				_drag_started_this_press = true
				pressed_btn = -1
				window_controller.start_window_drag()
				queue_redraw()
				return

		var prev_hover := hovered_btn
		var prev_card := hovered_card
		hovered_btn = -1
		hovered_card = -1
		hovered_pill = -1
		for i in range(buttons.size()):
			if (buttons[i]["rect"] as Rect2).has_point(mpos):
				hovered_btn = i
				break
		for p_i in range(resource_pills.size()):
			if (resource_pills[p_i]["rect"] as Rect2).has_point(mpos):
				hovered_pill = p_i
				break
		if drawer_open:
			for c_i in range(drawer_cards.size()):
				if (drawer_cards[c_i]["rect"] as Rect2).has_point(mpos):
					hovered_card = c_i
					break
		if (hovered_btn >= 0 and hovered_btn != prev_hover) or (hovered_card >= 0 and hovered_card != prev_card):
			if sound_manager != null:
				sound_manager.play_sfx("ui_hover", 0.04)
		queue_redraw()

	elif event is InputEventMouseButton:
		var mpos: Vector2 = get_local_mouse_position()
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				_press_watching_drag = true
				_drag_started_this_press = false
				_press_screen_origin = DisplayServer.mouse_get_position()
			else:
				var was_drag := _drag_started_this_press
				_press_watching_drag = false
				_drag_started_this_press = false
				if window_controller != null:
					window_controller.stop_window_drag()
				if not was_drag and drawer_open:
					drawer_open = false
					_rebuild_drawer_cards()
					drawer_toggled.emit()
					queue_redraw()
			return

		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				pressed_btn = hovered_btn
				_press_watching_drag = (hovered_btn < 0)
				_drag_started_this_press = false
				_press_screen_origin = DisplayServer.mouse_get_position()
				queue_redraw()
			else:
				var was_drag := _drag_started_this_press
				_press_watching_drag = false
				_drag_started_this_press = false
				if window_controller != null:
					window_controller.stop_window_drag()
				if not was_drag:
					if drawer_open and CLOSE_DRAWER_RECT.has_point(mpos):
						drawer_open = false
						_rebuild_drawer_cards()
						if sound_manager != null:
							sound_manager.play_sfx("ui_click")
						drawer_toggled.emit()
						pressed_btn = -1
						queue_redraw()
						return
					if WEATHER_BADGE_RECT.has_point(mpos) and game_manager != null:
						game_manager.cycle_weather_manual()
						_rebuild_drawer_cards()
						if sound_manager != null:
							sound_manager.play_sfx("ui_click")
						pressed_btn = -1
						queue_redraw()
						return
					if hovered_card >= 0 and drawer_open:
						_trigger_drawer_card(String(drawer_cards[hovered_card]["id"]))
						pressed_btn = -1
						return
					if pressed_btn >= 0 and pressed_btn == hovered_btn:
						_trigger_button(String(buttons[pressed_btn]["id"]))
				pressed_btn = -1
				queue_redraw()

func _toggle_or_switch_tab(tab_idx: int) -> void:
	if drawer_open and active_tab == tab_idx:
		drawer_open = false
	else:
		drawer_open = true
		active_tab = tab_idx
	_rebuild_drawer_cards()
	if sound_manager != null:
		sound_manager.play_sfx("ui_click")
	drawer_toggled.emit()

func _trigger_button(action_id: String) -> void:
	if game_manager == null:
		return
	match action_id:
		"crop":
			game_manager.cycle_selected_crop()
			if sound_manager != null:
				sound_manager.play_sfx("harvest_pop")
			var cname: String = GameManager.CROP_DATA[game_manager.selected_crop_id]["name"]
			island_world.spawn_floating_cn_tag(Vector2(860, 178), "切换种子: " + cname)
			_rebuild_drawer_cards()
		"tab_workshop":
			_toggle_or_switch_tab(0)
		"tab_animals":
			_toggle_or_switch_tab(1)
		"tab_islands":
			_toggle_or_switch_tab(2)
		"tab_codex":
			_toggle_or_switch_tab(3)
		"tab_settings":
			_toggle_or_switch_tab(4)
	queue_redraw()

func _trigger_drawer_card(card_id: String) -> void:
	if game_manager == null:
		return
	var ok := false
	match card_id:
		"up_mortar":
			ok = game_manager.upgrade_mortar()
			if ok:
				island_world.spawn_floating_cn_tag(Vector2(942, 82), "桂花石臼坊 Lv." + str(game_manager.mortar_level) + "!")
		"up_cauldron":
			ok = game_manager.upgrade_cauldron()
			if ok:
				island_world.spawn_floating_cn_tag(Vector2(604, 88), "森之炼金釜 Lv." + str(game_manager.cauldron_level) + "!")
		"up_plots":
			ok = game_manager.upgrade_plot_tier()
			if ok:
				island_world.spawn_floating_cn_tag(Vector2(780, 96), "良田扩建!")
		"up_stall":
			ok = game_manager.upgrade_market_stall()
			if ok:
				island_world.spawn_floating_cn_tag(Vector2(1022, 76), "货架扩容!")
		"up_bunny":
			ok = game_manager.upgrade_animal(0)
			if ok:
				game_manager.otter_level = game_manager.bunny_level
		"up_shiba":
			ok = game_manager.upgrade_animal(2)
			if ok:
				game_manager.penguin_level = game_manager.shiba_level
		"up_fox":
			if game_manager.unlocked_left_ellinia:
				ok = game_manager.upgrade_animal(4)
		"up_toucan":
			if game_manager.unlocked_right_orbis:
				ok = game_manager.upgrade_animal(5)
		"unlock_left":
			ok = game_manager.unlock_ellinia_island()
			if ok:
				island_world.refresh_world_layout()
				island_world.spawn_floating_cn_tag(Vector2(240, 96), "解锁荧光森谷+小狐狸入驻!")
		"unlock_right":
			ok = game_manager.unlock_orbis_island()
			if ok:
				island_world.refresh_world_layout()
				island_world.spawn_floating_cn_tag(Vector2(1620, 96), "解锁椰风暖沙+大嘴鸟入驻!")
		"up_decor":
			ok = game_manager.upgrade_decor()
			if ok:
				island_world.spawn_floating_cn_tag(Vector2(820, 92), "繁荣度提升! " + game_manager.get_prosperity_title())
		"craft_now":
			var crafted_id := game_manager.craft_two_stage_recipe(-1)
			if crafted_id >= 0:
				ok = true
				var rname: String = GameManager.RECIPE_DATA[crafted_id]["name"]
				island_world.spawn_floating_cn_tag(Vector2(1022, 78), "★上架: " + rname + "!")
		"recipe_0", "recipe_1", "recipe_2", "recipe_3":
			var pref := int(card_id.substr(7, 1))
			var cid := game_manager.craft_two_stage_recipe(pref)
			if cid >= 0:
				ok = true
				var rn: String = GameManager.RECIPE_DATA[cid]["name"]
				island_world.spawn_floating_cn_tag(Vector2(1022, 78), "★手作: " + rn + "!")
		"set_scale":
			if window_controller != null:
				game_manager.scale_idx = window_controller.cycle_scale_preset()
				game_manager.save_game()
				ok = true
		"set_monitor":
			if window_controller != null:
				if DisplayServer.get_screen_count() > 1:
					window_controller.cycle_target_monitor()
				else:
					window_controller.toggle_dock_position()
				ok = true
		"set_mute":
			if sound_manager != null:
				game_manager.is_muted = sound_manager.toggle_mute()
				game_manager.save_game()
				ok = true
		"set_weather":
			game_manager.cycle_weather_manual()
			if island_world != null:
				island_world.trigger_magic_rain_shower()
			ok = true

	if ok and sound_manager != null:
		sound_manager.play_sfx("wood_build" if card_id.begins_with("up_") or card_id.begins_with("unlock_") else "ui_click")
	_rebuild_drawer_cards()
	queue_redraw()

func _get_pill_tooltip(pill_id: String) -> Dictionary:
	match pill_id:
		"gold":
			return {
				"title": "云岛金币: " + str(game_manager.meso) + "G (按住浮岛或底栏任意处可自由拖动)",
				"sub": "森林旅人采购料理与鲜果自动结算 · 旅人信物已收集 " + str(game_manager.traveler_tokens) + " 枚"
			}
		"dew":
			return {
				"title": "晨露水晶: " + str(game_manager.star_dew) + "  ·  果园红苹果: " + str(game_manager.apple_stock),
				"sub": "企鹅垂钓晨露 & 柴犬采摘红苹果 · 用于手作两段式料理"
			}
		"stall":
			return {
				"title": "集市可视化货架: " + str(game_manager.get_total_stall_items()) + " / " + str(game_manager.get_market_capacity()),
				"sub": "高价双段料理: " + str(game_manager.get_total_delicacy_count()) + "份  ·  基础鲜果: " + str(game_manager.market_stock) + "份"
			}
		"weather":
			return {
				"title": "天象: " + game_manager.get_phase_name() + " (点击切换)",
				"sub": "浮岛繁荣度: " + game_manager.get_prosperity_title()
			}
	return {}

func _draw() -> void:
	if tex_panel == null or game_manager == null:
		return

	# 0. Collapsible Wooden & Parchment Drawer Sub-Panel (when open)
	if drawer_open and tex_drawer != null:
		draw_texture_rect(tex_drawer, DRAWER_RECT, false)
		var tab_titles: Array[String] = [
			"【工坊与良田扩建】固定点位自动摆放 · 集市摊位实时可视化货架堆叠",
			"【六大动物伙伴进修】白兔/水獭/柴犬/企鹅 + 森谷小狐狸 & 海滩大嘴鸟",
			"【双岛地标与繁荣进化】树洞草药屋/椰壳冷饮吧 · 繁荣度: " + game_manager.get_prosperity_title(),
			"【两段式合成料理食谱】点击配方卡片可消耗鲜果+苹果/晨露立即手作上架",
			"【桌面伴侣设置】75%/100%/125%缩放 · 多显示器一键投送 · 昼夜环境音切换"
		]
		PixelFontRenderer.draw_pixel_cn(self, Vector2(552, 156), tab_titles[active_tab], 13, Color(1.0, 0.95, 0.72), Color(0.18, 0.07, 0.02))
		if tex_pill != null:
			draw_texture_rect(tex_pill, CLOSE_DRAWER_RECT, false)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(1346, 157), "×收起", 12, Color(1.0, 0.88, 0.78), Color(0.18, 0.07, 0.02), true)

		for c_i in range(drawer_cards.size()):
			var card: Dictionary = drawer_cards[c_i]
			var cr: Rect2 = card["rect"]
			var card_tex := tex_card_hover if (c_i == hovered_card and tex_card_hover != null) else tex_card
			if card_tex != null:
				draw_texture_rect(card_tex, cr, false)
			PixelFontRenderer.draw_pixel_cn(self, cr.position + Vector2(12, 20), String(card["title"]), 13, Color(1.0, 0.96, 0.82), Color(0.18, 0.07, 0.02))
			PixelFontRenderer.draw_pixel_cn(self, cr.position + Vector2(12, 37), String(card["sub"]), 12, Color(0.86, 0.98, 0.80), Color(0.16, 0.06, 0.02))
			PixelFontRenderer.draw_pixel_cn(self, cr.position + Vector2(cr.size.x - 12, 51), String(card["cost"]), 12, Color(1.0, 0.88, 0.34), Color(0.18, 0.07, 0.02), false)

	# 1. Flush-bottom Ornate Carved Walnut & Brass HUD Bar
	draw_texture_rect(tex_panel, HUD_RECT, false)

	# 2. Pill 1: Gold Coin Bag + Adaptive Puffy Gradient Number (fits 6-8 digit gold cleanly!)
	if tex_pill != null:
		draw_texture_rect(tex_pill, PILL_GOLD_RECT, false)
	draw_texture_rect_region(tex_icons, Rect2(502, 250, 28, 28), Rect2(0, 0, 48, 48))
	var gold_str := str(game_manager.meso) + "G"
	var gold_scale := clampf(4.6 / float(maxi(5, gold_str.length())), 0.56, 0.76)
	var gold_y := 252.0 + (0.76 - gold_scale) * 14.0
	PixelFontRenderer.draw_pixel_string(self, Vector2(532, gold_y), gold_str, Color.WHITE, false, gold_scale)

	# 3. Pill 2: Morning Dew Crystal & Orchard Apples inside Recessed Pill
	if tex_pill != null:
		draw_texture_rect(tex_pill, PILL_DEW_RECT, false)
	draw_texture_rect_region(tex_icons, Rect2(649, 251, 26, 26), Rect2(48, 0, 48, 48))
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(677, 270),
		"露" + str(game_manager.star_dew) + " 果" + str(game_manager.apple_stock),
		12,
		Color(0.84, 0.96, 1.0),
		Color(0.16, 0.06, 0.02)
	)

	# 4. Pill 3: Market Stall Visual Shelf Stock inside Recessed Pill
	if tex_pill != null:
		draw_texture_rect(tex_pill, PILL_STALL_RECT, false)
	if tex_delicacies != null:
		draw_texture_rect_region(tex_delicacies, Rect2(787, 251, 26, 26), Rect2(0, 0, 36, 36))
	PixelFontRenderer.draw_pixel_cn(
		self,
		Vector2(817, 270),
		"货架 " + str(game_manager.get_total_stall_items()) + "/" + str(game_manager.get_market_capacity()),
		12,
		Color(1.0, 0.94, 0.72),
		Color(0.16, 0.06, 0.02)
	)

	# 5. Pill 4: Weather & Time-of-Day Recessed Pill
	if tex_pill != null:
		draw_texture_rect(tex_pill, WEATHER_BADGE_RECT, false)
	var phase_list: Array[String] = ["★晨风晴天", "★暖霞夕阳", "★荧光星夜", "★彩虹微雨"]
	var phase_short: String = phase_list[game_manager.get_phase_index()]
	PixelFontRenderer.draw_pixel_cn(self, Vector2(979, 270), phase_short, 13, Color(1.0, 0.96, 0.80), Color(0.16, 0.07, 0.02), true)

	# 6. 6 Artisan Beveled Wood & Brass-Stud Action Buttons
	var short_tags: Array[String] = ["种子", "工坊", "伙伴", "扩建", "食谱", "设置"]
	for i in range(buttons.size()):
		var b: Dictionary = buttons[i]
		var r: Rect2 = b["rect"]
		var y_off := 0.0
		var mod_col := Color.WHITE
		var is_active_tab := (drawer_open and i >= 1 and active_tab == i - 1)
		if i == pressed_btn:
			y_off = 2.0
			mod_col = Color(0.86, 0.86, 0.86, 1.0)
		elif i == hovered_btn or is_active_tab:
			mod_col = Color(1.22, 1.18, 1.08, 1.0)
		var icon_idx: int = int(b["icon"])
		draw_texture_rect_region(tex_icons, Rect2(r.position.x + 2, r.position.y - 2 + y_off, 42, 42), Rect2(icon_idx * 48, 0, 48, 48), mod_col)
		PixelFontRenderer.draw_pixel_cn(
			self,
			Vector2(r.position.x + 23, r.position.y + 45),
			short_tags[i],
			12,
			Color(1.0, 0.95, 0.56) if is_active_tab else Color(1.0, 0.95, 0.84),
			Color(0.16, 0.06, 0.02),
			true
		)

	# 7. Curled Wooden Scroll Tooltip Banner on Hover
	var mpos := get_local_mouse_position()
	if hovered_btn >= 0 and tex_parchment != null:
		var b: Dictionary = buttons[hovered_btn]
		var r: Rect2 = b["rect"]
		var tip_txt := String(b["title"])
		var tip_w := maxf(180.0, float(tip_txt.length() * 13 + 32))
		var bx_tip := clampf(r.position.x + 23.0 - tip_w * 0.5, 490.0, 1430.0 - tip_w)
		var by_tip := (DRAWER_RECT.position.y - 38.0) if drawer_open else (r.position.y - 40.0)
		draw_texture_rect(tex_parchment, Rect2(bx_tip, by_tip, tip_w, 34), false)
		PixelFontRenderer.draw_pixel_cn(self, Vector2(bx_tip + tip_w * 0.5, by_tip + 22), tip_txt, 13, Color(1.0, 0.96, 0.82), Color(0.18, 0.07, 0.02), true)
	elif hovered_pill >= 0 and tex_parchment != null:
		var p_info: Dictionary = _get_pill_tooltip(String(resource_pills[hovered_pill]["id"]))
		if not p_info.is_empty():
			var pr: Rect2 = resource_pills[hovered_pill]["rect"]
			var pt_str := String(p_info["title"])
			var ps_str := String(p_info["sub"])
			var pw := maxf(240.0, float(maxi(pt_str.length(), ps_str.length()) * 13 + 36))
			var pbx := clampf(pr.position.x + pr.size.x * 0.5 - pw * 0.5, 485.0, 1435.0 - pw)
			var pby := (DRAWER_RECT.position.y - 48.0) if drawer_open else (pr.position.y - 52.0)
			draw_texture_rect(tex_parchment, Rect2(pbx, pby, pw, 46), false)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(pbx + pw * 0.5, pby + 19), pt_str, 13, Color(1.0, 0.96, 0.76), Color(0.18, 0.07, 0.02), true)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(pbx + pw * 0.5, pby + 36), ps_str, 12, Color(0.86, 0.98, 0.82), Color(0.18, 0.07, 0.02), true)
	elif not drawer_open and island_world != null and tex_parchment != null:
		var w_info: Dictionary = island_world.get_world_hover_info(island_world.get_local_mouse_position())
		if not w_info.is_empty():
			var t_str := String(w_info["title"])
			var s_str := String(w_info["sub"])
			var box_w := maxf(float(maxi(t_str.length(), s_str.length()) * 13 + 34), 180.0)
			var w_pos: Vector2 = (w_info["pos"] as Vector2) + island_world.position
			var bx_w := clampf(w_pos.x - box_w * 0.5, 80.0, 1840.0 - box_w)
			var by_w := clampf(w_pos.y, 4.0, 184.0)
			draw_texture_rect(tex_parchment, Rect2(bx_w, by_w, box_w, 46), false)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(bx_w + box_w * 0.5, by_w + 19), t_str, 13, Color(1.0, 0.96, 0.76), Color(0.18, 0.07, 0.02), true)
			PixelFontRenderer.draw_pixel_cn(self, Vector2(bx_w + box_w * 0.5, by_w + 36), s_str, 12, Color(0.86, 0.98, 0.82), Color(0.18, 0.07, 0.02), true)
