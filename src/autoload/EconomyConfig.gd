extends Node
## Pure Idle Economy Math & Sprite Manifest Loader (`EconomyConfig.gd` Autoload) — PRD v2.1
## - Raw ingredient fallback sale: 1.0x
## - Island 1 Mortar Workshop (Fox): 3.5x
## - Island 2 Cauldron Workshop (Penguin): 12.0x
## - Island 3 Dual Mortar+Cauldron Linked Workshop: 52.0x (>= 50x)
## - VIP Crown Customer Tip Multiplier: 2.0x

const MULTIPLIER_RAW := 1.0
const MULTIPLIER_MORTAR := 3.5
const MULTIPLIER_CAULDRON := 12.0
const MULTIPLIER_ORBIS_LINKED := 52.0
const VIP_TIP_MULTIPLIER := 2.0
const DEFAULT_BUFFER_CAP := 10

var sprite_manifest: Dictionary = {}

## Raw Crops (grown on SoilPlot & AppleTree)
const CROPS: Dictionary = {
	"crop_0": {
		"name": "晨露红草莓",
		"island": 1,
		"crop_row": 0,
		"base_value": 12,
		"grow_time": 5.5
	},
	"crop_1": {
		"name": "金桂红苹果",
		"island": 1,
		"crop_row": 1,
		"base_value": 16,
		"grow_time": 6.5
	},
	"crop_2": {
		"name": "幽谷荧光菇",
		"island": 2,
		"crop_row": 2,
		"base_value": 28,
		"grow_time": 7.5
	},
	"crop_3": {
		"name": "晴滩黄金凤梨",
		"island": 3,
		"crop_row": 3,
		"base_value": 45,
		"grow_time": 8.5
	}
}

## Processed Delicacies
const DELICACIES: Dictionary = {
	"delicacy_0": {
		"name": "桂花糯米糕",
		"idx": 0,
		"tier": 1,
		"workshop": "mortar",
		"input_crop": "crop_0",
		"base_crop_val": 12,
		"mult": MULTIPLIER_MORTAR
	},
	"delicacy_1": {
		"name": "焦糖苹果草莓派",
		"idx": 1,
		"tier": 1,
		"workshop": "mortar",
		"input_crop": "crop_1",
		"base_crop_val": 16,
		"mult": MULTIPLIER_MORTAR
	},
	"delicacy_2": {
		"name": "星露荧光甘露饮",
		"idx": 2,
		"tier": 2,
		"workshop": "cauldron",
		"input_crop": "crop_2",
		"base_crop_val": 28,
		"mult": MULTIPLIER_CAULDRON
	},
	"delicacy_3": {
		"name": "皇家凤梨星露宴",
		"idx": 3,
		"tier": 3,
		"workshop": "orbis_linked",
		"input_crop": "crop_3",
		"base_crop_val": 45,
		"mult": MULTIPLIER_ORBIS_LINKED
	}
}

## Buildings Config
const BUILDINGS: Dictionary = {
	"soil_1": {
		"name": "射手村良田",
		"desc": "主岛草莓/苹果产能与农田块数提升",
		"base_cost": 25,
		"base_value": 12,
		"island": 1
	},
	"mortar": {
		"name": "桂花研钵工坊",
		"desc": "岛1初级美食加工 (3.5x价值增值)",
		"base_cost": 45,
		"base_value": 42,
		"island": 1
	},
	"stall": {
		"name": "云岛集市主摊位",
		"desc": "扩充缓存上限(10+5/级)与基础售价",
		"base_cost": 65,
		"base_value": 50,
		"island": 1
	},
	"soil_2": {
		"name": "魔法密林菌圃",
		"desc": "岛2中阶魔法荧光菇产能提升",
		"base_cost": 140,
		"base_value": 28,
		"island": 2
	},
	"cauldron": {
		"name": "星露炼金坩埚",
		"desc": "岛2炼制中阶魔法料理 (12.0x价值)",
		"base_cost": 210,
		"base_value": 336,
		"island": 2
	},
	"soil_3": {
		"name": "天空海岸果园",
		"desc": "岛3顶级凤梨+双工坊联动 (52x价值)",
		"base_cost": 360,
		"base_value": 2340,
		"island": 3
	}
}

## 6 Specialized Animal Workers Config (PRD v2.1: Starter Bunny Lv.1, others start at Lv.0 unhired)
const ANIMALS: Dictionary = {
	"bunny": {
		"name": "月兔 · 专职农夫",
		"role_tag": "无水獭时直达集市 · 有水獭时入田边缓存",
		"sheet": "animals/bunny_sheet.png",
		"base_cost": 30,
		"base_time": 2.8,
		"base_speed": 72.0,
		"base_cap": 1
	},
	"otter": {
		"name": "水獭 · 岛内物流员",
		"role_tag": "接管岛内搬运 · 工坊满载智能分流直售",
		"sheet": "animals/otter_sheet.png",
		"base_cost": 45,
		"base_time": 1.6,
		"base_speed": 80.0,
		"base_cap": 2
	},
	"fox": {
		"name": "小狐狸 · 初级研钵主厨",
		"role_tag": "驻守岛1研钵 · 加工3.5x初级美食",
		"sheet": "animals/fox_sheet.png",
		"base_cost": 60,
		"base_time": 3.6,
		"base_speed": 64.0,
		"base_cap": 1
	},
	"shiba": {
		"name": "柴犬 · 集市金牌店长",
		"role_tag": "加速收银结账 · 全摊位售价+10%/级",
		"sheet": "animals/shiba_sheet.png",
		"base_cost": 80,
		"base_time": 1.0,
		"base_speed": 66.0,
		"base_cap": 1
	},
	"penguin": {
		"name": "小企鹅 · 高级坩埚炼金师",
		"role_tag": "驻守岛2坩埚 · 炼制12x中阶与52x顶阶料理",
		"sheet": "animals/penguin_sheet.png",
		"base_cost": 160,
		"base_time": 4.2,
		"base_speed": 60.0,
		"base_cap": 1
	},
	"toucan": {
		"name": "巨嘴鸟 · 跨岛贸易专员",
		"role_tag": "跨木桥批量将岛2/岛3高阶美食运回主集市",
		"sheet": "animals/toucan_sheet.png",
		"base_cost": 140,
		"base_time": 1.5,
		"base_speed": 92.0,
		"base_cap": 3
	}
}

## Island Expansion Config (Tab 3)
const EXPANSIONS: Dictionary = {
	"island_2": {
		"name": "解锁【岛屿2：魔法密林 Ellinia】",
		"desc": "修复木桥1 · 开启荧光菇菌圃与12x星露坩埚",
		"cost": 180
	},
	"island_3": {
		"name": "解锁【岛屿3：天空海岸 Orbis】",
		"desc": "修复木桥2 · 开启52x双工坊联动与2x皇冠富豪顾客",
		"cost": 480
	}
}

func _ready() -> void:
	_load_sprite_manifest()

func _load_sprite_manifest() -> void:
	var path := "res://src/data/sprite_manifest.json"
	if FileAccess.file_exists(path):
		var txt := FileAccess.get_file_as_string(path)
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			sprite_manifest = parsed

func get_manifest_entry(sheet_key: String) -> Dictionary:
	if sprite_manifest.has(sheet_key):
		return sprite_manifest[sheet_key]
	return {"cell_width": 60, "cell_height": 60, "hframes": 5, "vframes": 1, "total_frames": 5, "regions": []}

func get_frame_region(sheet_key: String, frame_idx: int) -> Rect2:
	var entry := get_manifest_entry(sheet_key)
	var regions: Array = entry.get("regions", [])
	if frame_idx >= 0 and frame_idx < regions.size():
		var r: Dictionary = regions[frame_idx]
		return Rect2(float(r.get("x", 0)), float(r.get("y", 0)), float(r.get("w", 60)), float(r.get("h", 60)))
	var cw := float(entry.get("cell_width", 60))
	var ch := float(entry.get("cell_height", 60))
	var hf := maxi(1, int(entry.get("hframes", 5)))
	var col := frame_idx % hf
	var row := frame_idx / hf
	return Rect2(col * cw, row * ch, cw, ch)

func get_crop_stage_region(crop_id: String, stage_idx: int) -> Rect2:
	var c_data: Dictionary = CROPS.get(crop_id, CROPS["crop_0"])
	var row := int(c_data.get("crop_row", 0))
	var st := clampi(stage_idx, 0, 3)
	if sprite_manifest.has("crops/crops_sheet.png"):
		var items: Array = sprite_manifest["crops/crops_sheet.png"].get("items", [])
		if row < items.size():
			var stages: Array = items[row].get("stages", [])
			if st < stages.size():
				var sr: Dictionary = stages[st]
				return Rect2(float(sr["x"]), float(sr["y"]), float(sr["w"]), float(sr["h"]))
	return Rect2(st * 40.0, row * 40.0, 40.0, 40.0)

func get_delicacy_region(delicacy_id: String) -> Rect2:
	var d_data: Dictionary = DELICACIES.get(delicacy_id, DELICACIES["delicacy_0"])
	var idx := int(d_data.get("idx", 0))
	if sprite_manifest.has("buildings/delicacies_sheet.png"):
		var items: Array = sprite_manifest["buildings/delicacies_sheet.png"].get("items", [])
		if idx < items.size():
			var reg: Dictionary = items[idx].get("region", {})
			if reg.has("w"):
				return Rect2(float(reg["x"]), float(reg["y"]), float(reg["w"]), float(reg["h"]))
	return Rect2(idx * 36.0, 0.0, 36.0, 36.0)

## Cost(L) = round(BaseCost * 1.15^(L - 1))
func calc_upgrade_cost(base_cost: int, level: int) -> int:
	var lv := maxi(1, level)
	return int(round(float(base_cost) * pow(1.15, float(lv - 1))))

## Value(L) = BaseValue * L * 2^floor(L / 25)
func calc_milestone_value(base_value: float, level: int) -> float:
	var lv := maxi(1, level)
	var milestone_pow := int(floor(float(lv) / 25.0))
	return base_value * float(lv) * pow(2.0, float(milestone_pow))

## Duration(L) = max(0.8, BaseTime * 0.96^(L - 1))
func calc_work_duration(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["bunny"])
	var base_t := float(a_cfg.get("base_time", 2.8))
	var lv := maxi(1, level)
	return maxf(0.8, base_t * pow(0.96, float(lv - 1)))

## Capacity(L) = BaseCap + floor(L / 5)
func calc_carry_capacity(animal_key: String, level: int) -> int:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_cap := int(a_cfg.get("base_cap", 1))
	var lv := maxi(1, level)
	return base_cap + int(floor(float(lv) / 5.0))

func calc_move_speed(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_spd := float(a_cfg.get("base_speed", 72.0))
	var lv := maxi(1, level)
	return base_spd * (1.0 + 0.03 * float(lv - 1))

## PRD v2.1: Before Shiba is hired (level == 0), PriceBonus = 1.0 (self-service stall);
## Once Shiba is hired (level >= 1), PriceBonus = 1.0 + 0.1 * L
func calc_shiba_price_bonus(shiba_level: int) -> float:
	if shiba_level <= 0:
		return 1.0
	return 1.0 + 0.1 * float(shiba_level)

func calc_buffer_capacity(level: int) -> int:
	return DEFAULT_BUFFER_CAP + maxi(0, level - 1) * 5

func calc_item_unit_price(item_id: String, building_lv: int, stall_lv: int, shiba_lv: int) -> int:
	var shiba_mult := calc_shiba_price_bonus(shiba_lv)
	var stall_mult := 1.0 + 0.08 * float(maxi(1, stall_lv) - 1)
	if DELICACIES.has(item_id):
		var d: Dictionary = DELICACIES[item_id]
		var base_c := float(d["base_crop_val"])
		var w_mult := float(d["mult"])
		var raw_v := calc_milestone_value(base_c, maxi(1, building_lv))
		return maxi(1, int(round(raw_v * w_mult * stall_mult * shiba_mult)))
	elif CROPS.has(item_id):
		var c: Dictionary = CROPS[item_id]
		var raw_v := calc_milestone_value(float(c["base_value"]), maxi(1, building_lv))
		return maxi(1, int(round(raw_v * MULTIPLIER_RAW * stall_mult * shiba_mult)))
	return 15
