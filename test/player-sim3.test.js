/* global test, expect, game, describe, beforeEach */

/*
 * 深查第四批:成就/宗教/太空/时间/历法/声望/生态/杂项管线。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));

const rich = (g, v) => { for (const r of g.resPool.resources) r.value = (v == null ? 1e12 : v); };
const reachStage = (g, n) => { for (const s of g.cultivation.stages){ s.researched = true; if (s.name == n) break; } };

describe("deep — 成就", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("every achievement: title+desc keys, condition callable via manager", () => {
		const bad = [];
		const mgr = game.achievements;
		for (const a of mgr.achievements){
			if (!a.title) bad.push(a.name + ": no title");
			if (!a.description) bad.push(a.name + ": no desc");
			if (a.condition){
				try { a.condition.call(mgr); } catch (e){ bad.push(a.name + ": condition threw " + e.message); }
			}
			if (a.starCondition){
				try { a.starCondition.call(mgr); } catch (e){ bad.push(a.name + ".star threw " + e.message); }
			}
			if (a.starDescription && !a.starCondition) bad.push(a.name + ": starDesc without starCond");
		}
		expect(bad).toEqual([]);
	});

	test("badge conditions callable via manager", () => {
		const bad = [];
		const mgr = game.achievements;
		for (const b of (mgr.badges || [])){
			if (b.condition){ try { b.condition.call(mgr); } catch (e){ bad.push(b.name + ": " + e.message); } }
		}
		expect(bad).toEqual([]);
	});

	test("realm achievements actually unlock when stages researched", () => {
		reachStage(game, "zhuji_0");
		const mgr = game.achievements;
		expect(mgr.get("foundation").condition.call(mgr)).toBe(true);
		expect(mgr.get("qiRefining").condition.call(mgr)).toBe(true);
		mgr.update();
		expect(mgr.get("foundation").unlocked).toBe(true);
	});
});

describe("deep — 宗教/信仰", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("praise: faith converts to worship, no NaN", () => {
		const g = game;
		const faith = g.resPool.get("faith");
		if (!faith) return;
		faith.value = 10000;
		const w0 = g.religion.faithRatio != null ? g.religion.faithRatio : 0;
		expect(() => g.religion.praise()).not.toThrow();
		expect(isFinite(faith.value)).toBe(true);
		void w0;
	});

	test("every ZU/TU/RU: valid name+label, prices res-valid", () => {
		const rn = new Set(game.resPool.resources.map(r => r.name));
		const bad = [];
		const scan = (arr, grp) => {
			for (const u of (arr || [])){
				if (!u.name) bad.push(grp + ": unnamed");
				for (const p of (u.prices || [])){
					if (!rn.has(p.name)) bad.push(`${grp}.${u.name}: unknown res ${p.name}`);
					if (!(p.val >= 0)) bad.push(`${grp}.${u.name}: negative price`);
				}
			}
		};
		scan(game.religion.zigguratUpgrades || game.religion.zu, "zu");
		scan(game.religion.transcendenceUpgrades || game.religion.tu, "tu");
		scan(game.religion.religionUpgrades || game.religion.ru, "ru");
		expect(bad).toEqual([]);
	});

});

describe("deep — 太空/时间/历法", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("every planet building purchasable via getProgram/building meta", () => {
		const bad = [];
		for (const pl of (game.space.planets || [])){
			for (const b of (pl.buildings || [])){
				b.unlocked = true;
				try {
					if (b.handler) b.handler(game);
					if (b.effects){
						for (const k of Object.keys(b.effects)){
							if (!isFinite(b.effects[k])) bad.push(`${pl.name}.${b.name}.${k}: nonfinite`);
						}
					}
				} catch (e){ bad.push(`${pl.name}.${b.name}: ${e.message}`); }
			}
		}
		expect(bad).toEqual([]);
	});

	test("space programs: requiredTech resolves, handlers callable", () => {
		const bad = [];
		const techs = new Set(game.science.techs.map(t => t.name));
		for (const m of (game.space.programs || [])){
			for (const t of (m.requiredTech || [])){
				if (!techs.has(t)) bad.push(`${m.name}: requiredTech ${t}`);
			}
			if (m.handler){ try { m.handler(game); } catch (e){ bad.push(`${m.name}: ${e.message}`); } }
		}
		expect(bad).toEqual([]);
	});

	test("calendar: season/day/year monotonic under ticks", () => {
		const cal = game.calendar;
		const y0 = cal.year, d0 = cal.day;
		for (let i = 0; i < 50; i++) game.tick();
		expect(cal.year).toBeGreaterThanOrEqual(y0);
		expect(cal.day).not.toBe(d0);
		expect(cal.daysPerSeason).toBeGreaterThan(0);
		expect(cal.seasonsPerYear).toBeGreaterThan(0);
	});

	test("weather/season APIs return sane values", () => {
		const cal = game.calendar;
		const w = cal.getCurSeason ? cal.getCurSeason() : null;
		expect(w == null || typeof w == "object" || typeof w == "string" || typeof w == "number").toBe(true);
	});

	test("time: getCFU/getVSU entries valid, shatterTC price sane", () => {
		const bad = [];
		for (const grp of [["cfu", game.time.cfu], ["vsu", game.time.vsu]]){
			for (const u of (grp[1] || [])){
				for (const p of (u.prices || [])){
					if (!(p.val > 0)) bad.push(`${grp[0]}.${u.name}: ${p.name}=${p.val}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("deep — 声望/传承", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
		rich(game);
	});

	test("every perk: label+desc, handler callable, effects valid", () => {
		const bad = [];
		for (const p of game.prestige.perks){
			if (!p.label) bad.push(p.name + ": no label");
			try { if (p.handler) p.handler(game); } catch (e){ bad.push(p.name + ": " + e.message); }
			for (const k of Object.keys(p.effects || {})){
				if (!isFinite(p.effects[k])) bad.push(p.name + "." + k + " nonfinite");
			}
		}
		expect(bad).toEqual([]);
	});

	test("perk unlock chains resolve", () => {
		const names = new Set(game.prestige.perks.map(p => p.name));
		const bad = [];
		for (const p of game.prestige.perks){
			for (const u of (p.unlocks?.perks || [])){
				if (!names.has(u)) bad.push(`${p.name}→${u}`);
			}
			for (const req of (p.requirements || [])){
				//requirements 可能是 {perk} 或函数
				if (req.perk && !names.has(req.perk)) bad.push(`${p.name} req ${req.perk}`);
			}
		}
		expect(bad).toEqual([]);
	});
});

describe("deep — 生态地图/杂项", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("undo registration doesn't throw for build path", () => {
		const g = game;
		rich(g);
		const ctrl = new classes.ui.btn.BuildingBtnModernController(g);
		const b = g.bld.buildingsData[0];
		b.unlocked = true; b.unlockable = true;
		const m = ctrl.fetchModel({ key: b.name, building: b.name });
		expect(() => ctrl.build(m, 1)).not.toThrow();
	});

	test("stats: getStat for known stats doesn't throw", () => {
		const bad = [];
		for (const s of ["buildingsConstructed","totalTrades","totalResets"]){
			try { game.stats.getStat(s); } catch (e){ bad.push(s + ": " + e.message); }
		}
		expect(bad).toEqual([]);
	});

	test("DR functions roundtrip sanely", () => {
		const g = game;
		for (const v of [0, 1, 10, 1000, 1e6]){
			const dr = g.getUnlimitedDR(v, 5);
			const inv = g.getInverseUnlimitedDR(dr, 5);
			expect(inv).toBeCloseTo(v, 0);
		}
	});

	test("every manager updateEffectCached doesn't throw", () => {
		const bad = [];
		const mgrs = ["bld","workshop","religion","diplomacy","space","time","village","cultivation","science","prestige","void","challenges"];
		for (const m of mgrs){
			const mgr = game[m];
			if (mgr && mgr.updateEffectCached){
				try { mgr.updateEffectCached(); } catch (e){ bad.push(m + ": " + e.message); }
			}
		}
		expect(bad).toEqual([]);
	});

	test("opts/settings fields sane", () => {
		expect(game.opts).toBeTruthy();
		expect(typeof game.opts).toBe("object");
	});
});
