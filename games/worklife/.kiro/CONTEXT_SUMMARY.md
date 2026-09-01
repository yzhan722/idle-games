# WorkLife 上下文快速恢复

> 当对话切换时，复制此文件内容作为开场白，帮助 AI 快速恢复上下文。

## 项目状态

**WorkLife** - 多职业放置类RPG游戏
- 前端: React + TS + Vite (端口 5173)
- 后端: Fastify + TS (端口 3001)
- 数据库: PostgreSQL / 内存存储

## 已完成的优化

1. ✅ P0 安全修复（JWT、CORS、请求体限制）
2. ✅ P0 PostgreSQL 存储层完整实现
3. ✅ P1 后端路由模块化 (`routes/*.ts`)
4. ✅ P1 前端数据抽取 (`data/*.ts`, `hooks/*.ts`)
5. ✅ P1 前端组件拆分 (`panels/*.tsx`)
6. ✅ P2 API 重试、WebSocket Hook、错误边界
7. ✅ 游戏内容数据修复（厨师/农夫/炼金产出、沼泽掉落）
8. ✅ 代码问题修复（心跳泄漏、价格历史、广播过滤）

## 关键文件位置

```
后端入口: backend/src/index.ts
存储层:   backend/src/storage.ts, storage_pg.ts, storage_memory.ts
路由:     backend/src/routes/*.ts
类型:     backend/src/types.ts
主界面:   frontend/src/components/NewGameInterface.tsx
状态:     frontend/src/contexts/GameContext.tsx
组件:     frontend/src/components/panels/*.tsx
数据:     frontend/src/data/*.ts
Hooks:    frontend/src/hooks/*.ts
游戏内容: shared/enhanced_content_pack_chinese.json
```

## 待处理任务

参见 `TODO.md`

## 使用方式

新对话开始时，可以这样说：

```
我在继续开发 WorkLife 项目。
上次完成了 [具体任务]。
现在需要 [具体需求]。
相关文件: #[文件路径]
```
