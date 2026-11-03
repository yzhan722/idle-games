import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { startNextQueuedAction, type Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import { startEnhanceRun, stopEnhanceRun } from "../enhancement_run";

const revisionSchema = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

const commandFail = (reply: FastifyReply, error: unknown) => {
  if (error instanceof PlayerCommandRejected) {
    const details = error.details as { message?: string } | undefined;
    return reply.status(400).send({ error: error.code, message: details?.message ?? error.code });
  }
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
  }
  throw error;
};

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
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      return reply.status(409).send({ error: "in_combat", message: "战斗中不能强化，请先停止战斗" });
    }

    try {
      const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      const inSoloCombat = Boolean(
        state.hpCombat &&
          (!state.hpCombat.outcome || (state.combatLoadout?.autoRepeat && state.hpCombat.nextFightAt))
      );
      if (inSoloCombat) {
        return reply.status(409).send({ error: "in_combat", message: "战斗中不能强化，请先停止战斗" });
      }
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "enhancement/enhance", ...(operationPayload(body) as Record<string, unknown>) },
        run: () => storage.enhanceEquipment({
          userId,
          request: {
            itemId: body.itemId,
            targetLevel: body.targetLevel,
            materials: {},
            serviceProviderId: body.serviceProviderId,
            protectionItemId: body.protectionItemId,
          },
          contentPack
        }),
      });

      if (!result.success && Object.keys(result.consumedMaterials || {}).length === 0) {
        return reply.status(400).send({ error: "enhance_failed", message: result.failureReason || "强化失败" });
      }
      return reply.send(result);
    } catch (error) {
      req.log.error(error);
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
      ...revisionSchema,
    }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    const inPartyCombat = Boolean(activeParty?.currentActivity);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const inSoloCombat = Boolean(
            state.hpCombat &&
              (!state.hpCombat.outcome || state.hpCombat.nextFightAt)
          );
          if (inPartyCombat || inSoloCombat) {
            throw new PlayerCommandRejected('in_combat', { message: '战斗中不能强化，请先停止战斗' });
          }
          const res = startEnhanceRun(state, contentPack, body, now);
          if (!res.ok) throw new PlayerCommandRejected(res.error || 'enhance_rejected', { message: res.message });
          return res;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/enhancement/run/stop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          stopEnhanceRun(state, now);
          const inSoloCombat = Boolean(
            state.hpCombat &&
              (!state.hpCombat.outcome || state.hpCombat.nextFightAt)
          );
          if (!inSoloCombat) {
            startNextQueuedAction(state, contentPack, now);
          }
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error);
    }
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
      message: z.string().max(500).optional(),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result: request } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "enhancement/request-service", ...body },
        run: () => storage.createEnhancementServiceRequest({
          requesterId: userId,
          providerId: body.providerId,
          itemId: body.itemId,
          targetLevel: body.targetLevel,
          message: body.message,
          contentPack
        }),
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
      message: z.string().max(500).optional(),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "enhancement/respond-service", ...body },
        run: () => storage.respondToEnhancementServiceRequest({
          requestId: body.requestId,
          providerId: userId,
          accepted: body.accepted,
          message: body.message,
          contentPack
        }),
      });

      if (!result.success) {
        return reply.status(400).send({ error: "respond_service_failed", message: result.message || "响应服务请求失败" });
      }
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
