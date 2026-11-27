// 进阶进度 · 远征商队贸易航路 & 工坊特批契约柜台 (WL-7)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  CaravanRouteId,
  CaravanCargoCategory,
  CaravanWagonSlot,
  CaravanRewardSummary,
  CaravanWagonRun,
  WorkshopSupplyContractInstance,
  CaravanTradeState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { todayLocal } from "../time";
import { addReputation } from "./reputation";
import { createSeededRng, ensureGuildHonor } from "./guild_bounty";
import { recordCodexItemUnlock, syncHeritageCodex } from "./heritage_workshop";
import { getAlchemyCauldronBonuses } from "./alchemy_cauldron";
import { getAstralRelicsBonuses } from "./astral_relics";

/* ============================ 远征商队贸易航路 & 工坊特批契约柜台 (WL-7) ============================ */

export const CARAVAN_MAX_LEDGER_RANK = 5;
export const CARAVAN_LEDGER_COSTS: readonly number[] = [25, 50, 85, 135, 195];
export const CARAVAN_BASE_WAGON_CAPACITY = 60;
export const CARAVAN_LEDGER_CAPACITY_PER_RANK = 15;
export const CARAVAN_MIN_CARGO_VALUE = 40;
export const CARAVAN_MAX_CARGO_TYPES = 6;
export const CARAVAN_CONTRACT_MAX_REROLLS = 3;
export const CARAVAN_CONTRACT_REROLL_COST = 150;

export interface CaravanRepTierDef {
  level: number;
  minRep: number;
  title: string;
  maxWagons: 1 | 2 | 3;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  goldGainPct: number;
}

export const CARAVAN_REP_TIERS: readonly CaravanRepTierDef[] = [
  { level: 1, minRep: 0, title: "初途行商", maxWagons: 1, gatherDoubleChance: 0, craftSpeedPct: 0, goldGainPct: 0 },
  { level: 2, minRep: 100, title: "驿路熟客", maxWagons: 1, gatherDoubleChance: 0.03, craftSpeedPct: 4, goldGainPct: 4 },
  { level: 3, minRep: 280, title: "跨镇领航商", maxWagons: 2, gatherDoubleChance: 0.06, craftSpeedPct: 8, goldGainPct: 8 },
  { level: 4, minRep: 580, title: "皇家特许行会", maxWagons: 2, gatherDoubleChance: 0.1, craftSpeedPct: 12, goldGainPct: 13 },
  { level: 5, minRep: 1050, title: "星界远航巨贾", maxWagons: 3, gatherDoubleChance: 0.14, craftSpeedPct: 17, goldGainPct: 18 },
  { level: 6, minRep: 1700, title: "万邦星途总商会", maxWagons: 3, gatherDoubleChance: 0.19, craftSpeedPct: 22, goldGainPct: 24 },
];

export interface CaravanRouteDef {
  id: CaravanRouteId;
  name: string;
  townName: string;
  iconId: string;
  favoredCategory: CaravanCargoCategory;
  favoredLabel: string;
  description: string;
  baseDurationMs: number;
  goldReturnRatio: number;
  baseDust: number;
  dustDivisor: number;
  baseRep: number;
  emblemThreshold: number;
  hotCandidateIds: string[];
}

export const CARAVAN_TRADE_ROUTES: readonly CaravanRouteDef[] = [
  {
    id: "frostport",
    name: "凛风冰港航路",
    townName: "极北凛风冰港",
    iconId: "caravan_route_frostport",
    favoredCategory: "lumber_fish_dishes",
    favoredLabel: "原木 / 板材 / 渔获 / 料理补给",
    description: "冰封船坞终年急缺耐寒木材与热食鱼鲜，装运林木板材与料理渔获可获高额寒港紧缺溢价。",
    baseDurationMs: 12 * 60 * 1000,
    goldReturnRatio: 1.32,
    baseDust: 4,
    dustDivisor: 88,
    baseRep: 24,
    emblemThreshold: 340,
    hotCandidateIds: [
      "wood_1",
      "lumber_1",
      "fish_river",
      "food_simple",
      "lumber_2",
      "fish_sea",
      "food_fine",
      "dish_grilled_lake",
    ],
  },
  {
    id: "emberoasis",
    name: "赤砂绿洲航路",
    townName: "炎阳赤砂绿洲",
    iconId: "caravan_route_emberoasis",
    favoredCategory: "ore_ingot_tools",
    favoredLabel: "矿石 / 金属锭 / 锻造工具与军备",
    description: "大漠商驿扩建矿道与护卫队，常年高价收购各类矿石、金属锭与百工锻造工具器械。",
    baseDurationMs: 20 * 60 * 1000,
    goldReturnRatio: 1.38,
    baseDust: 6,
    dustDivisor: 80,
    baseRep: 32,
    emblemThreshold: 300,
    hotCandidateIds: [
      "ore_1",
      "ingot_1",
      "ore_2",
      "ingot_2",
      "weapon_iron_sword",
      "weapon_logging_axe_t1",
      "weapon_forge_hammer_t1",
      "ingot_3",
    ],
  },
  {
    id: "starfallspire",
    name: "星坠秘塔航路",
    townName: "云巅星坠秘塔",
    iconId: "caravan_route_starfallspire",
    favoredCategory: "herb_cloth_crystal_alchemy",
    favoredLabel: "灵草 / 纺织丝布 / 辉光水晶 / 秘药炼金",
    description: "星象法师塔长年消耗灵草、织物法袍、辉光水晶与炼金秘药，返航盛产高纯度异域星晶尘。",
    baseDurationMs: 30 * 60 * 1000,
    goldReturnRatio: 1.44,
    baseDust: 8,
    dustDivisor: 72,
    baseRep: 42,
    emblemThreshold: 270,
    hotCandidateIds: [
      "fiber_1",
      "yarn_1",
      "crystal_1",
      "potion_hp_t1",
      "crystal_2",
      "potion_mp_t2",
      "herb_farm",
      "dyed_cloth",
    ],
  },
];

export interface WorkshopContractTemplateDef {
  id: string;
  slotGroup: 0 | 1 | 2 | 3;
  name: string;
  description: string;
  rarity: "standard" | "urgent" | "royal";
  demands: Record<string, number>;
  reward: {
    gold: number;
    astralCrystalDust: number;
    forgingEmblems: number;
    honorPoints: number;
    expressPermits: number;
    caravanRep: number;
  };
}

export const WORKSHOP_CONTRACT_TEMPLATES: readonly WorkshopContractTemplateDef[] = [
  {
    id: "wc_frost_timber",
    slotGroup: 0,
    name: "寒港船坞修缮木料单",
    description: "向凛风冰港造船工坊交付基础原木与标准木板，换取星晶尘与加急通行证。",
    rarity: "standard",
    demands: { wood_1: 12, lumber_1: 6 },
    reward: { gold: 320, astralCrystalDust: 12, forgingEmblems: 1, honorPoints: 25, expressPermits: 1, caravanRep: 24 },
  },
  {
    id: "wc_camp_provisions",
    slotGroup: 0,
    name: "边疆驿站热食配给契",
    description: "筹措河鱼与简单料理支援远征哨站，结算工坊荣誉与星晶尘。",
    rarity: "standard",
    demands: { fish_river: 6, food_simple: 4 },
    reward: { gold: 360, astralCrystalDust: 14, forgingEmblems: 1, honorPoints: 28, expressPermits: 0, caravanRep: 26 },
  },
  {
    id: "wc_reinforced_planks",
    slotGroup: 0,
    name: "加固车轴木工急调令",
    description: "商队总驿急需加固木板与坚硬原木修整重型货车。",
    rarity: "urgent",
    demands: { wood_2: 10, lumber_2: 6 },
    reward: { gold: 520, astralCrystalDust: 18, forgingEmblems: 1, honorPoints: 35, expressPermits: 1, caravanRep: 32 },
  },
  {
    id: "wc_copper_smelt",
    slotGroup: 1,
    name: "赤砂矿道铜锭特批单",
    description: "交付铜矿石与铜锭支援绿洲熔炉，奖励稀有锻造徽记与异域星晶尘。",
    rarity: "standard",
    demands: { ore_1: 12, ingot_1: 6 },
    reward: { gold: 350, astralCrystalDust: 14, forgingEmblems: 1, honorPoints: 30, expressPermits: 0, caravanRep: 26 },
  },
  {
    id: "wc_iron_armory",
    slotGroup: 1,
    name: "绿洲护卫队铁器军需契",
    description: "打造铁锭与铁剑列装商路护卫，获取丰厚锻造徽记与公会荣誉。",
    rarity: "urgent",
    demands: { ingot_2: 6, weapon_iron_sword: 1 },
    reward: { gold: 640, astralCrystalDust: 22, forgingEmblems: 2, honorPoints: 45, expressPermits: 1, caravanRep: 38 },
  },
  {
    id: "wc_silver_ingots",
    slotGroup: 1,
    name: "秘银前哨精炼银锭单",
    description: "向高阶锻造局供应银矿石与银锭，附赠商队加急通行证。",
    rarity: "urgent",
    demands: { ore_3: 8, ingot_3: 5 },
    reward: { gold: 780, astralCrystalDust: 25, forgingEmblems: 2, honorPoints: 50, expressPermits: 1, caravanRep: 42 },
  },
  {
    id: "wc_weaver_bolts",
    slotGroup: 2,
    name: "远航篷布棉纺采购契",
    description: "交付棉花与棉线缝制防风商车篷布，稳定换取星晶尘与荣誉。",
    rarity: "standard",
    demands: { fiber_1: 12, yarn_1: 6 },
    reward: { gold: 340, astralCrystalDust: 15, forgingEmblems: 1, honorPoints: 28, expressPermits: 0, caravanRep: 25 },
  },
  {
    id: "wc_alchemy_vials",
    slotGroup: 2,
    name: "星坠学派晶药补给单",
    description: "上缴微光水晶与初级生命药水供法师塔实验，回馈星晶尘与通行证。",
    rarity: "urgent",
    demands: { crystal_1: 8, potion_hp_t1: 4 },
    reward: { gold: 560, astralCrystalDust: 20, forgingEmblems: 1, honorPoints: 40, expressPermits: 1, caravanRep: 34 },
  },
  {
    id: "wc_radiant_arcana",
    slotGroup: 2,
    name: "辉光秘药高阶征调书",
    description: "调拨辉光水晶与中级魔力药水，支援星坠秘塔结界运转。",
    rarity: "urgent",
    demands: { crystal_2: 6, potion_mp_t2: 3 },
    reward: { gold: 720, astralCrystalDust: 26, forgingEmblems: 2, honorPoints: 48, expressPermits: 1, caravanRep: 40 },
  },
  {
    id: "wc_royal_pioneer",
    slotGroup: 3,
    name: "皇家开拓团百工联供契",
    description: "跨职业集齐标准木板、铜锭与初级生命药水，一次性签发高额星晶尘、双倍徽记与加急通行证。",
    rarity: "royal",
    demands: { lumber_1: 8, ingot_1: 6, potion_hp_t1: 3 },
    reward: { gold: 880, astralCrystalDust: 30, forgingEmblems: 2, honorPoints: 60, expressPermits: 1, caravanRep: 48 },
  },
  {
    id: "wc_royal_expedition",
    slotGroup: 3,
    name: "星界远征军总军需敕令",
    description: "跨职业交付加固木板、亚麻线与辉光水晶，获皇家最高规格晶尘与徽记嘉奖。",
    rarity: "royal",
    demands: { lumber_2: 6, yarn_2: 6, crystal_2: 5 },
    reward: { gold: 1180, astralCrystalDust: 36, forgingEmblems: 3, honorPoints: 75, expressPermits: 1, caravanRep: 56 },
  },
  {
    id: "wc_royal_banquet_forge",
    slotGroup: 3,
    name: "万邦商会庆典特供总契",
    description: "汇集铁锭、精致料理与耀光水晶筹备商会大典，直接赐予三枚稀有锻造徽记与大量星晶尘。",
    rarity: "royal",
    demands: { ingot_2: 6, food_fine: 4, crystal_3: 3 },
    reward: { gold: 1380, astralCrystalDust: 42, forgingEmblems: 3, honorPoints: 85, expressPermits: 1, caravanRep: 64 },
  },
];

export interface AstralDustExchangeOfferDef {
  id: string;
  name: string;
  description: string;
  dustCost: number;
  dailyLimit?: number;
  kind: "ledger" | "emblem" | "crystals" | "permit";
  emblemsOut?: number;
  expressPermitsOut?: number;
  itemsOut?: Record<string, number>;
}

export const ASTRAL_DUST_EXCHANGE_OFFERS: readonly AstralDustExchangeOfferDef[] = [
  {
    id: "dust_forging_emblem",
    name: "星晶凝铸·稀有锻造徽记",
    description: "以异域星晶尘催化熔炉核心，直接凝铸 1 枚稀有锻造徽记用于传世铭纹升阶。",
    dustCost: 18,
    dailyLimit: 8,
    kind: "emblem",
    emblemsOut: 1,
  },
  {
    id: "dust_express_permit",
    name: "驿路特权·商队加急通行证",
    description: "凭星晶尘向总驿签发 1 张商队加急通行证，可令任意远征商车免除等待立即返航结算。",
    dustCost: 12,
    dailyLimit: 6,
    kind: "permit",
    expressPermitsOut: 1,
  },
  {
    id: "dust_crystal_bundle_t2",
    name: "辉耀灵晶补给匣",
    description: "开启获得微光水晶 ×6、辉光水晶 ×4、耀光水晶 ×2，同步点亮跨职业共鸣图鉴。",
    dustCost: 15,
    dailyLimit: 6,
    kind: "crystals",
    itemsOut: { crystal_1: 6, crystal_2: 4, crystal_3: 2 },
  },
  {
    id: "dust_crystal_bundle_t4",
    name: "星穹高阶圣晶秘匣",
    description: "开启获得耀光水晶 ×4、炽光水晶 ×3、圣光水晶 ×1，并额外附赠商队加急通行证 ×1。",
    dustCost: 32,
    dailyLimit: 4,
    kind: "crystals",
    itemsOut: { crystal_3: 4, crystal_4: 3, crystal_5: 1 },
    expressPermitsOut: 1,
  },
];

const VALID_CARAVAN_ROUTES = new Set<string>(CARAVAN_TRADE_ROUTES.map((r) => r.id));
const VALID_WAGON_SLOTS: readonly CaravanWagonSlot[] = [0, 1, 2];

/** 识别货品所属远征紧缺大类（前后端 1:1 纯函数规则） */
export function classifyCaravanCargoCategory(
  itemId: string,
  itemDef?: { id?: string; type?: string; toolFor?: string } | null
): CaravanCargoCategory | null {
  const id = String(itemId || "").trim();
  if (!id || id === "gold") return null;

  if (
    /^(crystal|fiber|yarn|potion|elixir|drink|herb|flower)_/.test(id) ||
    id === "wool" ||
    id === "rabbit_fur" ||
    id === "dyed_cloth" ||
    id === "tea_spirit" ||
    id === "poison_sac" ||
    id === "rotten_heart" ||
    id === "elemental_core" ||
    id === "snake_venom" ||
    id === "ghost_essence" ||
    /^armor_(cloth|farmer_cloth|alchemist_cloth|traveler_cloak)/.test(id) ||
    /^weapon_(scissors|staff|alchemy_bottle)_/.test(id)
  ) {
    return "herb_cloth_crystal_alchemy";
  }

  if (
    /^(wood|lumber|fish|dish|food)_/.test(id) ||
    id === "shrimp" ||
    id === "egg" ||
    id === "milk" ||
    id === "pork" ||
    id === "honey" ||
    id === "grain" ||
    id === "corn" ||
    id === "vegetable" ||
    id === "hay" ||
    id === "feed_animal" ||
    id === "flour" ||
    id === "oil" ||
    id === "bread" ||
    id === "butter" ||
    id === "cheese_wheel" ||
    id === "sauce_secret" ||
    id === "soup_herbal"
  ) {
    return "lumber_fish_dishes";
  }

  if (
    /^(ore|ingot|tool)_/.test(id) ||
    id === "charcoal" ||
    id === "resin" ||
    id === "leather_hide" ||
    id === "mirror_protection" ||
    Boolean(itemDef?.toolFor) ||
    /^(weapon|armor|offhand)_/.test(id)
  ) {
    return "ore_ingot_tools";
  }

  return null;
}

/** 生成 6 小时轮换的城镇紧缺班次种子（每日 4 班确定性轮换） */
export function buildCaravanScarcityShiftKey(now: Date = new Date()): string {
  const date = todayLocal(now);
  const shift = Math.min(3, Math.max(0, Math.floor(now.getHours() / 6)));
  return `wl7-scarcity:${date}#S${shift}`;
}

/** 计算指定航路在当前班次的确定性城镇紧缺系数（严格落在 1.15x ~ 1.85x 区间） */
export function getCaravanRouteScarcity(
  routeId: CaravanRouteId,
  nowOrShiftKey: Date | string = new Date()
): {
  shiftKey: string;
  scarcityMultiplier: number;
  hotItemIds: string[];
  hotMultiplier: number;
} {
  const shiftKey =
    typeof nowOrShiftKey === "string" && nowOrShiftKey.length > 0
      ? nowOrShiftKey
      : buildCaravanScarcityShiftKey(nowOrShiftKey instanceof Date ? nowOrShiftKey : new Date());
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === routeId) || CARAVAN_TRADE_ROUTES[0];
  const rng = createSeededRng(`${shiftKey}::route:${route.id}`);
  const rawSteps = Math.floor(rng() * 58); // 0..57 -> 1.15..1.72
  const scarcityMultiplier = Math.round((1.15 + rawSteps * 0.01) * 100) / 100;
  const hotMultiplier = Math.min(1.85, Math.round((scarcityMultiplier + 0.13) * 100) / 100);

  const pool = [...route.hotCandidateIds];
  const hotItemIds: string[] = [];
  while (hotItemIds.length < 2 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    hotItemIds.push(pool.splice(idx, 1)[0]);
  }
  return {
    shiftKey,
    scarcityMultiplier,
    hotItemIds,
    hotMultiplier,
  };
}

/** 根据累计商队声望返回当前商队等级（Lv.1~Lv.6）与下一级进度 */
export function getCaravanRepTier(caravanRep: number): {
  current: CaravanRepTierDef;
  next: CaravanRepTierDef | null;
  progressPct: number;
} {
  const rep = Number.isFinite(caravanRep) && caravanRep > 0 ? Math.floor(caravanRep) : 0;
  let current = CARAVAN_REP_TIERS[0];
  for (const t of CARAVAN_REP_TIERS) {
    if (rep >= t.minRep) current = t;
  }
  const next = CARAVAN_REP_TIERS.find((t) => t.level === current.level + 1) || null;
  const progressPct = !next
    ? 100
    : Math.min(100, Math.max(0, Math.floor(((rep - current.minRep) / Math.max(1, next.minRep - current.minRep)) * 100)));
  return { current, next, progressPct };
}

export interface CaravanTradeBonuses {
  level: number;
  title: string;
  ledgerRank: number;
  maxWagons: 1 | 2 | 3;
  maxCargoCapacity: number;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  goldGainPct: number;
  tradeYieldPct: number;
  durationReductionPct: number;
}

/**
 * 纯函数汇总「远征商队声望（Lv.1~6）」与「远征宗师商典（Lv.0~5）」的永久全局加成。
 * 与前端 combatSheet.ts / caravanTrade.ts 保持 1:1 确定性对称。
 */
export function getCaravanTradeBonuses(
  player?: Pick<EnhancedPlayerState, "caravanTrade"> | null
): CaravanTradeBonuses {
  const ct = player?.caravanTrade;
  const rawRep = Number(ct?.caravanRep || 0);
  const cleanRep = Number.isFinite(rawRep) && rawRep > 0 ? Math.floor(rawRep) : 0;
  const rawLedger = Number(ct?.ledgerRank || 0);
  const ledgerRank =
    Number.isFinite(rawLedger) && rawLedger > 0
      ? Math.min(CARAVAN_MAX_LEDGER_RANK, Math.floor(rawLedger))
      : 0;

  const { current } = getCaravanRepTier(cleanRep);
  const gatherDoubleChance = Math.min(
    0.5,
    Math.round((current.gatherDoubleChance + ledgerRank * 0.01) * 1000) / 1000
  );
  const craftSpeedPct = current.craftSpeedPct + ledgerRank * 2;
  const goldGainPct = current.goldGainPct + ledgerRank * 2;
  const tradeYieldPct = ledgerRank * 6;
  const durationReductionPct = ledgerRank * 6;
  const maxCargoCapacity = CARAVAN_BASE_WAGON_CAPACITY + ledgerRank * CARAVAN_LEDGER_CAPACITY_PER_RANK;

  return {
    level: current.level,
    title: current.title,
    ledgerRank,
    maxWagons: current.maxWagons,
    maxCargoCapacity,
    gatherDoubleChance,
    craftSpeedPct,
    goldGainPct,
    tradeYieldPct,
    durationReductionPct,
  };
}

/** 统计角色当前穿戴在各装备槽上的物品件数，保护穿戴中装备不被装车或交付契约 */
export function getEquippedItemCounts(player?: Pick<EnhancedPlayerState, "equipment"> | null): Record<string, number> {
  const counts: Record<string, number> = {};
  const eq = (player?.equipment || {}) as Record<string, unknown>;
  for (const [slot, val] of Object.entries(eq)) {
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if (typeof val === "string" && val.length > 0) {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

/** 返回指定物品当前可安全动用的闲置库存数量（总库存 - 已穿戴件数） */
export function getIdleCargoCount(
  player: Pick<EnhancedPlayerState, "inventory" | "equipment">,
  itemId: string
): number {
  if (!itemId || itemId === "gold") return 0;
  const total = Math.max(0, Math.floor(Number(player.inventory?.[itemId] || 0)));
  if (total <= 0) return 0;
  const equipped = getEquippedItemCounts(player)[itemId] || 0;
  return Math.max(0, total - equipped);
}

export function buildWorkshopContractSeedKey(date: string, rerollIndex = 0): string {
  return `wl7-workshop-contracts:${date}#r${Math.max(0, Math.floor(rerollIndex || 0))}`;
}

export function generateWorkshopContractsForSeed(seedKey: string): WorkshopSupplyContractInstance[] {
  const rng = createSeededRng(seedKey);
  const contracts: WorkshopSupplyContractInstance[] = [];
  for (const slotGroup of [0, 1, 2, 3] as const) {
    const candidates = WORKSHOP_CONTRACT_TEMPLATES.filter((t) => t.slotGroup === slotGroup);
    const chosen = candidates[Math.floor(rng() * candidates.length)] || candidates[0];
    contracts.push({
      id: `wsc_${slotGroup}_${chosen.id}`,
      templateId: chosen.id,
      name: chosen.name,
      description: chosen.description,
      rarity: chosen.rarity,
      demands: { ...chosen.demands },
      reward: { ...chosen.reward },
      fulfilled: false,
    });
  }
  return contracts;
}

/** 确保 caravanTrade 状态存在并净化脏档数据，同时自动维护当日 4 份工坊特批契约 */
export function ensureCaravanTrade(player: EnhancedPlayerState, now?: Date): CaravanTradeState {
  // 仅显式传入 now（指令/视图时钟）时才做每日翻篇；无参调用（ensurePlayerExtensions / 转生净化）只做脏档净化，
  // 避免墙钟与指令时钟跨日不一致时把当日契约板与兑换计数重置。
  const clock = now ?? new Date();
  const rollDaily = now !== undefined;
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  if (!player.caravanTrade || typeof player.caravanTrade !== "object") {
    player.caravanTrade = {
      caravanRep: 0,
      astralCrystalDust: 0,
      expressPermits: 1,
      ledgerRank: 0,
      totalRunsCompleted: 0,
      totalContractsFulfilled: 0,
      wagons: {},
    };
  }
  const ct = player.caravanTrade;
  ct.caravanRep = cleanNonNeg(ct.caravanRep, 0);
  ct.astralCrystalDust = cleanNonNeg(ct.astralCrystalDust, 0);
  ct.expressPermits = cleanNonNeg(ct.expressPermits, 0);
  ct.ledgerRank = Math.min(CARAVAN_MAX_LEDGER_RANK, cleanNonNeg(ct.ledgerRank, 0));
  ct.totalRunsCompleted = cleanNonNeg(ct.totalRunsCompleted, 0);
  ct.totalContractsFulfilled = cleanNonNeg(ct.totalContractsFulfilled, 0);

  if (!ct.wagons || typeof ct.wagons !== "object") {
    ct.wagons = {};
  }
  for (const key of Object.keys(ct.wagons)) {
    const slotNum = Number(key) as CaravanWagonSlot;
    if (!VALID_WAGON_SLOTS.includes(slotNum)) {
      delete (ct.wagons as Record<string, unknown>)[key];
      continue;
    }
    const w = ct.wagons[slotNum];
    if (!w || typeof w !== "object" || !VALID_CARAVAN_ROUTES.has(w.routeId)) {
      delete ct.wagons[slotNum];
      continue;
    }
    const cleanCargo: Record<string, number> = {};
    if (w.cargo && typeof w.cargo === "object") {
      for (const [iid, qty] of Object.entries(w.cargo)) {
        const q = cleanNonNeg(qty, 0);
        if (iid && iid !== "gold" && q > 0) cleanCargo[iid] = q;
      }
    }
    if (Object.keys(cleanCargo).length === 0) {
      delete ct.wagons[slotNum];
      continue;
    }
    const startedAt = cleanNonNeg(w.startedAt, clock.getTime());
    const completesAt = Math.max(startedAt, cleanNonNeg(w.completesAt, startedAt));
    const mult =
      typeof w.scarcityMultiplier === "number" && Number.isFinite(w.scarcityMultiplier)
        ? Math.min(1.85, Math.max(1.0, Math.round(w.scarcityMultiplier * 100) / 100))
        : 1.15;
    const er = w.expectedReward || ({} as CaravanRewardSummary);
    ct.wagons[slotNum] = {
      slot: slotNum,
      routeId: w.routeId,
      cargo: cleanCargo,
      startedAt,
      completesAt,
      scarcityMultiplier: mult,
      usedExpressPermit: Boolean(w.usedExpressPermit),
      expectedReward: {
        gold: Math.max(1, cleanNonNeg(er.gold, 50)),
        astralCrystalDust: Math.max(1, cleanNonNeg(er.astralCrystalDust, 4)),
        forgingEmblems: cleanNonNeg(er.forgingEmblems, 0),
        caravanRep: Math.max(1, cleanNonNeg(er.caravanRep, 15)),
      },
    };
  }

  const today = todayLocal(clock);
  if (
    !ct.contractsBoard ||
    typeof ct.contractsBoard !== "object" ||
    typeof ct.contractsBoard.date !== "string" ||
    (rollDaily && ct.contractsBoard.date !== today) ||
    !Array.isArray(ct.contractsBoard.contracts) ||
    ct.contractsBoard.contracts.length !== 4
  ) {
    const seedKey = buildWorkshopContractSeedKey(today, 0);
    ct.contractsBoard = {
      date: today,
      rerollsUsed: 0,
      seedKey,
      contracts: generateWorkshopContractsForSeed(seedKey),
    };
  } else {
    ct.contractsBoard.rerollsUsed = Math.min(
      CARAVAN_CONTRACT_MAX_REROLLS,
      cleanNonNeg(ct.contractsBoard.rerollsUsed, 0)
    );
  }

  if (
    !ct.dailyDustExchanges ||
    typeof ct.dailyDustExchanges !== "object" ||
    typeof ct.dailyDustExchanges.date !== "string" ||
    (rollDaily && ct.dailyDustExchanges.date !== today)
  ) {
    ct.dailyDustExchanges = { date: today, counts: {} };
  } else {
    const cleanCounts: Record<string, number> = {};
    for (const [oid, c] of Object.entries(ct.dailyDustExchanges.counts || {})) {
      const cc = cleanNonNeg(c, 0);
      if (cc > 0) cleanCounts[oid] = cc;
    }
    ct.dailyDustExchanges.counts = cleanCounts;
  }

  return ct;
}

export interface CaravanDispatchPreview {
  ok: boolean;
  reason?: string;
  routeId: CaravanRouteId;
  shiftKey: string;
  totalUnits: number;
  maxCapacity: number;
  baseCargoValue: number;
  effectiveCargoValue: number;
  favoredUnits: number;
  scarcityMultiplier: number;
  hotMultiplier: number;
  durationMs: number;
  expectedReward: CaravanRewardSummary;
  itemBreakdown: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitValue: number;
    appliedMultiplier: number;
    isFavored: boolean;
    isHot: boolean;
    subtotalScore: number;
  }>;
}

/** 纯函数预览装车方案的紧缺溢价、耗时与预期奖励（前后端共用对称公式） */
export function previewCaravanDispatch(
  player: Pick<EnhancedPlayerState, "inventory" | "equipment" | "caravanTrade">,
  contentPack: EnhancedContentPack | undefined,
  routeId: string,
  cargo: Record<string, number>,
  nowOrShiftKey: Date | string = new Date()
): CaravanDispatchPreview {
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === routeId) || CARAVAN_TRADE_ROUTES[0];
  const bonuses = getCaravanTradeBonuses(player);
  const scarcity = getCaravanRouteScarcity(route.id, nowOrShiftKey);
  const durationMs = Math.max(
    60 * 1000,
    Math.round(route.baseDurationMs * (1 - bonuses.durationReductionPct / 100))
  );

  const emptyPreview = (reason: string): CaravanDispatchPreview => ({
    ok: false,
    reason,
    routeId: route.id,
    shiftKey: scarcity.shiftKey,
    totalUnits: 0,
    maxCapacity: bonuses.maxCargoCapacity,
    baseCargoValue: 0,
    effectiveCargoValue: 0,
    favoredUnits: 0,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    hotMultiplier: scarcity.hotMultiplier,
    durationMs,
    expectedReward: { gold: 0, astralCrystalDust: 0, forgingEmblems: 0, caravanRep: 0 },
    itemBreakdown: [],
  });

  if (!VALID_CARAVAN_ROUTES.has(routeId)) {
    return emptyPreview("未知的远征贸易航路");
  }
  if (!cargo || typeof cargo !== "object") {
    return emptyPreview("请至少装载一种贸易货品");
  }

  const itemsMap = new Map<string, { id: string; name?: string; value?: number; type?: string; toolFor?: string }>(
    (((contentPack?.items as Array<any> | undefined) || [])).map((it) => [it.id, it])
  );

  const entries = Object.entries(cargo).filter(([, q]) => Number(q) > 0);
  if (entries.length === 0) {
    return emptyPreview("请至少装载一种贸易货品");
  }
  if (entries.length > CARAVAN_MAX_CARGO_TYPES) {
    return emptyPreview(`单辆商车最多混装 ${CARAVAN_MAX_CARGO_TYPES} 种货品`);
  }

  let totalUnits = 0;
  let baseCargoValue = 0;
  let rawEffectiveScore = 0;
  let favoredUnits = 0;
  const itemBreakdown: CaravanDispatchPreview["itemBreakdown"] = [];

  for (const [iid, rawQty] of entries) {
    if (!iid || iid === "gold") {
      return emptyPreview("金币不可作为货品装车");
    }
    const qty = Math.floor(Number(rawQty));
    if (!Number.isFinite(qty) || qty <= 0) {
      return emptyPreview("装车货品数量必须为正整数");
    }
    const itemDef = itemsMap.get(iid);
    if (contentPack?.items && !itemDef) {
      return emptyPreview(`未知的货品：${iid}`);
    }
    const idleHave = getIdleCargoCount(player, iid);
    if (qty > idleHave) {
      const nm = itemDef?.name || iid;
      return emptyPreview(`闲置「${nm}」不足（可装车 ${idleHave} 件，穿戴中装备已自动保护）`);
    }

    const unitValue = Math.max(4, Math.floor(Number(itemDef?.value || 8)));
    const cat = classifyCaravanCargoCategory(iid, itemDef);
    const isHot = scarcity.hotItemIds.includes(iid);
    const isFavored = isHot || cat === route.favoredCategory;
    const appliedMultiplier = isHot
      ? scarcity.hotMultiplier
      : isFavored
        ? scarcity.scarcityMultiplier
        : 1.0;

    const baseSub = unitValue * qty;
    const subtotalScore = Math.round(baseSub * appliedMultiplier * 100) / 100;
    totalUnits += qty;
    baseCargoValue += baseSub;
    rawEffectiveScore += subtotalScore;
    if (isFavored) favoredUnits += qty;

    itemBreakdown.push({
      itemId: iid,
      name: itemDef?.name || iid,
      qty,
      unitValue,
      appliedMultiplier,
      isFavored,
      isHot,
      subtotalScore,
    });
  }

  if (totalUnits > bonuses.maxCargoCapacity) {
    return emptyPreview(`超出商车最大载重（当前 ${totalUnits} / 上限 ${bonuses.maxCargoCapacity} 件）`);
  }
  if (baseCargoValue < CARAVAN_MIN_CARGO_VALUE) {
    return emptyPreview(`装车货品基础总值需满 ${CARAVAN_MIN_CARGO_VALUE} 金（当前 ${baseCargoValue} 金）`);
  }

  const ledgerMult = 1 + bonuses.tradeYieldPct / 100;
  const effectiveCargoValue = Math.round(rawEffectiveScore * ledgerMult);
  const favoredRatio = totalUnits > 0 ? favoredUnits / totalUnits : 0;

  const gold = Math.max(60, Math.round(effectiveCargoValue * route.goldReturnRatio));
  const astralCrystalDust = Math.max(
    route.baseDust,
    route.baseDust + Math.floor(effectiveCargoValue / route.dustDivisor)
  );
  const baseEmblems = Math.floor(effectiveCargoValue / route.emblemThreshold);
  const favoredBonusEmblem = favoredRatio >= 0.5 && effectiveCargoValue >= Math.round(route.emblemThreshold * 0.55) ? 1 : 0;
  const forgingEmblems = Math.min(4, baseEmblems + favoredBonusEmblem);
  const caravanRep = Math.max(
    route.baseRep,
    route.baseRep + Math.floor(effectiveCargoValue / 45)
  );

  return {
    ok: true,
    routeId: route.id,
    shiftKey: scarcity.shiftKey,
    totalUnits,
    maxCapacity: bonuses.maxCargoCapacity,
    baseCargoValue,
    effectiveCargoValue,
    favoredUnits,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    hotMultiplier: scarcity.hotMultiplier,
    durationMs,
    expectedReward: {
      gold,
      astralCrystalDust,
      forgingEmblems,
      caravanRep,
    },
    itemBreakdown,
  };
}

/** 派遣远征商车出发（支持消耗商队加急通行证立即抵达待领奖） */
export function dispatchCaravanWagon(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  params: {
    wagonSlot: number;
    routeId: string;
    cargo: Record<string, number>;
    useExpressPermit?: boolean;
  },
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  wagon?: CaravanWagonRun;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const bonuses = getCaravanTradeBonuses(player);
  const slot = Math.floor(Number(params.wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  if (slot >= bonuses.maxWagons) {
    return {
      ok: false,
      reason: `第 ${slot + 1} 号商车尚未解锁（提升商队声望至 Lv.${slot === 1 ? 3 : 5} 解锁）`,
    };
  }
  if (ct.wagons[slot]) {
    return { ok: false, reason: `第 ${slot + 1} 号商车正在执行航程或待领取收益` };
  }
  if (params.useExpressPermit && ct.expressPermits <= 0) {
    return { ok: false, reason: "商队加急通行证不足，无法立即加急发车" };
  }

  const preview = previewCaravanDispatch(player, contentPack, params.routeId, params.cargo, now);
  if (!preview.ok) {
    return { ok: false, reason: preview.reason || "装车校验未通过" };
  }

  const cleanCargo: Record<string, number> = {};
  for (const row of preview.itemBreakdown) {
    cleanCargo[row.itemId] = row.qty;
    player.inventory[row.itemId] = Math.max(0, Number(player.inventory[row.itemId] || 0) - row.qty);
    if (player.inventory[row.itemId] <= 0) delete player.inventory[row.itemId];
  }

  const startedAt = now.getTime();
  let usedExpress = false;
  let completesAt = startedAt + preview.durationMs;
  if (params.useExpressPermit) {
    ct.expressPermits -= 1;
    usedExpress = true;
    completesAt = startedAt;
  }

  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === preview.routeId)!;
  const wagon: CaravanWagonRun = {
    slot,
    routeId: preview.routeId,
    cargo: cleanCargo,
    startedAt,
    completesAt,
    scarcityMultiplier: preview.scarcityMultiplier,
    usedExpressPermit: usedExpress,
    expectedReward: preview.expectedReward,
  };
  ct.wagons[slot] = wagon;

  appendLog(
    player,
    `第 ${slot + 1} 号远征商车已启程前往「${route.name}」（紧缺系数 ${preview.scarcityMultiplier.toFixed(2)}x${usedExpress ? " · 加急通行证即刻抵达" : ""}）！`
  );
  return { ok: true, wagon };
}

/** 对在途商车使用 1 张商队加急通行证，立即完成航程进入可领奖状态 */
export function expediteCaravanWagon(
  player: EnhancedPlayerState,
  wagonSlot: number,
  now: Date = new Date()
): { ok: boolean; reason?: string; wagon?: CaravanWagonRun } {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const slot = Math.floor(Number(wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  const wagon = ct.wagons[slot];
  if (!wagon) {
    return { ok: false, reason: "该商车栏位当前没有在途商队" };
  }
  if (now.getTime() >= wagon.completesAt) {
    return { ok: false, reason: "该商车已抵达终点，请直接领取收益" };
  }
  if (ct.expressPermits <= 0) {
    return { ok: false, reason: "商队加急通行证不足" };
  }

  ct.expressPermits -= 1;
  wagon.completesAt = now.getTime();
  wagon.usedExpressPermit = true;
  appendLog(player, `使用商队加急通行证：第 ${slot + 1} 号远征商车已即刻返航抵达！`);
  return { ok: true, wagon };
}

/** 领取已返航商车的跨城镇贸易结算（异域星晶尘 + 稀有锻造徽记 + 金币 + 商队声望） */
export function claimCaravanWagon(
  player: EnhancedPlayerState,
  wagonSlot: number,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  reward?: CaravanRewardSummary;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const slot = Math.floor(Number(wagonSlot)) as CaravanWagonSlot;
  if (!VALID_WAGON_SLOTS.includes(slot)) {
    return { ok: false, reason: "无效的商车栏位" };
  }
  const wagon = ct.wagons[slot];
  if (!wagon) {
    return { ok: false, reason: "该栏位没有待结算的远征商车" };
  }
  if (now.getTime() < wagon.completesAt) {
    const remainSec = Math.ceil((wagon.completesAt - now.getTime()) / 1000);
    return { ok: false, reason: `商车尚在途中（剩余 ${remainSec} 秒，可使用加急通行证立即返航）` };
  }

  const prevLevel = getCaravanRepTier(ct.caravanRep).current.level;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const reward: CaravanRewardSummary = {
    gold: Math.round(wagon.expectedReward.gold * rewardMult),
    astralCrystalDust: Math.round(wagon.expectedReward.astralCrystalDust * rewardMult),
    forgingEmblems: wagon.expectedReward.forgingEmblems,
    caravanRep: Math.round(wagon.expectedReward.caravanRep * rewardMult),
  };
  delete ct.wagons[slot];

  player.inventory.gold = Number(player.inventory.gold || 0) + reward.gold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + reward.gold;
  ct.astralCrystalDust += reward.astralCrystalDust;
  if (reward.forgingEmblems > 0) {
    gh.forgingEmblems += reward.forgingEmblems;
  }
  ct.caravanRep += reward.caravanRep;
  ct.totalRunsCompleted += 1;
  addReputation(player, Math.max(5, Math.floor(reward.caravanRep / 3)));
  syncAchievements(player);

  const newLevel = getCaravanRepTier(ct.caravanRep).current.level;
  const route = CARAVAN_TRADE_ROUTES.find((r) => r.id === wagon.routeId);
  const emblemStr = reward.forgingEmblems > 0 ? `、稀有锻造徽记 +${reward.forgingEmblems}` : "";
  appendLog(
    player,
    `远征商车自「${route?.name || wagon.routeId}」满载归来：金币 +${reward.gold}、异域星晶尘 +${reward.astralCrystalDust}${emblemStr}、商队声望 +${reward.caravanRep}！`
  );
  if (newLevel > prevLevel) {
    const tierDef = getCaravanRepTier(ct.caravanRep).current;
    appendLog(
      player,
      `商队声望晋升至 Lv.${newLevel}「${tierDef.title}」！商车编制上限 ${tierDef.maxWagons} 辆，永久采集/制作/金币加成同步提升！`
    );
  }

  return {
    ok: true,
    reward,
    ...(newLevel > prevLevel ? { leveledUpTo: newLevel } : {}),
  };
}

/** 交付「工坊特批契约柜台」订单（校验闲置物资，保护已穿戴装备） */
export function fulfillWorkshopContract(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  contractId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  contract?: WorkshopSupplyContractInstance;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const board = ct.contractsBoard!;
  const contract = board.contracts.find((c) => c.id === contractId);
  if (!contract) {
    return { ok: false, reason: "未找到指定的工坊特批契约" };
  }
  if (contract.fulfilled) {
    return { ok: false, reason: "该工坊特批契约已交付完成" };
  }

  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  for (const [iid, needQty] of Object.entries(contract.demands)) {
    const idleHave = getIdleCargoCount(player, iid);
    if (idleHave < needQty) {
      const nm = itemsById.get(iid) || iid;
      return { ok: false, reason: `闲置「${nm}」不足（需 ${needQty} 件，当前可交付 ${idleHave} 件）` };
    }
  }

  for (const [iid, needQty] of Object.entries(contract.demands)) {
    player.inventory[iid] = Math.max(0, Number(player.inventory[iid] || 0) - needQty);
    if (player.inventory[iid] <= 0) delete player.inventory[iid];
  }

  contract.fulfilled = true;
  ct.totalContractsFulfilled += 1;
  const rw = contract.reward;
  const alchemyRewardPct =
    getAlchemyCauldronBonuses(player).caravanBountyRewardPct +
    getAstralRelicsBonuses(player).caravanBountyRewardPct;
  const rewardMult = 1 + alchemyRewardPct / 100;
  const settledGold = Math.round(rw.gold * rewardMult);
  const settledDust = Math.round(rw.astralCrystalDust * rewardMult);
  const settledRep = Math.round(rw.caravanRep * rewardMult);
  player.inventory.gold = Number(player.inventory.gold || 0) + settledGold;
  if (player.stats) player.stats.totalGoldEarned = (player.stats.totalGoldEarned || 0) + settledGold;
  ct.astralCrystalDust += settledDust;
  gh.forgingEmblems += rw.forgingEmblems;
  gh.honorPoints += rw.honorPoints;
  gh.totalHonorEarned += rw.honorPoints;
  ct.expressPermits += rw.expressPermits;
  ct.caravanRep += settledRep;
  addReputation(player, Math.max(5, Math.floor(settledRep / 3)));
  syncAchievements(player);

  appendLog(
    player,
    `交付工坊特批契约「${contract.name}」：异域星晶尘 +${settledDust}、锻造徽记 +${rw.forgingEmblems}、公会荣誉 +${rw.honorPoints}${rw.expressPermits > 0 ? `、加急通行证 +${rw.expressPermits}` : ""}！`
  );
  return { ok: true, contract };
}

/** 刷新「工坊特批契约柜台」4 份轮换订单 */
export function rerollWorkshopContracts(
  player: EnhancedPlayerState,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  cost?: number;
  rerollsRemaining?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const board = ct.contractsBoard!;
  if (board.rerollsUsed >= CARAVAN_CONTRACT_MAX_REROLLS) {
    return { ok: false, reason: `今日工坊契约柜台刷新次数已达上限（${CARAVAN_CONTRACT_MAX_REROLLS} 次）` };
  }
  const goldNow = Number(player.inventory.gold || 0);
  if (goldNow < CARAVAN_CONTRACT_REROLL_COST) {
    return { ok: false, reason: `金币不足（刷新需 ${CARAVAN_CONTRACT_REROLL_COST} 金币）` };
  }

  player.inventory.gold = goldNow - CARAVAN_CONTRACT_REROLL_COST;
  if (player.stats) player.stats.totalGoldSpent = (player.stats.totalGoldSpent || 0) + CARAVAN_CONTRACT_REROLL_COST;
  board.rerollsUsed += 1;
  const nextSeed = buildWorkshopContractSeedKey(board.date, board.rerollsUsed);
  board.seedKey = nextSeed;
  board.contracts = generateWorkshopContractsForSeed(nextSeed);
  appendLog(player, `已调阅新一轮工坊特批契约柜台订单（消耗 ${CARAVAN_CONTRACT_REROLL_COST} 金币）`);
  return {
    ok: true,
    cost: CARAVAN_CONTRACT_REROLL_COST,
    rerollsRemaining: Math.max(0, CARAVAN_CONTRACT_MAX_REROLLS - board.rerollsUsed),
  };
}

/** 异域星晶尘兑换所：升级永久「远征宗师商典」或兑换锻造徽记 / 晶簇补给 / 加急通行证 */
export function redeemAstralDustExchange(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  offerId: string,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  offerId?: string;
  dustSpent?: number;
  newLedgerRank?: number;
} {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);

  if (offerId === "ledger_upgrade") {
    if (ct.ledgerRank >= CARAVAN_MAX_LEDGER_RANK) {
      return { ok: false, reason: "远征宗师商典已升至最高等阶" };
    }
    const cost = CARAVAN_LEDGER_COSTS[ct.ledgerRank];
    if (ct.astralCrystalDust < cost) {
      return { ok: false, reason: `异域星晶尘不足（升阶需 ${cost} 晶尘，当前 ${ct.astralCrystalDust}）` };
    }
    ct.astralCrystalDust -= cost;
    ct.ledgerRank += 1;
    appendLog(
      player,
      `远征宗师商典升至第 ${ct.ledgerRank} 阶！永久提升商队货值结算、缩短航程耗时并增强采集/制作/金币收益！`
    );
    return {
      ok: true,
      offerId,
      dustSpent: cost,
      newLedgerRank: ct.ledgerRank,
    };
  }

  const offer = ASTRAL_DUST_EXCHANGE_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    return { ok: false, reason: "未知的星晶尘兑换条目" };
  }
  const usedToday = ct.dailyDustExchanges?.counts[offer.id] || 0;
  if (offer.dailyLimit !== undefined && usedToday >= offer.dailyLimit) {
    return { ok: false, reason: `「${offer.name}」今日兑换次数已达上限（${offer.dailyLimit} 次）` };
  }
  if (ct.astralCrystalDust < offer.dustCost) {
    return { ok: false, reason: `异域星晶尘不足（需 ${offer.dustCost} 晶尘，当前 ${ct.astralCrystalDust}）` };
  }

  ct.astralCrystalDust -= offer.dustCost;
  ct.dailyDustExchanges!.counts[offer.id] = usedToday + 1;

  if (offer.emblemsOut) {
    gh.forgingEmblems += offer.emblemsOut;
  }
  if (offer.expressPermitsOut) {
    ct.expressPermits += offer.expressPermitsOut;
  }
  if (offer.itemsOut) {
    for (const [iid, qty] of Object.entries(offer.itemsOut)) {
      if (qty > 0) {
        player.inventory[iid] = Number(player.inventory[iid] || 0) + qty;
        recordCodexItemUnlock(player, iid);
      }
    }
  }
  syncHeritageCodex(player);
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );
  const detailParts: string[] = [];
  if (offer.emblemsOut) detailParts.push(`稀有锻造徽记 ×${offer.emblemsOut}`);
  if (offer.expressPermitsOut) detailParts.push(`商队加急通行证 ×${offer.expressPermitsOut}`);
  if (offer.itemsOut) {
    for (const [iid, q] of Object.entries(offer.itemsOut)) {
      detailParts.push(`${itemsById.get(iid) || iid} ×${q}`);
    }
  }
  appendLog(player, `在星晶尘兑换所换取「${offer.name}」：获得 ${detailParts.join("、")}！`);
  return {
    ok: true,
    offerId: offer.id,
    dustSpent: offer.dustCost,
  };
}

/** 构造前端「远征商队贸易航路与工坊特批契约柜台」面板完整视图数据 */
export function getCaravanTradeInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const ct = ensureCaravanTrade(player, now);
  const gh = ensureGuildHonor(player);
  const bonuses = getCaravanTradeBonuses(player);
  const repTierInfo = getCaravanRepTier(ct.caravanRep);
  const shiftKey = buildCaravanScarcityShiftKey(now);

  const itemsList = ((contentPack?.items as Array<{
    id: string;
    name?: string;
    value?: number;
    tier?: number;
    type?: string;
    toolFor?: string;
  }> | undefined) || []);
  const itemsMap = new Map(itemsList.map((it) => [it.id, it]));

  const routes = CARAVAN_TRADE_ROUTES.map((r) => {
    const sc = getCaravanRouteScarcity(r.id, shiftKey);
    const effectiveDurationMs = Math.max(
      60 * 1000,
      Math.round(r.baseDurationMs * (1 - bonuses.durationReductionPct / 100))
    );
    return {
      ...r,
      effectiveDurationMs,
      scarcityMultiplier: sc.scarcityMultiplier,
      hotMultiplier: sc.hotMultiplier,
      hotItems: sc.hotItemIds.map((iid) => ({
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        idleHave: getIdleCargoCount(player, iid),
      })),
    };
  });

  const wagonSlots = VALID_WAGON_SLOTS.map((slot) => {
    const unlocked = slot < bonuses.maxWagons;
    const requiredRepLevel = slot === 0 ? 1 : slot === 1 ? 3 : 5;
    const run = ct.wagons[slot] || null;
    if (!run) {
      return {
        slot,
        unlocked,
        requiredRepLevel,
        status: unlocked ? ("idle" as const) : ("locked" as const),
        run: null,
      };
    }
    const ready = now.getTime() >= run.completesAt;
    const routeDef = CARAVAN_TRADE_ROUTES.find((r) => r.id === run.routeId);
    return {
      slot,
      unlocked,
      requiredRepLevel,
      status: ready ? ("ready" as const) : ("in_transit" as const),
      run: {
        ...run,
        routeName: routeDef?.name || run.routeId,
        routeIconId: routeDef?.iconId || "caravan_hub_banner",
        remainingMs: Math.max(0, run.completesAt - now.getTime()),
        cargoItems: Object.entries(run.cargo).map(([iid, qty]) => ({
          itemId: iid,
          name: itemsMap.get(iid)?.name || iid,
          qty,
        })),
      },
    };
  });

  const idleCargoCatalog = Object.keys(player.inventory || {})
    .filter((iid) => iid !== "gold")
    .map((iid) => {
      const idleQty = getIdleCargoCount(player, iid);
      if (idleQty <= 0) return null;
      const def = itemsMap.get(iid);
      const unitValue = Math.max(4, Math.floor(Number(def?.value || 8)));
      const category = classifyCaravanCargoCategory(iid, def);
      return {
        itemId: iid,
        name: def?.name || iid,
        idleQty,
        unitValue,
        tier: Number(def?.tier || 1),
        category,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.unitValue - a.unitValue || a.itemId.localeCompare(b.itemId));

  const board = ct.contractsBoard!;
  const contracts = board.contracts.map((c) => {
    const demandList = Object.entries(c.demands).map(([iid, need]) => ({
      itemId: iid,
      name: itemsMap.get(iid)?.name || iid,
      need,
      have: getIdleCargoCount(player, iid),
    }));
    const canFulfill = !c.fulfilled && demandList.every((d) => d.have >= d.need);
    return {
      ...c,
      demandList,
      canFulfill,
    };
  });

  const ledgerUpgrade = {
    rank: ct.ledgerRank,
    maxRank: CARAVAN_MAX_LEDGER_RANK,
    isMax: ct.ledgerRank >= CARAVAN_MAX_LEDGER_RANK,
    nextDustCost: ct.ledgerRank < CARAVAN_MAX_LEDGER_RANK ? CARAVAN_LEDGER_COSTS[ct.ledgerRank] : null,
    canAfford:
      ct.ledgerRank < CARAVAN_MAX_LEDGER_RANK &&
      ct.astralCrystalDust >= CARAVAN_LEDGER_COSTS[ct.ledgerRank],
  };

  const dustOffers = ASTRAL_DUST_EXCHANGE_OFFERS.map((o) => {
    const usedToday = ct.dailyDustExchanges?.counts[o.id] || 0;
    const remainingToday = o.dailyLimit !== undefined ? Math.max(0, o.dailyLimit - usedToday) : null;
    const canAfford =
      ct.astralCrystalDust >= o.dustCost && (remainingToday === null || remainingToday > 0);
    return {
      ...o,
      usedToday,
      remainingToday,
      canAfford,
      itemList: Object.entries(o.itemsOut || {}).map(([iid, qty]) => ({
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        qty,
      })),
    };
  });

  return {
    nowMs: now.getTime(),
    shiftKey,
    gold: Number(player.inventory.gold || 0),
    astralCrystalDust: ct.astralCrystalDust,
    forgingEmblems: gh.forgingEmblems,
    honorPoints: gh.honorPoints,
    expressPermits: ct.expressPermits,
    caravanRep: ct.caravanRep,
    totalRunsCompleted: ct.totalRunsCompleted,
    totalContractsFulfilled: ct.totalContractsFulfilled,
    reputationTier: {
      level: repTierInfo.current.level,
      title: repTierInfo.current.title,
      minRep: repTierInfo.current.minRep,
      nextLevelRep: repTierInfo.next?.minRep ?? null,
      nextTitle: repTierInfo.next?.title ?? null,
      progressPct: repTierInfo.progressPct,
      allTiers: CARAVAN_REP_TIERS,
    },
    bonuses,
    routes,
    wagonSlots,
    idleCargoCatalog,
    contractsBoard: {
      date: board.date,
      rerollsUsed: board.rerollsUsed,
      rerollsRemaining: Math.max(0, CARAVAN_CONTRACT_MAX_REROLLS - board.rerollsUsed),
      rerollCost: CARAVAN_CONTRACT_REROLL_COST,
      contracts,
    },
    exchange: {
      ledgerUpgrade,
      offers: dustOffers,
    },
  };
}
