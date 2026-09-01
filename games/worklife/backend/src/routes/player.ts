import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";

export async function playerRoutes(
  app: FastifyInstance, 
  storage: Storage, 
  contentPack: EnhancedContentPack
) {
  app.get("/player/state", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });

    return reply.send(next);
  });

  app.post("/actions/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z
      .object({
        actionId: z.string().min(1),
        quantity: z.number().int().positive().max(5000).optional(),
      })
      .parse((req.body ?? {}) as unknown);
    try {
      const result = await storage.startLifeAction({ userId, actionId: body.actionId, quantity: body.quantity, now: new Date(), contentPack });
      return reply.send(result);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.startsWith("skill_level_required:")) {
        const need = msg.split(":")[1];
        return reply.status(400).send({ error: "skill_level_required", message: `技能等级不足，需要 ${need} 级` });
      }
      if (msg === "unknown_action") {
        return reply.status(400).send({ error: "unknown_action", message: "未知的动作" });
      }
      throw err;
    }
  });

  app.post("/actions/stop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const playerState = await storage.getOrCreatePlayerState(userId, "unknown");
    playerState.mode = "idle";
    playerState.lifeActionState = undefined;
    playerState.combatFarmState = undefined;
    
    const finalState = await storage.simulateToNow({
      userId,
      state: playerState,
      now: new Date(),
      contentPack
    });
    
    return reply.send(finalState);
  });

  app.post("/combat/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z.object({ stageId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const result = await storage.startCombatFarm({ userId, stageId: body.stageId, now: new Date() });
    return reply.send(result);
  });
}
