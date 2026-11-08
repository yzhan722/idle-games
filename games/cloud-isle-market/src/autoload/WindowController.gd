extends Node
## Desktop Companion Window, Multi-Island + UI Polygon Mouse Passthrough & Alt+Drag Controller (`src/autoload/WindowController.gd`)
## Strictly implements PRD v2.2 Section 1 & Section 5:
## - Controls `WINDOW_FLAG_TRANSPARENT`, `WINDOW_FLAG_BORDERLESS`, `WINDOW_FLAG_ALWAYS_ON_TOP` and `get_tree().root.transparent_bg`.
## - Dynamically computes the non-rectangular hull polygon covering the 3 islands AND the active HUD/drawer panel,
##   and passes it to `DisplayServer.window_set_mouse_passthrough(polygon)` so clicking transparent sky passes through to desktop apps.
## - Implements `Alt + Mouse Left-Click` (or HUD bar drag) window position dragging with multi-monitor clamping.

enum DockPosition { BOTTOM_STRIP, TOP_STRIP }

const VIEWPORT_W := 1920.0
const VIEWPORT_H := 300.0
const SCALE_PRESETS: Array[float] = [0.75, 1.0, 1.25]
const SCALE_LABELS: Array[String] = ["75%", "100%", "125%"]

## Per-island logical bounding rectangles in the 1920x300 panoramic strip
const ISLAND_2_LOCAL_RECT := Rect2(56.0, 58.0, 480.0, 178.0)
const ISLAND_1_LOCAL_RECT := Rect2(548.0, 42.0, 768.0, 198.0)
const ISLAND_3_LOCAL_RECT := Rect2(1310.0, 58.0, 560.0, 178.0)

var current_dock: DockPosition = DockPosition.BOTTOM_STRIP
var scale_idx: int = 1
var target_screen_idx: int = 0
var scale_factor: float = 1.0
var custom_pos_active: bool = false
var custom_pos: Vector2i = Vector2i.ZERO

var is_dragging: bool = false
var boss_stealth_active: bool = false
var target_fps: int = 60
var window_opacity: float = 1.0
var _drag_start_mouse: Vector2i = Vector2i.ZERO
var _drag_start_win_pos: Vector2i = Vector2i.ZERO

var _world_ref: Node2D = null
var _hud_ref: Control = null
var _last_island_rect: Rect2 = Rect2(40.0, 38.0, 1840.0, 210.0)
var _last_hud_rect: Rect2 = Rect2(480.0, 230.0, 960.0, 58.0)
var _last_drawer_rect: Rect2 = Rect2()
var _last_passthrough_polygon: PackedVector2Array = PackedVector2Array()

func _ready() -> void:
	var companion_on := true
	if GameManager != null:
		companion_on = GameManager.desktop_companion_mode
	apply_window_mode(companion_on)
	target_screen_idx = DisplayServer.window_get_current_screen()
	snap_window_to_desktop(current_dock)

	if EventBus != null:
		EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)

func _on_toggle_desktop_mode(enabled: bool) -> void:
	apply_window_mode(enabled)

func apply_window_mode(companion_enabled: bool) -> void:
	if companion_enabled:
		get_tree().root.transparent_bg = true
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_TRANSPARENT, true)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_BORDERLESS, true)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, true)
		_refresh_passthrough()
	else:
		get_tree().root.transparent_bg = false
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_ALWAYS_ON_TOP, false)
		DisplayServer.window_set_flag(DisplayServer.WINDOW_FLAG_BORDERLESS, false)
		DisplayServer.window_set_mouse_passthrough(PackedVector2Array())

func _input(event: InputEvent) -> void:
	# Global F9 Boss Key Stealth Toggle (hides islands & shrinks HUD while keeping 100% idle production running)
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F9:
		toggle_boss_stealth()
		return
	# Global Alt + Left-Click window drag support anywhere over the window
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and Input.is_key_pressed(KEY_ALT):
			start_window_drag()
		elif not event.pressed and is_dragging:
			stop_window_drag()

func toggle_boss_stealth() -> bool:
	boss_stealth_active = not boss_stealth_active
	if _world_ref != null and "world_root" in _world_ref and _world_ref.world_root != null:
		_world_ref.world_root.modulate.a = 0.0 if boss_stealth_active else window_opacity
	if _hud_ref != null and _hud_ref.has_method("set_boss_stealth"):
		_hud_ref.call("set_boss_stealth", boss_stealth_active)
	_refresh_passthrough()
	return boss_stealth_active

func set_eco_fps(fps: int) -> int:
	target_fps = 30 if fps <= 30 else 60
	Engine.max_fps = target_fps
	return target_fps

func toggle_eco_fps() -> int:
	return set_eco_fps(30 if target_fps == 60 else 60)

func get_eco_fps() -> int:
	return target_fps

func set_window_opacity(alpha: float) -> float:
	window_opacity = clampf(alpha, 0.60, 1.0)
	_apply_window_opacity()
	return window_opacity

func cycle_window_opacity() -> float:
	if window_opacity >= 0.95:
		return set_window_opacity(0.80)
	elif window_opacity >= 0.75:
		return set_window_opacity(0.60)
	else:
		return set_window_opacity(1.0)

func get_window_opacity() -> float:
	return window_opacity

func _apply_window_opacity() -> void:
	if boss_stealth_active:
		return
	if _world_ref != null and "world_root" in _world_ref and _world_ref.world_root != null:
		_world_ref.world_root.modulate.a = window_opacity
	elif _world_ref != null:
		_world_ref.modulate.a = window_opacity
	if _hud_ref != null and "hud_opacity" in _hud_ref:
		_hud_ref.modulate.a = _hud_ref.hud_opacity * window_opacity

func snap_to_taskbar() -> void:
	custom_pos_active = false
	snap_window_to_desktop(DockPosition.BOTTOM_STRIP)

func _process(_delta: float) -> void:
	if not is_dragging:
		return
	if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and not Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		stop_window_drag()
		return
	var cur_mouse := DisplayServer.mouse_get_position()
	var raw_next := _drag_start_win_pos + (cur_mouse - _drag_start_mouse)
	var clamped_pos := _clamp_window_to_desktop_bounds(raw_next)
	custom_pos_active = true
	custom_pos = clamped_pos
	if DisplayServer.window_get_position() != clamped_pos:
		DisplayServer.window_set_position(clamped_pos)

func _clamp_window_to_desktop_bounds(pos: Vector2i) -> Vector2i:
	var count := maxi(1, DisplayServer.get_screen_count())
	var screen_idx := clampi(target_screen_idx, 0, count - 1)
	var usable := DisplayServer.screen_get_usable_rect(screen_idx)
	var win_size := DisplayServer.window_get_size()
	var min_x := usable.position.x - int(win_size.x * 0.45)
	var max_x := usable.position.x + usable.size.x - int(win_size.x * 0.55)
	var min_y := usable.position.y
	var max_y := usable.position.y + usable.size.y - int(win_size.y * 0.35)
	return Vector2i(clampi(pos.x, min_x, maxi(min_x, max_x)), clampi(pos.y, min_y, maxi(min_y, max_y)))

func setup(world: Node = null, hud: Node = null) -> void:
	if world is Node2D:
		_world_ref = world
	if hud is Control:
		_hud_ref = hud
	_apply_window_opacity()
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

func cycle_window_scale() -> float:
	scale_idx = (scale_idx + 1) % SCALE_PRESETS.size()
	snap_window_to_desktop(current_dock)
	return SCALE_PRESETS[scale_idx]

func toggle_dock_position() -> DockPosition:
	current_dock = DockPosition.TOP_STRIP if current_dock == DockPosition.BOTTOM_STRIP else DockPosition.BOTTOM_STRIP
	custom_pos_active = false
	snap_window_to_desktop(current_dock)
	return current_dock

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
	_refresh_passthrough()

func update_passthrough_polygon(logical_island_rect: Rect2, logical_hud_rect: Rect2, logical_drawer_rect: Rect2 = Rect2()) -> void:
	if _last_island_rect == logical_island_rect and _last_hud_rect == logical_hud_rect and _last_drawer_rect == logical_drawer_rect and not _last_passthrough_polygon.is_empty():
		return
	_last_island_rect = logical_island_rect
	_last_hud_rect = logical_hud_rect
	_last_drawer_rect = logical_drawer_rect
	if not is_dragging:
		_refresh_passthrough()

func get_current_passthrough_polygon() -> PackedVector2Array:
	return _last_passthrough_polygon

func _compute_active_islands_span() -> Rect2:
	var span := ISLAND_1_LOCAL_RECT
	if GameManager != null:
		if bool(GameManager.unlocked_islands.get(2, false)):
			span = span.merge(ISLAND_2_LOCAL_RECT)
		else:
			# Include silhouette bridge/island click preview zone
			span = span.merge(Rect2(60.0, 74.0, 460.0, 150.0))
		if bool(GameManager.unlocked_islands.get(3, false)):
			span = span.merge(ISLAND_3_LOCAL_RECT)
		else:
			span = span.merge(Rect2(1312.0, 74.0, 540.0, 150.0))
	return span.merge(_last_island_rect)

func _refresh_passthrough() -> void:
	if is_dragging:
		return
	if GameManager != null and not GameManager.desktop_companion_mode:
		DisplayServer.window_set_mouse_passthrough(PackedVector2Array())
		return

	var s := maxf(0.1, scale_factor)
	if boss_stealth_active:
		# In F9 Boss Stealth Mode, only the tiny bottom capsule strip receives mouse input; 99% of desktop passes through!
		var stealth_poly := PackedVector2Array([
			Vector2(760.0 * s, 232.0 * s),
			Vector2(1160.0 * s, 232.0 * s),
			Vector2(1160.0 * s, 276.0 * s),
			Vector2(760.0 * s, 276.0 * s)
		])
		_last_passthrough_polygon = stealth_poly
		DisplayServer.window_set_mouse_passthrough(stealth_poly)
		return

	var isl_rect := _compute_active_islands_span()
	var ui_rect := _last_hud_rect
	if _last_drawer_rect.size.x > 0.0 and _last_drawer_rect.size.y > 0.0:
		ui_rect = ui_rect.merge(_last_drawer_rect)

	var top_y := maxf(0.0, minf(isl_rect.position.y, ui_rect.position.y))
	var bot_y := minf(VIEWPORT_H, maxf(isl_rect.end.y, ui_rect.end.y))
	var isl_l := clampf(isl_rect.position.x, 0.0, VIEWPORT_W)
	var isl_r := clampf(isl_rect.end.x, 0.0, VIEWPORT_W)
	var ui_l := clampf(ui_rect.position.x, isl_l, VIEWPORT_W)
	var ui_r := clampf(ui_rect.end.x, 0.0, isl_r)
	var split_y := clampf(ui_rect.position.y, top_y + 12.0, bot_y - 12.0)

	# 8-vertex stepped polygon tightly wrapping the 3 islands + bottom HUD/drawer panel
	var poly := PackedVector2Array([
		Vector2(isl_l * s, top_y * s),
		Vector2(isl_r * s, top_y * s),
		Vector2(isl_r * s, split_y * s),
		Vector2(maxf(isl_r, ui_r) * s, split_y * s),
		Vector2(maxf(isl_r, ui_r) * s, bot_y * s),
		Vector2(minf(isl_l, ui_l) * s, bot_y * s),
		Vector2(minf(isl_l, ui_l) * s, split_y * s),
		Vector2(isl_l * s, split_y * s)
	])
	_last_passthrough_polygon = poly
	DisplayServer.window_set_mouse_passthrough(poly)
