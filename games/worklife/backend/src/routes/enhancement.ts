import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { startEnhanceRun, stopEnhanceRun } from "../enhancement_run";

export async function enhancementRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.post("/enhancement/enhance", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      itemId: z.string().min(1).max(100),
      targetLevel: z.number().int().min(1).max(20),
      serviceProviderId: z.string().uuid().optional(),
      protectionItemId: z.literal("mirror_protection").optional(),
    }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.enhanceEquipment({
        userId,
        request: {
          itemId: body.itemId,
          targetLevel: body.targetLevel,
          materials: {},
          serviceProviderId: body.serviceProviderId,
          protectionItemId: body.protectionItemId,
        },
        contentPack
      });
      
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: "装备强化失败" });
    }
  });

  // MWI: enhancing as a timed action. Start with a target level; the simulator settles attempts.
  app.post("/enhancement/run/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({
      itemId: z.string().min(1).max(100),
      targetLevel: z.number().int().min(1).max(20),
      useProtection: z.boolean().optional(),
    }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const res = startEnhanceRun(next, contentPack, body, now);
    if (!res.ok) return reply.status(400).send({ error: res.error, message: res.message });
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.post("/enhancement/run/stop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    stopEnhanceRun(next, now);
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.get("/enhancement/info/:itemId", async (req: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { itemId } = req.params;

    try {
      const info = await storage.getEnhancementInfo({ userId, itemId, contentPack });
      return reply.send(info);
    } catch (error) {
      return reply.status(404).send({ error: "装备信息不存在" });
    }
  });

  app.get("/enhancement/providers/:itemType", async (req: FastifyRequest<{ Params: { itemType: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { itemType } = req.params;

    try {
      const providers = await storage.getEnhancementProviders({ itemType, contentPack });
      return reply.send(providers);
    } catch (error) {
      return reply.status(500).send({ error: "获取服务提供者失败" });
    }
  });

  app.post("/enhancement/request-service", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      providerId: z.string().uuid(),
      itemId: z.string().min(1).max(100),
      targetLevel: z.number().int().min(1).max(20),
      message: z.string().max(500).optional()
    }).parse((req.body ?? {}) as unknown);

    try {
      const request = await storage.createEnhancementServiceRequest({
        requesterId: userId,
        providerId: body.providerId,
        itemId: body.itemId,
        targetLevel: body.targetLevel,
        message: body.message,
        contentPack
      });
      
      return reply.send(request);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "创建服务请求失败" });
    }
  });

  app.post("/enhancement/respond-service", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      requestId: z.string().uuid(),
      accepted: z.boolean(),
      message: z.string().max(500).optional()
    }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.respondToEnhancementServiceRequest({
        requestId: body.requestId,
        providerId: userId,
        accepted: body.accepted,
        message: body.message,
        contentPack
      });
      
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "响应服务请求失败" });
    }
  });

  app.get("/enhancement/my-requests", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const requests = await storage.getEnhancementServiceRequests({ userId, type: 'requester' });
      return reply.send(requests);
    } catch (error) {
      return reply.status(500).send({ error: "获取服务请求失败" });
    }
  });

  app.get("/enhancement/received-requests", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const requests = await storage.getEnhancementServiceRequests({ userId, type: 'provider' });
      return reply.send(requests);
    } catch (error) {
      return reply.status(500).send({ error: "获取收到的服务请求失败" });
    }
  });
}
