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

//经典五位剑阵:轩辕坐镇阵眼,青萍 / 赤霄 / 泰阿 / 湛卢各守本位(皆得位)
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

describe("XX-14 Taixu Sword Tomb & Penglai Mirage Encounters", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		game.cultivation.penglaiRandom = null;
		game.cultivation.penglaiClock = null;
		game.cultivation.talismanRandom = null;
		game.cultivation.auctionRandom = null;
		jest.restoreAllMocks();
	});

	test("Sword tomb: locked before ascension; Rift 26F+ floors and resources gate comprehension; intents open formation seats", function(){
		var cult = game.cultivation;
		cult.setIdentity("李淳罡", "m", "scholar");

		expect(cult.comprehendAncientSword("qingping")).toBe(false);
		expect(cult.selectSwordManual("qingping")).toBe(false);
		expect(cult.setSwordSlot(0, "qingping")).toBe(false);
		expect(cult.applySwordManual(0)).toBe(false);
		expect(cult.clearSwordFormation()).toBe(false);
		expect(cult.spawnPenglaiMirage(0)).toBe(false);
		expect(cult.choosePenglaiOption("toll", 0)).toBe(false);
		expect(function(){ cult.tickPenglai(5000); }).not.toThrow();
		expect(cult.penglai.mirage).toBe(null);
		expect(cult.getSwordFormationEffect(30).riftDmg).toBe(0);
		expect(cult.getImmortalCaveBonuses(30).riftCritChance).toBe(0);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		expect(cult.ANCIENT_SWORDS.length).toBe(6);
		expect(cult.SWORD_POSITIONS.length).toBe(5);
		expect(cult.SWORD_LINKS.length).toBe(8);
		expect(cult.SWORD_GRADES.map(function(g){ return g.min; })).toEqual([0, 8, 18, 30, 44, 58]);
		expect(cult.swordTomb).toEqual(cult.makeDefaultSwordTomb());
		expect(cult.swordIntentTier).toBe(0);
		expect(cult.getSwordSlotsOpen()).toBe(2);
		expect(cult.riftFloor).toBe(26);

		// Floors: only Qingping (26F) is open at first
		var q = cult.getSwordComprehendReq("qingping");
		expect(q).toEqual({
			key: "qingping", cur: 0, level: 1, maxed: false, xianyuan: 60, relic: 8, orbs: 0, reqFloor: 26, needThunder: 0,
			floorOk: true, thunderOk: true, okXy: true, okRelic: true, okOrbs: true, affordable: true
		});
		expect(cult.getSwordComprehendReq("chixiao").floorOk).toBe(false);
		expect(cult.comprehendAncientSword("chixiao")).toBe(false);
		expect(cult.comprehendAncientSword("bogus")).toBe(false);
		var xy0 = game.resPool.get("xianyuan").value;
		var rl0 = game.resPool.get("relic").value;
		expect(cult.comprehendAncientSword("qingping")).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 60);
		expect(game.resPool.get("relic").value).toBe(rl0 - 8);
		expect(cult.getSwordIntent("qingping")).toBe(1);
		expect(cult.swordTomb.selected).toBe("qingping");
		expect(cult.swordTomb.comprehends).toBe(1);
		expect(cult.swordTomb.lastNote).toContain("swordtomb.note.learn");
		// Level costs scale ×2 and ×3.5
		expect(cult.getSwordComprehendReq("qingping").xianyuan).toBe(120);
		expect(cult.comprehendAncientSword("qingping")).toBe(true);
		expect(cult.getSwordComprehendReq("qingping").xianyuan).toBe(210);
		expect(cult.getSwordComprehendReq("qingping").relic).toBe(28);
		expect(cult.comprehendAncientSword("qingping")).toBe(true);
		expect(cult.getSwordComprehendReq("qingping").maxed).toBe(true);
		expect(cult.comprehendAncientSword("qingping")).toBe(false);
		expect(cult.getSwordTotalIntent()).toBe(3);
		expect(cult.getSwordSlotsOpen()).toBe(2);

		// Deeper rifts open the other swords; 4 intents open the third seat
		cult.riftFloor = 35;
		expect(cult.comprehendAncientSword("chixiao")).toBe(true);
		expect(cult.getSwordSlotsOpen()).toBe(3);
		expect(cult.swordTomb.lastNote).toContain("swordtomb.note.slot");

		// Zidian needs XX-10 thunder tempering (1 / 3 / 5) and Thunder Essence
		var zr = cult.getSwordComprehendReq("zidian");
		expect(zr.needThunder).toBe(1);
		expect(zr.thunderOk).toBe(false);
		expect(zr.orbs).toBe(6);
		expect(cult.comprehendAncientSword("zidian")).toBe(false);
		cult.thunderPool.tier = 1;
		cult.thunderPool.thunderOrbs = 0;
		expect(cult.getSwordComprehendReq("zidian").okOrbs).toBe(false);
		expect(cult.comprehendAncientSword("zidian")).toBe(false);
		cult.thunderPool.thunderOrbs = 40;
		expect(cult.comprehendAncientSword("zidian")).toBe(true);
		expect(cult.thunderPool.thunderOrbs).toBe(34);
		expect(cult.getSwordComprehendReq("zidian").needThunder).toBe(3);
		expect(cult.comprehendAncientSword("zidian")).toBe(false);
		cult.thunderPool.tier = 3;
		expect(cult.getSwordComprehendReq("zidian").orbs).toBe(12);
		expect(cult.comprehendAncientSword("zidian")).toBe(true);
		expect(cult.thunderPool.thunderOrbs).toBe(22);

		// Poor immortals cannot comprehend
		game.resPool.get("relic").value = 1;
		expect(cult.getSwordComprehendReq("taie").affordable).toBe(false);
		expect(cult.comprehendAncientSword("taie")).toBe(false);
	});

	test("Formation: deterministic seats, eye, links, thunder synergy and grades; manual select / place / swap / withdraw / clear", function(){
		var cult = game.cultivation;
		cult.setIdentity("独孤求败", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);

		// Pure computation on explicit inputs
		var f1 = cult.computeSwordFormation(["", "qingping", "", "", ""], {qingping: 1}, 0);
		expect(f1.open).toBe(2);
		expect(f1.placed).toBe(1);
		expect(f1.seated).toBe(1);
		expect(f1.score).toBe(3);
		expect(f1.grade).toBe(0);
		// Pieces beyond the open seats are ignored
		expect(cult.computeSwordFormation(["", "", "chixiao", "", ""], {chixiao: 1}, 0).placed).toBe(0);
		// Unseated eye piece: L×2 + L; seated east: L×3; a joined link +1
		var f2 = cult.computeSwordFormation(["chixiao", "qingping", "", "", ""], {chixiao: 1, qingping: 1}, 0);
		expect(f2.piecePts).toBe(6);
		expect(f2.links[0]).toEqual({a: 0, b: 1, state: "joined", thunder: false, pts: 1});
		expect(f2.score).toBe(7);
		expect(f2.gradeKey).toBe("sanjian");
		var f3 = cult.computeSwordFormation(["chixiao", "qingping", "", "", ""], {chixiao: 1, qingping: 2}, 0);
		expect(f3.score).toBe(10);
		expect(f3.gradeKey).toBe("liangyi");
		// Classic five: 12 + 4×9 pieces, 8 resonant links ×2 → 64, Ten Thousand Swords Return
		var full = cult.computeSwordFormation(CLASSIC, FULL_INTENTS, 0);
		expect(full.open).toBe(5);
		expect(full.seated).toBe(5);
		expect(full.piecePts).toBe(48);
		expect(full.resonant).toBe(8);
		expect(full.linkPts).toBe(16);
		expect(full.score).toBe(64);
		expect(full.gradeKey).toBe("wanjian");
		expect(full.channels.dmg).toBeCloseTo(0.075375, 9);
		expect(full.channels.crit).toBeCloseTo(0.03375, 9);
		expect(full.channels.hp).toBeCloseTo(0.061875, 9);
		expect(full.channels.mit).toBeCloseTo(0.0082125, 9);
		expect(cult.computeSwordFormation(CLASSIC, FULL_INTENTS, 0)).toEqual(full);
		// Swords out of their seats: unseated, links only joined
		var shuffled = cult.computeSwordFormation(["qingping", "chixiao", "taie", "zhanlu", "xuanyuan"], FULL_INTENTS, 0);
		expect(shuffled.seated).toBe(0);
		expect(shuffled.score).toBe(9 + 6 * 4 + 8);
		expect(shuffled.gradeKey).toBe("sixiang");

		// XX-10 thunder synergy: Zidian is seated anywhere from tempering 3, links +1 from tempering 1, +8% per tier
		var zSlots = ["qingping", "zidian", "", "", ""];
		var zInt = {zidian: 3, qingping: 1};
		var z0 = cult.computeSwordFormation(zSlots, zInt, 0);
		expect(z0.open).toBe(3);
		expect(z0.score).toBe(3 + 6 + 1);
		expect(z0.thunderLinks).toBe(0);
		var z1 = cult.computeSwordFormation(zSlots, zInt, 1);
		expect(z1.score).toBe(11);
		expect(z1.thunderLinks).toBe(1);
		expect(z1.links[0].thunder).toBe(true);
		var z3 = cult.computeSwordFormation(zSlots, zInt, 3);
		expect(z3.seated).toBe(1);
		expect(z3.score).toBe(3 + 9 + 2);
		expect(z3.pieces[1].mult).toBeCloseTo(1.5 * 1.24, 9);
		expect(z3.channels.dmg).toBeCloseTo(0.006 * 3 * 1.86, 9);
		expect(cult.computeSwordFormation(["", "zidian", "", "", ""], {zidian: 3}, 9).channels.dmg).toBeCloseTo(0.006 * 3 * 1.5 * 1.72, 9);

		// Interactive arrangement
		cult.riftFloor = 35;
		setIntents(cult, {qingping: 2, chixiao: 2});
		expect(cult.getSwordSlotsOpen()).toBe(3);
		expect(cult.selectSwordManual("taie")).toBe(false);	// not learned
		expect(cult.selectSwordManual("chixiao")).toBe(true);
		expect(cult.selectSwordManual("chixiao")).toBe(true);	// toggles off
		expect(cult.swordTomb.selected).toBe("");
		expect(cult.selectSwordManual("")).toBe(false);
		expect(cult.applySwordManual(2)).toBe(false);	// nothing selected, empty seat
		cult.selectSwordManual("chixiao");
		expect(cult.applySwordManual(2)).toBe(true);
		expect(cult.swordTomb.slots[2]).toBe("chixiao");
		expect(cult.swordTomb.lastNote).toContain("swordtomb.note.place");
		expect(cult.applySwordManual(3)).toBe(false);	// fourth seat still sealed
		cult.selectSwordManual("qingping");
		expect(cult.applySwordManual(1)).toBe(true);
		var f = cult.computeSwordFormation();
		expect(f.seated).toBe(2);
		expect(f.links[4].state).toBe("resonant");	// east–south ring link
		expect(f.score).toBe(6 + 6 + 2);
		expect(cult.swordTomb.peakGrade).toBe(1);
		expect(cult.swordIntentTier).toBe(1);	// the seal follows the best formation at once
		// Moving a placed sword swaps seats
		cult.selectSwordManual("chixiao");
		expect(cult.applySwordManual(1)).toBe(true);
		expect(cult.swordTomb.slots.slice(0, 3)).toEqual(["", "chixiao", "qingping"]);
		expect(cult.setSwordSlot(1, "chixiao")).toBe(false);	// no-op
		expect(cult.setSwordSlot(1.5, "chixiao")).toBe(false);
		expect(cult.setSwordSlot(9, "chixiao")).toBe(false);
		expect(cult.setSwordSlot(0, "plasma")).toBe(false);
		expect(cult.setSwordSlot(0, "chixiao")).toBe(true);
		expect(cult.swordTomb.slots.slice(0, 3)).toEqual(["chixiao", "", "qingping"]);
		// Same sword tapped again withdraws it; nothing selected withdraws whatever is there
		expect(cult.applySwordManual(0)).toBe(true);
		expect(cult.swordTomb.slots[0]).toBe("");
		cult.selectSwordManual("chixiao");	// toggles the selection off
		expect(cult.swordTomb.selected).toBe("");
		expect(cult.applySwordManual(2)).toBe(true);
		expect(cult.swordTomb.slots[2]).toBe("");
		expect(cult.swordTomb.lastNote).toContain("swordtomb.note.withdraw");
		cult.setSwordSlot(0, "qingping");
		expect(cult.clearSwordFormation()).toBe(true);
		expect(cult.swordTomb.slots).toEqual(EMPTY5);
		expect(cult.clearSwordFormation()).toBe(false);
		expect(cult.swordTomb.peakGrade).toBe(1);

		// Full mastery reaches the top grade through the real API
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.computeSwordFormation().gradeKey).toBe("wanjian");
		expect(cult.swordTomb.peakGrade).toBe(5);
		expect(cult.swordIntentTier).toBe(5);
	});

	test("Formation effects: Rift 26F+ only, grade strength × seal, each line capped; thunder pursuit stays 0.795", function(){
		var cult = game.cultivation;
		cult.setIdentity("剑无名", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;

		var base25 = cult.getImmortalCaveBonuses(25);
		var base26 = cult.getImmortalCaveBonuses(26);
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.swordIntentTier).toBe(5);	// this life's best formation already counts as the seal
		cult.swordIntentTier = 0;	// measure the bare formation first
		expect(cult.getSwordFormationEffect(25).riftDmg).toBe(0);
		expect(cult.getSwordFormationEffect(0).riftCrit).toBe(0);
		var e = cult.getSwordFormationEffect(26);
		expect(e.highRift).toBe(true);
		expect(e.grade).toBe(5);
		expect(e.rawDmg).toBeCloseTo(0.075375 * 1.05, 9);
		expect(e.riftDmg).toBeCloseTo(0.075375 * 1.05, 9);
		expect(e.riftCrit).toBeCloseTo(0.03375 * 1.05, 9);
		expect(e.rawHp).toBeCloseTo(0.061875 * 1.05, 9);
		expect(e.riftHp).toBeCloseTo(0.06, 9);
		expect(e.mitigation).toBeCloseTo(0.0082125 * 1.05, 9);
		expect(e.capped).toBe(true);
		var w25 = cult.getImmortalCaveBonuses(25);
		var w26 = cult.getImmortalCaveBonuses(26);
		expect(w25.riftDmgMult).toBeCloseTo(base25.riftDmgMult, 9);
		expect(w25.riftCritChance).toBeCloseTo(base25.riftCritChance, 9);
		expect(w26.riftDmgMult / base26.riftDmgMult).toBeCloseTo(1 + e.riftDmg, 9);
		expect(w26.riftHpMult / base26.riftHpMult).toBeCloseTo(1.06, 9);
		expect(w26.riftCritChance - base26.riftCritChance).toBeCloseTo(e.riftCrit, 9);
		// Preview with explicit slots works even for other layouts
		expect(cult.getSwordFormationEffect(26, EMPTY5).riftDmg).toBe(0);
		// The seal multiplies everything, but caps hold
		cult.swordIntentTier = 5;
		var s = cult.getSwordFormationEffect(31);
		expect(s.sealMult).toBeCloseTo(1.20, 9);
		expect(s.riftDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);
		expect(s.riftCrit).toBeCloseTo(cult.XX14_CRIT_CAP, 9);
		expect(s.riftHp).toBeCloseTo(cult.XX14_HP_CAP, 9);
		expect(s.mitigation).toBeCloseTo(cult.XX14_MIT_CAP, 9);
		// Zidian in place of Qingping with full tempering: offence capped too
		cult.thunderPool.tier = 9;
		setSlots(cult, ["xuanyuan", "zidian", "chixiao", "taie", "zhanlu"]);
		var zf = cult.computeSwordFormation();
		expect(zf.seated).toBe(5);
		expect(zf.thunderLinks).toBe(3);
		expect(zf.score).toBe(67);
		expect(cult.getSwordFormationEffect(30).riftDmg).toBeCloseTo(cult.XX14_DMG_CAP, 9);

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
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		setSlots(cult, ["xuanyuan", "zidian", "chixiao", "taie", "zhanlu"]);
		cult.swordIntentTier = 5;
		var after = cult.getImmortalCaveBonuses(31);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);
		for (var bk in after){
			if (after.hasOwnProperty(bk)){ expect(isFinite(after[bk])).toBe(true); }
		}

		// Mortal life: nothing
		cult.immortalAscended = false;
		expect(cult.getSwordFormationEffect(30).riftDmg).toBe(0);
	});

	test("Penglai mirages: timer, fading, injectable chain pick, deterministic branches and rewards into existing systems", function(){
		var cult = game.cultivation;
		cult.setIdentity("徐福", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		["xianyuan", "relic", "starchart", "timeCrystal"].forEach(function(n){ game.resPool.get(n).value = 1000; });	// room below any storage cap
		game.resPool.get("xiuwei").value = 0;
		var pl = cult.penglai;
		expect(pl).toEqual(cult.makeDefaultPenglai());
		expect(cult.PENGLAI_CHAINS.length).toBe(4);
		cult.PENGLAI_CHAINS.forEach(function(ch){
			expect(ch.steps.length).toBe(3);
			ch.steps.forEach(function(st){ expect(st.opts.length).toBe(2); });
		});

		// Timer: 2400 calm ticks raise a mirage; it lingers 1800 ticks unless entered
		cult.penglaiRandom = function(){ return 0.1; };
		cult.tickPenglai(2399);
		expect(pl.mirage).toBe(null);
		expect(pl.charge).toBe(2399);
		cult.tickPenglai(1);
		expect(pl.mirage).toEqual({chain: "market", step: 0, ticksLeft: 1800, entered: false});
		expect(pl.charge).toBe(0);
		expect(pl.lastNote).toContain("penglai.note.rise");
		cult.tickPenglai(1000);
		expect(pl.charge).toBe(0);	// no charge while a mirage is up
		expect(pl.mirage.ticksLeft).toBe(800);
		cult.tickPenglai(800);
		expect(pl.mirage).toBe(null);
		expect(pl.faded).toBe(1);
		expect(pl.lastChain).toBe("market");
		expect(pl.lastNote).toContain("penglai.note.fade");
		// The next mirage never repeats the last chain
		expect(cult.spawnPenglaiMirage(0)).toBe(true);
		expect(pl.mirage.chain).toBe("isle");
		expect(cult.spawnPenglaiMirage(0)).toBe(false);	// one at a time
		expect(cult.leavePenglaiMirage()).toBe(true);
		expect(pl.faded).toBe(2);
		expect(cult.leavePenglaiMirage()).toBe(false);
		expect(cult.spawnPenglaiMirage(0.99)).toBe(true);
		expect(pl.mirage.chain).toBe("dragon");
		cult.leavePenglaiMirage();

		// Chances are deterministic from the formation / thunder / feng shui; luck is 50%
		expect(cult.getPenglaiChance("luck")).toBe(0.5);
		expect(cult.getPenglaiChance("sword")).toBe(0.3);
		expect(cult.getPenglaiChance("thunder")).toBe(0.3);
		expect(cult.getPenglaiChance("fengshui")).toBe(0.3);
		cult.thunderPool.tier = 9;
		expect(cult.getPenglaiChance("thunder")).toBeCloseTo(0.84, 9);
		cult.riftFloor = 35;
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.getPenglaiChance("sword")).toBeCloseTo(0.8, 9);

		// Market chain, toll path: pay 30 Essence → stall → star charts → linger succeeds (roll 0.2 < 0.5)
		pl.lastChain = "";
		expect(cult.spawnPenglaiMirage(0)).toBe(true);
		expect(pl.mirage.chain).toBe("market");
		expect(cult.choosePenglaiOption("bogus", 0)).toBe(false);
		expect(cult.choosePenglaiOption("chart", 0)).toBe(false);	// belongs to the next scene
		var xy0 = game.resPool.get("xianyuan").value;
		var r1 = cult.choosePenglaiOption("toll");
		expect(r1.ok).toBe(true);
		expect(r1.roll).toBe(null);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 30);
		expect(pl.mirage.entered).toBe(true);
		expect(pl.mirage.step).toBe(1);
		expect(pl.visited).toBe(1);
		var sc0 = game.resPool.get("starchart").value;
		cult.choosePenglaiOption("chart");
		expect(game.resPool.get("starchart").value).toBe(sc0 + 8);
		// Entered mirages no longer fade
		cult.tickPenglai(5000);
		expect(pl.mirage.step).toBe(2);
		var tc0 = game.resPool.get("timeCrystal").value;
		var rl0 = game.resPool.get("relic").value;
		var r3 = cult.choosePenglaiOption("linger", 0.2);
		expect(r3.ok).toBe(true);
		expect(r3.finished).toBe(true);
		expect(game.resPool.get("timeCrystal").value).toBe(tc0 + 4);
		expect(game.resPool.get("relic").value).toBe(rl0 + 8);
		expect(pl.mirage).toBe(null);
		expect(pl.completed).toBe(1);
		expect(pl.log.length).toBe(3);
		expect(pl.log[0]).toEqual({c: "market", s: 2, o: "linger", ok: true});
		expect(pl.lastNote).toContain("penglai.note.done");

		// Market chain, sword path that fails: the roll above the chance ends the visit early with clam-sand
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0);
		var cin0 = cult.talismanWorkshop.cinnabar;
		var rf = cult.choosePenglaiOption("pierce", 0.9);
		expect(rf.ok).toBe(false);
		expect(rf.chance).toBeCloseTo(0.8, 9);
		expect(rf.ended).toBe(true);
		expect(rf.finished).toBe(false);
		expect(cult.talismanWorkshop.cinnabar).toBe(cin0 + 2);
		expect(pl.completed).toBe(1);
		expect(pl.visited).toBe(2);
		// The same roll under the chance succeeds: same input, same branch
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0);
		expect(cult.choosePenglaiOption("pierce", 0.79).ok).toBe(true);
		expect(pl.mirage.step).toBe(1);
		var hd = 30;
		cult.heartDemon = hd;
		var xw0 = game.resPool.get("xiuwei").value;
		cult.choosePenglaiOption("peach");
		expect(cult.heartDemon).toBe(hd - cult.PENGLAI_PEACH_CALM);
		expect(game.resPool.get("xiuwei").value).toBeGreaterThan(xw0);
		expect(pl.peaches).toBe(1);
		cult.choosePenglaiOption("depart");
		expect(pl.completed).toBe(2);

		// Isle chain: sword duel deepens the shallowest learned sword; tea gives Go insight; shell speeds the next mirage
		setIntents(cult, {qingping: 3, chixiao: 1});
		cult.swordTomb.slots = EMPTY5.slice(0);
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0.3);
		expect(pl.mirage.chain).toBe("isle");
		cult.choosePenglaiOption("bow");
		var rd = cult.choosePenglaiOption("duel", 0);
		expect(rd.ok).toBe(true);
		expect(cult.getSwordIntent("chixiao")).toBe(2);
		expect(rd.gains[0]).toEqual({kind: "relic", n: 6});
		expect(rd.gains[1]).toEqual({kind: "intent", n: 1, sword: "chixiao", level: 2});
		cult.penglai.charge = 0;
		cult.choosePenglaiOption("shell");
		expect(pl.charge).toBe(1200);
		expect(pl.completed).toBe(3);
		cult.starGo.insight = 0;
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0.3);
		cult.choosePenglaiOption("bow");
		cult.choosePenglaiOption("tea");
		expect(cult.starGo.insight).toBe(1);
		cult.leavePenglaiMirage();
		expect(pl.faded).toBe(3);	// leaving after entering is not a fade

		// Palace chain: thunder-gated gift, herbs into the garden, vault roll on thunder tempering
		cult.thunderPool.tier = 0;
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0.6);
		expect(pl.mirage.chain).toBe("palace");
		var oq = cult.getPenglaiOptionReq("orbs");
		expect(oq.okReq).toBe(false);
		expect(oq.affordable).toBe(false);
		expect(cult.choosePenglaiOption("orbs")).toBe(false);
		cult.thunderPool.tier = 9;
		cult.thunderPool.thunderOrbs = 3;
		var orb0 = cult.thunderPool.thunderOrbs;
		expect(cult.choosePenglaiOption("orbs")).toBeTruthy();
		expect(cult.thunderPool.thunderOrbs).toBe(orb0 - 3);
		var ql0 = cult.herbGarden.stock.qinglian || 0;
		var zz0 = cult.herbGarden.stock.zizhi || 0;
		cult.choosePenglaiOption("herbs");
		expect(cult.herbGarden.stock.qinglian).toBe(ql0 + 1);
		expect(cult.herbGarden.stock.zizhi).toBe(zz0 + 1);
		var rv = cult.choosePenglaiOption("thunder", 0.83);
		expect(rv.ok).toBe(true);
		expect(cult.thunderPool.thunderOrbs).toBe(4);

		// Dragon chain: talisman paper cost (XX-13), geomancy roll, formation roll to intent; nothing left to learn → relic
		pl.lastChain = "";
		cult.spawnPenglaiMirage(0.9);
		expect(pl.mirage.chain).toBe("dragon");
		expect(cult.choosePenglaiOption("read", 0.95).ok).toBe(false);
		expect(pl.mirage.step).toBe(1);	// a failed reading still enters the maze
		cult.talismanWorkshop.paper = 1;
		expect(cult.getPenglaiOptionReq("talisman").okCost).toBe(false);
		cult.talismanWorkshop.paper = 5;
		setIntents(cult, FULL_INTENTS);
		cult.choosePenglaiOption("talisman");
		expect(cult.talismanWorkshop.paper).toBe(3);
		cult.choosePenglaiOption("peach");
		expect(pl.completed).toBe(5);
		var g = cult.grantPenglaiReward("intent", 1);
		expect(g).toEqual({kind: "relic", n: cult.PENGLAI_INTENT_FALLBACK});

		// Rift 26F+ clears stir the sea
		pl.charge = 0;
		expect(cult.onPenglaiRiftVictory(25)).toBe(0);
		expect(cult.onPenglaiRiftVictory(30)).toBe(240);
		pl.charge = 2399;
		expect(cult.onPenglaiRiftVictory(30)).toBe(0);
	});

	test("Offline: elapsed time counts toward the next mirage but at most one interval; a risen mirage waits; save/load uses the injected clock", function(){
		var cult = game.cultivation;
		cult.setIdentity("安期生", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.penglaiRandom = function(){ return 0.6; };
		var pl = cult.penglai;

		expect(cult.applyPenglaiOffline(5000)).toBe(0);	// under 10 s: ignored
		expect(cult.applyPenglaiOffline(-50000)).toBe(0);
		expect(cult.applyPenglaiOffline(NaN)).toBe(0);
		expect(cult.applyPenglaiOffline(60000)).toBe(300);
		expect(pl.charge).toBe(300);
		expect(cult.applyPenglaiOffline(7 * 24 * 3600 * 1000)).toBe(2400);
		expect(pl.mirage.chain).toBe("palace");
		expect(pl.charge).toBe(300);
		expect(pl.mirage.ticksLeft).toBe(1800);
		expect(cult.applyPenglaiOffline(3600 * 1000)).toBe(0);	// a waiting mirage does not fade offline
		expect(pl.mirage.ticksLeft).toBe(1800);

		// Through save/load with an injected clock
		cult.leavePenglaiMirage();
		pl.charge = 100;
		var now = 1700000000000;
		cult.penglaiClock = function(){ return now; };
		var sv = {};
		cult.save(sv);
		expect(sv.cultivation.penglai.savedAt).toBe(now);
		var json = JSON.parse(JSON.stringify(sv));
		now += 2 * 60 * 1000;	// two minutes away → 600 ticks
		cult.resetState();
		cult.load(json);
		expect(cult.penglai.savedAt).toBeUndefined();
		expect(cult.penglai.charge).toBe(700);
		expect(cult.penglai.mirage).toBe(null);
		var sv2 = {};
		cult.save(sv2);
		now += 24 * 3600 * 1000;	// a whole day away still raises only one mirage
		cult.resetState();
		cult.load(JSON.parse(JSON.stringify(sv2)));
		expect(cult.penglai.mirage).not.toBe(null);
		expect(cult.penglai.mirage.ticksLeft).toBe(1800);
		expect(cult.penglai.charge).toBe(700);
		expect(cult.penglai.faded).toBe(1);

		// Mortals gain nothing offline
		cult.immortalAscended = false;
		expect(cult.applyPenglaiOffline(3600 * 1000)).toBe(0);
	});

	test("Rebirth: the swordIntentTier seal survives (and adds an imprint at Heavenly Dipper or six completed mirages); tomb and mirages reset", function(){
		var cult = game.cultivation;
		cult.setIdentity("谢云流", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.riftFloor = 35;
		setIntents(cult, FULL_INTENTS);
		setSlots(cult, CLASSIC);
		expect(cult.swordIntentTier).toBe(5);
		cult.penglai.charge = 900;

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.swordIntentTier).toBe(5);
		expect(rebirth.cultivation.swordTomb).toBeUndefined();
		expect(rebirth.cultivation.penglai).toBeUndefined();
		var imprintWith = rebirth.cultivation.immortalImprint || 0;

		// Same life without a formation → no seal, one imprint fewer
		var keepSlots = cult.swordTomb.slots.slice(0);
		cult.swordTomb.slots = EMPTY5.slice(0);
		cult.swordTomb.peakGrade = 0;
		cult.swordIntentTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.swordIntentTier).toBeUndefined();
		expect(imprintWith).toBe((rebirthPlain.cultivation.immortalImprint || 0) + 1);
		// Six completed mirages earn the same imprint
		cult.penglai.visited = 6;
		cult.penglai.completed = 6;
		game.save();
		var rebirthMirage = game._resetInternal();
		expect(rebirthMirage.cultivation.immortalImprint || 0).toBe(imprintWith);
		cult.penglai.completed = 0;
		cult.swordTomb.slots = keepSlots;

		cult.resetState();
		expect(cult.swordIntentTier).toBe(0);
		expect(cult.swordTomb).toEqual(cult.makeDefaultSwordTomb());
		expect(cult.penglai).toEqual(cult.makeDefaultPenglai());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.swordIntentTier).toBe(5);
		expect(cult.swordTomb.slots).toEqual(EMPTY5);
		expect(cult.getSwordTotalIntent()).toBe(0);
		expect(cult.penglai.charge).toBe(0);
		var seal = cult.getSwordSealBonus();
		expect(seal.tier).toBe(5);
		expect(seal.xiuweiRatio).toBeCloseTo(0.15, 9);
		expect(seal.costCut).toBeCloseTo(0.25, 9);
		expect(seal.formationMult).toBeCloseTo(1.20, 9);
		expect(seal.freeIntent).toBe(2);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.comprehendAncientSword("qingping")).toBe(false);	// still mortal

		// Next ascension: Qingping intent carried over, cheaper comprehension
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.getSwordIntent("qingping")).toBe(2);
		expect(cult.getSwordComprehendReq("qingping").xianyuan).toBe(Math.round(60 * 3.5 * 0.75));
		cult.riftFloor = 27;
		expect(cult.getSwordComprehendReq("chixiao").xianyuan).toBe(60);
		expect(cult.getSwordComprehendReq("chixiao").relic).toBe(Math.round(10 * 0.75));
		// Granted once, not re-granted on load
		cult.swordTomb.intents.qingping = 0;
		cult.swordTomb.comprehends = 1;
		var again = {};
		cult.save(again);
		cult.load(JSON.parse(JSON.stringify(again)));
		expect(cult.getSwordIntent("qingping")).toBe(0);

		// The seal persists through another life (max of previous seal)
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.swordIntentTier).toBe(5);
	});

	test("Old saves (XX-13 era and earlier) and corrupted XX-14 fields load cleanly; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("风清扬", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		// XX-13-era save: no XX-14 fields
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.swordTomb;
		delete oldSave.cultivation.penglai;
		delete oldSave.cultivation.swordIntentTier;
		expect(oldSave.cultivation.fengshui).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.swordTomb).toEqual(cult.makeDefaultSwordTomb());
		expect(cult.penglai).toEqual(cult.makeDefaultPenglai());
		expect(cult.swordIntentTier).toBe(0);
		expect(function(){ cult.tickPenglai(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);
		expect(cult.comprehendAncientSword("qingping")).toBe(true);

		// Ancient save (pre XX-12 / XX-13 / XX-14)
		var ancientSave = {};
		cult.save(ancientSave);
		["starGo", "auctionHouse", "starGoTier", "fengshui", "talismanWorkshop", "fengshuiTier", "swordTomb", "penglai", "swordIntentTier"].forEach(function(k){
			delete ancientSave.cultivation[k];
		});
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.computeSwordFormation().grade).toBe(0);
		expect(cult.getPenglaiChance("fengshui")).toBe(0.3);

		// Mortal save
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.swordTomb;
		delete mortalSave.cultivation.penglai;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.comprehendAncientSword("qingping")).toBe(false);
		expect(function(){ cult.tickPenglai(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.swordTomb = {
			intents: {qingping: 99, chixiao: -2, zidian: "x", taie: 2.7, zhanlu: 1, xuanyuan: 0, bogus: 3},
			slots: ["qingping", "qingping", "xuanyuan", "taie", "zhanlu", "chixiao", 7],
			selected: "xuanyuan", peakGrade: 99, comprehends: -1, rearranges: "x", lastNote: 5
		};
		badSave.cultivation.penglai = {
			charge: 1e9, lastChain: "atlantis", visited: 2, completed: 9, faded: -1, peaches: "x",
			mirage: {chain: "isle", step: 2, ticksLeft: 1e9, entered: false},
			log: [{c: "market", s: 0, o: "toll", ok: true}, {c: "market", s: 0, o: "chart", ok: true}, {c: "nope", s: 0, o: "toll"}, "x",
				{c: "isle", s: 1, o: "duel", ok: 1}, {c: "dragon", s: 2, o: "peach", ok: true}, {c: "palace", s: 0, o: "orbs", ok: false}, {c: "market", s: 1, o: "peach", ok: true}],
			savedAt: "soon"
		};
		badSave.cultivation.swordIntentTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		var st = cult.swordTomb;
		expect(st.intents).toEqual({qingping: 3, chixiao: 0, zidian: 0, taie: 2, zhanlu: 1, xuanyuan: 0});
		expect(cult.getSwordSlotsOpen()).toBe(3);
		expect(st.slots).toEqual(["qingping", "", "", "", ""]);
		expect(st.selected).toBe("");
		expect(st.peakGrade).toBe(5);
		expect(st.comprehends).toBe(0);
		expect(st.rearranges).toBe(0);
		expect(st.lastNote).toBe("");
		expect(cult.swordIntentTier).toBe(5);
		var pl = cult.penglai;
		expect(pl.charge).toBe(2399);
		expect(pl.lastChain).toBe("");
		expect(pl.visited).toBe(2);
		expect(pl.completed).toBe(2);
		expect(pl.faded).toBe(0);
		expect(pl.peaches).toBe(0);
		expect(pl.mirage).toEqual({chain: "isle", step: 0, ticksLeft: 1800, entered: false});
		expect(pl.log).toEqual([
			{c: "market", s: 0, o: "toll", ok: true},
			{c: "isle", s: 1, o: "duel", ok: false},
			{c: "dragon", s: 2, o: "peach", ok: true},
			{c: "palace", s: 0, o: "orbs", ok: false}
		]);
		// A faded unentered mirage is dropped; an entered one keeps its scene
		badSave.cultivation.penglai = {mirage: {chain: "market", step: 1, ticksLeft: 0, entered: false}};
		badSave.cultivation.swordTomb = "broken";
		badSave.cultivation.swordIntentTier = "x";
		cult.resetState();
		cult.load(badSave);
		expect(cult.penglai.mirage).toBe(null);
		expect(cult.swordTomb).toEqual(cult.makeDefaultSwordTomb());
		expect(cult.swordIntentTier).toBe(0);
		badSave.cultivation.penglai = {mirage: {chain: "dragon", step: 9, ticksLeft: 0, entered: true}};
		cult.resetState();
		cult.load(badSave);
		expect(cult.penglai.mirage).toEqual({chain: "dragon", step: 2, ticksLeft: 1, entered: true});

		// Roundtrip: progress → save → JSON → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.riftFloor = 30;
		cult.comprehendAncientSword("qingping");
		cult.comprehendAncientSword("qingping");
		cult.comprehendAncientSword("chixiao");
		cult.comprehendAncientSword("chixiao");
		expect(cult.setSwordSlot(1, "qingping")).toBe(true);
		expect(cult.setSwordSlot(0, "chixiao")).toBe(true);
		cult.spawnPenglaiMirage(0.3);
		cult.choosePenglaiOption("bow");
		cult.tickPenglai(77);
		var clock = 1700000000000;
		cult.penglaiClock = function(){ return clock; };
		var snapSt = cult.normalizeSwordTomb(JSON.parse(JSON.stringify(cult.swordTomb)));
		var snapPl = cult.normalizePenglai(JSON.parse(JSON.stringify(cult.penglai)));
		var snapTier = cult.swordIntentTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.swordTomb).toEqual(snapSt);
		expect(cult.penglai).toEqual(snapPl);
		expect(cult.swordIntentTier).toBe(snapTier);
		expect(cult.penglai.mirage.entered).toBe(true);
		expect(cult.penglai.mirage.step).toBe(1);
		expect(cult.computeSwordFormation().placed).toBe(2);
	});

	test("Panel renders in the cultivation tab: formation board, manuals, ancient swords, mirage scene, effects; clicks work through event delegation; ?v=83 art; no raw placeholders", function(){
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
			if (el && el.addEventListener && evt === "onclick" && el.className && String(el.className).indexOf("xxSwordTombArena") >= 0){
				el.addEventListener("click", fn);
			}
		};
		// Real dictionaries for this test, so placeholders and keys are checked end to end
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
				return v.replace(/\{(\d)\}/g, function(m, d){ return (args && args[+d] !== undefined) ? String(args[+d]) : m; });
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
			cult.penglaiRandom = function(){ return 0.1; };
			var tab = game.cultivationTab;
			expect(tab instanceof classes.tab.CultivationTab).toBe(true);
			var host = document.createElement("div");
			document.body.appendChild(host);
			tab.render(host);
			tab.update();
			var el = host.querySelector(".xxSwordTombArena");
			expect(el).not.toBe(null);
			expect(el.style.display).toBe("block");
			expect(el.querySelectorAll(".xxSwSlot").length).toBe(5);
			expect(el.querySelectorAll(".xxSwSlot.is-locked").length).toBe(3);
			expect(el.querySelectorAll(".xxSwLink").length).toBe(4);
			expect(el.querySelectorAll(".xxSwSword").length).toBe(6);
			expect(el.querySelectorAll("[data-xx-sword=comprehend]").length).toBe(6);
			expect(el.querySelectorAll(".xxSwManual").length).toBe(0);
			expect(el.querySelectorAll(".xxSwChan").length).toBe(4);
			expect(el.querySelector(".xxPenglaiScene.is-calm")).not.toBe(null);
			expect(el.querySelectorAll(".xxPenglaiAtlasRow").length).toBe(4);
			var checkImgs = function(minCount, required){
				var imgs = el.querySelectorAll("img");
				expect(imgs.length).toBeGreaterThan(minCount);
				var seenArt = {};
				for (var i = 0; i < imgs.length; i++){
					expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
					expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(83);
					expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
					seenArt[imgs[i].getAttribute("src").split("?")[0]] = true;
				}
				required.forEach(function(n){
					expect(seenArt["res/art/" + n + ".webp"]).toBe(true);
				});
			};
			checkImgs(8, ["sword_tomb", "ancient_sword", "sword_manual", "penglai_isle", "mirage_shell", "immortal_peach"]);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).toContain("太虚剑冢");
			expect(cult.isSwordTombEn()).toBe(false);

			var click = function(sel){
				var t = el.querySelector(sel);
				expect(t).not.toBe(null);
				t.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			};
			// Comprehend → manual appears → select → place in its seat
			click("[data-xx-sword=comprehend][data-xx-arg=qingping]");
			expect(cult.getSwordIntent("qingping")).toBe(1);
			expect(el.querySelectorAll(".xxSwManual").length).toBe(1);
			expect(el.querySelector(".xxSwManual.is-active")).not.toBe(null);	// auto-selected
			click("[data-xx-sword=comprehend][data-xx-arg=chixiao]");
			click("[data-xx-sword=comprehend][data-xx-arg=chixiao]");
			expect(cult.getSwordSlotsOpen()).toBe(2);
			click("[data-xx-sword=place][data-xx-arg=\"1\"] .xxSwSlotName");	// bubbling from an inner span
			expect(cult.swordTomb.slots[1]).toBe("qingping");
			expect(el.querySelectorAll(".xxSwSlot.has-sword").length).toBe(1);
			expect(el.querySelectorAll(".xxSwSlot.is-seated").length).toBe(1);
			click("[data-xx-sword=select][data-xx-arg=chixiao]");
			expect(cult.swordTomb.selected).toBe("chixiao");
			click("[data-xx-sword=place][data-xx-arg=\"0\"]");
			expect(cult.swordTomb.slots[0]).toBe("chixiao");
			expect(el.querySelectorAll(".xxSwSlot.spoke-joined").length).toBe(1);
			expect(el.querySelectorAll(".xxSwBlade img").length).toBe(2);
			// Locked seats ignore clicks
			var locked = el.querySelector(".xxSwSlot.is-locked");
			locked.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			expect(cult.swordTomb.slots[2]).toBe("");
			click("[data-xx-sword=clear]");
			expect(cult.swordTomb.slots[0]).toBe("");

			// A mirage rises: choose options through the panel
			cult.spawnPenglaiMirage(0);
			tab._swordSig = "";
			tab.update();
			expect(el.querySelector(".xxPenglaiScene.is-market")).not.toBe(null);
			expect(el.querySelectorAll("[data-xx-penglai=choose]").length).toBe(2);
			expect(el.querySelectorAll(".xxPenglaiDots > i").length).toBe(3);
			click("[data-xx-penglai=choose][data-xx-arg=toll]");
			expect(cult.penglai.mirage.step).toBe(1);
			expect(el.querySelector(".xxPenglaiScene.is-entered")).not.toBe(null);
			click("[data-xx-penglai=choose][data-xx-arg=peach]");
			expect(cult.penglai.peaches).toBe(1);
			expect(el.querySelectorAll(".xxPenglaiLog.is-ok").length).toBe(2);
			click("[data-xx-penglai=leave]");
			expect(cult.penglai.mirage).toBe(null);
			expect(el.querySelector(".xxPenglaiScene.is-calm")).not.toBe(null);
			// Disabled option does nothing (palace orbs gift without thunder)
			cult.thunderPool.tier = 0;
			cult.penglai.lastChain = "";
			cult.spawnPenglaiMirage(0.6);
			tab._swordSig = "";
			tab.update();
			expect(el.querySelectorAll("[data-xx-penglai=choose]").length).toBe(1);
			expect(el.querySelectorAll(".xxPenglaiOpt.is-disabled").length).toBe(1);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(cult.swordTomb.lastNote).toContain("收剑");
			expect(cult.penglai.lastNote).toContain("海市");
			// English pass over the same state
			useLang("en");
			tab._swordSig = "";
			tab.update();
			expect(cult.isSwordTombEn()).toBe(true);
			expect(el.innerHTML).not.toMatch(rawRe);
			expect(el.textContent).toContain("Dragon Palace Banquet");
			expect(el.textContent).toContain("Rift damage");

			// Mortal with a past-life seal: locked notice only
			cult.resetState();
			cult.swordIntentTier = 3;
			tab._swordSig = "";
			tab.update();
			expect(el.style.display).toBe("block");
			expect(el.className).toContain("is-locked");
			expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
			expect(el.querySelectorAll(".xxSwSlot").length).toBe(0);
		} finally {
			global.dojo.connect = origConnect;
			global.$I = origI;
		}
	});

	test("XX-14 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 83", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(83);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(83);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var assets = [
			"res/art/sword_tomb.webp",
			"res/art/ancient_sword.webp",
			"res/art/sword_manual.webp",
			"res/art/penglai_isle.webp",
			"res/art/mirage_shell.webp",
			"res/art/immortal_peach.webp"
		];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
			expect(cultSrc).toContain(assets[i]);
		}
		expect(cultSrc).not.toMatch(/\?v=82\b/);
		expect(cultSrc).not.toContain("ART_VER || \"82\"");
		var xx14Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalSwordEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx14Ui.length).toBeGreaterThan(1000);
		expect(xx14Ui).not.toContain("<svg");
		expect(xx14Ui).not.toContain("<canvas");
		expect(xx14Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		var xx14Logic = cultSrc.slice(cultSrc.indexOf("XX-14 太虚剑冢万剑归宗与蓬莱海市奇遇"), cultSrc.indexOf("getImmortalCaveBonuses: function(riftFloorOpt){"));
		expect(xx14Logic.length).toBeGreaterThan(1000);
		expect(xx14Logic).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html", "build.version.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxSwordTombArena");
		expect(css).toContain(".xxSwBoard");
		expect(css).toContain(".xxPenglaiScene");
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxSwChanList/);
		expect(css).toMatch(/@media \(max-width: 920px\)\s*\{\s*\.xxSwLowerGrid/);
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxSwConsole/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.swordtomb.", "cultivation.penglai."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(250);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(/[一-鿿]/.test(zh[zhKeys[pk]])).toBe(true);
		}
		expect(en["cultivation.swordtomb.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var need = [];
		cult.ANCIENT_SWORDS.forEach(function(s){
			need.push("cultivation.swordtomb.sword." + s.key + ".label", "cultivation.swordtomb.sword." + s.key + ".short", "cultivation.swordtomb.sword." + s.key + ".desc", "cultivation.swordtomb.dir." + s.dir);
		});
		cult.SWORD_POSITIONS.forEach(function(p){ need.push("cultivation.swordtomb.pos." + p.key + ".label", "cultivation.swordtomb.pos." + p.key + ".dir"); });
		cult.SWORD_GRADES.forEach(function(g){ need.push("cultivation.swordtomb.grade." + g.key); });
		[0, 1, 2, 3].forEach(function(l){ need.push("cultivation.swordtomb.intent." + l); });
		["joined", "resonant", "thunderMark"].forEach(function(l){ need.push("cultivation.swordtomb.link." + l); });
		["dmg", "crit", "hp", "mit"].forEach(function(c){ need.push("cultivation.swordtomb.chan." + c); });
		cult.PENGLAI_REWARD_ORDER.forEach(function(r){ need.push("cultivation.penglai.rname." + r); });
		["xianyuan", "relic", "starchart", "timeCrystal", "cinnabar", "paper", "orbs", "herb", "daoLaw", "insight", "peach", "intent", "charge"].forEach(function(r){ need.push("cultivation.penglai.reward." + r); });
		cult.PENGLAI_COST_ORDER.forEach(function(c){ need.push("cultivation.penglai.cost." + c); });
		["sword", "thunder", "fengshui", "luck"].forEach(function(c){ need.push("cultivation.penglai.kind." + c); });
		cult.PENGLAI_CHAINS.forEach(function(ch){
			need.push("cultivation.penglai.chain." + ch.key + ".title", "cultivation.penglai.chain." + ch.key + ".blurb");
			ch.steps.forEach(function(st){
				var sb = "cultivation.penglai.chain." + ch.key + "." + st.key;
				need.push(sb + ".title", sb + ".desc");
				st.opts.forEach(function(o){
					need.push(sb + "." + o.key, sb + "." + o.key + ".win");
					if (o.chance){ need.push(sb + "." + o.key + ".lose"); }
					// every branch points at a real scene or ends the visit
					expect(o.next === -1 || (o.next >= 0 && o.next < ch.steps.length)).toBe(true);
					if (o.chance){ expect(o.loseNext === -1 || (o.loseNext >= 0 && o.loseNext < ch.steps.length)).toBe(true); }
				});
			});
		});
		for (var n = 0; n < need.length; n++){
			expect(zh[need[n]]).toBeTruthy();
			expect(en[need[n]]).toBeTruthy();
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
