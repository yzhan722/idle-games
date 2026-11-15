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
var _pixel_tex_cache: Dictionary = {}
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

## CI-4: 24 Solar Terms Seasonal Specialty Dishes (`二十四节气限定美食`)
const SOLAR_DISH_ORDER: Array[String] = [
	"solar_dish_spring",
	"solar_dish_summer",
	"solar_dish_autumn",
	"solar_dish_winter"
]

const SOLAR_SPECIALTY_DISHES: Dictionary = {
	"solar_dish_spring": {
		"id": "solar_dish_spring",
		"name": "春分青团",
		"full_name": "春分·艾草青团",
		"season": "spring",
		"workshop": "mortar",
		"base_crop_val": 18,
		"mult": 5.0,
		"in_season_bonus": 1.45,
		"icon_tex": "res://assets/pixel_art/ui/solar_dish_spring_qingtuan.png"
	},
	"solar_dish_summer": {
		"id": "solar_dish_summer",
		"name": "夏至杨梅饮",
		"full_name": "夏至·冰镇杨梅饮",
		"season": "summer",
		"workshop": "cauldron",
		"base_crop_val": 30,
		"mult": 15.0,
		"in_season_bonus": 1.45,
		"icon_tex": "res://assets/pixel_art/ui/solar_dish_summer_bayberry.png"
	},
	"solar_dish_autumn": {
		"id": "solar_dish_autumn",
		"name": "秋分蟹粉酥",
		"full_name": "秋分·桂花蟹粉酥",
		"season": "autumn",
		"workshop": "mortar",
		"base_crop_val": 26,
		"mult": 7.2,
		"in_season_bonus": 1.45,
		"icon_tex": "res://assets/pixel_art/ui/solar_dish_autumn_crabcake.png"
	},
	"solar_dish_winter": {
		"id": "solar_dish_winter",
		"name": "冬至暖汤圆",
		"full_name": "冬至·暖茸汤圆",
		"season": "winter",
		"workshop": "orbis_linked",
		"base_crop_val": 48,
		"mult": 62.0,
		"in_season_bonus": 1.45,
		"icon_tex": "res://assets/pixel_art/ui/solar_dish_winter_tangyuan.png"
	}
}

## CI-4: Complete 24 Solar Terms Rotation Table (`0..23`)
const SOLAR_TERMS: Array[Dictionary] = [
	{"idx": 0,  "id": "lichun",      "name": "立春", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 1,  "id": "yushui",      "name": "雨水", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 2,  "id": "jingzhe",     "name": "惊蛰", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 3,  "id": "chunfen",     "name": "春分", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 4,  "id": "qingming",    "name": "清明", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 5,  "id": "guyu",        "name": "谷雨", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth",    "buff_val": 0.15, "buff_tag": "春生·农田+15%"},
	{"idx": 6,  "id": "lixia",       "name": "立夏", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 7,  "id": "xiaoman",     "name": "小满", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 8,  "id": "mangzhong",   "name": "芒种", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 9,  "id": "xiazhi",      "name": "夏至", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 10, "id": "xiaoshu",     "name": "小暑", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 11, "id": "dashu",       "name": "大暑", "season": "summer", "dish_id": "solar_dish_summer", "buff_type": "workshop_speed", "buff_val": 0.15, "buff_tag": "夏长·工坊+15%"},
	{"idx": 12, "id": "liqiu",       "name": "立秋", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 13, "id": "chushu",      "name": "处暑", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 14, "id": "bailu",       "name": "白露", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 15, "id": "qiufen",      "name": "秋分", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 16, "id": "hanlu",       "name": "寒露", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 17, "id": "shuangjiang", "name": "霜降", "season": "autumn", "dish_id": "solar_dish_autumn", "buff_type": "price_bonus",    "buff_val": 0.15, "buff_tag": "秋收·售价+15%"},
	{"idx": 18, "id": "lidong",      "name": "立冬", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"},
	{"idx": 19, "id": "xiaoxue",     "name": "小雪", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"},
	{"idx": 20, "id": "daxue",       "name": "大雪", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"},
	{"idx": 21, "id": "dongzhi",     "name": "冬至", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"},
	{"idx": 22, "id": "xiaohan",     "name": "小寒", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"},
	{"idx": 23, "id": "dahan",       "name": "大寒", "season": "winter", "dish_id": "solar_dish_winter", "buff_type": "tip_bonus",      "buff_val": 0.15, "buff_tag": "冬藏·小费+15%"}
]

const AIRSHIP_CARAVAN_TEX := "res://assets/pixel_art/buildings/airship_caravan.png"
const ICON_RARE_VOUCHER_TEX := "res://assets/pixel_art/ui/icon_rare_codex_voucher.png"
const ICON_BULK_ORDER_TEX := "res://assets/pixel_art/ui/icon_airship_bulk_order.png"

## CI-5: Cloud Greenhouse Hybrid Flora Nursery (`云端温室奇花异草培育房`) & Island Souvenir Gift Boxes (`岛屿名物伴手礼礼盒`)
const CLOUD_GREENHOUSE_TEX := "res://assets/pixel_art/buildings/cloud_greenhouse.png"
const FLORA_STARDEW_LILY_TEX := "res://assets/pixel_art/ui/flora_stardew_lily.png"
const FLORA_CLOUD_ROSE_TEX := "res://assets/pixel_art/ui/flora_cloud_rose.png"
const SOUVENIR_BOX_FLORAL_TEX := "res://assets/pixel_art/ui/souvenir_box_floral.png"
const SOUVENIR_BOX_ROYAL_TEX := "res://assets/pixel_art/ui/souvenir_box_royal.png"
const COLLECTOR_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_merchant_normalized.png"
const GREENHOUSE_UNLOCK_COST_GOLD := 160

const HYBRID_FLORA_ORDER: Array[String] = [
	"flora_stardew_lily",
	"flora_cloud_rose"
]

const HYBRID_FLORA: Dictionary = {
	"flora_stardew_lily": {
		"id": "flora_stardew_lily",
		"name": "星露铃兰",
		"lineage": "晨露胡萝卜×幽谷荧光菇",
		"grow_time": 8.5,
		"base_value": 90,
		"aura_type": "crop_growth",
		"aura_val": 0.18,
		"aura_tag": "铃兰光环·农田+18%",
		"crossbreed_from": "",
		"crossbreed_harvests": 0,
		"icon_tex": FLORA_STARDEW_LILY_TEX
	},
	"flora_cloud_rose": {
		"id": "flora_cloud_rose",
		"name": "云霓琉璃玫瑰",
		"lineage": "晨风红草莓×星露铃兰",
		"grow_time": 10.5,
		"base_value": 165,
		"aura_type": "workshop_speed",
		"aura_val": 0.20,
		"aura_tag": "玫瑰光环·工坊+20%&小费+15%",
		"crossbreed_from": "flora_stardew_lily",
		"crossbreed_harvests": 2,
		"icon_tex": FLORA_CLOUD_ROSE_TEX
	}
}

const SOUVENIR_BOX_ORDER: Array[String] = [
	"souvenir_box_floral",
	"souvenir_box_royal"
]

const SOUVENIR_BOXES: Dictionary = {
	"souvenir_box_floral": {
		"id": "souvenir_box_floral",
		"name": "星露花语礼盒",
		"full_name": "星露花语伴手礼盒",
		"flora_candidates": ["flora_stardew_lily", "flora_cloud_rose"],
		"dish_candidates": ["solar_dish_spring", "solar_dish_autumn", "delicacy_1", "delicacy_0"],
		"base_gold": 520,
		"collector_mult": 1.65,
		"amber_bonus": 2,
		"rep_bonus": 35,
		"voucher_bonus": 0,
		"icon_tex": SOUVENIR_BOX_FLORAL_TEX
	},
	"souvenir_box_royal": {
		"id": "souvenir_box_royal",
		"name": "皇家名物礼盒",
		"full_name": "云岛皇家名物礼盒",
		"flora_candidates": ["flora_cloud_rose", "flora_stardew_lily"],
		"dish_candidates": ["solar_dish_winter", "solar_dish_summer", "solar_dish_autumn", "solar_dish_spring", "delicacy_3", "delicacy_2", "delicacy_1", "delicacy_0"],
		"base_gold": 1180,
		"collector_mult": 1.75,
		"amber_bonus": 4,
		"rep_bonus": 65,
		"voucher_bonus": 1,
		"icon_tex": SOUVENIR_BOX_ROYAL_TEX
	}
}

## CI-6: Island 3 Cloud-Sea Hot-Spring Inn (`云海温泉旅馆`) & Cute Spirit Bathhouse (`贵宾萌宠疗愈汤屋`)
const CLOUD_HOTSPRING_INN_TEX := "res://assets/pixel_art/buildings/cloud_hotspring_inn.png"
const BATH_MUGWORT_WARM_TEX := "res://assets/pixel_art/ui/bath_mugwort_warm.png"
const BATH_SAKURA_MIST_TEX := "res://assets/pixel_art/ui/bath_sakura_mist.png"
const BATH_STAR_AMBER_TEX := "res://assets/pixel_art/ui/bath_star_amber.png"
const ICON_VIP_HOTSPRING_GUEST_TEX := "res://assets/pixel_art/ui/icon_vip_hotspring_guest.png"
const VIP_HOTSPRING_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_slime_normalized.png"
const HOTSPRING_UNLOCK_COST_GOLD := 260

const HOTSPRING_BATH_ORDER: Array[String] = [
	"bath_mugwort_warm",
	"bath_sakura_mist",
	"bath_star_amber"
]

const HOTSPRING_BATH_BLENDS: Dictionary = {
	"bath_mugwort_warm": {
		"id": "bath_mugwort_warm",
		"name": "艾草暖身汤",
		"short_name": "艾草汤",
		"recipe_desc": "三岛晨露鲜草熬制 · 驱寒恢复员工精力",
		"crop_candidates": ["crop_2", "crop_1", "crop_0", "crop_3"],
		"flora_candidates": [],
		"steep_time": 8.0,
		"base_gold": 680,
		"vip_tip_mult": 1.70,
		"amber_bonus": 2,
		"voucher_bonus": 0,
		"rep_bonus": 40,
		"worker_move_bonus": 0.16,
		"worker_work_bonus": 0.16,
		"tip_aura_bonus": 0.08,
		"aura_tag": "艾草蒸汽·全员精力+16%&小费+8%",
		"unlock_from": "",
		"unlock_brews_req": 0,
		"icon_tex": BATH_MUGWORT_WARM_TEX
	},
	"bath_sakura_mist": {
		"id": "bath_sakura_mist",
		"name": "樱瓣云雾汤",
		"short_name": "樱瓣汤",
		"recipe_desc": "云岛鲜果×星露铃兰花瓣 · 香雾提速引汤客",
		"crop_candidates": ["crop_3", "crop_2", "crop_1", "crop_0"],
		"flora_candidates": ["flora_stardew_lily", "flora_cloud_rose"],
		"steep_time": 9.5,
		"base_gold": 1120,
		"vip_tip_mult": 1.78,
		"amber_bonus": 3,
		"voucher_bonus": 1,
		"rep_bonus": 60,
		"worker_move_bonus": 0.22,
		"worker_work_bonus": 0.20,
		"tip_aura_bonus": 0.12,
		"aura_tag": "樱雾花汤·全员精力+22%&小费+12%",
		"unlock_from": "bath_mugwort_warm",
		"unlock_brews_req": 2,
		"icon_tex": BATH_SAKURA_MIST_TEX
	},
	"bath_star_amber": {
		"id": "bath_star_amber",
		"name": "星珀灵泉汤",
		"short_name": "星珀汤",
		"recipe_desc": "晴滩金菠萝×云霓琉璃玫瑰 · 皇室琥珀灵汤",
		"crop_candidates": ["crop_3", "crop_2", "crop_1", "crop_0"],
		"flora_candidates": ["flora_cloud_rose", "flora_stardew_lily"],
		"steep_time": 11.5,
		"base_gold": 1680,
		"vip_tip_mult": 1.85,
		"amber_bonus": 5,
		"voucher_bonus": 1,
		"rep_bonus": 85,
		"worker_move_bonus": 0.28,
		"worker_work_bonus": 0.25,
		"tip_aura_bonus": 0.18,
		"aura_tag": "星珀灵泉·全员精力+28%&小费+18%",
		"unlock_from": "bath_sakura_mist",
		"unlock_brews_req": 2,
		"icon_tex": BATH_STAR_AMBER_TEX
	}
}

## CI-7: Cloud Windmill Bakery (`云端风车烘焙面坊`) & Cloud-Sea Gourmet Parade Float Festival (`云海美食花车巡游节`)
const CLOUD_WINDMILL_BAKERY_TEX := "res://assets/pixel_art/buildings/cloud_windmill_bakery.png"
const FLOUR_GOLDEN_WHEAT_TEX := "res://assets/pixel_art/ui/flour_golden_wheat.png"
const BREAD_CLOUD_SOUFFLE_TEX := "res://assets/pixel_art/ui/bread_cloud_souffle.png"
const BREAD_AMBER_CROISSANT_TEX := "res://assets/pixel_art/ui/bread_amber_croissant.png"
const ICON_PARADE_FLOAT_TEX := "res://assets/pixel_art/ui/icon_parade_float.png"
const PARADE_TOURIST_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_pig_normalized.png"
const WINDMILL_UNLOCK_COST_GOLD := 200

const BAKERY_CODEX_ORDER: Array[String] = [
	"flour_golden_wheat",
	"bread_cloud_souffle",
	"bread_amber_croissant"
]

const BAKERY_BREAD_ORDER: Array[String] = [
	"bread_cloud_souffle",
	"bread_amber_croissant"
]

const BAKERY_ITEMS: Dictionary = {
	"flour_golden_wheat": {
		"id": "flour_golden_wheat",
		"name": "金麦云朵面粉",
		"short_name": "云朵面粉",
		"recipe_desc": "三岛鲜果谷物×奇花花蜜精细风磨 · 烘焙基底粉",
		"crop_candidates": ["crop_3", "crop_2", "crop_1", "crop_0"],
		"flora_candidates": ["flora_stardew_lily", "flora_cloud_rose"],
		"bake_time": 6.5,
		"base_gold": 320,
		"parade_mult": 1.75,
		"amber_bonus": 1,
		"voucher_bonus": 0,
		"rep_bonus": 25,
		"aura_speed_bonus": 0.20,
		"aura_tag": "麦香烘焙光环·摊位&工坊提速1.20x+",
		"unlock_from": "",
		"unlock_bakes_req": 0,
		"icon_tex": FLOUR_GOLDEN_WHEAT_TEX
	},
	"bread_cloud_souffle": {
		"id": "bread_cloud_souffle",
		"name": "云朵舒芙蕾欧包",
		"short_name": "舒芙蕾包",
		"recipe_desc": "金麦云朵面粉×晨露鲜果 · 蓬松奶香软欧包",
		"crop_candidates": ["crop_2", "crop_1", "crop_0", "crop_3"],
		"flora_candidates": [],
		"bake_time": 8.0,
		"base_gold": 840,
		"parade_mult": 1.78,
		"amber_bonus": 3,
		"voucher_bonus": 1,
		"rep_bonus": 55,
		"aura_speed_bonus": 0.22,
		"aura_tag": "麦香舒芙蕾·摊位&工坊提速1.22x+",
		"unlock_from": "flour_golden_wheat",
		"unlock_bakes_req": 1,
		"icon_tex": BREAD_CLOUD_SOUFFLE_TEX
	},
	"bread_amber_croissant": {
		"id": "bread_amber_croissant",
		"name": "琥珀蜜糖可颂",
		"short_name": "蜜糖可颂",
		"recipe_desc": "金麦云朵面粉×温室奇花蜜 · 金黄酥脆起酥可颂",
		"crop_candidates": ["crop_3", "crop_2", "crop_1", "crop_0"],
		"flora_candidates": ["flora_cloud_rose", "flora_stardew_lily"],
		"bake_time": 10.0,
		"base_gold": 1480,
		"parade_mult": 1.88,
		"amber_bonus": 5,
		"voucher_bonus": 1,
		"rep_bonus": 85,
		"aura_speed_bonus": 0.26,
		"aura_tag": "琥珀麦香光环·摊位&工坊提速1.26x+",
		"unlock_from": "bread_cloud_souffle",
		"unlock_bakes_req": 2,
		"icon_tex": BREAD_AMBER_CROISSANT_TEX
	}
}

## CI-8: Cloud Tea Pavilion (`云端茗香制茶坊`) & Lotus Pond Moon-Boat Tea Gathering (`月色画舫品茗雅集`)
const CLOUD_TEA_PAVILION_TEX := "res://assets/pixel_art/buildings/cloud_tea_pavilion.png"
const TEA_SPRING_LEAVES_TEX := "res://assets/pixel_art/ui/tea_spring_leaves.png"
const TEA_CLOUD_LONGJING_TEX := "res://assets/pixel_art/ui/tea_cloud_longjing.png"
const TEA_OSMANTHUS_OOLONG_TEX := "res://assets/pixel_art/ui/tea_osmanthus_oolong.png"
const ICON_MOON_TEA_BOAT_TEX := "res://assets/pixel_art/ui/icon_moon_tea_boat.png"
const TEA_CONNOISSEUR_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_critic_normalized.png"
const TEA_PAVILION_UNLOCK_COST_GOLD := 160
const MOON_TEA_SALE_BUFF_MULT := 1.38

const TEA_CODEX_ORDER: Array[String] = [
	"tea_spring_leaves",
	"tea_cloud_longjing",
	"tea_osmanthus_oolong"
]

const TEA_BREW_ORDER: Array[String] = [
	"tea_cloud_longjing",
	"tea_osmanthus_oolong"
]

const TEA_ITEMS: Dictionary = {
	"tea_spring_leaves": {
		"id": "tea_spring_leaves",
		"name": "云雾春芽",
		"short_name": "云雾春芽",
		"recipe_desc": "岛屿鲜草与温室奇花萎凋杀青 · 茗香清心茶底",
		"crop_candidates": ["crop_0", "crop_1", "crop_2", "crop_3"],
		"flora_candidates": ["flora_stardew_lily", "flora_cloud_rose"],
		"brew_time": 6.0,
		"base_gold": 280,
		"moon_mult": MOON_TEA_SALE_BUFF_MULT,
		"amber_bonus": 1,
		"voucher_bonus": 0,
		"rep_bonus": 25,
		"worker_move_bonus": 0.16,
		"worker_stamina_bonus": 0.16,
		"tip_aura_bonus": 0.12,
		"aura_tag": "茗香清心·员工效率+16%&小费+12%",
		"unlock_from": "",
		"unlock_brews_req": 0,
		"icon_tex": TEA_SPRING_LEAVES_TEX
	},
	"tea_cloud_longjing": {
		"id": "tea_cloud_longjing",
		"name": "云雾龙井茗茶",
		"short_name": "龙井茗茶",
		"recipe_desc": "云雾春芽×晨露清泉慢焙沏泡 · 翠色兰香名茶",
		"crop_candidates": ["crop_0", "crop_1", "crop_2", "crop_3"],
		"flora_candidates": [],
		"brew_time": 7.5,
		"base_gold": 780,
		"moon_mult": MOON_TEA_SALE_BUFF_MULT,
		"amber_bonus": 3,
		"voucher_bonus": 1,
		"rep_bonus": 50,
		"worker_move_bonus": 0.18,
		"worker_stamina_bonus": 0.18,
		"tip_aura_bonus": 0.15,
		"aura_tag": "龙井清心·员工效率+18%&小费+15%",
		"unlock_from": "tea_spring_leaves",
		"unlock_brews_req": 1,
		"icon_tex": TEA_CLOUD_LONGJING_TEX
	},
	"tea_osmanthus_oolong": {
		"id": "tea_osmanthus_oolong",
		"name": "桂花乌龙香茗",
		"short_name": "桂花乌龙",
		"recipe_desc": "云雾春芽×奇花金桂窨制 · 甘醇岩韵极品乌龙",
		"crop_candidates": ["crop_1", "crop_2", "crop_3", "crop_0"],
		"flora_candidates": ["flora_cloud_rose", "flora_stardew_lily"],
		"brew_time": 9.5,
		"base_gold": 1380,
		"moon_mult": MOON_TEA_SALE_BUFF_MULT,
		"amber_bonus": 5,
		"voucher_bonus": 1,
		"rep_bonus": 80,
		"worker_move_bonus": 0.22,
		"worker_stamina_bonus": 0.22,
		"tip_aura_bonus": 0.20,
		"aura_tag": "桂乌清心·员工效率+22%&小费+20%",
		"unlock_from": "tea_cloud_longjing",
		"unlock_brews_req": 1,
		"icon_tex": TEA_OSMANTHUS_OOLONG_TEX
	}
}

const BUILDINGS: Dictionary = {
	"soil_1": {"name": "射手村农田", "desc": "每25级作物自动换代+产能翻倍+外观进化", "base_cost": 25, "base_value": 12, "island": 1},
	"mortar": {"name": "桂花研钵工坊", "desc": "狐狸研磨3.5x美食 · 每25级菜品与外观进化", "base_cost": 45, "base_value": 42, "island": 1},
	"stall": {"name": "云岛集市主摊位", "desc": "扩充缓存上限(10+5/级) · Lv.25解锁暖光路灯", "base_cost": 65, "base_value": 50, "island": 1},
	"soil_2": {"name": "魔法密林农田", "desc": "岛2魔法作物产能 · 每25级品种与外观进化", "base_cost": 140, "base_value": 30, "island": 2},
	"cauldron": {"name": "星露炼金坩埚", "desc": "企鹅炼制12x甘露 · Lv.25开启炼金星火粒子", "base_cost": 210, "base_value": 360, "island": 2},
	"soil_3": {"name": "天空海岸双工坊", "desc": "岛3顶级农田+研钵坩埚联动 (52x价值)", "base_cost": 360, "base_value": 2496, "island": 3},
	"greenhouse": {"name": "云端温室培育房", "desc": "杂交培育奇花异草 · 光环增益与伴手礼盒", "base_cost": 180, "base_value": 120, "island": 2},
	"hotspring": {"name": "云海温泉汤屋", "desc": "调制草本花瓣浴汤 · 员工精力恢复+贵宾琥珀小费", "base_cost": 240, "base_value": 180, "island": 3},
	"windmill": {"name": "云端风车面坊", "desc": "风磨金麦粉烘焙欧包可颂 · 麦香光环提速1.20x+", "base_cost": 220, "base_value": 165, "island": 2},
	"tea_pavilion": {"name": "云端茗香制茶坊", "desc": "杀青春芽慢沏龙井乌龙 · 茗香清心光环效率&小费增益", "base_cost": 185, "base_value": 150, "island": 1}
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
const ANIMAL_ORDER: Array[String] = ["bunny", "otter", "fox", "shiba", "penguin", "toucan"]

const ANIMAL_TRAITS: Dictionary = {
	"bunny": {"name": "丰收巧爪", "desc": "收获产量+1/阶", "type": "harvest_bonus"},
	"otter": {"name": "疾风步履", "desc": "移速+20%/阶", "type": "speed_mult"},
	"fox": {"name": "匠心巧艺", "desc": "加工耗时-15%/阶", "type": "work_duration_mult"},
	"shiba": {"name": "招财金算", "desc": "小费率+15%/阶", "type": "tip_bonus"},
	"penguin": {"name": "极地秘传", "desc": "炼制耗时-15%/阶", "type": "work_duration_mult"},
	"toucan": {"name": "顺风羽翼", "desc": "跨岛移速+20%/阶", "type": "speed_mult"}
}

## CI-3: Golden Employee Promotion Tiers, Headwear Accessories & Honor Medals (Lv.10 / Lv.25 / Lv.50)
const PROMOTION_TIERS: Array[Dictionary] = [
	{
		"tier": 0,
		"min_level": 1,
		"title_zh": "见习萌芽",
		"title_en": "Apprentice",
		"title_ja": "見習い",
		"accessory_tex": "",
		"medal_tex": ""
	},
	{
		"tier": 1,
		"min_level": 10,
		"title_zh": "★新星学徒",
		"title_en": "★Rising Star",
		"title_ja": "★新星見習",
		"accessory_tex": "res://assets/pixel_art/ui/promo_tier1_star_ribbon.png",
		"medal_tex": "res://assets/pixel_art/ui/medal_tier1_bronze.png"
	},
	{
		"tier": 2,
		"min_level": 25,
		"title_zh": "★匠心大师",
		"title_en": "★Artisan Chef",
		"title_ja": "★匠マイスター",
		"accessory_tex": "res://assets/pixel_art/ui/promo_tier2_chef_hat.png",
		"medal_tex": "res://assets/pixel_art/ui/medal_tier2_silver.png"
	},
	{
		"tier": 3,
		"min_level": 50,
		"title_zh": "★金冠宗师",
		"title_en": "★Gilded Crown",
		"title_ja": "★金冠宗師",
		"accessory_tex": "res://assets/pixel_art/ui/promo_tier3_gilded_crown.png",
		"medal_tex": "res://assets/pixel_art/ui/medal_tier3_gold.png"
	}
]

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
		"x_pos": 139.6,
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
		"x_pos": 1761.5,
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

func load_pixel_texture(res_path: String) -> Texture2D:
	if res_path == "":
		return null
	if _pixel_tex_cache.has(res_path) and _pixel_tex_cache[res_path] != null:
		return _pixel_tex_cache[res_path]
	if ResourceLoader.exists(res_path):
		var loaded := load(res_path) as Texture2D
		if loaded != null:
			_pixel_tex_cache[res_path] = loaded
			return loaded
	var abs_path := ProjectSettings.globalize_path(res_path)
	if FileAccess.file_exists(abs_path):
		var img := Image.load_from_file(abs_path)
		if img != null and not img.is_empty():
			var itex := ImageTexture.create_from_image(img)
			_pixel_tex_cache[res_path] = itex
			return itex
	return null

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

func get_animal_promotion_info(animal_key: String, level: int) -> Dictionary:
	var lv := maxi(0, level)
	var tier := get_animal_trait_tier_count(lv)
	var tier_cfg: Dictionary = PROMOTION_TIERS[clampi(tier, 0, PROMOTION_TIERS.size() - 1)]
	var title_key := "title_zh"
	if current_lang == "en_US":
		title_key = "title_en"
	elif current_lang == "ja_JP":
		title_key = "title_ja"
	var a_cfg: Dictionary = ANIMALS.get(animal_key, ANIMALS["bunny"])
	var short_name := String(a_cfg.get("name", animal_key)).split(" · ")[0]
	var t_cfg: Dictionary = ANIMAL_TRAITS.get(animal_key, ANIMAL_TRAITS["bunny"])
	var next_lv := 10 if tier == 0 else (25 if tier == 1 else (50 if tier == 2 else 50))
	return {
		"animal_key": animal_key,
		"short_name": short_name,
		"level": lv,
		"tier": tier,
		"tier_title": String(tier_cfg.get(title_key, "见习萌芽")),
		"trait_name": String(t_cfg.get("name", "专精")),
		"trait_desc": String(t_cfg.get("desc", "")),
		"medals_unlocked": tier,
		"medals_total": 3,
		"next_milestone_lv": next_lv,
		"accessory_tex": String(tier_cfg.get("accessory_tex", "")),
		"medal_tex": String(tier_cfg.get("medal_tex", ""))
	}

func get_total_honor_medals_unlocked(animal_levels: Dictionary) -> Dictionary:
	var unlocked := 0
	var total := ANIMAL_ORDER.size() * 3
	for ak in ANIMAL_ORDER:
		unlocked += get_animal_trait_tier_count(int(animal_levels.get(ak, 0)))
	return {"unlocked": unlocked, "total": total}

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
	"ach_star_5": {"id": "ach_star_5", "name": "五星云岛名宿", "desc": "云岛经营星级声望达到 5 星"},
	"ach_airship_caravan": {"id": "ach_airship_caravan", "name": "远洋大掌柜", "desc": "完成第 1 份浮空飞艇远洋商队大订单"},
	"ach_solar_feast": {"id": "ach_solar_feast", "name": "四时节气宴", "desc": "点亮全部 4 道二十四节气限定美食"},
	"ach_greenhouse_bloom": {"id": "ach_greenhouse_bloom", "name": "奇花园艺师", "desc": "点亮云端温室全部 2 种奇花异草杂交品种"},
	"ach_souvenir_master": {"id": "ach_souvenir_master", "name": "云岛伴手礼名家", "desc": "向收藏家旅客售出第 1 份岛屿名物伴手礼盒"},
	"ach_hotspring_master": {"id": "ach_hotspring_master", "name": "云海汤屋掌柜", "desc": "点亮3号岛云海温泉全部 3 款草本花瓣浴汤配方"},
	"ach_hotspring_vip": {"id": "ach_hotspring_vip", "name": "灵泉贵宾礼遇", "desc": "接待贵宾萌宠汤客并结算第 1 份温泉高额小费"},
	"ach_windmill_baker": {"id": "ach_windmill_baker", "name": "云端烘焙大师", "desc": "点亮云端风车烘焙面坊全部 3 款面粉与欧包可颂图鉴"},
	"ach_parade_feast": {"id": "ach_parade_feast", "name": "花车巡游盛典", "desc": "云海美食花车巡游节期间向巡游食客售出第 1 份鲜烤烘焙名点"},
	"ach_tea_master": {"id": "ach_tea_master", "name": "云端茗香茶圣", "desc": "点亮云端茗香制茶坊全部 3 款春芽与龙井乌龙茗茶图鉴"},
	"ach_moon_tea_gathering": {"id": "ach_moon_tea_gathering", "name": "月色画舫雅集", "desc": "荷塘月色画舫茶会期间品茗领赏或接待第 1 位雅集茶客"}
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
		"drawer_build": "【建筑升级】含制茶坊·温室·温泉·风车坊 · 每25级蜕变!",
		"drawer_animal": "【动物编制与特质】点击摸头加速 · Lv.10/25/50激活专精特质!",
		"drawer_expand": "【开拓与节庆坊】木桥·远洋·礼盒·温泉·花车·月色画舫茶会!",
		"drawer_codex": "【山海图鉴】已点亮 %d/8 种食材料理 · 永久售价 +%d%%!",
		"drawer_codex_full": "【山海图鉴】料理 %d/8 · 节气 %d/4(%s) · 图鉴券 %d · 勋章 %d/%d",
		"drawer_codex_ci5": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·勋章 %d/%d",
		"drawer_codex_ci6": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·勋%d/%d",
		"drawer_codex_ci7": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·勋%d/%d",
		"drawer_codex_ci8": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·勋%d/%d",
		"medal_prog": "勋章 %d/%d"
	},
	"en_US": {
		"lang_badge": "[EN]",
		"tab_build": "Buildings",
		"tab_animal": "Workers",
		"tab_expand": "Islands",
		"tab_codex": "Codex",
		"tab_companion": "★Desk Pin",
		"tab_window": "★Windowed",
		"drawer_build": "[Buildings] Tea Pavilion, Greenhouse, Spa, Bakery & 25Lv evo!",
		"drawer_animal": "[Animal Crew] Click to pet (+50% spd) · Unlock traits at Lv.10/25/50!",
		"drawer_expand": "[Islands & Fests] Bridges, Airship, Spa, Parade & Moon Tea Boat!",
		"drawer_codex": "[Collection Codex] Unlocked %d/8 delicacies · Global price +%d%%!",
		"drawer_codex_full": "[Codex] Dishes %d/8 · Solar %d/4(%s) · Voucher %d · Medals %d/%d",
		"drawer_codex_ci5": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Medals %d/%d",
		"drawer_codex_ci6": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Med %d/%d",
		"drawer_codex_ci7": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Med %d/%d",
		"drawer_codex_ci8": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Tea %d/3·Med %d/%d",
		"medal_prog": "Medals %d/%d"
	},
	"ja_JP": {
		"lang_badge": "[日本語]",
		"tab_build": "施設強化",
		"tab_animal": "動物編成",
		"tab_expand": "開拓造景",
		"tab_codex": "山海図鑑",
		"tab_companion": "★デスクトップ",
		"tab_window": "★通常窓",
		"drawer_build": "【施設強化】製茶坊・温室・温泉・風車工房＆25Lv進化！",
		"drawer_animal": "【動物編成】撫でて加速・Lv.10/25/50で専門特性解放！",
		"drawer_expand": "【開拓・祭典】木橋・遠洋・温泉・パレード・月見茶舟雅集！",
		"drawer_codex": "【山海図鑑】%d/8 種の食材と料理を解放・販売価格 +%d%%！",
		"drawer_codex_full": "【山海図鑑】料理 %d/8 · 節気 %d/4(%s) · 図鑑券 %d · 勲章 %d/%d",
		"drawer_codex_ci5": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·勲章 %d/%d",
		"drawer_codex_ci6": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·勲%d/%d",
		"drawer_codex_ci7": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·勲%d/%d",
		"drawer_codex_ci8": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·勲%d/%d",
		"medal_prog": "勲章 %d/%d"
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

func get_solar_term_info(term_idx: int) -> Dictionary:
	if SOLAR_TERMS.is_empty():
		return {"idx": 3, "id": "chunfen", "name": "春分", "season": "spring", "dish_id": "solar_dish_spring", "buff_type": "crop_growth", "buff_val": 0.15, "buff_tag": "春生·农田+15%"}
	var safe_idx := posmod(term_idx, SOLAR_TERMS.size())
	return SOLAR_TERMS[safe_idx]

func is_solar_specialty_dish(item_id: String) -> bool:
	return SOLAR_SPECIALTY_DISHES.has(item_id)

func is_hybrid_flora(item_id: String) -> bool:
	return HYBRID_FLORA.has(item_id)

func is_souvenir_box(item_id: String) -> bool:
	return SOUVENIR_BOXES.has(item_id)

func is_hotspring_bath(item_id: String) -> bool:
	return HOTSPRING_BATH_BLENDS.has(item_id)

func is_bakery_item(item_id: String) -> bool:
	return BAKERY_ITEMS.has(item_id)

func is_bakery_bread(item_id: String) -> bool:
	return BAKERY_BREAD_ORDER.has(item_id)

func is_tea_item(item_id: String) -> bool:
	return TEA_ITEMS.has(item_id)

func is_artisan_tea(item_id: String) -> bool:
	return TEA_BREW_ORDER.has(item_id)

func get_item_display_name(item_id: String) -> String:
	if CROPS.has(item_id):
		return String(CROPS[item_id].get("name", item_id))
	if DELICACIES.has(item_id):
		return String(DELICACIES[item_id].get("name", item_id))
	if SOLAR_SPECIALTY_DISHES.has(item_id):
		return String(SOLAR_SPECIALTY_DISHES[item_id].get("name", item_id))
	if HYBRID_FLORA.has(item_id):
		return String(HYBRID_FLORA[item_id].get("name", item_id))
	if SOUVENIR_BOXES.has(item_id):
		return String(SOUVENIR_BOXES[item_id].get("name", item_id))
	if HOTSPRING_BATH_BLENDS.has(item_id):
		return String(HOTSPRING_BATH_BLENDS[item_id].get("name", item_id))
	if BAKERY_ITEMS.has(item_id):
		return String(BAKERY_ITEMS[item_id].get("name", item_id))
	if TEA_ITEMS.has(item_id):
		return String(TEA_ITEMS[item_id].get("name", item_id))
	return item_id

func calc_item_unit_price(item_id: String, building_lv: int, stall_lv: int, shiba_lv: int, current_solar_idx: int = -1) -> int:
	var shiba_mult := calc_shiba_price_bonus(shiba_lv)
	var stall_mult := 1.0 + 0.08 * float(maxi(1, stall_lv) - 1)
	if TEA_ITEMS.has(item_id):
		var ti: Dictionary = TEA_ITEMS[item_id]
		var ti_base := float(ti.get("base_gold", 780))
		var ti_raw := calc_milestone_value(ti_base, maxi(1, building_lv))
		return maxi(1, int(round(ti_raw * stall_mult * shiba_mult)))
	if BAKERY_ITEMS.has(item_id):
		var bk: Dictionary = BAKERY_ITEMS[item_id]
		var bk_base := float(bk.get("base_gold", 840))
		var bk_raw := calc_milestone_value(bk_base, maxi(1, building_lv))
		return maxi(1, int(round(bk_raw * stall_mult * shiba_mult)))
	if HOTSPRING_BATH_BLENDS.has(item_id):
		var hb: Dictionary = HOTSPRING_BATH_BLENDS[item_id]
		var hb_base := float(hb.get("base_gold", 680))
		var hb_raw := calc_milestone_value(hb_base, maxi(1, building_lv))
		return maxi(1, int(round(hb_raw * stall_mult * shiba_mult)))
	if SOUVENIR_BOXES.has(item_id):
		var sb: Dictionary = SOUVENIR_BOXES[item_id]
		var sb_base := float(sb.get("base_gold", 520))
		var sb_raw := calc_milestone_value(sb_base, maxi(1, building_lv))
		return maxi(1, int(round(sb_raw * stall_mult * shiba_mult)))
	if HYBRID_FLORA.has(item_id):
		var hf: Dictionary = HYBRID_FLORA[item_id]
		var hf_base := float(hf.get("base_value", 85))
		var hf_raw := calc_milestone_value(hf_base, maxi(1, building_lv))
		return maxi(1, int(round(hf_raw * stall_mult * shiba_mult)))
	if SOLAR_SPECIALTY_DISHES.has(item_id):
		var sd: Dictionary = SOLAR_SPECIALTY_DISHES[item_id]
		var s_base := float(sd.get("base_crop_val", 18))
		var s_mult := float(sd.get("mult", 5.0))
		var s_raw := calc_milestone_value(s_base, maxi(1, building_lv))
		var season_mult := 1.0
		if current_solar_idx >= 0:
			var t_info := get_solar_term_info(current_solar_idx)
			if String(t_info.get("dish_id", "")) == item_id:
				season_mult = float(sd.get("in_season_bonus", 1.45))
		return maxi(1, int(round(s_raw * s_mult * season_mult * stall_mult * shiba_mult)))
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
