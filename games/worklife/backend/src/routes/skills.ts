import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";

export async function skillsRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.get("/skills/tree/:professionId", async (req: FastifyRequest<{ Params: { professionId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { professionId } = req.params;

    try {
      const skillTree = await storage.getSkillTree({ professionId, contentPack });
      return reply.send(skillTree);
    } catch (error) {
      return reply.status(404).send({ error: "技能树不存在" });
    }
  });

  app.get("/skills/progress/:professionId", async (req: FastifyRequest<{ Params: { professionId: string } }>, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const { professionId } = req.params;

    // 先校验职业存在：不存在的职业此前落入 catch 返回 500，
    // 与 /skills/tree/:id 的 404 语义不一致（资源不存在 ≠ 服务器故障）。
    const skillIds = new Set(((contentPack as any).skills || []).map((s: any) => s.id));
    if (!skillIds.has(`skill_${professionId}`)) {
      return reply.status(404).send({ error: "profession_not_found", message: "职业不存在" });
    }

    try {
      const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
      const progress = await storage.getPlayerSkillProgress({ userId, professionId });
      return reply.send(progress);
    } catch (error) {
      return reply.status(500).send({ error: "获取技能进度失败" });
    }
  });

  app.post("/skills/unlock", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({
      professionId: z.string().min(1),
      nodeId: z.string().min(1)
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
      const result = await storage.unlockSkillNode({
        userId,
        professionId: body.professionId,
        nodeId: body.nodeId,
        contentPack
      });
      
      if (result.success) {
        return reply.send({ success: true, message: "技能节点解锁成功" });
      } else {
        return reply.status(400).send({ success: false, error: result.message });
      }
    } catch (error) {
      return reply.status(500).send({ error: "解锁技能节点失败" });
    }
  });
}
