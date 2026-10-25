/**
 * 玩法闭环审计：引用完整性 + 获取可达性 + 用途闭环 + 进度可达性。
 * 输出分类报告；exit 0 不代表无发现（人工判断哪些是刻意设计）。
 * 运行：node --import tsx scripts/audit-closure.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CHECKIN_REWARDS, SHOP_STOCK_IDS } from "../backend/src/systems";
import { TASK_SHOP } from "../backend/src/tasks";
import { HOUSE_ROOMS } from "../backend/src/houses";
import { ABILITIES } from "../backend/src/abilities";
import { ACHIEVEMENTS } from "../backend/src/progression";

const pack = JSON.parse(readFileSync(resolve(__dirname, "../shared/enhanced_content_pack_chinese.json"), "utf8"));

const items = new Map<string, any>(pack.items.map((i: any) => [i.id, i]));
const actions = new Map<string, any>(pack.actions.map((a: any) => [a.id, a]));
const monsters = new Map<string, any>(pack.monsters.map((m: any) => [m.id, m]));
const skills = new Set<string>(pack.skills.map((s: any) => s.id));
const abilityIds = new Set<string>(ABILITIES.map((a: any) => a.id));
const LEVEL_CAP = 150;

const dangling: string[] = [];
const unobtainable: string[] = [];
const useless: string[] = [];
const progressIssues: string[] = [];

function need(map: Map<string, any>, id: string, from: string) {
  if (id && !map.has(id)) dangling.push(`${from}: 引用了不存在的 "${id}"`);
}

/* ---------- 1. 引用完整性 ---------- */
for (const a of pack.actions) {
  // act_combat_* 是容器记录：走 /combat/hp 逐场结算，skillId 是虚拟的 skill_combat
  if (!a.id.startsWith("act_combat_") && !skills.has(a.skillId)) dangling.push(`action ${a.id}: skillId "${a.skillId}" 不存在`);
  for (const y of a.yields || []) need(items, y.itemId, `action ${a.id}.yields`);
  for (const c of a.consumes || []) need(items, c.itemId, `action ${a.id}.consumes`);
}
for (const m of pack.monsters) for (const d of m.drops || []) need(items, d.itemId, `monster ${m.id}.drops`);
for (const s of pack.stages) for (const mid of s.monsters || []) need(monsters, mid, `stage ${s.id}.monsters`);
for (const t of pack.professionTrees) {
  const nodeIds = new Set(t.skillNodes.map((n: any) => n.id));
  for (const n of t.skillNodes) {
    for (const a of n.unlocks?.actions || []) need(actions, a, `node ${n.id}.unlocks`);
    for (const ab of n.unlocks?.abilities || []) {
      if (!abilityIds.has(ab)) dangling.push(`node ${n.id}.unlocks.abilities: "${ab}" 不存在`);
    }
    for (const p of n.requirements?.prerequisites || []) {
      if (!nodeIds.has(p)) dangling.push(`node ${n.id}: 前置节点 "${p}" 不在同一树`);
    }
  }
}
for (const set of pack.equipmentSets) {
  for (const pi of set.pieces || []) {
    const iid = typeof pi === "string" ? pi : pi?.itemId;
    need(items, iid, `set ${set.id}.pieces`);
    if (!iid) dangling.push(`set ${set.id}.pieces: 缺 itemId 字段: ${JSON.stringify(pi)}`);
  }
}
for (const r of pack.enhancementRules) for (const m of r.materials || []) need(items, m.itemId, `enhRule ${r.itemType}.materials`);
for (const r of CHECKIN_REWARDS) for (const id of Object.keys(r.items)) need(items, id, `checkin day${r.day}`);
for (const id of SHOP_STOCK_IDS) need(items, id, "SHOP_STOCK");
for (const t of TASK_SHOP) if (t.id.startsWith("charm_")) need(items, t.id, "TASK_SHOP");
for (const h of HOUSE_ROOMS) for (const m of h.materials) need(items, m, `house ${h.id}`);
for (const ab of ABILITIES) if ((ab as any).bookItemId) need(items, (ab as any).bookItemId, `ability ${ab.id}.book`);

/* ---------- 2. 获取可达性 ---------- */
const sources = new Set<string>();
for (const a of pack.actions) for (const y of a.yields || []) if ((y.chance ?? 1) > 0) sources.add(y.itemId);
for (const m of pack.monsters) for (const d of m.drops || []) if ((d.chance ?? 1) > 0) sources.add(d.itemId);
for (const id of SHOP_STOCK_IDS) sources.add(id);
for (const r of CHECKIN_REWARDS) for (const id of Object.keys(r.items)) sources.add(id);
for (const t of TASK_SHOP) if (t.id.startsWith("charm_")) sources.add(t.id);
for (const id of ["food_simple", "potion_hp_t1", "potion_mp_t1", "drink_basic"]) sources.add(id); // 大宝箱
for (const id of ["book_smash", "book_minor_heal", "book_brace"]) sources.add(id); // 礼物
sources.add("gold");

// 技能树解锁的动作也可能产出已收集物品 —— 上面已含全部 actions（含需解锁的）。
for (const it of pack.items) {
  if (!sources.has(it.id)) unobtainable.push(`${it.id} (${it.type}, ${it.name})`);
}

/* ---------- 3. 用途闭环 ---------- */
const consumed = new Set<string>();
for (const a of pack.actions) for (const c of a.consumes || []) consumed.add(c.itemId);
for (const r of pack.enhancementRules) for (const m of r.materials || []) consumed.add(m.itemId);
for (const h of HOUSE_ROOMS) for (const m of h.materials) consumed.add(m);
const bookItems = new Set(ABILITIES.map((a: any) => a.bookItemId).filter(Boolean));
const EQUIPPABLE = new Set(["weapon", "armor", "offhand", "accessory"]);
const USABLE = new Set(["food", "consumable"]);

for (const it of pack.items) {
  if (it.id === "gold" || it.type === "currency") continue;
  const obtainable = sources.has(it.id);
  const sinks: string[] = [];
  if (consumed.has(it.id)) sinks.push("consumed");
  if (EQUIPPABLE.has(it.type)) sinks.push("equip");
  if (USABLE.has(it.type)) sinks.push("usable");
  if (bookItems.has(it.id)) sinks.push("learnable");
  if ((it.value ?? 0) > 0) sinks.push("sellable");
  if (sinks.length === 0 && obtainable) useless.push(`${it.id} (${it.type}, ${it.name}) 可获取但无任何用途`);
  else if (sinks.length === 0) useless.push(`${it.id} (${it.type}, ${it.name}) 无用途且无获取途径`);
}

/* ---------- 4. 进度可达性 ---------- */
for (const a of pack.actions) {
  const lvl = a.requirements?.skillLevel || 1;
  if (lvl > LEVEL_CAP) progressIssues.push(`action ${a.id} 需求 lv${lvl} > 等级上限 ${LEVEL_CAP}`);
}
for (const t of pack.professionTrees) {
  for (const n of t.skillNodes) {
    const lvl = n.requirements?.level || 1;
    if (lvl > LEVEL_CAP) progressIssues.push(`node ${n.id} 需求 lv${lvl} > ${LEVEL_CAP}`);
  }
  // 每棵树的采集动作 lv1 起步（新职业能入场）
  const treeActions = new Set(t.skillNodes.flatMap((n: any) => n.unlocks?.actions || []));
  const lvl1 = [...treeActions].some((id) => (actions.get(id)?.requirements?.skillLevel ?? 1) <= 1);
  if (!lvl1) progressIssues.push(`profession ${t.professionId}: 无 lv1 可做的动作`);
}
for (const s of pack.stages) {
  const ms = (s.monsters || []).map((id: string) => monsters.get(id)).filter(Boolean);
  if (ms.length === 0) progressIssues.push(`stage ${s.id}: 无有效怪物`);
}
for (const a of ACHIEVEMENTS) {
  if (a.metric === "highestCombatLevel" && a.target > LEVEL_CAP + 5) progressIssues.push(`achievement ${a.id} 目标 lv${a.target} 超上限`);
}

/* ---------- 输出 ---------- */
console.log("=== 闭环审计 ===");
console.log(`引用完整性: ${dangling.length === 0 ? "全通过" : dangling.length + " 处悬空"}`);
for (const d of dangling) console.log("  ✗ " + d);
console.log(`获取可达性: ${unobtainable.length === 0 ? "全通过" : unobtainable.length + " 件物品无获取途径"}`);
for (const u of unobtainable) console.log("  ✗ " + u);
console.log(`用途闭环: ${useless.length === 0 ? "全通过" : useless.length + " 件物品无用途"}`);
for (const u of useless) console.log("  ✗ " + u);
console.log(`进度可达性: ${progressIssues.length === 0 ? "全通过" : progressIssues.length + " 个问题"}`);
for (const p of progressIssues) console.log("  ✗ " + p);
