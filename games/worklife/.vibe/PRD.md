# PRD — WorkLife v1.0.1 Acceptance/Hardening

## 1. 背景

WorkLife 是一款多职业放置RPG Web 游戏，已完成核心功能开发并经历两轮安全加固。本次验收目标是确认系统在安全性、并发一致性、性能、可用性四个维度达到生产就绪标准。

## 2. 验收范围

本次不新增功能，仅验证以下已有系统的质量：

### 2.1 经济系统一致性

| 子系统 | 关键风险点 | 预期保障机制 |
|--------|-----------|-------------|
| 交易行 purchaseItem | 超卖（quantity < 0） | 原子 UPDATE ... WHERE quantity >= $1 |
| 交易行 executeTrade | 买方资金不足/卖方物品不足 | 事务 + FOR UPDATE 双方锁 |
| 取消订单 cancelTradingOrder | 重复退款 | DELETE ... RETURNING 原子移除 |
| 上架 listItemForSale | 物品凭空产生 | 事务包裹扣减+INSERT |
| 创建订单 createTradingOrder | 资金冻结不一致 | 事务包裹冻结+INSERT |
| 装备强化 enhanceEquipment | 材料复制 | withUserLock 串行化 |
| 组队完成活动 completePartyActivity | 奖励重复发放 | 原子 claim via UPDATE ... RETURNING |

### 2.2 并发控制完整性

所有 `persistState` 调用路径必须在以下保护之一内：
- `withUserLock(userId, ...)` — 进程内串行
- `withTransaction(...)` + `txLoadStateForUpdate(...)` — 跨用户事务行锁

### 2.3 认证与鉴权

- 所有非公开路由在 preHandler 统一校验 JWT
- 公开路径集合使用精确匹配（Set.has），不使用 startsWith 前缀

### 2.4 前端防重

- GET 请求 in-flight 去重 + 5s 缓存
- POST/PUT/DELETE 写操作 in-flight 去重（相同 method:endpoint:body）
- 409 自动退避重试（清缓存 + 150ms × retryCount）
- 401 触发自动登出（排除 /auth/ 路径）

### 2.5 API 安全

- 全局限流（per-IP）
- 请求体大小限制 1MB
- 所有查询参数化（防 SQL 注入）
- 错误响应不泄露堆栈

### 2.6 性能

- getEnhancementProviders 使用 SQL 级 JSONB 过滤 + LIMIT 200
- 前端 GET 缓存 5s TTL 减少重复请求
- 数据库连接池

## 3. 验收标准（通过条件）

1. TypeScript 编译 0 error（前后端均通过 `tsc --noEmit`）
2. 所有经济操作（7 项）均有原子化保障，代码审计确认
3. 所有 persistState 调用路径被 withUserLock 或 withTransaction 保护
4. 认证中间件精确匹配公开路径，无前缀绕过漏洞
5. 前端 API 层写去重逻辑正确
6. 无 N+1 查询或未限制的全表扫描
7. 错误处理不泄露内部信息
8. 所有表有合理索引

## 4. 非目标（OUT OF SCOPE）

- 负载测试 / 压力测试
- UI/UX 美观度评审
- 新功能开发
- 自动化 E2E 测试编写
- 多实例部署验证
