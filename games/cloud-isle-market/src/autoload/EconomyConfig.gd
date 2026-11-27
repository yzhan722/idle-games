extends Node
## Pure Idle Economy Math, Recruit Caps, Lv.25 Auto-Evolution, Native Typography & Drop Shadow Math (`EconomyConfig.gd`)
## Strictly enforces GEMINI.md Engineering Laws 1~6.

const GROUND_Y := 124.0
const MIN_BUILDING_PADDING := 28.0
const DECOR_OUTER_OFFSET := 16.0

const Z_TERRAIN := -20
const Z_SHADOW := -5
const Z_SOIL_BASE := -2
const Z_BUILDING := 0
const Z_CROP := 1
const Z_UNIT := 10
const Z_CARRY_EMOTE := 20
const Z_FLOATING_UI := 50

const MULTIPLIER_MORTAR := 3.5
const MULTIPLIER_CAULDRON := 12.0
const MULTIPLIER_CORAL_LINKED := 52.0
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
	"delicacy_3": {"name": "皇家凤梨星露宴", "idx": 3, "tier": 3, "workshop": "coral_linked", "base_crop_val": 48, "mult": MULTIPLIER_CORAL_LINKED}
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
		"workshop": "coral_linked",
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
const GREENHOUSE_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["greenhouse"]

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
const VIP_HOTSPRING_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_hedgehog_normalized.png"
const HOTSPRING_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["hotspring"]

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
const PARADE_TOURIST_TRAVELER_TEX := "res://assets/pixel_art/travelers/traveler_raccoon_normalized.png"
const WINDMILL_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["windmill"]

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
const TEA_PAVILION_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["tea_pavilion"]
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
const CHEF_TASTING_PAVILION_TEX := "res://assets/pixel_art/buildings/chef_tasting_pavilion.png"
const DISH_CLOUD_DUMPLINGS_TEX := "res://assets/pixel_art/ui/dish_cloud_dumplings.png"
const DISH_STARLIGHT_FISH_TEX := "res://assets/pixel_art/ui/dish_starlight_fish.png"
const DISH_MOUNTAIN_SEA_HOTPOT_TEX := "res://assets/pixel_art/ui/dish_mountain_sea_hotpot.png"
const ICON_CHEF_MEDAL_TEX := "res://assets/pixel_art/ui/icon_chef_medal.png"
const CHEF_PAVILION_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["chef_pavilion"]
const WISH_LANTERN_SALE_BUFF_MULT := 1.30
const WISH_LANTERN_TASTING_SCORE_BONUS := 14
const TASTING_PASS_SCORE := 80

## Island 2 slot of the tasting pavilion (rightmost slot, flush against Bridge 1 west endpoint `x = 492.0`)
const CHEF_PAVILION_SLOT_X := 469.9

## Water lanes for drifting star lanterns (`waterline_y` = bottom-center anchor of each lantern on the water surface).
## Every lane was sampled against the island textures so the lantern ripple footprint stays 100% on water:
##   - Lotus Pond lanes (Island 1, `island_meadow.png` drawn at local `(560, 70)`), above the twin pond bridges (`y >= 118`);
##   - Coast shallows lanes (Island 3, `island_coral_coast.png` drawn at local `(1396, 74 + bob)`), below all
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

## CI-10: Cloud-Sea Lighthouse Fishing Harbor (`云海灯塔渔港`)
const LIGHTHOUSE_HARBOR_TEX := "res://assets/pixel_art/buildings/lighthouse_harbor.png"
const FISHING_BOAT_TEX := "res://assets/pixel_art/ui/fishing_boat.png"
const SEAFOOD_CATCH_TEX := "res://assets/pixel_art/ui/seafood_catch.png"
const LIGHTHOUSE_HARBOR_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["lighthouse_harbor"]
## Island 3 slot 5 (between `CloudHotspringInn_3` and `RightTiki_3`): the harbor pier faces the east fishing cove
const LIGHTHOUSE_HARBOR_SLOT_X := 1743.4
const SEAFOOD_ITEM_ID := "seafood_catch"

## Fishing boat lane in the Island 3 east cove (local coords, `island_coral_coast.png` drawn at `(1396, 74 + bob)`).
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

## CI-11: Cloud Ranch Dairy Workshop (`云端牧场乳品工坊`) & Starry Night-Market Open-Air Cinema (`星空夜市露天电影院`)
const DAIRY_WORKSHOP_TEX := "res://assets/pixel_art/buildings/dairy_workshop.png"
const OPEN_AIR_CINEMA_TEX := "res://assets/pixel_art/buildings/open_air_cinema.png"
const MILK_BOTTLE_TEX := "res://assets/pixel_art/ui/milk_bottle.png"
const CHEESE_WHEEL_TEX := "res://assets/pixel_art/ui/cheese_wheel.png"
const CLOUD_PUDDING_TEX := "res://assets/pixel_art/ui/cloud_pudding.png"
const ICON_MOVIE_TICKET_TEX := "res://assets/pixel_art/ui/icon_movie_ticket.png"
const DAIRY_WORKSHOP_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["dairy_workshop"]
const OPEN_AIR_CINEMA_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["open_air_cinema"]
## Island 1 slot 4 (between `MushroomCottage_1` and `MortarWorkshop_1`) after the CI-11 7-slot re-lay of Island 1:
## the dairy barn joins the meadow farmhouse, every adjacent clear gap on Island 1 is 28.05..28.18px.
const DAIRY_WORKSHOP_SLOT_X := 817.3
## The open-air cinema is a night-only EVENT PROP (not a main building): it stands on the Island 1 east headland,
## the solid grass `[1313..1356]` between the Lotus Pond east bridge (`1302`) and Bridge 2, far from every main building.
const OPEN_AIR_CINEMA_SLOT_X := 1334.5
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
const CINEMA_TICKET_MIN_GOLD := 2
const CINEMA_TICKET_GPS_SEC := 1.5
## Night-market boost while the cinema is open (night only): every stall sale x1.25, cinema snacks x1.35 at the concession
const CINEMA_NIGHT_SALE_MULT := 1.25
## Each snack sold is worth this many seconds of income
const CINEMA_SNACK_SEC := 2.0
const CINEMA_VISITOR_SPAWN_MULT := 1.6
const CINEMA_SNACK_CANDIDATES: Array[String] = ["dairy_cloud_pudding", "dairy_milk"]

## CI-12: Cloud Pottery Kiln Workshop (`云端陶艺窑坊`)
## SPACE DECISION: the fixed `1920x300` desktop strip has only `64px` of sky left of Island 2 and right of Island 3, so a 4th
## islet would sit off-screen at the default `1.0x` view. Instead the kiln takes over Island 3 slot 1 at the Bridge 2 landing,
## the slot the decorative duplicate apple tree used (`AppleTree_1` keeps the island 1 orchard): same `112px` texture width at
## the same `0.39` scale (`43.68px`), so every Island 3 gap stays `28.06px` and the island keeps 6 buildings (19 total).
const POTTERY_KILN_TEX := "res://assets/pixel_art/buildings/pottery_kiln.png"
const CLAY_LUMP_TEX := "res://assets/pixel_art/ui/clay_lump.png"
const CLAY_VASE_TEX := "res://assets/pixel_art/ui/clay_vase.png"
const TEA_BOWL_TEX := "res://assets/pixel_art/ui/tea_bowl.png"
const POTTERY_KILN_UNLOCK_COST_GOLD: int = Pacing.UNLOCK["pottery_kiln"]
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
## (x <= 1542). Both lanes stay clear of the sky balloon path (x 560..1264),
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
const KITE_MIN_GOLD := 10
## `风筝满天`: all 6 kites of one festival collected -> sweep medal + amber + voucher + reputation
const KITE_SWEEP_AMBER := 2
const KITE_SWEEP_VOUCHERS := 1
const KITE_SWEEP_REP := 60
const KITE_BADGE_POS := Vector2(66.0, -34.0)

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
## Free ground spots = the 28px building gaps that host NO worker rest dock, or landscape prop (Island 2
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

const ICON_WISH_BOARD_TEX := "res://assets/pixel_art/ui/icon_wish_board.png"
const WISH_NOTE_TEX := "res://assets/pixel_art/ui/wish_note.png"
const REPUTATION_STAR_TEX := "res://assets/pixel_art/ui/reputation_star.png"

## Wish board: 3 notes; islanders take turns (fixed order, no RNG). Each islander alternates between 2 favourite wish types
## (delivery wishes `交付` / business-goal wishes `经营`); targets grow by one tier per full islander round (max tier 4).
const WISH_SLOT_COUNT := 3
const WISH_LIFETIME_SEC := 3600.0
const WISH_LINGER_SEC := 60.0
const WISH_ISLANDERS: Array[String] = ["bunny", "otter", "fox", "shiba", "penguin", "toucan"]
const WISH_ISLANDER_NAMES: Dictionary = {"bunny": "月兔", "otter": "水獭", "fox": "小狐狸", "shiba": "柴犬", "penguin": "企鹅", "toucan": "巨嘴鸟"}
const WISH_ISLANDER_PREFS: Dictionary = {
	"bunny": ["harvest", "serve"],
	"otter": ["stock", "harvest"],
	"fox": ["craft", "earn"],
	"shiba": ["serve", "stock"],
	"penguin": ["craft", "harvest"],
	"toucan": ["serve", "earn"]
}
const WISH_TYPES: Dictionary = {
	"harvest": {"id": "harvest", "kind": "交付", "name": "丰收心愿", "verb": "收获作物", "unit": "份", "base": 10, "step": 4, "rep": 30, "vouchers": 1},
	"stock": {"id": "stock", "kind": "交付", "name": "上架心愿", "verb": "集市上架", "unit": "件", "base": 12, "step": 4, "rep": 32, "vouchers": 1},
	"craft": {"id": "craft", "kind": "交付", "name": "工坊心愿", "verb": "工坊出品", "unit": "件", "base": 4, "step": 2, "rep": 36, "vouchers": 1},
	"serve": {"id": "serve", "kind": "经营", "name": "迎客心愿", "verb": "接待顾客", "unit": "位", "base": 4, "step": 2, "rep": 40, "vouchers": 1},
	"earn": {"id": "earn", "kind": "经营", "name": "营收心愿", "verb": "集市营收", "unit": "G", "base": 60, "step": 0, "gold_sec": 40.0, "rep": 45, "vouchers": 2}
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
	"rain": {"id": "rain", "name": "细雨", "full_name": "云海细雨", "tex": WEATHER_RAIN_TEX, "visitor": 0.85, "crop": 1.25, "workshop": 1.10, "sale": 1.00, "desc": "农田+25% 工坊+10% 客流-15%", "tag": "农田+25%"},
	"rainbow": {"id": "rainbow", "name": "彩虹", "full_name": "雨后彩虹", "tex": WEATHER_RAINBOW_TEX, "visitor": 1.30, "crop": 1.05, "workshop": 1.05, "sale": 1.10, "desc": "客流+30% 售价+10% 产出+5%", "tag": "客流+30%"},
	"mist": {"id": "mist", "name": "薄雾", "full_name": "云海薄雾", "tex": WEATHER_MIST_TEX, "visitor": 0.90, "crop": 1.00, "workshop": 1.15, "sale": 1.05, "desc": "工坊+15% 售价+5% 客流-10%", "tag": "工坊+15%"}
}
## The weather is a pure function of the island calendar (the injectable `GameManager.season_clock`, shared with the CI-13
## seasons): the local day is cut into 20-minute slots; each slot draws sunny / rain / mist from its season's weights with a
## deterministic integer hash (no RNG), and a rainbow only ever appears in the slot right after a rain slot.
const SKY_WEATHER_SLOT_MINUTES := 180
const SKY_WEATHER_REFRESH_SEC := 30.0
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
##   visitor arrivals: weather x festivals (x1.85) x night cinema <= x2.20
const SKY_WEATHER_PROD_STACK_CAP := 1.50
const SKY_WEATHER_SALE_STACK_CAP := 1.30
const SKY_WEATHER_VISITOR_STACK_CAP := 2.20
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
const BIRTHDAY_GIFT_MIN_GOLD := 30
const BIRTHDAY_REP := 50
const BIRTHDAY_VOUCHERS := 1
const BIRTHDAY_FAV_REP := 30
const BIRTHDAY_FAV_VOUCHERS := 1
## `生日全家福`: every full round (all 6 islanders celebrated once more) -> medal +2 vouchers +80 reputation
const BIRTHDAY_MEDAL_REP := 80
const BIRTHDAY_MEDAL_VOUCHERS := 2

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
	"soil_1": {"name": "晨风农田", "desc": "每25级作物自动换代+产能翻倍+外观进化", "base_value": 12, "island": 1},
	"mortar": {"name": "桂花研钵工坊", "desc": "狐狸研磨3.5x美食 · 每25级菜品与外观进化", "base_value": 42, "island": 1},
	"stall": {"name": "云岛集市主摊位", "desc": "扩充缓存上限(10+5/级) · Lv.25解锁暖光路灯", "base_value": 50, "island": 1},
	"soil_2": {"name": "森谷农田", "desc": "岛2魔法作物产能 · 每25级品种与外观进化", "base_value": 30, "island": 2},
	"cauldron": {"name": "星露炼金坩埚", "desc": "企鹅炼制12x甘露 · Lv.25开启炼金星火粒子", "base_value": 360, "island": 2},
	"soil_3": {"name": "珊瑚滩双工坊", "desc": "岛3顶级农田+研钵坩埚联动 (52x价值)", "base_value": 2496, "island": 3},
	"greenhouse": {"name": "云端温室培育房", "desc": "杂交培育奇花异草 · 光环增益与伴手礼盒", "base_value": 120, "island": 2},
	"hotspring": {"name": "云海温泉汤屋", "desc": "调制草本花瓣浴汤 · 员工精力恢复+贵宾琥珀小费", "base_value": 180, "island": 3},
	"windmill": {"name": "云端风车面坊", "desc": "风磨金麦粉烘焙欧包可颂 · 麦香光环提速1.20x+", "base_value": 165, "island": 2},
	"tea_pavilion": {"name": "云端茗香制茶坊", "desc": "杀青春芽慢沏龙井乌龙 · 茗香清心光环效率&小费增益", "base_value": 150, "island": 1},
	"chef_pavilion": {"name": "山海食神品鉴席", "desc": "三岛食材组合烹制特级名菜 · 品鉴挑战赢食神勋章", "base_value": 210, "island": 2},
	"lighthouse_harbor": {"name": "云海灯塔渔港", "desc": "双渔船轮班出海捕鲜货 · 供应品鉴席与集市", "base_value": 230, "island": 3},
	"dairy_workshop": {"name": "云端牧场乳品工坊", "desc": "鲜草饲喂挤云朵鲜奶 · 熟成奶酪与云朵布丁供应集市与品鉴席", "base_value": 175, "island": 1},
	"pottery_kiln": {"name": "云端陶艺窑坊", "desc": "收获陶土+秸秆柴烧制茶碗/陶花瓶 · 供应集市与伴手礼盒", "base_value": 185, "island": 3}
}

const ANIMALS: Dictionary = {
	"bunny": {"name": "月兔 · 专职农夫", "role_tag": "无水獭时直达集市 · 招满后全队进修提速", "sheet": "animals/bunny_sheet.png", "base_time": 2.6, "base_speed": 72.0, "base_cap": 1},
	"otter": {"name": "水獭 · 岛内物流员", "role_tag": "接管岛内搬运 · 工坊满载自动分流直售", "sheet": "animals/otter_sheet.png", "base_time": 1.5, "base_speed": 80.0, "base_cap": 2},
	"fox": {"name": "小狐狸 · 研钵主厨", "role_tag": "驻守研钵工坊 · 研磨3.5x/52x精制美食", "sheet": "animals/fox_sheet.png", "base_time": 3.4, "base_speed": 64.0, "base_cap": 1},
	"shiba": {"name": "柴犬 · 金牌店长", "role_tag": "加速收银结账 · 全摊位售价+10%/级", "sheet": "animals/shiba_sheet.png", "base_time": 1.0, "base_speed": 66.0, "base_cap": 1},
	"penguin": {"name": "小企鹅 · 坩埚炼金师", "role_tag": "驻守坩埚工坊 · 炼制12x/52x高阶甘露", "sheet": "animals/penguin_sheet.png", "base_time": 4.0, "base_speed": 60.0, "base_cap": 1},
	"toucan": {"name": "巨嘴鸟 · 跨岛专员", "role_tag": "跨木桥批量将岛2/岛3料理运回岛1主集市", "sheet": "animals/toucan_sheet.png", "base_time": 1.4, "base_speed": 94.0, "base_cap": 3}
}

const EXPANSIONS: Dictionary = {
	"island_2": {"name": "木桥1 · 荧光森谷", "desc": "开启2x农田+12x坩埚工坊+企鹅/巨嘴鸟编制", "cost": Pacing.UNLOCK["isle2"]},
	"island_3": {"name": "木桥2 · 珊瑚晴滩", "desc": "开启双工坊52x联动+★2.0x皇冠富豪顾客", "cost": Pacing.UNLOCK["isle3"]}
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
	# the 13px world captions are ink-off (see MainWorld._quiet_world_texts) and only keep their footprint
	if size >= 14:
		ls.font = UiKit.font(true)
		ls.outline_size = 5
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
	elif workshop_id == "coral_linked":
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

func calc_buffer_capacity(level: int) -> int:
	return DEFAULT_BUFFER_CAP + maxi(0, level - 1) * 5

## v2.7-1: 16 In-App & Steam Core Achievements
const ACHIEVEMENTS: Dictionary = {
	"ach_welcome": {"id": "ach_welcome", "name": "初入云岛", "desc": "开启云岛集市经营之旅"},
	"ach_first_gold": {"id": "ach_first_gold", "name": "第一桶金", "desc": "累计赚取 500 金币"},
	"ach_mortar_chef": {"id": "ach_mortar_chef", "name": "研钵飘香", "desc": "制作第 1 份桂花研钵美食"},
	"ach_island_2": {"id": "ach_island_2", "name": "森谷开拓者", "desc": "修复木桥解锁 2 号岛【荧光森谷】"},
	"ach_island_3": {"id": "ach_island_3", "name": "珊瑚晴滩", "desc": "修复木桥解锁 3 号岛【珊瑚晴滩】"},
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
	"ach_dairy_ranch": {"id": "ach_dairy_ranch", "name": "云端牧场主", "desc": "点亮云端牧场乳品工坊全部 3 款乳品(云朵鲜奶/熟成奶酪/云朵布丁)"},
	"ach_starry_cinema": {"id": "ach_starry_cinema", "name": "星空影迷", "desc": "星空夜市露天电影院一夜连映 3 部影片，荣获星空影迷勋章"},
	"ach_pottery_kiln": {"id": "ach_pottery_kiln", "name": "云端窑主", "desc": "点亮云端陶艺窑坊全部 3 款陶艺(云岛陶土/云纹茶碗/青釉陶花瓶)"},
	"ach_kite_sweep": {"id": "ach_kite_sweep", "name": "风筝满天", "desc": "在一届云海风筝节上收下全部 6 只像素风筝，荣获风筝满天勋章"},
	"ach_four_seasons": {"id": "ach_four_seasons", "name": "四季岛主", "desc": "按真实月份见证岛屿春夏秋冬四季装扮全部 4 种"},
	"ach_wish_keeper": {"id": "ach_wish_keeper", "name": "心愿守护者", "desc": "为岛民圆梦 6 张心愿委托便签，荣获心愿勋章"},
	"ach_weather_watcher": {"id": "ach_weather_watcher", "name": "云海观天师", "desc": "按岛历见证云海晴 / 细雨 / 彩虹 / 薄雾全部 4 种天气"},
	"ach_birthday_family": {"id": "ach_birthday_family", "name": "生日全家福", "desc": "为 6 位岛民各办一次生日会，荣获生日全家福勋章"}
}

## v2.7-2: Multi-language Internationalization Dictionary (`zh_CN` / `en_US` / `ja_JP`)
const SUPPORTED_LANGS: Array[String] = ["zh_CN", "en_US", "ja_JP"]
var current_lang: String = "zh_CN"
## Key of the building under the mouse ("" = none): buildings only draw their progress bar while it is theirs
var hovered_building: String = ""

const I18N_DICT: Dictionary = {
	"zh_CN": {
		"bn_seg_voucher": " +%d图鉴券",
		"bn_pomodoro": "专注完成 +%dG",
		"ui_dur_hm": "%d小时%d分",
		"ui_dur_ms": "%d分%d秒",
		"ui_dur_s": "%d秒",
		"bn_offline": "离线 %s，收获 %s 金币",
		"ui_focus25": "25:00",
		"ui_noise_off": "关",
		"ui_noise_on": "%s",
		"ui_cap_stealth": "F9 恢复",
		"ui_trait_locked": "%s",
		"cd_gh_new": "云端温室",
		"cd_hs_new": "云海汤屋",
		"cd_wm_new": "风车面坊",
		"cd_tp_new": "茗香茶坊",
		"cd_cp_new": "食神席",
		"cd_lh_new": "灯塔渔港",
		"cd_dw_new": "乳品工坊",
		"cd_pk_new": "陶艺窑坊",
		"ui_lb_crop": "农田生长",
		"ui_lb_workshop": "工坊速度",
		"ui_lb_tip": "全岛小费",
		"ui_lb_buff": "增益",
		"cd_bd_days": "%d 天后",
		"cx_tier1": "晨露田园",
		"cx_tier2": "果香烘焙",
		"cx_tier3": "森谷星露",
		"cx_tier4": "云海盛宴",
		"bp_gift_done": "已送达",
		"fw_entry_none": "货架上还没有菜",
		"fr_isl_max": "已满",
		"ft_food_week": "{1}",
		"ft_gift_bag": "+{0}G +{1}琥珀",
		"ft_w_packed": "{0}",
		"ft_w_gh_cycle": "{0}",
		"ft_w_parade": "",
		"ft_w_baked": "{0} +{1}",
		"ft_w_milled": "+{0}",
		"ft_w_wm_cycle": "{0}",
		"ft_w_brewed_tea": "{0} +{1}",
		"ft_w_roasted": "+{0}",
		"ft_w_tp_cycle": "{0}",
		"ft_w_cooked": "{0}",
		"ft_w_cp_cycle": "{0}",
		"ft_w_bath": "{0}",
		"ft_w_hs_cycle": "{0}",
		"ft_w_fish_shipped": "+{0}",
		"ft_w_dairy_made": "{0}",
		"ft_w_milked": "+{0}",
		"ft_w_snack": "+{0}G",
		"ft_w_fired": "{0}",
		"ft_w_air_load": "+{0}",
		"ft_contract_done": "+{0}G +{1}琥珀",
		"ft_voucher_recipe": "{0}",
		"ft_four_seasons_perk": "+{1}G +{0}琥珀",
		"ft_airship_done": "+{0}G +{1}琥珀",
		"ft_landscape": "{0}",
		"ft_gh_open": "",
		"ft_flora_bred": "{0}",
		"ft_hs_open": "",
		"ft_bath_recipe": "{0}",
		"ft_wm_open": "",
		"ft_bake_recipe": "{0}",
		"ft_tp_open": "",
		"ft_tea_recipe": "{0}",
		"ft_moontea_open": "",
		"ft_moontea_need": "",
		"ft_moontea_reward": "+{0}琥珀",
		"ft_lantern_open": "",
		"ft_wish_granted": "",
		"ft_lantern_wish": "",
		"ft_lantern_reward": "+{0}G +{1}琥珀",
		"ft_cp_open": "",
		"ft_tasting_pass": "{1}",
		"ft_tasting_fail": "{1}",
		"ft_lh_open": "",
		"ft_boat_back": "+{0}",
		"ft_dw_open": "",
		"ft_cin_open": "",
		"ft_film_start": "",
		"ft_cin_medal": "",
		"ft_cin_end": "",
		"ft_cin_audience": "+{1}G",
		"ft_cin_snack": " +{0}G",
		"ft_pk_open": "",
		"ft_kite_open": "",
		"ft_wish_done": "{0}",
		"ft_wish_medal": "",
		"ft_bday": "{0}",
		"ft_bday_medal": "",
		"ft_achievement": "{0}",
		"gm_career": "★%d星 · 收%d · 制%d · 客%d · 契%d",
		"gm_wish_reward": "声望+%d 券+%d",
		"gm_wish_left": " 余%s",
		"gm_wish_done_title": "★%s圆梦啦!",
		"gm_wish_claimed": " 已领取",
		"gm_wish_expired_title": "★%s的便签过期",
		"gm_wish_new_in": "新便签 %ds 后轮换",
		"gm_wish_void": " 已失效",
		"ft_pet_boost": "加速",
		"ft_tag_fresh": "+",
		"ft_tag_divert": "+",
		"ft_tag_mortar": "+",
		"ft_tag_cross": "+",
		"ft_tag_feast": "+",
		"ft_tag_nectar": "+",
		"ft_tea_guest": "+{0}G +{1}琥珀",
		"ft_wait_tea": "…",
		"ft_parade_guest": "+{0}G +{1}琥珀",
		"ft_wait_bread": "…",
		"ft_spa_guest": "+{0}G +{1}琥珀",
		"ft_wait_bath": "…",
		"ft_collector": "+{0}G +{1}琥珀",
		"ft_wait_box": "…",
		"ft_trader": "+{2}G +{1}琥珀",
		"ft_no_surplus": "…",
		"ft_critic": "好评",
		"ft_wait_dish": "…",
		"ft_vip_tip": "小费 ×2",
		"ft_sold_out_leave": "…",
		"ft_milestone": "Lv.{0}",
		"nav_build": "建筑",
		"nav_animal": "伙伴",
		"nav_expand": "开拓",
		"nav_codex": "图鉴",
		"nav_settings": "设置",
		"ui_back": "返回",
		"ui_close": "关闭",
		"sec_isle1": "晨风主岛",
		"sec_isle2": "荧光森谷",
		"sec_isle3": "珊瑚晴滩",
		"sec_expand": "岛屿",
		"sec_orders": "生意",
		"sec_fest": "节庆",
		"sec_food": "料理",
		"sec_theme": "收藏",
		"sec_honor": "勋章",
		"nm_soil_1": "晨风农田",
		"nm_mortar": "研钵工坊",
		"nm_stall": "集市摊位",
		"nm_cauldron": "炼金坩埚",
		"nm_soil_2": "森谷农田",
		"nm_soil_3": "海岸工坊",
		"nm_air": "远洋商队",
		"nm_box": "名物礼盒",
		"nm_spa": "温泉浴汤",
		"nm_parade": "花车巡游",
		"nm_moontea": "画舫雅集",
		"nm_lantern": "星灯节",
		"nm_cinema": "露天影院",
		"nm_kite": "风筝节",
		"nm_wish": "心愿板",
		"nm_birthday": "生日会",
		"nm_food": "美食周",
		"nm_friend": "羁绊",
		"nm_season": "%s装扮",
		"nm_solar": "节气 %s",
		"nm_ach": "成就",
		"nm_cx_flora": "奇花礼盒",
		"nm_cx_spa": "灵泉汤鉴",
		"nm_cx_bak": "云端烘焙",
		"nm_cx_tea": "茗香茶韵",
		"nm_cx_chef": "山海食神",
		"nm_cx_cin": "星空影院",
		"nm_cx_pk": "陶艺",
		"nm_cx_kt": "云海风筝",
		"nm_cx_sw": "云海天气",
		"nm_cx_fw": "美食评鉴",
		"vb_start": "开始",
		"vb_load": "装船",
		"vb_pack": "打包",
		"vb_brew": "调汤",
		"vb_snack": "卖零食",
		"vb_gift": "备礼",
		"vb_submit": "提交",
		"hb_stock": "%s · 库存 %d",
		"hb_shelf": "货架 %d/%d",
		"hb_next": "%d 级蜕变，产能翻倍",
		"hb_crew": "%s · %d/%d 只",
		"bk_1": "×1",
		"bk_10": "×10",
		"bk_max": "最多",
		"gu_hedgehog": "刺猬",
		"gu_raccoon": "小浣熊",
		"gu_black_bunny": "墨兔",
		"gu_capybara": "水豚",
		"gu_grey_cat": "灰猫",
		"gu_brown_bunny": "棕兔",
		"gu_critic": "美食猫",
		"gu_cat": "橘猫",
		"gu_snow_hedgehog": "雪刺猬",
		"gu_red_raccoon": "小红熊",
		"gu_silver_fox": "银狐",
		"gu_husky": "哈士奇",
		"gu_rose_toucan": "翠羽鸟",
		"gu_sakura_capybara": "樱花水豚",
		"gu_gold_penguin": "绯企鹅",
		"gu_snow_otter": "雪獭",
		"de_apple_tree": "苹果树",
		"de_clay_vase": "陶花瓶",
		"de_star_lantern": "星灯",
		"de_wash_tub": "木澡盆",
		"de_milk_bottle": "大奶瓶",
		"de_toy_house": "玩具屋",
		"de_signpost": "小路牌",
		"de_fishing_boat": "小渔船",
		"de_snowman": "雪人",
		"de_maple_pile": "枫叶堆",
		"de_wind_bell": "风铃",
		"de_kite_reel": "风筝架",
		"de_cloud_rose": "云玫瑰",
		"de_sakura_bush": "樱花丛",
		"de_party_cake": "大蛋糕",
		"de_fish_basket": "鱼篓",
		"de_lamp": "路灯",
		"de_scarecrow": "稻草人",
		"de_flower_box": "花箱",
		"de_sunflowers": "向日葵",
		"de_lily": "星铃兰",
		"de_flag": "彩旗",
		"de_gift_box": "礼盒",
		"de_chest": "宝箱",
		"dh_fruit": "蔬果",
		"dh_sweets": "点心",
		"dh_potion": "甘露",
		"dh_tea": "茶",
		"dh_dairy": "乳品",
		"dh_bread": "面包",
		"dh_feast": "名菜",
		"dh_seafood": "海鲜",
		"sec_guests": "访客",
		"sec_deco": "装饰",
		"nm_featured": "今日主推",
		"vb_feature": "主推",
		"st_featured": "主推中",
		"vb_place": "摆放",
		"vb_store": "收起",
		"gu_take": "收下",
		"gu_unknown": "？？？",
		"hb_loves": "爱吃%s",
		"hb_decor": "在岛上拖动换位置",
		"hb_featured": "爱吃它的客人更常来",
		"bn_guest": "%s来做客了",
		"hb_price": "全部售价 +%s%%",
		"hb_medal": "%d 级得下一枚勋章",
		"ds_greenhouse": "种奇花，全岛加成",
		"ds_hotspring": "浴汤让伙伴更快",
		"ds_windmill": "烤面包，全员提速",
		"ds_tea_pavilion": "沏茶，小费更多",
		"ds_chef_pavilion": "做名菜，卖高价",
		"ds_lighthouse_harbor": "渔船出海，带回鲜货",
		"ds_dairy_workshop": "鲜草换奶酪和布丁",
		"ds_pottery_kiln": "陶土烧成茶碗花瓶",
		"ds_bunny": "种田收获",
		"ds_otter": "搬运上架",
		"ds_fox": "磨制美食",
		"ds_shiba": "收银加价",
		"ds_penguin": "炼制甘露",
		"ds_toucan": "跨岛运货",
		"ds_food_week": "交菜给评委打分",
		"ds_friendship": "羁绊越深，卖得越贵",
		"ds_bridge": "修桥，开新岛",
		"ds_airship": "装满货，换琥珀",
		"ds_souvenir": "奇花加美食，卖给收藏家",
		"ds_spa": "招待贵宾汤客",
		"ds_parade": "面包卖高价",
		"ds_moontea": "茶和菜更值钱",
		"ds_lantern": "点水灯领奖",
		"ds_cinema": "入夜放电影",
		"ds_kite": "点风筝，顺风加成",
		"ds_wish": "帮岛民圆心愿",
		"ds_birthday": "生日当天送礼",
		"bp_today": "生日",
		"bp_gift": "礼物",
		"bp_none": "今天没有",
		"fw_entry": "参赛菜",
		"fw_score": "最佳",
		"st_lang": "语言",
		"st_text": "菜单大小",
		"st_text_1": "标准",
		"st_text_2": "大",
		"st_text_3": "特大",
		"st_pin": "置顶",
		"st_on": "开",
		"st_off": "关",
		"st_opacity": "不透明度",
		"st_strip": "岛屿大小",
		"st_dock": "停靠",
		"st_dock_b": "底部",
		"st_dock_t": "顶部",
		"st_fps": "帧率",
		"st_quit": "退出游戏",
		"vb_quit": "保存并退出",
		"st_sound": "音效",
		"st_noise": "白噪音",
		"bn_start": "%s开始了",
		"bn_built": "%s建好了",
		"bn_recipe": "新配方 %s",
		"bn_medal": "获得一枚勋章",
		"bn_airship": "商队订单完成 +%d 琥珀",
		"bn_tasting": "品鉴 %d 分",
		"bn_kites": "收下 %d 只风筝",
		"bn_bday": "今天是%s的生日",
		"bn_gift": "%s很喜欢礼物",
		"bn_judged": "%s打了 %d 分",
		"bn_bond": "%s羁绊 %d 级",
		"bn_wish": "%s的心愿达成",
		"bn_no_gold": "金币不够",
		"bn_no_amber": "琥珀不够",
		"bn_no_items": "材料还不够",
		"bn_night": "入夜才放映",
		"bn_no_dish": "货架上还没有菜"
	},
	"en_US": {
		"bn_seg_voucher": " +%d voucher",
		"bn_pomodoro": "Focus done +%dG",
		"ui_dur_hm": "%dh %dm",
		"ui_dur_ms": "%dm %ds",
		"ui_dur_s": "%ds",
		"bn_offline": "Away %s, earned %s gold",
		"ui_focus25": "25:00",
		"ui_noise_off": "Off",
		"ui_noise_on": "%s",
		"ui_cap_stealth": "F9 to restore",
		"ui_trait_locked": "%s",
		"cd_gh_new": "Greenhouse",
		"cd_hs_new": "Spa Inn",
		"cd_wm_new": "Bakery",
		"cd_tp_new": "Tea House",
		"cd_cp_new": "Chef Hall",
		"cd_lh_new": "Harbor",
		"cd_dw_new": "Dairy",
		"cd_pk_new": "Kiln",
		"ui_lb_crop": "Crops",
		"ui_lb_workshop": "Workshops",
		"ui_lb_tip": "Tips",
		"ui_lb_buff": "Buff",
		"cd_bd_days": "In %dd",
		"cx_tier1": "Garden",
		"cx_tier2": "Fruit Bake",
		"cx_tier3": "Grove Dew",
		"cx_tier4": "Sky Feast",
		"bp_gift_done": "Given",
		"fw_entry_none": "No dish on the shelf",
		"fr_isl_max": "Max",
		"ft_food_week": "{1}",
		"ft_gift_bag": "+{0}G +{1} amber",
		"ft_w_packed": "{0}",
		"ft_w_gh_cycle": "{0}",
		"ft_w_parade": "",
		"ft_w_baked": "{0} +{1}",
		"ft_w_milled": "+{0}",
		"ft_w_wm_cycle": "{0}",
		"ft_w_brewed_tea": "{0} +{1}",
		"ft_w_roasted": "+{0}",
		"ft_w_tp_cycle": "{0}",
		"ft_w_cooked": "{0}",
		"ft_w_cp_cycle": "{0}",
		"ft_w_bath": "{0}",
		"ft_w_hs_cycle": "{0}",
		"ft_w_fish_shipped": "+{0}",
		"ft_w_dairy_made": "{0}",
		"ft_w_milked": "+{0}",
		"ft_w_snack": "+{0}G",
		"ft_w_fired": "{0}",
		"ft_w_air_load": "+{0}",
		"ft_contract_done": "+{0}G +{1} amber",
		"ft_voucher_recipe": "{0}",
		"ft_four_seasons_perk": "+{1}G +{0} amber",
		"ft_airship_done": "+{0}G +{1} amber",
		"ft_landscape": "{0}",
		"ft_gh_open": "",
		"ft_flora_bred": "{0}",
		"ft_hs_open": "",
		"ft_bath_recipe": "{0}",
		"ft_wm_open": "",
		"ft_bake_recipe": "{0}",
		"ft_tp_open": "",
		"ft_tea_recipe": "{0}",
		"ft_moontea_open": "",
		"ft_moontea_need": "",
		"ft_moontea_reward": "+{0} amber",
		"ft_lantern_open": "",
		"ft_wish_granted": "",
		"ft_lantern_wish": "",
		"ft_lantern_reward": "+{0}G +{1} amber",
		"ft_cp_open": "",
		"ft_tasting_pass": "{1}",
		"ft_tasting_fail": "{1}",
		"ft_lh_open": "",
		"ft_boat_back": "+{0}",
		"ft_dw_open": "",
		"ft_cin_open": "",
		"ft_film_start": "",
		"ft_cin_medal": "",
		"ft_cin_end": "",
		"ft_cin_audience": "+{1}G",
		"ft_cin_snack": " +{0}G",
		"ft_pk_open": "",
		"ft_kite_open": "",
		"ft_wish_done": "{0}",
		"ft_wish_medal": "",
		"ft_bday": "{0}",
		"ft_bday_medal": "",
		"ft_achievement": "{0}",
		"gm_career": "★%d · Harvests %d · Crafts %d · Customers %d · Orders %d",
		"gm_wish_reward": "Rep+%d V+%d",
		"gm_wish_left": " %s left",
		"gm_wish_done_title": "★%s's wish came true!",
		"gm_wish_claimed": " claimed",
		"gm_wish_expired_title": "★%s's note expired",
		"gm_wish_new_in": "New note in %ds",
		"gm_wish_void": " expired",
		"ft_pet_boost": "Boost",
		"ft_tag_fresh": "+",
		"ft_tag_divert": "+",
		"ft_tag_mortar": "+",
		"ft_tag_cross": "+",
		"ft_tag_feast": "+",
		"ft_tag_nectar": "+",
		"ft_tea_guest": "+{0}G +{1} amber",
		"ft_wait_tea": "…",
		"ft_parade_guest": "+{0}G +{1} amber",
		"ft_wait_bread": "…",
		"ft_spa_guest": "+{0}G +{1} amber",
		"ft_wait_bath": "…",
		"ft_collector": "+{0}G +{1} amber",
		"ft_wait_box": "…",
		"ft_trader": "+{2}G +{1} amber",
		"ft_no_surplus": "…",
		"ft_critic": "Great",
		"ft_wait_dish": "…",
		"ft_vip_tip": "Tip×2",
		"ft_sold_out_leave": "…",
		"ft_milestone": "Lv.{0}",
		"nav_build": "Build",
		"nav_animal": "Crew",
		"nav_expand": "Isles",
		"nav_codex": "Codex",
		"nav_settings": "Setup",
		"ui_back": "Back",
		"ui_close": "Close",
		"sec_isle1": "Cloudbrook",
		"sec_isle2": "Glowwood",
		"sec_isle3": "Coral Coast",
		"sec_expand": "Isles",
		"sec_orders": "Trade",
		"sec_fest": "Festivals",
		"sec_food": "Food",
		"sec_theme": "Collection",
		"sec_honor": "Medals",
		"nm_soil_1": "Farm",
		"nm_mortar": "Mortar",
		"nm_stall": "Market",
		"nm_cauldron": "Cauldron",
		"nm_soil_2": "Grove Farm",
		"nm_soil_3": "Coast Shop",
		"nm_air": "Airship",
		"nm_box": "Gift Box",
		"nm_spa": "Bath",
		"nm_parade": "Parade",
		"nm_moontea": "Moon Tea",
		"nm_lantern": "Lanterns",
		"nm_cinema": "Cinema",
		"nm_kite": "Kites",
		"nm_wish": "Wishes",
		"nm_birthday": "Birthday",
		"nm_food": "Food Week",
		"nm_friend": "Bonds",
		"nm_season": "%s Look",
		"nm_solar": "%s",
		"nm_ach": "Awards",
		"nm_cx_flora": "Flora",
		"nm_cx_spa": "Baths",
		"nm_cx_bak": "Bakery",
		"nm_cx_tea": "Teas",
		"nm_cx_chef": "Dishes",
		"nm_cx_cin": "Films",
		"nm_cx_pk": "Pottery",
		"nm_cx_kt": "Kites",
		"nm_cx_sw": "Weather",
		"nm_cx_fw": "Judging",
		"vb_start": "Start",
		"vb_load": "Load",
		"vb_pack": "Pack",
		"vb_brew": "Mix",
		"vb_snack": "Snacks",
		"vb_gift": "Gift",
		"vb_submit": "Serve",
		"hb_stock": "%s · %d in stock",
		"hb_shelf": "Shelf %d/%d",
		"hb_next": "Evolves and doubles at Lv.%d",
		"hb_crew": "%s · %d/%d",
		"bk_1": "×1",
		"bk_10": "×10",
		"bk_max": "Max",
		"gu_hedgehog": "Hedgehog",
		"gu_raccoon": "Raccoon",
		"gu_black_bunny": "Jet Bunny",
		"gu_capybara": "Capybara",
		"gu_grey_cat": "Gray Cat",
		"gu_brown_bunny": "Brown Bunny",
		"gu_critic": "Gourmet Cat",
		"gu_cat": "Ginger Cat",
		"gu_snow_hedgehog": "Snow Hedgehog",
		"gu_red_raccoon": "Red Raccoon",
		"gu_silver_fox": "Silver Fox",
		"gu_husky": "Husky",
		"gu_rose_toucan": "Jade Toucan",
		"gu_sakura_capybara": "Sakura Capy",
		"gu_gold_penguin": "Rose Penguin",
		"gu_snow_otter": "Snow Otter",
		"de_apple_tree": "Apple Tree",
		"de_clay_vase": "Clay Vase",
		"de_star_lantern": "Star Lantern",
		"de_wash_tub": "Wash Tub",
		"de_milk_bottle": "Milk Bottle",
		"de_toy_house": "Toy House",
		"de_signpost": "Signpost",
		"de_fishing_boat": "Fishing Boat",
		"de_snowman": "Snowman",
		"de_maple_pile": "Maple Pile",
		"de_wind_bell": "Wind Bell",
		"de_kite_reel": "Kite Reel",
		"de_cloud_rose": "Cloud Rose",
		"de_sakura_bush": "Sakura Bush",
		"de_party_cake": "Party Cake",
		"de_fish_basket": "Fish Basket",
		"de_lamp": "Lamp",
		"de_scarecrow": "Scarecrow",
		"de_flower_box": "Flower Box",
		"de_sunflowers": "Sunflowers",
		"de_lily": "Star Lily",
		"de_flag": "Flag",
		"de_gift_box": "Gift Box",
		"de_chest": "Chest",
		"dh_fruit": "Crops",
		"dh_sweets": "Sweets",
		"dh_potion": "Nectar",
		"dh_tea": "Tea",
		"dh_dairy": "Dairy",
		"dh_bread": "Bread",
		"dh_feast": "Mains",
		"dh_seafood": "Seafood",
		"sec_guests": "Guests",
		"sec_deco": "Decorations",
		"nm_featured": "Featured",
		"vb_feature": "Feature",
		"st_featured": "Featured",
		"vb_place": "Place",
		"vb_store": "Store",
		"gu_take": "Take",
		"gu_unknown": "???",
		"hb_loves": "Loves %s",
		"hb_decor": "Drag to move it",
		"hb_featured": "Its fans visit more often",
		"bn_guest": "%s dropped by",
		"hb_price": "All prices +%s%%",
		"hb_medal": "Next medal at Lv.%d",
		"ds_greenhouse": "Flora boosts all isles",
		"ds_hotspring": "Baths speed up the crew",
		"ds_windmill": "Bread speeds up everyone",
		"ds_tea_pavilion": "Tea boosts tips",
		"ds_chef_pavilion": "Signature dishes sell high",
		"ds_lighthouse_harbor": "Boats bring fresh fish",
		"ds_dairy_workshop": "Greens become cheese and pudding",
		"ds_pottery_kiln": "Clay becomes bowls and vases",
		"ds_bunny": "Farms",
		"ds_otter": "Hauls goods",
		"ds_fox": "Cooks",
		"ds_shiba": "Sells for more",
		"ds_penguin": "Brews nectar",
		"ds_toucan": "Flies goods over",
		"ds_food_week": "Let the judge score a dish",
		"ds_friendship": "Closer bonds, higher prices",
		"ds_bridge": "Mend the bridge, open the isle",
		"ds_airship": "Fill it for amber",
		"ds_souvenir": "Flora and food for collectors",
		"ds_spa": "For VIP guests",
		"ds_parade": "Bread sells high",
		"ds_moontea": "Tea and dishes sell high",
		"ds_lantern": "Click lanterns for rewards",
		"ds_cinema": "Films at night",
		"ds_kite": "Click kites, ride the wind",
		"ds_wish": "Grant islander wishes",
		"ds_birthday": "A gift on the day",
		"bp_today": "Birthday",
		"bp_gift": "Gift",
		"bp_none": "None today",
		"fw_entry": "Entry",
		"fw_score": "Best",
		"st_lang": "Language",
		"st_text": "Menu size",
		"st_text_1": "Normal",
		"st_text_2": "Large",
		"st_text_3": "Huge",
		"st_pin": "Pin",
		"st_on": "On",
		"st_off": "Off",
		"st_opacity": "Opacity",
		"st_strip": "Isle size",
		"st_dock": "Dock",
		"st_dock_b": "Bottom",
		"st_dock_t": "Top",
		"st_fps": "FPS",
		"st_quit": "Quit",
		"vb_quit": "Save and quit",
		"st_sound": "Sound",
		"st_noise": "Ambience",
		"bn_start": "%s on now",
		"bn_built": "%s is ready",
		"bn_recipe": "New recipe: %s",
		"bn_medal": "A new medal",
		"bn_airship": "Order done +%d amber",
		"bn_tasting": "Tasting: %d",
		"bn_kites": "Kites %d",
		"bn_bday": "It's %s's birthday",
		"bn_gift": "%s loves the gift",
		"bn_judged": "%s: %d points",
		"bn_bond": "%s: bond Lv.%d",
		"bn_wish": "%s's wish came true",
		"bn_no_gold": "Not enough gold",
		"bn_no_amber": "Not enough amber",
		"bn_no_items": "Not enough goods",
		"bn_night": "Films play at night",
		"bn_no_dish": "No dish on the shelf"
	},
	"ja_JP": {
		"bn_seg_voucher": " +%d図鑑券",
		"bn_pomodoro": "集中完了 +%dG",
		"ui_dur_hm": "%d時間%d分",
		"ui_dur_ms": "%d分%d秒",
		"ui_dur_s": "%d秒",
		"bn_offline": "留守 %s、%sの金貨",
		"ui_focus25": "25:00",
		"ui_noise_off": "オフ",
		"ui_noise_on": "%s",
		"ui_cap_stealth": "F9で復帰",
		"ui_trait_locked": "%s",
		"cd_gh_new": "温室",
		"cd_hs_new": "湯屋",
		"cd_wm_new": "パン工房",
		"cd_tp_new": "茶房",
		"cd_cp_new": "食神席",
		"cd_lh_new": "灯台漁港",
		"cd_dw_new": "乳工房",
		"cd_pk_new": "陶芸窯",
		"ui_lb_crop": "畑の成長",
		"ui_lb_workshop": "工房速度",
		"ui_lb_tip": "全島チップ",
		"ui_lb_buff": "効果",
		"cd_bd_days": "あと%d日",
		"cx_tier1": "朝露の菜園",
		"cx_tier2": "果実の菓子",
		"cx_tier3": "森の星露",
		"cx_tier4": "雲海の宴",
		"bp_gift_done": "渡し済み",
		"fw_entry_none": "棚に料理がない",
		"fr_isl_max": "最大",
		"ft_food_week": "{1}",
		"ft_gift_bag": "+{0}G +{1}琥珀",
		"ft_w_packed": "{0}",
		"ft_w_gh_cycle": "{0}",
		"ft_w_parade": "",
		"ft_w_baked": "{0} +{1}",
		"ft_w_milled": "+{0}",
		"ft_w_wm_cycle": "{0}",
		"ft_w_brewed_tea": "{0} +{1}",
		"ft_w_roasted": "+{0}",
		"ft_w_tp_cycle": "{0}",
		"ft_w_cooked": "{0}",
		"ft_w_cp_cycle": "{0}",
		"ft_w_bath": "{0}",
		"ft_w_hs_cycle": "{0}",
		"ft_w_fish_shipped": "+{0}",
		"ft_w_dairy_made": "{0}",
		"ft_w_milked": "+{0}",
		"ft_w_snack": "+{0}G",
		"ft_w_fired": "{0}",
		"ft_w_air_load": "+{0}",
		"ft_contract_done": "+{0}G +{1}琥珀",
		"ft_voucher_recipe": "{0}",
		"ft_four_seasons_perk": "+{1}G +{0}琥珀",
		"ft_airship_done": "+{0}G +{1}琥珀",
		"ft_landscape": "{0}",
		"ft_gh_open": "",
		"ft_flora_bred": "{0}",
		"ft_hs_open": "",
		"ft_bath_recipe": "{0}",
		"ft_wm_open": "",
		"ft_bake_recipe": "{0}",
		"ft_tp_open": "",
		"ft_tea_recipe": "{0}",
		"ft_moontea_open": "",
		"ft_moontea_need": "",
		"ft_moontea_reward": "+{0}琥珀",
		"ft_lantern_open": "",
		"ft_wish_granted": "",
		"ft_lantern_wish": "",
		"ft_lantern_reward": "+{0}G +{1}琥珀",
		"ft_cp_open": "",
		"ft_tasting_pass": "{1}",
		"ft_tasting_fail": "{1}",
		"ft_lh_open": "",
		"ft_boat_back": "+{0}",
		"ft_dw_open": "",
		"ft_cin_open": "",
		"ft_film_start": "",
		"ft_cin_medal": "",
		"ft_cin_end": "",
		"ft_cin_audience": "+{1}G",
		"ft_cin_snack": " +{0}G",
		"ft_pk_open": "",
		"ft_kite_open": "",
		"ft_wish_done": "{0}",
		"ft_wish_medal": "",
		"ft_bday": "{0}",
		"ft_bday_medal": "",
		"ft_achievement": "{0}",
		"gm_career": "★%d星・収%d・製%d・客%d・契%d",
		"gm_wish_reward": "評判+%d 券+%d",
		"gm_wish_left": " 残%s",
		"gm_wish_done_title": "★%sの願いが叶った",
		"gm_wish_claimed": " 受取済",
		"gm_wish_expired_title": "★%sのメモが期限切れ",
		"gm_wish_new_in": "新メモは%d秒後",
		"gm_wish_void": " 失効",
		"ft_pet_boost": "加速",
		"ft_tag_fresh": "+",
		"ft_tag_divert": "+",
		"ft_tag_mortar": "+",
		"ft_tag_cross": "+",
		"ft_tag_feast": "+",
		"ft_tag_nectar": "+",
		"ft_tea_guest": "+{0}G +{1}琥珀",
		"ft_wait_tea": "…",
		"ft_parade_guest": "+{0}G +{1}琥珀",
		"ft_wait_bread": "…",
		"ft_spa_guest": "+{0}G +{1}琥珀",
		"ft_wait_bath": "…",
		"ft_collector": "+{0}G +{1}琥珀",
		"ft_wait_box": "…",
		"ft_trader": "+{2}G +{1}琥珀",
		"ft_no_surplus": "…",
		"ft_critic": "好評",
		"ft_wait_dish": "…",
		"ft_vip_tip": "チップ×2",
		"ft_sold_out_leave": "…",
		"ft_milestone": "Lv.{0}",
		"nav_build": "施設",
		"nav_animal": "仲間",
		"nav_expand": "開拓",
		"nav_codex": "図鑑",
		"nav_settings": "設定",
		"ui_back": "戻る",
		"ui_close": "閉じる",
		"sec_isle1": "朝風の島",
		"sec_isle2": "蛍光の森",
		"sec_isle3": "珊瑚の浜",
		"sec_expand": "島",
		"sec_orders": "商い",
		"sec_fest": "祭り",
		"sec_food": "料理",
		"sec_theme": "収集",
		"sec_honor": "勲章",
		"nm_soil_1": "朝風の畑",
		"nm_mortar": "すり鉢工房",
		"nm_stall": "市の露店",
		"nm_cauldron": "錬金釜",
		"nm_soil_2": "森の畑",
		"nm_soil_3": "海岸工房",
		"nm_air": "遠洋商隊",
		"nm_box": "名物箱",
		"nm_spa": "温泉",
		"nm_parade": "山車巡行",
		"nm_moontea": "月見茶会",
		"nm_lantern": "星灯祭",
		"nm_cinema": "野外映画",
		"nm_kite": "凧祭り",
		"nm_wish": "願い板",
		"nm_birthday": "誕生会",
		"nm_food": "美食週",
		"nm_friend": "絆",
		"nm_season": "%sの装い",
		"nm_solar": "節気 %s",
		"nm_ach": "実績",
		"nm_cx_flora": "珍花と箱",
		"nm_cx_spa": "湯",
		"nm_cx_bak": "パン",
		"nm_cx_tea": "茶",
		"nm_cx_chef": "食神",
		"nm_cx_cin": "映画",
		"nm_cx_pk": "陶芸",
		"nm_cx_kt": "凧",
		"nm_cx_sw": "天気",
		"nm_cx_fw": "品評",
		"vb_start": "開始",
		"vb_load": "積む",
		"vb_pack": "箱詰め",
		"vb_brew": "調合",
		"vb_snack": "軽食",
		"vb_gift": "贈る",
		"vb_submit": "出品",
		"hb_stock": "%s・在庫%d",
		"hb_shelf": "棚 %d/%d",
		"hb_next": "Lv.%dで進化、生産2倍",
		"hb_crew": "%s・%d/%d匹",
		"bk_1": "×1",
		"bk_10": "×10",
		"bk_max": "最大",
		"gu_hedgehog": "ハリネズミ",
		"gu_raccoon": "アライグマ",
		"gu_black_bunny": "黒ウサギ",
		"gu_capybara": "カピバラ",
		"gu_grey_cat": "灰色ネコ",
		"gu_brown_bunny": "茶ウサギ",
		"gu_critic": "グルメネコ",
		"gu_cat": "茶トラ",
		"gu_snow_hedgehog": "雪ハリネズミ",
		"gu_red_raccoon": "赤アライグマ",
		"gu_silver_fox": "銀ギツネ",
		"gu_husky": "ハスキー",
		"gu_rose_toucan": "翠オオハシ",
		"gu_sakura_capybara": "桜カピバラ",
		"gu_gold_penguin": "紅ペンギン",
		"gu_snow_otter": "雪カワウソ",
		"de_apple_tree": "りんごの木",
		"de_clay_vase": "陶の花瓶",
		"de_star_lantern": "星灯",
		"de_wash_tub": "木のたらい",
		"de_milk_bottle": "牛乳瓶",
		"de_toy_house": "おもちゃの家",
		"de_signpost": "道しるべ",
		"de_fishing_boat": "漁船",
		"de_snowman": "雪だるま",
		"de_maple_pile": "もみじの山",
		"de_wind_bell": "風鈴",
		"de_kite_reel": "凧の糸巻き",
		"de_cloud_rose": "雲バラ",
		"de_sakura_bush": "桜の茂み",
		"de_party_cake": "大ケーキ",
		"de_fish_basket": "魚かご",
		"de_lamp": "街灯",
		"de_scarecrow": "かかし",
		"de_flower_box": "花箱",
		"de_sunflowers": "ひまわり",
		"de_lily": "星露鈴蘭",
		"de_flag": "旗",
		"de_gift_box": "ギフト箱",
		"de_chest": "宝箱",
		"dh_fruit": "青果",
		"dh_sweets": "おやつ",
		"dh_potion": "甘露",
		"dh_tea": "お茶",
		"dh_dairy": "乳製品",
		"dh_bread": "パン",
		"dh_feast": "名物料理",
		"dh_seafood": "海の幸",
		"sec_guests": "お客さん",
		"sec_deco": "飾り",
		"nm_featured": "本日の一品",
		"vb_feature": "選ぶ",
		"st_featured": "選択中",
		"vb_place": "置く",
		"vb_store": "しまう",
		"gu_take": "受け取る",
		"gu_unknown": "？？？",
		"hb_loves": "%sが好き",
		"hb_decor": "島でドラッグして移動",
		"hb_featured": "好きなお客さんがよく来る",
		"bn_guest": "%sがご来店",
		"hb_price": "全売値 +%s%%",
		"hb_medal": "Lv.%dで次の勲章",
		"ds_greenhouse": "珍花で全島に効果",
		"ds_hotspring": "湯で仲間が速くなる",
		"ds_windmill": "パンで全員が速くなる",
		"ds_tea_pavilion": "茶でチップが増える",
		"ds_chef_pavilion": "名物料理を高く売る",
		"ds_lighthouse_harbor": "漁船が鮮魚を運ぶ",
		"ds_dairy_workshop": "草がチーズとプリンに",
		"ds_pottery_kiln": "陶土が茶碗と花瓶に",
		"ds_bunny": "畑仕事",
		"ds_otter": "運搬",
		"ds_fox": "料理",
		"ds_shiba": "会計",
		"ds_penguin": "錬成",
		"ds_toucan": "島間輸送",
		"ds_food_week": "審査員に料理を出す",
		"ds_friendship": "絆が深いほど高く売れる",
		"ds_bridge": "橋を直して島を開く",
		"ds_airship": "荷を積んで琥珀に",
		"ds_souvenir": "珍花と美食を収集家へ",
		"ds_spa": "VIPをもてなす",
		"ds_parade": "パンが高く売れる",
		"ds_moontea": "茶と料理が高く売れる",
		"ds_lantern": "灯をクリック",
		"ds_cinema": "夜に映画を上映",
		"ds_kite": "凧をクリック",
		"ds_wish": "島民の願いを叶える",
		"ds_birthday": "誕生日に贈り物",
		"bp_today": "誕生日",
		"bp_gift": "贈り物",
		"bp_none": "今日はなし",
		"fw_entry": "出品",
		"fw_score": "最高",
		"st_lang": "言語",
		"st_text": "メニュー",
		"st_text_1": "標準",
		"st_text_2": "大",
		"st_text_3": "特大",
		"st_pin": "最前面",
		"st_on": "オン",
		"st_off": "オフ",
		"st_opacity": "不透明度",
		"st_strip": "島の大きさ",
		"st_dock": "位置",
		"st_dock_b": "下",
		"st_dock_t": "上",
		"st_fps": "FPS",
		"st_quit": "終了",
		"vb_quit": "保存して終了",
		"st_sound": "効果音",
		"st_noise": "環境音",
		"bn_start": "%s開幕",
		"bn_built": "%sが完成",
		"bn_recipe": "新レシピ %s",
		"bn_medal": "勲章を獲得",
		"bn_airship": "注文完了 +%d琥珀",
		"bn_tasting": "品評 %d点",
		"bn_kites": "凧 %d枚",
		"bn_bday": "今日は%sの誕生日",
		"bn_gift": "%sが大喜び",
		"bn_judged": "%s %d点",
		"bn_bond": "%s 絆Lv.%d",
		"bn_wish": "%sの願いが叶った",
		"bn_no_gold": "金貨が足りない",
		"bn_no_amber": "琥珀が足りない",
		"bn_no_items": "材料が足りない",
		"bn_night": "夜に上映",
		"bn_no_dish": "棚に料理がない"
	}
}

## i18n: data names / tags keyed by their zh source text (item, building, islander, weather, trait, achievement ...);
## `tr_name(zh)` returns the zh text itself in zh_CN and for any text not listed here.
const NAME_I18N: Dictionary = {
	"en_US": {
		"晨露胡萝卜": "Carrot",
		"晨风红草莓": "Berry",
		"幽谷荧光菇": "Glowcap",
		"晴滩黄金凤梨": "Pineapple",
		"桂花糯米糕": "Rice Cake",
		"焦糖苹果草莓派": "Berry Pie",
		"星露荧光甘露饮": "Glow Nectar",
		"皇家凤梨星露宴": "Royal Feast",
		"春分青团": "Qingtuan",
		"夏至杨梅饮": "Bayberry",
		"秋分蟹粉酥": "Crab Puff",
		"冬至暖汤圆": "Tangyuan",
		"立春": "Spr.Start",
		"雨水": "Rain Water",
		"惊蛰": "Waking",
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
		"云霓琉璃玫瑰": "Cloud Glass Rose",
		"铃兰": "Lily",
		"玫瑰": "Rose",
		"铃兰光环·农田+18%": "Lily aura·Crops+18%",
		"玫瑰光环·工坊+20%&小费+15%": "Rose aura·Shops+20%&Tips+15%",
		"星露花语礼盒": "Floral Gift Box",
		"皇家名物礼盒": "Royal Gift Box",
		"艾草暖身汤": "Mugwort Bath",
		"樱瓣云雾汤": "Sakura Mist Bath",
		"星珀灵泉汤": "Star Amber Bath",
		"艾草汤": "Herb",
		"樱瓣汤": "Sakura",
		"星珀汤": "Star",
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
		"云朵鲜奶": "Cloud Milk",
		"云顶熟成奶酪": "Aged Cheese",
		"云朵焦糖布丁": "Caramel Pudding",
		"鲜奶": "Milk",
		"奶酪": "Cheese",
		"云朵布丁": "Pudding",
		"《月兔的星空邮差》": "Starry Postbunny",
		"《云鲸归航》": "Whale Homecoming",
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
		"风筝满天": "Kite-Filled Sky",
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
		"丰收心愿": "Harvest Wish",
		"上架心愿": "Stock Wish",
		"工坊心愿": "Craft Wish",
		"迎客心愿": "Guest Wish",
		"营收心愿": "Sales Wish",
		"交付": "deliver",
		"经营": "business",
		"收获作物": "Harvest",
		"集市上架": "Stock",
		"工坊出品": "Craft",
		"接待顾客": "Serve",
		"集市营收": "Earn",
		"份": "",
		"件": "",
		"位": "",
		"晴": "Sunny",
		"细雨": "Rain",
		"彩虹": "Rainbow",
		"薄雾": "Mist",
		"晴空万里": "Clear Skies",
		"云海细雨": "Drizzle",
		"雨后彩虹": "Rainbow",
		"云海薄雾": "Low Mist",
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
		"晨风农田": "Breeze Farm",
		"桂花研钵工坊": "Mortar Shop",
		"云岛集市主摊位": "Market Stall",
		"森谷农田": "Grove Farm",
		"星露炼金坩埚": "Dew Cauldron",
		"珊瑚滩双工坊": "Coast Shop",
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
		"蜜蜂花箱": "Beehive",
		"荧光风铃": "Glow Chime",
		"招财提基灯": "Lucky Tiki",
		"晚风": "Dusk Wind",
		"虫鸣": "Crickets",
		"雨声": "Rain",
		"初入云岛": "Welcome Aboard",
		"第一桶金": "First Fortune",
		"研钵飘香": "Sweet Aroma",
		"森谷开拓者": "Grove Pioneer",
		"珊瑚晴滩": "Coral Coast",
		"山海全席": "Grand Feast",
		"专注达人": "Focus Master",
		"皇家供货商": "Royal Supplier",
		"琥珀收藏家": "Amber Collector",
		"微缩造景师": "Diorama Artist",
		"王牌进修生": "Ace Trainee",
		"金牌匠师团": "Gold Artisans",
		"产业蜕变": "Growth Spurt",
		"晨露丰收季": "Dewy Harvest",
		"宾至如归": "Warm Welcome",
		"五星云岛名宿": "Five-Star Isle",
		"远洋大掌柜": "Ocean Merchant",
		"四时节气宴": "Seasonal Feast",
		"奇花园艺师": "Flora Gardener",
		"云岛伴手礼名家": "Gift Box Master",
		"云海汤屋掌柜": "Spa Keeper",
		"灵泉贵宾礼遇": "VIP Spa Guest",
		"云端烘焙大师": "Master Baker",
		"花车巡游盛典": "Grand Parade",
		"云端茗香茶圣": "Tea Sage",
		"月色画舫雅集": "Moonlit Tea",
		"星灯祈愿者": "Lantern Wisher",
		"山海特级食神": "Master Chef",
		"灯塔渔港满载": "Full Harbor",
		"云端牧场主": "Ranch Owner",
		"星空影迷": "Cinephile",
		"云端窑主": "Kiln Master",
		"四季岛主": "Four Seasons",
		"心愿守护者": "Wish Keeper",
		"云海观天师": "Sky Watcher",
		"生日全家福": "Family Photo"
	},
	"ja_JP": {
		"晨露胡萝卜": "朝露ニンジン",
		"晨风红草莓": "朝風苺",
		"幽谷荧光菇": "光るキノコ",
		"晴滩黄金凤梨": "黄金パイン",
		"桂花糯米糕": "金木犀もち",
		"焦糖苹果草莓派": "苺パイ",
		"星露荧光甘露饮": "星露の光る甘露",
		"皇家凤梨星露宴": "王室の宴",
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
		"春生·农田+15%": "春生・畑+15%",
		"夏长·工坊+15%": "夏長・工房+15%",
		"秋收·售价+15%": "秋収・売値+15%",
		"冬藏·小费+15%": "冬蔵・チップ+15%",
		"星露铃兰": "星露鈴蘭",
		"云霓琉璃玫瑰": "雲ガラスのバラ",
		"铃兰": "鈴蘭",
		"玫瑰": "バラ",
		"铃兰光环·农田+18%": "鈴蘭・畑+18%",
		"玫瑰光环·工坊+20%&小费+15%": "バラ・工房+20%&チップ+15%",
		"星露花语礼盒": "花の名物箱",
		"皇家名物礼盒": "王室の名物箱",
		"艾草暖身汤": "よもぎ湯",
		"樱瓣云雾汤": "桜霧の湯",
		"星珀灵泉汤": "星珀の霊泉",
		"艾草汤": "よもぎ",
		"樱瓣汤": "桜湯",
		"星珀汤": "星珀湯",
		"艾草蒸汽·全员精力+16%&小费+8%": "よもぎ・気力+16%&チップ+8%",
		"樱雾花汤·全员精力+22%&小费+12%": "桜霧・気力+22%&チップ+12%",
		"星珀灵泉·全员精力+28%&小费+18%": "星珀・気力+28%&チップ+18%",
		"金麦云朵面粉": "金麦の雲粉",
		"云朵舒芙蕾欧包": "雲のスフレパン",
		"琥珀蜜糖可颂": "琥珀クロワッサン",
		"云朵面粉": "雲粉",
		"舒芙蕾包": "スフレ",
		"蜜糖可颂": "蜜パン",
		"麦香烘焙光环·摊位&工坊提速1.20x+": "パンのオーラ・1.20x+",
		"麦香舒芙蕾·摊位&工坊提速1.22x+": "スフレのオーラ・1.22x+",
		"琥珀麦香光环·摊位&工坊提速1.26x+": "琥珀のオーラ・1.26x+",
		"云雾春芽": "雲霧新芽",
		"云雾龙井茗茶": "雲霧の龍井茶",
		"桂花乌龙香茗": "金木犀烏龍茶",
		"龙井茗茶": "龍井茶",
		"桂花乌龙": "烏龍茶",
		"茗香清心·员工效率+16%&小费+12%": "清心・効率+16%&チップ+12%",
		"龙井清心·员工效率+18%&小费+15%": "龍井・効率+18%&チップ+15%",
		"桂乌清心·员工效率+22%&小费+20%": "烏龍・効率+22%&チップ+20%",
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
		"云朵鲜奶": "雲の牛乳",
		"云顶熟成奶酪": "熟成チーズ",
		"云朵焦糖布丁": "雲のプリン",
		"鲜奶": "牛乳",
		"奶酪": "チーズ",
		"云朵布丁": "プリン",
		"《月兔的星空邮差》": "『月ウサギの星空郵便』",
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
		"微风": "そよ風",
		"和风": "軟風",
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
		"风筝满天": "凧で満天",
		"月兔": "ウサギ",
		"水獭": "カワウソ",
		"小狐狸": "キツネ",
		"柴犬": "柴犬",
		"企鹅": "ペンギン",
		"巨嘴鸟": "オオハシ",
		"甜香": "甘み",
		"鲜香": "旨み",
		"清香": "爽やか",
		"铜奖": "銅賞",
		"银奖": "銀賞",
		"金奖": "金賞",
		"岛民": "島民",
		"丰收心愿": "豊作の願い",
		"上架心愿": "陳列の願い",
		"工坊心愿": "工房の願い",
		"迎客心愿": "歓迎の願い",
		"营收心愿": "売上の願い",
		"交付": "納品",
		"经营": "経営",
		"收获作物": "収穫",
		"集市上架": "陳列",
		"工坊出品": "工房生産",
		"接待顾客": "接客",
		"集市营收": "売上",
		"份": "個",
		"件": "個",
		"位": "人",
		"晴": "晴れ",
		"细雨": "小雨",
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
		"研钵美食": "すり鉢料理",
		"烘焙面包": "焼きたてパン",
		"云岛茶饮": "島のお茶",
		"陶艺花卉": "陶芸と花",
		"晨风农田": "朝風畑",
		"桂花研钵工坊": "すり鉢工房",
		"云岛集市主摊位": "市の露店",
		"森谷农田": "森の畑",
		"星露炼金坩埚": "星露錬金釜",
		"珊瑚滩双工坊": "海岸工房",
		"月兔 · 专职农夫": "ウサギ · 農夫",
		"水獭 · 岛内物流员": "カワウソ · 運び屋",
		"小狐狸 · 研钵主厨": "キツネ · 料理番",
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
		"研钵飘香": "すり鉢の香",
		"森谷开拓者": "森の開拓者",
		"珊瑚晴滩": "珊瑚の浜",
		"山海全席": "山海の饗宴",
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
		"云岛伴手礼名家": "名物箱の名人",
		"云海汤屋掌柜": "湯屋の主人",
		"灵泉贵宾礼遇": "霊泉のVIP",
		"云端烘焙大师": "雲上のパン職人",
		"花车巡游盛典": "山車大巡行",
		"云端茗香茶圣": "雲上の茶聖",
		"月色画舫雅集": "月夜の茶会",
		"星灯祈愿者": "星灯の祈り手",
		"山海特级食神": "山海の食神",
		"灯塔渔港满载": "大漁の灯台港",
		"云端牧场主": "雲上の牧場主",
		"星空影迷": "星空の映画通",
		"云端窑主": "雲上の窯元",
		"四季岛主": "四季の島主",
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

func is_zh() -> bool:
	return current_lang == "zh_CN"

func tr_key(key: String) -> String:
	var table: Dictionary = I18N_DICT.get(current_lang, I18N_DICT["zh_CN"])
	return String(table.get(key, I18N_DICT["zh_CN"].get(key, key)))

## `tr_key(key)` with its arguments filled in (args may be empty for a plain text)
func tr_fmt(key: String, args: Array) -> String:
	var t := tr_key(key)
	if args.is_empty():
		return t
	# `{0}` templates pick the arguments they need; plain templates use every `%` argument
	if t.contains("{"):
		return t.format(args)
	return t % args if t.contains("%") else t

## Data name / tag in the current language, looked up by its zh source text (`NAME_I18N`); unknown texts pass through
func tr_name(zh_text: String) -> String:
	if current_lang == "zh_CN" or zh_text == "":
		return zh_text
	var table: Dictionary = NAME_I18N.get(current_lang, {})
	return String(table.get(zh_text, zh_text))

## First day [month, day] of every solar term, in the order of SOLAR_TERMS (a day early or late in some years)
const SOLAR_TERM_STARTS: Array = [[2, 4], [2, 19], [3, 5], [3, 20], [4, 4], [4, 20], [5, 5], [5, 21], [6, 5], [6, 21], [7, 7], [7, 22],
	[8, 7], [8, 23], [9, 7], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 21], [1, 5], [1, 20]]

func calc_solar_term(month: int, day: int) -> int:
	var now := month * 100 + day
	var best := 21
	var best_start := -1
	for i in range(SOLAR_TERM_STARTS.size()):
		var start := int(SOLAR_TERM_STARTS[i][0]) * 100 + int(SOLAR_TERM_STARTS[i][1])
		if start <= now and start > best_start:
			best = i
			best_start = start
	return best

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

func is_dairy_item(item_id: String) -> bool:
	return DAIRY_ITEMS.has(item_id)

func is_pottery_item(item_id: String) -> bool:
	return POTTERY_ITEMS.has(item_id)

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
					for k in range(6):
						var gx := z.position.x + 24.0 + float(k) * (z.size.x - 48.0) / 5.0
						var gy := z.position.y + 8.0 + fmod(float(k) * 11.3, z.size.y - 18.0)
						_fx_twinkle(out, zi, z, Vector2(gx, gy), Color(1.0, 1.0, 1.0, (0.20 + 0.70 * maxf(0.0, sin(t * 2.4 + float(k) * 1.7))) * a))
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

## One night of the open-air cinema (`3` screenings of `12s` + `2s` intermission).
func get_cinema_night_programme_sec() -> float:
	return CINEMA_SLOT_SEC * float(CINEMA_FILM_ORDER.size())

## Period of one boat round trip on the harbor clock (`dock + sail out + at sea + sail back`).
func get_harbor_boat_period() -> float:
	return HARBOR_BOAT_DOCK_SEC + HARBOR_BOAT_SAIL_SEC + HARBOR_BOAT_SEA_SEC + HARBOR_BOAT_SAIL_SEC

## Item name in the current language (zh source text from the data tables -> `tr_name`)
func get_item_display_name(item_id: String) -> String:
	return tr_name(get_item_raw_name(item_id))

## Short item label for compact lists (airship order brief): zh keeps its own rule in the caller, en the first word, ja 3 glyphs
func get_item_short_label(item_id: String) -> String:
	var nm := get_item_display_name(item_id)
	if current_lang == "en_US":
		return nm.split(" ")[0]
	return nm.substr(0, 7 if current_lang == "ja_JP" else 3)

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
	if DAIRY_ITEMS.has(item_id):
		return String(DAIRY_ITEMS[item_id].get("name", item_id))
	if CINEMA_FILMS.has(item_id):
		return String(CINEMA_FILMS[item_id].get("name", item_id))
	if POTTERY_ITEMS.has(item_id):
		return String(POTTERY_ITEMS[item_id].get("name", item_id))
	if KITE_TYPES.has(item_id):
		return String(KITE_TYPES[item_id].get("name", item_id))
	if SEASONS.has(item_id):
		return String(SEASONS[item_id].get("deco_name", item_id))
	return item_id
