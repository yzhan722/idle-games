import { highestActiveBonus } from './set_bonus';
import { ensureProgression } from './progression_state';
import { applyPlayerCommand, commandOperationHash, commandRevision, PlayerCommandConflict, PlayerCommandOperationMismatch, type PlayerCommand, type PlayerCommandReceipt } from './player_commands';
import type { 
  ContentPack, 
  PlayerState, 
  UserRecord, 
  EnhancedPlayerState,
  EnhancedContentPack,
  Party,
  PartyMember,
  ChatMessage,
  PartyMessage,
  TradingMessage,
  EnhancementRequest,
  EnhancementResult,
  EnhancementServiceRequest,
  EnhancementProvider
} from "./types";
import type { Storage, TradingOrder } from "./storage";
import {
  findEnhancementRuleForItem,
  hasEnhancementSkill,
  enhancementUnlockIds,
} from "./enhancement_utils";
import { randomUUID } from "crypto";
import {
  appendLog,
  defaultPlayerState,
  defaultEnhancedPlayerState,
  normalizeInv,
  pickSeed,
  simulateToNow,
  calculateTradingFee,
  createParty,
  getXpForLevel,
  addPartyMember,
  summarizeOrders,
  startLifeActionNow,
  grantProfessionXp,
  ensureProfessionSkills,
  professionLevelForTree,
  GATHER_SKILL_BY_PROFESSION,
  CRAFT_SKILL_BY_PROFESSION,
  isDurabilityBroken,
  UsernameTaken
} from "./storage";
import { EQUIP_SLOT_KEYS } from "./equipment_equip";
import { syncAchievements } from "./progression";
import { isStageOpen } from "./zones";
import { worldAnnouncements } from "./world_announce";
import fs from "fs";
import path from "path";
import {
  addMembership,
  membershipKeyForSend,
  membershipKeys,
  payloadChannel,
} from "./chat_channels";
import { buildSnapshot, parseSnapshot } from "./memory_snapshot";
import { socketFromWsConnection } from "./ws_socket";
import {
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  enhancementBonusPct,
  enhancementMaterials,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessBreakdown,
  ensureEnhancingSkill,
  equippedEnhanceToolBonus,
  itemLevelForEnhancement,
  ownsEnhanceableItem,
  performEnhancementAttempt,
} from "./enhancement_math";

// 使用简单的WebSocket接口定义
interface WebSocketLike {
  send(data: string): void;
  close(): void;
  on?(event: string, listener: (...args: any[]) => void): void;
}

type WsConn = { socket: any; channels: Set<string> };

export function createMemoryStorage(opts?: { persistPath?: string }): Storage {
  const users = new Map<string, UserRecord>();
  const usersByDevice = new Map<string, string>();
  const usersByGoogle = new Map<string, string>();
  const usersByResumeHash = new Map<string, string>();
  const usersByUsername = new Map<string, string>(); // 小写用户名 -> userId
  const states = new Map<string, EnhancedPlayerState>();
  const tradingOrders = new Map<string, TradingOrder>();

  // 新增数据存储

  const priceHistory = new Map<string, Map<string, import("./types").PriceHistory>>(); // itemId -> date -> PriceHistory
  const parties = new Map<string, Party>();
  const partyMembers = new Map<string, PartyMember[]>(); // partyId -> members
  const commandReceipts = new Map<string, Map<string, PlayerCommandReceipt>>(); // userId -> operationId -> receipt
  const enhancementServiceRequests = new Map<string, EnhancementServiceRequest>();
  const enhancementServiceStats = new Map<string, { completed: number; totalRating: number; ratingCount: number }>();
  
  // 索引：职业 -> 拥有强化技能的玩家ID列表
  const enhancementProviderIndex = new Map<string, Set<string>>();

  // 防作弊：操作频率限制
  const actionTimestamps = new Map<string, number>(); // userId -> lastActionTime
  const MIN_ACTION_INTERVAL = 100; // 最小操作间隔100ms

  const ws = new Map<string, WsConn>();
  const channelMembers = new Map<string, Set<string>>();

  function applyParsedSnapshot(snap: ReturnType<typeof parseSnapshot>) {
    for (const u of snap.users) {
      users.set(u.id, u);
      if (u.guestDeviceId) usersByDevice.set(u.guestDeviceId, u.id);
      if (u.googleSub) usersByGoogle.set(u.googleSub, u.id);
      if (u.guestResumeTokenHash) usersByResumeHash.set(u.guestResumeTokenHash, u.id);
      if (u.username) usersByUsername.set(u.username.toLowerCase(), u.id);
    }
    for (const [id, st] of snap.states) {
      states.set(id, st);
      if (st?.skills) {
        for (const [skillKey, skillObj] of Object.entries(st.skills)) {
          if (skillKey.startsWith("skill_") && skillObj?.unlockedRecipes?.some(r => r.startsWith("enhance_"))) {
            const prof = skillKey.slice("skill_".length);
            let set = enhancementProviderIndex.get(prof);
            if (!set) { set = new Set(); enhancementProviderIndex.set(prof, set); }
            set.add(id);
          }
        }
      }
    }
    for (const p of snap.parties) parties.set(p.id, p);
    for (const [userId, list] of snap.commandReceipts ?? []) {
      commandReceipts.set(userId, new Map(list.map(r => [r.operationId, r])));
    }
    for (const o of snap.tradingOrders ?? []) {
      if (o && o.id && o.quantity > 0) tradingOrders.set(o.id, o);
    }
    for (const [itemId, list] of snap.priceHistory ?? []) {
      priceHistory.set(itemId, new Map(list.map(r => [r.recordDate, r])));
    }
    for (const req of snap.enhancementServiceRequests ?? []) {
      if (req && req.id) enhancementServiceRequests.set(req.id, req);
    }
    for (const [providerId, stat] of snap.enhancementServiceStats ?? []) {
      if (providerId && stat) enhancementServiceStats.set(providerId, stat);
    }
  }

  function loadPersist() {
    if (!opts?.persistPath) return;
    const primaryPath = opts.persistPath;
    const bakPath = `${primaryPath}.bak`;
    if (fs.existsSync(primaryPath)) {
      try {
        const raw = fs.readFileSync(primaryPath, "utf8");
        const snap = parseSnapshot(JSON.parse(raw));
        applyParsedSnapshot(snap);
        return;
      } catch (err) {
        console.error(`[storage] Primary save file corrupted (${primaryPath}), preserving and attempting .bak recovery:`, err);
        try {
          fs.copyFileSync(primaryPath, `${primaryPath}.corrupt.${Date.now()}`);
        } catch {}
      }
    }
    if (fs.existsSync(bakPath)) {
      try {
        const rawBak = fs.readFileSync(bakPath, "utf8");
        const snap = parseSnapshot(JSON.parse(rawBak));
        applyParsedSnapshot(snap);
        console.warn(`[storage] Successfully recovered player data from backup (${bakPath}).`);
      } catch (err) {
        console.error(`[storage] Backup save file also unreadable (${bakPath}):`, err);
      }
    }
  }

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let persistDirty = false;
  function flushPersist() {
    if (!opts?.persistPath) return;
    persistDirty = false;
    const targetPath = opts.persistPath;
    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });
    const snap = buildSnapshot({
      users: users.values(),
      states: states.entries(),
      parties: parties.values(),
      commandReceipts: [...commandReceipts.entries()].map(([userId, m]) => [userId, [...m.values()]] as [string, PlayerCommandReceipt[]]),
      tradingOrders: tradingOrders.values(),
      priceHistory: [...priceHistory.entries()].map(([itemId, m]) => [itemId, [...m.values()]]),
      enhancementServiceRequests: enhancementServiceRequests.values(),
      enhancementServiceStats: enhancementServiceStats.entries(),
    });
    const payload = JSON.stringify(snap);
    const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
    const bakPath = `${targetPath}.bak`;
    try {
      const fd = fs.openSync(tmpPath, "w");
      try {
        fs.writeFileSync(fd, payload, "utf8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      if (fs.existsSync(targetPath)) {
        try {
          const stat = fs.statSync(targetPath);
          if (stat.size > 2) {
            fs.copyFileSync(targetPath, bakPath);
          }
        } catch {}
      }
      fs.renameSync(tmpPath, targetPath);
    } catch (err) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
      console.error("[storage] Atomic flushPersist failed, falling back to direct write:", err);
      fs.writeFileSync(targetPath, payload, "utf8");
    }
  }
  function schedulePersist() {
    if (!opts?.persistPath) return;
    persistDirty = true;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      flushPersist();
    }, 50);
  }

  const onProcessExit = () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (persistDirty) {
      try { flushPersist(); } catch {}
    }
  };
  if (opts?.persistPath) {
    process.on("exit", onProcessExit);
  }

  loadPersist();

  function nowIso() {
    return new Date().toISOString();
  }

  function currentRevision(userId: string, snapshot: EnhancedPlayerState): number {
    const revision = commandRevision(states.get(userId) ?? snapshot);
    if (commandRevision(snapshot) !== revision) throw new PlayerCommandConflict(revision);
    return revision;
  }

  // 防作弊：检查操作频率
  function checkActionRate(userId: string): boolean {
    const now = Date.now();
    const lastAction = actionTimestamps.get(userId) || 0;
    
    if (now - lastAction < MIN_ACTION_INTERVAL) {
      return false; // 操作过于频繁
    }
    
    actionTimestamps.set(userId, now);
    return true;
  }

  // 防作弊：验证数值合理性
  function validateNumber(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) && 
           value >= min && 
           value <= max;
  }

  // 防作弊：验证物品数量（必须为正整数——小数会产出小数库存/金币）
  function validateItemQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && validateNumber(quantity, 1, 999999);
  }

  // 防作弊：验证价格（必须为正整数）
  function validatePrice(price: number): boolean {
    return Number.isInteger(price) && validateNumber(price, 1, 1000000000);
  }

  // 装备槽是物品 id 引用：卖出/挂出仍穿着的最后一件装备会留下幽灵槽（背包已扣、属性照算）。
  function countEquippedCopies(st: EnhancedPlayerState, itemId: string): number {
    const eq = (st.equipment || {}) as Record<string, unknown>;
    return EQUIP_SLOT_KEYS.filter((s) => eq[s] === itemId).length;
  }

  function isEquippedItem(st: EnhancedPlayerState, itemId: string): boolean {
    return countEquippedCopies(st, itemId) > 0;
  }

  function broadcast(channel: string, msg: unknown) {
    const members = channelMembers.get(channel);
    if (!members) return;

    const text = JSON.stringify(msg);
    for (const uid of members) {
      const c = ws.get(uid);
      if (!c || !c.socket || typeof c.socket.send !== 'function') continue;
      try {
        c.socket.send(text);
      } catch (error) {
        console.error('WebSocket broadcast error:', error);
      }
    }
  }

  function broadcastToChannel(channel: string, msg: unknown) {
    // 只向订阅了该频道的用户广播
    const members = channelMembers.get(channel);
    if (!members) return;
    
    const text = JSON.stringify(msg);
    for (const uid of members) {
      const c = ws.get(uid);
      if (!c || !c.socket || typeof c.socket.send !== 'function') continue;
      try {
        c.socket.send(text);
      } catch (error) {
        console.error('WebSocket broadcastToChannel error:', error);
      }
    }
  }

  /** 通用 WS 推送：市场成交、服务单、队伍事件实时下发给指定用户。 */
  function notifyUser(userId: string, payload: Record<string, unknown>) {
    const c = ws.get(userId);
    if (!c?.socket || typeof c.socket.send !== 'function') return;
    try {
      c.socket.send(JSON.stringify({ type: 'notify', ts: nowIso(), ...payload }));
    } catch (error) {
      console.error('notifyUser error:', error);
    }
  }

  /** 加入队伍的核心流程（joinParty / acceptPartyInvite 共用） */
  function joinPartyCore(userId: string, partyId: string): Party {
    const party = parties.get(partyId);
    if (!party) throw new Error("party_not_found");
    if (party.members.length >= 6) throw new Error("party_full");
    if (party.members.some(m => m.userId === userId)) throw new Error("already_in_party");
    const st = states.get(userId);
    if (!st) throw new Error("state_not_found");
    if (st.partyState) throw new Error("already_in_party");

    const updatedParty = addPartyMember(party, userId);
    parties.set(partyId, updatedParty);
    st.partyState = {
      partyId,
      role: 'member',
      isLeader: false,
      joinedAt: new Date().toISOString()
    };
    appendLog(st, `加入队伍：${partyId}`);
    // 在线成员立刻进队伍频道，不必等重连
    const conn = ws.get(userId);
    if (conn && !conn.channels.has(`party:${partyId}`)) {
      addMembership(channelMembers, conn.channels, userId, `party:${partyId}`);
    }
    broadcast(`party:${partyId}`, { type: "party:event", event: "member_joined", memberId: userId, ts: nowIso() });
    schedulePersist();
    return updatedParty;
  }

  // 辅助函数：更新价格历史
  function updatePriceHistory(itemId: string, price: number, quantity: number) {
    const today = new Date().toISOString().split('T')[0];
    
    let itemPriceHistory = priceHistory.get(itemId);
    if (!itemPriceHistory) {
      itemPriceHistory = new Map();
      priceHistory.set(itemId, itemPriceHistory);
    }

    let todayRecord = itemPriceHistory.get(today);
    if (!todayRecord) {
      todayRecord = {
        itemId,
        averagePrice: price,
        minPrice: price,
        maxPrice: price,
        volume: quantity,
        recordDate: today
      };
      itemPriceHistory.set(today, todayRecord);
    } else {
      // 更新统计数据
      const totalVolume = todayRecord.volume + quantity;
      todayRecord.averagePrice = 
        (todayRecord.averagePrice * todayRecord.volume + price * quantity) / totalVolume;
      todayRecord.minPrice = Math.min(todayRecord.minPrice, price);
      todayRecord.maxPrice = Math.max(todayRecord.maxPrice, price);
      todayRecord.volume = totalVolume;
    }
  }

  // 职业活动处理函数
  function processLifeAction(
    state: EnhancedPlayerState, 
    actionId: string, 
    contentPack: EnhancedContentPack
  ): { success: boolean; rewards?: Record<string, number>; message?: string } {
    // 查找动作定义
    const action = contentPack.actions.find((a: any) => a.id === actionId) as any;
    if (!action) {
      return { success: false, message: "未知的动作" };
    }

    // 检查技能等级要求
    const requiredSkill = action.skillId;
    const playerSkill = state.skills[requiredSkill];
    if (!playerSkill || playerSkill.level < (action.requirements?.skillLevel || 1)) {
      return { success: false, message: "技能等级不足" };
    }

    // 检查材料需求
    if (action.consumes && Array.isArray(action.consumes)) {
      for (const consume of action.consumes) {
        const available = state.inventory[consume.itemId] || 0;
        if (available < consume.qty) {
          return { success: false, message: `材料不足：${consume.itemId}` };
        }
      }
    }

    // 消耗材料
    if (action.consumes && Array.isArray(action.consumes)) {
      for (const consume of action.consumes) {
        state.inventory[consume.itemId] = (state.inventory[consume.itemId] || 0) - consume.qty;
      }
    }

    // 给予奖励
    const rewards: Record<string, number> = {};
    if (action.yields && Array.isArray(action.yields)) {
      for (const yield_ of action.yields) {
        // 检查概率
        const chance = yield_.chance || 1.0;
        if (Math.random() <= chance) {
          const currentAmount = state.inventory[yield_.itemId] || 0;
          state.inventory[yield_.itemId] = currentAmount + yield_.qty;
          rewards[yield_.itemId] = (rewards[yield_.itemId] || 0) + yield_.qty;
        }
      }
    }

    // 给予经验
    if (action.xp && playerSkill) {
      playerSkill.xp += action.xp;
      
      // 检查升级 - 使用新的指数成长曲线
      let levelUpXp = getXpForLevel(playerSkill.level);
      while (playerSkill.xp >= levelUpXp && playerSkill.level < 200) {
        playerSkill.level += 1;
        playerSkill.xp -= levelUpXp;
        appendLog(state, `${requiredSkill} 技能升级到 ${playerSkill.level} 级！`);
        levelUpXp = getXpForLevel(playerSkill.level);
      }
      
      // 如果达到满级
      if (playerSkill.level >= 200) {
        playerSkill.level = 200;
      }
    }

    return { success: true, rewards };
  }

  return {
    async init() {},
    async close() {
      if (opts?.persistPath) {
        process.off("exit", onProcessExit);
      }
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      flushPersist();
    },
    async healthCheck() { return { ok: true, latencyMs: 0 }; },
    async findOrCreateGuestUser(deviceId: string) {
      const existingId = usersByDevice.get(deviceId);
      if (existingId) return users.get(existingId)!;

      const id = crypto.randomUUID();
      const rec: UserRecord = { id, guestDeviceId: deviceId, googleSub: null, createdAt: nowIso() };
      users.set(id, rec);
      usersByDevice.set(deviceId, id);
      schedulePersist();
      return rec;
    },

    async createGuestUser() {
      const id = crypto.randomUUID();
      const rec: UserRecord = {
        id,
        guestDeviceId: `guest_${id}`,
        googleSub: null,
        guestResumeTokenHash: null,
        createdAt: nowIso(),
      };
      users.set(id, rec);
      if (rec.guestDeviceId) usersByDevice.set(rec.guestDeviceId, id);
      schedulePersist();
      return rec;
    },

    async getUser(userId: string) {
      return users.get(userId) ?? null;
    },

    async setGuestResumeTokenHash(userId: string, hash: string) {
      const user = users.get(userId);
      if (!user) throw new Error("user_not_found");
      if (user.guestResumeTokenHash) usersByResumeHash.delete(user.guestResumeTokenHash);
      user.guestResumeTokenHash = hash;
      usersByResumeHash.set(hash, userId);
      schedulePersist();
    },

    async findUserByResumeTokenHash(hash: string) {
      const id = usersByResumeHash.get(hash);
      return id ? users.get(id) ?? null : null;
    },

    async bindGoogle(userId: string, googleSub: string) {
      const other = usersByGoogle.get(googleSub);
      if (other && other !== userId) {
        throw new Error("google_sub_already_bound");
      }

      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");

      if (u.googleSub && u.googleSub !== googleSub) {
        usersByGoogle.delete(u.googleSub);
      }
      u.googleSub = googleSub;
      usersByGoogle.set(googleSub, userId);
      // 凭据变更即吊销旧会话
      u.authVersion = (u.authVersion ?? 1) + 1;
      schedulePersist();
    },

    async findUserByGoogleSub(googleSub: string) {
      const id = usersByGoogle.get(googleSub);
      return id ? users.get(id) ?? null : null;
    },

    async invalidateSessions(userId: string) {
      const u = users.get(userId);
      if (!u) return;
      u.authVersion = (u.authVersion ?? 1) + 1;
      flushPersist();
    },

    async createPasswordUser(username: string, passwordHash: string) {
      const key = username.toLowerCase();
      if (usersByUsername.has(key)) throw new UsernameTaken();
      const id = crypto.randomUUID();
      const rec: UserRecord = { id, guestDeviceId: null, googleSub: null, username, passwordHash, createdAt: nowIso() };
      users.set(id, rec);
      usersByUsername.set(key, id);
      flushPersist();
      return rec;
    },

    async findUserByUsername(username: string) {
      const id = usersByUsername.get(username.toLowerCase());
      return id ? users.get(id) ?? null : null;
    },

    async bindPassword(userId: string, username: string, passwordHash: string) {
      const key = username.toLowerCase();
      const other = usersByUsername.get(key);
      if (other && other !== userId) throw new UsernameTaken();
      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");
      if (u.username) usersByUsername.delete(u.username.toLowerCase());
      u.username = username;
      u.passwordHash = passwordHash;
      usersByUsername.set(key, userId);
      u.authVersion = (u.authVersion ?? 1) + 1;
      flushPersist();
    },

    async getOrCreatePlayerState(userId: string, contentVersion: string) {
      const existing = states.get(userId);
      if (existing) return existing;

      const state = defaultEnhancedPlayerState(contentVersion);
      state.stateRevision = 0;
      states.set(userId, state);
      schedulePersist();
      return state;
    },

    async simulateToNow({ userId, state, now, contentPack }: { 
      userId: string; 
      state: EnhancedPlayerState; 
      now: Date; 
      contentPack: EnhancedContentPack 
    }) {
      const revision = currentRevision(userId, state);
      const result = simulateToNow({ state: structuredClone(state), now, contentPack });
      const next = { ...result.state as EnhancedPlayerState, inventory: normalizeInv(result.state.inventory) };
      next.stateRevision = revision + 1;
      states.set(userId, next);
      schedulePersist();
      for (const text of worldAnnouncements(state, next, contentPack, userId)) {
        broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
      }
      return next;
    },

    async executePlayerCommand<T>(command: PlayerCommand<T>) {
      const current = states.get(command.userId) ?? defaultEnhancedPlayerState(command.contentPack.version);
      let requestHash: string | undefined;
      if (command.operationId) {
        requestHash = commandOperationHash(command.userId, command.operationId, command.operationPayload);
        const existing = commandReceipts.get(command.userId)?.get(command.operationId);
        if (existing) {
          if (existing.requestHash !== requestHash) throw new PlayerCommandOperationMismatch();
          // The op already committed once: replay its recorded result against the current state.
          return { state: current, result: existing.result as T, deduplicated: true };
        }
      }
      const revision = commandRevision(current, command.expectedRevision);
      // No event-loop yield between snapshot and publication: memory commands are atomic.
      const settled = simulateToNow({ state: structuredClone(current), now: command.now, contentPack: command.contentPack });
      const outcome = applyPlayerCommand(settled.state as EnhancedPlayerState, command.apply);
      outcome.state.inventory = normalizeInv(outcome.state.inventory);
      ensureProgression(outcome.state, command.now);
      outcome.state.stateRevision = revision + 1;
      states.set(command.userId, outcome.state);
      if (command.operationId && requestHash) {
        let receipts = commandReceipts.get(command.userId);
        if (!receipts) commandReceipts.set(command.userId, receipts = new Map());
        receipts.set(command.operationId, {
          operationId: command.operationId,
          requestHash,
          result: outcome.result,
          stateRevision: outcome.state.stateRevision,
          createdAt: nowIso(),
        });
      }
      schedulePersist();
      for (const text of worldAnnouncements(current, outcome.state as EnhancedPlayerState, command.contentPack, command.userId)) {
        broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
      }
      return outcome;
    },

    async deduplicateOperation<T>({ userId, operationId, operationPayload, run }: {
      userId: string;
      operationId?: string;
      operationPayload?: unknown;
      run: () => Promise<T>;
    }): Promise<{ result: T; deduplicated: boolean }> {
      if (!operationId) return { result: await run(), deduplicated: false };
      const requestHash = commandOperationHash(userId, operationId, operationPayload);
      const existing = commandReceipts.get(userId)?.get(operationId);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new PlayerCommandOperationMismatch();
        return { result: existing.result as T, deduplicated: true };
      }
      const result = await run();
      let receipts = commandReceipts.get(userId);
      if (!receipts) commandReceipts.set(userId, receipts = new Map());
      receipts.set(operationId, {
        operationId,
        requestHash,
        result,
        stateRevision: 0,
        createdAt: nowIso(),
      });
      schedulePersist();
      return { result, deduplicated: false };
    },

    async savePlayerState(userId: string, state: EnhancedPlayerState) {
      const revision = currentRevision(userId, state);
      const next = { ...state, inventory: normalizeInv(state.inventory) };
      ensureProgression(next, new Date());
      next.stateRevision = revision + 1;
      states.set(userId, next);
      schedulePersist();
      return next;
    },

    announceWorld(text: string) {
      broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
    },

  async startLifeAction({ userId, actionId, quantity, now, contentPack }: { userId: string; actionId: string; quantity?: number; now: Date; contentPack?: EnhancedContentPack }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 直接使用前端传来的 actionId，不再做硬编码映射
      // 前端应该发送正确的 actionId（如 act_chop_wood_t1, act_combat_slime 等）
      startLifeActionNow(st, contentPack as EnhancedContentPack, actionId, quantity, now);
      schedulePersist();
      return st;
    },

    // MWI 装备强化：+20 表、非线性属性、失败归零、保护镜降一级、独立强化技能。
    async enhanceEquipment({ userId, request, contentPack, rng }: {
      userId: string;
      request: EnhancementRequest;
      contentPack: EnhancedContentPack;
      rng?: () => number;
    }): Promise<EnhancementResult> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const currentLevel = st.equipment.enhancementLevels[request.itemId] || 0;
      const item = contentPack.items.find((i: any) => i.id === request.itemId) as any;
      if (!item) {
        return {
          success: false,
          previousLevel: currentLevel,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: "未知物品"
        };
      }

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const enhancementRule = ruleMatch?.rule ?? null;
      if (!enhancementRule) {
        return {
          success: false,
          previousLevel: currentLevel,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: "该物品无法强化"
        };
      }

      // 服务费在尝试前就校验：自我接单是印钞漏洞，请求者也必须真付这笔费（不再凭空铸造）
      let serviceFee = 0;
      let providerState: EnhancedPlayerState | undefined;
      if (request.serviceProviderId) {
        if (request.serviceProviderId === userId) {
          return {
            success: false,
            previousLevel: currentLevel,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: "不能向自己购买强化服务"
          };
        }
        providerState = states.get(request.serviceProviderId);
        if (!providerState) {
          return {
            success: false,
            previousLevel: currentLevel,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: "服务提供者不存在"
          };
        }
        // 资质校验必须在这里：/enhancement/enhance 路由直接收 serviceProviderId，
        // 不经过服务单的下单/接单两道闸
        const requiredProfession = ruleMatch?.requiredProfession ?? enhancementRule.requiredProfession;
        const providerSkill = providerState.skills?.[`skill_${requiredProfession}`];
        if (!providerSkill || !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
          return {
            success: false,
            previousLevel: currentLevel,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: "服务提供者不具备对应强化技能"
          };
        }
        serviceFee = Math.floor((enhancementRule.materials.find(
          (m: { itemId: string }) => m.itemId === "gold"
        )?.quantity || 100) * 0.5);
        if ((st.inventory.gold || 0) < serviceFee) {
          return {
            success: false,
            previousLevel: currentLevel,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: "金币不足以支付服务费"
          };
        }
      }

      const result = performEnhancementAttempt({
        player: st,
        item,
        rule: enhancementRule,
        request,
        pack: contentPack,
        rng,
        xpForLevel: getXpForLevel,
      });

      // Validation failures consume nothing and do not count as attempts.
      if (Object.keys(result.consumedMaterials).length === 0) return result;

      if (result.success) {
        appendLog(
          st,
          `装备强化成功：${item.name} +${result.previousLevel} → +${result.newLevel}（强化经验 +${result.xpGained}）`
        );
      } else {
        appendLog(st, `${item.name}${result.failureReason}（强化经验 +${result.xpGained}）`);
      }
      for (const level of result.levelUps || []) {
        appendLog(st, `强化技能升级到 ${level} 级！`);
      }

      // If another player provided the service, the requester pays the fee and the provider
      // receives it after a real attempt — a transfer, not minted gold.
      if (request.serviceProviderId && providerState && serviceFee > 0) {
        st.inventory.gold = (st.inventory.gold || 0) - serviceFee;
        providerState.inventory.gold = (providerState.inventory.gold || 0) + serviceFee;
        if (st.stats) st.stats.totalGoldSpent = (st.stats.totalGoldSpent || 0) + serviceFee;
        if (providerState.stats) providerState.stats.totalGoldEarned = (providerState.stats.totalGoldEarned || 0) + serviceFee;
        syncAchievements(st);
        syncAchievements(providerState);
        providerState.stateRevision = (providerState.stateRevision ?? 0) + 1;
        appendLog(providerState, `提供强化服务获得 ${serviceFee} 金币`);
      }
      st.stateRevision = (st.stateRevision ?? 0) + 1;
      schedulePersist();
      return result;
    },

    // 新增：获取装备强化信息
    async getEnhancementInfo({ userId, itemId, contentPack }: {
      userId: string;
      itemId: string;
      contentPack: EnhancedContentPack;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const item = contentPack.items.find((i: any) => i.id === itemId) as any;
      if (!item) throw new Error("item_not_found");

      const currentLevel = st.equipment.enhancementLevels[itemId] || 0;

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const enhancementRule = ruleMatch?.rule ?? null;
      const requiredProfession = ruleMatch?.requiredProfession ?? null;
      const skill = ensureEnhancingSkill(st);
      const itemLevel = itemLevelForEnhancement(item, contentPack);

      if (!enhancementRule) {
        return {
          currentLevel,
          maxLevel: 0,
          nextLevelCost: {},
          successRate: 0,
          baseSuccessRate: 0,
          levelModifier: 0,
          overLevelBonus: 0,
          toolBonus: 0,
          currentStatBonusPct: 0,
          nextStatBonusPct: 0,
          slotMultiplier: enhancementSlotMultiplier(item),
          itemLevel,
          enhancingLevel: skill.level,
          enhancingXp: skill.xp,
          canEnhance: false,
          canAfford: false,
          isOwned: ownsEnhanceableItem(st, itemId),
          requiredProfession: undefined,
          itemType: undefined,
          protection: {
            itemId: PROTECTION_MIRROR_ID,
            available: st.inventory[PROTECTION_MIRROR_ID] || 0,
            failWithout: "失败后重置为 +0",
            failWith: "消耗 1 面保护镜；失败只降低 1 级",
          },
        };
      }

      const nextLevel = currentLevel + 1;
      const maxLevel = Math.min(
        MAX_ENHANCEMENT_LEVEL,
        Number(enhancementRule.maxLevel || MAX_ENHANCEMENT_LEVEL)
      );
      const nextLevelCost =
        nextLevel <= maxLevel
          ? enhancementMaterials(enhancementRule, nextLevel, undefined, item, contentPack)
          : {};
      const rates = enhancementSuccessBreakdown(nextLevel, skill.level, itemLevel, equippedEnhanceToolBonus(st, contentPack));
      const isOwned = ownsEnhanceableItem(st, itemId);
      const canAfford = Object.entries(nextLevelCost).every(
        ([id, qty]) => (st.inventory[id] || 0) >= qty
      );

      return {
        currentLevel,
        maxLevel,
        nextLevelCost,
        successRate: rates.finalRate,
        baseSuccessRate: rates.baseRate,
        levelModifier: rates.levelModifier,
        overLevelBonus: rates.overLevelBonus,
        toolBonus: rates.toolBonus,
        currentStatBonusPct:
          enhancementBonusPct(currentLevel) * enhancementSlotMultiplier(item),
        nextStatBonusPct:
          enhancementBonusPct(Math.min(nextLevel, maxLevel)) *
          enhancementSlotMultiplier(item),
        slotMultiplier: enhancementSlotMultiplier(item),
        itemLevel,
        enhancingLevel: skill.level,
        enhancingXp: skill.xp,
        canEnhance: isOwned && currentLevel < maxLevel,
        canAfford,
        isOwned,
        requiredProfession: requiredProfession || undefined,
        itemType: enhancementRule?.itemType,
        protection: {
          itemId: PROTECTION_MIRROR_ID,
          available: st.inventory[PROTECTION_MIRROR_ID] || 0,
          failWithout: "失败后重置为 +0",
          failWith: "消耗 1 面保护镜；失败只降低 1 级",
        },
      };
    },

    // 新增：获取强化服务提供者（使用索引优化）
    async getEnhancementProviders({ itemType, contentPack }: {
      itemType: string;
      contentPack: EnhancedContentPack;
    }): Promise<EnhancementProvider[]> {
      const enhancementRule = contentPack.enhancementRules.find(rule => rule.itemType === itemType);
      if (!enhancementRule) {
        return [];
      }

      const providers: EnhancementProvider[] = [];
      const requiredProfession = enhancementRule.requiredProfession;
      const skillKey = `skill_${requiredProfession}`;

      // 使用索引快速查找，如果索引不存在则构建
      let providerIds = enhancementProviderIndex.get(requiredProfession);
      if (!providerIds) {
        providerIds = new Set();
        for (const [userId, state] of states.entries()) {
          const playerSkill = state.skills[skillKey];
          if (playerSkill && hasEnhancementSkill(playerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
            providerIds.add(userId);
          }
        }
        enhancementProviderIndex.set(requiredProfession, providerIds);
      }

      // 从索引中获取提供者信息（索引是写入时建的，读侧仍要复核——转生/重置后技能可能已失效，
      // 否则旧条目会让无资质玩家继续挂着"可接单"的招牌）
      for (const userId of providerIds) {
        const state = states.get(userId);
        if (!state) { providerIds.delete(userId); continue; }
        
        const playerSkill = state.skills[skillKey];
        if (!playerSkill || !hasEnhancementSkill(playerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
          providerIds.delete(userId);
          continue;
        }

        // 计算服务费（基于技能等级）
        const serviceFee = Math.floor((enhancementRule.materials.find(m => m.itemId === 'gold')?.quantity || 100) * 0.5);
        
        // 获取服务统计
        const stats = enhancementServiceStats.get(userId);
        const completedServices = stats?.completed || 0;
        const rating = stats && stats.ratingCount > 0 
          ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10 
          : 5.0;
        
        providers.push({
          userId,
          profession: requiredProfession,
          skillLevel: playerSkill.level,
          serviceFee,
          isOnline: ws.has(userId),
          completedServices,
          rating
        });
      }

      // 按技能等级和评分排序，限制返回50个
      return providers
        .sort((a, b) => {
          if (a.skillLevel !== b.skillLevel) return b.skillLevel - a.skillLevel;
          return b.rating - a.rating;
        })
        .slice(0, 50);
    },

    async createEnhancementServiceRequest({ requesterId, providerId, itemId, targetLevel, message, contentPack }: {
      requesterId: string;
      providerId: string;
      itemId: string;
      targetLevel: number;
      message?: string;
      contentPack: EnhancedContentPack;
    }): Promise<EnhancementServiceRequest> {
      // 验证请求者和提供者存在
      const requesterState = states.get(requesterId);
      const providerState = states.get(providerId);
      
      if (!requesterState) throw new Error("请求者不存在");
      if (!providerState) throw new Error("服务提供者不存在");
      // 自我接单 = 用自己的号收自己的服务费（绕过市场分工），禁止
      if (requesterId === providerId) throw new Error("不能向自己发起强化服务");
      
      // 验证请求者拥有该物品
      if (!requesterState.inventory[itemId] || requesterState.inventory[itemId] < 1) {
        throw new Error("您没有该物品");
      }

      // 获取强化规则和计算服务费
      const item = contentPack.items.find((i: any) => i.id === itemId);
      const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
      const enhancementRule = ruleMatch?.rule;
      if (!enhancementRule) throw new Error("该物品无法强化");

      // 下单时就校验提供者资质，而不是等接单时才发现对方根本不会这门手艺
      const requiredProfession = ruleMatch?.requiredProfession ?? enhancementRule.requiredProfession;
      const providerSkill = providerState.skills[`skill_${requiredProfession}`];
      if (!providerSkill || !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
        throw new Error("该服务提供者不具备对应强化技能");
      }

      const serviceFee = Math.floor((enhancementRule.materials.find(m => m.itemId === 'gold')?.quantity || 100) * 0.5);

      // 创建服务请求
      const requestId = randomUUID();
      const request: EnhancementServiceRequest = {
        id: requestId,
        requesterId,
        providerId,
        itemId,
        targetLevel,
        serviceFee,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      enhancementServiceRequests.set(requestId, request);
      schedulePersist();

      // 发送通知给服务提供者
      broadcastToChannel('enhancement_service', {
        type: 'enhancement:service_request',
        request,
        requesterName: requesterId.slice(0, 8) + '...'
      });
      notifyUser(providerId, { kind: "enhancement:service_request", requestId, requesterId, itemId, targetLevel, serviceFee });

      return request;
    },

    async respondToEnhancementServiceRequest({ requestId, providerId, accepted, message, contentPack }: {
      requestId: string;
      providerId: string;
      accepted: boolean;
      message?: string;
      contentPack: EnhancedContentPack;
    }): Promise<{ success: boolean; message: string }> {
      const request = enhancementServiceRequests.get(requestId);
      if (!request) throw new Error("服务请求不存在");
      if (request.providerId !== providerId) throw new Error("您无权响应此请求");
      if (request.status !== 'pending') throw new Error("请求已被处理");

      // 接单时复核资质：下单后提供者可能已失去技能（如转生），无资质不能接
      if (accepted) {
        const item = contentPack.items.find((i: any) => i.id === request.itemId);
        const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
        const requiredProfession = ruleMatch?.requiredProfession ?? ruleMatch?.rule?.requiredProfession;
        const providerState = states.get(providerId);
        const providerSkill = requiredProfession ? providerState?.skills[`skill_${requiredProfession}`] : undefined;
        if (!providerState || !providerSkill || !requiredProfession ||
            !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, ruleMatch?.rule?.itemType ?? "")) {
          return { success: false, message: "您当前不具备该强化服务资质" };
        }
      }

      request.status = accepted ? 'accepted' : 'rejected';
      request.responseMessage = message;
      request.updatedAt = new Date().toISOString();

      if (accepted) {
        // 如果接受，立即执行强化
        try {
          const result = await this.enhanceEquipment({
            userId: request.requesterId,
            request: {
              itemId: request.itemId,
              targetLevel: request.targetLevel,
              materials: {},
              serviceProviderId: providerId
            },
            contentPack
          });

          if (result.success) {
            request.status = 'completed';
            
            // 更新服务统计
            const stats = enhancementServiceStats.get(providerId) || { completed: 0, totalRating: 0, ratingCount: 0 };
            stats.completed += 1;
            enhancementServiceStats.set(providerId, stats);
          } else {
            // 强化执行失败不能停在 'accepted' 永远卡住——与 pg 一致标为 rejected 终态
            request.status = 'rejected';
            request.responseMessage = result.failureReason || "强化失败";
          }

          // 通知请求者
          broadcastToChannel('enhancement_service', {
            type: 'enhancement:service_completed',
            requestId,
            result,
            providerName: providerId.slice(0, 8) + '...'
          });
          notifyUser(request.requesterId, { kind: "enhancement:service_completed", requestId, success: result.success, failureReason: result.failureReason });
          schedulePersist();

          return { success: true, message: result.success ? "强化成功完成" : `强化失败：${result.failureReason}` };
        } catch (error) {
          request.status = 'rejected';
          schedulePersist();
          return { success: false, message: error instanceof Error ? error.message : "强化执行失败" };
        }
      } else {
        // 通知请求者被拒绝
        broadcastToChannel('enhancement_service', {
          type: 'enhancement:service_rejected',
          requestId,
          message,
          providerName: providerId.slice(0, 8) + '...'
        });
        notifyUser(request.requesterId, { kind: "enhancement:service_rejected", requestId, message });
        schedulePersist();

        return { success: true, message: "已拒绝服务请求" };
      }
    },

    async getEnhancementServiceRequests({ userId, type }: {
      userId: string;
      type: 'requester' | 'provider';
    }): Promise<EnhancementServiceRequest[]> {
      const requests: EnhancementServiceRequest[] = [];
      
      for (const request of enhancementServiceRequests.values()) {
        if (type === 'requester' && request.requesterId === userId) {
          requests.push(request);
        } else if (type === 'provider' && request.providerId === userId) {
          requests.push(request);
        }
      }

      // 按创建时间倒序排列
      return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // 新增：组队功能
    async createParty({ userId, name }: { userId: string; name?: string }): Promise<Party> {
      // 检查用户是否已经在队伍中
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      if (st.partyState) {
        throw new Error("already_in_party");
      }

      // 创建新队伍
      const party = createParty(userId, name);
      parties.set(party.id, party);

      // 更新玩家状态
      st.partyState = {
        partyId: party.id,
        role: 'leader',
        isLeader: true,
        joinedAt: new Date().toISOString()
      };
      const conn = ws.get(userId);
      if (conn && !conn.channels.has(`party:${party.id}`)) {
        addMembership(channelMembers, conn.channels, userId, `party:${party.id}`);
      }
      appendLog(st, `创建队伍：${party.id}`);
      schedulePersist();

      return party;
    },

    async joinParty({ userId, partyId }: { userId: string; partyId: string }): Promise<Party> {
      return joinPartyCore(userId, partyId);
    },

    // 队伍活动功能——时长制 + 贡献制：开始时刻快照每个成员的统计基线，
    // 结算时按统计差值的比例分奖，0 贡献 = 0 奖励（堵住小号挂机白嫖）。
    async startPartyActivity({ userId, partyId, activityType, stageId, durationMinutes, contentPack }: {
      userId: string;
      partyId: string;
      activityType: 'combat' | 'group_craft' | 'raid';
      stageId?: string;
      durationMinutes?: number;
      contentPack?: EnhancedContentPack;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      const member = party.members.find(m => m.userId === userId);
      if (!member) return { success: false, message: "您不是该队伍成员" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以开始活动" };
      if (party.currentActivity) return { success: false, message: "队伍已有进行中的活动" };

      const duration = Math.min(480, Math.max(5, Math.floor(durationMinutes ?? 30)));
      const now = new Date();
      let raidBossId: string | undefined;
      let raidBossName: string | undefined;
      let bossKillsNeeded: number | undefined;

      if (activityType === 'combat' || activityType === 'raid') {
        if (!stageId) return { success: false, message: "战斗类活动需要指定关卡" };
        const stage = contentPack ? (contentPack.stages as any[]).find((s: any) => s.id === stageId) : null;
        if (contentPack && !stage) return { success: false, message: "关卡不存在" };
        if (!isStageOpen(stageId)) return { success: false, message: "该关卡尚未开放" };
        if (activityType === 'raid') {
          const ids: string[] = stage?.monsters ?? [];
          const boss = contentPack
            ? ids.map(id => (contentPack.monsters as any[]).find((m: any) => m.id === id)).find(m => m && (m.isBoss || String(m.id).endsWith('_boss')))
              ?? ids.map(id => (contentPack.monsters as any[]).find((m: any) => m.id === id)).filter(Boolean).at(-1)
            : null;
          raidBossId = boss?.id ?? ids.at(-1);
          if (!raidBossId) return { success: false, message: "该关卡没有可讨伐的首领" };
          raidBossName = boss?.name ?? raidBossId;
          bossKillsNeeded = party.members.length * 2;
        }
      }

      // 成员统计基线：离线成员同样入快照——放置游戏的核心是离线进度也算贡献
      const baseline: Record<string, { kills: number; bossKills: number; raidBossKills: number; actions: number; xp: number }> = {};
      for (const m of party.members) {
        const s = states.get(m.userId);
        const stats = s?.stats as any;
        baseline[m.userId] = {
          kills: stats?.totalKills || 0,
          bossKills: stats?.totalBossKills || 0,
          raidBossKills: raidBossId ? (stats?.killsByMonster?.[raidBossId] || 0) : 0,
          actions: stats?.totalActions || 0,
          xp: stats?.totalXpEarned || 0,
        };
      }

      party.currentActivity = {
        type: activityType,
        stageId,
        startedAt: now.toISOString(),
        endsAt: new Date(now.getTime() + duration * 60_000).toISOString(),
        durationMinutes: duration,
        raidBossId,
        raidBossName,
        bossKillsNeeded,
        baseline,
      };

      for (const m of party.members) {
        const memberState = states.get(m.userId);
        if (memberState) appendLog(memberState, `队伍活动开始：${activityType}${raidBossName ? `·讨伐 ${raidBossName}` : ''}（${duration} 分钟）`);
        const conn = ws.get(m.userId);
        if (conn && !conn.channels.has(`party:${partyId}`)) addMembership(channelMembers, conn.channels, m.userId, `party:${partyId}`);
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_started", activity: party.currentActivity, ts: nowIso() });
      schedulePersist();
      return { success: true };
    },

    async completePartyActivity({ userId, partyId, contentPack }: {
      userId: string;
      partyId: string;
      contentPack: EnhancedContentPack;
    }): Promise<{ success: boolean; rewards?: Record<string, Record<string, number>>; message?: string }> {
      const party = parties.get(partyId);
      if (!party || !party.currentActivity) {
        return { success: false, message: "没有进行中的活动" };
      }
      const member = party.members.find(m => m.userId === userId);
      if (!member) return { success: false, message: "您不是该队伍成员" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以完成活动" };

      const activity = party.currentActivity;
      if (activity.endsAt && Date.parse(activity.endsAt) > Date.now()) {
        return { success: false, message: `活动尚未结束（${Math.ceil((Date.parse(activity.endsAt) - Date.now()) / 60000)} 分钟后可结算）` };
      }

      const durationFactor = Math.max(0.1, (activity.durationMinutes ?? 30) / 30);
      const rewards: Record<string, Record<string, number>> = {};
      const contributions: Record<string, number> = {};

      if (activity.baseline) {
        // 贡献制：统计差值 → 按比例分奖
        for (const m of party.members) {
          const base = activity.baseline[m.userId];
          const s = states.get(m.userId);
          const stats = s?.stats as any;
          if (!base || !stats) { contributions[m.userId] = 0; continue; }
          const kills = Math.max(0, (stats.totalKills || 0) - base.kills);
          const raidBossKills = activity.raidBossId ? Math.max(0, (stats.killsByMonster?.[activity.raidBossId] || 0) - base.raidBossKills) : 0;
          const actions = Math.max(0, (stats.totalActions || 0) - base.actions);
          contributions[m.userId] = activity.type === 'group_craft'
            ? actions
            : activity.type === 'raid'
              ? raidBossKills * 10 + kills
              : kills;
        }
        const totalC = Object.values(contributions).reduce((a, b) => a + b, 0);
        if (totalC <= 0) {
          party.currentActivity = undefined;
          broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, ts: nowIso() });
          schedulePersist();
          return { success: true, rewards, message: "活动期间无人产生贡献，无奖励发放" };
        }
        const split = (pool: number) => {
          const shares: Record<string, number> = {};
          let assigned = 0, top: string | null = null;
          for (const m of party.members) {
            shares[m.userId] = Math.floor(pool * contributions[m.userId] / totalC);
            assigned += shares[m.userId];
            if (!top || contributions[m.userId] > contributions[top]) top = m.userId;
          }
          if (top) shares[top] += pool - assigned;
          return shares;
        };
        if (activity.type === 'group_craft') {
          const xpShares = split(Math.round(60 * party.members.length * durationFactor));
          for (const m of party.members) {
            const xp = xpShares[m.userId];
            if (xp <= 0) continue;
            rewards[m.userId] = { xp };
            const s = states.get(m.userId);
            if (s) {
              ensureProfessionSkills(s);
              const skillId = CRAFT_SKILL_BY_PROFESSION[s.activeClassId] || `skill_${s.activeClassId}`;
              const ups = grantProfessionXp(s, skillId, xp);
              appendLog(s, `队伍活动完成，${s.activeClassId} 获得 ${xp} 经验`);
              for (const lv of ups) appendLog(s, `${skillId} 技能升级到 ${lv} 级！`);
            }
          }
        } else {
          const bossKillsTotal = activity.raidBossId
            ? party.members.reduce((n, m) => n + Math.max(0, (((states.get(m.userId)?.stats as any)?.killsByMonster?.[activity.raidBossId!] || 0) - (activity.baseline![m.userId]?.raidBossKills || 0))), 0)
            : 0;
          const pool = activity.type === 'raid'
            ? Math.round((150 * party.members.length + 80 * bossKillsTotal) * durationFactor)
            : Math.round(120 * party.members.length * durationFactor);
          const goldShares = split(pool);
          for (const m of party.members) {
            const gold = goldShares[m.userId];
            if (gold <= 0) continue;
            rewards[m.userId] = { gold };
            const s = states.get(m.userId);
            if (s) {
              s.inventory.gold = (s.inventory.gold || 0) + gold;
              appendLog(s, `队伍活动完成，按贡献分得 ${gold} 金币`);
            }
          }
        }
      } else {
        // 旧存档的活动没有基线：沿用平摊（兼容历史数据）
        const goldPerMember = 100;
        for (const m of party.members) {
          rewards[m.userId] = activity.type === 'group_craft' ? { xp: 50 } : { gold: goldPerMember };
          const s = states.get(m.userId);
          if (!s) continue;
          if (activity.type === 'group_craft') {
            ensureProfessionSkills(s);
            const skillId = CRAFT_SKILL_BY_PROFESSION[s.activeClassId] || `skill_${s.activeClassId}`;
            grantProfessionXp(s, skillId, 50);
            appendLog(s, `队伍制作完成，获得 50 经验`);
          } else {
            s.inventory.gold = (s.inventory.gold || 0) + goldPerMember;
            appendLog(s, `队伍活动完成，获得 ${goldPerMember} 金币`);
          }
        }
      }

      party.currentActivity = undefined;
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, contributions, ts: nowIso() });
      schedulePersist();
      return { success: true, rewards };
    },

    async cancelPartyActivity({ userId, partyId }: {
      userId: string;
      partyId: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party || !party.currentActivity) return { success: false, message: "没有进行中的活动" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以取消活动" };
      party.currentActivity = undefined;
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_cancelled", ts: nowIso() });
      schedulePersist();
      return { success: true };
    },

    async listParties({ limit }: { limit?: number }) {
      const out: Array<{ id: string; name?: string; leaderId: string; memberCount: number; hasActivity: boolean; createdAt: string }> = [];
      for (const p of parties.values()) {
        if (p.members.length >= 6) continue;
        out.push({ id: p.id, name: (p as any).name, leaderId: p.leaderId, memberCount: p.members.length, hasActivity: !!p.currentActivity, createdAt: p.createdAt });
        if (out.length >= (limit ?? 50)) break;
      }
      return out;
    },

    async inviteToParty({ userId, partyId, targetUserId }: {
      userId: string;
      partyId: string;
      targetUserId: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (!party.members.some(m => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
      if (party.members.length >= 6) return { success: false, message: "队伍已满员" };
      if (userId === targetUserId) return { success: false, message: "不能邀请自己" };
      const target = states.get(targetUserId);
      if (!target) return { success: false, message: "玩家不存在" };
      if (target.partyState) return { success: false, message: "对方已有队伍" };
      if (!Array.isArray(target.partyInvites)) target.partyInvites = [];
      const now = Date.now();
      target.partyInvites = target.partyInvites.filter(i => Date.parse(i.invitedAt) > now - 24 * 3600_000);
      if (target.partyInvites.some(i => i.partyId === partyId)) return { success: true, message: "邀请已发送" };
      if (target.partyInvites.length >= 10) target.partyInvites.shift();
      target.partyInvites.push({ partyId, fromUserId: userId, invitedAt: nowIso() });
      notifyUser(targetUserId, { kind: "party:invite", partyId, from: userId });
      schedulePersist();
      return { success: true };
    },

    async acceptPartyInvite({ userId, partyId }: { userId: string; partyId: string }): Promise<Party> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const invite = (st.partyInvites || []).find(i => i.partyId === partyId);
      if (!invite) throw new Error("invite_not_found");
      if (Date.parse(invite.invitedAt) < Date.now() - 24 * 3600_000) {
        st.partyInvites = (st.partyInvites || []).filter(i => i !== invite);
        throw new Error("invite_expired");
      }
      const party = joinPartyCore(userId, partyId);
      st.partyInvites = (st.partyInvites || []).filter(i => i.partyId !== partyId);
      schedulePersist();
      return party;
    },

    async declinePartyInvite({ userId, partyId }: { userId: string; partyId: string }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const before = (st.partyInvites || []).length;
      st.partyInvites = (st.partyInvites || []).filter(i => i.partyId !== partyId);
      schedulePersist();
      return { success: (st.partyInvites || []).length < before };
    },

    async kickPartyMember({ userId, partyId, memberId }: {
      userId: string;
      partyId: string;
      memberId: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以踢出成员" };
      if (memberId === userId) return { success: false, message: "队长不能踢出自己（请直接离开队伍）" };
      const idx = party.members.findIndex(m => m.userId === memberId);
      if (idx === -1) return { success: false, message: "该玩家不在队伍中" };
      party.members.splice(idx, 1);
      const target = states.get(memberId);
      if (target) {
        target.partyState = undefined;
        appendLog(target, "您已被移出队伍");
      }
      const conn = ws.get(memberId);
      if (conn) {
        conn.channels.delete(`party:${partyId}`);
        channelMembers.get(`party:${partyId}`)?.delete(memberId);
      }
      notifyUser(memberId, { kind: "party:kicked", partyId });
      broadcast(`party:${partyId}`, { type: "party:event", event: "member_left", memberId, kicked: true, ts: nowIso() });
      schedulePersist();
      return { success: true };
    },

    async transferPartyLeadership({ userId, partyId, memberId }: {
      userId: string;
      partyId: string;
      memberId: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以移交队长" };
      if (memberId === userId) return { success: false, message: "您已经是队长" };
      const target = party.members.find(m => m.userId === memberId);
      if (!target) return { success: false, message: "该玩家不在队伍中" };
      party.leaderId = memberId;
      for (const m of party.members) m.role = m.userId === memberId ? 'leader' : 'member';
      for (const uid of [userId, memberId]) {
        const s = states.get(uid);
        if (s?.partyState) {
          s.partyState.isLeader = uid === memberId;
          s.partyState.role = s.partyState.isLeader ? 'leader' : 'member';
        }
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "leader_changed", memberId, ts: nowIso() });
      notifyUser(memberId, { kind: "party:leader", partyId });
      schedulePersist();
      return { success: true };
    },

    async leaveParty({ userId, partyId }: {
      userId: string;
      partyId: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) {
        return { success: false, message: "队伍不存在" };
      }

      const memberIndex = party.members.findIndex(m => m.userId === userId);
      if (memberIndex === -1) {
        return { success: false, message: "不在队伍中" };
      }

      const dropChannel = (uid: string) => {
        const conn = ws.get(uid);
        if (conn) conn.channels.delete(`party:${partyId}`);
        channelMembers.get(`party:${partyId}`)?.delete(uid);
      };

      // 如果是队长离开，解散队伍
      if (party.leaderId === userId) {
        parties.delete(partyId);
        broadcast(`party:${partyId}`, { type: "party:event", event: "party_disbanded", ts: nowIso() });
        for (const member of party.members) {
          const memberState = states.get(member.userId);
          if (memberState) {
            memberState.partyState = undefined;
            appendLog(memberState, "队伍已解散");
          }
          dropChannel(member.userId);
        }
        schedulePersist();
        return { success: true, message: "队伍已解散" };
      }

      // 普通成员离开
      party.members.splice(memberIndex, 1);
      const memberState = states.get(userId);
      if (memberState) {
        memberState.partyState = undefined;
        appendLog(memberState, "已离开队伍");
      }
      dropChannel(userId);
      broadcast(`party:${partyId}`, { type: "party:event", event: "member_left", memberId: userId, ts: nowIso() });
      schedulePersist();
      return { success: true };
    },

    async getPartyForUser({ userId }: { userId: string }): Promise<Party | null> {
      const st = states.get(userId);
      const partyId = st?.partyState?.partyId;
      if (!partyId) return null;
      const party = parties.get(partyId);
      if (!party) return null;
      // 单侧悬挂自愈：队伍成员表里没有该用户（历史脏数据/离队漏写），清掉死引用
      if (!party.members.some(m => m.userId === userId)) {
        st!.partyState = undefined;
        schedulePersist();
        return null;
      }
      // 在线状态实时计算（存档里的 isOnline 只是快照，读时必须用 ws 连接表）
      const enriched: Party = {
        ...party,
        members: party.members.map(m => {
          const memberSt = states.get(m.userId);
          const name = memberSt?.settings?.playerName;
          return {
            ...m,
            isOnline: ws.has(m.userId),
            displayName: name?.trim() || `玩家_${m.userId.slice(0, 6)}`,
            ...(memberSt?.activeClassId ? { classId: memberSt.activeClassId } : {}),
            ...(memberSt?.settings?.gender ? { gender: memberSt.settings.gender } : {}),
            ...(memberSt?.settings?.avatar ? { avatar: memberSt.settings.avatar } : {}),
            ...(typeof memberSt?.combatLevel === "number" ? { combatLevel: memberSt.combatLevel } : {}),
          };
        }),
      };
      return enriched;
    },
    async getSkillTree({ professionId, contentPack }: {
      professionId: string;
      contentPack: EnhancedContentPack;
    }) {
      const professionTree = contentPack.professionTrees.find(tree => tree.professionId === professionId);
      if (!professionTree) {
        throw new Error("profession_tree_not_found");
      }
      return professionTree;
    },

    async unlockSkillNode({ userId, professionId, nodeId, contentPack }: {
      userId: string;
      professionId: string;
      nodeId: string;
      contentPack: EnhancedContentPack;
    }): Promise<{ success: boolean; message?: string }> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      ensureProfessionSkills(st);

      const professionTree = contentPack.professionTrees.find(tree => tree.professionId === professionId);
      if (!professionTree) {
        return { success: false, message: "职业技能树不存在" };
      }

      const skillNode = professionTree.skillNodes.find(node => node.id === nodeId);
      if (!skillNode) {
        return { success: false, message: "技能节点不存在" };
      }

      // 检查技能等级要求：采集/生产拆分后节点看两侧最高等级
      const playerSkill = st.skills[`skill_${professionId}`];
      if (professionLevelForTree(st, professionId) < skillNode.requirements.level) {
        return { success: false, message: `技能等级不足，需要 ${skillNode.requirements.level} 级` };
      }
      if (!playerSkill) {
        return { success: false, message: "技能不存在" };
      }

      // 重复解锁幂等：之前已解锁就直接成功返回，避免 recipes/actions 被无限追加
      if (playerSkill.unlockedRecipes.includes(nodeId)) {
        return { success: true, message: "该节点已解锁" };
      }

      // 检查前置技能
      for (const prerequisite of skillNode.requirements.prerequisites) {
        if (!playerSkill.unlockedRecipes.includes(prerequisite)) {
          return { success: false, message: `缺少前置技能：${prerequisite}` };
        }
      }

      // 解锁技能节点（set 语义：同一 id 不重复追加）
      if (skillNode.unlocks.recipes) {
        for (const id of skillNode.unlocks.recipes) {
          if (!playerSkill.unlockedRecipes.includes(id)) playerSkill.unlockedRecipes.push(id);
        }
      }
      if (skillNode.unlocks.actions) {
        for (const id of skillNode.unlocks.actions) {
          if (!playerSkill.unlockedRecipes.includes(id)) playerSkill.unlockedRecipes.push(id);
        }
      }
      if (skillNode.unlocks.enhancements) {
        for (const id of enhancementUnlockIds(professionId, nodeId, skillNode.unlocks.enhancements)) {
          if (!playerSkill.unlockedRecipes.includes(id)) {
            playerSkill.unlockedRecipes.push(id);
          }
        }
        // 更新强化服务提供者索引
        let providerIds = enhancementProviderIndex.get(professionId);
        if (!providerIds) {
          providerIds = new Set();
          enhancementProviderIndex.set(professionId, providerIds);
        }
        providerIds.add(userId);
      }

      // 添加节点ID到已解锁列表
      if (!playerSkill.unlockedRecipes.includes(nodeId)) {
        playerSkill.unlockedRecipes.push(nodeId);
      }

      st.stateRevision = (st.stateRevision ?? 0) + 1;
      appendLog(st, `解锁技能节点：${skillNode.name}`);
      schedulePersist();
      return { success: true };
    },

    async getPlayerSkillProgress({ userId, professionId }: {
      userId: string;
      professionId: string;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      ensureProfessionSkills(st);
      const skillKey = `skill_${professionId}`;
      const playerSkill = st.skills[skillKey];
      if (!playerSkill) throw new Error("state_not_found");
      const craftSkill = st.skills[CRAFT_SKILL_BY_PROFESSION[professionId] || ""];
      // 面板等级 = 技能树门槛等级（采集/生产取高）；两条经验各自单列
      return {
        ...playerSkill,
        level: Math.max(playerSkill.level, craftSkill?.level || 0),
        gatherLevel: playerSkill.level,
        gatherXp: playerSkill.xp,
        craftLevel: craftSkill?.level ?? 0,
        craftXp: craftSkill?.xp ?? 0,
      };
    },

    async awardSkillExperience({ userId, professionId, xpAmount }: {
      userId: string;
      professionId: string;
      xpAmount: number;
    }): Promise<{ leveledUp: boolean; newLevel?: number }> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const skillKey = `skill_${professionId}`;
      let playerSkill = st.skills[skillKey];
      
      if (!playerSkill) {
        playerSkill = {
          level: 1,
          xp: 0,
          unlockedRecipes: [],
          enhancementLevel: 0
        };
        st.skills[skillKey] = playerSkill;
      }

      // 添加经验
      const levelBefore = playerSkill.level;
      playerSkill.xp += xpAmount;
      
      // 检查升级 - 使用新的指数成长曲线
      let xpForNextLevel = getXpForLevel(playerSkill.level);
      while (playerSkill.xp >= xpForNextLevel && playerSkill.level < 200) {
        playerSkill.level += 1;
        playerSkill.xp -= xpForNextLevel;
        appendLog(st, `${professionId} 技能升级到 ${playerSkill.level} 级！`);
        xpForNextLevel = getXpForLevel(playerSkill.level);
      }
      
      // 如果达到满级
      if (playerSkill.level >= 200) {
        playerSkill.level = 200;
      }

      schedulePersist();
      return { leveledUp: playerSkill.level > levelBefore, newLevel: playerSkill.level };
    },

    wsConnect(userId: string, connection: any) {
      const st = states.get(userId);
      const keys = membershipKeys({
        classId: st?.activeClassId,
        partyId: st?.partyState?.partyId,
      });
      const c: WsConn = { socket: socketFromWsConnection(connection), channels: new Set<string>() };
      ws.set(userId, c);
      for (const key of keys) {
        addMembership(channelMembers, c.channels, userId, key);
      }

      // 上线回写：party members[].isOnline 只是快照，presence 以 ws 连接为准
      const partyId = st?.partyState?.partyId;
      if (partyId) {
        const party = parties.get(partyId);
        const m = party?.members.find(mm => mm.userId === userId);
        if (m) { m.isOnline = true; schedulePersist(); }
      }

      try {
        if (c.socket && typeof c.socket.send === "function") {
          c.socket.send(JSON.stringify({ type: "chat:system", channel: "world", ts: nowIso(), text: "connected" }));
        }
      } catch (error) {
        console.error("WebSocket send error:", error);
      }
    },

    wsDisconnect(userId: string) {
      const c = ws.get(userId);
      if (!c) return;

      for (const ch of c.channels) {
        const set = channelMembers.get(ch);
        if (set) {
          set.delete(userId);
          if (set.size === 0) channelMembers.delete(ch);
        }
      }

      ws.delete(userId);

      // 下线回写 member.isOnline
      const st = states.get(userId);
      const partyId = st?.partyState?.partyId;
      if (partyId) {
        const party = parties.get(partyId);
        const m = party?.members.find(mm => mm.userId === userId);
        if (m) { m.isOnline = false; schedulePersist(); }
      }
    },

    wsMessage(userId: string, raw: string) {
      const parsed = safeJson(raw);
      if (!parsed) return;

      if (parsed.type === "chat:send") {
        const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
        const content = typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "";
        if (!content.trim()) {
          // 空消息不能静默吞：发送方至少要知道没发出去
          const c = ws.get(userId);
          try { c?.socket?.send(JSON.stringify({ type: "chat:error", channel, message: "消息不能为空", ts: nowIso() })); } catch { /* 连接已断 */ }
          return;
        }

        // 获取用户职业信息
        const userState = states.get(userId);
        const senderProfession = userState?.activeClassId;
        const senderName = userState?.settings?.playerName || `玩家_${userId.slice(0, 6)}`;

        // 处理私聊
        if (channel === "private" && parsed.recipient) {
          const recipientId = parsed.recipient;
          const recipientConn = ws.get(recipientId);
          
          if (recipientConn && recipientConn.socket) {
            // 发送给接收者
            try {
              recipientConn.socket.send(JSON.stringify({
                type: "chat:message",
                channel: "private",
                sender: userId,
                senderName,
                senderProfession,
                recipient: recipientId,
                ts: nowIso(),
                content
              }));
            } catch (error) {
              console.error('Private message send error:', error);
            }
            
            // 回显给发送者
            const senderConn = ws.get(userId);
            if (senderConn && senderConn.socket) {
              try {
                senderConn.socket.send(JSON.stringify({
                  type: "chat:message",
                  channel: "private",
                  sender: userId,
                  senderName,
                  senderProfession,
                  recipient: recipientId,
                  ts: nowIso(),
                  content,
                  isSelf: true
                }));
              } catch (error) {
                console.error('Private message echo error:', error);
              }
            }
          } else {
            // 接收者不在线，发送错误消息
            const senderConn = ws.get(userId);
            if (senderConn && senderConn.socket) {
              try {
                senderConn.socket.send(JSON.stringify({
                  type: "chat:error",
                  message: "用户不在线",
                  ts: nowIso()
                }));
              } catch (error) {
                console.error('Error message send error:', error);
              }
            }
          }
          return;
        }

        // 处理公共频道：按职业/队伍分桶，payload 仍用 UI 频道名
        const memberKey = membershipKeyForSend(channel, {
          classId: senderProfession,
          partyId: userState?.partyState?.partyId,
        });
        if (!memberKey) {
          const senderConn = ws.get(userId);
          if (senderConn?.socket) {
            try {
              senderConn.socket.send(JSON.stringify({
                type: "chat:error",
                message: channel === "party" ? "未加入队伍" : "无法加入该频道",
                ts: nowIso(),
              }));
            } catch {}
          }
          return;
        }
        if (!channelMembers.get(memberKey)?.has(userId)) {
          const senderConn = ws.get(userId);
          if (senderConn) addMembership(channelMembers, senderConn.channels, userId, memberKey);
        }
        broadcast(memberKey, {
          type: "chat:message",
          channel: payloadChannel(channel),
          sender: userId,
          senderName,
          senderProfession,
          ts: nowIso(),
          content
        });
      }
    },

    // 装备耐久度系统
    async getDurabilityInfo({ userId, itemId }: {
      userId: string;
      itemId: string;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 检查装备是否存在（已穿戴或在背包中均可查看/修理，避免耐久归零卸下后无法再修）
      const isEquipped = Object.values(st.equipment).includes(itemId);
      const inBag = (st.inventory?.[itemId] || 0) > 0;
      if (!isEquipped && !inBag) {
        throw new Error("item_not_equipped");
      }

      // 未记录 = 满耐久（新装备不应显示成 0% 待修）；记录为 0 = 破损（不能 || 兜底成满）
      const maxDurability = Number.isFinite(st.equipment.maxDurability?.[itemId]) ? st.equipment.maxDurability[itemId] : 100;
      const raw = st.equipment.durability?.[itemId];
      const currentDurability = Number.isFinite(raw) ? raw! : maxDurability;
      const durabilityPercent = maxDurability > 0 ? (currentDurability / maxDurability) * 100 : 0;
      const needsRepair = durabilityPercent < 50;

      // 计算修复成本（基于最大耐久度和当前损坏程度）
      const damageAmount = maxDurability - currentDurability;
      const repairCost = Math.ceil(damageAmount * 0.5); // 每点耐久度修复成本0.5金币

      return {
        itemId,
        currentDurability,
        maxDurability,
        durabilityPercent: Math.round(durabilityPercent * 10) / 10,
        needsRepair,
        repairCost
      };
    },

    async repairEquipment({ userId, request }: {
      userId: string;
      request: import("./types").RepairRequest;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 检查装备是否存在（已穿戴或在背包中均可修理）
      const isEquipped = Object.values(st.equipment).includes(request.itemId);
      const inBag = (st.inventory?.[request.itemId] || 0) > 0;
      if (!isEquipped && !inBag) {
        return {
          success: false,
          itemId: request.itemId,
          oldDurability: 0,
          newDurability: 0,
          cost: 0,
          message: "装备未装备或不在背包中"
        };
      }

      const maxDurability = st.equipment.maxDurability[request.itemId] || 100;
      // 未记录过耐久的装备视为全新（满耐久），不是破损——||0 会把全新装备当破损收全款；
      // NaN 视为满耐久自愈，防止脏档产出 NaN 修理费
      const rawOld = st.equipment.durability[request.itemId];
      const oldDurability = Number.isFinite(rawOld) ? rawOld! : maxDurability;

      // 计算修复目标（NaN/负数会让 cost 变 NaN 把金币洗没，非数按满修处理）
      let targetDurability = maxDurability;
      if (request.repairType === 'partial' && request.targetDurability !== undefined) {
        if (!Number.isFinite(request.targetDurability) || request.targetDurability < 0) {
          return {
            success: false,
            itemId: request.itemId,
            oldDurability,
            newDurability: oldDurability,
            cost: 0,
            message: "修复目标无效"
          };
        }
        targetDurability = Math.floor(Math.min(request.targetDurability, maxDurability));
      }

      // 计算修复成本
      const repairAmount = targetDurability - oldDurability;
      if (repairAmount <= 0) {
        return {
          success: false,
          itemId: request.itemId,
          oldDurability,
          newDurability: oldDurability,
          cost: 0,
          message: "装备无需修复"
        };
      }

      const cost = Math.ceil(repairAmount * 0.5);

      // 检查金币是否足够
      const availableGold = st.inventory.gold || 0;
      if (availableGold < cost) {
        return {
          success: false,
          itemId: request.itemId,
          oldDurability,
          newDurability: oldDurability,
          cost,
          message: `金币不足，需要 ${cost} 金币`
        };
      }

      // 执行修复
      st.inventory.gold = availableGold - cost;
      st.equipment.durability[request.itemId] = targetDurability;
      if (st.stats) {
        st.stats.totalGoldSpent = (st.stats.totalGoldSpent || 0) + cost;
      }
      syncAchievements(st);
      st.stateRevision = (st.stateRevision ?? 0) + 1;

      appendLog(st, `修复装备：${request.itemId}，耐久度 ${oldDurability} -> ${targetDurability}，花费 ${cost} 金币`);
      schedulePersist();

      return {
        success: true,
        itemId: request.itemId,
        oldDurability,
        newDurability: targetDurability,
        cost,
        message: "修复成功"
      };
    },

    async reduceDurability({ userId, itemId, amount }: {
      userId: string;
      itemId: string;
      amount: number;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 损耗必须为正有限数：负数/NaN 会把耐久抬到上限之上
      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          success: false,
          newDurability: st.equipment.durability[itemId] ?? st.equipment.maxDurability[itemId] ?? 0,
          broken: false
        };
      }

      // 检查装备是否存在
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) {
        return {
          success: false,
          newDurability: 0,
          broken: false
        };
      }

      // 初始化耐久度（如果是新装备）
      if (st.equipment.durability[itemId] === undefined) {
        st.equipment.durability[itemId] = st.equipment.maxDurability[itemId] || 100;
      }

      const currentDurability = st.equipment.durability[itemId];
      const cap = st.equipment.maxDurability[itemId] || 100;
      const newDurability = Math.min(cap, Math.max(0, currentDurability - amount));
      st.equipment.durability[itemId] = newDurability;

      const broken = newDurability === 0;

      if (broken) {
        appendLog(st, `装备损坏：${itemId}，需要修复才能继续使用`);
      }
      schedulePersist();

      return {
        success: true,
        newDurability,
        broken
      };
    },

    // 价格历史功能
    async getPriceHistory({ itemId, days = 7 }: {
      itemId: string;
      days?: number;
    }): Promise<import("./types").PriceHistory[]> {
      // days 无上限会被当成 DoS 向量（路由只 parseInt 不限范围）；钳到 [1,90]
      const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 90) : 7;
      const itemPriceHistory = priceHistory.get(itemId);
      if (!itemPriceHistory) {
        return [];
      }

      // 获取最近N天的价格历史
      const now = new Date();
      const results: import("./types").PriceHistory[] = [];
      
      for (let i = 0; i < safeDays; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        const record = itemPriceHistory.get(dateKey);
        if (record) {
          results.push(record);
        }
      }

      return results.sort((a, b) => 
        new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
      );
    },

    async getItemPriceTrend({ itemId }: {
      itemId: string;
    }): Promise<{
      itemId: string;
      currentAverage: number;
      weekAverage: number;
      trend: 'up' | 'down' | 'stable';
      changePercent: number;
    }> {
      const history = await this.getPriceHistory({ itemId, days: 7 });
      
      if (history.length === 0) {
        return {
          itemId,
          currentAverage: 0,
          weekAverage: 0,
          trend: 'stable',
          changePercent: 0
        };
      }

      const currentAverage = history[0]?.averagePrice || 0;
      const weekAverage = history.reduce((sum, h) => sum + h.averagePrice, 0) / history.length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let changePercent = 0;
      
      if (history.length >= 2) {
        const oldAverage = history[history.length - 1].averagePrice;
        if (oldAverage > 0) {
          changePercent = ((currentAverage - oldAverage) / oldAverage) * 100;
          if (changePercent > 5) trend = 'up';
          else if (changePercent < -5) trend = 'down';
        }
      }

      return {
        itemId,
        currentAverage,
        weekAverage,
        trend,
        changePercent: Math.round(changePercent * 100) / 100
      };
    },

    // 装备套装效果功能
    async getEquipmentStats({ userId, contentPack }: {
      userId: string;
      contentPack: EnhancedContentPack;
    }): Promise<import("./types").PlayerEquipmentStats> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const baseStats: Record<string, number> = {};
      const enhancementStats: Record<string, number> = {};
      const setStats: Record<string, number> = {};

      // 计算基础属性（跳过幽灵槽与已彻底损坏的装备）
      for (const [slot, itemId] of Object.entries(st.equipment)) {
        if (!itemId || typeof itemId !== 'string') continue;
        if (slot === 'enhancementLevels' || slot === 'durability' || slot === 'maxDurability' || slot === 'tool') continue;
        if ((st.inventory?.[itemId] || 0) <= 0) continue;
        if (isDurabilityBroken(st, itemId)) continue;

        const item = contentPack.items.find((i: any) => i.id === itemId) as any;
        if (!item) continue;

        // 基础属性
        if (item.atk) baseStats.atk = (baseStats.atk || 0) + item.atk;
        if (item.def) baseStats.def = (baseStats.def || 0) + item.def;
        if (item.mag) baseStats.mag = (baseStats.mag || 0) + item.mag;
        if (item.hp) baseStats.hp = (baseStats.hp || 0) + item.hp;
        if (item.mp) baseStats.mp = (baseStats.mp || 0) + item.mp;

        // 强化属性
        const enhancementLevel = st.equipment.enhancementLevels[itemId] || 0;
        if (enhancementLevel > 0) {
          const bonus = enhancementStatMultiplier(enhancementLevel, item) - 1;
          if (item.atk) enhancementStats.atk = (enhancementStats.atk || 0) + item.atk * bonus;
          if (item.def) enhancementStats.def = (enhancementStats.def || 0) + item.def * bonus;
          if (item.mag) enhancementStats.mag = (enhancementStats.mag || 0) + item.mag * bonus;
          if (item.hp) enhancementStats.hp = (enhancementStats.hp || 0) + item.hp * bonus;
          if (item.mp) enhancementStats.mp = (enhancementStats.mp || 0) + item.mp * bonus;
        }
      }

      // 计算套装属性
      const activeSets = await this.getActiveSetBonuses({ userId, contentPack });
      for (const setBonus of activeSets) {
        for (const [stat, value] of Object.entries(setBonus.totalStats)) {
          setStats[stat] = (setStats[stat] || 0) + value;
        }
      }

      // 计算总属性
      const totalStats: Record<string, number> = {};
      const allStats = new Set([
        ...Object.keys(baseStats),
        ...Object.keys(enhancementStats),
        ...Object.keys(setStats)
      ]);

      for (const stat of allStats) {
        totalStats[stat] = 
          (baseStats[stat] || 0) + 
          (enhancementStats[stat] || 0) + 
          (setStats[stat] || 0);
      }

      return {
        baseStats,
        enhancementStats,
        setStats,
        totalStats,
        activeSets
      };
    },

    async getActiveSetBonuses({ userId, contentPack }: {
      userId: string;
      contentPack: EnhancedContentPack;
    }): Promise<import("./types").EquipmentSetBonus[]> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const activeSets: import("./types").EquipmentSetBonus[] = [];

      // 检查每个套装
      for (const set of contentPack.equipmentSets) {
        let equippedPieces = 0;

        // 计算已装备的套装件数（跳过幽灵槽与已损坏件）
        for (const piece of set.pieces) {
          const equippedItem = st.equipment[piece.slot as keyof typeof st.equipment];
          if (
            equippedItem === piece.itemId &&
            (st.inventory?.[piece.itemId] || 0) > 0 &&
            !isDurabilityBroken(st, piece.itemId)
          ) {
            equippedPieces++;
          }
        }

        if (equippedPieces === 0) continue;

        // 计算激活的套装效果：只有已满足的最高档生效
        const top = highestActiveBonus(set.bonuses as Array<{ requiredPieces?: number; stats?: Record<string, number> }>, equippedPieces);
        const activeBonuses = set.bonuses.map(bonus => ({
          ...bonus,
          isActive: bonus === top
        }));

        // 计算总套装属性
        const totalStats: Record<string, number> = {};
        for (const bonus of activeBonuses) {
          if (bonus.isActive) {
            for (const [stat, value] of Object.entries(bonus.stats)) {
              totalStats[stat] = (totalStats[stat] || 0) + value;
            }
          }
        }

        activeSets.push({
          setId: set.id,
          setName: set.name,
          equippedPieces,
          totalPieces: set.pieces.length,
          activeBonuses,
          totalStats
        });
      }

      return activeSets;
    },

    // ========== 交易系统实现 ==========
    
    getTradingOrders: async ({ itemId }) => {
      const orders = Array.from(tradingOrders.values()).filter(order => order.itemId === itemId);
      // 添加用户名
      return orders.map(order => ({
        ...order,
        username: users.get(order.userId)?.guestDeviceId?.slice(0, 8) || '未知用户'
      }));
    },

    getMarketSummary: async () => summarizeOrders(tradingOrders.values()),

    createTradingOrder: async ({ userId, itemId, quantity, price, type, contentPack }) => {
      const state = states.get(userId);
      if (!state) throw new Error('玩家状态不存在');

      // 存储层是经济权威：HTTP zod 挡得住的外部输入，内部调用/旧客户端可能绕过，这里再挡一次
      if (type !== 'buy' && type !== 'sell') throw new Error('订单类型无效');
      if (!validateItemQuantity(quantity)) throw new Error('订单数量无效');
      if (!validatePrice(price)) throw new Error('订单价格无效');
      if (itemId === 'gold') throw new Error('金币不可挂单');
      if (contentPack && !(contentPack.items as any[]).some((i) => i.id === itemId)) throw new Error('物品不存在');

      // 如果是出售单，检查是否有足够的未装备物品
      if (type === 'sell') {
        const currentQuantity = state.inventory[itemId] || 0;
        const equippedCopies = countEquippedCopies(state, itemId);
        if (equippedCopies > 0 && currentQuantity - quantity < equippedCopies) {
          throw new Error('装备中的物品不能挂单');
        }
        if (currentQuantity < quantity) {
          throw new Error(`物品数量不足，当前拥有: ${currentQuantity}`);
        }
        // 扣除物品
        state.inventory[itemId] = currentQuantity - quantity;
        if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
      }

      // 如果是收购单，检查是否有足够的金币
      if (type === 'buy') {
        const totalCost = quantity * price;
        const currentGold = state.inventory.gold || 0;
        if (currentGold < totalCost) {
          throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${currentGold}`);
        }
        // 扣除金币
        state.inventory.gold = currentGold - totalCost;
      }

      state.stateRevision = (state.stateRevision ?? 0) + 1;
      const order: TradingOrder = {
        id: randomUUID(),
        userId,
        itemId,
        quantity,
        price,
        type,
        createdAt: new Date().toISOString()
      };

      tradingOrders.set(order.id, order);
      schedulePersist();
      return order;
    },

    executeTrade: async ({ buyerId, orderId, quantity }) => {
      // buyerId 语义是"成交发起方"：sell 单时其为买家，buy 单时其为卖家。
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error('订单不存在');

      if (!validateItemQuantity(quantity)) throw new Error('交易数量无效');
      if (order.userId === buyerId) throw new Error('不能成交自己的订单');
      if (order.quantity < quantity) throw new Error('订单数量不足');

      const fillerState = states.get(buyerId);
      if (!fillerState) throw new Error('玩家状态不存在');

      const posterState = states.get(order.userId);
      if (!posterState) throw new Error('挂单方状态不存在');

      const totalCost = quantity * order.price;

      if (order.type === 'sell') {
        // 购买出售单：发起方付金收货
        const gold = fillerState.inventory.gold || 0;
        if (gold < totalCost) {
          throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${gold}`);
        }
        fillerState.inventory.gold = gold - totalCost;
        fillerState.inventory[order.itemId] = (fillerState.inventory[order.itemId] || 0) + quantity;
        posterState.inventory.gold = (posterState.inventory.gold || 0) + totalCost;
        if (fillerState.stats) fillerState.stats.totalGoldSpent = (fillerState.stats.totalGoldSpent || 0) + totalCost;
        if (posterState.stats) posterState.stats.totalGoldEarned = (posterState.stats.totalGoldEarned || 0) + totalCost;
        appendLog(posterState, `订单成交：${order.itemId} x${quantity} 获得 ${totalCost} 金币`);
      } else {
        // 卖给收购单：发起方交货收金（买家金币在挂单时已托管扣除）
        const have = fillerState.inventory[order.itemId] || 0;
        if (have < quantity) {
          throw new Error(`物品不足，需要: ${quantity}，当前拥有: ${have}`);
        }
        const equippedCopies = countEquippedCopies(fillerState, order.itemId);
        if (equippedCopies > 0 && have - quantity < equippedCopies) {
          throw new Error('装备中的物品不能出售');
        }
        fillerState.inventory[order.itemId] = have - quantity;
        if (fillerState.inventory[order.itemId] <= 0) delete fillerState.inventory[order.itemId];
        fillerState.inventory.gold = (fillerState.inventory.gold || 0) + totalCost;
        posterState.inventory[order.itemId] = (posterState.inventory[order.itemId] || 0) + quantity;
        if (fillerState.stats) fillerState.stats.totalGoldEarned = (fillerState.stats.totalGoldEarned || 0) + totalCost;
        if (posterState.stats) posterState.stats.totalGoldSpent = (posterState.stats.totalGoldSpent || 0) + totalCost;
        appendLog(posterState, `收购成交：${order.itemId} x${quantity} 花费 ${totalCost} 金币`);
      }
      if (fillerState.stats) fillerState.stats.totalTrades = (fillerState.stats.totalTrades || 0) + 1;
      if (posterState.stats) posterState.stats.totalTrades = (posterState.stats.totalTrades || 0) + 1;
      syncAchievements(fillerState);
      syncAchievements(posterState);
      fillerState.stateRevision = (fillerState.stateRevision ?? 0) + 1;
      posterState.stateRevision = (posterState.stateRevision ?? 0) + 1;

      // 更新订单数量
      order.quantity -= quantity;
      if (order.quantity <= 0) {
        tradingOrders.delete(orderId);
      }
      updatePriceHistory(order.itemId, order.price, quantity);
      schedulePersist();
      notifyUser(order.userId, { kind: "order:filled", orderId, itemId: order.itemId, quantity, gold: totalCost, remaining: Math.max(0, order.quantity) });

      return { success: true, message: '交易成功' };
    },

    cancelTradingOrder: async ({ userId, orderId }) => {
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error('订单不存在');
      if (order.userId !== userId) throw new Error('无权取消此订单');

      const state = states.get(userId);
      if (!state) throw new Error('玩家状态不存在');

      // 先摘除订单再退款，避免并发 cancel 双倍退还。
      const removed = tradingOrders.delete(orderId);
      if (!removed) throw new Error('订单不存在');

      if (order.type === 'sell') {
        state.inventory[order.itemId] = (state.inventory[order.itemId] || 0) + order.quantity;
      } else if (order.type === 'buy') {
        const totalCost = order.quantity * order.price;
        state.inventory.gold = (state.inventory.gold || 0) + totalCost;
      }
      state.stateRevision = (state.stateRevision ?? 0) + 1;
      schedulePersist();
    },

    getMyTradingOrders: async ({ userId }) => {
      const orders = Array.from(tradingOrders.values()).filter(order => order.userId === userId);
      return orders;
    }
  };
}

// 辅助函数：安全解析JSON
function safeJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
