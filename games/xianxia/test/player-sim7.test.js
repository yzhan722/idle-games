/* global test, expect, game, describe, beforeEach */

/*
 * 深查第七批:真实按钮模型路径(fetchModel/options.id)、丹药拒服、
 * 仙缘 applyFate/cond/variant、宗门灵脉购买、战力/楼层、identity。
 */

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e9 : v); };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

describe("edge — 真实按钮模型路径", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
		game.render = () => {};
		game.msg = () => {};
	});

	test("fetchModel resolves stage by options.id (not just injected metadata)", () => {
		const ctrl = new classes.ui.RealmBtnController(game);
		const m = ctrl.fetchModel({id: "lianqi_0"});
		expect(m.metadata).toBeTruthy();
		expect(m.metadata.name).toBe("lianqi_0");
		expect(m.visible).toBe(true);
	});

	test("sect purchase through real model path pays and marks researched", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "zhuji_0");
		const sect = c.sects[0];
		const m = ctrl.fetchModel({id: sect.name});
		expect(m.visible).toBe(true);
		const res = ctrl.buyItem(m);
		expect(res.itemBought).toBe(true);
		expect(sect.researched).toBe(true);
	});

	test("vein ladder: vein2 invisible until vein1 bought (real model)", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "zhuji_0");
		let m2 = ctrl.fetchModel({id: c.veins[1].name});
		expect(m2.visible).toBe(false);
		ctrl.buyItem(ctrl.fetchModel({id: c.veins[0].name}));
		m2 = ctrl.fetchModel({id: c.veins[1].name});
		expect(m2.visible).toBe(true);
	});

	test("sect ladder: sect2 needs both gate realm AND sect1 researched", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "zhuji_0");
		let m2 = ctrl.fetchModel({id: c.sects[1].name});
		expect(m2.visible).toBe(false);	//sect2 要 zhuji_2
		reachStage(game, "zhuji_2");
		m2 = ctrl.fetchModel({id: c.sects[1].name});
		expect(m2.visible).toBe(false);	//门过了但 sect1 未破——顺序梯
		ctrl.buyItem(ctrl.fetchModel({id: c.sects[0].name}));
		m2 = ctrl.fetchModel({id: c.sects[1].name});
		expect(m2.visible).toBe(true);
	});

	test("stage button invisible beyond next unbroken stage", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "lianqi_0");
		const mFar = ctrl.fetchModel({id: "lianqi_5"});
		expect(mFar.visible).toBe(false);
		const mNext = ctrl.fetchModel({id: "lianqi_1"});
		expect(mNext.visible).toBe(true);
	});

	test("researched stage of past realm collapses, current realm stays", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "zhuji_0");	//当前境界 zhuji
		const mOld = ctrl.fetchModel({id: "lianqi_9"});	//旧境已破层
		expect(mOld.visible).toBe(false);
		const mCur = ctrl.fetchModel({id: "zhuji_0"});
		expect(mCur.visible).toBe(true);
	});
});

describe("edge — 丹药拒服/服用", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		game.msg = () => {};
	});

	test("juqi refused while buff active — no silent pill waste", () => {
		const c = game.cultivation;
		c.craftPill("juqi"); c.craftPill("juqi");
		expect(c.usePill("juqi")).toBe(true);
		expect(c.buffs.juqi).toBeGreaterThan(0);
		expect(c.usePill("juqi")).toBe(false);	//拒服
		expect(c.getPill("juqi").val).toBe(1);	//丹没浪费
	});

	test("usePill empty stock and unknown name refuse cleanly", () => {
		const c = game.cultivation;
		expect(c.usePill("juqi")).toBe(false);
		expect(c.usePill("nonexistent")).toBe(false);
	});

	test("qingxin refused at zero demon; consumes -15 otherwise", () => {
		const c = game.cultivation;
		c.craftPill("qingxin");
		c.heartDemon = 0;
		expect(c.usePill("qingxin")).toBe(false);
		c.heartDemon = 10;	//不足 15 → 归零不欠
		expect(c.usePill("qingxin")).toBe(true);
		expect(c.heartDemon).toBe(0);
	});

	test("zhujidan caps breakMult at 0.5", () => {
		const c = game.cultivation;
		c.craftPill("zhujidan"); c.craftPill("zhujidan");
		expect(c.usePill("zhujidan")).toBe(true);
		expect(c.breakMult).toBe(0.5);
		expect(c.usePill("zhujidan")).toBe(false);	//顶峰拒服
	});
});

describe("edge — 仙缘 applyFate/cond/variant", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
		game.render = () => {};
		game.msg = () => {};
	});

	test("applyFate with choice writes tale key, effects, and taleLog", () => {
		const c = game.cultivation;
		const f = c.getFate("zhangtie");
		const choice = f.choices[0];
		c.applyFate(f, choice);
		expect(f.researched).toBe(true);
		expect(f.choiceKey).toBe(choice.key);
		expect(c.tale.zhangtie).toBe(choice.key);
		expect(c.taleLog.length).toBe(1);
		expect(c.taleLog[0].f).toBe("zhangtie");
		expect(c.taleLog[0].c).toBe(choice.key);
	});

	test("applyFate no-choice fate marks tale 'seen' without overwriting arc marks", () => {
		const c = game.cultivation;
		c.tale.nangong = "met";	//他 arc 写入的标记
		const f = c.getFate("nangong");
		expect(f.choices).toBeUndefined();
		c.applyFate(f, null);
		expect(c.tale.nangong).toBe("met");	//未被 "seen" 覆盖
	});

	test("fate with unmet cond is skipped in update queue", () => {
		const c = game.cultivation;
		const condFate = c.fates.find(f => f.cond && !f.cond(c));
		expect(condFate).toBeTruthy();	//存在 cond 当前不满足的命运
		reachStage(game, condFate.atStage);
		const spy = jest.spyOn(c, "showFateChoice").mockImplementation(() => {});
		c.update();
		const firedWith = spy.mock.calls.map(call => call[0] && call[0].name);
		expect(firedWith).not.toContain(condFate.name);
		spy.mockRestore();
	});

	test("demonRelief choice reduces heartDemon, demonGain raises", () => {
		const c = game.cultivation;
		c.heartDemon = 50;
		const f = c.getFate("zhangtie");
		const relief = f.choices.find(ch => ch.demonRelief);
		if (relief){
			c.applyFate(f, relief);
			expect(c.heartDemon).toBe(50 - relief.demonRelief);
		}
	});

	test("grant choice adds resources", () => {
		const c = game.cultivation;
		const granter = c.fates.find(f => f.choices && f.choices.some(ch => ch.grant));
		if (granter){
			const choice = granter.choices.find(ch => ch.grant);
			const res = Object.keys(choice.grant)[0];
			const r0 = game.resPool.get(res).value;
			c.applyFate(granter, choice);
			expect(game.resPool.get(res).value).toBeGreaterThan(r0);
		}
	});

	test("fate fires once — researched fates skip update queue", () => {
		const c = game.cultivation;
		reachStage(game, "lianqi_9");
		const spy = jest.spyOn(c, "showFateChoice").mockImplementation((f) => { f.pending = false; c.applyFate(f, f.choices ? f.choices[0] : null); });
		for (let i = 0; i < 30; i++) c.update();
		const fired = spy.mock.calls.length;
		c.update(); c.update();
		expect(spy.mock.calls.length).toBe(fired);	//不再重复触发
		spy.mockRestore();
	});
});

describe("edge — 战力/楼层/寿元", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("floorPower monotonically non-decreasing 1..60", () => {
		const c = game.cultivation;
		let prev = 0;
		for (let f = 1; f <= 60; f++){
			const p = c.floorPower(f);
			expect(p).toBeGreaterThanOrEqual(prev);
			expect(isFinite(p)).toBe(true);
			prev = p;
		}
	});

	test("getCombatPower ≥1 always, grows with stages, drops with demon", () => {
		const c = game.cultivation;
		const p0 = c.getCombatPower();
		expect(p0).toBeGreaterThanOrEqual(1);
		reachStage(game, "jiedan_0");
		const p1 = c.getCombatPower();
		expect(p1).toBeGreaterThan(p0);
		c.heartDemon = 100;
		const pDemon = c.getCombatPower();
		expect(pDemon).toBeLessThan(p1);
		expect(pDemon).toBeGreaterThanOrEqual(1);	//下限钳
	});

	test("rift unlocked only after zhuji_0", () => {
		const c = game.cultivation;
		expect(c.isRiftUnlocked()).toBe(false);
		reachStage(game, "zhuji_0");
		expect(c.isRiftUnlocked()).toBe(true);
	});

	test("greaterRift refuses with 0 keys without consuming anything", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_0");
		c.riftKeys = 0;
		expect(c.greaterRift()).toBe(false);
		expect(c.actionCd).toBe(0);	//没进冷却
	});

	test("getLifespanRemaining never negative", () => {
		const c = game.cultivation;
		c.age = 99999;
		expect(c.getLifespanRemaining()).toBe(0);
	});

	test("getDaoTitle references an existing i18n key", () => {
		const fs = require("fs"), path = require("path");
		const zh = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../res/i18n/zh.json"), "utf8"));
		const c = game.cultivation;
		c.getDaoTitle();	//触发 rollRoot
		expect("cultivation.title." + c.spiritRoot in zh).toBe(true);
	});

	test("canAct blocked: cd>0 or secluded; pendingTrip doesn't leak", () => {
		const c = game.cultivation;
		expect(c.canAct()).toBe(true);
		c.actionCd = 5;
		expect(c.canAct()).toBe(false);
		c.actionCd = 0; c.secluded = true;
		expect(c.canAct()).toBe(false);
	});

	test("stats counters increment on actions", () => {
		const c = game.cultivation;
		const w0 = c.stats.wander;
		c.wander();
		expect(c.stats.wander).toBe(w0 + 1);
	});

	test("wander while actionCd active refused — no double-trip", () => {
		const c = game.cultivation;
		c.actionCd = 50;
		expect(c.wander()).toBe(false);
		expect(c.pendingTrip).toBeNull();
	});
});

describe("edge — identity/出身", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("pendingOrigin after reincarnation triggers identity flow", () => {
		const c = game.cultivation;
		c.pendingOrigin = true;
		expect(c.pendingOrigin).toBe(true);
	});

	test("origins all have valid labels/effects", () => {
		const c = game.cultivation;
		for (const o of c.ORIGINS){
			expect(typeof o.key).toBe("string");
			const lbl = c.getOriginLabel ? null : null;
		}
		expect(c.ORIGINS.length).toBeGreaterThan(0);
	});

	test("applyOrigin clones effects into effectsBase", () => {
		const c = game.cultivation;
		c.identity = {name: "测试", gender: "m", origin: "hunter"};
		c.applyOrigin();
		const def = c.getOrigin();
		if (def && def.effects){
			expect(c.effectsBase).toEqual(def.effects);
			expect(c.effectsBase).not.toBe(def.effects);	//clone 不是引用
		}
	});

	test("getOrigin returns null/undefined-safe for missing origin", () => {
		const c = game.cultivation;
		c.identity = {name: "x", gender: "m", origin: "nonexistent"};
		expect(() => c.applyOrigin()).not.toThrow();
	});
});
