// API 客户端 - 增强版，带重试和错误处理

import { InFlightMap, writeDedupeKey } from './requestGuard';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export type ActionPreview = {
  actionId: string;
  name: string;
  skillId: string;
  requiredLevel: number;
  skillLevel: number;
  baseDurationMs: number;
  effectiveDurationMs: number;
  speedPct: number;
  speedSources: Array<{ label: string; pct: number }>;
  efficiencyPct: number;
  efficiencySources: Array<{ label: string; pct: number }>;
  xpPerAction: number;
};

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryOn: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [408, 429, 500, 502, 503, 504],
};

class ApiClient {
  private baseURL: string;
  private token: string = '';
  private retryConfig: RetryConfig;
  private readonly cache = new Map<string, { expiresAt: number; value: any }>();
  private readonly inFlight = new Map<string, Promise<any>>();
  private readonly writeInFlight = new InFlightMap<any>();
  private cacheEpoch = 0;
  // 401（鉴权失效）回调，由 AuthContext 注册以触发自动登出
  private onUnauthorized: (() => void) | null = null;

  constructor(baseURL: string, retryConfig: Partial<RetryConfig> = {}) {
    this.baseURL = baseURL;
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
  }

  setToken(token: string) {
    this.token = token;
    this.cacheEpoch += 1;
    this.cache.clear();
    this.inFlight.clear();
    this.writeInFlight.clear();
  }

  getToken(): string {
    return this.token;
  }

  /** 注册鉴权失效（401）回调；返回取消注册函数 */
  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  /** 清空所有 GET 缓存与在途去重（写操作成功后调用，避免读到过期数据） */
  clearCache() {
    this.cacheEpoch += 1;
    this.cache.clear();
    this.inFlight.clear();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCacheKey(endpoint: string, options: RequestInit): string {
    return `${options.method || 'GET'}:${endpoint}:${this.token}`;
  }

  private getCachedResponse<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(cacheKey);
      return null;
    }
    return cached.value as T;
  }

  private setCachedResponse(cacheKey: string, value: any, ttlMs = 5000) {
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + ttlMs });
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const canRetry = method === 'GET' || method === 'HEAD';
    const cacheKey = this.getCacheKey(endpoint, { ...options, method });

    if (method === 'GET' && retryCount === 0 && !endpoint.startsWith('/player/state')) {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached !== null) return cached;
      const inflight = this.inFlight.get(cacheKey);
      if (inflight) return inflight as Promise<T>;
    }

    // Only declare a JSON body when there is one: Fastify rejects an empty body that claims
    // application/json (DELETE / bodiless POST would 400).
    const headers: Record<string, string> = {
      ...(options.body !== undefined && options.body !== null ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const reqEpoch = this.cacheEpoch;
    const execute = async (): Promise<T> => {
      try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
          // 鉴权失效：不重试，直接触发登出回调并抛出
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            const authErr: ApiError = new Error(
              errorData.message || errorData.error || '登录已失效，请重新进入游戏'
            );
            authErr.status = 401;
            authErr.code = errorData.code || errorData.error || 'Unauthorized';
            // 避免对 /auth/guest 自身的失败触发循环登出
            if (!endpoint.startsWith('/auth/')) {
              this.onUnauthorized?.();
            }
            throw authErr;
          }
          // 仅安全读取可以自动重试；写操作结果不确定时不得重放。
          if (canRetry && response.status === 409 && retryCount < this.retryConfig.maxRetries) {
            this.clearCache();
            await this.sleep(150 * (retryCount + 1));
            return this.request(endpoint, options, retryCount + 1);
          }
          if (
            canRetry && this.retryConfig.retryOn.includes(response.status) &&
            retryCount < this.retryConfig.maxRetries
          ) {
            await this.sleep(this.retryConfig.retryDelay * (retryCount + 1));
            return this.request(endpoint, options, retryCount + 1);
          }

          const errorData = await response.json().catch(() => ({}));
          // 优先展示后端的友好提示（message），其次错误码（error），最后兜底 HTTP 状态
          const error: ApiError = new Error(
            errorData.message || errorData.error || `HTTP ${response.status}`
          );
          error.status = response.status;
          error.code = errorData.code || errorData.error;
          throw error;
        }

        const data = await response.json();
        if (method === 'GET' && !endpoint.startsWith('/player/state')) {
          if (this.cacheEpoch === reqEpoch) {
            this.setCachedResponse(cacheKey, data, 5000);
          }
        } else if (method !== 'GET') {
          // 写操作（POST/PUT/DELETE）成功后使 GET 缓存与在途去重失效，
          // 否则紧随其后的 GET 会命中写前发出的在途请求，读到旧数据
          this.clearCache();
        }
        return data;
      } catch (error) {
        if (
          canRetry && error instanceof TypeError &&
          error.message === 'Failed to fetch' &&
          retryCount < this.retryConfig.maxRetries
        ) {
          await this.sleep(this.retryConfig.retryDelay * (retryCount + 1));
          return this.request(endpoint, options, retryCount + 1);
        }
        throw error;
      }
    };

    if (method === 'GET') {
      const pending = execute().finally(() => {
        // 只注销自己——写操作清空 inFlight 后注册的新请求，不能被旧请求的 finally 误删
        if (this.inFlight.get(cacheKey) === pending) {
          this.inFlight.delete(cacheKey);
        }
      });
      if (retryCount === 0) this.inFlight.set(cacheKey, pending);
      return pending;
    }

    // 合并同一时间的相同写请求；这不是服务端持久化幂等保证。
    const bodyStr = options.body ? String(options.body) : '';
    const writeKey = writeDedupeKey(method, endpoint, bodyStr);
    if (retryCount === 0) {
      return this.writeInFlight.run(writeKey, () => execute());
    }
    return execute();
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 装备相关API
  async getEquipmentStats() { return this.get('/equipment/stats'); }
  async getSetBonuses() { return this.get('/equipment/set-bonuses'); }
  async getDurability(itemId: string) { return this.get(`/equipment/durability/${itemId}`); }
  async equipItem(slot: string, itemId: string) {
    return this.post('/equipment/equip', { slot, itemId });
  }
  async unequipItem(slot: string) {
    return this.post('/equipment/unequip', { slot });
  }
  async setActiveClass(classId: string) {
    return this.post('/player/class', { classId });
  }
  async repairEquipment(itemId: string, repairType: 'full' | 'partial' = 'full', targetDurability?: number) {
    return this.post('/equipment/repair', { itemId, repairType, targetDurability });
  }

  // 强化相关API
  async enhanceEquipment(itemId: string, targetLevel: number, serviceProviderId?: string, protectionItemId?: string) {
    return this.post('/enhancement/enhance', { itemId, targetLevel, serviceProviderId, protectionItemId });
  }
  async getEnhancementInfo(itemId: string) { return this.get(`/enhancement/info/${itemId}`); }
  /** MWI: enhancing as a timed action with a target level. */
  async startEnhanceRun(itemId: string, targetLevel: number, useProtection: boolean) {
    return this.post('/enhancement/run/start', { itemId, targetLevel, useProtection });
  }
  async stopEnhanceRun() { return this.post('/enhancement/run/stop', {}); }
  async getEnhancementProviders(itemType: string) { return this.get(`/enhancement/providers/${itemType}`); }
  async requestEnhancementService(providerId: string, itemId: string, targetLevel: number, message?: string) {
    return this.post('/enhancement/request-service', { providerId, itemId, targetLevel, message, operationId: crypto.randomUUID() });
  }
  async respondEnhancementService(requestId: string, accepted: boolean, message?: string) {
    return this.post('/enhancement/respond-service', { requestId, accepted, message, operationId: crypto.randomUUID() });
  }
  async getMyEnhancementRequests() { return this.get('/enhancement/my-requests'); }
  async getReceivedEnhancementRequests() { return this.get('/enhancement/received-requests'); }

  // 交易相关API
  async getPriceHistory(itemId: string, days: number = 7) {
    return this.get(`/trading/price-history/${itemId}?days=${days}`);
  }
  async getPriceTrend(itemId: string) { return this.get(`/trading/price-trend/${itemId}`); }

  // 组队相关API
  async createParty(name?: string) { return this.post('/party/create', name ? { name } : {}); }
  async joinParty(partyId: string) { return this.post('/party/join', { partyId }); }
  async setPartyReady(partyId: string, ready: boolean = true) { return this.post('/party/ready', { partyId, ready }); }
  async recruitPartyBot(partyId: string) { return this.post('/party/recruit-bot', { partyId }); }
  async leaveParty(partyId: string) { return this.post('/party/leave', { partyId }); }
  async getMyParty() { return this.get('/party/mine'); }
  async listParties(limit?: number) { return this.get(`/party/list${limit ? `?limit=${limit}` : ''}`); }
  async inviteToParty(partyId: string, targetUserId: string) {
    return this.post('/party/invite', { partyId, targetUserId });
  }
  async acceptPartyInvite(partyId: string) { return this.post('/party/invite/accept', { partyId }); }
  async declinePartyInvite(partyId: string) { return this.post('/party/invite/decline', { partyId }); }
  async kickPartyMember(partyId: string, memberId: string) {
    return this.post('/party/kick', { partyId, memberId });
  }
  async transferPartyLeadership(partyId: string, memberId: string) {
    return this.post('/party/transfer-leadership', { partyId, memberId });
  }
  async startPartyActivity(partyId: string, activityType: 'combat' | 'group_craft' | 'raid' = 'raid', stageId?: string, durationMinutes?: number) {
    return this.post('/party/start-activity', { partyId, activityType, stageId, durationMinutes });
  }
  async partyWaveClear(partyId: string, stageId: string, wave: number, abilityCasts?: Record<string, number>) {
    return this.post('/party/wave-clear', { partyId, stageId, wave, ...(abilityCasts ? { abilityCasts } : {}) });
  }
  async completePartyActivity(partyId: string) { return this.post('/party/complete-activity', { partyId }); }
  async cancelPartyActivity(partyId: string) { return this.post('/party/cancel-activity', { partyId }); }

  // 内容包相关API
  async getContentPack() { return this.get('/content'); }

  // 道具相关API
  async getAllItems() { return this.get('/items/all'); }

  // 交易系统API
  async getTradingOrders(itemId: string) { return this.get(`/trading/orders/${itemId}`); }
  async createTradingOrder(data: { itemId: string; quantity: number; price: number; type: 'sell' | 'buy' }) {
    return this.post('/trading/orders', data);
  }
  async buyFromOrder(orderId: string, quantity: number) {
    return this.post('/trading/buy', { orderId, quantity });
  }
  async cancelTradingOrder(orderId: string) { return this.delete(`/trading/orders/${orderId}`); }
  async getMyTradingOrders() { return this.get('/trading/my-orders'); }

  // 进度系统：生涯统计 / 成就 / 每日任务 / 设置
  async getStats() { return this.get('/progression/stats'); }
  async getAchievements() { return this.get('/progression/achievements'); }
  async claimAchievement(achievementId: string) {
    return this.post('/progression/achievements/claim', { achievementId });
  }
  async getDailyQuests() { return this.get('/progression/daily'); }
  async claimDailyQuest(questId: string) {
    return this.post('/progression/daily/claim', { questId });
  }
  async getSettings() { return this.get('/progression/settings'); }
  /** 给当前账号（游客/Google）补绑用户名+密码，之后可用账号登录 */
  async bindPassword(username: string, password: string) {
    return this.post('/auth/bind/password', { username, password });
  }
  async updateSettings(settings: Partial<{
    soundEnabled: boolean;
    animationsEnabled: boolean;
    compactMode: boolean;
    notificationsEnabled: boolean;
    playerName: string | null;
    avatar: string | null;
    gender: 'male' | 'female' | 'animal' | 'secret' | null;
    characterCreated: boolean;
    tutorialDone: boolean;
  }>) {
    return this.post('/progression/settings', settings);
  }
  async exportEncryptedSave() {
    return this.get('/progression/save/export');
  }
  async importEncryptedSave(saveCode: string) {
    return this.post('/progression/save/import', { saveCode });
  }

  // 游戏系统：消耗品/Buff / 签到 / 商店
  async getBuffs() { return this.get('/systems/buffs'); }
  async consumeItem(itemId: string) { return this.post('/systems/consume', { itemId }); }
  async getCheckIn() { return this.get('/systems/checkin'); }
  async doCheckIn() { return this.post('/systems/checkin', {}); }
  async getShop() { return this.get('/systems/shop'); }
  async getSellPrices() { return this.get('/systems/shop/sell-prices'); }
  async shopBuy(itemId: string, qty: number) { return this.post('/systems/shop/buy', { itemId, qty }); }
  async shopSell(itemId: string, qty: number) { return this.post('/systems/shop/sell', { itemId, qty }); }
  async alchemyCoinify(itemId: string, qty: number) { return this.post('/systems/alchemy/coinify', { itemId, qty }); }

  // 进阶系统：声望 / 赏金契约 / 转生
  async getReputation() { return this.get('/progression2/reputation'); }
  async getBounties() { return this.get('/progression2/bounties'); }
  async acceptBounty(bountyId: string) { return this.post('/progression2/bounties/accept', { bountyId }); }
  async claimBounty(bountyId: string) { return this.post('/progression2/bounties/claim', { bountyId }); }
  async rerollBounties() { return this.post('/progression2/bounties/reroll', {}); }
  async getPrestige() { return this.get('/progression2/prestige'); }
  async doPrestige() { return this.post('/progression2/prestige', {}); }

  async startHpCombat(monsterId: string) {
    return this.post('/combat/hp/start', { monsterId, autoRepeat: true });
  }
  async useHeavyChop() {
    return this.post('/combat/hp/skill', { skillId: 'heavy_chop' });
  }
  /** Manual cast of any learned ability (server enforces cooldown / mana). */
  async castAbility(abilityId: string) {
    return this.post('/combat/hp/skill', { skillId: abilityId });
  }
  /** Ability priority list with triggers (MWI 技能槽). */
  async setAbilityLoadout(slots: Array<{ abilityId: string; trigger?: { type: string; pct?: number } }>) {
    return this.post('/combat/hp/abilities', { slots });
  }
  /** Read a skill book from the inventory. */
  async learnBook(itemId: string) {
    return this.post('/combat/hp/learn', { itemId });
  }

  /** MWI market overview: best ask / bid per item. */
  async getMarketSummary() { return this.get('/trading/summary'); }

  // MWI 任务板
  async getTasks() { return this.get('/tasks'); }
  async claimTask(taskId: string) { return this.post('/tasks/claim', { taskId }); }
  async rerollTask(taskId: string) { return this.post('/tasks/reroll', { taskId }); }
  async deleteTask(taskId: string) { return this.post('/tasks/delete', { taskId }); }
  async setTaskBlock(skillId: string, blocked: boolean) { return this.post('/tasks/block', { skillId, blocked }); }
  async buyTaskShop(itemId: string) { return this.post('/tasks/shop/buy', { itemId }); }
  async claimTaskGift() { return this.post('/tasks/gift/claim', {}); }

  // MWI 房屋
  async getHouses() { return this.get('/houses'); }
  async upgradeRoom(roomId: string) { return this.post('/houses/upgrade', { roomId }); }
  // 动作面板：服务端真值的速度/效率/每小时收益
  async getActionPreview(actionId: string) {
    return this.request<ActionPreview>(`/actions/preview/${encodeURIComponent(actionId)}`, { method: 'GET' });
  }
  // 行动队列
  async queueAction(actionId: string, quantity?: number) {
    return this.post('/actions/queue', quantity ? { actionId, quantity } : { actionId });
  }
  async removeQueuedAction(id: string) {
    return this.delete(`/actions/queue/${encodeURIComponent(id)}`);
  }
  async clearActionQueue() {
    return this.post('/actions/queue/clear', {});
  }
  async moveQueuedAction(id: string, direction: 'up' | 'down') {
    return this.post('/actions/queue/move', { id, direction });
  }
  async chooseChapterBuild(id: 'sharpened_edge' | 'thick_bark') {
    return this.post('/combat/hp/build', { id });
  }
  async setCombatLoadout(loadout: {
    food?: Array<{ itemId: string; triggerMissingHp?: number }>;
    drink?: Array<{ itemId: string; triggerMissingMp?: number }>;
    mp?: Array<{ itemId: string; triggerMissingMp?: number }>;
    autoRepeat?: boolean;
  }) {
    return this.post('/combat/hp/loadout', loadout);
  }
  async fleeHpCombat() {
    return this.post('/combat/hp/flee', {});
  }
}

// baseURL 解析优先级：
//  1) 构建期注入的 VITE_API_URL（生产部署：前后端分域时填后端完整地址，如 https://api.example.com）
//  2) 回退到 '/api'（本地开发：由 Vite dev server 代理到 localhost:3001；或同域反向代理部署）
const API_BASE_URL =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).replace(/\/$/, '')) || '/api';

export const apiClient = new ApiClient(API_BASE_URL);

