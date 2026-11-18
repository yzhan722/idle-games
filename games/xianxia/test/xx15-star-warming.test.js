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

//把周天相位拨到第 idx 宿当值之初,并清掉推演冷却
function atMansion(cult, idx){
	cult.starObservatory.phase = idx * cult.STAR_MANSION_TICKS;
	cult.starObservatory.cooldown = 0;
}

function litCount(cult){
	return cult.computeStarMap().lit;
}

describe("XX-15 Zhoutian Star Observatory & Natal Treasure Warming", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		game.cultivation.starRandom = null;
		game.cultivation.starClock = null;
		game.cultivation.penglaiRandom = null;
		game.cultivation.penglaiClock = null;
		jest.restoreAllMocks();
	});

	test("Observatory: locked before ascension; 28 lodges in four Quarters turn with the sky; offline turning capped at one full round", function(){
		var cult = game.cultivation;
		cult.setIdentity("袁天罡", "m", "scholar");

		expect(cult.divineStars(0)).toBe(false);
		expect(cult.warmNatalArtifact("xianyuan")).toBe(false);
		expect(cult.resonateNatalArtifact()).toBe(false);
		expect(function(){ cult.tickStarObservatory(5000); }).not.toThrow();
		expect(cult.starObservatory.phase).toBe(0);
		expect(cult.applyStarOffline(3600 * 1000)).toBe(0);
		expect(cult.getStarArtifactCombatBonus(30).riftDmg).toBe(0);
		expect(cult.getNatalSpiritEffect().xianyuanRatio).toBe(0);
		expect(cult.onStarRiftVictory(30)).toEqual({cooldown: 0, blessing: 0});

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		expect(cult.STAR_MANSIONS.length).toBe(28);
		expect(cult.STAR_SYMBOLS.map(function(s){ return s.key; })).toEqual(["azure", "tortoise", "tiger", "bird"]);
		expect(cult.STAR_SYMBOLS.map(function(s){ return cult.SWORD_POSITIONS[s.seat].dir; })).toEqual(["east", "north", "west", "south"]);
		expect(cult.STAR_MAP_GRADES.map(function(g){ return g.min; })).toEqual([0, 4, 9, 15, 21, 28]);
		expect(cult.WARM_GRADES.map(function(g){ return g.min; })).toEqual([0, 40, 120, 260, 480, 800]);
		expect(cult.starObservatory).toEqual(cult.makeDefaultStarObservatory());
		expect(cult.natalWarming).toEqual(cult.makeDefaultNatalWarming());
		expect(cult.starMapTier).toBe(0);
		expect(cult.getStarCycleTicks()).toBe(8400);

		// Lodge 0 (Horn) presides first; every 300 ticks the next lodge takes over
		expect(cult.getStarMansionIndex()).toBe(0);
		expect(cult.getStarSymbolOf(0).key).toBe("azure");
		expect(cult.getStarSymbolOf(7).key).toBe("tortoise");
		expect(cult.getStarSymbolOf(14).key).toBe("tiger");
		expect(cult.getStarSymbolOf(27).key).toBe("bird");
		expect(cult.getStarSymbolOf(28).key).toBe("azure");
		cult.tickStarObservatory(299);
		expect(cult.getStarMansionIndex()).toBe(0);
		cult.tickStarObservatory(1);
		expect(cult.getStarMansionIndex()).toBe(1);
		expect(cult.getWarmFavoredMat()).toBe("herb");
		cult.tickStarObservatory(300 * 20);
		expect(cult.getStarMansionIndex()).toBe(21);
		expect(cult.getWarmFavoredMat()).toBe("cinnabar");
		cult.tickStarObservatory(300 * 7);
		expect(cult.getStarMansionIndex()).toBe(0);
		expect(cult.starObservatory.cycles).toBe(1);
		expect(cult.getStarMansionIndex(8400 * 3 + 450)).toBe(1);

		// Offline: under 10 s ignored; otherwise ticks, but never more than one full round
		var ph0 = cult.starObservatory.phase;
		expect(cult.applyStarOffline(5000)).toBe(0);
		expect(cult.applyStarOffline(NaN)).toBe(0);
		expect(cult.applyStarOffline(-60000)).toBe(0);
		expect(cult.applyStarOffline(60000)).toBe(300);
		expect(cult.starObservatory.phase).toBe(ph0 + 300);
		expect(cult.applyStarOffline(7 * 24 * 3600 * 1000)).toBe(8400);
		expect(cult.starObservatory.phase).toBe(ph0 + 300);
		expect(cult.starObservatory.cycles).toBe(2);
	});

	test("Divination: cost & cooldown, injectable roll (Even / Fair / Grand), lodge lighting rules, blessing levels and refresh, star map grades and the seal", function(){
		var cult = game.cultivation;
		cult.setIdentity("李淳风", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var so = cult.starObservatory;

		var req = cult.getStarDivineReq();
		expect(req).toEqual({xianyuan: 40, starchart: 12, okXy: true, okChart: true, cooldown: 0, ready: true, affordable: true});
		var ch = cult.getStarDivineChances();
		expect(ch).toEqual({great: 0.12, good: 0.4, plain: 0.48, sword: 0, thunder: 0, spirit: 0});

		// Fair (0.3): lights the presiding Horn, Azure blessing Lv 2
		var xy0 = game.resPool.get("xianyuan").value;
		var sc0 = game.resPool.get("starchart").value;
		var r1 = cult.divineStars(0.3);
		expect(r1.outcome).toBe(1);
		expect(r1.mansion).toBe(0);
		expect(r1.lit).toBe(0);
		expect(r1.power).toBe(2);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 40);
		expect(game.resPool.get("starchart").value).toBe(sc0 - 12);
		expect(so.lit[0]).toBe(1);
		expect(so.blessing).toEqual({sym: "azure", power: 2, ticksLeft: 1800, m: 0});
		expect(so.cooldown).toBe(600);
		expect(so.log[0]).toEqual({m: 0, r: 1});
		expect(so.lastNote).toContain("starobs.note.divine");
		expect(so.lastNote).toContain("starobs.note.lit");
		// Cooldown blocks a second divination
		expect(cult.getStarDivineReq().ready).toBe(false);
		expect(cult.divineStars(0.3)).toBe(false);
		cult.tickStarObservatory(599);
		expect(cult.divineStars(0.3)).toBe(false);
		cult.tickStarObservatory(1);
		expect(cult.getStarMansionIndex()).toBe(2);	// the sky kept turning
		expect(cult.starObservatory.blessing.ticksLeft).toBe(1200);

		// Grand (0.05) while the presiding lodge is already lit: the next unlit lodge of the same Quarter lights instead
		atMansion(cult, 0);
		var r2 = cult.divineStars(0.05);
		expect(r2.outcome).toBe(2);
		expect(r2.lit).toBe(1);
		expect(so.lit.slice(0, 3)).toEqual([1, 1, 0]);
		expect(so.blessing.power).toBe(3);
		expect(so.greats).toBe(1);
		// Even (0.9): nothing lit; a stronger blessing is only refreshed
		cult.tickStarObservatory(600);
		so.cooldown = 0;
		var r3 = cult.divineStars(0.9);
		expect(r3.outcome).toBe(0);
		expect(r3.lit).toBe(-1);
		expect(r3.kept).toBe(true);
		expect(r3.power).toBe(3);
		expect(so.blessing.sym).toBe("azure");
		expect(so.blessing.ticksLeft).toBe(1800);
		expect(so.lastNote).toContain("starobs.note.kept");
		// Fair on an already lit lodge lights nothing
		atMansion(cult, 1);
		expect(cult.divineStars(0.3).lit).toBe(-1);
		// The injected random source is used when no explicit roll is given; same roll, same branch
		cult.starRandom = function(){ return 0.11; };
		atMansion(cult, 9);
		var r4 = cult.divineStars();
		expect(r4.roll).toBeCloseTo(0.11, 9);
		expect(r4.outcome).toBe(2);
		expect(so.lit[9]).toBe(1);
		expect(so.blessing).toEqual({sym: "tortoise", power: 3, ticksLeft: 1800, m: 9});
		expect(so.divines).toBe(5);
		expect(so.log.length).toBe(5);
		cult.starRandom = function(){ return 0.12; };	// exactly the Grand odds: a Fair Omen
		atMansion(cult, 10);
		expect(cult.divineStars().outcome).toBe(1);
		expect(so.log.length).toBe(cult.STAR_LOG_MAX);

		// Expiry
		cult.tickStarObservatory(1800);
		expect(so.blessing).toBe(null);
		expect(so.lastNote).toContain("starobs.note.fade");

		// Grand with the whole Quarter lit lights nothing more
		for (var a = 0; a < 7; a++){ so.lit[a] = 1; }
		atMansion(cult, 3);
		expect(cult.divineStars(0.01).lit).toBe(-1);
		expect(cult.computeStarMap().bySym.azure).toBe(7);
		expect(cult.computeStarMap().complete).toBe(1);

		// Star map grades and the seal follow the lit count at once
		expect(litCount(cult)).toBe(9);
		expect(cult.computeStarMap().gradeKey).toBe("rows");
		expect(so.peakGrade).toBe(2);
		expect(cult.starMapTier).toBe(2);
		var lit28 = [];
		for (var i = 0; i < 28; i++){ lit28.push(1); }
		expect(cult.computeStarMap(lit28).grade).toBe(5);
		expect(cult.computeStarMap(lit28.slice(0, 21).concat([0, 0, 0, 0, 0, 0, 0])).gradeKey).toBe("canopy");
		for (var j = 0; j < 28; j++){ so.lit[j] = 1; }
		atMansion(cult, 27);
		so.lit[27] = 0;
		var rFin = cult.divineStars(0.3);
		expect(rFin.lit).toBe(27);
		expect(so.peakGrade).toBe(5);
		expect(cult.starMapTier).toBe(5);
		expect(so.lastNote).toContain("starobs.note.grade");

		// Chances: formation rank +3%, thunder +1%, spirit rank +2% each, Grand capped at 45%
		cult.riftFloor = 35;
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		cult.thunderPool.tier = 9;
		cult.natalWarming.warmth = 800;
		var chMax = cult.getStarDivineChances();
		expect(chMax.sword).toBe(5);
		expect(chMax.thunder).toBe(9);
		expect(chMax.spirit).toBe(5);
		expect(chMax.great).toBe(0.45);
		expect(chMax.plain).toBeCloseTo(0.15, 9);
		cult.natalWarming.warmth = 120;
		cult.thunderPool.tier = 2;
		expect(cult.getStarDivineChances().great).toBeCloseTo(0.12 + 0.15 + 0.02 + 0.04, 9);

		// Seal discounts divination
		cult.starMapTier = 5;
		expect(cult.getStarDivineReq().xianyuan).toBe(30);
		expect(cult.getStarDivineReq().starchart).toBe(9);
		// Poor immortals cannot divine
		so.cooldown = 0;
		game.resPool.get("starchart").value = 3;
		expect(cult.getStarDivineReq().okChart).toBe(false);
		expect(cult.divineStars(0.3)).toBe(false);
	});

	test("Blessing synergy: thunder tempering, sword seat (XX-14), complete Quarter, map seal and spirit resonance multiply the blessing; Rift 26F+ clears haste the sky", function(){
		var cult = game.cultivation;
		cult.setIdentity("张衡", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var so = cult.starObservatory;

		expect(cult.getStarBlessingEffect().active).toBe(false);
		atMansion(cult, 0);
		cult.divineStars(0.01);	// Grand: Azure Lv 3
		var b = cult.getStarBlessingEffect();
		expect(b.active).toBe(true);
		expect(b.sym).toBe("azure");
		expect(b.power).toBe(3);
		expect(b.mult).toBe(1);
		expect(b.dmg).toBeCloseTo(0.006, 9);
		expect(b.crit).toBeCloseTo(0.012, 9);
		expect(b.hp).toBe(0);

		// XX-10 thunder tempering: +4% per tier
		cult.thunderPool.tier = 3;
		expect(cult.getStarBlessingEffect().thunderMult).toBeCloseTo(1.12, 9);
		cult.thunderPool.tier = 0;
		// XX-14: a seated sword in the Dragon (east) seat answers the Azure blessing
		cult.swordTomb.intents.qingping = 1;
		expect(cult.setSwordSlot(1, "qingping")).toBe(true);
		var bs = cult.getStarBlessingEffect();
		expect(bs.seated).toBe(true);
		expect(bs.seatMult).toBe(1.25);
		// An unseated sword there does not
		cult.swordTomb.intents.chixiao = 1;
		expect(cult.setSwordSlot(1, "chixiao")).toBe(true);
		expect(cult.getStarBlessingEffect().seated).toBe(false);
		expect(cult.setSwordSlot(1, "qingping")).toBe(true);
		// Complete Quarter ×1.2, seal ×(1 + 4%/tier), resonance ×1.15
		for (var i = 0; i < 7; i++){ so.lit[i] = 1; }
		cult.starMapTier = 5;
		cult.natalWarming.warmth = 40;
		cult.natalWarming.resonance = 100;
		cult.thunderPool.tier = 9;
		var all = cult.getStarBlessingEffect();
		expect(all.done).toBe(true);
		expect(all.sealMult).toBeCloseTo(1.2, 9);
		expect(all.syncMult).toBe(1.15);
		expect(all.mult).toBeCloseTo(1.36 * 1.25 * 1.2 * 1.2 * 1.15, 9);
		expect(all.crit).toBeCloseTo(0.004 * 3 * all.mult, 9);

		// Rift 26F+ victory: cooldown -150 ticks, blessing +150 ticks (never above full)
		so.cooldown = 600;
		so.blessing.ticksLeft = 1000;
		expect(cult.onStarRiftVictory(25)).toEqual({cooldown: 0, blessing: 0});
		expect(cult.onStarRiftVictory(30)).toEqual({cooldown: 150, blessing: 150});
		expect(so.cooldown).toBe(450);
		expect(so.blessing.ticksLeft).toBe(1150);
		so.cooldown = 100;
		so.blessing.ticksLeft = 1750;
		expect(cult.onStarRiftVictory(33)).toEqual({cooldown: 100, blessing: 50});
		expect(so.blessing.ticksLeft).toBe(1800);
	});

	test("Natal warming: existing materials, cost scaling, Quarter / artifact preferences, herb picking, thunder gate, spirit ranks; timed resonance with cooldown", function(){
		var cult = game.cultivation;
		cult.setIdentity("韩立", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var nw = cult.natalWarming;
		atMansion(cult, 0);	// Azure presides: herbs favoured
		cult.xianqi.boundKey = null;
		cult.natalArtifact = null;
		expect(cult.getNatalArtifactName()).toContain("warming.artifact.generic");
		expect(cult.getNatalAffinityMat()).toBe("");

		var rq = cult.getWarmMaterialReq("xianyuan");
		expect(rq).toEqual({key: "xianyuan", cost: 60, warmth: 8, favored: false, affinity: false, needThunder: 0, thunderOk: true, have: 50000, ok: true, maxed: false, affordable: true});
		expect(cult.getWarmMaterialReq("bogus")).toBe(null);
		expect(cult.warmNatalArtifact("bogus")).toBe(false);
		var xy0 = game.resPool.get("xianyuan").value;
		var w1 = cult.warmNatalArtifact("xianyuan");
		expect(w1).toEqual({warmth: 8, cost: 60, grade: 0, gradeUp: false});
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 60);
		expect(nw.warmth).toBe(8);
		expect(nw.fed.xianyuan).toBe(1);
		expect(nw.lastNote).toContain("warming.note.warm");
		for (var i = 0; i < 4; i++){ cult.warmNatalArtifact("xianyuan"); }
		expect(nw.warmth).toBe(40);
		expect(cult.getNatalSpiritGrade()).toBe(1);
		expect(nw.lastNote).toContain("warming.note.grade");
		// Costs scale +50% per spirit rank
		expect(cult.getWarmMaterialReq("xianyuan").cost).toBe(90);
		expect(cult.getWarmMaterialReq("relic").cost).toBe(15);

		// Herbs: favoured by Azure (×1.25), taken from the most plentiful stock
		cult.herbGarden.stock.qinglian = 1;
		cult.herbGarden.stock.zizhi = 3;
		cult.herbGarden.stock.xianlan = 0;
		var hr = cult.getWarmMaterialReq("herb");
		expect(hr.favored).toBe(true);
		expect(hr.have).toBe(4);
		expect(hr.cost).toBe(2);
		expect(hr.warmth).toBe(15);
		expect(cult.warmNatalArtifact("herb")).toBeTruthy();
		expect(cult.herbGarden.stock.zizhi).toBe(1);
		expect(cult.herbGarden.stock.qinglian).toBe(1);
		expect(nw.lastNote).toContain("warming.note.favored");
		expect(nw.warmth).toBe(55);
		cult.herbGarden.stock.zizhi = 0;
		expect(cult.getWarmMaterialReq("herb").ok).toBe(false);
		expect(cult.warmNatalArtifact("herb")).toBe(false);

		// Cinnabar from the XX-13 talisman studio; favoured while the Bird presides
		cult.talismanWorkshop.cinnabar = 2;
		expect(cult.getWarmMaterialReq("cinnabar").cost).toBe(5);
		expect(cult.warmNatalArtifact("cinnabar")).toBe(false);
		cult.talismanWorkshop.cinnabar = 10;
		atMansion(cult, 22);
		expect(cult.getWarmMaterialReq("cinnabar").warmth).toBe(Math.round(9 * 1.25));
		expect(cult.warmNatalArtifact("cinnabar")).toBeTruthy();
		expect(cult.talismanWorkshop.cinnabar).toBe(5);

		// Thunder Essence needs XX-10 tempering 1; the bound XX-4 sword favours it (×1.2), the Tortoise too (×1.25)
		cult.thunderPool.thunderOrbs = 30;
		var orq = cult.getWarmMaterialReq("orbs");
		expect(orq.thunderOk).toBe(false);
		expect(orq.affordable).toBe(false);
		cult.thunderPool.tier = 1;
		cult.xianqi.boundKey = "sword";
		expect(cult.getNatalAffinityMat()).toBe("orbs");
		expect(cult.getNatalArtifactName()).not.toContain("warming.artifact.generic");
		atMansion(cult, 8);
		orq = cult.getWarmMaterialReq("orbs");
		expect(orq.favored).toBe(true);
		expect(orq.affinity).toBe(true);
		expect(orq.warmth).toBe(Math.round(14 * 1.25 * 1.2));
		expect(cult.warmNatalArtifact("orbs")).toBeTruthy();
		expect(cult.thunderPool.thunderOrbs).toBe(24);
		expect(cult.thunderOrbs).toBe(24);
		cult.xianqi.boundKey = "pagoda";
		expect(cult.getWarmMaterialReq("relic").affinity).toBe(true);
		// The star map seal adds +5% warmth per tier
		cult.starMapTier = 4;
		expect(cult.getWarmMaterialReq("starchart").warmth).toBe(Math.round(9 * 1.2));

		// Spirit effects: Essence +2%/rank, Rift battle effects per rank
		nw.warmth = 260;
		expect(cult.getNatalSpiritGrade()).toBe(3);
		var sp = cult.getNatalSpiritEffect();
		expect(sp.gradeKey).toBe("form");
		expect(sp.xianyuanRatio).toBeCloseTo(0.06, 9);
		expect(sp.dmg).toBeCloseTo(0.012, 9);
		expect(sp.crit).toBeCloseTo(0.003, 9);
		expect(sp.hp).toBeCloseTo(0.012, 9);
		expect(sp.mit).toBeCloseTo(0.0012, 9);
		var x0 = cult.getImmortalCaveBonuses(0).xianyuanRatio;
		nw.warmth = 0;
		expect(cult.getImmortalCaveBonuses(0).xianyuanRatio).toBeCloseTo(x0 - 0.06, 9);
		nw.warmth = 260;

		// Timed resonance
		var rr = cult.getNatalResonanceReq();
		expect(rr.gradeOk).toBe(true);
		expect(rr.ticks).toBe(1200 + 120 * 3);
		expect(rr.xianyuan).toBe(Math.round(50 * 0.8));
		expect(rr.starchart).toBe(Math.round(8 * 0.8));
		expect(cult.resonateNatalArtifact()).toBe(true);
		expect(nw.resonance).toBe(1560);
		expect(nw.resCooldown).toBe(3000);
		expect(nw.resonances).toBe(1);
		expect(cult.isNatalResonating()).toBe(true);
		expect(cult.resonateNatalArtifact()).toBe(false);
		var spR = cult.getNatalSpiritEffect();
		expect(spR.resonating).toBe(true);
		expect(spR.dmg).toBeCloseTo(0.012 * 1.6, 9);
		expect(spR.xianyuanRatio).toBeCloseTo(0.06 * 1.5, 9);
		cult.tickStarObservatory(1560);
		expect(cult.isNatalResonating()).toBe(false);
		expect(nw.lastNote).toContain("warming.note.resEnd");
		expect(cult.getNatalResonanceReq().cooldown).toBe(1440);
		expect(cult.resonateNatalArtifact()).toBe(false);
		cult.tickStarObservatory(1440);
		expect(cult.resonateNatalArtifact()).toBe(true);

		// Dormant spirits cannot resonate; a complete spirit cannot be warmed further
		nw.warmth = 0;
		nw.resonance = 0;
		nw.resCooldown = 0;
		expect(cult.getNatalResonanceReq().gradeOk).toBe(false);
		expect(cult.resonateNatalArtifact()).toBe(false);
		nw.warmth = 795;
		cult.warmNatalArtifact("xianyuan");
		expect(nw.warmth).toBe(800);
		expect(cult.getNatalSpiritGrade()).toBe(5);
		expect(cult.getWarmMaterialReq("xianyuan").maxed).toBe(true);
		expect(cult.warmNatalArtifact("xianyuan")).toBe(false);
	});

	test("Battle bonus: stars + spirit merge into the XX-14 formation channels and stay under its existing caps (Rift 26F+ only); thunder pursuit stays 0.795", function(){
		var cult = game.cultivation;
		cult.setIdentity("一行", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;
		var so = cult.starObservatory;
		var nw = cult.natalWarming;

		// No formation: the stars and the spirit add their full value under the shared caps
		var base26 = cult.getImmortalCaveBonuses(26);
		var base25 = cult.getImmortalCaveBonuses(25);
		atMansion(cult, 21);
		cult.divineStars(0.01);	// Bird Lv 3: damage 2.1%
		nw.warmth = 120;	// spirit rank 2
		var p = cult.getStarArtifactCombatBonus(26);
		expect(p.swordDmg).toBe(0);
		expect(p.rawDmg).toBeCloseTo(0.021 + 0.008, 9);
		expect(p.riftDmg).toBeCloseTo(0.029, 9);
		expect(p.riftCrit).toBeCloseTo(0.002, 9);
		expect(p.riftHp).toBeCloseTo(0.008, 9);
		expect(p.mitigation).toBeCloseTo(0.0008, 9);
		expect(p.capped).toBe(false);
		var w26 = cult.getImmortalCaveBonuses(26);
		var w25 = cult.getImmortalCaveBonuses(25);
		expect(w26.riftDmgMult / base26.riftDmgMult).toBeCloseTo(1.029, 9);
		expect(w26.riftHpMult / base26.riftHpMult).toBeCloseTo(1.008, 9);
		expect(w26.riftCritChance - base26.riftCritChance).toBeCloseTo(0.002, 9);
		expect(w25.riftDmgMult).toBeCloseTo(base25.riftDmgMult, 9);
		expect(w25.riftCritChance).toBeCloseTo(base25.riftCritChance, 9);
		expect(w25.riftMitigation).toBeCloseTo(base25.riftMitigation, 9);
		expect(cult.getStarArtifactCombatBonus(25).riftDmg).toBe(0);
		expect(cult.getStarArtifactCombatBonus(0).riftDmg).toBe(0);

		// Huge raw values (a seated Chixiao answers the Bird) are cut to the XX-14 caps together with the formation
		nw.warmth = 800;
		nw.resonance = 500;
		cult.starMapTier = 5;
		cult.thunderPool.tier = 9;
		for (var i = 21; i < 28; i++){ so.lit[i] = 1; }
		setIntents(cult, {chixiao: 3, qingping: 1});
		setSlots(cult, ["", "", "chixiao", "", ""]);
		expect(cult.getStarBlessingEffect().seated).toBe(true);
		var pc = cult.getStarArtifactCombatBonus(31);
		expect(pc.swordDmg).toBeGreaterThan(0);
		expect(pc.rawDmg).toBeGreaterThan(cult.XX14_DMG_CAP);
		expect(pc.riftDmg).toBeCloseTo(cult.XX14_DMG_CAP - pc.swordDmg, 9);
		expect(pc.poolDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);
		expect(pc.poolDmg).toBeLessThanOrEqual(cult.XX14_DMG_CAP + 1e-12);
		expect(pc.poolCrit).toBeLessThanOrEqual(cult.XX14_CRIT_CAP + 1e-12);
		expect(pc.poolHp).toBeLessThanOrEqual(cult.XX14_HP_CAP + 1e-12);
		expect(pc.poolMit).toBeLessThanOrEqual(cult.XX14_MIT_CAP + 1e-12);
		expect(pc.capped).toBe(true);

		// A partly built formation: the stars only fill what the formation leaves open
		setIntents(cult, {qingping: 2, chixiao: 2});
		setSlots(cult, ["chixiao", "qingping", "", "", ""]);
		cult.swordIntentTier = 0;
		var swPart = cult.getSwordFormationEffect(31);
		expect(swPart.riftDmg).toBeGreaterThan(0);
		expect(swPart.riftDmg).toBeLessThan(cult.XX14_DMG_CAP);
		var pp = cult.getStarArtifactCombatBonus(31);
		expect(pp.swordDmg).toBeCloseTo(swPart.riftDmg, 12);
		expect(pp.riftDmg).toBeCloseTo(cult.XX14_DMG_CAP - swPart.riftDmg, 9);
		expect(pp.poolDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);

		// A full formation with its seal already sits on every cap: the stars and spirit add nothing
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.swordIntentTier).toBe(5);
		var swFull = cult.getSwordFormationEffect(31);
		expect(swFull.riftDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);
		var pf = cult.getStarArtifactCombatBonus(31);
		expect(pf.riftDmg).toBe(0);
		expect(pf.riftCrit).toBe(0);
		expect(pf.riftHp).toBe(0);
		expect(pf.mitigation).toBe(0);
		var withStars = cult.getImmortalCaveBonuses(31);
		var savedBless = so.blessing;
		var savedWarm = nw.warmth;
		so.blessing = null;
		nw.warmth = 0;
		nw.resonance = 0;
		var noStars = cult.getImmortalCaveBonuses(31);
		expect(withStars.riftDmgMult).toBe(noStars.riftDmgMult);
		expect(withStars.riftCritChance).toBe(noStars.riftCritChance);
		expect(withStars.riftHpMult).toBe(noStars.riftHpMult);
		expect(withStars.riftMitigation).toBe(noStars.riftMitigation);
		so.blessing = savedBless;
		nw.warmth = savedWarm;
		nw.resonance = 500;

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
		so.blessing = null;
		nw.warmth = 0;
		nw.resonance = 0;
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		atMansion(cult, 23);
		cult.divineStars(0.01);
		nw.warmth = 800;
		nw.resonance = 900;
		cult.starMapTier = 5;
		var after = cult.getImmortalCaveBonuses(31);
		expect(cult.getStarArtifactCombatBonus(31).riftDmg).toBeGreaterThan(0);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);
		for (var bk in after){
			if (after.hasOwnProperty(bk)){ expect(isFinite(after[bk])).toBe(true); }
		}
		// Mortal life: nothing
		cult.immortalAscended = false;
		expect(cult.getStarArtifactCombatBonus(31).riftDmg).toBe(0);
		expect(cult.getNatalSpiritEffect().dmg).toBe(0);
	});

	test("Save / load: injected clock turns the sky offline (capped at one round), blessings and resonance run down; roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("郭守敬", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		var now = 1700000000000;
		cult.starClock = function(){ return now; };

		atMansion(cult, 0);
		cult.divineStars(0.3);
		cult.natalWarming.warmth = 130;
		cult.resonateNatalArtifact();
		var sv = {};
		cult.save(sv);
		expect(sv.cultivation.starObservatory.savedAt).toBe(now);
		expect(sv.cultivation.natalWarming.warmth).toBe(130);
		expect(sv.cultivation.starMapTier).toBe(0);
		var json = JSON.parse(JSON.stringify(sv));
		now += 2 * 60 * 1000;	// two minutes → 600 ticks
		cult.resetState();
		cult.load(json);
		var so = cult.starObservatory;
		expect(so.savedAt).toBeUndefined();
		expect(so.phase).toBe(600);
		expect(cult.getStarMansionIndex()).toBe(2);
		expect(so.cooldown).toBe(0);
		expect(so.blessing.ticksLeft).toBe(1200);
		expect(cult.natalWarming.resonance).toBe(1440 - 600);
		expect(cult.natalWarming.resCooldown).toBe(2400);
		// A whole day away still turns at most one round, so everything timed has run out
		var sv2 = {};
		cult.save(sv2);
		now += 24 * 3600 * 1000;
		cult.resetState();
		cult.load(JSON.parse(JSON.stringify(sv2)));
		expect(cult.starObservatory.phase).toBe(600);
		expect(cult.starObservatory.cycles).toBe(1);
		expect(cult.starObservatory.blessing).toBe(null);
		expect(cult.natalWarming.resonance).toBe(0);
		expect(cult.natalWarming.resCooldown).toBe(0);
		expect(cult.starObservatory.lit[0]).toBe(1);

		// Roundtrip without elapsed time: identical normalized state
		atMansion(cult, 16);
		cult.divineStars(0.05);
		cult.warmNatalArtifact("relic");
		cult.tickStarObservatory(77);
		var snapSo = cult.normalizeStarObservatory(JSON.parse(JSON.stringify(cult.starObservatory)));
		var snapNw = cult.normalizeNatalWarming(JSON.parse(JSON.stringify(cult.natalWarming)));
		var snapTier = cult.starMapTier;
		var rt = {};
		cult.save(rt);
		cult.resetState();
		cult.load(JSON.parse(JSON.stringify(rt)));
		expect(cult.starObservatory).toEqual(snapSo);
		expect(cult.natalWarming).toEqual(snapNw);
		expect(cult.starMapTier).toBe(snapTier);
		expect(cult.starObservatory.blessing.sym).toBe("tiger");
	});

	test("Rebirth: the starMapTier seal survives (and adds an imprint at Starfall Canopy or a Dao-United spirit); observatory and warming reset; seal lights lodges once", function(){
		var cult = game.cultivation;
		cult.setIdentity("落下闳", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		var so = cult.starObservatory;
		for (var i = 0; i < 27; i++){ so.lit[i] = 1; }
		atMansion(cult, 27);
		cult.divineStars(0.3);
		expect(cult.starMapTier).toBe(5);
		cult.natalWarming.warmth = 300;

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.starMapTier).toBe(5);
		expect(rebirth.cultivation.starObservatory).toBeUndefined();
		expect(rebirth.cultivation.natalWarming).toBeUndefined();
		var imprintWith = rebirth.cultivation.immortalImprint || 0;

		// Same life with a dark map and a sleepy spirit: no seal, one imprint fewer
		var keepLit = so.lit.slice(0);
		for (var j = 0; j < 28; j++){ so.lit[j] = 0; }
		so.peakGrade = 0;
		cult.starMapTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.starMapTier).toBeUndefined();
		expect(imprintWith).toBe((rebirthPlain.cultivation.immortalImprint || 0) + 1);
		// A Dao-United spirit earns the same imprint
		cult.natalWarming.warmth = 480;
		game.save();
		var rebirthSpirit = game._resetInternal();
		expect(rebirthSpirit.cultivation.immortalImprint || 0).toBe(imprintWith);
		// 21 lit lodges (Starfall Canopy) too, and the seal follows the map
		cult.natalWarming.warmth = 0;
		for (var c = 0; c < 21; c++){ so.lit[c] = 1; }
		game.save();
		var rebirthCanopy = game._resetInternal();
		expect(rebirthCanopy.cultivation.immortalImprint || 0).toBe(imprintWith);
		expect(rebirthCanopy.cultivation.starMapTier).toBe(4);
		so.lit = keepLit;

		cult.resetState();
		expect(cult.starMapTier).toBe(0);
		expect(cult.starObservatory).toEqual(cult.makeDefaultStarObservatory());
		expect(cult.natalWarming).toEqual(cult.makeDefaultNatalWarming());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.starMapTier).toBe(5);
		expect(cult.computeStarMap().lit).toBe(0);
		expect(cult.natalWarming.warmth).toBe(0);
		var seal = cult.getStarMapSealBonus();
		expect(seal.tier).toBe(5);
		expect(seal.xiuweiRatio).toBeCloseTo(0.15, 9);
		expect(seal.costCut).toBeCloseTo(0.25, 9);
		expect(seal.blessMult).toBeCloseTo(1.20, 9);
		expect(seal.warmBonus).toBeCloseTo(0.25, 9);
		expect(seal.freeLit).toBe(5);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.divineStars(0.3)).toBe(false);	// still mortal

		// Next ascension: five lodges from Horn already lit, cheaper divination, faster warming
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.starObservatory.lit.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 0]);
		expect(cult.computeStarMap().gradeKey).toBe("glimmer");
		expect(cult.starMapTier).toBe(5);
		expect(cult.getStarDivineReq().xianyuan).toBe(30);
		expect(cult.getWarmMaterialReq("xianyuan").warmth).toBe(10);
		// Granted once, not again on load
		for (var z = 0; z < 28; z++){ cult.starObservatory.lit[z] = 0; }
		cult.starObservatory.divines = 1;
		var again = {};
		cult.save(again);
		cult.load(JSON.parse(JSON.stringify(again)));
		expect(cult.computeStarMap().lit).toBe(0);

		// The seal persists through another life
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.starMapTier).toBe(5);
	});

	test("Old saves (XX-14 era and earlier) and corrupted XX-15 fields load cleanly", function(){
		var cult = game.cultivation;
		cult.setIdentity("僧一行", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.starObservatory;
		delete oldSave.cultivation.natalWarming;
		delete oldSave.cultivation.starMapTier;
		expect(oldSave.cultivation.swordTomb).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.starObservatory).toEqual(cult.makeDefaultStarObservatory());
		expect(cult.natalWarming).toEqual(cult.makeDefaultNatalWarming());
		expect(cult.starMapTier).toBe(0);
		expect(function(){ cult.tickStarObservatory(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);
		expect(cult.divineStars(0.3)).toBeTruthy();

		// Mortal save without XX-15 fields
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.starObservatory;
		delete mortalSave.cultivation.natalWarming;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.divineStars(0.3)).toBe(false);
		expect(function(){ cult.tickStarObservatory(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		var lit = [1, true, 2, "1", null, 1];
		badSave.cultivation.starObservatory = {
			phase: 1e9 + 0.7, cycles: -3, lit: lit, cooldown: 1e9,
			blessing: {sym: "bird", power: 9, ticksLeft: 1e9, m: 2},
			peakGrade: 99, divines: 3, greats: 9,
			log: [{m: 3, r: 2}, {m: 40, r: 1}, "x", {m: 5, r: 7}, {m: -1, r: 0}, {m: 1, r: 1}, {m: 2, r: 0}, {m: 6, r: 1}, {m: 7, r: 1}],
			lastNote: 5,
			savedAt: "soon"
		};
		badSave.cultivation.natalWarming = {warmth: 1e9, warms: -2, fed: {xianyuan: -3, relic: 2.9, bogus: 5}, resonance: 1e9, resCooldown: 1e9, resonances: "x", lastNote: "ok"};
		badSave.cultivation.starMapTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		var so = cult.starObservatory;
		expect(so.phase).toBe(1e9 % 8400);
		expect(so.cycles).toBe(0);
		expect(so.lit.length).toBe(28);
		expect(so.lit.slice(0, 7)).toEqual([1, 1, 0, 0, 0, 1, 0]);
		expect(so.cooldown).toBe(600);
		expect(so.blessing).toEqual({sym: "bird", power: 3, ticksLeft: 1800, m: 21});
		expect(so.peakGrade).toBe(5);
		expect(so.greats).toBe(3);
		expect(so.log).toEqual([{m: 3, r: 2}, {m: 5, r: 2}, {m: 1, r: 1}, {m: 2, r: 0}, {m: 6, r: 1}]);
		expect(so.lastNote).toBe("");
		expect(cult.starMapTier).toBe(5);
		var nw = cult.natalWarming;
		expect(nw.warmth).toBe(800);
		expect(nw.warms).toBe(0);
		expect(nw.fed).toEqual({xianyuan: 0, relic: 2, starchart: 0, herb: 0, cinnabar: 0, orbs: 0});
		expect(nw.resonance).toBe(1800);
		expect(nw.resCooldown).toBe(3000);
		expect(nw.resonances).toBe(0);
		expect(nw.lastNote).toBe("ok");
		// Broken shapes fall back to defaults
		badSave.cultivation.starObservatory = "broken";
		badSave.cultivation.natalWarming = [1, 2];
		badSave.cultivation.starMapTier = "x";
		cult.resetState();
		cult.load(badSave);
		expect(cult.starObservatory).toEqual(cult.makeDefaultStarObservatory());
		expect(cult.natalWarming.warmth).toBe(0);
		expect(cult.starMapTier).toBe(0);
		badSave.cultivation.starObservatory = {blessing: {sym: "azure", power: 2, ticksLeft: 0}};
		badSave.cultivation.natalWarming = {warmth: 10, resonance: 500};
		cult.resetState();
		cult.load(badSave);
		expect(cult.starObservatory.blessing).toBe(null);
		expect(cult.natalWarming.resonance).toBe(0);	// a dormant spirit cannot be resonating
	});

	test("Panel renders in the cultivation tab: rotating disc, 28 lodges, divination, blessing, warming list, resonance, merged caps; clicks work through event delegation; ?v=84 art; zh/en without raw placeholders", function(){
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
			if (el && el.addEventListener && evt === "onclick" && el.className && String(el.className).indexOf("xxStarObsArena") >= 0){
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
			cult.setIdentity("吕洞宾", "m", "scholar");
			cult.prepareImmortalCaveForTest(true);
			grantImmortalResources(50000);
			cult.riftFloor = 35;
			cult.thunderPool.tier = 3;
			cult.thunderPool.thunderOrbs = 50;
			cult.herbGarden.stock.qinglian = 3;
			cult.talismanWorkshop.cinnabar = 9;
			cult.xianqi.boundKey = null;
			cult.starRandom = function(){ return 0.3; };
			var tab = game.cultivationTab;
			expect(tab instanceof classes.tab.CultivationTab).toBe(true);
			var host = document.createElement("div");
			document.body.appendChild(host);
			tab.render(host);
			tab.update();
			var el = host.querySelector(".xxStarObsArena");
			expect(el).not.toBe(null);
			expect(el.style.display).toBe("block");
			expect(el.querySelectorAll(".xxStarRow").length).toBe(4);
			expect(el.querySelectorAll(".xxStarCell").length).toBe(28);
			expect(el.querySelectorAll(".xxStarCell.is-now").length).toBe(1);
			expect(el.querySelectorAll(".xxStarCell.is-lit").length).toBe(0);
			expect(el.querySelector(".xxStarDisc img").getAttribute("style")).toContain("rotate(");
			expect(el.querySelectorAll("[data-xx-star=divine]").length).toBe(1);
			expect(el.querySelectorAll(".xxWarmMat").length).toBe(6);
			expect(el.querySelectorAll("[data-xx-warm=feed]").length).toBe(6);
			expect(el.querySelectorAll(".xxWarmMat.is-favored").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-warm=resonate]").length).toBe(0);
			expect(el.querySelectorAll(".xxStarPool").length).toBe(4);
			expect(el.querySelector(".xxStarBless.is-none")).not.toBe(null);
			var checkImgs = function(minCount, required){
				var imgs = el.querySelectorAll("img");
				expect(imgs.length).toBeGreaterThan(minCount);
				var seenArt = {};
				for (var i = 0; i < imgs.length; i++){
					expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
					expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(84);
					expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
					seenArt[imgs[i].getAttribute("src").split("?")[0]] = true;
				}
				required.forEach(function(n){
					expect(seenArt["res/art/" + n + ".webp"]).toBe(true);
				});
			};
			checkImgs(12, ["star_observatory", "constellation_disc", "star_map_scroll", "natal_artifact", "artifact_spirit", "warming_cauldron", "beast_azure_dragon", "beast_vermilion_bird"]);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).toContain("周天星宿观星台");
			expect(el.textContent).toContain("角木蛟");
			expect(cult.isStarObsEn()).toBe(false);

			var click = function(sel){
				var t = el.querySelector(sel);
				expect(t).not.toBe(null);
				t.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			};
			// Divine through the panel (injected roll 0.3 → Fair Omen)
			click("[data-xx-star=divine]");
			expect(cult.starObservatory.divines).toBe(1);
			expect(el.querySelectorAll(".xxStarCell.is-lit").length).toBe(1);
			expect(el.querySelector(".xxStarBless.is-azure")).not.toBe(null);
			expect(el.querySelectorAll(".xxStarLog.is-good").length).toBe(1);
			expect(el.querySelectorAll("[data-xx-star=divine]").length).toBe(0);	// cooling down
			var cooling = el.querySelector(".xxStarDivine .xxCaveMiniBtn.is-disabled");
			expect(cooling).not.toBe(null);
			cooling.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			expect(cult.starObservatory.divines).toBe(1);
			// Warm five times with Essence → spirit wakes → resonance becomes available
			for (var f = 0; f < 5; f++){
				click("[data-xx-warm=feed][data-xx-arg=xianyuan]");
			}
			expect(cult.getNatalSpiritGrade()).toBe(1);
			expect(el.querySelector(".xxWarmCard.is-grade-1")).not.toBe(null);
			// Herb warming via an inner element (event bubbling)
			click("[data-xx-warm=feed][data-xx-arg=herb]");
			expect(cult.herbGarden.stock.qinglian).toBe(1);
			click("[data-xx-warm=resonate]");
			expect(cult.isNatalResonating()).toBe(true);
			expect(el.querySelector(".xxWarmCard.is-resonating")).not.toBe(null);
			expect(el.querySelector(".xxWarmRes.is-active")).not.toBe(null);
			expect(el.querySelectorAll(".xxStarPool.is-on").length).toBeGreaterThan(0);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(cult.natalWarming.lastNote).toContain("器灵");
			expect(cult.starObservatory.lastNote).toContain("观星推演");
			checkImgs(12, ["natal_artifact", "artifact_spirit", "warming_cauldron", "herb_qinglian", "thunder_orb", "cinnabar_jar"]);

			// English pass over the same state
			useLang("en");
			tab._starSig = "";
			tab.update();
			expect(cult.isStarObsEn()).toBe(true);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.querySelector(".xxStarGrid.is-en")).not.toBe(null);
			expect(el.textContent).toContain("Zhoutian Star Observatory");
			expect(el.textContent).toContain("Rift damage");
			expect(el.textContent).toContain("Azure Dragon of the East");

			// Mortal with a past-life seal: locked notice only
			cult.resetState();
			cult.starMapTier = 3;
			tab._starSig = "";
			tab.update();
			expect(el.style.display).toBe("block");
			expect(el.className).toContain("is-locked");
			expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
			expect(el.querySelector(".xxSamsaraLockLegacy")).not.toBe(null);
			expect(el.querySelectorAll(".xxStarCell").length).toBe(0);
			expect(el.innerHTML).not.toMatch(rawRe);
		} finally {
			global.dojo.connect = origConnect;
			global.$I = origI;
		}
	});

	test("XX-15 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 84", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(84);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(84);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var names = ["star_observatory", "constellation_disc", "star_map_scroll", "natal_artifact", "artifact_spirit", "warming_cauldron"];
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
		expect(cultSrc).not.toMatch(/\?v=83\b/);
		expect(cultSrc).not.toContain("ART_VER || \"83\"");
		var xx15Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalStarEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx15Ui.length).toBeGreaterThan(1000);
		expect(xx15Ui).not.toContain("<svg");
		expect(xx15Ui).not.toContain("<canvas");
		expect(xx15Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		var xx15Logic = cultSrc.slice(cultSrc.indexOf("XX-15 周天星宿观星台与本命法宝温养 ----"), cultSrc.indexOf("getImmortalCaveBonuses: function(riftFloorOpt){"));
		expect(xx15Logic.length).toBeGreaterThan(1000);
		expect(xx15Logic).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		// The merged cap reads the XX-14 constants; nothing in XX-15 touches the thunder pursuit ratio
		expect(xx15Logic).toContain("this.XX14_DMG_CAP");
		expect(xx15Logic).not.toContain("thunderStrikeRatio");
		expect(xx15Logic).not.toContain("getThunderStrikeRatio");

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html", "build.version.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxStarObsArena");
		expect(css).toContain(".xxStarCells");
		expect(css).toContain(".xxWarmMat");
		expect(css).toContain(".xxStarPoolBar");
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxStarPoolList/);
		expect(css).toMatch(/@media \(max-width: 920px\)\s*\{\s*\.xxStarLowerGrid/);
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxStarDivine/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.starobs.", "cultivation.warming."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(180);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(/[一-鿿]/.test(zh[zhKeys[pk]])).toBe(true);
			expect(en[zhKeys[pk]]).not.toMatch(/"/);
			// the runtime $I replaces each {n} once: a placeholder may appear only once per string
			[zh[zhKeys[pk]], en[zhKeys[pk]]].forEach(function(v){
				var seenPh = {};
				(String(v).match(/\{\d\}/g) || []).forEach(function(ph){
					expect(seenPh[ph]).toBeUndefined();
					seenPh[ph] = true;
				});
			});
		}
		expect(en["cultivation.starobs.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var need = [];
		cult.STAR_MANSIONS.forEach(function(m){ need.push("cultivation.starobs.mansion." + m + ".label", "cultivation.starobs.mansion." + m + ".short"); });
		cult.STAR_SYMBOLS.forEach(function(s){ need.push("cultivation.starobs.sym." + s.key + ".label", "cultivation.starobs.sym." + s.key + ".short", "cultivation.starobs.sym." + s.key + ".desc"); });
		cult.STAR_MAP_GRADES.forEach(function(g){ need.push("cultivation.starobs.grade." + g.key); });
		cult.STAR_OUTCOMES.forEach(function(o){ need.push("cultivation.starobs.outcome." + o); });
		["dmg", "crit", "hp", "mit"].forEach(function(c){ need.push("cultivation.starobs.pool." + c, "cultivation.starobs.chan." + c); });
		cult.WARM_GRADES.forEach(function(g){ need.push("cultivation.warming.grade." + g.key); });
		cult.WARM_MATERIALS.forEach(function(m){ need.push("cultivation.warming.mat." + m.key + ".label", "cultivation.warming.mat." + m.key + ".cost"); });
		for (var n = 0; n < need.length; n++){
			expect(zh[need[n]]).toBeTruthy();
			expect(en[need[n]]).toBeTruthy();
		}
		// Every Quarter's favoured material and every artifact preference is a real material
		cult.STAR_SYMBOLS.forEach(function(s){ expect(cult.getWarmMaterialDef(s.mat)).not.toBe(null); });
		for (var ak in cult.WARM_AFFINITY){
			if (cult.WARM_AFFINITY.hasOwnProperty(ak)){
				expect(cult.getImmortalArtifactDef(ak)).not.toBe(null);
				expect(cult.getWarmMaterialDef(cult.WARM_AFFINITY[ak])).not.toBe(null);
			}
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
