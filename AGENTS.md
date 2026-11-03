# idle-games monorepo

七个游戏同仓分目录。改动只落在对应 `games/<name>/` 内，跨游戏改动才动 `packages/`。

- `games/xianxia`：dist 被跟踪；改动 `commit --no-verify + push + npx wrangler deploy -c deploy/wrangler.toml`；WET PAWS 许可仅限个人用途。
- `games/mob-control-3d`：波波应援团 3D（`https://mob-control.yinosites.com/`），构建与部署：`npm run build && npx wrangler deploy -c deploy/wrangler.toml`。
- `games/ar-survivor`：静态页 + wrangler.toml，部署 `npx wrangler deploy`。
- `games/paper-crane-detective`：Ren'Py AVG（原名 avg/《沉默侦探：千纸鹤的约定》）；引擎 SDK 不入库，本地需自备 `renpy-8.5.3-sdk`；`.rpyc`/`game/cache`/`dists` 已忽略。
- `games/cloud-isle-market`：Godot 4.3 项目，无 npm 构建。
- 提交信息沿用各游戏原有 conventional commit 风格。
