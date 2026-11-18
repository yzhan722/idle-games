import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type {
  AcademyCourseId,
  EnhancedContentPack,
  EnhancedPlayerState,
  FestivalCommissionId,
  FestivalShopItemId,
  TownFacilityId,
  ContractBeastId,
  WeatherId,
  TavernVisitorId,
  TavernBalladId,
  ChronicleChapterId,
  AirshipGoodId,
  AirshipRouteId,
  PaladinVirtueId,
} from "../types";
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
  getSkyForgeInfo,
  forgeStarEmblem,
  setGuildTrialPact,
  getHarborDerbyInfo,
  enterHarborDerby,
  craftHarborBait,
  setHarborFeaturedTank,
  HARBOR_MAX_CRAFT_BATCHES,
  HARBOR_MAX_ENTRIES_PER_REQUEST,
  getAcademyFestivalInfo,
  enrollAcademyCourse,
  claimFestivalCommission,
  buyFestivalShopItem,
  ACADEMY_COURSE_IDS,
  FESTIVAL_COMMISSION_IDS,
  FESTIVAL_SHOP_ITEM_IDS,
  getSkyArenaTownInfo,
  challengeSkyArena,
  upgradeTownFacility,
  claimTownProsperityChest,
  ARENA_RUNG_COUNT,
  TOWN_FACILITY_IDS,
  getBeastWeatherInfo,
  tameContractBeast,
  feedContractBeast,
  assignBeastCompanion,
  divineTomorrowWeather,
  wishTomorrowWeather,
  CONTRACT_BEAST_IDS,
  WEATHER_IDS,
  BEAST_FOODS,
  BEAST_FEED_MAX_QTY,
  getTavernChronicleInfo,
  serveTavernVisitor,
  requestBardBallad,
  inscribeChronicleChapter,
  equipChronicleTitle,
  TAVERN_VISITOR_IDS,
  TAVERN_BALLAD_IDS,
  CHRONICLE_CHAPTER_IDS,
  TAVERN_MENU,
  getAirshipPaladinInfo,
  openAirshipRoute,
  buyAirshipCargo,
  sellAirshipCargo,
  launchAirshipVoyage,
  upgradeAirshipHull,
  challengePaladinTrial,
  upgradePaladinVirtue,
  AIRSHIP_GOOD_IDS,
  AIRSHIP_ROUTE_IDS,
  AIRSHIP_MAX_TRADE_QTY,
  PALADIN_VIRTUE_IDS,
  PALADIN_STAGES,
  getDwarfElfInfo,
  dispatchMineCart,
  upgradeMineDepth,
  upgradeMineCart,
  deliverElfCommission,
  MINE_LAYERS,
  ELF_BOARD_SLOTS,
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

  /* ----------------------- 天空锻炉星辰神兵谱 & 公会秘境试炼契约阵 (WL-10) ----------------------- */

  app.get("/progression2/forge", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const hadForge = Boolean(next.skyForge && typeof next.skyForge === "object");
    const info = getSkyForgeInfo(next, contentPack, now);
    const saved = !hadForge ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/forge/emblem", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        emblemId: z.enum(["star_blade", "crescent_bow", "star_hammer", "amethyst_staff"]),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = forgeStarEmblem(state, body.emblemId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "forge_emblem_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        forged: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        forge: getSkyForgeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/forge/pact", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        pactId: z.enum(["ember_vanguard", "verdant_harvest", "forge_oath", "gale_hunt", "astral_covenant"]),
        action: z.enum(["sign", "revoke"]),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = setGuildTrialPact(state, body.pactId, body.action, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "guild_pact_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        pact: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        forge: getSkyForgeInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 港湾垂钓大赛 & 海港水族馆收藏图鉴 (WL-11) ----------------------- */

  app.get("/progression2/harbor", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const prevWeekKey = next.harborDerby && typeof next.harborDerby === "object" ? next.harborDerby.weekKey : null;
    const hadAquarium = Boolean(next.harborAquarium && typeof next.harborAquarium === "object");
    const info = getHarborDerbyInfo(next, contentPack, now);
    // 首次补齐状态或按显式 now 翻周结算（奖杯 / 金币 / 配方 / 新周基线）时落库，避免结算重复或基线漂移
    const changed = prevWeekKey !== next.harborDerby?.weekKey || !hadAquarium;
    const saved = changed ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/harbor/enter", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        baitId: z.enum(["harbor_worm", "glow_shrimp", "sunscale_lure", "abyss_lantern_lure"]),
        count: z.number().int().min(1).max(HARBOR_MAX_ENTRIES_PER_REQUEST).optional(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = enterHarborDerby(state, body.baitId, body.count ?? 1, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "harbor_enter_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        entry: outcome.result,
        inventory: outcome.state.inventory,
        reputation: getReputationInfo(outcome.state, now),
        harbor: getHarborDerbyInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/harbor/bait", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        baitId: z.enum(["harbor_worm", "glow_shrimp", "sunscale_lure", "abyss_lantern_lure"]),
        batches: z.number().int().min(1).max(HARBOR_MAX_CRAFT_BATCHES).optional(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = craftHarborBait(state, contentPack, body.baitId, body.batches ?? 1, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "harbor_bait_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        bait: outcome.result,
        inventory: outcome.state.inventory,
        harbor: getHarborDerbyInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/harbor/tank", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({
        themeId: z
          .enum(["stream_shallows", "coral_harbor", "frost_grotto", "ember_starlight", "sunscale_palace"])
          .nullable(),
        ...revisionSchema,
      })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = setHarborFeaturedTank(state, body.themeId);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "harbor_tank_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        tank: outcome.result,
        harbor: getHarborDerbyInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 冒险者学院进修课程 & 四季节庆活动日历 (WL-12) ----------------------- */

  const academyCourseEnum = z.enum([...ACADEMY_COURSE_IDS] as [AcademyCourseId, ...AcademyCourseId[]]);
  const festivalCommissionEnum = z.enum([...FESTIVAL_COMMISSION_IDS] as [FestivalCommissionId, ...FestivalCommissionId[]]);
  const festivalShopEnum = z.enum([...FESTIVAL_SHOP_ITEM_IDS] as [FestivalShopItemId, ...FestivalShopItemId[]]);

  app.get("/progression2/academy", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) =>
      JSON.stringify([s.adventurerAcademy ?? null, s.festivalCalendar ?? null, s.inventory?.gold ?? 0]);
    const before = snapshot(next);
    const info = getAcademyFestivalInfo(next, contentPack, now);
    // 首次补齐状态、按显式 now 结业（学分）或翻季结算（代币折金币 / 新季基线）时落库，避免重复结算或基线漂移
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/academy/enroll", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ courseId: academyCourseEnum, ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = enrollAcademyCourse(state, contentPack, body.courseId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "academy_enroll_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        enrollment: outcome.result,
        inventory: outcome.state.inventory,
        academy: getAcademyFestivalInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/festival/commission", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ commissionId: festivalCommissionEnum, ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimFestivalCommission(state, contentPack, body.commissionId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "festival_commission_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        commission: outcome.result,
        inventory: outcome.state.inventory,
        academy: getAcademyFestivalInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/festival/shop", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ itemId: festivalShopEnum, ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = buyFestivalShopItem(state, contentPack, body.itemId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "festival_shop_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        purchase: outcome.result,
        inventory: outcome.state.inventory,
        academy: getAcademyFestivalInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 天空竞技场赛季排位 & 公会领地城镇建设 (WL-13) ----------------------- */

  const townFacilityEnum = z.enum([...TOWN_FACILITY_IDS] as [TownFacilityId, ...TownFacilityId[]]);

  app.get("/progression2/arena", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) =>
      JSON.stringify([s.skyArena ?? null, s.guildTown ?? null, s.inventory?.gold ?? 0]);
    const before = snapshot(next);
    const info = getSkyArenaTownInfo(next, contentPack, now);
    // 首次补齐状态、按显式 now 翻季结算（勋章 / 称号）或换日重置挑战次数时落库，避免重复结算
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  app.post("/progression2/arena/challenge", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ rung: z.number().int().min(1).max(ARENA_RUNG_COUNT).optional(), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = challengeSkyArena(state, contentPack, now, body.rung);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "arena_challenge_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        challenge: outcome.result,
        inventory: outcome.state.inventory,
        arena: getSkyArenaTownInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/town/build", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ facilityId: townFacilityEnum, ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = upgradeTownFacility(state, contentPack, body.facilityId, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "town_build_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        upgrade: outcome.result,
        inventory: outcome.state.inventory,
        arena: getSkyArenaTownInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  app.post("/progression2/town/chest", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const body = z
      .object({ tier: z.number().int().min(1).max(5), ...revisionSchema })
      .strict()
      .parse((req.body ?? {}) as unknown);

    try {
      const now = new Date();
      const outcome = await runCommand(userId, body, (state) => {
        const res = claimTownProsperityChest(state, contentPack, body.tier, now);
        if (!res.ok) throw new PlayerCommandRejected(res.reason || "town_chest_rejected");
        return res;
      });
      return reply.send({
        ok: true,
        chest: outcome.result,
        inventory: outcome.state.inventory,
        arena: getSkyArenaTownInfo(outcome.state, contentPack, now),
        stateRevision: outcome.state.stateRevision,
      });
    } catch (error) {
      return commandFail(reply, error);
    }
  });

  /* ----------------------- 契约魔兽牧场 & 天候观星占卜塔 (WL-14) ----------------------- */

  const beastEnum = z.enum([...CONTRACT_BEAST_IDS] as [ContractBeastId, ...ContractBeastId[]]);
  const weatherEnum = z.enum([...WEATHER_IDS] as [WeatherId, ...WeatherId[]]);
  const beastFoodEnum = z.enum(BEAST_FOODS.map((f) => f.itemId) as [string, ...string[]]);
  const weatherDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

  app.get("/progression2/ranch", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) => JSON.stringify([s.beastRanch ?? null, s.weatherTower ?? null]);
    const before = snapshot(next);
    const info = getBeastWeatherInfo(next, contentPack, now);
    // 首次建立牧场 / 观星塔、或按显式 now 换日归档时落库，避免天候在视图与存档间漂移
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  const beastWeatherCommand = (
    path: string,
    schema: z.ZodTypeAny,
    resultKey: string,
    apply: (state: EnhancedPlayerState, body: any, now: Date) => { ok: boolean; reason?: string },
    rejectCode: string
  ) => {
    app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const body = schema.parse((req.body ?? {}) as unknown);
      try {
        const now = new Date();
        const outcome = await runCommand(userId, body, (state) => {
          const res = apply(state, body, now);
          if (!res.ok) throw new PlayerCommandRejected(res.reason || rejectCode);
          return res;
        });
        return reply.send({
          ok: true,
          [resultKey]: outcome.result,
          inventory: outcome.state.inventory,
          ranch: getBeastWeatherInfo(outcome.state, contentPack, now),
          stateRevision: outcome.state.stateRevision,
        });
      } catch (error) {
        return commandFail(reply, error);
      }
    });
  };

  beastWeatherCommand(
    "/progression2/ranch/tame",
    z.object({ beastId: beastEnum, ...revisionSchema }).strict(),
    "tame",
    (state, body, now) => tameContractBeast(state, contentPack, body.beastId, now),
    "beast_tame_rejected"
  );

  beastWeatherCommand(
    "/progression2/ranch/feed",
    z
      .object({ beastId: beastEnum, foodId: beastFoodEnum, qty: z.number().int().min(1).max(BEAST_FEED_MAX_QTY), ...revisionSchema })
      .strict(),
    "feed",
    (state, body, now) => feedContractBeast(state, contentPack, body.beastId, body.foodId, body.qty, now),
    "beast_feed_rejected"
  );

  beastWeatherCommand(
    "/progression2/ranch/companion",
    z.object({ beastId: beastEnum.nullable(), ...revisionSchema }).strict(),
    "companion",
    (state, body, now) => assignBeastCompanion(state, body.beastId, now),
    "beast_companion_rejected"
  );

  beastWeatherCommand(
    "/progression2/weather/divine",
    z.object({ dayKey: weatherDayKeySchema.optional(), ...revisionSchema }).strict(),
    "divination",
    (state, body, now) => divineTomorrowWeather(state, now, body.dayKey),
    "weather_divine_rejected"
  );

  beastWeatherCommand(
    "/progression2/weather/wish",
    z.object({ weather: weatherEnum, dayKey: weatherDayKeySchema.optional(), ...revisionSchema }).strict(),
    "wish",
    (state, body, now) => wishTomorrowWeather(state, body.weather, now, body.dayKey),
    "weather_wish_rejected"
  );

  /* ----------------------- 吟游诗人酒馆 & 冒险者编年史 (WL-15) ----------------------- */

  const visitorEnum = z.enum([...TAVERN_VISITOR_IDS] as [TavernVisitorId, ...TavernVisitorId[]]);
  const balladEnum = z.enum([...TAVERN_BALLAD_IDS] as [TavernBalladId, ...TavernBalladId[]]);
  const chapterEnum = z.enum([...CHRONICLE_CHAPTER_IDS] as [ChronicleChapterId, ...ChronicleChapterId[]]);
  const tavernDishEnum = z.enum(TAVERN_MENU.filter((m) => m.kind === "dish").map((m) => m.itemId) as [string, ...string[]]);
  const tavernDrinkEnum = z.enum(TAVERN_MENU.filter((m) => m.kind === "drink").map((m) => m.itemId) as [string, ...string[]]);
  const tavernDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

  app.get("/progression2/tavern", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) => JSON.stringify([s.bardTavern ?? null, s.adventurerChronicle ?? null]);
    const before = snapshot(next);
    const info = getTavernChronicleInfo(next, contentPack, now);
    // 首次开张 / 首次翻开编年史、或按显式 now 换日时落库，避免来访名单与招待记录在视图与存档间漂移
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  const tavernCommand = (
    path: string,
    schema: z.ZodTypeAny,
    resultKey: string,
    apply: (state: EnhancedPlayerState, body: any, now: Date) => { ok: boolean; reason?: string },
    rejectCode: string
  ) => {
    app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const body = schema.parse((req.body ?? {}) as unknown);
      try {
        const now = new Date();
        const outcome = await runCommand(userId, body, (state) => {
          const res = apply(state, body, now);
          if (!res.ok) throw new PlayerCommandRejected(res.reason || rejectCode);
          return res;
        });
        return reply.send({
          ok: true,
          [resultKey]: outcome.result,
          inventory: outcome.state.inventory,
          tavern: getTavernChronicleInfo(outcome.state, contentPack, now),
          stateRevision: outcome.state.stateRevision,
        });
      } catch (error) {
        return commandFail(reply, error);
      }
    });
  };

  tavernCommand(
    "/progression2/tavern/serve",
    z
      .object({
        visitorId: visitorEnum,
        dishId: tavernDishEnum.nullable().optional(),
        drinkId: tavernDrinkEnum.nullable().optional(),
        dayKey: tavernDayKeySchema.optional(),
        ...revisionSchema,
      })
      .strict(),
    "serve",
    (state, body, now) => serveTavernVisitor(state, contentPack, body.visitorId, body.dishId ?? null, body.drinkId ?? null, now, body.dayKey),
    "tavern_serve_rejected"
  );

  tavernCommand(
    "/progression2/tavern/ballad",
    z.object({ balladId: balladEnum, dayKey: tavernDayKeySchema.optional(), ...revisionSchema }).strict(),
    "ballad",
    (state, body, now) => requestBardBallad(state, body.balladId, now, body.dayKey),
    "tavern_ballad_rejected"
  );

  tavernCommand(
    "/progression2/chronicle/inscribe",
    z.object({ chapterId: chapterEnum, ...revisionSchema }).strict(),
    "inscribe",
    (state, body, now) => inscribeChronicleChapter(state, body.chapterId, now),
    "chronicle_inscribe_rejected"
  );

  tavernCommand(
    "/progression2/chronicle/title",
    z.object({ chapterId: chapterEnum.nullable(), ...revisionSchema }).strict(),
    "title",
    (state, body, now) => equipChronicleTitle(state, body.chapterId, now),
    "chronicle_title_rejected"
  );
  /* ----------------------- 浮空飞艇商路 & 圣骑士团荣誉试炼 (WL-16) ----------------------- */

  const airshipGoodEnum = z.enum([...AIRSHIP_GOOD_IDS] as [AirshipGoodId, ...AirshipGoodId[]]);
  const airshipRouteEnum = z.enum([...AIRSHIP_ROUTE_IDS] as [AirshipRouteId, ...AirshipRouteId[]]);
  const paladinVirtueEnum = z.enum([...PALADIN_VIRTUE_IDS] as [PaladinVirtueId, ...PaladinVirtueId[]]);
  const airshipQtySchema = z.number().int().min(1).max(AIRSHIP_MAX_TRADE_QTY);
  const airshipDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

  app.get("/progression2/airship", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) => JSON.stringify([s.airshipTrade ?? null, s.paladinTrial ?? null, s.logs?.length ?? 0]);
    const before = snapshot(next);
    const info = getAirshipPaladinInfo(next, contentPack, now);
    // 首次建船坞 / 入团、按显式 now 换日、抵港或翻周时落库，避免行情存货、停靠港与试炼进度在视图与存档间漂移
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  const airshipCommand = (
    path: string,
    schema: z.ZodTypeAny,
    resultKey: string,
    apply: (state: EnhancedPlayerState, body: any, now: Date) => { ok: boolean; reason?: string },
    rejectCode: string
  ) => {
    app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const body = schema.parse((req.body ?? {}) as unknown);
      try {
        const now = new Date();
        const outcome = await runCommand(userId, body, (state) => {
          const res = apply(state, body, now);
          if (!res.ok) throw new PlayerCommandRejected(res.reason || rejectCode);
          return res;
        });
        return reply.send({
          ok: true,
          [resultKey]: outcome.result,
          inventory: outcome.state.inventory,
          airship: getAirshipPaladinInfo(outcome.state, contentPack, now),
          stateRevision: outcome.state.stateRevision,
        });
      } catch (error) {
        return commandFail(reply, error);
      }
    });
  };

  airshipCommand(
    "/progression2/airship/route",
    z.object({ routeId: airshipRouteEnum, ...revisionSchema }).strict(),
    "route",
    (state, body, now) => openAirshipRoute(state, body.routeId, now),
    "airship_route_rejected"
  );

  airshipCommand(
    "/progression2/airship/buy",
    z.object({ goodId: airshipGoodEnum, qty: airshipQtySchema, dayKey: airshipDayKeySchema.optional(), ...revisionSchema }).strict(),
    "buy",
    (state, body, now) => buyAirshipCargo(state, contentPack, body.goodId, body.qty, now, body.dayKey),
    "airship_buy_rejected"
  );

  airshipCommand(
    "/progression2/airship/sell",
    z.object({ goodId: airshipGoodEnum, qty: airshipQtySchema, dayKey: airshipDayKeySchema.optional(), ...revisionSchema }).strict(),
    "sell",
    (state, body, now) => sellAirshipCargo(state, contentPack, body.goodId, body.qty, now, body.dayKey),
    "airship_sell_rejected"
  );

  airshipCommand(
    "/progression2/airship/launch",
    z.object({ routeId: airshipRouteEnum, ...revisionSchema }).strict(),
    "launch",
    (state, body, now) => launchAirshipVoyage(state, body.routeId, now),
    "airship_launch_rejected"
  );

  airshipCommand(
    "/progression2/airship/hull",
    z.object({ ...revisionSchema }).strict(),
    "hull",
    (state, _body, now) => upgradeAirshipHull(state, contentPack, now),
    "airship_hull_rejected"
  );

  airshipCommand(
    "/progression2/paladin/challenge",
    z
      .object({
        stage: z.number().int().min(1).max(PALADIN_STAGES.length),
        weekKey: airshipDayKeySchema.optional(),
        ...revisionSchema,
      })
      .strict(),
    "challenge",
    (state, body, now) => challengePaladinTrial(state, contentPack, body.stage, now, body.weekKey),
    "paladin_challenge_rejected"
  );

  airshipCommand(
    "/progression2/paladin/virtue",
    z.object({ virtueId: paladinVirtueEnum, ...revisionSchema }).strict(),
    "virtue",
    (state, body, now) => upgradePaladinVirtue(state, body.virtueId, now),
    "paladin_virtue_rejected"
  );

  /* ----------------------- 矮人地底矿脉 & 精灵林地驿站 (WL-17) ----------------------- */

  const mineDayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

  app.get("/progression2/mine", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });

    const now = new Date();
    const state = await storage.getOrCreatePlayerState(userId, ver);
    const next = await storage.simulateToNow({ userId, state, now, contentPack });
    const snapshot = (s: EnhancedPlayerState) => JSON.stringify([s.dwarfMine ?? null, s.elfWaystation ?? null, s.logs?.length ?? 0]);
    const before = snapshot(next);
    const info = getDwarfElfInfo(next, contentPack, now);
    // 首次开矿 / 结识驿站、按显式 now 换日或回矿时落库，避免矿脉进度、回矿入背包与委托板在视图与存档间漂移
    const saved = snapshot(next) !== before ? await storage.savePlayerState(userId, next) : next;
    return reply.send({ ...info, stateRevision: saved.stateRevision });
  });

  const mineCommand = (
    path: string,
    schema: z.ZodTypeAny,
    resultKey: string,
    apply: (state: EnhancedPlayerState, body: any, now: Date) => { ok: boolean; reason?: string },
    rejectCode: string
  ) => {
    app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).userId as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const body = schema.parse((req.body ?? {}) as unknown);
      try {
        const now = new Date();
        const outcome = await runCommand(userId, body, (state) => {
          const res = apply(state, body, now);
          if (!res.ok) throw new PlayerCommandRejected(res.reason || rejectCode);
          return res;
        });
        return reply.send({
          ok: true,
          [resultKey]: outcome.result,
          inventory: outcome.state.inventory,
          mine: getDwarfElfInfo(outcome.state, contentPack, now),
          stateRevision: outcome.state.stateRevision,
        });
      } catch (error) {
        return commandFail(reply, error);
      }
    });
  };

  mineCommand(
    "/progression2/mine/haul",
    z
      .object({
        layer: z.number().int().min(1).max(MINE_LAYERS.length),
        dayKey: mineDayKeySchema.optional(),
        ...revisionSchema,
      })
      .strict(),
    "haul",
    (state, body, now) => dispatchMineCart(state, contentPack, body.layer, now, body.dayKey),
    "mine_haul_rejected"
  );

  mineCommand(
    "/progression2/mine/depth",
    z.object({ ...revisionSchema }).strict(),
    "depth",
    (state, _body, now) => upgradeMineDepth(state, contentPack, now),
    "mine_depth_rejected"
  );

  mineCommand(
    "/progression2/mine/cart",
    z.object({ ...revisionSchema }).strict(),
    "cart",
    (state, _body, now) => upgradeMineCart(state, contentPack, now),
    "mine_cart_rejected"
  );

  mineCommand(
    "/progression2/elf/commission",
    z
      .object({
        slot: z.number().int().min(0).max(ELF_BOARD_SLOTS.length - 1),
        dayKey: mineDayKeySchema.optional(),
        ...revisionSchema,
      })
      .strict(),
    "commission",
    (state, body, now) => deliverElfCommission(state, contentPack, body.slot, now, body.dayKey),
    "elf_commission_rejected"
  );
}
