import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { syncAchievements } from "../progression";
import {
  getReputationInfo,
  getBountyInfo,
  acceptBounty,
  claimBounty,
  rerollBounties,
  getPrestigeInfo,
  doPrestige
} from "../progression2";

/**
 * 进阶进度路由：声望 / 赏金契约 / 转生。
 * 统一遵循 getOrCreatePlayerState -> simulateToNow -> 业务逻辑 -> savePlayerState 的模式。
 */
export async function progression2Routes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  const ver = contentPack.version || "1.0.0";

  /* ----------------------- 声望 ----------------------- */

  app.get("/progression2/reputation", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    await storage.savePlayerState(userId, next);
    return reply.send(getReputationInfo(next));
  });

  /* ----------------------- 赏金契约 ----------------------- */

  app.get("/progression2/bounties", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const info = getBountyInfo(next); // ensureBounties 可能初始化契约板
    await storage.savePlayerState(userId, next);
    return reply.send(info);
  });

  app.post("/progression2/bounties/accept", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = acceptBounty(next, body.bountyId);
    if (!result.ok) return reply.status(400).send({ error: result.reason });
    await storage.savePlayerState(userId, next);
    return reply.send({ ok: true, ...getBountyInfo(next) });
  });

  app.post("/progression2/bounties/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = claimBounty(next, body.bountyId);
    if (!result.ok) return reply.status(400).send({ error: result.reason });
    // 领奖可能提升声望，顺带同步成就（声望奖励的金币计入财富成就）
    syncAchievements(next);
    await storage.savePlayerState(userId, next);
    return reply.send({
      ok: true,
      reward: { gold: result.gold, reputation: result.reputation, items: result.items },
      inventory: next.inventory,
      reputation: getReputationInfo(next),
      ...getBountyInfo(next)
    });
  });

  app.post("/progression2/bounties/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = rerollBounties(next);
    if (!result.ok) return reply.status(400).send({ error: result.reason });
    await storage.savePlayerState(userId, next);
    return reply.send({ ok: true, cost: result.cost, rerollsLeft: result.rerollsLeft, ...getBountyInfo(next) });
  });

  /* ----------------------- 转生 ----------------------- */

  app.get("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    await storage.savePlayerState(userId, next);
    return reply.send(getPrestigeInfo(next));
  });

  app.post("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = doPrestige(next);
    if (!result.ok) return reply.status(400).send({ error: result.reason });
    await storage.savePlayerState(userId, next);
    return reply.send({
      ok: true,
      gainedPoints: result.gainedPoints,
      totalPoints: result.totalPoints,
      multiplier: result.multiplier,
      prestige: getPrestigeInfo(next),
      inventory: next.inventory
    });
  });
}
