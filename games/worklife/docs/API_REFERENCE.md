# WorkLife API 参考文档

## 基础信息

- **Base URL**: `http://localhost:3001`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

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

### 获取交易列表
```http
GET /trading/listings?search=wood&filters={}
Authorization: Bearer {token}
```

**响应**:
```json
[
  {
    "id": "listing-uuid",
    "sellerId": "seller-uuid",
    "itemId": "wood_1",
    "quantity": 100,
    "pricePerUnit": 10,
    "listedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-02T00:00:00.000Z",
    "status": "active"
  }
]
```

### 上架物品
```http
POST /trading/list
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "wood_1",
  "quantity": 100,
  "pricePerUnit": 10,
  "duration": 24
}
```

### 购买物品
```http
POST /trading/purchase
Authorization: Bearer {token}
Content-Type: application/json

{
  "listingId": "listing-uuid",
  "quantity": 10
}
```

**响应**:
```json
{
  "success": true
}
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
