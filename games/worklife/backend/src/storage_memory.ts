import { ensureProgression } from "./progression_state";
import {
  applyPlayerCommand,
  commandOperationHash,
  commandRevision,
  PlayerCommandConflict,
  PlayerCommandOperationMismatch,
  type PlayerCommand,
  type PlayerCommandReceipt,
} from "./player_commands";
import type {
  UserRecord,
  EnhancedPlayerState,
  EnhancedContentPack,
  Party,
  EnhancementRequest,
  EnhancementResult,
  EnhancementServiceRequest,
  EnhancementProvider,
  PriceHistory,
  RepairRequest,
  PlayerEquipmentStats,
  EquipmentSetBonus,
} from "./types";
import type { Storage, TradingOrder } from "./storage";
import { findEnhancementRuleForItem, hasEnhancementSkill } from "./enhancement_utils";
import { randomUUID } from "crypto";
import {
  appendLog,
  defaultEnhancedPlayerState,
  normalizeInv,
  simulateToNow,
  createParty,
  addPartyMember,
  summarizeOrders,
  startLifeActionNow,
  UsernameTaken,
} from "./storage";
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
  validateItemQuantity,
  applyAwardSkillExperience,
  computeEnhancementInfo,
  applyEnhanceEquipment,
  validateEnhancementServiceCreation,
  computeDurabilityInfo,
  applyRepairEquipment,
  applyReduceDurability,
  computeActiveSetBonuses,
  computeEquipmentStats,
  computeItemPriceTrend,
  validatePartyActivityTarget,
  snapshotMemberBaseline,
  settlePartyActivityMemberStates,
  validateTradingOrderInput,
  applyTradingOrderEscrow,
  applyTradeSettlement,
} from "./storage_domain";

type WsConn = { socket: any; channels: Set<string> };

export function createMemoryStorage(opts?: { persistPath?: string }): Storage {
  const users = new Map<string, UserRecord>();
  const usersByDevice = new Map<string, string>();
  const usersByGoogle = new Map<string, string>();
  const usersByResumeHash = new Map<string, string>();
  const usersByUsername = new Map<string, string>();
  const states = new Map<string, EnhancedPlayerState>();
  const tradingOrders = new Map<string, TradingOrder>();
  const priceHistory = new Map<string, Map<string, PriceHistory>>();
  const parties = new Map<string, Party>();
  const commandReceipts = new Map<string, Map<string, PlayerCommandReceipt>>();
  const enhancementServiceRequests = new Map<string, EnhancementServiceRequest>();
  const enhancementServiceStats = new Map<string, { completed: number; totalRating: number; ratingCount: number }>();
  const enhancementProviderIndex = new Map<string, Set<string>>();
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
          if (skillKey.startsWith("skill_") && skillObj?.unlockedRecipes?.some((r) => r.startsWith("enhance_"))) {
            const prof = skillKey.slice("skill_".length);
            let set = enhancementProviderIndex.get(prof);
            if (!set) {
              set = new Set();
              enhancementProviderIndex.set(prof, set);
            }
            set.add(id);
          }
        }
      }
    }
    for (const p of snap.parties) parties.set(p.id, p);
    for (const [userId, list] of snap.commandReceipts ?? []) {
      commandReceipts.set(userId, new Map(list.map((r) => [r.operationId, r])));
    }
    for (const o of snap.tradingOrders ?? []) {
      if (o && o.id && o.quantity > 0) tradingOrders.set(o.id, o);
    }
    for (const [itemId, list] of snap.priceHistory ?? []) {
      priceHistory.set(itemId, new Map(list.map((r) => [r.recordDate, r])));
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
        applyParsedSnapshot(parseSnapshot(JSON.parse(fs.readFileSync(primaryPath, "utf8"))));
        return;
      } catch (err) {
        console.error(`[storage] Primary save file corrupted (${primaryPath}), attempting .bak recovery:`, err);
        try {
          fs.copyFileSync(primaryPath, `${primaryPath}.corrupt.${Date.now()}`);
        } catch {}
      }
    }
    if (fs.existsSync(bakPath)) {
      try {
        applyParsedSnapshot(parseSnapshot(JSON.parse(fs.readFileSync(bakPath, "utf8"))));
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
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const snap = buildSnapshot({
      users: users.values(),
      states: states.entries(),
      parties: parties.values(),
      commandReceipts: [...commandReceipts.entries()].map(
        ([userId, m]) => [userId, [...m.values()]] as [string, PlayerCommandReceipt[]],
      ),
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
          if (fs.statSync(targetPath).size > 2) fs.copyFileSync(targetPath, bakPath);
        } catch {}
      }
      fs.renameSync(tmpPath, targetPath);
    } catch (err) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {}
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
      try {
        flushPersist();
      } catch {}
    }
  };
  if (opts?.persistPath) process.on("exit", onProcessExit);

  loadPersist();

  const nowIso = () => new Date().toISOString();

  function currentRevision(userId: string, snapshot: EnhancedPlayerState): number {
    const revision = commandRevision(states.get(userId) ?? snapshot);
    if (commandRevision(snapshot) !== revision) throw new PlayerCommandConflict(revision);
    return revision;
  }

  function broadcast(channel: string, msg: unknown) {
    const members = channelMembers.get(channel);
    if (!members) return;
    const text = JSON.stringify(msg);
    for (const uid of members) {
      const c = ws.get(uid);
      if (c?.socket && typeof c.socket.send === "function") {
        try {
          c.socket.send(text);
        } catch {}
      }
    }
  }

  function notifyUser(userId: string, payload: Record<string, unknown>) {
    const c = ws.get(userId);
    if (c?.socket && typeof c.socket.send === "function") {
      try {
        c.socket.send(JSON.stringify({ type: "notify", ts: nowIso(), ...payload }));
      } catch {}
    }
  }

  function joinPartyCore(userId: string, partyId: string): Party {
    const party = parties.get(partyId);
    if (!party) throw new Error("party_not_found");
    if (party.members.length >= 6) throw new Error("party_full");
    if (party.members.some((m) => m.userId === userId)) throw new Error("already_in_party");
    const st = states.get(userId);
    if (!st) throw new Error("state_not_found");
    if (st.partyState) throw new Error("already_in_party");

    const updatedParty = addPartyMember(party, userId);
    parties.set(partyId, updatedParty);
    st.partyState = { partyId, role: "member", isLeader: false, joinedAt: nowIso() };
    appendLog(st, `加入队伍：${partyId}`);
    const conn = ws.get(userId);
    if (conn && !conn.channels.has(`party:${partyId}`)) {
      addMembership(channelMembers, conn.channels, userId, `party:${partyId}`);
    }
    broadcast(`party:${partyId}`, { type: "party:event", event: "member_joined", memberId: userId, ts: nowIso() });
    schedulePersist();
    return updatedParty;
  }

  function updatePriceHistory(itemId: string, price: number, quantity: number) {
    const today = new Date().toISOString().split("T")[0];
    let itemPriceHistory = priceHistory.get(itemId);
    if (!itemPriceHistory) {
      itemPriceHistory = new Map();
      priceHistory.set(itemId, itemPriceHistory);
    }
    const todayRecord = itemPriceHistory.get(today);
    if (!todayRecord) {
      itemPriceHistory.set(today, {
        itemId,
        averagePrice: price,
        minPrice: price,
        maxPrice: price,
        volume: quantity,
        recordDate: today,
      });
    } else {
      const totalVolume = todayRecord.volume + quantity;
      todayRecord.averagePrice =
        (todayRecord.averagePrice * todayRecord.volume + price * quantity) / totalVolume;
      todayRecord.minPrice = Math.min(todayRecord.minPrice, price);
      todayRecord.maxPrice = Math.max(todayRecord.maxPrice, price);
      todayRecord.volume = totalVolume;
    }
  }

  return {
    async init() {},
    async close() {
      if (opts?.persistPath) process.off("exit", onProcessExit);
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      flushPersist();
    },
    async healthCheck() {
      return { ok: true, latencyMs: 0 };
    },
    async findOrCreateGuestUser(deviceId: string) {
      const existingId = usersByDevice.get(deviceId);
      if (existingId) {
        const u = users.get(existingId);
        if (u) return u;
      }
      const id = randomUUID();
      const rec: UserRecord = { id, guestDeviceId: deviceId, googleSub: null, createdAt: nowIso() };
      users.set(id, rec);
      usersByDevice.set(deviceId, id);
      flushPersist();
      return rec;
    },
    async createGuestUser() {
      const id = randomUUID();
      const deviceId = `guest_${id}`;
      const rec: UserRecord = {
        id,
        guestDeviceId: deviceId,
        googleSub: null,
        createdAt: nowIso(),
        guestResumeTokenHash: null,
        authVersion: 1,
      };
      users.set(id, rec);
      usersByDevice.set(deviceId, id);
      flushPersist();
      return rec;
    },
    async getUser(userId: string) {
      return users.get(userId) ?? null;
    },
    async setGuestResumeTokenHash(userId: string, hash: string) {
      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");
      if (u.guestResumeTokenHash) usersByResumeHash.delete(u.guestResumeTokenHash);
      u.guestResumeTokenHash = hash;
      usersByResumeHash.set(hash, userId);
      flushPersist();
    },
    async findUserByResumeTokenHash(hash: string) {
      const id = usersByResumeHash.get(hash);
      return id ? (users.get(id) ?? null) : null;
    },
    async bindGoogle(userId: string, googleSub: string) {
      const existingUserId = usersByGoogle.get(googleSub);
      if (existingUserId && existingUserId !== userId) throw new Error("google_sub_already_bound");
      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");
      const updated: UserRecord = { ...u, googleSub, authVersion: (u.authVersion ?? 1) + 1 };
      users.set(userId, updated);
      usersByGoogle.set(googleSub, userId);
      flushPersist();
    },
    async findUserByGoogleSub(googleSub: string) {
      const id = usersByGoogle.get(googleSub);
      return id ? (users.get(id) ?? null) : null;
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
      const id = randomUUID();
      const rec: UserRecord = {
        id,
        guestDeviceId: null,
        googleSub: null,
        createdAt: nowIso(),
        username,
        passwordHash,
        authVersion: 1,
      };
      users.set(id, rec);
      usersByUsername.set(key, id);
      flushPersist();
      return rec;
    },
    async findUserByUsername(username: string) {
      const id = usersByUsername.get(username.toLowerCase());
      return id ? (users.get(id) ?? null) : null;
    },
    async bindPassword(userId: string, username: string, passwordHash: string) {
      const key = username.toLowerCase();
      const existingId = usersByUsername.get(key);
      if (existingId && existingId !== userId) throw new UsernameTaken();
      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");
      if (u.username) usersByUsername.delete(u.username.toLowerCase());
      u.username = username;
      u.passwordHash = passwordHash;
      u.authVersion = (u.authVersion ?? 1) + 1;
      usersByUsername.set(key, userId);
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
    async simulateToNow({ userId, state, now, contentPack }) {
      const revision = currentRevision(userId, state);
      const result = simulateToNow({ state: structuredClone(state), now, contentPack });
      const next = { ...(result.state as EnhancedPlayerState), inventory: normalizeInv(result.state.inventory) };
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
          return { state: current, result: existing.result as T, deduplicated: true };
        }
      }
      const revision = commandRevision(current, command.expectedRevision);
      const settled = simulateToNow({ state: structuredClone(current), now: command.now, contentPack: command.contentPack });
      const outcome = applyPlayerCommand(settled.state as EnhancedPlayerState, command.apply);
      outcome.state.inventory = normalizeInv(outcome.state.inventory);
      ensureProgression(outcome.state, command.now);
      outcome.state.stateRevision = revision + 1;
      states.set(command.userId, outcome.state);
      if (command.operationId && requestHash) {
        let receipts = commandReceipts.get(command.userId);
        if (!receipts) commandReceipts.set(command.userId, (receipts = new Map()));
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
      if (!receipts) commandReceipts.set(userId, (receipts = new Map()));
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
    async startLifeAction({ userId, actionId, quantity, now, contentPack }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      startLifeActionNow(st, contentPack as EnhancedContentPack, actionId, quantity, now);
      schedulePersist();
      return st;
    },
    async enhanceEquipment({ userId, request, contentPack, rng }: {
      userId: string;
      request: EnhancementRequest;
      contentPack: EnhancedContentPack;
      rng?: () => number;
    }): Promise<EnhancementResult> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const providerState = request.serviceProviderId ? states.get(request.serviceProviderId) : undefined;
      const { result, consumed } = applyEnhanceEquipment({
        userId,
        st,
        providerState,
        request,
        contentPack,
        rng,
      });
      if (consumed) schedulePersist();
      return result;
    },
    async getEnhancementInfo({ userId, itemId, contentPack }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      return computeEnhancementInfo(st, itemId, contentPack);
    },
    async getEnhancementProviders({ itemType, contentPack }): Promise<EnhancementProvider[]> {
      const enhancementRule = contentPack.enhancementRules.find((rule) => rule.itemType === itemType);
      if (!enhancementRule) return [];
      const requiredProfession = enhancementRule.requiredProfession;
      const skillKey = `skill_${requiredProfession}`;
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

      const providers: EnhancementProvider[] = [];
      for (const userId of providerIds) {
        const state = states.get(userId);
        const playerSkill = state?.skills[skillKey];
        if (!state || !playerSkill || !hasEnhancementSkill(playerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
          providerIds.delete(userId);
          continue;
        }
        const serviceFee = Math.floor(
          (enhancementRule.materials.find((m) => m.itemId === "gold")?.quantity || 100) * 0.5,
        );
        const stats = enhancementServiceStats.get(userId);
        providers.push({
          userId,
          profession: requiredProfession,
          skillLevel: playerSkill.level,
          serviceFee,
          isOnline: ws.has(userId),
          completedServices: stats?.completed || 0,
          rating: stats && stats.ratingCount > 0 ? Math.round((stats.totalRating / stats.ratingCount) * 10) / 10 : 5.0,
        });
      }
      return providers
        .sort((a, b) => (a.skillLevel !== b.skillLevel ? b.skillLevel - a.skillLevel : b.rating - a.rating))
        .slice(0, 50);
    },
    async createEnhancementServiceRequest({ requesterId, providerId, itemId, targetLevel, message, contentPack }) {
      const serviceFee = validateEnhancementServiceCreation({
        requesterId,
        providerId,
        requesterState: states.get(requesterId),
        providerState: states.get(providerId),
        itemId,
        contentPack,
      });
      const requestId = randomUUID();
      const request: EnhancementServiceRequest = {
        id: requestId,
        requesterId,
        providerId,
        itemId,
        targetLevel,
        serviceFee,
        message,
        status: "pending",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      enhancementServiceRequests.set(requestId, request);
      schedulePersist();
      broadcast("enhancement_service", {
        type: "enhancement:service_request",
        request,
        requesterName: requesterId.slice(0, 8) + "...",
      });
      notifyUser(providerId, { kind: "enhancement:service_request", requestId, requesterId, itemId, targetLevel, serviceFee });
      return request;
    },
    async respondToEnhancementServiceRequest({ requestId, providerId, accepted, message, contentPack }) {
      const request = enhancementServiceRequests.get(requestId);
      if (!request) throw new Error("服务请求不存在");
      if (request.providerId !== providerId) throw new Error("您无权响应此请求");
      if (request.status !== "pending") throw new Error("请求已被处理");

      if (accepted) {
        const item = contentPack.items.find((i: any) => i.id === request.itemId);
        const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
        const requiredProfession = ruleMatch?.requiredProfession ?? ruleMatch?.rule?.requiredProfession;
        const providerState = states.get(providerId);
        const providerSkill = requiredProfession ? providerState?.skills[`skill_${requiredProfession}`] : undefined;
        if (
          !providerState ||
          !providerSkill ||
          !requiredProfession ||
          !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, ruleMatch?.rule?.itemType ?? "")
        ) {
          return { success: false, message: "您当前不具备该强化服务资质" };
        }
      }

      request.status = accepted ? "accepted" : "rejected";
      request.responseMessage = message;
      request.updatedAt = nowIso();

      if (accepted) {
        try {
          const result = await this.enhanceEquipment({
            userId: request.requesterId,
            request: {
              itemId: request.itemId,
              targetLevel: request.targetLevel,
              materials: {},
              serviceProviderId: providerId,
            },
            contentPack,
          });
          if (result.success) {
            request.status = "completed";
            const stats = enhancementServiceStats.get(providerId) || { completed: 0, totalRating: 0, ratingCount: 0 };
            stats.completed += 1;
            enhancementServiceStats.set(providerId, stats);
          } else {
            request.status = "rejected";
            request.responseMessage = result.failureReason || "强化失败";
          }
          broadcast("enhancement_service", {
            type: "enhancement:service_completed",
            requestId,
            result,
            providerName: providerId.slice(0, 8) + "...",
          });
          notifyUser(request.requesterId, {
            kind: "enhancement:service_completed",
            requestId,
            success: result.success,
            failureReason: result.failureReason,
          });
          schedulePersist();
          return { success: true, message: result.success ? "强化成功完成" : `强化失败：${result.failureReason}` };
        } catch (error) {
          request.status = "rejected";
          schedulePersist();
          return { success: false, message: error instanceof Error ? error.message : "强化执行失败" };
        }
      } else {
        broadcast("enhancement_service", {
          type: "enhancement:service_rejected",
          requestId,
          message,
          providerName: providerId.slice(0, 8) + "...",
        });
        notifyUser(request.requesterId, { kind: "enhancement:service_rejected", requestId, message });
        schedulePersist();
        return { success: true, message: "已拒绝服务请求" };
      }
    },
    async getEnhancementServiceRequests({ userId, type }) {
      const requests: EnhancementServiceRequest[] = [];
      for (const req of enhancementServiceRequests.values()) {
        if ((type === "requester" && req.requesterId === userId) || (type === "provider" && req.providerId === userId)) {
          requests.push(req);
        }
      }
      return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    async createParty({ userId, name }): Promise<Party> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      if (st.partyState) throw new Error("already_in_party");
      const party = createParty(userId, name);
      parties.set(party.id, party);
      st.partyState = { partyId: party.id, role: "leader", isLeader: true, joinedAt: nowIso() };
      const conn = ws.get(userId);
      if (conn && !conn.channels.has(`party:${party.id}`)) {
        addMembership(channelMembers, conn.channels, userId, `party:${party.id}`);
      }
      appendLog(st, `创建队伍：${party.id}`);
      schedulePersist();
      return party;
    },
    async joinParty({ userId, partyId }): Promise<Party> {
      return joinPartyCore(userId, partyId);
    },
    async startPartyActivity({ userId, partyId, activityType, stageId, durationMinutes, contentPack }) {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (!party.members.some((m) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以开始活动" };
      if (party.currentActivity) return { success: false, message: "队伍已有进行中的活动" };

      const duration = Math.min(480, Math.max(5, Math.floor(durationMinutes ?? 30)));
      const now = new Date();
      const target = validatePartyActivityTarget({
        activityType,
        stageId,
        memberCount: party.members.length,
        contentPack,
      });
      if (!target.ok) return { success: false, message: target.message };

      const baseline: Record<string, ReturnType<typeof snapshotMemberBaseline>> = {};
      for (const m of party.members) {
        baseline[m.userId] = snapshotMemberBaseline(states.get(m.userId), target.raidBossId);
      }

      party.currentActivity = {
        type: activityType,
        stageId,
        startedAt: now.toISOString(),
        endsAt: new Date(now.getTime() + duration * 60_000).toISOString(),
        durationMinutes: duration,
        raidBossId: target.raidBossId,
        raidBossName: target.raidBossName,
        bossKillsNeeded: target.bossKillsNeeded,
        baseline,
      };

      for (const m of party.members) {
        const memberState = states.get(m.userId);
        if (memberState) {
          appendLog(
            memberState,
            `队伍活动开始：${activityType}${target.raidBossName ? `·讨伐 ${target.raidBossName}` : ""}（${duration} 分钟）`,
          );
        }
        const conn = ws.get(m.userId);
        if (conn && !conn.channels.has(`party:${partyId}`)) {
          addMembership(channelMembers, conn.channels, m.userId, `party:${partyId}`);
        }
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_started", activity: party.currentActivity, ts: nowIso() });
      schedulePersist();
      return { success: true };
    },
    async completePartyActivity({ userId, partyId }) {
      const party = parties.get(partyId);
      if (!party || !party.currentActivity) return { success: false, message: "没有进行中的活动" };
      if (!party.members.some((m) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以完成活动" };

      const activity = party.currentActivity;
      if (activity.endsAt && Date.parse(activity.endsAt) > Date.now()) {
        return {
          success: false,
          message: `活动尚未结束（${Math.ceil((Date.parse(activity.endsAt) - Date.now()) / 60000)} 分钟后可结算）`,
        };
      }

      const { rewards, contributions, zeroContribution } = settlePartyActivityMemberStates({
        activity,
        members: party.members,
        getMemberState: (uid) => states.get(uid),
      });
      party.currentActivity = undefined;
      if (zeroContribution) {
        broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, ts: nowIso() });
        schedulePersist();
        return { success: true, rewards, message: "活动期间无人产生贡献，无奖励发放" };
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, contributions, ts: nowIso() });
      schedulePersist();
      return { success: true, rewards };
    },
    async cancelPartyActivity({ userId, partyId }) {
      const party = parties.get(partyId);
      if (!party || !party.currentActivity) return { success: false, message: "没有进行中的活动" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以取消活动" };
      party.currentActivity = undefined;
      broadcast(`party:${partyId}`, { type: "party:event", event: "activity_cancelled", ts: nowIso() });
      schedulePersist();
      return { success: true };
    },
    async listParties({ limit }) {
      const out: Array<{ id: string; name?: string; leaderId: string; memberCount: number; hasActivity: boolean; createdAt: string }> = [];
      for (const p of parties.values()) {
        if (p.members.length >= 6) continue;
        out.push({
          id: p.id,
          name: (p as any).name,
          leaderId: p.leaderId,
          memberCount: p.members.length,
          hasActivity: !!p.currentActivity,
          createdAt: p.createdAt,
        });
        if (out.length >= (limit ?? 50)) break;
      }
      return out;
    },
    async inviteToParty({ userId, partyId, targetUserId }) {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (!party.members.some((m) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
      if (party.members.length >= 6) return { success: false, message: "队伍已满员" };
      if (userId === targetUserId) return { success: false, message: "不能邀请自己" };
      const target = states.get(targetUserId);
      if (!target) return { success: false, message: "玩家不存在" };
      if (target.partyState) return { success: false, message: "对方已有队伍" };
      if (!Array.isArray(target.partyInvites)) target.partyInvites = [];
      const now = Date.now();
      target.partyInvites = target.partyInvites.filter((i) => Date.parse(i.invitedAt) > now - 24 * 3600_000);
      if (target.partyInvites.some((i) => i.partyId === partyId)) return { success: true, message: "邀请已发送" };
      if (target.partyInvites.length >= 10) target.partyInvites.shift();
      target.partyInvites.push({ partyId, fromUserId: userId, invitedAt: nowIso() });
      notifyUser(targetUserId, { kind: "party:invite", partyId, from: userId });
      schedulePersist();
      return { success: true };
    },
    async acceptPartyInvite({ userId, partyId }): Promise<Party> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const invite = (st.partyInvites || []).find((i) => i.partyId === partyId);
      if (!invite) throw new Error("invite_not_found");
      if (Date.parse(invite.invitedAt) < Date.now() - 24 * 3600_000) {
        st.partyInvites = (st.partyInvites || []).filter((i) => i !== invite);
        throw new Error("invite_expired");
      }
      const party = joinPartyCore(userId, partyId);
      st.partyInvites = (st.partyInvites || []).filter((i) => i.partyId !== partyId);
      schedulePersist();
      return party;
    },
    async declinePartyInvite({ userId, partyId }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const before = (st.partyInvites || []).length;
      st.partyInvites = (st.partyInvites || []).filter((i) => i.partyId !== partyId);
      schedulePersist();
      return { success: (st.partyInvites || []).length < before };
    },
    async kickPartyMember({ userId, partyId, memberId }) {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以踢出成员" };
      if (memberId === userId) return { success: false, message: "队长不能踢出自己（请直接离开队伍）" };
      const idx = party.members.findIndex((m) => m.userId === memberId);
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
    async transferPartyLeadership({ userId, partyId, memberId }) {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      if (party.leaderId !== userId) return { success: false, message: "只有队长可以移交队长" };
      if (memberId === userId) return { success: false, message: "您已经是队长" };
      if (!party.members.some((m) => m.userId === memberId)) return { success: false, message: "该玩家不在队伍中" };
      party.leaderId = memberId;
      for (const m of party.members) m.role = m.userId === memberId ? "leader" : "member";
      for (const uid of [userId, memberId]) {
        const s = states.get(uid);
        if (s?.partyState) {
          s.partyState.isLeader = uid === memberId;
          s.partyState.role = s.partyState.isLeader ? "leader" : "member";
        }
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "leader_changed", memberId, ts: nowIso() });
      notifyUser(memberId, { kind: "party:leader", partyId });
      schedulePersist();
      return { success: true };
    },
    async leaveParty({ userId, partyId }) {
      const party = parties.get(partyId);
      if (!party) return { success: false, message: "队伍不存在" };
      const memberIndex = party.members.findIndex((m) => m.userId === userId);
      if (memberIndex === -1) return { success: false, message: "不在队伍中" };

      const dropChannel = (uid: string) => {
        const conn = ws.get(uid);
        if (conn) conn.channels.delete(`party:${partyId}`);
        channelMembers.get(`party:${partyId}`)?.delete(uid);
      };

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
    async getPartyForUser({ userId }): Promise<Party | null> {
      const st = states.get(userId);
      const partyId = st?.partyState?.partyId;
      if (!partyId) return null;
      const party = parties.get(partyId);
      if (!party) return null;
      if (!party.members.some((m) => m.userId === userId)) {
        st!.partyState = undefined;
        schedulePersist();
        return null;
      }
      return {
        ...party,
        members: party.members.map((m) => {
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
    },
    async awardSkillExperience({ userId, professionId, xpAmount }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const res = applyAwardSkillExperience(st, professionId, xpAmount);
      schedulePersist();
      return res;
    },
    wsConnect(userId: string, connection: any) {
      const st = states.get(userId);
      const keys = membershipKeys({
        classId: st?.activeClassId,
        partyId: st?.partyState?.partyId,
      });
      const c: WsConn = { socket: socketFromWsConnection(connection), channels: new Set<string>() };
      ws.set(userId, c);
      for (const key of keys) addMembership(channelMembers, c.channels, userId, key);

      const partyId = st?.partyState?.partyId;
      if (partyId) {
        const m = parties.get(partyId)?.members.find((mm) => mm.userId === userId);
        if (m) {
          m.isOnline = true;
          schedulePersist();
        }
      }
      try {
        if (c.socket && typeof c.socket.send === "function") {
          c.socket.send(JSON.stringify({ type: "chat:system", channel: "world", ts: nowIso(), text: "connected" }));
        }
      } catch {}
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
      const partyId = states.get(userId)?.partyState?.partyId;
      if (partyId) {
        const m = parties.get(partyId)?.members.find((mm) => mm.userId === userId);
        if (m) {
          m.isOnline = false;
          schedulePersist();
        }
      }
    },
    wsMessage(userId: string, raw: string) {
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (parsed?.type !== "chat:send") return;
      const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
      const content = typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "";
      const senderConn = ws.get(userId);
      if (!content.trim()) {
        try {
          senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel, message: "消息不能为空", ts: nowIso() }));
        } catch {}
        return;
      }

      const userState = states.get(userId);
      const senderProfession = userState?.activeClassId;
      const senderName = userState?.settings?.playerName || `玩家_${userId.slice(0, 6)}`;

      if (channel === "private" && parsed.recipient) {
        const recipientId = parsed.recipient;
        const recipientConn = ws.get(recipientId);
        if (recipientConn?.socket) {
          const payload = {
            type: "chat:message",
            channel: "private",
            sender: userId,
            senderName,
            senderProfession,
            recipient: recipientId,
            ts: nowIso(),
            content,
          };
          try {
            recipientConn.socket.send(JSON.stringify(payload));
          } catch {}
          try {
            senderConn?.socket?.send(JSON.stringify({ ...payload, isSelf: true }));
          } catch {}
        } else {
          try {
            senderConn?.socket?.send(JSON.stringify({ type: "chat:error", message: "用户不在线", ts: nowIso() }));
          } catch {}
        }
        return;
      }

      const memberKey = membershipKeyForSend(channel, {
        classId: senderProfession,
        partyId: userState?.partyState?.partyId,
      });
      if (!memberKey) {
        try {
          senderConn?.socket?.send(
            JSON.stringify({
              type: "chat:error",
              message: channel === "party" ? "未加入队伍" : "无法加入该频道",
              ts: nowIso(),
            }),
          );
        } catch {}
        return;
      }
      if (senderConn && !channelMembers.get(memberKey)?.has(userId)) {
        addMembership(channelMembers, senderConn.channels, userId, memberKey);
      }
      broadcast(memberKey, {
        type: "chat:message",
        channel: payloadChannel(channel),
        sender: userId,
        senderName,
        senderProfession,
        ts: nowIso(),
        content,
      });
    },
    async getDurabilityInfo({ userId, itemId }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      return computeDurabilityInfo(st, itemId);
    },
    async repairEquipment({ userId, request }: { userId: string; request: RepairRequest }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const res = applyRepairEquipment(st, request);
      if (res.success) schedulePersist();
      return res;
    },
    async reduceDurability({ userId, itemId, amount }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      const res = applyReduceDurability(st, itemId, amount);
      if (res.success) schedulePersist();
      return res;
    },
    async getPriceHistory({ itemId, days = 7 }): Promise<PriceHistory[]> {
      const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 90) : 7;
      const itemPriceHistory = priceHistory.get(itemId);
      if (!itemPriceHistory) return [];
      const now = new Date();
      const results: PriceHistory[] = [];
      for (let i = 0; i < safeDays; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const record = itemPriceHistory.get(date.toISOString().split("T")[0]);
        if (record) results.push(record);
      }
      return results.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
    },
    async getItemPriceTrend({ itemId }) {
      const history = await this.getPriceHistory({ itemId, days: 7 });
      return computeItemPriceTrend(itemId, history);
    },
    async getEquipmentStats({ userId, contentPack }): Promise<PlayerEquipmentStats> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      return computeEquipmentStats(st, contentPack);
    },
    async getActiveSetBonuses({ userId, contentPack }): Promise<EquipmentSetBonus[]> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      return computeActiveSetBonuses(st, contentPack);
    },
    getTradingOrders: async ({ itemId }) => {
      return Array.from(tradingOrders.values())
        .filter((order) => order.itemId === itemId)
        .map((order) => ({
          ...order,
          username: users.get(order.userId)?.guestDeviceId?.slice(0, 8) || "未知用户",
        }));
    },
    getMarketSummary: async () => summarizeOrders(tradingOrders.values()),
    createTradingOrder: async ({ userId, itemId, quantity, price, type, contentPack }) => {
      const state = states.get(userId);
      if (!state) throw new Error("玩家状态不存在");
      validateTradingOrderInput({ itemId, quantity, price, type, contentPack });
      applyTradingOrderEscrow({ state, itemId, quantity, price, type });
      const order: TradingOrder = {
        id: randomUUID(),
        userId,
        itemId,
        quantity,
        price,
        type,
        createdAt: nowIso(),
      };
      tradingOrders.set(order.id, order);
      schedulePersist();
      return order;
    },
    executeTrade: async ({ buyerId, orderId, quantity }) => {
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error("订单不存在");
      if (!validateItemQuantity(quantity)) throw new Error("交易数量无效");
      if (order.userId === buyerId) throw new Error("不能成交自己的订单");
      if (order.quantity < quantity) throw new Error("订单数量不足");

      const fillerState = states.get(buyerId);
      if (!fillerState) throw new Error("玩家状态不存在");
      const posterState = states.get(order.userId);
      if (!posterState) throw new Error("挂单方状态不存在");

      const totalCost = applyTradeSettlement({
        orderType: order.type,
        itemId: order.itemId,
        quantity,
        price: order.price,
        fillerState,
        posterState,
      });

      order.quantity -= quantity;
      if (order.quantity <= 0) tradingOrders.delete(orderId);
      updatePriceHistory(order.itemId, order.price, quantity);
      schedulePersist();
      notifyUser(order.userId, {
        kind: "order:filled",
        orderId,
        itemId: order.itemId,
        quantity,
        gold: totalCost,
        remaining: Math.max(0, order.quantity),
      });
      return { success: true, message: "交易成功" };
    },
    cancelTradingOrder: async ({ userId, orderId }) => {
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error("订单不存在");
      if (order.userId !== userId) throw new Error("无权取消此订单");
      const state = states.get(userId);
      if (!state) throw new Error("玩家状态不存在");
      if (!tradingOrders.delete(orderId)) throw new Error("订单不存在");

      if (order.type === "sell") {
        state.inventory[order.itemId] = (state.inventory[order.itemId] || 0) + order.quantity;
      } else if (order.type === "buy") {
        state.inventory.gold = (state.inventory.gold || 0) + order.quantity * order.price;
      }
      state.stateRevision = (state.stateRevision ?? 0) + 1;
      schedulePersist();
    },
    getMyTradingOrders: async ({ userId }) => {
      return Array.from(tradingOrders.values()).filter((order) => order.userId === userId);
    },
  };
}
