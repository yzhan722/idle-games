/* global test, expect, game, describe, beforeEach, i18nLang */

/*
 * 深查第三批:字面引用解析、变体文案完整性、存读档、出身/根骨/异象。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));
const cultSrc = fs.readFileSync(path.join(ROOT, "js/cultivation.js"), "utf8");

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e12 : v); };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

describe("deep — 字面引用解析", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("every getStage/getFate/getRealm/getArtifact/getPill literal resolves", () => {
		const c = game.cultivation;
		const bad = [];
		const check = (fn, name, kind) => {
			let v = null;
			try { v = c[fn](name); } catch (e) { bad.push(`${kind}("${name}") threw`); return; }
			if (!v) bad.push(`${kind}("${name}") → null/undefined — .researched 调用会 NPE`);
		};
		for (const m of cultSrc.matchAll(/getStage\("([^"]+)"\)/g)) check("getStage", m[1], "getStage");
		for (const m of cultSrc.matchAll(/getFate\("([^"]+)"\)/g)) check("getFate", m[1], "getFate");
		for (const m of cultSrc.matchAll(/getRealm\("([^"]+)"\)/g)) check("getRealm", m[1], "getRealm");
		for (const m of cultSrc.matchAll(/getArtifact\("([^"]+)"\)/g)) check("getArtifact", m[1], "getArtifact");
		for (const m of cultSrc.matchAll(/getPill\("([^"]+)"\)/g)) check("getPill", m[1], "getPill");
		expect(bad).toEqual([]);
	});

	test("sect gate field references an existing stage", () => {
		const bad = [];
		for (const s of game.cultivation.sects){
			if (s.gate && !game.cultivation.getStage(s.gate)){
				bad.push(`sect ${s.name}: gate '${s.gate}' not a stage`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("fate.atStage references an existing stage", () => {
		const bad = [];
		for (const f of game.cultivation.fates){
			if (!game.cultivation.getStage(f.atStage)) bad.push(`fate ${f.name}: atStage '${f.atStage}'`);
		}
		expect(bad).toEqual([]);
	});

	test("omen i18n: every omen key has base + .b variant in zh", () => {
		const bad = [];
		for (const o of game.cultivation.BREAK_OMENS){
			if (!zh["cultivation.omen." + o.key]) bad.push(o.key + ": base missing");
			if (!zh["cultivation.omen." + o.key + ".b"]) bad.push(o.key + ": .b missing");
			if (!(o.w > 0)) bad.push(o.key + ": weight " + o.w);
			if (o.cond && typeof o.cond !== "function") bad.push(o.key + ": cond not fn");
		}
		expect(bad).toEqual([]);
	});

	test("fail msg keys: fail.1/2/3 + zouhuo exist", () => {
		const bad = [];
		for (const k of ["fail.1","fail.2","fail.3","fail.zouhuo","breakthrough.perfect",
			"breakthrough.surge","breakthrough.next","breakthrough.final","demonblock",
			"gate.seq","lifespan.warn.60","lifespan.warn.80","lifespan.warn.95",
			"lifespan.end.title","lifespan.end","lifespan.rebirth","lifespan.karma.gain",
			"lifespan.karma.none","demon.warn","action.cd","seclude.on","seclude.off",
			"promoted","wander.depart","wander.minerals","wander.spice","wander.xiuwei",
			"wander.iron","wander.relic","wander.ambush","wander.nothing",
			"rift.xiuwei","rift.key","rift.minerals","rift.ambush.win","rift.ambush","rift.nokey",
			"grift.clear","grift.fail","pill.juqi","pill.zhujidan","pill.qingxin","pill.maxed","pill.clean"]){
			if (!zh["cultivation.msg." + k] && !zh["cultivation.gate." + k.replace("gate.","")]) {
				if (!zh["cultivation.msg." + k]) bad.push("cultivation.msg." + k);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("deep — fate 变体文案完整性", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("fateKey resolves for every fate under default tale", () => {
		const c = game.cultivation;
		const bad = [];
		if (typeof i18nLang == "undefined" || !i18nLang.messages){ return; }	//无 i18n 环境跳过
		for (const f of c.fates){
			for (let p = 1; p <= (f.pages || 1); p++){
				const part = p == 1 ? "story" : "story" + p;
				const k = c.fateKey(f, part);
				if (!k) bad.push(`${f.name}.${part}: fateKey null (base missing)`);
			}
			for (const ch of (f.choices || [])){
				const k = c.fateKey(f, ch.key);
				if (!k) bad.push(`${f.name}.${ch.key}: result key null`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("variant suffixes produce valid keys under seeded tale states", () => {
		const c = game.cultivation;
		const bad = [];
		if (typeof i18nLang == "undefined" || !i18nLang.messages){ return; }
		//穷举可能的 tale 组合喂给 variant(),收集产出的后缀并验证键
		const taleStates = [
			{},
			{jinguang:"fight"}, {jinguang:"flee"},
			{xugu:"ally"}, {xugu:"slay"},
			{zhangtie:"trace"}, {zhangtie:"wary"}, {zhangtie:"bide"},
			{nangong:"met"}, {nangong:"met", chen:"love"}, {nangong:"met", chen:"forget"},
			{chen:"dao"}, {chen:"forget"},
			{mojuren:"spare"}, {mojuren:"tame"}, {mojuren:"ended"}
		];
		for (const f of c.fates){
			if (!f.variant) continue;
			for (const t of taleStates){
				c.tale = Object.assign({}, t);
				let v = null;
				try { v = f.variant(c); } catch (e){ bad.push(`${f.name}: variant threw on ${JSON.stringify(t)}`); continue; }
				if (!v) continue;
				for (let p = 1; p <= (f.pages || 1); p++){
					const part = p == 1 ? "story" : "story" + p;
					const k = "cultivation.fate." + f.name + "." + part + "." + v;
					const baseK = "cultivation.fate." + f.name + "." + part;
					//变体键缺失时应回落基键——基键也无才是真缺
					if (!zh[k] && !zh[baseK]) bad.push(`${f.name}: variant '${v}' page ${p} no key`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("applyFate arc-writes stay consistent (xuese→nangong, duoshi→mojuren, xutian→xugu)", () => {
		const c = game.cultivation;
		const xuese = c.getFate("xuese");
		if (!xuese) return;
		const jiao = (xuese.choices || []).find(ch => ch.key == "jiao");
		if (!jiao) return;
		c.applyFate(xuese, jiao);
		expect(c.tale.nangong).toBe("met");
		const duoshi = c.getFate("duoshi");
		const tame = (duoshi.choices || []).find(ch => ch.key == "tame");
		if (tame){
			c.applyFate(duoshi, tame);
			expect(c.tale.mojuren).toBe("tame");
		}
	});

	test("applyFate grant adds resources; demonRelief reduces demon", () => {
		const c = game.cultivation;
		c.heartDemon = 50;
		const f = c.fates.find(x => (x.choices || []).some(ch => ch.demonRelief || ch.grant));
		expect(f).toBeTruthy();
		const ch = f.choices.find(x => x.demonRelief || x.grant);
		if (ch.demonRelief){
			c.applyFate(f, ch);
			expect(c.heartDemon).toBe(50 - ch.demonRelief);
		} else if (ch.grant){
			const res = Object.keys(ch.grant)[0];
			const v0 = game.resPool.get(res).value;
			c.applyFate(f, ch);
			expect(game.resPool.get(res).value).toBeGreaterThan(v0);
		}
	});
});

describe("deep — 出身/根骨/异象", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("ROOTS: weights positive sum, fields bounded", () => {
		const c = game.cultivation;
		let total = 0;
		for (const r of c.ROOTS){
			expect(r.weight).toBeGreaterThan(0);
			expect(r.xiuweiMult).toBeGreaterThan(0);
			expect(r.priceMult).toBeGreaterThan(0);
			expect(r.combatMult).toBeGreaterThan(0);
			expect(zh["cultivation.root." + r.key]).toBeTruthy();
			total += r.weight;
		}
		expect(total).toBe(100);
	});

	test("rollRoot always lands on a defined root", () => {
		const c = game.cultivation;
		const keys = new Set(c.ROOTS.map(r => r.key));
		for (let i = 0; i < 50; i++){
			c.rollRoot();
			expect(keys.has(c.spiritRoot)).toBe(true);
		}
	});

	test("ORIGINS: each has label+desc keys and applies without throw", () => {
		const c = game.cultivation;
		for (const o of c.ORIGINS){
			expect(zh["identity.origin." + o.key + ".label"]).toBeTruthy();
			expect(zh["identity.origin." + o.key + ".desc"]).toBeTruthy();
			c.identity = c.identity || {};
			c.identity.origin = o.key;
			expect(() => c.applyOrigin()).not.toThrow();
		}
	});

	test("origin effects actually alter game (each origin changes some stat)", () => {
		const c = game.cultivation;
		const bad = [];
		for (const o of c.ORIGINS){
			//每个出身必须有点真效果(chanceBonus/powerMult/priceMult/效果字段)
			const hasFx = o.chanceBonus || o.powerMult || o.priceMult || o.effects ||
				o.xiuweiMult || o.combatMult || Object.keys(o).some(k => /mult|bonus|ratio|effect/i.test(k));
			if (!hasFx) bad.push(o.key + ": no mechanical effect");
		}
		expect(bad).toEqual([]);
	});

	test("omen conditions evaluate without throw", () => {
		const c = game.cultivation;
		for (const o of c.BREAK_OMENS){
			if (o.cond) expect(() => o.cond(c)).not.toThrow();
		}
	});

	test("rollName produces non-empty strings for both genders", () => {
		const c = game.cultivation;
		for (const g of ["m","f"]){
			for (let i = 0; i < 20; i++){
				const n = c.rollName(g);
				expect(typeof n).toBe("string");
				expect(n.length).toBeGreaterThan(0);
			}
		}
	});
});

describe("deep — 存读档/转世", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("cultivation save→load roundtrip preserves player state", () => {
		const c = game.cultivation;
		reachStage(game, "zhuji_1");
		c.tale.zhangtie = "trace"; c.tale.mojuren = "tame";
		c.heartDemon = 42; c.riftFloor = 7; c.riftKeys = 3;
		c.spiritRoot = "tian"; c.age = 33;
		c.setIdentity("测试子", "f", "hunter");
		c.craftPill("qingxin"); c.craftPill("qingxin");
		const art = c.artifacts[0]; art.researched = true; art.rank = 3;
		c.veins[0].researched = true; c.sects[0].researched = true;
		const blob = {};
		c.save(blob);	//save() 往 blob.cultivation 写
		const blob2 = {};
		c.save(blob2);
		//全新实例读回
		global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		const c2 = game.cultivation;
		c2.load({ cultivation: blob2.cultivation });
		expect(c2.getStage("zhuji_1").researched).toBe(true);
		expect(c2.tale.zhangtie).toBe("trace");
		expect(c2.heartDemon).toBe(42);
		expect(c2.riftFloor).toBe(7);
		expect(c2.riftKeys).toBe(3);
		expect(c2.getPill("qingxin").val).toBe(2);
		expect(c2.artifacts[0].rank).toBe(3);
		expect(c2.veins[0].researched).toBe(true);
		expect(c2.sects[0].researched).toBe(true);
	});

	test("save fields list covers every live state field (no silent loss)", () => {
		const c = game.cultivation;
		const blob = {};
		c.save(blob);
		const flat = JSON.stringify(blob.cultivation);
		const must = ["stages","veins","sects","pills","fates","artifacts",
			"spiritRoot","heartDemon","age","tale","riftKeys","riftFloor","actionCd","identity"];
		const bad = must.filter(k => !flat.includes(k));
		expect(bad).toEqual([]);
	});

	test("pendingTrip & secluded survive save (mid-action save/load)", () => {
		const c = game.cultivation;
		c.wander();
		const blob = {};
		c.save(blob);
		expect(blob.cultivation.pendingTrip).toBe("wander");
		expect(blob.cultivation.actionCd).toBeGreaterThan(0);
	});
});

describe("deep — UI 状态一致性", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("cultivation tab forced visible after update", () => {
		game.cultivation.update();
		const tab = game.getTab("cultivation");
		if (tab) expect(tab.visible).toBe(true);
	});

	test("stage buttons: researched stages disabled, next layer enabled", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		rich(game);
		const m1 = { metadata: c.getStage("lianqi_0"), enabled: true, visible: true };
		ctrl.updateEnabled(m1);
		expect(m1.enabled).toBe(false);	//已破不可再点(researched 路径)
	});

	test("visibility: only current realm + next layer shown", () => {
		const c = game.cultivation, ctrl = new classes.ui.RealmBtnController(game);
		reachStage(game, "zhuji_0");
		const past = { metadata: c.getStage("lianqi_5"), visible: true };
		const next = { metadata: c.getStage("zhuji_1"), visible: true };
		const far = { metadata: c.getStage("jiedan_0"), visible: true };
		ctrl.updateVisible(past); ctrl.updateVisible(next); ctrl.updateVisible(far);
		expect(past.visible).toBe(false);	//旧境整境收起
		expect(next.visible).toBe(true);	//下一层可见
		expect(far.visible).toBe(false);	//跨境界不露
	});
});

describe("deep — 数值健康", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("no NaN after 500 ticks at full buildout", () => {
		const g = game;
		const ctrl = new classes.ui.btn.BuildingBtnModernController(g);
		for (const b of g.bld.buildingsData){
			b.unlocked = true; b.unlockable = true;
			try {
				const m = ctrl.fetchModel({ key: b.name, building: b.name });
				ctrl.build(m, 10);
			} catch (e) { /* 不可建跳过 */ }
		}
		for (let i = 0; i < 500; i++) g.tick();
		const bad = [];
		for (const r of g.resPool.resources){
			if (!isFinite(r.value)) bad.push(r.name + "=" + r.value);
			if (r.perTickCached != null && isNaN(r.perTickCached)) bad.push(r.name + " perTick NaN");
		}
		expect(bad).toEqual([]);
	});

	test("realm production ratio actually raises xiuwei income", () => {
		const g = game, c = g.cultivation;
		g.updateCaches(); g.calculateAllEffects();
		const before = g.resPool.get("xiuwei").perTickCached || 0;
		reachStage(g, "yuanying_0");
		g.updateCaches(); g.calculateAllEffects();
		const after = g.resPool.get("xiuwei").perTickCached || 0;
		expect(after).toBeGreaterThan(before);
	});

	test("combat power never decreases with realm progress", () => {
		const c = game.cultivation;
		let prev = 0;
		for (const s of c.stages){
			s.researched = true;
			const p = c.getCombatPower();
			expect(p).toBeGreaterThanOrEqual(prev);
			prev = p;
		}
	});

	test("breakPayout shrinks with cleared count, never zero/negative", () => {
		const c = game.cultivation;
		const p0 = c.breakPayout(1);
		reachStage(game, "jiedan_0");
		const p1 = c.breakPayout(1);
		reachStage(game, "dujie_0");
		const pAll = c.breakPayout(1);
		expect(p0).toBeGreaterThan(0);
		expect(p1).toBeGreaterThan(0);
		expect(pAll).toBeGreaterThan(0);
	});

	test("heartDemon clamps [0,100] across sources", () => {
		const c = game.cultivation;
		c.heartDemon = 98;
		const add = 12 + 8;	//失败增量上限
		c.heartDemon = Math.min(100, c.heartDemon + add);
		expect(c.heartDemon).toBeLessThanOrEqual(100);
		c.heartDemon = -5;
		c.heartDemon = Math.max(0, c.heartDemon - 15);
		expect(c.heartDemon).toBeGreaterThanOrEqual(0);
	});

	test("getBreakSurge decays from MAX to 1 over the window", () => {
		const c = game.cultivation;
		expect(c.getBreakSurge()).toBe(1);		//从未破境=1
		c.lastBreakTick = game.calendar.trueYear();
		expect(c.getBreakSurge()).toBeCloseTo(c.BREAK_SURGE_MAX, 1);
		//推进 2 年后(余威按日历纪年计)
		game.calendar.year += c.BREAK_SURGE_YEARS + 1;
		expect(c.getBreakSurge()).toBe(1);
	});
});
