extends Node
## Steamworks API Abstraction Bridge (`src/autoload/SteamBridge.gd`) — PRD v3.0-2
## - Gracefully degrades when `GodotSteam` (`Engine.has_singleton("Steam")`) is not present (zero DLL crashes).
## - Automatically syncs achievements & cloud save buffers when `Steam` singleton is mounted.

const STEAM_APP_ID := 480
const CLOUD_MIRROR_DIR := "user://"

var steam_available: bool = false
var steam_initialized: bool = false
var _steam_singleton: Object = null
var synced_achievements: Dictionary = {}
var cloud_storage_mirror: Dictionary = {}

func _ready() -> void:
	_probe_steam_singleton()

func _probe_steam_singleton() -> void:
	if Engine.has_singleton("Steam"):
		_steam_singleton = Engine.get_singleton("Steam")
		if _steam_singleton != null:
			steam_available = true
			if _steam_singleton.has_method("steamInitEx"):
				var res = _steam_singleton.call("steamInitEx", false, STEAM_APP_ID)
				if res is Dictionary and int(res.get("status", 1)) == 0:
					steam_initialized = true
			elif _steam_singleton.has_method("steamInit"):
				steam_initialized = bool(_steam_singleton.call("steamInit", false))
	else:
		steam_available = false
		steam_initialized = false

func _process(_delta: float) -> void:
	if steam_initialized and _steam_singleton != null and _steam_singleton.has_method("run_callbacks"):
		_steam_singleton.call("run_callbacks")

func set_achievement(ach_id: String) -> bool:
	if ach_id.is_empty():
		return false
	synced_achievements[ach_id] = true
	if steam_initialized and _steam_singleton != null and _steam_singleton.has_method("setAchievement"):
		_steam_singleton.call("setAchievement", ach_id)
		if _steam_singleton.has_method("storeStats"):
			_steam_singleton.call("storeStats")
	return true

func is_achievement_unlocked(ach_id: String) -> bool:
	if steam_initialized and _steam_singleton != null and _steam_singleton.has_method("getAchievement"):
		var st = _steam_singleton.call("getAchievement", ach_id)
		if st is Dictionary and bool(st.get("achieved", false)):
			return true
	return bool(synced_achievements.get(ach_id, false))

func cloud_write(file_name: String, json_text: String) -> bool:
	if file_name.is_empty():
		return false
	cloud_storage_mirror[file_name] = json_text
	if steam_initialized and _steam_singleton != null and _steam_singleton.has_method("fileWrite"):
		var raw := json_text.to_utf8_buffer()
		_steam_singleton.call("fileWrite", file_name, raw, raw.size())
	return true

func cloud_read(file_name: String) -> String:
	if steam_initialized and _steam_singleton != null and _steam_singleton.has_method("fileExists") and _steam_singleton.has_method("fileRead"):
		if bool(_steam_singleton.call("fileExists", file_name)):
			var sz := int(_steam_singleton.call("getFileSize", file_name)) if _steam_singleton.has_method("getFileSize") else 0
			if sz > 0:
				var d = _steam_singleton.call("fileRead", file_name, sz)
				if d is Dictionary and d.has("buf"):
					var b: PackedByteArray = d["buf"]
					return b.get_string_from_utf8()
	return String(cloud_storage_mirror.get(file_name, ""))

func get_status_dict() -> Dictionary:
	return {
		"steam_available": steam_available,
		"steam_initialized": steam_initialized,
		"fallback_active": not steam_initialized,
		"synced_achievement_count": synced_achievements.size(),
		"cloud_files_count": cloud_storage_mirror.size()
	}
