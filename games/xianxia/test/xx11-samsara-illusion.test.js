/* global test, expect, game, describe, beforeEach, afterEach, jest, classes */

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

//闯过当前幻境一重:观心掷点 0(心魔最低),直至该重破境
function clearOneLayer(cult){
	var it = cult.illusionTrial;
	if (!it.run){
		expect(cult.enterIllusion()).toBe(true);
	}
	var target = it.layer + 1;
	var guard = 0;
	while (cult.illusionTrial.layer < target && guard < 20){
		expect(cult.illusionStep("calm", 0)).toBe(true);
		guard++;
	}
	expect(cult.illusionTrial.layer).toBe(target);
}

function clearLayersTo(cult, layer){
	while (cult.illusionTrial.layer < layer){
		if (cult.illusionTrial.run && cult.illusionTrial.run.demon >= 60){
			cult.leaveIllusion();
		}
		clearOneLayer(cult);
	}
}

describe("XX-11 Six-Paths Samsara Mirror & Taixu Illusion Heart-Demon Trial", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		jest.restoreAllMocks();
	});

	test("Mirror: locked before ascension; human pre-revealed; reveal costs scale and are gated by illusion layers", function(){
		var cult = game.cultivation;
		cult.setIdentity("观音", "f", "scholar");

		expect(cult.revealSamsaraPath("asura")).toBe(false);
		expect(cult.chooseSamsaraPath("human")).toBe(false);
		expect(cult.enterIllusion()).toBe(false);
		expect(cult.illusionStep("calm", 0)).toBe(false);
		expect(cult.getSamsaraActivePath()).toBe(null);
		expect(cult.getSamsaraCombatMult()).toBe(1);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);

		expect(cult.SAMSARA_PATHS.length).toBe(6);
		expect(cult.samsaraMirror.revealed.human).toBe(true);
		expect(cult.getSamsaraRevealedCount()).toBe(1);
		expect(cult.samsaraMirror.activePath).toBe(null);
		expect(cult.illusionTrial).toEqual(cult.makeDefaultIllusionTrial());
		expect(cult.daoHeartTier).toBe(0);
		expect(cult.daoPatterns).toBe(0);
		expect(cult.getSamsaraClarityRatio()).toBeCloseTo(0.02, 6);

		// Already revealed / unknown paths have no reveal request
		expect(cult.getSamsaraRevealReq("human")).toBe(null);
		expect(cult.getSamsaraRevealReq("nirvana")).toBe(null);
		expect(cult.revealSamsaraPath("nirvana")).toBe(false);

		// First extra reveal: 30 Essence + 4 Flux Crystal, asura needs no illusion layer
		var r1 = cult.getSamsaraRevealReq("asura");
		expect(r1.xianyuan).toBe(30);
		expect(r1.timeCrystal).toBe(4);
		expect(r1.reqLayer).toBe(0);
		expect(r1.affordable).toBe(true);
		var xy0 = game.resPool.get("xianyuan").value;
		var tc0 = game.resPool.get("timeCrystal").value;
		expect(cult.revealSamsaraPath("asura")).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 30);
		expect(game.resPool.get("timeCrystal").value).toBe(tc0 - 4);
		expect(cult.samsaraMirror.revealed.asura).toBe(true);
		expect(cult.samsaraMirror.revealCount).toBe(1);
		expect(cult.samsaraMirror.lastNote).toContain("照见前尘");
		expect(cult.getSamsaraClarityRatio()).toBeCloseTo(0.04, 6);

		// Gates: beast 1, preta 2, deva 3, naraka 5 illusion layers
		var gates = {beast: 1, preta: 2, deva: 3, naraka: 5};
		for (var gk in gates){
			var rq = cult.getSamsaraRevealReq(gk);
			expect(rq.reqLayer).toBe(gates[gk]);
			expect(rq.layerOk).toBe(false);
			expect(rq.affordable).toBe(false);
			expect(cult.revealSamsaraPath(gk)).toBe(false);
		}
		// Second extra reveal costs more
		cult.illusionTrial.layer = 5;
		var r2 = cult.getSamsaraRevealReq("beast");
		expect(r2.xianyuan).toBe(50);
		expect(r2.timeCrystal).toBe(6);
		expect(cult.revealSamsaraPath("beast")).toBe(true);
		expect(cult.revealSamsaraPath("preta")).toBe(true);
		expect(cult.revealSamsaraPath("deva")).toBe(true);
		var r5 = cult.getSamsaraRevealReq("naraka");
		expect(r5.xianyuan).toBe(110);
		expect(r5.timeCrystal).toBe(12);
		expect(cult.revealSamsaraPath("naraka")).toBe(true);
		expect(cult.getSamsaraRevealedCount()).toBe(6);
		expect(cult.getSamsaraClarityRatio()).toBeCloseTo(0.12, 6);

		// Poor immortals cannot pay
		cult.resetState();
		cult.prepareImmortalCaveForTest(false);
		game.resPool.get("timeCrystal").value = 0;
		expect(cult.getSamsaraRevealReq("asura").affordable).toBe(false);
		expect(cult.revealSamsaraPath("asura")).toBe(false);
	});

	test("Choosing a path: first choice free, then rising Essence cost (cap 240) and a 1500-tick cooldown", function(){
		var cult = game.cultivation;
		cult.setIdentity("阿修罗", "m", "hunter");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.illusionTrial.layer = 9;
		["asura", "deva", "beast", "preta", "naraka"].forEach(function(k){
			expect(cult.revealSamsaraPath(k)).toBe(true);
		});
		cult.illusionTrial = cult.makeDefaultIllusionTrial();

		// Unrevealed path cannot be chosen
		cult.samsaraMirror.revealed.naraka = false;
		expect(cult.getSamsaraSwitchReq("naraka").revealed).toBe(false);
		expect(cult.chooseSamsaraPath("naraka")).toBe(false);
		cult.samsaraMirror.revealed.naraka = true;

		var first = cult.getSamsaraSwitchReq("asura");
		expect(first.first).toBe(true);
		expect(first.xianyuan).toBe(0);
		var xy0 = game.resPool.get("xianyuan").value;
		expect(cult.chooseSamsaraPath("asura")).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0);
		expect(cult.samsaraMirror.activePath).toBe("asura");
		expect(cult.getSamsaraActivePath()).toBe("asura");
		expect(cult.samsaraMirror.switchCount).toBe(0);
		expect(cult.samsaraMirror.choiceCount).toBe(1);
		expect(cult.samsaraMirror.switchCooldown).toBe(1500);
		expect(cult.samsaraMirror.lastNote).toContain("六道择道");

		// Same path / cooldown blocks switching
		expect(cult.getSamsaraSwitchReq("asura").same).toBe(true);
		expect(cult.chooseSamsaraPath("asura")).toBe(false);
		var blocked = cult.getSamsaraSwitchReq("deva");
		expect(blocked.cooldownOk).toBe(false);
		expect(blocked.xianyuan).toBe(40);
		expect(cult.chooseSamsaraPath("deva")).toBe(false);

		// The mirror cools down with immortal ticks
		cult.tickSamsaraIllusion(1499);
		expect(cult.chooseSamsaraPath("deva")).toBe(false);
		cult.tickSamsaraIllusion(1);
		expect(cult.samsaraMirror.switchCooldown).toBe(0);
		xy0 = game.resPool.get("xianyuan").value;
		expect(cult.chooseSamsaraPath("deva")).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 40);
		expect(cult.samsaraMirror.switchCount).toBe(1);
		expect(cult.samsaraMirror.lastNote).toContain("六道转道");

		// Costs rise by 25 per switch, capped at 240
		var expected = [65, 90, 115, 140, 165, 190, 215, 240, 240, 240];
		var order = ["beast", "preta", "naraka", "human", "asura", "deva", "beast", "preta", "naraka", "human"];
		for (var i = 0; i < expected.length; i++){
			cult.tickSamsaraIllusion(1500);
			var req = cult.getSamsaraSwitchReq(order[i]);
			expect(req.xianyuan).toBe(expected[i]);
			expect(cult.chooseSamsaraPath(order[i])).toBe(true);
		}
		expect(cult.samsaraMirror.switchCount).toBe(11);

		// Live update loop ticks the cooldown too
		var cdBefore = cult.samsaraMirror.switchCooldown;
		cult.update();
		expect(cult.samsaraMirror.switchCooldown).toBeLessThan(cdBefore);

		// Not enough Essence to switch
		cult.tickSamsaraIllusion(1500);
		game.resPool.get("xianyuan").value = 5;
		expect(cult.getSamsaraSwitchReq("asura").affordable).toBe(false);
		expect(cult.chooseSamsaraPath("asura")).toBe(false);
	});

	test("Each path is a distinct trade-off: combat, garden, cultivation, beasts, rift and inner-demon multipliers", function(){
		var cult = game.cultivation;
		cult.setIdentity("六道", "m", "farmer");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.illusionTrial.layer = 9;
		["asura", "deva", "beast", "preta", "naraka"].forEach(function(k){
			expect(cult.revealSamsaraPath(k)).toBe(true);
		});
		cult.illusionTrial = cult.makeDefaultIllusionTrial();
		cult.heartDemon = 0;

		var pick = function(k){
			cult.samsaraMirror.switchCooldown = 0;
			if (cult.samsaraMirror.activePath !== k){
				expect(cult.chooseSamsaraPath(k)).toBe(true);
			}
			game.updateCaches();
			game.calculateAllEffects();
		};

		game.updateCaches();
		game.calculateAllEffects();
		var cp0 = cult.getCombatPower();
		var garden0 = cult.getGardenGrowthRate();
		var xw0 = game.calcResourcePerTick("xiuwei");
		var xy0 = game.calcResourcePerTick("xianyuan");
		var b0 = cult.getImmortalCaveBonuses(30);
		expect(cult.getSamsaraPathEffect().key).toBe(null);

		// 修罗道: combat ×1.20, rift damage & crit up; garden growth -30%, yield -20%
		pick("asura");
		expect(cult.getCombatPower() / cp0).toBeCloseTo(1.20, 6);
		expect(cult.getGardenGrowthRate()).toBeCloseTo(garden0 - 0.30, 6);
		var bA = cult.getImmortalCaveBonuses(30);
		expect(bA.riftDmgMult / b0.riftDmgMult).toBeCloseTo(1.12, 6);
		expect(bA.riftCritChance).toBeCloseTo(b0.riftCritChance + 0.05, 6);
		expect(bA.herbYieldBonus).toBeCloseTo(b0.herbYieldBonus - 0.20, 6);
		expect(game.calcResourcePerTick("xiuwei")).toBeCloseTo(xw0, 6);

		// 天道: cultivation / Essence / production up, combat ×0.85
		pick("deva");
		expect(cult.getCombatPower() / cp0).toBeCloseTo(0.85, 6);
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(xw0);
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(xy0);

		// 人道: small balanced boons, nothing lost
		pick("human");
		expect(cult.getCombatPower() / cp0).toBeCloseTo(1.06, 6);
		expect(cult.getGardenGrowthRate()).toBeCloseTo(garden0 + 0.10, 6);
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(xw0);
		expect(cult.getSamsaraMinggeInfluence("human").sealed).toBe(null);

		// 畜生道: rift HP ×1.20, beasts grow ×1.40, bounty +20%; cultivation -20%
		pick("beast");
		var bB = cult.getImmortalCaveBonuses(30);
		expect(bB.riftHpMult / b0.riftHpMult).toBeCloseTo(1.20, 6);
		expect(bB.bountySpeedBonus).toBeCloseTo(b0.bountySpeedBonus + 0.20, 6);
		expect(cult.getSamsaraNurseryMult()).toBeCloseTo(1.40, 6);
		expect(game.calcResourcePerTick("xiuwei")).toBeLessThan(xw0);
		expect(cult.getCombatPower() / cp0).toBeCloseTo(1, 6);

		// 饿鬼道: Essence +35%, garden yield +25%; illusion demon ×1.30, heart-demon decay -30%
		pick("preta");
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(xy0);
		expect(cult.getIllusionDemonMult()).toBeCloseTo(1.30, 6);
		expect(cult.getImmortalCaveBonuses(30).heartDemonDecayBonus).toBeCloseTo(b0.heartDemonDecayBonus - 0.30, 6);

		// 地狱道: 26F+ mitigation, rift HP ×1.10, illusion demon ×0.70; Essence -20%, cultivation -10%
		pick("naraka");
		var bN = cult.getImmortalCaveBonuses(30);
		expect(bN.riftHpMult / b0.riftHpMult).toBeCloseTo(1.10, 6);
		expect(bN.riftMitigation).toBeGreaterThanOrEqual(b0.riftMitigation);
		expect(cult.getIllusionDemonMult()).toBeCloseTo(0.70, 6);
		expect(game.calcResourcePerTick("xianyuan")).toBeLessThan(xy0);
		expect(game.calcResourcePerTick("xiuwei")).toBeLessThan(xw0);

		// Every profile has at least one boon; every path but the human one carries a cost
		for (var i = 0; i < cult.SAMSARA_PATHS.length; i++){
			var k = cult.SAMSARA_PATHS[i].key;
			var e = cult.getSamsaraPathEffect(k);
			var boon = e.xiuweiRatio > 0 || e.xianyuanRatio > 0 || e.combatMult > 1 || e.riftHpMult > 1 || e.mitigation > 0;
			var cost = e.xiuweiRatio < 0 || e.xianyuanRatio < 0 || e.combatMult < 1 || e.herbSpeed < 0 || e.demonGainMult > 1;
			expect(boon).toBe(true);
			expect(cost).toBe(k !== "human");
			var bonuses = cult.getImmortalCaveBonuses(30);
			for (var bk in bonuses){
				if (bonuses.hasOwnProperty(bk)){ expect(isFinite(bonuses[bk])).toBe(true); }
			}
		}

		// Beast path really speeds up spirit-beast incubation
		pick("beast");
		var sn = cult.spiritNursery;
		var bKey = cult.PRIMORDIAL_BEASTS[0].key;
		sn.autoNurture = false;
		sn.beasts[bKey].incubating = true;
		sn.beasts[bKey].stage = 0;
		sn.beasts[bKey].incTicks = 0;
		sn.beasts[bKey].incMax = 100000;
		cult.tickSpiritNursery(100);
		expect(sn.beasts[bKey].incTicks).toBeCloseTo(140, 6);
	});

	test("Taixu illusion: deterministic Calm / Sever steps, layer breaks engrave patterns, lamps, withdrawal, backlash with cooldown and insight pity", function(){
		var cult = game.cultivation;
		cult.setIdentity("心猿", "m", "orphan");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.heartDemon = 30;

		expect(cult.ILLUSION_LAYERS.length).toBe(9);
		var enter = cult.getIllusionEnterReq();
		expect(enter.nextLayer).toBe(1);
		expect(enter.xianyuan).toBe(28);
		expect(enter.startDemon).toBe(15);
		expect(enter.startProgress).toBe(0);
		expect(enter.lamps).toBe(1);
		expect(cult.illusionStep("calm", 0)).toBe(false);
		expect(cult.useDreamLotusLamp()).toBe(false);
		expect(cult.leaveIllusion()).toBe(false);

		var xy0 = game.resPool.get("xianyuan").value;
		expect(cult.enterIllusion()).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 28);
		expect(cult.enterIllusion()).toBe(false);
		var run = cult.illusionTrial.run;
		expect(run.depth).toBe(1);
		expect(run.demon).toBe(15);
		expect(cult.illusionTrial.lastNote).toContain("入太虚幻境");

		// Previews: Calm +22 / demon 3~9 at layer 1; Sever +40 / demon 6~18
		var pc = cult.getIllusionStepPreview("calm");
		var ps = cult.getIllusionStepPreview("sever");
		expect([pc.progress, pc.demonMin, pc.demonMax]).toEqual([22, 3, 9]);
		expect([ps.progress, ps.demonMin, ps.demonMax]).toEqual([40, 6, 18]);
		expect(cult.illusionStep("bogus", 0)).toBe(false);

		expect(cult.illusionStep("sever", 0.5)).toBe(true);	// +40, demon +12
		expect(run.progress).toBe(40);
		expect(run.demon).toBe(27);
		expect(cult.illusionTrial.lastNote).toContain("斩念破幻");
		expect(cult.illusionStep("calm", 0)).toBe(true);	// +22, demon +3
		expect(run.progress).toBe(62);
		expect(run.demon).toBe(30);
		expect(cult.illusionStep("sever", 0)).toBe(true);	// +40 → 102 ≥ 100: break layer 1
		expect(cult.illusionTrial.layer).toBe(1);
		expect(cult.daoPatterns).toBe(1);
		expect(cult.daoHeartTier).toBe(1);
		expect(cult.heartDemon).toBe(24);
		run = cult.illusionTrial.run;
		expect(run.depth).toBe(2);
		expect(run.progress).toBe(0);
		expect(run.demon).toBe(16);	// 30 + 6 - 20
		expect(cult.illusionTrial.lastNote).toContain("破幻铭纹");
		expect(cult.illusionTrial.clears).toBe(1);

		// Dream Lotus Lamp: -30 demon, limited charges
		run.demon = 50;
		expect(cult.useDreamLotusLamp()).toBe(true);
		expect(run.demon).toBe(20);
		expect(run.lamps).toBe(0);
		expect(cult.useDreamLotusLamp()).toBe(false);
		expect(cult.illusionTrial.lampsUsed).toBe(1);

		// Withdraw keeps patterns; re-entry starts from the next unbroken layer
		expect(cult.leaveIllusion()).toBe(true);
		expect(cult.illusionTrial.run).toBe(null);
		expect(cult.illusionTrial.layer).toBe(1);
		expect(cult.illusionTrial.lastNote).toContain("出离幻境");
		expect(cult.getIllusionEnterReq().nextLayer).toBe(2);
		expect(cult.getIllusionEnterReq().xianyuan).toBe(cult.roundNice((20 + 16) * cult.getSamsaraCostMult()));

		// Backlash: demon reaches 100 before progress does
		expect(cult.enterIllusion()).toBe(true);
		cult.illusionTrial.run.demon = 92;
		var hd = cult.heartDemon;
		expect(cult.illusionStep("sever", 0)).toBe(true);
		expect(cult.illusionTrial.run).toBe(null);
		expect(cult.illusionTrial.layer).toBe(1);
		expect(cult.illusionTrial.backlashes).toBe(1);
		expect(cult.illusionTrial.insight).toBe(1);
		expect(cult.illusionTrial.cooldown).toBe(600);
		expect(cult.heartDemon).toBe(hd + 6);
		expect(cult.illusionTrial.lastNote).toContain("心魔反噬");
		expect(cult.getIllusionEnterReq().cooldownOk).toBe(false);
		expect(cult.enterIllusion()).toBe(false);

		// Insight pity: -10% demon growth per stack (max 3), cleared by the next break
		var dm1 = cult.getIllusionDemonMult();
		cult.illusionTrial.insight = 99;
		cult.illusionTrial = cult.normalizeIllusionTrial(cult.illusionTrial);
		expect(cult.illusionTrial.insight).toBe(3);
		expect(cult.getIllusionDemonMult()).toBeLessThan(dm1);
		cult.tickSamsaraIllusion(600);
		expect(cult.illusionTrial.cooldown).toBe(0);
		clearOneLayer(cult);
		expect(cult.illusionTrial.insight).toBe(0);
		expect(cult.illusionTrial.layer).toBe(2);

		// A step that fills progress wins even if the same step overflows the demon
		cult.illusionTrial.run.progress = 90;
		cult.illusionTrial.run.demon = 99;
		expect(cult.illusionStep("sever", 0.999)).toBe(true);
		expect(cult.illusionTrial.layer).toBe(3);
		expect(cult.illusionTrial.run).not.toBe(null);

		// Clear the remaining layers; layer 9 ends the run and the trial
		clearLayersTo(cult, 9);
		expect(cult.illusionTrial.layer).toBe(9);
		expect(cult.illusionTrial.run).toBe(null);
		expect(cult.daoPatterns).toBe(9);
		expect(cult.daoHeartTier).toBe(9);
		expect(cult.illusionTrial.lastNote).toContain("太虚圆满");
		expect(cult.getIllusionEnterReq()).toBe(null);
		expect(cult.enterIllusion()).toBe(false);

		// Default roll (no injection) still works
		cult.illusionTrial = cult.makeDefaultIllusionTrial();
		expect(cult.enterIllusion()).toBe(true);
		jest.spyOn(Math, "random").mockReturnValue(0.25);
		expect(cult.illusionStep("calm")).toBe(true);
		expect(cult.illusionTrial.run.progress).toBeGreaterThan(cult.getDaoHeartSealBonus().startProgress);
	});

	test("Dao-Heart Patterns synergize with Celestial offices and Thunder Temper without touching the thunder strike", function(){
		var cult = game.cultivation;
		cult.setIdentity("太乙", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);

		var p0 = cult.getDaoPatternEffect(0);
		expect(p0.officeActive).toBe(false);
		expect(p0.thunderActive).toBe(false);
		var b0 = cult.getImmortalCaveBonuses(30);

		// Nine patterns alone
		cult.illusionTrial.layer = 9;
		cult.syncDaoPatterns();
		cult.syncDaoHeartTier();
		var p9 = cult.getDaoPatternEffect();
		expect(p9.patterns).toBe(9);
		expect(p9.xiuweiRatio).toBeCloseTo(0.27, 6);
		expect(p9.demonDecay).toBeCloseTo(0.45, 6);
		expect(p9.officeXiuwei).toBe(0);
		expect(p9.thunderRiftHp).toBe(0);
		var b9 = cult.getImmortalCaveBonuses(30);
		expect(b9.xiuweiRatio).toBeCloseTo(b0.xiuweiRatio + 0.27, 6);
		expect(b9.heartDemonDecayBonus).toBeCloseTo(b0.heartDemonDecayBonus + 0.45, 6);
		expect(b9.riftMitigation).toBeGreaterThan(b0.riftMitigation);

		// Celestial offices: +0.4% cultivation & Essence per pattern per office, plus +3% Calm progress per office
		cult.fengshenRoster.layer = 33;
		expect(cult.getFengshenOfficeCount()).toBe(7);
		var pf = cult.getDaoPatternEffect();
		expect(pf.officeActive).toBe(true);
		expect(pf.officeXiuwei).toBeCloseTo(0.252, 6);
		expect(pf.officeXianyuan).toBeCloseTo(0.252, 6);
		expect(cult.getIllusionProgressMult("calm")).toBeCloseTo(1 + 9 * 0.03 + 7 * 0.03, 6);

		// Thunder Temper: +0.3% rift HP per pattern per tier, plus +3% Sever progress per tier
		cult.fengshenRoster.layer = 0;
		var noThunder = cult.getImmortalCaveBonuses(30);
		cult.thunderPool.tier = 9;
		cult.syncThunderTemperTier();
		var pt = cult.getDaoPatternEffect();
		expect(pt.thunderActive).toBe(true);
		expect(pt.thunderRiftHp).toBeCloseTo(0.243, 6);
		expect(cult.getIllusionProgressMult("sever")).toBeCloseTo(1 + 9 * 0.03 + 9 * 0.03, 6);
		var withThunderPatterns = cult.getImmortalCaveBonuses(30);
		cult.illusionTrial.layer = 0;
		var withThunderOnly = cult.getImmortalCaveBonuses(30);
		expect(withThunderPatterns.riftHpMult / withThunderOnly.riftHpMult).toBeCloseTo(1.243, 6);
		expect(noThunder.riftHpMult).toBeGreaterThan(0);

		// XX-10's thunder pursuit (~80% at the very top) is left exactly as it was
		cult.fengshenRoster.layer = 33;
		cult.innateTreasures.levels.chaosBell = 3;
		cult.innateTreasures.levels.panguBanner = 3;
		cult.innateTreasures.levels.taijiDiagram = 3;
		cult.innateTreasures.levels.creationDisc = 3;
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		cult.illusionTrial.layer = 9;
		cult.illusionTrial = cult.normalizeIllusionTrial(cult.illusionTrial);
		cult.illusionTrial.layer = 9;
		cult.samsaraMirror.revealed.asura = true;
		expect(cult.chooseSamsaraPath("asura")).toBe(true);
		var after = cult.getImmortalCaveBonuses(31);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);

		// Patterns only count after ascension; mortal life gets nothing from them
		cult.immortalAscended = false;
		expect(cult.getImmortalCaveBonuses(30).xiuweiRatio).toBe(0);
		expect(cult.getSamsaraClarityRatio()).toBe(0);
		expect(cult.getSamsaraActivePath()).toBe(null);
	});

	test("Rebirth: daoHeartTier seal and the walked path survive; sealed traits are stripped, resonant traits gain the path's bonus", function(){
		var cult = game.cultivation;
		cult.setIdentity("目连", "m", "farmer");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		cult.heartDemon = 0;
		game.resPool.get("karma").value = 30;	// 3 next-life trait slots
		expect(cult.getMinggeSlotCap(true)).toBe(3);
		expect(cult.revealSamsaraPath("asura")).toBe(true);

		// Pending next-life traits: choosing Asura strips its sealed trait (丹道圣体)
		cult.pendingMingge = ["dandao", "jiangu", "huanggu"];
		expect(cult.chooseSamsaraPath("asura")).toBe(true);
		expect(cult.pendingMingge).toEqual(["jiangu", "huanggu"]);
		expect(cult.isMinggeSealed("dandao", true)).toBe(true);
		expect(cult.isMinggeResonant("jiangu", true)).toBe(true);
		expect(cult.togglePendingMingge("dandao")).toBe(false);
		expect(cult.setPendingMingge(["dandao", "qiyun"])).toEqual(["qiyun"]);
		expect(cult.getSamsaraMinggeTagHtml("dandao", true)).toContain("cultivation.samsara.mingge.tag.sealed");
		expect(cult.getSamsaraMinggeTagHtml("huanggu", true)).toContain("cultivation.samsara.mingge.tag.resonant");
		expect(cult.getSamsaraMinggeCardCls("dandao", true)).toBe(" xx-mg-sealed");
		expect(cult.getSamsaraMinggeHintHtml(true)).toContain("cultivation.samsara.mingge.hint.next");
		expect(cult.getSamsaraMinggeHintHtml(false)).toBe("");

		// Break six illusion layers → Dao-Heart Seal 6 and an extra immortal imprint
		clearLayersTo(cult, 6);
		if (cult.illusionTrial.run){ cult.leaveIllusion(); }
		expect(cult.daoHeartTier).toBe(6);

		// game.js still filters a hand-edited pending list at rebirth
		cult.pendingMingge = ["dandao", "jiangu"];
		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.daoHeartTier).toBe(6);
		expect(rebirth.cultivation.samsaraLegacyPath).toBe("asura");
		expect(rebirth.cultivation.mingge).toEqual(["jiangu"]);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);
		expect(rebirth.cultivation.samsaraMirror).toBeUndefined();
		expect(rebirth.cultivation.illusionTrial).toBeUndefined();

		cult.resetState();
		expect(cult.daoHeartTier).toBe(0);
		expect(cult.samsaraLegacyPath).toBe(null);
		expect(cult.getSamsaraCostMult()).toBe(1);
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");
		var freshCp = cult.getCombatPower();
		var freshDemonMult = cult.getIllusionDemonMult();

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.daoHeartTier).toBe(6);
		expect(cult.samsaraLegacyPath).toBe("asura");
		expect(cult.mingge).toEqual(["jiangu"]);
		expect(cult.illusionTrial.layer).toBe(0);
		expect(cult.samsaraMirror.activePath).toBe(null);

		// Seal: cultivation, cheaper mirror / entry, gentler demons, head start, extra lamps
		var seal = cult.getDaoHeartSealBonus();
		expect(seal.tier).toBe(6);
		expect(seal.xiuweiRatio).toBeCloseTo(0.30, 6);
		expect(seal.startProgress).toBe(24);
		expect(seal.lampBonus).toBe(2);
		expect(cult.getIllusionLampCharges()).toBe(3);
		expect(cult.getIllusionDemonMult()).toBeCloseTo(freshDemonMult * 0.76, 6);
		expect(cult.getSamsaraCostMult()).toBeLessThan(1);
		expect(cult.getSamsaraCostMult()).toBeGreaterThanOrEqual(0.60);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);

		// Asura resonance: the inherited 剑骨通明 adds +8% combat on top of its own effect
		var res = cult.getSamsaraLegacyResonance();
		expect(res.path).toBe("asura");
		expect(res.count).toBe(1);
		expect(res.combatBonus).toBeCloseTo(0.08, 6);
		expect(cult.getSamsaraCombatMult()).toBeCloseTo(1.08, 6);
		var cpRes = cult.getCombatPower();
		cult.samsaraLegacyPath = null;
		expect(cpRes / cult.getCombatPower()).toBeCloseTo(1.08, 6);
		cult.samsaraLegacyPath = "asura";
		expect(cpRes).toBeGreaterThan(freshCp);

		// This life's sealed trait cannot be set, even directly
		expect(cult.setMingge(["dandao", "qiyun"])).toEqual(["qiyun"]);
		expect(cult.isMinggeSealed("dandao", false)).toBe(true);
		expect(cult.getSamsaraMinggeHintHtml(false)).toContain("cultivation.samsara.mingge.hint.legacy");

		// Non-combat resonance goes into effectsBase (deva: +12% cultivation per resonant trait)
		cult.samsaraLegacyPath = null;
		cult.setMingge(["tianling", "zhenyan"]);
		var plainXw = cult.effectsBase.xiuweiRatio || 0;
		cult.samsaraLegacyPath = "deva";
		cult.applyOrigin();
		expect(cult.getSamsaraLegacyResonance().count).toBe(2);
		expect(cult.effectsBase.xiuweiRatio).toBeCloseTo(plainXw + 0.24, 6);
		cult.samsaraLegacyPath = "preta";
		cult.setMingge(["dandao", "qiyun"]);
		expect(cult.effectsBase.goldRatio).toBeCloseTo(0.15 * 2, 6);
		cult.samsaraLegacyPath = "asura";
		cult.setMingge(["jiangu"]);

		// Next ascension: the past-life path is already revealed in the mirror; the seal discounts reveals
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.samsaraMirror.revealed.asura).toBe(true);
		expect(cult.samsaraMirror.revealed.human).toBe(true);
		expect(cult.getSamsaraRevealedCount()).toBe(2);
		expect(cult.getSamsaraRevealReq("beast").xianyuan).toBeLessThan(50);
		var enter = cult.getIllusionEnterReq();
		expect(enter.startProgress).toBe(24);
		expect(enter.lamps).toBe(3);
		expect(enter.xianyuan).toBeLessThan(28);

		// Seal persists through another life (max of previous seal); no path walked → no legacy
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.daoHeartTier).toBe(6);
		expect(rebirth2.cultivation.samsaraLegacyPath).toBeUndefined();
	});

	test("Old saves (XX-10 era and earlier) and corrupted XX-11 fields load cleanly; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("地藏", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		// XX-10-era save: no XX-11 fields
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.samsaraMirror;
		delete oldSave.cultivation.illusionTrial;
		delete oldSave.cultivation.daoHeartTier;
		delete oldSave.cultivation.samsaraLegacyPath;
		expect(oldSave.cultivation.thunderPool).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.samsaraMirror.revealed.human).toBe(true);
		expect(cult.samsaraMirror.activePath).toBe(null);
		expect(cult.illusionTrial).toEqual(cult.makeDefaultIllusionTrial());
		expect(cult.daoHeartTier).toBe(0);
		expect(cult.samsaraLegacyPath).toBe(null);
		expect(function(){ cult.tickSamsaraIllusion(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);

		// Ancient save (pre XX-9 / XX-10 / XX-11)
		var ancientSave = {};
		cult.save(ancientSave);
		["chronoAltar", "innateTreasures", "chronoImprintTier", "fengshenRoster", "thunderPool", "thunderTemperTier", "samsaraMirror", "illusionTrial", "daoHeartTier", "samsaraLegacyPath"].forEach(function(k){
			delete ancientSave.cultivation[k];
		});
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.getIllusionLayer()).toBe(0);
		expect(cult.getDaoPatternEffect().thunderActive).toBe(false);

		// Mortal save
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.samsaraMirror;
		delete mortalSave.cultivation.illusionTrial;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.revealSamsaraPath("asura")).toBe(false);
		expect(cult.enterIllusion()).toBe(false);
		expect(function(){ cult.tickSamsaraIllusion(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.samsaraMirror = {revealed: {deva: "yes", asura: true, bogus: true}, activePath: "deva", switchCooldown: 1e9, switchCount: -3, choiceCount: "x", revealCount: 2.7, lastNote: 5};
		badSave.cultivation.illusionTrial = {layer: 42, cooldown: 1e9, insight: 99, entries: -1, clears: -4, backlashes: NaN, run: {depth: 3, demon: 400}, lastNote: null};
		badSave.cultivation.daoHeartTier = 77;
		badSave.cultivation.samsaraLegacyPath = "bogus";
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		expect(cult.samsaraMirror.revealed.deva).toBe(false);
		expect(cult.samsaraMirror.revealed.asura).toBe(true);
		expect(cult.samsaraMirror.revealed.human).toBe(true);
		expect(cult.samsaraMirror.revealed.bogus).toBeUndefined();
		expect(cult.samsaraMirror.activePath).toBe(null);
		expect(cult.samsaraMirror.switchCooldown).toBe(0);
		expect(cult.samsaraMirror.switchCount).toBe(0);
		expect(cult.samsaraMirror.choiceCount).toBe(0);
		expect(cult.samsaraMirror.revealCount).toBe(2);
		expect(cult.samsaraMirror.lastNote).toBe("");
		expect(cult.illusionTrial.layer).toBe(9);
		expect(cult.illusionTrial.cooldown).toBe(600);
		expect(cult.illusionTrial.insight).toBe(3);
		expect(cult.illusionTrial.entries).toBe(0);
		expect(cult.illusionTrial.clears).toBe(9);
		expect(cult.illusionTrial.backlashes).toBe(0);
		expect(cult.illusionTrial.run).toBe(null);
		expect(cult.daoHeartTier).toBe(9);
		expect(cult.samsaraLegacyPath).toBe(null);
		expect(cult.daoPatterns).toBe(9);

		badSave.cultivation.illusionTrial = {layer: 3, run: {depth: 99, demon: 500, progress: 150, lamps: 50, steps: -1}};
		badSave.cultivation.samsaraMirror = {revealed: {human: true, naraka: true}, activePath: "naraka", switchCooldown: 77.9};
		cult.resetState();
		cult.load(badSave);
		expect(cult.illusionTrial.run).toEqual({depth: 4, demon: 99, progress: 99, lamps: 4, steps: 0});
		expect(cult.samsaraMirror.activePath).toBe("naraka");
		expect(cult.samsaraMirror.switchCooldown).toBe(77);
		expect(cult.samsaraMirror.choiceCount).toBe(1);
		expect(function(){ cult.illusionStep("calm", 0); }).not.toThrow();

		// Roundtrip: progress → save → JSON → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		expect(cult.revealSamsaraPath("asura")).toBe(true);
		expect(cult.chooseSamsaraPath("asura")).toBe(true);
		cult.tickSamsaraIllusion(123);
		clearOneLayer(cult);
		expect(cult.illusionStep("sever", 0.3)).toBe(true);
		cult.pendingMingge = ["jiangu"];
		var snapMirror = JSON.parse(JSON.stringify(cult.samsaraMirror));
		var snapTrial = JSON.parse(JSON.stringify(cult.illusionTrial));
		var snapSeal = cult.daoHeartTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.samsaraMirror).toEqual(snapMirror);
		expect(cult.illusionTrial).toEqual(snapTrial);
		expect(cult.daoHeartTier).toBe(snapSeal);
		expect(cult.daoPatterns).toBe(snapTrial.layer);
		expect(cult.pendingMingge).toEqual(["jiangu"]);
	});

	test("XX-11 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 80", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(80);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(80);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var assets = [
			"res/art/samsara_mirror.webp",
			"res/art/six_paths_wheel.webp",
			"res/art/illusion_gate.webp",
			"res/art/heart_demon_mask.webp",
			"res/art/dao_heart_seal.webp",
			"res/art/dream_lotus_lamp.webp"
		];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
			expect(cultSrc).toContain(assets[i]);
		}
		expect(cultSrc).not.toMatch(/\?v=79\b/);
		expect(cultSrc).not.toContain("ART_VER || \"79\"");
		var xx11Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalSamsaraEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx11Ui.length).toBeGreaterThan(1000);
		expect(xx11Ui).not.toContain("<svg");

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxSamsaraArena");
		expect(css).toContain(".xxIllusionLadder");
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxSamsaraPathGrid/);
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxSamsaraConsole/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.samsara.", "cultivation.illusion."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(120);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(/[一-鿿]/.test(zh[zhKeys[pk]])).toBe(true);
		}
		expect(en["cultivation.samsara.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var pathKeys = ["labelKey", "blessKey", "upKey", "downKey", "pastKey", "resonanceKey"];
		for (var p = 0; p < cult.SAMSARA_PATHS.length; p++){
			var def = cult.SAMSARA_PATHS[p];
			for (var pki = 0; pki < pathKeys.length; pki++){
				expect(zh[def[pathKeys[pki]]]).toBeTruthy();
				expect(en[def[pathKeys[pki]]]).toBeTruthy();
			}
			for (var mg = 0; mg < def.mingge.length; mg++){
				expect(cult.getMinggeDef(def.mingge[mg])).toBeTruthy();
			}
			if (def.seal){
				expect(cult.getMinggeDef(def.seal)).toBeTruthy();
				expect(def.mingge.indexOf(def.seal)).toBe(-1);
			}
		}
		for (var m = 0; m < cult.MINGGE_DEFS.length; m++){
			expect(zh["cultivation.samsara.mingge." + cult.MINGGE_DEFS[m].key]).toBe(cult.MINGGE_DEFS[m].label);
			expect(en["cultivation.samsara.mingge." + cult.MINGGE_DEFS[m].key]).toBeTruthy();
		}
		for (var l = 1; l <= 9; l++){
			var ld = cult.getIllusionLayerDef(l);
			expect(ld.layer).toBe(l);
			expect(zh[ld.titleKey]).toBeTruthy();
			expect(en[ld.shortKey]).toBeTruthy();
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
