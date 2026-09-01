# TODO — WorkLife v1.0.1 Acceptance/Hardening 任务列表

> 执行模式：Acceptance/Hardening（验收加固）
> 每个 TODO 不超过 300 行改动，可独立验证。

## Phase 1: 编译与类型安全验证

### TODO-01: 后端 TypeScript 编译检查
- **动作**: 运行 `cd backend && npx tsc --noEmit`
- **验收标准**: 0 error, 0 warning (允许 noUnusedLocals 关闭)
- **预估改动**: 0 行（仅验证）

### TODO-02: 前端 TypeScript 编译检查
- **动作**: 运行 `cd frontend && npx tsc --noEmit`
- **验收标准**: 0 error
- **预估改动**: 0 行（仅验证）

## Phase 2: 安全审计

### TODO-03: 认证中间件路径匹配审计
- **审计点**: 确认 publicPaths 使用 Set.has 精确匹配而非 startsWith
- **审计点**: 确认 pathname 正确剥离 query string 和 trailing slashes
- **验收标准**: 代码审计通过，无前缀绕过漏洞

### TODO-04: SQL 注入审计
- **审计点**: 扫描 storage_pg.ts 所有 pool.query / client.query 调用
- **验收标准**: 所有动态值均通过 $N 参数化传入，无字符串拼接

### TODO-05: 错误信息泄露审计
- **审计点**: 确认 setErrorHandler 对 500 不暴露 error.stack/error.message
- **审计点**: 确认 route handler 不直接 throw 含敏感信息的 Error
- **验收标准**: 500 响应只返回 `{error: "internal_error", message: "通用提示"}`

## Phase 3: 并发一致性审计

### TODO-06: persistState 调用链完整性审计
- **审计点**: 搜索所有 `persistState(` 调用位置
- **验收标准**: 每个调用点都在 withUserLock 或 withTransaction 保护范围内

### TODO-07: 交易经济原子性审计
- **审计点**: purchaseItem 原子 UPDATE、executeTrade FOR UPDATE 排序、cancelTradingOrder DELETE RETURNING
- **验收标准**: 代码逻辑确认无超卖/重复退款/负资产可能

### TODO-08: 组队系统原子性审计
- **审计点**: createParty 防多队、joinParty 防超员、completePartyActivity 防重复发奖
- **验收标准**: 事务+行锁逻辑确认无竞态窗口

### TODO-09: 技能/强化/耐久幂等性审计
- **审计点**: unlockSkillNode 幂等检查、enhanceEquipment withUserLock、repairEquipment withUserLock
- **验收标准**: 重复请求不会重复扣材料/发奖

## Phase 4: 前端质量审计

### TODO-10: API 客户端防重机制审计
- **审计点**: GET inFlight dedup 正确性、writeInFlight dedup 正确性
- **审计点**: 409 重试逻辑、401 登出逻辑
- **验收标准**: 快速双击不会发出重复写请求；重试不会无限循环

### TODO-11: 前端状态一致性审计
- **审计点**: AuthContext 登出时清理 token 和状态
- **审计点**: GameContext 轮询间隔和错误处理
- **验收标准**: 登出后不残留旧状态；网络错误不导致UI崩溃

## Phase 5: 性能审计

### TODO-12: 数据库查询性能审计
- **审计点**: getEnhancementProviders SQL 级过滤 + LIMIT
- **审计点**: 是否存在未限制的全表扫描
- **审计点**: 连接池配置合理性
- **验收标准**: 无 N+1、无无限 SELECT、有合理 LIMIT

## Phase 6: 最终验收

### TODO-13: 14 点最终验收 Checklist 执行
- **执行**: 按 Autonomous Vibe Agent 06_FINAL_ACCEPTANCE 模板逐项检查
- **验收标准**: 所有 14 项 PASS

---

## 状态跟踪

| TODO | 状态 | 执行时间 |
|------|------|---------|
| TODO-01 | PENDING | - |
| TODO-02 | PENDING | - |
| TODO-03 | PENDING | - |
| TODO-04 | PENDING | - |
| TODO-05 | PENDING | - |
| TODO-06 | PENDING | - |
| TODO-07 | PENDING | - |
| TODO-08 | PENDING | - |
| TODO-09 | PENDING | - |
| TODO-10 | PENDING | - |
| TODO-11 | PENDING | - |
| TODO-12 | PENDING | - |
| TODO-13 | PENDING | - |
