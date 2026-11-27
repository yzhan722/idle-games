extends Window
class_name GuestPopup
## "Who came by" (`src/ui/GuestPopup.gd`): a small card above the strip. Guests with the gifts they left, one button to take them
## all. Nothing to read; it never takes the keyboard focus.

signal taken

const CELLS := 7

var cells: Array[Dictionary] = []
var btn_take: Button
var lbl_gold: Label
var lbl_amber: Label
var lbl_more: Label

var _u := 1.0
var _root: PanelContainer
var _row: HBoxContainer
var _amber_box: Control

func _init() -> void:
	title = "Cloud Isle Market"
	visible = false
	borderless = true
	unresizable = true
	unfocusable = true
	transparent = true
	transparent_bg = true
	transient = true
	wrap_controls = false
	canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
	snap_2d_transforms_to_pixel = true
	close_requested.connect(func() -> void: hide())

func open() -> void:
	_place()
	refresh()
	if not visible:
		show()
		if DisplayServer.get_name() != "headless":
			DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED, get_window_id())
		_place()

func _place() -> void:
	var main := get_tree().root
	var usable := DisplayServer.screen_get_usable_rect(main.current_screen)
	if usable.size.x <= 0 or usable.size.y <= 0:
		usable = Rect2i(Vector2i.ZERO, Vector2i(1920, 1040))
	var strip := maxf(0.1, WindowController.scale_factor)
	var ui := clampf(float(usable.size.y) / 1080.0, 0.85, 3.0) * WindowController.text_scale
	var u := ui / strip
	if _root == null or absf(u - _u) > 0.001:
		_u = u
		_build()
	refresh()
	content_scale_factor = strip
	var want := _root.get_combined_minimum_size()
	size = Vector2i(int(ceilf(want.x * strip)), int(ceilf(want.y * strip)))
	var py := main.position.y + int(8.0 * strip) - size.y
	if WindowController.current_dock == WindowController.DockPosition.TOP_STRIP:
		py = main.position.y + main.size.y
	position = Vector2i(clampi(main.position.x + (main.size.x - size.x) / 2, usable.position.x, maxi(usable.position.x, usable.end.x - size.x)), clampi(py, usable.position.y, maxi(usable.position.y, usable.end.y - size.y)))

func _f(sz: int) -> int:
	return int(roundf(float(sz) * _u))

func _hb(sep: float) -> HBoxContainer:
	var b := HBoxContainer.new()
	b.add_theme_constant_override("separation", int(roundf(sep * _u)))
	b.alignment = BoxContainer.ALIGNMENT_CENTER
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

func _icon(sz: float, tex: Texture2D = null) -> TextureRect:
	var ic := UiKit.icon_rect(roundf(sz * _u))
	ic.texture = tex
	return ic

func _build() -> void:
	if _root != null:
		remove_child(_root)
		_root.queue_free()
	cells.clear()
	_root = PanelContainer.new()
	_root.add_theme_stylebox_override("panel", UiKit.box("ui/panel_drawer_parchment.png", [40, 20, 40, 20], [roundf(48 * _u), roundf(22 * _u), roundf(48 * _u), roundf(22 * _u)]))
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", int(roundf(10.0 * _u)))
	_root.add_child(col)
	_row = _hb(10.0)
	col.add_child(_row)
	for i in range(CELLS):
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UiKit.flat(Color(0.13, 0.08, 0.04, 0.80), [roundf(8 * _u), roundf(6 * _u), roundf(8 * _u), roundf(6 * _u)]))
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_row.add_child(p)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", int(roundf(2.0 * _u)))
		v.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(v)
		var who := _icon(72.0)
		v.add_child(who)
		var gift := _hb(4.0)
		v.add_child(gift)
		var keep := _icon(34.0)
		gift.add_child(keep)
		var cnt := UiKit.label("", _f(UiKit.BUTTON), UiKit.CREAM, true, 4)
		gift.add_child(cnt)
		cells.append({"root": p, "who": who, "keep": keep, "count": cnt})
	lbl_more = UiKit.label("", _f(UiKit.SECTION), UiKit.CREAM, true, 4)
	_row.add_child(lbl_more)

	var foot := _hb(14.0)
	col.add_child(foot)
	var gold := _hb(6.0)
	foot.add_child(gold)
	gold.add_child(_icon(28.0, MenuCard.currency_icon("gold")))
	lbl_gold = UiKit.label("", _f(UiKit.CARD_TITLE), UiKit.GOLD, true, 4)
	gold.add_child(lbl_gold)
	var amb := _hb(6.0)
	foot.add_child(amb)
	_amber_box = amb
	amb.add_child(_icon(26.0, MenuCard.currency_icon("amber")))
	lbl_amber = UiKit.label("", _f(UiKit.CARD_TITLE), UiKit.BLUE, true, 4)
	amb.add_child(lbl_amber)
	btn_take = Button.new()
	btn_take.focus_mode = Control.FOCUS_NONE
	btn_take.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	btn_take.custom_minimum_size = Vector2(roundf(150.0 * _u), roundf(46.0 * _u))
	btn_take.add_theme_font_override("font", UiKit.font(true))
	btn_take.add_theme_font_size_override("font_size", _f(UiKit.CARD_TITLE))
	var pad := [roundf(16 * _u), roundf(4 * _u), roundf(16 * _u), roundf(4 * _u)]
	btn_take.add_theme_stylebox_override("normal", UiKit.button_box("on", pad))
	btn_take.add_theme_stylebox_override("hover", UiKit.button_box("on", pad))
	btn_take.add_theme_stylebox_override("pressed", UiKit.button_box("pressed", pad))
	for c in ["font_color", "font_hover_color", "font_pressed_color"]:
		btn_take.add_theme_color_override(c, UiKit.GREEN)
	btn_take.pressed.connect(_on_take)
	foot.add_child(btn_take)

func refresh() -> void:
	if _root == null:
		return
	var list: Array = GameManager.guest_pending
	for i in range(CELLS):
		var c: Dictionary = cells[i]
		(c["root"] as Control).visible = i < list.size()
		if i >= list.size():
			continue
		var e: Dictionary = list[i]
		(c["who"] as TextureRect).texture = Guests.portrait(String(e["id"]))
		var keep := String(e["keep"])
		(c["keep"] as TextureRect).texture = Guests.decor_tex(keep) if keep != "" else load(EconomyConfig.BIRTHDAY_GIFT_TEX)
		(c["count"] as Label).text = "×%d" % int(e["n"]) if int(e["n"]) > 1 else ""
		(c["count"] as Label).visible = int(e["n"]) > 1
	lbl_more.text = "+%d" % (list.size() - CELLS)
	lbl_more.visible = list.size() > CELLS
	var t := GameManager.get_pending_guest_totals()
	lbl_gold.text = UiKit.num(int(t["gold"]))
	lbl_amber.text = UiKit.num(int(t["amber"]))
	_amber_box.visible = int(t["amber"]) > 0
	btn_take.text = EconomyConfig.tr_key("gu_take")

func _on_take() -> void:
	hide()
	GameManager.claim_guest_gifts()
	taken.emit()

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		hide()
