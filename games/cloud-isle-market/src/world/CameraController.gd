extends Camera2D
class_name CameraController
## Horizontal Panoramic Scroll & Zoom Camera (`src/world/CameraController.gd`) — PRD v2.0 Section 3.1
## Supports:
## - Right-Mouse-Button drag panning (in Standard Window Mode)
## - A / D or Left / Right smooth horizontal panning
## - Mouse Wheel zoom between 0.6x ~ 2.0x
## - Limits: limit_left = -1600, limit_right = 2800

const MIN_ZOOM := 0.6
const MAX_ZOOM := 2.0
const PAN_SPEED := 420.0

var target_x: float = 960.0
var target_zoom: float = 1.0
var is_rmb_panning: bool = false
var rmb_last_mouse: Vector2 = Vector2.ZERO

func _ready() -> void:
	limit_left = -1600
	limit_right = 2800
	position = Vector2(960.0, 150.0)
	target_x = 960.0
	target_zoom = 1.0
	enabled = true

func _unhandled_input(event: InputEvent) -> void:
	if GameManager.desktop_companion_mode:
		# In Desktop Dock Mode, keep camera locked cleanly to the 1920x300 dock strip
		return

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			is_rmb_panning = event.pressed
			rmb_last_mouse = get_viewport().get_mouse_position()
		elif event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP:
			target_zoom = clampf(target_zoom + 0.1, MIN_ZOOM, MAX_ZOOM)
		elif event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			target_zoom = clampf(target_zoom - 0.1, MIN_ZOOM, MAX_ZOOM)
	elif event is InputEventMouseMotion and is_rmb_panning:
		var cur_m := get_viewport().get_mouse_position()
		var dx := (cur_m.x - rmb_last_mouse.x) / maxf(0.5, zoom.x)
		target_x = clampf(target_x - dx, float(limit_left) + 400.0, float(limit_right) - 400.0)
		rmb_last_mouse = cur_m

func _process(delta: float) -> void:
	if GameManager.desktop_companion_mode:
		position = position.lerp(Vector2(960.0, 150.0), delta * 10.0)
		zoom = zoom.lerp(Vector2.ONE, delta * 10.0)
		return

	var dir := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		dir -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		dir += 1.0
	if absf(dir) > 0.01:
		target_x = clampf(target_x + dir * PAN_SPEED * delta, float(limit_left) + 400.0, float(limit_right) - 400.0)

	position.x = lerpf(position.x, target_x, delta * 8.0)
	zoom = zoom.lerp(Vector2(target_zoom, target_zoom), delta * 8.0)
