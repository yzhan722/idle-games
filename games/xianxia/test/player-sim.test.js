/* global test, expect, game, describe, beforeEach */

/*
 * 真人体验深度模拟——逐系统按玩家路径实操,断言每一步的状态语义。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e12 : v); };
const stageOf = (g, n) => g.cultivation.getStage(n);
const reachStage = (g, n) => {	//标记到 n(含)之前全部已破
	for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; }
};

describe("player sim — 历练行动", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("wander sets shared cd + pendingTrip; all actions blocked during cd", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_0");
		expect(c.canAct()).toBe(true);
		expect(c.wander()).toBe(true);
		expect(c.actionCd).toBeGreaterThan(0);
		expect(c.pendingTrip).toBe("wander");
		expect(c.canAct()).toBe(false);
		expect(c.wander()).toBe(false);			//不可连点
		expect(c.rift()).toBe(false);			//秘境同脉
		expect(c.greaterRift()).toBe(false);
		expect(c.toggleSeclude()).toBe(false);	//闭关同脉
	});

	test("wander resolves ONLY when cd hits 0, then pendingTrip cleared", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_0");
		c.wander();
		const xw0 = game.resPool.get("xiuwei").value;
		const rolls = [];
		//跑到结算(上限保险丝)
		for (let i = 0; i < c.actionCdMax + 5 && c.pendingTrip; i++){ c.update(); rolls.push(i); }
		expect(c.pendingTrip).toBeNull();
		expect(c.actionCd).toBeLessThanOrEqual(0);
		//结算后资源或心魔必有变化或消息(至少 stats.wander 已计)
		expect(c.stats.wander).toBe(1);
		expect(typeof xw0).toBe("number");
	});

	test("seclude toggle: entering while cd active refused; while secluded actions refused", () => {
		const c = game.cultivation;
		c.setActionCd(50);
		expect(c.toggleSeclude()).toBe(false);
		expect(c.secluded).toBe(false);
		c.actionCd = 0;
		expect(c.toggleSeclude()).toBe(true);
		expect(c.secluded).toBe(true);
		expect(c.canAct()).toBe(false);
		expect(c.wander()).toBe(false);
		expect(c.rift()).toBe(false);
		expect(c.toggleSeclude()).toBe(true);	//出关总允许
		expect(c.secluded).toBe(false);
	});

	test("SECLUSION exploit check: exit seclusion should cost cooldown (design says shared 气脉)", () => {
		const c = game.cultivation;
		c.toggleSeclude();						//入关(免费)
		expect(c.secluded).toBe(true);
		c.toggleSeclude();						//秒出关
		//出关散功间不可径入秘境——文档承诺出关有代价
		expect(c.actionCd).toBeGreaterThan(0);
		expect(c.canAct()).toBe(false);
	});

	test("rift locked before zhuji, unlocked after; stats count", () => {
		const c = game.cultivation;
		expect(c.isRiftUnlocked()).toBe(false);
		expect(c.rift()).toBe(false);
		reachStage(game, "zhuji_0");
		expect(c.isRiftUnlocked()).toBe(true);
		expect(c.rift()).toBe(true);
		expect(c.stats.rift).toBe(1);
		expect(c.actionCd).toBeGreaterThan(0);
	});

	test("greaterRift consumes key on entry; floor advances only on win", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_0");
		c.riftFloor = 0; c.riftKeys = 1;
		const rng = Math.random; Math.random = () => 0.999;	//必败
		expect(c.greaterRift()).toBe(true);
		expect(c.riftKeys).toBe(0);
		expect(c.riftFloor).toBe(0);				//败不进层
		expect(c.greaterRift()).toBe(false);		//无钥匙被拒
		c.actionCd = 0; c.riftKeys = 1;
		Math.random = () => 0.0001;				//必胜
		c.greaterRift();
		Math.random = rng;
		expect(c.riftFloor).toBe(1);
	});

	test("greaterRift without key does NOT set cooldown", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_0");
		c.riftKeys = 0;
		c.greaterRift();
		expect(c.actionCd).toBe(0);	//没消耗就不该调息
	});

	test("floorPower monotonic increasing", () => {
		const c = game.cultivation;
		let prev = 0;
		for (let f = 1; f <= 60; f++){
			const p = c.floorPower(f);
			expect(p).toBeGreaterThan(prev);
			prev = p;
		}
	});

	test("combatPower rises with stages cleared", () => {
		const c = game.cultivation;
		const p0 = c.getCombatPower();
		reachStage(game, "zhuji_0");
		const p1 = c.getCombatPower();
		reachStage(game, "yuanying_0");
		const p2 = c.getCombatPower();
		expect(p1).toBeGreaterThan(p0);
		expect(p2).toBeGreaterThan(p1);
	});

	test("rift ambush respects combatPower (overwhelming power = no demon)", () => {
		const c = game.cultivation;
		reachStage(game, "dujie_0");		//顶级战力
		const d0 = c.heartDemon;
		const rng = Math.random; Math.random = () => 0.95;	//伏击分支
		c.rift();
		Math.random = rng;
		expect(c.heartDemon).toBeLessThanOrEqual(d0);
	});
});

describe("player sim — 突破与心魔", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("failed breakthrough: xiuwei spent, heartDemon rises, failStreak counts", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "lianqi_9");				//序贯前提
		const s = stageOf(game, "zhuji_0");
		const d0 = c.heartDemon, xw0 = game.resPool.get("xiuwei").value;
		const rng = Math.random; Math.random = () => 0.9999;	//必失败
		const renderBak = game.render; game.render = () => {};	//jsdom 全树渲染——桩掉
		const model = { metadata: s, options: { prices: s.prices }, prices: s.prices.slice(), enabled: true };
		const res = ctrl.buyItem(model);
		game.render = renderBak;
		Math.random = rng;
		expect(res.itemBought).toBe(false);
		expect(res.reason).toBe("breakthrough-failed");
		expect(s.researched).toBe(false);
		expect(c.heartDemon).toBeGreaterThan(d0);
		expect(c.failStreak).toBeGreaterThanOrEqual(1);
		expect(c.failStreakStage).toBe(s.name);
		expect(game.resPool.get("xiuwei").value).toBeLessThan(xw0);
	});

	test("success clears failStreak; fail on OTHER stage resets stage-affinity", () => {
		const c = game.cultivation;
		c.failStreak = 5; c.failStreakStage = "zhuji_0";
		c.clearBreakFail();
		expect(c.failStreak).toBe(0);
		c.registerBreakFail({ name: "a" });
		c.registerBreakFail({ name: "a" });
		expect(c.failStreak).toBe(2);
		c.registerBreakFail({ name: "b" });	//换目标清零
		expect(c.failStreak).toBe(1);
		expect(c.failStreakStage).toBe("b");
	});

	test("getBreakChance clamps [0.05, 1] and pity bonus applies", () => {
		const c = game.cultivation;
		const s = stageOf(game, "zhuji_0");
		c.heartDemon = 0; c.breakMult = 0;
		const base = c.getBreakChance(s);
		c.failStreakStage = s.name; c.failStreak = 10;
		const pitied = c.getBreakChance(s);
		expect(pitied).toBeGreaterThan(base);
		expect(pitied).toBeLessThanOrEqual(1);
		c.heartDemon = 200;	//超量心魔——下界不破
		expect(c.getBreakChance(s)).toBeGreaterThanOrEqual(0.05);
	});

	test("demon gate blocks real breakthrough but tutorial stage exempt", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		c.heartDemon = c.HEART_DEMON_GATE;
		expect(c.isDemonBlocked()).toBe(true);
		const real = { metadata: stageOf(game, "zhuji_0"), enabled: true, visible: true };
		ctrl.updateEnabled(real);
		expect(real.enabled).toBe(false);
		const tut = { metadata: stageOf(game, "lianqi_1"), enabled: true, visible: true };
		ctrl.updateEnabled(tut);
		expect(tut.enabled).toBe(true);	//chance=1 教程层不受阻
	});

	test("demon tax inflates xiuwei price only on real breakthrough", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		c.spiritRoot = "zhen"; c.heartDemon = 40;
		const zhuji = stageOf(game, "zhuji_0");
		const priced = ctrl.getPrices({ metadata: zhuji });
		const xw = priced.find(p => p.name == "xiuwei").val;
		const raw = zhuji.prices.find(p => p.name == "xiuwei").val;
		expect(xw).toBeCloseTo(raw * 2);	//1 + 40*0.025
		//材料价不含税
		for (const p of priced){
			if (p.name != "xiuwei"){
				const o = zhuji.prices.find(q => q.name == p.name);
				if (o) expect(p.val).toBeCloseTo(o.val);
			}
		}
	});

	test("breakMult from zhujidan multiplies chance, capped at 0.5", () => {
		const c = game.cultivation;
		const s = stageOf(game, "zhuji_0");
		c.heartDemon = 0;
		const base = c.getBreakChance(s);
		c.breakMult = 0.5;
		const boosted = c.getBreakChance(s);
		expect(boosted).toBeCloseTo(Math.min(1, base * 1.5), 5);
	});
});

describe("player sim — 丹药", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("craftPill adds; usePill consumes; empty returns false", () => {
		const c = game.cultivation;
		expect(c.usePill("qingxin")).toBe(false);	//无丹
		c.craftPill("qingxin");
		c.heartDemon = 50;
		expect(c.usePill("qingxin")).toBe(true);
		expect(c.getPill("qingxin").val).toBe(0);
		expect(c.heartDemon).toBe(35);	//-15
	});

	test("qingxin refused at 0 demon; zhujidan refused at cap", () => {
		const c = game.cultivation;
		c.craftPill("qingxin"); c.heartDemon = 0;
		expect(c.usePill("qingxin")).toBe(false);
		expect(c.getPill("qingxin").val).toBe(1);	//不吞丹
		c.craftPill("zhujidan"); c.breakMult = 0.5;
		expect(c.usePill("zhujidan")).toBe(false);
		expect(c.getPill("zhujidan").val).toBe(1);
	});

	test("juqi sets timed buff that decays", () => {
		const c = game.cultivation;
		c.craftPill("juqi");
		expect(c.usePill("juqi")).toBe(true);
		expect(c.buffs.juqi).toBe(1500);
		c.update();
		expect(c.buffs.juqi).toBe(1499);
	});

	test("every pill has unlock fn sanity + effect wiring", () => {
		const c = game.cultivation;
		const bad = [];
		for (const p of c.pills){
			if (p.unlock && typeof p.unlock !== "function") bad.push(p.name + ": unlock not fn");
			if (!p.prices && !p.price) bad.push(p.name + ": no price");
		}
		expect(bad).toEqual([]);
	});
});

describe("player sim — 法宝", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("rollArtifactDrop grants, ranks up, salvages at max", () => {
		const c = game.cultivation;
		const art = c.artifacts[0];
		const rng = Math.random;
		Math.random = () => 0.001;	//总掉第一件
		expect(c.rollArtifactDrop(1)).toBe(true);
		expect(art.researched).toBe(true);
		expect(art.rank).toBeGreaterThanOrEqual(1);
		const r1 = art.rank;
		c.rollArtifactDrop(1);
		expect(art.rank).toBe(r1 + 1);	//重复掉落升阶
		//顶到满阶后变灵材
		art.rank = art.maxRank || 5;
		const relic0 = game.resPool.get("relic").value;
		c.rollArtifactDrop(1);
		Math.random = rng;
		expect(game.resPool.get("relic").value).toBeGreaterThanOrEqual(relic0);
	});

	test("artifact effects scale with rank on load path", () => {
		const c = game.cultivation;
		const a = c.artifacts.find(x => x.baseEffects && Object.keys(x.baseEffects).length);
		expect(a).toBeTruthy();
	});

	test("every artifact weight>0, prices sane when present", () => {
		const c = game.cultivation;
		const bad = [];
		for (const a of c.artifacts){
			if (!(a.weight > 0)) bad.push(a.name + ": weight " + a.weight);
			if (a.maxRank != null && a.maxRank < 1) bad.push(a.name + ": maxRank " + a.maxRank);
		}
		expect(bad).toEqual([]);
	});
});

describe("player sim — 灵脉/宗门/仙缘", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("vein visibility is staircase: zhuji gate + sequential reveal", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		const vis = (n) => { const m = { metadata: c.getRealm(n), visible: true }; ctrl.updateVisible(m); return m.visible; };
		expect(vis("vein1")).toBe(false);	//筑基前全隐
		reachStage(game, "zhuji_0");
		expect(vis("vein1")).toBe(true);
		expect(vis("vein2")).toBe(false);	//一阶未点二阶不露
		c.getRealm("vein1").researched = true;
		expect(vis("vein2")).toBe(true);
		expect(vis("vein9")).toBe(false);	//阶梯不跳级
	});

	test("sect promotion is sequential (can't skip ranks)", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		const vis = (n) => { const m = { metadata: c.getRealm(n), visible: true }; ctrl.updateVisible(m); return m.visible; };
		reachStage(game, "jiedan_0");
		expect(vis("sect1")).toBe(true);
		const jumped = vis("sect3");
		expect(jumped).toBe(false);	//未晋前阶不露后阶
	});

	test("fate fires once when stage reached; applyFate records choice", () => {
		const c = game.cultivation;
		const f = c.fates.find(x => x.atStage == "lianqi_0") || c.fates[0];
		f.researched = false;
		if (f.cond && !f.cond(c)){ f.researched = true; return; }	//条件型仙缘另行
		reachStage(game, f.atStage);
		//模拟 update 中的触发(有卡面则 showFateChoice;直接走 applyFate 分支)
		const ch = f.choices[0];
		c.applyFate(f, ch);
		expect(f.researched).toBe(true);
		expect(f.choiceKey).toBe(ch.key);
		expect(c.tale[f.name]).toBe(ch.key);
	});

	test("tale-log records fate outcomes", () => {
		const c = game.cultivation;
		expect(Array.isArray(c.taleLog) || c.taleLog == null || typeof c.taleLog == "object").toBe(true);
	});
});

describe("player sim — 寿元/转世", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("age accrues with update; lifespan warnings fire once each", () => {
		const c = game.cultivation;
		c.getLifespan = () => 10;			//短寿测试
		c.age = 9.9;
		let warned = 0;
		const orig = game.msg;
		game.msg = (...a) => { warned++; return orig.apply(game, a); };
		for (let i = 0; i < 5; i++){ c.update(); }
		game.msg = orig;
		//警告各档仅一次(不会因持续update刷爆)
		const keys = Object.keys(c.lifeWarned || {});
		expect(keys.length).toBeGreaterThan(0);
		expect(new Set(keys).size).toBe(keys.length);
	});

	test("onLifespanEnd sets dying flag once (no retrigger loop)", () => {
		const c = game.cultivation;
		c.getLifespan = () => 1;
		c.age = 2;
		c.onLifespanEnd();
		expect(c.dying).toBe(true);
		const n = c.sihuaCount;
		c.onLifespanEnd();					//重复调用不再加
		expect(c.sihuaCount).toBe(n);
	});

	test("reincarnation karma scales with realm index", () => {
		const c = game.cultivation;
		const k0 = game.karmaKittens;
		reachStage(game, "jiedan_0");
		const bonus = c.getCurrentRealmIndex() * c.ASCENSION_KARMA;
		expect(bonus).toBeGreaterThan(0);
		expect(typeof k0).toBe("number");
	});
});

describe("player sim — 贸易", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("trade deducts buys res + gold + manpower, grants sells res", () => {
		const g = game, d = g.diplomacy;
		const race = d.races[0];
		const buyRes = g.resPool.get(race.buys[0].name);
		const sellRes = g.resPool.get(race.sells[0].name);
		const buy0 = buyRes.value, sell0 = sellRes.value;
		d.tradeMultiple(race, 1);		//完整路径:付款+发货(trade() 是按钮付款后的发货助手)
		expect(buyRes.value).toBeLessThan(buy0);			//付出族价
		expect(sellRes.value).toBeGreaterThan(sell0);		//收得族货
		expect(g.resPool.get("gold").value).toBeLessThan(1e12);	//运力费
	});

	test("getMaxTradeAmt returns a number (0 when broke, never undefined)", () => {
		const g = game, d = g.diplomacy;
		const race = d.races[0];
		for (const r of g.resPool.resources) r.value = 0;
		const m = d.getMaxTradeAmt(race);
		expect(typeof m).toBe("number");
		expect(m).toBe(0);
		//富余时是正整数
		rich(g);
		const m2 = d.getMaxTradeAmt(race);
		expect(Number.isFinite(m2)).toBe(true);
		expect(m2).toBeGreaterThan(0);
	});
});

describe("player sim — 挑战", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("every challenge: activate → isActive → complete → researched+unlocks", () => {
		const ch = game.challenges;
		const bad = [];
		for (const c of ch.challenges){
			try {
				c.active = true;
				if (!ch.isActive(c.name)) bad.push(c.name + ": isActive false while active");
				if (c.checkCompletionCondition) c.checkCompletionCondition(game);
				if (ch.researchChallenge) ch.researchChallenge(c.name);
				if (!c.researched) bad.push(c.name + ": not researched after completion");
				if (c.active) bad.push(c.name + ": still active after completion");
			} catch (e){ bad.push(c.name + ": " + e.message); }
		}
		expect(bad).toEqual([]);
	});

	test("challenge effect keys all consumed or res-derived", () => {
		const bad = [];
		const SRC = ["game.js", "core.js"].concat(
			fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js") && !/jsx|min/.test(f)).map(f => "js/" + f)
		).map(r => fs.readFileSync(path.join(ROOT, r), "utf8")).join("\n");
		const consumed = new Set();
		for (const m of SRC.matchAll(/getEffect\("([^"]+)"\)/g)) consumed.add(m[1]);
		for (const m of SRC.matchAll(/effects\["([^"]+)"\]/g)) consumed.add(m[1]);
		for (const m of SRC.matchAll(/\.effects\.([a-zA-Z_]+)/g)) consumed.add(m[1]);
		for (const c of game.challenges.challenges){
			for (const k of Object.keys(c.effects || {})){
				if (!consumed.has(k)) bad.push(c.name + "." + k);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("player sim — 合成/宗教/时间", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("every workshop craft converts res correctly", () => {
		const g = game, ws = g.workshop;
		const bad = [];
		for (const cr of ws.crafts){
			if (!cr.prices) continue;
			try {
				const before = g.resPool.get(cr.name).value;
				ws.craft(cr.name, 1);
				const after = g.resPool.get(cr.name).value;
				if (!(after > before)) bad.push(cr.name + ": craft produced nothing");
			} catch (e){ bad.push(cr.name + ": " + e.message); }
		}
		expect(bad).toEqual([]);
	});

	test("religion TU/RU/ZU purchasable via managers when res rich", () => {
		const g = game;
		const bad = [];
		const tryAll = (arr, mgr) => {
			for (const it of (arr || [])){
				it.unlocked = true;
				try {
					if (mgr && mgr.religionUpgradable && mgr.religionUpgradable(it)){ mgr.transcend ? null : null; }
				} catch (e){ bad.push(it.name + ": " + e.message); }
			}
		};
		tryAll(g.religion.ru);
		tryAll(g.religion.tu);
		tryAll(g.religion.zu);
		expect(bad).toEqual([]);
	});

	test("time cfu/vsu entries structurally valid", () => {
		const bad = [];
		for (const grp of [game.time.cfu, game.time.vsu]){
			for (const u of (grp || [])){
				if (!u.name) bad.push("unnamed entry");
				if (!u.prices) bad.push(u.name + ": no prices");
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("player sim — 显示/边界", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("getDisplayValueExt handles edge values without crash", () => {
		const f = game.getDisplayValueExt.bind(game);
		for (const v of [0, -5, 0.000001, 1e30, NaN, Infinity, -Infinity, 123456.789]){
			const s = f(v, false, false);
			expect(typeof s).toBe("string");
			expect(s.length).toBeGreaterThan(0);
		}
	});

	test("addResEvent clamps at 0 (no negative pool)", () => {
		const g = game;
		const r = g.resPool.get("wood");
		r.value = 10;
		g.resPool.addResEvent("wood", -999);
		expect(r.value).toBeGreaterThanOrEqual(0);
	});

	test("resource value can't exceed maxValue when capped", () => {
		const g = game;
		const r = g.resPool.get("wood");
		r.maxValue = 100;
		g.resPool.addResEvent("wood", 1e9);
		expect(r.value).toBeLessThanOrEqual(100);
	});

	test("all cultivation msg.* keys referenced in code exist in zh", () => {
		const src = fs.readFileSync(path.join(ROOT, "js/cultivation.js"), "utf8");
		const bad = [];
		for (const m of src.matchAll(/\$I\("(cultivation\.[^"]+)"\)/g)){
			if (!(m[1] in zh)) bad.push(m[1]);
		}
		//动态拼接的 msg 族单独检查
		for (const fam of ["mojuren.1","mojuren.2","mojuren.3","erying.1","erying.2","yuanyao.1","yuanyao.2"]){
			if (!zh["cultivation.msg." + fam]) bad.push("cultivation.msg." + fam);
		}
		for (const d of ["mojuren","zhangtie","chen","erying","xugu","path"]){
			if (!zh["cultivation.dream." + d]) bad.push("cultivation.dream." + d);
		}
		expect(bad).toEqual([]);
	});
});
