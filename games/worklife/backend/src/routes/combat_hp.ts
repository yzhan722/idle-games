import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import { chooseBuild, setCombatLoadout, startHpCombat, tryCastAbility } from "../hp_combat";
import { learnFromBook, setAbilityLoadout } from "../abilities";

const revisionSchema = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

/** Business rejections map back to the caller's original status/body; version conflicts are always 409. */
const commandFail = (
  reply: FastifyReply,
  error: unknown,
  rejected: (code: string, reply: FastifyReply) => unknown
) => {
  if (error instanceof PlayerCommandRejected) return rejected(error.code, reply);
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
  }
  throw error;
};

export async function combatHpRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  app.post("/combat/hp/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ monsterId: z.string().min(1), ...revisionSchema }).parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          if (state.hpCombat && !state.hpCombat.outcome) throw new PlayerCommandRejected('already_in_combat');
          state.mode = "idle";
          state.lifeActionState = undefined;
          try {
            state.hpCombat = startHpCombat(state, contentPack, body.monsterId, now);
          } catch {
            throw new PlayerCommandRejected('unknown_monster');
          }
          state.lastSimulatedAt = now.toISOString();
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(code === 'already_in_combat' ? 409 : 400).send({ error: code }));
    }
  });

  app.post("/combat/hp/skill", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({
        skillId: z.string().min(1),
        damage: z.number().optional(),
        ...revisionSchema,
      })
      .parse((req.body ?? {}) as unknown);
    void body.damage;
    const now = new Date();
    const messages: Record<string, string> = {
      cooldown: "技能还在冷却",
      no_mana: "魔力不足",
      full_hp: "生命已满",
      not_in_combat: "不在战斗中",
      unknown_ability: "还没学会这个技能",
    };
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = tryCastAbility(state, contentPack, body.skillId, now);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'cast_rejected');
          return result;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: messages[code] || code }));
    }
  });

  app.post("/combat/hp/abilities", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({
        slots: z
          .array(
            z.object({
              abilityId: z.string().min(1),
              trigger: z
                .object({ type: z.string(), pct: z.number().optional() })
                .optional(),
            })
          )
          .max(4),
        ...revisionSchema,
      })
      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = setAbilityLoadout(state, body.slots);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'loadout_rejected');
          return result;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: "技能配置无效" }));
    }
  });

  app.post("/combat/hp/learn", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ itemId: z.string().min(1), ...revisionSchema }).parse((req.body ?? {}) as unknown);
    const messages: Record<string, string> = { not_a_book: "这不是技能书", missing_book: "背包里没有这本书" };
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = learnFromBook(state, contentPack, body.itemId);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'learn_rejected');
          return result;
        },
      });
      return reply.send({ ...outcome.state, learnResult: outcome.result });
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: messages[code] || code }));
    }
  });

  app.post("/combat/hp/build", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({ id: z.enum(["sharpened_edge", "thick_bark"]), ...revisionSchema })
      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = chooseBuild(state, body.id);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'build_rejected');
          return result;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: code }));
    }
  });

  app.post("/combat/hp/loadout", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({
        food: z.array(z.object({ itemId: z.string().min(1), triggerMissingHp: z.number().int().positive().optional() })).max(3).optional(),
        drink: z.array(z.object({ itemId: z.string().min(1) })).max(3).optional(),
        autoRepeat: z.boolean().optional(),
        ...revisionSchema,
      })
      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = setCombatLoadout(state, contentPack, body);
          if (!result.ok) throw new PlayerCommandRejected(result.error || 'loadout_rejected');
          return result;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: "这个物品不能放进该栏位" }));
    }
  });

  app.post("/combat/hp/flee", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ ...revisionSchema }).parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          state.hpCombat = undefined;
          state.mode = "idle";
          // Leaving the fight ends the run: otherwise the next manual fight would silently auto-repeat.
          if (state.combatLoadout?.autoRepeat) state.combatLoadout = { ...state.combatLoadout, autoRepeat: false };
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code }));
    }
  });
}
