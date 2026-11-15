import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack, EnhancedPlayerState } from "../types";
import { operationPayload, PlayerCommandConflict, PlayerCommandRejected } from '../player_commands';
import { syncAchievements } from "../progression";
import {
  getReputationInfo,
  buyQuartermasterItem,
  equipReputationTitle,
  getBountyInfo,
  acceptBounty,
  claimBounty,
  rerollBounties,
  claimBountyCombo,
  redeemGuildHonorItem,
  equipGuildFrame,
  getPrestigeInfo,
  doPrestige,
  upgradeAstrolabeNode,
  respecAstrolabe,
  getHeritageWorkshopInfo,
  engraveHeritageRune,
  equipHeritageRune,
  synthesizeForgingEmblem,
  claimHeritageCodexMilestone,
  getCaravanTradeInfo,
  dispatchCaravanWagon,
  expediteCaravanWagon,
  claimCaravanWagon,
  fulfillWorkshopContract,
  rerollWorkshopContracts,
  redeemAstralDustExchange,
  getAlchemyCauldronInfo,
  claimDailyAlchemyExtraction,
  brewAlchemicalPotion,
  upgradeAlchemicalRecipe,
  equipAlchemicalPotion,
  getAstralRelicsInfo,
  dispatchAstralExpedition,
  upgradeSacredRelicPedestal,
} from "../progression2";

/**
 * 进阶进度路由：声望 / 赏金契约 / 转生。
 * 统一遵循 getOrCreatePlayerState -> simulateToNow -> 业务逻辑 -> savePlayerState 的模式。
 */
export async function progression2Routes(
  app: FastifyInstance,
  storage: Storage,
  contentPack: EnhancedContentPack
) {
  const ver = contentPack.version || "1.0.0";

  const revisionSchema = {
    expectedRevision: z.number().int().nonnegative().optional(),
    operationId: z.string().min(1).max(128).optional(),
  };
  const runCommand = <T>(userId: string, body: { expectedRevision?: number; operationId?: string } & Record<string, unknown>, apply: (state: EnhancedPlayerState) => T) =>
    storage.executePlayerCommand({ userId, contentPack, now: new Date(), expectedRevision: body.expectedRevision, operationId: body.operationId, operationPayload: operationPayload(body), apply });
  const commandFail = (reply: FastifyReply, error: unknown) => {
    if (error instanceof PlayerCommandRejected) return reply.status(400).send({ error: error.code });
    if (error instanceof PlayerCommandConflict) {
      return reply.status(409).send({ error: 'state_version_conflict', message: '状态已更新，请刷新后重试', stateRevision: error.stateRevision });
    }
    throw error;
  };

  /* ----------------------- 声望 ----------------------- */

  app.get("/progression2/reputation", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    return reply.send({ ...getReputationInfo(next, now), stateRevision: next.stateRevision });
  });

  app.post("/progression2/reputation/buy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ itemId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = buyQuartermasterItem(state, contentPack, body.itemId, new Date());
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "quartermaster_buy_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        purchase: outcome.result,
        reputation: getReputationInfo(outcome.state, new Date()),
        inventory: outcome.state.inventory,
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/reputation/title", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ titleId: z.string().min(1).nullable(), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = equipReputationTitle(state, body.titleId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "quartermaster_title_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        reputation: getReputationInfo(outcome.state, new Date()),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 赏金契约 ----------------------- */

  app.get("/progression2/bounties", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    const hadBounties = Boolean(next.bounties);
    const info = getBountyInfo(next); // ensureBounties 可能初始化契约板
    const saved = !hadBounties ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/bounties/accept", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = acceptBounty(state, body.bountyId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'accept_rejected');
        return res;
      });
      return reply.send({ ok: true, ...getBountyInfo(outcome.state), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ bountyId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimBounty(state, body.bountyId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'claim_rejected');
        // 领奖可能提升声望，顺带同步成就（声望奖励的金币计入财富成就）
        syncAchievements(state);
        return res;
      });
      return reply.send({
        ok: true,
        reward: {
          gold: outcome.result.gold,
          reputation: outcome.result.reputation,
          honorGained: outcome.result.honorGained,
          items: outcome.result.items,
        },
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state),
        ...getBountyInfo(outcome.state),
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = rerollBounties(state);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'reroll_rejected');
        return res;
      });
      return reply.send({ ok: true, cost: outcome.result.cost, rerollsLeft: outcome.result.rerollsLeft, ...getBountyInfo(outcome.state), stateRevision: outcome.state.stateRevision });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/combo/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ milestoneId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimBountyCombo(state, body.milestoneId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "combo_claim_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        comboReward: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state),
        ...getBountyInfo(outcome.state),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/honor/redeem", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ itemId: z.string().min(1), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = redeemGuildHonorItem(state, contentPack, body.itemId, new Date());
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "honor_redeem_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        redemption: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state),
        ...getBountyInfo(outcome.state),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/bounties/frame", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ frameId: z.string().min(1).nullable(), ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = equipGuildFrame(state, body.frameId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "guild_frame_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        equippedFrame: outcome.result.equippedFrame,
        reputation: getReputationInfo(outcome.state),
        ...getBountyInfo(outcome.state),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) { return commandFail(reply, error); }
  });

  /* ----------------------- 转生 ----------------------- */

  app.get("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now: new Date(), contentPack });
    return reply.send({ ...getPrestigeInfo(next), stateRevision: next.stateRevision });
  });

  app.post("/progression2/prestige", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    const activeParty = await storage.getPartyForUser({ userId }).catch(() => null);
    if (activeParty?.currentActivity) {
      return reply.status(409).send({ error: "in_combat", message: "正在组队副本中，请先停止战斗再转生" });
    }
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = doPrestige(state);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || 'prestige_rejected');
        return res;
      });
      return reply.send({
        ok: true,
        gainedPoints: outcome.result.gainedPoints,
        totalPoints: outcome.result.totalPoints,
        multiplier: outcome.result.multiplier,
        prestige: getPrestigeInfo(outcome.state),
        inventory: outcome.state.inventory,
        stateRevision: outcome.state.stateRevision
      });
    } catch (error) { return commandFail(reply, error); }
  });

  app.post("/progression2/prestige/astrolabe", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ nodeId: z.string().min(1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = upgradeAstrolabeNode(state, body.nodeId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "astrolabe_upgrade_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        nodeId: outcome.result.nodeId,
        newRank: outcome.result.newRank,
        cost: outcome.result.cost,
        prestige: getPrestigeInfo(outcome.state),
        playerPre: outcome.state.prestige,
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/prestige/astrolabe/respec", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const outcome = await runCommand(userId, body, (state) => {
        const res = respecAstrolabe(state);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "astrolabe_respec_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        refundedPoints: outcome.result.refundedPoints,
        prestige: getPrestigeInfo(outcome.state),
        playerPre: outcome.state.prestige,
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 传世铭纹附魔台 & 跨职业套装共鸣图鉴 (WL-6) ----------------------- */

  app.get("/progression2/workshop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const info = getHeritageWorkshopInfo(next, contentPack, now);
    await storage.savePlayerState(userId, next);
    return reply.send({ ...info, stateRevision: next.stateRevision });
  });

  app.post("/progression2/workshop/rune/engrave", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ runeId: z.string().min(1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = engraveHeritageRune(state, body.runeId, contentPack);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "rune_engrave_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        engraved: outcome.result,
        inventory: outcome.state.inventory,
        workshop: getHeritageWorkshopInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/workshop/rune/equip", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        slot: z.enum(["weapon", "armor", "tool"]),
        runeId: z.string().min(1).nullable(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = equipHeritageRune(state, body.slot, body.runeId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "rune_equip_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        equipped: outcome.result,
        workshop: getHeritageWorkshopInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/workshop/emblem/synthesize", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ recipeId: z.string().min(1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = synthesizeForgingEmblem(state, body.recipeId, contentPack, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "emblem_synth_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        synthesisResult: outcome.result,
        inventory: outcome.state.inventory,
        workshop: getHeritageWorkshopInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/workshop/codex/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ milestoneId: z.string().min(1), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimHeritageCodexMilestone(state, body.milestoneId, contentPack);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "codex_claim_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        claimed: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        workshop: getHeritageWorkshopInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 远征商队贸易航路 & 工坊特批契约柜台 (WL-7) ----------------------- */

  app.get("/progression2/caravan", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const hadCaravan = Boolean(next.caravanTrade?.contractsBoard?.date);
    const info = getCaravanTradeInfo(next, contentPack, now);
    const saved = !hadCaravan ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/caravan/dispatch", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        wagonSlot: z.number().int().min(0).max(2),
        routeId: z.enum(["frostport", "emberoasis", "starfallspire"]),
        cargo: z.record(z.string().min(1), z.number().int().positive()),
        useExpressPermit: z.boolean().optional(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = dispatchCaravanWagon(
          state,
          contentPack,
          {
            wagonSlot: body.wagonSlot,
            routeId: body.routeId,
            cargo: body.cargo,
            useExpressPermit: body.useExpressPermit,
          },
          now
        );
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "caravan_dispatch_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        dispatched: outcome.result.wagon,
        inventory: outcome.state.inventory,
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/caravan/expedite", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        wagonSlot: z.number().int().min(0).max(2),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = expediteCaravanWagon(state, body.wagonSlot, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "caravan_expedite_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        expedited: outcome.result.wagon,
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/caravan/claim", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        wagonSlot: z.number().int().min(0).max(2),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimCaravanWagon(state, body.wagonSlot, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "caravan_claim_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        claimed: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/caravan/contracts/fulfill", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        contractId: z.string().min(1),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = fulfillWorkshopContract(state, contentPack, body.contractId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "contract_fulfill_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        fulfilled: outcome.result.contract,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/caravan/contracts/reroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = rerollWorkshopContracts(state, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "contract_reroll_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        reroll: outcome.result,
        inventory: outcome.state.inventory,
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/caravan/exchange", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        offerId: z.string().min(1),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = redeemAstralDustExchange(state, contentPack, body.offerId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "dust_exchange_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        exchangeResult: outcome.result,
        inventory: outcome.state.inventory,
        caravan: getCaravanTradeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 奇美拉炼金魔药釜 & 深渊试炼双共鸣药剂槽 (WL-8) ----------------------- */

  app.get("/progression2/cauldron", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const hadCauldron = Boolean(next.alchemyCauldron?.dailyExtraction?.date);
    const info = getAlchemyCauldronInfo(next, contentPack, now);
    const saved = !hadCauldron ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/cauldron/extract", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z.object({ ...revisionSchema }).strict().parse((req.body ?? {}) as unknown);
    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimDailyAlchemyExtraction(state, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "cauldron_extract_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        extraction: outcome.result,
        cauldron: getAlchemyCauldronInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/cauldron/brew", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        potionId: z.enum(["dragon_fury", "elven_bounty", "dwarven_temper", "astral_fortune"]),
        mode: z.enum(["essence", "material", "astral_dust"]),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = brewAlchemicalPotion(state, contentPack, body.potionId, body.mode, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "cauldron_brew_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        brewed: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        cauldron: getAlchemyCauldronInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/cauldron/upgrade", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        potionId: z.enum(["dragon_fury", "elven_bounty", "dwarven_temper", "astral_fortune"]),
        mode: z.enum(["standard", "astral_dust"]).optional(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = upgradeAlchemicalRecipe(
          state,
          contentPack,
          body.potionId,
          body.mode ?? "standard",
          now
        );
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "cauldron_upgrade_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        upgraded: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        cauldron: getAlchemyCauldronInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/cauldron/equip", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        slotIndex: z.union([z.literal(0), z.literal(1)]),
        potionId: z.enum(["dragon_fury", "elven_bounty", "dwarven_temper", "astral_fortune"]).nullable(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = equipAlchemicalPotion(state, body.slotIndex, body.potionId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "cauldron_equip_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        equipped: outcome.result,
        cauldron: getAlchemyCauldronInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 星界远古遗迹勘探队 & 传世圣物陈列馆 (WL-9) ----------------------- */

  app.get("/progression2/relics", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const hadRelics = Boolean(next.astralRelics?.dailySurvey?.date);
    const info = getAstralRelicsInfo(next, contentPack, now);
    const saved = !hadRelics ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/relics/survey", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        stratumId: z.enum(["outpost_ruins", "obsidian_sanctum", "primordial_corridor"]),
        mode: z.enum(["free", "coin", "astral_dust"]),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = dispatchAstralExpedition(state, body.stratumId, body.mode, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "relics_survey_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        surveyed: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        relics: getAstralRelicsInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/relics/upgrade", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        relicId: z.enum(["solar_spear", "verdant_chalice", "titan_anvil", "chimera_censer"]),
        mode: z.enum(["standard", "astral_dust"]).optional(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = upgradeSacredRelicPedestal(
          state,
          contentPack,
          body.relicId,
          body.mode ?? "standard",
          now
        );
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "relics_upgrade_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        upgraded: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        relics: getAstralRelicsInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });
}
