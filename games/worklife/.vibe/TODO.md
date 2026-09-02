# TODO — WorkLife v1.0.1 Acceptance/Hardening 任务列表

> 执行模式：Acceptance/Hardening（验收加固）
> 每个 TODO 不超过 300 行改动，可独立验证。
> 证据日期：2026-09-02，分支 `feat/progress-hardening`。TODO-13 由 Phase 6 `npm run verify` 关闭。

## Phase 1: 编译与类型安全验证

### TODO-01: 后端 TypeScript 编译检查
- **动作**: 运行 `cd backend && npx tsc --noEmit`
- **验收标准**: 0 error, 0 warning (允许 noUnusedLocals 关闭)
- **证据**: 2026-09-02 `npx tsc --noEmit` exit 0；`npm run build` exit 0

### TODO-02: 前端 TypeScript 编译检查
- **动作**: 运行 `cd frontend && npx tsc --noEmit`
- **验收标准**: 0 error
- **证据**: 2026-09-02 `npx tsc --noEmit` exit 0；`npm run build` (`tsc -b && vite build`) exit 0

## Phase 2: 安全审计

### TODO-03: 认证中间件路径匹配审计
- **审计点**: 确认 publicPaths 使用 Set.has 精确匹配而非 startsWith
- **审计点**: 确认 pathname 正确剥离 query string 和 trailing slashes
- **验收标准**: 代码审计通过，无前缀绕过漏洞
- **证据**: `http_public_path.ts` + `http_public_path.test.ts`（query / trailing slash / `/health-evil` / `/auth/guest-evil`）。限流豁免改为精确 `/health`。

### TODO-04: SQL 注入审计
- **审计点**: 扫描 storage_pg.ts 所有 pool.query / client.query 调用
- **验收标准**: 所有动态值均通过 $N 参数化传入，无字符串拼接
- **证据**: 动态值均为 `$N`。唯一 identifier 插值 `enhancement_requests.${col}` 收口为 `enhancementRequestUserColumn()` 白名单（`sql_identifiers.test.ts` 拒绝 `DROP TABLE` 注入）。

### TODO-05: 错误信息泄露审计
- **审计点**: 确认 setErrorHandler 对 500 不暴露 error.stack/error.message
- **审计点**: 确认 route handler 不直接 throw 含敏感信息的 Error
- **验收标准**: 500 响应只返回 `{error: "internal_error", message: "通用提示"}`
- **证据**: `mapThrownError` + `http_errors.test.ts`；装备耐久/修理 catch 不再回传 `error.message`。

## Phase 3: 并发一致性审计

### TODO-06: persistState 调用链完整性审计
- **审计点**: 搜索所有 `persistState(` 调用位置
- **验收标准**: 每个调用点都在 withUserLock 或 withTransaction 保护范围内
- **证据**: `storage_pg.ts` 中 `persistState(` 均在 `withUserLock` 回调内；跨用户经济路径走 `txPersistState` + `withTransaction`。

### TODO-07: 交易经济原子性审计
- **审计点**: purchaseItem 原子 UPDATE、executeTrade FOR UPDATE 排序、cancelTradingOrder DELETE RETURNING
- **验收标准**: 代码逻辑确认无超卖/重复退款/负资产可能
- **证据**: PG `DELETE ... RETURNING`；memory cancel 改为先删订单再退款。测试：`refunds a cancelled sell order once`。

### TODO-08: 组队系统原子性审计
- **审计点**: createParty 防多队、joinParty 防超员、completePartyActivity 防重复发奖
- **验收标准**: 事务+行锁逻辑确认无竞态窗口
- **证据**: PG FOR UPDATE + claim UPDATE。测试：`rejects duplicate party join and a seventh member`。

### TODO-09: 技能/强化/耐久幂等性审计
- **审计点**: unlockSkillNode 幂等检查、enhanceEquipment withUserLock、repairEquipment withUserLock
- **验收标准**: 重复请求不会重复扣材料/发奖
- **证据**: unlock 已 includes 短路。测试：`rejects a second enhance at the same level and does not double-charge`。装备穿戴 `canEquipItem` 拒绝未拥有/槽位不符。

## Phase 4: 前端质量审计

### TODO-10: API 客户端防重机制审计
- **审计点**: GET in-flight dedup 正确性、writeInFlight dedup 正确性
- **审计点**: 409 重试逻辑、401 登出逻辑
- **验收标准**: 快速双击不会发出重复写请求；重试不会无限循环
- **证据**: `InFlightMap` + `write_inflight.test.ts`。409/5xx 重试 `retryCount > 0` 绕过去重，避免等自己死锁。`setToken` 同时清空 writeInFlight。

### TODO-11: 前端状态一致性审计
- **审计点**: AuthContext 登出时清理 token 和状态
- **审计点**: GameContext 轮询间隔和错误处理
- **验收标准**: 登出后不残留旧状态；网络错误不导致UI崩溃
- **证据**: `logout` / 401 handler 清 `worklife_user` + `apiClient.setToken('')`；无 user 时 `GameContext` 把 `playerState` 置 null；visibility 后台停轮询。无独立 React 单测，Phase 3 E2E 补 guest bootstrap。

## Phase 5: 性能审计

### TODO-12: 数据库查询性能审计
- **审计点**: getEnhancementProviders SQL 级过滤 + LIMIT
- **审计点**: 是否存在未限制的全表扫描
- **审计点**: 连接池配置合理性
- **验收标准**: 无 N+1、无无限 SELECT、有合理 LIMIT
- **证据**: providers `LIMIT 200` + JSONB `?` 过滤。market listings `LIMIT 100`。Pool `max: 10`, `idleTimeoutMillis: 30000`。

## Phase 6: 最终验收

### TODO-13: 14 点最终验收 Checklist 执行
- **执行**: 按 Issue #1 Phase 6 重新跑 build/test/integration/E2E/`npm run verify`
- **验收标准**: 所有 14 项有本轮证据；无 Release Blocker
- **证据**: 2026-09-02 SHA `39f5c51`。backend 38/0、integration 7/7、E2E 6/6、`npm run verify` PASS。详见 `.vibe/FINAL_ACCEPTANCE_REPORT.md`。
- **状态**: DONE

---

## 状态跟踪

| TODO | 状态 | 执行时间 | 证据 |
|------|------|---------|------|
| TODO-01 | DONE | 2026-09-02 | `npx tsc --noEmit` exit 0 |
| TODO-02 | DONE | 2026-09-02 | `npx tsc --noEmit` exit 0 |
| TODO-03 | DONE | 2026-09-02 | `http_public_path.test.ts` |
| TODO-04 | DONE | 2026-09-02 | parameterized queries + identifier whitelist tests |
| TODO-05 | DONE | 2026-09-02 | `http_errors.test.ts` |
| TODO-06 | DONE | 2026-09-02 | persistState grep + lock wrappers |
| TODO-07 | DONE | 2026-09-02 | cancel-once economy test |
| TODO-08 | DONE | 2026-09-02 | party join capacity test |
| TODO-09 | DONE | 2026-09-02 | enhance idempotent + equip tests |
| TODO-10 | DONE | 2026-09-02 | write_inflight.test.ts |
| TODO-11 | DONE | 2026-09-02 | code audit AuthContext/GameContext |
| TODO-12 | DONE | 2026-09-02 | LIMIT 200 + pool max 10 |
| TODO-13 | DONE | 2026-09-02 | `.vibe/FINAL_ACCEPTANCE_REPORT.md` + `npm run verify` |
