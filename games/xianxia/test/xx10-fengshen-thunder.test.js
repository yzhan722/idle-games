/* global test, expect, game, describe, beforeEach, afterEach, jest, classes, useRealI18n, restoreI18n */

var fs = require("fs");
var path = require("path");
var acorn = require("acorn");

function grantImmortalResources(amount){
	var names = ["xianyuan", "relic", "starchart", "timeCrystal", "unobtainium"];
	for (var i = 0; i < names.length; i++){
		var r = game.resPool.get(names[i]);
		r.unlocked = true;
		r.value = amount;
	}
}

function giveMerit(cult, amount){
	cult.fengshenRoster.merit = amount;
	cult.syncDivineMerit();
}

function giveOrbs(cult, amount){
	cult.thunderPool.thunderOrbs = amount;
	cult.syncThunderOrbs();
}

function climbTo(cult, layer){
	while (cult.fengshenRoster.layer < layer){
		expect(cult.ascendFengshenHeaven()).toBe(true);
	}
}

describe("XX-10 Roster of the Thirty-Three Heavens & Nine-Heaven Thunder Pool Tempering", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		jest.restoreAllMocks();
		restoreI18n();
	});

	test("Divine Merit flows in from 26F+ Rift wins (interactive & quick), Zixiao lectures and Chrono River traces", function(){
		useRealI18n("zh");	// battle logs go through $I; assert the zh wording
		var cult = game.cultivation;
		cult.setIdentity("杨天佑", "m", "scholar");

		// Locked before Immortal Ascension
		expect(cult.ascendFengshenHeaven()).toBe(false);
		expect(cult.summonNineHeavenThunder()).toBe(false);
		expect(cult.temperThunderBody(0)).toBe(false);
		expect(cult.gainFengshenMerit(50, "rift")).toBe(0);
		expect(cult.onFengshenRiftVictory(30)).toBe(null);
		expect(cult.getFengshenSermonMult()).toBe(1);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.daoyun = 2;
		cult.zixiaoAltar.daoSutras = 300;
		cult.syncDaoSutras();

		// Fresh defaults after ascension
		expect(cult.fengshenRoster).toEqual(cult.makeDefaultFengshenRoster());
		expect(cult.thunderPool).toEqual(cult.makeDefaultThunderPool());
		expect(cult.divineMerit).toBe(0);
		expect(cult.thunderOrbs).toBe(0);
		expect(cult.thunderTemperTier).toBe(0);
		expect(cult.getFengshenAscendReq().meritOk).toBe(false);
		expect(cult.ascendFengshenHeaven()).toBe(false);

		// Rift merit scales with depth 26F → 35F, capped at 35F, nothing below 26F
		expect(cult.getFengshenRiftMerit(25)).toBe(0);
		expect(cult.getFengshenRiftMerit(26)).toBe(24);
		expect(cult.getFengshenRiftMerit(30)).toBe(48);
		expect(cult.getFengshenRiftMerit(35)).toBe(78);
		expect(cult.getFengshenRiftMerit(44)).toBe(78);
		expect(cult.getThunderRiftOrbs(25)).toBe(0);
		expect(cult.getThunderRiftOrbs(35)).toBe(7);
		expect(cult.onFengshenRiftVictory(25)).toBe(null);

		// Interactive greater-rift battle won on 27F
		cult.riftFloor = 26;
		var expect27 = cult.getFengshenRiftMerit(27);
		var expectOrbs27 = cult.getThunderRiftOrbs(27);
		jest.spyOn(Math, "random").mockReturnValue(0.99);
		expect(cult.startRiftBattle("greater", true, 100)).toBe(true);
		var b = cult.battle;
		expect(b.floor).toBe(27);
		b.enemy.hp = 1;
		b.enemy.shield = 0;
		b.enemy.def = 0;
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.result).toBe("win");
		expect(cult.riftFloor).toBe(27);
		expect(cult.fengshenRoster.merit).toBe(expect27);
		expect(cult.fengshenRoster.meritFromRift).toBe(expect27);
		expect(cult.fengshenRoster.riftWins).toBe(1);
		expect(cult.thunderPool.thunderOrbs).toBe(expectOrbs27);
		expect(cult.thunderOrbs).toBe(expectOrbs27);
		expect(b.logs[0]).toContain("神位功德 +" + expect27);
		expect(cult.fengshenRoster.lastNote).toContain("封神记功");

		// Quick greater rift on 28F (first roll = win, later rolls miss the artifact table)
		Math.random.mockReset();
		Math.random.mockReturnValueOnce(0).mockReturnValue(0.99);
		cult.actionCd = 0;
		cult.secluded = false;
		cult.riftKeys = 1;
		var expect28 = cult.getFengshenRiftMerit(28);
		expect(cult.greaterRift()).toBe(true);
		expect(cult.riftFloor).toBe(28);
		expect(cult.fengshenRoster.meritFromRift).toBe(expect27 + expect28);
		expect(cult.fengshenRoster.riftWins).toBe(2);

		// Sweeping an already-cleared floor is repeatable and counts half
		Math.random.mockReset();
		Math.random.mockReturnValue(0.99);
		cult.actionCd = 0;
		cult.riftKeys = 1;
		var sweepMerit = cult.getFengshenRiftMerit(28, true);
		expect(sweepMerit).toBe(18);
		expect(cult.getThunderRiftOrbs(28, true)).toBeLessThan(cult.getThunderRiftOrbs(28));
		expect(cult.sweepRift()).toBe(true);
		expect(cult.riftFloor).toBe(28);
		expect(cult.fengshenRoster.meritFromRift).toBe(expect27 + expect28 + sweepMerit);
		expect(cult.fengshenRoster.riftWins).toBe(3);
		expect(cult.fengshenRoster.lastNote).toContain("清剿");
		jest.restoreAllMocks();

		// XX-8 Zixiao lectures convert Jade Sutra output into merit (active > passive)
		expect(cult.upgradeZixiaoAltar()).toBe(true);
		var lec = cult.getDaoLecturePreview("hongmeng");
		cult.starship.hongmengQi = 50;
		var sermonBefore = cult.fengshenRoster.meritFromSermon;
		expect(cult.holdDaoLecture("hongmeng")).toBe(true);
		var activeSermonMerit = cult.getFengshenSermonMerit(lec.sutraGain, true);
		expect(activeSermonMerit).toBeGreaterThanOrEqual(3);
		expect(cult.fengshenRoster.meritFromSermon).toBe(sermonBefore + activeSermonMerit);
		var passive = cult.completePassiveZixiaoSermon();
		expect(cult.fengshenRoster.meritFromSermon).toBe(sermonBefore + activeSermonMerit + cult.getFengshenSermonMerit(passive.sutraGain, false));
		expect(cult.getFengshenSermonMerit(10, true)).toBeGreaterThan(cult.getFengshenSermonMerit(10, false));

		// XX-9 Chrono River traces convert Era Insight into merit
		expect(cult.upgradeChronoAltar()).toBe(true);
		var tr = cult.getChronoTracePreview("shanghuang");
		var chronoBefore = cult.fengshenRoster.meritFromChrono;
		expect(cult.traceChronoEra("shanghuang")).toBe(true);
		expect(cult.fengshenRoster.meritFromChrono).toBe(chronoBefore + cult.getFengshenChronoMerit(tr.insightGain, true));
		var chronoMid = cult.fengshenRoster.meritFromChrono;
		cult.completePassiveChronoTrace();
		expect(cult.fengshenRoster.meritFromChrono).toBeGreaterThan(chronoMid);

		// Totals stay consistent; the mirror follows the spendable balance
		var fr = cult.fengshenRoster;
		expect(fr.totalMerit).toBe(fr.meritFromRift + fr.meritFromSermon + fr.meritFromChrono);
		expect(fr.merit).toBe(fr.totalMerit);
		expect(cult.divineMerit).toBe(fr.merit);
	});

	test("33 heavens in 7 domains: merit + Essence costs, Rift/Dao gates, office ranks and their passives", function(){
		var cult = game.cultivation;
		cult.setIdentity("哪吒", "m", "hunter");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.daoyun = 0;
		cult.riftFloor = 27;

		// Domains partition 1..33 without gaps
		var covered = 0;
		for (var d = 0; d < cult.FENGSHEN_DOMAINS.length; d++){
			var dom = cult.FENGSHEN_DOMAINS[d];
			expect(dom.from).toBe(covered + 1);
			covered = dom.to;
		}
		expect(covered).toBe(33);
		expect(cult.FENGSHEN_DOMAINS.length).toBe(7);

		game.updateCaches();
		game.calculateAllEffects();
		var baseBns = cult.getImmortalCaveBonuses(30);
		var baseCp = cult.getCombatPower();
		var baseGarden = cult.getGardenGrowthRate();
		var baseXyRate = game.calcResourcePerTick("xianyuan");

		// Heaven 1: 18 merit + 11 Essence, grants the Sky-Patrol Marshal office
		giveMerit(cult, 100000);
		var req1 = cult.getFengshenAscendReq();
		expect(req1.nextLayer).toBe(1);
		expect(req1.merit).toBe(18);
		expect(req1.xianyuan).toBe(11);
		expect(req1.newOffice).toBe(true);
		var xyBefore = game.resPool.get("xianyuan").value;
		expect(cult.ascendFengshenHeaven()).toBe(true);
		expect(cult.fengshenRoster.merit).toBe(100000 - 18);
		expect(game.resPool.get("xianyuan").value).toBe(xyBefore - 11);
		expect(cult.getFengshenOfficeRank("patrol")).toBe(1);
		expect(cult.getFengshenOfficeCount()).toBe(1);
		expect(cult.fengshenRoster.lastNote).toContain("封神授箓");
		expect(cult.fengshenRoster.lastNote).toContain("cultivation.fengshen.office.patrol.label");

		// Costs rise with height
		var req2 = cult.getFengshenAscendReq();
		expect(req2.merit).toBeGreaterThan(req1.merit);
		expect(req2.newOffice).toBe(false);

		// Desire heavens need no Dao Resonance; the Brahma-Aide domain (7) needs Dao 1 and Rift 27F
		climbTo(cult, 6);
		expect(cult.getFengshenOfficeRank("patrol")).toBe(6);
		var gated = cult.getFengshenAscendReq();
		expect(gated.nextLayer).toBe(7);
		expect(gated.lawOk).toBe(false);
		expect(gated.affordable).toBe(false);
		expect(cult.ascendFengshenHeaven()).toBe(false);
		cult.daoyun = 1;
		expect(cult.ascendFengshenHeaven()).toBe(true);
		expect(cult.getFengshenOfficeRank("herbal")).toBe(1);
		expect(cult.getFengshenOfficeCount()).toBe(2);

		// Radiant-Sound domain (13) needs Rift 28F
		climbTo(cult, 12);
		var riftGate = cult.getFengshenAscendReq();
		expect(riftGate.riftOk).toBe(false);
		expect(cult.ascendFengshenHeaven()).toBe(false);
		cult.riftFloor = 35;
		cult.daoyun = 3;
		climbTo(cult, 33);
		expect(cult.ascendFengshenHeaven()).toBe(false);
		expect(cult.getFengshenAscendReq()).toBe(null);
		expect(cult.getFengshenOfficeCount()).toBe(7);
		expect(cult.getFengshenOfficeRank("dipper")).toBe(6);
		expect(cult.getFengshenOfficeRank("wenchang")).toBe(4);
		expect(cult.getFengshenOfficeRank("thunderLord")).toBe(4);
		expect(cult.getFengshenOfficeRank("daluo")).toBe(1);
		expect(cult.getFengshenDomainForLayer(33).key).toBe("daluo");

		// Total ascent cost across 33 heavens stays sane (~9.4k merit)
		var spent = 100000 - cult.fengshenRoster.merit;
		expect(spent).toBeGreaterThan(8000);
		expect(spent).toBeLessThan(11000);

		// Office passives: production, garden, combat, guard, sermon, merit
		expect(cult.getFengshenMeritMult()).toBeCloseTo(1.30, 6);
		expect(cult.getFengshenSermonMult()).toBeCloseTo(1.32, 6);
		game.updateCaches();
		game.calculateAllEffects();
		var bns = cult.getImmortalCaveBonuses(30);
		expect(bns.xianyuanRatio).toBeGreaterThan(baseBns.xianyuanRatio + 0.6);
		expect(bns.herbSpeedBonus).toBeGreaterThan(baseBns.herbSpeedBonus + 0.4);
		expect(bns.riftHpMult).toBeGreaterThan(baseBns.riftHpMult * 1.29);
		expect(bns.riftMitigation).toBeGreaterThan(baseBns.riftMitigation);
		expect(bns.startShieldRatio).toBeGreaterThan(baseBns.startShieldRatio + 0.17);
		expect(bns.combatMult).toBeGreaterThan(baseBns.combatMult * 2.2);
		expect(cult.getCombatPower()).toBeGreaterThan(baseCp * 2.2);
		expect(cult.getGardenGrowthRate()).toBeGreaterThan(baseGarden + 0.4);
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(baseXyRate * 1.3);

		// Wenchang Sermon Master boosts XX-8 Zixiao output
		expect(cult.upgradeZixiaoAltar()).toBe(true);
		var boosted = cult.getDaoLecturePreview("hongmeng");
		var wc = cult.fengshenRoster.layer;
		cult.fengshenRoster.layer = 24;
		var plain = cult.getDaoLecturePreview("hongmeng");
		cult.fengshenRoster.layer = wc;
		expect(boosted.sutraGain).toBeGreaterThan(plain.sutraGain);
		expect(boosted.compGain).toBeGreaterThan(plain.compGain);
	});

	test("Thunder Pool: summon / passive / rift Essence, deterministic temper risk with Thunder-Vein pity, heaven gating, tiers 0~9", function(){
		var cult = game.cultivation;
		cult.setIdentity("闻仲", "m", "trader");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;
		cult.daoyun = 3;
		cult.heartDemon = 0;

		// Summon thunder: Essence + Time Crystal → Thunder Essence
		var sum = cult.getThunderSummonPreview();
		expect(sum.xianyuan).toBe(16);
		expect(sum.timeCrystal).toBe(5);
		expect(sum.orbGain).toBe(3);
		var tcBefore = game.resPool.get("timeCrystal").value;
		expect(cult.summonNineHeavenThunder()).toBe(true);
		expect(cult.thunderPool.thunderOrbs).toBe(3);
		expect(cult.thunderPool.summonCount).toBe(1);
		expect(game.resPool.get("timeCrystal").value).toBe(tcBefore - 5);

		// Passive pool charge condenses Essence; the toggle seals the pool
		var orbsBefore = cult.thunderPool.thunderOrbs;
		cult.tickThunderPool(200);
		expect(cult.thunderPool.passiveCount).toBeGreaterThanOrEqual(1);
		expect(cult.thunderPool.thunderOrbs).toBeGreaterThan(orbsBefore);
		expect(cult.thunderPool.charge).toBeLessThan(100);
		expect(cult.toggleThunderAutoCondense()).toBe(false);
		var sealedOrbs = cult.thunderPool.thunderOrbs;
		var sealedCharge = cult.thunderPool.charge;
		cult.tickThunderPool(500);
		expect(cult.thunderPool.thunderOrbs).toBe(sealedOrbs);
		expect(cult.thunderPool.charge).toBe(sealedCharge);
		expect(cult.toggleThunderAutoCondense()).toBe(true);

		// Tier 1 is a sure thing (100%) and needs no heaven
		giveOrbs(cult, 1000);
		var t1 = cult.getThunderTemperReq();
		expect(t1.nextTier).toBe(1);
		expect(t1.chance).toBe(1);
		expect(t1.reqLayer).toBe(0);
		expect(t1.thunderOrbs).toBe(18);
		expect(cult.temperThunderBody(0.999)).toBe(true);
		expect(cult.thunderPool.tier).toBe(1);
		expect(cult.thunderTemperTier).toBe(1);
		expect(cult.thunderPool.thunderOrbs).toBe(1000 - 18);

		// Tier 2 needs Heaven 3
		var t2 = cult.getThunderTemperReq();
		expect(t2.reqLayer).toBe(3);
		expect(t2.layerOk).toBe(false);
		expect(cult.temperThunderBody(0)).toBe(false);
		giveMerit(cult, 100000);
		climbTo(cult, 3);
		t2 = cult.getThunderTemperReq();
		expect(t2.layerOk).toBe(true);
		expect(t2.chance).toBeCloseTo(0.92, 6);

		// A failed roll: half the Essence is lost, Thunder Veins +1, heart demon stirs, tier unchanged
		var orbsPreFail = cult.thunderPool.thunderOrbs;
		var xyPreFail = game.resPool.get("xianyuan").value;
		expect(cult.temperThunderBody(0.95)).toBe(true);
		expect(cult.thunderPool.tier).toBe(1);
		expect(cult.thunderPool.failStacks).toBe(1);
		expect(cult.thunderPool.failures).toBe(1);
		expect(cult.thunderPool.attempts).toBe(2);
		expect(cult.thunderPool.thunderOrbs).toBe(orbsPreFail - t2.failOrbLoss);
		expect(t2.failOrbLoss).toBe(Math.ceil(t2.thunderOrbs * 0.5));
		expect(game.resPool.get("xianyuan").value).toBe(xyPreFail - t2.xianyuan);
		expect(cult.heartDemon).toBe(2);
		expect(cult.thunderPool.lastNote).toContain("淬体受挫");

		// Pity: 92% + 10% → 100%; the same roll now succeeds and resets the veins
		expect(cult.getThunderTemperReq().chance).toBe(1);
		expect(cult.temperThunderBody(0.95)).toBe(true);
		expect(cult.thunderPool.tier).toBe(2);
		expect(cult.thunderPool.failStacks).toBe(0);
		expect(cult.thunderPool.lastNote).toContain("雷池淬体");

		// Climb with guaranteed rolls; each tier is gated by heaven (n-1)*3
		while (cult.thunderPool.tier < 9){
			var reqT = cult.getThunderTemperReq();
			climbTo(cult, reqT.reqLayer);
			giveOrbs(cult, 1000);
			expect(cult.temperThunderBody(0)).toBe(true);
		}
		expect(cult.thunderPool.tier).toBe(9);
		expect(cult.thunderTemperTier).toBe(9);
		expect(cult.getThunderTemperReq()).toBe(null);
		expect(cult.temperThunderBody(0)).toBe(false);
		expect(cult.fengshenRoster.layer).toBe(24);

		// Pity caps at 5 Thunder Veins (base 42% at Tier 9 → at most 92% before offices)
		cult.thunderPool.failStacks = 99;
		cult.thunderPool = cult.normalizeThunderPool(cult.thunderPool);
		expect(cult.thunderPool.failStacks).toBe(5);
		expect(cult.getThunderTemperChance(9)).toBeLessThanOrEqual(1);

		// Tempering costs and chance grow / fall with the tier
		var c3 = cult.getThunderTierDef(3).chance;
		var c9 = cult.getThunderTierDef(9).chance;
		expect(c9).toBeLessThan(c3);

		// Tier effects: survivability & damage in 26F~35F
		var eff9 = cult.getThunderTemperEffect(9);
		expect(eff9.combatMult).toBeCloseTo(1.45, 6);
		expect(eff9.riftHpMult).toBeCloseTo(1.54, 6);
		expect(eff9.strike).toBeCloseTo(0.45, 6);
		var low = cult.getImmortalCaveBonuses(0);
		var high = cult.getImmortalCaveBonuses(30);
		expect(low.thunderStrikeRatio).toBe(0);
		expect(high.thunderStrikeRatio).toBeCloseTo(0.45, 6);	// no Thunder Court office yet (heaven 24)
		expect(high.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(high.riftDmgMult).toBeGreaterThan(low.riftDmgMult);

		// Thunder Court Lord (heavens 29-32) adds temper chance, Essence gain and strike
		climbTo(cult, 32);
		expect(cult.getFengshenOfficeRank("thunderLord")).toBe(4);
		expect(cult.getThunderOrbMult()).toBeCloseTo(1 + 0.48 + 9 * 0.05, 6);
		expect(cult.getImmortalCaveBonuses(30).thunderStrikeRatio).toBeCloseTo(0.45 + 0.08, 6);
	});

	test("Synergy with XX-9 Innate Treasures: Pangu thunder cleave, Chaos Bell thunder shock, Resonance III strike ×1.5 — 26F~35F only", function(){
		useRealI18n("zh");	// battle logs go through $I; assert the zh wording
		var cult = game.cultivation;
		cult.setIdentity("雷震子", "m", "orphan");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.thunderPool.tier = 5;
		cult.syncThunderTemperTier();

		var syn0 = cult.getThunderSynergy();
		expect(syn0.panguActive).toBe(false);
		expect(syn0.bellActive).toBe(false);
		expect(syn0.unityActive).toBe(false);
		var h0 = cult.getImmortalCaveBonuses(31);
		expect(h0.thunderStrikeRatio).toBeCloseTo(0.25, 6);
		expect(h0.panguCleaveRatio).toBe(0);
		expect(h0.thunderBellShockRatio).toBe(0);

		// Pangu Banner resonant (Lv.3) → Thunder Cleave
		cult.innateTreasures.levels.panguBanner = 3;
		var h1 = cult.getImmortalCaveBonuses(31);
		expect(cult.getThunderSynergy().panguActive).toBe(true);
		expect(h1.panguCleaveRatio).toBeCloseTo(0.075 + 0.04, 6);

		// Pangu Banner below resonance → no bonus
		cult.innateTreasures.levels.panguBanner = 2;
		expect(cult.getImmortalCaveBonuses(31).panguCleaveRatio).toBeCloseTo(0.05, 6);

		// Chaos Bell resonant (Lv.3) → Bell-Called Thunder on sealed turns
		cult.innateTreasures.levels.panguBanner = 3;
		cult.innateTreasures.levels.chaosBell = 3;
		var h2 = cult.getImmortalCaveBonuses(31);
		expect(cult.getThunderSynergy().bellActive).toBe(true);
		expect(h2.chronoBellFreezeEvery).toBe(3);
		expect(h2.thunderBellShockRatio).toBeCloseTo(0.02, 6);

		// Four Treasures United (Resonance III) → thunder strike ×1.5
		cult.innateTreasures.levels.taijiDiagram = 3;
		cult.innateTreasures.levels.creationDisc = 3;
		expect(cult.getInnateResonanceTier()).toBe(3);
		var h3 = cult.getImmortalCaveBonuses(31);
		expect(cult.getThunderSynergy().unityActive).toBe(true);
		expect(h3.thunderStrikeRatio).toBeCloseTo(0.375, 6);
		expect(h3.chronoBellFreezeEvery).toBe(2);

		// Floors below 26F get none of it; thunder tier 0 gets none of it
		var low = cult.getImmortalCaveBonuses(25);
		expect(low.thunderStrikeRatio).toBe(0);
		expect(low.thunderBellShockRatio).toBe(0);
		expect(low.panguCleaveRatio).toBe(0);
		cult.thunderPool.tier = 0;
		expect(cult.getThunderSynergy().panguActive).toBe(false);
		expect(cult.getImmortalCaveBonuses(31).thunderStrikeRatio).toBe(0);
		expect(cult.getImmortalCaveBonuses(31).panguCleaveRatio).toBeCloseTo(0.075, 6);
		cult.thunderPool.tier = 5;

		// Live battle on 31F
		jest.spyOn(Math, "random").mockReturnValue(0.99);
		cult.riftFloor = 30;
		expect(cult.startRiftBattle("greater", true, 100)).toBe(true);
		var b = cult.battle;
		expect(b.floor).toBe(31);
		b.enemy.maxHp = 1e14;
		b.enemy.hp = 1e14;
		b.enemy.def = 0;
		b.enemy.shield = 0;
		b.enemy.atk = Math.max(50, Math.round(b.player.maxHp * 0.02));
		b.enemy.pattern = ["strike", "strike", "strike", "strike"];
		b.enemy.intentIdx = 0;
		b.enemy.intent = "strike";

		// Turn 1: Pangu thunder cleave + nine-heaven thunder strike
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.logs[0]).toContain("盘古幡·开天");
		expect(b.logs[0]).toContain("九霄神雷");
		expect(b.lastEvent.pDmgDealt).toBeGreaterThanOrEqual(1e14 * 0.115 - 1);

		// Turn 2: the bell seals the boss and calls down thunder (2% max HP)
		var hpBeforeShock = b.enemy.hp;
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.logs[0]).toContain("混沌钟·镇压时空");
		expect(b.logs[0]).toContain("钟鸣引雷");
		expect(hpBeforeShock - b.enemy.hp).toBeGreaterThanOrEqual(1e14 * 0.02 - 1);
		expect(b.lastEvent.eDmgDealt).toBe(0);

		// Guard turn: no thunder strike
		expect(cult.executeBattleTurn("guard")).toBe(true);
		expect(b.logs[0]).not.toContain("九霄神雷");
	});

	test("thunderTemperTier (Thunder-Vein Bone) survives rebirth: seal, imprint gain, discounts, starting Essence, mortal bonuses; roster resets", function(){
		var cult = game.cultivation;
		cult.setIdentity("黄天化", "m", "farmer");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;
		cult.daoyun = 3;
		giveMerit(cult, 100000);
		while (cult.thunderPool.tier < 6){
			var r = cult.getThunderTemperReq();
			climbTo(cult, r.reqLayer);
			giveOrbs(cult, 1000);
			expect(cult.temperThunderBody(0)).toBe(true);
		}
		climbTo(cult, 18);
		expect(cult.thunderTemperTier).toBe(6);

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.thunderTemperTier).toBe(6);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);
		expect(rebirth.cultivation.fengshenRoster).toBeUndefined();
		expect(rebirth.cultivation.thunderPool).toBeUndefined();

		cult.resetState();
		expect(cult.thunderTemperTier).toBe(0);
		expect(cult.thunderPool.tier).toBe(0);
		expect(cult.fengshenRoster.layer).toBe(0);
		expect(cult.getThunderBoneCostMult()).toBe(1);
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");
		var freshCp = cult.getCombatPower();
		var freshChance = cult.getThunderTemperChance(5);

		cult.load(rebirth);
		expect(cult.thunderTemperTier).toBe(6);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.thunderPool.tier).toBe(0);
		expect(cult.fengshenRoster.layer).toBe(0);
		expect(cult.fengshenRoster.merit).toBe(0);
		expect(cult.thunderPool.thunderOrbs).toBe(30);
		expect(cult.thunderOrbs).toBe(30);
		expect(cult.getThunderBoneCostMult()).toBeLessThan(1);
		expect(cult.getThunderBoneCostMult()).toBeGreaterThanOrEqual(0.55);
		expect(cult.getFengshenCostMult()).toBeLessThan(1);
		expect(cult.getThunderBoneBonus().tier).toBe(6);
		expect(cult.getThunderTemperChance(5)).toBeCloseTo(freshChance + 0.18, 6);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.getCombatPower()).toBeGreaterThan(freshCp);

		// The next ascension keeps the seeded Essence instead of resetting it
		cult.prepareImmortalCaveForTest(true);
		expect(cult.thunderPool.thunderOrbs).toBe(30);

		// The seal persists through another life (max of the previous seal)
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.thunderTemperTier).toBe(6);
	});

	test("Old saves (XX-9 era and earlier) and corrupted XX-10 fields load cleanly; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("姜子牙", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.daoyun = 3;

		// XX-9-era save: no XX-10 fields at all
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.fengshenRoster;
		delete oldSave.cultivation.thunderPool;
		delete oldSave.cultivation.thunderTemperTier;
		expect(oldSave.cultivation.chronoAltar).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.fengshenRoster).toEqual(cult.makeDefaultFengshenRoster());
		expect(cult.thunderPool).toEqual(cult.makeDefaultThunderPool());
		expect(cult.thunderTemperTier).toBe(0);
		expect(cult.divineMerit).toBe(0);
		expect(cult.thunderOrbs).toBe(0);
		expect(cult.getFengshenSermonMult()).toBe(1);
		expect(function(){ cult.tickThunderPool(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){
				expect(isFinite(bns[bk])).toBe(true);
			}
		}
		expect(bns.thunderStrikeRatio).toBe(0);
		expect(bns.thunderBellShockRatio).toBe(0);
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);

		// Ancient save (pre XX-8 / XX-9 / XX-10)
		var ancientSave = {};
		cult.save(ancientSave);
		["zixiaoAltar", "dharmaIdols", "dharmaImprintTier", "chronoAltar", "innateTreasures", "chronoImprintTier", "fengshenRoster", "thunderPool", "thunderTemperTier"].forEach(function(k){
			delete ancientSave.cultivation[k];
		});
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.fengshenRoster.layer).toBe(0);
		expect(cult.thunderPool.tier).toBe(0);
		expect(cult.getThunderSynergy().panguActive).toBe(false);

		// Pre-ascension (mortal) save
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.fengshenRoster;
		delete mortalSave.cultivation.thunderPool;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.ascendFengshenHeaven()).toBe(false);
		expect(function(){ cult.tickThunderPool(10); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.fengshenRoster = {layer: 99, merit: -4, totalMerit: "lots", meritFromRift: 30.7, meritFromSermon: NaN, meritFromChrono: 5, riftWins: -2, lastNote: 7};
		badSave.cultivation.thunderPool = {tier: 42, thunderOrbs: "x", totalOrbsGathered: -1, charge: 1e9, autoCondense: "yes", attempts: 3, failures: 9, failStacks: 77, summonCount: -1, lastNote: null};
		badSave.cultivation.thunderTemperTier = 77;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		expect(cult.fengshenRoster.layer).toBe(33);
		expect(cult.fengshenRoster.merit).toBe(0);
		expect(cult.fengshenRoster.meritFromRift).toBe(30);
		expect(cult.fengshenRoster.meritFromSermon).toBe(0);
		expect(cult.fengshenRoster.totalMerit).toBe(35);
		expect(cult.fengshenRoster.riftWins).toBe(0);
		expect(cult.fengshenRoster.lastNote).toBe("");
		expect(cult.thunderPool.tier).toBe(9);
		expect(cult.thunderPool.thunderOrbs).toBe(0);
		expect(cult.thunderPool.charge).toBe(100);
		expect(cult.thunderPool.autoCondense).toBe(true);
		expect(cult.thunderPool.failures).toBe(3);
		expect(cult.thunderPool.failStacks).toBe(5);
		expect(cult.thunderPool.summonCount).toBe(0);
		expect(cult.thunderTemperTier).toBe(9);
		expect(cult.getFengshenOfficeCount()).toBe(7);
		expect(function(){ cult.tickThunderPool(5); }).not.toThrow();
		expect(cult.thunderPool.charge).toBeLessThan(100);

		// Roundtrip: progress → save → JSON → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.daoyun = 3;
		giveMerit(cult, 500);
		climbTo(cult, 4);
		expect(cult.summonNineHeavenThunder()).toBe(true);
		giveOrbs(cult, 60);
		expect(cult.temperThunderBody(0)).toBe(true);
		expect(cult.temperThunderBody(0.999)).toBe(true);	// fails at 92%
		cult.tickThunderPool(37);
		var snapRoster = JSON.parse(JSON.stringify(cult.fengshenRoster));
		var snapPool = JSON.parse(JSON.stringify(cult.thunderPool));
		var snapSeal = cult.thunderTemperTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.fengshenRoster).toEqual(snapRoster);
		expect(cult.thunderPool).toEqual(snapPool);
		expect(cult.thunderTemperTier).toBe(snapSeal);
		expect(cult.divineMerit).toBe(snapRoster.merit);
		expect(cult.thunderOrbs).toBe(snapPool.thunderOrbs);
	});

	test("XX-10 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 79", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(79);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(79);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var assets = [
			"res/art/fengshen_roster.webp",
			"res/art/heaven_gate.webp",
			"res/art/merit_token.webp",
			"res/art/thunder_pool.webp",
			"res/art/thunder_bone_seal.webp",
			"res/art/thunder_orb.webp"
		];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
			expect(cultSrc).toContain(assets[i]);
		}
		expect(cultSrc).not.toMatch(/\?v=78\b/);
		expect(cultSrc).not.toContain("ART_VER || \"78\"");

		// dist/ is tracked: the runtime files must mirror the source exactly
		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.fengshen.", "cultivation.thunder."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(90);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
		}
		expect(en["cultivation.fengshen.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		for (var d = 0; d < cult.FENGSHEN_DOMAINS.length; d++){
			var dom = cult.FENGSHEN_DOMAINS[d];
			expect(zh[dom.labelKey]).toBeTruthy();
			expect(en[dom.officeKey]).toBeTruthy();
			expect(zh[dom.effectKey]).toBeTruthy();
		}
		for (var t = 0; t <= 9; t++){
			var def = cult.getThunderTierDef(t);
			expect(zh[def.titleKey]).toBeTruthy();
			expect(en[def.titleKey]).toBeTruthy();
			if (t > 0){ expect(zh[def.shortKey]).toBeTruthy(); }
		}

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
