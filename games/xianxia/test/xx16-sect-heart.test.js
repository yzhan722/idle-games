/* global test, expect, game, describe, beforeEach, afterEach, jest, classes, com */

var fs = require("fs");
var path = require("path");
var acorn = require("acorn");

function grantImmortalResources(amount){
	var names = ["xianyuan", "relic", "starchart", "timeCrystal", "unobtainium"];
	for (var i = 0; i < names.length; i++){
		var r = game.resPool.get(names[i]);
		r.unlocked = true;
		r.value = amount;
		if (r.maxValue && r.maxValue < amount){ r.maxValue = amount; }
	}
}

function resVal(name){
	return game.resPool.get(name).value;
}

//XX-14 经典五位剑阵(皆得位)与满剑意
var CLASSIC = ["xuanyuan", "qingping", "chixiao", "taie", "zhanlu"];
var EMPTY5 = ["", "", "", "", ""];
var FULL_INTENTS = {qingping: 3, chixiao: 3, zidian: 3, taie: 3, zhanlu: 3, xuanyuan: 3};

function setIntents(cult, intents){
	for (var k in cult.swordTomb.intents){
		if (cult.swordTomb.intents.hasOwnProperty(k)){
			cult.swordTomb.intents[k] = intents[k] || 0;
		}
	}
}

function setSlots(cult, slots){
	cult.swordTomb.slots = EMPTY5.slice(0);
	for (var i = 0; i < 5; i++){
		if (slots[i]){ expect(cult.setSwordSlot(i, slots[i])).toBe(true); }
	}
}

//东八区 2026-11-16(周一)0 点 = UTC 2026-11-15 16:00
var MON = Date.UTC(2026, 10, 15, 16, 0, 0);
var DAY = 24 * 3600 * 1000;
var WEEK = 7 * DAY;

//挑战到指定席位:roll 0 恒胜(胜率下限 8%)
function climbTo(cult, seat){
	while (cult.sectArena.seat > seat){
		var r = cult.challengeSectArena(0);
		expect(r && r.win).toBe(true);
	}
}

describe("XX-16 Sect Tournament Arena & Heart-Demon Illusion Trials", function(){
	var now;
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		now = MON + 2 * DAY + 5 * 3600 * 1000;	//周三
		game.cultivation.sectClock = function(){ return now; };
	});

	afterEach(function(){
		game.cultivation.sectRandom = null;
		game.cultivation.sectClock = null;
		game.cultivation.starRandom = null;
		game.cultivation.starClock = null;
		jest.restoreAllMocks();
	});

	test("Arena: locked before ascension; weeks turn at Monday 00:00 UTC+8 on the injectable clock; deterministic weekly ladder and rotating themes", function(){
		var cult = game.cultivation;
		cult.setIdentity("岳不群", "m", "scholar");

		expect(cult.challengeSectArena(0)).toBe(false);
		expect(cult.attemptHeartTrib(0)).toBe(false);
		expect(cult.syncSectWeek()).toBe(null);
		expect(function(){ cult.tickSectTrib(5000); }).not.toThrow();
		expect(cult.sectArena.week).toBe(null);
		expect(cult.getSectTribCombatBonus(30).riftDmg).toBe(0);
		expect(cult.getSwordCrownBonus().xianyuanRatio).toBe(0);
		expect(cult.onSectRiftVictory(30)).toEqual({cooldown: 0});
		expect(cult.sectArena).toEqual(cult.makeDefaultSectArena());
		expect(cult.heartTrib).toEqual(cult.makeDefaultHeartTrib());
		expect(cult.sectTier).toBe(0);

		// Week boundary: Monday 00:00 in UTC+8 (1970-01-05 is week 0), the same boundary as the repo's other weekly systems
		var w = cult.getSectWeekIndex(MON);
		expect(cult.getSectWeekIndex(MON - 1)).toBe(w - 1);
		expect(cult.getSectWeekIndex(MON + WEEK - 1)).toBe(w);
		expect(cult.getSectWeekIndex(MON + WEEK)).toBe(w + 1);
		expect(cult.getSectWeekKey(w)).toBe("2026-11-16");
		expect(cult.getSectWeekEndsAt(w)).toBe(MON + WEEK);
		expect(cult.getSectWeekIndex(Date.UTC(1970, 0, 4, 16, 0, 0))).toBe(0);
		expect(cult.getSectWeekIndex(Date.UTC(1970, 0, 4, 15, 59, 59))).toBe(-1);
		expect(w).toBe(Math.floor((MON + 8 * 3600 * 1000 - Date.UTC(1970, 0, 5)) / WEEK));
		// The injected clock drives the current week
		expect(cult.getSectWeekIndex()).toBe(w);
		now = MON - 1000;
		expect(cult.getSectWeekIndex()).toBe(w - 1);
		now = MON + 2 * DAY;

		// Ladder: deterministic per week, eight distinct real disciples, strictly descending ratings around the seat base
		var r1 = cult.getSectRoster(w);
		expect(cult.getSectRoster(w)).toEqual(r1);
		expect(r1.length).toBe(8);
		var seen = {};
		for (var i = 0; i < r1.length; i++){
			expect(r1[i].seat).toBe(i + 1);
			expect(cult.getSectRivalDef(r1[i].key)).not.toBe(null);
			expect(seen[r1[i].key]).toBeUndefined();
			seen[r1[i].key] = true;
			expect(Math.abs(r1[i].power - cult.SECT_SEAT_POWER[i])).toBeLessThanOrEqual(cult.SECT_POWER_JITTER);
			if (i > 0){ expect(r1[i].power).toBeLessThan(r1[i - 1].power); }
		}
		var differs = false;
		for (var d = 1; d <= 4; d++){
			if (JSON.stringify(cult.getSectRoster(w + d)) !== JSON.stringify(r1)){ differs = true; }
		}
		expect(differs).toBe(true);
		expect(cult.getSectRoster(-3).length).toBe(8);
		// Themes rotate every week through all five
		var themes = {};
		for (var t = 0; t < 5; t++){ themes[cult.getSectThemeDef(w + t).key] = true; }
		expect(Object.keys(themes).length).toBe(5);
		expect(cult.getSectThemeDef(w + 5)).toBe(cult.getSectThemeDef(w));
		expect(cult.getSectThemeDef(-1).key).toBe(cult.SECT_THEMES[4].key);
		// Rank tiers by seat
		var tiers = [];
		for (var s = 1; s <= 9; s++){ tiers.push(cult.getSectRankTier(s)); }
		expect(tiers).toEqual([5, 4, 3, 2, 2, 1, 1, 1, 0]);
		expect(cult.SECT_RANKS.length).toBe(6);
		expect(cult.getSectRankReward(0)).toBe(null);
		expect(cult.getSectRankReward(5)).toEqual({xianyuan: 900, relic: 30, starchart: 42, orbs: 4});

		// After ascension the first tick opens this week's arena
		cult.prepareImmortalCaveForTest(true);
		expect(cult.sectArena.week).toBe(w);
		expect(cult.sectArena.seat).toBe(9);
		cult.sectArena.week = null;
		cult.tickSectTrib(1);
		expect(cult.sectArena.week).toBe(w);
	});

	test("Bouts: tokens and Essence cost, injectable roll, win odds from a rating that reads real progress (themed part doubled), seat climbing, peak rank and the seal", function(){
		var cult = game.cultivation;
		cult.setIdentity("令狐冲", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.riftFloor = 26;
		var sa = cult.sectArena;
		var w = sa.week;
		var theme = cult.getSectThemeDef(w);

		// Odds clamp
		expect(cult.getSectWinChance(50, 50)).toBe(0.5);
		expect(cult.getSectWinChance(52, 50)).toBe(0.56);
		expect(cult.getSectWinChance(200, 14)).toBe(0.92);
		expect(cult.getSectWinChance(0, 68)).toBe(0.08);

		// Rating reads the real systems: sword formation / thunder tempering / star map / natal spirit / rift / heart trials
		var expectRating = function(lv){
			var total = 10 + cult.getSectSealBonus().rating;
			var steps = {sword: 4, thunder: 2, star: 2, spirit: 3, rift: 1, heart: 1};
			for (var k in steps){
				if (steps.hasOwnProperty(k)){ total += lv[k] * steps[k] * (theme.part === k ? 2 : 1); }
			}
			return total;
		};
		var base = cult.getSectArenaRating();
		expect(base.theme).toBe(theme.key);
		expect(base.total).toBe(expectRating({sword: 0, thunder: 0, star: 0, spirit: 0, rift: 1, heart: 0}));
		cult.thunderPool.tier = 3;
		cult.natalWarming.warmth = 120;	// spirit rank 2
		for (var li = 0; li < 9; li++){ cult.starObservatory.lit[li] = 1; }	// star map grade 2
		setIntents(cult, {qingping: 2, chixiao: 2});
		setSlots(cult, ["chixiao", "qingping", "", "", ""]);
		var swGrade = cult.computeSwordFormation().grade;
		expect(swGrade).toBeGreaterThan(0);
		cult.heartTrib.stage = 2;
		cult.riftFloor = 30;
		var rt = cult.getSectArenaRating();
		expect(rt.total).toBe(expectRating({sword: swGrade, thunder: 3, star: 2, spirit: 2, rift: 5, heart: 2}));
		var themed = rt.parts.filter(function(p){ return p.themed; });
		expect(themed.length).toBe(1);
		expect(themed[0].key).toBe(theme.part);
		// Back to a modest build for the bout checks
		cult.thunderPool.tier = 0;
		cult.natalWarming.warmth = 0;
		for (var lz = 0; lz < 28; lz++){ cult.starObservatory.lit[lz] = 0; }
		cult.swordTomb.slots = EMPTY5.slice(0);
		cult.heartTrib.stage = 0;
		cult.riftFloor = 26;

		var req = cult.getSectBoutReq();
		var roster = cult.getSectRoster(w);
		expect(req.xianyuan).toBe(30);
		expect(req.boutsMax).toBe(10);
		expect(req.boutsLeft).toBe(10);
		expect(req.target).toBe(8);
		expect(req.rival).toEqual(roster[7]);
		expect(req.chance).toBe(cult.getSectWinChance(req.rating, roster[7].power));
		expect(req.affordable).toBe(true);

		// Loss (roll above the odds): seat kept, a token spent
		var xy0 = resVal("xianyuan");
		var lose = cult.challengeSectArena(0.999);
		expect(lose.win).toBe(false);
		expect(lose.target).toBe(8);
		expect(sa.seat).toBe(9);
		expect(sa.bouts).toBe(1);
		expect(sa.losses).toBe(1);
		expect(resVal("xianyuan")).toBe(xy0 - 30);
		expect(sa.log[0]).toEqual({seat: 8, win: 0, rival: roster[7].key});
		expect(sa.lastNote).toContain("sectarena.note.loss");
		// A roll exactly at the odds is a loss; just below is a win
		var at = cult.getSectBoutReq().chance;
		expect(cult.challengeSectArena(at).win).toBe(false);
		var win = cult.challengeSectArena(at - 0.000001);
		expect(win.win).toBe(true);
		expect(win.seat).toBe(8);
		expect(win.tier).toBe(1);
		expect(sa.seat).toBe(8);
		expect(sa.wins).toBe(1);
		expect(sa.peakTier).toBe(1);
		expect(cult.sectTier).toBe(1);
		expect(sa.lastNote).toContain("sectarena.note.win");
		expect(sa.lastNote).toContain("sectarena.note.rank");
		expect(sa.lastNote).toContain("sectarena.note.seal");
		// The injected random source is used when no roll is given
		cult.sectRandom = function(){ return 0; };
		var r2 = cult.challengeSectArena();
		expect(r2.roll).toBe(0);
		expect(r2.win).toBe(true);
		expect(sa.seat).toBe(7);
		cult.sectRandom = null;

		// Climb to the top: each win takes exactly one seat; the Champion cannot challenge further
		climbTo(cult, 1);
		expect(sa.seat).toBe(1);
		expect(sa.wins).toBe(8);
		expect(sa.bouts).toBe(10);
		expect(sa.peakTier).toBe(5);
		expect(cult.sectTier).toBe(5);
		var top = cult.getSectBoutReq();
		expect(top.top).toBe(true);
		expect(top.rival).toBe(null);
		expect(top.affordable).toBe(false);
		expect(cult.challengeSectArena(0)).toBe(false);
		expect(sa.log.length).toBe(cult.SECT_LOG_MAX);

		// Tokens run out
		sa.seat = 5;
		sa.wins = 4;
		sa.losses = 0;
		sa.bouts = 10;
		cult.sectTier = 0;
		expect(cult.getSectBoutReq().boutsLeft).toBe(0);
		expect(cult.challengeSectArena(0)).toBe(false);
		// Not enough Essence
		sa.bouts = 0;
		game.resPool.get("xianyuan").value = 10;
		expect(cult.getSectBoutReq().affordable).toBe(false);
		expect(cult.challengeSectArena(0)).toBe(false);
		grantImmortalResources(50000);

		// Seal: Cultivation, cheaper bouts, rating, resistance, extra tokens
		cult.sectTier = 4;
		var seal = cult.getSectSealBonus();
		expect(seal.tier).toBe(4);
		expect(seal.xiuweiRatio).toBeCloseTo(0.12, 9);
		expect(seal.costCut).toBeCloseTo(0.20, 9);
		expect(seal.rating).toBe(4);
		expect(seal.resist).toBe(4);
		expect(seal.extraBouts).toBe(2);
		expect(cult.getSectBoutReq().xianyuan).toBe(24);
		expect(cult.getSectBoutsMax()).toBe(12);
		cult.sectTier = 0;
		var r0 = cult.getSectArenaRating().total;
		cult.sectTier = 4;
		expect(cult.getSectArenaRating().total).toBe(r0 + 4);
	});

	test("Weekly settlement: the held seat pays existing resources at the UTC+8 Monday boundary, then a fresh ladder opens; never twice, never backwards; offline rollovers settle on the first tick", function(){
		var cult = game.cultivation;
		cult.setIdentity("任盈盈", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var sa = cult.sectArena;
		var w = sa.week;
		expect(w).toBe(cult.getSectWeekIndex(MON));

		climbTo(cult, 3);	// Third place
		expect(cult.getSectRankTier(sa.seat)).toBe(3);
		var before = {xy: resVal("xianyuan"), relic: resVal("relic"), chart: resVal("starchart"), orbs: cult.thunderPool.thunderOrbs};
		// Sunday 23:59:59 (UTC+8): still this week
		now = MON + WEEK - 1000;
		cult.tickSectTrib(1);
		expect(sa.week).toBe(w);
		expect(resVal("xianyuan")).toBe(before.xy);
		// Monday 00:00 (UTC+8): settle Third place
		now = MON + WEEK;
		cult.tickSectTrib(1);
		expect(sa.week).toBe(w + 1);
		expect(resVal("xianyuan")).toBe(before.xy + 400);
		expect(resVal("relic")).toBe(before.relic + 14);
		expect(resVal("starchart")).toBe(before.chart + 20);
		expect(cult.thunderPool.thunderOrbs).toBe(before.orbs + 1);
		expect(cult.thunderOrbs).toBe(cult.thunderPool.thunderOrbs);
		expect(sa.seat).toBe(9);
		expect(sa.bouts).toBe(0);
		expect(sa.wins).toBe(0);
		expect(sa.losses).toBe(0);
		expect(sa.log).toEqual([]);
		expect(sa.lastSettle).toEqual({week: w, seat: 3});
		expect(sa.settles).toBe(1);
		expect(sa.lastNote).toContain("sectarena.note.settle");
		expect(sa.peakTier).toBe(3);
		expect(cult.sectTier).toBe(3);
		// No second settlement; a clock turned back does not reopen an old week
		var afterXy = resVal("xianyuan");
		cult.tickSectTrib(1);
		expect(cult.syncSectWeek()).toBe(null);
		now = MON + 3 * DAY;
		cult.tickSectTrib(1);
		expect(sa.week).toBe(w + 1);
		expect(resVal("xianyuan")).toBe(afterXy);

		// A week of only losses: no reward, recorded as unranked
		now = MON + WEEK + DAY;
		var l = cult.challengeSectArena(0.999);
		expect(l.win).toBe(false);
		now = MON + 2 * WEEK;
		var xyBefore = resVal("xianyuan");
		var res = cult.syncSectWeek();
		expect(res.tier).toBe(0);
		expect(res.reward).toBe(null);
		expect(resVal("xianyuan")).toBe(xyBefore);
		expect(sa.lastSettle).toEqual({week: w + 1, seat: 9});
		expect(sa.lastNote).toContain("sectarena.note.settleNone");
		expect(sa.settles).toBe(1);
		// An idle week leaves the last record untouched; several skipped weeks settle once
		now = MON + 3 * WEEK;
		cult.tickSectTrib(1);
		expect(sa.lastSettle).toEqual({week: w + 1, seat: 9});
		climbTo(cult, 1);
		now = MON + 9 * WEEK + 3 * DAY;
		var xyC = resVal("xianyuan");
		cult.tickSectTrib(1);
		expect(resVal("xianyuan")).toBe(xyC + 900);
		expect(sa.week).toBe(w + 9);
		expect(sa.settles).toBe(2);
		cult.tickSectTrib(1);
		expect(resVal("xianyuan")).toBe(xyC + 900);

		// Offline across the boundary: load keeps the old week (resources are not touched while loading); the first tick settles it
		climbTo(cult, 2);	// Runner-up
		var sv = {};
		cult.save(sv);
		expect(sv.cultivation.sectArena.week).toBe(w + 9);
		expect(sv.cultivation.sectArena.seat).toBe(2);
		var json = JSON.parse(JSON.stringify(sv));
		now = MON + 10 * WEEK + 3 * 3600 * 1000;
		cult.resetState();
		cult.load(json);
		expect(cult.sectArena.week).toBe(w + 9);
		expect(cult.sectArena.seat).toBe(2);
		var xyL = resVal("xianyuan");
		cult.tickSectTrib(1);
		expect(cult.sectArena.week).toBe(w + 10);
		expect(resVal("xianyuan")).toBe(xyL + 600);
		expect(cult.sectArena.lastSettle).toEqual({week: w + 9, seat: 2});
		expect(cult.sectTier).toBe(5);

		// Same-week roundtrip: identical normalized state
		cult.challengeSectArena(0);
		cult.challengeSectArena(0.999);
		var snap = cult.normalizeSectArena(JSON.parse(JSON.stringify(cult.sectArena)));
		var rt = {};
		cult.save(rt);
		cult.resetState();
		cult.load(JSON.parse(JSON.stringify(rt)));
		expect(cult.sectArena).toEqual(snap);
		expect(cult.sectArena.seat).toBe(8);
		expect(cult.sectArena.bouts).toBe(2);
		expect(cult.sectTier).toBe(5);
	});

	test("Heart trials: resistance reads real Thunder Tempering, natal spirit and star blessing; the dreaded part counts x1.5; injectable roll; failure never drops the realm", function(){
		var cult = game.cultivation;
		cult.setIdentity("东方白", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		var ht = cult.heartTrib;

		expect(cult.HEART_TRIB_STAGES.map(function(s){ return s.power; })).toEqual([14, 20, 27, 35, 44, 54]);
		var r0 = cult.getHeartTribResist();
		expect(r0).toEqual(jasmineLike(r0, {stage: 0, key: "greed", power: 14, weak: "spirit", base: 8, thunder: 0, spirit: 0, star: 0, weakBonus: 0, insight: 0, seal: 0, total: 8}));
		var req0 = cult.getHeartTribReq();
		expect(req0.chance).toBe(0.35);
		expect(req0.xianyuan).toBe(50);
		expect(req0.starchart).toBe(6);
		expect(req0.affordable).toBe(true);

		// Thunder Tempering 4 (x3), natal spirit rank 3 (x4, dreaded by Greed: x1.5)
		cult.thunderPool.tier = 4;
		cult.natalWarming.warmth = 260;
		var r1 = cult.getHeartTribResist();
		expect(r1.thunderTier).toBe(4);
		expect(r1.spiritGrade).toBe(3);
		expect(r1.thunder).toBe(12);
		expect(r1.spirit).toBe(12);
		expect(r1.weakBonus).toBe(6);
		expect(r1.total).toBe(8 + 12 + 12 + 6);
		// Resonance adds +4 to the spirit
		cult.natalWarming.resonance = 500;
		expect(cult.isNatalResonating()).toBe(true);
		var r2 = cult.getHeartTribResist();
		expect(r2.spirit).toBe(16);
		expect(r2.weakBonus).toBe(8);
		cult.natalWarming.resonance = 0;
		// A real star blessing from the Observatory: Black Tortoise Lv 3 = 9 + 3 (steadies the heart)
		cult.starObservatory.phase = 7 * cult.STAR_MANSION_TICKS;
		cult.starObservatory.cooldown = 0;
		expect(cult.divineStars(0.01).outcome).toBe(2);
		var bl = cult.getStarBlessingEffect();
		expect(bl.active).toBe(true);
		expect(bl.sym).toBe("tortoise");
		expect(bl.power).toBe(3);
		var r3 = cult.getHeartTribResist();
		expect(r3.star).toBe(12);
		expect(r3.blessSym).toBe("tortoise");
		// Trial 3 (Delusion) dreads the stars; Trial 2 (Wrath) dreads thunder
		expect(cult.getHeartTribResist(2).weakBonus).toBe(6);
		expect(cult.getHeartTribResist(1).weakBonus).toBe(6);
		expect(cult.getHeartTribResist(1).total).toBe(8 + 12 + 12 + 12 + 6);
		// An expired blessing no longer counts
		cult.tickStarObservatory(cult.STAR_BLESS_TICKS);
		expect(cult.getHeartTribResist().star).toBe(0);
		// Odds clamp
		expect(cult.getHeartTribChance(200, 14)).toBe(0.95);
		expect(cult.getHeartTribChance(0, 54)).toBe(0.05);

		// Failure: backlash and insight only; realm, cultivation, stage and ascension untouched
		cult.thunderPool.tier = 0;
		cult.natalWarming.warmth = 0;
		var stagesBefore = cult.stages.map(function(s){ return !!s.researched; });
		var realmBefore = cult.getCurrentRealmIndex();
		var xiuweiBefore = resVal("xiuwei") || 0;
		var xy0 = resVal("xianyuan");
		var sc0 = resVal("starchart");
		var fail = cult.attemptHeartTrib(0.999);
		expect(fail.ok).toBe(false);
		expect(fail.stage).toBe(0);
		expect(fail.reward).toBe(null);
		expect(ht.stage).toBe(0);
		expect(ht.insight).toBe(1);
		expect(ht.cooldown).toBe(cult.HEART_TRIB_BACKLASH);
		expect(ht.fails).toBe(1);
		expect(ht.attempts).toBe(1);
		expect(ht.log[0]).toEqual({s: 0, ok: 0});
		expect(ht.lastNote).toContain("hearttrib.note.fail");
		expect(resVal("xianyuan")).toBe(xy0 - 50);
		expect(resVal("starchart")).toBe(sc0 - 6);
		expect(cult.stages.map(function(s){ return !!s.researched; })).toEqual(stagesBefore);
		expect(cult.getCurrentRealmIndex()).toBe(realmBefore);
		expect(resVal("xiuwei") || 0).toBe(xiuweiBefore);
		expect(cult.immortalAscended).toBe(true);
		expect(cult.getHeartTribResist().insight).toBe(3);
		// Cooldown, shortened by a Rift 26F+ clear only
		expect(cult.attemptHeartTrib(0)).toBe(false);
		expect(cult.onSectRiftVictory(25)).toEqual({cooldown: 0});
		expect(cult.onSectRiftVictory(30)).toEqual({cooldown: 150});
		expect(ht.cooldown).toBe(750);
		cult.tickSectTrib(749);
		expect(cult.attemptHeartTrib(0)).toBe(false);
		cult.tickSectTrib(1);
		expect(cult.getHeartTribReq().ready).toBe(true);
		// Insight caps at five layers
		for (var f = 0; f < 6; f++){
			ht.cooldown = 0;
			cult.attemptHeartTrib(0.999);
		}
		expect(ht.insight).toBe(cult.HEART_INSIGHT_MAX);
		expect(cult.getHeartTribResist().insight).toBe(15);
		expect(ht.stage).toBe(0);

		// Pass: next trial, insight cleared, rewards into existing resources
		ht.cooldown = 0;
		var xy1 = resVal("xianyuan");
		var relic1 = resVal("relic");
		var orbs1 = cult.thunderPool.thunderOrbs;
		var pass = cult.attemptHeartTrib(0);
		expect(pass.ok).toBe(true);
		expect(pass.reward).toEqual({xianyuan: 80, relic: 3, starchart: 0, orbs: 1});
		expect(ht.stage).toBe(1);
		expect(ht.insight).toBe(0);
		expect(ht.cooldown).toBe(cult.HEART_TRIB_COOLDOWN);
		expect(resVal("xianyuan")).toBe(xy1 - 50 + 80);
		expect(resVal("relic")).toBe(relic1 + 3);
		expect(cult.thunderPool.thunderOrbs).toBe(orbs1 + 1);
		expect(ht.lastNote).toContain("hearttrib.note.pass");
		// The injected random source is used when no roll is given
		cult.sectRandom = function(){ return 0; };
		ht.cooldown = 0;
		expect(cult.attemptHeartTrib().ok).toBe(true);
		expect(ht.stage).toBe(2);
		cult.sectRandom = null;
		// All six
		while (ht.stage < 6){
			ht.cooldown = 0;
			expect(cult.attemptHeartTrib(0).ok).toBe(true);
		}
		expect(ht.lastNote).toContain("hearttrib.note.done");
		var done = cult.getHeartTribReq();
		expect(done.done).toBe(true);
		expect(done.affordable).toBe(false);
		ht.cooldown = 0;
		expect(cult.attemptHeartTrib(0)).toBe(false);
		expect(ht.log.length).toBe(cult.HEART_LOG_MAX);
		// The arena rating reads the trials passed
		var heartPart = cult.getSectArenaRating().parts.filter(function(p){ return p.key === "heart"; })[0];
		expect(heartPart.level).toBe(6);

		// Seal: cheaper trials and extra resistance
		cult.sectTier = 5;
		ht.stage = 0;
		var sealed = cult.getHeartTribReq();
		expect(sealed.xianyuan).toBe(38);
		expect(sealed.starchart).toBe(5);
		expect(cult.getHeartTribResist().seal).toBe(5);
	});

	test("Battle bonus: arena honour + heart seals fill what the formation and the stars leave under the XX-14 caps (Rift 26F+ only); thunder pursuit stays 0.795; Sword Crown gives +5% Essence outside the caps", function(){
		var cult = game.cultivation;
		cult.setIdentity("风清扬", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;
		var sa = cult.sectArena;
		var ht = cult.heartTrib;

		var base26 = cult.getImmortalCaveBonuses(26);
		var base25 = cult.getImmortalCaveBonuses(25);
		// Champion this week and all six trials: raw damage 2% + 1.2%, crit 1%, HP 3%, mitigation 0.48%
		climbTo(cult, 1);
		ht.stage = 6;
		var raw = cult.getSectTribRawEffect();
		expect(raw.honorTier).toBe(5);
		expect(raw.stages).toBe(6);
		var p = cult.getSectTribCombatBonus(26);
		expect(p.baseDmg).toBe(0);
		expect(p.rawDmg).toBeCloseTo(0.032, 9);
		expect(p.riftDmg).toBeCloseTo(0.032, 9);
		expect(p.riftCrit).toBeCloseTo(0.01, 9);
		expect(p.riftHp).toBeCloseTo(0.03, 9);
		expect(p.mitigation).toBeCloseTo(0.0048, 9);
		expect(p.capped).toBe(false);
		var w26 = cult.getImmortalCaveBonuses(26);
		var w25 = cult.getImmortalCaveBonuses(25);
		expect(w26.riftDmgMult / base26.riftDmgMult).toBeCloseTo(1.032, 9);
		expect(w26.riftHpMult / base26.riftHpMult).toBeCloseTo(1.03, 9);
		expect(w26.riftCritChance - base26.riftCritChance).toBeCloseTo(0.01, 9);
		expect(w26.riftMitigation - base26.riftMitigation).toBeCloseTo(0.0048, 9);
		expect(w25.riftDmgMult).toBeCloseTo(base25.riftDmgMult, 9);
		expect(w25.riftCritChance).toBeCloseTo(base25.riftCritChance, 9);
		expect(w25.riftHpMult).toBeCloseTo(base25.riftHpMult, 9);
		expect(w25.riftMitigation).toBeCloseTo(base25.riftMitigation, 9);
		expect(cult.getSectTribCombatBonus(25).riftDmg).toBe(0);
		expect(cult.getSectTribCombatBonus(0).riftDmg).toBe(0);

		// Formation + stars first, then the arena only fills what is left: the three together never pass the caps
		setIntents(cult, {qingping: 2, chixiao: 2});
		setSlots(cult, ["chixiao", "qingping", "", "", ""]);
		cult.swordIntentTier = 0;
		cult.starObservatory.phase = 21 * cult.STAR_MANSION_TICKS;
		cult.starObservatory.cooldown = 0;
		cult.divineStars(0.01);	// Vermilion Bird Lv 3
		cult.natalWarming.warmth = 260;
		var sw = cult.getSwordFormationEffect(31);
		var st = cult.getStarArtifactCombatBonus(31, sw);
		var pp = cult.getSectTribCombatBonus(31, st);
		expect(pp.swordDmg).toBeCloseTo(sw.riftDmg, 12);
		expect(pp.starDmg).toBeCloseTo(st.riftDmg, 12);
		expect(pp.baseDmg).toBeCloseTo(st.poolDmg, 12);
		expect(pp.riftDmg).toBeCloseTo(Math.max(0, Math.min(cult.XX14_DMG_CAP - st.poolDmg, pp.rawDmg)), 12);
		expect(pp.poolDmg).toBeLessThanOrEqual(cult.XX14_DMG_CAP + 1e-12);
		expect(pp.poolCrit).toBeLessThanOrEqual(cult.XX14_CRIT_CAP + 1e-12);
		expect(pp.poolHp).toBeLessThanOrEqual(cult.XX14_HP_CAP + 1e-12);
		expect(pp.poolMit).toBeLessThanOrEqual(cult.XX14_MIT_CAP + 1e-12);
		// Huge stars: the arena is squeezed to whatever room remains
		cult.natalWarming.warmth = 800;
		cult.natalWarming.resonance = 500;
		cult.starMapTier = 5;
		cult.thunderPool.tier = 9;
		for (var li = 21; li < 28; li++){ cult.starObservatory.lit[li] = 1; }
		var st2 = cult.getStarArtifactCombatBonus(31);
		var pq = cult.getSectTribCombatBonus(31);
		expect(st2.poolDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);
		expect(pq.riftDmg).toBeCloseTo(0, 12);
		expect(pq.poolDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);
		expect(pq.capped).toBe(true);
		var all = cult.getImmortalCaveBonuses(31);
		var swB = cult.getSwordFormationEffect(31);
		var stB = cult.getStarArtifactCombatBonus(31, swB);
		var sxB = cult.getSectTribCombatBonus(31, stB);
		expect(swB.riftDmg + stB.riftDmg + sxB.riftDmg).toBeLessThanOrEqual(cult.XX14_DMG_CAP + 1e-12);
		expect(swB.riftCrit + stB.riftCrit + sxB.riftCrit).toBeLessThanOrEqual(cult.XX14_CRIT_CAP + 1e-12);
		expect(swB.riftHp + stB.riftHp + sxB.riftHp).toBeLessThanOrEqual(cult.XX14_HP_CAP + 1e-12);
		expect(swB.mitigation + stB.mitigation + sxB.mitigation).toBeLessThanOrEqual(cult.XX14_MIT_CAP + 1e-12);
		for (var bk in all){
			if (all.hasOwnProperty(bk)){ expect(isFinite(all[bk])).toBe(true); }
		}

		// A full formation already sits on every cap: the arena and trials add nothing to battle,
		// but the Sword Crown grants +5% Immortal Essence output outside the caps
		cult.starObservatory.blessing = null;
		cult.natalWarming.warmth = 0;
		cult.natalWarming.resonance = 0;
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.computeSwordFormation().grade).toBe(cult.SWORD_TIER_MAX);
		var crown = cult.getSwordCrownBonus();
		expect(crown.active).toBe(true);
		expect(crown.xianyuanRatio).toBeCloseTo(0.05, 12);
		var pf = cult.getSectTribCombatBonus(31);
		expect(pf.riftDmg).toBe(0);
		expect(pf.riftCrit).toBe(0);
		expect(pf.riftHp).toBe(0);
		expect(pf.mitigation).toBe(0);
		var withSect = cult.getImmortalCaveBonuses(31);
		var savedSeat = sa.seat;
		sa.seat = 9;
		ht.stage = 0;
		var noSect = cult.getImmortalCaveBonuses(31);
		expect(withSect.riftDmgMult).toBe(noSect.riftDmgMult);
		expect(withSect.riftCritChance).toBe(noSect.riftCritChance);
		expect(withSect.riftHpMult).toBe(noSect.riftHpMult);
		expect(withSect.riftMitigation).toBe(noSect.riftMitigation);
		sa.seat = savedSeat;
		ht.stage = 6;
		// The crown is the only difference in Essence output; the battle numbers do not move
		game.updateCaches();
		var xyRateCrown = game.calcResourcePerTick("xianyuan");
		var crownCave = cult.getImmortalCaveBonuses(31);
		cult.swordTomb.slots = ["xuanyuan", "qingping", "chixiao", "", ""];
		expect(cult.computeSwordFormation().grade).toBeLessThan(cult.SWORD_TIER_MAX);
		expect(cult.getSwordCrownBonus().active).toBe(false);
		var plainCave = cult.getImmortalCaveBonuses(31);
		expect(crownCave.xianyuanRatio - plainCave.xianyuanRatio).toBeCloseTo(0.05, 12);
		game.updateCaches();
		var xyRatePlain = game.calcResourcePerTick("xianyuan");
		expect(xyRatePlain).toBeGreaterThan(0);
		expect(xyRateCrown).toBeGreaterThan(xyRatePlain);
		setSlots(cult, CLASSIC);

		// XX-10's thunder pursuit (0.795 at the very top) is left exactly as it was
		cult.swordIntentTier = 0;
		cult.fengshenRoster.layer = 33;
		cult.samsaraMirror.switchCooldown = 0;
		cult.illusionTrial.layer = 0;
		cult.innateTreasures.levels.chaosBell = 3;
		cult.innateTreasures.levels.panguBanner = 3;
		cult.innateTreasures.levels.taijiDiagram = 3;
		cult.innateTreasures.levels.creationDisc = 3;
		cult.thunderPool.tier = 9;
		cult.syncThunderTemperTier();
		cult.samsaraMirror.activePath = null;
		cult.talismanWorkshop.active = [];
		cult.fengshui.nodes = ["", "", "", "", "", "", "", "", ""];
		cult.swordTomb.slots = EMPTY5.slice(0);
		cult.starObservatory.blessing = null;
		cult.natalWarming.warmth = 0;
		cult.natalWarming.resonance = 0;
		sa.seat = 9;
		ht.stage = 0;
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		sa.seat = 1;
		ht.stage = 6;
		cult.sectTier = 5;
		var after = cult.getImmortalCaveBonuses(31);
		expect(cult.getSectTribCombatBonus(31).riftDmg).toBeGreaterThan(0);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);
		for (var ak in after){
			if (after.hasOwnProperty(ak)){ expect(isFinite(after[ak])).toBe(true); }
		}
		// Mortal life: nothing
		cult.immortalAscended = false;
		expect(cult.getSectTribCombatBonus(31).riftDmg).toBe(0);
		expect(cult.getSectTribRawEffect().dmg).toBe(0);
		expect(cult.getSwordCrownBonus().active).toBe(false);
	});

	test("Rebirth: the sectTier seal survives (and adds an imprint at Third place or all six trials); arena and trials reset; the seal helps the next life", function(){
		var cult = game.cultivation;
		cult.setIdentity("林平之", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		climbTo(cult, 3);
		expect(cult.sectTier).toBe(3);

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.sectTier).toBe(3);
		expect(rebirth.cultivation.sectArena).toBeUndefined();
		expect(rebirth.cultivation.heartTrib).toBeUndefined();
		var imprintWith = rebirth.cultivation.immortalImprint || 0;

		// Same life, unranked and no trials: no seal and one imprint fewer
		cult.sectArena.seat = 9;
		cult.sectArena.peakTier = 0;
		cult.sectTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.sectTier).toBeUndefined();
		expect(imprintWith).toBe((rebirthPlain.cultivation.immortalImprint || 0) + 1);
		// All six trials earn the same imprint
		cult.heartTrib.stage = 6;
		game.save();
		var rebirthHeart = game._resetInternal();
		expect(rebirthHeart.cultivation.immortalImprint || 0).toBe(imprintWith);
		expect(rebirthHeart.cultivation.sectTier).toBeUndefined();
		// Five trials and a listed seat: seal 1, no extra imprint
		cult.heartTrib.stage = 5;
		cult.sectArena.seat = 7;
		game.save();
		var rebirthListed = game._resetInternal();
		expect(rebirthListed.cultivation.sectTier).toBe(1);
		expect(rebirthListed.cultivation.immortalImprint || 0).toBe(imprintWith - 1);

		cult.resetState();
		expect(cult.sectTier).toBe(0);
		expect(cult.sectArena).toEqual(cult.makeDefaultSectArena());
		expect(cult.heartTrib).toEqual(cult.makeDefaultHeartTrib());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.sectTier).toBe(3);
		expect(cult.sectArena.seat).toBe(9);
		expect(cult.heartTrib.stage).toBe(0);
		var seal = cult.getSectSealBonus();
		expect(seal.tier).toBe(3);
		expect(seal.xiuweiRatio).toBeCloseTo(0.09, 9);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.challengeSectArena(0)).toBe(false);	// still mortal

		// Next ascension: cheaper bouts and trials, an extra token, higher rating and resistance
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.sectTier).toBe(3);
		expect(cult.getSectBoutReq().xianyuan).toBe(26);
		expect(cult.getSectBoutsMax()).toBe(11);
		expect(cult.getHeartTribReq().xianyuan).toBe(43);
		expect(cult.getHeartTribResist().seal).toBe(3);
		expect(cult.getSectArenaRating().seal).toBe(3);
		// The seal persists through another life
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.sectTier).toBe(3);
	});

	test("Old saves (XX-15 era and earlier) and corrupted XX-16 fields load cleanly", function(){
		var cult = game.cultivation;
		cult.setIdentity("曲洋", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.sectArena;
		delete oldSave.cultivation.heartTrib;
		delete oldSave.cultivation.sectTier;
		expect(oldSave.cultivation.starObservatory).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.sectArena).toEqual(cult.makeDefaultSectArena());
		expect(cult.heartTrib).toEqual(cult.makeDefaultHeartTrib());
		expect(cult.sectTier).toBe(0);
		expect(function(){ cult.tickSectTrib(10); }).not.toThrow();
		expect(cult.sectArena.week).toBe(cult.getSectWeekIndex());
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);
		expect(cult.challengeSectArena(0)).toBeTruthy();
		expect(cult.attemptHeartTrib(0)).toBeTruthy();

		// Mortal save without XX-16 fields
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.sectArena;
		delete mortalSave.cultivation.heartTrib;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.challengeSectArena(0)).toBe(false);
		expect(function(){ cult.tickSectTrib(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.sectArena = {
			week: 2915.7, seat: -5, bouts: 99, wins: 77, losses: 99, peakTier: 99, totalWins: 3, settles: -2,
			lastSettle: {week: 2914, seat: 44},
			log: [{seat: 3, win: 1, rival: "lingxu"}, {seat: 9, win: 1, rival: "lingxu"}, "x", {seat: 2, win: 0, rival: "nobody"}, {seat: 4, win: "y", rival: "mobai"}],
			lastNote: 7
		};
		badSave.cultivation.heartTrib = {stage: 99, insight: 4, cooldown: 1e9, attempts: "x", fails: 2.5, log: [{s: 5, ok: 1}, {s: 6, ok: 1}, {s: -1, ok: 0}, null, {s: 2, ok: 0}], lastNote: "ok"};
		badSave.cultivation.sectTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		var sa = cult.sectArena;
		expect(sa.week).toBe(2915);
		expect(sa.seat).toBe(1);
		expect(sa.wins).toBe(8);
		expect(sa.losses).toBe(4);
		expect(sa.bouts).toBe(12);
		expect(sa.peakTier).toBe(5);
		expect(sa.totalWins).toBe(8);
		expect(sa.settles).toBe(0);
		expect(sa.lastSettle).toEqual({week: 2914, seat: 9});
		expect(sa.log).toEqual([{seat: 3, win: 1, rival: "lingxu"}, {seat: 4, win: 1, rival: "mobai"}]);
		expect(sa.lastNote).toBe("");
		var ht = cult.heartTrib;
		expect(ht.stage).toBe(6);
		expect(ht.insight).toBe(0);
		expect(ht.cooldown).toBe(cult.HEART_TRIB_BACKLASH);
		expect(ht.fails).toBe(2);
		expect(ht.attempts).toBe(8);
		expect(ht.log).toEqual([{s: 5, ok: 1}, {s: 2, ok: 0}]);
		expect(ht.lastNote).toBe("ok");
		expect(cult.sectTier).toBe(5);
		// Out-of-range week and broken shapes fall back to defaults
		badSave.cultivation.sectArena = {week: 1e12, seat: 3, losses: 2};
		cult.resetState();
		cult.load(badSave);
		expect(cult.sectArena.week).toBe(null);
		expect(cult.sectArena.seat).toBe(9);
		expect(cult.sectArena.bouts).toBe(0);
		badSave.cultivation.sectArena = "broken";
		badSave.cultivation.heartTrib = [1, 2];
		badSave.cultivation.sectTier = "x";
		cult.resetState();
		cult.load(badSave);
		expect(cult.sectArena).toEqual(cult.makeDefaultSectArena());
		expect(cult.heartTrib).toEqual(cult.makeDefaultHeartTrib());
		expect(cult.sectTier).toBe(0);
		// Structure repaired lazily by the action entry points
		cult.sectArena = {week: "?"};
		cult.heartTrib = null;
		expect(function(){ cult.tickSectTrib(1); }).not.toThrow();
		expect(cult.sectArena.week).toBe(cult.getSectWeekIndex());
		expect(cult.heartTrib).toEqual(cult.makeDefaultHeartTrib());
	});

	test("Panel renders in the cultivation tab: weekly ladder, rating, challenge, rewards, heart-mirror, trials, merged caps, Sword Crown; clicks via event delegation; ?v=85 art; zh/en without raw placeholders", function(){
		var mk = function(el, c, on){
			if (!el || !el.classList){ return; }
			String(c).split(/\s+/).forEach(function(x){ if (x){ el.classList[on ? "add" : "remove"](x); } });
		};
		global.dojo.addClass = function(el, c){ mk(el, c, true); };
		global.dojo.removeClass = function(el, c){ mk(el, c, false); };
		global.dojo.toggleClass = function(el, c, on){ mk(el, c, on === undefined ? !(el && el.classList && el.classList.contains(c)) : !!on); };
		global.dojo.hasClass = function(el, c){ return !!(el && el.classList && el.classList.contains(c)); };
		global.dojo.partial = function(fn){ var a = Array.prototype.slice.call(arguments, 1); return function(){ return fn.apply(this, a.concat(Array.prototype.slice.call(arguments))); }; };
		global.dojo.query = function(){ return []; };
		global.dojo.style = function(){};
		global.dojo.attr = function(){};
		global.dojo.place = function(){};
		var origConnect = global.dojo.connect;
		global.dojo.connect = function(el, evt, fn){
			if (el && el.addEventListener && evt === "onclick" && el.className && String(el.className).indexOf("xxSectArena") >= 0){
				el.addEventListener("click", fn);
			}
		};
		var root = path.resolve(__dirname, "..");
		var dict = {
			zh: JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8")),
			en: JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"))
		};
		var origI = global.$I;
		var useLang = function(lang){
			global.$I = function(key, args){
				var v = dict[lang][key];
				if (typeof v !== "string"){ return "$" + key + "$"; }
				//same as the runtime $I (i18n.js): each {n} is replaced once
				for (var ai = 0; args && ai < args.length; ai++){
					v = v.replace("{" + ai + "}", args[ai]);
				}
				return v;
			};
		};
		useLang("zh");
		var rawRe = /undefined|NaN|<svg|<canvas|\$cultivation\.|\{\d\}/;

		try {
			var cult = game.cultivation;
			cult.setIdentity("岳灵珊", "f", "scholar");
			cult.prepareImmortalCaveForTest(true);
			grantImmortalResources(50000);
			cult.riftFloor = 35;
			cult.thunderPool.tier = 3;
			cult.natalWarming.warmth = 130;
			cult.sectRandom = function(){ return 0; };
			var tab = game.cultivationTab;
			expect(tab instanceof classes.tab.CultivationTab).toBe(true);
			var host = document.createElement("div");
			document.body.appendChild(host);
			tab.render(host);
			tab.update();
			var el = host.querySelector(".xxSectArena");
			expect(el).not.toBe(null);
			expect(el.style.display).toBe("block");
			expect(el.querySelectorAll(".xxSectSeat").length).toBe(10);	// header + 8 disciples + you
			expect(el.querySelectorAll(".xxSectSeat.is-me").length).toBe(1);
			expect(el.querySelectorAll(".xxSectSeat.is-target").length).toBe(1);
			expect(el.querySelectorAll(".xxSectSeat.is-beaten").length).toBe(0);
			expect(el.querySelectorAll(".xxSectReward").length).toBe(5);
			expect(el.querySelectorAll(".xxHeartStep").length).toBe(6);
			expect(el.querySelectorAll(".xxHeartStep.is-now").length).toBe(1);
			expect(el.querySelectorAll(".xxHeartRes").length).toBe(7);
			expect(el.querySelectorAll(".xxHeartRes.is-weak").length).toBe(1);
			expect(el.querySelectorAll(".xxStarPool").length).toBe(4);
			expect(el.querySelectorAll(".xxStarPoolBar > i.is-sect").length).toBe(4);
			expect(el.querySelectorAll("[data-xx-sect=challenge]").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-heart=attempt]").length).toBe(1);
			expect(el.querySelector(".xxSectCrownBox.is-active")).toBe(null);
			var checkImgs = function(minCount, required){
				var imgs = el.querySelectorAll("img");
				expect(imgs.length).toBeGreaterThan(minCount);
				var seenArt = {};
				for (var i = 0; i < imgs.length; i++){
					expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
					expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(85);
					expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
					seenArt[imgs[i].getAttribute("src").split("?")[0]] = true;
				}
				required.forEach(function(n){
					expect(seenArt["res/art/" + n + ".webp"]).toBe(true);
				});
			};
			checkImgs(10, ["sect_arena", "sect_ranking", "sect_token", "heart_demon_realm", "heart_demon", "tribulation_mirror"]);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).toContain("宗门大比擂台");
			expect(el.textContent).toContain("心魔幻境渡劫");
			expect(el.textContent).toContain("渡劫照心镜");
			expect(el.textContent).toContain("贪魔劫");
			expect(cult.isSectArenaEn()).toBe(false);

			var click = function(sel){
				var t = el.querySelector(sel);
				expect(t).not.toBe(null);
				t.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			};
			// Challenge through the panel (injected roll 0 → win)
			click("[data-xx-sect=challenge]");
			expect(cult.sectArena.seat).toBe(8);
			expect(el.querySelectorAll(".xxSectSeat.is-beaten").length).toBe(1);
			expect(el.querySelectorAll(".xxSectLog.is-win").length).toBe(1);
			click("[data-xx-sect=challenge]");
			click("[data-xx-sect=challenge]");
			expect(cult.sectArena.seat).toBe(6);
			expect(el.querySelector(".xxSectReward.is-now")).not.toBe(null);
			// Heart trial through the panel → pass, then cooling (disabled button does nothing)
			click("[data-xx-heart=attempt]");
			expect(cult.heartTrib.stage).toBe(1);
			expect(el.querySelectorAll(".xxHeartStep.is-cleared").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-heart=attempt]").length).toBe(0);
			var cooling = el.querySelector(".xxHeartAttempt .xxCaveMiniBtn.is-disabled");
			expect(cooling).not.toBe(null);
			cooling.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			expect(cult.heartTrib.attempts).toBe(1);
			expect(el.querySelectorAll(".xxHeartLog.is-pass").length).toBe(1);
			expect(el.querySelectorAll(".xxStarPool.is-on").length).toBeGreaterThan(0);
			expect(cult.sectArena.lastNote).toContain("第 6 席");
			expect(cult.heartTrib.lastNote).toContain("贪魔劫");
			expect(el.innerHTML).not.toMatch(rawRe);
			// Sword Crown chip / box when the formation is full
			setIntents(cult, FULL_INTENTS);
			setSlots(cult, CLASSIC);
			tab._sectSig = "";
			tab.update();
			expect(el.querySelector(".xxSectCrownBox.is-active")).not.toBe(null);
			expect(el.querySelector(".xxCaveSumChip.is-crown")).not.toBe(null);
			checkImgs(10, ["ancient_sword", "sect_token"]);
			expect(el.innerHTML).not.toMatch(rawRe);

			// English pass over the same state
			useLang("en");
			tab._sectSig = "";
			tab.update();
			expect(cult.isSectArenaEn()).toBe(true);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.querySelector(".xxSectLadder.is-en")).not.toBe(null);
			expect(el.textContent).toContain("Sect Tournament Arena");
			expect(el.textContent).toContain("Heart-Demon Illusion Trials");
			expect(el.textContent).toContain("Sword Crown");
			expect(el.textContent).toContain("Rift damage");

			// All six passed: the mirror shows clear and the button is spent
			cult.heartTrib.stage = 6;
			tab._sectSig = "";
			tab.update();
			expect(el.querySelector(".xxHeartNow.is-done")).not.toBe(null);
			expect(el.querySelectorAll(".xxHeartStep.is-cleared").length).toBe(6);
			expect(el.innerHTML).not.toMatch(rawRe);
			useLang("zh");

			// Mortal with a past-life seal: locked notice only
			cult.resetState();
			cult.sectTier = 2;
			tab._sectSig = "";
			tab.update();
			expect(el.style.display).toBe("block");
			expect(el.className).toContain("is-locked");
			expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
			expect(el.querySelector(".xxSamsaraLockLegacy")).not.toBe(null);
			expect(el.querySelectorAll(".xxSectSeat").length).toBe(0);
			expect(el.innerHTML).not.toMatch(rawRe);
		} finally {
			global.dojo.connect = origConnect;
			global.$I = origI;
		}
	});

	test("XX-16 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 85; the logic leaves thunder pursuit alone", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(85);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(85);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var names = ["sect_arena", "sect_ranking", "sect_token", "heart_demon_realm", "heart_demon", "tribulation_mirror"];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < names.length; i++){
			var rel = "res/art/" + names[i] + ".webp";
			var abs = path.join(root, rel);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			var head = fs.readFileSync(abs).slice(0, 12).toString("latin1");
			expect(head.slice(0, 4)).toBe("RIFF");
			expect(head.slice(8, 12)).toBe("WEBP");
			expect(fs.existsSync(path.join(root, "dist", rel))).toBe(true);
			expect(fs.readFileSync(path.join(root, "dist", rel)).equals(fs.readFileSync(abs))).toBe(true);
			expect(cultSrc).toContain("\"" + names[i] + "\"");
		}
		expect(cultSrc).not.toMatch(/\?v=84\b/);
		expect(cultSrc).not.toContain("ART_VER || \"84\"");
		var xx16Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalSectEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx16Ui.length).toBeGreaterThan(1000);
		expect(xx16Ui).not.toContain("<svg");
		expect(xx16Ui).not.toContain("<canvas");
		expect(xx16Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		var xx16Logic = cultSrc.slice(cultSrc.indexOf("XX-16 宗门大比擂台与心魔幻境渡劫 ----"), cultSrc.indexOf("getImmortalCaveBonuses: function(riftFloorOpt){"));
		expect(xx16Logic.length).toBeGreaterThan(1000);
		expect(xx16Logic).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		// The merged cap reads the XX-14 constants; nothing in XX-16 touches the thunder pursuit ratio
		expect(xx16Logic).toContain("this.XX14_DMG_CAP");
		expect(xx16Logic).toContain("this.XX14_MIT_CAP");
		expect(xx16Logic).not.toContain("thunderStrikeRatio");
		expect(xx16Logic).not.toContain("getThunderStrikeRatio");
		// The resistances read the real systems
		expect(xx16Logic).toContain("this.getSwordThunderTier()");
		expect(xx16Logic).toContain("this.getNatalSpiritGrade()");
		expect(xx16Logic).toContain("this.getStarBlessingEffect()");

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html", "build.version.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var gameSrc = fs.readFileSync(path.join(root, "game.js"), "utf8");
		expect(gameSrc).toContain("soulObj.sectTier");
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxSectArena");
		expect(css).toContain(".xxSectSeat");
		expect(css).toContain(".xxHeartTrack");
		expect(css).toContain(".xxHeartResList");
		expect(css).toContain(".xxStarPoolBar > i.is-sect");
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxSectChallenge/);
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxSectSeat/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.sectarena.", "cultivation.hearttrib."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(160);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(/[一-鿿]/.test(zh[zhKeys[pk]])).toBe(true);
			expect(en[zhKeys[pk]]).not.toMatch(/"/);
			expect(en[zhKeys[pk]]).not.toMatch(/[一-鿿]/);
			//the runtime $I replaces each {n} once: a placeholder may appear only once per string
			[zh[zhKeys[pk]], en[zhKeys[pk]]].forEach(function(v){
				var seenPh = {};
				(String(v).match(/\{\d\}/g) || []).forEach(function(ph){
					expect(seenPh[ph]).toBeUndefined();
					seenPh[ph] = true;
				});
			});
		}
		expect(en["cultivation.sectarena.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var need = [];
		cult.SECT_THEMES.forEach(function(t){ need.push("cultivation.sectarena.theme." + t.key + ".label", "cultivation.sectarena.theme." + t.key + ".desc"); });
		cult.SECT_RIVALS.forEach(function(r){ need.push("cultivation.sectarena.rival." + r.key, "cultivation.sectarena.style." + r.style); });
		cult.SECT_RANKS.forEach(function(r){ need.push("cultivation.sectarena.rank." + r); });
		cult.SECT_RATING_PARTS.forEach(function(p){ need.push("cultivation.sectarena.part." + p.key); });
		["xianyuan", "relic", "starchart", "orbs"].forEach(function(r){ need.push("cultivation.sectarena.reward." + r); });
		cult.HEART_TRIB_STAGES.forEach(function(s){
			need.push("cultivation.hearttrib.stage." + s.key + ".label", "cultivation.hearttrib.stage." + s.key + ".short", "cultivation.hearttrib.stage." + s.key + ".desc", "cultivation.hearttrib.res." + s.weak);
		});
		["dmg", "crit", "hp", "mit"].forEach(function(c){ need.push("cultivation.starobs.pool." + c); });
		for (var n = 0; n < need.length; n++){
			expect(zh[need[n]]).toBeTruthy();
			expect(en[need[n]]).toBeTruthy();
		}
		// Every theme doubles a real rating part; every trial dreads a real resistance
		var partKeys = cult.SECT_RATING_PARTS.map(function(p){ return p.key; });
		cult.SECT_THEMES.forEach(function(t){ expect(partKeys).toContain(t.part); });
		cult.HEART_TRIB_STAGES.forEach(function(s){ expect(["thunder", "spirit", "star"]).toContain(s.weak); });

		var jsFiles = ["config.js", "core.js", "game.js", "i18n.js"].concat(
			fs.readdirSync(path.join(root, "js"))
				.filter(function(f){ return /\.js$/.test(f) && !/min/.test(f); })
				.map(function(f){ return path.join("js", f); })
		);
		for (var fi = 0; fi < jsFiles.length; fi++){
			var raw = fs.readFileSync(path.join(root, jsFiles[fi]), "utf8");
			expect(function(){
				acorn.parse(raw, {ecmaVersion: 5});
			}).not.toThrow();
		}
	});
});

//只比对 expected 中列出的字段(其余字段保留实际值)
function jasmineLike(actual, expected){
	var out = {};
	for (var k in actual){
		if (actual.hasOwnProperty(k)){ out[k] = expected.hasOwnProperty(k) ? expected[k] : actual[k]; }
	}
	return out;
}
