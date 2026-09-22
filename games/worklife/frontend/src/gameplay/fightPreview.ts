/**
 * Deterministic fight preview for difficulty labels and build-choice previews.
 *
 * Mirrors backend/src/hp_combat.ts + first_hour_combat.ts + abilities.ts exactly (same damage
 * formula, same event stepping, same boss phases, same ability triggers / mana / cooldowns).
 * `scripts/fight-preview-parity.test.ts` replays the same fights through the real backend and
 * asserts identical outcomes.
 */
import type { CombatSheet } from "./combatSheet";
import type { AbilityDef, AbilitySlot, AbilityTrigger } from "../types/game";

export const PLAYER_INTERVAL_MS = 3000;
export const HEAVY_CHOP_MULT = 2.2;
export const HEAVY_CHOP_COOLDOWN_MS = 8000;
const GUARD_RATIO = 0.6;
const WRATH_RATIO = 0.3;
const GUARD_INCOMING = 0.45;
const WRATH_INTERVAL_MULT = 0.6;
// MWI enrage (mirrors hp_combat): +10% monster damage per 3 min (boss 10 min), max 10 stacks
const ENRAGE_INTERVAL_MS = 3 * 60_000;
const BOSS_ENRAGE_INTERVAL_MS = 10 * 60_000;
const ENRAGE_STEP = 0.1;
const ENRAGE_MAX_STACKS = 10;

export type PreviewMonster = {
  id: string;
  name?: string;
  hp: number;
  atk: number;
  def: number;
  isBoss?: boolean;
  attackIntervalMs?: number;
  incomingDamageMult?: number;
  outgoingDamageMult?: number;
  mechanics?: string[];
};

/** One equipped ability as the simulator sees it (definition + the player's level + trigger). */
export type PreviewAbility = {
  def: AbilityDef;
  level: number;
  trigger: AbilityTrigger;
};

/** Innate 重劈 as every fresh woodcutter has it; used when no content pack is loaded yet. */
export const HEAVY_CHOP_DEF: AbilityDef = {
  id: "heavy_chop",
  name: "重劈",
  blurb: "",
  cooldownMs: HEAVY_CHOP_COOLDOWN_MS,
  mpCost: 0,
  damageMult: HEAVY_CHOP_MULT,
  breaksGuard: true,
  defaultTrigger: { type: "always" },
  levelStep: 0.05,
};

/** Legacy switch kept for older call sites: "on-cooldown" = innate 重劈 auto-casting. */
export type HeavyChopMode = "none" | "on-cooldown";

export type FightPreview = {
  won: boolean;
  durationMs: number;
  playerHp: number;
  playerHpLeft: number;
  playerHpLeftPct: number;
  enemyHpLeft: number;
  /** Damage of one normal hit against this monster (outside guard). */
  normalHit: number;
  /** Damage of one Heavy Chop against this monster (outside guard). */
  heavyHit: number;
  /** Damage the monster deals per hit (outside wrath, same number in wrath). */
  enemyHit: number;
  heavyChops: number;
  /** Casts per ability id. */
  casts: Record<string, number>;
};

function hit(atk: number, outgoing: number, def: number, incoming: number): number {
  const raw = atk * outgoing - Math.floor(def / 2);
  return Math.max(1, Math.floor(raw * incoming));
}

export function monsterBaseInterval(m: PreviewMonster): number {
  const isBoss = Boolean(m.isBoss) || String(m.id || "").endsWith("_boss") || String(m.name || "").includes("BOSS");
  return Number(m.attackIntervalMs || (isBoss ? 2200 : 2400));
}

/** Mirror of backend abilities.triggerSatisfied. */
export function triggerSatisfied(
  trigger: AbilityTrigger,
  s: { playerHp: number; playerMaxHp: number; enemyHp: number; enemyMaxHp: number; guardActive: boolean }
): boolean {
  switch (trigger.type) {
    case "always":
      return true;
    case "enemy_hp_below":
      return s.enemyMaxHp > 0 && (s.enemyHp / s.enemyMaxHp) * 100 <= trigger.pct;
    case "self_hp_below":
      return s.playerMaxHp > 0 && (s.playerHp / s.playerMaxHp) * 100 <= trigger.pct;
    case "enemy_guard":
      return s.guardActive;
  }
}

/** Build the preview ability list from the player's loadout + the /content catalog. */
export function previewAbilities(
  loadout: AbilitySlot[] | undefined,
  known: Record<string, { level: number }> | undefined,
  catalog: AbilityDef[] | undefined,
  slotCount: number
): PreviewAbility[] {
  const defs = catalog && catalog.length ? catalog : [HEAVY_CHOP_DEF];
  const slots = loadout ?? [{ abilityId: "heavy_chop", trigger: { type: "always" } as AbilityTrigger }];
  const out: PreviewAbility[] = [];
  for (const slot of slots) {
    const def = defs.find((d) => d.id === slot.abilityId);
    if (!def) continue;
    if (known && !known[slot.abilityId] && slot.abilityId !== "heavy_chop") continue;
    out.push({ def, level: known?.[slot.abilityId]?.level || 1, trigger: slot.trigger });
  }
  return out.slice(0, slotCount);
}

function resolveAbilities(arg: HeavyChopMode | PreviewAbility[] | undefined): PreviewAbility[] {
  if (Array.isArray(arg)) return arg;
  if (arg === "on-cooldown") return [{ def: HEAVY_CHOP_DEF, level: 1, trigger: { type: "always" } }];
  return [];
}

export function previewFight(
  sheet: CombatSheet,
  m: PreviewMonster,
  abilitiesOrMode: HeavyChopMode | PreviewAbility[] = "none",
  maxMs = 10 * 60_000
): FightPreview {
  const abilities = resolveAbilities(abilitiesOrMode);
  const mechanics = m.mechanics || [];
  const hasGuard = mechanics.includes("guard_60");
  const hasWrath = mechanics.includes("nature_wrath_30");
  const enemyIncoming = Number(m.incomingDamageMult || 1);
  const enemyOutgoing = Number(m.outgoingDamageMult || 1);
  const baseInterval = monsterBaseInterval(m);
  const isBoss = Boolean(m.isBoss) || String(m.id || "").endsWith("_boss") || String(m.name || "").includes("BOSS");
  const enrageInterval = isBoss ? BOSS_ENRAGE_INTERVAL_MS : ENRAGE_INTERVAL_MS;
  const enrageMult = (atMs: number) => 1 + Math.min(ENRAGE_MAX_STACKS, Math.floor(atMs / enrageInterval)) * ENRAGE_STEP;
  const playerInterval = sheet.intervalMs || PLAYER_INTERVAL_MS;
  const maxMp = sheet.mp ?? 20;
  const mpRegen = sheet.mpRegenPerTick ?? 1;

  let playerHp = sheet.hp;
  let playerMp = maxMp;
  let enemyHp = m.hp;
  const enemyMax = m.hp;
  let t = 0;
  let playerCd = 0;
  let enemyCd = 0;
  let enemyInterval = baseInterval;
  let guardActive = false;
  let guardUsed = false;
  let wrathActive = false;
  let braceUntil = 0;
  const readyAt: Record<string, number> = {};
  const casts: Record<string, number> = {};
  let heavyChops = 0;

  const phases = () => {
    const ratio = enemyHp / enemyMax;
    if (hasGuard && !guardUsed && !wrathActive && ratio <= GUARD_RATIO && ratio > WRATH_RATIO) {
      guardActive = true;
      guardUsed = true;
    }
    if (hasWrath && !wrathActive && ratio <= WRATH_RATIO) {
      wrathActive = true;
      guardActive = false;
      enemyInterval = Math.max(800, Math.floor(baseInterval * WRATH_INTERVAL_MULT));
    }
  };

  const canFire = (a: PreviewAbility, atMs: number) => {
    if ((readyAt[a.def.id] || 0) > atMs) return false;
    if (a.def.mpCost > playerMp) return false;
    if (a.def.healPct && playerHp >= sheet.hp) return false;
    if (a.def.guardMult && braceUntil > atMs) return false;
    return triggerSatisfied(a.trigger, { playerHp, playerMaxHp: sheet.hp, enemyHp, enemyMaxHp: enemyMax, guardActive });
  };

  const cast = (a: PreviewAbility, atMs: number) => {
    const mult = 1 + Math.max(0, a.level - 1) * a.def.levelStep;
    if (a.def.mpCost > 0) playerMp = Math.max(0, playerMp - a.def.mpCost);
    readyAt[a.def.id] = atMs + a.def.cooldownMs;
    casts[a.def.id] = (casts[a.def.id] || 0) + 1;
    if (a.def.id === "heavy_chop") heavyChops += 1;
    if (a.def.damageMult) {
      const guardBefore = guardActive;
      const incoming = guardBefore ? (a.def.breaksGuard ? 1 : GUARD_INCOMING) : enemyIncoming;
      const dmg = Math.max(1, Math.floor(hit(sheet.atk, 1, m.def, incoming) * a.def.damageMult * mult));
      enemyHp = Math.max(0, enemyHp - dmg);
      if (a.def.breaksGuard && guardBefore) guardActive = false;
      phases();
      if (a.def.breaksGuard && !guardBefore && guardActive) guardActive = false; // same swing shatters a freshly raised guard
    }
    if (a.def.healPct) {
      const heal = Math.max(1, Math.floor(sheet.hp * a.def.healPct * mult));
      playerHp = Math.min(sheet.hp, playerHp + heal);
    }
    if (a.def.guardMult && a.def.durationMs) {
      braceUntil = atMs + Math.round(a.def.durationMs * mult);
    }
  };

  const braceMult = abilities.find((a) => a.def.guardMult)?.def.guardMult ?? 1;

  while (playerHp > 0 && enemyHp > 0 && t < maxMs) {
    for (const a of abilities) {
      if (enemyHp <= 0 || playerHp <= 0) break;
      if (canFire(a, t)) cast(a, t);
    }
    if (enemyHp <= 0) break;
    const toP = playerInterval - playerCd;
    const toE = enemyInterval - enemyCd;
    let toA = Infinity;
    for (const a of abilities) {
      const r = readyAt[a.def.id] || 0;
      if (r > t) toA = Math.min(toA, r - t);
    }
    const step = Math.max(1, Math.min(toP, toE, toA));
    t += step;
    playerCd += step;
    enemyCd += step;
    if (playerCd >= playerInterval) {
      const dmg = hit(sheet.atk, 1, m.def, guardActive ? GUARD_INCOMING : enemyIncoming);
      enemyHp = Math.max(0, enemyHp - dmg);
      playerCd = 0;
      playerMp = Math.min(maxMp, playerMp + mpRegen);
      phases();
    }
    if (enemyHp <= 0) break;
    if (enemyCd >= enemyInterval) {
      const braced = braceUntil > t ? braceMult : 1;
      const dmg = Math.max(1, Math.floor(hit(m.atk, enemyOutgoing * enrageMult(t), sheet.def, 1) * braced));
      playerHp = Math.max(0, playerHp - dmg);
      enemyCd = 0;
    }
  }

  return {
    won: enemyHp <= 0 && playerHp > 0,
    durationMs: t,
    playerHp: sheet.hp,
    playerHpLeft: Math.max(0, playerHp),
    playerHpLeftPct: sheet.hp > 0 ? Math.max(0, playerHp) / sheet.hp : 0,
    enemyHpLeft: Math.max(0, enemyHp),
    normalHit: hit(sheet.atk, 1, m.def, enemyIncoming),
    heavyHit: Math.max(1, Math.floor(hit(sheet.atk, 1, m.def, enemyIncoming) * HEAVY_CHOP_MULT)),
    enemyHit: hit(m.atk, enemyOutgoing, sheet.def, 1),
    heavyChops,
    casts,
  };
}

export type DifficultyTier = "轻松" | "适中" | "吃力" | "危险";

/** Label from what actually happens, not from level difference. */
export function difficultyFromPreview(p: FightPreview): DifficultyTier {
  if (!p.won) return "危险";
  if (p.playerHpLeftPct >= 0.6) return "轻松";
  if (p.playerHpLeftPct >= 0.3) return "适中";
  return "吃力";
}

export function previewLine(p: FightPreview): string {
  const secs = Math.max(1, Math.round(p.durationMs / 1000));
  if (!p.won) return `预计战败 · 约 ${secs} 秒`;
  return `预计剩 ${Math.round(p.playerHpLeftPct * 100)}% 生命 · 约 ${secs} 秒`;
}
