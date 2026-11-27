extends Window
class_name MenuWindow
## The menu panel (`src/ui/MenuWindow.gd`): a native window of its own that opens above the desktop strip, so the islands stay
## in view and the text has room. Responsive: the window follows the screen, the card columns follow the window, and the fonts
## never shrink (a small screen scrolls instead).

signal card_activated(idx: int)
signal emp_activated(idx: int)
signal tab_requested(idx: int)
signal back_requested
signal setting_requested(key: String, value: Variant)
signal bulk_requested
signal close_wanted

const BASE_SIZE := Vector2(1210.0, 640.0)
const SETTINGS_TAB := 4
const TAB_ICONS: Array[int] = [6, 3, 4, 2, 7]
const TAB_KEYS: Array[String] = ["nav_build", "nav_animal", "nav_expand", "nav_codex", "nav_settings"]

## Interface factor in strip-logical units: `u` x a logical size = the size used inside this window
var u: float = 1.0
var columns: int = 3
var cards: Array[MenuCard] = []
var emp_cards: Array[MenuCard] = []
var lbl_title: Label
var lbl_toast: Label
var lbl_gold: Label
var lbl_amber: Label
var lbl_voucher: Label
var lbl_star: Label
var nav_buttons: Array[Button] = []
var setting_buttons: Dictionary = {}
var lbl_settings: Array[Label] = []

var _root: PanelContainer
var _back: Button
var _close: Button
var bulk_button: Button
var _scroll: ScrollContainer
var _list: VBoxContainer
var _settings_box: VBoxContainer
var _headers: Dictionary = {}
var _layout_key := ""
var _settings_key := ""
var _built_u := -1.0
var _built_cols := -1
var _active_tab := 0
var _hints: Dictionary = {}
var _hidden_emp: Array[int] = []
var _hover_key := ""
var _toast := ""
var _drag_from := Vector2i.ZERO
var _drag_win := Vector2i.ZERO
var _dragging := false
var _hung_on: Array = []

func _init() -> void:
	title = "Cloud Isle Market"
	visible = false
	borderless = true
	unresizable = true
	transparent = true
	transparent_bg = true
	transient = true
	wrap_controls = false
	canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
	snap_2d_transforms_to_pixel = true
	close_requested.connect(func() -> void: close_wanted.emit())

func open() -> void:
	place()
	if not visible:
		show()
		if DisplayServer.get_name() != "headless":
			# the strip already paces the frame: a second vsync wait would halve the frame rate
			DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED, get_window_id())
		place()

## Size and position from the screen, the strip and the player's interface size; rebuilds when the scale changed
## `again` = only when something it hangs on has changed, so a window the player dragged stays where it was put
func place(again: bool = false) -> void:
	var main := get_tree().root
	var usable := DisplayServer.screen_get_usable_rect(main.current_screen)
	var hung_on := [main.position, main.size, usable, WindowController.text_scale, WindowController.scale_factor, WindowController.current_dock]
	if again and hung_on == _hung_on:
		return
	_hung_on = hung_on
	if usable.size.x <= 0 or usable.size.y <= 0:
		usable = Rect2i(Vector2i.ZERO, Vector2i(1920, 1040))
	var strip := maxf(0.1, WindowController.scale_factor)
	var ui := clampf(float(usable.size.y) / 1080.0, 0.85, 3.0) * WindowController.text_scale
	var top_dock := WindowController.current_dock == WindowController.DockPosition.TOP_STRIP
	var strip_top := main.position.y
	var strip_bottom := main.position.y + main.size.y
	var room := float(strip_top - usable.position.y) + 40.0 * strip
	if top_dock:
		room = float(usable.end.y - strip_bottom) + 10.0 * strip
	var overlay := room < 420.0 * ui
	if overlay:
		room = float(usable.size.y) * 0.94
	var want := BASE_SIZE * ui
	var sz := Vector2i(int(minf(want.x, float(usable.size.x) * 0.98)), int(minf(want.y, room)))
	var px := main.position.x + (main.size.x - sz.x) / 2
	px = clampi(px, usable.position.x, maxi(usable.position.x, usable.end.x - sz.x))
	var py := usable.position.y + int((usable.size.y - sz.y) * 0.5)
	if not overlay:
		py = (strip_bottom - int(10.0 * strip)) if top_dock else (strip_top + int(40.0 * strip) - sz.y)
	content_scale_factor = strip
	size = sz
	position = Vector2i(px, py)
	u = ui / strip
	var inner_w := float(sz.x) / strip - (88.0 + 124.0 + 56.0) * u
	columns = clampi(int(floor((inner_w + 10.0 * u) / ((MenuCard.TILE_W + 10.0) * u))), 2, 8)
	if absf(u - _built_u) > 0.001 or columns != _built_cols:
		_build()

func _f(sz: int) -> int:
	return int(roundf(float(sz) * u))

func _hb(sep: float) -> HBoxContainer:
	var b := HBoxContainer.new()
	b.add_theme_constant_override("separation", int(roundf(sep * u)))
	return b

func _vb(sep: float) -> VBoxContainer:
	var b := VBoxContainer.new()
	b.add_theme_constant_override("separation", int(roundf(sep * u)))
	return b

func _button(text: String, size_px: int, min_w: float = 0.0) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.custom_minimum_size = Vector2(min_w * u, roundf(40.0 * u))
	b.add_theme_font_override("font", UiKit.font(true))
	b.add_theme_font_size_override("font_size", _f(size_px))
	_style_button(b, false)
	return b

func _style_button(b: Button, selected: bool) -> void:
	if b.has_meta("sel") and bool(b.get_meta("sel")) == selected:
		return
	b.set_meta("sel", selected)
	var pad := [roundf(14 * u), roundf(4 * u), roundf(14 * u), roundf(4 * u)]
	b.add_theme_stylebox_override("normal", UiKit.button_box("on" if selected else "off", pad))
	b.add_theme_stylebox_override("hover", UiKit.button_box("on", pad))
	b.add_theme_stylebox_override("pressed", UiKit.button_box("pressed", pad))
	b.add_theme_color_override("font_color", UiKit.GOLD if selected else UiKit.MUTED)
	b.add_theme_color_override("font_hover_color", UiKit.GOLD)
	b.add_theme_color_override("font_pressed_color", UiKit.CREAM)

func _chip(icon: Texture2D) -> Array:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", UiKit.pill_box([roundf(10 * u), roundf(3 * u), roundf(14 * u), roundf(3 * u)]))
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var h := _hb(6.0)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(h)
	var ic := UiKit.icon_rect(roundf(24.0 * u))
	ic.texture = icon
	h.add_child(ic)
	var l := UiKit.label("", _f(UiKit.BUTTON), UiKit.GOLD, true)
	h.add_child(l)
	return [p, l]

func _build() -> void:
	_built_u = u
	_built_cols = columns
	if _root != null:
		for c in cards + emp_cards:
			if c.get_parent() == null:
				c.queue_free()
		remove_child(_root)
		_root.queue_free()
	cards.clear()
	emp_cards.clear()
	nav_buttons.clear()
	setting_buttons.clear()
	lbl_settings.clear()
	_headers.clear()
	_layout_key = ""
	_settings_key = ""

	_root = PanelContainer.new()
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.add_theme_stylebox_override("panel", UiKit.box("ui/panel_drawer_parchment.png", [40, 20, 40, 20], [roundf(44 * u), roundf(24 * u), roundf(44 * u), roundf(20 * u)]))
	add_child(_root)
	var col := _vb(10.0)
	_root.add_child(col)

	# header: back, title, resources, close. Dragging it moves the window.
	var head := _hb(10.0)
	head.mouse_filter = Control.MOUSE_FILTER_STOP
	head.mouse_default_cursor_shape = Control.CURSOR_MOVE
	head.gui_input.connect(_on_header_input)
	col.add_child(head)
	_back = _button(EconomyConfig.tr_key("ui_back"), UiKit.BUTTON)
	_back.pressed.connect(func() -> void: back_requested.emit())
	head.add_child(_back)
	lbl_title = UiKit.label("", _f(UiKit.TITLE), UiKit.GOLD, true, 6)
	head.add_child(lbl_title)
	lbl_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bulk_button = _button("", UiKit.BUTTON, 84.0)
	bulk_button.pressed.connect(func() -> void: bulk_requested.emit())
	head.add_child(bulk_button)
	var chips := [_chip(MenuCard.currency_icon("gold")), _chip(MenuCard.currency_icon("amber")), _chip(MenuCard.currency_icon("voucher")), _chip(load(UiKit.ART + "ui/reputation_star.png"))]
	for c in chips:
		head.add_child(c[0])
	lbl_gold = chips[0][1]
	lbl_amber = chips[1][1]
	lbl_voucher = chips[2][1]
	lbl_star = chips[3][1]
	_close = _button(EconomyConfig.tr_key("ui_close"), UiKit.BUTTON)
	_close.pressed.connect(func() -> void: close_wanted.emit())
	head.add_child(_close)

	# body: tab rail + content
	var body := _hb(12.0)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(body)
	var rail := _vb(8.0)
	rail.custom_minimum_size.x = roundf(112.0 * u)
	body.add_child(rail)
	for i in range(TAB_KEYS.size()):
		var nb := _button("", UiKit.BUTTON + 1, 112.0)
		nb.custom_minimum_size.y = roundf(58.0 * u)
		nb.icon = UiKit.atlas("ui/icons_ui.png", Rect2(float(TAB_ICONS[i]) * 48.0, 0.0, 48.0, 48.0))
		nb.add_theme_constant_override("icon_max_width", int(roundf(36.0 * u)))
		nb.add_theme_constant_override("h_separation", int(roundf(6.0 * u)))
		nb.alignment = HORIZONTAL_ALIGNMENT_LEFT
		nb.pressed.connect(func() -> void: tab_requested.emit(i))
		rail.add_child(nb)
		nav_buttons.append(nb)

	var well := PanelContainer.new()
	well.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	well.add_theme_stylebox_override("panel", UiKit.flat(Color(0.13, 0.08, 0.04, 0.80), [roundf(12 * u), roundf(8 * u), roundf(6 * u), roundf(8 * u)]))
	body.add_child(well)
	_scroll = ScrollContainer.new()
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	well.add_child(_scroll)
	_style_scrollbar(_scroll.get_v_scroll_bar())
	var inner := MarginContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# the scroll bar is drawn over the content: keep its width free
	inner.add_theme_constant_override("margin_right", int(roundf(24.0 * u)))
	inner.add_theme_constant_override("margin_bottom", int(roundf(6.0 * u)))
	_scroll.add_child(inner)
	var stack := _vb(0.0)
	inner.add_child(stack)
	_list = _vb(8.0)
	stack.add_child(_list)
	_settings_box = _vb(12.0)
	stack.add_child(_settings_box)

	# footer: one line, what the hovered tile does, otherwise the latest news
	lbl_toast = UiKit.label("", _f(UiKit.BUTTON), UiKit.CREAM, true, 4)
	lbl_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_toast.custom_minimum_size.y = roundf(26.0 * u)
	lbl_toast.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	col.add_child(lbl_toast)

func _style_scrollbar(sb: VScrollBar) -> void:
	sb.custom_minimum_size.x = roundf(14.0 * u)
	sb.add_theme_stylebox_override("scroll", UiKit.flat(Color(0.07, 0.04, 0.02, 0.55)))
	sb.add_theme_stylebox_override("grabber", UiKit.flat(Color("#8A6238")))
	sb.add_theme_stylebox_override("grabber_highlight", UiKit.flat(Color("#C08A4A")))
	sb.add_theme_stylebox_override("grabber_pressed", UiKit.flat(Color("#E8B64C")))

## Tab page: `data` cards (index order = action order) grouped by their `section`, `emp` cards under `sec_honor`
func show_cards(tab: int, view_id: String, section_order: Array, data: Array, emp: Array) -> void:
	_active_tab = tab
	_settings_box.visible = false
	_list.visible = true
	var groups := {}
	for i in range(data.size()):
		if bool(data[i].get("hidden", false)):
			continue
		var sec := String(data[i].get("section", ""))
		if not groups.has(sec):
			groups[sec] = []
		(groups[sec] as Array).append(i)
	_hidden_emp.clear()
	for he in range(emp.size()):
		if bool(emp[he].get("hidden", false)):
			_hidden_emp.append(he)
	var key := "%d|%s|%s|%d|%s" % [tab, view_id, str(groups), emp.size(), str(_hidden_emp)]
	if key != _layout_key:
		_layout_key = key
		_lay_out(section_order, groups, data.size(), emp.size())
	_hints.clear()
	for i2 in range(mini(cards.size(), data.size())):
		cards[i2].apply(data[i2])
		_hints["c%d" % i2] = String(data[i2].get("hint", ""))
	for e in range(mini(emp_cards.size(), emp.size())):
		emp_cards[e].apply(emp[e])
		_hints["e%d" % e] = String(emp[e].get("hint", ""))
	for sec2 in _headers.keys():
		(_headers[sec2] as Label).text = EconomyConfig.tr_key(String(sec2))

func _lay_out(section_order: Array, groups: Dictionary, n_cards: int, n_emp: int) -> void:
	while cards.size() < n_cards:
		cards.append(_new_card(cards.size(), "c", card_activated))
	while emp_cards.size() < n_emp:
		emp_cards.append(_new_card(emp_cards.size(), "e", emp_activated))
	for c in cards + emp_cards:
		if c.get_parent() != null:
			c.get_parent().remove_child(c)
	for ch in _list.get_children():
		_list.remove_child(ch)
		ch.queue_free()
	_headers.clear()
	var order: Array = section_order.duplicate()
	for g in groups.keys():
		if not order.has(g):
			order.append(g)
	if n_emp > 0 and not order.has("sec_honor"):
		order.append("sec_honor")
	for sec in order:
		var ids: Array = groups.get(sec, [])
		var has_emp := String(sec) == "sec_honor" and n_emp > _hidden_emp.size()
		if ids.is_empty() and not has_emp:
			continue
		if String(sec) != "":
			var h := UiKit.label(EconomyConfig.tr_key(String(sec)), _f(UiKit.SECTION), UiKit.CREAM, true)
			_list.add_child(h)
			_headers[sec] = h
		var grid := GridContainer.new()
		grid.columns = columns
		grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_theme_constant_override("h_separation", int(roundf(10.0 * u)))
		grid.add_theme_constant_override("v_separation", int(roundf(10.0 * u)))
		_list.add_child(grid)
		for id in ids:
			grid.add_child(cards[id])
		if has_emp:
			for ei in range(n_emp):
				if not _hidden_emp.has(ei):
					grid.add_child(emp_cards[ei])
		# fillers keep the last row's cards the same width as the others
		var fill := posmod(-grid.get_child_count(), columns)
		for f in range(fill):
			var sp := Control.new()
			sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
			grid.add_child(sp)
	_scroll.scroll_vertical = 0

func _new_card(idx: int, kind: String, sig: Signal) -> MenuCard:
	var c := MenuCard.new(u)
	c.card_idx = idx
	c.activated.connect(func(i: int) -> void: sig.emit(i))
	c.hovered.connect(func(i: int, on: bool) -> void:
		var k := kind + str(i)
		if on:
			_hover_key = k
		elif _hover_key == k:
			_hover_key = ""
		_show_footer())
	return c

## Settings page. `rows`: [{"key", "label", "options": [[value, text], ...], "value"}] or {"label", "text"}
func show_settings(rows: Array) -> void:
	_active_tab = SETTINGS_TAB
	_list.visible = false
	_settings_box.visible = true
	var key := ""
	for r in rows:
		key += "%s:%s;" % [String(r.get("key", "")), str(r.get("options", []))]
	key += EconomyConfig.current_lang
	if key != _settings_key:
		_settings_key = key
		setting_buttons.clear()
		lbl_settings.clear()
		for ch in _settings_box.get_children():
			_settings_box.remove_child(ch)
			ch.queue_free()
		for r2 in rows:
			var row := _hb(8.0)
			_settings_box.add_child(row)
			var lb := UiKit.label(String(r2["label"]), _f(UiKit.SECTION), UiKit.CREAM, true)
			lb.custom_minimum_size = Vector2(roundf(190.0 * u), roundf(42.0 * u))
			row.add_child(lb)
			lbl_settings.append(lb)
			if r2.has("text"):
				var tx := UiKit.label(String(r2["text"]), _f(UiKit.BUTTON), UiKit.MUTED)
				row.add_child(tx)
				lbl_settings.append(tx)
				continue
			var list: Array = []
			for opt in r2["options"]:
				var b := _button(String(opt[1]), UiKit.BUTTON, 112.0)
				var k2 := String(r2["key"])
				var val: Variant = opt[0]
				b.pressed.connect(func() -> void: setting_requested.emit(k2, val))
				row.add_child(b)
				list.append([val, b])
			setting_buttons[String(r2["key"])] = list
		_scroll.scroll_vertical = 0
	for r3 in rows:
		if not r3.has("options"):
			continue
		var pairs: Array = setting_buttons.get(String(r3["key"]), [])
		for pi in range(pairs.size()):
			(pairs[pi][1] as Button).text = String(r3["options"][pi][1])
			_style_button(pairs[pi][1], r3.has("value") and pairs[pi][0] == r3["value"])

func _show_footer() -> void:
	var hint := String(_hints.get(_hover_key, "")) if _active_tab != SETTINGS_TAB else ""
	lbl_toast.text = hint if hint != "" else _toast
	lbl_toast.label_settings.font_color = UiKit.CREAM if hint != "" else UiKit.GOLD

## The "how many per press" switch of the Build and Crew tabs
func set_bulk(on: bool, text: String, lit: bool) -> void:
	bulk_button.visible = on
	bulk_button.text = text
	_style_button(bulk_button, lit)

func set_chrome(tab: int, title_txt: String, can_go_back: bool, toast: String) -> void:
	lbl_title.text = title_txt
	_toast = toast
	_show_footer()
	# vouchers and stars only matter on the codex tab
	(lbl_voucher.get_parent().get_parent() as Control).visible = tab == 3
	(lbl_star.get_parent().get_parent() as Control).visible = tab == 3
	_back.visible = can_go_back
	_back.text = EconomyConfig.tr_key("ui_back")
	_close.text = EconomyConfig.tr_key("ui_close")
	for i in range(nav_buttons.size()):
		nav_buttons[i].text = EconomyConfig.tr_key(TAB_KEYS[i])
		_style_button(nav_buttons[i], i == tab)

func card_rect(idx: int) -> Rect2:
	return cards[idx].get_global_rect() if idx >= 0 and idx < cards.size() else Rect2()

func content_rect() -> Rect2:
	return _scroll.get_global_rect()

func _on_header_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_dragging = event.pressed
		_drag_from = DisplayServer.mouse_get_position()
		_drag_win = position
	elif event is InputEventMouseMotion and _dragging:
		position = _drag_win + DisplayServer.mouse_get_position() - _drag_from

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			close_wanted.emit()
		elif event.keycode == KEY_F9:
			WindowController.toggle_boss_stealth()

## Tiles of hidden entries live outside the tree: freed together with the window
func _notification(what: int) -> void:
	if what == NOTIFICATION_PREDELETE:
		for c in cards + emp_cards:
			if is_instance_valid(c) and c.get_parent() == null:
				c.free()
