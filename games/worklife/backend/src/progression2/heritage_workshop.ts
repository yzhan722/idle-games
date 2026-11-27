// 进阶进度 · 传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  HeritageRuneSlot,
  HeritageRuneId,
  CrossProfResonanceSetId,
  HeritageWorkshopState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { todayLocal } from "../time";
import { addReputation } from "./reputation";
import { ensureGuildHonor } from "./guild_bounty";

/* ============================ 传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6) ============================ */

export const HERITAGE_MAX_RUNE_RANK = 5;
export const HERITAGE_DAILY_SYNTHESIS_LIMIT = 12;

export interface HeritageRuneCostTier {
  targetRank: number;
  forgingEmblems: number;
  gold: number;
  crystals: Record<string, number>;
}

export const HERITAGE_RUNE_COSTS: HeritageRuneCostTier[] = [
  { targetRank: 1, forgingEmblems: 1, gold: 300, crystals: { crystal_1: 4 } },
  { targetRank: 2, forgingEmblems: 2, gold: 750, crystals: { crystal_1: 8, crystal_2: 3 } },
  { targetRank: 3, forgingEmblems: 3, gold: 1600, crystals: { crystal_2: 6, crystal_3: 3 } },
  { targetRank: 4, forgingEmblems: 4, gold: 3200, crystals: { crystal_3: 6, crystal_4: 3 } },
  { targetRank: 5, forgingEmblems: 6, gold: 6000, crystals: { crystal_4: 6, crystal_5: 3 } },
];

export interface HeritageRuneDef {
  id: HeritageRuneId;
  slot: HeritageRuneSlot;
  slotLabel: string;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  perRank: {
    bonusAtk?: number;
    bonusDef?: number;
    bonusHp?: number;
    armorPenPct?: number;
    thornsDefRatio?: number;
    intervalReductionPct?: number;
    critRateBonusPct?: number;
    critDmgBonusPct?: number;
    foodHealPct?: number;
    potionBuffPct?: number;
    gatherSpeedPct?: number;
    craftSpeedPct?: number;
    gatherDoubleChance?: number;
    craftEfficiencyPct?: number;
    rareFindPct?: number;
    goldGainPct?: number;
  };
}

export const HERITAGE_RUNES: HeritageRuneDef[] = [
  {
    id: "rune_sunder_edge",
    slot: "weapon",
    slotLabel: "武器槽",
    name: "裂甲裁决铭纹",
    subtitle: "重锋贯甲 · 护甲穿透与组队暴击",
    description: "每阶提升攻击力、护甲穿透与组队暴击率，随武器槽永久生效，更换武器不失效。",
    iconId: "rune_slot_weapon",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusAtk: 4, armorPenPct: 0.04, critRateBonusPct: 1.8 },
  },
  {
    id: "rune_tempest_fang",
    slot: "weapon",
    slotLabel: "武器槽",
    name: "疾雷狂澜铭纹",
    subtitle: "迅雷连斩 · 缩短普攻间隔与组队暴击伤害",
    description: "每阶缩短普攻间隔并提升攻击力与组队暴击伤害。",
    iconId: "rune_slot_weapon",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusAtk: 3, intervalReductionPct: 2.4, critDmgBonusPct: 8 },
  },
  {
    id: "rune_bastion_ward",
    slot: "armor",
    slotLabel: "防具槽",
    name: "圣盾坚壁铭纹",
    subtitle: "不朽壁垒 · 生命上限、护甲与反伤护御",
    description: "每阶提升生命上限、防御力并按防御比例反弹受击伤害，稳固前排承伤能力。",
    iconId: "rune_slot_armor",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusHp: 22, bonusDef: 3, thornsDefRatio: 0.06 },
  },
  {
    id: "rune_vital_aegis",
    slot: "armor",
    slotLabel: "防具槽",
    name: "生机秘佑铭纹",
    subtitle: "圣泉护佑 · 生命护御与料理秘药增幅",
    description: "每阶大幅提升生命上限、防御力，并强化战斗料理恢复与战斗药剂的攻防增益。",
    iconId: "rune_slot_armor",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { bonusHp: 28, bonusDef: 2, foodHealPct: 5, potionBuffPct: 4 },
  },
  {
    id: "rune_bountiful_pick",
    slot: "tool",
    slotLabel: "工具槽",
    name: "丰饶双星铭纹",
    subtitle: "万物丰收 · 采集加速、双倍采集与战斗稀有掉落",
    description: "每阶加快全系采集速度，并赋予采集双倍产出与战斗稀有掉落加成。",
    iconId: "rune_slot_tool",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { gatherSpeedPct: 4, gatherDoubleChance: 0.03, rareFindPct: 3 },
  },
  {
    id: "rune_artisan_forge",
    slot: "tool",
    slotLabel: "工具槽",
    name: "神匠炉火铭纹",
    subtitle: "炉火纯青 · 制作神速、巧匠连作与单人战斗金币",
    description: "每阶提升全系制作速度、免费连作效率与单人战斗金币。",
    iconId: "rune_slot_tool",
    maxRank: HERITAGE_MAX_RUNE_RANK,
    perRank: { craftSpeedPct: 4, craftEfficiencyPct: 5, goldGainPct: 3 },
  },
];

export interface EmblemSynthesisRecipeDef {
  id: string;
  name: string;
  description: string;
  goldCost: number;
  crystalCosts: Record<string, number>;
  emblemsOut: number;
}

export const EMBLEM_SYNTHESIS_RECIPES: EmblemSynthesisRecipeDef[] = [
  {
    id: "synth_glimmer",
    name: "微光晶簇熔铸",
    description: "以初阶微光水晶与金币凝铸 1 枚稀有锻造徽记，中前期即可稳定篆刻铭纹。",
    goldCost: 500,
    crystalCosts: { crystal_1: 6 },
    emblemsOut: 1,
  },
  {
    id: "synth_radiant",
    name: "辉光秘晶精炼",
    description: "以辉光水晶高效熔铸 1 枚稀有锻造徽记，节省金币开销。",
    goldCost: 350,
    crystalCosts: { crystal_2: 3 },
    emblemsOut: 1,
  },
  {
    id: "synth_brilliant",
    name: "高阶耀晶凝铸",
    description: "以高纯度耀光水晶一次熔铸 2 枚稀有锻造徽记，适合中后期冲刺高阶铭纹。",
    goldCost: 200,
    crystalCosts: { crystal_3: 2 },
    emblemsOut: 2,
  },
];

export interface CodexPassiveBonusDef {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  armorPenPct?: number;
  critRateBonusPct?: number;
  foodHealPct?: number;
  potionBuffPct?: number;
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  gatherDoubleChance?: number;
  craftEfficiencyPct?: number;
  rareFindPct?: number;
  goldGainPct?: number;
  xpGainPct?: number;
}

export interface CodexMilestoneRewardDef {
  gold: number;
  reputation: number;
  forgingEmblems: number;
  items?: Record<string, number>;
}

export interface CrossProfResonanceTierDef {
  tier: 1 | 2 | 3;
  milestoneId: string;
  title: string;
  itemIds: string[];
  passiveBonuses: CodexPassiveBonusDef;
  reward: CodexMilestoneRewardDef;
}

export interface CrossProfResonanceSetDef {
  id: CrossProfResonanceSetId;
  name: string;
  pairLabel: string;
  iconId: string;
  description: string;
  tiers: CrossProfResonanceTierDef[];
}

export const CROSS_PROF_RESONANCE_SETS: CrossProfResonanceSetDef[] = [
  {
    id: "forge_bastion",
    name: "熔炉星铁共鸣录",
    pairLabel: "挖矿 × 锻造",
    iconId: "codex_set_forge",
    description: "贯通矿脉勘探与百炼神兵，收集各阶矿锭与重装利刃，永久激活破甲与锻造极速共鸣。",
    tiers: [
      {
        tier: 1,
        milestoneId: "forge_bastion:tier_1",
        title: "初阶 · 赤铜试剑",
        itemIds: ["ore_1", "ingot_1", "weapon_iron_sword"],
        passiveBonuses: { bonusAtk: 2, gatherSpeedPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "forge_bastion:tier_2",
        title: "进阶 · 重甲百炼",
        itemIds: ["ore_3", "armor_blacksmith_iron_chest", "weapon_forge_hammer_t2"],
        passiveBonuses: { bonusAtk: 4, bonusDef: 3, craftSpeedPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "forge_bastion:tier_3",
        title: "宗师 · 寒霜星铁",
        itemIds: ["ore_6", "weapon_frost_blade", "armor_frost_chest"],
        passiveBonuses: { bonusAtk: 6, armorPenPct: 0.04, craftEfficiencyPct: 4 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "moonloom_weave",
    name: "织月灵丝共鸣录",
    pairLabel: "草木采集 × 缝纫",
    iconId: "codex_set_loom",
    description: "萃取林间灵纤维与月华丝线，织就轻灵秘甲，永久提升战斗稀有掉落、防御与采集双倍运势。",
    tiers: [
      {
        tier: 1,
        milestoneId: "moonloom_weave:tier_1",
        title: "初阶 · 晨棉轻纺",
        itemIds: ["fiber_1", "yarn_1", "armor_cloth_chest"],
        passiveBonuses: { bonusDef: 2, rareFindPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "moonloom_weave:tier_2",
        title: "进阶 · 锦绣裁衣",
        itemIds: ["fiber_3", "armor_tailor_leather_chest", "weapon_scissors_t2"],
        passiveBonuses: { bonusHp: 20, gatherDoubleChance: 0.02, rareFindPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "moonloom_weave:tier_3",
        title: "宗师 · 虚空灵织",
        itemIds: ["fiber_4", "weapon_scissors_t3", "armor_void_chest"],
        passiveBonuses: { bonusHp: 35, bonusDef: 4, gatherSpeedPct: 4, rareFindPct: 5 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "hearth_bounty",
    name: "丰穰暖灶共鸣录",
    pairLabel: "种植农牧 × 烹饪",
    iconId: "codex_set_hearth",
    description: "汇聚牧场鲜产与暖灶珍馐，永久增强生命上限、战斗料理恢复、单人战斗金币与经验。",
    tiers: [
      {
        tier: 1,
        milestoneId: "hearth_bounty:tier_1",
        title: "初阶 · 田园炊烟",
        itemIds: ["wool", "food_simple", "armor_farmer_cloth_chest"],
        passiveBonuses: { bonusHp: 18, gatherSpeedPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "hearth_bounty:tier_2",
        title: "进阶 · 蜜香浓汤",
        itemIds: ["honey", "armor_chef_leather_chest", "food_hearty_stew"],
        passiveBonuses: { bonusHp: 30, foodHealPct: 4, goldGainPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "hearth_bounty:tier_3",
        title: "宗师 · 百味盛宴",
        itemIds: ["milk", "weapon_frying_pan_t2", "food_master_feast"],
        passiveBonuses: { bonusHp: 50, bonusDef: 4, foodHealPct: 6, xpGainPct: 4 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
  {
    id: "arcane_crucible",
    name: "星晶秘药共鸣录",
    pairLabel: "水晶勘探 × 炼金",
    iconId: "codex_set_arcane",
    description: "调和地脉晶簇与秘传灵药，永久提升攻击、战斗药剂攻防增益、组队暴击率与经验获取。",
    tiers: [
      {
        tier: 1,
        milestoneId: "arcane_crucible:tier_1",
        title: "初阶 · 微光萃液",
        itemIds: ["crystal_1", "potion_hp_t1", "weapon_staff_t1"],
        passiveBonuses: { bonusAtk: 2, xpGainPct: 2 },
        reward: { gold: 400, reputation: 25, forgingEmblems: 1 },
      },
      {
        tier: 2,
        milestoneId: "arcane_crucible:tier_2",
        title: "进阶 · 辉晶秘袍",
        itemIds: ["crystal_2", "armor_alchemist_cloth_robe", "weapon_staff_t2"],
        passiveBonuses: { bonusAtk: 4, potionBuffPct: 4, craftSpeedPct: 3 },
        reward: { gold: 1000, reputation: 50, forgingEmblems: 1 },
      },
      {
        tier: 3,
        milestoneId: "arcane_crucible:tier_3",
        title: "宗师 · 星火灵药",
        itemIds: ["crystal_4", "weapon_staff_t3", "elixir_legend"],
        passiveBonuses: { bonusAtk: 6, critRateBonusPct: 2, potionBuffPct: 6, xpGainPct: 5 },
        reward: { gold: 2400, reputation: 100, forgingEmblems: 2 },
      },
    ],
  },
];

export interface CodexGlobalMilestoneDef {
  id: string;
  requiredTiers: number;
  name: string;
  description: string;
  passiveBonuses: CodexPassiveBonusDef;
  reward: CodexMilestoneRewardDef;
}

export const CODEX_GLOBAL_MILESTONES: CodexGlobalMilestoneDef[] = [
  {
    id: "codex_ms_4",
    requiredTiers: 4,
    name: "四艺初鸣",
    description: "跨职业共鸣累计点亮 4 阶套装，激发工坊全能底蕴。",
    passiveBonuses: { bonusAtk: 3, bonusHp: 25, gatherSpeedPct: 3, craftSpeedPct: 3 },
    reward: { gold: 1200, reputation: 60, forgingEmblems: 2, items: { crystal_2: 4 } },
  },
  {
    id: "codex_ms_8",
    requiredTiers: 8,
    name: "八荒匠魂",
    description: "跨职业共鸣累计点亮 8 阶套装，贯通采锻织烹炼多重技艺。",
    passiveBonuses: { bonusAtk: 5, bonusDef: 4, bonusHp: 40, rareFindPct: 5, goldGainPct: 5 },
    reward: { gold: 3000, reputation: 140, forgingEmblems: 3, items: { crystal_3: 4 } },
  },
  {
    id: "codex_ms_12",
    requiredTiers: 12,
    name: "万匠共鸣 · 全制霸",
    description: "点亮全部 12 阶跨职业套装图鉴，成就异世界传世宗师圣典。",
    passiveBonuses: {
      bonusAtk: 8,
      bonusDef: 6,
      bonusHp: 70,
      armorPenPct: 0.05,
      gatherDoubleChance: 0.03,
      craftEfficiencyPct: 6,
      xpGainPct: 6,
    },
    reward: { gold: 6800, reputation: 300, forgingEmblems: 5, items: { crystal_4: 4, mirror_protection: 2 } },
  },
];

export const ALL_CODEX_TRACKED_ITEM_IDS: Set<string> = new Set(
  CROSS_PROF_RESONANCE_SETS.flatMap((s) => s.tiers.flatMap((t) => t.itemIds))
);

const VALID_RUNE_IDS = new Set<string>(HERITAGE_RUNES.map((r) => r.id));
const VALID_RUNE_SLOTS: HeritageRuneSlot[] = ["weapon", "armor", "tool"];

/** 确保 heritageWorkshop 状态存在并净化脏档数据（向后兼容旧存档） */
export function ensureHeritageWorkshop(player: EnhancedPlayerState): HeritageWorkshopState {
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  if (!player.heritageWorkshop || typeof player.heritageWorkshop !== "object") {
    player.heritageWorkshop = {
      runeRanks: {},
      equippedRunes: { weapon: null, armor: null, tool: null },
      codexUnlockedItems: [],
      claimedCodexMilestones: [],
    };
  }
  const hw = player.heritageWorkshop;
  if (!hw.runeRanks || typeof hw.runeRanks !== "object") hw.runeRanks = {};
  for (const key of Object.keys(hw.runeRanks)) {
    if (!VALID_RUNE_IDS.has(key)) {
      delete (hw.runeRanks as Record<string, unknown>)[key];
      continue;
    }
    const raw = (hw.runeRanks as Record<string, unknown>)[key];
    const clean =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? Math.min(HERITAGE_MAX_RUNE_RANK, Math.floor(raw))
        : 0;
    if (clean > 0) {
      hw.runeRanks[key as HeritageRuneId] = clean;
    } else {
      delete hw.runeRanks[key as HeritageRuneId];
    }
  }

  if (!hw.equippedRunes || typeof hw.equippedRunes !== "object") {
    hw.equippedRunes = { weapon: null, armor: null, tool: null };
  }
  for (const slot of VALID_RUNE_SLOTS) {
    const rid = hw.equippedRunes[slot];
    if (!rid || typeof rid !== "string" || !VALID_RUNE_IDS.has(rid)) {
      hw.equippedRunes[slot] = null;
      continue;
    }
    const def = HERITAGE_RUNES.find((r) => r.id === rid);
    const rank = hw.runeRanks[rid as HeritageRuneId] || 0;
    if (!def || def.slot !== slot || rank <= 0) {
      hw.equippedRunes[slot] = null;
    }
  }

  if (!Array.isArray(hw.codexUnlockedItems)) hw.codexUnlockedItems = [];
  hw.codexUnlockedItems = Array.from(
    new Set(hw.codexUnlockedItems.filter((x) => typeof x === "string" && ALL_CODEX_TRACKED_ITEM_IDS.has(x)))
  );

  if (!Array.isArray(hw.claimedCodexMilestones)) hw.claimedCodexMilestones = [];
  hw.claimedCodexMilestones = Array.from(
    new Set(hw.claimedCodexMilestones.filter((x) => typeof x === "string" && x.length > 0))
  );

  if (hw.emblemSynthesis && typeof hw.emblemSynthesis === "object") {
    const c = hw.emblemSynthesis.count;
    hw.emblemSynthesis = {
      date: typeof hw.emblemSynthesis.date === "string" ? hw.emblemSynthesis.date : "",
      count: typeof c === "number" && Number.isFinite(c) && c > 0 ? Math.floor(c) : 0,
    };
  } else {
    hw.emblemSynthesis = undefined;
  }

  return hw;
}

/** 单件物品产出/掉落时即时点亮跨职业图鉴（若该物品属于图鉴追踪项） */
export function recordCodexItemUnlock(player: EnhancedPlayerState, itemId: string): boolean {
  if (!itemId || !ALL_CODEX_TRACKED_ITEM_IDS.has(itemId)) return false;
  const hw = ensureHeritageWorkshop(player);
  if (hw.codexUnlockedItems.includes(itemId)) return false;
  hw.codexUnlockedItems.push(itemId);
  return true;
}

/** 扫描当前背包、穿戴装备与历史采集统计，自动补齐已获得过的跨职业图鉴条目 */
export function syncHeritageCodex(player: EnhancedPlayerState): string[] {
  const newlyUnlocked: string[] = [];
  const candidates = new Set<string>();
  for (const [id, qty] of Object.entries(player.inventory || {})) {
    if (ALL_CODEX_TRACKED_ITEM_IDS.has(id) && Number(qty) > 0) candidates.add(id);
  }
  for (const [slot, val] of Object.entries((player.equipment || {}) as Record<string, unknown>)) {
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if (typeof val === "string" && ALL_CODEX_TRACKED_ITEM_IDS.has(val)) candidates.add(val);
  }
  for (const [id, qty] of Object.entries(player.stats?.gatheredByItem || {})) {
    if (ALL_CODEX_TRACKED_ITEM_IDS.has(id) && Number(qty) > 0) candidates.add(id);
  }
  if (candidates.size === 0 && !player.heritageWorkshop) return newlyUnlocked;
  const hw = ensureHeritageWorkshop(player);
  const existing = new Set(hw.codexUnlockedItems);
  for (const id of candidates) {
    if (!existing.has(id)) {
      hw.codexUnlockedItems.push(id);
      existing.add(id);
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

export interface HeritageWorkshopBonuses {
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  armorPenPct: number;
  thornsDefRatio: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  foodHealMult: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  gatherDoubleChance: number;
  craftEfficiencyPct: number;
  rareFindPct: number;
  goldGainPct: number;
  xpGainPct: number;
  completedSetTiers: number;
}

/**
 * 纯函数汇总「传世铭纹附魔台」与「跨职业套装共鸣图鉴」的全局属性与速率加成。
 * 与前端 combatSheet.ts 保持 1:1 确定性对称。
 */
export function getHeritageWorkshopBonuses(
  player?: Pick<EnhancedPlayerState, "heritageWorkshop"> | null
): HeritageWorkshopBonuses {
  const out: HeritageWorkshopBonuses = {
    bonusAtk: 0,
    bonusDef: 0,
    bonusHp: 0,
    armorPenPct: 0,
    thornsDefRatio: 0,
    intervalMult: 1,
    critRateBonusPct: 0,
    critDmgBonusPct: 0,
    foodHealMult: 1,
    potionBuffMult: 1,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    gatherDoubleChance: 0,
    craftEfficiencyPct: 0,
    rareFindPct: 0,
    goldGainPct: 0,
    xpGainPct: 0,
    completedSetTiers: 0,
  };
  const hw = player?.heritageWorkshop;
  if (!hw || typeof hw !== "object") return out;

  let foodHealPct = 0;
  let potionBuffPct = 0;

  // 1) 三个槽位当前镶嵌激活的传世铭纹
  const eqRunes = hw.equippedRunes || {};
  const ranks = hw.runeRanks || {};
  for (const slot of VALID_RUNE_SLOTS) {
    const rid = eqRunes[slot];
    if (!rid || typeof rid !== "string") continue;
    const def = HERITAGE_RUNES.find((r) => r.id === rid && r.slot === slot);
    if (!def) continue;
    const rawRank = Number((ranks as Record<string, unknown>)[rid] || 0);
    const r = Number.isFinite(rawRank) && rawRank > 0 ? Math.min(def.maxRank, Math.floor(rawRank)) : 0;
    if (r <= 0) continue;
    const p = def.perRank;
    if (p.bonusAtk) out.bonusAtk += p.bonusAtk * r;
    if (p.bonusDef) out.bonusDef += p.bonusDef * r;
    if (p.bonusHp) out.bonusHp += p.bonusHp * r;
    if (p.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + p.armorPenPct * r) * 1000) / 1000);
    if (p.thornsDefRatio) {
      out.thornsDefRatio = Math.min(0.85, Math.round((out.thornsDefRatio + p.thornsDefRatio * r) * 1000) / 1000);
    }
    if (p.intervalReductionPct) {
      const m = Math.max(0.7, 1 - (p.intervalReductionPct * r) / 100);
      out.intervalMult = Math.max(0.65, Math.round(out.intervalMult * m * 1000) / 1000);
    }
    if (p.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + p.critRateBonusPct * r) * 10) / 10;
    if (p.critDmgBonusPct) out.critDmgBonusPct += p.critDmgBonusPct * r;
    if (p.foodHealPct) foodHealPct += p.foodHealPct * r;
    if (p.potionBuffPct) potionBuffPct += p.potionBuffPct * r;
    if (p.gatherSpeedPct) out.gatherSpeedPct += p.gatherSpeedPct * r;
    if (p.craftSpeedPct) out.craftSpeedPct += p.craftSpeedPct * r;
    if (p.gatherDoubleChance) {
      out.gatherDoubleChance = Math.min(0.8, Math.round((out.gatherDoubleChance + p.gatherDoubleChance * r) * 1000) / 1000);
    }
    if (p.craftEfficiencyPct) out.craftEfficiencyPct += p.craftEfficiencyPct * r;
    if (p.rareFindPct) out.rareFindPct += p.rareFindPct * r;
    if (p.goldGainPct) out.goldGainPct += p.goldGainPct * r;
  }

  // 2) 跨职业套装共鸣图鉴已点亮阶级与全局共鸣里程碑被动
  const unlocked = new Set(Array.isArray(hw.codexUnlockedItems) ? hw.codexUnlockedItems : []);
  const addCodexPassive = (pb: CodexPassiveBonusDef) => {
    if (pb.bonusAtk) out.bonusAtk += pb.bonusAtk;
    if (pb.bonusDef) out.bonusDef += pb.bonusDef;
    if (pb.bonusHp) out.bonusHp += pb.bonusHp;
    if (pb.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + pb.armorPenPct) * 1000) / 1000);
    if (pb.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + pb.critRateBonusPct) * 10) / 10;
    if (pb.foodHealPct) foodHealPct += pb.foodHealPct;
    if (pb.potionBuffPct) potionBuffPct += pb.potionBuffPct;
    if (pb.gatherSpeedPct) out.gatherSpeedPct += pb.gatherSpeedPct;
    if (pb.craftSpeedPct) out.craftSpeedPct += pb.craftSpeedPct;
    if (pb.gatherDoubleChance) {
      out.gatherDoubleChance = Math.min(0.8, Math.round((out.gatherDoubleChance + pb.gatherDoubleChance) * 1000) / 1000);
    }
    if (pb.craftEfficiencyPct) out.craftEfficiencyPct += pb.craftEfficiencyPct;
    if (pb.rareFindPct) out.rareFindPct += pb.rareFindPct;
    if (pb.goldGainPct) out.goldGainPct += pb.goldGainPct;
    if (pb.xpGainPct) out.xpGainPct += pb.xpGainPct;
  };

  for (const set of CROSS_PROF_RESONANCE_SETS) {
    for (const t of set.tiers) {
      if (t.itemIds.every((id) => unlocked.has(id))) {
        out.completedSetTiers += 1;
        addCodexPassive(t.passiveBonuses);
      }
    }
  }
  for (const gm of CODEX_GLOBAL_MILESTONES) {
    if (out.completedSetTiers >= gm.requiredTiers) {
      addCodexPassive(gm.passiveBonuses);
    }
  }

  if (foodHealPct > 0) out.foodHealMult = Math.round((1 + foodHealPct / 100) * 1000) / 1000;
  if (potionBuffPct > 0) out.potionBuffMult = Math.round((1 + potionBuffPct / 100) * 1000) / 1000;
  return out;
}

/** 篆刻或升阶指定传世铭纹（消耗稀有锻造徽记 + 水晶 + 金币；首次篆刻若该槽为空则自动镶嵌激活） */
export function engraveHeritageRune(
  player: EnhancedPlayerState,
  runeId: string,
  contentPack?: EnhancedContentPack
): {
  ok: boolean;
  reason?: string;
  runeId?: HeritageRuneId;
  newRank?: number;
  equippedSlot?: HeritageRuneSlot;
  cost?: HeritageRuneCostTier;
} {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const def = HERITAGE_RUNES.find((r) => r.id === runeId);
  if (!def) return { ok: false, reason: "未知的传世铭纹" };

  const currentRank = hw.runeRanks[def.id] || 0;
  if (currentRank >= def.maxRank) {
    return { ok: false, reason: "该传世铭纹已达最高等阶" };
  }
  const cost = HERITAGE_RUNE_COSTS.find((c) => c.targetRank === currentRank + 1);
  if (!cost) return { ok: false, reason: "铭纹升阶配方缺失" };

  if (gh.forgingEmblems < cost.forgingEmblems) {
    return { ok: false, reason: `稀有锻造徽记不足（需 ${cost.forgingEmblems} 枚，可通过公会连携或下方晶簇熔铸获取）` };
  }
  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < cost.gold) {
    return { ok: false, reason: `金币不足（需 ${cost.gold} 金币）` };
  }
  for (const [cid, needQty] of Object.entries(cost.crystals)) {
    const haveQty = Number(player.inventory[cid] || 0);
    if (haveQty < needQty) {
      const cName =
        ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === cid)?.name ||
        cid;
      return { ok: false, reason: `${cName}不足（需 ${needQty} 个）` };
    }
  }

  gh.forgingEmblems -= cost.forgingEmblems;
  player.inventory.gold = goldNow - cost.gold;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + cost.gold;
  for (const [cid, needQty] of Object.entries(cost.crystals)) {
    player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
    if (player.inventory[cid] <= 0) delete player.inventory[cid];
  }

  const nextRank = currentRank + 1;
  hw.runeRanks[def.id] = nextRank;
  if (!hw.equippedRunes[def.slot]) {
    hw.equippedRunes[def.slot] = def.id;
  }
  syncHeritageCodex(player);
  appendLog(player, `传世铭纹「${def.name}」升至 ${nextRank} 阶（${def.slotLabel}）！`);
  return {
    ok: true,
    runeId: def.id,
    newRank: nextRank,
    equippedSlot: def.slot,
    cost,
  };
}

/** 切换武器/防具/工具槽当前激活的传世铭纹（已篆刻铭纹可随时无损切换） */
export function equipHeritageRune(
  player: EnhancedPlayerState,
  slot: string,
  runeId: string | null
): { ok: boolean; reason?: string; slot?: HeritageRuneSlot; equippedRuneId?: HeritageRuneId | null } {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  if (!VALID_RUNE_SLOTS.includes(slot as HeritageRuneSlot)) {
    return { ok: false, reason: "无效的铭纹槽位" };
  }
  const typedSlot = slot as HeritageRuneSlot;
  if (runeId === null || runeId === "") {
    hw.equippedRunes[typedSlot] = null;
    return { ok: true, slot: typedSlot, equippedRuneId: null };
  }
  const def = HERITAGE_RUNES.find((r) => r.id === runeId);
  if (!def || def.slot !== typedSlot) {
    return { ok: false, reason: "该铭纹与目标装备槽不匹配" };
  }
  const rank = hw.runeRanks[def.id] || 0;
  if (rank <= 0) {
    return { ok: false, reason: "请先篆刻解锁该铭纹再镶嵌" };
  }
  hw.equippedRunes[typedSlot] = def.id;
  appendLog(player, `已在${def.slotLabel}激活传世铭纹「${def.name}」（Lv.${rank}）`);
  return { ok: true, slot: typedSlot, equippedRuneId: def.id };
}

/** 工坊晶簇熔铸保底：消耗水晶与金币直接熔铸「稀有锻造徽记」，让中后期玩家随时推进铭纹养成 */
export function synthesizeForgingEmblem(
  player: EnhancedPlayerState,
  recipeId: string,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  emblemsGained?: number;
  forgingEmblems?: number;
  synthesesRemainingToday?: number;
} {
  ensurePlayerExtensions(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const recipe = EMBLEM_SYNTHESIS_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return { ok: false, reason: "未知的徽记熔铸配方" };

  const today = todayLocal(now);
  if (!hw.emblemSynthesis || hw.emblemSynthesis.date !== today) {
    hw.emblemSynthesis = { date: today, count: 0 };
  }
  if (hw.emblemSynthesis.count >= HERITAGE_DAILY_SYNTHESIS_LIMIT) {
    return { ok: false, reason: `今日工坊徽记熔铸次数已达上限（${HERITAGE_DAILY_SYNTHESIS_LIMIT} 次）` };
  }

  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < recipe.goldCost) {
    return { ok: false, reason: `金币不足（需 ${recipe.goldCost} 金币）` };
  }
  for (const [cid, needQty] of Object.entries(recipe.crystalCosts)) {
    const haveQty = Number(player.inventory[cid] || 0);
    if (haveQty < needQty) {
      const cName =
        ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === cid)?.name ||
        cid;
      return { ok: false, reason: `${cName}不足（需 ${needQty} 个）` };
    }
  }

  player.inventory.gold = goldNow - recipe.goldCost;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + recipe.goldCost;
  for (const [cid, needQty] of Object.entries(recipe.crystalCosts)) {
    player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
    if (player.inventory[cid] <= 0) delete player.inventory[cid];
  }

  hw.emblemSynthesis.count += 1;
  gh.forgingEmblems += recipe.emblemsOut;
  syncHeritageCodex(player);
  appendLog(player, `通过「${recipe.name}」熔铸获得稀有锻造徽记 ×${recipe.emblemsOut}！`);
  return {
    ok: true,
    emblemsGained: recipe.emblemsOut,
    forgingEmblems: gh.forgingEmblems,
    synthesesRemainingToday: Math.max(0, HERITAGE_DAILY_SYNTHESIS_LIMIT - hw.emblemSynthesis.count),
  };
}

/** 领取跨职业套装共鸣图鉴的单阶套装奖励或全局里程碑大奖 */
export function claimHeritageCodexMilestone(
  player: EnhancedPlayerState,
  milestoneId: string,
  contentPack?: EnhancedContentPack
): {
  ok: boolean;
  reason?: string;
  milestoneId?: string;
  reward?: CodexMilestoneRewardDef;
} {
  ensurePlayerExtensions(player);
  syncHeritageCodex(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);

  if (hw.claimedCodexMilestones.includes(milestoneId)) {
    return { ok: false, reason: "该共鸣图鉴奖励已领取" };
  }

  const unlocked = new Set(hw.codexUnlockedItems);
  let completedSetTiers = 0;
  let matchedReward: CodexMilestoneRewardDef | undefined;
  let matchedLabel = "";

  for (const set of CROSS_PROF_RESONANCE_SETS) {
    for (const t of set.tiers) {
      const done = t.itemIds.every((id) => unlocked.has(id));
      if (done) completedSetTiers += 1;
      if (t.milestoneId === milestoneId) {
        if (!done) return { ok: false, reason: "尚未集齐该阶跨职业套装所需的全部造物" };
        matchedReward = t.reward;
        matchedLabel = `${set.name} · ${t.title}`;
      }
    }
  }

  if (!matchedReward) {
    const gm = CODEX_GLOBAL_MILESTONES.find((m) => m.id === milestoneId);
    if (!gm) return { ok: false, reason: "未知的共鸣图鉴里程碑" };
    if (completedSetTiers < gm.requiredTiers) {
      return { ok: false, reason: `需累计点亮 ${gm.requiredTiers} 阶跨职业套装（当前 ${completedSetTiers} 阶）` };
    }
    matchedReward = gm.reward;
    matchedLabel = gm.name;
  }

  hw.claimedCodexMilestones.push(milestoneId);
  player.inventory.gold = Number(player.inventory.gold || 0) + matchedReward.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + matchedReward.gold;
  if (matchedReward.reputation > 0) addReputation(player, matchedReward.reputation);
  if (matchedReward.forgingEmblems > 0) gh.forgingEmblems += matchedReward.forgingEmblems;
  if (matchedReward.items) {
    for (const [iid, qty] of Object.entries(matchedReward.items)) {
      if (qty > 0) {
        player.inventory[iid] = Number(player.inventory[iid] || 0) + qty;
        recordCodexItemUnlock(player, iid);
      }
    }
  }
  syncAchievements(player);
  const itemPart = matchedReward.items
    ? "、" +
      Object.entries(matchedReward.items)
        .map(([iid, q]) => {
          const nm =
            ((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || []).find((i) => i.id === iid)
              ?.name || iid;
          return `${nm} ×${q}`;
        })
        .join("、")
    : "";
  appendLog(
    player,
    `领取共鸣图鉴里程碑「${matchedLabel}」：金币 +${matchedReward.gold}、声望 +${matchedReward.reputation}、稀有锻造徽记 +${matchedReward.forgingEmblems}${itemPart}！`
  );
  return { ok: true, milestoneId, reward: matchedReward };
}

/** 构造前端「传世铭纹附魔台与跨职业套装共鸣图鉴」面板完整视图数据 */
export function getHeritageWorkshopInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  syncHeritageCodex(player);
  const hw = ensureHeritageWorkshop(player);
  const gh = ensureGuildHonor(player);
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const today = todayLocal(now);
  const synthUsedToday = hw.emblemSynthesis?.date === today ? hw.emblemSynthesis.count : 0;
  const goldNow = Number(player.inventory.gold || 0);

  const runes = HERITAGE_RUNES.map((def) => {
    const rank = hw.runeRanks[def.id] || 0;
    const isMax = rank >= def.maxRank;
    const nextCost = isMax ? null : HERITAGE_RUNE_COSTS.find((c) => c.targetRank === rank + 1) || null;
    const crystalsList = nextCost
      ? Object.entries(nextCost.crystals).map(([cid, need]) => ({
          itemId: cid,
          name: itemsById.get(cid) || cid,
          need,
          have: Number(player.inventory[cid] || 0),
        }))
      : [];
    const canAfford =
      !!nextCost &&
      gh.forgingEmblems >= nextCost.forgingEmblems &&
      goldNow >= nextCost.gold &&
      crystalsList.every((c) => c.have >= c.need);
    return {
      ...def,
      rank,
      isMax,
      isEquipped: hw.equippedRunes[def.slot] === def.id,
      nextCost: nextCost
        ? {
            targetRank: nextCost.targetRank,
            forgingEmblems: nextCost.forgingEmblems,
            gold: nextCost.gold,
            crystals: crystalsList,
          }
        : null,
      canAfford,
    };
  });

  const synthesisRecipes = EMBLEM_SYNTHESIS_RECIPES.map((r) => {
    const crystals = Object.entries(r.crystalCosts).map(([cid, need]) => ({
      itemId: cid,
      name: itemsById.get(cid) || cid,
      need,
      have: Number(player.inventory[cid] || 0),
    }));
    const canAfford =
      synthUsedToday < HERITAGE_DAILY_SYNTHESIS_LIMIT &&
      goldNow >= r.goldCost &&
      crystals.every((c) => c.have >= c.need);
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      goldCost: r.goldCost,
      emblemsOut: r.emblemsOut,
      crystals,
      canAfford,
    };
  });

  const unlockedSet = new Set(hw.codexUnlockedItems);
  const claimedSet = new Set(hw.claimedCodexMilestones);
  let completedSetTiers = 0;
  let claimableCount = 0;

  const codexSets = CROSS_PROF_RESONANCE_SETS.map((set) => {
    const tiers = set.tiers.map((t) => {
      const items = t.itemIds.map((iid) => ({
        itemId: iid,
        name: itemsById.get(iid) || iid,
        unlocked: unlockedSet.has(iid),
      }));
      const unlockedCount = items.filter((x) => x.unlocked).length;
      const completed = unlockedCount === items.length;
      if (completed) completedSetTiers += 1;
      const claimed = claimedSet.has(t.milestoneId);
      const claimable = completed && !claimed;
      if (claimable) claimableCount += 1;
      return {
        tier: t.tier,
        milestoneId: t.milestoneId,
        title: t.title,
        items,
        unlockedCount,
        totalCount: items.length,
        completed,
        claimed,
        claimable,
        passiveBonuses: t.passiveBonuses,
        reward: t.reward,
      };
    });
    const unlockedItemsInSet = tiers.reduce((acc, t) => acc + t.unlockedCount, 0);
    const totalItemsInSet = tiers.reduce((acc, t) => acc + t.totalCount, 0);
    return {
      id: set.id,
      name: set.name,
      pairLabel: set.pairLabel,
      iconId: set.iconId,
      description: set.description,
      unlockedItemsInSet,
      totalItemsInSet,
      completedTiersInSet: tiers.filter((t) => t.completed).length,
      tiers,
    };
  });

  const globalMilestones = CODEX_GLOBAL_MILESTONES.map((gm) => {
    const completed = completedSetTiers >= gm.requiredTiers;
    const claimed = claimedSet.has(gm.id);
    const claimable = completed && !claimed;
    if (claimable) claimableCount += 1;
    return {
      id: gm.id,
      requiredTiers: gm.requiredTiers,
      name: gm.name,
      description: gm.description,
      completed,
      claimed,
      claimable,
      passiveBonuses: gm.passiveBonuses,
      reward: {
        ...gm.reward,
        itemList: Object.entries(gm.reward.items || {}).map(([iid, qty]) => ({
          itemId: iid,
          name: itemsById.get(iid) || iid,
          qty,
        })),
      },
    };
  });

  const bonuses = getHeritageWorkshopBonuses(player);

  return {
    forgingEmblems: gh.forgingEmblems,
    gold: goldNow,
    crystalsInventory: {
      crystal_1: Number(player.inventory.crystal_1 || 0),
      crystal_2: Number(player.inventory.crystal_2 || 0),
      crystal_3: Number(player.inventory.crystal_3 || 0),
      crystal_4: Number(player.inventory.crystal_4 || 0),
      crystal_5: Number(player.inventory.crystal_5 || 0),
    },
    equippedRunes: {
      weapon: hw.equippedRunes.weapon || null,
      armor: hw.equippedRunes.armor || null,
      tool: hw.equippedRunes.tool || null,
    },
    runes,
    synthesis: {
      dailyLimit: HERITAGE_DAILY_SYNTHESIS_LIMIT,
      usedToday: synthUsedToday,
      remainingToday: Math.max(0, HERITAGE_DAILY_SYNTHESIS_LIMIT - synthUsedToday),
      recipes: synthesisRecipes,
    },
    codex: {
      unlockedItemsCount: hw.codexUnlockedItems.length,
      totalTrackedItems: ALL_CODEX_TRACKED_ITEM_IDS.size,
      completedSetTiers,
      totalSetTiers: CROSS_PROF_RESONANCE_SETS.reduce((s, x) => s + x.tiers.length, 0),
      claimableCount,
      sets: codexSets,
      globalMilestones,
    },
    bonuses,
  };
}
