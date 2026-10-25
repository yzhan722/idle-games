import type { BossMechanicDef, EnhancedContentPack, EnhancedPlayerState, HpCombatState } from "./types";
import { appendLog, applyDurabilityWear, getBuffEffects, getRareFindMultiplier, isDurabilityBroken } from "./storage";
import { hitDamage, monsterCombatant, playerCombatant } from "./first_hour_combat";
import { syncAchievements } from "./progression";
import { getPrestigeMultiplier, getReputationBonuses } from "./progression2";
import { e2eFastCombatInterval, e2eFastHeavyChopCdMs } from "./e2e_fast";
import { consumeItem } from "./systems";
import { COMBAT_SKILL_NAMES, grantCombatXp } from "./combat_skills";
import { HOUSE_XP_PER_LEVEL, houseLevelForSkill } from "./houses";
import { isMonsterInOpenZone } from "./zones";
import {
  advancePhases,
  chargeTelegraph,
  chargedHit,
  cleanseMiasma,
  guardIncomingMult,
  mechanicDefsFor,
  mechanicMessage,
  nextMechanicEventAt,
  onBossHit,
  runMechanicEvents,
} from "./boss_mechanics";
import {
  ABILITY_BY_ID,
  CAST_XP,
  abilityLevelMult,
  abilityReadyAt,
  activeAbilitySlots,
  ensureAbilities,
  grantAbilityXp,
  setAbilityReadyAt,
  triggerSatisfied,
  type AbilityDef,
} from "./abilities";

export const HEAVY_CHOP_COOLDOWN_MS = 8000;
export const HEAVY_CHOP_MULT = 2.2;
/** MWI food cooldown: one bite per slot per 30s. */
export const FOOD_COOLDOWN_MS = 30_000;
/** MWI mana potion cooldown: 20s per MP slot. */
export const MP_POTION_COOLDOWN_MS = 20_000;
/** Pause between auto-repeated fights so the victory panel is readable. */
export const AUTO_REPEAT_INTERMISSION_MS = 3000;
/** MWI: a defeat costs a respawn timer, then the run continues automatically. */
export const RESPAWN_MS = 30_000;
/**
 * Death-spiral guard: auto-repeat against a monster that keeps winning just burns gear durability
 * (-0.5 per defeat) and wall-clock time — offline it could silently grind a full set to 0.
 * After this many defeats in a row the run switches itself off and says why.
 */
export const AUTO_REPEAT_MAX_CONSECUTIVE_DEATHS = 3;
/** Base slots; pouch accessories add more (MWI: 1 base, up to 3). */
export const BASE_FOOD_SLOTS = 1;
export const BASE_DRINK_SLOTS = 1;
export const MAX_SLOTS_CAP = 3;
/** Out of combat, the persistent HP pool refills 0→max over this span (MWI passive regen). */
export const COMBAT_HP_FULL_REGEN_MS = 60_000;

/**
 * Current persistent player HP: stored value + out-of-combat regen since `combatHpAt`,
 * clamped to the max the current gear/skills would roll. Monsters always start full —
 * only the player side carries between fights.
 */
export function currentCombatHp(player: EnhancedPlayerState, maxHp: number, nowMs: number): number {
  const stored = player.combatHp;
  let hp = stored === undefined ? maxHp : Math.min(Math.max(0, Math.floor(stored)), maxHp);
  if (hp < maxHp && player.combatHpAt !== undefined) {
    const elapsed = Math.max(0, nowMs - player.combatHpAt);
    const regenSpanMs = player.activeClassId === "farmer" ? 40_000 : COMBAT_HP_FULL_REGEN_MS;
    hp = Math.min(maxHp, hp + Math.floor((elapsed / regenSpanMs) * maxHp));
  }
  return hp;
}

/** Stamp the persistent HP pool. Writes the timestamp so regen never double-counts. */
export function persistCombatHp(player: EnhancedPlayerState, hp: number, atMs: number): void {
  player.combatHp = Math.max(0, Math.floor(hp));
  player.combatHpAt = atMs;
}

/**
 * Heal the persistent HP pool outside of combat (manual potion use from inventory).
 * Applies pending regen first, then the heal, clamped to the current max.
 */
export function healCombatHp(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  amount: number,
  now: Date
): number {
  const pc = playerCombatant(player, pack, playerExtras(player, now, pack));
  const cur = currentCombatHp(player, pc.hp, now.getTime());
  const healed = Math.min(pc.hp, cur + Math.max(0, Math.floor(amount)));
  persistCombatHp(player, healed, now.getTime());
  return healed;
}

export function combatSlotCounts(player: EnhancedPlayerState, pack: EnhancedContentPack): { food: number; drink: number } {
  const eq = (player.equipment || {}) as Record<string, unknown>;
  const items = pack.items as any[];
  let food = BASE_FOOD_SLOTS;
  let drink = BASE_DRINK_SLOTS;
  for (const [slot, itemId] of Object.entries(eq)) {
    if (typeof itemId !== "string" || slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    if ((player.inventory?.[itemId] || 0) <= 0) continue;
    if (isDurabilityBroken(player, itemId)) continue;
    const def = items.find((i) => i.id === itemId);
    if (!def) continue;
    food += Number(def.foodSlots || 0);
    drink += Number(def.drinkSlots || 0);
  }
  return { food: Math.min(MAX_SLOTS_CAP, food), drink: Math.min(MAX_SLOTS_CAP, drink) };
}
/** MWI enrage: every 3 minutes a fight lasts, the monster gains +10% damage (max 10 stacks); bosses 10 min. */
export const ENRAGE_INTERVAL_MS = 3 * 60_000;
export const BOSS_ENRAGE_INTERVAL_MS = 10 * 60_000;
export const ENRAGE_STEP = 0.1;
export const ENRAGE_MAX_STACKS = 10;
// Guard / wrath thresholds, multipliers and log lines live in the pack's `bossMechanics` table
// (see boss_mechanics.ts) so the frontend preview reads the very same numbers.

export const BUILD_EDGE = { atk: 4, hp: 0, def: 0 };
export const BUILD_BARK = { atk: 0, hp: 20, def: 4 };

export function buildExtras(build?: EnhancedPlayerState["chapter1Build"]) {
  if (build === "sharpened_edge") return BUILD_EDGE;
  if (build === "thick_bark") return BUILD_BARK;
  return { atk: 0, hp: 0, def: 0 };
}

function monsterById(pack: EnhancedContentPack, id: string) {
  const m = (pack.monsters as Array<Record<string, unknown>>).find((x) => x.id === id);
  if (!m) throw new Error("unknown_monster");
  return m;
}

/** Build extras + active buff stats (狂战药剂 atk etc.) capped at +40% of unbuffed stats so low-level players don't one-shot monsters. */
function playerExtras(player: EnhancedPlayerState, now: Date, pack?: EnhancedContentPack) {
  const build = buildExtras(player.chapter1Build);
  const buffs = getBuffEffects(player, now);
  let buffAtk = buffs.atk || 0;
  let buffDef = buffs.def || 0;
  if (pack && (buffAtk > 0 || buffDef > 0)) {
    const basePc = playerCombatant(player, pack, build);
    buffAtk = Math.min(buffAtk, Math.max(2, Math.floor(basePc.atk * 0.4)));
    buffDef = Math.min(buffDef, Math.max(2, Math.floor(basePc.def * 0.4 + 4)));
  }
  return { atk: build.atk + buffAtk, hp: build.hp, def: build.def + buffDef };
}

/**
 * Drink slot: re-apply the drink whenever its buff is not active (MWI drinks tick down and get
 * re-drunk automatically). Pure MP potions placed in a drink slot trigger when missing MP reaches threshold.
 */
function maybeDrink(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, now: Date) {
  const slots = player.combatLoadout?.drink || [];
  const atMs = now.getTime();
  slots.slice(0, MAX_SLOTS_CAP).forEach((slot, i) => {
    if (!slot?.itemId) return;
    if ((player.inventory[slot.itemId] || 0) < 1) return;
    const def = (pack.items as any[]).find((x) => x.id === slot.itemId);
    if (!def) return;
    const mpRestore = Number(def.effect?.mp || 0);
    const buffId = def.effect?.buff?.id;
    const isPureMpPotion =
      slot.itemId.startsWith("potion_mp_") ||
      slot.itemId === "drink_herbal_tonic" ||
      (!buffId && mpRestore > 0) ||
      (slot.triggerMissingMp !== undefined && slot.triggerMissingMp > 0);
    if (isPureMpPotion && mpRestore > 0) {
      if (!enc.playerMaxMp || enc.playerMaxMp <= 0) return;
      if (!enc.mpReadyAt) enc.mpReadyAt = [];
      const cdIdx = 10 + i;
      if ((enc.mpReadyAt[cdIdx] || 0) > atMs) return;
      const missingMp = Math.max(0, (enc.playerMaxMp || 0) - (enc.playerMp || 0));
      const threshold = Math.max(1, slot.triggerMissingMp || Math.floor((enc.playerMaxMp || 50) * 0.4));
      if (missingMp < threshold) return;
      const res = consumeItem(player, pack, slot.itemId, now);
      if (res.ok) {
        const actualMp = res.healed?.mp ?? mpRestore;
        enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + actualMp);
        if (Number(def.effect?.hp) > 0) enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + (res.healed?.hp ?? Number(def.effect.hp)));
        enc.mpReadyAt[cdIdx] = atMs + MP_POTION_COOLDOWN_MS;
        recordConsumed(enc, slot.itemId, res.itemName);
        if (enc.log.length > 0) pushLog(enc, `喝下了 ${res.itemName}，恢复 ${actualMp} 魔力`);
      }
      return;
    }
    if (!buffId) return;
    const active = (player.activeBuffs || []).some((b) => b.id === buffId && Date.parse(b.expiresAt) > atMs);
    if (active) return;
    const res = consumeItem(player, pack, slot.itemId, now);
    if (res.ok) {
      if (Number(def.effect?.hp) > 0 && enc.playerMaxHp > 0) {
        enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + (res.healed?.hp ?? Number(def.effect.hp)));
      }
      if (Number(def.effect?.mp) > 0 && (enc.playerMaxMp || 0) > 0) {
        enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + (res.healed?.mp ?? Number(def.effect.mp)));
      }
      recordConsumed(enc, slot.itemId, res.itemName);
      if (enc.log.length > 0 && res.buff) {
        pushLog(enc, `喝下了 ${res.itemName}（获得状态「${res.buff.name}」）`);
      }
    }
  });
}

/** MP potion slot: restore mana when missing MP reaches triggerMissingMp and slot cooldown is ready. */
function maybeDrinkMp(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, atMs: number) {
  const slots = player.combatLoadout?.mp || [];
  if (!slots.length || !enc.playerMaxMp || enc.playerMaxMp <= 0) return;
  if (!enc.mpReadyAt) enc.mpReadyAt = [];
  slots.slice(0, MAX_SLOTS_CAP).forEach((slot, i) => {
    if (!slot?.itemId) return;
    if ((enc.mpReadyAt![i] || 0) > atMs) return;
    const missingMp = Math.max(0, (enc.playerMaxMp || 0) - (enc.playerMp || 0));
    if (missingMp < Math.max(1, slot.triggerMissingMp || 1)) return;
    if ((player.inventory[slot.itemId] || 0) < 1) return;
    const def = (pack.items as any[]).find((x) => x.id === slot.itemId);
    const mpHeal = Number(def?.effect?.mp || 0);
    if (mpHeal <= 0) return;
    const res = consumeItem(player, pack, slot.itemId, new Date(atMs));
    if (!res.ok) return;
    const actualMp = res.healed?.mp ?? mpHeal;
    enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + actualMp);
    if (Number(def?.effect?.hp) > 0) {
      enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + (res.healed?.hp ?? Number(def.effect.hp)));
    }
    enc.mpReadyAt![i] = atMs + MP_POTION_COOLDOWN_MS;
    recordConsumed(enc, slot.itemId, res.itemName);
    pushLog(enc, `喝下了 ${res.itemName}，恢复 ${actualMp} 魔力`);
  });
}

/** Food slot: eat when missing HP reaches the trigger and the slot cooldown is over. */
function maybeEat(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, atMs: number, mechDefs: BossMechanicDef[] = []) {
  const slots = player.combatLoadout?.food || [];
  if (!enc.foodReadyAt) enc.foodReadyAt = [];
  slots.slice(0, combatSlotCounts(player, pack).food).forEach((slot, i) => {
    if (!slot?.itemId) return;
    if ((enc.foodReadyAt![i] || 0) > atMs) return;
    const missing = enc.playerMaxHp - enc.playerHp;
    if (missing < Math.max(1, slot.triggerMissingHp || 1)) return;
    if ((player.inventory[slot.itemId] || 0) < 1) return;
    const def = (pack.items as any[]).find((x) => x.id === slot.itemId);
    const heal = Number(def?.effect?.hp || 0);
    if (heal <= 0) return;
    const res = consumeItem(player, pack, slot.itemId, new Date(atMs));
    if (!res.ok) return;
    const beforeHp = enc.playerHp;
    const actualHeal = res.healed?.hp ?? heal;
    enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + actualHeal);
    if (Number(def?.effect?.mp) > 0) {
      enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + (res.healed?.mp ?? Number(def.effect.mp)));
    }
    enc.foodReadyAt![i] = atMs + FOOD_COOLDOWN_MS;
    recordConsumed(enc, slot.itemId, res.itemName);
    pushLog(enc, `吃了 ${res.itemName}，恢复 ${actualHeal} 生命`);
    if (enc.playerHp > beforeHp) {
      cleanseMiasma(enc, mechDefs, `吃下${res.itemName}`, pushLog);
    }
  });
}

export function recordConsumed(enc: HpCombatState, itemId: string, name: string) {
  if (!enc.consumed) enc.consumed = [];
  const row = enc.consumed.find((c) => c.itemId === itemId);
  if (row) row.qty += 1;
  else enc.consumed.push({ itemId, name, qty: 1 });
}

/**
 * Manually use a consumable (HP potion, MP potion, Status potion, or food) inside or outside combat.
 * Updates live combat HP/MP pools, activeBuffs, consumed tally, and combat log immediately.
 */
export function useCombatConsumable(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  itemId: string,
  now: Date = new Date()
) {
  const result = consumeItem(player, pack, itemId, now);
  if (!result.ok) return result;
  const healed = result.healed;
  const enc = player.hpCombat;
  if (enc && !enc.outcome) {
    if (healed?.hp) {
      const beforeHp = enc.playerHp;
      enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + healed.hp);
      persistCombatHp(player, enc.playerHp, now.getTime());
      if (enc.playerHp > beforeHp) {
        const monster = (pack.monsters as Array<Record<string, unknown>>).find((x) => x.id === enc.monsterId);
        if (monster) cleanseMiasma(enc, mechanicDefsFor(pack, monster), `使用${result.itemName}`, pushLog);
      }
    }
    if (healed?.mp) {
      if (enc.playerMaxMp === undefined) {
        const pc0 = playerCombatant(player, pack, playerExtras(player, now, pack));
        enc.playerMaxMp = pc0.mp || 0;
        if (enc.playerMp === undefined) enc.playerMp = enc.playerMaxMp;
      }
      enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + healed.mp);
    }
    recordConsumed(enc, itemId, result.itemName);
    const notes: string[] = [];
    if (healed?.hp) notes.push(`恢复 ${healed.hp} 生命`);
    if (healed?.mp) notes.push(`恢复 ${healed.mp} 魔力`);
    if (result.buff) notes.push(`获得状态「${result.buff.name}」`);
    pushLog(enc, `🧪 使用了 ${result.itemName}${notes.length ? "（" + notes.join(" · ") + "）" : ""}`);
  } else if (healed?.hp) {
    healCombatHp(player, pack, healed.hp, now);
  }
  return result;
}

export function startHpCombat(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  monsterId: string,
  now: Date,
  opts: { streak?: number; deaths?: number; lossStreak?: number; runStats?: HpCombatState["runStats"] } = {}
): HpCombatState {
  const m = monsterById(pack, monsterId);
  // 区域门：前端按 zoneDoors 只列已开放关卡，后端独立复核防止 API 直调进未发布区域
  if (!isMonsterInOpenZone(pack, monsterId)) throw new Error("stage_locked");
  // 等级门：与 /actions/start 同一事实源（act_combat_<id> 的 skillLevel 要求）。
  // 之前缺这步——1 级新号可直开 Lv11+ 的怪含 Boss，两条战斗入口门槛不一致。
  const reqLevel = Number(
    (pack.actions as Array<{ id: string; requirements?: { skillLevel?: number } }>)
      .find((a) => a.id === `act_combat_${monsterId}`)?.requirements?.skillLevel || 1
  );
  if (reqLevel > 1 && (player.combatLevel || 1) < reqLevel) throw new Error(`skill_level_required:${reqLevel}`);
  const enemy = monsterCombatant(m);
  ensureAbilities(player);
  // Drink before rolling max HP / atk so the buff counts from the first swing.
  const pre: HpCombatState = { monsterId, monsterName: enemy.name, playerHp: 0, playerMaxHp: 0, enemyHp: 0, enemyMaxHp: 0, playerIntervalMs: 0, enemyIntervalMs: 0, enemyBaseIntervalMs: 0, playerCooldownMs: 0, enemyCooldownMs: 0, heavyChopReadyAt: 0, guardActive: false, wrathActive: false, log: [] };
  maybeDrink(player, pack, pre, now);
  const extras = playerExtras(player, now, pack);
  const pc = playerCombatant(player, pack, extras);
  // MWI persistent HP: carry the pool (plus out-of-combat regen) into the new fight.
  // The enemy always enters at full HP — only the player's side remembers damage.
  const carriedHp = Math.max(1, currentCombatHp(player, pc.hp, now.getTime()));
  persistCombatHp(player, carriedHp, now.getTime());
  const state: HpCombatState = {
    monsterId,
    monsterName: enemy.name,
    playerHp: carriedHp,
    playerMaxHp: pc.hp,
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    playerIntervalMs: e2eFastCombatInterval(pc.intervalMs),
    enemyIntervalMs: e2eFastCombatInterval(enemy.intervalMs),
    enemyBaseIntervalMs: e2eFastCombatInterval(enemy.intervalMs),
    playerCooldownMs: 0,
    enemyCooldownMs: 0,
    heavyChopReadyAt: now.getTime(),
    abilityReadyAt: {},
    playerMp: pc.mp || 0,
    playerMaxMp: pc.mp || 0,
    guardActive: false,
    wrathActive: false,
    guardUsed: false,
    log: [`开始战斗！${((pack.classes as Array<{ id: string; name?: string }> | undefined)?.find((c) => c.id === player.activeClassId)?.name) || "冒险者"} VS ${enemy.name}`],
    consumed: pre.consumed,
    streak: opts.streak || 0,
    deaths: opts.deaths || 0,
    lossStreak: opts.lossStreak || 0,
    startedAt: now.getTime(),
    enrageStacks: 0,
    runStats: opts.runStats || { startedAt: now.getTime(), kills: 0, xp: 0, gold: 0, loot: {} },
  };
  return state;
}

/** Effective cooldown for an ability (E2E fast mode compresses every cooldown the same way). */
function abilityCooldownMs(def: AbilityDef): number {
  const fast = e2eFastHeavyChopCdMs();
  if (fast !== 8000) return Math.max(50, Math.round((def.cooldownMs / 8000) * fast));
  return def.cooldownMs;
}

/**
 * Resolve one cast at `atMs`. Shared by auto-cast (triggers) and the manual button, so both paths
 * produce identical numbers — and so the frontend preview only has to mirror one routine.
 */
function castAbility(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  enc: HpCombatState,
  def: AbilityDef,
  atMs: number,
  monster: Record<string, unknown>
): void {
  const level = player.abilities?.[def.id]?.level || 1;
  const mult = abilityLevelMult(def, level);
  if (def.mpCost > 0) enc.playerMp = Math.max(0, (enc.playerMp || 0) - def.mpCost);
  setAbilityReadyAt(enc, def.id, atMs + abilityCooldownMs(def));

  if (def.damageMult) {
    const pc = playerCombatant(player, pack, playerExtras(player, new Date(atMs), pack));
    const enemy = monsterCombatant(monster);
    const mechDefs = mechanicDefsFor(pack, monster);
    const guardBefore = enc.guardActive;
    // 重劈 ignores the shield; other strikes hit the guarded (reduced) value.
    const incoming = guardBefore ? (def.breaksGuard ? 1 : guardIncomingMult(mechDefs) ?? 1) : enemy.incomingDamageMult;
    const dmg = Math.max(1, Math.floor(hitDamage(pc, { ...enemy, incomingDamageMult: incoming }) * def.damageMult * mult));
    const minHpAfterOpeningCast =
      atMs <= (enc.startedAt ?? atMs) && enc.enemyHp >= enc.enemyMaxHp
        ? Math.max(1, Math.ceil(enc.enemyMaxHp * 0.25))
        : 0;
    enc.enemyHp = Math.max(minHpAfterOpeningCast, enc.enemyHp - dmg);
    if (def.breaksGuard && guardBefore) {
      enc.guardActive = false;
      pushLog(enc, `${def.name}破防！造成 ${dmg} 伤害`);
    } else {
      pushLog(enc, `${def.name}造成 ${dmg} 伤害`);
    }
    maybePhases(enc, monster, pack);
    // A guard-breaker that pushes the boss through the guard threshold shatters the shield it just
    // raised; the player is not punished with a guard phase while sitting on cooldown.
    if (def.breaksGuard && !guardBefore && enc.guardActive) {
      enc.guardActive = false;
      pushLog(enc, mechanicMessage(mechDefs.find((d) => d.kind === "guard"), "shatter", { ability: def.name }) ?? `${def.name}震碎了刚举起的盾！`);
    }
  }
  if (def.healPct) {
    const heal = Math.max(1, Math.floor(enc.playerMaxHp * def.healPct * mult));
    const before = enc.playerHp;
    enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + heal);
    pushLog(enc, `${def.name}恢复 ${enc.playerHp - before} 生命`);
    cleanseMiasma(enc, mechanicDefsFor(pack, monster), def.name, pushLog);
  }
  if (def.guardMult && def.durationMs) {
    enc.braceUntil = atMs + Math.round(def.durationMs * mult);
    pushLog(enc, `${def.name}！${Math.round(def.durationMs / 1000)} 秒内受伤 -${Math.round((1 - def.guardMult) * 100)}%`);
  }
  grantAbilityXp(player, def.id, CAST_XP);
}

/** Whether a slot may fire at `atMs`: learned, off cooldown, affordable, trigger met. */
function slotCanFire(
  player: EnhancedPlayerState,
  enc: HpCombatState,
  slot: { abilityId: string; trigger: import("./types").AbilityTrigger },
  atMs: number
): AbilityDef | undefined {
  const def = ABILITY_BY_ID[slot.abilityId];
  if (!def) return undefined;
  if (abilityReadyAt(enc, def.id) > atMs) return undefined;
  if (def.mpCost > (enc.playerMp || 0)) return undefined;
  if (def.healPct && enc.playerHp >= enc.playerMaxHp) return undefined;
  if (def.guardMult && (enc.braceUntil || 0) > atMs) return undefined;
  if (!triggerSatisfied(slot.trigger, enc)) return undefined;
  return def;
}

/** MWI: equipped abilities fire left to right whenever ready and their trigger holds. */
function autoCast(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, atMs: number, monster: Record<string, unknown>) {
  for (const slot of activeAbilitySlots(player)) {
    if (enc.enemyHp <= 0 || enc.playerHp <= 0) return;
    const def = slotCanFire(player, enc, slot, atMs);
    if (def) castAbility(player, pack, enc, def, atMs, monster);
  }
}

/** Soonest future cooldown end among equipped slots, so the loop wakes exactly when one is ready. */
function nextAbilityWake(player: EnhancedPlayerState, enc: HpCombatState, atMs: number): number {
  let next = Infinity;
  for (const slot of activeAbilitySlots(player)) {
    const ready = abilityReadyAt(enc, slot.abilityId);
    if (ready > atMs) next = Math.min(next, ready - atMs);
  }
  return next;
}

/** Enrage stacks the fight should have at `atMs`; logs the moment a new stack lands. */
function updateEnrage(enc: HpCombatState, monster: Record<string, unknown>, atMs: number) {
  const isBoss = Boolean(monster.isBoss) || String(monster.id || "").endsWith("_boss");
  const interval = isBoss ? BOSS_ENRAGE_INTERVAL_MS : ENRAGE_INTERVAL_MS;
  const elapsed = Math.max(0, atMs - (enc.startedAt ?? atMs));
  const stacks = Math.min(ENRAGE_MAX_STACKS, Math.floor(elapsed / interval));
  if (stacks > (enc.enrageStacks || 0)) {
    enc.enrageStacks = stacks;
    pushLog(enc, `${enc.monsterName} 狂暴了！伤害 +${stacks * 10}%（战斗拖得越久越危险）`);
  }
}

/** Keep the last 24 lines: enough for a whole boss fight (phase lines were scrolling off at 9). */
function pushLog(enc: HpCombatState, line: string) {
  enc.log = [...enc.log.slice(-23), line];
}

/** Advance the monster's HP-threshold mechanics (guard / wrath, see boss_mechanics.ts). */
function maybePhases(enc: HpCombatState, monster: Record<string, unknown>, pack: EnhancedContentPack) {
  advancePhases(enc, mechanicDefsFor(pack, monster), pushLog);
}

/** Resolve a monster's advertised rare drop (`rare` may be an item id or a display name). */
export function rareDropFor(
  pack: EnhancedContentPack,
  monster: Record<string, unknown>
): { itemId: string; name: string; chance: number } | undefined {
  const rare = typeof monster.rare === "string" ? monster.rare : "";
  const chance = Number(monster.rareChance || 0);
  if (!rare || !(chance > 0)) return undefined;
  const items = (pack.items || []) as Array<{ id: string; name?: string }>;
  const item = items.find((i) => i.id === rare) || items.find((i) => i.name === rare);
  if (!item) return undefined;
  return { itemId: item.id, name: item.name || item.id, chance: Math.min(1, chance) };
}

/** Additional drop table on a monster (`drops: [{ itemId, chance, qty? }]`), resolved against the pack. */
export function dropTableFor(
  pack: EnhancedContentPack,
  monster: Record<string, unknown>
): Array<{ itemId: string; name: string; chance: number; qty: number }> {
  const raw = Array.isArray(monster.drops) ? (monster.drops as Array<Record<string, unknown>>) : [];
  const items = (pack.items || []) as Array<{ id: string; name?: string }>;
  const out: Array<{ itemId: string; name: string; chance: number; qty: number }> = [];
  for (const d of raw) {
    const item = items.find((i) => i.id === d.itemId);
    const chance = Number(d.chance || 0);
    if (!item || !(chance > 0)) continue;
    out.push({ itemId: item.id, name: item.name || item.id, chance: Math.min(1, chance), qty: Math.max(1, Math.floor(Number(d.qty) || 1)) });
  }
  return out;
}

/**
 * 战斗磨损：每次分出胜负，身上每件战斗装备 -0.2 耐久；战败额外 -0.3。
 * 与幽灵槽同规则——耐久归零后该件不再提供属性（见 storage.isDurabilityBroken）。
 */
const GEAR_WEAR_PER_FIGHT = 0.2;
const GEAR_WEAR_ON_DEATH_EXTRA = 0.3;
function wearCombatGear(player: EnhancedPlayerState, extra: number) {
  const eq = (player as { equipment?: Record<string, unknown> }).equipment;
  if (!eq) return;
  const wearMul = player.activeClassId === "blacksmith" ? 0.6 : 1;
  const wearAmount = Math.round((GEAR_WEAR_PER_FIGHT + extra) * wearMul * 100) / 100;
  for (const [slot, itemId] of Object.entries(eq)) {
    if (!itemId || typeof itemId !== "string") continue;
    if (slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability" || slot === "tool") continue;
    if ((player.inventory?.[itemId] || 0) <= 0) continue;
    applyDurabilityWear(player, itemId, wearAmount);
  }
}

function grantWin(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  enc: HpCombatState,
  rng: () => number = Math.random
) {
  if (enc.rewardsGranted) return;
  enc.rewardsGranted = true;
  wearCombatGear(player, 0);
  const m = monsterById(pack, enc.monsterId);
  const buffEff = getBuffEffects(player, new Date(enc.startedAt || Date.now()));
  const repBuffs = getReputationBonuses(player);
  const prestigeMul = getPrestigeMultiplier(player);
  const isForestMonster = ["slime", "caterpillar", "monkey", "mushroom", "bee", "crab", "forest_boss"].includes(enc.monsterId);
  const goldMul = (player.activeClassId === "woodcutter" && player.settings?.characterCreated && isForestMonster ? 1.15 : 1) * (buffEff.goldGain || 1) * repBuffs.goldGain * prestigeMul;
  const gold = Math.round(Number(m.gold || 0) * goldMul);
  // MWI house: 训练场 adds +1% combat XP per level.
  const trainingLevel = houseLevelForSkill(player, "skill_combat");
  const xp = Math.round(Number(m.xp || 0) * (1 + trainingLevel * HOUSE_XP_PER_LEVEL) * (buffEff.xpGain || 1) * repBuffs.xpGain * prestigeMul * 10) / 10;
  player.inventory.gold = (player.inventory.gold || 0) + gold;
  const rare = rareDropFor(pack, m);
  enc.drops = [];
  const rareFind = getRareFindMultiplier(player, pack);
  const rareChance = rare ? Math.min(1, rare.chance * rareFind) : 0;
  if (rare && rng() < rareChance) {
    player.inventory[rare.itemId] = (player.inventory[rare.itemId] || 0) + 1;
    enc.drops.push({ itemId: rare.itemId, name: rare.name, qty: 1 });
  }
  // MWI-style drop table (ability books, essences …): each entry rolls independently, rare-find applies.
  for (const d of dropTableFor(pack, m)) {
    if (rng() < Math.min(1, d.chance * rareFind)) {
      player.inventory[d.itemId] = (player.inventory[d.itemId] || 0) + d.qty;
      enc.drops.push({ itemId: d.itemId, name: d.name, qty: d.qty });
    }
  }
  // MWI 30 / 70 split across the combat skills; 战斗等级 is derived from them.
  const grant = grantCombatXp(player, xp, pack);
  enc.xpGained = { ...grant.gained };
  player.combatXp = (player.combatXp || 0) + xp;
  for (const up of grant.levelUps) pushLog(enc, `${COMBAT_SKILL_NAMES[up.skill]}升到 ${up.level} 级！`);
  const stats = player.stats;
  if (stats) {
    stats.totalKills += 1;
    stats.totalActions += 1;
    stats.totalGoldEarned += gold;
    stats.totalXpEarned += xp;
    stats.killsByMonster[enc.monsterId] = (stats.killsByMonster[enc.monsterId] || 0) + 1;
    if (Boolean(m.isBoss) || String(enc.monsterId).endsWith("_boss")) stats.totalBossKills += 1;
  }
  const dropText = enc.drops.length ? `，掉落 ${enc.drops.map((d) => `${d.name} ×${d.qty}`).join("、")}` : "";
  appendLog(player, `击败 ${enc.monsterName}，获得 ${xp} 战斗经验、${gold} 金币${dropText}`);
  if (dropText) pushLog(enc, `掉落：${enc.drops.map((d) => `${d.name} ×${d.qty}`).join("、")}`);
  // Run tally (MWI battle statistics): survives the auto-repeat hand-off in tickHpCombat.
  if (!enc.runStats) enc.runStats = { startedAt: enc.startedAt || Date.now(), kills: 0, xp: 0, gold: 0, loot: {} };
  enc.runStats.kills += 1;
  enc.runStats.xp = Math.round((enc.runStats.xp + xp) * 10) / 10;
  enc.runStats.gold += gold;
  for (const d of enc.drops) enc.runStats.loot[d.itemId] = (enc.runStats.loot[d.itemId] || 0) + d.qty;
  syncAchievements(player);
}

/** Offline catch-up cap: at most this many auto-repeated fights per settle (next poll continues). */
const MAX_AUTO_FIGHTS_PER_TICK = 200;

export function tickHpCombat(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  now: Date,
  elapsedMs: number,
  rng: () => number = Math.random
): number {
  if (!player.hpCombat || elapsedMs <= 0) return now.getTime();
  let windowStart = now.getTime() - elapsedMs;
  for (let fights = 0; fights < MAX_AUTO_FIGHTS_PER_TICK; fights++) {
    const enc = player.hpCombat;
    if (!enc) return now.getTime();
    if (enc.outcome) {
      // Auto-repeat: a finished fight restarts against the same monster once the intermission
      // (win) or the respawn timer (loss) has passed.
      const canRepeat = player.combatLoadout?.autoRepeat && enc.nextFightAt && now.getTime() >= enc.nextFightAt;
      if (!canRepeat) return now.getTime();
      const startAt = new Date(enc.nextFightAt!);
      const streak = enc.outcome === "win" ? (enc.streak || 0) + 1 : 0;
      const deaths = enc.deaths || 0;
      // When the client is actively polling across an intermission boundary, return the newly
      // spawned encounter at 100% full HP (matching POST /combat/hp/start) before ticking
      // opening auto-cast skills, so the monster always starts at full health in the UI.
      const isLiveSpawn = fights === 0 && elapsedMs <= 5000 && now.getTime() - startAt.getTime() < 2500;
      player.hpCombat = startHpCombat(player, pack, enc.monsterId, startAt, {
        streak,
        deaths,
        lossStreak: enc.outcome === "loss" ? enc.lossStreak || 0 : 0,
        runStats: enc.runStats,
      });
      pushLog(player.hpCombat, enc.outcome === "win" ? `连续战斗 · 第 ${streak + 1} 场` : `重生完毕，重新挑战 ${enc.monsterName}（本轮已阵亡 ${deaths} 次）`);
      if (isLiveSpawn) {
        return startAt.getTime();
      }
      windowStart = startAt.getTime();
      continue;
    }
    windowStart = tickOneFight(player, pack, enc, windowStart, now, rng);
    if (windowStart >= now.getTime()) return now.getTime();
  }
  return windowStart;
}

function tickOneFight(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  enc: HpCombatState,
  windowStartMs: number,
  now: Date,
  rng: () => number
): number {
  const monster = monsterById(pack, enc.monsterId);
  const mechDefs = mechanicDefsFor(pack, monster);
  maybePhases(enc, monster, pack);

  const enemy = monsterCombatant(monster);
  // Saves from before mana existed start the pool full.
  if (enc.playerMaxMp === undefined) {
    const pc0 = playerCombatant(player, pack, playerExtras(player, new Date(windowStartMs), pack));
    enc.playerMaxMp = pc0.mp || 0;
    enc.playerMp = enc.playerMaxMp;
  }
  if (enc.startedAt === undefined) enc.startedAt = windowStartMs;
  let simMs = windowStartMs;
  let remaining = Math.min(now.getTime() - windowStartMs, 120_000);
  while (enc.playerHp > 0 && enc.enemyHp > 0 && remaining > 0) {
    // Consumables first: drink keeps its buff up, food heals when the trigger is met, MP potion restores mana.
    maybeDrink(player, pack, enc, new Date(simMs));
    maybeEat(player, pack, enc, simMs, mechDefs);
    maybeDrinkMp(player, pack, enc, simMs);
    // Abilities fire by trigger before the next swing (MWI casts are independent of auto-attack).
    autoCast(player, pack, enc, simMs, monster);
    if (enc.enemyHp <= 0) break;
    // Buff stats may have changed after drinking, so rebuild the attacker each step.
    const pc = playerCombatant(player, pack, playerExtras(player, new Date(simMs), pack));
    const playerAtk = { ...pc, intervalMs: enc.playerIntervalMs };

    const toP = enc.playerIntervalMs - enc.playerCooldownMs;
    const toE = enc.enemyIntervalMs - enc.enemyCooldownMs;
    const toA = nextAbilityWake(player, enc, simMs);
    const toM = nextMechanicEventAt(enc, mechDefs) - simMs;
    const step = Math.max(1, Math.min(toP, toE, toA, toM, remaining));
    remaining -= step;
    simMs += step;
    enc.playerCooldownMs += step;
    enc.enemyCooldownMs += step;
    const braceNow = (enc.braceUntil || 0) > simMs ? (ABILITY_BY_ID.brace?.guardMult ?? 1) : 1;
    // Timed mechanics that change the board (frost armour up/down, eruption warning) land before the swings.
    runMechanicEvents(enc, mechDefs, simMs, "state", braceNow, pushLog);
    const enemyAtk = {
      ...enemy,
      intervalMs: enc.enemyIntervalMs,
      incomingDamageMult: enc.guardActive ? guardIncomingMult(mechDefs) ?? 1 : enemy.incomingDamageMult,
    };

    if (enc.playerCooldownMs >= enc.playerIntervalMs) {
      const dmg = hitDamage(playerAtk, enemyAtk);
      enc.enemyHp = Math.max(0, enc.enemyHp - dmg);
      enc.playerCooldownMs = 0;
      enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + (pc.mpRegenPerTick || 1));
      pushLog(enc, `普通攻击造成 ${dmg} 伤害`);
      maybePhases(enc, monster, pack);
    }
    if (enc.enemyHp <= 0) break;
    if (enc.enemyCooldownMs >= enc.enemyIntervalMs) {
      // Enrage is read at the moment the hit lands, so results do not depend on poll granularity.
      updateEnrage(enc, monster, simMs);
      const enraged = enemy.outgoingDamageMult * (1 + (enc.enrageStacks || 0) * ENRAGE_STEP);
      const braced = (enc.braceUntil || 0) > simMs ? (ABILITY_BY_ID.brace?.guardMult ?? 1) : 1;
      const hitNumber = (enc.bossHits || 0) + 1;
      enc.bossHits = hitNumber;
      const baseHit = hitDamage({ ...enemyAtk, outgoingDamageMult: enraged, incomingDamageMult: 1 }, { ...playerAtk, incomingDamageMult: 1 });
      // A charged attack (e.g. rockfall) hits for a share of max HP and is never weaker than a normal swing.
      const charged = chargedHit(mechDefs, hitNumber, enc.playerMaxHp);
      const dmg = Math.max(1, Math.floor((charged ? Math.max(baseHit, charged.damage) : baseHit) * braced));
      enc.playerHp = Math.max(0, enc.playerHp - dmg);
      enc.enemyCooldownMs = 0;
      pushLog(enc, `${enc.monsterName} 造成 ${dmg} 伤害${braced < 1 ? "（坚守中）" : ""}${charged ? `（${charged.label}）` : ""}`);
      const warning = chargeTelegraph(mechDefs, hitNumber);
      if (warning) pushLog(enc, warning);
      onBossHit(enc, mechDefs);
    }
    // Timed damage (miasma tick, eruption) resolves after the swings of the same instant.
    if (enc.playerHp > 0) runMechanicEvents(enc, mechDefs, simMs, "damage", braceNow, pushLog);
  }

  if (enc.enemyHp <= 0 && enc.playerHp > 0) {
    enc.outcome = "win";
    pushLog(enc, `${enc.monsterName} 被击败了！`);
    grantWin(player, pack, enc, rng);
    // Surviving HP carries into the next fight; intermission time still counts toward regen.
    persistCombatHp(player, enc.playerHp, simMs);
    if (player.combatLoadout?.autoRepeat) enc.nextFightAt = simMs + AUTO_REPEAT_INTERMISSION_MS;
  } else if (enc.playerHp <= 0) {
    enc.outcome = "loss";
    enc.deaths = (enc.deaths || 0) + 1;
    wearCombatGear(player, GEAR_WEAR_ON_DEATH_EXTRA);
    if (player.stats) player.stats.totalDeaths = (player.stats.totalDeaths || 0) + 1;
    // Respawn heals to full — persisting 0 would soft-lock the auto-repeat loop.
    persistCombatHp(player, enc.playerMaxHp, simMs);
    enc.lossStreak = (enc.lossStreak || 0) + 1;
    if (player.combatLoadout?.autoRepeat && enc.lossStreak >= AUTO_REPEAT_MAX_CONSECUTIVE_DEATHS) {
      // Death-spiral guard: stop instead of feeding gear durability to a monster that keeps winning.
      player.combatLoadout.autoRepeat = false;
      enc.nextFightAt = undefined;
      pushLog(enc, `连续阵亡 ${enc.lossStreak} 次，已自动关闭连续战斗以保护装备耐久。检查装备、技能和补给，或换个更弱的对手。`);
      appendLog(player, `在 ${enc.monsterName} 面前连续阵亡 ${enc.lossStreak} 次，连续战斗已自动关闭`);
    } else if (player.combatLoadout?.autoRepeat) {
      enc.nextFightAt = simMs + RESPAWN_MS;
      pushLog(enc, `你被击败了。${Math.round(RESPAWN_MS / 1000)} 秒后重生并继续连续战斗（在配置里可以关掉；连续阵亡 ${AUTO_REPEAT_MAX_CONSECUTIVE_DEATHS} 次会自动停止）。`);
    } else {
      pushLog(enc, "你被击败了。检查装备、技能触发和补给，再选择适合的对手。");
    }
  }
  return simMs;
}

/**
 * Manual cast from the client. Any learned ability may be cast by hand (MWI lets you override the
 * trigger with a click); cooldown and mana are still the server's call.
 */
export function tryCastAbility(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  abilityId: string,
  now: Date,
  rng: () => number = Math.random
): { ok: boolean; error?: string } {
  const enc = player.hpCombat;
  if (!enc || enc.outcome) return { ok: false, error: "not_in_combat" };
  const def = ABILITY_BY_ID[abilityId];
  if (!def || !ensureAbilities(player)[abilityId]) return { ok: false, error: "unknown_ability" };
  if (now.getTime() < abilityReadyAt(enc, abilityId)) return { ok: false, error: "cooldown" };
  if (enc.playerMaxMp === undefined) {
    const pc0 = playerCombatant(player, pack, playerExtras(player, now, pack));
    enc.playerMaxMp = pc0.mp || 0;
    enc.playerMp = enc.playerMaxMp;
  }
  if (def.mpCost > (enc.playerMp || 0)) return { ok: false, error: "no_mana" };
  if (def.healPct && enc.playerHp >= enc.playerMaxHp) return { ok: false, error: "full_hp" };

  const monster = monsterById(pack, enc.monsterId);
  castAbility(player, pack, enc, def, now.getTime(), monster);
  if (enc.enemyHp <= 0 && enc.playerHp > 0) {
    enc.outcome = "win";
    pushLog(enc, `${enc.monsterName} 被击败了！`);
    grantWin(player, pack, enc, rng);
    persistCombatHp(player, enc.playerHp, now.getTime());
    if (player.combatLoadout?.autoRepeat) enc.nextFightAt = now.getTime() + AUTO_REPEAT_INTERMISSION_MS;
  }
  return { ok: true };
}

export function tryHeavyChop(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  now: Date,
  rng: () => number = Math.random
): { ok: boolean; error?: string } {
  return tryCastAbility(player, pack, "heavy_chop", now, rng);
}

/** Validate + store the combat loadout (food/drink/mp slots, auto-repeat). */
export function setCombatLoadout(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  input: {
    food?: Array<{ itemId: string; triggerMissingHp?: number }>;
    drink?: Array<{ itemId: string; triggerMissingMp?: number }>;
    mp?: Array<{ itemId: string; triggerMissingMp?: number }>;
    autoRepeat?: boolean;
  },
  now?: Date
): { ok: boolean; error?: string } {
  const items = pack.items as any[];
  const isConsumable = (id: string) => {
    const d = items.find((i) => i.id === id);
    return d && (d.type === "consumable" || d.type === "food");
  };
  const counts = combatSlotCounts(player, pack);
  // 超出槽位的输入直接拒绝而不是静默截断——槽位 0 的玩家塞食物曾被"成功"吞掉，看起来像坏了
  if ((input.food?.length || 0) > counts.food) return { ok: false, error: `slot_limit_food:${counts.food}` };
  if ((input.drink?.length || 0) > MAX_SLOTS_CAP) return { ok: false, error: `slot_limit_drink:${MAX_SLOTS_CAP}` };
  if ((input.mp?.length || 0) > MAX_SLOTS_CAP) return { ok: false, error: `slot_limit_mp:${MAX_SLOTS_CAP}` };
  const rawFood = input.food !== undefined ? input.food : (player.combatLoadout?.food || []);
  const rawDrink = input.drink !== undefined ? input.drink : (player.combatLoadout?.drink || []);
  const food = rawFood.filter((f) => f && f.itemId);
  for (const f of food) {
    const d = items.find((i) => i.id === f.itemId);
    if (!isConsumable(f.itemId) || !(Number(d?.effect?.hp) > 0)) return { ok: false, error: `not_food:${f.itemId}` };
  }
  const drink = rawDrink.filter((d) => d && d.itemId);
  for (const d of drink) {
    const def = items.find((i) => i.id === d.itemId);
    if (!isConsumable(d.itemId) || (!def?.effect?.buff && !(Number(def?.effect?.mp) > 0))) {
      return { ok: false, error: `not_drink:${d.itemId}` };
    }
  }
  const mp = (input.mp || []).filter((m) => m && m.itemId);
  for (const m of mp) {
    const def = items.find((i) => i.id === m.itemId);
    if (!isConsumable(m.itemId) || !(Number(def?.effect?.mp) > 0)) {
      return { ok: false, error: `not_mp:${m.itemId}` };
    }
  }
  // 触发阈值封顶当前最大生命：填 10000 的血条上限是 50 的玩家等于永远触发不了，
  // 之前静默接受让配装看起来"装了但不吃饭"。
  const pc = playerCombatant(player, pack, playerExtras(player, now ?? new Date(), pack));
  const maxHp = pc.hp;
  const maxMp = Math.max(10, pc.mp || 50);
  const nextLoadout: NonNullable<EnhancedPlayerState["combatLoadout"]> = {
    food: food.map((f) => ({
      itemId: f.itemId,
      triggerMissingHp: Math.min(maxHp, Math.max(1, Math.floor(Number(f.triggerMissingHp) || 1))),
    })),
    drink: drink.map((d) =>
      d.triggerMissingMp !== undefined
        ? { itemId: d.itemId, triggerMissingMp: Math.min(maxMp, Math.max(1, Math.floor(Number(d.triggerMissingMp) || 1))) }
        : { itemId: d.itemId }
    ),
    autoRepeat: input.autoRepeat !== undefined ? !!input.autoRepeat : Boolean(player.combatLoadout?.autoRepeat),
  };
  if (mp.length > 0) {
    nextLoadout.mp = mp.map((m) => ({
      itemId: m.itemId,
      triggerMissingMp: Math.min(maxMp, Math.max(1, Math.floor(Number(m.triggerMissingMp) || Math.floor(maxMp * 0.4)))),
    }));
  } else if (input.mp === undefined && player.combatLoadout?.mp?.length) {
    nextLoadout.mp = player.combatLoadout.mp;
  }
  player.combatLoadout = nextLoadout;
  // 战后补开连续战斗：已结算的场次不会自带 nextFightAt，补一个计时器让下一场自动开始。
  // 否则玩家在胜利界面打开开关后仍要手动再点一次怪物——开关看起来像坏的。
  if (player.combatLoadout.autoRepeat && player.hpCombat?.outcome && !player.hpCombat.nextFightAt) {
    const base = (now ?? new Date()).getTime();
    player.hpCombat.nextFightAt = base + (player.hpCombat.outcome === "loss" ? RESPAWN_MS : AUTO_REPEAT_INTERMISSION_MS);
    // Re-enabling is an explicit "try again": give back the full defeat allowance.
    player.hpCombat.lossStreak = 0;
  }
  return { ok: true };
}

export function chooseBuild(
  player: EnhancedPlayerState,
  id: "sharpened_edge" | "thick_bark"
): { ok: boolean; error?: string } {
  if (player.chapter1Build) return { ok: false, error: "already_chosen" };
  player.chapter1Build = id;
  appendLog(player, id === "sharpened_edge" ? "你选择了开刃：攻击提升。" : "你选择了厚树皮：生命与防御提升。");
  return { ok: true };
}
