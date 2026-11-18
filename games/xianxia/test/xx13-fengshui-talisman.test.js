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

//木火相间(偶位木、奇位火):邻宫 12 对皆相生,对宫 4 对皆比和,得位 2(巽木、离火)→ 灵气 26「九宫飞星大吉局」
var CHECKER_WOOD_FIRE = ["wood", "fire", "wood", "fire", "wood", "fire", "wood", "fire", "wood"];
//水金相间(偶位水、奇位金):金生水 12 对相生,得位 1(兑金)→ 灵气 25
var CHECKER_WATER_METAL = ["water", "metal", "water", "metal", "water", "metal", "water", "metal", "water"];
var EMPTY9 = ["", "", "", "", "", "", "", "", ""];

//星盘残局(沿用 XX-12):你执白落第 0 位即终局,白 19 : 星君 4(贪狼贴目 0)
var WIN_VALS = [3, 3, 3, 1, 3, 1, 1, 3, 1];
var WIN_OWN = [0, 1, 1, 2, 1, 2, 2, 1, 2];

function findRoll(cult, quality, bonus){
	for (var i = 0; i < 20000; i++){
		var r = i / 20000;
		if (cult.judgeTalismanStrokes(r, bonus || 0).quality === quality){ return r; }
	}
	return -1;
}

function setNodes(cult, nodes){
	cult.fengshui.level = 7;
	cult.fengshui.nodes = EMPTY9.slice(0);
	for (var i = 0; i < 9; i++){
		if (nodes[i]){ expect(cult.setFengshuiNode(i, nodes[i])).toBe(true); }
	}
}

describe("XX-13 Spirit-Vein Feng Shui & Talisman Studio", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		game.cultivation.talismanRandom = null;
		game.cultivation.auctionRandom = null;
		jest.restoreAllMocks();
	});

	test("Feng shui: locked before ascension; five-element relations, palace seating and opposite pairs are scored deterministically; grades", function(){
		var cult = game.cultivation;
		cult.setIdentity("郭璞", "m", "scholar");

		expect(cult.setFengshuiNode(0, "wood")).toBe(false);
		expect(cult.applyFengshuiBrush(0)).toBe(false);
		expect(cult.setFengshuiBrush("fire")).toBe(false);
		expect(cult.upgradeFengshuiSurvey()).toBe(false);
		expect(cult.drawTalisman("poxie", 0.5)).toBe(false);
		expect(cult.prepareTalismanMaterial("cinnabar")).toBe(false);
		expect(function(){ cult.tickFengshuiTalisman(500); }).not.toThrow();
		expect(cult.getFengshuiEffect().herb).toBe(0);
		expect(cult.getFengshuiSermonMult()).toBe(1);
		expect(cult.getFengshuiChronoMult()).toBe(1);
		expect(cult.getTalismanEffect(30).count).toBe(0);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		expect(cult.FENGSHUI_PALACES.length).toBe(9);
		expect(cult.FENGSHUI_ELEMENTS.length).toBe(5);
		expect(cult.FENGSHUI_EDGES.length).toBe(12);
		expect(cult.FENGSHUI_OPPOSITES.length).toBe(4);
		expect(cult.fengshui.level).toBe(1);
		expect(cult.getFengshuiSlots()).toBe(3);
		expect(cult.fengshui.nodes).toEqual(EMPTY9);
		expect(cult.fengshuiTier).toBe(0);

		// 相生: 木→火→土→金→水→木 (both directions); 相克: 木克土 火克金 土克水 金克木 水克火; 同行比和
		expect(cult.fengshuiRelation("wood", "fire")).toBe("sheng");
		expect(cult.fengshuiRelation("fire", "wood")).toBe("sheng");
		expect(cult.fengshuiRelation("metal", "water")).toBe("sheng");
		expect(cult.fengshuiRelation("water", "wood")).toBe("sheng");
		expect(cult.fengshuiRelation("earth", "metal")).toBe("sheng");
		expect(cult.fengshuiRelation("wood", "earth")).toBe("ke");
		expect(cult.fengshuiRelation("water", "fire")).toBe("ke");
		expect(cult.fengshuiRelation("fire", "metal")).toBe("ke");
		expect(cult.fengshuiRelation("metal", "wood")).toBe("ke");
		expect(cult.fengshuiRelation("earth", "water")).toBe("ke");
		expect(cult.fengshuiRelation("metal", "metal")).toBe("bihe");
		expect(cult.fengshuiRelation("metal", "")).toBe(null);
		expect(cult.fengshuiRelation("plasma", "wood")).toBe(null);

		// Wood·Fire·Earth across the top row, each in its own palace: 2 generating edges + 3 seated = Qi 7
		var p1 = cult.computeFengshuiPattern(["wood", "fire", "earth", "", "", "", "", "", ""]);
		expect(p1.harmony).toBe(2);
		expect(p1.clash).toBe(0);
		expect(p1.seated).toBe(3);
		expect(p1.seatedCells).toEqual([0, 1, 2]);
		expect(p1.qi).toBe(7);
		expect(p1.gradeKey).toBe("cangfeng");
		expect(p1.counts).toEqual({metal: 0, wood: 1, water: 0, fire: 1, earth: 1});
		// Wood next to Earth clashes; Qi never goes negative
		var p2 = cult.computeFengshuiPattern(["wood", "earth", "", "", "", "", "", "", ""]);
		expect(p2.clash).toBe(1);
		expect(p2.qi).toBe(0);
		expect(p2.grade).toBe(0);
		// Opposite palaces count across the centre: Xun(SE) Water ↔ Qian(NW) Metal generate; Metal is seated in Qian
		var p3 = cult.computeFengshuiPattern(["water", "", "", "", "", "", "", "", "metal"]);
		expect(p3.harmony).toBe(1);
		expect(p3.opposites[0]).toEqual({a: 0, b: 8, rel: "sheng", kind: "opposite"});
		expect(p3.seated).toBe(1);
		expect(p3.qi).toBe(3);
		// Full checkerboard: 12 generating edges, 4 kindred opposites, 2 seated → Qi 26, top grade
		var p4 = cult.computeFengshuiPattern(CHECKER_WOOD_FIRE);
		expect(p4.harmony).toBe(12);
		expect(p4.bihe).toBe(4);
		expect(p4.seated).toBe(2);
		expect(p4.qi).toBe(26);
		expect(p4.gradeKey).toBe("feixing");
		expect(cult.computeFengshuiPattern(CHECKER_WOOD_FIRE)).toEqual(p4);
		var mins = cult.FENGSHUI_GRADES.map(function(g){ return g.min; });
		expect(mins).toEqual([0, 4, 8, 13, 18, 24]);

		// Brush flow: a few taps rearrange the pattern
		expect(cult.setFengshuiBrush("wood")).toBe(false);	// already the default brush
		expect(cult.setFengshuiBrush("plasma")).toBe(false);
		expect(cult.setFengshuiBrush("fire")).toBe(true);
		expect(cult.applyFengshuiBrush(1)).toBe(true);
		expect(cult.fengshui.nodes[1]).toBe("fire");
		expect(cult.fengshui.lastNote).toContain("布脉");
		expect(cult.applyFengshuiBrush(1)).toBe(true);	// same element again → withdrawn
		expect(cult.fengshui.nodes[1]).toBe("");
		expect(cult.fengshui.lastNote).toContain("拔脉");
		expect(cult.applyFengshuiBrush(1)).toBe(true);
		cult.setFengshuiBrush("wood");
		expect(cult.applyFengshuiBrush(0)).toBe(true);
		cult.setFengshuiBrush("earth");
		expect(cult.applyFengshuiBrush(2)).toBe(true);
		expect(cult.getFengshuiNodeCount()).toBe(3);
		// Slots are full: a fourth vein cannot be seated, but an existing one can change element
		expect(cult.applyFengshuiBrush(4)).toBe(false);
		expect(cult.setFengshuiNode(4, "earth")).toBe(false);
		expect(cult.setFengshuiNode(2, "metal")).toBe(true);
		expect(cult.setFengshuiNode(2, "metal")).toBe(false);	// no-op
		expect(cult.setFengshuiNode(2, "earth")).toBe(true);
		expect(cult.setFengshuiNode(9, "wood")).toBe(false);
		expect(cult.setFengshuiNode(-1, "wood")).toBe(false);
		expect(cult.setFengshuiNode(1.5, "wood")).toBe(false);
		expect(cult.setFengshuiNode(3, "plasma")).toBe(false);
		cult.setFengshuiBrush("erase");
		expect(cult.applyFengshuiBrush(4)).toBe(false);	// nothing to withdraw
		expect(cult.applyFengshuiBrush(2)).toBe(true);
		expect(cult.fengshui.nodes[2]).toBe("");
		expect(cult.setFengshuiNode(2, "earth")).toBe(true);
		expect(cult.computeFengshuiPattern().qi).toBe(7);
		expect(cult.fengshui.peakGrade).toBe(1);
		expect(cult.fengshuiTier).toBe(1);	// the seal follows the best pattern of this life at once

		// Survey: more veins for Essence + Cosmos Charts
		var xy0 = game.resPool.get("xianyuan").value;
		var sc0 = game.resPool.get("starchart").value;
		var req = cult.getFengshuiSurveyReq();
		expect(req).toEqual({level: 2, slots: 4, xianyuan: 40, starchart: 6, affordable: true});
		expect(cult.upgradeFengshuiSurvey()).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 40);
		expect(game.resPool.get("starchart").value).toBe(sc0 - 6);
		expect(cult.getFengshuiSlots()).toBe(4);
		cult.setFengshuiBrush("earth");
		expect(cult.applyFengshuiBrush(4)).toBe(true);
		for (var lv = 3; lv <= 7; lv++){ expect(cult.upgradeFengshuiSurvey()).toBe(true); }
		expect(cult.fengshui.level).toBe(7);
		expect(cult.getFengshuiSlots()).toBe(9);
		expect(cult.getFengshuiSurveyReq()).toBe(null);
		expect(cult.upgradeFengshuiSurvey()).toBe(false);

		// Poor immortals cannot survey
		cult.fengshui.level = 3;
		game.resPool.get("starchart").value = 1;
		expect(cult.getFengshuiSurveyReq().affordable).toBe(false);
		expect(cult.upgradeFengshuiSurvey()).toBe(false);

		expect(cult.clearFengshui()).toBe(true);
		expect(cult.fengshui.nodes).toEqual(EMPTY9);
		expect(cult.clearFengshui()).toBe(false);
		expect(cult.fengshui.peakGrade).toBe(2);	// wood·fire·earth + centre earth reached Gathered Qi
	});

	test("Pattern effects: element weights × strength × seal with per-target and total caps; boosts herb garden, Zixiao sermon (XX-8) and Chrono River (XX-9)", function(){
		var cult = game.cultivation;
		cult.setIdentity("杨筠松", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.zixiaoAltar.tier = 3;
		cult.chronoAltar.tier = 3;

		var b0 = cult.getImmortalCaveBonuses(0);
		var lec0 = cult.getDaoLecturePreview("essence");
		var trace0 = cult.getChronoTracePreview();
		var sermonBase = cult.getChronoSermonMult() * cult.getFengshenSermonMult();
		expect(cult.getFengshuiSermonMult()).toBe(1);
		expect(cult.getFengshuiChronoMult()).toBe(1);

		// Wood·Fire checkerboard: Wood 5, Fire 4 → herb weight 5, sermon 6.5, stroke 2; top grade (×1.0) and the seal it earns (+5×4%)
		setNodes(cult, CHECKER_WOOD_FIRE);
		expect(cult.fengshui.peakGrade).toBe(5);
		expect(cult.fengshuiTier).toBe(5);
		var e = cult.getFengshuiEffect();
		expect(e.grade).toBe(5);
		expect(e.factor).toBe(1);
		expect(e.sealMult).toBeCloseTo(1.20, 9);
		expect(e.weights).toEqual({herb: 5, sermon: 6.5, chrono: 0, stroke: 2, duration: 0});
		expect(e.raw.herb).toBeCloseTo(0.24, 9);
		expect(e.raw.sermon).toBeCloseTo(0.312, 9);
		expect(e.econRaw).toBeCloseTo(0.40, 9);	// two 20% caps …
		expect(e.econScale).toBeCloseTo(0.9, 9);	// … squeezed under the 36% total cap
		expect(e.herb).toBeCloseTo(0.18, 9);
		expect(e.sermon).toBeCloseTo(0.18, 9);
		expect(e.chrono).toBe(0);
		expect(e.stroke).toBe(7);
		expect(e.duration).toBe(0);
		expect(e.capped).toBe(true);
		expect(e.herb + e.sermon + e.chrono).toBeLessThanOrEqual(cult.FENGSHUI_ECON_CAP + 1e-9);

		// Herb garden output: yield and growth
		var b1 = cult.getImmortalCaveBonuses(0);
		expect(b1.herbYieldBonus).toBeCloseTo(b0.herbYieldBonus + 0.18, 9);
		expect(b1.herbSpeedBonus).toBeCloseTo(b0.herbSpeedBonus + 0.18, 9);
		// Zixiao sermon output
		expect(cult.getFengshuiSermonMult()).toBeCloseTo(1.18, 9);
		var cfgZ = cult.getZixiaoAltarTierDef(3);
		var lec1 = cult.getDaoLecturePreview("essence");
		expect(lec1.compGain).toBe(Math.max(10, Math.round(12 * cfgZ.sutraMult * sermonBase * 1.18)));
		expect(lec1.compGain).toBeGreaterThan(lec0.compGain);
		expect(lec1.sutraGain).toBeGreaterThanOrEqual(lec0.sutraGain);
		var zx0 = cult.zixiaoAltar.comprehension || 0;
		var passive = cult.completePassiveZixiaoSermon();
		expect(passive.compGain).toBe(Math.max(6, Math.round(7 * cfgZ.sutraMult * sermonBase * 1.18)));
		expect(cult.zixiaoAltar.comprehension).toBe(zx0 + passive.compGain);

		// Water·Metal checkerboard → Chrono River (water leads, metal feeds) and talisman duration (metal)
		setNodes(cult, CHECKER_WATER_METAL);
		var e2 = cult.getFengshuiEffect();
		expect(e2.qi).toBe(25);
		expect(e2.weights.chrono).toBe(7);
		expect(e2.weights.herb).toBe(2.5);
		expect(e2.weights.duration).toBe(4);
		expect(e2.chrono).toBeCloseTo(0.20, 9);
		expect(e2.herb).toBeCloseTo(0.12, 9);
		expect(e2.sermon).toBe(0);
		expect(e2.duration).toBeCloseTo(0.384, 9);
		expect(e2.econScale).toBe(1);
		expect(cult.getFengshuiChronoMult()).toBeCloseTo(1.2, 9);
		var ca = cult.chronoAltar;
		var era = cult.getChronoEraDef(ca.selectedEra || "shanghuang") || cult.CHRONO_ERAS[0];
		var cfgC = cult.getChronoAltarTierDef(3);
		var mastery = (ca.eraMastery && ca.eraMastery[era.key]) || 0;
		var scale = Math.max(1, cfgC.sandMult || 1);
		var trace1 = cult.getChronoTracePreview();
		expect(trace1.sandGain).toBe(Math.max(1, Math.round(era.baseSand * scale * (1 + mastery * 0.06) * (1 + cult.getChronoEpochRank() * 0.04) * 1.2)));
		expect(trace1.insightGain).toBe(Math.max(4, Math.round(era.baseInsight * scale * 1.2)));
		expect(trace1.sandGain).toBeGreaterThan(trace0.sandGain);
		expect(trace1.xianyuan).toBe(trace0.xianyuan);	// costs untouched

		// Weak pattern: three clashing veins still help a little (Plain Ground ×0.30)
		setNodes(cult, ["wood", "earth", "water", "", "", "", "", "", ""]);
		var e3 = cult.getFengshuiEffect();
		expect(e3.grade).toBe(0);
		expect(e3.factor).toBeCloseTo(0.30, 9);
		expect(e3.herb).toBeCloseTo((1 + 0.5) * 0.04 * 0.30 * 1.20, 9);

		// Preview mode works for a mortal; live effects need the immortal body
		cult.immortalAscended = false;
		expect(cult.getFengshuiEffect().herb).toBe(0);
		expect(cult.getFengshuiSermonMult()).toBe(1);
		expect(cult.getFengshuiChronoMult()).toBe(1);
		expect(cult.getFengshuiEffect(CHECKER_WOOD_FIRE).herb).toBeCloseTo(0.18, 9);
	});

	test("Talisman studio: materials, injectable deterministic stroke judgement, quality ladder, brush insight, pouch slots, burning and expiry", function(){
		var cult = game.cultivation;
		cult.setIdentity("张道陵", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		var ws = cult.talismanWorkshop;
		expect(ws.cinnabar).toBe(6);
		expect(ws.paper).toBe(4);
		expect(ws.active).toEqual([]);
		expect(cult.TALISMANS.length).toBe(5);

		// Pure, deterministic judgement: same roll → same three strokes
		var j = cult.judgeTalismanStrokes(0.5, 0);
		expect(j.strokes).toEqual([20, 18, 8]);
		expect(j.total).toBe(46);
		expect(j.quality).toBe("lower");
		expect(cult.judgeTalismanStrokes(0.5, 0)).toEqual(j);
		expect(cult.judgeTalismanStrokes(0.1, 0).strokes).toEqual([26, 34, 21]);
		expect(cult.judgeTalismanStrokes(0.1, 0).quality).toBe("upper");
		expect(cult.judgeTalismanStrokes(0.5, 14).quality).toBe("middle");
		expect(cult.judgeTalismanStrokes(0.5, 49).quality).toBe("divine");
		for (var r = 0; r < 1; r += 0.0371){
			var jr = cult.judgeTalismanStrokes(r, 0);
			jr.strokes.forEach(function(s){ expect(s).toBeGreaterThanOrEqual(5); expect(s).toBeLessThanOrEqual(35); });
			expect(jr.total).toBe(jr.strokes[0] + jr.strokes[1] + jr.strokes[2]);
		}
		var failRoll = findRoll(cult, "fail", 0);
		var midRoll = findRoll(cult, "middle", 0);
		var divRoll = findRoll(cult, "divine", 0);
		expect(failRoll).toBeGreaterThanOrEqual(0);
		expect(midRoll).toBeGreaterThanOrEqual(0);
		expect(divRoll).toBeGreaterThanOrEqual(0);

		// A ruined talisman still spends the materials but leaves Brush Insight (+6 per layer, max 3)
		var req = cult.getTalismanDrawReq("poxie");
		expect(req.cinnabar).toBe(3);
		expect(req.paper).toBe(1);
		expect(req.affordable).toBe(true);
		expect(cult.drawTalisman("poxie", failRoll)).toBe(true);
		expect(ws.cinnabar).toBe(3);
		expect(ws.paper).toBe(3);
		expect(ws.active.length).toBe(0);
		expect(ws.failed).toBe(1);
		expect(ws.insight).toBe(1);
		expect(ws.lastDraw.quality).toBe("fail");
		expect(ws.lastNote).toContain("废符");
		expect(cult.getTalismanStrokeBonus().total).toBe(6);

		// Injected random source drives the roll when none is passed; success clears insight
		cult.talismanRandom = function(){ return midRoll; };
		var expectJ = cult.judgeTalismanStrokes(midRoll, 6);
		expect(cult.drawTalisman("juling")).toBe(true);
		expect(ws.lastDraw.strokes).toEqual(expectJ.strokes);
		expect(ws.lastDraw.total).toBe(expectJ.total);
		expect(ws.insight).toBe(0);
		expect(ws.active.length).toBe(1);
		var jl = cult.getActiveTalisman("juling");
		expect(jl.quality).toBe(expectJ.quality);
		expect(jl.ticksLeft).toBe(cult.getTalismanDuration(expectJ.quality));
		expect(ws.lastNote).toContain("成符");

		// Materials: grind cinnabar (Essence) and cut paper (Ancient Treasure)
		var xy0 = game.resPool.get("xianyuan").value;
		var rl0 = game.resPool.get("relic").value;
		var c0 = ws.cinnabar;
		var pp0 = ws.paper;
		expect(cult.prepareTalismanMaterial("cinnabar")).toBe(true);
		expect(cult.prepareTalismanMaterial("paper")).toBe(true);
		expect(cult.prepareTalismanMaterial("ink")).toBe(false);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 30);
		expect(game.resPool.get("relic").value).toBe(rl0 - 6);
		expect(ws.cinnabar).toBe(c0 + 3);
		expect(ws.paper).toBe(pp0 + 2);
		for (var g = 0; g < 15; g++){ cult.prepareTalismanMaterial("cinnabar"); cult.prepareTalismanMaterial("paper"); }
		expect(ws.cinnabar).toBe(30);
		expect(ws.paper).toBe(30);
		expect(cult.getTalismanMatReq("cinnabar").affordable).toBe(false);	// stock full

		// Pouch: three slots, redrawing the same talisman replaces it
		expect(cult.drawTalisman("juling", midRoll)).toBe(true);
		expect(ws.active.length).toBe(1);
		expect(cult.drawTalisman("poxie", midRoll)).toBe(true);
		expect(cult.drawTalisman("jinguang", divRoll)).toBe(true);
		expect(ws.active.length).toBe(3);
		expect(ws.divine).toBe(1);
		expect(cult.getActiveTalisman("jinguang").ticksLeft).toBe(Math.round(1500 * 1.5));
		var full = cult.getTalismanDrawReq("banyun");
		expect(full.slotOk).toBe(false);
		expect(full.affordable).toBe(false);
		expect(cult.drawTalisman("banyun", midRoll)).toBe(false);
		expect(cult.getTalismanDrawReq("poxie").replacing).toBe(true);
		expect(cult.dismissTalisman("banyun")).toBe(false);
		expect(cult.dismissTalisman("poxie")).toBe(true);
		expect(ws.lastNote).toContain("焚符");
		expect(cult.drawTalisman("banyun", midRoll)).toBe(true);
		expect(cult.drawTalisman("nope", midRoll)).toBe(false);

		// Not enough materials
		ws.cinnabar = 1;
		expect(cult.getTalismanDrawReq("juling").okCinnabar).toBe(false);
		expect(cult.drawTalisman("juling", midRoll)).toBe(false);

		// Time limit: talismans fade; the cave slowly condenses 1 cinnabar + 1 paper every 600 ticks
		ws.cinnabar = 0;
		ws.paper = 0;
		ws.trickle = 0;
		cult.tickFengshuiTalisman(599);
		expect(ws.cinnabar).toBe(0);
		cult.tickFengshuiTalisman(1);
		expect(ws.cinnabar).toBe(1);
		expect(ws.paper).toBe(1);
		expect(ws.active.length).toBe(3);
		cult.tickFengshuiTalisman(600 * 100);	// long offline span
		expect(ws.active.length).toBe(0);
		expect(ws.expired).toBe(3);
		expect(ws.lastNote).toContain("符力散尽");
		expect(ws.cinnabar).toBe(30);
		expect(ws.paper).toBe(30);
		// Live loop ticks it too
		cult.drawTalisman("poxie", midRoll);
		var left0 = cult.getActiveTalisman("poxie").ticksLeft;
		cult.update();
		expect(cult.getActiveTalisman("poxie").ticksLeft).toBeLessThan(left0);

		// Metal veins lengthen talismans (+38.4% on the Water·Metal board), seal + earth veins steady the brush
		ws.active = [];
		setNodes(cult, CHECKER_WATER_METAL);
		expect(cult.getTalismanDuration("middle")).toBe(Math.round(1500 * (1 + cult.getFengshuiEffect().duration)));
		expect(cult.getTalismanStrokeBonus().seal).toBe(5);
		setNodes(cult, ["earth", "fire", "earth", "fire", "earth", "fire", "earth", "fire", "earth"]);
		var sb = cult.getTalismanStrokeBonus();
		expect(sb.fengshui).toBe(cult.getFengshuiEffect().stroke);
		expect(sb.fengshui).toBeGreaterThan(0);
		expect(sb.fengshui).toBeLessThanOrEqual(12);
		expect(sb.total).toBe(sb.fengshui + 5);
	});

	test("Synergy: combat talismans work only in Rift 26F+ and are capped; the Big Dipper talisman gives +1 point for exactly one Star Go game; thunder pursuit stays 0.795", function(){
		var cult = game.cultivation;
		cult.setIdentity("葛洪", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		var ws = cult.talismanWorkshop;

		var noTl25 = cult.getImmortalCaveBonuses(25);
		var noTl26 = cult.getImmortalCaveBonuses(26);
		ws.active = [
			{key: "poxie", quality: "divine", ticksLeft: 1000, maxTicks: 1000},
			{key: "jinguang", quality: "divine", ticksLeft: 1000, maxTicks: 1000},
			{key: "banyun", quality: "divine", ticksLeft: 1000, maxTicks: 1000}
		];
		var low = cult.getTalismanEffect(25);
		expect(low.count).toBe(3);
		expect(low.riftDmg).toBe(0);
		expect(low.riftHp).toBe(0);
		expect(low.riftXy).toBe(0);
		expect(cult.getTalismanEffect(0).riftDmg).toBe(0);
		var hi = cult.getTalismanEffect(26);
		expect(hi.highRift).toBe(true);
		expect(hi.rawDmg).toBeCloseTo(0.06, 9);
		expect(hi.riftDmg).toBeCloseTo(0.06, 9);
		expect(hi.riftHp).toBeCloseTo(0.06, 9);
		expect(hi.rawMit).toBeCloseTo(0.012, 9);
		expect(hi.mitigation).toBeCloseTo(0.01, 9);
		expect(hi.riftXy).toBeCloseTo(0.30, 9);
		expect(hi.capped).toBe(true);
		var tl25 = cult.getImmortalCaveBonuses(25);
		var tl26 = cult.getImmortalCaveBonuses(26);
		expect(tl25.riftDmgMult).toBeCloseTo(noTl25.riftDmgMult, 9);
		expect(tl25.riftXyBonus).toBeCloseTo(noTl25.riftXyBonus, 9);
		expect(tl26.riftDmgMult / noTl26.riftDmgMult).toBeCloseTo(1.06, 9);
		expect(tl26.riftHpMult / noTl26.riftHpMult).toBeCloseTo(1.06, 9);
		expect(tl26.riftXyBonus - noTl26.riftXyBonus).toBeCloseTo(0.30, 9);
		// Stacking cannot exceed the caps even with impossible duplicates
		ws.active.push({key: "poxie", quality: "divine", ticksLeft: 1000, maxTicks: 1000});
		expect(cult.getTalismanEffect(40).riftDmg).toBeCloseTo(cult.XX13_COMBAT_CAP, 9);

		// Rift 26F+ clears send talisman paper home
		ws.paper = 5;
		expect(cult.onTalismanRiftVictory(25)).toBe(0);
		expect(cult.onTalismanRiftVictory(26)).toBe(1);
		expect(ws.paper).toBe(6);
		ws.paper = 30;
		expect(cult.onTalismanRiftVictory(30)).toBe(0);

		// Big Dipper talisman: +1 point previewed, absorbed when the game starts, gone afterwards
		ws.active = [];
		ws.cinnabar = 10;
		ws.paper = 10;
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(0);
		var midRoll = findRoll(cult, "middle", 0);
		expect(cult.drawTalisman("beidou", midRoll)).toBe(true);
		expect(cult.getTalismanGoBonus()).toBe(1);
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(1);
		expect(cult.getStarGoMatchRules("tanlang").bonusCharm).toBe(1);
		expect(cult.startStarGo("tanlang", 0.5)).toBe(true);
		expect(cult.getActiveTalisman("beidou")).toBe(null);
		expect(cult.starGo.match.charm).toBe(1);
		expect(cult.starGo.lastNote).toContain("北斗星符");
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(1);
		// The charm survives a save / load mid-game
		var mid = {};
		cult.save(mid);
		cult.load(JSON.parse(JSON.stringify(mid)));
		ws = cult.talismanWorkshop;
		expect(cult.starGo.match.charm).toBe(1);
		cult.starGo.match.vals = WIN_VALS.slice(0);
		cult.starGo.match.own = WIN_OWN.slice(0);
		expect(cult.starGoMove(0, 0)).toBe(true);
		expect(cult.starGo.lastResult.result).toBe("win");
		expect(cult.starGo.lastResult.player).toBe(20);	// 19 + the talisman's point
		expect(cult.getStarGoMatchRules("tanlang").bonusCharm).toBe(0);	// the talisman is spent
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(0);
		// Two talismans never stack: only one Big Dipper can sit in the pouch
		expect(cult.drawTalisman("beidou", midRoll)).toBe(true);
		expect(cult.drawTalisman("beidou", midRoll)).toBe(true);
		expect(cult.getTalismanGoBonus()).toBe(1);
		expect(cult.getTalismanEffect(0).goBonus).toBe(1);

		// XX-10's thunder pursuit (0.795 at the very top) is left exactly as it was
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
		ws.active = [];
		cult.fengshui.nodes = EMPTY9.slice(0);
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		setNodes(cult, CHECKER_WOOD_FIRE);
		ws.active = [
			{key: "poxie", quality: "divine", ticksLeft: 1000, maxTicks: 1000},
			{key: "jinguang", quality: "divine", ticksLeft: 1000, maxTicks: 1000},
			{key: "banyun", quality: "divine", ticksLeft: 1000, maxTicks: 1000}
		];
		cult.fengshuiTier = 5;
		var after = cult.getImmortalCaveBonuses(31);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);

		// Mortal life: nothing
		cult.immortalAscended = false;
		expect(cult.getTalismanEffect(30).count).toBe(0);
		expect(cult.getTalismanGoBonus()).toBe(0);
	});

	test("Rebirth: the fengshuiTier seal survives (and adds an imprint at Coiled Dragon or two divine talismans); veins, talismans and materials reset", function(){
		var cult = game.cultivation;
		cult.setIdentity("赖布衣", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		setNodes(cult, CHECKER_WOOD_FIRE);
		expect(cult.fengshuiTier).toBe(5);
		cult.talismanWorkshop.cinnabar = 20;

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.fengshuiTier).toBe(5);
		expect(rebirth.cultivation.fengshui).toBeUndefined();
		expect(rebirth.cultivation.talismanWorkshop).toBeUndefined();
		var imprintWith = rebirth.cultivation.immortalImprint || 0;

		// Same life with a plain pattern → no seal, one imprint fewer
		var keepNodes = cult.fengshui.nodes.slice(0);
		cult.fengshui.nodes = EMPTY9.slice(0);
		cult.fengshui.peakGrade = 0;
		cult.fengshuiTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.fengshuiTier).toBeUndefined();
		expect(imprintWith).toBe((rebirthPlain.cultivation.immortalImprint || 0) + 1);
		// Two divine talismans earn the same imprint
		cult.talismanWorkshop.drawn = 2;
		cult.talismanWorkshop.divine = 2;
		game.save();
		var rebirthDivine = game._resetInternal();
		expect(rebirthDivine.cultivation.immortalImprint || 0).toBe(imprintWith);
		cult.talismanWorkshop.divine = 0;
		cult.fengshui.nodes = keepNodes;

		cult.resetState();
		expect(cult.fengshuiTier).toBe(0);
		expect(cult.fengshui).toEqual(cult.makeDefaultFengshui());
		expect(cult.talismanWorkshop).toEqual(cult.makeDefaultTalismanWorkshop());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.fengshuiTier).toBe(5);
		expect(cult.fengshui.nodes).toEqual(EMPTY9);
		expect(cult.fengshui.level).toBe(1);
		expect(cult.talismanWorkshop.cinnabar).toBe(0);
		var seal = cult.getFengshuiSealBonus();
		expect(seal.tier).toBe(5);
		expect(seal.xiuweiRatio).toBeCloseTo(0.15, 9);
		expect(seal.startLevel).toBe(2);
		expect(seal.patternMult).toBeCloseTo(1.20, 9);
		expect(seal.stroke).toBe(5);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.setFengshuiNode(0, "wood")).toBe(false);	// still mortal

		// Next ascension: deeper starting survey, starter materials, steadier brush
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.fengshui.level).toBe(3);
		expect(cult.getFengshuiSlots()).toBe(5);
		expect(cult.talismanWorkshop.cinnabar).toBe(6);
		expect(cult.talismanWorkshop.paper).toBe(4);
		expect(cult.getTalismanStrokeBonus().seal).toBe(5);
		// Granted once, never lowered, not re-granted on load
		expect(cult.upgradeFengshuiSurvey()).toBe(true);
		cult.talismanWorkshop.cinnabar = 0;
		cult.talismanWorkshop.paper = 0;
		cult.talismanWorkshop.drawn = 1;
		var again = {};
		cult.save(again);
		cult.load(JSON.parse(JSON.stringify(again)));
		expect(cult.fengshui.level).toBe(4);
		expect(cult.talismanWorkshop.cinnabar).toBe(0);

		// The seal persists through another life (max of previous seal)
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.fengshuiTier).toBe(5);
	});

	test("Old saves (XX-12 era and earlier) and corrupted XX-13 fields load cleanly; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("蒋大鸿", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		// XX-12-era save: no XX-13 fields
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.fengshui;
		delete oldSave.cultivation.talismanWorkshop;
		delete oldSave.cultivation.fengshuiTier;
		expect(oldSave.cultivation.starGo).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.fengshui.level).toBe(1);
		expect(cult.fengshui.nodes).toEqual(EMPTY9);
		expect(cult.fengshuiTier).toBe(0);
		expect(cult.talismanWorkshop.cinnabar).toBe(6);
		expect(function(){ cult.tickFengshuiTalisman(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);
		expect(cult.setFengshuiNode(4, "earth")).toBe(true);

		// Ancient save (pre XX-12 / XX-13)
		var ancientSave = {};
		cult.save(ancientSave);
		["starGo", "auctionHouse", "starGoTier", "fengshui", "talismanWorkshop", "fengshuiTier", "samsaraMirror", "illusionTrial"].forEach(function(k){
			delete ancientSave.cultivation[k];
		});
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.getFengshuiEffect().grade).toBe(0);
		expect(cult.getStarGoMatchRules("tanlang").bonusCharm).toBe(0);

		// Mortal save
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.fengshui;
		delete mortalSave.cultivation.talismanWorkshop;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.drawTalisman("poxie", 0.5)).toBe(false);
		expect(cult.talismanWorkshop.cinnabar).toBe(0);
		expect(function(){ cult.tickFengshuiTalisman(5); }).not.toThrow();

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.fengshui = {level: 99, nodes: ["wood", "bogus", 7, "fire", "fire", "fire", "fire", "fire", "fire"], brush: "plasma", peakGrade: -3, rearranges: -3, lastNote: 5};
		badSave.cultivation.talismanWorkshop = {
			cinnabar: 1e9, paper: -4, trickle: 1e9, insight: 99,
			active: [
				{key: "poxie", quality: "divine", ticksLeft: 1e9},
				{key: "poxie", quality: "upper", ticksLeft: 50},
				{key: "bogus", quality: "middle", ticksLeft: 50},
				{key: "juling", quality: "fail", ticksLeft: 50},
				{key: "jinguang", quality: "lower", ticksLeft: 0},
				{key: "banyun", quality: "middle", ticksLeft: 10, maxTicks: 5},
				{key: "beidou", quality: "middle", ticksLeft: 10},
				{key: "juling", quality: "middle", ticksLeft: 10}
			],
			drawn: 3, failed: 9, divine: 9, expired: "x",
			lastDraw: {key: "poxie", quality: "upper", strokes: [99, -1, "x"], bonus: 7}
		};
		badSave.cultivation.fengshuiTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		expect(cult.fengshui.level).toBe(7);
		expect(cult.fengshui.nodes).toEqual(["wood", "", "", "fire", "fire", "fire", "fire", "fire", "fire"]);
		expect(cult.fengshui.brush).toBe("wood");
		expect(cult.fengshui.peakGrade).toBe(cult.computeFengshuiPattern(cult.fengshui.nodes).grade);
		expect(cult.fengshui.rearranges).toBe(0);
		expect(cult.fengshui.lastNote).toBe("");
		expect(cult.fengshuiTier).toBe(5);
		var bw = cult.talismanWorkshop;
		expect(bw.cinnabar).toBe(30);
		expect(bw.paper).toBe(0);
		expect(bw.trickle).toBe(599);
		expect(bw.insight).toBe(3);
		expect(bw.active).toEqual([
			{key: "poxie", quality: "divine", ticksLeft: 3150, maxTicks: 3150},
			{key: "banyun", quality: "middle", ticksLeft: 10, maxTicks: 10},
			{key: "beidou", quality: "middle", ticksLeft: 10, maxTicks: 10}
		]);
		expect(bw.drawn).toBe(3);
		expect(bw.failed).toBe(3);
		expect(bw.divine).toBe(3);
		expect(bw.expired).toBe(0);
		expect(bw.lastDraw).toEqual({key: "poxie", quality: "upper", strokes: [35, 5, 5], bonus: 7, total: 52});
		// Slots are honoured on load: a level-1 survey keeps only three veins
		badSave.cultivation.fengshui = {level: 1, nodes: ["wood", "fire", "earth", "metal", "water", "", "", "", ""]};
		badSave.cultivation.fengshuiTier = "x";
		badSave.cultivation.talismanWorkshop = "broken";
		badSave.cultivation.starGo = {beaten: {}, match: {lord: "tanlang", vals: [1, 1, 1, 1, 2, 1, 1, 1, 1], own: [0, 0, 0, 0, 0, 0, 0, 0, 0], charm: 5}};
		cult.resetState();
		cult.load(badSave);
		expect(cult.fengshui.nodes).toEqual(["wood", "fire", "earth", "", "", "", "", "", ""]);
		expect(cult.fengshuiTier).toBe(1);	// re-synced from this life's pattern
		expect(cult.talismanWorkshop.active).toEqual([]);
		expect(cult.starGo.match.charm).toBeUndefined();

		// Roundtrip: progress → save → JSON → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		cult.upgradeFengshuiSurvey();
		cult.upgradeFengshuiSurvey();
		cult.setFengshuiBrush("water");
		cult.applyFengshuiBrush(7);
		cult.setFengshuiBrush("metal");
		cult.applyFengshuiBrush(8);
		cult.applyFengshuiBrush(5);
		cult.drawTalisman("juling", 0.75);
		cult.drawTalisman("beidou", 0.1);
		cult.tickFengshuiTalisman(123);
		var snapFs = cult.normalizeFengshui(JSON.parse(JSON.stringify(cult.fengshui)));
		var snapWs = cult.normalizeTalismanWorkshop(JSON.parse(JSON.stringify(cult.talismanWorkshop)));
		var snapTier = cult.fengshuiTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.fengshui).toEqual(snapFs);
		expect(cult.talismanWorkshop).toEqual(snapWs);
		expect(cult.fengshuiTier).toBe(snapTier);
		expect(cult.talismanWorkshop.active.length).toBe(2);
		expect(cult.getTalismanGoBonus()).toBe(1);
	});

	test("Panel renders in the cultivation tab: palette, nine palaces, links, pouch, codex, targets; clicks work through event delegation; ?v=82 art; no raw placeholders", function(){
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
			if (el && el.addEventListener && evt === "onclick" && el.className && String(el.className).indexOf("xxFengshuiArena") >= 0){
				el.addEventListener("click", fn);
			}
		};

		try {
			var cult = game.cultivation;
			cult.setIdentity("袁天罡", "m", "scholar");
			cult.prepareImmortalCaveForTest(true);
			grantImmortalResources(50000);
			cult.talismanRandom = function(){ return 0.75; };
			var tab = game.cultivationTab;
			expect(tab instanceof classes.tab.CultivationTab).toBe(true);
			var host = document.createElement("div");
			document.body.appendChild(host);
			tab.render(host);
			tab.update();
			var el = host.querySelector(".xxFengshuiArena");
			expect(el).not.toBe(null);
			expect(el.style.display).toBe("block");
			expect(el.querySelectorAll(".xxFsPalace").length).toBe(9);
			expect(el.querySelectorAll(".xxFsLink").length).toBe(12);
			expect(el.querySelectorAll(".xxFsKnot").length).toBe(4);
			expect(el.querySelectorAll(".xxFsOpp").length).toBe(4);
			expect(el.querySelectorAll("[data-xx-fengshui=brush]").length).toBe(6);
			expect(el.querySelectorAll(".xxTalismanSlot").length).toBe(3);
			expect(el.querySelectorAll(".xxTalismanSlot.is-empty").length).toBe(3);
			expect(el.querySelectorAll(".xxTalismanCard").length).toBe(5);
			expect(el.querySelectorAll("[data-xx-fengshui=draw]").length).toBe(5);
			expect(el.querySelectorAll(".xxFsTarget").length).toBe(5);
			expect(el.querySelectorAll(".xxTalismanStroke").length).toBe(3);
			var imgs = el.querySelectorAll("img");
			expect(imgs.length).toBeGreaterThan(8);
			var seenArt = {};
			for (var i = 0; i < imgs.length; i++){
				expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
				expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(82);
				expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
				seenArt[imgs[i].getAttribute("src").split("?")[0]] = true;
			}
			["fengshui_compass", "spirit_vein_node", "five_elements_disc", "talisman_desk", "vermilion_talisman", "cinnabar_jar"].forEach(function(n){
				expect(seenArt["res/art/" + n + ".webp"]).toBe(true);
			});
			expect(el.innerHTML).not.toMatch(/undefined|NaN|<svg|<canvas/);

			// Clicks: brush → palace → node seated, links light up
			var click = function(sel){
				var t = el.querySelector(sel);
				expect(t).not.toBe(null);
				t.dispatchEvent(new window.MouseEvent("click", {bubbles: true}));
			};
			click("[data-xx-fengshui=brush][data-xx-arg=fire]");
			expect(cult.fengshui.brush).toBe("fire");
			expect(el.querySelector(".xxFsBrush.is-fire.is-active")).not.toBe(null);
			click("[data-xx-fengshui=place][data-xx-arg=\"1\"]");
			expect(cult.fengshui.nodes[1]).toBe("fire");
			click("[data-xx-fengshui=brush][data-xx-arg=wood]");
			click("[data-xx-fengshui=place][data-xx-arg=\"0\"] .xxFsPalaceName");	// bubbling from an inner span
			expect(cult.fengshui.nodes[0]).toBe("wood");
			expect(el.querySelectorAll(".xxFsPalace.has-node").length).toBe(2);
			expect(el.querySelectorAll(".xxFsPalace.is-seated").length).toBe(2);
			expect(el.querySelectorAll(".xxFsLink.is-sheng").length).toBe(1);
			expect(el.querySelectorAll(".xxFsNode img").length).toBe(2);

			// Draw through the codex; the pouch fills; burn empties it
			click("[data-xx-fengshui=draw][data-xx-arg=juling]");
			expect(cult.getActiveTalisman("juling")).not.toBe(null);
			expect(el.querySelectorAll(".xxTalismanSlot.is-empty").length).toBe(2);
			expect(el.querySelectorAll("[data-xx-fengshui=dismiss]").length).toBe(1);
			expect(el.querySelector(".xxTalismanJudge.is-blank")).toBe(null);
			click("[data-xx-fengshui=dismiss]");
			expect(cult.getActiveTalisman("juling")).toBe(null);
			click("[data-xx-fengshui=mat][data-xx-arg=cinnabar]");
			expect(cult.talismanWorkshop.cinnabar).toBe(6 - 2 + 3);
			click("[data-xx-fengshui=survey]");
			expect(cult.fengshui.level).toBe(2);
			// Disabled buttons do nothing
			cult.talismanWorkshop.paper = 0;
			tab._fengshuiSig = "";
			tab.update();
			expect(el.querySelectorAll("[data-xx-fengshui=draw]").length).toBe(0);
			expect(el.innerHTML).not.toMatch(/undefined|NaN/);

			// Mortal with a past-life seal: locked notice only
			cult.resetState();
			cult.fengshuiTier = 3;
			tab._fengshuiSig = "";
			tab.update();
			expect(el.style.display).toBe("block");
			expect(el.className).toContain("is-locked");
			expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
			expect(el.querySelectorAll(".xxFsPalace").length).toBe(0);
		} finally {
			global.dojo.connect = origConnect;
		}
	});

	test("XX-13 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 82", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(82);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(82);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var assets = [
			"res/art/fengshui_compass.webp",
			"res/art/spirit_vein_node.webp",
			"res/art/five_elements_disc.webp",
			"res/art/talisman_desk.webp",
			"res/art/vermilion_talisman.webp",
			"res/art/cinnabar_jar.webp"
		];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
			expect(cultSrc).toContain(assets[i]);
		}
		expect(cultSrc).not.toMatch(/\?v=81\b/);
		expect(cultSrc).not.toContain("ART_VER || \"81\"");
		var xx13Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalFengshuiEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx13Ui.length).toBeGreaterThan(1000);
		expect(xx13Ui).not.toContain("<svg");
		expect(xx13Ui).not.toContain("<canvas");
		expect(xx13Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
		var xx13Logic = cultSrc.slice(cultSrc.indexOf("XX-13 灵脉风水堪舆与符箓画坊"), cultSrc.indexOf("getImmortalCaveBonuses: function(riftFloorOpt){"));
		expect(xx13Logic.length).toBeGreaterThan(1000);
		expect(xx13Logic).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxFengshuiArena");
		expect(css).toContain(".xxFsBoard");
		expect(css).toContain(".xxTalismanCatalog");
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxFsOppList/);
		expect(css).toMatch(/@media \(max-width: 920px\)\s*\{\s*\.xxFsLowerGrid/);
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxFsConsole/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.fengshui.", "cultivation.talisman."];
		var pick = function(obj){
			return Object.keys(obj).filter(function(k){
				return prefixes.some(function(p){ return k.indexOf(p) === 0; });
			}).sort();
		};
		var zhKeys = pick(zh);
		var enKeys = pick(en);
		expect(zhKeys.length).toBeGreaterThanOrEqual(140);
		expect(zhKeys).toEqual(enKeys);
		var placeholders = function(s){ return (String(s).match(/\{\d\}/g) || []).sort().join(","); };
		for (var pk = 0; pk < zhKeys.length; pk++){
			expect(placeholders(en[zhKeys[pk]])).toBe(placeholders(zh[zhKeys[pk]]));
			expect(/[一-鿿]/.test(zh[zhKeys[pk]])).toBe(true);
		}
		expect(en["cultivation.fengshui.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var need = [];
		cult.FENGSHUI_ELEMENTS.forEach(function(e){ need.push("cultivation.fengshui.el." + e.key); });
		cult.FENGSHUI_PALACES.forEach(function(p){ need.push("cultivation.fengshui.palace." + p.key + ".label", "cultivation.fengshui.palace." + p.key + ".dir"); });
		cult.FENGSHUI_GRADES.forEach(function(g){ need.push("cultivation.fengshui.grade." + g.key); });
		cult.FENGSHUI_TARGETS.forEach(function(t){ need.push("cultivation.fengshui.target." + t.key + ".label", "cultivation.fengshui.target." + t.key + ".desc"); });
		cult.TALISMANS.forEach(function(t){ need.push("cultivation.talisman.item." + t.key + ".label", "cultivation.talisman.item." + t.key + ".desc", "cultivation.talisman.item." + t.key + ".eff"); });
		cult.TALISMAN_QUALITIES.forEach(function(q){ need.push("cultivation.talisman.quality." + q.key); });
		["sheng", "ke", "bihe"].forEach(function(r){ need.push("cultivation.fengshui.rel." + r, "cultivation.fengshui.opp." + r); });
		["rift", "go", "herb"].forEach(function(s){ need.push("cultivation.talisman.card.scope." + s); });
		["head", "heart", "foot"].forEach(function(s){ need.push("cultivation.talisman.stroke." + s); });
		["on", "off", "go", "go.live"].forEach(function(s){ need.push("cultivation.fengshui.synergy." + s); });
		need.push("cultivation.fengshui.opp.none", "cultivation.fengshui.palace.full", "cultivation.fengshui.palace.empty");
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
