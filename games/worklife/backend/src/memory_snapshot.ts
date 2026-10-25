import type { PlayerCommandReceipt } from "./player_commands";
import type { TradingOrder } from "./storage";
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
}): MemorySnapshot {
  return {
    version: 1,
    users: [...input.users],
    states: [...input.states],
    parties: [...input.parties],
    ...(input.commandReceipts ? { commandReceipts: [...input.commandReceipts] } : {}),
    ...(input.tradingOrders ? { tradingOrders: [...input.tradingOrders] } : {}),
    ...(input.priceHistory ? { priceHistory: [...input.priceHistory] } : {}),
    ...(input.enhancementServiceRequests ? { enhancementServiceRequests: [...input.enhancementServiceRequests] } : {}),
    ...(input.enhancementServiceStats ? { enhancementServiceStats: [...input.enhancementServiceStats] } : {}),
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
  };
}
