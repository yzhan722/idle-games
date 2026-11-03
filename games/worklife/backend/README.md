# WorkLife Backend

游戏后端服务，基于Fastify框架。

## 架构设计

### 存储层 (Storage Layer)
- **storage.ts**: 存储接口定义
- **storage_memory.ts**: 内存存储实现（开发环境）
- **storage_pg.ts**: PostgreSQL存储实现（生产环境）

### 类型系统 (types.ts)
完整的TypeScript类型定义，包括：
- 玩家状态 (PlayerState, EnhancedPlayerState)
- 内容包 (ContentPack, EnhancedContentPack)
- 交易系统 (MarketListing, TradeHistory)
- 组队系统 (Party, PartyMember)
- 装备强化 (EnhancementRequest, EnhancementResult)

## API端点

### 认证
```
POST /auth/login
Body: { deviceId?: string }
Response: { id: string, token: string }
```

### 玩家状态
```
GET /player/state
Headers: { Authorization: Bearer <token> }
Response: EnhancedPlayerState
```

### 生活技能
```
POST /player/life-action
Headers: { Authorization: Bearer <token> }
Body: { actionId: string }
Response: EnhancedPlayerState
```

## 待实现功能

### 1. 交易系统
- [ ] 创建交易订单
- [ ] 搜索交易订单
- [ ] 购买物品
- [ ] 取消订单
- [ ] 价格历史记录

### 2. 装备强化
- [ ] 强化装备
- [ ] 跨职业强化服务
- [ ] 强化成功率计算
- [ ] 强化材料消耗

### 3. 组队系统
- [ ] 创建队伍
- [ ] 邀请成员
- [ ] 队伍活动
- [ ] 队伍奖励分配

### 4. 技能树系统
- [ ] 解锁技能节点
- [ ] 技能前置条件检查
- [ ] 技能效果应用

### 5. 聊天系统
- [ ] WebSocket连接
- [ ] 频道消息
- [ ] 私聊消息
- [ ] 系统通知

## 数据库设计

### 核心表

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  guest_device_id VARCHAR(255) UNIQUE,
  google_sub VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### player_states
```sql
CREATE TABLE player_states (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  content_version VARCHAR(50),
  last_simulated_at TIMESTAMP,
  active_class_id VARCHAR(50),
  mode VARCHAR(20),
  combat_level INTEGER DEFAULT 1,
  combat_xp INTEGER DEFAULT 0,
  inventory JSONB,
  equipment JSONB,
  skills JSONB,
  logs JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### market_listings
```sql
CREATE TABLE market_listings (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES users(id),
  item_id VARCHAR(100),
  quantity INTEGER,
  price_per_unit INTEGER,
  listed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  status VARCHAR(20),
  INDEX idx_item_status (item_id, status),
  INDEX idx_seller (seller_id)
);
```

#### trade_history
```sql
CREATE TABLE trade_history (
  id UUID PRIMARY KEY,
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  item_id VARCHAR(100),
  quantity INTEGER,
  total_price INTEGER,
  completed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_item (item_id)
);
```

#### parties
```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY,
  leader_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_leader (leader_id)
);
```

#### party_members
```sql
CREATE TABLE party_members (
  party_id UUID REFERENCES parties(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50),
  joined_at TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  PRIMARY KEY (party_id, user_id)
);
```

## 开发指南

### 添加新的API端点

1. 在 `index.ts` 中定义路由
2. 在 `storage.ts` 中添加接口方法
3. 在 `storage_memory.ts` 和 `storage_pg.ts` 中实现
4. 在 `types.ts` 中添加类型定义

### 示例：添加交易系统

```typescript
// 1. types.ts
export type CreateListingRequest = {
  itemId: string;
  quantity: number;
  pricePerUnit: number;
};

// 2. storage.ts
export interface Storage {
  // ... existing methods
  createListing(userId: string, req: CreateListingRequest): Promise<MarketListing>;
  getListings(itemId?: string): Promise<MarketListing[]>;
  purchaseListing(buyerId: string, listingId: string, quantity: number): Promise<void>;
}

// 3. index.ts
fastify.post<{ Body: CreateListingRequest }>('/trading/list', async (request, reply) => {
  const userId = request.user.id;
  const listing = await storage.createListing(userId, request.body);
  return listing;
});
```

## 性能优化

### 缓存策略
- 玩家状态缓存（Redis）
- 交易订单缓存
- 价格历史缓存

### 数据库优化
- 合适的索引
- 分页查询
- 连接池配置

### 并发控制
- 乐观锁（版本号）
- 悲观锁（行锁）
- 分布式锁（Redis）

## 测试

### 单元测试
```bash
npm test
```

### 集成测试
```bash
npm run test:integration
```

### 性能测试
```bash
npm run test:performance
```

## 部署

### 环境变量
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/worklife
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-key
```

### Docker部署
```bash
docker build -t worklife-backend .
docker run -p 3001:3001 worklife-backend
```

## 监控

### 日志
- Pino日志框架
- 结构化日志
- 日志级别控制

### 指标
- 请求延迟
- 错误率
- 数据库查询性能
- 内存使用

### 告警
- 错误率超过阈值
- 响应时间过长
- 数据库连接池耗尽
