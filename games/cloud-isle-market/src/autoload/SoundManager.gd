extends Node
## Full-Featured WAV Audio, Dual-Deck Ambient Crossfader & Polyphonic SFX Pool (`src/autoload/SoundManager.gd`)
## Strictly implements PRD v2.2 Section 6:
## - Loads all 11 genuine `.wav` streams in `res://assets/sfx/`:
##   * 5 Ambient Weather/Time-of-Day Loops: `ambient_day`, `ambient_dusk`, `ambient_night`, `ambient_rain`, `ambient_stream`
##   * 6 Action/UI SFX: `harvest_pop`, `meso_coin`, `water_splash`, `wood_build`, `ui_click`, `ui_hover`
## - Dual-deck `AudioStreamPlayer` ambient crossfade pool (`_ambient_deck_a`, `_ambient_deck_b`) for seamless transitions.
## - 8-channel polyphonic SFX `AudioStreamPlayer` pool with per-key anti-clipping cooldown and pitch jitter.
## - Listens to `EventBus.toggle_desktop_mode` to auto-mute when entering Desktop Companion Mode (`摸鱼模式`).

const AMBIENT_PLAYLIST: Array[String] = [
	"ambient_day",
	"ambient_stream",
	"ambient_dusk",
	"ambient_night",
	"ambient_rain"
]

const AMBIENT_LABELS: Dictionary = {
	"ambient_day": "晨曦鸟鸣 (Day)",
	"ambient_stream": "荷塘溪流 (Stream)",
	"ambient_dusk": "暮色风铃 (Dusk)",
	"ambient_night": "萤火夏夜 (Night)",
	"ambient_rain": "星露微雨 (Rain)"
}

const SFX_FILE_MAP: Dictionary = {
	"harvest_pop": "res://assets/sfx/harvest_pop.wav",
	"meso_coin": "res://assets/sfx/meso_coin.wav",
	"water_splash": "res://assets/sfx/water_splash.wav",
	"wood_build": "res://assets/sfx/wood_build.wav",
	"ui_click": "res://assets/sfx/ui_click.wav",
	"ui_hover": "res://assets/sfx/ui_hover.wav",
	"ambient_day": "res://assets/sfx/ambient_day.wav",
	"ambient_dusk": "res://assets/sfx/ambient_dusk.wav",
	"ambient_night": "res://assets/sfx/ambient_night.wav",
	"ambient_rain": "res://assets/sfx/ambient_rain.wav",
	"ambient_stream": "res://assets/sfx/ambient_stream.wav"
}

const SFX_COOLDOWNS_MS: Dictionary = {
	"harvest_pop": 45,
	"meso_coin": 55,
	"water_splash": 70,
	"wood_build": 80,
	"ui_click": 30,
	"ui_hover": 35
}

const SFX_BASE_VOL_DB: Dictionary = {
	"harvest_pop": -5.5,
	"meso_coin": -4.5,
	"water_splash": -7.0,
	"wood_build": -5.0,
	"ui_click": -6.5,
	"ui_hover": -10.5
}

const SFX_POOL_SIZE := 8
const AMBIENT_BASE_DB := -14.0
const AMBIENT_ROTATE_INTERVAL := 65.0
const CROSSFADE_DURATION := 2.4

var is_muted: bool = true # Default auto-muted in Desktop Companion Mode
var master_sfx_volume_linear: float = 1.0
var master_ambient_volume_linear: float = 1.0

var current_ambient_idx: int = 0
var ambient_cycle_timer: float = 0.0
var _active_deck_is_a: bool = true
var _crossfade_t: float = 1.0
var _is_crossfading: bool = false

var _streams: Dictionary = {}
var _last_play_ticks: Dictionary = {}
var _sfx_players: Array[AudioStreamPlayer] = []
var _rr_cursor: int = 0

var _ambient_deck_a: AudioStreamPlayer
var _ambient_deck_b: AudioStreamPlayer

## v2.6-1: Procedural Natural White Noise Synthesizer (Breeze / Dusk / Cricket / Rain)
const WHITE_NOISE_PROFILES: Array[String] = ["breeze", "dusk_chime", "cricket", "rain"]
const WHITE_NOISE_CN_LABELS: Dictionary = {
	"breeze": "微风",
	"dusk_chime": "晚风",
	"cricket": "虫鸣",
	"rain": "雨声"
}
var white_noise_enabled: bool = true
var current_noise_profile: String = "breeze"
var _noise_player: AudioStreamPlayer
var _noise_playback: AudioStreamGeneratorPlayback
var _noise_lp_state: float = 0.0
var _noise_phase: float = 0.0
var _last_synced_weather: int = -1

func _ready() -> void:
	_load_all_wav_streams()
	_build_audio_pools()

	if GameManager != null:
		is_muted = GameManager.desktop_companion_mode
	_apply_initial_ambient_track(0)

	if EventBus != null:
		EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)
		EventBus.island_unlocked.connect(_on_island_unlocked)

func _load_all_wav_streams() -> void:
	for key in SFX_FILE_MAP.keys():
		var res_path := String(SFX_FILE_MAP[key])
		if ResourceLoader.exists(res_path):
			var st := load(res_path) as AudioStream
			if st != null:
				_streams[key] = st

func _build_audio_pools() -> void:
	for i in range(SFX_POOL_SIZE):
		var p := AudioStreamPlayer.new()
		p.name = "SFXPlayer_" + str(i)
		p.bus = "Master"
		p.volume_db = -6.0
		add_child(p)
		_sfx_players.append(p)

	_ambient_deck_a = AudioStreamPlayer.new()
	_ambient_deck_a.name = "AmbientDeckA"
	_ambient_deck_a.bus = "Master"
	_ambient_deck_a.volume_db = AMBIENT_BASE_DB
	add_child(_ambient_deck_a)

	_ambient_deck_b = AudioStreamPlayer.new()
	_ambient_deck_b.name = "AmbientDeckB"
	_ambient_deck_b.bus = "Master"
	_ambient_deck_b.volume_db = -60.0
	add_child(_ambient_deck_b)

	_noise_player = AudioStreamPlayer.new()
	_noise_player.name = "ProceduralWhiteNoisePlayer"
	_noise_player.bus = "Master"
	_noise_player.volume_db = -21.0
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = 0.12
	_noise_player.stream = gen
	add_child(_noise_player)

func _on_toggle_desktop_mode(enabled: bool) -> void:
	if enabled:
		set_muted(true)
	else:
		set_muted(false)

func _on_island_unlocked(_island_idx: int) -> void:
	play_water_sfx()
	advance_ambient_weather()

func get_current_ambient_key() -> String:
	return AMBIENT_PLAYLIST[posmod(current_ambient_idx, AMBIENT_PLAYLIST.size())]

func get_current_ambient_label() -> String:
	var k := get_current_ambient_key()
	return String(AMBIENT_LABELS.get(k, k))

func get_loaded_stream_count() -> int:
	return _streams.size()

func _apply_initial_ambient_track(idx: int) -> void:
	current_ambient_idx = posmod(idx, AMBIENT_PLAYLIST.size())
	var key := AMBIENT_PLAYLIST[current_ambient_idx]
	_active_deck_is_a = true
	_is_crossfading = false
	_crossfade_t = 1.0
	if _ambient_deck_a != null and _streams.has(key):
		_ambient_deck_a.stream = _streams[key]
		_ambient_deck_a.volume_db = _compute_ambient_db(1.0)
		if not is_muted:
			_ambient_deck_a.play()
	if _ambient_deck_b != null:
		_ambient_deck_b.stop()

func advance_ambient_weather() -> void:
	crossfade_to_ambient(current_ambient_idx + 1)

func crossfade_to_ambient(next_idx: int) -> void:
	current_ambient_idx = posmod(next_idx, AMBIENT_PLAYLIST.size())
	var key := AMBIENT_PLAYLIST[current_ambient_idx]
	if not _streams.has(key):
		return

	_active_deck_is_a = not _active_deck_is_a
	var incoming := _ambient_deck_a if _active_deck_is_a else _ambient_deck_b
	incoming.stream = _streams[key]
	incoming.volume_db = _compute_ambient_db(0.05)
	if not is_muted:
		incoming.play()
	_crossfade_t = 0.0
	_is_crossfading = true

func _compute_ambient_db(fade_weight: float) -> float:
	var lin := clampf(fade_weight * master_ambient_volume_linear, 0.0001, 1.5)
	return AMBIENT_BASE_DB + linear_to_db(lin)

func _process(delta: float) -> void:
	ambient_cycle_timer += delta
	if ambient_cycle_timer >= AMBIENT_ROTATE_INTERVAL:
		ambient_cycle_timer = 0.0
		advance_ambient_weather()

	if _is_crossfading:
		_crossfade_t = minf(1.0, _crossfade_t + delta / maxf(0.2, CROSSFADE_DURATION))
		var in_deck := _ambient_deck_a if _active_deck_is_a else _ambient_deck_b
		var out_deck := _ambient_deck_b if _active_deck_is_a else _ambient_deck_a
		if in_deck != null:
			in_deck.volume_db = _compute_ambient_db(_crossfade_t)
		if out_deck != null:
			out_deck.volume_db = _compute_ambient_db(1.0 - _crossfade_t)
		if _crossfade_t >= 1.0:
			_is_crossfading = false
			if out_deck != null:
				out_deck.stop()

	if GameManager != null and GameManager.current_weather != _last_synced_weather:
		sync_white_noise_to_weather(GameManager.current_weather)

	if not is_muted:
		var active_deck := _ambient_deck_a if _active_deck_is_a else _ambient_deck_b
		if active_deck != null and active_deck.stream != null and not active_deck.playing:
			active_deck.play()
		_pump_procedural_white_noise(delta)

func set_muted(mute: bool) -> void:
	is_muted = mute
	if is_muted:
		if _ambient_deck_a != null:
			_ambient_deck_a.stop()
		if _ambient_deck_b != null:
			_ambient_deck_b.stop()
		for p in _sfx_players:
			if p.playing:
				p.stop()
		if _noise_player != null and _noise_player.playing:
			_noise_player.stop()
	else:
		var active_deck := _ambient_deck_a if _active_deck_is_a else _ambient_deck_b
		if active_deck != null and active_deck.stream != null:
			active_deck.volume_db = _compute_ambient_db(1.0)
			active_deck.play()

func toggle_mute() -> bool:
	set_muted(not is_muted)
	if not is_muted:
		play_click_sfx()
	return is_muted

func play_sfx(sfx_name: String, pitch_variance: float = 0.05, extra_db: float = 0.0) -> void:
	if is_muted or not _streams.has(sfx_name):
		return

	var now_ms := Time.get_ticks_msec()
	var min_cd := int(SFX_COOLDOWNS_MS.get(sfx_name, 35))
	var prev_ms := int(_last_play_ticks.get(sfx_name, -9999))
	if now_ms - prev_ms < min_cd:
		return
	_last_play_ticks[sfx_name] = now_ms

	var base_db := float(SFX_BASE_VOL_DB.get(sfx_name, -6.0)) + extra_db
	var final_db := base_db + linear_to_db(clampf(master_sfx_volume_linear, 0.05, 1.5))

	var chosen: AudioStreamPlayer = null
	for p in _sfx_players:
		if not p.playing:
			chosen = p
			break
	if chosen == null and _sfx_players.size() > 0:
		chosen = _sfx_players[_rr_cursor % _sfx_players.size()]
		_rr_cursor += 1

	if chosen != null:
		chosen.stream = _streams[sfx_name]
		chosen.volume_db = final_db
		chosen.pitch_scale = randf_range(1.0 - pitch_variance, 1.0 + pitch_variance)
		chosen.play()

func play_coin_sfx() -> void:
	play_sfx("meso_coin", 0.05, 0.0)

func play_upgrade_sfx() -> void:
	play_sfx("wood_build", 0.05, 0.0)

func play_milestone_sfx() -> void:
	play_sfx("wood_build", 0.02, 1.5)
	play_sfx("meso_coin", 0.03, -1.0)

func play_pop_sfx() -> void:
	play_sfx("harvest_pop", 0.06, 0.0)

func play_water_sfx() -> void:
	play_sfx("water_splash", 0.05, 0.0)

func play_click_sfx() -> void:
	play_sfx("ui_click", 0.03, 0.0)

func play_hover_sfx() -> void:
	play_sfx("ui_hover", 0.03, 0.0)

## v2.6-1 Procedural White Noise Synthesizer API
func sync_white_noise_to_weather(weather_id: int) -> void:
	_last_synced_weather = clampi(weather_id, 0, 3)
	current_noise_profile = WHITE_NOISE_PROFILES[_last_synced_weather]

func set_white_noise_enabled(enabled: bool) -> void:
	white_noise_enabled = enabled
	if not white_noise_enabled and _noise_player != null and _noise_player.playing:
		_noise_player.stop()

func toggle_white_noise() -> bool:
	set_white_noise_enabled(not white_noise_enabled)
	if white_noise_enabled and is_muted:
		set_muted(false)
	play_click_sfx()
	return white_noise_enabled

func get_white_noise_profile() -> String:
	return current_noise_profile

func is_white_noise_active() -> bool:
	return white_noise_enabled and not is_muted

func get_white_noise_status_label() -> String:
	if not white_noise_enabled or is_muted:
		return "[白噪:关]"
	var prof := get_white_noise_profile()
	return "[白噪:" + String(WHITE_NOISE_CN_LABELS.get(prof, "微风")) + "]"

func _pump_procedural_white_noise(delta: float) -> void:
	if not white_noise_enabled or is_muted or _noise_player == null:
		return
	if not _noise_player.playing:
		_noise_player.play()
		_noise_playback = _noise_player.get_stream_playback() as AudioStreamGeneratorPlayback
	if _noise_playback == null:
		return
	var frames := mini(_noise_playback.get_frames_available(), 512)
	if frames <= 0:
		return
	var alpha := 0.08
	var amp := 0.045
	match current_noise_profile:
		"breeze":
			alpha = 0.06
			amp = 0.040 * (0.75 + 0.25 * sin(_noise_phase * 1.4))
		"dusk_chime":
			alpha = 0.08
			amp = 0.045 * (0.80 + 0.20 * sin(_noise_phase * 1.9))
		"cricket":
			alpha = 0.14
			amp = 0.038 * (0.65 + 0.35 * absf(sin(_noise_phase * 6.5)))
		"rain":
			alpha = 0.22
			amp = 0.055
	_noise_phase += delta
	for _i in range(frames):
		var raw := randf_range(-1.0, 1.0)
		_noise_lp_state = lerpf(_noise_lp_state, raw, alpha)
		var sample := _noise_lp_state * amp
		_noise_playback.push_frame(Vector2(sample, sample))
