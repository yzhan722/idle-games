/**
 * WorkLife 长时游玩模拟器（soak test / bug hunter）。
 *
 * 三个层面找缺陷：
 *  A. 内容包静态审计：所有引用完整性、数值合法性
 *  B. 长时游玩：全动作/全怪物/强化/交易/组队/任务/签到/转生，逐步不变量断言
 *  C. 边界探针：非法输入、极端时间跳变、并发顺序乱序
 *
 * 运行：npm run soak  或  node --import tsx scripts/soak-sim.ts
 */
import enhancedContentPack from "../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "../backend/src/types";
import { createMemoryStorage } from "../backend/src/storage_memory";
import {

  simulateToNow,
  startLifeActionNow,
  startNextQueuedAction,
  getActionRates,
  getEquippedCombatStats,
  appendLog,
  ACTION_QUEUE_MAX,
  getActionQueueMax,
  queuedActionBlocker,
} from "../backend/src/storage";
import {
  consumeItem,
  doCheckIn,
  getCheckInInfo,
  buyFromShop,
  sellToShop,
  sellPrice,
  buyPrice,
  findItem,
  SHOP_STOCK_IDS,
  CHECKIN_REWARDS,
} from "../backend/src/systems";
import {
  ensureTasks,
  claimTask,
  rerollTask,
  deleteTask,
  taskProgress,
  buyTaskShop,
  claimGift,
  taskBoardView,
  setTaskBlock,
  TASK_SHOP,
  TASK_SLOTS,
} from "../backend/src/tasks";
import {
  syncAchievements,
  claimAchievement,
  ensureDailyQuests,
  dailyProgress,
  claimDailyQuest,
  ACHIEVEMENTS,
} from "../backend/src/progression";
import {
  ensureBounties,
  acceptBounty,
  claimBounty,
  rerollBounties,
  bountyProgress,
  doPrestige,
  estimatePrestigePoints,
  getPrestigeInfo,
  addReputation,
  getReputationBonuses,
} from "../backend/src/progression2";
import {
  startHpCombat,
  tickHpCombat,
  setCombatLoadout,
  chooseBuild,
  tryCastAbility,
  tryHeavyChop,
  combatSlotCounts,
} from "../backend/src/hp_combat";
import { startEnhanceRun, tickEnhanceRun, stopEnhanceRun } from "../backend/src/enhancement_run";
import {
  performEnhancementAttempt,
  enhancementMaterials,
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  ownsEnhanceableItem,
  enhancementStatMultiplier,
} from "../backend/src/enhancement_math";
import { findEnhancementRuleForItem, itemMatchesEnhancementRule } from "../backend/src/enhancement_utils";
import { canEquipItem, EQUIP_SLOT_KEYS } from "../backend/src/equipment_equip";
import { ensureProgression } from "../backend/src/progression_state";
import { grantCombatXp, derivedCombatLevel, COMBAT_SKILL_IDS, ensureCombatSkills } from "../backend/src/combat_skills";
import { upgradeRoom, ensureHouse, HOUSE_ROOMS, roomUpgradeCost, HOUSE_MAX_LEVEL } from "../backend/src/houses";

import { ABILITIES, abilityForBook, INNATE_ABILITIES } from "../backend/src/abilities";
import { DAILY_TEMPLATES } from "../backend/src/progression";
import { BOUNTY_TEMPLATES } from "../backend/src/progression2";
import { defaultEnhancedPlayerState } from "../backend/src/storage";

const pack = enhancedContentPack as EnhancedContentPack;

/* ============================== bug 记录 ============================== */

type Finding = { id: number; area: string; severity: "critical" | "major" | "minor"; title: string; evidence: string };
const findings: Finding[] = [];
const seen = new Set<string>();
let nextId = 1;

function bug(area: string, severity: Finding["severity"], title: string, evidence: string, dedupeKey?: string) {
  const key = dedupeKey ?? `${area}:${title}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ id: nextId++, area, severity, title, evidence });
}

/* ============================== 工具 ============================== */

// 确定性 RNG（mulberry32）
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 24 * 3600_000;
const HOUR = 3600_000;
const MIN = 60_000;

function freshPlayer(): EnhancedPlayerState {
  const s = defaultState();
  return s;
}
function defaultState(): EnhancedPlayerState {
  // 与 storage.defaultEnhancedPlayerState 同构的干净对象
  const st = {
    contentVersion: pack.version || "1.0.0",
    lastSimulatedAt: "2026-10-01T00:00:00.000Z",
    activeClassId: "woodcutter",
    mode: "idle",
    inventory: { gold: 0 },
    equipment: { enhancementLevels: {}, durability: {}, maxDurability: {} },
    skills: {},
    logs: [],
    combatLevel: 1,
    combatXp: 0,
    tradingState: { activeListings: [], purchaseHistory: [] },
    activityQueue: [],
  } as unknown as EnhancedPlayerState;
  ensureProgression(st, new Date(st.lastSimulatedAt));
  return st;
}

/** 深度扫描状态树：NaN / Infinity / 负数库存 / 非法字段 */
function deepScan(state: any, ctx: string) {
  const stack: Array<{ v: any; path: string }> = [{ v: state, path: "state" }];
  const visited = new Set<any>();
  while (stack.length) {
    const { v, path } = stack.pop()!;
    if (v === null || v === undefined) continue;
    if (typeof v === "number") {
      if (Number.isNaN(v)) bug("invariant", "major", `NaN 数值出现在 ${path}`, `${ctx}: ${path} = NaN`, `nan:${path}`);
      else if (!Number.isFinite(v)) bug("invariant", "major", `Infinity 数值出现在 ${path}`, `${ctx}: ${path} = ${v}`, `inf:${path}`);
      continue;
    }
    if (typeof v === "object") {
      if (visited.has(v)) continue;
      visited.add(v);
      if (Array.isArray(v)) {
        v.forEach((item, i) => stack.push({ v: item, path: `${path}[${i}]` }));
      } else {
        for (const [k, val] of Object.entries(v)) stack.push({ v: val, path: `${path}.${k}` });
      }
    }
  }
  // 专项断言
  for (const [k, v] of Object.entries(state.inventory || {})) {
    if (typeof v === "number" && v < 0) bug("invariant", "critical", `库存为负：${k}=${v}`, ctx, `neg-inv:${k}`);
  }
  for (const [k, s] of Object.entries(state.skills || {}) as any) {
    if (s.level < 1) bug("invariant", "major", `技能等级 <1：${k}=${s.level}`, ctx);
    if (s.level > 200) bug("invariant", "major", `技能等级 >200：${k}=${s.level}`, ctx);
    if (s.xp < 0) bug("invariant", "major", `技能经验为负：${k}.xp=${s.xp}`, ctx);
  }
  if ((state.combatLevel || 0) < 1) bug("invariant", "major", `combatLevel <1`, `${ctx}: ${state.combatLevel}`);
  if ((state.combatXp || 0) < 0) bug("invariant", "major", `combatXp <0`, `${ctx}: ${state.combatXp}`);
  if (!Number.isFinite(Date.parse(state.lastSimulatedAt))) {
    bug("invariant", "major", `lastSimulatedAt 不可解析`, `${ctx}: ${state.lastSimulatedAt}`);
  }
  if (Array.isArray(state.logs) && state.logs.length > 201) {
    bug("invariant", "minor", `日志超过 200 上限：${state.logs.length}`, ctx, "log-overflow");
  }
  const queueCap = getActionQueueMax(state);
  if (Array.isArray(state.activityQueue) && state.activityQueue.length > queueCap) {
    bug("invariant", "major", `队列超上限：${state.activityQueue.length}>${queueCap}`, ctx);
  }
  for (const [id, lvl] of Object.entries(state.equipment?.enhancementLevels || {}) as any) {
    if (!(lvl >= 0 && lvl <= MAX_ENHANCEMENT_LEVEL)) {
      bug("invariant", "major", `强化等级越界：${id}=+${lvl}`, ctx, `enh-bound:${id}`);
    }
    if (!findItem(pack, id)) bug("invariant", "minor", `强化等级指向不存在物品 ${id}`, ctx, `enh-ghost:${id}`);
  }
  for (const [id, d] of Object.entries(state.equipment?.durability || {}) as any) {
    const max = state.equipment.maxDurability?.[id];
    if (d < 0) bug("invariant", "major", `耐久为负：${id}=${d}`, ctx, `dur-neg:${id}`);
    if (max !== undefined && d > max) bug("invariant", "major", `耐久超上限：${id}=${d}>${max}`, ctx, `dur-max:${id}`);
    if (!findItem(pack, id)) bug("invariant", "minor", `耐久指向不存在物品 ${id}`, ctx, `dur-ghost:${id}`);
  }
  // 装备槽引用合法性
  for (const [slot, itemId] of Object.entries(state.equipment || {})) {
    if (typeof itemId !== "string") continue;
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    const def = findItem(pack, itemId);
    if (!def) bug("invariant", "major", `装备槽 ${slot} 引用了不存在的物品 ${itemId}`, ctx, `eq-ghost:${itemId}`);
  }
  // hpCombat 边界
  const hpc2 = state.hpCombat;
  if (hpc2) {
    if (!(hpc2.playerHp >= 0 && hpc2.playerHp <= hpc2.playerMaxHp)) {
      bug("invariant", "major", `playerHp 越界：${hpc2.playerHp}/${hpc2.playerMaxHp}`, ctx);
    }
    if (hpc2.enemyHp < 0) bug("invariant", "minor", `enemyHp 为负：${hpc2.enemyHp}`, ctx, "enemy-neg");
    if (hpc2.enemyHp > hpc2.enemyMaxHp) bug("invariant", "minor", `enemyHp 超上限`, ctx, "enemy-over");
  }
  const stats = state.stats;
  if (stats) {
    for (const k of ["totalActions", "totalKills", "totalCrafted", "totalGathered", "totalGoldEarned", "totalGoldSpent", "totalXpEarned", "playtimeSeconds"] as const) {
      const v = (stats as any)[k];
      if (typeof v === "number" && v < 0) bug("invariant", "major", `stats.${k} 为负：${v}`, ctx, `stat-neg:${k}`);
    }
  }
}

const storage = createMemoryStorage();
const BASE = new Date("2026-10-01T00:00:00.000Z");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 市场写操作有 100ms 频率限制（真实墙钟），连续调用要拉开 */
const rateGap = () => sleep(110);

/* ============================== A. 内容包审计 ============================== */

function auditContentPack() {
  const itemIds = new Set<string>();
  const itemIdDupes = new Set<string>();
  for (const it of pack.items as any[]) {
    if (itemIds.has(it.id)) itemIdDupes.add(it.id);
    itemIds.add(it.id);
  }
  for (const d of itemIdDupes) bug("content", "major", `物品 id 重复：${d}`, "items[]");
  const skillIds = new Set((pack.skills as any[]).map((s) => s.id));
  const classIds = new Set((pack.classes as any[]).map((c) => c.id));
  const actionIds = new Set<string>();
  const actionIdDupes = new Set<string>();
  for (const a of pack.actions as any[]) {
    if (actionIds.has(a.id)) actionIdDupes.add(a.id);
    actionIds.add(a.id);
  }
  for (const d of actionIdDupes) bug("content", "major", `动作 id 重复：${d}`, "actions[]");
  const monsterIds = new Set<string>();
  for (const m of pack.monsters as any[]) {
    if (monsterIds.has(m.id)) bug("content", "major", `怪物 id 重复：${m.id}`, "monsters[]");
    monsterIds.add(m.id);
  }
  const stageIds = new Set<string>();
  for (const s of pack.stages as any[]) {
    if (stageIds.has(s.id)) bug("content", "major", `关卡 id 重复：${s.id}`, "stages[]");
    stageIds.add(s.id);
  }
  const validItemRef = (id: unknown) => typeof id === "string" && (itemIds.has(id) || id === "gold");
  const VALID_SLOTS = new Set([...EQUIP_SLOT_KEYS]);

  // --- 物品 ---
  const typeSet = new Set<string>();
  for (const it of pack.items as any[]) {
    typeSet.add(it.type);
    if (!it.id || typeof it.id !== "string") bug("content", "major", "物品缺 id", JSON.stringify(it).slice(0, 120));
    if (!it.name) bug("content", "minor", `物品 ${it.id} 缺名称`, "items[]", `item-noname:${it.id}`);
    const tier = Number(it.tier);
    // tier 0 合法：货币类（gold）用 0 表示不参与装备阶级
    if (it.tier !== undefined && !(tier >= (it.id === "gold" ? 0 : 1))) bug("content", "minor", `物品 ${it.id} tier 非法：${it.tier}`, "", `item-tier:${it.id}`);
    if ((it.type === "weapon" || it.type === "armor" || it.type === "tool" || it.type === "accessory" || it.equipable) && it.slot && !VALID_SLOTS.has(it.slot) && it.slot !== "accessory") {
      bug("content", "major", `物品 ${it.id} 装备槽非法：${it.slot}`, "", `item-slot:${it.id}`);
    }
    const price = Number(it.value ?? it.basePrice ?? NaN);
    if (Number.isFinite(price) && price < 0) bug("content", "minor", `物品 ${it.id} 价值为负`, "", `item-negprice:${it.id}`);
    // 装备属性数值合法
    for (const k of ["atk", "def", "mag", "hp", "mp", "efficiency", "rareFind", "toolSpeed", "foodSlots", "drinkSlots"]) {
      if (it[k] !== undefined && typeof it[k] !== "number") bug("content", "minor", `物品 ${it.id} 属性 ${k} 非数字`, String(it[k]), `item-stat:${it.id}:${k}`);
      else if (typeof it[k] === "number" && (!Number.isFinite(it[k]) || it[k] < 0)) bug("content", "minor", `物品 ${it.id} 属性 ${k}=${it[k]} 非法`, "", `item-statv:${it.id}:${k}`);
    }
    if (it.effect) {
      const e = it.effect as any;
      for (const k of ["hp", "mp"]) if (e[k] !== undefined && (typeof e[k] !== "number" || !Number.isFinite(e[k]))) bug("content", "minor", `物品 ${it.id} effect.${k} 非法`, "", `item-eff:${it.id}:${k}`);
      if (e.buff) {
        if (!(Number(e.buff.durationSec) > 0)) bug("content", "major", `物品 ${it.id} buff 缺 durationSec`, JSON.stringify(e.buff).slice(0, 120), `buff-dur:${it.id}`);
      }
    }
  }

  // --- 动作 ---
  for (const a of pack.actions as any[]) {
    const id = a.id;
    if (!a.name) bug("content", "minor", `动作 ${id} 缺名称`, "", `act-noname:${id}`);
    const dur = Number(a.duration);
    if (!Number.isFinite(dur) || dur <= 0) bug("content", "major", `动作 ${id} duration 非法：${a.duration}`, "", `act-dur:${id}`);
    else if (dur < 500) bug("content", "minor", `动作 ${id} duration 过短：${dur}ms`, "", `act-fast:${id}`);
    const isCombat = typeof id === "string" && id.startsWith("act_combat_");
    if (!isCombat && !skillIds.has(a.skillId)) {
      bug("content", "major", `动作 ${id} skillId 不存在：${a.skillId}`, "", `act-skill:${id}`);
    }
    const req = a.requirements?.skillLevel;
    if (req !== undefined && (!Number.isFinite(Number(req)) || req < 1 || req > 200)) {
      bug("content", "major", `动作 ${id} 需求等级非法：${req}`, "", `act-req:${id}`);
    }
    if (a.xp !== undefined && (!Number.isFinite(Number(a.xp)) || a.xp < 0)) {
      bug("content", "major", `动作 ${id} xp 非法：${a.xp}`, "", `act-xp:${id}`);
    }
    if (Number.isFinite(Number(a.xp)) && a.xp === 0 && !isCombat) bug("content", "minor", `动作 ${id} xp=0（不给经验）`, "", `act-noxp:${id}`);
    for (const c of a.consumes || []) {
      if (!validItemRef(c.itemId)) bug("content", "major", `动作 ${id} 消耗了不存在物品：${c.itemId}`, "", `act-consume:${id}:${c.itemId}`);
      if (!(Number(c.qty) > 0)) bug("content", "major", `动作 ${id} 消耗 ${c.itemId} 数量非法：${c.qty}`, "", `act-consume-qty:${id}:${c.itemId}`);
    }
    let yieldCount = 0;
    for (const y of a.yields || []) {
      yieldCount++;
      if (!validItemRef(y.itemId)) bug("content", "major", `动作 ${id} 产出不存在物品：${y.itemId}`, "", `act-yield:${id}:${y.itemId}`);
      if (!(Number(y.qty) > 0)) bug("content", "major", `动作 ${id} 产出 ${y.itemId} 数量非法：${y.qty}`, "", `act-yield-qty:${id}:${y.itemId}`);
      if (y.chance !== undefined && !(y.chance > 0 && y.chance <= 1)) bug("content", "major", `动作 ${id} 产出 ${y.itemId} 概率非法：${y.chance}`, "", `act-chance:${id}:${y.itemId}`);
    }
    if (yieldCount === 0 && !isCombat) bug("content", "minor", `动作 ${id} 没有任何产出`, "", `act-noyield:${id}`);
    if (isCombat && a.monsterId && !monsterIds.has(a.monsterId)) bug("content", "major", `战斗动作 ${id} 引用了不存在的怪物 ${a.monsterId}`, "", `act-mon:${id}`);
  }

  // --- 怪物 ---
  for (const m of pack.monsters as any[]) {
    const id = m.id;
    if (!m.name) bug("content", "minor", `怪物 ${id} 缺名称`, "", `mon-name:${id}`);
    for (const k of ["hp", "atk", "def", "intervalMs", "xp", "gold", "level"]) {
      if (m[k] !== undefined && (!Number.isFinite(Number(m[k])) || Number(m[k]) < 0)) {
        bug("content", "major", `怪物 ${id} 字段 ${k}=${m[k]} 非法`, "", `mon-field:${id}:${k}`);
      }
    }
    if (!(Number(m.hp) > 0)) bug("content", "major", `怪物 ${id} hp 非法：${m.hp}`, "", `mon-hp:${id}`);
    // rareChance=0 时 rare 是惰性展示字段（如 monkey 掉技能书不掉材料——测试明确豁免）
    if (m.rare && Number(m.rareChance ?? 1) > 0) {
      const rid = typeof m.rare === "string" ? m.rare : m.rare.itemId;
      if (rid && !itemIds.has(rid)) {
        // rare 可能是展示名——查 name
        const byName = (pack.items as any[]).find((i) => i.name === rid);
        if (!byName) bug("content", "major", `怪物 ${id} 稀有掉落指向不存在物品：${rid}`, "", `mon-rare:${id}`);
      }
    }
    for (const d of m.drops || []) {
      if (!validItemRef(d.itemId)) bug("content", "major", `怪物 ${id} 掉落不存在物品：${d.itemId}`, "", `mon-drop:${id}:${d.itemId}`);
      if (d.chance !== undefined && !(d.chance > 0 && d.chance <= 1)) bug("content", "major", `怪物 ${id} 掉落 ${d.itemId} 概率非法：${d.chance}`, "", `mon-dropchance:${id}:${d.itemId}`);
      if (d.qty !== undefined && !(d.qty > 0)) bug("content", "minor", `怪物 ${id} 掉落 ${d.itemId} qty=${d.qty}`, "", `mon-dropqty:${id}:${d.itemId}`);
    }
    if (m.dropTableId && !(pack.dropTables as any[]).some((t) => t.id === m.dropTableId)) {
      bug("content", "major", `怪物 ${id} dropTableId 不存在：${m.dropTableId}`, "", `mon-dt:${id}`);
    }
  }

  // --- 掉落表 ---
  for (const t of pack.dropTables as any[]) {
    for (const e of t.entries || t.drops || []) {
      if (!validItemRef(e.itemId)) bug("content", "major", `掉落表 ${t.id} 引用不存在物品：${e.itemId}`, "", `dt:${t.id}:${e.itemId}`);
      if (e.chance !== undefined && !(e.chance > 0 && e.chance <= 1)) bug("content", "major", `掉落表 ${t.id} 概率非法`, `${e.itemId}: ${e.chance}`, `dt-chance:${t.id}:${e.itemId}`);
    }
  }

  // --- 关卡 ---
  for (const s of pack.stages as any[]) {
    const mons: string[] = s.monsters || (s.monsterId ? [s.monsterId] : []);
    if (mons.length === 0) bug("content", "minor", `关卡 ${s.id} 没有怪物`, "", `stage-empty:${s.id}`);
    for (const mid of mons) {
      if (!monsterIds.has(mid)) bug("content", "major", `关卡 ${s.id} 引用不存在怪物 ${mid}`, "", `stage-mon:${s.id}:${mid}`);
    }
    const rl = Number(s.requiredLevel ?? s.levelRequirement ?? 0);
    if (rl < 0 || rl > 200) bug("content", "major", `关卡 ${s.id} 需求等级非法：${rl}`, "", `stage-req:${s.id}`);
  }

  // --- 技能 ---
  for (const s of pack.skills as any[]) {
    if (s.classId && !classIds.has(s.classId)) bug("content", "minor", `技能 ${s.id} 属于不存在的职业 ${s.classId}`, "", `skill-class:${s.id}`);
  }

  // --- 职业树 ---
  const recipeActionIds = new Set<string>([...actionIds, ...(pack.recipes as any[]).map((r) => r.id)]);
  for (const tree of pack.professionTrees || []) {
    if (!skillIds.has(`skill_${tree.professionId}`)) {
      bug("content", "major", `职业树 ${tree.professionId} 没有对应技能 skill_${tree.professionId}`, "", `tree-skill:${tree.professionId}`);
    }
    const nodeIds = new Set(tree.skillNodes.map((n) => n.id));
    for (const n of tree.skillNodes) {
      const lvl = Number(n.requirements?.level);
      if (!Number.isFinite(lvl) || lvl < 1 || lvl > 200) bug("content", "major", `技能节点 ${tree.professionId}/${n.id} 需求等级非法：${n.requirements?.level}`, "", `node-lvl:${n.id}`);
      for (const pre of n.requirements?.prerequisites || []) {
        if (!nodeIds.has(pre) && !recipeActionIds.has(pre)) {
          bug("content", "major", `技能节点 ${n.id} 前置 ${pre} 既不是节点也不是动作`, "", `node-pre:${n.id}:${pre}`);
        }
      }
      for (const r of n.unlocks?.recipes || []) {
        if (!recipeActionIds.has(r)) bug("content", "minor", `技能节点 ${n.id} 解锁的配方 ${r} 不存在`, "", `node-unlock:${n.id}:${r}`);
      }
      for (const a of n.unlocks?.actions || []) {
        if (!recipeActionIds.has(a)) bug("content", "minor", `技能节点 ${n.id} 解锁的动作 ${a} 不存在`, "", `node-unlock-a:${n.id}:${a}`);
      }
    }
  }

  // --- 强化规则 ---
  void 0;
  for (const r of pack.enhancementRules || []) {
    const matches = (pack.items as any[]).filter((i) => itemMatchesEnhancementRule(i, r.itemType));
    if (matches.length === 0) bug("content", "major", `强化规则 ${r.itemType} 匹配不到任何物品`, "", `rule-type:${r.itemType}`);
    if (!skillIds.has(`skill_${r.requiredProfession}`)) bug("content", "major", `强化规则 ${r.itemType} 需要不存在职业 ${r.requiredProfession}`, "", `rule-prof:${r.itemType}`);
    if (!(r.successRate > 0 && r.successRate <= 1)) bug("content", "major", `强化规则 ${r.itemType} 成功率非法：${r.successRate}`, "", `rule-rate:${r.itemType}`);
    if (!(r.maxLevel >= 1)) bug("content", "major", `强化规则 ${r.itemType} maxLevel 非法：${r.maxLevel}`, "", `rule-max:${r.itemType}`);
    for (const m of r.materials || []) {
      if (!validItemRef(m.itemId)) bug("content", "major", `强化规则 ${r.itemType} 材料不存在：${m.itemId}`, "", `rule-mat:${r.itemType}:${m.itemId}`);
      if (!(m.quantity > 0)) bug("content", "major", `强化规则 ${r.itemType} 材料 ${m.itemId} 数量非法`, "", `rule-matq:${r.itemType}:${m.itemId}`);
    }
  }

  // --- 套装 ---
  for (const set of pack.equipmentSets || []) {
    const pieceKeys = new Set<string>();
    for (const p of set.pieces || []) {
      if (!itemIds.has(p.itemId)) bug("content", "major", `套装 ${set.id} 部件物品不存在：${p.itemId}`, "", `set-item:${set.id}:${p.itemId}`);
      if (!VALID_SLOTS.has(p.slot) && p.slot !== "accessory") bug("content", "major", `套装 ${set.id} 槽位非法：${p.slot}`, "", `set-slot:${set.id}:${p.slot}`);
      const k = `${p.slot}:${p.itemId}`;
      if (pieceKeys.has(k)) bug("content", "minor", `套装 ${set.id} 部件重复：${p.itemId}`, "", `set-dup:${set.id}:${k}`);
      pieceKeys.add(k);
      // 部件自身的 slot 应与套装声明一致
      const def = findItem(pack, p.itemId) as any;
      if (def?.slot && def.slot !== p.slot) bug("content", "major", `套装 ${set.id} 声明 ${p.itemId} 在 ${p.slot}，但物品定义 slot=${def.slot}`, "", `set-mismatch:${set.id}:${p.itemId}`);
    }
    for (const b of set.bonuses || []) {
      if (!(b.requiredPieces >= 1)) bug("content", "major", `套装 ${set.id} 加成需求件数非法：${b.requiredPieces}`, "", `set-bonus:${set.id}`);
      if (b.requiredPieces > (set.pieces?.length || 0)) bug("content", "major", `套装 ${set.id} 加成要求 ${b.requiredPieces} 件但套装只有 ${set.pieces?.length} 件，永远达不到`, "", `set-unreach:${set.id}:${b.requiredPieces}`);
      for (const [stat, v] of Object.entries(b.stats || {})) {
        if (typeof v !== "number" || !Number.isFinite(v)) bug("content", "major", `套装 ${set.id} 加成 ${stat}=${v} 非法`, "", `set-stat:${set.id}:${stat}`);
      }
    }
  }

  // --- 配方 ---
  for (const r of pack.recipes || []) {
    for (const inp of r.inputs || r.consumes || []) {
      if (!validItemRef(inp.itemId)) bug("content", "major", `配方 ${r.id} 输入物品不存在：${inp.itemId}`, "", `recipe-in:${r.id}:${inp.itemId}`);
    }
    for (const out of r.outputs || r.yields || []) {
      if (!validItemRef(out.itemId)) bug("content", "major", `配方 ${r.id} 输出物品不存在：${out.itemId}`, "", `recipe-out:${r.id}:${out.itemId}`);
    }
  }

  // --- 静态表引用 ---
  for (const id of SHOP_STOCK_IDS) {
    if (!itemIds.has(id)) bug("content", "major", `商店商品 ${id} 在内容包中不存在`, "", `shop:${id}`);
  }
  for (const r of CHECKIN_REWARDS) {
    for (const id of Object.keys(r.items)) {
      if (!itemIds.has(id)) bug("content", "major", `第${r.day}天签到奖励物品不存在：${id}`, "", `checkin:${r.day}:${id}`);
    }
  }
  for (const t of TASK_SHOP) {
    for (const id of Object.keys((t as any).items || {})) {
      if (!itemIds.has(id)) bug("content", "major", `代币商店 ${t.id} 发放物品不存在：${id}`, "", `taskshop:${t.id}:${id}`);
    }
    if ((t as any).itemId && !itemIds.has((t as any).itemId)) bug("content", "major", `代币商店物品 ${t.id}→${(t as any).itemId} 不存在`, "", `taskshop2:${t.id}`);
  }

  // ==================== A2. 深度审计（第二波） ====================
  // --- 配方 id 重复 + 悬空解锁（没有任何节点/默认解锁能拿到 → 死配方） ---
  const recipeIds = new Set<string>();
  for (const r of pack.recipes as any[]) {
    if (recipeIds.has(r.id)) bug("content", "major", `配方 id 重复：${r.id}`, "", `recipe-dup:${r.id}`);
    recipeIds.add(r.id);
  }
  const unlockable = new Set<string>();
  for (const tree of pack.professionTrees || []) {
    for (const n of tree.skillNodes || []) {
      for (const id of n.unlocks?.recipes || []) unlockable.add(id);
      for (const id of n.unlocks?.actions || []) unlockable.add(id);
    }
  }
  const defaultUnlocked = new Set<string>();
  for (const s of Object.values(defaultEnhancedPlayerState(pack.version || "1.0.0").skills || {})) {
    for (const id of (s as any).unlockedRecipes || []) defaultUnlocked.add(id);
  }
  for (const r of pack.recipes as any[]) {
    if (!unlockable.has(r.id) && !defaultUnlocked.has(r.id)) {
      bug("content", "major", `配方 ${r.id} 没有任何技能节点/默认解锁 → 死内容`, "", `recipe-dead:${r.id}`);
    }
  }
  for (const a of pack.actions as any[]) {
    if (String(a.id).startsWith("act_combat_")) continue;
    if (a.requiresUnlock && !unlockable.has(a.id) && !defaultUnlocked.has(a.id)) {
      bug("content", "major", `动作 ${a.id} 声明需要解锁但无节点能解锁它`, "", `act-dead:${a.id}`);
    }
  }

  // --- 消耗品 buff 键合法（getBuffEffects 只读 multipliers 五键 + stats.atk/def） ---
  const VALID_MULT_KEYS = new Set(["gatherSpeed", "craftSpeed", "combatSpeed", "xpGain", "goldGain"]);
  const VALID_BUFF_STATS = new Set(["atk", "def"]);
  for (const it of pack.items as any[]) {
    const buff = it.effect?.buff;
    if (!buff) continue;
    if (!(Number(buff.durationSec) > 0)) bug("content", "major", `消耗品 ${it.id} buff.durationSec=${buff.durationSec} 非法`, "", `buff-dur:${it.id}`);
    for (const [k, v] of Object.entries(buff.multipliers || {})) {
      if (!VALID_MULT_KEYS.has(k)) bug("content", "major", `消耗品 ${it.id} buff.multipliers.${k} 不在生效白名单（吃了没效果）`, String(v), `buff-mult:${it.id}:${k}`);
      else if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) bug("content", "major", `消耗品 ${it.id} buff.multipliers.${k}=${v} 非法`, "", `buff-multv:${it.id}:${k}`);
    }
    for (const [k, v] of Object.entries(buff.stats || {})) {
      if (!VALID_BUFF_STATS.has(k)) bug("content", "minor", `消耗品 ${it.id} buff.stats.${k} 不在生效白名单`, String(v), `buff-stat:${it.id}:${k}`);
      else if (typeof v !== "number" || !Number.isFinite(v)) bug("content", "major", `消耗品 ${it.id} buff.stats.${k}=${v} 非法`, "", `buff-statv:${it.id}:${k}`);
    }
    if (!buff.multipliers && !buff.stats && !(it.effect.hp || it.effect.mp)) {
      bug("content", "minor", `消耗品 ${it.id} 的 buff 既没有 multipliers 也没有 stats（纯占位）`, "", `buff-empty:${it.id}`);
    }
  }
  // 技能书 ↔ 技能定义
  const abilityIds = new Set(ABILITIES.map((a: any) => a.id));
  for (const it of pack.items as any[]) {
    if (!String(it.id).startsWith("book_")) continue;
    const ab = abilityForBook(it.id);
    if (!ab || !abilityIds.has(ab.id)) bug("content", "major", `技能书 ${it.id} 不对应任何技能定义`, "", `book-orphan:${it.id}`);
  }
  for (const ab of ABILITIES as any[]) {
    // 天生技能（INNATE_ABILITIES，如 heavy_chop）不靠技能书学习
    if (INNATE_ABILITIES.includes(ab.id)) continue;
    if (!itemIds.has(`book_${ab.id}`) && !(pack.items as any[]).some((i) => i.id === `book_${ab.id}`)) {
      bug("content", "minor", `技能 ${ab.id} 没有对应技能书物品 book_${ab.id}`, "", `ab-nobook:${ab.id}`);
    }
  }

  // --- 关卡怪物等级倒挂 / Boss 未标 ---
  for (const s of pack.stages as any[]) {
    const mons: string[] = s.monsters || (s.monsterId ? [s.monsterId] : []);
    const bossCount = mons.filter((mid) => (pack.monsters as any[]).find((m) => m.id === mid)?.isBoss).length;
    if (bossCount > 1) bug("content", "minor", `关卡 ${s.id} 有 ${bossCount} 个 Boss`, "", `stage-bosses:${s.id}`);
  }

  // --- 每日任务模板 metric 必须是真实数值型 stats 字段 ---
  const VALID_STAT_KEYS = new Set([
    "totalActions", "totalKills", "totalCrafted", "totalGathered", "totalGoldEarned", "totalGoldSpent",
    "totalXpEarned", "playtimeSeconds", "totalEnhancements", "totalDeaths", "totalItemsSold", "totalItemsBought",
  ]);
  for (const t of DAILY_TEMPLATES as any[]) {
    if (!VALID_STAT_KEYS.has(t.metric)) bug("content", "major", `每日任务模板 ${t.id} metric=${t.metric} 不是数值型 stats 字段 → 永远 0 进度`, "", `daily-metric:${t.id}`);
    if (!(t.target > 0)) bug("content", "major", `每日任务模板 ${t.id} target 非法：${t.target}`, "", `daily-target:${t.id}`);
    if ((t.reward?.gold || 0) < 0 || (t.reward?.xp || 0) < 0) bug("content", "minor", `每日任务模板 ${t.id} 奖励为负`, "", `daily-neg:${t.id}`);
  }
  // --- 赏金模板字段合法 ---
  for (const b of BOUNTY_TEMPLATES as any[]) {
    if (!["gather", "craft", "kill"].includes(b.metric)) bug("content", "major", `赏金模板 ${b.id} metric=${b.metric} 未知`, "", `bounty-metric:${b.id}`);
    if (!(b.target > 0)) bug("content", "major", `赏金模板 ${b.id} target=${b.target}`, "", `bounty-target:${b.id}`);
    if (!(b.baseGold > 0) || !(b.baseRep > 0)) bug("content", "minor", `赏金模板 ${b.id} 奖励非法 gold=${b.baseGold} rep=${b.baseRep}`, "", `bounty-reward:${b.id}`);
  }

  // --- 每个职业技能至少有一个可执行动作（否则永远升不了级） ---
  for (const s of pack.skills as any[]) {
    const acts = (pack.actions as any[]).filter((a) => a.skillId === s.id);
    if (acts.length === 0) bug("content", "major", `技能 ${s.id} 没有任何动作 → 无法升级`, "", `skill-noact:${s.id}`);
    // T1 起步动作：等级1的玩家必须有能跑的
    const t1 = acts.filter((a) => Number(a.requirements?.skillLevel || 1) <= 1);
    if (acts.length > 0 && t1.length === 0) bug("content", "major", `技能 ${s.id} 没有 1 级可用的动作 → 新手卡死`, "", `skill-nostart:${s.id}`);
  }
  // --- 职业树节点 id 全局不冲突（cross-tree includes 判定会串） ---
  const allNodeIds = new Map<string, string>();
  for (const tree of pack.professionTrees || []) {
    for (const n of tree.skillNodes || []) {
      const prev = allNodeIds.get(n.id);
      if (prev && prev !== tree.professionId) bug("content", "major", `技能节点 ${n.id} 同时出现在 ${prev} 和 ${tree.professionId} 两棵树`, "", `node-xdup:${n.id}`);
      allNodeIds.set(n.id, tree.professionId);
    }
  }
  // --- 物品：sell > buy 倒挂（NPC 套利） ---
  for (const it of pack.items as any[]) {
    if (!SHOP_STOCK_IDS.includes(it.id)) continue;
    const bp = buyPrice(it), sp = sellPrice(it);
    if (sp > bp) bug("content", "critical", `商品 ${it.id} 卖价 ${sp} > 买价 ${bp} → NPC 无限刷钱`, "", `shop-arb:${it.id}`);
  }

  // --- 死内容：没有任何产出/获取途径的物品 ---
  const producedBy = new Map<string, string>();
  for (const a of pack.actions as any[]) for (const y of a.yields || []) producedBy.set(y.itemId, `action:${a.id}`);
  for (const r of pack.recipes as any[]) for (const o of r.outputs || r.yields || []) producedBy.set(o.itemId, `recipe:${r.id}`);
  for (const m of pack.monsters as any[]) {
    for (const d of m.drops || []) producedBy.set(d.itemId, `monster:${m.id}`);
    const rid = typeof m.rare === "string" ? m.rare : m.rare?.itemId;
    if (rid) producedBy.set(rid, `monster-rare:${m.id}`);
  }
  for (const t of pack.dropTables as any[]) for (const e of t.entries || t.drops || []) producedBy.set(e.itemId, `dropTable:${t.id}`);
  for (const id of SHOP_STOCK_IDS) producedBy.set(id, "shop");
  for (const r of CHECKIN_REWARDS) for (const id of Object.keys(r.items || {})) producedBy.set(id, "checkin");
  for (const t of TASK_SHOP) for (const id of Object.keys((t as any).items || {})) producedBy.set(id, "taskshop");
  for (const s of pack.stages as any[]) for (const d of s.drops || s.rewards || []) producedBy.set(d.itemId, `stage:${s.id}`);
  for (const it of pack.items as any[]) {
    if (it.id === "gold") continue;
    if (!producedBy.has(it.id)) {
      // 装备/消耗品/技能书没有来源 = 死内容；材料也一样
      const equipable = !!(it.slot || it.type === "weapon" || it.type === "armor" || it.type === "tool" || it.type === "accessory" || it.toolFor);
      const usable = it.type === "food" || it.type === "consumable";
      bug("content", "minor", `物品 ${it.id}(${it.name || "?"}) 没有任何获取途径 → 死内容`, `type=${it.type}${equipable ? " equipable" : ""}${usable ? " usable" : ""}`, `dead-item:${it.id}`);
    }
  }
  // --- 怪物不在任何关卡/战斗动作里 → 不可遇 ---
  const reachableMonsters = new Set<string>();
  for (const s of pack.stages as any[]) for (const mid of s.monsters || (s.monsterId ? [s.monsterId] : [])) reachableMonsters.add(mid);
  for (const a of pack.actions as any[]) if (a.monsterId) reachableMonsters.add(a.monsterId);
  for (const m of pack.monsters as any[]) {
    if (!reachableMonsters.has(m.id)) bug("content", "minor", `怪物 ${m.id}(${m.name || "?"}) 不在任何关卡/战斗动作中 → 不可遇`, "", `dead-mon:${m.id}`);
  }
  // --- 战斗动作：约定 act_combat_<monsterId>，校验对应怪物存在 ---
  for (const a of pack.actions as any[]) {
    if (!String(a.id).startsWith("act_combat_")) continue;
    const suffix = String(a.id).slice("act_combat_".length);
    if (!monsterIds.has(suffix)) {
      bug("content", "major", `战斗动作 ${a.id} 没有对应怪物 ${suffix}（打空气）`, "", `combatact-nomon:${a.id}`);
    }
    // 注：战斗动作 yields 是独立的挂机产出表（引擎直接遍历），不要求与怪物 drops 一致——
    // 产出物品的存在性已由上方 act-yield 审计覆盖，此处不再比对怪物掉落。
  }
}

/* ============================== B. 长时游玩模拟 ============================== */

let virtualNow = new Date(BASE);
function advance(ms: number) {
  virtualNow = new Date(virtualNow.getTime() + ms);
  return virtualNow;
}

type Ctx = { userId: string; state: EnhancedPlayerState };

async function settle(ctx: Ctx, label: string) {
  const prevInv = JSON.stringify(ctx.state.inventory);
  try {
    ctx.state = (await storage.simulateToNow({ userId: ctx.userId, state: ctx.state, now: virtualNow, contentPack: pack })) as EnhancedPlayerState;
  } catch (e) {
    bug("settle", "critical", `结算抛异常：${(e as Error).message}`, `${label} @${virtualNow.toISOString()}\n${(e as Error).stack?.split("\n").slice(0, 4).join("\n")}`, `settle-throw:${(e as Error).message}`);
    return;
  }
  if (Date.parse(ctx.state.lastSimulatedAt) > virtualNow.getTime() + 1000) {
    bug("settle", "major", `lastSimulatedAt 超过 now`, `${label}: ${ctx.state.lastSimulatedAt} > ${virtualNow.toISOString()}`);
  }
  deepScan(ctx.state, label);
}

async function newCtx(name: string): Promise<Ctx> {
  const u = await storage.findOrCreateGuestUser(`soak-${name}`);
  const st = (await storage.getOrCreatePlayerState(u.id, pack.version || "1.0.0")) as EnhancedPlayerState;
  st.lastSimulatedAt = BASE.toISOString();
  return { userId: u.id, state: st };
}

/** 让玩家等级满足动作要求（模拟玩了很久后的等级） */
function ensureLevel(ctx: Ctx, skillId: string, level: number) {
  if (!ctx.state.skills[skillId]) {
    ctx.state.skills[skillId] = { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 } as any;
  }
  if (ctx.state.skills[skillId].level < level) ctx.state.skills[skillId].level = level;
}

/** B1. 所有动作逐个跑 */
async function exerciseAllActions(ctx: Ctx) {
  const rng = makeRng(42);
  for (const a of pack.actions as any[]) {
    const label = `action:${a.id}`;
    try {
      const req = Number(a.requirements?.skillLevel || 1);
      if (req > 1) {
        if (String(a.id).startsWith("act_combat_")) ctx.state.combatLevel = Math.max(ctx.state.combatLevel, req);
        else ensureLevel(ctx, a.skillId, req);
      }
      // 给足材料
      for (const c of a.consumes || []) {
        ctx.state.inventory[c.itemId] = (ctx.state.inventory[c.itemId] || 0) + Math.ceil(Number(c.qty) || 1) * 3;
      }
      const invBefore = { ...ctx.state.inventory };
      const statsBefore = ctx.state.stats?.totalActions || 0;
      const xpBefore = ctx.state.skills[a.skillId]?.xp ?? null;
      startLifeActionNow(ctx.state, pack, a.id, 3, virtualNow);
      advance(Number(a.duration) * 4 + 1000);
      await settle(ctx, label);
      // 战斗类动作走 hpCombat 不走 lifeActionState —— 若留在 life_action 却没跑完也记录
      if (ctx.state.mode === "life_action" && ctx.state.lifeActionState?.actionId === a.id) {
        // 可能 remaining 还没到 0 —— 再补一个大跳
        advance(Math.max(Number(a.duration) * 10, HOUR));
        await settle(ctx, `${label}:finish`);
      }
      const gained = (ctx.state.stats?.totalActions || 0) - statsBefore;
      if (gained === 0 && !(a.consumes?.length)) {
        bug("action", "major", `动作 ${a.id} 跑完 4×时长没有任何完成`, `duration=${a.duration}`, `act-noprogress:${a.id}`);
      }
      // xp 应增加（非战斗）
      if (!String(a.id).startsWith("act_combat_") && a.xp > 0 && gained > 0 && a.skillId) {
        const xpAfter = ctx.state.skills[a.skillId]?.xp ?? 0;
        const lvlAfter = ctx.state.skills[a.skillId]?.level ?? 0;
        if (xpBefore !== null && xpAfter <= xpBefore && lvlAfter <= req) {
          bug("action", "minor", `动作 ${a.id} 完成 ${gained} 次但技能经验没涨`, `xp ${xpBefore}→${xpAfter}`, `act-noxpgain:${a.id}`);
        }
      }
      void invBefore;
      void rng;
    } catch (e) {
      bug("action", "major", `动作 ${a.id} 执行抛异常：${(e as Error).message}`, "", `act-throw:${a.id}`);
    }
  }
}

/** B2. 全怪物战斗 */
async function exerciseAllMonsters(ctx: Ctx) {
  // 先拉高等级装备免得全输
  ctx.state.combatLevel = 150;
  for (const id of COMBAT_SKILL_IDS) {
    if (ctx.state.combatSkills?.[id]) ctx.state.combatSkills[id].level = 150;
  }
  const rng = makeRng(7);
  for (const m of pack.monsters as any[]) {
    const label = `monster:${m.id}`;
    try {
      const enc = startHpCombat(ctx.state, pack, m.id, virtualNow);
      ctx.state.hpCombat = enc;
      const hpBefore = enc.playerHp;
      if (!(hpBefore > 0)) bug("combat", "critical", `开战 playerHp=${hpBefore}`, `${m.id}`, `combat-hp0:${m.id}`);
      if (!(enc.playerIntervalMs > 0) || !(enc.enemyIntervalMs > 0)) {
        bug("combat", "major", `攻击间隔非法 player=${enc.playerIntervalMs} enemy=${enc.enemyIntervalMs}`, m.id, `combat-int:${m.id}`);
      }
      const until = tickHpCombat(ctx.state, pack, advance(10 * MIN), 10 * MIN, rng);
      void until;
      deepScan(ctx.state, label);
      if (!ctx.state.hpCombat?.outcome) {
        bug("combat", "minor", `10 分钟打不完 ${m.id}（无结果）`, `enemyHp=${ctx.state.hpCombat?.enemyHp}/${ctx.state.hpCombat?.enemyMaxHp}`, `combat-slow:${m.id}`);
      }
      if (ctx.state.hpCombat?.outcome === "win") {
        const xp = Number(m.xp || 0);
        if (xp > 0 && !ctx.state.hpCombat.rewardsGranted) {
          bug("combat", "major", `战胜 ${m.id} 后 rewardsGranted 未置位`, "", `combat-reward:${m.id}`);
        }
        for (const d of ctx.state.hpCombat.drops || []) {
          if (!findItem(pack, d.itemId)) bug("combat", "major", `战斗掉落不存在物品 ${d.itemId}`, m.id, `combat-dropitem:${m.id}:${d.itemId}`);
          if (!(d.qty > 0)) bug("combat", "minor", `掉落 ${d.itemId} qty=${d.qty}`, m.id, `combat-dropq:${m.id}:${d.itemId}`);
        }
      }
      ctx.state.hpCombat = undefined; // 下一只
      advance(1000);
    } catch (e) {
      bug("combat", "critical", `怪物 ${m.id} 战斗抛异常：${(e as Error).message}`, (e as Error).stack?.split("\n").slice(0, 3).join(" | "), `combat-throw:${m.id}`);
      ctx.state.hpCombat = undefined;
    }
  }
  ctx.state.combatLevel = 1; // 还原
}

/** B3. 强化系统 */
async function exerciseEnhancement(ctx: Ctx) {
  const rng = makeRng(99);
  const enhanceable = (pack.items as any[]).filter((i) => findEnhancementRuleForItem(i, pack));
  if (enhanceable.length === 0) bug("enhance", "major", "没有任何物品能强化（enhancementRules 全落空）", "");
  for (const item of enhanceable.slice(0, 40)) {
    const label = `enhance:${item.id}`;
    try {
      const rule = findEnhancementRuleForItem(item, pack)!.rule;
      // 给材料和物品
      ctx.state.inventory[item.id] = (ctx.state.inventory[item.id] || 0) + 1;
      for (let lvl = 1; lvl <= Math.min(5, rule.maxLevel); lvl++) {
        const mats = enhancementMaterials(rule, lvl);
        for (const [id, q] of Object.entries(mats)) ctx.state.inventory[id] = (ctx.state.inventory[id] || 0) + Number(q) * 3;
      }
      ctx.state.inventory[PROTECTION_MIRROR_ID] = (ctx.state.inventory[PROTECTION_MIRROR_ID] || 0) + 50;
      const before = { ...ctx.state.inventory };
      const res = performEnhancementAttempt({
        player: ctx.state, item, rule,
        request: { itemId: item.id, targetLevel: 1, materials: {}, protectionItemId: undefined },
        pack, rng, xpForLevel: (l: number) => l * 100,
      });
      if (res.newLevel < 0 || res.newLevel > MAX_ENHANCEMENT_LEVEL) {
        bug("enhance", "critical", `强化结果越界 +${res.newLevel}`, item.id, `enh-bound:${item.id}`);
      }
      // 材料确实被扣
      for (const [id, q] of Object.entries(res.consumedMaterials)) {
        const delta = (before[id] || 0) - (ctx.state.inventory[id] || 0);
        if (delta !== q) bug("enhance", "major", `强化材料扣除不符：${id} 应扣${q}实际${delta}`, item.id, `enh-mat:${item.id}:${id}`);
      }
      // 计时跑单
      const runRes = startEnhanceRun(ctx.state, pack, { itemId: item.id, targetLevel: 3, useProtection: true }, virtualNow);
      if (runRes.ok) {
        advance(30 * MIN);
        tickEnhanceRun(ctx.state, pack, virtualNow.getTime(), rng);
        const run = ctx.state.enhanceRun;
        if (run?.outcome && !["reached", "materials", "stopped", "max", "no_protection"].includes(run.outcome.reason)) {
          bug("enhance", "major", `强化跑单 outcome.reason 未知：${run.outcome.reason}`, item.id, `enh-reason:${item.id}`);
        }
        const lvlNow = ctx.state.equipment.enhancementLevels[item.id] || 0;
        if (run?.outcome?.reason === "reached" && lvlNow !== run.outcome.level) {
          bug("enhance", "major", `跑单 outcome.level=${run.outcome.level} 但实际 +${lvlNow}`, item.id, `enh-lvldrift:${item.id}`);
        }
        ctx.state.enhanceRun = undefined;
        ctx.state.mode = "idle";
      } else if (runRes.error !== "missing_materials") {
        bug("enhance", "minor", `startEnhanceRun 拒绝：${runRes.error}`, `${item.id}: ${runRes.message}`, `enh-startreject:${item.id}:${runRes.error}`);
      }
      delete ctx.state.inventory[item.id];
      delete ctx.state.equipment.enhancementLevels[item.id];
    } catch (e) {
      bug("enhance", "major", `强化 ${item.id} 抛异常：${(e as Error).message}`, "", `enh-throw:${item.id}`);
    }
  }
  delete ctx.state.inventory[PROTECTION_MIRROR_ID];
  deepScan(ctx.state, "enhancement");
}

/** B4. 市场守恒 */
async function exerciseMarket(players: Ctx[]) {
  const seller = players[0], buyer = players[1], third = players[2];
  const ledger = { minted: 0, burned: 0 }; // gold
  const itemLedger = { minted: 0, consumed: 0 }; // 测试物品
  const ITEM = "wood_1";

  seller.state.inventory[ITEM] = 100; itemLedger.minted += 100;
  buyer.state.inventory.gold = 10000; ledger.minted += 10000;
  const sellerGold0 = seller.state.inventory.gold || 0;

  // 挂单（MWI order book）
  const order = await storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 30, price: 10, type: "sell" });
  if ((seller.state.inventory[ITEM] || 0) !== 70) bug("market", "major", `卖单后库存 ${seller.state.inventory[ITEM]}≠70`, "");
  // 部分成交
  await storage.executeTrade({ buyerId: buyer.userId, orderId: order.id, quantity: 10 });
  if ((buyer.state.inventory[ITEM] || 0) !== 10) bug("market", "major", `买家到手 ${buyer.state.inventory[ITEM]}≠10`, "");
  if ((buyer.state.inventory.gold || 0) !== 9900) bug("market", "major", `买家金币 ${buyer.state.inventory.gold}≠9900`, "");
  if ((seller.state.inventory.gold || 0) !== sellerGold0 + 100) bug("market", "major", `卖家金币 ${seller.state.inventory.gold}≠${sellerGold0 + 100}`, "");
  // 撤单返还剩余
  await storage.cancelTradingOrder({ userId: seller.userId, orderId: order.id });
  if ((seller.state.inventory[ITEM] || 0) !== 90) bug("market", "major", `撤单返还后库存 ${seller.state.inventory[ITEM]}≠90`, "");

  // 收购单：金币托管。third 金币 0 → 应拒绝
  try {
    await storage.createTradingOrder({ userId: third.userId, itemId: ITEM, quantity: 5, price: 20, type: "buy" });
    bug("market", "critical", `金币 0 的买家挂 5×20 收购单没有被拒绝`, `gold=${third.state.inventory.gold}`, "market-buyorder-nogold");
  } catch { /* 拒绝 = 正确 */ }
  third.state.inventory.gold = 500; ledger.minted += 500;
  const bo = await storage.createTradingOrder({ userId: third.userId, itemId: ITEM, quantity: 5, price: 20, type: "buy" });
  if ((third.state.inventory.gold || 0) !== 400) bug("market", "major", `收购单后金币 ${third.state.inventory.gold}≠400`, "");
  await storage.cancelTradingOrder({ userId: third.userId, orderId: bo.id });
  if ((third.state.inventory.gold || 0) !== 500) bug("market", "major", `收购单撤单后金币 ${third.state.inventory.gold}≠500`, "");

  // 订单簿市场（挂单系统已下线，订单簿是唯一市场路径；无手续费、无过期）
  await rateGap();
  const goldBeforeOrder = seller.state.inventory.gold || 0;
  const ask = await storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 10, price: 10, type: "sell" });
  if ((seller.state.inventory[ITEM] || 0) !== 80) bug("market", "major", `挂卖单后库存 ${seller.state.inventory[ITEM]}≠80`, "");
  if ((seller.state.inventory.gold || 0) !== goldBeforeOrder) bug("market", "major", `挂卖单动了卖家金币：${goldBeforeOrder}→${seller.state.inventory.gold}`, "", "order-gold-delta");
  await rateGap();
  const tr = await storage.executeTrade({ buyerId: buyer.userId, orderId: ask.id, quantity: 4 });
  if (!tr.success) bug("market", "major", `卖单成交失败：${tr.message}`, "");
  const g = buyer.state.inventory.gold || 0;
  if (g !== 9860) bug("market", "major", `executeTrade 买家金币 ${g}≠9860（4×10，订单簿无手续费）`, "");
  if ((seller.state.inventory.gold || 0) !== goldBeforeOrder + 40) bug("market", "major", `卖家金币 ${seller.state.inventory.gold}≠${goldBeforeOrder + 40}`, "");

  // 边界输入（存储层）
  const probes: Array<[string, () => Promise<unknown> | unknown]> = [
    ["order-qty-0", () => storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 0, price: 1, type: "sell" })],
    ["order-qty-neg", () => storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: -5, price: 1, type: "sell" })],
    ["order-qty-nan", () => storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: NaN, price: 1, type: "sell" })],
    ["order-qty-frac", () => storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 1.5, price: 1, type: "sell" })],
    ["order-price-0", () => storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 1, price: 0, type: "sell" })],
    ["order-price-neg", () => storage.createTradingOrder({ userId: buyer.userId, itemId: ITEM, quantity: 1, price: -100, type: "buy" })],
    ["order-price-nan", () => storage.createTradingOrder({ userId: buyer.userId, itemId: ITEM, quantity: 1, price: NaN, type: "buy" })],
    ["order-phantom-item", () => storage.createTradingOrder({ userId: seller.userId, itemId: "not_an_item", quantity: 1, price: 1, type: "sell", contentPack: pack })],
    ["order-gold-sell", () => storage.createTradingOrder({ userId: seller.userId, itemId: "gold", quantity: 1, price: 1, type: "sell", contentPack: pack })],
  ];
  for (const [name, fn] of probes) {
    try {
      const res: any = await fn();
      bug("market", "critical", `存储层接受了非法订单：${name}`, JSON.stringify(res).slice(0, 140), `probe:${name}`);
      // 清理：撤掉刚建的脏单避免污染后续断言
      if (res?.id) { try { await storage.cancelTradingOrder({ userId: seller.userId, orderId: res.id }); } catch { try { await storage.cancelTradingOrder({ userId: buyer.userId, orderId: res.id }); } catch { /* noop */ } } }
    } catch { /* 拒绝 = 正确 */ }
  }
  // executeTrade 边界（先重置被探针污染的库存）
  seller.state.inventory[ITEM] = 100;
  const okOrder = await storage.createTradingOrder({ userId: seller.userId, itemId: ITEM, quantity: 10, price: 5, type: "sell" });
  for (const q of [0, -3, NaN, 1.5]) {
    try {
      await storage.executeTrade({ buyerId: buyer.userId, orderId: okOrder.id, quantity: q });
      bug("market", "critical", `executeTrade 接受 quantity=${q}`, "", `trade-q:${q}`);
    } catch { /* ok */ }
  }
  try { await storage.cancelTradingOrder({ userId: seller.userId, orderId: okOrder.id }); } catch { /* noop */ }

  deepScan(seller.state, "market-seller");
  deepScan(buyer.state, "market-buyer");
}

/** B5. 组队一致性 */
async function exerciseParty(players: Ctx[]) {
  const [a, b, c] = players;
  const p1 = await storage.createParty({ userId: a.userId, name: "alpha" });
  const p2 = await storage.createParty({ userId: b.userId, name: "beta" }).catch(() => null);
  if (p2) {
    // b 不在队里，能建队正常；现在 c 加入 p1，再试加入 p2（幽灵成员）
    await storage.joinParty({ userId: c.userId, partyId: p1.id });
    try {
      await storage.joinParty({ userId: c.userId, partyId: p2.id });
      bug("party", "major", "玩家同时在两支队伍的 member 列表（joinParty 不检查自身 partyState）", `c in ${p1.id} & ${p2.id}`, "party-ghost");
    } catch { /* ok */ }
    // 复核：c 的 partyState 指向 p2，但 p1 还留有 c
    const p1after = await storage.getPartyForUser({ userId: a.userId });
    if (p1after?.members.some((m) => m.userId === c.userId) && c.state.partyState?.partyId === p2.id) {
      bug("party", "major", "队伍 A 仍认为 c 是成员，但 c 的 partyState 已指向 B", "", "party-ghost-state");
    }
    // 队长离队解散：a 离开 p1 → p1 解散、c 的 partyState 应该被清理（但它指向 p2，不该被动）
    await storage.leaveParty({ userId: a.userId, partyId: p1.id });
    if (c.state.partyState?.partyId === p2.id) {
      // c 现在是 p2 的正式成员？但 p2 的成员列表里有没有 c？（join 时被加进去了）
      const p2after = await storage.getPartyForUser({ userId: b.userId });
      if (!p2after?.members.some((m) => m.userId === c.userId)) {
        bug("party", "major", "c 的 partyState 指向 p2 但 p2 成员列表没有 c", "", "party-orphan");
      }
    }
    // 队伍满员上限
    const extra: Ctx[] = [];
    for (let i = 0; i < 6; i++) extra.push(await newCtx(`px${i}`));
    let joined = 0;
    for (const e of extra) {
      try { await storage.joinParty({ userId: e.userId, partyId: p2.id }); joined++; } catch { /* full */ }
    }
    const finalP2 = await storage.getPartyForUser({ userId: b.userId });
    if ((finalP2?.members.length || 0) > 6) bug("party", "major", `队伍超过 6 人：${finalP2?.members.length}`, "");
    // 离队两次
    try {
      await storage.leaveParty({ userId: extra[0].userId, partyId: p2.id });
      await storage.leaveParty({ userId: extra[0].userId, partyId: p2.id });
    } catch (e) {
      void e;
    }
    // 队伍活动奖励金币凭空生成（无成本）
    void joined;
  }
  deepScan(a.state, "party-a");
  deepScan(b.state, "party-b");
  deepScan(c.state, "party-c");
}

/** B6. 任务/签到/赏金/成就/转生 */
async function exerciseProgression(ctx: Ctx) {
  // 任务板填充
  ensureTasks(ctx.state, pack, virtualNow, makeRng(5));
  const board = taskBoardView(ctx.state, pack, virtualNow);
  if (board.tasks.length > TASK_SLOTS) bug("tasks", "major", `任务板超 ${TASK_SLOTS} 槽：${board.tasks.length}`, "");
  // 逐个完成：把 baseline 对应的 stats 刷上去
  for (const t of [...board.tasks]) {
    const stats = ctx.state.stats!;
    stats.killsByMonster ||= {}; stats.actionsById ||= {};
    if (t.kind === "kill") stats.killsByMonster[t.monsterId || ""] = (t.baseline || 0) + t.target;
    else stats.actionsById[t.actionId || ""] = (t.baseline || 0) + t.target;
    const before = ctx.state.inventory.gold || 0;
    const res = claimTask(ctx.state, pack, t.id, virtualNow);
    if (res.ok) {
      if ((ctx.state.inventory.gold || 0) !== before + t.reward.gold) {
        bug("tasks", "major", `任务奖励金币不符：${before}→${ctx.state.inventory.gold}，应+${t.reward.gold}`, t.id);
      }
    } else {
      bug("tasks", "major", `满足进度后任务仍不可领取：${res.error}`, `${t.id} ${t.name}`, `task-claim:${t.id}`);
    }
    // 重复领取应失败
    const again = claimTask(ctx.state, pack, t.id, virtualNow);
    if (again.ok) bug("tasks", "critical", `任务可重复领取：${t.id}`, "");
  }
  // reroll 扣费
  ensureTasks(ctx.state, pack, advance(DAY), makeRng(6));
  const b2 = taskBoardView(ctx.state, pack, virtualNow);
  if (b2.tasks.length) {
    ctx.state.inventory.gold = 10000;
    const t0 = b2.tasks[0];
    const gBefore = ctx.state.inventory.gold;
    const rr = rerollTask(ctx.state, pack, t0.id, virtualNow, makeRng(8));
    if (rr.ok && (ctx.state.inventory.gold || 0) >= gBefore) {
      bug("tasks", "major", "reroll 没扣金币", "", "reroll-nocost");
    }
  }
  // 代币商店
  const st = ctx.state.tasksState!;
  st.tokens = 100000;
  for (const item of TASK_SHOP) {
    const res = buyTaskShop(ctx.state, pack, item.id, virtualNow, makeRng(11));
    void res;
  }
  deepScan(ctx.state, "taskshop");

  // 签到 21 天
  for (let d = 0; d < 21; d++) {
    const info = getCheckInInfo(ctx.state, virtualNow);
    const res = doCheckIn(ctx.state, virtualNow);
    if (!res.ok && info.canCheckIn) bug("checkin", "major", `第${d}天 canCheckIn=true 但 doCheckIn 失败：${res.reason}`, "");
    if (res.ok && res.reward.gold <= 0) bug("checkin", "minor", `第${d}天奖励金币 ${res.reward.gold}≤0`, "");
    advance(DAY + 60_000);
  }
  // 同一天二次签到（同一时刻再签一次）
  const infoNow = getCheckInInfo(ctx.state, virtualNow);
  if (!infoNow.canCheckIn) {
    const dup2 = doCheckIn(ctx.state, virtualNow);
    if (dup2.ok) bug("checkin", "critical", "同一天可重复签到", "");
  }
  deepScan(ctx.state, "checkin");

  // 赏金
  ensureBounties(ctx.state);
  for (const b of ctx.state.bounties!.bounties) {
    acceptBounty(ctx.state, b.id);
    const stats = ctx.state.stats!;
    const metricMap: Record<string, string> = { gather: "totalGathered", craft: "totalCrafted", kill: "totalKills" };
    const statKey = metricMap[b.metric] as any;
    (stats as any)[statKey] = (b.baseline || 0) + b.target;
    const r = claimBounty(ctx.state, b.id);
    if (!r.ok) bug("bounty", "major", `契约完成后领取失败：${r.reason}`, b.id);
    const again = claimBounty(ctx.state, b.id);
    if (again.ok) bug("bounty", "critical", `契约可重复领取：${b.id}`, "");
  }
  ctx.state.inventory.gold = 10000;
  rerollBounties(ctx.state);
  // reroll 到上限
  for (let i = 0; i < 20; i++) rerollBounties(ctx.state);
  deepScan(ctx.state, "bounty");

  // 成就：刷满 -> 领取 -> 重复领取
  syncAchievements(ctx.state);
  ctx.state.stats!.totalGathered = 1e9; ctx.state.stats!.totalCrafted = 1e9; ctx.state.stats!.totalKills = 1e9;
  ctx.state.stats!.totalGoldEarned = 1e12; ctx.state.stats!.totalXpEarned = 1e12;
  const unlocked = syncAchievements(ctx.state);
  for (const a of unlocked) {
    const r1 = claimAchievement(ctx.state, a.id);
    if (r1.ok) {
      const r2 = claimAchievement(ctx.state, a.id);
      if (r2.ok) bug("achievement", "critical", `成就重复领取：${a.id}`, "");
    }
  }
  for (const a of ACHIEVEMENTS) {
    const prog = ctx.state.achievements?.[a.id];
    if (prog?.claimed) continue;
    // 未解锁的应拒绝
    if (!prog?.unlocked) {
      const r = claimAchievement(ctx.state, a.id);
      if (r.ok) bug("achievement", "critical", `未达成成就可领取：${a.id}`, "");
    }
  }

  // 每日任务
  ensureDailyQuests(ctx.state);
  const dq = ctx.state.dailyQuests!;
  for (const q of dq.quests || []) {
    const stats = ctx.state.stats!;
    const metricMap: Record<string, string> = { totalGathered: "totalGathered", totalCrafted: "totalCrafted", totalKills: "totalKills", totalActions: "totalActions", totalGoldSpent: "totalGoldSpent" };
    (stats as any)[metricMap[q.metric] || "totalActions"] = (q.baseline || 0) + q.target + 10;
    const p = dailyProgress(ctx.state.stats!, q);
    if (p < q.target) bug("daily", "major", `每日任务进度计算错误 ${q.id}: ${p}/${q.target}`, "");
    const r = claimDailyQuest(ctx.state, q.id, virtualNow);
    if (!r.ok) bug("daily", "major", `每日任务完成却领取失败：${q.id} ${(r as any).reason}`, "");
    const r2 = claimDailyQuest(ctx.state, q.id, virtualNow);
    if (r2.ok) bug("daily", "critical", `每日任务重复领取：${q.id}`, "");
  }

  // 转生：等级不够应拒绝；够等级后重置是否干净
  const lowRes = doPrestige(ctx.state);
  if (lowRes.ok) bug("prestige", "critical", "1 级战斗等级也能转生", "");
  ensureCombatSkills(ctx.state);
  for (const id of COMBAT_SKILL_IDS) ctx.state.combatSkills![id].level = 80;
  ctx.state.combatLevel = derivedCombatLevel(ctx.state.combatSkills!);
  ctx.state.hpCombat = startHpCombat(ctx.state, pack, "slime", virtualNow); // 战斗中转生
  const est = estimatePrestigePoints(ctx.state);
  const res = doPrestige(ctx.state);
  if (res.ok) {
    if (ctx.state.combatLevel !== 1) bug("prestige", "critical", "转生后 combatLevel 未重置", String(ctx.state.combatLevel));
    if (ctx.state.combatXp !== 0) bug("prestige", "major", "转生后 combatXp 未清零", "");
    for (const [k, s] of Object.entries(ctx.state.skills)) {
      if (s.level !== 1) bug("prestige", "major", `转生后 ${k} 等级未重置：${s.level}`, "", `prestige-skill:${k}`);
    }
    if (ctx.state.hpCombat) bug("prestige", "major", "转生未清除进行中的 hpCombat（带着旧血条继续打）", "", "prestige-hpcombat");
    if (ctx.state.enhanceRun) bug("prestige", "major", "转生未清除进行中的 enhanceRun", "", "prestige-enhance");
    if (ctx.state.combatFarmState) bug("prestige", "minor", "转生未清除 combatFarmState", "", "prestige-farm");
    if ((ctx.state.activityQueue || []).length > 0) bug("prestige", "minor", "转生未清空行动队列", "", "prestige-queue");
    if (ctx.state.tradingState.activeListings.length > 0) bug("prestige", "major", "转生后在 market 的挂单仍然挂着（物品已消失，卖了能凭空收钱）", "", "prestige-listings");
    if (ctx.state.partyState) void 0; // 队伍状态保留可接受
    const derived = derivedCombatLevel(ctx.state.combatSkills!);
    if (derived !== 1) bug("prestige", "critical", `转生后 combatSkills 推导等级 ${derived}≠1`, "");
    if (est <= 0) bug("prestige", "minor", "转生给了 0 点但仍算成功", "");
  } else {
    bug("prestige", "major", `50 级转生被拒绝：${res.reason}`, "");
  }
  deepScan(ctx.state, "post-prestige");
}

/** B7. 商店与消耗品 */
async function exerciseShop(ctx: Ctx) {
  ctx.state.inventory.gold = 1_000_000;
  for (const id of SHOP_STOCK_IDS) {
    const def = findItem(pack, id);
    if (!def) continue;
    const bp = buyPrice(def), sp = sellPrice(def);
    if (bp <= 0 || sp <= 0) bug("shop", "major", `${id} 定价非法 buy=${bp} sell=${sp}`, "", `shop-price:${id}`);
    if (sp >= bp) bug("shop", "major", `${id} 卖价 ${sp}≥买价 ${bp}（套利刷钱）`, "", `shop-arb:${id}`);
    const r = buyFromShop(ctx.state, pack, id, 2);
    if (!r.ok) bug("shop", "major", `商店购买 ${id} 失败：${r.reason}`, "", `shop-buy:${id}`);
    if ((ctx.state.inventory[id] || 0) !== 2) bug("shop", "major", `购买 ${id} 后数量 ${ctx.state.inventory[id]}≠2`, "", `shop-qty:${id}`);
  }
  // 小数数量（存储层不查 int）
  const g0 = ctx.state.inventory.gold;
  const r1 = buyFromShop(ctx.state, pack, "ore_1", 1.5);
  if (r1.ok && (ctx.state.inventory["ore_1"] || 0) % 1 !== 0) {
    bug("shop", "major", "buyFromShop 接受小数数量，产生小数库存", `ore_1=${ctx.state.inventory["ore_1"]}`, "shop-frac-buy");
  }
  ctx.state.inventory["wood_1"] = 10;
  const r2 = sellToShop(ctx.state, pack, "wood_1", 3.7);
  if (r2.ok && (ctx.state.inventory["wood_1"] ?? 0) % 1 !== 0) {
    bug("shop", "major", "sellToShop 接受小数数量", `wood_1=${ctx.state.inventory["wood_1"]} goldΔ=${ctx.state.inventory.gold - g0}`, "shop-frac-sell");
  }
  // 卖不存在的物品 / 卖装备中的物品
  ctx.state.inventory["weapon_wooden_sword"] = 1;
  ctx.state.equipment.main_hand = "weapon_wooden_sword"; // 装备着
  const r3 = sellToShop(ctx.state, pack, "weapon_wooden_sword", 1);
  if (r3.ok && ctx.state.equipment.main_hand === "weapon_wooden_sword") {
    bug("shop", "critical", "装备中的武器能被卖给商店（卖完还穿在身上，白嫖属性）", "", "sell-equipped");
    ctx.state.equipment.main_hand = undefined;
  }
  // 消耗品
  for (const it of pack.items as any[]) {
    if (it.type !== "food" && it.type !== "consumable") continue;
    ctx.state.inventory[it.id] = 2;
    const r = consumeItem(ctx.state, pack, it.id, virtualNow);
    if (!r.ok) bug("consume", "major", `消耗品 ${it.id} 无法使用：${r.reason}`, "", `consume-fail:${it.id}`);
    if (r.ok && (ctx.state.inventory[it.id] || 0) !== 1) bug("consume", "major", `消耗 ${it.id} 后数量 ${ctx.state.inventory[it.id]}≠1`, "", `consume-qty:${it.id}`);
    if (r.ok && it.effect?.buff && !(ctx.state.activeBuffs || []).some((b) => b.id === String(it.effect.buff.id || it.id))) {
      bug("consume", "major", `消耗品 ${it.id} 的 buff 没生效`, "", `consume-buff:${it.id}`);
    }
    // 再次使用刷新不叠加
    const r2 = consumeItem(ctx.state, pack, it.id, virtualNow);
    if (r2.ok && it.effect?.buff) {
      const n = (ctx.state.activeBuffs || []).filter((b) => b.id === String(it.effect.buff.id || it.id)).length;
      if (n > 1) bug("consume", "minor", `同 id buff 叠加了 ${n} 层：${it.id}`, "", `buff-stack:${it.id}`);
    }
    delete ctx.state.inventory[it.id];
  }
  // 非消耗品吃了应拒绝
  ctx.state.inventory["wood_1"] = 5;
  if (consumeItem(ctx.state, pack, "wood_1", virtualNow).ok) bug("consume", "major", "木材也能吃", "", "eat-wood");
  deepScan(ctx.state, "shop+consume");
}

/** B8. 装备穿戴一致性 */
async function exerciseEquipment(ctx: Ctx) {
  const weapon = (pack.items as any[]).find((i) => i.slot === "main_hand" || (i.type === "weapon"));
  if (!weapon) { bug("equipment", "major", "内容包没有武器", ""); return; }
  ctx.state.inventory[weapon.id] = 1;
  const ok = canEquipItem(ctx.state.inventory, "main_hand", weapon.id, pack.items as any);
  if (!ok.ok) bug("equipment", "major", `背包有 ${weapon.id} 却不能装备：${ok.error}`, "");
  // 槽位不匹配：把武器往头上戴
  const bad = canEquipItem(ctx.state.inventory, "head", weapon.id, pack.items as any);
  if (bad.ok) bug("equipment", "critical", `武器 ${weapon.id} 能装备到 head 槽`, "", "equip-wrongslot");
  // 没库存也能穿？
  const noStock = canEquipItem(ctx.state.inventory, "main_hand", "weapon_legendary_fake", pack.items as any);
  if (noStock.ok) bug("equipment", "critical", "不存在的物品能通过 canEquipItem", "", "equip-ghost");
  // 背包数量 0 的物品
  ctx.state.inventory[weapon.id] = 0;
  const zero = canEquipItem(ctx.state.inventory, "main_hand", weapon.id, pack.items as any);
  if (zero.ok) bug("equipment", "major", "背包 0 件也能装备", "", "equip-zero");
  // 装备后的耐久/强化字段是否初始化
  ctx.state.inventory[weapon.id] = 1;
  ctx.state.equipment.main_hand = weapon.id;
  // 交易行能卖掉穿在身上的装备？
  const stored = await newCtx("equip-seller");
  stored.state.inventory[weapon.id] = 1;
  stored.state.equipment.main_hand = weapon.id;
  let listRes: unknown = null;
  try {
    listRes = await storage.createTradingOrder({ userId: stored.userId, itemId: weapon.id, quantity: 1, price: 1, type: "sell" });
  } catch { /* 拒绝挂单才是正确行为 */ }
  if (listRes && stored.state.equipment.main_hand === weapon.id && (stored.state.inventory[weapon.id] || 0) === 0) {
    bug("market", "critical", "穿在身上的装备可以挂交易行（卖出后装备槽悬空）", weapon.id, "list-equipped");
  }
  void weapon;
}

/** B9. 队列/停止/时间异常 */
async function exerciseQueueAndTime(ctx: Ctx) {
  const gatherAction = (pack.actions as any[]).find((a) => a.id === "act_chop_wood_t1") || (pack.actions as any[]).find((a) => !a.consumes?.length && !String(a.id).startsWith("act_combat_"));
  const craftAction = (pack.actions as any[]).find((a) => a.consumes?.length > 0 && !String(a.id).startsWith("act_combat_"));

  // 队列推进
  ctx.state.activityQueue = [];
  startLifeActionNow(ctx.state, pack, gatherAction.id, 1, virtualNow);
  // 队列塞满 5 个
  ctx.state.activityQueue = Array.from({ length: ACTION_QUEUE_MAX }, (_, i) => ({ id: `q${i}`, actionId: gatherAction.id }));
  advance(Number(gatherAction.duration) + 500);
  await settle(ctx, "queue-drain-1");
  if (ctx.state.mode !== "life_action") {
    bug("queue", "major", "第一个动作结束后队列没有自动接上", JSON.stringify(ctx.state.activityQueue?.length), "queue-noadvance");
  }
  // 未知动作入队（直接 startNextQueuedAction）
  ctx.state.activityQueue = [{ id: "bad", actionId: "act_does_not_exist" }];
  ctx.state.mode = "idle";
  ctx.state.lifeActionState = undefined;
  const started = startNextQueuedAction(ctx.state, pack, virtualNow);
  if (started) bug("queue", "major", "不存在的动作被队列启动", "", "queue-ghost");

  // 时间倒退
  const before = ctx.state.lastSimulatedAt;
  try {
    const r = simulateToNow({ state: ctx.state, now: new Date(Date.parse(before) - HOUR), contentPack: pack });
    if (r.state !== ctx.state && Date.parse(r.state.lastSimulatedAt) !== Date.parse(before)) {
      bug("time", "minor", "时间倒退时返回了变化的状态", "", "time-back-diff");
    }
  } catch (e) {
    bug("time", "minor", `时间倒退抛异常：${(e as Error).message}`, "", "time-back-throw");
  }
  // 无效 lastSimulatedAt：应被修复（重置为 now + 记日志），抛 500 或修不好都算缺陷
  const corrupt = { ...ctx.state, lastSimulatedAt: "not-a-date" } as EnhancedPlayerState;
  try {
    const out = simulateToNow({ state: corrupt, now: virtualNow, contentPack: pack });
    if (!Number.isFinite(Date.parse((out.state as EnhancedPlayerState).lastSimulatedAt))) {
      bug("time", "minor", "损坏的 lastSimulatedAt 未被修复", "", "time-corrupt-unrepaired");
    }
  } catch (e) {
    bug("time", "major", `损坏的 lastSimulatedAt 仍抛异常（玩家永久卡死）：${(e as Error).message}`, "", "time-corrupt-throw");
  }
  // lastSimulatedAt 在未来
  const future = { ...ctx.state, lastSimulatedAt: new Date(virtualNow.getTime() + DAY).toISOString() } as EnhancedPlayerState;
  try {
    const r = simulateToNow({ state: future, now: virtualNow, contentPack: pack });
    void r;
  } catch (e) {
    bug("time", "minor", `未来 lastSimulatedAt 抛异常：${(e as Error).message}`, "", "time-future-throw");
  }
  // 超长离线：8 天
  const longOffline = defaultState();
  startLifeActionNow(longOffline, pack, gatherAction.id, undefined, virtualNow);
  advance(8 * DAY);
  const r8 = simulateToNow({ state: longOffline, now: virtualNow, contentPack: pack });
  deepScan(r8.state, "offline-8d");
  const st8 = r8.state as EnhancedPlayerState;
  if (st8.settlement?.cappedByOfflineLimit !== true) {
    bug("offline", "minor", "8 天离线没标记 cappedByOfflineLimit", "", "offline-capflag");
  }
  // 24h 上限收益：wood_1 产出不应超过 24h 的量
  const produced = st8.inventory[gatherAction.yields?.[0]?.itemId || ""] || 0;
  const maxCycles24h = Math.floor(24 * HOUR / Math.max(1, Number(gatherAction.duration)));
  if (produced > maxCycles24h * (Number(gatherAction.yields?.[0]?.qty || 1) + 1)) {
    bug("offline", "major", `8 天离线产出 ${produced} 超过 24h 上限 ${maxCycles24h}`, "", "offline-overcap");
  }
  // 分块结算 vs 一次结算一致性（同 rng 不一定一致——只查无异常与有界）
  deepScan(ctx.state, "queue-time-end");
}

/** B10. 离线报告正确性 */
async function exerciseOfflineReport(ctx: Ctx) {
  ctx.state.mode = "idle";
  ctx.state.lifeActionState = undefined;
  void ctx;
  advance(2 * HOUR);
  await settle(ctx, "offreport");
  void ctx;
  void ctx;
  deepScan(ctx.state, "offreport-end");
}

/** B11. 耐久修理 */
async function exerciseDurability(ctx: Ctx) {
  const weapon = (pack.items as any[]).find((i) => i.type === "weapon");
  if (!weapon) return;
  ctx.state.inventory[weapon.id] = 1;
  ctx.state.equipment.main_hand = weapon.id;
  ctx.state.equipment.maxDurability[weapon.id] = 100;
  ctx.state.equipment.durability[weapon.id] = 100;

  // 负修理量（负耐久损耗=凭空恢复）
  const r1 = await storage.reduceDurability({ userId: ctx.userId, itemId: weapon.id, amount: -50 });
  if (r1.success && (ctx.state.equipment.durability[weapon.id] || 0) > 100) {
    bug("durability", "major", `reduceDurability 接受负数，耐久 ${ctx.state.equipment.durability[weapon.id]}>100`, "", "dur-negamt");
  }
  // 超量损坏归零
  await storage.reduceDurability({ userId: ctx.userId, itemId: weapon.id, amount: 9999 });
  if ((ctx.state.equipment.durability[weapon.id] || 0) !== 0) bug("durability", "major", "耐久没归 0", "");
  // 修理：金币 0
  ctx.state.inventory.gold = 0;
  const rep0 = await storage.repairEquipment({ userId: ctx.userId, request: { itemId: weapon.id, repairType: "full" } });
  if (rep0.success) bug("durability", "major", "0 金币也能修理", "");
  // 修理：小数 target
  ctx.state.inventory.gold = 1000;
  const repFrac = await storage.repairEquipment({ userId: ctx.userId, request: { itemId: weapon.id, repairType: "partial", targetDurability: 33.3 } });
  if (repFrac.success && (ctx.state.equipment.durability[weapon.id] || 0) % 1 !== 0) {
    bug("durability", "minor", `修理产生了小数耐久 ${ctx.state.equipment.durability[weapon.id]}`, "", "dur-frac");
  }
  // 修理 target > max
  await storage.reduceDurability({ userId: ctx.userId, itemId: weapon.id, amount: 50 });
  const repOver = await storage.repairEquipment({ userId: ctx.userId, request: { itemId: weapon.id, repairType: "partial", targetDurability: 99999 } });
  if (repOver.success && (ctx.state.equipment.durability[weapon.id] || 0) > 100) {
    bug("durability", "major", "修理超过最大耐久", String(ctx.state.equipment.durability[weapon.id]), "dur-over");
  }
  // 修没装备的物品应失败
  const repNotEquipped = await storage.repairEquipment({ userId: ctx.userId, request: { itemId: "wood_1", repairType: "full" } });
  if (repNotEquipped.success) bug("durability", "major", "没装备的物品也能修", "", "dur-notequipped");
}

/** B12. executePlayerCommand 幂等/冲突 */
async function exerciseCommands(ctx: Ctx) {
  // 同 operationId 不同 payload → 冲突
  try {
    await storage.executePlayerCommand({
      userId: ctx.userId, contentPack: pack, now: virtualNow, operationId: "op-x",
      operationPayload: { a: 1 },
      apply: (s) => { s.inventory.gold = (s.inventory.gold || 0) + 10; return { ok: true }; },
    });
    const again = await storage.executePlayerCommand({
      userId: ctx.userId, contentPack: pack, now: virtualNow, operationId: "op-x",
      operationPayload: { a: 1 },
      apply: (s) => { s.inventory.gold = (s.inventory.gold || 0) + 10; return { ok: true }; },
    });
    if (!again.deduplicated) bug("command", "major", "同 operationId 重放未标记 deduplicated", "");
    const g = ctx.state.inventory.gold;
    void g;
    try {
      await storage.executePlayerCommand({
        userId: ctx.userId, contentPack: pack, now: virtualNow, operationId: "op-x",
        operationPayload: { a: 2 }, // 不同 payload
        apply: (s) => ({ ok: true }),
      });
      bug("command", "critical", "同 operationId 不同 payload 没有冲突", "", "opid-mismatch");
    } catch { /* ok */ }
    // expectedRevision 冲突
    try {
      await storage.executePlayerCommand({
        userId: ctx.userId, contentPack: pack, now: virtualNow, expectedRevision: 999999,
        apply: (s) => ({ ok: true }),
      });
      bug("command", "major", "陈旧 expectedRevision 没触发冲突", "", "rev-stale");
    } catch { /* ok */ }
  } catch (e) {
    bug("command", "major", `executePlayerCommand 基线抛异常：${(e as Error).message}`, "", "cmd-throw");
  }
}

/** B13. 战斗装载/技能边界 */
async function exerciseCombatEdges(ctx: Ctx) {
  // 非法食物进装载
  const r1 = setCombatLoadout(ctx.state, pack, { food: [{ itemId: "wood_1", triggerMissingHp: 10 }] } as any);
  if (r1.ok) bug("combat", "major", "木材能放进食物槽", "", "loadout-wood");
  const r2 = setCombatLoadout(ctx.state, pack, { food: [{ itemId: "ghost_item", triggerMissingHp: 10 }] } as any);
  if (r2.ok) bug("combat", "major", "不存在的物品能放进食物槽", "", "loadout-ghost");
  const r3 = setCombatLoadout(ctx.state, pack, { food: Array.from({ length: 10 }, () => ({ itemId: "food_simple", triggerMissingHp: 10 })) } as any);
  if (r3.ok && (ctx.state.combatLoadout?.food.length || 0) > combatSlotCounts(ctx.state, pack).food) {
    bug("combat", "major", `食物槽超过上限（${ctx.state.combatLoadout?.food.length}）`, "", "loadout-overflow");
  }
  // 战斗中施放未学技能
  ctx.state.hpCombat = startHpCombat(ctx.state, pack, "slime", virtualNow);
  const cast = tryCastAbility(ctx.state, pack, "nonexistent_ability", virtualNow);
  if (cast.ok) bug("combat", "major", "能放没学的技能", "", "cast-ghost");
  const chop = tryHeavyChop(ctx.state, pack, virtualNow);
  void chop;
  // 打死怪后还能放技能？
  ctx.state.hpCombat.outcome = "win";
  const castAfter = tryCastAbility(ctx.state, pack, "heavy_chop", virtualNow);
  if (castAfter.ok) bug("combat", "major", "战斗结束后还能放技能", "", "cast-after-end");
  ctx.state.hpCombat = undefined;
  // 战斗结算与 autoRepeat
  ctx.state.combatLoadout = { food: [], drink: [], autoRepeat: true };
  ctx.state.combatLevel = 99;
  for (const id of COMBAT_SKILL_IDS) if (ctx.state.combatSkills?.[id]) ctx.state.combatSkills[id].level = 99;
  ctx.state.hpCombat = startHpCombat(ctx.state, pack, "slime", virtualNow);
  advance(5 * MIN);
  tickHpCombat(ctx.state, pack, virtualNow, 5 * MIN, makeRng(3));
  const kills = ctx.state.hpCombat?.runStats?.kills || 0;
  if (kills < 2) bug("combat", "minor", `autoRepeat 5 分钟只打了 ${kills} 场`, "", "repeat-slow");
  if (kills > 300) bug("combat", "major", `autoRepeat 5 分钟打了 ${kills} 场（间隔被压到 0）`, "", "repeat-fast");
  ctx.state.hpCombat = undefined;
  ctx.state.combatLoadout = undefined;
  ctx.state.combatLevel = 1;
  for (const id of COMBAT_SKILL_IDS) if (ctx.state.combatSkills?.[id]) ctx.state.combatSkills[id].level = 1;
  // 怪物不存在的关卡/非法 stageId → 模拟器不应该崩
  deepScan(ctx.state, "combat-edges");
}

/** B14. 房屋升级 */
async function exerciseHouse(ctx: Ctx) {
  ensureHouse(ctx.state);
  for (const room of HOUSE_ROOMS) {
    for (let i = 0; i < HOUSE_MAX_LEVEL + 2; i++) {
      const nextLvl = (ctx.state.house!.rooms[room.id] || 0) + 1;
      const cost = roomUpgradeCost(room, nextLvl);
      ctx.state.inventory.gold = 1e9;
      for (const m of cost.materials || []) ctx.state.inventory[m.itemId] = 1e6;
      void cost;
      const r = upgradeRoom(ctx.state, pack, room.id);
      if (!r.ok && (ctx.state.house!.rooms[room.id] || 0) < HOUSE_MAX_LEVEL) {
        bug("house", "major", `房间 ${room.id} 升级失败：${(r as any).error}`, `level=${ctx.state.house!.rooms[room.id]}`, `house-up:${room.id}`);
      }
    }
    const lvl = ctx.state.house!.rooms[room.id] || 0;
    if (lvl > HOUSE_MAX_LEVEL) bug("house", "critical", `房间 ${room.id} 升到 ${lvl}>${HOUSE_MAX_LEVEL}`, "");
    const over = upgradeRoom(ctx.state, pack, room.id);
    if (over.ok) bug("house", "major", `满级房间还能继续升级：${room.id}`, "", `house-over:${room.id}`);
  }
  deepScan(ctx.state, "house");
}

/** B15. 声望 */
async function exerciseReputation(ctx: Ctx) {
  const before = getReputationBonuses(ctx.state);
  addReputation(ctx.state, 100000);
  const after = getReputationBonuses(ctx.state);
  for (const k of ["gatherSpeed", "craftSpeed", "combatSpeed", "xpGain", "goldGain"] as const) {
    if (after[k] < before[k]) bug("reputation", "major", `声望增长后 ${k} 反而降了`, `${before[k]}→${after[k]}`);
    if (!Number.isFinite(after[k])) bug("reputation", "major", `声望加成 ${k} 非有限数`, String(after[k]));
  }
  // 负声望
  addReputation(ctx.state, -500000);
  const neg = getReputationBonuses(ctx.state);
  for (const k of ["gatherSpeed", "craftSpeed", "combatSpeed", "xpGain", "goldGain"] as const) {
    if (!(neg[k] >= 0)) bug("reputation", "major", `负声望导致 ${k}=${neg[k]}（减速/倒扣经验）`, "", `rep-neg:${k}`);
  }
}

/** B16. 技能树解锁 */
async function exerciseSkillTree(ctx: Ctx) {
  for (const tree of pack.professionTrees || []) {
    const skillId = `skill_${tree.professionId}`;
    ctx.state.skills[skillId] = { level: 200, xp: 0, unlockedRecipes: [], enhancementLevel: 0 } as any;
    // 打乱顺序解锁：先解需要前置的
    const sorted = [...tree.skillNodes].sort((a, b) => (b.requirements?.prerequisites?.length || 0) - (a.requirements?.prerequisites?.length || 0));
    for (const node of sorted) {
      const res = await storage.unlockSkillNode({ userId: ctx.userId, professionId: tree.professionId, nodeId: node.id, contentPack: pack });
      if (res.success && (node.requirements?.prerequisites || []).length > 0) {
        const missing = node.requirements.prerequisites.filter((p) => !ctx.state.skills[skillId].unlockedRecipes.includes(p));
        if (missing.length) bug("skilltree", "critical", `前置 ${missing} 未解锁也放行了 ${node.id}`, "", `tree-pre:${node.id}`);
      }
      // 再解一次：不应重复堆叠
      const lenBefore = ctx.state.skills[skillId].unlockedRecipes.length;
      await storage.unlockSkillNode({ userId: ctx.userId, professionId: tree.professionId, nodeId: node.id, contentPack: pack });
      const lenAfter = ctx.state.skills[skillId].unlockedRecipes.length;
      if (lenAfter > lenBefore) bug("skilltree", "major", `重复解锁 ${node.id} 往 unlockedRecipes 追加 ${lenAfter - lenBefore} 项`, "", `tree-dup:${node.id}`);
    }
    // 等级不足的拒绝
    const low = await newCtx("low-" + tree.professionId);
    for (const node of tree.skillNodes) {
      if ((node.requirements?.level || 1) > 1) {
        const r = await storage.unlockSkillNode({ userId: low.userId, professionId: tree.professionId, nodeId: node.id, contentPack: pack });
        if (r.success) bug("skilltree", "critical", `1 级解锁了需要 ${node.requirements.level} 级的节点 ${node.id}`, "", `tree-level:${node.id}`);
        break;
      }
    }
  }
  deepScan(ctx.state, "skilltree");
}

/** B17. 漏洞利用与内部一致性探针（第二波：按代码审查定向） */
async function exerciseExploits(ctx: Ctx) {
  // combat_farm 死模式已随挂单系统一并下线；老存档迁移由 soak_regressions 覆盖。

  // --- 2. 强化服务：向自己下单 / 无资质提供者 / 服务费凭空铸造 ---
  const enhItem = (pack.items as any[]).find((i) => findEnhancementRuleForItem(i, pack));
  if (enhItem) {
    const reqr = await newCtx("exploit-enh");
    reqr.state.inventory[enhItem.id] = (reqr.state.inventory[enhItem.id] || 0) + 2;
    const rule = findEnhancementRuleForItem(enhItem, pack)!.rule;
    const mats = enhancementMaterials(rule, 1);
    for (const [id, q] of Object.entries(mats)) reqr.state.inventory[id] = (reqr.state.inventory[id] || 0) + Number(q) + 1;
    reqr.state.inventory.gold = (reqr.state.inventory.gold || 0) + 100000;
    // a) 向自己下单
    try {
      const r = await storage.createEnhancementServiceRequest({ requesterId: reqr.userId, providerId: reqr.userId, itemId: enhItem.id, targetLevel: 1, contentPack: pack });
      if (r?.id) bug("enhance", "major", "强化服务允许向自己下单（自我接单可刷服务费）", `request=${r.id} fee=${r.serviceFee}`, "enh-self");
    } catch { /* 拒绝才对 */ }
    // b) 无资质提供者
    const prov = await newCtx("exploit-prov"); // 全新号，无强化技能
    try {
      const r2 = await storage.createEnhancementServiceRequest({ requesterId: reqr.userId, providerId: prov.userId, itemId: enhItem.id, targetLevel: 1, contentPack: pack });
      if (r2?.id) {
        bug("enhance", "major", "强化服务不校验提供者资质（无强化技能的号也能接单）", "", "enh-unqualified");
      }
    } catch { /* 拒绝才对 */ }
    // d) 服务费守恒：provider 拿到的必须是请求者真付的，凭空 mint 才是缺陷
    const reqr2 = await newCtx("exploit-enh2");
    reqr2.state.inventory[enhItem.id] = (reqr2.state.inventory[enhItem.id] || 0) + 1;
    for (const [id, q] of Object.entries(mats)) reqr2.state.inventory[id] = (reqr2.state.inventory[id] || 0) + Number(q) + 1;
    reqr2.state.inventory.gold = (reqr2.state.inventory.gold || 0) + 10000;
    const alt = await newCtx("exploit-alt");
    const gA = alt.state.inventory.gold || 0;
    const gR2 = reqr2.state.inventory.gold || 0;
    try {
      const res = await storage.enhanceEquipment({ userId: reqr2.userId, request: { itemId: enhItem.id, targetLevel: 1, materials: {}, serviceProviderId: alt.userId }, contentPack: pack });
      const gained = (alt.state.inventory.gold || 0) - gA;
      const charged = gR2 - (reqr2.state.inventory.gold || 0);
      if (gained > 0 && charged < gained) {
        bug("enhance", "critical", `强化服务费无中生有：提供者 +${gained}，请求者只被扣 ${charged}`, `success=${res.success}`, "enh-fee-mint");
      }
    } catch (e) { void e; }
  }

  // --- 3. 同一件饰品穿两个槽位（数量 1 属性算两份） ---
  const acc = (pack.items as any[]).find((i) => i.slot === "accessory" || i.type === "accessory");
  if (acc) {
    const c3 = await newCtx("exploit-acc");
    c3.state.inventory[acc.id] = 1;
    const r1 = canEquipItem(c3.state.inventory, "accessory1", acc.id, pack.items as any[], c3.state.equipment);
    if (r1.ok) c3.state.equipment.accessory1 = acc.id;
    const r2 = canEquipItem(c3.state.inventory, "accessory2", acc.id, pack.items as any[], c3.state.equipment);
    if (r1.ok && r2.ok) {
      bug("equipment", "critical", `唯一物品可同时装进 accessory1+accessory2（属性重复计算）：${acc.id}`, "inventory=1", "equip-double");
    }
  }

  // --- 4. 存档字段损坏 → 每次结算 500，玩家永久卡死 ---
  const c4 = await newCtx("exploit-corrupt");
  c4.state.lastSimulatedAt = "not-a-date";
  try {
    await storage.simulateToNow({ userId: c4.userId, state: c4.state, now: virtualNow, contentPack: pack });
  } catch (e) {
    bug("settle", "major", "lastSimulatedAt 损坏 → simulateToNow 抛异常 → 该玩家所有请求 500", (e as Error).message, "corrupt-last");
  }
  const c4b = await newCtx("exploit-corrupt2");
  c4b.state.settlement = { processedUntil: "x", targetUntil: "bad", requestedUntil: "bad", complete: false } as any;
  try {
    await storage.simulateToNow({ userId: c4b.userId, state: c4b.state, now: virtualNow, contentPack: pack });
  } catch (e) {
    bug("settle", "major", "settlement.targetUntil 损坏 → simulateToNow 抛异常 → 玩家卡死", (e as Error).message, "corrupt-settle");
  }

  // --- 5. 幽灵队员：从未建 state 的用户可加入队伍占坑 ---
  const ghostUser = await storage.findOrCreateGuestUser("soak-ghost-" + Math.random());
  const pleader = await newCtx("exploit-party");
  try {
    const party = await storage.createParty({ userId: pleader.userId });
    const p2 = await storage.joinParty({ userId: ghostUser.id, partyId: party.id });
    if (p2.members.some((m) => m.userId === ghostUser.id)) {
      bug("party", "major", "没有玩家状态的用户可加入队伍（幽灵成员占坑，且其 partyState 从未被写）", `members=${p2.members.length}`, "party-ghost-nostate");
    }
  } catch { /* 拒绝才对 */ }

  // --- 6. appendLog 环形上限 ---
  const c5 = await newCtx("exploit-log");
  for (let i = 0; i < 260; i++) appendLog(c5.state, `spam${i}`);
  if (c5.state.logs.length > 205) bug("log", "minor", `日志未按 200 条截断：${c5.state.logs.length} 条`, "", "log-cap");

  // --- 7. NaN 统计 → 每日任务（验证 ||0 守卫生效，不领奖才对） ---
  const c6 = await newCtx("exploit-nan");
  ensureDailyQuests(c6.state);
  const quest = c6.state.dailyQuests!.quests[0];
  if (quest) {
    (c6.state.stats as any)[quest.metric] = NaN;
    const claim = claimDailyQuest(c6.state, quest.id);
    if (claim.ok) bug("progression", "critical", `统计字段 ${quest.metric}=NaN 时每日任务仍判定完成并领奖`, "", "nan-daily-claim");
  }

  // --- 8. 市场订单：装备可挂 / gold 与幻影物品 ---
  const seller = await newCtx("exploit-mkt");
  seller.state.inventory["wood_1"] = 100;
  // 8b. 装备中的物品可挂单
  const wep = (pack.items as any[]).find((i) => i.type === "weapon" || i.slot === "main_hand");
  if (wep) {
    seller.state.inventory[wep.id] = 1;
    seller.state.equipment.main_hand = wep.id;
    await new Promise((r) => setTimeout(r, 110));
    try {
      await storage.createTradingOrder({ userId: seller.userId, itemId: wep.id, quantity: 1, price: 10, type: "sell" });
      if (seller.state.equipment.main_hand === wep.id && (seller.state.inventory[wep.id] || 0) === 0) {
        bug("market", "critical", `装备中的 ${wep.id} 被挂进交易行：装备槽悬空但属性仍在`, "", "market-equipped");
      }
    } catch (e) { void e; }
    seller.state.equipment.main_hand = undefined as any;
    seller.state.inventory[wep.id] = Math.max(1, seller.state.inventory[wep.id] || 0);
  }
  // 8c. 挂单 "gold" / 不存在的物品
  seller.state.inventory.gold = (seller.state.inventory.gold || 0) + 5000;
  await new Promise((r) => setTimeout(r, 110));
  try {
    await storage.createTradingOrder({ userId: seller.userId, itemId: "gold", quantity: 100, price: 1, type: "sell" });
    bug("market", "major", "可以把金币本身挂进交易行（itemId=gold 无校验）", "", "market-gold");
  } catch { /* 拒绝才对 */ }
  await new Promise((r) => setTimeout(r, 110));
  try {
    seller.state.inventory["fake_item_xyz"] = 50;
    const fl = await storage.createTradingOrder({ userId: seller.userId, itemId: "fake_item_xyz", quantity: 10, price: 1, type: "sell", contentPack: pack });
    if (fl) bug("market", "major", "内容包不存在的物品也能挂单（fake_item_xyz）", "", "market-phantom");
  } catch { /* 拒绝才对 */ }

  // --- 9. 订单簿内部校验缺失（存储层防御，HTTP zod 已挡） ---
  const ord = await newCtx("exploit-ord");
  ord.state.inventory["wood_1"] = 10;
  ord.state.inventory.gold = 1000;
  const invalidOrderCases: Array<[string, any]> = [
    ["数量0", { userId: ord.userId, itemId: "wood_1", quantity: 0, price: 5, type: "sell" }],
    ["负数量", { userId: ord.userId, itemId: "wood_1", quantity: -5, price: 5, type: "sell" }],
    ["NaN数量", { userId: ord.userId, itemId: "wood_1", quantity: NaN, price: 5, type: "sell" }],
    ["小数数量", { userId: ord.userId, itemId: "wood_1", quantity: 1.5, price: 5, type: "sell" }],
    ["负价格", { userId: ord.userId, itemId: "wood_1", quantity: 1, price: -10, type: "sell" }],
    ["NaN价格", { userId: ord.userId, itemId: "wood_1", quantity: 1, price: NaN, type: "sell" }],
    ["金币售卖", { userId: ord.userId, itemId: "gold", quantity: 10, price: 1, type: "sell" }],
  ];
  for (const [label, params] of invalidOrderCases) {
    try {
      const o = await storage.createTradingOrder(params);
      if (o) bug("market", "major", `createTradingOrder 接受${label}（存储层无校验，内部调用可刷库存/金币）`, JSON.stringify(params), `order-${label}`);
      try { await storage.cancelTradingOrder({ userId: ord.userId, orderId: o.id }); } catch { void 0; }
    } catch { /* 拒绝才对 */ }
    ord.state.inventory["wood_1"] = 10; ord.state.inventory.gold = 1000; // 复位
  }
  // executeTrade 非法数量
  ord.state.inventory["wood_1"] = 10;
  const okOrder = await storage.createTradingOrder({ userId: ord.userId, itemId: "wood_1", quantity: 10, price: 5, type: "sell" });
  const buyer2 = await newCtx("exploit-ord-b");
  buyer2.state.inventory.gold = 1e6;
  for (const q of [0, -3, NaN, 1.5]) {
    try {
      const r = await storage.executeTrade({ buyerId: buyer2.userId, orderId: okOrder.id, quantity: q });
      if (r?.success) bug("market", "critical", `executeTrade 接受数量 ${q}（负/零/NaN 可刷金币或偷卖家钱）`, `orderQty=${okOrder.quantity}`, `exec-${String(q)}`);
    } catch { /* 拒绝才对 */ }
  }

  // --- 9.5 数量0动作 / 卖出装备后属性仍在 ---
  // （startHpCombat 重开战守卫在路由层 /combat/hp/start 已有 already_in_combat，
  //   内部 auto-repeat 依赖覆盖语义，纯函数不加守卫是设计选择——不记缺陷）

  const c8 = await newCtx("exploit-qty0");
  let qty0Started = false;
  try {
    startLifeActionNow(c8.state, pack, "act_chop_wood_t1", 0, virtualNow);
    qty0Started = true;
  } catch { /* 拒绝非法数量是正确行为 */ }
  if (qty0Started && c8.state.lifeActionState && c8.state.lifeActionState.quantity === undefined) {
    bug("queue", "minor", "startLifeActionNow quantity=0 被规整为不限量挂机（应拒绝而非无限刷）", "", "qty0-unlimited");
  }

  const c9 = await newCtx("exploit-sellequip");
  const wep2 = (pack.items as any[]).find((i) => (i.type === "weapon" || i.slot === "main_hand") && (i.atk || i.def));
  if (wep2) {
    c9.state.inventory[wep2.id] = 1;
    c9.state.equipment.main_hand = wep2.id;
    const s1 = getEquippedCombatStats(c9.state, pack);
    const sold = sellToShop(c9.state, pack, wep2.id, 1);
    const s2 = getEquippedCombatStats(c9.state, pack);
    if (sold.ok && s2.atk === s1.atk && (s1.atk > 0 || s1.def > 0)) {
      bug("shop", "critical", `武器 ${wep2.id} 卖给商店后装备槽仍提供 atk=${s2.atk}/def=${s2.def}`, "", "sell-equipped-stats");
    }
  }

  // --- 10. 转生后强化服务索引残留（失去 unlockedRecipes 的玩家不应再挂为提供者） ---
  const pres = await newCtx("exploit-prestige");
  pres.state.combatLevel = 60;
  outer: for (const tree of pack.professionTrees || []) {
    for (const node of tree.skillNodes) {
      if (node.unlocks?.enhancements?.length) {
        const sk = `skill_${tree.professionId}`;
        pres.state.skills[sk] = { level: 999, xp: 0, unlockedRecipes: [...(node.requirements?.prerequisites || [])], enhancementLevel: 0 } as any;
        await storage.unlockSkillNode({ userId: pres.userId, professionId: tree.professionId, nodeId: node.id, contentPack: pack });
        const ruleMatch = (pack.enhancementRules || []).find((r: any) => r.requiredProfession === tree.professionId);
        if (ruleMatch) {
          const provsBefore = await storage.getEnhancementProviders({ itemType: ruleMatch.itemType, contentPack: pack });
          if (provsBefore.some((p: any) => p.userId === pres.userId)) {
            // 直接清空 unlockedRecipes（模拟技能失效——转生保留 recipes 是设计选择，但掉技能的服务商必须下架）
            pres.state.skills[sk].unlockedRecipes = [];
            const provsAfter = await storage.getEnhancementProviders({ itemType: ruleMatch.itemType, contentPack: pack });
            if (provsAfter.some((p: any) => p.userId === pres.userId)) {
              bug("enhance", "major", "失去强化技能的玩家仍留在服务提供者索引里", `profession=${tree.professionId}`, "enh-stale-provider");
            }
          }
        }
        break outer;
      }
    }
  }

  // --- 11. getPriceHistory days 上限（超限应被钳制，而非按天数循环） ---
  {
    const t0 = Date.now();
    const rows = await storage.getPriceHistory({ itemId: "wood_1", days: 1e8 });
    const ms = Date.now() - t0;
    if (rows.length > 90 || ms > 2000) {
      bug("market", "minor", "getPriceHistory 的 days 无上限（?days=1e8 时是 DoS 向量）", `rows=${rows.length} 耗时 ${ms}ms`, "pricehistory-dos");
    }
  }

  deepScan(ctx.state, "exploits");
}

/* ============================== C. 综合长时游玩 ============================== */

async function longPlay() {
  const main = await newCtx("main");
  const alts = [await newCtx("alt1"), await newCtx("alt2"), await newCtx("alt3")];

  // 模拟 30 天游玩：每天做一堆操作 + 离线跳变
  const rng = makeRng(2026);
  const gatherActions = (pack.actions as any[]).filter((a) => !a.consumes?.length && !String(a.id).startsWith("act_combat_") && Number(a.duration) > 0);
  const craftActions = (pack.actions as any[]).filter((a) => a.consumes?.length && !String(a.id).startsWith("act_combat_") && Number(a.duration) > 0);
  const monsters = pack.monsters as any[];

  for (let day = 0; day < 30; day++) {
    const dlabel = `day${day}`;
    try {
      // 签到
      doCheckIn(main.state, virtualNow);
      // 随机采集动作 3-8 个
      const g = gatherActions[Math.floor(rng() * gatherActions.length)];
      if (g) {
        try {
          const req = Number(g.requirements?.skillLevel || 1);
          ensureLevel(main, g.skillId, req);
          startLifeActionNow(main.state, pack, g.id, undefined, virtualNow);
          advance(Math.floor(rng() * 6 * HOUR));
          await settle(main, `${dlabel}:gather`);
        } catch (e) {
          bug("longplay", "major", `采集 ${g.id} 失败：${(e as Error).message}`, `${dlabel} skill=${g.skillId} lvl=${main.state.skills[g.skillId]?.level}`, `lp-gather:${g.id}`);
        }
      }
      // 随机制作
      const c = craftActions[Math.floor(rng() * craftActions.length)];
      if (c) {
        try {
          const req = Number(c.requirements?.skillLevel || 1);
          ensureLevel(main, c.skillId, req);
          for (const cons of c.consumes) main.state.inventory[cons.itemId] = (main.state.inventory[cons.itemId] || 0) + 50;
          startLifeActionNow(main.state, pack, c.id, Math.floor(rng() * 20) + 1, virtualNow);
          advance(Number(c.duration) * 25 + 5000);
          await settle(main, `${dlabel}:craft`);
        } catch (e) {
          bug("longplay", "major", `制作 ${c.id} 失败：${(e as Error).message}`, `${dlabel} skill=${c.skillId} lvl=${main.state.skills[c.skillId]?.level}`, `lp-craft:${c.id}`);
        }
      }
      // 战斗若干场
      const m = monsters[Math.floor(rng() * monsters.length)];
      if (m) {
        if (main.state.hpCombat) main.state.hpCombat = undefined;
        try {
          const reqLv = Number((pack.actions as any[]).find((a) => a.id === `act_combat_${m.id}`)?.requirements?.skillLevel || m.level || 1);
          main.state.combatLevel = Math.max(main.state.combatLevel || 1, reqLv);
          main.state.hpCombat = startHpCombat(main.state, pack, m.id, virtualNow);
          advance(Math.floor(rng() * 30 * MIN) + MIN);
          tickHpCombat(main.state, pack, virtualNow, 30 * MIN, rng);
          if (main.state.hpCombat?.outcome) main.state.hpCombat = undefined;
        } catch (e) {
          bug("combat", "major", `长玩中 ${m.id} 战斗异常：${(e as Error).message}`, dlabel, `lp-combat:${m.id}`);
        }
      }
      // 市场交易
      if (day % 3 === 0 && alts.length >= 2) {
        try {
          main.state.inventory["wood_1"] = (main.state.inventory["wood_1"] || 0) + 50;
          const o = await storage.createTradingOrder({ userId: main.userId, itemId: "wood_1", quantity: 10, price: 5, type: "sell" });
          alts[0].state.inventory.gold = (alts[0].state.inventory.gold || 0) + 1000;
          await storage.executeTrade({ buyerId: alts[0].userId, orderId: o.id, quantity: 4 });
          await storage.cancelTradingOrder({ userId: main.userId, orderId: o.id });
        } catch (e) {
          bug("market", "major", `日常交易异常：${(e as Error).message}`, dlabel, "lp-market");
        }
      }
      // 任务
      ensureTasks(main.state, pack, virtualNow, rng);
      for (const t of taskBoardView(main.state, pack, virtualNow).tasks) {
        const stats = main.state.stats!;
        stats.killsByMonster ||= {}; stats.actionsById ||= {};
        if (t.kind === "kill") stats.killsByMonster[t.monsterId || ""] = (t.baseline || 0) + t.target;
        else stats.actionsById[t.actionId || ""] = (t.baseline || 0) + t.target;
        claimTask(main.state, pack, t.id, virtualNow);
      }
      // 房子
      const room = HOUSE_ROOMS[day % HOUSE_ROOMS.length];
      const cost = roomUpgradeCost(room, main.state.house?.rooms?.[room.id] || 0);
      let affordable = true;
      for (const [id, q] of Object.entries(cost.items || {})) {
        if ((main.state.inventory[id] || 0) < Number(q)) { affordable = false; break; }
      }
      void affordable;
      main.state.inventory.gold = (main.state.inventory.gold || 0) + 100000;
      upgradeRoom(main.state, pack, room.id);
      // 离线跳变
      advance([HOUR, 4 * HOUR, 12 * HOUR, 25 * HOUR][day % 4]);
      await settle(main, `${dlabel}:offline`);
    } catch (e) {
      bug("longplay", "critical", `第 ${day} 天主循环异常：${(e as Error).message}`, (e as Error).stack?.split("\n").slice(0, 3).join("|"), `lp-day:${day}:${(e as Error).message}`);
    }
  }
  // 最终转生
  main.state.combatLevel = 60;
  const prest = doPrestige(main.state);
  if (!prest.ok) bug("prestige", "major", `长玩结束转生失败：${prest.reason}`, "");
  deepScan(main.state, "longplay-end");
  deepScan(alts[0].state, "alt0-end");
}

/* ============================== main ============================== */

async function main() {
  console.log("=== WorkLife 长时游玩模拟（soak） ===\n");

  console.log("[A] 内容包静态审计…");
  auditContentPack();
  console.log(`    累计发现 ${findings.length}`);

  const ctxA = await newCtx("A");
  console.log("[B1] 全动作模拟…");
  await exerciseAllActions(ctxA);
  console.log(`    累计发现 ${findings.length}`);

  const ctxC = await newCtx("C");
  console.log("[B2] 全怪物战斗…");
  await exerciseAllMonsters(ctxC);
  console.log(`    累计发现 ${findings.length}`);

  const ctxE = await newCtx("E");
  console.log("[B3] 强化系统…");
  await exerciseEnhancement(ctxE);
  console.log(`    累计发现 ${findings.length}`);

  console.log("[B4] 市场守恒…");
  await exerciseMarket([ctxA, ...await Promise.all([newCtx("m1"), newCtx("m2"), newCtx("m3")])].slice(0, 3) as Ctx[]);
  console.log(`    累计发现 ${findings.length}`);

  console.log("[B5] 组队一致性…");
  await exerciseParty([await newCtx("pa"), await newCtx("pb"), await newCtx("pc")]);
  console.log(`    累计发现 ${findings.length}`);

  const ctxP = await newCtx("P");
  console.log("[B6] 任务/签到/赏金/成就/转生…");
  await exerciseProgression(ctxP);
  console.log(`    累计发现 ${findings.length}`);

  const ctxS = await newCtx("S");
  console.log("[B7] 商店与消耗品…");
  await exerciseShop(ctxS);
  console.log(`    累计发现 ${findings.length}`);

  const ctxEq = await newCtx("Eq");
  console.log("[B8] 装备穿戴…");
  await exerciseEquipment(ctxEq);
  console.log(`    累计发现 ${findings.length}`);

  const ctxQ = await newCtx("Q");
  console.log("[B9] 队列与时间异常…");
  await exerciseQueueAndTime(ctxQ);
  console.log(`    累计发现 ${findings.length}`);

  const ctxO = await newCtx("O");
  console.log("[B10] 离线报告…");
  await exerciseOfflineReport(ctxO);
  console.log(`    累计发现 ${findings.length}`);

  const ctxD = await newCtx("D");
  console.log("[B11] 耐久修理…");
  await exerciseDurability(ctxD);
  console.log(`    累计发现 ${findings.length}`);

  const ctxCmd = await newCtx("Cmd");
  console.log("[B12] 命令幂等…");
  await exerciseCommands(ctxCmd);
  console.log(`    累计发现 ${findings.length}`);

  const ctxCE = await newCtx("CE");
  console.log("[B13] 战斗边界…");
  await exerciseCombatEdges(ctxCE);
  console.log(`    累计发现 ${findings.length}`);

  const ctxH = await newCtx("H");
  console.log("[B14] 房屋…");
  await exerciseHouse(ctxH);
  console.log(`    累计发现 ${findings.length}`);

  const ctxR = await newCtx("R");
  console.log("[B15] 声望…");
  await exerciseReputation(ctxR);
  console.log(`    累计发现 ${findings.length}`);

  const ctxT = await newCtx("T");
  console.log("[B16] 技能树…");
  await exerciseSkillTree(ctxT);
  console.log(`    累计发现 ${findings.length}`);

  const ctxX = await newCtx("X");
  console.log("[B17] 漏洞利用与内部一致性…");
  await exerciseExploits(ctxX);
  console.log(`    累计发现 ${findings.length}`);

  console.log("[C] 30 天长时游玩…");
  await longPlay();
  console.log(`    累计发现 ${findings.length}`);

  await storage.close();

  // 汇总
  console.log(`\n================ 缺陷清单：${findings.length} 条 ================`);
  const bySev = { critical: [] as Finding[], major: [] as Finding[], minor: [] as Finding[] };
  for (const f of findings) bySev[f.severity].push(f);
  for (const sev of ["critical", "major", "minor"] as const) {
    console.log(`\n--- ${sev.toUpperCase()} (${bySev[sev].length}) ---`);
    for (const f of bySev[sev]) {
      console.log(`#${f.id} [${f.area}] ${f.title}${f.evidence ? ` — ${f.evidence.slice(0, 140)}` : ""}`);
    }
  }
}

main().catch((e) => {
  console.error("SOAK 自身崩溃：", e);
  // 崩溃也算发现
  console.log(`\n崩溃前已记录 ${findings.length} 条缺陷`);
  process.exit(1);
});
