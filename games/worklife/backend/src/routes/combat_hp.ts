import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from "../player_commands";
import { MAX_DRINK_SLOTS, MAX_SLOTS_CAP, chooseBuild, persistCombatHp, setCombatLoadout, startHpCombat, tryCastAbility } from "../hp_combat";
import { startNextQueuedAction } from "../storage";
import { learnFromBook, setAbilityLoadout } from "../abilities";
import { ZONE_TIER_COUNT, ZONE_TIER_NAMES, zoneTierKillsLeft } from "../zone_tiers";
import { isStageOpen } from "../zones";
import { leaveDungeon, markDungeonResultSeen, startDungeon } from "../dungeon";

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
    return reply.status(409).send({ error: "state_version_conflict", message: "状态已更新，请刷新后重试", stateRevision: error.stateRevision });
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
    const body = z.object({ monsterId: z.string().min(1), autoRepeat: z.boolean().optional(), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      if (activeParty.leaderId === userId) {
        await storage.cancelPartyActivity({ userId, partyId: activeParty.id }).catch(() => undefined);
      } else {
        return reply.status(409).send({ error: "already_in_combat", message: "正在组队副本中，请先离开队伍或由队长取消活动" });
      }
    }
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          if (state.hpCombat && !state.hpCombat.outcome) throw new PlayerCommandRejected("already_in_combat");
          if (state.enhanceRun && !state.enhanceRun.outcome) throw new PlayerCommandRejected("already_enhancing");
          state.lifeActionState = undefined;
          state.combatFarmState = undefined;
          if (body.autoRepeat !== undefined) {
            state.combatLoadout = {
              food: state.combatLoadout?.food || [],
              drink: state.combatLoadout?.drink || [],
              ...(state.combatLoadout?.mp ? { mp: state.combatLoadout.mp } : {}),
              autoRepeat: body.autoRepeat,
            };
          }
          try {
            const sameMonsterActiveRepeat =
              state.hpCombat &&
              state.hpCombat.monsterId === body.monsterId &&
              state.hpCombat.nextFightAt &&
              now.getTime() - state.hpCombat.nextFightAt < 30_000;
            const carry = sameMonsterActiveRepeat && state.hpCombat
              ? {
                  streak: state.hpCombat.outcome === "win" ? (state.hpCombat.streak || 0) + 1 : 0,
                  deaths: state.hpCombat.deaths || 0,
                  lossStreak: state.hpCombat.outcome === "loss" ? state.hpCombat.lossStreak || 0 : 0,
                  runStats: state.hpCombat.runStats,
                }
              : undefined;
            // 换打别的怪 = 离开地下城（按已过的波数结束）。
            leaveDungeon(state as EnhancedPlayerState, now);
            state.hpCombat = startHpCombat(state, contentPack, body.monsterId, now, carry);
          } catch (e) {
            throw new PlayerCommandRejected(String((e as Error)?.message || "unknown_monster"));
          }
          state.mode = "combat";
          state.lastSimulatedAt = now.toISOString();
          return { ok: true as const };
        },
      });
      // 单人战斗与组队战斗互斥：开启单人战斗时若队伍正在副本活动中则自动取消组队副本活动
      const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
      if (activeParty?.currentActivity) {
        await storage.cancelPartyActivity({ userId, partyId: activeParty.id }).catch(() => undefined);
      }
      return reply.send({ ...outcome.state, activePartyActivity: null });
    } catch (error) {
      return commandFail(reply, error, (code, r) => {
        if (code === "already_in_combat" || code === "already_enhancing") return r.status(409).send({ error: code });
        if (code.startsWith("skill_level_required:")) return r.status(400).send({ error: "skill_level_required", message: `战斗等级不足，需要 ${code.split(":")[1]} 级` });
        if (code === "stage_locked") return r.status(400).send({ error: code, message: "该区域尚未开放" });
        return r.status(400).send({ error: code });
      });
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
      .strict()      .parse((req.body ?? {}) as unknown);
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
          if (!result.ok) throw new PlayerCommandRejected(result.error || "cast_rejected");
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
      .strict()      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = setAbilityLoadout(state, body.slots);
          if (!result.ok) throw new PlayerCommandRejected(result.error || "loadout_rejected");
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
    const body = z.object({ itemId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const messages: Record<string, string> = { not_a_book: "这不是技能书", missing_book: "背包里没有这本书" };
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = learnFromBook(state, contentPack, body.itemId);
          if (!result.ok) throw new PlayerCommandRejected(result.error || "learn_rejected");
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
      .object({
        id: z.enum([
          "sharpened_edge",
          "thick_bark",
          "heavy_sunder",
          "quenched_thorns",
          "gale_flurry",
          "relic_hunter",
          "elixir_frenzy",
          "feast_vitality",
        ]),
        ...revisionSchema,
      })
      .strict()      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = chooseBuild(state, body.id);
          if (!result.ok) throw new PlayerCommandRejected(result.error || "build_rejected");
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
        food: z.array(z.object({ itemId: z.string().min(1), triggerMissingHp: z.number().int().positive().optional() })).max(MAX_SLOTS_CAP).optional(),
        drink: z.array(z.object({ itemId: z.string().min(1), triggerMissingMp: z.number().int().positive().optional() })).max(MAX_DRINK_SLOTS).optional(),
        mp: z.array(z.object({ itemId: z.string().min(1), triggerMissingMp: z.number().int().positive().optional() })).max(MAX_SLOTS_CAP).optional(),
        autoRepeat: z.boolean().optional(),
        ...revisionSchema,
      })
      // 未知字段直接拒绝——此前 {slots:[...]} 被 zod 剥成 {} 后把整套食物/饮料配装静默清空
      .strict()
      .parse((req.body ?? {}) as unknown);
    const now = new Date();
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const result = setCombatLoadout(state, contentPack, body, now);
          if (!result.ok) throw new PlayerCommandRejected(result.error || "loadout_rejected");
          return result;
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, message: "这个物品不能放进该栏位" }));
    }
  });

  /** 选一个区域的难度档位：下一场开打（含连续战斗的下一场）起算。 */
  app.post("/combat/hp/zone-tier", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({ zoneId: z.string().min(1).max(64), tier: z.number().int().min(0).max(ZONE_TIER_COUNT - 1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    const zone = (contentPack.stages as Array<{ id: string; monsters?: string[] }>).find((s) => s.id === body.zoneId);
    if (!zone?.monsters?.length || !isStageOpen(zone.id)) return reply.status(400).send({ error: "stage_locked", message: "该区域尚未开放" });
    const { id: zoneId, monsters } = zone as { id: string; monsters: string[] };
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const left = zoneTierKillsLeft(state.stats, { id: zoneId, monsters }, body.tier);
          if (left > 0) throw new PlayerCommandRejected(`tier_locked:${left}`);
          const { [zoneId]: _old, ...rest } = state.zoneTiers ?? {};
          state.zoneTiers = body.tier > 0 ? { ...rest, [zoneId]: body.tier } : rest;
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) =>
        r.status(400).send({
          error: code.split(":")[0],
          message: `在这里用「${ZONE_TIER_NAMES[Math.max(0, body.tier - 1)]}」再击败 ${code.split(":")[1]} 只，开放「${ZONE_TIER_NAMES[body.tier]}」`,
        })
      );
    }
  });

  /** 单人地下城：选一个打通过的区域和已开放的档位，连打几波（dungeon_rules.ts）。离开、换怪都走原来的入口。 */
  app.post("/combat/dungeon/start", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({ zoneId: z.string().min(1).max(64), tier: z.number().int().min(0).max(ZONE_TIER_COUNT - 1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      return reply.status(409).send({ error: "already_in_combat", message: "正在组队副本中，先离开队伍" });
    }
    const messages: Record<string, string> = {};
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const player = state as EnhancedPlayerState;
          const started = startDungeon(player, contentPack, body.zoneId, body.tier, now);
          if (!started.ok) {
            messages[started.error] = started.message;
            throw new PlayerCommandRejected(started.error);
          }
          state.lifeActionState = undefined;
          state.combatFarmState = undefined;
          state.hpCombat = startHpCombat(player, contentPack, started.monsterId, now, {
            tier: started.tier,
            runStats: { startedAt: now.getTime(), kills: 0, xp: 0, gold: 0, loot: {} },
          });
          state.mode = "combat";
          state.lastSimulatedAt = now.toISOString();
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) =>
        r.status(code === "already_in_combat" || code === "already_enhancing" ? 409 : 400).send({ error: code, message: messages[code] || code })
      );
    }
  });

  /** 地下城结算弹窗看过了：记进存档，刷新、换设备不再弹。startedAt 对不上（已经开了下一趟）就什么也不做。 */
  app.post("/combat/dungeon/seen", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ startedAt: z.number().int().nonnegative(), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          return { ok: true as const, changed: markDungeonResultSeen(state as EnhancedPlayerState, body.startedAt) };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code }));
    }
  });

  app.post("/combat/hp/flee", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    const inPartyCombat = Boolean(activeParty?.currentActivity);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          // Fleeing mid-fight keeps the wounds: persist the current HP pool so the next
          // fight doesn't start at full. Settled fights already wrote combatHp at outcome.
          if (state.hpCombat && !state.hpCombat.outcome) {
            persistCombatHp(state as EnhancedPlayerState, state.hpCombat.playerHp, now.getTime());
          }
          leaveDungeon(state as EnhancedPlayerState, now);
          state.hpCombat = undefined;
          if (state.enhanceRun?.outcome) state.enhanceRun = undefined;
          state.mode = "idle";
          // 逃跑同时清掉挂机残影——否则 mode=idle 但旧 lifeActionState 冻结成僵尸不结算
          state.lifeActionState = undefined;
          state.combatFarmState = undefined;
          // Leaving the fight ends the run: otherwise the next manual fight would silently auto-repeat.
          if (state.combatLoadout?.autoRepeat) state.combatLoadout = { ...state.combatLoadout, autoRepeat: false };
          // 战斗中排队的动作此刻才真正空闲可接续（组队战斗中仍不可接续生活动作）
          if (!inPartyCombat) {
            startNextQueuedAction(state as EnhancedPlayerState, contentPack, now);
          }
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code }));
    }
  });
}
