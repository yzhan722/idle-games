import { highestActiveBonus } from './set_bonus';
import { ensureProgression } from './progression_state';
import { applyPlayerCommand, commandOperationHash, commandRevision, PlayerCommandConflict, PlayerCommandOperationMismatch, type PlayerCommand, type PlayerCommandReceipt } from './player_commands';
import { Pool } from "pg";
import {
  findEnhancementRuleForItem,
  hasEnhancementSkill,
  enhancementUnlockIds,
} from "./enhancement_utils";
import type { 
  UserRecord, 
  EnhancedPlayerState,
  EnhancedContentPack,
  Party,
  EnhancementRequest,
  EnhancementResult,
  EnhancementServiceRequest,
  EnhancementProvider,
  DurabilityInfo,
  RepairRequest,
  RepairResult,
  PriceHistory,
  PlayerEquipmentStats,
  EquipmentSetBonus,
} from "./types";
import type { MarketQuote, Storage, TradingOrder } from "./storage";
import {
  addMembership,
  membershipKeyForSend,
  membershipKeys,
  payloadChannel,
} from "./chat_channels";
import { worldAnnouncements } from "./world_announce";
import { socketFromWsConnection } from "./ws_socket";
import { 
  appendLog, 
  defaultEnhancedPlayerState, 
  normalizeInv, 
  pickSeed, 
  simulateToNow,
  calculateTradingFee,
  getXpForLevel,
  startLifeActionNow,
  grantProfessionXp,
  ensureProfessionSkills,
  professionLevelForTree,
  CRAFT_SKILL_BY_PROFESSION,
  UsernameTaken,
} from "./storage";
import { enhancementRequestUserColumn } from "./sql_identifiers";
import { isStageOpen } from "./zones";
import { randomUUID } from "crypto";
import {
  MAX_ENHANCEMENT_LEVEL,
  PROTECTION_MIRROR_ID,
  enhancementBonusPct,
  enhancementMaterials,
  enhancementSlotMultiplier,
  enhancementStatMultiplier,
  enhancementSuccessBreakdown,
  ensureEnhancingSkill,
  equippedEnhanceToolBonus,
  itemLevelForEnhancement,
  ownsEnhanceableItem,
  performEnhancementAttempt,
} from "./enhancement_math";

export async function createPgStorage(databaseUrl: string): Promise<Storage> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  // WebSocket 连接管理（内存中）
  type WsConn = { socket: any; channels: Set<string> };
  const wsConnections = new Map<string, WsConn>();
  const channelMembers = new Map<string, Set<string>>();

  function broadcast(channel: string, msg: unknown) {
    const members = channelMembers.get(channel);
    if (!members) return;
    const text = JSON.stringify(msg);
    for (const uid of members) {
      const c = wsConnections.get(uid);
      if (!c?.socket || typeof c.socket.send !== 'function') continue;
      try { c.socket.send(text); } catch {}
    }
  }

  function nowIso() { return new Date().toISOString(); }

  /** 通用 WS 推送：市场成交、服务单、队伍事件实时下发给指定用户。 */
  function notifyUser(userId: string, payload: Record<string, unknown>) {
    const c = wsConnections.get(userId);
    if (!c?.socket || typeof c.socket.send !== 'function') return;
    try { c.socket.send(JSON.stringify({ type: 'notify', ts: nowIso(), ...payload })); } catch {}
  }

  /** 把成员的 isOnline 快照写回其所属队伍的 members jsonb（单语句，覆盖其所在任一队）。 */
  async function patchMemberOnline(userId: string, isOnline: boolean) {
    try {
      await pool.query(
        `UPDATE parties SET members = (
           SELECT jsonb_agg(CASE WHEN m->>'userId' = $2 THEN m || $3::jsonb ELSE m END)
           FROM jsonb_array_elements(members) m
         )
         WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(members) m WHERE m->>'userId' = $2)`,
        [userId, userId, JSON.stringify({ isOnline })]
      );
    } catch {}
  }

  /**
   * 事务内加入队伍（joinParty / acceptPartyInvite 共用）。
   * 调用方必须在 withTransaction 上下文中；队伍行会被 FOR UPDATE 锁定。
   */
  async function txJoinParty(client: any, userId: string, partyId: string): Promise<Party> {
    const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
    if (!partyResult.rows[0]) throw new Error("party_not_found");
    const party = partyResult.rows[0];
    const members = party.members as any[];

    if (members.length >= 6) throw new Error("party_full");
    if (members.some((m: any) => m.userId === userId)) throw new Error("already_in_party");

    members.push({ userId, role: 'member', joinedAt: nowIso(), isOnline: wsConnections.has(userId) });
    await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);

    const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
    if (st.partyState) throw new Error("already_in_party");
    st.partyState = { partyId, role: 'member', isLeader: false, joinedAt: nowIso() };
    appendLog(st, `加入队伍：${partyId}`);
    await txPersistState(client, userId, st, contentVersion);

    return { id: partyId, leaderId: party.leader_id, members, createdAt: party.created_at.toISOString() } as Party;
  }

  // ========== 并发控制 ==========
  // 1) 进程内 per-user 互斥：保证同一用户的请求串行执行，避免同实例下
  //    "读-改-写" 交错导致的丢更新。
  const userLocks = new Map<string, Promise<unknown>>();
  function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = userLocks.get(userId) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    // 链尾清理，避免 Map 无限增长
    userLocks.set(
      userId,
      next.catch(() => {}).finally(() => {
        if (userLocks.get(userId) === next) userLocks.delete(userId);
      })
    );
    return next;
  }

  // 跨进程乐观锁：版本随状态复制传播，缺失版本的写入必须拒绝。

  // ========== 初始化 ==========
  async function init() {
    // 核心表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guest_device_id TEXT UNIQUE,
        google_sub TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_resume_token_hash TEXT"
    );
    // 用户名/密码登录（002_password_auth 的 runtime 等价迁移）
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32)");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL"
    );
    // 会话版本号：JWT 凭据吊销用（幂等迁移）
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1"
    );
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_guest_resume_token_hash_key ON users (guest_resume_token_hash)"
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
    // 兼容已存在的旧表：补充 version 列（幂等）
    await pool.query(
      "ALTER TABLE player_states ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0"
    );
    // 交易表
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
    // 组队表
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
    // 强化服务请求表
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
    // 交易订单表
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
    // 命令幂等收据：与玩家状态写在同一事务提交，保证跨实例的"恰好一次"
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
  }

  async function getCommandReceipt(userId: string, operationId: string): Promise<PlayerCommandReceipt | undefined> {
    const { rows } = await pool.query(
      'SELECT operation_id, request_hash, result, state_revision, created_at FROM player_command_receipts WHERE user_id = $1 AND operation_id = $2',
      [userId, operationId]
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

  // ========== 用户管理 ==========
  const USER_COLS = "id, guest_device_id, google_sub, created_at, guest_resume_token_hash, username, password_hash, auth_version";
  function mapUser(r: {
    id: string;
    guest_device_id: string | null;
    google_sub: string | null;
    created_at: Date;
    guest_resume_token_hash?: string | null;
    username?: string | null;
    password_hash?: string | null;
    auth_version?: number | null;
  }): UserRecord {
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
    const existing = await pool.query(
      "SELECT " + USER_COLS + " FROM users WHERE guest_device_id = $1",
      [deviceId]
    );
    if (existing.rows[0]) return mapUser(existing.rows[0]);
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES (gen_random_uuid(), $1) RETURNING " + USER_COLS,
      [deviceId]
    );
    if (!created.rows[0]) {
      // 并发插入，重新查询
      const again = await pool.query("SELECT " + USER_COLS + " FROM users WHERE guest_device_id = $1", [deviceId]);
      return mapUser(again.rows[0]);
    }
    return mapUser(created.rows[0]);
  }

  async function createGuestUser(): Promise<UserRecord> {
    const id = randomUUID();
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES ($1, $2) RETURNING " + USER_COLS,
      [id, `guest_${id}`]
    );
    return mapUser(created.rows[0]);
  }

  async function getUser(userId: string): Promise<UserRecord | null> {
    const found = await pool.query(
      "SELECT " + USER_COLS + " FROM users WHERE id = $1",
      [userId]
    );
    return found.rows[0] ? mapUser(found.rows[0]) : null;
  }

  async function setGuestResumeTokenHash(userId: string, hash: string): Promise<void> {
    const updated = await pool.query(
      "UPDATE users SET guest_resume_token_hash = $2 WHERE id = $1",
      [userId, hash]
    );
    if (updated.rowCount !== 1) throw new Error("user_not_found");
  }

  async function findUserByResumeTokenHash(hash: string): Promise<UserRecord | null> {
    const found = await pool.query(
      "SELECT " + USER_COLS + " FROM users WHERE guest_resume_token_hash = $1",
      [hash]
    );
    return found.rows[0] ? mapUser(found.rows[0]) : null;
  }

  // ========== 玩家状态 ==========
  async function getOrCreatePlayerState(userId: string, contentVersion: string): Promise<EnhancedPlayerState> {
    const existing = await pool.query("SELECT state_json, version FROM player_states WHERE user_id = $1", [userId]);
    if (existing.rows[0]) {
      const state = existing.rows[0].state_json as EnhancedPlayerState;
      // 记录读到的版本号，供 persistState 做乐观锁 CAS
      state.stateRevision = Number(existing.rows[0].version);
      return state;
    }
    const state = defaultEnhancedPlayerState(contentVersion);
    await pool.query(
      "INSERT INTO player_states (user_id, content_version, state_json, version) VALUES ($1, $2, $3, 0) ON CONFLICT (user_id) DO NOTHING",
      [userId, contentVersion, JSON.stringify(state)]
    );
    // Another instance may have created or advanced this player's state while we inserted.
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
      [userId, state.contentVersion, JSON.stringify({ ...state, stateRevision: nextRevision }), expectedVersion]
    );
    if (res.rowCount !== 1) throw new Error("state_version_conflict");
    state.stateRevision = nextRevision;
  }

  // ========== 事务辅助 ==========
  // 在单个数据库连接上执行 BEGIN/COMMIT 包裹的逻辑，出错自动 ROLLBACK。
  // 用于交易/经济这类必须原子化的多步写入（买卖双方 + 挂单 + 流水）。
  async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }

  // 在事务内以行锁（FOR UPDATE）读取玩家状态，避免并发读-改-写交错。
  // 注意：事务内的写入不走 CAS，而是依赖行锁串行化，保证强一致。
  async function txLoadStateForUpdate(
    client: import("pg").PoolClient,
    userId: string
  ): Promise<{ state: EnhancedPlayerState; contentVersion: string }> {
    const res = await client.query(
      "SELECT content_version, state_json, version FROM player_states WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    if (!res.rows[0]) {
      const state = defaultEnhancedPlayerState("unknown");
      await client.query(
        "INSERT INTO player_states (user_id, content_version, state_json, version) VALUES ($1, $2, $3, 0)",
        [userId, "unknown", JSON.stringify(state)]
      );
      // 重新锁定刚插入的行
      await client.query("SELECT 1 FROM player_states WHERE user_id = $1 FOR UPDATE", [userId]);
      state.stateRevision = 0;
      return { state, contentVersion: "unknown" };
    }
    return {
      state: { ...res.rows[0].state_json, stateRevision: Number(res.rows[0].version) } as EnhancedPlayerState,
      contentVersion: res.rows[0].content_version as string,
    };
  }

  // 在事务内写回玩家状态并自增 version。
  // 行锁保护事务，返回的状态继续携带最新版本。
  async function txPersistState(
    client: import("pg").PoolClient,
    userId: string,
    state: EnhancedPlayerState,
    contentVersion: string
  ): Promise<void> {
    await client.query(
      "UPDATE player_states SET content_version = $2, state_json = $3, version = version + 1, updated_at = now() WHERE user_id = $1",
      [userId, contentVersion, JSON.stringify({ ...state, stateRevision: state.stateRevision! + 1 })]
    );
    state.stateRevision = state.stateRevision! + 1;
  }

  // ========== 返回 Storage 实现 ==========
  const storage: Storage = {
    init,
    findOrCreateGuestUser,
    createGuestUser,
    getUser,
    setGuestResumeTokenHash,
    findUserByResumeTokenHash,

    async bindGoogle(userId: string, googleSub: string) {
      const existing = await pool.query("SELECT id FROM users WHERE google_sub = $1 AND id <> $2", [googleSub, userId]);
      if (existing.rows[0]) throw new Error("google_sub_already_bound");
      // 凭据变更即吊销旧会话
      await pool.query("UPDATE users SET google_sub = $1, auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $2", [googleSub, userId]);
    },

    async findUserByGoogleSub(googleSub: string) {
      const found = await pool.query(
        "SELECT " + USER_COLS + " FROM users WHERE google_sub = $1",
        [googleSub]
      );
      return found.rows[0] ? mapUser(found.rows[0]) : null;
    },

    async invalidateSessions(userId: string) {
      await pool.query("UPDATE users SET auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $1", [userId]);
    },

    async createPasswordUser(username: string, passwordHash: string) {
      try {
        const created = await pool.query(
          "INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) RETURNING " + USER_COLS,
          [randomUUID(), username, passwordHash]
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
        [username]
      );
      return found.rows[0] ? mapUser(found.rows[0]) : null;
    },

    async bindPassword(userId: string, username: string, passwordHash: string) {
      const existing = await pool.query("SELECT id FROM users WHERE lower(username) = lower($1) AND id <> $2", [username, userId]);
      if (existing.rows[0]) throw new UsernameTaken();
      const updated = await pool.query("UPDATE users SET username = $1, password_hash = $2, auth_version = COALESCE(auth_version, 1) + 1 WHERE id = $3", [username, passwordHash, userId]);
      if (updated.rowCount !== 1) throw new Error("user_not_found");
    },

    getOrCreatePlayerState,

    async simulateToNow({ userId, state, now, contentPack }) {
      return withUserLock(userId, async () => {
        const result = simulateToNow({ state: structuredClone(state), now, contentPack });
        const next = { ...result.state as EnhancedPlayerState, inventory: normalizeInv(result.state.inventory) };
        await persistState(userId, next);
        for (const text of worldAnnouncements(state, next, contentPack, userId)) {
          broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
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
            // A committed receipt replays its stored result instead of re-applying the op.
            const receipt = await getCommandReceipt(command.userId, command.operationId);
            if (receipt) {
              if (receipt.requestHash !== requestHash) throw new PlayerCommandOperationMismatch();
              return { state: snapshot, result: receipt.result as T, deduplicated: true };
            }
          }
          const revision = commandRevision(snapshot, command.expectedRevision);
          // 模拟在短数据库事务外执行；单次结算窗口 ≤120s，无需分块续算。
          const settled = simulateToNow({ state: structuredClone(snapshot), now: command.now, contentPack: command.contentPack });
          const outcome = applyPlayerCommand(settled.state as EnhancedPlayerState, command.apply);
          outcome.state.inventory = normalizeInv(outcome.state.inventory);
          ensureProgression(outcome.state, command.now);
          try {
            await withTransaction(async client => {
              const current = await txLoadStateForUpdate(client, command.userId);
              const currentRevision = commandRevision(current.state);
              if (currentRevision !== revision) throw new PlayerCommandConflict(currentRevision);
              outcome.state.stateRevision = revision;
              await txPersistState(client, command.userId, outcome.state, outcome.state.contentVersion);
              if (command.operationId && requestHash) {
                const inserted = await client.query(
                  'INSERT INTO player_command_receipts (user_id, operation_id, request_hash, result, state_revision) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, operation_id) DO NOTHING',
                  [command.userId, command.operationId, requestHash, JSON.stringify(outcome.result ?? null), revision]
                );
                if (inserted.rowCount === 0) throw new PlayerCommandConflict(currentRevision);
              }
            });
            for (const text of worldAnnouncements(snapshot, outcome.state as EnhancedPlayerState, command.contentPack, command.userId)) {
              broadcast("world", { type: "chat:system", channel: "world", ts: nowIso(), text });
            }
            return outcome;
          } catch (error) {
            // Retry only an uncommitted, pure command after rereading its authoritative snapshot.
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
          'INSERT INTO player_command_receipts (user_id, operation_id, request_hash, result, state_revision) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, operation_id) DO NOTHING',
          [userId, operationId, requestHash, JSON.stringify(result ?? null), 0]
        );
        if (inserted.rowCount === 0) {
          // 并发重试抢先写入：以收据为准返回去重结果
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

    // ========== 技能系统 ==========
    async getSkillTree({ professionId, contentPack }) {
      const tree = contentPack.professionTrees?.find(t => t.professionId === professionId);
      if (!tree) throw new Error("profession_tree_not_found");
      return tree;
    },

    async unlockSkillNode({ userId, professionId, nodeId, contentPack }) {
      // 包 withUserLock：解锁节点是读改写（修改 unlockedRecipes），并发会丢更新
      // 或重复解锁。串行化后由 CAS 兜底跨进程一致性。
      return withUserLock(userId, async () => {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const tree = contentPack.professionTrees?.find(t => t.professionId === professionId);
      if (!tree) return { success: false, message: "职业技能树不存在" };

      const node = tree.skillNodes.find(n => n.id === nodeId);
      if (!node) return { success: false, message: "技能节点不存在" };

      const skill = st.skills[`skill_${professionId}`];
      if (!skill || professionLevelForTree(st, professionId) < node.requirements.level) {
        return { success: false, message: `技能等级不足，需要 ${node.requirements.level} 级` };
      }

      // 幂等拦截：如果节点已解锁，直接返回成功，避免重复写入与不必要的日志。
      if (skill.unlockedRecipes.includes(nodeId)) {
        return { success: true };
      }

      for (const prereq of node.requirements.prerequisites) {
        if (!skill.unlockedRecipes.includes(prereq)) {
          return { success: false, message: `缺少前置技能：${prereq}` };
        }
      }

      const unlocks = [...(node.unlocks.recipes || []), ...(node.unlocks.actions || [])];
      for (const id of enhancementUnlockIds(professionId, nodeId, node.unlocks.enhancements)) {
        if (!skill.unlockedRecipes.includes(id)) skill.unlockedRecipes.push(id);
      }
      skill.unlockedRecipes.push(...unlocks.filter(id => !skill.unlockedRecipes.includes(id)));
      if (!skill.unlockedRecipes.includes(nodeId)) skill.unlockedRecipes.push(nodeId);

      appendLog(st, `解锁技能节点：${node.name}`);
      await persistState(userId, st);
      return { success: true };
      });
    },

    async getPlayerSkillProgress({ userId, professionId }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        ensureProfessionSkills(st);
        const key = `skill_${professionId}`;
        const skill = st.skills[key];
        if (!skill) throw new Error("state_not_found");
        const craftSkill = st.skills[CRAFT_SKILL_BY_PROFESSION[professionId] || ""];
        return {
          ...skill,
          level: Math.max(skill.level, craftSkill?.level || 0),
          gatherLevel: skill.level,
          gatherXp: skill.xp,
          craftLevel: craftSkill?.level ?? 0,
          craftXp: craftSkill?.xp ?? 0,
        };
      });
    },

    async awardSkillExperience({ userId, professionId, xpAmount }) {
      // 包 withUserLock：加经验/升级是读改写，并发会丢失经验或重复升级。
      return withUserLock(userId, async () => {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const key = `skill_${professionId}`;
      if (!st.skills[key]) {
        st.skills[key] = { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 };
      }
      const skill = st.skills[key];
      const levelBefore = skill.level;
      skill.xp += xpAmount;
      let xpNeeded = getXpForLevel(skill.level);
      while (skill.xp >= xpNeeded && skill.level < 200) {
        skill.level++;
        skill.xp -= xpNeeded;
        appendLog(st, `${professionId} 技能升级到 ${skill.level} 级！`);
        xpNeeded = getXpForLevel(skill.level);
      }
      if (skill.level >= 200) skill.level = 200;
      await persistState(userId, st);
      return { leveledUp: skill.level > levelBefore, newLevel: skill.level };
      });
    },

    // ========== 装备强化 ==========
    async enhanceEquipment({ userId, request, contentPack, rng }) {
      // 包 withUserLock：强化是"读材料/等级 → 扣材料 → 随机判定 → 写"的读改写，
      // 并发请求会读到同一份材料与等级，导致刷材料/越级强化。串行化后由
      // CAS 兜底跨进程一致性。
      return withUserLock(userId, async () => {
      // 服务费转账必须在同一事务内：请求者扣费与提供者收款要么同时成功要么同时回滚
      return withTransaction(async (client) => {
      const providerId = request.serviceProviderId;
      // 自我接单 = 用自己的号收自己的服务费（印钞漏洞），在任何读写前拒绝
      if (providerId === userId) {
        const lv = 0;
        return { success: false, previousLevel: lv, newLevel: lv, consumedMaterials: {}, failureReason: "不能向自己购买强化服务" };
      }
      if (providerId) {
        // txLoadStateForUpdate 会对不存在的 userId 触发外键违规——先做一次廉价存在性检查
        const exists = await client.query("SELECT 1 FROM users WHERE id = $1", [providerId]);
        if (!exists.rows[0]) {
          const lv0 = 0;
          return { success: false, previousLevel: lv0, newLevel: lv0, consumedMaterials: {}, failureReason: "服务提供者不存在" };
        }
      }
      // 固定加锁顺序（按 userId 字典序），避免双向服务请求互锁死锁
      const lockFirst = providerId && providerId < userId ? providerId : userId;
      const lockSecond = providerId && providerId < userId ? userId : providerId;
      const loaded1 = await txLoadStateForUpdate(client, lockFirst);
      const loaded2 = lockSecond ? await txLoadStateForUpdate(client, lockSecond) : loaded1;
      const userLoaded = lockFirst === userId ? loaded1 : loaded2;
      const providerLoaded = providerId ? (lockFirst === providerId ? loaded1 : loaded2) : undefined;
      const st = userLoaded.state;
      const providerState = providerLoaded?.state;
      const currentLevel = st.equipment.enhancementLevels?.[request.itemId] || 0;
      const item = (contentPack.items as any[]).find(i => i.id === request.itemId);
      if (!item) return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "未知物品" };

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const rule = ruleMatch?.rule ?? null;
      if (!rule) {
        return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "该物品无法强化" };
      }

      // 服务费语义与内存适配器一致：提供者必须存在且有资质，请求者真金实付
      let serviceFee = 0;
      if (providerId) {
        if (!providerState) {
          return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "服务提供者不存在" };
        }
        const requiredProfession = ruleMatch?.requiredProfession ?? rule.requiredProfession;
        const providerSkill = providerState.skills?.[`skill_${requiredProfession}`];
        if (!providerSkill || !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, rule.itemType)) {
          return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "服务提供者不具备对应强化技能" };
        }
        serviceFee = Math.floor((rule.materials.find((m: { itemId: string }) => m.itemId === "gold")?.quantity || 100) * 0.5);
        if ((st.inventory.gold || 0) < serviceFee) {
          return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "金币不足以支付服务费" };
        }
      }

      const result = performEnhancementAttempt({
        player: st,
        item,
        rule,
        request,
        pack: contentPack,
        rng,
        xpForLevel: getXpForLevel,
      });
      if (Object.keys(result.consumedMaterials).length > 0) {
        appendLog(
          st,
          result.success
            ? `装备强化成功：${item.name} +${result.previousLevel} → +${result.newLevel}（强化经验 +${result.xpGained}）`
            : `${item.name}${result.failureReason}（强化经验 +${result.xpGained}）`
        );
        for (const level of result.levelUps || []) appendLog(st, `强化技能升级到 ${level} 级！`);
        // 服务费是转账不是铸造：请求者扣、提供者收，同一事务原子完成
        if (providerId && providerState && serviceFee > 0) {
          st.inventory.gold = (st.inventory.gold || 0) - serviceFee;
          providerState.inventory.gold = (providerState.inventory.gold || 0) + serviceFee;
          appendLog(providerState, `提供强化服务获得 ${serviceFee} 金币`);
          await txPersistState(client, providerId, providerState, providerLoaded!.contentVersion);
        }
        await txPersistState(client, userId, st, userLoaded.contentVersion);
      }
      return result;
      });
      });
    },

    async getEnhancementInfo({ userId, itemId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const currentLevel = st.equipment.enhancementLevels?.[itemId] || 0;
      const item = (contentPack.items as any[]).find(i => i.id === itemId);
      if (!item) throw new Error("item_not_found");

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const rule = ruleMatch?.rule ?? null;
      const requiredProfession = ruleMatch?.requiredProfession;
      const skill = ensureEnhancingSkill(st);
      const itemLevel = itemLevelForEnhancement(item, contentPack);
      const isOwned = ownsEnhanceableItem(st, itemId);

      if (!rule) return {
        currentLevel,
        maxLevel: 0,
        nextLevelCost: {},
        successRate: 0,
        baseSuccessRate: 0,
        levelModifier: 0,
        overLevelBonus: 0,
        toolBonus: 0,
        currentStatBonusPct: 0,
        nextStatBonusPct: 0,
        slotMultiplier: enhancementSlotMultiplier(item),
        itemLevel,
        enhancingLevel: skill.level,
        enhancingXp: skill.xp,
        canEnhance: false,
        canAfford: false,
        isOwned,
        itemType: undefined,
        protection: {
          itemId: PROTECTION_MIRROR_ID,
          available: st.inventory[PROTECTION_MIRROR_ID] || 0,
          failWithout: "失败后重置为 +0",
          failWith: "消耗 1 面保护镜；失败只降低 1 级",
        },
      };

      const nextLevel = currentLevel + 1;
      const maxLevel = Math.min(MAX_ENHANCEMENT_LEVEL, Number(rule.maxLevel || MAX_ENHANCEMENT_LEVEL));
      const nextLevelCost = nextLevel <= maxLevel ? enhancementMaterials(rule, nextLevel, undefined, item, contentPack) : {};
      const rates = enhancementSuccessBreakdown(nextLevel, skill.level, itemLevel, equippedEnhanceToolBonus(st, contentPack));
      const canAfford = Object.entries(nextLevelCost).every(([id, qty]) => (st.inventory[id] || 0) >= qty);

      return {
        currentLevel,
        maxLevel,
        nextLevelCost,
        successRate: rates.finalRate,
        baseSuccessRate: rates.baseRate,
        levelModifier: rates.levelModifier,
        overLevelBonus: rates.overLevelBonus,
        toolBonus: rates.toolBonus,
        currentStatBonusPct: enhancementBonusPct(currentLevel) * enhancementSlotMultiplier(item),
        nextStatBonusPct: enhancementBonusPct(Math.min(nextLevel, maxLevel)) * enhancementSlotMultiplier(item),
        slotMultiplier: enhancementSlotMultiplier(item),
        itemLevel,
        enhancingLevel: skill.level,
        enhancingXp: skill.xp,
        canEnhance: isOwned && currentLevel < maxLevel,
        canAfford,
        isOwned,
        requiredProfession,
        itemType: rule?.itemType,
        protection: {
          itemId: PROTECTION_MIRROR_ID,
          available: st.inventory[PROTECTION_MIRROR_ID] || 0,
          failWithout: "失败后重置为 +0",
          failWith: "消耗 1 面保护镜；失败只降低 1 级",
        },
      };
    },

    async getEnhancementProviders({ itemType, contentPack }) {
      const rule = contentPack.enhancementRules?.find(r => r.itemType === itemType);
      if (!rule) return [];

      // 仅查询拥有对应职业技能字段的玩家，并在 SQL 层用 JSONB 路径过滤 + LIMIT，
      // 避免把全部玩家的完整状态 JSON 拉进内存做全表扫描（玩家量大时是内存/性能炸弹）。
      const skillKey = `skill_${rule.requiredProfession}`;
      const result = await pool.query(
        `SELECT user_id, state_json
           FROM player_states
          WHERE state_json -> 'skills' ? $1
          LIMIT 200`,
        [skillKey]
      );
      const providers: EnhancementProvider[] = [];

      for (const row of result.rows) {
        const state = row.state_json as EnhancedPlayerState;
        const skill = state.skills[`skill_${rule.requiredProfession}`];
        if (skill && hasEnhancementSkill(skill.unlockedRecipes, rule.requiredProfession, rule.itemType)) {
          providers.push({
            userId: row.user_id,
            profession: rule.requiredProfession,
            skillLevel: skill.level,
            serviceFee: Math.floor((rule.materials.find((m: any) => m.itemId === 'gold')?.quantity || 100) * 0.5),
            isOnline: wsConnections.has(row.user_id),
            completedServices: 0,
            rating: 5.0,
          });
        }
      }
      return providers.sort((a, b) => b.skillLevel - a.skillLevel);
    },

    // ========== 强化服务请求 ==========
    async createEnhancementServiceRequest({ requesterId, providerId, itemId, targetLevel, message, contentPack }) {
      // 自我接单 = 用自己的号收自己的服务费，禁止（与内存适配器一致）
      if (requesterId === providerId) throw new Error("不能向自己发起强化服务");
      // 下单时就校验：请求者得真拥有该物品、物品得可强化、提供者得有资质——
      // 不是等接单时才发现（内存适配器对齐）
      return withTransaction(async (client) => {
        const lockFirst = requesterId < providerId ? requesterId : providerId;
        const lockSecond = requesterId < providerId ? providerId : requesterId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const requesterState = (lockFirst === requesterId ? loaded1 : loaded2).state;
        const providerState = (lockFirst === providerId ? loaded1 : loaded2).state;

        if (!requesterState.inventory[itemId] || requesterState.inventory[itemId] < 1) {
          throw new Error("您没有该物品");
        }
        const item = (contentPack.items as any[]).find((i: any) => i.id === itemId);
        const ruleMatch = item ? findEnhancementRuleForItem(item, contentPack) : null;
        const enhancementRule = ruleMatch?.rule;
        if (!enhancementRule) throw new Error("该物品无法强化");

        const requiredProfession = ruleMatch?.requiredProfession ?? enhancementRule.requiredProfession;
        const providerSkill = providerState.skills?.[`skill_${requiredProfession}`];
        if (!providerSkill || !hasEnhancementSkill(providerSkill.unlockedRecipes, requiredProfession, enhancementRule.itemType)) {
          throw new Error("该服务提供者不具备对应强化技能");
        }

        const serviceFee = Math.floor((enhancementRule.materials.find((m: any) => m.itemId === 'gold')?.quantity || 100) * 0.5);
        const result = await client.query(
          `INSERT INTO enhancement_requests (requester_id, provider_id, item_id, target_level, service_fee, message)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [requesterId, providerId, itemId, targetLevel, serviceFee, message]
        );
        const row = result.rows[0];
        notifyUser(providerId, { kind: "enhancement:service_request", requestId: row.id, requesterId, itemId, targetLevel, serviceFee });
        return {
          id: row.id, requesterId: row.requester_id, providerId: row.provider_id,
          itemId: row.item_id, targetLevel: row.target_level, serviceFee: row.service_fee,
          message: row.message, status: row.status, createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        } as EnhancementServiceRequest;
      });
    },

    async respondToEnhancementServiceRequest({ requestId, providerId, accepted, message, contentPack }) {
      const result = await pool.query("SELECT * FROM enhancement_requests WHERE id = $1", [requestId]);
      if (!result.rows[0]) throw new Error("服务请求不存在");
      const req = result.rows[0];
      if (req.provider_id !== providerId) throw new Error("您无权响应此请求");
      if (req.status !== 'pending') throw new Error("请求已被处理");

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
            [enhanceResult.failureReason || "强化失败", requestId]
          );
          notifyUser(req.requester_id, { kind: "enhancement:service_completed", requestId, success: false, failureReason: enhanceResult.failureReason });
          return { success: false, message: enhanceResult.failureReason || "强化失败" };
        }
      }

      const newStatus = accepted ? 'completed' : 'rejected';
      await pool.query(
        "UPDATE enhancement_requests SET status = $1, response_message = $2, updated_at = now() WHERE id = $3",
        [newStatus, message, requestId]
      );
      notifyUser(req.requester_id, accepted
        ? { kind: "enhancement:service_completed", requestId, success: true }
        : { kind: "enhancement:service_rejected", requestId, message });
      return { success: true, message: accepted ? "已接受" : "已拒绝" };
    },

    async getEnhancementServiceRequests({ userId, type }) {
      const col = enhancementRequestUserColumn(type);
      const result = await pool.query(
        `SELECT * FROM enhancement_requests WHERE ${col} = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows.map(r => ({
        id: r.id, requesterId: r.requester_id, providerId: r.provider_id,
        itemId: r.item_id, targetLevel: r.target_level, serviceFee: r.service_fee,
        message: r.message, status: r.status, responseMessage: r.response_message,
        createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
      })) as EnhancementServiceRequest[];
    },


    // ========== 组队系统 ==========
    async createParty({ userId, name }) {
      // 事务 + 行锁：先锁定并校验玩家未在队伍中，再建队并写回 partyState，
      // 避免并发创建/加入导致一人身处多队。
      return withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        if (st.partyState) throw new Error("already_in_party");

        const result = await client.query(
          `INSERT INTO parties (leader_id, name, members) VALUES ($1, $2, $3) RETURNING *`,
          [userId, name || null, JSON.stringify([{ userId, role: 'leader', joinedAt: nowIso(), isOnline: true }])]
        );
        const row = result.rows[0];
        st.partyState = { partyId: row.id, role: 'leader', isLeader: true, joinedAt: nowIso() };
        appendLog(st, `创建队伍：${row.id}`);
        await txPersistState(client, userId, st, contentVersion);

        return {
          id: row.id, leaderId: row.leader_id, members: row.members,
          createdAt: row.created_at.toISOString(), currentActivity: row.current_activity
        } as Party;
      });
    },

    async joinParty({ userId, partyId }) {
      // 事务 + 行锁：锁定队伍行后再"读成员 → 校验人数 → 写回"，避免并发加入
      // 各自读到旧成员数导致超员。
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
        [Math.min(200, Math.max(1, limit ?? 50))]
      );
      return result.rows.map(r => ({
        id: r.id, name: r.name ?? undefined, leaderId: r.leader_id,
        memberCount: (r.members as any[]).length, hasActivity: !!r.current_activity,
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
        target.partyInvites = target.partyInvites.filter(i => Date.parse(i.invitedAt) > now - 24 * 3600_000);
        if (target.partyInvites.some(i => i.partyId === partyId)) return { success: true, message: "邀请已发送" };
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
        const invite = (st.partyInvites || []).find(i => i.partyId === partyId);
        if (!invite) throw new Error("invite_not_found");
        if (Date.parse(invite.invitedAt) < Date.now() - 24 * 3600_000) {
          st.partyInvites = (st.partyInvites || []).filter(i => i !== invite);
          await txPersistState(client, userId, st, contentVersion);
          throw new Error("invite_expired");
        }
        st.partyInvites = (st.partyInvites || []).filter(i => i.partyId !== partyId);
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
        st.partyInvites = (st.partyInvites || []).filter(i => i.partyId !== partyId);
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
        if (conn) { conn.channels.delete(`party:${partyId}`); channelMembers.get(`party:${partyId}`)?.delete(memberId); }
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
        const target = members.find((m: any) => m.userId === memberId);
        if (!target) return { success: false, message: "该玩家不在队伍中" };
        for (const m of members) m.role = m.userId === memberId ? 'leader' : 'member';
        await client.query("UPDATE parties SET leader_id = $1, members = $2 WHERE id = $3", [memberId, JSON.stringify(members), partyId]);
        const sorted = [userId, memberId].sort();
        for (const uid of sorted) {
          const { state: s, contentVersion } = await txLoadStateForUpdate(client, uid);
          if (s.partyState) {
            s.partyState.isLeader = uid === memberId;
            s.partyState.role = s.partyState.isLeader ? 'leader' : 'member';
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
      // 事务 + 行锁：锁定队伍行后校验并原子设置 current_activity，
      // 循环写队员日志在同一事务内完成，避免部分写入成功/活动重复开始。
      // 时长制 + 贡献制：开始时刻快照每个成员的统计基线，结算按统计差值分奖。
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        const members = party.members as any[];
        const member = members.find((m: any) => m.userId === userId);
        if (!member) return { success: false, message: "您不是该队伍成员" };
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以开始活动" };

        if (party.current_activity) return { success: false, message: "队伍已有进行中的活动" };

        const duration = Math.min(480, Math.max(5, Math.floor(durationMinutes ?? 30)));
        const now = new Date();
        let raidBossId: string | undefined;
        let raidBossName: string | undefined;
        let bossKillsNeeded: number | undefined;

        if (activityType === 'combat' || activityType === 'raid') {
          if (!stageId) return { success: false, message: "战斗类活动需要指定关卡" };
          const stage = contentPack ? (contentPack.stages as any[]).find((s: any) => s.id === stageId) : null;
          if (contentPack && !stage) return { success: false, message: "关卡不存在" };
          if (!isStageOpen(stageId)) return { success: false, message: "该关卡尚未开放" };
          if (activityType === 'raid') {
            const ids: string[] = stage?.monsters ?? [];
            const boss = contentPack
              ? ids.map(id => (contentPack.monsters as any[]).find((m: any) => m.id === id)).find(m => m && (m.isBoss || String(m.id).endsWith('_boss')))
                ?? ids.map(id => (contentPack.monsters as any[]).find((m: any) => m.id === id)).filter(Boolean).at(-1)
              : null;
            raidBossId = boss?.id ?? ids.at(-1);
            if (!raidBossId) return { success: false, message: "该关卡没有可讨伐的首领" };
            raidBossName = boss?.name ?? raidBossId;
            bossKillsNeeded = members.length * 2;
          }
        }

        // 成员统计基线：离线成员同样入快照——放置游戏的核心是离线进度也算贡献
        const baseline: Record<string, { kills: number; bossKills: number; raidBossKills: number; actions: number; xp: number }> = {};
        const states = new Map<string, { state: EnhancedPlayerState; contentVersion: string }>();
        const sorted = [...members].sort((a: any, b: any) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
        for (const m of sorted) {
          const loaded = await txLoadStateForUpdate(client, m.userId);
          states.set(m.userId, loaded);
          const stats = loaded.state.stats as any;
          baseline[m.userId] = {
            kills: stats?.totalKills || 0,
            bossKills: stats?.totalBossKills || 0,
            raidBossKills: raidBossId ? (stats?.killsByMonster?.[raidBossId] || 0) : 0,
            actions: stats?.totalActions || 0,
            xp: stats?.totalXpEarned || 0,
          };
        }

        const activity = {
          type: activityType, stageId, startedAt: now.toISOString(),
          endsAt: new Date(now.getTime() + duration * 60_000).toISOString(),
          durationMinutes: duration, raidBossId, raidBossName, bossKillsNeeded, baseline,
        };
        await client.query("UPDATE parties SET current_activity = $1 WHERE id = $2", [JSON.stringify(activity), partyId]);

        // 同一事务内按排序顺序写队员日志，避免死锁
        for (const m of sorted) {
          const { state, contentVersion } = states.get(m.userId)!;
          appendLog(state, `队伍活动开始：${activityType}${raidBossName ? `·讨伐 ${raidBossName}` : ''}（${duration} 分钟）`);
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

    async completePartyActivity({ userId, partyId, contentPack }) {
      // 事务化 + 原子抢占活动：以条件 UPDATE 在发奖前先把 current_activity 清空，
      // 仅当本次成功清空（抢到）才发放奖励。并发"完成活动"中只有一方能抢到，
      // 杜绝奖励翻倍发放。队员状态写入在同一事务内按 userId 排序加行锁，避免
      // 部分到账/部分失败的不一致。
      return withTransaction(async (client) => {
        // 行锁锁定队伍并做权限/成员校验
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0] || !partyResult.rows[0].current_activity) {
          return { success: false, message: "没有进行中的活动" };
        }
        const party = partyResult.rows[0];
        if (party.leader_id !== userId) {
          return { success: false, message: "只有队长可以完成活动" };
        }
        const members = party.members as any[];
        if (!members.some((m: any) => m.userId === userId)) {
          return { success: false, message: "您不是该队伍成员" };
        }

        const activity = party.current_activity;
        // 时长门槛必须在原子抢占之前：否则未结束的活动会被清掉却报失败
        if (activity.endsAt && Date.parse(activity.endsAt) > Date.now()) {
          return { success: false, message: `活动尚未结束（${Math.ceil((Date.parse(activity.endsAt) - Date.now()) / 60000)} 分钟后可结算）` };
        }

        // 原子抢占：仅当仍有进行中的活动时清空并返回，确保只发一次奖励
        const claim = await client.query(
          "UPDATE parties SET current_activity = NULL WHERE id = $1 AND current_activity IS NOT NULL RETURNING 1",
          [partyId]
        );
        if (claim.rowCount === 0) {
          return { success: false, message: "活动已被结算" };
        }

        const durationFactor = Math.max(0.1, (activity.durationMinutes ?? 30) / 30);
        const rewards: Record<string, Record<string, number>> = {};
        const contributions: Record<string, number> = {};

        if (activity.baseline) {
          // 贡献制：统计差值 → 按比例分奖
          const memberStates = new Map<string, { state: EnhancedPlayerState; contentVersion: string }>();
          const sortedM = [...members].sort((a: any, b: any) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
          for (const m of sortedM) memberStates.set(m.userId, await txLoadStateForUpdate(client, m.userId));
          for (const m of members) {
            const base = activity.baseline[m.userId];
            const stats = memberStates.get(m.userId)?.state.stats as any;
            if (!base || !stats) { contributions[m.userId] = 0; continue; }
            const kills = Math.max(0, (stats.totalKills || 0) - base.kills);
            const raidBossKills = activity.raidBossId ? Math.max(0, (stats.killsByMonster?.[activity.raidBossId] || 0) - base.raidBossKills) : 0;
            const actions = Math.max(0, (stats.totalActions || 0) - base.actions);
            contributions[m.userId] = activity.type === 'group_craft'
              ? actions
              : activity.type === 'raid'
                ? raidBossKills * 10 + kills
                : kills;
          }
          const totalC = Object.values(contributions).reduce((a, b) => a + b, 0);
          if (totalC <= 0) {
            broadcast(`party:${partyId}`, { type: "party:event", event: "activity_completed", rewards, ts: nowIso() });
            return { success: true, rewards, message: "活动期间无人产生贡献，无奖励发放" };
          }
          const split = (pool: number) => {
            const shares: Record<string, number> = {};
            let assigned = 0, top: string | null = null;
            for (const m of members) {
              shares[m.userId] = Math.floor(pool * contributions[m.userId] / totalC);
              assigned += shares[m.userId];
              if (!top || contributions[m.userId] > contributions[top]) top = m.userId;
            }
            if (top) shares[top] += pool - assigned;
            return shares;
          };
          if (activity.type === 'group_craft') {
            const xpShares = split(Math.round(60 * members.length * durationFactor));
            for (const m of members) {
              const xp = xpShares[m.userId];
              if (xp <= 0) continue;
              rewards[m.userId] = { xp };
              const loaded = memberStates.get(m.userId);
              if (loaded) {
                ensureProfessionSkills(loaded.state);
                const skillId = CRAFT_SKILL_BY_PROFESSION[loaded.state.activeClassId] || `skill_${loaded.state.activeClassId}`;
                const ups = grantProfessionXp(loaded.state, skillId, xp);
                appendLog(loaded.state, `队伍活动完成，${loaded.state.activeClassId} 获得 ${xp} 经验`);
                for (const lv of ups) appendLog(loaded.state, `${skillId} 技能升级到 ${lv} 级！`);
              }
            }
          } else {
            const bossKillsTotal = activity.raidBossId
              ? members.reduce((n: number, m: any) => n + Math.max(0, (((memberStates.get(m.userId)?.state.stats as any)?.killsByMonster?.[activity.raidBossId!] || 0) - (activity.baseline![m.userId]?.raidBossKills || 0))), 0)
              : 0;
            const pool = activity.type === 'raid'
              ? Math.round((150 * members.length + 80 * bossKillsTotal) * durationFactor)
              : Math.round(120 * members.length * durationFactor);
            const goldShares = split(pool);
            for (const m of members) {
              const gold = goldShares[m.userId];
              if (gold <= 0) continue;
              rewards[m.userId] = { gold };
              const loaded = memberStates.get(m.userId);
              if (loaded) {
                loaded.state.inventory.gold = (loaded.state.inventory.gold || 0) + gold;
                appendLog(loaded.state, `队伍活动完成，按贡献分得 ${gold} 金币`);
              }
            }
          }
          for (const m of sortedM) {
            const loaded = memberStates.get(m.userId)!;
            await txPersistState(client, m.userId, loaded.state, loaded.contentVersion);
          }
        } else {
          // 旧存档的活动没有基线：沿用平摊（兼容历史数据）
          const tasks: { userId: string; gold: number; xp: number; log: string }[] = [];
          if (activity.type === 'combat') {
            const goldPerMember = Math.floor((100 * members.length) / members.length);
            for (const member of members) {
              rewards[member.userId] = { gold: goldPerMember };
              tasks.push({ userId: member.userId, gold: goldPerMember, xp: 0, log: `队伍活动完成，获得 ${goldPerMember} 金币` });
            }
          } else if (activity.type === 'group_craft') {
            const xpBonus = 50 * members.length;
            for (const member of members) {
              rewards[member.userId] = { xp: xpBonus };
              tasks.push({ userId: member.userId, gold: 0, xp: xpBonus, log: `队伍制作完成，获得 ${xpBonus} 经验` });
            }
          }

          // 按 userId 排序后逐个加行锁写入，固定顺序避免与其它事务死锁
          tasks.sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
          for (const t of tasks) {
            const { state, contentVersion } = await txLoadStateForUpdate(client, t.userId);
            if (t.gold > 0) state.inventory.gold = (state.inventory.gold || 0) + t.gold;
            if (t.xp > 0) {
              // 经验发到当前职业的生产技能（修复：原先只写日志不发经验）
              ensureProfessionSkills(state);
              const skillId = CRAFT_SKILL_BY_PROFESSION[state.activeClassId] || `skill_${state.activeClassId}`;
              const ups = grantProfessionXp(state, skillId, t.xp);
              t.log = `队伍制作完成，${state.activeClassId} 获得 ${t.xp} 经验`;
              for (const lv of ups) appendLog(state, `${skillId} 技能升级到 ${lv} 级！`);
            }
            appendLog(state, t.log);
            await txPersistState(client, t.userId, state, contentVersion);
          }
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
        if (partyResult.rows[0].leader_id !== userId) {
          return { success: false, message: "只有队长可以取消活动" };
        }
        await client.query("UPDATE parties SET current_activity = NULL WHERE id = $1", [partyId]);
        return { success: true };
      });
      if (res.success) broadcast(`party:${partyId}`, { type: "party:event", event: "activity_cancelled", ts: nowIso() });
      return res;
    },

    async leaveParty({ userId, partyId }) {
      // 事务 + 行锁：锁定队伍行后再读改写成员数组，避免并发退出/解散丢更新。
      const res = await withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        const members = party.members as any[];

        const memberIndex = members.findIndex((m: any) => m.userId === userId);
        if (memberIndex === -1) return { success: false, message: "不在队伍中" };

        if (party.leader_id === userId) {
          await client.query("DELETE FROM parties WHERE id = $1", [partyId]);
          // 按 userId 排序加行锁清空各成员的 partyState，固定顺序避免死锁
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
      // 单侧悬挂自愈（与内存适配器一致）：成员表没这人但 partyState 指着队伍——
      // 历史脏数据/离队漏写会卡死后续组队，读时清掉死引用
      if (!members.some((m) => m.userId === userId)) {
        st.partyState = undefined;
        await persistState(userId, st);
        return null;
      }
      // 展示名：只读 peek 队友存档（不能用 getOrCreate——会给没登过的队友凭空造档）
      const nameRows = await pool.query(
        "SELECT user_id, state_json->'settings'->>'playerName' AS name FROM player_states WHERE user_id = ANY($1)",
        [members.map((m) => m.userId)],
      );
      const nameByUser = new Map<string, string>(
        nameRows.rows.map((r: { user_id: string; name: string | null }) => [r.user_id, r.name || `玩家_${r.user_id.slice(0, 6)}`]),
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

    // ========== 装备耐久度 ==========
    async getDurabilityInfo({ userId, itemId }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) throw new Error("item_not_equipped");

      // 未记录 = 满耐久；记录为 0 = 破损（||100 会把破装备显示成满耐久）
      const maxDurability = Number.isFinite(st.equipment.maxDurability?.[itemId]) ? st.equipment.maxDurability![itemId] : 100;
      const rawDur = st.equipment.durability?.[itemId];
      const currentDurability = Number.isFinite(rawDur) ? rawDur! : maxDurability;
      const durabilityPercent = maxDurability > 0 ? (currentDurability / maxDurability) * 100 : 0;
      const needsRepair = durabilityPercent < 50;
      const repairCost = Math.ceil((maxDurability - currentDurability) * 0.5);

      return { itemId, currentDurability, maxDurability, durabilityPercent: Math.round(durabilityPercent * 10) / 10, needsRepair, repairCost } as DurabilityInfo;
    },

    async repairEquipment({ userId, request }) {
      // 包 withUserLock：修耐久要扣金币，属读改写，并发会丢更新（少扣金币）。
      return withUserLock(userId, async () => {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const isEquipped = Object.values(st.equipment).includes(request.itemId);
      if (!isEquipped) {
        return { success: false, itemId: request.itemId, oldDurability: 0, newDurability: 0, cost: 0, message: "装备未装备" };
      }

      if (!st.equipment.durability) st.equipment.durability = {};
      if (!st.equipment.maxDurability) st.equipment.maxDurability = {};

      const maxDurability = st.equipment.maxDurability[request.itemId] || 100;
      // 耐久 0 的破损装备要能修（||100 会把它当满耐久拒绝），未记录/NaN 视为全新满耐久
      const rawOld = st.equipment.durability[request.itemId];
      const oldDurability = Number.isFinite(rawOld) ? rawOld! : maxDurability;
      let targetDurability = maxDurability;
      if (request.repairType === 'partial' && request.targetDurability !== undefined) {
        // NaN/负目标会把 cost 变成 NaN 洗掉金币（与内存适配器一致的校验）
        if (!Number.isFinite(request.targetDurability) || request.targetDurability < 0) {
          return { success: false, itemId: request.itemId, oldDurability, newDurability: oldDurability, cost: 0, message: "修复目标无效" };
        }
        targetDurability = Math.floor(Math.min(request.targetDurability, maxDurability));
      }

      const repairAmount = targetDurability - oldDurability;
      if (repairAmount <= 0) {
        return { success: false, itemId: request.itemId, oldDurability, newDurability: oldDurability, cost: 0, message: "装备无需修复" };
      }

      const cost = Math.ceil(repairAmount * 0.5);
      if ((st.inventory.gold || 0) < cost) {
        return { success: false, itemId: request.itemId, oldDurability, newDurability: oldDurability, cost, message: `金币不足，需要 ${cost} 金币` };
      }

      st.inventory.gold = (st.inventory.gold || 0) - cost;
      st.equipment.durability[request.itemId] = targetDurability;
      appendLog(st, `修复装备：${request.itemId}，耐久度 ${oldDurability} -> ${targetDurability}，花费 ${cost} 金币`);
      await persistState(userId, st);

      return { success: true, itemId: request.itemId, oldDurability, newDurability: targetDurability, cost, message: "修复成功" };
      });
    },

    async reduceDurability({ userId, itemId, amount }) {
      // 包 withUserLock：扣耐久属读改写，并发会丢更新（耐久回退）。
      return withUserLock(userId, async () => {
      const st = await getOrCreatePlayerState(userId, "unknown");
      // 损耗必须为正有限数：负数/NaN 会把耐久抬到上限之上
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, newDurability: st.equipment.durability?.[itemId] ?? 0, broken: false };
      }
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) return { success: false, newDurability: 0, broken: false };

      if (!st.equipment.durability) st.equipment.durability = {};
      if (st.equipment.durability[itemId] === undefined) {
        st.equipment.durability[itemId] = st.equipment.maxDurability?.[itemId] || 100;
      }

      const currentDurability = st.equipment.durability[itemId];
      const cap = st.equipment.maxDurability?.[itemId] || 100;
      const newDurability = Math.min(cap, Math.max(0, currentDurability - amount));
      st.equipment.durability[itemId] = newDurability;
      const broken = newDurability === 0;

      if (broken) appendLog(st, `装备损坏：${itemId}，需要修复才能继续使用`);
      await persistState(userId, st);

      return { success: true, newDurability, broken };
      });
    },

    // ========== 价格历史 ==========
    async getPriceHistory({ itemId, days = 7 }) {
      // days 无上限是 DoS 向量（路由只 parseInt 不限范围）；钳到 [1,90]，与内存适配器一致
      const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 90) : 7;
      const result = await pool.query(
        `SELECT * FROM price_history WHERE item_id = $1 AND record_date >= CURRENT_DATE - $2 * INTERVAL '1 day' ORDER BY record_date DESC`,
        [itemId, safeDays]
      );
      return result.rows.map(r => ({
        itemId: r.item_id, averagePrice: parseFloat(r.average_price), minPrice: r.min_price,
        maxPrice: r.max_price, volume: r.volume, recordDate: r.record_date.toISOString().split('T')[0]
      })) as PriceHistory[];
    },

    async getItemPriceTrend({ itemId }) {
      const history = await this.getPriceHistory({ itemId, days: 7 });
      if (history.length === 0) {
        return { itemId, currentAverage: 0, weekAverage: 0, trend: 'stable' as const, changePercent: 0 };
      }

      const currentAverage = history[0]?.averagePrice || 0;
      const weekAverage = history.reduce((sum, h) => sum + h.averagePrice, 0) / history.length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let changePercent = 0;
      if (history.length >= 2) {
        const oldAverage = history[history.length - 1].averagePrice;
        if (oldAverage > 0) {
          changePercent = ((currentAverage - oldAverage) / oldAverage) * 100;
          if (changePercent > 5) trend = 'up';
          else if (changePercent < -5) trend = 'down';
        }
      }

      return { itemId, currentAverage, weekAverage, trend, changePercent: Math.round(changePercent * 100) / 100 };
    },

    // ========== 装备属性与套装 ==========
    async getEquipmentStats({ userId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const baseStats: Record<string, number> = {};
      const enhancementStats: Record<string, number> = {};
      const setStats: Record<string, number> = {};

      for (const [slot, itemId] of Object.entries(st.equipment)) {
        if (!itemId || typeof itemId !== 'string') continue;
        if (['enhancementLevels', 'durability', 'maxDurability', 'tool'].includes(slot)) continue;

        const item = (contentPack.items as any[]).find(i => i.id === itemId);
        if (!item) continue;

        if (item.atk) baseStats.atk = (baseStats.atk || 0) + item.atk;
        if (item.def) baseStats.def = (baseStats.def || 0) + item.def;
        if (item.mag) baseStats.mag = (baseStats.mag || 0) + item.mag;
        if (item.hp) baseStats.hp = (baseStats.hp || 0) + item.hp;
        if (item.mp) baseStats.mp = (baseStats.mp || 0) + item.mp;

        const enhancementLevel = st.equipment.enhancementLevels?.[itemId] || 0;
        if (enhancementLevel > 0) {
          const bonus = enhancementStatMultiplier(enhancementLevel, item) - 1;
          if (item.atk) enhancementStats.atk = (enhancementStats.atk || 0) + item.atk * bonus;
          if (item.def) enhancementStats.def = (enhancementStats.def || 0) + item.def * bonus;
          if (item.mag) enhancementStats.mag = (enhancementStats.mag || 0) + item.mag * bonus;
        }
      }

      const activeSets = await this.getActiveSetBonuses({ userId, contentPack });
      for (const setBonus of activeSets) {
        for (const [stat, value] of Object.entries(setBonus.totalStats)) {
          setStats[stat] = (setStats[stat] || 0) + value;
        }
      }

      const totalStats: Record<string, number> = {};
      const allStats = new Set([...Object.keys(baseStats), ...Object.keys(enhancementStats), ...Object.keys(setStats)]);
      for (const stat of allStats) {
        totalStats[stat] = (baseStats[stat] || 0) + (enhancementStats[stat] || 0) + (setStats[stat] || 0);
      }

      return { baseStats, enhancementStats, setStats, totalStats, activeSets } as PlayerEquipmentStats;
    },

    async getActiveSetBonuses({ userId, contentPack }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const activeSets: EquipmentSetBonus[] = [];

      for (const set of (contentPack.equipmentSets || [])) {
        let equippedPieces = 0;
        for (const piece of set.pieces) {
          const equippedItem = st.equipment[piece.slot as keyof typeof st.equipment];
          if (equippedItem === piece.itemId) equippedPieces++;
        }
        if (equippedPieces === 0) continue;

        const top = highestActiveBonus(set.bonuses as Array<{ requiredPieces?: number; stats?: Record<string, number> }>, equippedPieces);
        const activeBonuses = set.bonuses.map((bonus: any) => ({
          ...bonus, isActive: bonus === top
        }));

        const totalStats: Record<string, number> = {};
        for (const bonus of activeBonuses) {
          if (bonus.isActive) {
            for (const [stat, value] of Object.entries(bonus.stats as Record<string, number>)) {
              totalStats[stat] = (totalStats[stat] || 0) + value;
            }
          }
        }

        activeSets.push({ setId: set.id, setName: set.name, equippedPieces, totalPieces: set.pieces.length, activeBonuses, totalStats });
      }
      return activeSets;
    },

    // ========== WebSocket ==========
    wsConnect(userId, connection) {
      const c: WsConn = { socket: socketFromWsConnection(connection), channels: new Set<string>() };
      wsConnections.set(userId, c);
      addMembership(channelMembers, c.channels, userId, "world");
      try {
        if (c.socket && typeof c.socket.send === "function") {
          c.socket.send(JSON.stringify({ type: "chat:system", channel: "world", ts: nowIso(), text: "connected" }));
        }
      } catch {}
      void getOrCreatePlayerState(userId, "unknown").then((st) => {
        const keys = membershipKeys({
          classId: st.activeClassId,
          partyId: st.partyState?.partyId,
        });
        for (const key of keys) addMembership(channelMembers, c.channels, userId, key);
        if (st.partyState?.partyId) void patchMemberOnline(userId, true);
      }).catch(() => {});
    },

    wsDisconnect(userId) {
      const c = wsConnections.get(userId);
      if (!c) return;
      for (const ch of c.channels) {
        const set = channelMembers.get(ch);
        if (set) { set.delete(userId); if (set.size === 0) channelMembers.delete(ch); }
      }
      wsConnections.delete(userId);
      void patchMemberOnline(userId, false);
    },

    wsMessage(userId, raw) {
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { return; }
      if (parsed.type === "chat:send") {
        const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
        const content = typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "";
        const senderConn = wsConnections.get(userId);
        if (!content.trim()) {
          try { senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel, message: "消息不能为空", ts: nowIso() })); } catch { /* 连接已断 */ }
          return;
        }
        // 私聊：与内存适配器同协议，此前 PG 走公共分桶静默丢弃
        if (channel === "private" && typeof parsed.recipient === "string" && parsed.recipient) {
          const recipientId = parsed.recipient;
          void (async () => {
            const st = await getOrCreatePlayerState(userId, "unknown");
            const senderName = st.settings?.playerName || `玩家_${userId.slice(0, 6)}`;
            const recipientConn = wsConnections.get(recipientId);
            if (recipientConn?.socket) {
              const payload = {
                type: "chat:message", channel: "private", sender: userId, senderName,
                senderProfession: st.activeClassId, recipient: recipientId, ts: nowIso(), content,
              };
              try { recipientConn.socket.send(JSON.stringify(payload)); } catch { /* 连接已断 */ }
              try { senderConn?.socket?.send(JSON.stringify({ ...payload, isSelf: true })); } catch { /* 连接已断 */ }
            } else {
              try { senderConn?.socket?.send(JSON.stringify({ type: "chat:error", channel: "private", message: "用户不在线", ts: nowIso() })); } catch { /* 连接已断 */ }
            }
          })().catch(() => {});
          return;
        }
        void (async () => {
          const st = await getOrCreatePlayerState(userId, "unknown");
          const memberKey = membershipKeyForSend(channel, {
            classId: st.activeClassId,
            partyId: st.partyState?.partyId,
          });
          if (!memberKey) return;
          const c = wsConnections.get(userId);
          if (c) addMembership(channelMembers, c.channels, userId, memberKey);
          broadcast(memberKey, {
            type: "chat:message",
            channel: payloadChannel(channel),
            sender: userId,
            senderName: st.settings?.playerName || `玩家_${userId.slice(0, 6)}`,
            senderProfession: st.activeClassId,
            ts: nowIso(),
            content,
          });
        })().catch(() => {});
      }
    },

    // ========== 交易订单系统 ==========
    async getTradingOrders({ itemId }) {
      const result = await pool.query(
        "SELECT o.*, u.guest_device_id FROM trading_orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.item_id = $1 ORDER BY o.created_at DESC",
        [itemId]
      );
      return result.rows.map(r => ({
        id: r.id, userId: r.user_id, itemId: r.item_id, quantity: r.quantity,
        price: r.price, type: r.type, createdAt: r.created_at.toISOString(),
        username: r.guest_device_id?.slice(0, 8) || '未知用户'
      })) as TradingOrder[];
    },

    async getMarketSummary() {
      // One aggregate per item / side; the DB does the folding so a busy market is one round trip.
      const result = await pool.query(
        `SELECT item_id, type,
                MIN(price) FILTER (WHERE type = 'sell') AS ask,
                MAX(price) FILTER (WHERE type = 'buy')  AS bid,
                SUM(quantity) AS qty
           FROM trading_orders
          WHERE quantity > 0
          GROUP BY item_id, type`
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
      // 存储层自身校验（与内存适配器一致）
      if (type !== 'buy' && type !== 'sell') throw new Error('订单类型无效');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999999) throw new Error('订单数量无效');
      if (!Number.isInteger(price) || price < 1 || price > 1000000000) throw new Error('订单价格无效');
      if (itemId === 'gold') throw new Error('金币不可挂单');
      if (contentPack && !(contentPack.items as any[]).some((i) => i.id === itemId)) throw new Error('物品不存在');
      // 事务化：托管资产（卖单扣物品 / 买单冻结金币）与写订单原子完成。
      const row = await withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);

        if (type === 'sell') {
          if (Object.values(st.equipment || {}).includes(itemId)) throw new Error('装备中的物品不能挂单');
          const currentQuantity = st.inventory[itemId] || 0;
          if (currentQuantity < quantity) throw new Error(`物品数量不足，当前拥有: ${currentQuantity}`);
          st.inventory[itemId] = currentQuantity - quantity;
        }

        if (type === 'buy') {
          const totalCost = quantity * price;
          const currentGold = st.inventory.gold || 0;
          if (currentGold < totalCost) throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${currentGold}`);
          st.inventory.gold = currentGold - totalCost;
        }

        await txPersistState(client, userId, st, contentVersion);

        const result = await client.query(
          `INSERT INTO trading_orders (user_id, item_id, quantity, price, type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, itemId, quantity, price, type]
        );
        return result.rows[0];
      });
      return { id: row.id, userId: row.user_id, itemId: row.item_id, quantity: row.quantity, price: row.price, type: row.type, createdAt: row.created_at.toISOString() } as TradingOrder;
    },

    async executeTrade({ buyerId, orderId, quantity }) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999999) throw new Error('交易数量无效');
      // 事务化：行锁锁定订单，原子扣减订单数量，串行化双方状态写入。
      // buyerId 语义是"成交发起方"：sell 单时其为买家，buy 单时其为卖家。
      return withTransaction(async (client) => {
        const orderResult = await client.query(
          "SELECT * FROM trading_orders WHERE id = $1 FOR UPDATE",
          [orderId]
        );
        if (!orderResult.rows[0]) throw new Error('订单不存在');
        const order = orderResult.rows[0];

        if (order.user_id === buyerId) throw new Error('不能成交自己的订单');
        if (order.quantity < quantity) throw new Error('订单数量不足');

        const totalCost = quantity * order.price;

        // 固定加锁顺序避免死锁
        const posterId = order.user_id as string;
        const lockFirst = buyerId < posterId ? buyerId : posterId;
        const lockSecond = buyerId < posterId ? posterId : buyerId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const fillerLoaded = lockFirst === buyerId ? loaded1 : loaded2;
        const posterLoaded = lockFirst === posterId ? loaded1 : loaded2;
        const filler = fillerLoaded.state;
        const poster = posterLoaded.state;

        if (order.type === 'sell') {
          // 购买出售单：发起方付金收货
          if ((filler.inventory.gold || 0) < totalCost) {
            throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${filler.inventory.gold || 0}`);
          }
          filler.inventory.gold = (filler.inventory.gold || 0) - totalCost;
          filler.inventory[order.item_id] = (filler.inventory[order.item_id] || 0) + quantity;
          poster.inventory.gold = (poster.inventory.gold || 0) + totalCost;
          appendLog(poster, `订单成交：${order.item_id} x${quantity} 获得 ${totalCost} 金币`);
        } else {
          // 卖给收购单：发起方交货收金（买家金币在挂单时已托管扣除）
          const have = filler.inventory[order.item_id] || 0;
          if (have < quantity) {
            throw new Error(`物品不足，需要: ${quantity}，当前拥有: ${have}`);
          }
          const eq = filler.equipment as Record<string, unknown> | undefined;
          if (eq && Object.values(eq).includes(order.item_id)) {
            throw new Error('装备中的物品不能出售');
          }
          filler.inventory[order.item_id] = have - quantity;
          if (filler.inventory[order.item_id] <= 0) delete filler.inventory[order.item_id];
          filler.inventory.gold = (filler.inventory.gold || 0) + totalCost;
          poster.inventory[order.item_id] = (poster.inventory[order.item_id] || 0) + quantity;
          appendLog(poster, `收购成交：${order.item_id} x${quantity} 花费 ${totalCost} 金币`);
        }
        if (filler.stats) filler.stats.totalTrades = (filler.stats.totalTrades || 0) + 1;
        if (poster.stats) poster.stats.totalTrades = (poster.stats.totalTrades || 0) + 1;

        await txPersistState(client, buyerId, filler, fillerLoaded.contentVersion);
        await txPersistState(client, posterId, poster, posterLoaded.contentVersion);

        const newQty = order.quantity - quantity;
        if (newQty <= 0) {
          await client.query("DELETE FROM trading_orders WHERE id = $1", [orderId]);
        } else {
          await client.query("UPDATE trading_orders SET quantity = $1 WHERE id = $2", [newQty, orderId]);
        }

        notifyUser(posterId, { kind: "order:filled", orderId, itemId: order.item_id, quantity, gold: totalCost, remaining: Math.max(0, newQty) });
        return { success: true, message: '交易成功' };
      });
    },

    async cancelTradingOrder({ userId, orderId }) {
      // 事务化 + 行锁：先以 DELETE ... RETURNING 原子摘除订单，确保同一订单
      // 不会被并发取消两次（避免双倍退款）；随后在同一事务内退还资产。
      return withTransaction(async (client) => {
        const del = await client.query(
          "DELETE FROM trading_orders WHERE id = $1 AND user_id = $2 RETURNING *",
          [orderId, userId]
        );
        if (del.rowCount === 0) {
          // 订单不存在或非本人：用一次普通查询区分错误信息
          const exists = await client.query("SELECT user_id FROM trading_orders WHERE id = $1", [orderId]);
          if (!exists.rows[0]) throw new Error('订单不存在');
          throw new Error('无权取消此订单');
        }
        const order = del.rows[0];

        const { state, contentVersion } = await txLoadStateForUpdate(client, userId);
        if (order.type === 'sell') {
          state.inventory[order.item_id] = (state.inventory[order.item_id] || 0) + order.quantity;
        } else if (order.type === 'buy') {
          state.inventory.gold = (state.inventory.gold || 0) + (order.quantity * order.price);
        }
        await txPersistState(client, userId, state, contentVersion);
      });
    },

    async getMyTradingOrders({ userId }) {
      const result = await pool.query("SELECT * FROM trading_orders WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
      return result.rows.map(r => ({
        id: r.id, userId: r.user_id, itemId: r.item_id, quantity: r.quantity,
        price: r.price, type: r.type, createdAt: r.created_at.toISOString()
      })) as TradingOrder[];
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
