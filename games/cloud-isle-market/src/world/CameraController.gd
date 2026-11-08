extends Camera2D
class_name CameraController
## Unified Cursor-Anchored Smooth Wheel Zoom & Inertia Panning Controller (`src/world/CameraController.gd`)
## Works seamlessly in BOTH Desktop Companion Mode and Windowed Mode by driving `MainWorld.world_root` transform
## while keeping `Camera2D` aligned with the `1920x300` viewport coordinate space:
## - Logarithmic Mouse Wheel zoom (`0.50x ~ 2.20x`, `ZOOM_STEP_RATIO = 1.12`) with magnetic `1.0x` native pixel snap.
## - True Zoom-to-Cursor (`以鼠标指针为中心缩放`) horizontal pivot + smart horizon vertical anchoring (`GROUND_Y = 124.0` never clips or sinks behind HUD).
## - Smooth exponential damping (`ZOOM_LERP_SPEED = 14.0`, `PAN_LERP_SPEED = 14.0`).
## - Right-Mouse-Button (`MOUSE_BUTTON_RIGHT`) drag panning with release inertia, `A/D` & `Left/Right` keyboard panning,
##   `Middle-Click` / `Space` / `Home` reset to `1.0x` panoramic view, and `1/2/3` island focus shortcuts.

const MIN_ZOOM := 0.50
const MAX_ZOOM := 2.20
const ZOOM_STEP_RATIO := 1.12
const ZOOM_LERP_SPEED := 14.0

const PAN_MAX_SPEED := 640.0
const PAN_ACCEL := 2200.0
const PAN_FRICTION := 1800.0
const PAN_LERP_SPEED := 14.0

const VIEWPORT_W := 1920.0
const VIEWPORT_H := 300.0
const WORLD_CENTER_X := 960.0
const WORLD_CENTER_Y := 150.0
const BASE_ROOT_Y := 36.0
const HORIZON_LOCAL_Y := 116.0
const ZOOM_OUT_ANCHOR_Y := 148.0

const ISLAND_FOCUS_X: Dictionary = {
	1: 860.0,
	2: 280.0,
	3: 1610.0
}

var world_ref: Node2D = null

var current_zoom: float = 1.0
var target_zoom: float = 1.0
var current_root_pos: Vector2 = Vector2(0.0, BASE_ROOT_Y)
var target_root_pos: Vector2 = Vector2(0.0, BASE_ROOT_Y)

var target_x: float = WORLD_CENTER_X
var target_y: float = WORLD_CENTER_Y
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
	zoom = Vector2.ONE
	enabled = true

	if EventBus != null:
		EventBus.island_unlocked.connect(_on_island_unlocked)

func setup_world(p_world: Node2D) -> void:
	world_ref = p_world
	reset_camera_view(true)

func _on_island_unlocked(island_idx: int) -> void:
	focus_on_island(island_idx)

func focus_on_island(island_idx: int, desired_zoom: float = -1.0) -> void:
	var next_z := target_zoom
	if desired_zoom > 0.0:
		next_z = clampf(desired_zoom, MIN_ZOOM, MAX_ZOOM)
	target_zoom = next_z
	if ISLAND_FOCUS_X.has(island_idx):
		var focus_local_x := float(ISLAND_FOCUS_X[island_idx])
		var desired_root_x := WORLD_CENTER_X - focus_local_x * target_zoom
		target_root_pos.x = _clamp_root_x(desired_root_x, target_zoom)
		target_root_pos.y = _compute_ideal_root_y(target_zoom, 0.0)
		velocity_x = 0.0
		_sync_legacy_targets()

func reset_camera_view(immediate: bool = false) -> void:
	target_zoom = 1.0
	target_root_pos = Vector2(0.0, BASE_ROOT_Y)
	velocity_x = 0.0
	rmb_drag_velocity = 0.0
	is_rmb_panning = false
	if immediate:
		current_zoom = 1.0
		current_root_pos = target_root_pos
		_apply_to_world()
	_sync_legacy_targets()

func _sync_legacy_targets() -> void:
	target_x = (WORLD_CENTER_X - target_root_pos.x) / maxf(MIN_ZOOM, target_zoom)
	target_y = WORLD_CENTER_Y

func _clamp_root_x(raw_root_x: float, z: float) -> float:
	var center_root_x := WORLD_CENTER_X * (1.0 - z)
	var min_rx := minf(center_root_x - 240.0, WORLD_CENTER_X - 1760.0 * z)
	var max_rx := maxf(center_root_x + 240.0, WORLD_CENTER_X - 160.0 * z)
	return clampf(raw_root_x, min_rx, max_rx)

func _compute_ideal_root_y(z: float, cursor_bias_y: float = 0.0) -> float:
	if z < 1.0:
		# When zooming out (< 1.0x), keep the islands anchored cleanly above the bottom HUD strip
		return BASE_ROOT_Y + ZOOM_OUT_ANCHOR_Y * (1.0 - z)
	# When zooming in (>= 1.0x), anchor on the character/building horizon (`local_y = 116`) with subtle vertical cursor bias
	var max_bias := 48.0 * (z - 1.0)
	var clamped_bias := clampf(cursor_bias_y, -max_bias, max_bias)
	return BASE_ROOT_Y + HORIZON_LOCAL_Y * (1.0 - z) + clamped_bias

func _clamp_root_y(raw_root_y: float, z: float) -> float:
	var base_y := _compute_ideal_root_y(z, 0.0)
	if z <= 1.02:
		return base_y
	var max_vy := 48.0 * (z - 1.0)
	return clampf(raw_root_y, base_y - max_vy, base_y + max_vy)

func apply_wheel_zoom(wheel_dir: float, factor: float, mouse_screen_pos: Vector2) -> void:
	if WindowController != null and WindowController.boss_stealth_active:
		return
	var eff_factor := clampf(factor if factor > 0.01 else 1.0, 0.4, 2.5)
	var old_z := target_zoom
	var raw_new_z := clampf(old_z * pow(ZOOM_STEP_RATIO, wheel_dir * eff_factor), MIN_ZOOM, MAX_ZOOM)

	# Magnetic snap to 1.00x native pixel scale when crossing or landing near 1.0x
	if absf(old_z - 1.0) > 0.005:
		if (old_z < 1.0 and raw_new_z >= 0.955) or (old_z > 1.0 and raw_new_z <= 1.045) or absf(raw_new_z - 1.0) <= 0.035:
			raw_new_z = 1.0

	if absf(raw_new_z - old_z) < 0.001:
		return

	# True 2D Zoom-to-Cursor: keep the local world coordinate under `mouse_screen_pos` pinned at the cursor
	var pivot_screen_x := clampf(mouse_screen_pos.x, 80.0, VIEWPORT_W - 80.0)
	var local_under_cursor_x := clampf((pivot_screen_x - target_root_pos.x) / maxf(MIN_ZOOM, old_z), 60.0, 1860.0)
	var new_root_x := pivot_screen_x - local_under_cursor_x * raw_new_z

	# When snapping back to 1.0x or zooming out toward 1.0x, gently blend back toward panoramic center if near center
	if absf(raw_new_z - 1.0) < 0.005 and absf(new_root_x) < 140.0:
		new_root_x = 0.0

	var pivot_screen_y := clampf(mouse_screen_pos.y, 32.0, 232.0)
	var local_under_cursor_y := clampf((pivot_screen_y - target_root_pos.y) / maxf(MIN_ZOOM, old_z), 24.0, 196.0)
	var new_root_y := pivot_screen_y - local_under_cursor_y * raw_new_z

	target_zoom = raw_new_z
	target_root_pos.x = _clamp_root_x(new_root_x, target_zoom)
	target_root_pos.y = _clamp_root_y(new_root_y, target_zoom)
	velocity_x = 0.0
	_sync_legacy_targets()

func _apply_zoom_step(delta_zoom: float, mouse_screen_pos: Vector2) -> void:
	var dir := 1.0 if delta_zoom >= 0.0 else -1.0
	apply_wheel_zoom(dir, absf(delta_zoom) / 0.10, mouse_screen_pos)

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_UP:
			apply_wheel_zoom(1.0, mb.factor, get_viewport().get_mouse_position())
			get_viewport().set_input_as_handled()
			return
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			apply_wheel_zoom(-1.0, mb.factor, get_viewport().get_mouse_position())
			get_viewport().set_input_as_handled()
			return
		elif mb.button_index == MOUSE_BUTTON_RIGHT:
			is_rmb_panning = mb.pressed
			rmb_last_mouse = get_viewport().get_mouse_position()
			if mb.pressed:
				velocity_x = 0.0
				rmb_drag_velocity = 0.0
			else:
				velocity_x = clampf(rmb_drag_velocity, -PAN_MAX_SPEED * 1.5, PAN_MAX_SPEED * 1.5)
			return
		elif mb.pressed and mb.button_index == MOUSE_BUTTON_MIDDLE:
			reset_camera_view(false)
			get_viewport().set_input_as_handled()
			return

	elif event is InputEventMouseMotion and is_rmb_panning:
		var cur_m := get_viewport().get_mouse_position()
		var dx := cur_m.x - rmb_last_mouse.x
		var dy := cur_m.y - rmb_last_mouse.y
		target_root_pos.x = _clamp_root_x(target_root_pos.x + dx, target_zoom)
		target_root_pos.y = _clamp_root_y(target_root_pos.y + dy * 0.85, target_zoom)
		rmb_drag_velocity = dx * 26.0
		rmb_last_mouse = cur_m
		_sync_legacy_targets()

	elif event is InputEventMagnifyGesture:
		var mg := event as InputEventMagnifyGesture
		var dir := 1.0 if mg.factor >= 1.0 else -1.0
		apply_wheel_zoom(dir, absf(mg.factor - 1.0) * 6.0, get_viewport().get_mouse_position())

	elif event is InputEventKey and event.pressed and not event.echo:
		var ke := event as InputEventKey
		if ke.keycode == KEY_HOME or ke.keycode == KEY_SPACE:
			reset_camera_view(false)
		elif ke.keycode == KEY_EQUAL or ke.keycode == KEY_KP_ADD:
			apply_wheel_zoom(1.0, 1.0, get_viewport().get_mouse_position())
		elif ke.keycode == KEY_MINUS or ke.keycode == KEY_KP_SUBTRACT:
			apply_wheel_zoom(-1.0, 1.0, get_viewport().get_mouse_position())
		elif ke.keycode == KEY_1:
			focus_on_island(1)
		elif ke.keycode == KEY_2:
			focus_on_island(2)
		elif ke.keycode == KEY_3:
			focus_on_island(3)

func _process(delta: float) -> void:
	var input_dir_x := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		input_dir_x += 1.0 # Pressing Left moves world_root right so view pans left
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		input_dir_x -= 1.0 # Pressing Right moves world_root left so view pans right

	var input_dir_y := 0.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		input_dir_y += 1.0 # Pressing Up moves world_root down so view pans up
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		input_dir_y -= 1.0 # Pressing Down moves world_root up so view pans down

	if not is_rmb_panning:
		if absf(input_dir_x) > 0.01:
			velocity_x = move_toward(velocity_x, input_dir_x * PAN_MAX_SPEED * current_zoom, PAN_ACCEL * delta)
		else:
			velocity_x = move_toward(velocity_x, 0.0, PAN_FRICTION * delta)

		if absf(velocity_x) > 0.5:
			target_root_pos.x = _clamp_root_x(target_root_pos.x + velocity_x * delta, target_zoom)
			_sync_legacy_targets()

		if absf(input_dir_y) > 0.01 and target_zoom > 1.02:
			target_root_pos.y = _clamp_root_y(target_root_pos.y + input_dir_y * (PAN_MAX_SPEED * 0.45) * delta, target_zoom)

	var z_weight := 1.0 - exp(-ZOOM_LERP_SPEED * delta)
	var p_weight := 1.0 - exp(-PAN_LERP_SPEED * delta)
	current_zoom = lerpf(current_zoom, target_zoom, z_weight)
	if absf(current_zoom - target_zoom) < 0.001:
		current_zoom = target_zoom
	current_root_pos = current_root_pos.lerp(target_root_pos, p_weight)
	if current_root_pos.distance_to(target_root_pos) < 0.15:
		current_root_pos = target_root_pos

	position = Vector2(WORLD_CENTER_X, WORLD_CENTER_Y)
	zoom = Vector2.ONE
	_apply_to_world()

func _apply_to_world() -> void:
	if world_ref == null:
		world_ref = get_parent() as Node2D
	if world_ref != null and "world_root" in world_ref and world_ref.world_root != null:
		var prev_z := float(world_ref.companion_zoom)
		var prev_pos: Vector2 = world_ref.world_root.position
		world_ref.companion_zoom = current_zoom
		world_ref.world_root.scale = Vector2(current_zoom, current_zoom)
		world_ref.world_root.position = current_root_pos
		if absf(prev_z - current_zoom) > 0.0005 or prev_pos.distance_to(current_root_pos) > 0.1:
			world_ref.queue_redraw()
