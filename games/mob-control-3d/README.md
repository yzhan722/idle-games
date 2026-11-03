# 波波应援团：蒸汽工坊 3D (Mob Control 3D — Sweet Steam Idol Edition)

基于 **Three.js + TypeScript + Vite + Cloudflare Workers** 构建的暖阳蒸汽工坊 Q 萌倍增应援对战 3D Web 游戏，包含 **7 大甜点萌宠应援种族**（波波族 / 布丁族 / 兔耳族 / 喵喵族 / 云朵族 / 曲奇族 / 招财族）、**GPU Instanced 果冻高光与弹性跳跃着色器**、**白黄铜蒸汽泡泡炮与双马尾偶像应援少女**、**晴空蒸汽朋克工坊小镇与红砖大齿轮厂房门楼**、**织物悬挂倍增横幅 + 4 类交互地形 + 5 类工坊机关**、**全局暖米色圆角金棕描边 + 立体绿按钮 UI** 以及 **Cloudflare KV 全服实时双排行榜**。

- **线上正式地址**：https://mob-control.yinosites.com/

---

## 一、快速上手（本地开发）

### 1. 环境要求
- **Node.js**：推荐 `v18.18+` 或 `v20+`
- **包管理器**：`npm`

### 2. 安装依赖与启动开发服
```bash
# 1. 安装依赖
npm install

# 2. 启动本地热更新开发服（默认支持局域网 --host 访问）
npm run dev

# 3. 类型检查与生产环境打包（输出至 dist/ 目录）
npm run build

# 4. 本地预览生产包
npm run preview
```

---

## 二、服务器与线上部署信息（Cloudflare Workers + KV）

本项目采用 **Cloudflare Workers (Static Assets + Edge API + KV)** 一体化架构部署，前后端同域运行，无需单独维护传统 Node 进程。

### 1. 核心线上配置参数

| 配置项 | 参数值 / 说明 |
| :--- | :--- |
| **线上域名 (Custom Domain)** | `https://mob-control.yinosites.com` |
| **Cloudflare Account ID** | `ecec6031aa78f5f76f6e89595ce2f4a1` |
| **Worker 名称 (`name`)** | `mob-control-proxy` |
| **Worker 配置文件** | [`deploy/wrangler.toml`](./deploy/wrangler.toml) |
| **Worker 入口脚本** | [`deploy/worker.mjs`](./deploy/worker.mjs) |
| **静态资源绑定 (`ASSETS`)** | 自动托管编译产物目录 `../dist` |
| **排行榜 KV 绑定变量名** | `MOB_CONTROL_LEADERBOARD` |
| **排行榜 KV Namespace ID** | `af83ba38768c492cadeb533506916826`（存储 Key：`real_players_v1`） |
| **源站回源兜底 (Fallback)** | 若 `ASSETS` 未命中静态文件，Worker 会回源代理至 `https://yinosites.com/previews/mob-control/*` |

### 2. 如何部署上线

#### 第一步：登录 Cloudflare 账号（首次在新电脑操作）
在终端执行以下命令授权 Wrangler（或配置环境变量 `CLOUDFLARE_API_TOKEN`）：
```bash
npx wrangler login
```

#### 第二步：一键打包并发布到线上
可以通过 `package.json` 内置脚本一键完成编译与部署：
```bash
npm run deploy
```
或者分步执行（推荐在观察构建日志时分步执行）：
```bash
# 1. 编译 TypeScript 并生成 dist/ 静态包
npm run build

# 2. 通过 Wrangler 将 dist/ 静态资源与 deploy/worker.mjs 推送至 Cloudflare 边缘节点
npx wrangler deploy -c deploy/wrangler.toml
```

### 3. 边缘 API 接口说明 (`deploy/worker.mjs`)
- **`GET /api/leaderboard`**：读取全球 Top 10 战力榜（`top10`）与活跃时长榜（`activeTop10`），由 Cloudflare KV (`MOB_CONTROL_LEADERBOARD`) 持久化存储。
- **`POST /api/leaderboard`**：上报/更新玩家通关进度、累计歼敌数、在线时长与当前穿戴种族涂装：
  ```json
  {
    "playerId": "p_xxxxxx",
    "name": "玩家昵称",
    "bestStage": 25,
    "totalKills": 38500,
    "playTimeSeconds": 4200,
    "skinName": "星河霓虹",
    "badgeColor": "#f472b6"
  }
  ```

---

## 三、项目目录与核心代码架构

```text
mob-control-3d/
├── deploy/
│   ├── wrangler.toml          # Cloudflare Workers 路由、KV 与静态资源绑定配置
│   └── worker.mjs             # 边缘 Worker：处理 /api/leaderboard 排行榜接口与静态资源分发
├── public/                    # 静态公共资源
├── src/
│   ├── main.ts                # 应用入口：HUD 绑定、7 大种族技能树面板、图鉴、排行榜、更新公告弹窗
│   ├── style.css              # 全局科幻 UI 样式、响应式布局（PC/移动端自适应）、3D 世界浮标样式
│   ├── audio/
│   │   └── SoundManager.ts    # Web Audio API 纯程序化合成音效与动态危机感 BGM 引擎（零外部音频依赖）
│   ├── game/
│   │   ├── World3D.ts         # 核心 3D 战场引擎：单位 Instanced 渲染、物理碰撞、4 类交互地形、5 类障碍机关、Boss 战与场内外宏大景观
│   │   ├── HumanoidModels.ts  # 7 大星际种族程序化高模生成器（放样轮廓、雕刻胸甲、倒角剑刃、微装甲凹凸贴图与 GPU 顶点动画）
│   │   ├── SceneThemes.ts     # 5 大星球环境主题 + 自定义 GLSL Shader（深渊流体海、能量瀑布、堡垒六边形能量盾、母巢传送门）
│   │   ├── State.ts           # 游戏存档状态管理（localStorage 持久化、7 大种族技能树数值计算、兵种/巨神/战车进化）
│   │   └── SkillIcons.ts      # 技能树与种族矢量 SVG 图标库
│   └── levels/
│       └── LevelData.ts       # 关卡生成器：前 10 关手工精调关卡 + 11 关起无限伪随机战役（含小 Boss / 大 Boss 里程碑与防重叠油桶算法）
├── index.html                 # 根页面与首屏 UI 骨架
├── package.json               # 项目依赖与构建/部署脚本
├── tsconfig.json              # TypeScript 编译配置
└── vite.config.ts             # Vite 打包配置
```

---

## 四、后续开发常见修改指南

1. **调整关卡布局、倍增门、交互地形或障碍物数值**：
   - 前往 [`src/levels/LevelData.ts`](./src/levels/LevelData.ts) 修改 `ARCHETYPE_CONFIGS` 或特定关卡配置。
   - 交互地形（`speed_belt` 极速履带 / `jump_pad` 跃迁跳板 / `toxic_mire` 腐蚀毒沼 / `heal_sanctuary` 纳米圣域）与障碍物（移动防爆门、绞肉齿轮、电磁弹球柱、高爆等离子桶、侧翼异虫巢穴）的物理逻辑位于 [`src/game/World3D.ts`](./src/game/World3D.ts)。
2. **调整 7 大种族外观建模或新增种族**：
   - 前往 [`src/game/HumanoidModels.ts`](./src/game/HumanoidModels.ts) 查看 `RACE_VISUAL_CONFIGS` 与程序化几何生成函数。
3. **调整种族技能树倍率与成长公式**：
   - 前往 [`src/game/State.ts`](./src/game/State.ts) 查看 `SKILL_BRANCHES` 与各属性计算 Getter。
4. **发布新版本更新公告**：
   - 在 [`src/main.ts`](./src/main.ts) 中搜索 `PATCH_NOTES_VERSION`（当前为 `v3.6`），更新版本号与公告条目后，老玩家打开页面会自动弹出一次新版公告。
