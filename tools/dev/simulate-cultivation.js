/**
 * Progression-curve simulator for classes.managers.CultivationManager.
 *
 * Loads the REAL stage/fate/sect/artifact tables from js/cultivation.js
 * headlessly, then walks the ladder computing EXPECTED wall-clock time per
 * stage: accumulation time + breakthrough retry waste + heart-demon lockout.
 *
 * The unknowable input is how actively a real player farms rifts/wander —
 * so it's an engagement multiplier (low/mid/high).
 *
 *   node simulate-cultivation.js [scenario=mid] [root=san]
 *   node simulate-cultivation.js mid san --solve
 *
 * --solve prints, per stage, the income rate at that point and the stage cost
 * that would land on the per-realm time target — the tuning receipt.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------- tunables --
const TICKS_PER_SEC = 5;
//rift/wander engagement multiplier: low = mostly idle, high = farms on cooldown
const SCENARIOS = { low: 0.3, mid: 1.0, high: 2.0 };
const FAIL_REFUND = 0.5;         // half xiuwei refunded on failed breakthrough
const DEMON_PER_FAIL = 16;       // 12 + rand*8 avg
const DEMON_GATE = 90;
const DEMON_DECAY = 0.03;        // per tick (0.15/sec)
const QINGXIN_RELIEF = 40;
const TARGET_STAGE_SEC = 15 * 60; // "stuck" = a stage taking >15min



//per-realm target seconds for --solve: rising wall before each breakthrough
const TARGET_SEC = { lianqi: 90, zhuji: 300, jiedan: 600, yuanying: 1200, huashen: 1800, lianxu: 2700, heti: 3600, dacheng: 5400, dujie: 7200 };

// ------------------------------------------------------------------ loader --
function loadTables() {
	const namespace = { com: {}, classes: {}, mixin: {} };
	const create = require(path.join(__dirname, "..", "..", "test/declare.js"));
	const d = create(namespace);
	global.com = namespace.com;
	global.classes = namespace.classes;
	global.mixin = namespace.mixin;
	global.dojo = {
		declare: d.declare,
		clone: function (m) {
			if (Array.isArray(m)) { return m.map(function (x) { return global.dojo.clone(x); }); }
			return Object.assign({}, m);
		},
		mixin: (a, b) => Object.assign(a, b),
		isArray: Array.isArray,
	};
	global.$I = (k) => k;
	global.window = { localStorage: null };
	global.document = { all: false };
	global.game = { resPool: { get: () => ({ getEffect: () => 0 }), has: () => false } };

	eval(fs.readFileSync(path.join(__dirname, "..", "..", "core.js"), "utf8"));           // TabManager + registerMeta
	eval(fs.readFileSync(path.join(__dirname, "..", "..", "js/cultivation.js"), "utf8")); // eslint-disable-line
	const stub = {
		resPool: { get: (n) => ({ name: n, value: 0 }), filterRes: (a) => a, addResEvent: () => {} },
		getEffect: () => 0, globalEffectsCached: {}, msg: () => {}, render: () => {},
		ui: {}, getTab: () => ({ visible: true }), getDisplayValueExt: (v) => "" + v,
	};
	return new namespace.classes.managers.CultivationManager(stub);
}

// -------------------------------------------------------------------- sim ---
function simulate(cult, scenario, rootKey, solve) {
	const root = cult.ROOTS.find((r) => r.key === rootKey) || cult.ROOTS[1];
	const eff = {};
	const demon = { v: 0, decay: DEMON_DECAY, failAdd: DEMON_PER_FAIL };
	const rows = [];

	const stageXiuwei = (s) => s.prices.reduce((t, p) => t + (p.name === "xiuwei" ? p.val : 0), 0);
	const relicCost = (s) => s.prices.reduce((t, p) => t + (p.name === "relic" ? p.val : 0), 0);

	const sumEffects = () => {
		eff.realmProd = 0;
		let ratio = root.xiuweiMult - 1, relicTick = 0;
		eff.tickBase = 0;
		const acc = (e) => {
			if (!e) { return; }
			ratio += e.xiuweiRatio || 0;
			eff.realmProd += e.realmProductionRatio || 0;
			relicTick += e.relicPerTickBase || 0;
			eff.tickBase += e.xiuweiPerTickBase || 0;
		};
		for (const s of cult.stages) { if (s.researched) { acc(s.effects); } }
		for (const v of cult.veins) { if (v.researched) { acc(v.effects); } }
		for (const s of cult.sects) { if (s.researched) { acc(s.effects); } }
		for (const f of cult.fates) { if (f.researched) { acc(f.effects); } }
		for (const a of cult.artifacts) {
			if (a.researched) {
				const scaled = {};
				for (const k in a.baseEffects) { scaled[k] = a.baseEffects[k] * a.rank; }
				acc(scaled);
			}
		}
		eff.ratio = ratio; eff.relicTick = relicTick;
	};

	//expected xiuwei/sec: passive trickle + engagement payouts, which are
	//fractions of the next breakthrough's xiuwei price (breakPayout) decayed
	//by stages cleared — same model as js/cultivation.js
	const income = (engage, realmIdx, anchor, cleared) => {
		const passive = eff.tickBase * (1 + eff.ratio) * (1 + eff.realmProd) * TICKS_PER_SEC;
		const decay = 1 / (1 + cleared * 0.05);
		const wanderSec = cult.WANDER_CD / TICKS_PER_SEC;
		let act = 0.17 * cult.WANDER_PAY * anchor / wanderSec;
		if (realmIdx >= 1) {	//秘境历练 unlocked at 筑基_0
			const riftSec = cult.RIFT_CD / TICKS_PER_SEC;
			const floor = realmIdx * 4 + 3;                  //roughly where the ladder sits
			const clearP = Math.max(0.08, 0.92 + realmIdx * 0.02 - Math.max(0, floor - 3) * 0.03);
			act += cult.RIFT_PAY * anchor / riftSec
				+ (0.3 / riftSec) * (clearP * cult.GRIFT_PAY + (1 - clearP) * cult.GRIFT_FAIL_PAY) * anchor;
		}
		return passive + engage * act * decay;
	};

	const applyFates = (stageName) => {
		for (const f of cult.fates) {
			if (f.researched || f.atStage !== stageName) { continue; }
			if (f.cond && !f.cond(cult)) { continue; }	//tale-gated arcs never fire in the sim's timeline
			f.researched = true;
			if (f.choices) {
				const score = (c) => !c.effects ? 0 :
					(c.effects.xiuweiRatio || 0) * 10 +
					(c.effects.relicPerTickBase || 0) * 200 + (c.effects.realmProductionRatio || 0) * 5;
				const vis = f.choices.filter((c) => !c.cond || c.cond(cult));
				const best = vis.length ? vis.reduce((a, b) => score(b) > score(a) ? b : a, vis[0]) : null;
				if (best) {
					f.effects = best.effects || f.effects || {};
					if (best.demonGain) { demon.v = Math.min(100, demon.v + best.demonGain); }
					if (best.demonRelief) { demon.v = Math.max(0, demon.v - best.demonRelief); }
				}
			}
			if (f.name === "nangong") { demon.decay *= 3; }
			if (f.name === "tihun") { demon.failAdd *= 0.5; }
		}
	};

	//artifact assumption for the sim: by each realm's end the player holds ~1
	//drop per realm cleared, favoring production pieces (optimistic-lite)
	const grantArtifacts = (realmIdx) => {
		if (realmIdx < 1) { return; }
		const pick = cult.artifacts[(realmIdx - 1) % cult.artifacts.length];
		if (!pick.researched) { pick.researched = true; pick.rank = 1; }
		else if (pick.rank < cult.ARTIFACT_RANK_MAX) { pick.rank++; }
	};

	const relicRate = (realmIdx) => {
		if (realmIdx < 1) { return eff.relicTick * TICKS_PER_SEC; }
		const floor = realmIdx * 4 + 3;
		return eff.relicTick * TICKS_PER_SEC + (0.3 / 60) * floor * 0.8;
	};

	let prevRealm = "";
	let cleared = 0;
	for (const s of cult.stages) {
		if (s.researched) { cleared++; continue; }
		const realmIdx = cult.REALM_DEFS.findIndex((d) => d.key === s.realm);
		const anchor = stageXiuwei(s) * (root.priceMult || 1);

		//buy veins/sects as they become visible — they're the income sinks
		const veinGate = cult.getStage("zhuji_0").researched;
		let prepSec = 0;
		for (const v of cult.veins) {
			if (!v.researched && veinGate) { v.researched = true; sumEffects(); }
		}
		for (const sc of cult.sects) {
			const gate = cult.getStage(sc.gate);
			if (!sc.researched && gate && gate.researched) {
				sc.researched = true;
				prepSec += stageXiuwei(sc) / Math.max(income(scenario, realmIdx, anchor, cleared), 1e-9);
				sumEffects();
			}
		}
		grantArtifacts(realmIdx);
		applyFates(s.name);
		sumEffects();

		const rate = income(scenario, realmIdx, anchor, cleared);

		if (solve) {
			rows.push({ name: s.name, realm: s.realm, newRealm: s.realm !== prevRealm,
				cost: stageXiuwei(s), relicCost: relicCost(s), rate,
				suggest: rate * TARGET_SEC[s.realm] });
			s.researched = true;
			cleared++;
			prevRealm = s.realm;
			continue;
		}

		const p = Math.max(0.05, Math.min(1, s.chance - demon.v * 0.004));
		const expFails = (1 - p) / p;
		const effCost = stageXiuwei(s) * (1 + FAIL_REFUND * expFails);
		let sec = effCost / rate + prepSec;

		//relic gate check: trickle + grift salvage vs stage price
		const rNeed = relicCost(s);
		if (rNeed > 0) {
			const relicSec = rNeed / Math.max(relicRate(realmIdx), 1e-6);
			sec = Math.max(sec, relicSec);
		}

		//heart demon: expected fails, lockout decayed at demon.decay/tick
		demon.v = Math.min(100, demon.v + expFails * demon.failAdd);
		let lockSec = 0;
		if (demon.v >= DEMON_GATE) {
			lockSec = (demon.v - DEMON_GATE + QINGXIN_RELIEF) / (demon.decay * TICKS_PER_SEC);
			demon.v = 0;
		}
		demon.v = Math.max(0, demon.v - sec * demon.decay * TICKS_PER_SEC);
		sec += lockSec;

		s.researched = true;
		cleared++;
		rows.push({ name: s.name, realm: s.realm, newRealm: s.realm !== prevRealm,
			sec, lockSec, fails: expFails, rate, cost: stageXiuwei(s) });
		prevRealm = s.realm;
	}
	return rows;
}

// ------------------------------------------------------------------ report --
function fmt(t) {
	if (t < 90) { return t.toFixed(0) + "s"; }
	if (t < 5400) { return (t / 60).toFixed(1) + "m"; }
	return (t / 3600).toFixed(1) + "h";
}
//rates are xiuwei/sec — a plain magnitude, not a duration
function frate(v) {
	if (v < 1000) { return v.toPrecision(2); }
	if (v < 1e6) { return (v / 1000).toPrecision(3) + "k"; }
	return (v / 1e6).toPrecision(3) + "M";
}

const args = process.argv.slice(2);
const solveMode = args.includes("--solve");
const scenarioName = args[0] && !args[0].startsWith("--") ? args[0] : "mid";
const rootArg = args.find((a) => ["wei", "san", "zhen", "yi", "tian"].includes(a));
const roots = rootArg ? [rootArg] : ["wei", "san", "tian"];
const scenario = SCENARIOS[scenarioName];

console.log(`\n=== cultivation curve — engagement "${scenarioName}" (×${scenario}) ===`);
for (const rootKey of roots) {
	const cult = loadTables();
	const rows = simulate(cult, scenario, rootKey, solveMode);
	console.log(`\n── spirit root: ${rootKey} ──`);
	let total = 0, stalls = 0;
	for (const r of rows) {
		if (solveMode) {
			console.log(
				`${r.newRealm ? "┌" : "│"} ${r.name.padEnd(11)} now ${fmt(r.cost).padStart(8)} → ` +
				`suggest ${fmt(r.suggest).padStart(8)} (rate ${frate(r.rate)}/s${r.relicCost ? ", +" + r.relicCost + " relic" : ""})`
			);
			continue;
		}
		total += r.sec;
		const stall = r.sec > TARGET_STAGE_SEC;
		if (stall) { stalls++; }
		console.log(
			`${r.newRealm ? "┌" : "│"} ${r.name.padEnd(11)} ${fmt(r.sec).padStart(8)}` +
			`${r.lockSec > 1 ? " +" + fmt(r.lockSec) + " 心魔锁" : ""}` +
			`  (cost ${fmt(r.cost)}, rate ${frate(r.rate)}/s)${stall ? "  << STALL" : ""}`
		);
	}
	if (!solveMode) { console.log(`   total: ${fmt(total)}   stalls>15m: ${stalls}`); }
}
