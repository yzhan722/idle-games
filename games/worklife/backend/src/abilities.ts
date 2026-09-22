import type { AbilitySlot, AbilityTrigger, EnhancedContentPack, EnhancedPlayerState, HpCombatState } from "./types";
import { abilitySlotCount, ensureCombatSkills } from "./combat_skills";
import { appendLog, getXpForLevel } from "./storage";

/**
 * MWI abilities: learned from books that monsters drop, equipped in a priority list, auto-cast by
 * trigger. Definitions are code, not content-pack data, because their effects are combat rules the
 * simulator (and the frontend fight preview) must agree on exactly.
 */
export type AbilityDef = {
  id: string;
  name: string;
  blurb: string;
  cooldownMs: number;
  mpCost: number;
  /** Damage as a multiple of a normal hit. */
  damageMult?: number;
  /** Heal as a fraction of max HP. */
  healPct?: number;
  /** Incoming-damage multiplier applied to the player for `durationMs` (坚守). */
  guardMult?: number;
  durationMs?: number;
  /** Ignores and removes the Forest Boss guard (重劈 only). */
  breaksGuard?: boolean;
  /** Book item that teaches it; undefined = innate. */
  bookItemId?: string;
  defaultTrigger: AbilityTrigger;
  /** Effect growth per ability level above 1. */
  levelStep: number;
};

export const ABILITIES: AbilityDef[] = [
  {
    id: "heavy_chop",
    name: "重劈",
    blurb: "2.2 倍伤害，无视并打碎格挡。伐木工的看家本领，不耗魔力。",
    cooldownMs: 8000,
    mpCost: 0,
    damageMult: 2.2,
    breaksGuard: true,
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "smash",
    name: "猛击",
    blurb: "1.6 倍伤害，冷却短。史莱姆掉落的技能书。",
    cooldownMs: 5000,
    mpCost: 4,
    damageMult: 1.6,
    bookItemId: "book_smash",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "minor_heal",
    name: "小治疗",
    blurb: "恢复 25% 最大生命。捣蛋小猴掉落的技能书。",
    cooldownMs: 15000,
    mpCost: 8,
    healPct: 0.25,
    bookItemId: "book_minor_heal",
    defaultTrigger: { type: "self_hp_below", pct: 50 },
    levelStep: 0.05,
  },
  {
    id: "brace",
    name: "坚守",
    blurb: "6 秒内受到的伤害 -35%。铁壳寄居蟹掉落的技能书。",
    cooldownMs: 12000,
    mpCost: 6,
    guardMult: 0.65,
    durationMs: 6000,
    bookItemId: "book_brace",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
];

export const ABILITY_BY_ID: Record<string, AbilityDef> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
export const INNATE_ABILITIES = ["heavy_chop"];
/** Re-reading a known book (MWI: 50 XP for a tier-1 book). */
export const BOOK_REREAD_XP = 50;
/** Every cast trains the ability a little. */
export const CAST_XP = 1;
export const MAX_ABILITY_LEVEL = 200;

export function abilityForBook(itemId: string): AbilityDef | undefined {
  return ABILITIES.find((a) => a.bookItemId === itemId);
}

export function ensureAbilities(player: EnhancedPlayerState) {
  if (!player.abilities) player.abilities = {};
  for (const id of INNATE_ABILITIES) {
    if (!player.abilities[id]) player.abilities[id] = { level: 1, xp: 0 };
  }
  if (!player.abilityLoadout) {
    player.abilityLoadout = INNATE_ABILITIES.map((id) => ({ abilityId: id, trigger: ABILITY_BY_ID[id].defaultTrigger }));
  }
  return player.abilities;
}

export function abilityLevelMult(def: AbilityDef, level: number): number {
  return 1 + Math.max(0, level - 1) * def.levelStep;
}

/** Slots the player may fill right now (intelligence-gated), with unknown / unlearned entries dropped. */
export function activeAbilitySlots(player: EnhancedPlayerState): AbilitySlot[] {
  const cs = ensureCombatSkills(player);
  const known = ensureAbilities(player);
  const slots = (player.abilityLoadout || []).filter((s) => s && ABILITY_BY_ID[s.abilityId] && known[s.abilityId]);
  return slots.slice(0, abilitySlotCount(cs));
}

export function grantAbilityXp(player: EnhancedPlayerState, abilityId: string, xp: number): { leveledTo?: number } {
  const known = ensureAbilities(player);
  const st = known[abilityId];
  if (!st) return {};
  st.xp = Math.round((st.xp + xp) * 1000) / 1000;
  let need = getXpForLevel(st.level);
  let leveledTo: number | undefined;
  while (st.xp >= need && st.level < MAX_ABILITY_LEVEL) {
    st.level += 1;
    st.xp = Math.round((st.xp - need) * 1000) / 1000;
    leveledTo = st.level;
    need = getXpForLevel(st.level);
  }
  if (leveledTo) appendLog(player, `技能「${ABILITY_BY_ID[abilityId]?.name || abilityId}」升到 ${leveledTo} 级！`);
  return { leveledTo };
}

/** Consume a book: first read learns the ability, later reads add XP (MWI). */
export function learnFromBook(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  itemId: string
): { ok: boolean; error?: string; abilityId?: string; learned?: boolean; leveledTo?: number } {
  const def = abilityForBook(itemId);
  const item = (pack.items as Array<{ id: string; type?: string }>).find((i) => i.id === itemId);
  if (!def || !item || item.type !== "book") return { ok: false, error: "not_a_book" };
  if ((player.inventory[itemId] || 0) < 1) return { ok: false, error: "missing_book" };
  player.inventory[itemId] -= 1;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  const known = ensureAbilities(player);
  if (!known[def.id]) {
    known[def.id] = { level: 1, xp: 0 };
    appendLog(player, `读完《${def.name}》，学会了新技能。`);
    // Auto-equip into a free slot so a fresh book is felt in the next fight.
    const slots = activeAbilitySlots(player);
    if (slots.length < abilitySlotCount(ensureCombatSkills(player))) {
      player.abilityLoadout = [...(player.abilityLoadout || []), { abilityId: def.id, trigger: def.defaultTrigger }];
    }
    return { ok: true, abilityId: def.id, learned: true };
  }
  const res = grantAbilityXp(player, def.id, BOOK_REREAD_XP);
  appendLog(player, `重读《${def.name}》，技能经验 +${BOOK_REREAD_XP}。`);
  return { ok: true, abilityId: def.id, learned: false, leveledTo: res.leveledTo };
}

const TRIGGER_TYPES = new Set(["always", "enemy_hp_below", "self_hp_below", "enemy_guard"]);

function normalizeTrigger(input: unknown, fallback: AbilityTrigger): AbilityTrigger | undefined {
  if (!input || typeof input !== "object") return fallback;
  const t = input as { type?: unknown; pct?: unknown };
  if (typeof t.type !== "string" || !TRIGGER_TYPES.has(t.type)) return undefined;
  if (t.type === "enemy_hp_below" || t.type === "self_hp_below") {
    const pct = Number(t.pct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return undefined;
    return { type: t.type, pct: Math.round(pct) };
  }
  return { type: t.type as "always" | "enemy_guard" };
}

/** Validate + store the ability priority list. */
export function setAbilityLoadout(
  player: EnhancedPlayerState,
  input: Array<{ abilityId: string; trigger?: unknown }>
): { ok: boolean; error?: string } {
  const known = ensureAbilities(player);
  const max = abilitySlotCount(ensureCombatSkills(player));
  if (input.length > max) return { ok: false, error: `too_many_slots:${max}` };
  const seen = new Set<string>();
  const next: AbilitySlot[] = [];
  for (const slot of input) {
    const def = ABILITY_BY_ID[slot.abilityId];
    if (!def) return { ok: false, error: `unknown_ability:${slot.abilityId}` };
    if (!known[slot.abilityId]) return { ok: false, error: `not_learned:${slot.abilityId}` };
    if (seen.has(slot.abilityId)) return { ok: false, error: `duplicate:${slot.abilityId}` };
    seen.add(slot.abilityId);
    const trigger = normalizeTrigger(slot.trigger, def.defaultTrigger);
    if (!trigger) return { ok: false, error: `bad_trigger:${slot.abilityId}` };
    next.push({ abilityId: slot.abilityId, trigger });
  }
  player.abilityLoadout = next;
  return { ok: true };
}

/** Pure trigger check shared with the frontend preview (same numbers, same rounding). */
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

export function abilityReadyAt(enc: HpCombatState, abilityId: string): number {
  if (abilityId === "heavy_chop") return enc.heavyChopReadyAt || 0;
  return enc.abilityReadyAt?.[abilityId] || 0;
}

export function setAbilityReadyAt(enc: HpCombatState, abilityId: string, at: number) {
  if (abilityId === "heavy_chop") enc.heavyChopReadyAt = at;
  if (!enc.abilityReadyAt) enc.abilityReadyAt = {};
  enc.abilityReadyAt[abilityId] = at;
}

/** Content exposed to the client (GET /content). */
export function abilityCatalog() {
  return ABILITIES.map((a) => ({ ...a }));
}
