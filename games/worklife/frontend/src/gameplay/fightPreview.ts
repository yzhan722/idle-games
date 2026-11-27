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
import { enrageDamageMult, enrageStacksAt } from "./growthCurves";
import { missBp, resistAgainst, resistMult, swingMeter, type DamageType } from "./combatSecondary";
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
// Enrage comes from growthCurves.ENRAGE, the same curve hp_combat uses.

export type PreviewMonster = {
  id: string;
  name?: string;
  level?: number;
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
  /** Secondary stats (combatSecondary.ts). Absent = always hits / no resistance. */
  accuracy?: number;
  evasion?: number;
  physResist?: number;
  elemResist?: number;
  damageType?: DamageType;
};

/** One equipped ability as the simulator sees it (definition + the player's level + trigger). */
export type PreviewAbility = {
  def: AbilityDef;
  level: number;
  xp?: number;
  nextXp?: number;
  masteryTitle?: string;
  cdReductionPct?: number;
  castXp?: number;
  trigger: AbilityTrigger;
};

export const MAX_ABILITY_LEVEL = 200;
export const CAST_XP = 2;
export const BOOK_REREAD_XP = 150;

/** Mirror of backend abilities.getAbilityXpForLevel. */
export function getAbilityXpForLevel(level: number): number {
  if (level >= MAX_ABILITY_LEVEL) return Infinity;
  const lv = Math.max(1, Math.floor(level));
  if (lv <= 15) return Math.floor(300 * Math.pow(lv, 1.55));
  const e15 = Math.floor(300 * Math.pow(15, 1.55));
  if (lv <= 50) return Math.floor(e15 + 520 * Math.pow(lv - 15, 1.75));
  const e50 = Math.floor(e15 + 520 * Math.pow(35, 1.75));
  return Math.floor(e50 + 1200 * Math.pow(lv - 50, 1.95));
}

/** Mirror of backend abilities.abilityMasteryTier. */
export function abilityMasteryTier(level: number): { tier: number; title: string; cdReductionPct: number } {
  const lv = Math.max(1, Math.floor(level));
  const step5 = Math.floor(lv / 5);
  const cdReductionPct = Math.min(35, Math.round(step5 * 2.5 * 10) / 10);
  if (lv >= 70) return { tier: 8, title: "登峰造极", cdReductionPct };
  if (lv >= 50) return { tier: 7, title: "出神入化", cdReductionPct };
  if (lv >= 30) return { tier: 6, title: "炉火纯青", cdReductionPct };
  if (lv >= 20) return { tier: 5, title: "融会贯通", cdReductionPct };
  if (lv >= 15) return { tier: 4, title: "登堂入室", cdReductionPct };
  if (lv >= 10) return { tier: 3, title: "驾轻就熟", cdReductionPct };
  if (lv >= 5) return { tier: 2, title: "略有小成", cdReductionPct };
  return { tier: 1, title: "初窥门径", cdReductionPct };
}

/** Mirror of backend abilities.abilityCooldownMsForLevel. */
export function abilityEffectiveCooldownMs(def: AbilityDef, level: number): number {
  const { cdReductionPct } = abilityMasteryTier(level);
  if (cdReductionPct <= 0) return def.cooldownMs;
  return Math.max(1000, Math.round(def.cooldownMs * (1 - cdReductionPct / 100)));
}

/** Mirror of backend abilities.abilityCastXp. */
export function abilityCastXp(def: AbilityDef, monsterLevel = 1): number {
  const mpBonus = Math.floor((def.mpCost || 0) / 2);
  const cdBonus = def.cooldownMs >= 12000 ? 2 : 0;
  const lvBonus = Math.floor(Math.max(0, (monsterLevel || 1) - 1) * 0.35);
  return CAST_XP + mpBonus + cdBonus + lvBonus;
}

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
  /** 这一场吃喝了哪些格（supplies 的下标）、在第几毫秒。 */
  eaten?: Array<{ index: number; atMs: number }>;
};

/** Mirror of backend first_hour_combat.mitigatedDamage / hitDamage: atk² / (atk + floor(def/2)) × critAmp. */
function hit(
  atk: number,
  outgoing: number,
  def: number,
  incoming: number,
  armorPenPct = 0,
  relicCritAmpPct = 0,
  resist = 0
): number {
  const a = atk * outgoing;
  const effDef = armorPenPct > 0 ? Math.floor(def * (1 - armorPenPct)) : def;
  const critAmp = relicCritAmpPct > 0 ? 1 + relicCritAmpPct / 100 : 1;
  const raw = a > 0 ? ((a * a) / (a + Math.max(0, Math.floor(effDef / 2)))) * critAmp : 0;
  return Math.max(1, Math.floor(raw * incoming * resistMult(resist)));
}

export function monsterBaseInterval(m: PreviewMonster): number {
  const isBoss = Boolean(m.isBoss) || String(m.id || "").endsWith("_boss") || String(m.name || "").includes("BOSS");
  return Number(m.attackIntervalMs || (isBoss ? 2200 : 2400));
}

/** Mirror of backend abilities.triggerSatisfied. */
export function triggerSatisfied(
  trigger: AbilityTrigger,
  s: { playerHp: number; playerMaxHp: number; enemyHp: number; enemyMaxHp: number; guardActive: boolean; enemyCount?: number }
): boolean {
  switch (trigger.type) {
    case "always":
      return true;
    case "enemy_hp_below":
      return s.enemyMaxHp > 0 && (s.enemyHp / s.enemyMaxHp) * 100 <= trigger.pct;
    case "self_hp_below":
    case "ally_hp_below":
      return s.playerMaxHp > 0 && (s.playerHp / s.playerMaxHp) * 100 <= trigger.pct;
    case "enemies_at_least":
      return (s.enemyCount ?? 1) >= Math.max(1, trigger.pct || 1);
    case "enemy_guard":
      return s.guardActive;
  }
}

/** Build the preview ability list from the player's loadout + the /content catalog. */
export function previewAbilities(
  loadout: AbilitySlot[] | undefined,
  known: Record<string, { level: number; xp?: number }> | undefined,
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
    const level = known?.[slot.abilityId]?.level || 1;
    const xp = Math.round((known?.[slot.abilityId]?.xp || 0) * 10) / 10;
    const nextXp = getAbilityXpForLevel(level);
    const mastery = abilityMasteryTier(level);
    out.push({
      def,
      level,
      xp,
      nextXp,
      masteryTitle: mastery.title,
      cdReductionPct: mastery.cdReductionPct,
      castXp: abilityCastXp(def, 1),
      trigger: slot.trigger,
    });
  }
  return out.slice(0, slotCount);
}

function resolveAbilities(arg: HeavyChopMode | PreviewAbility[] | undefined): PreviewAbility[] {
  if (Array.isArray(arg)) return arg;
  if (arg === "on-cooldown") return [{ def: HEAVY_CHOP_DEF, level: 1, trigger: { type: "always" } }];
  return [];
}

/** 战斗中自动吃喝的一格（hp_combat 的 maybeEat / maybeDrinkMp）。stock 会被预览扣掉。 */
export type PreviewSupply = {
  kind: "food" | "mp";
  amount: number;
  mp?: number;
  trigger: number;
  cooldownMs: number;
  stock: number;
  /** 吃下去得到的状态（下一场起算，见 farmPreview.ts）。 */
  buff?: { id: string; durationMs: number; xpGain: number; goldGain: number };
};

export type FightOptions = {
  /** 开打时的生命；缺省满血。 */
  startHp?: number;
  supplies?: PreviewSupply[];
  /** 盛宴流派：吃东西后的护盾。 */
  feast?: { ms: number; mult: number };
};

export function previewFight(
  sheet: CombatSheet,
  m: PreviewMonster,
  abilitiesOrMode: HeavyChopMode | PreviewAbility[] = "none",
  maxMs = 10 * 60_000,
  opts: FightOptions = {}
): FightPreview {
  const abilities = resolveAbilities(abilitiesOrMode);
  const supplies = opts.supplies ?? [];
  const supplyReadyAt = supplies.map(() => 0);
  const eaten: Array<{ index: number; atMs: number }> = [];
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
  const enrageMult = (atMs: number) => enrageDamageMult(enrageStacksAt(atMs, isBoss));
  const playerInterval = sheet.intervalMs || PLAYER_INTERVAL_MS;
  const maxMp = sheet.mp ?? 20;
  const mpRegen = sheet.mpRegenPerTick ?? 1;
  const isBossEnemy =
    Boolean(m.isBoss) || String(m.id || "").endsWith("_boss") || String(m.name || "").includes("BOSS");
  const effectiveArmorPen = Math.min(
    0.85,
    (sheet.armorPenPct || 0) + (isBossEnemy ? sheet.bossArmorBreakPct || 0 : 0)
  );
  const relicCritAmp = sheet.relicCritAmpPct || 0;
  const enemyResist = resistAgainst(sheet.damageType, m);
  const playerResist = resistAgainst(m.damageType, sheet);
  const playerMiss = missBp(sheet.accuracy, m.evasion);
  const enemyMiss = missBp(m.accuracy, sheet.evasion);
  let playerMeter: number | undefined;
  let enemyMeter: number | undefined;

  let playerHp = opts.startHp ?? sheet.hp;
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
  let feastUntil = 0;
  let bossHits = 0;
  const readyAt: Record<string, number> = {};
  const casts: Record<string, number> = {};
  const abState = new Map(abilities.map((a) => [a.def.id, { level: a.level, xp: a.xp || 0 }]));
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

  // Mirror of backend guardWindowMult: 坚守类技能与盛宴护盾取更强的那个。
  const guardAt = (atMs: number) => Math.min(braceUntil > atMs ? braceMult : 1, opts.feast && feastUntil > atMs ? opts.feast.mult : 1);

  // Mirror of backend maybeEat / maybeDrinkMp.
  const consume = (atMs: number) => {
    supplies.forEach((s, i) => {
      if (s.stock < 1 || supplyReadyAt[i] > atMs) return;
      if (s.kind === "mp") {
        if (maxMp <= 0 || maxMp - playerMp < Math.max(1, s.trigger)) return;
        playerMp = Math.min(maxMp, playerMp + s.amount);
      } else {
        if (sheet.hp - playerHp < Math.max(1, s.trigger)) return;
        const before = playerHp;
        playerHp = Math.min(sheet.hp, playerHp + s.amount);
        playerMp = Math.min(maxMp, playerMp + (s.mp || 0));
        if (opts.feast) feastUntil = atMs + opts.feast.ms;
        if (playerHp > before) miasmaStacks = 0;
      }
      s.stock -= 1;
      eaten.push({ index: i, atMs });
      supplyReadyAt[i] = atMs + s.cooldownMs;
    });
  };

  const canFire = (a: PreviewAbility, atMs: number) => {
    if ((readyAt[a.def.id] || 0) > atMs) return false;
    if (a.def.mpCost > playerMp) return false;
    if (a.def.healPct && !a.def.damageMult && !a.def.guardMult && playerHp >= sheet.hp) return false;
    if (a.def.guardMult && !a.def.damageMult && !a.def.healPct && guardAt(atMs) < 1) return false;
    return triggerSatisfied(a.trigger, { playerHp, playerMaxHp: sheet.hp, enemyHp, enemyMaxHp: enemyMax, guardActive });
  };

  let braceMult = abilities.find((a) => a.def.guardMult)?.def.guardMult ?? 1;

  const cast = (a: PreviewAbility, atMs: number) => {
    const st = abState.get(a.def.id) || { level: a.level, xp: a.xp || 0 };
    const curLevel = st.level;
    const mult = 1 + Math.max(0, curLevel - 1) * a.def.levelStep;
    if (a.def.mpCost > 0) playerMp = Math.max(0, playerMp - a.def.mpCost);
    readyAt[a.def.id] = atMs + abilityEffectiveCooldownMs(a.def, curLevel);
    const gainedXp = abilityCastXp(a.def, Number(m.level || 1));
    st.xp += gainedXp;
    let need = getAbilityXpForLevel(st.level);
    while (st.xp >= need && st.level < MAX_ABILITY_LEVEL) {
      st.xp -= need;
      st.level += 1;
      need = getAbilityXpForLevel(st.level);
    }
    abState.set(a.def.id, st);
    casts[a.def.id] = (casts[a.def.id] || 0) + 1;
    if (a.def.id === "heavy_chop") heavyChops += 1;
    if (a.def.damageMult) {
      const guardBefore = guardActive;
      const incoming = guardBefore ? (a.def.breaksGuard ? 1 : guardIncoming) : enemyIncoming;
      const dmg = Math.max(
        1,
        Math.floor(hit(sheet.atk, 1, m.def, incoming, effectiveArmorPen, relicCritAmp, enemyResist) * a.def.damageMult * mult)
      );
      // Mirror of backend castAbility: only the opening cast into a full-HP enemy is floored at 25%
      // (a second damaging slot firing at t=0 hits normally).
      const minHpAfterOpeningCast = atMs <= 0 && enemyHp >= enemyMax ? Math.max(1, Math.ceil(enemyMax * 0.25)) : 0;
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
      braceMult = a.def.guardMult;
    }
    if (a.def.mpRestore) {
      const gain = Math.max(1, Math.round(a.def.mpRestore * mult));
      playerMp = Math.min(maxMp, playerMp + gain);
    }
  };

  while (playerHp > 0 && enemyHp > 0 && t < maxMs) {
    consume(t);
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
    const braceNow = guardAt(t);
    runEvents("state", braceNow);
    if (playerCd >= playerInterval) {
      const swing = swingMeter(playerMeter, playerMiss);
      playerMeter = swing.meter;
      if (!swing.miss) {
        const dmg = hit(sheet.atk, 1, m.def, guardActive ? guardIncoming : enemyIncoming, effectiveArmorPen, relicCritAmp, enemyResist);
        enemyHp = Math.max(0, enemyHp - dmg);
      }
      playerCd = 0;
      playerMp = Math.min(maxMp, playerMp + mpRegen);
      phases();
    }
    if (enemyHp <= 0) break;
    if (enemyCd >= enemyInterval) {
      const braced = guardAt(t);
      bossHits += 1;
      const baseHit = hit(m.atk, enemyOutgoing * enrageMult(t), sheet.def, 1, 0, 0, playerResist);
      const charged = chargedHitDamage(m.mechanicDefs, bossHits, sheet.hp);
      enemyCd = 0;
      // Charged attacks cannot be dodged (and leave the miss meter alone).
      const swing = charged === undefined ? swingMeter(enemyMeter, enemyMiss) : undefined;
      if (swing) enemyMeter = swing.meter;
      const landed = !swing?.miss;
      if (landed) {
        const dmg = Math.max(1, Math.floor((charged === undefined ? baseHit : Math.max(baseHit, charged)) * braced));
        playerHp = Math.max(0, playerHp - dmg);
        if (miasmaDef) miasmaStacks = Math.min(mechanicParam(miasmaDef, "maxStacks"), miasmaStacks + 1);
      }
      if (landed && playerHp > 0 && enemyHp > 0 && sheet.thornsDefRatio && sheet.thornsDefRatio > 0) {
        const thornsDmg = Math.max(1, Math.floor(sheet.def * sheet.thornsDefRatio));
        enemyHp = Math.max(0, enemyHp - thornsDmg);
        phases();
      }
    }
    if (playerHp > 0 && enemyHp > 0) runEvents("damage", braceNow);
  }

  return {
    won: enemyHp <= 0 && playerHp > 0,
    durationMs: t,
    playerHp: sheet.hp,
    playerHpLeft: Math.max(0, playerHp),
    playerHpLeftPct: sheet.hp > 0 ? Math.max(0, playerHp) / sheet.hp : 0,
    enemyHpLeft: Math.max(0, enemyHp),
    normalHit: hit(sheet.atk, 1, m.def, enemyIncoming, effectiveArmorPen, relicCritAmp, enemyResist),
    heavyHit: Math.max(
      1,
      Math.floor(hit(sheet.atk, 1, m.def, enemyIncoming, effectiveArmorPen, relicCritAmp, enemyResist) * HEAVY_CHOP_MULT)
    ),
    enemyHit: hit(m.atk, enemyOutgoing, sheet.def, 1, 0, 0, playerResist),
    heavyChops,
    casts,
    ...(supplies.length ? { eaten } : {}),
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
