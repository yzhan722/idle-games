// 天空锻炉星辰神兵谱 & 公会秘境试炼契约阵 (WL-10) —— 前端镜像。
// 与 backend/src/progression2/sky_forge.ts 同名表与纯函数逐字对称（scripts/sky-forge-parity.test.ts 守护），
// 供面板预览、combatSheet 战斗属性与 fightPreview 使用；任何数值改动必须两端同步。

export type StarEmblemId =
  | "star_blade"
  | "crescent_bow"
  | "star_hammer"
  | "amethyst_staff";

export type GuildTrialPactId =
  | "ember_vanguard"
  | "verdant_harvest"
  | "forge_oath"
  | "gale_hunt"
  | "astral_covenant";

export type GuildPactAction = "sign" | "revoke";

export const STAR_EMBLEM_IDS: readonly StarEmblemId[] = [
  "star_blade",
  "crescent_bow",
  "star_hammer",
  "amethyst_staff",
];

export const GUILD_TRIAL_PACT_IDS: readonly GuildTrialPactId[] = [
  "ember_vanguard",
  "verdant_harvest",
  "forge_oath",
  "gale_hunt",
  "astral_covenant",
];

export const STAR_EMBLEM_MAX_LEVEL = 5;
export const SKY_FORGE_MAX_TOTAL_LEVELS = STAR_EMBLEM_MAX_LEVEL * 4;
export const GUILD_PACT_MAX_SLOTS = 3;
/** 对应纹章达到该等阶时，契约代价减半。 */
export const PACT_MITIGATION_EMBLEM_LEVEL = 4;
/** 锻炉达到该阶（神兵谱圆满）时，全部契约代价减半。 */
export const PACT_MITIGATION_FORGE_TIER = 4;

export interface StarEmblemLevelStats {
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  combatAtkPct?: number;
  armorPenPct?: number;
  bossArmorBreakPct?: number;
  critRateBonusPct?: number;
  critDmgBonusPct?: number;
  intervalReductionPct?: number;
  gatherSpeedPct?: number;
  gatherDoubleChance?: number;
  gatherEfficiencyPct?: number;
  craftSpeedPct?: number;
  craftEfficiencyPct?: number;
  xpGainPct?: number;
  goldGainPct?: number;
  rareFindPct?: number;
}

export type StarEmblemDomain = "combat" | "hunt" | "craft" | "gather";

export interface StarEmblemMeta {
  id: StarEmblemId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  domain: StarEmblemDomain;
  domainLabel: string;
  levels: readonly [
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
    StarEmblemLevelStats,
  ];
}

export const STAR_EMBLEMS: readonly StarEmblemMeta[] = [
  {
    id: "star_blade",
    name: "星辉圣剑",
    subtitle: "战斗攻势 · 基础攻击、战斗攻击倍率与组队暴击",
    description: "以星辉淬火的传世圣剑纹章，永久提升基础攻击、战斗攻击百分比与组队暴击率、组队暴击伤害。",
    iconId: "star_emblem_blade",
    domain: "combat",
    domainLabel: "战斗",
    levels: [
      { bonusAtk: 5, combatAtkPct: 3, critRateBonusPct: 1.5, critDmgBonusPct: 6 },
      { bonusAtk: 10, combatAtkPct: 6, critRateBonusPct: 3, critDmgBonusPct: 12 },
      { bonusAtk: 16, combatAtkPct: 9, critRateBonusPct: 4.5, critDmgBonusPct: 19 },
      { bonusAtk: 23, combatAtkPct: 13, critRateBonusPct: 6, critDmgBonusPct: 27 },
      { bonusAtk: 31, combatAtkPct: 17, critRateBonusPct: 8, critDmgBonusPct: 36 },
    ],
  },
  {
    id: "crescent_bow",
    name: "新月长弓",
    subtitle: "疾猎贯星 · 普攻间隔、破甲、首领破防与珍稀掉落",
    description: "新月弦光凝成的长弓纹章，永久缩短普攻间隔、提升护甲穿透与首领破甲，并提高狩猎珍稀掉落。",
    iconId: "star_emblem_bow",
    domain: "hunt",
    domainLabel: "狩猎",
    levels: [
      { intervalReductionPct: 2, armorPenPct: 0.03, bossArmorBreakPct: 0.02, rareFindPct: 3 },
      { intervalReductionPct: 3.5, armorPenPct: 0.05, bossArmorBreakPct: 0.04, rareFindPct: 6 },
      { intervalReductionPct: 5, armorPenPct: 0.08, bossArmorBreakPct: 0.06, rareFindPct: 10 },
      { intervalReductionPct: 6.5, armorPenPct: 0.11, bossArmorBreakPct: 0.08, rareFindPct: 14 },
      { intervalReductionPct: 8, armorPenPct: 0.14, bossArmorBreakPct: 0.1, rareFindPct: 19 },
    ],
  },
  {
    id: "star_hammer",
    name: "星铁战锤",
    subtitle: "神匠锻造 · 制作速度、制作连作与基础防御",
    description: "陨星铁锻成的战锤纹章，永久提升全制作速度、免费连作效率，并以星铁护体提高基础防御。",
    iconId: "star_emblem_hammer",
    domain: "craft",
    domainLabel: "制造",
    levels: [
      { bonusDef: 4, craftSpeedPct: 5, craftEfficiencyPct: 4 },
      { bonusDef: 8, craftSpeedPct: 10, craftEfficiencyPct: 8 },
      { bonusDef: 13, craftSpeedPct: 16, craftEfficiencyPct: 13 },
      { bonusDef: 19, craftSpeedPct: 22, craftEfficiencyPct: 18 },
      { bonusDef: 26, craftSpeedPct: 30, craftEfficiencyPct: 24 },
    ],
  },
  {
    id: "amethyst_staff",
    name: "紫晶法杖",
    subtitle: "秘法丰收 · 采集速度、双倍采集、技能经验与生命",
    description: "紫晶秘法凝结的法杖纹章，永久提升全采集速度与双倍采集几率、生活与单人战斗经验，并以秘法护佑提高生命上限。",
    iconId: "star_emblem_staff",
    domain: "gather",
    domainLabel: "采集",
    levels: [
      { bonusHp: 15, gatherSpeedPct: 5, gatherDoubleChance: 0.03, xpGainPct: 2 },
      { bonusHp: 30, gatherSpeedPct: 10, gatherDoubleChance: 0.06, xpGainPct: 4 },
      { bonusHp: 50, gatherSpeedPct: 15, gatherDoubleChance: 0.09, xpGainPct: 7 },
      { bonusHp: 75, gatherSpeedPct: 21, gatherDoubleChance: 0.13, xpGainPct: 10 },
      { bonusHp: 105, gatherSpeedPct: 28, gatherDoubleChance: 0.17, xpGainPct: 14 },
    ],
  },
];

export interface StarEmblemForgeCostTier {
  targetLevel: 1 | 2 | 3 | 4 | 5;
  ancientRelicShards: number;
  astralCrystalDust: number;
}

export const STAR_EMBLEM_FORGE_COSTS: readonly StarEmblemForgeCostTier[] = [
  { targetLevel: 1, ancientRelicShards: 8, astralCrystalDust: 4 },
  { targetLevel: 2, ancientRelicShards: 16, astralCrystalDust: 9 },
  { targetLevel: 3, ancientRelicShards: 28, astralCrystalDust: 16 },
  { targetLevel: 4, ancientRelicShards: 44, astralCrystalDust: 26 },
  { targetLevel: 5, ancientRelicShards: 66, astralCrystalDust: 40 },
];

export interface SkyForgeTierDef {
  tier: 0 | 1 | 2 | 3 | 4;
  minTotalLevels: number;
  title: string;
  pactSlots: number;
}

export const SKY_FORGE_TIERS: readonly SkyForgeTierDef[] = [
  { tier: 0, minTotalLevels: 0, title: "冷寂天空锻炉", pactSlots: 0 },
  { tier: 1, minTotalLevels: 2, title: "星火初燃锻炉", pactSlots: 1 },
  { tier: 2, minTotalLevels: 7, title: "辉月熔铸天炉", pactSlots: 2 },
  { tier: 3, minTotalLevels: 13, title: "星穹神铸天炉", pactSlots: 3 },
  { tier: 4, minTotalLevels: 20, title: "太初星辰神兵天炉", pactSlots: 3 },
];

export interface GuildTrialPactDef {
  id: GuildTrialPactId;
  name: string;
  subtitle: string;
  description: string;
  iconId: string;
  pactTier: 1 | 2 | 3;
  unlockTotalLevels: number;
  alignedEmblem: StarEmblemId | null;
  signDust: number;
  boons: StarEmblemLevelStats;
  tradeoffs: StarEmblemLevelStats;
}

export const GUILD_TRIAL_PACTS: readonly GuildTrialPactDef[] = [
  {
    id: "ember_vanguard",
    name: "赤焰先锋试炼契",
    subtitle: "以工坊产能换取讨伐攻势",
    description: "立誓先锋讨伐秘境魔物：战斗攻击与组队暴击伤害大幅提升，但工坊制作速度下降。",
    iconId: "guild_trial_pact",
    pactTier: 1,
    unlockTotalLevels: 2,
    alignedEmblem: "star_blade",
    signDust: 3,
    boons: { combatAtkPct: 8, critDmgBonusPct: 12 },
    tradeoffs: { craftSpeedPct: -8 },
  },
  {
    id: "verdant_harvest",
    name: "翠野丰收试炼契",
    subtitle: "以战斗锋芒换取采集丰产",
    description: "立誓守护秘境翠野：采集速度与采集连作效率提升，但战斗攻击下降。",
    iconId: "guild_trial_pact",
    pactTier: 1,
    unlockTotalLevels: 2,
    alignedEmblem: "amethyst_staff",
    signDust: 3,
    boons: { gatherSpeedPct: 10, gatherEfficiencyPct: 8 },
    tradeoffs: { combatAtkPct: -4 },
  },
  {
    id: "forge_oath",
    name: "星铁匠誓试炼契",
    subtitle: "以采集节奏换取神匠连作",
    description: "立誓闭关星铁工坊：制作速度与免费连作效率提升，但采集速度下降。",
    iconId: "guild_trial_pact",
    pactTier: 2,
    unlockTotalLevels: 6,
    alignedEmblem: "star_hammer",
    signDust: 5,
    boons: { craftSpeedPct: 12, craftEfficiencyPct: 10 },
    tradeoffs: { gatherSpeedPct: -6 },
  },
  {
    id: "gale_hunt",
    name: "新月疾猎试炼契",
    subtitle: "以单人战斗金币换取疾猎破甲",
    description: "立誓追猎新月秘境：普攻间隔缩短，护甲穿透与珍稀掉落提升，但单人战斗金币下降。",
    iconId: "guild_trial_pact",
    pactTier: 2,
    unlockTotalLevels: 10,
    alignedEmblem: "crescent_bow",
    signDust: 6,
    boons: { intervalReductionPct: 4, armorPenPct: 0.06, rareFindPct: 8 },
    tradeoffs: { goldGainPct: -8 },
  },
  {
    id: "astral_covenant",
    name: "紫晶星盟终焉契",
    subtitle: "以攻势与产能换取星盟财富与经验",
    description: "与星盟缔结终焉之约：单人战斗金币、生活与单人战斗经验、双倍采集与组队暴击率提升，但战斗攻击与制作速度同时下降。",
    iconId: "guild_trial_pact",
    pactTier: 3,
    unlockTotalLevels: 15,
    alignedEmblem: null,
    signDust: 10,
    boons: { goldGainPct: 12, xpGainPct: 10, gatherDoubleChance: 0.05, critRateBonusPct: 3 },
    tradeoffs: { combatAtkPct: -6, craftSpeedPct: -6 },
  },
];

export interface GuildPactLinkTierDef {
  linkTier: 1 | 2;
  minActivePacts: number;
  title: string;
  subtitle: string;
  bonuses: StarEmblemLevelStats;
}

export const GUILD_PACT_LINK_TIERS: readonly GuildPactLinkTierDef[] = [
  {
    linkTier: 1,
    minActivePacts: 2,
    title: "双契连携·星辉共振",
    subtitle: "同时签署 2 份试炼契约",
    bonuses: { combatAtkPct: 3, gatherSpeedPct: 3, craftSpeedPct: 3, goldGainPct: 3 },
  },
  {
    linkTier: 2,
    minActivePacts: 3,
    title: "三契连携·秘境同心",
    subtitle: "同时签署 3 份试炼契约",
    bonuses: {
      combatAtkPct: 6,
      gatherSpeedPct: 6,
      craftSpeedPct: 6,
      goldGainPct: 6,
      intervalReductionPct: 2,
      xpGainPct: 4,
    },
  },
];

export function isValidStarEmblemId(id: unknown): id is StarEmblemId {
  return typeof id === "string" && (STAR_EMBLEM_IDS as readonly string[]).includes(id);
}

export function isValidGuildTrialPactId(id: unknown): id is GuildTrialPactId {
  return typeof id === "string" && (GUILD_TRIAL_PACT_IDS as readonly string[]).includes(id);
}

/** 纹章等阶净化：非数/负数 → 0，小数向下取整，上限 Lv.5。 */
export function cleanStarEmblemLevels(raw?: Partial<Record<string, unknown>> | null): Record<StarEmblemId, number> {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {} as Record<StarEmblemId, number>;
  for (const id of STAR_EMBLEM_IDS) {
    const n = Number(src[id]);
    out[id] = Number.isFinite(n) && n >= 0 ? Math.min(STAR_EMBLEM_MAX_LEVEL, Math.floor(n)) : 0;
  }
  return out;
}

export function sumStarEmblemLevels(levels: Record<StarEmblemId, number>): number {
  let total = 0;
  for (const id of STAR_EMBLEM_IDS) total += levels[id] || 0;
  return total;
}

export function getSkyForgeTier(totalEmblemLevels: number) {
  const total =
    Number.isFinite(totalEmblemLevels) && totalEmblemLevels > 0
      ? Math.min(SKY_FORGE_MAX_TOTAL_LEVELS, Math.floor(totalEmblemLevels))
      : 0;
  let current = SKY_FORGE_TIERS[0];
  let next: SkyForgeTierDef | null = null;
  for (let i = 0; i < SKY_FORGE_TIERS.length; i++) {
    if (total >= SKY_FORGE_TIERS[i].minTotalLevels) {
      current = SKY_FORGE_TIERS[i];
      next = SKY_FORGE_TIERS[i + 1] ?? null;
    }
  }
  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((total - current.minTotalLevels) / Math.max(1, next.minTotalLevels - current.minTotalLevels)) * 100)
        )
      )
    : 100;
  return { current, next, progressPct, totalEmblemLevels: total };
}

/** 契约阵净化：去重、剔除非法/未解锁契约，并按当前锻炉阵位截断（保留签约先后顺序）。 */
export function sanitizeActivePacts(raw: unknown, totalEmblemLevels: number): GuildTrialPactId[] {
  const slots = getSkyForgeTier(totalEmblemLevels).current.pactSlots;
  const out: GuildTrialPactId[] = [];
  if (!Array.isArray(raw)) return out;
  for (const id of raw) {
    if (out.length >= slots) break;
    if (!isValidGuildTrialPactId(id) || out.includes(id)) continue;
    const def = GUILD_TRIAL_PACTS.find((p) => p.id === id);
    if (!def || totalEmblemLevels < def.unlockTotalLevels) continue;
    out.push(id);
  }
  return out;
}

export function isPactTradeoffMitigated(
  pact: GuildTrialPactDef,
  emblemLevels: Record<StarEmblemId, number>,
  forgeTier: number
): boolean {
  if (forgeTier >= PACT_MITIGATION_FORGE_TIER) return true;
  if (!pact.alignedEmblem) return false;
  return (emblemLevels[pact.alignedEmblem] || 0) >= PACT_MITIGATION_EMBLEM_LEVEL;
}

/** 契约实际代价：减半时向零取整（全部代价为偶数整数，减半结果恒为整数）。 */
export function effectivePactTradeoffs(pact: GuildTrialPactDef, mitigated: boolean): StarEmblemLevelStats {
  const out: StarEmblemLevelStats = {};
  for (const [k, v] of Object.entries(pact.tradeoffs) as Array<[keyof StarEmblemLevelStats, number]>) {
    if (typeof v !== "number" || v === 0) continue;
    out[k] = mitigated ? Math.trunc(v / 2) : v;
  }
  return out;
}

export function getGuildPactLinkTier(activePactCount: number): GuildPactLinkTierDef | null {
  let best: GuildPactLinkTierDef | null = null;
  for (const t of GUILD_PACT_LINK_TIERS) {
    if (activePactCount >= t.minActivePacts) best = t;
  }
  return best;
}

export interface SkyForgeBonuses {
  totalEmblemLevels: number;
  forgedCount: number;
  forgeTier: number;
  forgeTitle: string;
  pactSlots: number;
  activePacts: GuildTrialPactId[];
  activePactCount: number;
  mitigatedPacts: GuildTrialPactId[];
  linkTier: number;
  linkTitle: string | null;
  bonusAtk: number;
  bonusDef: number;
  bonusHp: number;
  combatAtkPct: number;
  armorPenPct: number;
  bossArmorBreakPct: number;
  intervalMult: number;
  critRateBonusPct: number;
  critDmgBonusPct: number;
  gatherSpeedPct: number;
  gatherDoubleChance: number;
  gatherEfficiencyPct: number;
  craftSpeedPct: number;
  craftEfficiencyPct: number;
  xpGainPct: number;
  goldGainPct: number;
  rareFindPct: number;
}

/** 契约代价下限：净值最多 -30%，防止多契叠加把产能/攻势压穿。 */
export const SKY_FORGE_NEGATIVE_FLOOR_PCT = -30;

export type MinimalSkyForgeHolder = {
  skyForge?: {
    emblemLevels?: Partial<Record<string, number>> | null;
    activePacts?: ReadonlyArray<string> | unknown;
    totalForges?: number;
    totalPactsSigned?: number;
  } | null;
} | null;

export function getSkyForgeBonuses(state?: MinimalSkyForgeHolder): SkyForgeBonuses {
  const sf = state?.skyForge as
    | {
        emblemLevels?: Partial<Record<string, number>> | null;
        activePacts?: unknown;
      }
    | undefined
    | null;
  const levels = cleanStarEmblemLevels(sf && typeof sf === "object" ? sf.emblemLevels : null);
  const total = sumStarEmblemLevels(levels);
  const tierInfo = getSkyForgeTier(total);
  const activePacts = sf && typeof sf === "object" ? sanitizeActivePacts(sf.activePacts, total) : [];

  let bonusAtk = 0;
  let bonusDef = 0;
  let bonusHp = 0;
  let combatAtkPct = 0;
  let armorPenPct = 0;
  let bossArmorBreakPct = 0;
  let intervalReductionPct = 0;
  let critRateBonusPct = 0;
  let critDmgBonusPct = 0;
  let gatherSpeedPct = 0;
  let gatherDoubleChance = 0;
  let gatherEfficiencyPct = 0;
  let craftSpeedPct = 0;
  let craftEfficiencyPct = 0;
  let xpGainPct = 0;
  let goldGainPct = 0;
  let rareFindPct = 0;

  const applyStats = (s: StarEmblemLevelStats) => {
    if (s.bonusAtk) bonusAtk += s.bonusAtk;
    if (s.bonusDef) bonusDef += s.bonusDef;
    if (s.bonusHp) bonusHp += s.bonusHp;
    if (s.combatAtkPct) combatAtkPct += s.combatAtkPct;
    if (s.armorPenPct) armorPenPct += s.armorPenPct;
    if (s.bossArmorBreakPct) bossArmorBreakPct += s.bossArmorBreakPct;
    if (s.intervalReductionPct) intervalReductionPct += s.intervalReductionPct;
    if (s.critRateBonusPct) critRateBonusPct += s.critRateBonusPct;
    if (s.critDmgBonusPct) critDmgBonusPct += s.critDmgBonusPct;
    if (s.gatherSpeedPct) gatherSpeedPct += s.gatherSpeedPct;
    if (s.gatherDoubleChance) gatherDoubleChance += s.gatherDoubleChance;
    if (s.gatherEfficiencyPct) gatherEfficiencyPct += s.gatherEfficiencyPct;
    if (s.craftSpeedPct) craftSpeedPct += s.craftSpeedPct;
    if (s.craftEfficiencyPct) craftEfficiencyPct += s.craftEfficiencyPct;
    if (s.xpGainPct) xpGainPct += s.xpGainPct;
    if (s.goldGainPct) goldGainPct += s.goldGainPct;
    if (s.rareFindPct) rareFindPct += s.rareFindPct;
  };

  let forgedCount = 0;
  for (const meta of STAR_EMBLEMS) {
    const lv = levels[meta.id];
    if (lv >= 1) {
      forgedCount += 1;
      const s = meta.levels[lv - 1];
      if (s) applyStats(s);
    }
  }

  const mitigatedPacts: GuildTrialPactId[] = [];
  for (const pid of activePacts) {
    const def = GUILD_TRIAL_PACTS.find((p) => p.id === pid);
    if (!def) continue;
    const mitigated = isPactTradeoffMitigated(def, levels, tierInfo.current.tier);
    if (mitigated) mitigatedPacts.push(pid);
    applyStats(def.boons);
    applyStats(effectivePactTradeoffs(def, mitigated));
  }

  const link = getGuildPactLinkTier(activePacts.length);
  if (link) applyStats(link.bonuses);

  const floor = (v: number) => Math.max(SKY_FORGE_NEGATIVE_FLOOR_PCT, v);
  const intervalMult =
    intervalReductionPct > 0 ? Math.max(0.8, Math.round((1 - intervalReductionPct / 100) * 1000) / 1000) : 1;

  return {
    totalEmblemLevels: total,
    forgedCount,
    forgeTier: tierInfo.current.tier,
    forgeTitle: tierInfo.current.title,
    pactSlots: tierInfo.current.pactSlots,
    activePacts,
    activePactCount: activePacts.length,
    mitigatedPacts,
    linkTier: link ? link.linkTier : 0,
    linkTitle: link ? link.title : null,
    bonusAtk,
    bonusDef,
    bonusHp,
    combatAtkPct: floor(combatAtkPct),
    armorPenPct: Math.min(0.5, Math.round(armorPenPct * 1000) / 1000),
    bossArmorBreakPct: Math.min(0.5, Math.round(bossArmorBreakPct * 1000) / 1000),
    intervalMult,
    critRateBonusPct: Math.round(critRateBonusPct * 10) / 10,
    critDmgBonusPct,
    gatherSpeedPct: floor(gatherSpeedPct),
    gatherDoubleChance: Math.min(0.5, Math.round(gatherDoubleChance * 1000) / 1000),
    gatherEfficiencyPct,
    craftSpeedPct: floor(craftSpeedPct),
    craftEfficiencyPct,
    xpGainPct,
    goldGainPct: floor(goldGainPct),
    rareFindPct,
  };
}
