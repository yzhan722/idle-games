extends Node2D
## Root scene controller connecting WindowController, GameManager, SoundManager, IslandWorld, and PixelHUD.

@onready var window_controller: WindowController = $WindowController
@onready var game_manager: LegacyGameManager = $GameManager
@onready var sound_manager: LegacySoundManager = $SoundManager
@onready var island_world: IslandWorld = $IslandWorld
@onready var pixel_hud: PixelHUD = $CanvasLayer/PixelHUD

func _ready() -> void:
	print("=== Maple Isle Idle Phase 2 Main._ready() started ===")
	sound_manager.set_muted(game_manager.is_muted)
	window_controller.set_scale_index(game_manager.scale_idx)

	island_world.game_manager = game_manager
	island_world.window_controller = window_controller
	island_world.sound_manager = sound_manager

	pixel_hud.game_manager = game_manager
	pixel_hud.island_world = island_world
	pixel_hud.window_controller = window_controller
	pixel_hud.sound_manager = sound_manager

	game_manager.state_changed.connect(_on_state_changed)
	game_manager.workshop_changed.connect(_on_workshop_changed)
	pixel_hud.drawer_toggled.connect(_on_state_changed)

	island_world.refresh_world_layout()
	_on_state_changed()
	print("=== Maple Isle Idle Window Rect: ", DisplayServer.window_get_position(), " size: ", DisplayServer.window_get_size(), " ===")

func _on_workshop_changed() -> void:
	if island_world != null:
		island_world.refresh_world_layout()
	_on_state_changed()

func _on_state_changed() -> void:
	pixel_hud.queue_redraw()
	if window_controller != null and island_world != null and pixel_hud != null:
		window_controller.update_passthrough_polygon(
			island_world.get_active_island_bounds(),
			PixelHUD.HUD_RECT,
			pixel_hud.get_active_drawer_rect()
		)
