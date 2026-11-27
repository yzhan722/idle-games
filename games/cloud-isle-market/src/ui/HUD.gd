extends Control
class_name HUD
## Desktop strip HUD (`src/ui/HUD.gd`): the bottom bar, the collapsed capsule, the news banner, the festival chips and the
## hover hint. The four menu tabs and the settings live in `MenuWindow`, a window of its own above the strip.
## - Text is native `Label` at its real font size (GEMINI.md Law 5): never scaled, never below `UiKit.MIN`.
## - `open_drawer(tab)` / `close_drawer()` are the deterministic API for the player's clicks and for `SelfTestRunner.gd`.

const TAB_COUNT := 5
const FULL_BAR_RECT := Rect2(480.0, 230.0, 960.0, 58.0)
const CAPSULE_RECT := Rect2(700.0, 236.0, 520.0, 42.0)
const BANNER_MAX_W := 900.0
const CAPSULE_OPACITY := 0.88
const MENU_REFRESH_SEC := 0.2

## Tab 0: card order (index = action order); every card also carries the isle section it is shown under
const BUILD_ORDER: Array[String] = ["soil_1", "mortar", "stall", "cauldron", "soil_2", "soil_3", "greenhouse", "hotspring", "windmill", "tea_pavilion", "chef_pavilion", "lighthouse_harbor", "dairy_workshop", "pottery_kiln"]
## Special buildings: [name key, "unlocked" property, build cost]
const BUILD_SPECIAL: Dictionary = {
	"greenhouse": ["cd_gh_new", "greenhouse_unlocked", EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD],
	"hotspring": ["cd_hs_new", "hotspring_unlocked", EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD],
	"windmill": ["cd_wm_new", "windmill_unlocked", EconomyConfig.WINDMILL_UNLOCK_COST_GOLD],
	"tea_pavilion": ["cd_tp_new", "tea_pavilion_unlocked", EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD],
	"chef_pavilion": ["cd_cp_new", "chef_pavilion_unlocked", EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD],
	"lighthouse_harbor": ["cd_lh_new", "lighthouse_harbor_unlocked", EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD],
	"dairy_workshop": ["cd_dw_new", "dairy_workshop_unlocked", EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD],
	"pottery_kiln": ["cd_pk_new", "pottery_kiln_unlocked", EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD]
}
const SECTIONS: Array = [
	["sec_isle1", "sec_isle2", "sec_isle3"],
	[""],
	["sec_expand", "sec_orders", "sec_fest"],
	["sec_food", "sec_theme", "sec_honor"],
	[]
]
const NAV_KEYS: Array[String] = ["nav_build", "nav_animal", "nav_expand", "nav_codex", "nav_settings"]
const SETTINGS_TAB := 4

var active_tab: int = 0
var wish_board_view: bool = false
var birthday_view: bool = false
var food_week_view: bool = false
var friendship_view: bool = false
var featured_view: bool = false
var guest_view: bool = false
var decor_view: bool = false
var guest_popup: GuestPopup
var _feat_pill: PanelContainer
var _feat_icon: TextureRect
var _feat_dish := ""
var _gift_pill: PanelContainer
var _amber_pill: PanelContainer
var lbl_bar_gift: Label
var displayed_gold: float = 120.0
var is_mouse_over_hud: bool = false
var is_collapsed_capsule: bool = false
var boss_stealth_mode: bool = false
## True while the menu window is open
var drawer_expanded: bool = false
var mouse_outside_timer: float = 0.0
var hud_opacity: float = 1.0
var offline_banner_timer: float = 0.0
var offline_banner_text: String = ""

var menu: MenuWindow
## Card labels of the menu, by card index (kept as arrays for `SelfTestRunner.gd`)
var lbl_card_titles: Array[Label] = []
var lbl_card_costs: Array[Label] = []
var lbl_emp_names: Array[Label] = []
var lbl_drawer_title: Label

var lbl_offline: Label
var lbl_bar_gold: Label
var lbl_bar_amber: Label
var lbl_bar_pipeline: Label
var lbl_bar_pomodoro: Label
var lbl_tabs: Array[Label] = []
var lbl_capsule_gold: Label
var lbl_capsule_info: Label
var lbl_hint_title: Label
var lbl_hint_text: Label

var bar_root: PanelContainer
var capsule_root: PanelContainer
var banner_root: PanelContainer
var hint_root: PanelContainer
var chips_left: HBoxContainer
var chips_right: HBoxContainer
var _tab_buttons: Array[TextureRect] = []
var _tab_badges: Array[Label] = []
var _pomo_pill: PanelContainer
var _capsule_focus: Label
var _capsule_item: TextureRect
var _chip_pool: Array[Dictionary] = []
var _menu_refresh: float = 0.0
var _hover_tab: int = -1
var _press_target := ""
var _order_item := "?"
var _bar_item: TextureRect

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	displayed_gold = float(GameManager.gold)
	if GameManager.pending_offline_gold > 0:
		_show_offline_welcome_banner(GameManager.pending_offline_seconds, GameManager.pending_offline_gold)
	elif GameManager.can_prepare_birthday_gift():
		# today's birthday was announced before the HUD existed -> show its banner once at start-up
		offline_banner_timer = 6.0
		offline_banner_text = _birthday_today_banner(GameManager.birthday_today_islander)
	_connect_events()
	_build_bar()
	_build_capsule()
	_build_banner()
	_build_hint()
	_build_chips()
	guest_popup = GuestPopup.new()
	guest_popup.name = "GuestPopup"
	add_child(guest_popup)
	guest_popup.taken.connect(_sync_label_nodes)
	menu = MenuWindow.new()
	menu.name = "MenuWindow"
	add_child(menu)
	menu.card_activated.connect(_on_menu_card)
	menu.emp_activated.connect(_on_menu_emp)
	menu.tab_requested.connect(_on_tab_pressed)
	menu.back_requested.connect(_on_menu_back)
	menu.setting_requested.connect(_on_setting)
	menu.close_wanted.connect(func() -> void: close_drawer(false))
	menu.bulk_requested.connect(func() -> void:
		GameManager.cycle_bulk_mode()
		_sync_label_nodes())
	_sync_label_nodes()
	# gifts waiting from the time away: one small card, once
	if GameManager.get_pending_guest_count() > 0 and not GameManager.is_automated_test_mode:
		guest_popup.open.call_deferred()

## i18n: `_t(key)` = text of `key` in the current UI language, `_tf(key, args)` = the same `%`-formatted,
## `_n(zh)` = a data name / tag (zh source text from EconomyConfig) in the current language
func _t(key: String) -> String:
	return EconomyConfig.tr_key(key)

func _tf(key: String, args: Array) -> String:
	return EconomyConfig.tr_fmt(key, args)

func _n(zh_name: String) -> String:
	return EconomyConfig.tr_name(zh_name)

## i18n: a banner is composed once in the language of its moment -> a language switch drops the one on screen instead of
## leaving it half in the old language; every other HUD text is rebuilt on the next sync
func _on_language_changed() -> void:
	offline_banner_timer = 0.0
	if lbl_offline != null:
		_sync_label_nodes()

## ------------------------------------------------------------------------------------------------------------------
## Building the strip
## ------------------------------------------------------------------------------------------------------------------
func _pill(min_w: float) -> Array:
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(min_w, 40.0)
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", UiKit.pill_box([10, 2, 10, 2]))
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(h)
	return [p, h]

func _build_bar() -> void:
	bar_root = PanelContainer.new()
	bar_root.name = "BottomBar"
	bar_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_root.position = FULL_BAR_RECT.position
	bar_root.custom_minimum_size = FULL_BAR_RECT.size
	bar_root.add_theme_stylebox_override("panel", UiKit.box("ui/panel_wood_9patch.png", [150, 14, 150, 14], [40, 2, 40, 2]))
	add_child(bar_root)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar_root.add_child(row)

	var gold := _pill(140.0)
	var gi := UiKit.icon_rect(26.0)
	gi.texture = MenuCard.currency_icon("gold")
	gold[1].add_child(gi)
	lbl_bar_gold = UiKit.label("0", 20, UiKit.GOLD, true, 4)
	gold[1].add_child(lbl_bar_gold)
	row.add_child(gold[0])

	var amber := _pill(88.0)
	_amber_pill = amber[0]
	var ai := UiKit.icon_rect(24.0)
	ai.texture = MenuCard.currency_icon("amber")
	amber[1].add_child(ai)
	lbl_bar_amber = UiKit.label("0", 20, UiKit.BLUE, true, 4)
	amber[1].add_child(lbl_bar_amber)
	row.add_child(amber[0])

	# the running order: what is wanted and how many are in
	var order := _pill(104.0)
	_bar_item = UiKit.icon_rect(28.0)
	order[1].add_child(_bar_item)
	lbl_bar_pipeline = UiKit.label("", 19, UiKit.CREAM, true, 4)
	order[1].add_child(lbl_bar_pipeline)
	row.add_child(order[0])

	var pomo := _pill(50.0)
	_pomo_pill = pomo[0]
	var pi := UiKit.icon_rect(26.0)
	pi.texture = UiKit.atlas("crops/crops_sheet_normalized.png", Rect2(120.0, 40.0, 40.0, 40.0))
	pomo[1].add_child(pi)
	lbl_bar_pomodoro = UiKit.label("", 19, UiKit.GOLD, true, 4)
	pomo[1].add_child(lbl_bar_pomodoro)
	row.add_child(_pomo_pill)

	# the dish of the day, and the gifts guests left
	var feat := _pill(50.0)
	_feat_pill = feat[0]
	_feat_icon = UiKit.icon_rect(32.0)
	_feat_icon.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	feat[1].add_child(_feat_icon)
	row.add_child(_feat_pill)
	var gift := _pill(50.0)
	_gift_pill = gift[0]
	var gfi := UiKit.icon_rect(28.0)
	gfi.texture = load(EconomyConfig.BIRTHDAY_GIFT_TEX)
	gift[1].add_child(gfi)
	lbl_bar_gift = UiKit.label("", 19, UiKit.GREEN, true, 4)
	gift[1].add_child(lbl_bar_gift)
	row.add_child(_gift_pill)
	var gap := Control.new()
	gap.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(gap)

	for i in range(TAB_COUNT):
		var cell := Control.new()
		cell.custom_minimum_size = Vector2(64.0, 54.0)
		cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(cell)
		var ic := UiKit.icon_rect(38.0)
		ic.position = Vector2(13.0, -12.0)
		ic.size = Vector2(38.0, 38.0)
		ic.texture = UiKit.atlas("ui/icons_ui.png", Rect2(float(MenuWindow.TAB_ICONS[i]) * 48.0, 0.0, 48.0, 48.0))
		cell.add_child(ic)
		_tab_buttons.append(ic)
		var tl := UiKit.label("", 18, UiKit.GOLD, true, 6)
		tl.position = Vector2(-6.0, 25.0)
		tl.size = Vector2(76.0, 24.0)
		tl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cell.add_child(tl)
		lbl_tabs.append(tl)
		var bd := UiKit.label("", 15, UiKit.GREEN, true)
		bd.add_theme_stylebox_override("normal", UiKit.box("ui/ui_resource_pill.png", [12, 10, 12, 10], [6, 0, 6, 0]))
		bd.position = Vector2(42.0, -18.0)
		cell.add_child(bd)
		_tab_badges.append(bd)

func _build_capsule() -> void:
	capsule_root = PanelContainer.new()
	capsule_root.name = "Capsule"
	capsule_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	capsule_root.add_theme_stylebox_override("panel", UiKit.pill_box([14, 4, 14, 4]))
	add_child(capsule_root)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 10)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	capsule_root.add_child(h)
	var gi := UiKit.icon_rect(28.0)
	gi.texture = MenuCard.currency_icon("gold")
	h.add_child(gi)
	lbl_capsule_gold = UiKit.label("0", 20, UiKit.GOLD, true, 4)
	h.add_child(lbl_capsule_gold)
	_capsule_item = UiKit.icon_rect(28.0)
	h.add_child(_capsule_item)
	lbl_capsule_info = UiKit.label("", 19, UiKit.CREAM, true, 4)
	h.add_child(lbl_capsule_info)
	_capsule_focus = UiKit.label("", 19, UiKit.GREEN, true, 4)
	h.add_child(_capsule_focus)

func _build_banner() -> void:
	banner_root = PanelContainer.new()
	banner_root.name = "NewsBanner"
	banner_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	banner_root.add_theme_stylebox_override("panel", UiKit.pill_box([18, 3, 18, 3]))
	add_child(banner_root)
	lbl_offline = UiKit.label("", 17, UiKit.GOLD, true, 4)
	lbl_offline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_root.add_child(lbl_offline)

func _build_hint() -> void:
	hint_root = PanelContainer.new()
	hint_root.name = "HoverHint"
	hint_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hint_root.add_theme_stylebox_override("panel", UiKit.pill_box([14, 5, 14, 6]))
	hint_root.visible = false
	add_child(hint_root)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 0)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hint_root.add_child(v)
	lbl_hint_title = UiKit.label("", 17, UiKit.GOLD, true, 4)
	v.add_child(lbl_hint_title)
	lbl_hint_text = UiKit.label("", 16, UiKit.CREAM, false, 4)
	v.add_child(lbl_hint_text)

func _build_chips() -> void:
	chips_left = HBoxContainer.new()
	chips_right = HBoxContainer.new()
	for b in [chips_left, chips_right]:
		b.add_theme_constant_override("separation", 6)
		b.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(b)

## ------------------------------------------------------------------------------------------------------------------
## Opening and closing
## ------------------------------------------------------------------------------------------------------------------
func _clear_views() -> void:
	wish_board_view = false
	birthday_view = false
	food_week_view = false
	friendship_view = false
	featured_view = false
	guest_view = false
	decor_view = false

func set_boss_stealth(stealth_on: bool) -> void:
	boss_stealth_mode = stealth_on
	if stealth_on:
		_hide_menu()
		if guest_popup != null:
			guest_popup.hide()
		is_collapsed_capsule = true
		hud_opacity = 0.25
	else:
		is_collapsed_capsule = false
		hud_opacity = 1.0
	modulate.a = hud_opacity
	_sync_label_nodes()

func _hide_menu() -> void:
	drawer_expanded = false
	if menu != null:
		menu.hide()

func open_drawer(tab_idx: int = 0) -> void:
	active_tab = clampi(tab_idx, 0, SETTINGS_TAB)
	_clear_views()
	boss_stealth_mode = false
	mouse_outside_timer = 0.0
	is_collapsed_capsule = false
	drawer_expanded = true
	hud_opacity = 1.0
	modulate.a = 1.0
	if menu != null:
		menu.open()
	_sync_label_nodes()

func close_drawer(collapse_to_capsule: bool = false) -> void:
	_hide_menu()
	is_collapsed_capsule = collapse_to_capsule
	hud_opacity = CAPSULE_OPACITY if collapse_to_capsule else 1.0
	modulate.a = hud_opacity
	mouse_outside_timer = 3.5 if collapse_to_capsule else 0.0
	_sync_label_nodes()

func _process(delta: float) -> void:
	displayed_gold = lerpf(displayed_gold, float(GameManager.gold), minf(1.0, delta * 9.0))
	if absf(displayed_gold - float(GameManager.gold)) < 0.6:
		displayed_gold = float(GameManager.gold)
	if offline_banner_timer > 0.0:
		offline_banner_timer = maxf(0.0, offline_banner_timer - delta)

	var mpos := get_local_mouse_position()
	is_mouse_over_hud = get_hud_Hit_rect().has_point(mpos)
	if boss_stealth_mode:
		is_collapsed_capsule = true
		hud_opacity = 0.25
	elif drawer_expanded or not GameManager.desktop_companion_mode:
		is_collapsed_capsule = false
		hud_opacity = 1.0
		mouse_outside_timer = 0.0
	elif is_mouse_over_hud:
		mouse_outside_timer = 0.0
		is_collapsed_capsule = false
		hud_opacity = lerpf(hud_opacity, 1.0, minf(1.0, delta * 10.0))
	else:
		mouse_outside_timer += delta
		if mouse_outside_timer >= 3.0:
			is_collapsed_capsule = true
			hud_opacity = lerpf(hud_opacity, CAPSULE_OPACITY, minf(1.0, delta * 5.0))
	var win_alpha: float = WindowController.get_window_opacity() if WindowController != null else 1.0
	modulate.a = hud_opacity * win_alpha

	var hov := -1
	if not is_collapsed_capsule:
		for i in range(TAB_COUNT):
			if _get_tab_button_rect(i).has_point(mpos):
				hov = i
				break
	if hov != _hover_tab:
		_hover_tab = hov
		if hov >= 0 and SoundManager != null:
			SoundManager.play_hover_sfx()

	_sync_strip()
	_menu_refresh -= delta / maxf(0.01, Engine.time_scale)
	if drawer_expanded and _menu_refresh <= 0.0:
		_sync_menu()

## Full refresh: the strip, and the menu while it is open
func _sync_label_nodes() -> void:
	if bar_root == null:
		return
	_sync_strip()
	if drawer_expanded:
		_sync_menu()

func _gold_text() -> String:
	return UiKit.num(int(round(displayed_gold)))

func _sync_strip() -> void:
	var amber_cnt := GameManager.get_amber()
	var contract: Dictionary = GameManager.get_active_contract()
	var c_item := String(contract.get("target_item", ""))
	var c_cur := int(contract.get("current_count", 0))
	var c_req := int(contract.get("required_count", 5))
	var order_txt := "%d/%d" % [c_cur, c_req]
	if c_item != _order_item:
		_order_item = c_item
		_bar_item.texture = item_icon(c_item)
		_capsule_item.texture = _bar_item.texture

	# the menu shows the news in its own footer while it is open
	banner_root.visible = offline_banner_timer > 0.0 and not boss_stealth_mode and not drawer_expanded
	if lbl_offline.text != offline_banner_text:
		lbl_offline.text = offline_banner_text
	if banner_root.visible:
		_set_banner_size()

	capsule_root.visible = is_collapsed_capsule
	lbl_capsule_gold.text = _gold_text()
	lbl_capsule_info.text = _t("ui_cap_stealth") if boss_stealth_mode else order_txt
	_capsule_focus.visible = GameManager.pomodoro_active and not boss_stealth_mode
	_capsule_focus.text = GameManager.get_pomodoro_formatted_time()
	_capsule_item.visible = not boss_stealth_mode
	if is_collapsed_capsule:
		capsule_root.size = capsule_root.get_combined_minimum_size()
		capsule_root.position = Vector2(roundf(960.0 - capsule_root.size.x * 0.5), CAPSULE_RECT.position.y)

	bar_root.visible = not is_collapsed_capsule
	lbl_bar_gold.text = _gold_text()
	lbl_bar_amber.text = UiKit.num(amber_cnt)
	lbl_bar_pipeline.text = order_txt
	lbl_bar_pipeline.label_settings.font_color = UiKit.GREEN if (c_req > 0 and c_cur * 5 >= c_req * 4) else UiKit.CREAM
	if GameManager.pomodoro_active:
		lbl_bar_pomodoro.text = GameManager.get_pomodoro_formatted_time()
		lbl_bar_pomodoro.label_settings.font_color = UiKit.GREEN
	else:
		lbl_bar_pomodoro.text = _t("ui_focus25")
		lbl_bar_pomodoro.label_settings.font_color = UiKit.GOLD
	# the focus timer takes the room of the amber pill while it runs
	lbl_bar_pomodoro.visible = GameManager.pomodoro_active
	_amber_pill.visible = not GameManager.pomodoro_active
	if GameManager.featured_dish != _feat_dish:
		_feat_dish = GameManager.featured_dish
		_feat_icon.texture = dish_icon(_feat_dish)
	_gift_pill.visible = GameManager.get_pending_guest_count() > 0
	lbl_bar_gift.text = str(GameManager.get_pending_guest_count())
	for i in range(TAB_COUNT):
		var cur := drawer_expanded and i == active_tab
		lbl_tabs[i].text = _t(NAV_KEYS[i])
		lbl_tabs[i].label_settings.font_color = Color("#FFF9DB") if cur else UiKit.GOLD
		_tab_buttons[i].position.y = -15.0 if (cur or _hover_tab == i) else -12.0
		_tab_buttons[i].modulate = Color(1.18, 1.14, 1.05) if (cur or _hover_tab == i) else Color.WHITE
		# one badge only: a birthday gift waiting to be given
		_tab_badges[i].visible = i == 2 and GameManager.can_prepare_birthday_gift()
		_tab_badges[i].text = "1"
	_sync_chips()

func _set_banner_size() -> void:
	var raw := UiKit.text_width(lbl_offline) + 4.0
	var wrap := raw > BANNER_MAX_W - 36.0
	lbl_offline.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	lbl_offline.custom_minimum_size.x = (BANNER_MAX_W - 36.0) if wrap else raw
	banner_root.size = banner_root.get_combined_minimum_size()
	banner_root.position = Vector2(roundf(960.0 - banner_root.size.x * 0.5), 4.0)

## Festivals running now: [icon, time left in seconds (< 0 = no countdown)]
func get_running_events() -> Array:
	var ev: Array = []
	if GameManager.frenzy_timer > 0.0:
		ev.append([_tex(EconomyConfig.REPUTATION_STAR_TEX), GameManager.frenzy_timer])
	if GameManager.is_gourmet_parade_active():
		ev.append([_tex(EconomyConfig.ICON_PARADE_FLOAT_TEX), GameManager.parade_festival_timer])
	if GameManager.is_moon_tea_gathering_active():
		ev.append([_tex(EconomyConfig.ICON_MOON_TEA_BOAT_TEX), GameManager.moon_tea_gathering_timer])
	if GameManager.is_wish_lantern_festival_active():
		ev.append([_tex(EconomyConfig.STAR_LANTERN_TEX), GameManager.wish_lantern_festival_timer])
	if GameManager.is_kite_festival_active():
		ev.append([_tex(EconomyConfig.ICON_KITE_FESTIVAL_TEX), float(GameManager.get_kite_status_summary()["seconds_left"])])
	if GameManager.is_cinema_screening_active():
		ev.append([_tex(EconomyConfig.ICON_MOVIE_TICKET_TEX), float(GameManager.get_cinema_status_summary()["remaining"])])
	if GameManager.is_gourmet_acclaim_active():
		ev.append([_tex(EconomyConfig.ICON_CHEF_MEDAL_TEX), GameManager.gourmet_acclaim_timer])
	return ev

## Picture of any item a contract can ask for
func item_icon(id: String) -> Texture2D:
	if EconomyConfig.CROPS.has(id):
		return _crop_icon(id)
	if EconomyConfig.DELICACIES.has(id):
		return _dish_icon(id)
	for cfgs in [EconomyConfig.SOLAR_SPECIALTY_DISHES, EconomyConfig.HYBRID_FLORA, EconomyConfig.SOUVENIR_BOXES, EconomyConfig.HOTSPRING_BATH_BLENDS, EconomyConfig.BAKERY_ITEMS, EconomyConfig.TEA_ITEMS, EconomyConfig.TASTING_DISHES, EconomyConfig.DAIRY_ITEMS, EconomyConfig.POTTERY_ITEMS]:
		if (cfgs as Dictionary).has(id):
			return _item_tex(cfgs, id)
	return null

func _sync_chips() -> void:
	var ev := [] if boss_stealth_mode else get_running_events()
	# room for three chips in each bottom corner, beside the bar
	if ev.size() > 6:
		ev = ev.slice(0, 6)
	while _chip_pool.size() < ev.size():
		var p := PanelContainer.new()
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_theme_stylebox_override("panel", UiKit.pill_box([8, 3, 12, 3]))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 6)
		h.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(h)
		var ic := UiKit.icon_rect(32.0)
		h.add_child(ic)
		var tm := UiKit.label("", 19, UiKit.CREAM, true, 4)
		h.add_child(tm)
		(chips_left if _chip_pool.size() % 2 == 0 else chips_right).add_child(p)
		_chip_pool.append({"root": p, "icon": ic, "time": tm})
	for i in range(_chip_pool.size()):
		var c: Dictionary = _chip_pool[i]
		(c["root"] as Control).visible = i < ev.size()
		if i < ev.size():
			(c["icon"] as TextureRect).texture = ev[i][0]
			(c["time"] as Label).visible = float(ev[i][1]) >= 0.0
			(c["time"] as Label).text = UiKit.clock(float(ev[i][1]))
	for b in [chips_left, chips_right]:
		b.size = b.get_combined_minimum_size()
	chips_left.position = Vector2(40.0, 252.0)
	chips_right.position = Vector2(roundf(1880.0 - chips_right.size.x), 252.0)

## Hover hint: `anchor` is the hovered thing's rect on screen; an empty title hides the hint
func show_hint(title_txt: String, body: String, anchor: Rect2) -> void:
	hint_root.visible = title_txt != "" and not boss_stealth_mode
	if not hint_root.visible:
		return
	lbl_hint_title.text = title_txt
	lbl_hint_text.text = body
	lbl_hint_text.visible = body != ""
	hint_root.size = hint_root.get_combined_minimum_size()
	var px := clampf(anchor.get_center().x - hint_root.size.x * 0.5, 4.0, 1916.0 - hint_root.size.x)
	var py := anchor.position.y - hint_root.size.y - 6.0
	if py < 2.0:
		py = minf(anchor.end.y + 6.0, 296.0 - hint_root.size.y)
	hint_root.position = Vector2(roundf(px), roundf(py))

## ------------------------------------------------------------------------------------------------------------------
## The menu window
## ------------------------------------------------------------------------------------------------------------------
func _sync_menu() -> void:
	_menu_refresh = MENU_REFRESH_SEC
	if menu == null:
		return
	menu.place(true)
	lbl_drawer_title = menu.lbl_title
	menu.lbl_gold.text = _gold_text()
	menu.lbl_amber.text = UiKit.num(GameManager.get_amber())
	menu.lbl_voucher.text = UiKit.num(GameManager.get_rare_vouchers())
	menu.lbl_star.text = str(GameManager.get_star_reputation())
	if active_tab == SETTINGS_TAB:
		menu.show_settings(_get_settings_rows())
	else:
		menu.show_cards(active_tab, _view_id(), SECTIONS[active_tab] if _view_id() == "" else [], _get_current_tab_cards(), _get_emp_cards() if active_tab == 3 and _view_id() == "" else [])
	menu.set_bulk(active_tab <= 1 and _view_id() == "", _t({1: "bk_1", 10: "bk_10", -1: "bk_max"}[GameManager.bulk_mode]), GameManager.bulk_mode != 1)
	menu.set_chrome(active_tab, _menu_title(), _view_id() != "", offline_banner_text if offline_banner_timer > 0.0 else "")
	lbl_card_titles.clear()
	lbl_card_costs.clear()
	for c in menu.cards:
		lbl_card_titles.append(c.lbl_title)
		lbl_card_costs.append(c.lbl_cost)
	lbl_emp_names.clear()
	for e in menu.emp_cards:
		lbl_emp_names.append(e.lbl_title)

func _view_id() -> String:
	if active_tab == 2 and wish_board_view:
		return "wish"
	if active_tab == 2 and birthday_view:
		return "birthday"
	if active_tab == 1 and food_week_view:
		return "food"
	if active_tab == 1 and friendship_view:
		return "friend"
	if active_tab == 3 and featured_view:
		return "featured"
	if active_tab == 3 and guest_view:
		return "guests"
	if active_tab == 2 and decor_view:
		return "decor"
	return ""

func _menu_title() -> String:
	match _view_id():
		"wish":
			return _t("nm_wish")
		"birthday":
			return _t("nm_birthday")
		"food":
			return _t("nm_food")
		"friend":
			return _t("nm_friend")
	if active_tab == 3 and featured_view:
		return _t("nm_featured")
	if active_tab == 3 and guest_view:
		return "%s %d/%d" % [_t("sec_guests"), GameManager.get_met_guest_count(), Guests.ORDER.size()]
	if active_tab == 2 and decor_view:
		return _t("sec_deco")
	if active_tab == 3:
		var total := get_codex_progress()
		return "%s %d/%d" % [_t("nav_codex"), int(total[0]), int(total[1])]
	return _t(NAV_KEYS[active_tab])

## Everything the codex collects: [unlocked, total]
func get_codex_progress() -> Array:
	var pairs: Array = [
		[GameManager.get_unlocked_codex_count(), 8], [GameManager.get_unlocked_solar_dish_count(), 4],
		[GameManager.get_unlocked_flora_count(), 2], [GameManager.get_unlocked_souvenir_count(), 2],
		[GameManager.get_unlocked_bath_count(), 3], [GameManager.get_unlocked_bakery_count(), 3],
		[GameManager.get_unlocked_tea_count(), 3], [GameManager.get_passed_tasting_challenge_count(), 3],
		[GameManager.get_unlocked_dairy_count(), 3],
		[GameManager.get_unlocked_film_count(), 3], [GameManager.get_unlocked_pottery_count(), 3],
		[GameManager.get_unlocked_kite_count(), 3],
		[GameManager.get_seen_season_count(), 4], [GameManager.get_met_guest_count(), Guests.ORDER.size()],
		[GameManager.get_seen_sky_weather_count(), EconomyConfig.SKY_WEATHER_ORDER.size()],
		[GameManager.get_celebrated_islander_count(), EconomyConfig.WISH_ISLANDERS.size()],
		[GameManager.get_food_week_dishes_judged(), EconomyConfig.FOOD_WEEK_DISHES.size()]
	]
	var got := 0
	var all := 0
	for p in pairs:
		got += mini(int(p[0]), int(p[1]))
		all += int(p[1])
	return [got, all]

func _on_menu_card(idx: int) -> void:
	if SoundManager != null:
		SoundManager.play_click_sfx()
	_activate_card(idx)
	_sync_label_nodes()

func _on_menu_emp(_idx: int) -> void:
	if SoundManager != null:
		SoundManager.play_click_sfx()

func _on_menu_back() -> void:
	_clear_views()
	_sync_label_nodes()

func _on_tab_pressed(idx: int) -> void:
	if SoundManager != null:
		SoundManager.play_click_sfx()
	if drawer_expanded and idx == active_tab and _view_id() == "":
		return
	open_drawer(idx)

## ------------------------------------------------------------------------------------------------------------------
## Settings
## ------------------------------------------------------------------------------------------------------------------
func _get_settings_rows() -> Array:
	var noise := SoundManager.get_white_noise_status_label() if SoundManager != null else _t("ui_noise_off")
	return [
		{"key": "lang", "label": _t("st_lang"), "options": [["zh_CN", "简体中文"], ["en_US", "English"], ["ja_JP", "日本語"]], "value": EconomyConfig.current_lang},
		{"key": "text", "label": _t("st_text"), "options": [[1.0, _t("st_text_1")], [1.15, _t("st_text_2")], [1.3, _t("st_text_3")]], "value": WindowController.text_scale},
		{"key": "sound", "label": _t("st_sound"), "options": [[true, _t("st_on")], [false, _t("st_off")]], "value": not SoundManager.is_muted},
		{"key": "noise", "label": _t("st_noise"), "options": [[true, _t("st_on")], [false, _t("st_off")]], "value": noise != _t("ui_noise_off")},
		{"key": "pin", "label": _t("st_pin"), "options": [[true, _t("st_on")], [false, _t("st_off")]], "value": GameManager.desktop_companion_mode},
		{"key": "opacity", "label": _t("st_opacity"), "options": [[1.0, "100%"], [0.8, "80%"], [0.6, "60%"]], "value": snappedf(WindowController.get_window_opacity(), 0.1)},
		{"key": "strip", "label": _t("st_strip"), "options": [[0, "75%"], [1, "100%"], [2, "125%"]], "value": WindowController.scale_idx},
		{"key": "dock", "label": _t("st_dock"), "options": [[0, _t("st_dock_b")], [1, _t("st_dock_t")]], "value": int(WindowController.current_dock)},
		{"key": "fps", "label": _t("st_fps"), "options": [[60, "60"], [30, "30"]], "value": WindowController.get_eco_fps()},
		{"key": "quit", "label": _t("st_quit"), "options": [[true, _t("vb_quit")]]}
	]

func _on_setting(key: String, value: Variant) -> void:
	if SoundManager != null:
		SoundManager.play_click_sfx()
	match key:
		"lang":
			EconomyConfig.set_language(String(value))
		"text":
			WindowController.set_text_scale(float(value))
		"sound":
			if SoundManager.is_muted == bool(value):
				SoundManager.toggle_mute()
		"noise":
			var on := SoundManager.get_white_noise_status_label() != _t("ui_noise_off")
			if on != bool(value):
				SoundManager.toggle_white_noise()
		"pin":
			if GameManager.desktop_companion_mode != bool(value):
				_toggle_companion_mode()
		"opacity":
			WindowController.set_window_opacity(float(value))
		"strip":
			WindowController.set_scale_idx(int(value))
		"dock":
			if int(WindowController.current_dock) != int(value):
				WindowController.toggle_dock_position()
			elif int(value) == 0:
				WindowController.snap_to_taskbar()
		"fps":
			WindowController.set_eco_fps(int(value))
		"quit":
			WindowController.save_ui_settings()
			GameManager.quit_game()
			return
	WindowController.save_ui_settings()
	_sync_label_nodes()

func _toggle_companion_mode() -> void:
	GameManager.desktop_companion_mode = not GameManager.desktop_companion_mode
	EventBus.toggle_desktop_mode.emit(GameManager.desktop_companion_mode)
	GameManager.save_game()

## ------------------------------------------------------------------------------------------------------------------
## Strip input
## ------------------------------------------------------------------------------------------------------------------
func _get_tab_button_rect(idx: int) -> Rect2:
	var cell := lbl_tabs[idx].get_parent() as Control
	return Rect2(cell.global_position + Vector2(0.0, -14.0), Vector2(64.0, 66.0))

func _rect_of(c: Control) -> Rect2:
	return Rect2(c.global_position, c.size)

func get_hud_Hit_rect() -> Rect2:
	if is_collapsed_capsule:
		return (_rect_of(capsule_root) if capsule_root != null and capsule_root.size.x > 1.0 else CAPSULE_RECT).grow(8.0)
	return FULL_BAR_RECT.grow(6.0)

## The menu is a window of its own: it takes nothing from the strip's click-through area
func get_active_drawer_rect() -> Rect2:
	return Rect2()

func _gui_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton) or event.button_index != MOUSE_BUTTON_LEFT:
		return
	var mpos: Vector2 = event.position
	if event.pressed:
		_press_target = _bar_target(mpos)
		if Input.is_key_pressed(KEY_ALT) and WindowController != null:
			_press_target = ""
			WindowController.begin_window_drag()
			accept_event()
		elif _press_target == "" and get_hud_Hit_rect().has_point(mpos) and WindowController != null:
			WindowController.begin_window_drag()
			accept_event()
		return
	if WindowController != null and WindowController.is_dragging:
		WindowController.end_window_drag()
		accept_event()
		return
	var target := _bar_target(mpos)
	if target == "" or target != _press_target:
		return
	accept_event()
	if target == "restore":
		WindowController.toggle_boss_stealth()
	elif target == "focus":
		SoundManager.play_click_sfx()
		GameManager.toggle_pomodoro()
	elif target == "featured":
		SoundManager.play_click_sfx()
		open_drawer(3)
		featured_view = true
	elif target == "gifts":
		SoundManager.play_click_sfx()
		guest_popup.open()
	elif target.begins_with("tab"):
		var ti := int(target.substr(3))
		if drawer_expanded and ti == active_tab:
			SoundManager.play_click_sfx()
			close_drawer(false)
		else:
			_on_tab_pressed(ti)
	_sync_label_nodes()

## What a click at `p` would do on the strip ("" = nothing: drags the window)
func _bar_target(p: Vector2) -> String:
	if is_collapsed_capsule:
		return "restore" if boss_stealth_mode and _rect_of(capsule_root).has_point(p) else ""
	if _rect_of(_pomo_pill).has_point(p):
		return "focus"
	if _rect_of(_feat_pill).has_point(p):
		return "featured"
	if _gift_pill.visible and _rect_of(_gift_pill).has_point(p):
		return "gifts"
	for i in range(TAB_COUNT):
		if _get_tab_button_rect(i).has_point(p):
			return "tab%d" % i
	return ""

## ------------------------------------------------------------------------------------------------------------------
## News: one short line each. Running festivals are icons with a countdown, gains are floating numbers; neither needs a line.
## ------------------------------------------------------------------------------------------------------------------
func news(text: String, seconds: float = 3.5) -> void:
	offline_banner_timer = seconds
	offline_banner_text = text
	_sync_label_nodes()

## 24.0 -> `24`, 4.5 -> `4.5`
func _num1(v: float) -> String:
	return ("%.1f" % v).trim_suffix(".0")

func _format_duration_cn(seconds: int) -> String:
	if seconds >= 3600:
		return _tf("ui_dur_hm", [seconds / 3600, (seconds % 3600) / 60])
	elif seconds >= 60:
		return _tf("ui_dur_ms", [seconds / 60, seconds % 60])
	return _tf("ui_dur_s", [seconds])

func _show_offline_welcome_banner(seconds_away: int, gold_earned: int) -> void:
	news(_tf("bn_offline", [_format_duration_cn(seconds_away), UiKit.num(gold_earned)]), 8.0)

func _birthday_today_banner(islander: String) -> String:
	return _tf("bn_bday", [EconomyConfig.get_islander_name(islander)])

func _on_guest_arrived(guest: String, _keep: String) -> void:
	news(_tf("bn_guest", [_t("gu_" + guest)]))

func _exit_tree() -> void:
	UiKit.release()

func _connect_events() -> void:
	if EventBus == null:
		return
	EventBus.language_changed.connect(_on_language_changed)
	EventBus.offline_earnings_ready.connect(_show_offline_welcome_banner)
	EventBus.pomodoro_completed.connect(_on_pomodoro_completed)
	EventBus.airship_bulk_order_completed.connect(_on_airship_bulk_order_completed)
	EventBus.solar_term_changed.connect(_on_solar_term_changed)
	EventBus.season_changed.connect(_on_season_changed)
	EventBus.birthday_started.connect(_on_birthday_started)
	EventBus.birthday_gift_given.connect(_on_birthday_gift_given)
	EventBus.food_week_scored.connect(_on_food_week_scored)
	EventBus.friendship_level_up.connect(_on_friendship_level_up)
	EventBus.guest_arrived.connect(_on_guest_arrived)
	EventBus.guests_waiting.connect(func() -> void:
		if not boss_stealth_mode:
			guest_popup.open.call_deferred())
	EventBus.wish_fulfilled.connect(_on_wish_fulfilled)
	for sig in [EventBus.hybrid_flora_crossbred, EventBus.hotspring_recipe_unlocked, EventBus.bakery_recipe_unlocked, EventBus.tea_recipe_unlocked, EventBus.tasting_dish_unlocked]:
		sig.connect(_on_recipe_learned)
	for pair in [[EventBus.lighthouse_harbor_unlocked_changed, "cd_lh_new"], [EventBus.dairy_workshop_unlocked_changed, "cd_dw_new"], [EventBus.pottery_kiln_unlocked_changed, "cd_pk_new"], [EventBus.open_air_cinema_unlocked_changed, "nm_cinema"]]:
		(pair[0] as Signal).connect(_on_building_opened.bind(String(pair[1])))
	EventBus.gourmet_parade_started.connect(_on_festival_started.bind("nm_parade"))
	EventBus.moon_tea_gathering_started.connect(_on_festival_started.bind("nm_moontea"))
	EventBus.wish_lantern_festival_started.connect(_on_festival_started.bind("nm_lantern"))
	EventBus.kite_festival_started.connect(_on_festival_started.bind("nm_kite"))
	EventBus.kite_festival_ended.connect(_on_kite_festival_ended)
	EventBus.tasting_challenge_judged.connect(_on_tasting_challenge_judged)
	EventBus.chef_medal_awarded.connect(_on_medal)
	EventBus.cinema_medal_awarded.connect(_on_medal)

func _on_festival_started(_info: Variant, name_key: String) -> void:
	news(_tf("bn_start", [_t(name_key)]))

func _on_building_opened(unlocked: bool, name_key: String) -> void:
	if unlocked:
		news(_tf("bn_built", [_t(name_key)]))

func _on_recipe_learned(item_id: String) -> void:
	news(_tf("bn_recipe", [EconomyConfig.get_item_display_name(item_id)]))

func _on_medal(_total: int) -> void:
	news(_t("bn_medal"))

func _on_pomodoro_completed(gold_reward: int, _frenzy_sec: float) -> void:
	if SoundManager != null:
		SoundManager.play_click_sfx()
	news(_tf("bn_pomodoro", [gold_reward]), 6.0)

func _on_airship_bulk_order_completed(order_dict: Dictionary) -> void:
	news(_tf("bn_airship", [int(order_dict.get("reward_amber", 0))]))

func _on_solar_term_changed(_term_idx: int, term_name: String, _dish: String) -> void:
	news(_tf("nm_solar", [_n(term_name)]))

func _on_season_changed(season_id: String) -> void:
	news(_tf("nm_season", [_n(String((EconomyConfig.SEASONS.get(season_id, {}) as Dictionary).get("full_name", season_id)))]))

func _on_birthday_started(islander: String, _date_key: String) -> void:
	news(_birthday_today_banner(islander), 6.0)

func _on_birthday_gift_given(islander: String, _result: Dictionary) -> void:
	news(_tf("bn_gift", [EconomyConfig.get_islander_name(islander)]))

func _on_food_week_scored(res: Dictionary) -> void:
	news(_tf("bn_judged", [EconomyConfig.get_islander_name(String(res.get("judge", ""))), int(res.get("score", 0))]))

func _on_friendship_level_up(islander: String, level: int, _source: String) -> void:
	news(_tf("bn_bond", [EconomyConfig.get_islander_name(islander), level]))

func _on_wish_fulfilled(_slot_idx: int, wish: Dictionary) -> void:
	news(_tf("bn_wish", [EconomyConfig.get_islander_name(String(wish.get("islander", "")))]))

func _on_kite_festival_ended(collected: int, _swept: bool) -> void:
	news(_tf("bn_kites", [collected]))

func _on_tasting_challenge_judged(_dish_id: String, score: int, _passed: bool, _gold: int, _amber: int, _vouchers: int) -> void:
	news(_tf("bn_tasting", [score]))

## Does what tile `idx` of the current view is for
func _activate_card(idx: int) -> void:
	var cards := _get_current_tab_cards()
	if idx < 0 or idx >= cards.size():
		return
	var c: Dictionary = cards[idx]
	var t := String(c["type"])
	var k := String(c["key"])
	var ok := true
	match t:
		"building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0]))
		"animal":
			ok = GameManager.get_total_max_cap(k) > 0 and GameManager.upgrade_animal(k, int(GameManager.get_bulk_animal(k)[0]))
		"unlock_island":
			if not _isle_open(int(k)):
				ok = GameManager.unlock_island(int(k))
		"landscape":
			if not GameManager.is_landscape_unlocked(k) and not GameManager.unlock_landscape(k):
				news(_t("bn_no_amber"))
			return
		"greenhouse_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.greenhouse_unlocked else (_isle_open(2) and GameManager.unlock_greenhouse(false))
		"hotspring_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.hotspring_unlocked else (_isle_open(3) and GameManager.unlock_hotspring_inn(false))
		"windmill_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.windmill_unlocked else (_isle_open(2) and GameManager.unlock_windmill_bakery(false))
		"tea_pavilion_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.tea_pavilion_unlocked else GameManager.unlock_tea_pavilion(false)
		"chef_pavilion_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.chef_pavilion_unlocked else (_isle_open(2) and GameManager.unlock_chef_pavilion(false))
		"lighthouse_harbor_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.lighthouse_harbor_unlocked else (_isle_open(3) and GameManager.unlock_lighthouse_harbor(false))
		"dairy_workshop_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.dairy_workshop_unlocked else GameManager.unlock_dairy_workshop(false)
		"pottery_kiln_building":
			ok = GameManager.upgrade_building(k, int(GameManager.get_bulk_building(k)[0])) if GameManager.pottery_kiln_unlocked else (_isle_open(3) and GameManager.unlock_pottery_kiln(false))
		"souvenir_workshop":
			if not GameManager.greenhouse_unlocked:
				ok = GameManager.unlock_greenhouse(false)
			elif not bool(GameManager.bundle_souvenir_gift_box("", true).get("bundled", false)):
				news(_t("bn_no_items"))
				return
		"hotspring_brew":
			if not GameManager.hotspring_unlocked:
				ok = GameManager.unlock_hotspring_inn(false)
			else:
				var bath := GameManager.brew_hotspring_bath("", false)
				if not bool(bath["brewed"]) and not bool(bath.get("full", false)):
					GameManager.cycle_hotspring_bath()
		"windmill_parade":
			if not GameManager.windmill_unlocked:
				ok = GameManager.unlock_windmill_bakery(false)
			else:
				GameManager.try_start_festival("parade")
		"tea_moon_gathering":
			if not GameManager.tea_pavilion_unlocked:
				ok = GameManager.unlock_tea_pavilion(false)
			else:
				GameManager.try_start_festival("moon_tea")
		"wish_lantern_festival":
			GameManager.try_start_festival("lantern")
		"open_air_cinema":
			if not GameManager.open_air_cinema_unlocked:
				ok = GameManager.unlock_open_air_cinema(false)
			elif not GameManager.is_cinema_open():
				news(_t("bn_night"))
			elif GameManager.cinema_snacks_tonight >= Pacing.SNACKS_PER_NIGHT:
				return
			elif int(GameManager.sell_cinema_snacks(1).get("sold", 0)) <= 0:
				news(_t("bn_no_items"))
		"kite_festival":
			GameManager.try_start_festival("kite")
		"airship_order":
			if GameManager.airship_docked and not bool(GameManager.fulfill_airship_bulk_order_from_stock().get("completed", false)):
				news(String(GameManager.get_airship_order_progress_summary()["brief"]))
			return
		"solar_codex":
			if GameManager.get_rare_vouchers() > 0:
				var res := GameManager.redeem_rare_voucher_for_codex()
				if bool(res.get("redeemed", false)):
					news(_tf("bn_recipe", [EconomyConfig.get_item_display_name(String(res.get("unlocked_dish", "")))]))
			return
		"ci5_codex":
			if GameManager.greenhouse_unlocked:
				news(EconomyConfig.get_item_display_name(GameManager.cycle_greenhouse_flora()))
			return
		"ci6_codex":
			if GameManager.hotspring_unlocked:
				news(EconomyConfig.get_item_display_name(GameManager.cycle_hotspring_bath()))
			return
		"ci7_codex":
			if GameManager.windmill_unlocked:
				news(EconomyConfig.get_item_display_name(GameManager.cycle_windmill_bread()))
			return
		"ci8_codex":
			if GameManager.tea_pavilion_unlocked:
				news(EconomyConfig.get_item_display_name(GameManager.cycle_tea_pavilion_recipe()))
			return
		"ci9_codex":
			if GameManager.chef_pavilion_unlocked:
				news(EconomyConfig.get_item_display_name(GameManager.cycle_tasting_dish()))
			return
		"birthday":
			_clear_views()
			birthday_view = true
		"wish_board":
			_clear_views()
			wish_board_view = true
		"food_week":
			_clear_views()
			food_week_view = true
		"friendship":
			_clear_views()
			friendship_view = true
		"featured":
			GameManager.set_featured_dish(k)
			if SoundManager != null:
				SoundManager.play_upgrade_sfx()
			return
		"decor":
			if not GameManager.is_decor_owned(k):
				if not GameManager.buy_decor(k):
					news(_t("bn_no_amber"))
					return
			elif not is_nan(GameManager.get_decor_x(k)):
				GameManager.remove_decor(k)
				return
			GameManager.place_decor_anywhere(k)
			if SoundManager != null:
				SoundManager.play_pop_sfx()
			return
		"guest":
			return
		"guest_book":
			_clear_views()
			guest_view = true
		"decor_box":
			_clear_views()
			decor_view = true
		"bday_back", "wish_back", "fw_back", "fr_back":
			_clear_views()
		"bday_gift":
			var g := GameManager.prepare_birthday_gift()
			ok = bool(g.get("given", false)) or String(g.get("reason", "")) != "gold"
		"fw_entry":
			if not bool(GameManager.enter_food_week_dish().get("entered", false)):
				news(_t("bn_no_dish"))
		"wish_note":
			news(String(c["hint"]))
	if not ok:
		news(_t("bn_no_gold"))

## ------------------------------------------------------------------------------------------------------------------
## Tiles of every tab. A tile shows a picture, a short name and one button; `hint` is the single line read on hover.
## `hidden` tiles keep their index but are not shown: locked islands, finished unlocks, plain information.
## ------------------------------------------------------------------------------------------------------------------
func _tex(path: String) -> Texture2D:
	return EconomyConfig.load_pixel_texture(path)

func _art(path: String) -> Texture2D:
	return EconomyConfig.load_pixel_texture(UiKit.ART + path)

func _item_tex(cfgs: Dictionary, id: String) -> Texture2D:
	return _tex(String((cfgs.get(id, {}) as Dictionary).get("icon_tex", "")))

func _short_name(cfgs: Dictionary, id: String) -> String:
	return _n(String((cfgs.get(id, {}) as Dictionary).get("short_name", "")))

func _crop_icon(crop_id: String) -> Texture2D:
	return UiKit.atlas("crops/crops_sheet_normalized.png", EconomyConfig.get_crop_stage_region(crop_id, 3))

func _dish_icon(dish_id: String) -> Texture2D:
	return UiKit.atlas("buildings/delicacies_sheet_normalized.png", EconomyConfig.get_delicacy_region(dish_id))

func _animal_icon(ak: String) -> Texture2D:
	return UiKit.atlas("animals/%s_sheet_normalized.png" % ak, Rect2(0.0, 0.0, 60.0, 60.0))

func _tile(type: String, key: String, section: String, title: String, icons: Array, state: String, hint: String, extra: Dictionary = {}) -> Dictionary:
	var c := {"type": type, "key": key, "section": section, "title": title, "icons": icons, "cost_state": state, "hint": hint, "cost": ""}
	c.merge(extra, true)
	return c

func _gold_state(n: int) -> String:
	return "affordable" if GameManager.gold >= n else "short"

func _price(n: int, cur: String = "gold") -> Dictionary:
	return {"price": {"cur": cur, "n": n}}

func _isle_open(isl: int) -> bool:
	return bool(GameManager.unlocked_islands.get(isl, false))

func _get_current_tab_cards() -> Array[Dictionary]:
	match _view_id():
		"wish":
			return _get_wish_board_cards()
		"birthday":
			return _get_birthday_cards()
		"food":
			return _get_food_week_cards()
		"friend":
			return _get_friendship_cards()
		"featured":
			return _get_featured_cards()
		"guests":
			return _guest_cards()
		"decor":
			return _decor_cards()
	var list: Array[Dictionary] = []
	match active_tab:
		0:
			for b_key in BUILD_ORDER:
				list.append(_building_card(b_key))
		1:
			for a_key in EconomyConfig.ANIMAL_ORDER:
				list.append(_animal_card(a_key))
			list.append_array(_social_cards())
		2:
			list.append_array(_expand_cards())
			# first steps: only the next isle and its landscape; trade and festivals join the page with the second isle
			if not _isle_open(2):
				for c in list:
					if String(c["section"]) != "sec_expand":
						c["hidden"] = true
		3:
			list.append_array(_codex_cards())
	return list

## Tab 0: buildings ----------------------------------------------------------------------------------------------------
func _building_level(key: String) -> int:
	return maxi(1, int(GameManager.building_levels.get(key, 1)))

func _building_icons(key: String) -> Array:
	var lv := _building_level(key)
	match key:
		"soil_1":
			return [_crop_icon(EconomyConfig.get_evolved_crop_id(1, lv))]
		"soil_2":
			return [_crop_icon(EconomyConfig.get_evolved_crop_id(2, lv))]
		"soil_3":
			return [_crop_icon(EconomyConfig.get_evolved_crop_id(3, lv))]
		"mortar":
			return [_art("buildings/workshop_mortar.png"), _dish_icon(EconomyConfig.get_evolved_delicacy_id("mortar", lv))]
		"cauldron":
			return [_art("buildings/workshop_cauldron.png"), _dish_icon(EconomyConfig.get_evolved_delicacy_id("cauldron", lv))]
		"stall":
			return [_art("buildings/market_stall.png")]
		"greenhouse":
			return [_tex(EconomyConfig.CLOUD_GREENHOUSE_TEX), _item_tex(EconomyConfig.HYBRID_FLORA, GameManager.active_greenhouse_flora_id)]
		"hotspring":
			return [_tex(EconomyConfig.CLOUD_HOTSPRING_INN_TEX), _item_tex(EconomyConfig.HOTSPRING_BATH_BLENDS, GameManager.active_hotspring_bath_id)]
		"windmill":
			return [_tex(EconomyConfig.CLOUD_WINDMILL_BAKERY_TEX), _item_tex(EconomyConfig.BAKERY_ITEMS, GameManager.active_windmill_bread_id)]
		"tea_pavilion":
			return [_tex(EconomyConfig.CLOUD_TEA_PAVILION_TEX), _item_tex(EconomyConfig.TEA_ITEMS, GameManager.active_tea_recipe_id)]
		"chef_pavilion":
			return [_tex(EconomyConfig.CHEF_TASTING_PAVILION_TEX), _item_tex(EconomyConfig.TASTING_DISHES, GameManager.active_tasting_dish_id)]
		"lighthouse_harbor":
			return [_tex(EconomyConfig.LIGHTHOUSE_HARBOR_TEX), _tex(EconomyConfig.SEAFOOD_CATCH_TEX)]
		"dairy_workshop":
			return [_tex(EconomyConfig.DAIRY_WORKSHOP_TEX), _item_tex(EconomyConfig.DAIRY_ITEMS, GameManager.active_dairy_recipe_id)]
		"pottery_kiln":
			return [_tex(EconomyConfig.POTTERY_KILN_TEX), _item_tex(EconomyConfig.POTTERY_ITEMS, GameManager.active_pottery_recipe_id)]
	return []

func building_name(key: String) -> String:
	return _t(String(BUILD_SPECIAL[key][0])) if BUILD_SPECIAL.has(key) else _t("nm_" + key)

func is_building_built(key: String) -> bool:
	return not BUILD_SPECIAL.has(key) or bool(GameManager.get(BUILD_SPECIAL[key][1]))

## One short line: what a working building is making and holding
func building_status(key: String) -> String:
	match key:
		"greenhouse":
			return _tf("hb_stock", [_n("铃兰") if GameManager.active_greenhouse_flora_id == "flora_stardew_lily" else _n("玫瑰"), GameManager.get_total_flora_count()])
		"hotspring":
			return _tf("hb_stock", [_short_name(EconomyConfig.HOTSPRING_BATH_BLENDS, GameManager.active_hotspring_bath_id), GameManager.get_total_bath_stock_count()])
		"windmill":
			return _tf("hb_stock", [_short_name(EconomyConfig.BAKERY_ITEMS, GameManager.active_windmill_bread_id), GameManager.get_total_bread_stock_count()])
		"tea_pavilion":
			return _tf("hb_stock", [_short_name(EconomyConfig.TEA_ITEMS, GameManager.active_tea_recipe_id), GameManager.get_total_brewed_tea_stock_count()])
		"chef_pavilion":
			return _tf("hb_stock", [_short_name(EconomyConfig.TASTING_DISHES, GameManager.active_tasting_dish_id), GameManager.get_total_tasting_dish_stock_count()])
		"lighthouse_harbor":
			return _tf("hb_stock", [EconomyConfig.get_item_display_name(EconomyConfig.SEAFOOD_ITEM_ID), GameManager.get_harbor_seafood_stock()])
		"dairy_workshop":
			return _tf("hb_stock", [_short_name(EconomyConfig.DAIRY_ITEMS, GameManager.active_dairy_recipe_id), GameManager.get_dairy_stock(GameManager.active_dairy_recipe_id)])
		"pottery_kiln":
			return _tf("hb_stock", [_short_name(EconomyConfig.POTTERY_ITEMS, GameManager.active_pottery_recipe_id), GameManager.get_pottery_stock(GameManager.active_pottery_recipe_id)])
		"stall":
			return _tf("hb_shelf", [GameManager.get_total_stall_count(), GameManager.get_stall_max_capacity()])
	return _tf("hb_next", [(int(floor(float(_building_level(key)) / 25.0)) + 1) * 25])

func _building_card(key: String) -> Dictionary:
	var cfg: Dictionary = EconomyConfig.BUILDINGS[key]
	var isl := int(cfg.get("island", 1))
	var type := (key + "_building") if BUILD_SPECIAL.has(key) else "building"
	var sec := "sec_isle%d" % isl
	var icons := _building_icons(key)
	if not _isle_open(isl):
		return _tile(type, key, sec, building_name(key), icons, "locked", "", {"hidden": true})
	if not is_building_built(key):
		var build_cost := int(BUILD_SPECIAL[key][2])
		return _tile(type, key, sec, building_name(key), icons, _gold_state(build_cost), _t("ds_" + key), _price(build_cost).merged({"dim": true}))
	var lv := _building_level(key)
	var bulk := GameManager.get_bulk_building(key)
	var cost := int(bulk[1])
	return _tile(type, key, sec, building_name(key), icons, _gold_state(cost), building_status(key), _price(cost).merged({"level": lv, "steps": int(bulk[0]), "progress": [lv % 25, 25]}))

## Tab 1: crew ---------------------------------------------------------------------------------------------------------
func _animal_card(a_key: String) -> Dictionary:
	var cfg: Dictionary = EconomyConfig.ANIMALS[a_key]
	var cur_rec := GameManager.get_total_recruited(a_key)
	var max_cap := GameManager.get_total_max_cap(a_key)
	var raw_lv := int(GameManager.animal_levels.get(a_key, 0))
	var bulk := GameManager.get_bulk_animal(a_key)
	var cost := int(bulk[1])
	var info := EconomyConfig.get_animal_promotion_info(a_key, raw_lv)
	var icons: Array = [_animal_icon(a_key)]
	if int(info["tier"]) > 0:
		icons.append(_tex(String(info["accessory_tex"])))
	if max_cap <= 0:
		return _tile("animal", a_key, "", String(info["short_name"]), icons, "locked", "", {"hidden": true})
	var extra := _price(cost).merged({"level": raw_lv, "steps": int(bulk[0]), "dim": cur_rec <= 0})
	if int(info["tier"]) < 3 and raw_lv > 0:
		extra["progress"] = [raw_lv, int(info["next_milestone_lv"])]
	return _tile("animal", a_key, "", String(info["short_name"]), icons, _gold_state(cost), _tf("hb_crew", [_t("ds_" + a_key), cur_rec, max_cap]), extra)

func _social_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var fw := GameManager.get_food_week_status_summary()
	var fw_open := int(fw["entries_left"]) > 0 and String(fw["next_dish"]) != ""
	list.append(_tile("food_week", "food_week", "", _t("nm_food"), [_tex(EconomyConfig.FOOD_WEEK_PLATE_TEX), _animal_icon(String(fw["judge"]))],
		"affordable" if fw_open else ("unlocked" if int(fw["tier"]) > 0 else "normal"), _t("ds_food_week"), {"cost": "%d/%d" % [int(fw["entries"]), EconomyConfig.FOOD_WEEK_ENTRIES]}))
	var fr_all := EconomyConfig.WISH_ISLANDERS.size() * EconomyConfig.FRIEND_MAX_LEVEL
	list.append(_tile("friendship", "friendship", "", _t("nm_friend"), [_tex(EconomyConfig.ICON_FRIENDSHIP_TEX)],
		"unlocked" if GameManager.get_friendship_total_levels() > 0 else "normal", _t("ds_friendship"), {"cost": "%d/%d" % [GameManager.get_friendship_total_levels(), fr_all], "progress": [GameManager.get_friendship_total_levels(), fr_all]}))
	return list

## Tab 2: isles, orders, festivals ---------------------------------------------------------------------------------------
func _bridge_card(isl: int, cost: int) -> Dictionary:
	var icons: Array = [_art("buildings/landmark_left_hut.png" if isl == 2 else "buildings/landmark_right_tiki.png")]
	# one step at a time: the second bridge shows up after the first
	var hide := _isle_open(isl) or (isl == 3 and not _isle_open(2))
	return _tile("unlock_island", str(isl), "sec_expand", _t("sec_isle%d" % isl), icons, "unlocked" if _isle_open(isl) else _gold_state(cost), _t("ds_bridge"), _price(cost).merged({"hidden": hide}))

## A festival / order tile whose building does not exist yet: not shown, the Buildings tab already offers it
func _pending(type: String, key: String, section: String, title: String, icons: Array, isl: int, cost: int) -> Dictionary:
	return _tile(type, key, section, title, icons, _gold_state(cost) if _isle_open(isl) else "locked", "", {"hidden": true})

## One of the four festivals: running (time left), due (start it), or waiting (only the next one counts down)
func _festival_tile(type: String, key: String, fest: String, name_key: String, tex: String, hint_key: String, left: float) -> Dictionary:
	var icons: Array = [_tex(tex)]
	if not GameManager.is_festival_unlocked(fest):
		return _tile(type, key, "sec_fest", _t(name_key), icons, "locked", "", {"hidden": true})
	if GameManager.is_festival_active(fest):
		return _tile(type, key, "sec_fest", _t(name_key), icons, "unlocked", _t(hint_key), {"cost": UiKit.clock(left)})
	if GameManager.is_festival_ready():
		return _tile(type, key, "sec_fest", _t(name_key), icons, "affordable", _t(hint_key), {"verb": _t("vb_start")})
	var next := GameManager.get_active_festival() == "" and GameManager.get_next_festival() == fest
	return _tile(type, key, "sec_fest", _t(name_key), icons, "normal", _t(hint_key), {"cost": UiKit.clock(GameManager.get_seconds_to_festival()) if next else "", "dim": true})

func _expand_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	list.append(_bridge_card(2, int(Pacing.UNLOCK["isle2"])))
	list.append(_bridge_card(3, int(Pacing.UNLOCK["isle3"])))
	for lk in ["bee_hive", "wind_chime", "tiki_torch"]:
		var cfg: Dictionary = EconomyConfig.ISLAND_LANDSCAPES[lk]
		var lit := GameManager.is_landscape_unlocked(lk)
		var amb := int(cfg.get("cost_amber", 3))
		var open := _isle_open(int(cfg.get("island", 1)))
		list.append(_tile("landscape", lk, "sec_expand", _n(String(cfg.get("name", lk))), [_tex(String(cfg.get("sprite_tex", "")))],
			"unlocked" if lit else ("locked" if not open else ("affordable" if GameManager.get_amber() >= amb else "short")), _landscape_buff_text(cfg), _price(amb, "amber").merged({"hidden": lit or not open})))

	var air_icons: Array = [_tex(EconomyConfig.AIRSHIP_CARAVAN_TEX)]
	if GameManager.airship_docked:
		var asum := GameManager.get_airship_order_progress_summary()
		list.append(_tile("airship_order", "bulk_order", "sec_orders", _t("nm_air"), air_icons, "affordable", _t("ds_airship"), {"verb": _t("vb_load"), "progress": [int(asum["delivered"]), int(asum["required"])]}))
	else:
		list.append(_tile("airship_order", "bulk_order", "sec_orders", _t("nm_air"), air_icons, "locked", _t("ds_airship"), {"cost": UiKit.clock(GameManager.airship_timer), "dim": true}))

	var sv_icons: Array = [_item_tex(EconomyConfig.SOUVENIR_BOXES, "souvenir_box_royal")]
	if not GameManager.greenhouse_unlocked:
		list.append(_pending("souvenir_workshop", "souvenir_box", "sec_orders", _t("nm_box"), sv_icons, 2, EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD))
	else:
		var flo_cnt := GameManager.get_total_flora_count()
		var box_cnt := GameManager.get_total_souvenir_box_count()
		list.append(_tile("souvenir_workshop", "souvenir_box", "sec_orders", _t("nm_box"), sv_icons, "affordable" if flo_cnt > 0 else ("unlocked" if box_cnt > 0 else "normal"), _t("ds_souvenir"), {"verb": _t("vb_pack")}))

	var spa_icons: Array = [_tex(EconomyConfig.CLOUD_HOTSPRING_INN_TEX), _item_tex(EconomyConfig.HOTSPRING_BATH_BLENDS, GameManager.active_hotspring_bath_id)]
	if not GameManager.hotspring_unlocked:
		list.append(_pending("hotspring_brew", "hotspring_bath", "sec_orders", _t("nm_spa"), spa_icons, 3, EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD))
	else:
		list.append(_tile("hotspring_brew", "hotspring_bath", "sec_orders", _t("nm_spa"), spa_icons, "affordable" if GameManager.get_total_bath_stock_count() <= 2 else "unlocked", _t("ds_spa"), {"verb": _t("vb_brew")}))

	list.append(_festival_tile("windmill_parade", "gourmet_parade", "parade", "nm_parade", EconomyConfig.ICON_PARADE_FLOAT_TEX, "ds_parade", GameManager.parade_festival_timer))
	list.append(_festival_tile("tea_moon_gathering", "moon_tea_gathering", "moon_tea", "nm_moontea", EconomyConfig.ICON_MOON_TEA_BOAT_TEX, "ds_moontea", GameManager.moon_tea_gathering_timer))
	list.append(_festival_tile("wish_lantern_festival", "wish_lantern_festival", "lantern", "nm_lantern", EconomyConfig.STAR_LANTERN_TEX, "ds_lantern", GameManager.wish_lantern_festival_timer))

	var cin := GameManager.get_cinema_status_summary()
	var cin_icons: Array = [_tex(EconomyConfig.OPEN_AIR_CINEMA_TEX)]
	if not GameManager.open_air_cinema_unlocked:
		list.append(_tile("open_air_cinema", "open_air_cinema", "sec_fest", _t("nm_cinema"), cin_icons, _gold_state(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD), _t("ds_cinema"), _price(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD).merged({"dim": true})))
	elif bool(cin["screening"]):
		list.append(_tile("open_air_cinema", "open_air_cinema", "sec_fest", _t("nm_cinema"), cin_icons, "unlocked", _t("ds_cinema"), {"cost": UiKit.clock(float(cin["remaining"]))}))
	elif bool(cin["open"]) and GameManager.cinema_snacks_tonight >= Pacing.SNACKS_PER_NIGHT:
		list.append(_tile("open_air_cinema", "open_air_cinema", "sec_fest", _t("nm_cinema"), cin_icons, "normal", _t("ds_cinema"), {"dim": true}))
	elif bool(cin["open"]):
		list.append(_tile("open_air_cinema", "open_air_cinema", "sec_fest", _t("nm_cinema"), cin_icons, "affordable", _t("ds_cinema"), {"verb": _t("vb_snack")}))
	else:
		list.append(_tile("open_air_cinema", "open_air_cinema", "sec_fest", _t("nm_cinema"), cin_icons, "normal", _t("ds_cinema"), {"cost": UiKit.clock(float(cin["until_night"])), "dim": true}))

	list.append(_festival_tile("kite_festival", "kite_festival", "kite", "nm_kite", EconomyConfig.ICON_KITE_FESTIVAL_TEX, "ds_kite", GameManager.get_kite_seconds_left() / Pacing.KITE_PACE))

	var ss := GameManager.get_current_season_info()
	list.append(_tile("season_dress", "season_dress", "sec_expand", _tf("nm_season", [_n(String(ss.get("full_name", "四季")))]), [_tex(String(EconomyConfig.SEASONS[GameManager.get_current_season_id()]["tex"]))], "unlocked", "", {"hidden": true}))

	var wb := GameManager.get_wish_board_summary()
	list.append(_tile("wish_board", "wish_board", "sec_orders", _t("nm_wish"), [_tex(EconomyConfig.ICON_WISH_BOARD_TEX)], "affordable" if int(wb["open"]) > 0 else "unlocked", _t("ds_wish"), {"cost": "%d/%d" % [int(wb["open"]), EconomyConfig.WISH_SLOT_COUNT]}))

	var sw := GameManager.get_sky_weather_status_summary()
	list.append(_tile("sky_weather", "sky_weather", "sec_expand", String(sw["name"]), [_tex(String(EconomyConfig.SKY_WEATHERS[String(sw["id"])]["tex"]))], "unlocked", "", {"hidden": true}))

	var bd := GameManager.get_birthday_status_summary()
	var today := String(bd["today"])
	if today == "":
		var nx: Dictionary = bd["next"]
		list.append(_tile("birthday", "birthday", "sec_orders", _t("nm_birthday"), [_tex(EconomyConfig.BIRTHDAY_CAKE_TEX)], "normal", _t("ds_birthday"), {"cost": _tf("cd_bd_days", [int(nx.get("days", 0))])}))
	else:
		var given := bool(bd["gift_given"])
		list.append(_tile("birthday", "birthday", "sec_orders", EconomyConfig.get_islander_name(today), [_animal_icon(today), _tex(EconomyConfig.BIRTHDAY_CAKE_TEX)],
			"unlocked" if given else ("affordable" if GameManager.gold >= int(bd["cost"]) else "short"), _t("ds_birthday"), {"cost": _t("nm_birthday")} if given else {"verb": _t("vb_gift")}))
	var got := GameManager.decor_owned.size()
	list.append(_tile("decor_box", "decor_box", "sec_expand", _t("sec_deco"), [Guests.decor_tex("sunflowers")], "affordable", "", {"cost": "%d/%d" % [got, Guests.DECOR_ORDER.size()], "progress": [got, Guests.DECOR_ORDER.size()], "hidden": got <= 0 and not _isle_open(2)}))
	return list

## Landscape buff line, e.g. `农田生长 +20%`
func _landscape_buff_text(cfg: Dictionary) -> String:
	var names := {"crop_growth": _t("ui_lb_crop"), "workshop_speed": _t("ui_lb_workshop"), "tip_bonus": _t("ui_lb_tip")}
	return String(names.get(String(cfg.get("buff_type", "")), _t("ui_lb_buff"))) + " +" + str(int(round(float(cfg.get("buff_val", 0.0)) * 100.0))) + "%"

## Tab 3: the collection ---------------------------------------------------------------------------------------------------
func _theme(type: String, key: String, name_key: String, icon: Texture2D, done: int, total: int, state: String, pct: float) -> Dictionary:
	return _tile(type, key, "sec_theme", _t(name_key), [icon], state, _tf("hb_price", [_num1(pct)]), {"cost": "%d/%d" % [done, total], "progress": [done, total], "dim": done <= 0, "hidden": done <= 0 and state == "locked"})

func _codex_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for ti in range(4):
		var cid := "crop_%d" % ti
		var did := "delicacy_%d" % ti
		var n_on := (1 if bool(GameManager.unlocked_codex.get(cid, false)) else 0) + (1 if bool(GameManager.unlocked_codex.get(did, false)) else 0)
		list.append(_tile("codex", str(ti), "sec_food", _t("cx_tier%d" % (ti + 1)), [_crop_icon(cid), _dish_icon(did)], "unlocked" if n_on >= 2 else ("affordable" if n_on == 1 else "locked"),
			_tf("hb_price", [_num1(float(n_on))]), {"cost": "%d/2" % n_on, "progress": [n_on, 2], "dim": n_on <= 0}))

	var ach := GameManager.get_unlocked_achievement_count()
	list.append(_tile("career", "achievements", "sec_honor", _t("nm_ach"), [_tex(EconomyConfig.REPUTATION_STAR_TEX)], "unlocked" if ach > 0 else "affordable", "", {"cost": "%d/%d" % [ach, EconomyConfig.ACHIEVEMENTS.size()], "progress": [ach, EconomyConfig.ACHIEVEMENTS.size()]}))

	var s_dish := GameManager.get_current_solar_dish_id()
	var s_cnt := GameManager.get_unlocked_solar_dish_count()
	var v_cnt := GameManager.get_rare_vouchers()
	var s_extra := {"progress": [s_cnt, 4], "cost": "%d/4" % s_cnt}
	if v_cnt > 0:
		s_extra["price"] = {"cur": "voucher", "n": 1}
	list.append(_tile("solar_codex", s_dish, "sec_food", _tf("nm_solar", [_n(String(GameManager.get_current_solar_term().get("name", "春分")))]), [_item_tex(EconomyConfig.SOLAR_SPECIALTY_DISHES, s_dish)],
		"affordable" if v_cnt > 0 else ("unlocked" if s_cnt >= 4 else "normal"), EconomyConfig.get_item_display_name(s_dish), s_extra))

	var f_unl := GameManager.get_unlocked_flora_count()
	var b_unl := GameManager.get_unlocked_souvenir_count()
	list.append(_theme("ci5_codex", "flora_souvenir", "nm_cx_flora", _item_tex(EconomyConfig.HYBRID_FLORA, GameManager.active_greenhouse_flora_id), f_unl + b_unl, 4,
		"unlocked" if (f_unl >= 2 and b_unl >= 2) else ("affordable" if GameManager.greenhouse_unlocked else "locked"), float(f_unl + b_unl)))
	var bath := GameManager.get_unlocked_bath_count()
	list.append(_theme("ci6_codex", "hotspring_codex", "nm_cx_spa", _item_tex(EconomyConfig.HOTSPRING_BATH_BLENDS, GameManager.active_hotspring_bath_id), bath, 3, "unlocked" if bath >= 3 else ("affordable" if GameManager.hotspring_unlocked else "locked"), float(bath)))
	var bak := GameManager.get_unlocked_bakery_count()
	list.append(_theme("ci7_codex", "bakery_codex", "nm_cx_bak", _item_tex(EconomyConfig.BAKERY_ITEMS, GameManager.active_windmill_bread_id), bak, 3, "unlocked" if bak >= 3 else ("affordable" if GameManager.windmill_unlocked else "locked"), float(bak)))
	var tea := GameManager.get_unlocked_tea_count()
	list.append(_theme("ci8_codex", "tea_codex", "nm_cx_tea", _item_tex(EconomyConfig.TEA_ITEMS, GameManager.active_tea_recipe_id), tea, 3, "unlocked" if tea >= 3 else ("affordable" if GameManager.tea_pavilion_unlocked else "locked"), float(tea)))
	var feast := GameManager.get_passed_tasting_challenge_count()
	list.append(_theme("ci9_codex", "chef_tasting_codex", "nm_cx_chef", _item_tex(EconomyConfig.TASTING_DISHES, GameManager.active_tasting_dish_id), feast, 3, "unlocked" if GameManager.chef_medals > 0 else ("affordable" if GameManager.chef_pavilion_unlocked else "locked"), float(feast)))
	var film := GameManager.get_unlocked_film_count()
	var dairy := GameManager.get_unlocked_dairy_count()
	list.append(_theme("ci11_codex", "cinema_codex", "nm_cx_cin", _tex(EconomyConfig.ICON_MOVIE_TICKET_TEX), film + dairy, 6, "unlocked" if GameManager.cinema_medals > 0 else ("affordable" if GameManager.open_air_cinema_unlocked else "locked"), float(film + dairy)))
	var pot := GameManager.get_unlocked_pottery_count()
	list.append(_theme("ci12_codex", "pottery_codex", "nm_cx_pk", _item_tex(EconomyConfig.POTTERY_ITEMS, GameManager.active_pottery_recipe_id), pot, 3, "unlocked" if pot >= 3 else ("affordable" if GameManager.pottery_kiln_unlocked else "locked"), float(pot)))
	var kite := GameManager.get_unlocked_kite_count()
	var season := GameManager.get_seen_season_count()
	list.append(_theme("ci13_codex", "kite_codex", "nm_cx_kt", _tex(EconomyConfig.KITE_CARP_TEX), kite + season, 7, "unlocked" if GameManager.kite_medals > 0 else ("affordable" if GameManager.is_kite_festival_active() else "locked"), float(kite + season)))
	var sky := GameManager.get_seen_sky_weather_count()
	var bday := GameManager.get_celebrated_islander_count()
	list.append(_theme("ci15_codex", "weather_codex", "nm_cx_sw", _tex(EconomyConfig.WEATHER_RAINBOW_TEX), sky + bday, EconomyConfig.SKY_WEATHER_ORDER.size() + EconomyConfig.WISH_ISLANDERS.size(), "unlocked" if GameManager.birthday_medals > 0 else ("affordable" if sky > 0 else "locked"),
		float(sky + bday)))
	var dishes := GameManager.get_food_week_dishes_judged()
	list.append(_theme("ci16_codex", "food_week_codex", "nm_cx_fw", _tex(EconomyConfig.FOOD_WEEK_MEDAL_TEX), dishes, EconomyConfig.FOOD_WEEK_DISHES.size(), "unlocked" if GameManager.get_food_week_medal_total() > 0 else ("affordable" if dishes > 0 or GameManager.get_friendship_total_levels() > 0 else "locked"), GameManager.get_friendship_price_bonus() * 100.0))
	var met := GameManager.get_met_guest_count()
	list.append(_tile("guest_book", "guest_book", "sec_theme", _t("sec_guests"), [Guests.portrait("hedgehog")], "unlocked" if met >= Guests.ORDER.size() else "affordable", "", {"cost": "%d/%d" % [met, Guests.ORDER.size()], "progress": [met, Guests.ORDER.size()]}))
	return list

## Guests (codex tab): a shadow until the first visit, then its visits towards the keepsake
func _guest_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for g in Guests.ORDER:
		var n := int(GameManager.guest_visits.get(g, 0))
		var need := Guests.keep_at(g)
		var keep := String(Guests.LIST[g]["keep"])
		var icons: Array = [Guests.portrait(g)]
		if n >= need:
			icons.append(Guests.decor_tex(keep))
		var extra := {"progress": [mini(n, need), need], "cost": "%d/%d" % [mini(n, need), need]}
		if n <= 0:
			extra = {"shadow": true}
		list.append(_tile("guest", g, "", _t("gu_" + g) if n > 0 else _t("gu_unknown"), icons, "unlocked" if n >= need else "normal", _tf("hb_loves", [_t("dh_" + String(Guests.LIST[g]["dish"]))]), extra))
	return list

## The dish of the day: which guests come more often
func _get_featured_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var open := GameManager.get_available_dishes()
	for d in Guests.DISH_ORDER:
		var pips: Array = []
		for g in Guests.ORDER:
			if String(Guests.LIST[g]["dish"]) == d:
				pips.append([Guests.portrait(g), int(GameManager.guest_visits.get(g, 0)) > 0])
		var on := GameManager.featured_dish == d
		var extra := {"pips": pips, "hidden": not open.has(d)}
		extra.merge({"cost": _t("st_featured")} if on else {"verb": _t("vb_feature")})
		list.append(_tile("featured", d, "", _t("dh_" + d), [dish_icon(d)], "unlocked" if on else "affordable", _t("hb_featured"), extra))
	return list

func dish_icon(d: String) -> Texture2D:
	match d:
		"fruit":
			return _crop_icon("crop_0")
		"sweets":
			return _dish_icon("delicacy_0")
		"potion":
			return _dish_icon("delicacy_2")
		"tea":
			return _item_tex(EconomyConfig.TEA_ITEMS, "tea_cloud_longjing")
		"dairy":
			return _item_tex(EconomyConfig.DAIRY_ITEMS, "dairy_milk")
		"bread":
			return _item_tex(EconomyConfig.BAKERY_ITEMS, "bread_amber_croissant")
		"feast":
			return _item_tex(EconomyConfig.TASTING_DISHES, "dish_mountain_sea_hotpot")
	return _tex(EconomyConfig.SEAFOOD_CATCH_TEX)

## Decorations (Expand tab): keepsakes show up once owned, the rest is for sale once Island 2 is open
func _decor_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for id in Guests.DECOR_ORDER:
		var amb := int(Guests.DECOR[id]["amber"])
		var icons: Array = [Guests.decor_tex(id)]
		if GameManager.is_decor_owned(id):
			var on := not is_nan(GameManager.get_decor_x(id))
			list.append(_tile("decor", id, "", _t("de_" + id), icons, "unlocked" if on else "affordable", _t("hb_decor") if on else "", {"verb": _t("vb_store") if on else _t("vb_place")}))
		else:
			list.append(_tile("decor", id, "", _t("de_" + id), icons, "affordable" if GameManager.get_amber() >= amb else "short", "", _price(amb, "amber").merged({"hidden": amb <= 0 or not _isle_open(2)})))
	return list

## Crew medals (codex tab): 3 medal slots per animal
func _get_emp_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for ak in EconomyConfig.ANIMAL_ORDER:
		var lv := int(GameManager.animal_levels.get(ak, 0))
		var info := EconomyConfig.get_animal_promotion_info(ak, lv)
		var tier := int(info["tier"])
		var pips: Array = []
		for m in range(3):
			pips.append([_tex(String(EconomyConfig.PROMOTION_TIERS[m + 1]["medal_tex"])), tier >= m + 1])
		list.append(_tile("employee", ak, "sec_honor", String(info["short_name"]), [_animal_icon(ak)], "unlocked" if tier >= 1 else "normal", _tf("hb_medal", [int(info["next_milestone_lv"])]) if tier < 3 else "", {"pips": pips, "level": lv, "hidden": lv <= 0, "medals": tier}))
	return list

## Panels ------------------------------------------------------------------------------------------------------------------
func _get_birthday_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var bd := GameManager.get_birthday_status_summary()
	var today := String(bd["today"])
	var nx: Dictionary = bd["next"]
	var nx_isl := String(nx.get("islander", ""))
	var gift_icon: Array = [_tex(EconomyConfig.BIRTHDAY_GIFT_TEX)]
	if today != "":
		var given := bool(bd["gift_given"])
		list.append(_tile("bday_today", today, "", EconomyConfig.get_islander_name(today), [_animal_icon(today), _tex(EconomyConfig.BIRTHDAY_CAKE_TEX)], "unlocked" if given else "affordable", "", {"cost": _t("bp_today")}))
		if given:
			list.append(_tile("bday_gift", "gift", "", _t("bp_gift"), gift_icon, "unlocked", "", {"cost": _t("bp_gift_done")}))
		else:
			list.append(_tile("bday_gift", "gift", "", _t("bp_gift"), gift_icon, _gold_state(int(bd["cost"])), _n(String(EconomyConfig.BIRTHDAY_FAVOURITES[today]["name"])), _price(int(bd["cost"]))))
	else:
		list.append(_tile("bday_today", "", "", _t("nm_birthday"), [_tex(EconomyConfig.ICON_BIRTHDAY_TEX)], "locked", "", {"cost": _t("bp_none"), "dim": true}))
		list.append(_tile("bday_gift", "gift", "", _t("bp_gift"), gift_icon, "locked", "", {"hidden": true}))
	list.append(_tile("bday_next", nx_isl, "", EconomyConfig.get_islander_name(nx_isl), [_animal_icon(nx_isl)], "normal", _n(String(EconomyConfig.BIRTHDAY_FAVOURITES.get(nx_isl, {}).get("name", ""))), {"cost": _tf("cd_bd_days", [int(nx.get("days", 0))]), "dim": true}))
	list.append(_tile("bday_back", "bday_back", "", _t("ui_back"), [], "normal", "", {"hidden": true}))
	return list

func _get_food_week_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var fw := GameManager.get_food_week_status_summary()
	var judge := String(fw["judge"])
	list.append(_tile("fw_judge", judge, "", EconomyConfig.get_islander_name(judge), [_animal_icon(judge), _tex(EconomyConfig.FOOD_WEEK_JUDGE_TEX)], "normal", "", {"cost": EconomyConfig.get_food_taste_name(String(fw["taste"]))}))
	var nxt := String(fw["next_dish"])
	var plate: Array = [_tex(EconomyConfig.FOOD_WEEK_PLATE_TEX)]
	if int(fw["entries_left"]) <= 0:
		list.append(_tile("fw_entry", "", "", _t("fw_entry"), plate, "unlocked", "", {"cost": "%d/%d" % [int(fw["entries"]), EconomyConfig.FOOD_WEEK_ENTRIES]}))
	elif nxt == "":
		list.append(_tile("fw_entry", "", "", _t("fw_entry"), plate, "locked", _t("fw_entry_none"), {"cost": "0", "dim": true}))
	else:
		list.append(_tile("fw_entry", nxt, "", EconomyConfig.get_item_display_name(nxt), plate, "affordable", "", {"verb": _t("vb_submit")}))
	var tier := int(fw["tier"])
	list.append(_tile("fw_score", str(tier), "", _t("fw_score"), [_tex(EconomyConfig.FOOD_WEEK_MEDAL_TEX)], "unlocked" if tier > 0 else "normal", EconomyConfig.get_food_medal_name(tier) if tier > 0 else "", {"cost": str(int(fw["best"])), "progress": [int(fw["best"]), 100], "dim": tier <= 0}))
	list.append(_tile("fw_back", "fw_back", "", _t("ui_back"), [], "normal", "", {"hidden": true}))
	return list

func _get_friendship_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for isl in EconomyConfig.WISH_ISLANDERS:
		var lv := GameManager.get_friendship_level(isl)
		var nx := EconomyConfig.get_friend_next_points(lv)
		list.append(_tile("fr_islander", isl, "", EconomyConfig.get_islander_name(isl), [_animal_icon(isl), _tex(EconomyConfig.ICON_FRIENDSHIP_TEX)], "unlocked" if lv >= EconomyConfig.FRIEND_MAX_LEVEL else ("affordable" if lv > 0 else "normal"),
			_tf("hb_price", [_num1(EconomyConfig.FRIEND_PRICE_PER_LEVEL * 100.0 * float(lv))]), {"level": lv, "cost": "%d/%d" % [GameManager.get_friendship_points(isl), nx] if nx > 0 else _t("fr_isl_max"), "progress": [lv, EconomyConfig.FRIEND_MAX_LEVEL]}))
	list.append(_tile("fr_back", "fr_back", "", _t("ui_back"), [], "normal", "", {"hidden": true}))
	return list

func _get_wish_board_cards() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for i in range(EconomyConfig.WISH_SLOT_COUNT):
		var wd := GameManager.get_wish_display(i)
		if wd.is_empty():
			continue
		var st := String(wd["state"])
		list.append(_tile("wish_note", str(i), "", String(wd["who"]), [_animal_icon(String(wd["islander"])), _tex(EconomyConfig.WISH_NOTE_TEX)], "unlocked" if st == "done" else ("locked" if st == "expired" else "affordable"),
			String(wd["sub"]), {"cost": "%s/%s" % [UiKit.num(int(wd["progress"])), UiKit.num(int(wd["target"]))], "progress": [int(wd["progress"]), int(wd["target"])], "dim": st == "expired"}))
	list.append(_tile("wish_back", "wish_back", "", _t("ui_back"), [], "normal", "", {"hidden": true}))
	return list
