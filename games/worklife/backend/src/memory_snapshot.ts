import { CURRENT_CURVE_VERSION } from "./curve_migration";
import type { ChatReport } from "./chat_moderation";
import type { CircleDoc } from "./circle";
import type { PlayerCommandReceipt } from "./player_commands";
import type { TradeRecord, TradingOrder } from "./storage";
import type { EnhancedPlayerState, EnhancementServiceRequest, Party, PriceHistory, UserRecord } from "./types";

export type MemorySnapshot = {
  version: 1;
  users: UserRecord[];
  states: Array<[string, EnhancedPlayerState]>;
  parties: Party[];
  /** userId -> committed operation receipts (idempotent replay protection). */
  commandReceipts?: Array<[string, PlayerCommandReceipt[]]>;
  /** Open market orders (with escrowed items/gold). */
  tradingOrders?: TradingOrder[];
  /** Market price history per itemId. */
  priceHistory?: Array<[string, PriceHistory[]]>;
  /** Pending/completed enhancement service requests. */
  enhancementServiceRequests?: EnhancementServiceRequest[];
  /** Provider service statistics (completed count & ratings). */
  enhancementServiceStats?: Array<[string, { completed: number; totalRating: number; ratingCount: number }]>;
  /** Recent trades per itemId (price estimates). */
  tradeHistory?: Array<[string, TradeRecord[]]>;
  /** userId -> deletion time of accounts deleted in the last 30 days (account_deletion.ts). */
  deletedAccounts?: Array<[string, string]>;
  /** Anonymous retention counters, "YYYY-MM-DD|event" -> count (retention_metrics.ts). */
  metricsDaily?: Array<[string, number]>;
  /** userId -> userIds this player blocked in chat (chat_moderation.ts). */
  chatBlocks?: Array<[string, string[]]>;
  /** Chat reports kept for REPORT_KEEP_DAYS (chat_moderation.ts). */
  chatReports?: ChatReport[];
  /** 同好会（circle.ts）：成员、申请、邀请。 */
  circles?: CircleDoc[];
  /** XP-curve version of the build that wrote this file (older builds drop the field). */
  curveWriter?: number;
};

export function emptySnapshot(): MemorySnapshot {
  return { version: 1, users: [], states: [], parties: [] };
}

export function buildSnapshot(input: {
  users: Iterable<UserRecord>;
  states: Iterable<[string, EnhancedPlayerState]>;
  parties: Iterable<Party>;
  commandReceipts?: Iterable<[string, PlayerCommandReceipt[]]>;
  tradingOrders?: Iterable<TradingOrder>;
  priceHistory?: Iterable<[string, PriceHistory[]]>;
  enhancementServiceRequests?: Iterable<EnhancementServiceRequest>;
  enhancementServiceStats?: Iterable<[string, { completed: number; totalRating: number; ratingCount: number }]>;
  tradeHistory?: Iterable<[string, TradeRecord[]]>;
  deletedAccounts?: Iterable<[string, string]>;
  metricsDaily?: Iterable<[string, number]>;
  chatBlocks?: Iterable<[string, string[]]>;
  chatReports?: Iterable<ChatReport>;
  circles?: Iterable<CircleDoc>;
}): MemorySnapshot {
  return {
    version: 1,
    curveWriter: CURRENT_CURVE_VERSION,
    users: [...input.users],
    states: [...input.states],
    parties: [...input.parties],
    ...(input.commandReceipts ? { commandReceipts: [...input.commandReceipts] } : {}),
    ...(input.tradingOrders ? { tradingOrders: [...input.tradingOrders] } : {}),
    ...(input.priceHistory ? { priceHistory: [...input.priceHistory] } : {}),
    ...(input.enhancementServiceRequests ? { enhancementServiceRequests: [...input.enhancementServiceRequests] } : {}),
    ...(input.enhancementServiceStats ? { enhancementServiceStats: [...input.enhancementServiceStats] } : {}),
    ...(input.tradeHistory ? { tradeHistory: [...input.tradeHistory] } : {}),
    ...(input.deletedAccounts ? { deletedAccounts: [...input.deletedAccounts] } : {}),
    ...(input.metricsDaily ? { metricsDaily: [...input.metricsDaily] } : {}),
    ...(input.chatBlocks ? { chatBlocks: [...input.chatBlocks] } : {}),
    ...(input.chatReports ? { chatReports: [...input.chatReports] } : {}),
    ...(input.circles ? { circles: [...input.circles] } : {}),
  };
}

export function parseSnapshot(raw: unknown): MemorySnapshot {
  if (!raw || typeof raw !== "object") return emptySnapshot();
  const obj = raw as Partial<MemorySnapshot>;
  return {
    version: 1,
    users: Array.isArray(obj.users) ? obj.users : [],
    states: Array.isArray(obj.states) ? (obj.states as MemorySnapshot["states"]) : [],
    parties: Array.isArray(obj.parties) ? obj.parties : [],
    ...(Array.isArray(obj.commandReceipts) ? { commandReceipts: obj.commandReceipts } : {}),
    ...(Array.isArray(obj.tradingOrders) ? { tradingOrders: obj.tradingOrders } : {}),
    ...(Array.isArray(obj.priceHistory) ? { priceHistory: obj.priceHistory } : {}),
    ...(Array.isArray(obj.enhancementServiceRequests) ? { enhancementServiceRequests: obj.enhancementServiceRequests } : {}),
    ...(Array.isArray(obj.enhancementServiceStats) ? { enhancementServiceStats: obj.enhancementServiceStats } : {}),
    ...(Array.isArray(obj.tradeHistory) ? { tradeHistory: obj.tradeHistory } : {}),
    ...(Array.isArray(obj.deletedAccounts) ? { deletedAccounts: obj.deletedAccounts } : {}),
    ...(Array.isArray(obj.metricsDaily) ? { metricsDaily: obj.metricsDaily } : {}),
    ...(Array.isArray(obj.chatBlocks) ? { chatBlocks: obj.chatBlocks } : {}),
    ...(Array.isArray(obj.chatReports) ? { chatReports: obj.chatReports } : {}),
    ...(Array.isArray(obj.circles) ? { circles: obj.circles } : {}),
    ...(typeof obj.curveWriter === "number" ? { curveWriter: obj.curveWriter } : {}),
  };
}
