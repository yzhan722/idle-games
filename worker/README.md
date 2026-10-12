# kgnet-xianxia — Cloudflare Worker backend

Own backend for the game's online features (cloud saves, 江湖榜, save-share
previews), replacing the upstream `kittensgame.com` API and the local
`tools/mock-kgnet` dev server.

Storage is a single KV namespace; the trust model matches the mock — the
client-side telemetry `guid` (a random per-save UUID) is the capability token
for both saves and leaderboard rows.

## Endpoints

Same contract as `tools/mock-kgnet/server.js`:

| Method | Path                             | Purpose                                   |
|--------|----------------------------------|-------------------------------------------|
| GET    | `/user/`                         | Anonymous profile — flips client "online" |
| POST   | `/user/login/` `/user/logout/`   | Stubs (no real auth)                      |
| GET    | `/kgnet/save/`                   | Save snapshot (metadata only, no blobs)   |
| POST   | `/kgnet/save/upload/`            | Create/overwrite a save blob              |
| POST   | `/kgnet/save/update/`            | label / archived / shared flag            |
| GET    | `/kgnet/save/:guid/download/`    | Fetch own save blob                       |
| GET    | `/kgnet/jianghu/?guid=`          | 江湖榜 top 100 + `selfRank`                |
| POST   | `/kgnet/jianghu/submit/`         | Upsert own entry (30s per-guid throttle)  |
| POST   | `/kgnet/chiral/game/command/`    | Stub `{}`                                 |
| GET    | `/preview/:shareId`              | Crawler-facing OG page → game redirect    |
| GET    | `/preview/:shareId/card.svg`     | Embed card (境界/修为/轮回/业果)            |
| GET    | `/preview/:shareId/save/`        | Shared save blob, no session needed       |
| GET    | `/healthz`                       | Liveness                                  |

KV layout: `save:<guid>` (blob in value, row fields in metadata),
`share:<token>` → guid, `jh:<guid>` (whole entry in KV metadata so one
`list()` returns the full board — no read-modify-write races).

## Deploy

```sh
cd worker
npx wrangler login                                   # once
npx wrangler kv namespace create KGNET               # -> copy the "id" into wrangler.toml
npx wrangler kv namespace create KGNET --preview     # -> copy into "preview_id" for wrangler dev
npx wrangler deploy                                  # -> prints https://kgnet-xianxia.<sub>.workers.dev
```

Then point the game at it — edit `../server.json`:

```json
"kgnetUrl": "https://kgnet-xianxia.<your-subdomain>.workers.dev"
```

and set the human-facing redirect target in `wrangler.toml`:

```toml
[vars]
GAME_URL = "https://<where-the-game-is-hosted>/"
# Optional hardening once the game origin is known:
ALLOWED_ORIGINS = "https://<game-origin>"   # credentialed CORS allowlist; empty = reflect any origin
# UPLOAD_THROTTLE_MS = "3000"               # per-guid save upload floor (default 3000)
```

Redeploy (`npx wrangler deploy`) after changing vars.

Note: the upload throttle and the Jianghu submit throttle are isolate-scoped —
two requests landing on different edge colos can both pass inside the window.
Good enough against button-mashing and casual spam; strict global limiting
would need a Durable Object, which is overkill for a test launch.

## Local dev

```sh
npx wrangler dev            # serves on :8787 with local KV emulation
```

Local gameplay keeps using `tools/mock-kgnet` on `:7780` (see
`game.js#getServerUrl`) — no worker needed for save/榜 development unless you
explicitly want to test against this one.

## Notes

- CORS reflects the request origin with credentials allowed — the client sends
  `xhrFields: { withCredentials: true }`.
- No real auth by design (mock parity). Anyone holding a save's `guid` can
  read/overwrite it — acceptable for a test build, not for real accounts.
- The `/mock/fail/:status` failure-injection endpoints from the dev mock are
  intentionally not replicated.
- Leaderboard entries self-report stats; treat rankings as honor-system.
