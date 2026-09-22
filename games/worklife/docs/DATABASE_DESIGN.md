# WorkLife 数据库设计文档

## 概述

WorkLife 使用 PostgreSQL 14+ 作为主数据库，采用关系型数据库设计，支持完整的游戏功能。

## 数据库架构

### 核心设计原则

1. **数据规范化**: 遵循第三范式，减少数据冗余
2. **性能优化**: 合理使用索引，支持高并发查询
3. **可扩展性**: 预留扩展字段，使用 JSONB 存储灵活数据
4. **数据完整性**: 使用外键约束和检查约束保证数据一致性
5. **审计追踪**: 所有表包含创建和更新时间戳

## 表结构设计

### 1. 用户系统 (User System)

#### users - 用户表
存储用户账户信息，支持游客和Google登录。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    guest_device_id VARCHAR(255) UNIQUE,
    google_sub VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_banned BOOLEAN,
    ban_reason TEXT
);
```

**字段说明**:
- `id`: 用户唯一标识符
- `guest_device_id`: 服务端生成的游客行标识。客户端传来的 deviceId 不能用它认领存档。
- `guest_resume_token_hash`: 游客恢复凭证的 SHA-256 十六进制摘要，可空、唯一。明文不入库。已有行保持 NULL。重复执行 `ADD COLUMN IF NOT EXISTS` 不改玩家资产。
- `google_sub`: Google账户标识（Google登录）
- `is_banned`: 封禁状态
- `ban_reason`: 封禁原因

**索引**:
- `idx_users_guest_device`: 游客设备ID索引
- `idx_users_google_sub`: Google账户索引

### 2. 玩家状态系统 (Player State System)

#### player_states - 玩家主状态表
存储玩家的核心游戏状态。

```sql
CREATE TABLE player_states (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    content_version VARCHAR(50),
    active_class_id VARCHAR(50),
    mode VARCHAR(20),
    combat_level INTEGER,
    combat_xp INTEGER,
    last_simulated_at TIMESTAMP WITH TIME ZONE
);
```

**字段说明**:
- `active_class_id`: 当前激活的职业
- `mode`: 当前模式 (idle/life_action/combat_farm)
- `combat_level`: 战斗等级 (1-200)
- `combat_xp`: 战斗经验值
- `last_simulated_at`: 最后模拟时间（用于离线进度计算）

#### player_skills - 玩家技能表
存储玩家的职业技能等级和经验。

```sql
CREATE TABLE player_skills (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    skill_id VARCHAR(50),
    level INTEGER,
    xp INTEGER,
    enhancement_level INTEGER,
    UNIQUE(user_id, skill_id)
);
```

**字段说明**:
- `skill_id`: 技能ID (如 skill_woodcutter)
- `level`: 技能等级 (1-200)
- `xp`: 当前经验值
- `enhancement_level`: 强化等级

#### player_unlocked_recipes - 已解锁配方表
存储玩家已解锁的配方和技能节点。

```sql
CREATE TABLE player_unlocked_recipes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    skill_id VARCHAR(50),
    recipe_id VARCHAR(100),
    unlocked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, skill_id, recipe_id)
);
```

### 3. 背包和装备系统 (Inventory & Equipment System)

#### player_inventory - 玩家背包表
存储玩家拥有的所有物品。

```sql
CREATE TABLE player_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    item_id VARCHAR(100),
    quantity INTEGER,
    UNIQUE(user_id, item_id)
);
```

**设计说明**:
- 使用稀疏存储，只存储数量大于0的物品
- 通过 UNIQUE 约束保证每个玩家每种物品只有一条记录

#### player_equipment - 玩家装备表
存储玩家当前装备的物品。

```sql
CREATE TABLE player_equipment (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    slot VARCHAR(20), -- main_hand, off_hand, head, chest, legs, feet, accessory1, accessory2
    item_id VARCHAR(100),
    enhancement_level INTEGER,
    durability INTEGER,
    max_durability INTEGER,
    UNIQUE(user_id, slot)
);
```

**装备槽位**:
- `main_hand`: 主手武器
- `off_hand`: 副手武器/盾牌
- `head`: 头部装备
- `chest`: 胸部装备
- `legs`: 腿部装备
- `feet`: 脚部装备
- `accessory1`: 饰品1
- `accessory2`: 饰品2

**耐久度系统**:
- `durability`: 当前耐久度
- `max_durability`: 最大耐久度
- 耐久度为0时装备失效

### 4. 活动状态系统 (Activity State System)

#### player_life_actions - 职业活动状态表
存储玩家当前进行的职业活动。

```sql
CREATE TABLE player_life_actions (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    action_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE
);
```

#### player_combat_states - 战斗状态表
存储玩家当前的战斗状态。

```sql
CREATE TABLE player_combat_states (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    stage_id VARCHAR(100),
    seed VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE
);
```

#### player_activity_queue - 活动队列表
存储玩家的离线活动队列。

```sql
CREATE TABLE player_activity_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action_id VARCHAR(100),
    priority INTEGER,
    estimated_duration INTEGER
);
```

### 5. 交易系统 (Trading System)

#### market_listings - 市场挂单表
存储所有交易市场的挂单。

```sql
CREATE TABLE market_listings (
    id UUID PRIMARY KEY,
    seller_id UUID REFERENCES users(id),
    item_id VARCHAR(100),
    quantity INTEGER,
    price_per_unit INTEGER,
    status VARCHAR(20), -- active, sold, expired, cancelled
    listed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);
```

**状态说明**:
- `active`: 活跃挂单
- `sold`: 已售出
- `expired`: 已过期
- `cancelled`: 已取消

#### trade_history - 交易历史表
记录所有完成的交易。

```sql
CREATE TABLE trade_history (
    id UUID PRIMARY KEY,
    buyer_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES users(id),
    listing_id UUID REFERENCES market_listings(id),
    item_id VARCHAR(100),
    quantity INTEGER,
    price_per_unit INTEGER,
    total_price INTEGER,
    fee INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### price_history - 价格历史表
每日统计物品价格数据。

```sql
CREATE TABLE price_history (
    id BIGSERIAL PRIMARY KEY,
    item_id VARCHAR(100),
    record_date DATE,
    average_price NUMERIC(10, 2),
    min_price INTEGER,
    max_price INTEGER,
    volume INTEGER,
    trade_count INTEGER,
    UNIQUE(item_id, record_date)
);
```

**统计指标**:
- `average_price`: 平均价格
- `min_price`: 最低价格
- `max_price`: 最高价格
- `volume`: 交易量
- `trade_count`: 交易次数

### 6. 组队系统 (Party System)

#### parties - 队伍表
存储所有队伍信息。

```sql
CREATE TABLE parties (
    id UUID PRIMARY KEY,
    leader_id UUID REFERENCES users(id),
    name VARCHAR(100),
    max_members INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    disbanded_at TIMESTAMP WITH TIME ZONE
);
```

#### party_members - 队伍成员表
存储队伍成员关系。

```sql
CREATE TABLE party_members (
    id BIGSERIAL PRIMARY KEY,
    party_id UUID REFERENCES parties(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20), -- leader, member
    is_online BOOLEAN,
    is_ready BOOLEAN,
    joined_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(party_id, user_id)
);
```

#### party_activities - 队伍活动表
记录队伍的活动历史。

```sql
CREATE TABLE party_activities (
    id UUID PRIMARY KEY,
    party_id UUID REFERENCES parties(id),
    activity_type VARCHAR(20), -- combat, group_craft
    stage_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    rewards JSONB
);
```

### 7. 强化系统 (Enhancement System)

#### enhancement_service_requests - 强化服务请求表
存储跨职业强化服务请求。

```sql
CREATE TABLE enhancement_service_requests (
    id UUID PRIMARY KEY,
    requester_id UUID REFERENCES users(id),
    provider_id UUID REFERENCES users(id),
    item_id VARCHAR(100),
    target_level INTEGER,
    service_fee INTEGER,
    message TEXT,
    status VARCHAR(20), -- pending, accepted, rejected, completed, cancelled
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

#### enhancement_service_stats - 强化服务统计表
统计服务提供者的数据。

```sql
CREATE TABLE enhancement_service_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    completed_services INTEGER,
    total_rating NUMERIC(10, 2),
    rating_count INTEGER,
    average_rating NUMERIC(3, 2) GENERATED ALWAYS AS (
        CASE WHEN rating_count > 0 THEN total_rating / rating_count ELSE 0 END
    ) STORED
);
```

### 8. 游戏日志系统 (Logging System)

#### player_logs - 玩家日志表
记录玩家的所有游戏行为。

```sql
CREATE TABLE player_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    log_text TEXT,
    log_type VARCHAR(20), -- info, success, warning, error, combat, trade, level_up
    created_at TIMESTAMP WITH TIME ZONE
);
```

**日志类型**:
- `info`: 一般信息
- `success`: 成功操作
- `warning`: 警告
- `error`: 错误
- `combat`: 战斗日志
- `trade`: 交易日志
- `level_up`: 升级日志

**分区策略**:
按月分区，提高查询性能和数据管理效率。

### 9. 聊天系统 (Chat System)

#### chat_messages - 聊天消息表
存储所有聊天消息。

```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(20), -- world, profession, party, private
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    party_id UUID REFERENCES parties(id),
    profession_id VARCHAR(50),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

**频道类型**:
- `world`: 世界频道
- `profession`: 职业频道
- `party`: 队伍频道
- `private`: 私聊

### 10. 游戏内容表 (Game Content Tables)

#### game_classes - 职业定义表
```sql
CREATE TABLE game_classes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    role VARCHAR(20), -- gatherer, crafter, fighter
    description TEXT
);
```

#### game_skills - 技能定义表
```sql
CREATE TABLE game_skills (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES game_classes(id),
    name VARCHAR(100),
    max_level INTEGER
);
```

#### game_items - 物品定义表
```sql
CREATE TABLE game_items (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(20), -- currency, material, weapon, armor, consumable
    tier INTEGER,
    atk INTEGER,
    def INTEGER,
    mag INTEGER,
    base_durability INTEGER,
    is_tradeable BOOLEAN,
    metadata JSONB
);
```

#### game_actions - 动作定义表
```sql
CREATE TABLE game_actions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100),
    skill_id VARCHAR(50) REFERENCES game_skills(id),
    action_type VARCHAR(20),
    duration INTEGER,
    xp_reward INTEGER,
    required_skill_level INTEGER
);
```

#### game_action_consumes - 动作消耗表
```sql
CREATE TABLE game_action_consumes (
    action_id VARCHAR(100) REFERENCES game_actions(id),
    item_id VARCHAR(100) REFERENCES game_items(id),
    quantity INTEGER
);
```

#### game_action_yields - 动作产出表
```sql
CREATE TABLE game_action_yields (
    action_id VARCHAR(100) REFERENCES game_actions(id),
    item_id VARCHAR(100) REFERENCES game_items(id),
    quantity INTEGER,
    chance NUMERIC(5, 4)
);
```

## 索引策略

### 主键索引
所有表都有主键索引，使用 UUID 或 BIGSERIAL。

### 外键索引
所有外键字段都创建索引，提高关联查询性能。

### 查询优化索引
- 用户查询: `guest_device_id`, `google_sub`
- 背包查询: `(user_id, item_id)`
- 装备查询: `(user_id, slot)`
- 市场查询: `status`, `item_id`, `price_per_unit`, `listed_at`
- 交易历史: `buyer_id`, `seller_id`, `completed_at`
- 价格历史: `(item_id, record_date)`
- 日志查询: `(user_id, created_at)`

### 复合索引
```sql
CREATE INDEX idx_market_active_items ON market_listings(status, item_id) 
    WHERE status = 'active';
    
CREATE INDEX idx_player_inventory_user_item ON player_inventory(user_id, item_id);
```

## 触发器和函数

### 自动更新时间戳
```sql
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 自动清理过期挂单
```sql
CREATE FUNCTION cleanup_expired_listings()
RETURNS void AS $$
BEGIN
    UPDATE market_listings
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
```

### 每日价格统计
```sql
CREATE FUNCTION aggregate_daily_prices()
RETURNS void AS $$
BEGIN
    INSERT INTO price_history (...)
    SELECT item_id, DATE(completed_at), AVG(price_per_unit), ...
    FROM trade_history
    WHERE DATE(completed_at) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY item_id;
END;
$$ LANGUAGE plpgsql;
```

## 视图

### v_player_full_state - 玩家完整状态视图
聚合玩家的所有核心数据。

### v_active_market_listings - 活跃市场挂单视图
只显示未过期的活跃挂单。

### v_top_enhancement_providers - 强化服务提供者排行视图
按评分和完成数排序的服务提供者列表。

## 数据迁移策略

### 从内存存储迁移到PostgreSQL

1. **导出现有数据**: 从内存存储导出JSON格式数据
2. **数据转换**: 将JSON数据转换为SQL INSERT语句
3. **批量导入**: 使用 COPY 命令批量导入数据
4. **验证数据**: 检查数据完整性和一致性
5. **切换存储**: 更新配置使用PostgreSQL存储

### 版本控制

使用数据库迁移工具（如 node-pg-migrate）管理schema变更：

```bash
npm install node-pg-migrate
```

迁移文件示例：
```javascript
exports.up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    // ...
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
```

## 性能优化建议

### 1. 连接池配置
```javascript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. 查询优化
- 使用 EXPLAIN ANALYZE 分析慢查询
- 避免 SELECT *，只查询需要的字段
- 使用批量操作减少数据库往返

### 3. 缓存策略
- 使用 Redis 缓存热点数据
- 缓存玩家状态、市场列表等高频查询数据
- 设置合理的缓存过期时间

### 4. 分区表
- 日志表按月分区
- 交易历史按年分区
- 提高查询和维护效率

### 5. 定期维护
```sql
-- 更新统计信息
ANALYZE;

-- 清理死元组
VACUUM;

-- 重建索引
REINDEX TABLE player_inventory;
```

## 备份和恢复

### 每日备份
```bash
pg_dump -h localhost -U worklife_app -d worklife > backup_$(date +%Y%m%d).sql
```

### 增量备份
使用 WAL 归档实现增量备份和时间点恢复。

### 恢复策略
```bash
psql -h localhost -U worklife_app -d worklife < backup_20250111.sql
```

## 安全性

### 1. 访问控制
- 使用专用数据库用户
- 最小权限原则
- 禁止root用户直接访问

### 2. SQL注入防护
- 使用参数化查询
- 验证所有用户输入
- 使用ORM或查询构建器

### 3. 数据加密
- 传输加密（SSL/TLS）
- 敏感数据加密存储
- 定期更新密钥

## 监控指标

### 关键指标
- 连接数
- 查询响应时间
- 慢查询数量
- 缓存命中率
- 磁盘使用率
- 锁等待时间

### 监控工具
- pg_stat_statements
- pgAdmin
- Grafana + Prometheus
- CloudWatch (AWS)

## 总结

这个数据库设计支持：
- ✅ 多职业系统
- ✅ 完整的背包和装备系统
- ✅ 交易市场和价格历史
- ✅ 组队和社交功能
- ✅ 装备强化和耐久度
- ✅ 完整的日志和审计
- ✅ 高性能和可扩展性

数据库schema已准备就绪，可以开始实现PostgreSQL存储层。
