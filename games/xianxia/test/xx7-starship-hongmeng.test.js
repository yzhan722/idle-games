/* global test, expect, game, describe, beforeEach, classes */

var fs = require("fs");
var path = require("path");

describe("XX-7 Celestial Star-Realm Expedition Ark & Primordial Hongmeng Treasure Altar", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("Taixu Star-Ark construction & Tier 1-6 upgrades, 3 Primordial Star Realms voyages (passive tick + Star-Drive Surge), and Realm Blessings", function(){
		var cult = game.cultivation;
		cult.setIdentity("萧玄镜", "m", "scholar");

		// Guard: locked before Immortal Ascension
		expect(cult.upgradeStarship()).toBe(false);
		expect(cult.selectStarRealm("beiju")).toBe(false);
		expect(cult.surgeStarshipVoyage()).toBe(false);
		expect(cult.forgeHongmengTreasure("kaitianSeal")).toBe(false);

		cult.prepareImmortalCaveForTest(true);
		game.resPool.get("xianyuan").value = 8000;
		game.resPool.get("starchart").value = 4000;
		game.resPool.get("timeCrystal").value = 3000;
		game.resPool.get("unobtainium").value = 3000;
		game.resPool.get("relic").value = 3000;
		cult.daoyun = 6;

		game.updateCaches();
		game.calculateAllEffects();
		var baseXyRate = game.calcResourcePerTick("xianyuan");
		var baseGardenSpeed = cult.getGardenGrowthRate();
		var baseRiftBns = cult.getImmortalCaveBonuses(30);

		// Construct Tier 1 Taixu Star-Ark
		expect(cult.starship.vesselTier).toBe(0);
		expect(cult.surgeStarshipVoyage()).toBe(false);
		expect(cult.upgradeStarship()).toBe(true);
		expect(cult.starship.vesselTier).toBe(1);
		expect(cult.hongmengImprintTier).toBe(1);

		var tier1Preview = cult.getStarshipVoyagePreview("ziwei");
		var tier1Bns = cult.getImmortalCaveBonuses(30);
		expect(tier1Bns.startShieldRatio).toBeGreaterThan(baseRiftBns.startShieldRatio);

		// Upgrade all the way to Tier 6 (enhancing voyage speed, cargo yield, and Immortal Essence shield)
		while (cult.starship.vesselTier < 6){
			expect(cult.upgradeStarship()).toBe(true);
		}
		expect(cult.starship.vesselTier).toBe(6);
		expect(cult.upgradeStarship()).toBe(false);
		expect(cult.hongmengImprintTier).toBe(6);

		var tier6Preview = cult.getStarshipVoyagePreview("ziwei");
		var tier6Bns = cult.getImmortalCaveBonuses(30);
		expect(tier6Preview.speedPerTick).toBeGreaterThan(tier1Preview.speedPerTick * 2.5);
		expect(tier6Preview.qiGain).toBeGreaterThan(tier1Preview.qiGain * 2);
		expect(tier6Bns.startShieldRatio).toBeGreaterThan(tier1Bns.startShieldRatio + 0.25);

		// 1) Ziwei Imperial Starfield voyage via passive tick -> boosts Immortal Essence generation & harvests Hongmeng Qi + Primordial Iron
		expect(cult.selectStarRealm("ziwei")).toBe(true);
		cult.tickStarship(60);
		expect(cult.starship.voyageCount).toBeGreaterThanOrEqual(1);
		expect(cult.starship.hongmengQi).toBeGreaterThan(0);
		expect(cult.starship.primordialIron).toBeGreaterThan(0);
		expect(cult.starship.realmMastery.ziwei).toBeGreaterThanOrEqual(1);
		game.updateCaches();
		game.calculateAllEffects();
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(baseXyRate * 1.8);

		// 2) Beiju Primordial Continent voyage via active Star-Drive Surge -> boosts Spirit Herb maturity speed
		var qiBeforeBeiju = cult.starship.hongmengQi;
		var ironBeforeBeiju = cult.starship.primordialIron;
		expect(cult.selectStarRealm("beiju")).toBe(true);
		expect(cult.surgeStarshipVoyage()).toBe(true);
		expect(cult.starship.realmMastery.beiju).toBeGreaterThanOrEqual(1);
		expect(cult.starship.hongmengQi).toBeGreaterThan(qiBeforeBeiju);
		expect(cult.starship.primordialIron).toBeGreaterThan(ironBeforeBeiju);
		expect(cult.getGardenGrowthRate()).toBeGreaterThan(baseGardenSpeed + 0.25);

		// 3) Guixu Abyssal World voyage -> boosts 26F~35F Secret Realm stats
		expect(cult.selectStarRealm("guixu")).toBe(true);
		expect(cult.surgeStarshipVoyage()).toBe(true);
		expect(cult.starship.realmMastery.guixu).toBeGreaterThanOrEqual(1);
		var guixuBns = cult.getImmortalCaveBonuses(32);
		expect(guixuBns.riftDefIgnore).toBeGreaterThan(tier6Bns.riftDefIgnore);
		expect(guixuBns.riftMitigation).toBeGreaterThan(tier6Bns.riftMitigation);
		expect(guixuBns.riftDmgMult).toBeGreaterThan(tier6Bns.riftDmgMult);
	});

	test("Hongmeng Treasure Altar (Tiers 0-6), Tri-Treasure Resonance (1 / 3 / 6), 26F-35F Boss Execution, and Reincarnation hongmengImprintTier persistence", function(){
		var cult = game.cultivation;
		cult.setIdentity("云梦璃", "f", "orphan");
		cult.prepareImmortalCaveForTest(true);

		game.resPool.get("xianyuan").value = 15000;
		game.resPool.get("starchart").value = 5000;
		game.resPool.get("timeCrystal").value = 4000;
		game.resPool.get("unobtainium").value = 4000;
		game.resPool.get("relic").value = 4000;
		cult.daoyun = 6;

		// Seed voyage materials via starship construction + surges
		expect(cult.upgradeStarship()).toBe(true);
		cult.starship.hongmengQi = 400;
		cult.starship.primordialIron = 400;

		game.updateCaches();
		game.calculateAllEffects();
		var xwBefore = game.calcResourcePerTick("xiuwei");
		var cpBefore = cult.getCombatPower();
		var bns0 = cult.getImmortalCaveBonuses(30);
		expect(cult.getHongmengResonanceTier()).toBe(0);
		expect(bns0.riftBossExecuteRatio).toBe(0);

		// Forge all 3 Supreme Hongmeng Treasures to Tier 1 -> Milestone 1 (minTier >= 1)
		var tKeys = ["kaitianSeal", "zaohuaJade", "xuanhuangPagoda"];
		for (var i = 0; i < tKeys.length; i++){
			expect(cult.forgeHongmengTreasure(tKeys[i])).toBe(true);
		}
		expect(cult.getHongmengMinTier()).toBe(1);
		expect(cult.getHongmengTotalTier()).toBe(3);
		expect(cult.getHongmengResonanceTier()).toBe(1);
		expect(cult.hasTriTreasureResonance()).toBe(true);

		var bns1 = cult.getImmortalCaveBonuses(30);
		expect(bns1.riftDefIgnore).toBeGreaterThan(0.08);
		expect(bns1.riftMitigation).toBeGreaterThan(0.08);
		expect(bns1.riftBossExecuteRatio).toBeGreaterThanOrEqual(0.07);
		expect(bns1.pillPotencyBonus).toBeGreaterThan(bns0.pillPotencyBonus + 0.20);

		// Temper all 3 Treasures to Tier 3 -> Milestone 2 (minTier >= 3)
		for (var j = 0; j < tKeys.length; j++){
			while (cult.hongmengAltar.treasures[tKeys[j]] < 3){
				expect(cult.forgeHongmengTreasure(tKeys[j])).toBe(true);
			}
		}
		expect(cult.getHongmengMinTier()).toBe(3);
		expect(cult.getHongmengResonanceTier()).toBe(2);
		var bns2 = cult.getImmortalCaveBonuses(32);
		expect(bns2.riftBossExecuteRatio).toBeGreaterThan(bns1.riftBossExecuteRatio);
		expect(bns2.riftDefIgnore).toBeGreaterThan(bns1.riftDefIgnore);

		// Temper all 3 Treasures to Tier 6 -> Milestone 3 (minTier >= 6)
		for (var m = 0; m < tKeys.length; m++){
			while (cult.hongmengAltar.treasures[tKeys[m]] < 6){
				expect(cult.forgeHongmengTreasure(tKeys[m])).toBe(true);
			}
			expect(cult.forgeHongmengTreasure(tKeys[m])).toBe(false);
		}
		expect(cult.getHongmengMinTier()).toBe(6);
		expect(cult.getHongmengTotalTier()).toBe(18);
		expect(cult.getHongmengResonanceTier()).toBe(3);
		expect(cult.hongmengImprintTier).toBe(6);

		game.updateCaches();
		game.calculateAllEffects();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(xwBefore * 2.0);
		expect(cult.getCombatPower()).toBeGreaterThan(cpBefore * 3.0);

		var bns3 = cult.getImmortalCaveBonuses(34);
		expect(bns3.riftDefIgnore).toBeGreaterThan(0.45);
		expect(bns3.riftMitigation).toBeGreaterThan(0.35);
		expect(bns3.riftBossExecuteRatio).toBeGreaterThanOrEqual(0.25);
		expect(bns3.pillPotencyBonus).toBeGreaterThan(bns0.pillPotencyBonus + 1.0);

		// Verify live 26F~35F Secret Realm Boss Execution in combat
		cult.riftFloor = 29; // Next greater rift floor = 30F
		expect(cult.startRiftBattle("greater", true, 100)).toBe(true);
		expect(cult.battle.floor).toBe(30);
		// Set enemy HP to 20% of maxHp with huge defense so raw strike wouldn't one-shot without execution
		cult.battle.enemy.maxHp = 100000000;
		cult.battle.enemy.hp = 18000000;
		cult.battle.enemy.def = 99999999;
		cult.battle.enemy.shield = 0;
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(cult.battle.active).toBe(false);
		expect(cult.battle.result).toBe("win");
		expect(cult.riftFloor).toBe(30);

		// Reincarnation persistence (_resetInternal) -> hongmengImprintTier reduces costs & grants starting Hongmeng Qi
		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.hongmengImprintTier).toBe(6);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);

		cult.resetState();
		var freshMult = cult.getHongmengImprintCostMult();
		expect(cult.starship.hongmengQi).toBe(0);
		game.updateCaches();
		var freshMortalXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.hongmengImprintTier).toBe(6);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.getHongmengImprintCostMult()).toBeLessThan(freshMult);
		expect(cult.starship.hongmengQi).toBe(24);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshMortalXw);
	});

	test("All 6 XX-7 .webp icons exist, zh/en i18n parity is 100%, Pure-ES5 & buildRevision 76 verified", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(76);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(76);

		var assets = [
			"res/art/starship_taixu_vessel.webp",
			"res/art/realm_ziwei_starfield.webp",
			"res/art/realm_guixu_abyss.webp",
			"res/art/altar_hongmeng_forge.webp",
			"res/art/treasure_kaitian_seal.webp",
			"res/art/treasure_xuanhuang_pagoda.webp"
		];
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
		}

		// Verify 100% matching XX-7 keys in zh.json and en.json
		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var xx7Prefixes = ["cultivation.cosmos.", "cultivation.starship.", "cultivation.hongmeng."];
		var zhXx7 = Object.keys(zh).filter(function(k){
			return xx7Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		var enXx7 = Object.keys(en).filter(function(k){
			return xx7Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		expect(zhXx7.length).toBeGreaterThanOrEqual(50);
		expect(zhXx7).toEqual(enXx7);

		// Verify strict Pure-ES5 across all 23 runtime JS files
		var jsFiles = ["config.js", "core.js", "game.js", "i18n.js"].concat(
			fs.readdirSync(path.join(root, "js"))
				.filter(function(f){ return /\.js$/.test(f) && !/min/.test(f); })
				.map(function(f){ return path.join("js", f); })
		);
		expect(jsFiles.length).toBe(23);
		var es6Violations = [];
		for (var fi = 0; fi < jsFiles.length; fi++){
			var raw = fs.readFileSync(path.join(root, jsFiles[fi]), "utf8");
			var stripped = raw.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, " ");
			if (/\b(let|const)\b|\bclass\s+[A-Za-z_$]/.test(stripped) || /=>/.test(stripped) || stripped.indexOf("`") >= 0){
				es6Violations.push(jsFiles[fi]);
			}
		}
		expect(es6Violations).toEqual([]);
	});
});
