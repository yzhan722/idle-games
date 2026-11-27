import type { CombatSkillId, CombatSkills, EnhancedPlayerState } from "./types";
import { appendLog, getXpForLevel, isDurabilityBroken } from "./storage";
import { COMBAT_MAIN_SHARE, COMBAT_SUPPORT_POOL, COMBAT_SUPPORT_SHARE, combatLevelOf } from "./growth_curves";

/**
 * Combat skills: seven lines that split combat progression.
 *
 * Every kill is worth 20 parts of XP (growth_curves.COMBAT_XP_PARTS): 8 go to the damage skill the
 * weapon trains (melee / ranged / magic) and 3 each to stamina, intelligence, attack and defense;
 * the two unused damage skills get nothing. The visible 战斗等级 is derived, never trained directly.
 */
export const COMBAT_SKILL_IDS: CombatSkillId[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];
export const DAMAGE_SKILL_IDS: CombatSkillId[] = ["melee", "ranged", "magic"];
/** The four lines every kill trains whatever the weapon is. */
export const SUPPORT_SKILL_IDS: CombatSkillId[] = ["stamina", "intelligence", "attack", "defense"];

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
  attack: "每级攻击速度 +1%，命中 +2",
  defense: "每 2 级 +1 防御",
  melee: "每级 +1 攻击力（剑 / 斧 / 矛主修）",
  ranged: "每级 +1 攻击力（弓主修）",
  magic: "每级 +1 攻击力（法杖 / 权杖主修）",
};

export const MAX_COMBAT_SKILL_LEVEL = 200;

export function defaultCombatSkills(level = 1): CombatSkills {
  const mk = () => ({ level, xp: 0 });
  return { stamina: mk(), intelligence: mk(), attack: mk(), defense: mk(), melee: mk(), ranged: mk(), magic: mk() };
}

/** Weighted quadratic mean of the four support skills and the best damage skill (growth_curves.combatLevelOf). */
export function derivedCombatLevel(cs: CombatSkills): number {
  const l = (id: CombatSkillId) => cs[id]?.level || 1;
  return combatLevelOf(SUPPORT_SKILL_IDS.map(l), Math.max(...DAMAGE_SKILL_IDS.map(l)));
}

/** 总等级：全部职业、强化与七项战斗技能的等级之和，与顶栏显示的算法一致。 */
export function totalLevelOf(player: Pick<EnhancedPlayerState, "skills" | "combatSkills" | "combatLevel">): number {
  const sum = (rows: Record<string, { level?: number }> | undefined) =>
    Object.values(rows ?? {}).reduce((n, s) => n + Number(s?.level || 1), 0);
  return sum(player.skills) + (player.combatSkills ? sum(player.combatSkills) : (player.combatLevel || 1) * COMBAT_SKILL_IDS.length);
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
  if (!mainHand || isDurabilityBroken(player, mainHand)) {
    return "melee";
  }
  return weaponMainSkill(mainHand);
}

const FOCUSABLE: CombatSkillId[] = ["stamina", "intelligence", "attack", "defense", "melee", "ranged", "magic"];

/**
 * Training charm: an equipped accessory with `focusSkill` sends the whole support pool (12 of the
 * 20 parts) to that skill instead of splitting it four ways. Read from the pack so content, not code, decides the charms.
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
  /** Set when a charm redirected the support pool. */
  focus?: CombatSkillId;
};

/** Hand out one kill's XP (or a charm's focus) and level up whatever crosses its threshold. */
export function grantCombatXp(player: EnhancedPlayerState, xp: number, pack?: CharmPack): CombatXpGrant {
  const cs = ensureCombatSkills(player);
  const main = mainCombatSkill(player);
  const focus = focusedCombatSkill(player, pack);
  const recipients = [...new Set<CombatSkillId>([main, ...(focus ? [focus] : SUPPORT_SKILL_IDS)])];
  const gained: Partial<Record<CombatSkillId, number>> = {};
  const levelUps: CombatXpGrant["levelUps"] = [];
  for (const id of recipients) {
    const support = focus ? (id === focus ? COMBAT_SUPPORT_POOL : 0) : id === main ? 0 : COMBAT_SUPPORT_SHARE;
    const amount = xp * (support + (id === main ? COMBAT_MAIN_SHARE : 0));
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

// 每级收益的推导见 docs/design/OWN_CURVES.md：怪物攻击约每级 +2，裸装同级要挨得住 5 下，所以耐力每级 +10 生命。
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
    /** Mana regenerated on every basic-attack tick. */
    mpRegenPerTick: 1 + Math.floor(int / 10),
  };
}

/** Ability slots are gated by intelligence: one extra slot every 10 levels, four at most. */
export function abilitySlotCount(cs: CombatSkills): number {
  return Math.min(4, 1 + Math.floor((cs.intelligence?.level || 1) / 10));
}
