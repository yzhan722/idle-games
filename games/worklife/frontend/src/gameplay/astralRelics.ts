export type AstralRuinStratumId =
  | "outpost_ruins"
  | "obsidian_sanctum"
  | "primordial_corridor";

export type ExpeditionSurveyMode = "free" | "coin" | "astral_dust";

export type SacredRelicId =
  | "solar_spear"
  | "verdant_chalice"
  | "titan_anvil"
  | "chimera_censer";

export type RelicUpgradeMode = "standard" | "astral_dust";

export const ASTRAL_RUIN_STRATUM_IDS: readonly AstralRuinStratumId[] = [
  "outpost_ruins",
  "obsidian_sanctum",
  "primordial_corridor",
];

export const SACRED_RELIC_IDS: readonly SacredRelicId[] = [
  "solar_spear",
  "verdant_chalice",
  "titan_anvil",
  "chimera_censer",
];

export const ASTRAL_DAILY_FREE_SURVEYS = 2;
export const SACRED_RELIC_MAX_RANK = 5;
export const ASTRAL_VEIN_CADENCE = 3;
export const ASTRAL_MIN_SURVEY_XP = 15;
export const ASTRAL_MIN_RESTORE_XP = 25;

export interface AstralCuratorTierDef {
  level: number;
  minXp: number;
  title: string;
  combatAtkPct: number;
  gatherSpeedPct: number;
  craftSpeedPct: number;
  goldGainPct: number;
  rareFindPct: number;
  surveyBonusShards: number;
}

export const ASTRAL_CURATOR_TIERS: readonly AstralCuratorTierDef[] = [
  {
    level: 1,
    minXp: 0,
    title: "遗迹见习勘探员",
    combatAtkPct: 0,
    gatherSpeedPct: 0,
    craftSpeedPct: 0,
    goldGainPct: 0,
    rareFindPct: 0,
    surveyBonusShards: 0,
  },
  {
    level: 2,
    minXp: 45,
    title: "星坠寻迹学者",
    combatAtkPct: 2,
    gatherSpeedPct: 3,
    craftSpeedPct: 3,
    goldGainPct: 3,
    rareFindPct: 2,
    surveyBonusShards: 1,
  },
  {
    level: 3,
    minXp: 130,
    title: "秘殿鉴宝执事",
    combatAtkPct: 4,
    gatherSpeedPct: 6,
    craftSpeedPct: 6,
    goldGainPct: 6,
    rareFindPct: 5,
    surveyBonusShards: 2,
  },
  {
    level: 4,
    minXp: 280,
    title: "星界考古导师",
    combatAtkPct: 7,
    gatherSpeedPct: 10,
    craftSpeedPct: 10,
    goldGainPct: 10,
    rareFindPct: 8,
    surveyBonusShards: 3,
  },
  {
    level: 5,
    minXp: 520,
    title: "神代圣物大馆长",
    combatAtkPct: 10,
    gatherSpeedPct: 14,
    craftSpeedPct: 14,
    goldGainPct: 15,
    rareFindPct: 12,
    surveyBonusShards: 4,
  },
  {
    level: 6,
    minXp: 860,
    title: "太初星穹守秘贤者",
    combatAtkPct: 14,
    gatherSpeedPct: 19,
    craftSpeedPct: 19,
    goldGainPct: 20,
    rareFindPct: 16,
    surveyBonusShards: 6,
  },
];

export interface StratumModeSpec {
  costGold: number;
  costAstralDust: number;
  baseShards: number;
  baseAstralDust: number;
  expeditionXp: number;
}

export interface AstralRuinStratumDef {
  id: AstralRuinStratumId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  minCuratorRank: number;
  veinBonus: {
    shards: number;
    astralDust: number;
    expeditionXp: number;
  };
  modes: Record<ExpeditionSurveyMode, StratumModeSpec>;
}

export const ASTRAL_RUIN_STRATA: readonly AstralRuinStratumDef[] = [
  {
    id: "outpost_ruins",
    name: "浮空前哨废墟",
    subtitle: "浅层浮岛断垣 · 稳定勘探圣物残片与星晶微尘",
    description:
      "异世界公会最早标定的星界断层前哨，风化星岩中散落着大量远古圣物残片与浅层异域星晶尘。",
    iconId: "astral_ruin_compass",
    minCuratorRank: 1,
    veinBonus: {
      shards: 2,
      astralDust: 1,
      expeditionXp: 6,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 4, baseAstralDust: 2, expeditionXp: 15 },
      coin: { costGold: 320, costAstralDust: 0, baseShards: 5, baseAstralDust: 2, expeditionXp: 18 },
      astral_dust: { costGold: 0, costAstralDust: 6, baseShards: 11, baseAstralDust: 2, expeditionXp: 32 },
    },
  },
  {
    id: "obsidian_sanctum",
    name: "星坠曜石圣殿",
    subtitle: "中层曜石回音殿 · 富集圣物晶簇与高纯星晶脉",
    description:
      "陨落星辰嵌入黑曜岩脉构筑的远古圣殿，勘探队等阶达 Lv.2 后即可深入采集高密度圣物残片。",
    iconId: "relic_shard_crystal",
    minCuratorRank: 2,
    veinBonus: {
      shards: 3,
      astralDust: 2,
      expeditionXp: 10,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 7, baseAstralDust: 4, expeditionXp: 26 },
      coin: { costGold: 780, costAstralDust: 0, baseShards: 9, baseAstralDust: 4, expeditionXp: 30 },
      astral_dust: { costGold: 0, costAstralDust: 10, baseShards: 19, baseAstralDust: 3, expeditionXp: 52 },
    },
  },
  {
    id: "primordial_corridor",
    name: "太初神代回廊",
    subtitle: "深层神代核心圣域 · 巨量传世圣物真核与星穹秘藏",
    description:
      "唯有资深星界考古导师（Lv.4+）方能踏足的神代中枢回廊，每次发掘均可带回丰厚传世残片与星晶尘。",
    iconId: "astral_ruin_compass",
    minCuratorRank: 4,
    veinBonus: {
      shards: 5,
      astralDust: 3,
      expeditionXp: 16,
    },
    modes: {
      free: { costGold: 0, costAstralDust: 0, baseShards: 12, baseAstralDust: 7, expeditionXp: 42 },
      coin: { costGold: 1650, costAstralDust: 0, baseShards: 15, baseAstralDust: 7, expeditionXp: 48 },
      astral_dust: { costGold: 0, costAstralDust: 16, baseShards: 32, baseAstralDust: 5, expeditionXp: 84 },
    },
  },
];

export interface SacredRelicLevelStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  combatAtkPct?: number;
  armorPenPct?: number;
  bossArmorBreakPct?: number;
  relicCritAmpPct?: number;
  critRateBonusPct?: number;
  critDmgBonusPct?: number;
  intervalReductionPct?: number;
  potionBuffPct?: number;
  gatherDoubleChance?: number;
  gatherSpeedPct?: number;
  gatherEfficiencyPct?: number;
  rareFindPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  caravanBountyRewardPct?: number;
  alchemyBatchBonusCharges?: number;
}

export interface SacredRelicPedestalMeta {
  id: SacredRelicId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  maxRank: number;
  levels: readonly [
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
    SacredRelicLevelStats,
  ];
}

export const SACRED_RELIC_PEDESTALS: readonly SacredRelicPedestalMeta[] = [
  {
    id: "solar_spear",
    name: "曜阳破军圣枪",
    subtitle: "战斗破甲贯日 · 圣枪增伤与组队暴击",
    description:
      "神代讨伐军团遗留的赤金破城圣枪，供奉于展台后永久赋予护甲穿透、首领破甲、圣枪裁决增伤与组队暴击。",
    iconId: "relic_solar_spear",
    maxRank: 5,
    levels: [
      { bonusAtk: 6, combatAtkPct: 4, armorPenPct: 0.04, bossArmorBreakPct: 0.05, critRateBonusPct: 2.5, critDmgBonusPct: 10, relicCritAmpPct: 4 },
      { bonusAtk: 12, combatAtkPct: 7, armorPenPct: 0.07, bossArmorBreakPct: 0.09, critRateBonusPct: 4.5, critDmgBonusPct: 18, relicCritAmpPct: 8 },
      { bonusAtk: 19, combatAtkPct: 11, armorPenPct: 0.11, bossArmorBreakPct: 0.13, critRateBonusPct: 6.5, critDmgBonusPct: 28, relicCritAmpPct: 13 },
      { bonusAtk: 27, combatAtkPct: 15, armorPenPct: 0.15, bossArmorBreakPct: 0.18, critRateBonusPct: 9, critDmgBonusPct: 40, relicCritAmpPct: 19 },
      { bonusAtk: 36, combatAtkPct: 20, armorPenPct: 0.2, bossArmorBreakPct: 0.24, critRateBonusPct: 12, critDmgBonusPct: 55, relicCritAmpPct: 26 },
    ],
  },
  {
    id: "verdant_chalice",
    name: "翠微丰饶圣爵",
    subtitle: "万物双倍采集 · 采集连作丰产与战斗珍稀掉落",
    description:
      "镌刻世界树枝叶纹章的翡翠金爵，永久提升生命上限、全采集双倍率、采集速度与额外丰产连作效率。",
    iconId: "relic_verdant_chalice",
    maxRank: 5,
    levels: [
      { bonusHp: 20, gatherDoubleChance: 0.04, gatherSpeedPct: 6, gatherEfficiencyPct: 5, rareFindPct: 4 },
      { bonusHp: 40, gatherDoubleChance: 0.08, gatherSpeedPct: 11, gatherEfficiencyPct: 10, rareFindPct: 8 },
      { bonusHp: 65, gatherDoubleChance: 0.12, gatherSpeedPct: 17, gatherEfficiencyPct: 16, rareFindPct: 13 },
      { bonusHp: 95, gatherDoubleChance: 0.17, gatherSpeedPct: 24, gatherEfficiencyPct: 23, rareFindPct: 19 },
      { bonusHp: 130, gatherDoubleChance: 0.23, gatherSpeedPct: 32, gatherEfficiencyPct: 32, rareFindPct: 26 },
    ],
  },
  {
    id: "titan_anvil",
    name: "泰坦神铸战锤",
    subtitle: "工坊神匠连作 · 极速制造与百工经验共鸣",
    description:
      "泰坦巨匠锻打星铁圣剑时所用的符文神锤，永久提升防御、全制作神匠免费连作效率、制作速度与技能经验。",
    iconId: "relic_titan_anvil",
    maxRank: 5,
    levels: [
      { bonusDef: 5, craftEfficiencyPct: 6, craftSpeedPct: 7, xpGainPct: 3 },
      { bonusDef: 10, craftEfficiencyPct: 12, craftSpeedPct: 13, xpGainPct: 6 },
      { bonusDef: 16, craftEfficiencyPct: 19, craftSpeedPct: 20, xpGainPct: 10 },
      { bonusDef: 23, craftEfficiencyPct: 27, craftSpeedPct: 28, xpGainPct: 14 },
      { bonusDef: 32, craftEfficiencyPct: 36, craftSpeedPct: 38, xpGainPct: 20 },
    ],
  },
  {
    id: "chimera_censer",
    name: "星界奇美拉圣炉",
    subtitle: "炼金批次增产 · 远征商队悬赏与单人战斗金币",
    description:
      "吞吐星辉秘香的传世圣炉，永久提升单人战斗金币、远征商队/特批契约/公会悬赏收益，并强化战斗药剂攻防增益与炼制批次产出。",
    iconId: "relic_chimera_censer",
    maxRank: 5,
    levels: [
      { goldGainPct: 6, caravanBountyRewardPct: 6, potionBuffPct: 5, alchemyBatchBonusCharges: 1 },
      { goldGainPct: 12, caravanBountyRewardPct: 12, potionBuffPct: 10, alchemyBatchBonusCharges: 1 },
      { goldGainPct: 19, caravanBountyRewardPct: 19, potionBuffPct: 16, alchemyBatchBonusCharges: 2 },
      { goldGainPct: 27, caravanBountyRewardPct: 27, potionBuffPct: 23, alchemyBatchBonusCharges: 2 },
      { goldGainPct: 36, caravanBountyRewardPct: 36, potionBuffPct: 32, alchemyBatchBonusCharges: 3 },
    ],
  },
];

export interface RelicPedestalUpgradeCostTier {
  targetRank: 1 | 2 | 3 | 4 | 5;
  expeditionXpGain: number;
  standard: {
    ancientRelicShards: number;
    gold: number;
    items: Record<string, number>;
  };
  astralDust: {
    ancientRelicShards: number;
    astralCrystalDust: number;
    gold: number;
  };
}

export const RELIC_PEDESTAL_UPGRADE_COSTS: readonly RelicPedestalUpgradeCostTier[] = [
  {
    targetRank: 1,
    expeditionXpGain: 25,
    standard: { ancientRelicShards: 6, gold: 80, items: {} },
    astralDust: { ancientRelicShards: 4, astralCrystalDust: 4, gold: 50 },
  },
  {
    targetRank: 2,
    expeditionXpGain: 40,
    standard: { ancientRelicShards: 14, gold: 450, items: { crystal_1: 2 } },
    astralDust: { ancientRelicShards: 9, astralCrystalDust: 8, gold: 300 },
  },
  {
    targetRank: 3,
    expeditionXpGain: 65,
    standard: { ancientRelicShards: 26, gold: 1200, items: { crystal_1: 4, crystal_2: 2 } },
    astralDust: { ancientRelicShards: 16, astralCrystalDust: 14, gold: 800 },
  },
  {
    targetRank: 4,
    expeditionXpGain: 95,
    standard: { ancientRelicShards: 44, gold: 2800, items: { crystal_2: 4, crystal_3: 2 } },
    astralDust: { ancientRelicShards: 28, astralCrystalDust: 22, gold: 1800 },
  },
  {
    targetRank: 5,
    expeditionXpGain: 140,
    standard: { ancientRelicShards: 68, gold: 5600, items: { crystal_3: 4, crystal_4: 2 } },
    astralDust: { ancientRelicShards: 42, astralCrystalDust: 34, gold: 3600 },
  },
];

export interface FullGalleryResonanceDef {
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  bonuses: SacredRelicLevelStats;
}

export const FULL_GALLERY_RESONANCE_TIERS: readonly FullGalleryResonanceDef[] = [
  {
    tier: 1,
    title: "四圣初醒·微光圣殿",
    subtitle: "四座传世圣物全部修复至 Lv.1+",
    bonuses: {
      combatAtkPct: 4,
      armorPenPct: 0.03,
      relicCritAmpPct: 3,
      critRateBonusPct: 2,
      critDmgBonusPct: 8,
      intervalReductionPct: 2,
      gatherDoubleChance: 0.03,
      gatherEfficiencyPct: 4,
      craftSpeedPct: 5,
      craftEfficiencyPct: 4,
      goldGainPct: 6,
      caravanBountyRewardPct: 5,
    },
  },
  {
    tier: 2,
    title: "四圣谐振·辉耀回廊",
    subtitle: "四座传世圣物全部升阶至 Lv.2+",
    bonuses: {
      combatAtkPct: 7,
      armorPenPct: 0.05,
      relicCritAmpPct: 5,
      critRateBonusPct: 3.5,
      critDmgBonusPct: 14,
      intervalReductionPct: 3.5,
      gatherDoubleChance: 0.05,
      gatherEfficiencyPct: 7,
      craftSpeedPct: 9,
      craftEfficiencyPct: 7,
      goldGainPct: 10,
      caravanBountyRewardPct: 9,
    },
  },
  {
    tier: 3,
    title: "四圣贯星·苍穹秘殿",
    subtitle: "四座传世圣物全部升阶至 Lv.3+",
    bonuses: {
      combatAtkPct: 10,
      armorPenPct: 0.07,
      relicCritAmpPct: 8,
      critRateBonusPct: 5,
      critDmgBonusPct: 20,
      intervalReductionPct: 5,
      gatherDoubleChance: 0.08,
      gatherEfficiencyPct: 11,
      craftSpeedPct: 13,
      craftEfficiencyPct: 11,
      goldGainPct: 15,
      caravanBountyRewardPct: 13,
    },
  },
  {
    tier: 4,
    title: "四圣齐鸣·神代圣堂",
    subtitle: "四座传世圣物全部升阶至 Lv.4+",
    bonuses: {
      combatAtkPct: 14,
      armorPenPct: 0.09,
      relicCritAmpPct: 11,
      critRateBonusPct: 7,
      critDmgBonusPct: 28,
      intervalReductionPct: 6.5,
      gatherDoubleChance: 0.11,
      gatherEfficiencyPct: 15,
      craftSpeedPct: 18,
      craftEfficiencyPct: 15,
      goldGainPct: 21,
      caravanBountyRewardPct: 18,
    },
  },
  {
    tier: 5,
    title: "四圣圆满·太初不朽神殿",
    subtitle: "四座传世圣物全部臻至满阶 Lv.5",
    bonuses: {
      combatAtkPct: 18,
      armorPenPct: 0.12,
      relicCritAmpPct: 15,
      critRateBonusPct: 9.5,
      critDmgBonusPct: 38,
      intervalReductionPct: 8,
      gatherDoubleChance: 0.15,
      gatherEfficiencyPct: 20,
      craftSpeedPct: 24,
      craftEfficiencyPct: 20,
      goldGainPct: 28,
      caravanBountyRewardPct: 24,
    },
  },
];

export function isValidAstralRuinStratumId(id: unknown): id is AstralRuinStratumId {
  return typeof id === "string" && (ASTRAL_RUIN_STRATUM_IDS as readonly string[]).includes(id);
}

export function isValidSacredRelicId(id: unknown): id is SacredRelicId {
  return typeof id === "string" && (SACRED_RELIC_IDS as readonly string[]).includes(id);
}

export function getAstralCuratorTier(expeditionXp: number, storedRank?: number) {
  const rawXp = Number.isFinite(expeditionXp) && expeditionXp > 0 ? Math.floor(expeditionXp) : 0;
  const clampedStored =
    typeof storedRank === "number" && Number.isFinite(storedRank) && storedRank >= 1
      ? Math.min(ASTRAL_CURATOR_TIERS.length, Math.floor(storedRank))
      : 1;
  const storedFloorXp = ASTRAL_CURATOR_TIERS[clampedStored - 1]?.minXp ?? 0;
  const xp = Math.max(rawXp, storedFloorXp);

  let current = ASTRAL_CURATOR_TIERS[0];
  let next: AstralCuratorTierDef | null = null;
  for (let i = 0; i < ASTRAL_CURATOR_TIERS.length; i++) {
    if (xp >= ASTRAL_CURATOR_TIERS[i].minXp) {
      current = ASTRAL_CURATOR_TIERS[i];
      next = ASTRAL_CURATOR_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(100, Math.max(0, Math.round(((xp - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100)))
    : 100;

  return { current, next, progressPct, effectiveXp: xp };
}

export function previewExpeditionSurveyYield(
  stratumId: AstralRuinStratumId,
  mode: ExpeditionSurveyMode,
  totalSurveys: number,
  curatorRank: number
): {
  shardsGained: number;
  astralDustGained: number;
  expeditionXpGained: number;
  isVeinJackpot: boolean;
  nextSurveyNumber: number;
} {
  const stratum = ASTRAL_RUIN_STRATA.find((s) => s.id === stratumId) || ASTRAL_RUIN_STRATA[0];
  const spec = stratum.modes[mode];
  const clampedRank =
    Number.isFinite(curatorRank) && curatorRank >= 1
      ? Math.min(ASTRAL_CURATOR_TIERS.length, Math.floor(curatorRank))
      : 1;
  const curatorTier = ASTRAL_CURATOR_TIERS[clampedRank - 1] || ASTRAL_CURATOR_TIERS[0];
  const cleanSurveys = Number.isFinite(totalSurveys) && totalSurveys > 0 ? Math.floor(totalSurveys) : 0;
  const nextSurveyNumber = cleanSurveys + 1;
  const isVeinJackpot = nextSurveyNumber % ASTRAL_VEIN_CADENCE === 0;

  const shardsGained =
    spec.baseShards +
    curatorTier.surveyBonusShards +
    (isVeinJackpot ? stratum.veinBonus.shards : 0);
  const astralDustGained =
    spec.baseAstralDust + (isVeinJackpot ? stratum.veinBonus.astralDust : 0);
  const expeditionXpGained =
    spec.expeditionXp + (isVeinJackpot ? stratum.veinBonus.expeditionXp : 0);

  return {
    shardsGained,
    astralDustGained,
    expeditionXpGained,
    isVeinJackpot,
    nextSurveyNumber,
  };
}

export function getFullGalleryResonance(
  pedestalRanks?: Partial<Record<string, number>> | null
): FullGalleryResonanceDef | null {
  if (!pedestalRanks || typeof pedestalRanks !== "object") return null;
  let minRank = SACRED_RELIC_MAX_RANK;
  for (const rid of SACRED_RELIC_IDS) {
    const raw = Number(pedestalRanks[rid]);
    const clean = Number.isFinite(raw) && raw >= 0 ? Math.min(SACRED_RELIC_MAX_RANK, Math.floor(raw)) : 0;
    if (clean < minRank) minRank = clean;
  }
  if (minRank < 1) return null;
  return FULL_GALLERY_RESONANCE_TIERS[minRank - 1] || null;
}

export interface AstralRelicsBonuses {
  curatorRank: number;
  curatorTitle: string;
  surveyBonusShards: number;
  restoredCount: number;
  totalRelicLevels: number;
  fullGalleryResonanceTier: number;
  fullGalleryResonanceTitle: string | null;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  relicCritAmpPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  potionBuffMult: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  gatherEfficiencyPct: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  rareFindPct: number;
  caravanBountyRewardPct: number;
  alchemyBatchBonusCharges: number;
}

export type MinimalAstralRelicsHolder = {
  astralRelics?: {
    ancientRelicShards?: number;
    expeditionXp?: number;
    curatorRank?: number;
    totalSurveys?: number;
    totalRestorations?: number;
    pedestalRanks?: Partial<Record<string, number>> | null;
  } | null;
} | null;

export function getAstralRelicsBonuses(state?: MinimalAstralRelicsHolder): AstralRelicsBonuses {
  const ar = state?.astralRelics;
  if (!ar || typeof ar !== "object") {
    return {
      curatorRank: 1,
      curatorTitle: ASTRAL_CURATOR_TIERS[0].title,
      surveyBonusShards: 0,
      restoredCount: 0,
      totalRelicLevels: 0,
      fullGalleryResonanceTier: 0,
      fullGalleryResonanceTitle: null,
      bonusAtk: 0,
      bonusDef: 0,
      bonusHp: 0,
      combatAtkPct: 0,
      armorPenPct: 0,
      bossArmorBreakPct: 0,
      relicCritAmpPct: 0,
      intervalMult: 1,
      critRateBonusPct: 0,
      critDmgBonusPct: 0,
      potionBuffMult: 1,
      gatherSpeedPct: 0,
      gatherDoubleChance: 0,
      gatherEfficiencyPct: 0,
      craftSpeedPct: 0,
      craftEfficiencyPct: 0,
      xpGainPct: 0,
      goldGainPct: 0,
      rareFindPct: 0,
      caravanBountyRewardPct: 0,
      alchemyBatchBonusCharges: 0,
    };
  }

  const cleanSurveys =
    Number.isFinite(Number(ar.totalSurveys)) && Number(ar.totalSurveys) > 0
      ? Math.floor(Number(ar.totalSurveys))
      : 0;
  const cleanRestorations =
    Number.isFinite(Number(ar.totalRestorations)) && Number(ar.totalRestorations) > 0
      ? Math.floor(Number(ar.totalRestorations))
      : 0;
  const rawXp =
    Number.isFinite(Number(ar.expeditionXp)) && Number(ar.expeditionXp) > 0
      ? Math.floor(Number(ar.expeditionXp))
      : 0;
  const derivedXp = Math.max(
    rawXp,
    cleanSurveys * ASTRAL_MIN_SURVEY_XP + cleanRestorations * ASTRAL_MIN_RESTORE_XP
  );
  const { current: tier } = getAstralCuratorTier(derivedXp, ar.curatorRank);

  let restoredCount = 0;
  let totalRelicLevels = 0;
  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = tier.combatAtkPct;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let relicCritAmpPct = 0;
  let intervalReductionPct = 0;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  let potionBuffPct = 0;
  let gatherSpeedPct = tier.gatherSpeedPct;
  let gatherDoubleChance = 0;
  let gatherEfficiencyPct = 0;
  let craftSpeedPct = tier.craftSpeedPct;
  let craftEfficiencyPct = 0;
  let xpGainPct = 0;
  let goldGainPct = tier.goldGainPct;
  let rareFindPct = tier.rareFindPct;
  let caravanBountyRewardPct = 0;
  let alchemyBatchBonusCharges = 0;

  const rawRanks =
    ar.pedestalRanks && typeof ar.pedestalRanks === "object"
      ? (ar.pedestalRanks as Partial<Record<string, number>>)
      : {};
  const cleanRanks: Record<SacredRelicId, number> = {
    solar_spear: 0,
    verdant_chalice: 0,
    titan_anvil: 0,
    chimera_censer: 0,
  };

  const applyStats = (s: SacredRelicLevelStats) => {
    if (s.bonusAtk) bonusAtk += s.bonusAtk;
    if (s.bonusDef) bonusDef += s.bonusDef;
    if (s.bonusHp) bonusHp += s.bonusHp;
    if (s.combatAtkPct) combatAtkPct += s.combatAtkPct;
    if (s.armorPenPct) armorPenPct += s.armorPenPct;
    if (s.bossArmorBreakPct) bossArmorBreakPct += s.bossArmorBreakPct;
    if (s.relicCritAmpPct) relicCritAmpPct += s.relicCritAmpPct;
    if (s.intervalReductionPct) intervalReductionPct += s.intervalReductionPct;
    if (s.critRateBonusPct) critRateBonusPct += s.critRateBonusPct;
    if (s.critDmgBonusPct) critDmgBonusPct += s.critDmgBonusPct;
    if (s.potionBuffPct) potionBuffPct += s.potionBuffPct;
    if (s.gatherSpeedPct) gatherSpeedPct += s.gatherSpeedPct;
    if (s.gatherDoubleChance) gatherDoubleChance += s.gatherDoubleChance;
    if (s.gatherEfficiencyPct) gatherEfficiencyPct += s.gatherEfficiencyPct;
    if (s.rareFindPct) rareFindPct += s.rareFindPct;
    if (s.craftSpeedPct) craftSpeedPct += s.craftSpeedPct;
    if (s.craftEfficiencyPct) craftEfficiencyPct += s.craftEfficiencyPct;
    if (s.xpGainPct) xpGainPct += s.xpGainPct;
    if (s.goldGainPct) goldGainPct += s.goldGainPct;
    if (s.caravanBountyRewardPct) caravanBountyRewardPct += s.caravanBountyRewardPct;
    if (s.alchemyBatchBonusCharges) alchemyBatchBonusCharges += s.alchemyBatchBonusCharges;
  };

  for (const meta of SACRED_RELIC_PEDESTALS) {
    const r = Number(rawRanks[meta.id]);
    const cleanRank = Number.isFinite(r) && r >= 1 ? Math.min(SACRED_RELIC_MAX_RANK, Math.floor(r)) : 0;
    cleanRanks[meta.id] = cleanRank;
    if (cleanRank >= 1) {
      restoredCount += 1;
      totalRelicLevels += cleanRank;
      const lvlStats = meta.levels[cleanRank - 1];
      if (lvlStats) applyStats(lvlStats);
    }
  }

  const fullResonance = getFullGalleryResonance(cleanRanks);
  if (fullResonance) {
    applyStats(fullResonance.bonuses);
  }

  const finalArmorPen = Math.min(0.65, Math.round(armorPenPct * 1000) / 1000);
  const finalBossBreak = Math.min(0.65, Math.round(bossArmorBreakPct * 1000) / 1000);
  const intervalMult =
    intervalReductionPct > 0
      ? Math.max(0.75, Math.round((1 - intervalReductionPct / 100) * 1000) / 1000)
      : 1;
  const potionBuffMult =
    potionBuffPct > 0
      ? Math.round((1 + potionBuffPct / 100) * 1000) / 1000
      : 1;
  const finalCritRate = Math.round(critRateBonusPct * 10) / 10;
  const finalGatherDouble = Math.min(0.6, Math.round(gatherDoubleChance * 1000) / 1000);

  return {
    curatorRank: tier.level,
    curatorTitle: tier.title,
    surveyBonusShards: tier.surveyBonusShards,
    restoredCount,
    totalRelicLevels,
    fullGalleryResonanceTier: fullResonance ? fullResonance.tier : 0,
    fullGalleryResonanceTitle: fullResonance ? fullResonance.title : null,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct,
    armorPenPct: finalArmorPen,
    bossArmorBreakPct: finalBossBreak,
    relicCritAmpPct,
    intervalMult,
    critRateBonusPct: finalCritRate,
    critDmgBonusPct,
    potionBuffMult,
    gatherSpeedPct,
    gatherDoubleChance: finalGatherDouble,
    gatherEfficiencyPct,
    craftSpeedPct,
    craftEfficiencyPct,
    xpGainPct,
    goldGainPct,
    rareFindPct,
    caravanBountyRewardPct,
    alchemyBatchBonusCharges,
  };
}
