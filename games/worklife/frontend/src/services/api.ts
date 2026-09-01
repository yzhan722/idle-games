// API 客户端 - 增强版，带重试和错误处理

interface ApiError extends Error {
  status?: number;
  code?: string;
}

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
  // 写操作（POST/PUT/DELETE）去重：防止快速双击连发多个相同写请求。
  // key = method:endpoint:body，value = 正在进行中的 Promise。
  private readonly writeInFlight = new Map<string, Promise<any>>();
  // 401（鉴权失效）回调，由 AuthContext 注册以触发自动登出
  private onUnauthorized: (() => void) | null = null;

  constructor(baseURL: string, retryConfig: Partial<RetryConfig> = {}) {
    this.baseURL = baseURL;
    this.retryConfig = { ...defaultRetryConfig, ...retryConfig };
  }

  setToken(token: string) {
    this.token = token;
    this.cache.clear();
    this.inFlight.clear();
  }

  getToken(): string {
    return this.token;
  }

  /** 注册鉴权失效（401）回调；返回取消注册函数 */
  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  /** 清空所有 GET 缓存（写操作成功后调用，避免读到过期数据） */
  clearCache() {
    this.cache.clear();
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
    const cacheKey = this.getCacheKey(endpoint, { ...options, method });

    if (method === 'GET') {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached !== null) return cached;
      const inflight = this.inFlight.get(cacheKey);
      if (inflight) return inflight as Promise<T>;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

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
          // 状态版本冲突（并发写）：清掉本地缓存后短暂退避重试，对用户透明
          if (response.status === 409 && retryCount < this.retryConfig.maxRetries) {
            this.cache.clear();
            await this.sleep(150 * (retryCount + 1));
            return this.request(endpoint, options, retryCount + 1);
          }
          if (
            this.retryConfig.retryOn.includes(response.status) &&
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
        if (method === 'GET') {
          this.setCachedResponse(cacheKey, data, 5000);
        } else {
          // 写操作（POST/PUT/DELETE）成功后使 GET 缓存失效，确保后续读取拿到最新状态
          this.cache.clear();
        }
        return data;
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message === 'Failed to fetch' &&
          retryCount < this.retryConfig.maxRetries
        ) {
          await this.sleep(this.retryConfig.retryDelay * (retryCount + 1));
          return this.request(endpoint, options, retryCount + 1);
        }
        throw error;
      } finally {
        if (method === 'GET') {
          this.inFlight.delete(cacheKey);
        }
      }
    };

    if (method === 'GET') {
      const pending = execute();
      this.inFlight.set(cacheKey, pending);
      return pending;
    }

    // 写操作去重：同 endpoint + 相同 body 的 POST/PUT/DELETE 如果还在 in-flight，
    // 复用同一 Promise。避免快速双击/重复提交发出多条相同写请求。
    const bodyStr = options.body ? String(options.body) : '';
    const writeKey = `${method}:${endpoint}:${bodyStr}`;
    const existingWrite = this.writeInFlight.get(writeKey);
    if (existingWrite) return existingWrite;

    const writePending = execute().finally(() => {
      this.writeInFlight.delete(writeKey);
    });
    this.writeInFlight.set(writeKey, writePending);
    return writePending;
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
  async repairEquipment(itemId: string, repairType: 'full' | 'partial' = 'full', targetDurability?: number) {
    return this.post('/equipment/repair', { itemId, repairType, targetDurability });
  }

  // 强化相关API
  async enhanceEquipment(itemId: string, targetLevel: number, serviceProviderId?: string) {
    return this.post('/enhancement/enhance', { itemId, targetLevel, serviceProviderId });
  }
  async getEnhancementInfo(itemId: string) { return this.get(`/enhancement/info/${itemId}`); }
  async getEnhancementProviders(itemType: string) { return this.get(`/enhancement/providers/${itemType}`); }

  // 交易相关API
  async getMarketListings(query?: string, filters?: any) {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (filters) params.append('filters', JSON.stringify(filters));
    return this.get(`/trading/listings?${params}`);
  }
  async listItemForSale(itemId: string, quantity: number, pricePerUnit: number, duration?: number) {
    return this.post('/trading/list', { itemId, quantity, pricePerUnit, duration });
  }
  async purchaseItem(listingId: string, quantity: number) {
    return this.post('/trading/purchase', { listingId, quantity });
  }
  async getPriceHistory(itemId: string, days: number = 7) {
    return this.get(`/trading/price-history/${itemId}?days=${days}`);
  }
  async getPriceTrend(itemId: string) { return this.get(`/trading/price-trend/${itemId}`); }


  // 技能树相关API
  async getSkillTree(professionId: string) { return this.get(`/skills/tree/${professionId}`); }
  async getSkillProgress(professionId: string) { return this.get(`/skills/progress/${professionId}`); }
  async unlockSkillNode(professionId: string, nodeId: string) {
    return this.post('/skills/unlock', { professionId, nodeId });
  }

  // 组队相关API
  async createParty(name?: string) { return this.post('/party/create', { name }); }
  async joinParty(partyId: string) { return this.post('/party/join', { partyId }); }
  async leaveParty(partyId: string) { return this.post('/party/leave', { partyId }); }
  async startPartyActivity(partyId: string, activityType: 'combat' | 'group_craft', stageId?: string) {
    return this.post('/party/start-activity', { partyId, activityType, stageId });
  }
  async completePartyActivity(partyId: string) { return this.post('/party/complete-activity', { partyId }); }

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
  async updateSettings(settings: Partial<{
    soundEnabled: boolean;
    animationsEnabled: boolean;
    compactMode: boolean;
    notificationsEnabled: boolean;
  }>) {
    return this.post('/progression/settings', settings);
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

  // 进阶系统：声望 / 赏金契约 / 转生
  async getReputation() { return this.get('/progression2/reputation'); }
  async getBounties() { return this.get('/progression2/bounties'); }
  async acceptBounty(bountyId: string) { return this.post('/progression2/bounties/accept', { bountyId }); }
  async claimBounty(bountyId: string) { return this.post('/progression2/bounties/claim', { bountyId }); }
  async rerollBounties() { return this.post('/progression2/bounties/reroll', {}); }
  async getPrestige() { return this.get('/progression2/prestige'); }
  async doPrestige() { return this.post('/progression2/prestige', {}); }
}

// baseURL 解析优先级：
//  1) 构建期注入的 VITE_API_URL（生产部署：前后端分域时填后端完整地址，如 https://api.example.com）
//  2) 回退到 '/api'（本地开发：由 Vite dev server 代理到 localhost:3001；或同域反向代理部署）
const API_BASE_URL =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).replace(/\/$/, '')) || '/api';

export const apiClient = new ApiClient(API_BASE_URL);
