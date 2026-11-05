extends Node
## Pure Idle Economy Math, Recruit Caps, Lv.25 Auto-Evolution, Native Typography & Drop Shadow Math (`EconomyConfig.gd`)
## Strictly enforces GEMINI.md Engineering Laws 1~6.

const GROUND_Y := 124.0
const MIN_BUILDING_PADDING := 28.0
const DECOR_OUTER_OFFSET := 16.0

const Z_SKY := -100
const Z_TERRAIN := -20
const Z_SHADOW := -5
const Z_SOIL_BASE := -2
const Z_BUILDING := 0
const Z_CROP := 1
const Z_UNIT := 10
const Z_CARRY_EMOTE := 20
const Z_FLOATING_UI := 50

const MULTIPLIER_RAW := 1.0
const MULTIPLIER_MORTAR := 3.5
const MULTIPLIER_CAULDRON := 12.0
const MULTIPLIER_ORBIS_LINKED := 52.0
const VIP_TIP_MULTIPLIER := 2.0
const DEFAULT_BUFFER_CAP := 10

var sprite_manifest: Dictionary = {}
var _label_settings_cache: Dictionary = {}
var _shadow_polygon_cache: Dictionary = {}
var _unit_circle_pts: PackedVector2Array = PackedVector2Array()

## PRD v2.2 Section 3: Strict Per-Island Animal Recruit Caps
const ISLAND_RECRUIT_CAPS: Dictionary = {
	1: {"bunny": 2, "otter": 2, "fox": 1, "shiba": 1, "penguin": 0, "toucan": 0},
	2: {"bunny": 2, "otter": 1, "fox": 0, "shiba": 0, "penguin": 1, "toucan": 2},
	3: {"bunny": 2, "otter": 2, "fox": 1, "shiba": 0, "penguin": 1, "toucan": 2}
}

## Raw Crops (auto-evolves to next row in `crops_sheet.png` every 25 building levels!)
const CROPS: Dictionary = {
	"crop_0": {"name": "晨露胡萝卜", "island": 1, "crop_row": 0, "base_value": 12, "grow_time": 5.2},
	"crop_1": {"name": "晨风红草莓", "island": 1, "crop_row": 1, "base_value": 18, "grow_time": 6.0},
	"crop_2": {"name": "幽谷荧光菇", "island": 2, "crop_row": 2, "base_value": 30, "grow_time": 7.0},
	"crop_3": {"name": "晴滩黄金凤梨", "island": 3, "crop_row": 3, "base_value": 48, "grow_time": 8.0}
}

## Processed Delicacies (auto-evolves to next dish in `delicacies_sheet.png` every 25 workshop levels!)
const DELICACIES: Dictionary = {
	"delicacy_0": {"name": "桂花糯米糕", "idx": 0, "tier": 1, "workshop": "mortar", "base_crop_val": 12, "mult": MULTIPLIER_MORTAR},
	"delicacy_1": {"name": "焦糖苹果草莓派", "idx": 1, "tier": 1, "workshop": "mortar", "base_crop_val": 18, "mult": MULTIPLIER_MORTAR},
	"delicacy_2": {"name": "星露荧光甘露饮", "idx": 2, "tier": 2, "workshop": "cauldron", "base_crop_val": 30, "mult": MULTIPLIER_CAULDRON},
	"delicacy_3": {"name": "皇家凤梨星露宴", "idx": 3, "tier": 3, "workshop": "orbis_linked", "base_crop_val": 48, "mult": MULTIPLIER_ORBIS_LINKED}
}

const BUILDINGS: Dictionary = {
	"soil_1": {"name": "射手村农田", "desc": "每25级作物自动换代+产能翻倍+外观进化", "base_cost": 25, "base_value": 12, "island": 1},
	"mortar": {"name": "桂花研钵工坊", "desc": "狐狸研磨3.5x美食 · 每25级菜品与外观进化", "base_cost": 45, "base_value": 42, "island": 1},
	"stall": {"name": "云岛集市主摊位", "desc": "扩充缓存上限(10+5/级) · Lv.25解锁暖光路灯", "base_cost": 65, "base_value": 50, "island": 1},
	"soil_2": {"name": "魔法密林农田", "desc": "岛2魔法作物产能 · 每25级品种与外观进化", "base_cost": 140, "base_value": 30, "island": 2},
	"cauldron": {"name": "星露炼金坩埚", "desc": "企鹅炼制12x甘露 · Lv.25开启炼金星火粒子", "base_cost": 210, "base_value": 360, "island": 2},
	"soil_3": {"name": "天空海岸双工坊", "desc": "岛3顶级农田+研钵坩埚联动 (52x价值)", "base_cost": 360, "base_value": 2496, "island": 3}
}

const ANIMALS: Dictionary = {
	"bunny": {"name": "月兔 · 专职农夫", "role_tag": "无水獭时直达集市 · 招满后全队进修提速", "sheet": "animals/bunny_sheet.png", "base_cost": 30, "base_time": 2.6, "base_speed": 72.0, "base_cap": 1},
	"otter": {"name": "水獭 · 岛内物流员", "role_tag": "接管岛内搬运 · 工坊满载自动分流直售", "sheet": "animals/otter_sheet.png", "base_cost": 45, "base_time": 1.5, "base_speed": 80.0, "base_cap": 2},
	"fox": {"name": "小狐狸 · 研钵主厨", "role_tag": "驻守研钵工坊 · 研磨3.5x/52x精制美食", "sheet": "animals/fox_sheet.png", "base_cost": 60, "base_time": 3.4, "base_speed": 64.0, "base_cap": 1},
	"shiba": {"name": "柴犬 · 金牌店长", "role_tag": "加速收银结账 · 全摊位售价+10%/级", "sheet": "animals/shiba_sheet.png", "base_cost": 80, "base_time": 1.0, "base_speed": 66.0, "base_cap": 1},
	"penguin": {"name": "小企鹅 · 坩埚炼金师", "role_tag": "驻守坩埚工坊 · 炼制12x/52x高阶甘露", "sheet": "animals/penguin_sheet.png", "base_cost": 150, "base_time": 4.0, "base_speed": 60.0, "base_cap": 1},
	"toucan": {"name": "巨嘴鸟 · 跨岛专员", "role_tag": "跨木桥批量将岛2/岛3料理运回岛1主集市", "sheet": "animals/toucan_sheet.png", "base_cost": 135, "base_time": 1.4, "base_speed": 94.0, "base_cap": 3}
}

const EXPANSIONS: Dictionary = {
	"island_2": {"name": "木桥1 · 魔法密林", "desc": "开启2x农田+12x坩埚工坊+企鹅/巨嘴鸟编制", "cost": 180},
	"island_3": {"name": "木桥2 · 天空海岸", "desc": "开启双工坊52x联动+👑2.0x皇冠富豪顾客", "cost": 480}
}

## v2.5-2: Functional Island Miniature Landscapes & Global Passive Buffs
const ISLAND_LANDSCAPES: Dictionary = {
	"bee_hive": {
		"id": "bee_hive",
		"name": "蜜蜂花箱",
		"island": 1,
		"cost_amber": 3,
		"desc": "1号岛蜜蜂授粉 · 农田作物生长速度 +20%",
		"buff_type": "crop_growth",
		"buff_val": 0.20,
		"x_pos": 660.0,
		"sprite_tex": "res://assets/pixel_art/buildings/decor_beehive.png",
		"frame_h": 52
	},
	"wind_chime": {
		"id": "wind_chime",
		"name": "荧光风铃",
		"island": 2,
		"cost_amber": 5,
		"desc": "2号岛灵气共鸣 · 工坊加工制作速度 +20%",
		"buff_type": "workshop_speed",
		"buff_val": 0.20,
		"x_pos": 210.0,
		"sprite_tex": "res://assets/pixel_art/buildings/decor_windchime.png",
		"frame_h": 58
	},
	"tiki_torch": {
		"id": "tiki_torch",
		"name": "招财提基灯",
		"island": 3,
		"cost_amber": 8,
		"desc": "3号岛金穗庇佑 · 顾客全岛小费收益 +20%",
		"buff_type": "tip_bonus",
		"buff_val": 0.20,
		"x_pos": 1705.0,
		"sprite_tex": "res://assets/pixel_art/buildings/decor_lamp.png",
		"frame_h": 66
	}
}

func _ready() -> void:
	_init_unit_circle()
	_load_sprite_manifest()

func _init_unit_circle() -> void:
	_unit_circle_pts.resize(24)
	for i in range(24):
		var ang := float(i) * TAU / 24.0
		_unit_circle_pts[i] = Vector2(cos(ang), sin(ang))

func _load_sprite_manifest() -> void:
	var path := "res://src/data/sprite_manifest.json"
	if FileAccess.file_exists(path):
		var txt := FileAccess.get_file_as_string(path)
		var parsed = JSON.parse_string(txt)
		if parsed is Dictionary:
			sprite_manifest = parsed

## GEMINI.md Law 5.2: Native Typography Helper (`make_pixel_label_settings`) with Resource Caching
func make_pixel_label_settings(size: int = 14, color: Color = Color("#FFF4D6")) -> LabelSettings:
	var cache_key := "%d_%s" % [size, color.to_html(true)]
	if _label_settings_cache.has(cache_key):
		return _label_settings_cache[cache_key]
	var ls := LabelSettings.new()
	ls.font_size = size
	ls.font_color = color
	ls.outline_size = 2
	ls.outline_color = Color("#1A120B")
	ls.shadow_size = 1
	ls.shadow_color = Color(0.0, 0.0, 0.0, 0.6)
	ls.shadow_offset = Vector2(1.0, 1.0)
	_label_settings_cache[cache_key] = ls
	return ls

func create_pixel_label(text_str: String = "", size: int = 14, color: Color = Color("#FFF4D6"), center_align: bool = false) -> Label:
	var lbl := Label.new()
	lbl.text = text_str
	lbl.label_settings = make_pixel_label_settings(size, color)
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if center_align:
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return lbl

## GEMINI.md Law 3.3: 5:1 Ultra-Flat Polygon Drop Shadow (`shadow_width = w * 0.55`, `shadow_height = shadow_width * 0.18`, `Color(0, 0, 0, 0.20)`)
## Optimized with polygon caching to eliminate per-frame trigonometry and array allocations.
func draw_drop_shadow(canvas: CanvasItem, entity_visual_width: float, center: Vector2 = Vector2.ZERO) -> void:
	var w_key := int(roundf(entity_visual_width * 10.0))
	var c_key := Vector2i(int(roundf(center.x)), int(roundf(center.y)))
	var cache_key := Vector3i(w_key, c_key.x, c_key.y)
	var pts: PackedVector2Array
	if _shadow_polygon_cache.has(cache_key):
		pts = _shadow_polygon_cache[cache_key]
	else:
		if _unit_circle_pts.size() != 24:
			_init_unit_circle()
		var shadow_width := entity_visual_width * 0.55
		var shadow_height := shadow_width * 0.18
		var rx := shadow_width * 0.5
		var ry := shadow_height * 0.5
		pts = PackedVector2Array()
		pts.resize(24)
		for i in range(24):
			var u := _unit_circle_pts[i]
			pts[i] = center + Vector2(u.x * rx, u.y * ry)
		_shadow_polygon_cache[cache_key] = pts
	canvas.draw_colored_polygon(pts, Color(0.0, 0.0, 0.0, 0.20))

func get_manifest_entry(sheet_key: String) -> Dictionary:
	if sprite_manifest.has(sheet_key):
		return sprite_manifest[sheet_key]
	return {"cell_width": 60, "cell_height": 60, "hframes": 4, "vframes": 1, "total_frames": 4, "regions": []}

func get_frame_region(sheet_key: String, frame_idx: int) -> Rect2:
	var entry := get_manifest_entry(sheet_key)
	var regions: Array = entry.get("regions", [])
	if regions.size() > 0:
		var clamped_idx := clampi(frame_idx, 0, regions.size() - 1)
		var r: Dictionary = regions[clamped_idx]
		return Rect2(float(r.get("x", 0)), float(r.get("y", 0)), float(r.get("w", 60)), float(r.get("h", 60)))
	var cw := float(entry.get("cell_width", 60))
	var ch := float(entry.get("cell_height", 60))
	var hf := maxi(1, int(entry.get("hframes", 4)))
	var col := clampi(frame_idx, 0, hf - 1) % hf
	var row := clampi(frame_idx, 0, hf - 1) / hf
	return Rect2(col * cw, row * ch, cw, ch)

func get_evolved_crop_id(base_island: int, building_level: int) -> String:
	var base_idx := 0
	if base_island == 2:
		base_idx = 2
	elif base_island >= 3:
		base_idx = 3
	var evo_steps := int(floor(float(maxi(1, building_level)) / 25.0))
	var final_idx := clampi(base_idx + evo_steps, 0, 3)
	return "crop_" + str(final_idx)

func get_evolved_delicacy_id(workshop_id: String, workshop_level: int) -> String:
	var base_idx := 0
	if workshop_id == "cauldron":
		base_idx = 2
	elif workshop_id == "orbis_linked":
		base_idx = 3
	var evo_steps := int(floor(float(maxi(1, workshop_level)) / 25.0))
	var final_idx := clampi(base_idx + evo_steps, 0, 3)
	return "delicacy_" + str(final_idx)

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

func calc_upgrade_cost(base_cost: int, level: int) -> int:
	var lv := maxi(1, level)
	return int(round(float(base_cost) * pow(1.15, float(lv - 1))))

func calc_milestone_value(base_value: float, level: int) -> float:
	var lv := maxi(1, level)
	var milestone_pow := int(floor(float(lv) / 25.0))
	return base_value * float(lv) * pow(2.0, float(milestone_pow))

func calc_work_duration(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["bunny"])
	var base_t := float(a_cfg.get("base_time", 2.6))
	var lv := maxi(1, level)
	return maxf(0.8, base_t * pow(0.96, float(lv - 1)))

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
