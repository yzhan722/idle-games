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
		## CI-12: a kiln-fired piece from the Cloud Pottery Kiln is packed as the gift ware first (tea bowl -> floral box)
		"pottery_candidates": ["pottery_tea_bowl", "pottery_vase"],
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
		## CI-12: a kiln-fired celadon vase is packed as the gift ware first (vase -> royal box)
		"pottery_candidates": ["pottery_vase", "pottery_tea_bowl"],
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

## CI-9: Cloud-Sea Star Lantern Wish Festival (`云海星灯祈愿水灯节`) & Mountain-Sea Master Chef Tasting Pavilion (`山海特级食神品鉴席`)
const STAR_LANTERN_TEX := "res://assets/pixel_art/ui/star_lantern.png"
const ICON_LANTERN_FESTIVAL_TEX := "res://assets/pixel_art/ui/icon_lantern_festival.png"
const CHEF_TASTING_PAVILION_TEX := "res://assets/pixel_art/buildings/chef_tasting_pavilion.png"
const DISH_CLOUD_DUMPLINGS_TEX := "res://assets/pixel_art/ui/dish_cloud_dumplings.png"
const DISH_STARLIGHT_FISH_TEX := "res://assets/pixel_art/ui/dish_starlight_fish.png"
const DISH_MOUNTAIN_SEA_HOTPOT_TEX := "res://assets/pixel_art/ui/dish_mountain_sea_hotpot.png"
const ICON_CHEF_MEDAL_TEX := "res://assets/pixel_art/ui/icon_chef_medal.png"
const CHEF_PAVILION_UNLOCK_COST_GOLD := 240
const WISH_LANTERN_SALE_BUFF_MULT := 1.30
const WISH_LANTERN_TASTING_SCORE_BONUS := 14
const TASTING_PASS_SCORE := 80

## Island 2 slot of the tasting pavilion (rightmost slot, flush against Bridge 1 west endpoint `x = 492.0`)
const CHEF_PAVILION_SLOT_X := 469.9

## Water lanes for drifting star lanterns (`waterline_y` = bottom-center anchor of each lantern on the water surface).
## Every lane was sampled against the island textures so the lantern ripple footprint stays 100% on water:
##   - Lotus Pond lanes (Island 1, `island_henesys.png` drawn at local `(560, 70)`), above the twin pond bridges (`y >= 118`);
##   - Coast shallows lanes (Island 3, `island_orbis_coast.png` drawn at local `(1396, 74 + bob)`), below all
##     Island 3 building bases (`GROUND_Y = 124`) and between the `Lv.` level labels.
## CI-10: Island 3 was re-slotted to 6 buildings (Lighthouse Harbor + fishing cove), so the 3 coast lanes moved to the
## tree lagoon (`1455..1476`), the soil/workshop shoal (`1568..1577`) and the workshop/spa bay (`1627..1646`); the east cove
## (`1747..1798`) now belongs to the fishing boats.
const WISH_LANTERN_LANES: Array[Dictionary] = [
	{"id": "pond_west", "island": 1, "min_x": 1097.0, "max_x": 1118.0, "waterline_y": 115.0, "dir": 1.0, "speed": 3.2},
	{"id": "pond_center", "island": 1, "min_x": 1206.0, "max_x": 1248.0, "waterline_y": 111.0, "dir": -1.0, "speed": 4.4},
	{"id": "pond_east", "island": 1, "min_x": 1276.0, "max_x": 1294.0, "waterline_y": 116.0, "dir": 1.0, "speed": 3.0},
	{"id": "coast_lagoon", "island": 3, "min_x": 1455.0, "max_x": 1476.0, "waterline_y": 148.0, "dir": 1.0, "speed": 3.4},
	{"id": "coast_shoal", "island": 3, "min_x": 1568.0, "max_x": 1577.0, "waterline_y": 149.0, "dir": -1.0, "speed": 2.2},
	{"id": "coast_bay", "island": 3, "min_x": 1627.0, "max_x": 1646.0, "waterline_y": 148.0, "dir": -1.0, "speed": 3.6}
]

const TASTING_DISH_ORDER: Array[String] = [
	"dish_cloud_dumplings",
	"dish_starlight_fish",
	"dish_mountain_sea_hotpot"
]

## Each `ingredients` entry is one slot: any ONE of the listed existing ingredients/products satisfies the slot.
const TASTING_DISHES: Dictionary = {
	"dish_cloud_dumplings": {
		"id": "dish_cloud_dumplings",
		"name": "云海灌汤小笼",
		"short_name": "灌汤小笼",
		"recipe_desc": "晨露胡萝卜/红草莓 × 金麦粉/云朵鲜奶/桂花糯米糕 · 云雾竹笼慢蒸",
		"ingredients": [
			["crop_0", "crop_1"],
			["flour_golden_wheat", "dairy_milk", "bread_cloud_souffle", "delicacy_0", "delicacy_1"]
		],
		"cook_time": 7.0,
		"base_gold": 1680,
		"base_score": 76,
		"amber_bonus": 4,
		"voucher_bonus": 1,
		"rep_bonus": 60,
		"unlock_from": "",
		"icon_tex": DISH_CLOUD_DUMPLINGS_TEX
	},
	"dish_starlight_fish": {
		"id": "dish_starlight_fish",
		"name": "星光锦鲤清蒸鱼",
		"short_name": "星光锦鲤",
		"recipe_desc": "云海鲜渔获/幽谷荧光菇 × 龙井/春芽茶汤 × 奇花 · 荷塘锦鲤清蒸",
		"ingredients": [
			["seafood_catch", "crop_2", "crop_1", "crop_0"],
			["tea_cloud_longjing", "tea_osmanthus_oolong", "tea_spring_leaves", "delicacy_2", "delicacy_1"],
			["flora_stardew_lily", "flora_cloud_rose", "crop_0", "crop_1"]
		],
		"cook_time": 8.5,
		"base_gold": 2860,
		"base_score": 72,
		"amber_bonus": 6,
		"voucher_bonus": 1,
		"rep_bonus": 90,
		"unlock_from": "dish_cloud_dumplings",
		"icon_tex": DISH_STARLIGHT_FISH_TEX
	},
	"dish_mountain_sea_hotpot": {
		"id": "dish_mountain_sea_hotpot",
		"name": "山海八珍火锅",
		"short_name": "山海火锅",
		"recipe_desc": "晴滩凤梨/荧光菇 × 云海鲜渔获/凤梨星露宴 × 熟成奶酪/欧包可颂/云朵布丁 · 山海八珍芝士同沸",
		"ingredients": [
			["crop_3", "crop_2", "crop_1"],
			["seafood_catch", "delicacy_3", "delicacy_2", "solar_dish_winter", "solar_dish_autumn", "solar_dish_summer", "solar_dish_spring", "delicacy_1"],
			["dairy_cheese", "bread_amber_croissant", "bread_cloud_souffle", "dairy_cloud_pudding", "tea_osmanthus_oolong", "tea_cloud_longjing", "delicacy_0", "crop_0"]
		],
		"cook_time": 10.0,
		"base_gold": 4680,
		"base_score": 66,
		"amber_bonus": 9,
		"voucher_bonus": 2,
		"rep_bonus": 140,
		"unlock_from": "dish_starlight_fish",
		"icon_tex": DISH_MOUNTAIN_SEA_HOTPOT_TEX
	}
}

## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`) & Islander Specialty Market Auction (`岛民名物集市拍卖会`)
const LIGHTHOUSE_HARBOR_TEX := "res://assets/pixel_art/buildings/lighthouse_harbor.png"
const FISHING_BOAT_TEX := "res://assets/pixel_art/ui/fishing_boat.png"
const SEAFOOD_CATCH_TEX := "res://assets/pixel_art/ui/seafood_catch.png"
const ICON_AUCTION_GAVEL_TEX := "res://assets/pixel_art/ui/icon_auction_gavel.png"
const RARE_SPECIALTY_BOX_TEX := "res://assets/pixel_art/ui/rare_specialty_box.png"
const LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD := 280
## Island 3 slot 5 (between `CloudHotspringInn_3` and `RightTiki_3`): the harbor pier faces the east fishing cove
const LIGHTHOUSE_HARBOR_SLOT_X := 1743.4
const SEAFOOD_ITEM_ID := "seafood_catch"
const SEAFOOD_BASE_GOLD := 260.0

## Fishing boat lane in the Island 3 east cove (local coords, `island_orbis_coast.png` drawn at `(1396, 74 + bob)`).
## `waterline_y` is the bottom-center anchor of the boat; the hull + near ripple ring footprint
## (`dx = -9..9`, `dy = -6..-2`) was sampled pixel by pixel to stay on water from the berth to the cape (`1747..1798` valid).
const HARBOR_BOAT_LANE: Dictionary = {"id": "east_cove", "island": 3, "berth_x": 1760.0, "sea_x": 1794.0, "waterline_y": 148.0}
const HARBOR_BOAT_HULL_DX: Array[float] = [-9.0, -6.0, -3.0, 0.0, 3.0, 6.0, 9.0]
const HARBOR_BOAT_HULL_DY: Array[float] = [-6.0, -5.0, -4.0, -3.0, -2.0]
const HARBOR_BOAT_TARGET_PX := 22.0
const HARBOR_BOAT_COUNT := 2
## Shared fishing rota on the harbor clock: dock -> sail out to the cape -> at sea (out of sight) -> sail back.
## The two boats run half a period apart and `dock + out + back <= period / 2`, so the cove never holds two hulls at once.
const HARBOR_BOAT_DOCK_SEC := 8.0
const HARBOR_BOAT_SAIL_SEC := 6.0
const HARBOR_BOAT_SEA_SEC := 20.0
const HARBOR_BOAT_FADE_FRAC := 0.34

## Auction: 3 lots per event, 10s each (soft close 2.5s), islanders bid every 1.5s up to their deterministic caps.
const AUCTION_LOT_SEC := 10.0
const AUCTION_SOFT_CLOSE_SEC := 2.5
const AUCTION_AI_BID_INTERVAL := 1.5
const AUCTION_COOLDOWN_SEC := 150.0
const AUCTION_FIRST_COOLDOWN_SEC := 40.0
const AUCTION_BUFF_SALE_MULT := 1.25
const AUCTION_BUFF_SEC := 45.0
const AUCTION_BIDDERS: Array[Dictionary] = [
	{"id": "gull_fisher", "name": "海鸥渔夫"},
	{"id": "coconut_trader", "name": "椰子商人"},
	{"id": "coral_collector", "name": "珊瑚藏家"}
]
const AUCTION_LOT_ORDER: Array[String] = [
	"lot_coral_pearl_box",
	"lot_cloudsea_seafood_basket",
	"lot_three_isle_souvenir"
]
## `ai_caps` are multiples of the start bid (gold lots) or absolute Amber caps (Amber lot), one per islander bidder.
const AUCTION_LOTS: Dictionary = {
	"lot_coral_pearl_box": {
		"id": "lot_coral_pearl_box",
		"name": "珊瑚明珠名物匣",
		"short_name": "明珠匣",
		"kind": "rare_specialty",
		"currency": "gold",
		"start_gps_sec": 14.0,
		"start_min": 360,
		"inc_frac": 0.12,
		"ai_caps": [1.36, 1.60, 1.48],
		"amber": 3,
		"vouchers": 1,
		"rep": 80,
		"icon_tex": RARE_SPECIALTY_BOX_TEX
	},
	"lot_cloudsea_seafood_basket": {
		"id": "lot_cloudsea_seafood_basket",
		"name": "云海鲜味名物篮",
		"short_name": "鲜味篮",
		"kind": "rare_specialty",
		"currency": "amber",
		"start_amber": 3,
		"inc_amber": 1,
		"ai_caps": [5, 4, 6],
		"amber": 0,
		"vouchers": 2,
		"rep": 90,
		"seafood": 4,
		"icon_tex": SEAFOOD_CATCH_TEX
	},
	"lot_three_isle_souvenir": {
		"id": "lot_three_isle_souvenir",
		"name": "三岛名物伴手礼盒",
		"short_name": "伴手礼",
		"kind": "souvenir_box",
		"currency": "gold",
		"start_gps_sec": 20.0,
		"start_min": 520,
		"inc_frac": 0.12,
		"ai_caps": [1.30, 1.42, 1.66],
		"amber": 4,
		"vouchers": 1,
		"rep": 110,
		"souvenir": "souvenir_box_royal",
		"icon_tex": SOUVENIR_BOX_ROYAL_TEX
	}
}

## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
const DAIRY_WORKSHOP_TEX := "res://assets/pixel_art/buildings/dairy_workshop.png"
const OPEN_AIR_CINEMA_TEX := "res://assets/pixel_art/buildings/open_air_cinema.png"
const MILK_BOTTLE_TEX := "res://assets/pixel_art/ui/milk_bottle.png"
const CHEESE_WHEEL_TEX := "res://assets/pixel_art/ui/cheese_wheel.png"
const CLOUD_PUDDING_TEX := "res://assets/pixel_art/ui/cloud_pudding.png"
const ICON_MOVIE_TICKET_TEX := "res://assets/pixel_art/ui/icon_movie_ticket.png"
const DAIRY_WORKSHOP_UNLOCK_COST_GOLD := 230
const OPEN_AIR_CINEMA_UNLOCK_COST_GOLD := 260
## Island 1 slot 4 (between `MushroomCottage_1` and `MortarWorkshop_1`) after the CI-11 7-slot re-lay of Island 1:
## the dairy barn joins the meadow farmhouse, every adjacent clear gap on Island 1 is 28.05..28.18px.
const DAIRY_WORKSHOP_SLOT_X := 817.3
## The open-air cinema is a night-only EVENT PROP (not a main building): it stands on the Island 1 east headland,
## the solid grass `[1313..1356]` between the Lotus Pond east bridge (`1302`) and Bridge 2, far from every main building.
const OPEN_AIR_CINEMA_SLOT_X := 1334.5
const OPEN_AIR_CINEMA_SCALE := 0.35
const OPEN_AIR_CINEMA_HEADLAND_MIN_X := 1313.0
const OPEN_AIR_CINEMA_HEADLAND_MAX_X := 1356.0

const DAIRY_MILK_ID := "dairy_milk"
const DAIRY_CODEX_ORDER: Array[String] = [
	"dairy_milk",
	"dairy_cheese",
	"dairy_cloud_pudding"
]
## Products crafted from milk (the active recipe alternates after every craft)
const DAIRY_RECIPE_ORDER: Array[String] = [
	"dairy_cheese",
	"dairy_cloud_pudding"
]
## Milk comes from the existing farm loop: one harvested crop from the field baskets (bunny-farmer harvests) feeds the
## cloud herd for one milking (`2` bottles). With empty baskets the herd only grazes the meadow (`1` bottle, idle fallback).
const DAIRY_FEED_CANDIDATES: Array[String] = ["crop_0", "crop_1", "crop_2", "crop_3"]
const DAIRY_FEED_MILK_YIELD := 2
const DAIRY_GRAZE_MILK_YIELD := 1
const DAIRY_CYCLE_SEC := 7.0
const DAIRY_ITEMS: Dictionary = {
	"dairy_milk": {
		"id": "dairy_milk",
		"name": "云朵鲜奶",
		"short_name": "鲜奶",
		"recipe_desc": "农田收获的鲜草作物饲喂云朵奶牛 · 晨挤鲜奶",
		"milk_cost": 0,
		"sweet_candidates": [],
		"base_gold": 240,
		"rep_bonus": 18,
		"icon_tex": MILK_BOTTLE_TEX
	},
	"dairy_cheese": {
		"id": "dairy_cheese",
		"name": "云顶熟成奶酪",
		"short_name": "奶酪",
		"recipe_desc": "2瓶云朵鲜奶 · 云窖熟成芝士轮",
		"milk_cost": 2,
		"sweet_candidates": [],
		"base_gold": 980,
		"rep_bonus": 45,
		"icon_tex": CHEESE_WHEEL_TEX
	},
	"dairy_cloud_pudding": {
		"id": "dairy_cloud_pudding",
		"name": "云朵焦糖布丁",
		"short_name": "云朵布丁",
		"recipe_desc": "云朵鲜奶 × 金麦粉/红草莓/桂花糕 · 焦糖蒸布丁",
		"milk_cost": 1,
		"sweet_candidates": ["flour_golden_wheat", "crop_1", "delicacy_0", "delicacy_1", "bread_cloud_souffle", "crop_0", "crop_2", "crop_3"],
		"base_gold": 1180,
		"rep_bonus": 55,
		"icon_tex": CLOUD_PUDDING_TEX
	}
}

## Open-air cinema programme: every NIGHT phase (`GameManager.WeatherState.NIGHT`, 42s) runs 3 slots of
## `12s` screening + `2s` intermission (3 x 14s = 42s), one film per slot in this order.
const CINEMA_FILM_ORDER: Array[String] = [
	"film_moon_rabbit_post",
	"film_cloud_whale",
	"film_lighthouse_lights"
]
const CINEMA_FILMS: Dictionary = {
	"film_moon_rabbit_post": {"id": "film_moon_rabbit_post", "name": "《月兔的星空邮差》", "short_name": "星空邮差", "rep_bonus": 30},
	"film_cloud_whale": {"id": "film_cloud_whale", "name": "《云鲸归航》", "short_name": "云鲸归航", "rep_bonus": 36},
	"film_lighthouse_lights": {"id": "film_lighthouse_lights", "name": "《灯塔与渔火》", "short_name": "灯塔渔火", "rep_bonus": 42}
}
const CINEMA_SLOT_SEC := 14.0
const CINEMA_SCREEN_SEC := 12.0
const CINEMA_BASE_AUDIENCE := 8
## CI-2 night market: the `云端花火灯会` lantern festival crowd adds extra cinema-goers
const CINEMA_FESTIVAL_AUDIENCE_BONUS := 4
const CINEMA_TICKET_MIN_GOLD := 24
const CINEMA_TICKET_GPS_SEC := 1.5
## Night-market boost while the cinema is open (night only): every stall sale x1.25, cinema snacks x1.35 at the concession
const CINEMA_NIGHT_SALE_MULT := 1.25
const CINEMA_SNACK_PREMIUM := 1.35
const CINEMA_VISITOR_SPAWN_MULT := 1.6
const CINEMA_SNACK_CANDIDATES: Array[String] = ["dairy_cloud_pudding", "dairy_milk"]

## CI-12: Cloud Pottery Kiln Workshop (`云端陶艺窑坊`) & Islander Autumn Sports Day (`岛民秋季运动会`)
## SPACE DECISION: the fixed `1920x300` desktop strip has only `64px` of sky left of Island 2 and right of Island 3, so a 4th
## islet would sit off-screen at the default `1.0x` view. Instead the kiln takes over Island 3 slot 1 at the Bridge 2 landing,
## the slot the decorative duplicate apple tree used (`AppleTree_1` keeps the island 1 orchard): same `112px` texture width at
## the same `0.39` scale (`43.68px`), so every Island 3 gap stays `28.06px` and the island keeps 6 buildings (19 total).
const POTTERY_KILN_TEX := "res://assets/pixel_art/buildings/pottery_kiln.png"
const CLAY_LUMP_TEX := "res://assets/pixel_art/ui/clay_lump.png"
const CLAY_VASE_TEX := "res://assets/pixel_art/ui/clay_vase.png"
const TEA_BOWL_TEX := "res://assets/pixel_art/ui/tea_bowl.png"
const SPORTS_FLAG_TEX := "res://assets/pixel_art/ui/sports_flag.png"
const GOLD_RIBBON_MEDAL_TEX := "res://assets/pixel_art/ui/gold_ribbon_medal.png"
const POTTERY_KILN_UNLOCK_COST_GOLD := 250
const POTTERY_KILN_SLOT_X := 1437.8
const POTTERY_KILN_SCALE := 0.39

const POTTERY_CLAY_ID := "clay_lump"
const POTTERY_CODEX_ORDER: Array[String] = [
	"clay_lump",
	"pottery_tea_bowl",
	"pottery_vase"
]
## Fired wares (the active recipe alternates after every firing)
const POTTERY_RECIPE_ORDER: Array[String] = [
	"pottery_tea_bowl",
	"pottery_vase"
]
## Clay comes from the existing farm loop: every soil-plot harvest turns up `1` lump of island clay with the furrows
## (bunny farmers till the soil), dropped into the kiln's clay bin once the kiln is built.
const POTTERY_CLAY_PER_HARVEST := 1
## Fuel = dried stalks / husks of `1` harvested crop from the field baskets (then the stall shelf) per firing.
const POTTERY_FUEL_CANDIDATES: Array[String] = ["crop_0", "crop_1", "crop_3", "crop_2"]
const POTTERY_KILN_CYCLE_SEC := 9.0
const POTTERY_ITEMS: Dictionary = {
	"clay_lump": {
		"id": "clay_lump",
		"name": "云岛陶土",
		"short_name": "陶土",
		"recipe_desc": "月兔翻土收获时带出的岛屿陶土 · 进窑坊土仓",
		"clay_cost": 0,
		"base_gold": 120,
		"rep_bonus": 12,
		"icon_tex": CLAY_LUMP_TEX
	},
	"pottery_tea_bowl": {
		"id": "pottery_tea_bowl",
		"name": "云纹手作茶碗",
		"short_name": "茶碗",
		"recipe_desc": "1份陶土 × 1束秸秆柴 · 素烧施釉",
		"clay_cost": 1,
		"base_gold": 860,
		"rep_bonus": 40,
		"icon_tex": TEA_BOWL_TEX
	},
	"pottery_vase": {
		"id": "pottery_vase",
		"name": "青釉云纹陶花瓶",
		"short_name": "陶花瓶",
		"recipe_desc": "2份陶土 × 1束秸秆柴 · 拉坯描青釉",
		"clay_cost": 2,
		"base_gold": 1320,
		"rep_bonus": 55,
		"icon_tex": CLAY_VASE_TEX
	}
}

## Autumn Sports Day: a timed event on the Lotus Pond bridge track (an existing path, no new building).
## `6s` march-in -> 3 mini events x (`12s` + `2s` break) -> `4s` award ceremony on the pond centre pier = `50s`.
const SPORTS_TEAM_ORDER: Array[String] = ["bunny", "otter", "fox", "shiba"]
const SPORTS_TEAM_NAMES: Dictionary = {"bunny": "月兔队", "otter": "水獭队", "fox": "狐狸队", "shiba": "柴犬队"}
const SPORTS_MIN_TEAMS := 2
const SPORTS_EVENT_ORDER: Array[String] = [
	"sports_relay",
	"sports_tug_of_war",
	"sports_harvest_carry"
]
const SPORTS_EVENTS: Dictionary = {
	"sports_relay": {"id": "sports_relay", "name": "荷塘栈桥接力赛", "short_name": "接力赛", "rep_bonus": 30},
	"sports_tug_of_war": {"id": "sports_tug_of_war", "name": "湖心拔河大赛", "short_name": "拔河", "rep_bonus": 36},
	"sports_harvest_carry": {"id": "sports_harvest_carry", "name": "丰收搬运障碍赛", "short_name": "搬运赛", "rep_bonus": 42}
}
## Tug-of-war pulling strength per species (otters & shibas are sturdier than rabbits)
const SPORTS_TUG_STRENGTH: Dictionary = {"bunny": 0.92, "otter": 1.06, "fox": 0.98, "shiba": 1.10}
const SPORTS_PLACEMENT_POINTS: Array[int] = [3, 2, 1, 0]
const SPORTS_GATHER_SEC := 6.0
const SPORTS_EVENT_SEC := 12.0
const SPORTS_BREAK_SEC := 2.0
const SPORTS_AWARD_SEC := 4.0
const SPORTS_FIRST_COOLDOWN_SEC := 75.0
const SPORTS_COOLDOWN_SEC := 210.0
## Spectators lining the pond during the sports day: every stall sale x1.20, visitors arrive x1.5, +1 visitor slot
const SPORTS_SPECTATOR_SALE_MULT := 1.20
const SPORTS_SPECTATOR_SPAWN_MULT := 1.5
## Per-event prize pool (gold) = idle economy gold/s (codex multiplier divided out) x 10s, at least 120G
const SPORTS_PRIZE_GPS_SEC := 10.0
const SPORTS_PRIZE_MIN_GOLD := 120
## Track on the Lotus Pond twin bridges (`[1082..1302]`), finish flags just inside the bridge ends
const SPORTS_TRACK_WEST_X := 1094.0
const SPORTS_TRACK_EAST_X := 1290.0
const SPORTS_TRACK_CENTER_X := 1192.0
const SPORTS_FLAG_WEST_X := 1086.0
const SPORTS_FLAG_EAST_X := 1298.0
const SPORTS_FLAG_SCALE := 0.30
const SPORTS_RUN_SPEED := 120.0

## CI-13: Cloud-Sea Kite Festival (`云海风筝节`) & Island Four-Season Dress-Up (`岛屿四季装扮`) — NO new building.
## The islands are full (7+6+6 = 19 buildings, every scale >= 0.355): kites use the open sky ABOVE Island 2 / Island 3, the
## seasonal props stand in free 28px ground gaps; nothing is shrunk or moved.
const KITE_CARP_TEX := "res://assets/pixel_art/ui/kite_carp.png"
const KITE_BIRD_TEX := "res://assets/pixel_art/ui/kite_bird.png"
const KITE_STAR_TEX := "res://assets/pixel_art/ui/kite_star.png"
const ICON_KITE_FESTIVAL_TEX := "res://assets/pixel_art/ui/icon_kite_festival.png"
const DECO_SPRING_TEX := "res://assets/pixel_art/ui/deco_spring.png"
const DECO_SUMMER_TEX := "res://assets/pixel_art/ui/deco_summer.png"
const DECO_AUTUMN_TEX := "res://assets/pixel_art/ui/deco_autumn.png"
const DECO_WINTER_TEX := "res://assets/pixel_art/ui/deco_winter.png"

## Festival programme: `45s` = 3 gusts x `15s`; returns on its own cooldown (first one after `100s`, then every `240s`)
const KITE_FESTIVAL_SEC := 45.0
const KITE_GUST_SEC := 15.0
const KITE_WIND_BLEND_SEC := 2.0
const KITE_FIRST_COOLDOWN_SEC := 100.0
const KITE_COOLDOWN_SEC := 240.0
const KITE_WIND_LEVELS: Array[Dictionary] = [
	{"id": "breeze", "name": "微风", "strength": 0.35},
	{"id": "fresh", "name": "和风", "strength": 0.60},
	{"id": "gale", "name": "劲风", "strength": 0.90}
]
## Deterministic gust programme per festival (rotates with `kite_festivals_held`): `[wind level idx, direction]` x 3 gusts
## (direction `+1` = blowing east, `-1` = blowing west). No RNG anywhere: replays are identical.
const KITE_WIND_PROGRAMMES: Array = [
	[[1, 1.0], [2, 1.0], [0, -1.0]],
	[[0, -1.0], [1, -1.0], [2, 1.0]],
	[[2, 1.0], [0, 1.0], [1, -1.0]]
]
## Wind buff while the kites fly: production (crop growth + workshop speed) x(1 + 0.25 w), every stall sale x(1 + 0.20 w)
const KITE_WIND_PRODUCTION_PER_STRENGTH := 0.25
const KITE_WIND_SALE_PER_STRENGTH := 0.20
## Kite flight model (pure function of the festival clock): tethered sway around a lane anchor, pushed downwind by the gust
const KITE_SCALE := 0.40
const KITE_TEX_SIZE := 64.0
const KITE_WIND_DRIFT_PX := 26.0
const KITE_SWAY_PX := 5.0
const KITE_SWAY_FREQ := 0.9
const KITE_LIFT_PX := 5.0
const KITE_BOB_PX := 2.5
const KITE_BOB_FREQ := 1.7
## Kite footprint relative to its centre: the `25.6px` sprite (its string and ribbon tails are part of the pixel art) plus a
## `4px` safety margin below it for the bob
const KITE_FOOTPRINT := Rect2(-13.0, -13.0, 26.0, 30.0)
## Sky lanes (local coords of `WorldOffsetRoot`; screen y = local y + 36). West = open sky above Island 2 (below the kite
## badge, above the Island 2 badge row at y >= 44); east = open sky above Island 3, east of the airship's departure point
## (x <= 1542) and above the harbor auction badge (y >= 22.4). Both lanes stay clear of the sky balloon path (x 560..1264),
## the HUD banner / drawer (screen x 480..1440) and the window top (local y -36).
const KITE_LANES: Dictionary = {
	"west": Rect2(110.0, -21.0, 366.0, 51.0),
	"east": Rect2(1555.0, -33.0, 300.0, 51.0)
}
const KITE_SLOTS: Array[Dictionary] = [
	{"kite_id": "kite_carp", "lane": "west", "anchor_x": 170.0, "base_y": 2.0, "phase": 0.0},
	{"kite_id": "kite_bird", "lane": "west", "anchor_x": 300.0, "base_y": 6.0, "phase": 2.1},
	{"kite_id": "kite_star", "lane": "west", "anchor_x": 430.0, "base_y": 1.0, "phase": 4.2},
	{"kite_id": "kite_star", "lane": "east", "anchor_x": 1610.0, "base_y": -11.0, "phase": 1.0},
	{"kite_id": "kite_carp", "lane": "east", "anchor_x": 1705.0, "base_y": -8.0, "phase": 3.1},
	{"kite_id": "kite_bird", "lane": "east", "anchor_x": 1800.0, "base_y": -12.0, "phase": 5.2}
]
const KITE_ORDER: Array[String] = ["kite_carp", "kite_bird", "kite_star"]
## Per-kite rewards: gold = idle gold/s (codex multiplier divided out) x `gold_sec` (at least `KITE_MIN_GOLD`)
const KITE_TYPES: Dictionary = {
	"kite_carp": {"id": "kite_carp", "name": "锦鲤风筝", "short_name": "锦鲤", "tex": KITE_CARP_TEX, "gold_sec": 8.0, "amber": 0, "rep": 18},
	"kite_bird": {"id": "kite_bird", "name": "沙燕风筝", "short_name": "沙燕", "tex": KITE_BIRD_TEX, "gold_sec": 4.0, "amber": 1, "rep": 24},
	"kite_star": {"id": "kite_star", "name": "星辰风筝", "short_name": "星辰", "tex": KITE_STAR_TEX, "gold_sec": 6.0, "amber": 0, "rep": 30}
}
const KITE_MIN_GOLD := 60
## `风筝满天`: all 6 kites of one festival collected -> sweep medal + amber + voucher + reputation
const KITE_SWEEP_AMBER := 2
const KITE_SWEEP_VOUCHERS := 1
const KITE_SWEEP_REP := 60
const KITE_BADGE_POS := Vector2(66.0, -34.0)
const KITE_BADGE_SCALE := 0.66

## Seasons from the LOCAL calendar month (injectable clock). Like `ar-survivor` and `mengling` in this repo we use the
## NORTHERN-HEMISPHERE meteorological seasons: Mar-May spring, Jun-Aug summer, Sep-Nov autumn, Dec-Feb winter (a southern
## hemisphere player sees the opposite season; documented trade-off, the same mapping as the rest of the repo).
const SEASON_ORDER: Array[String] = ["spring", "summer", "autumn", "winter"]
const SEASONS: Dictionary = {
	"spring": {"id": "spring", "name": "春", "full_name": "春樱季", "deco_name": "春樱花丛", "months": [3, 4, 5], "tex": DECO_SPRING_TEX, "tint": Color(1.0, 0.965, 0.985, 1.0), "bonus_type": "crop_growth", "bonus_desc": "农田生长"},
	"summer": {"id": "summer", "name": "夏", "full_name": "夏荷季", "deco_name": "夏日向日葵花箱", "months": [6, 7, 8], "tex": DECO_SUMMER_TEX, "tint": Color(1.0, 1.0, 0.93, 1.0), "bonus_type": "sale_price", "bonus_desc": "集市售价"},
	"autumn": {"id": "autumn", "name": "秋", "full_name": "秋枫季", "deco_name": "秋枫南瓜堆", "months": [9, 10, 11], "tex": DECO_AUTUMN_TEX, "tint": Color(1.0, 0.95, 0.875, 1.0), "bonus_type": "workshop_speed", "bonus_desc": "工坊制作"},
	"winter": {"id": "winter", "name": "冬", "full_name": "冬雪季", "deco_name": "冬日小雪人", "months": [12, 1, 2], "tex": DECO_WINTER_TEX, "tint": Color(0.92, 0.955, 1.0, 1.0), "bonus_type": "tip_bonus", "bonus_desc": "顾客小费"}
}
const SEASON_REFRESH_SEC := 30.0
const SEASON_DECO_SCALE := 0.28
## Each seasonal prop standing on an unlocked island adds +2% to its season's bonus (5 props -> up to +10%)
const SEASON_DECO_BONUS_PER_PROP := 0.02
## Free ground spots = the 28px building gaps that host NO worker rest dock, landscape prop or sports flag (Island 2
## cauldron|greenhouse & windmill|chef, Island 1 cottage|dairy & mortar|tea, Island 3 hot-spring|lighthouse). GEMINI.md Law 3.2:
## each prop stands at its left neighbour's outer edge + 16px (never on a building centre); at <= 17.9px wide it keeps >= 2px
## clear of the right neighbour too.
const SEASON_DECO_EDGE_OFFSET := 16.0
const SEASON_DECO_SPOTS: Array[Dictionary] = [
	{"id": "season_deco_2a", "island": 2, "x": 291.70, "after": "CauldronWorkshop_2"},
	{"id": "season_deco_2b", "island": 2, "x": 435.65, "after": "CloudWindmillBakery_2"},
	{"id": "season_deco_1a", "island": 1, "x": 783.85, "after": "MushroomCottage_1"},
	{"id": "season_deco_1b", "island": 1, "x": 918.72, "after": "MortarWorkshop_1"},
	{"id": "season_deco_3a", "island": 3, "x": 1709.76, "after": "CloudHotspringInn_3"}
]

## CI-14: Cloud-Isle Photo Tour (`云岛观光摄影打卡`) & Islander Wish Board (`岛民心愿委托告示板`) — NO new building.
## The islands are full (7+6+6 = 19 buildings) and every 28px gap already hosts a worker rest dock, a landscape prop or a
## seasonal prop, and Island 3 has no free solid ground at all, so the 3 photo-spot signposts stand on the only free ground
## left next to the named landmarks (measured against the island textures, labels, rest docks and props): the Island 2 east
## terrace under the west kite lane (beside the chef pavilion), the Lotus Pond west bank (beside the stall; at night it frames
## the open-air cinema across the pond) and the Island 1 east-cape cinema lawn facing the lighthouse across the strait (daytime
## only: the night screen unfolds over the whole cape). The Bridge 2 landing was rejected: its deck sags below GROUND_Y, so a
## signpost there would float. Nothing is shrunk or moved.
## The wish board is a HUD panel (tab 2 card -> 3 islander notes), never a scene building.
const ICON_PHOTO_TOUR_TEX := "res://assets/pixel_art/ui/icon_photo_tour.png"
const PHOTO_CARD_TEX := "res://assets/pixel_art/ui/photo_card.png"
const PHOTO_SPOT_MARKER_TEX := "res://assets/pixel_art/ui/photo_spot_marker.png"
const PHOTO_ALBUM_TEX := "res://assets/pixel_art/ui/photo_album.png"
const ICON_WISH_BOARD_TEX := "res://assets/pixel_art/ui/icon_wish_board.png"
const WISH_NOTE_TEX := "res://assets/pixel_art/ui/wish_note.png"
const REPUTATION_STAR_TEX := "res://assets/pixel_art/ui/reputation_star.png"
## The sightseer = the straw-hat cat traveller sheet (2 x 48px frames), holding the pixel camera while posing
const PHOTO_TOURIST_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_mushroom_normalized.png"

## Signposts: solid used-rect of the 64px art (transparent margins cropped) x `0.26` ~= 11 x 16px, bottom-centre on GROUND_Y
const PHOTO_MARKER_SCALE := 0.26
## Tour order = west -> east. `marker_x`: signpost on GROUND_Y (solid island ground); `pose_x` / `facing`: where the sightseer
## stands and where the camera points; `day_only`: the cape lawn is closed while the night cinema screen stands on it.
## Every spot has a normal shot and a special shot (its landmark event running) -> 6 photo-codex entries.
const PHOTO_SPOT_ORDER: Array[String] = ["kite_terrace", "pond_bank", "cape_lawn"]
const PHOTO_SPOTS: Dictionary = {
	"kite_terrace": {"id": "kite_terrace", "name": "风筝晴空台", "short_name": "风筝台", "landmark": "风筝区", "island": 2, "marker_x": 517.0, "pose_x": 516.0, "facing": -1.0, "day_only": false, "normal_id": "photo_kite_sky", "normal_name": "晴空风车", "special_id": "photo_kite_fest", "special_name": "风筝满天", "special_hint": "风筝节"},
	"pond_bank": {"id": "pond_bank", "name": "荷塘观景岸", "short_name": "荷塘岸", "landmark": "荷塘·影院", "island": 1, "marker_x": 1060.0, "pose_x": 1064.0, "facing": 1.0, "day_only": false, "normal_id": "photo_pond_koi", "normal_name": "荷塘锦鲤", "special_id": "photo_pond_cinema", "special_name": "星空影院", "special_hint": "夜市"},
	"cape_lawn": {"id": "cape_lawn", "name": "东岬影院坪", "short_name": "影院坪", "landmark": "灯塔·影院", "island": 1, "marker_x": 1322.0, "pose_x": 1330.0, "facing": 1.0, "day_only": true, "normal_id": "photo_cape_lighthouse", "normal_name": "云海灯塔", "special_id": "photo_cape_airship", "special_name": "飞艇靠港", "special_hint": "飞艇靠港"}
}
## Photo action footprint relative to the posing sightseer's feet (camera held at eye level + flash + the photo card that
## pops out in front of the lens and rises 4px), for `facing = +1` (mirrored for -1). Hand height y in [GROUND_Y-35,
## GROUND_Y-22] = local [89, 102] lies below every world badge label (<= 87.7) and above the props next to the 3 stops
## (signposts >= 108, sports flags >= 104.8, Lv. labels >= 126).
const PHOTO_FX_LOCAL := Rect2(3.0, -35.0, 18.0, 13.0)
const PHOTO_CAMERA_LOCAL := Rect2(3.0, -32.0, 10.0, 10.0)
const PHOTO_CARD_LOCAL := Rect2(12.0, -31.0, 9.0, 9.0)
const PHOTO_CARD_RISE_PX := 4.0
## Tour programme (deterministic state machine advanced by the game clock, no RNG)
const PHOTO_TOUR_FIRST_COOLDOWN_SEC := 70.0
const PHOTO_TOUR_COOLDOWN_SEC := 200.0
const PHOTO_TOUR_RETRY_SEC := 10.0
const PHOTO_TOUR_WALK_SPEED := 34.0
const PHOTO_TOUR_ENTRY_PX := 30.0
const PHOTO_POSE_SEC := 3.2
const PHOTO_SHUTTER_SEC := 1.4
const PHOTO_FLASH_SEC := 0.3
const PHOTO_CARD_FX_SEC := 1.6
const PHOTO_TOUR_VISITOR_SPAWN_MULT := 1.15
## Rewards: gold = idle gold/s (codex multiplier divided out) x seconds; a special shot (landmark event running) pays double
const PHOTO_GOLD_SEC := 5.0
const PHOTO_SPECIAL_GOLD_SEC := 10.0
const PHOTO_MIN_GOLD := 50
const PHOTO_SPECIAL_MIN_GOLD := 100
const PHOTO_REP := 12
const PHOTO_SPECIAL_REP := 28
const PHOTO_FIRST_NORMAL_AMBER := 1
const PHOTO_FIRST_SPECIAL_VOUCHERS := 1
## `打卡集章`: a tour that photographs all 3 spots (Island 2 open, daytime) earns a stamp (+1 voucher, +40 reputation)
const PHOTO_STAMP_MIN_PHOTOS := 3
const PHOTO_STAMP_VOUCHERS := 1
const PHOTO_STAMP_REP := 40
const PHOTO_CODEX_PRICE_PER_ENTRY := 0.02
const PHOTO_CODEX_REP_PER_ENTRY := 15

## Wish board: 3 notes; islanders take turns (fixed order, no RNG). Each islander alternates between 2 favourite wish types
## (delivery wishes `交付` / business-goal wishes `经营`); targets grow by one tier per full islander round (max tier 4).
const WISH_SLOT_COUNT := 3
const WISH_LIFETIME_SEC := 210.0
const WISH_LINGER_SEC := 4.0
const WISH_ISLANDERS: Array[String] = ["bunny", "otter", "fox", "shiba", "penguin", "toucan"]
const WISH_ISLANDER_NAMES: Dictionary = {"bunny": "月兔", "otter": "水獭", "fox": "小狐狸", "shiba": "柴犬", "penguin": "企鹅", "toucan": "巨嘴鸟"}
const WISH_ISLANDER_PREFS: Dictionary = {
	"bunny": ["harvest", "serve"],
	"otter": ["stock", "photo"],
	"fox": ["craft", "earn"],
	"shiba": ["serve", "stock"],
	"penguin": ["craft", "harvest"],
	"toucan": ["photo", "earn"]
}
const WISH_TYPES: Dictionary = {
	"harvest": {"id": "harvest", "kind": "交付", "name": "丰收心愿", "verb": "收获作物", "unit": "份", "base": 10, "step": 4, "rep": 30, "vouchers": 1},
	"stock": {"id": "stock", "kind": "交付", "name": "上架心愿", "verb": "集市上架", "unit": "件", "base": 12, "step": 4, "rep": 32, "vouchers": 1},
	"craft": {"id": "craft", "kind": "交付", "name": "工坊心愿", "verb": "工坊出品", "unit": "件", "base": 4, "step": 2, "rep": 36, "vouchers": 1},
	"serve": {"id": "serve", "kind": "经营", "name": "迎客心愿", "verb": "接待顾客", "unit": "位", "base": 4, "step": 2, "rep": 40, "vouchers": 1},
	"earn": {"id": "earn", "kind": "经营", "name": "营收心愿", "verb": "集市营收", "unit": "G", "base": 300, "step": 0, "gold_sec": 40.0, "rep": 45, "vouchers": 2},
	"photo": {"id": "photo", "kind": "经营", "name": "打卡心愿", "verb": "观光拍照", "unit": "张", "base": 2, "step": 1, "rep": 38, "vouchers": 1}
}
const WISH_TIER_MAX := 4
const WISH_TIER_REP_STEP := 8
## `心愿勋章`: every 6 fulfilled notes (one full islander round) -> +1 voucher, +60 reputation
const WISH_MEDAL_EVERY := 6
const WISH_MEDAL_VOUCHERS := 1
const WISH_MEDAL_REP := 60

## CI-15: Cloud-Sea Weather Rotation (`云海天气轮换`) & Islander Birthday Party (`岛民生日会`) — NO new building, nothing on
## the ground (CI-14's 3 signposts took the last free gaps). The weather lives in the SKY layer only (4 free-sky zones, see
## `SKY_WEATHER_ZONES`); the birthday party is a HUD panel + banners (tab 2 card -> party panel, a cake badge on the tab).
const WEATHER_SUNNY_TEX := "res://assets/pixel_art/ui/weather_sunny.png"
const WEATHER_RAIN_TEX := "res://assets/pixel_art/ui/weather_rain.png"
const WEATHER_RAINBOW_TEX := "res://assets/pixel_art/ui/weather_rainbow.png"
const WEATHER_MIST_TEX := "res://assets/pixel_art/ui/weather_mist.png"
const BIRTHDAY_CAKE_TEX := "res://assets/pixel_art/ui/birthday_cake.png"
const BIRTHDAY_GIFT_TEX := "res://assets/pixel_art/ui/birthday_gift.png"
const ICON_BIRTHDAY_TEX := "res://assets/pixel_art/ui/icon_birthday.png"

## Four cloud-sea weathers. Each one trades something: `visitor` = customer arrival rate, `crop` = soil-plot growth,
## `workshop` = every workshop / kiln / dairy / tea crafting speed, `sale` = market sale price.
const SKY_WEATHER_ORDER: Array[String] = ["sunny", "rain", "rainbow", "mist"]
const SKY_WEATHERS: Dictionary = {
	"sunny": {"id": "sunny", "name": "晴", "full_name": "晴空万里", "tex": WEATHER_SUNNY_TEX, "visitor": 1.10, "crop": 1.10, "workshop": 1.00, "sale": 1.00, "desc": "客流+10% 农田+10%", "tag": "客流+10%"},
	"rain": {"id": "rain", "name": "云雨", "full_name": "云海细雨", "tex": WEATHER_RAIN_TEX, "visitor": 0.85, "crop": 1.25, "workshop": 1.10, "sale": 1.00, "desc": "农田+25% 工坊+10% 客流-15%", "tag": "农田+25%"},
	"rainbow": {"id": "rainbow", "name": "彩虹", "full_name": "雨后彩虹", "tex": WEATHER_RAINBOW_TEX, "visitor": 1.30, "crop": 1.05, "workshop": 1.05, "sale": 1.10, "desc": "客流+30% 售价+10% 产出+5%", "tag": "客流+30%"},
	"mist": {"id": "mist", "name": "薄雾", "full_name": "云海薄雾", "tex": WEATHER_MIST_TEX, "visitor": 0.90, "crop": 1.00, "workshop": 1.15, "sale": 1.05, "desc": "工坊+15% 售价+5% 客流-10%", "tag": "工坊+15%"}
}
## The weather is a pure function of the island calendar (the injectable `GameManager.season_clock`, shared with the CI-13
## seasons): the local day is cut into 20-minute slots; each slot draws sunny / rain / mist from its season's weights with a
## deterministic integer hash (no RNG), and a rainbow only ever appears in the slot right after a rain slot.
const SKY_WEATHER_SLOT_MINUTES := 20
const SKY_WEATHER_REFRESH_SEC := 5.0
const SKY_WEATHER_SEASON_TABLE: Dictionary = {
	"spring": {"sunny": 40, "rain": 35, "mist": 25, "rainbow_after_rain": 0.50},
	"summer": {"sunny": 55, "rain": 30, "mist": 15, "rainbow_after_rain": 0.60},
	"autumn": {"sunny": 40, "rain": 22, "mist": 38, "rainbow_after_rain": 0.40},
	"winter": {"sunny": 35, "rain": 15, "mist": 50, "rainbow_after_rain": 0.25}
}
## Stacking caps (`stack_weather_mult`): a weather BONUS may lift its group only up to the cap and never cuts what the group
## already has; a weather PENALTY (x < 1) always applies in full.
##   production (crop growth / workshop speed): weather x day-cycle drizzle (crops x1.35) x CI-13 season props x kite wind <= x1.50
##   sale price: weather x CI-13 kite wind x summer props <= x1.30
##   visitor arrivals: weather x festivals (x1.85) x night cinema x sports day x photo tour <= x2.20
const SKY_WEATHER_PROD_STACK_CAP := 1.50
const SKY_WEATHER_SALE_STACK_CAP := 1.30
const SKY_WEATHER_VISITOR_STACK_CAP := 2.20
const SKY_WEATHER_CODEX_PRICE_PER_TYPE := 0.02
const SKY_WEATHER_CODEX_REP_PER_TYPE := 15
## Sky-layer zones (local coords of `WorldOffsetRoot`; screen y = local y + 36). The window is 1920x300 and every other piece
## of sky is taken (kite lanes, sky balloon x 560..1264, airship dock -> departure x 1298..1542, the HUD banner / bar / drawer
## x 480..1440, all world badge labels), so the weather is drawn in the 4 free pockets left:
##   sky_west: left of the west kite lane and under the kite-festival badge, above Island 2 (x 6..104)
##   sky_east: right of the east kite lane, beyond Island 3's east shore (x 1860..1916)
##   sea_west / sea_east: the cloud sea under Island 2 / Island 3 (below the island textures, outside the HUD bar x 480..1440)
## The SelfTestRunner checks every zone, emblem and drawn primitive against all reserved areas (assertion 28).
const SKY_WEATHER_ZONES: Array[Dictionary] = [
	{"id": "sky_west", "kind": "sky", "rect": Rect2(6.0, -16.0, 98.0, 60.0)},
	{"id": "sky_east", "kind": "sky", "rect": Rect2(1860.0, -30.0, 56.0, 96.0)},
	{"id": "sea_west", "kind": "sea", "rect": Rect2(14.0, 212.0, 456.0, 46.0)},
	{"id": "sea_east", "kind": "sea", "rect": Rect2(1450.0, 212.0, 456.0, 46.0)}
]
## z: right above `MainWorld`'s own painted sky / island bases (Z_TERRAIN) and below every shadow, building, unit and label
const SKY_WEATHER_Z := -19
const SKY_WEATHER_EMBLEM_PX := 30.0
const SKY_WEATHER_FADE_SEC := 0.8

## Birthday party. The island calendar ("岛历"): one real month = one island year, so each of the 6 wish-board islanders has a
## birthday on a fixed day of EVERY local month (all <= 28, so February works). The party lasts that whole local day.
const BIRTHDAY_DAYS: Dictionary = {"bunny": 3, "otter": 8, "fox": 13, "shiba": 18, "penguin": 23, "toucan": 28}
## Favourite goods: if the market stall has one, it is wrapped into the gift (`称心礼物`, bonus reputation + voucher)
const BIRTHDAY_FAVOURITES: Dictionary = {
	"bunny": {"name": "鲜蔬作物", "cats": ["crop"]},
	"otter": {"name": "海鲜鲜奶", "cats": ["seafood", "dairy"]},
	"fox": {"name": "研钵美食", "cats": ["delicacy"]},
	"shiba": {"name": "烘焙面包", "cats": ["bakery"]},
	"penguin": {"name": "云岛茶饮", "cats": ["tea"]},
	"toucan": {"name": "陶艺花卉", "cats": ["pottery", "flora"]}
}
## Gift box: gold = idle gold/s (codex multiplier divided out) x 30s, at least 150G; one gift per birthday
const BIRTHDAY_GIFT_GOLD_SEC := 30.0
const BIRTHDAY_GIFT_MIN_GOLD := 150
const BIRTHDAY_REP := 50
const BIRTHDAY_VOUCHERS := 1
const BIRTHDAY_FAV_REP := 30
const BIRTHDAY_FAV_VOUCHERS := 1
## `生日全家福`: every full round (all 6 islanders celebrated once more) -> medal +2 vouchers +80 reputation
const BIRTHDAY_MEDAL_REP := 80
const BIRTHDAY_MEDAL_VOUCHERS := 2
const BIRTHDAY_CODEX_PRICE_PER_ISLANDER := 0.01
## HUD cake badge on the Expansion tab button while a birthday gift is waiting (screen coords, inside the tab button)
const BIRTHDAY_BADGE_RECT := Rect2(1240.0, 228.0, 12.0, 12.0)

## CI-16: Cloud-Isle Food Critics' Week (`云岛美食评鉴周`) & Islander Friendship Bonds (`岛民友谊羁绊`) — NO new building, nothing
## on the ground (full) or in the sky (the CI-15 weather owns it): both are HUD panels opened from the Workers tab (cards 7 / 8,
## the 6 islanders ARE the 6 workers) + Shanhai Codex card 18. Icons are copies of existing art until the art debt is paid.
const FOOD_WEEK_JUDGE_TEX := "res://assets/pixel_art/ui/food_week_judge.png"
const FOOD_WEEK_PLATE_TEX := "res://assets/pixel_art/ui/food_week_plate.png"
const FOOD_WEEK_MEDAL_TEX := "res://assets/pixel_art/ui/food_week_medal.png"
const ICON_FRIENDSHIP_TEX := "res://assets/pixel_art/ui/icon_friendship.png"

## Island-calendar week = Monday..Sunday of the injectable `GameManager.season_clock` (CI-13). The 6 wish-board islanders take
## turns as the week's judge (week index mod 6) and each judge has a fixed taste, so the taste rotates with the judge.
const FOOD_TASTE_ORDER: Array[String] = ["sweet", "savory", "fresh"]
const FOOD_TASTES: Dictionary = {
	"sweet": {"id": "sweet", "name": "甜香"},
	"savory": {"id": "savory", "name": "鲜香"},
	"fresh": {"id": "fresh", "name": "清香"}
}
const FOOD_JUDGE_TASTES: Dictionary = {"bunny": "fresh", "otter": "savory", "fox": "sweet", "shiba": "sweet", "penguin": "fresh", "toucan": "savory"}
## The existing dishes that can be entered (crafted / cooked goods only, never raw crops or non-food goods): taste + base score
const FOOD_WEEK_DISHES: Dictionary = {
	"delicacy_0": {"taste": "sweet", "base": 58},
	"delicacy_1": {"taste": "sweet", "base": 60},
	"bread_cloud_souffle": {"taste": "sweet", "base": 62},
	"solar_dish_spring": {"taste": "sweet", "base": 62},
	"dairy_cloud_pudding": {"taste": "sweet", "base": 64},
	"bread_amber_croissant": {"taste": "sweet", "base": 66},
	"solar_dish_winter": {"taste": "sweet", "base": 70},
	"dairy_cheese": {"taste": "savory", "base": 60},
	"solar_dish_autumn": {"taste": "savory", "base": 66},
	"dish_cloud_dumplings": {"taste": "savory", "base": 70},
	"delicacy_3": {"taste": "savory", "base": 72},
	"dish_starlight_fish": {"taste": "savory", "base": 74},
	"dish_mountain_sea_hotpot": {"taste": "savory", "base": 78},
	"dairy_milk": {"taste": "fresh", "base": 54},
	"delicacy_2": {"taste": "fresh", "base": 64},
	"tea_cloud_longjing": {"taste": "fresh", "base": 64},
	"solar_dish_summer": {"taste": "fresh", "base": 66},
	"tea_osmanthus_oolong": {"taste": "fresh", "base": 68}
}
## Score = dish base + 20 when it matches the judge's taste + 2 per friendship level with the judge, capped at 100
const FOOD_WEEK_TASTE_BONUS := 20
const FOOD_WEEK_FRIEND_BONUS_PER_LEVEL := 2
const FOOD_WEEK_SCORE_CAP := 100
## 3 entries per week (3 different dishes, 1 piece each from the market shelf)
const FOOD_WEEK_ENTRIES := 3
## Medal of the week = tier of the best entry (bronze >= 70, silver >= 82, gold >= 92); each tier pays out once per week
const FOOD_WEEK_MEDAL_ORDER: Array[String] = ["bronze", "silver", "gold"]
const FOOD_WEEK_MEDALS: Dictionary = {
	"bronze": {"id": "bronze", "name": "铜奖", "min": 70, "rep": 20, "vouchers": 0},
	"silver": {"id": "silver", "name": "银奖", "min": 82, "rep": 40, "vouchers": 1},
	"gold": {"id": "gold", "name": "金奖", "min": 92, "rep": 80, "vouchers": 2}
}
## Every entry: reputation = score / 4
const FOOD_WEEK_REP_DIV := 4

## Friendship bonds with the 6 islanders, earned only from real events (never bought): a fulfilled wish note of that islander,
## a birthday gift to that islander (+ favourite gift), a food-week entry judged by that islander (+ taste match).
const FRIEND_WISH_POINTS := 12
const FRIEND_BIRTHDAY_POINTS := 30
const FRIEND_BIRTHDAY_FAV_POINTS := 15
const FRIEND_FOOD_POINTS := 8
const FRIEND_FOOD_MATCH_POINTS := 8
## Level thresholds (Lv.0..Lv.5); points stop at the Lv.5 threshold
const FRIEND_LEVEL_POINTS: Array[int] = [0, 30, 80, 150, 240, 360]
const FRIEND_MAX_LEVEL := 5
## Permanent bonus: market sale price +0.3% per friendship level (6 islanders x Lv.5 = 30 levels -> capped at +9%)
const FRIEND_PRICE_PER_LEVEL := 0.003
const FRIEND_PRICE_CAP := 0.09

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
	"tea_pavilion": {"name": "云端茗香制茶坊", "desc": "杀青春芽慢沏龙井乌龙 · 茗香清心光环效率&小费增益", "base_cost": 185, "base_value": 150, "island": 1},
	"chef_pavilion": {"name": "山海食神品鉴席", "desc": "三岛食材组合烹制特级名菜 · 品鉴挑战赢食神勋章", "base_cost": 260, "base_value": 210, "island": 2},
	"lighthouse_harbor": {"name": "云海灯塔渔港", "desc": "双渔船轮班出海捕鲜货 · 供应品鉴席与集市 · 名物拍卖会", "base_cost": 280, "base_value": 230, "island": 3},
	"dairy_workshop": {"name": "云端牧场乳品工坊", "desc": "鲜草饲喂挤云朵鲜奶 · 熟成奶酪与云朵布丁供应集市与品鉴席", "base_cost": 230, "base_value": 175, "island": 1},
	"pottery_kiln": {"name": "云端陶艺窑坊", "desc": "收获陶土+秸秆柴烧制茶碗/陶花瓶 · 供应集市与伴手礼盒", "base_cost": 240, "base_value": 185, "island": 3}
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
		"x_pos": 619.8,
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
		"x_pos": 127.2,
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
		"x_pos": 1777.0,
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
	var t_name := tr_name(String(t_cfg.get("name", "专精")))
	var tiers := get_animal_trait_tier_count(level)
	if tiers <= 0:
		return tr_fmt("ui_trait_locked", [t_name])
	var roman: String = String(["I", "II", "III"][clampi(tiers - 1, 0, 2)])
	# en: `★Green Paw III`, not `★Green PawIII` (zh / ja glue the numeral to the CJK name as before)
	return "★" + t_name + (" " if current_lang == "en_US" else "") + roman

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
	var short_name := tr_name(String(a_cfg.get("name", animal_key))).split(" · ")[0]
	var t_cfg: Dictionary = ANIMAL_TRAITS.get(animal_key, ANIMAL_TRAITS["bunny"])
	var next_lv := 10 if tier == 0 else (25 if tier == 1 else (50 if tier == 2 else 50))
	return {
		"animal_key": animal_key,
		"short_name": short_name,
		"level": lv,
		"tier": tier,
		"tier_title": String(tier_cfg.get(title_key, "见习萌芽")),
		"trait_name": tr_name(String(t_cfg.get("name", "专精"))),
		"trait_desc": tr_name(String(t_cfg.get("desc", ""))),
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
	"ach_moon_tea_gathering": {"id": "ach_moon_tea_gathering", "name": "月色画舫雅集", "desc": "荷塘月色画舫茶会期间品茗领赏或接待第 1 位雅集茶客"},
	"ach_wish_lantern": {"id": "ach_wish_lantern", "name": "星灯祈愿者", "desc": "云海星灯祈愿水灯节期间在荷塘或海岸拾取第 1 盏祈愿水灯"},
	"ach_chef_medal": {"id": "ach_chef_medal", "name": "山海特级食神", "desc": "通过山海食神品鉴席全部 3 道特级名菜品鉴挑战并荣获食神勋章"},
	"ach_lighthouse_harbor": {"id": "ach_lighthouse_harbor", "name": "灯塔渔港满载", "desc": "云海灯塔渔港的渔船出海归港，卸下第 1 份云海鲜渔获"},
	"ach_auction_gavel": {"id": "ach_auction_gavel", "name": "名物拍卖金槌", "desc": "在一场岛民名物集市拍卖会上拍下全部 3 件名物，荣获金槌勋章"},
	"ach_dairy_ranch": {"id": "ach_dairy_ranch", "name": "云端牧场主", "desc": "点亮云端牧场乳品工坊全部 3 款乳品(云朵鲜奶/熟成奶酪/云朵布丁)"},
	"ach_starry_cinema": {"id": "ach_starry_cinema", "name": "星空影迷", "desc": "星空夜市露天电影院一夜连映 3 部影片，荣获星空影迷勋章"},
	"ach_pottery_kiln": {"id": "ach_pottery_kiln", "name": "云端窑主", "desc": "点亮云端陶艺窑坊全部 3 款陶艺(云岛陶土/云纹茶碗/青釉陶花瓶)"},
	"ach_sports_champion": {"id": "ach_sports_champion", "name": "金丝带冠军", "desc": "办完一届岛民秋季运动会全部 3 项比赛，为冠军队颁发金丝带奖牌"},
	"ach_kite_sweep": {"id": "ach_kite_sweep", "name": "风筝满天", "desc": "在一届云海风筝节上收下全部 6 只像素风筝，荣获风筝满天勋章"},
	"ach_four_seasons": {"id": "ach_four_seasons", "name": "四季岛主", "desc": "按真实月份见证岛屿春夏秋冬四季装扮全部 4 种"},
	"ach_photo_stamp": {"id": "ach_photo_stamp", "name": "云岛摄影师", "desc": "跟随一趟观光摄影团在 3 处以上景点打卡拍照，集齐打卡章"},
	"ach_wish_keeper": {"id": "ach_wish_keeper", "name": "心愿守护者", "desc": "为岛民圆梦 6 张心愿委托便签，荣获心愿勋章"},
	"ach_weather_watcher": {"id": "ach_weather_watcher", "name": "云海观天师", "desc": "按岛历见证云海晴 / 云雨 / 彩虹 / 薄雾全部 4 种天气"},
	"ach_birthday_family": {"id": "ach_birthday_family", "name": "生日全家福", "desc": "为 6 位岛民各办一次生日会，荣获生日全家福勋章"}
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
		"drawer_build": "【建筑升级】陶窑·乳坊·渔港·食神席·茶坊·温室·温泉·风车·25级蜕变!",
		"drawer_animal": "【动物编制与特质】点击摸头加速 · Lv.10/25/50激活专精特质!",
		"drawer_expand": "【开拓与节庆坊】木桥远洋·十一项节庆·观光团·心愿板·云海天气·生日会!",
		"drawer_codex": "【山海图鉴】已点亮 %d/8 种食材料理 · 永久售价 +%d%%!",
		"drawer_codex_full": "【山海图鉴】料理 %d/8 · 节气 %d/4(%s) · 图鉴券 %d · 勋章 %d/%d",
		"drawer_codex_ci5": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·勋章 %d/%d",
		"drawer_codex_ci6": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·勋%d/%d",
		"drawer_codex_ci7": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·勋%d/%d",
		"drawer_codex_ci8": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·勋%d/%d",
		"drawer_codex_ci9": "【山海图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·勋%d/%d",
		"drawer_codex_ci10": "【图鉴】食%d/8·节%d/4(%s)·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·拍%d/3·勋%d/%d",
		"drawer_codex_ci11": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·拍%d/3·乳%d/3·影%d/3·勋%d/%d",
		"drawer_codex_ci12": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·拍%d/3·乳%d/3·影%d/3·陶%d/3·运%d/3·勋%d/%d",
		"drawer_codex_ci13": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3\n拍%d/3·乳%d/3·影%d/3·陶%d/3·运%d/3·筝%d/3·季%d/4·勋%d/%d",
		"drawer_codex_ci14": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3\n拍%d/3·乳%d/3·影%d/3·陶%d/3·运%d/3·筝%d/3·季%d/4·摄%d/6·勋%d/%d",
		"drawer_wish_board": "【心愿告示板】每圆梦 %d 张得 1 枚心愿勋章",
		"drawer_codex_ci15": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·拍%d/3
乳%d/3·影%d/3·陶%d/3·运%d/3·筝%d/3·季%d/4·摄%d/6·天%d/4·寿%d/6·勋%d/%d",
		"drawer_birthday": "【岛民生日会】岛历每月 3/8/13/18/23/28 日过生日",
		"medal_prog": "勋章 %d/%d",
		"bn_kite_start": "★云海风筝节开幕！%d 只像素风筝飞上西岛/东岛上空 · 点击收风筝 · %s助力产销!",
		"bn_kite_swept": "★风筝满天！本届收下全部 %d 只风筝 · 勋章 x%d",
		"bn_kite_end": "★云海风筝节落幕 · 本届收下 %d/%d 只风筝 · 下届 %ds 后",
		"bn_season": "★岛屿换上%s装扮【%s】· %s +%d%%",
		"ui_weather_mult": "客流x%.2f 农田x%.2f 工坊x%.2f 售价x%.2f",
		"bn_sky_weather": "★云海天气转为【%s】%s · 每 %d 分钟一轮",
		"bn_bday_gift": "★%s收到生日礼物! 声望+%d 图鉴券+%d%s%s",
		"bn_bday_gift_fav": " · 称心礼物【%s】",
		"bn_bday_gift_medal": " ★生日全家福!",
		"bn_photo_start": "★观光摄影团出发! %d 处打卡: %s · 客流x%s",
		"bn_photo_first_amber": " · 首拍+%d琥珀",
		"bn_photo_first_voucher": " · 绝景首拍+%d图鉴券",
		"bn_photo_taken": "%s【%s】收入摄影图鉴 +%dG%s",
		"bn_photo_special": "★绝景! ",
		"bn_photo_click": "咔嚓! ",
		"bn_photo_end_stamp": "★观光团满载而归! 拍下 %d 张 · 打卡集章 x%d +%d图鉴券",
		"bn_photo_end": "★观光团返程 · 拍下 %d 张 (一趟拍满 %d 张可集章)",
		"bn_wish_done": "★%s的%s圆梦! 声望+%d 图鉴券+%d%s",
		"bn_wish_medal": " ★心愿勋章!",
		"bn_kiln_open": "★云端陶艺窑坊点火！月兔收获翻出的陶土 + 秸秆柴烧制云纹茶碗/青釉陶花瓶 · 供应集市与伴手礼盒!",
		"bn_sports_start": "★岛民秋季运动会开幕！%d 支队伍登上荷塘栈桥赛道 · 接力/拔河/搬运三项比赛 · 观赛人潮售价 %sx!",
		"bn_sports_event": "★运动会%s名次: %s · 奖金 +%dG · 运动会鉴 %d/3",
		"bn_sports_end": "★秋季运动会闭幕！总冠军【%s】荣获金丝带奖牌 x%d · 冠军干劲加速 · +琥珀 +图鉴券!",
		"bn_dairy_open": "★云端牧场乳品工坊落成！农田收获的鲜草喂云朵奶牛挤鲜奶 · 熟成奶酪与云朵布丁供应集市与食神品鉴席!",
		"bn_cinema_open": "★星空夜市露天电影院搭好银幕！每到夜市连映 3 部电影 · 售影票与影院零食 · 夜市售价 %sx!",
		"bn_cinema_film": "★露天电影%s散场 · 观众 %d 位 · 影票 +%dG%s · 星空影院鉴 %d/3",
		"bn_seg_snack": " · 零食 +%dG",
		"bn_cinema_medal": "★一夜连映 3 部露天电影！荣获【星空影迷勋章】x%d · +琥珀 +图鉴券!",
		"bn_harbor_open": "★云海灯塔渔港点灯！两艘渔船轮班出海 · 鲜渔获供应集市与食神品鉴席 · 名物拍卖会即将开槌!",
		"bn_auction_start": "★岛民名物集市拍卖会开槌 (%d件)！首拍【%s】起拍 %d%s · 点灯塔或拍卖卡出价!",
		"ui_cur_amber": "珀",
		"bn_auction_won": "★落槌！你以 %d%s 拍下【%s】· 名物热卖 %sx · 名物拍卖鉴 %d/3",
		"bn_auction_lost": "落槌:【%s】被%s以 %d%s 拍走 · 下一件马上开拍!",
		"bn_auction_pass": "【%s】流拍",
		"bn_auction_end": "★名物拍卖会落幕：拍得 %d/3 件名物%s",
		"bn_auction_end_gavel": " · 荣获【名物金槌勋章】!",
		"bn_auction_end_next": " · 下一场 %ds 后开槌",
		"bn_lantern_start": "★云海星灯祈愿水灯节开幕 (%ds)！荷塘与海岸漂来祈愿水灯 · 点击拾灯许愿得琥珀与图鉴券 · 售价 1.30x!",
		"bn_lantern_claim": "★星灯祈愿 #%d: +%dG +%d琥珀 +%d图鉴券%s",
		"bn_lantern_granted": " · 祈愿成真! 水灯节延长6s",
		"bn_tasting_unlock": "★山海食神品鉴席新菜谱【%s】解锁 · 组合三岛食材烹制特级名菜!",
		"bn_tasting_pass": "★品鉴通过【%s】%d分: +%dG +%d琥珀%s · 食神鉴 %d/3",
		"bn_seg_voucher": " +%d图鉴券",
		"bn_seg_amber": " +%d琥珀",
		"bn_tasting_fail": "品鉴未达标【%s】%d/%d分 · 升级品鉴席或在星灯水灯节期间品鉴可加分!",
		"bn_chef_medal": "★三道山海特级名菜全部品鉴通过！荣获【山海食神勋章】x%d · 山海图鉴第11卡点亮!",
		"bn_tea_unlock": "★云端茗香茶坊秘谱点亮！解锁【%s】· 茗香清心光环与山海图鉴售价提升!",
		"bn_moontea_start": "★荷塘月色画舫品茗雅集开幕 (%ds)！茗茶与佳肴售价 1.38x · 点击荷塘画舫领雅赏!",
		"bn_moontea_settle": "★月色画舫品茗【%s】: %s+%d琥珀%s · 声望+%d!",
		"bn_bakery_unlock": "★云端风车面坊秘方突破！点亮【%s】· 麦香烘焙光环与山海图鉴售价提升!",
		"bn_parade_start": "★云海美食花车巡游节盛大开启 (%ds)！巡游食客高溢价(1.75x~1.90x)抢购鲜烤欧包可颂!",
		"bn_parade_settle": "★巡游食客品享鲜烤【%s】: +%dG +%d琥珀%s · 声望+%d!",
		"bn_spa_unlock": "★云海温泉汤屋秘方突破！解锁疗愈浴汤【%s】· 全员精力光环与图鉴加成提升!",
		"bn_spa_settle": "★贵宾汤客泡享【%s】满意结算: +%dG +%d琥珀%s · 声望+%d!",
		"bn_flora_unlock": "★云端温室杂交突破！成功培育珍稀奇花【%s】· 岛屿光环与图鉴售价提升!",
		"bn_souvenir_sold": "★收藏家旅客选购【%s】！收获 +%dG · +%d琥珀 · 声望+%d!",
		"bn_airship_done": "★远洋飞艇商队大订单结清！收获 +%dG · +%d晨露琥珀 · +%d稀有图鉴券!",
		"bn_solar_term": "★节气流转至【%s】· 当季限定【%s】售价1.45x · %s",
		"bn_acclaim": "★美食评论家盛赞！「金牌口碑」激活 %ds: 全岛商品售价+25%% & 小费+20%%!",
		"bn_fireworks": "★云端花火灯会开启 (%ds)！彩灯高悬、客流涌动，富豪与特殊行商到访率大幅提升!",
		"bn_pomodoro": "★专注达成！开启「★专注晨露礼盒」: 获得 +%dG & 全岛2.0x狂欢加速 %ds!",
		"ui_dur_hm": "%d小时%d分",
		"ui_dur_ms": "%d分%d秒",
		"ui_dur_s": "%d秒",
		"bn_offline": "★欢迎归来！离线 %s · 收获 %d 件 · 自动创收 +%dG (图鉴+%d%%)",
		"bn_emp_info": "%s (%s) · 特质【%s】%s · 勋章 %d/3 (Lv.10/25/50晋升)",
		"bn_bday_today": "★今天是%s的生日! 去【开拓造景】生日会备礼 · 得声望与图鉴券",
		"ui_mute": "[静音]",
		"ui_sound": "[音效]",
		"ui_focus25": "[专注25m]",
		"ui_noise_off": "[白噪:关]",
		"ui_noise_on": "[白噪:%s]",
		"ui_opacity": "[%d%%透]",
		"ui_dock": "[贴合任务栏]",
		"ui_bar_voucher": "券%d",
		"ui_bar_amber": "·珀%d",
		"ui_w_day": "晴昼",
		"ui_w_dusk": "黄昏",
		"ui_w_night": "夜市",
		"ui_w_rain": "微雨",
		"ui_w_lantern": "星灯节",
		"ui_w_moontea": "画舫茶",
		"ui_w_parade": "花车节",
		"ui_w_cinema": "影院夜",
		"ui_w_fireworks": "花火夜",
		"ui_w_acclaim": "口碑%s",
		"ui_cap_stealth": "后台挂机产金中 · 按F9或点击恢复",
		"ui_cap_restore": "[恢复]",
		"ui_cap_focus": "专注%s · ",
		"ui_cap_contract": "契约:%s%d/%d · 悬停展开",
		"ui_bar_contract": "契约:%s %d/%d(+%d珀)",
		"ui_bar_stall": "存%d · 摊%d/%d · 图鉴+%d%%",
		"ui_emp_none": " (未招募)",
		"ui_trait_locked": "Lv.10解锁[%s]",
		"ui_date_md": "%d月%d日",
		"cd_suffix_locked": " (未解锁)",
		"cd_b_next_ms": "下个2x蜕变: Lv.%d",
		"cd_b_need_isle": "需先开拓木桥解锁岛%d",
		"cd_upgrade": "升级 %dG",
		"cd_isle_locked": "待解锁岛屿",
		"cd_build": "建造 %dG",
		"cd_need_bridge1": "需先开拓木桥1解锁岛2",
		"cd_need_bridge1b": "需开拓木桥1解锁岛2",
		"cd_need_bridge2": "需开拓木桥2解锁岛3",
		"cd_gh_locked": "云端温室 (锁岛2)",
		"cd_gh_new": "云端温室 (待建)",
		"cd_gh_sub": "杂交奇花+全岛增益光环",
		"cd_gh_lv": "云端温室 Lv.%d",
		"cd_gh_sub_lv": "育%s · 奇花存%d",
		"cd_hs_locked": "云海汤屋 (锁岛3)",
		"cd_hs_new": "云海汤屋 (待建)",
		"cd_hs_sub": "熬汤回精力+引汤客",
		"cd_hs_lv": "云海汤屋 Lv.%d",
		"cd_hs_sub_lv": "熬%s·汤存%d",
		"cd_wm_locked": "风车面坊 (锁岛2)",
		"cd_wm_new": "风车面坊 (待建)",
		"cd_wm_sub": "磨麦烤包+烘焙光环",
		"cd_wm_lv": "风车面坊 Lv.%d",
		"cd_wm_sub_lv": "烤%s·包%d",
		"cd_tp_new": "茗香茶坊 (待建)",
		"cd_tp_sub": "制芽泡茗+清心光环",
		"cd_tp_lv": "茗香茶坊 Lv.%d",
		"cd_tp_sub_lv": "沏%s·茗%d",
		"cd_cp_locked": "食神品鉴席(锁岛2)",
		"cd_cp_new": "食神品鉴席(待建)",
		"cd_cp_sub": "三岛食材烹特级名菜",
		"cd_cp_lv": "食神品鉴席 Lv.%d",
		"cd_cp_sub_lv": "烹%s·肴%d",
		"cd_lh_locked": "灯塔渔港(锁岛3)",
		"cd_lh_new": "灯塔渔港(待建)",
		"cd_lh_sub": "双渔船出海捕鲜货",
		"cd_lh_lv": "灯塔渔港 Lv.%d",
		"cd_lh_sub_lv": "鲜%d·捕%d",
		"cd_dw_new": "乳品工坊(待建)",
		"cd_dw_sub": "鲜奶·奶酪·布丁",
		"cd_dw_lv": "乳品工坊 Lv.%d",
		"cd_dw_sub_lv": "奶%d·酪%d·布%d",
		"cd_pk_new": "陶艺窑坊(待建)",
		"cd_pk_sub": "茶碗·陶花瓶",
		"cd_pk_need_isle3": "需开拓岛3",
		"cd_pk_isle3_closed": "岛3未开",
		"cd_pk_lv": "陶艺窑坊 Lv.%d",
		"cd_pk_sub_lv": "土%d·碗%d·瓶%d",
		"cd_a_need_isle": "需先解锁新岛屿",
		"cd_a_crew": "编制 %d/%d · %s",
		"cd_a_hire": "招募 %dG",
		"cd_a_train": "全队进修 Lv.+1 (%dG)",
		"cd_e_bridge1": "木桥1·魔法密林",
		"cd_e_bridge1_sub": "2x农田+12x坩埚",
		"cd_e_bridge2": "木桥2·天空海岸",
		"cd_e_bridge2_sub": "双工坊52x·富豪2x",
		"cd_unlocked": "已解锁",
		"cd_unlock_g": "%dG 解锁",
		"cd_need_isle_n": "需先解锁岛屿%d",
		"cd_lit_active": "已点亮生效",
		"cd_amber_unlock": "%d 琥珀 解锁",
		"ui_lb_crop": "农田生长",
		"ui_lb_workshop": "工坊速度",
		"ui_lb_tip": "全岛小费",
		"ui_lb_buff": "增益",
		"cd_air_title": "★远洋订单#%d",
		"cd_air_sub": "备货%d/%d",
		"cd_air_cost": "装船+%s珀+%s券",
		"cd_air_away": "★远洋商队航行中",
		"cd_air_away_sub": "备齐四时料理",
		"cd_air_eta": "约 %ds 后抵港",
		"cd_sv_title": "★名物伴手礼坊",
		"cd_sv_sub": "打礼盒引收藏家",
		"cd_sv_build": "%dG 建温室",
		"cd_need_isle2": "需先解锁岛2",
		"cd_need_isle3": "需先解锁岛3",
		"cd_sv_title_lv": "★名物礼盒(存%d)",
		"cd_sv_sub_lv": "奇花x%d·已售%d盒",
		"cd_sv_cost": "打包(+珀+声望)",
		"cd_hb_title": "★云海温泉汤屋",
		"cd_hb_sub": "花汤·引贵宾汤客",
		"cd_hb_build": "%dG 建汤屋",
		"cd_hb_title_lv": "★温泉汤屋(汤%d)",
		"cd_hb_sub_lv": "精力+%d%%·客%d",
		"cd_hb_cost": "调汤(+珀+小费)",
		"cd_wp_title": "★风车烘焙面坊",
		"cd_wp_sub": "烤包·花车巡游",
		"cd_wp_build": "%dG 建面坊",
		"cd_wp_title_on": "★花车巡游(%ds)",
		"cd_wp_sub_on": "包x%d·溢价1.88x",
		"cd_wp_cost_on": "烤包(+珀+券)",
		"cd_wp_title_lv": "★烘焙面坊(包%d)",
		"cd_wp_sub_lv": "光环+%d%%·客%d",
		"cd_wp_cost_lv": "开启花车巡游节!",
		"cd_tm_title": "★茗香画舫茶会",
		"cd_tm_sub": "龙井乌龙·画舫",
		"cd_tm_build": "%dG 建茶坊",
		"cd_tm_title_on": "★画舫雅集(%ds)",
		"cd_tm_sub_on": "茗x%d·茶肴1.38x",
		"cd_tm_cost_on": "沏茶(+珀+券)",
		"cd_tm_title_lv": "★茗香茶坊(茗%d)",
		"cd_tm_sub_lv": "清心+%d%%·客%d",
		"cd_tm_cost_lv": "开启画舫雅集!",
		"cd_wl_title_on": "★星灯节(%ds)",
		"cd_wl_sub_on": "拾灯%d·售价1.30x",
		"cd_wl_cost_on": "点水灯得珀+券",
		"cd_wl_title": "★星灯水灯节",
		"cd_wl_sub": "放水灯·拾灯%d",
		"cd_wl_cost": "开启星灯水灯节!",
		"cd_au_title": "★名物拍卖会",
		"cd_au_sub_locked": "建灯塔渔港开槌",
		"cd_au_need_harbor": "需灯塔渔港",
		"cd_au_open": "待出价",
		"cd_au_you_lead": "你领先",
		"cd_au_lead": "%s领先",
		"cd_au_title_on": "★拍卖%d/%d(%ds)",
		"cd_au_leading": "领先中",
		"cd_au_bid": "出价 %d%s",
		"cd_au_sub_idle": "藏品%d·金槌%d",
		"cd_au_cost_idle": "开槌拍卖!",
		"cd_cin_title": "★星空露天影院",
		"cd_cin_sub": "夜场放映·引客",
		"cd_cin_build": "%dG 搭银幕",
		"cd_cin_title_on": "★放映%d/%d(%ds)",
		"cd_cin_sub_on": "%s·客%d",
		"cd_cin_cost_on": "票%dG·售价%sx",
		"cd_cin_title_open": "★夜市影院",
		"cd_cin_sub_open": "今夜已映%d/3",
		"cd_cin_cost_open": "叫卖影院零食",
		"cd_cin_title_idle": "★露天影院",
		"cd_cin_sub_idle": "影票%d·勋%d",
		"cd_cin_cost_idle": "%ds 后入夜开映",
		"cd_sp_gather": "★运动会·入场",
		"cd_sp_award": "★金丝带颁奖",
		"cd_sp_sub_on": "%d队·余%ds",
		"cd_sp_cost_on": "观赛售价%sx",
		"cd_sp_title": "★秋季运动会",
		"cd_sp_sub_need": "岛1需2种员工",
		"cd_sp_cost_need": "现有%d队",
		"cd_sp_sub_idle": "%d队·金丝带%d",
		"cd_sp_cost_idle": "立即开幕!",
		"cd_kt_title_on": "★风筝节·%s",
		"cd_kt_sub_on": "筝%d/%d·余%ds",
		"cd_kt_cost_on": "产x%.2f 售x%.2f",
		"cd_kt_title": "★云海风筝节",
		"cd_kt_sub": "满天勋%d·%ds后",
		"cd_kt_cost": "立即放飞!",
		"cd_ss_title": "★%s装扮",
		"cd_pt_title_on": "★观光团%d/%d",
		"cd_pt_sub_on": "照%d·%s",
		"cd_pt_return": "返程",
		"cd_pt_cost_on": "客流x%s",
		"cd_pt_title": "★观光摄影团",
		"cd_pt_sub": "章%d·%ds后",
		"cd_pt_cost": "立即出发!",
		"cd_wb_title": "★心愿告示板",
		"cd_wb_sub": "便签%d/%d·圆%d",
		"cd_wb_cost": "声望%d·券%d",
		"cd_sw_title": "★云海%s",
		"cd_sw_cost": "%d分后换天",
		"cd_bd_title": "★%s生日",
		"cd_bd_given": "已备礼·谢谢!",
		"cd_bd_parties": "庆生%d次",
		"cd_bd_gift_cost": "备礼%dG",
		"cd_bd_go": "去庆生!",
		"cd_bd_card_title": "★岛民生日会",
		"cd_bd_next": "下位%s",
		"cd_bd_days": "%d天后",
		"cd_back_list": "返回开拓列表",
		"cx_tier1": "一阶·晨露田园",
		"cx_tier2": "二阶·果香烘焙",
		"cx_tier3": "三阶·密林星露",
		"cx_tier4": "四阶·云海盛宴",
		"cx_unk_crop": "???(待锁)",
		"cx_unk_dish": "???(待研)",
		"cx_pair_cost": "点亮%d/2·+%d%%",
		"cx_ach_title": "★成就看板(%d/%d)",
		"cx_ach_cost": "岛屿声望 ★%d星",
		"cx_career_sub": "收%d·制%d·客%d·契%d",
		"cx_solar_recipe": "兑食谱·券x%d",
		"cx_solar_perk": "兑礼遇·券x%d",
		"cx_solar_cnt": "节气 %d/4",
		"cx_solar_title": "★节气:%s(%d/4)",
		"cx_flora_title": "★奇花礼盒(%d/2·%d/2)",
		"cx_flora_sub": "育%s·礼存%d盒",
		"cx_flora_locked": "建岛2温室育奇花",
		"cx_flora_cost": "售价+%d%%",
		"cx_spa_title": "★灵泉汤鉴(%d/3)",
		"cx_spa_sub": "汤:%s·客%d",
		"cx_spa_locked": "建岛3汤屋调药浴",
		"cx_cost_price_eff": "+%d%%价·+%d%%效",
		"cx_bak_title": "★云端烘焙鉴(%d/3)",
		"cx_bak_sub": "烤:%s·客%d",
		"cx_bak_locked": "建岛2面坊烤欧包",
		"cx_cost_price_spd": "+%d%%价·+%d%%速",
		"cx_tea_title": "★茗香茶韵鉴(%d/3)",
		"cx_tea_sub": "沏:%s·客%d",
		"cx_tea_locked": "建岛1茶坊沏香茗",
		"cx_chef_title": "★山海食神鉴(%d/3)",
		"cx_chef_sub": "宴:%s·鉴%d",
		"cx_chef_locked": "建岛2食神席烹名菜",
		"cx_cost_price_medal": "+%d%%价·勋%d",
		"cx_auc_title": "★名物拍卖鉴(%d/3)",
		"cx_auc_sub": "藏%d·鲜%d",
		"cx_auc_locked": "建岛3灯塔渔港",
		"cx_cost_price_gavel": "+%d%%价·槌%d",
		"cx_cin_title": "★星空影院鉴(%d/3)",
		"cx_cin_sub": "乳%d/3·票%d",
		"cx_cin_locked": "建乳坊与露天影院",
		"cx_sp_title": "★秋季运动会鉴(%d/3)",
		"cx_sp_sub": "陶%d/3·赛%d",
		"cx_sp_locked": "建陶窑办运动会",
		"cx_cost_price_ribbon": "+%d%%价·带%d",
		"cx_kt_title": "★云海风筝鉴(%d/3)",
		"cx_kt_sub": "季%d/4·收筝%d",
		"cx_cost_price_full": "+%d%%价·满%d",
		"cx_pt_title": "★观光摄影鉴(%d/%d)",
		"cx_pt_sub": "章%d·拍%d张",
		"cx_cost_price_wish": "+%d%%价·愿%d",
		"cx_sw_title": "★云海天气(%d/%d)",
		"cx_sw_sub": "寿%d/%d·庆%d",
		"cx_cost_price_family": "+%d%%价·福%d",
		"bp_today_title": "★今天是%s的生日!",
		"bp_fav": "最爱: %s%s",
		"bp_in_stock": "(摊位有货)",
		"bp_no_stock": "(摊位暂无)",
		"bp_isle_date": "岛历 %s",
		"bp_gift_done": "★礼物已送达",
		"bp_gift_fav": "称心礼物: %s",
		"bp_gift_gold": "金币礼盒",
		"bp_gift_claimed": "声望+%d 券+%d 已领取",
		"bp_gift_for": "★为%s备礼",
		"bp_gift_box": "礼盒%dG%s",
		"bp_gift_plus_fav": " +称心礼物",
		"bp_gift_go": "声望+%d 券+%d 立即备礼!",
		"bp_gift_short": "金币不足 需%dG",
		"bp_none_title": "★今天没有岛民生日",
		"bp_days": "每月3/8/13/18/23/28日",
		"bp_gift_title": "★备礼",
		"bp_gift_only": "生日当天才能备礼",
		"bp_next_cost": "下一位: %s",
		"bp_next_title": "★下一位: %s",
		"bp_next_sub": "%s (%d天后)",
		"bp_fav_cost": "最爱: %s",
		"bp_back_sub": "庆生%d次·全家福%d",
		"cd_fw_title": "★美食评鉴周",
		"cd_fw_sub": "评委%s·%s",
		"cd_fw_go": "去评鉴!",
		"cd_fw_cost": "已评%d/%d·最佳%d",
		"cd_fr_title": "★岛民羁绊",
		"cd_fr_sub": "羁绊%d/%d级",
		"cd_fr_cost": "售价+%.1f%%",
		"cd_back_staff": "返回动物编制",
		"cx_fw_title": "★美食评鉴(%d/%d)",
		"cx_fw_sub": "羁绊%d级·挚友%d",
		"cx_fw_cost": "+%.1f%%价·奖章%d",
		"drawer_food_week": "【美食评鉴周】每周一位岛民当评委，按口味给你的菜品打分",
		"drawer_friendship": "【岛民羁绊】心愿、生日与评鉴加深友谊，等级带来永久售价加成",
		"fw_judge_title": "★本周评委: %s",
		"fw_judge_sub": "偏爱%s · 羁绊Lv.%d",
		"fw_judge_cost": "本周还剩%d天",
		"fw_entry_title": "★提交菜品",
		"fw_entry_match": "(对味)",
		"fw_entry_cost": "预估%d分 · 还可交%d道",
		"fw_entry_full": "★本周已交满",
		"fw_entry_full_sub": "%d道菜已评鉴",
		"fw_entry_next_week": "下周换新评委",
		"fw_entry_none": "摊位暂无可参赛菜品",
		"fw_entry_none_cost": "上架美食后再来",
		"fw_score_title": "★本周最佳 %d分",
		"fw_score_none": "★本周尚未评鉴",
		"fw_score_medal": "评鉴奖章: %s",
		"fw_score_no_medal": "暂无奖章",
		"fw_score_cost": "铜%d 银%d 金%d",
		"fw_back_sub": "评鉴%d次·奖章%d枚",
		"fr_isl_title": "%s Lv.%d",
		"fr_isl_sub": "羁绊%d/%d",
		"fr_isl_max": "羁绊已满",
		"fr_isl_cost": "售价+%.1f%%",
		"fr_back_sub": "总羁绊%d级",
		"bn_fw_scored": "★%s给【%s】打出%d分! 声望+%d%s",
		"bn_fw_scored_voucher": " 图鉴券+%d",
		"bn_fw_scored_medal": " ★%s",
		"bn_fr_level_up": "★和%s的羁绊升到Lv.%d! 每级永久售价+%.1f%%",
		"bn_fw_full": "本周%d道菜已交满，%d天后换新评委",
		"bn_fw_no_dish": "摊位上暂无可参赛的菜品：先让工坊做出美食并上架",
		"bn_fw_judge": "★本周评委%s偏爱%s: 同口味+%d分，羁绊每级再+%d分",
		"bn_fw_rules": "★每周最多交%d道不同菜品，最佳分定奖章: 银奖券+%d、金奖券+%d",
		"bn_fr_islander": "★%s 羁绊Lv.%d: 圆梦心愿+%d、生日礼物+%d、评鉴+%d点 · 每级售价+%.1f%%",
		"bn_cx16": "★美食评鉴: 已评菜品 %d/%d · 金奖 %d / 奖章 %d 枚 · 羁绊总等级 %d · 售价 +%.1f%%",
		"ft_food_week": "★%s评分%d! 声望+%d%s",
		"wb_back_sub": "已圆梦%d张·勋%d",
		"bn_career": "★岛屿生涯荣誉: 已达成 %d/%d 项成就 · %s",
		"bn_codex": "★山海图鉴总加成: 全岛商品售价永久 +%d%% (每解锁1种农作物或工坊美食 +10%%)",
		"bn_amber_short": "晨露琥珀不足 (需 %d 琥珀)，请完成飞艇皇家订单获取!",
		"bn_air_load": "★远洋飞艇装船 +%d件 · 当前进度: %s (满额领琥珀&稀有图鉴券!)",
		"bn_air_away": "★浮空飞艇远洋商队正在返航途中，预计 %ds 后停靠东港码头!",
		"bn_voucher_redeem": "★使用1张稀有图鉴券点亮节气限定美食【%s】！全岛图鉴售价永久提升!",
		"bn_solar_advance": "★二十四节气流转至【%s】· 当季限定【%s】售价1.45x!",
		"bn_gh_need_isle": "请先在【开拓造景】修复木桥1解锁 2 号岛【魔法密林】，即可建造云端温室!",
		"bn_gh_cost": "建造【云端温室培育房】需要 %dG 金币!",
		"bn_sv_need": "请先解锁2号岛并花费 %dG 建造【云端温室培育房】培育奇花异草!",
		"bn_sv_packed": "★打包成功！制成【%s】x1 (库存%d) · 收藏家旅客正慕名登岛选购!",
		"bn_sv_need_items": "★伴手礼打包需: 1株温室奇花 + 1份工坊/节气美食 (当前奇花x%d · 礼盒库存x%d)!",
		"bn_gh_cycle": "★云端温室切换培育【%s】(%s) · 累计售出礼盒 %d 份!",
		"bn_cx5_locked": "★云端温室奇花与名物伴手礼图鉴: 解锁2号岛建造温室可杂交培育奇花异草，打包名物礼盒吸引收藏家旅客!",
		"bn_hs_need_isle": "请先在【开拓造景】修复木桥2解锁 3 号岛【天空海岸】，即可建造云海温泉汤屋!",
		"bn_hs_cost": "建造【云海温泉汤屋】需要 %dG 金币!",
		"bn_hb_need": "请先解锁3号岛并花费 %dG 建造【云海温泉汤屋】熬制疗愈浴汤!",
		"bn_hb_brewed": "★浴汤熬制成功！调成【%s】x1 (库存%d) · 全员精力恢复且贵宾汤客正慕名登岛!",
		"bn_hb_cycle": "★汤屋切换慢熬【%s】· 投入岛屿鲜草与温室奇花可即时加快调制!",
		"bn_cx6_cycle": "★云海温泉汤屋切换浴汤【%s】(%s) · 已接待贵宾汤客 %d 位!",
		"bn_cx6_locked": "★云海温泉汤屋与灵泉汤鉴: 解锁3号岛建造温泉汤屋，调制草本/花瓣浴汤恢复员工精力并接待贵宾萌宠汤客!",
		"bn_wm_need_isle": "请先在【开拓造景】修复木桥1解锁 2 号岛【魔法密林】，即可建造云端风车烘焙面坊!",
		"bn_wm_cost": "建造【云端风车烘焙面坊】需要 %dG 金币!",
		"bn_wp_need": "请先解锁2号岛并花费 %dG 建造【云端风车烘焙面坊】!",
		"bn_wp_baked": "★鲜烤出炉【%s】x1 (包存%d) · 美食花车巡游节热卖中!",
		"bn_cx7_cycle": "★风车烘焙面坊切换烤制【%s】(%s) · 已招待巡游食客 %d 位!",
		"bn_cx7_locked": "★云端烘焙鉴: 解锁2号岛建造风车烘焙面坊，磨金麦粉烤舒芙蕾欧包与琥珀可颂，开启美食花车巡游节!",
		"bn_tp_cost": "建造【云端茗香制茶坊】需要 %dG 金币!",
		"bn_tm_need": "请先花费 %dG 在1号岛建造【云端茗香制茶坊】!",
		"bn_tm_brewed": "★新茶出汤【%s】x1 (茗存%d) · 荷塘月色画舫茶会 1.38x 热卖中!",
		"bn_cp_need_isle": "请先开拓木桥1解锁2号岛，再建造【山海食神品鉴席】!",
		"bn_cp_cost": "建造【山海食神品鉴席】需要 %dG 金币!",
		"bn_wl_on": "★星灯水灯节进行中 (%ds) · 点击荷塘与海岸漂流的祈愿水灯拾灯许愿!",
		"bn_cx9_cycle": "★山海食神品鉴席主推【%s】(%s) · 品鉴 %d 场!",
		"bn_cx9_locked": "★山海食神鉴: 在2号岛建造山海食神品鉴席，组合三岛食材烹制灌汤小笼/星光锦鲤/山海火锅，三道品鉴全过赢食神勋章!",
		"bn_lh_need_isle": "请先开拓木桥2解锁3号岛，再建造【云海灯塔渔港】!",
		"bn_lh_cost": "建造【云海灯塔渔港】需要 %dG 金币!",
		"bn_au_need_harbor": "★岛民名物集市拍卖会在3号岛【云海灯塔渔港】开槌，请先建造灯塔渔港!",
		"bn_au_leading": "★你正以 %d%s 领先，静候落槌!",
		"bn_au_poor": "★出价需 %d%s，当前余额不足!",
		"bn_dw_cost": "建造【云端牧场乳品工坊】需要 %dG 金币!",
		"bn_cin_cost": "搭建【星空夜市露天电影院】需要 %dG 金币!",
		"bn_cin_snack": "★影院零食热卖 +%dG (%s)",
		"bn_cin_soldout": "★影院零食售罄 · 乳品工坊的云朵布丁/云朵鲜奶可供夜场零食!",
		"bn_cin_night_only": "★露天影院只在夜市开映 · %ds 后入夜连映 3 部电影!",
		"bn_pk_need_isle": "【云端陶艺窑坊】建在 3 号岛木桥登岸处，请先开拓岛3!",
		"bn_pk_cost": "建造【云端陶艺窑坊】需要 %dG 金币!",
		"bn_sp_on": "★秋季运动会进行中 · %s · 观赛人潮售价 %sx · 余 %ds",
		"bn_sp_need": "★秋季运动会需要 1 号岛至少 2 种员工组队 (月兔/水獭/狐狸/柴犬)!",
		"bn_kt_on": "★云海风筝节进行中 · %s 产销 x%.2f/x%.2f · 还有 %d 只风筝在西岛/东岛上空 · 余 %ds",
		"bn_season_info": "★岛屿四季装扮: 本地 %d 月 = %s (北半球月份) · %d 处【%s】· %s +%d%%",
		"bn_pt_on": "★观光摄影团进行中 · 第 %d/%d 站 · 已拍 %d 张 · %s",
		"bn_pt_none": "★观光摄影团暂无可打卡的景点!",
		"bn_sw_info": "★云海天气【%s】%s · %d分后换天 · 预报 %s",
		"bn_bd_info": "★岛民生日会: 当天备礼得声望与图鉴券 · %d 位都庆生得生日全家福",
		"bn_bd_gold": "★备礼需要 %dG，金币不足!",
		"bn_bd_already": "★今天的生日礼物已经送达啦!",
		"bn_bd_not_today": "★生日当天才能备礼 · 下一位: %s (%d 天后)",
		"bn_bd_calendar": "★岛历: 现实 1 个月 = 云岛 1 年 · 月兔3日 水獭8日 小狐狸13日 柴犬18日 企鹅23日 巨嘴鸟28日",
		"bn_bd_islander": "★%s的生日在每月 %d 日 · 最爱%s (摊位有货时包进礼盒 = 称心礼物 声望+%d 券+%d)",
		"bn_cx15": "★云海天气鉴: 天气 %d/%d · 已庆生岛民 %d/%d · 生日会 %d 场 · 生日全家福 %d 枚",
		"bn_wb_info": "★心愿告示板: 帮岛民完成委托 · 得声望与图鉴券",
		"bn_wish_note": "%s的%s(%s): %s · %s",
		"bn_cx14": "★观光摄影鉴: 照片 %d/%d 张(%d 处景点 x 常规/绝景) · 打卡集章 %d · 心愿勋章 %d",
		"bn_cx13": "★云海风筝鉴: 风筝 %d/3 种 · 四季 %d/4 · 累计收筝 %d 只 · 风筝满天勋章 %d 枚",
		"bn_cx12": "★秋季运动会鉴: 已办 %d/3 项比赛 · 陶艺 %d/3 · 累计赛事 %d 场 · 金丝带奖牌 %d 枚",
		"bn_cx11": "★星空影院鉴: 已映 %d/3 部电影 · 乳品 %d/3 · 累计影票 %d 场 · 星空影迷勋章 %d 枚",
		"bn_cx10": "★名物拍卖鉴: 已拍得 %d/3 种名物 · 藏品 %d 件 · 金槌勋章 %d 枚 · 渔港存鲜 %d",
		"bn_cx10_locked": "★名物拍卖鉴: 在3号岛建造云海灯塔渔港，渔船出海捕鲜货，并在岛民名物集市拍卖会上拍下明珠匣/鲜味篮/伴手礼!",
		"bn_cx8_cycle": "★云端茗香茶坊切换沏制【%s】(%s) · 已招待雅集茶客 %d 位!",
		"bn_cx8_locked": "★茗香茶韵鉴: 在1号岛建造云端茗香制茶坊，杀青云雾春芽、沏泡云雾龙井与桂花乌龙，开启荷塘月色画舫雅集!",
		"wl_gift_bag": "★许愿礼袋",
		"wl_airship": "★远洋商队",
		"wl_airship_on": "★商队%d/%d(+%d珀+%d券)",
		"wl_parade": "★美食花车巡游",
		"wl_parade_on": "★美食花车巡游(%ds)",
		"wl_moontea": "★月色画舫雅集",
		"wl_moontea_on": "★月色画舫雅集(%ds)",
		"wl_lantern": "★星灯祈愿水灯节",
		"wl_lantern_on": "★星灯祈愿水灯节(%ds)",
		"wl_sports": "★岛民秋季运动会",
		"wl_sports_idle": "★秋季运动会",
		"wl_sports_gather": "★秋季运动会·入场(%ds)",
		"wl_sports_award": "★金丝带颁奖·%s",
		"wl_sports_event": "★运动会·%s %d/%d",
		"wl_kite": "★云海风筝节",
		"wl_kite_on": "★风筝节·%s 售x%.2f 余%ds 筝%d/%d",
		"wl_cp_init": "★食神·灌汤小笼",
		"wl_cp_unbuilt": "待建食神席",
		"wl_cp_cost": "★食神席(%dG)",
		"wl_seg_medal": "·勋%d",
		"wl_seg_tasted": "·鉴%d/3",
		"wl_gh_init": "★温室·星露铃兰",
		"wl_gh_unbuilt": "待建温室",
		"wl_seg_box": "·礼%d",
		"wl_gh_cost": "★温室(%dG)",
		"wl_hs_init": "★汤屋·艾草暖汤",
		"wl_hs_unbuilt": "待建汤屋",
		"wl_seg_bath": "·汤%d",
		"wl_hs_cost": "★汤屋(%dG)",
		"wl_tp_init": "★茶坊·龙井茗茶",
		"wl_tp_unbuilt": "待建茶坊",
		"wl_seg_tea": "·茗%d",
		"wl_seg_leaf": "·芽%d",
		"wl_tp_cost": "★茶坊(%dG)",
		"wl_wm_init": "★面坊·舒芙蕾包",
		"wl_wm_unbuilt": "待建面坊",
		"wl_seg_bread": "·包%d",
		"wl_seg_flour": "·粉%d",
		"wl_wm_cost": "★面坊(%dG)",
		"wl_dw_init": "★乳品工坊",
		"wl_dw_unbuilt": "待建乳坊",
		"wl_seg_milk": "·奶%d",
		"wl_dw_cost": "★乳坊(%dG)",
		"wl_lh_init": "★灯塔渔港",
		"wl_au_init": "★名物拍卖会",
		"wl_lh_cost": "★灯塔渔港(%dG)",
		"wl_au_open": "起拍%d%s·待出价",
		"wl_au_now": "现价%d%s·%s",
		"wl_lh_lv": "★渔港Lv.%d·鲜%d",
		"wl_au_on": "★名物拍卖%d/%d·%s(%ds)",
		"wl_cin_init": "★星空露天影院",
		"wl_cin_cost": "★露天影院(%dG)",
		"wl_cin_on": "★放映%d/%d·%s %ds",
		"wl_cin_break": "★幕间零食·%ds",
		"wl_cin_done": "★今夜散场·影票%d",
		"wl_pk_init": "★陶窑",
		"wl_pk_unbuilt": "待建陶窑",
		"wl_seg_clay": "·土%d",
		"wl_seg_nofuel": "·缺柴",
		"wl_pk_cost": "★陶窑(%dG)",
		"bn_w_gh_cost": "建造【云端温室培育房】需 %dG 金币!",
		"bn_w_wm_cost": "建造【云端风车烘焙面坊】需 %dG 金币!",
		"bn_w_tp_cost": "建造【云端茗香制茶坊】需 %dG 金币!",
		"bn_w_cp_cost": "建造【山海食神品鉴席】需 %dG 金币!",
		"bn_w_hs_cost": "建造【云海温泉汤屋】需 %dG 金币!",
		"bn_w_lh_cost": "建造【云海灯塔渔港】需 %dG 金币!",
		"bn_w_dw_cost": "建造【云端牧场乳品工坊】需 %dG 金币!",
		"bn_w_cin_cost": "搭建【星空夜市露天电影院】需 %dG 金币!",
		"bn_w_pk_cost": "建造【云端陶艺窑坊】需 %dG 金币!",
		"bn_w_lh_info": "★灯塔渔港: 渔船轮班出海中 · 存鲜%d · 名物拍卖会 %ds 后开槌!",
		"bn_w_dw_nofeed": "★乳品工坊: 农田篮里没有鲜草作物可喂云朵奶牛 · 等月兔收获后再来挤奶!",
		"bn_w_cin_info": "★露天影院: 今夜已映 %d/3 场 · 每场观众 %d 位 × 影票 %dG · 乳品工坊的云朵布丁/鲜奶可作影院零食!",
		"bn_w_pk_info": "★陶艺窑坊: 土仓 %d 份%s",
		"bn_w_pk_nofuel": " · 缺秸秆柴 (农田篮里没有收获作物)",
		"bn_w_pk_hint": " · 月兔收获时会翻出陶土，茶碗 1 份土 / 陶花瓶 2 份土",
		"bn_w_kite_sweep": "★风筝满天！收下全部 %d 只风筝 · 风筝满天勋章 x%d · +%d琥珀 +%d图鉴券!",
		"bn_w_kite_got": "★收下【%s】+%dG%s · 风力%s 产销加成中 · 余 %d 只",
		"bn_w_air_need": "★远洋飞艇大订单需求: %s · 集齐奖励 +%s琥珀 +%s稀有图鉴券!",
		"ft_gift_bag": "★许愿礼袋+%dG +%d琥珀 · 狂欢15s!",
		"ft_w_packed": "★打包【%s】x1 (库存%d)",
		"ft_w_gh_cycle": "★温室切换培育【%s】",
		"ft_w_parade": "★美食花车巡游庆典！鲜烤欧包可颂溢价 1.75x~1.90x 热卖中!",
		"ft_w_baked": "★出炉【%s】x%d (包存%d)",
		"ft_w_milled": "★研磨【金麦云朵面粉】+%d (粉存%d)",
		"ft_w_wm_cycle": "★面坊切换烘焙【%s】",
		"ft_w_brewed_tea": "★沏泡【%s】x%d (茗存%d)",
		"ft_w_roasted": "★杀青【云雾春芽】+%d (芽存%d)",
		"ft_w_tp_cycle": "★茶坊切换沏制【%s】",
		"ft_w_cooked": "★烹制【%s】(肴存%d)",
		"ft_w_cp_cycle": "★品鉴席切换名菜【%s】",
		"ft_w_bath": "★熬制【%s】x1 (汤存%d)",
		"ft_w_hs_cycle": "★汤屋切换药浴【%s】",
		"ft_w_fish_shipped": "★鲜货上摊 +%d 云海鲜渔获",
		"ft_w_dairy_made": "★制成【%s】(存%d)",
		"ft_w_milked": "★挤奶 +%d 云朵鲜奶 (饲%s)",
		"ft_w_snack": "★影院零食 +%dG",
		"ft_w_fired": "★出窑【%s】(存%d)",
		"ft_w_air_load": "★远洋装船 +%d件 (%s/%s)",
		"ft_contract_done": "★皇家契约完成! +%dG +%d琥珀",
		"ft_voucher_recipe": "★图鉴券点亮节气食谱【%s】+1份上架!",
		"ft_four_seasons_perk": "★四时全席礼遇 +%d琥珀 +%dG!",
		"ft_airship_done": "★远洋大订单达成! +%dG +%d琥珀 +%d图鉴券!",
		"ft_landscape": "★解锁造景【%s】!",
		"ft_gh_open": "★云端温室培育房启用！开始培育【星露铃兰】!",
		"ft_flora_bred": "★奇花杂交突破！培育出【%s】!",
		"ft_hs_open": "★云海温泉汤屋开汤！熬制【艾草暖身汤】恢复全员精力!",
		"ft_bath_recipe": "★灵泉秘方突破！调配出【%s】!",
		"ft_wm_open": "★云端风车烘焙面坊落成！麦香烘焙光环激活 (摊位&工坊提速1.22x+)!",
		"ft_bake_recipe": "★烘焙秘方突破！解锁【%s】!",
		"ft_tp_open": "★云端茗香制茶坊落成！茗香清心光环激活 (员工效率&小费UP)!",
		"ft_tea_recipe": "★茶道秘谱点亮！解锁【%s】!",
		"ft_moontea_open": "★荷塘月色画舫品茗雅集开幕！茗茶与佳肴售价 1.38x!",
		"ft_moontea_need": "需先建造【云端茗香制茶坊】(%dG) 开启画舫雅集!",
		"ft_moontea_reward": "★画舫品茗雅赏! +%d琥珀 +%d图鉴券 +%d声望 (茶肴1.38x)!",
		"ft_lantern_open": "★云海星灯祈愿水灯节开幕！荷塘与海岸漂来祈愿水灯 · 全集市售价 1.30x!",
		"ft_wish_granted": "★祈愿成真! ",
		"ft_lantern_wish": "★星灯祈愿! ",
		"ft_lantern_reward": "+%dG +%d琥珀 +%d图鉴券",
		"ft_cp_open": "★山海食神品鉴席落成！三岛食材组合烹制特级名菜!",
		"ft_tasting_pass": "★品鉴通过【%s】%d分!",
		"ft_tasting_fail": "品鉴未达标【%s】%d/%d分",
		"ft_lh_open": "★云海灯塔渔港点灯！双渔船轮班出海捕鲜货!",
		"ft_boat_back": "★渔船归港 +%d 云海鲜渔获",
		"ft_auction_open": "★岛民名物集市拍卖会开槌！",
		"ui_unsold": "流拍",
		"ft_au_won": "★落槌！拍得【%s】%d%s",
		"ft_au_lost": "落槌:【%s】归%s",
		"ft_dw_open": "★云端牧场乳品工坊落成！鲜草饲喂云朵奶牛挤鲜奶!",
		"ft_cin_open": "★星空夜市露天电影院搭好银幕！夜幕降临即开映!",
		"ft_film_start": "★露天电影开映 %s",
		"ft_cin_medal": "★影迷勋章! ",
		"ft_cin_end": "★散场 ",
		"ft_cin_audience": "观众%d · 影票+%dG",
		"ft_cin_snack": " · 零食+%dG",
		"ft_pk_open": "★云端陶艺窑坊点火！收获陶土+秸秆柴烧制茶碗与陶花瓶!",
		"ft_sp_open": "★岛民秋季运动会开幕！%d 支队伍入场 · 观赛人潮售价 %.2fx!",
		"ft_sp_event_start": "★运动会 %s 开赛!",
		"ft_sp_event_win": "★%s 冠军 %s · 奖金+%dG",
		"ft_kite_open": "★云海风筝节开幕！%d 只像素风筝乘%s升空 · 风力加成产销!",
		"ft_pt_start": "★观光摄影团出发! %d 处景点打卡",
		"ft_photo": "咔嚓!【%s】+%dG%s",
		"ft_photo_special": " ★绝景",
		"ft_wish_done": "★%s心愿圆梦! 声望+%d 图鉴券+%d%s",
		"ft_wish_medal": " ★心愿勋章",
		"ft_bday": "★%s生日快乐! 声望+%d 图鉴券+%d%s",
		"ft_bday_medal": " ★生日全家福",
		"ft_achievement": "★成就解锁【%s】!",
		"gm_career": "★%d星 · 收%d · 制%d · 客%d · 契%d",
		"gm_wish_reward": "声望+%d 券+%d",
		"gm_wish_left": " 余%ds",
		"gm_wish_done_title": "★%s圆梦啦!",
		"gm_wish_claimed": " 已领取",
		"gm_wish_expired_title": "★%s的便签过期",
		"gm_wish_new_in": "新便签 %ds 后轮换",
		"gm_wish_void": " 已失效",
		"ft_pet_boost": "★干劲满满 加速8s!",
		"ft_tag_fresh": "鲜果直售+",
		"ft_tag_divert": "分流直售+",
		"ft_tag_mortar": "3.5x美食+",
		"ft_tag_cross": "跨岛鲜果+",
		"ft_tag_feast": "52x盛宴+",
		"ft_tag_nectar": "12x甘露+",
		"ft_tea_guest": "★雅集茶客品茗! +%dG +%d琥珀%s!",
		"ft_wait_tea": "...待云端香茗出汤",
		"ft_parade_guest": "★花车食客抢购! +%dG +%d琥珀%s!",
		"ft_wait_bread": "...待烘焙欧包出炉",
		"ft_spa_guest": "★贵宾汤客疗愈! +%dG +%d琥珀%s!",
		"ft_wait_bath": "...待温泉浴汤调配",
		"ft_collector": "★收藏家珍藏礼盒! +%dG +%d琥珀%s!",
		"ft_wait_box": "...待名物礼盒上架",
		"ft_trader": "★行商收购x%d +%d琥珀 +%dG!",
		"ft_no_surplus": "...暂无富余作物",
		"ft_critic": "★美食家盛赞！金牌口碑售价&小费UP!",
		"ft_wait_dish": "...待料理出炉",
		"ft_vip_tip": "★富豪2x小费!",
		"ft_sold_out_leave": "...缺货离开",
		"ft_milestone": "★里程碑突破 Lv.%d!",
		"wl_badge": "★%s%s",
		"wl_au_you": "你领先"
	},
	"en_US": {
		"lang_badge": "[EN]",
		"tab_build": "Buildings",
		"tab_animal": "Workers",
		"tab_expand": "Islands",
		"tab_codex": "Codex",
		"tab_companion": "★Desk Pin",
		"tab_window": "★Windowed",
		"drawer_build": "[Build] Kiln·Dairy·Harbor·Chef·Tea·Greenhouse·Spa·Bakery·Lv.25 evolves!",
		"drawer_animal": "[Workers & Traits] Click to pet for a boost · traits at Lv.10/25/50!",
		"drawer_expand": "[Islands & Fests] Bridges·Airship·11 fests·Tours·Wishes·Weather·Birthdays!",
		"drawer_codex": "[Collection Codex] Unlocked %d/8 delicacies · Global price +%d%%!",
		"drawer_codex_full": "[Codex] Dishes %d/8 · Solar %d/4(%s) · Voucher %d · Medals %d/%d",
		"drawer_codex_ci5": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Medals %d/%d",
		"drawer_codex_ci6": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Med %d/%d",
		"drawer_codex_ci7": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Med %d/%d",
		"drawer_codex_ci8": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Tea %d/3·Med %d/%d",
		"drawer_codex_ci9": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Tea %d/3·Feast %d/3·Med %d/%d",
		"drawer_codex_ci10": "[Codex] Dish %d/8·Sol %d/4(%s)·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Tea %d/3·Fst %d/3·Auc %d/3·Med %d/%d",
		"drawer_codex_ci11": "[Codex] Dish %d/8·Sol %d/4·Flo %d/2·Box %d/2·Spa %d/3·Bak %d/3·Tea %d/3·Fst %d/3·Auc %d/3·Milk %d/3·Film %d/3·Med %d/%d",
		"drawer_codex_ci12": "[Codex] Dish%d/8·Sol%d/4·Flo%d/2·Box%d/2·Spa%d/3·Bak%d/3·Tea%d/3·Fst%d/3·Auc%d/3·Milk%d/3·Film%d/3·Pot%d/3·Sport%d/3·Med%d/%d",
		"drawer_codex_ci13": "[Codex] Dish%d/8·Sol%d/4·Flo%d/2·Box%d/2·Spa%d/3·Bak%d/3·Tea%d/3·Fst%d/3\nAuc%d/3·Milk%d/3·Film%d/3·Pot%d/3·Sport%d/3·Kite%d/3·Ssn%d/4·Med%d/%d",
		"drawer_codex_ci14": "[Codex] Dish%d/8·Sol%d/4·Flo%d/2·Box%d/2·Spa%d/3·Bak%d/3·Tea%d/3·Fst%d/3\nAuc%d/3·Milk%d/3·Film%d/3·Pot%d/3·Sport%d/3·Kite%d/3·Ssn%d/4·Pic%d/6·Med%d/%d",
		"drawer_wish_board": "[Wish Board] Every %d wishes granted earn a Wish Medal",
		"drawer_codex_ci15": "Dish%d/8·Term%d/4·Flora%d/2·Box%d/2·Spa%d/3·Bread%d/3·Tea%d/3·Chef%d/3·Lot%d/3·Milk%d/3\nFilm%d/3·Pot%d/3·Sport%d/3·Kite%d/3·Season%d/4·Photo%d/6·Sky%d/4·B-day%d/6·Medal%d/%d",
		"drawer_birthday": "[Birthdays] Island calendar: days 3/8/13/18/23/28",
		"medal_prog": "Medals %d/%d",
		"bn_kite_start": "★Kite Festival! %d kites in the sky · click to reel in · %s wind boost!",
		"bn_kite_swept": "★Full Sky! All %d kites reeled in · Medal x%d",
		"bn_kite_end": "★Kite Festival over · %d/%d kites reeled in · next in %ds",
		"bn_season": "★Isles dressed for %s [%s] · %s +%d%%",
		"ui_weather_mult": "Visit x%.2f Crop x%.2f Craft x%.2f Sale x%.2f",
		"bn_sky_weather": "★Weather: [%s] %s · changes every %d min",
		"bn_bday_gift": "★Gift for %s! Rep+%d V+%d%s%s",
		"bn_bday_gift_fav": " · Fav [%s]",
		"bn_bday_gift_medal": " ★Family Photo!",
		"bn_photo_start": "★Photo tour departs! %d stops: %s · Visitors x%s",
		"bn_photo_first_amber": " · 1st shot +%d Amber",
		"bn_photo_first_voucher": " · 1st superb +%d Voucher",
		"bn_photo_taken": "%s[%s] added to the album +%dG%s",
		"bn_photo_special": "★Superb! ",
		"bn_photo_click": "Click! ",
		"bn_photo_end_stamp": "★Tour back with %d photos · Stamp x%d +%d Voucher",
		"bn_photo_end": "★Tour heading back · %d photos (%d per tour earns a stamp)",
		"bn_wish_done": "★%s's %s granted! Rep+%d Voucher+%d%s",
		"bn_wish_medal": " ★Wish Medal!",
		"bn_kiln_open": "★Pottery Kiln lit! Harvest clay + straw fire bowls & vases for the market!",
		"bn_sports_start": "★Sports Day! %d teams on the pond track · relay/tug/carry · crowd prices %sx!",
		"bn_sports_event": "★%s: %s · Prize +%dG · Sports %d/3",
		"bn_sports_end": "★Champion [%s]! Gold Ribbon x%d · team speed boost · +Amber +Voucher!",
		"bn_dairy_open": "★Dairy open! Greens feed the cloud cows · cheese & pudding for market and chef!",
		"bn_cinema_open": "★Open-air cinema ready! 3 films each night · tickets & snacks · night prices %sx!",
		"bn_cinema_film": "★%s ends · %d viewers · Tickets +%dG%s · Cinema %d/3",
		"bn_seg_snack": " · Snacks +%dG",
		"bn_cinema_medal": "★3 films in one night! [Cinephile Medal] x%d · +Amber +Voucher!",
		"bn_harbor_open": "★Lighthouse lit! 2 boats fish in shifts · catch for market & chef · auction soon!",
		"bn_auction_start": "★Auction (%d lots)! [%s] opens at %d%s · bid via lighthouse or card",
		"ui_cur_amber": " Amber",
		"bn_auction_won": "★Sold to you for %d%s: [%s] · hot sale %sx · Auction %d/3",
		"bn_auction_lost": "Sold: [%s] to %s for %d%s · next lot coming!",
		"bn_auction_pass": "[%s] unsold",
		"bn_auction_end": "★Auction over: won %d/3 lots%s",
		"bn_auction_end_gavel": " · [Golden Gavel Medal]!",
		"bn_auction_end_next": " · next in %ds",
		"bn_lantern_start": "★Lantern Festival (%ds)! Wish lanterns drift in · click for Amber & Vouchers · x1.30",
		"bn_lantern_claim": "★Lantern wish #%d: +%dG +%d Amber +%d Voucher%s",
		"bn_lantern_granted": " · Wish granted! +6s",
		"bn_tasting_unlock": "★New chef recipe [%s] · cook it from all 3 isles' produce!",
		"bn_tasting_pass": "★Tasting passed [%s] %d pts: +%dG +%d Amber%s · Chef %d/3",
		"bn_seg_voucher": " +%d Voucher",
		"bn_seg_amber": " +%d Amber",
		"bn_tasting_fail": "Tasting failed [%s] %d/%d pts · upgrade the hall or taste during lanterns!",
		"bn_chef_medal": "★All 3 signature dishes passed! [Chef Medal] x%d · Codex card 11 lit!",
		"bn_tea_unlock": "★Tea recipe unlocked: [%s] · calm aura & codex prices up!",
		"bn_moontea_start": "★Moonlit tea party (%ds)! Tea & dishes x1.38 · click the boat for a reward!",
		"bn_moontea_settle": "★Moon tea [%s]: %s+%d Amber%s · Rep+%d!",
		"bn_bakery_unlock": "★Bakery recipe unlocked: [%s] · bakery aura & codex prices up!",
		"bn_parade_start": "★Food parade (%ds)! Paraders pay 1.75x~1.90x for fresh bread & croissants!",
		"bn_parade_settle": "★Parader enjoyed [%s]: +%dG +%d Amber%s · Rep+%d!",
		"bn_spa_unlock": "★Spa recipe unlocked: [%s] · crew energy aura & codex bonus up!",
		"bn_spa_settle": "★VIP guest loved [%s]: +%dG +%d Amber%s · Rep+%d!",
		"bn_flora_unlock": "★Greenhouse hybrid: rare [%s] bred · isle aura & codex prices up!",
		"bn_souvenir_sold": "★Collector bought [%s]! +%dG · +%d Amber · Rep+%d!",
		"bn_airship_done": "★Airship order complete! +%dG · +%d Amber · +%d Rare Voucher!",
		"bn_solar_term": "★Solar term: [%s] · seasonal [%s] x1.45 · %s",
		"bn_acclaim": "★Critic's praise! [Gold Acclaim] %ds: prices +25%% & tips +20%%!",
		"bn_fireworks": "★Fireworks fair (%ds)! Lanterns up, crowds in · more VIPs & traders!",
		"bn_pomodoro": "★Focus done! [★Focus Gift]: +%dG & 2.0x isle rush for %ds!",
		"ui_dur_hm": "%dh %dm",
		"ui_dur_ms": "%dm %ds",
		"ui_dur_s": "%ds",
		"bn_offline": "★Welcome back! Away %s · %d items · earned +%dG (Codex +%d%%)",
		"bn_emp_info": "%s (%s) · Trait [%s] %s · Medals %d/3 (Lv.10/25/50)",
		"bn_bday_today": "★It's %s's birthday! Give a gift in [Islands] for Rep & Vouchers",
		"ui_mute": "[Mute]",
		"ui_sound": "[Sound]",
		"ui_focus25": "[Focus25m]",
		"ui_noise_off": "[Noise:Off]",
		"ui_noise_on": "[%s]",
		"ui_opacity": "[Opacity%d%%]",
		"ui_dock": "[To Taskbar]",
		"ui_bar_voucher": "·V%d",
		"ui_bar_amber": "·A%d",
		"ui_w_day": "Day",
		"ui_w_dusk": "Dusk",
		"ui_w_night": "Night",
		"ui_w_rain": "Drizzle",
		"ui_w_lantern": "Lantern",
		"ui_w_moontea": "Tea Boat",
		"ui_w_parade": "Parade",
		"ui_w_cinema": "Cinema",
		"ui_w_fireworks": "Fireworks",
		"ui_w_acclaim": "★%s",
		"ui_cap_stealth": "Idling · F9 or click to restore",
		"ui_cap_restore": "[Back]",
		"ui_cap_focus": "Focus %s · ",
		"ui_cap_contract": "Order: %s %d/%d",
		"ui_bar_contract": "Order:%s %d/%d(+%dA)",
		"ui_bar_stall": "Bag%d·Stall%d/%d·Codex+%d%%",
		"ui_emp_none": " (none)",
		"ui_trait_locked": "Lv.10:[%s]",
		"ui_date_md": "%d/%d",
		"cd_suffix_locked": " (lock)",
		"cd_b_next_ms": "Next 2x: Lv.%d",
		"cd_b_need_isle": "Bridge to Isle %d first",
		"cd_upgrade": "Upgrade %dG",
		"cd_isle_locked": "Isle locked",
		"cd_build": "Build %dG",
		"cd_need_bridge1": "Bridge 1 opens Isle 2",
		"cd_need_bridge1b": "Bridge 1 opens Isle 2",
		"cd_need_bridge2": "Bridge 2 opens Isle 3",
		"cd_gh_locked": "Greenhouse (Isle 2)",
		"cd_gh_new": "Greenhouse (new)",
		"cd_gh_sub": "Hybrids + isle aura",
		"cd_gh_lv": "Greenhouse Lv.%d",
		"cd_gh_sub_lv": "%s · Flora %d",
		"cd_hs_locked": "Spa Inn (Isle 3)",
		"cd_hs_new": "Spa Inn (new)",
		"cd_hs_sub": "Baths: energy+guests",
		"cd_hs_lv": "Spa Inn Lv.%d",
		"cd_hs_sub_lv": "%s · Baths %d",
		"cd_wm_locked": "Bakery (Isle 2)",
		"cd_wm_new": "Bakery (new)",
		"cd_wm_sub": "Mill & bake + aura",
		"cd_wm_lv": "Bakery Lv.%d",
		"cd_wm_sub_lv": "%s · Bread %d",
		"cd_tp_new": "Tea House (new)",
		"cd_tp_sub": "Brew tea + calm aura",
		"cd_tp_lv": "Tea House Lv.%d",
		"cd_tp_sub_lv": "%s · Tea %d",
		"cd_cp_locked": "Chef Hall (Isle 2)",
		"cd_cp_new": "Chef Hall (new)",
		"cd_cp_sub": "Cook 3-isle dishes",
		"cd_cp_lv": "Chef Hall Lv.%d",
		"cd_cp_sub_lv": "%s · Dish %d",
		"cd_lh_locked": "Harbor (Isle 3)",
		"cd_lh_new": "Harbor (new)",
		"cd_lh_sub": "2 boats catch fish",
		"cd_lh_lv": "Harbor Lv.%d",
		"cd_lh_sub_lv": "Fish %d · Caught %d",
		"cd_dw_new": "Dairy (new)",
		"cd_dw_sub": "Milk·Cheese·Pudding",
		"cd_dw_lv": "Dairy Lv.%d",
		"cd_dw_sub_lv": "Milk%d·Cheese%d·Pud%d",
		"cd_pk_new": "Kiln (new)",
		"cd_pk_sub": "Bowls · Vases",
		"cd_pk_need_isle3": "Needs Isle 3",
		"cd_pk_isle3_closed": "Isle 3 closed",
		"cd_pk_lv": "Kiln Lv.%d",
		"cd_pk_sub_lv": "Clay%d·Bowl%d·Vase%d",
		"cd_a_need_isle": "Unlock a new isle",
		"cd_a_crew": "Crew %d/%d · %s",
		"cd_a_hire": "Hire %dG",
		"cd_a_train": "Train all Lv.+1 (%dG)",
		"cd_e_bridge1": "Bridge 1·Grove",
		"cd_e_bridge1_sub": "2x farm+12x pot",
		"cd_e_bridge2": "Bridge 2·Coast",
		"cd_e_bridge2_sub": "52x shops·VIP 2x",
		"cd_unlocked": "Unlocked",
		"cd_unlock_g": "%dG unlock",
		"cd_need_isle_n": "Unlock Isle %d",
		"cd_lit_active": "Active",
		"cd_amber_unlock": "%d Amber unlock",
		"ui_lb_crop": "Crops",
		"ui_lb_workshop": "Workshops",
		"ui_lb_tip": "Tips",
		"ui_lb_buff": "Buff",
		"cd_air_title": "★Airship #%d",
		"cd_air_sub": "Loaded %d/%d",
		"cd_air_cost": "Ship +%sA +%sV",
		"cd_air_away": "★Airship out",
		"cd_air_away_sub": "Stock 4 seasons",
		"cd_air_eta": "Docks in ~%ds",
		"cd_sv_title": "★Souvenirs",
		"cd_sv_sub": "Lure collectors",
		"cd_sv_build": "%dG greenhouse",
		"cd_need_isle2": "Unlock Isle 2",
		"cd_need_isle3": "Unlock Isle 3",
		"cd_sv_title_lv": "★Gift Box %d",
		"cd_sv_sub_lv": "Flora x%d·Sold %d",
		"cd_sv_cost": "Pack (+A +Rep)",
		"cd_hb_title": "★Cloud Spa",
		"cd_hb_sub": "Baths·VIP guests",
		"cd_hb_build": "%dG spa",
		"cd_hb_title_lv": "★Spa (%d)",
		"cd_hb_sub_lv": "+%d%%·Guests %d",
		"cd_hb_cost": "Brew (+A +tips)",
		"cd_wp_title": "★Bakery",
		"cd_wp_sub": "Bake·Parade",
		"cd_wp_build": "%dG bakery",
		"cd_wp_title_on": "★Parade (%ds)",
		"cd_wp_sub_on": "Bread x%d·1.88x",
		"cd_wp_cost_on": "Bake (+A +V)",
		"cd_wp_title_lv": "★Bakery %d",
		"cd_wp_sub_lv": "+%d%%·Guests %d",
		"cd_wp_cost_lv": "Start parade!",
		"cd_tm_title": "★Moon Tea",
		"cd_tm_sub": "Teas · Boat",
		"cd_tm_build": "%dG tea house",
		"cd_tm_title_on": "★Tea (%ds)",
		"cd_tm_sub_on": "Tea x%d·1.38x",
		"cd_tm_cost_on": "Brew (+A +V)",
		"cd_tm_title_lv": "★Teahouse %d",
		"cd_tm_sub_lv": "+%d%%·Guests %d",
		"cd_tm_cost_lv": "Start tea party!",
		"cd_wl_title_on": "★Lanterns %ds",
		"cd_wl_sub_on": "Got %d·x1.30",
		"cd_wl_cost_on": "Click: +A +V",
		"cd_wl_title": "★Lantern Fest",
		"cd_wl_sub": "Lanterns·Got %d",
		"cd_wl_cost": "Start lanterns!",
		"cd_au_title": "★Auction",
		"cd_au_sub_locked": "Harbor first",
		"cd_au_need_harbor": "Needs harbor",
		"cd_au_open": "open",
		"cd_au_you_lead": "you lead",
		"cd_au_lead": "%s 1st",
		"cd_au_title_on": "★Lot %d/%d %ds",
		"cd_au_leading": "Leading",
		"cd_au_bid": "Bid %d%s",
		"cd_au_sub_idle": "Lots %d·Gavel %d",
		"cd_au_cost_idle": "Open auction!",
		"cd_cin_title": "★Sky Cinema",
		"cd_cin_sub": "Night films",
		"cd_cin_build": "%dG screen",
		"cd_cin_title_on": "★Film %d/%d %ds",
		"cd_cin_sub_on": "%s·%d",
		"cd_cin_cost_on": "Tkt %dG·x%s",
		"cd_cin_title_open": "★Night Show",
		"cd_cin_sub_open": "Tonight %d/3",
		"cd_cin_cost_open": "Sell snacks",
		"cd_cin_title_idle": "★Cinema",
		"cd_cin_sub_idle": "Shows %d·Medal %d",
		"cd_cin_cost_idle": "Night in %ds",
		"cd_sp_gather": "★Sports·March",
		"cd_sp_award": "★Ribbon Awards",
		"cd_sp_sub_on": "%d teams·%ds",
		"cd_sp_cost_on": "Crowd x%s",
		"cd_sp_title": "★Sports Day",
		"cd_sp_sub_need": "Isle 1: 2+ kinds",
		"cd_sp_cost_need": "%d team(s) now",
		"cd_sp_sub_idle": "%d teams·Ribbon %d",
		"cd_sp_cost_idle": "Start now!",
		"cd_kt_title_on": "★Kites·%s",
		"cd_kt_sub_on": "Kites %d/%d·%ds",
		"cd_kt_cost_on": "P x%.2f S x%.2f",
		"cd_kt_title": "★Kite Festival",
		"cd_kt_sub": "Medal %d·in %ds",
		"cd_kt_cost": "Fly now!",
		"cd_ss_title": "★%s",
		"cd_pt_title_on": "★Tour %d/%d",
		"cd_pt_sub_on": "Pics %d·%s",
		"cd_pt_return": "Return",
		"cd_pt_cost_on": "Visitors x%s",
		"cd_pt_title": "★Photo Tour",
		"cd_pt_sub": "Stamp %d·in %ds",
		"cd_pt_cost": "Go now!",
		"cd_wb_title": "★Wish Board",
		"cd_wb_sub": "Note%d/%d·Done%d",
		"cd_wb_cost": "Rep%d·V%d",
		"cd_sw_title": "★Sky: %s",
		"cd_sw_cost": "Next in %dm",
		"cd_bd_title": "★%s B-day",
		"cd_bd_given": "Gift sent·thanks!",
		"cd_bd_parties": "Parties %d",
		"cd_bd_gift_cost": "Gift %dG",
		"cd_bd_go": "Celebrate!",
		"cd_bd_card_title": "★Birthdays",
		"cd_bd_next": "Next: %s",
		"cd_bd_days": "in %d days",
		"cd_back_list": "Back to list",
		"cx_tier1": "Tier 1·Dew Garden",
		"cx_tier2": "Tier 2·Fruit Bakery",
		"cx_tier3": "Tier 3·Grove Dew",
		"cx_tier4": "Tier 4·Sky Feast",
		"cx_unk_crop": "???(crop)",
		"cx_unk_dish": "???(dish)",
		"cx_pair_cost": "Lit %d/2·+%d%%",
		"cx_ach_title": "★Achieved %d/%d",
		"cx_ach_cost": "Isle Rep ★%d",
		"cx_career_sub": "Hv%d·Mk%d·Cu%d·Od%d",
		"cx_solar_recipe": "Recipe·V x%d",
		"cx_solar_perk": "Perks·V x%d",
		"cx_solar_cnt": "Terms %d/4",
		"cx_solar_title": "★%s (%d/4)",
		"cx_flora_title": "★Flora (%d/2·%d/2)",
		"cx_flora_sub": "%s·Boxes %d",
		"cx_flora_locked": "Isle 2 greenhouse",
		"cx_flora_cost": "Price+%d%%",
		"cx_spa_title": "★Spa Codex (%d/3)",
		"cx_spa_sub": "%s·Guests %d",
		"cx_spa_locked": "Isle 3 spa",
		"cx_cost_price_eff": "+%d%%$·Crew+%d%%",
		"cx_bak_title": "★Bakery (%d/3)",
		"cx_bak_sub": "%s·Guests %d",
		"cx_bak_locked": "Isle 2 bakery",
		"cx_cost_price_spd": "+%d%%$·Speed+%d%%",
		"cx_tea_title": "★Tea Codex (%d/3)",
		"cx_tea_sub": "%s·Guests %d",
		"cx_tea_locked": "Isle 1 tea house",
		"cx_chef_title": "★Chef Codex (%d/3)",
		"cx_chef_sub": "%s·Tasted %d",
		"cx_chef_locked": "Isle 2 chef hall",
		"cx_cost_price_medal": "+%d%%$·Medal %d",
		"cx_auc_title": "★Auction (%d/3)",
		"cx_auc_sub": "Lots %d·Fish %d",
		"cx_auc_locked": "Isle 3 harbor",
		"cx_cost_price_gavel": "+%d%%$·Gavel %d",
		"cx_cin_title": "★Cinema (%d/3)",
		"cx_cin_sub": "Dairy %d/3·Show %d",
		"cx_cin_locked": "Dairy & cinema",
		"cx_sp_title": "★Sports (%d/3)",
		"cx_sp_sub": "Pots %d/3·Events %d",
		"cx_sp_locked": "Kiln & sports day",
		"cx_cost_price_ribbon": "+%d%%$·Ribbon %d",
		"cx_kt_title": "★Kites (%d/3)",
		"cx_kt_sub": "Seasons %d/4·Kites %d",
		"cx_cost_price_full": "+%d%%$·Full Sky %d",
		"cx_pt_title": "★Photos (%d/%d)",
		"cx_pt_sub": "Stamps %d·Pics %d",
		"cx_cost_price_wish": "+%d%%$·Wish %d",
		"cx_sw_title": "★Weather (%d/%d)",
		"cx_sw_sub": "Birthday %d/%d·Party %d",
		"cx_cost_price_family": "+%d%%$·Family %d",
		"bp_today_title": "★%s's birthday!",
		"bp_fav": "Fav: %s%s",
		"bp_in_stock": " (in stock)",
		"bp_no_stock": " (none)",
		"bp_isle_date": "Isle day %s",
		"bp_gift_done": "★Gift delivered",
		"bp_gift_fav": "Favourite: %s",
		"bp_gift_gold": "Gold gift box",
		"bp_gift_claimed": "Rep+%d V+%d claimed",
		"bp_gift_for": "★Gift for %s",
		"bp_gift_box": "Box %dG%s",
		"bp_gift_plus_fav": " +favourite",
		"bp_gift_go": "Rep+%d V+%d Give now!",
		"bp_gift_short": "Need %dG",
		"bp_none_title": "★No birthday today",
		"bp_days": "Days 3/8/13/18/23/28",
		"bp_gift_title": "★Gift",
		"bp_gift_only": "Only on the birthday",
		"bp_next_cost": "Next: %s",
		"bp_next_title": "★Next: %s",
		"bp_next_sub": "%s (in %d days)",
		"bp_fav_cost": "Fav: %s",
		"bp_back_sub": "Parties %d·Photo %d",
		"cd_fw_title": "★Food Week",
		"cd_fw_sub": "Judge %s·%s",
		"cd_fw_go": "Enter a dish!",
		"cd_fw_cost": "%d/%d·Best %d",
		"cd_fr_title": "★Bonds",
		"cd_fr_sub": "Bond Lv %d/%d",
		"cd_fr_cost": "Price +%.1f%%",
		"cd_back_staff": "Back to list",
		"cx_fw_title": "★Food Week %d/%d",
		"cx_fw_sub": "Bonds %d·Max %d",
		"cx_fw_cost": "+%.1f%%$·Medals %d",
		"drawer_food_week": "[Food Week] An islander judge scores your dishes each week",
		"drawer_friendship": "[Bonds] Wishes, birthdays and food week deepen friendships",
		"fw_judge_title": "★Judge: %s",
		"fw_judge_sub": "Likes %s · Bond Lv.%d",
		"fw_judge_cost": "%d days left",
		"fw_entry_title": "★Enter a dish",
		"fw_entry_match": " (liked)",
		"fw_entry_cost": "About %d points · %d left",
		"fw_entry_full": "★All entries in",
		"fw_entry_full_sub": "%d dishes judged",
		"fw_entry_next_week": "New judge next week",
		"fw_entry_none": "No dish on the shelf",
		"fw_entry_none_cost": "Stock a dish first",
		"fw_score_title": "★Best this week: %d",
		"fw_score_none": "★No entry yet",
		"fw_score_medal": "Medal: %s",
		"fw_score_no_medal": "No medal yet",
		"fw_score_cost": "Medals at %d/%d/%d",
		"fw_back_sub": "Entries %d·Medals %d",
		"fr_isl_title": "%s Lv.%d",
		"fr_isl_sub": "Bond %d/%d",
		"fr_isl_max": "Bond maxed",
		"fr_isl_cost": "Price +%.1f%%",
		"fr_back_sub": "Total Lv.%d",
		"bn_fw_scored": "★%s gave [%s] %d points! Rep+%d%s",
		"bn_fw_scored_voucher": " Vouchers+%d",
		"bn_fw_scored_medal": " ★%s medal",
		"bn_fr_level_up": "★Your bond with %s reached Lv.%d! +%.1f%% sale price per level",
		"bn_fw_full": "All %d entries are in. A new judge arrives in %d days",
		"bn_fw_no_dish": "No dish on the market shelf yet: craft one and stock it first",
		"bn_fw_judge": "★Judge %s likes %s: taste match +%d, +%d per bond level",
		"bn_fw_rules": "★Up to %d dishes a week. Medal vouchers: silver +%d, gold +%d",
		"bn_fr_islander": "★%s Lv.%d: wish +%d, gift +%d, dish +%d bond points; +%.1f%% price per level",
		"bn_cx16": "★Food Week: %d/%d dishes, %d gold / %d medals, bonds Lv.%d, price +%.1f%%",
		"ft_food_week": "★%s scored %d! Rep+%d%s",
		"wb_back_sub": "Granted %d·Medal %d",
		"bn_career": "★Career: %d/%d achievements · %s",
		"bn_codex": "★Codex bonus: all prices +%d%% for good (+10%% per crop or dish)",
		"bn_amber_short": "Not enough Amber (need %d) · complete airship orders!",
		"bn_air_load": "★Loaded +%d · progress: %s (full = Amber & Rare Voucher)",
		"bn_air_away": "★The airship is on its way · docks at the east pier in %ds!",
		"bn_voucher_redeem": "★1 Rare Voucher used: seasonal [%s] lit! Codex prices up for good!",
		"bn_solar_advance": "★Solar term now [%s] · seasonal [%s] x1.45!",
		"bn_gh_need_isle": "Fix Bridge 1 in [Islands] to open Isle 2, then build the greenhouse!",
		"bn_gh_cost": "[Cloud Greenhouse] costs %dG!",
		"bn_sv_need": "Open Isle 2 and spend %dG on the [Cloud Greenhouse] to grow rare flora!",
		"bn_sv_packed": "★Packed [%s] x1 (stock %d) · collectors are on their way!",
		"bn_sv_need_items": "★A gift box needs 1 flora + 1 dish (flora x%d · boxes x%d)!",
		"bn_gh_cycle": "★Greenhouse now grows [%s] (%s) · %d boxes sold!",
		"bn_cx5_locked": "★Flora codex: build the Isle 2 greenhouse, breed flora & pack gift boxes!",
		"bn_hs_need_isle": "Fix Bridge 2 in [Islands] to open Isle 3, then build the spa!",
		"bn_hs_cost": "[Cloud Spa] costs %dG!",
		"bn_hb_need": "Open Isle 3 and spend %dG on the [Cloud Spa] to brew baths!",
		"bn_hb_brewed": "★Brewed [%s] x1 (stock %d) · crew refreshed, VIP guests coming!",
		"bn_hb_cycle": "★Spa now brews [%s] · add greens & flora to speed it up!",
		"bn_cx6_cycle": "★Spa bath set to [%s] (%s) · %d VIP guests served!",
		"bn_cx6_locked": "★Spa codex: build the Isle 3 spa, brew herb & petal baths for crew and VIPs!",
		"bn_wm_need_isle": "Fix Bridge 1 in [Islands] to open Isle 2, then build the bakery!",
		"bn_wm_cost": "[Windmill Bakery] costs %dG!",
		"bn_wp_need": "Open Isle 2 and spend %dG on the [Windmill Bakery]!",
		"bn_wp_baked": "★Fresh [%s] x1 (bread %d) · selling hot at the parade!",
		"bn_cx7_cycle": "★Bakery now bakes [%s] (%s) · %d paraders served!",
		"bn_cx7_locked": "★Bakery codex: build the Isle 2 bakery, bake bread, start the parade!",
		"bn_tp_cost": "[Cloud Tea House] costs %dG!",
		"bn_tm_need": "Spend %dG to build the [Cloud Tea House] on Isle 1!",
		"bn_tm_brewed": "★New tea [%s] x1 (tea %d) · selling 1.38x at the tea party!",
		"bn_cp_need_isle": "Open Isle 2 via Bridge 1 first, then build the [Chef Hall]!",
		"bn_cp_cost": "[Chef Hall] costs %dG!",
		"bn_wl_on": "★Lantern Festival on (%ds) · click drifting lanterns to make a wish!",
		"bn_cx9_cycle": "★Chef Hall features [%s] (%s) · %d tastings!",
		"bn_cx9_locked": "★Chef codex: build the Chef Hall on Isle 2 · pass all 3 dishes for a medal!",
		"bn_lh_need_isle": "Open Isle 3 via Bridge 2 first, then build the [Harbor]!",
		"bn_lh_cost": "[Lighthouse Harbor] costs %dG!",
		"bn_au_need_harbor": "★The auction is held at the Isle 3 [Harbor] · build it first!",
		"bn_au_leading": "★You lead with %d%s · wait for the gavel!",
		"bn_au_poor": "★A bid needs %d%s · not enough funds!",
		"bn_dw_cost": "[Cloud Ranch Dairy] costs %dG!",
		"bn_cin_cost": "[Starry Cinema] costs %dG!",
		"bn_cin_snack": "★Snacks sold +%dG (%s)",
		"bn_cin_soldout": "★Snacks sold out · Dairy pudding & milk make cinema snacks!",
		"bn_cin_night_only": "★The cinema runs at night only · 3 films from nightfall in %ds!",
		"bn_pk_need_isle": "[Pottery Kiln] sits on Isle 3 · open Isle 3 first!",
		"bn_pk_cost": "[Pottery Kiln] costs %dG!",
		"bn_sp_on": "★Sports Day on · %s · crowd prices %sx · %ds left",
		"bn_sp_need": "★Sports Day needs 2+ worker kinds on Isle 1 (bunny/otter/fox/shiba)!",
		"bn_kt_on": "★Kite Festival · %s · output/sales x%.2f/x%.2f · %d kites left in the sky · %ds",
		"bn_season_info": "★Seasons: month %d = %s (N. hemisphere) · %d [%s] · %s +%d%%",
		"bn_pt_on": "★Photo tour · stop %d/%d · %d photos · %s",
		"bn_pt_none": "★No photo spots open right now!",
		"bn_sw_info": "★[%s] %s · next %dm · %s",
		"bn_bd_info": "★Birthdays: give a gift on the day for Rep & Vouchers · all %d = Family Photo",
		"bn_bd_gold": "★A gift costs %dG · not enough gold!",
		"bn_bd_already": "★Today's gift has already been given!",
		"bn_bd_not_today": "★Gifts only on the birthday · next: %s (in %d days)",
		"bn_bd_calendar": "★1 month = 1 isle year · Bunny 3 Otter 8 Fox 13 Shiba 18 Penguin 23 Toucan 28",
		"bn_bd_islander": "★%s: birthday on day %d · loves %s (in stock = fav gift Rep+%d V+%d)",
		"bn_cx15": "★Sky codex: weathers %d/%d · feted %d/%d · parties %d · photos %d",
		"bn_wb_info": "★Wish Board: help islanders for Rep & Vouchers",
		"bn_wish_note": "%s's %s (%s): %s · %s",
		"bn_cx14": "★Photo codex: %d/%d photos (%d spots x normal/superb) · stamps %d · wish medals %d",
		"bn_cx13": "★Kite codex: kites %d/3 · seasons %d/4 · reeled %d · full-sky medals %d",
		"bn_cx12": "★Sports codex: events %d/3 · pottery %d/3 · held %d · gold ribbons %d",
		"bn_cx11": "★Cinema codex: films %d/3 · dairy %d/3 · shows %d · cinephile medals %d",
		"bn_cx10": "★Auction codex: won %d/3 · items %d · gavel medals %d · harbor fish %d",
		"bn_cx10_locked": "★Auction codex: build the Isle 3 harbor and win all 3 auction lots!",
		"bn_cx8_cycle": "★Tea house now brews [%s] (%s) · %d tea guests served!",
		"bn_cx8_locked": "★Tea codex: build the tea house on Isle 1 and host the moonlit tea party!",
		"wl_gift_bag": "★Wish Bag",
		"wl_airship": "★Caravan",
		"wl_airship_on": "★Ship%d/%d(+%dA+%dV)",
		"wl_parade": "★Food Parade",
		"wl_parade_on": "★Food Parade(%ds)",
		"wl_moontea": "★Moon Tea Boat",
		"wl_moontea_on": "★Moon Tea(%ds)",
		"wl_lantern": "★Lanterns",
		"wl_lantern_on": "★Lanterns(%ds)",
		"wl_sports": "★Sports Day",
		"wl_sports_idle": "★Sports",
		"wl_sports_gather": "★Sports·March(%ds)",
		"wl_sports_award": "★Ribbon·%s",
		"wl_sports_event": "★Sport·%s %d/%d",
		"wl_kite": "★Kite Fest",
		"wl_kite_on": "★Kites·%s x%.2f %ds %d/%d",
		"wl_cp_init": "★Dumpling",
		"wl_cp_unbuilt": "Unbuilt",
		"wl_cp_cost": "Build %dG",
		"wl_seg_medal": "·M%d",
		"wl_seg_tasted": "·%d/3",
		"wl_gh_init": "★Star Lily",
		"wl_gh_unbuilt": "Unbuilt",
		"wl_seg_box": "·Box%d",
		"wl_gh_cost": "Build %dG",
		"wl_hs_init": "★Spa·Herb",
		"wl_hs_unbuilt": "Unbuilt",
		"wl_seg_bath": "·%d",
		"wl_hs_cost": "Build %dG",
		"wl_tp_init": "★Tea·Longjing",
		"wl_tp_unbuilt": "Unbuilt",
		"wl_seg_tea": "·T%d",
		"wl_seg_leaf": "·L%d",
		"wl_tp_cost": "Build %dG",
		"wl_wm_init": "★Bakery·Bun",
		"wl_wm_unbuilt": "Unbuilt",
		"wl_seg_bread": "·B%d",
		"wl_seg_flour": "·F%d",
		"wl_wm_cost": "Build %dG",
		"wl_dw_init": "★Dairy",
		"wl_dw_unbuilt": "Unbuilt",
		"wl_seg_milk": "·%d",
		"wl_dw_cost": "Build %dG",
		"wl_lh_init": "★Harbor",
		"wl_au_init": "★Auction",
		"wl_lh_cost": "★Harbor(%dG)",
		"wl_au_open": "Bid %d%s?",
		"wl_au_now": "%d%s·%s",
		"wl_lh_lv": "★Port Lv.%d·%d",
		"wl_au_on": "★Lot%d/%d·%s(%ds)",
		"wl_cin_init": "★Sky Cinema",
		"wl_cin_cost": "★Cinema(%dG)",
		"wl_cin_on": "★Film%d/%d·%s %ds",
		"wl_cin_break": "★Snacks·%ds",
		"wl_cin_done": "★Done·%d shows",
		"wl_pk_init": "★Kiln",
		"wl_pk_unbuilt": "Unbuilt",
		"wl_seg_clay": "·C%d",
		"wl_seg_nofuel": "·dry",
		"wl_pk_cost": "Build %dG",
		"bn_w_gh_cost": "[Cloud Greenhouse] costs %dG!",
		"bn_w_wm_cost": "[Windmill Bakery] costs %dG!",
		"bn_w_tp_cost": "[Cloud Tea House] costs %dG!",
		"bn_w_cp_cost": "[Chef Hall] costs %dG!",
		"bn_w_hs_cost": "[Cloud Spa] costs %dG!",
		"bn_w_lh_cost": "[Lighthouse Harbor] costs %dG!",
		"bn_w_dw_cost": "[Cloud Ranch Dairy] costs %dG!",
		"bn_w_cin_cost": "[Starry Cinema] costs %dG!",
		"bn_w_pk_cost": "[Pottery Kiln] costs %dG!",
		"bn_w_lh_info": "★Harbor: boats out in shifts · fish %d · auction in %ds!",
		"bn_w_dw_nofeed": "★Dairy: no fresh crops for the cows · milk again after the next harvest!",
		"bn_w_cin_info": "★Cinema: %d/3 shows tonight · %d viewers x %dG tickets · dairy treats make snacks!",
		"bn_w_pk_info": "★Kiln: clay %d%s",
		"bn_w_pk_nofuel": " · no straw fuel (no harvested crops)",
		"bn_w_pk_hint": " · harvests dig up clay; bowl 1 clay / vase 2 clay",
		"bn_w_kite_sweep": "★Full Sky! All %d kites in · Full-Sky Medal x%d · +%d Amber +%d Voucher!",
		"bn_w_kite_got": "★Reeled in [%s] +%dG%s · %s wind boost · %d left",
		"bn_w_air_need": "★Airship order: %s · reward +%s Amber +%s Rare Voucher!",
		"ft_gift_bag": "★Wish Bag +%dG +%d Amber · rush 15s!",
		"ft_w_packed": "★Packed [%s] x1 (stock %d)",
		"ft_w_gh_cycle": "★Greenhouse: [%s]",
		"ft_w_parade": "★Food parade! Fresh bread sells at 1.75x~1.90x!",
		"ft_w_baked": "★Baked [%s] x%d (bread %d)",
		"ft_w_milled": "★Milled [Cloud Flour] +%d (flour %d)",
		"ft_w_wm_cycle": "★Bakery: [%s]",
		"ft_w_brewed_tea": "★Brewed [%s] x%d (tea %d)",
		"ft_w_roasted": "★Roasted [Mist Buds] +%d (buds %d)",
		"ft_w_tp_cycle": "★Tea house: [%s]",
		"ft_w_cooked": "★Cooked [%s] (dish %d)",
		"ft_w_cp_cycle": "★Chef Hall: [%s]",
		"ft_w_bath": "★Brewed [%s] x1 (bath %d)",
		"ft_w_hs_cycle": "★Spa: [%s]",
		"ft_w_fish_shipped": "★Fish to stall +%d",
		"ft_w_dairy_made": "★Made [%s] (stock %d)",
		"ft_w_milked": "★Milked +%d (fed %s)",
		"ft_w_snack": "★Snacks +%dG",
		"ft_w_fired": "★Fired [%s] (stock %d)",
		"ft_w_air_load": "★Loaded +%d (%s/%s)",
		"ft_contract_done": "★Royal order done! +%dG +%d Amber",
		"ft_voucher_recipe": "★Voucher lit [%s] +1 on the stall!",
		"ft_four_seasons_perk": "★Four-season feast perk +%d Amber +%dG!",
		"ft_airship_done": "★Airship order done! +%dG +%d Amber +%d Voucher!",
		"ft_landscape": "★Unlocked [%s]!",
		"ft_gh_open": "★Greenhouse open! Growing [Star Lily]!",
		"ft_flora_bred": "★Hybrid bred: [%s]!",
		"ft_hs_open": "★Spa open! [Mugwort Bath] refreshes the crew!",
		"ft_bath_recipe": "★New bath: [%s]!",
		"ft_wm_open": "★Windmill Bakery open! Bakery aura on (stall & shops 1.22x+)!",
		"ft_bake_recipe": "★New bake: [%s]!",
		"ft_tp_open": "★Tea House open! Calm aura on (crew speed & tips up)!",
		"ft_tea_recipe": "★New tea: [%s]!",
		"ft_moontea_open": "★Moonlit tea party! Tea & dishes x1.38!",
		"ft_moontea_need": "Build the [Cloud Tea House] (%dG) first!",
		"ft_moontea_reward": "★Tea boat reward! +%d Amber +%d Voucher +%d Rep (x1.38)!",
		"ft_lantern_open": "★Lantern Festival! Wish lanterns drift in · market x1.30!",
		"ft_wish_granted": "★Wish granted! ",
		"ft_lantern_wish": "★Lantern wish! ",
		"ft_lantern_reward": "+%dG +%d Amber +%d Voucher",
		"ft_cp_open": "★Chef Hall open! Cook signature dishes from 3 isles!",
		"ft_tasting_pass": "★Passed [%s] %d pts!",
		"ft_tasting_fail": "Failed [%s] %d/%d pts",
		"ft_lh_open": "★Lighthouse lit! 2 boats fish in shifts!",
		"ft_boat_back": "★Boat back +%d fish",
		"ft_auction_open": "★Auction opens!",
		"ui_unsold": "Unsold",
		"ft_au_won": "★Won [%s] %d%s!",
		"ft_au_lost": "Sold: [%s] to %s",
		"ft_dw_open": "★Dairy open! Greens feed the cloud cows!",
		"ft_cin_open": "★Cinema screen up! Films start at nightfall!",
		"ft_film_start": "★Now showing %s",
		"ft_cin_medal": "★Cinephile Medal! ",
		"ft_cin_end": "★Show over ",
		"ft_cin_audience": "%d viewers · Tickets +%dG",
		"ft_cin_snack": " · Snacks +%dG",
		"ft_pk_open": "★Kiln lit! Harvest clay + straw make bowls & vases!",
		"ft_sp_open": "★Sports Day! %d teams march in · crowd prices %.2fx!",
		"ft_sp_event_start": "★%s begins!",
		"ft_sp_event_win": "★%s won by %s · +%dG",
		"ft_kite_open": "★Kite Festival! %d kites fly on a %s · wind boosts sales!",
		"ft_pt_start": "★Photo tour departs! %d stops",
		"ft_photo": "Click! [%s] +%dG%s",
		"ft_photo_special": " ★Superb",
		"ft_wish_done": "★%s's wish granted! Rep+%d Voucher+%d%s",
		"ft_wish_medal": " ★Wish Medal",
		"ft_bday": "★Happy birthday, %s! Rep+%d Voucher+%d%s",
		"ft_bday_medal": " ★Family Photo",
		"ft_achievement": "★Achievement [%s]!",
		"gm_career": "★%d · Harvests %d · Crafts %d · Customers %d · Orders %d",
		"gm_wish_reward": "Rep+%d V+%d",
		"gm_wish_left": " %ds left",
		"gm_wish_done_title": "★%s's wish came true!",
		"gm_wish_claimed": " claimed",
		"gm_wish_expired_title": "★%s's note expired",
		"gm_wish_new_in": "New note in %ds",
		"gm_wish_void": " expired",
		"ft_pet_boost": "★Pumped! Speed up 8s!",
		"ft_tag_fresh": "Fresh sale+",
		"ft_tag_divert": "Direct sale+",
		"ft_tag_mortar": "3.5x dish+",
		"ft_tag_cross": "Cross-isle+",
		"ft_tag_feast": "52x feast+",
		"ft_tag_nectar": "12x nectar+",
		"ft_tea_guest": "★Tea guest sips! +%dG +%d Amber%s!",
		"ft_wait_tea": "...waiting for tea",
		"ft_parade_guest": "★Parade rush! +%dG +%d Amber%s!",
		"ft_wait_bread": "...waiting for bread",
		"ft_spa_guest": "★VIP soak! +%dG +%d Amber%s!",
		"ft_wait_bath": "...waiting for a bath",
		"ft_collector": "★Collector's box! +%dG +%d Amber%s!",
		"ft_wait_box": "...waiting for gift boxes",
		"ft_trader": "★Trader bought x%d +%d Amber +%dG!",
		"ft_no_surplus": "...no spare crops",
		"ft_critic": "★Critic's praise! Prices & tips up!",
		"ft_wait_dish": "...waiting for dishes",
		"ft_vip_tip": "★VIP 2x tip!",
		"ft_sold_out_leave": "...sold out, leaving",
		"ft_milestone": "★Milestone Lv.%d!",
		"wl_badge": "%s%s",
		"wl_au_you": "You"
	},
	"ja_JP": {
		"lang_badge": "[日本語]",
		"tab_build": "施設強化",
		"tab_animal": "動物編成",
		"tab_expand": "開拓造景",
		"tab_codex": "山海図鑑",
		"tab_companion": "★最前面",
		"tab_window": "★通常窓",
		"drawer_build": "【施設強化】陶窯・乳工房・漁港・食神席・製茶坊・温室・温泉・風車＆25Lv進化！",
		"drawer_animal": "【動物編成】撫でて加速・Lv.10/25/50で専門特性解放！",
		"drawer_expand": "【開拓・祭典】木橋・遠洋・十一の祭典・観光ツアー・願い掲示板・雲海天気・誕生日会！",
		"drawer_codex": "【山海図鑑】%d/8 種の食材と料理を解放・販売価格 +%d%%！",
		"drawer_codex_full": "【山海図鑑】料理 %d/8 · 節気 %d/4(%s) · 図鑑券 %d · 勲章 %d/%d",
		"drawer_codex_ci5": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·勲章 %d/%d",
		"drawer_codex_ci6": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·勲%d/%d",
		"drawer_codex_ci7": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·勲%d/%d",
		"drawer_codex_ci8": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·勲%d/%d",
		"drawer_codex_ci9": "【山海図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·勲%d/%d",
		"drawer_codex_ci10": "【図鑑】食%d/8·節%d/4(%s)·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·競%d/3·勲%d/%d",
		"drawer_codex_ci11": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·競%d/3·乳%d/3·映%d/3·勲%d/%d",
		"drawer_codex_ci12": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·競%d/3·乳%d/3·映%d/3·陶%d/3·運%d/3·勲%d/%d",
		"drawer_codex_ci13": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3\n競%d/3·乳%d/3·映%d/3·陶%d/3·運%d/3·凧%d/3·季%d/4·勲%d/%d",
		"drawer_codex_ci14": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3\n競%d/3·乳%d/3·映%d/3·陶%d/3·運%d/3·凧%d/3·季%d/4·写%d/6·勲%d/%d",
		"drawer_wish_board": "【願い掲示板】願いを %d 件叶えるごとに願いの勲章",
		"drawer_codex_ci15": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·競%d/3
乳%d/3·映%d/3·陶%d/3·運%d/3·凧%d/3·季%d/4·写%d/6·天%d/4·誕%d/6·勲%d/%d",
		"drawer_birthday": "【誕生日会】島暦の毎月 3/8/13/18/23/28 日",
		"medal_prog": "勲章 %d/%d",
		"bn_kite_start": "★雲海凧祭り開幕！凧%d枚が西島・東島の空に・クリックで回収・%s",
		"bn_kite_swept": "★凧で満天！%d枚すべて回収・勲章x%d",
		"bn_kite_end": "★凧祭り閉幕・%d/%d枚回収・次回は%ds後",
		"bn_season": "★島が%sの装い【%s】・%s +%d%%",
		"ui_weather_mult": "客足x%.2f 畑x%.2f 工房x%.2f 売値x%.2f",
		"bn_sky_weather": "★雲海の天気【%s】%s・%d分ごとに変化",
		"bn_bday_gift": "★%sに誕生日の贈り物! 名声+%d 図鑑券+%d%s%s",
		"bn_bday_gift_fav": "・好物【%s】",
		"bn_bday_gift_medal": " ★誕生日の記念写真!",
		"bn_photo_start": "★撮影ツアー出発! %dか所: %s・客足x%s",
		"bn_photo_first_amber": "・初撮影+%d琥珀",
		"bn_photo_first_voucher": "・絶景初撮影+%d図鑑券",
		"bn_photo_taken": "%s【%s】を写真図鑑へ +%dG%s",
		"bn_photo_special": "★絶景! ",
		"bn_photo_click": "パシャ! ",
		"bn_photo_end_stamp": "★ツアー帰還! %d枚撮影・スタンプx%d +%d図鑑券",
		"bn_photo_end": "★ツアー帰路・%d枚撮影 (1回%d枚でスタンプ)",
		"bn_wish_done": "★%sの%sが叶った! 名声+%d 図鑑券+%d%s",
		"bn_wish_medal": " ★願いの勲章!",
		"bn_kiln_open": "★陶芸窯に火入れ！収穫の陶土と藁で茶碗・花瓶を焼き市場へ!",
		"bn_sports_start": "★秋の運動会開幕！%dチームが蓮池コースへ・リレー/綱引き/運搬・観客売値%sx!",
		"bn_sports_event": "★運動会%s 順位: %s・賞金+%dG・運動会図鑑%d/3",
		"bn_sports_end": "★運動会閉幕！優勝【%s】金リボンx%d・優勝チーム加速・+琥珀 +図鑑券!",
		"bn_dairy_open": "★乳工房完成！青草で雲牛の乳しぼり・チーズとプリンを市場と食神席へ!",
		"bn_cinema_open": "★星空シネマ完成！夜市で3本連続上映・チケットと軽食・夜市売値%sx!",
		"bn_cinema_film": "★映画%s終映・観客%d人・チケット+%dG%s・シネマ図鑑%d/3",
		"bn_seg_snack": "・軽食+%dG",
		"bn_cinema_medal": "★一夜で3本上映！【星空映画通勲章】x%d・+琥珀 +図鑑券!",
		"bn_harbor_open": "★灯台漁港に灯り！漁船2隻が交代で出漁・市場と食神席へ・競売まもなく!",
		"bn_auction_start": "★名物競売開始(%d品)！最初【%s】%d%sから・灯台かカードで入札!",
		"ui_cur_amber": "琥珀",
		"bn_auction_won": "★落札！%d%sで【%s】獲得・名物人気%sx・競売図鑑%d/3",
		"bn_auction_lost": "落札:【%s】は%sが%d%sで落札・次の品へ!",
		"bn_auction_pass": "【%s】は流札",
		"bn_auction_end": "★競売終了：%d/3品落札%s",
		"bn_auction_end_gavel": "・【名物金槌勲章】獲得!",
		"bn_auction_end_next": "・次回は%ds後",
		"bn_lantern_start": "★星灯流し開幕(%ds)！願い灯籠をクリックで琥珀と図鑑券・売値1.30x!",
		"bn_lantern_claim": "★星灯の願い #%d: +%dG +%d琥珀 +%d図鑑券%s",
		"bn_lantern_granted": "・願い成就! 祭り6s延長",
		"bn_tasting_unlock": "★食神席の新レシピ【%s】解放・三島の食材で特級料理を!",
		"bn_tasting_pass": "★品評合格【%s】%d点: +%dG +%d琥珀%s・食神図鑑%d/3",
		"bn_seg_voucher": " +%d図鑑券",
		"bn_seg_amber": " +%d琥珀",
		"bn_tasting_fail": "品評不合格【%s】%d/%d点・食神席強化か星灯流し中に加点!",
		"bn_chef_medal": "★特級料理3品すべて合格！【山海食神勲章】x%d・図鑑11枚目点灯!",
		"bn_tea_unlock": "★茶房の秘伝解放！【%s】・清心オーラと図鑑売値UP!",
		"bn_moontea_start": "★月夜の画舫茶会開幕(%ds)！茶と料理の売値1.38x・画舫クリックで褒賞!",
		"bn_moontea_settle": "★画舫で品茗【%s】: %s+%d琥珀%s・名声+%d!",
		"bn_bakery_unlock": "★パン工房の秘伝！【%s】・パンのオーラと図鑑売値UP!",
		"bn_parade_start": "★山車パレード開幕(%ds)！客が焼きたてパンを1.75x~1.90xで購入!",
		"bn_parade_settle": "★パレード客が【%s】を堪能: +%dG +%d琥珀%s・名声+%d!",
		"bn_spa_unlock": "★湯屋の秘伝！癒しの湯【%s】・全員の気力オーラと図鑑UP!",
		"bn_spa_settle": "★VIP湯客が【%s】に満足: +%dG +%d琥珀%s・名声+%d!",
		"bn_flora_unlock": "★温室で交配成功！珍花【%s】誕生・島オーラと図鑑売値UP!",
		"bn_souvenir_sold": "★収集家が【%s】を購入！+%dG・+%d琥珀・名声+%d!",
		"bn_airship_done": "★飛行船の大口注文完了！+%dG・+%d琥珀・+%dレア図鑑券!",
		"bn_solar_term": "★節気が【%s】に・旬の【%s】売値1.45x・%s",
		"bn_acclaim": "★美食評論家が絶賛！「金の評判」%ds: 売値+25%% & チップ+20%%!",
		"bn_fireworks": "★花火灯会開幕(%ds)！灯籠が灯り客が殺到・富豪と行商が増加!",
		"bn_pomodoro": "★集中達成！「★集中の朝露ギフト」: +%dG & 全島2.0x加速 %ds!",
		"ui_dur_hm": "%d時間%d分",
		"ui_dur_ms": "%d分%d秒",
		"ui_dur_s": "%d秒",
		"bn_offline": "★おかえり！離席%s・収穫%d個・自動収益+%dG (図鑑+%d%%)",
		"bn_emp_info": "%s (%s)・特性【%s】%s・勲章%d/3 (Lv.10/25/50で昇格)",
		"bn_bday_today": "★今日は%sの誕生日!【開拓造景】で贈り物・名声と図鑑券",
		"ui_mute": "[消音]",
		"ui_sound": "[効果音]",
		"ui_focus25": "[集中25m]",
		"ui_noise_off": "[環境:オフ]",
		"ui_noise_on": "[%s]",
		"ui_opacity": "[透過%d%%]",
		"ui_dock": "[タスクバー]",
		"ui_bar_voucher": "券%d",
		"ui_bar_amber": "·珀%d",
		"ui_w_day": "昼",
		"ui_w_dusk": "夕方",
		"ui_w_night": "夜市",
		"ui_w_rain": "小雨",
		"ui_w_lantern": "星灯祭",
		"ui_w_moontea": "画舫茶",
		"ui_w_parade": "山車祭",
		"ui_w_cinema": "映画夜",
		"ui_w_fireworks": "花火夜",
		"ui_w_acclaim": "評判%s",
		"ui_cap_stealth": "放置稼働中・F9かクリックで復帰",
		"ui_cap_restore": "[復帰]",
		"ui_cap_focus": "集中%s・",
		"ui_cap_contract": "契約:%s%d/%d・展開",
		"ui_bar_contract": "契約:%s %d/%d(+%d珀)",
		"ui_bar_stall": "在庫%d・露店%d/%d・図鑑+%d%%",
		"ui_emp_none": " (未採用)",
		"ui_trait_locked": "Lv.10で[%s]",
		"ui_date_md": "%d月%d日",
		"cd_suffix_locked": " (未解放)",
		"cd_b_next_ms": "次の2x進化: Lv.%d",
		"cd_b_need_isle": "木橋で島%dを解放",
		"cd_upgrade": "強化 %dG",
		"cd_isle_locked": "島が未解放",
		"cd_build": "建設 %dG",
		"cd_need_bridge1": "木橋1で島2を解放",
		"cd_need_bridge1b": "木橋1で島2を解放",
		"cd_need_bridge2": "木橋2で島3を解放",
		"cd_gh_locked": "雲上温室 (島2)",
		"cd_gh_new": "雲上温室 (未建設)",
		"cd_gh_sub": "交配の珍花+島オーラ",
		"cd_gh_lv": "雲上温室 Lv.%d",
		"cd_gh_sub_lv": "育成%s・珍花%d",
		"cd_hs_locked": "温泉湯屋 (島3)",
		"cd_hs_new": "温泉湯屋 (未建設)",
		"cd_hs_sub": "湯で気力回復+湯客",
		"cd_hs_lv": "温泉湯屋 Lv.%d",
		"cd_hs_sub_lv": "%s・湯%d",
		"cd_wm_locked": "パン工房 (島2)",
		"cd_wm_new": "パン工房 (未建設)",
		"cd_wm_sub": "製粉とパン+オーラ",
		"cd_wm_lv": "パン工房 Lv.%d",
		"cd_wm_sub_lv": "%s・パン%d",
		"cd_tp_new": "茶房 (未建設)",
		"cd_tp_sub": "製茶+清心オーラ",
		"cd_tp_lv": "茶房 Lv.%d",
		"cd_tp_sub_lv": "%s・茶%d",
		"cd_cp_locked": "食神席(島2)",
		"cd_cp_new": "食神席(未建設)",
		"cd_cp_sub": "三島の食材で特級料理",
		"cd_cp_lv": "食神席 Lv.%d",
		"cd_cp_sub_lv": "%s・料理%d",
		"cd_lh_locked": "灯台漁港(島3)",
		"cd_lh_new": "灯台漁港(未建設)",
		"cd_lh_sub": "漁船2隻で鮮魚漁",
		"cd_lh_lv": "灯台漁港 Lv.%d",
		"cd_lh_sub_lv": "鮮魚%d・漁獲%d",
		"cd_dw_new": "乳工房(未建設)",
		"cd_dw_sub": "牛乳・チーズ・プリン",
		"cd_dw_lv": "乳工房 Lv.%d",
		"cd_dw_sub_lv": "乳%d・チーズ%d・プリン%d",
		"cd_pk_new": "陶芸窯(未建設)",
		"cd_pk_sub": "茶碗・花瓶",
		"cd_pk_need_isle3": "島3が必要",
		"cd_pk_isle3_closed": "島3が未開",
		"cd_pk_lv": "陶芸窯 Lv.%d",
		"cd_pk_sub_lv": "土%d・碗%d・瓶%d",
		"cd_a_need_isle": "新しい島を解放",
		"cd_a_crew": "編成 %d/%d・%s",
		"cd_a_hire": "採用 %dG",
		"cd_a_train": "全員研修 Lv.+1 (%dG)",
		"cd_e_bridge1": "木橋1・密林",
		"cd_e_bridge1_sub": "畑2x+釜12x",
		"cd_e_bridge2": "木橋2・海岸",
		"cd_e_bridge2_sub": "工房52x・富豪2x",
		"cd_unlocked": "解放済み",
		"cd_unlock_g": "%dGで解放",
		"cd_need_isle_n": "島%dを先に解放",
		"cd_lit_active": "発動中",
		"cd_amber_unlock": "琥珀%dで解放",
		"ui_lb_crop": "畑の成長",
		"ui_lb_workshop": "工房速度",
		"ui_lb_tip": "全島チップ",
		"ui_lb_buff": "効果",
		"cd_air_title": "★遠洋注文#%d",
		"cd_air_sub": "積荷%d/%d",
		"cd_air_cost": "積込+%s珀+%s券",
		"cd_air_away": "★商隊航行中",
		"cd_air_away_sub": "四季の料理を準備",
		"cd_air_eta": "約%ds後に入港",
		"cd_sv_title": "★名物みやげ屋",
		"cd_sv_sub": "箱で収集家を誘う",
		"cd_sv_build": "%dGで温室",
		"cd_need_isle2": "島2を解放",
		"cd_need_isle3": "島3を解放",
		"cd_sv_title_lv": "★名物箱(在庫%d)",
		"cd_sv_sub_lv": "珍花x%d・販売%d",
		"cd_sv_cost": "梱包(+珀+名声)",
		"cd_hb_title": "★雲海温泉",
		"cd_hb_sub": "花湯・VIP湯客",
		"cd_hb_build": "%dGで湯屋",
		"cd_hb_title_lv": "★温泉(湯%d)",
		"cd_hb_sub_lv": "気力+%d%%・客%d",
		"cd_hb_cost": "調湯(+珀+チップ)",
		"cd_wp_title": "★風車パン工房",
		"cd_wp_sub": "パン・山車巡行",
		"cd_wp_build": "%dGでパン工房",
		"cd_wp_title_on": "★山車巡行(%ds)",
		"cd_wp_sub_on": "パンx%d・1.88x",
		"cd_wp_cost_on": "焼く(+珀+券)",
		"cd_wp_title_lv": "★パン工房(%d)",
		"cd_wp_sub_lv": "オーラ+%d%%・客%d",
		"cd_wp_cost_lv": "山車祭り開始!",
		"cd_tm_title": "★画舫茶会",
		"cd_tm_sub": "龍井・烏龍・画舫",
		"cd_tm_build": "%dGで茶房",
		"cd_tm_title_on": "★画舫茶会(%ds)",
		"cd_tm_sub_on": "茶x%d・1.38x",
		"cd_tm_cost_on": "淹れる(+珀+券)",
		"cd_tm_title_lv": "★茶房(茶%d)",
		"cd_tm_sub_lv": "清心+%d%%・客%d",
		"cd_tm_cost_lv": "茶会を開く!",
		"cd_wl_title_on": "★星灯祭(%ds)",
		"cd_wl_sub_on": "拾灯%d・売値1.30x",
		"cd_wl_cost_on": "灯籠で珀+券",
		"cd_wl_title": "★星灯流し",
		"cd_wl_sub": "灯籠流し・拾灯%d",
		"cd_wl_cost": "灯籠流し開始!",
		"cd_au_title": "★名物競売",
		"cd_au_sub_locked": "灯台漁港で開催",
		"cd_au_need_harbor": "灯台漁港が必要",
		"cd_au_open": "入札待ち",
		"cd_au_you_lead": "首位",
		"cd_au_lead": "%s首位",
		"cd_au_title_on": "★競売%d/%d(%ds)",
		"cd_au_leading": "首位中",
		"cd_au_bid": "入札 %d%s",
		"cd_au_sub_idle": "収蔵%d・金槌%d",
		"cd_au_cost_idle": "競売開始!",
		"cd_cin_title": "★星空シネマ",
		"cd_cin_sub": "夜の上映・集客",
		"cd_cin_build": "%dGで設営",
		"cd_cin_title_on": "★上映%d/%d(%ds)",
		"cd_cin_sub_on": "%s・客%d",
		"cd_cin_cost_on": "券%dG·%sx",
		"cd_cin_title_open": "★夜市シネマ",
		"cd_cin_sub_open": "今夜%d/3本",
		"cd_cin_cost_open": "軽食を売る",
		"cd_cin_title_idle": "★野外シネマ",
		"cd_cin_sub_idle": "上映%d・勲%d",
		"cd_cin_cost_idle": "%ds後に夜上映",
		"cd_sp_gather": "★運動会・入場",
		"cd_sp_award": "★金リボン授与",
		"cd_sp_sub_on": "%d組・残%ds",
		"cd_sp_cost_on": "観戦売値%sx",
		"cd_sp_title": "★秋の運動会",
		"cd_sp_sub_need": "島1に2種必要",
		"cd_sp_cost_need": "現在%d組",
		"cd_sp_sub_idle": "%d組・金リボン%d",
		"cd_sp_cost_idle": "今すぐ開幕!",
		"cd_kt_title_on": "★凧祭・%s",
		"cd_kt_sub_on": "凧%d/%d・残%ds",
		"cd_kt_cost_on": "産x%.2f 売x%.2f",
		"cd_kt_title": "★雲海凧祭り",
		"cd_kt_sub": "満天勲%d・%ds後",
		"cd_kt_cost": "今すぐ揚げる!",
		"cd_ss_title": "★%sの装い",
		"cd_pt_title_on": "★ツアー%d/%d",
		"cd_pt_sub_on": "写真%d・%s",
		"cd_pt_return": "帰路",
		"cd_pt_cost_on": "客足x%s",
		"cd_pt_title": "★撮影ツアー",
		"cd_pt_sub": "スタンプ%d・%ds後",
		"cd_pt_cost": "今すぐ出発!",
		"cd_wb_title": "★願い掲示板",
		"cd_wb_sub": "便箋%d/%d・叶%d",
		"cd_wb_cost": "名声%d・券%d",
		"cd_sw_title": "★雲海%s",
		"cd_sw_cost": "%d分後に変化",
		"cd_bd_title": "★%sの誕生日",
		"cd_bd_given": "贈呈済・ありがとう!",
		"cd_bd_parties": "誕生会%d回",
		"cd_bd_gift_cost": "贈り物%dG",
		"cd_bd_go": "お祝いへ!",
		"cd_bd_card_title": "★島民誕生会",
		"cd_bd_next": "次は%s",
		"cd_bd_days": "%d日後",
		"cd_back_list": "開拓一覧へ戻る",
		"cx_tier1": "一段・朝露の園",
		"cx_tier2": "二段・果香パン",
		"cx_tier3": "三段・密林の星露",
		"cx_tier4": "四段・雲海の宴",
		"cx_unk_crop": "???(作物)",
		"cx_unk_dish": "???(料理)",
		"cx_pair_cost": "点灯%d/2・+%d%%",
		"cx_ach_title": "★実績(%d/%d)",
		"cx_ach_cost": "島の名声 ★%d",
		"cx_career_sub": "収%d·製%d·客%d·契%d",
		"cx_solar_recipe": "レシピ・券x%d",
		"cx_solar_perk": "特典・券x%d",
		"cx_solar_cnt": "節気 %d/4",
		"cx_solar_title": "★節気:%s(%d/4)",
		"cx_flora_title": "★珍花箱(%d/2・%d/2)",
		"cx_flora_sub": "育成%s・箱%d",
		"cx_flora_locked": "島2の温室で育成",
		"cx_flora_cost": "売値+%d%%",
		"cx_spa_title": "★霊泉湯鑑(%d/3)",
		"cx_spa_sub": "湯:%s・客%d",
		"cx_spa_locked": "島3に湯屋を建設",
		"cx_cost_price_eff": "+%d%%価・+%d%%効",
		"cx_bak_title": "★パン図鑑(%d/3)",
		"cx_bak_sub": "焼:%s・客%d",
		"cx_bak_locked": "島2にパン工房",
		"cx_cost_price_spd": "+%d%%価・+%d%%速",
		"cx_tea_title": "★茶図鑑(%d/3)",
		"cx_tea_sub": "茶:%s・客%d",
		"cx_tea_locked": "島1に茶房を建設",
		"cx_chef_title": "★食神図鑑(%d/3)",
		"cx_chef_sub": "宴:%s・品評%d",
		"cx_chef_locked": "島2に食神席を建設",
		"cx_cost_price_medal": "+%d%%価・勲%d",
		"cx_auc_title": "★競売図鑑(%d/3)",
		"cx_auc_sub": "収蔵%d・鮮魚%d",
		"cx_auc_locked": "島3に灯台漁港",
		"cx_cost_price_gavel": "+%d%%価・槌%d",
		"cx_cin_title": "★シネマ図鑑(%d/3)",
		"cx_cin_sub": "乳%d/3・上映%d",
		"cx_cin_locked": "乳工房とシネマ",
		"cx_sp_title": "★運動会図鑑(%d/3)",
		"cx_sp_sub": "陶%d/3・競技%d",
		"cx_sp_locked": "陶芸窯と運動会",
		"cx_cost_price_ribbon": "+%d%%価・リボン%d",
		"cx_kt_title": "★凧図鑑(%d/3)",
		"cx_kt_sub": "季節%d/4・凧%d",
		"cx_cost_price_full": "+%d%%価・満天%d",
		"cx_pt_title": "★写真図鑑(%d/%d)",
		"cx_pt_sub": "スタンプ%d・撮影%d",
		"cx_cost_price_wish": "+%d%%価・願%d",
		"cx_sw_title": "★雲海の天気(%d/%d)",
		"cx_sw_sub": "誕生%d/%d・祝%d",
		"cx_cost_price_family": "+%d%%価・記念%d",
		"bp_today_title": "★今日は%sの誕生日!",
		"bp_fav": "好物: %s%s",
		"bp_in_stock": "(在庫あり)",
		"bp_no_stock": "(在庫なし)",
		"bp_isle_date": "島暦 %s",
		"bp_gift_done": "★贈り物を届けた",
		"bp_gift_fav": "好物: %s",
		"bp_gift_gold": "金貨ギフト",
		"bp_gift_claimed": "名声+%d 券+%d 受取済",
		"bp_gift_for": "★%sへ贈り物",
		"bp_gift_box": "ギフト%dG%s",
		"bp_gift_plus_fav": " +好物",
		"bp_gift_go": "名声+%d 券+%d 今すぐ贈る!",
		"bp_gift_short": "金貨不足 %dG必要",
		"bp_none_title": "★今日は誕生日なし",
		"bp_days": "毎月3/8/13/18/23/28日",
		"bp_gift_title": "★贈り物",
		"bp_gift_only": "誕生日当日のみ",
		"bp_next_cost": "次は: %s",
		"bp_next_title": "★次は: %s",
		"bp_next_sub": "%s (%d日後)",
		"bp_fav_cost": "好物: %s",
		"bp_back_sub": "誕生会%d回・記念%d",
		"cd_fw_title": "★美食評価週間",
		"cd_fw_sub": "審査%s・%s",
		"cd_fw_go": "出品する!",
		"cd_fw_cost": "%d/%d回・最高%d",
		"cd_fr_title": "★島民の絆",
		"cd_fr_sub": "絆Lv.%d/%d",
		"cd_fr_cost": "売値+%.1f%%",
		"cd_back_staff": "動物編成に戻る",
		"cx_fw_title": "★美食評価(%d/%d)",
		"cx_fw_sub": "絆Lv.%d・親友%d",
		"cx_fw_cost": "+%.1f%%価・メダル%d",
		"drawer_food_week": "【美食評価週間】毎週の島民審査員が料理を味で採点",
		"drawer_friendship": "【島民の絆】願い・誕生日・美食評価で友情が深まり売値が上がる",
		"fw_judge_title": "★審査員: %s",
		"fw_judge_sub": "好み%s・絆Lv.%d",
		"fw_judge_cost": "今週あと%d日",
		"fw_entry_title": "★料理を出品",
		"fw_entry_match": "(好み)",
		"fw_entry_cost": "予想%d点・残り%d品",
		"fw_entry_full": "★今週は出品済み",
		"fw_entry_full_sub": "%d品の審査済み",
		"fw_entry_next_week": "来週は新しい審査員",
		"fw_entry_none": "棚に出品できる料理なし",
		"fw_entry_none_cost": "料理を並べてから",
		"fw_score_title": "★今週の最高 %d点",
		"fw_score_none": "★まだ出品なし",
		"fw_score_medal": "メダル: %s",
		"fw_score_no_medal": "メダルなし",
		"fw_score_cost": "銅%d 銀%d 金%d",
		"fw_back_sub": "出品%d回・メダル%d",
		"fr_isl_title": "%s Lv.%d",
		"fr_isl_sub": "絆 %d/%d",
		"fr_isl_max": "絆MAX",
		"fr_isl_cost": "売値+%.1f%%",
		"fr_back_sub": "絆合計Lv.%d",
		"bn_fw_scored": "★%sが【%s】に%d点! 評判+%d%s",
		"bn_fw_scored_voucher": " 図鑑券+%d",
		"bn_fw_scored_medal": " ★%s",
		"bn_fr_level_up": "★%sとの絆がLv.%dに! 1レベルごとに売値+%.1f%%",
		"bn_fw_full": "今週の%d品は出品済み、%d日後に新しい審査員",
		"bn_fw_no_dish": "棚に出品できる料理がありません。工房で作って並べましょう",
		"bn_fw_judge": "★今週の審査員%sは%s好み: 一致で+%d点、絆1レベルごとに+%d点",
		"bn_fw_rules": "★毎週%d品まで出品。メダル報酬: 銀+%d券、金+%d券",
		"bn_fr_islander": "★%s 絆Lv.%d: 願い+%d、誕生日+%d、出品+%d点・1レベルごとに売値+%.1f%%",
		"bn_cx16": "★美食評価: 審査 %d/%d品・金 %d / メダル %d・絆合計Lv.%d・売値 +%.1f%%",
		"ft_food_week": "★%sの採点%d! 評判+%d%s",
		"wb_back_sub": "成就%d枚・勲%d",
		"bn_career": "★島の経歴: 実績%d/%d・%s",
		"bn_codex": "★図鑑ボーナス: 全商品売値+%d%% (作物か料理1種ごと+10%%)",
		"bn_amber_short": "琥珀が不足 (%d必要)・飛行船の注文で入手!",
		"bn_air_load": "★積込+%d個・進捗: %s (満載で琥珀とレア券)",
		"bn_air_away": "★飛行船は帰航中・%ds後に東港へ入港!",
		"bn_voucher_redeem": "★レア図鑑券1枚で旬の【%s】点灯！図鑑売値が永久UP!",
		"bn_solar_advance": "★二十四節気が【%s】へ・旬の【%s】売値1.45x!",
		"bn_gh_need_isle": "【開拓造景】で木橋1を直して島2を解放すると温室を建設できる!",
		"bn_gh_cost": "【雲上温室】の建設には%dGが必要!",
		"bn_sv_need": "島2を解放し%dGで【雲上温室】を建てて珍花を育てよう!",
		"bn_sv_packed": "★梱包完了！【%s】x1 (在庫%d)・収集家が来島中!",
		"bn_sv_need_items": "★箱には珍花1+料理1が必要 (珍花x%d・箱の在庫x%d)!",
		"bn_gh_cycle": "★温室で【%s】を育成(%s)・箱の累計販売%d!",
		"bn_cx5_locked": "★珍花と名物箱の図鑑: 島2の温室で珍花を育て箱を作ろう!",
		"bn_hs_need_isle": "【開拓造景】で木橋2を直して島3を解放すると温泉を建設できる!",
		"bn_hs_cost": "【雲海温泉湯屋】の建設には%dGが必要!",
		"bn_hb_need": "島3を解放し%dGで【雲海温泉湯屋】を建てて湯を作ろう!",
		"bn_hb_brewed": "★湯が完成！【%s】x1 (在庫%d)・全員回復、VIP湯客が来島!",
		"bn_hb_cycle": "★湯屋は【%s】をじっくり・青草と珍花で時短!",
		"bn_cx6_cycle": "★湯を【%s】に切替(%s)・VIP湯客%d人をもてなした!",
		"bn_cx6_locked": "★温泉図鑑: 島3に湯屋を建て、薬草と花の湯で気力回復とVIP接客!",
		"bn_wm_need_isle": "【開拓造景】で木橋1を直して島2を解放するとパン工房を建設できる!",
		"bn_wm_cost": "【風車パン工房】の建設には%dGが必要!",
		"bn_wp_need": "島2を解放し%dGで【風車パン工房】を建てよう!",
		"bn_wp_baked": "★焼きたて【%s】x1 (パン%d)・山車祭りで大人気!",
		"bn_cx7_cycle": "★パン工房は【%s】を焼く(%s)・パレード客%d人!",
		"bn_cx7_locked": "★パン図鑑: 島2に風車パン工房を建て、パンを焼いて山車祭りへ!",
		"bn_tp_cost": "【雲上茶房】の建設には%dGが必要!",
		"bn_tm_need": "%dGで島1に【雲上茶房】を建てよう!",
		"bn_tm_brewed": "★新茶【%s】x1 (茶%d)・画舫茶会で1.38x販売中!",
		"bn_cp_need_isle": "木橋1で島2を解放してから【食神席】を建設!",
		"bn_cp_cost": "【山海食神席】の建設には%dGが必要!",
		"bn_wl_on": "★星灯流し開催中(%ds)・流れる灯籠をクリックで願い事!",
		"bn_cx9_cycle": "★食神席の推し【%s】(%s)・品評%d回!",
		"bn_cx9_locked": "★食神図鑑: 島2に食神席を建て、特級3品すべて合格で勲章!",
		"bn_lh_need_isle": "木橋2で島3を解放してから【灯台漁港】を建設!",
		"bn_lh_cost": "【雲海灯台漁港】の建設には%dGが必要!",
		"bn_au_need_harbor": "★名物競売は島3の【灯台漁港】で開催・先に建設を!",
		"bn_au_leading": "★%d%sで首位・落札を待とう!",
		"bn_au_poor": "★入札には%d%sが必要・残高不足!",
		"bn_dw_cost": "【雲上牧場の乳工房】の建設には%dGが必要!",
		"bn_cin_cost": "【星空シネマ】の設営には%dGが必要!",
		"bn_cin_snack": "★軽食が売れた +%dG (%s)",
		"bn_cin_soldout": "★軽食が売り切れ・乳工房のプリンと牛乳を軽食に!",
		"bn_cin_night_only": "★シネマは夜市のみ・%ds後の夜に3本上映!",
		"bn_pk_need_isle": "【雲上陶芸窯】は島3の桟橋側・先に島3を解放!",
		"bn_pk_cost": "【雲上陶芸窯】の建設には%dGが必要!",
		"bn_sp_on": "★運動会開催中・%s・観戦売値%sx・残%ds",
		"bn_sp_need": "★運動会には島1に2種以上の動物が必要 (ウサギ/カワウソ/キツネ/柴犬)!",
		"bn_kt_on": "★凧祭り開催中・%s 生産/販売 x%.2f/x%.2f・空に凧%d枚・残%ds",
		"bn_season_info": "★島の四季: 現地%d月 = %s (北半球)・%dか所【%s】・%s +%d%%",
		"bn_pt_on": "★撮影ツアー中・%d/%dか所目・%d枚撮影・%s",
		"bn_pt_none": "★今は撮影できるスポットがない!",
		"bn_sw_info": "★【%s】%s・%d分後・予報 %s",
		"bn_bd_info": "★島民誕生会: 当日の贈り物で名声と図鑑券・%d人全員で記念写真",
		"bn_bd_gold": "★贈り物には%dG必要・金貨不足!",
		"bn_bd_already": "★今日の贈り物はもう届けたよ!",
		"bn_bd_not_today": "★贈り物は誕生日当日のみ・次は%s (%d日後)",
		"bn_bd_calendar": "★誕生日: ウサギ3日 カワウソ8日 キツネ13日 柴犬18日 ペンギン23日 オオハシ28日",
		"bn_bd_islander": "★%sの誕生日は毎月%d日・好物%s (在庫で好物ギフト 名声+%d 券+%d)",
		"bn_cx15": "★雲海天気図鑑: 天気%d/%d・祝った島民%d/%d・誕生会%d回・記念写真%d枚",
		"bn_wb_info": "★願い掲示板: 島民の依頼で名声と図鑑券",
		"bn_wish_note": "%sの%s(%s): %s・%s",
		"bn_cx14": "★写真図鑑: 写真%d/%d枚(%dか所 x 通常/絶景)・スタンプ%d・願いの勲章%d",
		"bn_cx13": "★凧図鑑: 凧%d/3種・四季%d/4・回収%d枚・満天勲章%d",
		"bn_cx12": "★運動会図鑑: 競技%d/3・陶芸%d/3・累計%d回・金リボン%d",
		"bn_cx11": "★シネマ図鑑: 映画%d/3・乳製品%d/3・上映%d回・映画通勲章%d",
		"bn_cx10": "★競売図鑑: 落札%d/3種・収蔵%d点・金槌勲章%d・漁港の鮮魚%d",
		"bn_cx10_locked": "★競売図鑑: 島3に灯台漁港を建て、名物3品を落札しよう!",
		"bn_cx8_cycle": "★茶房は【%s】を淹れる(%s)・茶客%d人をもてなした!",
		"bn_cx8_locked": "★茶図鑑: 島1に茶房を建て、龍井と烏龍を淹れて画舫茶会を開こう!",
		"wl_gift_bag": "★願い袋",
		"wl_airship": "★遠洋商隊",
		"wl_airship_on": "★商隊%d/%d(+%d珀+%d券)",
		"wl_parade": "★山車パレード",
		"wl_parade_on": "★山車巡行(%ds)",
		"wl_moontea": "★月夜の画舫",
		"wl_moontea_on": "★画舫茶会(%ds)",
		"wl_lantern": "★星灯流し",
		"wl_lantern_on": "★星灯流し(%ds)",
		"wl_sports": "★秋の運動会",
		"wl_sports_idle": "★運動会",
		"wl_sports_gather": "★運動会·入場(%ds)",
		"wl_sports_award": "★金リボン·%s",
		"wl_sports_event": "★競技·%s %d/%d",
		"wl_kite": "★雲海凧祭り",
		"wl_kite_on": "★凧祭·%s 売x%.2f 残%ds 凧%d/%d",
		"wl_cp_init": "★食神·小籠包",
		"wl_cp_unbuilt": "未建設",
		"wl_cp_cost": "建設%dG",
		"wl_seg_medal": "·勲%d",
		"wl_seg_tasted": "·鑑%d/3",
		"wl_gh_init": "★温室·星露鈴蘭",
		"wl_gh_unbuilt": "未建設",
		"wl_seg_box": "·箱%d",
		"wl_gh_cost": "建設%dG",
		"wl_hs_init": "★湯屋·よもぎ湯",
		"wl_hs_unbuilt": "未建設",
		"wl_seg_bath": "·湯%d",
		"wl_hs_cost": "建設%dG",
		"wl_tp_init": "★茶房·龍井茶",
		"wl_tp_unbuilt": "未建設",
		"wl_seg_tea": "·茶%d",
		"wl_seg_leaf": "·芽%d",
		"wl_tp_cost": "建設%dG",
		"wl_wm_init": "★パン·スフレ",
		"wl_wm_unbuilt": "未建設",
		"wl_seg_bread": "·パン%d",
		"wl_seg_flour": "·粉%d",
		"wl_wm_cost": "建設%dG",
		"wl_dw_init": "★乳工房",
		"wl_dw_unbuilt": "未建設",
		"wl_seg_milk": "·%d",
		"wl_dw_cost": "建設%dG",
		"wl_lh_init": "★灯台漁港",
		"wl_au_init": "★名物競売",
		"wl_lh_cost": "★灯台漁港(%dG)",
		"wl_au_open": "開始%d%s",
		"wl_au_now": "%d%s·%s",
		"wl_lh_lv": "★漁港Lv.%d·鮮%d",
		"wl_au_on": "★競売%d/%d·%s(%ds)",
		"wl_cin_init": "★星空シネマ",
		"wl_cin_cost": "★シネマ(%dG)",
		"wl_cin_on": "★上映%d/%d·%s %ds",
		"wl_cin_break": "★幕間·%ds",
		"wl_cin_done": "★今夜終映·券%d",
		"wl_pk_init": "★陶窯",
		"wl_pk_unbuilt": "未建設",
		"wl_seg_clay": "·土%d",
		"wl_seg_nofuel": "·薪0",
		"wl_pk_cost": "建設%dG",
		"bn_w_gh_cost": "【雲上温室】の建設に%dG必要!",
		"bn_w_wm_cost": "【風車パン工房】の建設に%dG必要!",
		"bn_w_tp_cost": "【雲上茶房】の建設に%dG必要!",
		"bn_w_cp_cost": "【山海食神席】の建設に%dG必要!",
		"bn_w_hs_cost": "【雲海温泉湯屋】の建設に%dG必要!",
		"bn_w_lh_cost": "【雲海灯台漁港】の建設に%dG必要!",
		"bn_w_dw_cost": "【雲上牧場の乳工房】の建設に%dG必要!",
		"bn_w_cin_cost": "【星空シネマ】の設営に%dG必要!",
		"bn_w_pk_cost": "【雲上陶芸窯】の建設に%dG必要!",
		"bn_w_lh_info": "★灯台漁港: 漁船が交代で出漁中・鮮魚%d・競売は%ds後!",
		"bn_w_dw_nofeed": "★乳工房: 雲牛に与える青草がない・次の収穫後にまた搾乳!",
		"bn_w_cin_info": "★シネマ: 今夜%d/3回・観客%d人 x チケット%dG・乳製品は軽食に!",
		"bn_w_pk_info": "★陶芸窯: 陶土%d%s",
		"bn_w_pk_nofuel": "・藁の薪が不足 (収穫作物なし)",
		"bn_w_pk_hint": "・収穫で陶土が出る、茶碗は土1 / 花瓶は土2",
		"bn_w_kite_sweep": "★凧で満天！%d枚すべて回収・満天勲章x%d・+%d琥珀 +%d図鑑券!",
		"bn_w_kite_got": "★【%s】を回収 +%dG%s・%sで生産販売UP・残%d枚",
		"bn_w_air_need": "★飛行船の注文: %s・報酬 +%s琥珀 +%sレア図鑑券!",
		"ft_gift_bag": "★願い袋+%dG +%d琥珀・熱狂15s!",
		"ft_w_packed": "★梱包【%s】x1 (在庫%d)",
		"ft_w_gh_cycle": "★温室で【%s】を育成",
		"ft_w_parade": "★山車パレード！焼きたてパンが1.75x~1.90x!",
		"ft_w_baked": "★焼き上がり【%s】x%d (パン%d)",
		"ft_w_milled": "★製粉【金麦の雲粉】+%d (粉%d)",
		"ft_w_wm_cycle": "★パン工房で【%s】",
		"ft_w_brewed_tea": "★淹れた【%s】x%d (茶%d)",
		"ft_w_roasted": "★殺青【雲霧の新芽】+%d (芽%d)",
		"ft_w_tp_cycle": "★茶房で【%s】",
		"ft_w_cooked": "★調理【%s】(料理%d)",
		"ft_w_cp_cycle": "★食神席の料理【%s】",
		"ft_w_bath": "★湯を作成【%s】x1 (湯%d)",
		"ft_w_hs_cycle": "★湯屋の湯【%s】",
		"ft_w_fish_shipped": "★鮮魚を露店へ +%d",
		"ft_w_dairy_made": "★完成【%s】(在庫%d)",
		"ft_w_milked": "★搾乳 +%d 雲の牛乳 (餌%s)",
		"ft_w_snack": "★軽食 +%dG",
		"ft_w_fired": "★焼成【%s】(在庫%d)",
		"ft_w_air_load": "★積込 +%d個 (%s/%s)",
		"ft_contract_done": "★王室契約達成! +%dG +%d琥珀",
		"ft_voucher_recipe": "★図鑑券で【%s】点灯 +1個を陳列!",
		"ft_four_seasons_perk": "★四季の全席特典 +%d琥珀 +%dG!",
		"ft_airship_done": "★遠洋注文達成! +%dG +%d琥珀 +%d図鑑券!",
		"ft_landscape": "★景観【%s】を解放!",
		"ft_gh_open": "★雲上温室が稼働！【星露鈴蘭】を育成!",
		"ft_flora_bred": "★交配成功！【%s】が誕生!",
		"ft_hs_open": "★温泉湯屋が開湯！【よもぎ湯】で全員回復!",
		"ft_bath_recipe": "★霊泉の秘伝！【%s】を調合!",
		"ft_wm_open": "★風車パン工房が完成！パンのオーラ発動 (露店&工房1.22x+)!",
		"ft_bake_recipe": "★パンの秘伝！【%s】を解放!",
		"ft_tp_open": "★雲上茶房が完成！清心オーラ発動 (効率&チップUP)!",
		"ft_tea_recipe": "★茶道の秘伝！【%s】を解放!",
		"ft_moontea_open": "★月夜の画舫茶会開幕！茶と料理の売値1.38x!",
		"ft_moontea_need": "先に【雲上茶房】(%dG) を建てよう!",
		"ft_moontea_reward": "★画舫の褒賞! +%d琥珀 +%d図鑑券 +%d名声 (1.38x)!",
		"ft_lantern_open": "★星灯流し開幕！願い灯籠が流れてくる・市場売値1.30x!",
		"ft_wish_granted": "★願い成就! ",
		"ft_lantern_wish": "★星灯の願い! ",
		"ft_lantern_reward": "+%dG +%d琥珀 +%d図鑑券",
		"ft_cp_open": "★山海食神席が完成！三島の食材で特級料理!",
		"ft_tasting_pass": "★品評合格【%s】%d点!",
		"ft_tasting_fail": "品評不合格【%s】%d/%d点",
		"ft_lh_open": "★灯台漁港に灯り！漁船2隻が交代で出漁!",
		"ft_boat_back": "★漁船帰港 +%d 鮮魚",
		"ft_auction_open": "★名物競売開始！",
		"ui_unsold": "流札",
		"ft_au_won": "★落札！【%s】%d%s",
		"ft_au_lost": "落札:【%s】は%s",
		"ft_dw_open": "★乳工房が完成！青草で雲牛の乳しぼり!",
		"ft_cin_open": "★星空シネマ完成！夜になると上映!",
		"ft_film_start": "★上映開始 %s",
		"ft_cin_medal": "★映画通勲章! ",
		"ft_cin_end": "★終映 ",
		"ft_cin_audience": "観客%d・チケット+%dG",
		"ft_cin_snack": "・軽食+%dG",
		"ft_pk_open": "★陶芸窯に火入れ！陶土と藁で茶碗と花瓶!",
		"ft_sp_open": "★秋の運動会開幕！%dチーム入場・観戦売値%.2fx!",
		"ft_sp_event_start": "★運動会 %s 開始!",
		"ft_sp_event_win": "★%s 優勝 %s・賞金+%dG",
		"ft_kite_open": "★雲海凧祭り開幕！凧%d枚が%sで舞う・風で生産販売UP!",
		"ft_pt_start": "★撮影ツアー出発! %dか所",
		"ft_photo": "パシャ!【%s】+%dG%s",
		"ft_photo_special": " ★絶景",
		"ft_wish_done": "★%sの願いが叶った! 名声+%d 図鑑券+%d%s",
		"ft_wish_medal": " ★願いの勲章",
		"ft_bday": "★%s 誕生日おめでとう! 名声+%d 図鑑券+%d%s",
		"ft_bday_medal": " ★記念写真",
		"ft_achievement": "★実績解除【%s】!",
		"gm_career": "★%d星 · 収%d · 製%d · 客%d · 契%d",
		"gm_wish_reward": "名声+%d 券+%d",
		"gm_wish_left": " 残%ds",
		"gm_wish_done_title": "★%sの願いが叶った!",
		"gm_wish_claimed": " 受取済",
		"gm_wish_expired_title": "★%sの便箋が期限切れ",
		"gm_wish_new_in": "新しい便箋は%ds後",
		"gm_wish_void": " 失効",
		"ft_pet_boost": "★やる気満々 8s加速!",
		"ft_tag_fresh": "鮮果直売+",
		"ft_tag_divert": "直売+",
		"ft_tag_mortar": "3.5x料理+",
		"ft_tag_cross": "島越え鮮果+",
		"ft_tag_feast": "52x宴+",
		"ft_tag_nectar": "12x甘露+",
		"ft_tea_guest": "★茶客が品茗! +%dG +%d琥珀%s!",
		"ft_wait_tea": "...お茶待ち",
		"ft_parade_guest": "★パレード客が購入! +%dG +%d琥珀%s!",
		"ft_wait_bread": "...パン待ち",
		"ft_spa_guest": "★VIP湯客が満足! +%dG +%d琥珀%s!",
		"ft_wait_bath": "...湯待ち",
		"ft_collector": "★収集家が箱を購入! +%dG +%d琥珀%s!",
		"ft_wait_box": "...名物箱待ち",
		"ft_trader": "★行商が買取x%d +%d琥珀 +%dG!",
		"ft_no_surplus": "...余った作物なし",
		"ft_critic": "★美食家が絶賛！売値&チップUP!",
		"ft_wait_dish": "...料理待ち",
		"ft_vip_tip": "★富豪チップ2x!",
		"ft_sold_out_leave": "...品切れで帰った",
		"ft_milestone": "★節目突破 Lv.%d!",
		"wl_badge": "%s%s",
		"wl_au_you": "首位"
	}
}

## i18n: data names / tags keyed by their zh source text (item, building, islander, weather, trait, achievement ...);
## `tr_name(zh)` returns the zh text itself in zh_CN and for any text not listed here.
const NAME_I18N: Dictionary = {
	"en_US": {
		"晨露胡萝卜": "Carrot",
		"晨风红草莓": "Berry",
		"幽谷荧光菇": "Glowcap",
		"晴滩黄金凤梨": "Gold Pineapple",
		"黄金凤梨": "Pineapple",
		"桂花糯米糕": "Rice Cake",
		"焦糖苹果草莓派": "Berry Pie",
		"星露荧光甘露饮": "Glow Nectar",
		"星露甘露饮": "Dew Nectar",
		"皇家凤梨星露宴": "Royal Pine Feast",
		"凤梨星露宴": "Feast",
		"作物": "Crop",
		"春分青团": "Qingtuan",
		"夏至杨梅饮": "Bayberry",
		"秋分蟹粉酥": "Crab Puff",
		"冬至暖汤圆": "Rice Balls",
		"立春": "Spr.Start",
		"雨水": "Rain Water",
		"惊蛰": "Insects",
		"春分": "Equinox",
		"清明": "Clear Bright",
		"谷雨": "Grain Rain",
		"立夏": "Sum.Start",
		"小满": "Grain Buds",
		"芒种": "Grain Ears",
		"夏至": "Solstice",
		"小暑": "Mild Heat",
		"大暑": "Big Heat",
		"立秋": "Aut.Start",
		"处暑": "Heat Ends",
		"白露": "White Dew",
		"秋分": "Equinox",
		"寒露": "Cold Dew",
		"霜降": "Frost",
		"立冬": "Win.Start",
		"小雪": "Light Snow",
		"大雪": "Heavy Snow",
		"冬至": "Solstice",
		"小寒": "Mild Cold",
		"大寒": "Big Cold",
		"春生·农田+15%": "Spring·Crop+15%",
		"夏长·工坊+15%": "Summer·Shop+15%",
		"秋收·售价+15%": "Autumn·Sale+15%",
		"冬藏·小费+15%": "Winter·Tip+15%",
		"星露铃兰": "Star Lily",
		"云霓琉璃玫瑰": "Rainbow Glass Rose",
		"琉璃玫瑰": "Rose",
		"铃兰": "Lily",
		"玫瑰": "Rose",
		"铃兰光环·农田+18%": "Lily aura·Crops+18%",
		"玫瑰光环·工坊+20%&小费+15%": "Rose aura·Shops+20%&Tips+15%",
		"星露花语礼盒": "Star Floral Box",
		"皇家名物礼盒": "Royal Gift Box",
		"艾草暖身汤": "Mugwort Bath",
		"樱瓣云雾汤": "Sakura Mist Bath",
		"星珀灵泉汤": "Star Amber Bath",
		"艾草汤": "Herb",
		"樱瓣汤": "Sakura",
		"星珀汤": "Amber",
		"艾草蒸汽·全员精力+16%&小费+8%": "Mugwort·Energy+16%&Tips+8%",
		"樱雾花汤·全员精力+22%&小费+12%": "Sakura·Energy+22%&Tips+12%",
		"星珀灵泉·全员精力+28%&小费+18%": "Star Amber·Energy+28%&Tips+18%",
		"金麦云朵面粉": "Cloud Flour",
		"云朵舒芙蕾欧包": "Cloud Souffle Bun",
		"琥珀蜜糖可颂": "Amber Croissant",
		"云朵面粉": "Flour",
		"舒芙蕾包": "Souffle",
		"蜜糖可颂": "Croissant",
		"麦香烘焙光环·摊位&工坊提速1.20x+": "Bakery aura·x1.20+",
		"麦香舒芙蕾·摊位&工坊提速1.22x+": "Souffle aura·x1.22+",
		"琥珀麦香光环·摊位&工坊提速1.26x+": "Amber aura·x1.26+",
		"云雾春芽": "Mist Buds",
		"云雾龙井茗茶": "Mist Longjing",
		"桂花乌龙香茗": "Osmanthus Oolong",
		"龙井茗茶": "Longjing",
		"桂花乌龙": "Oolong",
		"茗香清心·员工效率+16%&小费+12%": "Calm·Crew+16%&Tips+12%",
		"龙井清心·员工效率+18%&小费+15%": "Longjing·Crew+18%&Tips+15%",
		"桂乌清心·员工效率+22%&小费+20%": "Oolong·Crew+22%&Tips+20%",
		"云海灌汤小笼": "Soup Dumplings",
		"星光锦鲤清蒸鱼": "Starlight Koi",
		"山海八珍火锅": "Feast Hot Pot",
		"灌汤小笼": "Dumpling",
		"星光锦鲤": "Koi",
		"山海火锅": "Hot Pot",
		"晨露胡萝卜/红草莓 × 金麦粉/云朵鲜奶/桂花糯米糕 · 云雾竹笼慢蒸": "carrot/berry + flour/milk/mochi",
		"云海鲜渔获/幽谷荧光菇 × 龙井/春芽茶汤 × 奇花 · 荷塘锦鲤清蒸": "fish/shroom + tea + flora",
		"晴滩凤梨/荧光菇 × 云海鲜渔获/凤梨星露宴 × 熟成奶酪/欧包可颂/云朵布丁 · 山海八珍芝士同沸": "pineapple + fish + cheese/bread",
		"云海鲜渔获": "Sea Catch",
		"海鸥渔夫": "Gull Fisher",
		"椰子商人": "Coco Trader",
		"珊瑚藏家": "Coral Collector",
		"海鸥": "Gull",
		"椰子": "Coco",
		"珊瑚": "Coral",
		"你": "You",
		"珊瑚明珠名物匣": "Coral Pearl Box",
		"云海鲜味名物篮": "Sea Treat Basket",
		"三岛名物伴手礼盒": "3-Isle Gift Set",
		"明珠匣": "Pearls",
		"鲜味篮": "Seafood",
		"伴手礼": "Gifts",
		"名物": "Lot",
		"云朵鲜奶": "Cloud Milk",
		"云顶熟成奶酪": "Aged Cheese",
		"云朵焦糖布丁": "Caramel Pudding",
		"鲜奶": "Milk",
		"奶酪": "Cheese",
		"云朵布丁": "Pudding",
		"《月兔的星空邮差》": "Starry Postbunny",
		"《云鲸归航》": "Cloud Whale Home",
		"《灯塔与渔火》": "Harbor Lights",
		"星空邮差": "Post",
		"云鲸归航": "Whale",
		"灯塔渔火": "Lights",
		"云岛陶土": "Isle Clay",
		"云纹手作茶碗": "Cloud Tea Bowl",
		"青釉云纹陶花瓶": "Celadon Vase",
		"陶土": "Clay",
		"茶碗": "Bowl",
		"陶花瓶": "Vase",
		"月兔队": "Bunnies",
		"水獭队": "Otters",
		"狐狸队": "Foxes",
		"柴犬队": "Shibas",
		"荷塘栈桥接力赛": "Pond Bridge Relay",
		"湖心拔河大赛": "Lake Tug of War",
		"丰收搬运障碍赛": "Harvest Carry Race",
		"接力赛": "Relay",
		"拔河": "Tug",
		"搬运赛": "Carry",
		"微风": "Breeze",
		"和风": "Mild Wind",
		"劲风": "Gale",
		"锦鲤风筝": "Koi Kite",
		"沙燕风筝": "Swallow Kite",
		"星辰风筝": "Star Kite",
		"锦鲤": "Koi",
		"沙燕": "Swallow",
		"星辰": "Star",
		"风筝": "Kite",
		"春樱季": "Spring",
		"夏荷季": "Summer",
		"秋枫季": "Autumn",
		"冬雪季": "Winter",
		"四季": "Seasons",
		"春樱花丛": "Sakura Bush",
		"夏日向日葵花箱": "Sunflower Box",
		"秋枫南瓜堆": "Pumpkin Pile",
		"冬日小雪人": "Snowman",
		"农田生长": "Crops",
		"集市售价": "Prices",
		"工坊制作": "Workshops",
		"顾客小费": "Tips",
		"风筝台": "Kite Deck",
		"荷塘岸": "Pond",
		"影院坪": "Cape",
		"晴空风车": "Sky Windmill",
		"风筝满天": "Kite-filled Sky",
		"荷塘锦鲤": "Pond Koi",
		"星空影院": "Starry Cinema",
		"云海灯塔": "Sea Lighthouse",
		"飞艇靠港": "Airship Docked",
		"月兔": "Bunny",
		"水獭": "Otter",
		"小狐狸": "Fox",
		"柴犬": "Shiba",
		"企鹅": "Penguin",
		"巨嘴鸟": "Toucan",
		"甜香": "Sweet",
		"鲜香": "Savory",
		"清香": "Fresh",
		"铜奖": "Bronze",
		"银奖": "Silver",
		"金奖": "Gold",
		"岛民": "Islander",
		"心愿": "Wish",
		"丰收心愿": "Harvest Wish",
		"上架心愿": "Stock Wish",
		"工坊心愿": "Craft Wish",
		"迎客心愿": "Guest Wish",
		"营收心愿": "Sales Wish",
		"打卡心愿": "Photo Wish",
		"交付": "deliver",
		"经营": "business",
		"收获作物": "Harvest",
		"集市上架": "Stock",
		"工坊出品": "Craft",
		"接待顾客": "Serve",
		"集市营收": "Earn",
		"观光拍照": "Photos",
		"份": "",
		"件": "",
		"位": "",
		"张": "",
		"晴": "Sunny",
		"云雨": "Rain",
		"彩虹": "Rainbow",
		"薄雾": "Mist",
		"晴空万里": "Clear Skies",
		"云海细雨": "Sea Drizzle",
		"雨后彩虹": "Rainbow",
		"云海薄雾": "Sea Mist",
		"客流+10% 农田+10%": "Visit+10% Crop+10%",
		"农田+25% 工坊+10% 客流-15%": "Crop+25% Craft+10% Visit-15%",
		"客流+30% 售价+10% 产出+5%": "Visit+30% Sale+10% Output+5%",
		"工坊+15% 售价+5% 客流-10%": "Craft+15% Sale+5% Visit-10%",
		"客流+10%": "Visitors+10%",
		"农田+25%": "Crops+25%",
		"客流+30%": "Visitors+30%",
		"工坊+15%": "Workshops+15%",
		"鲜蔬作物": "Fresh Crops",
		"海鲜鲜奶": "Fish & Milk",
		"研钵美食": "Mortar Treats",
		"烘焙面包": "Fresh Bread",
		"云岛茶饮": "Isle Tea",
		"陶艺花卉": "Pots & Flowers",
		"射手村农田": "Village Farm",
		"桂花研钵工坊": "Mortar Shop",
		"云岛集市主摊位": "Market Stall",
		"魔法密林农田": "Grove Farm",
		"星露炼金坩埚": "Dew Cauldron",
		"天空海岸双工坊": "Coast Shops",
		"月兔 · 专职农夫": "Bunny · Farmer",
		"水獭 · 岛内物流员": "Otter · Porter",
		"小狐狸 · 研钵主厨": "Fox · Mortar Chef",
		"柴犬 · 金牌店长": "Shiba · Shopkeeper",
		"小企鹅 · 坩埚炼金师": "Penguin · Alchemist",
		"巨嘴鸟 · 跨岛专员": "Toucan · Courier",
		"丰收巧爪": "Green Paw",
		"疾风步履": "Swift Step",
		"匠心巧艺": "Craftsman",
		"招财金算": "Lucky Till",
		"极地秘传": "Polar Lore",
		"顺风羽翼": "Tailwind",
		"专精": "Trait",
		"收获产量+1/阶": "harvest +1/tier",
		"移速+20%/阶": "speed +20%/tier",
		"加工耗时-15%/阶": "craft time -15%/tier",
		"小费率+15%/阶": "tips +15%/tier",
		"炼制耗时-15%/阶": "brew time -15%/tier",
		"跨岛移速+20%/阶": "cross-isle speed +20%/tier",
		"蜜蜂花箱": "Bee Hive",
		"荧光风铃": "Glow Chime",
		"招财提基灯": "Lucky Tiki",
		"晚风": "Dusk Wind",
		"虫鸣": "Crickets",
		"雨声": "Rain",
		"初入云岛": "Welcome Aboard",
		"第一桶金": "First Fortune",
		"研钵飘香": "Mortar Aroma",
		"密林开拓者": "Grove Pioneer",
		"黄金海岸": "Golden Coast",
		"山海全席": "Grand Feast",
		"专注达人": "Focus Master",
		"皇家供货商": "Royal Supplier",
		"琥珀收藏家": "Amber Collector",
		"微缩造景师": "Diorama Artist",
		"王牌进修生": "Ace Trainee",
		"金牌匠师团": "Gold Artisans",
		"产业蜕变": "Industry Leap",
		"晨露丰收季": "Dewy Harvest",
		"宾至如归": "Warm Welcome",
		"五星云岛名宿": "Five-Star Isle",
		"远洋大掌柜": "Ocean Merchant",
		"四时节气宴": "Seasonal Feast",
		"奇花园艺师": "Flora Gardener",
		"云岛伴手礼名家": "Souvenir Master",
		"云海汤屋掌柜": "Spa Keeper",
		"灵泉贵宾礼遇": "VIP Spa Guest",
		"云端烘焙大师": "Master Baker",
		"花车巡游盛典": "Grand Parade",
		"云端茗香茶圣": "Tea Sage",
		"月色画舫雅集": "Moonlit Tea",
		"星灯祈愿者": "Lantern Wisher",
		"山海特级食神": "Master Chef",
		"灯塔渔港满载": "Full Harbor",
		"名物拍卖金槌": "Golden Gavel",
		"云端牧场主": "Ranch Owner",
		"星空影迷": "Cinephile",
		"云端窑主": "Kiln Master",
		"金丝带冠军": "Ribbon Champion",
		"四季岛主": "Four Seasons",
		"云岛摄影师": "Isle Photographer",
		"心愿守护者": "Wish Keeper",
		"云海观天师": "Sky Watcher",
		"生日全家福": "Family Photo"
	},
	"ja_JP": {
		"晨露胡萝卜": "朝露ニンジン",
		"晨风红草莓": "朝風イチゴ",
		"幽谷荧光菇": "光るキノコ",
		"晴滩黄金凤梨": "黄金パイン",
		"黄金凤梨": "パイン",
		"桂花糯米糕": "金木犀もち",
		"焦糖苹果草莓派": "苺パイ",
		"星露荧光甘露饮": "星露の光る甘露",
		"星露甘露饮": "星露の甘露",
		"皇家凤梨星露宴": "王家パイン宴",
		"凤梨星露宴": "パイン宴",
		"作物": "作物",
		"春分青团": "よもぎ団子",
		"夏至杨梅饮": "やまもも水",
		"秋分蟹粉酥": "蟹のパイ",
		"冬至暖汤圆": "温か白玉",
		"立春": "立春",
		"雨水": "雨水",
		"惊蛰": "啓蟄",
		"春分": "春分",
		"清明": "清明",
		"谷雨": "穀雨",
		"立夏": "立夏",
		"小满": "小満",
		"芒种": "芒種",
		"夏至": "夏至",
		"小暑": "小暑",
		"大暑": "大暑",
		"立秋": "立秋",
		"处暑": "処暑",
		"白露": "白露",
		"秋分": "秋分",
		"寒露": "寒露",
		"霜降": "霜降",
		"立冬": "立冬",
		"小雪": "小雪",
		"大雪": "大雪",
		"冬至": "冬至",
		"小寒": "小寒",
		"大寒": "大寒",
		"春生·农田+15%": "春生·畑+15%",
		"夏长·工坊+15%": "夏長·工房+15%",
		"秋收·售价+15%": "秋収·売値+15%",
		"冬藏·小费+15%": "冬蔵·チップ+15%",
		"星露铃兰": "星露鈴蘭",
		"云霓琉璃玫瑰": "虹色ガラスのバラ",
		"琉璃玫瑰": "瑠璃バラ",
		"铃兰": "スズラン",
		"玫瑰": "バラ",
		"铃兰光环·农田+18%": "スズラン·畑+18%",
		"玫瑰光环·工坊+20%&小费+15%": "バラ·工房+20%&チップ+15%",
		"星露花语礼盒": "星露の花箱",
		"皇家名物礼盒": "王家の名物箱",
		"艾草暖身汤": "よもぎ湯",
		"樱瓣云雾汤": "桜霧の湯",
		"星珀灵泉汤": "星珀の霊泉",
		"艾草汤": "よもぎ",
		"樱瓣汤": "桜湯",
		"星珀汤": "星珀湯",
		"艾草蒸汽·全员精力+16%&小费+8%": "よもぎ·気力+16%&チップ+8%",
		"樱雾花汤·全员精力+22%&小费+12%": "桜霧·気力+22%&チップ+12%",
		"星珀灵泉·全员精力+28%&小费+18%": "星珀·気力+28%&チップ+18%",
		"金麦云朵面粉": "金麦の雲粉",
		"云朵舒芙蕾欧包": "雲のスフレパン",
		"琥珀蜜糖可颂": "琥珀クロワッサン",
		"云朵面粉": "雲粉",
		"舒芙蕾包": "スフレ",
		"蜜糖可颂": "蜜パン",
		"麦香烘焙光环·摊位&工坊提速1.20x+": "パンのオーラ·1.20x+",
		"麦香舒芙蕾·摊位&工坊提速1.22x+": "スフレのオーラ·1.22x+",
		"琥珀麦香光环·摊位&工坊提速1.26x+": "琥珀のオーラ·1.26x+",
		"云雾春芽": "雲霧新芽",
		"云雾龙井茗茶": "雲霧の龍井茶",
		"桂花乌龙香茗": "金木犀烏龍茶",
		"龙井茗茶": "龍井茶",
		"桂花乌龙": "烏龍茶",
		"茗香清心·员工效率+16%&小费+12%": "清心·効率+16%&チップ+12%",
		"龙井清心·员工效率+18%&小费+15%": "龍井·効率+18%&チップ+15%",
		"桂乌清心·员工效率+22%&小费+20%": "烏龍·効率+22%&チップ+20%",
		"云海灌汤小笼": "雲海の小籠包",
		"星光锦鲤清蒸鱼": "星光鯉の蒸し魚",
		"山海八珍火锅": "山海八珍鍋",
		"灌汤小笼": "小籠包",
		"星光锦鲤": "星光鯉",
		"山海火锅": "山海鍋",
		"晨露胡萝卜/红草莓 × 金麦粉/云朵鲜奶/桂花糯米糕 · 云雾竹笼慢蒸": "人参/苺×小麦粉/牛乳/もち",
		"云海鲜渔获/幽谷荧光菇 × 龙井/春芽茶汤 × 奇花 · 荷塘锦鲤清蒸": "鮮魚/キノコ×茶×珍花",
		"晴滩凤梨/荧光菇 × 云海鲜渔获/凤梨星露宴 × 熟成奶酪/欧包可颂/云朵布丁 · 山海八珍芝士同沸": "パイン×鮮魚×チーズ/パン",
		"云海鲜渔获": "雲海の鮮魚",
		"海鸥渔夫": "カモメ漁師",
		"椰子商人": "ヤシ商人",
		"珊瑚藏家": "珊瑚収集家",
		"海鸥": "カモメ",
		"椰子": "ヤシ",
		"珊瑚": "珊瑚",
		"你": "あなた",
		"珊瑚明珠名物匣": "珊瑚真珠の名物箱",
		"云海鲜味名物篮": "雲海の鮮味かご",
		"三岛名物伴手礼盒": "三島みやげ箱",
		"明珠匣": "真珠箱",
		"鲜味篮": "鮮味かご",
		"伴手礼": "みやげ",
		"名物": "名物",
		"云朵鲜奶": "雲の牛乳",
		"云顶熟成奶酪": "熟成チーズ",
		"云朵焦糖布丁": "雲のプリン",
		"鲜奶": "牛乳",
		"奶酪": "チーズ",
		"云朵布丁": "プリン",
		"《月兔的星空邮差》": "『月うさぎの星空郵便』",
		"《云鲸归航》": "『雲鯨の帰航』",
		"《灯塔与渔火》": "『灯台と漁火』",
		"星空邮差": "星空郵便",
		"云鲸归航": "雲鯨帰航",
		"灯塔渔火": "灯台漁火",
		"云岛陶土": "島の陶土",
		"云纹手作茶碗": "雲紋の茶碗",
		"青釉云纹陶花瓶": "青磁の花瓶",
		"陶土": "陶土",
		"茶碗": "茶碗",
		"陶花瓶": "花瓶",
		"月兔队": "ウサギ組",
		"水獭队": "カワウソ組",
		"狐狸队": "キツネ組",
		"柴犬队": "柴犬組",
		"荷塘栈桥接力赛": "蓮池桟橋リレー",
		"湖心拔河大赛": "湖上の綱引き",
		"丰收搬运障碍赛": "収穫運搬レース",
		"接力赛": "リレー",
		"拔河": "綱引き",
		"搬运赛": "運搬",
		"微风": "そよ風",
		"和风": "和風",
		"劲风": "強風",
		"锦鲤风筝": "鯉の凧",
		"沙燕风筝": "燕の凧",
		"星辰风筝": "星の凧",
		"锦鲤": "鯉",
		"沙燕": "燕",
		"星辰": "星",
		"风筝": "凧",
		"春樱季": "桜の春",
		"夏荷季": "蓮の夏",
		"秋枫季": "紅葉の秋",
		"冬雪季": "雪の冬",
		"四季": "四季",
		"春樱花丛": "桜の茂み",
		"夏日向日葵花箱": "ひまわり箱",
		"秋枫南瓜堆": "かぼちゃの山",
		"冬日小雪人": "雪だるま",
		"农田生长": "畑の成長",
		"集市售价": "市場売値",
		"工坊制作": "工房の生産",
		"顾客小费": "チップ",
		"风筝台": "凧の丘",
		"荷塘岸": "蓮池岸",
		"影院坪": "東岬",
		"晴空风车": "青空の風車",
		"风筝满天": "凧で満天",
		"荷塘锦鲤": "蓮池の鯉",
		"星空影院": "星空シネマ",
		"云海灯塔": "雲海の灯台",
		"飞艇靠港": "飛行船入港",
		"月兔": "ウサギ",
		"水獭": "カワウソ",
		"小狐狸": "キツネ",
		"柴犬": "柴犬",
		"企鹅": "ペンギン",
		"巨嘴鸟": "オオハシ",
		"甜香": "甘い味",
		"鲜香": "旨味",
		"清香": "爽やか",
		"铜奖": "銅賞",
		"银奖": "銀賞",
		"金奖": "金賞",
		"岛民": "島民",
		"心愿": "願い",
		"丰收心愿": "豊作の願い",
		"上架心愿": "陳列の願い",
		"工坊心愿": "工房の願い",
		"迎客心愿": "歓迎の願い",
		"营收心愿": "売上の願い",
		"打卡心愿": "撮影の願い",
		"交付": "納品",
		"经营": "経営",
		"收获作物": "収穫",
		"集市上架": "陳列",
		"工坊出品": "工房生産",
		"接待顾客": "接客",
		"集市营收": "売上",
		"观光拍照": "撮影",
		"份": "個",
		"件": "個",
		"位": "人",
		"张": "枚",
		"晴": "晴れ",
		"云雨": "雲雨",
		"彩虹": "虹",
		"薄雾": "薄霧",
		"晴空万里": "快晴",
		"云海细雨": "雲海の霧雨",
		"雨后彩虹": "雨上がりの虹",
		"云海薄雾": "雲海の薄霧",
		"客流+10% 农田+10%": "客足+10% 畑+10%",
		"农田+25% 工坊+10% 客流-15%": "畑+25% 工房+10% 客足-15%",
		"客流+30% 售价+10% 产出+5%": "客足+30% 売値+10% 生産+5%",
		"工坊+15% 售价+5% 客流-10%": "工房+15% 売値+5% 客足-10%",
		"客流+10%": "客足+10%",
		"农田+25%": "畑+25%",
		"客流+30%": "客足+30%",
		"工坊+15%": "工房+15%",
		"鲜蔬作物": "新鮮な作物",
		"海鲜鲜奶": "魚と牛乳",
		"研钵美食": "乳鉢グルメ",
		"烘焙面包": "焼きたてパン",
		"云岛茶饮": "島のお茶",
		"陶艺花卉": "陶芸と花",
		"射手村农田": "村の畑",
		"桂花研钵工坊": "桂花乳鉢工房",
		"云岛集市主摊位": "市場メイン露店",
		"魔法密林农田": "密林の畑",
		"星露炼金坩埚": "星露錬金釜",
		"天空海岸双工坊": "海岸双工房",
		"月兔 · 专职农夫": "ウサギ · 農夫",
		"水獭 · 岛内物流员": "カワウソ · 運び屋",
		"小狐狸 · 研钵主厨": "キツネ · 乳鉢シェフ",
		"柴犬 · 金牌店长": "柴犬 · 店長",
		"小企鹅 · 坩埚炼金师": "ペンギン · 錬金術師",
		"巨嘴鸟 · 跨岛专员": "オオハシ · 島間便",
		"丰收巧爪": "豊穣の爪",
		"疾风步履": "疾風の足",
		"匠心巧艺": "匠の技",
		"招财金算": "招き金",
		"极地秘传": "極地秘伝",
		"顺风羽翼": "追い風の翼",
		"专精": "専門",
		"收获产量+1/阶": "収穫量+1/段",
		"移速+20%/阶": "移動速度+20%/段",
		"加工耗时-15%/阶": "加工時間-15%/段",
		"小费率+15%/阶": "チップ率+15%/段",
		"炼制耗时-15%/阶": "錬成時間-15%/段",
		"跨岛移速+20%/阶": "島間移動+20%/段",
		"蜜蜂花箱": "蜂の巣箱",
		"荧光风铃": "光る風鈴",
		"招财提基灯": "招福ティキ灯",
		"晚风": "晩風",
		"虫鸣": "虫の音",
		"雨声": "雨音",
		"初入云岛": "雲島へようこそ",
		"第一桶金": "最初の稼ぎ",
		"研钵飘香": "乳鉢の香り",
		"密林开拓者": "密林の開拓者",
		"黄金海岸": "黄金海岸",
		"山海全席": "山海の全席",
		"专注达人": "集中の達人",
		"皇家供货商": "王室御用達",
		"琥珀收藏家": "琥珀収集家",
		"微缩造景师": "ジオラマ職人",
		"王牌进修生": "エース研修生",
		"金牌匠师团": "金の匠集団",
		"产业蜕变": "産業の進化",
		"晨露丰收季": "朝露の収穫祭",
		"宾至如归": "おもてなし上手",
		"五星云岛名宿": "五つ星の雲島",
		"远洋大掌柜": "遠洋の大商人",
		"四时节气宴": "四季の節気宴",
		"奇花园艺师": "珍花の園芸家",
		"云岛伴手礼名家": "みやげの名人",
		"云海汤屋掌柜": "湯屋の主人",
		"灵泉贵宾礼遇": "霊泉のVIP",
		"云端烘焙大师": "雲上のパン職人",
		"花车巡游盛典": "山車パレード",
		"云端茗香茶圣": "雲上の茶聖",
		"月色画舫雅集": "月夜の画舫茶会",
		"星灯祈愿者": "星灯の祈り手",
		"山海特级食神": "山海の食神",
		"灯塔渔港满载": "大漁の灯台港",
		"名物拍卖金槌": "名物の金槌",
		"云端牧场主": "雲上の牧場主",
		"星空影迷": "星空の映画通",
		"云端窑主": "雲上の窯元",
		"金丝带冠军": "金リボン王者",
		"四季岛主": "四季の島主",
		"云岛摄影师": "雲島の写真家",
		"心愿守护者": "願いの守り手",
		"云海观天师": "雲海の天気読み",
		"生日全家福": "誕生日の記念写真"
	}
}

func set_language(lang_code: String) -> void:
	if SUPPORTED_LANGS.has(lang_code):
		var changed := lang_code != current_lang
		current_lang = lang_code
		if changed and EventBus != null:
			EventBus.language_changed.emit()

func cycle_language() -> String:
	var idx := SUPPORTED_LANGS.find(current_lang)
	current_lang = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.size()]
	if EventBus != null:
		EventBus.language_changed.emit()
	return current_lang

func is_zh() -> bool:
	return current_lang == "zh_CN"

func tr_key(key: String) -> String:
	var table: Dictionary = I18N_DICT.get(current_lang, I18N_DICT["zh_CN"])
	return String(table.get(key, I18N_DICT["zh_CN"].get(key, key)))

## `tr_key(key) % args` (args may be empty for a plain text)
func tr_fmt(key: String, args: Array) -> String:
	var t := tr_key(key)
	return t % args if not args.is_empty() else t

## Data name / tag in the current language, looked up by its zh source text (`NAME_I18N`); unknown texts pass through
func tr_name(zh_text: String) -> String:
	if current_lang == "zh_CN" or zh_text == "":
		return zh_text
	var table: Dictionary = NAME_I18N.get(current_lang, {})
	return String(table.get(zh_text, zh_text))

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

func is_tasting_dish(item_id: String) -> bool:
	return TASTING_DISHES.has(item_id)

func is_seafood_item(item_id: String) -> bool:
	return item_id == SEAFOOD_ITEM_ID

func is_auction_lot(item_id: String) -> bool:
	return AUCTION_LOTS.has(item_id)

func is_dairy_item(item_id: String) -> bool:
	return DAIRY_ITEMS.has(item_id)

func is_cinema_film(item_id: String) -> bool:
	return CINEMA_FILMS.has(item_id)

func is_pottery_item(item_id: String) -> bool:
	return POTTERY_ITEMS.has(item_id)

func is_sports_event(item_id: String) -> bool:
	return SPORTS_EVENTS.has(item_id)

func is_kite_type(item_id: String) -> bool:
	return KITE_TYPES.has(item_id)

## CI-13: northern-hemisphere meteorological season of a local calendar month (1..12)
func get_season_for_month(month: int) -> String:
	var m := posmod(month - 1, 12) + 1
	if m >= 3 and m <= 5:
		return "spring"
	if m >= 6 and m <= 8:
		return "summer"
	if m >= 9 and m <= 11:
		return "autumn"
	return "winter"

func get_kite_wind_level_info(level_idx: int) -> Dictionary:
	return KITE_WIND_LEVELS[clampi(level_idx, 0, KITE_WIND_LEVELS.size() - 1)]

## The 3-gust programme of festival number `festival_idx` (rotates through `KITE_WIND_PROGRAMMES`)
func get_kite_wind_programme(festival_idx: int) -> Array:
	return KITE_WIND_PROGRAMMES[posmod(festival_idx, KITE_WIND_PROGRAMMES.size())]

## Unsigned wind strength (0..1) of festival `festival_idx` at festival clock `t`: each gust blends from the previous one
## over `KITE_WIND_BLEND_SEC` (pure function: no RNG, no wall clock).
func calc_kite_wind_strength(festival_idx: int, t: float) -> float:
	var prog := get_kite_wind_programme(festival_idx)
	var seg := clampi(int(floor(maxf(0.0, t) / KITE_GUST_SEC)), 0, prog.size() - 1)
	var cur := float(get_kite_wind_level_info(int(prog[seg][0]))["strength"])
	if seg == 0:
		return cur
	var prev := float(get_kite_wind_level_info(int(prog[seg - 1][0]))["strength"])
	var k := smoothstep(0.0, KITE_WIND_BLEND_SEC, maxf(0.0, t) - float(seg) * KITE_GUST_SEC)
	return lerpf(prev, cur, k)

## Signed wind (strength x direction, -1..1) used to push the kites downwind, blended like the strength.
func calc_kite_wind_vector(festival_idx: int, t: float) -> float:
	var prog := get_kite_wind_programme(festival_idx)
	var seg := clampi(int(floor(maxf(0.0, t) / KITE_GUST_SEC)), 0, prog.size() - 1)
	var cur := float(get_kite_wind_level_info(int(prog[seg][0]))["strength"]) * float(prog[seg][1])
	if seg == 0:
		return cur
	var prev := float(get_kite_wind_level_info(int(prog[seg - 1][0]))["strength"]) * float(prog[seg - 1][1])
	var k := smoothstep(0.0, KITE_WIND_BLEND_SEC, maxf(0.0, t) - float(seg) * KITE_GUST_SEC)
	return lerpf(prev, cur, k)

func calc_kite_wind_level_idx(festival_idx: int, t: float) -> int:
	var prog := get_kite_wind_programme(festival_idx)
	var seg := clampi(int(floor(maxf(0.0, t) / KITE_GUST_SEC)), 0, prog.size() - 1)
	return int(prog[seg][0])

## Kite centre (local coords of `WorldOffsetRoot`) of slot `slot_idx` at festival clock `t`: a tethered sway around the
## lane anchor, pushed downwind by the gust and lifted by its strength (pure function of festival index + clock).
func calc_kite_position(slot_idx: int, festival_idx: int, t: float) -> Vector2:
	var sl: Dictionary = KITE_SLOTS[clampi(slot_idx, 0, KITE_SLOTS.size() - 1)]
	var ph := float(sl["phase"])
	var wv := calc_kite_wind_vector(festival_idx, t)
	var ws := calc_kite_wind_strength(festival_idx, t)
	var x := float(sl["anchor_x"]) + wv * KITE_WIND_DRIFT_PX + sin(t * KITE_SWAY_FREQ + ph) * KITE_SWAY_PX
	var y := float(sl["base_y"]) - ws * KITE_LIFT_PX + sin(t * KITE_BOB_FREQ + ph * 1.3) * KITE_BOB_PX
	return Vector2(x, y)

func get_kite_footprint(center: Vector2) -> Rect2:
	return Rect2(center + KITE_FOOTPRINT.position, KITE_FOOTPRINT.size)

## ---------------- CI-14: Photo Tour & Islander Wish Board (pure helpers) ----------------
## The 8 photo-codex entries in tour order: every spot has a normal shot and a special shot (its landmark event running)
func get_photo_entry_order() -> Array[String]:
	var out: Array[String] = []
	for s_id in PHOTO_SPOT_ORDER:
		out.append(String(PHOTO_SPOTS[s_id]["normal_id"]))
		out.append(String(PHOTO_SPOTS[s_id]["special_id"]))
	return out

func is_photo_id(item_id: String) -> bool:
	return get_photo_entry_order().has(item_id)

func get_photo_entry_info(photo_id: String) -> Dictionary:
	for s_id in PHOTO_SPOT_ORDER:
		var sp: Dictionary = PHOTO_SPOTS[s_id]
		if String(sp["normal_id"]) == photo_id:
			return {"id": photo_id, "spot_id": s_id, "name": String(sp["normal_name"]), "special": false}
		if String(sp["special_id"]) == photo_id:
			return {"id": photo_id, "spot_id": s_id, "name": String(sp["special_name"]), "special": true}
	return {}

## Photo action footprint (camera + flash + rising photo card) of a spot, in `WorldOffsetRoot` local coords
func get_photo_fx_rect(spot_id: String) -> Rect2:
	var sp: Dictionary = PHOTO_SPOTS.get(spot_id, PHOTO_SPOTS["pond_bank"])
	var fx := PHOTO_FX_LOCAL
	if float(sp["facing"]) < 0.0:
		fx = Rect2(-fx.end.x, fx.position.y, fx.size.x, fx.size.y)
	return Rect2(Vector2(float(sp["pose_x"]), GROUND_Y) + fx.position, fx.size)

## Wish note `serial` (0, 1, 2, ...): islanders post in fixed rotation; each islander alternates its 2 favourite wish types;
## the tier rises once per full islander round.
func get_wish_islander(serial: int) -> String:
	return WISH_ISLANDERS[posmod(serial, WISH_ISLANDERS.size())]

func get_wish_tier(serial: int) -> int:
	return clampi(int(maxi(0, serial) / WISH_ISLANDERS.size()), 0, WISH_TIER_MAX)

func get_wish_type_for_serial(serial: int) -> String:
	var prefs: Array = WISH_ISLANDER_PREFS[get_wish_islander(serial)]
	return String(prefs[posmod(int(maxi(0, serial) / WISH_ISLANDERS.size()), prefs.size())])

## Target of a wish: counts grow by `step` per tier; the `earn` wish asks for `gold_sec` seconds of idle income x(1 + 0.25 tier)
func calc_wish_target(w_type: String, tier: int, base_gps: float) -> int:
	var cfg: Dictionary = WISH_TYPES.get(w_type, WISH_TYPES["harvest"])
	var t := clampi(tier, 0, WISH_TIER_MAX)
	if w_type == "earn":
		return maxi(int(cfg["base"]), int(round(maxf(0.0, base_gps) * float(cfg["gold_sec"]) * (1.0 + 0.25 * float(t)))))
	return int(cfg["base"]) + int(cfg["step"]) * t

func calc_wish_rep(w_type: String, tier: int) -> int:
	var cfg: Dictionary = WISH_TYPES.get(w_type, WISH_TYPES["harvest"])
	return int(cfg["rep"]) + WISH_TIER_REP_STEP * clampi(tier, 0, WISH_TIER_MAX)

## ---------------- CI-15: Cloud-Sea Weather Rotation & Islander Birthday Party (pure helpers) ----------------
func get_sky_weather_info(w_id: String) -> Dictionary:
	return SKY_WEATHERS.get(w_id, SKY_WEATHERS["sunny"])

## Every key a datetime needs (an injected clock may return only `month`): missing fields default to the 1st, 12:00:00
func normalize_datetime(dt: Dictionary) -> Dictionary:
	return {
		"year": clampi(int(dt.get("year", 2026)), 1971, 9999),
		"month": clampi(int(dt.get("month", 1)), 1, 12),
		"day": clampi(int(dt.get("day", 1)), 1, 31),
		"hour": clampi(int(dt.get("hour", 12)), 0, 23),
		"minute": clampi(int(dt.get("minute", 0)), 0, 59),
		"second": clampi(int(dt.get("second", 0)), 0, 59)
	}

func make_date_key(dt: Dictionary) -> String:
	var n := normalize_datetime(dt)
	return "%04d-%02d-%02d" % [int(n["year"]), int(n["month"]), int(n["day"])]

## Global 20-minute slot index of a local datetime (contiguous across days, months and years)
func calc_sky_weather_slot_key(dt: Dictionary) -> int:
	var unix := Time.get_unix_time_from_datetime_dict(normalize_datetime(dt))
	return int(floor(float(unix) / (60.0 * float(SKY_WEATHER_SLOT_MINUTES))))

## Minutes until the next weather slot (1..20)
func get_sky_weather_minutes_left(dt: Dictionary) -> int:
	var n := normalize_datetime(dt)
	return SKY_WEATHER_SLOT_MINUTES - posmod(int(n["hour"]) * 60 + int(n["minute"]), SKY_WEATHER_SLOT_MINUTES)

## Deterministic integer hash -> [0, 1) (every product stays far below 2^63)
func _sky_hash01(n: int, salt: int) -> float:
	var h := posmod(n * 73244475 + salt * 19349663 + 1013904223, 4294967296)
	h = h ^ (h >> 16)
	h = posmod(h * 73244475, 4294967296)
	h = h ^ (h >> 16)
	h = posmod(h * 73244475, 4294967296)
	h = h ^ (h >> 16)
	return float(h) / 4294967296.0

## Sunny / rain / mist of a slot from its season's weights (no rainbow: that is decided by `calc_sky_weather_for_slot`)
func calc_sky_weather_raw(slot_key: int, season_id: String) -> String:
	var tb: Dictionary = SKY_WEATHER_SEASON_TABLE.get(season_id, SKY_WEATHER_SEASON_TABLE["spring"])
	var ws := float(tb["sunny"])
	var wr := float(tb["rain"])
	var r := _sky_hash01(slot_key, 7) * (ws + wr + float(tb["mist"]))
	if r < ws:
		return "sunny"
	if r < ws + wr:
		return "rain"
	return "mist"

## The weather of a slot: its raw draw, except that the slot right after a rain slot may clear into a rainbow
func calc_sky_weather_for_slot(slot_key: int, season_id: String) -> String:
	var raw := calc_sky_weather_raw(slot_key, season_id)
	if raw != "rain" and calc_sky_weather_raw(slot_key - 1, season_id) == "rain":
		var tb: Dictionary = SKY_WEATHER_SEASON_TABLE.get(season_id, SKY_WEATHER_SEASON_TABLE["spring"])
		if _sky_hash01(slot_key, 13) < float(tb["rainbow_after_rain"]):
			return "rainbow"
	return raw

func calc_sky_weather(dt: Dictionary) -> String:
	var n := normalize_datetime(dt)
	return calc_sky_weather_for_slot(calc_sky_weather_slot_key(n), get_season_for_month(int(n["month"])))

## Capped stacking of a weather multiplier onto an existing group multiplier (see `SKY_WEATHER_*_STACK_CAP`)
func stack_weather_mult(existing: float, weather_mult: float, cap: float) -> float:
	if weather_mult <= 1.0:
		return existing * weather_mult
	return minf(existing * weather_mult, maxf(existing, cap))

func get_sky_weather_stack_cap(channel: String) -> float:
	if channel == "sale":
		return SKY_WEATHER_SALE_STACK_CAP
	if channel == "visitor":
		return SKY_WEATHER_VISITOR_STACK_CAP
	return SKY_WEATHER_PROD_STACK_CAP

## Centre of the weather emblem in sky zone `zone_idx` (rain clouds ride high so their streaks fall below them; +-1px bob)
func get_sky_weather_emblem_center(zone_idx: int, w_id: String, t: float) -> Vector2:
	var z: Rect2 = SKY_WEATHER_ZONES[clampi(zone_idx, 0, SKY_WEATHER_ZONES.size() - 1)]["rect"]
	var bob := roundf(sin(t * 1.3 + float(zone_idx) * 1.7))
	var cy := z.position.y + 3.0 + SKY_WEATHER_EMBLEM_PX * 0.5 if w_id == "rain" else z.get_center().y - 4.0
	return Vector2(roundf(z.get_center().x), cy + bob)

func _fx_rect(out: Array, zi: int, z: Rect2, r: Rect2, c: Color) -> void:
	var cl := r.intersection(z)
	if cl.size.x > 0.0 and cl.size.y > 0.0 and c.a > 0.004:
		out.append({"zone": zi, "k": "rect", "r": cl, "c": c})

func _fx_line(out: Array, zi: int, z: Rect2, a: Vector2, b: Vector2, c: Color, w: float) -> void:
	var inner := z.grow(-w * 0.5)
	var ca := Vector2(clampf(a.x, inner.position.x, inner.end.x), clampf(a.y, inner.position.y, inner.end.y))
	var cb := Vector2(clampf(b.x, inner.position.x, inner.end.x), clampf(b.y, inner.position.y, inner.end.y))
	if ca.distance_to(cb) > 0.5 and c.a > 0.004:
		out.append({"zone": zi, "k": "line", "a": ca, "b": cb, "c": c, "w": w})

## A copy of weather `w_id`'s art (its solid used-rect) drawn into `r`; dropped unless it fits the zone entirely
func _fx_tex(out: Array, zi: int, z: Rect2, w_id: String, r: Rect2, c: Color) -> void:
	if z.encloses(r) and c.a > 0.004:
		out.append({"zone": zi, "k": "tex", "w_id": w_id, "r": r, "c": c})

func _fx_twinkle(out: Array, zi: int, z: Rect2, p: Vector2, c: Color) -> void:
	var q := Vector2(roundf(p.x), roundf(p.y))
	_fx_rect(out, zi, z, Rect2(q.x - 1.0, q.y, 3.0, 1.0), c)
	_fx_rect(out, zi, z, Rect2(q.x, q.y - 1.0, 1.0, 3.0), c)

## Bounding box of one weather primitive (line width / polyline width included)
func get_sky_weather_fx_bounds(p: Dictionary) -> Rect2:
	match String(p["k"]):
		"rect", "tex":
			return p["r"]
		"line":
			return Rect2(p["a"], Vector2.ZERO).expand(p["b"]).grow(float(p["w"]) * 0.5)
		"poly":
			var pts: PackedVector2Array = p["p"]
			var r := Rect2(pts[0], Vector2.ZERO)
			for q in pts:
				r = r.expand(q)
			return r.grow(float(p["w"]) * 0.5)
	return Rect2()

## Every primitive the weather layer draws at clock `t` (pure function of weather + clock + night flag + fade alpha), each
## one already clipped into its zone: {"zone", "k": rect | line | poly, "r" | "a"/"b" | "p", "w", "c"}.
func build_sky_weather_fx(w_id: String, t: float, night: bool, alpha: float = 1.0) -> Array:
	var out: Array = []
	var a := clampf(alpha, 0.0, 1.0)
	if a <= 0.004:
		return out
	var half := SKY_WEATHER_EMBLEM_PX * 0.5
	for zi in range(SKY_WEATHER_ZONES.size()):
		var z: Rect2 = SKY_WEATHER_ZONES[zi]["rect"]
		var sky := String(SKY_WEATHER_ZONES[zi]["kind"]) == "sky"
		if sky:
			var c := get_sky_weather_emblem_center(zi, w_id, t)
			match w_id:
				"sunny":
					if night:
						# clear night: no sun, a handful of twinkling stars
						for k in range(6):
							var sp := Vector2(z.position.x + 6.0 + fmod(float(k) * 37.3, z.size.x - 12.0), z.position.y + 5.0 + fmod(float(k) * 23.9 + 4.0, z.size.y - 10.0))
							_fx_twinkle(out, zi, z, sp, Color(0.92, 0.95, 1.0, (0.35 + 0.55 * maxf(0.0, sin(t * 1.9 + float(k) * 2.1))) * a))
					else:
						# 8 pixel rays turning slowly around the sun
						for k in range(8):
							var ang := float(k) * PI * 0.25 + t * 0.5
							var rr := half + 4.0 + 1.5 * sin(t * 2.4 + float(k))
							var rp := c + Vector2(cos(ang), sin(ang)) * rr
							_fx_rect(out, zi, z, Rect2(roundf(rp.x) - 1.0, roundf(rp.y) - 1.0, 2.0, 2.0), Color(1.0, 0.88, 0.40, 0.85 * a))
				"rain":
					var n_st := 7 if z.size.x > 70.0 else 5
					var top := c.y + half * 0.5
					var span := maxf(4.0, z.end.y - 1.0 - top - 5.0)
					for k in range(n_st):
						var sx := c.x - 11.0 + float(k) * 22.0 / float(n_st - 1)
						var sy := top + fmod(t * 60.0 + float(k) * 9.7, span)
						_fx_line(out, zi, z, Vector2(sx, sy), Vector2(sx - 1.0, sy + 5.0), Color(0.62, 0.82, 1.0, 0.75 * a), 1.0)
				"rainbow":
					var rb_cols: Array[Color] = [Color("#FF8787"), Color("#FFC078"), Color("#FFE066"), Color("#8CE99A"), Color("#74C0FC"), Color("#B197FC")]
					for k in range(6):
						var ang2 := float(k) * PI / 3.0 + t * 0.4
						var sp2 := c + Vector2(cos(ang2), sin(ang2)) * (half + 3.0)
						var col: Color = rb_cols[k]
						col.a = (0.30 + 0.60 * maxf(0.0, sin(t * 2.6 + float(k) * 1.3))) * a * (0.6 if night else 1.0)
						_fx_twinkle(out, zi, z, sp2, col)
				"mist":
					for k in range(2):
						var ww := 26.0 - 4.0 * float(k)
						var wx := z.position.x + 1.0 + pingpong(t * (3.0 + 1.5 * float(k)) + float(k) * 17.0, z.size.x - 2.0 - ww)
						var wy := c.y + 10.0 + 8.0 * float(k)
						_fx_tex(out, zi, z, "mist", Rect2(roundf(wx), wy, ww, roundf(ww / 1.68)), Color(1.0, 1.0, 1.0, (0.50 - 0.14 * float(k)) * a))
		else:
			match w_id:
				"sunny":
					var g_col := Color(0.86, 0.90, 1.0) if night else Color(1.0, 0.95, 0.70)
					var g_amp := 0.45 if night else 1.0
					# sunlight glinting on the cloud sea: every other glint is a big 5px star
					for k in range(12):
						var gp := Vector2(z.position.x + 10.0 + float(k) * (z.size.x - 20.0) / 11.0, z.position.y + 6.0 + fmod(float(k) * 13.7 + 3.0, z.size.y - 12.0))
						g_col.a = (0.25 + 0.75 * maxf(0.0, sin(t * 2.2 + float(k) * 1.9))) * a * g_amp
						var gq := Vector2(roundf(gp.x), roundf(gp.y))
						if k % 2 == 0:
							_fx_rect(out, zi, z, Rect2(gq.x - 2.0, gq.y, 5.0, 1.0), g_col)
							_fx_rect(out, zi, z, Rect2(gq.x, gq.y - 2.0, 1.0, 5.0), g_col)
						else:
							_fx_twinkle(out, zi, z, gq, g_col)
				"rain":
					for k in range(22):
						var rx := z.position.x + 6.0 + float(k) * (z.size.x - 12.0) / 21.0 + sin(float(k) * 3.1) * 3.0
						var ry := z.position.y + 1.0 + fmod(t * 85.0 + float(k) * 13.3, z.size.y - 8.0)
						_fx_line(out, zi, z, Vector2(rx, ry), Vector2(rx - 2.0, ry + 6.0), Color(0.62, 0.82, 1.0, 0.62 * a), 1.0)
						if ry > z.end.y - 15.0:
							_fx_rect(out, zi, z, Rect2(roundf(rx) - 3.0, z.end.y - 2.0, 5.0, 1.0), Color(0.80, 0.92, 1.0, 0.50 * a))
				"rainbow":
					var rb2: Array[Color] = [Color("#FF8787"), Color("#FFC078"), Color("#FFE066"), Color("#8CE99A"), Color("#74C0FC"), Color("#B197FC")]
					var arc_h := z.size.y - 6.0
					var half_w := z.size.x * 0.5 - 8.0
					var big_r := (half_w * half_w + arc_h * arc_h) / (2.0 * arc_h)
					var cen := Vector2(z.get_center().x, z.position.y + 2.0 + big_r)
					var foot_y := z.end.y - 4.0
					var arc_a := (0.40 if night else 0.80) * a
					var feet: Array[float] = []
					for k in range(6):
						var r_k := big_r - 2.0 * float(k)
						var dy := cen.y - foot_y
						if r_k <= dy:
							continue
						var xs := sqrt(r_k * r_k - dy * dy)
						var pts := PackedVector2Array()
						for i in range(41):
							var xx := -xs + 2.0 * xs * float(i) / 40.0
							pts.append(Vector2(cen.x + xx, cen.y - sqrt(maxf(0.0, r_k * r_k - xx * xx))))
						var rc: Color = rb2[k]
						rc.a = arc_a
						out.append({"zone": zi, "k": "poly", "p": pts, "c": rc, "w": 2.2})
						if k == 0:
							feet.clear()
							feet.append(cen.x - xs)
							feet.append(cen.x + xs)
					# little cloud puffs where the rainbow touches the cloud sea, plus a few glints along the bow
					for fx in feet:
						var fq := roundf(fx)
						_fx_rect(out, zi, z, Rect2(fq - 9.0, z.end.y - 5.0, 18.0, 3.0), Color(0.98, 0.98, 1.0, 0.90 * a))
						_fx_rect(out, zi, z, Rect2(fq - 6.0, z.end.y - 7.0, 12.0, 2.0), Color(0.98, 0.98, 1.0, 0.90 * a))
						_fx_rect(out, zi, z, Rect2(fq - 2.0, z.end.y - 9.0, 6.0, 2.0), Color(0.98, 0.98, 1.0, 0.85 * a))
						_fx_rect(out, zi, z, Rect2(fq - 8.0, z.end.y - 2.0, 16.0, 1.0), Color(0.70, 0.82, 0.95, 0.75 * a))
					for k in range(4):
						var gx := cen.x + (float(k) - 1.5) * half_w * 0.45
						var gy := cen.y - sqrt(maxf(0.0, big_r * big_r - (gx - cen.x) * (gx - cen.x))) - 3.0
						_fx_twinkle(out, zi, z, Vector2(gx, gy + 1.0), Color(1.0, 1.0, 1.0, (0.20 + 0.70 * maxf(0.0, sin(t * 2.4 + float(k) * 1.7))) * a))
				"mist":
					for k in range(2):
						var hw := 180.0 + 60.0 * float(k)
						var hx := z.position.x + 2.0 + pingpong(t * (4.0 + 2.0 * float(k)) + float(k) * 90.0, z.size.x - 4.0 - hw)
						_fx_rect(out, zi, z, Rect2(roundf(hx), z.position.y + 14.0 + 16.0 * float(k), hw, 2.0), Color(0.90, 0.91, 0.97, 0.12 * a))
					for k in range(3):
						var mw := 52.0 - 6.0 * float(k)
						var mx := z.position.x + 2.0 + pingpong(t * (5.0 + 2.5 * float(k)) + float(k) * 140.0, z.size.x - 4.0 - mw)
						var my := z.position.y + 2.0 + 7.0 * float(k)
						_fx_tex(out, zi, z, "mist", Rect2(roundf(mx), my, mw, roundf(mw / 1.68)), Color(1.0, 1.0, 1.0, (0.55 - 0.10 * float(k)) * a))
	return out

## Birthday island calendar
func get_islander_birthday_day(isl: String) -> int:
	return int(BIRTHDAY_DAYS.get(isl, 0))

func get_birthday_islander_on(day: int) -> String:
	for isl in WISH_ISLANDERS:
		if int(BIRTHDAY_DAYS.get(isl, 0)) == day:
			return isl
	return ""

func get_islander_name(isl: String) -> String:
	return tr_name(String(WISH_ISLANDER_NAMES.get(isl, "岛民")))

## True when `item_id` is one of the islander's favourite goods (wrapped into a `称心礼物`)
func is_birthday_favourite_item(isl: String, item_id: String) -> bool:
	var fav: Dictionary = BIRTHDAY_FAVOURITES.get(isl, {})
	for cat in fav.get("cats", []):
		match String(cat):
			"crop":
				if item_id.begins_with("crop_"):
					return true
			"delicacy":
				if item_id.begins_with("delicacy_") or is_solar_specialty_dish(item_id):
					return true
			"seafood":
				if is_seafood_item(item_id):
					return true
			"dairy":
				if is_dairy_item(item_id):
					return true
			"bakery":
				if is_bakery_item(item_id):
					return true
			"tea":
				if is_tea_item(item_id):
					return true
			"pottery":
				if is_pottery_item(item_id):
					return true
			"flora":
				if is_hybrid_flora(item_id):
					return true
	return false

## ---------------- CI-16: Food Critics' Week & Friendship Bonds (pure helpers) ----------------
## Monday-based week index of a local datetime (1970-01-01 was a Thursday -> +3 days), contiguous across months / years
func calc_food_week_index(dt: Dictionary) -> int:
	var n := normalize_datetime(dt)
	var noon := Time.get_unix_time_from_datetime_dict({"year": int(n["year"]), "month": int(n["month"]), "day": int(n["day"]), "hour": 12, "minute": 0, "second": 0})
	var days := int(floor(float(noon) / 86400.0))
	return int(floor(float(days + 3) / 7.0))

## Days left in the week including today (Monday -> 7, Sunday -> 1)
func calc_food_week_days_left(dt: Dictionary) -> int:
	var n := normalize_datetime(dt)
	var noon := Time.get_unix_time_from_datetime_dict({"year": int(n["year"]), "month": int(n["month"]), "day": int(n["day"]), "hour": 12, "minute": 0, "second": 0})
	var days := int(floor(float(noon) / 86400.0))
	return 7 - posmod(days + 3, 7)

func get_food_week_judge(week_idx: int) -> String:
	return WISH_ISLANDERS[posmod(week_idx, WISH_ISLANDERS.size())]

func get_food_judge_taste(isl: String) -> String:
	return String(FOOD_JUDGE_TASTES.get(isl, "sweet"))

func get_food_taste_name(taste: String) -> String:
	return tr_name(String(FOOD_TASTES.get(taste, {}).get("name", "甜香")))

func is_food_week_dish(item_id: String) -> bool:
	return FOOD_WEEK_DISHES.has(item_id)

func get_food_dish_taste(item_id: String) -> String:
	return String(FOOD_WEEK_DISHES.get(item_id, {}).get("taste", ""))

## Score of `item_id` before a judge with taste `taste` and friendship level `friend_lv` (0 when the item is not a dish)
func calc_food_week_score(item_id: String, taste: String, friend_lv: int) -> int:
	if not FOOD_WEEK_DISHES.has(item_id):
		return 0
	var s := int(FOOD_WEEK_DISHES[item_id]["base"])
	if String(FOOD_WEEK_DISHES[item_id]["taste"]) == taste:
		s += FOOD_WEEK_TASTE_BONUS
	s += FOOD_WEEK_FRIEND_BONUS_PER_LEVEL * clampi(friend_lv, 0, FRIEND_MAX_LEVEL)
	return mini(FOOD_WEEK_SCORE_CAP, s)

## Medal tier of a score: 0 none, 1 bronze, 2 silver, 3 gold
func calc_food_week_tier(score: int) -> int:
	var tier := 0
	for i in range(FOOD_WEEK_MEDAL_ORDER.size()):
		if score >= int(FOOD_WEEK_MEDALS[FOOD_WEEK_MEDAL_ORDER[i]]["min"]):
			tier = i + 1
	return tier

func get_food_medal_name(tier: int) -> String:
	if tier <= 0 or tier > FOOD_WEEK_MEDAL_ORDER.size():
		return ""
	return tr_name(String(FOOD_WEEK_MEDALS[FOOD_WEEK_MEDAL_ORDER[tier - 1]]["name"]))

func calc_friend_level(points: int) -> int:
	var lv := 0
	for i in range(FRIEND_LEVEL_POINTS.size()):
		if points >= FRIEND_LEVEL_POINTS[i]:
			lv = i
	return mini(lv, FRIEND_MAX_LEVEL)

## Points needed for the next level ("-1" at max level)
func get_friend_next_points(level: int) -> int:
	if level >= FRIEND_MAX_LEVEL:
		return -1
	return FRIEND_LEVEL_POINTS[level + 1]

func calc_friend_price_bonus(total_levels: int) -> float:
	return minf(FRIEND_PRICE_CAP, FRIEND_PRICE_PER_LEVEL * float(maxi(0, total_levels)))

## One sports day: march-in + 3 events (`12s` + `2s` break, the last break replaced by the award ceremony).
func get_sports_day_total_sec() -> float:
	return SPORTS_GATHER_SEC + float(SPORTS_EVENT_ORDER.size()) * (SPORTS_EVENT_SEC + SPORTS_BREAK_SEC) - SPORTS_BREAK_SEC + SPORTS_AWARD_SEC

## Start time of mini event `k` measured from the opening of the sports day.
func get_sports_event_start_sec(k: int) -> float:
	return SPORTS_GATHER_SEC + float(maxi(0, k)) * (SPORTS_EVENT_SEC + SPORTS_BREAK_SEC)

## One night of the open-air cinema (`3` screenings of `12s` + `2s` intermission).
func get_cinema_night_programme_sec() -> float:
	return CINEMA_SLOT_SEC * float(CINEMA_FILM_ORDER.size())

## Period of one boat round trip on the harbor clock (`dock + sail out + at sea + sail back`).
func get_harbor_boat_period() -> float:
	return HARBOR_BOAT_DOCK_SEC + HARBOR_BOAT_SAIL_SEC + HARBOR_BOAT_SEA_SEC + HARBOR_BOAT_SAIL_SEC

func get_auction_bidder_name(bidder_id: String) -> String:
	return tr_name(_get_auction_bidder_raw_name(bidder_id))

## Short bidder tag for a 2-row card: zh keeps the first 2 glyphs (`椰子商人` -> `椰子`), other languages their own short word
func get_auction_bidder_short_name(bidder_id: String) -> String:
	return tr_name(_get_auction_bidder_raw_name(bidder_id).substr(0, 2))

func _get_auction_bidder_raw_name(bidder_id: String) -> String:
	if bidder_id == "player":
		return "你"
	for b in AUCTION_BIDDERS:
		if String(b.get("id", "")) == bidder_id:
			return String(b.get("name", bidder_id))
	return bidder_id

## Item name in the current language (zh source text from the data tables -> `tr_name`)
func get_item_display_name(item_id: String) -> String:
	return tr_name(get_item_raw_name(item_id))

## Short item label for compact lists (airship order brief): zh keeps its own rule in the caller, en the first word, ja 3 glyphs
func get_item_short_label(item_id: String) -> String:
	var nm := get_item_display_name(item_id)
	if current_lang == "en_US":
		return nm.split(" ")[0]
	return nm.substr(0, 3) if nm.length() > 3 else nm

## Item name as stored in the data tables (zh source text) -> safe for saves / logic
func get_item_raw_name(item_id: String) -> String:
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
	if TASTING_DISHES.has(item_id):
		return String(TASTING_DISHES[item_id].get("name", item_id))
	if item_id == SEAFOOD_ITEM_ID:
		return "云海鲜渔获"
	if AUCTION_LOTS.has(item_id):
		return String(AUCTION_LOTS[item_id].get("name", item_id))
	if DAIRY_ITEMS.has(item_id):
		return String(DAIRY_ITEMS[item_id].get("name", item_id))
	if CINEMA_FILMS.has(item_id):
		return String(CINEMA_FILMS[item_id].get("name", item_id))
	if POTTERY_ITEMS.has(item_id):
		return String(POTTERY_ITEMS[item_id].get("name", item_id))
	if SPORTS_EVENTS.has(item_id):
		return String(SPORTS_EVENTS[item_id].get("name", item_id))
	if KITE_TYPES.has(item_id):
		return String(KITE_TYPES[item_id].get("name", item_id))
	if SEASONS.has(item_id):
		return String(SEASONS[item_id].get("deco_name", item_id))
	if is_photo_id(item_id):
		return String(get_photo_entry_info(item_id).get("name", item_id))
	return item_id

func calc_item_unit_price(item_id: String, building_lv: int, stall_lv: int, shiba_lv: int, current_solar_idx: int = -1) -> int:
	var shiba_mult := calc_shiba_price_bonus(shiba_lv)
	var stall_mult := 1.0 + 0.08 * float(maxi(1, stall_lv) - 1)
	if item_id == SEAFOOD_ITEM_ID:
		var sf_raw := calc_milestone_value(SEAFOOD_BASE_GOLD, maxi(1, building_lv))
		return maxi(1, int(round(sf_raw * stall_mult * shiba_mult)))
	if DAIRY_ITEMS.has(item_id):
		var dy: Dictionary = DAIRY_ITEMS[item_id]
		var dy_raw := calc_milestone_value(float(dy.get("base_gold", 240)), maxi(1, building_lv))
		return maxi(1, int(round(dy_raw * stall_mult * shiba_mult)))
	if POTTERY_ITEMS.has(item_id):
		var pt: Dictionary = POTTERY_ITEMS[item_id]
		var pt_raw := calc_milestone_value(float(pt.get("base_gold", 120)), maxi(1, building_lv))
		return maxi(1, int(round(pt_raw * stall_mult * shiba_mult)))
	if TASTING_DISHES.has(item_id):
		var td: Dictionary = TASTING_DISHES[item_id]
		var td_base := float(td.get("base_gold", 1680))
		var td_raw := calc_milestone_value(td_base, maxi(1, building_lv))
		return maxi(1, int(round(td_raw * stall_mult * shiba_mult)))
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
