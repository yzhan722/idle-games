// 进阶进度 · 奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽 (WL-8)
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type {
  EnhancedContentPack,
  EnhancedPlayerState,
  AlchemicalPotionId,
  PotionBrewMode,
  RecipeUpgradeMode,
  ResonanceSlotIndex,
  AlchemyCauldronState,
} from "../types";
import { ensurePlayerExtensions, appendLog } from "../storage";
import { syncAchievements } from "../progression";
import { todayLocal } from "../time";
import { addReputation } from "./reputation";
import { ensureCaravanTrade, getIdleCargoCount } from "./caravan_trade";
import { getAstralRelicsBonuses } from "./astral_relics";

/* ============================ 奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽 (WL-8) ============================ */

export const ALCHEMICAL_POTION_IDS: readonly AlchemicalPotionId[] = [
  "dragon_fury",
  "elven_bounty",
  "dwarven_temper",
  "astral_fortune",
];

export const ALCHEMY_MAX_RECIPE_RANK = 5;
export const ALCHEMY_MAX_CHARGES = 120;
export const ALCHEMY_DAILY_FREE_EXTRACTIONS = 2;
export const ALCHEMY_ESSENCE_PER_EXTRACTION = 2;
export const ALCHEMY_EXTRACTION_POINTS = 6;

export const ALCHEMY_BREW_ESSENCE_COST = 1;
export const ALCHEMY_BREW_ESSENCE_CHARGES = 6;
export const ALCHEMY_BREW_ESSENCE_POINTS = 10;

export const ALCHEMY_BREW_MATERIAL_CHARGES = 6;
export const ALCHEMY_BREW_MATERIAL_POINTS = 12;

export const ALCHEMY_BREW_ASTRAL_DUST_COST = 4;
export const ALCHEMY_BREW_ASTRAL_DUST_CHARGES = 12;
export const ALCHEMY_BREW_ASTRAL_DUST_POINTS = 22;

export interface CauldronMasteryTierDef {
  level: number;
  minPoints: number;
  title: string;
  combatAtkPct: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  potionBuffPct: number;
  batchBonusCharges: number;
}

export const CAULDRON_MASTERY_TIERS: readonly CauldronMasteryTierDef[] = [
  {
    level: 1,
    minPoints: 0,
    title: "初火学徒",
    combatAtkPct: 0,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    potionBuffPct: 0,
    batchBonusCharges: 0,
  },
  {
    level: 2,
    minPoints: 30,
    title: "萃灵药师",
    combatAtkPct: 2,
    gatherSpeedPct: 3,
    craftSpeedPct: 3,
    goldGainPct: 3,
    potionBuffPct: 4,
    batchBonusCharges: 1,
  },
  {
    level: 3,
    minPoints: 90,
    title: "奇美拉司炉",
    combatAtkPct: 4,
    gatherSpeedPct: 6,
    craftSpeedPct: 6,
    goldGainPct: 6,
    potionBuffPct: 8,
    batchBonusCharges: 1,
  },
  {
    level: 4,
    minPoints: 200,
    title: "秘釜炼金导师",
    combatAtkPct: 7,
    gatherSpeedPct: 10,
    craftSpeedPct: 10,
    goldGainPct: 10,
    potionBuffPct: 12,
    batchBonusCharges: 2,
  },
  {
    level: 5,
    minPoints: 380,
    title: "深渊魔药大宗师",
    combatAtkPct: 10,
    gatherSpeedPct: 14,
    craftSpeedPct: 14,
    goldGainPct: 15,
    potionBuffPct: 16,
    batchBonusCharges: 3,
  },
  {
    level: 6,
    minPoints: 620,
    title: "奇美拉圣釜贤者",
    combatAtkPct: 14,
    gatherSpeedPct: 19,
    craftSpeedPct: 19,
    goldGainPct: 20,
    potionBuffPct: 22,
    batchBonusCharges: 4,
  },
];

export interface AlchemicalPotionLevelStats {
  combatAtkPct?: number;
  bossArmorBreakPct?: number;
  gatherDoubleChance?: number;
  gatherSpeedPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  goldGainPct?: number;
  caravanBountyRewardPct?: number;
}

export interface AlchemicalPotionDef {
  id: AlchemicalPotionId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  materialBrewCost: {
    gold: number;
    items: Record<string, number>;
  };
  levels: readonly [
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
    AlchemicalPotionLevelStats,
  ];
}

export const ALCHEMICAL_POTIONS: readonly AlchemicalPotionDef[] = [
  {
    id: "dragon_fury",
    name: "巨龙狂怒药剂",
    subtitle: "战斗攻击增幅 · 首领护甲破防",
    description: "融汇赤鳞火晶与矿脉精粹的狂怒秘药，大幅强化战斗攻击百分比并撕裂深渊首领护甲。",
    iconId: "potion_dragon_fury",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { ore_1: 4, crystal_1: 2 },
    },
    levels: [
      { combatAtkPct: 6, bossArmorBreakPct: 0.08 },
      { combatAtkPct: 9, bossArmorBreakPct: 0.12 },
      { combatAtkPct: 12, bossArmorBreakPct: 0.16 },
      { combatAtkPct: 16, bossArmorBreakPct: 0.21 },
      { combatAtkPct: 20, bossArmorBreakPct: 0.26 },
    ],
  },
  {
    id: "elven_bounty",
    name: "精灵丰饶灵液",
    subtitle: "双倍采集 · 采集极速丰收",
    description: "凝结晨露森林生机的翠绿灵液，显著提升全采集动作速度并赋予高额双倍产出几率。",
    iconId: "potion_elven_bounty",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { wood_1: 6, fiber_1: 4 },
    },
    levels: [
      { gatherDoubleChance: 0.06, gatherSpeedPct: 8 },
      { gatherDoubleChance: 0.09, gatherSpeedPct: 12 },
      { gatherDoubleChance: 0.13, gatherSpeedPct: 16 },
      { gatherDoubleChance: 0.17, gatherSpeedPct: 21 },
      { gatherDoubleChance: 0.22, gatherSpeedPct: 27 },
    ],
  },
  {
    id: "dwarven_temper",
    name: "矮人巧匠淬火油",
    subtitle: "工坊制作加速 · 神匠连作",
    description: "矮人炉火秘传的符文淬火金油，全面加快工坊制造节奏并提高神匠免费连作效率。",
    iconId: "potion_dwarven_temper",
    maxRank: 5,
    materialBrewCost: {
      gold: 120,
      items: { wood_1: 4, ore_1: 4 },
    },
    levels: [
      { craftSpeedPct: 8, craftEfficiencyPct: 6 },
      { craftSpeedPct: 12, craftEfficiencyPct: 10 },
      { craftSpeedPct: 16, craftEfficiencyPct: 14 },
      { craftSpeedPct: 21, craftEfficiencyPct: 19 },
      { craftSpeedPct: 27, craftEfficiencyPct: 25 },
    ],
  },
  {
    id: "astral_fortune",
    name: "星界幸运秘药",
    subtitle: "单人战斗金币 · 商队与委托加奖",
    description: "封存星轨流光的幸运星瓶，提升单人战斗金币，并放大远征商队与公会委托的金币、星晶尘与声望。",
    iconId: "potion_astral_fortune",
    maxRank: 5,
    materialBrewCost: {
      gold: 140,
      items: { fiber_1: 4, crystal_1: 3 },
    },
    levels: [
      { goldGainPct: 8, caravanBountyRewardPct: 8 },
      { goldGainPct: 12, caravanBountyRewardPct: 12 },
      { goldGainPct: 17, caravanBountyRewardPct: 16 },
      { goldGainPct: 22, caravanBountyRewardPct: 21 },
      { goldGainPct: 28, caravanBountyRewardPct: 26 },
    ],
  },
];

export interface RecipeUpgradeCostTier {
  targetRank: 2 | 3 | 4 | 5;
  cauldronPoints: number;
  standard: {
    gold: number;
    alchemicalEssence: number;
    crystals: Record<string, number>;
  };
  astralDust: {
    gold: number;
    astralCrystalDust: number;
  };
}

export const ALCHEMY_RECIPE_UPGRADE_COSTS: readonly RecipeUpgradeCostTier[] = [
  {
    targetRank: 2,
    cauldronPoints: 35,
    standard: { gold: 400, alchemicalEssence: 2, crystals: { crystal_1: 3 } },
    astralDust: { gold: 250, astralCrystalDust: 8 },
  },
  {
    targetRank: 3,
    cauldronPoints: 55,
    standard: { gold: 1000, alchemicalEssence: 3, crystals: { crystal_1: 6, crystal_2: 2 } },
    astralDust: { gold: 600, astralCrystalDust: 16 },
  },
  {
    targetRank: 4,
    cauldronPoints: 80,
    standard: { gold: 2400, alchemicalEssence: 5, crystals: { crystal_2: 5, crystal_3: 2 } },
    astralDust: { gold: 1400, astralCrystalDust: 28 },
  },
  {
    targetRank: 5,
    cauldronPoints: 120,
    standard: { gold: 5200, alchemicalEssence: 8, crystals: { crystal_3: 5, crystal_4: 2 } },
    astralDust: { gold: 3000, astralCrystalDust: 45 },
  },
];

export interface TwinAlchemicalResonanceDef {
  id: string;
  pairKey: string;
  pair: [AlchemicalPotionId, AlchemicalPotionId];
  name: string;
  subtitle: string;
  description: string;
  baseBonuses: {
    bonusAtk?: number;
    bonusDef?: number;
    bonusHp?: number;
    combatAtkPct?: number;
    armorPenPct?: number;
    bossArmorBreakPct?: number;
    intervalReductionPct?: number;
    critRateBonusPct?: number;
    critDmgBonusPct?: number;
    gatherSpeedPct?: number;
    gatherDoubleChance?: number;
    craftSpeedPct?: number;
    craftEfficiencyPct?: number;
    goldGainPct?: number;
    rareFindPct?: number;
    caravanBountyRewardPct?: number;
  };
}

export const TWIN_ALCHEMICAL_RESONANCES: readonly TwinAlchemicalResonanceDef[] = [
  {
    id: "res_forge_dragonflame",
    pairKey: "dragon_fury+dwarven_temper",
    pair: ["dragon_fury", "dwarven_temper"],
    name: "熔炉龙炎共鸣",
    subtitle: "巨龙狂怒 × 矮人淬火 · 破甲锻炎",
    description: "龙炎贯注矮人神铁，同时强化战斗攻击、全目标破甲、首领破防与工坊锻造效率。",
    baseBonuses: {
      combatAtkPct: 6,
      armorPenPct: 0.08,
      bossArmorBreakPct: 0.08,
      craftSpeedPct: 8,
      craftEfficiencyPct: 6,
    },
  },
  {
    id: "res_starwood_bounty",
    pairKey: "astral_fortune+elven_bounty",
    pair: ["elven_bounty", "astral_fortune"],
    name: "星森丰饶共鸣",
    subtitle: "精灵丰饶 × 星界幸运 · 万物赐福",
    description: "星辉洒落古树灵泉，大幅提高双倍采集、采集速度、单人战斗金币、战斗稀有掉落与商队悬赏收益。",
    baseBonuses: {
      gatherDoubleChance: 0.07,
      gatherSpeedPct: 10,
      goldGainPct: 10,
      caravanBountyRewardPct: 10,
      rareFindPct: 10,
    },
  },
  {
    id: "res_wildhunt_fang",
    pairKey: "dragon_fury+elven_bounty",
    pair: ["dragon_fury", "elven_bounty"],
    name: "荒野猎龙共鸣",
    subtitle: "巨龙狂怒 × 精灵丰饶 · 疾风追猎",
    description: "林间疾风助燃狂龙血脉，缩短普攻间隔并提升组队暴击率、战斗攻击与野外采集效率。",
    baseBonuses: {
      combatAtkPct: 5,
      critRateBonusPct: 4,
      intervalReductionPct: 5,
      gatherDoubleChance: 0.05,
      gatherSpeedPct: 8,
    },
  },
  {
    id: "res_starfall_slayer",
    pairKey: "astral_fortune+dragon_fury",
    pair: ["dragon_fury", "astral_fortune"],
    name: "星陨讨魔共鸣",
    subtitle: "巨龙狂怒 × 星界幸运 · 猎首圣辉",
    description: "星陨之力聚焦讨伐锋芒，提升攻击力、首领破防与组队暴击伤害，并放大单人战斗金币与稀有掉落。",
    baseBonuses: {
      combatAtkPct: 6,
      bossArmorBreakPct: 0.1,
      critDmgBonusPct: 18,
      goldGainPct: 12,
      rareFindPct: 12,
    },
  },
  {
    id: "res_verdant_artisan",
    pairKey: "dwarven_temper+elven_bounty",
    pair: ["elven_bounty", "dwarven_temper"],
    name: "万匠生机共鸣",
    subtitle: "精灵丰饶 × 矮人淬火 · 百工常青",
    description: "森灵生机滋养工坊炉火，采集与制作全链路提速增产，并额外巩固生命与护甲。",
    baseBonuses: {
      gatherSpeedPct: 9,
      gatherDoubleChance: 0.06,
      craftSpeedPct: 9,
      craftEfficiencyPct: 8,
      bonusHp: 35,
      bonusDef: 5,
    },
  },
  {
    id: "res_astral_gilded_forge",
    pairKey: "astral_fortune+dwarven_temper",
    pair: ["dwarven_temper", "astral_fortune"],
    name: "星辉秘锻共鸣",
    subtitle: "矮人淬火 × 星界幸运 · 点金圣炉",
    description: "星界气运加持神匠淬火，提升制作极速与连作率，同时加成单人战斗金币、商队悬赏与攻防基础。",
    baseBonuses: {
      craftSpeedPct: 10,
      craftEfficiencyPct: 8,
      goldGainPct: 11,
      caravanBountyRewardPct: 12,
      bonusAtk: 5,
      bonusDef: 4,
    },
  },
];

export function isValidAlchemicalPotionId(id: unknown): id is AlchemicalPotionId {
  return typeof id === "string" && (ALCHEMICAL_POTION_IDS as readonly string[]).includes(id);
}

export function buildTwinResonanceKey(
  slotA?: AlchemicalPotionId | string | null,
  slotB?: AlchemicalPotionId | string | null
): string | null {
  if (!isValidAlchemicalPotionId(slotA) || !isValidAlchemicalPotionId(slotB)) return null;
  if (slotA === slotB) return null;
  return [slotA, slotB].sort().join("+");
}

export function findTwinResonance(
  slotA?: AlchemicalPotionId | string | null,
  slotB?: AlchemicalPotionId | string | null
): TwinAlchemicalResonanceDef | null {
  const key = buildTwinResonanceKey(slotA, slotB);
  if (!key) return null;
  return TWIN_ALCHEMICAL_RESONANCES.find((r) => r.pairKey === key) || null;
}

export function scaleTwinResonanceBonuses(def: TwinAlchemicalResonanceDef, resonanceTier: number) {
  const tier = Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.max(1, Math.floor(resonanceTier || 1)));
  const mult = 1 + (tier - 1) * 0.15;
  const b = def.baseBonuses;
  return {
    bonusAtk: b.bonusAtk ? Math.round(b.bonusAtk * mult) : 0,
    bonusDef: b.bonusDef ? Math.round(b.bonusDef * mult) : 0,
    bonusHp: b.bonusHp ? Math.round(b.bonusHp * mult) : 0,
    combatAtkPct: b.combatAtkPct ? Math.round(b.combatAtkPct * mult) : 0,
    armorPenPct: b.armorPenPct ? Math.round(b.armorPenPct * mult * 1000) / 1000 : 0,
    bossArmorBreakPct: b.bossArmorBreakPct ? Math.round(b.bossArmorBreakPct * mult * 1000) / 1000 : 0,
    intervalReductionPct: b.intervalReductionPct ? Math.round(b.intervalReductionPct * mult * 10) / 10 : 0,
    critRateBonusPct: b.critRateBonusPct ? Math.round(b.critRateBonusPct * mult * 10) / 10 : 0,
    critDmgBonusPct: b.critDmgBonusPct ? Math.round(b.critDmgBonusPct * mult) : 0,
    gatherSpeedPct: b.gatherSpeedPct ? Math.round(b.gatherSpeedPct * mult) : 0,
    gatherDoubleChance: b.gatherDoubleChance ? Math.round(b.gatherDoubleChance * mult * 1000) / 1000 : 0,
    craftSpeedPct: b.craftSpeedPct ? Math.round(b.craftSpeedPct * mult) : 0,
    craftEfficiencyPct: b.craftEfficiencyPct ? Math.round(b.craftEfficiencyPct * mult) : 0,
    goldGainPct: b.goldGainPct ? Math.round(b.goldGainPct * mult) : 0,
    rareFindPct: b.rareFindPct ? Math.round(b.rareFindPct * mult) : 0,
    caravanBountyRewardPct: b.caravanBountyRewardPct ? Math.round(b.caravanBountyRewardPct * mult) : 0,
  };
}

export function getCauldronMasteryTier(cauldronPoints: number, storedRank?: number) {
  const rawPts = Number.isFinite(cauldronPoints) && cauldronPoints > 0 ? Math.floor(cauldronPoints) : 0;
  const rankFloor =
    typeof storedRank === "number" && Number.isFinite(storedRank) && storedRank >= 1
      ? CAULDRON_MASTERY_TIERS[Math.min(CAULDRON_MASTERY_TIERS.length, Math.floor(storedRank)) - 1]?.minPoints || 0
      : 0;
  const pts = Math.max(rawPts, rankFloor);

  let current = CAULDRON_MASTERY_TIERS[0];
  for (const t of CAULDRON_MASTERY_TIERS) {
    if (pts >= t.minPoints) current = t;
  }
  const next = CAULDRON_MASTERY_TIERS.find((t) => t.level === current.level + 1) || null;
  const progressPct = !next
    ? 100
    : Math.min(
        100,
        Math.max(0, Math.floor(((pts - current.minPoints) / Math.max(1, next.minPoints - current.minPoints)) * 100))
      );
  return { current, next, progressPct, effectivePoints: pts };
}

export interface AlchemyCauldronBonuses {
  cauldronRank: number;
  cauldronTitle: string;
  batchBonusCharges: number;
  activePotions: AlchemicalPotionId[];
  activeResonanceId: string | null;
  activeResonanceName: string | null;
  resonanceTier: number;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  goldGainPct: number;
  rareFindPct: number;
  caravanBountyRewardPct: number;
}

export function getAlchemyCauldronBonuses(
  player?: Pick<EnhancedPlayerState, "alchemyCauldron"> | null
): AlchemyCauldronBonuses {
  const ac = player?.alchemyCauldron as
    | {
        recipeRanks?: Partial<Record<string, number>> | null;
        potionCharges?: Partial<Record<string, number>> | null;
        equippedPotions?: ReadonlyArray<string | null | undefined> | null;
        totalBrews?: number;
        totalUpgrades?: number;
        cauldronPoints?: number;
        alchemyCauldronRank?: number;
      }
    | undefined
    | null;

  if (!ac || typeof ac !== "object") {
    return {
      cauldronRank: 1,
      cauldronTitle: CAULDRON_MASTERY_TIERS[0].title,
      batchBonusCharges: 0,
      activePotions: [],
      activeResonanceId: null,
      activeResonanceName: null,
      resonanceTier: 0,
      bonusAtk: 0,
      bonusDef: 0,
      bonusHp: 0,
      combatAtkPct: 0,
      armorPenPct: 0,
      bossArmorBreakPct: 0,
      intervalMult: 1,
      critRateBonusPct: 0,
      critDmgBonusPct: 0,
      potionBuffMult: 1,
      gatherSpeedPct: 0,
      gatherDoubleChance: 0,
      craftSpeedPct: 0,
      craftEfficiencyPct: 0,
      goldGainPct: 0,
      rareFindPct: 0,
      caravanBountyRewardPct: 0,
    };
  }

  const cleanBrews = Number.isFinite(Number(ac.totalBrews)) && Number(ac.totalBrews) > 0 ? Math.floor(Number(ac.totalBrews)) : 0;
  const cleanUpgrades =
    Number.isFinite(Number(ac.totalUpgrades)) && Number(ac.totalUpgrades) > 0 ? Math.floor(Number(ac.totalUpgrades)) : 0;
  const rawPoints = Number.isFinite(Number(ac.cauldronPoints)) && Number(ac.cauldronPoints) > 0 ? Math.floor(Number(ac.cauldronPoints)) : 0;
  const derivedPoints = Math.max(rawPoints, cleanBrews * ALCHEMY_BREW_ESSENCE_POINTS + cleanUpgrades * 35);
  const { current: tier } = getCauldronMasteryTier(derivedPoints, ac.alchemyCauldronRank);

  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = tier.combatAtkPct;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let intervalMult = 1;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  const potionBuffMult = tier.potionBuffPct > 0 ? Math.round((1 + tier.potionBuffPct / 100) * 1000) / 1000 : 1;
  let gatherSpeedPct = tier.gatherSpeedPct;
  let gatherDoubleChance = 0;
  let craftSpeedPct = tier.craftSpeedPct;
  let craftEfficiencyPct = 0;
  let goldGainPct = tier.goldGainPct;
  let rareFindPct = 0;
  let caravanBountyRewardPct = 0;

  const hasChargesObj = ac.potionCharges !== undefined && ac.potionCharges !== null && typeof ac.potionCharges === "object";
  const rawSlots = Array.isArray(ac.equippedPotions) ? ac.equippedPotions : [];
  const activePotions: AlchemicalPotionId[] = [];
  const seen = new Set<AlchemicalPotionId>();

  const getRank = (pid: AlchemicalPotionId): number => {
    const r = Number(ac.recipeRanks?.[pid] ?? 1);
    if (!Number.isFinite(r) || r < 1) return 1;
    return Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.floor(r));
  };

  for (let i = 0; i < 2; i++) {
    const candidate = rawSlots[i];
    if (!isValidAlchemicalPotionId(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    const charges = hasChargesObj
      ? Math.max(0, Math.floor(Number((ac.potionCharges as Record<string, unknown>)[candidate] || 0)))
      : 1;
    if (charges <= 0) continue;

    activePotions.push(candidate);
    const meta = ALCHEMICAL_POTIONS.find((p) => p.id === candidate);
    if (!meta) continue;
    const rank = getRank(candidate);
    const lvStats = meta.levels[rank - 1];
    if (lvStats.combatAtkPct) combatAtkPct += lvStats.combatAtkPct;
    if (lvStats.bossArmorBreakPct) {
      bossArmorBreakPct = Math.min(0.65, Math.round((bossArmorBreakPct + lvStats.bossArmorBreakPct) * 1000) / 1000);
    }
    if (lvStats.gatherDoubleChance) {
      gatherDoubleChance = Math.min(0.65, Math.round((gatherDoubleChance + lvStats.gatherDoubleChance) * 1000) / 1000);
    }
    if (lvStats.gatherSpeedPct) gatherSpeedPct += lvStats.gatherSpeedPct;
    if (lvStats.craftSpeedPct) craftSpeedPct += lvStats.craftSpeedPct;
    if (lvStats.craftEfficiencyPct) craftEfficiencyPct += lvStats.craftEfficiencyPct;
    if (lvStats.goldGainPct) goldGainPct += lvStats.goldGainPct;
    if (lvStats.caravanBountyRewardPct) caravanBountyRewardPct += lvStats.caravanBountyRewardPct;
  }

  let activeResonanceId: string | null = null;
  let activeResonanceName: string | null = null;
  let resonanceTier = 0;

  if (activePotions.length === 2) {
    const resDef = findTwinResonance(activePotions[0], activePotions[1]);
    if (resDef) {
      activeResonanceId = resDef.id;
      activeResonanceName = resDef.name;
      resonanceTier = Math.min(getRank(activePotions[0]), getRank(activePotions[1]));
      const scaled = scaleTwinResonanceBonuses(resDef, resonanceTier);
      bonusAtk += scaled.bonusAtk;
      bonusDef += scaled.bonusDef;
      bonusHp += scaled.bonusHp;
      combatAtkPct += scaled.combatAtkPct;
      if (scaled.armorPenPct > 0) {
        armorPenPct = Math.min(0.75, Math.round((armorPenPct + scaled.armorPenPct) * 1000) / 1000);
      }
      if (scaled.bossArmorBreakPct > 0) {
        bossArmorBreakPct = Math.min(0.65, Math.round((bossArmorBreakPct + scaled.bossArmorBreakPct) * 1000) / 1000);
      }
      if (scaled.intervalReductionPct > 0) {
        const m = Math.max(0.75, 1 - scaled.intervalReductionPct / 100);
        intervalMult = Math.max(0.65, Math.round(intervalMult * m * 1000) / 1000);
      }
      if (scaled.critRateBonusPct > 0) {
        critRateBonusPct = Math.round((critRateBonusPct + scaled.critRateBonusPct) * 10) / 10;
      }
      critDmgBonusPct += scaled.critDmgBonusPct;
      gatherSpeedPct += scaled.gatherSpeedPct;
      if (scaled.gatherDoubleChance > 0) {
        gatherDoubleChance = Math.min(0.65, Math.round((gatherDoubleChance + scaled.gatherDoubleChance) * 1000) / 1000);
      }
      craftSpeedPct += scaled.craftSpeedPct;
      craftEfficiencyPct += scaled.craftEfficiencyPct;
      goldGainPct += scaled.goldGainPct;
      rareFindPct += scaled.rareFindPct;
      caravanBountyRewardPct += scaled.caravanBountyRewardPct;
    }
  }

  return {
    cauldronRank: tier.level,
    cauldronTitle: tier.title,
    batchBonusCharges: tier.batchBonusCharges,
    activePotions,
    activeResonanceId,
    activeResonanceName,
    resonanceTier,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct,
    armorPenPct,
    bossArmorBreakPct,
    intervalMult,
    critRateBonusPct,
    critDmgBonusPct,
    potionBuffMult,
    gatherSpeedPct,
    gatherDoubleChance,
    craftSpeedPct,
    craftEfficiencyPct,
    goldGainPct,
    rareFindPct,
    caravanBountyRewardPct,
  };
}

/** 确保 alchemyCauldron 状态存在并净化脏档数据，同时自动维护每日免费炼金原液萃取重置 */
export function ensureAlchemyCauldron(
  player: EnhancedPlayerState,
  now?: Date
): AlchemyCauldronState {
  // 仅显式 now 才翻篇每日免费萃取；无参调用只做净化（见 ensureCaravanTrade 注释）。
  const rollDaily = now !== undefined;
  if (!Array.isArray((player as any).logs)) {
    (player as any).logs = [];
  }
  const cleanNonNeg = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;

  if (!player.alchemyCauldron || typeof player.alchemyCauldron !== "object") {
    player.alchemyCauldron = {
      recipeRanks: {
        dragon_fury: 1,
        elven_bounty: 1,
        dwarven_temper: 1,
        astral_fortune: 1,
      },
      potionCharges: {
        dragon_fury: 0,
        elven_bounty: 0,
        dwarven_temper: 0,
        astral_fortune: 0,
      },
      alchemicalEssence: 2,
      equippedPotions: [null, null],
      totalBrews: 0,
      totalUpgrades: 0,
      cauldronPoints: 0,
      alchemyCauldronRank: 1,
    };
  }

  const ac = player.alchemyCauldron;
  const rawRanks = (ac.recipeRanks && typeof ac.recipeRanks === "object" ? ac.recipeRanks : {}) as Record<string, unknown>;
  const cleanRanks = {} as Record<AlchemicalPotionId, number>;
  for (const pid of ALCHEMICAL_POTION_IDS) {
    const r = Number(rawRanks[pid]);
    cleanRanks[pid] = Number.isFinite(r) && r >= 1 ? Math.min(ALCHEMY_MAX_RECIPE_RANK, Math.floor(r)) : 1;
  }
  ac.recipeRanks = cleanRanks;

  const rawCharges = (ac.potionCharges && typeof ac.potionCharges === "object" ? ac.potionCharges : {}) as Record<string, unknown>;
  const cleanCharges = {} as Record<AlchemicalPotionId, number>;
  for (const pid of ALCHEMICAL_POTION_IDS) {
    cleanCharges[pid] = Math.min(ALCHEMY_MAX_CHARGES, cleanNonNeg(rawCharges[pid], 0));
  }
  ac.potionCharges = cleanCharges;

  ac.alchemicalEssence = cleanNonNeg(ac.alchemicalEssence, 0);

  const rawEq = Array.isArray(ac.equippedPotions) ? ac.equippedPotions : [null, null];
  const slotA = isValidAlchemicalPotionId(rawEq[0]) ? rawEq[0] : null;
  let slotB = isValidAlchemicalPotionId(rawEq[1]) ? rawEq[1] : null;
  if (slotA && slotB && slotA === slotB) {
    slotB = null;
  }
  ac.equippedPotions = [slotA, slotB];

  ac.totalBrews = cleanNonNeg(ac.totalBrews, 0);
  ac.totalUpgrades = cleanNonNeg(ac.totalUpgrades, 0);
  const rawPts = cleanNonNeg(ac.cauldronPoints, 0);
  const tierInfo = getCauldronMasteryTier(
    Math.max(rawPts, ac.totalBrews * ALCHEMY_BREW_ESSENCE_POINTS + ac.totalUpgrades * 35),
    ac.alchemyCauldronRank
  );
  ac.cauldronPoints = tierInfo.effectivePoints;
  ac.alchemyCauldronRank = tierInfo.current.level;

  const today = todayLocal(now ?? new Date());
  if (
    !ac.dailyExtraction ||
    typeof ac.dailyExtraction !== "object" ||
    typeof ac.dailyExtraction.date !== "string" ||
    (rollDaily && ac.dailyExtraction.date !== today)
  ) {
    ac.dailyExtraction = { date: today, claimedCount: 0 };
  } else {
    ac.dailyExtraction.claimedCount = Math.min(
      ALCHEMY_DAILY_FREE_EXTRACTIONS,
      cleanNonNeg(ac.dailyExtraction.claimedCount, 0)
    );
  }

  return ac;
}

/** 每日免费「炼金原液萃取」：零门槛产出炼金原液，供早中期冒险者立即开炉炼药 */
export function claimDailyAlchemyExtraction(
  player: EnhancedPlayerState,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  essenceGained?: number;
  remainingToday?: number;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const used = ac.dailyExtraction?.claimedCount || 0;
  if (used >= ALCHEMY_DAILY_FREE_EXTRACTIONS) {
    return { ok: false, reason: `今日免费炼金原液萃取次数已用尽（每日 ${ALCHEMY_DAILY_FREE_EXTRACTIONS} 次）` };
  }

  const prevRank = ac.alchemyCauldronRank;
  ac.dailyExtraction!.claimedCount = used + 1;
  ac.alchemicalEssence += ALCHEMY_ESSENCE_PER_EXTRACTION;
  ac.cauldronPoints += ALCHEMY_EXTRACTION_POINTS;
  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank);
  ac.alchemyCauldronRank = nextTier.current.level;

  const remainingToday = Math.max(0, ALCHEMY_DAILY_FREE_EXTRACTIONS - ac.dailyExtraction!.claimedCount);
  appendLog(
    player,
    `奇美拉魔药釜「炼金原液萃取」完成：获得炼金原液 +${ALCHEMY_ESSENCE_PER_EXTRACTION}（今日剩余免费萃取 ${remainingToday} 次）！`
  );
  if (ac.alchemyCauldronRank > prevRank) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${ac.alchemyCauldronRank}「${nextTier.current.title}」！永久全局加成同步提升！`
    );
  }
  return {
    ok: true,
    essenceGained: ALCHEMY_ESSENCE_PER_EXTRACTION,
    remainingToday,
    ...(ac.alchemyCauldronRank > prevRank ? { leveledUpTo: ac.alchemyCauldronRank } : {}),
  };
}

/** 炼制奇美拉核心炼金魔药批次（支持：炼金原液零门槛炼制 / 金币+采集素材炼制 / 异域星晶尘高浓缩炼制） */
export function brewAlchemicalPotion(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  potionId: string,
  mode: PotionBrewMode,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  potionId?: AlchemicalPotionId;
  chargesAdded?: number;
  totalCharges?: number;
  autoEquippedSlot?: ResonanceSlotIndex | null;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的奇美拉炼金魔药配方" };
  }
  if (mode !== "essence" && mode !== "material" && mode !== "astral_dust") {
    return { ok: false, reason: "无效的炼制触媒模式" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  const curCharges = ac.potionCharges[potionId] || 0;
  if (curCharges >= ALCHEMY_MAX_CHARGES) {
    return { ok: false, reason: `「${meta.name}」储备充能已达上限（${ALCHEMY_MAX_CHARGES} 份）` };
  }

  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const prevTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  let baseCharges = ALCHEMY_BREW_ESSENCE_CHARGES;
  let pointsGain = ALCHEMY_BREW_ESSENCE_POINTS;

  if (mode === "essence") {
    if (ac.alchemicalEssence < ALCHEMY_BREW_ESSENCE_COST) {
      return {
        ok: false,
        reason: `炼金原液不足（需 ${ALCHEMY_BREW_ESSENCE_COST} 份，当前 ${ac.alchemicalEssence} 份；可先使用每日免费炼金原液萃取）`,
      };
    }
    ac.alchemicalEssence -= ALCHEMY_BREW_ESSENCE_COST;
    baseCharges = ALCHEMY_BREW_ESSENCE_CHARGES;
    pointsGain = ALCHEMY_BREW_ESSENCE_POINTS;
  } else if (mode === "material") {
    const needGold = meta.materialBrewCost.gold;
    const haveGold = Math.floor(Number(player.inventory.gold || 0));
    if (haveGold < needGold) {
      return { ok: false, reason: `金币不足（炼制「${meta.name}」需 ${needGold} 金币，当前 ${haveGold} 金币）` };
    }
    for (const [iid, needQty] of Object.entries(meta.materialBrewCost.items)) {
      const idleHave = getIdleCargoCount(player, iid);
      if (idleHave < needQty) {
        const nm = itemsById.get(iid) || iid;
        return { ok: false, reason: `闲置素材「${nm}」不足（需 ${needQty} 件，当前可用 ${idleHave} 件）` };
      }
    }
    player.inventory.gold = haveGold - needGold;
    for (const [iid, needQty] of Object.entries(meta.materialBrewCost.items)) {
      player.inventory[iid] = Math.max(0, Number(player.inventory[iid] || 0) - needQty);
      if (player.inventory[iid] <= 0) delete player.inventory[iid];
    }
    baseCharges = ALCHEMY_BREW_MATERIAL_CHARGES;
    pointsGain = ALCHEMY_BREW_MATERIAL_POINTS;
  } else {
    if (ct.astralCrystalDust < ALCHEMY_BREW_ASTRAL_DUST_COST) {
      return {
        ok: false,
        reason: `异域星晶尘不足（高浓缩炼制需 ${ALCHEMY_BREW_ASTRAL_DUST_COST} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    ct.astralCrystalDust -= ALCHEMY_BREW_ASTRAL_DUST_COST;
    baseCharges = ALCHEMY_BREW_ASTRAL_DUST_CHARGES;
    pointsGain = ALCHEMY_BREW_ASTRAL_DUST_POINTS;
  }

  const desiredAdd =
    baseCharges +
    prevTier.batchBonusCharges +
    getAstralRelicsBonuses(player).alchemyBatchBonusCharges;
  const nextTotalCharges = Math.min(ALCHEMY_MAX_CHARGES, curCharges + desiredAdd);
  const actualAdded = nextTotalCharges - curCharges;
  ac.potionCharges[potionId] = nextTotalCharges;
  ac.totalBrews += 1;
  ac.cauldronPoints += pointsGain;

  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  ac.alchemyCauldronRank = nextTier.level;

  let autoEquippedSlot: ResonanceSlotIndex | null = null;
  if (!ac.equippedPotions.includes(potionId)) {
    if (ac.equippedPotions[0] === null) {
      ac.equippedPotions[0] = potionId;
      autoEquippedSlot = 0;
    } else if (ac.equippedPotions[1] === null) {
      ac.equippedPotions[1] = potionId;
      autoEquippedSlot = 1;
    }
  }

  addReputation(player, 4);
  syncAchievements(player);

  const resonanceNow = findTwinResonance(ac.equippedPotions[0], ac.equippedPotions[1]);
  const equipHint =
    autoEquippedSlot !== null
      ? `（已自动装入共鸣槽 ${autoEquippedSlot === 0 ? "A" : "B"}${resonanceNow ? `，激活「${resonanceNow.name}」！` : ""}）`
      : "";
  appendLog(
    player,
    `奇美拉炼金魔药釜炼制「${meta.name}」成功：充能 +${actualAdded}（当前 ${nextTotalCharges} 份）${equipHint}`
  );
  if (nextTier.level > prevTier.level) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${nextTier.level}「${nextTier.title}」！永久全局加成与单批额外产出提升！`
    );
  }

  return {
    ok: true,
    potionId,
    chargesAdded: actualAdded,
    totalCharges: nextTotalCharges,
    autoEquippedSlot,
    ...(nextTier.level > prevTier.level ? { leveledUpTo: nextTier.level } : {}),
  };
}

/** 研习并升阶「炼金宗师图谱」（Lv.1 -> Lv.5，跨转生永久保留） */
export function upgradeAlchemicalRecipe(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack | undefined,
  potionId: string,
  mode: RecipeUpgradeMode = "standard",
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  potionId?: AlchemicalPotionId;
  newRank?: number;
  leveledUpTo?: number;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的炼金宗师图谱" };
  }
  if (mode !== "standard" && mode !== "astral_dust") {
    return { ok: false, reason: "无效的图谱研习方式" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  const curRank = ac.recipeRanks[potionId] || 1;
  if (curRank >= ALCHEMY_MAX_RECIPE_RANK) {
    return { ok: false, reason: `「${meta.name}」宗师图谱已达最高阶 Lv.${ALCHEMY_MAX_RECIPE_RANK}` };
  }

  const targetRank = (curRank + 1) as 2 | 3 | 4 | 5;
  const costTier = ALCHEMY_RECIPE_UPGRADE_COSTS.find((c) => c.targetRank === targetRank)!;
  const itemsById = new Map<string, string>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [
      it.id,
      it.name || it.id,
    ])
  );

  const haveGold = Math.floor(Number(player.inventory.gold || 0));
  if (mode === "standard") {
    const std = costTier.standard;
    if (haveGold < std.gold) {
      return { ok: false, reason: `金币不足（升阶至 Lv.${targetRank} 需 ${std.gold} 金币，当前 ${haveGold} 金币）` };
    }
    if (ac.alchemicalEssence < std.alchemicalEssence) {
      return {
        ok: false,
        reason: `炼金原液不足（升阶至 Lv.${targetRank} 需 ${std.alchemicalEssence} 份炼金原液，当前 ${ac.alchemicalEssence} 份）`,
      };
    }
    for (const [cid, needQty] of Object.entries(std.crystals)) {
      const idleHave = getIdleCargoCount(player, cid);
      if (idleHave < needQty) {
        const nm = itemsById.get(cid) || cid;
        return { ok: false, reason: `闲置晶石「${nm}」不足（需 ${needQty} 枚，当前可用 ${idleHave} 枚）` };
      }
    }
    player.inventory.gold = haveGold - std.gold;
    ac.alchemicalEssence -= std.alchemicalEssence;
    for (const [cid, needQty] of Object.entries(std.crystals)) {
      player.inventory[cid] = Math.max(0, Number(player.inventory[cid] || 0) - needQty);
      if (player.inventory[cid] <= 0) delete player.inventory[cid];
    }
  } else {
    const ast = costTier.astralDust;
    if (haveGold < ast.gold) {
      return { ok: false, reason: `金币不足（星晶研习升阶需 ${ast.gold} 金币，当前 ${haveGold} 金币）` };
    }
    if (ct.astralCrystalDust < ast.astralCrystalDust) {
      return {
        ok: false,
        reason: `异域星晶尘不足（升阶至 Lv.${targetRank} 需 ${ast.astralCrystalDust} 星晶尘，当前 ${ct.astralCrystalDust}）`,
      };
    }
    player.inventory.gold = haveGold - ast.gold;
    ct.astralCrystalDust -= ast.astralCrystalDust;
  }

  const prevRank = ac.alchemyCauldronRank;
  ac.recipeRanks[potionId] = targetRank;
  ac.totalUpgrades += 1;
  ac.cauldronPoints += costTier.cauldronPoints;
  ac.potionCharges[potionId] = Math.min(ALCHEMY_MAX_CHARGES, (ac.potionCharges[potionId] || 0) + 4);

  const nextTier = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank).current;
  ac.alchemyCauldronRank = nextTier.level;

  addReputation(player, 10);
  syncAchievements(player);

  appendLog(
    player,
    `炼金宗师图谱「${meta.name}」永久升阶至 Lv.${targetRank}（跨转生永久保留，并附赠 4 份浓缩充能）！`
  );
  if (nextTier.level > prevRank) {
    appendLog(
      player,
      `炼金宗师等阶晋升至 Lv.${nextTier.level}「${nextTier.title}」！永久全局被动同步提升！`
    );
  }

  return {
    ok: true,
    potionId,
    newRank: targetRank,
    ...(nextTier.level > prevRank ? { leveledUpTo: nextTier.level } : {}),
  };
}

/** 装卸「深渊试炼双共鸣药剂槽」（slot 0 | 1，最多同时装备 2 种不同魔药激活双生共鸣） */
export function equipAlchemicalPotion(
  player: EnhancedPlayerState,
  slotIndex: number,
  potionId: string | null,
  now: Date = new Date()
): {
  ok: boolean;
  reason?: string;
  equippedPotions?: [AlchemicalPotionId | null, AlchemicalPotionId | null];
  activeResonanceName?: string | null;
} {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  if (slotIndex !== 0 && slotIndex !== 1) {
    return { ok: false, reason: "无效的共鸣药剂槽位" };
  }

  if (potionId === null || potionId === "") {
    ac.equippedPotions[slotIndex] = null;
    return {
      ok: true,
      equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
      activeResonanceName: getAlchemyCauldronBonuses(player).activeResonanceName,
    };
  }

  if (!isValidAlchemicalPotionId(potionId)) {
    return { ok: false, reason: "未知的奇美拉炼金魔药" };
  }

  const meta = ALCHEMICAL_POTIONS.find((p) => p.id === potionId)!;
  if ((ac.potionCharges[potionId] || 0) <= 0) {
    return {
      ok: false,
      reason: `「${meta.name}」当前储备充能为 0，请先在魔药釜中炼制至少 1 批后再装入共鸣槽`,
    };
  }

  const otherSlot: ResonanceSlotIndex = slotIndex === 0 ? 1 : 0;
  if (ac.equippedPotions[otherSlot] === potionId) {
    ac.equippedPotions[otherSlot] = ac.equippedPotions[slotIndex];
  }
  ac.equippedPotions[slotIndex] = potionId;

  const bonuses = getAlchemyCauldronBonuses(player);
  if (bonuses.activeResonanceName) {
    appendLog(
      player,
      `深渊试炼双共鸣药剂槽已装填「${meta.name}」——成功激活炼金双生共鸣「${bonuses.activeResonanceName}」！`
    );
  } else {
    appendLog(player, `共鸣药剂槽 ${slotIndex === 0 ? "A" : "B"} 已装填「${meta.name}」`);
  }

  return {
    ok: true,
    equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
    activeResonanceName: bonuses.activeResonanceName,
  };
}

/** 深渊首领讨伐胜利时，每个已激活的共鸣槽消耗 1 份魔药充能 */
export function consumeEquippedPotionChargesOnBossKill(player: EnhancedPlayerState): number {
  const ac = player.alchemyCauldron;
  if (!ac || typeof ac !== "object" || !Array.isArray(ac.equippedPotions)) return 0;
  let consumedCount = 0;
  for (const slotPid of ac.equippedPotions) {
    if (!isValidAlchemicalPotionId(slotPid)) continue;
    const cur = Math.max(0, Math.floor(Number(ac.potionCharges?.[slotPid] || 0)));
    if (cur > 0) {
      ac.potionCharges[slotPid] = cur - 1;
      consumedCount += 1;
    }
  }
  return consumedCount;
}

/** 构造前端「奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽」完整视图模型 */
export function getAlchemyCauldronInfo(
  player: EnhancedPlayerState,
  contentPack?: EnhancedContentPack,
  now: Date = new Date()
) {
  ensurePlayerExtensions(player);
  const ac = ensureAlchemyCauldron(player, now);
  const ct = ensureCaravanTrade(player, now);

  const itemsMap = new Map<string, { id: string; name?: string }>(
    (((contentPack?.items as Array<{ id: string; name?: string }> | undefined) || [])).map((it) => [it.id, it])
  );

  const tierInfo = getCauldronMasteryTier(ac.cauldronPoints, ac.alchemyCauldronRank);
  const bonuses = getAlchemyCauldronBonuses(player);
  const haveGold = Math.floor(Number(player.inventory.gold || 0));

  const potions = ALCHEMICAL_POTIONS.map((meta) => {
    const rank = ac.recipeRanks[meta.id] || 1;
    const charges = ac.potionCharges[meta.id] || 0;
    const slotIdx = ac.equippedPotions.indexOf(meta.id);
    const isEquipped = slotIdx === 0 || slotIdx === 1;
    const isActive = isEquipped && charges > 0;
    const atChargeCap = charges >= ALCHEMY_MAX_CHARGES;

    const matItems = Object.entries(meta.materialBrewCost.items).map(([iid, needQty]) => {
      const idleHave = getIdleCargoCount(player, iid);
      return {
        itemId: iid,
        name: itemsMap.get(iid)?.name || iid,
        need: needQty,
        have: idleHave,
      };
    });

    const canBrewEssence = !atChargeCap && ac.alchemicalEssence >= ALCHEMY_BREW_ESSENCE_COST;
    const canBrewMaterial =
      !atChargeCap &&
      haveGold >= meta.materialBrewCost.gold &&
      matItems.every((m) => m.have >= m.need);
    const canBrewAstralDust = !atChargeCap && ct.astralCrystalDust >= ALCHEMY_BREW_ASTRAL_DUST_COST;

    const nextRank = rank < ALCHEMY_MAX_RECIPE_RANK ? ((rank + 1) as 2 | 3 | 4 | 5) : null;
    const upgradeCostTier = nextRank
      ? ALCHEMY_RECIPE_UPGRADE_COSTS.find((u) => u.targetRank === nextRank) || null
      : null;

    const upgradeCrystals = upgradeCostTier
      ? Object.entries(upgradeCostTier.standard.crystals).map(([cid, needQty]) => ({
          itemId: cid,
          name: itemsMap.get(cid)?.name || cid,
          need: needQty,
          have: getIdleCargoCount(player, cid),
        }))
      : [];

    const canUpgradeStandard = Boolean(
      upgradeCostTier &&
        haveGold >= upgradeCostTier.standard.gold &&
        ac.alchemicalEssence >= upgradeCostTier.standard.alchemicalEssence &&
        upgradeCrystals.every((c) => c.have >= c.need)
    );
    const canUpgradeAstralDust = Boolean(
      upgradeCostTier &&
        haveGold >= upgradeCostTier.astralDust.gold &&
        ct.astralCrystalDust >= upgradeCostTier.astralDust.astralCrystalDust
    );

    return {
      id: meta.id,
      name: meta.name,
      subtitle: meta.subtitle,
      description: meta.description,
      iconId: meta.iconId,
      rank,
      maxRank: meta.maxRank,
      charges,
      maxCharges: ALCHEMY_MAX_CHARGES,
      isEquipped,
      equippedSlot: isEquipped ? (slotIdx as ResonanceSlotIndex) : null,
      isActive,
      currentStats: meta.levels[rank - 1],
      nextStats: nextRank ? meta.levels[nextRank - 1] : null,
      brewOptions: {
        essence: {
          costEssence: ALCHEMY_BREW_ESSENCE_COST,
          chargesOut:
            ALCHEMY_BREW_ESSENCE_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_ESSENCE_POINTS,
          canAfford: canBrewEssence,
        },
        material: {
          gold: meta.materialBrewCost.gold,
          items: matItems,
          chargesOut:
            ALCHEMY_BREW_MATERIAL_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_MATERIAL_POINTS,
          canAfford: canBrewMaterial,
        },
        astralDust: {
          costDust: ALCHEMY_BREW_ASTRAL_DUST_COST,
          chargesOut:
            ALCHEMY_BREW_ASTRAL_DUST_CHARGES +
            tierInfo.current.batchBonusCharges +
            getAstralRelicsBonuses(player).alchemyBatchBonusCharges,
          pointsOut: ALCHEMY_BREW_ASTRAL_DUST_POINTS,
          canAfford: canBrewAstralDust,
        },
      },
      upgradeOptions: upgradeCostTier
        ? {
            targetRank: upgradeCostTier.targetRank,
            cauldronPoints: upgradeCostTier.cauldronPoints,
            standard: {
              gold: upgradeCostTier.standard.gold,
              alchemicalEssence: upgradeCostTier.standard.alchemicalEssence,
              crystals: upgradeCrystals,
              canAfford: canUpgradeStandard,
            },
            astralDust: {
              gold: upgradeCostTier.astralDust.gold,
              astralCrystalDust: upgradeCostTier.astralDust.astralCrystalDust,
              canAfford: canUpgradeAstralDust,
            },
          }
        : null,
    };
  });

  const allResonances = TWIN_ALCHEMICAL_RESONANCES.map((resDef) => {
    const [pA, pB] = resDef.pair;
    const rankA = ac.recipeRanks[pA] || 1;
    const rankB = ac.recipeRanks[pB] || 1;
    const previewTier = Math.min(rankA, rankB);
    const isActive = bonuses.activeResonanceId === resDef.id;
    return {
      ...resDef,
      previewTier,
      scaledBonuses: scaleTwinResonanceBonuses(resDef, previewTier),
      isActive,
    };
  });

  const usedExtractions = ac.dailyExtraction?.claimedCount || 0;

  return {
    nowMs: now.getTime(),
    gold: haveGold,
    alchemicalEssence: ac.alchemicalEssence,
    astralCrystalDust: ct.astralCrystalDust,
    totalBrews: ac.totalBrews,
    totalUpgrades: ac.totalUpgrades,
    cauldronPoints: ac.cauldronPoints,
    alchemyCauldronRank: ac.alchemyCauldronRank,
    dailyExtraction: {
      date: ac.dailyExtraction?.date || todayLocal(now),
      usedToday: usedExtractions,
      maxPerDay: ALCHEMY_DAILY_FREE_EXTRACTIONS,
      remainingToday: Math.max(0, ALCHEMY_DAILY_FREE_EXTRACTIONS - usedExtractions),
      essencePerClaim: ALCHEMY_ESSENCE_PER_EXTRACTION,
    },
    cauldronTier: {
      level: tierInfo.current.level,
      title: tierInfo.current.title,
      minPoints: tierInfo.current.minPoints,
      nextLevelPoints: tierInfo.next?.minPoints ?? null,
      nextTitle: tierInfo.next?.title ?? null,
      progressPct: tierInfo.progressPct,
      allTiers: CAULDRON_MASTERY_TIERS,
    },
    equippedPotions: [...ac.equippedPotions] as [AlchemicalPotionId | null, AlchemicalPotionId | null],
    activeResonance: allResonances.find((r) => r.isActive) || null,
    allResonances,
    potions,
    bonuses,
  };
}
