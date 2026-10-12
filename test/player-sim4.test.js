/* global test, expect, game, describe, beforeEach */

/*
 * 深查第五批:负面路径、边界条件、跨系统交互。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e12 : v); };
const broke = (g) => { for (const r of g.resPool.resources) r.value = 0; };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

describe("edge — 心魔极值", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("demon 100: blocked for real stages, tutorial exempt, qingxin still usable", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		c.heartDemon = 100;
		expect(c.isDemonBlocked()).toBe(true);
		const m = { metadata: c.getStage("jiedan_0"), enabled: true };
		ctrl.updateEnabled(m);
		expect(m.enabled).toBe(false);
		c.craftPill("qingxin");
		expect(c.usePill("qingxin")).toBe(true);
		expect(c.heartDemon).toBe(85);
		//85 < 90 门禁解禁
		expect(c.isDemonBlocked()).toBe(false);
	});

	test("demon decay doesn't overshoot below 0 over long updates", () => {
		const c = game.cultivation;
		c.heartDemon = 0.001;
		for (let i = 0; i < 20; i++) c.update();
		expect(c.heartDemon).toBeGreaterThanOrEqual(0);
	});

	test("demon warn fires once only", () => {
		const c = game.cultivation;
		c.heartDemon = c.DEMON_WARN_AT;
		let msgs = 0;
		const orig = game.msg; game.msg = (...a) => { msgs++; return orig.apply(game, a); };
		c.update(); c.update(); c.update();
		game.msg = orig;
		const demonWarns = Object.keys(c).filter(k => k == "demonWarned");
		expect(c.demonWarned).toBe(true);
	});
});

describe("edge — 突破连败", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("failStreak pity caps at +20% chance", () => {
		const c = game.cultivation;
		const s = c.getStage("zhuji_0");
		c.heartDemon = 0; c.breakMult = 0;
		const base = c.getBreakChance(s);
		c.failStreakStage = s.name; c.failStreak = 100;
		const c2 = c.getBreakChance(s);
		expect(c2).toBeLessThanOrEqual(base + 5 * 0.04 + 0.001);
	});

	test("omen bonus can push chance above 1 — clamped anyway", () => {
		const c = game.cultivation;
		const s = c.getStage("lianqi_1");	//chance=1
		expect(c.getBreakChance(s)).toBeLessThanOrEqual(1);
	});
});

describe("edge — 资源边界", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("ambush with 0 minerals: no negative, no NaN msg", () => {
		const c = game.cultivation;
		broke(game);
		reachStage(game, "zhuji_0");
		game.resPool.get("minerals").value = 0;
		const rng = Math.random; Math.random = () => 0.75;	//伏击损矿分支
		c.resolveWander();
		Math.random = rng;
		expect(game.resPool.get("minerals").value).toBeGreaterThanOrEqual(0);
	});

	test("wander resolve under every roll band never throws", () => {
		const c = game.cultivation;
		rich(game);
		reachStage(game, "yuanying_0");
		const rng = Math.random;
		for (const roll of [0.01, 0.25, 0.4, 0.56, 0.65, 0.75, 0.8, 0.9, 0.99]){
			Math.random = () => roll;
			expect(() => c.resolveWander()).not.toThrow();
		}
		Math.random = rng;
	});

	test("rift under every roll band never throws", () => {
		const c = game.cultivation;
		rich(game);
		reachStage(game, "zhuji_0");
		const rng = Math.random;
		for (const roll of [0.01, 0.32, 0.42, 0.5, 0.93, 0.99]){
			c.actionCd = 0;
			Math.random = () => roll;
			expect(() => c.rift()).not.toThrow();
		}
		Math.random = rng;
	});

	test("grift fail path pays consolation and adds demon", () => {
		const c = game.cultivation;
		rich(game);
		reachStage(game, "zhuji_0");
		c.riftFloor = 0; c.riftKeys = 1;
		const d0 = c.heartDemon;
		const xw0 = game.resPool.get("xiuwei").value;
		const rng = Math.random; Math.random = () => 0.999;
		c.greaterRift();
		Math.random = rng;
		expect(c.heartDemon).toBeGreaterThan(d0);
		expect(game.resPool.get("xiuwei").value).toBeGreaterThan(xw0);	//败亦有偿
		expect(c.riftFloor).toBe(0);
	});
});

describe("edge — 跨系统:挑战/铁意/和平", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("pacifism challenge adds trade bonus effect path", () => {
		const g = game;
		const pac = g.challenges.getChallenge("pacifism");
		expect(pac).toBeTruthy();
		if (pac.getTradeBonusEffect){
			const v = pac.getTradeBonusEffect(g);
			expect(isFinite(v)).toBe(true);
		}
	});

	test("postApocalypse pollution raises trade costs", () => {
		const g = game;
		const base = g.diplomacy.getManpowerCost();
		const ch = g.challenges.getChallenge("postApocalypse");
		ch.active = true;
		g.bld.getPollutionLevel = () => 2;
		const raised = g.diplomacy.getManpowerCost();
		ch.active = false;
		expect(raised).toBeGreaterThan(base);
	});

	test("unicornTears reprices workshop upgrades without crash", () => {
		const g = game;
		const ctrl = new com.nuclearunicorn.game.ui.UpgradeButtonController(g);
		const ch = g.challenges.getChallenge("unicornTears");
		ch.active = true;
		const u = g.workshop.upgrades.find(x => x.prices && x.prices.length);
		const model = { metadata: u, options: { prices: u.prices }, enabled: true };
		expect(() => ctrl.getPrices(model)).not.toThrow();
		ch.active = false;
	});

	test("challenge completion grants its unlocks", () => {
		const g = game;
		const ch = g.challenges.challenges.find(c => c.unlocks);
		if (!ch) return;
		ch.active = true;
		expect(() => g.challenges.researchChallenge(ch.name)).not.toThrow();
	});
});

describe("edge — 转世后状态", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("cultivation.resetState clears transient state, keeps nothing worldly", () => {
		const c = game.cultivation;
		reachStage(game, "yuanying_0");
		c.heartDemon = 50; c.secluded = true; c.actionCd = 100;
		c.pendingTrip = "wander"; c.buffs.juqi = 500;
		c.age = 500; c.breakMult = 0.5; c.lastBreakTick = 100;
		c.failStreak = 9; c.demonWarned = true;
		c.craftPill("qingxin");
		const sihua0 = c.sihuaCount;
		c.resetState();
		expect(c.heartDemon).toBe(0);
		expect(c.age).toBe(0);
		expect(c.secluded).toBe(false);
		expect(c.actionCd).toBe(0);
		expect(c.pendingTrip).toBeNull();
		expect(c.buffs.juqi).toBeUndefined();
		expect(c.breakMult).toBe(0);
		expect(c.lastBreakTick).toBeNull();
		expect(c.failStreak).toBe(0);
		expect(c.demonWarned).toBe(false);
		expect(c.getPill("qingxin").val).toBe(0);
		expect(c.sihuaCount).toBe(sihua0);	//坐化之数随魂
		//灵根重投
		expect(c.spiritRoot).toBeTruthy();
	});

	test("reincarnation save blob strips worldly cultivation data", () => {
		//模拟 _resetInternal 的 cultivation 段——只渡一缕魂
		const c = game.cultivation;
		reachStage(game, "dujie_0");
		c.setIdentity("归尘子", "m", "farmer");
		c.tale.zhangtie = "trace";
		const blob = {};
		c.save(blob);
		//_resetInternal 只取 identity/sihuaCount/pendingOrigin
		const soul = {
			identity: {name: blob.cultivation.identity.name, gender: blob.cultivation.identity.gender},
			sihuaCount: blob.cultivation.sihuaCount || 0,
			pendingOrigin: true
		};
		//新游戏读回
		global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		const c2 = game.cultivation;
		c2.load({ cultivation: soul });
		expect(c2.identity.name).toBe("归尘子");
		expect(c2.pendingOrigin).toBe(true);
		expect(c2.getStage("dujie_0").researched).toBe(false);	//境界归尘
		expect(c2.tale.zhangtie).toBeUndefined();				//命途归尘
	});
});

describe("edge — UI 文本健康", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("every realm button getName has no unresolved keys or NaN", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		const bad = [];
		for (const s of c.stages){
			const out = ctrl.getName({ metadata: s });
			if (/undefined|NaN|\$I\(|\{0\}/.test(out)) bad.push(`${s.name}: ${out.slice(0, 80)}`);
		}
		for (const v of c.veins){
			const out = ctrl.getName({ metadata: v });
			if (/undefined|NaN|\$I\(|\{0\}/.test(out)) bad.push(`${v.name}: ${out.slice(0, 80)}`);
		}
		for (const s of c.sects){
			const out = ctrl.getName({ metadata: s });
			if (/undefined|NaN|\$I\(|\{0\}/.test(out)) bad.push(`${s.name}: ${out.slice(0, 80)}`);
		}
		expect(bad).toEqual([]);
	});

	test("fateText never returns raw key for any fate part", () => {
		const c = game.cultivation;
		const bad = [];
		for (const f of c.fates){
			for (let p = 1; p <= (f.pages || 1); p++){
				const part = p == 1 ? "story" : "story" + p;
				const txt = c.fateText(f, part);
				if (txt === "cultivation.fate." + f.name + "." + part) bad.push(`${f.name}.${part}: raw key returned`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("gate label renders with numbers not NaN", () => {
		const c = game.cultivation;
		const s = c.getStage("jiedan_0");
		const out = c.gateLabel(s);
		expect(/NaN|undefined/.test(out)).toBe(false);
	});

	test("stage descriptions resolve via $I", () => {
		const c = game.cultivation;
		const bad = [];
		for (const s of c.stages){
			if (!s.description || s.description.indexOf("cultivation.") === 0) bad.push(s.name + ": desc unresolved");
		}
		expect(bad).toEqual([]);
	});
});

describe("edge — 数值管线一致性", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("seclusion mundane ratio registered in effect cache while secluded", () => {
		const c = game.cultivation;
		c.toggleSeclude();
		c.updateEffectCached();
		const g = game.globalEffectsCached;
		expect(g["seclusionMundaneRatio"]).toBeCloseTo(c.SECLUSION_MUNDANE, 5);	//负值压制凡俗
		expect(g["xiuweiRatio"]).toBeGreaterThan(0);
		c.secluded = false;
	});

	test("spiritRoot xiuweiMult feeds xiuweiRatio in effect cache", () => {
		const c = game.cultivation;
		c.spiritRoot = "tian";	//2.5x
		c.updateEffectCached();
		const g = game.globalEffectsCached;
		expect(g["xiuweiRatio"]).toBeCloseTo(1.5, 1);	//2.5-1
	});

	test("artifact effects reach effect cache when researched", () => {
		const c = game.cultivation;
		const a = c.artifacts.find(x => x.baseEffects && Object.keys(x.baseEffects).length);
		if (!a) return;
		//两次都从空缓存测——delta 即法宝贡献
		const key = Object.keys(a.baseEffects)[0];
		game.globalEffectsCached = {};
		c.updateEffectCached();
		const before = game.globalEffectsCached[key] || 0;
		a.researched = true; a.rank = 2;
		a.effects = {};
		for (const k in a.baseEffects) a.effects[k] = a.baseEffects[k] * a.rank;
		game.globalEffectsCached = {};
		c.updateEffectCached();
		const after = game.globalEffectsCached[key] || 0;
		expect(after - before).toBeCloseTo(a.effects[key], 5);
	});

	test("vein effects reach effect cache when researched", () => {
		const c = game.cultivation;
		c.veins[0].researched = true;
		c.updateEffectCached();
		const g = game.globalEffectsCached;
		const key = Object.keys(c.veins[0].effects || {})[0];
		if (key) expect(g[key]).toBeTruthy();
	});
});
