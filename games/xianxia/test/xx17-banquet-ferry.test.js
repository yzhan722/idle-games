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

//灵药 / 朱砂 / 九霄雷髓 这三样存量不在资源池里
function grantSideMaterials(cult, n){
	cult.herbGarden.stock.qinglian = n;
	cult.herbGarden.stock.zizhi = n;
	cult.herbGarden.stock.xianlan = n;
	cult.talismanWorkshop.cinnabar = n;
	cult.thunderPool.thunderOrbs = n;
	cult.syncThunderOrbs();
}

function resVal(name){
	return game.resPool.get(name).value;
}

function giftAll(cult, keys){
	for (var i = 0; i < keys.length; i++){
		var r = cult.giftBanquet(keys[i]);
		expect(r).toBeTruthy();
	}
}

var ALL6 = ["xianyuan", "relic", "starchart", "herb", "cinnabar", "orbs"];
var EMPTY5 = ["", "", "", "", ""];

//东八区 2026-11-16(周一)0 点 = UTC 2026-11-15 16:00
var MON = Date.UTC(2026, 10, 15, 16, 0, 0);
var DAY = 24 * 3600 * 1000;
var WEEK = 7 * DAY;

describe("XX-17 Jade Pool Peach Banquet & Nine Nether River Ferry", function(){
	var now;
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		now = MON + 2 * DAY + 5 * 3600 * 1000;	//周三
		game.cultivation.banquetClock = function(){ return now; };
		game.cultivation.sectClock = function(){ return now; };
	});

	afterEach(function(){
		game.cultivation.banquetRandom = null;
		game.cultivation.banquetClock = null;
		game.cultivation.sectRandom = null;
		game.cultivation.sectClock = null;
		jest.restoreAllMocks();
	});

	test("Banquet: locked before ascension; gifts spend existing materials; score = gift points + variety + seal sets the seat; weekly gift cap; Thunder Essence needs Tempering 1", function(){
		var cult = game.cultivation;
		cult.setIdentity("王母", "f", "scholar");

		expect(cult.giftBanquet("xianyuan")).toBe(false);
		expect(cult.attendBanquet(0)).toBe(false);
		expect(cult.ferrySouls(0)).toBe(false);
		expect(cult.exchangeFerryBoon("lamp")).toBe(false);
		expect(cult.brewFerryTea()).toBe(false);
		expect(cult.syncBanquetWeek()).toBe(null);
		expect(function(){ cult.tickBanquetFerry(5000); }).not.toThrow();
		expect(cult.peachBanquet.week).toBe(null);
		expect(cult.getBanquetCombatBonus(31).riftDmg).toBe(0);
		expect(cult.getFerryBoonEffect().xianyuanRatio).toBe(0);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		grantSideMaterials(cult, 40);
		cult.thunderPool.tier = 0;
		var pb = cult.peachBanquet;
		expect(pb.week).toBe(cult.getSectWeekIndex(now));
		expect(cult.getBanquetWeekIndex()).toBe(cult.getSectWeekIndex(now));
		expect(cult.getSectWeekKey(pb.week)).toBe("2026-11-16");
		expect(cult.getBanquetGiftsMax()).toBe(6);

		// Nothing given yet: no seat even with a seal bonus
		var s0 = cult.getBanquetScore();
		expect(s0.total).toBe(0);
		expect(s0.seat).toBe(0);
		expect(cult.getBanquetAttendReq().affordable).toBe(false);

		// Thunder Essence needs Thunder Tempering 1
		var orbReq = cult.getBanquetGiftReq("orbs");
		expect(orbReq.needThunder).toBe(1);
		expect(orbReq.thunderOk).toBe(false);
		expect(orbReq.affordable).toBe(false);
		expect(cult.giftBanquet("orbs")).toBe(false);
		expect(cult.giftBanquet("nonsense")).toBe(false);

		// Each gift spends its own existing store
		var xy0 = resVal("xianyuan");
		var relic0 = resVal("relic");
		var chart0 = resVal("starchart");
		var herb0 = cult.getWarmMaterialHave("herb");
		var cin0 = cult.talismanWorkshop.cinnabar;
		giftAll(cult, ["xianyuan", "relic", "starchart", "herb", "cinnabar"]);
		expect(resVal("xianyuan")).toBe(xy0 - 80);
		expect(resVal("relic")).toBe(relic0 - 8);
		expect(resVal("starchart")).toBe(chart0 - 12);
		expect(cult.getWarmMaterialHave("herb")).toBe(herb0 - 2);
		expect(cult.talismanWorkshop.cinnabar).toBe(cin0 - 4);
		var s5 = cult.getBanquetScore();
		expect(s5.giftPts).toBe(6 + 8 + 7 + 9 + 7);
		expect(s5.kinds).toBe(5);
		expect(s5.variety).toBe(12);
		expect(s5.total).toBe(49);
		expect(s5.seat).toBe(4);	// Upper Table (46+)
		expect(pb.lastNote).toContain("cultivation.banquet.note.gift");

		// Thunder Tempering 1 unlocks the Thunder Essence gift: six kinds reach the Head Seat
		cult.thunderPool.tier = 1;
		var orbs0 = cult.thunderPool.thunderOrbs;
		expect(cult.giftBanquet("orbs")).toBeTruthy();
		expect(cult.thunderPool.thunderOrbs).toBe(orbs0 - 2);
		var s6 = cult.getBanquetScore();
		expect(s6.total).toBe(47 + 15);
		expect(s6.seat).toBe(5);
		expect(cult.getBanquetGiftsUsed()).toBe(6);
		// Weekly cap reached
		var full = cult.getBanquetGiftReq("relic");
		expect(full.left).toBe(0);
		expect(full.affordable).toBe(false);
		expect(cult.giftBanquet("relic")).toBe(false);

		// Seat thresholds and the pure score function
		expect(cult.getBanquetSeatTierFor(9)).toBe(0);
		expect(cult.getBanquetSeatTierFor(10)).toBe(1);
		expect(cult.getBanquetSeatTierFor(22)).toBe(2);
		expect(cult.getBanquetSeatTierFor(34)).toBe(3);
		expect(cult.getBanquetSeatTierFor(46)).toBe(4);
		expect(cult.getBanquetSeatTierFor(58)).toBe(5);
		expect(cult.getBanquetSeatTierFor(999)).toBe(5);
		expect(cult.getBanquetScore({xianyuan: 2}).seat).toBe(1);
		expect(cult.getBanquetScore({xianyuan: 1}).seat).toBe(0);

		// Short on materials
		game.resPool.get("xianyuan").value = 10;
		cult.peachBanquet.gifts = {xianyuan: 0, relic: 0, starchart: 0, herb: 0, cinnabar: 0, orbs: 0};
		var shortReq = cult.getBanquetGiftReq("xianyuan");
		expect(shortReq.ok).toBe(false);
		expect(cult.giftBanquet("xianyuan")).toBe(false);
	});

	test("Feast: injectable roll draws a 3,000 / 6,000 / 9,000-year peach; seat reward x peach multiplier paid in existing resources; once a week; unclaimed gifts seat automatically at the UTC+8 Monday boundary; never backwards", function(){
		var cult = game.cultivation;
		cult.setIdentity("东方朔", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		grantSideMaterials(cult, 40);
		cult.thunderPool.tier = 1;
		var pb = cult.peachBanquet;
		var w0 = pb.week;

		expect(cult.getBanquetPeachOdds(0)).toEqual({great: 0, good: 0, plain: 0});
		expect(cult.getBanquetPeachOdds(1)).toEqual({great: 0.04, good: 0.24, plain: 0.72});
		expect(cult.getBanquetPeachOdds(5)).toEqual({great: 0.2, good: 0.4, plain: 0.4});

		giftAll(cult, ALL6);
		expect(cult.getBanquetScore().seat).toBe(5);
		var xy0 = resVal("xianyuan");
		var relic0 = resVal("relic");
		var chart0 = resVal("starchart");
		var orbs0 = cult.thunderPool.thunderOrbs;
		var r = cult.attendBanquet(0);	// roll 0 < 20%: 9,000-year peach
		expect(r.seat).toBe(5);
		expect(r.peach).toBe(2);
		expect(r.reward).toEqual({xianyuan: 1440, relic: 42, starchart: 64, orbs: 5});
		expect(resVal("xianyuan")).toBe(xy0 + 1440);
		expect(resVal("relic")).toBe(relic0 + 42);
		expect(resVal("starchart")).toBe(chart0 + 64);
		expect(cult.thunderPool.thunderOrbs).toBe(orbs0 + 5);
		expect(pb.attended).toBe(1);
		expect(pb.seat).toBe(5);
		expect(pb.peach).toBe(2);
		expect(pb.peakSeat).toBe(5);
		expect(pb.feasts).toBe(1);
		expect(pb.log[0]).toEqual({week: w0, seat: 5, peach: 2});
		expect(cult.banquetTier).toBe(5);
		expect(pb.lastNote).toContain("cultivation.banquet.note.attend");
		expect(pb.lastNote).toContain("cultivation.banquet.note.seal");
		// Once a week: no second feast, no more gifts
		expect(cult.attendBanquet(0)).toBe(false);
		expect(cult.giftBanquet("xianyuan")).toBe(false);
		expect(cult.getBanquetGiftReq("xianyuan").attended).toBe(true);

		// Reward table x multipliers
		expect(cult.getBanquetFeastReward(4, 0)).toEqual({xianyuan: 650, relic: 18, starchart: 30, orbs: 2});
		expect(cult.getBanquetFeastReward(3, 1)).toEqual({xianyuan: 563, relic: 15, starchart: 28, orbs: 1});
		expect(cult.getBanquetFeastReward(0, 2)).toBe(null);

		// Clock turned back: nothing happens
		now = MON - DAY;
		expect(cult.syncBanquetWeek()).toBe(null);
		expect(pb.week).toBe(w0);
		expect(pb.attended).toBe(1);

		// Next week: a fresh banquet; the seat (and its battle bonus) ends with the week
		now = MON + WEEK + 3600 * 1000;
		cult.tickBanquetFerry(1);
		expect(pb.week).toBe(w0 + 1);
		expect(pb.attended).toBe(0);
		expect(pb.seat).toBe(0);
		expect(pb.peach).toBe(-1);
		expect(cult.getBanquetGiftsUsed()).toBe(0);
		expect(cult.getBanquetRawEffect().seat).toBe(0);
		expect(cult.banquetTier).toBe(5);

		// With the seal (5): gifts cheaper, +10 points, 8 gifts a week
		expect(cult.getBanquetGiftsMax()).toBe(8);
		expect(cult.getBanquetGiftReq("xianyuan").cost).toBe(60);
		expect(cult.getBanquetGiftReq("relic").cost).toBe(6);
		giftAll(cult, ["xianyuan", "xianyuan"]);
		var sc = cult.getBanquetScore();
		expect(sc.seal).toBe(10);
		expect(sc.total).toBe(12 + 10);
		expect(sc.seat).toBe(2);
		// Middle roll -> 6,000-year peach (Side Table: 8% / 28%)
		cult.banquetRandom = function(){ return 0.2; };
		var r2 = cult.attendBanquet();
		expect(r2.seat).toBe(2);
		expect(r2.peach).toBe(1);
		expect(r2.reward).toEqual({xianyuan: 350, relic: 10, starchart: 18, orbs: 0});

		// Unclaimed gifts are seated automatically when the week turns (injectable roll here too)
		now = MON + 2 * WEEK + 60000;
		cult.tickBanquetFerry(1);
		expect(pb.week).toBe(w0 + 2);
		giftAll(cult, ["relic", "starchart", "herb"]);
		var expectSeat = cult.getBanquetScore().seat;
		expect(expectSeat).toBe(3);	// 8+7+9 +6 variety +10 seal = 40
		cult.banquetRandom = function(){ return 0.95; };
		var xyBefore = resVal("xianyuan");
		now = MON + 3 * WEEK + 60000;
		var auto = cult.syncBanquetWeek();
		expect(auto.auto).toBe(true);
		expect(auto.seat).toBe(3);
		expect(auto.peach).toBe(0);
		expect(resVal("xianyuan")).toBe(xyBefore + 450);
		expect(pb.week).toBe(w0 + 3);
		expect(pb.attended).toBe(0);
		expect(pb.log[0]).toEqual({week: w0 + 2, seat: 3, peach: 0});
		expect(pb.log.length).toBe(3);
		// Same week again: no double settlement
		expect(cult.syncBanquetWeek()).toBe(null);

		// Too few points and the week ends: gifts lapse, nothing paid
		cult.banquetTier = 0;
		cult.peachBanquet.peakSeat = 0;
		expect(cult.giftBanquet("xianyuan")).toBeTruthy();
		expect(cult.getBanquetScore().seat).toBe(0);
		var xyLapse = resVal("xianyuan");
		now = MON + 4 * WEEK + 60000;
		expect(cult.syncBanquetWeek()).toBe(null);
		expect(resVal("xianyuan")).toBe(xyLapse);
		expect(pb.lastNote).toContain("cultivation.banquet.note.lapse");
		expect(cult.getBanquetGiftsUsed()).toBe(0);
	});

	test("Ferry: the river level turns with the star quarter on duty; injectable roll picks the soul; Yin Merit grows with Heart-Demon Trials; cooldown, rift haste, boons and tea", function(){
		var cult = game.cultivation;
		cult.setIdentity("钟馗", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var so = cult.starObservatory;
		var nf = cult.netherFerry;

		// Level follows the XX-15 star cycle: Azure / Tortoise / Tiger / Vermilion quarters
		so.phase = 0;
		expect(cult.getFerryWaterIndex()).toBe(0);
		expect(cult.getFerrySoulTable().key).toBe("rising");
		expect(cult.getFerryWaterIndex(2100)).toBe(1);
		expect(cult.getFerryWaterIndex(4200)).toBe(2);
		expect(cult.getFerryWaterIndex(6300)).toBe(3);
		expect(cult.getFerryWaterIndex(8399)).toBe(3);
		so.phase = 2000;
		expect(cult.getFerryWaterTicksLeft()).toBe(100);
		cult.tickStarObservatory(100);
		expect(cult.getFerryWaterIndex()).toBe(1);
		expect(cult.getFerryWaterTicksLeft()).toBe(2100);

		// Soul tables
		var tRise = cult.getFerrySoulTable(0);
		expect(tRise.rows.map(function(r){ return r.yinde; })).toEqual([4, 7, 12]);
		expect(tRise.rows.map(function(r){ return Math.round(r.chance * 100); })).toEqual([50, 35, 15]);
		expect(cult.getFerrySoulTable(1).rows.map(function(r){ return r.yinde; })).toEqual([6, 11, 18]);
		expect(cult.getFerrySoulTable(2).rows.map(function(r){ return r.yinde; })).toEqual([3, 6, 10]);
		expect(cult.getFerrySoulTable(3).rows.map(function(r){ return r.yinde; })).toEqual([2, 4, 7]);
		var sumW = 0;
		cult.FERRY_WATERS.forEach(function(w){ sumW += w.w[0] + w.w[1] + w.w[2]; });
		expect(sumW).toBe(400);

		// Ferry at flood: roll 0.9 -> grudge soul (18 merit), Essence spent
		so.phase = 2100;
		var xy0 = resVal("xianyuan");
		var f1 = cult.ferrySouls(0.9);
		expect(f1.water).toBe(1);
		expect(f1.soul).toBe(2);
		expect(f1.yinde).toBe(18);
		expect(resVal("xianyuan")).toBe(xy0 - 20);
		expect(nf.yinde).toBe(18);
		expect(nf.totalYinde).toBe(18);
		expect(nf.trips).toBe(1);
		expect(nf.souls).toEqual([0, 0, 1]);
		expect(nf.log[0]).toEqual({w: 1, s: 2, y: 18});
		expect(nf.lastNote).toContain("cultivation.ferry.note.trip");
		// Cooldown, then the rift shortens it, then ticks finish it
		expect(nf.cooldown).toBe(300);
		expect(cult.ferrySouls(0)).toBe(false);
		var haste = cult.onFerryRiftVictory(26);
		expect(haste.cooldown).toBe(100);
		expect(nf.cooldown).toBe(200);
		expect(cult.onFerryRiftVictory(25).cooldown).toBe(0);
		cult.tickBanquetFerry(200);
		expect(nf.cooldown).toBe(0);

		// Heart-Demon Trials calm the souls: 6 trials = +30%
		cult.heartTrib.stage = 6;
		expect(cult.getFerryHeartBonus()).toBeCloseTo(0.3, 9);
		so.phase = 0;
		expect(cult.getFerrySoulTable().rows.map(function(r){ return r.yinde; })).toEqual([5, 9, 16]);
		cult.banquetRandom = function(){ return 0.5; };	// 50% kind, then lost
		var f2 = cult.ferrySouls();
		expect(f2.soul).toBe(1);
		expect(f2.yinde).toBe(9);
		expect(nf.yinde).toBe(27);

		// Not enough Essence
		cult.tickBanquetFerry(300);
		game.resPool.get("xianyuan").value = 5;
		expect(cult.getFerryReq().okXy).toBe(false);
		expect(cult.ferrySouls(0)).toBe(false);
		grantImmortalResources(50000);

		// Boons: Rebirth Lamp and Soul-Guiding Banner, rising costs, max 5
		nf.yinde = 1000;
		var lampCosts = [];
		for (var i = 0; i < 5; i++){
			var b = cult.exchangeFerryBoon("lamp");
			lampCosts.push(b.cost);
		}
		expect(lampCosts).toEqual([30, 50, 70, 90, 110]);
		expect(nf.boons.lamp).toBe(5);
		expect(nf.yinde).toBe(1000 - 350);
		expect(cult.getFerryBoonReq("lamp").maxed).toBe(true);
		expect(cult.exchangeFerryBoon("lamp")).toBe(false);
		expect(cult.exchangeFerryBoon("nothing")).toBe(false);
		expect(cult.exchangeFerryBoon("banner").level).toBe(1);
		var eff = cult.getFerryBoonEffect();
		expect(eff.xianyuanRatio).toBeCloseTo(0.05, 12);
		expect(eff.xiuweiRatio).toBeCloseTo(0.02, 12);
		// Tea: 25 merit for Ancient Treasure 5 + Cosmos Chart 6, repeatable
		var relic0 = resVal("relic");
		var chart0 = resVal("starchart");
		expect(cult.brewFerryTea()).toBeTruthy();
		expect(cult.brewFerryTea()).toBeTruthy();
		expect(resVal("relic")).toBe(relic0 + 10);
		expect(resVal("starchart")).toBe(chart0 + 12);
		expect(nf.teas).toBe(2);
		nf.yinde = 10;
		expect(cult.brewFerryTea()).toBe(false);
		expect(cult.exchangeFerryBoon("banner")).toBe(false);
	});

	test("Battle bonus: the banquet seat fills only what formation, stars and arena leave under the XX-14 caps (Rift 26F+ only); thunder pursuit stays 0.795; ferry boons add Essence / Cultivation outside the caps", function(){
		var cult = game.cultivation;
		cult.setIdentity("嫦娥", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		grantSideMaterials(cult, 40);
		cult.thunderPool.tier = 1;
		cult.riftFloor = 35;
		var pb = cult.peachBanquet;

		var base31 = cult.getImmortalCaveBonuses(31);
		giftAll(cult, ALL6);
		cult.attendBanquet(0.9);
		expect(pb.seat).toBe(5);
		var raw = cult.getBanquetRawEffect();
		expect(raw.seat).toBe(5);
		expect(raw.dmg).toBeCloseTo(0.015, 12);
		expect(raw.crit).toBeCloseTo(0.005, 12);
		expect(raw.hp).toBeCloseTo(0.02, 12);
		expect(raw.mit).toBeCloseTo(0.002, 12);
		var p = cult.getBanquetCombatBonus(31);
		expect(p.prevDmg).toBe(cult.getSectTribCombatBonus(31).poolDmg);
		expect(p.riftDmg).toBeCloseTo(Math.min(0.015, cult.XX14_DMG_CAP - p.prevDmg), 12);
		expect(p.mitigation).toBeCloseTo(Math.min(0.002, cult.XX14_MIT_CAP - p.prevMit), 12);
		// Rift 25 and below: nothing in battle
		var p25 = cult.getBanquetCombatBonus(25);
		expect(p25.riftDmg).toBe(0);
		expect(p25.rawDmg).toBeCloseTo(0.015, 12);
		var with31 = cult.getImmortalCaveBonuses(31);
		expect(with31.riftDmgMult).toBeGreaterThan(base31.riftDmgMult);
		expect(with31.riftHpMult).toBeGreaterThan(base31.riftHpMult);
		var with25 = cult.getImmortalCaveBonuses(25);
		pb.seat = 0;
		pb.attended = 0;
		var plain25 = cult.getImmortalCaveBonuses(25);
		expect(with25.riftDmgMult).toBe(plain25.riftDmgMult);
		pb.seat = 5;
		pb.attended = 1;

		// Fill only the remaining room
		var squeezed = cult.getBanquetCombatBonus(31, {poolDmg: 0.075, poolCrit: 0.04, poolHp: 0.05, poolMit: 0.0095});
		expect(squeezed.riftDmg).toBeCloseTo(0.005, 12);
		expect(squeezed.riftCrit).toBe(0);
		expect(squeezed.riftHp).toBeCloseTo(0.01, 12);
		expect(squeezed.mitigation).toBeCloseTo(0.0005, 12);
		expect(squeezed.poolDmg).toBeCloseTo(cult.XX14_DMG_CAP, 12);
		expect(squeezed.capped).toBe(true);
		var roomy = cult.getBanquetCombatBonus(31, {poolDmg: 0, poolCrit: 0, poolHp: 0, poolMit: 0});
		expect(roomy.capped).toBe(false);
		expect(roomy.riftDmg).toBeCloseTo(0.015, 12);

		// Everything stacked: the four sources together never pass the XX-14 caps
		cult.natalWarming.warmth = 800;
		cult.natalWarming.resonance = 500;
		cult.starMapTier = 5;
		cult.thunderPool.tier = 9;
		for (var li = 0; li < 28; li++){ cult.starObservatory.lit[li] = 1; }
		cult.sectArena.seat = 1;
		cult.heartTrib.stage = 6;
		var swB = cult.getSwordFormationEffect(31);
		var stB = cult.getStarArtifactCombatBonus(31, swB);
		var sxB = cult.getSectTribCombatBonus(31, stB);
		var bqB = cult.getBanquetCombatBonus(31, sxB);
		expect(swB.riftDmg + stB.riftDmg + sxB.riftDmg + bqB.riftDmg).toBeLessThanOrEqual(cult.XX14_DMG_CAP + 1e-12);
		expect(swB.riftCrit + stB.riftCrit + sxB.riftCrit + bqB.riftCrit).toBeLessThanOrEqual(cult.XX14_CRIT_CAP + 1e-12);
		expect(swB.riftHp + stB.riftHp + sxB.riftHp + bqB.riftHp).toBeLessThanOrEqual(cult.XX14_HP_CAP + 1e-12);
		expect(swB.mitigation + stB.mitigation + sxB.mitigation + bqB.mitigation).toBeLessThanOrEqual(cult.XX14_MIT_CAP + 1e-12);
		expect(bqB.poolDmg).toBeLessThanOrEqual(cult.XX14_DMG_CAP + 1e-12);
		var all = cult.getImmortalCaveBonuses(31);
		for (var bk in all){
			if (all.hasOwnProperty(bk)){ expect(isFinite(all[bk])).toBe(true); }
		}

		// Ferry boons: Essence output and Cultivation, outside the battle caps
		cult.netherFerry.yinde = 500;
		var caveNo = cult.getImmortalCaveBonuses(31);
		game.updateCaches();
		var xwNo = game.globalEffectsCached.xiuweiRatio || 0;
		cult.exchangeFerryBoon("lamp");
		cult.exchangeFerryBoon("lamp");
		cult.exchangeFerryBoon("banner");
		var caveYes = cult.getImmortalCaveBonuses(31);
		expect(caveYes.xianyuanRatio - caveNo.xianyuanRatio).toBeCloseTo(0.02, 12);
		expect(caveYes.riftDmgMult).toBe(caveNo.riftDmgMult);
		expect(caveYes.riftCritChance).toBe(caveNo.riftCritChance);
		expect(caveYes.riftHpMult).toBe(caveNo.riftHpMult);
		expect(caveYes.riftMitigation).toBe(caveNo.riftMitigation);
		game.updateCaches();
		expect((game.globalEffectsCached.xiuweiRatio || 0) - xwNo).toBeCloseTo(0.02, 9);

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
		cult.sectArena.seat = 9;
		cult.heartTrib.stage = 0;
		pb.seat = 0;
		pb.attended = 0;
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		pb.seat = 5;
		pb.attended = 1;
		cult.banquetTier = 5;
		var after = cult.getImmortalCaveBonuses(31);
		expect(cult.getBanquetCombatBonus(31).riftDmg).toBeGreaterThan(0);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);

		// Mortal life: nothing
		cult.immortalAscended = false;
		expect(cult.getBanquetCombatBonus(31).riftDmg).toBe(0);
		expect(cult.getBanquetRawEffect().dmg).toBe(0);
		expect(cult.getFerryBoonEffect().xianyuanRatio).toBe(0);
	});

	test("Rebirth: the banquetTier seal survives; banquet, merit and boons reset; the seal helps the next life", function(){
		var cult = game.cultivation;
		cult.setIdentity("董双成", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		grantSideMaterials(cult, 40);
		cult.thunderPool.tier = 1;
		giftAll(cult, ["relic", "starchart", "herb", "cinnabar"]);	// 31 + 9 = 40 -> Main Table
		expect(cult.attendBanquet(0.99).seat).toBe(3);
		expect(cult.banquetTier).toBe(3);
		cult.netherFerry.yinde = 200;
		cult.exchangeFerryBoon("lamp");

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.banquetTier).toBe(3);
		expect(rebirth.cultivation.peachBanquet).toBeUndefined();
		expect(rebirth.cultivation.netherFerry).toBeUndefined();

		// Seat taken this life but the stored tier lost: the soul still reads the peak
		cult.banquetTier = 0;
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.banquetTier).toBe(3);
		// Never seated: no seal
		cult.peachBanquet.peakSeat = 0;
		cult.peachBanquet.seat = 0;
		cult.peachBanquet.attended = 0;
		cult.banquetTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.banquetTier).toBeUndefined();

		cult.resetState();
		expect(cult.banquetTier).toBe(0);
		expect(cult.peachBanquet).toEqual(cult.makeDefaultPeachBanquet());
		expect(cult.netherFerry).toEqual(cult.makeDefaultNetherFerry());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.banquetTier).toBe(3);
		expect(cult.peachBanquet.attended).toBe(0);
		expect(cult.netherFerry.boons.lamp).toBe(0);
		var seal = cult.getBanquetSealBonus();
		expect(seal.tier).toBe(3);
		expect(seal.xiuweiRatio).toBeCloseTo(0.09, 9);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.giftBanquet("relic")).toBe(false);	// still mortal

		// Next ascension: cheaper gifts, +6 points, one more gift a week
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.banquetTier).toBe(3);
		expect(cult.getBanquetGiftReq("xianyuan").cost).toBe(68);
		expect(cult.getBanquetGiftReq("relic").cost).toBe(7);
		expect(cult.getBanquetGiftsMax()).toBe(7);
		expect(cult.giftBanquet("relic")).toBeTruthy();
		expect(cult.getBanquetScore().total).toBe(8 + 6);
		game.save();
		var rebirth3 = game._resetInternal();
		expect(rebirth3.cultivation.banquetTier).toBe(3);
	});

	test("Old saves (XX-16 era and earlier) and corrupted XX-17 fields load cleanly", function(){
		var cult = game.cultivation;
		cult.setIdentity("孟婆", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.peachBanquet;
		delete oldSave.cultivation.netherFerry;
		delete oldSave.cultivation.banquetTier;
		expect(oldSave.cultivation.sectArena).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.peachBanquet).toEqual(cult.makeDefaultPeachBanquet());
		expect(cult.netherFerry).toEqual(cult.makeDefaultNetherFerry());
		expect(cult.banquetTier).toBe(0);
		expect(function(){ cult.tickBanquetFerry(10); }).not.toThrow();
		expect(cult.peachBanquet.week).toBe(cult.getBanquetWeekIndex());
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(cult.giftBanquet("xianyuan")).toBeTruthy();
		expect(cult.ferrySouls(0)).toBeTruthy();

		// Save / load round trip keeps the state
		var rt = {};
		cult.save(rt);
		cult.resetState();
		cult.load(rt);
		expect(cult.peachBanquet.gifts.xianyuan).toBe(1);
		expect(cult.netherFerry.trips).toBe(1);

		// Mortal save without XX-17 fields
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.peachBanquet;
		delete mortalSave.cultivation.netherFerry;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.giftBanquet("xianyuan")).toBe(false);
		expect(function(){ cult.tickBanquetFerry(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.peachBanquet = {
			week: 2915.7, gifts: {xianyuan: 5, relic: 99, starchart: -3, herb: "x", cinnabar: 2, orbs: 1},
			attended: 1, seat: 77, peach: 9, peakSeat: 2, feasts: -4,
			log: [{week: 2914, seat: 3, peach: 1}, {week: 2913, seat: 9, peach: 1}, "x", null, {week: 1e12, seat: 2, peach: 0}, {week: 2912, seat: 1, peach: 7}],
			lastNote: 5
		};
		badSave.cultivation.netherFerry = {
			cooldown: 1e9, yinde: 12.7, totalYinde: 3, trips: 1, souls: [2, "y", 3], boons: {lamp: 99, banner: -1, ghost: 3}, teas: 2.2,
			log: [{w: 1, s: 2, y: 18}, {w: 4, s: 0, y: 3}, {w: 0, s: 3, y: 1}, {w: 3, s: 0, y: 2}], lastNote: "ok"
		};
		badSave.cultivation.banquetTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		var pb = cult.peachBanquet;
		expect(pb.week).toBe(2915);
		expect(pb.gifts).toEqual({xianyuan: 5, relic: 3, starchart: 0, herb: 0, cinnabar: 0, orbs: 0});
		expect(pb.attended).toBe(1);
		expect(pb.seat).toBe(5);
		expect(pb.peach).toBe(2);
		expect(pb.peakSeat).toBe(5);
		expect(pb.feasts).toBe(1);
		expect(pb.log).toEqual([{week: 2914, seat: 3, peach: 1}, {week: 2912, seat: 1, peach: 2}]);
		expect(pb.lastNote).toBe("");
		var nf = cult.netherFerry;
		expect(nf.cooldown).toBe(cult.FERRY_COOLDOWN);
		expect(nf.yinde).toBe(12);
		expect(nf.totalYinde).toBe(12);
		expect(nf.souls).toEqual([2, 0, 3]);
		expect(nf.trips).toBe(5);
		expect(nf.boons).toEqual({lamp: 5, banner: 0});
		expect(nf.teas).toBe(2);
		expect(nf.log).toEqual([{w: 1, s: 2, y: 18}, {w: 3, s: 0, y: 2}]);
		expect(nf.lastNote).toBe("ok");
		expect(cult.banquetTier).toBe(5);
		// Out-of-range week and broken shapes fall back to defaults
		badSave.cultivation.peachBanquet = {week: 1e12, gifts: {xianyuan: 3}, attended: 1, seat: 4};
		cult.resetState();
		cult.load(badSave);
		expect(cult.peachBanquet.week).toBe(null);
		expect(cult.peachBanquet.attended).toBe(0);
		expect(cult.getBanquetGiftsUsed()).toBe(0);
		badSave.cultivation.peachBanquet = "broken";
		badSave.cultivation.netherFerry = [1, 2];
		badSave.cultivation.banquetTier = "x";
		cult.resetState();
		cult.load(badSave);
		expect(cult.peachBanquet).toEqual(cult.makeDefaultPeachBanquet());
		expect(cult.netherFerry).toEqual(cult.makeDefaultNetherFerry());
		expect(cult.banquetTier).toBe(0);
		// Structure repaired lazily by the action entry points
		cult.peachBanquet = {week: "?"};
		cult.netherFerry = null;
		expect(function(){ cult.tickBanquetFerry(1); }).not.toThrow();
		expect(cult.peachBanquet.week).toBe(cult.getBanquetWeekIndex());
		expect(cult.netherFerry).toEqual(cult.makeDefaultNetherFerry());
	});

	test("Panel renders in the cultivation tab: gifts, score and seats, peach draw, river level, souls, merit exchange, merged caps; clicks via event delegation; ?v=89 art; zh/en without raw placeholders or Chinese in English", function(){
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
			if (el && el.addEventListener && evt === "onclick" && el.className && String(el.className).indexOf("xxBanquetArena") >= 0){
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
		var hanRe = /[一-鿿]/;

		try {
			var cult = game.cultivation;
			cult.setIdentity("七仙女", "f", "scholar");
			cult.prepareImmortalCaveForTest(true);
			grantImmortalResources(50000);
			grantSideMaterials(cult, 40);
			cult.thunderPool.tier = 1;
			cult.riftFloor = 35;
			cult.starObservatory.phase = 2100;	// Tortoise quarter: flood
			cult.banquetRandom = function(){ return 0; };
			var tab = game.cultivationTab;
			expect(tab instanceof classes.tab.CultivationTab).toBe(true);
			var host = document.createElement("div");
			document.body.appendChild(host);
			tab.render(host);
			tab.update();
			var el = host.querySelector(".xxBanquetArena");
			expect(el).not.toBe(null);
			expect(el.style.display).toBe("block");
			expect(el.querySelectorAll(".xxBanquetGift").length).toBe(6);
			expect(el.querySelectorAll("[data-xx-banquet=gift]").length).toBe(6);
			expect(el.querySelectorAll(".xxBanquetSeat").length).toBe(5);
			expect(el.querySelectorAll(".xxBanquetSeat.is-now").length).toBe(0);
			expect(el.querySelectorAll("[data-xx-banquet=attend]").length).toBe(0);
			expect(el.querySelectorAll(".xxBanquetPeachChip").length).toBe(3);
			expect(el.querySelectorAll(".xxFerryStep").length).toBe(4);
			expect(el.querySelector(".xxFerryStep.is-now.is-flood")).not.toBe(null);
			expect(el.querySelector(".xxFerryRiver.is-flood")).not.toBe(null);
			expect(el.querySelectorAll(".xxFerrySoul").length).toBe(3);
			expect(el.querySelectorAll(".xxFerryBoon").length).toBe(3);
			expect(el.querySelectorAll("[data-xx-ferry=go]").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-ferry=boon]").length).toBe(0);
			expect(el.querySelectorAll(".xxStarPool").length).toBe(4);
			expect(el.querySelectorAll(".xxStarPoolBar > i.is-banquet").length).toBe(4);
			var checkImgs = function(minCount, required){
				var imgs = el.querySelectorAll("img");
				expect(imgs.length).toBeGreaterThan(minCount);
				var seenArt = {};
				for (var i = 0; i < imgs.length; i++){
					expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
					expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(89);
					expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
					seenArt[imgs[i].getAttribute("src").split("?")[0]] = true;
				}
				required.forEach(function(n){
					expect(seenArt["res/art/" + n + ".webp"]).toBe(true);
				});
				// a reused icon never shows next to the art it was copied from
				["immortal_peach", "penglai_isle", "treasure_lot", "bounty_alliance_token", "realm_guixu_abyss", "dream_lotus_lamp", "dao_heart_seal", "six_paths_wheel"].forEach(function(n){
					expect(seenArt["res/art/" + n + ".webp"]).toBeUndefined();
				});
			};
			checkImgs(8, ["banquet_jade_pool", "banquet_peach", "banquet_gift", "banquet_seat", "nether_river", "ferry_soul_lamp", "yinde_seal", "ferry_soul"]);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).toContain("瑶池蟠桃仙宴");
			expect(el.textContent).toContain("九幽冥河摆渡");
			expect(el.textContent).toContain("玄武汛期");
			expect(el.textContent).toContain("往生灯");
			expect(cult.isBanquetEn()).toBe(false);

			var click = function(sel){
				var t = el.querySelector(sel);
				expect(t).not.toBe(null);
				t.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			};
			// Gifts through the panel
			click("[data-xx-banquet=gift][data-arg=relic]");
			expect(cult.peachBanquet.gifts.relic).toBe(1);
			click("[data-xx-banquet=gift][data-arg=herb]");
			expect(el.querySelectorAll(".xxBanquetGift.is-given").length).toBe(2);
			expect(el.querySelector(".xxBanquetSeat.is-now")).not.toBe(null);
			expect(el.querySelectorAll("[data-xx-banquet=attend]").length).toBe(1);
			// Feast through the panel (injected roll 0 -> 9,000-year peach)
			click("[data-xx-banquet=attend]");
			expect(cult.peachBanquet.attended).toBe(1);
			expect(cult.peachBanquet.peach).toBe(2);
			expect(el.querySelectorAll("[data-xx-banquet=gift]").length).toBe(0);
			expect(el.querySelectorAll("[data-xx-banquet=attend]").length).toBe(0);
			expect(el.querySelectorAll(".xxBanquetLog.is-p2").length).toBe(1);
			expect(el.querySelector(".xxBanquetPeachChip.is-got")).not.toBe(null);
			expect(el.querySelectorAll(".xxStarPool.is-on").length).toBeGreaterThan(0);
			expect(el.querySelector(".xxCaveImprintTag")).not.toBe(null);
			// Ferry through the panel: roll 0 -> kind soul, then cooling (disabled button does nothing)
			click("[data-xx-ferry=go]");
			expect(cult.netherFerry.trips).toBe(1);
			expect(el.querySelectorAll(".xxFerryLog").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-ferry=go]").length).toBe(0);
			var cooling = el.querySelector(".xxFerryGo .xxCaveMiniBtn.is-disabled");
			expect(cooling).not.toBe(null);
			cooling.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			expect(cult.netherFerry.trips).toBe(1);
			// Merit exchange through the panel
			cult.netherFerry.yinde = 100;
			tab._banquetSig = "";
			tab.update();
			expect(el.querySelectorAll("[data-xx-ferry=boon]").length).toBe(2);
			click("[data-xx-ferry=boon][data-arg=lamp]");
			expect(cult.netherFerry.boons.lamp).toBe(1);
			click("[data-xx-ferry=tea]");
			expect(cult.netherFerry.teas).toBe(1);
			expect(el.querySelector(".xxFerryBoonSum.is-active")).not.toBe(null);
			expect(el.innerHTML).not.toMatch(rawRe);

			// English pass over the same state (action notes are written in the language in use when they happen)
			useLang("en");
			cult.peachBanquet.lastNote = "";
			click("[data-xx-ferry=boon][data-arg=banner]");
			expect(cult.netherFerry.boons.banner).toBe(1);
			expect(cult.netherFerry.lastNote).toContain("Soul-Guiding Banner");
			tab._banquetSig = "";
			tab.update();
			expect(cult.isBanquetEn()).toBe(true);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).not.toMatch(hanRe);
			expect(el.textContent).toContain("Jade Pool Peach Banquet");
			expect(el.textContent).toContain("Nine Nether River Ferry");
			expect(el.textContent).toContain("Tortoise Flood");
			expect(el.textContent).toContain("Rebirth Lamp");
			expect(el.textContent).toContain("Rift damage");
			useLang("zh");

			// Mortal with a past-life seal: locked notice only
			cult.resetState();
			cult.banquetTier = 2;
			tab._banquetSig = "";
			tab.update();
			expect(el.style.display).toBe("block");
			expect(el.className).toContain("is-locked");
			expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
			expect(el.querySelector(".xxSamsaraLockLegacy")).not.toBe(null);
			expect(el.querySelectorAll(".xxBanquetGift").length).toBe(0);
			expect(el.innerHTML).not.toMatch(rawRe);
			useLang("en");
			tab._banquetSig = "";
			tab.update();
			expect(el.textContent).not.toMatch(hanRe);
			expect(el.innerHTML).not.toMatch(rawRe);
		} finally {
			global.dojo.connect = origConnect;
			global.$I = origI;
		}
	});

	test("XX-17 art assets exist (src + dist, 512x512 webp copies), dist mirrors source, zh/en i18n parity, help guide section, pure-ES5 runtime JS, rev & ART_VER 89; the logic leaves thunder pursuit alone", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(89);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(89);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var names = ["banquet_jade_pool", "banquet_peach", "banquet_gift", "banquet_seat", "nether_river", "ferry_soul_lamp", "yinde_seal", "ferry_soul"];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < names.length; i++){
			var rel = "res/art/" + names[i] + ".webp";
			var abs = path.join(root, rel);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			var buf = fs.readFileSync(abs);
			var head = buf.slice(0, 12).toString("latin1");
			expect(head.slice(0, 4)).toBe("RIFF");
			expect(head.slice(8, 12)).toBe("WEBP");
			expect(fs.existsSync(path.join(root, "dist", rel))).toBe(true);
			expect(fs.readFileSync(path.join(root, "dist", rel)).equals(buf)).toBe(true);
			expect(cultSrc).toContain("\"" + names[i] + "\"");
		}
		expect(cultSrc).not.toMatch(/\?v=88\b/);
		expect(cultSrc).not.toContain("ART_VER || \"88\"");
		var xx17Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalBanquetEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx17Ui.length).toBeGreaterThan(1000);
		expect(xx17Ui).not.toContain("<svg");
		expect(xx17Ui).not.toContain("<canvas");
		expect(xx17Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		var xx17Logic = cultSrc.slice(cultSrc.indexOf("XX-17 瑶池蟠桃仙宴与九幽冥河摆渡 ----"), cultSrc.indexOf("getImmortalCaveBonuses: function(riftFloorOpt){"));
		expect(xx17Logic.length).toBeGreaterThan(1000);
		expect(xx17Logic).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		// The merged cap reads the XX-14 constants after XX-16; nothing in XX-17 touches the thunder pursuit ratio
		expect(xx17Logic).toContain("this.XX14_DMG_CAP");
		expect(xx17Logic).toContain("this.XX14_MIT_CAP");
		expect(xx17Logic).toContain("this.getSectTribCombatBonus(");
		expect(xx17Logic).not.toContain("thunderStrikeRatio");
		expect(xx17Logic).not.toContain("getThunderStrikeRatio");
		// Gifts use the existing material stores; the river reads the XX-15 star cycle
		expect(xx17Logic).toContain("this.getWarmMaterialHave(");
		expect(xx17Logic).toContain("this.spendWarmMaterial(");
		expect(xx17Logic).toContain("this.getStarMansionIndex(");

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html", "build.version.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var gameSrc = fs.readFileSync(path.join(root, "game.js"), "utf8");
		expect(gameSrc).toContain("soulObj.banquetTier");
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxBanquetArena");
		expect(css).toContain(".xxBanquetGiftGrid");
		expect(css).toContain(".xxFerryTrack");
		expect(css).toContain(".xxFerrySoul");
		expect(css).toContain(".xxStarPoolBar > i.is-banquet");
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxBanquetAttend/);
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxBanquetGiftGrid/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.banquet.", "cultivation.ferry."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(100);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(en[zhKeys[pk]]).not.toMatch(/"/);
			expect(en[zhKeys[pk]]).not.toMatch(/[一-鿿]/);
			[zh[zhKeys[pk]], en[zhKeys[pk]]].forEach(function(v){
				var seenPh = {};
				(String(v).match(/\{\d\}/g) || []).forEach(function(ph){
					expect(seenPh[ph]).toBeUndefined();
					seenPh[ph] = true;
				});
			});
		}
		expect(en["cultivation.banquet.panel.badge"].indexOf("Immortal")).toBe(0);
		// One-line panel intro; the full rules live in the guide (修行指南) immortal section
		expect(zh["cultivation.banquet.panel.desc"].length).toBeLessThanOrEqual(40);
		var cult = game.cultivation;
		var immSec = cult.HELP_SECTIONS.filter(function(s){ return s.name === "immortal"; })[0];
		expect(immSec.b).toBeGreaterThanOrEqual(14);
		expect(zh["help.s.immortal.b14"]).toContain("瑶池蟠桃仙宴");
		expect(en["help.s.immortal.b14"]).toContain("Jade Pool Peach Banquet");
		expect(en["help.s.immortal.b14"]).not.toMatch(/[一-鿿]/);
		var need = [];
		cult.BANQUET_SEATS.forEach(function(s){ need.push("cultivation.banquet.seat." + s.key); });
		cult.BANQUET_PEACHES.forEach(function(p){ need.push("cultivation.banquet.peach." + p.key); });
		cult.BANQUET_GIFTS.forEach(function(g){ need.push("cultivation.warming.mat." + g.key + ".label"); });
		cult.FERRY_WATERS.forEach(function(w){ need.push("cultivation.ferry.water." + w.key + ".label", "cultivation.ferry.water." + w.key + ".short", "cultivation.ferry.water." + w.key + ".desc"); });
		cult.FERRY_SOULS.forEach(function(s){ need.push("cultivation.ferry.soul." + s.key + ".label"); });
		cult.FERRY_BOONS.forEach(function(b){ need.push("cultivation.ferry.boon." + b.key + ".label", "cultivation.ferry.boon." + b.key + ".desc"); });
		["xianyuan", "relic", "starchart", "orbs"].forEach(function(r){ need.push("cultivation.sectarena.reward." + r); });
		["dmg", "crit", "hp", "mit"].forEach(function(c){ need.push("cultivation.starobs.pool." + c); });
		for (var n = 0; n < need.length; n++){
			expect(zh[need[n]]).toBeTruthy();
			expect(en[need[n]]).toBeTruthy();
		}
		// Every river level maps to a real star quarter; every gift is a material the warming system knows
		var syms = cult.STAR_SYMBOLS.map(function(s){ return s.key; });
		cult.FERRY_WATERS.forEach(function(w){ expect(syms).toContain(w.sym); });
		cult.BANQUET_GIFTS.forEach(function(g){ expect(cult.getWarmMaterialDef(g.key)).toBeTruthy(); });

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
