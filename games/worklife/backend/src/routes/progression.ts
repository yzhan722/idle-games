import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import {
  ACHIEVEMENTS,
  syncAchievements,
  claimAchievement,
  ensureDailyQuests,
  dailyProgress,
  claimDailyQuest
} from "../progression";

const revisionField = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

function replyCommandError(error: unknown, reply: FastifyReply) {
  if (error instanceof PlayerCommandRejected) {
    return reply.status(400).send({ error: error.code });
  }
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
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

  // 成就列表（含定义 + 个人进度）
  app.get("/progression/achievements", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const newlyUnlocked = syncAchievements(next);
    await storage.savePlayerState(userId, next);

    const list = ACHIEVEMENTS.map((def) => {
      const prog = next.achievements?.[def.id];
      const current = (next.stats?.[def.metric] as number) || 0;
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
      newlyUnlocked: newlyUnlocked.map((d) => ({ id: d.id, name: d.name, icon: d.icon }))
    });
  });

  // 领取成就奖励
  app.post("/progression/achievements/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ achievementId: z.string().min(1), ...revisionField }).parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          syncAchievements(state);
          const result = claimAchievement(state, body.achievementId);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || 'claim_rejected');
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
    await storage.savePlayerState(userId, next);

    const quests = daily.quests.map((q) => ({
      ...q,
      progress: dailyProgress(next.stats!, q),
      completed: dailyProgress(next.stats!, q) >= q.target
    }));
    return reply.send({ date: daily.date, quests });
  });

  // 领取每日任务奖励
  app.post("/progression/daily/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ questId: z.string().min(1), ...revisionField }).parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = claimDailyQuest(state, body.questId);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || 'claim_rejected');
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
        notificationsEnabled: z.boolean().optional()
      })
      .parse((req.body ?? {}) as unknown);

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    state.settings = {
      soundEnabled: body.soundEnabled ?? state.settings?.soundEnabled ?? true,
      animationsEnabled: body.animationsEnabled ?? state.settings?.animationsEnabled ?? true,
      compactMode: body.compactMode ?? state.settings?.compactMode ?? false,
      notificationsEnabled: body.notificationsEnabled ?? state.settings?.notificationsEnabled ?? true
    };
    await storage.savePlayerState(userId, state);
    return reply.send({ ok: true, settings: state.settings });
  });
}
