extends Camera2D
class_name CameraController
## Panoramic Horizontal Scroll, Inertia Drag & Dynamic Zoom Camera (`src/world/CameraController.gd`)
## Strictly implements PRD v2.0 Section 3.1 & PRD v2.2:
## - Right-Mouse-Button (`MOUSE_BUTTON_RIGHT`) drag panning with smooth inertia & damping.
## - `A / D` and `Left / Right` arrow key continuous acceleration/deceleration horizontal panning.
## - Mouse Wheel dynamic zoom across `0.4x ~ 2.0x` (`MIN_ZOOM = 0.4`, `MAX_ZOOM = 2.0`) with cursor-pivot compensation.
## - Strict world camera bounds: `limit_left = -1600`, `limit_right = 2800`.
## - Quick island focus helpers (`focus_on_island(1..3)`) and automatic dock lock in Desktop Companion Mode.

const MIN_ZOOM := 0.4
const MAX_ZOOM := 2.0
const ZOOM_STEP := 0.10
const ZOOM_LERP_SPEED := 9.0

const PAN_MAX_SPEED := 520.0
const PAN_ACCEL := 1800.0
const PAN_FRICTION := 1400.0
const PAN_LERP_SPEED := 10.0

const WORLD_CENTER_X := 960.0
const WORLD_CENTER_Y := 150.0
const SAFE_MARGIN_X := 320.0

const ISLAND_FOCUS_X: Dictionary = {
	1: 860.0,
	2: 280.0,
	3: 1610.0
}

var target_x: float = WORLD_CENTER_X
var target_y: float = WORLD_CENTER_Y
var target_zoom: float = 1.0
var velocity_x: float = 0.0

var is_rmb_panning: bool = false
var rmb_last_mouse: Vector2 = Vector2.ZERO
var rmb_drag_velocity: float = 0.0

func _ready() -> void:
	limit_left = -1600
	limit_right = 2800
	limit_top = -400
	limit_bottom = 700
	position = Vector2(WORLD_CENTER_X, WORLD_CENTER_Y)
	target_x = WORLD_CENTER_X
	target_y = WORLD_CENTER_Y
	target_zoom = 1.0
	zoom = Vector2.ONE
	enabled = true

	if EventBus != null:
		EventBus.island_unlocked.connect(_on_island_unlocked)

func _on_island_unlocked(island_idx: int) -> void:
	if not GameManager.desktop_companion_mode:
		focus_on_island(island_idx)

func focus_on_island(island_idx: int, desired_zoom: float = -1.0) -> void:
	if ISLAND_FOCUS_X.has(island_idx):
		target_x = _clamp_target_x(float(ISLAND_FOCUS_X[island_idx]))
		velocity_x = 0.0
	if desired_zoom > 0.0:
		target_zoom = clampf(desired_zoom, MIN_ZOOM, MAX_ZOOM)

func reset_camera_view() -> void:
	target_x = WORLD_CENTER_X
	target_y = WORLD_CENTER_Y
	target_zoom = 1.0
	velocity_x = 0.0
	is_rmb_panning = false

func _clamp_target_x(raw_x: float) -> float:
	var min_x := float(limit_left) + SAFE_MARGIN_X
	var max_x := float(limit_right) - SAFE_MARGIN_X
	return clampf(raw_x, min_x, max_x)

func _apply_zoom_step(delta_zoom: float, mouse_screen_pos: Vector2) -> void:
	var old_zoom := target_zoom
	target_zoom = clampf(target_zoom + delta_zoom, MIN_ZOOM, MAX_ZOOM)
	if absf(target_zoom - old_zoom) < 0.001:
		return
	var viewport_center_x := get_viewport_rect().size.x * 0.5
	var screen_offset_x := mouse_screen_pos.x - viewport_center_x
	var world_shift_x := screen_offset_x * (1.0 / maxf(MIN_ZOOM, old_zoom) - 1.0 / maxf(MIN_ZOOM, target_zoom))
	target_x = _clamp_target_x(target_x + world_shift_x * 0.35)

func _unhandled_input(event: InputEvent) -> void:
	if GameManager != null and GameManager.desktop_companion_mode:
		# In Desktop Companion Mode, MainWorld handles companion_zoom while Camera2D stays anchored to the 1920x300 strip
		is_rmb_panning = false
		return

	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_RIGHT:
			is_rmb_panning = mb.pressed
			rmb_last_mouse = get_viewport().get_mouse_position()
			if mb.pressed:
				velocity_x = 0.0
				rmb_drag_velocity = 0.0
			else:
				velocity_x = clampf(rmb_drag_velocity, -PAN_MAX_SPEED * 1.5, PAN_MAX_SPEED * 1.5)
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			_apply_zoom_step(ZOOM_STEP, get_viewport().get_mouse_position())
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_apply_zoom_step(-ZOOM_STEP, get_viewport().get_mouse_position())
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_MIDDLE:
			reset_camera_view()

	elif event is InputEventMouseMotion and is_rmb_panning:
		var cur_m := get_viewport().get_mouse_position()
		var dx := (cur_m.x - rmb_last_mouse.x) / maxf(MIN_ZOOM, zoom.x)
		target_x = _clamp_target_x(target_x - dx)
		rmb_drag_velocity = -dx * 28.0
		rmb_last_mouse = cur_m

	elif event is InputEventKey and event.pressed and not event.echo:
		var ke := event as InputEventKey
		if ke.keycode == KEY_HOME or ke.keycode == KEY_SPACE:
			reset_camera_view()
		elif ke.keycode == KEY_1:
			focus_on_island(1)
		elif ke.keycode == KEY_2:
			focus_on_island(2)
		elif ke.keycode == KEY_3:
			focus_on_island(3)

func _process(delta: float) -> void:
	if GameManager != null and GameManager.desktop_companion_mode:
		position = position.lerp(Vector2(WORLD_CENTER_X, WORLD_CENTER_Y), minf(1.0, delta * 10.0))
		zoom = zoom.lerp(Vector2.ONE, minf(1.0, delta * 10.0))
		return

	var input_dir := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		input_dir -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		input_dir += 1.0

	if not is_rmb_panning:
		if absf(input_dir) > 0.01:
			velocity_x = move_toward(velocity_x, input_dir * PAN_MAX_SPEED, PAN_ACCEL * delta)
		else:
			velocity_x = move_toward(velocity_x, 0.0, PAN_FRICTION * delta)

		if absf(velocity_x) > 0.5:
			target_x = _clamp_target_x(target_x + velocity_x * delta)

	position.x = lerpf(position.x, target_x, minf(1.0, delta * PAN_LERP_SPEED))
	position.y = lerpf(position.y, target_y, minf(1.0, delta * PAN_LERP_SPEED))
	zoom = zoom.lerp(Vector2(target_zoom, target_zoom), minf(1.0, delta * ZOOM_LERP_SPEED))
