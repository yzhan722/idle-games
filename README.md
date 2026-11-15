# idle-games

放置类游戏 monorepo。各游戏独立构建、独立部署；`packages/` 放跨游戏共享代码。

## 项目地图

| 目录 | 游戏 | 技术栈 | 来源仓库 | 历史 |
|---|---|---|---|---|
| `games/mengling` | 萌灵 idle（宝可梦放置前端） | JS / Cloudflare Pages | `mengling-idle` | subtree 全量 |
| `games/xianxia` | 凡人修仙传放置（Kittens Game mod） | JS / Cloudflare Workers+Pages | `kittensgame-xianxia` | subtree 全量 |
| `games/cloud-isle-market` | 云屿小集（桌面挂机经营） | Godot 4.3 / GDScript | `cloud-isle-market`（旧本地名 maple-isle-idle） | subtree 全量 |
| `games/worklife` | WorkLife 多职业放置 RPG | TS / React + Fastify | `worklife` | 快照压平（旧历史封存于原仓） |
| `games/mob-control-3d` | 波波应援团：蒸汽糖果工坊（3D Pixar 倍增闯关放置） | TS / Three.js + Canvas 2.5D / Vite / Cloudflare Workers+Assets | 本地直建 `mob-control-3d` | 全量源码与精模资产 |
| `games/ar-survivor` | AR 幸存者（网页割草） | JS / Cloudflare Workers+Assets | 本地直建 `ar-survivor`（原先无 git） | 快照 |
| `games/paper-crane-detective` | 沉默侦探：千纸鹤的约定（校园推理 AVG） | Ren'Py 8.5.3 / .rpy | 本地 `avg/` 改名迁入（原先无 git） | 快照（不含引擎 SDK） |
| `games/world-history-atlas` | 世界历史疆域演化沙盒（BC 3000～AD 2026 博物历史图志） | HTML5 / Natural Earth 50m SVG / Vanilla ES6 | 本地 `apps/world-history-atlas` 迁入 | 快照（含全量编年史与校验器） |

## 共享包

- `packages/idle-core`（规划中）：tick 循环、离线收益、数值缓冲、存档、大数字格式化、成就/声望——mengling / worklife / xianxia 通用放置内核。

## 约定

- 各游戏自己的 `package.json` / `wrangler.toml` / `project.godot` 自治，互不干涉。
- `games/xianxia` 沿用原约定：`dist/` 被跟踪，改动 `git commit --no-verify && git push && npx wrangler deploy -c deploy/wrangler.toml`。
- `games/xianxia` 为 Kittens Game mod，WET PAWS 许可仅限个人/教育用途，**不得将其代码或其衍生用于商业分发**；与其他子项目的代码边界保持清晰。
- 新增大型美术资产（>500KB 图片/音频）优先考虑 Git LFS。

## 旧仓库

原 GitHub 仓库保留为只读归档（历史与 issue 不迁移）。
