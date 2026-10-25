import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { useCombatConsumable } from "../hp_combat";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from "../player_commands";
import {
  getBuffEffects,
  pruneExpiredBuffs,
  getCheckInInfo,
  doCheckIn,
  getShopStock,
  buyFromShop,
  sellToShop,
  sellPrice
} from "../systems";

const revisionField = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

function replyCommandError(error: unknown, reply: FastifyReply) {
  if (error instanceof PlayerCommandRejected) {
    return reply.status(400).send({ error: error.code });
  }
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: "state_version_conflict", message: "状态已更新，请刷新后重试", stateRevision: error.stateRevision });
  }
  throw error;
}

export async function systemsRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  const ver = contentPack.version || "1.0.0";

  /* ----------------------- 消耗品 / Buff ----------------------- */

  // 当前生效的 Buff 与汇总效果
  app.get("/systems/buffs", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const now = new Date();
    pruneExpiredBuffs(next, now);
    await storage.savePlayerState(userId, next);
    return reply.send({
      buffs: (next.activeBuffs || []).map((b) => ({
        ...b,
        remainingSec: Math.max(0, Math.floor((Date.parse(b.expiresAt) - now.getTime()) / 1000))
      })),
      effects: getBuffEffects(next, now)
    });
  });

  // 使用消耗品（食物/药水）
  app.post("/systems/consume", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ itemId: z.string().min(1), ...revisionField }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = useCombatConsumable(state as EnhancedPlayerState, contentPack, body.itemId, now);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "consume_rejected");
          return result;
        },
      });
      return reply.send({
        ok: true,
        itemName: outcome.result.itemName,
        healed: outcome.result.healed,
        buff: outcome.result.buff,
        inventory: outcome.state.inventory,
        activeBuffs: outcome.state.activeBuffs || [],
        hpCombat: outcome.state.hpCombat,
        combatHp: outcome.state.combatHp,
        combatHpAt: outcome.state.combatHpAt,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  /* ----------------------- 每日签到 ----------------------- */

  // 签到信息（不发放）
  app.get("/systems/checkin", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send(getCheckInInfo(next, new Date()));
  });

  // 执行签到
  app.post("/systems/checkin", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionField }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = doCheckIn(state, now);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "checkin_rejected");
          return result;
        },
      });
      return reply.send({
        ok: true,
        reward: outcome.result.reward,
        streak: outcome.result.streak,
        totalDays: outcome.result.totalDays,
        cycleDay: outcome.result.cycleDay,
        gold: outcome.state.inventory.gold || 0,
        inventory: outcome.state.inventory,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  /* ----------------------- 商店 ----------------------- */

  // 商店在售列表 + 当前金币
  app.get("/systems/shop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    return reply.send({
      stock: getShopStock(contentPack),
      gold: state.inventory.gold || 0
    });
  });

  // 购买
  app.post("/systems/shop/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(9999), ...revisionField })
      .strict()      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = buyFromShop(state, contentPack, body.itemId, body.qty);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "buy_rejected");
          return result;
        },
      });
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, stateRevision: outcome.state.stateRevision });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  // 出售
  app.post("/systems/shop/sell", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(99999), ...revisionField })
      .strict()      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = sellToShop(state, contentPack, body.itemId, body.qty);
          if (!result.ok) throw new PlayerCommandRejected(result.reason || "sell_rejected");
          return result;
        },
      });
      return reply.send({ ...outcome.result, inventory: outcome.state.inventory, stateRevision: outcome.state.stateRevision });
    } catch (error) {
      return replyCommandError(error, reply);
    }
  });

  // 估价：返回背包内可出售物品的单价（用于前端展示卖价）
  app.get("/systems/shop/sell-prices", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const prices: Record<string, number> = {};
    for (const itemId of Object.keys(state.inventory)) {
      if (itemId === "gold") continue;
      const def = (contentPack.items as any[]).find((it) => it.id === itemId);
      if (def) prices[itemId] = sellPrice(def);
    }
    return reply.send({ prices });
  });
}
