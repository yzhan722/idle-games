extends PanelContainer
class_name MenuCard
## One tile of the menu window (`src/ui/MenuCard.gd`): a big icon, a short name, and one button with its price. Nothing to
## read: the one-line explanation (`hint`) only shows in the window's footer while the mouse is over the tile.
## Keys read from the card dictionary: `title`, `level`, `icons`, `progress` ([value, max]), `pips` ([[texture, on], ...]),
## `verb`, `price` ({"cur": "gold" / "amber", "n": int}), `cost` (a very short status, shown when there is no button),
## `cost_state`.

signal activated(card_idx: int)
signal hovered(card_idx: int, on: bool)

const TILE_W := 176.0
const TILE_H := 178.0

var card_idx: int = -1
var lbl_title: Label
var lbl_level: Label
var lbl_cost: Label
var lbl_verb: Label
var lbl_price: Label
var icon_main: TextureRect
var icon_extra: TextureRect
var icon_price: TextureRect
var pill: PanelContainer
var bar: Control
var bar_ratio: float = 0.0
var pips_row: HBoxContainer
var _pips: Array[TextureRect] = []
var _down := false
var _u := 1.0
var _style_n: StyleBoxTexture
var _style_h: StyleBoxTexture

func _init(u: float) -> void:
	_u = u
	mouse_filter = Control.MOUSE_FILTER_STOP
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	custom_minimum_size = Vector2(0.0, roundf(TILE_H * u))
	var pad := [roundf(12 * u), roundf(10 * u), roundf(12 * u), roundf(12 * u)]
	_style_n = UiKit.button_box("off", pad)
	_style_h = UiKit.button_box("on", pad)
	add_theme_stylebox_override("panel", _style_n)

	var col := _box(VBoxContainer.new(), 3.0)
	add_child(col)
	var slot := Control.new()
	slot.custom_minimum_size = Vector2(0.0, roundf(74.0 * u))
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(slot)
	icon_main = UiKit.icon_rect(0.0)
	icon_main.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	slot.add_child(icon_main)
	icon_extra = UiKit.icon_rect(0.0)
	icon_extra.set_anchors_preset(Control.PRESET_CENTER)
	icon_extra.position = Vector2(roundf(22.0 * u), roundf(6.0 * u))
	icon_extra.size = Vector2(32.0, 32.0) * u
	slot.add_child(icon_extra)
	lbl_level = UiKit.label("", _f(UiKit.MIN), UiKit.CREAM, true, 6)
	lbl_level.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	lbl_level.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	slot.add_child(lbl_level)

	lbl_title = UiKit.label("", _f(UiKit.CARD_TITLE), UiKit.CREAM, true, 4)
	lbl_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	col.add_child(lbl_title)
	bar = Control.new()
	bar.custom_minimum_size = Vector2(0.0, roundf(7.0 * u))
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.draw.connect(_draw_bar)
	col.add_child(bar)

	var foot := _box(VBoxContainer.new(), 0.0)
	foot.custom_minimum_size.y = roundf(36.0 * u)
	foot.size_flags_vertical = Control.SIZE_EXPAND_FILL
	foot.alignment = BoxContainer.ALIGNMENT_END
	col.add_child(foot)
	pips_row = _box(HBoxContainer.new(), 4.0)
	pips_row.alignment = BoxContainer.ALIGNMENT_CENTER
	foot.add_child(pips_row)
	lbl_cost = UiKit.label("", _f(UiKit.BUTTON), UiKit.CREAM, true, 4)
	lbl_cost.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl_cost.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	foot.add_child(lbl_cost)
	pill = PanelContainer.new()
	pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pill.add_theme_stylebox_override("panel", UiKit.pill_box([roundf(8 * u), roundf(3 * u), roundf(8 * u), roundf(3 * u)]))
	foot.add_child(pill)
	var pr := _box(HBoxContainer.new(), 4.0)
	pr.alignment = BoxContainer.ALIGNMENT_CENTER
	pill.add_child(pr)
	icon_price = UiKit.icon_rect(roundf(22.0 * u))
	pr.add_child(icon_price)
	lbl_price = UiKit.label("", _f(UiKit.CARD_TITLE), UiKit.GREEN, true)
	pr.add_child(lbl_price)
	lbl_verb = UiKit.label("", _f(UiKit.BUTTON), UiKit.GREEN, true)
	pr.add_child(lbl_verb)

	mouse_entered.connect(_set_hover.bind(true))
	mouse_exited.connect(_set_hover.bind(false))

func _f(sz: int) -> int:
	return int(roundf(float(sz) * _u))

func _box(b: BoxContainer, sep: float) -> BoxContainer:
	b.add_theme_constant_override("separation", int(roundf(sep * _u)))
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

func _set_hover(on: bool) -> void:
	_down = _down and on
	add_theme_stylebox_override("panel", _style_h if on else _style_n)
	if on and SoundManager != null:
		SoundManager.play_hover_sfx()
	hovered.emit(card_idx, on)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_down = true
		elif _down:
			_down = false
			if Rect2(Vector2.ZERO, size).has_point(event.position):
				accept_event()
				activated.emit(card_idx)

func apply(data: Dictionary) -> void:
	var state := String(data.get("cost_state", "normal"))
	lbl_title.text = String(data.get("title", ""))
	var lv := int(data.get("level", 0))
	lbl_level.text = "Lv.%d" % lv if lv > 0 else ""
	var steps := int(data.get("steps", 1))
	if steps > 1:
		lbl_level.text = "+%d" % steps

	var icons: Array = data.get("icons", [])
	icon_main.texture = icons[0] if icons.size() > 0 else null
	var dim := bool(data.get("dim", false))
	icon_extra.texture = icons[1] if icons.size() > 1 and not dim else null
	icon_main.modulate = Color(0.50, 0.48, 0.50, 0.80) if dim else Color.WHITE
	if bool(data.get("shadow", false)):
		icon_main.modulate = Color(0.0, 0.0, 0.0, 0.55)

	var verb := String(data.get("verb", ""))
	var price: Dictionary = data.get("price", {})
	pill.visible = verb != "" or not price.is_empty()
	if pill.visible:
		var can := state != "short"
		icon_price.visible = not price.is_empty()
		lbl_price.visible = icon_price.visible
		lbl_verb.visible = not icon_price.visible
		lbl_verb.text = verb
		if icon_price.visible:
			icon_price.texture = currency_icon(String(price.get("cur", "gold")))
			lbl_price.text = UiKit.num(int(price.get("n", 0)))
			lbl_price.label_settings.font_color = UiKit.GREEN if can else UiKit.RED
		pill.modulate = Color.WHITE if can else Color(0.82, 0.78, 0.76)

	lbl_cost.text = String(data.get("cost", ""))
	lbl_cost.visible = not pill.visible and lbl_cost.text != ""
	lbl_cost.label_settings.font_color = UiKit.GOLD if state == "unlocked" else UiKit.CREAM

	var pg: Array = data.get("progress", [])
	bar.visible = pg.size() == 2 and float(pg[1]) > 0.0
	if bar.visible:
		bar_ratio = clampf(float(pg[0]) / float(pg[1]), 0.0, 1.0)
		bar.queue_redraw()

	var pips: Array = data.get("pips", [])
	pips_row.visible = not pips.is_empty()
	while _pips.size() < pips.size():
		var p := UiKit.icon_rect(roundf(32.0 * _u))
		pips_row.add_child(p)
		_pips.append(p)
	for i in range(_pips.size()):
		_pips[i].visible = i < pips.size()
		if i < pips.size():
			_pips[i].texture = pips[i][0]
			_pips[i].modulate = Color.WHITE if bool(pips[i][1]) else Color(0.22, 0.17, 0.15, 0.60)

func _draw_bar() -> void:
	var r := Rect2(Vector2.ZERO, bar.size)
	bar.draw_rect(r, Color(0.10, 0.06, 0.03, 0.75), true)
	bar.draw_rect(Rect2(1.0, 1.0, maxf(0.0, (r.size.x - 2.0) * bar_ratio), r.size.y - 2.0), Color("#E8B64C"), true)

static func currency_icon(cur: String) -> Texture2D:
	match cur:
		"amber":
			return UiKit.atlas("ui/icons_ui.png", Rect2(48.0, 0.0, 48.0, 48.0))
		"voucher":
			return load(EconomyConfig.ICON_RARE_VOUCHER_TEX)
		_:
			return UiKit.atlas("ui/icons_ui.png", Rect2(0.0, 0.0, 48.0, 48.0))

## Texts of this tile that do not fit the narrowest tile (self-test; needs no layout pass)
func overflowing_texts() -> Array[String]:
	var out: Array[String] = []
	var inner := (TILE_W - 24.0) * _u
	for l in [lbl_title, lbl_cost]:
		if l.visible and l.text != "" and UiKit.text_width(l) > inner:
			out.append("`%s` %.0f>%.0fpx" % [l.text, UiKit.text_width(l), inner])
	if pill.visible:
		var w := (UiKit.text_width(lbl_price) + 26.0 * _u) if lbl_price.visible else UiKit.text_width(lbl_verb)
		if w > inner - 16.0 * _u:
			out.append("button `%s%s` %.0f>%.0fpx" % [lbl_price.text if lbl_price.visible else "", lbl_verb.text, w, inner])
	return out
