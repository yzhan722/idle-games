extends Node
## Pure Idle Economy Math & Sprite Manifest Loader (`EconomyConfig.gd` Autoload) — PRD v2.0 Section 2 & 5

const MULTIPLIER_RAW := 1.0
const MULTIPLIER_MORTAR := 3.5
const MULTIPLIER_CAULDRON := 12.0

var sprite_manifest: Dictionary = {}

## Raw Crops (grown on SoilPlot & AppleTree)
const CROPS: Dictionary = {
	"crop_0": {
		"name": "晨露红草莓",
		"island": 1,
		"crop_row": 0,
		"base_value": 12,
		"grow_time": 6.5
	},
	"crop_1": {
		"name": "金桂甜果",
		"island": 1,
		"crop_row": 1,
		"base_value": 16,
		"grow_time": 7.5
	},
	"crop_2": {
		"name": "幽谷荧光菇",
		"island": 2,
		"crop_row": 2,
		"base_value": 28,
		"grow_time": 8.5
	},
	"crop_3": {
		"name": "晴滩黄金凤梨",
		"island": 3,
		"crop_row": 3,
		"base_value": 42,
		"grow_time": 9.5
	}
}

## Processed Delicacies (produced by Fox at Mortar & Penguin at Cauldron)
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
		"name": "海岛凤梨椰奶冻",
		"idx": 3,
		"tier": 2,
		"workshop": "cauldron",
		"input_crop": "crop_3",
		"base_crop_val": 42,
		"mult": MULTIPLIER_CAULDRON
	}
}

## Buildings Config
const BUILDINGS: Dictionary = {
	"soil_1": {
		"name": "射手村良田",
		"desc": "主岛草莓与金桂甜果产量翻升",
		"base_cost": 35,
		"base_value": 14,
		"island": 1
	},
	"mortar": {
		"name": "桂花研钵工坊",
		"desc": "狐狸主厨研磨初级美食 (3.5x增值)",
		"base_cost": 60,
		"base_value": 48,
		"island": 1
	},
	"stall": {
		"name": "云岛集市主摊位",
		"desc": "提升货架上限与全菜品基础售价",
		"base_cost": 85,
		"base_value": 55,
		"island": 1
	},
	"soil_2": {
		"name": "魔法密林菌圃",
		"desc": "第二岛幽谷荧光菇产量与品质提升",
		"base_cost": 160,
		"base_value": 32,
		"island": 2
	},
	"cauldron": {
		"name": "星露炼金坩埚",
		"desc": "企鹅炼金师熬制高阶甘露 (12.0x增值)",
		"base_cost": 240,
		"base_value": 165,
		"island": 2
	},
	"soil_3": {
		"name": "天空海岸果园",
		"desc": "第三岛黄金凤梨与海岛特调产能提升",
		"base_cost": 380,
		"base_value": 58,
		"island": 3
	}
}

## 6 Specialized Animal Workers Config (PRD Section 4.1)
const ANIMALS: Dictionary = {
	"bunny": {
		"name": "月兔 · 专职农夫",
		"role_tag": "播种照料 · 收割入田边菜篮",
		"sheet": "animals/bunny_sheet.png",
		"base_cost": 40,
		"base_time": 3.2,
		"base_speed": 68.0,
		"base_cap": 1
	},
	"otter": {
		"name": "水獭 · 岛内物流员",
		"role_tag": "菜篮→工坊输入槽 · 成品槽→集市摊位",
		"sheet": "animals/otter_sheet.png",
		"base_cost": 55,
		"base_time": 2.0,
		"base_speed": 76.0,
		"base_cap": 2
	},
	"toucan": {
		"name": "巨嘴鸟 · 跨岛贸易专员",
		"role_tag": "跨木桥大宗运输二三岛原料与炼金美食",
		"sheet": "animals/toucan_sheet.png",
		"base_cost": 120,
		"base_time": 1.8,
		"base_speed": 88.0,
		"base_cap": 3
	},
	"fox": {
		"name": "小狐狸 · 初级研钵主厨",
		"role_tag": "驻守研钵工坊 · 研磨3.5x初级美食",
		"sheet": "animals/fox_sheet.png",
		"base_cost": 75,
		"base_time": 4.2,
		"base_speed": 62.0,
		"base_cap": 1
	},
	"penguin": {
		"name": "小企鹅 · 高级坩埚炼金师",
		"role_tag": "驻守炼金坩埚 · 熬制12.0x精制甘露",
		"sheet": "animals/penguin_sheet.png",
		"base_cost": 180,
		"base_time": 5.0,
		"base_speed": 58.0,
		"base_cap": 1
	},
	"shiba": {
		"name": "柴犬 · 集市金牌店长",
		"role_tag": "驻守集市摊位 · 收银结账售价加成+10%/级",
		"sheet": "animals/shiba_sheet.png",
		"base_cost": 95,
		"base_time": 1.5,
		"base_speed": 64.0,
		"base_cap": 1
	}
}

## Island Expansion Config (Tab 3)
const EXPANSIONS: Dictionary = {
	"island_2": {
		"name": "开拓【岛屿2：魔法密林 Ellinia】",
		"desc": "修复1号木桥 · 解锁荧光菇菌圃、炼金坩埚与企鹅炼金师",
		"cost": 320
	},
	"island_3": {
		"name": "开拓【岛屿3：天空海岸 Orbis】",
		"desc": "修复2号木桥 · 解锁黄金凤梨滩、提基地标与巨嘴鸟跨岛贸易",
		"cost": 680
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

## PRD 5.1 Upgrade Cost Formula: Cost(L) = round(BaseCost * 1.15^(L - 1))
func calc_upgrade_cost(base_cost: int, level: int) -> int:
	var lv := maxi(1, level)
	return int(round(float(base_cost) * pow(1.15, float(lv - 1))))

## PRD 5.2 Value / Production Formula (with Lv.25 doubling milestone):
## Value(L) = BaseValue * L * 2^floor(L / 25)
func calc_milestone_value(base_value: float, level: int) -> float:
	var lv := maxi(1, level)
	var milestone_pow := int(floor(float(lv) / 25.0))
	return base_value * float(lv) * pow(2.0, float(milestone_pow))

## PRD 5.4 Work Duration Formula for Bunny / Fox / Penguin:
## Duration(L) = max(0.8, BaseTime * 0.96^(L - 1))
func calc_work_duration(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["bunny"])
	var base_t := float(a_cfg.get("base_time", 3.0))
	var lv := maxi(1, level)
	return maxf(0.8, base_t * pow(0.96, float(lv - 1)))

## PRD 5.4 Carry Capacity & Speed for Otter / Toucan:
## Capacity(L) = BaseCap + floor(L / 5)
func calc_carry_capacity(animal_key: String, level: int) -> int:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_cap := int(a_cfg.get("base_cap", 1))
	var lv := maxi(1, level)
	return base_cap + int(floor(float(lv) / 5.0))

func calc_move_speed(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_spd := float(a_cfg.get("base_speed", 68.0))
	var lv := maxi(1, level)
	return base_spd * (1.0 + 0.03 * float(lv - 1))

## PRD 5.4 Shiba Store Manager Price Bonus:
## PriceBonus(L) = 1.0 + 0.1 * L
func calc_shiba_price_bonus(shiba_level: int) -> float:
	return 1.0 + 0.1 * float(maxi(1, shiba_level))

## Final Checkout Unit Price at Market Stall:
func calc_item_Unit_price(item_id: String, building_lv: int, stall_lv: int, shiba_lv: int) -> int:
	var shiba_mult := calc_shiba_price_bonus(shiba_lv)
	var stall_mult := 1.0 + 0.08 * float(maxi(1, stall_lv) - 1)
	if DELICACIES.has(item_id):
		var d: Dictionary = DELICACIES[item_id]
		var base_c := float(d["base_crop_val"])
		var w_mult := float(d["mult"])
		var raw_v := calc_milestone_value(base_c, building_lv)
		return maxi(1, int(round(raw_v * w_mult * stall_mult * shiba_mult)))
	elif CROPS.has(item_id):
		var c: Dictionary = CROPS[item_id]
		var raw_v := calc_milestone_value(float(c["base_value"]), building_lv)
		return maxi(1, int(round(raw_v * MULTIPLIER_RAW * stall_mult * shiba_mult)))
	return 15
