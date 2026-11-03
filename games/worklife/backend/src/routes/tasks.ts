import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import { buyTaskShop, claimGift, claimTask, deleteTask, rerollTask, setTaskBlock, taskBoardView } from "../tasks";

const MESSAGES: Record<string, string> = {
  task_not_found: "任务不存在",
  task_incomplete: "任务还没完成",
  no_gold: "金币不足",
  no_task_available: "现在没有可发的任务",
  unknown_skill: "未知技能",
  no_block_slot: "屏蔽槽位不够，去任务商店买",
  unknown_item: "商店里没有这个",
  sold_out: "已经买满了",
  no_tokens: "任务代币不足",
  gift_not_ready: "礼物还没攒够",
};

export async function tasksRoutes(app: FastifyInstance, storage: Storage, contentPack: EnhancedContentPack) {
  const load = async (userId: string, now: Date) => {
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    return storage.simulateToNow({ userId, state, now, contentPack });
  };
  const fail = (reply: FastifyReply, res: { error?: string; cost?: number }) =>
    reply.status(400).send({ error: res.error, message: MESSAGES[res.error || ""] || res.error, cost: res.cost });

  const revisionSchema = {
    expectedRevision: z.number().int().nonnegative().optional(),
    operationId: z.string().min(1).max(128).optional(),
  };
  const runTaskCommand = <R extends { ok: boolean; error?: string; cost?: number }>(
    userId: string, body: { expectedRevision?: number; operationId?: string } & Record<string, unknown>, now: Date,
    op: (state: EnhancedPlayerState, now: Date) => R
  ) => storage.executePlayerCommand({
    userId, contentPack, now, expectedRevision: body.expectedRevision,
    operationId: body.operationId, operationPayload: operationPayload(body),
    apply(state) {
      const res = op(state, now);
      if (!res.ok) throw new PlayerCommandRejected(res.error || 'task_rejected', { cost: res.cost });
      return res;
    },
  });
  const commandFail = (reply: FastifyReply, error: unknown) => {
    if (error instanceof PlayerCommandRejected) {
      const details = error.details as { cost?: number } | undefined;
      return fail(reply, { error: error.code, cost: details?.cost });
    }
    if (error instanceof PlayerCommandConflict) {
      return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
    }
    throw error;
  };

  app.get("/tasks", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const now = new Date();
    const next = await load(userId, now);
    return reply.send({ ...taskBoardView(next, contentPack, now), stateRevision: next.stateRevision });
  });

  app.post("/tasks/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => claimTask(s, contentPack, body.taskId, n));
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/tasks/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => rerollTask(s, contentPack, body.taskId, n));
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/tasks/delete", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => deleteTask(s, contentPack, body.taskId, n));
      return reply.send({ ...outcome.result, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/tasks/block", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ skillId: z.string().min(1), blocked: z.boolean(), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => setTaskBlock(s, contentPack, body.skillId, body.blocked, n));
      return reply.send({ ...outcome.result, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/tasks/shop/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ itemId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => buyTaskShop(s, contentPack, body.itemId, n));
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/tasks/gift/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await runTaskCommand(userId, body, now, (s, n) => claimGift(s, contentPack, n));
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, board: taskBoardView(outcome.state, contentPack, now), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });
}
