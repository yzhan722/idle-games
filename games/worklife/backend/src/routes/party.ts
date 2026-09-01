import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";

export async function partyRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.post("/party/create", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({ name: z.string().optional() }).parse((req.body ?? {}) as unknown);

    try {
      const party = await storage.createParty({ userId, name: body.name });
      return reply.send(party);
    } catch (error) {
      return reply.status(500).send({ error: "创建队伍失败" });
    }
  });

  app.post("/party/join", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({ partyId: z.string().min(1) }).parse((req.body ?? {}) as unknown);

    try {
      const party = await storage.joinParty({ userId, partyId: body.partyId });
      return reply.send(party);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "加入队伍失败" });
    }
  });


  app.post("/party/start-activity", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({
      partyId: z.string().min(1),
      activityType: z.enum(['combat', 'group_craft']),
      stageId: z.string().optional()
    }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.startPartyActivity({
        userId,
        partyId: body.partyId,
        activityType: body.activityType,
        stageId: body.stageId
      });
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "开始活动失败" });
    }
  });

  app.post("/party/complete-activity", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({ partyId: z.string().min(1) }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.completePartyActivity({ userId, partyId: body.partyId, contentPack });
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "完成活动失败" });
    }
  });

  app.post("/party/leave", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({ partyId: z.string().min(1) }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.leaveParty({ userId, partyId: body.partyId });
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "离开队伍失败" });
    }
  });
}
