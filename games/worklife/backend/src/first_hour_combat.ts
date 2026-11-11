import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { getEquippedCombatStats } from "./storage";
import { combatSkillContribution, ensureCombatSkills, mainCombatSkill } from "./combat_skills";

export type Combatant = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  intervalMs: number;
  incomingDamageMult: number;
  outgoingDamageMult: number;
  /** Player only: MWI mana pool and regen per basic-attack tick. */
  mp?: number;
  mpRegenPerTick?: number;
  /** Chapter 2 build (heavy_sunder): fraction of defender DEF ignored on hit. */
  armorPenPct?: number;
  /** Chapter 2 build (quenched_thorns): fraction of player DEF reflected when hit. */
  thornsDefRatio?: number;
};

export type FightResult = {
  won: boolean;
  durationMs: number;
  playerHpLeft: number;
  enemyHpLeft: number;
  playerHits: number;
  enemyHits: number;
  playerDamageDealt: number;
};

export function playerCombatant(
  state: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  extras?: {
    atk?: number;
    hp?: number;
    def?: number;
    armorPenPct?: number;
    thornsDefRatio?: number;
    intervalMult?: number;
  }
): Combatant {
  // Skill levels first, then gear, then build / buff extras — mirrored by frontend combatSheet.ts.
  // The equipped weapon decides which damage skill (melee / ranged / magic) feeds ATK.
  const skills = combatSkillContribution(ensureCombatSkills(state), mainCombatSkill(state));
  const gear = getEquippedCombatStats(state, contentPack);
  const intervalMult = extras?.intervalMult && extras.intervalMult > 0 ? extras.intervalMult : 1;
  return {
    name: "player",
    hp: skills.hp + (extras?.hp || 0),
    atk: skills.atk + gear.atk + (extras?.atk || 0),
    def: skills.def + gear.def + (extras?.def || 0),
    intervalMs: intervalMult !== 1 ? Math.max(800, Math.round(skills.intervalMs * intervalMult)) : skills.intervalMs,
    incomingDamageMult: 1,
    outgoingDamageMult: 1,
    mp: skills.mp,
    mpRegenPerTick: skills.mpRegenPerTick,
    armorPenPct: extras?.armorPenPct || 0,
    thornsDefRatio: extras?.thornsDefRatio || 0,
  };
}

export function monsterCombatant(monster: Record<string, unknown>): Combatant {
  const isBoss =
    Boolean(monster.isBoss) ||
    String(monster.id || "").endsWith("_boss") ||
    String(monster.name || "").includes("BOSS");
  return {
    name: String(monster.name || monster.id || "monster"),
    hp: Number(monster.hp || 1),
    atk: Number(monster.atk || 1),
    def: Number(monster.def || 0),
    intervalMs: Number(monster.attackIntervalMs || (isBoss ? 2200 : 2400)),
    incomingDamageMult: Number(monster.incomingDamageMult || 1),
    outgoingDamageMult: Number(monster.outgoingDamageMult || 1),
  };
}

/**
 * Damage after mitigation: atk² / (atk + floor(def / 2)).
 *
 * The old rule was `atk − floor(def / 2)`, floored at 1. Gear and set defence grow far faster than
 * monster attack, so from the first full set onward every monster — bosses included — dealt exactly
 * 1 damage per hit (see the 2026-10 balance audit). This ratio form is *the same curve for small
 * defence* (≈ atk − def/2 while def/2 ≪ atk, so the first hour plays as before) yet each extra point
 * of defence is worth less than the last: def/2 = atk halves the damage, def/2 = 3×atk cuts it to a
 * quarter, and it never reaches zero. The frontend mirrors this in `fightPreview.hit`.
 */
export function mitigatedDamage(atk: number, def: number): number {
  if (!(atk > 0)) return 0;
  return (atk * atk) / (atk + Math.max(0, Math.floor(def / 2)));
}

export function hitDamage(attacker: Combatant, defender: Combatant): number {
  const effDef = attacker.armorPenPct ? Math.floor(defender.def * (1 - attacker.armorPenPct)) : defender.def;
  const raw = mitigatedDamage(attacker.atk * attacker.outgoingDamageMult, effDef);
  return Math.max(1, Math.floor(raw * defender.incomingDamageMult));
}

/** Deterministic HP combat. No RNG. Used to retune first-hour numbers. */
export function simulateFight(
  player: Combatant,
  enemy: Combatant,
  maxMs = 10 * 60_000,
  /** Optional boss-mechanic hooks (see boss_mechanics.enemyDamageHook); the plain fight has none. */
  hooks: { enemyDamage?: (hitNumber: number, baseDamage: number, playerMaxHp: number) => number } = {}
): FightResult {
  let playerHp = player.hp;
  let enemyHp = enemy.hp;
  let t = 0;
  let playerCd = 0;
  let enemyCd = 0;
  let playerHits = 0;
  let enemyHits = 0;
  let playerDamageDealt = 0;

  while (playerHp > 0 && enemyHp > 0 && t < maxMs) {
    const toPlayer = player.intervalMs - playerCd;
    const toEnemy = enemy.intervalMs - enemyCd;
    const step = Math.max(1, Math.min(toPlayer, toEnemy));
    t += step;
    playerCd += step;
    enemyCd += step;

    if (playerCd >= player.intervalMs) {
      const dmg = hitDamage(player, enemy);
      enemyHp -= dmg;
      playerDamageDealt += dmg;
      playerHits += 1;
      playerCd = 0;
    }
    if (enemyHp <= 0) break;
    if (enemyCd >= enemy.intervalMs) {
      let dmg = hitDamage(enemy, { ...player, incomingDamageMult: 1 });
      if (hooks.enemyDamage) dmg = hooks.enemyDamage(enemyHits + 1, dmg, player.hp);
      playerHp -= dmg;
      enemyHits += 1;
      enemyCd = 0;
    }
  }

  return {
    won: enemyHp <= 0 && playerHp > 0,
    durationMs: t,
    playerHpLeft: Math.max(0, playerHp),
    enemyHpLeft: Math.max(0, enemyHp),
    playerHits,
    enemyHits,
    playerDamageDealt,
  };
}
