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
  MarketListing,
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
import { socketFromWsConnection } from "./ws_socket";
import { 
  appendLog, 
  defaultEnhancedPlayerState, 
  normalizeInv, 
  pickSeed, 
  settleToNow,
  createMarketListing,
  calculateTradingFee,
  getXpForLevel,
  startLifeActionNow,
  startCombatFarmNow,
} from "./storage";
import { enhancementRequestUserColumn } from "./sql_identifiers";
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
      CREATE TABLE IF NOT EXISTS market_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES users(id),
        item_id TEXT NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        price_per_unit INT NOT NULL CHECK (price_per_unit > 0),
        status TEXT NOT NULL DEFAULT 'active',
        listed_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
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
  function mapUser(r: {
    id: string;
    guest_device_id: string | null;
    google_sub: string | null;
    created_at: Date;
    guest_resume_token_hash?: string | null;
  }): UserRecord {
    return {
      id: r.id,
      guestDeviceId: r.guest_device_id,
      googleSub: r.google_sub,
      createdAt: r.created_at.toISOString(),
      guestResumeTokenHash: r.guest_resume_token_hash ?? null,
    };
  }

  async function findOrCreateGuestUser(deviceId: string): Promise<UserRecord> {
    const existing = await pool.query(
      "SELECT id, guest_device_id, google_sub, created_at, guest_resume_token_hash FROM users WHERE guest_device_id = $1",
      [deviceId]
    );
    if (existing.rows[0]) return mapUser(existing.rows[0]);
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES (gen_random_uuid(), $1) RETURNING id, guest_device_id, google_sub, created_at, guest_resume_token_hash",
      [deviceId]
    );
    if (!created.rows[0]) {
      // 并发插入，重新查询
      const again = await pool.query("SELECT id, guest_device_id, google_sub, created_at, guest_resume_token_hash FROM users WHERE guest_device_id = $1", [deviceId]);
      return mapUser(again.rows[0]);
    }
    return mapUser(created.rows[0]);
  }

  async function createGuestUser(): Promise<UserRecord> {
    const id = randomUUID();
    const created = await pool.query(
      "INSERT INTO users (id, guest_device_id) VALUES ($1, $2) RETURNING id, guest_device_id, google_sub, created_at, guest_resume_token_hash",
      [id, `guest_${id}`]
    );
    return mapUser(created.rows[0]);
  }

  async function getUser(userId: string): Promise<UserRecord | null> {
    const found = await pool.query(
      "SELECT id, guest_device_id, google_sub, created_at, guest_resume_token_hash FROM users WHERE id = $1",
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
      "SELECT id, guest_device_id, google_sub, created_at, guest_resume_token_hash FROM users WHERE guest_resume_token_hash = $1",
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
      await pool.query("UPDATE users SET google_sub = $1 WHERE id = $2", [googleSub, userId]);
    },

    getOrCreatePlayerState,

    async simulateToNow({ userId, state, now, contentPack }) {
      return withUserLock(userId, async () => {
        const result = await settleToNow({ state, now, contentPack });
        const next = { ...result.state as EnhancedPlayerState, inventory: normalizeInv(result.state.inventory) };
        await persistState(userId, next);
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
          // Expensive simulation runs outside the short database transaction and can yield.
          const settled = await settleToNow({ state: snapshot, now: command.now, contentPack: command.contentPack });
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
            return outcome;
          } catch (error) {
            // Retry only an uncommitted, pure command after rereading its authoritative snapshot.
            if (!(error instanceof PlayerCommandConflict) || command.expectedRevision !== undefined || attempt >= 2) throw error;
          }
        }
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

    async startLifeAction({ userId, actionId, quantity, now, contentPack }) {
      return withUserLock(userId, async () => {
      const st = await getOrCreatePlayerState(userId, "unknown");
      startLifeActionNow(st, contentPack, actionId, quantity, now);
      await persistState(userId, st);
      return st;
      });
    },

    async startCombatFarm({ userId, stageId, now }) {
      return withUserLock(userId, async () => {
        const st = await getOrCreatePlayerState(userId, "unknown");
        startCombatFarmNow(st, stageId, now);
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
      if (!skill || skill.level < node.requirements.level) {
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
        const key = `skill_${professionId}`;
        if (!st.skills[key]) {
          st.skills[key] = { level: 1, xp: 0, unlockedRecipes: [], enhancementLevel: 0 };
          await persistState(userId, st);
        }
        return st.skills[key];
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
      const st = await getOrCreatePlayerState(userId, "unknown");
      const currentLevel = st.equipment.enhancementLevels?.[request.itemId] || 0;
      const item = (contentPack.items as any[]).find(i => i.id === request.itemId);
      if (!item) return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "未知物品" };

      const ruleMatch = findEnhancementRuleForItem(item, contentPack);
      const rule = ruleMatch?.rule ?? null;
      if (!rule) {
        return { success: false, previousLevel: currentLevel, newLevel: currentLevel, consumedMaterials: {}, failureReason: "该物品无法强化" };
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
        await persistState(userId, st);
      }
      return result;
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
        protection: {
          itemId: PROTECTION_MIRROR_ID,
          available: st.inventory[PROTECTION_MIRROR_ID] || 0,
          failWithout: "失败后重置为 +0",
          failWith: "消耗 1 面保护镜；失败只降低 1 级",
        },
      };

      const nextLevel = currentLevel + 1;
      const maxLevel = Math.min(MAX_ENHANCEMENT_LEVEL, Number(rule.maxLevel || MAX_ENHANCEMENT_LEVEL));
      const nextLevelCost = nextLevel <= maxLevel ? enhancementMaterials(rule, nextLevel) : {};
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
      const result = await pool.query(
        `INSERT INTO enhancement_requests (requester_id, provider_id, item_id, target_level, message)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [requesterId, providerId, itemId, targetLevel, message]
      );
      const row = result.rows[0];
      return {
        id: row.id, requesterId: row.requester_id, providerId: row.provider_id,
        itemId: row.item_id, targetLevel: row.target_level, serviceFee: row.service_fee,
        message: row.message, status: row.status, createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      } as EnhancementServiceRequest;
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
          return { success: false, message: enhanceResult.failureReason || "强化失败" };
        }
      }

      const newStatus = accepted ? 'completed' : 'rejected';
      await pool.query(
        "UPDATE enhancement_requests SET status = $1, response_message = $2, updated_at = now() WHERE id = $3",
        [newStatus, message, requestId]
      );
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

    // ========== 交易行 ==========
    async listItemForSale({ userId, itemId, quantity, pricePerUnit, duration }) {
      // 事务化：扣减卖家库存与写入挂单原子完成，避免"扣了库存但挂单写入失败"。
      const row = await withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        if ((st.inventory[itemId] || 0) < quantity) throw new Error("insufficient_items");

        st.inventory[itemId] = (st.inventory[itemId] || 0) - quantity;
        if (!st.tradingState) st.tradingState = { activeListings: [], purchaseHistory: [] };
        await txPersistState(client, userId, st, contentVersion);

        const expiresAt = new Date(Date.now() + (duration || 24) * 3600000);
        const result = await client.query(
          `INSERT INTO market_listings (seller_id, item_id, quantity, price_per_unit, expires_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, itemId, quantity, pricePerUnit, expiresAt]
        );
        return result.rows[0];
      });
      return {
        id: row.id, sellerId: row.seller_id, itemId: row.item_id,
        quantity: row.quantity, pricePerUnit: row.price_per_unit,
        listedAt: row.listed_at.toISOString(), expiresAt: row.expires_at.toISOString(),
        status: row.status,
      } as MarketListing;
    },

    async purchaseItem({ userId, listingId, quantity }) {
      // 全程置于单个数据库事务中：
      // 1) 用条件 UPDATE 原子扣减挂单数量，杜绝并发超卖；
      // 2) 用 FOR UPDATE 行锁串行化买卖双方状态读写，杜绝丢更新；
      // 3) 任一步失败整体 ROLLBACK，杜绝"钱货两失/凭空增发"。
      return withTransaction(async (client) => {
        // 先读挂单做前置校验（拿到 seller_id / item_id / 单价）
        const listingResult = await client.query(
          "SELECT * FROM market_listings WHERE id = $1 AND status = 'active'",
          [listingId]
        );
        if (!listingResult.rows[0]) return { success: false, message: "商品不存在或已下架" };
        const listing = listingResult.rows[0];

        if (listing.seller_id === userId) return { success: false, message: "不能购买自己的商品" };

        const totalPrice = quantity * listing.price_per_unit;
        const fee = calculateTradingFee(totalPrice);
        const finalPrice = totalPrice + fee;

        // 原子扣减挂单数量：仅当 status='active' 且剩余数量足够时才扣减成功。
        // 并发购买中只有一方能扣到，避免超卖。
        const deduct = await client.query(
          `UPDATE market_listings
             SET quantity = quantity - $1,
                 status = CASE WHEN quantity - $1 <= 0 THEN 'sold' ELSE status END
           WHERE id = $2 AND status = 'active' AND quantity >= $1
           RETURNING quantity`,
          [quantity, listingId]
        );
        if (deduct.rowCount === 0) return { success: false, message: "购买数量超过可用数量" };

        // 固定加锁顺序（按 userId 字典序）避免买卖双方互锁导致死锁
        const buyerId = userId;
        const sellerId = listing.seller_id as string;
        const lockFirst = buyerId < sellerId ? buyerId : sellerId;
        const lockSecond = buyerId < sellerId ? sellerId : buyerId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const buyerLoaded = lockFirst === buyerId ? loaded1 : loaded2;
        const sellerLoaded = lockFirst === sellerId ? loaded1 : loaded2;
        const buyer = buyerLoaded.state;
        const seller = sellerLoaded.state;

        if ((buyer.inventory.gold || 0) < finalPrice) {
          // 余额不足：抛错触发 ROLLBACK，挂单扣减一并回滚
          throw new Error("insufficient_gold");
        }

        // 执行交易
        buyer.inventory.gold = (buyer.inventory.gold || 0) - finalPrice;
        buyer.inventory[listing.item_id] = (buyer.inventory[listing.item_id] || 0) + quantity;
        appendLog(buyer, `购买物品：${listing.item_id} x${quantity} 花费 ${finalPrice}金币`);
        seller.inventory.gold = (seller.inventory.gold || 0) + totalPrice;
        appendLog(seller, `物品售出：${listing.item_id} x${quantity} 获得 ${totalPrice}金币`);

        await txPersistState(client, buyerId, buyer, buyerLoaded.contentVersion);
        await txPersistState(client, sellerId, seller, sellerLoaded.contentVersion);

        // 记录交易
        await client.query(
          "INSERT INTO trade_history (buyer_id, seller_id, item_id, quantity, total_price) VALUES ($1,$2,$3,$4,$5)",
          [buyerId, sellerId, listing.item_id, quantity, totalPrice]
        );

        return { success: true };
      }).catch((e) => {
        if (e instanceof Error && e.message === "insufficient_gold") {
          return { success: false, message: "金币不足" };
        }
        throw e;
      });
    },

    async getMarketListings({ query, filters }) {
      const result = await pool.query(
        "SELECT * FROM market_listings WHERE status = 'active' AND expires_at > now() ORDER BY listed_at DESC LIMIT 100"
      );
      return result.rows.map(r => ({
        id: r.id, sellerId: r.seller_id, itemId: r.item_id,
        quantity: r.quantity, pricePerUnit: r.price_per_unit,
        listedAt: r.listed_at.toISOString(), expiresAt: r.expires_at.toISOString(),
        status: r.status,
      })) as MarketListing[];
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
      return withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) throw new Error("party_not_found");
        const party = partyResult.rows[0];
        const members = party.members as any[];

        if (members.length >= 6) throw new Error("party_full");
        if (members.some((m: any) => m.userId === userId)) throw new Error("already_in_party");

        members.push({ userId, role: 'member', joinedAt: nowIso(), isOnline: true });
        await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);

        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        if (st.partyState) throw new Error("already_in_party");
        st.partyState = { partyId, role: 'member', isLeader: false, joinedAt: nowIso() };
        appendLog(st, `加入队伍：${partyId}`);
        await txPersistState(client, userId, st, contentVersion);

        return { id: partyId, leaderId: party.leader_id, members, createdAt: party.created_at.toISOString() } as Party;
      });
    },

    async startPartyActivity({ userId, partyId, activityType, stageId }) {
      // 事务 + 行锁：锁定队伍行后校验并原子设置 current_activity，
      // 循环写队员日志在同一事务内完成，避免部分写入成功/活动重复开始。
      return withTransaction(async (client) => {
        const partyResult = await client.query("SELECT * FROM parties WHERE id = $1 FOR UPDATE", [partyId]);
        if (!partyResult.rows[0]) return { success: false, message: "队伍不存在" };
        const party = partyResult.rows[0];
        const members = party.members as any[];
        const member = members.find((m: any) => m.userId === userId);
        if (!member) return { success: false, message: "您不是该队伍成员" };
        if (party.leader_id !== userId) return { success: false, message: "只有队长可以开始活动" };

        if (party.current_activity) return { success: false, message: "队伍已有进行中的活动" };

        const activity = { type: activityType, stageId, startedAt: nowIso() };
        await client.query("UPDATE parties SET current_activity = $1 WHERE id = $2", [JSON.stringify(activity), partyId]);

        // 按 userId 排序加行锁写日志，固定顺序避免死锁
        const sorted = [...members].sort((a: any, b: any) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
        for (const m of sorted) {
          const { state, contentVersion } = await txLoadStateForUpdate(client, m.userId);
          appendLog(state, `队伍活动开始：${activityType}`);
          await txPersistState(client, m.userId, state, contentVersion);
        }
        return { success: true };
      });
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

        // 原子抢占：仅当仍有进行中的活动时清空并返回，确保只发一次奖励
        const claim = await client.query(
          "UPDATE parties SET current_activity = NULL WHERE id = $1 AND current_activity IS NOT NULL RETURNING 1",
          [partyId]
        );
        if (claim.rowCount === 0) {
          return { success: false, message: "活动已被结算" };
        }

        const activity = party.current_activity;
        const rewards: Record<string, Record<string, number>> = {};

        // 计算每位队员的奖励
        const tasks: { userId: string; gold: number; log: string }[] = [];
        if (activity.type === 'combat') {
          const goldPerMember = Math.floor((100 * members.length) / members.length);
          for (const member of members) {
            rewards[member.userId] = { gold: goldPerMember };
            tasks.push({ userId: member.userId, gold: goldPerMember, log: `队伍活动完成，获得 ${goldPerMember} 金币` });
          }
        } else if (activity.type === 'group_craft') {
          const xpBonus = 50 * members.length;
          for (const member of members) {
            rewards[member.userId] = { xp: xpBonus };
            tasks.push({ userId: member.userId, gold: 0, log: `队伍制作完成，获得 ${xpBonus} 经验` });
          }
        }

        // 按 userId 排序后逐个加行锁写入，固定顺序避免与其它事务死锁
        tasks.sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
        for (const t of tasks) {
          const { state, contentVersion } = await txLoadStateForUpdate(client, t.userId);
          if (t.gold > 0) state.inventory.gold = (state.inventory.gold || 0) + t.gold;
          appendLog(state, t.log);
          await txPersistState(client, t.userId, state, contentVersion);
        }

        return { success: true, rewards };
      });
    },

    async leaveParty({ userId, partyId }) {
      // 事务 + 行锁：锁定队伍行后再读改写成员数组，避免并发退出/解散丢更新。
      return withTransaction(async (client) => {
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
          return { success: true, message: "队伍已解散" };
        }

        members.splice(memberIndex, 1);
        await client.query("UPDATE parties SET members = $1 WHERE id = $2", [JSON.stringify(members), partyId]);

        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);
        st.partyState = undefined;
        appendLog(st, "已离开队伍");
        await txPersistState(client, userId, st, contentVersion);
        return { success: true };
      });
    },

    async getPartyForUser({ userId }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const partyId = st.partyState?.partyId;
      if (!partyId) return null;
      const result = await pool.query("SELECT * FROM parties WHERE id = $1", [partyId]);
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        leaderId: row.leader_id,
        members: row.members,
        createdAt: row.created_at.toISOString(),
        currentActivity: row.current_activity,
      } as Party;
    },

    // ========== 装备耐久度 ==========
    async getDurabilityInfo({ userId, itemId }) {
      const st = await getOrCreatePlayerState(userId, "unknown");
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) throw new Error("item_not_equipped");

      const currentDurability = st.equipment.durability?.[itemId] || 100;
      const maxDurability = st.equipment.maxDurability?.[itemId] || 100;
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

      const oldDurability = st.equipment.durability[request.itemId] || 100;
      const maxDurability = st.equipment.maxDurability[request.itemId] || 100;
      let targetDurability = maxDurability;
      if (request.repairType === 'partial' && request.targetDurability !== undefined) {
        targetDurability = Math.min(request.targetDurability, maxDurability);
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
      const isEquipped = Object.values(st.equipment).includes(itemId);
      if (!isEquipped) return { success: false, newDurability: 0, broken: false };

      if (!st.equipment.durability) st.equipment.durability = {};
      if (st.equipment.durability[itemId] === undefined) {
        st.equipment.durability[itemId] = st.equipment.maxDurability?.[itemId] || 100;
      }

      const currentDurability = st.equipment.durability[itemId];
      const newDurability = Math.max(0, currentDurability - amount);
      st.equipment.durability[itemId] = newDurability;
      const broken = newDurability === 0;

      if (broken) appendLog(st, `装备损坏：${itemId}，需要修复才能继续使用`);
      await persistState(userId, st);

      return { success: true, newDurability, broken };
      });
    },

    // ========== 价格历史 ==========
    async getPriceHistory({ itemId, days = 7 }) {
      const result = await pool.query(
        `SELECT * FROM price_history WHERE item_id = $1 AND record_date >= CURRENT_DATE - $2 ORDER BY record_date DESC`,
        [itemId, days]
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

        const activeBonuses = set.bonuses.map((bonus: any) => ({
          ...bonus, isActive: equippedPieces >= bonus.requiredPieces
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
    },

    wsMessage(userId, raw) {
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { return; }
      if (parsed.type === "chat:send") {
        const channel = typeof parsed.channel === "string" ? parsed.channel : "world";
        const content = typeof parsed.content === "string" ? parsed.content.slice(0, 300) : "";
        if (!content) return;
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

    async createTradingOrder({ userId, itemId, quantity, price, type }) {
      // 事务化：托管资产（卖单扣物品 / 买单冻结金币）与写订单原子完成。
      const row = await withTransaction(async (client) => {
        const { state: st, contentVersion } = await txLoadStateForUpdate(client, userId);

        if (type === 'sell') {
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
      // 事务化：行锁锁定订单，原子扣减订单数量，串行化买卖双方状态写入。
      return withTransaction(async (client) => {
        const orderResult = await client.query(
          "SELECT * FROM trading_orders WHERE id = $1 FOR UPDATE",
          [orderId]
        );
        if (!orderResult.rows[0]) throw new Error('订单不存在');
        const order = orderResult.rows[0];

        if (order.type !== 'sell') throw new Error('只能购买出售单');
        if (order.user_id === buyerId) throw new Error('不能购买自己的订单');
        if (order.quantity < quantity) throw new Error('订单数量不足');

        const totalCost = quantity * order.price;

        // 固定加锁顺序避免死锁
        const sellerId = order.user_id as string;
        const lockFirst = buyerId < sellerId ? buyerId : sellerId;
        const lockSecond = buyerId < sellerId ? sellerId : buyerId;
        const loaded1 = await txLoadStateForUpdate(client, lockFirst);
        const loaded2 = await txLoadStateForUpdate(client, lockSecond);
        const buyerLoaded = lockFirst === buyerId ? loaded1 : loaded2;
        const sellerLoaded = lockFirst === sellerId ? loaded1 : loaded2;
        const buyer = buyerLoaded.state;
        const seller = sellerLoaded.state;

        if ((buyer.inventory.gold || 0) < totalCost) {
          throw new Error(`金币不足，需要: ${totalCost}，当前拥有: ${buyer.inventory.gold || 0}`);
        }

        buyer.inventory.gold = (buyer.inventory.gold || 0) - totalCost;
        buyer.inventory[order.item_id] = (buyer.inventory[order.item_id] || 0) + quantity;
        seller.inventory.gold = (seller.inventory.gold || 0) + totalCost;

        await txPersistState(client, buyerId, buyer, buyerLoaded.contentVersion);
        await txPersistState(client, sellerId, seller, sellerLoaded.contentVersion);

        const newQty = order.quantity - quantity;
        if (newQty <= 0) {
          await client.query("DELETE FROM trading_orders WHERE id = $1", [orderId]);
        } else {
          await client.query("UPDATE trading_orders SET quantity = $1 WHERE id = $2", [newQty, orderId]);
        }

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
    async cleanupExpiredListings() {
      const result = await pool.query(
        `UPDATE market_listings SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP
         RETURNING id`
      );
      return result.rowCount ?? 0;
    },
  };
  return storage;
}
