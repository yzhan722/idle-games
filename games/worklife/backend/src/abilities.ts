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
  /** Number of enemy targets hit in multi-target combat (1 = single, 3 = cleave, 99 = full AOE). */
  targetCount?: number;
  /** Heal as a fraction of max HP. */
  healPct?: number;
  /** If true, heals all living party members in squad combat. */
  isPartyHeal?: boolean;
  /** Incoming-damage multiplier applied to the player for `durationMs` (坚守 / 嘲讽). */
  guardMult?: number;
  durationMs?: number;
  /** Duration in ms of forced high threat/aggro in party combat. */
  tauntDurationMs?: number;
  /** Team aura bonus ATK% and Crit% granted on cast. */
  auraAtkPct?: number;
  auraCritPct?: number;
  auraDurationMs?: number;
  /** Flat MP restored on cast (scales with ability level). */
  mpRestore?: number;
  /** Ignores and removes the Forest Boss guard (重劈 / 星陨). */
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
  {
    id: "cleave",
    name: "横扫顺劈",
    blurb: "1.85 倍顺劈斩击，组队时同时重创最多 3 名敌人。矿山怪物掉落。",
    cooldownMs: 7000,
    mpCost: 6,
    damageMult: 1.85,
    targetCount: 3,
    bookItemId: "book_cleave",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "taunt",
    name: "威压嘲讽",
    blurb: "8 秒内受伤 -45%，组队时强制吸引敌方绝大部分仇恨保护队友。沼泽怪物掉落。",
    cooldownMs: 10000,
    mpCost: 8,
    guardMult: 0.55,
    durationMs: 8000,
    tauntDurationMs: 8000,
    bookItemId: "book_taunt",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "arrow_rain",
    name: "漫天箭雨",
    blurb: "倾泻密集箭雨，对场上全体敌人造成 1.55 倍穿透伤害。雪山怪物掉落。",
    cooldownMs: 9000,
    mpCost: 10,
    damageMult: 1.55,
    targetCount: 99,
    bookItemId: "book_arrow_rain",
    defaultTrigger: { type: "enemies_at_least", pct: 2 },
    levelStep: 0.05,
  },
  {
    id: "group_heal",
    name: "复苏群疗",
    blurb: "恢复自身或全队全体存活成员 32% 最大生命并净化负面状态。火山与深渊怪物掉落。",
    cooldownMs: 14000,
    mpCost: 14,
    healPct: 0.32,
    isPartyHeal: true,
    bookItemId: "book_group_heal",
    defaultTrigger: { type: "ally_hp_below", pct: 60 },
    levelStep: 0.05,
  },
  {
    id: "meteor_storm",
    name: "星陨天罚",
    blurb: "召唤星界陨石轰炸全场，对全体敌人造成 2.35 倍伤害并震碎格挡。天界与裂隙掉落。",
    cooldownMs: 12000,
    mpCost: 18,
    damageMult: 2.35,
    targetCount: 99,
    breaksGuard: true,
    bookItemId: "book_meteor_storm",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "war_aura",
    name: "战神光环",
    blurb: "造成 1.4 倍震击伤害，并令全队 10 秒内攻击力 +22%、暴击率 +15%。终局首领掉落。",
    cooldownMs: 16000,
    mpCost: 15,
    damageMult: 1.4,
    auraAtkPct: 22,
    auraCritPct: 15,
    auraDurationMs: 10000,
    bookItemId: "book_war_aura",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "quick_shot",
    name: "疾风连射",
    blurb: "疾速射出双生风矢，造成 1.45 倍伤害并可同时命中 2 名敌人。路痴小蜜蜂与森林管家掉落。",
    cooldownMs: 4000,
    mpCost: 3,
    damageMult: 1.45,
    targetCount: 2,
    bookItemId: "book_quick_shot",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "spore_ward",
    name: "灵蕈祝祷",
    blurb: "沐浴森林灵蕈孢子，立即恢复 18% 最大生命并在 5 秒内受伤 -20%。生气蘑菇精掉落。",
    cooldownMs: 11000,
    mpCost: 6,
    healPct: 0.18,
    guardMult: 0.8,
    durationMs: 5000,
    bookItemId: "book_spore_ward",
    defaultTrigger: { type: "self_hp_below", pct: 75 },
    levelStep: 0.05,
  },
  {
    id: "shield_bash",
    name: "碎岩盾击",
    blurb: "挥盾猛砸造成 1.55 倍伤害、击碎敌人护盾，并使自身 5 秒内受伤 -28%。钢铁蜘蛛与矿山霸主掉落。",
    cooldownMs: 9000,
    mpCost: 6,
    damageMult: 1.55,
    breaksGuard: true,
    guardMult: 0.72,
    durationMs: 5000,
    bookItemId: "book_shield_bash",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "mana_pulse",
    name: "晶脉共鸣",
    blurb: "引爆微光晶脉造成 1.5 倍奥术伤害，并立即回流 +10 点魔力（零耗蓝续航核心）。水晶蝙蝠与宝石大盗掉落。",
    cooldownMs: 8000,
    mpCost: 0,
    damageMult: 1.5,
    mpRestore: 10,
    bookItemId: "book_mana_pulse",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "venom_fang",
    name: "剧毒穿刺",
    blurb: "淬毒利刃直刺要害，对单体目标造成 2.15 倍剧毒穿刺伤害。毒雾青蛙与藤蔓毒蛇掉落。",
    cooldownMs: 6500,
    mpCost: 7,
    damageMult: 2.15,
    bookItemId: "book_venom_fang",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "soul_drain",
    name: "噬魂汲取",
    blurb: "抽取敌方生机造成 1.65 倍暗影伤害，同时恢复自身 16% 最大生命并驱散瘴气。鬼火幽灵与沼泽巨魔掉落。",
    cooldownMs: 9000,
    mpCost: 9,
    damageMult: 1.65,
    healPct: 0.16,
    bookItemId: "book_soul_drain",
    defaultTrigger: { type: "self_hp_below", pct: 75 },
    levelStep: 0.05,
  },
  {
    id: "frost_nova",
    name: "寒冰新星",
    blurb: "爆发极寒冰环席卷全场，对全体敌人造成 1.7 倍冰霜伤害，并凝结冰甲令 6 秒内受伤 -32%。寒冰傀儡与雪羽鹰身女妖掉落。",
    cooldownMs: 10000,
    mpCost: 11,
    damageMult: 1.7,
    targetCount: 99,
    guardMult: 0.68,
    durationMs: 6000,
    bookItemId: "book_frost_nova",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "glacial_snipe",
    name: "极寒穿云箭",
    blurb: "凝聚极地寒霜射出贯穿一箭，造成 2.45 倍高额单体伤害并直接击碎首领护盾。冰封骑士与暴雪雪人掉落。",
    cooldownMs: 8500,
    mpCost: 10,
    damageMult: 2.45,
    breaksGuard: true,
    bookItemId: "book_glacial_snipe",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "flame_burst",
    name: "熔岩爆裂",
    blurb: "引动地心熔岩连环爆裂，对最多 3 名敌人造成 2.1 倍烈焰重创。岩浆泰坦与炼狱火龙掉落。",
    cooldownMs: 7500,
    mpCost: 12,
    damageMult: 2.1,
    targetCount: 3,
    bookItemId: "book_flame_burst",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "phoenix_blessing",
    name: "浴火圣歌",
    blurb: "奏响不灭浴火圣歌，恢复全队 28% 最大生命值并令全队 8 秒内攻击 +15%、暴击 +10%。烈焰怨灵与烈焰魔君掉落。",
    cooldownMs: 13000,
    mpCost: 14,
    healPct: 0.28,
    isPartyHeal: true,
    auraAtkPct: 15,
    auraCritPct: 10,
    auraDurationMs: 8000,
    bookItemId: "book_phoenix_blessing",
    defaultTrigger: { type: "self_hp_below", pct: 75 },
    levelStep: 0.05,
  },
  {
    id: "void_rift",
    name: "虚空裂斩",
    blurb: "撕裂深渊维度斩向敌阵，对最多 3 名敌人造成 2.65 倍虚空伤害并粉碎护盾。恐惧骑士与虚空巨兽掉落。",
    cooldownMs: 8500,
    mpCost: 15,
    damageMult: 2.65,
    targetCount: 3,
    breaksGuard: true,
    bookItemId: "book_void_rift",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "abyssal_pact",
    name: "深渊噬魂契",
    blurb: "缔结深渊法则席卷全场，造成 1.95 倍暗影群伤，恢复自身 20% 生命并回流 +16 魔力。梦魇织者与虚空领主掉落。",
    cooldownMs: 11000,
    mpCost: 8,
    damageMult: 1.95,
    targetCount: 99,
    healPct: 0.2,
    mpRestore: 16,
    bookItemId: "book_abyssal_pact",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "holy_judgment",
    name: "天罚圣裁",
    blurb: "降下天界圣光裁决全场，造成 2.55 倍神圣群伤、击碎护盾，并治疗全队 22% 最大生命。神圣巨像、执政天神与堕落天使掉落。",
    cooldownMs: 11500,
    mpCost: 18,
    damageMult: 2.55,
    targetCount: 99,
    breaksGuard: true,
    healPct: 0.22,
    isPartyHeal: true,
    bookItemId: "book_holy_judgment",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "seraph_aegis",
    name: "炽天圣盾",
    blurb: "展开六翼炽天圣盾，恢复 24% 最大生命，并在 9 秒内令受伤降低 55% 且强力吸引全队仇恨。炽天哨兵与堕落天使掉落。",
    cooldownMs: 12000,
    mpCost: 14,
    healPct: 0.24,
    guardMult: 0.45,
    durationMs: 9000,
    tauntDurationMs: 9000,
    bookItemId: "book_seraph_aegis",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "chrono_overload",
    name: "时空超载",
    blurb: "扭曲时空法则轰击全场造成 2.4 倍伤害，回流 +22 魔力，并令全队 10 秒内攻击 +26%、暴击 +18%。时空巨龙、现实撕裂者与时空主宰掉落。",
    cooldownMs: 9500,
    mpCost: 12,
    damageMult: 2.4,
    targetCount: 99,
    mpRestore: 22,
    auraAtkPct: 26,
    auraCritPct: 18,
    auraDurationMs: 10000,
    bookItemId: "book_chrono_overload",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "hellfire_cataclysm",
    name: "炼狱浩劫",
    blurb: "召唤地狱业火焚尽万物，对全体敌人造成 2.95 倍毁灭伤害并瞬间融化一切护盾。炼狱魔龙、地狱亲王与炼狱魔神掉落。",
    cooldownMs: 11000,
    mpCost: 22,
    damageMult: 2.95,
    targetCount: 99,
    breaksGuard: true,
    bookItemId: "book_hellfire_cataclysm",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "genesis_sanctuary",
    name: "创世神恩",
    blurb: "降下创世神恩，对全场造成 2.75 倍圣光伤害，恢复全队 36% 生命，8 秒内受伤 -50% 且全队攻击 +30%、暴击 +20%。神圣不死鸟、创世先知与创世之神掉落。",
    cooldownMs: 13000,
    mpCost: 24,
    damageMult: 2.75,
    targetCount: 99,
    healPct: 0.36,
    isPartyHeal: true,
    guardMult: 0.5,
    durationMs: 8000,
    auraAtkPct: 30,
    auraCritPct: 20,
    auraDurationMs: 10000,
    bookItemId: "book_genesis_sanctuary",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
  {
    id: "omega_annihilation",
    name: "万界终焉",
    blurb: "引动万界终焉之力湮灭一切，对全体敌人造成 3.4 倍终极破防伤害，恢复全队 25% 生命、回流 +30 魔力，并令全队 12 秒内攻击 +35%、暴击 +25%。世界终结者、终焉传令者与万界终焉掉落。",
    cooldownMs: 12000,
    mpCost: 25,
    damageMult: 3.4,
    targetCount: 99,
    breaksGuard: true,
    healPct: 0.25,
    isPartyHeal: true,
    mpRestore: 30,
    auraAtkPct: 35,
    auraCritPct: 25,
    auraDurationMs: 12000,
    bookItemId: "book_omega_annihilation",
    defaultTrigger: { type: "always" },
    levelStep: 0.05,
  },
];

export const ABILITY_BY_ID: Record<string, AbilityDef> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
export const INNATE_ABILITIES = ["heavy_chop"];
/** Re-reading a known book grants a fixed flat XP amount (no percentage scaling). */
export const BOOK_REREAD_XP = 150;
/** Base XP trained per ability cast. */
export const CAST_XP = 2;
export const MAX_ABILITY_LEVEL = 200;

/** Steep multi-stage ability XP curve: Lv1 -> Lv2 needs 300 XP, scaling sharply up to Lv200. */
export function getAbilityXpForLevel(level: number): number {
  if (level >= MAX_ABILITY_LEVEL) return Infinity;
  const lv = Math.max(1, Math.floor(level));
  if (lv <= 15) return Math.floor(300 * Math.pow(lv, 1.55));
  const e15 = Math.floor(300 * Math.pow(15, 1.55));
  if (lv <= 50) return Math.floor(e15 + 520 * Math.pow(lv - 15, 1.75));
  const e50 = Math.floor(e15 + 520 * Math.pow(35, 1.75));
  return Math.floor(e50 + 1200 * Math.pow(lv - 50, 1.95));
}

/** Mastery realm & milestone cooldown reduction (every 5 levels unlocks -2.5% CD, up to -35%). */
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

/** Effective cooldown in ms after applying level mastery cooldown reduction. */
export function abilityCooldownMsForLevel(def: AbilityDef, level: number): number {
  const { cdReductionPct } = abilityMasteryTier(level);
  if (cdReductionPct <= 0) return def.cooldownMs;
  return Math.max(1000, Math.round(def.cooldownMs * (1 - cdReductionPct / 100)));
}

/** XP earned from a single cast of `def` against a monster of `monsterLevel`. */
export function abilityCastXp(def: AbilityDef, monsterLevel = 1): number {
  const mpBonus = Math.floor((def.mpCost || 0) / 2);
  const cdBonus = def.cooldownMs >= 12000 ? 2 : 0;
  const lvBonus = Math.floor(Math.max(0, (monsterLevel || 1) - 1) * 0.35);
  return CAST_XP + mpBonus + cdBonus + lvBonus;
}

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
  let need = getAbilityXpForLevel(st.level);
  let leveledTo: number | undefined;
  while (st.xp >= need && st.level < MAX_ABILITY_LEVEL) {
    st.level += 1;
    st.xp = Math.round((st.xp - need) * 1000) / 1000;
    leveledTo = st.level;
    need = getAbilityXpForLevel(st.level);
  }
  if (leveledTo) {
    const mastery = abilityMasteryTier(leveledTo);
    appendLog(player, `技能「${ABILITY_BY_ID[abilityId]?.name || abilityId}」升到 ${leveledTo} 级（${mastery.title}）！`);
  }
  return { leveledTo };
}

/** Consume a book: first read learns the ability, later reads add XP (MWI). */
export function learnFromBook(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  itemId: string
): { ok: boolean; error?: string; abilityId?: string; learned?: boolean; leveledTo?: number; xpGained?: number } {
  const def = abilityForBook(itemId);
  const item = (pack.items as Array<{ id: string; type?: string }>).find((i) => i.id === itemId);
  if (!def || !item || item.type !== "book") return { ok: false, error: "not_a_book" };
  if ((player.inventory[itemId] || 0) < 1) return { ok: false, error: "missing_book" };
  const known = ensureAbilities(player);
  if (known[def.id] && known[def.id].level >= MAX_ABILITY_LEVEL) {
    return { ok: false, error: "ability_max_level" };
  }
  player.inventory[itemId] -= 1;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  if (!known[def.id]) {
    known[def.id] = { level: 1, xp: 0 };
    appendLog(player, `读完《${def.name}》，学会了新技能。`);
    // Auto-equip into a free slot so a fresh book is felt in the next fight.
    const slots = activeAbilitySlots(player);
    if (slots.length < abilitySlotCount(ensureCombatSkills(player))) {
      player.abilityLoadout = [...slots, { abilityId: def.id, trigger: def.defaultTrigger }];
    }
    return { ok: true, abilityId: def.id, learned: true };
  }
  const res = grantAbilityXp(player, def.id, BOOK_REREAD_XP);
  appendLog(player, `重读《${def.name}》，技能经验 +${BOOK_REREAD_XP}。`);
  return { ok: true, abilityId: def.id, learned: false, leveledTo: res.leveledTo, xpGained: BOOK_REREAD_XP };
}

const TRIGGER_TYPES = new Set([
  "always",
  "enemy_hp_below",
  "self_hp_below",
  "ally_hp_below",
  "enemies_at_least",
  "enemy_guard",
]);

function normalizeTrigger(input: unknown, fallback: AbilityTrigger): AbilityTrigger | undefined {
  if (!input || typeof input !== "object") return fallback;
  const t = input as { type?: unknown; pct?: unknown };
  if (typeof t.type !== "string" || !TRIGGER_TYPES.has(t.type)) return undefined;
  if (t.type === "enemy_hp_below" || t.type === "self_hp_below" || t.type === "ally_hp_below") {
    const pct = Number(t.pct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return undefined;
    return { type: t.type, pct: Math.round(pct) };
  }
  if (t.type === "enemies_at_least") {
    const pct = Number(t.pct);
    if (!Number.isFinite(pct) || pct < 1 || pct > 10) return undefined;
    return { type: "enemies_at_least", pct: Math.round(pct) };
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
