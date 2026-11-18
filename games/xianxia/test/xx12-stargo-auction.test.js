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

//残局:你执白待落最后一手(第 0 位),落下即终局。
//星辉 [3,3,3 / 1,3,1 / 1,3,1];白占 1,2,4,7,星君占 3,5,6,8 → 终局白 15 星辉 + 两条连星(首行、中列)
var WIN_VALS = [3, 3, 3, 1, 3, 1, 1, 3, 1];
var WIN_OWN = [0, 1, 1, 2, 1, 2, 2, 1, 2];
//星辉 [1,1,1 / 3,3,3 / 1,3,1];白占 1,2,6,8,星君占 3,4,5,7(中行连星) → 终局白 5+2 : 星君 12+2
var LOSS_VALS = [1, 1, 1, 3, 3, 3, 1, 3, 1];
var LOSS_OWN = [0, 1, 1, 2, 2, 2, 1, 2, 1];
//全 1 星辉,双方均无连星:白 5 子 5 目,星君 4 子 + 贴目 1 → 和局(对巨门星君)
var DRAW_VALS = [1, 1, 1, 1, 1, 1, 1, 1, 1];
var DRAW_OWN = [1, 1, 2, 2, 2, 1, 1, 2, 0];

function playEndgame(cult, lordKey, vals, own, lastCell){
	expect(cult.startStarGo(lordKey, 0.5)).toBe(true);
	cult.starGo.match.vals = vals.slice(0);
	cult.starGo.match.own = own.slice(0);
	expect(cult.starGoMove(lastCell, 0)).toBe(true);
	expect(cult.starGo.match).toBe(null);
	return cult.starGo.lastResult;
}

function beatLords(cult, n){
	for (var i = 0; i < n; i++){
		var key = cult.STAR_GO_LORDS[i].key;
		cult.starGo.cooldown = 0;
		var res = playEndgame(cult, key, WIN_VALS, WIN_OWN, 0);
		expect(res.result).toBe("win");
	}
}

describe("XX-12 Zhoutian Star Go Duel & Myriad-Realms Treasure Auction", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	afterEach(function(){
		game.cultivation.auctionRandom = null;
		jest.restoreAllMocks();
	});

	test("Star Go: locked before ascension; lords unlock in order; injected roll fixes the board; lord replies deterministically", function(){
		var cult = game.cultivation;
		cult.setIdentity("弈秋", "m", "scholar");

		expect(cult.startStarGo("tanlang", 0.5)).toBe(false);
		expect(cult.starGoMove(4, 0)).toBe(false);
		expect(cult.resignStarGo()).toBe(false);
		expect(cult.openAuctionLot(0.3)).toBe(false);
		expect(cult.placeAuctionBid(1)).toBe(false);
		expect(function(){ cult.tickStarGoAuction(50); }).not.toThrow();
		expect(cult.getStarGoPassiveEffect().lit).toBe(0);
		expect(cult.getAuctionTreasureEffect().count).toBe(0);

		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);

		expect(cult.STAR_GO_LORDS.length).toBe(7);
		expect(cult.STAR_GO_PASSIVES.length).toBe(6);
		expect(cult.starGo.glow).toBe(0);
		expect(cult.starGo.match).toBe(null);
		expect(cult.starGoTier).toBe(0);
		expect(cult.getStarGoBeatenCount()).toBe(0);
		expect(cult.isStarGoLordUnlocked("tanlang")).toBe(true);
		expect(cult.isStarGoLordUnlocked("jumen")).toBe(false);
		expect(cult.isStarGoLordUnlocked("nobody")).toBe(false);
		expect(cult.getStarGoEnterReq("nobody")).toBe(null);
		expect(cult.getStarGoEnterReq("jumen").affordable).toBe(false);
		expect(cult.startStarGo("jumen", 0.5)).toBe(false);

		var req = cult.getStarGoEnterReq("tanlang");
		expect(req.fee).toBe(20);
		expect(req.rules.komi).toBe(0);
		expect(req.rules.bonus).toBe(0);
		expect(req.rules.lineP).toBe(2);
		expect(req.firstWin).toBe(true);

		// The injected roll fixes the board; the same roll always yields the same board
		var seed = cult.starGoSeedFromRoll(0.5);
		var board = cult.starGoGenBoard(seed);
		expect(cult.starGoGenBoard(seed)).toEqual(board);
		expect(board.length).toBe(9);
		for (var b = 0; b < 9; b++){
			expect(board[b]).toBeGreaterThanOrEqual(b === 4 ? 2 : 1);
			expect(board[b]).toBeLessThanOrEqual(3);
		}
		expect(cult.starGoGenBoard(cult.starGoSeedFromRoll(0.123))).not.toEqual(board);

		var xy0 = game.resPool.get("xianyuan").value;
		expect(cult.startStarGo("tanlang", 0.5)).toBe(true);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 20);
		var m = cult.starGo.match;
		expect(m.lord).toBe("tanlang");
		expect(m.vals).toEqual(board);
		expect(m.own).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
		expect(m.fee).toBe(20);
		expect(cult.starGo.lastNote).toContain("周天星辰弈局");
		// One game at a time
		expect(cult.getStarGoEnterReq("tanlang").active).toBe(true);
		expect(cult.startStarGo("tanlang", 0.1)).toBe(false);

		// Illegal moves
		expect(cult.starGoMove(-1, 0)).toBe(false);
		expect(cult.starGoMove(9, 0)).toBe(false);
		expect(cult.starGoMove(1.5, 0)).toBe(false);
		expect(cult.starGoMove("x", 0)).toBe(false);

		// The lord's reply is exactly what getStarGoLordMove predicts for that roll
		var rules = cult.getStarGoMatchRules("tanlang");
		var afterMine = cult.starGoPlace(m.own, 4, 1).own;
		var predicted = cult.getStarGoLordMove(afterMine, m.vals, rules, 0.42);
		expect(cult.getStarGoLordMove(afterMine, m.vals, rules, 0.42)).toBe(predicted);
		expect(cult.starGoMove(4, 0.42)).toBe(true);
		m = cult.starGo.match;
		expect(m.own[4]).toBe(1);
		expect(m.lastPlayer).toBe(4);
		expect(m.lastLord).toBe(predicted);
		expect(m.own[predicted]).toBe(2);
		expect(cult.starGoEmptyCount(m.own)).toBe(7);
		expect(cult.starGoMove(4, 0)).toBe(false);
		expect(cult.starGoMove(predicted, 0)).toBe(false);
		expect(cult.starGo.lastNote).toContain("落子");

		// A whole game replayed with the same rolls ends identically
		var playOut = function(){
			var c = game.cultivation;
			c.starGo.cooldown = 0;
			expect(c.startStarGo("tanlang", 0.77)).toBe(true);
			var rolls = [0.11, 0.52, 0.93, 0.34, 0.65];
			var guard = 0;
			while (c.starGo.match && guard < 9){
				var own = c.starGo.match.own;
				var pick = -1;
				for (var i = 0; i < 9; i++){ if (!own[i]){ pick = i; break; } }
				expect(c.starGoMove(pick, rolls[guard % rolls.length])).toBe(true);
				guard++;
			}
			expect(guard).toBe(5);	// 你五手,星君四手
			return JSON.parse(JSON.stringify(c.starGo.lastResult));
		};
		cult.resignStarGo();
		var r1 = playOut();
		var r2 = playOut();
		expect(r2.own).toEqual(r1.own);
		expect(r2.player).toBe(r1.player);
		expect(r2.lordScore).toBe(r1.lordScore);
		expect(r2.result).toBe(r1.result);
	});

	test("Board rules: surround capture flips, three-in-a-row lines, komi and bonus points; lord AI respects slack", function(){
		var cult = game.cultivation;
		cult.prepareImmortalCaveForTest(true);

		// Corner capture: lord at 0, you hold 1 and play 3
		var pc = cult.starGoPlace([2, 1, 0, 0, 0, 0, 0, 0, 0], 3, 1);
		expect(pc.flips).toEqual([0]);
		expect(pc.own[0]).toBe(1);
		// Edge capture needs all three neighbours
		var pe = cult.starGoPlace([1, 2, 0, 0, 1, 0, 0, 0, 0], 2, 1);
		expect(pe.flips).toEqual([1]);
		var pn = cult.starGoPlace([0, 2, 0, 0, 1, 0, 0, 0, 0], 2, 1);
		expect(pn.flips).toEqual([]);
		// Centre capture needs all four neighbours; captures do not chain
		var pt = cult.starGoPlace([0, 1, 0, 1, 2, 1, 0, 0, 0], 7, 1);
		expect(pt.flips).toEqual([4]);
		expect(cult.starGoPlace([0, 1, 0, 1, 2, 2, 0, 0, 0], 7, 1).flips).toEqual([]);
		// Lord captures the same way
		expect(cult.starGoPlace([1, 2, 0, 0, 0, 0, 0, 0, 0], 3, 2).flips).toEqual([0]);

		var s = cult.starGoScore([1, 1, 1, 2, 1, 2, 2, 1, 2], WIN_VALS, 1, 2);
		expect(s.stones).toBe(5);
		expect(s.points).toBe(15);
		expect(s.lines).toBe(2);
		expect(s.total).toBe(19);
		expect(cult.starGoScore([1, 1, 1, 2, 1, 2, 2, 1, 2], WIN_VALS, 2, 2).total).toBe(4);

		var sc = cult.getStarGoMatchScore({lord: "pojun", vals: WIN_VALS, own: [1, 1, 1, 2, 1, 2, 2, 1, 2], captures: 0}, cult.getStarGoMatchRules("pojun"));
		expect(sc.komi).toBe(7);
		expect(sc.lord).toBe(11);
		expect(sc.player).toBe(19);

		// Slack 0 (pojun) always takes the single best point; slack 2 (tanlang) spreads over several by roll
		var vals = [1, 1, 1, 1, 3, 1, 1, 1, 1];
		var own = [1, 0, 0, 0, 0, 0, 0, 0, 0];
		var pojun = cult.getStarGoMatchRules("pojun");
		expect(cult.getStarGoLordMove(own, vals, pojun, 0)).toBe(4);
		expect(cult.getStarGoLordMove(own, vals, pojun, 0.99)).toBe(4);
		var tanlang = cult.getStarGoMatchRules("tanlang");
		var flat = [1, 1, 1, 1, 1, 1, 1, 1, 1];
		var seen = {};
		for (var r = 0; r < 10; r++){
			var mv = cult.getStarGoLordMove(own, flat, tanlang, r / 10);
			expect(own[mv]).toBe(0);
			seen[mv] = true;
		}
		expect(Object.keys(seen).length).toBeGreaterThan(1);
		expect(cult.getStarGoLordMove([1, 2, 1, 2, 1, 2, 1, 2, 1], vals, pojun, 0)).toBe(-1);
	});

	test("Game results: wins (first ×2), purse, unlocks and seal; losses give insight + cooldown; draws refund; resign", function(){
		var cult = game.cultivation;
		cult.setIdentity("黑白子", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);

		// First win vs tanlang
		var xy0 = game.resPool.get("xianyuan").value;
		var res = playEndgame(cult, "tanlang", WIN_VALS, WIN_OWN, 0);
		expect(res.result).toBe("win");
		expect(res.first).toBe(true);
		expect(res.player).toBe(19);
		expect(res.lordScore).toBe(4);
		expect(res.glow).toBe(8);
		expect(res.purse).toBe(36);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 20 + 36);
		expect(cult.starGo.glow).toBe(8);
		expect(cult.starGo.beaten.tanlang).toBe(1);
		expect(cult.starGo.wins).toBe(1);
		expect(cult.starGo.games).toBe(1);
		expect(cult.starGoTier).toBe(1);
		expect(cult.isStarGoLordUnlocked("jumen")).toBe(true);
		expect(cult.starGo.lastNote).toContain("弈胜首局");

		// Rematch: glow ×1, half purse (no essence farming); the seal already trims the stake
		var reReq = cult.getStarGoEnterReq("tanlang");
		expect(reReq.fee).toBe(19);
		expect(reReq.purse).toBe(18);
		xy0 = game.resPool.get("xianyuan").value;
		res = playEndgame(cult, "tanlang", WIN_VALS, WIN_OWN, 0);
		expect(res.first).toBe(false);
		expect(res.glow).toBe(4);
		expect(res.purse).toBe(18);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - 19 + 18);
		expect(cult.starGo.glow).toBe(12);
		expect(cult.starGo.beaten.tanlang).toBe(2);

		// Loss: insight +1 (+1 point next game), 300-tick cooldown
		res = playEndgame(cult, "tanlang", LOSS_VALS, LOSS_OWN, 0);
		expect(res.result).toBe("loss");
		expect(res.player).toBe(7);
		expect(res.lordScore).toBe(14);
		expect(res.glow).toBe(0);
		expect(cult.starGo.losses).toBe(1);
		expect(cult.starGo.insight).toBe(1);
		expect(cult.starGo.cooldown).toBe(300);
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(1);
		expect(cult.getStarGoEnterReq("jumen").cooldownOk).toBe(false);
		expect(cult.startStarGo("jumen", 0.5)).toBe(false);
		cult.tickStarGoAuction(299);
		expect(cult.startStarGo("jumen", 0.5)).toBe(false);
		cult.tickStarGoAuction(1);
		expect(cult.starGo.cooldown).toBe(0);

		// Draw vs jumen (komi 1, insight +1 cancels): stake refunded, a third of the glow
		xy0 = game.resPool.get("xianyuan").value;
		cult.starGo.insight = 0;
		res = playEndgame(cult, "jumen", DRAW_VALS, DRAW_OWN, 8);
		expect(res.result).toBe("draw");
		expect(res.player).toBe(5);
		expect(res.lordScore).toBe(5);
		expect(res.glow).toBe(2);
		expect(game.resPool.get("xianyuan").value).toBe(xy0);
		expect(cult.starGo.draws).toBe(1);
		expect(cult.starGo.beaten.jumen).toBe(0);

		// Win clears insight
		cult.starGo.insight = 2;
		res = playEndgame(cult, "jumen", WIN_VALS, WIN_OWN, 0);
		expect(res.result).toBe("win");
		expect(cult.starGo.insight).toBe(0);
		expect(cult.starGoTier).toBe(2);

		// Resign: counts as a loss, cooldown, but no insight
		expect(cult.startStarGo("lucun", 0.5)).toBe(true);
		expect(cult.resignStarGo()).toBe(true);
		expect(cult.starGo.lastResult.result).toBe("resign");
		expect(cult.starGo.insight).toBe(0);
		expect(cult.starGo.cooldown).toBe(300);
		expect(cult.starGo.losses).toBe(2);
		expect(cult.starGo.games).toBe(6);

		// Live update loop ticks the cooldown too
		cult.update();
		expect(cult.starGo.cooldown).toBeLessThan(300);

		// Poor immortals cannot pay the stake
		cult.starGo.cooldown = 0;
		game.resPool.get("xianyuan").value = 5;
		expect(cult.getStarGoEnterReq("lucun").affordable).toBe(false);
		expect(cult.startStarGo("lucun", 0.5)).toBe(false);
	});

	test("Star-point powers: glow thresholds, office & six-paths synergy, path perks rewrite the rules; combat cap; thunder pursuit untouched", function(){
		var cult = game.cultivation;
		cult.setIdentity("吴清源", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);

		var b0 = cult.getImmortalCaveBonuses(30);
		cult.starGo.glow = 9;
		expect(cult.getStarGoLitCount()).toBe(0);
		cult.starGo.glow = 10;
		expect(cult.isStarGoPassiveLit("sansan")).toBe(true);
		expect(cult.getStarGoLitCount()).toBe(1);
		var b1 = cult.getImmortalCaveBonuses(30);
		expect(b1.realmProductionRatio).toBeCloseTo(b0.realmProductionRatio + 0.06, 6);
		cult.starGo.glow = 30;
		expect(cult.getImmortalCaveBonuses(30).xiuweiRatio).toBeCloseTo(b0.xiuweiRatio + 0.08, 6);
		cult.starGo.glow = 60;
		expect(cult.getStarGoPassiveEffect().xianyuanRatio).toBeCloseTo(0.04, 6);
		cult.starGo.glow = 240;
		var all = cult.getStarGoPassiveEffect();
		expect(all.lit).toBe(6);
		expect(all.riftDmg).toBeCloseTo(0.05, 6);
		expect(all.riftHp).toBeCloseTo(0.05, 6);
		expect(all.herbSpeed).toBeCloseTo(0.08, 6);
		expect(all.bountySpeed).toBeCloseTo(0.08, 6);
		expect(all.lineBonus).toBe(1);
		expect(all.bonus).toBe(1);
		expect(all.revealed).toBe(1);	// human is pre-revealed
		expect(all.pathXiuwei).toBeCloseTo(0.02, 6);
		var rules = cult.getStarGoMatchRules("tanlang");
		expect(rules.lineP).toBe(3);
		expect(rules.bonus).toBe(1);
		// Preview mode for the panel
		expect(cult.getStarGoPassiveEffect(100).lit).toBe(4);

		// XX-10 offices: +1% Essence per office on Hoshi, +5% glow per office, rivals' ceilings -1.5% per office
		cult.fengshenRoster.layer = 33;
		expect(cult.getFengshenOfficeCount()).toBe(7);
		var withOffices = cult.getStarGoPassiveEffect();
		expect(withOffices.officeXianyuan).toBeCloseTo(0.07, 6);
		expect(withOffices.xianyuanRatio).toBeCloseTo(0.11, 6);
		expect(cult.getStarGoGlowMult()).toBeCloseTo(1.35, 6);
		expect(cult.getStarGoMatchRules("tanlang").glow).toBe(Math.round(4 * 1.35));
		expect(cult.getAuctionPrestige()).toBeCloseTo(0.105, 6);

		// XX-11 six paths: Tengen scales with revealed lives; the walked path rewrites the duel
		cult.illusionTrial.layer = 9;
		["deva", "asura", "beast", "preta", "naraka"].forEach(function(k){
			expect(cult.revealSamsaraPath(k)).toBe(true);
		});
		expect(cult.getStarGoPassiveEffect().pathXiuwei).toBeCloseTo(0.12, 6);
		var base = cult.getStarGoMatchRules("pojun");
		expect(base.komi).toBe(7);
		var expectPerk = function(pathKey, check){
			cult.samsaraMirror.switchCooldown = 0;
			if (cult.samsaraMirror.activePath !== pathKey){
				expect(cult.chooseSamsaraPath(pathKey)).toBe(true);
			}
			expect(cult.getStarGoPathPerk().path).toBe(pathKey);
			check(cult.getStarGoMatchRules("pojun"));
		};
		expectPerk("deva", function(r){ expect(r.bonus).toBe(base.bonus + 1); expect(r.bonusPath).toBe(1); });
		expectPerk("human", function(r){ expect(r.glow).toBe(Math.round(20 * 1.35 * 1.2)); });
		expectPerk("asura", function(r){ expect(r.capture).toBe(1); });
		expectPerk("beast", function(r){ expect(r.lineP).toBe(base.lineP + 1); });
		expectPerk("preta", function(r){ expect(r.purse).toBe(225); });
		expectPerk("naraka", function(r){ expect(r.komi).toBe(6); });
		var capScore = cult.getStarGoMatchScore({lord: "pojun", vals: WIN_VALS, own: [1, 1, 1, 2, 1, 2, 2, 1, 2], captures: 2}, (function(){
			var rr = cult.getStarGoMatchRules("pojun");
			rr.capture = 1;
			return rr;
		})());
		expect(capScore.capturePts).toBe(2);

		// Combat-facing bonuses are capped: Takamoku + Universe Ring + Purple-Ribbon Robe
		var cb0 = cult.getStarAuctionCombatBonus();
		expect(cb0.riftDmg).toBeCloseTo(0.05, 6);
		expect(cb0.capped).toBe(false);
		cult.auctionHouse.owned.qiankunRing = true;
		cult.auctionHouse.owned.zishouRobe = true;
		var cb = cult.getStarAuctionCombatBonus();
		expect(cb.rawDmg).toBeCloseTo(0.09, 6);
		expect(cb.rawHp).toBeCloseTo(0.10, 6);
		expect(cb.riftDmg).toBeCloseTo(0.08, 6);
		expect(cb.riftHp).toBeCloseTo(0.08, 6);
		expect(cb.mitigation).toBeCloseTo(0.01, 6);
		expect(cb.capped).toBe(true);
		var withTreasures = cult.getImmortalCaveBonuses(30);
		cult.auctionHouse.owned.qiankunRing = false;
		cult.auctionHouse.owned.zishouRobe = false;
		cult.starGo.glow = 0;
		var noXX12 = cult.getImmortalCaveBonuses(30);
		expect(withTreasures.riftDmgMult / noXX12.riftDmgMult).toBeCloseTo(1.08, 6);
		expect(withTreasures.riftHpMult / noXX12.riftHpMult).toBeCloseTo(1.08, 6);

		// XX-10's thunder pursuit (0.795 at the very top, verified again by XX-11) is left exactly as it was
		cult.samsaraMirror.switchCooldown = 0;
		cult.chooseSamsaraPath("human");
		cult.illusionTrial.layer = 0;
		cult.innateTreasures.levels.chaosBell = 3;
		cult.innateTreasures.levels.panguBanner = 3;
		cult.innateTreasures.levels.taijiDiagram = 3;
		cult.innateTreasures.levels.creationDisc = 3;
		cult.thunderPool.tier = 9;
		cult.syncThunderTemperTier();
		cult.samsaraMirror.activePath = null;
		var strikeBefore = cult.getImmortalCaveBonuses(31).thunderStrikeRatio;
		expect(strikeBefore).toBeCloseTo(0.795, 6);
		cult.starGo.glow = 999;
		for (var tk in cult.auctionHouse.owned){
			if (cult.auctionHouse.owned.hasOwnProperty(tk)){ cult.auctionHouse.owned[tk] = true; }
		}
		cult.starGoTier = 7;
		var after = cult.getImmortalCaveBonuses(31);
		expect(after.thunderStrikeRatio).toBe(strikeBefore);
		expect(after.riftMitigation).toBeLessThanOrEqual(0.88);
		expect(after.riftCritChance).toBeLessThan(1);
		expect(cult.getThunderStrikeRatio()).toBe(strikeBefore);

		// Immortal-only: a mortal life gets nothing from passives or treasures
		cult.immortalAscended = false;
		expect(cult.getStarGoPassiveEffect().lit).toBe(0);
		expect(cult.getAuctionTreasureEffect().count).toBe(0);
		expect(cult.getStarAuctionCombatBonus().riftDmg).toBe(0);
		expect(cult.getStarGoPathPerk().path).toBe(null);
	});

	test("Auction: injected roll fixes lot and rivals; warm-up, escrow bids, proxy rivals, hammer, timed settle, once-per-life treasures, materials", function(){
		var cult = game.cultivation;
		cult.setIdentity("赵公明", "m", "merchant");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		expect(cult.auctionHouse.lot).not.toBe(null);	// a lot opens on ascension

		// Same roll → same lot, same rival ceilings
		expect(cult.openAuctionLot(0.3)).toBe(true);
		var lotA = JSON.parse(JSON.stringify(cult.auctionHouse.lot));
		expect(cult.openAuctionLot(0.3)).toBe(true);
		expect(cult.auctionHouse.lot).toEqual(lotA);
		expect(cult.openAuctionLot(0.61)).toBe(true);
		expect(cult.auctionHouse.lot.seed).not.toBe(lotA.seed);

		// Forced lot + ceiling shape + warm-up
		expect(cult.openAuctionLot(0.3, "luobaoCoin")).toBe(true);
		var lot = cult.auctionHouse.lot;
		expect(lot.key).toBe("luobaoCoin");
		expect(lot.kind).toBe("treasure");
		expect(lot.cur).toBe("xianyuan");
		expect(lot.ticksLeft).toBe(cult.AUCTION_LOT_TICKS);
		expect(lot.rivals.length).toBe(3);
		var ceilings = lot.rivals.map(function(r){ return r.ceiling; });
		ceilings.forEach(function(c, i){
			if (c > 0){
				expect((c - lot.start) % lot.inc).toBe(0);
				expect(c).toBeGreaterThanOrEqual(lot.start);
				var rv = cult.AUCTION_RIVALS[i];
				expect(c).toBeLessThanOrEqual(lot.start * (rv.hi + 0.10));
			}
		});
		var order = cult.getAuctionRivalOrder(lot);
		var top = lot.rivals[order[0]];
		var second = lot.rivals[order[1]];
		expect(lot.leader).toBe(top.key);
		expect(lot.price).toBe(Math.min(top.ceiling, second.ceiling + lot.inc));

		// Bidding: escrow is taken, the top rival answers one step higher and the deposit is refunded
		var xy0 = game.resPool.get("xianyuan").value;
		var clicks = 0;
		while (lot.leader !== "player" && clicks < 40){
			var amt = cult.getAuctionBidAmount(1);
			expect(amt).toBe(lot.price + lot.inc);
			expect(cult.placeAuctionBid(1)).toBe(true);
			clicks++;
			if (lot.leader !== "player"){
				expect(lot.price).toBe(amt + lot.inc);
				expect(lot.leader).toBe(top.key);
				expect(lot.playerBid).toBe(0);
				expect(game.resPool.get("xianyuan").value).toBe(xy0);
			}
		}
		expect(lot.leader).toBe("player");
		expect(lot.playerBid).toBe(lot.price);
		expect(lot.price).toBeGreaterThan(top.ceiling - lot.inc);
		expect(lot.price).toBeLessThanOrEqual(top.ceiling + lot.inc);
		expect(game.resPool.get("xianyuan").value).toBe(xy0 - lot.playerBid);
		expect(cult.auctionHouse.lastNote).toContain("领先全场");
		// No outbidding yourself
		expect(cult.getAuctionBidReq(1).leading).toBe(true);
		expect(cult.placeAuctionBid(1)).toBe(false);

		// Hammer: the treasure is yours, a fresh lot is up, and the treasure never returns this life
		var paid = lot.playerBid;
		var bBefore = cult.getImmortalCaveBonuses(30);
		cult.auctionRandom = function(){ return 0.2; };
		expect(cult.hammerAuctionLot()).toBe(true);
		expect(cult.auctionHouse.owned.luobaoCoin).toBe(true);
		expect(cult.auctionHouse.won).toBe(1);
		expect(cult.auctionHouse.spentXianyuan).toBe(paid);
		expect(cult.auctionHouse.history[0]).toEqual({key: "luobaoCoin", winner: "player", price: paid, cur: "xianyuan"});
		expect(cult.auctionHouse.lot).not.toBe(null);
		expect(cult.auctionHouse.lot.key).not.toBe("luobaoCoin");
		expect(cult.hasAuctionTreasure("luobaoCoin")).toBe(true);
		expect(cult.getImmortalCaveBonuses(30).xianyuanRatio).toBeCloseTo(bBefore.xianyuanRatio + 0.05, 6);
		expect(cult.openAuctionLot(0.3, "luobaoCoin")).toBe(true);
		expect(cult.auctionHouse.lot.key).not.toBe("luobaoCoin");
		expect(cult.hammerAuctionLot()).toBe(false);

		// Timed settle: a rival who leads takes the lot when the gong sounds; the next lot opens from the injected rng
		expect(cult.openAuctionLot(0.3, "dinghaiPearl")).toBe(true);
		var rivalLot = cult.auctionHouse.lot;
		expect(rivalLot.leader).not.toBe("player");
		var rivalKey = rivalLot.leader;
		var rivalPrice = rivalLot.price;
		cult.tickStarGoAuction(cult.AUCTION_LOT_TICKS - 1);
		expect(cult.auctionHouse.lot).toBe(rivalLot);
		expect(rivalLot.ticksLeft).toBe(1);
		cult.tickStarGoAuction(1, function(){ return 0.45; });
		expect(cult.auctionHouse.lostToRivals).toBe(1);
		expect(cult.auctionHouse.history[0]).toEqual({key: "dinghaiPearl", winner: rivalKey, price: rivalPrice, cur: "xianyuan"});
		expect(cult.auctionHouse.owned.dinghaiPearl).toBe(false);
		var nextLot = JSON.parse(JSON.stringify(cult.auctionHouse.lot));
		cult.openAuctionLot(0.45);
		expect(cult.auctionHouse.lot).toEqual(nextLot);

		// Timed settle in your favour (Flux Crystal lot)
		expect(cult.openAuctionLot(0.3, "zhoutianBoard")).toBe(true);
		var tcLot = cult.auctionHouse.lot;
		expect(tcLot.cur).toBe("timeCrystal");
		var tc0 = game.resPool.get("timeCrystal").value;
		var guard = 0;
		while (tcLot.leader !== "player" && guard < 30){ cult.placeAuctionBid(4); guard++; }
		expect(tcLot.leader).toBe("player");
		expect(game.resPool.get("timeCrystal").value).toBe(tc0 - tcLot.playerBid);
		cult.tickStarGoAuction(cult.AUCTION_LOT_TICKS);
		expect(cult.auctionHouse.owned.zhoutianBoard).toBe(true);
		expect(cult.auctionHouse.won).toBe(2);
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(1);
		expect(cult.getStarGoMatchRules("tanlang").glow).toBe(4 + 2);

		// Withdrawing a lot you lead refunds your deposit
		expect(cult.openAuctionLot(0.3, "riftToken")).toBe(true);
		var tokLot = cult.auctionHouse.lot;
		tc0 = game.resPool.get("timeCrystal").value;
		guard = 0;
		while (tokLot.leader !== "player" && guard < 30){ cult.placeAuctionBid(4); guard++; }
		expect(game.resPool.get("timeCrystal").value).toBeLessThan(tc0);
		expect(cult.openAuctionLot(0.5)).toBe(true);
		expect(game.resPool.get("timeCrystal").value).toBe(tc0);

		// Materials feed existing systems
		var buy = function(key){
			expect(cult.openAuctionLot(0.3, key)).toBe(true);
			var l = cult.auctionHouse.lot;
			var g = 0;
			while (l.leader !== "player" && g < 30){ expect(cult.placeAuctionBid(4)).toBe(true); g++; }
			expect(cult.hammerAuctionLot()).toBe(true);
		};
		var orbs0 = cult.thunderPool.thunderOrbs || 0;
		buy("thunderMarrow");
		expect(cult.thunderPool.thunderOrbs).toBe(orbs0 + 30);
		expect(cult.thunderOrbs).toBe(orbs0 + 30);
		var merit0 = cult.fengshenRoster.merit || 0;
		buy("meritScroll");
		expect(cult.fengshenRoster.merit).toBe(merit0 + 40);
		var sand0 = cult.chronoAltar.chronoSand || 0;
		buy("chronoSandJar");
		expect(cult.chronoAltar.chronoSand).toBe(sand0 + 12);
		var keys0 = cult.riftKeys || 0;
		buy("riftToken");
		expect(cult.riftKeys).toBe(keys0 + 2);
		expect(cult.auctionHouse.materialsWon).toBe(4);
		// Materials can come back again
		expect(cult.openAuctionLot(0.3, "riftToken")).toBe(true);
		expect(cult.auctionHouse.lot.key).toBe("riftToken");

		// Once every treasure is owned, only materials are offered
		for (var tk in cult.auctionHouse.owned){
			if (cult.auctionHouse.owned.hasOwnProperty(tk)){ cult.auctionHouse.owned[tk] = true; }
		}
		for (var r = 0; r < 25; r++){
			cult.openAuctionLot(r / 25);
			expect(cult.auctionHouse.lot.kind).toBe("material");
		}

		// Injectable random source drives the timed rotation; offline catch-up settles at most 6 lots per tick
		cult.auctionRandom = function(){ return 0.3; };
		cult.auctionHouse.lot = null;
		cult.tickStarGoAuction(1);
		var viaTick = JSON.parse(JSON.stringify(cult.auctionHouse.lot));
		cult.openAuctionLot(0.3);
		expect(cult.auctionHouse.lot).toEqual(viaTick);
		var opened0 = cult.auctionHouse.lotsOpened;
		cult.tickStarGoAuction(cult.AUCTION_LOT_TICKS * 50);
		expect(cult.auctionHouse.lotsOpened - opened0).toBe(6);
		expect(cult.auctionHouse.history.length).toBe(cult.AUCTION_HISTORY_MAX);

		// Celestial office prestige lowers the rivals' ceilings for the same roll
		cult.fengshenRoster.layer = 0;
		cult.openAuctionLot(0.3, "thunderMarrow");
		var plain = cult.auctionHouse.lot.rivals.map(function(x){ return x.ceiling; });
		cult.fengshenRoster.layer = 33;
		cult.openAuctionLot(0.3, "thunderMarrow");
		var prestige = cult.auctionHouse.lot.rivals.map(function(x){ return x.ceiling; });
		var lower = 0;
		for (var p = 0; p < plain.length; p++){
			expect(prestige[p]).toBeLessThanOrEqual(plain[p]);
			if (prestige[p] < plain[p]){ lower++; }
		}
		expect(lower).toBeGreaterThan(0);

		// Can't afford → no bid
		game.resPool.get("xianyuan").value = 1;
		expect(cult.getAuctionBidReq(1).affordable).toBe(false);
		expect(cult.placeAuctionBid(1)).toBe(false);
	});

	test("Rebirth: starGoTier seal survives (and adds an imprint at 5 lords); glow, treasures and the auction reset", function(){
		var cult = game.cultivation;
		cult.setIdentity("刘仲甫", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		beatLords(cult, 5);
		expect(cult.getStarGoBeatenCount()).toBe(5);
		expect(cult.starGoTier).toBe(5);
		cult.auctionHouse.owned.luobaoCoin = true;
		expect(cult.starGo.glow).toBeGreaterThan(0);

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.starGoTier).toBe(5);
		expect(rebirth.cultivation.starGo).toBeUndefined();
		expect(rebirth.cultivation.auctionHouse).toBeUndefined();
		var imprintWith = rebirth.cultivation.immortalImprint || 0;

		// Same life without the five lords → one imprint fewer
		var keepBeaten = JSON.parse(JSON.stringify(cult.starGo.beaten));
		for (var bk in cult.starGo.beaten){
			if (cult.starGo.beaten.hasOwnProperty(bk)){ cult.starGo.beaten[bk] = 0; }
		}
		cult.starGoTier = 0;
		game.save();
		var rebirthPlain = game._resetInternal();
		expect(rebirthPlain.cultivation.starGoTier).toBeUndefined();
		expect(imprintWith).toBe((rebirthPlain.cultivation.immortalImprint || 0) + 1);
		cult.starGo.beaten = keepBeaten;

		cult.resetState();
		expect(cult.starGoTier).toBe(0);
		expect(cult.starGo).toEqual(cult.makeDefaultStarGo());
		expect(cult.auctionHouse).toEqual(cult.makeDefaultAuctionHouse());
		game.updateCaches();
		var freshXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.starGoTier).toBe(5);
		expect(cult.starGo.glow).toBe(0);
		expect(cult.getStarGoBeatenCount()).toBe(0);
		expect(cult.auctionHouse.owned.luobaoCoin).toBe(false);
		expect(cult.auctionHouse.lot).toBe(null);
		var seal = cult.getStarGoSealBonus();
		expect(seal.tier).toBe(5);
		expect(seal.xiuweiRatio).toBeCloseTo(0.15, 6);
		expect(seal.bonus).toBe(2);
		expect(seal.feeCut).toBeCloseTo(0.20, 6);
		expect(seal.startGlow).toBe(30);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshXw);
		expect(cult.startStarGo("tanlang", 0.5)).toBe(false);	// still mortal

		// Next ascension: starting glow, cheaper stakes, +2 points in every game
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(80000);
		expect(cult.starGo.glow).toBe(30);
		expect(cult.isStarGoPassiveLit("komoku")).toBe(true);
		expect(cult.getStarGoEnterReq("tanlang").fee).toBe(16);
		expect(cult.getStarGoMatchRules("tanlang").bonus).toBe(2);
		expect(cult.auctionHouse.lot).not.toBe(null);
		// The starting glow is granted once, not on every load
		var again = {};
		cult.save(again);
		cult.load(JSON.parse(JSON.stringify(again)));
		expect(cult.starGo.glow).toBe(30);

		// The seal persists through another life (max of previous seal)
		game.save();
		var rebirth2 = game._resetInternal();
		expect(rebirth2.cultivation.starGoTier).toBe(5);
	});

	test("Old saves (XX-11 era and earlier) and corrupted XX-12 fields load cleanly; save/load roundtrip is stable", function(){
		var cult = game.cultivation;
		cult.setIdentity("王积薪", "m", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);

		// XX-11-era save: no XX-12 fields
		var oldSave = {};
		cult.save(oldSave);
		delete oldSave.cultivation.starGo;
		delete oldSave.cultivation.auctionHouse;
		delete oldSave.cultivation.starGoTier;
		expect(oldSave.cultivation.samsaraMirror).toBeDefined();
		cult.resetState();
		expect(function(){ cult.load(oldSave); }).not.toThrow();
		expect(cult.immortalAscended).toBe(true);
		expect(cult.starGo.glow).toBe(0);
		expect(cult.starGo.match).toBe(null);
		expect(cult.starGoTier).toBe(0);
		expect(cult.auctionHouse.lot).not.toBe(null);
		expect(function(){ cult.tickStarGoAuction(10); }).not.toThrow();
		var bns = cult.getImmortalCaveBonuses(30);
		for (var bk in bns){
			if (bns.hasOwnProperty(bk)){ expect(isFinite(bns[bk])).toBe(true); }
		}
		game.updateCaches();
		expect(isFinite(game.calcResourcePerTick("xianyuan"))).toBe(true);
		expect(isFinite(cult.getCombatPower())).toBe(true);

		// Ancient save (pre XX-10 / XX-11 / XX-12)
		var ancientSave = {};
		cult.save(ancientSave);
		["fengshenRoster", "thunderPool", "thunderTemperTier", "samsaraMirror", "illusionTrial", "daoHeartTier", "samsaraLegacyPath", "starGo", "auctionHouse", "starGoTier"].forEach(function(k){
			delete ancientSave.cultivation[k];
		});
		cult.resetState();
		expect(function(){ cult.load(ancientSave); }).not.toThrow();
		expect(cult.getStarGoPassiveEffect().lit).toBe(0);
		expect(cult.getStarGoPassiveEffect().offices).toBe(0);

		// Mortal save
		cult.resetState();
		var mortalSave = {};
		cult.save(mortalSave);
		delete mortalSave.cultivation.starGo;
		delete mortalSave.cultivation.auctionHouse;
		cult.resetState();
		expect(function(){ cult.load(mortalSave); }).not.toThrow();
		expect(cult.startStarGo("tanlang", 0.5)).toBe(false);
		expect(cult.auctionHouse.lot).toBe(null);
		expect(function(){ cult.tickStarGoAuction(5); }).not.toThrow();
		expect(cult.auctionHouse.lot).toBe(null);

		// Corrupted values are clamped
		cult.prepareImmortalCaveForTest(true);
		var badSave = {};
		cult.save(badSave);
		badSave.cultivation.starGo = {
			glow: -5, beaten: {tanlang: 2, jumen: "x", lucun: 3}, wins: -1, losses: NaN, draws: "y", games: 1,
			captures: 2.9, insight: 99, cooldown: 1e9, lastNote: 7,
			match: {lord: "pojun", vals: [3, 3, 3, 3, 3, 3, 3, 3, 3], own: [0, 0, 0, 0, 0, 0, 0, 0, 0]},
			lastResult: {lord: "bogus", vals: [], own: []}
		};
		badSave.cultivation.auctionHouse = {
			lot: {key: "bogus"}, owned: {luobaoCoin: true, fake: true, qiankunRing: "yes"},
			history: [{key: "x"}, {key: "luobaoCoin", winner: "player", price: 120}, {key: "riftToken", winner: "nobody", price: 9}],
			won: -2, bids: 3.7
		};
		badSave.cultivation.starGoTier = 99;
		cult.resetState();
		expect(function(){ cult.load(badSave); }).not.toThrow();
		expect(cult.starGo.glow).toBe(0);
		expect(cult.starGo.beaten).toEqual({tanlang: 2, jumen: 0, lucun: 0, wenqu: 0, lianzhen: 0, wuqu: 0, pojun: 0});
		expect(cult.starGo.wins).toBe(2);
		expect(cult.starGo.losses).toBe(0);
		expect(cult.starGo.games).toBe(2);
		expect(cult.starGo.captures).toBe(2);
		expect(cult.starGo.insight).toBe(3);
		expect(cult.starGo.cooldown).toBe(300);
		expect(cult.starGo.match).toBe(null);	// pojun is not unlocked
		expect(cult.starGo.lastResult).toBe(null);
		expect(cult.starGo.lastNote).toBe("");
		expect(cult.starGoTier).toBe(7);
		expect(cult.auctionHouse.owned.luobaoCoin).toBe(true);
		expect(cult.auctionHouse.owned.qiankunRing).toBe(false);
		expect(cult.auctionHouse.owned.fake).toBeUndefined();
		expect(cult.auctionHouse.history).toEqual([
			{key: "luobaoCoin", winner: "player", price: 120, cur: "xianyuan"},
			{key: "riftToken", winner: null, price: 0, cur: "timeCrystal"}
		]);
		expect(cult.auctionHouse.won).toBe(1);
		expect(cult.auctionHouse.bids).toBe(3);
		expect(cult.auctionHouse.lot).not.toBe(null);	// a broken lot is replaced on load

		badSave.cultivation.starGoTier = "x";
		badSave.cultivation.starGo = {beaten: {tanlang: 1}, match: {lord: "jumen", vals: [9, -1, "a", 2, 2, 2, 2, 2, 2], own: [1, 2, 7, 0, 0, 0, 0, 0, 0], lastPlayer: 42, lastLord: 1, flipped: [3, 99, "z"], captures: -4, fee: 30.5, seed: 77}};
		badSave.cultivation.auctionHouse = {lot: {key: "qiankunRing", price: 1e9, leader: "player", playerBid: 0, ticksLeft: 1e9, rivals: [{key: "aoguang", ceiling: 1e9}, {key: "ghost", ceiling: 5}]}};
		cult.resetState();
		cult.load(badSave);
		expect(cult.starGoTier).toBe(1);
		expect(cult.starGo.match).toEqual({lord: "jumen", vals: [3, 1, 1, 2, 2, 2, 2, 2, 2], own: [1, 2, 0, 0, 0, 0, 0, 0, 0], lastPlayer: -1, lastLord: 1, flipped: [3], captures: 0, lordCaptures: 0, fee: 30, seed: 77});
		expect(function(){ cult.starGoMove(4, 0); }).not.toThrow();
		var bl = cult.auctionHouse.lot;
		expect(bl.leader).toBe(null);
		expect(bl.playerBid).toBe(0);
		expect(bl.price).toBe(600);
		expect(bl.ticksLeft).toBe(cult.AUCTION_LOT_TICKS);
		expect(bl.rivals).toEqual([{key: "aoguang", ceiling: 600}, {key: "duobao", ceiling: 0}, {key: "jinchan", ceiling: 0}]);

		// Roundtrip: progress → save → JSON → fresh load → identical normalized state
		cult.resetState();
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(20000);
		beatLords(cult, 2);
		expect(cult.startStarGo("lucun", 0.25)).toBe(true);
		expect(cult.starGoMove(0, 0.5)).toBe(true);
		expect(cult.openAuctionLot(0.3, "hongHulu")).toBe(true);
		cult.placeAuctionBid(1);
		cult.tickStarGoAuction(123);
		cult.auctionHouse.owned.dinghaiPearl = true;
		var snapGo = cult.normalizeStarGo(JSON.parse(JSON.stringify(cult.starGo)));
		var snapAh = cult.normalizeAuctionHouse(JSON.parse(JSON.stringify(cult.auctionHouse)));
		var snapTier = cult.starGoTier;
		var rt = {};
		cult.save(rt);
		var rtJson = JSON.parse(JSON.stringify(rt));
		cult.resetState();
		cult.load(rtJson);
		expect(cult.starGo).toEqual(snapGo);
		expect(cult.auctionHouse).toEqual(snapAh);
		expect(cult.starGoTier).toBe(snapTier);
		expect(cult.starGo.match).not.toBe(null);
		expect(cult.starGoMove(cult.starGo.match.own.indexOf(0), 0.5)).toBe(true);
	});

	test("Panel renders in the cultivation tab: board, lords, auction console, catalogue; ?v=81 art, no raw placeholders", function(){
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

		var cult = game.cultivation;
		cult.setIdentity("观棋", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);
		grantImmortalResources(50000);
		cult.openAuctionLot(0.3, "luobaoCoin");
		var tab = game.cultivationTab;
		expect(tab instanceof classes.tab.CultivationTab).toBe(true);
		var host = document.createElement("div");
		document.body.appendChild(host);
		tab.render(host);
		tab.update();
		var el = host.querySelector(".xxStarGoArena");
		expect(el).not.toBe(null);
		expect(el.style.display).toBe("block");
		expect(el.querySelectorAll(".xxStarGoCell").length).toBe(9);
		expect(el.querySelectorAll(".xxStarGoLordCard").length).toBe(7);
		expect(el.querySelectorAll(".xxStarGoPassive").length).toBe(6);
		expect(el.querySelectorAll(".xxAuctionCatCard").length).toBe(cult.AUCTION_ITEMS.length);
		expect(el.querySelectorAll(".xxAuctionRival").length).toBe(3);
		expect(el.querySelectorAll("[data-xx-stargo=start]").length).toBe(1);
		expect(el.querySelectorAll("[data-xx-stargo=bid]").length).toBe(2);
		var imgs = el.querySelectorAll("img");
		expect(imgs.length).toBeGreaterThan(5);
		for (var i = 0; i < imgs.length; i++){
			expect(imgs[i].getAttribute("src")).toMatch(/^res\/art\/[a-z_]+\.webp\?v=\d+$/);
			expect(Number(imgs[i].getAttribute("src").split("?v=")[1])).toBeGreaterThanOrEqual(81);
			expect(imgs[i].getAttribute("src").split("?v=")[1]).toBe(String(cult.ART_VER));
		}
		expect(el.innerHTML).not.toMatch(/undefined|NaN|<svg|<canvas/);

		// Start a game: nine playable points, then one fewer each side per move
		cult.startStarGo("tanlang", 0.5);
		tab.update();
		expect(el.querySelectorAll("[data-xx-stargo=move]").length).toBe(9);
		expect(el.querySelectorAll("[data-xx-stargo=resign]").length).toBe(1);
		cult.starGoMove(4, 0);
		tab.update();
		expect(el.querySelectorAll("[data-xx-stargo=move]").length).toBe(7);
		expect(el.querySelectorAll(".xxStarGoStone.is-player:not(.is-mini)").length).toBe(1);
		expect(el.querySelectorAll(".xxStarGoStone.is-lord:not(.is-mini)").length).toBe(1);

		// Lead the auction: the hammer appears
		var g = 0;
		while (cult.auctionHouse.lot.leader !== "player" && g < 30){ cult.placeAuctionBid(4); g++; }
		tab.update();
		expect(el.querySelectorAll("[data-xx-stargo=hammer]").length).toBe(1);
		expect(el.innerHTML).not.toMatch(/undefined|NaN/);

		// Mortal with a past-life seal: locked notice only
		cult.resetState();
		cult.starGoTier = 3;
		tab._starGoSig = "";
		tab.update();
		expect(el.style.display).toBe("block");
		expect(el.className).toContain("is-locked");
		expect(el.querySelector(".xxCaveLockedNotice")).not.toBe(null);
		expect(el.querySelectorAll(".xxStarGoCell").length).toBe(0);
	});

	test("XX-12 art assets exist (src + dist), dist mirrors source, zh/en i18n parity, pure-ES5 runtime JS, rev & ART_VER 81", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(81);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(81);
		var distVer = JSON.parse(fs.readFileSync(path.join(root, "dist", "build.version.json"), "utf8"));
		expect(distVer.buildRevision).toBe(ver.buildRevision);

		var assets = [
			"res/art/star_go_board.webp",
			"res/art/star_stone_jar.webp",
			"res/art/star_lord_seal.webp",
			"res/art/auction_hall.webp",
			"res/art/auction_gong.webp",
			"res/art/treasure_lot.webp"
		];
		var cultSrc = fs.readFileSync(path.join(root, "js/cultivation.js"), "utf8");
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
			expect(fs.existsSync(path.join(root, "dist", assets[i]))).toBe(true);
			expect(cultSrc).toContain(assets[i]);
		}
		expect(cultSrc).not.toMatch(/\?v=80\b/);
		expect(cultSrc).not.toContain("ART_VER || \"80\"");
		var xx12Ui = cultSrc.slice(cultSrc.indexOf("if (this.immortalStarGoEl){"), cultSrc.indexOf("if (this.ascendBtn){"));
		expect(xx12Ui.length).toBeGreaterThan(1000);
		expect(xx12Ui).not.toContain("<svg");
		expect(xx12Ui).not.toContain("<canvas");
		expect(xx12Ui).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);

		var mirrored = ["js/cultivation.js", "game.js", "res/xianxia.css", "res/i18n/zh.json", "res/i18n/en.json", "index.html"];
		for (var mi = 0; mi < mirrored.length; mi++){
			expect(fs.readFileSync(path.join(root, "dist", mirrored[mi]), "utf8")).toBe(fs.readFileSync(path.join(root, mirrored[mi]), "utf8"));
		}
		var css = fs.readFileSync(path.join(root, "res/xianxia.css"), "utf8");
		expect(css).toContain(".xxStarGoArena");
		expect(css).toContain(".xxStarGoBoard");
		expect(css).toContain(".xxAuctionCatalog");
		expect(css).toMatch(/@media \(max-width: 560px\)\s*\{\s*\.xxStarGoPassiveList/);
		expect(css).toMatch(/@media \(max-width: 920px\)\s*\{\s*\.xxStarGoLowerGrid/);
		expect(css).toMatch(/@media \(max-width: 720px\)\s*\{\s*\.xxStarGoConsole/);

		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var prefixes = ["cultivation.stargo.", "cultivation.auction."];
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
		expect(en["cultivation.stargo.panel.badge"].indexOf("Immortal")).toBe(0);
		var cult = game.cultivation;
		var need = [];
		cult.STAR_GO_LORDS.forEach(function(l){ need.push("cultivation.stargo.lord." + l.key + ".label", "cultivation.stargo.lord." + l.key + ".style"); });
		cult.STAR_GO_PASSIVES.forEach(function(p){ need.push("cultivation.stargo.passive." + p.key + ".label", "cultivation.stargo.passive." + p.key + ".desc"); });
		cult.AUCTION_ITEMS.forEach(function(it){ need.push("cultivation.auction.item." + it.key + ".label", "cultivation.auction.item." + it.key + ".desc"); });
		cult.AUCTION_RIVALS.forEach(function(rv){ need.push("cultivation.auction.rival." + rv.key + ".label", "cultivation.auction.rival." + rv.key + ".taste"); });
		cult.SAMSARA_PATHS.forEach(function(sp){
			expect(cult.STAR_GO_PATH_PERKS[sp.key]).toBeTruthy();
			need.push("cultivation.stargo.perk." + sp.key);
		});
		["win", "draw", "loss", "resign"].forEach(function(r){ need.push("cultivation.stargo.result." + r); });
		["treasure", "material"].forEach(function(k){ need.push("cultivation.auction.kind." + k); });
		["lead", "calm", "waver", "out"].forEach(function(k){ need.push("cultivation.auction.mood." + k); });
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
