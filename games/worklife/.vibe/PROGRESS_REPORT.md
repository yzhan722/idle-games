# Progress Report — Issue #1 MVP Hardening

> 本文件是 Issue #1 的执行证据。旧 `.vibe/FINAL_ACCEPTANCE_REPORT.md`（2026-06-16）不作为本轮验收依据。
> 工作分支：`feat/progress-hardening`（不修改 `main`，不自动 merge）

---

## Phase 1 — Baseline（2026-09-02）

### Identity

| 项 | 值 |
|----|----|
| Commit SHA | `edf71e8fdace26e63380a4f271fc5b192c03e0c2` |
| Branch | `feat/progress-hardening` tracking `origin/feat/progress-hardening` |
| Node | v24.19.0 |
| npm | 11.17.0 |
| OS | Windows 10 (PowerShell) |
| vs `main` | 49 files, +2432 / −1185 (`git diff main...HEAD`) |

### Commands run (no product code changes)

```
npm install
cd backend && npm install
cd frontend && npm install
cd backend && npm run build
cd backend && npm test
cd backend && npm run test:integration
cd frontend && npm run build
docker compose config
```

Live checks (existing local servers, not started by this phase):

```
GET  http://localhost:3001/health
GET  http://localhost:3000/
POST /auth/guest → WS ws://localhost:3001/ws?token=…
```

### Results

| Check | Result | Evidence |
|-------|--------|----------|
| backend `npm run build` | **PASS** | `tsc -p tsconfig.json` exit 0 |
| backend `npm test` | **PASS** | 6 suites, **17 pass / 0 fail**, duration ~2.0s |
| backend `npm run test:integration` | **PASS** | 7/7: health, guest login, google bind 401/200, player state, start life action, simulate on refresh |
| frontend `npm run build` | **PASS** | `tsc -b && vite build` exit 0; 64 modules; Vite CJS deprecation warning only |
| `docker compose config` | **FAIL (environment)** | `docker` not installed / not on PATH. `docker-compose.yml` exists (db + backend + frontend). Not a product test skip — CLI missing on this agent host |
| frontend HTTP | **PASS** | `GET /` → 200, 1189 bytes |
| backend `/health` | **PASS** | `{"ok":true,"db":{"connected":true,"latencyMs":0}}` (file-backed memory store; `DATABASE_URL` unset) |
| guest login | **PASS** | integration smoke + WS guest token |
| guest state init | **PASS** | `/player/state` 200 with `inventory` |
| WebSocket | **PASS** | `WS_OPEN` on `/ws?token=` |

### Docs vs code (read, not assumed)

- Root `TODO.md` and `.kiro/specs/...` still claim “生产就绪 / 100%”. **Rejected as evidence.**
- `.vibe/TODO.md` TODO-01..13 all **PENDING**. This is the real hardening backlog.
- `.vibe/PROJECT_BRIEF.md` correctly notes: no CI, no E2E, file/memory fallback, 15s poll.
- `.kiro/specs/multi-class-idle-rpg/design.md` still describes Express. Implementation is Fastify 5.

### Confirmed gaps / defects (baseline; not yet fixed)

1. **No GitHub Actions CI.** Push/PR has no hard gate.
2. **No frontend test script / no Playwright E2E / no root `npm run verify`.** Issue #1 Phase 3–4 required.
3. **Docker cannot be validated here** (no Docker CLI). Compose file present; `docker compose build` not run.
4. **Two `npm run dev` backend processes** were already running on this machine (started 2026-09-01). Health `uptime` ~48936s. Port collision risk; not cleaned in Phase 1.
5. **npm audit**: root 15 vulns (1 low, 3 moderate, 9 high, 2 critical). Not investigated this phase.
6. **Automated coverage holes vs Issue #1 Phase 3:** equip/unequip, craft consumption, combat multi-hit + once-only reward, market cancel atomicity, party capacity/duplicate join, 500 error shape, auth path bypass, double-submit. Existing tests cover chat isolation, chop wood, market purchase, enhancement consume, memory persist — partial only.
7. **`.vibe/TODO.md` TODO-01..13 unverified.** Historical “PASS” reports must be re-proven.
8. **Rate-limit allowList** uses `req.url.startsWith("/health")` (`backend/src/index.ts`) while JWT public paths use Set.has. Trailing-query health is fine; prefix behavior on rate-limit is a Phase 2 audit item (TODO-03).

### Phase 1 Gate

Baseline recorded from this run. Failures listed above. **Entering Phase 2.**

---

## Phase 2 — Hardening TODO-01..12（2026-09-02）

### Verification

| Command | Result |
|---------|--------|
| `cd backend && npx tsc --noEmit` | PASS |
| `cd backend && npm run build` | PASS |
| `cd backend && npm test` | **37 pass / 0 fail** (was 17) |
| `cd frontend && npx tsc --noEmit` | PASS |
| `cd frontend && npm run build` | PASS |

### Fixes (real)

- Auth/rate-limit exact pathname (`http_public_path.ts`); `/health-evil` no longer rate-limit exempt.
- 500 body centralized in `mapThrownError`; durability/repair no longer echo `error.message`.
- SQL identifier whitelist for enhancement request columns.
- `simulateToNow` no longer advances `lastSimulatedAt` on sub-1s polls (14s chest crafts were stalling).
- `startLifeAction` stamps `lastSimulatedAt`.
- Memory `cancelTradingOrder` deletes the order before refunding.
- Equip rejects missing/unknown/wrong-slot items.
- Write-dedupe 409 retry no longer deadlocks on its own in-flight key.
- PG pool `max: 10`.

### TODO-01..12

See `.vibe/TODO.md`. TODO-13 remains PENDING until Phase 3/4.

### Still open for later phases

- No CI / `npm run verify` / Playwright E2E (Phase 3–4)
- Combat multi-hit + once-only reward not yet a dedicated test (Phase 3)
- Docker CLI missing on this host
- npm audit vulns unchanged

---

## Phase 3 — T1 automated loop（2026-09-02）

### Commands

```
cd backend && npm test
npx playwright test
```

### Results

| Check | Result |
|-------|--------|
| backend `npm test` | **38 pass / 0 fail** (added combat once-per-duration gold) |
| Playwright E2E | **4 passed** in 21.1s: guest bootstrap, T1 equip chest +8 DEF, persist reload, craft double-click → 1 POST `/actions/start` |
| Data isolation | E2E backend uses `e2e/.tmp-store.json` + `E2E_SEED=1` on ports 3100/3101 |

### Notes

- `/e2e/seed` exists only when `E2E_SEED=1`; production 404s it (route not registered).
- Incomplete life-action ticks no longer advance `lastSimulatedAt`, so 12s slime / 14s chest complete under 15s polling.

**Entering Phase 4.**

---

## Phase 4 — CI / verify（2026-09-02）

Added `.github/workflows/ci.yml`:

- Job `backend-and-frontend`: npm ci + backend build + backend test + frontend build. Hard fail.
- Job `e2e`: npm ci + Playwright Chromium + `npm run test:e2e`. Hard fail. No `continue-on-error`.
- npm cache enabled. No secrets in the workflow.

Root scripts: `npm test`, `npm run test:e2e`, `npm run verify`.

### Local `npm run verify` (Phase 4 gate)

Command: `npm run verify` on 2026-09-02, Node v24.19.0.

| Step | Result |
|------|--------|
| backend build | **PASS** |
| backend tests | **38 pass / 0 fail** |
| frontend build | **PASS** (Vite CJS deprecation warning only) |
| Playwright E2E | **4 passed / 0 fail**, ~15.5s |

No `continue-on-error`. Workflow contains no secrets.

**Entering Phase 5.**

---

## Phase 5 — T1 UX blockers（2026-09-02）

Checked desktop 1280×800 and mobile 375×812 against the Issue #1 playability list. Only Blocker/Major items were fixed.

### Blockers found and fixed

1. **≤480px action nav hid tab names** (`display:none` from the 900px icon-rail rule). Accessible names became 伐/木/冒…. Restored labels + `aria-label`.
2. **Collapsed character panel sat under the chat drawer** on 375px — T1 equip was not clickable. Character toggle is now a FAB above chat (`z-index: 90`) with `展开角色面板`.
3. **Craft/combat grids used `minmax(220px)` with `!important`**, which creates **zero columns** when the content pane is squeezed. Mobile now uses `repeat(2, minmax(0, 1fr))`.
4. **Theme layer overwrote mobile `padding-bottom`**, so the chat bar covered content. Restored bottom padding.
5. **Escape did not close craft/battle/equip modals**, trapping the overlay. Escape now dismisses them; 取消 still works.
6. **E2E suite exhausted `RATE_LIMIT_MAX=100/min`** on shared 127.0.0.1, emptying `/content` for later tests. Playwright webServer now sets `RATE_LIMIT_MAX=10000`.

### Verification

```
npx playwright test
```

**6 passed / 0 fail**, ~20.9s (E2E-01..04 + UX-01 desktop + UX-02 375px).

Minor leftover (not fixed): default tab is still 冒险; Google Fonts network noise; no Docker CLI on this host.

**Entering Phase 6.**

---

## Phase 6 — RC 最终验收（2026-09-02）

Fresh run (not copied from Phase 1–5 reports):

| 命令 | 结果 |
|------|------|
| `backend npx tsc --noEmit` | PASS |
| `frontend npx tsc --noEmit` | PASS |
| `backend npm run test:integration` | **7 passed / 0 failed** |
| `npm run verify` | PASS：backend build、**38 pass / 0 fail**、frontend build、Playwright **6 passed** |
| `docker compose config` | FAIL — Docker CLI missing on this host |

TODO-01..13 closed with evidence. `.vibe/FINAL_ACCEPTANCE_REPORT.md` rewritten for this SHA lineage.

**Release Blockers: 0. Recommendation: RC READY** (human review; do not merge `main` automatically).


