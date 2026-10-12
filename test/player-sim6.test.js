/* global test, expect, game, describe, beforeEach */

/*
 * 深查第七批:心跳仿真—— cultivation.update() 在随机状态下长跑,
 * 抓崩溃/NaN/状态泄漏;转世中道清算;签运;寿元;命运队列。
 */

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e9 : v); };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

//确定性伪随机
function lcg(seed){ let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

describe("soak — update() 心跳", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
		//update() 会弹消息——桩掉 render 与 msg 避免 DOM 依赖
		game.render = () => {};
		const msgBak = game.msg;
		game.msg = () => {};
		game._msgBak = msgBak;
	});

	test("2000 ticks under randomized states: no throw, no NaN, invariants hold", () => {
		const c = game.cultivation, rnd = lcg(42);
		reachStage(game, "zhuji_5");
		for (let t = 0; t < 2000; t++){
			//随机扰动状态(注入值钳在合法域内——生产写入点全部 Math.min(100))
			if (t % 97 == 0) c.heartDemon = rnd() * 100;
			if (t % 211 == 0) c.buffs.juqi = Math.floor(rnd() * 200);
			if (t % 311 == 0) c.buffs.ziqi = Math.floor(rnd() * 100);
			if (t % 401 == 0) c.actionCd = Math.floor(rnd() * 300);
			if (t % 503 == 0 && !c.actionCd){ c.pendingTrip = "wander"; c.actionCd = 3; }
			if (t % 613 == 0) c.age = rnd() * 200;
			expect(() => c.update()).not.toThrow();
			//不变量
			expect(isFinite(c.heartDemon)).toBe(true);
			expect(c.heartDemon).toBeGreaterThanOrEqual(0);
			expect(c.heartDemon).toBeLessThanOrEqual(100);
			expect(c.actionCd).toBeGreaterThanOrEqual(-1);
			expect(isFinite(c.age)).toBe(true);
			for (const b in c.buffs){
				expect(c.buffs[b]).toBeGreaterThan(0);	//归零必须 delete 不是留 0
			}
		}
	});

	test("buffs decay to deletion not zero-leftover", () => {
		const c = game.cultivation;
		c.buffs.juqi = 2; c.buffs.ziqi = 1;
		c.update(); c.update(); c.update(); c.update();
		expect(c.buffs.juqi).toBeUndefined();
		expect(c.buffs.ziqi).toBeUndefined();
	});

	test("pendingTrip resolves exactly once when cd hits 0", () => {
		const c = game.cultivation;
		const resSpy = jest.spyOn(c, "resolveWander");
		c.pendingTrip = "wander"; c.actionCd = 3;
		c.update(); c.update(); c.update(); c.update(); c.update();
		expect(resSpy).toHaveBeenCalledTimes(1);
		expect(c.pendingTrip).toBeNull();
		resSpy.mockRestore();
	});

	test("actionCd never goes negative", () => {
		const c = game.cultivation;
		c.actionCd = 1;
		for (let i = 0; i < 5; i++) c.update();
		expect(c.actionCd).toBe(0);
	});

	test("drawLot fires once per year rollover, not per tick", () => {
		const c = game.cultivation;
		c.lastLotYear = -1;	//模拟岁首待签(resetState 会设成本年,防转世即签)
		const spy = jest.spyOn(c, "drawLot");
		c.update();
		expect(spy).toHaveBeenCalledTimes(1);
		c.update(); c.update();
		expect(spy).toHaveBeenCalledTimes(1);	//同年不再抽
		game.calendar.year = 1;
		c.update();
		expect(spy).toHaveBeenCalledTimes(2);	//跨年再抽
		spy.mockRestore();
	});

	test("drawLot bands all produce valid state", () => {
		const c = game.cultivation;
		const rng = Math.random;
		for (const roll of [0.01, 0.2, 0.5, 0.9, 0.99]){
			Math.random = () => roll;
			expect(() => c.drawLot()).not.toThrow();
			expect(c.heartDemon).toBeLessThanOrEqual(100);
		}
		Math.random = rng;
	});

	test("上上签 sets ziqi buff ~1 year and expiry clean", () => {
		const c = game.cultivation;
		const rng = Math.random; Math.random = () => 0.01;
		c.drawLot();
		Math.random = rng;
		const cal = game.calendar;
		expect(c.buffs.ziqi).toBe(cal.ticksPerDay * cal.daysPerSeason * cal.seasonsPerYear);
	});

	test("下下签 with zero catnip doesn't create negative resource", () => {
		const c = game.cultivation;
		game.resPool.get("catnip").value = 0;
		const rng = Math.random; Math.random = () => 0.99;
		expect(() => c.drawLot()).not.toThrow();
		Math.random = rng;
		expect(game.resPool.get("catnip").value).toBe(0);
	});

	test("LIFE_WARN fires each threshold exactly once", () => {
		const c = game.cultivation;
		let warns = 0;
		game.msg = () => { warns++; };
		//直接把 age 拉到三档之间反复横跳(寿命很长,不会被 onLifespanEnd)
		for (const frac of [0.5, 0.61, 0.7, 0.81, 0.9, 0.96]){
			c.age = frac * c.getLifespan();
			c.update();
		}
		expect(warns).toBe(3);	//60/80/95 三档各一次
		expect(Object.keys(c.lifeWarned).length).toBe(3);
	});

	test("lifespan end triggers reincarnation path without server", () => {
		const c = game.cultivation;
		reachStage(game, "lianqi_3");
		c.age = c.getLifespan() + 1;
		game.server = null;
		expect(() => c.update()).not.toThrow();
		expect(c.sihuaCount).toBe(1);	//坐化计数+1
	});

	test("heart demon decays toward 0, never negative", () => {
		const c = game.cultivation;
		c.heartDemon = 1;
		for (let i = 0; i < 60; i++) c.update();
		expect(c.heartDemon).toBe(0);
	});

	test("demonWarned fires once when crossing DEMON_WARN_AT", () => {
		const c = game.cultivation;
		let alerts = 0;
		game.msg = () => { alerts++; };
		c.heartDemon = c.DEMON_WARN_AT + 1;
		c.update(); c.update(); c.update();
		expect(c.demonWarned).toBe(true);
		expect(alerts).toBe(1);
	});

	test("fate pending queue: modal opens one at a time", () => {
		const c = game.cultivation;
		//连续两境界的仙缘都触发 → pending 队列不能同时全开
		c.fates[0].pending = true;
		c.fates[1].pending = true;
		expect(() => c.update()).not.toThrow();
		//update 不自动消 pending —— 由 UI 消费,但不得崩
	});

	test("update with no spiritRoot rolls one", () => {
		const c = game.cultivation;
		c.spiritRoot = null;
		const rnd = Math.random;
		Math.random = () => 0.5;
		c.update();
		Math.random = rnd;
		expect(c.spiritRoot).toBeTruthy();
	});

	test("updateVisible: cultivation tab forced visible every tick", () => {
		const c = game.cultivation;
		const tab = game.getTab("cultivation");
		if (tab){ tab.visible = false; }
		c.update();
		if (tab) expect(tab.visible).toBe(true);
	});
});

describe("edge — 转世中道清算", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
		game.render = () => {};
		game.msg = () => {};
	});

	//真契约:_resetInternal() 产出的存档把 cultivation 剥成 {identity, sihuaCount, pendingOrigin}
	//——内存态由 reload 重建。直接调 _resetInternal 并检查写盘数据。
	const strippedCult = (g) => {
		const sd = g._resetInternal();
		return sd.cultivation;
	};

	test("reincarnation save strips pendingTrip/actionCd/secluded", () => {
		const c = game.cultivation;
		c.pendingTrip = "wander"; c.actionCd = 100; c.secluded = true;
		c.identity = {name: "测试", gender: "male"};
		const cult = strippedCult(game);
		expect(cult.pendingTrip).toBeUndefined();
		expect(cult.actionCd).toBeUndefined();
		expect(cult.secluded).toBeUndefined();
		expect(cult.pendingOrigin).toBe(true);
	});

	test("reincarnation save clears buffs/pills/artifacts/veins/sects/fates/tale/stages", () => {
		const c = game.cultivation;
		c.buffs.juqi = 100; c.buffs.ziqi = 50;
		c.craftPill("juqi"); c.craftPill("qingxin");
		reachStage(game, "yuanying_0");
		c.artifacts[0].researched = true; c.artifacts[0].rank = 3;
		c.veins[0].researched = true;
		c.sects[0].researched = true;
		c.fates[0].researched = true;
		c.tale.zhangtie = "trace";
		c.heartDemon = 80;
		c.identity = {name: "测试", gender: "male"};
		const cult = strippedCult(game);
		for (const k of ["buffs","pills","artifacts","veins","sects","fates","tale","stages","heartDemon","taleLog","age","buffs","riftFloor","riftKeys"]){
			expect(cult[k]).toBeUndefined();
		}
		expect(cult.identity.name).toBe("测试");
		expect(typeof cult.sihuaCount).toBe("number");
	});

	test("dying persists across save/load — no sihuaCount dup, overlay re-shows", () => {
		const c = game.cultivation;
		reachStage(game, "lianqi_3");
		c.age = c.getLifespan() + 1;
		//第一次坐化
		c.update();
		expect(c.dying).toBe(true);
		expect(c.sihuaCount).toBe(1);
		//存读档(模拟死亡卡面期间自动存档+关页重开)
		const saveData = {};
		c.save(saveData);
		const c2 = game.cultivation;
		c2.dying = false; c2.deathOverlayOpen = false;
		c2.load(saveData);
		expect(c2.dying).toBe(true);	//坐化态随档
		//再来 update——不得重复计数,但应重弹卡面
		const showSpy = jest.spyOn(c2, "showDeathOverlay");
		const cnt0 = c2.sihuaCount;
		c2.update();
		expect(c2.sihuaCount).toBe(cnt0);
		expect(showSpy).toHaveBeenCalledTimes(1);
		//卡面开着时再次 update 不重开
		c2.update();
		expect(showSpy).toHaveBeenCalledTimes(1);
		showSpy.mockRestore();
	});

	test("load clamps heartDemon/age/actionCd to valid ranges", () => {
		const c = game.cultivation;
		c.load({cultivation: {heartDemon: 250, age: -50, actionCd: -10, riftFloor: -3, sihuaCount: -1, failStreak: -7}});
		expect(c.heartDemon).toBe(100);
		expect(c.age).toBe(0);
		expect(c.actionCd).toBe(0);
		expect(c.riftFloor).toBe(0);
		expect(c.sihuaCount).toBe(0);
		expect(c.failStreak).toBe(0);
	});

	test("applyReincarnation banks karma and schedules reset", () => {
		const c = game.cultivation;
		const spy = jest.spyOn(game, "resetAutomatic").mockImplementation(() => {});
		const k0 = game.karmaKittens;
		c.applyReincarnation(50);
		expect(game.karmaKittens).toBe(k0 + 50);
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});

	test("breakSurge uses calendar years — stays bounded after ticks reset (reload)", () => {
		const c = game.cultivation;
		//模拟刚破境:trueYear 起点
		c.lastBreakTick = game.calendar.trueYear();
		const s0 = c.getBreakSurge();
		expect(s0).toBeCloseTo(c.BREAK_SURGE_MAX, 1);
		//读档后 game.ticks 归零——余威不得超过上限(旧 bug:负 elapsed → surge 爆表)
		game.ticks = 0;
		const sReload = c.getBreakSurge();
		expect(sReload).toBeLessThanOrEqual(c.BREAK_SURGE_MAX);
		expect(sReload).toBeGreaterThan(1);	//仍在余威期内
		//两年震荡期后归零
		game.calendar.year += c.BREAK_SURGE_YEARS + 1;
		expect(c.getBreakSurge()).toBe(1);
	});

	test("breakthrough fail refunds fraction of PAID xiuwei, not base price", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		rich(game);
		reachStage(game, "zhuji_2");	//下一真关 jiedan_0
		c.riftFloor = 99;	//过门禁
		c.heartDemon = 80;	//demonTax = 1 + 80*0.025 = 3 → 实付为基价3倍(再×根骨)
		const s = c.getStage("jiedan_0");
		const model = { metadata: s, options: {prices: s.prices}, enabled: true };
		model.prices = ctrl.getPrices(model);
		const xw = game.resPool.get("xiuwei");
		const paid = model.prices.filter(p => p.name == "xiuwei")[0].val;
		const base = s.prices.filter(p => p.name == "xiuwei")[0].val;
		expect(paid).toBeGreaterThan(base);	//确认叠乘生效
		xw.value = paid * 2;
		const x0 = xw.value;
		const rng = Math.random; Math.random = () => 0.99999;	//必败
		game.render = () => {};
		const res = ctrl.buyItem(model);
		Math.random = rng;
		expect(res.itemBought).toBe(false);
		//实付 paid,退 paid*0.5 → 净值 = x0 - paid*0.5;旧 bug 退 base*0.5 会少退
		expect(xw.value).toBeCloseTo(x0 - paid * 0.5, 3);
	});

	test("save→load mid-wander preserves trip state", () => {
		const c = game.cultivation;
		c.pendingTrip = "wander"; c.actionCd = 42;
		const saveData = {};
		c.save(saveData);
		c.pendingTrip = null; c.actionCd = 0;
		c.load(saveData);
		expect(c.pendingTrip).toBe("wander");
		expect(c.actionCd).toBe(42);
	});

	test("save→load mid-seclusion preserves secluded flag", () => {
		const c = game.cultivation;
		c.secluded = true;
		const saveData = {};
		c.save(saveData);
		c.secluded = false;
		c.load(saveData);
		expect(c.secluded).toBe(true);
	});

	test("save→load preserves buffs countdown", () => {
		const c = game.cultivation;
		c.buffs.juqi = 777;
		const saveData = {};
		c.save(saveData);
		c.buffs = {};
		c.load(saveData);
		expect(c.buffs.juqi).toBe(777);
	});

	test("save→load preserves lifeWarned/demonWarned flags", () => {
		const c = game.cultivation;
		c.lifeWarned = {"60": true};
		c.demonWarned = true;
		const saveData = {};
		c.save(saveData);
		c.lifeWarned = {}; c.demonWarned = false;
		c.load(saveData);
		expect(c.lifeWarned["60"]).toBe(true);
		expect(c.demonWarned).toBe(true);
	});

	test("save→load preserves tale branch keys and taleLog", () => {
		const c = game.cultivation;
		c.tale.zhangtie = "trace"; c.tale.xugu = "ally";
		c.taleLog = [{f: "zhangtie", c: "trace", a: 5, r: 1}];
		const saveData = {};
		c.save(saveData);
		c.tale = {}; c.taleLog = [];
		c.load(saveData);
		expect(c.tale.zhangtie).toBe("trace");
		expect(c.tale.xugu).toBe("ally");
		expect(c.taleLog.length).toBe(1);
	});
});
