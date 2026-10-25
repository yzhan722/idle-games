import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { appendLog, getBuffEffects, getRareFindMultiplier, type Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { grantCombatXp } from "../combat_skills";
import { HOUSE_XP_PER_LEVEL, houseLevelForSkill } from "../houses";
import { syncAchievements } from "../progression";
import { getPrestigeMultiplier, getReputationBonuses } from "../progression2";
import {
  ensurePresetParties,
  ensureHumanLeaderIfBotParty,
  simulateBotPartyContributions,
  recruitBotToParty,
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
  contentPack: EnhancedContentPack
) {
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

  app.post("/party/wave-clear", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({
      partyId: z.string().min(1),
      stageId: z.string().optional(),
      wave: z.number().int().min(1).max(10000),
      operationId: z.string().max(128).optional(),
    }).strict().parse((req.body ?? {}) as unknown);

    try {
      const current = await storage.getPartyForUser({ userId });
      if (!current || current.id !== body.partyId) {
        return reply.status(400).send({ success: false, error: "party_op_failed", message: "您不在该队伍中" });
      }
      if (!current.currentActivity) {
        return reply.status(400).send({ success: false, error: "party_op_failed", message: "当前没有进行中的组队战斗" });
      }
      const stageId = normalizePartyStageId(body.stageId || current.currentActivity?.stageId);
      const stage = (contentPack.stages as any[]).find((s) => s.id === stageId) || (contentPack.stages as any[])[0];
      const stageMonsters = ((stage?.monsters || []) as string[])
        .map((id) => (contentPack.monsters as any[]).find((m) => m.id === id))
        .filter(Boolean);
      const normalMonsters = stageMonsters.filter((m) => !m.isBoss && !String(m.id).endsWith("_boss"));
      const bossMonster = stageMonsters.find((m) => m.isBoss || String(m.id).endsWith("_boss")) || stageMonsters.at(-1);

      const isBossWave = body.wave % 10 === 0;
      const waveMonsters: any[] = [];
      if (isBossWave && bossMonster) {
        waveMonsters.push(bossMonster);
      } else if (normalMonsters.length > 0) {
        const offset = (body.wave - 1) % 10;
        for (let i = 0; i < 3; i++) {
          waveMonsters.push(normalMonsters[(offset + i) % normalMonsters.length]);
        }
      } else if (bossMonster) {
        waveMonsters.push(bossMonster);
      }

      const partySizeBonus = 1 + Math.min(5, Math.max(0, (current.members?.length || 1) - 1)) * 0.08;
      let totalXp = 0;
      let totalGold = 0;
      const dropMap = new Map<string, { itemId: string; name: string; qty: number }>();

      const outcome = await storage.executePlayerCommand({
        userId,
        contentPack,
        now: new Date(),
        operationId: body.operationId,
        operationPayload: { route: "party/wave-clear", ...body, stageId },
        apply(st) {
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
          const stats = (st.stats = st.stats || ({} as any));
          stats.killsByMonster = stats.killsByMonster || {};
          const nowDate = new Date();
          const buffEff = getBuffEffects(st, nowDate);
          const repBuffs = getReputationBonuses(st);
          const prestigeMul = getPrestigeMultiplier(st);
          const trainingLevel = houseLevelForSkill(st, "skill_combat");
          const xpBonusMul = (1 + trainingLevel * HOUSE_XP_PER_LEVEL) * (buffEff.xpGain || 1) * repBuffs.xpGain * prestigeMul;
          const goldBonusMul = (buffEff.goldGain || 1) * repBuffs.goldGain * prestigeMul;
          const rareFind = getRareFindMultiplier(st, contentPack, nowDate);

          for (const m of waveMonsters) {
            if (!m) continue;
            const mult = isBossWave ? 2.2 * partySizeBonus : 0.75 * partySizeBonus;
            const xp = Math.max(2, Math.round(Number(m.xp || 10) * mult * xpBonusMul));
            const gold = Math.max(1, Math.round(Number(m.gold || 5) * mult * goldBonusMul));
            totalXp += xp;
            totalGold += gold;

            stats.totalKills = (stats.totalKills || 0) + 1;
            stats.totalActions = (stats.totalActions || 0) + 1;
            stats.killsByMonster[m.id] = (stats.killsByMonster[m.id] || 0) + 1;
            if (isBossWave || m.isBoss || String(m.id).endsWith("_boss")) {
              stats.totalBossKills = (stats.totalBossKills || 0) + 1;
            }

            // Roll standard drops
            for (const d of (m.drops || []) as Array<{ itemId: string; qty?: number; chance?: number }>) {
              const baseChance = typeof d.chance === "number" ? d.chance : 0.35;
              const chance = Math.min(1, baseChance * rareFind);
              if (Math.random() <= chance) {
                const qty = Math.max(1, Number(d.qty || 1));
                st.inventory[d.itemId] = (st.inventory[d.itemId] || 0) + qty;
                const itemDef = (contentPack.items as any[]).find((it) => it.id === d.itemId);
                const prev = dropMap.get(d.itemId);
                dropMap.set(d.itemId, {
                  itemId: d.itemId,
                  name: itemDef?.name || d.itemId,
                  qty: (prev?.qty || 0) + qty,
                });
              }
            }
            // Roll rare drop
            if (m.rare && Number(m.rareChance) > 0 && Math.random() <= Math.min(1, Number(m.rareChance) * (isBossWave ? 1.5 : 1) * rareFind)) {
              const rareItem = (contentPack.items as any[]).find((it) => it.id === m.rare || it.name === m.rare);
              if (rareItem) {
                st.inventory[rareItem.id] = (st.inventory[rareItem.id] || 0) + 1;
                const prev = dropMap.get(rareItem.id);
                dropMap.set(rareItem.id, {
                  itemId: rareItem.id,
                  name: rareItem.name || rareItem.id,
                  qty: (prev?.qty || 0) + 1,
                });
              }
            }
          }

          st.inventory.gold = (st.inventory.gold || 0) + totalGold;
          stats.totalGoldEarned = (stats.totalGoldEarned || 0) + totalGold;
          stats.totalXpEarned = (stats.totalXpEarned || 0) + totalXp;
          const xpGrant = grantCombatXp(st, totalXp, contentPack as any);
          syncAchievements(st);
          appendLog(
            st,
            isBossWave
              ? `组队首领战第 ${body.wave} 波大捷！击败 ${bossMonster?.name || "区域首领"}，获得 ${totalXp} 战斗经验、${totalGold} 金币`
              : `组队副本第 ${body.wave} 波清剿完成，获得 ${totalXp} 战斗经验、${totalGold} 金币`
          );
          return xpGrant;
        },
      });

      const xpGrant = outcome.result;
      const state = outcome.state;
      await simulateBotPartyContributions(storage, current, contentPack).catch(() => undefined);

      return reply.send({
        ok: true,
        wave: body.wave,
        isBossWave,
        xpGained: totalXp,
        xpSplit: xpGrant?.gained || {},
        levelUps: xpGrant?.levelUps || [],
        combatLevel: state.combatLevel || 1,
        goldGained: totalGold,
        drops: Array.from(dropMap.values()),
        stateRevision: state.stateRevision,
      });
    } catch (error) {
      return reply.status(400).send({ error: error instanceof Error ? error.message : "波次结算失败" });
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
    const party = await ensureHumanLeaderIfBotParty(storage, userId, rawParty);
    if (party?.currentActivity) {
      await simulateBotPartyContributions(storage, party, contentPack);
    }
    return reply.send({ party: enrichPartyForClient(party, userId) });
  });
}
