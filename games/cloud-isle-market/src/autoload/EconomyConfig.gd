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
	"island_3": {"name": "木桥2 · 天空海岸", "desc": "开启双工坊52x联动+★2.0x皇冠富豪顾客", "cost": 480}
}

## v2.5-3: Animal Promotion Milestone Traits (Activated at Lv.10 / Lv.25 / Lv.50)
const ANIMAL_TRAITS: Dictionary = {
	"bunny": {"name": "丰收巧爪", "desc": "收获产量+1/阶", "type": "harvest_bonus"},
	"otter": {"name": "疾风步履", "desc": "移速+20%/阶", "type": "speed_mult"},
	"fox": {"name": "匠心巧艺", "desc": "加工耗时-15%/阶", "type": "work_duration_mult"},
	"shiba": {"name": "招财金算", "desc": "小费率+15%/阶", "type": "tip_bonus"},
	"penguin": {"name": "极地秘传", "desc": "炼制耗时-15%/阶", "type": "work_duration_mult"},
	"toucan": {"name": "顺风羽翼", "desc": "跨岛移速+20%/阶", "type": "speed_mult"}
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

func get_animal_trait_tier_count(level: int) -> int:
	var cnt := 0
	if level >= 10:
		cnt += 1
	if level >= 25:
		cnt += 1
	if level >= 50:
		cnt += 1
	return cnt

func get_animal_trait_tag(animal_key: String, level: int) -> String:
	var t_cfg: Dictionary = ANIMAL_TRAITS.get(animal_key, ANIMAL_TRAITS["bunny"])
	var t_name := String(t_cfg.get("name", "专精"))
	var tiers := get_animal_trait_tier_count(level)
	if tiers <= 0:
		return "Lv.10解锁[" + t_name + "]"
	var roman: String = String(["I", "II", "III"][clampi(tiers - 1, 0, 2)])
	return "★" + t_name + roman

func calc_bunny_harvest_trait_bonus(level: int) -> int:
	return get_animal_trait_tier_count(level)

func calc_logistics_speed_trait_mult(level: int) -> float:
	return 1.0 + 0.20 * float(get_animal_trait_tier_count(level))

func calc_chef_duration_trait_mult(level: int) -> float:
	var tiers := get_animal_trait_tier_count(level)
	if tiers <= 0:
		return 1.0
	return pow(0.85, float(tiers))

func calc_shiba_tip_trait_bonus(level: int) -> float:
	return 0.15 * float(get_animal_trait_tier_count(level))

func calc_work_duration(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["bunny"])
	var base_t := float(a_cfg.get("base_time", 2.6))
	var lv := maxi(1, level)
	var raw_dur := base_t * pow(0.96, float(lv - 1))
	if animal_key == "fox" or animal_key == "penguin":
		raw_dur *= calc_chef_duration_trait_mult(lv)
	return maxf(0.45, raw_dur)

func calc_carry_capacity(animal_key: String, level: int) -> int:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_cap := int(a_cfg.get("base_cap", 1))
	var lv := maxi(1, level)
	return base_cap + int(floor(float(lv) / 5.0))

func calc_move_speed(animal_key: String, level: int) -> float:
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["otter"])
	var base_spd := float(a_cfg.get("base_speed", 72.0))
	var lv := maxi(1, level)
	var spd := base_spd * (1.0 + 0.03 * float(lv - 1))
	if animal_key == "otter" or animal_key == "toucan":
		spd *= calc_logistics_speed_trait_mult(lv)
	return spd

func calc_shiba_price_bonus(shiba_level: int) -> float:
	if shiba_level <= 0:
		return 1.0
	return 1.0 + 0.1 * float(shiba_level)

func calc_buffer_capacity(level: int) -> int:
	return DEFAULT_BUFFER_CAP + maxi(0, level - 1) * 5

## v2.7-1: 16 In-App & Steam Core Achievements
const ACHIEVEMENTS: Dictionary = {
	"ach_welcome": {"id": "ach_welcome", "name": "初入云岛", "desc": "开启云岛集市经营之旅"},
	"ach_first_gold": {"id": "ach_first_gold", "name": "第一桶金", "desc": "累计赚取 500 金币"},
	"ach_mortar_chef": {"id": "ach_mortar_chef", "name": "研钵飘香", "desc": "制作第 1 份桂花研钵美食"},
	"ach_island_2": {"id": "ach_island_2", "name": "密林开拓者", "desc": "修复木桥解锁 2 号岛【魔法密林】"},
	"ach_island_3": {"id": "ach_island_3", "name": "黄金海岸", "desc": "修复木桥解锁 3 号岛【天空海岸】"},
	"ach_codex_all": {"id": "ach_codex_all", "name": "山海全席", "desc": "点亮山海图鉴全部 8 种食材料理"},
	"ach_pomodoro": {"id": "ach_pomodoro", "name": "专注达人", "desc": "完成 1 次 25 分钟番茄钟专注"},
	"ach_contract": {"id": "ach_contract", "name": "皇家供货商", "desc": "完成第 1 份飞艇皇家契约订单"},
	"ach_amber_rich": {"id": "ach_amber_rich", "name": "琥珀收藏家", "desc": "累计获得 5 颗晨露琥珀"},
	"ach_landscape_all": {"id": "ach_landscape_all", "name": "微缩造景师", "desc": "点亮全部 3 座岛屿专属增益造景"},
	"ach_animal_lv10": {"id": "ach_animal_lv10", "name": "王牌进修生", "desc": "任意小动物小队进修达到 Lv.10"},
	"ach_animal_lv25": {"id": "ach_animal_lv25", "name": "金牌匠师团", "desc": "任意小动物小队进修达到 Lv.25"},
	"ach_building_lv25": {"id": "ach_building_lv25", "name": "产业蜕变", "desc": "任意主建筑升级达到 Lv.25"},
	"ach_harvest_50": {"id": "ach_harvest_50", "name": "晨露丰收季", "desc": "累计收获 50 份农田作物"},
	"ach_customer_20": {"id": "ach_customer_20", "name": "宾至如归", "desc": "累计服务 20 位登岛顾客"},
	"ach_star_5": {"id": "ach_star_5", "name": "五星云岛名宿", "desc": "云岛经营星级声望达到 5 星"}
}

## v2.7-2: Multi-language Internationalization Dictionary (`zh_CN` / `en_US` / `ja_JP`)
const SUPPORTED_LANGS: Array[String] = ["zh_CN", "en_US", "ja_JP"]
var current_lang: String = "zh_CN"

const I18N_DICT: Dictionary = {
	"zh_CN": {
		"lang_badge": "[简中]",
		"tab_build": "建筑升级",
		"tab_animal": "动物编制",
		"tab_expand": "开拓造景",
		"tab_codex": "山海图鉴",
		"tab_companion": "★摸鱼置顶",
		"tab_window": "★常规窗口",
		"drawer_build": "【建筑升级】每25级作物/美食自动换代 + 建筑四阶外观蜕变!",
		"drawer_animal": "【动物编制与特质】点击摸头加速 · Lv.10/25/50激活专精特质!",
		"drawer_expand": "【开拓与造景】开拓跨岛木桥 · 晨露琥珀点亮三岛专属增益造景!",
		"drawer_codex": "【山海图鉴】已点亮 %d/8 种食材料理 · 永久售价 +%d%%!"
	},
	"en_US": {
		"lang_badge": "[EN]",
		"tab_build": "Buildings",
		"tab_animal": "Workers",
		"tab_expand": "Islands",
		"tab_codex": "Codex",
		"tab_companion": "★Desk Pin",
		"tab_window": "★Windowed",
		"drawer_build": "[Buildings] Auto-evolves every 25 levels + 4-Tier visual upgrade!",
		"drawer_animal": "[Animal Crew] Click to pet (+50% spd) · Unlock traits at Lv.10/25/50!",
		"drawer_expand": "[Expansion] Build island bridges & unlock Amber passive landscapes!",
		"drawer_codex": "[Collection Codex] Unlocked %d/8 delicacies · Global price +%d%%!"
	},
	"ja_JP": {
		"lang_badge": "[日本語]",
		"tab_build": "施設強化",
		"tab_animal": "動物編成",
		"tab_expand": "開拓造景",
		"tab_codex": "山海図鑑",
		"tab_companion": "★デスクトップ",
		"tab_window": "★通常窓",
		"drawer_build": "【施設強化】25Lv毎に作物と料理が進化＋外観4段階変化！",
		"drawer_animal": "【動物編成】撫でて加速・Lv.10/25/50で専門特性解放！",
		"drawer_expand": "【開拓造景】木橋を修復し、琥珀で三島の特別造景を解放！",
		"drawer_codex": "【山海図鑑】%d/8 種の食材と料理を解放・販売価格 +%d%%！"
	}
}

func set_language(lang_code: String) -> void:
	if SUPPORTED_LANGS.has(lang_code):
		current_lang = lang_code

func cycle_language() -> String:
	var idx := SUPPORTED_LANGS.find(current_lang)
	current_lang = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.size()]
	return current_lang

func tr_key(key: String) -> String:
	var table: Dictionary = I18N_DICT.get(current_lang, I18N_DICT["zh_CN"])
	return String(table.get(key, I18N_DICT["zh_CN"].get(key, key)))

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
