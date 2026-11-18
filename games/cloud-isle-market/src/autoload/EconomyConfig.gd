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
		"drawer_wish_board": "【岛民心愿委托告示板】轮流许愿·完成得声望与图鉴券·已圆梦 %d 张",
		"drawer_codex_ci15": "【图鉴】食%d/8·节%d/4·花%d/2·礼%d/2·汤%d/3·烘%d/3·茗%d/3·宴%d/3·拍%d/3
乳%d/3·影%d/3·陶%d/3·运%d/3·筝%d/3·季%d/4·摄%d/6·天%d/4·寿%d/6·勋%d/%d",
		"drawer_birthday": "【岛民生日会】每月3/8/13/18/23/28日·备礼得声望和图鉴券·庆生%d次",
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
		"drawer_build": "[Build] Kiln·Dairy·Harbor·Chef·Tea·Greenhouse·Spa·Bakery·25Lv evo!",
		"drawer_animal": "[Animal Crew] Click to pet (+50% spd) · Unlock traits at Lv.10/25/50!",
		"drawer_expand": "[Islands & Fests] Bridges, Airship, 11 fests, Photo Tour, Wishes, Weather & Birthdays!",
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
		"drawer_wish_board": "[Wish Board] Islander requests · Rep & vouchers · Granted %d",
		"drawer_codex_ci15": "[Codex] Dish%d/8·Sol%d/4·Flo%d/2·Box%d/2·Spa%d/3·Bak%d/3·Tea%d/3·Fst%d/3·Auc%d/3
Milk%d/3·Film%d/3·Pot%d/3·Sport%d/3·Kite%d/3·Ssn%d/4·Pic%d/6·Sky%d/4·Bday%d/6·Med%d/%d",
		"drawer_birthday": "[Birthdays] Days 3/8/13/18/23/28 · Gifts: rep & vouchers · Parties %d",
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
		"drawer_wish_board": "【島民の願い掲示板】順番に依頼・名声と図鑑券・叶えた願い %d 件",
		"drawer_codex_ci15": "【図鑑】食%d/8·節%d/4·花%d/2·箱%d/2·湯%d/3·パン%d/3·茶%d/3·宴%d/3·競%d/3
乳%d/3·映%d/3·陶%d/3·運%d/3·凧%d/3·季%d/4·写%d/6·天%d/4·誕%d/6·勲%d/%d",
		"drawer_birthday": "【誕生日会】毎月3/8/13/18/23/28日・贈り物で名声と図鑑券・%d回",
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
	return String(WISH_ISLANDER_NAMES.get(isl, "岛民"))

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
	if bidder_id == "player":
		return "你"
	for b in AUCTION_BIDDERS:
		if String(b.get("id", "")) == bidder_id:
			return String(b.get("name", bidder_id))
	return bidder_id

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
