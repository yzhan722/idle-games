import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import {
  consumeItem,
  getBuffEffects,
  pruneExpiredBuffs,
  getCheckInInfo,
  doCheckIn,
  getShopStock,
  buyFromShop,
  sellToShop,
  sellPrice
} from "../systems";

export async function systemsRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  const ver = contentPack.version || "1.0.0";

  /* ----------------------- 消耗品 / Buff ----------------------- */

  // 当前生效的 Buff 与汇总效果
  app.get("/systems/buffs", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const now = new Date();
    pruneExpiredBuffs(next, now);
    await storage.savePlayerState(userId, next);
    return reply.send({
      buffs: (next.activeBuffs || []).map((b) => ({
        ...b,
        remainingSec: Math.max(0, Math.floor((Date.parse(b.expiresAt) - now.getTime()) / 1000))
      })),
      effects: getBuffEffects(next, now)
    });
  });

  // 使用消耗品（食物/药水）
  app.post("/systems/consume", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ itemId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = consumeItem(next, contentPack, body.itemId, new Date());
    if (!result.ok) return reply.status(400).send({ error: result.reason });

    await storage.savePlayerState(userId, next);
    return reply.send({
      ok: true,
      itemName: result.itemName,
      healed: result.healed,
      buff: result.buff,
      inventory: next.inventory,
      activeBuffs: next.activeBuffs || []
    });
  });

  /* ----------------------- 每日签到 ----------------------- */

  // 签到信息（不发放）
  app.get("/systems/checkin", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send(getCheckInInfo(next, new Date()));
  });

  // 执行签到
  app.post("/systems/checkin", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const result = doCheckIn(next, new Date());
    if (!result.ok) return reply.status(400).send({ error: result.reason });

    await storage.savePlayerState(userId, next);
    return reply.send({
      ok: true,
      reward: result.reward,
      streak: result.streak,
      totalDays: result.totalDays,
      cycleDay: result.cycleDay,
      gold: next.inventory.gold || 0,
      inventory: next.inventory
    });
  });

  /* ----------------------- 商店 ----------------------- */

  // 商店在售列表 + 当前金币
  app.get("/systems/shop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    return reply.send({
      stock: getShopStock(contentPack),
      gold: state.inventory.gold || 0
    });
  });

  // 购买
  app.post("/systems/shop/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(9999) })
      .parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = buyFromShop(next, contentPack, body.itemId, body.qty);
    if (!result.ok) return reply.status(400).send({ error: result.reason });

    await storage.savePlayerState(userId, next);
    return reply.send({ ...result, inventory: next.inventory });
  });

  // 出售
  app.post("/systems/shop/sell", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(99999) })
      .parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });

    const result = sellToShop(next, contentPack, body.itemId, body.qty);
    if (!result.ok) return reply.status(400).send({ error: result.reason });

    await storage.savePlayerState(userId, next);
    return reply.send({ ...result, inventory: next.inventory });
  });

  // 估价：返回背包内可出售物品的单价（用于前端展示卖价）
  app.get("/systems/shop/sell-prices", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const prices: Record<string, number> = {};
    for (const itemId of Object.keys(state.inventory)) {
      if (itemId === "gold") continue;
      const def = (contentPack.items as any[]).find((it) => it.id === itemId);
      if (def) prices[itemId] = sellPrice(def);
    }
    return reply.send({ prices });
  });
}
