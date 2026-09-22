import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ACTION_QUEUE_MAX, getActionRates, queuedActionBlocker, startNextQueuedAction, type Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { OFFLINE_REPORT_MIN_MS, buildOfflineReport, reportHasContent, snapshotForReport } from "../offline_report";
import { taskSummary } from "../tasks";

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
    const from = new Date(state.lastSimulatedAt);
    const away = now.getTime() - from.getTime();
    const before = away >= OFFLINE_REPORT_MIN_MS ? snapshotForReport(state as EnhancedPlayerState) : null;
    let next = (await storage.simulateToNow({ userId, state, now, contentPack })) as EnhancedPlayerState;

    // 离线报告：离开 ≥5 分钟后回来的第一次结算，把这段时间发生的事整理成一份摘要
    if (before) {
      const report = buildOfflineReport(before, next, contentPack, from, now);
      if (reportHasContent(report) || next.mode !== "idle") {
        next.offlineReport = report;
        next = (await storage.savePlayerState(userId, next)) as EnhancedPlayerState;
      }
    }

    // MWI task badge: how many tasks are claimable right now (derived, not stored).
    return reply.send({ ...next, taskSummary: taskSummary(next) });
  });

  app.post("/player/offline-report/ack", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const state = (await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0")) as EnhancedPlayerState;
    if (state.offlineReport) {
      state.offlineReport = undefined;
      await storage.savePlayerState(userId, state);
    }
    return reply.send({ ok: true });
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

    const now = new Date();
    // 先结算到现在，避免"停止"吞掉刚好完成的那一轮
    const settled = await storage.simulateToNow({ userId, state: await storage.getOrCreatePlayerState(userId, "unknown"), now, contentPack });
    const playerState = settled as EnhancedPlayerState;
    playerState.mode = "idle";
    playerState.lifeActionState = undefined;
    playerState.combatFarmState = undefined;
    // 停掉当前动作后，队列里还有的话直接接上（清空队列请用 /actions/queue/clear）
    startNextQueuedAction(playerState, contentPack, now);
    
    const finalState = await storage.simulateToNow({
      userId,
      state: playerState,
      now,
      contentPack
    });
    
    return reply.send(finalState);
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
        qty: Math.round(actionsPerHour * Number(y.qty || 1) * Number(y.chance ?? 1) * (y.itemId === "gold" ? rates.goldMul : 1) * 10) / 10,
        chance: Number(y.chance ?? 1),
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
      .object({ actionId: z.string().min(1), quantity: z.number().int().positive().max(5000).optional() })
      .parse((req.body ?? {}) as unknown);
    const now = new Date();
    const state = (await storage.simulateToNow({
      userId,
      state: await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0"),
      now,
      contentPack,
    })) as EnhancedPlayerState;
    const action = (contentPack.actions as any[]).find((a) => a.id === body.actionId);
    if (!action) return reply.status(400).send({ error: "unknown_action", message: "未知的动作" });
    if (String(action.id).startsWith("act_combat_")) return reply.status(400).send({ error: "combat_not_queueable", message: "战斗不能加入队列" });
    if (!Array.isArray(state.activityQueue)) state.activityQueue = [];
    if (state.activityQueue.length >= ACTION_QUEUE_MAX) {
      return reply.status(400).send({ error: "queue_full", message: `队列最多 ${ACTION_QUEUE_MAX} 项` });
    }
    // 等级不够的动作现在就拒绝；材料不够的允许排队（前面的动作可能会把材料做出来）
    const blocker = queuedActionBlocker(state, contentPack, body.actionId);
    if (blocker && blocker.startsWith("skill_level_required")) {
      return reply.status(400).send({ error: "skill_level_required", message: `技能等级不足，需要 ${blocker.split(":")[1]} 级` });
    }
    state.activityQueue.push({ id: randomUUID(), actionId: body.actionId, ...(body.quantity ? { quantity: body.quantity } : {}) });
    // 空闲时排队等于立刻开始
    if (state.mode !== "life_action") startNextQueuedAction(state, contentPack, now);
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });

  app.delete("/actions/queue/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params as unknown);
    const state = (await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0")) as EnhancedPlayerState;
    state.activityQueue = (state.activityQueue || []).filter((q) => q.id !== id);
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });

  app.post("/actions/queue/clear", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const state = (await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0")) as EnhancedPlayerState;
    state.activityQueue = [];
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });

  app.post("/actions/queue/move", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ id: z.string().min(1), direction: z.enum(["up", "down"]) }).parse((req.body ?? {}) as unknown);
    const state = (await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0")) as EnhancedPlayerState;
    const q = state.activityQueue || [];
    const i = q.findIndex((x) => x.id === body.id);
    const j = body.direction === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < q.length) {
      [q[i], q[j]] = [q[j], q[i]];
    }
    state.activityQueue = q;
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
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

  const CLASS_IDS = ["woodcutter", "blacksmith", "farmer", "chef", "tailor", "alchemist"] as const;

  app.post("/player/class", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = z.object({
      classId: z.enum(CLASS_IDS),
    }).parse((req.body ?? {}) as unknown);

    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    state.activeClassId = body.classId;
    const saved = await storage.savePlayerState(userId, state);
    return reply.send(saved);
  });
}
