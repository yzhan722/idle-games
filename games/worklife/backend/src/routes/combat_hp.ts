import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { chooseBuild, setCombatLoadout, startHpCombat, tryCastAbility } from "../hp_combat";
import { learnFromBook, setAbilityLoadout } from "../abilities";

export async function combatHpRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  app.post("/combat/hp/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ monsterId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    if (next.hpCombat && !next.hpCombat.outcome) {
      return reply.status(409).send({ error: "already_in_combat" });
    }
    next.mode = "idle";
    next.lifeActionState = undefined;
    try {
      next.hpCombat = startHpCombat(next, contentPack, body.monsterId, now);
    } catch {
      return reply.status(400).send({ error: "unknown_monster" });
    }
    next.lastSimulatedAt = now.toISOString();
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.post("/combat/hp/skill", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({
        skillId: z.string().min(1),
        damage: z.number().optional(),
      })
      .parse((req.body ?? {}) as unknown);
    void body.damage;
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const result = tryCastAbility(next, contentPack, body.skillId, now);
    if (!result.ok) {
      const messages: Record<string, string> = {
        cooldown: "技能还在冷却",
        no_mana: "魔力不足",
        full_hp: "生命已满",
        not_in_combat: "不在战斗中",
        unknown_ability: "还没学会这个技能",
      };
      return reply.status(400).send({ error: result.error, message: messages[result.error || ""] || result.error });
    }
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
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
      })
      .parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const result = setAbilityLoadout(next, body.slots);
    if (!result.ok) return reply.status(400).send({ error: result.error, message: "技能配置无效" });
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.post("/combat/hp/learn", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ itemId: z.string().min(1) }).parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const result = learnFromBook(next, contentPack, body.itemId);
    if (!result.ok) {
      const messages: Record<string, string> = { not_a_book: "这不是技能书", missing_book: "背包里没有这本书" };
      return reply.status(400).send({ error: result.error, message: messages[result.error || ""] || result.error });
    }
    const saved = await storage.savePlayerState(userId, next);
    return reply.send({ ...saved, learnResult: result });
  });

  app.post("/combat/hp/build", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({ id: z.enum(["sharpened_edge", "thick_bark"]) })
      .parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const result = chooseBuild(next, body.id);
    if (!result.ok) {
      return reply.status(400).send({ error: result.error, message: result.error });
    }
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.post("/combat/hp/loadout", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({
        food: z.array(z.object({ itemId: z.string().min(1), triggerMissingHp: z.number().int().positive().optional() })).max(3).optional(),
        drink: z.array(z.object({ itemId: z.string().min(1) })).max(3).optional(),
        autoRepeat: z.boolean().optional(),
      })
      .parse((req.body ?? {}) as unknown);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const result = setCombatLoadout(next, contentPack, body);
    if (!result.ok) return reply.status(400).send({ error: result.error, message: "这个物品不能放进该栏位" });
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });

  app.post("/combat/hp/flee", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    const now = new Date();
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    next.hpCombat = undefined;
    next.mode = "idle";
    // Leaving the fight ends the run: otherwise the next manual fight would silently auto-repeat.
    if (next.combatLoadout?.autoRepeat) next.combatLoadout = { ...next.combatLoadout, autoRepeat: false };
    const saved = await storage.savePlayerState(userId, next);
    return reply.send(saved);
  });
}
