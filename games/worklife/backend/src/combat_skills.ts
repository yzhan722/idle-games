import type { CombatSkillId, CombatSkills, EnhancedPlayerState } from "./types";
import { appendLog, getXpForLevel, isDurabilityBroken } from "./storage";

/**
 * MWI combat skills.
 *
 * Milky Way Idle splits combat progression into seven skills. Every kill hands out XP with MWI's
 * 30 / 70 rule: 30% goes to the damage skill the weapon trains (melee / ranged / magic), the other
 * 70% is shared evenly by stamina, intelligence, attack, defense and that same main skill — so the
 * main skill ends at 44% and the two unused damage skills get nothing. The visible 战斗等级 is
 * derived, never trained directly.
 */
export const COMBAT_SKILL_IDS: CombatSkillId[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];
export const DAMAGE_SKILL_IDS: CombatSkillId[] = ["melee", "ranged", "magic"];

export const COMBAT_SKILL_NAMES: Record<CombatSkillId, string> = {
  stamina: "耐力",
  intelligence: "智力",
  attack: "攻击",
  defense: "防御",
  melee: "近战",
  ranged: "远程",
  magic: "魔法",
};

export const COMBAT_SKILL_BLURBS: Record<CombatSkillId, string> = {
  stamina: "每级 +10 最大生命",
  intelligence: "每级 +5 最大魔力；每 10 级多一个技能槽",
  attack: "每级攻击间隔 -1%",
  defense: "每 2 级 +1 防御",
  melee: "每级 +1 攻击力（剑 / 斧 / 矛主修）",
  ranged: "每级 +1 攻击力（弓主修）",
  magic: "每级 +1 攻击力（法杖 / 权杖主修）",
};

export const MAIN_SHARE = 0.3;
export const SPREAD_SHARE = 0.7;
export const MAX_COMBAT_SKILL_LEVEL = 200;

export function defaultCombatSkills(level = 1): CombatSkills {
  const mk = () => ({ level, xp: 0 });
  return { stamina: mk(), intelligence: mk(), attack: mk(), defense: mk(), melee: mk(), ranged: mk(), magic: mk() };
}

/** MWI: 0.1 × (stamina + intelligence + attack + defense + best damage) + 0.5 × best of attack / defense / damage. */
export function derivedCombatLevel(cs: CombatSkills): number {
  const l = (id: CombatSkillId) => cs[id]?.level || 1;
  const bestDamage = Math.max(l("melee"), l("ranged"), l("magic"));
  const sum = l("stamina") + l("intelligence") + l("attack") + l("defense") + bestDamage;
  const best = Math.max(l("attack"), l("defense"), bestDamage);
  return Math.max(1, Math.floor(0.1 * sum + 0.5 * best));
}

/**
 * Make sure a state has combat skills. Saves from before this system carry a trained
 * `combatLevel`; seeding every skill at that level keeps the derived level identical, so nobody
 * logs in weaker than they logged out. Saves from the five-skill era get ranged / magic at 1.
 */
export function ensureCombatSkills(player: EnhancedPlayerState): CombatSkills {
  if (!player.combatSkills) {
    player.combatSkills = defaultCombatSkills(Math.max(1, player.combatLevel || 1));
  } else {
    for (const id of COMBAT_SKILL_IDS) {
      if (!player.combatSkills[id]) player.combatSkills[id] = { level: 1, xp: 0 };
    }
  }
  player.combatLevel = derivedCombatLevel(player.combatSkills);
  return player.combatSkills;
}

/**
 * Which damage skill the main-hand weapon trains. Bows are ranged, staffs / scepters / wands are
 * magic, everything else (and bare hands) is melee. Mirrored by frontend combatSheet.ts.
 */
export function weaponMainSkill(mainHandItemId: string | undefined): CombatSkillId {
  const id = String(mainHandItemId || "").toLowerCase();
  if (!id) return "melee";
  if (/(^|_)(bow|crossbow)(_|$)/.test(id)) return "ranged";
  if (/(^|_)(staff|scepter|wand)(_|$)/.test(id)) return "magic";
  return "melee";
}

export function mainCombatSkill(player: EnhancedPlayerState): CombatSkillId {
  const mainHand = (player.equipment as { main_hand?: string } | undefined)?.main_hand;
  if (!mainHand || (player.inventory?.[mainHand] || 0) <= 0 || isDurabilityBroken(player, mainHand)) {
    return "melee";
  }
  return weaponMainSkill(mainHand);
}

/** The five skills that share the 70%: the four utility skills plus the weapon's main skill. */
export function spreadSkills(main: CombatSkillId): CombatSkillId[] {
  return ["stamina", "intelligence", "attack", "defense", main];
}

const FOCUSABLE: CombatSkillId[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];

/**
 * MWI charm: an equipped accessory with `focusSkill` sends the whole 70% share to that skill
 * instead of splitting it five ways. Read from the pack so content, not code, decides the charms.
 */
/** The loose pack shape both ContentPack and EnhancedContentPack satisfy. */
export type CharmPack = { items: Array<Record<string, unknown>> };

export function focusedCombatSkill(player: EnhancedPlayerState, pack: CharmPack | undefined): CombatSkillId | undefined {
  if (!pack) return undefined;
  const eq = player.equipment as { accessory1?: string; accessory2?: string } | undefined;
  for (const id of [eq?.accessory1, eq?.accessory2]) {
    if (!id) continue;
    if ((player.inventory?.[id] || 0) <= 0 || isDurabilityBroken(player, id)) continue;
    const item = pack.items.find((i) => i.id === id);
    const focus = item?.focusSkill as CombatSkillId | undefined;
    if (focus && FOCUSABLE.includes(focus)) return focus;
  }
  return undefined;
}

export type CombatXpGrant = {
  /** XP per skill, rounded to 0.1 for display (skills that got nothing are omitted). */
  gained: Partial<Record<CombatSkillId, number>>;
  levelUps: Array<{ skill: CombatSkillId; level: number }>;
  combatLevel: number;
  main: CombatSkillId;
  /** Set when a charm redirected the 70% share. */
  focus?: CombatSkillId;
};

/** Apply MWI's 30 / 70 split (or a charm's focus) and level up whatever crosses its threshold. */
export function grantCombatXp(player: EnhancedPlayerState, xp: number, pack?: CharmPack): CombatXpGrant {
  const cs = ensureCombatSkills(player);
  const main = mainCombatSkill(player);
  const focus = focusedCombatSkill(player, pack);
  const recipients = focus ? [...new Set([focus, main])] : spreadSkills(main);
  const spreadTotal = xp * SPREAD_SHARE;
  const gained: Partial<Record<CombatSkillId, number>> = {};
  const levelUps: CombatXpGrant["levelUps"] = [];
  for (const id of recipients) {
    const share = focus ? (id === focus ? spreadTotal : 0) : spreadTotal / recipients.length;
    const amount = share + (id === main ? xp * MAIN_SHARE : 0);
    gained[id] = Math.round(amount * 10) / 10;
    const st = cs[id];
    st.xp = Math.round((st.xp + amount) * 1000) / 1000;
    let need = getXpForLevel(st.level);
    while (st.xp >= need && st.level < MAX_COMBAT_SKILL_LEVEL) {
      st.level += 1;
      st.xp = Math.round((st.xp - need) * 1000) / 1000;
      levelUps.push({ skill: id, level: st.level });
      appendLog(player, `${COMBAT_SKILL_NAMES[id]}升级到 ${st.level} 级！`);
      need = getXpForLevel(st.level);
    }
  }
  const before = player.combatLevel || 1;
  player.combatLevel = derivedCombatLevel(cs);
  if (player.combatLevel > before) appendLog(player, `战斗等级升级到 ${player.combatLevel} 级！`);
  if (player.stats && player.combatLevel > player.stats.highestCombatLevel) {
    player.stats.highestCombatLevel = player.combatLevel;
  }
  return { gained, levelUps, combatLevel: player.combatLevel, main, focus };
}

export const BASE_HP = 50;
export const HP_PER_STAMINA = 10;
export const BASE_MP = 20;
export const MP_PER_INTELLIGENCE = 5;
export const BASE_ATK = 5;
export const BASE_INTERVAL_MS = 3000;
export const INTERVAL_PER_ATTACK = 0.01;
export const DEF_PER_2_DEFENSE = 1;

/** Stat contributions of the skill levels alone (gear and buffs are added by the caller). */
export function combatSkillContribution(cs: CombatSkills, main: CombatSkillId = "melee") {
  const sta = cs.stamina?.level || 1;
  const int = cs.intelligence?.level || 1;
  const atk = cs.attack?.level || 1;
  const def = cs.defense?.level || 1;
  const dmg = cs[main]?.level || 1;
  return {
    hp: BASE_HP + (sta - 1) * HP_PER_STAMINA,
    mp: BASE_MP + (int - 1) * MP_PER_INTELLIGENCE,
    atk: BASE_ATK + (dmg - 1),
    def: Math.floor((def - 1) / 2) * DEF_PER_2_DEFENSE,
    intervalMs: Math.round(BASE_INTERVAL_MS / (1 + (atk - 1) * INTERVAL_PER_ATTACK)),
    /** MWI-style: mana regenerated on every basic-attack tick. */
    mpRegenPerTick: 1 + Math.floor(int / 10),
  };
}

/** MWI gates ability slots by intelligence; one extra slot every 10 levels, four at most. */
export function abilitySlotCount(cs: CombatSkills): number {
  return Math.min(4, 1 + Math.floor((cs.intelligence?.level || 1) / 10));
}
