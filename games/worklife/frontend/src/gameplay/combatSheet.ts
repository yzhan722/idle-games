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
};

export type CombatSkillKey = "stamina" | "intelligence" | "attack" | "defense" | "melee" | "ranged" | "magic";
export const COMBAT_SKILL_KEYS: CombatSkillKey[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];

type SkillLevels = Partial<Record<CombatSkillKey, { level?: number }>>;

type State = {
  combatLevel?: number;
  combatSkills?: SkillLevels;
  chapter1Build?: "sharpened_edge" | "thick_bark";
  equipment?: Equipment;
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

export type PackEquipmentSet = {
  id: string;
  name?: string;
  pieces?: Array<{ slot: string; itemId: string }>;
  bonuses?: Array<{ requiredPieces?: number; stats?: { atk?: number; def?: number }; description?: string }>;
};

export type ActiveSetBonus = { setId: string; name: string; pieces: number; atk: number; def: number; description?: string };

/** Mirror of the set-bonus half of backend getEquippedCombatStats. */
export function activeSetBonuses(eq: Equipment | undefined, sets: PackEquipmentSet[] | undefined): ActiveSetBonus[] {
  if (!eq || !sets?.length) return [];
  const out: ActiveSetBonus[] = [];
  for (const set of sets) {
    const pieces = (set.pieces || []).filter((p) => eq[p.slot] === p.itemId).length;
    let atk = 0;
    let def = 0;
    let description: string | undefined;
    for (const bonus of set.bonuses || []) {
      if (pieces >= (bonus.requiredPieces ?? 99)) {
        atk += Number(bonus.stats?.atk || 0);
        def += Number(bonus.stats?.def || 0);
        description = bonus.description || description;
      }
    }
    if (atk || def) out.push({ setId: set.id, name: set.name || set.id, pieces, atk, def, description });
  }
  return out;
}

export function combatSheetFromPack(
  state: State | null | undefined,
  items: PackItem[] | undefined,
  sets?: PackEquipmentSet[] | undefined
): CombatSheet {
  const skills = skillContribution(state);
  const extras = (state?.chapter1Build && BUILD[state.chapter1Build]) || { atk: 0, hp: 0, def: 0 };
  let gearAtk = 0;
  let gearDef = 0;
  const eq = state?.equipment;
  if (eq && items?.length) {
    for (const [slot, itemId] of Object.entries(eq)) {
      if (typeof itemId !== "string") continue;
      // the tool slot is skilling-only (mirrors backend getEquippedCombatStats)
      if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;
      const enh = eq.enhancementLevels?.[itemId] || 0;
      const mult = enhancementStatMultiplier(enh, item);
      if (item.atk) gearAtk += Number(item.atk) * mult;
      if (item.mag) gearAtk += Number(item.mag) * mult; // staffs carry damage as mag (mirrors backend)
      if (item.def) gearDef += Number(item.def) * mult;
    }
  }
  // Backend rounds gear+set totals together (Math.round), so do the same here.
  for (const bonus of activeSetBonuses(eq, sets)) {
    gearAtk += bonus.atk;
    gearDef += bonus.def;
  }
  return {
    hp: skills.hp + extras.hp,
    atk: skills.atk + Math.round(gearAtk) + extras.atk,
    def: skills.def + Math.round(gearDef) + extras.def,
    intervalMs: skills.intervalMs,
    mp: skills.mp,
    mpRegenPerTick: skills.mpRegenPerTick,
  };
}

export function equippedWeaponAtk(state: State | null | undefined, items: PackItem[] | undefined): number {
  const id = state?.equipment?.main_hand;
  if (typeof id !== "string" || !items) return 0;
  const item = items.find((i) => i.id === id);
  return Number(item?.atk || 0);
}
