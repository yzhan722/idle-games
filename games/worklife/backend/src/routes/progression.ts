import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from "../player_commands";
import {
  ACHIEVEMENTS,
  syncAchievements,
  claimAchievement,
  ensureDailyQuests,
  dailyProgress,
  claimDailyQuest
} from "../progression";

const SAVE_PREFIX = "WLS1.";
const SAVE_SECRET_KEY = createHash("sha256")
  .update(process.env.SAVE_SECRET || "worklife-isekai-encrypted-save-v1-key-2026")
  .digest();

function encryptSavePayload(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", SAVE_SECRET_KEY, iv);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return `${SAVE_PREFIX}${combined.toString("base64url")}`;
}

function decryptSavePayload(saveCode: string): { v: number; exportedAt?: number; userId?: string; state: Record<string, any> } {
  const trimmed = saveCode.trim();
  if (!trimmed.startsWith(SAVE_PREFIX)) {
    throw new Error("invalid_save_prefix");
  }
  const combined = Buffer.from(trimmed.slice(SAVE_PREFIX.length), "base64url");
  if (combined.length < 12 + 16 + 2) {
    throw new Error("invalid_save_length");
  }
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(12, combined.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", SAVE_SECRET_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const parsed = JSON.parse(decrypted.toString("utf8"));
  if (!parsed || parsed.v !== 1 || typeof parsed.state !== "object" || !parsed.state) {
    throw new Error("invalid_save_structure");
  }
  return parsed;
}

const revisionField = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

function replyCommandError(error: unknown, reply: FastifyReply) {
  if (error instanceof PlayerCommandRejected) {
    return reply.status(400).send({ error: error.code });
  }
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: "state_version_conflict", message: "状态已更新，请刷新后重试", stateRevision: error.stateRevision });
  }
  throw error;
}

export async function progressionRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  // 生涯统计
  app.get("/progression/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    // 先结算一次以保证统计最新
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send({ stats: next.stats, playtimeSeconds: next.stats?.playtimeSeconds || 0 });
  });

  // 主线章节里程碑与章节流派进度
  app.get("/progression/chapters", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send({
      completedChapters: next.progression?.completedChapters || {},
      completedMilestones: next.progression?.completedMilestones || {},
      builds: {
        chapter1: next.chapter1Build ?? null,
        chapter2: next.chapter2Build ?? null,
        chapter3: next.chapter3Build ?? null,
        chapter4: next.chapter4Build ?? null,
      },
      stateRevision: next.stateRevision,
    });
  });

  // 成就列表（含定义 + 个人进度）
  app.get("/progression/achievements", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const newlyUnlocked = syncAchievements(next);
    const saved = newlyUnlocked.length > 0 ? await storage.savePlayerState(userId, next) : next;

    const list = ACHIEVEMENTS.map((def) => {
      const prog = saved.achievements?.[def.id];
      const current = (saved.stats?.[def.metric] as number) || 0;
      return {
        ...def,
        progress: Math.min(current, def.target),
        current,
        unlocked: prog?.unlocked || false,
        claimed: prog?.claimed || false,
        unlockedAt: prog?.unlockedAt
      };
    });

    return reply.send({
      achievements: list,
      newlyUnlocked: newlyUnlocked.map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
      stateRevision: saved.stateRevision
    });
  });

  // 领取成就奖励
  app.post("/progression/achievements/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ achievementId: z.string().min(1), ...revisionField }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          syncAchievements(state);
          const result = claimAchievement(state, body.achievementId);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "claim_rejected");
          return result;
        },
      });
      return reply.send({
        ok: true,
        goldGained: outcome.result.goldGained || 0,
        gold: outcome.state.inventory.gold || 0,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  // 每日任务列表
  app.get("/progression/daily", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const daily = ensureDailyQuests(next);

    const quests = daily.quests.map((q) => ({
      ...q,
      progress: dailyProgress(next.stats!, q),
      completed: dailyProgress(next.stats!, q) >= q.target
    }));
    return reply.send({ date: daily.date, quests, stateRevision: next.stateRevision });
  });

  // 领取每日任务奖励
  app.post("/progression/daily/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ questId: z.string().min(1), ...revisionField }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = claimDailyQuest(state, body.questId);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "claim_rejected");
          return result;
        },
      });
      return reply.send({
        ok: true,
        goldGained: outcome.result.goldGained || 0,
        gold: outcome.state.inventory.gold || 0,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  // 玩家设置：读取
  app.get("/progression/settings", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    return reply.send({ settings: state.settings });
  });

  // 玩家设置：更新（部分字段）
  app.post("/progression/settings", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        soundEnabled: z.boolean().optional(),
        animationsEnabled: z.boolean().optional(),
        compactMode: z.boolean().optional(),
        notificationsEnabled: z.boolean().optional(),
        // 展示名：1-16 字符，不允许控制字符/HTML 元字符（名字会进入聊天播报与排行榜，
        // 前端虽按 JSX 转义，落库仍收紧避免任何字面 <tag> 入库）；空串表示清除回退默认名
        playerName: z.string().trim().max(16).refine((s) => s === "" || /^[^\p{Cc}\p{Cf}<>"'`\\\/]+$/u.test(s), "invalid name").optional().nullable(),
        avatar: z.string().min(1).max(64).optional().nullable(),
        gender: z.enum(["male", "female", "animal", "secret"]).optional().nullable(),
        characterCreated: z.boolean().optional(),
        tutorialDone: z.boolean().optional()
      })
      .strict()      .parse((req.body ?? {}) as unknown);

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const prev = state.settings;
    const justCreated = !prev?.characterCreated && Boolean(body.characterCreated);
    state.settings = {
      soundEnabled: body.soundEnabled ?? prev?.soundEnabled ?? true,
      animationsEnabled: body.animationsEnabled ?? prev?.animationsEnabled ?? true,
      compactMode: body.compactMode ?? prev?.compactMode ?? false,
      notificationsEnabled: body.notificationsEnabled ?? prev?.notificationsEnabled ?? true,
      playerName: body.playerName === undefined ? prev?.playerName : (body.playerName ? body.playerName : undefined),
      avatar: body.avatar === undefined ? prev?.avatar : (body.avatar ?? undefined),
      // 性别仅在捏人建角时确定；建角完成后如已有性别则锁定不可再改
      gender: prev?.characterCreated && prev?.gender
        ? (prev.gender === "secret" ? "animal" : prev.gender)
        : (body.gender === undefined
          ? (prev?.gender === "secret" ? "animal" : prev?.gender)
          : (body.gender === "secret" ? "animal" : (body.gender ?? undefined))),
      // 建号标记只许 0→1：回滚会让前端重弹建角屏并重复全服欢迎播报
      characterCreated: prev?.characterCreated ? true : (body.characterCreated ?? prev?.characterCreated),
      tutorialDone: body.tutorialDone ?? prev?.tutorialDone
    };
    if (justCreated) {
      // 新手建角仅赠送基础恢复药水（初级生命药水、初级魔力药水），不自动塞入高额属性状态药以防秒杀新手怪
      const starterPotions: Record<string, number> = {
        potion_hp_t1: 3,
        potion_mp_t1: 2,
      };
      for (const [itemId, qty] of Object.entries(starterPotions)) {
        state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
      }
      if (!state.combatLoadout || (!state.combatLoadout.food?.length && !state.combatLoadout.drink?.length)) {
        state.combatLoadout = {
          food: [{ itemId: "potion_hp_t1", triggerMissingHp: 25 }],
          mp: [{ itemId: "potion_mp_t1", triggerMissingMp: 20 }],
          drink: [],
          autoRepeat: state.combatLoadout?.autoRepeat ?? false,
        };
      }
    }
    const saved = await storage.savePlayerState(userId, state);
    // 建号落库瞬间全服播报新村民
    if (justCreated) {
      const name = saved.settings?.playerName || `玩家_${userId.slice(0, 6)}`;
      storage.announceWorld?.(`🌱 欢迎新村民「${name}」来到异世界打工！`);
    }
    return reply.send({ ok: true, settings: saved.settings, inventory: saved.inventory, combatLoadout: saved.combatLoadout, stateRevision: saved.stateRevision });
  });

  // 加密存档导出（AES-256-GCM 密文，禁止明文 JSON）
  app.get("/progression/save/export", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const saveCode = encryptSavePayload({
      v: 1,
      exportedAt: Date.now(),
      userId,
      state: next,
    });
    return reply.send({ ok: true, saveCode });
  });

  // 加密存档导入（校验 AES-256-GCM 认证标签并恢复玩家状态）
  app.post("/progression/save/import", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        saveCode: z.string().min(20).max(500_000),
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    let envelope: { v: number; state: Record<string, any> };
    try {
      envelope = decryptSavePayload(body.saveCode);
    } catch {
      return reply.status(400).send({ error: "invalid_save_code", message: "存档密文无效或已被篡改，仅支持导入加密存档" });
    }

    const incoming = envelope.state;
    if (!incoming || typeof incoming.inventory !== "object" || typeof incoming.skills !== "object") {
      return reply.status(400).send({ error: "invalid_save_state", message: "存档数据结构不完整" });
    }

    const current = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const restored = {
      ...current,
      ...incoming,
      userId,
      partyState: current.partyState,
      partyInvites: current.partyInvites,
      stateRevision: current.stateRevision,
      lastSimulatedAt: new Date().toISOString(),
    };
    const saved = await storage.savePlayerState(userId, restored as any);
    return reply.send({ ok: true, state: saved, stateRevision: saved.stateRevision });
  });
}
