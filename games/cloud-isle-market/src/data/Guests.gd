extends RefCounted
class_name Guests
## Guests, their keepsakes and the small decorations (`src/data/Guests.gd`), approved by the user on 2026-11-25.
## A guest drops by about every two hours, also while the player is away. Each one has a favourite dish: the featured dish of the day
## decides who comes more often. A guest who has come often enough leaves a keepsake, which can be put on the grass.
## Complete collection: about ten weeks (`simulate`, checked by SelfTestRunner).

const VISIT_SEC := 7200.0
## Visits kept for a player who is away (about half a day)
const AWAY_VISITS_MAX := 8
const ART := "res://assets/pixel_art/"

## Dish on the board -> the building that cooks it ("" = from the start)
const DISH_ORDER: Array[String] = ["fruit", "sweets", "potion", "tea", "dairy", "bread", "feast", "seafood"]
const DISH_LINE: Dictionary = {"fruit": "soil_1", "sweets": "mortar", "potion": "cauldron", "tea": "tea_pavilion", "dairy": "dairy_workshop", "bread": "windmill", "feast": "chef_pavilion", "seafood": "lighthouse_harbor"}

## rarity 0 = often, 1 = sometimes, 2 = almost only when the favourite is featured
const ORDER: Array[String] = ["hedgehog", "raccoon", "black_bunny", "capybara", "grey_cat", "brown_bunny", "critic", "cat",
	"snow_hedgehog", "red_raccoon", "silver_fox", "husky", "rose_toucan", "sakura_capybara", "gold_penguin", "snow_otter"]
const LIST: Dictionary = {
	"hedgehog": {"dish": "fruit", "rarity": 0, "keep": "apple_tree"},
	"raccoon": {"dish": "sweets", "rarity": 0, "keep": "clay_vase"},
	"black_bunny": {"dish": "potion", "rarity": 0, "keep": "star_lantern"},
	"capybara": {"dish": "tea", "rarity": 0, "keep": "wash_tub"},
	"grey_cat": {"dish": "dairy", "rarity": 0, "keep": "milk_bottle"},
	"brown_bunny": {"dish": "bread", "rarity": 0, "keep": "toy_house"},
	"critic": {"dish": "feast", "rarity": 0, "keep": "signpost"},
	"cat": {"dish": "seafood", "rarity": 0, "keep": "fishing_boat"},
	"snow_hedgehog": {"dish": "fruit", "rarity": 1, "keep": "snowman"},
	"red_raccoon": {"dish": "sweets", "rarity": 1, "keep": "maple_pile"},
	"silver_fox": {"dish": "potion", "rarity": 1, "keep": "wind_bell"},
	"husky": {"dish": "bread", "rarity": 1, "keep": "kite_reel"},
	"rose_toucan": {"dish": "tea", "rarity": 2, "keep": "cloud_rose"},
	"sakura_capybara": {"dish": "dairy", "rarity": 2, "keep": "sakura_bush"},
	"gold_penguin": {"dish": "feast", "rarity": 2, "keep": "party_cake"},
	"snow_otter": {"dish": "seafood", "rarity": 2, "keep": "fish_basket"}
}
const WEIGHT: Array[float] = [10.0, 2.0, 0.1]
const WEIGHT_RARE_FEATURED := 0.5
const FEATURED_MULT := 4.0
const KEEPSAKE_PLACED_MULT := 1.2
## Visits until the keepsake, and the gift of every visit in seconds of income / amber
const KEEP_AT: Array[int] = [5, 4, 3]
const GIFT_SEC: Array[float] = [60.0, 120.0, 240.0]
const GIFT_AMBER: Array[int] = [0, 2, 5]

## Decorations: 16 keepsakes (amber 0) and 8 for sale; `h` = height on the grass, logical px
const DECOR_ORDER: Array[String] = ["apple_tree", "clay_vase", "star_lantern", "wash_tub", "milk_bottle", "toy_house", "signpost", "fishing_boat",
	"snowman", "maple_pile", "wind_bell", "kite_reel", "cloud_rose", "sakura_bush", "party_cake", "fish_basket",
	"lamp", "scarecrow", "flower_box", "sunflowers", "lily", "flag", "gift_box", "chest"]
const DECOR: Dictionary = {
	"apple_tree": {"tex": "buildings/apple_tree.png", "h": 40.0, "amber": 0},
	"clay_vase": {"tex": "ui/clay_vase.png", "h": 24.0, "amber": 0},
	"star_lantern": {"tex": "ui/star_lantern.png", "h": 22.0, "amber": 0},
	"wash_tub": {"tex": "ui/bath_mugwort_warm.png", "h": 24.0, "amber": 0},
	"milk_bottle": {"tex": "ui/milk_bottle.png", "h": 26.0, "amber": 0},
	"toy_house": {"tex": "buildings/cottage_mushroom.png", "h": 38.0, "amber": 0},
	"signpost": {"tex": "buildings/decor_signpost.png", "h": 30.0, "amber": 0},
	"fishing_boat": {"tex": "ui/fishing_boat.png", "h": 26.0, "amber": 0},
	"snowman": {"tex": "ui/deco_winter.png", "h": 32.0, "amber": 0},
	"maple_pile": {"tex": "ui/deco_autumn.png", "h": 26.0, "amber": 0},
	"wind_bell": {"tex": "buildings/decor_windchime.png", "h": 34.0, "amber": 0},
	"kite_reel": {"tex": "ui/icon_kite_festival.png", "h": 28.0, "amber": 0},
	"cloud_rose": {"tex": "ui/flora_cloud_rose.png", "h": 26.0, "amber": 0},
	"sakura_bush": {"tex": "ui/deco_spring.png", "h": 32.0, "amber": 0},
	"party_cake": {"tex": "ui/birthday_cake.png", "h": 26.0, "amber": 0},
	"fish_basket": {"tex": "ui/seafood_catch.png", "h": 24.0, "amber": 0},
	"lamp": {"tex": "buildings/decor_lamp.png", "h": 36.0, "amber": 100},
	"scarecrow": {"tex": "buildings/decor_scarecrow.png", "h": 32.0, "amber": 100},
	"flower_box": {"tex": "buildings/decor_beehive.png", "h": 28.0, "amber": 200},
	"sunflowers": {"tex": "ui/deco_summer.png", "h": 32.0, "amber": 300},
	"lily": {"tex": "ui/flora_stardew_lily.png", "h": 26.0, "amber": 300},
	"flag": {"tex": "ui/sports_flag.png", "h": 30.0, "amber": 500},
	"gift_box": {"tex": "ui/souvenir_box_floral.png", "h": 24.0, "amber": 800},
	"chest": {"tex": "ui/rare_specialty_box.png", "h": 24.0, "amber": 1200}
}

## The open ground in front of the buildings: [isle, x from, x to, how far in front of the ground line]
const LAWNS: Array = [[1, 590.0, 1060.0, 18.0], [2, 110.0, 500.0, 18.0], [3, 1440.0, 1810.0, 5.0]]
const LAWN_STEP := 34.0

## The lawn at `x` (its row of LAWNS), or [] off the grass
static func lawn_at(x: float) -> Array:
	for lawn in LAWNS:
		if x >= float(lawn[1]) - 0.5 and x <= float(lawn[2]) + 0.5:
			return lawn
	return []

static func lawn_dy(x: float) -> float:
	var lawn := lawn_at(x)
	return float(lawn[3]) if not lawn.is_empty() else 18.0

static func sheet(guest: String) -> Texture2D:
	return load(ART + "guests/guest_%s.png" % guest)

## First frame of a guest, for tiles and gift cards
static func portrait(guest: String) -> Texture2D:
	var sz := sheet(guest).get_size()
	return UiKit.atlas("guests/guest_%s.png" % guest, Rect2(0.0, 0.0, sz.x * 0.5, sz.y))

static func decor_tex(id: String) -> Texture2D:
	return load(ART + String(DECOR[id]["tex"]))

static func keeper_of(decor: String) -> String:
	for g in ORDER:
		if String(LIST[g]["keep"]) == decor:
			return g
	return ""

static func keep_at(guest: String) -> int:
	return KEEP_AT[int(LIST[guest]["rarity"])]

## `dishes` = what the isle can cook, `featured` = the dish on the board, `placed` = decorations on the grass
static func pick(dishes: Array, featured: String, placed: Array, roll: float) -> String:
	var ids: Array[String] = []
	var ws: Array[float] = []
	var total := 0.0
	for g in ORDER:
		var cfg: Dictionary = LIST[g]
		if not dishes.has(String(cfg["dish"])):
			continue
		var loved := String(cfg["dish"]) == featured
		var w := WEIGHT[int(cfg["rarity"])]
		if loved:
			w = (WEIGHT_RARE_FEATURED if int(cfg["rarity"]) == 2 else w) * FEATURED_MULT
		if placed.has(String(cfg["keep"])):
			w *= KEEPSAKE_PLACED_MULT
		ids.append(g)
		ws.append(w)
		total += w
	var r := clampf(roll, 0.0, 0.999999) * total
	for i in range(ids.size()):
		r -= ws[i]
		if r < 0.0:
			return ids[i]
	return ids[ids.size() - 1] if not ids.is_empty() else ""

## Days until the last keepsake for a player who features what they still miss (`open_day`: dish -> day it becomes available)
static func simulate(seed_val: int, visits_per_day: float, open_day: Dictionary) -> float:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	var v := {}
	var left := ORDER.size()
	var day := 0.0
	while left > 0 and day < 400.0:
		day += 1.0 / visits_per_day
		var dishes: Array = []
		for d in DISH_ORDER:
			if float(open_day.get(d, 0.0)) <= day:
				dishes.append(d)
		var feat := String(dishes[0])
		var best := -1
		for g in ORDER:
			if dishes.has(String(LIST[g]["dish"])) and int(v.get(g, 0)) < keep_at(g) and int(LIST[g]["rarity"]) > best:
				best = int(LIST[g]["rarity"])
				feat = String(LIST[g]["dish"])
		var who := pick(dishes, feat, [], rng.randf())
		v[who] = int(v.get(who, 0)) + 1
		if int(v[who]) == keep_at(who):
			left -= 1
	return day
