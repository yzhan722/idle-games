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

## Per-island logical bounding rectangles in the 1920x300 panoramic strip
const ISLAND_2_LOCAL_RECT := Rect2(56.0, 58.0, 480.0, 178.0)
const ISLAND_1_LOCAL_RECT := Rect2(548.0, 42.0, 768.0, 198.0)
const ISLAND_3_LOCAL_RECT := Rect2(1310.0, 58.0, 560.0, 178.0)

var current_dock: DockPosition = DockPosition.BOTTOM_STRIP
var scale_idx: int = 1
var target_screen_idx: int = 0
## The screen the player put the strip on; it goes back there when that screen returns
var home_screen_idx: int = 0
var scale_factor: float = 1.0
var custom_pos_active: bool = false
var custom_pos: Vector2i = Vector2i.ZERO

var is_dragging: bool = false
var boss_stealth_active: bool = false
## A companion runs at 30 frames unless the player asks for more; dragging the strip is always smooth
var target_fps: int = 30
const DRAG_FPS := 60
const STEALTH_FPS := 10
var window_opacity: float = 1.0
## Interface size of the menu window (1.0 / 1.15 / 1.3)
var text_scale: float = 1.0
var ui_settings_path: String = "user://ui_settings.cfg"
var _settings_enabled: bool = true
var _saved_sound: Array = []
var _muted_before_stealth: bool = false
var _screens_seen: Array = []
var _drag_moved: bool = false
const DRAG_START_PX := 4
var _screen_check_left: float = 0.0
const SCREEN_CHECK_SEC := 2.0
var _drag_start_mouse: Vector2i = Vector2i.ZERO
var _drag_start_win_pos: Vector2i = Vector2i.ZERO

var _world_ref: Node2D = null
var _hud_ref: Control = null
var _last_island_rect: Rect2 = Rect2(40.0, 38.0, 1840.0, 210.0)
var _last_hud_rect: Rect2 = Rect2(480.0, 230.0, 960.0, 58.0)
var _last_drawer_rect: Rect2 = Rect2()
var _last_balloon_rect: Rect2 = Rect2()
var _last_airship_rect: Rect2 = Rect2()
var _last_greenhouse_rect: Rect2 = Rect2()
var _last_hotspring_rect: Rect2 = Rect2()
var _last_windmill_rect: Rect2 = Rect2()
var _last_tea_pavilion_rect: Rect2 = Rect2()
var _last_moon_boat_rect: Rect2 = Rect2()
## CI-13: extra clickable sky notches (one per flying kite of the Cloud-Sea Kite Festival)
var _last_extra_sky_rects: Array = []
var _last_passthrough_polygon: PackedVector2Array = PackedVector2Array()

func _ready() -> void:
	for arg in OS.get_cmdline_args() + OS.get_cmdline_user_args():
		if String(arg) == "--self-test" or String(arg) == "--playtest":
			_settings_enabled = false
	_load_ui_settings()
	if _settings_enabled:
		Engine.max_fps = target_fps
	else:
		target_fps = 60
	var companion_on := true
	if GameManager != null:
		companion_on = GameManager.desktop_companion_mode
	apply_window_mode(companion_on)
	target_screen_idx = DisplayServer.window_get_current_screen()
	home_screen_idx = target_screen_idx
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

## Language, interface size, opacity, strip size, dock side and frame rate survive a restart (never touched by the self-test)
func save_ui_settings() -> void:
	if not _settings_enabled:
		return
	var cf := ConfigFile.new()
	cf.set_value("ui", "lang", EconomyConfig.current_lang)
	cf.set_value("ui", "text_scale", text_scale)
	cf.set_value("ui", "opacity", window_opacity)
	cf.set_value("ui", "scale_idx", scale_idx)
	cf.set_value("ui", "dock", int(current_dock))
	cf.set_value("ui", "fps", target_fps)
	cf.set_value("ui", "sound", not SoundManager.is_muted)
	cf.set_value("ui", "noise", SoundManager.white_noise_enabled)
	cf.save(ui_settings_path)

func _load_ui_settings() -> void:
	if not _settings_enabled:
		return
	var cf := ConfigFile.new()
	if cf.load(ui_settings_path) != OK:
		return
	EconomyConfig.set_language(String(cf.get_value("ui", "lang", "zh_CN")))
	text_scale = clampf(float(cf.get_value("ui", "text_scale", 1.0)), 1.0, 1.3)
	window_opacity = clampf(float(cf.get_value("ui", "opacity", 1.0)), 0.6, 1.0)
	scale_idx = clampi(int(cf.get_value("ui", "scale_idx", 1)), 0, SCALE_PRESETS.size() - 1)
	current_dock = DockPosition.TOP_STRIP if int(cf.get_value("ui", "dock", 0)) == 1 else DockPosition.BOTTOM_STRIP
	set_eco_fps(int(cf.get_value("ui", "fps", 30)))
	if cf.has_section_key("ui", "sound"):
		_saved_sound = [bool(cf.get_value("ui", "sound")), bool(cf.get_value("ui", "noise", true))]

## The sound switches as they were left (called once the world has set the window mode, which mutes by default)
func apply_saved_sound() -> void:
	if _saved_sound.size() == 2:
		SoundManager.set_white_noise_enabled(_saved_sound[1])
		SoundManager.set_muted(not _saved_sound[0])

func set_text_scale(v: float) -> void:
	text_scale = clampf(v, 1.0, 1.3)

func set_scale_idx(idx: int) -> void:
	scale_idx = clampi(idx, 0, SCALE_PRESETS.size() - 1)
	snap_window_to_desktop(current_dock)

func toggle_boss_stealth() -> bool:
	boss_stealth_active = not boss_stealth_active
	if _world_ref != null and "world_root" in _world_ref and _world_ref.world_root != null:
		_world_ref.world_root.modulate.a = 0.0 if boss_stealth_active else window_opacity
	if _hud_ref != null and _hud_ref.has_method("set_boss_stealth"):
		_hud_ref.call("set_boss_stealth", boss_stealth_active)
	if boss_stealth_active:
		_muted_before_stealth = SoundManager.is_muted
		SoundManager.set_muted(true)
	else:
		SoundManager.set_muted(_muted_before_stealth)
	if _settings_enabled:
		Engine.max_fps = STEALTH_FPS if boss_stealth_active else target_fps
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

func get_window_opacity() -> float:
	return window_opacity

## Opacity of what the world node paints itself (ground, bridges, pond), which the modulate of its children does not reach
func get_ground_alpha() -> float:
	return 0.0 if boss_stealth_active else window_opacity

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

func _process(delta: float) -> void:
	if not is_dragging:
		_screen_check_left -= delta
		if _screen_check_left <= 0.0:
			_screen_check_left = SCREEN_CHECK_SEC
			_check_screens()
		return
	if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and not Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		stop_window_drag()
		return
	var cur_mouse := DisplayServer.mouse_get_position()
	var moved := cur_mouse - _drag_start_mouse
	if not _drag_moved and absi(moved.x) < DRAG_START_PX and absi(moved.y) < DRAG_START_PX:
		return
	_drag_moved = true
	for i in range(DisplayServer.get_screen_count()):
		if Rect2i(DisplayServer.screen_get_position(i), DisplayServer.screen_get_size(i)).has_point(cur_mouse):
			target_screen_idx = i
			home_screen_idx = i
	custom_pos_active = true
	custom_pos = _drag_start_win_pos + moved
	if DisplayServer.window_get_position() != custom_pos:
		DisplayServer.window_set_position(custom_pos)

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
	_drag_moved = false
	Engine.max_fps = maxi(Engine.max_fps, DRAG_FPS)
	_drag_start_mouse = DisplayServer.mouse_get_position()
	_drag_start_win_pos = DisplayServer.window_get_position()
	DisplayServer.window_set_mouse_passthrough(PackedVector2Array())

func stop_window_drag() -> void:
	if not is_dragging:
		return
	is_dragging = false
	Engine.max_fps = STEALTH_FPS if boss_stealth_active and _settings_enabled else target_fps
	if not _drag_moved:
		_refresh_passthrough()
		return
	_screens_seen = []
	snap_window_to_desktop(current_dock)
	custom_pos = _clamp_window_to_desktop_bounds(custom_pos)

## A screen was unplugged, resized or rescaled, or the taskbar moved: the strip is laid out again inside what is there
func _check_screens() -> void:
	var count := maxi(1, DisplayServer.get_screen_count())
	target_screen_idx = home_screen_idx if home_screen_idx < count else 0
	var seen := [count, DisplayServer.screen_get_usable_rect(clampi(target_screen_idx, 0, count - 1))]
	if _screens_seen.is_empty():
		_screens_seen = seen
	elif _screens_seen != seen:
		_screens_seen = seen
		snap_window_to_desktop(current_dock)

func toggle_dock_position() -> DockPosition:
	current_dock = DockPosition.TOP_STRIP if current_dock == DockPosition.BOTTOM_STRIP else DockPosition.BOTTOM_STRIP
	custom_pos_active = false
	snap_window_to_desktop(current_dock)
	return current_dock

func snap_window_to_desktop(dock: DockPosition) -> void:
	var count := maxi(1, DisplayServer.get_screen_count())
	var screen_idx := clampi(target_screen_idx, 0, count - 1)
	var usable_rect := DisplayServer.screen_get_usable_rect(screen_idx)
	if usable_rect.size.x <= 0 or usable_rect.size.y <= 0:
		return
	var base_scale := float(usable_rect.size.x) / VIEWPORT_W
	var user_mult: float = SCALE_PRESETS[clampi(scale_idx, 0, SCALE_PRESETS.size() - 1)]
	scale_factor = minf(base_scale * 1.25, base_scale * user_mult)
	var win_w := int(roundf(VIEWPORT_W * scale_factor))
	var win_h := int(roundf(VIEWPORT_H * scale_factor))
	var pos_x := usable_rect.position.x + int((usable_rect.size.x - win_w) * 0.5)
	var pos_y := usable_rect.position.y + usable_rect.size.y - win_h
	if dock == DockPosition.TOP_STRIP:
		pos_y = usable_rect.position.y
	DisplayServer.window_set_size(Vector2i(win_w, win_h))
	if custom_pos_active and home_screen_idx < count:
		var put := _clamp_window_to_desktop_bounds(custom_pos)
		pos_x = put.x
		pos_y = put.y
	DisplayServer.window_set_position(Vector2i(pos_x, pos_y))
	_refresh_passthrough()

func update_passthrough_polygon(logical_island_rect: Rect2, logical_hud_rect: Rect2, logical_drawer_rect: Rect2 = Rect2(), logical_balloon_rect: Rect2 = Rect2(), logical_airship_rect: Rect2 = Rect2(), logical_greenhouse_rect: Rect2 = Rect2(), logical_hotspring_rect: Rect2 = Rect2(), logical_windmill_rect: Rect2 = Rect2(), logical_tea_pavilion_rect: Rect2 = Rect2(), logical_moon_boat_rect: Rect2 = Rect2(), logical_extra_sky_rects: Array = []) -> void:
	if _last_island_rect == logical_island_rect and _last_hud_rect == logical_hud_rect and _last_drawer_rect == logical_drawer_rect and _last_balloon_rect == logical_balloon_rect and _last_airship_rect == logical_airship_rect and _last_greenhouse_rect == logical_greenhouse_rect and _last_hotspring_rect == logical_hotspring_rect and _last_windmill_rect == logical_windmill_rect and _last_tea_pavilion_rect == logical_tea_pavilion_rect and _last_moon_boat_rect == logical_moon_boat_rect and _last_extra_sky_rects == logical_extra_sky_rects and not _last_passthrough_polygon.is_empty():
		return
	_last_island_rect = logical_island_rect
	_last_hud_rect = logical_hud_rect
	_last_drawer_rect = logical_drawer_rect
	_last_balloon_rect = logical_balloon_rect
	_last_airship_rect = logical_airship_rect
	_last_greenhouse_rect = logical_greenhouse_rect
	_last_hotspring_rect = logical_hotspring_rect
	_last_windmill_rect = logical_windmill_rect
	_last_tea_pavilion_rect = logical_tea_pavilion_rect
	_last_moon_boat_rect = logical_moon_boat_rect
	_last_extra_sky_rects = logical_extra_sky_rects.duplicate()
	if not is_dragging:
		_refresh_passthrough()

func is_logical_point_interactive(logical_pt: Vector2) -> bool:
	if _last_passthrough_polygon.is_empty():
		return true
	var s := maxf(0.1, scale_factor)
	return Geometry2D.is_point_in_polygon(logical_pt * s, _last_passthrough_polygon)

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
		var cr: Rect2 = _hud_ref.call("get_hud_Hit_rect") if _hud_ref != null else Rect2(760.0, 232.0, 400.0, 44.0)
		var stealth_poly := PackedVector2Array([cr.position * s, Vector2(cr.end.x, cr.position.y) * s, cr.end * s, Vector2(cr.position.x, cr.end.y) * s])
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

	var raw_notches: Array[Dictionary] = []
	var sky_rects: Array = [_last_balloon_rect, _last_airship_rect, _last_greenhouse_rect, _last_hotspring_rect, _last_windmill_rect, _last_tea_pavilion_rect, _last_moon_boat_rect]
	for extra_r in _last_extra_sky_rects:
		if extra_r is Rect2:
			sky_rects.append(extra_r)
	for sky_r in sky_rects:
		if sky_r.size.x > 0.0 and sky_r.size.y > 0.0:
			var nl := clampf(sky_r.position.x, 0.0, VIEWPORT_W)
			var nr := clampf(sky_r.end.x, nl + 4.0, VIEWPORT_W)
			var ntop := clampf(sky_r.position.y, 0.0, top_y)
			isl_l = minf(isl_l, nl)
			isl_r = maxf(isl_r, nr)
			if ntop < top_y - 0.5:
				raw_notches.append({"l": nl, "r": nr, "top": ntop})

	raw_notches.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return float(a["l"]) < float(b["l"]))
	var merged_notches: Array[Dictionary] = []
	for n in raw_notches:
		if merged_notches.is_empty():
			merged_notches.append(n.duplicate())
		else:
			var prev: Dictionary = merged_notches[merged_notches.size() - 1]
			if float(n["l"]) <= float(prev["r"]) + 1.0:
				prev["r"] = maxf(float(prev["r"]), float(n["r"]))
				prev["top"] = minf(float(prev["top"]), float(n["top"]))
			else:
				merged_notches.append(n.duplicate())

	var ui_l := clampf(ui_rect.position.x, isl_l, VIEWPORT_W)
	var ui_r := clampf(ui_rect.end.x, 0.0, isl_r)
	var split_y := clampf(ui_rect.position.y, top_y + 12.0, bot_y - 12.0)

	# Orthogonal stepped polygon tightly wrapping the 3 islands + active sky balloon / harbor airship notches + bottom HUD/drawer panel
	var poly := PackedVector2Array()
	if not merged_notches.is_empty():
		var cursor_x := isl_l
		for mn in merged_notches:
			var ml := float(mn["l"])
			var mr := float(mn["r"])
			var mtop := float(mn["top"])
			if ml > cursor_x + 0.5:
				poly.append(Vector2(cursor_x * s, top_y * s))
				poly.append(Vector2(ml * s, top_y * s))
			poly.append(Vector2(ml * s, mtop * s))
			poly.append(Vector2(mr * s, mtop * s))
			cursor_x = mr
		if cursor_x < isl_r - 0.5:
			poly.append(Vector2(cursor_x * s, top_y * s))
			poly.append(Vector2(isl_r * s, top_y * s))
	else:
		poly.append(Vector2(isl_l * s, top_y * s))
		poly.append(Vector2(isl_r * s, top_y * s))

	poly.append(Vector2(isl_r * s, split_y * s))
	poly.append(Vector2(maxf(isl_r, ui_r) * s, split_y * s))
	poly.append(Vector2(maxf(isl_r, ui_r) * s, bot_y * s))
	poly.append(Vector2(minf(isl_l, ui_l) * s, bot_y * s))
	poly.append(Vector2(minf(isl_l, ui_l) * s, split_y * s))
	poly.append(Vector2(isl_l * s, split_y * s))
	_last_passthrough_polygon = poly
	DisplayServer.window_set_mouse_passthrough(poly)
