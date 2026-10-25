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
import {
  chargedHitDamage,
  mechanicEventOffset,
  mechanicEventStage,
  mechanicOfKind,
  mechanicParam,
  shieldIncomingMult,
  type BossMechanicDef,
  type MechanicStage,
} from "./bossMechanics";

export const PLAYER_INTERVAL_MS = 3000;
export const HEAVY_CHOP_MULT = 2.2;
export const HEAVY_CHOP_COOLDOWN_MS = 8000;
// Guard / wrath numbers come from the pack's `bossMechanics` table (monster.mechanicDefs), not constants.
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
  /** `mechanics` resolved against the pack table (see bossMechanics.ts); attached by `encounterStages`. */
  mechanicDefs?: BossMechanicDef[];
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

/** Mirror of backend first_hour_combat.mitigatedDamage / hitDamage: atk² / (atk + floor(def/2)). */
function hit(atk: number, outgoing: number, def: number, incoming: number): number {
  const a = atk * outgoing;
  const raw = a > 0 ? (a * a) / (a + Math.max(0, Math.floor(def / 2))) : 0;
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
  const guardDef = mechanicOfKind(m.mechanicDefs, "guard");
  const wrathDef = mechanicOfKind(m.mechanicDefs, "wrath");
  const guardStart = guardDef ? mechanicParam(guardDef, "startRatio") : 0;
  const guardEnd = guardDef ? mechanicParam(guardDef, "endRatio") : 0;
  const guardIncoming = shieldIncomingMult(m.mechanicDefs) ?? 1;
  const miasmaDef = mechanicOfKind(m.mechanicDefs, "miasma");
  const timedDefs = (m.mechanicDefs || []).filter((d) => mechanicEventOffset(d, 0) !== undefined);
  const eventCounts = timedDefs.map(() => 0);
  let miasmaStacks = 0;
  const wrathStart = wrathDef ? mechanicParam(wrathDef, "startRatio") : 0;
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
  let bossHits = 0;
  const readyAt: Record<string, number> = {};
  const casts: Record<string, number> = {};
  let heavyChops = 0;

  const nextMechanicEvent = () => {
    let next = Infinity;
    timedDefs.forEach((d, i) => {
      const off = mechanicEventOffset(d, eventCounts[i]);
      if (off !== undefined) next = Math.min(next, off);
    });
    return next;
  };

  // Mirror of backend runMechanicEvents: every due event of this stage, in order.
  const runEvents = (stage: MechanicStage, braceNow: number) => {
    timedDefs.forEach((d, i) => {
      for (;;) {
        const e = eventCounts[i];
        const off = mechanicEventOffset(d, e);
        if (off === undefined || off > t || mechanicEventStage(d, e) !== stage) break;
        eventCounts[i] = e + 1;
        if (d.kind === "frost") {
          guardActive = e % 2 === 0;
        } else if (d.kind === "miasma") {
          if (miasmaStacks > 0) {
            playerHp = Math.max(0, playerHp - Math.max(1, Math.floor(sheet.hp * mechanicParam(d, "maxHpPctPerStack") * miasmaStacks)));
          }
        } else if (d.kind === "eruption" && e % 2 === 1) {
          playerHp = Math.max(0, playerHp - Math.max(1, Math.floor(Math.floor(sheet.hp * mechanicParam(d, "maxHpPct")) * braceNow)));
        }
      }
    });
  };

  const phases = () => {
    const ratio = enemyHp / enemyMax;
    if (guardDef && !guardUsed && !wrathActive && ratio <= guardStart && ratio > guardEnd) {
      guardActive = true;
      guardUsed = true;
    }
    if (wrathDef && !wrathActive && ratio <= wrathStart) {
      wrathActive = true;
      guardActive = false;
      enemyInterval = Math.max(mechanicParam(wrathDef, "minIntervalMs"), Math.floor(baseInterval * mechanicParam(wrathDef, "intervalMult")));
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
      const incoming = guardBefore ? (a.def.breaksGuard ? 1 : guardIncoming) : enemyIncoming;
      const dmg = Math.max(1, Math.floor(hit(sheet.atk, 1, m.def, incoming) * a.def.damageMult * mult));
      const minHpAfterOpeningCast = atMs <= 0 ? Math.max(1, Math.ceil(enemyMax * 0.25)) : 0;
      enemyHp = Math.max(minHpAfterOpeningCast, enemyHp - dmg);
      if (a.def.breaksGuard && guardBefore) guardActive = false;
      phases();
      if (a.def.breaksGuard && !guardBefore && guardActive) guardActive = false; // same swing shatters a freshly raised guard
    }
    if (a.def.healPct) {
      const heal = Math.max(1, Math.floor(sheet.hp * a.def.healPct * mult));
      playerHp = Math.min(sheet.hp, playerHp + heal);
      miasmaStacks = 0; // a heal washes the miasma off
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
    const step = Math.max(1, Math.min(toP, toE, toA, nextMechanicEvent() - t));
    t += step;
    playerCd += step;
    enemyCd += step;
    const braceNow = braceUntil > t ? braceMult : 1;
    runEvents("state", braceNow);
    if (playerCd >= playerInterval) {
      const dmg = hit(sheet.atk, 1, m.def, guardActive ? guardIncoming : enemyIncoming);
      enemyHp = Math.max(0, enemyHp - dmg);
      playerCd = 0;
      playerMp = Math.min(maxMp, playerMp + mpRegen);
      phases();
    }
    if (enemyHp <= 0) break;
    if (enemyCd >= enemyInterval) {
      const braced = braceUntil > t ? braceMult : 1;
      bossHits += 1;
      const baseHit = hit(m.atk, enemyOutgoing * enrageMult(t), sheet.def, 1);
      const charged = chargedHitDamage(m.mechanicDefs, bossHits, sheet.hp);
      const dmg = Math.max(1, Math.floor((charged === undefined ? baseHit : Math.max(baseHit, charged)) * braced));
      playerHp = Math.max(0, playerHp - dmg);
      enemyCd = 0;
      if (miasmaDef) miasmaStacks = Math.min(mechanicParam(miasmaDef, "maxStacks"), miasmaStacks + 1);
    }
    if (playerHp > 0) runEvents("damage", braceNow);
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
