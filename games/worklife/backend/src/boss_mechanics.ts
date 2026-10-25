import type { BossMechanicDef, ContentPack, HpCombatState } from "./types";

/**
 * Boss mechanics: data-driven phase behaviour shared with the frontend fight preview.
 *
 * A monster lists mechanic ids in `mechanics`; each id resolves to a row of the pack's `bossMechanics`
 * table (kind + params + log messages). This module is the authoritative implementation of every
 * `kind`; `frontend/src/gameplay/bossMechanics.ts` mirrors it for the preview and
 * `scripts/fight-preview-parity.test.ts` replays the same fights through both to keep them identical.
 *
 * Hook points today: HP-threshold phases (`advancePhases`, called after every hit that lands on the
 * boss), the incoming-damage multiplier while a guard is up (`guardIncomingMult`), the attack
 * interval while a wrath is on (written into `enc.enemyIntervalMs`) and per-attack charged hits
 * (`chargedHit` / `chargeTelegraph`, counted by `enc.bossHits`). New kinds add their own hooks
 * here — keep every effect deterministic (no RNG) so the preview can mirror it.
 *
 * Time-driven kinds (`miasma`, `frost`, `eruption`) run on a fight clock measured from
 * `enc.startedAt`: every def owns a numbered series of events (`mechanicEventOffset`), the combat
 * loop wakes exactly at the next one (`nextMechanicEventAt`) and `runMechanicEvents` applies it, so
 * results never depend on how coarsely the client polls. `enc.mech` holds the counters.
 */

export type MechanicKind = "guard" | "wrath" | "charge" | "miasma" | "frost" | "eruption";

/** Mechanic ids a monster lists, resolved against the pack table. Unknown ids are ignored. */
export function mechanicDefsFor(
  pack: Pick<ContentPack, "bossMechanics">,
  monster: Record<string, unknown>
): BossMechanicDef[] {
  const ids = Array.isArray(monster.mechanics) ? monster.mechanics.map((m) => String(m)) : [];
  const table = pack.bossMechanics || [];
  return ids.map((id) => table.find((d) => d.id === id)).filter((d): d is BossMechanicDef => !!d);
}

const ofKind = (defs: BossMechanicDef[], kind: MechanicKind) => defs.find((d) => d.kind === kind);

/** A mechanic's numeric parameter; a missing one is a content bug, so fail loudly instead of NaN-ing a fight. */
export function mechanicParam(def: BossMechanicDef, key: string): number {
  const v = def.params[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`boss mechanic ${def.id} is missing numeric param "${key}"`);
  return v;
}

/** Fill `{ability}` etc. into a mechanic's message; undefined when the mechanic has no such line. */
export function mechanicMessage(def: BossMechanicDef | undefined, key: string, vars: Record<string, string> = {}): string | undefined {
  const template = def?.messages?.[key];
  if (template === undefined) return undefined;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

/**
 * Incoming-damage multiplier the boss takes while its shield is up — the HP-threshold guard or the
 * periodic frost armour (undefined: the monster has neither).
 */
export function guardIncomingMult(defs: BossMechanicDef[]): number | undefined {
  const shield = ofKind(defs, "guard") ?? ofKind(defs, "frost");
  return shield ? mechanicParam(shield, "incomingMult") : undefined;
}

/**
 * Advance the HP-threshold phases (guard telegraph → guard up → wrath). Idempotent for a given HP
 * ratio, so it can run after every hit regardless of poll granularity.
 */
export function advancePhases(
  enc: HpCombatState,
  defs: BossMechanicDef[],
  log: (enc: HpCombatState, line: string) => void
): void {
  const guard = ofKind(defs, "guard");
  const wrath = ofKind(defs, "wrath");

  // Self-heal encounters persisted before phase mechanics were scoped to the
  // Forest Boss. Ordinary monsters must never inherit boss-only state. (Frost armour borrows
  // `guardActive`, so a frost monster keeps it.)
  if (!guard) {
    if (!ofKind(defs, "frost")) enc.guardActive = false;
    enc.guardUsed = false;
  }
  if (!wrath) {
    enc.wrathActive = false;
    enc.enemyIntervalMs = enc.enemyBaseIntervalMs;
  }

  const ratio = enc.enemyHp / enc.enemyMaxHp;
  const guardTelegraph = guard ? mechanicParam(guard, "telegraphRatio") : 0;
  const guardStart = guard ? mechanicParam(guard, "startRatio") : 0;
  const guardEnd = guard ? mechanicParam(guard, "endRatio") : 0;
  if (guard && !enc.guardUsed && !enc.guardTelegraphed && ratio <= guardTelegraph && ratio > guardStart) {
    enc.guardTelegraphed = true;
    const line = mechanicMessage(guard, "telegraph");
    if (line) log(enc, line);
  }
  if (guard && !enc.guardUsed && !enc.wrathActive && ratio <= guardStart && ratio > guardEnd) {
    enc.guardActive = true;
    enc.guardUsed = true;
    const line = mechanicMessage(guard, "up");
    if (line) log(enc, line);
  }
  if (wrath && !enc.wrathActive && ratio <= mechanicParam(wrath, "startRatio")) {
    enc.wrathActive = true;
    enc.guardActive = false;
    enc.enemyIntervalMs = Math.max(mechanicParam(wrath, "minIntervalMs"), Math.floor(enc.enemyBaseIntervalMs * mechanicParam(wrath, "intervalMult")));
    const line = mechanicMessage(wrath, "start");
    if (line) log(enc, line);
  }
}

/** A charged attack: what it deals and how the combat log names it. */
export type ChargedHit = { damage: number; label: string };

/**
 * The boss's `hitNumber`-th attack (1-based) when a `charge` mechanic makes it a charged one, else
 * undefined. A charged attack hits for a share of the player's MAX HP and ignores defence — after the
 * damage recalibration a normal boss hit is only ~2% of a gear-matched player's HP, so a multiplier on
 * it would be invisible, and a flat share is the one thing armour cannot absorb. The caller takes
 * `max(normal hit, charged damage)`, so a charge is never weaker than the swing it replaces.
 */
export function chargedHit(defs: BossMechanicDef[], hitNumber: number, playerMaxHp: number): ChargedHit | undefined {
  for (const def of defs) {
    if (def.kind !== "charge") continue;
    if (hitNumber % mechanicParam(def, "everyNth") === 0) {
      return { damage: Math.floor(playerMaxHp * mechanicParam(def, "maxHpPct")), label: mechanicMessage(def, "hit") ?? def.label };
    }
  }
  return undefined;
}

/** The warning line to log right after attack `hitNumber` when the NEXT attack will be charged. */
export function chargeTelegraph(defs: BossMechanicDef[], hitNumber: number): string | undefined {
  for (const def of defs) {
    if (def.kind !== "charge") continue;
    if ((hitNumber + 1) % mechanicParam(def, "everyNth") === 0) return mechanicMessage(def, "telegraph");
  }
  return undefined;
}

/** Which half of a loop step an event belongs to: "state" before the player swings, "damage" after the boss swings. */
export type MechanicStage = "state" | "damage";

/**
 * Milliseconds after the fight started at which event `e` (0-based) of a time-driven mechanic fires;
 * undefined for kinds that are not time-driven.
 *  - frost: even = armour up at k·period, odd = armour down `durationMs` later (k = ⌊e/2⌋+1)
 *  - miasma: tick n at n·tickMs
 *  - eruption: even = warning `warnMs` before k·period, odd = the eruption itself at k·period
 */
export function mechanicEventOffset(def: BossMechanicDef, e: number): number | undefined {
  const k = Math.floor(e / 2) + 1;
  switch (def.kind) {
    case "frost":
      return e % 2 === 0 ? k * mechanicParam(def, "periodMs") : k * mechanicParam(def, "periodMs") + mechanicParam(def, "durationMs");
    case "miasma":
      return (e + 1) * mechanicParam(def, "tickMs");
    case "eruption":
      return e % 2 === 0 ? k * mechanicParam(def, "periodMs") - mechanicParam(def, "warnMs") : k * mechanicParam(def, "periodMs");
    default:
      return undefined;
  }
}

function eventStage(def: BossMechanicDef, e: number): MechanicStage {
  if (def.kind === "frost") return "state";
  if (def.kind === "eruption") return e % 2 === 0 ? "state" : "damage";
  return "damage";
}

const eventCountKey = (def: BossMechanicDef) => `${def.id}#n`;
const eventCount = (enc: HpCombatState, def: BossMechanicDef) => enc.mech?.[eventCountKey(def)] ?? 0;
const setMech = (enc: HpCombatState, key: string, value: number) => {
  if (!enc.mech) enc.mech = {};
  enc.mech[key] = value;
};

/** Absolute time of the earliest unprocessed time-driven event (Infinity: none). */
export function nextMechanicEventAt(enc: HpCombatState, defs: BossMechanicDef[]): number {
  const start = enc.startedAt ?? 0;
  let next = Infinity;
  for (const def of defs) {
    const off = mechanicEventOffset(def, eventCount(enc, def));
    if (off !== undefined) next = Math.min(next, start + off);
  }
  return next;
}

/**
 * Apply every due event of `stage` (event time <= atMs) in order. Eruption damage is a flat share
 * of the player's max HP that ignores defence; `braceMult` (坚守) is the only thing that softens it.
 */
export function runMechanicEvents(
  enc: HpCombatState,
  defs: BossMechanicDef[],
  atMs: number,
  stage: MechanicStage,
  braceMult: number,
  log: (enc: HpCombatState, line: string) => void
): void {
  const start = enc.startedAt ?? 0;
  for (const def of defs) {
    for (;;) {
      const e = eventCount(enc, def);
      const off = mechanicEventOffset(def, e);
      if (off === undefined || start + off > atMs || eventStage(def, e) !== stage) break;
      setMech(enc, eventCountKey(def), e + 1);
      if (def.kind === "frost") {
        if (e % 2 === 0) {
          enc.guardActive = true;
          const line = mechanicMessage(def, "up");
          if (line) log(enc, line);
        } else if (enc.guardActive) {
          enc.guardActive = false;
          const line = mechanicMessage(def, "down");
          if (line) log(enc, line);
        }
      } else if (def.kind === "miasma") {
        const stacks = enc.mech?.["miasma.stacks"] ?? 0;
        if (stacks > 0) {
          const damage = Math.max(1, Math.floor(enc.playerMaxHp * mechanicParam(def, "maxHpPctPerStack") * stacks));
          enc.playerHp = Math.max(0, enc.playerHp - damage);
          const line = mechanicMessage(def, "tick", { damage: String(damage), stacks: String(stacks) });
          if (line) log(enc, line);
        }
      } else if (def.kind === "eruption") {
        if (e % 2 === 0) {
          const line = mechanicMessage(def, "warn");
          if (line) log(enc, line);
        } else {
          const damage = Math.max(1, Math.floor(Math.floor(enc.playerMaxHp * mechanicParam(def, "maxHpPct")) * braceMult));
          enc.playerHp = Math.max(0, enc.playerHp - damage);
          const line = mechanicMessage(def, "boom", { damage: String(damage), brace: braceMult < 1 ? "（坚守中）" : "" });
          if (line) log(enc, line);
        }
      }
    }
  }
}

/** The boss landed an attack: each hit adds a miasma stack (up to the cap). */
export function onBossHit(enc: HpCombatState, defs: BossMechanicDef[]): void {
  const miasma = ofKind(defs, "miasma");
  if (!miasma) return;
  setMech(enc, "miasma.stacks", Math.min(mechanicParam(miasma, "maxStacks"), (enc.mech?.["miasma.stacks"] ?? 0) + 1));
}

/** A heal or a meal washes the miasma off. `source` names what did it in the combat log. */
export function cleanseMiasma(
  enc: HpCombatState,
  defs: BossMechanicDef[],
  source: string,
  log: (enc: HpCombatState, line: string) => void
): void {
  const miasma = ofKind(defs, "miasma");
  if (!miasma || (enc.mech?.["miasma.stacks"] ?? 0) <= 0) return;
  setMech(enc, "miasma.stacks", 0);
  const line = mechanicMessage(miasma, "cleanse", { source });
  if (line) log(enc, line);
}

/**
 * Damage hook for `simulateFight` (calibration and progression tests): the same charged-hit numbers
 * the server uses. undefined when the monster has no charge mechanic.
 */
export function enemyDamageHook(defs: BossMechanicDef[]): ((hitNumber: number, baseDamage: number, playerMaxHp: number) => number) | undefined {
  if (!defs.some((d) => d.kind === "charge")) return undefined;
  return (hitNumber, baseDamage, playerMaxHp) => {
    const charged = chargedHit(defs, hitNumber, playerMaxHp);
    return charged ? Math.max(baseDamage, charged.damage) : baseDamage;
  };
}
