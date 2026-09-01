---
inclusion: always
---

# 📁 文件快速索引

> 此文件帮助 AI 快速定位代码，减少上下文消耗。请在提问时引用具体文件路径。

## 后端核心文件

| 文件 | 用途 |
|------|------|
| `backend/src/index.ts` | 主入口（模块化路由） |
| `backend/src/storage.ts` | Storage 接口 + 工具函数 |
| `backend/src/storage_memory.ts` | 内存存储实现 |
| `backend/src/storage_pg.ts` | PostgreSQL 存储实现 |
| `backend/src/types.ts` | 后端类型定义 |

### 路由模块 (`backend/src/routes/`)
- `auth.ts` - 认证：登录、绑定Google
- `player.ts` - 玩家：状态获取、动作开始/停止
- `skills.ts` - 技能：技能树、解锁、经验
- `enhancement.ts` - 强化：装备强化、服务请求
- `trading.ts` - 交易：上架、购买、市场列表
- `party.ts` - 组队：创建、加入、活动
- `equipment.ts` - 装备：耐久度、修复、属性

## 前端核心文件

| 文件 | 用途 |
|------|------|
| `frontend/src/App.tsx` | 应用入口 |
| `frontend/src/components/GameInterface.tsx` | 主游戏界面（重构版） |
| `frontend/src/components/NewGameInterface.tsx` | 主游戏界面（旧版） |
| `frontend/src/contexts/GameContext.tsx` | 游戏状态管理 |
| `frontend/src/contexts/AuthContext.tsx` | 认证状态 |
| `frontend/src/services/api.ts` | API 客户端（带重试） |
| `frontend/src/stores/gameStore.ts` | Zustand 全局状态 |
| `frontend/src/stores/actionQueueStore.ts` | 动作队列状态 |

### 布局组件 (`frontend/src/components/layout/`)
- `GameHeader.tsx` - 顶部栏（Logo、活动状态）
- `GameTabs.tsx` - 标签导航
- `ChatPanel.tsx` - 聊天面板

### 冒险组件 (`frontend/src/components/adventure/`)
- `AdventurePanel.tsx` - 冒险主面板
- `BattleView.tsx` - 战斗界面
- `MonsterCard.tsx` - 怪物卡片

### 采集组件 (`frontend/src/components/gathering/`)
- `GatheringPanel.tsx` - 通用采集面板

### 制作组件 (`frontend/src/components/crafting/`)
- `CraftingPanel.tsx` - 通用制作面板

### 弹窗组件 (`frontend/src/components/modals/`)
- `MonsterModal.tsx` - 怪物详情弹窗
- `GatheringModal.tsx` - 采集详情弹窗
- `CraftingModal.tsx` - 制作详情弹窗

### 队列组件 (`frontend/src/components/queue/`)
- `ActionQueuePanel.tsx` - 动作队列面板

### 技能组件 (`frontend/src/components/skills/`)
- `SkillsOverview.tsx` - 技能总览

### 通用组件 (`frontend/src/components/common/`)
- `Button.tsx` - 按钮
- `Modal.tsx` - 弹窗
- `ProgressBar.tsx` - 进度条
- `Tooltip.tsx` - 工具提示

### 面板组件 (`frontend/src/components/panels/`)
- `GatheringPanel.tsx` - 采集面板（旧）
- `CombatPanel.tsx` - 战斗面板
- `ChatPanel.tsx` - 聊天面板
- `InventoryPanel.tsx` - 背包面板
- `CharacterPanel.tsx` - 角色信息

### 数据文件 (`frontend/src/data/`)
- `gameData.ts` - 职业、地图、装备槽位
- `monsters.ts` - 怪物数据（按地图分类）
- `resources.ts` - 采集资源
- `staticData.ts` - 静态数据（地图、树木、矿石等）

### Hooks (`frontend/src/hooks/`)
- `useAuth.ts` - 认证
- `useWebSocket.ts` - WebSocket 连接
- `useBattle.ts` - 战斗系统
- `useItemResolver.ts` - 物品信息解析
- `useContentPack.ts` - 内容包加载
- `useGameActions.ts` - 游戏动作（采集、战斗）
- `useGameUtils.ts` - 游戏工具函数

### Utils (`frontend/src/utils/`)
- `itemNames.ts` - 物品名称工具
- `logger.ts` - 统一日志

## 配置文件

| 文件 | 用途 |
|------|------|
| `shared/enhanced_content_pack_chinese.json` | 游戏内容配置 |
| `shared/combat_skills.json` | 战斗技能配置 |
| `backend/.env.example` | 环境变量示例 |
| `backend/database/schema.sql` | 数据库表结构 |

## 文档文件

| 文件 | 用途 |
|------|------|
| `README.md` | 项目说明 |
| `TODO.md` | 待办事项 |
| `docs/API_REFERENCE.md` | API 文档 |
| `docs/DATABASE_DESIGN.md` | 数据库设计 |
| `docs/ARCHITECTURE.md` | 架构说明 |

## 快速定位指南

**修改 API 路由** → `backend/src/routes/*.ts`
**修改存储逻辑** → `backend/src/storage_pg.ts` 或 `storage_memory.ts`
**修改游戏界面** → `frontend/src/components/GameInterface.tsx`（新）或 `NewGameInterface.tsx`（旧）
**修改全局状态** → `frontend/src/stores/gameStore.ts`
**修改游戏状态** → `frontend/src/contexts/GameContext.tsx`
**修改游戏数据** → `frontend/src/data/*.ts` 或 `shared/*.json`
**添加新类型** → `backend/src/types.ts` 或 `frontend/src/types/*.ts`
**添加新组件** → `frontend/src/components/` 下对应目录
