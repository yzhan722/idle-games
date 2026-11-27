// 进阶进度 · 转生系统
// 从 progression2.ts 原样拆出；对外一律从 "../progression2" 引用。

import type { EnhancedPlayerState, PrestigeState } from "../types";
import { appendLog } from "../storage";
import { defaultCombatSkills, totalLevelOf } from "../combat_skills";
import { ensureAlchemyCauldron } from "./alchemy_cauldron";
import { ensureAstralRelics } from "./astral_relics";
import { ensureSkyForge } from "./sky_forge";
import { ensureHarborAquarium, ensureHarborDerby } from "./harbor_derby";
import { ensureAdventurerAcademy, ensureFestivalCalendar } from "./academy_festival";
import { ensureGuildTown, ensureSkyArena } from "./arena_town";
import { ensureBeastRanch, ensureWeatherTower } from "./beast_weather";
import { ensureAdventurerChronicle, ensureBardTavern } from "./bard_tavern";
import { clearAirshipCargoForPrestige, ensurePaladinTrial } from "./airship_paladin";
import { clearDwarfMineHaulForPrestige, ensureElfWaystation } from "./dwarf_elf";
import { ensureAbyssDive, ensureGuildWar } from "./abyss_guild";

/* ============================ 转生系统 ============================ */

// 转生解锁所需的最低战斗等级。每次转生根据当前进度授予转生点，
// 每点提供永久全局 +2% 的全收益倍率，并重置职业/战斗等级、技能经验与背包（保留声望与转生收益）。
const PRESTIGE_MIN_COMBAT_LEVEL = 50;
const PRESTIGE_BONUS_PER_POINT = 0.02; // 每点转生 +2% 经验与战斗金币

export interface AstrolabeNodeDef {
  id: string;
  name: string;
  icon: string;
  constellation: string;
  maxRank: number;
  costs: number[];
  summary: string;
  formatEffect: (rank: number) => string;
}

export const PRESTIGE_ASTROLABE_NODES: AstrolabeNodeDef[] = [
  {
    id: "astro_house_keep",
    name: "灵居恒存",
    icon: "astro_house_keep",
    constellation: "圣所座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "转生保留高阶房屋等级不重置，并增幅全房间专精效能",
    formatEffect: (r) =>
      r <= 0
        ? "未点亮（转生重置房屋）"
        : r === 1
          ? "保留最高1间房屋不重置（其余上限Lv.2）· 房间效能+10%"
          : r === 2
            ? "保留最高2间房屋不重置（其余上限Lv.5）· 房间效能+20%"
            : "完整保留全部房屋等级（Lv.8）· 房间效能+30%",
  },
  {
    id: "astro_queue_cap",
    name: "行囊统筹",
    icon: "astro_queue_cap",
    constellation: "星轨座",
    maxRank: 3,
    costs: [2, 3, 4],
    summary: "永久扩充行动队列排程槽位上限",
    formatEffect: (r) => (r <= 0 ? "队列上限 5 项" : `行动队列上限 +${r}（共 ${5 + r} 项）`),
  },
  {
    id: "astro_boss_fortune",
    name: "猎首星辉",
    icon: "astro_boss_fortune",
    constellation: "天猎座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "提升怪物与首领的稀有掉落发现率",
    formatEffect: (r) => (r <= 0 ? "稀有发现 +0%" : `稀有掉落发现率 +${r * 12}%`),
  },
  {
    id: "astro_starter_kit",
    name: "传世行装",
    icon: "astro_starter_kit",
    constellation: "旅人座",
    maxRank: 3,
    costs: [1, 2, 3],
    summary: "转生后直接继承传世基础工具箱、补给药水与丰厚启动资金",
    formatEffect: (r) =>
      r <= 0
        ? "转生仅保留 100 金币"
        : r === 1
          ? "转生带 1,600 金币 + 3件采集锤斧镰与初级药食"
          : r === 2
            ? "转生带 4,100 金币 + 6件工具铁剑与中量药食"
            : "转生带 8,100 金币 + 全套10件基础工具盾剑与充沛补给",
  },
  {
    id: "astro_gather_crit",
    name: "丰饶双星",
    icon: "astro_gather_crit",
    constellation: "双禾座",
    maxRank: 3,
    costs: [2, 3, 5],
    summary: "采集类行动结算时有几率双倍产出",
    formatEffect: (r) => (r <= 0 ? "双倍采集率 0%" : `双倍采集率 +${r * 8}%`),
  },
  {
    id: "astro_craft_eff",
    name: "巧匠星轨",
    icon: "astro_craft_eff",
    constellation: "炉锤座",
    maxRank: 3,
    costs: [2, 3, 4],
    summary: "永久提高全生活技能行动效率（触发单周期免费连做）",
    formatEffect: (r) => (r <= 0 ? "生活效率 +0%" : `全生活技能效率 +${r * 8}%`),
  },
  {
    id: "astro_battle_vigor",
    name: "战神宿命",
    icon: "astro_battle_vigor",
    constellation: "破军座",
    maxRank: 3,
    costs: [2, 4, 6],
    summary: "强化单人战斗先天体魄与攻击，并提高战斗经验获取",
    formatEffect: (r) =>
      r <= 0
        ? "战斗加成 +0%"
        : `战斗经验 +${r * 10}% · 先天攻击 +${r * 4} · 生命 +${r * 25}`,
  },
];

export interface AstrolabeBonuses {
  houseKeepTopCount: number;
  houseKeepRestCap: number;
  houseBonusMult: number;
  extraQueueSlots: number;
  rareFindPct: number;
  starterGoldBonus: number;
  starterItems: Record<string, number>;
  gatherDoubleChance: number;
  lifeEfficiencyPct: number;
  combatXpMult: number;
  bonusAtk: number;
  bonusHp: number;
}

function starterKitForRank(rank: number): { goldBonus: number; items: Record<string, number> } {
  if (rank <= 0) return { goldBonus: 0, items: {} };
  if (rank === 1) {
    return {
      goldBonus: 1500,
      items: {
        weapon_logging_axe_t1: 1,
        weapon_forge_hammer_t1: 1,
        weapon_sickle_t1: 1,
        potion_hp_t1: 5,
        food_simple: 10,
      },
    };
  }
  if (rank === 2) {
    return {
      goldBonus: 4000,
      items: {
        weapon_logging_axe_t1: 1,
        weapon_forge_hammer_t1: 1,
        weapon_sickle_t1: 1,
        weapon_hoe_t1: 1,
        weapon_frying_pan_t1: 1,
        weapon_iron_sword: 1,
        potion_hp_t1: 10,
        food_simple: 20,
      },
    };
  }
  return {
    goldBonus: 8000,
    items: {
      weapon_logging_axe_t1: 1,
      weapon_forge_hammer_t1: 1,
      weapon_sickle_t1: 1,
      weapon_hoe_t1: 1,
      weapon_frying_pan_t1: 1,
      weapon_iron_sword: 1,
      weapon_scissors_t1: 1,
      weapon_alchemy_bottle_t1: 1,
      weapon_spatula_t1: 1,
      weapon_shield_t1: 1,
      potion_hp_t1: 20,
      food_simple: 30,
    },
  };
}

export function getAstrolabeRank(
  player: Pick<EnhancedPlayerState, "prestige"> | null | undefined,
  nodeId: string
): number {
  const raw = Number(player?.prestige?.astrolabe?.[nodeId] || 0);
  const def = PRESTIGE_ASTROLABE_NODES.find((n) => n.id === nodeId);
  if (!def || !Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(def.maxRank, Math.floor(raw));
}

export function getAstrolabeBonuses(
  player?: Pick<EnhancedPlayerState, "prestige"> | null
): AstrolabeBonuses {
  const rHouse = getAstrolabeRank(player, "astro_house_keep");
  const rQueue = getAstrolabeRank(player, "astro_queue_cap");
  const rBoss = getAstrolabeRank(player, "astro_boss_fortune");
  const rKit = getAstrolabeRank(player, "astro_starter_kit");
  const rGather = getAstrolabeRank(player, "astro_gather_crit");
  const rCraft = getAstrolabeRank(player, "astro_craft_eff");
  const rBattle = getAstrolabeRank(player, "astro_battle_vigor");
  const kit = starterKitForRank(rKit);
  return {
    houseKeepTopCount: rHouse === 1 ? 1 : rHouse === 2 ? 2 : rHouse >= 3 ? 99 : 0,
    houseKeepRestCap: rHouse === 1 ? 2 : rHouse === 2 ? 5 : rHouse >= 3 ? 8 : 0,
    houseBonusMult: 1 + rHouse * 0.1,
    extraQueueSlots: rQueue,
    rareFindPct: rBoss * 12,
    starterGoldBonus: kit.goldBonus,
    starterItems: kit.items,
    gatherDoubleChance: rGather * 0.08,
    lifeEfficiencyPct: rCraft * 8,
    combatXpMult: 1 + rBattle * 0.1,
    bonusAtk: rBattle * 4,
    bonusHp: rBattle * 25,
  };
}

function ensurePrestige(player: EnhancedPlayerState): PrestigeState {
  if (!player.prestige) player.prestige = { count: 0, points: 0, spentPoints: 0, astrolabe: {} };
  if (typeof player.prestige.spentPoints !== "number" || player.prestige.spentPoints < 0) {
    player.prestige.spentPoints = 0;
  }
  if (!player.prestige.astrolabe || typeof player.prestige.astrolabe !== "object") {
    player.prestige.astrolabe = {};
  }
  return player.prestige;
}

export function getAvailablePrestigePoints(player: EnhancedPlayerState): number {
  const p = ensurePrestige(player);
  return Math.max(0, Math.floor(p.points || 0) - Math.floor(p.spentPoints || 0));
}

/** 点亮/升级异世界传承星盘节点（消耗可用转生星尘，不削减累计转生点带来的全局基础倍率） */
export function upgradeAstrolabeNode(
  player: EnhancedPlayerState,
  nodeId: string
): { ok: boolean; reason?: string; nodeId?: string; newRank?: number; cost?: number; availablePoints?: number } {
  const p = ensurePrestige(player);
  const def = PRESTIGE_ASTROLABE_NODES.find((n) => n.id === nodeId);
  if (!def) return { ok: false, reason: "未知的传承星盘节点" };
  const currentRank = getAstrolabeRank(player, nodeId);
  if (currentRank >= def.maxRank) {
    return { ok: false, reason: `「${def.name}」已达最高星阶` };
  }
  const cost = def.costs[currentRank];
  const available = getAvailablePrestigePoints(player);
  if (available < cost) {
    return { ok: false, reason: `可用转生星尘不足（需要 ${cost} 点，当前可用 ${available} 点）` };
  }
  const nextRank = currentRank + 1;
  p.astrolabe![nodeId] = nextRank;
  p.spentPoints = (p.spentPoints || 0) + cost;
  appendLog(player, `点亮传承星盘「${def.name}」第 ${nextRank} 阶（消耗 ${cost} 星尘）`);
  return {
    ok: true,
    nodeId,
    newRank: nextRank,
    cost,
    availablePoints: getAvailablePrestigePoints(player),
  };
}

/** 重置异世界传承星盘并全额返还已投入的转生星尘 */
export function respecAstrolabe(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; refundedPoints?: number; availablePoints?: number } {
  const p = ensurePrestige(player);
  const refunded = Math.floor(p.spentPoints || 0);
  if (refunded <= 0 && Object.keys(p.astrolabe || {}).length === 0) {
    return { ok: false, reason: "当前星盘尚未投入任何转生星尘" };
  }
  if (Array.isArray(player.activityQueue) && player.activityQueue.length > 5) {
    return { ok: false, reason: "请先将行动队列缩减至 5 项以内再重置星盘" };
  }
  p.spentPoints = 0;
  p.astrolabe = {};
  appendLog(player, `重置异世界传承星盘，返还 ${refunded} 点转生星尘`);
  return {
    ok: true,
    refundedPoints: refunded,
    availablePoints: getAvailablePrestigePoints(player),
  };
}

/** 转生全局倍率（>=1） */
export function getPrestigeMultiplier(player: EnhancedPlayerState): number {
  const p = player.prestige?.points || 0;
  return 1 + p * PRESTIGE_BONUS_PER_POINT;
}

/** 根据当前进度估算本次转生可获得的转生点 */
export function estimatePrestigePoints(player: EnhancedPlayerState): number {
  const lvl = player.combatLevel || 1;
  // 综合战斗等级与各职业等级之和，做平方根压缩，避免线性膨胀
  let skillSum = 0;
  for (const s of Object.values(player.skills || {})) skillSum += (s.level || 1);
  const raw = lvl + skillSum / 3;
  return Math.max(0, Math.floor(Math.sqrt(raw) * 2 - 8));
}

/** 转生面板信息 */
export function getPrestigeInfo(player: EnhancedPlayerState) {
  const p = ensurePrestige(player);
  const canPrestige = (player.combatLevel || 1) >= PRESTIGE_MIN_COMBAT_LEVEL;
  const availablePoints = getAvailablePrestigePoints(player);
  const bonuses = getAstrolabeBonuses(player);
  const astrolabeNodes = PRESTIGE_ASTROLABE_NODES.map((n) => {
    const rank = getAstrolabeRank(player, n.id);
    const nextCost = rank < n.maxRank ? n.costs[rank] : null;
    return {
      id: n.id,
      name: n.name,
      icon: n.icon,
      constellation: n.constellation,
      rank,
      maxRank: n.maxRank,
      nextCost,
      summary: n.summary,
      currentEffect: n.formatEffect(rank),
      nextEffect: rank < n.maxRank ? n.formatEffect(rank + 1) : null,
      canUpgrade: nextCost !== null && availablePoints >= nextCost,
    };
  });
  return {
    count: p.count,
    points: p.points,
    spentPoints: p.spentPoints || 0,
    availablePoints,
    multiplier: getPrestigeMultiplier(player),
    multiplierPercent: Math.round((getPrestigeMultiplier(player) - 1) * 100),
    minCombatLevel: PRESTIGE_MIN_COMBAT_LEVEL,
    currentCombatLevel: player.combatLevel || 1,
    canPrestige,
    pointsOnPrestige: canPrestige ? estimatePrestigePoints(player) : 0,
    bonusPerPoint: Math.round(PRESTIGE_BONUS_PER_POINT * 100),
    astrolabeNodes,
    bonuses,
  };
}

/**
 * 执行转生：
 * - 校验最低战斗等级
 * - 授予转生点
 * - 重置：战斗等级/经验、各职业等级/经验、背包（保留启动金币与传世行装）、装备穿戴、活动状态、未受星盘庇护的房屋等级
 * - 保留：声望、成就、转生点与传承星盘、统计（生涯累计）
 */
export function doPrestige(
  player: EnhancedPlayerState
): { ok: boolean; reason?: string; gainedPoints?: number; totalPoints?: number; multiplier?: number } {
  ensurePrestige(player);
  if ((player.combatLevel || 1) < PRESTIGE_MIN_COMBAT_LEVEL) {
    return { ok: false, reason: `战斗等级需达到 ${PRESTIGE_MIN_COMBAT_LEVEL} 级才能转生` };
  }
  const gained = estimatePrestigePoints(player);
  if (gained <= 0) return { ok: false, reason: "当前进度不足以获得转生点" };

  const bonuses = getAstrolabeBonuses(player);

  player.prestige!.count += 1;
  player.prestige!.points += gained;
  player.prestige!.lastPrestigeAt = new Date().toISOString();

  // 排行榜按历史最高算，转生不会掉榜
  if (player.stats) player.stats.bestTotalLevel = Math.max(player.stats.bestTotalLevel || 0, totalLevelOf(player));

  // 重置进度（含派生 combatLevel 的战斗技能，否则下次 ensureCombatSkills 会把等级推导回来，
  // 转生等于没有重置并可被无限重复刷取转生点）
  player.combatLevel = 1;
  player.combatXp = 0;
  player.combatSkills = defaultCombatSkills(1);
  for (const k of Object.keys(player.skills || {})) {
    player.skills[k].level = 1;
    player.skills[k].xp = 0;
    player.skills[k].unlockedRecipes = [];
    player.skills[k].enhancementLevel = 0;
  }
  if (player.tasksState) {
    player.tasksState.tasks = [];
    player.tasksState.nextTaskAt = new Date().toISOString();
  }
  // 灵居恒存（astro_house_keep）：按星盘等阶保留最高等级房屋与其他房间上限，未点亮则重置房屋
  if (player.house?.rooms) {
    if (bonuses.houseKeepTopCount <= 0 && bonuses.houseKeepRestCap <= 0) {
      player.house.rooms = {};
    } else {
      const sorted = Object.entries(player.house.rooms)
        .filter(([, lv]) => Number(lv) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]));
      const nextRooms: Record<string, number> = {};
      sorted.forEach(([roomId, lv], idx) => {
        const kept = idx < bonuses.houseKeepTopCount ? Number(lv) : Math.min(Number(lv), bonuses.houseKeepRestCap);
        if (kept > 0) nextRooms[roomId] = kept;
      });
      player.house.rooms = nextRooms;
    }
  }
  // 背包重置（保留启动金币 + 传世行装工具与补给），装备卸下；进行中的战斗/刷关/强化计时/队列等暂态一并清掉
  player.inventory = {
    gold: 100 + bonuses.starterGoldBonus,
    ...bonuses.starterItems,
  };
  player.equipment = { enhancementLevels: {}, durability: {}, maxDurability: {} };
  player.activeBuffs = [];
  player.mode = "idle";
  player.lifeActionState = undefined;
  player.combatFarmState = undefined;
  player.hpCombat = undefined;
  player.combatHp = undefined;
  player.combatHpAt = undefined;
  player.enhanceRun = undefined;
  player.activityQueue = [];
  player.combatLoadout = undefined;
  // 难度档位选回普通（已开放的档位随统计保留）
  player.zoneTiers = undefined;
  if (player.alchemyCauldron) {
    ensureAlchemyCauldron(player);
  }
  if (player.astralRelics) {
    ensureAstralRelics(player);
  }
  // WL-10：天空锻炉神兵纹章等阶与已签契约跨转生永久保留（此处只净化，不重置）
  if (player.skyForge) {
    ensureSkyForge(player);
  }
  // WL-11：海港水族馆收藏图鉴、奖杯柜、稀有鱼饵配方与鱼饵库存跨转生永久保留（无参净化，不翻周）
  if (player.harborDerby) {
    ensureHarborDerby(player);
  }
  if (player.harborAquarium) {
    ensureHarborAquarium(player);
  }
  // WL-12：冒险者学院四系学分 / 结业记录 / 进行中的课程与四季纪念章跨转生永久保留（无参净化，不结业、不翻季）
  if (player.adventurerAcademy) {
    ensureAdventurerAcademy(player);
  }
  if (player.festivalCalendar) {
    ensureFestivalCalendar(player);
  }
  // WL-13：天空竞技场赛季梯级 / 称号 / 竞技场勋章与公会城镇设施跨转生永久保留（无参净化，不翻季、不换日）
  if (player.skyArena) {
    ensureSkyArena(player);
  }
  if (player.guildTown) {
    ensureGuildTown(player);
  }
  // WL-14：契约魔兽牧场（魔兽 / 等级 / 出战伙伴）与天候观星塔（占卜 / 祈愿 / 阅历）跨转生永久保留（无参净化，不换日）
  if (player.beastRanch) {
    ensureBeastRanch(player);
  }
  if (player.weatherTower) {
    ensureWeatherTower(player);
  }
  // WL-15：吟游诗人酒馆（名望 / 招待记录 / 正在演唱的诗篇）与冒险者编年史（已编撰章节 / 称号）跨转生永久保留（无参净化，不换日）
  if (player.bardTavern) {
    ensureBardTavern(player);
  }
  if (player.adventurerChronicle) {
    ensureAdventurerChronicle(player);
  }
  // WL-16：浮空飞艇商路（已开辟航线 / 航线等级 / 船体 / 停靠港 / 进行中的航程）与圣骑士团荣誉试炼（勋章 / 誓言 / 本周进度）
  // 跨转生永久保留（无参净化，不换日、不翻周、不抵港）；货舱里的特产随转生清空——金币已重置，不能借货物把旧世界的财富带进新一世
  if (player.airshipTrade) {
    clearAirshipCargoForPrestige(player);
  }
  if (player.paladinTrial) {
    ensurePaladinTrial(player);
  }
  // WL-17：矮人地底矿脉（矿道深度 / 矿车 / 今日矿脉进度 / 累计记录）与精灵林地驿站（林地好感 / 今日委托板 / 远征基线）
  // 跨转生永久保留（无参净化，不换日、不回矿）；在途矿车里的矿石随转生散去——背包已重置，不能借矿车把旧世界的财富带进新一世
  if (player.dwarfMine) {
    clearDwarfMineHaulForPrestige(player);
  }
  if (player.elfWaystation) {
    ensureElfWaystation(player);
  }
  // WL-18：深海遗迹潜航（潜水装备 / 今日遗迹进度 / 累计记录）与冒险者行会公会战（行会勋章 / 位阶 / 本周战绩）
  // 跨转生永久保留（无参净化，不换日、不翻周）；打捞品早已入背包，随背包一起重置
  if (player.abyssDive) {
    ensureAbyssDive(player);
  }
  if (player.guildWar) {
    ensureGuildWar(player);
  }

  const mult = getPrestigeMultiplier(player);
  appendLog(
    player,
    `转生成功！这是第 ${player.prestige!.count} 次转生，获得 ${gained} 转生点，经验与战斗金币永久 +${Math.round((mult - 1) * 100)}%`
  );
  return { ok: true, gainedPoints: gained, totalPoints: player.prestige!.points, multiplier: mult };
}

/** 转生别名（与 doPrestige 等价，确保永久保留奇美拉炼金宗师图谱、炼金等阶与魔药槽状态） */
export function performReincarnation(player: EnhancedPlayerState) {
  return doPrestige(player);
}
