# idle-games monorepo

八个项目同仓分目录。改动只落在对应 `games/<name>/` 内，跨游戏改动才动 `packages/`。

## 定时循环迭代唯一任务源（Mandatory Loop Roadmap）

- **全仓 8 款项目拓展任务单**：[`EXPANSION_ROADMAP.md`](./EXPANSION_ROADMAP.md)（共 26 个原子拓展里程碑）。
- 每小时定时循环任务唤醒时，**必须优先读取 `EXPANSION_ROADMAP.md`**，按批次每轮聚焦深耕 **1～2 个未完成（`[ ]`）的拓展子模块**，走完「原地编码 → 构建与自动化测试 → 真机视口截图 + `read_file` 多模态自审 → 勾选 `[x]` → 全量回归找 Bug → `git commit & git push`」完整闭环。

## 各子项目约定

- `games/xianxia`：dist 被跟踪；改动 `commit --no-verify + push + npx wrangler deploy -c deploy/wrangler.toml`；WET PAWS 许可仅限个人用途。
- `games/mob-control-3d`：波波应援团 3D（`https://mob-control.yinosites.com/`），构建与部署：`npm run build && npx wrangler deploy -c deploy/wrangler.toml`。
- `games/ar-survivor`：静态页 + wrangler.toml，部署 `npx wrangler deploy`。
- `games/paper-crane-detective`：Ren'Py AVG（原名 avg/《沉默侦探：千纸鹤的约定》）；引擎 SDK 不入库，本地需自备 `renpy-8.5.3-sdk`；`.rpyc`/`game/cache`/`dists` 已忽略。
- `games/cloud-isle-market`：Godot 4.3 项目，无 npm 构建，修改后必须运行 `./run_godot.ps1 --headless --self-test` 并审视 `preview_live_godot.png`。
- `games/world-history-atlas`：纯静态博物历史地图（Natural Earth 50m `<svg>` 地理底图与古典墨线折线图为原生核心载体），严守 `games/world-history-atlas/GEMINI.md` 七大铁律（100% 确定性真实史实、纯粹主权国家/王朝实体、克制内敛不张扬），每次改动必须运行 `python tools/verify_project.py` 确保 `ALL CHECKS PASSED` 并执行浏览器视口截图自审。
- 提交信息沿用各游戏原有 conventional commit 风格。
