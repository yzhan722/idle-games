import { ensureProgression } from "./progression_state";
import { createPgCircles } from "./circle_pg";
import {
  applyPlayerCommand,
  commandOperationHash,
  commandRevision,
  PlayerCommandConflict,
  PlayerCommandOperationMismatch,
  type PlayerCommand,
  type PlayerCommandReceipt,
} from "./player_commands";
import { Pool } from "pg";
import { hasEnhancementSkill } from "./enhancement_utils";
import { migratePlayerCurves } from "./curve_migration";
import type {
  UserRecord,
  EnhancedPlayerState,
  Party,
  EnhancementServiceRequest,
  EnhancementProvider,
  PriceHistory,
} from "./types";
import type { MarketQuote, Storage, TradeRecord, TradingOrder } from "./storage";
import { DELETED_ACCOUNT_ID, TOMBSTONE_DAYS } from "./account_deletion";
import { TRADE_KEEP_PER_ITEM, TRADE_KEEP_PER_PAIR_DAY } from "./market_price";
import {
  addMembership,
  membershipKeyForSend,
  membershipKeys,
  payloadChannel,
} from "./chat_channels";
import { worldAnnouncements } from "./world_announce";
import { METRICS_KEEP_DAYS, utcDay, type MetricEvent, type StateChange, type StateObserver } from "./retention_metrics";
import { maskAccountName, shownName } from "./display_name";
import { maskChatText } from "./name_filter";
import {
  CHAT_BLOCK_MAX,
  REPORT_DEDUPE_HOURS,
  REPORT_KEEP_DAYS,
  createChatRing,
  privateKey,
  reportGate,
  reportRingKey,
  type ChatLine,
  type ChatReport,
} from "./chat_moderation";
import { SYSTEM_DEVICES, createRankCache, rankName, rankScores, type RankBoard, type RankScores } from "./leaderboard";
import { WS_SESSION_REVOKED, createSocketRegistry, socketFromWsConnection } from "./ws_socket";
import {
  appendLog,
  defaultEnhancedPlayerState,
  normalizeInv,
  simulateToNow,
  startLifeActionNow,
  UsernameTaken,
} from "./storage";
import { enhancementRequestUserColumn } from "./sql_identifiers";
import { randomUUID } from "crypto";
import {
  validateItemQuantity,
  applyAwardSkillExperience,
  computeEnhancementInfo,
  applyEnhanceEquipment,
  validateEnhancementServiceCreation,
  computeDurabilityInfo,
  applyRepairEquipment,
  applyReduceDurability,
  computeActiveSetBonuses,
  computeEquipmentStats,
  computeItemPriceTrend,
  validatePartyActivityTarget,
  snapshotMemberBaseline,
  settlePartyActivityMemberStates,
  validateTradingOrderInput,
  applyTradingOrderEscrow,
  applyTradeSettlement,
} from "./storage_domain";

export async function createPgStorage(databaseUrl: string): Promise<Storage> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  /**
   * blocked：这个人屏蔽的人，连上时从 chat_blocks 读进来，改名单时同步。
   * blockedLoaded 之前（库还没读完）别人的发言先压在 held 里，读完再按名单放行，免得被屏蔽的人钻这几毫秒的空子。
   */
  type WsConn = {
    socket: any;
    channels: Set<string>;
    blocked: Set<string>;
    blockedLoaded: boolean;
    held: Array<{ from: string; text: string; onSent?: () => void }>;
  };
  /** 名单没读完时最多压几条；再多的丢掉（连上的头几毫秒，正常到不了）。 */
  const HELD_MAX = 50;
  const wsConnections = new Map<string, WsConn>();
  /** 每个频道最近几条，只在内存里，举报取证用。 */
  const chatRing = createChatRing();
  const sockets = createSocketRegistry();
  const channelMembers = new Map<string, Set<string>>();

  /** 把 from 说的话发给 c：屏蔽了 from 的收不到；名单还没读完先压着。真发出去了才调 onSent。 */
  function deliverFrom(c: WsConn, from: string, text: string, onSent?: () => void) {
    if (!c.blockedLoaded) {
      if (c.held.length < HELD_MAX) c.held.push({ from, text, onSent });
      return;
    }
    if (c.blocked.has(from)) return;
    onSent?.();
    if (c.socket && typeof c.socket.send === "function") {
      try {
        c.socket.send(text);
      } catch {}
    }
  }

  function releaseHeld(c: WsConn) {
    c.blockedLoaded = true;
    const held = c.held.splice(0);
    for (const h of held) deliverFrom(c, h.from, h.text, h.onSent);
  }

  /** from：发言人；屏蔽了他的人收不到。 */
  function broadcast(channel: string, msg: unknown, from?: string) {
    const members = channelMembers.get(channel);
    if (!members) return;
    const text = JSON.stringify(msg);
    for (const uid of members) {
      const c = wsConnections.get(uid);
      if (!c) continue;
      if (from) {
        deliverFrom(c, from, text);
        continue;
      }
      if (c.socket && typeof c.socket.send === "function") {
        try {
          c.socket.send(text);
        } catch {}
      }
    }
  }

  const nowIso = () => new Date().toISOString();

  function notifyUser(userId: string, payload: Record<string, unknown>) {
    const c = wsConnections.get(userId);
    if (c?.socket && typeof c.socket.send === "function") {
      try {
        c.socket.send(JSON.stringify({ type: "notify", ts: nowIso(), ...payload }));
      } catch {}
    }
  }

  async function patchMemberOnline(userId: string, isOnline: boolean) {
    try {
      await pool.query(
        `UPDATE parties SET members = (
           SELECT jsonb_agg(CASE WHEN m->>'userId' = $2 THEN m || $3::jsonb ELSE m END)
           FROM jsonb_array_elements(members) m
         )
         WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(members) m WHERE m->>'userId' = $2)`,
        [userId, userId, JSON.stringify({ isOnline })],
      );
    } catch {}
  }

  async function txJoinParty(client: any, userId: string, partyId: string): Promise<Party> {
    const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
    if (!partyResult.rows[0]) throw new Error("party_not_found");
    const party = partyResult.rows[0];
    const members = party.members as any[];

    if (members.length >= 6) throw new Error("party_full");
    if (members.some((m: any) => m.userId === userId)) throw new Error("already_in_party");

    members.push({ userId, role: "member", joinedAt: nowIso(), isOnline: wsConnections.has(userId) });
    await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);

    const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
    if (st.partyState) throw new Error("already_in_party");
    st.partyState = { partyId, role: "member", isLeader: false, joinedAt: nowIso() };
    appendLog(st, `加入队伍：${partyId}`);
    await txPersistState(client, userId, st, contentVersion);

    return { id: partyId, leaderId: party.leader_id, members, createdAt: party.created_at.toISOString() } as Party;
  }

  let stateObserver: StateObserver | null = null;
  function notifyState(change: StateChange) {
    try {
      stateObserver?.(change);
    } catch (err) {
      console.error("[metrics] observer failed:", err);
    }
  }

  // ---- 真人榜（leaderboard.ts）：分数变了才写 player_rankings，写在存档提交之后，失败不影响存档 ----
  const RANK_COLUMN: Record<RankBoard, string> = { total: "total_level", combat: "combat_level", zone: "zone_score" };
  const rankCache = createRankCache({
    async top(board, limit) {
      const col = RANK_COLUMN[board];
      const { rows } = await pool.query(
        `SELECT r.user_id, r.name, r.score, u.username
           FROM (SELECT user_id, name, ${col} AS score FROM player_rankings WHERE ${col} > 0 ORDER BY ${col} DESC, user_id LIMIT $1) r
           JOIN users u ON u.id = r.user_id
          ORDER BY r.score DESC, r.user_id`,
        [limit],
      );
      return rows.map((r) => ({ userId: r.user_id, name: maskAccountName(r.name, r.username), score: Number(r.score) }));
    },
    async countAbove(board, score) {
      const { rows } = await pool.query(`SELECT count(*) AS n FROM player_rankings WHERE ${RANK_COLUMN[board]} > $1`, [score]);
      return Number(rows[0]?.n ?? 0);
    },
  });
  /** 上次写进表里的内容；没变就不写。只是省写，丢了也只是多写一次。 */
  const rankWritten = new Map<string, string>();
  const rankPending = new Map<string, RankWrite>();
  const rankWriting = new Set<string>();

  /** 一行榜单内容；null = 不上榜。 */
  type RankWrite = (RankScores & { name: string }) | null;
  function rankWriteOf(state: EnhancedPlayerState): RankWrite {
    const name = rankName(state);
    const scores = name ? rankScores(state) : null;
    return name && scores ? { name, ...scores } : null;
  }

  /** 系统账号不进榜；账号已注销时 users 里没有这一行，什么都不会写。 */
  async function insertRanking(userId: string, row: NonNullable<RankWrite>, onConflict: string): Promise<void> {
    await pool.query(
      `INSERT INTO player_rankings (user_id, name, total_level, combat_level, zone_score, updated_at)
       SELECT u.id, $2, $3, $4, $5, now() FROM users u
        WHERE u.id = $1
          AND (u.guest_device_id IS NULL
               OR (left(u.guest_device_id, length($6::text)) <> $6 AND u.guest_device_id <> $7))
       ON CONFLICT (user_id) ${onConflict}`,
      [userId, row.name, row.total, row.combat, row.zone, SYSTEM_DEVICES.prefix, SYSTEM_DEVICES.exact],
    );
  }

  async function writeRanking(userId: string, row: RankWrite): Promise<void> {
    const key = row ? `${row.name}\n${row.total}\n${row.combat}\n${row.zone}` : "";
    if (rankWritten.get(userId) === key) return;
    if (row) {
      await insertRanking(
        userId,
        row,
        `DO UPDATE SET
           name = EXCLUDED.name, total_level = EXCLUDED.total_level, combat_level = EXCLUDED.combat_level,
           zone_score = EXCLUDED.zone_score, updated_at = now()`,
      );
    } else {
      await pool.query("DELETE FROM player_rankings WHERE user_id = $1", [userId]);
    }
    if (rankWritten.size > 20_000) rankWritten.clear();
    rankWritten.set(userId, key);
  }

  /** 同一玩家一次只写一条，连续多次保存只写最后一次。 */
  async function syncRanking(userId: string, state: EnhancedPlayerState): Promise<void> {
    try {
      // 马上算好：调用方之后还会接着改同一个对象，没存下的内容不能进榜
      rankPending.set(userId, rankWriteOf(state));
    } catch (err) {
      console.error("[leaderboard] bad state:", err);
      return;
    }
    if (rankWriting.has(userId)) return;
    rankWriting.add(userId);
    try {
      for (let next = rankPending.get(userId); next !== undefined; next = rankPending.get(userId)) {
        rankPending.delete(userId);
        await writeRanking(userId, next);
      }
    } catch (err) {
      rankPending.delete(userId);
      rankWritten.delete(userId);
      console.error("[leaderboard] write failed:", err);
    } finally {
      rankWriting.delete(userId);
    }
  }

  /**
   * 补一遍老存档，只做一次，做完记在 data_backfills 里；中途重启就从头再补（已有的行不动）。
   * 补的同时玩家可能正在存档：只插没有的行，不盖掉刚存下的新分数；某个人刚好注销只跳过他。
   */
  async function backfillRankings(): Promise<void> {
    const done = await pool.query("SELECT 1 FROM data_backfills WHERE name = $1", ["player_rankings"]);
    if (done.rows[0]) return;
    let after = "00000000-0000-0000-0000-000000000000";
    let failed = false;
    for (;;) {
      const { rows } = await pool.query(
        `SELECT user_id, jsonb_build_object('curveVersion', state_json->'curveVersion', 'settings', state_json->'settings',
                  'skills', state_json->'skills', 'combatSkills', state_json->'combatSkills',
                  'combatLevel', state_json->'combatLevel', 'stats', state_json->'stats') AS state
           FROM player_states
          WHERE user_id > $1 AND COALESCE(state_json->'settings'->>'playerName', '') <> ''
          ORDER BY user_id LIMIT 200`,
        [after],
      );
      for (const r of rows) {
        let row: RankWrite = null;
        try {
          // 与读存档同一套换算，等级才和之后保存时一致
          migratePlayerCurves(r.state as EnhancedPlayerState);
          row = rankWriteOf(r.state as EnhancedPlayerState);
        } catch (err) {
          console.error("[leaderboard] backfill skipped a save:", err);
        }
        if (!row) continue;
        try {
          await insertRanking(r.user_id, row, "DO NOTHING");
        } catch (err) {
          // 23503：这一刻刚好注销
          if ((err as { code?: string }).code !== "23503") {
            failed = true;
            console.error("[leaderboard] backfill failed for one player:", err);
          }
        }
      }
      if (rows.length < 200) break;
      after = rows[rows.length - 1].user_id;
      // 让一让正常请求
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!failed) await pool.query("INSERT INTO data_backfills (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", ["player_rankings"]);
  }

  const userLocks = new Map<string, Promise<unknown>>();
  function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = userLocks.get(userId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    userLocks.set(
      userId,
      next
        .catch(() => {})
        .finally(() => {
          if (userLocks.get(userId) === next) userLocks.delete(userId);
        }),
    );
    return next;
  }

  async function init() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guest_device_id TEXT UNIQUE,
        google_sub TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_resume_token_hash TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32)");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL",
    );
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1");
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_guest_resume_token_hash_key ON users (guest_resume_token_hash)",
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_states (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        content_version TEXT NOT NULL,
        state_json JSONB NOT NULL,
        version BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("ALTER TABLE player_states ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trade_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL,
        seller_id UUID NOT NULL,
        item_id TEXT NOT NULL,
        quantity INT NOT NULL,
        total_price INT NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id BIGSERIAL PRIMARY KEY,
        item_id TEXT NOT NULL,
        record_date DATE NOT NULL,
        average_price NUMERIC(10,2) NOT NULL,
        min_price INT NOT NULL,
        max_price INT NOT NULL,
        volume INT NOT NULL DEFAULT 0,
        UNIQUE(item_id, record_date)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leader_id UUID NOT NULL REFERENCES users(id),
        name TEXT,
        members JSONB NOT NULL DEFAULT '[]',
        current_activity JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enhancement_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL,
        provider_id UUID NOT NULL,
        item_id TEXT NOT NULL,
        target_level INT NOT NULL,
        service_fee INT NOT NULL DEFAULT 0,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        response_message TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trading_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        item_id TEXT NOT NULL,
        quantity INT NOT NULL,
        price INT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('sell', 'buy')),
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_command_receipts (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_id TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        result JSONB NOT NULL,
        state_revision BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, operation_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_deletions (
        user_id UUID PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_trade_history_buyer ON trade_history(buyer_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_trade_history_seller ON trade_history(seller_id)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_rankings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        total_level INT NOT NULL,
        combat_level INT NOT NULL,
        zone_score INT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_backfills (
        name TEXT PRIMARY KEY,
        done_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_player_rankings_total ON player_rankings(total_level DESC, user_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_player_rankings_combat ON player_rankings(combat_level DESC, user_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_player_rankings_zone ON player_rankings(zone_score DESC, user_id)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics_daily (
        day DATE NOT NULL,
        event TEXT NOT NULL,
        count BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (day, event)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_blocks (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, blocked_user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_reports (
        id UUID PRIMARY KEY,
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        channel TEXT NOT NULL,
        snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_chat_reports_created ON chat_reports(created_at)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter ON chat_reports(reporter_id, created_at)");
    // 同好会（circle.ts，迁移 008_circles.sql）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS circles (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL,
        doc JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_circles_name_key ON circles(name_key)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_circles_doc ON circles USING GIN (doc jsonb_path_ops)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS circle_members (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id)");
    void backfillRankings().catch((err) => console.error("[leaderboard] backfill failed:", err));
  }

  async function getCommandReceipt(userId: string, operationId: string): Promise<PlayerCommandReceipt | undefined> {
    const { rows } = await pool.query(
      "SELECT operation_id, request_hash, result, state_revision, created_at FROM player_command_receipts WHERE user_id = $1 AND operation_id = $2",
      [userId, operationId],
    );
    const r = rows[0];
    if (!r) return undefined;
    return {
      operationId: r.operation_id,
      requestHash: r.request_hash,
      result: r.result,
      stateRevision: Number(r.state_revision),
      createdAt: (r.created_at as Date).toISOString(),
    };
  }

  const USER_COLS =
    "id, guest_device_id, google_sub, created_at, guest_resume_token_hash, username, password_hash, auth_version";
  function mapUser(r: any): UserRecord {
    return {
      id: r.id,
      guestDeviceId: r.guest_device_id,
      googleSub: r.google_sub,
      createdAt: r.created_at.toISOString(),
      guestResumeTokenHash: r.guest_resume_token_hash ?? null,
      username: r.username ?? null,
      passwordHash: r.password_hash ?? null,
      authVersion: r.auth_version ?? 1,
    };
  }

  async function findOrCreateGuestUser(deviceId: string): Promise<UserRecord> {
    const existing = await pool.query("SELECT " + USER_COLS + " FROM users WHERE guest_device_id = $1", [deviceId]);
    if (existing.rows[0]) return mapUser(existing.rows[0]);
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES (gen_random_uuid(), $1) RETURNING " + USER_COLS,
      [deviceId],
    );
    if (!created.rows[0]) {
      const again = await pool.query("SELECT " + USER_COLS + " FROM users WHERE guest_device_id = $1", [deviceId]);
      return mapUser(again.rows[0]);
    }
    return mapUser(created.rows[0]);
  }

  async function createGuestUser(): Promise<UserRecord> {
    const id = randomUUID();
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES ($1, $2) RETURNING " + USER_COLS,
      [id, `guest_${id}`],
    );
    return mapUser(created.rows[0]);
  }

  async function getUser(userId: string): Promise<UserRecord | null> {
    const found = await pool.query("SELECT " + USER_COLS + " FROM users WHERE id = $1", [userId]);
    return found.rows[0] ? mapUser(found.rows[0]) : null;
  }

  async function setGuestResumeTokenHash(userId: string, hash: string): Promise<void> {
    const updated = await pool.query("UPDATE users SET guest_resume_token_hash = $2 WHERE id = $1", [userId, hash]);
    if (updated.rowCount !== 1) throw new Error("user_not_found");
  }

  async function findUserByResumeTokenHash(hash: string): Promise<UserRecord | null> {
    const found = await pool.query("SELECT " + USER_COLS + " FROM users WHERE guest_resume_token_hash = $1", [hash]);
    return found.rows[0] ? mapUser(found.rows[0]) : null;
  }

  async function getOrCreatePlayerState(userId: string, contentVersion: string): Promise<EnhancedPlayerState> {
    const existing = await pool.query("SELECT state_json, version FROM player_states WHERE user_id = $1", [userId]);
    if (existing.rows[0]) {
      const state = existing.rows[0].state_json as EnhancedPlayerState;
      state.stateRevision = Number(existing.rows[0].version);
      migratePlayerCurves(state);
      return state;
    }
    const state = defaultEnhancedPlayerState(contentVersion);
    await pool.query(
      "INSERT INTO player_states (user_id, content_version, state_json, version) VALUES ($1, $2, $3, 0) ON CONFLICT (user_id) DO NOTHING",
      [userId, contentVersion, JSON.stringify(state)],
    );
    return getOrCreatePlayerState(userId, contentVersion);
  }

  async function persistState(userId: string, state: EnhancedPlayerState) {
    const expectedVersion = state.stateRevision;
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion! < 0) {
      throw new Error("state_version_conflict");
    }
    const nextRevision = expectedVersion! + 1;
    const res = await pool.query(
      "UPDATE player_states SET content_version = $2, state_json = $3, version = version + 1, updated_at = now() WHERE user_id = $1 AND version = $4",
      [userId, state.contentVersion, JSON.stringify({ ...state, stateRevision: nextRevision }), expectedVersion],
    );
    if (res.rowCount !== 1) throw new Error("state_version_conflict");
    state.stateRevision = nextRevision;
    void syncRanking(userId, state);
  }

  /** 事务里改过的存档：提交之后才更新排行榜，回滚就当没发生。 */
  const txTouched = new WeakMap<object, Map<string, EnhancedPlayerState>>();

  async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      for (const [userId, state] of txTouched.get(client) ?? []) void syncRanking(userId, state);
      return result;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw e;
    } finally {
      txTouched.delete(client);
      client.release();
    }
  }

  async function txLoadStateForUpdate(
    client: import("pg").PoolClient,
    userId: string,
  ): Promise<{ state: EnhancedPlayerState; contentVersion: string }> {
    const res = await client.query(
      "SELECT content_version, state_json, version FROM player_states WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (!res.rows[0]) {
      const state = defaultEnhancedPlayerState("unknown");
      await client.query(
        "INSERT INTO player_states (user_id, content_version, state_json, version) VALUES ($1, $2, $3, 0)",
        [userId, "unknown", JSON.stringify(state)],
      );
      await client.query("SELECT 1 FROM player_states WHERE user_id = $1 FOR UPDATE", [userId]);
      state.stateRevision = 0;
      return { state, contentVersion: "unknown" };
    }
    const state = { ...res.rows[0].state_json, stateRevision: Number(res.rows[0].version) } as EnhancedPlayerState;
    migratePlayerCurves(state);
    return { state, contentVersion: res.rows[0].content_version as string };
  }

  async function txPersistState(
    client: import("pg").PoolClient,
    userId: string,
    state: EnhancedPlayerState,
    contentVersion: string,
  ): Promise<void> {
    await client.query(
      "UPDATE player_states SET content_version = $2, state_json = $3, version = version + 1, updated_at = now() WHERE user_id = $1",
      [userId, contentVersion, JSON.stringify({ ...state, stateRevision: state.stateRevision! + 1 })],
    );
    state.stateRevision = state.stateRevision! + 1;
    const touched = txTouched.get(client) ?? new Map<string, EnhancedPlayerState>();
    touched.set(userId, state);
    txTouched.set(client, touched);
  }

  /** 凭据变了：已连上的每一条连接都断开，旧连接不能再收发。只管得到本进程的连接。 */
  function dropSockets(this: Storage, userId: string) {
    sockets.closeAll(userId, WS_SESSION_REVOKED, "session_revoked");
    this.wsDisconnect(userId);
  }

  /** 同好会（circle_pg.ts）：成员变了就换本进程里这个人的聊天频道。 */
  const circles = createPgCircles({
    pool,
    withTransaction,
    txLoadStateForUpdate,
    txPersistState,
    isOnline: (userId) => wsConnections.has(userId),
    events: {
      setChannel(userId, circleId) {
        const conn = wsConnections.get(userId);
        for (const key of [...(conn?.channels ?? [])]) {
          if (!key.startsWith("circle:")) continue;
          conn!.channels.delete(key);
          channelMembers.get(key)?.delete(userId);
        }
        if (conn && circleId) addMembership(channelMembers, conn.channels, userId, `circle:${circleId}`);
      },
      broadcast: (channel, msg) => broadcast(channel, msg),
      notifyUser: (userId, payload) => notifyUser(userId, payload),
    },
  });

  const storage: Storage = {
    ...circles.methods,
    init,
    findOrCreateGuestUser,
    createGuestUser,
    getUser,
    setGuestResumeTokenHash,
    findUserByResumeTokenHash,
    async bindGoogle(userId: string, googleSub: string) {
      const existing = await pool.query("SELECT id FROM users WHERE google_sub = $1 AND id <> $2", [googleSub, userId]);
      if (existing.rows[0]) throw new Error("google_sub_already_bound");
      await pool.query(
        "UPDATE users SET google_sub = $1, auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $2",
        [googleSub, userId],
      );
      dropSockets.call(this, userId);
    },
    async findUserByGoogleSub(googleSub: string) {
      const found = await pool.query("SELECT " + USER_COLS + " FROM users WHERE google_sub = $1", [googleSub]);
      return found.rows[0] ? mapUser(found.rows[0]) : null;
    },
    async deleteAccount(userId: string, now: Date) {
      return withUserLock(userId, async () => {
        const done = await withTransaction(async (client) => {
          const found = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
          if (!found.rows[0]) return null;
          const partyRows = await client.query(
            "SELECT id, leader_id, members FROM parties WHERE members @> $1::jsonb OR leader_id = $2 FOR UPDATE",
            [JSON.stringify([{ userId }]), userId],
          );
          for (const party of partyRows.rows) {
            const members = party.members as Array<{ userId: string }>;
            if (party.leader_id !== userId) {
              await client.query("UPDATE parties SET members = $1 WHERE id = $2", [
                JSON.stringify(members.filter((m) => m.userId !== userId)),
                party.id,
              ]);
              continue;
            }
            await client.query("DELETE FROM parties WHERE id = $1", [party.id]);
            const others = members.map((m) => m.userId).filter((id) => id !== userId).sort();
            for (const id of others) {
              const { state, contentVersion } = await txLoadStateForUpdate(client, id);
              state.partyState = undefined;
              appendLog(state, "队伍已解散");
              await txPersistState(client, id, state, contentVersion);
            }
          }
          // 当过队员的进行中活动里还留着以账号编号为键的基线
          await client.query(
            "UPDATE parties SET current_activity = current_activity #- ARRAY['baseline', $1::text] WHERE current_activity->'baseline' ? $1::text",
            [userId],
          );
          const orders = await client.query("DELETE FROM trading_orders WHERE user_id = $1", [userId]);
          // 锁住存档行：在途的成交 / 挂单要么已经提交（下面看得到），要么等注销完再失败
          await client.query("SELECT 1 FROM player_states WHERE user_id = $1 FOR UPDATE", [userId]);
          const lateOrders = await client.query("DELETE FROM trading_orders WHERE user_id = $1", [userId]);
          await client.query("UPDATE trade_history SET buyer_id = $2 WHERE buyer_id = $1", [userId, DELETED_ACCOUNT_ID]);
          await client.query("UPDATE trade_history SET seller_id = $2 WHERE seller_id = $1", [userId, DELETED_ACCOUNT_ID]);
          await client.query("DELETE FROM enhancement_requests WHERE requester_id = $1 OR provider_id = $1", [userId]);
          await client.query(
            `UPDATE player_states
                SET state_json = jsonb_set(state_json, '{partyInvites}', COALESCE(
                      (SELECT jsonb_agg(i) FROM jsonb_array_elements(state_json->'partyInvites') i WHERE i->>'fromUserId' <> $1), '[]'::jsonb)),
                    version = version + 1
              WHERE state_json->'partyInvites' @> $2::jsonb`,
            [userId, JSON.stringify([{ fromUserId: userId }])],
          );
          const circleDone = await circles.txRemoveAccount(client, userId);
          await client.query("DELETE FROM player_command_receipts WHERE user_id = $1", [userId]);
          await client.query("DELETE FROM player_rankings WHERE user_id = $1", [userId]);
          await client.query("DELETE FROM player_states WHERE user_id = $1", [userId]);
          await client.query("DELETE FROM users WHERE id = $1", [userId]);
          await client.query("DELETE FROM account_deletions WHERE deleted_at < $1::timestamptz - make_interval(days => $2)", [
            now.toISOString(),
            TOMBSTONE_DAYS,
          ]);
          await client.query(
            "INSERT INTO account_deletions (user_id, deleted_at) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            [userId, now.toISOString()],
          );
          return { circleDone, ordersRemoved: (orders.rowCount ?? 0) + (lateOrders.rowCount ?? 0), disbanded: partyRows.rows.filter((p) => p.leader_id === userId).map((p) => p.id as string), left: partyRows.rows.filter((p) => p.leader_id !== userId).map((p) => p.id as string) };
        });
        if (!done) return null;
        circles.announceRemoved(done.circleDone);
        rankWritten.delete(userId);
        rankCache.clear();
        for (const partyId of done.disbanded) {
          broadcast(`party:${partyId}`, { type: "party:event", event: "party_disbanded", ts: nowIso() });
          channelMembers.delete(`party:${partyId}`);
        }
        for (const partyId of done.left) {
          broadcast(`party:${partyId}`, { type: "party:event", event: "member_left", memberId: userId, ts: nowIso() });
        }
        const conn = wsConnections.get(userId);
        for (const ch of conn?.channels ?? []) channelMembers.get(ch)?.delete(userId);
        wsConnections.delete(userId);
        sockets.closeAll(userId);
        // chat_blocks / chat_reports 随 users 级联删除；内存里的名单和最近消息也清掉
        for (const c of wsConnections.values()) c.blocked.delete(userId);
        chatRing.forget(userId);
        return { ordersRemoved: done.ordersRemoved };
      });
    },
    async getLeaderboard(params) {
      return rankCache.view(params);
    },
    setStateObserver(observer) {
      stateObserver = observer;
    },
    async bumpMetrics(rows, now) {
      if (rows.length === 0) return;
      await pool.query(
        `INSERT INTO metrics_daily (day, event, count)
         SELECT * FROM unnest($1::date[], $2::text[], $3::bigint[])
         ON CONFLICT (day, event) DO UPDATE SET count = metrics_daily.count + EXCLUDED.count`,
        [rows.map((r) => r.day), rows.map((r) => r.event), rows.map((r) => r.count)],
      );
      await pool.query("DELETE FROM metrics_daily WHERE day < $1::date", [
        utcDay(new Date(now.getTime() - METRICS_KEEP_DAYS * 24 * 3600_000)),
      ]).catch((err) => console.error("[metrics] prune failed:", err));
    },
    async readMetrics({ since }) {
      const { rows } = await pool.query(
        "SELECT to_char(day, 'YYYY-MM-DD') AS day, event, count FROM metrics_daily WHERE day >= $1::date ORDER BY day, event",
        [since],
      );
      return rows.map((r) => ({ day: r.day, event: r.event as MetricEvent, count: Number(r.count) }));
    },
    async wasAccountDeleted(userId: string, now: Date) {
      const { rows } = await pool.query(
        "SELECT 1 FROM account_deletions WHERE user_id = $1 AND deleted_at >= $2::timestamptz - make_interval(days => $3)",
        [userId, now.toISOString(), TOMBSTONE_DAYS],
      );
      return rows.length > 0;
    },
    async invalidateSessions(userId: string) {
      await pool.query("UPDATE users SET auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $1", [userId]);
      dropSockets.call(this, userId);
    },
    async createPasswordUser(username: string, passwordHash: string) {
      try {
        const created = await pool.query(
          "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING " + USER_COLS,
          [randomUUID(), username, passwordHash],
        );
        return mapUser(created.rows[0]);
      } catch (e: any) {
        if (e?.code === "23505") throw new UsernameTaken();
        throw e;
      }
    },
    async findUserByUsername(username: string) {
      const found = await pool.query(
        "SELECT " + USER_COLS + " FROM users WHERE lower(username) = lower($1)",
        [username],
      );
      return found.rows[0] ? mapUser(found.rows[0]) : null;
    },
    async bindPassword(userId: string, username: string, passwordHash: string) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2",
        [username, userId],
      );
      if (existing.rows[0]) throw new UsernameTaken();
      const updated = await pool.query(
        "UPDATE users SET username = $1, password_hash = $2, auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $3",
        [username, passwordHash, userId],
      );
      if (updated.rowCount !== 1) throw new Error("user_not_found");
      // 账号名可能正好等于角色名：榜上要马上打码（display_name.ts）
      rankCache.clear();
      dropSockets.call(this, userId);
    },
    getOrCreatePlayerState,
    async simulateToNow({ userId, state, now, contentPack }) {
      return withUserLock(userId, async () => {
        const result = simulateToNow({ state: structuredClone(state), now, contentPack });
        const next = { ...(result.state as EnhancedPlayerState), inventory: normalizeInv(result.state.inventory) };
        await persistState(userId, next);
        notifyState({ userId, before: state, after: next, now });
        for (const text of worldAnnouncements(state, next, contentPack, userId)) {
          broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text }, userId);
        }
        return next;
      });
    },
    async executePlayerCommand<T>(command: PlayerCommand<T>) {
      return withUserLock(command.userId, async () => {
        for (let attempt = 0; ; attempt++) {
          const snapshot = await getOrCreatePlayerState(command.userId, command.contentPack.version);
          let requestHash: string | undefined;
          if (command.operationId) {
            requestHash = commandOperationHash(command.userId, command.operationId, command.operationPayload);
            const receipt = await getCommandReceipt(command.userId, command.operationId);
            if (receipt) {
              if (receipt.requestHash !== requestHash) throw new PlayerCommandOperationMismatch();
              return { state: snapshot, result: receipt.result as T, deduplicated: true };
            }
          }
          const revision = commandRevision(snapshot, command.expectedRevision);
          const settled = simulateToNow({ state: structuredClone(snapshot), now: command.now, contentPack: command.contentPack });
          const outcome = applyPlayerCommand(settled.state as EnhancedPlayerState, command.apply);
          outcome.state.inventory = normalizeInv(outcome.state.inventory);
          ensureProgression(outcome.state, command.now);
          try {
            await withTransaction(async (client) => {
              const current = await txLoadStateForUpdate(client, command.userId);
              const currentRevision = commandRevision(current.state);
              if (currentRevision !== revision) throw new PlayerCommandConflict(currentRevision);
              outcome.state.stateRevision = revision;
              await txPersistState(client, command.userId, outcome.state, outcome.state.contentVersion);
              if (command.operationId && requestHash) {
                const inserted = await client.query(
                  "INSERT INTO player_command_receipts (user_id, operation_id, request_hash, result, state_revision) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, operation_id) DO NOTHING",
                  [command.userId, command.operationId, requestHash, JSON.stringify(outcome.result ?? null), revision],
                );
                if (inserted.rowCount === 0) throw new PlayerCommandConflict(currentRevision);
              }
            });
            notifyState({ userId: command.userId, before: snapshot, after: outcome.state as EnhancedPlayerState, now: command.now });
            for (const text of worldAnnouncements(snapshot, outcome.state as EnhancedPlayerState, command.contentPack, command.userId)) {
              broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text }, command.userId);
            }
            return outcome;
          } catch (error) {
            if (!(error instanceof PlayerCommandConflict) || command.expectedRevision !== undefined || attempt >= 2) throw error;
          }
        }
      });
    },
    async deduplicateOperation<T>({ userId, operationId, operationPayload, run }: {
      userId: string;
      operationId?: string;
      operationPayload?: unknown;
      run: () => Promise<T>;
    }): Promise<{ result: T; deduplicated: boolean }> {
      if (!operationId) return { result: await run(), deduplicated: false };
      return withUserLock(userId, async () => {
        const requestHash = commandOperationHash(userId, operationId, operationPayload);
        const existing = await getCommandReceipt(userId, operationId);
        if (existing) {
          if (existing.requestHash !== requestHash) throw new PlayerCommandOperationMismatch();
          return { result: existing.result as T, deduplicated: true };
        }
        const result = await run();
        const inserted = await pool.query(
          "INSERT INTO player_command_receipts (user_id, operation_id, request_hash, result, state_revision) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, operation_id) DO NOTHING",
          [userId, operationId, requestHash, JSON.stringify(result ?? null), 0],
        );
        if (inserted.rowCount === 0) {
          const raced = await getCommandReceipt(userId, operationId);
          if (raced) return { result: raced.result as T, deduplicated: true };
        }
        return { result, deduplicated: false };
      });
    },
    async savePlayerState(userId: string, state: EnhancedPlayerState) {
      return withUserLock(userId, async () => {
        const next = { ...state, inventory: normalizeInv(state.inventory) };
        ensureProgression(next, new Date());
        await persistState(userId, next);
        return next;
      });
    },
    announceWorld(text: string) {
      broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
    },
    async startLifeAction({ userId, actionId, quantity, now, contentPack }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        startLifeActionNow(st, contentPack, actionId, quantity, now);
        await persistState(userId, st);
        return st;
      });
    },
    async awardSkillExperience({ userId, professionId, xpAmount }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        const res = applyAwardSkillExperience(st, professionId, xpAmount);
        await persistState(userId, st);
        return res;
      });
    },
    async enhanceEquipment({ userId, request, contentPack, rng }) {
      return withUserLock(userId, async () => {
        return withTransaction(async (client) => {
          const providerId = request.serviceProviderId;
          if (providerId === userId) {
            return { success: false, previousLevel: 0, newLevel: 0, consumedMaterials: {}, failureReason: "不能向自己购买强化服务" };
          }
          if (providerId) {
            const exists = await client.query("SELECT 1 FROM users WHERE id = $1", [providerId]);
            if (!exists.rows[0]) {
              return { success: false, previousLevel: 0, newLevel: 0, consumedMaterials: {}, failureReason: "服务提供者不存在" };
            }
          }
          const lockFirst = providerId && providerId < userId ? providerId : userId;
          const lockSecond = providerId && providerId < userId ? userId : providerId;
          const loaded1 = await txLoadStateForUpdate(client, lockFirst);
          const loaded2 = lockSecond ? await txLoadStateForUpdate(client, lockSecond) : loaded1;
          const userLoaded = lockFirst === userId ? loaded1 : loaded2;
          const providerLoaded = providerId ? (lockFirst === providerId ? loaded1 : loaded2) : undefined;

          const { result, consumed, providerMutated } = applyEnhanceEquipment({
            userId,
            st: userLoaded.state,
            providerState: providerLoaded?.state,
            request,
            contentPack,
            rng,
          });
          if (consumed) {
            if (providerId && providerLoaded && providerMutated) {
              await txPersistState(client, providerId, providerLoaded.state, providerLoaded.contentVersion);
            }
            await txPersistState(client, userId, userLoaded.state, userLoaded.contentVersion);
          }
          return result;
        });
      });
    },
    async getEnhancementInfo({ userId, itemId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      return computeEnhancementInfo(st, itemId, contentPack);
    },
    async getEnhancementProviders({ itemType, contentPack }) {
      const rule = contentPack.enhancementRules?.find((r) => r.itemType === itemType);
      if (!rule) return [];
      const skillKey = `skill_${rule.requiredProfession}`;
      const result = await pool.query(
        `SELECT user_id, state_json FROM player_states WHERE state_json -> 'skills' ? $1 LIMIT 200`,
        [skillKey],
      );
      const providers: EnhancementProvider[] = [];
      for (const row of result.rows) {
        const state = row.state_json as EnhancedPlayerState;
        const skill = state.skills[skillKey];
        if (skill && hasEnhancementSkill(skill.unlockedRecipes, rule.requiredProfession, rule.itemType)) {
          providers.push({
            userId: row.user_id,
            profession: rule.requiredProfession,
            skillLevel: skill.level,
            serviceFee: Math.floor((rule.materials.find((m: any) => m.itemId === "gold")?.quantity || 100) * 0.5),
            isOnline: wsConnections.has(row.user_id),
            completedServices: 0,
            rating: 5.0,
          });
        }
      }
      return providers.sort((a, b) => b.skillLevel - a.skillLevel);
    },
    async createEnhancementServiceRequest({ requesterId, providerId, itemId, targetLevel, message, contentPack }) {
      if (requesterId === providerId) throw new Error("不能向自己发起强化服务");
      return withTransaction(async (client) => {
        const lockFirst = requesterId < providerId ? requesterId : providerId;
        const lockSecond = requesterId < providerId ? providerId : requesterId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const requesterState = (lockFirst === requesterId ? loaded1 : loaded2).state;
        const providerState = (lockFirst === providerId ? loaded1 : loaded2).state;

        const serviceFee = validateEnhancementServiceCreation({
          requesterId,
          providerId,
          requesterState,
          providerState,
          itemId,
          contentPack,
        });
        const result = await client.query(
          `INSERT INTO enhancement_requests (requester_id, provider_id, item_id, target_level, service_fee, message)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [requesterId, providerId, itemId, targetLevel, serviceFee, message],
        );
        const row = result.rows[0];
        notifyUser(providerId, { kind: "enhancement:service_request", requestId: row.id, requesterId, itemId, targetLevel, serviceFee });
        return {
          id: row.id,
          requesterId: row.requester_id,
          providerId: row.provider_id,
          itemId: row.item_id,
          targetLevel: row.target_level,
          serviceFee: row.service_fee,
          message: row.message,
          status: row.status,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        } as EnhancementServiceRequest;
      });
    },
    async respondToEnhancementServiceRequest({ requestId, providerId, accepted, message, contentPack }) {
      const result = await pool.query("SELECT * FROM enhancement_requests WHERE id = $1", [requestId]);
      if (!result.rows[0]) throw new Error("服务请求不存在");
      const req = result.rows[0];
      if (req.provider_id !== providerId) throw new Error("您无权响应此请求");
      if (req.status !== "pending") throw new Error("请求已被处理");

      if (accepted) {
        const enhanceResult = await storage.enhanceEquipment({
          userId: req.requester_id,
          request: {
            itemId: req.item_id,
            targetLevel: req.target_level,
            materials: {},
            serviceProviderId: providerId,
          },
          contentPack,
        });
        if (!enhanceResult.success) {
          await pool.query(
            "UPDATE enhancement_requests SET status = 'rejected', response_message = $1, updated_at = now() WHERE id = $2",
            [enhanceResult.failureReason || "强化失败", requestId],
          );
          notifyUser(req.requester_id, {
            kind: "enhancement:service_completed",
            requestId,
            success: false,
            failureReason: enhanceResult.failureReason,
          });
          return { success: false, message: enhanceResult.failureReason || "强化失败" };
        }
      }

      const newStatus = accepted ? "completed" : "rejected";
      await pool.query(
        "UPDATE enhancement_requests SET status = $1, response_message = $2, updated_at = now() WHERE id = $3",
        [newStatus, message, requestId],
      );
      notifyUser(
        req.requester_id,
        accepted
          ? { kind: "enhancement:service_completed", requestId, success: true }
          : { kind: "enhancement:service_rejected", requestId, message },
      );
      return { success: true, message: accepted ? "已接受" : "已拒绝" };
    },
    async getEnhancementServiceRequests({ userId, type }) {
      const col = enhancementRequestUserColumn(type);
      const result = await pool.query(
        `SELECT * FROM enhancement_requests WHERE ${col} = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return result.rows.map((r) => ({
        id: r.id,
        requesterId: r.requester_id,
        providerId: r.provider_id,
        itemId: r.item_id,
        targetLevel: r.target_level,
        serviceFee: r.service_fee,
        message: r.message,
        status: r.status,
        responseMessage: r.response_message,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      })) as EnhancementServiceRequest[];
    },
    async createParty({ userId, name }) {
      return withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        if (st.partyState) throw new Error("already_in_party");
        const result = await client.query(
          `INSERT INTO parties (leader_id, name, members) VALUES ($1, $2, $3) RETURNING *`,
          [userId, name || null, JSON.stringify([{ userId, role: "leader", joinedAt: nowIso(), isOnline: true }])],
        );
        const row = result.rows[0];
        st.partyState = { partyId: row.id, role: "leader", isLeader: true, joinedAt: nowIso() };
        appendLog(st, `创建队伍：${row.id}`);
        await txPersistState(client, userId, st, contentVersion);
        return {
          id: row.id,
          leaderId: row.leader_id,
          members: row.members,
          createdAt: row.created_at.toISOString(),
          currentActivity: row.current_activity,
        } as Party;
      });
    },
    async joinParty({ userId, partyId }) {
      const joined = await withTransaction(async (client) => txJoinParty(client, userId, partyId));
      const conn = wsConnections.get(userId);
      if (conn && !conn.channels.has(`party:${partyId}`)) {
        addMembership(channelMembers, conn.channels, userId, `party:${partyId}`);
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "member_joined", memberId: userId, ts: nowIso() });
      return joined;
    },
    async listParties({ limit }) {
      const result = await pool.query(
        "SELECT id, name, leader_id, members, current_activity, created_at FROM parties WHERE jsonb_array_length(members) < 6 ORDER BY created_at DESC LIMIT $1",
        [Math.min(200, Math.max(1, limit ?? 50))],
      );
      return result.rows.map((r) => ({
        id: r.id,
        name: r.name ?? undefined,
        leaderId: r.leader_id,
        memberCount: (r.members as any[]).length,
        hasActivity: !!r.current_activity,
        createdAt: r.created_at.toISOString(),
      }));
    },
    async inviteToParty({ userId, partyId, targetUserId }) {
      return withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const members = partyResult.rows[0].members as any[];
        if (!members.some((m: any) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
        if (members.length >= 6) return { success: false, message: "队伍已满员" };
        if (userId === targetUserId) return { success: false, message: "不能邀请自己" };
        const { state: target, contentVersion } = await txLoadStateForUpdate(client, targetUserId);
        if (target.partyState) return { success: false, message: "对方已有队伍" };
        if (!Array.isArray(target.partyInvites)) target.partyInvites = [];
        const now = Date.now();
        target.partyInvites = target.partyInvites.filter((i) => Date.parse(i.invitedAt) > now - 24 * 3600_000);
        if (target.partyInvites.some((i) => i.partyId === partyId)) return { success: true, message: "邀请已发送" };
        // 对方屏蔽了邀请人：照常回「已发送」，邀请不存也不通知
        const blockedBy = await client.query("SELECT 1 FROM chat_blocks WHERE user_id = $1 AND blocked_user_id = $2", [targetUserId, userId]);
        if (blockedBy.rows[0]) return { success: true };
        if (target.partyInvites.length >= 10) target.partyInvites.shift();
        target.partyInvites.push({ partyId, fromUserId: userId, invitedAt: nowIso() });
        await txPersistState(client, targetUserId, target, contentVersion);
        notifyUser(targetUserId, { kind: "party:invite", partyId, from: userId });
        return { success: true };
      });
    },
    async acceptPartyInvite({ userId, partyId }) {
      const party = await withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        const invite = (st.partyInvites || []).find((i) => i.partyId === partyId);
        if (!invite) throw new Error("invite_not_found");
        if (Date.parse(invite.invitedAt) < Date.now() - 24 * 3600_000) {
          st.partyInvites = (st.partyInvites || []).filter((i) => i !== invite);
          await txPersistState(client, userId, st, contentVersion);
          throw new Error("invite_expired");
        }
        st.partyInvites = (st.partyInvites || []).filter((i) => i.partyId !== partyId);
        await txPersistState(client, userId, st, contentVersion);
        return txJoinParty(client, userId, partyId);
      });
      const conn = wsConnections.get(userId);
      if (conn && !conn.channels.has(`party:${partyId}`)) {
        addMembership(channelMembers, conn.channels, userId, `party:${partyId}`);
      }
      broadcast(`party:${partyId}`, { type: "party:event", event: "member_joined", memberId: userId, ts: nowIso() });
      return party;
    },
    async declinePartyInvite({ userId, partyId }) {
      return withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        const before = (st.partyInvites || []).length;
        st.partyInvites = (st.partyInvites || []).filter((i) => i.partyId !== partyId);
        await txPersistState(client, userId, st, contentVersion);
        return { success: (st.partyInvites || []).length < before };
      });
    },
    async kickPartyMember({ userId, partyId, memberId }) {
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以踢出成员" };
        if (memberId === userId) return { success: false, message: "队长不能踢出自己（请直接离开队伍）" };
        const members = party.members as any[];
        const idx = members.findIndex((m: any) => m.userId === memberId);
        if (idx === -1) return { success: false, message: "该玩家不在队伍中" };
        members.splice(idx, 1);
        await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);
        const { state: target, contentVersion } = await txLoadStateForUpdate(client, memberId);
        target.partyState = undefined;
        appendLog(target, "您已被移出队伍");
        await txPersistState(client, memberId, target, contentVersion);
        return { success: true };
      });
      if (res.success) {
        const conn = wsConnections.get(memberId);
        if (conn) {
          conn.channels.delete(`party:${partyId}`);
          channelMembers.get(`party:${partyId}`)?.delete(memberId);
        }
        notifyUser(memberId, { kind: "party:kicked", partyId });
        broadcast(`party:${partyId}`, { type: "party:event", event: "member_left", memberId, kicked: true, ts: nowIso() });
      }
      return res;
    },
    async transferPartyLeadership({ userId, partyId, memberId }) {
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以移交队长" };
        if (memberId === userId) return { success: false, message: "您已经是队长" };
        const members = party.members as any[];
        if (!members.some((m: any) => m.userId === memberId)) return { success: false, message: "该玩家不在队伍中" };
        for (const m of members) m.role = m.userId === memberId ? "leader" : "member";
        await client.query("UPDATE parties SET leader_id = $1, members = $2 WHERE id = $3", [memberId, JSON.stringify(members), partyId]);
        for (const uid of [userId, memberId].sort()) {
          const { state: s, contentVersion } = await txLoadStateForUpdate(client, uid);
          if (s.partyState) {
            s.partyState.isLeader = uid === memberId;
            s.partyState.role = s.partyState.isLeader ? "leader" : "member";
          }
          await txPersistState(client, uid, s, contentVersion);
        }
        return { success: true };
      });
      if (res.success) {
        broadcast(`party:${partyId}`, { type: "party:event", event: "leader_changed", memberId, ts: nowIso() });
        notifyUser(memberId, { kind: "party:leader", partyId });
      }
      return res;
    },
    async startPartyActivity({ userId, partyId, activityType, stageId, durationMinutes, contentPack }) {
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        const members = party.members as any[];
        if (!members.some((m: any) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以开始活动" };
        if (party.current_activity) return { success: false, message: "队伍已有进行中的活动" };

        const duration = Math.min(480, Math.max(5, Math.floor(durationMinutes ?? 30)));
        const now = new Date();
        const target = validatePartyActivityTarget({
          activityType,
          stageId,
          memberCount: members.length,
          contentPack,
        });
        if (!target.ok) return { success: false, message: target.message };

        const baseline: Record<string, ReturnType<typeof snapshotMemberBaseline>> = {};
        const states = new Map<string, { state: EnhancedPlayerState; contentVersion: string }>();
        const sorted = [...members].sort((a: any, b: any) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
        for (const m of sorted) {
          const loaded = await txLoadStateForUpdate(client, m.userId);
          states.set(m.userId, loaded);
          baseline[m.userId] = snapshotMemberBaseline(loaded.state, target.raidBossId);
        }

        const activity = {
          type: activityType,
          stageId,
          startedAt: now.toISOString(),
          endsAt: new Date(now.getTime() + duration * 60_000).toISOString(),
          durationMinutes: duration,
          raidBossId: target.raidBossId,
          raidBossName: target.raidBossName,
          bossKillsNeeded: target.bossKillsNeeded,
          baseline,
        };
        await client.query("UPDATE parties SET current_activity = $1 WHERE id = $2", [JSON.stringify(activity), partyId]);

        for (const m of sorted) {
          const { state, contentVersion } = states.get(m.userId)!;
          appendLog(
            state,
            `队伍活动开始：${activityType}${target.raidBossName ? `·讨伐 ${target.raidBossName}` : ""}（${duration} 分钟）`,
          );
          await txPersistState(client, m.userId, state, contentVersion);
        }
        return { success: true };
      });
      if (res.success) {
        for (const m of (await pool.query("SELECT members FROM parties WHERE id = $1", [partyId])).rows[0]?.members ?? []) {
          const conn = wsConnections.get(m.userId);
          if (conn && !conn.channels.has(`party:${partyId}`)) {
            addMembership(channelMembers, conn.channels, m.userId, `party:${partyId}`);
          }
        }
        broadcast(`party:${partyId}`, { type: "party:event", event: "activity_started", ts: nowIso() });
      }
      return res;
    },
    async completePartyActivity({ userId, partyId }) {
      return withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0] || !partyResult.rows[0].current_activity) {
          return { success: false, message: "没有进行中的活动" };
        }
        const party = partyResult.rows[0];
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以完成活动" };
        const members = party.members as any[];
        if (!members.some((m: any) => m.userId === userId)) return { success: false, message: "您不是该队伍成员" };

        const activity = party.current_activity;
        if (activity.endsAt && Date.parse(activity.endsAt) > Date.now()) {
          return {
            success: false,
            message: `活动尚未结束（${Math.ceil((Date.parse(activity.endsAt) - Date.now()) / 60000)} 分钟后可结算）`,
          };
        }

        const claim = await client.query(
          "UPDATE parties SET current_activity = NULL WHERE id = $1 AND current_activity IS NOT NULL RETURNING 1",
          [partyId],
        );
        if (claim.rowCount === 0) return { success: false, message: "活动已被结算" };

        const memberStates = new Map<string, { state: EnhancedPlayerState; contentVersion: string }>();
        const sortedM = [...members].sort((a: any, b: any) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
        for (const m of sortedM) {
          memberStates.set(m.userId, await txLoadStateForUpdate(client, m.userId));
        }

        const { rewards, contributions, zeroContribution } = settlePartyActivityMemberStates({
          activity,
          members,
          getMemberState: (uid) => memberStates.get(uid)?.state,
        });

        if (zeroContribution) {
          broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, ts: nowIso() });
          return { success: true, rewards, message: "活动期间无人产生贡献，无奖励发放" };
        }

        for (const m of sortedM) {
          const loaded = memberStates.get(m.userId)!;
          await txPersistState(client, m.userId, loaded.state, loaded.contentVersion);
        }
        broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, contributions, ts: nowIso() });
        return { success: true, rewards };
      });
    },
    async cancelPartyActivity({ userId, partyId }) {
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0] || !partyResult.rows[0].current_activity) {
          return { success: false, message: "没有进行中的活动" };
        }
        if (partyResult.rows[0].leader_id !== userId) return { success: false, message: "只有队长可以取消活动" };
        await client.query("UPDATE parties SET current_activity = NULL WHERE id = $1", [partyId]);
        return { success: true };
      });
      if (res.success) broadcast(`party:${partyId}`, { type: "party:event", event: "activity_cancelled", ts: nowIso() });
      return res;
    },
    async leaveParty({ userId, partyId }) {
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        const members = party.members as any[];
        const memberIndex = members.findIndex((m: any) => m.userId === userId);
        if (memberIndex === -1) return { success: false, message: "不在队伍中" };

        if (party.leader_id === userId) {
          await client.query("DELETE FROM parties WHERE id = $1", [partyId]);
          const sorted = [...members].sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
          for (const member of sorted) {
            const { state, contentVersion } = await txLoadStateForUpdate(client, member.userId);
            state.partyState = undefined;
            appendLog(state, "队伍已解散");
            await txPersistState(client, member.userId, state, contentVersion);
          }
          return { success: true, message: "队伍已解散", disbanded: true, memberIds: members.map((m: any) => m.userId) };
        }

        members.splice(memberIndex, 1);
        await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        st.partyState = undefined;
        appendLog(st, "已离开队伍");
        await txPersistState(client, userId, st, contentVersion);
        return { success: true, memberIds: [userId] };
      });
      if (res.success) {
        const dropChannel = (uid: string) => {
          const conn = wsConnections.get(uid);
          if (conn) conn.channels.delete(`party:${partyId}`);
          channelMembers.get(`party:${partyId}`)?.delete(uid);
        };
        if ((res as any).disbanded) {
          broadcast(`party:${partyId}`, { type: "party:event", event: "party_disbanded", ts: nowIso() });
          for (const uid of (res as any).memberIds ?? []) dropChannel(uid);
        } else {
          dropChannel(userId);
          broadcast(`party:${partyId}`, { type: "party:event", event: "member_left", memberId: userId, ts: nowIso() });
        }
      }
      const { memberIds: _m, disbanded: _d, ...pub } = res as any;
      return pub;
    },
    async getPartyForUser({ userId }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const partyId = st.partyState?.partyId;
      if (!partyId) return null;
      const result = await pool.query("SELECT * FROM parties WHERE id = $1", [partyId]);
      const row = result.rows[0];
      if (!row) return null;
      const members = row.members as Array<{ userId: string }>;
      if (!members.some((m) => m.userId === userId)) {
        st.partyState = undefined;
        await persistState(userId, st);
        return null;
      }
      const nameRows = await pool.query(
        "SELECT user_id, state_json->'settings'->>'playerName' AS name FROM player_states WHERE user_id = ANY($1)",
        [members.map((m) => m.userId)],
      );
      const nameByUser = new Map<string, string>(
        nameRows.rows.map((r: { user_id: string; name: string | null }) => [r.user_id, shownName(r.user_id, r.name)]),
      );
      return {
        id: row.id,
        name: row.name ?? undefined,
        leaderId: row.leader_id,
        members: (row.members as any[]).map((m: any) => ({
          ...m,
          isOnline: wsConnections.has(m.userId),
          displayName: nameByUser.get(m.userId) || `玩家_${m.userId.slice(0, 6)}`,
        })),
        createdAt: row.created_at.toISOString(),
        currentActivity: row.current_activity,
      } as Party;
    },
    async getDurabilityInfo({ userId, itemId }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      return computeDurabilityInfo(st, itemId);
    },
    async repairEquipment({ userId, request }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        const res = applyRepairEquipment(st, request);
        if (res.success) await persistState(userId, st);
        return res;
      });
    },
    async reduceDurability({ userId, itemId, amount }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        const res = applyReduceDurability(st, itemId, amount);
        if (res.success) await persistState(userId, st);
        return res;
      });
    },
    async getPriceHistory({ itemId, days = 7 }) {
      const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 90) : 7;
      const result = await pool.query(
        `SELECT * FROM price_history WHERE item_id = $1 AND record_date >= CURRENT_DATE - $2 * INTERVAL '1 day' ORDER BY record_date DESC`,
        [itemId, safeDays],
      );
      return result.rows.map((r) => ({
        itemId: r.item_id,
        averagePrice: parseFloat(r.average_price),
        minPrice: r.min_price,
        maxPrice: r.max_price,
        volume: r.volume,
        recordDate: r.record_date.toISOString().split("T")[0],
      })) as PriceHistory[];
    },
    async getItemPriceTrend({ itemId }) {
      const history = await this.getPriceHistory({ itemId, days: 7 });
      return computeItemPriceTrend(itemId, history);
    },
    async getEquipmentStats({ userId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      return computeEquipmentStats(st, contentPack);
    },
    async getActiveSetBonuses({ userId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      return computeActiveSetBonuses(st, contentPack);
    },
    wsConnect(userId, connection) {
      // 同一个人又开一个标签页：沿用已经读好的名单，不再有空窗
      const prev = wsConnections.get(userId);
      const c: WsConn = {
        socket: socketFromWsConnection(connection),
        channels: new Set<string>(),
        blocked: prev?.blocked ?? new Set<string>(),
        blockedLoaded: prev?.blockedLoaded ?? false,
        held: [],
      };
      wsConnections.set(userId, c);
      sockets.add(userId, c.socket);
      addMembership(channelMembers, c.channels, userId, "world");
      try {
        if (c.socket && typeof c.socket.send === "function") {
          c.socket.send(JSON.stringify({ type: "chat:system", channel: "world", ts: nowIso(), text: "connected" }));
        }
      } catch {}
      if (!c.blockedLoaded) {
        void pool
          .query("SELECT blocked_user_id FROM chat_blocks WHERE user_id = $1", [userId])
          .then(({ rows }) => {
            for (const r of rows) c.blocked.add(r.blocked_user_id);
          })
          // 读不出来（库抖动）也放行，不让聊天一直收不到；名单下次连上再读
          .catch(() => {})
          .finally(() => releaseHeld(c));
      }
      void Promise.all([getOrCreatePlayerState(userId, "unknown"), circles.circleIdOf(userId)])
        .then(([st, circleId]) => {
          for (const key of membershipKeys({ classId: st.activeClassId, partyId: st.partyState?.partyId, circleId })) {
            addMembership(channelMembers, c.channels, userId, key);
          }
          if (st.partyState?.partyId) void patchMemberOnline(userId, true);
        })
        .catch(() => {});
    },
    wsDisconnect(userId, connection) {
      const c = wsConnections.get(userId);
      const closing = connection ? socketFromWsConnection(connection) : c?.socket;
      const remaining = sockets.remove(userId, closing);
      if (!c || (connection && c.socket !== closing)) return;
      // 当前连接断了但还有别的标签页在线：换一条继续收消息
      if (connection && remaining) {
        c.socket = remaining;
        return;
      }
      for (const ch of c.channels) {
        const set = channelMembers.get(ch);
        if (set) {
          set.delete(userId);
          if (set.size === 0) channelMembers.delete(ch);
        }
      }
      wsConnections.delete(userId);
      void patchMemberOnline(userId, false);
    },
    wsMessage(userId, raw) {
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (parsed?.type !== "chat:send") return;
      const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
      const content = maskChatText(typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "");
      const senderConn = wsConnections.get(userId);
      if (!content.trim()) {
        try {
          senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel, message: "消息不能为空", ts: nowIso() }));
        } catch {}
        return;
      }
      if (channel === "private" && typeof parsed.recipient === "string" && parsed.recipient) {
        const recipientId = parsed.recipient;
        void (async () => {
          const st = await getOrCreatePlayerState(userId, "unknown");
          const senderName = shownName(userId, st.settings?.playerName);
          const recipientConn = wsConnections.get(recipientId);
          if (recipientConn?.socket) {
            const payload = {
              type: "chat:message",
              channel: "private",
              sender: userId,
              senderName,
              senderProfession: st.activeClassId,
              recipient: recipientId,
              ts: nowIso(),
              content,
            };
            // 对方屏蔽了你：只回给自己，和送到了一样（名单没读完时先压着，读完再定）
            deliverFrom(recipientConn, userId, JSON.stringify(payload), () =>
              chatRing.push(privateKey(userId, recipientId), { ts: payload.ts, sender: userId, senderName, content })
            );
            try {
              senderConn?.socket?.send(JSON.stringify({ ...payload, isSelf: true }));
            } catch {}
          } else {
            try {
              senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel: "private", message: "用户不在线", ts: nowIso() }));
            } catch {}
          }
        })().catch(() => {});
        return;
      }
      void (async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        const memberKey = membershipKeyForSend(channel, {
          classId: st.activeClassId,
          partyId: st.partyState?.partyId,
          circleId: channel === "circle" ? await circles.circleIdOf(userId) : null,
        });
        if (!memberKey) {
          if (channel === "circle") {
            try {
              senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel, message: "还没加入同好会", ts: nowIso() }));
            } catch {}
          }
          return;
        }
        const c = wsConnections.get(userId);
        if (c) addMembership(channelMembers, c.channels, userId, memberKey);
        const line: ChatLine = { ts: nowIso(), sender: userId, senderName: shownName(userId, st.settings?.playerName), content };
        chatRing.push(memberKey, line);
        broadcast(memberKey, {
          type: "chat:message",
          channel: payloadChannel(channel),
          sender: userId,
          senderName: line.senderName,
          senderProfession: st.activeClassId,
          ts: line.ts,
          content,
        }, userId);
      })().catch(() => {});
    },
    async getChatBlocks(userId) {
      const { rows } = await pool.query(
        `SELECT b.blocked_user_id, s.state_json->'settings'->>'playerName' AS name
           FROM chat_blocks b LEFT JOIN player_states s ON s.user_id = b.blocked_user_id
          WHERE b.user_id = $1 ORDER BY b.created_at`,
        [userId],
      );
      return rows.map((r: { blocked_user_id: string; name: string | null }) => ({ userId: r.blocked_user_id, name: shownName(r.blocked_user_id, r.name) }));
    },
    async setChatBlock({ userId, targetUserId, blocked }) {
      if (userId === targetUserId) return { ok: false as const, error: "self" as const };
      if (blocked) {
        const found = await pool.query("SELECT 1 FROM users WHERE id = $1", [targetUserId]);
        if (!found.rows[0]) return { ok: false as const, error: "user_not_found" as const };
        const count = await pool.query("SELECT count(*) AS n FROM chat_blocks WHERE user_id = $1", [userId]);
        const already = await pool.query("SELECT 1 FROM chat_blocks WHERE user_id = $1 AND blocked_user_id = $2", [userId, targetUserId]);
        if (!already.rows[0] && Number(count.rows[0]?.n ?? 0) >= CHAT_BLOCK_MAX) return { ok: false as const, error: "too_many" as const };
        await pool.query("INSERT INTO chat_blocks (user_id, blocked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, targetUserId]);
        wsConnections.get(userId)?.blocked.add(targetUserId);
      } else {
        await pool.query("DELETE FROM chat_blocks WHERE user_id = $1 AND blocked_user_id = $2", [userId, targetUserId]);
        wsConnections.get(userId)?.blocked.delete(targetUserId);
      }
      return { ok: true as const };
    },
    async reportChat({ reporterId, targetUserId, reason, channel, now }) {
      if (reporterId === targetUserId) return { ok: false as const, error: "self" as const };
      const found = await pool.query("SELECT 1 FROM users WHERE id = $1", [targetUserId]);
      if (!found.rows[0]) return { ok: false as const, error: "user_not_found" as const };
      const recent = await pool.query(
        "SELECT target_id, created_at FROM chat_reports WHERE reporter_id = $1 AND created_at > $2::timestamptz - make_interval(hours => $3)",
        [reporterId, now.toISOString(), REPORT_DEDUPE_HOURS],
      );
      const gate = reportGate(
        recent.rows.map((r: { target_id: string; created_at: Date }) => ({ targetId: r.target_id, createdAt: new Date(r.created_at).toISOString() })),
        targetUserId,
        now,
      );
      if (gate === "limited") return { ok: false as const, error: "report_limited" as const };
      if (gate === "duplicate") return { ok: true as const, duplicate: true };
      const st = await getOrCreatePlayerState(reporterId, "unknown");
      const circleId = channel === "circle" ? await circles.circleIdOf(reporterId) : null;
      const key = reportRingKey(channel, reporterId, targetUserId, { classId: st.activeClassId, partyId: st.partyState?.partyId, circleId });
      await pool.query(
        "INSERT INTO chat_reports (id, reporter_id, target_id, reason, channel, snapshot, created_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)",
        [randomUUID(), reporterId, targetUserId, reason, channel, JSON.stringify(chatRing.snapshot(key)), now.toISOString()],
      );
      return { ok: true as const, duplicate: false };
    },
    async listChatReports({ since, limit }) {
      const { rows } = await pool.query(
        "SELECT id, reporter_id, target_id, reason, channel, snapshot, created_at FROM chat_reports WHERE created_at >= $1 ORDER BY created_at DESC LIMIT $2",
        [since.toISOString(), limit],
      );
      return rows.map((r: any): ChatReport => ({
        id: r.id,
        reporterId: r.reporter_id,
        targetId: r.target_id,
        reason: r.reason,
        channel: r.channel,
        snapshot: Array.isArray(r.snapshot) ? r.snapshot : [],
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },
    rollCircleWeeks: (now) => circles.rollWeeks(now),
    async purgeChatReports(now) {
      const res = await pool.query("DELETE FROM chat_reports WHERE created_at < $1::timestamptz - make_interval(days => $2)", [
        now.toISOString(),
        REPORT_KEEP_DAYS,
      ]);
      return res.rowCount ?? 0;
    },
    async getTradingOrders({ itemId }) {
      const result = await pool.query(
        "SELECT o.*, u.guest_device_id FROM trading_orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.item_id = $1 ORDER BY o.created_at DESC",
        [itemId],
      );
      return result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        itemId: r.item_id,
        quantity: r.quantity,
        price: r.price,
        type: r.type,
        createdAt: r.created_at.toISOString(),
        username: r.guest_device_id?.slice(0, 8) || "未知用户",
      })) as TradingOrder[];
    },
    async getMarketSummary() {
      const result = await pool.query(
        `SELECT item_id, type,
                MIN(price) FILTER (WHERE type = 'sell') AS ask,
                MAX(price) FILTER (WHERE type = 'buy')  AS bid,
                SUM(quantity) AS qty
           FROM trading_orders
          WHERE quantity > 0
          GROUP BY item_id, type`,
      );
      const out: Record<string, MarketQuote> = {};
      for (const r of result.rows) {
        const q = (out[r.item_id] ||= { askQty: 0, bidQty: 0 });
        if (r.type === "sell") {
          q.ask = Number(r.ask);
          q.askQty = Number(r.qty);
        } else {
          q.bid = Number(r.bid);
          q.bidQty = Number(r.qty);
        }
      }
      return out;
    },
    async createTradingOrder({ userId, itemId, quantity, price, type, contentPack }) {
      validateTradingOrderInput({ itemId, quantity, price, type, contentPack });
      const row = await withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        applyTradingOrderEscrow({ state: st, itemId, quantity, price, type });
        await txPersistState(client, userId, st, contentVersion);
        const result = await client.query(
          `INSERT INTO trading_orders (user_id, item_id, quantity, price, type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, itemId, quantity, price, type],
        );
        return result.rows[0];
      });
      return {
        id: row.id,
        userId: row.user_id,
        itemId: row.item_id,
        quantity: row.quantity,
        price: row.price,
        type: row.type,
        createdAt: row.created_at.toISOString(),
      } as TradingOrder;
    },
    async executeTrade({ buyerId, orderId, quantity }) {
      if (!validateItemQuantity(quantity)) throw new Error("交易数量无效");
      return withTransaction(async (client) => {
        const orderResult = await client.query("SELECT * FROM trading_orders WHERE id = $1 FOR UPDATE", [orderId]);
        if (!orderResult.rows[0]) throw new Error("订单不存在");
        const order = orderResult.rows[0];
        if (order.user_id === buyerId) throw new Error("不能成交自己的订单");
        if (order.quantity < quantity) throw new Error("订单数量不足");

        const posterId = order.user_id as string;
        const lockFirst = buyerId < posterId ? buyerId : posterId;
        const lockSecond = buyerId < posterId ? posterId : buyerId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const fillerLoaded = lockFirst === buyerId ? loaded1 : loaded2;
        const posterLoaded = lockFirst === posterId ? loaded1 : loaded2;

        const totalCost = applyTradeSettlement({
          orderType: order.type,
          itemId: order.item_id,
          quantity,
          price: order.price,
          fillerState: fillerLoaded.state,
          posterState: posterLoaded.state,
        });

        await txPersistState(client, buyerId, fillerLoaded.state, fillerLoaded.contentVersion);
        await txPersistState(client, posterId, posterLoaded.state, posterLoaded.contentVersion);

        const newQty = order.quantity - quantity;
        if (newQty <= 0) {
          await client.query("DELETE FROM trading_orders WHERE id = $1", [orderId]);
        } else {
          await client.query("UPDATE trading_orders SET quantity = $1 WHERE id = $2", [newQty, orderId]);
        }
        // 成交记录与日均价（内存存储早就在记；列宽装不下的天价单不记，不影响成交）
        const price = Number(order.price);
        if (totalCost <= 2_147_483_647 && price <= 99_999_999) {
          const sellerId = order.type === "sell" ? posterId : buyerId;
          const tradeBuyerId = order.type === "sell" ? buyerId : posterId;
          await client.query(
            "INSERT INTO trade_history (buyer_id, seller_id, item_id, quantity, total_price) VALUES ($1, $2, $3, $4, $5)",
            [tradeBuyerId, sellerId, order.item_id, quantity, totalCost],
          );
          await client.query(
            `INSERT INTO price_history (item_id, record_date, average_price, min_price, max_price, volume)
             VALUES ($1, CURRENT_DATE, $2, $3, $3, $4)
             ON CONFLICT (item_id, record_date) DO UPDATE SET
               average_price = (price_history.average_price * price_history.volume + EXCLUDED.average_price * EXCLUDED.volume)
                               / (price_history.volume::bigint + EXCLUDED.volume),
               min_price = LEAST(price_history.min_price, EXCLUDED.min_price),
               max_price = GREATEST(price_history.max_price, EXCLUDED.max_price),
               volume = LEAST(2147483647, price_history.volume::bigint + EXCLUDED.volume)::int`,
            [order.item_id, price, price, quantity],
          );
        }
        notifyUser(posterId, {
          kind: "order:filled",
          orderId,
          itemId: order.item_id,
          quantity,
          gold: totalCost,
          remaining: Math.max(0, newQty),
        });
        return { success: true, message: "交易成功" };
      });
    },
    async cancelTradingOrder({ userId, orderId }) {
      return withTransaction(async (client) => {
        const del = await client.query(
          "DELETE FROM trading_orders WHERE id = $1 AND user_id = $2 RETURNING *",
          [orderId, userId],
        );
        if (del.rowCount === 0) {
          const exists = await client.query("SELECT user_id FROM trading_orders WHERE id = $1", [orderId]);
          if (!exists.rows[0]) throw new Error("订单不存在");
          throw new Error("无权取消此订单");
        }
        const order = del.rows[0];
        const { state, contentVersion } = await txLoadStateForUpdate(client, userId);
        if (order.type === "sell") {
          state.inventory[order.item_id] = (state.inventory[order.item_id] || 0) + order.quantity;
        } else if (order.type === "buy") {
          state.inventory.gold = (state.inventory.gold || 0) + order.quantity * order.price;
        }
        await txPersistState(client, userId, state, contentVersion);
      });
    },
    async getMyTradingOrders({ userId }) {
      const result = await pool.query("SELECT * FROM trading_orders WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
      return result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        itemId: r.item_id,
        quantity: r.quantity,
        price: r.price,
        type: r.type,
        createdAt: r.created_at.toISOString(),
      })) as TradingOrder[];
    },
    async getRecentTrades({ itemId, days, now }) {
      const { rows } = await pool.query(
        `SELECT buyer_id, seller_id, quantity, total_price, completed_at FROM (
           SELECT t.*, row_number() OVER (PARTITION BY buyer_id, seller_id, completed_at::date ORDER BY completed_at DESC) AS rn
             FROM trade_history t
            WHERE item_id = $1 AND completed_at >= $2::timestamptz - make_interval(days => $3)
         ) recent
          WHERE rn <= $5
          ORDER BY completed_at DESC LIMIT $4`,
        [itemId, now.toISOString(), days, TRADE_KEEP_PER_ITEM, TRADE_KEEP_PER_PAIR_DAY],
      );
      return rows.map((r) => ({
        itemId,
        price: Math.round(Number(r.total_price) / Math.max(1, Number(r.quantity))),
        quantity: Number(r.quantity),
        buyerId: r.buyer_id,
        sellerId: r.seller_id,
        at: (r.completed_at as Date).toISOString(),
      })) as TradeRecord[];
    },
    async close() {
      await pool.end();
    },
    async healthCheck() {
      const start = Date.now();
      try {
        await pool.query("SELECT 1");
        return { ok: true, latencyMs: Date.now() - start };
      } catch {
        return { ok: false, latencyMs: Date.now() - start };
      }
    },
  };
  return storage;
}
