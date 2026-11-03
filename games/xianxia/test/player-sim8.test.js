/* global test, expect, game, describe, beforeEach */

/*
 * 深查第八批:全管理器元数据横扫——名字唯一、价格合法、效果有限、
 * 标签有文案、解锁引用有效。一次过所有命名条目。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/en.json"), "utf8"));

const validRes = (g, n) => { try { return !!g.resPool.get(n); } catch(e){ return false; } };
const finite = (v) => typeof v == "number" && isFinite(v);

//剥出字符串里全部 $key$ 占位符(支持 $k1$·$k2$ 复合标签)
const keysOf = (v) => {
	if (typeof v != "string" || v.indexOf("$") < 0){ return []; }
	const out = [];
	for (const m of v.matchAll(/\$([^$<>\s][^$<>]*)\$/g)){ out.push(m[1]); }
	return out;
};
const keyOf = (v) => keysOf(v)[0] || null;

describe("meta-sweep — 全管理器条目不变量", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("every metadata item name is unique within its array", () => {
		const g = game;
		const arrays = [
			["bld.buildingsData", g.bld.buildingsData],
			["science.techs", g.science.techs],
			["workshop.upgrades", g.workshop.upgrades],
			["workshop.crafts", g.workshop.crafts],
			["workshop.zebraUpgrades", g.workshop.zebraUpgrades],
			["religion.zu", g.religion.zigguratUpgrades],
			["religion.ru", g.religion.religionUpgrades],
			["religion.tu", g.religion.transcendenceUpgrades],
			["religion.pacts", g.religion.pacts || []],
			["space.programs", g.space.programs],
			["time.cfu", g.time.chronoforgeUpgrades],
			["time.vsu", g.time.voidspaceUpgrades],
			["prestige.perks", g.prestige.perks],
			["challenges.challenges", g.challenges.challenges],
			["achievements.achievements", g.achievements.achievements],
			["cultivation.stages", g.cultivation.stages],
			["cultivation.sects", g.cultivation.sects],
			["cultivation.veins", g.cultivation.veins],
			["cultivation.pills", g.cultivation.pills],
			["cultivation.fates", g.cultivation.fates],
			["cultivation.artifacts", g.cultivation.artifacts],
			["resPool.resources", g.resPool.resources],
			["diplomacy.races", g.diplomacy.races]
		];
		const bad = [];
		for (const [label, arr] of arrays){
			if (!arr) { continue; }
			const seen = new Set();
			for (const it of arr){
				if (!it || !it.name){ bad.push(label + ": unnamed item"); continue; }
				if (seen.has(it.name)) bad.push(label + ": dup " + it.name);
				seen.add(it.name);
			}
		}
		expect(bad).toEqual([]);
	});

	test("every prices[] references a real resource with finite positive val", () => {
		const g = game;
		const bad = [];
		const scan = (label, items) => {
			for (const it of items || []){
				for (const p of (it.prices || it.priceRatio && [] || [])){
					if (!validRes(g, p.name)) bad.push(label + "/" + it.name + ": bad res " + p.name);
					if (!finite(p.val) || p.val <= 0) bad.push(label + "/" + it.name + ": bad val " + p.val);
				}
			}
		};
		scan("bld", g.bld.buildingsData);
		scan("tech", g.science.techs);
		scan("upg", g.workshop.upgrades);
		scan("craft", g.workshop.crafts);
		scan("zebra", g.workshop.zebraUpgrades);
		scan("zu", g.religion.zigguratUpgrades);
		scan("ru", g.religion.religionUpgrades);
		scan("tu", g.religion.transcendenceUpgrades);
		scan("program", g.space.programs);
		scan("cfu", g.time.chronoforgeUpgrades);
		scan("vsu", g.time.voidspaceUpgrades);
		scan("perk", g.prestige.perks);
		scan("stage", g.cultivation.stages);
		scan("sect", g.cultivation.sects);
		scan("vein", g.cultivation.veins);
		scan("pill", g.cultivation.pills);
		//space planets 的建筑
		for (const pl of (g.space.planets || [])){
			for (const b of (pl.buildings || [])){
				for (const p of (b.prices || [])){
					if (!validRes(g, p.name)) bad.push("planet/" + pl.name + "/" + b.name + ": bad res " + p.name);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("every effects{} value is a finite number", () => {
		const g = game;
		const bad = [];
		const scan = (label, items) => {
			for (const it of items || []){
				for (const k in (it.effects || {})){
					if (!finite(it.effects[k])) bad.push(label + "/" + it.name + "." + k + "=" + it.effects[k]);
				}
			}
		};
		scan("bld", g.bld.buildingsData);
		scan("tech", g.science.techs);
		scan("upg", g.workshop.upgrades);
		scan("zu", g.religion.zigguratUpgrades);
		scan("ru", g.religion.religionUpgrades);
		scan("tu", g.religion.transcendenceUpgrades);
		scan("program", g.space.programs);
		scan("cfu", g.time.chronoforgeUpgrades);
		scan("vsu", g.time.voidspaceUpgrades);
		scan("perk", g.prestige.perks);
		scan("stage", g.cultivation.stages);
		scan("sect", g.cultivation.sects);
		scan("vein", g.cultivation.veins);
		scan("planet-bld", (g.space.planets || []).flatMap(p => p.buildings || []));
		expect(bad).toEqual([]);
	});

	test("every $-wrapped label/description resolves in zh.json", () => {
		const bad = [];
		const scan = (label, items) => {
			for (const it of items || []){
				for (const f of ["label","name","description","flavor"]){
					for (const k of keysOf(it[f])){
						if (!(k in zh)) bad.push(label + "/" + (it.name||"?") + "." + f + " missing " + k);
					}
				}
			}
		};
		const g = game;
		scan("bld", g.bld.buildingsData);
		scan("tech", g.science.techs);
		scan("upg", g.workshop.upgrades);
		scan("craft", g.workshop.crafts);
		scan("zu", g.religion.zigguratUpgrades);
		scan("ru", g.religion.religionUpgrades);
		scan("tu", g.religion.transcendenceUpgrades);
		scan("program", g.space.programs);
		scan("cfu", g.time.chronoforgeUpgrades);
		scan("vsu", g.time.voidspaceUpgrades);
		scan("perk", g.prestige.perks);
		scan("challenge", g.challenges.challenges);
		scan("stage", g.cultivation.stages);
		scan("sect", g.cultivation.sects);
		scan("vein", g.cultivation.veins);
		scan("pill", g.cultivation.pills);
		scan("fate", g.cultivation.fates);
		scan("artifact", g.cultivation.artifacts);
		expect(bad).toEqual([]);
	});

	test("every unlocks{} reference resolves via getUnlockByName", () => {
		const g = game;
		const bad = [];
		const scan = (label, items) => {
			for (const it of items || []){
				for (const type in (it.unlocks || {})){
					for (const n of it.unlocks[type]){
						const r = g.getUnlockByName(n, type);
						if (!r) bad.push(label + "/" + it.name + ": unlocks." + type + "." + n);
					}
				}
			}
		};
		scan("bld", g.bld.buildingsData);
		scan("tech", g.science.techs);
		scan("upg", g.workshop.upgrades);
		scan("zu", g.religion.zigguratUpgrades);
		scan("ru", g.religion.religionUpgrades);
		scan("tu", g.religion.transcendenceUpgrades);
		scan("program", g.space.programs);
		scan("cfu", g.time.chronoforgeUpgrades);
		scan("vsu", g.time.voidspaceUpgrades);
		scan("perk", g.prestige.perks);
		scan("challenge", g.challenges.challenges);
		scan("planet", g.space.planets || []);
		scan("planet-bld", (g.space.planets || []).flatMap(p => p.buildings || []));
		expect(bad).toEqual([]);
	});

	test("every resource has zh title and valid type flags", () => {
		const g = game;
		const bad = [];
		for (const r of g.resPool.resources){
			if (!r.name) bad.push("unnamed resource");
			for (const k of keysOf(r.title)){
				if (!(k in zh)) bad.push("res " + r.name + " missing zh " + k);
			}
			if (r.maxValue != null && !finite(r.maxValue)) bad.push("res " + r.name + " bad maxValue");
			if (r.value != null && !finite(r.value)) bad.push("res " + r.name + " bad value " + r.value);
		}
		expect(bad).toEqual([]);
	});

	test("every challenge has finite effect values and valid names", () => {
		const g = game;
		const bad = [];
		for (const ch of g.challenges.challenges){
			for (const k in (ch.effects || {})){
				if (!finite(ch.effects[k])) bad.push(ch.name + "." + k);
			}
			if (typeof ch.name != "string") bad.push("noname");
		}
		expect(bad).toEqual([]);
	});

	test("achievement condition functions exist and are callable", () => {
		const g = game;
		const bad = [];
		for (const a of g.achievements.achievements.concat(g.achievements.badges || [])){
			if (a.condition && typeof a.condition != "function") bad.push(a.name + ": non-function cond");
			if (!a.name) bad.push("unnamed achievement");
			for (const k of keysOf(a.title)){
				if (!(k in zh)) bad.push(a.name + " missing zh " + k);
			}
		}
		expect(bad).toEqual([]);
	});

	test("every planet has zh name/desc, every building prices valid", () => {
		const g = game;
		const bad = [];
		for (const pl of (g.space.planets || [])){
			if (!pl.name) { bad.push("unnamed planet"); continue; }
			for (const f of ["label","description"]){
				for (const k of keysOf(pl[f])){
					if (!(k in zh)) bad.push("planet " + pl.name + "." + f + " missing " + k);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("diplomacy races: buys/sells reference real resources with finite amts", () => {
		const g = game;
		const bad = [];
		for (const r of g.diplomacy.races){
			for (const b of (r.buys || [])){
				if (!validRes(g, b.name)) bad.push(r.name + " buys bad res " + b.name);
				if (!finite(b.val)) bad.push(r.name + " buys bad val");
			}
			for (const s of (r.sells || [])){
				if (!validRes(g, s.name)) bad.push(r.name + " sells bad res " + s.name);
				if (!finite(s.value) && !finite(s.val)) bad.push(r.name + " sells bad val");
			}
			if (r.standing != null && !finite(r.standing)) bad.push(r.name + " bad standing");
		}
		expect(bad).toEqual([]);
	});
});
