extends Node
class_name GameManager
## Complete Incremental Progression & Save System for Cloud Isle Market (Phase 3 Original IP Edition).
## 100% Original Cozy Floating-Isle World borrowing the vibrant 2D cel-shaded pixel art style:
## - Central Island: 晨风草坪岛 (Cloudbrook Meadow) — Windmill Farmhouse, Apple Orchard, Rice Cake Mortar
## - Left Sub-Island: 荧光森谷岛 (Glowwood Isle) — Hollow-Tree Alchemy Hut + 5th Companion 森谷小狐狸 (Fox Alchemist)
## - Right Sub-Island: 椰风暖沙岛 (Coral Beach Isle) — Coconut Tiki Juice Bar + 6th Companion 大嘴鸟快递员 (Toucan Courier)
## - Two-Stage Cooking Recipe Chain (桂花糯米糕, 焦糖苹果草莓派, 星露荧光甘露饮, 热带菠萝椰汁特饮)
## - Visual Shelf Stacking on the Market Stall + Island Prosperity Visual Evolution (Lv.1~Lv.4)

signal state_changed
signal island_unlocked(side: String)
signal workshop_changed
signal souvenir_found(souvenir_index: int)

const SAVE_PATH := "user://maple_isle_save.json"

var meso: int = 320
var star_dew: int = 22
var market_stock: int = 4          # Raw harvested crops on the stall
var apple_stock: int = 2           # Orchard Red Apples harvested by Carpenter Shiba for 2-stage recipes
var recipe_stocks: Array[int] = [2, 1, 0, 0]  # 4 Two-Stage Processed Delicacies sitting on the stall!
var market_level: int = 1
var selected_crop_id: int = 0      # 0: 晨风胡萝卜, 1: 奶油红草莓, 2: 森谷荧光菇, 3: 海滩黄金菠萝

var unlocked_left_ellinia: bool = false
var unlocked_right_orbis: bool = false

# Fixed-Slot Auto-Placement Levels
var plot_tier: int = 1       # 1: 6 plots, 2: 8 plots, 3: 10 plots on center deck
var mortar_level: int = 1    # 桂花石臼坊 (Lv.1 unlocked by default)
var cauldron_level: int = 0  # 森之炼金釜 (Lv.0 locked, 120G to build)
var decor_level: int = 1     # 晨风景观装饰 (1: 指路木牌, 2: +暖光玻璃路灯, 3: +草帽稻草人)

# 6 Animal Companion Levels (0..3 on Center Island, 4 on Left Island, 5 on Right Island)
var bunny_level: int = 1    # 0: 糯米白兔 (Sowing, harvesting & pounding Osmanthus Rice Cake)
var otter_level: int = 1    # 1: 荷叶水獭 (Stream water & crop irrigation)
var shiba_level: int = 1    # 2: 木工柴犬 (Orchard apple harvesting & baking Apple-Strawberry Pie)
var penguin_level: int = 1  # 3: 草帽企鹅 (Pond fishing & Morning Dew crystal gathering)
var fox_level: int = 1      # 4: 森谷小狐狸 (Left Island Alchemist: Glow-Mushroom + Dew -> Starlight Elixir)
var toucan_level: int = 1   # 5: 大嘴鸟快递员 (Right Island Courier: Pineapple + Apple -> Tropical Cooler)

# 4 Original Woodland Traveler Keepsakes (刺猬松果徽章, 橘猫暖阳铃铛, 浣熊红领巾, 丰收金麦穗)
var souvenirs: Array[bool] = [true, false, false, false]

# Day/Night & Weather Cycle (0.0 .. 1.0 over 120s)
var time_of_day: float = 0.12
var weather_Override: int = -1

# User Preferences
var is_muted: bool = false
var scale_idx: int = 1

var _autosave_timer: float = 0.0

const CROP_DATA := [
	{"name": "晨风胡萝卜", "cost": 5, "sell": 24, "grow_time": 14.0, "desc": "脆甜多汁的草坪胡萝卜，可捣制桂花糯米糕"},
	{"name": "奶油红草莓", "cost": 15, "sell": 48, "grow_time": 18.0, "desc": "香甜红草莓，搭配果树红苹果可烘焙双料鲜果派"},
	{"name": "森谷荧光菇", "cost": 35, "sell": 95, "grow_time": 22.0, "desc": "左岛树洞特产蓝菇，融合晨露可熬制星露甘露饮"},
	{"name": "海滩黄金菠萝", "cost": 65, "sell": 180, "grow_time": 26.0, "desc": "右岛阳光沙洲菠萝，搭配鲜果可调制热带椰汁特饮"}
]

const RECIPE_DATA := [
	{"name": "桂花糯米糕", "sell": 85, "formula": "胡萝卜×1 ➔ 石臼锤打"},
	{"name": "焦糖苹果草莓派", "sell": 175, "formula": "草莓×1 + 红苹果×1 ➔ 双料烘焙"},
	{"name": "星露荧光甘露饮", "sell": 290, "formula": "荧光菇×1 + 晨露×1 ➔ 树洞炼金"},
	{"name": "热带菠萝椰汁特饮", "sell": 440, "formula": "黄金菠萝×1 + 红苹果×1 ➔ 冷饮特调"}
]

const SOUVENIR_DATA := [
	{"name": "小刺猬松果徽章", "bonus": "全岛作物生长速度 +25%", "monster": "背篓小刺猬"},
	{"name": "胖橘猫暖阳铜铃", "bonus": "集市摊位全部售价 +25%", "monster": "草帽胖橘猫"},
	{"name": "小浣熊红领巾", "bonus": "两段式料理产出效率 +30%", "monster": "红领巾小浣熊"},
	{"name": "云岛丰收金麦穗", "bonus": "全体小动物干活速度 +25%", "monster": "稀有旅人"}
]

func _ready() -> void:
	load_game()

func _process(delta: float) -> void:
	time_of_day = fmod(time_of_day + delta / 120.0, 1.0)
	_autosave_timer += delta
	if _autosave_timer >= 15.0:
		_autosave_timer = 0.0
		save_game()

func get_prosperity_score() -> int:
	var score := plot_tier + mortar_level + cauldron_level + decor_level + market_level
	score += bunny_level + otter_level + shiba_level + penguin_level
	if unlocked_left_ellinia:
		score += 3 + fox_level
	if unlocked_right_orbis:
		score += 3 + toucan_level
	return score

func get_prosperity_tier() -> int:
	var s := get_prosperity_score()
	if s >= 22:
		return 4
	elif s >= 16:
		return 3
	elif s >= 11:
		return 2
	return 1

func get_prosperity_title() -> String:
	match get_prosperity_tier():
		1: return "Lv.1 初辟草坪"
		2: return "Lv.2 雏菊盛开"
		3: return "Lv.3 锦簇石径"
		_: return "Lv.4 落叶云端仙境"

func get_phase_index() -> int:
	if weather_Override >= 0:
		return weather_Override % 4
	if time_of_day < 0.35:
		return 0  # 晨风晴天
	elif time_of_day < 0.60:
		return 1  # 暖霞夕阳
	elif time_of_day < 0.88:
		return 2  # 荧光星夜
	else:
		return 3  # 彩虹微雨

func get_phase_name() -> String:
	match get_phase_index():
		0: return "晨风晴天 (生长+15%)"
		1: return "暖霞夕阳 (料理+25%)"
		2: return "荧光星夜 (售价+30%)"
		_: return "彩虹微雨 (全收益+50%)"

func cycle_weather_manual() -> void:
	if weather_Override < 0:
		weather_Override = (get_phase_index() + 1) % 4
	else:
		weather_Override = (weather_Override + 1) % 4
	state_changed.emit()

func get_market_capacity() -> int:
	return 12 + (market_level - 1) * 6

func get_total_delicacy_count() -> int:
	var total := 0
	for c in recipe_stocks:
		total += c
	return total

func get_total_stall_items() -> int:
	return market_stock + get_total_delicacy_count()

func get_souvenir_count() -> int:
	var c := 0
	for s in souvenirs:
		if s:
			c += 1
	return c

func get_crop_grow_multiplier() -> float:
	var m := 1.25 if souvenirs[0] else 1.0
	var p := get_phase_index()
	if p == 0:
		m *= 1.15
	elif p == 3:
		m *= 1.50
	return m

func get_animal_speed_multiplier(role_idx: int) -> float:
	var lv := get_animal_level(role_idx)
	# Gentle, cozy progression (+8% per level, capped so animals never sprint frantically)
	var base := minf(1.45, 1.0 + float(lv - 1) * 0.08)
	if souvenirs[3]:
		base *= 1.12
	if get_phase_index() == 3:
		base *= 1.15
	return base

func get_animal_level(role_idx: int) -> int:
	match role_idx:
		0: return bunny_level
		1: return otter_level
		2: return shiba_level
		3: return penguin_level
		4: return fox_level
		5: return toucan_level
	return 1

func add_meso(amount: int) -> void:
	meso += amount
	state_changed.emit()

func add_star_dew(amount: int) -> void:
	star_dew += amount
	state_changed.emit()

func add_apple(amount: int = 1) -> void:
	apple_stock = mini(20, apple_stock + amount)
	state_changed.emit()

func add_market_goods(count: int = 1, is_delicacy: bool = false, recipe_id: int = 0) -> bool:
	var cap := get_market_capacity()
	if get_total_stall_items() >= cap:
		if is_delicacy and market_stock > 0:
			market_stock -= 1
			var rid := clampi(recipe_id, 0, 3)
			recipe_stocks[rid] += 1
			state_changed.emit()
			return true
		return false
	if is_delicacy:
		var rid := clampi(recipe_id, 0, 3)
		recipe_stocks[rid] += count
	else:
		market_stock = mini(cap - get_total_delicacy_count(), market_stock + count)
	state_changed.emit()
	return true

func craft_two_stage_recipe(preferred_recipe: int = -1) -> int:
	## Executes a Two-Stage Cooking Recipe!
	## Returns the crafted recipe_id (0..3), or -1 if stall is completely full.
	var chosen := preferred_recipe
	if chosen < 0:
		if unlocked_right_orbis and apple_stock > 0 and randf() < 0.45:
			chosen = 3  # 热带菠萝椰汁特饮 (Pineapple + Apple)
		elif unlocked_left_ellinia and star_dew > 0 and randf() < 0.50:
			chosen = 2  # 星露荧光甘露饮 (Glow-Mushroom + Morning Dew)
		elif apple_stock > 0:
			chosen = 1  # 焦糖苹果草莓派 (Strawberry + Orchard Apple)
		else:
			chosen = 0  # 桂花糯米糕 (Carrot -> Rice Cake)

	if chosen == 3 and apple_stock > 0:
		apple_stock -= 1
	elif chosen == 2 and star_dew > 0:
		star_dew -= 1
	elif chosen == 1 and apple_stock > 0:
		apple_stock -= 1
	elif chosen in [1, 2, 3]:
		chosen = 0

	if market_stock > 0 and get_total_stall_items() >= get_market_capacity():
		market_stock -= 1
		recipe_stocks[chosen] += 1
		state_changed.emit()
		return chosen
	if add_market_goods(1, true, chosen):
		return chosen
	return -1

func consume_snack_for_mood() -> bool:
	# Animals occasionally eat 1 snack or raw fruit for an 8s heart frenzy boost!
	for i in range(4):
		if recipe_stocks[i] > 0:
			return true
	return true

func sell_from_stall() -> Dictionary:
	if get_total_stall_items() <= 0:
		return {"earned": 0, "is_delicacy": false, "recipe_id": 0}
	var used_delicacy := false
	var sold_recipe_id := 0
	var base_val: int = CROP_DATA[selected_crop_id]["sell"]

	# Sell highest-tier stocked 2-stage delicacy first!
	for r_i in range(3, -1, -1):
		if recipe_stocks[r_i] > 0:
			recipe_stocks[r_i] -= 1
			used_delicacy = true
			sold_recipe_id = r_i
			base_val = int(RECIPE_DATA[r_i]["sell"])
			break

	if not used_delicacy:
		market_stock -= 1

	var mult := (
		1.0
		+ float(market_level - 1) * 0.15
		+ float(get_souvenir_count()) * 0.12
		+ float(decor_level) * 0.08
		+ float(mortar_level + cauldron_level) * 0.10
	)
	if souvenirs[1]:
		mult *= 1.25
	var p := get_phase_index()
	if p == 2:
		mult *= 1.30
	elif p == 3:
		mult *= 1.50

	var earned := int(roundf(base_val * mult))
	meso += earned
	if randf() < (0.55 if used_delicacy else 0.35):
		star_dew += 1
	if randf() < (0.28 if used_delicacy else 0.16):
		for i in range(souvenirs.size()):
			if not souvenirs[i]:
				souvenirs[i] = true
				souvenir_found.emit(i)
				break
	state_changed.emit()
	return {"earned": earned, "is_delicacy": used_delicacy, "recipe_id": sold_recipe_id}

func cycle_selected_crop() -> void:
	var max_crop := 1
	if unlocked_left_ellinia:
		max_crop = 2
	if unlocked_right_orbis:
		max_crop = 3
	selected_crop_id = (selected_crop_id + 1) % (max_crop + 1)
	state_changed.emit()

func get_animal_upgrade_cost(role_idx: int) -> int:
	return get_animal_level(role_idx) * 50

func upgrade_animal(role_idx: int) -> bool:
	var cost := get_animal_upgrade_cost(role_idx)
	if meso < cost:
		return false
	meso -= cost
	match role_idx:
		0: bunny_level += 1
		1: otter_level += 1
		2: shiba_level += 1
		3: penguin_level += 1
		4: fox_level += 1
		5: toucan_level += 1
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func get_mortar_upgrade_cost() -> int:
	return 70 if mortar_level == 0 else mortar_level * 85

func upgrade_mortar() -> bool:
	var cost := get_mortar_upgrade_cost()
	if meso < cost:
		return false
	meso -= cost
	mortar_level += 1
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func get_cauldron_upgrade_cost() -> int:
	return 120 if cauldron_level == 0 else cauldron_level * 110

func upgrade_cauldron() -> bool:
	var cost := get_cauldron_upgrade_cost()
	if meso < cost:
		return false
	meso -= cost
	cauldron_level += 1
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func get_decor_upgrade_cost() -> int:
	if decor_level >= 3:
		return 0
	return (decor_level + 1) * 65

func upgrade_decor() -> bool:
	if decor_level >= 3:
		return false
	var cost := get_decor_upgrade_cost()
	if meso < cost:
		return false
	meso -= cost
	decor_level += 1
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func get_plot_tier_cost() -> int:
	if plot_tier >= 3:
		return 0
	return plot_tier * 90

func upgrade_plot_tier() -> bool:
	if plot_tier >= 3:
		return false
	var cost := get_plot_tier_cost()
	if meso < cost:
		return false
	meso -= cost
	plot_tier += 1
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func get_market_upgrade_cost() -> int:
	return market_level * 80

func upgrade_market_stall() -> bool:
	var cost := get_market_upgrade_cost()
	if meso < cost:
		return false
	meso -= cost
	market_level += 1
	state_changed.emit()
	save_game()
	return true

func unlock_ellinia_island() -> bool:
	if unlocked_left_ellinia or meso < 180:
		return false
	meso -= 180
	unlocked_left_ellinia = true
	selected_crop_id = 2
	island_unlocked.emit("left")
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func unlock_orbis_island() -> bool:
	if unlocked_right_orbis or meso < 320:
		return false
	meso -= 320
	unlocked_right_orbis = true
	selected_crop_id = 3
	island_unlocked.emit("right")
	workshop_changed.emit()
	state_changed.emit()
	save_game()
	return true

func save_game() -> void:
	var data := {
		"meso": meso,
		"star_dew": star_dew,
		"market_stock": market_stock,
		"apple_stock": apple_stock,
		"recipe_stocks": recipe_stocks,
		"market_level": market_level,
		"selected_crop_id": selected_crop_id,
		"unlocked_left_ellinia": unlocked_left_ellinia,
		"unlocked_right_orbis": unlocked_right_orbis,
		"plot_tier": plot_tier,
		"mortar_level": mortar_level,
		"cauldron_level": cauldron_level,
		"decor_level": decor_level,
		"bunny_level": bunny_level,
		"otter_level": otter_level,
		"shiba_level": shiba_level,
		"penguin_level": penguin_level,
		"fox_level": fox_level,
		"toucan_level": toucan_level,
		"souvenirs": souvenirs,
		"is_muted": is_muted,
		"scale_idx": scale_idx,
		"timestamp": int(Time.get_unix_time_from_system())
	}
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(data))

func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return
	meso = int(parsed.get("meso", meso))
	star_dew = int(parsed.get("star_dew", star_dew))
	market_stock = int(parsed.get("market_stock", market_stock))
	apple_stock = int(parsed.get("apple_stock", apple_stock))
	var saved_rec = parsed.get("recipe_stocks", null)
	if typeof(saved_rec) == TYPE_ARRAY and saved_rec.size() == 4:
		for i in range(4):
			recipe_stocks[i] = int(saved_rec[i])
	market_level = int(parsed.get("market_level", market_level))
	selected_crop_id = int(parsed.get("selected_crop_id", selected_crop_id))
	unlocked_left_ellinia = bool(parsed.get("unlocked_left_ellinia", false))
	unlocked_right_orbis = bool(parsed.get("unlocked_right_orbis", false))
	plot_tier = int(parsed.get("plot_tier", 1))
	mortar_level = int(parsed.get("mortar_level", 1))
	cauldron_level = int(parsed.get("cauldron_level", 0))
	decor_level = int(parsed.get("decor_level", 1))
	bunny_level = int(parsed.get("bunny_level", 1))
	otter_level = int(parsed.get("otter_level", 1))
	shiba_level = int(parsed.get("shiba_level", 1))
	penguin_level = int(parsed.get("penguin_level", 1))
	fox_level = int(parsed.get("fox_level", 1))
	toucan_level = int(parsed.get("toucan_level", 1))
	is_muted = bool(parsed.get("is_muted", false))
	scale_idx = int(parsed.get("scale_idx", 1))
	var saved_souv = parsed.get("souvenirs", null)
	if typeof(saved_souv) == TYPE_ARRAY and saved_souv.size() == 4:
		for i in range(4):
			souvenirs[i] = bool(saved_souv[i])
	var saved_ts := int(parsed.get("timestamp", 0))
	if saved_ts > 0:
		var elapsed := maxi(0, int(Time.get_unix_time_from_system()) - saved_ts)
		var offline_gain := mini(3500, int(elapsed / 8) * (bunny_level + otter_level + shiba_level + penguin_level) * 4)
		if offline_gain > 0:
			meso += offline_gain
