import { enhancementStatMultiplier } from "./enhancement";

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
  /** Chapter 2 build (heavy_sunder): fraction of defender DEF ignored on hit. */
  armorPenPct?: number;
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

function combinedBuildFromState(state: State | null | undefined) {
  const ch1 = (state?.chapter1Build && BUILD[state.chapter1Build]) || { atk: 0, hp: 0, def: 0 };
  let atk = ch1.atk;
  let hp = ch1.hp;
  let def = ch1.def;
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
  return { atk, hp, def, armorPenPct, thornsDefRatio, intervalMult, goldMult, dropMult, potionBuffMult, foodHealMult };
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
  const unbuffedAtk = skills.atk + Math.round(gearAtk) + extras.atk;
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
  const critRatePct = Math.min(65, Math.round((14 + (atkLv - 1) * 0.25 + (intLv - 1) * 0.15 + Math.floor(finalAtk / 28)) * 10) / 10);
  const critDmgPct = Math.min(300, Math.round(160 + (atkLv - 1) * 0.75 + Math.floor(finalAtk / 14)));
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
    ...(extras.armorPenPct > 0 ? { armorPenPct: extras.armorPenPct } : {}),
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
