# idle-games monorepo

五个放置游戏同仓分目录。改动只落在对应 `games/<name>/` 内，跨游戏改动才动 `packages/`。

- `games/xianxia`：dist 被跟踪；改动 `commit --no-verify + push + npx wrangler deploy -c deploy/wrangler.toml`；WET PAWS 许可仅限个人用途。
- `games/mob-control-3d`：波波应援团 3D（`https://mob-control.yinosites.com/`），构建与部署：`npm run build && npx wrangler deploy -c deploy/wrangler.toml`。
- `games/cloud-isle-market`：Godot 4.3 项目，无 npm 构建。
- 提交信息沿用各游戏原有 conventional commit 风格。
