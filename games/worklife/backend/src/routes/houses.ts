import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { houseView, upgradeRoom } from "../houses";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';

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
    const body = z.object({ roomId: z.string().min(1), expectedRevision: z.number().int().nonnegative().optional(), operationId: z.string().min(1).max(128).optional() }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = upgradeRoom(state, contentPack, body.roomId);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'upgrade_rejected', { cost: result.cost });
          return result;
        },
      });
      return reply.send({
        ...outcome.result,
        house: houseView(outcome.state, contentPack),
        inventory: outcome.state.inventory,
        gold: outcome.state.inventory.gold || 0,
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      if (error instanceof PlayerCommandRejected) {
        const key = error.code.split(':')[0];
        const details = error.details as { cost?: unknown } | undefined;
        return reply.status(400).send({ error: error.code, message: MESSAGES[key] || error.code, cost: details?.cost });
      }
      if (error instanceof PlayerCommandConflict) {
        return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后确认升级', stateRevision: error.stateRevision });
      }
      throw error;
    }
  });
}
