extends Node
## Global State, Strict Per-Island Recruit Caps, Recruit-to-Promote & Save System (`src/autoload/GameManager.gd`) — PRD Patch v2.2

const SAVE_PATH := "user://savegame.json"
const SELFTEST_SAVE_PATH := "user://savegame_selftest.json"
const SAVE_VERSION := 25
const START_GOLD := Pacing.START_GOLD

var active_save_path: String = SAVE_PATH
var is_automated_test_mode: bool = false

var gold: int = START_GOLD
var total_gold_earned: int = START_GOLD
## Income earned but not paid yet; customers pay it out (`collect_from_till`)
var till_gold: float = 0.0
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
	"chef_pavilion": 1,
	"stall": 1,
	"soil_2": 1,
	"cauldron": 1,
	"greenhouse": 1,
	"soil_3": 1,
	"hotspring": 1,
	"lighthouse_harbor": 1,
	"windmill": 1,
	"dairy_workshop": 1
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
	"coral_linked": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
}

var workshop_outputs: Dictionary = {
	"mortar": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
	"cauldron": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
	"coral_linked": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0}
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

var current_weather: int = WeatherState.DAY
var weather_timer: float = 0.0
var frenzy_timer: float = 0.0
var gourmet_acclaim_timer: float = 0.0

## v2.4-4: Pomodoro Focus Timer Companion (25min / 1500s) & Gift Box Reward
const POMODORO_DURATION: float = 1500.0
const POMODORO_REWARD_SEC: float = 120.0
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
const AIRSHIP_DOCK_DURATION: float = Pacing.AIRSHIP_DOCK_SEC
const AIRSHIP_VOYAGE_COOLDOWN: float = Pacing.AIRSHIP_AWAY_SEC

var current_solar_term_idx: int = 3 # Default: 春分 (`solar_dish_spring`)
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
const GOURMET_PARADE_DURATION: float = Pacing.FESTIVAL_SEC
var windmill_unlocked: bool = false
var active_windmill_bread_id: String = "bread_cloud_souffle"
var windmill_bake_timer: float = 0.0
var windmill_aroma_timer: float = 0.0
var parade_festival_timer: float = 0.0
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
const MOON_TEA_GATHERING_DURATION: float = Pacing.FESTIVAL_SEC
var tea_pavilion_unlocked: bool = false
var active_tea_recipe_id: String = "tea_cloud_longjing"
var tea_brew_timer: float = 0.0
var tea_aura_timer: float = 0.0
var moon_tea_gathering_timer: float = 0.0
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
## The boat pays once per gathering
var moon_tea_boat_claimed: bool = false

## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) & Mountain-Sea Master Chef Tasting Pavilion (`山海特级食神品鉴席`)
const WISH_LANTERN_FESTIVAL_DURATION: float = Pacing.FESTIVAL_SEC
const WISH_LANTERN_WISH_BONUS_EVERY: int = 3
var wish_lantern_festival_timer: float = 0.0
var wish_lanterns_collected: int = 0
## Lanterns scooped up and encore tastings held during the running festival
var lanterns_this_festival: int = 0
var lantern_encores: int = 0
var wish_lantern_reputation_bonus: int = 0
var chef_pavilion_unlocked: bool = false
var active_tasting_dish_id: String = "dish_cloud_dumplings"
var chef_cook_timer: float = 0.0
var tasting_cook_counts: Dictionary = {
	"dish_cloud_dumplings": 0,
	"dish_starlight_fish": 0,
	"dish_mountain_sea_hotpot": 0
}
var tasting_inventory: Dictionary = {
	"dish_cloud_dumplings": 0,
	"dish_starlight_fish": 0,
	"dish_mountain_sea_hotpot": 0
}
var unlocked_tasting_dishes: Dictionary = {
	"dish_cloud_dumplings": false,
	"dish_starlight_fish": false,
	"dish_mountain_sea_hotpot": false
}
var tasting_challenges_passed: Dictionary = {
	"dish_cloud_dumplings": false,
	"dish_starlight_fish": false,
	"dish_mountain_sea_hotpot": false
}
var tasting_best_scores: Dictionary = {
	"dish_cloud_dumplings": 0,
	"dish_starlight_fish": 0,
	"dish_mountain_sea_hotpot": 0
}
var chef_medals: int = 0
var chef_reputation_bonus: int = 0
var tastings_held: int = 0

## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`)
var lighthouse_harbor_unlocked: bool = false
var harbor_clock: float = 0.0
## Completed round trips already unloaded per boat (`floor((clock + offset) / period)` at the last unload)
var harbor_boat_trips: Array = [0, 0]
var harbor_seafood_inventory: Dictionary = {"seafood_catch": 0}
var seafood_landed_total: int = 0
var harbor_trips_total: int = 0
var harbor_reputation_bonus: int = 0

## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
var dairy_workshop_unlocked: bool = false
var active_dairy_recipe_id: String = "dairy_cheese"
var dairy_timer: float = 0.0
var dairy_inventory: Dictionary = {"dairy_milk": 0, "dairy_cheese": 0, "dairy_cloud_pudding": 0}
var dairy_craft_counts: Dictionary = {"dairy_milk": 0, "dairy_cheese": 0, "dairy_cloud_pudding": 0}
var unlocked_dairy_items: Dictionary = {"dairy_milk": false, "dairy_cheese": false, "dairy_cloud_pudding": false}
var dairy_feed_consumed: int = 0
var dairy_reputation_bonus: int = 0
var open_air_cinema_unlocked: bool = false
## Night programme clock (seconds since the current NIGHT phase began); never persisted, re-synced from the weather
var cinema_night_on: bool = false
var cinema_night_clock: float = 0.0
var cinema_screenings_tonight: int = 0
var cinema_snacks_tonight: int = 0
var cinema_last_started_idx: int = -1
var cinema_film_screen_counts: Dictionary = {"film_moon_rabbit_post": 0, "film_cloud_whale": 0, "film_lighthouse_lights": 0}
var unlocked_films: Dictionary = {"film_moon_rabbit_post": false, "film_cloud_whale": false, "film_lighthouse_lights": false}
var cinema_medals: int = 0
var cinema_screenings_total: int = 0
var cinema_screenings_cancelled: int = 0
var cinema_audience_total: int = 0
var cinema_ticket_gold_total: int = 0
var cinema_snack_gold_total: int = 0
var cinema_reputation_bonus: int = 0
var cinema_last_result: Dictionary = {}

## CI-12: Cloud Pottery Kiln Workshop (`云端陶艺窑坊`)
var pottery_kiln_unlocked: bool = false
var active_pottery_recipe_id: String = "pottery_tea_bowl"
var pottery_kiln_timer: float = 0.0
var pottery_inventory: Dictionary = {"clay_lump": 0, "pottery_tea_bowl": 0, "pottery_vase": 0}
var pottery_craft_counts: Dictionary = {"clay_lump": 0, "pottery_tea_bowl": 0, "pottery_vase": 0}
var unlocked_pottery_items: Dictionary = {"clay_lump": false, "pottery_tea_bowl": false, "pottery_vase": false}
var pottery_fuel_consumed: int = 0
var pottery_clay_dug_total: int = 0
var pottery_packed_in_boxes: int = 0
var pottery_reputation_bonus: int = 0

## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) & Island Four-Season Dress-Up (`岛屿四季装扮`) — no new building
## A festival in flight is never persisted (it restarts on its cooldown); its clock is the only time source of the kites.
var kite_festival_active: bool = false
var kite_festival_clock: float = 0.0
var kite_festivals_held: int = 0
var kite_festival_idx: int = 0
var kite_collected_slots: Array[int] = []
var kite_collect_counts: Dictionary = {"kite_carp": 0, "kite_bird": 0, "kite_star": 0}
var unlocked_kites: Dictionary = {"kite_carp": false, "kite_bird": false, "kite_star": false}
var kite_medals: int = 0
var kite_collected_total: int = 0
var kite_gold_total: int = 0
var kite_reputation_bonus: int = 0
var kite_last_result: Dictionary = {}
## Seasons: derived from the LOCAL calendar month. `season_clock` is injectable (returns a datetime Dictionary with at
## least `month`); an invalid Callable means the real system clock (`Time.get_datetime_dict_from_system()`).
var season_clock: Callable = Callable()
var current_season_id: String = ""
var season_refresh_timer: float = 0.0
var seasons_seen: Dictionary = {"spring": false, "summer": false, "autumn": false, "winter": false}

## Wish board: `WISH_SLOT_COUNT` notes, each {serial, islander, type, tier, target, progress, time_left, rep, vouchers, state, linger}
var wish_board: Array[Dictionary] = []
var wish_serial_next: int = 0
var wishes_fulfilled_total: int = 0
var wish_fulfilled_counts: Dictionary = {}
var wish_reputation_bonus: int = 0
var wish_vouchers_total: int = 0
var wish_medals: int = 0
var wish_last_result: Dictionary = {}
## Self-test isolation only (never saved): while true the tour and the wish board neither tick nor react to economy events,
## so the earlier economy assertions keep their exact voucher / gold deltas. Gameplay never sets it.
var wish_paused: bool = false

## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`) & Islander Birthday Party (`岛民生日会`) — no new building
## Both follow the island calendar = the injectable `season_clock` (CI-13): the weather is a pure function of the local
## 20-minute slot + season, the birthday of the local day-of-month. Neither is ever randomised.
var sky_weather_id: String = ""
var sky_weather_prev_id: String = ""
var sky_weather_slot_key: int = -1
var sky_weather_refresh_timer: float = 0.0
var sky_weathers_seen: Dictionary = {"sunny": false, "rain": false, "rainbow": false, "mist": false}
var sky_weather_changes: int = 0
var birthday_today_islander: String = ""
var birthday_today_key: String = ""
var birthday_announced_key: String = ""
## Date key (`YYYY-MM-DD`) of the last birthday that received its gift (one gift per birthday)
var birthday_last_gift_key: String = ""
var birthday_counts: Dictionary = {}
var birthday_parties_total: int = 0
var birthday_reputation_bonus: int = 0
var birthday_vouchers_total: int = 0
var birthday_favourite_gifts: int = 0
var birthday_medals: int = 0
var birthday_last_result: Dictionary = {}
## Self-test isolation only (never saved): while true the weather multipliers are neutral (x1.0) and neither the weather nor
## the birthday calendar refreshes, so the earlier assertions keep their exact numbers. Gameplay never sets it.
var sky_weather_paused: bool = false

## CI-16: Cloud-Isle Food Critics' Week (`云岛美食评鉴周`) & Islander Friendship Bonds (`岛民友谊羁绊`) — no new building
## The week, its judge and the judge's taste follow the island calendar (`season_clock`); never randomised.
var food_week_index: int = -1
var food_week_judge: String = ""
var food_week_announced_index: int = -1
## Dishes entered this week (ids, in order), their scores, the week's best score and medal tier (0 none .. 3 gold)
var food_week_entries: Array[String] = []
var food_week_scores: Array[int] = []
var food_week_best: int = 0
var food_week_tier: int = 0
var food_week_entries_total: int = 0
var food_week_medals: Dictionary = {"bronze": 0, "silver": 0, "gold": 0}
var food_week_reputation_bonus: int = 0
var food_week_vouchers_total: int = 0
## Best score ever per dish id (the codex card counts the dishes judged)
var food_week_dish_best: Dictionary = {}
var food_week_last_result: Dictionary = {}
var friendship_points: Dictionary = {}
var friendship_last_levelup: Dictionary = {}
## Self-test isolation only (never saved): while true the week does not refresh and no friendship point is earned, so the
## earlier assertions keep their exact numbers. Gameplay never sets it.
var food_friend_paused: bool = false

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
	_sync_steam_achievements()
	# CI-12: every soil-plot harvest turns up island clay for the pottery kiln
	if EventBus != null and not EventBus.item_produced.is_connected(_on_item_produced_for_kiln):
		EventBus.item_produced.connect(_on_item_produced_for_kiln)
	# CI-13: the island dress-up follows the local calendar month (northern-hemisphere seasons)
	refresh_season()
	# CI-14: the islanders' wish notes count real production and sales
	_connect_wish_board_signals()
	if wish_board.is_empty():
		_fill_wish_board()
	# CI-15: the cloud-sea weather and the islanders' birthdays follow the same island calendar as the seasons
	for isl_b in EconomyConfig.WISH_ISLANDERS:
		if not birthday_counts.has(isl_b):
			birthday_counts[isl_b] = 0
		if not friendship_points.has(isl_b):
			friendship_points[isl_b] = 0
	refresh_island_calendar()
	replace_impossible_orders()

## Achievements earned while Steam was away are handed over on the next start
func _sync_steam_achievements() -> void:
	if SteamBridge == null or not SteamBridge.steam_initialized:
		return
	for k in unlocked_achievements.keys():
		if bool(unlocked_achievements[k]):
			SteamBridge.set_achievement(String(k))

func reset_for_playtest_state() -> void:
	reset_guest_state()
	gold = START_GOLD
	total_gold_earned = START_GOLD
	till_gold = 0.0
	balloon_timer = BALLOON_FIRST_SEC
	lanterns_this_festival = 0
	lantern_encores = 0
	festival_gap_timer = Pacing.FESTIVAL_FIRST_SEC
	festival_turn = 0
	desktop_companion_mode = true
	amber = 0
	total_amber_earned = 0
	active_contract.clear()
	current_solar_term_idx = 3
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
	wish_lantern_festival_timer = 0.0
	wish_lanterns_collected = 0
	wish_lantern_reputation_bonus = 0
	chef_pavilion_unlocked = false
	active_tasting_dish_id = "dish_cloud_dumplings"
	chef_cook_timer = 0.0
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		tasting_cook_counts[td_id] = 0
		tasting_inventory[td_id] = 0
		unlocked_tasting_dishes[td_id] = false
		tasting_challenges_passed[td_id] = false
		tasting_best_scores[td_id] = 0
	chef_medals = 0
	chef_reputation_bonus = 0
	tastings_held = 0
	_reset_harbor_state()
	_reset_dairy_and_cinema_state()
	_reset_pottery_state()
	_reset_kite_and_season_state()
	_reset_wish_state()
	_reset_sky_weather_and_birthday_state()
	_reset_food_week_and_friendship_state()
	unlocked_landscapes = {
		"bee_hive": false,
		"wind_chime": false,
		"tiki_torch": false
	}
	unlocked_islands = {1: true, 2: false, 3: false}
	building_levels = {"soil_1": 1, "mortar": 1, "tea_pavilion": 1, "chef_pavilion": 1, "stall": 1, "soil_2": 1, "cauldron": 1, "greenhouse": 1, "soil_3": 1, "hotspring": 1, "lighthouse_harbor": 1, "windmill": 1, "dairy_workshop": 1, "pottery_kiln": 1}
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
		"coral_linked": {"crop_0": 0, "crop_1": 0, "crop_2": 0, "crop_3": 0}
	}
	workshop_outputs = {
		"mortar": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
		"cauldron": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0},
		"coral_linked": {"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0}
	}
	stall_inventory = {
		"crop_0": 3, "crop_1": 0, "crop_2": 0, "crop_3": 0,
		"delicacy_0": 0, "delicacy_1": 0, "delicacy_2": 0, "delicacy_3": 0
	}
	unlocked_codex = {
		"crop_0": true, "crop_1": false, "crop_2": false, "crop_3": false,
		"delicacy_0": false, "delicacy_1": false, "delicacy_2": false, "delicacy_3": false
	}
	generate_next_contract()
	generate_next_airship_order()
	pending_offline_seconds = 0
	pending_offline_gold = 0
	last_offline_report = {}
	pomodoro_active = false
	pomodoro_time_remaining = 0.0
	pomodoro_completed_count = 0
	gourmet_acclaim_timer = 0.0
	unlocked_achievements = {}
	career_stats = {"harvests": 0, "crafts": 0, "customers": 0, "contracts": 0}
	_sync_codex_from_progression()
	evaluate_achievements()

var _wall_prev: float = 0.0

## The window is closing: keep the last seconds too
func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST and not is_automated_test_mode:
		save_game()

func quit_game() -> void:
	save_game()
	get_tree().quit()

## The computer slept while the game was open: the gap pays like time away
func _check_sleep_gap() -> bool:
	var wall := Time.get_unix_time_from_system()
	var gap := wall - _wall_prev
	var slept := _wall_prev > 0.0 and gap > Pacing.SLEEP_GAP_SEC
	_wall_prev = wall
	if slept:
		if guests_while_away(gap) > 0:
			EventBus.guests_waiting.emit()
		calculate_and_apply_offline_earnings(int(minf(gap, 86400.0)))
	return slept

func _process(delta: float) -> void:
	if not is_automated_test_mode and _check_sleep_gap():
		delta = minf(delta, 1.0)
	save_timer += delta
	if save_timer >= 15.0:
		save_timer = 0.0
		save_game()

	accrue_till(delta)
	if frenzy_timer > 0.0:
		frenzy_timer = maxf(0.0, frenzy_timer - delta)
	if gourmet_acclaim_timer > 0.0:
		gourmet_acclaim_timer = maxf(0.0, gourmet_acclaim_timer - delta)

	if pomodoro_active:
		pomodoro_time_remaining -= delta
		if pomodoro_time_remaining <= 0.0:
			complete_pomodoro()

	weather_timer += delta
	if weather_timer >= Pacing.DAY_PHASE_SEC:
		weather_timer = 0.0
		set_weather((current_weather + 1) % 4)

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

	if tea_aura_timer > 0.0:
		tea_aura_timer = maxf(0.0, tea_aura_timer - delta)
	if moon_tea_gathering_timer > 0.0:
		moon_tea_gathering_timer = maxf(0.0, moon_tea_gathering_timer - delta)
	if tea_pavilion_unlocked and bool(unlocked_islands.get(1, true)):
		_tick_tea_pavilion(delta)

	if wish_lantern_festival_timer > 0.0:
		wish_lantern_festival_timer = maxf(0.0, wish_lantern_festival_timer - delta)
	if chef_pavilion_unlocked and bool(unlocked_islands.get(2, false)):
		_tick_chef_pavilion(delta)

	if lighthouse_harbor_unlocked and bool(unlocked_islands.get(3, false)):
		advance_harbor(delta)

	if dairy_workshop_unlocked and bool(unlocked_islands.get(1, true)):
		_tick_dairy_workshop(delta)
	if open_air_cinema_unlocked:
		advance_cinema(delta * Pacing.CINEMA_PACE)

	# CI-12: the pottery kiln fires on Island 3
	if pottery_kiln_unlocked and bool(unlocked_islands.get(3, false)):
		_tick_pottery_kiln(delta)

	# CI-13: kites in the air; the season follows the local calendar month
	if kite_festival_active:
		advance_kite_festival(delta * Pacing.KITE_PACE)
	_tick_festivals(delta)
	_tick_guests(delta)
	season_refresh_timer += delta
	if season_refresh_timer >= EconomyConfig.SEASON_REFRESH_SEC:
		season_refresh_timer = 0.0
		refresh_season()

	# CI-14: the islanders' wish notes tick on the board
	if not wish_paused:
		advance_wish_board(delta)

	# CI-15: the cloud-sea weather turns every three local hours; the birthday follows the local date
	if not sky_weather_paused:
		sky_weather_refresh_timer += delta
		if sky_weather_refresh_timer >= EconomyConfig.SKY_WEATHER_REFRESH_SEC:
			sky_weather_refresh_timer = 0.0
			refresh_island_calendar()

## ------------------------------------------------------------------------------------------------------------------
## Festivals: four of them, never two at once, `Pacing.FESTIVAL_GAP_SEC` apart (time away counts too)
## ------------------------------------------------------------------------------------------------------------------
var festival_gap_timer: float = Pacing.FESTIVAL_FIRST_SEC
const BALLOON_FIRST_SEC := 300.0
## Seconds until the next balloon (kept in the save, so a restart does not call one)
var balloon_timer: float = BALLOON_FIRST_SEC
var festival_turn: int = 0

func is_festival_unlocked(key: String) -> bool:
	match key:
		"kite": return bool(unlocked_islands.get(2, false))
		"moon_tea": return tea_pavilion_unlocked
		"parade": return windmill_unlocked
		"lantern": return bool(unlocked_islands.get(3, false))
	return false

func is_festival_active(key: String) -> bool:
	match key:
		"kite": return kite_festival_active
		"moon_tea": return is_moon_tea_gathering_active()
		"parade": return is_gourmet_parade_active()
		"lantern": return is_wish_lantern_festival_active()
	return false

func get_active_festival() -> String:
	for k in Pacing.FESTIVAL_ORDER:
		if is_festival_active(k):
			return k
	return ""

func is_festival_ready() -> bool:
	return get_active_festival() == "" and festival_gap_timer <= 0.0

func get_seconds_to_festival() -> float:
	return maxf(0.0, festival_gap_timer)

## The next festival in turn among the unlocked ones ("" before Island 2)
func get_next_festival() -> String:
	for i in range(Pacing.FESTIVAL_ORDER.size()):
		var k: String = Pacing.FESTIVAL_ORDER[(festival_turn + i) % Pacing.FESTIVAL_ORDER.size()]
		if is_festival_unlocked(k):
			return k
	return ""

func try_start_festival(key: String) -> bool:
	if not is_festival_unlocked(key) or not is_festival_ready():
		return false
	var ok := false
	match key:
		"kite": ok = start_kite_festival()
		"moon_tea": ok = start_moon_tea_gathering()
		"parade": ok = start_gourmet_parade_festival()
		"lantern": ok = start_wish_lantern_festival()
	if ok:
		festival_gap_timer = Pacing.FESTIVAL_GAP_SEC
		festival_turn = Pacing.FESTIVAL_ORDER.find(key) + 1
	return ok

func _tick_festivals(delta: float) -> void:
	if get_active_festival() != "" or get_next_festival() == "":
		return
	festival_gap_timer -= delta
	if festival_gap_timer <= -Pacing.FESTIVAL_AUTO_SEC:
		try_start_festival(get_next_festival())

func set_weather(next_weather: int) -> void:
	current_weather = clampi(next_weather, 0, 3)
	if SoundManager != null:
		SoundManager.sync_ambient_to_phase(current_weather)
	EventBus.weather_changed.emit(current_weather)

func trigger_gourmet_acclaim(duration: float = GOURMET_ACCLAIM_DURATION) -> void:
	gourmet_acclaim_timer = maxf(gourmet_acclaim_timer, duration)
	EventBus.gourmet_acclaim_started.emit(gourmet_acclaim_timer)

func is_gourmet_acclaim_active() -> bool:
	return gourmet_acclaim_timer > 0.0

## The day-cycle drizzle (a passing shower over the market island) waters the fields x1.35
func get_daycycle_drizzle_crop_mult() -> float:
	return 1.35 if current_weather == WeatherState.RAIN else 1.0

func get_weather_crop_growth_multiplier() -> float:
	var mult := get_daycycle_drizzle_crop_mult()
	if frenzy_timer > 0.0:
		mult *= 1.6
	return mult

func get_weather_vip_chance() -> float:
	var base_c := 0.36 if (current_weather == WeatherState.DUSK or current_weather == WeatherState.NIGHT) else 0.18
	if frenzy_timer > 0.0:
		base_c = maxf(base_c, 0.50)
	return base_c

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
	var reward := income_gold(POMODORO_REWARD_SEC, 60)
	add_gold(reward)
	trigger_carnival_frenzy(POMODORO_FRENZY_DURATION)
	var report := {
		"gold": reward,
		"frenzy_sec": POMODORO_FRENZY_DURATION,
		"completed_count": pomodoro_completed_count
	}
	EventBus.pomodoro_completed.emit(reward, POMODORO_FRENZY_DURATION)
	save_game()
	return report

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
	if EconomyConfig.is_tasting_dish(item_id):
		unlock_tasting_dish(item_id)
		return
	if EconomyConfig.is_bakery_item(item_id):
		unlock_bakery_item(item_id)
		return
	if EconomyConfig.is_dairy_item(item_id):
		unlock_dairy_item(item_id)
		return
	if EconomyConfig.is_pottery_item(item_id):
		unlock_pottery_item(item_id)
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
	var info := get_current_solar_term()
	EventBus.solar_term_changed.emit(current_solar_term_idx, String(info.get("name", "春分")), String(info.get("dish_id", "solar_dish_spring")))
	return info

## The solar term of the real calendar
func refresh_solar_term() -> void:
	var dt := get_local_datetime()
	var idx := EconomyConfig.calc_solar_term(int(dt["month"]), int(dt["day"]))
	if idx != current_solar_term_idx:
		set_solar_term(idx)
		replace_impossible_orders()

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

## Every picture in the collection counts the same: +1% income each
func get_collection_count() -> int:
	return (get_unlocked_codex_count() + get_unlocked_solar_dish_count() + get_unlocked_flora_count() + get_unlocked_souvenir_count() + get_unlocked_bath_count()
		+ get_unlocked_bakery_count() + get_unlocked_tea_count() + get_passed_tasting_challenge_count() + get_unlocked_dairy_count() + get_unlocked_film_count()
		+ get_unlocked_pottery_count() + get_met_guest_count() + get_unlocked_kite_count() + get_seen_season_count() + get_seen_sky_weather_count() + get_celebrated_islander_count())

func get_collection_multiplier() -> float:
	return 1.0 + Pacing.CODEX_PER_ENTRY * float(get_collection_count()) + get_friendship_price_bonus()

## Short-lived price bonuses shared by every sale
func get_market_mood_multiplier() -> float:
	var mult := 1.0
	var s_term := get_current_solar_term()
	if String(s_term.get("buff_type", "")) == "price_bonus":
		mult *= (1.0 + float(s_term.get("buff_val", 0.15)))
	if gourmet_acclaim_timer > 0.0:
		mult *= GOURMET_PRICE_BONUS_MULT
	return mult

## ------------------------------------------------------------------------------------------------------------------
## Income core (numbers in `src/data/Pacing.gd`): the isle earns `estimate_idle_gold_per_sec()`; the money waits in the till and
## customers pay it out, so income never depends on how many customers happen to walk by.
## ------------------------------------------------------------------------------------------------------------------
func get_active_lines() -> Dictionary:
	var out := {}
	for k in Pacing.RATE.keys():
		if is_line_open(String(k)):
			out[k] = int(building_levels.get(k, 1))
	return out

func is_line_open(key: String) -> bool:
	if not bool(unlocked_islands.get(int(Pacing.ISLE.get(key, 1)), false)):
		return false
	match key:
		"greenhouse": return greenhouse_unlocked
		"hotspring": return hotspring_unlocked
		"windmill": return windmill_unlocked
		"tea_pavilion": return tea_pavilion_unlocked
		"chef_pavilion": return chef_pavilion_unlocked
		"lighthouse_harbor": return lighthouse_harbor_unlocked
		"dairy_workshop": return dairy_workshop_unlocked
		"pottery_kiln": return pottery_kiln_unlocked
	return true

func estimate_idle_gold_per_sec() -> float:
	var lv_sum := 0
	var heads := 0
	for k in animal_levels.keys():
		lv_sum += int(animal_levels[k])
		heads += get_total_recruited(String(k))
	return Pacing.gold_per_sec(get_active_lines(), lv_sum, heads, get_collection_multiplier())

## Every reward in the game is worth `sec` seconds of income (never less than `floor_gold`)
func income_gold(sec: float, floor_gold: int = 1) -> int:
	return maxi(floor_gold, int(round(estimate_idle_gold_per_sec() * sec)))

func accrue_till(delta: float) -> void:
	var gps := estimate_idle_gold_per_sec()
	till_gold = minf(till_gold + gps * delta, gps * Pacing.TILL_CAP_SEC)

## A customer pays `share` of the till; the live bonuses on top are capped together
func collect_from_till(share: float, bonus: float = 1.0) -> int:
	var cut := till_gold * clampf(share, 0.0, 1.0)
	till_gold -= cut
	return maxi(1, int(round(cut * clampf(bonus, 1.0, Pacing.LIVE_BONUS_CAP))))

## Tips are a tenth of what a customer pays, so "+20% tips" adds 2%
func get_tip_bonus(is_vip: bool, island: int = 3) -> float:
	return 1.0 + Pacing.TIP_SHARE * (get_customer_tip_multiplier(is_vip, island) - 1.0)

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

## What the fields (`crops`) or the workshops make at their present level; nothing else can still be ordered
func get_produced_items(crops: bool) -> Array[String]:
	var out: Array[String] = []
	for isl in [1, 2, 3]:
		if isl > 1 and not bool(unlocked_islands.get(isl, false)):
			continue
		var id := ""
		if crops:
			id = EconomyConfig.get_evolved_crop_id(isl, int(building_levels.get("soil_%d" % isl, 1)))
		else:
			var wid: String = ["mortar", "cauldron", "coral_linked"][isl - 1]
			id = EconomyConfig.get_evolved_delicacy_id(wid, int(building_levels.get("soil_3" if isl == 3 else wid, 1)))
		if not out.has(id):
			out.append(id)
	return out

## What lies on the stall, in the workshops and in the field baskets
func _count_island_stock(item_id: String) -> int:
	var n := int(stall_inventory.get(item_id, 0))
	for wid in workshop_outputs.keys():
		n += int(workshop_outputs[wid].get(item_id, 0))
	for isl in raw_baskets.keys():
		n += int(raw_baskets[isl].get(item_id, 0))
	return n

## What an order still lacks and nothing makes any more is swapped for what is made now; what was already loaded comes back
func replace_impossible_orders() -> void:
	var crops := get_produced_items(true)
	var dishes := get_produced_items(false)
	if not active_contract.is_empty():
		var want := String(active_contract.get("target_item", ""))
		var left := int(active_contract.get("required_count", 1)) - int(active_contract.get("current_count", 0))
		if not crops.has(want) and not dishes.has(want) and _count_island_stock(want) < left:
			generate_next_contract()
	var changed := false
	for entry in active_airship_order.get("items", []):
		if not (entry is Dictionary):
			continue
		var id := String(entry.get("item_id", ""))
		var done := int(entry.get("delivered", 0))
		var lack := int(entry.get("required", 1)) - done
		var now := ""
		if lack <= 0 or _count_island_stock(id) >= lack:
			continue
		if EconomyConfig.CROPS.has(id) and not crops.has(id):
			now = crops[0]
		elif EconomyConfig.DELICACIES.has(id) and not dishes.has(id):
			now = dishes[0]
		elif EconomyConfig.is_solar_specialty_dish(id) and id != get_current_solar_dish_id():
			now = get_current_solar_dish_id()
		if now == "":
			continue
		if done > 0:
			stall_inventory[id] = int(stall_inventory.get(id, 0)) + done
			EventBus.inventory_changed.emit()
		entry["item_id"] = now
		entry["name"] = EconomyConfig.get_item_raw_name(now)
		entry["delivered"] = 0
		changed = true
	if changed:
		EventBus.airship_state_changed.emit(airship_docked, active_airship_order)

func generate_next_contract() -> Dictionary:
	var available_items := get_produced_items(true)
	available_items.append_array(get_produced_items(false))

	var prev_idx: int = int(active_contract.get("contract_index", 0))
	var next_idx: int = prev_idx + 1
	var chosen_item: String = available_items[next_idx % available_items.size()]
	var item_name: String = chosen_item
	if EconomyConfig.CROPS.has(chosen_item):
		item_name = String(EconomyConfig.CROPS[chosen_item].get("name", chosen_item))
	elif EconomyConfig.DELICACIES.has(chosen_item):
		item_name = String(EconomyConfig.DELICACIES[chosen_item].get("name", chosen_item))

	var req_cnt: int = 3 + (next_idx % 4)
	var rew_gold: int = income_gold(6.0 + 2.0 * float(req_cnt), 20)
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
	var rew_gold := int(completed.get("reward_gold", 20))
	var rew_amber := int(completed.get("reward_amber", 2))
	add_gold(rew_gold)
	add_amber(rew_amber)
	EventBus.contract_completed.emit(completed)
	EventBus.spawn_floating_text.emit(
		Vector2(1022.7, EconomyConfig.GROUND_Y - 40.0),
		EconomyConfig.tr_fmt("ft_contract_done", [rew_gold, rew_amber]),
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
				Vector2(1022.7, EconomyConfig.GROUND_Y - 48.0),
				EconomyConfig.tr_fmt("ft_voucher_recipe", [d_name]),
				Color("#8CE99A")
			)
			save_game()
			return {"redeemed": true, "unlocked_dish": dk, "bonus_amber": 0, "bonus_gold": 0}
	# All 4 seasonal specialty dishes already unlocked -> collector dividend + 2 seasonal specialty dishes
	var div_amber := 1
	var div_gold := income_gold(2.0, 5)
	add_amber(div_amber)
	add_gold(div_gold)
	var cur_sd := get_current_solar_dish_id()
	add_to_stall(cur_sd, 2)
	EventBus.spawn_floating_text.emit(
		Vector2(1022.7, EconomyConfig.GROUND_Y - 48.0),
		EconomyConfig.tr_fmt("ft_four_seasons_perk", [div_amber, div_gold]),
		Color("#FFE066")
	)
	save_game()
	return {"redeemed": true, "unlocked_dish": cur_sd, "bonus_amber": div_amber, "bonus_gold": div_gold}

func dock_airship_caravan(force_new_order: bool = false) -> Dictionary:
	airship_docked = true
	airship_timer = AIRSHIP_DOCK_DURATION
	if force_new_order or active_airship_order.is_empty():
		generate_next_airship_order()
	else:
		replace_impossible_orders()
	EventBus.airship_state_changed.emit(true, active_airship_order)
	return active_airship_order

func generate_next_airship_order() -> Dictionary:
	var prev_idx := int(active_airship_order.get("order_index", 0))
	var next_idx := prev_idx + 1

	var crop_pool := get_produced_items(true)
	var del_pool := get_produced_items(false)

	var pick_crop := crop_pool[next_idx % crop_pool.size()]
	var pick_del := del_pool[next_idx % del_pool.size()]
	var pick_solar := get_current_solar_dish_id()

	var req_crop := 3 + (next_idx % 3)
	var req_del := 2 + (next_idx % 2)
	var req_solar := 1 + ((next_idx + 1) % 2)

	var combo_items: Array[Dictionary] = [
		{
			"item_id": pick_crop,
			"name": EconomyConfig.get_item_raw_name(pick_crop),
			"required": req_crop,
			"delivered": 0
		},
		{
			"item_id": pick_del,
			"name": EconomyConfig.get_item_raw_name(pick_del),
			"required": req_del,
			"delivered": 0
		},
		{
			"item_id": pick_solar,
			"name": EconomyConfig.get_item_raw_name(pick_solar),
			"required": req_solar,
			"delivered": 0
		}
	]

	var rew_gold := income_gold(45.0, 60)
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
			if not EconomyConfig.is_zh() and String(entry.get("item_id", "")) != "":
				nm = EconomyConfig.get_item_short_label(String(entry.get("item_id", "")))
			elif nm.length() > 3:
				nm = nm.substr(nm.length() - 2, 2) if nm.begins_with("春分") or nm.begins_with("夏至") or nm.begins_with("秋分") or nm.begins_with("冬至") else nm.substr(0, 3)
			parts.append("%s%d/%d" % [nm, mini(d, r), r])
	return {
		"delivered": sum_del,
		"required": maxi(1, sum_req),
		"brief": "·".join(parts),
		"reward_amber": int(ord.get("reward_amber", 4)),
		"reward_vouchers": int(ord.get("reward_vouchers", 1)),
		"reward_gold": int(ord.get("reward_gold", 60))
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
		for wid in ["mortar", "cauldron", "coral_linked"]:
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
	var rew_gld := int(ord.get("reward_gold", 60))
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
	var rew_gold := int(completed.get("reward_gold", 60))
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
		EconomyConfig.tr_fmt("ft_airship_done", [rew_gold, rew_amber, rew_vouchers]),
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
		Vector2(float(cfg.get("x_pos", 619.8)), EconomyConfig.GROUND_Y - 30.0),
		EconomyConfig.tr_fmt("ft_landscape", [EconomyConfig.tr_name(String(cfg.get("name", landscape_id)))]),
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
	# CI-13: spring blossom props (+2% per prop) and the kite-festival wind (production x(1 + 0.25 w))
	mult *= get_season_bonus_multiplier("crop_growth") * get_kite_wind_production_multiplier()
	# CI-15: the cloud-sea weather joins the climate group (drizzle x season props x kite wind), bonus capped at x1.50
	mult *= get_sky_weather_stacked_factor("crop", get_daycycle_drizzle_crop_mult() * get_season_bonus_multiplier("crop_growth") * get_kite_wind_production_multiplier())
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
	# CI-13: autumn maple & pumpkin props (+2% per prop) and the kite-festival wind (production x(1 + 0.25 w))
	mult *= get_season_bonus_multiplier("workshop_speed") * get_kite_wind_production_multiplier()
	# CI-15: the cloud-sea weather joins the climate group (season props x kite wind), bonus capped at x1.50
	mult *= get_sky_weather_stacked_factor("workshop", get_season_bonus_multiplier("workshop_speed") * get_kite_wind_production_multiplier())
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
	# CI-13: winter snowman props (+2% per prop)
	mult *= get_season_bonus_multiplier("tip_bonus")
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
	var gold_gain := income_gold(1.5 * float(taken), taken)
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
		for wid in ["coral_linked", "cauldron", "mortar"]:
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
		for wid in ["coral_linked", "cauldron", "mortar"]:
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
		EconomyConfig.tr_key("ft_gh_open"),
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
					EconomyConfig.tr_fmt("ft_flora_bred", [EconomyConfig.get_item_display_name(cand_id)]),
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
	for wid in ["mortar", "cauldron", "coral_linked"]:
		if workshop_outputs.has(wid):
			for dk in workshop_outputs[wid].keys():
				sum_d += maxi(0, int(workshop_outputs[wid][dk]))
	for sk in stall_inventory.keys():
		var s_key := String(sk)
		if s_key.begins_with("delicacy_") or EconomyConfig.is_solar_specialty_dish(s_key):
			sum_d += maxi(0, int(stall_inventory[sk]))
	# CI-12: kiln-fired wares on the kiln shelf can be packed into gift boxes too
	sum_d += get_total_pottery_ware_count()
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
		# CI-12: a fired tea bowl / celadon vase from the Cloud Pottery Kiln shelf is packed as the gift ware first
		for pc in bcfg.get("pottery_candidates", []):
			if get_pottery_stock(String(pc)) > 0:
				picked_wid = "kiln"
				picked_dish = String(pc)
				break
		for dc in dish_cands:
			if picked_dish != "":
				break
			var d_id := String(dc)
			for wid in ["coral_linked", "cauldron", "mortar"]:
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
		elif picked_wid == "kiln":
			pottery_inventory[picked_dish] = maxi(0, get_pottery_stock(picked_dish) - 1)
			pottery_packed_in_boxes += 1
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
	var total_gold := collect_from_till(0.8, float(bcfg.get("collector_mult", 1.55)) * get_market_mood_multiplier() * get_tip_bonus(true, 3))
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
		Vector2(CloudHotspringInn.SLOT_X, EconomyConfig.GROUND_Y - 62.0),
		EconomyConfig.tr_key("ft_hs_open"),
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
					Vector2(CloudHotspringInn.SLOT_X, EconomyConfig.GROUND_Y - 62.0),
					EconomyConfig.tr_fmt("ft_bath_recipe", [EconomyConfig.get_item_display_name(cand_id)]),
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
	var full := false
	for bath_id in cands:
		if int(bath_inventory.get(bath_id, 0)) >= maxi(14, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("hotspring", 1))))):
			full = true
			continue
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
		# a better bath that is merely sold in stock stays the chosen one
		if not full:
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
	return {"brewed": false, "full": full, "bath_id": "", "stock": get_total_bath_stock_count()}

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
	var total_gold := collect_from_till(0.8, float(bcfg.get("vip_tip_mult", 1.70)) * get_market_mood_multiplier() * get_tip_bonus(true, 3))
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
	unlock_bakery_item("flour_golden_wheat")
	bakery_inventory["flour_golden_wheat"] = maxi(1, int(bakery_inventory.get("flour_golden_wheat", 0)))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.windmill_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(397.9, EconomyConfig.GROUND_Y - 52.0),
		EconomyConfig.tr_key("ft_wm_open"),
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
					Vector2(397.9, EconomyConfig.GROUND_Y - 52.0),
					EconomyConfig.tr_fmt("ft_bake_recipe", [EconomyConfig.get_item_display_name(cand_id)]),
					Color("#FFE066")
				)
				break
	return newly_unlocked

func mill_golden_wheat_flour(prefer_flora: bool = false, allow_wind_fallback: bool = false) -> Dictionary:
	if not windmill_unlocked:
		return {"milled": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_flour_stock_count()}
	if get_flour_stock_count() >= maxi(14, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("windmill", 1))))):
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
	var full := false
	for bread_id in cands:
		if int(bakery_inventory.get(bread_id, 0)) >= maxi(14, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("windmill", 1))))):
			windmill_aroma_timer = maxf(windmill_aroma_timer, 38.0)
			full = true
			continue
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
		var added := maxi(0, mini(yield_qty, cap - cur_stock))
		bakery_inventory[bread_id] = cur_stock + added
		bakery_craft_counts[bread_id] = int(bakery_craft_counts.get(bread_id, 0)) + 1
		unlock_bakery_item("flour_golden_wheat")
		unlock_bakery_item(bread_id)
		if not full:
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
	return {"baked": false, "full": full, "bread_id": "", "stock": get_total_bread_stock_count()}

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
	var parade_mult := clampf(float(bcfg.get("parade_mult", 1.78)), 1.75, 1.90)
	var total_gold := collect_from_till(0.8, parade_mult * get_market_mood_multiplier() * get_tip_bonus(true, 2))
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
	unlock_tea_item("tea_spring_leaves")
	tea_inventory["tea_spring_leaves"] = maxi(1, int(tea_inventory.get("tea_spring_leaves", 0)))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.tea_pavilion_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(950.7, EconomyConfig.GROUND_Y - 58.0),
		EconomyConfig.tr_key("ft_tp_open"),
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
					Vector2(950.7, EconomyConfig.GROUND_Y - 58.0),
					EconomyConfig.tr_fmt("ft_tea_recipe", [EconomyConfig.get_item_display_name(cand_id)]),
					Color("#88FFD0")
				)
				break
	return newly_unlocked

func roast_tea_spring_leaves(prefer_flora: bool = false, allow_dew_fallback: bool = false) -> Dictionary:
	if not tea_pavilion_unlocked:
		return {"roasted": false, "qty": 0, "crop_id": "", "flora_id": "", "stock": get_tea_leaves_stock_count()}
	if get_tea_leaves_stock_count() >= maxi(14, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("tea_pavilion", 1))))):
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
	var full := false
	for tea_id in cands:
		if is_stall_full() and int(tea_inventory.get(tea_id, 0)) >= maxi(14, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("tea_pavilion", 1))))):
			tea_aura_timer = maxf(tea_aura_timer, 40.0)
			full = true
			continue
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
		var added := maxi(0, mini(yield_qty, cap - cur_stock))
		tea_inventory[tea_id] = cur_stock + added
		tea_craft_counts[tea_id] = int(tea_craft_counts.get(tea_id, 0)) + 1
		unlock_tea_item("tea_spring_leaves")
		unlock_tea_item(tea_id)
		if not full:
			active_tea_recipe_id = tea_id
		tea_aura_timer = maxf(tea_aura_timer, 40.0)
		career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
		# Also stock freshly brewed tea to MarketStall when stall buffer has room
		var shelved := add_to_stall(tea_id, 1) if not is_stall_full() else 0
		var unlocked_next := _check_tea_recipe_progression(tea_id)
		if SoundManager != null:
			SoundManager.play_pop_sfx()
		EventBus.tea_brewed.emit(tea_id, int(tea_inventory[tea_id]))
		evaluate_achievements()
		EventBus.inventory_changed.emit()
		return {
			"brewed": true,
			"tea_id": tea_id,
			"qty": added if added > 0 else shelved,
			"flora_id": used_flora,
			"stock": int(tea_inventory[tea_id]),
			"unlocked_next": unlocked_next
		}
	return {"brewed": false, "full": full, "tea_id": "", "stock": get_total_brewed_tea_stock_count()}

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
	if moon_tea_gathering_timer <= 0.0:
		moon_tea_boat_claimed = false
	moon_tea_gathering_timer = maxf(moon_tea_gathering_timer, maxf(8.0, duration))
	tea_aura_timer = maxf(tea_aura_timer, moon_tea_gathering_timer)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.moon_tea_gathering_started.emit(moon_tea_gathering_timer)
	EventBus.spawn_floating_text.emit(
		Vector2(1192.0, 74.0),
		EconomyConfig.tr_key("ft_moontea_open"),
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
				EconomyConfig.tr_fmt("ft_moontea_need", [UiKit.num(EconomyConfig.TEA_PAVILION_UNLOCK_COST_GOLD)]),
				Color("#FFF4D6")
			)
			return {"claimed": false, "amber": 0, "vouchers": 0, "rep_gained": 0, "buff_mult": 1.0}
	if (not is_moon_tea_gathering_active() and not try_start_festival("moon_tea")) or moon_tea_boat_claimed:
		return {"claimed": false, "amber": 0, "vouchers": 0, "rep_gained": 0, "buff_mult": 1.0}
	moon_tea_boat_claimed = true
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
		EconomyConfig.tr_fmt("ft_moontea_reward", [amber_gain, voucher_gain, rep_gain]),
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
	var moon_mult := get_moon_tea_sale_multiplier(target_tea)
	var connoisseur_mult := 1.42 * moon_mult
	var total_gold := collect_from_till(0.8, connoisseur_mult * get_market_mood_multiplier() * (1.0 + Pacing.TIP_SHARE * (get_tea_aura_tip_multiplier() - 1.0)))
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
## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) & Mountain-Sea Master Chef Tasting Pavilion (`山海特级食神品鉴席`)
## ==================================================================
func start_wish_lantern_festival(duration: float = WISH_LANTERN_FESTIVAL_DURATION) -> bool:
	if wish_lantern_festival_timer <= 0.0:
		lanterns_this_festival = 0
		lantern_encores = 0
	wish_lantern_festival_timer = maxf(wish_lantern_festival_timer, maxf(8.0, duration))
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.wish_lantern_festival_started.emit(wish_lantern_festival_timer)
	EventBus.spawn_floating_text.emit(
		Vector2(1150.0, 70.0),
		EconomyConfig.tr_key("ft_lantern_open"),
		Color("#FFD8A8")
	)
	return true

func is_wish_lantern_festival_active() -> bool:
	return wish_lantern_festival_timer > 0.0

func get_wish_lantern_sale_multiplier(_item_id: String = "") -> float:
	if not is_wish_lantern_festival_active():
		return 1.0
	return EconomyConfig.WISH_LANTERN_SALE_BUFF_MULT

func get_wish_lantern_tasting_bonus() -> int:
	return EconomyConfig.WISH_LANTERN_TASTING_SCORE_BONUS if is_wish_lantern_festival_active() else 0

func can_claim_wish_lantern() -> bool:
	return is_wish_lantern_festival_active() and lanterns_this_festival < Pacing.LANTERNS_PER_FESTIVAL

func claim_wish_lantern(lantern_idx: int, world_pos: Vector2) -> Dictionary:
	if not can_claim_wish_lantern():
		return {"claimed": false, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "wish_total": wish_lanterns_collected, "wish_granted": false}
	var chef_lv := maxi(1, int(building_levels.get("chef_pavilion", 1))) if chef_pavilion_unlocked else 0
	var gold_gain := income_gold(8.0, 5)
	var amber_gain := 2 + (1 if chef_pavilion_unlocked else 0) + int(floor(float(chef_lv) / 5.0))
	var voucher_gain := 1
	var rep_gain := 30 + chef_lv * 4
	wish_lanterns_collected += 1
	lanterns_this_festival += 1
	var wish_granted := (wish_lanterns_collected % WISH_LANTERN_WISH_BONUS_EVERY) == 0
	if wish_granted:
		# `祈愿成真`: every 3rd lantern wish grants bonus Amber and extends the festival night
		amber_gain += 3
		wish_lantern_festival_timer += 6.0
	add_gold(gold_gain)
	add_amber(amber_gain)
	add_rare_voucher(voucher_gain)
	wish_lantern_reputation_bonus += rep_gain
	if SoundManager != null:
		SoundManager.play_coin_sfx()
	evaluate_achievements()
	EventBus.wish_lantern_claimed.emit(lantern_idx, gold_gain, amber_gain, voucher_gain, wish_lanterns_collected)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		world_pos + Vector2(0.0, -26.0),
		(EconomyConfig.tr_key("ft_wish_granted") if wish_granted else EconomyConfig.tr_key("ft_lantern_wish")) + EconomyConfig.tr_fmt("ft_lantern_reward", [gold_gain, amber_gain, voucher_gain]),
		Color("#FFE066") if wish_granted else Color("#FFD8A8")
	)
	save_game()
	return {
		"claimed": true,
		"gold": gold_gain,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"wish_total": wish_lanterns_collected,
		"wish_granted": wish_granted
	}

func unlock_chef_pavilion(free_for_test: bool = false) -> bool:
	if chef_pavilion_unlocked:
		return false
	if free_for_test:
		unlocked_islands[2] = true
	if not bool(unlocked_islands.get(2, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.CHEF_PAVILION_UNLOCK_COST_GOLD):
		return false
	chef_pavilion_unlocked = true
	active_tasting_dish_id = "dish_cloud_dumplings"
	chef_cook_timer = 0.0
	unlock_tasting_dish("dish_cloud_dumplings")
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.chef_pavilion_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.CHEF_PAVILION_SLOT_X, EconomyConfig.GROUND_Y - 56.0),
		EconomyConfig.tr_key("ft_cp_open"),
		Color("#FFD8A8")
	)
	evaluate_achievements()
	save_game()
	return true

func unlock_tasting_dish(dish_id: String) -> bool:
	if not EconomyConfig.TASTING_DISHES.has(dish_id):
		return false
	if bool(unlocked_tasting_dishes.get(dish_id, false)):
		return false
	unlocked_tasting_dishes[dish_id] = true
	EventBus.tasting_dish_unlocked.emit(dish_id)
	EventBus.codex_unlocked.emit(dish_id)
	evaluate_achievements()
	return true

func get_unlocked_tasting_dish_count() -> int:
	var cnt := 0
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		if bool(unlocked_tasting_dishes.get(td_id, false)):
			cnt += 1
	return cnt

func get_passed_tasting_challenge_count() -> int:
	var cnt := 0
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		if bool(tasting_challenges_passed.get(td_id, false)):
			cnt += 1
	return cnt

func get_total_tasting_dish_stock_count() -> int:
	var s := 0
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		s += maxi(0, int(tasting_inventory.get(td_id, 0)))
	return s

func get_chef_cook_ratio() -> float:
	if not chef_pavilion_unlocked:
		return 0.0
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(active_tasting_dish_id, EconomyConfig.TASTING_DISHES["dish_cloud_dumplings"])
	var req := maxf(2.0, float(dcfg.get("cook_time", 8.0)))
	return clampf(chef_cook_timer / req, 0.0, 1.0)

func cycle_tasting_dish() -> String:
	var unlocked_list: Array[String] = []
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		if bool(unlocked_tasting_dishes.get(td_id, false)):
			unlocked_list.append(td_id)
	if unlocked_list.is_empty():
		unlocked_list.append("dish_cloud_dumplings")
	var cur_i := unlocked_list.find(active_tasting_dish_id)
	active_tasting_dish_id = unlocked_list[(cur_i + 1) % unlocked_list.size()]
	chef_cook_timer = 0.0
	return active_tasting_dish_id

## Every existing ingredient pool a tasting dish may draw from, ordered so that production buffers are used before the Market Stall shelf.
func _get_tasting_ingredient_pools() -> Array[Dictionary]:
	var pools: Array[Dictionary] = []
	for isl in [1, 2, 3]:
		if raw_baskets.has(isl):
			pools.append(raw_baskets[isl])
	for ws_id in ["mortar", "cauldron", "coral_linked"]:
		if workshop_outputs.has(ws_id):
			pools.append(workshop_outputs[ws_id])
	pools.append(bakery_inventory)
	pools.append(tea_inventory)
	pools.append(flora_inventory)
	# CI-10: fresh catch landed at the Lighthouse Harbor feeds the tasting dishes before the stall shelf is touched
	pools.append(harbor_seafood_inventory)
	# CI-11: milk / cheese / cloud pudding from the Cloud Ranch Dairy Workshop
	pools.append(dairy_inventory)
	pools.append(stall_inventory)
	return pools

func _count_tasting_ingredient(item_id: String) -> int:
	var total := 0
	for pool in _get_tasting_ingredient_pools():
		total += maxi(0, int(pool.get(item_id, 0)))
	return total

func _take_tasting_ingredient(item_id: String) -> bool:
	for pool in _get_tasting_ingredient_pools():
		var have := int(pool.get(item_id, 0))
		if have > 0:
			pool[item_id] = have - 1
			return true
	return false

## Picks one concrete ingredient per recipe slot (respecting duplicates across slots). Returns `[]` when the recipe cannot be completed.
func _plan_tasting_ingredients(dish_id: String) -> Array[String]:
	var plan: Array[String] = []
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(dish_id, {})
	var slots: Array = dcfg.get("ingredients", [])
	var reserved: Dictionary = {}
	for slot in slots:
		var picked := ""
		for cand in slot:
			var cid := String(cand)
			if _count_tasting_ingredient(cid) - int(reserved.get(cid, 0)) > 0:
				picked = cid
				break
		if picked == "":
			return []
		reserved[picked] = int(reserved.get(picked, 0)) + 1
		plan.append(picked)
	return plan

## Idle fallback: when a combo slot is missing, any harvested crop from the three islands' field baskets stands in for it.
func _plan_tasting_fallback(dish_id: String) -> Array[String]:
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(dish_id, {})
	var need := (dcfg.get("ingredients", []) as Array).size()
	var plan: Array[String] = []
	var reserved: Dictionary = {}
	for _i in range(need):
		var picked := ""
		for cid in ["crop_3", "crop_2", "crop_1", "crop_0"]:
			var avail := 0
			for isl in [1, 2, 3]:
				avail += maxi(0, int(raw_baskets.get(isl, {}).get(cid, 0)))
			if avail - int(reserved.get(cid, 0)) > 0:
				picked = cid
				break
		if picked == "":
			return []
		reserved[picked] = int(reserved.get(picked, 0)) + 1
		plan.append(picked)
	return plan

func cook_tasting_dish(preferred_dish_id: String = "", allow_fallback: bool = false) -> Dictionary:
	if not chef_pavilion_unlocked:
		return {"cooked": false, "dish_id": "", "stock": get_total_tasting_dish_stock_count(), "ingredients": []}
	var dish_id := active_tasting_dish_id
	if preferred_dish_id != "" and EconomyConfig.is_tasting_dish(preferred_dish_id) and bool(unlocked_tasting_dishes.get(preferred_dish_id, false)):
		dish_id = preferred_dish_id
	if not bool(unlocked_tasting_dishes.get(dish_id, false)):
		dish_id = "dish_cloud_dumplings"
	if is_stall_full() and int(tasting_inventory.get(dish_id, 0)) >= maxi(12, EconomyConfig.calc_buffer_capacity(maxi(1, int(building_levels.get("chef_pavilion", 1))))):
		return {"cooked": false, "dish_id": dish_id, "stock": get_total_tasting_dish_stock_count(), "ingredients": []}
	var plan := _plan_tasting_ingredients(dish_id)
	var used_fallback := false
	if plan.is_empty() and allow_fallback:
		plan = _plan_tasting_fallback(dish_id)
		used_fallback = not plan.is_empty()
	if plan.is_empty():
		return {"cooked": false, "dish_id": dish_id, "stock": get_total_tasting_dish_stock_count(), "ingredients": []}
	for ing in plan:
		_take_tasting_ingredient(ing)
	var lv := maxi(1, int(building_levels.get("chef_pavilion", 1)))
	var yield_qty := 1 + int(floor(float(lv) / 5.0))
	var cap := maxi(12, EconomyConfig.calc_buffer_capacity(lv))
	var cur_stock := maxi(0, int(tasting_inventory.get(dish_id, 0)))
	var added := maxi(0, mini(yield_qty, cap - cur_stock))
	tasting_inventory[dish_id] = cur_stock + added
	tasting_cook_counts[dish_id] = int(tasting_cook_counts.get(dish_id, 0)) + 1
	unlock_tasting_dish(dish_id)
	active_tasting_dish_id = dish_id
	career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	if not is_stall_full():
		add_to_stall(dish_id, 1)
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.tasting_dish_cooked.emit(dish_id, int(tasting_inventory[dish_id]))
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {
		"cooked": true,
		"dish_id": dish_id,
		"qty": added,
		"stock": int(tasting_inventory[dish_id]),
		"ingredients": plan,
		"fallback": used_fallback
	}

func get_tasting_score(dish_id: String) -> int:
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(dish_id, {})
	var lv := maxi(1, int(building_levels.get("chef_pavilion", 1)))
	var score := int(dcfg.get("base_score", 70))
	score += mini(24, 4 * (lv - 1))
	score += 2 * get_unlocked_tasting_dish_count()
	score += get_wish_lantern_tasting_bonus()
	if is_moon_tea_gathering_active():
		score += 4
	return clampi(score, 0, 100)

func _pick_tasting_challenge_dish(preferred_dish_id: String) -> String:
	if preferred_dish_id != "" and EconomyConfig.is_tasting_dish(preferred_dish_id) and bool(unlocked_tasting_dishes.get(preferred_dish_id, false)):
		return preferred_dish_id
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		if bool(unlocked_tasting_dishes.get(td_id, false)) and not bool(tasting_challenges_passed.get(td_id, false)):
			return td_id
	for td_id in ["dish_mountain_sea_hotpot", "dish_starlight_fish", "dish_cloud_dumplings"]:
		if int(tasting_inventory.get(td_id, 0)) > 0:
			return td_id
	return active_tasting_dish_id

func run_tasting_challenge(preferred_dish_id: String = "") -> Dictionary:
	var fail_res := {"judged": false, "dish_id": "", "score": 0, "passed": false, "gold": 0, "amber": 0, "vouchers": 0, "rep_gained": 0, "first_pass": false, "medal_awarded": false}
	if not chef_pavilion_unlocked:
		return fail_res
	var dish_id := _pick_tasting_challenge_dish(preferred_dish_id)
	if int(tasting_inventory.get(dish_id, 0)) <= 0:
		var auto_cook := cook_tasting_dish(dish_id, false)
		if not bool(auto_cook.get("cooked", false)) or String(auto_cook.get("dish_id", "")) != dish_id:
			fail_res["dish_id"] = dish_id
			return fail_res
	tasting_inventory[dish_id] = maxi(0, int(tasting_inventory.get(dish_id, 0)) - 1)
	tastings_held += 1
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES[dish_id]
	var score := get_tasting_score(dish_id)
	var passed := score >= EconomyConfig.TASTING_PASS_SCORE
	tasting_best_scores[dish_id] = maxi(int(tasting_best_scores.get(dish_id, 0)), score)
	var gold_gain := 0
	var amber_gain := 0
	var voucher_gain := 0
	var rep_gain := 0
	var first_pass := false
	var medal_awarded := false
	if passed:
		gold_gain = income_gold((4.0 if bool(tasting_challenges_passed.get(dish_id, false)) else 40.0) * get_wish_lantern_sale_multiplier(dish_id), 4)
		amber_gain = int(dcfg.get("amber_bonus", 4))
		voucher_gain = int(dcfg.get("voucher_bonus", 1))
		rep_gain = int(dcfg.get("rep_bonus", 60))
		if not bool(tasting_challenges_passed.get(dish_id, false)):
			first_pass = true
			tasting_challenges_passed[dish_id] = true
			for nxt_id in EconomyConfig.TASTING_DISH_ORDER:
				var ncfg: Dictionary = EconomyConfig.TASTING_DISHES[nxt_id]
				if String(ncfg.get("unlock_from", "")) == dish_id and not bool(unlocked_tasting_dishes.get(nxt_id, false)):
					unlock_tasting_dish(nxt_id)
					active_tasting_dish_id = nxt_id
					chef_cook_timer = 0.0
			if get_passed_tasting_challenge_count() >= EconomyConfig.TASTING_DISH_ORDER.size() and chef_medals <= 0:
				# All 3 Mountain-Sea tasting challenges passed -> award the `食神勋章` (Chef Medal)
				chef_medals += 1
				medal_awarded = true
				amber_gain += 10
				voucher_gain += 2
				rep_gain += 200
	else:
		# The jury still pays a modest tasting fee for a near-miss dish
		gold_gain = income_gold(2.0, 2)
		amber_gain = 1
		rep_gain = 12
	add_gold(gold_gain)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	chef_reputation_bonus += rep_gain
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	if passed and SoundManager != null:
		SoundManager.play_milestone_sfx()
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	EventBus.tasting_challenge_judged.emit(dish_id, score, passed, gold_gain, amber_gain, voucher_gain)
	if medal_awarded:
		EventBus.chef_medal_awarded.emit(chef_medals)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.CHEF_PAVILION_SLOT_X, EconomyConfig.GROUND_Y - 60.0),
		(EconomyConfig.tr_fmt("ft_tasting_pass", [EconomyConfig.get_item_display_name(dish_id), score])) if passed else (EconomyConfig.tr_fmt("ft_tasting_fail", [EconomyConfig.get_item_display_name(dish_id), score, EconomyConfig.TASTING_PASS_SCORE])),
		Color("#FFE066") if passed else Color("#FFF4D6")
	)
	save_game()
	return {
		"judged": true,
		"dish_id": dish_id,
		"score": score,
		"passed": passed,
		"gold": gold_gain,
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep_gained": rep_gain,
		"first_pass": first_pass,
		"medal_awarded": medal_awarded
	}

func has_pending_tasting_challenge() -> bool:
	for td_id in EconomyConfig.TASTING_DISH_ORDER:
		if bool(unlocked_tasting_dishes.get(td_id, false)) and not bool(tasting_challenges_passed.get(td_id, false)):
			return true
	return false

func _tick_chef_pavilion(delta: float) -> void:
	var dcfg: Dictionary = EconomyConfig.TASTING_DISHES.get(active_tasting_dish_id, EconomyConfig.TASTING_DISHES["dish_cloud_dumplings"])
	var cook_req := maxf(2.0, float(dcfg.get("cook_time", 8.0)))
	var lv := maxi(1, int(building_levels.get("chef_pavilion", 1)))
	var spd := get_workshop_speed_multiplier(2) * (1.0 + 0.06 * float(lv - 1)) * (1.5 if frenzy_timer > 0.0 else 1.0)
	chef_cook_timer += delta * spd
	var safety := 0
	while chef_cook_timer >= cook_req and safety < 4:
		chef_cook_timer -= cook_req
		safety += 1
		cook_tasting_dish(active_tasting_dish_id, true)
		if is_wish_lantern_festival_active() and has_pending_tasting_challenge():
			var pend_id := _pick_tasting_challenge_dish("")
			if int(tasting_inventory.get(pend_id, 0)) > 0 and get_tasting_score(pend_id) >= EconomyConfig.TASTING_PASS_SCORE:
				run_tasting_challenge(pend_id)
		dcfg = EconomyConfig.TASTING_DISHES.get(active_tasting_dish_id, EconomyConfig.TASTING_DISHES["dish_cloud_dumplings"])
		cook_req = maxf(2.0, float(dcfg.get("cook_time", 8.0)))

## ==================================================================
## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`)
## ==================================================================
func _reset_harbor_state() -> void:
	lighthouse_harbor_unlocked = false
	harbor_clock = 0.0
	harbor_boat_trips = [0, 0]
	harbor_seafood_inventory = {EconomyConfig.SEAFOOD_ITEM_ID: 0}
	seafood_landed_total = 0
	harbor_trips_total = 0
	harbor_reputation_bonus = 0

func unlock_lighthouse_harbor(free_for_test: bool = false) -> bool:
	if lighthouse_harbor_unlocked:
		return false
	if free_for_test:
		unlocked_islands[3] = true
	if not bool(unlocked_islands.get(3, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD):
		return false
	lighthouse_harbor_unlocked = true
	set_harbor_clock(0.0)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.lighthouse_harbor_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.LIGHTHOUSE_HARBOR_SLOT_X, EconomyConfig.GROUND_Y - 72.0),
		EconomyConfig.tr_key("ft_lh_open"),
		Color("#88D8FF")
	)
	evaluate_achievements()
	save_game()
	return true

func get_harbor_level() -> int:
	return maxi(1, int(building_levels.get("lighthouse_harbor", 1)))

## Harbor clock speed: +6% per level (cap 2.0x), boosted by the carnival frenzy like every other production line.
func get_harbor_clock_rate() -> float:
	var lv := get_harbor_level()
	return minf(2.0, 1.0 + 0.06 * float(lv - 1)) * (1.5 if frenzy_timer > 0.0 else 1.0)

func get_harbor_catch_per_trip() -> int:
	return 1 + int(floor(float(get_harbor_level()) / 4.0))

func get_harbor_seafood_stock() -> int:
	return maxi(0, int(harbor_seafood_inventory.get(EconomyConfig.SEAFOOD_ITEM_ID, 0)))

func get_harbor_seafood_cap() -> int:
	return EconomyConfig.calc_buffer_capacity(get_harbor_level())

## Re-anchors the harbor clock (used on build and by the deterministic self-test) without unloading phantom catches.
func set_harbor_clock(clock_sec: float) -> void:
	harbor_clock = maxf(0.0, clock_sec)
	var period := EconomyConfig.get_harbor_boat_period()
	for bi in range(EconomyConfig.HARBOR_BOAT_COUNT):
		harbor_boat_trips[bi] = int(floor((harbor_clock + float(bi) * period * 0.5) / period))

func get_harbor_boat_phase(boat_idx: int) -> float:
	var period := EconomyConfig.get_harbor_boat_period()
	return fposmod(harbor_clock + float(boat_idx) * period * 0.5, period)

## Pure function of the harbor clock: lane position, facing and opacity of boat `boat_idx` in the Island 3 east cove.
## Rota per boat: docked at the pier berth -> sails out to the cape (fading out = heading to the open cloud-sea) ->
## fishes out of sight -> fades back in at the cape -> sails home to the berth and unloads its catch.
func get_harbor_boat_visual(boat_idx: int) -> Dictionary:
	var lane: Dictionary = EconomyConfig.HARBOR_BOAT_LANE
	var berth := float(lane["berth_x"])
	var sea := float(lane["sea_x"])
	var d := EconomyConfig.HARBOR_BOAT_DOCK_SEC
	var o := EconomyConfig.HARBOR_BOAT_SAIL_SEC
	var s := EconomyConfig.HARBOR_BOAT_SEA_SEC
	var fade := maxf(0.05, EconomyConfig.HARBOR_BOAT_FADE_FRAC)
	var ph := get_harbor_boat_phase(boat_idx)
	var res := {"state": "docked", "x": berth, "alpha": 1.0, "visible": true, "facing": -1.0, "phase": ph}
	if ph < d:
		res["state"] = "docked"
	elif ph < d + o:
		var t_out := (ph - d) / o
		res["state"] = "sail_out"
		res["x"] = lerpf(berth, sea, t_out)
		res["facing"] = 1.0
		res["alpha"] = clampf((1.0 - t_out) / fade, 0.0, 1.0)
	elif ph < d + o + s:
		res["state"] = "at_sea"
		res["x"] = sea
		res["facing"] = 1.0
		res["alpha"] = 0.0
	else:
		var t_back := (ph - d - o - s) / o
		res["state"] = "sail_back"
		res["x"] = lerpf(sea, berth, t_back)
		res["facing"] = -1.0
		res["alpha"] = clampf(t_back / fade, 0.0, 1.0)
	res["visible"] = float(res["alpha"]) > 0.02
	return res

## Progress (0..1) of the next boat due home: two boats half a period apart -> a catch lands every `period / 2`.
func get_harbor_trip_ratio() -> float:
	if not lighthouse_harbor_unlocked:
		return 0.0
	var period := EconomyConfig.get_harbor_boat_period()
	var best := 0.0
	for bi in range(EconomyConfig.HARBOR_BOAT_COUNT):
		best = maxf(best, get_harbor_boat_phase(bi))
	return clampf((best - period * 0.5) / (period * 0.5), 0.0, 1.0)

func advance_harbor(delta: float) -> int:
	if not lighthouse_harbor_unlocked:
		return 0
	harbor_clock += maxf(0.0, delta) * get_harbor_clock_rate()
	var period := EconomyConfig.get_harbor_boat_period()
	var landed := 0
	for bi in range(EconomyConfig.HARBOR_BOAT_COUNT):
		var trips_now := int(floor((harbor_clock + float(bi) * period * 0.5) / period))
		var prev := int(harbor_boat_trips[bi])
		if trips_now > prev:
			harbor_boat_trips[bi] = trips_now
			landed += _land_harbor_catch(bi, mini(trips_now - prev, 4))
	return landed

func _land_harbor_catch(boat_idx: int, trips: int) -> int:
	var qty := get_harbor_catch_per_trip() * maxi(1, trips)
	var stock := get_harbor_seafood_stock()
	var stored := mini(qty, maxi(0, get_harbor_seafood_cap() - stock))
	harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = stock + stored
	harbor_trips_total += maxi(1, trips)
	seafood_landed_total += qty
	harbor_reputation_bonus += 6 * maxi(1, trips)
	career_stats["harvests"] = int(career_stats.get("harvests", 0)) + qty
	# One crate of every landing goes straight onto the market stall; the rest waits for the Chef Tasting Pavilion
	if get_harbor_seafood_stock() > 0 and not is_stall_full():
		var to_stall := add_to_stall(EconomyConfig.SEAFOOD_ITEM_ID, 1)
		harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = get_harbor_seafood_stock() - to_stall
	EventBus.seafood_catch_landed.emit(boat_idx, qty, get_harbor_seafood_stock())
	EventBus.spawn_floating_text.emit(
		Vector2(float(EconomyConfig.HARBOR_BOAT_LANE["berth_x"]), EconomyConfig.GROUND_Y - 30.0),
		EconomyConfig.tr_fmt("ft_boat_back", [qty]),
		Color("#88D8FF")
	)
	evaluate_achievements()
	return qty

func ship_harbor_seafood_to_stall(max_qty: int = 3) -> int:
	var stock := get_harbor_seafood_stock()
	if stock <= 0:
		return 0
	var added := add_to_stall(EconomyConfig.SEAFOOD_ITEM_ID, mini(stock, maxi(1, max_qty)))
	harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = stock - added
	return added

## ==================================================================
## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
## ==================================================================
func _reset_dairy_and_cinema_state() -> void:
	dairy_workshop_unlocked = false
	active_dairy_recipe_id = "dairy_cheese"
	dairy_timer = 0.0
	for d_id in EconomyConfig.DAIRY_CODEX_ORDER:
		dairy_inventory[d_id] = 0
		dairy_craft_counts[d_id] = 0
		unlocked_dairy_items[d_id] = false
	dairy_feed_consumed = 0
	dairy_reputation_bonus = 0
	open_air_cinema_unlocked = false
	cinema_night_on = false
	cinema_night_clock = 0.0
	cinema_screenings_tonight = 0
	cinema_last_started_idx = -1
	for f_id in EconomyConfig.CINEMA_FILM_ORDER:
		cinema_film_screen_counts[f_id] = 0
		unlocked_films[f_id] = false
	cinema_medals = 0
	cinema_screenings_total = 0
	cinema_screenings_cancelled = 0
	cinema_audience_total = 0
	cinema_ticket_gold_total = 0
	cinema_snack_gold_total = 0
	cinema_reputation_bonus = 0
	cinema_last_result = {}

func unlock_dairy_workshop(free_for_test: bool = false) -> bool:
	if dairy_workshop_unlocked:
		return false
	if not bool(unlocked_islands.get(1, true)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.DAIRY_WORKSHOP_UNLOCK_COST_GOLD):
		return false
	dairy_workshop_unlocked = true
	active_dairy_recipe_id = "dairy_cheese"
	dairy_timer = 0.0
	unlock_dairy_item(EconomyConfig.DAIRY_MILK_ID)
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.dairy_workshop_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.DAIRY_WORKSHOP_SLOT_X, EconomyConfig.GROUND_Y - 54.0),
		EconomyConfig.tr_key("ft_dw_open"),
		Color("#FFF4D6")
	)
	evaluate_achievements()
	save_game()
	return true

func get_dairy_level() -> int:
	return maxi(1, int(building_levels.get("dairy_workshop", 1)))

func get_dairy_stock(item_id: String) -> int:
	return maxi(0, int(dairy_inventory.get(item_id, 0)))

func get_dairy_buffer_cap() -> int:
	return maxi(12, EconomyConfig.calc_buffer_capacity(get_dairy_level()))

func unlock_dairy_item(item_id: String) -> bool:
	if not EconomyConfig.DAIRY_ITEMS.has(item_id):
		return false
	if bool(unlocked_dairy_items.get(item_id, false)):
		return false
	unlocked_dairy_items[item_id] = true
	EventBus.codex_unlocked.emit(item_id)
	evaluate_achievements()
	return true

func get_unlocked_dairy_count() -> int:
	var cnt := 0
	for d_id in EconomyConfig.DAIRY_CODEX_ORDER:
		if bool(unlocked_dairy_items.get(d_id, false)):
			cnt += 1
	return cnt

func get_dairy_cycle_ratio() -> float:
	if not dairy_workshop_unlocked:
		return 0.0
	return clampf(dairy_timer / maxf(1.0, EconomyConfig.DAIRY_CYCLE_SEC), 0.0, 1.0)

## Dairy pace: +6% per level, island 1 workshop buffs (wind chime / rose / bakery aura / solar term) and the carnival frenzy.
func get_dairy_speed_multiplier() -> float:
	var lv := get_dairy_level()
	return get_workshop_speed_multiplier(1) * (1.0 + 0.06 * float(lv - 1)) * (1.5 if frenzy_timer > 0.0 else 1.0)

func cycle_dairy_recipe() -> String:
	var cur_i := EconomyConfig.DAIRY_RECIPE_ORDER.find(active_dairy_recipe_id)
	active_dairy_recipe_id = EconomyConfig.DAIRY_RECIPE_ORDER[(cur_i + 1) % EconomyConfig.DAIRY_RECIPE_ORDER.size()]
	return active_dairy_recipe_id

## Milking: one harvested crop taken from the field baskets (bunny-farmer harvests, then the stall shelf) feeds the cloud herd
## for `2` bottles of milk (+1 per 5 levels). Only the idle loop may fall back to meadow grazing (`1` bottle) when no crop is left.
func milk_dairy_cows(allow_graze_fallback: bool = false) -> Dictionary:
	var milk_id := EconomyConfig.DAIRY_MILK_ID
	if not dairy_workshop_unlocked:
		return {"milked": false, "qty": 0, "feed": "", "grazed": false, "stock": get_dairy_stock(milk_id), "reason": "locked"}
	var cap := get_dairy_buffer_cap()
	var cur := get_dairy_stock(milk_id)
	if cur >= cap:
		return {"milked": false, "qty": 0, "feed": "", "grazed": false, "stock": cur, "reason": "full"}
	var feed := _take_crop_for_bath(EconomyConfig.DAIRY_FEED_CANDIDATES)
	if feed == "" and not allow_graze_fallback:
		return {"milked": false, "qty": 0, "feed": "", "grazed": false, "stock": cur, "reason": "feed"}
	var base_yield := EconomyConfig.DAIRY_FEED_MILK_YIELD if feed != "" else EconomyConfig.DAIRY_GRAZE_MILK_YIELD
	var yield_qty := base_yield + int(floor(float(get_dairy_level()) / 5.0))
	var added := maxi(1, mini(yield_qty, cap - cur))
	dairy_inventory[milk_id] = cur + added
	if feed != "":
		dairy_feed_consumed += 1
	dairy_craft_counts[milk_id] = int(dairy_craft_counts.get(milk_id, 0)) + 1
	unlock_dairy_item(milk_id)
	career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.dairy_milked.emit(added, get_dairy_stock(milk_id))
	EventBus.inventory_changed.emit()
	return {"milked": true, "qty": added, "feed": feed, "grazed": feed == "", "stock": get_dairy_stock(milk_id), "reason": "ok"}

func _pick_dairy_sweet(item_id: String) -> String:
	var cfg: Dictionary = EconomyConfig.DAIRY_ITEMS.get(item_id, {})
	for sc in cfg.get("sweet_candidates", []):
		if _count_tasting_ingredient(String(sc)) > 0:
			return String(sc)
	return ""

func can_craft_dairy_product(item_id: String) -> bool:
	if not dairy_workshop_unlocked or not EconomyConfig.DAIRY_RECIPE_ORDER.has(item_id):
		return false
	var cfg: Dictionary = EconomyConfig.DAIRY_ITEMS[item_id]
	if get_dairy_stock(EconomyConfig.DAIRY_MILK_ID) < int(cfg.get("milk_cost", 1)):
		return false
	if get_dairy_stock(item_id) >= get_dairy_buffer_cap():
		return false
	if not (cfg.get("sweet_candidates", []) as Array).is_empty() and _pick_dairy_sweet(item_id) == "":
		return false
	return true

## Cheese = 2 milk; cloud pudding = 1 milk + 1 sweet (bakery flour / strawberries / osmanthus cakes ... any crop).
## The cold store keeps 1 of each product for the Chef Pavilion & cinema concession; every surplus unit is shipped to the stall.
func craft_dairy_product(preferred_id: String = "") -> Dictionary:
	var item_id := preferred_id if EconomyConfig.DAIRY_RECIPE_ORDER.has(preferred_id) else active_dairy_recipe_id
	if not dairy_workshop_unlocked:
		return {"crafted": false, "item_id": item_id, "qty": 0, "reason": "locked"}
	if not can_craft_dairy_product(item_id):
		return {"crafted": false, "item_id": item_id, "qty": 0, "reason": "ingredients"}
	var cfg: Dictionary = EconomyConfig.DAIRY_ITEMS[item_id]
	var milk_id := EconomyConfig.DAIRY_MILK_ID
	var milk_cost := int(cfg.get("milk_cost", 1))
	var sweet_used := ""
	if not (cfg.get("sweet_candidates", []) as Array).is_empty():
		sweet_used = _pick_dairy_sweet(item_id)
		_take_tasting_ingredient(sweet_used)
	dairy_inventory[milk_id] = get_dairy_stock(milk_id) - milk_cost
	var cap := get_dairy_buffer_cap()
	var cur := get_dairy_stock(item_id)
	var yield_qty := 1 + int(floor(float(get_dairy_level()) / 5.0))
	var added := maxi(1, mini(yield_qty, cap - cur))
	dairy_inventory[item_id] = cur + added
	dairy_craft_counts[item_id] = int(dairy_craft_counts.get(item_id, 0)) + 1
	unlock_dairy_item(item_id)
	dairy_reputation_bonus += int(cfg.get("rep_bonus", 40))
	career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	var shipped := 0
	if get_dairy_stock(item_id) >= 2 and not is_stall_full():
		shipped = add_to_stall(item_id, 1)
		dairy_inventory[item_id] = get_dairy_stock(item_id) - shipped
	# Alternate cheese <-> pudding so both reach the kitchen and the stall
	if active_dairy_recipe_id == item_id:
		cycle_dairy_recipe()
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.dairy_product_crafted.emit(item_id, added, get_dairy_stock(item_id))
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {"crafted": true, "item_id": item_id, "qty": added, "sweet": sweet_used, "milk_used": milk_cost, "shipped": shipped, "stock": get_dairy_stock(item_id), "reason": "ok"}

## Sends dairy products from the cold store to the market stall (click action), keeping nothing back.
func ship_dairy_to_stall(max_qty: int = 3) -> int:
	var shipped := 0
	for d_id in ["dairy_cloud_pudding", "dairy_cheese", "dairy_milk"]:
		while shipped < maxi(1, max_qty) and get_dairy_stock(d_id) > 0 and not is_stall_full():
			var put := add_to_stall(d_id, 1)
			if put <= 0:
				break
			dairy_inventory[d_id] = get_dairy_stock(d_id) - put
			shipped += put
	return shipped

func _tick_dairy_workshop(delta: float) -> void:
	dairy_timer += maxf(0.0, delta) * get_dairy_speed_multiplier()
	var safety := 0
	while dairy_timer >= EconomyConfig.DAIRY_CYCLE_SEC and safety < 4:
		dairy_timer -= EconomyConfig.DAIRY_CYCLE_SEC
		safety += 1
		milk_dairy_cows(true)
		var first_try := active_dairy_recipe_id
		if not bool(craft_dairy_product(first_try).get("crafted", false)):
			for alt_id in EconomyConfig.DAIRY_RECIPE_ORDER:
				if alt_id != first_try and bool(craft_dairy_product(alt_id).get("crafted", false)):
					break

func unlock_open_air_cinema(free_for_test: bool = false) -> bool:
	if open_air_cinema_unlocked:
		return false
	if not free_for_test and not spend_gold(EconomyConfig.OPEN_AIR_CINEMA_UNLOCK_COST_GOLD):
		return false
	open_air_cinema_unlocked = true
	cinema_night_on = false
	cinema_night_clock = 0.0
	cinema_screenings_tonight = 0
	cinema_last_started_idx = -1
	_sync_cinema_night_state()
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.open_air_cinema_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.OPEN_AIR_CINEMA_SLOT_X, EconomyConfig.GROUND_Y - 58.0),
		EconomyConfig.tr_key("ft_cin_open"),
		Color("#FFD8A8")
	)
	evaluate_achievements()
	save_game()
	return true

## The cinema only opens at NIGHT (`WeatherState.NIGHT`); dusk, rain and daytime keep the screen folded away.
func is_cinema_open() -> bool:
	return open_air_cinema_unlocked and current_weather == WeatherState.NIGHT

func get_cinema_slot_index() -> int:
	if not is_cinema_open() or not cinema_night_on:
		return -1
	var k := int(floor(cinema_night_clock / EconomyConfig.CINEMA_SLOT_SEC))
	return k if k < EconomyConfig.CINEMA_FILM_ORDER.size() else -1

func is_cinema_screening_active() -> bool:
	var k := get_cinema_slot_index()
	if k < 0:
		return false
	return cinema_night_clock - float(k) * EconomyConfig.CINEMA_SLOT_SEC < EconomyConfig.CINEMA_SCREEN_SEC

func get_cinema_current_film_id() -> String:
	var k := get_cinema_slot_index()
	return EconomyConfig.CINEMA_FILM_ORDER[k] if k >= 0 else ""

func get_cinema_screening_remaining() -> float:
	var k := get_cinema_slot_index()
	if k < 0:
		return 0.0
	return maxf(0.0, float(k) * EconomyConfig.CINEMA_SLOT_SEC + EconomyConfig.CINEMA_SCREEN_SEC - cinema_night_clock)

func get_cinema_audience() -> int:
	return EconomyConfig.CINEMA_BASE_AUDIENCE

## Ticket price follows the island's idle economy (buildings + crew), with the codex / festival price multipliers divided out
## so a night's three screenings always sell at one stable price even when a film unlocks its codex entry mid-programme.
func get_cinema_ticket_price() -> int:
	var base_gps := estimate_idle_gold_per_sec() / get_collection_multiplier()
	return maxi(EconomyConfig.CINEMA_TICKET_MIN_GOLD, int(round(base_gps * EconomyConfig.CINEMA_TICKET_GPS_SEC)))

## Night-market sale boost while the cinema is open (night only, deterministic `1.25x`).
func get_cinema_sale_multiplier(_item_id: String = "") -> float:
	return EconomyConfig.CINEMA_NIGHT_SALE_MULT if is_cinema_open() else 1.0

## Night visitors drawn to the screenings: customer spawn pace while the cinema is open.
func get_cinema_visitor_spawn_mult() -> float:
	return EconomyConfig.CINEMA_VISITOR_SPAWN_MULT if is_cinema_open() else 1.0

func get_unlocked_film_count() -> int:
	var cnt := 0
	for f_id in EconomyConfig.CINEMA_FILM_ORDER:
		if bool(unlocked_films.get(f_id, false)):
			cnt += 1
	return cnt

## Seconds until the next NIGHT phase of the 4-state weather cycle (`DAY -> DUSK -> NIGHT -> RAIN`, 42s each).
func get_seconds_until_night() -> float:
	if current_weather == WeatherState.NIGHT:
		return 0.0
	var steps := posmod(WeatherState.NIGHT - current_weather, 4)
	return maxf(0.0, float(steps) * Pacing.DAY_PHASE_SEC - weather_timer)

## Opens the night programme at the first frame of a NIGHT phase and closes it at the first frame after it:
## a film still rolling when the night ends is cancelled without ticket income.
func _sync_cinema_night_state() -> void:
	var night := is_cinema_open()
	if night and not cinema_night_on:
		cinema_night_on = true
		cinema_snacks_tonight = 0
		cinema_night_clock = 0.0
		cinema_screenings_tonight = 0
		cinema_last_started_idx = -1
	elif not night and cinema_night_on:
		var k := int(floor(cinema_night_clock / EconomyConfig.CINEMA_SLOT_SEC))
		if k < EconomyConfig.CINEMA_FILM_ORDER.size() and cinema_night_clock - float(k) * EconomyConfig.CINEMA_SLOT_SEC < EconomyConfig.CINEMA_SCREEN_SEC:
			cinema_screenings_cancelled += 1
			EventBus.cinema_screening_cancelled.emit(EconomyConfig.CINEMA_FILM_ORDER[k])
		cinema_night_on = false
		cinema_night_clock = 0.0
		cinema_screenings_tonight = 0
		cinema_last_started_idx = -1

func advance_cinema(delta: float) -> int:
	if not open_air_cinema_unlocked:
		return 0
	_sync_cinema_night_state()
	if not cinema_night_on:
		return 0
	var prev := cinema_night_clock
	cinema_night_clock += maxf(0.0, delta)
	var settled := 0
	for k in range(EconomyConfig.CINEMA_FILM_ORDER.size()):
		var end_t := float(k) * EconomyConfig.CINEMA_SLOT_SEC + EconomyConfig.CINEMA_SCREEN_SEC
		if prev < end_t and cinema_night_clock >= end_t:
			_settle_cinema_screening(k)
			settled += 1
	var k_now := get_cinema_slot_index()
	if k_now >= 0 and k_now != cinema_last_started_idx and is_cinema_screening_active():
		cinema_last_started_idx = k_now
		var f_now := EconomyConfig.CINEMA_FILM_ORDER[k_now]
		EventBus.cinema_screening_started.emit(k_now, f_now)
		EventBus.spawn_floating_text.emit(
			Vector2(EconomyConfig.OPEN_AIR_CINEMA_SLOT_X, EconomyConfig.GROUND_Y - 62.0),
			EconomyConfig.tr_fmt("ft_film_start", [EconomyConfig.get_item_display_name(f_now)]),
			Color("#FFD8A8")
		)
	return settled

## Concession stand: cinema-goers buy dairy snacks (cloud pudding first, then milk) from the cold store or the stall shelf
## at `unit price x 1.35 x codex multiplier`.
func sell_cinema_snacks(max_qty: int = 1) -> Dictionary:
	var sold := 0
	var gold_gain := 0
	var items: Array[String] = []
	for _i in range(mini(maxi(0, max_qty), Pacing.SNACKS_PER_NIGHT - cinema_snacks_tonight)):
		var snack_id := ""
		for sid in EconomyConfig.CINEMA_SNACK_CANDIDATES:
			if get_dairy_stock(sid) > 0 or int(stall_inventory.get(sid, 0)) > 0:
				snack_id = sid
				break
		if snack_id == "":
			break
		if get_dairy_stock(snack_id) > 0:
			dairy_inventory[snack_id] = get_dairy_stock(snack_id) - 1
		else:
			stall_inventory[snack_id] = int(stall_inventory.get(snack_id, 0)) - 1
		gold_gain += income_gold(EconomyConfig.CINEMA_SNACK_SEC, 2)
		sold += 1
		cinema_snacks_tonight += 1
		items.append(snack_id)
	if gold_gain > 0:
		add_gold(gold_gain)
		cinema_snack_gold_total += gold_gain
		EventBus.inventory_changed.emit()
	return {"sold": sold, "gold": gold_gain, "items": items}

func _settle_cinema_screening(k: int) -> Dictionary:
	var film_id := EconomyConfig.CINEMA_FILM_ORDER[clampi(k, 0, EconomyConfig.CINEMA_FILM_ORDER.size() - 1)]
	var fcfg: Dictionary = EconomyConfig.CINEMA_FILMS[film_id]
	var audience := get_cinema_audience()
	var price := get_cinema_ticket_price()
	var ticket_gold := audience * price
	var first_show := not bool(unlocked_films.get(film_id, false))
	unlocked_films[film_id] = true
	cinema_film_screen_counts[film_id] = int(cinema_film_screen_counts.get(film_id, 0)) + 1
	cinema_screenings_tonight += 1
	cinema_screenings_total += 1
	cinema_audience_total += audience
	cinema_ticket_gold_total += ticket_gold
	var amber_gain := 1
	var voucher_gain := 1 if first_show else 0
	var rep_gain := int(fcfg.get("rep_bonus", 30)) + audience
	var snack := sell_cinema_snacks(1 + int(floor(float(audience) / 6.0)))
	var medal := false
	if cinema_screenings_tonight >= EconomyConfig.CINEMA_FILM_ORDER.size():
		# `星空影迷勋章`: the whole 3-film night programme played to the end
		cinema_medals += 1
		medal = true
		amber_gain += 3
		voucher_gain += 1
		rep_gain += 80
	add_gold(ticket_gold)
	add_amber(amber_gain)
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	cinema_reputation_bonus += rep_gain
	career_stats["customers"] = int(career_stats.get("customers", 0)) + 1
	if first_show:
		EventBus.codex_unlocked.emit(film_id)
	if SoundManager != null:
		if medal:
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_coin_sfx()
	evaluate_achievements()
	var res := {
		"film_id": film_id,
		"screening_idx": k,
		"audience": audience,
		"ticket_price": price,
		"ticket_gold": ticket_gold,
		"snack_sold": int(snack["sold"]),
		"snack_gold": int(snack["gold"]),
		"amber": amber_gain,
		"vouchers": voucher_gain,
		"rep": rep_gain,
		"first_show": first_show,
		"medal_awarded": medal
	}
	cinema_last_result = res
	EventBus.cinema_screening_settled.emit(film_id, audience, ticket_gold, int(snack["gold"]))
	if medal:
		EventBus.cinema_medal_awarded.emit(cinema_medals)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.OPEN_AIR_CINEMA_SLOT_X, EconomyConfig.GROUND_Y - 52.0),
		(EconomyConfig.tr_key("ft_cin_medal") if medal else EconomyConfig.tr_key("ft_cin_end")) + EconomyConfig.tr_fmt("ft_cin_audience", [audience, ticket_gold]) + ((EconomyConfig.tr_fmt("ft_cin_snack", [int(snack["gold"])])) if int(snack["gold"]) > 0 else ""),
		Color("#FFE066") if medal else Color("#FFD8A8")
	)
	return res

func get_cinema_status_summary() -> Dictionary:
	var k := get_cinema_slot_index()
	var film_id := get_cinema_current_film_id()
	var fcfg: Dictionary = EconomyConfig.CINEMA_FILMS.get(film_id, {})
	return {
		"built": open_air_cinema_unlocked,
		"open": is_cinema_open(),
		"screening": is_cinema_screening_active(),
		"slot": k,
		"slot_count": EconomyConfig.CINEMA_FILM_ORDER.size(),
		"film_id": film_id,
		"film_short": EconomyConfig.tr_name(String(fcfg.get("short_name", ""))),
		"remaining": get_cinema_screening_remaining() / Pacing.CINEMA_PACE,
		"intermission_left": maxf(0.0, (float(k + 1) * EconomyConfig.CINEMA_SLOT_SEC - cinema_night_clock)) / Pacing.CINEMA_PACE if (k >= 0 and not is_cinema_screening_active()) else 0.0,
		"audience": get_cinema_audience(),
		"ticket_price": get_cinema_ticket_price(),
		"tonight": cinema_screenings_tonight,
		"until_night": get_seconds_until_night()
	}

func _reset_pottery_state() -> void:
	pottery_kiln_unlocked = false
	active_pottery_recipe_id = "pottery_tea_bowl"
	pottery_kiln_timer = 0.0
	for p_id in EconomyConfig.POTTERY_CODEX_ORDER:
		pottery_inventory[p_id] = 0
		pottery_craft_counts[p_id] = 0
		unlocked_pottery_items[p_id] = false
	pottery_fuel_consumed = 0
	pottery_clay_dug_total = 0
	pottery_packed_in_boxes = 0
	pottery_reputation_bonus = 0

func unlock_pottery_kiln(free_for_test: bool = false) -> bool:
	if pottery_kiln_unlocked:
		return false
	if not bool(unlocked_islands.get(3, false)):
		return false
	if not free_for_test and not spend_gold(EconomyConfig.POTTERY_KILN_UNLOCK_COST_GOLD):
		return false
	pottery_kiln_unlocked = true
	active_pottery_recipe_id = "pottery_tea_bowl"
	pottery_kiln_timer = 0.0
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.pottery_kiln_unlocked_changed.emit(true)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.POTTERY_KILN_SLOT_X, EconomyConfig.GROUND_Y - 56.0),
		EconomyConfig.tr_key("ft_pk_open"),
		Color("#FFD8A8")
	)
	evaluate_achievements()
	save_game()
	return true

func get_pottery_kiln_level() -> int:
	return maxi(1, int(building_levels.get("pottery_kiln", 1)))

func get_pottery_stock(item_id: String) -> int:
	return maxi(0, int(pottery_inventory.get(item_id, 0)))

## Fired wares only (tea bowls + vases), the clay bin excluded
func get_total_pottery_ware_count() -> int:
	var s := 0
	for p_id in EconomyConfig.POTTERY_RECIPE_ORDER:
		s += get_pottery_stock(p_id)
	return s

func get_pottery_buffer_cap() -> int:
	return maxi(12, EconomyConfig.calc_buffer_capacity(get_pottery_kiln_level()))

func unlock_pottery_item(item_id: String) -> bool:
	if not EconomyConfig.POTTERY_ITEMS.has(item_id):
		return false
	if bool(unlocked_pottery_items.get(item_id, false)):
		return false
	unlocked_pottery_items[item_id] = true
	EventBus.codex_unlocked.emit(item_id)
	evaluate_achievements()
	return true

func get_unlocked_pottery_count() -> int:
	var cnt := 0
	for p_id in EconomyConfig.POTTERY_CODEX_ORDER:
		if bool(unlocked_pottery_items.get(p_id, false)):
			cnt += 1
	return cnt

func get_pottery_cycle_ratio() -> float:
	if not pottery_kiln_unlocked:
		return 0.0
	return clampf(pottery_kiln_timer / maxf(1.0, EconomyConfig.POTTERY_KILN_CYCLE_SEC), 0.0, 1.0)

## Kiln pace: +6% per level, Island 3 workshop buffs (tiki torch / solar term / spa aura) and the carnival frenzy.
func get_pottery_speed_multiplier() -> float:
	var lv := get_pottery_kiln_level()
	return get_workshop_speed_multiplier(3) * (1.0 + 0.06 * float(lv - 1)) * (1.5 if frenzy_timer > 0.0 else 1.0)

func cycle_pottery_recipe() -> String:
	var cur_i := EconomyConfig.POTTERY_RECIPE_ORDER.find(active_pottery_recipe_id)
	active_pottery_recipe_id = EconomyConfig.POTTERY_RECIPE_ORDER[(cur_i + 1) % EconomyConfig.POTTERY_RECIPE_ORDER.size()]
	return active_pottery_recipe_id

## Clay source = the existing farm loop: every soil-plot harvest (bunny farmers turning the furrows) brings up island clay.
func dig_pottery_clay(qty: int = 1) -> int:
	if not pottery_kiln_unlocked:
		return 0
	var clay_id := EconomyConfig.POTTERY_CLAY_ID
	var cap := get_pottery_buffer_cap()
	var cur := get_pottery_stock(clay_id)
	if cur >= cap:
		return 0
	var added := mini(maxi(1, qty), cap - cur)
	pottery_inventory[clay_id] = cur + added
	pottery_clay_dug_total += added
	pottery_craft_counts[clay_id] = int(pottery_craft_counts.get(clay_id, 0)) + 1
	unlock_pottery_item(clay_id)
	EventBus.pottery_clay_dug.emit(added, get_pottery_stock(clay_id))
	return added

func _on_item_produced_for_kiln(_island_idx: int, item_id: String, _qty: int) -> void:
	if pottery_kiln_unlocked and EconomyConfig.CROPS.has(item_id):
		dig_pottery_clay(EconomyConfig.POTTERY_CLAY_PER_HARVEST)

## Tea bowl = 1 clay + 1 fuel bundle; celadon vase = 2 clay + 1 fuel bundle (`1` harvested crop's dried stalks / husks).
## The kiln shelf keeps 1 of each ware for the souvenir gift boxes; every surplus piece is shipped to the market stall.
func fire_pottery(preferred_id: String = "") -> Dictionary:
	var item_id := preferred_id if EconomyConfig.POTTERY_RECIPE_ORDER.has(preferred_id) else active_pottery_recipe_id
	if not pottery_kiln_unlocked:
		return {"fired": false, "item_id": item_id, "qty": 0, "reason": "locked"}
	var cfg: Dictionary = EconomyConfig.POTTERY_ITEMS[item_id]
	var clay_id := EconomyConfig.POTTERY_CLAY_ID
	var clay_cost := int(cfg.get("clay_cost", 1))
	if get_pottery_stock(clay_id) < clay_cost:
		return {"fired": false, "item_id": item_id, "qty": 0, "reason": "clay"}
	var cap := get_pottery_buffer_cap()
	var cur := get_pottery_stock(item_id)
	if cur >= cap:
		return {"fired": false, "item_id": item_id, "qty": 0, "reason": "full"}
	var fuel := _take_crop_for_bath(EconomyConfig.POTTERY_FUEL_CANDIDATES)
	if fuel == "":
		return {"fired": false, "item_id": item_id, "qty": 0, "reason": "fuel"}
	pottery_inventory[clay_id] = get_pottery_stock(clay_id) - clay_cost
	var yield_qty := 1 + int(floor(float(get_pottery_kiln_level()) / 5.0))
	var added := maxi(1, mini(yield_qty, cap - cur))
	pottery_inventory[item_id] = cur + added
	pottery_fuel_consumed += 1
	pottery_craft_counts[item_id] = int(pottery_craft_counts.get(item_id, 0)) + 1
	unlock_pottery_item(item_id)
	pottery_reputation_bonus += int(cfg.get("rep_bonus", 40))
	career_stats["crafts"] = int(career_stats.get("crafts", 0)) + added
	var shipped := 0
	if get_pottery_stock(item_id) >= 2 and not is_stall_full():
		shipped = add_to_stall(item_id, 1)
		pottery_inventory[item_id] = get_pottery_stock(item_id) - shipped
	# Alternate tea bowl <-> vase so both reach the gift boxes and the stall
	if active_pottery_recipe_id == item_id:
		cycle_pottery_recipe()
	if SoundManager != null:
		SoundManager.play_pop_sfx()
	EventBus.pottery_fired.emit(item_id, added, get_pottery_stock(item_id))
	evaluate_achievements()
	EventBus.inventory_changed.emit()
	return {"fired": true, "item_id": item_id, "qty": added, "fuel": fuel, "clay_used": clay_cost, "shipped": shipped, "stock": get_pottery_stock(item_id), "reason": "ok"}

## Click action: send every fired ware on the kiln shelf to the market stall (vases first), keeping nothing back.
func ship_pottery_to_stall(max_qty: int = 3) -> int:
	var shipped := 0
	for p_id in ["pottery_vase", "pottery_tea_bowl"]:
		while shipped < maxi(1, max_qty) and get_pottery_stock(p_id) > 0 and not is_stall_full():
			var put := add_to_stall(p_id, 1)
			if put <= 0:
				break
			pottery_inventory[p_id] = get_pottery_stock(p_id) - put
			shipped += put
	return shipped

func _tick_pottery_kiln(delta: float) -> void:
	pottery_kiln_timer += maxf(0.0, delta) * get_pottery_speed_multiplier()
	var safety := 0
	while pottery_kiln_timer >= EconomyConfig.POTTERY_KILN_CYCLE_SEC and safety < 4:
		pottery_kiln_timer -= EconomyConfig.POTTERY_KILN_CYCLE_SEC
		safety += 1
		var first_try := active_pottery_recipe_id
		if not bool(fire_pottery(first_try).get("fired", false)):
			for alt_id in EconomyConfig.POTTERY_RECIPE_ORDER:
				if alt_id != first_try and bool(fire_pottery(alt_id).get("fired", false)):
					break

## ==================================================================
## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) & Island Four-Season Dress-Up (`岛屿四季装扮`) — no new building
## ==================================================================
func _reset_kite_and_season_state() -> void:
	kite_festival_active = false
	kite_festival_clock = 0.0
	kite_festivals_held = 0
	kite_festival_idx = 0
	kite_collected_slots.clear()
	for k_id in EconomyConfig.KITE_ORDER:
		kite_collect_counts[k_id] = 0
		unlocked_kites[k_id] = false
	kite_medals = 0
	kite_collected_total = 0
	kite_gold_total = 0
	kite_reputation_bonus = 0
	kite_last_result = {}
	season_clock = Callable()
	current_season_id = ""
	season_refresh_timer = 0.0
	for s_id in EconomyConfig.SEASON_ORDER:
		seasons_seen[s_id] = false
	refresh_season()

## ---------------- Seasons (local calendar month, injectable clock) ----------------
func get_local_datetime() -> Dictionary:
	if season_clock.is_valid():
		var d = season_clock.call()
		if d is Dictionary and (d as Dictionary).has("month"):
			return d
	return Time.get_datetime_dict_from_system(false)

## Inject a clock (a Callable returning a datetime Dictionary with `month`); pass `Callable()` for the real system clock.
func set_season_clock(clock: Callable) -> String:
	season_clock = clock
	var s_id := refresh_season()
	# CI-15: one island calendar -> the cloud-sea weather and the birthdays follow the injected clock too
	refresh_island_calendar()
	return s_id

## Re-reads the local month and switches the season (props + tint follow `EventBus.season_changed`).
func refresh_season() -> String:
	var dt := get_local_datetime()
	var s_id := EconomyConfig.get_season_for_month(int(dt.get("month", 1)))
	var changed := s_id != current_season_id
	current_season_id = s_id
	if not bool(seasons_seen.get(s_id, false)):
		seasons_seen[s_id] = true
		if EventBus != null:
			EventBus.codex_unlocked.emit("season_" + s_id)
		evaluate_achievements()
	if changed and EventBus != null:
		EventBus.season_changed.emit(s_id)
	return s_id

func get_current_season_id() -> String:
	if current_season_id == "":
		refresh_season()
	return current_season_id

func get_current_season_info() -> Dictionary:
	return EconomyConfig.SEASONS.get(get_current_season_id(), EconomyConfig.SEASONS["spring"])

func get_seen_season_count() -> int:
	var cnt := 0
	for s_id in EconomyConfig.SEASON_ORDER:
		if bool(seasons_seen.get(s_id, false)):
			cnt += 1
	return cnt

## Seasonal props standing on unlocked islands right now (Island 1 always; Island 2 / 3 once opened)
func get_active_season_deco_count() -> int:
	var cnt := 0
	for spot in EconomyConfig.SEASON_DECO_SPOTS:
		if bool(unlocked_islands.get(int(spot["island"]), false)):
			cnt += 1
	return cnt

## Small seasonal bonus: the current season's buff type (spring crops / summer sales / autumn workshops / winter tips)
## gets +2% per seasonal prop on an unlocked island; every other buff type returns 1.0.
func get_season_bonus_multiplier(buff_type: String) -> float:
	var info := get_current_season_info()
	if String(info.get("bonus_type", "")) != buff_type:
		return 1.0
	return 1.0 + EconomyConfig.SEASON_DECO_BONUS_PER_PROP * float(get_active_season_deco_count())

## ---------------- Kite Festival ----------------
func start_kite_festival() -> bool:
	if kite_festival_active:
		return false
	kite_festival_active = true
	kite_festival_clock = 0.0
	kite_festival_idx = kite_festivals_held
	kite_collected_slots.clear()
	kite_last_result = {}
	if SoundManager != null:
		SoundManager.play_milestone_sfx()
	EventBus.kite_festival_started.emit(kite_festival_idx)
	EventBus.spawn_floating_text.emit(
		Vector2(EconomyConfig.KITE_BADGE_POS.x + 70.0, EconomyConfig.GROUND_Y - 62.0),
		EconomyConfig.tr_fmt("ft_kite_open", [EconomyConfig.KITE_SLOTS.size(), get_kite_wind_name()]),
		Color("#9BE7FF")
	)
	return true

func is_kite_festival_active() -> bool:
	return kite_festival_active

func get_kite_seconds_left() -> float:
	if not kite_festival_active:
		return 0.0
	return maxf(0.0, EconomyConfig.KITE_FESTIVAL_SEC - kite_festival_clock)

func get_kite_wind_strength() -> float:
	if not kite_festival_active:
		return 0.0
	return EconomyConfig.calc_kite_wind_strength(kite_festival_idx, kite_festival_clock)

func get_kite_wind_vector() -> float:
	if not kite_festival_active:
		return 0.0
	return EconomyConfig.calc_kite_wind_vector(kite_festival_idx, kite_festival_clock)

func get_kite_wind_name() -> String:
	var lvl := EconomyConfig.calc_kite_wind_level_idx(kite_festival_idx, kite_festival_clock)
	return EconomyConfig.tr_name(String(EconomyConfig.get_kite_wind_level_info(lvl).get("name", "和风")))

## Temporary wind buff while the kites fly: crop growth + workshop speed x(1 + 0.25 w)
func get_kite_wind_production_multiplier() -> float:
	if not kite_festival_active:
		return 1.0
	return 1.0 + EconomyConfig.KITE_WIND_PRODUCTION_PER_STRENGTH * get_kite_wind_strength()

## Temporary wind buff while the kites fly: every stall sale x(1 + 0.20 w)
func get_kite_wind_sale_multiplier() -> float:
	if not kite_festival_active:
		return 1.0
	return 1.0 + EconomyConfig.KITE_WIND_SALE_PER_STRENGTH * get_kite_wind_strength()

func get_kite_slot_position(slot_idx: int) -> Vector2:
	return EconomyConfig.calc_kite_position(slot_idx, kite_festival_idx, kite_festival_clock)

func is_kite_available(slot_idx: int) -> bool:
	return kite_festival_active and slot_idx >= 0 and slot_idx < EconomyConfig.KITE_SLOTS.size() and not kite_collected_slots.has(slot_idx)

func get_kite_remaining_count() -> int:
	if not kite_festival_active:
		return 0
	return EconomyConfig.KITE_SLOTS.size() - kite_collected_slots.size()

func get_unlocked_kite_count() -> int:
	var cnt := 0
	for k_id in EconomyConfig.KITE_ORDER:
		if bool(unlocked_kites.get(k_id, false)):
			cnt += 1
	return cnt

## Gold for one kite = idle gold/s with the codex multiplier divided out x `gold_sec` (at least `KITE_MIN_GOLD`)
func get_kite_reward_gold(kite_id: String) -> int:
	var cfg: Dictionary = EconomyConfig.KITE_TYPES.get(kite_id, EconomyConfig.KITE_TYPES["kite_carp"])
	var base_gps := estimate_idle_gold_per_sec() / get_collection_multiplier()
	return maxi(EconomyConfig.KITE_MIN_GOLD, int(round(base_gps * float(cfg.get("gold_sec", 6.0)))))

## Click a kite: reel it in for its reward (carp = most gold, bird = +1 amber, star = most reputation). Collecting all 6
## kites of one festival = `风筝满天` sweep medal (+2 amber, +1 voucher, +60 reputation).
func collect_kite(slot_idx: int) -> Dictionary:
	if not is_kite_available(slot_idx):
		return {"collected": false, "slot": slot_idx, "reason": "unavailable"}
	var sl: Dictionary = EconomyConfig.KITE_SLOTS[slot_idx]
	var k_id := String(sl["kite_id"])
	var cfg: Dictionary = EconomyConfig.KITE_TYPES[k_id]
	var gold_gain := get_kite_reward_gold(k_id)
	var amber_gain := int(cfg.get("amber", 0))
	var rep_gain := int(cfg.get("rep", 20))
	var first_time := not bool(unlocked_kites.get(k_id, false))
	kite_collected_slots.append(slot_idx)
	unlocked_kites[k_id] = true
	kite_collect_counts[k_id] = int(kite_collect_counts.get(k_id, 0)) + 1
	kite_collected_total += 1
	add_gold(gold_gain)
	if amber_gain > 0:
		add_amber(amber_gain)
	kite_gold_total += gold_gain
	kite_reputation_bonus += rep_gain
	var res := {
		"collected": true,
		"slot": slot_idx,
		"kite_id": k_id,
		"gold": gold_gain,
		"amber": amber_gain,
		"vouchers": 0,
		"rep": rep_gain,
		"first_time": first_time,
		"wind": get_kite_wind_strength(),
		"swept": false
	}
	if first_time and EventBus != null:
		EventBus.codex_unlocked.emit(k_id)
	if kite_collected_slots.size() >= EconomyConfig.KITE_SLOTS.size():
		kite_medals += 1
		add_amber(EconomyConfig.KITE_SWEEP_AMBER)
		add_rare_voucher(EconomyConfig.KITE_SWEEP_VOUCHERS)
		kite_reputation_bonus += EconomyConfig.KITE_SWEEP_REP
		res["swept"] = true
		res["amber"] = amber_gain + EconomyConfig.KITE_SWEEP_AMBER
		res["vouchers"] = EconomyConfig.KITE_SWEEP_VOUCHERS
		res["rep"] = rep_gain + EconomyConfig.KITE_SWEEP_REP
	kite_last_result = res
	if SoundManager != null:
		if bool(res["swept"]):
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_coin_sfx()
	EventBus.kite_collected.emit(slot_idx, k_id, gold_gain)
	evaluate_achievements()
	EventBus.prosperity_changed.emit(get_prosperity_score())
	return res

func advance_kite_festival(delta: float) -> bool:
	if not kite_festival_active:
		return false
	kite_festival_clock += maxf(0.0, delta)
	if kite_festival_clock >= EconomyConfig.KITE_FESTIVAL_SEC:
		_finish_kite_festival()
		return true
	return false

func _finish_kite_festival() -> void:
	var got := kite_collected_slots.size()
	var swept := got >= EconomyConfig.KITE_SLOTS.size()
	kite_festival_active = false
	kite_festival_clock = 0.0
	kite_collected_slots.clear()
	kite_festivals_held += 1
	EventBus.kite_festival_ended.emit(got, swept)

func get_kite_status_summary() -> Dictionary:
	return {
		"active": kite_festival_active,
		"seconds_left": get_kite_seconds_left() / Pacing.KITE_PACE,
		"wind_name": get_kite_wind_name() if kite_festival_active else "",
		"wind": get_kite_wind_strength(),
		"sale_mult": get_kite_wind_sale_multiplier(),
		"prod_mult": get_kite_wind_production_multiplier(),
		"remaining": get_kite_remaining_count(),
		"collected": kite_collected_slots.size(),
		"medals": kite_medals,
		"festivals": kite_festivals_held
	}

## ==================================================================
## CI-14: Islander Wish Board (`岛民心愿委托告示板`)
## ==================================================================
func _reset_wish_state() -> void:
	wish_board.clear()
	wish_serial_next = 0
	wishes_fulfilled_total = 0
	wish_fulfilled_counts.clear()
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		wish_fulfilled_counts[isl_k] = 0
	wish_reputation_bonus = 0
	wish_vouchers_total = 0
	wish_medals = 0
	wish_last_result = {}
	wish_paused = false
	_fill_wish_board()

## ---------------- Islander wish board ----------------
func _connect_wish_board_signals() -> void:
	if EventBus == null:
		return
	if not EventBus.item_produced.is_connected(_on_wish_item_produced):
		EventBus.item_produced.connect(_on_wish_item_produced)
	if not EventBus.item_delivered.is_connected(_on_wish_item_delivered):
		EventBus.item_delivered.connect(_on_wish_item_delivered)
	if not EventBus.customer_paid.is_connected(_on_wish_customer_paid):
		EventBus.customer_paid.connect(_on_wish_customer_paid)

func _make_wish(serial: int) -> Dictionary:
	var w_type := EconomyConfig.get_wish_type_for_serial(serial)
	var tier := EconomyConfig.get_wish_tier(serial)
	var base_gps := estimate_idle_gold_per_sec() / get_collection_multiplier()
	return {
		"serial": serial,
		"islander": EconomyConfig.get_wish_islander(serial),
		"type": w_type,
		"tier": tier,
		"target": EconomyConfig.calc_wish_target(w_type, tier, base_gps),
		"progress": 0,
		"time_left": EconomyConfig.WISH_LIFETIME_SEC,
		"rep": EconomyConfig.calc_wish_rep(w_type, tier),
		"vouchers": int(EconomyConfig.WISH_TYPES[w_type]["vouchers"]),
		"state": "open",
		"linger": 0.0
	}

func _post_wish(slot_idx: int) -> void:
	var w := _make_wish(wish_serial_next)
	wish_serial_next += 1
	if slot_idx < wish_board.size():
		wish_board[slot_idx] = w
	else:
		wish_board.append(w)
	if EventBus != null:
		EventBus.wish_posted.emit(slot_idx, w.duplicate())

func _fill_wish_board() -> void:
	while wish_board.size() < EconomyConfig.WISH_SLOT_COUNT:
		_post_wish(wish_board.size())

## Open notes count down their lifetime; fulfilled / expired notes linger 4s, then the next islander pins a fresh note.
func advance_wish_board(delta: float) -> void:
	if wish_board.size() < EconomyConfig.WISH_SLOT_COUNT:
		_fill_wish_board()
	var dt := maxf(0.0, delta)
	for i in range(wish_board.size()):
		var w: Dictionary = wish_board[i]
		if String(w["state"]) == "open":
			w["time_left"] = maxf(0.0, float(w["time_left"]) - dt)
			if float(w["time_left"]) <= 0.0:
				w["state"] = "expired"
				w["linger"] = EconomyConfig.WISH_LINGER_SEC
				if EventBus != null:
					EventBus.wish_expired.emit(i, w.duplicate())
		else:
			w["linger"] = float(w["linger"]) - dt
			if float(w["linger"]) <= 0.0:
				_post_wish(i)

func _progress_wishes(w_type: String, amount: int) -> void:
	if amount <= 0 or wish_paused:
		return
	for i in range(wish_board.size()):
		var w: Dictionary = wish_board[i]
		if String(w["state"]) == "open" and String(w["type"]) == w_type:
			w["progress"] = mini(int(w["target"]), int(w["progress"]) + amount)
			if int(w["progress"]) >= int(w["target"]):
				_fulfil_wish(i)

func _fulfil_wish(slot_idx: int) -> Dictionary:
	var w: Dictionary = wish_board[slot_idx]
	w["state"] = "done"
	w["linger"] = EconomyConfig.WISH_LINGER_SEC
	var rep_gain := int(w["rep"])
	var voucher_gain := int(w["vouchers"])
	wishes_fulfilled_total += 1
	var isl_k := String(w["islander"])
	wish_fulfilled_counts[isl_k] = int(wish_fulfilled_counts.get(isl_k, 0)) + 1
	var medal := wishes_fulfilled_total % EconomyConfig.WISH_MEDAL_EVERY == 0
	if medal:
		wish_medals += 1
		rep_gain += EconomyConfig.WISH_MEDAL_REP
		voucher_gain += EconomyConfig.WISH_MEDAL_VOUCHERS
	wish_reputation_bonus += rep_gain
	wish_vouchers_total += voucher_gain
	add_rare_voucher(voucher_gain)
	# CI-16: a fulfilled wish deepens the bond with that islander
	add_friendship_points(isl_k, EconomyConfig.FRIEND_WISH_POINTS, "wish")
	var res := {"slot": slot_idx, "serial": int(w["serial"]), "islander": isl_k, "type": String(w["type"]), "rep": rep_gain, "vouchers": voucher_gain, "medal": medal}
	wish_last_result = res
	if SoundManager != null:
		if medal:
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_coin_sfx()
	if EventBus != null:
		EventBus.wish_fulfilled.emit(slot_idx, w.duplicate())
		EventBus.spawn_floating_text.emit(
			Vector2(MarketStall.SLOT_X, EconomyConfig.GROUND_Y - 56.0),
			EconomyConfig.tr_fmt("ft_wish_done", [EconomyConfig.tr_name(String(EconomyConfig.WISH_ISLANDER_NAMES.get(isl_k, isl_k))), rep_gain, voucher_gain, EconomyConfig.tr_key("ft_wish_medal") if medal else ""]),
			Color("#FFC9E3")
		)
	evaluate_achievements()
	EventBus.prosperity_changed.emit(get_prosperity_score())
	return res

func _on_wish_item_produced(_island_idx: int, _item_id: String, qty: int) -> void:
	_progress_wishes("harvest", maxi(1, qty))

func _on_wish_item_delivered(_item_id: String, amount: int, target_name: String) -> void:
	if target_name == "market_stall":
		_progress_wishes("stock", amount)
	elif target_name.ends_with("_output"):
		_progress_wishes("craft", amount)

func _on_wish_customer_paid(_recipe_id: String, _qty: int, total_gold: int, _world_pos: Vector2) -> void:
	_progress_wishes("serve", 1)
	_progress_wishes("earn", total_gold)

func get_open_wish_count() -> int:
	var cnt := 0
	for w in wish_board:
		if String(w["state"]) == "open":
			cnt += 1
	return cnt

## Short texts of note `slot_idx` for the HUD board panel
func get_wish_display(slot_idx: int) -> Dictionary:
	if slot_idx < 0 or slot_idx >= wish_board.size():
		return {}
	var w: Dictionary = wish_board[slot_idx]
	var cfg: Dictionary = EconomyConfig.WISH_TYPES[String(w["type"])]
	var who := EconomyConfig.tr_name(String(EconomyConfig.WISH_ISLANDER_NAMES.get(String(w["islander"]), "岛民")))
	var st := String(w["state"])
	var prog := "%d/%d%s" % [int(w["progress"]), int(w["target"]), EconomyConfig.tr_name(String(cfg["unit"]))]
	if String(w["type"]) == "earn":
		prog = "%s/%sG" % [_short_num(int(w["progress"])), _short_num(int(w["target"]))]
	var reward := EconomyConfig.tr_key("gm_wish_reward") % [int(w["rep"]), int(w["vouchers"])]
	var title := "★" + who + "·" + EconomyConfig.tr_name(String(cfg["name"]))
	var sub := EconomyConfig.tr_name(String(cfg["verb"])) + " " + prog
	var cost := reward + EconomyConfig.tr_key("gm_wish_left") % UiKit.clock(maxf(0.0, float(w["time_left"])))
	if st == "done":
		title = EconomyConfig.tr_key("gm_wish_done_title") % who
		cost = reward + EconomyConfig.tr_key("gm_wish_claimed")
	elif st == "expired":
		title = EconomyConfig.tr_key("gm_wish_expired_title") % who
		sub = EconomyConfig.tr_key("gm_wish_new_in") % maxi(1, int(ceili(float(w["linger"]))))
		cost = reward + EconomyConfig.tr_key("gm_wish_void")
	return {"title": title, "sub": sub, "cost": cost, "state": st, "progress": int(w["progress"]), "target": int(w["target"]), "kind": EconomyConfig.tr_name(String(cfg["kind"])), "islander": String(w["islander"]), "type": String(w["type"]), "name": EconomyConfig.tr_name(String(cfg["name"])), "who": who}

func _short_num(v: int) -> String:
	if v >= 100000:
		return "%.0fk" % (float(v) / 1000.0)
	if v >= 10000:
		return "%.1fk" % (float(v) / 1000.0)
	return str(v)

func get_wish_board_summary() -> Dictionary:
	return {
		"open": get_open_wish_count(),
		"slots": wish_board.size(),
		"fulfilled": wishes_fulfilled_total,
		"rep": wish_reputation_bonus,
		"vouchers": wish_vouchers_total,
		"medals": wish_medals
	}

## ==================================================================
## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`) & Islander Birthday Party (`岛民生日会`) — no new building
## ==================================================================
func _reset_sky_weather_and_birthday_state() -> void:
	sky_weather_id = ""
	sky_weather_prev_id = ""
	sky_weather_slot_key = -1
	sky_weather_refresh_timer = 0.0
	for w_k in EconomyConfig.SKY_WEATHER_ORDER:
		sky_weathers_seen[w_k] = false
	sky_weather_changes = 0
	birthday_today_islander = ""
	birthday_today_key = ""
	birthday_announced_key = ""
	birthday_last_gift_key = ""
	birthday_counts.clear()
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		birthday_counts[isl_k] = 0
	birthday_parties_total = 0
	birthday_reputation_bonus = 0
	birthday_vouchers_total = 0
	birthday_favourite_gifts = 0
	birthday_medals = 0
	birthday_last_result = {}
	sky_weather_paused = false
	refresh_island_calendar()

## Re-reads the island calendar: season (CI-13), the weather of the current 20-minute slot and today's birthday (no-op while
## paused, so the self-test isolation never moves the season either)
func refresh_island_calendar() -> void:
	if sky_weather_paused:
		return
	refresh_season()
	refresh_solar_term()
	refresh_sky_weather()
	refresh_birthday()
	refresh_food_week()

## ---------------- Cloud-sea weather ----------------
func refresh_sky_weather() -> String:
	if sky_weather_paused and sky_weather_id != "":
		return sky_weather_id
	var dt := get_local_datetime()
	var w_id := EconomyConfig.calc_sky_weather(dt)
	sky_weather_slot_key = EconomyConfig.calc_sky_weather_slot_key(dt)
	if w_id != sky_weather_id:
		var prev := sky_weather_id
		sky_weather_prev_id = prev
		sky_weather_id = w_id
		if prev != "":
			sky_weather_changes += 1
		if not bool(sky_weathers_seen.get(w_id, false)):
			sky_weathers_seen[w_id] = true
			if EventBus != null:
				EventBus.codex_unlocked.emit("weather_" + w_id)
			evaluate_achievements()
		if EventBus != null:
			EventBus.sky_weather_changed.emit(w_id, prev)
	return w_id

func get_sky_weather_id() -> String:
	return sky_weather_id if sky_weather_id != "" else "sunny"

func get_sky_weather_info() -> Dictionary:
	return EconomyConfig.get_sky_weather_info(get_sky_weather_id())

## Raw weather multiplier of a channel (`visitor` / `crop` / `workshop` / `sale`); neutral while paused (self-test isolation)
func get_sky_weather_raw_mult(channel: String) -> float:
	if sky_weather_paused or sky_weather_id == "":
		return 1.0
	return float(get_sky_weather_info().get(channel, 1.0))

## Extra factor the weather adds on top of its group's existing multiplier `group_mult` (capped stacking, see EconomyConfig)
func get_sky_weather_stacked_factor(channel: String, group_mult: float) -> float:
	var w := get_sky_weather_raw_mult(channel)
	if absf(w - 1.0) < 0.000001:
		return 1.0
	var g := maxf(0.0001, group_mult)
	return EconomyConfig.stack_weather_mult(g, w, EconomyConfig.get_sky_weather_stack_cap(channel)) / g

## Customer arrival rate: the festival / cinema product `event_mult` with the weather stacked on it
func apply_sky_weather_visitor_mult(event_mult: float) -> float:
	return event_mult * get_sky_weather_stacked_factor("visitor", event_mult)

func get_seen_sky_weather_count() -> int:
	var cnt := 0
	for w_k in EconomyConfig.SKY_WEATHER_ORDER:
		if bool(sky_weathers_seen.get(w_k, false)):
			cnt += 1
	return cnt

## Weathers of the next `count` 20-minute slots (each slot evaluated at its own local date, so season changes are honoured)
func get_sky_weather_forecast(count: int) -> Array[String]:
	var out: Array[String] = []
	var unix := Time.get_unix_time_from_datetime_dict(EconomyConfig.normalize_datetime(get_local_datetime()))
	for i in range(1, maxi(0, count) + 1):
		out.append(EconomyConfig.calc_sky_weather(Time.get_datetime_dict_from_unix_time(unix + i * EconomyConfig.SKY_WEATHER_SLOT_MINUTES * 60)))
	return out

func get_sky_weather_status_summary() -> Dictionary:
	var info := get_sky_weather_info()
	var fc := get_sky_weather_forecast(1)
	return {
		"id": get_sky_weather_id(),
		"name": EconomyConfig.tr_name(String(info["name"])),
		"full_name": EconomyConfig.tr_name(String(info["full_name"])),
		"desc": EconomyConfig.tr_name(String(info["desc"])),
		"visitor": float(info["visitor"]),
		"crop": float(info["crop"]),
		"workshop": float(info["workshop"]),
		"sale": float(info["sale"]),
		"minutes_left": EconomyConfig.get_sky_weather_minutes_left(get_local_datetime()),
		"next_id": fc[0] if not fc.is_empty() else get_sky_weather_id(),
		"seen": get_seen_sky_weather_count(),
		"night": current_weather == WeatherState.NIGHT
	}

## ---------------- Islander birthday party ----------------
func refresh_birthday() -> String:
	if sky_weather_paused:
		return birthday_today_islander
	var dt := EconomyConfig.normalize_datetime(get_local_datetime())
	var key := EconomyConfig.make_date_key(dt)
	var isl := EconomyConfig.get_birthday_islander_on(int(dt["day"]))
	birthday_today_key = key
	birthday_today_islander = isl
	if isl != "" and birthday_announced_key != key:
		birthday_announced_key = key
		if EventBus != null:
			EventBus.birthday_started.emit(isl, key)
	return isl

func is_birthday_today() -> bool:
	return birthday_today_islander != ""

func has_birthday_gift_today() -> bool:
	return birthday_today_islander != "" and birthday_last_gift_key == birthday_today_key

func can_prepare_birthday_gift() -> bool:
	return is_birthday_today() and not has_birthday_gift_today()

func get_birthday_gift_cost() -> int:
	var base_gps := estimate_idle_gold_per_sec() / get_collection_multiplier()
	return maxi(EconomyConfig.BIRTHDAY_GIFT_MIN_GOLD, int(round(base_gps * EconomyConfig.BIRTHDAY_GIFT_GOLD_SEC)))

## The islander's favourite goods on the market shelf (most stocked first, ties by id); "" when the shelf has none
func find_birthday_favourite_item(isl: String) -> String:
	var best := ""
	var best_n := 0
	var keys := stall_inventory.keys()
	keys.sort()
	for k in keys:
		var n := int(stall_inventory.get(k, 0))
		if n > best_n and EconomyConfig.is_birthday_favourite_item(isl, String(k)):
			best = String(k)
			best_n = n
	return best

## Prepare today's birthday gift: a gift box paid in gold (+ 1 favourite good from the shelf when there is one = `称心礼物`).
## Rewards reputation + codex vouchers; every full round of all 6 islanders adds the `生日全家福` medal.
func prepare_birthday_gift() -> Dictionary:
	if not is_birthday_today():
		return {"given": false, "reason": "no_birthday"}
	var isl := birthday_today_islander
	if has_birthday_gift_today():
		return {"given": false, "reason": "already", "islander": isl}
	var cost := get_birthday_gift_cost()
	if not spend_gold(cost):
		return {"given": false, "reason": "gold", "islander": isl, "cost": cost}
	var fav := find_birthday_favourite_item(isl)
	if fav != "":
		stall_inventory[fav] = maxi(0, int(stall_inventory.get(fav, 0)) - 1)
		if EventBus != null:
			EventBus.inventory_changed.emit()
	var rep_gain := EconomyConfig.BIRTHDAY_REP + (EconomyConfig.BIRTHDAY_FAV_REP if fav != "" else 0)
	var voucher_gain := EconomyConfig.BIRTHDAY_VOUCHERS + (EconomyConfig.BIRTHDAY_FAV_VOUCHERS if fav != "" else 0)
	birthday_last_gift_key = birthday_today_key
	birthday_counts[isl] = int(birthday_counts.get(isl, 0)) + 1
	birthday_parties_total += 1
	if fav != "":
		birthday_favourite_gifts += 1
	var rounds := 999999
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		rounds = mini(rounds, int(birthday_counts.get(isl_k, 0)))
	var medal := rounds > birthday_medals
	if medal:
		birthday_medals = rounds
		rep_gain += EconomyConfig.BIRTHDAY_MEDAL_REP
		voucher_gain += EconomyConfig.BIRTHDAY_MEDAL_VOUCHERS
	birthday_reputation_bonus += rep_gain
	birthday_vouchers_total += voucher_gain
	add_rare_voucher(voucher_gain)
	# CI-16: a birthday gift (a favourite one even more) deepens the bond with the birthday islander
	add_friendship_points(isl, EconomyConfig.FRIEND_BIRTHDAY_POINTS + (EconomyConfig.FRIEND_BIRTHDAY_FAV_POINTS if fav != "" else 0), "birthday")
	var res := {"given": true, "islander": isl, "date": birthday_today_key, "cost": cost, "favourite": fav, "rep": rep_gain, "vouchers": voucher_gain, "medal": medal, "count": int(birthday_counts[isl])}
	birthday_last_result = res
	if SoundManager != null:
		if medal:
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_coin_sfx()
	if EventBus != null:
		EventBus.birthday_gift_given.emit(isl, res.duplicate())
		EventBus.spawn_floating_text.emit(
			Vector2(MarketStall.SLOT_X, EconomyConfig.GROUND_Y - 56.0),
			EconomyConfig.tr_fmt("ft_bday", [EconomyConfig.get_islander_name(isl), rep_gain, voucher_gain, EconomyConfig.tr_key("ft_bday_medal") if medal else ""]),
			Color("#FFC9E3")
		)
	evaluate_achievements()
	EventBus.prosperity_changed.emit(get_prosperity_score())
	return res

func get_celebrated_islander_count() -> int:
	var cnt := 0
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		if int(birthday_counts.get(isl_k, 0)) > 0:
			cnt += 1
	return cnt

## The next birthday strictly after today: {islander, year, month, day, days}
func get_next_birthday_info() -> Dictionary:
	var n := EconomyConfig.normalize_datetime(get_local_datetime())
	var noon := Time.get_unix_time_from_datetime_dict({"year": int(n["year"]), "month": int(n["month"]), "day": int(n["day"]), "hour": 12, "minute": 0, "second": 0})
	for d in range(1, 40):
		var dd := Time.get_datetime_dict_from_unix_time(noon + d * 86400)
		var isl := EconomyConfig.get_birthday_islander_on(int(dd["day"]))
		if isl != "":
			return {"islander": isl, "year": int(dd["year"]), "month": int(dd["month"]), "day": int(dd["day"]), "days": d}
	return {}

## CI-15: restore the weather codex + birthday progress from a parsed save (the weather itself follows the island calendar)
func _load_sky_weather_and_birthday_state(parsed: Dictionary) -> void:
	var src_sw: Dictionary = parsed["sky_weathers_seen"] if (parsed.has("sky_weathers_seen") and parsed["sky_weathers_seen"] is Dictionary) else {}
	for w_k in EconomyConfig.SKY_WEATHER_ORDER:
		sky_weathers_seen[w_k] = bool(src_sw.get(w_k, false))
	sky_weather_changes = maxi(0, int(parsed.get("sky_weather_changes", 0)))
	birthday_last_gift_key = String(parsed.get("birthday_last_gift_key", ""))
	var src_bc: Dictionary = parsed["birthday_counts"] if (parsed.has("birthday_counts") and parsed["birthday_counts"] is Dictionary) else {}
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		birthday_counts[isl_k] = maxi(0, int(src_bc.get(isl_k, 0)))
	birthday_parties_total = maxi(0, int(parsed.get("birthday_parties_total", 0)))
	birthday_reputation_bonus = maxi(0, int(parsed.get("birthday_reputation_bonus", 0)))
	birthday_vouchers_total = maxi(0, int(parsed.get("birthday_vouchers_total", 0)))
	birthday_favourite_gifts = maxi(0, int(parsed.get("birthday_favourite_gifts", 0)))
	birthday_medals = maxi(0, int(parsed.get("birthday_medals", 0)))
	birthday_last_result = {}
	refresh_island_calendar()

func get_birthday_status_summary() -> Dictionary:
	return {
		"today": birthday_today_islander,
		"date": birthday_today_key,
		"gift_given": has_birthday_gift_today(),
		"can_gift": can_prepare_birthday_gift(),
		"cost": get_birthday_gift_cost(),
		"favourite": find_birthday_favourite_item(birthday_today_islander) if birthday_today_islander != "" else "",
		"parties": birthday_parties_total,
		"celebrated": get_celebrated_islander_count(),
		"medals": birthday_medals,
		"rep": birthday_reputation_bonus,
		"vouchers": birthday_vouchers_total,
		"next": get_next_birthday_info()
	}

## ==================================================================
## CI-16: Cloud-Isle Food Critics' Week (`云岛美食评鉴周`) & Islander Friendship Bonds (`岛民友谊羁绊`) — no new building
## ==================================================================
func _reset_food_week_and_friendship_state() -> void:
	food_week_index = -1
	food_week_judge = ""
	food_week_announced_index = -1
	food_week_entries.clear()
	food_week_scores.clear()
	food_week_best = 0
	food_week_tier = 0
	food_week_entries_total = 0
	food_week_medals = {"bronze": 0, "silver": 0, "gold": 0}
	food_week_reputation_bonus = 0
	food_week_vouchers_total = 0
	food_week_dish_best.clear()
	food_week_last_result = {}
	friendship_points.clear()
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		friendship_points[isl_k] = 0
	friendship_last_levelup = {}
	food_friend_paused = false
	refresh_food_week()

## ---------------- Food Critics' Week ----------------
## Re-reads the island-calendar week: a new week brings the next judge and clears last week's entries (medals are kept)
func refresh_food_week() -> int:
	if food_friend_paused and food_week_index >= 0:
		return food_week_index
	var dt := get_local_datetime()
	var w_idx := EconomyConfig.calc_food_week_index(dt)
	if w_idx != food_week_index:
		food_week_index = w_idx
		food_week_entries.clear()
		food_week_scores.clear()
		food_week_best = 0
		food_week_tier = 0
		food_week_last_result = {}
	food_week_judge = EconomyConfig.get_food_week_judge(w_idx)
	if food_week_announced_index != w_idx:
		food_week_announced_index = w_idx
		if EventBus != null:
			EventBus.food_week_started.emit(food_week_judge, w_idx)
	return w_idx

func get_food_week_taste() -> String:
	return EconomyConfig.get_food_judge_taste(food_week_judge)

func get_food_week_days_left() -> int:
	return EconomyConfig.calc_food_week_days_left(get_local_datetime())

func get_food_week_entries_left() -> int:
	return maxi(0, EconomyConfig.FOOD_WEEK_ENTRIES - food_week_entries.size())

## Score this week's judge would give `item_id` right now
func get_food_week_score_preview(item_id: String) -> int:
	return EconomyConfig.calc_food_week_score(item_id, get_food_week_taste(), get_friendship_level(food_week_judge))

## Best entry on the market shelf that has not been entered this week yet (highest score, ties by id); "" when none
func find_food_week_best_dish() -> String:
	var best := ""
	var best_s := -1
	var keys := stall_inventory.keys()
	keys.sort()
	for k in keys:
		var id := String(k)
		if int(stall_inventory.get(id, 0)) <= 0 or not EconomyConfig.is_food_week_dish(id) or food_week_entries.has(id):
			continue
		var s := get_food_week_score_preview(id)
		if s > best_s:
			best = id
			best_s = s
	return best

## Enter one existing dish (1 piece from the market shelf) for the week's judge. Default = the best dish on the shelf.
## Reward: reputation = score / 4, friendship with the judge (+ taste match), and the week's medal tier once per tier.
func enter_food_week_dish(item_id: String = "") -> Dictionary:
	if food_week_index < 0:
		refresh_food_week()
	if get_food_week_entries_left() <= 0:
		return {"entered": false, "reason": "full"}
	var dish := item_id if item_id != "" else find_food_week_best_dish()
	if dish == "":
		return {"entered": false, "reason": "no_dish"}
	if not EconomyConfig.is_food_week_dish(dish):
		return {"entered": false, "reason": "not_dish", "dish": dish}
	if food_week_entries.has(dish):
		return {"entered": false, "reason": "repeat", "dish": dish}
	if int(stall_inventory.get(dish, 0)) <= 0:
		return {"entered": false, "reason": "stock", "dish": dish}
	stall_inventory[dish] = int(stall_inventory.get(dish, 0)) - 1
	if EventBus != null:
		EventBus.inventory_changed.emit()
	var judge := food_week_judge
	var taste := get_food_week_taste()
	var taste_match := EconomyConfig.get_food_dish_taste(dish) == taste
	var score := get_food_week_score_preview(dish)
	food_week_entries.append(dish)
	food_week_scores.append(score)
	food_week_entries_total += 1
	food_week_dish_best[dish] = maxi(int(food_week_dish_best.get(dish, 0)), score)
	var rep_gain := int(score / EconomyConfig.FOOD_WEEK_REP_DIV)
	var voucher_gain := 0
	var new_tier := EconomyConfig.calc_food_week_tier(score)
	var medal_up := new_tier > food_week_tier
	if medal_up:
		var md: Dictionary = EconomyConfig.FOOD_WEEK_MEDALS[EconomyConfig.FOOD_WEEK_MEDAL_ORDER[new_tier - 1]]
		rep_gain += int(md["rep"])
		voucher_gain += int(md["vouchers"])
		if food_week_tier > 0:
			var old_k := EconomyConfig.FOOD_WEEK_MEDAL_ORDER[food_week_tier - 1]
			food_week_medals[old_k] = maxi(0, int(food_week_medals.get(old_k, 0)) - 1)
		var new_k := EconomyConfig.FOOD_WEEK_MEDAL_ORDER[new_tier - 1]
		food_week_medals[new_k] = int(food_week_medals.get(new_k, 0)) + 1
		food_week_tier = new_tier
	food_week_best = maxi(food_week_best, score)
	food_week_reputation_bonus += rep_gain
	food_week_vouchers_total += voucher_gain
	if voucher_gain > 0:
		add_rare_voucher(voucher_gain)
	var fr_gain := EconomyConfig.FRIEND_FOOD_POINTS + (EconomyConfig.FRIEND_FOOD_MATCH_POINTS if taste_match else 0)
	var lv_before := get_friendship_level(judge)
	add_friendship_points(judge, fr_gain, "food_week")
	var res := {"entered": true, "dish": dish, "judge": judge, "taste": taste, "match": taste_match, "score": score, "rep": rep_gain, "vouchers": voucher_gain,
		"medal_up": medal_up, "tier": food_week_tier, "friend": fr_gain, "friend_lv": get_friendship_level(judge), "friend_up": get_friendship_level(judge) > lv_before,
		"left": get_food_week_entries_left()}
	food_week_last_result = res
	if SoundManager != null:
		if medal_up:
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_coin_sfx()
	if EventBus != null:
		EventBus.food_week_scored.emit(res.duplicate())
		EventBus.spawn_floating_text.emit(
			Vector2(MarketStall.SLOT_X, EconomyConfig.GROUND_Y - 56.0),
			EconomyConfig.tr_fmt("ft_food_week", [EconomyConfig.get_islander_name(judge), score, rep_gain, (" " + EconomyConfig.get_food_medal_name(food_week_tier)) if medal_up else ""]),
			Color("#FFD8A8")
		)
	evaluate_achievements()
	if EventBus != null:
		EventBus.prosperity_changed.emit(get_prosperity_score())
	return res

func get_food_week_medal_total() -> int:
	return int(food_week_medals.get("bronze", 0)) + int(food_week_medals.get("silver", 0)) + int(food_week_medals.get("gold", 0))

func get_food_week_dishes_judged() -> int:
	return food_week_dish_best.size()

func get_food_week_status_summary() -> Dictionary:
	var best_dish := find_food_week_best_dish()
	return {
		"week": food_week_index,
		"judge": food_week_judge,
		"taste": get_food_week_taste(),
		"days_left": get_food_week_days_left(),
		"entries": food_week_entries.size(),
		"entries_left": get_food_week_entries_left(),
		"best": food_week_best,
		"tier": food_week_tier,
		"next_dish": best_dish,
		"next_score": get_food_week_score_preview(best_dish) if best_dish != "" else 0,
		"medals": get_food_week_medal_total(),
		"gold": int(food_week_medals.get("gold", 0)),
		"dishes": get_food_week_dishes_judged(),
		"total": food_week_entries_total,
		"rep": food_week_reputation_bonus,
		"vouchers": food_week_vouchers_total
	}

## ---------------- Friendship bonds ----------------
## Only real events call this (wish fulfilled, birthday gift, food-week entry). No-op while paused (self-test isolation).
func add_friendship_points(isl: String, pts: int, source: String) -> int:
	if food_friend_paused or pts <= 0 or not EconomyConfig.WISH_ISLANDERS.has(isl):
		return 0
	var cap_pts: int = EconomyConfig.FRIEND_LEVEL_POINTS[EconomyConfig.FRIEND_MAX_LEVEL]
	var before := int(friendship_points.get(isl, 0))
	var after := mini(cap_pts, before + pts)
	friendship_points[isl] = after
	var lv_b := EconomyConfig.calc_friend_level(before)
	var lv_a := EconomyConfig.calc_friend_level(after)
	if lv_a > lv_b:
		friendship_last_levelup = {"islander": isl, "level": lv_a, "source": source}
		if EventBus != null:
			EventBus.friendship_level_up.emit(isl, lv_a, source)
	return after - before

func get_friendship_points(isl: String) -> int:
	return int(friendship_points.get(isl, 0))

func get_friendship_level(isl: String) -> int:
	return EconomyConfig.calc_friend_level(get_friendship_points(isl))

func get_friendship_total_levels() -> int:
	var total := 0
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		total += get_friendship_level(isl_k)
	return total

## Permanent market-price bonus from all bonds (+0.3% per level, capped at +9%)
func get_friendship_price_bonus() -> float:
	return EconomyConfig.calc_friend_price_bonus(get_friendship_total_levels())

func get_max_friend_count() -> int:
	var cnt := 0
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		if get_friendship_level(isl_k) >= EconomyConfig.FRIEND_MAX_LEVEL:
			cnt += 1
	return cnt

func _load_food_week_and_friendship_state(parsed: Dictionary) -> void:
	var src_fp: Dictionary = parsed["friendship_points"] if (parsed.has("friendship_points") and parsed["friendship_points"] is Dictionary) else {}
	var cap_pts: int = EconomyConfig.FRIEND_LEVEL_POINTS[EconomyConfig.FRIEND_MAX_LEVEL]
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		friendship_points[isl_k] = clampi(int(src_fp.get(isl_k, 0)), 0, cap_pts)
	var src_md: Dictionary = parsed["food_week_medals"] if (parsed.has("food_week_medals") and parsed["food_week_medals"] is Dictionary) else {}
	for mk in EconomyConfig.FOOD_WEEK_MEDAL_ORDER:
		food_week_medals[mk] = maxi(0, int(src_md.get(mk, 0)))
	food_week_entries_total = maxi(0, int(parsed.get("food_week_entries_total", 0)))
	food_week_reputation_bonus = maxi(0, int(parsed.get("food_week_reputation_bonus", 0)))
	food_week_vouchers_total = maxi(0, int(parsed.get("food_week_vouchers_total", 0)))
	food_week_dish_best.clear()
	var src_db: Dictionary = parsed["food_week_dish_best"] if (parsed.has("food_week_dish_best") and parsed["food_week_dish_best"] is Dictionary) else {}
	for dk in src_db.keys():
		if EconomyConfig.is_food_week_dish(String(dk)):
			food_week_dish_best[String(dk)] = clampi(int(src_db[dk]), 0, EconomyConfig.FOOD_WEEK_SCORE_CAP)
	# this week's entries only survive when the save is from the same island-calendar week
	food_week_index = int(parsed.get("food_week_index", -1))
	food_week_announced_index = food_week_index
	food_week_entries.clear()
	food_week_scores.clear()
	var src_en: Array = parsed["food_week_entries"] if (parsed.has("food_week_entries") and parsed["food_week_entries"] is Array) else []
	var src_sc: Array = parsed["food_week_scores"] if (parsed.has("food_week_scores") and parsed["food_week_scores"] is Array) else []
	for ei in range(mini(src_en.size(), EconomyConfig.FOOD_WEEK_ENTRIES)):
		var eid := String(src_en[ei])
		if EconomyConfig.is_food_week_dish(eid) and not food_week_entries.has(eid):
			food_week_entries.append(eid)
			food_week_scores.append(clampi(int(src_sc[ei]) if ei < src_sc.size() else 0, 0, EconomyConfig.FOOD_WEEK_SCORE_CAP))
	food_week_best = 0
	for sc in food_week_scores:
		food_week_best = maxi(food_week_best, sc)
	food_week_tier = clampi(int(parsed.get("food_week_tier", 0)), 0, EconomyConfig.FOOD_WEEK_MEDAL_ORDER.size())
	food_week_last_result = {}
	refresh_food_week()

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
	score += chef_reputation_bonus + get_passed_tasting_challenge_count() * 45 + wish_lantern_reputation_bonus
	score += harbor_reputation_bonus
	score += dairy_reputation_bonus + get_unlocked_dairy_count() * 40 + cinema_reputation_bonus + get_unlocked_film_count() * 42
	score += pottery_reputation_bonus + get_unlocked_pottery_count() * 40 + food_week_reputation_bonus
	score += kite_reputation_bonus + get_unlocked_kite_count() * 40 + get_seen_season_count() * 25
	score += wish_reputation_bonus
	score += birthday_reputation_bonus + get_seen_sky_weather_count() * EconomyConfig.SKY_WEATHER_CODEX_REP_PER_TYPE
	for i in range(Pacing.STAR_SCORE.size() - 1, -1, -1):
		if score >= int(Pacing.STAR_SCORE[i]):
			return i + 2
	return 1

func get_career_summary_text() -> String:
	return EconomyConfig.tr_key("gm_career") % [
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
		Vector2(884.7, EconomyConfig.GROUND_Y - 46.0),
		EconomyConfig.tr_fmt("ft_achievement", [EconomyConfig.tr_name(String(cfg.get("name", ach_id)))]),
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
	if wish_lanterns_collected >= 1 and unlock_achievement("ach_wish_lantern"):
		newly.append("ach_wish_lantern")
	if chef_medals >= 1 and unlock_achievement("ach_chef_medal"):
		newly.append("ach_chef_medal")
	if seafood_landed_total >= 1 and unlock_achievement("ach_lighthouse_harbor"):
		newly.append("ach_lighthouse_harbor")
	if get_unlocked_dairy_count() >= EconomyConfig.DAIRY_CODEX_ORDER.size() and unlock_achievement("ach_dairy_ranch"):
		newly.append("ach_dairy_ranch")
	if cinema_medals >= 1 and unlock_achievement("ach_starry_cinema"):
		newly.append("ach_starry_cinema")
	if get_unlocked_pottery_count() >= EconomyConfig.POTTERY_CODEX_ORDER.size() and unlock_achievement("ach_pottery_kiln"):
		newly.append("ach_pottery_kiln")
	if kite_medals >= 1 and unlock_achievement("ach_kite_sweep"):
		newly.append("ach_kite_sweep")
	if get_seen_season_count() >= EconomyConfig.SEASON_ORDER.size() and unlock_achievement("ach_four_seasons"):
		newly.append("ach_four_seasons")
	if wish_medals >= 1 and unlock_achievement("ach_wish_keeper"):
		newly.append("ach_wish_keeper")
	if get_seen_sky_weather_count() >= EconomyConfig.SKY_WEATHER_ORDER.size() and unlock_achievement("ach_weather_watcher"):
		newly.append("ach_weather_watcher")
	if birthday_medals >= 1 and unlock_achievement("ach_birthday_family"):
		newly.append("ach_birthday_family")
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
		if k == "chef_pavilion" and not chef_pavilion_unlocked:
			continue
		if k == "lighthouse_harbor" and not lighthouse_harbor_unlocked:
			continue
		if k == "dairy_workshop" and not dairy_workshop_unlocked:
			continue
		if k == "pottery_kiln" and not pottery_kiln_unlocked:
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
	if chef_pavilion_unlocked and bool(unlocked_islands.get(2, false)):
		score += 150 + chef_medals * 60
	if bool(unlocked_islands.get(3, false)):
		score += 420
	if hotspring_unlocked and bool(unlocked_islands.get(3, false)):
		score += 160
	if lighthouse_harbor_unlocked and bool(unlocked_islands.get(3, false)):
		score += 150
	if dairy_workshop_unlocked:
		score += 140
	if open_air_cinema_unlocked:
		score += 120 + cinema_medals * 60
	if pottery_kiln_unlocked and bool(unlocked_islands.get(3, false)):
		score += 140
	score += kite_medals * 50 + get_seen_season_count() * 20
	score += wish_medals * 50
	score += birthday_medals * 50 + get_seen_sky_weather_count() * 10
	score += int(food_week_medals.get("gold", 0)) * 50 + int(food_week_medals.get("silver", 0)) * 30 + int(food_week_medals.get("bronze", 0)) * 15 + get_friendship_total_levels() * 10
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
	var b_key := "soil_3" if workshop_id == "coral_linked" else workshop_id
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

## All live bonuses of one sale, before the cap (`collect_from_till` caps them together)
func get_sale_bonus(item_id: String, is_vip: bool = false) -> float:
	# CI-13: kite-festival wind sales x(1 + 0.20 w) and the summer parasol props (+2% per prop)
	var kite_mult := get_kite_wind_sale_multiplier() * get_season_bonus_multiplier("sale_price")
	# CI-15: the cloud-sea weather joins the climate sale group (kite wind x summer props), bonus capped at x1.30
	kite_mult *= get_sky_weather_stacked_factor("sale", kite_mult)
	return (get_market_mood_multiplier() * get_moon_tea_sale_multiplier(item_id) * get_wish_lantern_sale_multiplier(item_id)
		* get_cinema_sale_multiplier(item_id) * kite_mult * get_tip_bonus(is_vip, 3))

func try_purchase_from_stall(preferred_id: String, qty: int, world_pos: Vector2, is_vip: bool = false) -> int:
	var target_id := preferred_id
	if int(stall_inventory.get(target_id, 0)) <= 0:
		for k in ["dish_mountain_sea_hotpot", "dish_starlight_fish", "dish_cloud_dumplings", "dairy_cloud_pudding", "pottery_vase", "dairy_cheese", "pottery_tea_bowl", "seafood_catch", "dairy_milk", "tea_osmanthus_oolong", "tea_cloud_longjing", "tea_spring_leaves", "solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0", "crop_3", "crop_2", "crop_1", "crop_0"]:
			if int(stall_inventory.get(k, 0)) > 0:
				target_id = k
				break
	var avail := int(stall_inventory.get(target_id, 0))
	if avail <= 0:
		return 0
	var bought := mini(avail, maxi(1, qty))
	stall_inventory[target_id] = avail - bought
	unlock_codex_entry(target_id)

	var total_earned := collect_from_till(0.8 if is_vip else 0.6, get_sale_bonus(target_id, is_vip))

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

## How many steps one press buys: 1, 10, or -1 = as many as the gold allows
const BULK_MODES: Array[int] = [1, 10, -1]
const BULK_LIMIT := 200
var bulk_mode: int = 1

func cycle_bulk_mode() -> int:
	bulk_mode = BULK_MODES[(BULK_MODES.find(bulk_mode) + 1) % BULK_MODES.size()]
	return bulk_mode

## [steps, price] of one press on a building / a crew team
func get_bulk_building(key: String) -> Array:
	var lv := maxi(1, int(building_levels.get(key, 1)))
	return _bulk_steps(func(i: int) -> int: return Pacing.line_cost(key, lv + i))

func get_bulk_animal(key: String) -> Array:
	var step := get_total_recruited(key) + maxi(1, int(animal_levels.get(key, 0)))
	return _bulk_steps(func(i: int) -> int: return Pacing.animal_cost(key, step + i))

func _bulk_steps(cost_of: Callable) -> Array:
	var sum: int = cost_of.call(0)
	var n := 1
	if bulk_mode > 1:
		while n < bulk_mode:
			sum += int(cost_of.call(n))
			n += 1
	elif bulk_mode < 0:
		while n < BULK_LIMIT:
			var c: int = cost_of.call(n)
			if sum + c > gold:
				break
			sum += c
			n += 1
	return [n, sum]

func upgrade_building(b_key: String, steps: int = 1) -> bool:
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
	if b_key == "chef_pavilion" and not chef_pavilion_unlocked:
		return false
	if b_key == "lighthouse_harbor" and not lighthouse_harbor_unlocked:
		return false
	if b_key == "dairy_workshop" and not dairy_workshop_unlocked:
		return false
	if b_key == "pottery_kiln" and not pottery_kiln_unlocked:
		return false
	var req_island := int(EconomyConfig.BUILDINGS[b_key].get("island", 1))
	if not bool(unlocked_islands.get(req_island, false)):
		return false
	var cur_lv := int(building_levels.get(b_key, 1))
	var n := maxi(1, steps)
	if not spend_gold(Pacing.line_cost_n(b_key, cur_lv, n)):
		return false
	building_levels[b_key] = cur_lv + n
	_sync_codex_from_progression()
	replace_impossible_orders()
	EventBus.upgrade_purchased.emit("building", b_key, cur_lv + n)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

## PRD v2.2 Section 3: Recruit-to-Promote Mechanism (`招满转进修机制`):
## - If any unlocked island has room below `ISLAND_RECRUIT_CAPS`, recruits +1 animal worker onto that island.
## - Once all unlocked islands reach Max Cap for `a_key`, upgrades `animal_levels[a_key] += 1` (Team Promotion Lv.+1)!
func upgrade_animal(a_key: String, steps: int = 1) -> bool:
	if not EconomyConfig.ANIMALS.has(a_key):
		return false
	var cur_lv := int(animal_levels.get(a_key, 0))
	var n := maxi(1, steps)
	if not spend_gold(Pacing.animal_cost_n(a_key, get_total_recruited(a_key) + maxi(1, cur_lv), n)):
		return false
	var promoted := false
	for _i in range(n):
		var next_isl := find_next_recruit_island(a_key)
		if next_isl > 0:
			island_recruited[next_isl][a_key] = get_island_recruited_count(next_isl, a_key) + 1
			if int(animal_levels.get(a_key, 0)) <= 0:
				animal_levels[a_key] = 1
			EventBus.upgrade_purchased.emit("recruit", a_key, get_total_recruited(a_key))
		else:
			animal_levels[a_key] = maxi(1, int(animal_levels.get(a_key, 0))) + 1
			promoted = true
	if promoted:
		EventBus.upgrade_purchased.emit("animal", a_key, int(animal_levels[a_key]))
	if SoundManager != null:
		if promoted and int(animal_levels[a_key]) / 25 > cur_lv / 25:
			SoundManager.play_milestone_sfx()
		else:
			SoundManager.play_upgrade_sfx()

	_sync_codex_from_progression()
	evaluate_achievements()
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func unlock_island(island_idx: int) -> bool:
	if bool(unlocked_islands.get(island_idx, false)):
		return false
	var exp_key := "island_" + str(island_idx)
	var cost := int(EconomyConfig.EXPANSIONS[exp_key]["cost"])
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

## Writes a whole file next to the old one, then swaps: a crash or a full disk never leaves half a save
func _write_save_text(path: String, txt: String) -> bool:
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(txt)
	f.flush()
	var ok := f.get_error() == OK
	f.close()
	if not ok or FileAccess.get_file_as_string(tmp).length() != txt.length():
		return false
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(tmp), ProjectSettings.globalize_path(path)) == OK

## A save this version cannot read is copied aside under a name of its own, never overwritten
func _keep_unreadable_save(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	var raw := FileAccess.get_file_as_bytes(path)
	if raw.size() < 2:
		return ""
	var js := JSON.new()
	var readable := js.parse(raw.get_string_from_utf8()) == OK and js.data is Dictionary
	var tag := "v%d" % int(js.data.get("version", 0)) if readable else "broken"
	var keep := "%s.%s.%d.keep" % [path, tag, int(Time.get_unix_time_from_system())]
	if DirAccess.copy_absolute(ProjectSettings.globalize_path(path), ProjectSettings.globalize_path(keep)) != OK:
		return ""
	return keep

func calculate_and_apply_offline_earnings(elapsed_sec: int) -> Dictionary:
	var clamped_sec := clampi(elapsed_sec, 0, Pacing.OFFLINE_CAP_SEC)
	if clamped_sec < 60:
		return {"seconds": clamped_sec, "gold": 0, "items": 0}
	var gold_earned := maxi(8, int(round(float(clamped_sec) * estimate_idle_gold_per_sec() * Pacing.OFFLINE_RATE)))
	var total_workers := 0
	for k in animal_levels.keys():
		total_workers += get_total_recruited(String(k))
	var ws_lv := int(building_levels.get("mortar", 1)) + int(building_levels.get("cauldron", 1))
	var items_est := maxi(1, int(round(float(clamped_sec) / 10.0 * (float(maxi(1, total_workers)) * 0.6 + float(ws_lv) * 0.2))))
	festival_gap_timer = maxf(0.0, festival_gap_timer - float(elapsed_sec)) if festival_gap_timer > 0.0 else festival_gap_timer
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
		_write_save_text(get_backup_save_path(), prev_txt)

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
		"festival_gap_timer": festival_gap_timer,
		"day_phase": current_weather,
		"day_phase_timer": weather_timer,
		"festival_turn": festival_turn,
		"till_gold": till_gold,
		"airship_timer": airship_timer,
		"balloon_timer": balloon_timer,
		"moon_tea_boat_claimed": moon_tea_boat_claimed,
		"lanterns_this_festival": lanterns_this_festival,
		"lantern_encores": lantern_encores,
		"kite_festival": [kite_festival_active, kite_festival_clock, kite_festival_idx, kite_collected_slots],
		"cinema_night": [cinema_night_on, cinema_night_clock, cinema_screenings_tonight, cinema_snacks_tonight, cinema_last_started_idx],
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
		"moon_tea_boat_claims": moon_tea_boat_claims,
		"wish_lantern_festival_timer": wish_lantern_festival_timer,
		"wish_lanterns_collected": wish_lanterns_collected,
		"wish_lantern_reputation_bonus": wish_lantern_reputation_bonus,
		"chef_pavilion_unlocked": chef_pavilion_unlocked,
		"active_tasting_dish_id": active_tasting_dish_id,
		"chef_cook_timer": chef_cook_timer,
		"tasting_cook_counts": tasting_cook_counts,
		"tasting_inventory": tasting_inventory,
		"unlocked_tasting_dishes": unlocked_tasting_dishes,
		"tasting_challenges_passed": tasting_challenges_passed,
		"tasting_best_scores": tasting_best_scores,
		"chef_medals": chef_medals,
		"chef_reputation_bonus": chef_reputation_bonus,
		"tastings_held": tastings_held,
		"lighthouse_harbor_unlocked": lighthouse_harbor_unlocked,
		"harbor_clock": harbor_clock,
		"harbor_boat_trips": harbor_boat_trips,
		"harbor_seafood_inventory": harbor_seafood_inventory,
		"seafood_landed_total": seafood_landed_total,
		"harbor_trips_total": harbor_trips_total,
		"harbor_reputation_bonus": harbor_reputation_bonus,
		"dairy_workshop_unlocked": dairy_workshop_unlocked,
		"active_dairy_recipe_id": active_dairy_recipe_id,
		"dairy_timer": dairy_timer,
		"dairy_inventory": dairy_inventory,
		"dairy_craft_counts": dairy_craft_counts,
		"unlocked_dairy_items": unlocked_dairy_items,
		"dairy_feed_consumed": dairy_feed_consumed,
		"dairy_reputation_bonus": dairy_reputation_bonus,
		"open_air_cinema_unlocked": open_air_cinema_unlocked,
		"cinema_film_screen_counts": cinema_film_screen_counts,
		"unlocked_films": unlocked_films,
		"cinema_medals": cinema_medals,
		"cinema_screenings_total": cinema_screenings_total,
		"cinema_screenings_cancelled": cinema_screenings_cancelled,
		"cinema_audience_total": cinema_audience_total,
		"cinema_ticket_gold_total": cinema_ticket_gold_total,
		"cinema_snack_gold_total": cinema_snack_gold_total,
		"cinema_reputation_bonus": cinema_reputation_bonus,
		"pottery_kiln_unlocked": pottery_kiln_unlocked,
		"active_pottery_recipe_id": active_pottery_recipe_id,
		"pottery_kiln_timer": pottery_kiln_timer,
		"pottery_inventory": pottery_inventory,
		"pottery_craft_counts": pottery_craft_counts,
		"unlocked_pottery_items": unlocked_pottery_items,
		"pottery_fuel_consumed": pottery_fuel_consumed,
		"pottery_clay_dug_total": pottery_clay_dug_total,
		"pottery_packed_in_boxes": pottery_packed_in_boxes,
		"pottery_reputation_bonus": pottery_reputation_bonus,
		"kite_festivals_held": kite_festivals_held,
		"kite_collect_counts": kite_collect_counts,
		"unlocked_kites": unlocked_kites,
		"kite_medals": kite_medals,
		"kite_collected_total": kite_collected_total,
		"kite_gold_total": kite_gold_total,
		"kite_reputation_bonus": kite_reputation_bonus,
		"seasons_seen": seasons_seen,
		"wish_board": wish_board,
		"wish_serial_next": wish_serial_next,
		"wishes_fulfilled_total": wishes_fulfilled_total,
		"wish_fulfilled_counts": wish_fulfilled_counts,
		"wish_reputation_bonus": wish_reputation_bonus,
		"wish_vouchers_total": wish_vouchers_total,
		"wish_medals": wish_medals,
		"sky_weathers_seen": sky_weathers_seen,
		"sky_weather_changes": sky_weather_changes,
		"birthday_last_gift_key": birthday_last_gift_key,
		"birthday_counts": birthday_counts,
		"birthday_parties_total": birthday_parties_total,
		"birthday_reputation_bonus": birthday_reputation_bonus,
		"birthday_vouchers_total": birthday_vouchers_total,
		"birthday_favourite_gifts": birthday_favourite_gifts,
		"birthday_medals": birthday_medals,
		"food_week_index": food_week_index,
		"food_week_entries": food_week_entries,
		"food_week_scores": food_week_scores,
		"food_week_tier": food_week_tier,
		"food_week_entries_total": food_week_entries_total,
		"food_week_medals": food_week_medals,
		"food_week_reputation_bonus": food_week_reputation_bonus,
		"food_week_vouchers_total": food_week_vouchers_total,
		"food_week_dish_best": food_week_dish_best,
		"friendship_points": friendship_points,
		"guest_visits": guest_visits,
		"guest_pending": guest_pending,
		"guest_timer": guest_timer,
		"featured_dish": featured_dish,
		"decor_owned": decor_owned,
		"decor_placed": decor_placed
	}
	var json_str := JSON.stringify(data, "\t")
	_write_save_text(active_save_path, json_str)
	if SteamBridge != null and SteamBridge.has_method("cloud_write"):
		SteamBridge.cloud_write("savegame_cloud.json", json_str)
	if not FileAccess.file_exists(get_backup_save_path()):
		_write_save_text(get_backup_save_path(), json_str)

func _load_kite_festival(raw: Variant) -> void:
	kite_festival_active = false
	kite_festival_clock = 0.0
	kite_collected_slots.clear()
	if not (raw is Array) or (raw as Array).size() < 4 or not bool(raw[0]):
		return
	kite_festival_active = true
	kite_festival_clock = clampf(float(raw[1]), 0.0, EconomyConfig.KITE_FESTIVAL_SEC)
	kite_festival_idx = maxi(0, int(raw[2]))
	if raw[3] is Array:
		for sl in raw[3]:
			if not kite_collected_slots.has(int(sl)):
				kite_collected_slots.append(int(sl))

## The films of this night are not shown twice because the game was restarted
func _load_cinema_night(raw: Variant) -> void:
	cinema_night_on = false
	cinema_night_clock = 0.0
	cinema_screenings_tonight = 0
	cinema_snacks_tonight = 0
	cinema_last_started_idx = -1
	if not (raw is Array) or (raw as Array).size() < 5 or not bool(raw[0]) or current_weather != WeatherState.NIGHT:
		return
	cinema_night_on = true
	cinema_night_clock = maxf(0.0, float(raw[1]))
	cinema_screenings_tonight = maxi(0, int(raw[2]))
	cinema_snacks_tonight = maxi(0, int(raw[3]))
	cinema_last_started_idx = int(raw[4])

func load_game() -> void:
	var parsed := _parse_valid_save_dict(active_save_path)
	if parsed.is_empty():
		# a write that was cut off after the old file was gone leaves the new one under its working name
		for spare in [active_save_path + ".tmp", get_backup_save_path(), get_backup_save_path() + ".tmp"]:
			parsed = _parse_valid_save_dict(spare)
			if not parsed.is_empty():
				if not is_automated_test_mode:
					_keep_unreadable_save(active_save_path)
				if spare == active_save_path + ".tmp":
					DirAccess.rename_absolute(ProjectSettings.globalize_path(spare), ProjectSettings.globalize_path(active_save_path))
				else:
					_write_save_text(active_save_path, FileAccess.get_file_as_string(spare))
				break
	if parsed.is_empty():
		if not is_automated_test_mode:
			_keep_unreadable_save(active_save_path)
			_keep_unreadable_save(get_backup_save_path())
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
	festival_gap_timer = clampf(float(parsed.get("festival_gap_timer", Pacing.FESTIVAL_FIRST_SEC)), -Pacing.FESTIVAL_AUTO_SEC, Pacing.FESTIVAL_GAP_SEC)
	festival_turn = maxi(0, int(parsed.get("festival_turn", 0)))
	till_gold = maxf(0.0, float(parsed.get("till_gold", 0.0)))
	airship_timer = clampf(float(parsed.get("airship_timer", AIRSHIP_DOCK_DURATION)), 0.0, AIRSHIP_VOYAGE_COOLDOWN)
	balloon_timer = clampf(float(parsed.get("balloon_timer", BALLOON_FIRST_SEC)), 0.0, Pacing.BALLOON_GAP[1])
	moon_tea_boat_claimed = bool(parsed.get("moon_tea_boat_claimed", false))
	lanterns_this_festival = maxi(0, int(parsed.get("lanterns_this_festival", 0)))
	lantern_encores = maxi(0, int(parsed.get("lantern_encores", 0)))
	current_weather = clampi(int(parsed.get("day_phase", WeatherState.DAY)), 0, 3)
	weather_timer = clampf(float(parsed.get("day_phase_timer", 0.0)), 0.0, Pacing.DAY_PHASE_SEC)
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

	wish_lantern_festival_timer = clampf(float(parsed.get("wish_lantern_festival_timer", 0.0)), 0.0, WISH_LANTERN_FESTIVAL_DURATION + 60.0)
	wish_lanterns_collected = maxi(0, int(parsed.get("wish_lanterns_collected", 0)))
	wish_lantern_reputation_bonus = maxi(0, int(parsed.get("wish_lantern_reputation_bonus", 0)))
	chef_pavilion_unlocked = bool(parsed.get("chef_pavilion_unlocked", false))
	var saved_tdid := String(parsed.get("active_tasting_dish_id", "dish_cloud_dumplings"))
	active_tasting_dish_id = saved_tdid if EconomyConfig.is_tasting_dish(saved_tdid) else "dish_cloud_dumplings"
	chef_cook_timer = maxf(0.0, float(parsed.get("chef_cook_timer", 0.0)))
	for dict_key in ["tasting_cook_counts", "tasting_inventory", "tasting_best_scores"]:
		if parsed.has(dict_key) and parsed[dict_key] is Dictionary:
			var src_d: Dictionary = parsed[dict_key]
			var dst_d: Dictionary = get(dict_key)
			for td_id in EconomyConfig.TASTING_DISH_ORDER:
				dst_d[td_id] = maxi(0, int(src_d.get(td_id, 0)))
	for flag_key in ["unlocked_tasting_dishes", "tasting_challenges_passed"]:
		if parsed.has(flag_key) and parsed[flag_key] is Dictionary:
			var src_f: Dictionary = parsed[flag_key]
			var dst_f: Dictionary = get(flag_key)
			for td_id in EconomyConfig.TASTING_DISH_ORDER:
				dst_f[td_id] = bool(src_f.get(td_id, false))
	if chef_pavilion_unlocked:
		unlocked_tasting_dishes["dish_cloud_dumplings"] = true
	chef_medals = maxi(0, int(parsed.get("chef_medals", 0)))
	chef_reputation_bonus = maxi(0, int(parsed.get("chef_reputation_bonus", 0)))
	tastings_held = maxi(0, int(parsed.get("tastings_held", 0)))

	# CI-10: Lighthouse Harbor
	lighthouse_harbor_unlocked = bool(parsed.get("lighthouse_harbor_unlocked", false))
	harbor_clock = maxf(0.0, float(parsed.get("harbor_clock", 0.0)))
	var period_l := EconomyConfig.get_harbor_boat_period()
	# Trips already unloaded are re-derived from the saved clock so a reload never double-unloads a catch
	for bi in range(EconomyConfig.HARBOR_BOAT_COUNT):
		harbor_boat_trips[bi] = int(floor((harbor_clock + float(bi) * period_l * 0.5) / period_l))
	if parsed.has("harbor_seafood_inventory") and parsed["harbor_seafood_inventory"] is Dictionary:
		harbor_seafood_inventory[EconomyConfig.SEAFOOD_ITEM_ID] = maxi(0, int((parsed["harbor_seafood_inventory"] as Dictionary).get(EconomyConfig.SEAFOOD_ITEM_ID, 0)))
	seafood_landed_total = maxi(0, int(parsed.get("seafood_landed_total", 0)))
	harbor_trips_total = maxi(0, int(parsed.get("harbor_trips_total", 0)))
	harbor_reputation_bonus = maxi(0, int(parsed.get("harbor_reputation_bonus", 0)))

	# CI-11: Dairy Workshop & Open-Air Cinema (the night programme clock is never persisted; it re-syncs from the weather)
	dairy_workshop_unlocked = bool(parsed.get("dairy_workshop_unlocked", false))
	var saved_drid := String(parsed.get("active_dairy_recipe_id", "dairy_cheese"))
	active_dairy_recipe_id = saved_drid if EconomyConfig.DAIRY_RECIPE_ORDER.has(saved_drid) else "dairy_cheese"
	dairy_timer = clampf(float(parsed.get("dairy_timer", 0.0)), 0.0, EconomyConfig.DAIRY_CYCLE_SEC)
	for dict_key_d in ["dairy_inventory", "dairy_craft_counts"]:
		if parsed.has(dict_key_d) and parsed[dict_key_d] is Dictionary:
			var src_dd: Dictionary = parsed[dict_key_d]
			var dst_dd: Dictionary = get(dict_key_d)
			for d_id in EconomyConfig.DAIRY_CODEX_ORDER:
				dst_dd[d_id] = maxi(0, int(src_dd.get(d_id, 0)))
	if parsed.has("unlocked_dairy_items") and parsed["unlocked_dairy_items"] is Dictionary:
		var src_ud: Dictionary = parsed["unlocked_dairy_items"]
		for d_id2 in EconomyConfig.DAIRY_CODEX_ORDER:
			unlocked_dairy_items[d_id2] = bool(src_ud.get(d_id2, false))
	if dairy_workshop_unlocked:
		unlocked_dairy_items[EconomyConfig.DAIRY_MILK_ID] = true
	dairy_feed_consumed = maxi(0, int(parsed.get("dairy_feed_consumed", 0)))
	dairy_reputation_bonus = maxi(0, int(parsed.get("dairy_reputation_bonus", 0)))
	open_air_cinema_unlocked = bool(parsed.get("open_air_cinema_unlocked", false))
	if parsed.has("cinema_film_screen_counts") and parsed["cinema_film_screen_counts"] is Dictionary:
		var src_fc: Dictionary = parsed["cinema_film_screen_counts"]
		for f_id in EconomyConfig.CINEMA_FILM_ORDER:
			cinema_film_screen_counts[f_id] = maxi(0, int(src_fc.get(f_id, 0)))
	if parsed.has("unlocked_films") and parsed["unlocked_films"] is Dictionary:
		var src_uf: Dictionary = parsed["unlocked_films"]
		for f_id2 in EconomyConfig.CINEMA_FILM_ORDER:
			unlocked_films[f_id2] = bool(src_uf.get(f_id2, false))
	cinema_medals = maxi(0, int(parsed.get("cinema_medals", 0)))
	cinema_screenings_total = maxi(0, int(parsed.get("cinema_screenings_total", 0)))
	cinema_screenings_cancelled = maxi(0, int(parsed.get("cinema_screenings_cancelled", 0)))
	cinema_audience_total = maxi(0, int(parsed.get("cinema_audience_total", 0)))
	cinema_ticket_gold_total = maxi(0, int(parsed.get("cinema_ticket_gold_total", 0)))
	cinema_snack_gold_total = maxi(0, int(parsed.get("cinema_snack_gold_total", 0)))
	cinema_reputation_bonus = maxi(0, int(parsed.get("cinema_reputation_bonus", 0)))
	cinema_night_on = false
	_load_cinema_night(parsed.get("cinema_night", []))

	# CI-12: Pottery Kiln
	pottery_kiln_unlocked = bool(parsed.get("pottery_kiln_unlocked", false))
	var saved_prid := String(parsed.get("active_pottery_recipe_id", "pottery_tea_bowl"))
	active_pottery_recipe_id = saved_prid if EconomyConfig.POTTERY_RECIPE_ORDER.has(saved_prid) else "pottery_tea_bowl"
	pottery_kiln_timer = clampf(float(parsed.get("pottery_kiln_timer", 0.0)), 0.0, EconomyConfig.POTTERY_KILN_CYCLE_SEC)
	for dict_key_p in ["pottery_inventory", "pottery_craft_counts"]:
		if parsed.has(dict_key_p) and parsed[dict_key_p] is Dictionary:
			var src_pp: Dictionary = parsed[dict_key_p]
			var dst_pp: Dictionary = get(dict_key_p)
			for p_id in EconomyConfig.POTTERY_CODEX_ORDER:
				dst_pp[p_id] = maxi(0, int(src_pp.get(p_id, 0)))
	if parsed.has("unlocked_pottery_items") and parsed["unlocked_pottery_items"] is Dictionary:
		var src_up: Dictionary = parsed["unlocked_pottery_items"]
		for p_id2 in EconomyConfig.POTTERY_CODEX_ORDER:
			unlocked_pottery_items[p_id2] = bool(src_up.get(p_id2, false))
	pottery_fuel_consumed = maxi(0, int(parsed.get("pottery_fuel_consumed", 0)))
	pottery_clay_dug_total = maxi(0, int(parsed.get("pottery_clay_dug_total", 0)))
	pottery_packed_in_boxes = maxi(0, int(parsed.get("pottery_packed_in_boxes", 0)))
	pottery_reputation_bonus = maxi(0, int(parsed.get("pottery_reputation_bonus", 0)))

	# CI-13: Kite Festival & Four Seasons (a festival in flight goes on where it was)
	kite_festivals_held = maxi(0, int(parsed.get("kite_festivals_held", 0)))
	if parsed.has("kite_collect_counts") and parsed["kite_collect_counts"] is Dictionary:
		var src_kc: Dictionary = parsed["kite_collect_counts"]
		for k_id in EconomyConfig.KITE_ORDER:
			kite_collect_counts[k_id] = maxi(0, int(src_kc.get(k_id, 0)))
	if parsed.has("unlocked_kites") and parsed["unlocked_kites"] is Dictionary:
		var src_uk: Dictionary = parsed["unlocked_kites"]
		for k_id2 in EconomyConfig.KITE_ORDER:
			unlocked_kites[k_id2] = bool(src_uk.get(k_id2, false))
	kite_medals = maxi(0, int(parsed.get("kite_medals", 0)))
	kite_collected_total = maxi(0, int(parsed.get("kite_collected_total", 0)))
	kite_gold_total = maxi(0, int(parsed.get("kite_gold_total", 0)))
	kite_reputation_bonus = maxi(0, int(parsed.get("kite_reputation_bonus", 0)))
	if parsed.has("seasons_seen") and parsed["seasons_seen"] is Dictionary:
		var src_ss: Dictionary = parsed["seasons_seen"]
		for s_id in EconomyConfig.SEASON_ORDER:
			seasons_seen[s_id] = bool(src_ss.get(s_id, false))
	_load_kite_festival(parsed.get("kite_festival", []))
	refresh_season()

	# CI-14: Islander Wish Board
	wish_serial_next = maxi(0, int(parsed.get("wish_serial_next", 0)))
	wishes_fulfilled_total = maxi(0, int(parsed.get("wishes_fulfilled_total", 0)))
	var src_wf: Dictionary = parsed["wish_fulfilled_counts"] if (parsed.has("wish_fulfilled_counts") and parsed["wish_fulfilled_counts"] is Dictionary) else {}
	for isl_k in EconomyConfig.WISH_ISLANDERS:
		wish_fulfilled_counts[isl_k] = maxi(0, int(src_wf.get(isl_k, 0)))
	wish_reputation_bonus = maxi(0, int(parsed.get("wish_reputation_bonus", 0)))
	wish_vouchers_total = maxi(0, int(parsed.get("wish_vouchers_total", 0)))
	wish_medals = maxi(0, int(parsed.get("wish_medals", 0)))
	wish_board.clear()
	if parsed.has("wish_board") and parsed["wish_board"] is Array:
		for raw_w in parsed["wish_board"]:
			if raw_w is Dictionary and wish_board.size() < EconomyConfig.WISH_SLOT_COUNT:
				var rw: Dictionary = raw_w
				var w_type := String(rw.get("type", ""))
				var w_isl := String(rw.get("islander", ""))
				if not EconomyConfig.WISH_TYPES.has(w_type) or not EconomyConfig.WISH_ISLANDER_NAMES.has(w_isl):
					continue
				var w_state := String(rw.get("state", "open"))
				if w_state != "open" and w_state != "done" and w_state != "expired":
					w_state = "open"
				wish_board.append({
					"serial": maxi(0, int(rw.get("serial", 0))),
					"islander": w_isl,
					"type": w_type,
					"tier": clampi(int(rw.get("tier", 0)), 0, EconomyConfig.WISH_TIER_MAX),
					"target": maxi(1, int(rw.get("target", 1))),
					"progress": maxi(0, int(rw.get("progress", 0))),
					"time_left": clampf(float(rw.get("time_left", EconomyConfig.WISH_LIFETIME_SEC)), 0.0, EconomyConfig.WISH_LIFETIME_SEC),
					"rep": maxi(0, int(rw.get("rep", 0))),
					"vouchers": maxi(0, int(rw.get("vouchers", 0))),
					"state": w_state,
					"linger": clampf(float(rw.get("linger", 0.0)), 0.0, EconomyConfig.WISH_LINGER_SEC)
				})
	_fill_wish_board()

	# CI-15: Cloud-Sea Weather & Birthday Party (the weather itself is derived from the island calendar, never stored)
	_load_sky_weather_and_birthday_state(parsed)
	# CI-16: Food Critics' Week (this week's entries only when the save is from the same week) & Friendship Bonds
	_load_food_week_and_friendship_state(parsed)
	_load_guest_state(parsed)

	var last_ts := int(parsed.get("timestamp", 0))
	var now_ts := int(Time.get_unix_time_from_system())
	var elapsed := clampi(now_ts - last_ts, 0, 86400)
	if elapsed >= 60:
		calculate_and_apply_offline_earnings(elapsed)
		guests_while_away(float(now_ts - last_ts))

## ------------------------------------------------------------------------------------------------------------------
## Guests, the featured dish and the small decorations (tables in `src/data/Guests.gd`)
## ------------------------------------------------------------------------------------------------------------------
var guest_visits: Dictionary = {}
## Gifts waiting to be taken, one entry per guest: {"id", "n", "gold", "amber", "keep" (decoration id or "")}
var guest_pending: Array = []
var guest_timer: float = 0.0
var featured_dish: String = "fruit"
## Decoration id -> owned; a placed one is {"id", "x"} on the lawn
var decor_owned: Dictionary = {}
var decor_placed: Array = []

func reset_guest_state() -> void:
	guest_visits = {}
	guest_pending = []
	guest_timer = 0.0
	featured_dish = "fruit"
	decor_owned = {}
	decor_placed = []
	EventBus.decor_changed.emit()

func get_met_guest_count() -> int:
	var c := 0
	for g in Guests.ORDER:
		if int(guest_visits.get(g, 0)) > 0:
			c += 1
	return c

func get_available_dishes() -> Array:
	var out: Array = []
	for d in Guests.DISH_ORDER:
		if is_line_open(String(Guests.DISH_LINE[d])):
			out.append(d)
	return out

func set_featured_dish(dish: String) -> bool:
	if not get_available_dishes().has(dish):
		return false
	featured_dish = dish
	save_game()
	return true

func get_placed_decor_ids() -> Array:
	var out: Array = []
	for d in decor_placed:
		out.append(String(d["id"]))
	return out

## One visit; `roll` in [0, 1). Returns the guest id.
func receive_guest(roll: float, quiet: bool = false) -> String:
	var g := Guests.pick(get_available_dishes(), featured_dish, get_placed_decor_ids(), roll)
	if g == "":
		return ""
	var rarity := int(Guests.LIST[g]["rarity"])
	guest_visits[g] = int(guest_visits.get(g, 0)) + 1
	var keep := String(Guests.LIST[g]["keep"]) if int(guest_visits[g]) == Guests.keep_at(g) else ""
	var entry := {}
	for e in guest_pending:
		if String(e["id"]) == g:
			entry = e
			break
	if entry.is_empty():
		entry = {"id": g, "n": 0, "gold": 0, "amber": 0, "keep": ""}
		guest_pending.append(entry)
	entry["n"] = int(entry["n"]) + 1
	entry["gold"] = int(entry["gold"]) + income_gold(Guests.GIFT_SEC[rarity], 5)
	entry["amber"] = int(entry["amber"]) + Guests.GIFT_AMBER[rarity]
	if keep != "":
		entry["keep"] = keep
	if not quiet:
		EventBus.guest_arrived.emit(g, keep)
	return g

func _tick_guests(delta: float) -> void:
	guest_timer += delta
	if guest_timer >= Guests.VISIT_SEC:
		guest_timer = 0.0
		receive_guest(randf())

func guests_while_away(elapsed: float) -> int:
	var total := guest_timer + maxf(0.0, elapsed)
	var n := mini(int(floor(total / Guests.VISIT_SEC)), Guests.AWAY_VISITS_MAX)
	guest_timer = fmod(total, Guests.VISIT_SEC)
	for _i in range(n):
		receive_guest(randf(), true)
	return n

func get_pending_guest_count() -> int:
	var c := 0
	for e in guest_pending:
		c += int(e["n"])
	return c

func get_pending_guest_totals() -> Dictionary:
	var out := {"gold": 0, "amber": 0, "keeps": []}
	for e in guest_pending:
		out["gold"] = int(out["gold"]) + int(e["gold"])
		out["amber"] = int(out["amber"]) + int(e["amber"])
		if String(e["keep"]) != "":
			(out["keeps"] as Array).append(String(e["keep"]))
	return out

func claim_guest_gifts() -> Dictionary:
	var t := get_pending_guest_totals()
	guest_pending = []
	add_gold(int(t["gold"]))
	add_amber(int(t["amber"]))
	for k in t["keeps"]:
		decor_owned[k] = true
	if SoundManager != null and int(t["gold"]) > 0:
		SoundManager.play_coin_sfx()
	EventBus.decor_changed.emit()
	save_game()
	return t

func is_decor_owned(id: String) -> bool:
	return bool(decor_owned.get(id, false))

func buy_decor(id: String) -> bool:
	if not Guests.DECOR.has(id) or is_decor_owned(id) or int(Guests.DECOR[id]["amber"]) <= 0:
		return false
	if not spend_amber(int(Guests.DECOR[id]["amber"])):
		return false
	decor_owned[id] = true
	EventBus.decor_changed.emit()
	save_game()
	return true

func get_decor_x(id: String) -> float:
	for d in decor_placed:
		if String(d["id"]) == id:
			return float(d["x"])
	return NAN

## Nearest spot on an open lawn to `x`
func snap_lawn_x(x: float) -> float:
	var best := NAN
	for lawn in Guests.LAWNS:
		if not bool(unlocked_islands.get(int(lawn[0]), false)):
			continue
		var cx := clampf(x, float(lawn[1]), float(lawn[2]))
		if is_nan(best) or absf(cx - x) < absf(best - x):
			best = cx
	return best

func place_decor(id: String, x: float) -> bool:
	if not is_decor_owned(id):
		return false
	var nx := roundf(snap_lawn_x(x))
	for d in decor_placed:
		if String(d["id"]) == id:
			d["x"] = nx
			EventBus.decor_changed.emit()
			return true
	decor_placed.append({"id": id, "x": nx})
	EventBus.decor_changed.emit()
	save_game()
	return true

## Puts it on the first free spot of the lawns, isle 1 first
func place_decor_anywhere(id: String) -> bool:
	for lawn in Guests.LAWNS:
		if not bool(unlocked_islands.get(int(lawn[0]), false)):
			continue
		var x := float(lawn[1]) + 10.0
		while x <= float(lawn[2]):
			var free := true
			for d in decor_placed:
				if absf(float(d["x"]) - x) < Guests.LAWN_STEP:
					free = false
					break
			if free:
				return place_decor(id, x)
			x += Guests.LAWN_STEP
	return place_decor(id, randf_range(float(Guests.LAWNS[0][1]), float(Guests.LAWNS[0][2])))

func remove_decor(id: String) -> bool:
	for i in range(decor_placed.size()):
		if String(decor_placed[i]["id"]) == id:
			decor_placed.remove_at(i)
			EventBus.decor_changed.emit()
			save_game()
			return true
	return false

func _load_guest_state(parsed: Dictionary) -> void:
	reset_guest_state()
	var gv: Dictionary = parsed["guest_visits"] if parsed.get("guest_visits") is Dictionary else {}
	for g in Guests.ORDER:
		var n := int(gv.get(g, 0))
		if n > 0:
			guest_visits[g] = n
	if parsed.get("guest_pending") is Array:
		for e in parsed["guest_pending"]:
			if e is Dictionary and Guests.LIST.has(String(e.get("id", ""))):
				var keep := String(e.get("keep", ""))
				guest_pending.append({"id": String(e["id"]), "n": maxi(1, int(e.get("n", 1))), "gold": maxi(0, int(e.get("gold", 0))), "amber": maxi(0, int(e.get("amber", 0))), "keep": keep if Guests.DECOR.has(keep) else ""})
	guest_timer = clampf(float(parsed.get("guest_timer", 0.0)), 0.0, Guests.VISIT_SEC)
	featured_dish = String(parsed.get("featured_dish", "fruit"))
	if not Guests.DISH_ORDER.has(featured_dish):
		featured_dish = "fruit"
	var od: Dictionary = parsed["decor_owned"] if parsed.get("decor_owned") is Dictionary else {}
	for id in Guests.DECOR_ORDER:
		if bool(od.get(id, false)):
			decor_owned[id] = true
	if parsed.get("decor_placed") is Array:
		for d in parsed["decor_placed"]:
			if d is Dictionary and is_decor_owned(String(d.get("id", ""))) and is_nan(get_decor_x(String(d["id"]))):
				decor_placed.append({"id": String(d["id"]), "x": float(d.get("x", 700.0))})
	EventBus.decor_changed.emit()
