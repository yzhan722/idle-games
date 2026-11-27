# Commercial Ops — 上线清单（三态）

> 生产：v0.41.8 · 2026-09-11  
> 状态：`已验证` = 本轮有证据 · `未做` = 仍缺 · `延期` = 明确不做直到条件满足  
> 进度：[milestone v0.41.2](https://github.com/yzhan722/mengling-idle/milestone/1) · [release](https://github.com/yzhan722/mengling-idle/releases/tag/v0.41.2) · 不要只在本表勾完当队列空

## CI / 质量门

| 项 | 状态 | 证据 |
|----|------|------|
| `node scripts/selfcheck.mjs` | 已验证 | 本地 2026-09-10 `selfcheck: OK`（含 cloud/newbie/restart） |
| `api-contract` / `items` / `analytics` / `daily_tasks` / `era` / `gameplay-fun` / `migrations` | 已验证 | 本轮均 OK |
| Playwright smoke | 已验证 | `playwright-smoke: OK` |
| Player sim 6h | 已验证 | `player-sim: 0 FAIL` seed=1 720 steps |
| GitHub Actions 全绿 | 已验证 | [#4](https://github.com/yzhan722/mengling-idle/issues/4) closed；PR #5 run 34499396136 |

## D1 迁移

| 项 | 状态 | 证据 |
|----|------|------|
| analytics / rate_limits / iap_orders remote apply | 已验证 | COMMERCIAL_OPS 原文：2026-07-15 `--remote`，tables 21 |
| 全量 `d1_schema.sql` wipe | 延期 | 禁止未授权清库 |
| `2026-11-26-account-deletions.sql` | 未做 | 已写未执行；注销接口上线前必须先应用，否则注销返回 500 且不删任何数据 |
| `migrations/009_token_version.sql`、`010_password_bumps_token_version.sql` | 未做 | 已写未执行，各跑一次，先 009 后 010；没跑时登录照旧可用，「退出所有设备」靠删会话，改密码不会让旧令牌失效 |

## IAP / 赞助

| 项 | 状态 | 证据 |
|----|------|------|
| 诚实桩（未配置不得伪造成功） | 已验证 | `iap_stub.purchase` → `provider_unconfigured`；e2e-smoke |
| 真商户 + `IAP_WEBHOOK_SECRET` + 履约 | 延期 | 见 `docs/IAP_DECISION.md`：v0.42 前不做真支付 |
| 设置页赞助 QR | 已验证 | index 支持开发者区块 |

## 写接口鉴权

| 项 | 状态 | 证据 |
|----|------|------|
| social/friends requireUser | 已验证 | api-contract-selfcheck |
| 氛围假人默认关 | 已验证 | `featureFlags.atmosphereFakes: false` |

## 版本与缓存

| 项 | 状态 | 证据 |
|----|------|------|
| 四处版本一致 | 已验证 | `0.41.8`：index/main/sw/config + health |
| 发版后清缓存 | 已验证 | `CACHE_VERSION` `mengling-v0.41.8`；SW JS `cache: no-store` |

## 部署

> 2026-11-26：线上历史部署公开过 `.env.local` 等文件，先按 [`docs/ops/LEAK_2026-11-26.md`](ops/LEAK_2026-11-26.md) 处置再发版。

| 项 | 状态 | 证据 |
|----|------|------|
| 生产 `GET /api/health` | 已验证 | 2026-09-11 version 0.41.8（氛围假人关） |
| live-health-smoke | 已验证 | health / ingest / events / dex / friends 全绿 |
| 双号 PvP e2e 生产 | 已验证 | `pvp-live-e2e: OK` inviteId=4 resultsSeen |
| 留存公开榜 | 已验证 | dex 真人 1 行、score 3；见 `docs/ops/RETENTION_BASELINE.md` |
| IAP 诚实桩（线上 catalog/webhook） | 已验证 | iap-ledger-selfcheck OK |

## 留存

| 项 | 状态 | 证据 |
|----|------|------|
| 公开榜真人基线 | 已验证 | dex 真人 1 行、score 3；`docs/ops/RETENTION_BASELINE.md` |
| D1 `analytics_events` 分事件计数 | 未做 | 代码已备：`GET /api/ops/retention?days=30`，头 `X-Ops-Key` = 环境变量 `OPS_ADMIN_KEY`（≥16 字符，未配置返回 501）；出分事件计数、按首次打开日期的新手完成率 / 次日 / 7 日、时长分桶。未部署、未配密钥 |

## 合规（ML-COM3）

| 项 | 状态 | 证据 |
|----|------|------|
| 隐私政策 / 用户协议 | 未做 | `legal/` 为草案，`modules/legal_status.js` 的 `LEGAL_DRAFT` 控制；主体、邮箱、管辖、年龄、保存期「待填」 |
| 账号注销 | 未做 | `POST /api/auth/delete` + 设置页两步确认；`account-delete-selfcheck` 进程内通过，未部署 |
| 匿名统计可关 | 未做 | 设置页开关；不带账号与 IP；默认关：草案期不问不记，正式版首次打开问一次；未部署 |
| 玩家交流管控 | 未做 | 只收好友私信（默认开）、屏蔽、举报（服务器截快照，存 90 天到期自动删）、昵称 / 播报屏蔽词（`modules/name_filter_words.js` 人工可增删）；人工处理举报：`GET /api/ops/reports?status=open`、`PUT /api/ops/reports {id, status: handled\|dismissed}`，头 `X-Ops-Key` = `OPS_ADMIN_KEY`（没配返回 404）；要先执行 `scripts/migrations/2026-11-27-social-safety.sql`；`social-safety-selfcheck` 进程内通过，未部署 |
