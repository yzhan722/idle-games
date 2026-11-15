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
var tex_crops: Texture2D
var tex_delicacies: Texture2D
var tex_btn_normal: Texture2D
var tex_btn_hover: Texture2D
var tex_btn_pressed: Texture2D
var tex_promo_tiers: Array[Texture2D] = [null, null, null, null]
var tex_medals: Array[Texture2D] = [null, null, null]
var tex_solar_dishes: Dictionary = {}
var tex_rare_voucher: Texture2D
var tex_bulk_order: Texture2D
var tex_flora_icons: Dictionary = {}
var tex_souvenir_icons: Dictionary = {}
var tex_bath_icons: Dictionary = {}
var tex_vip_hotspring_guest: Texture2D
var tex_bakery_icons: Dictionary = {}
var tex_parade_float: Texture2D
var tex_tea_icons: Dictionary = {}
var tex_moon_tea_boat: Texture2D

var active_tab: int = 0
var hovered_tab: int = -1
var hovered_card: int = -1
var hovered_emp_card: int = -1
var prev_hovered_tab: int = -1
var prev_hovered_card: int = -1
var prev_hovered_emp_card: int = -1
var is_pressing_btn: bool = false
var displayed_gold: float = 120.0

var is_mouse_over_hud: bool = false
var is_collapsed_capsule: bool = false
var boss_stealth_mode: bool = false
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
var lbl_drawer_lang: Label
var lbl_drawer_fps: Label
var lbl_drawer_opacity: Label
var lbl_drawer_dock: Label
var lbl_drawer_noise: Label
var lbl_drawer_weather: Label
var lbl_drawer_mute: Label
var lbl_bar_pomodoro: Label
var lbl_card_titles: Array[Label] = []
var lbl_card_subs: Array[Label] = []
var lbl_card_costs: Array[Label] = []
var lbl_emp_names: Array[Label] = []
var lbl_emp_titles: Array[Label] = []
var lbl_emp_progress: Array[Label] = []

const TAB_COUNT := 5
const CAPSULE_RECT := Rect2(770.0, 232.0, 380.0, 40.0)
const CAPSULE_MUTE_RECT := Rect2(1088.0, 236.0, 54.0, 32.0)
const FULL_BAR_RECT := Rect2(480.0, 230.0, 960.0, 58.0)
const DRAWER_RECT := Rect2(520.0, 122.0, 880.0, 106.0)
const CODEX_DRAWER_RECT := Rect2(520.0, 66.0, 880.0, 162.0)

const TOP_RIGHT_LANG_RECT := Rect2(862.0, 128.0, 58.0, 23.0)
const TOP_RIGHT_NOISE_RECT := Rect2(924.0, 128.0, 76.0, 23.0)
const TOP_RIGHT_FPS_RECT := Rect2(1004.0, 128.0, 62.0, 23.0)
const TOP_RIGHT_OPACITY_RECT := Rect2(1070.0, 128.0, 68.0, 23.0)
const TOP_RIGHT_DOCK_RECT := Rect2(1142.0, 128.0, 88.0, 23.0)
const TOP_RIGHT_WEATHER_RECT := Rect2(1234.0, 128.0, 86.0, 23.0)
const TOP_RIGHT_MUTE_RECT := Rect2(1324.0, 128.0, 58.0, 23.0)
const POMODORO_RECT := Rect2(952.0, 239.0, 90.0, 36.0)

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	tex_panel = load("res://assets/pixel_art/ui/panel_wood_9patch.png")
	tex_drawer = load("res://assets/pixel_art/ui/panel_drawer_parchment.png")
	tex_card = load("res://assets/pixel_art/ui/ui_drawer_card.png")
	tex_card_hover = load("res://assets/pixel_art/ui/ui_drawer_card_hover.png")
	tex_pill = load("res://assets/pixel_art/ui/ui_resource_pill.png")
	tex_icons = load("res://assets/pixel_art/ui/icons_ui.png")
	tex_crops = load("res://assets/pixel_art/crops/crops_sheet_normalized.png")
	tex_delicacies = load("res://assets/pixel_art/buildings/delicacies_sheet_normalized.png")
	tex_btn_normal = load("res://assets/pixel_art/ui/btn_normal.png")
	tex_btn_hover = load("res://assets/pixel_art/ui/btn_hover.png")
	tex_btn_pressed = load("res://assets/pixel_art/ui/btn_pressed.png")
	for t_idx in range(1, EconomyConfig.PROMOTION_TIERS.size()):
		var t_cfg: Dictionary = EconomyConfig.PROMOTION_TIERS[t_idx]
		var acc_p := String(t_cfg.get("accessory_tex", ""))
		var med_p := String(t_cfg.get("medal_tex", ""))
		if acc_p != "":
			tex_promo_tiers[t_idx] = EconomyConfig.load_pixel_texture(acc_p)
		if med_p != "":
			tex_medals[t_idx - 1] = EconomyConfig.load_pixel_texture(med_p)
	reload_ci4_textures()
	reload_ci5_textures()
	reload_ci6_textures()
	reload_ci7_textures()
	reload_ci8_textures()

	displayed_gold = float(GameManager.gold)
	if GameManager.pending_offline_gold > 0:
		_show_offline_welcome_banner(GameManager.pending_offline_seconds, GameManager.pending_offline_gold)
	if EventBus != null:
		EventBus.offline_earnings_ready.connect(_show_offline_welcome_banner)
		EventBus.pomodoro_completed.connect(_on_pomodoro_completed)
		EventBus.gourmet_acclaim_started.connect(_on_gourmet_acclaim_started)
		EventBus.lantern_festival_started.connect(_on_lantern_festival_started)
		EventBus.airship_bulk_order_completed.connect(_on_airship_bulk_order_completed)
		EventBus.solar_term_changed.connect(_on_solar_term_changed)
		EventBus.hybrid_flora_crossbred.connect(_on_hybrid_flora_crossbred)
		EventBus.souvenir_box_sold.connect(_on_souvenir_box_sold)
		EventBus.hotspring_recipe_unlocked.connect(_on_hotspring_recipe_unlocked)
		EventBus.hotspring_vip_settled.connect(_on_hotspring_vip_settled)
		EventBus.bakery_recipe_unlocked.connect(_on_bakery_recipe_unlocked)
		EventBus.gourmet_parade_started.connect(_on_gourmet_parade_started)
		EventBus.gourmet_parade_settled.connect(_on_gourmet_parade_settled)
		EventBus.tea_recipe_unlocked.connect(_on_tea_recipe_unlocked)
		EventBus.moon_tea_gathering_started.connect(_on_moon_tea_gathering_started)
		EventBus.moon_tea_gathering_settled.connect(_on_moon_tea_gathering_settled)

	_build_native_labels()

func reload_ci4_textures() -> void:
	tex_rare_voucher = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_RARE_VOUCHER_TEX)
	tex_bulk_order = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_BULK_ORDER_TEX)
	for sd_id in EconomyConfig.SOLAR_DISH_ORDER:
		var sd_cfg: Dictionary = EconomyConfig.SOLAR_SPECIALTY_DISHES.get(sd_id, {})
		var p := String(sd_cfg.get("icon_tex", ""))
		if p != "":
			tex_solar_dishes[sd_id] = EconomyConfig.load_pixel_texture(p)

func reload_ci5_textures() -> void:
	for fid in EconomyConfig.HYBRID_FLORA_ORDER:
		var f_cfg: Dictionary = EconomyConfig.HYBRID_FLORA.get(fid, {})
		var fp := String(f_cfg.get("icon_tex", ""))
		if fp != "":
			tex_flora_icons[fid] = EconomyConfig.load_pixel_texture(fp)
	for bid in EconomyConfig.SOUVENIR_BOX_ORDER:
		var b_cfg: Dictionary = EconomyConfig.SOUVENIR_BOXES.get(bid, {})
		var bp := String(b_cfg.get("icon_tex", ""))
		if bp != "":
			tex_souvenir_icons[bid] = EconomyConfig.load_pixel_texture(bp)

func reload_ci6_textures() -> void:
	tex_vip_hotspring_guest = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_VIP_HOTSPRING_GUEST_TEX)
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		var b_cfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(bid, {})
		var bp := String(b_cfg.get("icon_tex", ""))
		if bp != "":
			tex_bath_icons[bid] = EconomyConfig.load_pixel_texture(bp)

func reload_ci7_textures() -> void:
	tex_parade_float = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PARADE_FLOAT_TEX)
	for bid in EconomyConfig.BAKERY_CODEX_ORDER:
		var b_cfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(bid, {})
		var bp := String(b_cfg.get("icon_tex", ""))
		if bp != "":
			tex_bakery_icons[bid] = EconomyConfig.load_pixel_texture(bp)

func reload_ci8_textures() -> void:
	tex_moon_tea_boat = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOON_TEA_BOAT_TEX)
	for tid in EconomyConfig.TEA_CODEX_ORDER:
		var t_cfg: Dictionary = EconomyConfig.TEA_ITEMS.get(tid, {})
		var tp := String(t_cfg.get("icon_tex", ""))
		if tp != "":
			tex_tea_icons[tid] = EconomyConfig.load_pixel_texture(tp)

func _on_tea_recipe_unlocked(item_id: String) -> void:
	offline_banner_timer = 5.0
	var tname := EconomyConfig.get_item_display_name(item_id)
	offline_banner_text = "★云端茗香茶坊秘谱点亮！解锁【" + tname + "】· 茗香清心光环与山海图鉴售价提升!"
	_sync_label_nodes()
	queue_redraw()

func _on_moon_tea_gathering_started(duration: float) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★荷塘月色画舫品茗雅集开幕 (" + str(int(round(duration))) + "s)！茗茶与佳肴售价 1.38x · 点击荷塘画舫领雅赏!"
	_sync_label_nodes()
	queue_redraw()

func _on_moon_tea_gathering_settled(tea_id: String, _qty: int, gold_earned: int, amber_earned: int, vouchers_earned: int, rep_gained: int) -> void:
	offline_banner_timer = 4.8
	var tname := EconomyConfig.get_item_display_name(tea_id)
	var v_seg := (" +" + str(vouchers_earned) + "图鉴券") if vouchers_earned > 0 else ""
	var g_seg := ("+" + str(gold_earned) + "G ") if gold_earned > 0 else ""
	offline_banner_text = "★月色画舫品茗【" + tname + "】: " + g_seg + "+" + str(amber_earned) + "琥珀" + v_seg + " · 声望+" + str(rep_gained) + "!"
	_sync_label_nodes()
	queue_redraw()

func _on_bakery_recipe_unlocked(item_id: String) -> void:
	offline_banner_timer = 5.0
	var bname := EconomyConfig.get_item_display_name(item_id)
	offline_banner_text = "★云端风车面坊秘方突破！点亮【" + bname + "】· 麦香烘焙光环与山海图鉴售价提升!"
	_sync_label_nodes()
	queue_redraw()

func _on_gourmet_parade_started(duration: float) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★云海美食花车巡游节盛大开启 (" + str(int(round(duration))) + "s)！巡游食客高溢价(1.75x~1.90x)抢购鲜烤欧包可颂!"
	_sync_label_nodes()
	queue_redraw()

func _on_gourmet_parade_settled(bread_id: String, _qty: int, gold_earned: int, amber_earned: int, vouchers_earned: int, rep_gained: int) -> void:
	offline_banner_timer = 4.8
	var bname := EconomyConfig.get_item_display_name(bread_id)
	var v_seg := (" +" + str(vouchers_earned) + "图鉴券") if vouchers_earned > 0 else ""
	offline_banner_text = "★巡游食客品享鲜烤【" + bname + "】: +" + str(gold_earned) + "G +" + str(amber_earned) + "琥珀" + v_seg + " · 声望+" + str(rep_gained) + "!"
	_sync_label_nodes()
	queue_redraw()

func _on_hotspring_recipe_unlocked(bath_id: String) -> void:
	offline_banner_timer = 5.0
	var bname := EconomyConfig.get_item_display_name(bath_id)
	offline_banner_text = "★云海温泉汤屋秘方突破！解锁疗愈浴汤【" + bname + "】· 全员精力光环与图鉴加成提升!"
	_sync_label_nodes()
	queue_redraw()

func _on_hotspring_vip_settled(bath_id: String, _qty: int, gold_earned: int, amber_earned: int, vouchers_earned: int, rep_gained: int) -> void:
	offline_banner_timer = 4.8
	var bname := EconomyConfig.get_item_display_name(bath_id)
	var v_seg := (" +" + str(vouchers_earned) + "图鉴券") if vouchers_earned > 0 else ""
	offline_banner_text = "★贵宾汤客泡享【" + bname + "】满意结算: +" + str(gold_earned) + "G +" + str(amber_earned) + "琥珀" + v_seg + " · 声望+" + str(rep_gained) + "!"
	_sync_label_nodes()
	queue_redraw()

func _on_hybrid_flora_crossbred(flora_id: String) -> void:
	offline_banner_timer = 5.0
	var fname := EconomyConfig.get_item_display_name(flora_id)
	offline_banner_text = "★云端温室杂交突破！成功培育珍稀奇花【" + fname + "】· 岛屿光环与图鉴售价提升!"
	_sync_label_nodes()
	queue_redraw()

func _on_souvenir_box_sold(box_id: String, _qty: int, gold_earned: int, amber_earned: int, rep_gained: int) -> void:
	offline_banner_timer = 4.8
	var bname := EconomyConfig.get_item_display_name(box_id)
	offline_banner_text = "★收藏家旅客选购【" + bname + "】！收获 +" + str(gold_earned) + "G · +" + str(amber_earned) + "琥珀 · 声望+" + str(rep_gained) + "!"
	_sync_label_nodes()
	queue_redraw()

func _on_airship_bulk_order_completed(order_dict: Dictionary) -> void:
	offline_banner_timer = 5.2
	var r_g := int(order_dict.get("reward_gold", 445))
	var r_a := int(order_dict.get("reward_amber", 4))
	var r_v := int(order_dict.get("reward_vouchers", 1))
	offline_banner_text = "★远洋飞艇商队大订单结清！收获 +" + str(r_g) + "G · +" + str(r_a) + "晨露琥珀 · +" + str(r_v) + "稀有图鉴券!"
	_sync_label_nodes()
	queue_redraw()

func _on_solar_term_changed(_term_idx: int, term_name: String, specialty_dish_id: String) -> void:
	var d_name := EconomyConfig.get_item_display_name(specialty_dish_id)
	var b_tag := String(GameManager.get_current_solar_term().get("buff_tag", ""))
	offline_banner_timer = 4.2
	offline_banner_text = "★节气流转至【" + term_name + "】· 当季限定【" + d_name + "】售价1.45x · " + b_tag
	_sync_label_nodes()
	queue_redraw()

func _on_gourmet_acclaim_started(duration: float) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★美食评论家盛赞！「金牌口碑」激活 " + str(int(round(duration))) + "s: 全岛商品售价+25% & 小费+20%!"
	_sync_label_nodes()
	queue_redraw()

func _on_lantern_festival_started(duration: float) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★云端花火灯会开启 (" + str(int(round(duration))) + "s)！彩灯高悬、客流涌动，富豪与特殊行商到访率大幅提升!"
	_sync_label_nodes()
	queue_redraw()

func _on_pomodoro_completed(gold_reward: int, frenzy_sec: float) -> void:
	offline_banner_timer = 6.0
	offline_banner_text = "★专注达成！开启「★专注晨露礼盒」: 获得 +" + str(gold_reward) + "G & 全岛2.0x狂欢加速 " + str(int(round(frenzy_sec))) + "s!"
	if SoundManager != null:
		SoundManager.play_click_sfx()
	_sync_label_nodes()
	queue_redraw()

func _format_duration_cn(seconds: int) -> String:
	if seconds >= 3600:
		return str(seconds / 3600) + "小时" + str((seconds % 3600) / 60) + "分"
	elif seconds >= 60:
		return str(seconds / 60) + "分" + str(seconds % 60) + "秒"
	return str(seconds) + "秒"

func _show_offline_welcome_banner(seconds_away: int, gold_earned: int) -> void:
	offline_banner_timer = 8.0
	var codex_pct := (GameManager.get_unlocked_codex_count()) * 10
	var items_cnt := int(GameManager.last_offline_report.get("items", maxi(1, seconds_away / 12)))
	offline_banner_text = "★欢迎归来！离线 " + _format_duration_cn(seconds_away) + " · 收获 " + str(items_cnt) + " 件 · 自动创收 +" + str(gold_earned) + "G (图鉴+" + str(codex_pct) + "%)"
	_sync_label_nodes()
	queue_redraw()

func set_boss_stealth(stealth_on: bool) -> void:
	boss_stealth_mode = stealth_on
	if stealth_on:
		drawer_expanded = false
		is_collapsed_capsule = true
		hud_opacity = 0.25
		modulate.a = 0.25
	else:
		is_collapsed_capsule = false
		hud_opacity = 1.0
		modulate.a = 1.0
	_sync_label_nodes()
	queue_redraw()

func open_drawer(tab_idx: int = 0) -> void:
	active_tab = clampi(tab_idx, 0, 3)
	boss_stealth_mode = false
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
	lbl_offline.position = Vector2(650.0, 8.0)
	lbl_offline.custom_minimum_size = Vector2(620.0, 26.0)
	add_child(lbl_offline)

	lbl_capsule_gold = EconomyConfig.create_pixel_label("120G", 14, Color("#FFE066"), false)
	lbl_capsule_gold.position = Vector2(CAPSULE_RECT.position.x + 42.0, CAPSULE_RECT.position.y + 10.0)
	add_child(lbl_capsule_gold)

	lbl_capsule_info = EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), false)
	lbl_capsule_info.position = Vector2(CAPSULE_RECT.position.x + 112.0, CAPSULE_RECT.position.y + 10.0)
	add_child(lbl_capsule_info)

	lbl_capsule_mute = EconomyConfig.create_pixel_label("[静音]", 14, Color("#FFE066"), false)
	lbl_capsule_mute.position = Vector2(CAPSULE_MUTE_RECT.position.x + 2.0, CAPSULE_MUTE_RECT.position.y + 6.0)
	add_child(lbl_capsule_mute)

	lbl_bar_gold = EconomyConfig.create_pixel_label("120G", 14, Color("#FFE066"), false)
	lbl_bar_gold.position = Vector2(515.0, 249.0)
	lbl_bar_gold.scale = Vector2(0.84, 0.86)
	add_child(lbl_bar_gold)

	lbl_bar_pipeline = EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), true)
	lbl_bar_pipeline.position = Vector2(628.0, 248.0)
	lbl_bar_pipeline.custom_minimum_size = Vector2(188.0, 22.0)
	lbl_bar_pipeline.scale = Vector2(0.84, 0.84)
	add_child(lbl_bar_pipeline)

	lbl_bar_stall = EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), true)
	lbl_bar_stall.position = Vector2(806.0, 248.0)
	lbl_bar_stall.custom_minimum_size = Vector2(162.0, 22.0)
	lbl_bar_stall.scale = Vector2(0.84, 0.84)
	add_child(lbl_bar_stall)

	lbl_bar_pomodoro = EconomyConfig.create_pixel_label("[番茄专注]", 14, Color("#FFE066"), false)
	lbl_bar_pomodoro.position = Vector2(POMODORO_RECT.position.x + 24.0, POMODORO_RECT.position.y + 9.0)
	lbl_bar_pomodoro.scale = Vector2(0.84, 0.84)
	add_child(lbl_bar_pomodoro)

	for i in range(TAB_COUNT):
		var tl := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), true)
		tl.position = Vector2(1046.0 + float(i) * 74.0, 264.0)
		tl.custom_minimum_size = Vector2(76.0, 22.0)
		tl.scale = Vector2(0.92, 0.92)
		add_child(tl)
		lbl_tabs.append(tl)

	lbl_drawer_title = EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
	lbl_drawer_title.position = Vector2(540.0, 128.0)
	lbl_drawer_title.scale = Vector2(0.88, 0.88)
	add_child(lbl_drawer_title)

	lbl_drawer_lang = EconomyConfig.create_pixel_label("[简中]", 14, Color("#FFE066"), false)
	lbl_drawer_lang.position = Vector2(TOP_RIGHT_LANG_RECT.position.x + 6.0, TOP_RIGHT_LANG_RECT.position.y + 2.0)
	lbl_drawer_lang.scale = Vector2(0.84, 0.84)
	add_child(lbl_drawer_lang)

	lbl_drawer_noise = EconomyConfig.create_pixel_label("[白噪:关]", 14, Color("#FFE066"), false)
	lbl_drawer_noise.position = Vector2(TOP_RIGHT_NOISE_RECT.position.x + 4.0, TOP_RIGHT_NOISE_RECT.position.y + 2.0)
	lbl_drawer_noise.scale = Vector2(0.84, 0.84)
	add_child(lbl_drawer_noise)

	lbl_drawer_fps = EconomyConfig.create_pixel_label("[60FPS]", 14, Color("#FFE066"), false)
	lbl_drawer_fps.position = Vector2(TOP_RIGHT_FPS_RECT.position.x + 4.0, TOP_RIGHT_FPS_RECT.position.y + 2.0)
	lbl_drawer_fps.scale = Vector2(0.86, 0.86)
	add_child(lbl_drawer_fps)

	lbl_drawer_opacity = EconomyConfig.create_pixel_label("[100%透]", 14, Color("#FFE066"), false)
	lbl_drawer_opacity.position = Vector2(TOP_RIGHT_OPACITY_RECT.position.x + 4.0, TOP_RIGHT_OPACITY_RECT.position.y + 2.0)
	lbl_drawer_opacity.scale = Vector2(0.86, 0.86)
	add_child(lbl_drawer_opacity)

	lbl_drawer_dock = EconomyConfig.create_pixel_label("[贴合任务栏]", 14, Color("#FFE066"), false)
	lbl_drawer_dock.position = Vector2(TOP_RIGHT_DOCK_RECT.position.x + 4.0, TOP_RIGHT_DOCK_RECT.position.y + 2.0)
	lbl_drawer_dock.scale = Vector2(0.86, 0.86)
	add_child(lbl_drawer_dock)

	lbl_drawer_weather = EconomyConfig.create_pixel_label("[天气:晴昼]", 14, Color("#FFE066"), false)
	lbl_drawer_weather.position = Vector2(TOP_RIGHT_WEATHER_RECT.position.x + 4.0, TOP_RIGHT_WEATHER_RECT.position.y + 2.0)
	lbl_drawer_weather.scale = Vector2(0.86, 0.86)
	add_child(lbl_drawer_weather)

	lbl_drawer_mute = EconomyConfig.create_pixel_label("[静音]", 14, Color("#FFF4D6"), false)
	lbl_drawer_mute.position = Vector2(TOP_RIGHT_MUTE_RECT.position.x + 4.0, TOP_RIGHT_MUTE_RECT.position.y + 2.0)
	lbl_drawer_mute.scale = Vector2(0.86, 0.86)
	add_child(lbl_drawer_mute)

	for i in range(10):
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

	for i in range(6):
		var en := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
		var et := EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), false)
		var ep := EconomyConfig.create_pixel_label("", 14, Color("#8CE99A"), false)
		en.scale = Vector2(0.84, 0.84)
		et.scale = Vector2(0.76, 0.76)
		ep.scale = Vector2(0.76, 0.76)
		en.visible = false
		et.visible = false
		ep.visible = false
		add_child(en)
		add_child(et)
		add_child(ep)
		lbl_emp_names.append(en)
		lbl_emp_titles.append(et)
		lbl_emp_progress.append(ep)

func _process(delta: float) -> void:
	displayed_gold = lerpf(displayed_gold, float(GameManager.gold), minf(1.0, delta * 9.0))
	if absf(displayed_gold - float(GameManager.gold)) < 0.6:
		displayed_gold = float(GameManager.gold)

	if offline_banner_timer > 0.0:
		offline_banner_timer = maxf(0.0, offline_banner_timer - delta)

	var mpos := get_local_mouse_position()
	var hover_zone := _get_interactive_zone()
	is_mouse_over_hud = hover_zone.has_point(mpos)

	if boss_stealth_mode:
		is_collapsed_capsule = true
		drawer_expanded = false
		drawer_anim_t = 0.0
		hud_opacity = 0.25
	elif force_pin_open:
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

	if not force_pin_open and not boss_stealth_mode:
		drawer_anim_t = lerpf(drawer_anim_t, 1.0 if drawer_expanded else 0.0, minf(1.0, delta * 10.0))
	var win_alpha: float = WindowController.get_window_opacity() if WindowController != null else 1.0
	modulate.a = (0.25 if boss_stealth_mode else hud_opacity) * win_alpha

	hovered_tab = -1
	hovered_card = -1
	hovered_emp_card = -1
	if not is_collapsed_capsule:
		for i in range(TAB_COUNT):
			if _get_tab_button_rect(i).has_point(mpos):
				hovered_tab = i
				break
		if drawer_expanded:
			var cards := _get_current_tab_cards()
			for i in range(cards.size()):
				if _get_card_rect(i, cards.size()).has_point(mpos):
					hovered_card = i
					break
			if active_tab == 3:
				for i in range(EconomyConfig.ANIMAL_ORDER.size()):
					if _get_emp_card_rect(i).has_point(mpos):
						hovered_emp_card = i
						break

	if (hovered_tab != -1 and hovered_tab != prev_hovered_tab) or (hovered_card != -1 and hovered_card != prev_hovered_card) or (hovered_emp_card != -1 and hovered_emp_card != prev_hovered_emp_card):
		if SoundManager != null:
			SoundManager.play_hover_sfx()
	prev_hovered_tab = hovered_tab
	prev_hovered_card = hovered_card
	prev_hovered_emp_card = hovered_emp_card

	_sync_label_nodes()
	queue_redraw()

func _sync_label_nodes() -> void:
	var amber_cnt := GameManager.get_amber() if GameManager != null else 0
	var voucher_cnt := GameManager.get_rare_vouchers() if GameManager != null else 0
	var star_rep := GameManager.get_star_reputation() if GameManager != null else 1
	var g_val := int(round(displayed_gold))
	var g_txt := ("%.1fkG" % (float(g_val) / 1000.0)) if g_val >= 10000 else (str(g_val) + "G")
	var v_seg := ("券" + str(voucher_cnt)) if voucher_cnt > 0 else ""
	var gold_str := g_txt + "·珀" + str(amber_cnt) + v_seg + "·★" + str(star_rep)
	lbl_bar_gold.scale = Vector2(0.76, 0.82) if voucher_cnt > 0 else Vector2(0.84, 0.86)
	var mute_lbl := "[静音]" if (SoundManager != null and SoundManager.is_muted) else "[音效]"
	var weather_names := ["晴昼", "黄昏", "夜市", "微雨"]
	var cur_w_name: String = weather_names[clampi(GameManager.current_weather, 0, 3)]
	if GameManager != null and GameManager.is_moon_tea_gathering_active():
		cur_w_name = "画舫茶"
	elif GameManager != null and GameManager.is_gourmet_parade_active():
		cur_w_name = "花车节"
	elif GameManager != null and GameManager.is_lantern_festival_active():
		cur_w_name = "花火夜"
	elif GameManager != null and GameManager.is_gourmet_acclaim_active():
		cur_w_name = "口碑" + cur_w_name
	var solar_info: Dictionary = GameManager.get_current_solar_term() if GameManager != null else {"name": "春分", "buff_tag": "春生·农田+15%"}
	var solar_name := String(solar_info.get("name", "春分"))

	var contract: Dictionary = GameManager.get_active_contract() if GameManager != null else {}
	var c_target: String = String(contract.get("target_name", "作物"))
	var c_cur: int = int(contract.get("current_count", 0))
	var c_req: int = int(contract.get("required_count", 5))
	var c_amb: int = int(contract.get("reward_amber", 2))

	lbl_offline.visible = (offline_banner_timer > 0.0 and not boss_stealth_mode)
	lbl_offline.text = offline_banner_text

	lbl_capsule_gold.visible = is_collapsed_capsule
	lbl_capsule_info.visible = is_collapsed_capsule
	lbl_capsule_mute.visible = is_collapsed_capsule
	if is_collapsed_capsule:
		lbl_capsule_gold.text = gold_str
		if boss_stealth_mode:
			lbl_capsule_info.text = "后台挂机产金中 · 按F9或点击恢复"
			lbl_capsule_mute.text = "[恢复]"
		else:
			var p_prefix := ("专注" + GameManager.get_pomodoro_formatted_time() + " · ") if (GameManager != null and GameManager.pomodoro_active) else ""
			lbl_capsule_info.text = p_prefix + "契约:" + c_target + str(c_cur) + "/" + str(c_req) + " · 悬停展开"
			lbl_capsule_mute.text = mute_lbl

	var show_bar := not is_collapsed_capsule
	lbl_bar_gold.visible = show_bar
	lbl_bar_pipeline.visible = show_bar
	lbl_bar_stall.visible = show_bar
	lbl_bar_pomodoro.visible = show_bar
	lbl_bar_gold.text = gold_str
	lbl_bar_pipeline.text = "契约:" + c_target + " " + str(c_cur) + "/" + str(c_req) + "(+" + str(c_amb) + "珀)"
	if lbl_bar_pipeline.label_settings != null:
		lbl_bar_pipeline.label_settings.font_color = Color("#FFE066") if (c_req > 0 and c_cur * 5 >= c_req * 4) else Color("#FFF4D6")
	var codex_pct := GameManager.get_unlocked_codex_count() * 10
	lbl_bar_stall.text = "存" + str(GameManager.get_island_basket_total(1)) + " · 摊" + str(GameManager.get_total_stall_count()) + "/" + str(GameManager.get_stall_max_capacity()) + " · 图鉴+" + str(codex_pct) + "%"
	if GameManager != null and GameManager.pomodoro_active:
		lbl_bar_pomodoro.text = GameManager.get_pomodoro_formatted_time()
		if lbl_bar_pomodoro.label_settings != null:
			lbl_bar_pomodoro.label_settings.font_color = Color("#8CE99A")
	else:
		lbl_bar_pomodoro.text = "[专注25m]"
		if lbl_bar_pomodoro.label_settings != null:
			lbl_bar_pomodoro.label_settings.font_color = Color("#FFE066")

	var show_drawer := show_bar and drawer_expanded
	var tab_names := [
		EconomyConfig.tr_key("tab_build"),
		EconomyConfig.tr_key("tab_animal"),
		EconomyConfig.tr_key("tab_expand"),
		EconomyConfig.tr_key("tab_codex"),
		(EconomyConfig.tr_key("tab_companion") if GameManager.desktop_companion_mode else EconomyConfig.tr_key("tab_window"))
	]
	for i in range(TAB_COUNT):
		var is_cur_tab := show_drawer and i == active_tab
		lbl_tabs[i].visible = show_bar
		lbl_tabs[i].text = ("★" + tab_names[i]) if is_cur_tab else tab_names[i]
		lbl_tabs[i].scale = Vector2(0.96, 0.96) if is_cur_tab else Vector2(0.92, 0.92)
		if lbl_tabs[i].label_settings != null:
			lbl_tabs[i].label_settings.font_color = Color("#FFF9DB") if is_cur_tab else Color("#FFE066")

	var slide_y := lerpf(40.0, 0.0, drawer_anim_t)
	var top_dy := _get_top_btn_offset() + slide_y
	lbl_drawer_title.visible = show_drawer
	lbl_drawer_lang.visible = show_drawer
	lbl_drawer_noise.visible = show_drawer
	lbl_drawer_fps.visible = show_drawer
	lbl_drawer_opacity.visible = show_drawer
	lbl_drawer_dock.visible = show_drawer
	lbl_drawer_weather.visible = show_drawer
	lbl_drawer_mute.visible = show_drawer
	if show_drawer:
		var codex_cnt := GameManager.get_unlocked_codex_count()
		var solar_cnt := GameManager.get_unlocked_solar_dish_count()
		var flora_cnt := GameManager.get_unlocked_flora_count()
		var souv_cnt := GameManager.get_unlocked_souvenir_count()
		var bath_cnt := GameManager.get_unlocked_bath_count()
		var bakery_cnt := GameManager.get_unlocked_bakery_count()
		var tea_cnt := GameManager.get_unlocked_tea_count()
		var medal_sum := EconomyConfig.get_total_honor_medals_unlocked(GameManager.animal_levels)
		var titles := [
			EconomyConfig.tr_key("drawer_build"),
			EconomyConfig.tr_key("drawer_animal"),
			EconomyConfig.tr_key("drawer_expand"),
			EconomyConfig.tr_key("drawer_codex_ci8") % [codex_cnt, solar_cnt, solar_name, flora_cnt, souv_cnt, bath_cnt, bakery_cnt, tea_cnt, int(medal_sum["unlocked"]), int(medal_sum["total"])]
		]
		lbl_drawer_title.text = titles[clampi(active_tab, 0, 3)]
		lbl_drawer_title.scale = Vector2(0.55, 0.78) if active_tab == 3 else Vector2(0.80, 0.86)
		lbl_drawer_title.position = Vector2(536.0, 129.0 + top_dy)

		var cur_fps: int = WindowController.get_eco_fps() if WindowController != null else 60
		var cur_op: float = WindowController.get_window_opacity() if WindowController != null else 1.0
		lbl_drawer_lang.text = EconomyConfig.tr_key("lang_badge")
		lbl_drawer_lang.position = Vector2(TOP_RIGHT_LANG_RECT.position.x + 6.0, TOP_RIGHT_LANG_RECT.position.y + 2.0 + top_dy)
		var noise_txt := SoundManager.get_white_noise_status_label() if SoundManager != null else "[白噪:关]"
		lbl_drawer_noise.text = noise_txt
		lbl_drawer_noise.position = Vector2(TOP_RIGHT_NOISE_RECT.position.x + 4.0, TOP_RIGHT_NOISE_RECT.position.y + 2.0 + top_dy)
		if lbl_drawer_noise.label_settings != null:
			lbl_drawer_noise.label_settings.font_color = Color("#8CE99A") if not noise_txt.contains("关") else Color("#FFE066")
		lbl_drawer_fps.text = "[" + str(cur_fps) + "FPS]"
		lbl_drawer_fps.position = Vector2(TOP_RIGHT_FPS_RECT.position.x + 4.0, TOP_RIGHT_FPS_RECT.position.y + 2.0 + top_dy)
		if lbl_drawer_fps.label_settings != null:
			lbl_drawer_fps.label_settings.font_color = Color("#8CE99A") if cur_fps <= 30 else Color("#FFE066")
		lbl_drawer_opacity.text = "[" + str(int(round(cur_op * 100.0))) + "%透]"
		lbl_drawer_opacity.position = Vector2(TOP_RIGHT_OPACITY_RECT.position.x + 4.0, TOP_RIGHT_OPACITY_RECT.position.y + 2.0 + top_dy)
		if lbl_drawer_opacity.label_settings != null:
			lbl_drawer_opacity.label_settings.font_color = Color("#8CE99A") if cur_op < 0.99 else Color("#FFE066")
		lbl_drawer_dock.text = "[贴合任务栏]"
		lbl_drawer_dock.position = Vector2(TOP_RIGHT_DOCK_RECT.position.x + 4.0, TOP_RIGHT_DOCK_RECT.position.y + 2.0 + top_dy)

		lbl_drawer_weather.text = "[" + solar_name + "·" + cur_w_name + "]"
		lbl_drawer_weather.position = Vector2(TOP_RIGHT_WEATHER_RECT.position.x + 4.0, TOP_RIGHT_WEATHER_RECT.position.y + 3.0 + top_dy)
		lbl_drawer_mute.text = mute_lbl
		lbl_drawer_mute.position = Vector2(TOP_RIGHT_MUTE_RECT.position.x + 4.0, TOP_RIGHT_MUTE_RECT.position.y + 2.0 + top_dy)
		if lbl_drawer_mute.label_settings != null:
			lbl_drawer_mute.label_settings.font_color = Color("#FFA8A8") if (SoundManager != null and SoundManager.is_muted) else Color("#FFF4D6")

	var cards: Array[Dictionary] = []
	if show_drawer:
		cards = _get_current_tab_cards()
	for i in range(lbl_card_titles.size()):
		var vis := show_drawer and (i < cards.size())
		lbl_card_titles[i].visible = vis
		lbl_card_subs[i].visible = vis
		lbl_card_costs[i].visible = vis
		if vis:
			var crect := _get_card_rect(i, cards.size())
			crect.position.y += slide_y
			var cdata: Dictionary = cards[i]
			var is_dense := cards.size() >= 5
			var is_six := cards.size() == 6
			var is_seven := cards.size() == 7
			var is_eight := cards.size() == 8
			var is_nine := cards.size() == 9
			var is_ten := cards.size() >= 10
			var title_sc := Vector2(0.95, 0.95)
			var sub_sc := Vector2(0.85, 0.85)
			var cost_sc := Vector2(0.90, 0.90)
			if is_ten:
				title_sc = Vector2(0.46, 0.65) if active_tab == 3 else Vector2(0.48, 0.67)
				sub_sc = Vector2(0.42, 0.60) if active_tab == 3 else Vector2(0.45, 0.63)
				cost_sc = Vector2(0.45, 0.62) if active_tab == 3 else Vector2(0.47, 0.65)
			elif is_nine:
				title_sc = Vector2(0.52, 0.68) if active_tab == 3 else Vector2(0.55, 0.70)
				sub_sc = Vector2(0.48, 0.64) if active_tab == 3 else Vector2(0.50, 0.66)
				cost_sc = Vector2(0.51, 0.66) if active_tab == 3 else Vector2(0.53, 0.68)
			elif is_eight:
				title_sc = Vector2(0.57, 0.70) if active_tab == 3 else Vector2(0.60, 0.72)
				sub_sc = Vector2(0.52, 0.64) if active_tab == 3 else Vector2(0.55, 0.68)
				cost_sc = Vector2(0.56, 0.68) if active_tab == 3 else Vector2(0.58, 0.70)
			elif is_seven:
				title_sc = Vector2(0.64, 0.74) if active_tab == 3 else Vector2(0.68, 0.76)
				sub_sc = Vector2(0.58, 0.68) if active_tab == 3 else Vector2(0.63, 0.72)
				cost_sc = Vector2(0.65, 0.72) if active_tab == 3 else Vector2(0.66, 0.74)
			elif active_tab == 3:
				title_sc = Vector2(0.76, 0.76)
				sub_sc = Vector2(0.70, 0.70)
				cost_sc = Vector2(0.74, 0.74)
			elif is_six:
				title_sc = Vector2(0.80, 0.80)
				sub_sc = Vector2(0.72, 0.72)
				cost_sc = Vector2(0.76, 0.76)
			elif is_dense:
				title_sc = Vector2(0.88, 0.88)
				sub_sc = Vector2(0.78, 0.78)
				cost_sc = Vector2(0.82, 0.82)
			lbl_card_titles[i].scale = title_sc
			lbl_card_subs[i].scale = sub_sc
			lbl_card_costs[i].scale = cost_sc
			var pad_x := 3.0 if is_ten else (3.5 if is_nine else (4.0 if is_eight else (5.0 if is_seven else 6.0)))
			lbl_card_titles[i].text = String(cdata["title"])
			lbl_card_titles[i].position = crect.position + Vector2(pad_x, 3.0 if active_tab == 3 else 4.0)
			lbl_card_subs[i].text = String(cdata["sub"])
			lbl_card_subs[i].position = crect.position + Vector2(pad_x, 19.0 if active_tab == 3 else 22.0)
			lbl_card_costs[i].text = String(cdata["cost"])
			lbl_card_costs[i].position = crect.position + Vector2(pad_x, 34.0 if active_tab == 3 else 38.0)
			if lbl_card_costs[i].label_settings != null:
				var cstate := String(cdata.get("cost_state", "normal"))
				match cstate:
					"affordable":
						lbl_card_costs[i].label_settings.font_color = Color("#8CE99A")
					"unlocked":
						lbl_card_costs[i].label_settings.font_color = Color("#FFE066")
					"short":
						lbl_card_costs[i].label_settings.font_color = Color("#FFA8A8")
					"locked":
						lbl_card_costs[i].label_settings.font_color = Color("#CBD5E1")
					_:
						lbl_card_costs[i].label_settings.font_color = Color("#FFF4D6")

	var show_emp_codex := show_drawer and active_tab == 3
	for i in range(6):
		var emp_vis := show_emp_codex and i < EconomyConfig.ANIMAL_ORDER.size()
		if i < lbl_emp_names.size():
			lbl_emp_names[i].visible = emp_vis
		if i < lbl_emp_titles.size():
			lbl_emp_titles[i].visible = emp_vis
		if i < lbl_emp_progress.size():
			lbl_emp_progress[i].visible = emp_vis
		if emp_vis:
			var ak := EconomyConfig.ANIMAL_ORDER[i]
			var lv := int(GameManager.animal_levels.get(ak, 0))
			var info := EconomyConfig.get_animal_promotion_info(ak, lv)
			var tier := int(info["tier"])
			var erect := _get_emp_card_rect(i)
			erect.position.y += slide_y
			lbl_emp_names[i].text = String(info["short_name"]) + (" Lv." + str(lv) if lv > 0 else " (未招募)")
			lbl_emp_names[i].position = erect.position + Vector2(6.0, 3.0)
			if lbl_emp_names[i].label_settings != null:
				lbl_emp_names[i].label_settings.font_color = Color("#FFE066") if lv > 0 else Color("#CBD5E1")

			lbl_emp_titles[i].text = String(info["tier_title"])
			lbl_emp_titles[i].position = erect.position + Vector2(6.0, 20.0)
			if lbl_emp_titles[i].label_settings != null:
				match tier:
					3:
						lbl_emp_titles[i].label_settings.font_color = Color("#FFD43B")
					2:
						lbl_emp_titles[i].label_settings.font_color = Color("#8CE99A")
					1:
						lbl_emp_titles[i].label_settings.font_color = Color("#74C0FC")
					_:
						lbl_emp_titles[i].label_settings.font_color = Color("#CBD5E1")

			lbl_emp_progress[i].text = EconomyConfig.tr_key("medal_prog") % [int(info["medals_unlocked"]), int(info["medals_total"])]
			lbl_emp_progress[i].position = erect.position + Vector2(56.0, 38.0)
			if lbl_emp_progress[i].label_settings != null:
				lbl_emp_progress[i].label_settings.font_color = Color("#FFE066") if tier >= 3 else (Color("#8CE99A") if tier >= 1 else Color("#CBD5E1"))

func _get_drawer_rect() -> Rect2:
	return CODEX_DRAWER_RECT if active_tab == 3 else DRAWER_RECT

func _get_top_btn_offset() -> float:
	return _get_drawer_rect().position.y - DRAWER_RECT.position.y

func _get_top_rect(base_rect: Rect2, slide_y: float = 0.0) -> Rect2:
	return Rect2(base_rect.position.x, base_rect.position.y + _get_top_btn_offset() + slide_y, base_rect.size.x, base_rect.size.y)

func _get_emp_card_rect(idx: int) -> Rect2:
	return Rect2(538.0 + float(idx) * 140.0, 159.0, 132.0, 60.0)

func _get_interactive_zone() -> Rect2:
	if drawer_expanded:
		if active_tab == 3:
			return Rect2(476.0, 62.0, 968.0, 230.0)
		return Rect2(476.0, 118.0, 968.0, 174.0)
	if is_collapsed_capsule:
		return CAPSULE_RECT.grow(8.0)
	return FULL_BAR_RECT.grow(6.0)

func get_hud_Hit_rect() -> Rect2:
	return _get_interactive_zone()

func get_active_drawer_rect() -> Rect2:
	return _get_drawer_rect() if drawer_expanded else Rect2()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var mpos: Vector2 = event.position
		if event.pressed:
			is_pressing_btn = true
			if Input.is_key_pressed(KEY_ALT) and WindowController != null:
				WindowController.begin_window_drag()
				accept_event()
				return
			var hitting_top_btns := (drawer_expanded and (_get_top_rect(TOP_RIGHT_LANG_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_NOISE_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_MUTE_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_WEATHER_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_FPS_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_OPACITY_RECT).has_point(mpos) or _get_top_rect(TOP_RIGHT_DOCK_RECT).has_point(mpos))) or (is_collapsed_capsule and CAPSULE_MUTE_RECT.has_point(mpos)) or (not is_collapsed_capsule and POMODORO_RECT.has_point(mpos))
			if hovered_tab == -1 and hovered_card == -1 and hovered_emp_card == -1 and not hitting_top_btns and _get_interactive_zone().has_point(mpos):
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

			if boss_stealth_mode and CAPSULE_RECT.has_point(mpos):
				if WindowController != null:
					WindowController.toggle_boss_stealth()
				else:
					set_boss_stealth(false)
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_LANG_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				EconomyConfig.cycle_language()
				_sync_label_nodes()
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_NOISE_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.toggle_white_noise()
				_sync_label_nodes()
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_FPS_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if WindowController != null:
					WindowController.toggle_eco_fps()
				_sync_label_nodes()
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_OPACITY_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if WindowController != null:
					WindowController.cycle_window_opacity()
				_sync_label_nodes()
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_DOCK_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if WindowController != null:
					WindowController.snap_to_taskbar()
				_sync_label_nodes()
				accept_event()
				return

			if drawer_expanded and _get_top_rect(TOP_RIGHT_WEATHER_RECT).has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				var next_w := (GameManager.current_weather + 1) % 4
				GameManager.set_weather(next_w)
				if next_w == 0:
					GameManager.advance_solar_term()
				accept_event()
				return

			if (drawer_expanded and _get_top_rect(TOP_RIGHT_MUTE_RECT).has_point(mpos)) or (is_collapsed_capsule and CAPSULE_MUTE_RECT.has_point(mpos)):
				if SoundManager != null:
					SoundManager.toggle_mute()
				accept_event()
				return

			if not is_collapsed_capsule and POMODORO_RECT.has_point(mpos):
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if GameManager != null:
					GameManager.toggle_pomodoro()
				_sync_label_nodes()
				accept_event()
				return

			if hovered_tab >= 0:
				if SoundManager != null:
					SoundManager.play_click_sfx()
				if hovered_tab == 4:
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

			if drawer_expanded and active_tab == 3 and hovered_emp_card >= 0 and hovered_emp_card < EconomyConfig.ANIMAL_ORDER.size():
				if SoundManager != null:
					SoundManager.play_click_sfx()
				var ak := EconomyConfig.ANIMAL_ORDER[hovered_emp_card]
				var lv := int(GameManager.animal_levels.get(ak, 0))
				var info := EconomyConfig.get_animal_promotion_info(ak, lv)
				offline_banner_timer = 4.2
				offline_banner_text = "%s (%s) · 特质【%s】%s · 勋章 %d/3 (Lv.10/25/50晋升)" % [
					String(info["short_name"]),
					String(info["tier_title"]),
					String(info["trait_name"]),
					String(info["trait_desc"]),
					int(info["medals_unlocked"])
				]
				mouse_outside_timer = 0.0
				_sync_label_nodes()
				accept_event()
				return

func _toggle_companion_mode() -> void:
	GameManager.desktop_companion_mode = not GameManager.desktop_companion_mode
	drawer_expanded = not GameManager.desktop_companion_mode
	EventBus.toggle_desktop_mode.emit(GameManager.desktop_companion_mode)
	GameManager.save_game()

func _get_tab_button_rect(idx: int) -> Rect2:
	return Rect2(1050.0 + float(idx) * 74.0, 235.0, 68.0, 44.0)

func _get_card_rect(idx: int, total: int) -> Rect2:
	var w := 196.0
	var gap := 12.0
	var start_x := 548.0
	if total >= 10:
		w = 82.0
		gap = 4.0
		start_x = 528.0
	elif total == 9:
		w = 91.0
		gap = 5.0
		start_x = 530.0
	elif total == 8:
		w = 102.0
		gap = 5.0
		start_x = 534.0
	elif total == 7:
		w = 116.0
		gap = 6.0
		start_x = 536.0
	elif total == 6:
		w = 132.0
		gap = 8.0
		start_x = 538.0
	elif total == 5:
		w = 160.0
		gap = 8.0
		start_x = 542.0
	var y_pos := 100.0 if active_tab == 3 else 156.0
	var h_val := 54.0 if active_tab == 3 else 58.0
	return Rect2(start_x + float(idx) * (w + gap), y_pos, w, h_val)

func _get_current_tab_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	match active_tab:
		0:
			for b_key in ["soil_1", "mortar", "stall", "cauldron", "soil_2", "soil_3"]:
				var cfg: Dictionary = EconomyConfig.BUILDINGS[b_key]
				var req_isl := int(cfg.get("island", 1))
				var isl_on := bool(GameManager.unlocked_islands.get(req_isl, false))
				var lv := int(GameManager.building_levels.get(b_key, 1))
				var cost := EconomyConfig.calc_upgrade_cost(int(cfg["base_cost"]), lv)
				var next_ms := (int(floor(float(lv) / 25.0)) + 1) * 25
				list.append({
					"type": "building",
					"key": b_key,
					"title": String(cfg["name"]) + (" Lv." + str(lv) if isl_on else " (未解锁)"),
					"sub": ("下个2x蜕变: Lv." + str(next_ms)) if isl_on else ("需先开拓木桥解锁岛" + str(req_isl)),
					"cost": ("升级 " + str(cost) + "G") if isl_on else "待解锁岛屿",
					"cost_state": ("affordable" if GameManager.gold >= cost else "short") if isl_on else "locked"
				})
			var isl2_gh_on := bool(GameManager.unlocked_islands.get(2, false))
			if not isl2_gh_on:
				list.append({
					"type": "greenhouse_building",
					"key": "greenhouse",
					"title": "云端温室 (锁岛2)",
					"sub": "需先开拓木桥1解锁岛2",
					"cost": "待解锁岛屿",
					"cost_state": "locked"
				})
			elif not GameManager.greenhouse_unlocked:
				var gh_unlock_c := EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD
				list.append({
					"type": "greenhouse_building",
					"key": "greenhouse",
					"title": "云端温室 (待建)",
					"sub": "杂交奇花+全岛增益光环",
					"cost": "建造 " + str(gh_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= gh_unlock_c else "short"
				})
			else:
				var gh_lv := int(GameManager.building_levels.get("greenhouse", 1))
				var gh_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["greenhouse"]["base_cost"]), gh_lv)
				var f_short := "铃兰" if GameManager.active_greenhouse_flora_id == "flora_stardew_lily" else "玫瑰"
				list.append({
					"type": "greenhouse_building",
					"key": "greenhouse",
					"title": "云端温室 Lv." + str(gh_lv),
					"sub": "育" + f_short + " · 奇花存" + str(GameManager.get_total_flora_count()),
					"cost": "升级 " + str(gh_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= gh_cost else "short"
				})
			var isl3_hs_on := bool(GameManager.unlocked_islands.get(3, false))
			if not isl3_hs_on:
				list.append({
					"type": "hotspring_building",
					"key": "hotspring",
					"title": "云海汤屋 (锁岛3)",
					"sub": "需开拓木桥2解锁岛3",
					"cost": "待解锁岛屿",
					"cost_state": "locked"
				})
			elif not GameManager.hotspring_unlocked:
				var hs_unlock_c := EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD
				list.append({
					"type": "hotspring_building",
					"key": "hotspring",
					"title": "云海汤屋 (待建)",
					"sub": "熬汤回精力+引汤客",
					"cost": "建造 " + str(hs_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= hs_unlock_c else "short"
				})
			else:
				var hs_lv := int(GameManager.building_levels.get("hotspring", 1))
				var hs_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["hotspring"]["base_cost"]), hs_lv)
				var b_cfg_0: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(GameManager.active_hotspring_bath_id, {})
				var b_short_0 := String(b_cfg_0.get("short_name", "艾草汤"))
				list.append({
					"type": "hotspring_building",
					"key": "hotspring",
					"title": "云海汤屋 Lv." + str(hs_lv),
					"sub": "熬" + b_short_0 + "·汤存" + str(GameManager.get_total_bath_stock_count()),
					"cost": "升级 " + str(hs_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= hs_cost else "short"
				})
			if not isl2_gh_on:
				list.append({
					"type": "windmill_building",
					"key": "windmill",
					"title": "风车面坊 (锁岛2)",
					"sub": "需开拓木桥1解锁岛2",
					"cost": "待解锁岛屿",
					"cost_state": "locked"
				})
			elif not GameManager.windmill_unlocked:
				var wm_unlock_c := EconomyConfig.WINDMILL_UNLOCK_COST_GOLD
				list.append({
					"type": "windmill_building",
					"key": "windmill",
					"title": "风车面坊 (待建)",
					"sub": "磨麦烤包+烘焙光环",
					"cost": "建造 " + str(wm_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= wm_unlock_c else "short"
				})
			else:
				var wm_lv := int(GameManager.building_levels.get("windmill", 1))
				var wm_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["windmill"]["base_cost"]), wm_lv)
				var wb_cfg_0: Dictionary = EconomyConfig.BAKERY_ITEMS.get(GameManager.active_windmill_bread_id, {})
				var wb_short_0 := String(wb_cfg_0.get("short_name", "舒芙蕾包"))
				list.append({
					"type": "windmill_building",
					"key": "windmill",
					"title": "风车面坊 Lv." + str(wm_lv),
					"sub": "烤" + wb_short_0 + "·包" + str(GameManager.get_total_bread_stock_count()),
					"cost": "升级 " + str(wm_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= wm_cost else "short"
				})
			if not GameManager.tea_pavilion_unlocked:
				var tp_unlock_c := EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD
				list.append({
					"type": "tea_pavilion_building",
					"key": "tea_pavilion",
					"title": "茗香茶坊 (待建)",
					"sub": "制芽泡茗+清心光环",
					"cost": "建造 " + str(tp_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= tp_unlock_c else "short"
				})
			else:
				var tp_lv := int(GameManager.building_levels.get("tea_pavilion", 1))
				var tp_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["tea_pavilion"]["base_cost"]), tp_lv)
				var tp_cfg_0: Dictionary = EconomyConfig.TEA_ITEMS.get(GameManager.active_tea_recipe_id, {})
				var tp_short_0 := String(tp_cfg_0.get("short_name", "龙井茗茶"))
				list.append({
					"type": "tea_pavilion_building",
					"key": "tea_pavilion",
					"title": "茗香茶坊 Lv." + str(tp_lv),
					"sub": "沏" + tp_short_0 + "·茗" + str(GameManager.get_total_brewed_tea_stock_count()),
					"cost": "升级 " + str(tp_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= tp_cost else "short"
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
				var trait_tag := EconomyConfig.get_animal_trait_tag(a_key, lv)
				var sub_str := ""
				var act_str := ""
				var c_state := "locked"
				if max_cap <= 0:
					sub_str = "需先解锁新岛屿"
					act_str = "待解锁岛屿"
				elif next_isl > 0:
					sub_str = "编制 " + str(cur_rec) + "/" + str(max_cap) + " · " + trait_tag
					act_str = "招募 " + str(cost) + "G"
					c_state = "affordable" if GameManager.gold >= cost else "short"
				else:
					sub_str = "Lv." + str(lv) + " · " + trait_tag
					act_str = "全队进修 Lv.+1 (" + str(cost) + "G)"
					c_state = "affordable" if GameManager.gold >= cost else "short"

				list.append({
					"type": "animal",
					"key": a_key,
					"title": title_str,
					"sub": sub_str,
					"cost": act_str,
					"cost_state": c_state
				})
		2:
			var isl2_unlocked := bool(GameManager.unlocked_islands.get(2, false))
			var isl3_unlocked := bool(GameManager.unlocked_islands.get(3, false))
			list.append({
				"type": "unlock_island",
				"key": "2",
				"title": "木桥1 · 魔法密林" + (" (已通)" if isl2_unlocked else ""),
				"sub": "2x农田+12x坩埚+企鹅",
				"cost": "已解锁" if isl2_unlocked else "180G 解锁",
				"cost_state": "unlocked" if isl2_unlocked else ("affordable" if GameManager.gold >= 180 else "short")
			})
			list.append({
				"type": "unlock_island",
				"key": "3",
				"title": "木桥2 · 天空海岸" + (" (已通)" if isl3_unlocked else ""),
				"sub": "双工坊52x+★2x富豪",
				"cost": "已解锁" if isl3_unlocked else "480G 解锁",
				"cost_state": "unlocked" if isl3_unlocked else ("affordable" if GameManager.gold >= 480 else "short")
			})
			for lk in ["bee_hive", "wind_chime", "tiki_torch"]:
				var cfg: Dictionary = EconomyConfig.ISLAND_LANDSCAPES[lk]
				var isl := int(cfg.get("island", 1))
				var isl_open := bool(GameManager.unlocked_islands.get(isl, false))
				var is_unlocked := GameManager.is_landscape_unlocked(lk)
				var cost_amb := int(cfg.get("cost_amber", 3))
				list.append({
					"type": "landscape",
					"key": lk,
					"title": String(cfg.get("name", lk)) + (" (已点亮)" if is_unlocked else " (未建造)"),
					"sub": String(cfg.get("desc", "")) if isl_open else ("需先解锁岛屿" + str(isl)),
					"cost": "已点亮生效" if is_unlocked else (str(cost_amb) + " 琥珀 解锁" if isl_open else "待解锁岛屿"),
					"cost_state": "unlocked" if is_unlocked else (("affordable" if GameManager.get_amber() >= cost_amb else "short") if isl_open else "locked")
				})
			var asum := GameManager.get_airship_order_progress_summary()
			var ord_idx := int(GameManager.get_active_airship_order().get("order_index", 1))
			if GameManager.airship_docked:
				list.append({
					"type": "airship_order",
					"key": "bulk_order",
					"title": "★远洋大订单 #" + str(ord_idx),
					"sub": String(asum["brief"]),
					"cost": "装船 +" + str(asum["reward_amber"]) + "珀+" + str(asum["reward_vouchers"]) + "图鉴券",
					"cost_state": "affordable"
				})
			else:
				list.append({
					"type": "airship_order",
					"key": "bulk_order",
					"title": "★远洋商队航行中",
					"sub": "备齐四时料理待抵港",
					"cost": "约 " + str(int(ceili(GameManager.airship_timer))) + "s 后抵港",
					"cost_state": "locked"
				})
			var box_stock_cnt := GameManager.get_total_souvenir_box_count()
			var flo_stock_cnt := GameManager.get_total_flora_count()
			if not GameManager.greenhouse_unlocked:
				list.append({
					"type": "souvenir_workshop",
					"key": "souvenir_box",
					"title": "★名物伴手礼坊",
					"sub": "奇花+名菜引收藏家",
					"cost": (str(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD) + "G 建温室") if isl2_unlocked else "需先解锁岛2",
					"cost_state": ("affordable" if GameManager.gold >= EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD else "short") if isl2_unlocked else "locked"
				})
			else:
				list.append({
					"type": "souvenir_workshop",
					"key": "souvenir_box",
					"title": "★名物礼盒(存" + str(box_stock_cnt) + ")",
					"sub": "奇花x" + str(flo_stock_cnt) + "·已售" + str(GameManager.souvenirs_sold_count) + "盒",
					"cost": "打包礼盒(+珀+声望)",
					"cost_state": "affordable" if flo_stock_cnt > 0 else ("unlocked" if box_stock_cnt > 0 else "normal")
				})
			var bath_stock_cnt := GameManager.get_total_bath_stock_count()
			var eff_pct_2 := maxi(0, int(round((GameManager.get_worker_hotspring_move_multiplier() - 1.0) * 100.0)))
			if not GameManager.hotspring_unlocked:
				list.append({
					"type": "hotspring_brew",
					"key": "hotspring_bath",
					"title": "★云海温泉汤屋",
					"sub": "草本花汤·引贵宾汤客",
					"cost": (str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G 建汤屋") if isl3_unlocked else "需先解锁岛3",
					"cost_state": ("affordable" if GameManager.gold >= EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD else "short") if isl3_unlocked else "locked"
				})
			else:
				list.append({
					"type": "hotspring_brew",
					"key": "hotspring_bath",
					"title": "★温泉汤屋(汤" + str(bath_stock_cnt) + ")",
					"sub": "精力+" + str(eff_pct_2) + "%·客" + str(GameManager.hotspring_guests_served),
					"cost": "调制浴汤(+珀+小费)",
					"cost_state": "affordable" if bath_stock_cnt <= 2 else "unlocked"
				})
			var bread_stock_cnt := GameManager.get_total_bread_stock_count()
			var aura_pct_2 := maxi(0, int(round((GameManager.get_bakery_aura_speed_multiplier() - 1.0) * 100.0)))
			if not GameManager.windmill_unlocked:
				list.append({
					"type": "windmill_parade",
					"key": "gourmet_parade",
					"title": "★风车烘焙面坊",
					"sub": "磨粉烤包·花车巡游",
					"cost": (str(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD) + "G 建面坊") if isl2_unlocked else "需先解锁岛2",
					"cost_state": ("affordable" if GameManager.gold >= EconomyConfig.WINDMILL_UNLOCK_COST_GOLD else "short") if isl2_unlocked else "locked"
				})
			elif GameManager.is_gourmet_parade_active():
				list.append({
					"type": "windmill_parade",
					"key": "gourmet_parade",
					"title": "★花车巡游(" + str(int(ceili(GameManager.parade_festival_timer))) + "s)",
					"sub": "包x" + str(bread_stock_cnt) + "·溢价1.88x",
					"cost": "出炉烤包(+珀+券)",
					"cost_state": "unlocked"
				})
			else:
				list.append({
					"type": "windmill_parade",
					"key": "gourmet_parade",
					"title": "★烘焙面坊(包" + str(bread_stock_cnt) + ")",
					"sub": "光环+" + str(aura_pct_2) + "%·客" + str(GameManager.parade_tourists_served),
					"cost": "开启花车巡游节!",
					"cost_state": "affordable"
				})
			var tea_stock_cnt := GameManager.get_total_brewed_tea_stock_count()
			var tea_eff_pct_2 := maxi(0, int(round((GameManager.get_tea_aura_worker_move_multiplier() - 1.0) * 100.0)))
			if not GameManager.tea_pavilion_unlocked:
				list.append({
					"type": "tea_moon_gathering",
					"key": "moon_tea_gathering",
					"title": "★茗香画舫茶会",
					"sub": "龙井乌龙·荷塘画舫",
					"cost": str(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD) + "G 建茶坊",
					"cost_state": "affordable" if GameManager.gold >= EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD else "short"
				})
			elif GameManager.is_moon_tea_gathering_active():
				list.append({
					"type": "tea_moon_gathering",
					"key": "moon_tea_gathering",
					"title": "★画舫雅集(" + str(int(ceili(GameManager.moon_tea_gathering_timer))) + "s)",
					"sub": "茗x" + str(tea_stock_cnt) + "·茶肴1.38x",
					"cost": "沏茶领赏(+珀+券)",
					"cost_state": "unlocked"
				})
			else:
				list.append({
					"type": "tea_moon_gathering",
					"key": "moon_tea_gathering",
					"title": "★茗香茶坊(茗" + str(tea_stock_cnt) + ")",
					"sub": "清心+" + str(tea_eff_pct_2) + "%·客" + str(GameManager.tea_connoisseurs_served),
					"cost": "开启月色画舫雅集!",
					"cost_state": "affordable"
				})
		3:
			# Direction 4: Mountain & Sea Collection Codex (4 Tiers pairing Crop + Delicacy)
			var codex_pairs := [
				{"idx": 0, "crop": "crop_0", "del": "delicacy_0", "tier_name": "一阶·晨露田园", "c_hint": "???(初始解锁)", "d_hint": "???(研钵工坊)"},
				{"idx": 1, "crop": "crop_1", "del": "delicacy_1", "tier_name": "二阶·果香烘焙", "c_hint": "???(农田Lv.25)", "d_hint": "???(研钵Lv.25)"},
				{"idx": 2, "crop": "crop_2", "del": "delicacy_2", "tier_name": "三阶·密林星露", "c_hint": "???(解锁岛2)", "d_hint": "???(岛2坩埚)"},
				{"idx": 3, "crop": "crop_3", "del": "delicacy_3", "tier_name": "四阶·云海盛宴", "c_hint": "???(解锁岛3)", "d_hint": "???(岛3双工坊)"}
			]
			for cp in codex_pairs:
				var cid := String(cp["crop"])
				var did := String(cp["del"])
				var c_name := String(EconomyConfig.CROPS[cid]["name"]).replace("晴滩", "")
				var d_name := String(EconomyConfig.DELICACIES[did]["name"]).replace("星露荧光", "星露").replace("皇家凤梨", "凤梨")
				var c_on := bool(GameManager.unlocked_codex.get(cid, false))
				var d_on := bool(GameManager.unlocked_codex.get(did, false))
				var bonus_pct := (10 if c_on else 0) + (10 if d_on else 0)
				var codex_state := "unlocked" if bonus_pct >= 20 else ("affordable" if bonus_pct >= 10 else "locked")
				list.append({
					"type": "codex",
					"key": str(cp["idx"]),
					"title": String(cp["tier_name"]) + "(+" + str(bonus_pct) + "%)",
					"sub": (c_name if c_on else "???(待锁)") + "·" + (d_name if d_on else "???(待研)"),
					"cost": "点亮" + str((1 if c_on else 0) + (1 if d_on else 0)) + "/2·+" + str(bonus_pct) + "%",
					"cost_state": codex_state
				})
			var ach_done := GameManager.get_unlocked_achievement_count()
			var ach_tot := EconomyConfig.ACHIEVEMENTS.size()
			list.append({
				"type": "career",
				"key": "achievements",
				"title": "★成就看板(" + str(ach_done) + "/" + str(ach_tot) + ")",
				"sub": GameManager.get_career_summary_text().replace(" · ", "·"),
				"cost": "岛屿声望 ★" + str(GameManager.get_star_reputation()) + "星",
				"cost_state": "unlocked" if ach_done > 0 else "affordable"
			})
			var s_info := GameManager.get_current_solar_term()
			var s_name := String(s_info.get("name", "春分"))
			var s_dish_id := GameManager.get_current_solar_dish_id()
			var s_dish_name := EconomyConfig.get_item_display_name(s_dish_id)
			var s_cnt := GameManager.get_unlocked_solar_dish_count()
			var v_cnt := GameManager.get_rare_vouchers()
			var s_cost_txt := ("兑食谱·券x" + str(v_cnt)) if (v_cnt > 0 and s_cnt < 4) else (("兑礼遇·券x" + str(v_cnt)) if v_cnt > 0 else ("节气 " + str(s_cnt) + "/4"))
			list.append({
				"type": "solar_codex",
				"key": s_dish_id,
				"title": "★节气:" + s_name + "(" + str(s_cnt) + "/4)",
				"sub": s_dish_name + "·" + String(s_info.get("buff_tag", "")).replace("·", ""),
				"cost": s_cost_txt,
				"cost_state": "affordable" if v_cnt > 0 else ("unlocked" if s_cnt >= 4 else "normal")
			})
			var f_unl := GameManager.get_unlocked_flora_count()
			var b_unl := GameManager.get_unlocked_souvenir_count()
			var f_short := "铃兰" if GameManager.active_greenhouse_flora_id == "flora_stardew_lily" else "玫瑰"
			var b_stock := GameManager.get_total_souvenir_box_count()
			list.append({
				"type": "ci5_codex",
				"key": "flora_souvenir",
				"title": "★奇花礼盒(" + str(f_unl) + "/2·" + str(b_unl) + "/2)",
				"sub": ("育" + f_short + "·礼存" + str(b_stock) + "盒") if GameManager.greenhouse_unlocked else "建岛2温室育奇花",
				"cost": "售价+" + str(f_unl * 8 + b_unl * 10) + "%",
				"cost_state": "unlocked" if (f_unl >= 2 and b_unl >= 2) else ("affordable" if GameManager.greenhouse_unlocked else "locked")
			})
			var bath_unl := GameManager.get_unlocked_bath_count()
			var b_cfg_3: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(GameManager.active_hotspring_bath_id, {})
			var b_short_3 := String(b_cfg_3.get("short_name", "艾草汤"))
			var eff_pct_3 := maxi(0, int(round((GameManager.get_worker_hotspring_move_multiplier() - 1.0) * 100.0)))
			list.append({
				"type": "ci6_codex",
				"key": "hotspring_codex",
				"title": "★灵泉汤鉴(" + str(bath_unl) + "/3)",
				"sub": ("汤:" + b_short_3 + "·客" + str(GameManager.hotspring_guests_served)) if GameManager.hotspring_unlocked else "建岛3汤屋调药浴",
				"cost": "+" + str(bath_unl * 8) + "%价·+" + str(eff_pct_3) + "%效",
				"cost_state": "unlocked" if bath_unl >= 3 else ("affordable" if GameManager.hotspring_unlocked else "locked")
			})
			var bakery_unl := GameManager.get_unlocked_bakery_count()
			var wb_cfg_3: Dictionary = EconomyConfig.BAKERY_ITEMS.get(GameManager.active_windmill_bread_id, {})
			var wb_short_3 := String(wb_cfg_3.get("short_name", "舒芙蕾包"))
			var aura_pct_3 := maxi(0, int(round((GameManager.get_bakery_aura_speed_multiplier() - 1.0) * 100.0)))
			list.append({
				"type": "ci7_codex",
				"key": "bakery_codex",
				"title": "★云端烘焙鉴(" + str(bakery_unl) + "/3)",
				"sub": ("烤:" + wb_short_3 + "·客" + str(GameManager.parade_tourists_served)) if GameManager.windmill_unlocked else "建岛2面坊烤欧包",
				"cost": "+" + str(bakery_unl * 8) + "%价·+" + str(aura_pct_3) + "%速",
				"cost_state": "unlocked" if bakery_unl >= 3 else ("affordable" if GameManager.windmill_unlocked else "locked")
			})
			var tea_unl := GameManager.get_unlocked_tea_count()
			var tp_cfg_3: Dictionary = EconomyConfig.TEA_ITEMS.get(GameManager.active_tea_recipe_id, {})
			var tp_short_3 := String(tp_cfg_3.get("short_name", "龙井茗茶"))
			var tea_eff_3 := maxi(0, int(round((GameManager.get_tea_aura_worker_move_multiplier() - 1.0) * 100.0)))
			list.append({
				"type": "ci8_codex",
				"key": "tea_codex",
				"title": "★茗香茶韵鉴(" + str(tea_unl) + "/3)",
				"sub": ("沏:" + tp_short_3 + "·客" + str(GameManager.tea_connoisseurs_served)) if GameManager.tea_pavilion_unlocked else "建岛1茶坊沏香茗",
				"cost": "+" + str(tea_unl * 8) + "%价·+" + str(tea_eff_3) + "%效",
				"cost_state": "unlocked" if tea_unl >= 3 else ("affordable" if GameManager.tea_pavilion_unlocked else "locked")
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
	elif t == "career":
		offline_banner_timer = 4.5
		offline_banner_text = "★岛屿生涯荣誉: 已达成 " + str(GameManager.get_unlocked_achievement_count()) + "/" + str(EconomyConfig.ACHIEVEMENTS.size()) + " 项成就 · " + GameManager.get_career_summary_text()
	elif t == "codex":
		var codex_pct := GameManager.get_unlocked_codex_count() * 10
		offline_banner_timer = 4.0
		offline_banner_text = "★山海图鉴总加成: 全岛商品售价永久 +" + str(codex_pct) + "% (每解锁1种农作物或工坊美食 +10%)"
	elif t == "landscape":
		if not GameManager.unlock_landscape(k):
			var req_cost := int(EconomyConfig.ISLAND_LANDSCAPES.get(k, {}).get("cost_amber", 3))
			offline_banner_timer = 3.5
			offline_banner_text = "晨露琥珀不足 (需 " + str(req_cost) + " 琥珀)，请完成飞艇皇家订单获取!"
	elif t == "airship_order":
		if GameManager.airship_docked:
			var f_res := GameManager.fulfill_airship_bulk_order_from_stock()
			if not bool(f_res.get("completed", false)):
				var asum := GameManager.get_airship_order_progress_summary()
				offline_banner_timer = 4.2
				offline_banner_text = "★远洋飞艇装船 +" + str(int(f_res.get("loaded", 0))) + "件 · 当前进度: " + String(asum["brief"]) + " (满额领琥珀&稀有图鉴券!)"
		else:
			offline_banner_timer = 3.5
			offline_banner_text = "★浮空飞艇远洋商队正在返航途中，预计 " + str(int(ceili(GameManager.airship_timer))) + "s 后停靠东港码头!"
	elif t == "solar_codex":
		if GameManager.get_rare_vouchers() > 0:
			var r_res := GameManager.redeem_rare_voucher_for_codex()
			if bool(r_res.get("redeemed", false)):
				var u_dish := EconomyConfig.get_item_display_name(String(r_res.get("unlocked_dish", "")))
				offline_banner_timer = 4.5
				offline_banner_text = "★使用1张稀有图鉴券点亮节气限定美食【" + u_dish + "】！全岛图鉴售价永久提升!"
		else:
			var s_term := GameManager.advance_solar_term()
			offline_banner_timer = 4.0
			offline_banner_text = "★二十四节气流转至【" + String(s_term.get("name", "春分")) + "】· 当季限定【" + EconomyConfig.get_item_display_name(String(s_term.get("dish_id", ""))) + "】售价1.45x!"
	elif t == "greenhouse_building":
		if not bool(GameManager.unlocked_islands.get(2, false)):
			offline_banner_timer = 3.5
			offline_banner_text = "请先在【开拓造景】修复木桥1解锁 2 号岛【魔法密林】，即可建造云端温室!"
		elif not GameManager.greenhouse_unlocked:
			if not GameManager.unlock_greenhouse(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云端温室培育房】需要 " + str(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("greenhouse")
	elif t == "souvenir_workshop":
		if not GameManager.greenhouse_unlocked:
			if not GameManager.unlock_greenhouse(false):
				offline_banner_timer = 3.8
				offline_banner_text = "请先解锁2号岛并花费 " + str(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD) + "G 建造【云端温室培育房】培育奇花异草!"
		else:
			var b_res := GameManager.bundle_souvenir_gift_box("", true)
			if bool(b_res.get("bundled", false)):
				var b_nm := EconomyConfig.get_item_display_name(String(b_res.get("box_id", "")))
				offline_banner_timer = 4.5
				offline_banner_text = "★打包成功！制成【" + b_nm + "】x1 (库存" + str(int(b_res.get("stock", 1))) + ") · 收藏家旅客正慕名登岛选购!"
			else:
				offline_banner_timer = 4.2
				offline_banner_text = "★伴手礼打包需: 1株温室奇花 + 1份工坊/节气美食 (当前奇花x" + str(GameManager.get_total_flora_count()) + " · 礼盒库存x" + str(GameManager.get_total_souvenir_box_count()) + ")!"
	elif t == "ci5_codex":
		if GameManager.greenhouse_unlocked:
			var nf := GameManager.cycle_greenhouse_flora()
			var fcfg: Dictionary = EconomyConfig.HYBRID_FLORA.get(nf, {})
			offline_banner_timer = 4.5
			offline_banner_text = "★云端温室切换培育【" + EconomyConfig.get_item_display_name(nf) + "】(" + String(fcfg.get("aura_tag", "")) + ") · 累计售出礼盒 " + str(GameManager.souvenirs_sold_count) + " 份!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★云端温室奇花与名物伴手礼图鉴: 解锁2号岛建造温室可杂交培育奇花异草，打包名物礼盒吸引收藏家旅客!"
	elif t == "hotspring_building":
		if not bool(GameManager.unlocked_islands.get(3, false)):
			offline_banner_timer = 3.5
			offline_banner_text = "请先在【开拓造景】修复木桥2解锁 3 号岛【天空海岸】，即可建造云海温泉汤屋!"
		elif not GameManager.hotspring_unlocked:
			if not GameManager.unlock_hotspring_inn(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云海温泉汤屋】需要 " + str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("hotspring")
	elif t == "hotspring_brew":
		if not GameManager.hotspring_unlocked:
			if not GameManager.unlock_hotspring_inn(false):
				offline_banner_timer = 3.8
				offline_banner_text = "请先解锁3号岛并花费 " + str(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD) + "G 建造【云海温泉汤屋】熬制疗愈浴汤!"
		else:
			var brew_res := GameManager.brew_hotspring_bath("", false)
			if bool(brew_res.get("brewed", false)):
				var b_nm := EconomyConfig.get_item_display_name(String(brew_res.get("bath_id", "")))
				offline_banner_timer = 4.5
				offline_banner_text = "★浴汤熬制成功！调成【" + b_nm + "】x1 (库存" + str(int(brew_res.get("stock", 1))) + ") · 全员精力恢复且贵宾汤客正慕名登岛!"
			else:
				var nb := GameManager.cycle_hotspring_bath()
				offline_banner_timer = 4.2
				offline_banner_text = "★汤屋切换慢熬【" + EconomyConfig.get_item_display_name(nb) + "】· 投入岛屿鲜草与温室奇花可即时加快调制!"
	elif t == "ci6_codex":
		if GameManager.hotspring_unlocked:
			var nb3 := GameManager.cycle_hotspring_bath()
			var bcfg3: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(nb3, {})
			offline_banner_timer = 4.5
			offline_banner_text = "★云海温泉汤屋切换浴汤【" + EconomyConfig.get_item_display_name(nb3) + "】(" + String(bcfg3.get("aura_tag", "")) + ") · 已接待贵宾汤客 " + str(GameManager.hotspring_guests_served) + " 位!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★云海温泉汤屋与灵泉汤鉴: 解锁3号岛建造温泉汤屋，调制草本/花瓣浴汤恢复员工精力并接待贵宾萌宠汤客!"
	elif t == "windmill_building":
		if not bool(GameManager.unlocked_islands.get(2, false)):
			offline_banner_timer = 3.5
			offline_banner_text = "请先在【开拓造景】修复木桥1解锁 2 号岛【魔法密林】，即可建造云端风车烘焙面坊!"
		elif not GameManager.windmill_unlocked:
			if not GameManager.unlock_windmill_bakery(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云端风车烘焙面坊】需要 " + str(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("windmill")
	elif t == "windmill_parade":
		if not GameManager.windmill_unlocked:
			if not GameManager.unlock_windmill_bakery(false):
				offline_banner_timer = 3.8
				offline_banner_text = "请先解锁2号岛并花费 " + str(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD) + "G 建造【云端风车烘焙面坊】!"
		else:
			var bake_res := GameManager.bake_windmill_bread("", true)
			if not GameManager.is_gourmet_parade_active():
				GameManager.start_gourmet_parade_festival()
			elif bool(bake_res.get("baked", false)):
				var b_nm := EconomyConfig.get_item_display_name(String(bake_res.get("bread_id", "")))
				offline_banner_timer = 4.5
				offline_banner_text = "★鲜烤出炉【" + b_nm + "】x1 (包存" + str(int(bake_res.get("stock", 1))) + ") · 美食花车巡游节热卖中!"
	elif t == "ci7_codex":
		if GameManager.windmill_unlocked:
			var nb7 := GameManager.cycle_windmill_bread()
			var bcfg7: Dictionary = EconomyConfig.BAKERY_ITEMS.get(nb7, {})
			offline_banner_timer = 4.5
			offline_banner_text = "★风车烘焙面坊切换烤制【" + EconomyConfig.get_item_display_name(nb7) + "】(" + String(bcfg7.get("aura_tag", "")) + ") · 已招待巡游食客 " + str(GameManager.parade_tourists_served) + " 位!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★云端烘焙鉴: 解锁2号岛建造风车烘焙面坊，磨金麦粉烤舒芙蕾欧包与琥珀可颂，开启美食花车巡游节!"
	elif t == "tea_pavilion_building":
		if not GameManager.tea_pavilion_unlocked:
			if not GameManager.unlock_tea_pavilion(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云端茗香制茶坊】需要 " + str(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("tea_pavilion")
	elif t == "tea_moon_gathering":
		if not GameManager.tea_pavilion_unlocked:
			if not GameManager.unlock_tea_pavilion(false):
				offline_banner_timer = 3.8
				offline_banner_text = "请先花费 " + str(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD) + "G 在1号岛建造【云端茗香制茶坊】!"
		else:
			var brew_res := GameManager.brew_artisan_tea("", true)
			if not GameManager.is_moon_tea_gathering_active():
				GameManager.start_moon_tea_gathering()
			elif bool(brew_res.get("brewed", false)):
				var t_nm := EconomyConfig.get_item_display_name(String(brew_res.get("tea_id", "")))
				offline_banner_timer = 4.5
				offline_banner_text = "★新茶出汤【" + t_nm + "】x1 (茗存" + str(int(brew_res.get("stock", 1))) + ") · 荷塘月色画舫茶会 1.38x 热卖中!"
	elif t == "ci8_codex":
		if GameManager.tea_pavilion_unlocked:
			var nt8 := GameManager.cycle_tea_pavilion_recipe()
			var tcfg8: Dictionary = EconomyConfig.TEA_ITEMS.get(nt8, {})
			offline_banner_timer = 4.5
			offline_banner_text = "★云端茗香茶坊切换沏制【" + EconomyConfig.get_item_display_name(nt8) + "】(" + String(tcfg8.get("aura_tag", "")) + ") · 已招待雅集茶客 " + str(GameManager.tea_connoisseurs_served) + " 位!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★茗香茶韵鉴: 在1号岛建造云端茗香制茶坊，杀青云雾春芽、沏泡云雾龙井与桂花乌龙，开启荷塘月色画舫雅集!"

func _draw() -> void:
	if offline_banner_timer > 0.0 and not boss_stealth_mode and tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(650.0, 6.0, 620.0, 30.0), false)

	if is_collapsed_capsule:
		if tex_pill != null:
			draw_texture_rect(tex_pill, CAPSULE_RECT, false)
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(CAPSULE_RECT.position.x + 10.0, CAPSULE_RECT.position.y + 6.0, 28.0, 28.0), Rect2(0, 0, 48, 48))
		return

	if tex_panel != null:
		draw_texture_rect(tex_panel, FULL_BAR_RECT, false)

	if tex_pill != null:
		draw_texture_rect(tex_pill, Rect2(486.0, 239.0, 134.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(624.0, 239.0, 174.0, 36.0), false)
		draw_texture_rect(tex_pill, Rect2(802.0, 239.0, 146.0, 36.0), false)
		draw_texture_rect(tex_pill, POMODORO_RECT, false)

	if tex_icons != null:
		draw_texture_rect_region(tex_icons, Rect2(489.0, 244.0, 24.0, 24.0), Rect2(0, 0, 48, 48))
	if tex_crops != null:
		draw_texture_rect_region(tex_crops, Rect2(POMODORO_RECT.position.x + 4.0, POMODORO_RECT.position.y + 7.0, 20.0, 20.0), Rect2(120.0, 40.0, 40.0, 40.0))

	var icon_indices := [6, 3, 4, 2, 7]
	for i in range(TAB_COUNT):
		var bx := 1050.0 + float(i) * 74.0
		var is_active_or_hov := (hovered_tab == i or (drawer_expanded and active_tab == i))
		var lift := -2.0 if is_active_or_hov else 0.0
		var btex := tex_btn_normal
		if hovered_tab == i and is_pressing_btn and tex_btn_pressed != null:
			btex = tex_btn_pressed
		elif is_active_or_hov and tex_btn_hover != null:
			btex = tex_btn_hover
		if btex != null:
			draw_texture_rect(btex, Rect2(bx + 13.0, 226.0 + lift, 42.0, 42.0), false)
		if tex_icons != null:
			draw_texture_rect_region(tex_icons, Rect2(bx + 16.0, 229.0 + lift, 36.0, 36.0), Rect2(float(icon_indices[i] * 48), 0.0, 48.0, 48.0))

	if drawer_expanded and tex_drawer != null:
		var slide_y := lerpf(40.0, 0.0, drawer_anim_t)
		var base_drect := _get_drawer_rect()
		var d_rect := Rect2(base_drect.position.x, base_drect.position.y + slide_y, base_drect.size.x, base_drect.size.y)
		draw_texture_rect(tex_drawer, d_rect, false)

		var lang_rect := _get_top_rect(TOP_RIGHT_LANG_RECT, slide_y)
		var noise_rect := _get_top_rect(TOP_RIGHT_NOISE_RECT, slide_y)
		var fps_rect := _get_top_rect(TOP_RIGHT_FPS_RECT, slide_y)
		var op_rect := _get_top_rect(TOP_RIGHT_OPACITY_RECT, slide_y)
		var dock_rect := _get_top_rect(TOP_RIGHT_DOCK_RECT, slide_y)
		var w_rect := _get_top_rect(TOP_RIGHT_WEATHER_RECT, slide_y)
		var m_rect := _get_top_rect(TOP_RIGHT_MUTE_RECT, slide_y)
		if tex_pill != null:
			draw_texture_rect(tex_pill, lang_rect, false)
			draw_texture_rect(tex_pill, noise_rect, false)
			draw_texture_rect(tex_pill, fps_rect, false)
			draw_texture_rect(tex_pill, op_rect, false)
			draw_texture_rect(tex_pill, dock_rect, false)
			draw_texture_rect(tex_pill, w_rect, false)
			draw_texture_rect(tex_pill, m_rect, false)

		var cards := _get_current_tab_cards()
		for i in range(cards.size()):
			var crect := _get_card_rect(i, cards.size())
			crect.position.y += slide_y
			var ctex := tex_card_hover if hovered_card == i else tex_card
			if ctex != null:
				draw_texture_rect(ctex, crect, false)
			var c_state := String(cards[i].get("cost_state", "neutral"))
			if c_state == "affordable":
				draw_rect(crect.grow(-1.0), Color(0.55, 0.91, 0.60, 0.46), false, 1.0)
			elif c_state == "unlocked":
				draw_rect(crect.grow(-1.0), Color(1.0, 0.88, 0.40, 0.42), false, 1.0)
			# Draw real pixel-art crop, delicacy, airship bulk order, solar dish, hybrid flora, souvenir, spa, bakery & tea icons inside cards
			var ic_sz := 11.0 if cards.size() >= 10 else (12.0 if cards.size() >= 9 else 13.0)
			var ic_x1 := crect.end.x - (24.0 if cards.size() >= 10 else (27.0 if cards.size() >= 9 else 30.0))
			var ic_x2 := crect.end.x - (12.0 if cards.size() >= 10 else (14.0 if cards.size() >= 9 else 16.0))
			if active_tab == 0 and i == 7:
				var hs_bid_0 := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(hs_bid_0):
					reload_ci6_textures()
				var hs_ic_0: Texture2D = tex_bath_icons.get(hs_bid_0, tex_bath_icons.get("bath_mugwort_warm", null))
				if hs_ic_0 != null:
					draw_texture_rect(hs_ic_0, Rect2(crect.end.x - 16.0, crect.position.y + 40.0, 13.0, 13.0), false)
			elif active_tab == 0 and i == 8:
				var wm_bid_0 := GameManager.active_windmill_bread_id
				if not tex_bakery_icons.has(wm_bid_0):
					reload_ci7_textures()
				var wm_ic_0: Texture2D = tex_bakery_icons.get(wm_bid_0, tex_bakery_icons.get("bread_cloud_souffle", null))
				if wm_ic_0 != null:
					draw_texture_rect(wm_ic_0, Rect2(crect.end.x - 16.0, crect.position.y + 40.0, 13.0, 13.0), false)
			elif active_tab == 0 and i == 9:
				var tp_tid_0 := GameManager.active_tea_recipe_id
				if not tex_tea_icons.has(tp_tid_0):
					reload_ci8_textures()
				var tp_ic_0: Texture2D = tex_tea_icons.get(tp_tid_0, tex_tea_icons.get("tea_cloud_longjing", null))
				if tp_ic_0 != null:
					draw_texture_rect(tp_ic_0, Rect2(crect.end.x - 15.0, crect.position.y + 40.0, 12.0, 12.0), false)
			elif active_tab == 2 and i == 5:
				if tex_bulk_order == null:
					reload_ci4_textures()
				if tex_bulk_order != null:
					draw_texture_rect(tex_bulk_order, Rect2(crect.end.x - 17.0, crect.position.y + 39.0, 14.0, 14.0), false)
			elif active_tab == 2 and i == 6:
				var sb_icon_2: Texture2D = tex_souvenir_icons.get("souvenir_box_royal", null)
				if sb_icon_2 == null:
					reload_ci5_textures()
					sb_icon_2 = tex_souvenir_icons.get("souvenir_box_royal", null)
				if sb_icon_2 != null:
					draw_texture_rect(sb_icon_2, Rect2(crect.end.x - 17.0, crect.position.y + 39.0, 14.0, 14.0), false)
			elif active_tab == 2 and i == 7:
				var hs_bid_2 := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(hs_bid_2) or tex_vip_hotspring_guest == null:
					reload_ci6_textures()
				var hs_ic_2: Texture2D = tex_bath_icons.get(hs_bid_2, tex_bath_icons.get("bath_mugwort_warm", null))
				if hs_ic_2 != null:
					draw_texture_rect(hs_ic_2, Rect2(crect.end.x - 17.0, crect.position.y + 39.0, 14.0, 14.0), false)
			elif active_tab == 2 and i == 8:
				if tex_parade_float == null:
					reload_ci7_textures()
				if tex_parade_float != null:
					draw_texture_rect(tex_parade_float, Rect2(crect.end.x - 17.0, crect.position.y + 39.0, 14.0, 14.0), false)
			elif active_tab == 2 and i == 9:
				if tex_moon_tea_boat == null:
					reload_ci8_textures()
				if tex_moon_tea_boat != null:
					draw_texture_rect(tex_moon_tea_boat, Rect2(crect.end.x - 16.0, crect.position.y + 39.0, 13.0, 13.0), false)
			elif active_tab == 3 and i < 4:
				if tex_crops != null:
					draw_texture_rect_region(tex_crops, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), Rect2(3.0 * 40.0, float(i) * 40.0, 40.0, 40.0))
				if tex_delicacies != null:
					draw_texture_rect_region(tex_delicacies, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), Rect2(float(i) * 36.0, 0.0, 36.0, 36.0))
			elif active_tab == 3 and i == 5:
				var cur_sd := GameManager.get_current_solar_dish_id()
				if not tex_solar_dishes.has(cur_sd) or tex_solar_dishes[cur_sd] == null or tex_rare_voucher == null:
					reload_ci4_textures()
				var sd_icon: Texture2D = tex_solar_dishes.get(cur_sd, null)
				if sd_icon != null:
					draw_texture_rect(sd_icon, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), false)
				if tex_rare_voucher != null:
					draw_texture_rect(tex_rare_voucher, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 6:
				var cur_fl := GameManager.active_greenhouse_flora_id
				if not tex_flora_icons.has(cur_fl) or not tex_souvenir_icons.has("souvenir_box_floral"):
					reload_ci5_textures()
				var fl_icon: Texture2D = tex_flora_icons.get(cur_fl, tex_flora_icons.get("flora_stardew_lily", null))
				var bx_id := "souvenir_box_royal" if bool(GameManager.unlocked_souvenirs.get("souvenir_box_royal", false)) else "souvenir_box_floral"
				var bx_icon: Texture2D = tex_souvenir_icons.get(bx_id, null)
				if fl_icon != null:
					draw_texture_rect(fl_icon, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), false)
				if bx_icon != null:
					draw_texture_rect(bx_icon, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 7:
				var cur_bath := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(cur_bath) or tex_vip_hotspring_guest == null:
					reload_ci6_textures()
				var bath_icon: Texture2D = tex_bath_icons.get(cur_bath, tex_bath_icons.get("bath_mugwort_warm", null))
				if bath_icon != null:
					draw_texture_rect(bath_icon, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), false)
				if tex_vip_hotspring_guest != null:
					draw_texture_rect(tex_vip_hotspring_guest, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 8:
				var cur_bread := GameManager.active_windmill_bread_id
				if not tex_bakery_icons.has(cur_bread) or tex_parade_float == null:
					reload_ci7_textures()
				var bread_icon: Texture2D = tex_bakery_icons.get(cur_bread, tex_bakery_icons.get("bread_cloud_souffle", null))
				if bread_icon != null:
					draw_texture_rect(bread_icon, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), false)
				if tex_parade_float != null:
					draw_texture_rect(tex_parade_float, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 9:
				var cur_tea := GameManager.active_tea_recipe_id
				if not tex_tea_icons.has(cur_tea) or tex_moon_tea_boat == null:
					reload_ci8_textures()
				var tea_icon: Texture2D = tex_tea_icons.get(cur_tea, tex_tea_icons.get("tea_cloud_longjing", null))
				if tea_icon != null:
					draw_texture_rect(tea_icon, Rect2(ic_x1, crect.position.y + 37.0, ic_sz, ic_sz), false)
				if tex_moon_tea_boat != null:
					draw_texture_rect(tex_moon_tea_boat, Rect2(ic_x2, crect.position.y + 37.0, ic_sz, ic_sz), false)

		if active_tab == 3:
			for i in range(EconomyConfig.ANIMAL_ORDER.size()):
				var ak := EconomyConfig.ANIMAL_ORDER[i]
				var lv := int(GameManager.animal_levels.get(ak, 0))
				var tier := EconomyConfig.get_animal_trait_tier_count(lv)
				var erect := _get_emp_card_rect(i)
				erect.position.y += slide_y
				var ectex := tex_card_hover if hovered_emp_card == i else tex_card
				if ectex != null:
					draw_texture_rect(ectex, erect, false)
				if tier >= 3:
					draw_rect(erect.grow(-1.0), Color(1.0, 0.84, 0.24, 0.56), false, 1.0)
				elif tier >= 1:
					draw_rect(erect.grow(-1.0), Color(0.55, 0.91, 0.60, 0.44), false, 1.0)
				# Rank tier icon at top-right of employee card
				var rank_rect := Rect2(erect.end.x - 23.0, erect.position.y + 3.0, 18.0, 18.0)
				if tier >= 1 and tier < tex_promo_tiers.size() and tex_promo_tiers[tier] != null:
					draw_texture_rect(tex_promo_tiers[tier], rank_rect, false)
				elif tex_icons != null:
					draw_texture_rect_region(tex_icons, rank_rect, Rect2(3.0 * 48.0, 0.0, 48.0, 48.0), Color(0.75, 0.72, 0.68, 0.55))
				# 3 Honor Medal slots at bottom-left of employee card
				for m_idx in range(3):
					var medal_rect := Rect2(erect.position.x + 6.0 + float(m_idx) * 16.0, erect.position.y + 39.0, 14.0, 14.0)
					var m_tex := tex_medals[m_idx] if m_idx < tex_medals.size() else null
					if m_tex != null:
						var m_mod := Color.WHITE if tier >= (m_idx + 1) else Color(0.28, 0.24, 0.22, 0.40)
						draw_texture_rect(m_tex, medal_rect, false, m_mod)
