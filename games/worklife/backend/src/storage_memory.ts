import type { 
  ContentPack, 
  PlayerState, 
  UserRecord, 
  EnhancedPlayerState,
  EnhancedContentPack,
  MarketListing,
  TradeHistory,
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
  createMarketListing,
  calculateTradingFee,
  createParty,
  getXpForLevel,
  addPartyMember,
  calculateEnhancementSuccess,
  calculateEnhancementCost
} from "./storage";

// 使用简单的WebSocket接口定义
interface WebSocketLike {
  send(data: string): void;
  close(): void;
  on?(event: string, listener: (...args: any[]) => void): void;
}

type WsConn = { socket: any; channels: Set<string> };

export function createMemoryStorage(): Storage {
  const users = new Map<string, UserRecord>();
  const usersByDevice = new Map<string, string>();
  const usersByGoogle = new Map<string, string>();
  const states = new Map<string, EnhancedPlayerState>();
  const tradingOrders = new Map<string, TradingOrder>();

  // 新增数据存储
  const marketListings = new Map<string, MarketListing>();
  const tradeHistory = new Map<string, TradeHistory>();
  const priceHistory = new Map<string, Map<string, import("./types").PriceHistory>>(); // itemId -> date -> PriceHistory
  const parties = new Map<string, Party>();
  const partyMembers = new Map<string, PartyMember[]>(); // partyId -> members
  const enhancementServiceRequests = new Map<string, EnhancementServiceRequest>();
  const enhancementServiceStats = new Map<string, { completed: number; totalRating: number; ratingCount: number }>();
  
  // 索引：职业 -> 拥有强化技能的玩家ID列表
  const enhancementProviderIndex = new Map<string, Set<string>>();

  // 防作弊：操作频率限制
  const actionTimestamps = new Map<string, number>(); // userId -> lastActionTime
  const MIN_ACTION_INTERVAL = 100; // 最小操作间隔100ms

  const ws = new Map<string, WsConn>();
  const channelMembers = new Map<string, Set<string>>();

  function nowIso() {
    return new Date().toISOString();
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

  // 防作弊：验证物品数量
  function validateItemQuantity(quantity: number): boolean {
    return validateNumber(quantity, 1, 999999);
  }

  // 防作弊：验证价格
  function validatePrice(price: number): boolean {
    return validateNumber(price, 1, 1000000000);
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
    async close() {},
    async healthCheck() { return { ok: true, latencyMs: 0 }; },
    async cleanupExpiredListings() { return 0; },

    async findOrCreateGuestUser(deviceId: string) {
      const existingId = usersByDevice.get(deviceId);
      if (existingId) return users.get(existingId)!;

      const id = crypto.randomUUID();
      const rec: UserRecord = { id, guestDeviceId: deviceId, googleSub: null, createdAt: nowIso() };
      users.set(id, rec);
      usersByDevice.set(deviceId, id);
      return rec;
    },

    async bindGoogle(userId: string, googleSub: string) {
      const other = usersByGoogle.get(googleSub);
      if (other && other !== userId) {
        throw new Error("google_sub_already_bound");
      }

      const u = users.get(userId);
      if (!u) throw new Error("user_not_found");

      u.googleSub = googleSub;
      usersByGoogle.set(googleSub, userId);
    },

    async getOrCreatePlayerState(userId: string, contentVersion: string) {
      const existing = states.get(userId);
      if (existing) return existing;

      const state = defaultEnhancedPlayerState(contentVersion);
      states.set(userId, state);
      return state;
    },

    async simulateToNow({ userId, state, now, contentPack }: { 
      userId: string; 
      state: EnhancedPlayerState; 
      now: Date; 
      contentPack: EnhancedContentPack 
    }) {
      const result = simulateToNow({ state, now, contentPack });
      const next = { ...result.state as EnhancedPlayerState, inventory: normalizeInv(result.state.inventory) };
      states.set(userId, next);
      return next;
    },

    async savePlayerState(userId: string, state: EnhancedPlayerState) {
      const next = { ...state, inventory: normalizeInv(state.inventory) };
      states.set(userId, next);
      return next;
    },

  async startLifeAction({ userId, actionId, quantity, now, contentPack }: { userId: string; actionId: string; quantity?: number; now: Date; contentPack?: EnhancedContentPack }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 校验动作存在性与技能等级要求（防止越级刷取高阶产出，关键反作弊点）
      const pack = contentPack;
      if (pack && Array.isArray(pack.actions)) {
        const action = pack.actions.find((a: any) => a.id === actionId) as any;
        if (!action) {
          throw new Error("unknown_action");
        }
        // 非战斗动作按 skillId 校验对应职业技能等级；战斗动作按战斗等级校验
        const reqLevel = action.requirements?.skillLevel || 1;
        if (reqLevel > 1) {
          const isCombatAct = typeof action.id === "string" && action.id.startsWith("act_combat_");
          const currentLevel = isCombatAct
            ? (st.combatLevel || 1)
            : (st.skills[action.skillId]?.level || 0);
          if (currentLevel < reqLevel) {
            throw new Error(`skill_level_required:${reqLevel}`);
          }
        }
      }

      // 直接使用前端传来的 actionId，不再做硬编码映射
      // 前端应该发送正确的 actionId（如 act_chop_wood_t1, act_combat_slime 等）
      // 规整批量制作数量：仅取正整数，最大 5000，缺省/非法时按不限次处理（undefined）
      let normalizedQty: number | undefined = undefined;
      if (typeof quantity === "number" && Number.isFinite(quantity)) {
        const q = Math.floor(quantity);
        if (q > 0) normalizedQty = Math.min(q, 5000);
      }
      st.mode = "life_action";
      st.lifeActionState = {
        actionId,
        startedAt: now.toISOString(),
        ...(normalizedQty !== undefined ? { quantity: normalizedQty, remaining: normalizedQty } : {}),
      };
      appendLog(st, normalizedQty !== undefined ? `开始工作：${actionId} ×${normalizedQty}` : `开始工作：${actionId}`);
      return st;
    },

    async startCombatFarm({ userId, stageId, now }: { userId: string; stageId: string; now: Date }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");
      st.mode = "combat_farm";
      st.combatFarmState = { stageId, startedAt: now.toISOString(), seed: pickSeed() };
      appendLog(st, `开始刷关：${stageId}`);
      return st;
    },

    // 新增：装备强化功能
    async enhanceEquipment({ userId, request, contentPack }: {
      userId: string;
      request: EnhancementRequest;
      contentPack: EnhancedContentPack;
    }): Promise<EnhancementResult> {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      // 检查物品是否在装备栏中
      const isEquipped = st.equipment.main_hand === request.itemId || st.equipment.off_hand === request.itemId;
      const isInInventory = (st.inventory[request.itemId] || 0) > 0;
      
      if (!isEquipped && !isInInventory) {
        return {
          success: false,
          newLevel: 0,
          consumedMaterials: {},
          failureReason: "物品不存在"
        };
      }

      const currentLevel = st.equipment.enhancementLevels[request.itemId] || 0;
      
      // 检查是否只能升级一级
      if (request.targetLevel !== currentLevel + 1) {
        return {
          success: false,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: "只能逐级强化"
        };
      }

      const item = contentPack.items.find((i: any) => i.id === request.itemId) as any;
      if (!item) {
        return {
          success: false,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: "未知物品"
        };
      }

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const enhancementRule = ruleMatch?.rule ?? null;
      const requiredProfession = ruleMatch?.requiredProfession ?? null;

      if (!enhancementRule || !requiredProfession) {
        return {
          success: false,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: "该物品无法强化"
        };
      }

      // 检查等级上限
      if (request.targetLevel > enhancementRule.maxLevel) {
        return {
          success: false,
          newLevel: currentLevel,
          consumedMaterials: {},
          failureReason: `强化等级不能超过 +${enhancementRule.maxLevel}`
        };
      }

      // 检查职业要求（如果有服务提供者则跳过）
      if (!request.serviceProviderId) {
        const playerSkill = st.skills[`skill_${requiredProfession}`];
        if (!playerSkill || !hasEnhancementSkill(playerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
          return {
            success: false,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: `需要 ${requiredProfession} 职业的强化技能`
          };
        }
      }

      // 计算材料需求（基于强化规则和目标等级）
      const materials: Record<string, number> = {};
      for (const material of enhancementRule.materials) {
        materials[material.itemId] = material.quantity * request.targetLevel;
      }

      // 检查材料是否足够
      for (const [itemId, required] of Object.entries(materials)) {
        const available = st.inventory[itemId] || 0;
        if (available < required) {
          return {
            success: false,
            newLevel: currentLevel,
            consumedMaterials: {},
            failureReason: `材料不足：${itemId} (需要 ${required}, 拥有 ${available})`
          };
        }
      }

      // 计算成功率（基于强化规则和等级）
      const baseSuccessRate = enhancementRule.successRate;
      const levelPenalty = Math.pow(0.95, request.targetLevel - 1); // 等级越高成功率越低
      const finalSuccessRate = Math.max(0.1, baseSuccessRate * levelPenalty);
      
      const success = Math.random() < finalSuccessRate;

      // 消耗材料
      for (const [itemId, required] of Object.entries(materials)) {
        st.inventory[itemId] = (st.inventory[itemId] || 0) - required;
      }

      // 如果有服务提供者，支付服务费
      if (request.serviceProviderId) {
        const goldMaterial = enhancementRule.materials.find((m: { itemId: string }) => m.itemId === "gold");
        const serviceFee = Math.floor((goldMaterial?.quantity || 100) * 0.5);
        const providerState = states.get(request.serviceProviderId);
        if (providerState) {
          providerState.inventory.gold = (providerState.inventory.gold || 0) + serviceFee;
          appendLog(providerState, `提供强化服务获得 ${serviceFee} 金币`);
        }
      }

      if (success) {
        st.equipment.enhancementLevels[request.itemId] = request.targetLevel;
        appendLog(st, `装备强化成功：${item.name} -> +${request.targetLevel}`);
        
        // 计算属性加成
        const bonusStats: Record<string, number> = {};
        if (item.type === "weapon" || item.id?.includes("weapon")) {
          bonusStats.atk = request.targetLevel * 5;
        } else if (item.type === "armor" || item.name?.includes("装备")) {
          bonusStats.def = request.targetLevel * 3;
        } else if (item.id?.includes("staff")) {
          bonusStats.mag = request.targetLevel * 4;
        }
        
        return {
          success: true,
          newLevel: request.targetLevel,
          consumedMaterials: materials,
          bonusStats
        };
      } else {
        appendLog(st, `装备强化失败：${item.name} (成功率: ${Math.round(finalSuccessRate * 100)}%)`);
        
        return {
          success: false,
          newLevel: currentLevel,
          consumedMaterials: materials,
          failureReason: `强化失败 (成功率: ${Math.round(finalSuccessRate * 100)}%)`
        };
      }
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

      if (!enhancementRule || !requiredProfession) {
        return {
          currentLevel,
          maxLevel: 0,
          nextLevelCost: {},
          successRate: 0,
          canEnhance: false,
          requiredProfession: undefined
        };
      }

      // 计算下一级的材料需求
      const nextLevel = currentLevel + 1;
      const nextLevelCost: Record<string, number> = {};
      for (const material of enhancementRule.materials) {
        nextLevelCost[material.itemId] = material.quantity * nextLevel;
      }

      // 计算成功率
      const baseSuccessRate = enhancementRule.successRate;
      const levelPenalty = Math.pow(0.95, nextLevel - 1);
      const successRate = Math.max(0.1, baseSuccessRate * levelPenalty);

      // 检查是否可以强化
      const playerSkill = st.skills[`skill_${requiredProfession}`];
      const hasSkill = playerSkill && hasEnhancementSkill(playerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType);
      const canEnhance = currentLevel < enhancementRule.maxLevel && hasSkill;

      return {
        currentLevel,
        maxLevel: enhancementRule.maxLevel,
        nextLevelCost,
        successRate: Math.round(successRate * 100) / 100,
        canEnhance,
        requiredProfession: requiredProfession || undefined
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

      // 从索引中获取提供者信息
      for (const userId of providerIds) {
        const state = states.get(userId);
        if (!state) continue;
        
        const playerSkill = state.skills[skillKey];
        if (!playerSkill) continue;

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
      
      // 验证请求者拥有该物品
      if (!requesterState.inventory[itemId] || requesterState.inventory[itemId] < 1) {
        throw new Error("您没有该物品");
      }

      // 获取强化规则和计算服务费
      const item = contentPack.items.find((i: any) => i.id === itemId);
      const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
      const enhancementRule = ruleMatch?.rule;
      if (!enhancementRule) throw new Error("该物品无法强化");

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

      // 发送通知给服务提供者
      broadcastToChannel('enhancement_service', {
        type: 'enhancement:service_request',
        request,
        requesterName: requesterId.slice(0, 8) + '...'
      });

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
          }

          // 通知请求者
          broadcastToChannel('enhancement_service', {
            type: 'enhancement:service_completed',
            requestId,
            result,
            providerName: providerId.slice(0, 8) + '...'
          });

          return { success: true, message: result.success ? "强化成功完成" : `强化失败：${result.failureReason}` };
        } catch (error) {
          request.status = 'rejected';
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

    // 新增：交易行功能
    async listItemForSale({ userId, itemId, quantity, pricePerUnit, duration }: {
      userId: string;
      itemId: string;
      quantity: number;
      pricePerUnit: number;
      duration?: number;
    }): Promise<MarketListing> {
      // 防作弊：检查操作频率
      if (!checkActionRate(userId)) {
        throw new Error("操作过于频繁，请稍后再试");
      }

      // 防作弊：验证数量和价格
      if (!validateItemQuantity(quantity)) {
        throw new Error("物品数量无效");
      }
      if (!validatePrice(pricePerUnit)) {
        throw new Error("价格无效");
      }

      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const available = st.inventory[itemId] || 0;
      if (available < quantity) {
        throw new Error("insufficient_items");
      }

      // 创建市场列表
      const listing = createMarketListing(userId, itemId, quantity, pricePerUnit, duration);
      
      // 从背包中移除物品
      st.inventory[itemId] = available - quantity;
      
      // 添加到活跃列表
      st.tradingState.activeListings.push(listing.id);
      
      // 存储列表
      marketListings.set(listing.id, listing);
      
      appendLog(st, `上架物品：${itemId} x${quantity} @ ${pricePerUnit}金币`);
      
      return listing;
    },

    async purchaseItem({ userId, listingId, quantity }: {
      userId: string;
      listingId: string;
      quantity: number;
    }): Promise<{ success: boolean; message?: string }> {
      // 防作弊：检查操作频率
      if (!checkActionRate(userId)) {
        return { success: false, message: "操作过于频繁，请稍后再试" };
      }

      // 防作弊：验证数量
      if (!validateItemQuantity(quantity)) {
        return { success: false, message: "购买数量无效" };
      }

      const st = states.get(userId);
      const listing = marketListings.get(listingId);
      
      if (!st) throw new Error("state_not_found");
      if (!listing || listing.status !== 'active') {
        return { success: false, message: "商品不存在或已下架" };
      }
      
      // 防作弊：不能购买自己的商品
      if (listing.sellerId === userId) {
        return { success: false, message: "不能购买自己的商品" };
      }
      
      if (quantity > listing.quantity) {
        return { success: false, message: "购买数量超过可用数量" };
      }

      const totalPrice = quantity * listing.pricePerUnit;
      const fee = calculateTradingFee(totalPrice);
      const finalPrice = totalPrice + fee;

      // 检查金币是否足够
      const availableGold = st.inventory.gold || 0;
      if (availableGold < finalPrice) {
        return { success: false, message: "金币不足" };
      }

      // 执行交易
      st.inventory.gold = availableGold - finalPrice;
      st.inventory[listing.itemId] = (st.inventory[listing.itemId] || 0) + quantity;

      // 更新卖家
      const sellerState = states.get(listing.sellerId);
      if (sellerState) {
        sellerState.inventory.gold = (sellerState.inventory.gold || 0) + totalPrice;
        appendLog(sellerState, `物品售出：${listing.itemId} x${quantity} 获得 ${totalPrice}金币`);
      }

      // 更新列表
      listing.quantity -= quantity;
      if (listing.quantity === 0) {
        listing.status = 'sold';
      }

      // 记录交易历史
      const trade: TradeHistory = {
        id: crypto.randomUUID(),
        buyerId: userId,
        sellerId: listing.sellerId,
        itemId: listing.itemId,
        quantity,
        totalPrice,
        completedAt: nowIso()
      };
      tradeHistory.set(trade.id, trade);

      // 更新价格历史
      updatePriceHistory(listing.itemId, listing.pricePerUnit, quantity);

      // 添加到购买历史
      st.tradingState.purchaseHistory.push({
        itemId: listing.itemId,
        price: totalPrice,
        timestamp: nowIso()
      });

      appendLog(st, `购买物品：${listing.itemId} x${quantity} 花费 ${finalPrice}金币`);

      return { success: true };
    },

    async getMarketListings({ query, filters }: {
      query?: string;
      filters?: any;
    }): Promise<MarketListing[]> {
      let activeListings = Array.from(marketListings.values())
        .filter(listing => listing.status === 'active' && new Date(listing.expiresAt).getTime() > Date.now());
      
      // 搜索过滤
      if (query) {
        activeListings = activeListings.filter(listing => 
          listing.itemId.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      // 分页限制，最多返回100条
      const limit = filters?.limit || 100;
      const offset = filters?.offset || 0;
      
      return activeListings
        .sort((a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime())
        .slice(offset, offset + limit);
    },

    // 新增：组队功能
    async createParty({ userId, name }: { userId: string; name?: string }): Promise<Party> {
      // 检查用户是否已经在队伍中
      const st = states.get(userId);
      if (st && st.partyState) {
        throw new Error("already_in_party");
      }

      // 创建新队伍
      const party = createParty(userId, name);
      parties.set(party.id, party);

      // 更新玩家状态
      if (st) {
        st.partyState = {
          partyId: party.id,
          role: 'leader',
          isLeader: true,
          joinedAt: new Date().toISOString()
        };
        appendLog(st, `创建队伍：${party.id}`);
      }

      return party;
    },

    async joinParty({ userId, partyId }: { userId: string; partyId: string }): Promise<Party> {
      const party = parties.get(partyId);
      if (!party) {
        throw new Error("party_not_found");
      }

      if (party.members.length >= 6) {
        throw new Error("party_full");
      }

      if (party.members.some(m => m.userId === userId)) {
        throw new Error("already_in_party");
      }

      // 添加成员到队伍
      const updatedParty = addPartyMember(party, userId);
      parties.set(partyId, updatedParty);

      // 更新玩家状态
      const st = states.get(userId);
      if (st) {
        st.partyState = {
          partyId: partyId,
          role: 'member',
          isLeader: false,
          joinedAt: new Date().toISOString()
        };
        appendLog(st, `加入队伍：${partyId}`);
      }

      return updatedParty;
    },

    // 队伍活动功能
    async startPartyActivity({ userId, partyId, activityType, stageId }: {
      userId: string;
      partyId: string;
      activityType: 'combat' | 'group_craft';
      stageId?: string;
    }): Promise<{ success: boolean; message?: string }> {
      const party = parties.get(partyId);
      if (!party) {
        return { success: false, message: "队伍不存在" };
      }

      const member = party.members.find(m => m.userId === userId);
      if (!member) {
        return { success: false, message: "您不是该队伍成员" };
      }
      if (party.leaderId !== userId) {
        return { success: false, message: "只有队长可以开始活动" };
      }

      // 检查是否已有活动
      if (party.currentActivity) {
        return { success: false, message: "队伍已有进行中的活动" };
      }

      // 检查成员是否都准备好
      const allReady = party.members.every(m => m.isOnline);
      if (!allReady) {
        return { success: false, message: "部分成员未在线" };
      }

      // 开始活动
      party.currentActivity = {
        type: activityType,
        stageId,
        startedAt: new Date().toISOString()
      };

      // 通知所有成员
      for (const member of party.members) {
        const memberState = states.get(member.userId);
        if (memberState) {
          appendLog(memberState, `队伍活动开始：${activityType}`);
        }
      }

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
      if (!member) {
        return { success: false, message: "您不是该队伍成员" };
      }
      if (party.leaderId !== userId) {
        return { success: false, message: "只有队长可以完成活动" };
      }

      const activity = party.currentActivity;
      const rewards: Record<string, Record<string, number>> = {};

      // 根据活动类型分配奖励
      if (activity.type === 'combat' && activity.stageId) {
        // 战斗奖励：基于队伍人数和等级
        const baseReward = 100 * party.members.length;
        const goldPerMember = Math.floor(baseReward / party.members.length);

        for (const member of party.members) {
          rewards[member.userId] = { gold: goldPerMember };
          
          const memberState = states.get(member.userId);
          if (memberState) {
            memberState.inventory.gold = (memberState.inventory.gold || 0) + goldPerMember;
            appendLog(memberState, `队伍活动完成，获得 ${goldPerMember} 金币`);
          }
        }
      } else if (activity.type === 'group_craft') {
        // 制作奖励：经验加成
        const xpBonus = 50 * party.members.length;

        for (const member of party.members) {
          rewards[member.userId] = { xp: xpBonus };
          
          const memberState = states.get(member.userId);
          if (memberState) {
            appendLog(memberState, `队伍制作完成，获得 ${xpBonus} 经验`);
          }
        }
      }

      // 清除活动状态
      party.currentActivity = undefined;

      return { success: true, rewards };
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

      // 如果是队长离开，解散队伍
      if (party.leaderId === userId) {
        parties.delete(partyId);
        
        // 通知所有成员
        for (const member of party.members) {
          const memberState = states.get(member.userId);
          if (memberState) {
            memberState.partyState = undefined;
            appendLog(memberState, "队伍已解散");
          }
        }
        
        return { success: true, message: "队伍已解散" };
      }

      // 普通成员离开
      party.members.splice(memberIndex, 1);
      
      const memberState = states.get(userId);
      if (memberState) {
        memberState.partyState = undefined;
        appendLog(memberState, "已离开队伍");
      }

      return { success: true };
    },

    // 新增：技能树和进度系统
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

      const professionTree = contentPack.professionTrees.find(tree => tree.professionId === professionId);
      if (!professionTree) {
        return { success: false, message: "职业技能树不存在" };
      }

      const skillNode = professionTree.skillNodes.find(node => node.id === nodeId);
      if (!skillNode) {
        return { success: false, message: "技能节点不存在" };
      }

      // 检查技能等级要求
      const playerSkill = st.skills[`skill_${professionId}`];
      if (!playerSkill || playerSkill.level < skillNode.requirements.level) {
        return { success: false, message: `技能等级不足，需要 ${skillNode.requirements.level} 级` };
      }

      // 检查前置技能
      for (const prerequisite of skillNode.requirements.prerequisites) {
        if (!playerSkill.unlockedRecipes.includes(prerequisite)) {
          return { success: false, message: `缺少前置技能：${prerequisite}` };
        }
      }

      // 解锁技能节点
      if (skillNode.unlocks.recipes) {
        playerSkill.unlockedRecipes.push(...skillNode.unlocks.recipes);
      }
      if (skillNode.unlocks.actions) {
        playerSkill.unlockedRecipes.push(...skillNode.unlocks.actions);
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

      appendLog(st, `解锁技能节点：${skillNode.name}`);
      return { success: true };
    },

    async getPlayerSkillProgress({ userId, professionId }: {
      userId: string;
      professionId: string;
    }) {
      const st = states.get(userId);
      if (!st) throw new Error("state_not_found");

      const skillKey = `skill_${professionId}`;
      const playerSkill = st.skills[skillKey];
      
      if (!playerSkill) {
        // 初始化技能
        st.skills[skillKey] = {
          level: 1,
          xp: 0,
          unlockedRecipes: [],
          enhancementLevel: 0
        };
        return st.skills[skillKey];
      }

      return playerSkill;
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

      return { leveledUp: playerSkill.level > levelBefore, newLevel: playerSkill.level };
    },

    wsConnect(userId: string, connection: any) {
      const c: WsConn = { socket: connection.socket, channels: new Set(["world"]) };
      ws.set(userId, c);

      const set = channelMembers.get("world") ?? new Set<string>();
      set.add(userId);
      channelMembers.set("world", set);

      try {
        if (c.socket && typeof c.socket.send === 'function') {
          c.socket.send(JSON.stringify({ type: "chat:system", channel: "world", ts: nowIso(), text: "connected" }));
        }
      } catch (error) {
        console.error('WebSocket send error:', error);
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
    },

    wsMessage(userId: string, raw: string) {
      const parsed = safeJson(raw);
      if (!parsed) return;

      if (parsed.type === "chat:send") {
        const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
        const content = typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "";
        if (!content) return;

        // 获取用户职业信息
        const userState = states.get(userId);
        const senderProfession = userState?.activeClassId;

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

        // 处理公共频道
        broadcast(channel, {
          type: "chat:message",
          channel,
          sender: userId,
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

      // 检查装备是否存在
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) {
        throw new Error("item_not_equipped");
      }

      const currentDurability = st.equipment.durability[itemId] || 0;
      const maxDurability = st.equipment.maxDurability[itemId] || 100;
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

      // 检查装备是否存在
      const isEquipped = Object.values(st.equipment).includes(request.itemId);
      if (!isEquipped) {
        return {
          success: false,
          itemId: request.itemId,
          oldDurability: 0,
          newDurability: 0,
          cost: 0,
          message: "装备未装备"
        };
      }

      const oldDurability = st.equipment.durability[request.itemId] || 0;
      const maxDurability = st.equipment.maxDurability[request.itemId] || 100;

      // 计算修复目标
      let targetDurability = maxDurability;
      if (request.repairType === 'partial' && request.targetDurability !== undefined) {
        targetDurability = Math.min(request.targetDurability, maxDurability);
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

      appendLog(st, `修复装备：${request.itemId}，耐久度 ${oldDurability} -> ${targetDurability}，花费 ${cost} 金币`);

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
      const newDurability = Math.max(0, currentDurability - amount);
      st.equipment.durability[itemId] = newDurability;

      const broken = newDurability === 0;

      if (broken) {
        appendLog(st, `装备损坏：${itemId}，需要修复才能继续使用`);
      }

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
      const itemPriceHistory = priceHistory.get(itemId);
      if (!itemPriceHistory) {
        return [];
      }

      // 获取最近N天的价格历史
      const now = new Date();
      const results: import("./types").PriceHistory[] = [];
      
      for (let i = 0; i < days; i++) {
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

      // 计算基础属性
      for (const [slot, itemId] of Object.entries(st.equipment)) {
        if (!itemId || typeof itemId !== 'string') continue;
        if (slot === 'enhancementLevels' || slot === 'durability' || slot === 'maxDurability') continue;

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
          if (item.atk) enhancementStats.atk = (enhancementStats.atk || 0) + (item.atk * enhancementLevel * 0.1);
          if (item.def) enhancementStats.def = (enhancementStats.def || 0) + (item.def * enhancementLevel * 0.1);
          if (item.mag) enhancementStats.mag = (enhancementStats.mag || 0) + (item.mag * enhancementLevel * 0.1);
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

        // 计算已装备的套装件数
        for (const piece of set.pieces) {
          const equippedItem = st.equipment[piece.slot as keyof typeof st.equipment];
          if (equippedItem === piece.itemId) {
            equippedPieces++;
          }
        }

        if (equippedPieces === 0) continue;

        // 计算激活的套装效果
        const activeBonuses = set.bonuses.map(bonus => ({
          ...bonus,
          isActive: equippedPieces >= bonus.requiredPieces
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

    createTradingOrder: async ({ userId, itemId, quantity, price, type }) => {
      const state = states.get(userId);
      if (!state) throw new Error('玩家状态不存在');

      // 如果是出售单，检查是否有足够的物品
      if (type === 'sell') {
        const currentQuantity = state.inventory[itemId] || 0;
        if (currentQuantity < quantity) {
          throw new Error(`物品数量不足，当前拥有: ${currentQuantity}`);
        }
        // 扣除物品
        state.inventory[itemId] = currentQuantity - quantity;
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
      return order;
    },

    executeTrade: async ({ buyerId, orderId, quantity }) => {
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error('订单不存在');

      if (order.type !== 'sell') throw new Error('只能购买出售单');
      if (order.userId === buyerId) throw new Error('不能购买自己的订单');
      if (order.quantity < quantity) throw new Error('订单数量不足');

      const buyerState = states.get(buyerId);
      if (!buyerState) throw new Error('买家状态不存在');

      const sellerState = states.get(order.userId);
      if (!sellerState) throw new Error('卖家状态不存在');

      const totalCost = quantity * order.price;
      const buyerGold = buyerState.inventory.gold || 0;

      if (buyerGold < totalCost) {
        throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${buyerGold}`);
      }

      // 执行交易
      buyerState.inventory.gold = buyerGold - totalCost;
      buyerState.inventory[order.itemId] = (buyerState.inventory[order.itemId] || 0) + quantity;

      sellerState.inventory.gold = (sellerState.inventory.gold || 0) + totalCost;

      // 更新订单数量
      order.quantity -= quantity;
      if (order.quantity <= 0) {
        tradingOrders.delete(orderId);
      }

      return { success: true, message: '交易成功' };
    },

    cancelTradingOrder: async ({ userId, orderId }) => {
      const order = tradingOrders.get(orderId);
      if (!order) throw new Error('订单不存在');
      if (order.userId !== userId) throw new Error('无权取消此订单');

      const state = states.get(userId);
      if (!state) throw new Error('玩家状态不存在');

      // 退还物品或金币
      if (order.type === 'sell') {
        state.inventory[order.itemId] = (state.inventory[order.itemId] || 0) + order.quantity;
      } else if (order.type === 'buy') {
        const totalCost = order.quantity * order.price;
        state.inventory.gold = (state.inventory.gold || 0) + totalCost;
      }

      tradingOrders.delete(orderId);
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
