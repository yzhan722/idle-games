# WorkLife Docker 生产部署指南

## 前置要求

- Docker Engine 20.10+
- Docker Compose V2 (docker compose)
- 最低 1GB 可用内存

## 快速启动

```bash
# 1. 复制环境变量模板并编辑
cp .env.production.example .env
# 编辑 .env，替换 JWT_SECRET 和 POSTGRES_PASSWORD

# 2. 构建并启动所有服务
docker compose up -d --build

# 3. 验证服务状态
docker compose ps
docker compose logs backend --tail=20
```

服务启动后即可访问：

- 前端：http://localhost:80
- 后端 API：http://localhost:3001
- 健康检查：http://localhost:3001/health

## 架构说明

```
┌────────────────────────────────────────┐
│             Docker Compose             │
│                                        │
│  ┌───────────┐    ┌───────────┐        │
│  │  Nginx    │───▶│  Backend  │        │
│  │  (前端)   │/api│ (Fastify) │        │
│  │  :80      │    │  :3001    │        │
│  └───────────┘    └─────┬─────┘        │
│                         │              │
│                   ┌─────▼─────┐        │
│                   │ PostgreSQL│        │
│                   │  :5432    │        │
│                   └───────────┘        │
└────────────────────────────────────────┘
```

- **前端容器 (Nginx)**：提供静态文件服务，`/api/` 路径反向代理到后端
- **后端容器 (Node.js)**：Fastify 5 API 服务器
- **数据库容器 (PostgreSQL 16)**：持久化存储，数据保存在 Docker volume 中

## 环境变量

| 变量 | 必须 | 说明 | 默认值 |
|------|------|------|--------|
| POSTGRES_USER | 否 | 数据库用户名 | worklife |
| POSTGRES_PASSWORD | **是** | 数据库密码 | worklife_secret |
| POSTGRES_DB | 否 | 数据库名称 | worklife |
| JWT_SECRET | **是** | JWT 签名密钥（≥32字符） | - |
| RATE_LIMIT_MAX | 否 | 每窗口最大请求数 | 100 |
| RATE_LIMIT_WINDOW | 否 | 限流时间窗口（毫秒） | 60000 |
| CORS_ORIGIN | 否 | 允许的前端域名（逗号分隔） | - |

## 常用命令

```bash
# 查看日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# 重启单个服务
docker compose restart backend

# 查看服务健康状态
curl http://localhost:3001/health

# 停止所有服务
docker compose down

# 停止并删除数据（危险！）
docker compose down -v

# 重新构建特定服务
docker compose build backend --no-cache
docker compose up -d backend
```

## 数据库管理

```bash
# 进入数据库 shell
docker compose exec db psql -U worklife -d worklife

# 执行索引优化迁移
docker compose exec db psql -U worklife -d worklife -f /docker-entrypoint-initdb.d/01-schema.sql

# 手动执行索引迁移（生产环境增量添加）
cat backend/database/migrations/001_add_indexes.sql | docker compose exec -T db psql -U worklife -d worklife

# 备份数据库
docker compose exec db pg_dump -U worklife worklife > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup_20260101.sql | docker compose exec -T db psql -U worklife -d worklife
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并滚动更新
docker compose build
docker compose up -d

# 如果有数据库迁移
cat backend/database/migrations/XXX_name.sql | docker compose exec -T db psql -U worklife -d worklife
```

## 安全注意事项

1. **生产环境必须设置强密码**：`JWT_SECRET` 和 `POSTGRES_PASSWORD`
2. **不要暴露 5432 端口**：生产环境去掉 docker-compose.yml 中 db 的 ports 映射
3. **配置 CORS_ORIGIN**：限制允许的前端域名
4. **定期备份数据库**：使用 cron 定时执行 `pg_dump`
5. **监控健康检查**：`GET /health` 返回 503 时表示数据库连接异常

## 故障排除

**后端启动失败？**
```bash
docker compose logs backend
# 常见原因：DB 未就绪、JWT_SECRET 太短、DATABASE_URL 格式错误
```

**数据库连接拒绝？**
```bash
docker compose exec db pg_isready -U worklife
# 确认 db 容器健康后再启动 backend
```

**前端 502 错误？**
```bash
# 确认 backend 容器在运行且健康
docker compose ps
curl http://localhost:3001/health
```
