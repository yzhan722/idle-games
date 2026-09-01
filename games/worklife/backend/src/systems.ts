/**
 * 游戏系统模块：消耗品/Buff、每日签到、商店。
 *
 * 设计原则：
 * - 所有函数为纯函数风格，直接在传入的 player 对象上原地修改并返回结果信息。
 * - 不直接读写存储；由路由层负责 getOrCreatePlayerState -> simulateToNow -> 调用本模块 -> savePlayerState。
 * - 与内容包（ContentPack）解耦：items/actions 为松散类型 Array<Record<string, unknown>>，
 *   因此这里通过 helper 安全读取字段。
 */
import type {
  EnhancedPlayerState,
  EnhancedContentPack,
  ActiveBuff,
  CheckInState
} from "./types";
import { appendLog, getBuffEffects, pruneExpiredBuffs } from "./storage";
import { todayLocal as todayLocalImpl, dayDiff } from "./time";

// 重新导出供路由层使用
export { getBuffEffects, pruneExpiredBuffs };

/* ----------------------------- 通用工具 ----------------------------- */

type AnyItem = Record<string, any>;

/** 从内容包中按 id 查找物品定义 */
export function findItem(contentPack: EnhancedContentPack, itemId: string): AnyItem | undefined {
  return (contentPack.items as AnyItem[]).find((it) => it.id === itemId);
}

// 时区/日期工具统一收敛到 time.ts（无依赖，避免循环引用）。
// 重新导出以兼容历史调用点：todayUtc 现等价于东八区的 todayLocal。
export { DAILY_RESET_TZ_OFFSET_MINUTES, todayLocal } from "./time";
export { dayDiff };

/**
 * 历史命名：返回当前“业务当日”日期字符串 YYYY-MM-DD。
 * 现已对齐到东八区（不再是 UTC），保留此名以兼容既有调用点。
 */
export function todayUtc(now: Date = new Date()): string {
  return todayLocalImpl(now);
}

/* ----------------------------- 消耗品 / Buff ----------------------------- */

export type ConsumeResult =
  | { ok: true; itemName: string; healed?: { hp?: number; mp?: number }; buff?: ActiveBuff }
  | { ok: false; reason: string };

/**
 * 使用一个消耗品（食物/药水）。
 * - 校验库存
 * - instant 效果：恢复 HP/MP
 * - buff 效果：写入/刷新 activeBuffs（同一 buff.id 刷新过期时间，不叠加层数）
 */
export function consumeItem(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  itemId: string,
  now: Date = new Date()
): ConsumeResult {
  const def = findItem(contentPack, itemId);
  if (!def) return { ok: false, reason: "物品不存在" };
  if (def.type !== "food" && def.type !== "consumable") {
    return { ok: false, reason: "该物品不可使用" };
  }
  const have = player.inventory[itemId] || 0;
  if (have < 1) return { ok: false, reason: "库存不足" };

  const effect = (def.effect || {}) as AnyItem;

  // 先扣库存
  player.inventory[itemId] = have - 1;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];

  // 即时恢复（HP/MP）——仅记录日志，HP/MP 在战斗为收益式简化模型中并非硬约束
  const healed: { hp?: number; mp?: number } = {};
  if (typeof effect.hp === "number") healed.hp = effect.hp;
  if (typeof effect.mp === "number") healed.mp = effect.mp;

  // Buff 效果
  let appliedBuff: ActiveBuff | undefined;
  if (effect.buff && typeof effect.buff === "object") {
    const bdef = effect.buff as AnyItem;
    const durationSec: number = Number(bdef.durationSec) || 0;
    const expiresAt = new Date(now.getTime() + durationSec * 1000).toISOString();
    const buff: ActiveBuff = {
      id: String(bdef.id || itemId),
      name: String(bdef.name || def.name || "增益"),
      sourceItemId: itemId,
      expiresAt,
      multipliers: bdef.multipliers,
      stats: bdef.stats
    };
    if (!player.activeBuffs) player.activeBuffs = [];
    // 同 id 刷新（取较晚过期时间）
    const idx = player.activeBuffs.findIndex((b) => b.id === buff.id);
    if (idx >= 0) {
      const existing = player.activeBuffs[idx];
      buff.expiresAt =
        Date.parse(existing.expiresAt) > Date.parse(buff.expiresAt)
          ? existing.expiresAt
          : buff.expiresAt;
      player.activeBuffs[idx] = buff;
    } else {
      player.activeBuffs.push(buff);
    }
    appliedBuff = buff;
  }

  const parts: string[] = [];
  if (healed.hp) parts.push(`恢复生命 ${healed.hp}`);
  if (healed.mp) parts.push(`恢复魔力 ${healed.mp}`);
  if (appliedBuff) parts.push(`获得增益「${appliedBuff.name}」`);
  appendLog(player, `使用了 ${def.name}${parts.length ? "，" + parts.join("、") : ""}`);

  return { ok: true, itemName: String(def.name || itemId), healed, buff: appliedBuff };
}

/* ----------------------------- 每日签到 ----------------------------- */

/**
 * 连续签到 14 天为一个周期，奖励随连续天数递增。
 * 第 N 天（1..14）奖励金币与材料；第 7、14 天给予稀有大奖，第 14 天为终局材料巨奖。
 */
export const CHECKIN_REWARDS: Array<{ day: number; gold: number; items: Record<string, number>; label: string }> = [
  { day: 1, gold: 200, items: { ore_1: 5 }, label: "第1天" },
  { day: 2, gold: 350, items: { wood_2: 5 }, label: "第2天" },
  { day: 3, gold: 500, items: { ingot_1: 3 }, label: "第3天" },
  { day: 4, gold: 700, items: { crystal_1: 3 }, label: "第4天" },
  { day: 5, gold: 1000, items: { food_hearty_stew: 2 }, label: "第5天" },
  { day: 6, gold: 1500, items: { potion_fortune: 1 }, label: "第6天" },
  { day: 7, gold: 3000, items: { elixir_legend: 1, crystal_7: 1 }, label: "第7天（周奖）" },
  { day: 8, gold: 4000, items: { ingot_7: 3 }, label: "第8天" },
  { day: 9, gold: 5000, items: { crystal_7: 2 }, label: "第9天" },
  { day: 10, gold: 6500, items: { void_shard: 2, shadow_silk: 2 }, label: "第10天" },
  { day: 11, gold: 8000, items: { celestial_feather: 2 }, label: "第11天" },
  { day: 12, gold: 10000, items: { holy_gold: 1, abyss_core: 1 }, label: "第12天" },
  { day: 13, gold: 13000, items: { rift_crystal: 1, elixir_legend: 2 }, label: "第13天" },
  { day: 14, gold: 20000, items: { sovereign_heart: 1, space_essence: 2, crystal_9: 1 }, label: "第14天（终极巨奖）" },
  { day: 15, gold: 24000, items: { ingot_9: 3 }, label: "第15天" },
  { day: 16, gold: 28000, items: { crystal_9: 3 }, label: "第16天" },
  { day: 17, gold: 33000, items: { hellfire_ember: 2, infernal_core: 1 }, label: "第17天" },
  { day: 18, gold: 40000, items: { genesis_light: 1, divine_essence: 1 }, label: "第18天" },
  { day: 19, gold: 48000, items: { ingot_11: 2, elixir_mythic: 1 }, label: "第19天" },
  { day: 20, gold: 60000, items: { cosmos_essence: 1, eternity_crystal: 1 }, label: "第20天" },
  { day: 21, gold: 100000, items: { omega_heart: 1, god_heart: 1, elixir_omega: 1 }, label: "第21天（神话级巨奖）" }
];

export type CheckInResult =
  | { ok: true; reward: { gold: number; items: Record<string, number> }; streak: number; totalDays: number; cycleDay: number }
  | { ok: false; reason: string };

/** 返回签到面板信息（不发放奖励） */
export function getCheckInInfo(player: EnhancedPlayerState, now: Date = new Date()): {
  canCheckIn: boolean;
  streak: number;
  totalDays: number;
  nextCycleDay: number;
  rewards: typeof CHECKIN_REWARDS;
  lastDate?: string;
} {
  const today = todayUtc(now);
  const st = player.checkIn;
  let nextStreak = 1;
  if (st) {
    const diff = dayDiff(st.lastDate, today);
    if (diff === 0) nextStreak = st.streak; // 今天已签
    else if (diff === 1) nextStreak = st.streak + 1;
    else nextStreak = 1; // 断签重置
  }
  const cycleDay = ((nextStreak - 1) % CHECKIN_REWARDS.length) + 1;
  return {
    canCheckIn: !st || dayDiff(st.lastDate, today) >= 1,
    streak: st?.streak || 0,
    totalDays: st?.totalDays || 0,
    nextCycleDay: cycleDay,
    rewards: CHECKIN_REWARDS,
    lastDate: st?.lastDate
  };
}

/** 执行签到，发放奖励 */
export function doCheckIn(player: EnhancedPlayerState, now: Date = new Date()): CheckInResult {
  const today = todayUtc(now);
  let st: CheckInState = player.checkIn || { lastDate: "", streak: 0, totalDays: 0 };

  if (st.lastDate) {
    const diff = dayDiff(st.lastDate, today);
    if (diff === 0) return { ok: false, reason: "今天已经签到过了" };
    if (diff === 1) st = { ...st, streak: st.streak + 1 };
    else st = { ...st, streak: 1 }; // 断签
  } else {
    st = { lastDate: "", streak: 1, totalDays: st.totalDays };
  }
  st.lastDate = today;
  st.totalDays = (st.totalDays || 0) + 1;

  const cycleDay = ((st.streak - 1) % CHECKIN_REWARDS.length) + 1;
  const reward = CHECKIN_REWARDS[cycleDay - 1];

  // 发放
  player.inventory["gold"] = (player.inventory["gold"] || 0) + reward.gold;
  for (const [itemId, qty] of Object.entries(reward.items)) {
    player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
  }
  if (player.stats) player.stats.totalGoldEarned += reward.gold;

  player.checkIn = st;
  const itemText = Object.entries(reward.items).map(([k, v]) => `${k} x${v}`).join("、");
  appendLog(player, `每日签到成功（连续${st.streak}天）：获得金币 ${reward.gold}${itemText ? "、" + itemText : ""}`);

  return {
    ok: true,
    reward: { gold: reward.gold, items: reward.items },
    streak: st.streak,
    totalDays: st.totalDays,
    cycleDay
  };
}

/* ----------------------------- 商店 / NPC 买卖 ----------------------------- */

/**
 * 商店定价规则：
 * - 基础价由物品 tier 决定（tier 越高越贵）。
 * - 出售价（玩家卖给NPC）= 基础价 * SELL_RATE。
 * - 购买价（玩家从NPC买）= 基础价 * BUY_MARKUP。
 * 这样形成稳定的金币回收（gold sink）与基础物资补给渠道。
 */
const TIER_BASE_PRICE: Record<number, number> = {
  1: 20,
  2: 60,
  3: 150,
  4: 400,
  5: 1000,
  6: 2500,
  7: 6000,
  8: 14000,
  9: 32000,
  10: 70000,
  11: 150000,
  12: 320000
};
const SELL_RATE = 0.35; // 卖出回收率
const BUY_MARKUP = 1.0; // 购买加价系数（基础价即售价）

/** 单个物品基础价 */
function basePrice(def: AnyItem): number {
  const tier = Number(def.tier) || 1;
  const explicit = Number(def.value || def.basePrice);
  if (explicit > 0) return explicit;
  return TIER_BASE_PRICE[tier] || tier * 30;
}

export function sellPrice(def: AnyItem): number {
  return Math.max(1, Math.floor(basePrice(def) * SELL_RATE));
}
export function buyPrice(def: AnyItem): number {
  return Math.max(1, Math.floor(basePrice(def) * BUY_MARKUP));
}

/**
 * 商店在售商品列表（NPC 提供的基础补给）。
 * 仅出售基础材料/食物/药水，避免破坏高阶装备的产出循环。
 */
export const SHOP_STOCK_IDS = [
  "wood_1",
  "ore_1",
  "fiber_1",
  "lumber_1",
  "ingot_1",
  "crystal_1",
  "wood_2",
  "ore_2",
  "fiber_2",
  "food_simple",
  "drink_basic",
  "potion_hp_t1",
  "potion_mp_t1",
  "food_hearty_stew",
  "food_master_feast",
  "potion_craft_focus",
  "potion_battle_fury",
  "potion_fortune",
  "potion_scholar",
  "elixir_legend",
  "fiber_3",
  "lumber_2",
  "crystal_2",
  "food_royal_banquet",
  "drink_arcane",
  "potion_harvest",
  "potion_berserk",
  "potion_artisan",
  "elixir_mythic"
];

export function getShopStock(contentPack: EnhancedContentPack): Array<AnyItem & { buyPrice: number }> {
  const out: Array<AnyItem & { buyPrice: number }> = [];
  for (const id of SHOP_STOCK_IDS) {
    const def = findItem(contentPack, id);
    if (def) out.push({ ...def, buyPrice: buyPrice(def) });
  }
  return out;
}

export type TradeResult =
  | { ok: true; gold: number; itemId: string; qty: number; unitPrice: number; total: number }
  | { ok: false; reason: string };

/** 玩家从商店购买物品 */
export function buyFromShop(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  itemId: string,
  qty: number
): TradeResult {
  if (!SHOP_STOCK_IDS.includes(itemId)) return { ok: false, reason: "商店未出售该物品" };
  if (!Number.isFinite(qty) || qty < 1) return { ok: false, reason: "数量无效" };
  const def = findItem(contentPack, itemId);
  if (!def) return { ok: false, reason: "物品不存在" };

  const unit = buyPrice(def);
  const total = unit * qty;
  const gold = player.inventory["gold"] || 0;
  if (gold < total) return { ok: false, reason: "金币不足" };

  player.inventory["gold"] = gold - total;
  player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
  if (player.stats) player.stats.totalGoldSpent += total;
  appendLog(player, `从商店购买 ${def.name} x${qty}，花费金币 ${total}`);

  return { ok: true, gold: player.inventory["gold"], itemId, qty, unitPrice: unit, total };
}

/** 玩家出售物品给商店 */
export function sellToShop(
  player: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  itemId: string,
  qty: number
): TradeResult {
  if (itemId === "gold") return { ok: false, reason: "金币不可出售" };
  if (!Number.isFinite(qty) || qty < 1) return { ok: false, reason: "数量无效" };
  const def = findItem(contentPack, itemId);
  if (!def) return { ok: false, reason: "物品不存在" };
  const have = player.inventory[itemId] || 0;
  if (have < qty) return { ok: false, reason: "库存不足" };

  const unit = sellPrice(def);
  const total = unit * qty;
  player.inventory[itemId] = have - qty;
  if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
  player.inventory["gold"] = (player.inventory["gold"] || 0) + total;
  if (player.stats) player.stats.totalGoldEarned += total;
  appendLog(player, `向商店出售 ${def.name} x${qty}，获得金币 ${total}`);

  return { ok: true, gold: player.inventory["gold"], itemId, qty, unitPrice: unit, total };
}
