/* global test, expect, game, describe, beforeEach, classes */

var fs = require("fs");
var path = require("path");
var acorn = require("acorn");

describe("XX-8 Primordial Zixiao Dao Lecture Altar & 3,000 Great Daos Dharma Idols", function(){
	beforeEach(function(){
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("Zixiao Dao Lecture Altar Tiers 1-6, Dao Lectures & Hongmeng Symposiums, Dao Sutras & Comprehension boosts to Cave Qi, Herb Garden & Star-Ark", function(){
		var cult = game.cultivation;
		cult.setIdentity("萧玄镜", "m", "scholar");

		// Locked before Immortal Ascension
		expect(cult.upgradeZixiaoAltar()).toBe(false);
		expect(cult.holdDaoLecture("essence")).toBe(false);
		expect(cult.holdDaoLecture("hongmeng")).toBe(false);
		expect(cult.refineDharmaIdol("cosmicGiant")).toBe(false);

		cult.prepareImmortalCaveForTest(true);
		game.resPool.get("xianyuan").value = 12000;
		game.resPool.get("relic").value = 4000;
		game.resPool.get("starchart").value = 4000;
		game.resPool.get("timeCrystal").value = 4000;
		game.resPool.get("unobtainium").value = 4000;
		cult.daoyun = 6;

		// Build Tier 1 Taixu Star-Ark as baseline to observe voyage yield & speed boosts
		expect(cult.upgradeStarship()).toBe(true);
		cult.starship.hongmengQi = 60;

		game.updateCaches();
		game.calculateAllEffects();
		var baseXyRate = game.calcResourcePerTick("xianyuan");
		var baseGardenSpeed = cult.getGardenGrowthRate();
		var baseVoyage = cult.getStarshipVoyagePreview("ziwei");

		// Guard: cannot hold lecture at Tier 0
		expect(cult.zixiaoAltar.tier).toBe(0);
		expect(cult.holdDaoLecture("essence")).toBe(false);

		// Build Tier 1 Zixiao Altar
		expect(cult.upgradeZixiaoAltar()).toBe(true);
		expect(cult.zixiaoAltar.tier).toBe(1);
		expect(cult.dharmaImprintTier).toBe(1);

		// Upgrade to Tier 6 Chaos Zixiao Palace
		while (cult.zixiaoAltar.tier < 6){
			expect(cult.upgradeZixiaoAltar()).toBe(true);
		}
		expect(cult.zixiaoAltar.tier).toBe(6);
		expect(cult.upgradeZixiaoAltar()).toBe(false);
		expect(cult.dharmaImprintTier).toBe(6);

		// 1) Active Dao Lecture (开坛讲道) consuming Immortal Essence
		expect(cult.holdDaoLecture("essence")).toBe(true);
		var sutrasAfterEssence = cult.zixiaoAltar.daoSutras;
		var compAfterEssence = cult.zixiaoAltar.comprehension;
		expect(sutrasAfterEssence).toBeGreaterThanOrEqual(6);
		expect(compAfterEssence).toBeGreaterThanOrEqual(30);
		expect(cult.daoSutras).toBe(sutrasAfterEssence);

		// 2) Active Hongmeng Symposium (鸿蒙论道) consuming Immortal Essence + Hongmeng Purple Qi (XX-7)
		var qiBeforeHm = cult.starship.hongmengQi;
		expect(cult.holdDaoLecture("hongmeng")).toBe(true);
		expect(cult.starship.hongmengQi).toBeLessThan(qiBeforeHm);
		expect(cult.zixiaoAltar.hongmengLectureCount).toBe(1);
		expect(cult.zixiaoAltar.daoSutras).toBeGreaterThan(sutrasAfterEssence + 10);
		expect(cult.zixiaoAltar.comprehension).toBeGreaterThan(compAfterEssence + 60);

		// 3) Passive Zixiao Bell chime sermon via tickZixiaoAltar
		var sutrasBeforeTick = cult.zixiaoAltar.daoSutras;
		cult.tickZixiaoAltar(40);
		expect(cult.zixiaoAltar.daoSutras).toBeGreaterThan(sutrasBeforeTick);
		expect(cult.zixiaoAltar.lectureCount).toBeGreaterThanOrEqual(3);

		// 4) Verify passive boosts to Immortal Cave Qi, Spirit Herb Garden maturation, and Taixu Star-Ark voyage yields & speed
		game.updateCaches();
		game.calculateAllEffects();
		var boostedXyRate = game.calcResourcePerTick("xianyuan");
		var boostedGardenSpeed = cult.getGardenGrowthRate();
		var boostedVoyage = cult.getStarshipVoyagePreview("ziwei");

		expect(boostedXyRate).toBeGreaterThan(baseXyRate * 1.6);
		expect(boostedGardenSpeed).toBeGreaterThan(baseGardenSpeed + 0.65);
		expect(boostedVoyage.qiGain).toBeGreaterThan(baseVoyage.qiGain);
		expect(boostedVoyage.xyGain).toBeGreaterThan(baseVoyage.xyGain);
		expect(boostedVoyage.speedPerTick).toBeGreaterThan(baseVoyage.speedPerTick);
	});

	test("4 Supreme Dharma Idols (Lv.0-6), Primary/Support slots, Four-Idol Hunyuan Resonance (4/12/24), 26F-35F Combat & Nirvana Ward, and dharmaImprintTier rebirth", function(){
		var cult = game.cultivation;
		cult.setIdentity("叶清玄", "f", "orphan");
		cult.prepareImmortalCaveForTest(true);

		game.resPool.get("xianyuan").value = 30000;
		game.resPool.get("relic").value = 5000;
		game.resPool.get("starchart").value = 5000;
		game.resPool.get("timeCrystal").value = 5000;
		game.resPool.get("unobtainium").value = 5000;
		cult.daoyun = 8;

		expect(cult.upgradeStarship()).toBe(true);
		cult.starship.hongmengQi = 500;
		expect(cult.upgradeZixiaoAltar()).toBe(true);
		cult.zixiaoAltar.daoSutras = 600;
		cult.syncDaoSutras();

		var baseVoySpeed = cult.getStarshipVoyagePreview("ziwei").speedPerTick;
		var baseBns = cult.getImmortalCaveBonuses(30);
		var cpBefore = cult.getCombatPower();

		// Awaken all 4 Supreme Dharma Idols to Lv.1 -> Total = 4 -> Resonance Tier 1
		var keys = ["cosmicGiant", "threePure", "zhuxianSwords", "samsaraLotus"];
		for (var i = 0; i < keys.length; i++){
			expect(cult.refineDharmaIdol(keys[i])).toBe(true);
		}
		expect(cult.getAwakenedDharmaCount()).toBe(4);
		expect(cult.getDharmaTotalLevel()).toBe(4);
		expect(cult.getDharmaResonanceTier()).toBe(1);
		expect(cult.hasFourDharmaResonance()).toBe(true);

		// Auto-slotted primary = cosmicGiant, support = threePure
		expect(cult.dharmaIdols.primaryKey).toBe("cosmicGiant");
		expect(cult.dharmaIdols.supportKey).toBe("threePure");
		expect(cult.getDharmaSlotWeight("cosmicGiant")).toBeCloseTo(1.35, 4);
		expect(cult.getDharmaSlotWeight("threePure")).toBeCloseTo(1.00, 4);
		expect(cult.getDharmaSlotWeight("zhuxianSwords")).toBeCloseTo(0.55, 4);

		// Swap slots cleanly without collision
		expect(cult.equipDharmaIdol("threePure", "primary")).toBe(true);
		expect(cult.dharmaIdols.primaryKey).toBe("threePure");
		expect(cult.dharmaIdols.supportKey).toBe("cosmicGiant");
		expect(cult.equipDharmaIdol("zhuxianSwords", "primary")).toBe(true);
		expect(cult.equipDharmaIdol("samsaraLotus", "support")).toBe(true);
		expect(cult.dharmaIdols.primaryKey).toBe("zhuxianSwords");
		expect(cult.dharmaIdols.supportKey).toBe("samsaraLotus");

		// Refine all 4 Idols to Lv.3 -> Total = 12 -> Resonance Tier 2
		for (var j = 0; j < keys.length; j++){
			while (cult.dharmaIdols.levels[keys[j]] < 3){
				expect(cult.refineDharmaIdol(keys[j])).toBe(true);
			}
		}
		expect(cult.getDharmaTotalLevel()).toBe(12);
		expect(cult.getDharmaResonanceTier()).toBe(2);

		// Refine all 4 Idols to Lv.6 -> Total = 24 -> Resonance Tier 3
		for (var m = 0; m < keys.length; m++){
			while (cult.dharmaIdols.levels[keys[m]] < 6){
				expect(cult.refineDharmaIdol(keys[m])).toBe(true);
			}
			expect(cult.refineDharmaIdol(keys[m])).toBe(false);
		}
		expect(cult.getDharmaTotalLevel()).toBe(24);
		expect(cult.getDharmaResonanceTier()).toBe(3);
		expect(cult.dharmaImprintTier).toBe(6);

		// Verify Three Pure voyage speed & alchemy bonuses + Cosmic Giant HP + Zhuxian Crit/Execute + Samsara Lotus Ward & Cleanse
		var apexBns = cult.getImmortalCaveBonuses(32);
		expect(cult.getCombatPower()).toBeGreaterThan(cpBefore * 4.0);
		expect(apexBns.riftHpMult).toBeGreaterThan(2.5);
		expect(apexBns.riftCritDmgBonus).toBeGreaterThan(1.0);
		expect(apexBns.dharmaSwordExecuteRatio).toBeGreaterThan(0.15);
		expect(apexBns.riftBossExecuteRatio).toBeGreaterThan(0.30);
		expect(apexBns.dharmaNirvanaRatio).toBeGreaterThan(0.55);
		expect(apexBns.pillPotencyBonus).toBeGreaterThan(baseBns.pillPotencyBonus + 0.30);
		expect(cult.getStarshipVoyagePreview("ziwei").speedPerTick).toBeGreaterThan(baseVoySpeed * 1.8);

		// Heart-Demon cleanse via Samsara Sacred Lotus
		cult.heartDemon = 55;
		cult.pillToxicity = 50;
		expect(cult.cleanseWithSamsaraLotus()).toBe(true);
		expect(cult.heartDemon).toBe(0);
		expect(cult.pillToxicity).toBe(0);

		// Live 31F Immortal Demon Realm Battle: verify Max HP aura, Giant Crush + Tri-Clone Multi-Strike, Nirvana Rebirth Ward, and Zhuxian Sword-Execute!
		cult.riftFloor = 30; // Next greater rift floor = 31F
		expect(cult.startRiftBattle("greater", true, 100)).toBe(true);
		expect(cult.battle.floor).toBe(31);
		expect(cult.battle.player.maxHp).toBeGreaterThan(100000);

		// 1) Test Nirvana Ward: force lethal enemy blow while keeping enemy alive
		cult.battle.enemy.maxHp = 1e14;
		cult.battle.enemy.hp = 1e14;
		cult.battle.enemy.def = 1e14;
		cult.battle.enemy.atk = cult.battle.player.maxHp * 20;
		cult.battle.enemy.intent = "strike";
		cult.battle.player.shield = 0;
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(cult.battle.active).toBe(true);
		expect(cult.battle.nirvanaUsed).toBe(true);
		expect(cult.battle.player.hp).toBeGreaterThan(Math.round(cult.battle.player.maxHp * 0.50));
		expect(cult.battle.logs[0]).toContain("法天象地");
		expect(cult.battle.logs[0]).toContain("一气化三清");
		expect(cult.battle.logs[0]).toContain("轮回圣莲·涅槃护道");

		// 2) Test 26F-35F Zhuxian Boss Sword-Execute
		cult.battle.enemy.hp = Math.floor(cult.battle.enemy.maxHp * 0.25);
		expect(cult.executeBattleTurn("strike")).toBe(true);
		expect(cult.battle.active).toBe(false);
		expect(cult.battle.result).toBe("win");
		expect(cult.riftFloor).toBe(31);
		expect(cult.battle.logs[0]).toContain("诛仙剑阵·斩仙");

		// Reincarnation persistence (_resetInternal) -> dharmaImprintTier discounts costs, boosts mortal aura, and seeds starting Jade Sutras
		game.save();
		var rebirth = game._resetInternal();
		expect(rebirth.cultivation.dharmaImprintTier).toBe(6);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(2);

		cult.resetState();
		var freshCostMult = cult.getDharmaImprintCostMult();
		expect(cult.zixiaoAltar.daoSutras).toBe(0);
		game.updateCaches();
		var freshMortalXw = game.calcResourcePerTick("xiuwei");
		var freshMortalCp = cult.getCombatPower();

		cult.load(rebirth);
		expect(cult.dharmaImprintTier).toBe(6);
		expect(cult.immortalAscended).toBe(false);
		expect(cult.getDharmaImprintCostMult()).toBeLessThan(freshCostMult);
		expect(cult.zixiaoAltar.daoSutras).toBe(30);
		expect(cult.daoSutras).toBe(30);
		game.updateCaches();
		expect(game.calcResourcePerTick("xiuwei")).toBeGreaterThan(freshMortalXw);
		expect(cult.getCombatPower()).toBeGreaterThan(freshMortalCp);
	});

	test("All 6 XX-8 .webp icons exist, zh/en i18n parity is 100%, acorn --ecma5 passes all 23 runtime JS files, and buildRevision is 77", function(){
		var root = path.resolve(__dirname, "..");
		var ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(77);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(77);

		var assets = [
			"res/art/altar_zixiao_lecture.webp",
			"res/art/scroll_hongmeng_sutra.webp",
			"res/art/dharma_cosmic_giant.webp",
			"res/art/dharma_three_pure.webp",
			"res/art/dharma_zhuxian_swords.webp",
			"res/art/dharma_samsara_lotus.webp"
		];
		for (var i = 0; i < assets.length; i++){
			var abs = path.join(root, assets[i]);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
		}

		// Verify 100% matching XX-8 keys in zh.json and en.json
		var zh = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/zh.json"), "utf8"));
		var en = JSON.parse(fs.readFileSync(path.join(root, "res/i18n/en.json"), "utf8"));
		var xx8Prefixes = ["cultivation.zixiao.", "cultivation.dharma."];
		var zhXx8 = Object.keys(zh).filter(function(k){
			return xx8Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		var enXx8 = Object.keys(en).filter(function(k){
			return xx8Prefixes.some(function(p){ return k.indexOf(p) === 0; });
		}).sort();
		expect(zhXx8.length).toBeGreaterThanOrEqual(55);
		expect(zhXx8).toEqual(enXx8);

		// Verify strict Pure-ES5 via acorn --ecma5 across all 23 runtime JS files
		var jsFiles = ["config.js", "core.js", "game.js", "i18n.js"].concat(
			fs.readdirSync(path.join(root, "js"))
				.filter(function(f){ return /\.js$/.test(f) && !/min/.test(f); })
				.map(function(f){ return path.join("js", f); })
		);
		expect(jsFiles.length).toBe(23);
		for (var fi = 0; fi < jsFiles.length; fi++){
			var raw = fs.readFileSync(path.join(root, jsFiles[fi]), "utf8");
			expect(function(){
				acorn.parse(raw, {ecmaVersion: 5});
			}).not.toThrow();
		}
	});
});
