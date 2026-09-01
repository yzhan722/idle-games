# TEST PLAN — WorkLife v1.0.1 Acceptance/Hardening

## 1. 编译测试（离线/静态）

| 测试项 | 命令 | 通过标准 |
|--------|------|---------|
| 后端 TSC | `cd backend && npx tsc --noEmit` | exit code 0, 0 error |
| 前端 TSC | `cd frontend && npx tsc --noEmit` | exit code 0, 0 error |
| 前端 Vite Build | `cd frontend && npm run build` | exit code 0, dist/ 产出 |

## 2. 单元测试

| 测试项 | 命令 | 通过标准 |
|--------|------|---------|
| enhancement_utils | `cd backend && npx tsx src/enhancement_utils.test.ts` | 所有 assert 通过 |

## 3. 代码审计测试（人工/AI验证）

### 3.1 安全审计项

| 审计项 | 方法 | 通过标准 |
|--------|------|---------|
| SQL 注入 | grep 所有 query 调用，确认无字符串拼接 | 100% 参数化 |
| 认证绕过 | 审查 publicPaths + preHandler 逻辑 | Set.has 精确匹配 |
| 信息泄露 | 审查 setErrorHandler | 500 不含 stack |
| JWT Secret | 审查 envSchema | ≥32 chars 校验 |
| CORS | 审查 corsOrigin 逻辑 | 生产环境无配置时拒绝 |
| 请求体限制 | 审查 Fastify bodyLimit | 1MB |
| 限流 | 审查 rateLimit 注册 | per-IP, configurable |

### 3.2 并发一致性审计项

| 审计项 | 方法 | 通过标准 |
|--------|------|---------|
| persistState 保护覆盖率 | grep `persistState(` + 追踪调用链 | 100% 在锁内 |
| purchaseItem 超卖 | 审查 UPDATE WHERE quantity >= | 原子 SQL |
| executeTrade 双方一致 | 审查 sorted FOR UPDATE | 字典序锁 |
| cancelTradingOrder 重复退款 | 审查 DELETE RETURNING | 原子移除 |
| completePartyActivity 重复发奖 | 审查 UPDATE ... RETURNING | 原子 claim |
| unlockSkillNode 幂等 | 审查 includes 检查 | 已解锁直接返回 |

### 3.3 前端质量审计项

| 审计项 | 方法 | 通过标准 |
|--------|------|---------|
| GET dedup | 审查 inFlight Map | 相同 key 复用 |
| Write dedup | 审查 writeInFlight Map | 相同 key 复用 |
| 409 重试 | 审查 retry 逻辑 | 清缓存+退避 |
| 401 登出 | 审查 onUnauthorized | 排除 /auth/ |
| Token 清理 | 审查 setToken | 清 cache + inFlight |

## 4. 集成测试（手动 smoke test）

```bash
# 1. 启动后端
cd backend && npm run dev

# 2. 健康检查
curl http://localhost:3001/health
# 期望: {"ok":true}

# 3. 游客登录
TOKEN=$(curl -s -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"smoke-test-001"}' | jq -r '.token')

# 4. 获取玩家状态
curl -s http://localhost:3001/player/state \
  -H "Authorization: Bearer $TOKEN" | jq '.activeClassId'
# 期望: "woodcutter" 或有效职业

# 5. 执行生活动作
curl -s -X POST http://localhost:3001/actions/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"actionId":"act_chop_wood_t1"}' | jq '.success'
# 期望: true

# 6. 未认证请求应被拒绝
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/player/state
# 期望: 401
```

## 5. 安全测试

```bash
# 路径遍历绕过尝试
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/auth/guest/../player/state
# 期望: 401 (不能通过 ../player/state 绕过认证)

# 大请求体测试
dd if=/dev/zero bs=2M count=1 | curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  --data-binary @-
# 期望: 413 或连接重置（bodyLimit 1MB）
```

## 6. 性能测试（可选，非必须通过项）

| 测试项 | 工具 | 基准 |
|--------|------|------|
| 单用户 QPS | curl loop | > 50 req/s |
| 并发写冲突 | 并行 curl | 409 + 最终一致 |

## 7. 文档一致性测试

| 审计项 | 方法 | 通过标准 |
|--------|------|---------|
| API_REFERENCE.md 与实际路由一致 | 比对 routes/*.ts | 路由存在且参数匹配 |
| ARCHITECTURE.md 与实际一致 | 比对实际代码结构 | 无重大偏差 |

## 8. 最终验收命令

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
cd frontend && npm run build
cd backend && npx tsx src/enhancement_utils.test.ts
```

全部 exit code 0 即为编译/构建层面通过。
