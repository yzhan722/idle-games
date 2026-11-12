extends Node
## Global State, Strict Per-Island Recruit Caps, Recruit-to-Promote & Save System (`src/autoload/GameManager.gd`) — PRD Patch v2.2

const SAVE_PATH := "user://savegame.json"
const SELFTEST_SAVE_PATH := "user://savegame_selftest.json"
const SAVE_VERSION := 22

var active_save_path: String = SAVE_PATH
var is_automated_test_mode: bool = false

var gold: int = 120
var total_gold_earned: int = 120
var desktop_companion_mode: bool = true

var unlocked_islands: Dictionary = {
	1: true,
	2: false,
	3: false
}

var building_levels: Dictionary = {
	"soil_1": 1,
	"mortar": 1,
	"stall": 1,
	"soil_2": 1,
	"cauldron": 1,
	"soil_3": 1
}

## Team Promotion Level (Lv.1+ once recruited; increments when 【全队进修 (Lv.+1)】 is clicked after reaching Recruit Cap!)
var animal_levels: Dictionary = {
	"bunny": 1,
	"otter": 0,
	"fox": 0,
	"shiba": 0,
	"penguin": 0,
	"toucan": 0
}

## PRD v2.2 Section 3: Recruited Headcount per Island (Island 1 starts with 1 free Bunny; Max caps defined in EconomyConfig.ISLAND_RECRUIT_CAPS)
var island_recruited: Dictionary = {
	1: {"bunny": 1, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0},
	2: {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0},
	3: {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
}

## Pure Numeric Buffers (default cap = 10, scales with building level; zero visual icon clutter)
var raw_baskets: Dictionary = {
	1: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
	2: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
	3: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
}

var workshop_inputs: Dictionary = {
	"mortar": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
	"cauldron": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
	"orbis_linked": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
}

var workshop_outputs: Dictionary = {
	"mortar": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
	"cauldron": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
	"orbis_linked": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0}
}

var stall_inventory: Dictionary = {
	"crop_0": 3,
	"crop_1": 0,
	"crop_2": 0,
	"crop_3": 0,
	"delicacy_0": 0,
	"delicacy_1": 0,
	"delicacy_2": 0,
	"delicacy_3": 0
}

var save_timer: float = 0.0
var pending_offline_seconds: int = 0
var pending_offline_gold: int = 0
var last_offline_report: Dictionary = {}

## v2.3 Direction 1 & 2 + CI-2: Dynamic Weather/Time-of-Day Cycle, Carnival Frenzy, Gourmet Acclaim & Night Lantern Festival
enum WeatherState { DAY = 0, DUSK = 1, NIGHT = 2, RAIN = 3 }
const GOURMET_ACCLAIM_DURATION: float = 36.0
const GOURMET_PRICE_BONUS_MULT: float = 1.25
const GOURMET_TIP_BONUS_MULT: float = 1.20
const LANTERN_FESTIVAL_DURATION: float = 42.0

var current_weather: int = WeatherState.DAY
var weather_timer: float = 0.0
var frenzy_timer: float = 0.0
var gourmet_acclaim_timer: float = 0.0
var lantern_festival_timer: float = 0.0

## v2.4-4: Pomodoro Focus Timer Companion (25min / 1500s) & Gift Box Reward
const POMODORO_DURATION: float = 1500.0
const POMODORO_REWARD_GOLD: int = 500
const POMODORO_FRENZY_DURATION: float = 30.0

var pomodoro_active: bool = false
var pomodoro_time_remaining: float = 0.0
var pomodoro_completed_count: int = 0

## v2.3 Direction 4: Mountain & Sea Collection Codex (4 Crops + 4 Delicacies -> +10% global sale price per unlocked entry)
var unlocked_codex: Dictionary = {
	"crop_0": true,
	"crop_1": false,
	"crop_2": false,
	"crop_3": false,
	"delicacy_0": false,
	"delicacy_1": false,
	"delicacy_2": false,
	"delicacy_3": false
}

## v2.5-1: Secondary Currency (Amber 晨露琥珀) & Airship Royal Contracts
var amber: int = 0
var total_amber_earned: int = 0
var active_contract: Dictionary = {}

## v2.5-2: Island Landscape Decorations & Passive Buffs
var unlocked_landscapes: Dictionary = {
	"bee_hive": false,
	"wind_chime": false,
	"tiki_torch": false
}

## v2.7-1: 16 In-App & Steam Achievements
var unlocked_achievements: Dictionary = {}

## v2.7-3: Career Statistics & Star Reputation (1~5 Stars)
var career_stats: Dictionary = {
	"harvests": 0,
	"crafts": 0,
	"customers": 0,
	"contracts": 0
}

func _ready() -> void:
	var all_args := OS.get_cmdline_args()
	all_args.append_array(OS.get_cmdline_user_args())
	for arg in all_args:
		var s := String(arg)
		if s == "--self-test" or s == "--playtest":
			is_automated_test_mode = true
			active_save_path = SELFTEST_SAVE_PATH
			break
	if not is_automated_test_mode:
		load_game()
	if active_contract.is_empty():
		generate_next_contract()
	_sync_codex_from_progression()
	evaluate_achievements()

func reset_for_playtest_state() -> void:
	gold = 120
	total_gold_earned = 120
	desktop_companion_mode = true
	amber = 0
	total_amber_earned = 0
	active_contract.clear()
	unlocked_landscapes = {
		"bee_hive": false,
		"wind_chime": false,
		"tiki_torch": false
	}
	generate_next_contract()
	unlocked_islands = {1: true, 2: false, 3: false}
	building_levels = {"soil_1": 1, "mortar": 1, "stall": 1, "soil_2": 1, "cauldron": 1, "soil_3": 1}
	animal_levels = {"bunny": 1, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
	island_recruited = {
		1: {"bunny": 1, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0},
		2: {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0},
		3: {"bunny": 0, "otter": 0, "fox": 0, "shiba": 0, "penguin": 0, "toucan": 0}
	}
	raw_baskets = {
		1: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
		2: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
		3: {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
	}
	workshop_inputs = {
		"mortar": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
		"cauldron": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0},
		"orbis_linked": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
	}
	workshop_outputs = {
		"mortar": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
		"cauldron": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
		"orbis_linked": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0}
	}
	stall_inventory = {
		"crop_0": 3, "crop_1": 0, "crop_2": 0, "crop_3": 0,
		"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0
	}
	unlocked_codex = {
		"crop_0": true, "crop_1": false, "crop_2": false, "crop_3": false,
		"delicacy_0": false, "delicacy_1": false, "delicacy_2": false, "delicacy_3": false
	}
	pending_offline_seconds = 0
	pending_offline_gold = 0
	last_offline_report = {}
	pomodoro_active = false
	pomodoro_time_remaining = 0.0
	pomodoro_completed_count = 0
	gourmet_acclaim_timer = 0.0
	lantern_festival_timer = 0.0
	unlocked_achievements = {}
	career_stats = {"harvests": 0, "crafts": 0, "customers": 0, "contracts": 0}
	_sync_codex_from_progression()
	evaluate_achievements()

func _process(delta: float) -> void:
	save_timer += delta
	if save_timer >= 15.0:
		save_timer = 0.0
		save_game()

	if frenzy_timer > 0.0:
		frenzy_timer = maxf(0.0, frenzy_timer - delta)
	if gourmet_acclaim_timer > 0.0:
		gourmet_acclaim_timer = maxf(0.0, gourmet_acclaim_timer - delta)
	if lantern_festival_timer > 0.0:
		if current_weather != WeatherState.NIGHT:
			lantern_festival_timer = 0.0
		else:
			lantern_festival_timer = maxf(0.0, lantern_festival_timer - delta)

	if pomodoro_active:
		pomodoro_time_remaining -= delta
		if pomodoro_time_remaining <= 0.0:
			complete_pomodoro()

	weather_timer += delta
	if weather_timer >= 42.0:
		weather_timer = 0.0
		set_weather((current_weather + 1) % 4)

func set_weather(next_weather: int) -> void:
	current_weather = clampi(next_weather, 0, 3)
	if current_weather == WeatherState.NIGHT:
		if lantern_festival_timer <= 0.0 and randf() < 0.68:
			start_lantern_festival(LANTERN_FESTIVAL_DURATION)
	else:
		lantern_festival_timer = 0.0
	if SoundManager != null and SoundManager.has_method("crossfade_to_ambient"):
		SoundManager.crossfade_to_ambient(current_weather)
	EventBus.weather_changed.emit(current_weather)

func start_lantern_festival(duration: float = LANTERN_FESTIVAL_DURATION) -> void:
	if current_weather != WeatherState.NIGHT:
		current_weather = WeatherState.NIGHT
		EventBus.weather_changed.emit(current_weather)
	lantern_festival_timer = maxf(lantern_festival_timer, duration)
	EventBus.lantern_festival_started.emit(lantern_festival_timer)

func is_lantern_festival_active() -> bool:
	return current_weather == WeatherState.NIGHT and lantern_festival_timer > 0.0

func trigger_gourmet_acclaim(duration: float = GOURMET_ACCLAIM_DURATION) -> void:
	gourmet_acclaim_timer = maxf(gourmet_acclaim_timer, duration)
	EventBus.gourmet_acclaim_started.emit(gourmet_acclaim_timer)

func is_gourmet_acclaim_active() -> bool:
	return gourmet_acclaim_timer > 0.0

func get_weather_crop_growth_multiplier() -> float:
	var mult := 1.35 if current_weather == WeatherState.RAIN else 1.0
	if frenzy_timer > 0.0:
		mult *= 1.6
	return mult

func get_weather_vip_chance() -> float:
	var base_c := 0.36 if (current_weather == WeatherState.DUSK or current_weather == WeatherState.NIGHT) else 0.18
	if is_lantern_festival_active():
		base_c = maxf(base_c, 0.58)
	if frenzy_timer > 0.0:
		base_c = maxf(base_c, 0.50)
	return base_c

func get_weather_status_text() -> String:
	if frenzy_timer > 0.0:
		return "★嘉年华加速(" + str(int(ceili(frenzy_timer))) + "s)"
	if is_lantern_festival_active():
		return "★花火灯会(" + str(int(ceili(lantern_festival_timer))) + "s)"
	if gourmet_acclaim_timer > 0.0:
		return "★金牌口碑(" + str(int(ceili(gourmet_acclaim_timer))) + "s)"
	match current_weather:
		WeatherState.DAY:
			return "晴昼·常速"
		WeatherState.DUSK:
			return "黄昏·富豪2x"
		WeatherState.NIGHT:
			return "夜市·富豪2x"
		WeatherState.RAIN:
			return "微雨·农田+35%"
	return "晴昼·常速"

func trigger_carnival_frenzy(duration: float = 20.0) -> void:
	frenzy_timer = maxf(frenzy_timer, duration)
	EventBus.carnival_frenzy_started.emit(frenzy_timer)

func start_pomodoro(duration: float = POMODORO_DURATION) -> void:
	pomodoro_active = true
	pomodoro_time_remaining = maxf(1.0, duration)
	EventBus.pomodoro_state_changed.emit(true, pomodoro_time_remaining)

func stop_pomodoro() -> void:
	pomodoro_active = false
	pomodoro_time_remaining = 0.0
	EventBus.pomodoro_state_changed.emit(false, 0.0)

func toggle_pomodoro() -> bool:
	if pomodoro_active:
		stop_pomodoro()
		return false
	else:
		start_pomodoro()
		return true

func complete_pomodoro() -> Dictionary:
	pomodoro_active = false
	pomodoro_time_remaining = 0.0
	pomodoro_completed_count += 1
	add_gold(POMODORO_REWARD_GOLD)
	trigger_carnival_frenzy(POMODORO_FRENZY_DURATION)
	var report := {
		"gold": POMODORO_REWARD_GOLD,
		"frenzy_sec": POMODORO_FRENZY_DURATION,
		"completed_count": pomodoro_completed_count
	}
	EventBus.pomodoro_completed.emit(POMODORO_REWARD_GOLD, POMODORO_FRENZY_DURATION)
	save_game()
	return report

func fast_forward_pomodoro(seconds: float) -> void:
	if pomodoro_active:
		pomodoro_time_remaining -= seconds
		if pomodoro_time_remaining <= 0.0:
			complete_pomodoro()

func get_pomodoro_formatted_time() -> String:
	var total_sec := int(ceilf(pomodoro_time_remaining)) if pomodoro_active else int(POMODORO_DURATION)
	var m := total_sec / 60
	var s := total_sec % 60
	return "%02d:%02d" % [m, s]

func unlock_codex_entry(item_id: String) -> void:
	if unlocked_codex.has(item_id) and not bool(unlocked_codex[item_id]):
		unlocked_codex[item_id] = true
		EventBus.codex_unlocked.emit(item_id)

func _sync_codex_from_progression() -> void:
	unlock_codex_entry("crop_0")
	for isl in [1, 2, 3]:
		if bool(unlocked_islands.get(isl, false)):
			var slv := int(building_levels.get("soil_" + str(isl), 1))
			unlock_codex_entry(EconomyConfig.get_evolved_crop_id(isl, slv))
	if get_island_recruited_count(1, "fox") >= 1 or int(building_levels.get("mortar", 1)) > 1:
		unlock_codex_entry(EconomyConfig.get_evolved_delicacy_id("mortar", int(building_levels.get("mortar", 1))))
	if bool(unlocked_islands.get(2, false)) and (get_island_recruited_count(2, "penguin") >= 1 or int(building_levels.get("cauldron", 1)) > 1):
		unlock_codex_entry(EconomyConfig.get_evolved_delicacy_id("cauldron", int(building_levels.get("cauldron", 1))))
	if bool(unlocked_islands.get(3, false)) and (get_island_recruited_count(3, "fox") >= 1 or get_island_recruited_count(3, "penguin") >= 1 or int(building_levels.get("soil_3", 1)) > 1):
		unlock_codex_entry("delicacy_3")

func get_unlocked_codex_count() -> int:
	var cnt := 0
	for k in unlocked_codex.keys():
		if bool(unlocked_codex[k]):
			cnt += 1
	return cnt

func get_codex_price_multiplier() -> float:
	var mult := 1.0 + 0.10 * float(get_unlocked_codex_count())
	if gourmet_acclaim_timer > 0.0:
		mult *= GOURMET_PRICE_BONUS_MULT
	return mult

func is_animal_hired(animal_key: String) -> bool:
	return get_total_recruited(animal_key) >= 1

func get_island_recruited_count(island_idx: int, animal_key: String) -> int:
	if not island_recruited.has(island_idx):
		return 0
	return int(island_recruited[island_idx].get(animal_key, 0))

func is_island_otter_hired(island_idx: int) -> bool:
	return get_island_recruited_count(island_idx, "otter") >= 1

func get_total_recruited(animal_key: String) -> int:
	var sum := 0
	for isl in [1, 2, 3]:
		if bool(unlocked_islands.get(isl, false)):
			sum += get_island_recruited_count(isl, animal_key)
	return sum

func get_total_max_cap(animal_key: String) -> int:
	var cap := 0
	for isl in [1, 2, 3]:
		if bool(unlocked_islands.get(isl, false)):
			cap += int(EconomyConfig.ISLAND_RECRUIT_CAPS[isl].get(animal_key, 0))
	return cap

func find_next_recruit_island(animal_key: String) -> int:
	for isl in [1, 2, 3]:
		if bool(unlocked_islands.get(isl, false)):
			var cur := get_island_recruited_count(isl, animal_key)
			var mx := int(EconomyConfig.ISLAND_RECRUIT_CAPS[isl].get(animal_key, 0))
			if cur < mx:
				return isl
	return 0

## PRD v2.2 Section 3: Fixed 2x SoilPlot Slots per Island (Island 1 starts with 1 plot at Lv.1, unlocks 2nd slot at Lv.2+)
func get_unlocked_plot_count(island_idx: int) -> int:
	if not bool(unlocked_islands.get(island_idx, false)):
		return 0
	if island_idx == 1:
		var lv := int(building_levels.get("soil_1", 1))
		return 1 if lv <= 1 else 2
	return 2

func add_gold(amount: int) -> void:
	if amount == 0:
		return
	gold = maxi(0, gold + amount)
	if amount > 0:
		total_gold_earned += amount
	EventBus.gold_changed.emit(gold, amount)
	EventBus.prosperity_changed.emit(get_prosperity_score())

func spend_gold(cost: int) -> bool:
	if gold < cost:
		return false
	gold -= cost
	EventBus.gold_changed.emit(gold, -cost)
	return true

## ==================================================================
## v2.5-1: Secondary Currency (Amber 晨露琥珀) & Airship Royal Contracts
## ==================================================================
func add_amber(amount: int) -> void:
	if amount <= 0:
		return
	amber += amount
	total_amber_earned += amount
	EventBus.amber_changed.emit(amber, amount)

func spend_amber(cost: int) -> bool:
	if cost <= 0:
		return true
	if amber < cost:
		return false
	amber -= cost
	EventBus.amber_changed.emit(amber, -cost)
	return true

func get_amber() -> int:
	return amber

func generate_next_contract() -> Dictionary:
	var available_items: Array[String] = ["crop_0", "delicacy_0"]
	if bool(unlocked_codex.get("crop_1", false)) or int(building_levels.get("soil_1", 1)) >= 25:
		available_items.append("crop_1")
		available_items.append("delicacy_1")
	if bool(unlocked_islands.get(2, false)):
		available_items.append("crop_2")
		available_items.append("delicacy_2")
	if bool(unlocked_islands.get(3, false)):
		available_items.append("crop_3")
		available_items.append("delicacy_3")

	var prev_idx: int = int(active_contract.get("contract_index", 0))
	var next_idx: int = prev_idx + 1
	var chosen_item: String = available_items[next_idx % available_items.size()]
	var item_name: String = chosen_item
	if EconomyConfig.CROPS.has(chosen_item):
		item_name = String(EconomyConfig.CROPS[chosen_item].get("name", chosen_item))
	elif EconomyConfig.DELICACIES.has(chosen_item):
		item_name = String(EconomyConfig.DELICACIES[chosen_item].get("name", chosen_item))

	var req_cnt: int = 3 + (next_idx % 4)
	var rew_gold: int = 120 + req_cnt * 25
	var rew_amber: int = 1 + (next_idx % 3)

	active_contract = {
		"id": "contract_" + str(next_idx),
		"contract_index": next_idx,
		"target_item": chosen_item,
		"target_name": item_name,
		"required_count": req_cnt,
		"current_count": 0,
		"reward_gold": rew_gold,
		"reward_amber": rew_amber
	}
	EventBus.contract_updated.emit(active_contract)
	return active_contract

func progress_contract(item_id: String, amount: int = 1) -> bool:
	if active_contract.is_empty():
		generate_next_contract()
	if String(active_contract.get("target_item", "")) != item_id:
		return false
	var cur := int(active_contract.get("current_count", 0)) + amount
	var req := int(active_contract.get("required_count", 5))
	active_contract["current_count"] = cur
	EventBus.contract_progressed.emit(item_id, cur, req)
	if cur >= req:
		complete_active_contract()
		return true
	return false

func complete_active_contract() -> Dictionary:
	if active_contract.is_empty():
		return {}
	var completed := active_contract.duplicate(true)
	career_stats["contracts"] = int(career_stats.get("contracts", 0)) + 1
	var rew_gold := int(completed.get("reward_gold", 150))
	var rew_amber := int(completed.get("reward_amber", 2))
	add_gold(rew_gold)
	add_amber(rew_amber)
	EventBus.contract_completed.emit(completed)
	EventBus.spawn_floating_text.emit(
		Vector2(1013.4, EconomyConfig.GROUND_Y - 40.0),
		"★皇家契约完成! +" + str(rew_gold) + "G +" + str(rew_amber) + "琥珀",
		Color("#FFE066")
	)
	generate_next_contract()
	evaluate_achievements()
	save_game()
	return completed

func get_active_contract() -> Dictionary:
	if active_contract.is_empty():
		generate_next_contract()
	return active_contract

## ==================================================================
## v2.5-2: Island Landscape Decorations & Passive Buffs
## ==================================================================
func unlock_landscape(landscape_id: String) -> bool:
	if bool(unlocked_landscapes.get(landscape_id, false)):
		return false
	if not EconomyConfig.ISLAND_LANDSCAPES.has(landscape_id):
		return false
	var cfg: Dictionary = EconomyConfig.ISLAND_LANDSCAPES[landscape_id]
	var cost := int(cfg.get("cost_amber", 3))
	if not spend_amber(cost):
		return false
	unlocked_landscapes[landscape_id] = true
	save_game()
	var isl := int(cfg.get("island", 1))
	EventBus.landscape_unlocked.emit(isl, landscape_id)
	EventBus.spawn_floating_text.emit(
		Vector2(float(cfg.get("x_pos", 660.0)), EconomyConfig.GROUND_Y - 30.0),
		"★解锁造景【" + String(cfg.get("name", landscape_id)) + "】!",
		Color("#FFE066")
	)
	return true

func is_landscape_unlocked(landscape_id: String) -> bool:
	return bool(unlocked_landscapes.get(landscape_id, false))

func get_crop_growth_multiplier(island: int = 1) -> float:
	var mult := get_weather_crop_growth_multiplier()
	if island == 1 and bool(unlocked_landscapes.get("bee_hive", false)):
		mult *= 1.20
	return mult

func get_workshop_speed_multiplier(island: int = 2) -> float:
	var mult := 1.0
	if island == 2 and bool(unlocked_landscapes.get("wind_chime", false)):
		mult *= 1.20
	return mult

func get_customer_tip_multiplier(is_vip: bool, island: int = 3) -> float:
	var mult := EconomyConfig.VIP_TIP_MULTIPLIER if is_vip else 1.0
	if bool(unlocked_landscapes.get("tiki_torch", false)):
		mult *= 1.20
	var shiba_lv := int(animal_levels.get("shiba", 0))
	if shiba_lv >= 10:
		mult *= (1.0 + EconomyConfig.calc_shiba_tip_trait_bonus(shiba_lv))
	if gourmet_acclaim_timer > 0.0:
		mult *= GOURMET_TIP_BONUS_MULT
	return mult

## ==================================================================
## CI-2: Gourmet Critic Tasting & Caravan Merchant Surplus Crop Barter
## ==================================================================
func has_surplus_crops_for_merchant() -> bool:
	for isl in [1, 2, 3]:
		if raw_baskets.has(isl):
			var b: Dictionary = raw_baskets[isl]
			for ck in ["crop_3", "crop_2", "crop_1", "crop_0"]:
				if int(b.get(ck, 0)) > 0:
					return true
	for ck in ["crop_3", "crop_2", "crop_1", "crop_0"]:
		if int(stall_inventory.get(ck, 0)) > 0:
			return true
	return false

func try_merchant_acquire_surplus_crops(desired_qty: int, world_pos: Vector2) -> Dictionary:
	var rem := maxi(1, desired_qty)
	var taken := 0
	var chosen_crop := ""
	for isl in [1, 2, 3]:
		if rem <= 0:
			break
		if not raw_baskets.has(isl):
			continue
		var b: Dictionary = raw_baskets[isl]
		for ck in ["crop_3", "crop_2", "crop_1", "crop_0"]:
			var av := int(b.get(ck, 0))
			if av > 0:
				var grab := mini(av, rem)
				b[ck] = av - grab
				rem -= grab
				taken += grab
				if chosen_crop == "":
					chosen_crop = ck
				if rem <= 0:
					break
	if rem > 0:
		for ck in ["crop_3", "crop_2", "crop_1", "crop_0"]:
			var av := int(stall_inventory.get(ck, 0))
			if av > 0:
				var grab := mini(av, rem)
				stall_inventory[ck] = av - grab
				rem -= grab
				taken += grab
				if chosen_crop == "":
					chosen_crop = ck
				if rem <= 0:
					break
	if taken <= 0:
		return {"taken": 0, "amber": 0, "gold": 0, "item_id": ""}
	var amber_gain := maxi(1, int(ceilf(float(taken) / 2.0)))
	var gold_gain := taken * 36
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_amber(amber_gain)
	add_gold(gold_gain)
	progress_contract(chosen_crop, taken)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(chosen_crop, taken, gold_gain, world_pos)
	EventBus.merchant_barter_completed.emit(chosen_crop, taken, amber_gain, gold_gain)
	return {"taken": taken, "amber": amber_gain, "gold": gold_gain, "item_id": chosen_crop}

func has_delicacy_or_stall_stock_for_critic() -> bool:
	for dk in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
		if int(stall_inventory.get(dk, 0)) > 0:
			return true
		for wid in ["orbis_linked", "cauldron", "mortar"]:
			if workshop_outputs.has(wid) and int(workshop_outputs[wid].get(dk, 0)) > 0:
				return true
	return get_total_stall_count() > 0

func try_critic_taste_delicacy(preferred_id: String, qty: int, world_pos: Vector2) -> int:
	var target_del := ""
	if preferred_id.begins_with("delicacy_") and int(stall_inventory.get(preferred_id, 0)) > 0:
		target_del = preferred_id
	else:
		for dk in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
			if int(stall_inventory.get(dk, 0)) > 0:
				target_del = dk
				break
	if target_del == "":
		for wid in ["orbis_linked", "cauldron", "mortar"]:
			if not workshop_outputs.has(wid):
				continue
			for dk in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
				var wav := int(workshop_outputs[wid].get(dk, 0))
				if wav > 0:
					var move_n := mini(wav, maxi(1, qty))
					workshop_outputs[wid][dk] = wav - move_n
					stall_inventory[dk] = int(stall_inventory.get(dk, 0)) + move_n
					target_del = dk
					break
			if target_del != "":
				break
	var earned := try_purchase_from_stall(target_del if target_del != "" else preferred_id, maxi(1, qty), world_pos, true)
	if earned > 0:
		trigger_gourmet_acclaim(GOURMET_ACCLAIM_DURATION)
	return earned


## ==================================================================
## v2.7-1 & v2.7-3: In-App Steam Achievements, Career Stats & 1~5 Star Reputation
## ==================================================================
func get_star_reputation() -> int:
	var score := get_prosperity_score()
	score += int(career_stats.get("harvests", 0)) * 2
	score += int(career_stats.get("crafts", 0)) * 5
	score += int(career_stats.get("customers", 0)) * 12
	score += int(career_stats.get("contracts", 0)) * 45
	score += get_unlocked_codex_count() * 40
	if score >= 1600:
		return 5
	elif score >= 900:
		return 4
	elif score >= 450:
		return 3
	elif score >= 180:
		return 2
	return 1

func get_career_summary_text() -> String:
	return "★%d星 · 收%d · 制%d · 客%d · 契%d" % [
		get_star_reputation(),
		int(career_stats.get("harvests", 0)),
		int(career_stats.get("crafts", 0)),
		int(career_stats.get("customers", 0)),
		int(career_stats.get("contracts", 0))
	]

func unlock_achievement(ach_id: String) -> bool:
	if not EconomyConfig.ACHIEVEMENTS.has(ach_id):
		return false
	if bool(unlocked_achievements.get(ach_id, false)):
		return false
	unlocked_achievements[ach_id] = true
	if SteamBridge != null and SteamBridge.has_method("set_achievement"):
		SteamBridge.set_achievement(ach_id)
	var cfg: Dictionary = EconomyConfig.ACHIEVEMENTS[ach_id]
	EventBus.spawn_floating_text.emit(
		Vector2(908.4, EconomyConfig.GROUND_Y - 46.0),
		"🏆成就解锁【" + String(cfg.get("name", ach_id)) + "】!",
		Color("#FFE066")
	)
	return true

func get_unlocked_achievement_count() -> int:
	var c := 0
	for k in unlocked_achievements.keys():
		if bool(unlocked_achievements[k]):
			c += 1
	return c

func evaluate_achievements() -> Array[String]:
	var newly: Array[String] = []
	if unlock_achievement("ach_welcome"):
		newly.append("ach_welcome")
	if total_gold_earned >= 500 and unlock_achievement("ach_first_gold"):
		newly.append("ach_first_gold")
	if (int(career_stats.get("crafts", 0)) >= 1 or bool(unlocked_codex.get("delicacy_0", false))) and unlock_achievement("ach_mortar_chef"):
		newly.append("ach_mortar_chef")
	if bool(unlocked_islands.get(2, false)) and unlock_achievement("ach_island_2"):
		newly.append("ach_island_2")
	if bool(unlocked_islands.get(3, false)) and unlock_achievement("ach_island_3"):
		newly.append("ach_island_3")
	if get_unlocked_codex_count() >= 8 and unlock_achievement("ach_codex_all"):
		newly.append("ach_codex_all")
	if pomodoro_completed_count >= 1 and unlock_achievement("ach_pomodoro"):
		newly.append("ach_pomodoro")
	if int(career_stats.get("contracts", 0)) >= 1 and unlock_achievement("ach_contract"):
		newly.append("ach_contract")
	if total_amber_earned >= 5 and unlock_achievement("ach_amber_rich"):
		newly.append("ach_amber_rich")
	if bool(unlocked_landscapes.get("bee_hive", false)) and bool(unlocked_landscapes.get("wind_chime", false)) and bool(unlocked_landscapes.get("tiki_torch", false)):
		if unlock_achievement("ach_landscape_all"):
			newly.append("ach_landscape_all")
	for ak in animal_levels.keys():
		var alv := int(animal_levels[ak])
		if alv >= 10 and unlock_achievement("ach_animal_lv10"):
			newly.append("ach_animal_lv10")
		if alv >= 25 and unlock_achievement("ach_animal_lv25"):
			newly.append("ach_animal_lv25")
	for bk in building_levels.keys():
		if int(building_levels[bk]) >= 25 and unlock_achievement("ach_building_lv25"):
			newly.append("ach_building_lv25")
	if int(career_stats.get("harvests", 0)) >= 50 and unlock_achievement("ach_harvest_50"):
		newly.append("ach_harvest_50")
	if int(career_stats.get("customers", 0)) >= 20 and unlock_achievement("ach_customer_20"):
		newly.append("ach_customer_20")
	if get_star_reputation() >= 5 and unlock_achievement("ach_star_5"):
		newly.append("ach_star_5")
	return newly

func get_prosperity_score() -> int:
	var score := 0
	for k in building_levels.keys():
		var req_isl := int(EconomyConfig.BUILDINGS.get(k, {}).get("island", 1))
		if bool(unlocked_islands.get(req_isl, false)):
			score += int(building_levels[k]) * 20
	for k in animal_levels.keys():
		score += get_total_recruited(k) * 35 + int(animal_levels[k]) * 25
	if bool(unlocked_islands.get(2, false)):
		score += 180
	if bool(unlocked_islands.get(3, false)):
		score += 420
	return score

## Pure Numeric Buffer Capacities (default cap = 10, +5 per building level above 1)
func get_raw_basket_max_cap(island_idx: int) -> int:
	var b_key := "soil_" + str(island_idx)
	return EconomyConfig.calc_buffer_capacity(int(building_levels.get(b_key, 1)))

func get_island_basket_total(island_idx: int) -> int:
	if not raw_baskets.has(island_idx):
		return 0
	var s := 0
	for k in raw_baskets[island_idx].keys():
		s += int(raw_baskets[island_idx][k])
	return s

func is_raw_basket_full(island_idx: int) -> bool:
	return get_island_basket_total(island_idx) >= get_raw_basket_max_cap(island_idx)

func add_to_raw_basket(island_idx: int, crop_id: String, qty: int) -> int:
	unlock_codex_entry(crop_id)
	if not raw_baskets.has(island_idx):
		raw_baskets[island_idx] = {}
	var room := maxi(0, get_raw_basket_max_cap(island_idx) - get_island_basket_total(island_idx))
	var added := mini(qty, room)
	if added > 0:
		career_stats["harvests"] = int(career_stats.get("harvests", 0)) + added
		raw_baskets[island_idx][crop_id] = int(raw_baskets[island_idx].get(crop_id, 0)) + added
		evaluate_achievements()
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.inventory_changed.emit()
		EventBus.item_delivered.emit(crop_id, added, "raw_basket_" + str(island_idx))
	return added

func take_from_raw_basket(island_idx: int, max_qty: int) -> Dictionary:
	if not raw_baskets.has(island_idx):
		return {}
	var b: Dictionary = raw_baskets[island_idx]
	for crop_id in b.keys():
		var avail := int(b[crop_id])
		if avail > 0:
			var take := mini(avail, max_qty)
			b[crop_id] = avail - take
			EventBus.inventory_changed.emit()
			return {"item_id": String(crop_id), "qty": take}
	return {}

func get_workshop_buffer_cap(workshop_id: String) -> int:
	var b_key := "soil_3" if workshop_id == "orbis_linked" else workshop_id
	return EconomyConfig.calc_buffer_capacity(int(building_levels.get(b_key, 1)))

func get_workshop_input_total(workshop_id: String) -> int:
	if not workshop_inputs.has(workshop_id):
		return 0
	var s := 0
	for k in workshop_inputs[workshop_id].keys():
		s += int(workshop_inputs[workshop_id][k])
	return s

func is_workshop_input_full(workshop_id: String) -> bool:
	return get_workshop_input_total(workshop_id) >= get_workshop_buffer_cap(workshop_id)

func add_to_workshop_input(workshop_id: String, crop_id: String, qty: int) -> int:
	if not workshop_inputs.has(workshop_id):
		workshop_inputs[workshop_id] = {}
	var room := maxi(0, get_workshop_buffer_cap(workshop_id) - get_workshop_input_total(workshop_id))
	var added := mini(qty, room)
	if added > 0:
		workshop_inputs[workshop_id][crop_id] = int(workshop_inputs[workshop_id].get(crop_id, 0)) + added
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.inventory_changed.emit()
		EventBus.item_delivered.emit(crop_id, added, workshop_id + "_input")
	return added

func take_workshop_input_for_processing(workshop_id: String) -> String:
	if not workshop_inputs.has(workshop_id):
		return ""
	var inp: Dictionary = workshop_inputs[workshop_id]
	for crop_id in inp.keys():
		if int(inp[crop_id]) > 0:
			inp[crop_id] = int(inp[crop_id]) - 1
			EventBus.inventory_changed.emit()
			return String(crop_id)
	return ""

func get_workshop_output_total(workshop_id: String) -> int:
	if not workshop_outputs.has(workshop_id):
		return 0
	var s := 0
	for k in workshop_outputs[workshop_id].keys():
		s += int(workshop_outputs[workshop_id][k])
	return s

func is_workshop_output_full(workshop_id: String) -> bool:
	return get_workshop_output_total(workshop_id) >= get_workshop_buffer_cap(workshop_id)

func add_to_workshop_output(workshop_id: String, delicacy_id: String, qty: int) -> int:
	unlock_codex_entry(delicacy_id)
	if not workshop_outputs.has(workshop_id):
		workshop_outputs[workshop_id] = {}
	var room := maxi(0, get_workshop_buffer_cap(workshop_id) - get_workshop_output_total(workshop_id))
	var added := mini(qty, room)
	if added > 0:
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
		workshop_outputs[workshop_id][delicacy_id] = int(workshop_outputs[workshop_id].get(delicacy_id, 0)) + added
		evaluate_achievements()
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.inventory_changed.emit()
		EventBus.item_delivered.emit(delicacy_id, added, workshop_id + "_output")
	return added

func take_from_workshop_output(workshop_id: String, max_qty: int) -> Dictionary:
	if not workshop_outputs.has(workshop_id):
		return {}
	var out_dict: Dictionary = workshop_outputs[workshop_id]
	for del_id in out_dict.keys():
		var avail := int(out_dict[del_id])
		if avail > 0:
			var take := mini(avail, max_qty)
			out_dict[String(del_id)] = avail - take
			EventBus.inventory_changed.emit()
			return {"item_id": String(del_id), "qty": take}
	return {}

func get_stall_max_capacity() -> int:
	return EconomyConfig.calc_buffer_capacity(int(building_levels.get("stall", 1)))

func get_total_stall_count() -> int:
	var total := 0
	for k in stall_inventory.keys():
		total += int(stall_inventory[k])
	return total

func is_stall_full() -> bool:
	return get_total_stall_count() >= get_stall_max_capacity()

func add_to_stall(item_id: String, qty: int) -> int:
	unlock_codex_entry(item_id)
	var room := maxi(0, get_stall_max_capacity() - get_total_stall_count())
	var added := mini(qty, room)
	if added > 0:
		stall_inventory[item_id] = int(stall_inventory.get(item_id, 0)) + added
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.inventory_changed.emit()
		EventBus.item_delivered.emit(item_id, added, "market_stall")
	return added

func try_purchase_from_stall(preferred_id: String, qty: int, world_pos: Vector2, is_vip: bool = false) -> int:
	var target_id := preferred_id
	if int(stall_inventory.get(target_id, 0)) <= 0:
		for k in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0", "crop_3", "crop_2", "crop_1", "crop_0"]:
			if int(stall_inventory.get(k, 0)) > 0:
				target_id = k
				break
	var avail := int(stall_inventory.get(target_id, 0))
	if avail <= 0:
		return 0
	var bought := mini(avail, maxi(1, qty))
	stall_inventory[target_id] = avail - bought
	unlock_codex_entry(target_id)

	var b_lv := int(building_levels.get("soil_1", 1))
	if target_id == "crop_2":
		b_lv = int(building_levels.get("soil_2", 1))
	elif target_id == "crop_3":
		b_lv = int(building_levels.get("soil_3", 1))
	elif target_id == "delicacy_0" or target_id == "delicacy_1":
		b_lv = int(building_levels.get("mortar", 1))
	elif target_id == "delicacy_2":
		b_lv = int(building_levels.get("cauldron", 1))
	elif target_id == "delicacy_3":
		b_lv = maxi(int(building_levels.get("cauldron", 1)), int(building_levels.get("soil_3", 1)))

	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var unit_price := EconomyConfig.calc_item_unit_price(
		target_id,
		b_lv,
		int(building_levels.get("stall", 1)),
		shiba_lv
	)
	var total_earned := int(round(float(unit_price * bought) * get_codex_price_multiplier()))
	var tip_mult := get_customer_tip_multiplier(is_vip, 3)
	total_earned = int(round(float(total_earned) * tip_mult))

	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_earned)
	progress_contract(target_id, bought)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_id, bought, total_earned, world_pos)
	return total_earned

func upgrade_building(b_key: String) -> bool:
	if not EconomyConfig.BUILDINGS.has(b_key):
		return false
	var req_island := int(EconomyConfig.BUILDINGS[b_key].get("island", 1))
	if not bool(unlocked_islands.get(req_island, false)):
		return false
	var cur_lv := int(building_levels.get(b_key, 1))
	var base_c := int(EconomyConfig.BUILDINGS[b_key]["base_cost"])
	var cost := EconomyConfig.calc_upgrade_cost(base_c, cur_lv)
	if not spend_gold(cost):
		return false
	building_levels[b_key] = cur_lv + 1
	_sync_codex_from_progression()
	EventBus.upgrade_purchased.emit("building", b_key, cur_lv + 1)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

## PRD v2.2 Section 3: Recruit-to-Promote Mechanism (`招满转进修机制`):
## - If any unlocked island has room below `ISLAND_RECRUIT_CAPS`, recruits +1 animal worker onto that island.
## - Once all unlocked islands reach Max Cap for `a_key`, upgrades `animal_levels[a_key] += 1` (Team Promotion Lv.+1)!
func upgrade_animal(a_key: String) -> bool:
	if not EconomyConfig.ANIMALS.has(a_key):
		return false
	var next_isl := find_next_recruit_island(a_key)
	var cur_lv := int(animal_levels.get(a_key, 0))
	var total_rec := get_total_recruited(a_key)
	var base_c := int(EconomyConfig.ANIMALS[a_key]["base_cost"])
	var cost_step := total_rec + maxi(1, cur_lv)
	var cost := EconomyConfig.calc_upgrade_cost(base_c, cost_step)
	if not spend_gold(cost):
		return false

	if next_isl > 0:
		island_recruited[next_isl][a_key] = get_island_recruited_count(next_isl, a_key) + 1
		if cur_lv <= 0:
			animal_levels[a_key] = 1
		if SoundManager != null:
			SoundManager.play_upgrade_sfx()
		EventBus.upgrade_purchased.emit("recruit", a_key, get_total_recruited(a_key))
	else:
		animal_levels[a_key] = maxi(1, cur_lv) + 1
		if SoundManager != null:
			if animal_levels[a_key] % 25 == 0:
				SoundManager.play_milestone_sfx()
			else:
				SoundManager.play_upgrade_sfx()
		EventBus.upgrade_purchased.emit("animal", a_key, animal_levels[a_key])

	_sync_codex_from_progression()
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func unlock_island(island_idx: int) -> bool:
	if bool(unlocked_islands.get(island_idx, false)):
		return false
	var exp_key := "island_" + str(island_idx)
	var cost := int(EconomyConfig.EXPANSIONS.get(exp_key, {"cost": 180})["cost"])
	if not spend_gold(cost):
		return false
	unlocked_islands[island_idx] = true
	_sync_codex_from_progression()
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.island_unlocked.emit(island_idx)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func estimate_idle_gold_per_sec() -> float:
	var base_rate := 1.8
	for k in building_levels.keys():
		var req_isl := int(EconomyConfig.BUILDINGS.get(k, {}).get("island", 1))
		if bool(unlocked_islands.get(req_isl, false)):
			base_rate += float(building_levels[k]) * 1.1
	for k in animal_levels.keys():
		base_rate += float(get_total_recruited(k)) * 1.6
	return base_rate * EconomyConfig.calc_shiba_price_bonus(int(animal_levels.get("shiba", 0))) * get_codex_price_multiplier()

func get_backup_save_path() -> String:
	return active_save_path + ".bak"

func _parse_valid_save_dict(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var txt := FileAccess.get_file_as_string(path).strip_edges()
	if txt.length() < 2 or not txt.begins_with("{") or not txt.ends_with("}"):
		return {}
	var parsed = JSON.parse_string(txt)
	if not (parsed is Dictionary):
		return {}
	if int(parsed.get("version", 0)) != SAVE_VERSION:
		return {}
	return parsed

func calculate_and_apply_offline_earnings(elapsed_sec: int) -> Dictionary:
	var clamped_sec := clampi(elapsed_sec, 0, 86400)
	if clamped_sec < 60:
		return {"seconds": clamped_sec, "gold": 0, "items": 0}
	var gold_earned := maxi(8, int(round(float(clamped_sec) * estimate_idle_gold_per_sec() * 0.45)))
	var total_workers := 0
	for k in animal_levels.keys():
		total_workers += get_total_recruited(String(k))
	var ws_lv := int(building_levels.get("mortar", 1)) + int(building_levels.get("cauldron", 1))
	var items_est := maxi(1, int(round(float(clamped_sec) / 10.0 * (float(maxi(1, total_workers)) * 0.6 + float(ws_lv) * 0.2))))
	pending_offline_seconds = clamped_sec
	pending_offline_gold = gold_earned
	last_offline_report = {
		"seconds": clamped_sec,
		"gold": gold_earned,
		"items": items_est
	}
	add_gold(gold_earned)
	EventBus.offline_earnings_ready.emit(clamped_sec, gold_earned)
	return last_offline_report

func save_game() -> void:
	var prev_valid := _parse_valid_save_dict(active_save_path)
	if not prev_valid.is_empty():
		var prev_txt := FileAccess.get_file_as_string(active_save_path)
		var f_bak := FileAccess.open(get_backup_save_path(), FileAccess.WRITE)
		if f_bak != null:
			f_bak.store_string(prev_txt)
			f_bak.close()

	var data := {
		"version": SAVE_VERSION,
		"timestamp": int(Time.get_unix_time_from_system()),
		"gold": gold,
		"total_gold_earned": total_gold_earned,
		"desktop_companion_mode": desktop_companion_mode,
		"unlocked_islands": {
			"1": bool(unlocked_islands.get(1, true)),
			"2": bool(unlocked_islands.get(2, false)),
			"3": bool(unlocked_islands.get(3, false))
		},
		"building_levels": building_levels,
		"animal_levels": animal_levels,
		"island_recruited": {
			"1": island_recruited[1],
			"2": island_recruited[2],
			"3": island_recruited[3]
		},
		"stall_inventory": stall_inventory,
		"unlocked_codex": unlocked_codex,
		"pomodoro_completed_count": pomodoro_completed_count,
		"amber": amber,
		"total_amber_earned": total_amber_earned,
		"active_contract": active_contract,
		"unlocked_landscapes": unlocked_landscapes,
		"unlocked_achievements": unlocked_achievements,
		"career_stats": career_stats
	}
	var json_str := JSON.stringify(data, "\t")
	var f := FileAccess.open(active_save_path, FileAccess.WRITE)
	if f != null:
		f.store_string(json_str)
		f.close()
	if SteamBridge != null and SteamBridge.has_method("cloud_write"):
		SteamBridge.cloud_write("savegame_cloud.json", json_str)
	if not FileAccess.file_exists(get_backup_save_path()):
		var f_init_bak := FileAccess.open(get_backup_save_path(), FileAccess.WRITE)
		if f_init_bak != null:
			f_init_bak.store_string(json_str)
			f_init_bak.close()

func load_game() -> void:
	var parsed := _parse_valid_save_dict(active_save_path)
	if parsed.is_empty():
		parsed = _parse_valid_save_dict(get_backup_save_path())
		if not parsed.is_empty():
			var bak_txt := FileAccess.get_file_as_string(get_backup_save_path())
			var f_repair := FileAccess.open(active_save_path, FileAccess.WRITE)
			if f_repair != null:
				f_repair.store_string(bak_txt)
				f_repair.close()
	if parsed.is_empty():
		return
	gold = int(parsed.get("gold", gold))
	total_gold_earned = int(parsed.get("total_gold_earned", total_gold_earned))
	desktop_companion_mode = bool(parsed.get("desktop_companion_mode", true))
	if parsed.has("unlocked_islands") and parsed["unlocked_islands"] is Dictionary:
		var ui: Dictionary = parsed["unlocked_islands"]
		unlocked_islands[1] = bool(ui.get("1", true))
		unlocked_islands[2] = bool(ui.get("2", false))
		unlocked_islands[3] = bool(ui.get("3", false))
	if parsed.has("building_levels") and parsed["building_levels"] is Dictionary:
		for k in parsed["building_levels"].keys():
			building_levels[String(k)] = int(parsed["building_levels"][k])
	if parsed.has("animal_levels") and parsed["animal_levels"] is Dictionary:
		for k in parsed["animal_levels"].keys():
			animal_levels[String(k)] = int(parsed["animal_levels"][k])
	if parsed.has("island_recruited") and parsed["island_recruited"] is Dictionary:
		var ir: Dictionary = parsed["island_recruited"]
		for isl_str in ["1", "2", "3"]:
			if ir.has(isl_str) and ir[isl_str] is Dictionary:
				var isl_i := int(isl_str)
				for ak in ir[isl_str].keys():
					island_recruited[isl_i][String(ak)] = int(ir[isl_str][ak])
	if parsed.has("stall_inventory") and parsed["stall_inventory"] is Dictionary:
		for k in parsed["stall_inventory"].keys():
			stall_inventory[String(k)] = int(parsed["stall_inventory"][k])
	if parsed.has("unlocked_codex") and parsed["unlocked_codex"] is Dictionary:
		for ck in parsed["unlocked_codex"].keys():
			if unlocked_codex.has(String(ck)):
				unlocked_codex[String(ck)] = bool(parsed["unlocked_codex"][ck])
	pomodoro_completed_count = int(parsed.get("pomodoro_completed_count", 0))
	amber = int(parsed.get("amber", 0))
	total_amber_earned = int(parsed.get("total_amber_earned", amber))
	if parsed.has("active_contract") and parsed["active_contract"] is Dictionary:
		active_contract = parsed["active_contract"]
	else:
		generate_next_contract()
	if parsed.has("unlocked_landscapes") and parsed["unlocked_landscapes"] is Dictionary:
		var ul: Dictionary = parsed["unlocked_landscapes"]
		for lk in unlocked_landscapes.keys():
			unlocked_landscapes[lk] = bool(ul.get(lk, false))
	if parsed.has("unlocked_achievements") and parsed["unlocked_achievements"] is Dictionary:
		for ak in parsed["unlocked_achievements"].keys():
			unlocked_achievements[String(ak)] = bool(parsed["unlocked_achievements"][ak])
	if parsed.has("career_stats") and parsed["career_stats"] is Dictionary:
		for sk in career_stats.keys():
			career_stats[sk] = int(parsed["career_stats"].get(sk, career_stats[sk]))

	var last_ts := int(parsed.get("timestamp", 0))
	var now_ts := int(Time.get_unix_time_from_system())
	var elapsed := clampi(now_ts - last_ts, 0, 86400)
	if elapsed >= 60:
		calculate_and_apply_offline_earnings(elapsed)
