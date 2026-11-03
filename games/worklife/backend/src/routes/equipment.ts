import { ensureProgression } from '../progression_state';
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { isDurabilityBroken, type Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { EQUIP_SLOT_KEYS, canEquipItem } from "../equipment_equip";
import { playerCombatant } from "../first_hour_combat";
import { buildExtras } from "../hp_combat";

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
    } catch {
      return reply.status(404).send({ error: "not_found", message: "获取耐久度信息失败" });
    }
  });

  app.post("/equipment/repair", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    
    const body = z.object({
      itemId: z.string().min(1),
      repairType: z.enum(['full', 'partial']).default('full'),
      targetDurability: z.number().optional()
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const result = await storage.repairEquipment({
        userId,
        request: {
          itemId: body.itemId,
          repairType: body.repairType,
          targetDurability: body.targetDurability
        }
      });
      // 业务失败语义归一：不再 200+success:false 让前端误当成功
      if (!result.success) {
        return reply.status(400).send({ error: "repair_failed", message: result.message || "修复装备失败" });
      }
      return reply.send(result);
    } catch {
      return reply.status(400).send({ error: "repair_failed", message: "修复装备失败" });
    }
  });

  app.get("/equipment/stats", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    try {
      const stats = await storage.getEquipmentStats({ userId, contentPack });
      return reply.send(stats);
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ error: "internal_error", message: "服务器内部错误，请稍后重试" });
    }
  });


  app.get("/equipment/set-bonuses", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    try {
      const bonuses = await storage.getActiveSetBonuses({ userId, contentPack });
      return reply.send(bonuses);
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ error: "internal_error", message: "服务器内部错误，请稍后重试" });
    }
  });

  app.post("/equipment/equip", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      slot: z.enum(EQUIP_SLOT_KEYS),
      itemId: z.string().min(1),
    }).strict().parse((req.body ?? {}) as unknown);

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    if (body.slot !== "tool") {
      const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
      const inSoloCombat = Boolean(
        state.hpCombat &&
          (!state.hpCombat.outcome || (state.combatLoadout?.autoRepeat && state.hpCombat.nextFightAt))
      );
      if (inSoloCombat || activeParty?.currentActivity) {
        return reply.status(409).send({ error: "in_combat", message: "战斗中无法更换战斗装备" });
      }
    }
    if (isDurabilityBroken(state, body.itemId)) {
      return reply.status(400).send({ error: "item_broken", message: "该装备已彻底损坏（耐久 0），请先修复再穿戴" });
    }
    const check = canEquipItem(
      state.inventory as Record<string, number>,
      body.slot,
      body.itemId,
      contentPack.items as Array<{ id: string; type?: string; slot?: string; toolFor?: string }>,
      state.equipment as Record<string, unknown> | undefined
    );
    if (!check.ok) return reply.status(400).send({ error: check.error, message: check.message });

    if (!state.equipment) {
      (state as any).equipment = { enhancementLevels: {}, durability: {}, maxDurability: {} };
    }
    (state.equipment as any)[body.slot] = body.itemId;
    if (state.combatHp !== undefined) {
      const pc = playerCombatant(state, contentPack, buildExtras(state.chapter1Build));
      if (state.combatHp > pc.hp) state.combatHp = pc.hp;
    }
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });

  app.post("/equipment/unequip", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      slot: z.enum(EQUIP_SLOT_KEYS),
    }).strict().parse((req.body ?? {}) as unknown);

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    if (body.slot !== "tool") {
      const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
      const inSoloCombat = Boolean(
        state.hpCombat &&
          (!state.hpCombat.outcome || (state.combatLoadout?.autoRepeat && state.hpCombat.nextFightAt))
      );
      if (inSoloCombat || activeParty?.currentActivity) {
        return reply.status(409).send({ error: "in_combat", message: "战斗中无法卸下战斗装备" });
      }
    }
    ensureProgression(state, new Date());
    if (state.equipment) {
      delete (state.equipment as any)[body.slot];
    }
    if (state.combatHp !== undefined) {
      const pc = playerCombatant(state, contentPack, buildExtras(state.chapter1Build));
      if (state.combatHp > pc.hp) state.combatHp = pc.hp;
    }
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });
}

