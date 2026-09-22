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
  extras?: { atk?: number; hp?: number; def?: number }
): Combatant {
  // Skill levels first, then gear, then build / buff extras — mirrored by frontend combatSheet.ts.
  // The equipped weapon decides which damage skill (melee / ranged / magic) feeds ATK.
  const skills = combatSkillContribution(ensureCombatSkills(state), mainCombatSkill(state));
  const gear = getEquippedCombatStats(state, contentPack);
  return {
    name: "player",
    hp: skills.hp + (extras?.hp || 0),
    atk: skills.atk + gear.atk + (extras?.atk || 0),
    def: skills.def + gear.def + (extras?.def || 0),
    intervalMs: skills.intervalMs,
    incomingDamageMult: 1,
    outgoingDamageMult: 1,
    mp: skills.mp,
    mpRegenPerTick: skills.mpRegenPerTick,
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

export function hitDamage(attacker: Combatant, defender: Combatant): number {
  const raw = attacker.atk * attacker.outgoingDamageMult - Math.floor(defender.def / 2);
  return Math.max(1, Math.floor(raw * defender.incomingDamageMult));
}

/** Deterministic HP combat. No RNG. Used to retune first-hour numbers. */
export function simulateFight(player: Combatant, enemy: Combatant, maxMs = 10 * 60_000): FightResult {
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
      const dmg = hitDamage(enemy, { ...player, incomingDamageMult: 1 });
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
