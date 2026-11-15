/* global test, expect, game, describe, beforeEach, classes */

var fs = require("fs");
var path = require("path");

describe("XX-6 Primordial Spirit Beast Nursery & Immortal Dao Stele Forest", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("Spirit Egg Incubation -> Stages 1-6 Bloodline Awakening, Dual Deployment & Four-Symbols Primordial Resonance", function(){
		var cult = game.cultivation;
		cult.setIdentity("陆青玄", "m", "farmer");

		expect(cult.incubateSpiritBeast("azure_dragon", false)).toBe(false);
		expect(cult.feedSpiritBeast("azure_dragon", "xianyuan")).toBe(false);
		expect(cult.awakenBeastBloodline("azure_dragon")).toBe(false);
		expect(cult.comprehendDaoStele("spacetime")).toBe(false);

		cult.prepareImmortalCaveForTest(true);
		var xy = game.resPool.get("xianyuan");
		var sc = game.resPool.get("starchart");
		var tc = game.resPool.get("timeCrystal");
		var rl = game.resPool.get("relic");
		var uo = game.resPool.get("unobtainium");

		xy.value = 6000;
		sc.value = 3000;
		tc.value = 3000;
		rl.value = 3000;
		uo.value = 2000;
		cult.daoyun = 6;
		cult.herbGarden.stock.qinglian = 5;
		cult.herbGarden.stock.zizhi = 5;
		cult.herbGarden.stock.daoguo = 5;
		cult.herbGarden.stock.xianlan = 5;
		cult.pills[0].val = 6;

		game.updateCaches();
		game.calculateAllEffects();
		var baseXyPerTick = game.calcResourcePerTick("xianyuan");
		var baseCombatPower = cult.getCombatPower();
		var baseGardenSpeed = cult.getGardenGrowthRate();
		var baseLifespan = cult.getLifespan();

		// 1. Incubate Azure Dragon via tick progression & awaken to Stage 6 via all 3 feed modes + bloodline breakthrough
		expect(cult.incubateSpiritBeast("azure_dragon", false)).toBe(true);
		expect(cult.spiritNursery.beasts.azure_dragon.incubating).toBe(true);
		cult.tickSpiritNursery(70);
		expect(cult.spiritNursery.beasts.azure_dragon.stage).toBe(1);
		expect(cult.spiritNursery.battleBeastKey).toBe("azure_dragon");

		expect(cult.feedSpiritBeast("azure_dragon", "herb")).toBe(true);
		expect(cult.feedSpiritBeast("azure_dragon", "pill")).toBe(true);
		expect(cult.feedSpiritBeast("azure_dragon", "xianyuan")).toBe(true);
		// Auto-awakened from Stage 1 -> Stage 2 at >=100 EXP
		expect(cult.spiritNursery.beasts.azure_dragon.stage).toBe(2);

		while (cult.spiritNursery.beasts.azure_dragon.stage < 6){
			expect(cult.awakenBeastBloodline("azure_dragon")).toBe(true);
		}
		expect(cult.spiritNursery.beasts.azure_dragon.stage).toBe(6);
		expect(cult.beastImprintTier).toBe(6);

		// 2. Hatch remaining 3 Primordial Beasts to trigger Four-Symbols Primordial Resonance
		expect(cult.hatchSpiritBeast("vermilion_bird")).toBe(true);
		expect(cult.hatchSpiritBeast("black_tortoise")).toBe(true);
		expect(cult.hatchSpiritBeast("white_tiger")).toBe(true);
		expect(cult.getHatchedBeastCount()).toBe(4);
		expect(cult.hasFourSymbolsResonance()).toBe(true);

		expect(cult.awakenBeastBloodline("vermilion_bird")).toBe(true);
		expect(cult.awakenBeastBloodline("black_tortoise")).toBe(true);
		expect(cult.awakenBeastBloodline("black_tortoise")).toBe(true);
		expect(cult.awakenBeastBloodline("white_tiger")).toBe(true);
		expect(cult.awakenBeastBloodline("white_tiger")).toBe(true);

		// 3. Deploy White Tiger as Main Battle Beast + Azure Dragon as Garden Companion (distinct slot swap guard)
		expect(cult.deploySpiritBeast("white_tiger", "battle")).toBe(true);
		expect(cult.deploySpiritBeast("azure_dragon", "garden")).toBe(true);
		expect(cult.spiritNursery.battleBeastKey).toBe("white_tiger");
		expect(cult.spiritNursery.gardenBeastKey).toBe("azure_dragon");
		// Swapping white_tiger into garden must move azure_dragon to battle so slots never duplicate
		expect(cult.deploySpiritBeast("white_tiger", "garden")).toBe(true);
		expect(cult.spiritNursery.battleBeastKey).not.toBe(cult.spiritNursery.gardenBeastKey);
		cult.deploySpiritBeast("white_tiger", "battle");
		cult.deploySpiritBeast("azure_dragon", "garden");

		game.updateCaches();
		game.calculateAllEffects();
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(baseXyPerTick * 2.5);
		expect(cult.getCombatPower()).toBeGreaterThan(baseCombatPower * 1.8);
		expect(cult.getGardenGrowthRate()).toBeGreaterThan(baseGardenSpeed + 0.9);
		expect(cult.getLifespan()).toBeGreaterThan(baseLifespan + 1200);

		// Verify 26F~35F High-Rift bonuses (Vermilion Bird true-fire armor break, Black Tortoise shield/mitigation, White Tiger crit/offense & Bounty speed)
		var highRiftBns = cult.getImmortalCaveBonuses(30);
		expect(highRiftBns.herbYieldBonus).toBeGreaterThan(0.50);
		expect(highRiftBns.pillPotencyBonus).toBeGreaterThan(0.30);
		expect(highRiftBns.alchemyCritBonus).toBeGreaterThan(0.10);
		expect(highRiftBns.trueFireBreak).toBe(1);
		expect(highRiftBns.riftDefIgnore).toBeGreaterThan(0.05);
		expect(highRiftBns.startShieldRatio).toBeGreaterThan(0.05);
		expect(highRiftBns.riftMitigation).toBeGreaterThan(0.08);
		expect(highRiftBns.riftCritChance).toBeGreaterThan(0.10);
		expect(highRiftBns.bountySpeedBonus).toBeGreaterThan(0.35);
		expect(highRiftBns.heartDemonDecayBonus).toBeGreaterThan(0.50);

		// Verify Cross-Realm Bounty expedition speed acceleration
		expect(cult.dispatchAllianceBounty(0)).toBe(true);
		var def0 = cult.getBountyDef(cult.immortalBounty.active.key);
		expect(cult.immortalBounty.active.maxTicks).toBeLessThan(def0.baseTicks);
	});

	test("6 Immortal Dao Steles comprehension Lv.1-5, Stele Array Resonance (6 / 15 / 30), and Reincarnation beastImprintTier persistence", function(){
		var cult = game.cultivation;
		cult.setIdentity("慕容雪", "f", "scholar");
		cult.prepareImmortalCaveForTest(true);

		game.resPool.get("xianyuan").value = 12000;
		game.resPool.get("starchart").value = 6000;
		game.resPool.get("relic").value = 6000;
		game.resPool.get("timeCrystal").value = 6000;
		game.resPool.get("unobtainium").value = 3000;
		cult.daoyun = 6;

		game.updateCaches();
		game.calculateAllEffects();
		var xyBefore = game.calcResourcePerTick("xianyuan");
		var cpBefore = cult.getCombatPower();

		// Comprehension Tier 1 milestone at total 6 (1 level on each of the 6 steles)
		var steleKeys = ["spacetime", "creation", "sword_dao", "alchemy_origin", "astral", "samsara"];
		for (var i = 0; i < steleKeys.length; i++){
			expect(cult.comprehendDaoStele(steleKeys[i])).toBe(true);
		}
		expect(cult.getTotalSteleComprehension()).toBe(6);
		expect(cult.getSteleResonanceTier()).toBe(1);

		// Reach total 15 -> Resonance Tier 2
		for (var j = 0; j < 3; j++){
			while (cult.daoSteleForest.levels[steleKeys[j]] < 4){
				expect(cult.comprehendDaoStele(steleKeys[j])).toBe(true);
			}
		}
		expect(cult.getTotalSteleComprehension()).toBe(15);
		expect(cult.getSteleResonanceTier()).toBe(2);

		// Max all 6 steles to Lv.5 -> Total 30 -> Resonance Tier 3
		for (var m = 0; m < steleKeys.length; m++){
			while (cult.daoSteleForest.levels[steleKeys[m]] < 5){
				expect(cult.comprehendDaoStele(steleKeys[m])).toBe(true);
			}
			expect(cult.comprehendDaoStele(steleKeys[m])).toBe(false);
		}
		expect(cult.getTotalSteleComprehension()).toBe(30);
		expect(cult.getSteleResonanceTier()).toBe(3);

		game.updateCaches();
		game.calculateAllEffects();
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(xyBefore * 3.0);
		expect(cult.getCombatPower()).toBeGreaterThan(cpBefore * 2.5);

		// Hatch & awaken Azure Dragon to Stage 5, then test Reincarnation persistence (_resetInternal)
		expect(cult.hatchSpiritBeast("azure_dragon")).toBe(true);
		while (cult.spiritNursery.beasts.azure_dragon.stage < 5){
			expect(cult.awakenBeastBloodline("azure_dragon")).toBe(true);
		}
		expect(cult.beastImprintTier).toBe(5);

		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.beastImprintTier).toBe(5);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);

		// Verify next-life early Spirit-Spring bonus & incubation discount before Immortal Ascension
		var freshCostMult = 1.0;
		cult.resetState();
		var baseMortalLife = cult.getLifespan();
		game.updateCaches();
		var baseMortalXw = game.calcResourcePerTick("xiuwei");

		cult.load(rebirth);
		expect(cult.beastImprintTier).toBe(5);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.getBeastImprintCostMult()).toBeLessThan(freshCostMult);
		game.updateCaches();
		expect(cult.getLifespan()).toBeGreaterThan(baseMortalLife + 100);
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(baseMortalXw);
	});

	test("All 6 XX-6 .webp icons exist, zh/en i18n parity is 100%, Pure-ES5 & buildRevision 75 verified", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(75);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(75);

		var assets = [
			"res/art/beast_azure_dragon.webp",
			"res/art/beast_vermilion_bird.webp",
			"res/art/beast_black_tortoise.webp",
			"res/art/beast_white_tiger.webp",
			"res/art/beast_spirit_nursery.webp",
			"res/art/stele_dao_monolith.webp"
		];
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
		}

		// Verify 100% matching XX-6 keys in zh.json and en.json
		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var xx6Prefixes = ["cultivation.menagerie.", "cultivation.nursery.", "cultivation.beast.", "cultivation.stele."];
		var zhXx6 = Object.keys(zh).filter(function(k){
			return xx6Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		var enXx6 = Object.keys(en).filter(function(k){
			return xx6Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		expect(zhXx6.length).toBeGreaterThanOrEqual(55);
		expect(zhXx6).toEqual(enXx6);

		// Verify strict Pure-ES5 across all runtime JS files (zero let/const/class/arrow/template literals)
		var jsFiles = ["config.js", "core.js", "game.js", "i18n.js"].concat(
			fs.readdirSync(path.join(root, "js"))
				.filter(function(f){ return /\.js$/.test(f) && !/min/.test(f); })
				.map(function(f){ return path.join("js", f); })
		);
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
