# WorkLife API 参考文档

## 基础信息

- **Base URL**: `http://localhost:3001`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 房屋升级

`POST /houses/upgrade` 接受 `{ roomId: string, expectedRevision?: number }`。旧客户端只传 `roomId` 仍可使用；显式版本必须是非负整数。

服务端先在隔离快照结算离线进度，再按当前房屋等级检查成本并升级，一次提交完整结果。业务拒绝、模拟异常和版本冲突不会保存部分结算或部分扣费。多个不同升级请求按实际等级计算连续成本。

成功返回原有 `ok`、`level`、`cost`、`house` 字段，并增加 `stateRevision`。显式版本过期或竞争达到内部重算上限时返回 `409 { error: "state_version_conflict", message, stateRevision }`，客户端刷新状态后重新确认。内部仅在未提交的版本冲突后重读并重算，最多重试两次。

本接口尚无持久 operationId 收据。响应丢失时仍须读取状态确认结果，不能自动重发升级请求。

## 系统资源写接口（商店 / 消耗品 / 签到）

`POST /systems/shop/buy` 接受 `{ itemId: string, qty: number, expectedRevision?: number }`；`POST /systems/shop/sell` 接受 `{ itemId: string, qty: number, expectedRevision?: number }`；`POST /systems/consume` 接受 `{ itemId: string, expectedRevision?: number }`；`POST /systems/checkin` 接受 `{ expectedRevision?: number }`。旧客户端不传 `expectedRevision` 仍可使用；显式版本必须是非负整数。

服务端先在隔离快照结算离线进度，再执行业务操作并一次提交完整结果。业务拒绝、模拟异常和版本冲突不会保存部分结算或部分扣费；并发购买按提交顺序分别扣费。

成功响应在原字段基础上增加 `stateRevision`。显式版本过期或竞争达到内部重算上限时返回 `409 { error: "state_version_conflict", message, stateRevision }`，客户端刷新状态后重试。业务拒绝返回 `400 { error }`，`error` 为原有中文原因文案。

## 任务 / 成就 / 赏金 / 转生写接口

以下接口走同一资源命令边界，语义与上面一致：隔离快照结算 → 业务校验 → 一次提交；全部接受可选 `expectedRevision`，成功响应增加 `stateRevision`，冲突返回 `409 state_version_conflict`。

- `POST /tasks/claim` `{ taskId, expectedRevision? }`；`POST /tasks/reroll` `{ taskId, expectedRevision? }`；`POST /tasks/delete` `{ taskId, expectedRevision? }`；`POST /tasks/block` `{ skillId, blocked, expectedRevision? }`；`POST /tasks/shop/buy` `{ itemId, expectedRevision? }`；`POST /tasks/gift/claim` `{ expectedRevision? }` —— 并发领奖/礼物/宝箱购买不会重复发放；重选与刷新按序收取当日递增费用。
- `POST /progression/achievements/claim` `{ achievementId, expectedRevision? }`；`POST /progression/daily/claim` `{ questId, expectedRevision? }` —— 同一奖励只发一次。
- `POST /progression2/bounties/accept|claim|reroll` 与 `POST /progression2/prestige` 接受 `{ expectedRevision? }`（accept/claim 另带 `bountyId`）—— 并发接取只标一次，刷新受每日上限约束，转生只结算一次。

业务拒绝返回原有 `400 { error }`（任务接口另带 `message`/`cost`）。GET 查询接口未改动，仍受既有结算与保存的版本保护。

## 战斗 / 强化写接口

同一资源命令边界，接受可选 `expectedRevision`，冲突返回 `409 state_version_conflict`：

- `POST /combat/hp/start` `{ monsterId, expectedRevision? }` —— 已在战斗中的拒绝保持原有 `409 { error: "already_in_combat" }`，未知怪物 `400 unknown_monster`。
- `POST /combat/hp/skill` `{ skillId, expectedRevision? }`；`POST /combat/hp/abilities` `{ slots, expectedRevision? }`；`POST /combat/hp/learn` `{ itemId, expectedRevision? }`（响应增加 `learnResult`）；`POST /combat/hp/build` `{ id, expectedRevision? }`；`POST /combat/hp/loadout` `{ food?, drink?, autoRepeat?, expectedRevision? }`；`POST /combat/hp/flee` `{ expectedRevision? }` —— 返回提交后的完整玩家状态（含 `stateRevision` 字段）。
- `POST /enhancement/run/start` `{ itemId, targetLevel, useProtection?, expectedRevision? }`；`POST /enhancement/run/stop` `{ expectedRevision? }` —— 同上；业务拒绝保持 `400 { error, message }`。
- `POST /enhancement/enhance`、`/enhancement/request-service`、`/enhancement/respond-service` 走独立存储方法（后者为跨玩家服务单），不属于此边界；`trading`、`party`、`skills/unlock` 同。

## 幂等键（operationId）

所有命令边界写接口额外接受可选 `operationId`（字符串，≤128 字符，客户端按「一次逻辑操作」生成，如 uuid）：

- 同一 `(用户, operationId)` 已提交后再次到达：不再执行业务变更，直接返回首次提交时记录的结果（HTTP 重试 / 双击 / 断线重发安全）。
- 同一 `operationId` 携带不同的业务参数：返回 `409 { error: "operation_id_mismatch" }`，状态不变。
- 业务拒绝不写收据——同一个 key 在参数修正后（或状态变化后）可以安全重试。
- 参数哈希只覆盖解析后的业务字段；`expectedRevision`、`operationId` 本身与 zod 剥离的多余字段不参与哈希。

PostgreSQL 下收据存于 `player_command_receipts` 并与玩家状态写在同一事务提交（跨实例恰好一次）；内存实现随持久化快照落盘。

## 行动线写接口

同一资源命令边界，全部接受可选 `expectedRevision`，返回提交后的玩家状态（含 `stateRevision`）：

- `POST /actions/start` `{ actionId, quantity?, expectedRevision? }` —— **现在会先把正在进行的动作结算到当前时刻**，再切换动作；旧行为是直接覆盖导致已完成周期的产出被吞。`skill_level_required` / `unknown_action` 保持 `400`。
- `POST /actions/stop` `{ expectedRevision? }` —— 结算后停止并原子接上下一个排队动作。
- `POST /actions/queue` `{ actionId, quantity?, expectedRevision? }`；`DELETE /actions/queue/:id`；`POST /actions/queue/clear|move` `{ expectedRevision? }` —— 队列写同样先结算再修改（保证顺序与上限判定基于最新状态）。
- `POST /combat/start` `{ stageId, expectedRevision? }` —— 同 `actions/start` 的先结算语义。
- `POST /player/class` `{ classId, expectedRevision? }`；`POST /player/offline-report/ack` `{ expectedRevision? }`（响应 `{ ok: true, stateRevision }`）。

## 认证 API

### 游客登录
```http
POST /auth/guest
Content-Type: application/json

{
  "deviceId": "optional-hint-not-a-credential",
  "resumeToken": "optional-resume-token"
}
```

没有 `resumeToken` 时总是创建新游客，相同 `deviceId` 不能取回已有存档。`resumeToken` 无效时返回 `401 invalid_guest_resume_token`，不会新建账号。有效凭证返回原用户。响应里的 `resumeToken` 只在本次响应出现，数据库只存它的 SHA-256。

**响应**:
```json
{
  "userId": "uuid",
  "token": "jwt-token",
  "resumeToken": "base64url-at-least-32-bytes"
}
```

### 为已有游客领取恢复凭证
```http
POST /auth/guest/resume-token
Authorization: Bearer {token}
```

需要当前游客的有效 JWT。没有 JWT 返回 401。已绑定外部身份的账号返回 403 `guest_resume_unavailable`。成功时轮换恢复凭证，不改变金币或物品。此路径不是公开路由。

### 绑定Google账号
```http
POST /auth/bind/google
Authorization: Bearer {token}
Content-Type: application/json

{
  "googleSub": "google-user-id"
}
```

## 玩家状态 API

### 获取玩家状态
```http
GET /player/state
Authorization: Bearer {token}
```

**响应**:
```json
{
  "contentVersion": "1.0.0",
  "lastSimulatedAt": "2024-01-01T00:00:00.000Z",
  "activeClassId": "woodcutter",
  "mode": "idle",
  "inventory": {
    "gold": 1000,
    "wood_1": 50
  },
  "equipment": {
    "enhancementLevels": {}
  },
  "skills": {
    "skill_woodcutter": {
      "level": 10,
      "xp": 500,
      "unlockedRecipes": ["woodcutter_basic_cutting"],
      "enhancementLevel": 0
    }
  },
  "combatLevel": 5,
  "combatXp": 250,
  "logs": []
}
```

### 开始生活技能动作
```http
POST /actions/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "actionId": "act_chop_wood_t1"
}
```

### 开始战斗
```http
POST /combat/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "stageId": "forest"
}
```

## 技能系统 API

### 获取职业技能树
```http
GET /skills/tree/{professionId}
Authorization: Bearer {token}
```

**示例**: `GET /skills/tree/woodcutter`

**响应**:
```json
{
  "professionId": "woodcutter",
  "skillNodes": [
    {
      "id": "woodcutter_basic_cutting",
      "name": "基础伐木",
      "description": "学习基础的伐木技能",
      "requirements": {
        "level": 1,
        "prerequisites": []
      },
      "unlocks": {
        "actions": ["act_chop_wood_t1", "act_craft_lumber_t1"]
      }
    }
  ]
}
```

### 获取技能进度
```http
GET /skills/progress/{professionId}
Authorization: Bearer {token}
```

### 解锁技能节点
```http
POST /skills/unlock
Authorization: Bearer {token}
Content-Type: application/json

{
  "professionId": "woodcutter",
  "nodeId": "woodcutter_advanced_cutting"
}
```

## 装备强化 API

### 强化装备
```http
POST /enhancement/enhance
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "weapon_wooden_sword",
  "targetLevel": 1,
  "serviceProviderId": "optional-provider-id"
}
```

**响应**:
```json
{
  "success": true,
  "newLevel": 1,
  "consumedMaterials": {
    "lumber_1": 2,
    "gold": 100
  },
  "bonusStats": {
    "atk": 5
  }
}
```

### 获取装备强化信息
```http
GET /enhancement/info/{itemId}
Authorization: Bearer {token}
```

**响应**:
```json
{
  "currentLevel": 0,
  "maxLevel": 10,
  "nextLevelCost": {
    "lumber_1": 2,
    "gold": 100
  },
  "successRate": 0.8,
  "canEnhance": true,
  "requiredProfession": "woodcutter"
}
```

### 获取强化服务提供者
```http
GET /enhancement/providers/{itemType}
Authorization: Bearer {token}
```

**示例**: `GET /enhancement/providers/wooden_equipment`

**响应**:
```json
[
  {
    "userId": "uuid",
    "profession": "woodcutter",
    "skillLevel": 50,
    "serviceFee": 50,
    "isOnline": true,
    "completedServices": 10,
    "rating": 4.8
  }
]
```

### 请求强化服务
```http
POST /enhancement/request-service
Authorization: Bearer {token}
Content-Type: application/json

{
  "providerId": "provider-user-id",
  "itemId": "weapon_wooden_sword",
  "targetLevel": 1,
  "message": "请帮我强化装备"
}
```

### 响应强化服务请求
```http
POST /enhancement/respond-service
Authorization: Bearer {token}
Content-Type: application/json

{
  "requestId": "request-uuid",
  "accepted": true,
  "message": "好的，马上帮你强化"
}
```

### 获取我的强化请求
```http
GET /enhancement/my-requests
Authorization: Bearer {token}
```

### 获取收到的强化请求
```http
GET /enhancement/received-requests
Authorization: Bearer {token}
```

## 交易系统 API

### 获取订单簿
```http
GET /trading/orders/:itemId
Authorization: Bearer {token}
```

**响应**:
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "userId": "seller-uuid",
      "itemId": "wood_1",
      "quantity": 100,
      "price": 10,
      "type": "sell",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 创建订单（type: sell 挂单 / buy 收购）
```http
POST /trading/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "wood_1",
  "quantity": 100,
  "price": 10,
  "type": "sell",
  "operationId": "op-uuid"
}
```

### 成交订单
```http
POST /trading/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "order-uuid",
  "quantity": 10,
  "operationId": "op-uuid"
}
```

### 撤销订单
```http
DELETE /trading/orders/:orderId
Authorization: Bearer {token}
```

### 我的订单 / 市场概览 / 价格历史
```http
GET /trading/my-orders
GET /trading/summary
GET /trading/price-history/:itemId
GET /trading/price-trend/:itemId
Authorization: Bearer {token}
```

## 组队系统 API

### 创建队伍
```http
POST /party/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "我的队伍"
}
```

**响应**:
```json
{
  "id": "party-uuid",
  "leaderId": "user-uuid",
  "members": [
    {
      "userId": "user-uuid",
      "role": "leader",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "isOnline": true
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 加入队伍
```http
POST /party/join
Authorization: Bearer {token}
Content-Type: application/json

{
  "partyId": "party-uuid"
}
```

## WebSocket API

### 连接
```
ws://localhost:3001/ws?token={jwt-token}
```

### 发送聊天消息
```json
{
  "type": "chat:send",
  "channel": "world",
  "content": "Hello, world!"
}
```

### 接收消息
```json
{
  "type": "chat:message",
  "channel": "world",
  "sender": "user-uuid",
  "senderProfession": "woodcutter",
  "ts": "2024-01-01T00:00:00.000Z",
  "content": "Hello, world!"
}
```

## 游戏动作 ID 参考

### 伐木工 - 采集
- `act_chop_wood_t1` - 砍伐小白杨 (等级1)
- `act_chop_wood_t2` - 砍伐铁杉 (等级20)
- `act_chop_wood_t3` - 砍伐垂柳 (等级35)
- `act_chop_wood_t4` - 砍伐桦树 (等级50)
- `act_chop_wood_t5` - 砍伐幻霞木 (等级65)
- `act_chop_wood_t6` - 砍伐古龙柏 (等级80)
- `act_chop_wood_t7` - 砍伐界外神木 (等级100)

### 伐木工 - 加工
- `act_craft_lumber_t1` - 制作标准木板 (等级1)
- `act_craft_lumber_t2` - 制作加固木板 (等级20)
- `act_craft_lumber_t3` - 制作柔韧木板 (等级35)
- `act_craft_lumber_t4` - 制作承重木块 (等级50)
- `act_craft_lumber_t5` - 制作附魔木块 (等级65)
- `act_craft_lumber_t6` - 制作龙纹木芯 (等级80)
- `act_craft_lumber_t7` - 制作世界精华块 (等级100)

### 伐木工 - 制作
- `act_craft_weapon_wooden_sword` - 制作木头短剑 (等级1)

### 战斗
- `act_combat_slime` - 战斗：果冻史莱姆 (等级1)
- `act_combat_caterpillar` - 战斗：瞌睡毛毛虫 (等级2)
- `act_combat_monkey` - 战斗：捣蛋小猴 (等级3)
- `act_combat_mushroom` - 战斗：生气蘑菇精 (等级4)
- `act_combat_bee` - 战斗：路痴小蜜蜂 (等级5)
- `act_combat_crab` - 战斗：铁壳寄居蟹 (等级6)
- `act_combat_forest_boss` - 战斗：森林管家(BOSS) (等级10)

## 错误响应

所有API在出错时返回以下格式：

```json
{
  "error": "错误描述信息"
}
```

常见HTTP状态码：
- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权（需要登录）
- `404` - 资源不存在
- `500` - 服务器内部错误

## 开发提示

1. **认证**: 所有需要认证的API都需要在请求头中包含 `Authorization: Bearer {token}`
2. **离线进度**: 调用 `GET /player/state` 时会自动计算离线进度
3. **动作持续时间**: 开始动作后，需要等待指定时间才能获得奖励
4. **材料检查**: 制作和强化会检查材料是否足够
5. **等级限制**: 某些动作需要达到指定等级才能执行

## 测试示例

使用curl测试API：

```bash
# 1. 游客登录
curl -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-123"}'

# 2. 获取玩家状态（使用上一步返回的token）
curl -X GET http://localhost:3001/player/state \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. 开始砍树
curl -X POST http://localhost:3001/actions/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"actionId":"act_chop_wood_t1"}'

# 4. 等待5秒后再次获取状态，查看收益
sleep 5
curl -X GET http://localhost:3001/player/state \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
