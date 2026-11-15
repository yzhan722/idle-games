import { enhancementStatMultiplier } from "./enhancement";
import { getAlchemyCauldronBonuses } from "./alchemyCauldron";
import { getAstralRelicsBonuses } from "./astralRelics";

/** Must stay aligned with backend/src/first_hour_combat.ts playerCombatant + combat_skills.ts. */

export type CombatSheet = {
  hp: number;
  atk: number;
  def: number;
  /** Basic-attack interval after the attack skill (ms). Older callers may omit it → 3000. */
  intervalMs?: number;
  mp?: number;
  mpRegenPerTick?: number;
  /** MWI Combat Advanced Stats: Accuracy %, Evasion %, Crit Rate %, Crit Damage % */
  accuracyPct?: number;
  evasionPct?: number;
  critRatePct?: number;
  critDmgPct?: number;
  /** WL-8 Chimera Alchemy Cauldron: percentage combat attack multiplier. */
  combatAtkPct?: number;
  /** Chapter 2 build (heavy_sunder): fraction of defender DEF ignored on hit. */
  armorPenPct?: number;
  /** WL-8 Chimera Alchemy Cauldron: additional fraction of Boss DEF ignored on hit. */
  bossArmorBreakPct?: number;
  /** WL-9 Sacred Relic Gallery (曜阳破军圣枪 & 全馆共鸣): deterministic crit-surge hit damage bonus (%). */
  relicCritAmpPct?: number;
  /** Chapter 2 build (quenched_thorns): fraction of player DEF reflected onto attacker. */
  thornsDefRatio?: number;
  /** Chapter 3 build (relic_hunter): combat gold & rare drop multipliers. */
  goldMult?: number;
  dropMult?: number;
  /** Chapter 4 builds (elixir_frenzy / feast_vitality): potion & food combat multipliers. */
  potionBuffMult?: number;
  foodHealMult?: number;
};

type PackItem = {
  id: string;
  type?: string;
  slot?: string;
  atk?: number;
  mag?: number;
  def?: number;
  hp?: number;
};

type Equipment = Record<string, unknown> & {
  enhancementLevels?: Record<string, number>;
  durability?: Record<string, number>;
  maxDurability?: Record<string, number>;
};

export type CombatSkillKey = "stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic";
export const COMBAT_SKILL_KEYS: CombatSkillKey[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];

type SkillLevels = Partial<Record<CombatSkillKey, { level?: number }>>;

type State = {
  combatLevel?: number;
  combatSkills?: SkillLevels;
  chapter1Build?: "sharpened_edge" | "thick_bark";
  chapter2Build?: "heavy_sunder" | "quenched_thorns";
  chapter3Build?: "gale_flurry" | "relic_hunter";
  chapter4Build?: "elixir_frenzy" | "feast_vitality";
  equipment?: Equipment;
  inventory?: Record<string, number>;
  activeBuffs?: Array<{
    expiresAt: string;
    stats?: { atk?: number; def?: number };
  }>;
  bounties?: {
    date?: string;
    bounties?: Array<{
      affixId?: string;
      metric?: "gather" | "craft" | "kill";
      target?: number;
      baseline?: number;
      accepted?: boolean;
      claimed?: boolean;
    }>;
    claimedAffixesToday?: string[];
  };
  stats?: {
    totalGathered?: number;
    totalCrafted?: number;
    totalKills?: number;
  };
  heritageWorkshop?: {
    runeRanks?: Partial<Record<string, number>>;
    equippedRunes?: Partial<Record<"weapon" | "armor" | "tool", string | null>>;
    codexUnlockedItems?: string[];
  };
  caravanTrade?: {
    caravanRep?: number;
    ledgerRank?: number;
  };
  alchemyCauldron?: {
    recipeRanks?: Partial<Record<string, number>> | null;
    potionCharges?: Partial<Record<string, number>> | null;
    equippedPotions?: ReadonlyArray<string | null | undefined> | null;
    totalBrews?: number;
    totalUpgrades?: number;
    cauldronPoints?: number;
    alchemyCauldronRank?: number;
  } | null;
  astralRelics?: {
    pedestalRanks?: Partial<Record<string, number>> | null;
    expeditionXp?: number;
    curatorRank?: number;
    ancientRelicShards?: number;
    totalSurveys?: number;
    totalRestorations?: number;
  } | null;
};

/** Mirror of backend weaponMainSkill: bows → ranged, staffs / scepters / wands → magic, else melee. */
export function weaponMainSkill(mainHandItemId: unknown): CombatSkillKey {
  const id = String(mainHandItemId || "").toLowerCase();
  if (!id) return "melee";
  if (/(^|_)(bow|crossbow)(_|$)/.test(id)) return "ranged";
  if (/(^|_)(staff|scepter|wand)(_|$)/.test(id)) return "magic";
  return "melee";
}

export function mainCombatSkill(state: State | null | undefined): CombatSkillKey {
  return weaponMainSkill(state?.equipment?.main_hand);
}

/** Mirror of backend combatSkillContribution. Legacy saves without skills read every skill from combatLevel. */
export function skillContribution(state: State | null | undefined) {
  const lvl = (id: CombatSkillKey) => state?.combatSkills?.[id]?.level || state?.combatLevel || 1;
  const sta = lvl("stamina");
  const int = lvl("intelligence");
  const atk = lvl("attack");
  const def = lvl("defense");
  const dmg = lvl(mainCombatSkill(state));
  return {
    hp: 50 + (sta - 1) * 10,
    mp: 20 + (int - 1) * 5,
    atk: 5 + (dmg - 1),
    def: Math.floor((def - 1) / 2),
    intervalMs: Math.round(3000 / (1 + (atk - 1) * 0.01)),
    mpRegenPerTick: 1 + Math.floor(int / 10),
  };
}

/** Mirror of backend abilitySlotCount. */
export function abilitySlotCount(state: State | null | undefined): number {
  const int = state?.combatSkills?.intelligence?.level || 1;
  return Math.min(4, 1 + Math.floor(int / 10));
}

/** MWI: 0.1 × (stamina + intelligence + attack + defense + best damage) + 0.5 × best of attack / defense / damage. */
export function derivedCombatLevel(state: State | null | undefined): number {
  const cs = state?.combatSkills;
  if (!cs) return state?.combatLevel || 1;
  const l = (id: CombatSkillKey) => cs[id]?.level || 1;
  const bestDamage = Math.max(l("melee"), l("ranged"), l("magic"));
  const sum = l("stamina") + l("intelligence") + l("attack") + l("defense") + bestDamage;
  const best = Math.max(l("attack"), l("defense"), bestDamage);
  return Math.max(1, Math.floor(0.1 * sum + 0.5 * best));
}

const BUILD = {
  sharpened_edge: { atk: 4, hp: 0, def: 0 },
  thick_bark: { atk: 0, hp: 20, def: 4 },
} as const;

const AFFIX_COMBAT_TABLE: Record<
  string,
  {
    active: { armorPenPct?: number; bonusAtk?: number; intervalMult?: number; goldGainPct?: number; rareFindPct?: number };
    lingering: { armorPenPct?: number; bonusAtk?: number; intervalMult?: number; goldGainPct?: number; rareFindPct?: number };
  }
> = {
  scorching_sunder: {
    active: { armorPenPct: 0.3, bonusAtk: 6 },
    lingering: { armorPenPct: 0.08, bonusAtk: 2 },
  },
  swift_assault: {
    active: { intervalMult: 0.82 },
    lingering: { intervalMult: 0.95 },
  },
  gilded_spoils: {
    active: { goldGainPct: 35, rareFindPct: 25 },
    lingering: { goldGainPct: 8, rareFindPct: 6 },
  },
};

function guildAffixCombatExtras(state: State | null | undefined) {
  const res = { bonusAtk: 0, armorPenPct: 0, intervalMult: 1, goldGainPct: 0, rareFindPct: 0 };
  const board = state?.bounties?.bounties;
  if (!Array.isArray(board) || board.length === 0) return res;
  const stats = state?.stats || {};
  const modeByAffix = new Map<string, "active" | "lingering">();
  for (const b of board) {
    if (!b.affixId) continue;
    const cur =
      b.metric === "gather"
        ? Number(stats.totalGathered || 0)
        : b.metric === "craft"
          ? Number(stats.totalCrafted || 0)
          : Number(stats.totalKills || 0);
    const progress = Math.max(0, Math.min(Number(b.target || 0), cur - Number(b.baseline || 0)));
    if (b.accepted && !b.claimed && progress < Number(b.target || 0)) {
      modeByAffix.set(b.affixId, "active");
    } else if (b.claimed && modeByAffix.get(b.affixId) !== "active") {
      modeByAffix.set(b.affixId, "lingering");
    }
  }
  if (Array.isArray(state?.bounties?.claimedAffixesToday)) {
    for (const aid of state!.bounties!.claimedAffixesToday!) {
      if (!modeByAffix.has(aid)) modeByAffix.set(aid, "lingering");
    }
  }
  for (const [aid, mode] of modeByAffix.entries()) {
    const entry = AFFIX_COMBAT_TABLE[aid];
    if (!entry) continue;
    const m = mode === "active" ? entry.active : entry.lingering;
    res.bonusAtk += m.bonusAtk || 0;
    res.armorPenPct = Math.min(0.75, res.armorPenPct + (m.armorPenPct || 0));
    if (m.intervalMult && m.intervalMult > 0) {
      res.intervalMult = Math.max(0.65, Math.round(res.intervalMult * m.intervalMult * 1000) / 1000);
    }
    res.goldGainPct += m.goldGainPct || 0;
    res.rareFindPct += m.rareFindPct || 0;
  }
  return res;
}

const HERITAGE_RUNE_COMBAT_TABLE: Record<
  string,
  {
    slot: "weapon" | "armor" | "tool";
    maxRank: number;
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
    goldGainPct?: number;
  }
> = {
  rune_sunder_edge: { slot: "weapon", maxRank: 5, bonusAtk: 4, armorPenPct: 0.04, critRateBonusPct: 1.8 },
  rune_tempest_fang: { slot: "weapon", maxRank: 5, bonusAtk: 3, intervalReductionPct: 2.4, critDmgBonusPct: 8 },
  rune_bastion_ward: { slot: "armor", maxRank: 5, bonusHp: 22, bonusDef: 3, thornsDefRatio: 0.06 },
  rune_vital_aegis: { slot: "armor", maxRank: 5, bonusHp: 28, bonusDef: 2, foodHealPct: 5, potionBuffPct: 4 },
  rune_bountiful_pick: { slot: "tool", maxRank: 5 },
  rune_artisan_forge: { slot: "tool", maxRank: 5, goldGainPct: 3 },
};

const CODEX_SET_TIER_TABLE: Array<{
  itemIds: string[];
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  armorPenPct?: number;
  critRateBonusPct?: number;
  foodHealPct?: number;
  potionBuffPct?: number;
  goldGainPct?: number;
}> = [
  { itemIds: ["ore_1", "ingot_1", "weapon_iron_sword"], bonusAtk: 2 },
  { itemIds: ["ore_3", "armor_blacksmith_iron_chest", "weapon_forge_hammer_t2"], bonusAtk: 4, bonusDef: 3 },
  { itemIds: ["ore_6", "weapon_frost_blade", "armor_frost_chest"], bonusAtk: 6, armorPenPct: 0.04 },
  { itemIds: ["fiber_1", "yarn_1", "armor_cloth_chest"], bonusDef: 2 },
  { itemIds: ["fiber_3", "armor_tailor_leather_chest", "weapon_scissors_t2"], bonusHp: 20 },
  { itemIds: ["fiber_4", "weapon_scissors_t3", "armor_void_chest"], bonusHp: 35, bonusDef: 4 },
  { itemIds: ["wool", "food_simple", "armor_farmer_cloth_chest"], bonusHp: 18 },
  { itemIds: ["honey", "armor_chef_leather_chest", "food_hearty_stew"], bonusHp: 30, foodHealPct: 4, goldGainPct: 3 },
  { itemIds: ["milk", "weapon_frying_pan_t2", "food_master_feast"], bonusHp: 50, bonusDef: 4, foodHealPct: 6 },
  { itemIds: ["crystal_1", "potion_hp_t1", "weapon_staff_t1"], bonusAtk: 2 },
  { itemIds: ["crystal_2", "armor_alchemist_cloth_robe", "weapon_staff_t2"], bonusAtk: 4, potionBuffPct: 4 },
  { itemIds: ["crystal_4", "weapon_staff_t3", "elixir_legend"], bonusAtk: 6, critRateBonusPct: 2, potionBuffPct: 6 },
];

const CODEX_GLOBAL_COMBAT_TABLE: Array<{
  requiredTiers: number;
  bonusAtk?: number;
  bonusDef?: number;
  bonusHp?: number;
  armorPenPct?: number;
  goldGainPct?: number;
}> = [
  { requiredTiers: 4, bonusAtk: 3, bonusHp: 25 },
  { requiredTiers: 8, bonusAtk: 5, bonusDef: 4, bonusHp: 40, goldGainPct: 5 },
  { requiredTiers: 12, bonusAtk: 8, bonusDef: 6, bonusHp: 70, armorPenPct: 0.05 },
];

export function heritageWorkshopCombatExtras(state: State | null | undefined) {
  const out = {
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
    goldGainPct: 0,
  };
  const hw = state?.heritageWorkshop;
  if (!hw || typeof hw !== "object") return out;

  let foodHealPct = 0;
  let potionBuffPct = 0;
  const eqRunes = hw.equippedRunes || {};
  const ranks = hw.runeRanks || {};
  for (const slot of ["weapon", "armor", "tool"] as const) {
    const rid = eqRunes[slot];
    if (!rid || typeof rid !== "string") continue;
    const def = HERITAGE_RUNE_COMBAT_TABLE[rid];
    if (!def || def.slot !== slot) continue;
    const rawRank = Number(ranks[rid] || 0);
    const r = Number.isFinite(rawRank) && rawRank > 0 ? Math.min(def.maxRank, Math.floor(rawRank)) : 0;
    if (r <= 0) continue;
    if (def.bonusAtk) out.bonusAtk += def.bonusAtk * r;
    if (def.bonusDef) out.bonusDef += def.bonusDef * r;
    if (def.bonusHp) out.bonusHp += def.bonusHp * r;
    if (def.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + def.armorPenPct * r) * 1000) / 1000);
    if (def.thornsDefRatio) {
      out.thornsDefRatio = Math.min(0.85, Math.round((out.thornsDefRatio + def.thornsDefRatio * r) * 1000) / 1000);
    }
    if (def.intervalReductionPct) {
      const m = Math.max(0.7, 1 - (def.intervalReductionPct * r) / 100);
      out.intervalMult = Math.max(0.65, Math.round(out.intervalMult * m * 1000) / 1000);
    }
    if (def.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + def.critRateBonusPct * r) * 10) / 10;
    if (def.critDmgBonusPct) out.critDmgBonusPct += def.critDmgBonusPct * r;
    if (def.foodHealPct) foodHealPct += def.foodHealPct * r;
    if (def.potionBuffPct) potionBuffPct += def.potionBuffPct * r;
    if (def.goldGainPct) out.goldGainPct += def.goldGainPct * r;
  }

  const unlocked = new Set(Array.isArray(hw.codexUnlockedItems) ? hw.codexUnlockedItems : []);
  let completedTiers = 0;
  for (const t of CODEX_SET_TIER_TABLE) {
    if (t.itemIds.every((id) => unlocked.has(id))) {
      completedTiers += 1;
      if (t.bonusAtk) out.bonusAtk += t.bonusAtk;
      if (t.bonusDef) out.bonusDef += t.bonusDef;
      if (t.bonusHp) out.bonusHp += t.bonusHp;
      if (t.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + t.armorPenPct) * 1000) / 1000);
      if (t.critRateBonusPct) out.critRateBonusPct = Math.round((out.critRateBonusPct + t.critRateBonusPct) * 10) / 10;
      if (t.foodHealPct) foodHealPct += t.foodHealPct;
      if (t.potionBuffPct) potionBuffPct += t.potionBuffPct;
      if (t.goldGainPct) out.goldGainPct += t.goldGainPct;
    }
  }
  for (const gm of CODEX_GLOBAL_COMBAT_TABLE) {
    if (completedTiers >= gm.requiredTiers) {
      if (gm.bonusAtk) out.bonusAtk += gm.bonusAtk;
      if (gm.bonusDef) out.bonusDef += gm.bonusDef;
      if (gm.bonusHp) out.bonusHp += gm.bonusHp;
      if (gm.armorPenPct) out.armorPenPct = Math.min(0.75, Math.round((out.armorPenPct + gm.armorPenPct) * 1000) / 1000);
      if (gm.goldGainPct) out.goldGainPct += gm.goldGainPct;
    }
  }

  if (foodHealPct > 0) out.foodHealMult = Math.round((1 + foodHealPct / 100) * 1000) / 1000;
  if (potionBuffPct > 0) out.potionBuffMult = Math.round((1 + potionBuffPct / 100) * 1000) / 1000;
  return out;
}

const CARAVAN_REP_GOLD_TABLE: Array<{ minRep: number; goldGainPct: number; craftSpeedPct: number; gatherDoubleChance: number }> = [
  { minRep: 0, goldGainPct: 0, craftSpeedPct: 0, gatherDoubleChance: 0 },
  { minRep: 100, goldGainPct: 4, craftSpeedPct: 4, gatherDoubleChance: 0.03 },
  { minRep: 280, goldGainPct: 8, craftSpeedPct: 8, gatherDoubleChance: 0.06 },
  { minRep: 580, goldGainPct: 13, craftSpeedPct: 12, gatherDoubleChance: 0.1 },
  { minRep: 1050, goldGainPct: 18, craftSpeedPct: 17, gatherDoubleChance: 0.14 },
  { minRep: 1700, goldGainPct: 24, craftSpeedPct: 22, gatherDoubleChance: 0.19 },
];

export function caravanTradeCombatExtras(state: State | null | undefined) {
  const ct = state?.caravanTrade;
  if (!ct || typeof ct !== "object") {
    return { goldGainPct: 0, craftSpeedPct: 0, gatherDoubleChance: 0 };
  }
  const rawRep = Number(ct.caravanRep || 0);
  const rep = Number.isFinite(rawRep) && rawRep > 0 ? Math.floor(rawRep) : 0;
  const rawLedger = Number(ct.ledgerRank || 0);
  const ledgerRank = Number.isFinite(rawLedger) && rawLedger > 0 ? Math.min(5, Math.floor(rawLedger)) : 0;
  let tier = CARAVAN_REP_GOLD_TABLE[0];
  for (const t of CARAVAN_REP_GOLD_TABLE) {
    if (rep >= t.minRep) tier = t;
  }
  return {
    goldGainPct: tier.goldGainPct + ledgerRank * 2,
    craftSpeedPct: tier.craftSpeedPct + ledgerRank * 2,
    gatherDoubleChance: Math.min(0.5, Math.round((tier.gatherDoubleChance + ledgerRank * 0.01) * 1000) / 1000),
  };
}

export function alchemyCauldronCombatExtras(state: State | null | undefined) {
  return getAlchemyCauldronBonuses(state);
}

export function astralRelicsCombatExtras(state: State | null | undefined) {
  return getAstralRelicsBonuses(state);
}

export function combinedBuildFromState(state: State | null | undefined) {
  const ch1 = (state?.chapter1Build && BUILD[state.chapter1Build]) || { atk: 0, hp: 0, def: 0 };
  const affix = guildAffixCombatExtras(state);
  const hw = heritageWorkshopCombatExtras(state);
  const caravan = caravanTradeCombatExtras(state);
  const alchemy = alchemyCauldronCombatExtras(state);
  const relics = astralRelicsCombatExtras(state);
  let atk = ch1.atk + affix.bonusAtk + hw.bonusAtk + alchemy.bonusAtk + relics.bonusAtk;
  let hp = ch1.hp + hw.bonusHp + alchemy.bonusHp + relics.bonusHp;
  let def = ch1.def + hw.bonusDef + alchemy.bonusDef + relics.bonusDef;
  let armorPenPct = 0;
  let thornsDefRatio = 0;
  let intervalMult = 1;
  let goldMult = 1;
  let dropMult = 1;
  let potionBuffMult = 1;
  let foodHealMult = 1;
  if (state?.chapter2Build === "heavy_sunder") {
    atk += 6;
    armorPenPct = 0.25;
  } else if (state?.chapter2Build === "quenched_thorns") {
    hp += 35;
    def += 8;
    thornsDefRatio = 0.45;
  }
  if (state?.chapter3Build === "gale_flurry") {
    atk += 5;
    intervalMult = 0.85;
  } else if (state?.chapter3Build === "relic_hunter") {
    hp += 25;
    def += 4;
    goldMult = 1.25;
    dropMult = 1.3;
  }
  if (state?.chapter4Build === "elixir_frenzy") {
    atk += 8;
    potionBuffMult = 1.5;
  } else if (state?.chapter4Build === "feast_vitality") {
    hp += 55;
    def += 8;
    foodHealMult = 1.35;
  }
  if (affix.armorPenPct > 0) {
    armorPenPct = Math.min(0.75, Math.round((armorPenPct + affix.armorPenPct) * 1000) / 1000);
  }
  if (affix.intervalMult !== 1) {
    intervalMult = Math.max(0.65, Math.round(intervalMult * affix.intervalMult * 1000) / 1000);
  }
  if (affix.goldGainPct > 0) {
    goldMult = Math.round(goldMult * (1 + affix.goldGainPct / 100) * 1000) / 1000;
  }
  if (affix.rareFindPct > 0) {
    dropMult = Math.round(dropMult * (1 + affix.rareFindPct / 100) * 1000) / 1000;
  }
  if (hw.armorPenPct > 0) {
    armorPenPct = Math.min(0.75, Math.round((armorPenPct + hw.armorPenPct) * 1000) / 1000);
  }
  if (alchemy.armorPenPct > 0) {
    armorPenPct = Math.min(0.75, Math.round((armorPenPct + alchemy.armorPenPct) * 1000) / 1000);
  }
  if (relics.armorPenPct > 0) {
    armorPenPct = Math.min(0.75, Math.round((armorPenPct + relics.armorPenPct) * 1000) / 1000);
  }
  if (hw.thornsDefRatio > 0) {
    thornsDefRatio = Math.min(0.85, Math.round((thornsDefRatio + hw.thornsDefRatio) * 1000) / 1000);
  }
  if (hw.intervalMult !== 1) {
    intervalMult = Math.max(0.65, Math.round(intervalMult * hw.intervalMult * 1000) / 1000);
  }
  if (alchemy.intervalMult !== 1) {
    intervalMult = Math.max(0.65, Math.round(intervalMult * alchemy.intervalMult * 1000) / 1000);
  }
  if (relics.intervalMult !== 1) {
    intervalMult = Math.max(0.65, Math.round(intervalMult * relics.intervalMult * 1000) / 1000);
  }
  if (hw.goldGainPct > 0) {
    goldMult = Math.round(goldMult * (1 + hw.goldGainPct / 100) * 1000) / 1000;
  }
  if (caravan.goldGainPct > 0) {
    goldMult = Math.round(goldMult * (1 + caravan.goldGainPct / 100) * 1000) / 1000;
  }
  if (alchemy.goldGainPct > 0) {
    goldMult = Math.round(goldMult * (1 + alchemy.goldGainPct / 100) * 1000) / 1000;
  }
  if (relics.goldGainPct > 0) {
    goldMult = Math.round(goldMult * (1 + relics.goldGainPct / 100) * 1000) / 1000;
  }
  if (relics.rareFindPct > 0) {
    dropMult = Math.round(dropMult * (1 + relics.rareFindPct / 100) * 1000) / 1000;
  }
  if (hw.potionBuffMult !== 1) {
    potionBuffMult = Math.round(potionBuffMult * hw.potionBuffMult * 1000) / 1000;
  }
  if (alchemy.potionBuffMult !== 1) {
    potionBuffMult = Math.round(potionBuffMult * alchemy.potionBuffMult * 1000) / 1000;
  }
  if (relics.potionBuffMult !== 1) {
    potionBuffMult = Math.round(potionBuffMult * relics.potionBuffMult * 1000) / 1000;
  }
  if (hw.foodHealMult !== 1) {
    foodHealMult = Math.round(foodHealMult * hw.foodHealMult * 1000) / 1000;
  }

  const bossArmorBreakPct = Math.min(
    0.75,
    Math.round((alchemy.bossArmorBreakPct + relics.bossArmorBreakPct) * 1000) / 1000
  );
  const critRateBonusPct =
    Math.round((hw.critRateBonusPct + alchemy.critRateBonusPct + relics.critRateBonusPct) * 10) / 10;
  const critDmgBonusPct = hw.critDmgBonusPct + alchemy.critDmgBonusPct + relics.critDmgBonusPct;

  return {
    atk,
    combatAtkPct: alchemy.combatAtkPct + relics.combatAtkPct,
    hp,
    def,
    armorPenPct,
    bossArmorBreakPct,
    relicCritAmpPct: relics.relicCritAmpPct,
    thornsDefRatio,
    intervalMult,
    goldMult,
    dropMult,
    potionBuffMult,
    foodHealMult,
    ...(critRateBonusPct > 0 ? { critRateBonusPct } : {}),
    ...(critDmgBonusPct > 0 ? { critDmgBonusPct } : {}),
  };
}

export type PackEquipmentSet = {
  id: string;
  name?: string;
  pieces?: Array<{ slot: string; itemId: string }>;
  bonuses?: Array<{ requiredPieces?: number; stats?: { atk?: number; def?: number; hp?: number }; description?: string }>;
};

export type ActiveSetBonus = { setId: string; name: string; pieces: number; atk: number; def: number; hp?: number; description?: string };

/** Mirror of the set-bonus half of backend getEquippedCombatStats. */
export function activeSetBonuses(
  eq: Equipment | undefined,
  sets: PackEquipmentSet[] | undefined,
  inventory?: Record<string, number>
): ActiveSetBonus[] {
  if (!eq || !sets?.length) return [];
  const out: ActiveSetBonus[] = [];
  for (const set of sets) {
    const pieces = (set.pieces || []).filter((p) => {
      if (eq[p.slot] !== p.itemId) return false;
      if (inventory && (inventory[p.itemId] || 0) <= 0) return false;
      const dur = eq.durability?.[p.itemId];
      if (typeof dur === "number" && Number.isFinite(dur) && dur <= 0) return false;
      return true;
    }).length;
    // Mirror of backend set_bonus.highestActiveBonus: the pack words each tier as a total, so only
    // the highest satisfied tier applies (summing every tier inflated top sets by 1.5–1.75×).
    let top: NonNullable<PackEquipmentSet["bonuses"]>[number] | undefined;
    for (const bonus of set.bonuses || []) {
      const need = bonus.requiredPieces ?? 99;
      if (pieces < need) continue;
      if (!top || need >= (top.requiredPieces ?? 99)) top = bonus;
    }
    const atk = Number(top?.stats?.atk || 0);
    const def = Number(top?.stats?.def || 0);
    const hp = Number(top?.stats?.hp || 0);
    const description = top?.description;
    if (atk || def || hp) out.push({ setId: set.id, name: set.name || set.id, pieces, atk, def, ...(hp ? { hp } : {}), description });
  }
  return out;
}

export function combatSheetFromPack(
  state: State | null | undefined,
  items: PackItem[] | undefined,
  sets?: PackEquipmentSet[] | undefined
): CombatSheet {
  const skills = skillContribution(state);
  const extras = combinedBuildFromState(state);
  let gearAtk = 0;
  let gearDef = 0;
  let gearHp = 0;
  const eq = state?.equipment;
  if (eq && items?.length) {
    for (const [slot, itemId] of Object.entries(eq)) {
      if (typeof itemId !== "string") continue;
      // the tool slot is skilling-only (mirrors backend getEquippedCombatStats)
      if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
      if (state?.inventory && (state.inventory[itemId] || 0) <= 0) continue;
      const dur = eq.durability?.[itemId];
      if (typeof dur === "number" && Number.isFinite(dur) && dur <= 0) continue;
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;
      const enh = eq.enhancementLevels?.[itemId] || 0;
      const mult = enhancementStatMultiplier(enh, item);
      if (item.atk) gearAtk += Number(item.atk) * mult;
      if (item.mag) gearAtk += Number(item.mag) * mult; // staffs carry damage as mag (mirrors backend)
      if (item.def) gearDef += Number(item.def) * mult;
      if (item.hp) gearHp += Number(item.hp) * mult;
    }
  }
  // Backend rounds gear+set totals together (Math.round), so do the same here.
  for (const bonus of activeSetBonuses(eq, sets, state?.inventory)) {
    gearAtk += bonus.atk;
    gearDef += bonus.def;
    if (bonus.hp) gearHp += bonus.hp;
  }
  const baseUnbuffedAtk = skills.atk + Math.round(gearAtk) + extras.atk;
  const unbuffedAtk = extras.combatAtkPct
    ? Math.round(baseUnbuffedAtk * (1 + extras.combatAtkPct / 100))
    : baseUnbuffedAtk;
  const unbuffedDef = skills.def + Math.round(gearDef) + extras.def;
  let buffAtk = 0;
  let buffDef = 0;
  const nowMs = Date.now();
  for (const b of state?.activeBuffs || []) {
    if (Date.parse(b.expiresAt) > nowMs) {
      buffAtk += Number(b.stats?.atk || 0);
      buffDef += Number(b.stats?.def || 0);
    }
  }
  buffAtk = Math.round(buffAtk * extras.potionBuffMult);
  buffDef = Math.round(buffDef * extras.potionBuffMult);
  const buffCapRatio = extras.potionBuffMult > 1 ? 0.55 : 0.4;
  if (buffAtk > 0) buffAtk = Math.min(buffAtk, Math.max(2, Math.floor(unbuffedAtk * buffCapRatio)));
  if (buffDef > 0) buffDef = Math.min(buffDef, Math.max(2, Math.floor(unbuffedDef * buffCapRatio + 4)));
  const finalAtk = unbuffedAtk + buffAtk;
  const finalDef = unbuffedDef + buffDef;
  const atkLv = state?.combatSkills?.attack?.level || state?.combatLevel || 1;
  const defLv = state?.combatSkills?.defense?.level || state?.combatLevel || 1;
  const intLv = state?.combatSkills?.intelligence?.level || state?.combatLevel || 1;
  const accuracyPct = Math.min(99, Math.round((86 + (atkLv - 1) * 0.35 + Math.floor(finalAtk / 22)) * 10) / 10);
  const evasionPct = Math.min(45, Math.round((6 + (defLv - 1) * 0.32 + Math.floor(finalDef / 24)) * 10) / 10);
  const critRatePct = Math.min(
    65,
    Math.round((14 + (atkLv - 1) * 0.25 + (intLv - 1) * 0.15 + Math.floor(finalAtk / 28) + (extras.critRateBonusPct || 0)) * 10) / 10
  );
  const critDmgPct = Math.min(
    300,
    Math.round(160 + (atkLv - 1) * 0.75 + Math.floor(finalAtk / 14) + (extras.critDmgBonusPct || 0))
  );
  const finalIntervalMs =
    extras.intervalMult !== 1
      ? Math.max(800, Math.round(skills.intervalMs * extras.intervalMult))
      : skills.intervalMs;
  return {
    hp: skills.hp + Math.round(gearHp) + extras.hp,
    atk: finalAtk,
    def: finalDef,
    intervalMs: finalIntervalMs,
    mp: skills.mp,
    mpRegenPerTick: skills.mpRegenPerTick,
    accuracyPct,
    evasionPct,
    critRatePct,
    critDmgPct,
    ...(extras.combatAtkPct ? { combatAtkPct: extras.combatAtkPct } : {}),
    ...(extras.armorPenPct > 0 ? { armorPenPct: extras.armorPenPct } : {}),
    ...(extras.bossArmorBreakPct ? { bossArmorBreakPct: extras.bossArmorBreakPct } : {}),
    ...(extras.relicCritAmpPct ? { relicCritAmpPct: extras.relicCritAmpPct } : {}),
    ...(extras.thornsDefRatio > 0 ? { thornsDefRatio: extras.thornsDefRatio } : {}),
    ...(extras.goldMult !== 1 ? { goldMult: extras.goldMult } : {}),
    ...(extras.dropMult !== 1 ? { dropMult: extras.dropMult } : {}),
    ...(extras.potionBuffMult !== 1 ? { potionBuffMult: extras.potionBuffMult } : {}),
    ...(extras.foodHealMult !== 1 ? { foodHealMult: extras.foodHealMult } : {}),
  };
}

export function equippedWeaponAtk(state: State | null | undefined, items: PackItem[] | undefined): number {
  const id = state?.equipment?.main_hand;
  if (typeof id !== "string" || !items) return 0;
  if (state?.inventory && (state.inventory[id] || 0) <= 0) return 0;
  const dur = state?.equipment?.durability?.[id];
  if (typeof dur === "number" && Number.isFinite(dur) && dur <= 0) return 0;
  const item = items.find((i) => i.id === id);
  if (!item) return 0;
  const enh = state?.equipment?.enhancementLevels?.[id] || 0;
  const mult = enhancementStatMultiplier(enh, item);
  return Math.round((Number(item.atk || 0) + Number(item.mag || 0)) * mult);
}
