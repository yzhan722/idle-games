# WorkLife - 多职业放置RPG游戏

一个基于Web的多职业放置类RPG游戏，支持伐木、采矿、战斗、制作等多种玩法。

## 🚀 快速开始

### 本地开发

**1. 安装依赖**
```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

**2. 启动服务**

**Windows:**
```powershell
.\scripts\start-all.ps1
```

**Linux/Mac:**
```bash
./scripts/dev.sh
```

**3. 访问游戏**
- 前端: http://localhost:3000
- 后端: http://localhost:3001

## 📱 移动端支持

游戏已完全适配移动端，支持：
- 📱 手机（竖屏/横屏）
- 📱 平板设备
- 🖥️ 桌面浏览器

## 🎮 游戏特性

### 职业系统
- 🪓 **伐木工** - 砍伐树木，制作木制品
- ⛏️ **矿工** - 开采矿石，冶炼金属
- 🌾 **农夫** - 种植作物，养殖动物
- 🍳 **厨师** - 烹饪食物，制作药水
- 🧵 **裁缝** - 制作装备，缝制衣物
- ⚗️ **炼金术师** - 炼制药剂，附魔装备

### 核心玩法
- ⚔️ **战斗系统** - 挑战怪物，获取战利品
- 🛠️ **制作系统** - 收集材料，制作物品
- 📈 **技能树** - 升级技能，解锁新配方
- 💰 **交易行** - 买卖物品，积累财富
- 🎒 **背包系统** - 管理物品，装备角色
- 💬 **聊天系统** - 与其他玩家交流

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Vite 5
- CSS3 (响应式设计)

### 后端
- Node.js + Fastify 5
- TypeScript
- PostgreSQL
- WebSocket (实时通信)

### 部署
- 任意 Node.js 运行环境 + PostgreSQL
- Docker (可选)
- Ngrok (仅用于本地开发的临时内网穿透预览，非生产方案)

## 📚 文档

- [快速开始指南](docs/QUICK_START.md)
- [部署说明](docs/DEPLOYMENT_INFO.md)
- [API参考](docs/API_REFERENCE.md)
- [架构设计](docs/ARCHITECTURE.md)
- [数据库设计](docs/DATABASE_DESIGN.md)

## 📁 项目结构

```
worklife/
├── backend/          # 后端服务
│   ├── src/         # 源代码
│   └── database/    # 数据库脚本
├── frontend/        # 前端应用
│   ├── src/         # 源代码
│   └── public/      # 静态资源
├── shared/          # 共享资源
│   └── *.json       # 游戏内容配置
├── docs/            # 文档
└── scripts/         # 启动脚本
```

> 说明：仓库不包含 `ngrok.exe`。如需临时内网穿透预览，请自行从 https://ngrok.com 下载后放入项目根目录（已在 .gitignore 中忽略）。

## 🔧 开发脚本

### Windows (PowerShell)
```powershell
# 启动所有服务
.\scripts\start-all.ps1

# 启动开发环境
.\scripts\dev.ps1

# 启动Ngrok公网访问
.\scripts\start-ngrok.ps1
```

### Linux/Mac (Bash)
```bash
# 启动开发环境
./scripts/dev.sh

# 启动Ngrok公网访问
./scripts/start-ngrok.sh
```

## 🌐 临时公网预览（开发用）

Ngrok 仅用于开发期把本地服务临时暴露给外部测试，**不是生产部署方案**。需先自行下载 `ngrok.exe` 放入项目根目录：

```powershell
# Windows
.\scripts\start-ngrok.ps1

# Linux/Mac
./scripts/start-ngrok.sh
```

生产部署请使用正式服务器 / 容器并配置好 `DATABASE_URL`、`JWT_SECRET`、`CORS_ORIGIN` 等环境变量，详见 [部署文档](docs/DEPLOYMENT_INFO.md)。

## 📝 待办事项

查看 [TODO.md](TODO.md) 了解开发计划

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**开始你的冒险之旅吧！** 🎮✨
