# WorkLife 架构设计

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Components  │  │   Contexts   │  │   Services   │  │
│  │              │  │              │  │              │  │
│  │ - UI组件     │  │ - GameContext│  │ - API Client │  │
│  │ - 游戏界面   │  │ - AuthContext│  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Fastify)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routes     │  │   Business   │  │   Storage    │  │
│  │              │  │     Logic    │  │              │  │
│  │ - Auth       │  │ - 职业系统   │  │ - Interface  │  │
│  │ - Player     │  │ - 战斗系统   │  │ - Memory     │  │
│  │ - Trading    │  │ - 交易系统   │  │ - PostgreSQL │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Users     │  │  PlayerState │  │   Trading    │  │
│  │              │  │              │  │              │  │
│  │ - 用户信息   │  │ - 玩家数据   │  │ - 交易订单   │  │
│  │ - 认证信息   │  │ - 技能等级   │  │ - 交易历史   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 数据流

### 1. 玩家登录流程
```
用户 → LoginScreen → AuthContext.login()
     → API: POST /auth/login
     → Backend: 创建/查找用户
     → 返回 JWT Token
     → 保存到 localStorage
     → GameContext.refreshPlayerState()
     → 加载游戏界面
```

### 2. 执行生活技能
```
用户点击采集 → NewGameInterface
            → GameContext.startLifeAction(actionId)
            → API: POST /actions/start
            → Backend: 
                - 验证技能等级
                - 计算产出
                - 更新玩家状态
                - 增加经验
            → 返回新状态
            → 更新UI
            → 显示奖励通知
```

### 3. 战斗流程
```
用户选择怪物 → 开始战斗
            → 前端模拟战斗
            → 计算伤害
            → 更新HP
            → 战斗结束
            → API: POST /actions/start (act_combat_xxx)
            → Backend: 验证并发放奖励
            → 更新玩家状态
```

## 核心系统设计

### 职业系统

#### 数据结构
```typescript
{
  professions: {
    woodcutter: {
      skill: 'skill_woodcutter',
      gatherTab: 'logging',      // 采集页面
      craftTab: 'woodworking',   // 加工页面
    }
  }
}
```

#### 经验系统
- 每个职业一个技能等级
- 采集和加工共享经验
- 指数增长曲线: `baseXp * (level - 1)^1.5`

### 战斗系统

#### 战斗计算
```typescript
// 伤害计算
damage = attacker.atk - defender.def
damage = Math.max(1, damage) // 最少1点伤害

// 暴击
if (random < critRate) {
  damage *= 2
}

// 闪避
if (random < dodgeRate) {
  damage = 0
}
```

#### 战斗流程
1. 初始化战斗状态
2. 回合制战斗
3. 玩家攻击 → 敌人攻击
4. 检查胜负
5. 发放奖励

### 交易系统

#### 订单类型
- 出售单: 玩家挂出物品
- 收购单: 玩家挂出收购需求

#### 交易流程
```
创建订单 → 验证物品/金币
        → 扣除物品/金币
        → 创建订单记录
        → 上架到市场

购买物品 → 验证金币
        → 扣除金币
        → 增加物品
        → 更新订单状态
        → 通知卖家
```

### 装备系统

#### 装备槽位
- 主手 (main_hand)
- 副手 (off_hand)
- 头部 (head)
- 胸部 (chest)
- 腿部 (legs)
- 脚部 (feet)
- 饰品1 (accessory1)
- 饰品2 (accessory2)

#### 装备属性
```typescript
{
  atk: number,    // 攻击力
  mag: number,    // 魔法攻击
  def: number,    // 防御力
  hp: number,     // 生命值
  spd: number,    // 速度
  crit: number,   // 暴击率
  dodge: number,  // 闪避率
}
```

## 性能优化

### 前端优化
1. **防止闪烁**
   - 使用 `requestAnimationFrame`
   - CSS硬件加速
   - 避免不必要的重渲染

2. **状态管理**
   - Context分离（Auth/Game）
   - 减少全局状态
   - 使用 useMemo/useCallback

3. **资源加载**
   - 图片懒加载
   - 代码分割
   - 缓存策略

### 后端优化
1. **数据库**
   - 合适的索引
   - 连接池
   - 查询优化

2. **缓存**
   - Redis缓存玩家状态
   - 内存缓存配置数据
   - CDN缓存静态资源

3. **并发控制**
   - 乐观锁
   - 分布式锁
   - 队列系统

## 安全设计

### 认证授权
- JWT Token认证
- Token过期机制
- 刷新Token

### 数据验证
- 输入验证
- 业务逻辑验证
- 防止作弊

### 速率限制
- API请求限制
- 登录尝试限制
- 交易频率限制

## 扩展性设计

### 水平扩展
- 无状态后端
- 负载均衡
- 数据库读写分离

### 功能扩展
- 插件化职业系统
- 可配置的内容包
- 模块化的游戏系统

### 数据迁移
- 版本控制
- 向后兼容
- 数据迁移脚本

## 监控和日志

### 日志系统
- 结构化日志
- 日志级别
- 日志聚合

### 监控指标
- 请求延迟
- 错误率
- 数据库性能
- 内存使用

### 告警机制
- 错误告警
- 性能告警
- 业务告警

## 部署架构

### 开发环境
```
Frontend: Vite Dev Server (5173)
Backend: tsx watch (3001)
Database: Memory Storage
```

### 生产环境
```
Frontend: Nginx + Static Files
Backend: PM2 + Node.js Cluster
Database: PostgreSQL + Redis
Load Balancer: Nginx
```

## 技术选型理由

### 前端
- **React**: 成熟的生态系统，丰富的组件库
- **Vite**: 快速的开发体验，优秀的构建性能
- **TypeScript**: 类型安全，减少运行时错误

### 后端
- **Fastify**: 高性能，低开销，插件生态
- **TypeScript**: 与前端共享类型定义
- **PostgreSQL**: 可靠的关系型数据库，支持JSON

### 工具
- **Pino**: 高性能日志库
- **Zod**: 运行时类型验证
- **JWT**: 标准的认证方案
