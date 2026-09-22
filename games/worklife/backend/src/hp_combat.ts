import type { EnhancedContentPack, EnhancedPlayerState, HpCombatState } from "./types";
import { appendLog, getBuffEffects, getRareFindMultiplier } from "./storage";
import { hitDamage, monsterCombatant, playerCombatant } from "./first_hour_combat";
import { e2eFastCombatInterval, e2eFastHeavyChopCdMs } from "./e2e_fast";
import { consumeItem } from "./systems";
import { COMBAT_SKILL_NAMES, grantCombatXp } from "./combat_skills";
import { HOUSE_XP_PER_LEVEL, houseLevelForSkill } from "./houses";
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
/** Pause between auto-repeated fights so the victory panel is readable. */
export const AUTO_REPEAT_INTERMISSION_MS = 3000;
/** MWI: a defeat costs a respawn timer, then the run continues automatically. */
export const RESPAWN_MS = 30_000;
/** Base slots; pouch accessories add more (MWI: 1 base, up to 3). */
export const BASE_FOOD_SLOTS = 1;
export const BASE_DRINK_SLOTS = 1;
export const MAX_SLOTS_CAP = 3;

export function combatSlotCounts(player: EnhancedPlayerState, pack: EnhancedContentPack): { food: number; drink: number } {
  const eq = (player.equipment || {}) as Record<string, unknown>;
  const items = pack.items as any[];
  let food = BASE_FOOD_SLOTS;
  let drink = BASE_DRINK_SLOTS;
  for (const [slot, itemId] of Object.entries(eq)) {
    if (typeof itemId !== "string" || slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
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
export const GUARD_RATIO = 0.6;
/** The boss telegraphs the guard a little before it lands so a player can hold Heavy Chop. */
export const GUARD_TELEGRAPH_RATIO = 0.66;
export const WRATH_RATIO = 0.3;
export const GUARD_INCOMING = 0.45;
export const WRATH_INTERVAL_MULT = 0.6;

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

/** Build extras + active buff stats (狂战药剂 atk etc.) so drinks matter in HP combat. */
function playerExtras(player: EnhancedPlayerState, now: Date) {
  const build = buildExtras(player.chapter1Build);
  const buffs = getBuffEffects(player, now);
  return { atk: build.atk + (buffs.atk || 0), hp: build.hp, def: build.def + (buffs.def || 0) };
}

/**
 * Drink slot: re-apply the drink whenever its buff is not active (MWI drinks tick down and get
 * re-drunk automatically). Called at fight start and at each simulated step.
 */
function maybeDrink(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, now: Date) {
  const slots = player.combatLoadout?.drink || [];
  for (const slot of slots.slice(0, combatSlotCounts(player, pack).drink)) {
    if (!slot?.itemId) continue;
    if ((player.inventory[slot.itemId] || 0) < 1) continue;
    const def = (pack.items as any[]).find((i) => i.id === slot.itemId);
    const buffId = def?.effect?.buff?.id;
    if (!buffId) continue;
    const active = (player.activeBuffs || []).some((b) => b.id === buffId && Date.parse(b.expiresAt) > now.getTime());
    if (active) continue;
    const res = consumeItem(player, pack, slot.itemId, now);
    if (res.ok) recordConsumed(enc, slot.itemId, res.itemName);
  }
}

/** Food slot: eat when missing HP reaches the trigger and the slot cooldown is over. */
function maybeEat(player: EnhancedPlayerState, pack: EnhancedContentPack, enc: HpCombatState, atMs: number) {
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
    enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + heal);
    enc.foodReadyAt![i] = atMs + FOOD_COOLDOWN_MS;
    recordConsumed(enc, slot.itemId, res.itemName);
    pushLog(enc, `吃了 ${res.itemName}，恢复 ${heal} 生命`);
  });
}

function recordConsumed(enc: HpCombatState, itemId: string, name: string) {
  if (!enc.consumed) enc.consumed = [];
  const row = enc.consumed.find((c) => c.itemId === itemId);
  if (row) row.qty += 1;
  else enc.consumed.push({ itemId, name, qty: 1 });
}

export function startHpCombat(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  monsterId: string,
  now: Date,
  opts: { streak?: number; deaths?: number; runStats?: HpCombatState["runStats"] } = {}
): HpCombatState {
  const m = monsterById(pack, monsterId);
  const enemy = monsterCombatant(m);
  ensureAbilities(player);
  // Drink before rolling max HP / atk so the buff counts from the first swing.
  const pre: HpCombatState = { monsterId, monsterName: enemy.name, playerHp: 0, playerMaxHp: 0, enemyHp: 0, enemyMaxHp: 0, playerIntervalMs: 0, enemyIntervalMs: 0, enemyBaseIntervalMs: 0, playerCooldownMs: 0, enemyCooldownMs: 0, heavyChopReadyAt: 0, guardActive: false, wrathActive: false, log: [] };
  maybeDrink(player, pack, pre, now);
  const extras = playerExtras(player, now);
  const pc = playerCombatant(player, pack, extras);
  const state: HpCombatState = {
    monsterId,
    monsterName: enemy.name,
    playerHp: pc.hp,
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
    log: [`开始战斗！伐木工 VS ${enemy.name}`],
    consumed: pre.consumed,
    streak: opts.streak || 0,
    deaths: opts.deaths || 0,
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
    const pc = playerCombatant(player, pack, playerExtras(player, new Date(atMs)));
    const enemy = monsterCombatant(monster);
    const guardBefore = enc.guardActive;
    // 重劈 ignores the shield; other strikes hit the guarded (reduced) value.
    const incoming = guardBefore ? (def.breaksGuard ? 1 : GUARD_INCOMING) : enemy.incomingDamageMult;
    const dmg = Math.max(1, Math.floor(hitDamage(pc, { ...enemy, incomingDamageMult: incoming }) * def.damageMult * mult));
    enc.enemyHp = Math.max(0, enc.enemyHp - dmg);
    if (def.breaksGuard && guardBefore) {
      enc.guardActive = false;
      pushLog(enc, `${def.name}破防！造成 ${dmg} 伤害`);
    } else {
      pushLog(enc, `${def.name}造成 ${dmg} 伤害`);
    }
    maybePhases(enc, monster);
    // A guard-breaker that pushes the boss through the guard threshold shatters the shield it just
    // raised; the player is not punished with a guard phase while sitting on cooldown.
    if (def.breaksGuard && !guardBefore && enc.guardActive) {
      enc.guardActive = false;
      pushLog(enc, `${def.name}震碎了刚举起的树皮盾！`);
    }
  }
  if (def.healPct) {
    const heal = Math.max(1, Math.floor(enc.playerMaxHp * def.healPct * mult));
    const before = enc.playerHp;
    enc.playerHp = Math.min(enc.playerMaxHp, enc.playerHp + heal);
    pushLog(enc, `${def.name}恢复 ${enc.playerHp - before} 生命`);
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

function maybePhases(enc: HpCombatState, monster: Record<string, unknown>) {
  const mechanics = Array.isArray(monster.mechanics)
    ? monster.mechanics.map((mechanic) => String(mechanic))
    : [];
  const hasGuard = mechanics.includes("guard_60");
  const hasWrath = mechanics.includes("nature_wrath_30");

  // Self-heal encounters persisted before phase mechanics were scoped to the
  // Forest Boss. Ordinary monsters must never inherit boss-only state.
  if (!hasGuard) {
    enc.guardActive = false;
    enc.guardUsed = false;
  }
  if (!hasWrath) {
    enc.wrathActive = false;
    enc.enemyIntervalMs = enc.enemyBaseIntervalMs;
  }

  const ratio = enc.enemyHp / enc.enemyMaxHp;
  if (hasGuard && !enc.guardUsed && !enc.guardTelegraphed && ratio <= GUARD_TELEGRAPH_RATIO && ratio > GUARD_RATIO) {
    enc.guardTelegraphed = true;
    pushLog(enc, "管家在蓄力举盾……留一记重劈！");
  }
  if (hasGuard && !enc.guardUsed && !enc.wrathActive && ratio <= GUARD_RATIO && ratio > WRATH_RATIO) {
    enc.guardActive = true;
    enc.guardUsed = true;
    pushLog(enc, "森林管家举起树皮盾！格挡中——用重劈破防！");
  }
  if (hasWrath && !enc.wrathActive && ratio <= WRATH_RATIO) {
    enc.wrathActive = true;
    enc.guardActive = false;
    enc.enemyIntervalMs = Math.max(800, Math.floor(enc.enemyBaseIntervalMs * WRATH_INTERVAL_MULT));
    pushLog(enc, "自然之怒！管家的攻击变得更快了！");
  }
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

function grantWin(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  enc: HpCombatState,
  rng: () => number = Math.random
) {
  if (enc.rewardsGranted) return;
  enc.rewardsGranted = true;
  const m = monsterById(pack, enc.monsterId);
  const gold = Number(m.gold || 0);
  // MWI house: 训练场 adds +1% combat XP per level.
  const trainingLevel = houseLevelForSkill(player, "skill_combat");
  const xp = Math.round(Number(m.xp || 0) * (1 + trainingLevel * HOUSE_XP_PER_LEVEL) * 10) / 10;
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
      const deaths = (enc.deaths || 0) + (enc.outcome === "loss" ? 1 : 0);
      player.hpCombat = startHpCombat(player, pack, enc.monsterId, startAt, { streak, deaths, runStats: enc.runStats });
      pushLog(player.hpCombat, enc.outcome === "win" ? `连续战斗 · 第 ${streak + 1} 场` : `重生完毕，重新挑战 ${enc.monsterName}（本轮已阵亡 ${deaths} 次）`);
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
  maybePhases(enc, monster);

  const enemy = monsterCombatant(monster);
  // Saves from before mana existed start the pool full.
  if (enc.playerMaxMp === undefined) {
    const pc0 = playerCombatant(player, pack, playerExtras(player, new Date(windowStartMs)));
    enc.playerMaxMp = pc0.mp || 0;
    enc.playerMp = enc.playerMaxMp;
  }
  let simMs = windowStartMs;
  let remaining = Math.min(now.getTime() - windowStartMs, 60_000);
  while (enc.playerHp > 0 && enc.enemyHp > 0 && remaining > 0) {
    // Consumables first: drink keeps its buff up, food heals when the trigger is met.
    maybeDrink(player, pack, enc, new Date(simMs));
    maybeEat(player, pack, enc, simMs);
    // Abilities fire by trigger before the next swing (MWI casts are independent of auto-attack).
    autoCast(player, pack, enc, simMs, monster);
    if (enc.enemyHp <= 0) break;
    // Buff stats may have changed after drinking, so rebuild the attacker each step.
    const pc = playerCombatant(player, pack, playerExtras(player, new Date(simMs)));
    const playerAtk = { ...pc, intervalMs: enc.playerIntervalMs };
    const enemyAtk = {
      ...enemy,
      intervalMs: enc.enemyIntervalMs,
      incomingDamageMult: enc.guardActive ? GUARD_INCOMING : enemy.incomingDamageMult,
    };

    const toP = enc.playerIntervalMs - enc.playerCooldownMs;
    const toE = enc.enemyIntervalMs - enc.enemyCooldownMs;
    const toA = nextAbilityWake(player, enc, simMs);
    const step = Math.max(1, Math.min(toP, toE, toA, remaining));
    remaining -= step;
    simMs += step;
    enc.playerCooldownMs += step;
    enc.enemyCooldownMs += step;

    if (enc.playerCooldownMs >= enc.playerIntervalMs) {
      const dmg = hitDamage(playerAtk, enemyAtk);
      enc.enemyHp = Math.max(0, enc.enemyHp - dmg);
      enc.playerCooldownMs = 0;
      enc.playerMp = Math.min(enc.playerMaxMp || 0, (enc.playerMp || 0) + (pc.mpRegenPerTick || 1));
      pushLog(enc, `普通攻击造成 ${dmg} 伤害`);
      maybePhases(enc, monster);
    }
    if (enc.enemyHp <= 0) break;
    if (enc.enemyCooldownMs >= enc.enemyIntervalMs) {
      // Enrage is read at the moment the hit lands, so results do not depend on poll granularity.
      updateEnrage(enc, monster, simMs);
      const enraged = enemy.outgoingDamageMult * (1 + (enc.enrageStacks || 0) * ENRAGE_STEP);
      const braced = (enc.braceUntil || 0) > simMs ? (ABILITY_BY_ID.brace?.guardMult ?? 1) : 1;
      const dmg = Math.max(
        1,
        Math.floor(
          hitDamage({ ...enemyAtk, outgoingDamageMult: enraged, incomingDamageMult: 1 }, { ...playerAtk, incomingDamageMult: 1 }) * braced
        )
      );
      enc.playerHp = Math.max(0, enc.playerHp - dmg);
      enc.enemyCooldownMs = 0;
      pushLog(enc, `${enc.monsterName} 造成 ${dmg} 伤害${braced < 1 ? "（坚守中）" : ""}`);
    }
  }

  if (enc.enemyHp <= 0 && enc.playerHp > 0) {
    enc.outcome = "win";
    pushLog(enc, `${enc.monsterName} 被击败了！`);
    grantWin(player, pack, enc, rng);
    if (player.combatLoadout?.autoRepeat) enc.nextFightAt = simMs + AUTO_REPEAT_INTERMISSION_MS;
  } else if (enc.playerHp <= 0) {
    enc.outcome = "loss";
    if (player.stats) player.stats.totalDeaths = (player.stats.totalDeaths || 0) + 1;
    if (player.combatLoadout?.autoRepeat) {
      enc.nextFightAt = simMs + RESPAWN_MS;
      pushLog(enc, `你被击败了。${Math.round(RESPAWN_MS / 1000)} 秒后重生并继续连续战斗（在配置里可以关掉）。`);
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
    const pc0 = playerCombatant(player, pack, playerExtras(player, now));
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

/** Validate + store the combat loadout (food/drink slots, auto-repeat). */
export function setCombatLoadout(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  input: { food?: Array<{ itemId: string; triggerMissingHp?: number }>; drink?: Array<{ itemId: string }>; autoRepeat?: boolean }
): { ok: boolean; error?: string } {
  const items = pack.items as any[];
  const isConsumable = (id: string) => {
    const d = items.find((i) => i.id === id);
    return d && (d.type === "consumable" || d.type === "food");
  };
  const counts = combatSlotCounts(player, pack);
  const food = (input.food || []).slice(0, counts.food).filter((f) => f && f.itemId);
  for (const f of food) {
    const d = items.find((i) => i.id === f.itemId);
    if (!isConsumable(f.itemId) || !(Number(d?.effect?.hp) > 0)) return { ok: false, error: `not_food:${f.itemId}` };
  }
  const drink = (input.drink || []).slice(0, counts.drink).filter((d) => d && d.itemId);
  for (const d of drink) {
    const def = items.find((i) => i.id === d.itemId);
    if (!isConsumable(d.itemId) || !def?.effect?.buff) return { ok: false, error: `not_drink:${d.itemId}` };
  }
  player.combatLoadout = {
    food: food.map((f) => ({ itemId: f.itemId, triggerMissingHp: Math.max(1, Math.floor(Number(f.triggerMissingHp) || 1)) })),
    drink: drink.map((d) => ({ itemId: d.itemId })),
    autoRepeat: !!input.autoRepeat,
  };
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
