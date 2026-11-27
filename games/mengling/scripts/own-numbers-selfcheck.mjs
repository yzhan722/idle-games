#!/usr/bin/env node
// ML-COM1：捕获率 / 稀有度 / 进化条件 / 基础属性由自有规则（scripts/beast_rules.mjs）生成，
// 与 scripts/_srcdata 的第三方快照逐条比对，一致率必须低于 30%；旧存档不倒退。
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";
import vm from "node:vm";
import "../data/beasts.js";
import { stageRelease } from "./stage-release.mjs";
import { RULES, buildLineage, buildOwnNumbers, pidOf, ZONES_TOTAL } from "./beast_rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}
const LIMIT = 0.3;
const traits = JSON.parse(read("data/beast_traits.json"));
const ids = traits.map((t) => pidOf(t.dex));

// ---- 1) data/beasts.js 就是规则生成的结果 ----
const own = buildOwnNumbers(traits);
for (const [key, val] of [
  ["BEAST_TYPES", own.types], ["BEAST_ZONES", own.zones], ["BEAST_EVO", own.evo], ["BEAST_EVO_REQ", own.evoReq],
  ["BEAST_TIER", own.tier], ["BEAST_TAME", own.tame], ["BEAST_STATS", own.stats],
]) {
  assert(JSON.stringify(globalThis[key]) === JSON.stringify(val), `${key} in data/beasts.js matches beast_rules.mjs (run node scripts/build-beast-data.mjs)`);
}
assert(!("BEAST_CATCH_RATE" in globalThis), "the old 0–255 catch table is gone");
assert(traits.length === 160 && traits.every((t, i) => t.n === i + 1), "160 species, catalog numbers 1–160");

// ---- 2) 与第三方快照逐条比对 ----
const snap = vm.createContext({});
const snapDir = join(root, "scripts", "_srcdata");
for (const f of readdirSync(snapDir)) {
  const text = readFileSync(join(snapDir, f), "utf8");
  assert(text.startsWith("// 第三方作品数据快照：只供 scripts/own-numbers-selfcheck.mjs 比对"), `_srcdata/${f} is marked compare-only`);
  vm.runInContext(text, snap);
}
const snapOf = (suffix) => snap[Object.keys(snap).find((k) => k.endsWith(`_${suffix}`))];
const oldTier = snapOf("TIER");
const oldCatch = snapOf("CATCH_RATE");
const oldReq = snapOf("EVO_REQ");
const oldEvo = snapOf("EVO");
const oldTrade = snapOf("EVO_TRADE");
const oldFriend = snapOf("EVO_FRIEND");
assert([oldTier, oldCatch, oldReq, oldEvo, oldTrade, oldFriend].every(Boolean), "snapshot tables loaded");
const edges = Object.entries(own.evo).flatMap(([from, tos]) => tos.map((to) => [from, to]));
const share = (list, same) => list.filter(same).length / list.length;
const report = {
  稀有度: share(ids, (id) => own.tier[id] === oldTier[id]),
  捕获率: share(ids, (id) => own.tame[id] === oldCatch[id]),
  捕获概率: share(ids, (id) => Math.abs(own.tame[id] / 100 - oldCatch[id] / 510) < 0.01),
  进化等级: share(edges, ([a, b]) => own.evoReq[a][b].lvl === oldReq[a]?.[b]),
};
for (const [k, v] of Object.entries(report)) assert(v < LIMIT, `${k} agreement with the snapshot below ${LIMIT * 100}% (${(v * 100).toFixed(1)}%)`);
const overlap = (list, path) => list.filter((e) => { const [a, b] = e.split("->"); return own.evoReq[a]?.[b]?.path === path; }).length / list.length;
assert(overlap(oldTrade, "rope") < LIMIT, `rope links are not the snapshot's trade list (${overlap(oldTrade, "rope").toFixed(2)})`);
assert(overlap(oldFriend, "bond") < LIMIT, `bond links are not the snapshot's friendship list (${overlap(oldFriend, "bond").toFixed(2)})`);
// 形状也不同：数值之间几乎不相关，不是旧值乘系数
function corr(xs, ys) {
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sx = 0;
  let sy = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sx += (x - mx) ** 2;
    sy += (ys[i] - my) ** 2;
  });
  return sxy / Math.sqrt(sx * sy);
}
const catchCorr = corr(ids.map((id) => own.tame[id]), ids.map((id) => oldCatch[id]));
const lvlCorr = corr(edges.map(([a, b]) => own.evoReq[a][b].lvl), edges.map(([a, b]) => oldReq[a]?.[b] ?? 0));
assert(Math.abs(catchCorr) < 0.4, `catch chance barely correlates with the snapshot (r=${catchCorr.toFixed(2)})`);
assert(Math.abs(lvlCorr) < 0.6, `evolution levels only share the obvious "later is higher" trend (r=${lvlCorr.toFixed(2)})`);
// 家族关系：只统计，等用户定；已改的 4 条不许改回去
const sameEdges = edges.filter(([a, b]) => oldEvo[a]?.includes(b)).length;
assert(sameEdges <= 91, `at most 91 family links equal the snapshot (${sameEdges}/${edges.length})`);
for (const [a, b] of [["p136", "p196"], ["p471", "p197"], ["p470", "p700"], ["p080", "p199"]]) assert(own.evo[a]?.includes(b), `relinked ${a}→${b}`);

// ---- 3) 快照与旧生成器不进构建、不进发布包 ----
for (const f of ["scripts/build-beast-data.mjs", "scripts/beast_rules.mjs"]) {
  assert(!/["'/]_srcdata|from\s+["'][^"']*_srcdata/.test(read(f).replace(/^\s*\/\/.*$/gm, "")), `${f} does not read the snapshot`);
}
assert(!existsSync(join(root, "scripts/build-beast-roster.mjs")), "the roster generator that read the snapshot is gone");
function* runtimeFiles(dir) {
  for (const e of readdirSync(join(root, dir))) {
    const rel = `${dir}/${e}`;
    if (statSync(join(root, rel)).isDirectory()) yield* runtimeFiles(rel);
    else if (/\.(js|html|css|webmanifest)$/.test(e)) yield rel;
  }
}
for (const f of ["index.html", "main.js", "app.js", "sw.js", ...runtimeFiles("modules"), ...runtimeFiles("data"), ...runtimeFiles("functions")]) {
  assert(!/_srcdata|beast_rules\.mjs["']/.test(read(f).replace(/\/\/[^\n]*/g, "")), `${f} does not reference the snapshot`);
}
{
  // 发布包按白名单拷出来：只有运行时文件，运行时要的一个不少
  const dir = mkdtempSync(join(tmpdir(), "mengling-stage-"));
  try {
    const files = stageRelease(join(dir, "out"));
    const bad = files.filter((f) => /^(scripts|docs|memory|migrations)\/|_srcdata|\.env|\.md$|\.sql$|\.toml$|beast_traits|beasts_zh|package/.test(f));
    assert(bad.length === 0, `release package holds runtime files only (${bad.slice(0, 5).join(", ")})`);
    const has = new Set(files);
    for (const f of ["index.html", "data/beasts.js", "functions/api/auth/delete.js", "legal/privacy.html", "assets/ui_icons/spiritOrb.webp"]) assert(has.has(f), `release package has ${f}`);
    for (const f of files.filter((x) => /^(app|main)\.js$|^(modules|functions)\/.*\.js$/.test(x))) {
      for (const m of read(f).matchAll(/(?:from|import)\s*\(?\s*["'`](\.{1,2}\/[^"'`?$]+)/g)) {
        const target = posix.normalize(posix.join(posix.dirname(f), m[1]));
        assert(has.has(target), `${f} imports ${m[1]}, which is in the package`);
      }
    }
    let refused = false;
    try {
      stageRelease(join(root, "out"));
    } catch {
      refused = true;
    }
    assert(refused, "never stages inside the project");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const deploy = read("deploy.ps1");
  assert(deploy.includes("stage-release.mjs") && deploy.indexOf("Push-Location $stage") < deploy.indexOf("pages deploy ."), "deploy.ps1 uploads the staged folder");
}
for (const f of [".assetsignore", ".wranglerignore"]) {
  const lines = read(f).split(/\r?\n/);
  assert(lines.includes("scripts/") && lines.includes("data/beast_traits.json"), `${f} keeps scripts/ and build inputs out of the package`);
}

// ---- 4) 规则自身站得住 ----
const fams = buildLineage(traits);
const total = (dex) => Object.values(own.stats[dex]).reduce((a, b) => a + b, 0);
for (let z = 0; z < ZONES_TOTAL - 1; z++) {
  const tiers = traits.filter((t) => t.hab === z).map((t) => own.tier[pidOf(t.dex)]);
  for (const k of ["common", "uncommon", "rare"]) assert(tiers.filter((x) => x === k).length >= (k === "rare" ? 1 : 2), `zone ${z} has ${k} species`);
}
const meadow = traits.filter((t) => t.hab === 0).map((t) => own.tier[pidOf(t.dex)]);
assert(meadow.filter((x) => x === "rare").length <= 4 && meadow.filter((x) => x === "common").length >= 7, "the first area is friendly to new players");
assert(traits.every((t) => (own.tier[pidOf(t.dex)] === "epic") === (t.hab === ZONES_TOTAL - 1)), "epic = sanctum natives");
const avgTame = (tier) => { const xs = ids.filter((id) => own.tier[id] === tier).map((id) => own.tame[id]); return xs.reduce((a, b) => a + b, 0) / xs.length; };
assert(avgTame("common") > avgTame("uncommon") && avgTame("uncommon") > avgTame("rare"), "rarer means harder to catch");
assert(ids.every((id) => own.tame[id] >= RULES.tame.min && own.tame[id] <= RULES.tame.max), "tame rates within bounds");
for (const [a, b] of edges) {
  const from = traits.find((t) => pidOf(t.dex) === a);
  const to = traits.find((t) => pidOf(t.dex) === b);
  assert(total(to.dex) > total(from.dex), `${a}→${b} gets stronger (${total(from.dex)} → ${total(to.dex)})`);
  const c = own.evoReq[a][b];
  assert(Number.isInteger(c.lvl) && c.lvl >= 5 && c.lvl <= RULES.growth.maxLvl, `${a}→${b} level ${c.lvl}`);
  assert((c.path === "bond") === c.aff > 0 && c.aff <= 40, `${a}→${b} affection ${c.aff}`);
  if (fams.get(from.dex).stage > 0) {
    const prev = Object.entries(own.evoReq).find(([, r]) => r[a]);
    const prevLvl = prev[1][a].path === "bond" ? prev[1][a].lvl / RULES.growth.bondLvlMul : prev[1][a].lvl;
    const lvl = c.path === "bond" ? c.lvl / RULES.growth.bondLvlMul : c.lvl;
    assert(lvl > prevLvl, `${a}→${b} needs more growth than the step before`);
  }
}
const paths = edges.reduce((m, [a, b]) => ({ ...m, [own.evoReq[a][b].path]: (m[own.evoReq[a][b].path] ?? 0) + 1 }), {});
assert(paths.stone >= 50 && paths.bond >= 10 && paths.rope >= 6 && paths.rope <= 16, `all three evolution paths are used (${JSON.stringify(paths)})`);

// ---- 5) 运行时：进化检查与存档迁移 ----
const { getEvoStatus, getEvoTargets, getEvoCondition, evoConditionText } = await import("../modules/evo_utils.js");
const { getBeastTier, getTameRate, higherTier, buildBeastList, beasts } = await import("../modules/beast_defs.js");
const { createMonInstance, evolveMon, getMonCurrentStats, monPower } = await import("../modules/mons.js");
const { createBeastDataClient } = await import("../modules/beast_data.js");
const { defaultState, serializeState, loadFromRaw } = await import("../modules/state.js");
const { cloneMonForNatalRebirth } = await import("../modules/systems/rebirth.js");
const { getBeastDataByDex } = createBeastDataClient();
const byPid = new Map(beasts.map((b) => [b.id, b]));
const res = (stone, rope) => ({ evolutionStone: { value: stone }, linkRope: { value: rope } });
{
  const stoneEdge = edges.find(([a, b]) => own.evoReq[a][b].path === "stone");
  const ropeEdge = edges.find(([a, b]) => own.evoReq[a][b].path === "rope");
  const bondEdge = edges.find(([a, b]) => own.evoReq[a][b].path === "bond");
  const c = getEvoCondition(...stoneEdge);
  const mon = { pid: stoneEdge[0], lvl: c.lvl, affection: 0 };
  assert(getEvoStatus(mon, stoneEdge[1], res(1, 0)).ok, "stone path: level + stone");
  assert(!getEvoStatus({ ...mon, lvl: c.lvl - 1 }, stoneEdge[1], res(1, 0)).ok, "stone path: one level short");
  assert(!getEvoStatus(mon, stoneEdge[1], res(0, 9)).ok, "stone path: rope does not replace the stone for new partners");
  const rc = getEvoCondition(...ropeEdge);
  assert(rc.rid === "linkRope" && getEvoStatus({ pid: ropeEdge[0], lvl: rc.lvl }, ropeEdge[1], res(0, 1)).ok && !getEvoStatus({ pid: ropeEdge[0], lvl: rc.lvl }, ropeEdge[1], res(1, 0)).ok, "rope path");
  const bc = getEvoCondition(...bondEdge);
  assert(bc.aff > 0 && getEvoStatus({ pid: bondEdge[0], lvl: bc.lvl, affection: bc.aff }, bondEdge[1], res(1, 0)).ok && !getEvoStatus({ pid: bondEdge[0], lvl: 100, affection: bc.aff - 1 }, bondEdge[1], res(1, 0)).ok, "bond path");
  assert(evoConditionText(getEvoStatus({ pid: bondEdge[0], lvl: 1 }, bondEdge[1], res(0, 0))).includes(`亲密度${bc.aff}+`), "bond text names the affection");
  // 老伙伴：只要任一份材料
  const vet = { pid: ropeEdge[0], lvl: 1, affection: 0, veteran: true };
  const st = getEvoStatus(vet, ropeEdge[1], res(1, 0));
  assert(st.ok && st.rid === "evolutionStone" && evoConditionText(st).includes("免门槛"), "veterans evolve with either material, no level or affection gate");
  assert(!getEvoStatus(vet, ropeEdge[1], res(0, 0)).ok, "veterans still pay one material");
  assert(getEvoTargets({ pid: "p133" }).length === 5 && getEvoTargets({ pid: "p133", veteran: true }).length === 8, "veterans keep the direct links that were rerouted");
  assert(getEvoTargets({ pid: "p079", veteran: true }).includes("p199") && !getEvoTargets({ pid: "p079" }).includes("p199"), "otter family rerouted, veterans keep the old way");
}
{
  // 0.7.59 的存档：没有 meta.numRules，mon.tier 是旧稀有度
  const st = defaultState();
  const mk = (pid, id, extra) => ({ ...createMonInstance(byPid.get(pid), { idFallback: id }), id, ...extra });
  const lower = ids.find((id) => own.tier[id] === "common" && fams.get(Number(id.slice(1))).role === "elder");
  const base = ids.find((id) => own.evo[id] && own.tier[id] !== "common");
  st.mons.list = [
    mk(lower, 1, { tier: "rare", lvl: 40 }), // 旧稀有 → 新常见
    mk(base, 2, { tier: "common", lvl: 5 }), // 旧常见 → 新少见 / 稀有
    mk("p133", 3, { tier: "common", lvl: 3, caughtWith: "luxuryball", buffs: { luckyEgg: 123456 } }),
    mk("p150", 4, { tier: "epic", lvl: 50 }),
    mk("p001", 5, { tier: "uncommon", lvl: 9, pid: "p999", dex: 999 }),
  ].filter(Boolean);
  const raw = JSON.parse(JSON.stringify(serializeState(st)));
  delete raw.meta.numRules;
  const loaded = loadFromRaw(JSON.stringify(raw));
  const m = Object.fromEntries(loaded.mons.list.map((x) => [x.id, x]));
  assert(loaded.mons.list.length === 5, "no partner lost");
  assert(m[1].tier === "rare" && m[1].veteran, "a captured rare partner stays rare");
  assert(m[2].tier === own.tier[base] && m[2].veteran, "a partner that becomes rarer is upgraded, and may evolve without the new gate");
  assert(m[3].veteran && m[3].caughtWith === "luxuryball" && m[3].buffs.luckyEgg === 123456, "ball and timed buff survive loading");
  assert(m[4].tier === "epic", "epic stays epic");
  assert(m[5].tier === "uncommon" && !m[5].veteran && !m[5].statKeep, "species outside the catalog are left alone");
  assert(loaded.meta.numRules === 1, "migration is recorded");
  // 旧版同等级同资质的属性总和不倒退（旧总和 = 稀有度底数 × 段数倍率）
  const OLD = { common: 300, uncommon: 340, rare: 395, epic: 470 };
  const STAGE = [0.62, 0.82, 1];
  for (const id of ids) {
    for (const tier of ["common", "uncommon", "rare"]) {
      const s2 = defaultState();
      s2.mons.list = [mk(id, 1, { tier })];
      const r2 = JSON.parse(JSON.stringify(serializeState(s2)));
      delete r2.meta.numRules;
      const x = loadFromRaw(r2).mons.list[0];
      const fam = fams.get(Number(id.slice(1)));
      const oldStage = ["p196", "p197", "p199", "p700"].includes(id) ? 1 : fam.stage;
      const want = OLD[tier] * (fam.links === 1 ? 1.05 : STAGE[oldStage]);
      const got = total(x.dex) * (x.statKeep ?? 1);
      if (got < want) assert(false, `${id} (${tier}) base total ${got.toFixed(0)} below the old ${want.toFixed(0)}`);
    }
  }
  // 再存再读：不重复发放、不丢
  {
    const { noteShinySpecies, syncShinyGalleryFromMons } = await import("../modules/systems/collection_fun.js");
    const g = loadFromRaw({ ...JSON.parse(JSON.stringify(raw)), dex: { caught: {}, shiny: { [lower]: { dex: Number(lower.slice(1)), name: "x", tier: "rare", at: 5 } } } });
    noteShinySpecies(g, { id: lower, dex: Number(lower.slice(1)), name: "x", tier: "common" });
    assert(g.dex.shiny[lower].tier === "rare", "a gallery entry never drops its rarity");
    g.dex.shiny[lower].at = 5;
    g.mons.list = [{ ...mk(lower, 1, {}), isShiny: true }];
    syncShinyGalleryFromMons(g);
    assert(g.dex.shiny[lower].at === 5 && g.dex.shiny[lower].tier === "rare", "opening the dex keeps the first-lit time");
  }
  const again = loadFromRaw(JSON.stringify(serializeState(loaded)));
  const a1 = again.mons.list.find((x) => x.id === 1);
  assert(a1.tier === "rare" && a1.veteran && a1.statKeep === m[1].statKeep, "veteran flags survive another save");
  const fresh = mk(lower, 9, {});
  again.mons.list.push(fresh);
  const third = loadFromRaw(JSON.stringify(serializeState(again)));
  const f9 = third.mons.list.find((x) => x.id === 9);
  assert(!f9.veteran && !f9.statKeep && f9.tier === "common", "partners caught after the change follow the new rules");
  // 老伙伴进化后不降稀有度、属性总和不降
  const evo = { ...m[2] };
  const before = monPower(evo, getBeastDataByDex);
  const tierBefore = evo.tier;
  assert(evolveMon(evo, own.evo[base][0], (pid) => byPid.get(pid)), "veteran evolves");
  assert(monPower(evo, getBeastDataByDex) >= before && higherTier(tierBefore, evo.tier) === evo.tier, "evolving a veteran never lowers power or rarity");
  // 转生保留本命伙伴的补偿
  const natal = cloneMonForNatalRebirth(m[1], 1);
  assert(natal.veteran && natal.statKeep === m[1].statKeep && natal.tier === "rare", "rebirth keeps the veteran's standing");
  // 图鉴与已进化形态原样保留
  raw.dex = { caught: { p196: 1, p199: 2, p003: 1 } };
  const dexLoaded = loadFromRaw(JSON.stringify(raw));
  assert(dexLoaded.dex.caught.p196 === 1 && dexLoaded.dex.caught.p199 === 2 && dexLoaded.dex.caught.p003 === 1, "dex entries untouched");
  // 数据文件没加载成功：不迁移也不记账，下次补
  const keepStats = globalThis.BEAST_STATS;
  globalThis.BEAST_STATS = undefined;
  const noData = loadFromRaw(JSON.stringify(raw));
  globalThis.BEAST_STATS = keepStats;
  assert(noData.meta.numRules === 0 && !noData.mons.list[0].veteran, "no migration without species data");
  assert(loadFromRaw(JSON.stringify(serializeState(noData))).mons.list[0].veteran, "migration happens on the next load");
  // 手改存档的异常值
  const bad = JSON.parse(JSON.stringify(serializeState(loaded)));
  bad.mons.list[0].statKeep = 99;
  bad.mons.list[1].statKeep = "x";
  const badLoaded = loadFromRaw(JSON.stringify(bad));
  assert(badLoaded.mons.list[0].statKeep <= 1.6 && badLoaded.mons.list[1].statKeep === undefined, "bogus statKeep is clamped or dropped");
}
assert(getTameRate(99999) === 20 && getBeastTier(99999) === "common" && buildBeastList().length === 160, "fallbacks for species outside the catalog");
assert(getMonCurrentStats({ dex: 1, lvl: 1, iv: {}, baseStats: own.stats[1], statKeep: 1.5 }, null).hp === own.stats[1].hp, "statKeep only lifts the species table, not stored base stats");

if (failed) {
  console.error(`own-numbers-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log(`own-numbers-selfcheck: OK（与快照一致率 ${Object.entries(report).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join("，")}；家族关系 ${sameEdges}/${edges.length} 待用户定）`);
