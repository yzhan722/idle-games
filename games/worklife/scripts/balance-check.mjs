#!/usr/bin/env node
/**
 * 职业平衡审计 —— 把「职业间是否均衡」变成可量测、可门禁的数字。
 *
 * 用法:
 *   node scripts/balance-check.mjs           # 全量报告
 *   node scripts/balance-check.mjs --check   # 只判定阈值,失衡 exit 1(供 CI/测试调用)
 *
 * 度量面(每职业 = 其 skill_* 下的动作/装备/树):
 *   depth     动作数、技能树节点数、解锁动作数、等级跨度
 *   pacing    分段 xp/秒 (1-20 / 21-60 / 61+),取中位数
 *   gear      可造装备数(武器/护甲/饰品分列)
 *   endgame   终局套装(Lv≥60 内容包高 T 段)配方归属分布
 *   economy   跨职业依赖数(吃别家产出的边数)——依赖网密度
 *
 * 阈值(--check 判定):
 *   动作数/树节点: 每职业 ≥ max*0.5
 *   xp/s 分段中位数: 每职业 ≥ 全职业中位数*0.7
 *   可造装备总数: 每职业 ≥ 8
 *   终局套装归属: 单一职业 ≤ 70%
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pack = JSON.parse(readFileSync(path.join(root, "shared", "enhanced_content_pack_chinese.json"), "utf8"));

const CLASSES = (pack.classes || []).map((c) => c.id);
const skillOf = (a) => a.skillId || "";
const lvlOf = (a) => a.requirements?.skillLevel || 1;
const BANDS = [[1, 20], [21, 60], [61, 999]];
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const actions = pack.actions || [];
const trees = Object.fromEntries((pack.professionTrees || []).map((t) => [t.professionId, t.skillNodes || []]));
const items = new Map((pack.items || []).map((i) => [i.id, i]));

// 产出归属: itemId -> Set(skillId)
const producedBy = new Map();
for (const a of actions) for (const y of a.yields || []) {
  if (!producedBy.has(y.itemId)) producedBy.set(y.itemId, new Set());
  producedBy.get(y.itemId).add(skillOf(a));
}

const slotOf = (id) => /^(weapon|offhand|shield)_/.test(id) ? "weapon" : /^armor_/.test(id) ? "armor" : /^accessory_/.test(id) ? "acc" : null;
const itemLevel = (id) => items.get(id)?.level ?? items.get(id)?.requirements?.level ?? items.get(id)?.tier ?? null;

const PROF_SKILLS = {
  woodcutter: new Set(["skill_woodcutter", "skill_woodcutting", "skill_woodworking"]),
  blacksmith: new Set(["skill_blacksmith", "skill_mining", "skill_smithing"]),
  farmer: new Set(["skill_farmer", "skill_farming", "skill_husbandry"]),
  chef: new Set(["skill_chef", "skill_fishing", "skill_cooking"]),
  tailor: new Set(["skill_tailor", "skill_foraging", "skill_tailoring"]),
  alchemist: new Set(["skill_alchemist", "skill_crystal", "skill_alchemy"]),
};

const report = {};
for (const cls of CLASSES) {
  const sids = PROF_SKILLS[cls] || new Set([`skill_${cls}`]);
  const acts = actions.filter((a) => sids.has(skillOf(a)));
  const nodes = trees[cls] || [];
  const unlocks = nodes.reduce((n, x) => n + (x.unlocks?.actions || []).length, 0);
  const lvls = acts.map(lvlOf);
  const bands = BANDS.map(([lo, hi]) =>
    med(acts.filter((a) => { const l = lvlOf(a); return l >= lo && l <= hi && a.xp && a.duration; })
      .map((a) => a.xp / (a.duration / 1000))));
  const gear = { weapon: 0, armor: 0, acc: 0 };
  for (const a of acts) for (const y of a.yields || []) { const s = slotOf(y.itemId); if (s) gear[s]++; }
  const crossDeps = new Set();
  for (const a of acts) for (const c of a.consumes || []) {
    const src = producedBy.get(c.itemId);
    if (src) for (const s2 of src) if (!sids.has(s2)) crossDeps.add(s2);
  }
  report[cls] = {
    actions: acts.length,
    treeNodes: nodes.length,
    treeUnlocks: unlocks,
    lvlMax: lvls.length ? Math.max(...lvls) : 0,
    xpPerSec: bands.map((v) => +v.toFixed(2)),
    gear: { ...gear, total: gear.weapon + gear.armor + gear.acc },
    crossDeps: [...crossDeps],
  };
}

// 终局套装归属: 套装件由哪个技能产出(怪掉/未知记 'drop')
const setOwner = {};
for (const s of pack.equipmentSets || []) {
  const owners = new Set();
  for (const p of s.pieces || []) {
    const id = p.itemId || p;
    const src = producedBy.get(id);
    if (src) for (const s2 of src) owners.add(s2); else owners.add("drop");
  }
  setOwner[s.id] = [...owners].filter((o) => o !== "drop");
}
// 终局 = 套装含 tier≥8 部件(虚空 t8/炼狱 t10/创世 t11) 或 id 命名在高 T 段
const endgameSets = (pack.equipmentSets || []).filter((s) =>
  (s.pieces || []).some((p) => (items.get(p.itemId || p)?.tier ?? 0) >= 8 || (itemLevel(p.itemId || p) ?? 0) >= 60) || /void|genesis|omega|hell|magma|myth|celestial|rift|inferno|abyss|volcano/.test(s.id));

console.log("职业            动作  树节点 解锁  Lv上限  xp/s[低|中|高]   装备(武/甲/饰)  跨职业依赖");
console.log("-".repeat(108));
for (const cls of CLASSES) {
  const r = report[cls];
  console.log(
    cls.padEnd(16),
    String(r.actions).padStart(4),
    String(r.treeNodes).padStart(6),
    String(r.treeUnlocks).padStart(5),
    String(r.lvlMax).padStart(6),
    `  ${r.xpPerSec.join(" / ").padEnd(18)}`,
    `${r.gear.weapon}/${r.gear.armor}/${r.gear.acc} (${r.gear.total})`.padEnd(16),
    `${r.crossDeps.length} 家`,
  );
}
console.log("-".repeat(108));
console.log(`终局套装归属 (${endgameSets.length} 套):`);
const ownerCount = {};
for (const s of endgameSets) {
  console.log(`  ${s.id} ← ${(setOwner[s.id] || ["drop"]).join("+")}`);
  for (const o of setOwner[s.id] || ["drop"]) ownerCount[o] = (ownerCount[o] || 0) + 1;
}
console.log("  汇总:", JSON.stringify(ownerCount));

// ---------- 阈值判定 ----------
const fails = [];
const maxActs = Math.max(...CLASSES.map((c) => report[c].actions));
const maxNodes = Math.max(...CLASSES.map((c) => report[c].treeNodes));
const bandMeds = BANDS.map((_, i) => med(CLASSES.map((c) => report[c].xpPerSec[i]).filter((v) => v > 0)));
for (const cls of CLASSES) {
  const r = report[cls];
  if (r.actions < maxActs * 0.5) fails.push(`${cls}: 动作数 ${r.actions} < ${maxActs}*0.5`);
  if (r.treeNodes < maxNodes * 0.5) fails.push(`${cls}: 树节点 ${r.treeNodes} < ${maxNodes}*0.5`);
  r.xpPerSec.forEach((v, i) => {
    if (v > 0 && bandMeds[i] > 0 && v < bandMeds[i] * 0.7) fails.push(`${cls}: ${BANDS[i][0]}+ 段 xp/s ${v} < 中位数 ${bandMeds[i].toFixed(2)}*0.7`);
  });
  if (r.gear.total < 8) fails.push(`${cls}: 可造装备 ${r.gear.total} < 8`);
}
const topOwner = Object.entries(ownerCount).filter(([k]) => k !== "drop").sort((a, b) => b[1] - a[1])[0];
if (topOwner && endgameSets.length >= 3 && topOwner[1] / endgameSets.length > 0.7) {
  fails.push(`终局套装垄断: ${topOwner[0]} 占 ${topOwner[1]}/${endgameSets.length} (>70%)`);
}

console.log("-".repeat(108));
if (fails.length) {
  console.log(`失衡 ${fails.length} 项:`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  if (process.argv.includes("--check")) process.exit(1);
} else {
  console.log("✓ 全部阈值内 —— 职业均衡达标");
}
