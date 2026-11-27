import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState, Party } from "../types";
import { leaveDungeon } from "../dungeon";
import { ensurePartyRun, judgeWaveClear, partyRequiredLevel, resetPartyRun, settlePartyWave, type PartyContext } from "../party_run";
import {
  ensurePresetParties,
  ensureHumanLeaderIfBotParty,
  simulateBotPartyContributions,
  recruitBotToParty,
  recognizePartyBots,
  enrichPartyForClient,
  friendlyPartyName,
  friendlyAdventurerName,
  setMemberReady,
  isPartyBotUserId,
  normalizePartyStageId,
  PRESET_BOT_PARTIES,
} from "../party_bots";

/** 跨玩家写操作统一走 deduplicateOperation：operationId 命中收据直接返回历史结果 */
export async function partyRoutes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack,
  /** 测试用：波次计时的时钟。 */
  opts: { clock?: () => Date } = {}
) {
  const clock = opts.clock ?? (() => new Date());
  const userIdOf = (req: FastifyRequest) => (req as any).userId as string | undefined;
  const version = contentPack.version || "1.0.0";

  /**
   * 存储层对业务失败返回 { success:false, message }（不抛异常）。
   * 统一映射成 400 —— 此前直接 200 透传，前端无法区分成败。
   */
  const sendIfFailed = (result: any, reply: FastifyReply): boolean => {
    if (result && result.success === false) {
      reply.status(400).send({ success: false, error: "party_op_failed", message: result.message || "操作失败" });
      return true;
    }
    return false;
  };

  /** 这名玩家在这场组队战斗里的上下文：关卡以开战时定下的为准，队友等级用发给客户端的那一份。 */
  const battleContext = (party: Party, userId: string): PartyContext | null => {
    const activity = party.currentActivity;
    if (!activity || activity.type === "group_craft") return null;
    const members = enrichPartyForClient(party, userId)?.members ?? [];
    return {
      partyId: party.id,
      startedAt: activity.startedAt,
      stageId: normalizePartyStageId(activity.stageId),
      joinedAt: party.members.find((m) => m.userId === userId)?.joinedAt,
      mateLevels: members.filter((m) => m.userId !== userId).map((m) => m.combatLevel),
    };
  };

  /** 开战、中途进队时就建好进度：人数按这一刻算，之后再拉人不会改变这一波的敌人和奖励。 */
  const beginRun = async (userId: string) => {
    const party = await storage.getPartyForUser({ userId });
    if (!party?.currentActivity) return;
    await recognizePartyBots(storage, party);
    const ctx = battleContext(party, userId);
    if (!ctx) return;
    const now = clock();
    await storage.executePlayerCommand({
      userId,
      contentPack,
      now,
      apply: (st) => {
        ensurePartyRun(st, contentPack, ctx, now);
        return { ok: true as const };
      },
    }).catch(() => undefined);
  };

  app.post("/party/create", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ name: z.string().trim().min(1).max(30).optional(), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const st = await storage.getOrCreatePlayerState(userId, version);
      const leaderDisplayName = friendlyAdventurerName(userId, st.settings?.playerName);
      const resolvedName = body.name || `${leaderDisplayName}的冒险小队`;
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/create", ...body },
        run: () => storage.createParty({ userId, name: resolvedName }),
      });
      if (sendIfFailed(result, reply)) return;
      if (result && (result as any).id) {
        setMemberReady((result as any).id, userId, true);
      }
      return reply.send(enrichPartyForClient(result as any, userId) ?? result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "创建队伍失败" });
    }
  });

  app.get("/party/list", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const q = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }).parse((req.query ?? {}) as unknown);
    await ensurePresetParties(storage, contentPack).catch(() => undefined);
    const rawParties = await storage.listParties({ limit: q.limit });
    const presetNames = new Set(PRESET_BOT_PARTIES.map((p) => p.name));

    const enriched = rawParties.map((p) => {
      const leaderName = friendlyAdventurerName(p.leaderId);
      const name = friendlyPartyName(p.id, p.name, leaderName);
      const isBotParty = isPartyBotUserId(p.leaderId) || presetNames.has(name);
      const preset = PRESET_BOT_PARTIES.find((pr) => pr.name === name);
      return {
        ...p,
        name,
        leaderName,
        isBotParty,
        allBotsReady: true,
        recommendedStageId: preset?.recommendedStageId,
      };
    });

    // Sort preset bot parties and multi-member parties first, and cap unnamed 1-person stale test parties
    let staleSingleCount = 0;
    const filtered = enriched.filter((p) => {
      if (p.isBotParty || p.memberCount > 1 || (p.name && !p.name.startsWith("【"))) return true;
      staleSingleCount += 1;
      return staleSingleCount <= 4;
    });

    return reply.send({ parties: filtered });
  });

  app.post("/party/join", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      await storage.getOrCreatePlayerState(userId, version);
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/join", ...body },
        run: () => storage.joinParty({ userId, partyId: body.partyId }),
      });
      if (sendIfFailed(result, reply)) return;
      // Start player as unready (or ready if they click "准备") so they can experience the ready->start flow,
      // while all bots in the party are already auto-ready (`isReady: true`) and leadership transfers to the human!
      setMemberReady(body.partyId, userId, false);
      const fullParty = await storage.getPartyForUser({ userId });
      await beginRun(userId);
      const promoted = await ensureHumanLeaderIfBotParty(storage, userId, fullParty ?? (result as any));
      // Keep human ready state as false on fresh join so the user sees bots Ready (✅ 已准备) and clicks "准备" to start!
      setMemberReady(body.partyId, userId, false);
      return reply.send(enrichPartyForClient(promoted, userId) ?? result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "加入队伍失败" });
    }
  });

  app.post("/party/ready", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1),
      ready: z.boolean().optional(),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const current = await storage.getPartyForUser({ userId });
      if (!current || current.id !== body.partyId) {
        return reply.status(400).send({ success: false, error: "party_op_failed", message: "您不在该队伍中" });
      }
      const promoted = await ensureHumanLeaderIfBotParty(storage, userId, current);
      const nextReady = body.ready ?? true;
      setMemberReady(body.partyId, userId, nextReady);
      return reply.send({
        success: true,
        ready: nextReady,
        party: enrichPartyForClient(promoted, userId),
      });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "准备状态更新失败" });
    }
  });

  app.post("/party/recruit-bot", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const current = await storage.getPartyForUser({ userId });
      if (!current || current.id !== body.partyId) {
        return reply.status(400).send({ success: false, error: "party_op_failed", message: "您不在该队伍中" });
      }
      if (current.members.length >= 6) {
        return reply.status(400).send({ success: false, error: "party_op_failed", message: "队伍已满员（最多 6 人）" });
      }
      const res = await recruitBotToParty(storage, contentPack, body.partyId);
      if (sendIfFailed(res, reply)) return;
      const updated = await storage.getPartyForUser({ userId });
      return reply.send({
        ...res,
        party: enrichPartyForClient(updated, userId),
      });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "招募机器人失败" });
    }
  });

  app.post("/party/invite", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1), targetUserId: z.string().min(1),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      // 先验证被邀请者是真实用户：此前对任意 UUID 调 getOrCreatePlayerState 现造一份空存档，
      // 导致"玩家不存在"校验形同虚设、幽灵邀请全部显示 success。
      const target = await storage.getUser(body.targetUserId);
      if (!target) return reply.status(404).send({ error: "player_not_found", message: "玩家不存在" });
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/invite", ...body },
        run: () => storage.inviteToParty({ userId, partyId: body.partyId, targetUserId: body.targetUserId }),
      });
      if (!result.success) return reply.status(400).send({ error: "invite_failed", message: result.message || "邀请失败" });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "邀请失败" });
    }
  });

  app.post("/party/invite/accept", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/invite/accept", ...body },
        run: () => storage.acceptPartyInvite({ userId, partyId: body.partyId }),
      });
      if (sendIfFailed(result, reply)) return;
      await beginRun(userId);
      return reply.send(enrichPartyForClient(result as any, userId) ?? result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "接受邀请失败" });
    }
  });

  app.post("/party/invite/decline", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/invite/decline", ...body },
        run: () => storage.declinePartyInvite({ userId, partyId: body.partyId }),
      });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "拒绝邀请失败" });
    }
  });

  app.post("/party/kick", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1), memberId: z.string().min(1),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/kick", ...body },
        run: () => storage.kickPartyMember({ userId, partyId: body.partyId, memberId: body.memberId }),
      });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "踢出成员失败" });
    }
  });

  app.post("/party/transfer-leadership", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1), memberId: z.string().min(1),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/transfer", ...body },
        run: () => storage.transferPartyLeadership({ userId, partyId: body.partyId, memberId: body.memberId }),
      });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "移交队长失败" });
    }
  });

  app.post("/party/start-activity", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1),
      activityType: z.enum(['combat', 'group_craft', 'raid']).optional().default('raid'),
      stageId: z.string().optional(),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    const resolvedType = body.activityType === 'group_craft' ? 'group_craft' : (body.activityType || 'raid');
    const resolvedStageId = resolvedType === 'group_craft' ? undefined : normalizePartyStageId(body.stageId);

    try {
      // Ensure if the player is in a bot/offline-led party, leadership is transferred first
      const current = await storage.getPartyForUser({ userId });
      if (current && current.id === body.partyId) {
        await recognizePartyBots(storage, current);
        if (resolvedStageId) {
          const need = partyRequiredLevel(contentPack, resolvedStageId);
          for (const m of current.members) {
            // 陪练不看等级
            if (isPartyBotUserId(m.userId)) continue;
            const level = (await storage.getOrCreatePlayerState(m.userId, version)).combatLevel || 1;
            if (level < need) {
              return reply.status(403).send({
                error: "party_level_required",
                message: m.userId === userId ? `战斗等级到 ${need} 级才能进这个副本` : `队友「${friendlyAdventurerName(m.userId, m.displayName)}」的战斗等级不到 ${need} 级`,
                requiredLevel: need,
              });
            }
          }
        }
        await ensureHumanLeaderIfBotParty(storage, userId, current);
        setMemberReady(body.partyId, userId, true);
        if (current.currentActivity) {
          await storage.cancelPartyActivity({ userId, partyId: body.partyId }).catch(() => undefined);
        }
      }

      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/start-activity", ...body, stageId: resolvedStageId },
        run: () => storage.startPartyActivity({
          userId,
          partyId: body.partyId,
          activityType: resolvedType,
          stageId: resolvedStageId,
          durationMinutes: body.durationMinutes,
          contentPack,
        }),
      });
      if (sendIfFailed(result, reply)) return;

      // 战斗与生活互斥：开启组队战斗/副本时，立即结算并终止队伍内所有真人的生活动作或单人战斗
      const now = new Date();
      const startedParty = await storage.getPartyForUser({ userId });
      const humanMemberIds = new Set<string>([userId]);
      for (const m of startedParty?.members || []) {
        if (!isPartyBotUserId(m.userId)) humanMemberIds.add(m.userId);
      }
      for (const memberUid of humanMemberIds) {
        await storage.executePlayerCommand({
          userId: memberUid,
          contentPack,
          now,
          apply(st) {
            if (st.hpCombat && !st.hpCombat.outcome) {
              const { persistCombatHp } = require("../hp_combat") as typeof import("../hp_combat");
              persistCombatHp(st, st.hpCombat.playerHp, now.getTime());
            }
            // 单人地下城按「离开」结束：趁战斗还在，把已过几波的累计写进结算
            leaveDungeon(st as EnhancedPlayerState, now);
            st.hpCombat = undefined;
            if (st.combatLoadout?.autoRepeat) {
              st.combatLoadout = { ...st.combatLoadout, autoRepeat: false };
            }
            st.lifeActionState = undefined;
            st.combatFarmState = undefined;
            if (st.mode === "life_action" || st.mode === "combat") {
              st.mode = "idle";
            }
            return { ok: true as const };
          },
        }).catch(() => undefined);
        await beginRun(memberUid);
      }

      // Immediately seed initial bot combat/craft contributions so bot teammates are actively helping from second 1
      const afterStart = startedParty ?? (await storage.getPartyForUser({ userId }));
      if (afterStart) {
        await simulateBotPartyContributions(storage, afterStart, contentPack);
      }
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "开始活动失败" });
    }
  });

  /** 清波 / 重整前的检查；不在战斗里时写好回复并返回 null。 */
  const partyBattle = async (userId: string, partyId: string, reply: FastifyReply): Promise<{ party: Party; ctx: PartyContext } | null> => {
    const current = await storage.getPartyForUser({ userId });
    if (!current || current.id !== partyId) {
      reply.status(400).send({ success: false, error: "party_op_failed", message: "您不在该队伍中" });
      return null;
    }
    if (current.currentActivity) await recognizePartyBots(storage, current);
    const ctx = battleContext(current, userId);
    if (!ctx) {
      reply.status(400).send({ success: false, error: "party_op_failed", message: "当前没有进行中的组队战斗" });
      return null;
    }
    return { party: current, ctx };
  };

  app.post("/party/wave-clear", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1),
      stageId: z.string().optional(),
      wave: z.number().int().min(1).max(10000),
      operationId: z.string().max(128).optional(),
      abilityCasts: z.record(z.string(), z.number().int().min(0).max(50)).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const battle = await partyBattle(userId, body.partyId, reply);
      if (!battle) return;
      const now = clock();
      // 幂等靠波次本身（同一波只结算一次，重发返回上次结果），所以不另存操作回执：
      // 回执会把「太早」这类拒绝也记住，客户端等一下再报同一波就永远被拒。
      const outcome = await storage.executePlayerCommand({
        userId,
        contentPack,
        now,
        apply(st) {
          const verdict = judgeWaveClear(st, contentPack, battle.ctx, body.wave, now);
          if (verdict.kind !== "ok") return { verdict };
          // 组队战斗进行中严格禁止同时保留生活动作或单人战斗
          if (st.mode === "life_action" || st.lifeActionState) {
            st.mode = "idle";
            st.lifeActionState = undefined;
          }
          if (st.hpCombat) {
            st.hpCombat = undefined;
            if (st.combatLoadout?.autoRepeat) {
              st.combatLoadout = { ...st.combatLoadout, autoRepeat: false };
            }
          }
          return { verdict, settled: settlePartyWave(st, contentPack, battle.ctx, body.wave, body.abilityCasts, now) };
        },
      });

      const { verdict, settled } = outcome.result;
      if (verdict.kind !== "ok" && verdict.kind !== "duplicate") {
        req.log.warn({ userId, partyId: body.partyId, wave: body.wave, verdict, rejects: outcome.state.partyRun?.rejects }, "party wave rejected");
        if (verdict.kind === "level") {
          return reply.status(403).send({ error: "party_level_required", message: `战斗等级到 ${verdict.requiredLevel} 级才能领这个副本的奖励`, requiredLevel: verdict.requiredLevel });
        }
        if (verdict.kind === "early") {
          return reply.status(409).send({ error: "party_wave_early", message: "这一波还没打完", expectedWave: verdict.expectedWave, retryAfterMs: verdict.retryAfterMs });
        }
        return reply.status(409).send({ error: "party_wave_order", message: `现在该打第 ${verdict.expectedWave} 波`, expectedWave: verdict.expectedWave });
      }
      if (verdict.kind === "duplicate") {
        return reply.send({ ...verdict.reply, duplicate: true, stateRevision: outcome.state.stateRevision });
      }
      await simulateBotPartyContributions(storage, battle.party, contentPack).catch(() => undefined);
      return reply.send({ ...settled, stateRevision: outcome.state.stateRevision });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "波次结算失败" });
    }
  });

  /** 团灭：回到第 1 波重新计时。 */
  app.post("/party/wave-reset", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = z.object({ partyId: z.string().min(1) }).strict().parse((req.body ?? {}) as unknown);

    try {
      const battle = await partyBattle(userId, body.partyId, reply);
      if (!battle) return;
      const now = clock();
      const outcome = await storage.executePlayerCommand({
        userId,
        contentPack,
        now,
        apply: (st) => ({ nextWave: resetPartyRun(st, contentPack, battle.ctx, now).nextWave }),
      });
      return reply.send({ ok: true, ...outcome.result, stateRevision: outcome.state.stateRevision });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "重整失败" });
    }
  });

  app.post("/party/complete-activity", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const current = await storage.getPartyForUser({ userId });
      if (current && current.id === body.partyId) {
        await ensureHumanLeaderIfBotParty(storage, userId, current);
        await simulateBotPartyContributions(storage, current, contentPack);
      }

      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/complete-activity", ...body },
        run: () => storage.completePartyActivity({ userId, partyId: body.partyId, contentPack }),
      });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "完成活动失败" });
    }
  });

  app.post("/party/cancel-activity", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const current = await storage.getPartyForUser({ userId });
      if (current && current.id === body.partyId) {
        await ensureHumanLeaderIfBotParty(storage, userId, current);
      }

      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/cancel-activity", ...body },
        run: () => storage.cancelPartyActivity({ userId, partyId: body.partyId }),
      });
      if (sendIfFailed(result, reply)) return;
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "取消活动失败" });
    }
  });

  app.post("/party/leave", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ partyId: z.string().min(1), operationId: z.string().max(128).optional() }).strict().parse((req.body ?? {}) as unknown);

    try {
      const { result } = await storage.deduplicateOperation({
        userId, operationId: body.operationId, operationPayload: { route: "party/leave", ...body },
        run: () => storage.leaveParty({ userId, partyId: body.partyId }),
      });
      if (sendIfFailed(result, reply)) return;
      // Re-seed preset bot parties if a preset party was disbanded on leave
      await ensurePresetParties(storage, contentPack).catch(() => undefined);
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "离开队伍失败" });
    }
  });

  app.get("/party/mine", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    await ensurePresetParties(storage, contentPack).catch(() => undefined);
    const rawParty = await storage.getPartyForUser({ userId });
    await recognizePartyBots(storage, rawParty);
    const party = await ensureHumanLeaderIfBotParty(storage, userId, rawParty);
    if (party?.currentActivity) {
      await simulateBotPartyContributions(storage, party, contentPack);
    }
    return reply.send({ party: enrichPartyForClient(party, userId) });
  });
}
