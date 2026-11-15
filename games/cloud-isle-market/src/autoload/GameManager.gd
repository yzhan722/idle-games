extends Node
## Global State, Strict Per-Island Recruit Caps, Recruit-to-Promote & Save System (`src/autoload/GameManager.gd`) — PRD Patch v2.2

const SAVE_PATH := "user://savegame.json"
const SELFTEST_SAVE_PATH := "user://savegame_selftest.json"
const SAVE_VERSION := 24

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
	"tea_pavilion": 1,
	"stall": 1,
	"soil_2": 1,
	"cauldron": 1,
	"greenhouse": 1,
	"soil_3": 1,
	"hotspring": 1,
	"windmill": 1
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

## CI-4: 24 Solar Terms Specialty Dishes (`二十四节气限定美食`), Rare Codex Vouchers & Floating Airship Bulk Orders
const SOLAR_TERM_ROTATE_INTERVAL: float = 36.0
const AIRSHIP_DOCK_DURATION: float = 75.0
const AIRSHIP_VOYAGE_COOLDOWN: float = 28.0

var current_solar_term_idx: int = 3 # Default: 春分 (`solar_dish_spring`)
var solar_term_timer: float = 0.0
var unlocked_solar_dishes: Dictionary = {
	"solar_dish_spring": true,
	"solar_dish_summer": false,
	"solar_dish_autumn": false,
	"solar_dish_winter": false
}
var rare_codex_vouchers: int = 0
var total_vouchers_earned: int = 0
var airship_docked: bool = true
var airship_timer: float = AIRSHIP_DOCK_DURATION
var active_airship_order: Dictionary = {}
var completed_airship_orders: int = 0

## CI-5: Cloud Greenhouse Hybrid Flora Nursery (`云端温室奇花异草培育房`) & Island Souvenir Gift Boxes (`岛屿名物伴手礼礼盒`)
var greenhouse_unlocked: bool = false
var active_greenhouse_flora_id: String = "flora_stardew_lily"
var greenhouse_growth_timer: float = 0.0
var flora_harvest_counts: Dictionary = {
	"flora_stardew_lily": 0,
	"flora_cloud_rose": 0
}
var flora_inventory: Dictionary = {
	"flora_stardew_lily": 0,
	"flora_cloud_rose": 0
}
var unlocked_flora: Dictionary = {
	"flora_stardew_lily": false,
	"flora_cloud_rose": false
}
var souvenir_inventory: Dictionary = {
	"souvenir_box_floral": 0,
	"souvenir_box_royal": 0
}
var unlocked_souvenirs: Dictionary = {
	"souvenir_box_floral": false,
	"souvenir_box_royal": false
}
var collector_reputation_bonus: int = 0
var souvenirs_sold_count: int = 0

## CI-6: Island 3 Cloud-Sea Hot-Spring Inn (`云海温泉旅馆`) & Cute Spirit Bathhouse (`贵宾萌宠疗愈汤屋`)
var hotspring_unlocked: bool = false
var active_hotspring_bath_id: String = "bath_mugwort_warm"
var hotspring_steep_timer: float = 0.0
var hotspring_rejuvenation_timer: float = 0.0
var bath_brew_counts: Dictionary = {
	"bath_mugwort_warm": 0,
	"bath_sakura_mist": 0,
	"bath_star_amber": 0
}
var bath_inventory: Dictionary = {
	"bath_mugwort_warm": 0,
	"bath_sakura_mist": 0,
	"bath_star_amber": 0
}
var unlocked_baths: Dictionary = {
	"bath_mugwort_warm": false,
	"bath_sakura_mist": false,
	"bath_star_amber": false
}
var hotspring_reputation_bonus: int = 0
var hotspring_guests_served: int = 0

## CI-7: Cloud Windmill Bakery (`云端风车烘焙面坊`) & Cloud-Sea Gourmet Parade Float Festival (`云海美食花车巡游节`)
const GOURMET_PARADE_DURATION: float = 38.0
const GOURMET_PARADE_COOLDOWN: float = 68.0
var windmill_unlocked: bool = false
var active_windmill_bread_id: String = "bread_cloud_souffle"
var windmill_bake_timer: float = 0.0
var windmill_aroma_timer: float = 0.0
var parade_festival_timer: float = 0.0
var parade_cooldown_timer: float = 48.0
var bakery_craft_counts: Dictionary = {
	"flour_golden_wheat": 0,
	"bread_cloud_souffle": 0,
	"bread_amber_croissant": 0
}
var bakery_inventory: Dictionary = {
	"flour_golden_wheat": 0,
	"bread_cloud_souffle": 0,
	"bread_amber_croissant": 0
}
var unlocked_bakery_items: Dictionary = {
	"flour_golden_wheat": false,
	"bread_cloud_souffle": false,
	"bread_amber_croissant": false
}
var bakery_reputation_bonus: int = 0
var parade_tourists_served: int = 0

## CI-8: Cloud Tea Pavilion (`云端茗香制茶坊`) & Lotus Pond Moon-Boat Tea Gathering (`月色画舫品茗雅集`)
const MOON_TEA_GATHERING_DURATION: float = 40.0
const MOON_TEA_GATHERING_COOLDOWN: float = 64.0
var tea_pavilion_unlocked: bool = false
var active_tea_recipe_id: String = "tea_cloud_longjing"
var tea_brew_timer: float = 0.0
var tea_aura_timer: float = 0.0
var moon_tea_gathering_timer: float = 0.0
var moon_tea_cooldown_timer: float = 44.0
var tea_craft_counts: Dictionary = {
	"tea_spring_leaves": 0,
	"tea_cloud_longjing": 0,
	"tea_osmanthus_oolong": 0
}
var tea_inventory: Dictionary = {
	"tea_spring_leaves": 0,
	"tea_cloud_longjing": 0,
	"tea_osmanthus_oolong": 0
}
var unlocked_tea_items: Dictionary = {
	"tea_spring_leaves": false,
	"tea_cloud_longjing": false,
	"tea_osmanthus_oolong": false
}
var tea_reputation_bonus: int = 0
var tea_connoisseurs_served: int = 0
var moon_tea_boat_claims: int = 0

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
	if active_airship_order.is_empty():
		generate_next_airship_order()
	_sync_codex_from_progression()
	evaluate_achievements()

func reset_for_playtest_state() -> void:
	gold = 120
	total_gold_earned = 120
	desktop_companion_mode = true
	amber = 0
	total_amber_earned = 0
	active_contract.clear()
	current_solar_term_idx = 3
	solar_term_timer = 0.0
	unlocked_solar_dishes = {
		"solar_dish_spring": true,
		"solar_dish_summer": false,
		"solar_dish_autumn": false,
		"solar_dish_winter": false
	}
	rare_codex_vouchers = 0
	total_vouchers_earned = 0
	airship_docked = true
	airship_timer = AIRSHIP_DOCK_DURATION
	active_airship_order.clear()
	completed_airship_orders = 0
	greenhouse_unlocked = false
	active_greenhouse_flora_id = "flora_stardew_lily"
	greenhouse_growth_timer = 0.0
	flora_harvest_counts = {
		"flora_stardew_lily": 0,
		"flora_cloud_rose": 0
	}
	flora_inventory = {
		"flora_stardew_lily": 0,
		"flora_cloud_rose": 0
	}
	unlocked_flora = {
		"flora_stardew_lily": false,
		"flora_cloud_rose": false
	}
	souvenir_inventory = {
		"souvenir_box_floral": 0,
		"souvenir_box_royal": 0
	}
	unlocked_souvenirs = {
		"souvenir_box_floral": false,
		"souvenir_box_royal": false
	}
	collector_reputation_bonus = 0
	souvenirs_sold_count = 0
	hotspring_unlocked = false
	active_hotspring_bath_id = "bath_mugwort_warm"
	hotspring_steep_timer = 0.0
	hotspring_rejuvenation_timer = 0.0
	bath_brew_counts = {
		"bath_mugwort_warm": 0,
		"bath_sakura_mist": 0,
		"bath_star_amber": 0
	}
	bath_inventory = {
		"bath_mugwort_warm": 0,
		"bath_sakura_mist": 0,
		"bath_star_amber": 0
	}
	unlocked_baths = {
		"bath_mugwort_warm": false,
		"bath_sakura_mist": false,
		"bath_star_amber": false
	}
	hotspring_reputation_bonus = 0
	hotspring_guests_served = 0
	windmill_unlocked = false
	active_windmill_bread_id = "bread_cloud_souffle"
	windmill_bake_timer = 0.0
	windmill_aroma_timer = 0.0
	parade_festival_timer = 0.0
	parade_cooldown_timer = 48.0
	bakery_craft_counts = {
		"flour_golden_wheat": 0,
		"bread_cloud_souffle": 0,
		"bread_amber_croissant": 0
	}
	bakery_inventory = {
		"flour_golden_wheat": 0,
		"bread_cloud_souffle": 0,
		"bread_amber_croissant": 0
	}
	unlocked_bakery_items = {
		"flour_golden_wheat": false,
		"bread_cloud_souffle": false,
		"bread_amber_croissant": false
	}
	bakery_reputation_bonus = 0
	parade_tourists_served = 0
	tea_pavilion_unlocked = false
	active_tea_recipe_id = "tea_cloud_longjing"
	tea_brew_timer = 0.0
	tea_aura_timer = 0.0
	moon_tea_gathering_timer = 0.0
	moon_tea_cooldown_timer = 44.0
	tea_craft_counts = {
		"tea_spring_leaves": 0,
		"tea_cloud_longjing": 0,
		"tea_osmanthus_oolong": 0
	}
	tea_inventory = {
		"tea_spring_leaves": 0,
		"tea_cloud_longjing": 0,
		"tea_osmanthus_oolong": 0
	}
	unlocked_tea_items = {
		"tea_spring_leaves": false,
		"tea_cloud_longjing": false,
		"tea_osmanthus_oolong": false
	}
	tea_reputation_bonus = 0
	tea_connoisseurs_served = 0
	moon_tea_boat_claims = 0
	unlocked_landscapes = {
		"bee_hive": false,
		"wind_chime": false,
		"tiki_torch": false
	}
	generate_next_contract()
	generate_next_airship_order()
	unlocked_islands = {1: true, 2: false, 3: false}
	building_levels = {"soil_1": 1, "mortar": 1, "tea_pavilion": 1, "stall": 1, "soil_2": 1, "cauldron": 1, "greenhouse": 1, "soil_3": 1, "hotspring": 1, "windmill": 1}
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

	solar_term_timer += delta
	if solar_term_timer >= SOLAR_TERM_ROTATE_INTERVAL:
		solar_term_timer = 0.0
		advance_solar_term()

	airship_timer -= delta
	if airship_timer <= 0.0:
		if airship_docked:
			airship_docked = false
			airship_timer = AIRSHIP_VOYAGE_COOLDOWN
			EventBus.airship_state_changed.emit(false, active_airship_order)
		else:
			dock_airship_caravan(false)

	if greenhouse_unlocked and bool(unlocked_islands.get(2, false)):
		_tick_greenhouse_cultivation(delta)

	if hotspring_rejuvenation_timer > 0.0:
		hotspring_rejuvenation_timer = maxf(0.0, hotspring_rejuvenation_timer - delta)
	if hotspring_unlocked and bool(unlocked_islands.get(3, false)):
		_tick_hotspring_steeping(delta)

	if windmill_aroma_timer > 0.0:
		windmill_aroma_timer = maxf(0.0, windmill_aroma_timer - delta)
	if parade_festival_timer > 0.0:
		parade_festival_timer = maxf(0.0, parade_festival_timer - delta)
	if windmill_unlocked and bool(unlocked_islands.get(2, false)):
		_tick_windmill_bakery(delta)
		if parade_festival_timer <= 0.0:
			parade_cooldown_timer -= delta
			if parade_cooldown_timer <= 0.0 and get_total_bread_stock_count() > 0:
				start_gourmet_parade_festival(GOURMET_PARADE_DURATION)

	if tea_aura_timer > 0.0:
		tea_aura_timer = maxf(0.0, tea_aura_timer - delta)
	if moon_tea_gathering_timer > 0.0:
		moon_tea_gathering_timer = maxf(0.0, moon_tea_gathering_timer - delta)
	if tea_pavilion_unlocked and bool(unlocked_islands.get(1, true)):
		_tick_tea_pavilion(delta)
		if moon_tea_gathering_timer <= 0.0:
			moon_tea_cooldown_timer -= delta
			if moon_tea_cooldown_timer <= 0.0 and get_total_brewed_tea_stock_count() > 0:
				start_moon_tea_gathering(MOON_TEA_GATHERING_DURATION)

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
	if is_moon_tea_gathering_active():
		return "★画舫茶会(" + str(int(ceili(moon_tea_gathering_timer))) + "s)"
	if is_gourmet_parade_active():
		return "★花车巡游(" + str(int(ceili(parade_festival_timer))) + "s)"
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
	if EconomyConfig.is_solar_specialty_dish(item_id):
		unlock_solar_dish(item_id)
		return
	if EconomyConfig.is_tea_item(item_id):
		unlock_tea_item(item_id)
		return
	if EconomyConfig.is_bakery_item(item_id):
		unlock_bakery_item(item_id)
		return
	if unlocked_codex.has(item_id) and not bool(unlocked_codex[item_id]):
		unlocked_codex[item_id] = true
		EventBus.codex_unlocked.emit(item_id)

func unlock_solar_dish(dish_id: String) -> void:
	if unlocked_solar_dishes.has(dish_id) and not bool(unlocked_solar_dishes[dish_id]):
		unlocked_solar_dishes[dish_id] = true
		EventBus.codex_unlocked.emit(dish_id)
		evaluate_achievements()

func get_unlocked_solar_dish_count() -> int:
	var cnt := 0
	for k in EconomyConfig.SOLAR_DISH_ORDER:
		if bool(unlocked_solar_dishes.get(k, false)):
			cnt += 1
	return cnt

func set_solar_term(term_idx: int) -> Dictionary:
	current_solar_term_idx = posmod(term_idx, maxi(1, EconomyConfig.SOLAR_TERMS.size()))
	solar_term_timer = 0.0
	var info := get_current_solar_term()
	EventBus.solar_term_changed.emit(current_solar_term_idx, String(info.get("name", "春分")), String(info.get("dish_id", "solar_dish_spring")))
	return info

func advance_solar_term() -> Dictionary:
	return set_solar_term(current_solar_term_idx + 1)

func get_current_solar_term() -> Dictionary:
	return EconomyConfig.get_solar_term_info(current_solar_term_idx)

func get_current_solar_dish_id() -> String:
	return String(get_current_solar_term().get("dish_id", "solar_dish_spring"))

func craft_solar_specialty_dish(workshop_id: String = "mortar", qty: int = 1, direct_to_stall: bool = false) -> String:
	var dish_id := get_current_solar_dish_id()
	unlock_solar_dish(dish_id)
	var make_qty := maxi(1, qty)
	if direct_to_stall:
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + make_qty
		add_to_stall(dish_id, make_qty)
		evaluate_achievements()
	else:
		add_to_workshop_output(workshop_id, dish_id, make_qty)
	return dish_id

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
	var mult := 1.0 + 0.10 * float(get_unlocked_codex_count()) + 0.08 * float(get_unlocked_solar_dish_count()) + 0.08 * float(get_unlocked_flora_count()) + 0.10 * float(get_unlocked_souvenir_count()) + 0.08 * float(get_unlocked_bath_count()) + 0.08 * float(get_unlocked_bakery_count()) + 0.08 * float(get_unlocked_tea_count())
	var s_term := get_current_solar_term()
	if String(s_term.get("buff_type", "")) == "price_bonus":
		mult *= (1.0 + float(s_term.get("buff_val", 0.15)))
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
## CI-4: Rare Codex Vouchers (`稀有图鉴券`) & Floating Airship Bulk Orders (`浮空飞艇远洋商队大订单`)
## ==================================================================
func add_rare_voucher(amount: int) -> void:
	if amount <= 0:
		return
	rare_codex_vouchers += amount
	total_vouchers_earned += amount
	EventBus.rare_voucher_changed.emit(rare_codex_vouchers, amount)

func spend_rare_voucher(cost: int) -> bool:
	if cost <= 0:
		return true
	if rare_codex_vouchers < cost:
		return false
	rare_codex_vouchers -= cost
	EventBus.rare_voucher_changed.emit(rare_codex_vouchers, -cost)
	return true

func get_rare_vouchers() -> int:
	return rare_codex_vouchers

func redeem_rare_voucher_for_codex() -> Dictionary:
	if not spend_rare_voucher(1):
		return {"redeemed": false, "unlocked_dish": "", "bonus_amber": 0, "bonus_gold": 0}
	for dk in EconomyConfig.SOLAR_DISH_ORDER:
		if not bool(unlocked_solar_dishes.get(dk, false)):
			unlock_solar_dish(dk)
			add_to_stall(dk, 1)
			var d_name := EconomyConfig.get_item_display_name(dk)
			EventBus.spawn_floating_text.emit(
				Vector2(1013.4, EconomyConfig.GROUND_Y - 48.0),
				"★图鉴券点亮节气食谱【" + d_name + "】+1份上架!",
				Color("#8CE99A")
			)
			save_game()
			return {"redeemed": true, "unlocked_dish": dk, "bonus_amber": 0, "bonus_gold": 0}
	# All 4 seasonal specialty dishes already unlocked -> collector dividend + 2 seasonal specialty dishes
	var div_amber := 3
	var div_gold := 320
	add_amber(div_amber)
	add_gold(div_gold)
	var cur_sd := get_current_solar_dish_id()
	add_to_stall(cur_sd, 2)
	EventBus.spawn_floating_text.emit(
		Vector2(1013.4, EconomyConfig.GROUND_Y - 48.0),
		"★四时全席礼遇 +" + str(div_amber) + "琥珀 +" + str(div_gold) + "G!",
		Color("#FFE066")
	)
	save_game()
	return {"redeemed": true, "unlocked_dish": cur_sd, "bonus_amber": div_amber, "bonus_gold": div_gold}

func dock_airship_caravan(force_new_order: bool = false) -> Dictionary:
	airship_docked = true
	airship_timer = AIRSHIP_DOCK_DURATION
	if force_new_order or active_airship_order.is_empty():
		generate_next_airship_order()
	EventBus.airship_state_changed.emit(true, active_airship_order)
	return active_airship_order

func generate_next_airship_order() -> Dictionary:
	var prev_idx := int(active_airship_order.get("order_index", 0))
	var next_idx := prev_idx + 1

	var crop_pool: Array[String] = ["crop_0"]
	if bool(unlocked_codex.get("crop_1", false)) or int(building_levels.get("soil_1", 1)) >= 25:
		crop_pool.append("crop_1")
	if bool(unlocked_islands.get(2, false)):
		crop_pool.append("crop_2")
	if bool(unlocked_islands.get(3, false)):
		crop_pool.append("crop_3")

	var del_pool: Array[String] = ["delicacy_0"]
	if bool(unlocked_codex.get("delicacy_1", false)) or int(building_levels.get("mortar", 1)) >= 25:
		del_pool.append("delicacy_1")
	if bool(unlocked_islands.get(2, false)):
		del_pool.append("delicacy_2")
	if bool(unlocked_islands.get(3, false)):
		del_pool.append("delicacy_3")

	var pick_crop := crop_pool[next_idx % crop_pool.size()]
	var pick_del := del_pool[next_idx % del_pool.size()]
	var pick_solar := get_current_solar_dish_id()

	var req_crop := 3 + (next_idx % 3)
	var req_del := 2 + (next_idx % 2)
	var req_solar := 1 + ((next_idx + 1) % 2)

	var combo_items: Array[Dictionary] = [
		{
			"item_id": pick_crop,
			"name": EconomyConfig.get_item_display_name(pick_crop),
			"required": req_crop,
			"delivered": 0
		},
		{
			"item_id": pick_del,
			"name": EconomyConfig.get_item_display_name(pick_del),
			"required": req_del,
			"delivered": 0
		},
		{
			"item_id": pick_solar,
			"name": EconomyConfig.get_item_display_name(pick_solar),
			"required": req_solar,
			"delivered": 0
		}
	]

	var rew_gold := 380 + next_idx * 65
	var rew_amber := 4 + (next_idx % 3)
	var rew_vouchers := 2 if (next_idx % 3 == 0) else 1

	active_airship_order = {
		"id": "airship_bulk_" + str(next_idx),
		"order_index": next_idx,
		"items": combo_items,
		"reward_gold": rew_gold,
		"reward_amber": rew_amber,
		"reward_vouchers": rew_vouchers
	}
	EventBus.airship_state_changed.emit(airship_docked, active_airship_order)
	return active_airship_order

func get_active_airship_order() -> Dictionary:
	if active_airship_order.is_empty():
		generate_next_airship_order()
	return active_airship_order

func get_airship_order_progress_summary() -> Dictionary:
	var ord := get_active_airship_order()
	var items: Array = ord.get("items", [])
	var sum_del := 0
	var sum_req := 0
	var parts: Array[String] = []
	for entry in items:
		if entry is Dictionary:
			var d := int(entry.get("delivered", 0))
			var r := maxi(1, int(entry.get("required", 1)))
			sum_del += mini(d, r)
			sum_req += r
			var nm := String(entry.get("name", ""))
			if nm.length() > 3:
				nm = nm.substr(nm.length() - 2, 2) if nm.begins_with("春分") or nm.begins_with("夏至") or nm.begins_with("秋分") or nm.begins_with("冬至") else nm.substr(0, 3)
			parts.append("%s%d/%d" % [nm, mini(d, r), r])
	return {
		"delivered": sum_del,
		"required": maxi(1, sum_req),
		"brief": "·".join(parts),
		"reward_amber": int(ord.get("reward_amber", 4)),
		"reward_vouchers": int(ord.get("reward_vouchers", 1)),
		"reward_gold": int(ord.get("reward_gold", 445))
	}

func _is_airship_order_ready_to_settle() -> bool:
	if active_airship_order.is_empty():
		return false
	var items: Array = active_airship_order.get("items", [])
	if items.is_empty():
		return false
	for entry in items:
		if entry is Dictionary:
			if int(entry.get("delivered", 0)) < int(entry.get("required", 1)):
				return false
	return true

func deliver_item_to_airship_order(item_id: String, qty: int) -> int:
	if qty <= 0 or not airship_docked:
		return 0
	var ord := get_active_airship_order()
	var items: Array = ord.get("items", [])
	var accepted := 0
	var rem_give := qty
	for entry in items:
		if rem_give <= 0:
			break
		if entry is Dictionary and String(entry.get("item_id", "")) == item_id:
			var cur_d := int(entry.get("delivered", 0))
			var req_d := int(entry.get("required", 1))
			var need := maxi(0, req_d - cur_d)
			if need > 0:
				var take := mini(need, rem_give)
				entry["delivered"] = cur_d + take
				accepted += take
				rem_give -= take
	if accepted > 0:
		EventBus.airship_state_changed.emit(airship_docked, active_airship_order)
		if _is_airship_order_ready_to_settle():
			complete_airship_bulk_order()
	return accepted

func _pull_item_from_island_buffers(item_id: String, max_needed: int) -> int:
	if max_needed <= 0:
		return 0
	var rem := max_needed
	var pulled := 0
	var st_avail := int(stall_inventory.get(item_id, 0))
	if st_avail > 0:
		var t := mini(st_avail, rem)
		stall_inventory[item_id] = st_avail - t
		rem -= t
		pulled += t
	if rem > 0:
		for wid in ["mortar", "cauldron", "orbis_linked"]:
			if rem <= 0:
				break
			if workshop_outputs.has(wid):
				var w_avail := int(workshop_outputs[wid].get(item_id, 0))
				if w_avail > 0:
					var t := mini(w_avail, rem)
					workshop_outputs[wid][item_id] = w_avail - t
					rem -= t
					pulled += t
	if rem > 0:
		for isl in [1, 2, 3]:
			if rem <= 0:
				break
			if raw_baskets.has(isl):
				var b_avail := int(raw_baskets[isl].get(item_id, 0))
				if b_avail > 0:
					var t := mini(b_avail, rem)
					raw_baskets[isl][item_id] = b_avail - t
					rem -= t
					pulled += t
	if pulled > 0:
		EventBus.inventory_changed.emit()
	return pulled

func fulfill_airship_bulk_order_from_stock() -> Dictionary:
	if not airship_docked:
		return {"loaded": 0, "completed": false, "reward_amber": 0, "reward_vouchers": 0, "reward_gold": 0}
	var ord := get_active_airship_order()
	var prev_completed_cnt := completed_airship_orders
	var rew_amb := int(ord.get("reward_amber", 4))
	var rew_vch := int(ord.get("reward_vouchers", 1))
	var rew_gld := int(ord.get("reward_gold", 445))
	var items: Array = ord.get("items", [])
	var total_loaded := 0
	for entry in items:
		if entry is Dictionary:
			var iid := String(entry.get("item_id", ""))
			var cur_d := int(entry.get("delivered", 0))
			var req_d := int(entry.get("required", 1))
			var need := maxi(0, req_d - cur_d)
			if need > 0:
				var got := _pull_item_from_island_buffers(iid, need)
				if got > 0:
					entry["delivered"] = cur_d + got
					total_loaded += got
	var did_complete := false
	if _is_airship_order_ready_to_settle():
		complete_airship_bulk_order()
		did_complete = (completed_airship_orders > prev_completed_cnt)
	elif total_loaded > 0:
		EventBus.airship_state_changed.emit(airship_docked, active_airship_order)
	return {
		"loaded": total_loaded,
		"completed": did_complete,
		"reward_amber": rew_amb if did_complete else 0,
		"reward_vouchers": rew_vch if did_complete else 0,
		"reward_gold": rew_gld if did_complete else 0
	}

func complete_airship_bulk_order() -> Dictionary:
	if active_airship_order.is_empty():
		return {}
	var completed := active_airship_order.duplicate(true)
	completed_airship_orders += 1
	career_stats["contracts"] = int(career_stats.get("contracts", 0)) + 1
	var rew_gold := int(completed.get("reward_gold", 445))
	var rew_amber := int(completed.get("reward_amber", 4))
	var rew_vouchers := int(completed.get("reward_vouchers", 1))
	add_gold(rew_gold)
	add_amber(rew_amber)
	add_rare_voucher(rew_vouchers)
	trigger_carnival_frenzy(18.0)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.airship_bulk_order_completed.emit(completed)
	EventBus.spawn_floating_text.emit(
		Vector2(1320.0, 56.0),
		"★远洋大订单达成! +" + str(rew_gold) + "G +" + str(rew_amber) + "琥珀 +" + str(rew_vouchers) + "图鉴券!",
		Color("#FFE066")
	)
	generate_next_airship_order()
	evaluate_achievements()
	save_game()
	return completed

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
	if greenhouse_unlocked and bool(unlocked_flora.get("flora_stardew_lily", false)):
		mult *= (1.18 if active_greenhouse_flora_id == "flora_stardew_lily" else 1.10)
	var s_term := get_current_solar_term()
	if String(s_term.get("buff_type", "")) == "crop_growth":
		mult *= (1.0 + float(s_term.get("buff_val", 0.15)))
	return mult

func get_workshop_speed_multiplier(island: int = 2) -> float:
	var mult := 1.0
	if island == 2 and bool(unlocked_landscapes.get("wind_chime", false)):
		mult *= 1.20
	if greenhouse_unlocked and bool(unlocked_flora.get("flora_cloud_rose", false)):
		mult *= (1.20 if active_greenhouse_flora_id == "flora_cloud_rose" else 1.10)
	mult *= get_bakery_aura_speed_multiplier()
	var s_term := get_current_solar_term()
	if String(s_term.get("buff_type", "")) == "workshop_speed":
		mult *= (1.0 + float(s_term.get("buff_val", 0.15)))
	return mult

func get_customer_tip_multiplier(is_vip: bool, island: int = 3) -> float:
	var mult := EconomyConfig.VIP_TIP_MULTIPLIER if is_vip else 1.0
	if bool(unlocked_landscapes.get("tiki_torch", false)):
		mult *= 1.20
	if greenhouse_unlocked and active_greenhouse_flora_id == "flora_cloud_rose" and bool(unlocked_flora.get("flora_cloud_rose", false)):
		mult *= 1.15
	if hotspring_unlocked and bool(unlocked_islands.get(3, false)):
		var hs_cfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
		mult *= (1.0 + float(hs_cfg.get("tip_aura_bonus", 0.08)))
	mult *= get_tea_aura_tip_multiplier()
	var shiba_lv := int(animal_levels.get("shiba", 0))
	if shiba_lv >= 10:
		mult *= (1.0 + EconomyConfig.calc_shiba_tip_trait_bonus(shiba_lv))
	var s_term := get_current_solar_term()
	if String(s_term.get("buff_type", "")) == "tip_bonus":
		mult *= (1.0 + float(s_term.get("buff_val", 0.15)))
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
	for dk in ["solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
		if int(stall_inventory.get(dk, 0)) > 0:
			return true
		for wid in ["orbis_linked", "cauldron", "mortar"]:
			if workshop_outputs.has(wid) and int(workshop_outputs[wid].get(dk, 0)) > 0:
				return true
	return get_total_stall_count() > 0

func try_critic_taste_delicacy(preferred_id: String, qty: int, world_pos: Vector2) -> int:
	var target_del := ""
	if (preferred_id.begins_with("delicacy_") or EconomyConfig.is_solar_specialty_dish(preferred_id)) and int(stall_inventory.get(preferred_id, 0)) > 0:
		target_del = preferred_id
	else:
		for dk in ["solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
			if int(stall_inventory.get(dk, 0)) > 0:
				target_del = dk
				break
	if target_del == "":
		for wid in ["orbis_linked", "cauldron", "mortar"]:
			if not workshop_outputs.has(wid):
				continue
			for dk in ["solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"]:
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
## CI-5: Cloud Greenhouse Hybrid Flora Nursery & Island Souvenir Gift Boxes
## ==================================================================
func unlock_greenhouse(free_for_test: bool = false) -> bool:
	if greenhouse_unlocked:
		return false
	if free_for_test:
		unlocked_islands[2] = true
	if not bool(unlocked_islands.get(2, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.GREENHOUSE_UNLOCK_COST_GOLD):
		return false
	greenhouse_unlocked = true
	active_greenhouse_flora_id = "flora_stardew_lily"
	greenhouse_growth_timer = 0.0
	unlock_hybrid_flora("flora_stardew_lily")
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.greenhouse_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(438.0, EconomyConfig.GROUND_Y - 58.0),
		"★云端温室培育房启用！开始培育【星露铃兰】!",
		Color("#8CE99A")
	)
	evaluate_achievements()
	save_game()
	return true

func unlock_hybrid_flora(flora_id: String) -> bool:
	if not EconomyConfig.HYBRID_FLORA.has(flora_id):
		return false
	if bool(unlocked_flora.get(flora_id, false)):
		return false
	unlocked_flora[flora_id] = true
	EventBus.codex_unlocked.emit(flora_id)
	evaluate_achievements()
	return true

func unlock_souvenir_box(box_id: String) -> bool:
	if not EconomyConfig.SOUVENIR_BOXES.has(box_id):
		return false
	if bool(unlocked_souvenirs.get(box_id, false)):
		return false
	unlocked_souvenirs[box_id] = true
	EventBus.codex_unlocked.emit(box_id)
	evaluate_achievements()
	return true

func get_unlocked_flora_count() -> int:
	var cnt := 0
	for fid in EconomyConfig.HYBRID_FLORA_ORDER:
		if bool(unlocked_flora.get(fid, false)):
			cnt += 1
	return cnt

func get_unlocked_souvenir_count() -> int:
	var cnt := 0
	for bid in EconomyConfig.SOUVENIR_BOX_ORDER:
		if bool(unlocked_souvenirs.get(bid, false)):
			cnt += 1
	return cnt

func get_total_flora_count() -> int:
	var s := 0
	for fid in EconomyConfig.HYBRID_FLORA_ORDER:
		s += maxi(0, int(flora_inventory.get(fid, 0)))
	return s

func get_total_souvenir_box_count() -> int:
	var s := 0
	for bid in EconomyConfig.SOUVENIR_BOX_ORDER:
		s += maxi(0, int(souvenir_inventory.get(bid, 0)))
	return s

func get_greenhouse_growth_ratio() -> float:
	if not greenhouse_unlocked:
		return 0.0
	var fcfg: Dictionary = EconomyConfig.HYBRID_FLORA.get(active_greenhouse_flora_id, EconomyConfig.HYBRID_FLORA["flora_stardew_lily"])
	var req := maxf(2.0, float(fcfg.get("grow_time", 9.0)))
	return clampf(greenhouse_growth_timer / req, 0.0, 1.0)

func cycle_greenhouse_flora() -> String:
	var unlocked_list: Array[String] = []
	for fid in EconomyConfig.HYBRID_FLORA_ORDER:
		if bool(unlocked_flora.get(fid, false)):
			unlocked_list.append(fid)
	if unlocked_list.is_empty():
		unlocked_list.append("flora_stardew_lily")
	var cur_i := unlocked_list.find(active_greenhouse_flora_id)
	active_greenhouse_flora_id = unlocked_list[(cur_i + 1) % unlocked_list.size()]
	greenhouse_growth_timer = 0.0
	return active_greenhouse_flora_id

func _tick_greenhouse_cultivation(delta: float) -> void:
	var fcfg: Dictionary = EconomyConfig.HYBRID_FLORA.get(active_greenhouse_flora_id, EconomyConfig.HYBRID_FLORA["flora_stardew_lily"])
	var grow_req := maxf(2.0, float(fcfg.get("grow_time", 9.0)))
	var lv := maxi(1, int(building_levels.get("greenhouse", 1)))
	var spd := get_crop_growth_multiplier(2) * (1.0 + 0.06 * float(lv - 1))
	greenhouse_growth_timer += delta * spd
	var safety := 0
	while greenhouse_growth_timer >= grow_req and safety < 8:
		greenhouse_growth_timer -= grow_req
		harvest_greenhouse_flora()
		fcfg = EconomyConfig.HYBRID_FLORA.get(active_greenhouse_flora_id, EconomyConfig.HYBRID_FLORA["flora_stardew_lily"])
		grow_req = maxf(2.0, float(fcfg.get("grow_time", 9.0)))
		safety += 1

func harvest_greenhouse_flora() -> Dictionary:
	var fid := active_greenhouse_flora_id
	if not EconomyConfig.HYBRID_FLORA.has(fid):
		fid = "flora_stardew_lily"
		active_greenhouse_flora_id = fid
	unlock_hybrid_flora(fid)
	var lv := maxi(1, int(building_levels.get("greenhouse", 1)))
	var yield_qty := 1 + int(floor(float(lv) / 15.0))
	var cap := maxi(12, EconomyConfig.calc_buffer_capacity(lv))
	var cur_stock := int(flora_inventory.get(fid, 0))
	var added := maxi(0, mini(yield_qty, cap - cur_stock))
	if added > 0:
		flora_inventory[fid] = cur_stock + added
		career_stats["harvests"] = int(career_stats.get("harvests", 0)) + added
	flora_harvest_counts[fid] = int(flora_harvest_counts.get(fid, 0)) + 1

	var crossbred_id := ""
	for cand_id in EconomyConfig.HYBRID_FLORA_ORDER:
		if not bool(unlocked_flora.get(cand_id, false)):
			var ccfg: Dictionary = EconomyConfig.HYBRID_FLORA[cand_id]
			var parent_id := String(ccfg.get("crossbreed_from", ccfg.get("parent_flora", "")))
			var req_h := maxi(1, int(ccfg.get("crossbreed_harvests", 2)))
			if parent_id == fid and int(flora_harvest_counts.get(parent_id, 0)) >= req_h:
				unlock_hybrid_flora(cand_id)
				crossbred_id = cand_id
				active_greenhouse_flora_id = cand_id
				EventBus.hybrid_flora_crossbred.emit(cand_id)
				EventBus.spawn_floating_text.emit(
					Vector2(438.0, EconomyConfig.GROUND_Y - 58.0),
					"★奇花杂交突破！培育出【" + EconomyConfig.get_item_display_name(cand_id) + "】!",
					Color("#FFE066")
				)
				break

	if crossbred_id == "" and bool(unlocked_flora.get("flora_cloud_rose", false)):
		var lily_n := int(flora_inventory.get("flora_stardew_lily", 0))
		var rose_n := int(flora_inventory.get("flora_cloud_rose", 0))
		if fid == "flora_stardew_lily" and lily_n >= rose_n + 2:
			active_greenhouse_flora_id = "flora_cloud_rose"
		elif fid == "flora_cloud_rose" and rose_n >= lily_n + 2:
			active_greenhouse_flora_id = "flora_stardew_lily"

	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.hybrid_flora_harvested.emit(fid, maxi(1, added))
	try_auto_bundle_souvenir_box()
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {"flora_id": fid, "added": added, "crossbred_id": crossbred_id}

func _count_total_available_dishes() -> int:
	var sum_d := 0
	for wid in ["mortar", "cauldron", "orbis_linked"]:
		if workshop_outputs.has(wid):
			for dk in workshop_outputs[wid].keys():
				sum_d += maxi(0, int(workshop_outputs[wid][dk]))
	for sk in stall_inventory.keys():
		var s_key := String(sk)
		if s_key.begins_with("delicacy_") or EconomyConfig.is_solar_specialty_dish(s_key):
			sum_d += maxi(0, int(stall_inventory[sk]))
	return sum_d

func try_auto_bundle_souvenir_box() -> Dictionary:
	if get_total_souvenir_box_count() >= 8:
		return {"bundled": false}
	if _count_total_available_dishes() < 2:
		return {"bundled": false}
	return bundle_souvenir_gift_box("", false)

func bundle_souvenir_gift_box(preferred_box_id: String = "", allow_last_dish: bool = true) -> Dictionary:
	var box_candidates: Array[String] = []
	if preferred_box_id != "" and EconomyConfig.SOUVENIR_BOXES.has(preferred_box_id):
		box_candidates.append(preferred_box_id)
	else:
		box_candidates.append("souvenir_box_royal")
		box_candidates.append("souvenir_box_floral")

	for box_id in box_candidates:
		var bcfg: Dictionary = EconomyConfig.SOUVENIR_BOXES[box_id]
		var flora_cands: Array = bcfg.get("flora_candidates", ["flora_stardew_lily"])
		var req_flora := ""
		for fc in flora_cands:
			var f_id := String(fc)
			var min_req_f := 1 if allow_last_dish else 2
			if int(flora_inventory.get(f_id, 0)) >= min_req_f:
				if box_id == "souvenir_box_royal" and f_id != "flora_cloud_rose" and not allow_last_dish:
					continue
				req_flora = f_id
				break
		if req_flora == "":
			continue
		var dish_cands: Array = bcfg.get("dish_candidates", ["delicacy_0"])
		var picked_wid := ""
		var picked_dish := ""
		for dc in dish_cands:
			var d_id := String(dc)
			for wid in ["orbis_linked", "cauldron", "mortar"]:
				if workshop_outputs.has(wid) and int(workshop_outputs[wid].get(d_id, 0)) > 0:
					picked_wid = wid
					picked_dish = d_id
					break
			if picked_dish != "":
				break
		if picked_dish == "":
			if allow_last_dish or get_total_stall_count() > 2:
				for dc in dish_cands:
					var d_id := String(dc)
					if int(stall_inventory.get(d_id, 0)) > 0:
						picked_wid = "stall"
						picked_dish = d_id
						break
		if picked_dish == "":
			continue

		flora_inventory[req_flora] = maxi(0, int(flora_inventory.get(req_flora, 0)) - 1)
		if picked_wid == "stall":
			stall_inventory[picked_dish] = maxi(0, int(stall_inventory.get(picked_dish, 0)) - 1)
		else:
			workshop_outputs[picked_wid][picked_dish] = maxi(0, int(workshop_outputs[picked_wid].get(picked_dish, 0)) - 1)

		souvenir_inventory[box_id] = int(souvenir_inventory.get(box_id, 0)) + 1
		unlock_souvenir_box(box_id)
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + 1
		evaluate_achievements()
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.souvenir_box_bundled.emit(box_id, int(souvenir_inventory[box_id]))
		EventBus.inventory_changed.emit()
		return {
			"bundled": true,
			"box_id": box_id,
			"flora_id": req_flora,
			"dish_id": picked_dish,
			"stock": int(souvenir_inventory[box_id])
		}
	return {"bundled": false, "box_id": "", "stock": get_total_souvenir_box_count()}

func has_souvenir_box_for_collector() -> bool:
	return get_total_souvenir_box_count() > 0

func try_collector_purchase_souvenir(preferred_box_id: String, qty: int, world_pos: Vector2) -> Dictionary:
	var target_box := ""
	if EconomyConfig.is_souvenir_box(preferred_box_id) and int(souvenir_inventory.get(preferred_box_id, 0)) > 0:
		target_box = preferred_box_id
	else:
		for bid in ["souvenir_box_royal", "souvenir_box_floral"]:
			if int(souvenir_inventory.get(bid, 0)) > 0:
				target_box = bid
				break
	if target_box == "":
		var auto_b := bundle_souvenir_gift_box(preferred_box_id, true)
		if bool(auto_b.get("bundled", false)):
			target_box = String(auto_b.get("box_id", ""))
	if target_box == "" or int(souvenir_inventory.get(target_box, 0)) <= 0:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "box_id": ""}

	var avail := int(souvenir_inventory.get(target_box, 0))
	var bought := mini(avail, maxi(1, qty))
	souvenir_inventory[target_box] = avail - bought
	unlock_souvenir_box(target_box)

	var bcfg: Dictionary = EconomyConfig.SOUVENIR_BOXES[target_box]
	var gh_lv := maxi(1, int(building_levels.get("greenhouse", 1)))
	var st_lv := maxi(1, int(building_levels.get("stall", 1)))
	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var base_unit := EconomyConfig.calc_item_unit_price(target_box, gh_lv, st_lv, shiba_lv, current_solar_term_idx)
	var collector_mult := float(bcfg.get("collector_mult", 1.55))
	var total_gold := maxi(1, int(round(float(base_unit * bought) * collector_mult * get_codex_price_multiplier() * get_customer_tip_multiplier(true, 3))))
	var amber_gain := maxi(1, int(bcfg.get("amber_bonus", 2)) * bought)
	var voucher_gain := maxi(0, int(bcfg.get("voucher_bonus", 0)) * bought)
	var rep_gain := maxi(10, int(bcfg.get("rep_bonus", 35)) * bought)

	collector_reputation_bonus += rep_gain
	souvenirs_sold_count += bought
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_gold)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_box, bought, total_gold, world_pos)
	EventBus.souvenir_box_sold.emit(target_box, bought, total_gold, amber_gain, rep_gain)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return {
		"bought": bought,
		"gold": total_gold,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"box_id": target_box
	}


## ==================================================================
## CI-6: Island 3 Cloud-Sea Hot-Spring Inn & VIP Cute Spirit Bathhouse
## ==================================================================
func unlock_hotspring_inn(free_for_test: bool = false) -> bool:
	if hotspring_unlocked:
		return false
	if free_for_test:
		unlocked_islands[3] = true
	if not bool(unlocked_islands.get(3, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.HOTSPRING_UNLOCK_COST_GOLD):
		return false
	hotspring_unlocked = true
	active_hotspring_bath_id = "bath_mugwort_warm"
	hotspring_steep_timer = 0.0
	hotspring_rejuvenation_timer = 36.0
	unlock_hotspring_bath("bath_mugwort_warm")
	bath_inventory["bath_mugwort_warm"] = maxi(1, int(bath_inventory.get("bath_mugwort_warm", 0)))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.hotspring_unlocked_changed.emit(true)
	EventBus.worker_stamina_rejuvenated.emit(get_worker_hotspring_move_multiplier(), get_worker_hotspring_work_multiplier())
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(1714.7, EconomyConfig.GROUND_Y - 62.0),
		"★云海温泉汤屋开汤！熬制【艾草暖身汤】恢复全员精力!",
		Color("#FFE066")
	)
	evaluate_achievements()
	save_game()
	return true

func unlock_hotspring_bath(bath_id: String) -> bool:
	if not EconomyConfig.HOTSPRING_BATH_BLENDS.has(bath_id):
		return false
	if bool(unlocked_baths.get(bath_id, false)):
		return false
	unlocked_baths[bath_id] = true
	EventBus.hotspring_recipe_unlocked.emit(bath_id)
	EventBus.codex_unlocked.emit(bath_id)
	evaluate_achievements()
	return true

func get_unlocked_bath_count() -> int:
	var cnt := 0
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		if bool(unlocked_baths.get(bid, false)):
			cnt += 1
	return cnt

func get_total_bath_stock_count() -> int:
	var s := 0
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		s += maxi(0, int(bath_inventory.get(bid, 0)))
	return s

func get_hotspring_steep_ratio() -> float:
	if not hotspring_unlocked:
		return 0.0
	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
	var req := maxf(2.0, float(bcfg.get("steep_time", 8.0)))
	return clampf(hotspring_steep_timer / req, 0.0, 1.0)

func cycle_hotspring_bath() -> String:
	var unlocked_list: Array[String] = []
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		if bool(unlocked_baths.get(bid, false)):
			unlocked_list.append(bid)
	if unlocked_list.is_empty():
		unlocked_list.append("bath_mugwort_warm")
	var cur_i := unlocked_list.find(active_hotspring_bath_id)
	active_hotspring_bath_id = unlocked_list[(cur_i + 1) % unlocked_list.size()]
	hotspring_steep_timer = 0.0
	EventBus.worker_stamina_rejuvenated.emit(get_worker_hotspring_move_multiplier(), get_worker_hotspring_work_multiplier())
	return active_hotspring_bath_id

func _check_hotspring_recipe_progression(brewed_id: String) -> String:
	var newly_unlocked := ""
	for cand_id in EconomyConfig.HOTSPRING_BATH_ORDER:
		if not bool(unlocked_baths.get(cand_id, false)):
			var ccfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS[cand_id]
			var parent_id := String(ccfg.get("unlock_from", ""))
			var req_b := maxi(1, int(ccfg.get("unlock_brews_req", 2)))
			if parent_id == brewed_id and int(bath_brew_counts.get(parent_id, 0)) >= req_b:
				unlock_hotspring_bath(cand_id)
				newly_unlocked = cand_id
				active_hotspring_bath_id = cand_id
				EventBus.spawn_floating_text.emit(
					Vector2(1714.7, EconomyConfig.GROUND_Y - 62.0),
					"★灵泉秘方突破！调配出【" + EconomyConfig.get_item_display_name(cand_id) + "】!",
					Color("#FFE066")
				)
				break
	return newly_unlocked

func _tick_hotspring_steeping(delta: float) -> void:
	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
	var steep_req := maxf(2.0, float(bcfg.get("steep_time", 8.0)))
	var lv := maxi(1, int(building_levels.get("hotspring", 1)))
	var spd := get_crop_growth_multiplier(3) * (1.0 + 0.07 * float(lv - 1))
	hotspring_steep_timer += delta * spd
	var safety := 0
	while hotspring_steep_timer >= steep_req and safety < 8:
		hotspring_steep_timer -= steep_req
		steep_hotspring_bath()
		bcfg = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
		steep_req = maxf(2.0, float(bcfg.get("steep_time", 8.0)))
		safety += 1

func steep_hotspring_bath() -> Dictionary:
	var bid := active_hotspring_bath_id
	if not EconomyConfig.HOTSPRING_BATH_BLENDS.has(bid):
		bid = "bath_mugwort_warm"
		active_hotspring_bath_id = bid
	unlock_hotspring_bath(bid)
	var lv := maxi(1, int(building_levels.get("hotspring", 1)))
	var yield_qty := 1 + int(floor(float(lv) / 15.0))
	var cap := maxi(12, EconomyConfig.calc_buffer_capacity(lv))
	var cur_stock := int(bath_inventory.get(bid, 0))
	var added := maxi(0, mini(yield_qty, cap - cur_stock))
	if added > 0:
		bath_inventory[bid] = cur_stock + added
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	bath_brew_counts[bid] = int(bath_brew_counts.get(bid, 0)) + 1
	hotspring_rejuvenation_timer = maxf(hotspring_rejuvenation_timer, 26.0)
	var unlocked_next := _check_hotspring_recipe_progression(bid)
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.hotspring_bath_brewed.emit(bid, maxi(1, added))
	EventBus.worker_stamina_rejuvenated.emit(get_worker_hotspring_move_multiplier(), get_worker_hotspring_work_multiplier())
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {"bath_id": bid, "added": added, "unlocked_next": unlocked_next}

func _take_crop_for_bath(crop_cands: Array) -> String:
	for cc in crop_cands:
		var cid := String(cc)
		for isl in [3, 2, 1]:
			if raw_baskets.has(isl) and int(raw_baskets[isl].get(cid, 0)) > 0:
				raw_baskets[isl][cid] = int(raw_baskets[isl][cid]) - 1
				return cid
	for cc in crop_cands:
		var cid := String(cc)
		if int(stall_inventory.get(cid, 0)) > 0:
			stall_inventory[cid] = int(stall_inventory[cid]) - 1
			return cid
	return ""

func _has_ingredients_for_bath(bath_id: String, allow_steep_fallback: bool = false) -> bool:
	if not EconomyConfig.HOTSPRING_BATH_BLENDS.has(bath_id):
		return false
	if allow_steep_fallback:
		return true
	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS[bath_id]
	var crop_cands: Array = bcfg.get("crop_candidates", ["crop_0"])
	var avail_crops := 0
	for cc in crop_cands:
		var cid := String(cc)
		for isl in [3, 2, 1]:
			if raw_baskets.has(isl):
				avail_crops += maxi(0, int(raw_baskets[isl].get(cid, 0)))
		avail_crops += maxi(0, int(stall_inventory.get(cid, 0)))
	if avail_crops <= 0:
		return false
	var flora_cands: Array = bcfg.get("flora_candidates", [])
	if flora_cands.is_empty():
		return true
	for fc in flora_cands:
		if int(flora_inventory.get(String(fc), 0)) > 0:
			return true
	return bool(unlocked_baths.get(bath_id, false)) and avail_crops >= 2

func brew_hotspring_bath(preferred_bath_id: String = "", allow_steep_fallback: bool = false) -> Dictionary:
	if not hotspring_unlocked:
		return {"brewed": false, "bath_id": "", "stock": get_total_bath_stock_count()}
	var cands: Array[String] = []
	if preferred_bath_id != "" and EconomyConfig.HOTSPRING_BATH_BLENDS.has(preferred_bath_id):
		cands.append(preferred_bath_id)
	else:
		for bid in ["bath_star_amber", "bath_sakura_mist", "bath_mugwort_warm"]:
			if bool(unlocked_baths.get(bid, false)) or bid == "bath_mugwort_warm":
				cands.append(bid)
	for bath_id in cands:
		if not _has_ingredients_for_bath(bath_id, allow_steep_fallback):
			continue
		var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS[bath_id]
		var crop_cands: Array = bcfg.get("crop_candidates", ["crop_0"])
		var flora_cands: Array = bcfg.get("flora_candidates", [])
		var used_crop := _take_crop_for_bath(crop_cands)
		var used_flora := ""
		if not flora_cands.is_empty():
			for fc in flora_cands:
				var fid := String(fc)
				if int(flora_inventory.get(fid, 0)) > 0:
					flora_inventory[fid] = int(flora_inventory[fid]) - 1
					used_flora = fid
					break
			if used_flora == "" and not allow_steep_fallback:
				_take_crop_for_bath(crop_cands)
		if used_crop == "" and not allow_steep_fallback:
			continue
		bath_inventory[bath_id] = int(bath_inventory.get(bath_id, 0)) + 1
		bath_brew_counts[bath_id] = int(bath_brew_counts.get(bath_id, 0)) + 1
		unlock_hotspring_bath(bath_id)
		active_hotspring_bath_id = bath_id
		hotspring_rejuvenation_timer = maxf(hotspring_rejuvenation_timer, 36.0)
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + 1
		var unlocked_next := _check_hotspring_recipe_progression(bath_id)
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.hotspring_bath_brewed.emit(bath_id, int(bath_inventory[bath_id]))
		EventBus.worker_stamina_rejuvenated.emit(get_worker_hotspring_move_multiplier(), get_worker_hotspring_work_multiplier())
		evaluate_achievements()
		EventBus.inventory_changed.emit()
		return {
			"brewed": true,
			"bath_id": bath_id,
			"crop_id": used_crop,
			"flora_id": used_flora,
			"stock": int(bath_inventory[bath_id]),
			"unlocked_next": unlocked_next
		}
	return {"brewed": false, "bath_id": "", "stock": get_total_bath_stock_count()}

func get_worker_hotspring_move_multiplier() -> float:
	if not hotspring_unlocked or not bool(unlocked_islands.get(3, false)):
		return 1.0
	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
	var lv := maxi(1, int(building_levels.get("hotspring", 1)))
	var mult := 1.0 + float(bcfg.get("worker_move_bonus", 0.16)) + minf(0.12, 0.01 * float(lv - 1))
	if hotspring_rejuvenation_timer > 0.0:
		mult *= 1.08
	return mult

func get_worker_hotspring_work_multiplier() -> float:
	if not hotspring_unlocked or not bool(unlocked_islands.get(3, false)):
		return 1.0
	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS.get(active_hotspring_bath_id, EconomyConfig.HOTSPRING_BATH_BLENDS["bath_mugwort_warm"])
	var lv := maxi(1, int(building_levels.get("hotspring", 1)))
	var mult := 1.0 + float(bcfg.get("worker_work_bonus", 0.16)) + minf(0.12, 0.01 * float(lv - 1))
	if hotspring_rejuvenation_timer > 0.0:
		mult *= 1.08
	return mult

func has_bath_for_vip_guest() -> bool:
	if not hotspring_unlocked or not bool(unlocked_islands.get(3, false)):
		return false
	if get_total_bath_stock_count() > 0:
		return true
	for bid in EconomyConfig.HOTSPRING_BATH_ORDER:
		if (bool(unlocked_baths.get(bid, false)) or bid == "bath_mugwort_warm") and _has_ingredients_for_bath(bid, false):
			return true
	return false

func try_vip_hotspring_guest_checkout(preferred_bath_id: String, qty: int, world_pos: Vector2) -> Dictionary:
	if not hotspring_unlocked:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "bath_id": ""}
	var target_bath := ""
	if EconomyConfig.is_hotspring_bath(preferred_bath_id) and int(bath_inventory.get(preferred_bath_id, 0)) > 0:
		target_bath = preferred_bath_id
	else:
		for bid in ["bath_star_amber", "bath_sakura_mist", "bath_mugwort_warm"]:
			if int(bath_inventory.get(bid, 0)) > 0:
				target_bath = bid
				break
	if target_bath == "":
		var auto_brew := brew_hotspring_bath(preferred_bath_id, false)
		if bool(auto_brew.get("brewed", false)):
			target_bath = String(auto_brew.get("bath_id", ""))
	if target_bath == "" or int(bath_inventory.get(target_bath, 0)) <= 0:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "bath_id": ""}

	var avail := int(bath_inventory.get(target_bath, 0))
	var bought := mini(avail, maxi(1, qty))
	bath_inventory[target_bath] = avail - bought
	unlock_hotspring_bath(target_bath)

	var bcfg: Dictionary = EconomyConfig.HOTSPRING_BATH_BLENDS[target_bath]
	var hs_lv := maxi(1, int(building_levels.get("hotspring", 1)))
	var st_lv := maxi(1, int(building_levels.get("stall", 1)))
	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var base_unit := EconomyConfig.calc_item_unit_price(target_bath, hs_lv, st_lv, shiba_lv, current_solar_term_idx)
	var vip_tip_mult := float(bcfg.get("vip_tip_mult", 1.70))
	var total_gold := maxi(1, int(round(float(base_unit * bought) * vip_tip_mult * get_codex_price_multiplier() * get_customer_tip_multiplier(true, 3))))
	var amber_gain := maxi(1, int(bcfg.get("amber_bonus", 2)) * bought)
	var voucher_gain := maxi(0, int(bcfg.get("voucher_bonus", 0)) * bought)
	var rep_gain := maxi(15, int(bcfg.get("rep_bonus", 40)) * bought)

	hotspring_reputation_bonus += rep_gain
	hotspring_guests_served += bought
	hotspring_rejuvenation_timer = maxf(hotspring_rejuvenation_timer, 36.0)
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_gold)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_bath, bought, total_gold, world_pos)
	EventBus.hotspring_vip_settled.emit(target_bath, bought, total_gold, amber_gain, voucher_gain, rep_gain)
	EventBus.worker_stamina_rejuvenated.emit(get_worker_hotspring_move_multiplier(), get_worker_hotspring_work_multiplier())
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return {
		"bought": bought,
		"gold": total_gold,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"bath_id": target_bath
	}


## ==================================================================
## CI-7: Cloud Windmill Bakery (`云端风车烘焙面坊`) & Gourmet Parade Float Festival (`云海美食花车巡游节`)
## ==================================================================
func unlock_windmill_bakery(free_for_test: bool = false) -> bool:
	if windmill_unlocked:
		return false
	if free_for_test:
		unlocked_islands[2] = true
	if not bool(unlocked_islands.get(2, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.WINDMILL_UNLOCK_COST_GOLD):
		return false
	windmill_unlocked = true
	active_windmill_bread_id = "bread_cloud_souffle"
	windmill_bake_timer = 0.0
	windmill_aroma_timer = 36.0
	parade_cooldown_timer = 32.0
	unlock_bakery_item("flour_golden_wheat")
	bakery_inventory["flour_golden_wheat"] = maxi(1, int(bakery_inventory.get("flour_golden_wheat", 0)))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.windmill_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(459.4, EconomyConfig.GROUND_Y - 62.0),
		"★云端风车烘焙面坊落成！麦香烘焙光环激活 (摊位&工坊提速1.22x+)!",
		Color("#FFE066")
	)
	evaluate_achievements()
	save_game()
	return true

func unlock_bakery_item(item_id: String) -> bool:
	if not EconomyConfig.BAKERY_ITEMS.has(item_id):
		return false
	if bool(unlocked_bakery_items.get(item_id, false)):
		return false
	unlocked_bakery_items[item_id] = true
	EventBus.bakery_recipe_unlocked.emit(item_id)
	EventBus.codex_unlocked.emit(item_id)
	evaluate_achievements()
	return true

func get_unlocked_bakery_count() -> int:
	var cnt := 0
	for bid in EconomyConfig.BAKERY_CODEX_ORDER:
		if bool(unlocked_bakery_items.get(bid, false)):
			cnt += 1
	return cnt

func get_flour_stock_count() -> int:
	return maxi(0, int(bakery_inventory.get("flour_golden_wheat", 0)))

func get_total_bread_stock_count() -> int:
	var s := 0
	for bid in EconomyConfig.BAKERY_BREAD_ORDER:
		s += maxi(0, int(bakery_inventory.get(bid, 0)))
	return s

func get_windmill_bake_ratio() -> float:
	if not windmill_unlocked:
		return 0.0
	var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(active_windmill_bread_id, EconomyConfig.BAKERY_ITEMS["bread_cloud_souffle"])
	var req := maxf(2.0, float(bcfg.get("bake_time", 8.0)))
	return clampf(windmill_bake_timer / req, 0.0, 1.0)

func get_bakery_aura_speed_multiplier() -> float:
	if not windmill_unlocked or not bool(unlocked_islands.get(2, false)):
		return 1.0
	var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(active_windmill_bread_id, EconomyConfig.BAKERY_ITEMS["bread_cloud_souffle"])
	var lv := maxi(1, int(building_levels.get("windmill", 1)))
	var base_bonus := maxf(0.20, float(bcfg.get("aura_speed_bonus", 0.22)))
	var mult := 1.0 + base_bonus + minf(0.18, 0.025 * float(lv - 1))
	if windmill_aroma_timer > 0.0:
		mult *= 1.04
	return mult

func get_market_stall_speed_multiplier() -> float:
	return get_bakery_aura_speed_multiplier()

func cycle_windmill_bread() -> String:
	var unlocked_list: Array[String] = []
	for bid in EconomyConfig.BAKERY_BREAD_ORDER:
		if bool(unlocked_bakery_items.get(bid, false)):
			unlocked_list.append(bid)
	if unlocked_list.is_empty():
		unlocked_list.append("bread_cloud_souffle")
	var cur_i := unlocked_list.find(active_windmill_bread_id)
	active_windmill_bread_id = unlocked_list[(cur_i + 1) % unlocked_list.size()]
	windmill_bake_timer = 0.0
	return active_windmill_bread_id

func _check_bakery_recipe_progression(crafted_id: String) -> String:
	var newly_unlocked := ""
	for cand_id in EconomyConfig.BAKERY_CODEX_ORDER:
		if not bool(unlocked_bakery_items.get(cand_id, false)):
			var ccfg: Dictionary = EconomyConfig.BAKERY_ITEMS[cand_id]
			var parent_id := String(ccfg.get("unlock_from", ""))
			var req_c := maxi(1, int(ccfg.get("unlock_bakes_req", 1)))
			if parent_id == crafted_id and int(bakery_craft_counts.get(parent_id, 0)) >= req_c:
				unlock_bakery_item(cand_id)
				newly_unlocked = cand_id
				if EconomyConfig.is_bakery_bread(cand_id):
					active_windmill_bread_id = cand_id
				EventBus.spawn_floating_text.emit(
					Vector2(459.4, EconomyConfig.GROUND_Y - 62.0),
					"★烘焙秘方突破！解锁【" + EconomyConfig.get_item_display_name(cand_id) + "】!",
					Color("#FFE066")
				)
				break
	return newly_unlocked

func mill_golden_wheat_flour(prefer_flora: bool = false, allow_wind_fallback: bool = false) -> Dictionary:
	if not windmill_unlocked:
		return {"milled": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_flour_stock_count()}
	var fcfg: Dictionary = EconomyConfig.BAKERY_ITEMS["flour_golden_wheat"]
	var crop_cands: Array = fcfg.get("crop_candidates", ["crop_0"])
	var used_crop := _take_crop_for_bath(crop_cands)
	if used_crop == "" and not allow_wind_fallback:
		return {"milled": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_flour_stock_count()}
	var used_flora := ""
	if prefer_flora or int(flora_inventory.get("flora_stardew_lily", 0)) > 0 or int(flora_inventory.get("flora_cloud_rose", 0)) > 0:
		for fc in ["flora_cloud_rose", "flora_stardew_lily"]:
			if int(flora_inventory.get(fc, 0)) > 0:
				flora_inventory[fc] = int(flora_inventory[fc]) - 1
				used_flora = fc
				break
	var lv := maxi(1, int(building_levels.get("windmill", 1)))
	var yield_qty := 1 + (1 if used_flora != "" else 0) + int(floor(float(lv) / 4.0))
	var cap := maxi(14, EconomyConfig.calc_buffer_capacity(lv))
	var cur_stock := get_flour_stock_count()
	var added := maxi(0, mini(yield_qty, cap - cur_stock))
	if added <= 0 and cur_stock < cap:
		added = 1
	bakery_inventory["flour_golden_wheat"] = cur_stock + added
	bakery_craft_counts["flour_golden_wheat"] = int(bakery_craft_counts.get("flour_golden_wheat", 0)) + 1
	unlock_bakery_item("flour_golden_wheat")
	windmill_aroma_timer = maxf(windmill_aroma_timer, 36.0)
	if added > 0:
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	var unlocked_next := _check_bakery_recipe_progression("flour_golden_wheat")
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.flour_milled.emit(maxi(1, added), get_flour_stock_count())
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {
		"milled": true,
		"qty": maxi(1, added),
		"crop_id": used_crop,
		"flora_id": used_flora,
		"stock": get_flour_stock_count(),
		"unlocked_next": unlocked_next
	}

func bake_windmill_bread(preferred_bread_id: String = "", allow_auto_mill: bool = true) -> Dictionary:
	if not windmill_unlocked:
		return {"baked": false, "bread_id": "", "stock": get_total_bread_stock_count()}
	var cands: Array[String] = []
	if preferred_bread_id != "" and EconomyConfig.is_bakery_bread(preferred_bread_id):
		cands.append(preferred_bread_id)
	else:
		for bid in ["bread_amber_croissant", "bread_cloud_souffle"]:
			if bool(unlocked_bakery_items.get(bid, false)) or bid == "bread_cloud_souffle":
				cands.append(bid)
	for bread_id in cands:
		if get_flour_stock_count() <= 0 and allow_auto_mill:
			mill_golden_wheat_flour(bread_id == "bread_amber_croissant", false)
		if get_flour_stock_count() <= 0:
			continue
		var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS[bread_id]
		var flora_cands: Array = bcfg.get("flora_candidates", [])
		var used_flora := ""
		if not flora_cands.is_empty():
			for fc in flora_cands:
				var fid := String(fc)
				if int(flora_inventory.get(fid, 0)) > 0:
					flora_inventory[fid] = int(flora_inventory[fid]) - 1
					used_flora = fid
					break
			if used_flora == "" and not bool(unlocked_bakery_items.get(bread_id, false)):
				var extra_crop := _take_crop_for_bath(bcfg.get("crop_candidates", ["crop_0"]))
				if extra_crop == "":
					continue
		bakery_inventory["flour_golden_wheat"] = maxi(0, get_flour_stock_count() - 1)
		var lv := maxi(1, int(building_levels.get("windmill", 1)))
		var yield_qty := 1 + int(floor(float(lv) / 5.0))
		var cap := maxi(14, EconomyConfig.calc_buffer_capacity(lv))
		var cur_stock := maxi(0, int(bakery_inventory.get(bread_id, 0)))
		var added := maxi(1, mini(yield_qty, maxi(1, cap - cur_stock)))
		bakery_inventory[bread_id] = cur_stock + added
		bakery_craft_counts[bread_id] = int(bakery_craft_counts.get(bread_id, 0)) + 1
		unlock_bakery_item("flour_golden_wheat")
		unlock_bakery_item(bread_id)
		active_windmill_bread_id = bread_id
		windmill_aroma_timer = maxf(windmill_aroma_timer, 38.0)
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
		var unlocked_next := _check_bakery_recipe_progression(bread_id)
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.bakery_bread_baked.emit(bread_id, int(bakery_inventory[bread_id]))
		evaluate_achievements()
		EventBus.inventory_changed.emit()
		return {
			"baked": true,
			"bread_id": bread_id,
			"qty": added,
			"flora_id": used_flora,
			"stock": int(bakery_inventory[bread_id]),
			"unlocked_next": unlocked_next
		}
	return {"baked": false, "bread_id": "", "stock": get_total_bread_stock_count()}

func _tick_windmill_bakery(delta: float) -> void:
	var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS.get(active_windmill_bread_id, EconomyConfig.BAKERY_ITEMS["bread_cloud_souffle"])
	var bake_req := maxf(2.5, float(bcfg.get("bake_time", 8.0)))
	var lv := maxi(1, int(building_levels.get("windmill", 1)))
	var spd := get_crop_growth_multiplier(2) * (1.0 + 0.08 * float(lv - 1))
	windmill_bake_timer += delta * spd
	var safety := 0
	while windmill_bake_timer >= bake_req and safety < 6:
		windmill_bake_timer -= bake_req
		if get_flour_stock_count() <= 0:
			mill_golden_wheat_flour(false, true)
		bake_windmill_bread(active_windmill_bread_id, false)
		bcfg = EconomyConfig.BAKERY_ITEMS.get(active_windmill_bread_id, EconomyConfig.BAKERY_ITEMS["bread_cloud_souffle"])
		bake_req = maxf(2.5, float(bcfg.get("bake_time", 8.0)))
		safety += 1

func start_gourmet_parade_festival(duration: float = GOURMET_PARADE_DURATION) -> bool:
	if not windmill_unlocked:
		return false
	parade_festival_timer = maxf(parade_festival_timer, maxf(8.0, duration))
	parade_cooldown_timer = GOURMET_PARADE_COOLDOWN
	windmill_aroma_timer = maxf(windmill_aroma_timer, parade_festival_timer)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.gourmet_parade_started.emit(parade_festival_timer)
	return true

func is_gourmet_parade_active() -> bool:
	return parade_festival_timer > 0.0

func has_bread_for_parade_tourist() -> bool:
	if not windmill_unlocked or not bool(unlocked_islands.get(2, false)):
		return false
	if get_total_bread_stock_count() > 0 or get_flour_stock_count() > 0:
		return true
	return has_surplus_crops_for_merchant()

func try_parade_tourist_purchase_bakery(preferred_bread_id: String, qty: int, world_pos: Vector2) -> Dictionary:
	if not windmill_unlocked:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "bread_id": "", "premium_mult": 1.0}
	var target_bread := ""
	if EconomyConfig.is_bakery_bread(preferred_bread_id) and int(bakery_inventory.get(preferred_bread_id, 0)) > 0:
		target_bread = preferred_bread_id
	else:
		for bid in ["bread_amber_croissant", "bread_cloud_souffle"]:
			if int(bakery_inventory.get(bid, 0)) > 0:
				target_bread = bid
				break
	if target_bread == "":
		var auto_bake := bake_windmill_bread(preferred_bread_id, true)
		if bool(auto_bake.get("baked", false)):
			target_bread = String(auto_bake.get("bread_id", ""))
	if target_bread == "" or int(bakery_inventory.get(target_bread, 0)) <= 0:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "bread_id": "", "premium_mult": 1.0}

	var avail := int(bakery_inventory.get(target_bread, 0))
	var bought := mini(avail, maxi(1, qty))
	bakery_inventory[target_bread] = avail - bought
	unlock_bakery_item(target_bread)

	var bcfg: Dictionary = EconomyConfig.BAKERY_ITEMS[target_bread]
	var wm_lv := maxi(1, int(building_levels.get("windmill", 1)))
	var st_lv := maxi(1, int(building_levels.get("stall", 1)))
	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var base_unit := EconomyConfig.calc_item_unit_price(target_bread, wm_lv, st_lv, shiba_lv, current_solar_term_idx)
	var parade_mult := clampf(float(bcfg.get("parade_mult", 1.78)), 1.75, 1.90)
	var total_gold := maxi(1, int(round(float(base_unit * bought) * parade_mult * get_codex_price_multiplier() * get_customer_tip_multiplier(true, 2))))
	var amber_gain := maxi(1, int(bcfg.get("amber_bonus", 3)) * bought)
	var voucher_gain := maxi(1, int(bcfg.get("voucher_bonus", 1)) * bought)
	var rep_gain := maxi(25, int(bcfg.get("rep_bonus", 55)) * bought)

	bakery_reputation_bonus += rep_gain
	parade_tourists_served += bought
	windmill_aroma_timer = maxf(windmill_aroma_timer, 38.0)
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_gold)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_bread, bought, total_gold, world_pos)
	EventBus.gourmet_parade_settled.emit(target_bread, bought, total_gold, amber_gain, voucher_gain, rep_gain)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return {
		"bought": bought,
		"gold": total_gold,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"bread_id": target_bread,
		"premium_mult": parade_mult
	}


## ==================================================================
## CI-8: Cloud Tea Pavilion (`云端茗香制茶坊`) & Lotus Pond Moon-Boat Tea Gathering (`月色画舫品茗雅集`)
## ==================================================================
func unlock_tea_pavilion(free_for_test: bool = false) -> bool:
	if tea_pavilion_unlocked:
		return false
	if not bool(unlocked_islands.get(1, true)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD):
		return false
	tea_pavilion_unlocked = true
	active_tea_recipe_id = "tea_cloud_longjing"
	tea_brew_timer = 0.0
	tea_aura_timer = 40.0
	moon_tea_cooldown_timer = 28.0
	unlock_tea_item("tea_spring_leaves")
	tea_inventory["tea_spring_leaves"] = maxi(1, int(tea_inventory.get("tea_spring_leaves", 0)))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.tea_pavilion_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(926.9, EconomyConfig.GROUND_Y - 58.0),
		"★云端茗香制茶坊落成！茗香清心光环激活 (员工效率&小费UP)!",
		Color("#88FFD0")
	)
	evaluate_achievements()
	save_game()
	return true

func unlock_tea_item(item_id: String) -> bool:
	if not EconomyConfig.TEA_ITEMS.has(item_id):
		return false
	if bool(unlocked_tea_items.get(item_id, false)):
		return false
	unlocked_tea_items[item_id] = true
	EventBus.tea_recipe_unlocked.emit(item_id)
	EventBus.codex_unlocked.emit(item_id)
	evaluate_achievements()
	return true

func get_unlocked_tea_count() -> int:
	var cnt := 0
	for tid in EconomyConfig.TEA_CODEX_ORDER:
		if bool(unlocked_tea_items.get(tid, false)):
			cnt += 1
	return cnt

func get_tea_leaves_stock_count() -> int:
	return maxi(0, int(tea_inventory.get("tea_spring_leaves", 0)))

func get_total_brewed_tea_stock_count() -> int:
	var s := 0
	for tid in EconomyConfig.TEA_BREW_ORDER:
		s += maxi(0, int(tea_inventory.get(tid, 0)))
	return s

func get_tea_pavilion_brew_ratio() -> float:
	if not tea_pavilion_unlocked:
		return 0.0
	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
	var req := maxf(2.0, float(tcfg.get("brew_time", 7.5)))
	return clampf(tea_brew_timer / req, 0.0, 1.0)

func get_tea_aura_worker_move_multiplier() -> float:
	if not tea_pavilion_unlocked or not bool(unlocked_islands.get(1, true)):
		return 1.0
	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
	var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var base_bonus := maxf(0.16, float(tcfg.get("worker_move_bonus", 0.18)))
	var mult := 1.0 + base_bonus + minf(0.16, 0.02 * float(lv - 1))
	if tea_aura_timer > 0.0:
		mult *= 1.04
	return mult

func get_tea_aura_worker_stamina_multiplier() -> float:
	if not tea_pavilion_unlocked or not bool(unlocked_islands.get(1, true)):
		return 1.0
	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
	var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var base_bonus := maxf(0.16, float(tcfg.get("worker_stamina_bonus", 0.18)))
	var mult := 1.0 + base_bonus + minf(0.16, 0.02 * float(lv - 1))
	if tea_aura_timer > 0.0:
		mult *= 1.04
	return mult

func get_tea_aura_tip_multiplier() -> float:
	if not tea_pavilion_unlocked or not bool(unlocked_islands.get(1, true)):
		return 1.0
	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
	var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var base_bonus := maxf(0.12, float(tcfg.get("tip_aura_bonus", 0.15)))
	var mult := 1.0 + base_bonus + minf(0.14, 0.02 * float(lv - 1))
	if tea_aura_timer > 0.0:
		mult *= 1.03
	return mult

func cycle_tea_pavilion_recipe() -> String:
	var unlocked_list: Array[String] = []
	for tid in EconomyConfig.TEA_BREW_ORDER:
		if bool(unlocked_tea_items.get(tid, false)):
			unlocked_list.append(tid)
	if unlocked_list.is_empty():
		unlocked_list.append("tea_cloud_longjing")
	var cur_i := unlocked_list.find(active_tea_recipe_id)
	active_tea_recipe_id = unlocked_list[(cur_i + 1) % unlocked_list.size()]
	tea_brew_timer = 0.0
	return active_tea_recipe_id

func _check_tea_recipe_progression(crafted_id: String) -> String:
	var newly_unlocked := ""
	for cand_id in EconomyConfig.TEA_CODEX_ORDER:
		if not bool(unlocked_tea_items.get(cand_id, false)):
			var ccfg: Dictionary = EconomyConfig.TEA_ITEMS[cand_id]
			var parent_id := String(ccfg.get("unlock_from", ""))
			var req_c := maxi(1, int(ccfg.get("unlock_brews_req", 1)))
			if parent_id == crafted_id and int(tea_craft_counts.get(parent_id, 0)) >= req_c:
				unlock_tea_item(cand_id)
				newly_unlocked = cand_id
				if EconomyConfig.is_artisan_tea(cand_id):
					active_tea_recipe_id = cand_id
				EventBus.spawn_floating_text.emit(
					Vector2(926.9, EconomyConfig.GROUND_Y - 58.0),
					"★茶道秘谱点亮！解锁【" + EconomyConfig.get_item_display_name(cand_id) + "】!",
					Color("#88FFD0")
				)
				break
	return newly_unlocked

func roast_tea_spring_leaves(prefer_flora: bool = false, allow_dew_fallback: bool = false) -> Dictionary:
	if not tea_pavilion_unlocked:
		return {"roasted": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_tea_leaves_stock_count()}
	var lcfg: Dictionary = EconomyConfig.TEA_ITEMS["tea_spring_leaves"]
	var crop_cands: Array = lcfg.get("crop_candidates", ["crop_0"])
	var used_crop := _take_crop_for_bath(crop_cands)
	if used_crop == "" and not allow_dew_fallback:
		return {"roasted": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_tea_leaves_stock_count()}
	var used_flora := ""
	if prefer_flora or int(flora_inventory.get("flora_stardew_lily", 0)) > 0 or int(flora_inventory.get("flora_cloud_rose", 0)) > 0:
		for fc in ["flora_cloud_rose", "flora_stardew_lily"]:
			if int(flora_inventory.get(fc, 0)) > 0:
				flora_inventory[fc] = int(flora_inventory[fc]) - 1
				used_flora = fc
				break
	var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var yield_qty := 1 + (1 if used_flora != "" else 0) + int(floor(float(lv) / 4.0))
	var cap := maxi(14, EconomyConfig.calc_buffer_capacity(lv))
	var cur_stock := get_tea_leaves_stock_count()
	var added := maxi(0, mini(yield_qty, cap - cur_stock))
	if added <= 0 and cur_stock < cap:
		added = 1
	tea_inventory["tea_spring_leaves"] = cur_stock + added
	tea_craft_counts["tea_spring_leaves"] = int(tea_craft_counts.get("tea_spring_leaves", 0)) + 1
	unlock_tea_item("tea_spring_leaves")
	tea_aura_timer = maxf(tea_aura_timer, 38.0)
	if added > 0:
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	var unlocked_next := _check_tea_recipe_progression("tea_spring_leaves")
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.tea_leaves_roasted.emit(maxi(1, added), get_tea_leaves_stock_count())
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {
		"roasted": true,
		"qty": maxi(1, added),
		"crop_id": used_crop,
		"flora_id": used_flora,
		"stock": get_tea_leaves_stock_count(),
		"unlocked_next": unlocked_next
	}

func brew_artisan_tea(preferred_tea_id: String = "", allow_auto_roast: bool = true) -> Dictionary:
	if not tea_pavilion_unlocked:
		return {"brewed": false, "tea_id": "", "stock": get_total_brewed_tea_stock_count()}
	var cands: Array[String] = []
	if preferred_tea_id != "" and EconomyConfig.is_artisan_tea(preferred_tea_id):
		cands.append(preferred_tea_id)
	else:
		for tid in ["tea_osmanthus_oolong", "tea_cloud_longjing"]:
			if bool(unlocked_tea_items.get(tid, false)) or tid == "tea_cloud_longjing":
				cands.append(tid)
	for tea_id in cands:
		if get_tea_leaves_stock_count() <= 0 and allow_auto_roast:
			roast_tea_spring_leaves(tea_id == "tea_osmanthus_oolong", false)
		if get_tea_leaves_stock_count() <= 0:
			continue
		var tcfg: Dictionary = EconomyConfig.TEA_ITEMS[tea_id]
		var flora_cands: Array = tcfg.get("flora_candidates", [])
		var used_flora := ""
		if not flora_cands.is_empty():
			for fc in flora_cands:
				var fid := String(fc)
				if int(flora_inventory.get(fid, 0)) > 0:
					flora_inventory[fid] = int(flora_inventory[fid]) - 1
					used_flora = fid
					break
			if used_flora == "" and not bool(unlocked_tea_items.get(tea_id, false)):
				var extra_crop := _take_crop_for_bath(tcfg.get("crop_candidates", ["crop_0"]))
				if extra_crop == "":
					continue
		tea_inventory["tea_spring_leaves"] = maxi(0, get_tea_leaves_stock_count() - 1)
		var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
		var yield_qty := 1 + int(floor(float(lv) / 5.0))
		var cap := maxi(14, EconomyConfig.calc_buffer_capacity(lv))
		var cur_stock := maxi(0, int(tea_inventory.get(tea_id, 0)))
		var added := maxi(1, mini(yield_qty, maxi(1, cap - cur_stock)))
		tea_inventory[tea_id] = cur_stock + added
		tea_craft_counts[tea_id] = int(tea_craft_counts.get(tea_id, 0)) + 1
		unlock_tea_item("tea_spring_leaves")
		unlock_tea_item(tea_id)
		active_tea_recipe_id = tea_id
		tea_aura_timer = maxf(tea_aura_timer, 40.0)
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
		# Also stock freshly brewed tea to MarketStall when stall buffer has room
		if not is_stall_full():
			add_to_stall(tea_id, 1)
		var unlocked_next := _check_tea_recipe_progression(tea_id)
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.tea_brewed.emit(tea_id, int(tea_inventory[tea_id]))
		evaluate_achievements()
		EventBus.inventory_changed.emit()
		return {
			"brewed": true,
			"tea_id": tea_id,
			"qty": added,
			"flora_id": used_flora,
			"stock": int(tea_inventory[tea_id]),
			"unlocked_next": unlocked_next
		}
	return {"brewed": false, "tea_id": "", "stock": get_total_brewed_tea_stock_count()}

func _tick_tea_pavilion(delta: float) -> void:
	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
	var brew_req := maxf(2.0, float(tcfg.get("brew_time", 7.5)))
	var lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var spd := get_workshop_speed_multiplier(1) * (1.0 + 0.06 * float(lv - 1)) * (1.5 if frenzy_timer > 0.0 else 1.0)
	tea_brew_timer += delta * spd
	var safety := 0
	while tea_brew_timer >= brew_req and safety < 6:
		tea_brew_timer -= brew_req
		safety += 1
		if get_tea_leaves_stock_count() <= 0:
			roast_tea_spring_leaves(false, true)
		brew_artisan_tea(active_tea_recipe_id, false)
		tcfg = EconomyConfig.TEA_ITEMS.get(active_tea_recipe_id, EconomyConfig.TEA_ITEMS["tea_cloud_longjing"])
		brew_req = maxf(2.0, float(tcfg.get("brew_time", 7.5)))

func start_moon_tea_gathering(duration: float = MOON_TEA_GATHERING_DURATION) -> bool:
	if not tea_pavilion_unlocked:
		return false
	moon_tea_gathering_timer = maxf(moon_tea_gathering_timer, maxf(8.0, duration))
	moon_tea_cooldown_timer = MOON_TEA_GATHERING_COOLDOWN
	tea_aura_timer = maxf(tea_aura_timer, moon_tea_gathering_timer)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.moon_tea_gathering_started.emit(moon_tea_gathering_timer)
	EventBus.spawn_floating_text.emit(
		Vector2(1192.0, 74.0),
		"★荷塘月色画舫品茗雅集开幕！茗茶与佳肴售价 1.38x!",
		Color("#88FFD0")
	)
	return true

func is_moon_tea_gathering_active() -> bool:
	return moon_tea_gathering_timer > 0.0

func get_moon_tea_sale_multiplier(item_id: String = "") -> float:
	if not is_moon_tea_gathering_active():
		return 1.0
	if item_id == "" or EconomyConfig.is_tea_item(item_id) or EconomyConfig.DELICACIES.has(item_id) or EconomyConfig.is_solar_specialty_dish(item_id) or EconomyConfig.is_bakery_item(item_id):
		return EconomyConfig.MOON_TEA_SALE_BUFF_MULT
	return 1.0

func claim_moon_tea_boat_reward(world_pos: Vector2 = Vector2(1192.0, 96.0)) -> Dictionary:
	if not tea_pavilion_unlocked:
		if gold >= EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD:
			unlock_tea_pavilion(false)
		else:
			EventBus.spawn_floating_text.emit(
				world_pos + Vector2(0.0, -28.0),
				"需先建造【云端茗香制茶坊】(" + str(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD) + "G) 开启画舫雅集!",
				Color("#FFF4D6")
			)
			return {"claimed": false, "amber": 0, "vouchers": 0, "rep_gained": 0, "buff_mult": 1.0}
	start_moon_tea_gathering(MOON_TEA_GATHERING_DURATION)
	var tp_lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var amber_gain := 2 + int(floor(float(tp_lv) / 3.0))
	var voucher_gain := 1
	var rep_gain := 45 + tp_lv * 5
	add_amber(amber_gain)
	add_rare_voucher(voucher_gain)
	tea_reputation_bonus += rep_gain
	moon_tea_boat_claims += 1
	evaluate_achievements()
	EventBus.moon_tea_gathering_settled.emit(active_tea_recipe_id, 1, 0, amber_gain, voucher_gain, rep_gain)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		world_pos + Vector2(0.0, -32.0),
		"★画舫品茗雅赏! +%d琥珀 +%d图鉴券 +%d声望 (茶肴1.38x)!" % [amber_gain, voucher_gain, rep_gain],
		Color("#FFE066")
	)
	save_game()
	return {
		"claimed": true,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"buff_mult": EconomyConfig.MOON_TEA_SALE_BUFF_MULT
	}

func has_tea_for_connoisseur() -> bool:
	if not tea_pavilion_unlocked:
		return false
	if get_total_brewed_tea_stock_count() > 0 or get_tea_leaves_stock_count() > 0:
		return true
	return has_surplus_crops_for_merchant()

func try_tea_connoisseur_checkout(preferred_tea_id: String, qty: int, world_pos: Vector2) -> Dictionary:
	if not tea_pavilion_unlocked:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "tea_id": "", "premium_mult": 1.0}
	var target_tea := ""
	if preferred_tea_id != "" and EconomyConfig.is_artisan_tea(preferred_tea_id) and int(tea_inventory.get(preferred_tea_id, 0)) > 0:
		target_tea = preferred_tea_id
	else:
		for tid in ["tea_osmanthus_oolong", "tea_cloud_longjing"]:
			if int(tea_inventory.get(tid, 0)) > 0:
				target_tea = tid
				break
	if target_tea == "":
		var auto_brew := brew_artisan_tea(preferred_tea_id, true)
		if bool(auto_brew.get("brewed", false)):
			target_tea = String(auto_brew.get("tea_id", ""))
	if target_tea == "" or int(tea_inventory.get(target_tea, 0)) <= 0:
		return {"bought": 0, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "tea_id": "", "premium_mult": 1.0}

	var avail := int(tea_inventory.get(target_tea, 0))
	var bought := mini(avail, maxi(1, qty))
	tea_inventory[target_tea] = avail - bought
	unlock_tea_item(target_tea)

	var tcfg: Dictionary = EconomyConfig.TEA_ITEMS[target_tea]
	var tp_lv := maxi(1, int(building_levels.get("tea_pavilion", 1)))
	var st_lv := maxi(1, int(building_levels.get("stall", 1)))
	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var base_unit := EconomyConfig.calc_item_unit_price(target_tea, tp_lv, st_lv, shiba_lv, current_solar_term_idx)
	var moon_mult := get_moon_tea_sale_multiplier(target_tea)
	var connoisseur_mult := 1.42 * moon_mult
	var total_gold := maxi(1, int(round(float(base_unit * bought) * connoisseur_mult * get_codex_price_multiplier() * get_tea_aura_tip_multiplier())))
	var amber_gain := maxi(2, int(tcfg.get("amber_bonus", 3)) * bought)
	var voucher_gain := int(tcfg.get("voucher_bonus", 1)) * bought
	var rep_gain := int(tcfg.get("rep_bonus", 50)) * bought

	tea_reputation_bonus += rep_gain
	tea_connoisseurs_served += bought
	tea_aura_timer = maxf(tea_aura_timer, 40.0)
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_gold)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	if is_moon_tea_gathering_active():
		trigger_gourmet_acclaim(GOURMET_ACCLAIM_DURATION)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_tea, bought, total_gold, world_pos)
	EventBus.moon_tea_gathering_settled.emit(target_tea, bought, total_gold, amber_gain, voucher_gain, rep_gain)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return {
		"bought": bought,
		"gold": total_gold,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"tea_id": target_tea,
		"premium_mult": connoisseur_mult
	}


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
	score += collector_reputation_bonus + get_unlocked_flora_count() * 35 + get_unlocked_souvenir_count() * 45
	score += hotspring_reputation_bonus + get_unlocked_bath_count() * 40
	score += bakery_reputation_bonus + get_unlocked_bakery_count() * 42
	score += tea_reputation_bonus + get_unlocked_tea_count() * 42
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
		Vector2(849.8, EconomyConfig.GROUND_Y - 46.0),
		"★成就解锁【" + String(cfg.get("name", ach_id)) + "】!",
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
	if completed_airship_orders >= 1 and unlock_achievement("ach_airship_caravan"):
		newly.append("ach_airship_caravan")
	if get_unlocked_solar_dish_count() >= 4 and unlock_achievement("ach_solar_feast"):
		newly.append("ach_solar_feast")
	if get_unlocked_flora_count() >= EconomyConfig.HYBRID_FLORA_ORDER.size() and unlock_achievement("ach_greenhouse_bloom"):
		newly.append("ach_greenhouse_bloom")
	if souvenirs_sold_count >= 1 and unlock_achievement("ach_souvenir_master"):
		newly.append("ach_souvenir_master")
	if get_unlocked_bath_count() >= EconomyConfig.HOTSPRING_BATH_ORDER.size() and unlock_achievement("ach_hotspring_master"):
		newly.append("ach_hotspring_master")
	if hotspring_guests_served >= 1 and unlock_achievement("ach_hotspring_vip"):
		newly.append("ach_hotspring_vip")
	if get_unlocked_bakery_count() >= EconomyConfig.BAKERY_CODEX_ORDER.size() and unlock_achievement("ach_windmill_baker"):
		newly.append("ach_windmill_baker")
	if parade_tourists_served >= 1 and unlock_achievement("ach_parade_feast"):
		newly.append("ach_parade_feast")
	if get_unlocked_tea_count() >= EconomyConfig.TEA_CODEX_ORDER.size() and unlock_achievement("ach_tea_master"):
		newly.append("ach_tea_master")
	if (tea_connoisseurs_served >= 1 or moon_tea_boat_claims >= 1) and unlock_achievement("ach_moon_tea_gathering"):
		newly.append("ach_moon_tea_gathering")
	return newly

func get_prosperity_score() -> int:
	var score := 0
	for k in building_levels.keys():
		if k == "greenhouse" and not greenhouse_unlocked:
			continue
		if k == "hotspring" and not hotspring_unlocked:
			continue
		if k == "windmill" and not windmill_unlocked:
			continue
		if k == "tea_pavilion" and not tea_pavilion_unlocked:
			continue
		var req_isl := int(EconomyConfig.BUILDINGS.get(k, {}).get("island", 1))
		if bool(unlocked_islands.get(req_isl, false)):
			score += int(building_levels[k]) * 20
	for k in animal_levels.keys():
		score += get_total_recruited(k) * 35 + int(animal_levels[k]) * 25
	if tea_pavilion_unlocked and bool(unlocked_islands.get(1, true)):
		score += 135
	if bool(unlocked_islands.get(2, false)):
		score += 180
	if greenhouse_unlocked and bool(unlocked_islands.get(2, false)):
		score += 120
	if windmill_unlocked and bool(unlocked_islands.get(2, false)):
		score += 140
	if bool(unlocked_islands.get(3, false)):
		score += 420
	if hotspring_unlocked and bool(unlocked_islands.get(3, false)):
		score += 160
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
		for k in ["tea_osmanthus_oolong", "tea_cloud_longjing", "tea_spring_leaves", "solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0", "crop_3", "crop_2", "crop_1", "crop_0"]:
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
	if EconomyConfig.is_tea_item(target_id):
		b_lv = int(building_levels.get("tea_pavilion", 1))
	elif EconomyConfig.is_bakery_item(target_id):
		b_lv = int(building_levels.get("windmill", 1))
	elif target_id == "crop_2":
		b_lv = int(building_levels.get("soil_2", 1))
	elif target_id == "crop_3":
		b_lv = int(building_levels.get("soil_3", 1))
	elif target_id == "delicacy_0" or target_id == "delicacy_1" or target_id == "solar_dish_spring" or target_id == "solar_dish_autumn":
		b_lv = int(building_levels.get("mortar", 1))
	elif target_id == "delicacy_2" or target_id == "solar_dish_summer":
		b_lv = int(building_levels.get("cauldron", 1))
	elif target_id == "delicacy_3" or target_id == "solar_dish_winter":
		b_lv = maxi(int(building_levels.get("cauldron", 1)), int(building_levels.get("soil_3", 1)))

	var shiba_lv := int(animal_levels.get("shiba", 0)) if is_animal_hired("shiba") else 0
	var unit_price := EconomyConfig.calc_item_unit_price(
		target_id,
		b_lv,
		int(building_levels.get("stall", 1)),
		shiba_lv,
		current_solar_term_idx
	)
	var moon_mult := get_moon_tea_sale_multiplier(target_id)
	var total_earned := int(round(float(unit_price * bought) * get_codex_price_multiplier() * moon_mult))
	var tip_mult := get_customer_tip_multiplier(is_vip, 3)
	total_earned = int(round(float(total_earned) * tip_mult))

	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	add_gold(total_earned)
	progress_contract(target_id, bought)
	if airship_docked:
		deliver_item_to_airship_order(target_id, bought)
	evaluate_achievements()
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_id, bought, total_earned, world_pos)
	return total_earned

func upgrade_building(b_key: String) -> bool:
	if not EconomyConfig.BUILDINGS.has(b_key):
		return false
	if b_key == "greenhouse" and not greenhouse_unlocked:
		return false
	if b_key == "hotspring" and not hotspring_unlocked:
		return false
	if b_key == "windmill" and not windmill_unlocked:
		return false
	if b_key == "tea_pavilion" and not tea_pavilion_unlocked:
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
	evaluate_achievements()
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
		"career_stats": career_stats,
		"current_solar_term_idx": current_solar_term_idx,
		"unlocked_solar_dishes": unlocked_solar_dishes,
		"rare_codex_vouchers": rare_codex_vouchers,
		"total_vouchers_earned": total_vouchers_earned,
		"airship_docked": airship_docked,
		"active_airship_order": active_airship_order,
		"completed_airship_orders": completed_airship_orders,
		"greenhouse_unlocked": greenhouse_unlocked,
		"active_greenhouse_flora_id": active_greenhouse_flora_id,
		"greenhouse_growth_timer": greenhouse_growth_timer,
		"flora_harvest_counts": flora_harvest_counts,
		"flora_inventory": flora_inventory,
		"unlocked_flora": unlocked_flora,
		"souvenir_inventory": souvenir_inventory,
		"unlocked_souvenirs": unlocked_souvenirs,
		"collector_reputation_bonus": collector_reputation_bonus,
		"souvenirs_sold_count": souvenirs_sold_count,
		"hotspring_unlocked": hotspring_unlocked,
		"active_hotspring_bath_id": active_hotspring_bath_id,
		"hotspring_steep_timer": hotspring_steep_timer,
		"hotspring_rejuvenation_timer": hotspring_rejuvenation_timer,
		"bath_brew_counts": bath_brew_counts,
		"bath_inventory": bath_inventory,
		"unlocked_baths": unlocked_baths,
		"hotspring_reputation_bonus": hotspring_reputation_bonus,
		"hotspring_guests_served": hotspring_guests_served,
		"windmill_unlocked": windmill_unlocked,
		"active_windmill_bread_id": active_windmill_bread_id,
		"windmill_bake_timer": windmill_bake_timer,
		"windmill_aroma_timer": windmill_aroma_timer,
		"parade_festival_timer": parade_festival_timer,
		"bakery_craft_counts": bakery_craft_counts,
		"bakery_inventory": bakery_inventory,
		"unlocked_bakery_items": unlocked_bakery_items,
		"bakery_reputation_bonus": bakery_reputation_bonus,
		"parade_tourists_served": parade_tourists_served,
		"tea_pavilion_unlocked": tea_pavilion_unlocked,
		"active_tea_recipe_id": active_tea_recipe_id,
		"tea_brew_timer": tea_brew_timer,
		"tea_aura_timer": tea_aura_timer,
		"moon_tea_gathering_timer": moon_tea_gathering_timer,
		"tea_craft_counts": tea_craft_counts,
		"tea_inventory": tea_inventory,
		"unlocked_tea_items": unlocked_tea_items,
		"tea_reputation_bonus": tea_reputation_bonus,
		"tea_connoisseurs_served": tea_connoisseurs_served,
		"moon_tea_boat_claims": moon_tea_boat_claims
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
	current_solar_term_idx = posmod(int(parsed.get("current_solar_term_idx", current_solar_term_idx)), maxi(1, EconomyConfig.SOLAR_TERMS.size()))
	if parsed.has("unlocked_solar_dishes") and parsed["unlocked_solar_dishes"] is Dictionary:
		var usd: Dictionary = parsed["unlocked_solar_dishes"]
		for sdk in unlocked_solar_dishes.keys():
			unlocked_solar_dishes[sdk] = bool(usd.get(sdk, unlocked_solar_dishes[sdk]))
	rare_codex_vouchers = maxi(0, int(parsed.get("rare_codex_vouchers", 0)))
	total_vouchers_earned = maxi(rare_codex_vouchers, int(parsed.get("total_vouchers_earned", rare_codex_vouchers)))
	airship_docked = bool(parsed.get("airship_docked", true))
	completed_airship_orders = maxi(0, int(parsed.get("completed_airship_orders", 0)))
	if parsed.has("active_airship_order") and parsed["active_airship_order"] is Dictionary and not (parsed["active_airship_order"] as Dictionary).is_empty():
		active_airship_order = parsed["active_airship_order"]
	else:
		generate_next_airship_order()

	greenhouse_unlocked = bool(parsed.get("greenhouse_unlocked", false))
	var saved_fid := String(parsed.get("active_greenhouse_flora_id", "flora_stardew_lily"))
	active_greenhouse_flora_id = saved_fid if EconomyConfig.HYBRID_FLORA.has(saved_fid) else "flora_stardew_lily"
	greenhouse_growth_timer = maxf(0.0, float(parsed.get("greenhouse_growth_timer", 0.0)))
	if parsed.has("flora_harvest_counts") and parsed["flora_harvest_counts"] is Dictionary:
		var fhc: Dictionary = parsed["flora_harvest_counts"]
		for fk in flora_harvest_counts.keys():
			flora_harvest_counts[fk] = maxi(0, int(fhc.get(fk, 0)))
	if parsed.has("flora_inventory") and parsed["flora_inventory"] is Dictionary:
		var finv: Dictionary = parsed["flora_inventory"]
		for fk in flora_inventory.keys():
			flora_inventory[fk] = maxi(0, int(finv.get(fk, 0)))
	if parsed.has("unlocked_flora") and parsed["unlocked_flora"] is Dictionary:
		var ufl: Dictionary = parsed["unlocked_flora"]
		for fk in unlocked_flora.keys():
			unlocked_flora[fk] = bool(ufl.get(fk, false))
	if greenhouse_unlocked:
		unlocked_flora["flora_stardew_lily"] = true
	if parsed.has("souvenir_inventory") and parsed["souvenir_inventory"] is Dictionary:
		var sinv: Dictionary = parsed["souvenir_inventory"]
		for bk in souvenir_inventory.keys():
			souvenir_inventory[bk] = maxi(0, int(sinv.get(bk, 0)))
	if parsed.has("unlocked_souvenirs") and parsed["unlocked_souvenirs"] is Dictionary:
		var usv: Dictionary = parsed["unlocked_souvenirs"]
		for bk in unlocked_souvenirs.keys():
			unlocked_souvenirs[bk] = bool(usv.get(bk, false))
	collector_reputation_bonus = maxi(0, int(parsed.get("collector_reputation_bonus", 0)))
	souvenirs_sold_count = maxi(0, int(parsed.get("souvenirs_sold_count", 0)))

	hotspring_unlocked = bool(parsed.get("hotspring_unlocked", false))
	var saved_bid := String(parsed.get("active_hotspring_bath_id", "bath_mugwort_warm"))
	active_hotspring_bath_id = saved_bid if EconomyConfig.HOTSPRING_BATH_BLENDS.has(saved_bid) else "bath_mugwort_warm"
	hotspring_steep_timer = maxf(0.0, float(parsed.get("hotspring_steep_timer", 0.0)))
	hotspring_rejuvenation_timer = maxf(0.0, float(parsed.get("hotspring_rejuvenation_timer", 0.0)))
	if parsed.has("bath_brew_counts") and parsed["bath_brew_counts"] is Dictionary:
		var bbc: Dictionary = parsed["bath_brew_counts"]
		for bk in bath_brew_counts.keys():
			bath_brew_counts[bk] = maxi(0, int(bbc.get(bk, 0)))
	if parsed.has("bath_inventory") and parsed["bath_inventory"] is Dictionary:
		var binv: Dictionary = parsed["bath_inventory"]
		for bk in bath_inventory.keys():
			bath_inventory[bk] = maxi(0, int(binv.get(bk, 0)))
	if parsed.has("unlocked_baths") and parsed["unlocked_baths"] is Dictionary:
		var uba: Dictionary = parsed["unlocked_baths"]
		for bk in unlocked_baths.keys():
			unlocked_baths[bk] = bool(uba.get(bk, false))
	if hotspring_unlocked:
		unlocked_baths["bath_mugwort_warm"] = true
	hotspring_reputation_bonus = maxi(0, int(parsed.get("hotspring_reputation_bonus", 0)))
	hotspring_guests_served = maxi(0, int(parsed.get("hotspring_guests_served", 0)))

	windmill_unlocked = bool(parsed.get("windmill_unlocked", false))
	var saved_wbid := String(parsed.get("active_windmill_bread_id", "bread_cloud_souffle"))
	active_windmill_bread_id = saved_wbid if EconomyConfig.is_bakery_bread(saved_wbid) else "bread_cloud_souffle"
	windmill_bake_timer = maxf(0.0, float(parsed.get("windmill_bake_timer", 0.0)))
	windmill_aroma_timer = maxf(0.0, float(parsed.get("windmill_aroma_timer", 0.0)))
	parade_festival_timer = maxf(0.0, float(parsed.get("parade_festival_timer", 0.0)))
	if parsed.has("bakery_craft_counts") and parsed["bakery_craft_counts"] is Dictionary:
		var bcc: Dictionary = parsed["bakery_craft_counts"]
		for bk in bakery_craft_counts.keys():
			bakery_craft_counts[bk] = maxi(0, int(bcc.get(bk, 0)))
	if parsed.has("bakery_inventory") and parsed["bakery_inventory"] is Dictionary:
		var bkinv: Dictionary = parsed["bakery_inventory"]
		for bk in bakery_inventory.keys():
			bakery_inventory[bk] = maxi(0, int(bkinv.get(bk, 0)))
	if parsed.has("unlocked_bakery_items") and parsed["unlocked_bakery_items"] is Dictionary:
		var ubki: Dictionary = parsed["unlocked_bakery_items"]
		for bk in unlocked_bakery_items.keys():
			unlocked_bakery_items[bk] = bool(ubki.get(bk, false))
	if windmill_unlocked:
		unlocked_bakery_items["flour_golden_wheat"] = true
	bakery_reputation_bonus = maxi(0, int(parsed.get("bakery_reputation_bonus", 0)))
	parade_tourists_served = maxi(0, int(parsed.get("parade_tourists_served", 0)))

	tea_pavilion_unlocked = bool(parsed.get("tea_pavilion_unlocked", false))
	var saved_trid := String(parsed.get("active_tea_recipe_id", "tea_cloud_longjing"))
	active_tea_recipe_id = saved_trid if EconomyConfig.is_artisan_tea(saved_trid) else "tea_cloud_longjing"
	tea_brew_timer = maxf(0.0, float(parsed.get("tea_brew_timer", 0.0)))
	tea_aura_timer = maxf(0.0, float(parsed.get("tea_aura_timer", 0.0)))
	moon_tea_gathering_timer = maxf(0.0, float(parsed.get("moon_tea_gathering_timer", 0.0)))
	if parsed.has("tea_craft_counts") and parsed["tea_craft_counts"] is Dictionary:
		var tcc: Dictionary = parsed["tea_craft_counts"]
		for tk in tea_craft_counts.keys():
			tea_craft_counts[tk] = maxi(0, int(tcc.get(tk, 0)))
	if parsed.has("tea_inventory") and parsed["tea_inventory"] is Dictionary:
		var tinv: Dictionary = parsed["tea_inventory"]
		for tk in tea_inventory.keys():
			tea_inventory[tk] = maxi(0, int(tinv.get(tk, 0)))
	if parsed.has("unlocked_tea_items") and parsed["unlocked_tea_items"] is Dictionary:
		var uti: Dictionary = parsed["unlocked_tea_items"]
		for tk in unlocked_tea_items.keys():
			unlocked_tea_items[tk] = bool(uti.get(tk, false))
	if tea_pavilion_unlocked:
		unlocked_tea_items["tea_spring_leaves"] = true
	tea_reputation_bonus = maxi(0, int(parsed.get("tea_reputation_bonus", 0)))
	tea_connoisseurs_served = maxi(0, int(parsed.get("tea_connoisseurs_served", 0)))
	moon_tea_boat_claims = maxi(0, int(parsed.get("moon_tea_boat_claims", 0)))

	var last_ts := int(parsed.get("timestamp", 0))
	var now_ts := int(Time.get_unix_time_from_system())
	var elapsed := clampi(now_ts - last_ts, 0, 86400)
	if elapsed >= 60:
		calculate_and_apply_offline_earnings(elapsed)
