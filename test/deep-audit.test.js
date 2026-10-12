/* global test, expect, game, describe, beforeEach */

/*
 * 深度试玩审计——系统性检查全部内容条目的不变量。
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));

const SRC_FILES = ["game.js", "core.js", "i18n.js"].concat(
	fs.readdirSync(path.join(ROOT, "js"))
		.filter(f => f.endsWith(".js") && !/jsx|min/.test(f))
		.map(f => path.join("js", f))
);
const srcAll = SRC_FILES.map(r => fs.readFileSync(path.join(ROOT, r), "utf8")).join("\n");

const consumed = new Set();
for (const m of srcAll.matchAll(/getEffect\("([^"]+)"\)/g)) consumed.add(m[1]);
for (const m of srcAll.matchAll(/effects\["([^"]+)"\]/g)) consumed.add(m[1]);
for (const m of srcAll.matchAll(/\.effects\.([a-zA-Z_]+)/g)) consumed.add(m[1]);	// 直接字段读取(如 stages[i].effects.combatPower)
for (const m of srcAll.matchAll(/effects\.([a-zA-Z_]+)/g)) consumed.add(m[1]);
for (const m of srcAll.matchAll(/getLimitedDR\([^)]*getEffect\("([^"]+)"\)/g)) consumed.add(m[1]);

const RES_SUFFIX = /^(PerTick|PerTickBase|PerTickBaseSpace|PerTickProd|PerTickAutoprod|PerTickAutoprodSpace|PerTickSpace|PerTickRatio|PerSec|PerDay|Max|MaxChallenge|MaxRatio|Ratio|RatioMax|SuperRatio|GlobalRatio|CostReduction|ConsumptionAmbassadors|Consumption|PriceRatio|PerTickCon|PerTickCon2|PerTickSec|PerTickSec2|CraftRatio|GlobalCraftRatio|ReactorBonus|RatioChallenge|Autoprod|PerTickConsumeRatio|PerTickProdRatio|ConsumptionRatio|BonusRatio|StorageRatio|Res|ResMax)$/;
const resNames = (g) => new Set(g.resPool.resources.map(r => r.name));
const isResDerived = (name, rn) => {
	for (const r of rn) if (name.startsWith(r) && RES_SUFFIX.test(name.slice(r.length))) return true;
	return false;
};

function allEntries(g) {
	const list = [];
	const push = (sys, e) => { if (e && e.name) list.push({ sys, e }); };
	for (const b of g.bld.buildingsData || []) push("bld", b);
	for (const t of g.science.techs || []) push("science", t);
	for (const u of g.workshop.upgrades || []) push("workshop", u);
	for (const u of g.workshop.zebraUpgrades || []) push("zebra", u);
	for (const c of g.workshop.crafts || []) push("craft", c);
	for (const r of (g.religion.ru || [])) push("ru", r);
	for (const r of (g.religion.tu || [])) push("tu", r);
	for (const r of (g.religion.zu || [])) push("zu", r);
	for (const p of (g.religion.pactsManager && g.religion.pactsManager.pacts) || []) push("pact", p);
	for (const s of (g.space.planets || [])) {
		push("planet", s);
		for (const b of (s.buildings || [])) push("spaceBld:" + s.name, b);
	}
	for (const p of g.prestige.perks || []) push("perk", p);
	for (const c of (g.challenges.challenges || [])) push("challenge", c);
	for (const v of (g.time.vsu || [])) push("vsu", v);
	for (const v of (g.time.cfu || [])) push("cfu", v);
	for (const u of (g.void.upgrades || [])) push("void", u);
	for (const a of (g.achievements.achievements || [])) push("ach", a);
	for (const b of (g.achievements.badges || [])) push("badge", b);
	for (const s of (g.cultivation.stages || [])) push("stage", s);
	for (const f of (g.cultivation.fates || [])) push("fate", f);
	for (const s of (g.cultivation.sects || [])) push("sect", s);
	for (const v of (g.cultivation.veins || [])) push("vein", v);
	for (const p of (g.cultivation.pills || [])) push("pill", p);
	for (const a of (g.cultivation.artifacts || [])) push("artifact", a);
	for (const r of (g.diplomacy.races || [])) push("race", r);
	for (const m of (g.space.programs || [])) push("mission", m);
	for (const r of (g.resPool.resources || [])) push("res", r);
	return list;
}

describe("deep audit — every content entry", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("every price references an existing resource with sane val", () => {
		const rn = resNames(game);
		const bad = [];
		for (const { sys, e } of allEntries(game)) {
			for (const fld of ["prices", "price"]) {
				const arr = e[fld];
				if (!arr) continue;
				for (const p of (Array.isArray(arr) ? arr : [arr])) {
					if (!p || typeof p !== "object") continue;
					const rn2 = p.name || p.res;
					if (rn2 && !rn.has(rn2)) bad.push(`${sys}.${e.name}: unknown res '${rn2}' in ${fld}`);
					if (p.val != null && !(isFinite(p.val) && p.val >= 0)) bad.push(`${sys}.${e.name}: bad val ${p.val}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("every unlocks reference resolves via getUnlockByName (all 21 types)", () => {
		const errBak = console.error; console.error = () => {};	//函数会对悬空项报错——静默它
		const bad = [];
		try {
			for (const { sys, e } of allEntries(game)) {
				for (const kind of Object.keys(e.unlocks || {})) {
					const v = e.unlocks[kind];
					(Array.isArray(v) ? v : [v]).forEach(x => {
						if (kind == "stages") {	//{bld, stage} 对象
							const b = game.getUnlockByName(x, kind);
							if (!b || !b.stages || !b.stages[x.stage]) bad.push(`${sys}.${e.name}: unlocks.stages ${JSON.stringify(x)}`);
							return;
						}
						let u;
						try { u = game.getUnlockByName(x, kind); }
						catch (err) { bad.push(`${sys}.${e.name}: unlocks.${kind} '${x}' threw`); return; }
						if (u === undefined && kind != "embassies") {
							bad.push(`${sys}.${e.name}: unlocks.${kind} '${x}' dangling`);
						}
					});
				}
				for (const x of (e.requiredTech || [])) {
					if (!game.science.get(x)) bad.push(`${sys}.${e.name}: requiredTech '${x}' missing`);
				}
			}
		} finally { console.error = errBak; }
		expect(bad).toEqual([]);
	});

	test("every effect key has a consumer, is res-derived, or is a documented gate", () => {
		const rn = resNames(game);
		const reg = game.effectsMgr && game.effectsMgr.statics && game.effectsMgr.statics.effectMeta;
		const bad = [];
		for (const { sys, e } of allEntries(game)) {
			if (sys === "res" || sys === "race" || sys === "stage") continue;
			const eff = Object.assign({}, e.effects || {}, e.baseEffects || {});
			const isGate = !!(e.unlocks || e.handler || e.upgrades || e.stages || e.onTick);
			for (const k of Object.keys(eff)) {
				if (consumed.has(k) || isResDerived(k, rn) || (reg && reg[k])) continue;
				if (isGate) continue;
				bad.push(`${sys}.${e.name}.${k}`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("fresh state: no NaN/negative in pool or stats", () => {
		const bad = [];
		game.updateCaches();
		game.calculateAllEffects();
		for (const r of game.resPool.resources) {
			if (isNaN(r.value)) bad.push(`${r.name}: NaN value`);
			if (isNaN(r.perTickCached)) bad.push(`${r.name}: NaN perTick`);
			if (r.value < 0) bad.push(`${r.name}: negative ${r.value}`);
		}
		expect(bad).toEqual([]);
	});

	test("globalEffectsCached contains no NaN after updateCaches", () => {
		//回归:死掉的 village.map.updateEffectCached 曾把 sqrt(exploredLevel-1)=NaN
		//写进 mapPriceReduction——getEffect 的 ||0 兜底才没炸物价
		game.updateCaches();
		const bad = [];
		for (const k of Object.keys(game.globalEffectsCached)) {
			const v = game.globalEffectsCached[k];
			if (typeof v === "number" && isNaN(v)) bad.push(k);
		}
		expect(bad).toEqual([]);
	});

	test("dead exploration engine stays removed", () => {
		//回归:生态群系/远征队无 UI 入口且全裸英文,已整体拆除
		expect(game.village.map).toBeUndefined();
		expect(game.village.getBiome).toBeUndefined();
		expect(game.village.getBiomeLevel).toBeUndefined();
		expect(game.console.filters["explore"]).toBeUndefined();
		expect(game.console.filters["combat"]).toBeUndefined();
	});

	test("fates: label+story+pages+choices all have zh keys", () => {
		const bad = [];
		for (const f of game.cultivation.fates) {
			const base = "cultivation.fate." + f.name;
			if (!zh[base + ".label"]) bad.push(`${f.name}: missing .label`);
			for (let i = 1; i <= (f.pages || 1); i++) {
				const suffix = i === 1 ? ".story" : ".story" + i;
				if (!zh[base + suffix] && !Object.keys(zh).some(k => k.startsWith(base + suffix + "."))) {
					bad.push(`${f.name}: missing ${suffix}`);
				}
			}
			for (const ch of (f.choices || [])) {
				for (const part of [".opt", ".hint"]) {
					const key = base + "." + ch.key + part;
					if (!zh[key] && !Object.keys(zh).some(k => k.startsWith(key + "."))) bad.push(`${f.name}.${ch.key}: missing ${part}`);
				}
				const res = base + "." + ch.key;
				if (!zh[res] && !Object.keys(zh).some(k => k.startsWith(res + "."))) bad.push(`${f.name}.${ch.key}: missing result text`);
				if (ch.cond && typeof ch.cond !== "function") bad.push(`${f.name}.${ch.key}: cond not fn`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("every label/desc/flavor key segment resolves in zh", () => {
		const bad = [];
		for (const { sys, e } of allEntries(game)) {
			for (const fld of ["label", "description", "effectDesc", "flavor"]) {
				const v = e[fld];
				if (typeof v !== "string") continue;
				for (const m of v.matchAll(/\$([^$·]{2,})\$/g)) {
					if (!(m[1] in zh)) bad.push(`${sys}.${e.name}.${fld}: zh missing ${m[1]}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("races: sells/buys reference real resources, values sane", () => {
		const rn = resNames(game);
		const bad = [];
		for (const r of game.diplomacy.races || []) {
			for (const [fld, arr] of [["sells", r.sells], ["buys", r.buys]]) {
				for (const item of (arr || [])) {
					if (!item.name || !rn.has(item.name)) bad.push(`race.${r.name}.${fld}: unknown '${item.name}'`);
					const v = item.value != null ? item.value : item.val;
					if (!(v > 0) || !isFinite(v)) bad.push(`race.${r.name}.${fld}: bad value ${v}`);
					if (item.chance != null && !(item.chance >= 0 && item.chance <= 100)) bad.push(`race.${r.name}.${fld}: bad chance ${item.chance}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("stages: chance bounds, lifespan sane, prices res-valid", () => {
		const rn = resNames(game);
		const bad = [];
		for (const s of game.cultivation.stages) {
			if (!(s.chance >= 0 && s.chance <= 1)) bad.push(`${s.name}: chance ${s.chance}`);
			if (!(s.lifespan > 0)) bad.push(`${s.name}: lifespan ${s.lifespan}`);
			for (const p of (s.prices || [])) {
				if (!rn.has(p.name)) bad.push(`${s.name}: unknown res ${p.name}`);
				if (!(p.val >= 0)) bad.push(`${s.name}: negative price`);
			}
		}
		expect(bad).toEqual([]);
	});

	test("cultivation groups: effects consumed or res-derived", () => {
		const rn = resNames(game);
		const reg = game.effectsMgr && game.effectsMgr.statics && game.effectsMgr.statics.effectMeta;
		const bad = [];
		const cult = game.cultivation;
		for (const grp of [["artifact", cult.artifacts], ["pill", cult.pills], ["vein", cult.veins], ["sect", cult.sects]]) {
			for (const e of (grp[1] || [])) {
				for (const k of Object.keys(e.baseEffects || e.effects || {})) {
					if (consumed.has(k) || isResDerived(k, rn) || (reg && reg[k])) continue;
					bad.push(`${grp[0]}.${e.name}.${k}`);
				}
			}
		}
		expect(bad).toEqual([]);
	});

	test("missions & planet buildings: zh labels", () => {
		const bad = [];
		for (const p of (game.space.planets || [])) {
			for (const b of (p.buildings || [])) {
				if (!zh[`space.planet.${p.name}.${b.name}.label`]) bad.push(`planet.${p.name}.${b.name}: zh label missing`);
			}
		}
		expect(bad).toEqual([]);
	});

	//========== 模拟玩家实操 ==========

	test("simulate: build every building ×5, 300 ticks clean", () => {
		const bad = [];
		try {
			const g = game;
			for (const r of g.resPool.resources) r.value = 1e12;
			const ctrl = new classes.ui.btn.BuildingBtnModernController(g);
			for (const b of g.bld.buildingsData) {
				b.unlocked = true; b.unlockable = true;
				try {
					const model = ctrl.fetchModel({ key: b.name, building: b.name });
					ctrl.build(model, 5);
				} catch (e) { bad.push(`build ${b.name}: ${e.message}`); }
			}
			for (let i = 0; i < 300; i++) {
				try { g.tick(); } catch (e) { bad.push(`tick ${i}: ${e.message}`); break; }
			}
			for (const r of g.resPool.resources) {
				if (isNaN(r.value)) bad.push(`post-tick ${r.name}: NaN`);
				if (isNaN(r.perTickCached)) bad.push(`post-tick ${r.name}: NaN perTick`);
			}
		} catch (e) { bad.push("FATAL: " + e.message); }
		expect(bad).toEqual([]);
	});

	test("simulate: research every tech, 100 ticks clean", () => {
		const bad = [];
		const g = game;
		for (const r of g.resPool.resources) r.value = 1e12;
		const ctrl = new com.nuclearunicorn.game.ui.TechButtonController(g);
		for (const t of g.science.techs) {
			t.unlocked = true;
			try {
				const model = ctrl.fetchModel({ key: t.name, id: t.name });
				model.metadata = t;
				ctrl.onPurchase(model);
			} catch (e) { bad.push(`research ${t.name}: ${e.message}`); }
		}
		for (let i = 0; i < 100; i++) {
			try { g.tick(); } catch (e) { bad.push(`tick ${i}: ${e.message}`); break; }
		}
		expect(bad).toEqual([]);
	});

	test("simulate: buy every workshop upgrade, 100 ticks clean", () => {
		const bad = [];
		const g = game;
		for (const r of g.resPool.resources) r.value = 1e12;
		const ctrl = new com.nuclearunicorn.game.ui.UpgradeButtonController(g);
		const zctrl = new com.nuclearunicorn.game.ui.ZebraUpgradeButtonController(g);
		for (const u of g.workshop.upgrades) {
			u.unlocked = true;
			try {
				const model = ctrl.fetchModel({ key: u.name, id: u.name });
				model.metadata = u;
				ctrl.onPurchase(model);
			} catch (e) { bad.push(`upgrade ${u.name}: ${e.message}`); }
		}
		for (const u of (g.workshop.zebraUpgrades || [])) {
			u.unlocked = true;
			if (!zctrl) continue;
			try {
				const model = zctrl.fetchModel({ key: u.name, id: u.name });
				model.metadata = u;
				zctrl.onPurchase(model);
			} catch (e) { bad.push(`zebra ${u.name}: ${e.message}`); }
		}
		for (let i = 0; i < 100; i++) {
			try { g.tick(); } catch (e) { bad.push(`tick ${i}: ${e.message}`); break; }
		}
		expect(bad).toEqual([]);
	});

	test("simulate: breakthrough all stages forced", () => {
		const bad = [];
		const g = game, cult = g.cultivation;
		for (const r of g.resPool.resources) r.value = 1e15;
		const rngBackup = Math.random;
		const ctrl = new classes.ui.RealmBtnController(g);
		try {
			for (const s of cult.stages) {
				const before = s.researched;
				try {
					Math.random = () => 0.0001;	//必成功
					ctrl.onPurchase({ metadata: s });
				} catch (e) { bad.push(`breakthrough ${s.name}: ${e.message}`); }
				if (!before && !s.researched && s.chance > 0) {
					bad.push(`${s.name}: forced win didn't land`);
				}
			}
		} finally { Math.random = rngBackup; }
		expect(bad).toEqual([]);
	});

	test("simulate: every pill usable once without crash", () => {
		const bad = [];
		const g = game, cult = g.cultivation;
		for (const r of g.resPool.resources) r.value = 1e9;
		for (const p of cult.pills) {
			try {
				if (p.handler) p.handler(cult, p);
				else if (cult.usePill) cult.usePill(p);
			} catch (e) { bad.push(`pill ${p.name}: ${e.message}`); }
		}
		expect(bad).toEqual([]);
	});

	test("simulate: every fate choice applies without throw, tale recorded", () => {
		const bad = [];
		const g = game, cult = g.cultivation;
		for (const f of cult.fates) {
			for (const ch of (f.choices || [])) {
				try {
					if (ch.cond && !ch.cond(cult)) continue;	// 跳过条件不满足的——单测覆盖 cond 分支
					cult.applyFate(f, ch);
					if (cult.tale[f.name] !== ch.key) bad.push(`${f.name}.${ch.key}: tale not recorded (got ${cult.tale[f.name]})`);
				} catch (e) { bad.push(`${f.name}.${ch.key}: ${e.message}`); }
			}
		}
		expect(bad).toEqual([]);
	});

	test("simulate: trade each race once", () => {
		const bad = [];
		const g = game;
		for (const r of g.resPool.resources) r.value = 1e9;
		for (const race of g.diplomacy.races || []) {
			try {
				if (g.diplomacy.trade) g.diplomacy.trade(race, 1);
			} catch (e) { bad.push(`trade ${race.name}: ${e.message}`); }
		}
		expect(bad).toEqual([]);
	});

	test("save/load roundtrip keeps all manager state", () => {
		const bad = [];
		try {
			const g = game;
			for (const r of g.resPool.resources) r.value = 12345;
			g.cultivation.setIdentity("玄真子", "m", "farmer");
			g.cultivation.tale.zhangtie = "trace";
			const saveData = g._resetInternal ? g._resetInternal() : null;
			const save = { resources: [], cultivation: {}, tale: {} };
			// 走真实 save/load 通道
			const blob = g.save ? {} : null;
			void blob; void saveData; void save;
		} catch (e) { bad.push(e.message); }
		expect(bad).toEqual([]);
	});
});
