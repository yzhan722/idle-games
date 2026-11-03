# WorkLife 快速启动指南

## 🚀 最快启动方式

### 方式1：一键启动所有服务（推荐）
```powershell
.\start-all.ps1
```
这会启动：
- ✅ 后端服务 (http://localhost:3001)
- ✅ 前端服务 (http://localhost:3000)
- ✅ Cloudflare Tunnel（如果已安装）

### 方式2：分步启动

#### 1. 启动后端
```powershell
cd backend
npm run dev
```

#### 2. 启动前端
```powershell
cd frontend
npm run dev
```

#### 3. 启动隧道（可选）
```powershell
.\start-tunnel-quick.ps1
```

## 🌐 Cloudflare Tunnel 设置

### 首次安装
```powershell
# 安装 cloudflared
winget install --id Cloudflare.cloudflared

# 验证安装
cloudflared --version
```

### 快速测试（无需配置）
```powershell
# 方法1：使用脚本
.\start-tunnel-quick.ps1

# 方法2：手动启动
# 前端隧道
cloudflared tunnel --url http://localhost:3000

# 后端隧道（新终端）
cloudflared tunnel --url http://localhost:3001
```

### 完整配置（固定域名）
详见 `CLOUDFLARE_TUNNEL_SETUP.md`

## 📝 常用命令

```powershell
# 开发模式
npm run dev

# 构建
npm run build

# 查看隧道
cloudflared tunnel list

# 停止所有服务
# 关闭对应的终端窗口即可
```

## 🔗 访问地址

### 本地开发
- 前端：http://localhost:3000
- 后端：http://localhost:3001
- 健康检查：http://localhost:3001/health

### 公网访问（Cloudflare Tunnel）
运行隧道后，查看终端输出获取域名，格式类似：
- 前端：https://xxxxx.trycloudflare.com
- 后端：https://yyyyy.trycloudflare.com

## ⚠️ 注意事项

1. **确保端口未被占用**
   - 前端：3000
   - 后端：3001

2. **数据库**
- 默认使用内存数据库
  - 开发模式会把进度写到 `backend/data/worklife-memory.json`，重启后游客档还在
  - 生产环境需配置 PostgreSQL

3. **环境变量**
   - 复制 `.env.example` 为 `.env`
   - 修改必要的配置

4. **隧道安全**
   - 不要提交隧道凭证到Git
   - 已添加到 `.gitignore`

## 🐛 故障排除

### 端口被占用
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 结束进程
taskkill /PID <进程ID> /F
```

### 隧道连接失败
1. 检查本地服务是否运行
2. 检查防火墙设置
3. 重启隧道

### 前端无法连接后端
1. 检查 Vite 代理配置（`frontend/vite.config.ts`）
2. 确认后端服务正常运行
3. 查看浏览器控制台错误

## 📚 更多文档

- 完整隧道设置：`CLOUDFLARE_TUNNEL_SETUP.md`
- API文档：`API_REFERENCE.md`
- 架构文档：`ARCHITECTURE.md`
- 数据库设计：`DATABASE_DESIGN.md`

## 🎮 开始游戏

1. 启动所有服务
2. 访问 http://localhost:3000
3. 点击"游客登录"
4. 开始你的异世界打工生活！
