# 波波应援团：蒸汽工坊 3D

基于 **Three.js + TypeScript + Vite + Cloudflare Workers** 构建的暖阳蒸汽工坊 Q 萌倍增应援对战 3D Web 游戏，包含 **7 大甜点萌宠应援种族**（波波族 / 布丁族 / 兔耳族 / 喵喵族 / 云朵族 / 曲奇族 / 招财族）、**GPU Instanced 果冻高光与弹性跳跃着色器**、**白黄铜蒸汽泡泡炮与双马尾偶像应援少女**、**晴空蒸汽朋克工坊小镇与红砖大齿轮厂房门楼**、**织物悬挂倍增横幅 + 4 类交互地形 + 5 类工坊机关**、**全局暖米色圆角金棕描边 + 立体绿按钮 UI** 以及 **Cloudflare KV 每周排行榜**（关卡榜 / 时长榜，每周一重置，空位由标明「陪练」的机器人补上）。

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
| **排行榜 KV Namespace ID** | `af83ba38768c492cadeb533506916826`（存储 Key：`real_players_weekly_w<周序号>`，14 天过期） |
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
- **`GET /api/leaderboard`**：读取本周前 10 关卡榜（`top10`）与时长榜（`activeTop10`）。只给昵称、成绩、皮肤与 `publicId`，不给玩家编号、密钥哈希和更新时间。
- **`POST /api/leaderboard`**：上报本周成绩：
  ```json
  {
    "playerId": "cmd_xxxxxx",
    "writeKey": "64 位十六进制，只随 POST 发送",
    "name": "玩家昵称",
    "bestStage": 25,
    "totalKills": 3850,
    "playTimeSeconds": 4200,
    "skinName": "海盐汽水糖",
    "badgeColor": "#25c4f8"
  }
  ```
  - 服务端只存 `writeKey` 的哈希：首次写入绑定，之后核对。响应里多 `accepted`、`reason`、`selfPublicId`。
  - `reason`：`key_mismatch`（编号已绑别的密钥）、`key_required`（旧客户端写已绑定的行）、`bad_key`、`too_fast`（同一行 5 秒内）、`busy`（每分钟新行超过 30，按实例计；或 KV 读写失败）、`empty`。客户端收到 `too_fast` / `busy` / `key_mismatch` 会补发一次（6 秒 / 65 秒 / 1.5 秒后）。
  - 上限：关卡 999；本周时长 ≤ 本周已过时间 + 1 小时；击退数 ≤ 时长 × 100 + 5000。
  - 昵称过 [`src/game/nameBlocklist.mjs`](./src/game/nameBlocklist.mjs) 词表（前端改名与 Worker 共用 `nameFilter.mjs`）：写入命中存成默认名「应援团长NNNN」，KV 里的旧昵称读出时打码。词表人工增删。
- **`POST /api/leaderboard/report`**：`{ writeKey, publicId, reason }`，`reason` 为 `insult` / `sexual` / `hate` / `impersonation` / `other`。只认本周在榜的写入密钥；同一人同一行只算一次（`duplicate`），每人同时最多 10 条（`limit`），每实例每分钟 20 条（`busy`）。KV 键 `name_reports_v1`，最多 200 行（满了先挤掉最早的、人数没到的，管理员隐藏的不挤），最后一次举报或处理后 30 天删。3 个不同玩家举报后该行昵称显示默认名，直到人工处理；举报绑定被举报时的昵称（存哈希），改名后不再隐藏。已知风险：一人多号可凑够 3 人；单键读改写并发会丢举报。
- **`GET / POST /api/leaderboard/reports`**（管理）：要 Worker 密钥 `LEADERBOARD_ADMIN_KEY`（16 位以上，`npx wrangler secret put LEADERBOARD_ADMIN_KEY -c deploy/wrangler.toml`），请求头 `Authorization: Bearer <密钥>`；没配或不对一律 404。GET 列出举报（含原名），POST `{ publicId, action: "clear" | "hide" }` 恢复或继续隐藏。
  - 旧客户端不带密钥仍可写没绑定的行；旧行第一次带密钥写入时绑定。

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
│   ├── style.css              # 全局 UI 样式、响应式布局（PC/移动端自适应）、3D 世界浮标样式
│   ├── audio/
│   │   └── SoundManager.ts    # Web Audio API 纯程序化合成音效与动态危机感 BGM 引擎（零外部音频依赖）
│   ├── game/
│   │   ├── CombatTables.ts    # 战斗数值表（波波兵 / 敌人属性、种族自动技能），不依赖 Three.js
│   │   ├── Leaderboard.ts     # 周榜排序（真人在前、陪练补位）、写入密钥与分享编号
│   │   ├── world/             # 从 World3D 搬出的赛道常量、扭蛋头饰几何
│   │   ├── World3D.ts         # 核心 3D 战场引擎（抽象类）：全部字段、主战役、单位 Instanced 渲染、物理碰撞、地形机关、Boss 战与景观
│   │   ├── modes/             # 10 个独立模式的方法（从 World3D 原样搬出，一级级继承，只有方法没有字段）
│   │   ├── World3DFull.ts     # 继承链末端，main.ts 用它建世界；新拆出的模式接在这里
│   │   ├── World3DSelfChecks.ts # MC-1～MC-18 引擎内自检（单独 chunk，只有 webdriver 下才加载，给 auto_playtest.py 用）
│   │   ├── HumanoidModels.ts  # 7 大应援种族程序化模型生成器（放样轮廓、倒角与 GPU 顶点动画）
│   │   ├── SceneThemes.ts     # 环境主题 + 自定义 GLSL Shader（海面、瀑布、护盾、厂房大门）
│   │   ├── State.ts           # 游戏存档状态管理（localStorage 持久化、7 大种族技能树数值计算、兵种 / 领队 / 大机偶进化）
│   │   └── SkillIcons.ts      # 技能树与种族矢量 SVG 图标库
│   ├── legal/                 # 隐私说明 / 用户协议（草案，开关 LEGAL_DRAFT）
│   └── levels/
│       ├── CampaignCurve.ts   # 主战役难度曲线（纯函数）
│       └── LevelData.ts       # 关卡生成器：1 关起无限伪随机战役（含小 Boss / 大 Boss 里程碑与防重叠油桶算法）
├── index.html                 # 根页面与首屏 UI 骨架
├── package.json               # 项目依赖与构建/部署脚本
├── tsconfig.json              # TypeScript 编译配置
└── vite.config.ts             # Vite 打包配置
```

---

## 四、后续开发常见修改指南

1. **调整关卡布局、倍增门、交互地形或障碍物数值**：
   - 前往 [`src/levels/LevelData.ts`](./src/levels/LevelData.ts) 主战役每一关都由 `generateDynamicLevel` 按关号生成（没有手工关），难度曲线在 [`src/levels/CampaignCurve.ts`](./src/levels/CampaignCurve.ts)；各花样模式是同文件里的 `generate*Level`。
   - 交互地形（`speed_belt` 极速履带 / `jump_pad` 跃迁跳板 / `toxic_mire` 黏滞油污 / `heal_sanctuary` 应援舞台）与障碍物（滑动闸门、齿轮、弹球柱、礼花桶、侧翼哨站）的物理逻辑位于 [`src/game/World3D.ts`](./src/game/World3D.ts)。
2. **调整 7 大种族外观建模或新增种族**：
   - 前往 [`src/game/HumanoidModels.ts`](./src/game/HumanoidModels.ts) 查看 `RACE_VISUAL_CONFIGS` 与程序化几何生成函数。
3. **调整种族技能树倍率与成长公式**：
   - 前往 [`src/game/State.ts`](./src/game/State.ts) 查看 `SKILL_BRANCHES` 与各属性计算 Getter。
4. **发布新版本更新公告**：
   - 在 [`src/main.ts`](./src/main.ts) 中搜索 `PATCH_NOTES_VERSION`（当前为 `v3.6`），更新版本号与公告条目后，老玩家打开页面会自动弹出一次新版公告。
