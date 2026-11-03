extends Node
class_name SoundManager
## Plays crisp 16-bit WAV sound effects and automatically switches the background ambient
## nature loop according to the current Day/Night & Weather phase:
## - Phase 0 (晴天): 清脆鸟鸣与溪流 (ambient_day.wav)
## - Phase 1 (夕阳): 黄昏微风与木风铃 (ambient_dusk.wav)
## - Phase 2 (萤火夜): 静谧夏夜蛙虫鸣 (ambient_night.wav)
## - Phase 3 (彩虹流星/魔力阵雨): 轻柔细雨与空灵风铃 (ambient_rain.wav)

var is_muted: bool = false
var current_ambient_phase: int = -1

var _sfx_streams: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _ambient_player: AudioStreamPlayer

const AMBIENT_KEYS: Array[String] = [
	"ambient_day",
	"ambient_dusk",
	"ambient_night",
	"ambient_rain"
]

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
		var path: String = "res://assets/sfx/" + sname + ".wav"
		if ResourceLoader.exists(path):
			_sfx_streams[sname] = load(path)

	for i in range(6):
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_players.append(p)

	_ambient_player = AudioStreamPlayer.new()
	_ambient_player.volume_db = -13.0
	add_child(_ambient_player)
	set_ambient_phase(0)

func set_ambient_phase(phase_idx: int) -> void:
	var clamped := clampi(phase_idx, 0, AMBIENT_KEYS.size() - 1)
	if clamped == current_ambient_phase and _ambient_player != null and _ambient_player.playing:
		return
	current_ambient_phase = clamped
	var key: String = AMBIENT_KEYS[clamped]
	if not _sfx_streams.has(key):
		key = "ambient_stream"
	if _ambient_player != null and _sfx_streams.has(key):
		_ambient_player.stream = _sfx_streams[key]
		if not is_muted:
			_ambient_player.play()

func _process(_delta: float) -> void:
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

func play_sfx(sfx_name: String, pitch_variance: float = 0.06) -> void:
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
