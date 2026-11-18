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
var tex_dish_icons: Dictionary = {}
var tex_chef_medal: Texture2D
var tex_lantern_festival: Texture2D
var tex_star_lantern: Texture2D
var tex_seafood_catch: Texture2D
var tex_auction_gavel: Texture2D
var tex_rare_specialty_box: Texture2D
var tex_lighthouse_harbor: Texture2D
var tex_auction_lot_icons: Dictionary = {}
var tex_dairy_icons: Dictionary = {}
var tex_movie_ticket: Texture2D
var tex_pottery_icons: Dictionary = {}
var tex_sports_flag: Texture2D
var tex_gold_ribbon_medal: Texture2D
var tex_kite_icons: Dictionary = {}
var tex_kite_festival: Texture2D
var tex_season_decos: Dictionary = {}
## CI-14: Photo Tour + Islander Wish Board (tab 2 cards #17 / #18 -> the board panel with the 3 islander notes)
var tex_photo_tour: Texture2D
var tex_photo_card: Texture2D
var tex_photo_album: Texture2D
var tex_wish_board: Texture2D
var tex_wish_note: Texture2D
var tex_reputation_star: Texture2D
var wish_board_view: bool = false
## CI-15: Cloud-Sea Weather card #19 + Islander Birthday Party card #20 (-> the party panel), codex card 17, tab cake badge
var tex_weather_icons: Dictionary = {}
var tex_birthday_cake: Texture2D
var tex_birthday_gift: Texture2D
var tex_icon_birthday: Texture2D
var birthday_view: bool = false

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
	reload_ci9_textures()
	reload_ci10_textures()
	reload_ci11_textures()
	reload_ci12_textures()
	reload_ci13_textures()
	reload_ci14_textures()
	reload_ci15_textures()

	displayed_gold = float(GameManager.gold)
	if GameManager.pending_offline_gold > 0:
		_show_offline_welcome_banner(GameManager.pending_offline_seconds, GameManager.pending_offline_gold)
	elif GameManager.can_prepare_birthday_gift():
		# CI-15: today's birthday was announced before the HUD existed -> show its banner once at start-up (labels are built
		# below, so only the banner state is set here)
		offline_banner_timer = 6.0
		offline_banner_text = "★今天是" + EconomyConfig.get_islander_name(GameManager.birthday_today_islander) + "的生日! 开拓造景「岛民生日会」备礼 · 得声望与图鉴券"
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
		EventBus.wish_lantern_festival_started.connect(_on_wish_lantern_festival_started)
		EventBus.wish_lantern_claimed.connect(_on_wish_lantern_claimed)
		EventBus.tasting_dish_unlocked.connect(_on_tasting_dish_unlocked)
		EventBus.tasting_challenge_judged.connect(_on_tasting_challenge_judged)
		EventBus.chef_medal_awarded.connect(_on_chef_medal_awarded)
		EventBus.lighthouse_harbor_unlocked_changed.connect(_on_lighthouse_harbor_unlocked_changed)
		EventBus.island_auction_started.connect(_on_island_auction_started)
		EventBus.auction_lot_resolved.connect(_on_auction_lot_resolved)
		EventBus.island_auction_ended.connect(_on_island_auction_ended)
		EventBus.dairy_workshop_unlocked_changed.connect(_on_dairy_workshop_unlocked_changed)
		EventBus.open_air_cinema_unlocked_changed.connect(_on_open_air_cinema_unlocked_changed)
		EventBus.cinema_screening_settled.connect(_on_cinema_screening_settled)
		EventBus.cinema_medal_awarded.connect(_on_cinema_medal_awarded)
		EventBus.pottery_kiln_unlocked_changed.connect(_on_pottery_kiln_unlocked_changed)
		EventBus.sports_day_started.connect(_on_sports_day_started)
		EventBus.sports_event_settled.connect(_on_sports_event_settled)
		EventBus.sports_day_ended.connect(_on_sports_day_ended)
		EventBus.kite_festival_started.connect(_on_kite_festival_started)
		EventBus.kite_festival_ended.connect(_on_kite_festival_ended)
		EventBus.season_changed.connect(_on_season_changed)
		EventBus.photo_tour_started.connect(_on_photo_tour_started)
		EventBus.photo_taken.connect(_on_photo_taken)
		EventBus.photo_tour_ended.connect(_on_photo_tour_ended)
		EventBus.wish_fulfilled.connect(_on_wish_fulfilled)
		EventBus.sky_weather_changed.connect(_on_sky_weather_changed)
		EventBus.birthday_started.connect(_on_birthday_started)
		EventBus.birthday_gift_given.connect(_on_birthday_gift_given)

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

func reload_ci9_textures() -> void:
	tex_chef_medal = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_CHEF_MEDAL_TEX)
	tex_lantern_festival = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_LANTERN_FESTIVAL_TEX)
	tex_star_lantern = EconomyConfig.load_pixel_texture(EconomyConfig.STAR_LANTERN_TEX)
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		var d_cfg: Dictionary = EconomyConfig.TASTING_DISHES.get(td_id, {})
		var dp := String(d_cfg.get("icon_tex", ""))
		if dp != "":
			tex_dish_icons[td_id] = EconomyConfig.load_pixel_texture(dp)

func reload_ci10_textures() -> void:
	tex_seafood_catch = EconomyConfig.load_pixel_texture(EconomyConfig.SEAFOOD_CATCH_TEX)
	tex_auction_gavel = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_AUCTION_GAVEL_TEX)
	tex_rare_specialty_box = EconomyConfig.load_pixel_texture(EconomyConfig.RARE_SPECIALTY_BOX_TEX)
	tex_lighthouse_harbor = EconomyConfig.load_pixel_texture(EconomyConfig.LIGHTHOUSE_HARBOR_TEX)
	for lot_id in EconomyConfig.AUCTION_LOT_ORDER:
		var l_cfg: Dictionary = EconomyConfig.AUCTION_LOTS.get(lot_id, {})
		var lp := String(l_cfg.get("icon_tex", ""))
		if lp != "":
			tex_auction_lot_icons[lot_id] = EconomyConfig.load_pixel_texture(lp)

func reload_ci11_textures() -> void:
	tex_movie_ticket = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_MOVIE_TICKET_TEX)
	for d_id in EconomyConfig.DAIRY_CODEX_ORDER:
		var d_cfg: Dictionary = EconomyConfig.DAIRY_ITEMS.get(d_id, {})
		var dp := String(d_cfg.get("icon_tex", ""))
		if dp != "":
			tex_dairy_icons[d_id] = EconomyConfig.load_pixel_texture(dp)

func reload_ci12_textures() -> void:
	tex_sports_flag = EconomyConfig.load_pixel_texture(EconomyConfig.SPORTS_FLAG_TEX)
	tex_gold_ribbon_medal = EconomyConfig.load_pixel_texture(EconomyConfig.GOLD_RIBBON_MEDAL_TEX)
	for p_id in EconomyConfig.POTTERY_CODEX_ORDER:
		var p_cfg: Dictionary = EconomyConfig.POTTERY_ITEMS.get(p_id, {})
		var pp := String(p_cfg.get("icon_tex", ""))
		if pp != "":
			tex_pottery_icons[p_id] = EconomyConfig.load_pixel_texture(pp)

func reload_ci13_textures() -> void:
	tex_kite_festival = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_KITE_FESTIVAL_TEX)
	for k_id in EconomyConfig.KITE_ORDER:
		tex_kite_icons[k_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.KITE_TYPES[k_id]["tex"]))
	for s_id in EconomyConfig.SEASON_ORDER:
		tex_season_decos[s_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SEASONS[s_id]["tex"]))

func _on_kite_festival_started(_festival_idx: int) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★云海风筝节开幕！" + str(EconomyConfig.KITE_SLOTS.size()) + " 只像素风筝飞上西岛/东岛上空 · 点击收风筝 · " + GameManager.get_kite_wind_name() + "助力产销!"
	_sync_label_nodes()
	queue_redraw()

func _on_kite_festival_ended(collected: int, swept: bool) -> void:
	offline_banner_timer = 4.5
	offline_banner_text = ("★风筝满天！本届收下全部 " + str(collected) + " 只风筝 · 勋章 x" + str(GameManager.kite_medals)) if swept else ("★云海风筝节落幕 · 本届收下 " + str(collected) + "/" + str(EconomyConfig.KITE_SLOTS.size()) + " 只风筝 · 下届 " + str(int(EconomyConfig.KITE_COOLDOWN_SEC)) + "s 后")
	_sync_label_nodes()
	queue_redraw()

func _on_season_changed(season_id: String) -> void:
	var info: Dictionary = EconomyConfig.SEASONS.get(season_id, {})
	offline_banner_timer = 4.0
	offline_banner_text = "★岛屿换上" + String(info.get("full_name", season_id)) + "装扮【" + String(info.get("deco_name", "")) + "】· " + String(info.get("bonus_desc", "")) + " +" + str(int(round(EconomyConfig.SEASON_DECO_BONUS_PER_PROP * 100.0 * float(GameManager.get_active_season_deco_count())))) + "%"
	_sync_label_nodes()
	queue_redraw()

func reload_ci15_textures() -> void:
	tex_weather_icons.clear()
	for w_id in EconomyConfig.SKY_WEATHER_ORDER:
		tex_weather_icons[w_id] = EconomyConfig.load_pixel_texture(String(EconomyConfig.SKY_WEATHERS[w_id]["tex"]))
	tex_birthday_cake = EconomyConfig.load_pixel_texture(EconomyConfig.BIRTHDAY_CAKE_TEX)
	tex_birthday_gift = EconomyConfig.load_pixel_texture(EconomyConfig.BIRTHDAY_GIFT_TEX)
	tex_icon_birthday = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_BIRTHDAY_TEX)
	if tex_reputation_star == null:
		reload_ci14_textures()

func _weather_mult_text(sw: Dictionary) -> String:
	return "客流x%.2f 农田x%.2f 工坊x%.2f 售价x%.2f" % [float(sw["visitor"]), float(sw["crop"]), float(sw["workshop"]), float(sw["sale"])]

func _on_sky_weather_changed(weather_id: String, prev_id: String) -> void:
	if prev_id == "":
		return
	var info := EconomyConfig.get_sky_weather_info(weather_id)
	offline_banner_timer = 4.5
	offline_banner_text = "★云海天气转为【" + String(info["full_name"]) + "】" + String(info["desc"]) + " · 每 " + str(EconomyConfig.SKY_WEATHER_SLOT_MINUTES) + " 分钟一轮"
	_sync_label_nodes()
	queue_redraw()

func _on_birthday_started(islander: String, _date_key: String) -> void:
	offline_banner_timer = 6.0
	offline_banner_text = "★今天是" + EconomyConfig.get_islander_name(islander) + "的生日! 开拓造景「岛民生日会」备礼 · 得声望与图鉴券"
	_sync_label_nodes()
	queue_redraw()

func _on_birthday_gift_given(islander: String, result: Dictionary) -> void:
	var fav := String(result.get("favourite", ""))
	offline_banner_timer = 4.5
	offline_banner_text = "★" + EconomyConfig.get_islander_name(islander) + "收到生日礼物! 声望+" + str(int(result.get("rep", 0))) + " 图鉴券+" + str(int(result.get("vouchers", 0))) + (" · 称心礼物【" + EconomyConfig.get_item_display_name(fav) + "】" if fav != "" else "") + (" ★生日全家福!" if bool(result.get("medal", false)) else "")
	_sync_label_nodes()
	queue_redraw()

func reload_ci14_textures() -> void:
	tex_photo_tour = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_PHOTO_TOUR_TEX)
	tex_photo_card = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_CARD_TEX)
	tex_photo_album = EconomyConfig.load_pixel_texture(EconomyConfig.PHOTO_ALBUM_TEX)
	tex_wish_board = EconomyConfig.load_pixel_texture(EconomyConfig.ICON_WISH_BOARD_TEX)
	tex_wish_note = EconomyConfig.load_pixel_texture(EconomyConfig.WISH_NOTE_TEX)
	tex_reputation_star = EconomyConfig.load_pixel_texture(EconomyConfig.REPUTATION_STAR_TEX)
	if tex_rare_voucher == null:
		reload_ci4_textures()

func _photo_route_text(route: Array) -> String:
	var parts: Array[String] = []
	for s_id in route:
		parts.append(String(EconomyConfig.PHOTO_SPOTS[String(s_id)]["short_name"]))
	return "-".join(parts)

func _on_photo_tour_started(_tour_idx: int, stops: int) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★观光摄影团出发! " + str(stops) + " 处打卡: " + _photo_route_text(GameManager.photo_tour_route) + " · 客流x" + str(EconomyConfig.PHOTO_TOUR_VISITOR_SPAWN_MULT)
	_sync_label_nodes()
	queue_redraw()

func _on_photo_taken(_spot_id: String, photo_id: String, gold: int, special: bool) -> void:
	var lr: Dictionary = GameManager.photo_last_result
	var extra := ""
	if int(lr.get("amber", 0)) > 0:
		extra = " · 首拍+" + str(int(lr["amber"])) + "琥珀"
	elif int(lr.get("vouchers", 0)) > 0:
		extra = " · 绝景首拍+" + str(int(lr["vouchers"])) + "图鉴券"
	offline_banner_timer = 3.5
	offline_banner_text = ("★绝景! " if special else "咔嚓! ") + "【" + EconomyConfig.get_item_display_name(photo_id) + "】收入摄影图鉴 +" + str(gold) + "G" + extra
	_sync_label_nodes()
	queue_redraw()

func _on_photo_tour_ended(photos: int, stamped: bool) -> void:
	offline_banner_timer = 4.5
	if stamped:
		offline_banner_text = "★观光团满载而归! 拍下 " + str(photos) + " 张 · 打卡集章 x" + str(GameManager.photo_stamps) + " +" + str(EconomyConfig.PHOTO_STAMP_VOUCHERS) + "图鉴券"
	else:
		offline_banner_text = "★观光团返程 · 拍下 " + str(photos) + " 张 (一趟拍满 " + str(EconomyConfig.PHOTO_STAMP_MIN_PHOTOS) + " 张可集章)"
	_sync_label_nodes()
	queue_redraw()

func _on_wish_fulfilled(_slot_idx: int, wish: Dictionary) -> void:
	var lr: Dictionary = GameManager.wish_last_result
	var who := String(EconomyConfig.WISH_ISLANDER_NAMES.get(String(wish.get("islander", "")), "岛民"))
	var w_cfg: Dictionary = EconomyConfig.WISH_TYPES.get(String(wish.get("type", "harvest")), {})
	offline_banner_timer = 4.5
	offline_banner_text = "★" + who + "的" + String(w_cfg.get("name", "心愿")) + "圆梦! 声望+" + str(int(lr.get("rep", 0))) + " 图鉴券+" + str(int(lr.get("vouchers", 0))) + (" ★心愿勋章!" if bool(lr.get("medal", false)) else "")
	_sync_label_nodes()
	queue_redraw()

func _on_pottery_kiln_unlocked_changed(_unlocked: bool) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★云端陶艺窑坊点火！月兔收获翻出的陶土 + 秸秆柴烧制云纹茶碗/青釉陶花瓶 · 供应集市与伴手礼盒!"
	_sync_label_nodes()
	queue_redraw()

func _on_sports_day_started(team_count: int) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★岛民秋季运动会开幕！" + str(team_count) + " 支队伍登上荷塘栈桥赛道 · 接力/拔河/搬运三项比赛 · 观赛人潮售价 " + str(EconomyConfig.SPORTS_SPECTATOR_SALE_MULT) + "x!"
	_sync_label_nodes()
	queue_redraw()

func _on_sports_event_settled(event_id: String, ranking: Array, prize_gold: int) -> void:
	var names: Array[String] = []
	for ri in range(mini(3, ranking.size())):
		names.append(str(ri + 1) + "." + String(EconomyConfig.SPORTS_TEAM_NAMES.get(String(ranking[ri]), String(ranking[ri]))))
	offline_banner_timer = 4.5
	offline_banner_text = "★运动会" + EconomyConfig.get_item_display_name(event_id) + "名次: " + " ".join(names) + " · 奖金 +" + str(prize_gold) + "G · 运动会鉴 " + str(GameManager.get_unlocked_sports_event_count()) + "/3"
	_sync_label_nodes()
	queue_redraw()

func _on_sports_day_ended(champion_key: String, medal_total: int) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★秋季运动会闭幕！总冠军【" + String(EconomyConfig.SPORTS_TEAM_NAMES.get(champion_key, champion_key)) + "】荣获金丝带奖牌 x" + str(medal_total) + " · 冠军干劲加速 · +琥珀 +图鉴券!"
	_sync_label_nodes()
	queue_redraw()

func _on_dairy_workshop_unlocked_changed(_unlocked: bool) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★云端牧场乳品工坊落成！农田收获的鲜草喂云朵奶牛挤鲜奶 · 熟成奶酪与云朵布丁供应集市与食神品鉴席!"
	_sync_label_nodes()
	queue_redraw()

func _on_open_air_cinema_unlocked_changed(_unlocked: bool) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★星空夜市露天电影院搭好银幕！每到夜市连映 3 部电影 · 售影票与影院零食 · 夜市售价 " + str(EconomyConfig.CINEMA_NIGHT_SALE_MULT) + "x!"
	_sync_label_nodes()
	queue_redraw()

func _on_cinema_screening_settled(film_id: String, audience: int, ticket_gold: int, snack_gold: int) -> void:
	offline_banner_timer = 4.5
	offline_banner_text = "★露天电影" + EconomyConfig.get_item_display_name(film_id) + "散场 · 观众 " + str(audience) + " 位 · 影票 +" + str(ticket_gold) + "G" + ((" · 零食 +" + str(snack_gold) + "G") if snack_gold > 0 else "") + " · 星空影院鉴 " + str(GameManager.get_unlocked_film_count()) + "/3"
	_sync_label_nodes()
	queue_redraw()

func _on_cinema_medal_awarded(total_medals: int) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★一夜连映 3 部露天电影！荣获【星空影迷勋章】x" + str(total_medals) + " · +琥珀 +图鉴券!"
	_sync_label_nodes()
	queue_redraw()

func _on_lighthouse_harbor_unlocked_changed(_unlocked: bool) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★云海灯塔渔港点灯！两艘渔船轮班出海 · 鲜渔获供应集市与食神品鉴席 · 名物拍卖会即将开槌!"
	_sync_label_nodes()
	queue_redraw()

func _on_island_auction_started(lot_count: int) -> void:
	var sm := GameManager.get_auction_status_summary()
	offline_banner_timer = 5.5
	offline_banner_text = "★岛民名物集市拍卖会开槌 (" + str(lot_count) + "件)！首拍【" + EconomyConfig.get_item_display_name(String(sm["lot_id"])) + "】起拍 " + str(int(sm["next_bid"])) + String(sm["cur_tag"]) + " · 点灯塔或拍卖卡出价!"
	_sync_label_nodes()
	queue_redraw()

func _on_auction_lot_resolved(lot_id: String, winner_id: String, price: int, currency: String, player_won: bool) -> void:
	offline_banner_timer = 4.8
	var lot_nm := EconomyConfig.get_item_display_name(lot_id)
	var tag := "珀" if currency == "amber" else "G"
	if player_won:
		offline_banner_text = "★落槌！你以 " + str(price) + tag + " 拍下【" + lot_nm + "】· 名物热卖 " + str(EconomyConfig.AUCTION_BUFF_SALE_MULT) + "x · 名物拍卖鉴 " + str(GameManager.get_unlocked_auction_lot_count()) + "/3"
	elif winner_id != "":
		offline_banner_text = "落槌:【" + lot_nm + "】被" + EconomyConfig.get_auction_bidder_name(winner_id) + "以 " + str(price) + tag + " 拍走 · 下一件马上开拍!"
	else:
		offline_banner_text = "【" + lot_nm + "】流拍"
	_sync_label_nodes()
	queue_redraw()

func _on_island_auction_ended(player_wins: int, gavel_awarded: bool) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★名物拍卖会落幕：拍得 " + str(player_wins) + "/3 件名物" + (" · 荣获【名物金槌勋章】!" if gavel_awarded else " · 下一场 " + str(int(EconomyConfig.AUCTION_COOLDOWN_SEC)) + "s 后开槌")
	_sync_label_nodes()
	queue_redraw()

func _on_wish_lantern_festival_started(duration: float) -> void:
	offline_banner_timer = 5.5
	offline_banner_text = "★云海星灯祈愿水灯节开幕 (" + str(int(round(duration))) + "s)！荷塘与海岸漂来祈愿水灯 · 点击拾灯许愿得琥珀与图鉴券 · 售价 1.30x!"
	_sync_label_nodes()
	queue_redraw()

func _on_wish_lantern_claimed(_lantern_idx: int, gold_earned: int, amber_earned: int, vouchers_earned: int, wish_total: int) -> void:
	offline_banner_timer = 4.2
	offline_banner_text = "★星灯祈愿 #" + str(wish_total) + ": +" + str(gold_earned) + "G +" + str(amber_earned) + "琥珀 +" + str(vouchers_earned) + "图鉴券" + (" · 祈愿成真! 水灯节延长6s" if wish_total % GameManager.WISH_LANTERN_WISH_BONUS_EVERY == 0 else "")
	_sync_label_nodes()
	queue_redraw()

func _on_tasting_dish_unlocked(dish_id: String) -> void:
	offline_banner_timer = 5.0
	offline_banner_text = "★山海食神品鉴席新菜谱【" + EconomyConfig.get_item_display_name(dish_id) + "】解锁 · 组合三岛食材烹制特级名菜!"
	_sync_label_nodes()
	queue_redraw()

func _on_tasting_challenge_judged(dish_id: String, score: int, passed: bool, gold_earned: int, amber_earned: int, vouchers_earned: int) -> void:
	offline_banner_timer = 4.8
	var dname := EconomyConfig.get_item_display_name(dish_id)
	if passed:
		offline_banner_text = "★品鉴通过【" + dname + "】" + str(score) + "分: +" + str(gold_earned) + "G +" + str(amber_earned) + "琥珀" + ((" +" + str(vouchers_earned) + "图鉴券") if vouchers_earned > 0 else "") + " · 食神鉴 " + str(GameManager.get_passed_tasting_challenge_count()) + "/3"
	else:
		offline_banner_text = "品鉴未达标【" + dname + "】" + str(score) + "/" + str(EconomyConfig.TASTING_PASS_SCORE) + "分 · 升级品鉴席或在星灯水灯节期间品鉴可加分!"
	_sync_label_nodes()
	queue_redraw()

func _on_chef_medal_awarded(total_medals: int) -> void:
	offline_banner_timer = 6.0
	offline_banner_text = "★三道山海特级名菜全部品鉴通过！荣获【山海食神勋章】x" + str(total_medals) + " · 山海图鉴第11卡点亮!"
	_sync_label_nodes()
	queue_redraw()

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
	wish_board_view = false
	birthday_view = false
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

	# CI-11: 13 cards per tab (Dairy Workshop / Open-Air Cinema / `★星空影院鉴` Codex card 13)
	# CI-12: 14 cards per tab (Pottery Kiln / Autumn Sports Day / `★秋季运动会鉴` Codex card 14)
	# CI-13: up to 16 cards per tab (Kite Festival + Four-Season dress-up on tab 2, `★云海风筝鉴` Codex card 15) in two rows
	# CI-14: up to 18 cards per tab (Photo Tour #17 + Wish Board #18 on tab 2, `★观光摄影鉴` Codex card 16)
	# CI-15: up to 20 cards per tab (Cloud-Sea Weather #19 + Birthday Party #20 on tab 2, `★云海天气` Codex card 17)
	for i in range(20):
		var ct := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
		var cs := EconomyConfig.create_pixel_label("", 14, Color("#FFF4D6"), false)
		var cc := EconomyConfig.create_pixel_label("", 14, Color("#FFE066"), false)
		# CI-10: every card label owns its LabelSettings -> recolouring one card's cost line (e.g. a `locked` card 12)
		# can no longer leak into the shared 14px titles, tab captions or drawer buttons
		ct.label_settings = ct.label_settings.duplicate() as LabelSettings
		cs.label_settings = cs.label_settings.duplicate() as LabelSettings
		cc.label_settings = cc.label_settings.duplicate() as LabelSettings
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
		en.label_settings = en.label_settings.duplicate() as LabelSettings
		et.label_settings = et.label_settings.duplicate() as LabelSettings
		ep.label_settings = ep.label_settings.duplicate() as LabelSettings
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
	if GameManager != null and GameManager.is_wish_lantern_festival_active():
		cur_w_name = "星灯节"
	elif GameManager != null and GameManager.is_moon_tea_gathering_active():
		cur_w_name = "画舫茶"
	elif GameManager != null and GameManager.is_gourmet_parade_active():
		cur_w_name = "花车节"
	elif GameManager != null and GameManager.is_cinema_screening_active():
		cur_w_name = "影院夜"
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
		var feast_cnt := GameManager.get_passed_tasting_challenge_count()
		var auction_cnt := GameManager.get_unlocked_auction_lot_count()
		var dairy_cnt := GameManager.get_unlocked_dairy_count()
		var film_cnt := GameManager.get_unlocked_film_count()
		var pottery_cnt := GameManager.get_unlocked_pottery_count()
		var sports_cnt := GameManager.get_unlocked_sports_event_count()
		var medal_sum := EconomyConfig.get_total_honor_medals_unlocked(GameManager.animal_levels)
		var titles := [
			EconomyConfig.tr_key("drawer_build"),
			EconomyConfig.tr_key("drawer_animal"),
			EconomyConfig.tr_key("drawer_expand"),
			EconomyConfig.tr_key("drawer_codex_ci15") % [codex_cnt, solar_cnt, flora_cnt, souv_cnt, bath_cnt, bakery_cnt, tea_cnt, feast_cnt, auction_cnt, dairy_cnt, film_cnt, pottery_cnt, sports_cnt, GameManager.get_unlocked_kite_count(), GameManager.get_seen_season_count(), GameManager.get_unlocked_photo_count(), GameManager.get_seen_sky_weather_count(), GameManager.get_celebrated_islander_count(), int(medal_sum["unlocked"]), int(medal_sum["total"])]
		]
		lbl_drawer_title.text = titles[clampi(active_tab, 0, 3)]
		# CI-14: the Wish Board panel replaces the tab 2 headline while it is open
		if active_tab == 2 and wish_board_view:
			lbl_drawer_title.text = EconomyConfig.tr_key("drawer_wish_board") % GameManager.wishes_fulfilled_total
		# CI-15: the Birthday Party panel replaces the tab 2 headline while it is open
		if active_tab == 2 and birthday_view:
			lbl_drawer_title.text = EconomyConfig.tr_key("drawer_birthday") % GameManager.birthday_parties_total
		# CI-13: the codex title wraps onto 2 lines at an undistorted 0.6x (it used to be squeezed to 0.44x on one line);
		# every title is shrunk horizontally only if it would otherwise run into the language button
		lbl_drawer_title.size = Vector2.ZERO
		var title_avail := TOP_RIGHT_LANG_RECT.position.x - 4.0 - 536.0
		var title_raw_w := maxf(1.0, lbl_drawer_title.get_combined_minimum_size().x)
		if active_tab == 3:
			lbl_drawer_title.scale = Vector2(minf(0.60, title_avail / title_raw_w), 0.60)
			lbl_drawer_title.position = Vector2(536.0, 126.0 + top_dy)
		else:
			lbl_drawer_title.scale = Vector2(minf(0.72, title_avail / title_raw_w), 0.86)
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
			var is_ten := cards.size() == 10
			var is_eleven := cards.size() == 11
			var is_twelve := cards.size() == 12
			var is_thirteen := cards.size() == 13
			var is_fourteen := cards.size() >= 14
			# CI-13: 13+ cards are laid out in 2 rows (7-8 cards per row) with undistorted text instead of a 0.35x squeeze
			var two_row := _is_two_row_layout(cards.size())
			var title_sc := Vector2(0.95, 0.95)
			var sub_sc := Vector2(0.85, 0.85)
			var cost_sc := Vector2(0.90, 0.90)
			if two_row:
				title_sc = Vector2(0.56, 0.56) if active_tab == 3 else Vector2(0.62, 0.62)
				sub_sc = Vector2(0.50, 0.50) if active_tab == 3 else Vector2(0.55, 0.55)
				cost_sc = Vector2(0.52, 0.52) if active_tab == 3 else Vector2(0.57, 0.57)
			elif is_fourteen:
				title_sc = Vector2(0.35, 0.64) if active_tab == 3 else Vector2(0.36, 0.66)
				sub_sc = Vector2(0.32, 0.58) if active_tab == 3 else Vector2(0.33, 0.62)
				cost_sc = Vector2(0.33, 0.60) if active_tab == 3 else Vector2(0.35, 0.64)
			elif is_thirteen:
				title_sc = Vector2(0.37, 0.64) if active_tab == 3 else Vector2(0.38, 0.66)
				sub_sc = Vector2(0.34, 0.58) if active_tab == 3 else Vector2(0.35, 0.62)
				cost_sc = Vector2(0.35, 0.60) if active_tab == 3 else Vector2(0.37, 0.64)
			elif is_twelve:
				title_sc = Vector2(0.40, 0.64) if active_tab == 3 else Vector2(0.41, 0.66)
				sub_sc = Vector2(0.36, 0.58) if active_tab == 3 else Vector2(0.38, 0.62)
				cost_sc = Vector2(0.38, 0.60) if active_tab == 3 else Vector2(0.40, 0.64)
			elif is_eleven:
				title_sc = Vector2(0.43, 0.64) if active_tab == 3 else Vector2(0.45, 0.66)
				sub_sc = Vector2(0.39, 0.58) if active_tab == 3 else Vector2(0.42, 0.62)
				cost_sc = Vector2(0.41, 0.60) if active_tab == 3 else Vector2(0.44, 0.64)
			elif is_ten:
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
			var pad_x := 2.0 if (is_twelve or is_thirteen or is_fourteen) else (2.5 if is_eleven else (3.0 if is_ten else (3.5 if is_nine else (4.0 if is_eight else (5.0 if is_seven else 6.0)))))
			if two_row:
				pad_x = 3.0
			lbl_card_titles[i].text = String(cdata["title"])
			lbl_card_subs[i].text = String(cdata["sub"])
			lbl_card_costs[i].text = String(cdata["cost"])
			if two_row:
				var line_ys: Array = TWO_ROW_LINE_Y_CODEX if active_tab == 3 else TWO_ROW_LINE_Y
				lbl_card_titles[i].position = crect.position + Vector2(pad_x, float(line_ys[0]))
				lbl_card_subs[i].position = crect.position + Vector2(pad_x, float(line_ys[1]))
				lbl_card_costs[i].position = crect.position + Vector2(pad_x, float(line_ys[2]))
			else:
				lbl_card_titles[i].position = crect.position + Vector2(pad_x, 3.0 if active_tab == 3 else 4.0)
				lbl_card_subs[i].position = crect.position + Vector2(pad_x, 19.0 if active_tab == 3 else 22.0)
				lbl_card_costs[i].position = crect.position + Vector2(pad_x, 34.0 if active_tab == 3 else 38.0)
			# CI-11: dense rows (>= 11 cards) clip every card line to its own card so long descriptions never spill into neighbours
			# CI-13: in the 2-row layout the right edge is reserved for the card's pixel icons
			var dense_clip := cards.size() >= 11
			var icon_reserve := _two_row_icon_reserve(cards.size()) if two_row else 0.0
			for lbl_c in [lbl_card_titles[i], lbl_card_subs[i], lbl_card_costs[i]]:
				lbl_c.clip_text = dense_clip
				if dense_clip:
					lbl_c.size = Vector2(maxf(8.0, (crect.size.x - pad_x - 2.0 - icon_reserve) / maxf(0.1, lbl_c.scale.x)), lbl_c.size.y)
				else:
					lbl_c.size = Vector2.ZERO
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
					if active_tab != hovered_tab:
						wish_board_view = false
						birthday_view = false
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

## CI-13: 13+ cards per tab -> 2 rows (ceil(n/2) per row) so every card stays readable at an undistorted ~0.55-0.62x
const TWO_ROW_MIN_CARDS := 13
const TWO_ROW_START_X := 530.0
const TWO_ROW_SPAN_W := 860.0
const TWO_ROW_COL_GAP := 3.0
const TWO_ROW_TOP_Y := 153.0
const TWO_ROW_CARD_H := 34.0
const TWO_ROW_ROW_GAP := 2.0
const TWO_ROW_TOP_Y_CODEX := 97.0
const TWO_ROW_CARD_H_CODEX := 30.0
const TWO_ROW_ROW_GAP_CODEX := 1.0
const TWO_ROW_LINE_Y: Array = [1.0, 11.5, 22.0]
const TWO_ROW_LINE_Y_CODEX: Array = [1.0, 10.0, 19.0]
const TWO_ROW_ICON_RESERVE := 24.0
## CI-15: dense 2-row layouts (tab 2 at 10 cards per row = 19-20 cards, the codex at 9 per row = 17-18 cards) keep ONE 10px
## icon per card (the second icon slot), so the text keeps about the room it had before the extra card:
## tab 2: 83.3 - 3 - 13 = 67.3px >= 92.9 - 3 - 24 = 65.9px (9 per row); codex: 92.9 - 3 - 13 = 76.9px vs 77.9px (8 per row)
const TWO_ROW_DENSE_PER_ROW := 10
const TWO_ROW_DENSE_PER_ROW_CODEX := 9
const TWO_ROW_ICON_RESERVE_DENSE := 13.0

func _is_two_row_dense(total: int) -> bool:
	return _is_two_row_layout(total) and _get_two_row_per_row(total) >= (TWO_ROW_DENSE_PER_ROW_CODEX if active_tab == 3 else TWO_ROW_DENSE_PER_ROW)

func _two_row_icon_reserve(total: int) -> float:
	return TWO_ROW_ICON_RESERVE_DENSE if _is_two_row_dense(total) else TWO_ROW_ICON_RESERVE

func _is_two_row_layout(total: int) -> bool:
	return total >= TWO_ROW_MIN_CARDS

func _get_two_row_per_row(total: int) -> int:
	return int(ceil(float(total) / 2.0))

## Icon top inside a card: the single-row layouts keep their hand-tuned offset `single_dy`; 2-row cards centre it vertically
func _card_icon_y(crect: Rect2, single_dy: float, sz: float) -> float:
	if crect.size.y < 45.0:
		return crect.position.y + roundf((crect.size.y - sz) * 0.5)
	return crect.position.y + single_dy

func _get_card_rect(idx: int, total: int) -> Rect2:
	var w := 196.0
	var gap := 12.0
	var start_x := 548.0
	if _is_two_row_layout(total):
		var per_row := _get_two_row_per_row(total)
		var row := idx / per_row
		var col := idx % per_row
		var cw := (TWO_ROW_SPAN_W - TWO_ROW_COL_GAP * float(per_row - 1)) / float(per_row)
		var ch := TWO_ROW_CARD_H_CODEX if active_tab == 3 else TWO_ROW_CARD_H
		var top := TWO_ROW_TOP_Y_CODEX if active_tab == 3 else TWO_ROW_TOP_Y
		var rg := TWO_ROW_ROW_GAP_CODEX if active_tab == 3 else TWO_ROW_ROW_GAP
		return Rect2(TWO_ROW_START_X + float(col) * (cw + TWO_ROW_COL_GAP), top + float(row) * (ch + rg), cw, ch)
	if total >= 14:
		# CI-12: 14 cards (incl. Pottery Kiln / Autumn Sports Day / `★秋季运动会鉴` Codex card 14) fit 528..1382.8 inside the 880px drawer
		w = 59.2
		gap = 2.0
		start_x = 528.0
	elif total >= 13:
		# CI-11: 13 cards (incl. Dairy Workshop / Open-Air Cinema / `★星空影院鉴` Codex card 13) fit 528..1383.8 inside the 880px drawer
		w = 63.8
		gap = 2.2
		start_x = 528.0
	elif total >= 12:
		# CI-10: 12 cards (incl. Lighthouse Harbor / Specialty Auction / `★名物拍卖鉴` Codex card 12) fit 528..1384.6 inside the 880px drawer
		w = 69.0
		gap = 2.6
		start_x = 528.0
	elif total == 11:
		# CI-9: 11 cards (incl. Chef Pavilion / Star Lantern Festival / `★山海食神鉴` Codex card 11) fit 528..1388.5 inside the 880px drawer
		w = 75.5
		gap = 3.0
		start_x = 528.0
	elif total == 10:
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
	# CI-14: the Wish Board panel (tab 2) = the 3 islander notes + the way back to the Expansion cards
	if active_tab == 2 and wish_board_view:
		return _get_wish_board_cards()
	# CI-15: the Birthday Party panel (tab 2) = today / gift / next birthday + the way back
	if active_tab == 2 and birthday_view:
		return _get_birthday_cards()
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
			if not isl2_gh_on:
				list.append({
					"type": "chef_pavilion_building",
					"key": "chef_pavilion",
					"title": "食神品鉴席(锁岛2)",
					"sub": "需开拓木桥1解锁岛2",
					"cost": "待解锁岛屿",
					"cost_state": "locked"
				})
			elif not GameManager.chef_pavilion_unlocked:
				var cp_unlock_c := EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD
				list.append({
					"type": "chef_pavilion_building",
					"key": "chef_pavilion",
					"title": "食神品鉴席(待建)",
					"sub": "三岛食材烹特级名菜",
					"cost": "建造 " + str(cp_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= cp_unlock_c else "short"
				})
			else:
				var cp_lv := int(GameManager.building_levels.get("chef_pavilion", 1))
				var cp_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["chef_pavilion"]["base_cost"]), cp_lv)
				var cp_cfg_0: Dictionary = EconomyConfig.TASTING_DISHES.get(GameManager.active_tasting_dish_id, {})
				list.append({
					"type": "chef_pavilion_building",
					"key": "chef_pavilion",
					"title": "食神品鉴席 Lv." + str(cp_lv),
					"sub": "烹" + String(cp_cfg_0.get("short_name", "灌汤小笼")) + "·肴" + str(GameManager.get_total_tasting_dish_stock_count()),
					"cost": "升级 " + str(cp_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= cp_cost else "short"
				})
			# CI-10: card 12 -> Cloud-Sea Lighthouse Fishing Harbor (Island 3)
			if not isl3_hs_on:
				list.append({
					"type": "lighthouse_harbor_building",
					"key": "lighthouse_harbor",
					"title": "灯塔渔港(锁岛3)",
					"sub": "需开拓木桥2解锁岛3",
					"cost": "待解锁岛屿",
					"cost_state": "locked"
				})
			elif not GameManager.lighthouse_harbor_unlocked:
				var lh_unlock_c := EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD
				list.append({
					"type": "lighthouse_harbor_building",
					"key": "lighthouse_harbor",
					"title": "灯塔渔港(待建)",
					"sub": "双渔船出海捕鲜货",
					"cost": "建造 " + str(lh_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= lh_unlock_c else "short"
				})
			else:
				var lh_lv := GameManager.get_harbor_level()
				var lh_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["lighthouse_harbor"]["base_cost"]), lh_lv)
				list.append({
					"type": "lighthouse_harbor_building",
					"key": "lighthouse_harbor",
					"title": "灯塔渔港 Lv." + str(lh_lv),
					"sub": "鲜" + str(GameManager.get_harbor_seafood_stock()) + "·捕" + str(GameManager.seafood_landed_total),
					"cost": "升级 " + str(lh_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= lh_cost else "short"
				})
			# CI-11: card 13 -> Cloud Ranch Dairy Workshop (Island 1)
			if not GameManager.dairy_workshop_unlocked:
				var dw_unlock_c := EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD
				list.append({
					"type": "dairy_workshop_building",
					"key": "dairy_workshop",
					"title": "乳品工坊(待建)",
					"sub": "鲜奶·奶酪·布丁",
					"cost": "建造 " + str(dw_unlock_c) + "G",
					"cost_state": "affordable" if GameManager.gold >= dw_unlock_c else "short"
				})
			else:
				var dw_lv := GameManager.get_dairy_level()
				var dw_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["dairy_workshop"]["base_cost"]), dw_lv)
				list.append({
					"type": "dairy_workshop_building",
					"key": "dairy_workshop",
					"title": "乳品工坊 Lv." + str(dw_lv),
					"sub": "奶" + str(GameManager.get_dairy_stock("dairy_milk")) + "·酪" + str(GameManager.get_dairy_stock("dairy_cheese")) + "·布" + str(GameManager.get_dairy_stock("dairy_cloud_pudding")),
					"cost": "升级 " + str(dw_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= dw_cost else "short"
				})
			# CI-12: card 14 -> Cloud Pottery Kiln Workshop (Island 3 slot 1)
			if not GameManager.pottery_kiln_unlocked:
				var pk_unlock_c := EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD
				var isl3_open := bool(GameManager.unlocked_islands.get(3, false))
				list.append({
					"type": "pottery_kiln_building",
					"key": "pottery_kiln",
					"title": "陶艺窑坊(待建)",
					"sub": "茶碗·陶花瓶" if isl3_open else "需开拓岛3",
					"cost": ("建造 " + str(pk_unlock_c) + "G") if isl3_open else "岛3未开",
					"cost_state": ("affordable" if GameManager.gold >= pk_unlock_c else "short") if isl3_open else "locked"
				})
			else:
				var pk_lv := GameManager.get_pottery_kiln_level()
				var pk_cost := EconomyConfig.calc_upgrade_cost(int(EconomyConfig.BUILDINGS["pottery_kiln"]["base_cost"]), pk_lv)
				list.append({
					"type": "pottery_kiln_building",
					"key": "pottery_kiln",
					"title": "陶艺窑坊 Lv." + str(pk_lv),
					"sub": "土" + str(GameManager.get_pottery_stock("clay_lump")) + "·碗" + str(GameManager.get_pottery_stock("pottery_tea_bowl")) + "·瓶" + str(GameManager.get_pottery_stock("pottery_vase")),
					"cost": "升级 " + str(pk_cost) + "G",
					"cost_state": "affordable" if GameManager.gold >= pk_cost else "short"
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
			if GameManager.is_wish_lantern_festival_active():
				list.append({
					"type": "wish_lantern_festival",
					"key": "wish_lantern_festival",
					"title": "★星灯水灯节(" + str(int(ceili(GameManager.wish_lantern_festival_timer))) + "s)",
					"sub": "拾灯" + str(GameManager.wish_lanterns_collected) + "·售价1.30x",
					"cost": "点水灯得珀+券",
					"cost_state": "unlocked"
				})
			else:
				list.append({
					"type": "wish_lantern_festival",
					"key": "wish_lantern_festival",
					"title": "★云海星灯水灯节",
					"sub": "荷塘海岸放水灯·拾" + str(GameManager.wish_lanterns_collected),
					"cost": "开启星灯水灯节!",
					"cost_state": "affordable"
				})
			# CI-10: card 12 -> Islander Specialty Market Auction (needs the Lighthouse Harbor)
			if not GameManager.lighthouse_harbor_unlocked:
				list.append({
					"type": "specialty_auction",
					"key": "specialty_auction",
					"title": "★名物拍卖会",
					"sub": "建灯塔渔港开槌",
					"cost": "需灯塔渔港" if isl3_unlocked else "需先解锁岛3",
					"cost_state": "locked"
				})
			elif GameManager.island_auction_active:
				var au_sm := GameManager.get_auction_status_summary()
				var au_lead := "待出价"
				if bool(au_sm["player_leading"]):
					au_lead = "你领先"
				elif String(au_sm["high_bidder"]) != "":
					au_lead = String(au_sm["leader_name"]) + "领先"
				list.append({
					"type": "specialty_auction",
					"key": "specialty_auction",
					"title": "★拍卖%d/%d(%ds)" % [int(au_sm["lot_index"]) + 1, int(au_sm["lot_count"]), maxi(1, int(ceili(float(au_sm["timer"]))))],
					"sub": String(au_sm["lot_short"]) + "·" + au_lead,
					"cost": "领先中" if bool(au_sm["player_leading"]) else ("出价 " + str(int(au_sm["next_bid"])) + String(au_sm["cur_tag"])),
					"cost_state": "unlocked" if bool(au_sm["player_leading"]) else ("affordable" if bool(au_sm["can_afford"]) else "short")
				})
			else:
				list.append({
					"type": "specialty_auction",
					"key": "specialty_auction",
					"title": "★岛民名物拍卖会",
					"sub": "藏品" + str(GameManager.get_total_auction_collectibles()) + "·金槌" + str(GameManager.auction_gavel_medals),
					"cost": "开槌拍卖!",
					"cost_state": "affordable"
				})
			# CI-11: card 13 -> Starry Night-Market Open-Air Cinema (night-only event on the Island 1 east headland)
			var cin_sm := GameManager.get_cinema_status_summary()
			if not GameManager.open_air_cinema_unlocked:
				list.append({
					"type": "open_air_cinema",
					"key": "open_air_cinema",
					"title": "★星空露天影院",
					"sub": "夜场放映·引夜市客",
					"cost": str(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD) + "G 搭银幕",
					"cost_state": "affordable" if GameManager.gold >= EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD else "short"
				})
			elif bool(cin_sm["screening"]):
				list.append({
					"type": "open_air_cinema",
					"key": "open_air_cinema",
					"title": "★放映%d/%d(%ds)" % [int(cin_sm["slot"]) + 1, int(cin_sm["slot_count"]), maxi(1, int(ceili(float(cin_sm["remaining"]))))],
					"sub": String(cin_sm["film_short"]) + "·客" + str(int(cin_sm["audience"])),
					"cost": "票" + str(int(cin_sm["ticket_price"])) + "G·售价" + str(EconomyConfig.CINEMA_NIGHT_SALE_MULT) + "x",
					"cost_state": "unlocked"
				})
			elif bool(cin_sm["open"]):
				list.append({
					"type": "open_air_cinema",
					"key": "open_air_cinema",
					"title": "★露天影院(夜市)",
					"sub": "今夜已映" + str(int(cin_sm["tonight"])) + "/3",
					"cost": "叫卖影院零食",
					"cost_state": "affordable"
				})
			else:
				list.append({
					"type": "open_air_cinema",
					"key": "open_air_cinema",
					"title": "★露天影院(待夜)",
					"sub": "影票" + str(GameManager.cinema_screenings_total) + "·勋" + str(GameManager.cinema_medals),
					"cost": str(int(ceili(float(cin_sm["until_night"])))) + "s 后入夜开映",
					"cost_state": "normal"
				})
			# CI-12: card 14 -> Islander Autumn Sports Day (timed event on the Lotus Pond bridge track)
			var sp_sm := GameManager.get_sports_status_summary()
			if bool(sp_sm["active"]):
				var sp_phase := String(sp_sm["phase"])
				var sp_title := "★运动会·入场"
				if sp_phase == "award":
					sp_title = "★金丝带颁奖"
				elif sp_phase != "gather":
					sp_title = "★%s %d/%d" % [String(sp_sm["event_short"]), int(sp_sm["event_idx"]) + 1, int(sp_sm["event_count"])]
				list.append({
					"type": "sports_day",
					"key": "sports_day",
					"title": sp_title,
					"sub": str(int(sp_sm["teams"])) + "队·余" + str(maxi(1, int(ceili(float(sp_sm["seconds_left"]))))) + "s",
					"cost": "观赛售价" + str(EconomyConfig.SPORTS_SPECTATOR_SALE_MULT) + "x",
					"cost_state": "unlocked"
				})
			elif int(sp_sm["teams"]) < EconomyConfig.SPORTS_MIN_TEAMS:
				list.append({
					"type": "sports_day",
					"key": "sports_day",
					"title": "★秋季运动会",
					"sub": "岛1需2种员工",
					"cost": "现有" + str(int(sp_sm["teams"])) + "队",
					"cost_state": "locked"
				})
			else:
				list.append({
					"type": "sports_day",
					"key": "sports_day",
					"title": "★秋季运动会",
					"sub": str(int(sp_sm["teams"])) + "队·金丝带" + str(int(sp_sm["medals"])),
					"cost": "立即开幕!",
					"cost_state": "affordable"
				})
			# CI-13: card 15 -> Cloud-Sea Kite Festival (timed sky event, kites in the lanes above Island 2 / Island 3)
			var kt_sm := GameManager.get_kite_status_summary()
			if bool(kt_sm["active"]):
				list.append({
					"type": "kite_festival",
					"key": "kite_festival",
					"title": "★风筝节·" + String(kt_sm["wind_name"]),
					"sub": "筝" + str(int(kt_sm["remaining"])) + "/" + str(EconomyConfig.KITE_SLOTS.size()) + "·余" + str(maxi(1, int(ceili(float(kt_sm["seconds_left"]))))) + "s",
					"cost": "产x%.2f 售x%.2f" % [float(kt_sm["prod_mult"]), float(kt_sm["sale_mult"])],
					"cost_state": "unlocked"
				})
			else:
				list.append({
					"type": "kite_festival",
					"key": "kite_festival",
					"title": "★云海风筝节",
					"sub": "满天勋" + str(int(kt_sm["medals"])) + "·" + str(int(ceili(float(kt_sm["cooldown"])))) + "s后",
					"cost": "立即放飞!",
					"cost_state": "affordable"
				})
			# CI-13: card 16 -> Island Four-Season dress-up (local calendar month, northern-hemisphere seasons)
			var ss_info := GameManager.get_current_season_info()
			list.append({
				"type": "season_dress",
				"key": "season_dress",
				"title": "★" + String(ss_info.get("full_name", "四季")) + "装扮",
				"sub": String(ss_info.get("deco_name", "")) + "x" + str(GameManager.get_active_season_deco_count()),
				"cost": String(ss_info.get("bonus_desc", "")) + "+" + str(int(round(EconomyConfig.SEASON_DECO_BONUS_PER_PROP * 100.0 * float(GameManager.get_active_season_deco_count())))) + "%",
				"cost_state": "unlocked"
			})
			# CI-14: card 17 -> Cloud-Isle Photo Tour (the sightseer walks the 3 photo spots, west -> east)
			var pt_sm := GameManager.get_photo_tour_status_summary()
			if bool(pt_sm["active"]):
				var pt_spot := String(pt_sm["spot"])
				list.append({
					"type": "photo_tour",
					"key": "photo_tour",
					"title": "★观光团" + str(mini(int(pt_sm["stop"]) + 1, int(pt_sm["stops"]))) + "/" + str(int(pt_sm["stops"])),
					"sub": "照" + str(int(pt_sm["photos"])) + "·" + (String(EconomyConfig.PHOTO_SPOTS[pt_spot]["short_name"]) if pt_spot != "" else "返程"),
					"cost": "客流x" + str(EconomyConfig.PHOTO_TOUR_VISITOR_SPAWN_MULT),
					"cost_state": "unlocked"
				})
			else:
				list.append({
					"type": "photo_tour",
					"key": "photo_tour",
					"title": "★观光摄影团",
					"sub": "章" + str(int(pt_sm["stamps"])) + "·" + str(int(ceili(float(pt_sm["cooldown"])))) + "s后",
					"cost": "立即出发!",
					"cost_state": "affordable"
				})
			# CI-14: card 18 -> Islander Wish Board (opens the board panel with the 3 notes)
			var wb_sm := GameManager.get_wish_board_summary()
			list.append({
				"type": "wish_board",
				"key": "wish_board",
				"title": "★心愿告示板",
				"sub": "便签" + str(int(wb_sm["open"])) + "/" + str(EconomyConfig.WISH_SLOT_COUNT) + "·圆" + str(int(wb_sm["fulfilled"])),
				"cost": "声望" + str(int(wb_sm["rep"])) + "·券" + str(int(wb_sm["vouchers"])),
				"cost_state": "affordable" if int(wb_sm["open"]) > 0 else "unlocked"
			})
			# CI-15: card 19 -> Cloud-Sea Weather (the 20-minute island-calendar slot: weather, headline effect, next change)
			var sw_sm := GameManager.get_sky_weather_status_summary()
			list.append({
				"type": "sky_weather",
				"key": "sky_weather",
				"title": "★云海" + String(sw_sm["name"]),
				"sub": String(EconomyConfig.get_sky_weather_info(String(sw_sm["id"])).get("tag", "")),
				"cost": str(int(sw_sm["minutes_left"])) + "分后换天",
				"cost_state": "unlocked"
			})
			# CI-15: card 20 -> Islander Birthday Party (opens the party panel)
			var bd_sm := GameManager.get_birthday_status_summary()
			var bd_today := String(bd_sm["today"])
			if bd_today != "":
				var bd_name := EconomyConfig.get_islander_name(bd_today)
				if bool(bd_sm["gift_given"]):
					list.append({"type": "birthday", "key": "birthday", "title": "★" + bd_name + "生日", "sub": "已备礼·谢谢!", "cost": "庆生" + str(int(bd_sm["parties"])) + "次", "cost_state": "unlocked"})
				else:
					list.append({"type": "birthday", "key": "birthday", "title": "★" + bd_name + "生日", "sub": "备礼" + str(int(bd_sm["cost"])) + "G", "cost": "去庆生!", "cost_state": "affordable" if GameManager.gold >= int(bd_sm["cost"]) else "short"})
			else:
				var bd_next: Dictionary = bd_sm["next"]
				list.append({
					"type": "birthday",
					"key": "birthday",
					"title": "★岛民生日会",
					"sub": "下位" + EconomyConfig.get_islander_name(String(bd_next.get("islander", ""))),
					"cost": str(int(bd_next.get("days", 0))) + "天后",
					"cost_state": "normal"
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
			var feast_pass := GameManager.get_passed_tasting_challenge_count()
			var cp_cfg_3: Dictionary = EconomyConfig.TASTING_DISHES.get(GameManager.active_tasting_dish_id, {})
			var cp_short_3 := String(cp_cfg_3.get("short_name", "灌汤小笼"))
			list.append({
				"type": "ci9_codex",
				"key": "chef_tasting_codex",
				"title": "★山海食神鉴(" + str(feast_pass) + "/3)",
				"sub": ("宴:" + cp_short_3 + "·鉴" + str(GameManager.tastings_held)) if GameManager.chef_pavilion_unlocked else "建岛2食神席烹名菜",
				"cost": "+" + str(feast_pass * 8) + "%价·勋" + str(GameManager.chef_medals),
				"cost_state": "unlocked" if GameManager.chef_medals > 0 else ("affordable" if GameManager.chef_pavilion_unlocked else "locked")
			})
			# CI-10: Shanhai Codex card 12 -> `★名物拍卖鉴(n/3)` (unique specialty lots won at the Islander Auction)
			var auc_won := GameManager.get_unlocked_auction_lot_count()
			list.append({
				"type": "ci10_codex",
				"key": "auction_codex",
				"title": "★名物拍卖鉴(" + str(auc_won) + "/3)",
				"sub": ("藏" + str(GameManager.get_total_auction_collectibles()) + "·鲜" + str(GameManager.get_harbor_seafood_stock())) if GameManager.lighthouse_harbor_unlocked else "建岛3灯塔渔港",
				"cost": "+" + str(auc_won * 8) + "%价·槌" + str(GameManager.auction_gavel_medals),
				"cost_state": "unlocked" if GameManager.auction_gavel_medals > 0 else ("affordable" if GameManager.lighthouse_harbor_unlocked else "locked")
			})
			# CI-11: Shanhai Codex card 13 -> `★星空影院鉴(n/3)` (films screened) + the 3 dairy products
			var film_unl := GameManager.get_unlocked_film_count()
			var dairy_unl := GameManager.get_unlocked_dairy_count()
			list.append({
				"type": "ci11_codex",
				"key": "cinema_codex",
				"title": "★星空影院鉴(" + str(film_unl) + "/3)",
				"sub": ("乳" + str(dairy_unl) + "/3·票" + str(GameManager.cinema_screenings_total)) if (GameManager.open_air_cinema_unlocked or GameManager.dairy_workshop_unlocked) else "建乳坊与露天影院",
				"cost": "+" + str((film_unl + dairy_unl) * 4) + "%价·勋" + str(GameManager.cinema_medals),
				"cost_state": "unlocked" if GameManager.cinema_medals > 0 else ("affordable" if GameManager.open_air_cinema_unlocked else "locked")
			})
			# CI-12: Shanhai Codex card 14 -> `★秋季运动会鉴(n/3)` (events held) + the 3 pottery entries
			var sport_unl := GameManager.get_unlocked_sports_event_count()
			var pot_unl := GameManager.get_unlocked_pottery_count()
			list.append({
				"type": "ci12_codex",
				"key": "sports_codex",
				"title": "★秋季运动会鉴(" + str(sport_unl) + "/3)",
				"sub": ("陶" + str(pot_unl) + "/3·赛" + str(GameManager.sports_events_held_total)) if (GameManager.pottery_kiln_unlocked or GameManager.sports_events_held_total > 0) else "建陶窑办运动会",
				"cost": "+" + str((sport_unl + pot_unl) * 4) + "%价·带" + str(GameManager.sports_medals),
				"cost_state": "unlocked" if GameManager.sports_medals > 0 else ("affordable" if GameManager.can_start_sports_day() or GameManager.pottery_kiln_unlocked else "locked")
			})
			# CI-13: Shanhai Codex card 15 -> `★云海风筝鉴(n/3)` (kite kinds reeled in) + the 4 seasons witnessed
			var kite_unl := GameManager.get_unlocked_kite_count()
			var season_unl := GameManager.get_seen_season_count()
			list.append({
				"type": "ci13_codex",
				"key": "kite_codex",
				"title": "★云海风筝鉴(" + str(kite_unl) + "/3)",
				"sub": "季" + str(season_unl) + "/4·收筝" + str(GameManager.kite_collected_total),
				"cost": "+" + str(kite_unl * 4 + season_unl * 2) + "%价·满" + str(GameManager.kite_medals),
				"cost_state": "unlocked" if GameManager.kite_medals > 0 else ("affordable" if GameManager.is_kite_festival_active() else "locked")
			})
			# CI-14: Shanhai Codex card 16 -> `★观光摄影鉴(n/6)` (3 photo spots x normal / special shot) + stamps + wish medals
			var photo_unl := GameManager.get_unlocked_photo_count()
			list.append({
				"type": "ci14_codex",
				"key": "photo_codex",
				"title": "★观光摄影鉴(" + str(photo_unl) + "/" + str(EconomyConfig.get_photo_entry_order().size()) + ")",
				"sub": "章" + str(GameManager.photo_stamps) + "·拍" + str(GameManager.photos_taken_total) + "张",
				"cost": "+" + str(int(round(EconomyConfig.PHOTO_CODEX_PRICE_PER_ENTRY * 100.0 * float(photo_unl)))) + "%价·愿" + str(GameManager.wish_medals),
				"cost_state": "unlocked" if GameManager.photo_stamps > 0 else ("affordable" if photo_unl > 0 or GameManager.is_photo_tour_active() else "locked")
			})
			# CI-15: Shanhai Codex card 17 -> `★云海天气(n/4)` (weathers witnessed) + islanders celebrated + family medals
			var sky_unl := GameManager.get_seen_sky_weather_count()
			var bday_unl := GameManager.get_celebrated_islander_count()
			list.append({
				"type": "ci15_codex",
				"key": "weather_codex",
				"title": "★云海天气(" + str(sky_unl) + "/" + str(EconomyConfig.SKY_WEATHER_ORDER.size()) + ")",
				"sub": "寿" + str(bday_unl) + "/" + str(EconomyConfig.WISH_ISLANDERS.size()) + "·庆" + str(GameManager.birthday_parties_total),
				"cost": "+" + str(int(round(EconomyConfig.SKY_WEATHER_CODEX_PRICE_PER_TYPE * 100.0 * float(sky_unl) + EconomyConfig.BIRTHDAY_CODEX_PRICE_PER_ISLANDER * 100.0 * float(bday_unl)))) + "%价·福" + str(GameManager.birthday_medals),
				"cost_state": "unlocked" if GameManager.birthday_medals > 0 else ("affordable" if sky_unl > 0 else "locked")
			})
	return list

## CI-15: the Birthday Party panel (single row, full-size readable cards): today / prepare gift / next birthday / back
func _bday_date_text(month: int, day: int) -> String:
	return str(month) + "月" + str(day) + "日"

func _get_birthday_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var bd := GameManager.get_birthday_status_summary()
	var today := String(bd["today"])
	var dt := EconomyConfig.normalize_datetime(GameManager.get_local_datetime())
	var nx: Dictionary = bd["next"]
	var nx_isl := String(nx.get("islander", ""))
	if today != "":
		var who := EconomyConfig.get_islander_name(today)
		var fav := String(bd["favourite"])
		list.append({
			"type": "bday_today",
			"key": today,
			"title": "★今天是" + who + "的生日!",
			"sub": "最爱: " + String(EconomyConfig.BIRTHDAY_FAVOURITES[today]["name"]) + ("(摊位有货)" if fav != "" else "(摊位暂无)"),
			"cost": "岛历 " + _bday_date_text(int(dt["month"]), int(dt["day"])),
			"cost_state": "unlocked" if bool(bd["gift_given"]) else "affordable"
		})
		if bool(bd["gift_given"]):
			var lr: Dictionary = GameManager.birthday_last_result
			var lr_fav := String(lr.get("favourite", ""))
			list.append({
				"type": "bday_gift",
				"key": "gift",
				"title": "★礼物已送达",
				"sub": ("称心礼物: " + EconomyConfig.get_item_display_name(lr_fav)) if lr_fav != "" else "金币礼盒",
				"cost": "声望+" + str(int(lr.get("rep", 0))) + " 券+" + str(int(lr.get("vouchers", 0))) + " 已领取",
				"cost_state": "unlocked"
			})
		else:
			var g_cost := int(bd["cost"])
			var rep_now := EconomyConfig.BIRTHDAY_REP + (EconomyConfig.BIRTHDAY_FAV_REP if fav != "" else 0)
			var v_now := EconomyConfig.BIRTHDAY_VOUCHERS + (EconomyConfig.BIRTHDAY_FAV_VOUCHERS if fav != "" else 0)
			var enough := GameManager.gold >= g_cost
			list.append({
				"type": "bday_gift",
				"key": "gift",
				"title": "★为" + who + "备礼",
				"sub": "礼盒" + str(g_cost) + "G" + (" +称心礼物" if fav != "" else ""),
				"cost": ("声望+" + str(rep_now) + " 券+" + str(v_now) + " 立即备礼!") if enough else ("金币不足 需" + str(g_cost) + "G"),
				"cost_state": "affordable" if enough else "short"
			})
	else:
		list.append({
			"type": "bday_today",
			"key": "",
			"title": "★今天没有岛民生日",
			"sub": "岛历 " + _bday_date_text(int(dt["month"]), int(dt["day"])),
			"cost": "每月3/8/13/18/23/28日",
			"cost_state": "locked"
		})
		list.append({
			"type": "bday_gift",
			"key": "gift",
			"title": "★备礼",
			"sub": "生日当天才能备礼",
			"cost": "下一位: " + EconomyConfig.get_islander_name(nx_isl),
			"cost_state": "locked"
		})
	list.append({
		"type": "bday_next",
		"key": nx_isl,
		"title": "★下一位: " + EconomyConfig.get_islander_name(nx_isl),
		"sub": _bday_date_text(int(nx.get("month", 1)), int(nx.get("day", 1))) + " (" + str(int(nx.get("days", 0))) + "天后)",
		"cost": "最爱: " + String(EconomyConfig.BIRTHDAY_FAVOURITES.get(nx_isl, {}).get("name", "")),
		"cost_state": "normal"
	})
	list.append({
		"type": "bday_back",
		"key": "bday_back",
		"title": "★岛民生日会",
		"sub": "庆生" + str(int(bd["parties"])) + "次·全家福" + str(int(bd["medals"])),
		"cost": "返回开拓列表",
		"cost_state": "normal"
	})
	return list

## CI-14: the Wish Board panel (single row, full-size readable notes): 3 islander notes + "back to the Expansion cards"
func _get_wish_board_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for i in range(EconomyConfig.WISH_SLOT_COUNT):
		var wd := GameManager.get_wish_display(i)
		if wd.is_empty():
			continue
		var st := String(wd["state"])
		list.append({
			"type": "wish_note",
			"key": str(i),
			"title": String(wd["title"]),
			"sub": String(wd["sub"]),
			"cost": String(wd["cost"]),
			"cost_state": "unlocked" if st == "done" else ("locked" if st == "expired" else "affordable")
		})
	var wb_sm := GameManager.get_wish_board_summary()
	list.append({
		"type": "wish_back",
		"key": "wish_back",
		"title": "★心愿告示板",
		"sub": "已圆梦" + str(int(wb_sm["fulfilled"])) + "张·勋" + str(int(wb_sm["medals"])),
		"cost": "返回开拓列表",
		"cost_state": "normal"
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
	elif t == "chef_pavilion_building":
		if not bool(GameManager.unlocked_islands.get(2, false)):
			offline_banner_timer = 3.5
			offline_banner_text = "请先开拓木桥1解锁2号岛，再建造【山海食神品鉴席】!"
		elif not GameManager.chef_pavilion_unlocked:
			if not GameManager.unlock_chef_pavilion(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【山海食神品鉴席】需要 " + str(EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("chef_pavilion")
	elif t == "wish_lantern_festival":
		if not GameManager.is_wish_lantern_festival_active():
			GameManager.start_wish_lantern_festival()
		else:
			offline_banner_timer = 4.2
			offline_banner_text = "★星灯水灯节进行中 (" + str(int(ceili(GameManager.wish_lantern_festival_timer))) + "s) · 点击荷塘与海岸漂流的祈愿水灯拾灯许愿!"
	elif t == "ci9_codex":
		if GameManager.chef_pavilion_unlocked:
			var nd9 := GameManager.cycle_tasting_dish()
			var dcfg9: Dictionary = EconomyConfig.TASTING_DISHES.get(nd9, {})
			offline_banner_timer = 4.5
			offline_banner_text = "★山海食神品鉴席主推【" + EconomyConfig.get_item_display_name(nd9) + "】(" + String(dcfg9.get("recipe_desc", "")) + ") · 品鉴 " + str(GameManager.tastings_held) + " 场!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★山海食神鉴: 在2号岛建造山海食神品鉴席，组合三岛食材烹制灌汤小笼/星光锦鲤/山海火锅，三道品鉴全过赢食神勋章!"
	elif t == "lighthouse_harbor_building":
		if not bool(GameManager.unlocked_islands.get(3, false)):
			offline_banner_timer = 3.5
			offline_banner_text = "请先开拓木桥2解锁3号岛，再建造【云海灯塔渔港】!"
		elif not GameManager.lighthouse_harbor_unlocked:
			if not GameManager.unlock_lighthouse_harbor(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云海灯塔渔港】需要 " + str(EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("lighthouse_harbor")
	elif t == "specialty_auction":
		if not GameManager.lighthouse_harbor_unlocked:
			offline_banner_timer = 3.8
			offline_banner_text = "★岛民名物集市拍卖会在3号岛【云海灯塔渔港】开槌，请先建造灯塔渔港!"
		elif not GameManager.island_auction_active:
			GameManager.start_island_auction()
		else:
			var bid_res := GameManager.place_auction_bid()
			if not bool(bid_res.get("ok", false)):
				offline_banner_timer = 3.5
				if String(bid_res.get("reason", "")) == "leading":
					offline_banner_text = "★你正以 " + str(int(bid_res.get("amount", 0))) + GameManager.get_auction_currency_tag() + " 领先，静候落槌!"
				else:
					offline_banner_text = "★出价需 " + str(int(bid_res.get("amount", 0))) + GameManager.get_auction_currency_tag() + "，当前余额不足!"
	elif t == "dairy_workshop_building":
		if not GameManager.dairy_workshop_unlocked:
			if not GameManager.unlock_dairy_workshop(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云端牧场乳品工坊】需要 " + str(EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("dairy_workshop")
	elif t == "open_air_cinema":
		if not GameManager.open_air_cinema_unlocked:
			if not GameManager.unlock_open_air_cinema(false):
				offline_banner_timer = 3.5
				offline_banner_text = "搭建【星空夜市露天电影院】需要 " + str(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD) + "G 金币!"
		elif GameManager.is_cinema_open():
			var sn := GameManager.sell_cinema_snacks(1)
			offline_banner_timer = 4.0
			if int(sn.get("sold", 0)) > 0:
				offline_banner_text = "★影院零食热卖 +" + str(int(sn.get("gold", 0))) + "G (" + EconomyConfig.get_item_display_name(String((sn.get("items", []) as Array)[0])) + ")"
			else:
				offline_banner_text = "★影院零食售罄 · 乳品工坊的云朵布丁/云朵鲜奶可供夜场零食!"
		else:
			offline_banner_timer = 4.0
			offline_banner_text = "★露天影院只在夜市开映 · " + str(int(ceili(GameManager.get_seconds_until_night()))) + "s 后入夜连映 3 部电影!"
	elif t == "pottery_kiln_building":
		if not GameManager.pottery_kiln_unlocked:
			if not bool(GameManager.unlocked_islands.get(3, false)):
				offline_banner_timer = 3.5
				offline_banner_text = "【云端陶艺窑坊】建在 3 号岛木桥登岸处，请先开拓岛3!"
			elif not GameManager.unlock_pottery_kiln(false):
				offline_banner_timer = 3.5
				offline_banner_text = "建造【云端陶艺窑坊】需要 " + str(EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD) + "G 金币!"
		else:
			GameManager.upgrade_building("pottery_kiln")
	elif t == "sports_day":
		offline_banner_timer = 4.0
		if GameManager.is_sports_day_active():
			var sp_cur := GameManager.get_sports_status_summary()
			offline_banner_text = "★秋季运动会进行中 · " + String(sp_cur["event_short"]) + " · 观赛人潮售价 " + str(EconomyConfig.SPORTS_SPECTATOR_SALE_MULT) + "x · 余 " + str(maxi(1, int(ceili(float(sp_cur["seconds_left"]))))) + "s"
		elif not GameManager.start_sports_day():
			offline_banner_text = "★秋季运动会需要 1 号岛至少 2 种员工组队 (月兔/水獭/狐狸/柴犬)!"
	elif t == "kite_festival":
		offline_banner_timer = 4.0
		if GameManager.is_kite_festival_active():
			var kt_cur := GameManager.get_kite_status_summary()
			offline_banner_text = "★云海风筝节进行中 · " + String(kt_cur["wind_name"]) + " 产销 x%.2f/x%.2f · 还有 %d 只风筝在西岛/东岛上空 · 余 %ds" % [float(kt_cur["prod_mult"]), float(kt_cur["sale_mult"]), int(kt_cur["remaining"]), maxi(1, int(ceili(float(kt_cur["seconds_left"]))))]
		else:
			GameManager.start_kite_festival()
	elif t == "season_dress":
		var sd_info := GameManager.get_current_season_info()
		var sd_dt := GameManager.get_local_datetime()
		offline_banner_timer = 4.5
		offline_banner_text = "★岛屿四季装扮: 本地 " + str(int(sd_dt.get("month", 1))) + " 月 = " + String(sd_info.get("full_name", "")) + " (北半球月份) · " + str(GameManager.get_active_season_deco_count()) + " 处【" + String(sd_info.get("deco_name", "")) + "】· " + String(sd_info.get("bonus_desc", "")) + " +" + str(int(round(EconomyConfig.SEASON_DECO_BONUS_PER_PROP * 100.0 * float(GameManager.get_active_season_deco_count())))) + "%"
	elif t == "photo_tour":
		offline_banner_timer = 4.0
		if GameManager.is_photo_tour_active():
			var pt_cur := GameManager.get_photo_tour_status_summary()
			offline_banner_text = "★观光摄影团进行中 · 第 " + str(mini(int(pt_cur["stop"]) + 1, int(pt_cur["stops"]))) + "/" + str(int(pt_cur["stops"])) + " 站 · 已拍 " + str(int(pt_cur["photos"])) + " 张 · " + _photo_route_text(GameManager.photo_tour_route)
		elif not GameManager.start_photo_tour():
			offline_banner_text = "★观光摄影团暂无可打卡的景点!"
	elif t == "sky_weather":
		var sw_c := GameManager.get_sky_weather_status_summary()
		var fc := GameManager.get_sky_weather_forecast(3)
		var fc_names: Array[String] = []
		for f_id in fc:
			fc_names.append(String(EconomyConfig.get_sky_weather_info(String(f_id))["name"]))
		offline_banner_timer = 5.0
		offline_banner_text = "★云海天气【" + String(sw_c["full_name"]) + "】" + _weather_mult_text(sw_c) + " · " + str(int(sw_c["minutes_left"])) + "分后换天 · 预报 " + "→".join(fc_names)
	elif t == "birthday":
		birthday_view = true
		offline_banner_timer = 3.5
		offline_banner_text = "★岛民生日会: 岛历每月 3/8/13/18/23/28 日 · 备礼得声望与图鉴券 · 6 位都庆生一轮得生日全家福"
	elif t == "bday_back":
		birthday_view = false
	elif t == "bday_gift":
		var g_res := GameManager.prepare_birthday_gift()
		if not bool(g_res.get("given", false)):
			offline_banner_timer = 3.5
			match String(g_res.get("reason", "")):
				"gold":
					offline_banner_text = "★备礼需要 " + str(int(g_res.get("cost", 0))) + "G，金币不足!"
				"already":
					offline_banner_text = "★今天的生日礼物已经送达啦!"
				_:
					var nx_g: Dictionary = GameManager.get_next_birthday_info()
					offline_banner_text = "★生日当天才能备礼 · 下一位: " + EconomyConfig.get_islander_name(String(nx_g.get("islander", ""))) + " (" + str(int(nx_g.get("days", 0))) + " 天后)"
	elif t == "bday_today" or t == "bday_next":
		var bk_isl := k
		offline_banner_timer = 4.5
		if bk_isl == "":
			offline_banner_text = "★岛历: 现实 1 个月 = 云岛 1 年 · 月兔3日 水獭8日 小狐狸13日 柴犬18日 企鹅23日 巨嘴鸟28日"
		else:
			offline_banner_text = "★" + EconomyConfig.get_islander_name(bk_isl) + "的生日在每月 " + str(EconomyConfig.get_islander_birthday_day(bk_isl)) + " 日 · 最爱" + String(EconomyConfig.BIRTHDAY_FAVOURITES[bk_isl]["name"]) + " (摊位有货时包进礼盒 = 称心礼物 声望+" + str(EconomyConfig.BIRTHDAY_FAV_REP) + " 券+" + str(EconomyConfig.BIRTHDAY_FAV_VOUCHERS) + ")"
	elif t == "ci15_codex":
		offline_banner_timer = 4.5
		offline_banner_text = "★云海天气鉴: 天气 " + str(GameManager.get_seen_sky_weather_count()) + "/" + str(EconomyConfig.SKY_WEATHER_ORDER.size()) + " · 已庆生岛民 " + str(GameManager.get_celebrated_islander_count()) + "/" + str(EconomyConfig.WISH_ISLANDERS.size()) + " · 生日会 " + str(GameManager.birthday_parties_total) + " 场 · 生日全家福 " + str(GameManager.birthday_medals) + " 枚"
	elif t == "wish_board":
		wish_board_view = true
		offline_banner_timer = 3.5
		offline_banner_text = "★岛民心愿委托告示板: 交付/经营目标委托 · 完成得声望与图鉴券 · 每圆梦 " + str(EconomyConfig.WISH_MEDAL_EVERY) + " 张得心愿勋章"
	elif t == "wish_back":
		wish_board_view = false
	elif t == "wish_note":
		var wn := GameManager.get_wish_display(int(k))
		if not wn.is_empty():
			offline_banner_timer = 4.5
			offline_banner_text = String(wn["who"]) + "的" + String(wn["name"]) + "(" + String(wn["kind"]) + "): " + String(wn["sub"]) + " · " + String(wn["cost"])
	elif t == "ci14_codex":
		offline_banner_timer = 4.5
		offline_banner_text = "★观光摄影鉴: 照片 " + str(GameManager.get_unlocked_photo_count()) + "/" + str(EconomyConfig.get_photo_entry_order().size()) + " 张(" + str(EconomyConfig.PHOTO_SPOT_ORDER.size()) + " 处景点 x 常规/绝景) · 打卡集章 " + str(GameManager.photo_stamps) + " · 心愿勋章 " + str(GameManager.wish_medals)
	elif t == "ci13_codex":
		offline_banner_timer = 4.5
		offline_banner_text = "★云海风筝鉴: 风筝 " + str(GameManager.get_unlocked_kite_count()) + "/3 种 · 四季 " + str(GameManager.get_seen_season_count()) + "/4 · 累计收筝 " + str(GameManager.kite_collected_total) + " 只 · 风筝满天勋章 " + str(GameManager.kite_medals) + " 枚"
	elif t == "ci12_codex":
		offline_banner_timer = 4.5
		offline_banner_text = "★秋季运动会鉴: 已办 " + str(GameManager.get_unlocked_sports_event_count()) + "/3 项比赛 · 陶艺 " + str(GameManager.get_unlocked_pottery_count()) + "/3 · 累计赛事 " + str(GameManager.sports_events_held_total) + " 场 · 金丝带奖牌 " + str(GameManager.sports_medals) + " 枚"
	elif t == "ci11_codex":
		offline_banner_timer = 4.5
		offline_banner_text = "★星空影院鉴: 已映 " + str(GameManager.get_unlocked_film_count()) + "/3 部电影 · 乳品 " + str(GameManager.get_unlocked_dairy_count()) + "/3 · 累计影票 " + str(GameManager.cinema_screenings_total) + " 场 · 星空影迷勋章 " + str(GameManager.cinema_medals) + " 枚"
	elif t == "ci10_codex":
		offline_banner_timer = 4.5
		if GameManager.lighthouse_harbor_unlocked:
			offline_banner_text = "★名物拍卖鉴: 已拍得 " + str(GameManager.get_unlocked_auction_lot_count()) + "/3 种名物 · 藏品 " + str(GameManager.get_total_auction_collectibles()) + " 件 · 金槌勋章 " + str(GameManager.auction_gavel_medals) + " 枚 · 渔港存鲜 " + str(GameManager.get_harbor_seafood_stock())
		else:
			offline_banner_text = "★名物拍卖鉴: 在3号岛建造云海灯塔渔港，渔船出海捕鲜货，并在岛民名物集市拍卖会上拍下明珠匣/鲜味篮/伴手礼!"
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
	# CI-15: a cake badge on the Expansion tab button while today's birthday gift is still waiting
	if GameManager != null and GameManager.can_prepare_birthday_gift():
		if tex_birthday_cake == null:
			reload_ci15_textures()
		if tex_birthday_cake != null:
			draw_texture_rect(tex_birthday_cake, EconomyConfig.BIRTHDAY_BADGE_RECT, false)

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
			var ic_sz := 8.5 if cards.size() >= 14 else (9.0 if cards.size() >= 13 else (9.5 if cards.size() >= 12 else (10.0 if cards.size() >= 11 else (11.0 if cards.size() >= 10 else (12.0 if cards.size() >= 9 else 13.0)))))
			var ic_x1 := crect.end.x - (19.0 if cards.size() >= 14 else (20.0 if cards.size() >= 13 else (21.0 if cards.size() >= 12 else (22.0 if cards.size() >= 11 else (24.0 if cards.size() >= 10 else (27.0 if cards.size() >= 9 else 30.0))))))
			var ic_x2 := crect.end.x - (9.5 if cards.size() >= 14 else (10.0 if cards.size() >= 13 else (10.5 if cards.size() >= 12 else (11.0 if cards.size() >= 11 else (12.0 if cards.size() >= 10 else (14.0 if cards.size() >= 9 else 16.0))))))
			if _is_two_row_layout(cards.size()):
				ic_sz = 10.0
				ic_x1 = crect.end.x - 23.0
				ic_x2 = crect.end.x - 12.0
				if _is_two_row_dense(cards.size()):
					# one icon per card at 10 per row: only the second slot is drawn, the first slot is parked off-canvas
					ic_x1 = -4096.0
			var c_type := String(cards[i].get("type", ""))
			if c_type == "sky_weather" or c_type == "ci15_codex":
				if tex_weather_icons.is_empty():
					reload_ci15_textures()
				var sw_ic: Texture2D = tex_weather_icons.get(GameManager.get_sky_weather_id(), null)
				var c15_dy := 37.0 if c_type == "ci15_codex" else 39.0
				if c_type == "sky_weather":
					# current weather in the always-drawn second slot, the next slot's forecast (dimmed) in the first
					var nx_w := GameManager.get_sky_weather_forecast(1)
					var nx_ic: Texture2D = tex_weather_icons.get(nx_w[0] if not nx_w.is_empty() else "", null)
					if nx_ic != null:
						draw_texture_rect(nx_ic, Rect2(ic_x1, _card_icon_y(crect, c15_dy, ic_sz), ic_sz, ic_sz), false, Color(1.0, 1.0, 1.0, 0.55))
					if sw_ic != null:
						draw_texture_rect(sw_ic, Rect2(ic_x2, _card_icon_y(crect, c15_dy, ic_sz), ic_sz, ic_sz), false)
				else:
					if sw_ic != null:
						draw_texture_rect(sw_ic, Rect2(ic_x1, _card_icon_y(crect, c15_dy, ic_sz), ic_sz, ic_sz), false)
					if tex_birthday_cake != null:
						var ck_mod := Color.WHITE if GameManager.get_celebrated_islander_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
						draw_texture_rect(tex_birthday_cake, Rect2(ic_x2, _card_icon_y(crect, c15_dy, ic_sz), ic_sz, ic_sz), false, ck_mod)
			elif c_type == "birthday":
				if tex_birthday_cake == null:
					reload_ci15_textures()
				var bd_on := GameManager.is_birthday_today()
				if tex_birthday_cake != null:
					draw_texture_rect(tex_birthday_cake, Rect2(ic_x1, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false, Color.WHITE if bd_on else Color(1.0, 1.0, 1.0, 0.55))
				if tex_birthday_gift != null:
					draw_texture_rect(tex_birthday_gift, Rect2(ic_x2, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false, Color.WHITE if GameManager.can_prepare_birthday_gift() else Color(1.0, 1.0, 1.0, 0.55))
			elif c_type == "bday_today" or c_type == "bday_next" or c_type == "bday_back":
				if tex_icon_birthday == null:
					reload_ci15_textures()
				var bt_tex: Texture2D = tex_birthday_cake if (c_type == "bday_back" or (c_type == "bday_today" and GameManager.is_birthday_today())) else tex_icon_birthday
				var bt_mod := Color(0.45, 0.42, 0.40, 0.60) if String(cards[i].get("cost_state", "")) == "locked" else Color.WHITE
				if bt_tex != null:
					draw_texture_rect(bt_tex, Rect2(crect.end.x - 31.0, crect.position.y + 6.0, 22.0, 22.0), false, bt_mod)
			elif c_type == "bday_gift":
				if tex_birthday_gift == null:
					reload_ci15_textures()
				var bg_state := String(cards[i].get("cost_state", "locked"))
				var bg_mod := Color.WHITE if bg_state == "affordable" else (Color(0.80, 1.0, 0.80, 1.0) if bg_state == "unlocked" else Color(0.45, 0.42, 0.40, 0.60))
				if tex_birthday_gift != null:
					draw_texture_rect(tex_birthday_gift, Rect2(crect.end.x - 31.0, crect.position.y + 6.0, 22.0, 22.0), false, bg_mod)
				if tex_reputation_star != null:
					draw_texture_rect(tex_reputation_star, Rect2(crect.end.x - 32.0, crect.position.y + 33.0, 12.0, 12.0), false)
				if tex_rare_voucher != null:
					draw_texture_rect(tex_rare_voucher, Rect2(crect.end.x - 19.0, crect.position.y + 33.0, 12.0, 12.0), false)
			elif c_type == "wish_note":
				if tex_wish_note == null:
					reload_ci14_textures()
				var wn_state := String(cards[i].get("cost_state", "affordable"))
				var wn_mod := Color.WHITE if wn_state == "affordable" else (Color(0.80, 1.0, 0.80, 1.0) if wn_state == "unlocked" else Color(0.45, 0.42, 0.40, 0.60))
				# note top-right, reward icons (reputation star + codex voucher) under it, all inside the card's inner frame
				if tex_wish_note != null:
					draw_texture_rect(tex_wish_note, Rect2(crect.end.x - 31.0, crect.position.y + 6.0, 22.0, 22.0), false, wn_mod)
				if tex_reputation_star != null:
					draw_texture_rect(tex_reputation_star, Rect2(crect.end.x - 32.0, crect.position.y + 33.0, 12.0, 12.0), false)
				if tex_rare_voucher != null:
					draw_texture_rect(tex_rare_voucher, Rect2(crect.end.x - 19.0, crect.position.y + 33.0, 12.0, 12.0), false)
			elif c_type == "wish_back":
				if tex_wish_board == null:
					reload_ci14_textures()
				if tex_wish_board != null:
					draw_texture_rect(tex_wish_board, Rect2(crect.end.x - 33.0, crect.position.y + 6.0, 24.0, 24.0), false)
			elif c_type == "photo_tour":
				if tex_photo_tour == null:
					reload_ci14_textures()
				if tex_photo_tour != null:
					draw_texture_rect(tex_photo_tour, Rect2(ic_x1, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false)
				if tex_photo_card != null:
					var pc_mod := Color.WHITE if GameManager.is_photo_tour_active() else Color(1.0, 1.0, 1.0, 0.55)
					draw_texture_rect(tex_photo_card, Rect2(ic_x2, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false, pc_mod)
			elif c_type == "wish_board":
				if tex_wish_board == null:
					reload_ci14_textures()
				if tex_wish_board != null:
					draw_texture_rect(tex_wish_board, Rect2(ic_x1, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false)
				if tex_wish_note != null:
					draw_texture_rect(tex_wish_note, Rect2(ic_x2, _card_icon_y(crect, 39.0, ic_sz), ic_sz, ic_sz), false)
			elif c_type == "ci14_codex":
				if tex_photo_album == null:
					reload_ci14_textures()
				if tex_photo_album != null:
					var pa_mod := Color.WHITE if GameManager.get_unlocked_photo_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_photo_album, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, pa_mod)
				if tex_reputation_star != null:
					var rs_mod := Color.WHITE if GameManager.photo_stamps > 0 or GameManager.wish_medals > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_reputation_star, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, rs_mod)
			elif c_type == "kite_festival":
				if tex_kite_festival == null:
					reload_ci13_textures()
				if tex_kite_festival != null:
					draw_texture_rect(tex_kite_festival, Rect2(crect.end.x - 14.0, _card_icon_y(crect, 39.0, 11.0), 11.0, 11.0), false)
			elif c_type == "season_dress":
				var sd_tex: Texture2D = tex_season_decos.get(GameManager.get_current_season_id(), null)
				if sd_tex == null:
					reload_ci13_textures()
					sd_tex = tex_season_decos.get(GameManager.get_current_season_id(), null)
				if sd_tex != null:
					draw_texture_rect(sd_tex, Rect2(crect.end.x - 14.0, _card_icon_y(crect, 39.0, 11.0), 11.0, 11.0), false)
			elif c_type == "ci13_codex":
				if tex_kite_icons.is_empty():
					reload_ci13_textures()
				var kc_ic: Texture2D = tex_kite_icons.get("kite_carp", null)
				if kc_ic != null:
					var kc_mod := Color.WHITE if GameManager.get_unlocked_kite_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(kc_ic, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, kc_mod)
				var sd_ic: Texture2D = tex_season_decos.get(GameManager.get_current_season_id(), null)
				if sd_ic != null:
					draw_texture_rect(sd_ic, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
			elif active_tab == 0 and i == 13:
				var pk_icon_id := "clay_lump" if not GameManager.pottery_kiln_unlocked else GameManager.active_pottery_recipe_id
				if not tex_pottery_icons.has(pk_icon_id):
					reload_ci12_textures()
				var pk_ic: Texture2D = tex_pottery_icons.get(pk_icon_id, null)
				if pk_ic != null:
					draw_texture_rect(pk_ic, Rect2(crect.end.x - 12.0, _card_icon_y(crect, 40.0, 9.5), 9.5, 9.5), false)
			elif active_tab == 2 and i == 13:
				if tex_sports_flag == null:
					reload_ci12_textures()
				if tex_sports_flag != null:
					draw_texture_rect(tex_sports_flag, Rect2(crect.end.x - 12.0, _card_icon_y(crect, 39.0, 9.5), 9.5, 9.5), false)
			elif active_tab == 3 and i == 13:
				if tex_gold_ribbon_medal == null or not tex_pottery_icons.has("pottery_vase"):
					reload_ci12_textures()
				var vase_ic: Texture2D = tex_pottery_icons.get("pottery_vase", null)
				if vase_ic != null:
					var vase_mod := Color.WHITE if GameManager.get_unlocked_pottery_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(vase_ic, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, vase_mod)
				if tex_gold_ribbon_medal != null:
					var md_mod := Color.WHITE if GameManager.sports_medals > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_gold_ribbon_medal, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, md_mod)
			elif active_tab == 0 and i == 12:
				var dw_icon_id := "dairy_milk" if not GameManager.dairy_workshop_unlocked else GameManager.active_dairy_recipe_id
				if not tex_dairy_icons.has(dw_icon_id):
					reload_ci11_textures()
				var dw_ic: Texture2D = tex_dairy_icons.get(dw_icon_id, null)
				if dw_ic != null:
					draw_texture_rect(dw_ic, Rect2(crect.end.x - 13.0, _card_icon_y(crect, 40.0, 10.0), 10.0, 10.0), false)
			elif active_tab == 2 and i == 12:
				if tex_movie_ticket == null:
					reload_ci11_textures()
				if tex_movie_ticket != null:
					draw_texture_rect(tex_movie_ticket, Rect2(crect.end.x - 13.0, _card_icon_y(crect, 39.0, 10.0), 10.0, 10.0), false)
			elif active_tab == 3 and i == 12:
				if tex_movie_ticket == null or not tex_dairy_icons.has("dairy_cloud_pudding"):
					reload_ci11_textures()
				var pud_ic: Texture2D = tex_dairy_icons.get("dairy_cloud_pudding", null)
				if pud_ic != null:
					var pud_mod := Color.WHITE if GameManager.get_unlocked_dairy_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(pud_ic, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, pud_mod)
				if tex_movie_ticket != null:
					var tk_mod := Color.WHITE if GameManager.get_unlocked_film_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_movie_ticket, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, tk_mod)
			elif active_tab == 0 and i == 11:
				if tex_seafood_catch == null:
					reload_ci10_textures()
				if tex_seafood_catch != null:
					draw_texture_rect(tex_seafood_catch, Rect2(crect.end.x - 14.0, _card_icon_y(crect, 40.0, 11.0), 11.0, 11.0), false)
			elif active_tab == 2 and i == 11:
				if tex_auction_gavel == null:
					reload_ci10_textures()
				if tex_auction_gavel != null:
					draw_texture_rect(tex_auction_gavel, Rect2(crect.end.x - 14.0, _card_icon_y(crect, 39.0, 11.0), 11.0, 11.0), false)
			elif active_tab == 3 and i == 11:
				if tex_rare_specialty_box == null or tex_auction_gavel == null:
					reload_ci10_textures()
				if tex_rare_specialty_box != null:
					var box_mod := Color.WHITE if GameManager.get_unlocked_auction_lot_count() > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_rare_specialty_box, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, box_mod)
				if tex_auction_gavel != null:
					var gavel_mod := Color.WHITE if GameManager.auction_gavel_medals > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_auction_gavel, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, gavel_mod)
			elif active_tab == 0 and i == 7:
				var hs_bid_0 := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(hs_bid_0):
					reload_ci6_textures()
				var hs_ic_0: Texture2D = tex_bath_icons.get(hs_bid_0, tex_bath_icons.get("bath_mugwort_warm", null))
				if hs_ic_0 != null:
					draw_texture_rect(hs_ic_0, Rect2(crect.end.x - 16.0, _card_icon_y(crect, 40.0, 13.0), 13.0, 13.0), false)
			elif active_tab == 0 and i == 8:
				var wm_bid_0 := GameManager.active_windmill_bread_id
				if not tex_bakery_icons.has(wm_bid_0):
					reload_ci7_textures()
				var wm_ic_0: Texture2D = tex_bakery_icons.get(wm_bid_0, tex_bakery_icons.get("bread_cloud_souffle", null))
				if wm_ic_0 != null:
					draw_texture_rect(wm_ic_0, Rect2(crect.end.x - 16.0, _card_icon_y(crect, 40.0, 13.0), 13.0, 13.0), false)
			elif active_tab == 0 and i == 9:
				var tp_tid_0 := GameManager.active_tea_recipe_id
				if not tex_tea_icons.has(tp_tid_0):
					reload_ci8_textures()
				var tp_ic_0: Texture2D = tex_tea_icons.get(tp_tid_0, tex_tea_icons.get("tea_cloud_longjing", null))
				if tp_ic_0 != null:
					draw_texture_rect(tp_ic_0, Rect2(crect.end.x - 15.0, _card_icon_y(crect, 40.0, 12.0), 12.0, 12.0), false)
			elif active_tab == 0 and i == 10:
				var cp_did_0 := GameManager.active_tasting_dish_id
				if not tex_dish_icons.has(cp_did_0):
					reload_ci9_textures()
				var cp_ic_0: Texture2D = tex_dish_icons.get(cp_did_0, tex_dish_icons.get("dish_cloud_dumplings", null))
				if cp_ic_0 != null:
					draw_texture_rect(cp_ic_0, Rect2(crect.end.x - 14.0, _card_icon_y(crect, 40.0, 11.0), 11.0, 11.0), false)
			elif active_tab == 2 and i == 10:
				if tex_lantern_festival == null:
					reload_ci9_textures()
				if tex_lantern_festival != null:
					draw_texture_rect(tex_lantern_festival, Rect2(crect.end.x - 15.0, _card_icon_y(crect, 39.0, 12.0), 12.0, 12.0), false)
			elif active_tab == 3 and i == 10:
				var cur_dish := GameManager.active_tasting_dish_id
				if not tex_dish_icons.has(cur_dish) or tex_chef_medal == null:
					reload_ci9_textures()
				var dish_icon: Texture2D = tex_dish_icons.get(cur_dish, tex_dish_icons.get("dish_cloud_dumplings", null))
				if dish_icon != null:
					draw_texture_rect(dish_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if tex_chef_medal != null:
					var medal_mod := Color.WHITE if GameManager.chef_medals > 0 else Color(0.30, 0.26, 0.22, 0.45)
					draw_texture_rect(tex_chef_medal, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false, medal_mod)
			elif active_tab == 2 and i == 5:
				if tex_bulk_order == null:
					reload_ci4_textures()
				if tex_bulk_order != null:
					draw_texture_rect(tex_bulk_order, Rect2(crect.end.x - 17.0, _card_icon_y(crect, 39.0, 14.0), 14.0, 14.0), false)
			elif active_tab == 2 and i == 6:
				var sb_icon_2: Texture2D = tex_souvenir_icons.get("souvenir_box_royal", null)
				if sb_icon_2 == null:
					reload_ci5_textures()
					sb_icon_2 = tex_souvenir_icons.get("souvenir_box_royal", null)
				if sb_icon_2 != null:
					draw_texture_rect(sb_icon_2, Rect2(crect.end.x - 17.0, _card_icon_y(crect, 39.0, 14.0), 14.0, 14.0), false)
			elif active_tab == 2 and i == 7:
				var hs_bid_2 := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(hs_bid_2) or tex_vip_hotspring_guest == null:
					reload_ci6_textures()
				var hs_ic_2: Texture2D = tex_bath_icons.get(hs_bid_2, tex_bath_icons.get("bath_mugwort_warm", null))
				if hs_ic_2 != null:
					draw_texture_rect(hs_ic_2, Rect2(crect.end.x - 17.0, _card_icon_y(crect, 39.0, 14.0), 14.0, 14.0), false)
			elif active_tab == 2 and i == 8:
				if tex_parade_float == null:
					reload_ci7_textures()
				if tex_parade_float != null:
					draw_texture_rect(tex_parade_float, Rect2(crect.end.x - 17.0, _card_icon_y(crect, 39.0, 14.0), 14.0, 14.0), false)
			elif active_tab == 2 and i == 9:
				if tex_moon_tea_boat == null:
					reload_ci8_textures()
				if tex_moon_tea_boat != null:
					draw_texture_rect(tex_moon_tea_boat, Rect2(crect.end.x - 16.0, _card_icon_y(crect, 39.0, 13.0), 13.0, 13.0), false)
			elif active_tab == 3 and i < 4:
				if tex_crops != null:
					draw_texture_rect_region(tex_crops, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), Rect2(3.0 * 40.0, float(i) * 40.0, 40.0, 40.0))
				if tex_delicacies != null:
					draw_texture_rect_region(tex_delicacies, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), Rect2(float(i) * 36.0, 0.0, 36.0, 36.0))
			elif active_tab == 3 and i == 5:
				var cur_sd := GameManager.get_current_solar_dish_id()
				if not tex_solar_dishes.has(cur_sd) or tex_solar_dishes[cur_sd] == null or tex_rare_voucher == null:
					reload_ci4_textures()
				var sd_icon: Texture2D = tex_solar_dishes.get(cur_sd, null)
				if sd_icon != null:
					draw_texture_rect(sd_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if tex_rare_voucher != null:
					draw_texture_rect(tex_rare_voucher, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 6:
				var cur_fl := GameManager.active_greenhouse_flora_id
				if not tex_flora_icons.has(cur_fl) or not tex_souvenir_icons.has("souvenir_box_floral"):
					reload_ci5_textures()
				var fl_icon: Texture2D = tex_flora_icons.get(cur_fl, tex_flora_icons.get("flora_stardew_lily", null))
				var bx_id := "souvenir_box_royal" if bool(GameManager.unlocked_souvenirs.get("souvenir_box_royal", false)) else "souvenir_box_floral"
				var bx_icon: Texture2D = tex_souvenir_icons.get(bx_id, null)
				if fl_icon != null:
					draw_texture_rect(fl_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if bx_icon != null:
					draw_texture_rect(bx_icon, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 7:
				var cur_bath := GameManager.active_hotspring_bath_id
				if not tex_bath_icons.has(cur_bath) or tex_vip_hotspring_guest == null:
					reload_ci6_textures()
				var bath_icon: Texture2D = tex_bath_icons.get(cur_bath, tex_bath_icons.get("bath_mugwort_warm", null))
				if bath_icon != null:
					draw_texture_rect(bath_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if tex_vip_hotspring_guest != null:
					draw_texture_rect(tex_vip_hotspring_guest, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 8:
				var cur_bread := GameManager.active_windmill_bread_id
				if not tex_bakery_icons.has(cur_bread) or tex_parade_float == null:
					reload_ci7_textures()
				var bread_icon: Texture2D = tex_bakery_icons.get(cur_bread, tex_bakery_icons.get("bread_cloud_souffle", null))
				if bread_icon != null:
					draw_texture_rect(bread_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if tex_parade_float != null:
					draw_texture_rect(tex_parade_float, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
			elif active_tab == 3 and i == 9:
				var cur_tea := GameManager.active_tea_recipe_id
				if not tex_tea_icons.has(cur_tea) or tex_moon_tea_boat == null:
					reload_ci8_textures()
				var tea_icon: Texture2D = tex_tea_icons.get(cur_tea, tex_tea_icons.get("tea_cloud_longjing", null))
				if tea_icon != null:
					draw_texture_rect(tea_icon, Rect2(ic_x1, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)
				if tex_moon_tea_boat != null:
					draw_texture_rect(tex_moon_tea_boat, Rect2(ic_x2, _card_icon_y(crect, 37.0, ic_sz), ic_sz, ic_sz), false)

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
