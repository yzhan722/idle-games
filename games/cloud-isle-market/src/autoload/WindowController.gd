extends Node
## Desktop Companion Window & Mouse Passthrough Autoload (`src/autoload/WindowController.gd`) — PRD v2.2 Unified Architecture
## Registered as Autoload `WindowController`:
## - Manages the 1920x300 desktop borderless transparent strip window.
## - Supports `Alt + Left-Click` or HUD bar dragging and dynamic `DisplayServer.window_set_mouse_passthrough(poly)`.

enum DockPosition { BOTTOM_STRIP, TOP_STRIP }

const VIEWPORT_W := 1920.0
const VIEWPORT_H := 300.0
const SCALE_PRESETS: Array[float] = [0.75, 1.0, 1.25]
const SCALE_LABELS: Array[String] = ["75%", "100%", "125%"]

var current_dock: DockPosition = DockPosition.BOTTOM_STRIP
var scale_idx: int = 1
var target_screen_idx: int = 0
var scale_factor: float = 1.0
var custom_pos_active: bool = false
var custom_pos: Vector2i = Vector2i.ZERO

var is_dragging: bool = false
var _drag_start_mouse: Vector2i = Vector2i.ZERO
var _drag_start_win_pos: Vector2i = Vector2i.ZERO

var _last_island_rect: Rect2 = Rect2(40, 0, 1840, 300)
var _last_hud_rect: Rect2 = Rect2(480, 230, 960, 58)
var _last_drawer_rect: Rect2 = Rect2()

func _ready() -> void:
	get_tree().root.transparent_bg = true
	DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_TRANSPARENT, true)
	DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_BORDERLESS, true)
	DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
	target_screen_idx = DisplayServer.window_get_current_screen()
	snap_window_to_desktop(current_dock)

func _process(_delta: float) -> void:
	if not is_dragging:
		return
	if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and not Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		stop_window_drag()
		return
	var cur_mouse := DisplayServer.mouse_get_position()
	var next_pos := _drag_start_win_pos + (cur_mouse - _drag_start_mouse)
	custom_pos_active = true
	custom_pos = next_pos
	if DisplayServer.window_get_position() != next_pos:
		DisplayServer.window_set_position(next_pos)

func setup(_world: Node = null, _hud: Node = null) -> void:
	_refresh_passthrough()

func begin_window_drag() -> void:
	start_window_drag()

func end_window_drag() -> void:
	stop_window_drag()

func start_window_drag() -> void:
	if is_dragging:
		return
	is_dragging = true
	_drag_start_mouse = DisplayServer.mouse_get_position()
	_drag_start_win_pos = DisplayServer.window_get_position()
	DisplayServer.window_set_mouse_passthrough(PackedVector2Array())

func stop_window_drag() -> void:
	if not is_dragging:
		return
	is_dragging = false
	_refresh_passthrough()

func snap_window_to_desktop(dock: DockPosition) -> void:
	var count := maxi(1, DisplayServer.get_screen_count())
	var screen_idx := clampi(target_screen_idx, 0, count - 1)
	var usable_rect := DisplayServer.screen_get_usable_rect(screen_idx)
	var base_scale := float(usable_rect.size.x) / VIEWPORT_W
	var user_mult: float = SCALE_PRESETS[clampi(scale_idx, 0, SCALE_PRESETS.size() - 1)]
	scale_factor = minf(base_scale * 1.25, base_scale * user_mult)
	var win_w := int(roundf(VIEWPORT_W * scale_factor))
	var win_h := int(roundf(VIEWPORT_H * scale_factor))
	var pos_x := usable_rect.position.x + int((usable_rect.size.x - win_w) * 0.5)
	var pos_y := usable_rect.position.y + usable_rect.size.y - win_h
	if dock == DockPosition.TOP_STRIP:
		pos_y = usable_rect.position.y
	if custom_pos_active:
		pos_x = custom_pos.x
		pos_y = custom_pos.y
	DisplayServer.window_set_size(Vector2i(win_w, win_h))
	DisplayServer.window_set_position(Vector2i(pos_x, pos_y))

func update_passthrough_polygon(logical_island_rect: Rect2, logical_hud_rect: Rect2, logical_drawer_rect: Rect2 = Rect2()) -> void:
	_last_island_rect = logical_island_rect
	_last_hud_rect = logical_hud_rect
	_last_drawer_rect = logical_drawer_rect
	if not is_dragging:
		_refresh_passthrough()

func _refresh_passthrough() -> void:
	if is_dragging:
		return
	var merged := _last_island_rect.merge(_last_hud_rect)
	if _last_drawer_rect.size.x > 0 and _last_drawer_rect.size.y > 0:
		merged = merged.merge(_last_drawer_rect)
	merged.position.y = 0.0
	merged.size.y = VIEWPORT_H
	var s := scale_factor
	var poly := PackedVector2Array([
		Vector2(merged.position.x * s, 0.0),
		Vector2(merged.end.x * s, 0.0),
		Vector2(merged.end.x * s, VIEWPORT_H * s),
		Vector2(merged.position.x * s, VIEWPORT_H * s)
	])
	DisplayServer.window_set_mouse_passthrough(poly)
