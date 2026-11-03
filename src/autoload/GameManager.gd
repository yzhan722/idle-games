extends Node
## Global State, Pipeline Inventories, JSON Save/Load & Offline Earnings (`src/autoload/GameManager.gd` Autoload)

const SAVE_PATH := "user://savegame.json"

var gold: int = 360
var total_gold_earned: int = 360
var desktop_companion_mode: bool = true

var unlocked_islands: Dictionary = {
	1: true,
	2: true,
	3: true
}

var building_levels: Dictionary = {
	"soil_1": 1,
	"mortar": 1,
	"stall": 1,
	"soil_2": 1,
	"cauldron": 1,
	"soil_3": 1
}

var animal_levels: Dictionary = {
	"bunny": 1,
	"otter": 1,
	"toucan": 1,
	"fox": 1,
	"penguin": 1,
	"shiba": 1
}

## Island Raw Storage Baskets (RawStorageBasket per island 1..3: Dictionary of crop_id -> count)
var raw_baskets: Dictionary = {
	1: {"crop_0": 2, "crop_1": 2},
	2: {"crop_2": 2},
	3: {"crop_3": 2}
}

## Workshop Input & Output Buffers
var workshop_inputs: Dictionary = {
	"mortar": {"crop_0": 1, "crop_1": 1},
	"cauldron": {"crop_2": 1, "crop_3": 1}
}

var workshop_outputs: Dictionary = {
	"mortar": {"delicacy_0": 1, "delicacy_1": 1},
	"cauldron": {"delicacy_2": 1, "delicacy_3": 0}
}

## Market Stall Display Shelf Inventory (sold to customers by Shiba Manager)
var stall_inventory: Dictionary = {
	"delicacy_0": 3,
	"delicacy_1": 2,
	"delicacy_2": 2,
	"delicacy_3": 1,
	"crop_0": 2,
	"crop_1": 1
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
		score += int(building_levels[k]) * 25
	for k in animal_levels.keys():
		score += int(animal_levels[k]) * 30
	if unlocked_islands.get(2, false):
		score += 150
	if unlocked_islands.get(3, false):
		score += 300
	return score

func get_stall_max_capacity() -> int:
	return 16 + int(building_levels.get("stall", 1)) * 8

func get_total_stall_count() -> int:
	var total := 0
	for k in stall_inventory.keys():
		total += int(stall_inventory[k])
	return total

func add_to_raw_basket(island_idx: int, crop_id: String, qty: int) -> void:
	if not raw_baskets.has(island_idx):
		raw_baskets[island_idx] = {}
	var cur := int(raw_baskets[island_idx].get(crop_id, 0))
	raw_baskets[island_idx][crop_id] = cur + qty
	EventBus.inventory_changed.emit()

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

func get_island_basket_total(island_idx: int) -> int:
	if not raw_baskets.has(island_idx):
		return 0
	var s := 0
	for k in raw_baskets[island_idx].keys():
		s += int(raw_baskets[island_idx][k])
	return s

func add_to_workshop_input(workshop_id: String, crop_id: String, qty: int) -> void:
	if not workshop_inputs.has(workshop_id):
		workshop_inputs[workshop_id] = {}
	var cur := int(workshop_inputs[workshop_id].get(crop_id, 0))
	workshop_inputs[workshop_id][crop_id] = cur + qty
	EventBus.inventory_changed.emit()

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

func get_workshop_input_total(workshop_id: String) -> int:
	if not workshop_inputs.has(workshop_id):
		return 0
	var s := 0
	for k in workshop_inputs[workshop_id].keys():
		s += int(workshop_inputs[workshop_id][k])
	return s

func add_to_workshop_output(workshop_id: String, delicacy_id: String, qty: int) -> void:
	if not workshop_outputs.has(workshop_id):
		workshop_outputs[workshop_id] = {}
	var cur := int(workshop_outputs[workshop_id].get(delicacy_id, 0))
	workshop_outputs[workshop_id][delicacy_id] = cur + qty
	EventBus.inventory_changed.emit()

func take_from_workshop_output(workshop_id: String, max_qty: int) -> Dictionary:
	if not workshop_outputs.has(workshop_id):
		return {}
	var out_dict: Dictionary = workshop_outputs[workshop_id]
	for del_id in out_dict.keys():
		var avail := int(out_dict[del_id])
		if avail > 0:
			var take := mini(avail, max_qty)
			out_dict[delicacy_id_key(del_id)] = avail - take
			EventBus.inventory_changed.emit()
			return {"item_id": String(del_id), "qty": take}
	return {}

func delicacy_id_key(k: Variant) -> String:
	return String(k)

func get_workshop_output_total(workshop_id: String) -> int:
	if not workshop_outputs.has(workshop_id):
		return 0
	var s := 0
	for k in workshop_outputs[workshop_id].keys():
		s += int(workshop_outputs[workshop_id][k])
	return s

func add_to_stall(item_id: String, qty: int) -> void:
	var cur := int(stall_inventory.get(item_id, 0))
	stall_inventory[item_id] = cur + qty
	EventBus.inventory_changed.emit()
	EventBus.item_delivered.emit(item_id, qty, "market_stall")

func try_purchase_from_stall(preferred_id: String, qty: int, world_pos: Vector2) -> int:
	var target_id := preferred_id
	if int(stall_inventory.get(target_id, 0)) <= 0:
		# Fallback to any available delicacy or raw crop on the stall shelf
		for k in ["delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0", "crop_3", "crop_2", "crop_1", "crop_0"]:
			if int(stall_inventory.get(k, 0)) > 0:
				target_id = k
				break
	var avail := int(stall_inventory.get(target_id, 0))
	if avail <= 0:
		return 0
	var bought := mini(avail, maxi(1, qty))
	stall_inventory[target_id] = avail - bought

	var b_lv := int(building_levels.get("mortar", 1))
	if target_id == "delicacy_2" or target_id == "delicacy_3":
		b_lv = int(building_levels.get("cauldron", 1))
	elif target_id.begins_with("crop_"):
		b_lv = int(building_levels.get("soil_1", 1))

	var unit_price := EconomyConfig.calc_item_Unit_price(
		target_id,
		b_lv,
		int(building_levels.get("stall", 1)),
		int(animal_levels.get("shiba", 1))
	)
	var total_earned := unit_price * bought
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
	var cur_lv := int(animal_levels.get(a_key, 1))
	var base_c := int(EconomyConfig.ANIMALS[a_key]["base_cost"])
	var cost := EconomyConfig.calc_upgrade_cost(base_c, cur_lv)
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
	var cost := int(EconomyConfig.EXPANSIONS.get(exp_key, {"cost": 300})["cost"])
	if not spend_gold(cost):
		return false
	unlocked_islands[island_idx] = true
	EventBus.island_unlocked.emit(island_idx)
	EventBus.prosperity_changed.emit(get_prosperity_score())
	save_game()
	return true

func estimate_idle_gold_per_sec() -> float:
	var base_rate := 2.5
	for k in building_levels.keys():
		base_rate += float(building_levels[k]) * 1.4
	for k in animal_levels.keys():
		base_rate += float(animal_levels[k]) * 1.2
	return base_rate * EconomyConfig.calc_shiba_price_bonus(int(animal_levels.get("shiba", 1)))

func save_game() -> void:
	var data := {
		"version": 2,
		"timestamp": int(Time.get_unix_time_from_system()),
		"gold": gold,
		"total_gold_earned": total_gold_earned,
		"desktop_companion_mode": desktop_companion_mode,
		"unlocked_islands": unlocked_islands,
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
	gold = int(parsed.get("gold", gold))
	total_gold_earned = int(parsed.get("total_gold_earned", total_gold_earned))
	desktop_companion_mode = bool(parsed.get("desktop_companion_mode", true))
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
		pending_offline_gold = maxi(10, int(round(float(elapsed) * estimate_idle_gold_per_sec() * 0.45)))
		add_gold(pending_offline_gold)
