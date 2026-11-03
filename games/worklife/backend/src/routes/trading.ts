import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { ensurePresetMarketOrders } from "../market_presets";

export async function tradingRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  // 初始化商会补给站预设资源挂单（高于正常店价，保证新玩家开荒顺畅滚雪球）
  await ensurePresetMarketOrders(storage, contentPack);

  // MWI market overview: best ask / bid per item so the grid can show live prices, not only shop value.
  app.get("/trading/summary", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    try {
      return reply.send(await storage.getMarketSummary());
    } catch {
      return reply.status(500).send({ error: "Failed to fetch market summary" });
    }
  });

  app.get("/trading/orders/:itemId", async (req: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { itemId } = req.params;
    
    try {
      const orders = await storage.getTradingOrders({ itemId });
      return reply.send(orders);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch orders" });
    }
  });

  app.post("/trading/orders", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      itemId: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(999999),
      price: z.number().int().min(1).max(1000000000),
      type: z.enum(['sell', 'buy']),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "trading/orders", itemId: body.itemId, quantity: body.quantity, price: body.price, type: body.type },
        run: () => storage.createTradingOrder({
          userId,
          itemId: body.itemId,
          quantity: body.quantity,
          price: body.price,
          type: body.type,
          contentPack
        }),
      });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || "Failed to create order" });
    }
  });

  app.post("/trading/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      orderId: z.string().uuid(),
      quantity: z.number().int().min(1).max(999999),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "trading/buy", orderId: body.orderId, quantity: body.quantity },
        run: () => storage.executeTrade({
          buyerId: userId,
          orderId: body.orderId,
          quantity: body.quantity
        }),
      });
      void ensurePresetMarketOrders(storage, contentPack);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || "Failed to execute trade" });
    }
  });

  app.delete("/trading/orders/:orderId", async (req: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { orderId } = z.object({ orderId: z.string().min(1).max(128) }).parse(req.params ?? {});
    const { operationId } = z.object({ operationId: z.string().min(1).max(128).optional() }).parse(req.query ?? {});

    try {
      await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      await storage.deduplicateOperation({
        userId, operationId, operationPayload: { route: "trading/orders:delete", orderId },
        run: async () => { await storage.cancelTradingOrder({ userId, orderId }); },
      });
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message || "Failed to cancel order" });
    }
  });

  app.get("/trading/my-orders", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    try {
      const orders = await storage.getMyTradingOrders({ userId });
      return reply.send(orders);
    } catch (error) {
      return reply.status(500).send({ error: "Failed to fetch my orders" });
    }
  });

  app.get("/trading/price-history/:itemId", async (req: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { itemId } = req.params;
    const q = z.object({ days: z.coerce.number().int().min(1).max(365).optional() })
      .parse((req.query ?? {}) as unknown);
    const days = q.days ?? 7;

    // 不存在的物品不编造空历史，直接 404
    if (!(contentPack.items as Array<{ id: string }>).some((i) => i.id === itemId)) {
      return reply.status(404).send({ error: "item_not_found" });
    }

    try {
      const history = await storage.getPriceHistory({ itemId, days });
      return reply.send(history);
    } catch (error) {
      return reply.status(500).send({ error: "获取价格历史失败" });
    }
  });

  app.get("/trading/price-trend/:itemId", async (req: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { itemId } = req.params;
    if (!(contentPack.items as Array<{ id: string }>).some((i) => i.id === itemId)) {
      return reply.status(404).send({ error: "item_not_found" });
    }

    try {
      const trend = await storage.getItemPriceTrend({ itemId });
      return reply.send(trend);
    } catch (error) {
      return reply.status(500).send({ error: "获取价格趋势失败" });
    }
  });
}
