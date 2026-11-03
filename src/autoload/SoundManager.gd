extends Node
## Pure Code-Synthesized 8-Bit Retro SFX Autoload (`src/autoload/SoundManager.gd`) — PRD Patch v2.2 Section 5
## Uses Godot 4 `AudioStreamGenerator` + sine/square wave math formulas (zero external audio dependencies):
## 1. `play_coin_sfx()`     — Customer checkout: 2-tone sine wave (987Hz B5 -> 1318Hz E6, 0.12s)
## 2. `play_upgrade_sfx()`  — Building/Animal upgrade: 3-tone square arpeggio (C5 523Hz -> E5 659Hz -> G5 784Hz, 0.18s)
## 3. `play_milestone_sfx()`— Lv.25 Milestone / Island Unlock: 4-tone retro chord (C5 -> E5 -> G5 -> C6, 0.28s)
## 4. `play_pop_sfx()`      — Crop harvest / item buffered: frequency slide (400Hz -> 600Hz, 0.05s)
## - Auto-mutes by default when entering Desktop Companion Mode (`摸鱼模式`), with manual `🔊/🔇` toggle in HUD.

const MIX_RATE := 22050.0

var is_muted: bool = true # Default muted in Desktop Companion Mode (摸鱼模式)
var player: AudioStreamPlayer
var generator: AudioStreamGenerator
var playback: AudioStreamGeneratorPlayback

var phase: float = 0.0
var active_notes: Array[Dictionary] = []

func _ready() -> void:
	generator = AudioStreamGenerator.new()
	generator.mix_rate = MIX_RATE
	generator.buffer_length = 0.35

	player = AudioStreamPlayer.new()
	player.stream = generator
	player.volume_db = -8.0
	add_child(player)
	player.play()
	playback = player.get_stream_playback() as AudioStreamGeneratorPlayback

	if EventBus != null:
		EventBus.toggle_desktop_mode.connect(_on_toggle_desktop_mode)

func _on_toggle_desktop_mode(enabled: bool) -> void:
	# PRD v2.2 Section 5: Automatically enable mute when entering Desktop Companion Mode
	if enabled:
		is_muted = true

func toggle_mute() -> bool:
	is_muted = not is_muted
	if not is_muted:
		play_pop_sfx()
	return is_muted

func set_muted(val: bool) -> void:
	is_muted = val

## 1. Customer Checkout SFX: 987Hz (B5) -> 1318Hz (E6), 0.12s sine wave
func play_coin_sfx() -> void:
	if is_muted:
		return
	active_notes.clear()
	active_notes.append({"wave": "sine", "f0": 987.77, "f1": 987.77, "dur": 0.06, "elapsed": 0.0, "amp": 0.26})
	active_notes.append({"wave": "sine", "f0": 1318.51, "f1": 1318.51, "dur": 0.06, "elapsed": 0.0, "amp": 0.28})

## 2. Upgrade SFX: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz), 0.18s square wave arpeggio
func play_upgrade_sfx() -> void:
	if is_muted:
		return
	active_notes.clear()
	active_notes.append({"wave": "square", "f0": 523.25, "f1": 523.25, "dur": 0.06, "elapsed": 0.0, "amp": 0.18})
	active_notes.append({"wave": "square", "f0": 659.25, "f1": 659.25, "dur": 0.06, "elapsed": 0.0, "amp": 0.18})
	active_notes.append({"wave": "square", "f0": 783.99, "f1": 783.99, "dur": 0.06, "elapsed": 0.0, "amp": 0.20})

## 3. Milestone / Island Unlock SFX: 4-note cheerful retro chord arpeggio (C5 -> E5 -> G5 -> C6)
func play_milestone_sfx() -> void:
	if is_muted:
		return
	active_notes.clear()
	active_notes.append({"wave": "square", "f0": 523.25, "f1": 523.25, "dur": 0.06, "elapsed": 0.0, "amp": 0.20})
	active_notes.append({"wave": "square", "f0": 659.25, "f1": 659.25, "dur": 0.06, "elapsed": 0.0, "amp": 0.20})
	active_notes.append({"wave": "square", "f0": 783.99, "f1": 783.99, "dur": 0.06, "elapsed": 0.0, "amp": 0.22})
	active_notes.append({"wave": "sine", "f0": 1046.50, "f1": 1046.50, "dur": 0.10, "elapsed": 0.0, "amp": 0.26})

## 4. Harvest / Buffer Pop SFX: 400Hz -> 600Hz slide, 0.05s
func play_pop_sfx() -> void:
	if is_muted:
		return
	if active_notes.size() > 0:
		return # Don't interrupt coin/upgrade/milestone sfx
	active_notes.append({"wave": "sine", "f0": 400.0, "f1": 600.0, "dur": 0.05, "elapsed": 0.0, "amp": 0.22})

func _process(_delta: float) -> void:
	if playback == null:
		return
	var frames_avail := playback.get_frames_available()
	if frames_avail <= 0:
		return

	for _i in range(frames_avail):
		if is_muted or active_notes.size() == 0:
			playback.push_frame(Vector2.ZERO)
			continue

		var cur: Dictionary = active_notes[0]
		var dur := maxf(0.005, float(cur["dur"]))
		var el := float(cur["elapsed"])
		var t := clampf(el / dur, 0.0, 1.0)
		var freq := lerpf(float(cur["f0"]), float(cur["f1"]), t)
		var env := (1.0 - t * 0.75) * float(cur["amp"])

		phase = fmod(phase + freq / MIX_RATE, 1.0)
		var sample := 0.0
		if String(cur["wave"]) == "square":
			sample = (1.0 if phase < 0.5 else -1.0) * env
		else:
			sample = sin(phase * TAU) * env

		playback.push_frame(Vector2(sample, sample))

		el += 1.0 / MIX_RATE
		cur["elapsed"] = el
		if el >= dur:
			active_notes.remove_at(0)
