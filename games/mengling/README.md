# mengling-idle

《萌灵放置冒险》（idle）前端 + Cloudflare Pages Functions。

## 跑起来

- 静态页：直接开 `index.html`，或 Pages 部署本仓根目录
- 自检：`node scripts/selfcheck.mjs` · `node scripts/e2e-smoke.mjs`
- 自有数值 / 平衡自检（不开浏览器）：`node scripts/own-numbers-selfcheck.mjs` · `node scripts/own-balance-selfcheck.mjs`
- 账号注销 / 二周目提速自检（不开浏览器、不连库）：`node scripts/account-delete-selfcheck.mjs` · `node scripts/rebirth-speed-selfcheck.mjs --verbose`
- 登录安全 / 存档前向兼容 / 发布包 / 首屏预算自检（不开浏览器）：`node scripts/auth-security-selfcheck.mjs` · `save-forward-selfcheck.mjs` · `release-selfcheck.mjs` · `first-screen-selfcheck.mjs`
- 加删模块或首屏图之后：`node scripts/build-precache.mjs`（重写 `sw.js` 清单与 modulepreload）；体积：`node scripts/first-screen.mjs`
- 留存快照：`node scripts/retention-baseline.mjs`（真人留存看 `GET /api/ops/retention`，需 `OPS_ADMIN_KEY`）
- 屏蔽 / 举报 / 只收好友私信 / 昵称屏蔽词自检（不开浏览器、不连库）：`node scripts/social-safety-selfcheck.mjs`；举报人工处理看 `GET /api/ops/reports`（需 `OPS_ADMIN_KEY`）；屏蔽词表 `modules/name_filter_words.js` 人工可增删
- 线上巡检：
  - `node scripts/live-health-smoke.mjs`
  - `node scripts/pvp-live-e2e.mjs`（双号 invite→accept→result）
  - `node scripts/iap-ledger-selfcheck.mjs`（台账诚实桩；真商户需配置 `IAP_WEBHOOK_SECRET`）
- D1 迁移：`node scripts/apply-d1-migrations.mjs`（Prod 加 `--remote`，配置见 `scripts/wrangler.d1.toml`）
- 部署：`.\deploy.ps1`（需 `.env.local` Cloudflare 凭证；只上传 `scripts/stage-release.mjs` 白名单，发现不该公开的文件就中止）

## 文档

- 架构：`ARCHITECTURE.md`
- 上线清单：`docs/COMMERCIAL_OPS.md` · 首屏体积：`docs/PERF.md` · 泄露处置：`docs/ops/LEAK_2026-11-26.md`
- IAP 决策：`docs/IAP_DECISION.md`
- 素材来源：`ASSETS_LICENSE.md` · 改名清单：`docs/RENAME_CHECKLIST.md`
- 隐私政策 / 用户协议草案：`legal/`（`modules/legal_status.js` 的 `LEGAL_DRAFT` 控制）
- 乐趣记分：`PLAYER_FUN_SCORECARD.md`
- v0.41.2 发版说明：`docs/ops/RELEASE_v0.41.2.md`

## 进度跟踪（不要只写 markdown）

下一轮冲刺以 GitHub 为准，不要把未完成项只勾在 backlog 里当「队列空」。

- 生产：[v0.1.0](https://game.pokeauto.online/) live health 0.1.0（氛围假人关；乱码名不再映射 NPC 花名）
- 历史标签：[v0.41.2](https://github.com/yzhan722/mengling-idle/releases/tag/v0.41.2)
- Milestone：[v0.41.2](https://github.com/yzhan722/mengling-idle/milestone/1)
- `feat/era-chronicle` 已删：[#9](https://github.com/yzhan722/mengling-idle/issues/9)

## 版本

以 `index.html` / `main.js` / `sw.js` / `modules/config.js` 的 `v0.x.y` 为准，四处保持一致。当前生产是 0.1.0。
