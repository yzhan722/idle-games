extends Node
## WAV Audio & Ambient Loop Autoload (`src/autoload/SoundManager.gd`) — PRD Patch v2.2 Section 6
## Directly loads and plays `res://assets/sfx/*.wav`:
## - Ambient loops: `ambient_day.wav`, `ambient_dusk.wav`, `ambient_night.wav`, `ambient_stream.wav`
## - Harvest crop: `harvest_pop.wav`
## - Customer checkout: `meso_coin.wav`
## - Upgrade / build: `wood_build.wav`
## - UI interactions: `ui_click.wav`, `ui_hover.wav`
## - Auto-mutes when entering Desktop Companion Mode (`摸鱼模式`), with top-right one-click mute toggle (`🔊/🔇`).

const AMBIENT_KEYS: Array[String] = [
	"ambient_day",
	"ambient_dusk",
	"ambient_night",
	"ambient_stream"
]

var is_muted: bool = true # Default auto-muted in Desktop Companion Mode
var current_ambient_idx: int = 0
var ambient_cycle_timer: float = 0.0

var _sfx_streams: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _ambient_player: AudioStreamPlayer

func _ready() -> void:
	var sfx_names: Array[String] = [
		"harvest_pop",
		"meso_coin",
		"water_splash",
		"wood_build",
		"ui_click",
		"ui_hover",
		"ambient_stream",
		"ambient_day",
		"ambient_dusk",
		"ambient_night",
		"ambient_rain"
	]
	for sname in sfx_names:
		var path := "res://assets/sfx/" + sname + ".wav"
		if ResourceLoader.exists(path):
			_sfx_streams[sname] = load(path)

	for _i in range(6):
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_players.append(p)

	_ambient_player = AudioStreamPlayer.new()
	_ambient_player.volume_db = -14.0
	add_child(_ambient_player)
	_apply_ambient_stream(0)

	if EventBus != null:
		EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)

func _on_toggle_desktop_mode(enabled: bool) -> void:
	if enabled:
		set_muted(true)

func _apply_ambient_stream(idx: int) -> void:
	current_ambient_idx = posmod(idx, AMBIENT_KEYS.size())
	var key := AMBIENT_KEYS[current_ambient_idx]
	if _ambient_player != null and _sfx_streams.has(key):
		_ambient_player.stream = _sfx_streams[key]
		if not is_muted:
			_ambient_player.play()

func _process(delta: float) -> void:
	ambient_cycle_timer += delta
	if ambient_cycle_timer >= 90.0:
		ambient_cycle_timer = 0.0
		_apply_ambient_stream(current_ambient_idx + 1)

	if not is_muted and _ambient_player != null and _ambient_player.stream != null:
		if not _ambient_player.playing:
			_ambient_player.play()

func set_muted(mute: bool) -> void:
	is_muted = mute
	if _ambient_player != null:
		if is_muted:
			_ambient_player.stop()
		else:
			_ambient_player.play()

func toggle_mute() -> bool:
	set_muted(not is_muted)
	if not is_muted:
		play_sfx("ui_click")
	return is_muted

func play_sfx(sfx_name: String, pitch_variance: float = 0.05) -> void:
	if is_muted or not _sfx_streams.has(sfx_name):
		return
	for p in _players:
		if not p.playing:
			p.stream = _sfx_streams[sfx_name]
			p.pitch_scale = randf_range(1.0 - pitch_variance, 1.0 + pitch_variance)
			p.play()
			return
	if _players.size() > 0:
		_players[0].stream = _sfx_streams[sfx_name]
		_players[0].pitch_scale = 1.0
		_players[0].play()

func play_coin_sfx() -> void:
	play_sfx("meso_coin", 0.05)

func play_upgrade_sfx() -> void:
	play_sfx("wood_build", 0.05)

func play_milestone_sfx() -> void:
	play_sfx("wood_build", 0.02)

func play_pop_sfx() -> void:
	play_sfx("harvest_pop", 0.06)

func play_click_sfx() -> void:
	play_sfx("ui_click", 0.03)

func play_hover_sfx() -> void:
	play_sfx("ui_hover", 0.03)
