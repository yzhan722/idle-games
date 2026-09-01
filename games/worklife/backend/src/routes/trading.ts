import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";

export async function tradingRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.get("/trading/listings", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const query = req.query as any;

    try {
      const listings = await storage.getMarketListings({ 
        query: query.search,
        filters: query.filters ? JSON.parse(query.filters) : undefined
      });
      return reply.send(listings);
    } catch (error) {
      return reply.status(500).send({ error: "获取交易列表失败" });
    }
  });

  app.post("/trading/list", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      itemId: z.string().min(1).max(100),
      quantity: z.number().int().min(1).max(999999),
      pricePerUnit: z.number().int().min(1).max(1000000000),
      duration: z.number().int().min(1).max(168).optional() // 最多7天
    }).parse((req.body ?? {}) as unknown);

    try {
      const listing = await storage.listItemForSale({
        userId,
        itemId: body.itemId,
        quantity: body.quantity,
        pricePerUnit: body.pricePerUnit,
        duration: body.duration
      });
      
      return reply.send(listing);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "上架物品失败" });
    }
  });

  app.post("/trading/purchase", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      listingId: z.string().uuid(),
      quantity: z.number().int().min(1).max(999999)
    }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.purchaseItem({
        userId,
        listingId: body.listingId,
        quantity: body.quantity
      });
      
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "购买物品失败" });
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
      type: z.enum(['sell', 'buy'])
    }).parse(req.body);
    
    try {
      const result = await storage.createTradingOrder({
        userId,
        itemId: body.itemId,
        quantity: body.quantity,
        price: body.price,
        type: body.type
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
      quantity: z.number().int().min(1).max(999999)
    }).parse(req.body);
    
    try {
      const result = await storage.executeTrade({
        buyerId: userId,
        orderId: body.orderId,
        quantity: body.quantity
      });
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
    
    const { orderId } = req.params;
    
    try {
      await storage.cancelTradingOrder({ userId, orderId });
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
    const query = req.query as any;
    const days = query.days ? parseInt(query.days) : 7;

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

    try {
      const trend = await storage.getItemPriceTrend({ itemId });
      return reply.send(trend);
    } catch (error) {
      return reply.status(500).send({ error: "获取价格趋势失败" });
    }
  });
}
