/**
 * 真人排行榜（WL-G4）：总等级 / 战斗等级 / 最远区域 三个榜。
 *
 * - 数据只取服务端存档，不接受客户端上报的分数。
 * - 只列真人：系统队友、商会补给站不上榜；没起名字（默认名）、名字看不见或冒充系统的不上榜；数值不合法的不上榜。
 * - 名字与登录账号名相同的打码展示（display_name.ts），不把账号名公开出去。
 * - 不逐请求扫全表：每个榜的前 100 名缓存 LEADERBOARD_TTL_MS；名次按「分数」缓存，分数种类有限，查询次数有上界。
 *   内存存储最多每 5 秒重排一次；PostgreSQL 用 player_rankings 表（分数一变就更新）加降序索引。
 * - 转生会把等级清零，所以总等级、战斗等级按历史最高算。
 */
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import { COMBAT_SKILL_IDS, derivedCombatLevel, totalLevelOf } from "./combat_skills";
import { isPlainDisplayName, isReservedName, maskAccountName } from "./display_name";
import { MAX_SKILL_LEVEL } from "./growth_curves";
import { isGarbledOrDefaultName } from "./party_bots";
import type { EnhancedPlayerState, UserRecord } from "./types";
import { ZONE_TIER_COUNT, ZONE_TIER_NAMES, zoneTierKills } from "./zone_tiers";
import { OPEN_ZONE_IDS } from "./zones";

export const RANK_BOARDS = ["total", "combat", "zone"] as const;
export type RankBoard = (typeof RANK_BOARDS)[number];
export const LEADERBOARD_LIMIT = 100;
export const LEADERBOARD_TTL_MS = 60_000;

export type RankScores = Record<RankBoard, number>;
export type RankEntry = { name: string } & RankScores;
export type RankRow = { userId: string; name: string; score: number };
/** 没上榜的原因：没起名字 / 系统账号或数据异常。 */
export type RankHidden = "no_name" | "excluded";
export type LeaderboardView = {
  board: RankBoard;
  entries: Array<{ rank: number; name: string; score: number; label: string; me: boolean }>;
  me: { listed: true; rank: number; score: number; label: string } | { listed: false; reason: RankHidden };
};

/** 系统账号（组队陪练、市场补给站）的设备名，SQL 与内存两处用同一份。 */
export const SYSTEM_DEVICES = { prefix: "party_bot_", exact: "商会补给站" } as const;

export function isSystemAccount(user: Pick<UserRecord, "guestDeviceId"> | null | undefined): boolean {
  const device = user?.guestDeviceId;
  return Boolean(device) && (device!.startsWith(SYSTEM_DEVICES.prefix) || device === SYSTEM_DEVICES.exact);
}

const ZONES = OPEN_ZONE_IDS.map((id) => {
  const stage = (packJson.stages as Array<{ id: string; name: string; monsters?: string[] }>).find((s) => s.id === id);
  return { id, name: stage?.name ?? id, monsters: stage?.monsters ?? [] };
});

/** 区域榜的分数：区域先比、难度档后比。0 = 哪里都没打过。 */
export function zoneScore(zoneIndex: number, tier: number): number {
  return zoneIndex * ZONE_TIER_COUNT + tier + 1;
}

export function zoneLabel(score: number): string {
  const zone = score > 0 ? ZONES[Math.floor((score - 1) / ZONE_TIER_COUNT)] : undefined;
  if (!zone) return "还没出发";
  const tier = (score - 1) % ZONE_TIER_COUNT;
  return tier > 0 ? `${zone.name} · ${ZONE_TIER_NAMES[tier]}` : zone.name;
}

export function scoreLabel(board: RankBoard, score: number): string {
  return board === "zone" ? zoneLabel(score) : `${score} 级`;
}

function furthestZone(state: EnhancedPlayerState): number {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    for (let tier = ZONE_TIER_COUNT - 1; tier >= 0; tier--) {
      if (zoneTierKills(state.stats, ZONES[i], tier) > 0) return zoneScore(i, tier);
    }
  }
  return 0;
}

/** 空着或 0 按 1 级算，与总等级的算法一致。 */
const validLevel = (v: unknown) =>
  v === undefined || v === null || v === 0 || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_SKILL_LEVEL);
const validXp = (v: unknown) => v === undefined || v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);

/** 三个榜的分数；等级、经验不是合法数字就返回 null（不上榜）。 */
export function rankScores(state: EnhancedPlayerState): RankScores | null {
  const rows = [...Object.values(state.skills ?? {}), ...Object.values(state.combatSkills ?? {})] as Array<{ level?: unknown; xp?: unknown } | undefined>;
  for (const row of rows) if (!validLevel(row?.level) || !validXp(row?.xp)) return null;
  const bestCombat = state.stats?.highestCombatLevel;
  if (!validLevel(state.combatLevel) || !validLevel(bestCombat)) return null;
  const cap = (Object.keys(state.skills ?? {}).length + COMBAT_SKILL_IDS.length) * MAX_SKILL_LEVEL;
  const bestTotal = state.stats?.bestTotalLevel ?? 0;
  if (!Number.isInteger(bestTotal) || bestTotal < 0 || bestTotal > cap) return null;
  const combat = state.combatSkills ? derivedCombatLevel(state.combatSkills) : state.combatLevel || 1;
  return {
    total: Math.max(totalLevelOf(state), bestTotal),
    combat: Math.max(combat, bestCombat || 1),
    zone: furthestZone(state),
  };
}

/** 能上榜的名字：玩家自己起的；默认名、像编号的、看不见的、带特殊字符的、冒充系统的都不算。 */
export function rankName(state: EnhancedPlayerState): string | null {
  const name = state.settings?.playerName?.trim();
  if (!name || !isPlainDisplayName(name) || isGarbledOrDefaultName(name.normalize("NFKC")) || isReservedName(name)) return null;
  return name;
}

export function rankEntry(
  state: EnhancedPlayerState,
  user: (Pick<UserRecord, "guestDeviceId"> & Partial<Pick<UserRecord, "username">>) | null
): RankEntry | RankHidden {
  if (!user || isSystemAccount(user)) return "excluded";
  const name = rankName(state);
  if (!name) return "no_name";
  const scores = rankScores(state);
  return scores ? { name: maskAccountName(name, user.username), ...scores } : "excluded";
}

/** 同分同名次：1、2、2、4。 */
export function withRanks<T extends { score: number }>(rows: T[]): Array<T & { rank: number }> {
  const out: Array<T & { rank: number }> = [];
  rows.forEach((row, i) => out.push({ ...row, rank: i > 0 && rows[i - 1].score === row.score ? out[i - 1].rank : i + 1 }));
  return out;
}

/** 高分在前；同分按编号排，保证每次顺序一样。 */
export function sortRows(rows: RankRow[]): RankRow[] {
  return rows.sort((a, b) => b.score - a.score || (a.userId < b.userId ? -1 : 1));
}

/** 已按分数从高到低排好的列表里，比 score 高的有几个。 */
export function countHigher(sorted: RankRow[], score: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].score > score) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type RankSource = {
  top(board: RankBoard, limit: number): Promise<RankRow[]>;
  countAbove(board: RankBoard, score: number): Promise<number>;
};

/** 两个存储共用的缓存：前 100 名与「比这个分数高的人数」各缓存一个 TTL，并发请求合并成一次查询。 */
export function createRankCache(source: RankSource, ttlMs = LEADERBOARD_TTL_MS) {
  type Slot<T> = { at: number; value: Promise<T> };
  const tops = new Map<RankBoard, Slot<RankRow[]>>();
  const counts = new Map<string, Slot<number>>();

  function cached<K, T>(map: Map<K, Slot<T>>, key: K, now: number, load: () => Promise<T>): Promise<T> {
    const hit = map.get(key);
    if (hit && now >= hit.at && now - hit.at < ttlMs) return hit.value;
    const slot: Slot<T> = { at: now, value: load() };
    map.set(key, slot);
    slot.value.catch(() => {
      if (map.get(key) === slot) map.delete(key);
    });
    return slot.value;
  }

  return {
    async view(params: { board: RankBoard; userId: string; entry: RankEntry | RankHidden; now: Date }): Promise<LeaderboardView> {
      const { board, userId, entry } = params;
      const now = params.now.getTime();
      const rows = await cached(tops, board, now, () => source.top(board, LEADERBOARD_LIMIT));
      const hidden = typeof entry === "string";
      // 刚改名、刚清空名字的人，缓存里可能还是旧名字：对本人立刻换掉，对别人最多再留一个 TTL
      const entries = withRanks(hidden ? rows.filter((r) => r.userId !== userId) : rows).map((r) => ({
        rank: r.rank,
        name: !hidden && r.userId === userId ? entry.name : r.name,
        score: r.score,
        label: scoreLabel(board, r.score),
        me: r.userId === userId,
      }));
      if (hidden) return { board, entries, me: { listed: false, reason: entry } };
      const score = entry[board];
      if (counts.size > 5000) counts.clear();
      const above = await cached(counts, `${board}:${score}`, now, () => source.countAbove(board, score));
      return { board, entries, me: { listed: true, rank: above + 1, score, label: scoreLabel(board, score) } };
    },
    /** 有人注销：下一次请求重新取。 */
    clear() {
      tops.clear();
      counts.clear();
    },
  };
}
