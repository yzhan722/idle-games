export type PartyActivity = {
  type: "combat" | "group_craft" | "raid";
  stageId?: string;
  startedAt: string;
  endsAt?: string;
  durationMinutes?: number;
  raidBossId?: string;
  raidBossName?: string;
  bossKillsNeeded?: number;
};

export type PartyMemberItem = {
  userId: string;
  role: string;
  isOnline?: boolean;
  isReady?: boolean;
  isBot?: boolean;
  title?: string;
  classId?: string;
  gender?: "male" | "female" | "animal";
  combatLevel?: number;
  joinedAt?: string;
  displayName?: string;
};

export type PartyPayload = {
  id: string;
  name?: string;
  leaderId: string;
  members: PartyMemberItem[];
  allReady?: boolean;
  currentActivity?: PartyActivity | null;
  createdAt?: string;
};

export type PartyListItem = {
  id: string;
  name?: string;
  leaderId: string;
  leaderName?: string;
  memberCount: number;
  hasActivity: boolean;
  isBotParty?: boolean;
  allBotsReady?: boolean;
  recommendedStageId?: string;
  createdAt: string;
};

export type PartyInvite = { partyId: string; fromUserId: string; invitedAt: string };

export type StageBossDungeon = {
  id: string;
  name: string;
  recommendedLevel: number;
  boss: {
    id: string;
    name: string;
    level: number;
    hp: number;
    atk: number;
    def: number;
    xp: number;
    gold: number;
    icon?: string;
  };
  minions: Array<{
    id: string;
    name: string;
    level: number;
    hp: number;
    atk: number;
    def: number;
    xp: number;
    gold: number;
    icon?: string;
  }>;
};

export type AllyCombatUnit = {
  userId: string;
  name: string;
  title?: string;
  isSelf: boolean;
  isBot: boolean;
  role: string;
  classId: string;
  gender: "male" | "female" | "animal";
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  castMs: number;
  intervalMs: number;
  reviveRemainingMs: number;
  reviveTotalMs: number;
  hitShakeUntil: number;
  attackAnimUntil: number;
};

export const ALLY_REVIVE_MS = 60000;

export type BossSignatureSkill = {
  id: string;
  name: string;
  kind: "aoe" | "cleave" | "tactical";
  tag: string;
  dmgMult: number;
  maxHpPct: number;
  targetCount?: number;
  castPushbackPct?: number;
  mpDrainPct?: number;
  lifestealPct?: number;
  shieldMs?: number;
  enrage?: boolean;
  summonGuard?: boolean;
  desc: string;
};

export const BOSS_SIGNATURE_SKILLS: Record<string, BossSignatureSkill[]> = {
  forest_boss: [
    {
      id: "thorn_storm",
      name: "万木荆棘阵",
      kind: "aoe",
      tag: "全屏AOE",
      dmgMult: 1.25,
      maxHpPct: 0.08,
      castPushbackPct: 0.35,
      desc: "召唤漫天荆棘鞭笞全队，造成全屏伤害并击退读条35%",
    },
    {
      id: "nature_siphon",
      name: "古木汲取根须",
      kind: "cleave",
      tag: "顺劈吸血",
      dmgMult: 1.35,
      maxHpPct: 0.06,
      targetCount: 3,
      lifestealPct: 0.45,
      desc: "根须穿刺3名队员并汲取生机回复自身生命",
    },
    {
      id: "bark_fortress",
      name: "森罗古盾震击",
      kind: "tactical",
      tag: "古盾·召唤",
      dmgMult: 1.05,
      maxHpPct: 0.05,
      shieldMs: 5500,
      enrage: true,
      summonGuard: true,
      desc: "震荡全队，展开树皮古盾减伤45%并号令林间亲卫助战",
    },
  ],
  mine_boss: [
    {
      id: "mine_quake",
      name: "地脉崩塌震击",
      kind: "aoe",
      tag: "全屏AOE",
      dmgMult: 1.35,
      maxHpPct: 0.09,
      castPushbackPct: 0.4,
      desc: "引爆矿脉震裂大地，对全队造成高额穿透AOE并打断读条",
    },
    {
      id: "crystal_shatter",
      name: "黑曜晶簇连爆",
      kind: "cleave",
      tag: "三连晶爆",
      dmgMult: 1.45,
      maxHpPct: 0.07,
      targetCount: 3,
      desc: "连续引爆高能矿晶，重创3名队员",
    },
    {
      id: "obsidian_bastion",
      name: "金刚巨岩壁垒",
      kind: "tactical",
      tag: "重甲·狂怒",
      dmgMult: 1.1,
      maxHpPct: 0.06,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "披覆黑曜石重甲减伤45%，激发矿脉狂怒并召唤矿石亲卫",
    },
  ],
  swamp_boss: [
    {
      id: "toxic_tsunami",
      name: "腐骨剧毒狂潮",
      kind: "aoe",
      tag: "全屏AOE",
      dmgMult: 1.3,
      maxHpPct: 0.1,
      mpDrainPct: 0.22,
      desc: "掀起剧毒泥沼海啸席卷全场，腐蚀全队生命与法力",
    },
    {
      id: "abyss_devour",
      name: "深渊泥沼吞噬",
      kind: "cleave",
      tag: "吞噬吸血",
      dmgMult: 1.4,
      maxHpPct: 0.07,
      targetCount: 3,
      lifestealPct: 0.5,
      desc: "撕咬3名队员并吞噬毒血，大幅回复自身生命",
    },
    {
      id: "miasma_tentacles",
      name: "瘴气触手缠绕",
      kind: "tactical",
      tag: "迟滞·召唤",
      dmgMult: 1.1,
      maxHpPct: 0.06,
      castPushbackPct: 0.45,
      enrage: true,
      summonGuard: true,
      desc: "毒雾触手横扫全场，大幅迟滞全队读条并召唤沼泽亲卫",
    },
  ],
  snow_boss: [
    {
      id: "absolute_zero",
      name: "绝对零度暴风雪",
      kind: "aoe",
      tag: "全屏冰封AOE",
      dmgMult: 1.4,
      maxHpPct: 0.11,
      castPushbackPct: 0.55,
      desc: "极寒暴风雪冰封全场，造成巨额冰霜AOE并冻结读条",
    },
    {
      id: "glacier_lance",
      name: "极寒冰川穿刺",
      kind: "cleave",
      tag: "破冰三连",
      dmgMult: 1.5,
      maxHpPct: 0.08,
      targetCount: 3,
      desc: "凝聚万年冰枪贯穿3名队员，必定触发破冰暴击",
    },
    {
      id: "permafrost_aegis",
      name: "永冻霜甲寒潮",
      kind: "tactical",
      tag: "霜甲·狂暴",
      dmgMult: 1.15,
      maxHpPct: 0.06,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "寒潮席卷全队，披上永冻冰甲减伤45%并召唤雪原亲卫",
    },
  ],
  volcano_boss: [
    {
      id: "meteor_cataclysm",
      name: "天火陨星灭世",
      kind: "aoe",
      tag: "全屏天火AOE",
      dmgMult: 1.5,
      maxHpPct: 0.12,
      castPushbackPct: 0.35,
      desc: "召唤漫天熔岩陨石轰炸全队，造成毁灭性全屏烈焰伤害",
    },
    {
      id: "hellfire_cleave",
      name: "炎狱劫火连斩",
      kind: "cleave",
      tag: "四连顺劈",
      dmgMult: 1.55,
      maxHpPct: 0.08,
      targetCount: 4,
      lifestealPct: 0.3,
      desc: "挥舞熔岩魔剑横扫4名队员，附带熔核汲取",
    },
    {
      id: "corona_burst",
      name: "日冕熔核爆裂",
      kind: "tactical",
      tag: "红莲狂暴",
      dmgMult: 1.2,
      maxHpPct: 0.07,
      shieldMs: 5500,
      enrage: true,
      summonGuard: true,
      desc: "引爆熔核震伤全队，开启红莲狂暴并召唤熔岩亲卫",
    },
  ],
  abyss_boss: [
    {
      id: "void_singularity",
      name: "次元黑洞坍缩",
      kind: "aoe",
      tag: "全屏坍缩AOE",
      dmgMult: 1.55,
      maxHpPct: 0.13,
      castPushbackPct: 0.45,
      mpDrainPct: 0.25,
      desc: "撕裂空间引发黑洞坍缩，湮灭全队生命与法力",
    },
    {
      id: "soul_rend_slash",
      name: "虚空裂魂连斩",
      kind: "cleave",
      tag: "四连噬魂",
      dmgMult: 1.6,
      maxHpPct: 0.09,
      targetCount: 4,
      lifestealPct: 0.45,
      desc: "瞬移连斩4名队员并吸取灵魂恢复自身",
    },
    {
      id: "eternal_night",
      name: "永夜深渊降临",
      kind: "tactical",
      tag: "虚空壁障",
      dmgMult: 1.25,
      maxHpPct: 0.07,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "永夜笼罩全场，展开虚空护盾并召唤深渊亲卫",
    },
  ],
  celestial_boss: [
    {
      id: "fallen_judgment",
      name: "堕天圣裁光雨",
      kind: "aoe",
      tag: "全屏圣裁AOE",
      dmgMult: 1.6,
      maxHpPct: 0.13,
      mpDrainPct: 0.25,
      desc: "漫天黑白圣裁光柱轰击全队，造成巨额神圣与暗影伤害",
    },
    {
      id: "twilight_spear",
      name: "黄昏弑神贯穿",
      kind: "cleave",
      tag: "四连弑神",
      dmgMult: 1.65,
      maxHpPct: 0.09,
      targetCount: 4,
      lifestealPct: 0.4,
      desc: "投掷弑神光枪贯穿4名队员并汲取神力",
    },
    {
      id: "seraph_wings",
      name: "六翼黑羽神盾",
      kind: "tactical",
      tag: "六翼神盾",
      dmgMult: 1.25,
      maxHpPct: 0.07,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "六翼黑羽掀起风暴，展开神盾并召唤炽天亲卫",
    },
  ],
  rift_boss: [
    {
      id: "chrono_collapse",
      name: "纪元崩塌风暴",
      kind: "aoe",
      tag: "全屏时空AOE",
      dmgMult: 1.65,
      maxHpPct: 0.14,
      castPushbackPct: 0.55,
      desc: "逆转时间流向引爆次元风暴，重创全队并回退读条55%",
    },
    {
      id: "paradox_erase",
      name: "因果律抹杀斩",
      kind: "cleave",
      tag: "四连抹杀",
      dmgMult: 1.7,
      maxHpPct: 0.1,
      targetCount: 4,
      desc: "跨越时间线同时斩击4名队员，必定暴击",
    },
    {
      id: "time_overdrive",
      name: "时间加速领域",
      kind: "tactical",
      tag: "极速领域",
      dmgMult: 1.3,
      maxHpPct: 0.08,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "开启时间加速领域，攻速暴涨并召唤时空亲卫",
    },
  ],
  inferno_boss: [
    {
      id: "apocalypse_sea",
      name: "末日浩劫火海",
      kind: "aoe",
      tag: "全屏灭世AOE",
      dmgMult: 1.7,
      maxHpPct: 0.15,
      castPushbackPct: 0.4,
      desc: "召唤永劫业火焚尽全场，对全体队员造成毁灭性AOE",
    },
    {
      id: "soul_scythe",
      name: "噬魂魔镰收割",
      kind: "cleave",
      tag: "四连收割",
      dmgMult: 1.75,
      maxHpPct: 0.1,
      targetCount: 4,
      lifestealPct: 0.5,
      desc: "挥动魔神巨镰收割4名队员生命并大幅回血",
    },
    {
      id: "legion_command",
      name: "万魔统御狂潮",
      kind: "tactical",
      tag: "魔威·统御",
      dmgMult: 1.35,
      maxHpPct: 0.08,
      shieldMs: 6000,
      enrage: true,
      summonGuard: true,
      desc: "解放魔神真身震慑全场，号令炼狱魔将护驾",
    },
  ],
  genesis_boss: [
    {
      id: "genesis_big_bang",
      name: "原初星云大爆炸",
      kind: "aoe",
      tag: "全屏创世AOE",
      dmgMult: 1.75,
      maxHpPct: 0.16,
      castPushbackPct: 0.5,
      mpDrainPct: 0.25,
      desc: "引爆原初星云开天辟地，重创全队并震退攻击读条",
    },
    {
      id: "origin_decree",
      name: "创世神谕裁决",
      kind: "cleave",
      tag: "五连神裁",
      dmgMult: 1.8,
      maxHpPct: 0.11,
      targetCount: 5,
      lifestealPct: 0.45,
      desc: "降下原初神谕裁决5名队员，吸取万物源力修复神躯",
    },
    {
      id: "law_barrier",
      name: "创世法则壁障",
      kind: "tactical",
      tag: "法则神盾",
      dmgMult: 1.4,
      maxHpPct: 0.09,
      shieldMs: 6500,
      enrage: true,
      summonGuard: true,
      desc: "凝聚创世法则壁障减伤45%，并召唤神域护法",
    },
  ],
  omega_boss: [
    {
      id: "omega_oblivion",
      name: "万界归墟·终焉寂灭",
      kind: "aoe",
      tag: "全屏终焉AOE",
      dmgMult: 1.85,
      maxHpPct: 0.18,
      castPushbackPct: 0.6,
      mpDrainPct: 0.3,
      desc: "湮灭多元宇宙法则，对全队造成毁天灭地的终焉AOE并清空读条",
    },
    {
      id: "dimension_shatter",
      name: "维度崩解连斩",
      kind: "cleave",
      tag: "五连崩解",
      dmgMult: 1.9,
      maxHpPct: 0.12,
      targetCount: 5,
      lifestealPct: 0.5,
      desc: "崩解空间连续重创5名队员，吞噬维度本源回复自身",
    },
    {
      id: "omega_apotheosis",
      name: "终焉神格解放",
      kind: "tactical",
      tag: "终焉神格",
      dmgMult: 1.5,
      maxHpPct: 0.1,
      shieldMs: 7000,
      enrage: true,
      summonGuard: true,
      desc: "解放万界终焉神格，展开不朽壁障并召唤终焉传令者",
    },
  ],
};

export function getBossSignatureSkills(bossId: string): BossSignatureSkill[] {
  return BOSS_SIGNATURE_SKILLS[bossId] || BOSS_SIGNATURE_SKILLS.forest_boss;
}

/** Dynamically scale wave monster count with party size: 1p->2, 2p->3, 3p->4, 4p->5, 5-6p->6 */
export function getWaveMinionCount(partySize: number): number {
  const n = Math.max(1, partySize);
  return Math.max(2, Math.min(6, n <= 1 ? 2 : n + 1));
}

/** Dynamically scale Boss Elite Guards on Wave 10 with party size: 1-2p->0, 3-4p->1, 5-6p->2 */
export function getBossGuardCount(partySize: number): number {
  const n = Math.max(1, partySize);
  return n >= 5 ? 2 : n >= 3 ? 1 : 0;
}

export type EnemyCombatUnit = {
  slotKey: string;
  id: string;
  name: string;
  level: number;
  isBoss: boolean;
  isEliteGuard?: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  castMs: number;
  intervalMs: number;
  hitShakeUntil: number;
  attackAnimUntil: number;
  attackCount: number;
  nextSkillIdx: number;
  shieldUntil: number;
  enraged: boolean;
};

export type DamageFloatItem = {
  id: number;
  unitKey: string;
  value: number;
  isCrit?: boolean;
  isHeal?: boolean;
  tag?: string;
};

export const STAGE_ID_ALIASES: Record<string, string> = {
  stage_1: "forest",
  stage_2: "mine",
  stage_3: "swamp",
  stage_4: "snow",
  stage_forest: "forest",
  stage_mine: "mine",
  stage_swamp: "swamp",
  stage_snow: "snow",
  stage_volcano: "volcano",
};

export function normalizeStageId(raw?: string): string {
  if (!raw) return "forest";
  return STAGE_ID_ALIASES[raw] || raw;
}

export const ITEM_ICON_FALLBACK: Record<string, string> = {
  potion_hp_t1: "❤️",
  potion_hp_t2: "❤️‍🔥",
  potion_hp_t3: "💖",
  potion_hp_t4: "👑",
  potion_mp_t1: "💧",
  potion_mp_t2: "🔷",
  potion_mp_t3: "💠",
  potion_mp_t4: "🌌",
  potion_battle_fury: "🔥",
  potion_iron_skin: "🛡️",
  potion_arcane_surge: "✨",
  potion_guardian_elixir: "⚔️",
  potion_berserk: "⚡",
  food_simple: "🍖",
  drink_basic: "🍹",
};

export function getItemIconFallback(itemId: string): string {
  return ITEM_ICON_FALLBACK[itemId] || "📦";
}
