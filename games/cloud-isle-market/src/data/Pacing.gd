extends RefCounted
class_name Pacing
## The one place that decides how fast the game goes (`src/data/Pacing.gd`), slowed down by the user on 2026-11-25:
## Island 2 after about an hour and a half, Island 3 on day 5, every building in about 25 days, Lv.50 around week 9; offline
## time pays half of online time. Every payout in the game is expressed in seconds of income, so new content cannot outrun it.
## `simulate()` fast-forwards weeks of play; SelfTestRunner fails when the milestones drift.

## Gold per second of each line at Lv.1; a line doubles every 25 levels
const RATE: Dictionary = {
	"soil_1": 0.6, "mortar": 0.9, "stall": 0.4,
	"soil_2": 2.5, "cauldron": 3.5, "tea_pavilion": 7.0, "greenhouse": 18.0, "dairy_workshop": 45.0, "windmill": 110.0,
	"soil_3": 260.0, "hotspring": 600.0, "chef_pavilion": 1400.0, "lighthouse_harbor": 3200.0, "pottery_kiln": 7500.0
}
const ISLE: Dictionary = {
	"soil_1": 1, "mortar": 1, "stall": 1, "tea_pavilion": 1, "dairy_workshop": 1,
	"soil_2": 2, "cauldron": 2, "greenhouse": 2, "windmill": 2, "chef_pavilion": 2,
	"soil_3": 3, "hotspring": 3, "lighthouse_harbor": 3, "pottery_kiln": 3
}
const UNLOCK: Dictionary = {
	"isle2": 120000, "tea_pavilion": 1800000, "greenhouse": 6000000, "dairy_workshop": 40000000, "windmill": 220000000,
	"isle3": 2200000000, "hotspring": 8600000000, "chef_pavilion": 31000000000, "open_air_cinema": 90000000000,
	"lighthouse_harbor": 140000000000, "pottery_kiln": 540000000000
}
## The order the unlocks are meant to fall in
const UNLOCK_ORDER: Array[String] = ["isle2", "tea_pavilion", "greenhouse", "dairy_workshop", "windmill", "isle3", "hotspring", "chef_pavilion", "open_air_cinema", "lighthouse_harbor", "pottery_kiln"]
const ANIMAL_BASE: Dictionary = {"bunny": 40.0, "otter": 75.0, "fox": 120.0, "shiba": 200.0, "penguin": 1500.0, "toucan": 1200.0}

const START_GOLD := 120
const PAYBACK_SEC := 480.0
const LINE_GROWTH := 1.21
const ANIMAL_GROWTH := 1.43
const CREW_PER_LEVEL := 0.006
const CREW_PER_HEAD := 0.03
## Every codex entry adds 1% to all income
const CODEX_PER_ENTRY := 0.01

## Tips, festivals and small rewards bring this much on top while the game is open (measured with the playtest bot)
const ONLINE_BONUS := 1.15

## Offline pays half of what the isle earns online, for at most 12 hours
const OFFLINE_RATE := 0.5
const OFFLINE_CAP_SEC := 43200
## Income waits in the till until a customer pays; a full till holds 3 minutes
const TILL_CAP_SEC := 180.0
## All live bonuses (festival, weather, tips) together
const LIVE_BONUS_CAP := 1.6
## Tips are this part of what a customer pays
const TIP_SHARE := 0.1

## Festivals: one at a time, hours apart; when one is due it opens by itself after a while
const FESTIVAL_ORDER: Array[String] = ["kite", "moon_tea", "parade", "lantern"]
const FESTIVAL_FIRST_SEC := 10800.0
const FESTIVAL_GAP_SEC := 28800.0
const FESTIVAL_AUTO_SEC := 1800.0
const FESTIVAL_SEC := 300.0
## One part of the day (day, dusk, night, drizzle) lasts two hours; the solar term follows the real calendar
const DAY_PHASE_SEC := 7200.0
## Seconds between arrivals [from, to]: the first isle alone, the open market, and every kind of special visitor
const CUSTOMER_GAP_START: Array[float] = [25.0, 40.0]
const CUSTOMER_GAP: Array[float] = [45.0, 75.0]
const SPECIAL_GAP: Array[float] = [150.0, 260.0]
const FESTIVAL_VISITOR_GAP: Array[float] = [15.0, 25.0]
const BALLOON_GAP: Array[float] = [900.0, 1500.0]
const BALLOON_SEC := 60.0
## The kite festival and the night films are written as short programmes and played back this slowly
const KITE_PACE := 0.3
const CINEMA_PACE := 0.025
## What one lantern festival / one cinema night gives away at most
const LANTERNS_PER_FESTIVAL := 12
const LANTERN_ENCORES := 3
const SNACKS_PER_NIGHT := 12
## A clock that jumps ahead this far while the game runs was a sleeping computer: it pays like time away
const SLEEP_GAP_SEC := 90.0
const AIRSHIP_DOCK_SEC := 600.0
const AIRSHIP_AWAY_SEC := 2700.0
## Reputation needed for 2 / 3 / 4 / 5 stars: an hour or two, a few days, two weeks, about six weeks
const STAR_SCORE: Array[int] = [10000, 100000, 500000, 2000000]

static func line_rate(key: String, level: int) -> float:
	var lv := maxi(1, level)
	return float(RATE.get(key, 0.0)) * float(lv) * pow(2.0, float(lv / 25))

## Price of the step from `level` to `level + 1` (the first dozen levels are cheap, so the first hour moves)
static func line_cost(key: String, level: int) -> int:
	var lv := maxi(1, level)
	var early := minf(1.0, 0.40 + 0.05 * float(lv - 1))
	return maxi(5, int(round(float(RATE.get(key, 0.5)) * PAYBACK_SEC * pow(LINE_GROWTH, float(lv - 1)) * early)))

static func line_cost_n(key: String, level: int, n: int) -> int:
	var sum := 0
	for i in range(maxi(1, n)):
		sum += line_cost(key, level + i)
	return sum

## `step` = heads already recruited + team level
static func animal_cost(key: String, step: int) -> int:
	return maxi(5, int(round(float(ANIMAL_BASE.get(key, 50.0)) * pow(ANIMAL_GROWTH, float(maxi(1, step) - 1)))))

static func animal_cost_n(key: String, step: int, n: int) -> int:
	var sum := 0
	for i in range(maxi(1, n)):
		sum += animal_cost(key, step + i)
	return sum

## `lines`: {key: level} of every built line; `crew_levels` / `heads`: sums over all animals; `mult`: codex, friendship...
static func gold_per_sec(lines: Dictionary, crew_levels: int, heads: int, mult: float = 1.0) -> float:
	var base := 0.0
	for k in lines.keys():
		base += line_rate(String(k), int(lines[k]))
	return base * (1.0 + CREW_PER_LEVEL * float(crew_levels) + CREW_PER_HEAD * float(heads)) * mult

## ------------------------------------------------------------------------------------------------------------------
## Fast-forward: a player who watches the first hour, then looks in every 10 minutes for 6 hours a day and is away 18 hours.
## Returns {unlock key: equivalent online hours} plus `days` snapshots.
## ------------------------------------------------------------------------------------------------------------------
static func simulate(days: int, caps: Dictionary) -> Dictionary:
	var st := {"gold": float(START_GOLD), "t": 0.0, "lv": {"soil_1": 1, "mortar": 1, "stall": 1}, "an": {}, "rec": {}, "isles": [1], "done": {}, "codex": 0, "buys": 0, "caps": caps}
	for a in ANIMAL_BASE.keys():
		st["an"][a] = 0
		st["rec"][a] = 0
	st["an"]["bunny"] = 1
	st["rec"]["bunny"] = 1
	var out := {"day": []}
	for _i in range(180):
		_sim_tick(st, 20.0, ONLINE_BONUS)
	out["buys_first_hour"] = int(st["buys"])
	for d in range(days):
		for _h in range(30 if d == 0 else 36):
			_sim_tick(st, 600.0, ONLINE_BONUS)
		_sim_tick(st, float(OFFLINE_CAP_SEC), OFFLINE_RATE)
		out["day"].append({"gps": _sim_gps(st), "buys": int(st["buys"]), "lv": (st["lv"] as Dictionary).duplicate(), "an": (st["an"] as Dictionary).duplicate()})
	for k in (st["done"] as Dictionary).keys():
		out[k] = float(st["done"][k]) / 3600.0
	return out

static func _sim_gps(st: Dictionary) -> float:
	var lv_sum := 0
	var heads := 0
	for a in ANIMAL_BASE.keys():
		lv_sum += int(st["an"][a])
		heads += int(st["rec"][a])
	return gold_per_sec(st["lv"], lv_sum, heads, 1.0 + CODEX_PER_ENTRY * float(st["codex"]))

static func _sim_cap(st: Dictionary, a: String) -> int:
	var n := 0
	for isl in st["isles"]:
		n += int((st["caps"][isl] as Dictionary).get(a, 0))
	return n

static func _sim_tick(st: Dictionary, sec: float, rate: float) -> void:
	st["gold"] = float(st["gold"]) + _sim_gps(st) * sec * rate
	st["t"] = float(st["t"]) + sec * minf(1.0, rate)
	while true:
		var nxt := ""
		for u in UNLOCK_ORDER:
			if not (st["done"] as Dictionary).has(u):
				nxt = u
				break
		if nxt != "" and float(st["gold"]) >= float(UNLOCK[nxt]):
			st["gold"] = float(st["gold"]) - float(UNLOCK[nxt])
			st["done"][nxt] = st["t"]
			st["codex"] = int(st["codex"]) + 2
			if nxt == "isle2":
				st["isles"].append(2)
				st["lv"]["soil_2"] = 1
				st["lv"]["cauldron"] = 1
			elif nxt == "isle3":
				st["isles"].append(3)
				st["lv"]["soil_3"] = 1
			elif nxt != "open_air_cinema":
				st["lv"][nxt] = 1
			continue
		var g0 := _sim_gps(st)
		# how long this player is willing to wait for an upgrade to pay back: a while, or a good part of the way to the next unlock
		var horizon := maxf(240.0, float(st["t"]) * 0.18)
		if nxt != "":
			horizon = maxf(horizon, 0.4 * maxf(0.0, float(UNLOCK[nxt]) - float(st["gold"])) / maxf(0.01, g0))
		var best := [INF, 0.0, "", ""]
		for k in (st["lv"] as Dictionary).keys():
			var lv := int(st["lv"][k])
			var c := float(line_cost(String(k), lv))
			if c > float(st["gold"]):
				continue
			st["lv"][k] = lv + 1
			var gain := _sim_gps(st) - g0
			st["lv"][k] = lv
			if gain > 0.0 and c / gain <= horizon and c / gain < float(best[0]):
				best = [c / gain, c, "line", k]
		for a in ANIMAL_BASE.keys():
			var cap := _sim_cap(st, String(a))
			if cap <= 0:
				continue
			var ca := float(animal_cost(String(a), int(st["rec"][a]) + maxi(1, int(st["an"][a]))))
			if ca > float(st["gold"]):
				continue
			var ga := g0 * (CREW_PER_HEAD if int(st["rec"][a]) < cap else CREW_PER_LEVEL)
			if ca / ga <= horizon and ca / ga < float(best[0]):
				best = [ca / ga, ca, "animal", a]
		if String(best[2]) == "":
			return
		st["gold"] = float(st["gold"]) - float(best[1])
		st["buys"] = int(st["buys"]) + 1
		if String(best[2]) == "line":
			st["lv"][best[3]] = int(st["lv"][best[3]]) + 1
		elif int(st["rec"][best[3]]) < _sim_cap(st, String(best[3])):
			st["rec"][best[3]] = int(st["rec"][best[3]]) + 1
			st["an"][best[3]] = maxi(1, int(st["an"][best[3]]))
		else:
			st["an"][best[3]] = int(st["an"][best[3]]) + 1
