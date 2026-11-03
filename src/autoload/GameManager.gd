extends Node
## Global State, Pure Numeric Buffers, Cold-Start Evolution & Save System (`src/autoload/GameManager.gd`) — PRD Patch v2.1
## - Starts with Island 1 unlocked, 1 SoilPlot (`soil_1: 1`), 1 AppleTree, 1 MarketStall (`stall: 1`), and 1 Starter Bunny (`bunny: 1`).
## - All other animals (`otter`, `fox`, `shiba`, `penguin`, `toucan`) start at Level 0 (unhired) so the Single-Bunny Cold Start
##   smoothly evolves into the Full Specialized Pipeline as the player hires them!
## - Pure numeric buffers (default cap 10, scales with level) with smart overflow routing.

const SAVE_PATH := "user://savegame.json"
const SAVE_VERSION := 21

var gold: int = 120
var total_gold_earned: int = 120
var desktop_companion_mode: bool = true

## PRD v2.1 Section 1 & 3: Start on Island 1 (Henesys); unlock Island 2 & Island 3 via bridges
var unlocked_islands: Dictionary = {
	1: true,
	2: false,
	3: false
}

## PRD v2.1 Section 1: Start with 1 SoilPlot (soil_1=1), 1 MarketStall (stall=1); workshops unlock/upgrade
var building_levels: Dictionary = {
	"soil_1": 1,
	"mortar": 1,
	"stall": 1,
	"soil_2": 1,
	"cauldron": 1,
	"soil_3": 1
}

## PRD v2.1 Section 1: Gift 1 Starter Bunny (bunny=1); Otter/Fox/Shiba/Penguin/Toucan start at 0 (unhired)
var animal_levels: Dictionary = {
	"bunny": 1,
	"otter": 0,
	"fox": 0,
	"shiba": 0,
	"penguin": 0,
	"toucan": 0
}

## Pure Numeric Buffers (default cap = 10, scales with building level; NO visual icon clutter on buildings)
var raw_baskets: Dictionary = {
	1: {"crop_0": 0, "crop_1": 0},
	2: {"crop_2": 0},
	3: {"crop_3": 0}
}

var workshop_inputs: Dictionary = {
	"mortar": {"crop_0": 0, "crop_1": 0},
	"cauldron": {"crop_2": 0, "crop_3": 0},
	"orbis_linked": {"crop_3": 0}
}

var workshop_outputs: Dictionary = {
	"mortar": {"delicacy_0": 0, "delicacy_1": 0},
	"cauldron": {"delicacy_2": 0},
	"orbis_linked": {"delicacy_3": 0}
}

var stall_inventory: Dictionary = {
	"crop_0": 2,
	"crop_1": 1,
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

func _ready() -> void:
	load_game()

func _process(delta: float) -> void:
	save_timer += delta
	if save_timer >= 15.0:
		save_timer = 0.0
		save_game()

func is_animal_hired(animal_key: String) -> bool:
	return int(animal_levels.get(animal_key, 0)) >= 1

func get_unlocked_plot_count(island_idx: int) -> int:
	if island_idx == 1:
		var lv := int(building_levels.get("soil_1", 1))
		# PRD v2.1: Start with 1 plot at Lv.1, expand up to 8 plots as soil_1 levels up!
		return clampi(1 + (lv - 1), 1, 8)
	elif island_idx == 2:
		if not bool(unlocked_islands.get(2, false)):
			return 0
		var lv2 := int(building_levels.get("soil_2", 1))
		return clampi(2 + (lv2 - 1), 2, 6)
	elif island_idx == 3:
		if not bool(unlocked_islands.get(3, false)):
			return 0
		var lv3 := int(building_levels.get("soil_3", 1))
		return clampi(2 + (lv3 - 1), 2, 6)
	return 1

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

func get_prosperity_score() -> int:
	var score := 0
	for k in building_levels.keys():
		score += int(building_levels[k]) * 20
	for k in animal_levels.keys():
		score += int(animal_levels[k]) * 35
	if bool(unlocked_islands.get(2, false)):
		score += 150
	if bool(unlocked_islands.get(3, false)):
		score += 350
	return score

## Pure Numeric Buffer Capacities (default cap = 10, +5 per level above 1)
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
	if not raw_baskets.has(island_idx):
		raw_baskets[island_idx] = {}
	var room := maxi(0, get_raw_basket_max_cap(island_idx) - get_island_basket_total(island_idx))
	var added := mini(qty, room)
	if added > 0:
		raw_baskets[island_idx][crop_id] = int(raw_baskets[island_idx].get(crop_id, 0)) + added
		EventBus.inventory_changed.emit()
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
		EventBus.inventory_changed.emit()
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
	if not workshop_outputs.has(workshop_id):
		workshop_outputs[workshop_id] = {}
	var room := maxi(0, get_workshop_buffer_cap(workshop_id) - get_workshop_output_total(workshop_id))
	var added := mini(qty, room)
	if added > 0:
		workshop_outputs[workshop_id][delicacy_id] = int(workshop_outputs[workshop_id].get(delicacy_id, 0)) + added
		EventBus.inventory_changed.emit()
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
	var room := maxi(0, get_stall_max_capacity() - get_total_stall_count())
	var added := mini(qty, room)
	if added > 0:
		stall_inventory[item_id] = int(stall_inventory.get(item_id, 0)) + added
		EventBus.inventory_changed.emit()
		EventBus.item_delivered.emit(item_id, added, "market_stall")
	return added

## PRD v2.1: Supports Self-Service Checkout when Shiba is unhired (shiba=0),
## Shiba PriceBonus (1.0 + 0.1*L) when hired, and 2.0x VIP Crown Customer Tip!
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

	var b_lv := int(building_levels.get("soil_1", 1))
	if target_id == "delicacy_0" or target_id == "delicacy_1":
		b_lv = int(building_levels.get("mortar", 1))
	elif target_id == "delicacy_2":
		b_lv = int(building_levels.get("cauldron", 1))
	elif target_id == "delicacy_3":
		b_lv = int(building_levels.get("soil_3", 1))

	var unit_price := EconomyConfig.calc_item_unit_price(
		target_id,
		b_lv,
		int(building_levels.get("stall", 1)),
		int(animal_levels.get("shiba", 0))
	)
	var total_earned := unit_price * bought
	if is_vip:
		total_earned = int(round(float(total_earned) * EconomyConfig.VIP_TIP_MULTIPLIER))

	add_gold(total_earned)
	EventBus.inventory_changed.emit()
	EventBus.customer_paid.emit(target_id, bought, total_earned, world_pos)
	return total_earned

func upgrade_building(b_key: String) -> bool:
	if not EconomyConfig.BUILDINGS.has(b_key):
		return false
	var cur_lv := int(building_levels.get(b_key, 1))
	var base_c := int(EconomyConfig.BUILDINGS[b_key]["base_cost"])
	var cost := EconomyConfig.calc_upgrade_cost(base_c, cur_lv)
	if not spend_gold(cost):
		return false
	building_levels[b_key] = cur_lv + 1
	EventBus.upgrade_purchased.emit("building", b_key, cur_lv + 1)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func upgrade_animal(a_key: String) -> bool:
	if not EconomyConfig.ANIMALS.has(a_key):
		return false
	var cur_lv := int(animal_levels.get(a_key, 0))
	var base_c := int(EconomyConfig.ANIMALS[a_key]["base_cost"])
	var cost := EconomyConfig.calc_upgrade_cost(base_c, maxi(1, cur_lv + 1))
	if not spend_gold(cost):
		return false
	animal_levels[a_key] = cur_lv + 1
	EventBus.upgrade_purchased.emit("animal", a_key, cur_lv + 1)
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
	if island_idx == 2 and int(animal_levels.get("penguin", 0)) == 0:
		animal_levels["penguin"] = 1
	if island_idx == 3 and int(animal_levels.get("toucan", 0)) == 0:
		animal_levels["toucan"] = 1
	EventBus.island_unlocked.emit(island_idx)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func estimate_idle_gold_per_sec() -> float:
	var base_rate := 1.8
	for k in building_levels.keys():
		base_rate += float(building_levels[k]) * 1.1
	for k in animal_levels.keys():
		base_rate += float(animal_levels[k]) * 1.5
	return base_rate * EconomyConfig.calc_shiba_price_bonus(int(animal_levels.get("shiba", 0)))

func save_game() -> void:
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
		"stall_inventory": stall_inventory
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(data, "\t"))

func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var txt := FileAccess.get_file_as_string(SAVE_PATH)
	var parsed = JSON.parse_string(txt)
	if not (parsed is Dictionary):
		return
	# Only load saves matching SAVE_VERSION (21) so PRD v2.1 Single-Bunny Cold Start rules apply cleanly
	if int(parsed.get("version", 0)) != SAVE_VERSION:
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
	if parsed.has("stall_inventory") and parsed["stall_inventory"] is Dictionary:
		for k in parsed["stall_inventory"].keys():
			stall_inventory[String(k)] = int(parsed["stall_inventory"][k])

	var last_ts := int(parsed.get("timestamp", 0))
	var now_ts := int(Time.get_unix_time_from_system())
	var elapsed := clampi(now_ts - last_ts, 0, 86400)
	if elapsed >= 30:
		pending_offline_seconds = elapsed
		pending_offline_gold = maxi(8, int(round(float(elapsed) * estimate_idle_gold_per_sec() * 0.45)))
		add_gold(pending_offline_gold)
