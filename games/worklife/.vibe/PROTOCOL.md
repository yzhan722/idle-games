# PROTOCOL — WorkLife 接口/数据契约

> **锁定声明**：本文档定义 v1.0.x 稳定接口契约。任何修改必须走变更门审批（参见 Autonomous Vibe Agent PROTOCOL_CHANGE_PROMPT）。

## 1. 通信协议

| 协议 | 用途 | 端口 |
|------|------|------|
| HTTP REST (JSON) | 所有业务操作 | 3001 |
| WebSocket | 聊天消息推送 | 3001 /ws?token={jwt} |

## 2. 认证契约

### POST /auth/guest

**Request:**
```json
{ "deviceId": "string (可选, 未传则自动生成 UUID)" }
```

**Response 200:**
```json
{ "userId": "UUID", "token": "JWT string" }
```

**JWT Payload:**
```json
{ "sub": "UUID (user.id)" }
```

**不变量：**
- Token 过期时间由服务端 JWT_SECRET 配置决定
- 所有非公开路由必须携带 `Authorization: Bearer <token>`
- 公开路由集合（精确匹配）: `/health`, `/content`, `/auth/guest`, `/ws`

## 3. 玩家状态契约

### GET /player/state → EnhancedPlayerState

**不变量：**
- 返回时自动执行离线进度模拟 (simulateToNow)
- state_json JSONB 的 `version` 字段不暴露给客户端

### POST /actions/start

```json
{ "actionId": "string" }
```

**前置条件：** 技能等级 ≥ 活动 requiredSkillLevel, 材料足够
**后置条件：** 扣减材料, 奖励产出+XP, mode 切换

### POST /combat/start

```json
{ "stageId": "string" }
```

## 4. 经济系统契约

### 4.1 交易行 (Market Listings)

#### POST /trading/list — 上架物品

```json
{ "itemId": "string", "quantity": "int > 0", "pricePerUnit": "int > 0", "duration": "int (hours, 可选)" }
```

**原子性保证：** 事务内扣减库存 + 创建 listing，不可部分成功

#### POST /trading/purchase — 购买物品

```json
{ "listingId": "UUID", "quantity": "int > 0" }
```

**原子性保证：**
- `UPDATE market_listings SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1`
- 买卖双方 FOR UPDATE 按 userId 字典序锁定
- 扣金币 → 加物品 → 卖家加金币 → 记录流水

#### DELETE /trading/orders/:orderId — 取消订单

**原子性保证：** `DELETE FROM trading_orders WHERE id = $1 AND user_id = $2 RETURNING *`
- RETURNING 为空则幂等返回 success
- 退回冻结资产（sell → 退物品, buy → 退金币）

### 4.2 交易订单簿 (Trading Orders)

#### POST /trading/orders — 创建订单

```json
{ "itemId": "string", "quantity": "int > 0", "price": "int > 0", "type": "sell|buy" }
```

**原子性保证：** 事务内冻结资产 + INSERT 订单

#### POST /trading/buy — 执行交易

```json
{ "orderId": "UUID", "quantity": "int > 0" }
```

**原子性保证：**
- FOR UPDATE 锁定 order 行
- 买卖双方按 userId 字典序 FOR UPDATE 锁定 state
- 原子完成资产转移

## 5. 装备系统契约

### POST /enhancement/enhance

```json
{ "itemId": "string", "targetLevel": "int", "serviceProviderId": "UUID (可选)" }
```

**并发保护：** withUserLock 串行化
**不变量：** 材料不足时不允许强化，强化失败不消耗材料（当前实现无失败概率降级）

### POST /equipment/repair

```json
{ "itemId": "string", "repairType": "full|partial", "targetDurability": "int (partial时必填)" }
```

**并发保护：** withUserLock 串行化

## 6. 组队系统契约

### POST /party/create

```json
{ "name": "string (可选)" }
```

**不变量：** 同一玩家不可同时在多个队伍（事务检查）

### POST /party/join

```json
{ "partyId": "UUID" }
```

**不变量：** 队伍人数不超上限（FOR UPDATE 锁定 party 行检查）

### POST /party/start-activity

```json
{ "partyId": "UUID", "activityType": "combat|group_craft", "stageId": "string (可选)" }
```

**不变量：** 仅队长可发起，队伍无进行中活动

### POST /party/complete-activity

```json
{ "partyId": "UUID" }
```

**原子性保证：**
- `UPDATE parties SET current_activity = NULL WHERE id = $1 AND current_activity IS NOT NULL RETURNING *`
- 防止并发 complete 重复发奖
- 成员奖励按 userId 字典序写入

## 7. 技能树契约

### POST /skills/unlock

```json
{ "professionId": "string", "nodeId": "string" }
```

**幂等性：** 如已解锁则直接返回 `{ success: true }`
**并发保护：** withUserLock 串行化

## 8. WebSocket 消息契约

### 客户端 → 服务端

```json
{ "type": "chat:send", "channel": "world|profession|party|private", "content": "string", "to": "UUID (private时)" }
```

### 服务端 → 客户端

```json
{ "type": "chat:message", "channel": "string", "sender": "UUID", "senderProfession": "string", "ts": "ISO8601", "content": "string" }
```

## 9. 错误响应契约

| HTTP Status | error code | 含义 |
|-------------|-----------|------|
| 400 | invalid_request | 请求参数不合法（Zod校验失败） |
| 401 | Unauthorized | JWT 无效/过期 |
| 404 | state_not_found | 玩家状态不存在 |
| 409 | state_version_conflict | 并发写冲突（客户端应重试） |
| 429 | rate_limited | 请求过于频繁 |
| 500 | internal_error | 服务器内部错误（不泄露细节） |

**响应格式：**
```json
{ "error": "error_code", "message": "用户友好中文提示" }
```

## 10. 数据库表契约（核心表）

| 表名 | 主键 | 备注 |
|------|------|------|
| users | id UUID | guest_device_id UNIQUE, google_sub UNIQUE |
| player_states | user_id UUID FK | state_json JSONB, version BIGINT (CAS) |
| market_listings | id UUID | quantity CHECK > 0, price_per_unit CHECK > 0 |
| trading_orders | id UUID | type CHECK IN ('sell','buy') |
| trade_history | id UUID | 只增不改 |
| price_history | id BIGSERIAL | UNIQUE(item_id, record_date) |
| parties | id UUID | members JSONB, current_activity JSONB |
| enhancement_requests | id UUID | status TEXT |

## 11. 并发安全契约总结

| 操作 | 保护机制 |
|------|----------|
| startLifeAction | withUserLock |
| startCombatFarm | withUserLock |
| enhanceEquipment | withUserLock |
| repairEquipment | withUserLock |
| reduceDurability | withUserLock |
| unlockSkillNode | withUserLock + 幂等检查 |
| awardSkillExperience | withUserLock |
| purchaseItem | withTransaction + FOR UPDATE (sorted) |
| executeTrade | withTransaction + FOR UPDATE (sorted) |
| cancelTradingOrder | DELETE ... RETURNING 原子 |
| listItemForSale | withTransaction |
| createTradingOrder | withTransaction |
| createParty | withTransaction + txLoadStateForUpdate |
| joinParty | withTransaction + FOR UPDATE party |
| leaveParty | withTransaction + FOR UPDATE party + sorted member states |
| startPartyActivity | withTransaction + FOR UPDATE party + sorted member logs |
| completePartyActivity | withTransaction + atomic UPDATE RETURNING + sorted member rewards |
