/* global test, expect, game, describe, beforeEach, classes */

const fs = require("fs");
const path = require("path");

describe("XX-5 Zhoutian Star-Dipper Array & Cross-Realm Immortal Alliance Bounties", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("Zhoutian Array Tiers 1-6 deduction, Star Core socketing, Tri-Star Harmony, and Heavenly Demon raid loop", () => {
		const cult = game.cultivation;
		cult.setIdentity("林星河", "m", "scholar");

		expect(cult.deduceStarArrayTier()).toBe(false);
		expect(cult.condenseStarCore("ziwei")).toBe(false);
		expect(cult.socketStarCore(0, "ziwei")).toBe(false);
		expect(cult.repelHeavenlyDemonRaid(true)).toBe(false);

		cult.prepareImmortalCaveForTest(true);
		const xy = game.resPool.get("xianyuan");
		const sc = game.resPool.get("starchart");
		const tc = game.resPool.get("timeCrystal");
		const rl = game.resPool.get("relic");
		const uo = game.resPool.get("unobtainium");

		expect(cult.starArray.tier).toBe(0);
		expect(cult.starArray.cores.ziwei).toBeGreaterThanOrEqual(1);

		game.updateCaches();
		game.calculateAllEffects();
		const baseXyPerTick = game.calcResourcePerTick("xianyuan");
		const baseCombatPower = cult.getCombatPower();

		xy.value = 5000;
		sc.value = 3000;
		tc.value = 2000;
		rl.value = 1000;
		uo.value = 1000;
		cult.daoyun = 6;

		for (let targetTier = 1; targetTier <= 6; targetTier++) {
			expect(cult.deduceStarArrayTier()).toBe(true);
			expect(cult.starArray.tier).toBe(targetTier);
		}
		expect(cult.deduceStarArrayTier()).toBe(false);
		expect(cult.starImprintTier).toBe(6);

		expect(cult.condenseStarCore("taiyang")).toBe(true);
		expect(cult.condenseStarCore("taiyin")).toBe(true);
		expect(cult.socketStarCore(0, "ziwei")).toBe(true);
		expect(cult.socketStarCore(1, "taiyang")).toBe(true);
		expect(cult.socketStarCore(2, "taiyin")).toBe(true);
		expect(cult.hasTriStarHarmony()).toBe(true);

		game.updateCaches();
		game.calculateAllEffects();
		expect(game.calcResourcePerTick("xianyuan")).toBeGreaterThan(baseXyPerTick * 2.0);
		expect(cult.getCombatPower()).toBeGreaterThan(baseCombatPower * 1.8);

		const bns = cult.getImmortalCaveBonuses(30);
		expect(bns.alchemyCritBonus).toBeGreaterThanOrEqual(0.30);
		expect(bns.pillPotencyBonus).toBeGreaterThanOrEqual(0.65);
		expect(bns.riftDmgMult).toBeGreaterThan(1.80);
		expect(bns.riftMitigation).toBeGreaterThanOrEqual(0.20);

		cult.heartDemon = 25;
		expect(cult.repelHeavenlyDemonRaid(true)).toBe(true);
		expect(cult.starArray.repelCount).toBe(1);
		expect(cult.heartDemon).toBeLessThan(25);
		expect(cult.buffs.zhoutianSurge).toBeGreaterThan(0);

		cult.toggleStarAutoRepel();
		const coresBefore = cult.getStarCoreTotalStock();
		cult.tickStarArray(260);
		expect(cult.starArray.repelCount).toBe(2);
		expect(cult.getStarCoreTotalStock()).toBeGreaterThan(coresBefore);
	});

	test("Cross-Realm Alliance Bounties synergy, dual encounter climax, Chapter Grand Coffer, Merit Treasury, and Reincarnation seal", () => {
		const cult = game.cultivation;
		cult.setIdentity("苏清微", "f", "trader");
		cult.prepareImmortalCaveForTest(true);
		game.resPool.get("xianyuan").value = 3000;
		cult.daoyun = 5;
		cult.riftFloor = 32;
		cult.herbGarden.arrayLevel = 4;
		cult.herbGarden.totalHarvested = 15;
		cult.alchemyExp = 120;
		cult.xianqi = { boundKey: "pagoda", stage: 5, nurtureExp: 100, totalRefines: 5, lastNote: null };
		cult.starArray.tier = 5;

		for (const def of cult.ALLIANCE_BOUNTIES) {
			expect(cult.getBountySynergy(def.key).mult).toBeGreaterThan(1.25);
		}

		const prevBoard0 = cult.immortalBounty.boardKeys[0];
		expect(cult.refreshAllianceBounties()).toBe(true);
		expect(cult.immortalBounty.boardKeys[0]).not.toBe(prevBoard0);

		const daoyunStart = cult.daoyun;
		for (let i = 0; i < 3; i++) {
			expect(cult.dispatchAllianceBounty(0)).toBe(true);
			expect(cult.boostAllianceBounty()).toBe(true);
			cult.tickImmortalBounty(90);
			expect(cult.completeAllianceBounty(i % 2 === 0 ? "core" : "dao")).toBe(true);
		}
		expect(cult.immortalBounty.completedCount).toBe(3);
		expect(cult.immortalBounty.chainChapter).toBe(2);
		expect(cult.daoyun).toBeGreaterThanOrEqual(daoyunStart + 1);

		cult.immortalBounty.merit = 300;
		expect(cult.exchangeAllianceMerit("core")).toBe(true);
		expect(cult.exchangeAllianceMerit("daoyun")).toBe(true);
		expect(cult.exchangeAllianceMerit("chest")).toBe(true);

		game.save();
		const rebirth = game._resetInternal();
		expect(rebirth.cultivation.starImprintTier).toBe(5);
		expect(rebirth.cultivation.immortalImprint).toBeGreaterThanOrEqual(4);

		cult.resetState();
		cult.load(rebirth);
		expect(cult.starImprintTier).toBe(5);
	});

	test("All 8 XX-5 .webp assets exist on disk & build.version.json is stamped at buildRevision 74", () => {
		const root = path.resolve(__dirname, "..");
		const ver = JSON.parse(fs.readFileSync(path.join(root, "build.version.json"), "utf8"));
		expect(ver.buildRevision).toBeGreaterThanOrEqual(74);
		expect(Number(game.cultivation.ART_VER)).toBeGreaterThanOrEqual(74);

		const assets = [
			"res/art/array_zhoutian_core.webp",
			"res/art/starcore_ziwei.webp",
			"res/art/starcore_taiyang.webp",
			"res/art/starcore_taiyin.webp",
			"res/art/demon_tianmo_raid.webp",
			"res/art/bounty_alliance_token.webp",
			"res/art/bounty_scroll_gold.webp",
			"res/art/bounty_chest_merit.webp"
		];
		for (const rel of assets) {
			const abs = path.join(root, rel);
			expect(fs.existsSync(abs)).toBe(true);
			expect(fs.statSync(abs).size).toBeGreaterThan(2048);
		}
	});
});
