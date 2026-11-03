/**
 * Frontend mirror of backend/src/boss_mechanics.ts.
 *
 * The definitions are DATA — the content pack's `bossMechanics` table — so the numbers the preview
 * simulates are the very ones the server fights with. `encounterStages` resolves each monster's
 * `mechanics` ids against that table and attaches the result as `mechanicDefs`; `previewFight` reads
 * it from there. `scripts/fight-preview-parity.test.ts` replays real backend fights through the preview
 * for every mechanic to keep the two implementations identical.
 */
export type BossMechanicDef = {
  id: string;
  kind: string;
  label: string;
  desc?: string;
  /** Numbers by name; JSON rows of different kinds carry different keys, so a key may be absent. */
  params: Record<string, number | undefined>;
  messages?: Record<string, string | undefined>;
};

/** Resolve a monster's mechanic ids against the pack table; unknown ids are ignored (same as the server). */
export function resolveMechanicDefs(ids: readonly string[] | undefined, table: readonly BossMechanicDef[] | undefined): BossMechanicDef[] {
  const defs: BossMechanicDef[] = [];
  for (const id of ids || []) {
    const def = (table || []).find((d) => d.id === id);
    if (def) defs.push(def);
  }
  return defs;
}

/** A mechanic's numeric parameter; a missing one is a content bug, so fail loudly instead of NaN-ing a preview. */
export function mechanicParam(def: BossMechanicDef, key: string): number {
  const v = def.params[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`boss mechanic ${def.id} is missing numeric param "${key}"`);
  return v;
}

export const mechanicOfKind = (defs: readonly BossMechanicDef[] | undefined, kind: string): BossMechanicDef | undefined =>
  (defs || []).find((d) => d.kind === kind);

/** Which half of a loop step an event belongs to (mirror of backend MechanicStage). */
export type MechanicStage = "state" | "damage";

/**
 * Mirror of backend boss_mechanics.mechanicEventOffset: ms after the fight started at which event `e`
 * (0-based) of a time-driven mechanic (frost / miasma / eruption) fires; undefined for other kinds.
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

/** Mirror of backend eventStage. */
export function mechanicEventStage(def: BossMechanicDef, e: number): MechanicStage {
  if (def.kind === "frost") return "state";
  if (def.kind === "eruption") return e % 2 === 0 ? "state" : "damage";
  return "damage";
}

/** Incoming-damage multiplier while the boss shield (HP guard or frost armour) is up. */
export function shieldIncomingMult(defs: readonly BossMechanicDef[] | undefined): number | undefined {
  const shield = mechanicOfKind(defs, "guard") ?? mechanicOfKind(defs, "frost");
  return shield ? mechanicParam(shield, "incomingMult") : undefined;
}

/**
 * Mirror of backend boss_mechanics.chargedHit: the damage of the boss's `hitNumber`-th attack (1-based)
 * when a `charge` mechanic makes it a charged one — a share of the player's MAX HP that ignores
 * defence — else undefined. The caller takes `max(normal hit, charged damage)`.
 */
export function chargedHitDamage(defs: readonly BossMechanicDef[] | undefined, hitNumber: number, playerMaxHp: number): number | undefined {
  for (const def of defs || []) {
    if (def.kind !== "charge") continue;
    if (hitNumber % mechanicParam(def, "everyNth") === 0) return Math.floor(playerMaxHp * mechanicParam(def, "maxHpPct"));
  }
  return undefined;
}

/** Message keys that describe damage landing (everything else — telegraphs, phase changes — is a warning). */
const HAZARD_KEYS = new Set(["tick", "boom", "hit"]);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Classifier for combat-log lines produced by a monster's mechanics, built from the same message
 * templates the server fills in (`{damage}` etc. become wildcards): "warn" for telegraphs and phase
 * changes, "hazard" for mechanic damage, undefined for everything else. New mechanics are picked up
 * from the pack table — no per-boss regex in the UI.
 */
export function mechanicLogMatcher(defs: readonly BossMechanicDef[] | undefined): (line: string) => "warn" | "hazard" | undefined {
  const warn: string[] = [];
  const hazard: string[] = [];
  for (const def of defs || []) {
    for (const [key, template] of Object.entries(def.messages || {})) {
      if (!template) continue;
      const literal = template.replace(/\{\w+\}/g, "");
      if (literal.trim().length < 2) continue; // a bare placeholder would match every line
      (HAZARD_KEYS.has(key) ? hazard : warn).push(template.split(/\{\w+\}/).map(escapeRe).join(".*"));
    }
  }
  const warnRe = warn.length ? new RegExp(warn.join("|")) : undefined;
  const hazardRe = hazard.length ? new RegExp(hazard.join("|")) : undefined;
  return (line) => (hazardRe?.test(line) ? "hazard" : warnRe?.test(line) ? "warn" : undefined);
}
