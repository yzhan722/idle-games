import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
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

  const revisionSchema = {
    expectedRevision: z.number().int().nonnegative().optional(),
    operationId: z.string().min(1).max(128).optional(),
  };
  const runCommand = <T>(userId: string, body: { expectedRevision?: number; operationId?: string } & Record<string, unknown>, apply: (state: EnhancedPlayerState) => T) =>
    storage.executePlayerCommand({ userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision, operationId: body.operationId, operationPayload: operationPayload(body), apply });
  const commandFail = (reply: FastifyReply, error: unknown) => {
    if (error instanceof PlayerCommandRejected) return reply.status(400).send({ error: error.code });
    if (error instanceof PlayerCommandConflict) {
      return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
    }
    throw error;
  };

  /* ----------------------- 声望 ----------------------- */

  app.get("/progression2/reputation", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send({ ...getReputationInfo(next), stateRevision: next.stateRevision });
  });

  /* ----------------------- 赏金契约 ----------------------- */

  app.get("/progression2/bounties", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const hadBounties = Boolean(next.bounties);
    const info = getBountyInfo(next); // ensureBounties 可能初始化契约板
    const saved = !hadBounties ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/bounties/accept", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = acceptBounty(state, body.bountyId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'accept_rejected');
        return res;
      });
      return reply.send({ ok: true, ...getBountyInfo(outcome.state), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimBounty(state, body.bountyId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'claim_rejected');
        // 领奖可能提升声望，顺带同步成就（声望奖励的金币计入财富成就）
        syncAchievements(state);
        return res;
      });
      return reply.send({
        ok: true,
        reward: { gold: outcome.result.gold, reputation: outcome.result.reputation, items: outcome.result.items },
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state),
        ...getBountyInfo(outcome.state),
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = rerollBounties(state);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'reroll_rejected');
        return res;
      });
      return reply.send({ ok: true, cost: outcome.result.cost, rerollsLeft: outcome.result.rerollsLeft, ...getBountyInfo(outcome.state), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  /* ----------------------- 转生 ----------------------- */

  app.get("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send({ ...getPrestigeInfo(next), stateRevision: next.stateRevision });
  });

  app.post("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      return reply.status(409).send({ error: "in_combat", message: "正在组队副本中，请先停止战斗再转生" });
    }
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = doPrestige(state);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'prestige_rejected');
        return res;
      });
      return reply.send({
        ok: true,
        gainedPoints: outcome.result.gainedPoints,
        totalPoints: outcome.result.totalPoints,
        multiplier: outcome.result.multiplier,
        prestige: getPrestigeInfo(outcome.state),
        inventory: outcome.state.inventory,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) { return commandFail(reply, error); }
  });
}
