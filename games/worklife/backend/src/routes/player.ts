import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ACTION_QUEUE_MAX, getActionRates, getRareFindMultiplier, yieldChance, queuedActionBlocker, startNextQueuedAction, startLifeActionNow, type Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import { taskSummary } from "../tasks";

const revisionSchema = {
  expectedRevision: z.number().int().nonnegative().optional(),
  operationId: z.string().min(1).max(128).optional(),
};

const commandFail = (reply: FastifyReply, error: unknown, rejected: (code: string, reply: FastifyReply) => unknown) => {
  if (error instanceof PlayerCommandRejected) return rejected(error.code, reply);
  if (error instanceof PlayerCommandConflict) {
    return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
  }
  throw error;
};

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

    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    const inPartyCombat = Boolean(activeParty?.currentActivity);
    let state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    // 组队战斗与生活动作/单人战斗严格互斥：在组队副本中时禁止同时结算生活动作或单人战斗
    if (inPartyCombat && (state.mode === "life_action" || state.lifeActionState || state.hpCombat)) {
      if (state.hpCombat && !state.hpCombat.outcome) {
        const { persistCombatHp } = require("../hp_combat") as typeof import("../hp_combat");
        persistCombatHp(state, state.hpCombat.playerHp, Date.now());
      }
      state.mode = "idle";
      state.lifeActionState = undefined;
      state.hpCombat = undefined;
      if (state.combatLoadout?.autoRepeat) {
        state.combatLoadout = { ...state.combatLoadout, autoRepeat: false };
      }
      state = await storage.savePlayerState(userId, state);
    }
    const next = (await storage.simulateToNow({ userId, state, now: new Date(), contentPack })) as EnhancedPlayerState;

    // MWI task badge: how many tasks are claimable right now (derived, not stored).
    return reply.send({
      ...next,
      taskSummary: taskSummary(next),
      activePartyActivity: activeParty?.currentActivity
        ? { partyId: activeParty.id, ...activeParty.currentActivity }
        : null,
    });
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
        ...revisionSchema,
      })
      .strict()      .parse((req.body ?? {}) as unknown);
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
            throw new PlayerCommandRejected('already_in_combat');
          }
          try {
            startLifeActionNow(state, contentPack, body.actionId, body.quantity, now);
          } catch (err) {
            throw new PlayerCommandRejected(String((err as Error)?.message || 'unknown_action'));
          }
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => {
        if (code === 'already_in_combat') {
          return r.status(409).send({ error: code, message: '战斗中不能开始生活动作，请先结束战斗' });
        }
        if (code.startsWith('skill_level_required:')) {
          const need = code.split(':')[1];
          return r.status(400).send({ error: 'skill_level_required', message: `技能等级不足，需要 ${need} 级` });
        }
        return r.status(400).send({ error: code, message: code === 'unknown_action' ? '未知的动作' : code === 'stage_locked' ? '该区域尚未开放' : code });
      });
    }
  });

  app.post("/actions/stop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    const inPartyCombat = Boolean(activeParty?.currentActivity);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          // 命令入口已结算到现在，不会吞掉刚好完成的那一轮
          state.mode = "idle";
          state.lifeActionState = undefined;
          state.combatFarmState = undefined;
          // 停掉当前动作后，队列里还有的话直接接上（清空队列请用 /actions/queue/clear）。
          // 单人战斗或组队战斗进行中均不接续——防止边打怪边执行队列生活动作
          const inSoloCombat = Boolean(
            state.hpCombat &&
              (!state.hpCombat.outcome || state.hpCombat.nextFightAt)
          );
          if (!inSoloCombat && !inPartyCombat) startNextQueuedAction(state as EnhancedPlayerState, contentPack, now);
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code }));
    }
  });

  // ---- 动作面板：服务端真值的速度/效率/每小时收益（银河奶牛的 Actions/hr、XP/hr）----
  app.get("/actions/preview/:actionId", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const { actionId } = z.object({ actionId: z.string().min(1) }).parse(req.params as unknown);
    const action = (contentPack.actions as any[]).find((a) => a.id === actionId);
    if (!action) return reply.status(404).send({ error: "unknown_action" });
    const now = new Date();
    const state = (await storage.simulateToNow({
      userId,
      state: await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0"),
      now,
      contentPack,
    })) as EnhancedPlayerState;
    const rates = getActionRates(state, contentPack, action, now);
    const rareFindMultiplier = getRareFindMultiplier(state, contentPack, now);
    const perCycleCompletions = 1 + rates.efficiencyPct / 100; // expected value
    const cyclesPerHour = 3_600_000 / rates.effectiveDurationMs;
    const actionsPerHour = cyclesPerHour * perCycleCompletions;
    const nameOf = (id: string) => (contentPack.items as any[]).find((i) => i.id === id)?.name || id;
    const xpPerAction = Math.round(Number(action.xp || 0) * rates.xpMul);
    const reqLevel = Number(action.requirements?.skillLevel || 1);
    const skillLevel = rates.isCombatAct ? Number(state.combatLevel || 1) : Number(state.skills?.[action.skillId]?.level || 1);
    return reply.send({
      actionId,
      name: action.name,
      skillId: action.skillId,
      requiredLevel: reqLevel,
      skillLevel,
      baseDurationMs: Number(action.duration || 0),
      effectiveDurationMs: Math.round(rates.effectiveDurationMs),
      speedPct: Math.round((rates.speedMul - 1) * 1000) / 10,
      speedSources: rates.speedSources,
      efficiencyPct: Math.round(rates.efficiencyPct * 10) / 10,
      efficiencySources: rates.efficiencySources,
      xpPerAction,
      actionsPerHour: Math.round(actionsPerHour * 10) / 10,
      xpPerHour: Math.round(actionsPerHour * xpPerAction),
      outputsPerHour: (Array.isArray(action.yields) ? action.yields : []).map((y: any) => ({
        itemId: y.itemId,
        name: nameOf(y.itemId),
        qty: Math.round(actionsPerHour * Number(y.qty || 1) * yieldChance(y.chance, rareFindMultiplier) * (y.itemId === "gold" ? rates.goldMul : 1) * 10) / 10,
        chance: yieldChance(y.chance, rareFindMultiplier),
      })),
      inputsPerHour: (Array.isArray(action.consumes) ? action.consumes : []).map((c: any) => ({
        itemId: c.itemId,
        name: nameOf(c.itemId),
        qty: Math.round(actionsPerHour * Number(c.qty || 1) * 10) / 10,
      })),
    });
  });

  // ---- 行动队列 ----
  app.post("/actions/queue", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z
      .object({ actionId: z.string().min(1), quantity: z.number().int().positive().max(5000).optional(), ...revisionSchema })
      .strict()      .parse((req.body ?? {}) as unknown);
    const now = new Date();
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    const inPartyCombat = Boolean(activeParty?.currentActivity);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now, expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const action = (contentPack.actions as any[]).find((a) => a.id === body.actionId);
          if (!action) throw new PlayerCommandRejected('unknown_action');
          if (String(action.id).startsWith('act_combat_')) throw new PlayerCommandRejected('combat_not_queueable');
          if (!Array.isArray(state.activityQueue)) state.activityQueue = [];
          if (state.activityQueue.length >= ACTION_QUEUE_MAX) {
            throw new PlayerCommandRejected('queue_full');
          }
          // 等级不够的动作现在就拒绝；材料不够的允许排队（前面的动作可能会把材料做出来）
          const blocker = queuedActionBlocker(state, contentPack, body.actionId);
          if (blocker && blocker.startsWith('skill_level_required')) {
            throw new PlayerCommandRejected(blocker);
          }
          state.activityQueue.push({ id: randomUUID(), actionId: body.actionId, ...(body.quantity ? { quantity: body.quantity } : {}) });
          // 仅真正空闲时才立刻开始：单人战斗/组队战斗/刷关中排队只入队等待，否则 mode 会被翻成
          // life_action 但战斗仍在继续，变成边打怪边制作的双进度状态。
          const inSoloCombat = Boolean(state.hpCombat);
          if (state.mode === 'idle' && !inSoloCombat && !inPartyCombat) startNextQueuedAction(state as EnhancedPlayerState, contentPack, now);
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => {
        if (code === 'unknown_action') return r.status(400).send({ error: code, message: '未知的动作' });
        if (code === 'combat_not_queueable') return r.status(400).send({ error: code, message: '战斗不能加入队列' });
        if (code === 'queue_full') return r.status(400).send({ error: code, message: `队列最多 ${ACTION_QUEUE_MAX} 项` });
        if (code.startsWith('skill_level_required')) {
          return r.status(400).send({ error: 'skill_level_required', message: `技能等级不足，需要 ${code.split(':')[1]} 级` });
        }
        return r.status(400).send({ error: code });
      });
    }
  });

  app.delete("/actions/queue/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(),
        apply(state) {
          const q = state.activityQueue || [];
          if (!q.some((x) => x.id === id)) throw new PlayerCommandRejected('queue_item_not_found');
          state.activityQueue = q.filter((x) => x.id !== id);
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) =>
        r.status(code === 'queue_item_not_found' ? 404 : 400).send({ error: code, message: code === 'queue_item_not_found' ? '队列项不存在' : code }));
    }
  });

  app.post("/actions/queue/clear", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          state.activityQueue = [];
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code }));
    }
  });

  app.post("/actions/queue/move", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ id: z.string().min(1), direction: z.enum(["up", "down"]), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          const q = state.activityQueue || [];
          const i = q.findIndex((x) => x.id === body.id);
          if (i < 0) throw new PlayerCommandRejected("queue_item_not_found");
          const j = body.direction === "up" ? i - 1 : i + 1;
          if (j < 0 || j >= q.length) throw new PlayerCommandRejected("queue_move_out_of_range");
          [q[i], q[j]] = [q[j], q[i]];
          state.activityQueue = q;
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      return commandFail(reply, error, (code, r) =>
        code === "queue_item_not_found"
          ? r.status(404).send({ error: code, message: "队列中不存在该动作" })
          : r.status(400).send({ error: code })
      );
    }
  });

  const CLASS_IDS = ["woodcutter", "blacksmith", "farmer", "chef", "tailor", "alchemist"] as const;

  app.post("/player/class", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = z.object({
      classId: z.enum(CLASS_IDS),
      ...revisionSchema,
    }).strict().parse((req.body ?? {}) as unknown);

    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      return reply.status(400).send({ error: "combat_in_progress", message: "组队副本中不能切换职业" });
    }
    try {
      const outcome = await storage.executePlayerCommand({
        userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision,
        operationId: body.operationId, operationPayload: operationPayload(body),
        apply(state) {
          // 行动/战斗/强化中不允许切职业：伐木中切厨师会继续吃伐木队列却显示厨师技能栏，
          // 战斗中途换职业则连战循环跨职业漂移。先停当前动作再切换。
          const inSoloCombat = Boolean(
            state.hpCombat &&
              (!state.hpCombat.outcome || state.hpCombat.nextFightAt)
          );
          if (inSoloCombat) {
            throw new PlayerCommandRejected("combat_in_progress", "战斗中不能切换职业");
          }
          if (state.mode === "life_action" || (state.enhanceRun && !state.enhanceRun.outcome)) {
            throw new PlayerCommandRejected("action_in_progress", "正在执行动作，请先停止再切换职业");
          }
          state.activeClassId = body.classId;
          return { ok: true as const };
        },
      });
      return reply.send(outcome.state);
    } catch (error) {
      const msg = error instanceof PlayerCommandRejected && typeof error.details === "string" ? error.details : undefined;
      return commandFail(reply, error, (code, r) => r.status(400).send({ error: code, ...(msg ? { message: msg } : {}) }));
    }
  });
}

