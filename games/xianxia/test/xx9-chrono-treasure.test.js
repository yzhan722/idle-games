/* global test, expect, game, describe, beforeEach, afterEach, classes, useRealI18n, restoreI18n */

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

function giveChronoSand(cult, amount){
	cult.chronoAltar.chronoSand = amount;
	cult.syncChronoSand();
}

describe("XX-9 Primordial Chrono River Altar & Innate Treasure Spirit Codex", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("Chrono River Altar tiers 1-6, era nodes unlock upstream, active traces & passive river flow yield Chrono Origin Sand and Era Insight", function(){
		var cult = game.cultivation;
		cult.setIdentity("陆长河", "m", "scholar");

		// Locked before Immortal Ascension
		expect(cult.upgradeChronoAltar()).toBe(false);
		expect(cult.traceChronoEra("shanghuang")).toBe(false);
		expect(cult.refineInnateTreasure("chaosBell")).toBe(false);
		expect(cult.getChronoSermonMult()).toBe(1);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.daoyun = 8;
		cult.zixiaoAltar.daoSutras = 600;
		cult.syncDaoSutras();

		// Fresh defaults after ascension
		expect(cult.chronoAltar.tier).toBe(0);
		expect(cult.chronoAltar.chronoSand).toBe(0);
		expect(cult.chronoSand).toBe(0);
		expect(cult.chronoImprintTier).toBe(0);
		expect(cult.getInnateTotalLevel()).toBe(0);

		// Guard: cannot trace at Tier 0
		expect(cult.traceChronoEra("shanghuang")).toBe(false);

		// Tier 1: only the nearest era (上皇纪) is reachable
		expect(cult.upgradeChronoAltar()).toBe(true);
		expect(cult.chronoAltar.tier).toBe(1);
		expect(cult.chronoImprintTier).toBe(1);
		expect(cult.isChronoEraUnlocked("shanghuang")).toBe(true);
		expect(cult.isChronoEraUnlocked("kaihuang")).toBe(false);
		expect(cult.selectChronoEra("kaihuang")).toBe(false);
		expect(cult.traceChronoEra("hundun")).toBe(false);

		var tcBefore = game.resPool.get("timeCrystal").value;
		var lawBefore = cult.herbGarden.daoLawProgress + cult.daoyun * 100;
		expect(cult.traceChronoEra("shanghuang")).toBe(true);
		expect(cult.chronoAltar.chronoSand).toBe(3);
		expect(cult.chronoSand).toBe(3);
		expect(cult.chronoAltar.insight).toBe(10);
		expect(cult.chronoAltar.eraMastery.shanghuang).toBe(1);
		expect(cult.chronoAltar.traceCount).toBe(1);
		expect(game.resPool.get("timeCrystal").value).toBe(tcBefore); // 上皇纪 costs no Time Crystal
		expect(cult.herbGarden.daoLawProgress + cult.daoyun * 100).toBeGreaterThan(lawBefore);

		// Tier 3 upgrade consumes XX-8 Jade Sutras
		expect(cult.upgradeChronoAltar()).toBe(true);
		var sutrasBeforeT3 = cult.zixiaoAltar.daoSutras;
		var reqT3 = cult.getChronoUpgradeReq();
		expect(reqT3.daoSutras).toBeGreaterThan(0);
		expect(cult.upgradeChronoAltar()).toBe(true);
		expect(cult.zixiaoAltar.daoSutras).toBe(sutrasBeforeT3 - reqT3.daoSutras);
		expect(cult.daoSutras).toBe(cult.zixiaoAltar.daoSutras);

		// Upgrade to Tier 6: every era unlocked, deepest (混沌纪元) auto-anchored
		while (cult.chronoAltar.tier < 6){
			expect(cult.upgradeChronoAltar()).toBe(true);
		}
		expect(cult.upgradeChronoAltar()).toBe(false);
		expect(cult.getChronoUpgradeReq()).toBe(null);
		expect(cult.chronoImprintTier).toBe(6);
		for (var ei = 0; ei < cult.CHRONO_ERAS.length; ei++){
			expect(cult.isChronoEraUnlocked(cult.CHRONO_ERAS[ei].key)).toBe(true);
		}
		expect(cult.chronoAltar.selectedEra).toBe("hundun");

		// Deeper eras yield more sand: 混沌纪元 at Tier 6 (sandMult 3.2) vs 上皇纪
		var deepPrev = cult.getChronoTracePreview("hundun");
		var nearPrev = cult.getChronoTracePreview("shanghuang");
		expect(deepPrev.sandGain).toBeGreaterThan(nearPrev.sandGain * 4);
		expect(deepPrev.timeCrystal).toBeGreaterThan(0);

		var sandBefore = cult.chronoAltar.chronoSand;
		var tcBeforeDeep = game.resPool.get("timeCrystal").value;
		expect(cult.traceChronoEra()).toBe(true); // traces the anchored era
		expect(cult.chronoAltar.chronoSand).toBe(sandBefore + deepPrev.sandGain);
		expect(game.resPool.get("timeCrystal").value).toBeLessThan(tcBeforeDeep);
		expect(cult.chronoAltar.eraMastery.hundun).toBe(1);

		// Mastery raises yield (+6% per trace, capped at 10)
		for (var m = 0; m < 12; m++){ cult.traceChronoEra("hundun"); }
		expect(cult.chronoAltar.eraMastery.hundun).toBe(10);
		expect(cult.getChronoTracePreview("hundun").sandGain).toBeGreaterThan(deepPrev.sandGain);
		expect(cult.getChronoEpochRank()).toBeGreaterThanOrEqual(5);

		// Re-anchor and passive river flow
		expect(cult.selectChronoEra("longhan")).toBe(true);
		expect(cult.selectChronoEra("longhan")).toBe(false);
		var passiveBefore = cult.chronoAltar.chronoSand;
		cult.tickChronoAltar(40);
		expect(cult.chronoAltar.passiveTraceCount).toBeGreaterThanOrEqual(1);
		expect(cult.chronoAltar.chronoSand).toBeGreaterThan(passiveBefore);
		expect(cult.chronoAltar.flowProgress).toBeLessThan(100);

		// Auto-trace toggle stops the river
		expect(cult.toggleChronoAutoTrace()).toBe(false);
		var pausedSand = cult.chronoAltar.chronoSand;
		var pausedFlow = cult.chronoAltar.flowProgress;
		cult.tickChronoAltar(500);
		expect(cult.chronoAltar.chronoSand).toBe(pausedSand);
		expect(cult.chronoAltar.flowProgress).toBe(pausedFlow);
		expect(cult.toggleChronoAutoTrace()).toBe(true);

		// Altar aura feeds the Immortal Cave
		var aura = cult.getChronoAuraBonuses();
		expect(aura.xyRatio).toBeGreaterThan(0.72);
		expect(aura.herbSpeed).toBeGreaterThan(0.60);
		expect(aura.sermonBoost).toBeGreaterThan(0.60);
	});

	test("Innate Treasure spirits Lv.0-6 gated by altar tier, 1/2/4 resonance tiers, Herb Garden & Zixiao Altar output hooks", function(){
		var cult = game.cultivation;
		cult.setIdentity("苏照影", "f", "orphan");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(60000);
		cult.daoyun = 8;
		cult.zixiaoAltar.daoSutras = 800;
		cult.syncDaoSutras();

		// Zixiao Altar Tier 1 as XX-8 baseline
		expect(cult.upgradeZixiaoAltar()).toBe(true);
		game.updateCaches();
		game.calculateAllEffects();
		var baseLecture = cult.getDaoLecturePreview("essence");
		var baseHmLecture = cult.getDaoLecturePreview("hongmeng");
		var baseGarden = cult.getGardenGrowthRate();
		var baseXyRate = game.calcResourcePerTick("xianyuan");
		var baseCp = cult.getCombatPower();
		var baseBns = cult.getImmortalCaveBonuses(30);

		// Altar Tier 1 → awaken Lv.1 only; Lv.2 needs Altar Tier 2
		expect(cult.upgradeChronoAltar()).toBe(true);
		giveChronoSand(cult, 3000);
		expect(cult.refineInnateTreasure("chaosBell")).toBe(true);
		expect(cult.innateTreasures.levels.chaosBell).toBe(1);
		var gated = cult.getInnateRefineReq("chaosBell");
		expect(gated.altarOk).toBe(false);
		expect(gated.affordable).toBe(false);
		expect(cult.refineInnateTreasure("chaosBell")).toBe(false);
		expect(cult.refineInnateTreasure("unknownTreasure")).toBe(false);

		// Sand / Jade Sutra costs are deducted
		expect(cult.upgradeChronoAltar()).toBe(true);
		expect(cult.upgradeChronoAltar()).toBe(true);
		var sandBefore = cult.chronoAltar.chronoSand;
		var sutraBefore = cult.zixiaoAltar.daoSutras;
		var req2 = cult.getInnateRefineReq("chaosBell");
		expect(cult.refineInnateTreasure("chaosBell")).toBe(true);
		expect(cult.chronoAltar.chronoSand).toBe(sandBefore - req2.chronoSand);
		var req3 = cult.getInnateRefineReq("chaosBell");
		expect(req3.daoSutras).toBeGreaterThan(0);
		expect(cult.getInnateResonanceTier()).toBe(0);

		// 1 resonant spirit (Lv.3) → Resonance I
		expect(cult.refineInnateTreasure("chaosBell")).toBe(true);
		expect(cult.zixiaoAltar.daoSutras).toBe(sutraBefore - req3.daoSutras);
		expect(cult.getInnateResonantCount()).toBe(1);
		expect(cult.getInnateResonanceTier()).toBe(1);

		// 2 resonant spirits → Resonance II
		while (cult.innateTreasures.levels.taijiDiagram < 3){
			expect(cult.refineInnateTreasure("taijiDiagram")).toBe(true);
		}
		expect(cult.getInnateResonanceTier()).toBe(2);
		// 3 resonant spirits → still Resonance II
		while (cult.innateTreasures.levels.panguBanner < 3){
			expect(cult.refineInnateTreasure("panguBanner")).toBe(true);
		}
		expect(cult.getInnateResonantCount()).toBe(3);
		expect(cult.getInnateResonanceTier()).toBe(2);
		// 4 resonant spirits → Resonance III
		while (cult.innateTreasures.levels.creationDisc < 3){
			expect(cult.refineInnateTreasure("creationDisc")).toBe(true);
		}
		expect(cult.getInnateResonantCount()).toBe(4);
		expect(cult.getInnateResonanceTier()).toBe(3);

		// Raise altar to 6 and all four spirits to Lv.6
		while (cult.chronoAltar.tier < 6){
			expect(cult.upgradeChronoAltar()).toBe(true);
		}
		var keys = ["chaosBell", "taijiDiagram", "panguBanner", "creationDisc"];
		for (var i = 0; i < keys.length; i++){
			while (cult.innateTreasures.levels[keys[i]] < 6){
				expect(cult.refineInnateTreasure(keys[i])).toBe(true);
			}
			expect(cult.refineInnateTreasure(keys[i])).toBe(false);
			expect(cult.getInnateRefineReq(keys[i])).toBe(null);
		}
		expect(cult.getInnateTotalLevel()).toBe(24);
		expect(cult.getAwakenedInnateCount()).toBe(4);
		expect(cult.innateTreasures.totalRefinements).toBe(24);
		expect(cult.chronoImprintTier).toBe(6);

		// Zixiao Altar (XX-8) output hook: lecture Sutra & Insight gains scale with the Chrono sermon multiplier
		var sermonMult = cult.getChronoSermonMult();
		expect(sermonMult).toBeGreaterThan(2.2);
		var boostedLecture = cult.getDaoLecturePreview("essence");
		var boostedHmLecture = cult.getDaoLecturePreview("hongmeng");
		expect(boostedLecture.sutraGain).toBeGreaterThan(baseLecture.sutraGain);
		expect(boostedLecture.compGain).toBeGreaterThan(baseLecture.compGain * 2);
		expect(boostedHmLecture.sutraGain).toBeGreaterThan(baseHmLecture.sutraGain * 2);
		var passiveSermon = cult.completePassiveZixiaoSermon();
		expect(passiveSermon.sutraGain).toBeGreaterThanOrEqual(3);
		expect(passiveSermon.compGain).toBeGreaterThan(14);

		// Herb Garden growth hook (altar aura + Creation Jade Disc + resonance)
		game.updateCaches();
		game.calculateAllEffects();
		expect(cult.getGardenGrowthRate()).toBeGreaterThan(baseGarden + 1.5);
		expect(cult.getImmortalCaveBonuses(0).herbYieldBonus).toBeGreaterThan(baseBns.herbYieldBonus + 0.5);
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(baseXyRate * 1.5);
		expect(cult.getCombatPower()).toBeGreaterThan(baseCp * 3);
	});

	afterEach(function(){
		restoreI18n();
	});

	test("26F-35F Yaoxian Rift hooks: Pangu Heaven-Cleave, Chaos Bell time-seal, Taiji reflection — low floors untouched", function(){
		useRealI18n("zh");	// battle logs go through $I; assert the zh wording
		var cult = game.cultivation;
		cult.setIdentity("韩青冥", "m", "hunter");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(60000);
		cult.daoyun = 8;
		cult.zixiaoAltar.daoSutras = 800;
		cult.syncDaoSutras();
		while (cult.chronoAltar.tier < 6){
			expect(cult.upgradeChronoAltar()).toBe(true);
		}
		giveChronoSand(cult, 3000);
		var keys = ["chaosBell", "taijiDiagram", "panguBanner", "creationDisc"];
		for (var i = 0; i < keys.length; i++){
			while (cult.innateTreasures.levels[keys[i]] < 6){
				expect(cult.refineInnateTreasure(keys[i])).toBe(true);
			}
		}

		var low = cult.getImmortalCaveBonuses(0);
		expect(low.chronoBellFreezeEvery).toBe(0);
		expect(low.taijiReflectRatio).toBe(0);
		expect(low.panguCleaveRatio).toBe(0);

		var high = cult.getImmortalCaveBonuses(31);
		expect(high.chronoBellFreezeEvery).toBe(2);
		expect(high.taijiReflectRatio).toBeCloseTo(0.36, 4);
		expect(high.panguCleaveRatio).toBeCloseTo(0.15, 4);
		expect(high.riftHpMult).toBeGreaterThan(low.riftHpMult - 0.0001);
		expect(high.riftMitigation).toBeGreaterThan(low.riftMitigation);
		expect(high.riftMitigation).toBeLessThanOrEqual(0.86);
		expect(high.riftBossExecuteRatio).toBeLessThanOrEqual(0.52);
		expect(high.riftBossExecuteRatio).toBeGreaterThan(0);

		cult.riftFloor = 30;
		expect(cult.startRiftBattle("greater", true, 100)).toBe(true);
		var b = cult.battle;
		expect(b.floor).toBe(31);
		expect(b.panguUsed).toBe(false);
		b.enemy.maxHp = 1e14;
		b.enemy.hp = 1e14;
		b.enemy.def = 1e14;
		b.enemy.shield = 0;
		b.enemy.atk = Math.max(50, Math.round(b.player.maxHp * 0.02));
		b.enemy.pattern = ["strike", "strike", "strike", "strike"];
		b.enemy.intentIdx = 0;
		b.enemy.intent = "strike";
		b.player.shield = 0;

		// Turn 1: Pangu Banner first-strike cleave + Taiji reflection on the boss strike
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.active).toBe(true);
		expect(b.panguUsed).toBe(true);
		expect(b.lastEvent.pDmgDealt).toBeGreaterThanOrEqual(1e14 * 0.15 - 1); // 15% max-HP cleave at Lv.6 (boss regen may follow)
		expect(b.logs[0]).toContain("盘古幡·开天");
		expect(b.logs[0]).toContain("太极图·阴阳逆转");
		expect(b.logs[0]).not.toContain("混沌钟·镇压时空");
		expect(b.lastEvent.eDmgDealt).toBeGreaterThanOrEqual(0);

		// Turn 2: Chaos Bell seals the boss (no action), Pangu does not repeat
		var hpBeforeSeal = b.player.hp;
		var enemyHpBeforeSeal = b.enemy.hp;
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.logs[0]).toContain("混沌钟·镇压时空");
		expect(b.logs[0]).not.toContain("盘古幡·开天");
		expect(b.lastEvent.eDmgDealt).toBe(0);
		expect(b.player.hp).toBeGreaterThanOrEqual(hpBeforeSeal);
		expect(b.enemy.hp).toBeLessThanOrEqual(enemyHpBeforeSeal);

		// Turn 3: the boss acts again
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(b.logs[0]).not.toContain("混沌钟·镇压时空");
		expect(b.lastEvent.eDmgDealt).toBeGreaterThan(0);

		// Floors below 26F get none of the 26F~35F hooks
		var lowCave = cult.getImmortalCaveBonuses(25);
		expect(lowCave.panguCleaveRatio).toBe(0);
		expect(lowCave.chronoBellFreezeEvery).toBe(0);
		expect(lowCave.taijiReflectRatio).toBe(0);
	});

	test("chronoImprintTier survives rebirth: imprint gain, cost discount, starting sand, mortal aura & combat bonus", function(){
		var cult = game.cultivation;
		cult.setIdentity("沈逝川", "m", "trader");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(60000);
		cult.daoyun = 8;
		cult.zixiaoAltar.daoSutras = 400;
		cult.syncDaoSutras();
		while (cult.chronoAltar.tier < 6){
			expect(cult.upgradeChronoAltar()).toBe(true);
		}
		giveChronoSand(cult, 500);
		expect(cult.refineInnateTreasure("panguBanner")).toBe(true);
		expect(cult.chronoImprintTier).toBe(6);

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.chronoImprintTier).toBe(6);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);
		expect(rebirth.cultivation.chronoAltar).toBeUndefined();
		expect(rebirth.cultivation.innateTreasures).toBeUndefined();

		cult.resetState();
		expect(cult.chronoImprintTier).toBe(0);
		expect(cult.chronoAltar.tier).toBe(0);
		expect(cult.getInnateTotalLevel()).toBe(0);
		var freshCostMult = cult.getChronoImprintCostMult();
		expect(freshCostMult).toBe(1);
		game.updateCaches();
		var freshMortalXw = game.calcResourcePerTick("xiuwei");
		var freshMortalCp = cult.getCombatPower();

		cult.load(rebirth);
		expect(cult.chronoImprintTier).toBe(6);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.chronoAltar.tier).toBe(0);
		expect(cult.getInnateTotalLevel()).toBe(0);
		expect(cult.getChronoImprintCostMult()).toBeLessThan(freshCostMult);
		expect(cult.getChronoImprintCostMult()).toBeGreaterThanOrEqual(0.55);
		expect(cult.chronoAltar.chronoSand).toBe(36);
		expect(cult.chronoSand).toBe(36);
		expect(cult.getChronoDaoBonus().tier).toBe(6);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshMortalXw);
		expect(cult.getCombatPower()).toBeGreaterThan(freshMortalCp);

		// The seal persists through a second life even without rebuilding (max of previous seal)
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.chronoImprintTier).toBe(6);
	});

	test("Old saves (pre-XX-9) and corrupted chrono fields load cleanly with safe defaults; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("林旧档", "f", "farmer");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.daoyun = 4;

		// Simulate an XX-8-era save: no chrono fields at all
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.chronoAltar;
		delete oldSave.cultivation.innateTreasures;
		delete oldSave.cultivation.chronoImprintTier;
		expect(oldSave.cultivation.zixiaoAltar).toBeDefined();

		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.chronoAltar).toEqual(cult.makeDefaultChronoAltar());
		expect(cult.innateTreasures).toEqual(cult.makeDefaultInnateTreasures());
		expect(cult.chronoImprintTier).toBe(0);
		expect(cult.chronoSand).toBe(0);
		expect(cult.getChronoSermonMult()).toBe(1);
		expect(function(){ cult.tickChronoAltar(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){
				expect(isFinite(bns[bk])).toBe(true);
			}
		}
		expect(bns.chronoBellFreezeEvery).toBe(0);
		expect(bns.taijiReflectRatio).toBe(0);
		expect(bns.panguCleaveRatio).toBe(0);
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);

		// A save older than XX-8 too (no zixiao / dharma / chrono)
		var ancientSave = {};
		cult.save(ancientSave);
		delete ancientSave.cultivation.zixiaoAltar;
		delete ancientSave.cultivation.dharmaIdols;
		delete ancientSave.cultivation.dharmaImprintTier;
		delete ancientSave.cultivation.chronoAltar;
		delete ancientSave.cultivation.innateTreasures;
		delete ancientSave.cultivation.chronoImprintTier;
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.chronoAltar.tier).toBe(0);
		expect(cult.getInnateResonanceTier()).toBe(0);

		// Corrupted values are clamped
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.chronoAltar = {
			tier: 99,
			chronoSand: -5,
			totalSandGathered: "lots",
			insight: "x",
			flowProgress: 1e9,
			selectedEra: "bogus",
			eraMastery: {hundun: 77, shanghuang: -3, fake: 4},
			autoTrace: "yes",
			lastNote: 12
		};
		badSave.cultivation.innateTreasures = {levels: {chaosBell: 9, panguBanner: NaN, taijiDiagram: 2.7, ghost: 3}, totalRefinements: -1};
		badSave.cultivation.chronoImprintTier = 42;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		expect(cult.chronoAltar.tier).toBe(6);
		expect(cult.chronoAltar.chronoSand).toBe(0);
		expect(cult.chronoAltar.insight).toBe(0);
		expect(cult.chronoAltar.flowProgress).toBe(100);
		expect(cult.chronoAltar.selectedEra).toBe("shanghuang");
		expect(cult.chronoAltar.eraMastery.hundun).toBe(10);
		expect(cult.chronoAltar.eraMastery.shanghuang).toBe(0);
		expect(cult.chronoAltar.eraMastery.fake).toBeUndefined();
		expect(cult.chronoAltar.autoTrace).toBe(true);
		expect(cult.chronoAltar.lastNote).toBe("");
		expect(cult.innateTreasures.levels.chaosBell).toBe(6);
		expect(cult.innateTreasures.levels.panguBanner).toBe(0);
		expect(cult.innateTreasures.levels.taijiDiagram).toBe(2);
		expect(cult.innateTreasures.levels.ghost).toBeUndefined();
		expect(cult.innateTreasures.totalRefinements).toBe(8);
		expect(cult.chronoImprintTier).toBe(6);
		expect(function(){ cult.tickChronoAltar(5); }).not.toThrow();
		expect(cult.chronoAltar.flowProgress).toBeLessThan(100);

		// Roundtrip: progress → save → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.daoyun = 4;
		expect(cult.upgradeChronoAltar()).toBe(true);
		expect(cult.upgradeChronoAltar()).toBe(true);
		expect(cult.traceChronoEra("kaihuang")).toBe(true);
		giveChronoSand(cult, 80);
		expect(cult.refineInnateTreasure("creationDisc")).toBe(true);
		var snapAltar = JSON.parse(JSON.stringify(cult.chronoAltar));
		var snapInnate = JSON.parse(JSON.stringify(cult.innateTreasures));
		var snapSeal = cult.chronoImprintTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.chronoAltar).toEqual(snapAltar);
		expect(cult.innateTreasures).toEqual(snapInnate);
		expect(cult.chronoImprintTier).toBe(snapSeal);
		expect(cult.chronoSand).toBe(snapAltar.chronoSand);
	});

	test("XX-9 art assets exist (src + dist), zh/en i18n parity, pure-ES5 runtime JS, buildRevision & ART_VER bumped to 78", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(78);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(78);

		var assets = [
			"res/art/altar_chrono_river.webp",
			"res/art/sand_chrono_origin.webp",
			"res/art/treasure_chaos_bell.webp",
			"res/art/treasure_taiji_diagram.webp",
			"res/art/treasure_pangu_banner.webp",
			"res/art/treasure_creation_disc.webp"
		];
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
		}
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var a = 0; a < assets.length; a++){
			expect(cultSrc).toContain(assets[a]);
		}

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.chrono.", "cultivation.innate."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(75);
		expect(zhKeys).toEqual(enKeys);
		expect(en["cultivation.chrono.panel.badge"].indexOf("Immortal")).toBe(0);
		for (var t = 0; t <= 6; t++){
			expect(zh["cultivation.chrono.tier." + t]).toBeTruthy();
		}
		for (var r = 0; r <= 3; r++){
			expect(zh["cultivation.innate.res." + r]).toBeTruthy();
		}
		var cult = game.cultivation;
		for (var e = 0; e < cult.CHRONO_ERAS.length; e++){
			expect(zh[cult.CHRONO_ERAS[e].labelKey]).toBeTruthy();
			expect(en[cult.CHRONO_ERAS[e].descKey]).toBeTruthy();
		}
		for (var it = 0; it < cult.INNATE_TREASURES.length; it++){
			expect(zh["cultivation.innate.effect." + cult.INNATE_TREASURES[it].key]).toBeTruthy();
			expect(en["cultivation.innate.effect." + cult.INNATE_TREASURES[it].key]).toBeTruthy();
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
