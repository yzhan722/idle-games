import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";

export async function equipmentRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.get("/equipment/durability/:itemId", async (req: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const { itemId } = req.params;

    try {
      const info = await storage.getDurabilityInfo({ userId, itemId });
      return reply.send(info);
    } catch (error) {
      return reply.status(404).send({ error: error instanceof Error ? error.message : "获取耐久度信息失败" });
    }
  });

  app.post("/equipment/repair", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({
      itemId: z.string().min(1),
      repairType: z.enum(['full', 'partial']).default('full'),
      targetDurability: z.number().optional()
    }).parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.repairEquipment({
        userId,
        request: {
          itemId: body.itemId,
          repairType: body.repairType,
          targetDurability: body.targetDurability
        }
      });
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "修复装备失败" });
    }
  });

  app.get("/equipment/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    try {
      const stats = await storage.getEquipmentStats({ userId, contentPack });
      return reply.send(stats);
    } catch (error) {
      return reply.status(500).send({ error: "获取装备属性失败" });
    }
  });


  app.get("/equipment/set-bonuses", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    try {
      const bonuses = await storage.getActiveSetBonuses({ userId, contentPack });
      return reply.send(bonuses);
    } catch (error) {
      return reply.status(500).send({ error: "获取套装效果失败" });
    }
  });
}
