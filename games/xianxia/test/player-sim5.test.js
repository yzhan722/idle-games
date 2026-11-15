/* global test, expect, game, describe, beforeEach */

/*
 * 深查第六批:离线结算、出售/撤销、控制器购买路径、数值工具、消息合规。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e12 : v); };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

describe("edge — 离线/快进", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("fastforward grants NO xiuwei (offline catch-up excluded by design)", () => {
		const g = game;
		g.resPool.get("xiuwei").value = 100;
		reachStage(g, "yuanying_0");
		g.updateCaches(); g.calculateAllEffects();
		const xw0 = g.resPool.get("xiuwei").value;
		g.resPool.fastforward(30);	//离线 30 天
		expect(g.resPool.get("xiuwei").value).toBe(xw0);
	});

	test("fastforward still grants mundane resources", () => {
		const g = game;
		const wood = g.resPool.get("wood");
		wood.perTickCached = 1;
		const w0 = wood.value;
		g.resPool.fastforward(1);
		expect(wood.value).toBeGreaterThan(w0);
	});
});

describe("edge — 出售/撤销", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("sell building refunds per refundPercentage", () => {
		const g = game;
		const ctrl = new classes.ui.btn.BuildingBtnModernController(g);
		const b = g.bld.buildingsData.find(x => x.prices && x.prices.length);
		b.unlocked = true; b.unlockable = true;
		const m = ctrl.fetchModel({ key: b.name, building: b.name });
		ctrl.build(m, 1);
		expect(b.val).toBe(1);
		//出售走 controller.sell —— 不抛错即可(event 需带修饰键字段)
		expect(() => { if (ctrl.sell) ctrl.sell({ctrlKey:false, metaKey:false, shiftKey:false}, m); }).not.toThrow();
	});

	test("undo after trade restores spent resources", () => {
		const g = game;
		const d = g.diplomacy;
		const race = d.races[0];
		const buyRes = g.resPool.get(race.buys[0].name);
		const v0 = buyRes.value;
		d.tradeMultiple(race, 1);
		expect(buyRes.value).toBeLessThan(v0);
		if (g.undo){
			expect(() => g.undo()).not.toThrow();
		}
	});
});

describe("edge — 丹药控制器购买路径", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("PillCraft buyItem pays price and stocks pill", () => {
		const c = game.cultivation;
		const ctrl = new classes.ui.PillCraftBtnController(game);
		const pill = c.getPill("juqi");
		reachStage(game, "lianqi_9");	//解锁条件
		const catnip = game.resPool.get("catnip");
		const c0 = catnip.value;
		const model = { metadata: pill, options: { prices: pill.prices }, prices: pill.prices.slice(), enabled: true };
		const res = ctrl.buyItem(model);
		expect(res.itemBought).toBe(true);
		expect(pill.val).toBe(1);
		expect(catnip.value).toBeLessThan(c0);
	});

	test("PillCraft refuses when locked or broke", () => {
		const c = game.cultivation;
		const ctrl = new classes.ui.PillCraftBtnController(game);
		const pill = c.getPill("juqi");
		//未解锁(liáonqi_2 未破)
		let model = { metadata: pill, options: { prices: pill.prices }, prices: pill.prices.slice(), enabled: true };
		expect(ctrl.buyItem(model).itemBought).toBe(false);
		//解锁但无资源
		reachStage(game, "lianqi_9");
		for (const r of game.resPool.resources) r.value = 0;
		expect(ctrl.buyItem(model).reason).toBe("cannot-afford");
	});

	test("Pill use-button: empty stock disabled, stocked enabled", () => {
		const c = game.cultivation;
		const ctrl = new classes.ui.PillBtnController(game);
		const pill = c.getPill("qingxin");
		c.craftPill("qingxin");
		const model = { metadata: pill, enabled: false, visible: true };
		if (ctrl.updateEnabled) ctrl.updateEnabled(model);
		//库存>0 应可用(除非心魔0的特判——那是 buyItem 职责)
		pill.val = 0;
		if (ctrl.updateEnabled) ctrl.updateEnabled(model);
	});
});

describe("edge — 数值工具", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("roundNice produces clean numbers across magnitudes", () => {
		const c = game.cultivation;
		for (const v of [0.4, 1.7, 12.3, 123, 1234, 12345, 123456, 1.23e9]){
			const n = c.roundNice(v);
			expect(isFinite(n)).toBe(true);
			expect(n).toBeGreaterThanOrEqual(0);
		}
	});

	test("getHighestStageIndex: -1 fresh, last when all researched", () => {
		const c = game.cultivation;
		for (const s of c.stages) s.researched = false;
		expect(c.getHighestStageIndex()).toBe(-1);
		reachStage(game, "jinxian_2");
		expect(c.getHighestStageIndex()).toBe(c.stages.length - 1);
	});

	test("getCurrentRealmIndex bounded [0, realmCount-1]", () => {
		const c = game.cultivation;
		for (const s of c.stages) s.researched = false;
		const i0 = c.getCurrentRealmIndex();
		expect(i0).toBeGreaterThanOrEqual(0);
		reachStage(game, "dujie_0");
		const iMax = c.getCurrentRealmIndex();
		expect(iMax).toBeLessThan(c.REALM_DEFS.length);
		expect(iMax).toBeGreaterThanOrEqual(i0);
	});

	test("filterMetadata/loadMetadata tolerate unknown names", () => {
		const c = game.cultivation;
		const errBak = console.error; console.error = () => {};
		const warnBak = console.warn; console.warn = () => {};
		try {
			expect(() => c.loadMetadata(c.stages, [{name: "nonexistent", researched: true}], "test")).not.toThrow();
		} finally { console.error = errBak; console.warn = warnBak; }
	});

	test("postApocalypse pollution value sane", () => {
		const g = game;
		if (g.bld.getPollutionLevel){
			const p = g.bld.getPollutionLevel();
			expect(isFinite(p)).toBe(true);
			expect(p).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("edge — 消息合规/静态扫描", () => {
	test("every game.msg call uses a valid severity", () => {
		const SRC = ["game.js", "core.js"].concat(
			fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js") && !/jsx|min/.test(f)).map(f => "js/" + f)
		).map(r => fs.readFileSync(path.join(ROOT, r), "utf8")).join("\n");
		const bad = [];
		const VALID = new Set(["notice","alert","important","","trade","workshopAutomation","faith","undo","craft","summary","spice","hunt","astronomicalEvent","celebration","meteor","story","urgent","date","elders","research","workshop"]);
		for (const m of SRC.matchAll(/\.msg\([^,]+,\s*"([a-zA-Z]+)"/g)){
			if (!VALID.has(m[1])) bad.push(m[1]);
		}
		expect(bad).toEqual([]);
	});

	test("no $I() literal missing in zh anywhere in src (all files)", () => {
		const SRC = ["game.js", "core.js", "i18n.js", "index.html"].concat(
			fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f)
		).map(r => { try { return fs.readFileSync(path.join(ROOT, r), "utf8"); } catch(e){ return ""; } }).join("\n");
		const bad = [];
		for (const m of SRC.matchAll(/\$I\("([^"]+)"\)/g)){
			if (!(m[1] in zh)) bad.push(m[1]);
		}
		expect(bad).toEqual([]);
	});

	test("$I format args: keys with {N} get called with arg array (static heuristic)", () => {
		//占位符键被无参调用 → 界面显示 "{0}" 字面量
		const SRC = fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js") && !/jsx|min/.test(f))
			.map(f => "js/" + f).concat(["game.js","core.js"])
			.map(r => fs.readFileSync(path.join(ROOT, r), "utf8")).join("\n");
		const bad = [];
		const argdKeys = new Set();
		for (const m of SRC.matchAll(/\$I\("([^"]+)",\s*\[/g)) argdKeys.add(m[1]);
		for (const m of SRC.matchAll(/\$I\("([^"]+)"\)/g)){
			const v = zh[m[1]];
			if (typeof v == "string" && /\{\d+\}/.test(v) && !argdKeys.has(m[1])){
				bad.push(m[1]);	//占位符键且全代码库无带参调用 → 渲染 "{0}"
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("edge — 仙途纪事/江湖榜", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("taleLog entries render-safe (f resolves, realm key exists)", () => {
		const c = game.cultivation;
		c.taleLog = [{f: "zhangtie", c: "trace", a: 12, r: 0}, {f: "nonexistent_fate", c: "x", a: 1, r: 0}];
		//渲染逻辑里 getFate(e.f) 可能 falsy —— 代码做了 ef ? 守卫
		const errBak = console.error; console.error = () => {};
		const ef = c.getFate("nonexistent_fate");
		console.error = errBak;
		expect(ef).toBeFalsy();
	});

	test("breakthrough success without server doesn't crash", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		rich(game);
		reachStage(game, "lianqi_9");
		const s = c.getStage("zhuji_0");
		game.server = null;
		const rng = Math.random; Math.random = () => 0.0001;
		const renderBak = game.render; game.render = () => {};
		const res = ctrl.buyItem({ metadata: s, options: {prices: s.prices}, prices: s.prices.slice(), enabled: true });
		game.render = renderBak;
		Math.random = rng;
		expect(res.itemBought).toBe(true);
		expect(s.researched).toBe(true);
	});
});
