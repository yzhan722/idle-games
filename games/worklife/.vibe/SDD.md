# SDD — WorkLife 系统设计文档

## 1. 架构概览

```
┌─────────────────────────────────────────────────────┐
│                  Client Layer                        │
│   React 18 + TS + Vite 5  (localhost:3000)          │
│   ApiClient (GET dedup + write dedup + retry)       │
│   AuthContext / GameContext / Components             │
└──────────────────────────┬──────────────────────────┘
                           │ HTTP REST + WS (chat only)
                           ▼
┌─────────────────────────────────────────────────────┐
│                  Server Layer                        │
│   Fastify 5 + TS  (localhost:3001)                  │
│   ├─ preHandler: JWT auth (exact path whitelist)    │
│   ├─ rateLimit: per-IP                              │
│   ├─ Routes: auth/player/skills/enhancement/        │
│   │          trading/party/equipment/progression/   │
│   │          progression2/systems                   │
│   └─ Storage Layer (createPgStorage)                │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│                  Data Layer                          │
│   PostgreSQL 14+                                    │
│   ├─ users (UUID PK, guest_device_id, google_sub)   │
│   ├─ player_states (user_id PK, state_json JSONB,  │
│   │                  version BIGINT — CAS 乐观锁)   │
│   ├─ market_listings                                │
│   ├─ trade_history                                  │
│   ├─ price_history                                  │
│   ├─ parties (members JSONB, current_activity JSONB)│
│   ├─ trading_orders                                 │
│   └─ enhancement_requests                           │
└─────────────────────────────────────────────────────┘
```

## 2. 并发控制三层模型

### Layer 1: 前端防重（Client-side Dedup）

ApiClient 类在请求发出前去重：
- GET: `inFlight` Map，相同 cacheKey 的并发 GET 复用同一 Promise
- POST/PUT/DELETE: `writeInFlight` Map，相同 `method:endpoint:body` 复用 Promise
- 效果：快速双击/React StrictMode 双触发不会发出重复请求

### Layer 2: 进程内串行（Per-user Promise Chain Mutex）

`withUserLock(userId, fn)` — 将同一用户的并发请求序列化：
- 用 Map<string, Promise> 存储每用户的"锁链尾"
- 新请求链入尾部，保证前一个完成才执行下一个
- 自动清理：链尾完成且无新请求时从 Map 移除
- 适用场景：单用户操作（startLifeAction/enhanceEquipment/repairEquipment 等）

### Layer 3: 数据库事务行锁（SELECT FOR UPDATE）

`withTransaction(fn)` + `txLoadStateForUpdate(client, userId)` + `txPersistState(...)`:
- 从连接池获取独立 client，BEGIN 显式事务
- FOR UPDATE 锁定目标行，确保并发写串行化
- 适用场景：多用户操作（交易买卖/组队奖励分配）
- 死锁预防：涉及多用户时按 userId 字典序排列锁获取顺序

### 跨层关系

```
  前端双击 → writeInFlight 拦截（不发请求）
  并发 API → withUserLock 排队（同用户同实例）
  多用户事务 → SELECT FOR UPDATE（跨实例原子）
  单用户写回 → CAS version 比对（跨实例兜底）
```

## 3. 数据模型（实际实现）

### player_states 表

```sql
CREATE TABLE player_states (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    content_version TEXT NOT NULL,
    state_json JSONB NOT NULL,   -- EnhancedPlayerState 完整序列化
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

state_json 内嵌结构（EnhancedPlayerState）：
- `activeClassId`, `mode`, `combatLevel`, `combatXp`
- `skills: Record<skillId, {level, xp, unlockedRecipes, enhancementLevel}>`
- `inventory: Record<itemId, quantity>`
- `equipment: Record<slot, {itemId, enhancementLevel, durability, maxDurability}>`
- `gold`, `log[]`, `activityQueue[]`, `lifeSeed`, `combatSeed`
- `settings`, `stats`, `achievements`, `dailyQuests`, `reputation`, `bounties`, `prestige`

### 交易相关表

```sql
market_listings (id, seller_id, item_id, quantity, price_per_unit, status, listed_at, expires_at)
trading_orders (id, user_id, item_id, quantity, price, type, created_at)
trade_history (id, buyer_id, seller_id, item_id, quantity, total_price, completed_at)
price_history (id, item_id, record_date, average_price, min_price, max_price, volume)
```

### 组队表

```sql
parties (id, leader_id, name, members JSONB, current_activity JSONB, created_at)
```

## 4. 认证设计

```
JWT Flow:
  POST /auth/guest {deviceId} → 查找/创建 user → 签发 JWT {sub: user.id}
  Client 保存 token → 每次请求 Authorization: Bearer <token>
  preHandler 拦截 → 精确匹配 publicPaths Set → 非公开路由 verify JWT
```

安全措施：
- JWT_SECRET ≥ 32 字符（Zod 校验启动时强制检查）
- 公开路径精确匹配（Set.has 剥离 query + trailing slash），不使用 startsWith
- 401 自动登出不触发循环（排除 /auth/ 前缀）

## 5. 错误处理链

```
Route handler throws
  → Fastify setErrorHandler
    → ZodError → 400 {error, message, details}
    → "state_not_found" → 404
    → "state_version_conflict" → 409 (客户端自动重试)
    → "Unauthorized" → 401
    → 其余 → 500 {error: "internal_error"} (不泄露堆栈)
```

前端处理：
- 401 → onUnauthorized() 触发登出
- 409 → 清缓存 + 150ms退避自动重试（最多3次）
- 408/429/5xx → 指数退避重试
- TypeError("Failed to fetch") → 网络断开重试

## 6. 关键模块文件索引

| 模块 | 文件路径 |
|------|---------|
| 后端入口/中间件 | backend/src/index.ts |
| 存储层（核心逻辑） | backend/src/storage_pg.ts |
| 强化工具函数 | backend/src/enhancement_utils.ts |
| 类型定义 | backend/src/types.ts |
| 路由-认证 | backend/src/routes/auth.ts |
| 路由-玩家 | backend/src/routes/player.ts |
| 路由-交易 | backend/src/routes/trading.ts |
| 路由-组队 | backend/src/routes/party.ts |
| 路由-强化 | backend/src/routes/enhancement.ts |
| 路由-装备 | backend/src/routes/equipment.ts |
| 路由-技能 | backend/src/routes/skills.ts |
| 路由-进阶 | backend/src/routes/progression.ts |
| 路由-进阶2 | backend/src/routes/progression2.ts |
| 路由-系统 | backend/src/routes/systems.ts |
| 前端API客户端 | frontend/src/services/api.ts |
| 前端游戏Context | frontend/src/contexts/GameContext.tsx |
| 前端认证Context | frontend/src/contexts/AuthContext.tsx |
| 游戏内容包 | shared/enhanced_content_pack_chinese.json |
