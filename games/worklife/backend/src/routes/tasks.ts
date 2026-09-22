import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
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

  app.get("/tasks", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const now = new Date();
    const next = await load(userId, now);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(taskBoardView(saved, contentPack, now));
  });

  app.post("/tasks/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const next = await load(userId, now);
    const res = claimTask(next, contentPack, body.taskId, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });

  app.post("/tasks/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const next = await load(userId, now);
    const res = rerollTask(next, contentPack, body.taskId, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });

  app.post("/tasks/delete", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ taskId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const next = await load(userId, now);
    const res = deleteTask(next, contentPack, body.taskId, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });

  app.post("/tasks/block", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ skillId: z.string().min(1), blocked: z.boolean() }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const next = await load(userId, now);
    const res = setTaskBlock(next, contentPack, body.skillId, body.blocked, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });

  app.post("/tasks/shop/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ itemId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const next = await load(userId, now);
    const res = buyTaskShop(next, contentPack, body.itemId, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });

  app.post("/tasks/gift/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const now = new Date();
    const next = await load(userId, now);
    const res = claimGift(next, contentPack, now);
    if (!res.ok) return fail(reply, res);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, board: taskBoardView(saved, contentPack, now) });
  });
}
