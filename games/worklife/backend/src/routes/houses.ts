import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { houseView, upgradeRoom } from "../houses";

const MESSAGES: Record<string, string> = {
  unknown_room: "没有这间房",
  max_level: "已经满级了",
  missing_materials: "材料不够",
  no_gold: "金币不足",
};

export async function housesRoutes(app: FastifyInstance, storage: Storage, contentPack: EnhancedContentPack) {
  app.get("/houses", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send(houseView(next, contentPack));
  });

  app.post("/houses/upgrade", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ roomId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const res = upgradeRoom(next, contentPack, body.roomId);
    if (!res.ok) {
      const key = String(res.error || "").split(":")[0];
      return reply.status(400).send({ error: res.error, message: MESSAGES[key] || res.error, cost: res.cost });
    }
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...res, house: houseView(saved, contentPack) });
  });
}
