import "./loadEnv";
import Fastify, { FastifyInstance, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createStorage } from "./storage";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import {
  authRoutes,
  playerRoutes,
  enhancementRoutes,
  tradingRoutes,
  partyRoutes,
  equipmentRoutes,
  progressionRoutes,
  progression2Routes,
  systemsRoutes,
  combatHpRoutes,
  tasksRoutes,
  housesRoutes,
} from "./routes";
import { socketFromWsConnection } from "./ws_socket";
import { isPublicApiPath, isRateLimitExempt } from "./http_public_path";
import { mapThrownError } from "./http_errors";
import { encounterStages } from "./gameplay_encounters";
import { abilityCatalog } from "./abilities";
import { COMBAT_SKILL_IDS, COMBAT_SKILL_NAMES, COMBAT_SKILL_BLURBS, defaultCombatSkills, ensureCombatSkills } from "./combat_skills";
import { ensureProgression } from "./progression_state";
import { applyE2eFastContent } from "./e2e_fast";
import { assertRuntimePolicy } from "./runtime_policy";

assertRuntimePolicy({
  NODE_ENV: process.env.NODE_ENV,
  E2E_SEED: process.env.E2E_SEED,
  E2E_FAST: process.env.E2E_FAST,
});

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().optional(),
  // 战斗轮询是 1 req/s（60/min），加面板操作一个正常玩家轻松破 100。
  // 默认 300/min 仍挡脚本，配合按用户计数不至于把同 IP 的多个玩家一起掐死。
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().optional(),
});

// 开发环境允许使用默认密钥
if (process.env.NODE_ENV !== "production" && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev_secret_key_minimum_32_characters_long";
}

const env = envSchema.parse(process.env);
const contentPack = applyE2eFastContent(
  JSON.parse(JSON.stringify(enhancedContentPack)) as EnhancedContentPack
);

async function requireAuth(app: FastifyInstance, storage: { getUser(id: string): Promise<{ authVersion?: number } | null> }, req: FastifyRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = auth.slice("Bearer ".length);
  const payload = app.jwt.verify<{ sub: string; av?: number }>(token);
  // av 与用户当前版本不符 → 登出/绑定后签发的旧 token 一律拒绝（服务端吊销）
  const user = await storage.getUser(payload.sub);
  if (!user || payload.av !== (user.authVersion ?? 1)) {
    throw new Error("Unauthorized");
  }
  (req as any).userId = payload.sub;
}


async function main() {
  const app = Fastify({ 
    logger: true,
    bodyLimit: 1048576, // 1MB 请求体大小限制
    genReqId: () => randomUUID(), // 每个请求生成唯一 ID，便于日志追踪
    requestIdHeader: "x-request-id", // 允许客户端透传 request-id
  });

  // 请求日志：记录每个请求的方法、URL、状态码和耗时
  app.addHook("onResponse", (req, reply, done) => {
    req.log.info(
      { reqId: req.id, method: req.method, url: req.url, statusCode: reply.statusCode, durationMs: reply.elapsedTime },
      `${req.method} ${req.url} → ${reply.statusCode} (${Math.round(reply.elapsedTime)}ms)`
    );
    done();
  });

  // 全局错误处理：把校验错误转成 400，其余异常返回安全的 500（不泄露堆栈）
  app.setErrorHandler((error, req, reply) => {
    const mapped = mapThrownError(error);
    if (mapped.status >= 500) {
      req.log.error(error);
    }
    return reply.status(mapped.status).send(mapped.body);
  });

  // CORS 配置：
  // - 生产环境必须通过 CORS_ORIGIN 显式声明允许的前端来源，支持逗号分隔多个域名，
  //   例如 CORS_ORIGIN="https://game.example.com,https://www.example.com"。
  // - 未配置时，生产环境默认拒绝所有跨域（origin:false）以避免安全风险，并打印警告；
  //   开发环境则放开（origin:true）方便本地联调。
  const corsOrigin = (() => {
    if (env.CORS_ORIGIN) {
      const list = env.CORS_ORIGIN.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return list.length === 1 ? list[0] : list;
    }
    if (env.NODE_ENV === "production") {
      app.log.warn(
        "[cors] 未配置 CORS_ORIGIN，生产环境将拒绝所有跨域请求。" +
          "请设置 CORS_ORIGIN（可逗号分隔多个域名）以允许前端访问。"
      );
      return false;
    }
    return true;
  })();

  await app.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  // 全局限流：防刷。登录用户按 userId 计数（同 IP 多人不互相挤占），
  // 未登录流量按 IP。/health 等公开探活路由不限流。
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: (req) => isRateLimitExempt(req.url),
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (auth?.startsWith("Bearer ")) {
        try {
          const payload = app.jwt.verify<{ sub: string }>(auth.slice("Bearer ".length));
          if (payload.sub) return `u:${payload.sub}`;
        } catch { /* 无效 token 按 IP 计数 */ }
      }
      return `ip:${req.ip}`;
    },
    errorResponseBuilder: () => ({
      error: "rate_limited",
      message: "请求过于频繁，请稍后重试",
    }),
  });

  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(websocket);

  const storage = await createStorage({ databaseUrl: env.DATABASE_URL });

  // 公开路由
  app.get("/health", async (_req, reply) => {
    const dbHealth = await storage.healthCheck();
    const status = dbHealth.ok ? 200 : 503;
    return reply.status(status).send({
      ok: dbHealth.ok,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { connected: dbHealth.ok, latencyMs: dbHealth.latencyMs },
    });
  });
  app.get("/content", async () => ({
    ...contentPack,
    encounterStages: encounterStages(contentPack as never),
    abilities: abilityCatalog(),
    combatSkills: COMBAT_SKILL_IDS.map((id) => ({ id, name: COMBAT_SKILL_NAMES[id], blurb: COMBAT_SKILL_BLURBS[id] })),
  }));

  // 认证路由（不需要 token）
  await authRoutes(app, storage);

  // 需要认证的路由 - 添加 preHandler
  // 用精确路径匹配（剥离 query 后比对 pathname），避免 startsWith 前缀匹配
  // 导致 /auth/guest-xxx 之类的路径被误判为公开而绕过鉴权（越权风险）。
  app.addHook("preHandler", async (req, reply) => {
    const isPublic = isPublicApiPath(req.url);
    if (!isPublic) {
      try {
        await requireAuth(app, storage, req);
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
  });

  // 注册功能路由
  await playerRoutes(app, storage, contentPack);
  await enhancementRoutes(app, storage, contentPack);
  await tradingRoutes(app, storage, contentPack);
  await partyRoutes(app, storage, contentPack);
  await equipmentRoutes(app, storage, contentPack);
  await progressionRoutes(app, storage, contentPack);
  await progression2Routes(app, storage, contentPack);
  await systemsRoutes(app, storage, contentPack);
  await combatHpRoutes(app, storage, contentPack);
  await tasksRoutes(app, storage, contentPack);
  await housesRoutes(app, storage, contentPack);

  // 物品列表 API
  app.get("/items/all", async () => {
    const items = (contentPack as any).items || [];
    return {
      materials: items.filter((item: any) => item.type === "material"),
      weapons: items.filter((item: any) => item.type === "weapon" || item.type === "offhand" || item.type === "shield" || item.type === "tool" || Boolean(item.toolFor)),
      armor: items.filter((item: any) => item.type === "armor" || item.type === "accessory"),
      consumables: items.filter((item: any) => item.type === "consumable" || item.type === "food" || item.type === "book"),
      all: items,
    };
  });

  if (process.env.E2E_SEED === "1") {
    app.post("/e2e/seed", async (req, reply) => {
      const userId = (req as any).userId as string;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });
      const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
      const sceneBody = (req.body || {}) as { scene?: string; level?: number };
      if (sceneBody.scene === "combat-levels") {
        // Skip the combat grind only: every combat skill to `level`, nothing else touched, so a spec can walk the real
        // craft / equip / goal flow and still win its fights (forest crab is level 9, the boss level 10).
        const level = Math.min(60, Math.max(1, Math.floor(Number(sceneBody.level) || 16)));
        (state as any).combatSkills = defaultCombatSkills(level);
        ensureCombatSkills(state as any);
        (state as any).combatHp = undefined;
        state.combatHpAt = undefined;
        const saved = await storage.savePlayerState(userId, state);
        return reply.send({ ok: true, inventory: saved.inventory });
      }
      state.inventory.wood_1 = Math.max(state.inventory.wood_1 || 0, 20);
      state.inventory.lumber_1 = Math.max(state.inventory.lumber_1 || 0, 10);
      state.inventory.weapon_wooden_sword = Math.max(state.inventory.weapon_wooden_sword || 0, 1);
      state.inventory.armor_wood_chest = Math.max(state.inventory.armor_wood_chest || 0, 1);
      state.inventory.gold = Math.max(state.inventory.gold || 0, 100);
      if (!state.equipment) {
        (state as any).equipment = { enhancementLevels: {}, durability: {}, maxDurability: {} };
      }
      (state.equipment as any).main_hand = "weapon_wooden_sword";
      (state.equipment as any).chest = "armor_wood_chest";
      const body = (req.body || {}) as { scene?: string };
      if (
        body.scene === "chapter-complete" ||
        body.scene === "chapter2-build" ||
        body.scene === "chapter4-build" ||
        body.scene === "reputation-qm" ||
        body.scene === "guild-bounty" ||
        body.scene === "heritage-workshop" ||
        body.scene === "caravan-trade" ||
        body.scene === "alchemy-cauldron" ||
        body.scene === "astral-relics" ||
        body.scene === "sky-forge" ||
        body.scene === "harbor-derby" ||
        body.scene === "academy-festival" ||
        body.scene === "arena-town" ||
        body.scene === "beast-weather" ||
        body.scene === "tavern-chronicle" ||
        body.scene === "airship-paladin" ||
        body.scene === "dwarf-elf" ||
        body.scene === "abyss-guild"
      ) {
        state.chapter1Build = state.chapter1Build || "thick_bark";
        const stats = (state.stats ?? {}) as NonNullable<typeof state.stats>;
        state.stats = stats;
        stats.totalKills = Math.max(stats.totalKills || 0, 4);
        stats.totalBossKills = Math.max(stats.totalBossKills || 0, 1);
        stats.killsByMonster = {
          ...(stats.killsByMonster || {}),
          slime: Math.max(stats.killsByMonster?.slime || 0, 1),
          crab: Math.max(stats.killsByMonster?.crab || 0, 1),
          monkey: Math.max(stats.killsByMonster?.monkey || 0, 1),
          forest_boss: Math.max(stats.killsByMonster?.forest_boss || 0, 1),
        };
        if (body.scene === "reputation-qm") {
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          (state as any).reputation = {
            total: 18000,
            spent: 0,
            tier: 8,
            dailyPurchases: {},
            activeScrolls: {},
            unlockedTitles: [],
            equippedTitle: null,
          };
        }
        if (body.scene === "guild-bounty") {
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 5000);
          (state as any).guildHonor = {
            honorPoints: 260,
            totalHonorEarned: 380,
            forgingEmblems: 2,
            totalChainsCompleted: 2,
            fullClears: 1,
            unlockedFrames: ["frame_crimson_vanguard"],
            equippedFrame: "frame_crimson_vanguard",
          };
        }
        if (body.scene === "heritage-workshop") {
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 24000);
          state.inventory.crystal_1 = Math.max(state.inventory.crystal_1 || 0, 18);
          state.inventory.crystal_2 = Math.max(state.inventory.crystal_2 || 0, 12);
          state.inventory.crystal_3 = Math.max(state.inventory.crystal_3 || 0, 8);
          state.inventory.crystal_4 = Math.max(state.inventory.crystal_4 || 0, 4);
          // Populate 4 T1 cross-profession sets + partial T2 items for Codex showcase
          for (const iid of [
            "ore_1",
            "ingot_1",
            "weapon_iron_sword",
            "fiber_1",
            "yarn_1",
            "armor_cloth_chest",
            "wool",
            "food_simple",
            "armor_farmer_cloth_chest",
            "potion_hp_t1",
            "weapon_staff_t1",
            "ore_3",
            "honey",
          ]) {
            state.inventory[iid] = Math.max(state.inventory[iid] || 0, 2);
          }
          (state as any).guildHonor = {
            honorPoints: 320,
            totalHonorEarned: 450,
            forgingEmblems: 6,
            totalChainsCompleted: 3,
            fullClears: 1,
            unlockedFrames: ["frame_crimson_vanguard"],
            equippedFrame: "frame_crimson_vanguard",
          };
          (state as any).heritageWorkshop = {
            runeRanks: {
              rune_sunder_edge: 2,
              rune_bastion_ward: 1,
            },
            equippedRunes: {
              weapon: "rune_sunder_edge",
              armor: "rune_bastion_ward",
              tool: null,
            },
            codexUnlockedItems: [],
            claimedCodexMilestones: [],
          };
        }
        if (body.scene === "caravan-trade") {
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 18000);
          const seedGoods: Record<string, number> = {
            wood_1: 28,
            lumber_1: 20,
            wood_2: 18,
            lumber_2: 14,
            ore_1: 24,
            ingot_1: 16,
            ore_2: 16,
            ingot_2: 12,
            ore_3: 12,
            ingot_3: 8,
            fiber_1: 22,
            yarn_1: 14,
            yarn_2: 12,
            fish_river: 14,
            food_simple: 10,
            food_fine: 8,
            crystal_1: 16,
            crystal_2: 12,
            crystal_3: 6,
            potion_hp_t1: 8,
            potion_mp_t2: 6,
            weapon_iron_sword: 2,
          };
          for (const [iid, qty] of Object.entries(seedGoods)) {
            state.inventory[iid] = Math.max(state.inventory[iid] || 0, qty);
          }
          (state as any).guildHonor = {
            honorPoints: 280,
            totalHonorEarned: 420,
            forgingEmblems: 4,
            totalChainsCompleted: 2,
            fullClears: 1,
            unlockedFrames: ["frame_crimson_vanguard"],
            equippedFrame: "frame_crimson_vanguard",
          };
          const nowMs = Date.now();
          (state as any).caravanTrade = {
            caravanRep: 320,
            astralCrystalDust: 42,
            expressPermits: 2,
            ledgerRank: 1,
            totalRunsCompleted: 3,
            totalContractsFulfilled: 2,
            wagons: {
              0: {
                slot: 0,
                routeId: "frostport",
                cargo: { lumber_1: 12, food_simple: 6 },
                startedAt: nowMs - 15 * 60 * 1000,
                completesAt: nowMs - 5 * 1000,
                scarcityMultiplier: 1.54,
                usedExpressPermit: false,
                expectedReward: {
                  gold: 540,
                  astralCrystalDust: 10,
                  forgingEmblems: 1,
                  caravanRep: 36,
                },
              },
            },
          };
        }
        if (body.scene === "alchemy-cauldron") {
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 22000);
          for (const [iid, qty] of Object.entries({
            wood_1: 36,
            ore_1: 36,
            fiber_1: 36,
            crystal_1: 24,
            crystal_2: 14,
            crystal_3: 8,
            crystal_4: 4,
          })) {
            state.inventory[iid] = Math.max(state.inventory[iid] || 0, qty);
          }
          (state as any).caravanTrade = {
            caravanRep: 420,
            astralCrystalDust: 64,
            expressPermits: 2,
            ledgerRank: 2,
            totalRunsCompleted: 4,
            totalContractsFulfilled: 3,
            wagons: {},
          };
          (state as any).alchemyCauldron = {
            recipeRanks: {
              dragon_fury: 3,
              elven_bounty: 2,
              dwarven_temper: 3,
              astral_fortune: 2,
            },
            potionCharges: {
              dragon_fury: 14,
              elven_bounty: 8,
              dwarven_temper: 12,
              astral_fortune: 10,
            },
            alchemicalEssence: 6,
            equippedPotions: ["dragon_fury", "dwarven_temper"],
            totalBrews: 6,
            totalUpgrades: 4,
            cauldronPoints: 230,
            alchemyCauldronRank: 4,
          };
        }
        if (body.scene === "astral-relics") {
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 18000);
          for (const [iid, qty] of Object.entries({
            crystal_1: 18,
            crystal_2: 12,
            crystal_3: 8,
            crystal_4: 4,
          })) {
            state.inventory[iid] = Math.max(state.inventory[iid] || 0, qty);
          }
          (state as any).caravanTrade = {
            caravanRep: 480,
            astralCrystalDust: 58,
            expressPermits: 2,
            ledgerRank: 2,
            totalRunsCompleted: 4,
            totalContractsFulfilled: 3,
            wagons: {},
          };
          (state as any).astralRelics = {
            ancientRelicShards: 32,
            expeditionXp: 155,
            curatorRank: 3,
            totalSurveys: 5,
            totalRestorations: 5,
            pedestalRanks: {
              solar_spear: 2,
              verdant_chalice: 1,
              titan_anvil: 1,
              chimera_censer: 1,
            },
          };
        }
        if (body.scene === "sky-forge") {
          // WL-10 视觉自检/E2E：神兵谱总阶 8（锻炉二阶 · 2 席契约阵位），已签 1 份契约，残片/星晶尘足够继续淬炼与签约
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 12000);
          (state as any).caravanTrade = {
            caravanRep: 520,
            astralCrystalDust: 36,
            expressPermits: 2,
            ledgerRank: 2,
            totalRunsCompleted: 5,
            totalContractsFulfilled: 3,
            wagons: {},
          };
          (state as any).astralRelics = {
            ancientRelicShards: 40,
            expeditionXp: 180,
            curatorRank: 3,
            totalSurveys: 7,
            totalRestorations: 4,
            pedestalRanks: {
              solar_spear: 1,
              verdant_chalice: 1,
              titan_anvil: 1,
              chimera_censer: 1,
            },
          };
          (state as any).skyForge = {
            emblemLevels: {
              star_blade: 3,
              crescent_bow: 2,
              star_hammer: 2,
              amethyst_staff: 1,
            },
            totalForges: 8,
            activePacts: ["ember_vanguard"],
            totalPactsSigned: 1,
          };
        }
        if (body.scene === "harbor-derby") {
          // WL-11 视觉自检/E2E：厨师（钓鱼）Lv.50，本周 18 次钓鱼行动已投 6 竿（剩 12 竿），已掌握荧光虾饵 / 金鳞日耀饵，
          // 奖杯积分 8（银纹远投竿），水族馆收藏 7 种（寒霜冰窟展），主展缸「清溪浅滩缸」已收齐
          const {
            getHarborWeekIndex,
            getHarborGroundForWeek,
            harborWeekKeyFromIndex,
            scoreHarborCatch,
          } = require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          const weekIdx = getHarborWeekIndex(seedNow);
          const ground = getHarborGroundForWeek(weekIdx);
          const prevGround = getHarborGroundForWeek(weekIdx - 1);
          const mkCatch = (speciesId: any, sizeCm: number, baitId: any, bonusPct: number, minutesAgo: number) => {
            const featured = (ground.featuredSpecies as readonly string[]).includes(speciesId);
            const { score, trophySize } = scoreHarborCatch(speciesId, sizeCm, featured, bonusPct);
            return {
              speciesId,
              sizeCm,
              score,
              baitId,
              featured,
              trophySize,
              at: new Date(seedNow.getTime() - minutesAgo * 60_000).toISOString(),
            };
          };
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 12000);
          state.inventory.fish_river = Math.max(state.inventory.fish_river || 0, 12);
          state.inventory.shrimp = Math.max(state.inventory.shrimp || 0, 8);
          state.inventory.fish_sea = Math.max(state.inventory.fish_sea || 0, 6);
          state.inventory.fish_lake = Math.max(state.inventory.fish_lake || 0, 6);
          state.inventory.fish_deepsea = Math.max(state.inventory.fish_deepsea || 0, 3);
          state.inventory.fish_abyss = Math.max(state.inventory.fish_abyss || 0, 4);
          if (state.skills?.skill_chef) {
            state.skills.skill_chef.level = Math.max(state.skills.skill_chef.level || 1, 50);
          }
          stats.actionsById = {
            ...(stats.actionsById || {}),
            act_fish_river_t1: 60,
            act_fish_sea_t2: 30,
            act_fish_t3: 20,
          };
          (state as any).harborDerby = {
            weekKey: harborWeekKeyFromIndex(weekIdx),
            fishingBaseline: 110 - 18,
            entriesUsed: 6,
            weeklyCatches: [
              mkCatch("fish_abyss", 168.4, "glow_shrimp", 14, 150),
              mkCatch("fish_deepsea", 92.6, "harbor_worm", 6, 120),
              mkCatch("fish_lake", 58.1, "harbor_worm", 6, 90),
              mkCatch("fish_sea", 61.3, "harbor_worm", 6, 60),
              mkCatch("fish_river", 43.0, "harbor_worm", 6, 30),
              mkCatch("shrimp", 11.2, "harbor_worm", 6, 10),
            ],
            baitStock: { harbor_worm: 9, glow_shrimp: 4, sunscale_lure: 2, abyss_lantern_lure: 0 },
            knownRecipes: ["glow_shrimp", "sunscale_lure"],
            trophies: { bronze: 2, silver: 1, gold: 1, legend: 0 },
            totalEntries: 41,
            bestWeeklyScore: 1820,
            lastSettlement: {
              weekKey: harborWeekKeyFromIndex(weekIdx - 1),
              groundId: prevGround.id,
              tier: "gold",
              weeklyScore: 1820,
              entries: 30,
              trophyGranted: "gold",
              unlockedRecipes: ["sunscale_lure"],
              goldReward: 2000,
              baitReward: { glow_shrimp: 3, sunscale_lure: 1 },
            },
          };
          (state as any).harborAquarium = {
            species: {
              fish_river: { count: 9, bestSizeCm: 43 },
              shrimp: { count: 4, bestSizeCm: 13.1 },
              fish_sea: { count: 5, bestSizeCm: 66 },
              fish_lake: { count: 6, bestSizeCm: 61.8 },
              fish_deepsea: { count: 3, bestSizeCm: 92.6 },
              fish_abyss: { count: 2, bestSizeCm: 168.4 },
              sunscale_carp: { count: 1, bestSizeCm: 104.5 },
            },
            featuredTank: "stream_shallows",
          };
        }
        if (body.scene === "academy-festival") {
          // WL-12 视觉自检/E2E：学院四系学分 23/11/5/12（合计 51 → 银穗进修徽章），正在进修「宗师匠艺研讨」（已过 50 分钟），
          // 当前东八区季节节庆：代币 26、部分委托已领取、计数类委托（行动）可再领 1 次；已收藏夏渔纪念章
          const {
            festivalSeasonKey,
            getFestivalSeasonIndex,
            festivalSeasonIdFromIndex,
            festivalSeasonKeyFromIndex,
            getFestivalCommissionsForSeason,
            countFestivalCommissionCounter,
          } = require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          const seasonIdx = getFestivalSeasonIndex(seedNow);
          const seasonId = festivalSeasonIdFromIndex(seasonIdx);
          const keepsakeSeason = festivalSeasonIdFromIndex(seasonIdx - 1);
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 15000);
          const seedItems: Record<string, number> = {
            food_simple: 6,
            ingot_1: 6,
            potion_hp_t1: 4,
            bread: 7,
            drink_basic: 3,
            food_grain_meal: 8,
            yarn_1: 5,
            yarn_2: 4,
            ingot_2: 5,
            ingot_3: 4,
            yarn_3: 3,
            potion_hp_t2: 2,
            potion_hp_t3: 1,
            food_hearty_stew: 2,
            food_fine: 1,
            dyed_cloth: 2,
            honey: 5,
            food_vegetable_stew: 1,
          };
          for (const [itemId, qty] of Object.entries(seedItems)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          stats.actionsById = {
            ...(stats.actionsById || {}),
            act_raise_sheep_t1: 40,
            act_raise_chicken_t1: 20,
            act_plant_grain_t1: 52,
            act_fish_river_t1: 48,
          };
          stats.totalKills = Math.max(stats.totalKills || 0, 61);
          const startedAt = new Date(seedNow.getTime() - 50 * 60_000);
          (state as any).adventurerAcademy = {
            credits: { gathering: 23, crafting: 11, tactics: 5, commerce: 12 },
            completedCourses: { field_survey: 3, spirit_botany: 1, forge_practicum: 2, squire_drills: 1, ledger_basics: 3 },
            activeCourse: {
              courseId: "master_artisan",
              startedAt: startedAt.toISOString(),
              endsAt: new Date(startedAt.getTime() + 120 * 60_000).toISOString(),
            },
            totalEnrollments: 11,
            totalGraduations: 10,
            lastGraduation: {
              courseId: "spirit_botany",
              department: "gathering",
              credits: 11,
              at: new Date(seedNow.getTime() - 130 * 60_000).toISOString(),
              departmentTier: 2,
              badgeTier: 2,
            },
          };
          // 本季计数类委托：第 1 次已领取，季初基线留出 34 次计数 → 第 2 次（需 30）可领取
          const claims: Record<string, number> = {};
          const baselines: Record<string, number> = {};
          const deliverIds: string[] = [];
          for (const def of getFestivalCommissionsForSeason(seasonId)) {
            if (def.kind === "deliver") {
              deliverIds.push(def.id);
              continue;
            }
            claims[def.id] = 1;
            baselines[def.id] = Math.max(0, countFestivalCommissionCounter(def, stats) - 34);
          }
          if (deliverIds[0]) claims[deliverIds[0]] = 1;
          if (deliverIds[2]) claims[deliverIds[2]] = 2;
          (state as any).festivalCalendar = {
            seasonKey: festivalSeasonKey(seedNow),
            tokens: 26,
            claims,
            baselines,
            purchases: { festival_gold_pouch: 2, [`${seasonId}_academy_letter`]: 1 },
            keepsakes: [keepsakeSeason],
            totalTokensEarned: 120,
            totalClaims: 13,
            lastRollover: {
              seasonKey: festivalSeasonKeyFromIndex(seasonIdx - 1),
              claims: 9,
              tokensConverted: 4,
              goldConverted: 80,
            },
          };
        }
        if (body.scene === "arena-town") {
          // WL-13 视觉自检/E2E：钢斧 + 铁甲 + 练过的战斗技能；本赛季停在「下一位擂主可胜、再下一位难胜」的梯级，
          // 今日已用 2 次；称号青铜 / 白银、勋章 9；城镇议事厅 Lv.3（繁荣度 42 → 领地城镇），演武场 Lv.3 材料 + 勋章齐备
          const {
            arenaSeasonKey,
            arenaSeasonKeyFromIndex,
            arenaDayKey,
            getArenaSeasonIndex,
            generateArenaChampion,
            simulateArenaDuel,
          } = require("./progression2") as typeof import("./progression2");
          const { ensureCombatSkills } = require("./combat_skills") as typeof import("./combat_skills");
          const seedNow = new Date();
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 30000);
          const gear: Record<string, string> = { main_hand: "weapon_steel_axe", chest: "armor_iron_chest", legs: "armor_iron_legs" };
          for (const [slot, itemId] of Object.entries(gear)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, 1);
            (state.equipment as any)[slot] = itemId;
          }
          const cs = ensureCombatSkills(state);
          for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = Math.max((cs as any)[k].level || 1, 22);
          ensureCombatSkills(state);
          const seedItems: Record<string, number> = {
            ingot_3: 20,
            potion_hp_t3: 4,
            dyed_cloth: 4,
            lumber_4: 12,
            ingot_4: 6,
            resin: 6,
            food_vegetable_stew: 4,
            food_fine: 3,
            lumber_2: 8,
            crystal_2: 4,
            ingot_2: 10,
            drink_basic: 4,
          };
          for (const [itemId, qty] of Object.entries(seedItems)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          (state as any).guildTown = {
            facilities: { town_hall: 3, artisan_row: 2, harvest_market: 3, training_grounds: 2, guild_bank: 2, sage_library: 1 },
            chestsClaimed: [1],
            totalUpgrades: 13,
            goldInvested: 21400,
            lastUpgrade: { facilityId: "harvest_market", level: 3, at: new Date(seedNow.getTime() - 3_600_000).toISOString() },
          };
          const seasonIdx = getArenaSeasonIndex(seedNow);
          (state as any).skyArena = {
            seasonKey: arenaSeasonKey(seedNow),
            rung: 0,
            bestRung: 9,
            dayKey: arenaDayKey(seedNow),
            attemptsUsed: 2,
            seasonWins: 0,
            seasonLosses: 1,
            totalWins: 24,
            totalLosses: 5,
            medals: 9,
            totalMedalsEarned: 15,
            titles: ["bronze", "silver"],
            seasonsSettled: 2,
            lastSettlement: { seasonKey: arenaSeasonKeyFromIndex(seasonIdx - 1), rung: 8, division: "silver", medals: 6, newTitle: "silver" },
            lastDuel: null,
          };
          // 停在「下一位可胜」的梯级：真实引擎逐级推演，找到连胜上限 k，令 rung = k - 1
          let reach = 0;
          for (let r = 1; r <= 12; r++) {
            if (!simulateArenaDuel(state as any, contentPack, generateArenaChampion(seasonIdx, r), seedNow).won) break;
            reach = r;
          }
          const sa = (state as any).skyArena;
          sa.rung = Math.max(0, reach - 1);
          sa.seasonWins = sa.rung;
          sa.bestRung = Math.max(sa.bestRung, sa.rung);
          if (sa.rung > 0) {
            const last = generateArenaChampion(seasonIdx, sa.rung);
            const duel = simulateArenaDuel(state as any, contentPack, last, seedNow);
            sa.lastDuel = {
              seasonKey: sa.seasonKey,
              rung: sa.rung,
              championName: last.name,
              won: duel.won,
              timeout: duel.timeout,
              playerHpLeft: duel.playerHpLeft,
              playerMaxHp: duel.playerMaxHp,
              enemyHpLeft: duel.enemyHpLeft,
              enemyMaxHp: duel.enemyMaxHp,
              durationMs: duel.durationMs,
              gold: duel.won ? last.gold : 0,
              at: new Date(seedNow.getTime() - 20 * 60_000).toISOString(),
            };
          }
        }
        if (body.scene === "beast-weather") {
          // WL-14 视觉自检/E2E：牧场已驯服蜜语花蜂 Lv.4 与霜鬃雪狼 Lv.6（雪狼出战），晶耳回声蝠的信物 / 料理 / 金币齐备可驯服；
          // 背包备好可喂养料理；观星塔已建（阅历 5 次 → 星图学徒）、近 6 日天候已归档、明日尚未占卜，星晶尘 80
          const { weatherDayIndex, weatherDayKeyFromIndex, getNaturalWeather, BEAST_LEVEL_XP } =
            require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 30000);
          const seedItems: Record<string, number> = {
            ore_6: 2,
            food_grain_meal: 12,
            bread: 8,
            food_simple: 30,
            food_honey_cake: 6,
            food_master_feast: 5,
            food_pork_roast: 3,
            dish_deepsea_stew: 4,
          };
          for (const [itemId, qty] of Object.entries(seedItems)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          const tamedAt = new Date(seedNow.getTime() - 3 * 86_400_000).toISOString();
          (state as any).beastRanch = {
            beasts: {
              bloom_bee: { xp: BEAST_LEVEL_XP[3] + 70, fed: 46, tamedAt },
              frostmane_wolf: { xp: BEAST_LEVEL_XP[5] + 210, fed: 22, tamedAt },
            },
            activeBeastId: "frostmane_wolf",
            totalTamed: 2,
            totalFeedings: 68,
            lastEvent: { kind: "feed", beastId: "frostmane_wolf", level: 6, foodId: "food_master_feast", qty: 4, xpGained: 220, at: tamedAt },
          };
          const today = weatherDayIndex(seedNow);
          (state as any).weatherTower = {
            dayKey: weatherDayKeyFromIndex(today),
            forecasts: [],
            history: Array.from({ length: 6 }, (_, i) => {
              const d = today - 6 + i;
              return { dayKey: weatherDayKeyFromIndex(d), weather: getNaturalWeather(d), wished: false };
            }),
            totalDivinations: 5,
            totalWishes: 2,
            wishesGranted: 1,
            dustSpent: 52,
          };
          const ct = (state as any).caravanTrade || {
            caravanRep: 0,
            astralCrystalDust: 0,
            expressPermits: 1,
            ledgerRank: 0,
            totalRunsCompleted: 0,
            totalContractsFulfilled: 0,
            wagons: {},
          };
          ct.astralCrystalDust = Math.max(Number(ct.astralCrystalDust || 0), 80);
          (state as any).caravanTrade = ct;
        }
        if (body.scene === "tavern-chronicle") {
          // WL-15 视觉自检/E2E：酒馆名望 236（冒险者驿站）、今日 4 位来访已招待 1 位、今日已点唱 1 首（已唱完，还能再点 2 首）；
          // 背包备好菜单料理 / 饮品，并保证前两位未招待的来访者点名的料理与饮品都在背包里（可完美招待）。
          // 编年史读真实记录：首领 4 种 34 次（首卷可编撰）、遗迹 7 次 + 勘探 2 阶 + 商队 6 趟（第二卷已编撰并佩戴称号）、
          // 竞技场第 9 梯 14 胜 + 青铜称号（第五卷可编撰），其余各卷部分达成
          const { tavernDayIndex, tavernDayKeyFromIndex, getTavernVisitorsForDay, getTavernVisitorOrder, planTavernServe, BEAST_LEVEL_XP } =
            require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 30000);
          const seedItems: Record<string, number> = {
            food_simple: 12,
            food_grain_meal: 8,
            bread: 6,
            food_hearty_stew: 5,
            food_vegetable_stew: 4,
            food_fine: 4,
            food_master_feast: 3,
            soup_herbal: 3,
            dish_grilled_lake: 3,
            food_honey_cake: 2,
            drink_basic: 8,
            drink_herbal_tonic: 4,
            drink_fine: 4,
            tea_spirit: 3,
            drink_rich: 2,
          };
          const today = tavernDayIndex(seedNow);
          const visitors = getTavernVisitorsForDay(today);
          for (const id of visitors.slice(0, 2)) {
            const order = getTavernVisitorOrder(today, id);
            seedItems[order.dishId] = Math.max(seedItems[order.dishId] || 0, 2);
            seedItems[order.drinkId] = Math.max(seedItems[order.drinkId] || 0, 2);
          }
          for (const [itemId, qty] of Object.entries(seedItems)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          const servedId = visitors[visitors.length - 1];
          const servedOrder = getTavernVisitorOrder(today, servedId);
          // 上一位客人：端上了点单的料理 + 一杯提神饮料（名望与小费按真实公式计算）
          const servedPlan = planTavernServe(today, servedId, servedOrder.dishId, "drink_basic");
          const balladStart = new Date(seedNow.getTime() - 50 * 60_000);
          (state as any).bardTavern = {
            dayKey: tavernDayKeyFromIndex(today),
            served: [servedId],
            balladsToday: 1,
            activeBallad: {
              balladId: "forest_wander",
              startedAt: balladStart.toISOString(),
              endsAt: new Date(balladStart.getTime() + 30 * 60_000).toISOString(),
            },
            fame: 236,
            totalServed: 41,
            totalPerfect: 9,
            totalBallads: 7,
            tipsEarned: 5400,
            lastServe: {
              visitorId: servedId,
              dayKey: tavernDayKeyFromIndex(today),
              dishId: servedOrder.dishId,
              drinkId: "drink_basic",
              matchedDish: servedPlan.matchedDish,
              matchedDrink: servedPlan.matchedDrink,
              fame: servedPlan.fame,
              tipGold: servedPlan.tipGold,
              at: new Date(seedNow.getTime() - 25 * 60_000).toISOString(),
            },
          };
          stats.totalBossKills = Math.max(stats.totalBossKills || 0, 34);
          stats.killsByMonster = {
            ...(stats.killsByMonster || {}),
            forest_boss: Math.max(stats.killsByMonster?.forest_boss || 0, 15),
            mine_boss: Math.max(stats.killsByMonster?.mine_boss || 0, 10),
            swamp_boss: Math.max(stats.killsByMonster?.swamp_boss || 0, 6),
            snow_boss: Math.max(stats.killsByMonster?.snow_boss || 0, 3),
          };
          (state as any).astralRelics = {
            ancientRelicShards: 6,
            expeditionXp: 60,
            curatorRank: 2,
            totalSurveys: 7,
            totalRestorations: 1,
            pedestalRanks: { solar_spear: 1, verdant_chalice: 0, titan_anvil: 0, chimera_censer: 0 },
          };
          const ct = (state as any).caravanTrade || {
            caravanRep: 40,
            astralCrystalDust: 12,
            expressPermits: 1,
            ledgerRank: 1,
            totalRunsCompleted: 0,
            totalContractsFulfilled: 2,
            wagons: {},
          };
          ct.totalRunsCompleted = Math.max(Number(ct.totalRunsCompleted || 0), 6);
          (state as any).caravanTrade = ct;
          (state as any).harborDerby = { trophies: { bronze: 2, silver: 1, gold: 0, legend: 0 }, totalEntries: 36, bestWeeklyScore: 410 };
          (state as any).harborAquarium = {
            species: {
              fish_river: { count: 9, bestSizeCm: 43 },
              shrimp: { count: 4, bestSizeCm: 13.1 },
              fish_sea: { count: 5, bestSizeCm: 66 },
              fish_lake: { count: 3, bestSizeCm: 58.1 },
            },
            featuredTank: null,
          };
          (state as any).adventurerAcademy = {
            credits: { gathering: 18, crafting: 14, tactics: 8, commerce: 8 },
            completedCourses: { field_survey: 2, forge_practicum: 1 },
            activeCourse: null,
            totalEnrollments: 3,
            totalGraduations: 3,
            lastGraduation: null,
          };
          (state as any).skyArena = {
            bestRung: 9,
            totalWins: 14,
            totalLosses: 4,
            titles: ["bronze"],
            seasonsSettled: 1,
            medals: 3,
            totalMedalsEarned: 3,
          };
          const tamedAt = new Date(seedNow.getTime() - 5 * 86_400_000).toISOString();
          (state as any).beastRanch = {
            beasts: {
              bloom_bee: { xp: BEAST_LEVEL_XP[3], fed: 30, tamedAt },
              frostmane_wolf: { xp: BEAST_LEVEL_XP[5], fed: 20, tamedAt },
            },
            activeBeastId: "frostmane_wolf",
            totalTamed: 2,
            totalFeedings: 50,
            lastEvent: null,
          };
          const inscribedAt = new Date(seedNow.getTime() - 2 * 86_400_000).toISOString();
          (state as any).adventurerChronicle = {
            inscribed: ["expedition_journal"],
            inscribedAt: { expedition_journal: inscribedAt },
            equippedTitle: "expedition_journal",
            lastInscription: { chapterId: "expedition_journal", at: inscribedAt },
          };
        }
        if (body.scene === "airship-paladin") {
          // WL-16 视觉自检/E2E：飞艇 2 级船体停在公会城镇（经北境冰港航线 Lv.2 抵港，可享收购加成），货舱装着冰港买来的
          // 深海鱼 14 + 雪兽厚皮 6；已开辟两条航线，升 3 级船体的材料与金币齐备。试炼：钢斧 + 铁甲 + 练过的战斗技能，
          // 本周停在「下一关可胜」的关卡（真实引擎逐关推演）；勋章 26 / 累计 74（白银骑士），誓言勇气 2 · 坚忍 1 · 荣光 1
          const {
            airshipDayKey,
            paladinWeekKey,
            paladinWeekIndex,
            generatePaladinOpponent,
            simulatePaladinTrialDuel,
            getPaladinStageReward,
            getAirshipBuyQuote,
            airshipDayIndex,
          } = require("./progression2") as typeof import("./progression2");
          const { ensureCombatSkills } = require("./combat_skills") as typeof import("./combat_skills");
          const seedNow = new Date();
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 60000);
          const gear: Record<string, string> = { main_hand: "weapon_steel_axe", chest: "armor_iron_chest", legs: "armor_iron_legs" };
          for (const [slot, itemId] of Object.entries(gear)) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, 1);
            (state.equipment as any)[slot] = itemId;
          }
          const cs = ensureCombatSkills(state);
          for (const k of ["stamina", "attack", "defense", "melee"] as const) (cs as any)[k].level = Math.max((cs as any)[k].level || 1, 40);
          ensureCombatSkills(state);
          for (const [itemId, qty] of Object.entries({ lumber_4: 24, ingot_3: 18, yarn_3: 12, lumber_3: 8, ingot_2: 6 })) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          const day = airshipDayIndex(seedNow);
          const fishCost = getAirshipBuyQuote(day - 1, "fish_deepsea")!.price * 14;
          const peltCost = getAirshipBuyQuote(day - 1, "snow_pelt")!.price * 6;
          const arrivedAt = new Date(seedNow.getTime() - 40 * 60_000).toISOString();
          (state as any).airshipTrade = {
            dayKey: airshipDayKey(seedNow),
            location: "guild_town",
            voyage: null,
            arrivedVia: "guild_frostport",
            hullLevel: 2,
            routes: {
              guild_frostport: { xp: 9, voyages: 5, openedAt: new Date(seedNow.getTime() - 3 * 86_400_000).toISOString() },
              guild_emberoasis: { xp: 2, voyages: 1, openedAt: new Date(seedNow.getTime() - 86_400_000).toISOString() },
            },
            cargo: { fish_deepsea: 14, snow_pelt: 6 },
            cargoCost: { fish_deepsea: fishCost, snow_pelt: peltCost },
            boughtToday: { cheese_wheel: 10 },
            totalVoyages: 6,
            totalSales: 8640,
            totalSpent: 6120,
            totalProfit: 2520,
            lastSale: null,
            lastArrival: { routeId: "guild_frostport", to: "guild_town", cargoUnits: 20, xpGained: 3, at: arrivedAt },
          };
          const weekIdx = paladinWeekIndex(seedNow);
          (state as any).paladinTrial = {
            weekKey: paladinWeekKey(seedNow),
            cleared: [],
            attemptsUsed: 1,
            medals: 26,
            totalMedals: 74,
            virtues: { valor: 2, aegis: 0, vigor: 1, glory: 1 },
            bestStage: 3,
            weeksFullCleared: 0,
            totalWins: 9,
            totalLosses: 3,
            lastDuel: null,
          };
          // 停在「下一关可胜」：真实引擎逐关推演，找到连胜上限 k，令已通关 = 前 k - 1 关
          let reach = 0;
          for (let s = 1; s <= 6; s++) {
            if (!simulatePaladinTrialDuel(state as any, contentPack, generatePaladinOpponent(weekIdx, s), seedNow).won) break;
            reach = s;
          }
          const pt = (state as any).paladinTrial;
          pt.cleared = Array.from({ length: Math.max(0, reach - 1) }, (_, i) => i + 1);
          pt.attemptsUsed = Math.max(pt.attemptsUsed, pt.cleared.length + 1);
          if (pt.cleared.length > 0) {
            const last = generatePaladinOpponent(weekIdx, pt.cleared.length);
            const duel = simulatePaladinTrialDuel(state as any, contentPack, last, seedNow);
            pt.lastDuel = {
              weekKey: pt.weekKey,
              stage: last.stage,
              opponentName: last.name,
              won: duel.won,
              timeout: duel.timeout,
              playerHpLeft: duel.playerHpLeft,
              playerMaxHp: duel.playerMaxHp,
              enemyHpLeft: duel.enemyHpLeft,
              enemyMaxHp: duel.enemyMaxHp,
              durationMs: duel.durationMs,
              medals: getPaladinStageReward(last.stage).medals,
              at: new Date(seedNow.getTime() - 2 * 3_600_000).toISOString(),
            };
          }
        }
        if (body.scene === "dwarf-elf") {
          // WL-17 视觉自检/E2E：铁匠采矿 50 级（可下前三层），矿道已掘进到第 3 层「熔脉断层」、2 级铁箍矿车，第 1 层今天已出过 1 车；
          // 升 3 级矿车的材料与金币齐备（掘进第 4 层的材料不足）。驿站林地好感 120（树语之友），今日委托板：第 1 张采集委托的
          // 物品备齐、第 2 张差 3 件；远征委托按真实读数（远征商队 3 趟 / 遗迹勘探 2 次 / 飞艇抵港 5 趟）以「刚好达成」为基线
          const {
            mineDayKey,
            mineDayIndex,
            getElfBoard,
            getElfExpeditionCounters,
            ensureCaravanTrade,
            ensureAstralRelics,
            ensureAirshipTrade,
          } = require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 60000);
          const smith = (state.skills as any).skill_blacksmith;
          if (smith) smith.level = Math.max(Number(smith.level) || 1, 50);
          for (const [itemId, qty] of Object.entries({ lumber_3: 12, ingot_3: 14, lumber_6: 4, ingot_6: 2, ore_1: 6, ore_5: 9 })) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          const dayKey = mineDayKey(seedNow);
          (state as any).dwarfMine = {
            dayKey,
            depth: 3,
            cartLevel: 2,
            haulsToday: { "1": 1 },
            haul: null,
            totalHauls: 14,
            totalOre: 176,
            totalByproduct: 5,
            bonanzaHauls: 1,
            lastHaul: {
              layer: 1,
              oreId: "ore_2",
              oreQty: 12,
              grade: "common",
              byproductId: "crystal_1",
              byproductQty: 0,
              at: new Date(seedNow.getTime() - 25 * 60_000).toISOString(),
            },
          };
          ensureCaravanTrade(state as any, seedNow).totalRunsCompleted = 3;
          ensureAstralRelics(state as any, seedNow).totalSurveys = 2;
          ensureAirshipTrade(state as any, seedNow).totalVoyages = 5;
          const counters = getElfExpeditionCounters(state);
          const board = getElfBoard(mineDayIndex(seedNow), 2);
          const base = { ...counters };
          base[board.expedition.sourceId] = Math.max(0, counters[board.expedition.sourceId] - board.expedition.target);
          const [g0, g1] = board.gather;
          state.inventory[g0.itemId] = Math.max(state.inventory[g0.itemId] || 0, g0.qty);
          if (g1.itemId !== g0.itemId) state.inventory[g1.itemId] = Math.max(0, g1.qty - 3);
          (state as any).elfWaystation = {
            dayKey,
            boardTier: 2,
            completed: [],
            expeditionBase: base,
            favor: 120,
            totalCommissions: 17,
            fullBoards: 3,
            totalGold: 6240,
            lastCommission: null,
          };
        }
        if (body.scene === "abyss-guild") {
          // WL-18 视觉自检/E2E：厨师（钓鱼）40 级（可下前三层），3 级「黄金头盔潜装」（氧气 185、可下到第 3 层），
          // 今天第 1 层已下潜 1 次；升 4 级潜装的金币齐备、染布差 6 块。公会战累计勋章 60（银徽骑手），
          // 本周已击败第 1 席、用掉 2 次挑战；战斗技能全 40 级，可以挑战第 2 席
          const { abyssDayKey, abyssDayIndex, getAbyssRuin, guildWarWeekKey, guildWarWeekIndex, generateGuildWarOpponent } =
            require("./progression2") as typeof import("./progression2");
          const seedNow = new Date();
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.gold = Math.max(state.inventory.gold || 0, 30000);
          const chef = (state.skills as any).skill_chef;
          if (chef) chef.level = Math.max(Number(chef.level) || 1, 40);
          (state as any).combatSkills = defaultCombatSkills(40);
          for (const [itemId, qty] of Object.entries({ dyed_cloth: 10, ingot_6: 14, crystal_2: 3 })) {
            state.inventory[itemId] = Math.max(state.inventory[itemId] || 0, qty);
          }
          const dayIndex = abyssDayIndex(seedNow);
          const r1 = getAbyssRuin(dayIndex, 1);
          (state as any).abyssDive = {
            dayKey: abyssDayKey(seedNow),
            gearLevel: 3,
            oxygenUsed: r1.oxygenCost,
            divesToday: { "1": 1 },
            totalDives: 23,
            totalSalvage: 214,
            deepestLayer: 3,
            lastDive: {
              layer: 1,
              itemId: r1.itemId,
              qty: 13,
              current: r1.current,
              oxygen: r1.oxygenCost,
              at: new Date(seedNow.getTime() - 20 * 60_000).toISOString(),
            },
          };
          const weekKey = guildWarWeekKey(seedNow);
          const o1 = generateGuildWarOpponent(guildWarWeekIndex(seedNow), 1);
          (state as any).guildWar = {
            weekKey,
            attemptsUsed: 2,
            cleared: [1],
            totalMedals: 60,
            totalDuels: 14,
            totalWins: 9,
            sweeps: 0,
            lastDuel: {
              weekKey,
              seat: 1,
              rivalId: o1.rivalId,
              opponentName: o1.name,
              won: true,
              timeout: false,
              medals: o1.medals,
              at: new Date(seedNow.getTime() - 40 * 60_000).toISOString(),
            },
          };
        }
        if (body.scene === "chapter2-build" || body.scene === "chapter4-build") {
          state.settings = {
            ...(state.settings || {}),
            characterCreated: true,
            tutorialDone: true,
          } as any;
          state.inventory.ore_1 = Math.max(state.inventory.ore_1 || 0, 4);
          state.inventory.ingot_1 = Math.max(state.inventory.ingot_1 || 0, 4);
          state.inventory.weapon_iron_sword = Math.max(state.inventory.weapon_iron_sword || 0, 1);
          (state.equipment as any).main_hand = "weapon_iron_sword";
        }
        if (body.scene === "chapter4-build") {
          state.chapter2Build = state.chapter2Build || "heavy_sunder";
          state.chapter3Build = state.chapter3Build || "gale_flurry";
          (state as any).combatSkills = defaultCombatSkills(32);
          ensureCombatSkills(state as any);
          stats.totalKills = Math.max(stats.totalKills || 0, 16);
          stats.totalBossKills = Math.max(stats.totalBossKills || 0, 3);
          stats.killsByMonster = {
            ...stats.killsByMonster,
            rock_golem: 1,
            crystal_bat: 1,
            ore_rat: 1,
            mine_boss: 1,
            poison_frog: 1,
            swamp_zombie: 1,
            mud_elemental: 1,
            swamp_boss: 1,
          };
          state.inventory.armor_iron_chest = Math.max(state.inventory.armor_iron_chest || 0, 1);
          state.inventory.armor_leather_legs = Math.max(state.inventory.armor_leather_legs || 0, 1);
          state.inventory.armor_leather_boots = Math.max(state.inventory.armor_leather_boots || 0, 1);
          (state.equipment as any).chest = "armor_iron_chest";
          (state.equipment as any).legs = "armor_leather_legs";
          (state.equipment as any).boots = "armor_leather_boots";
          state.inventory.fish_river = Math.max(state.inventory.fish_river || 0, 6);
          state.inventory.food_hearty_stew = Math.max(state.inventory.food_hearty_stew || 0, 6);
          state.inventory.crystal_1 = Math.max(state.inventory.crystal_1 || 0, 6);
          state.inventory.potion_battle_fury = Math.max(state.inventory.potion_battle_fury || 0, 4);
          state.inventory.potion_hp_t2 = Math.max(state.inventory.potion_hp_t2 || 0, 6);
          state.inventory.potion_mp_t1 = Math.max(state.inventory.potion_mp_t1 || 0, 6);
        }
      }
      ensureProgression(state, new Date());
      const saved = await storage.savePlayerState(userId, state);
      return reply.send({ ok: true, inventory: saved.inventory });
    });
  }


  // WebSocket 路由（@fastify/websocket v11 第一个参数就是 ws socket）
  // 认证走首条消息 {type:"auth",token} —— 浏览器 WS 不能设自定义头，
  // token 放 query 会进 nginx/access log（凭据泄漏面）。
  app.get("/ws", { websocket: true }, (connection: any, req: FastifyRequest) => {
    const socket = socketFromWsConnection(connection);
    if (!socket) return;

    let userId: string | null = null;
    let authed = false;
    // 5 秒内未完成认证即断开，防无认证连接白挂
    const authDeadline = setTimeout(() => {
      if (!authed) socket.close();
    }, 5_000);
    authDeadline.unref?.();

    // 聊天发言限频：每用户 6 条 / 3s，滑动窗口
    const chatWindow = { count: 0, resetAt: 0 };
    const chatRateOk = () => {
      const now = Date.now();
      if (now >= chatWindow.resetAt) { chatWindow.count = 0; chatWindow.resetAt = now + 3_000; }
      return ++chatWindow.count <= 6;
    };

    socket.on("message", (data: any) => {
      if (!authed) {
        void (async () => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg?.type === "auth" && typeof msg.token === "string") {
              const payload = app.jwt.verify<{ sub: string; av?: number }>(msg.token);
              if (payload.sub) {
                const user = await storage.getUser(payload.sub);
                if (user && payload.av === (user.authVersion ?? 1)) {
                  userId = payload.sub;
                  authed = true;
                  clearTimeout(authDeadline);
                  storage.wsConnect(userId, { socket });
                  socket.send(JSON.stringify({ type: "auth:ok" }));
                  return;
                }
              }
            }
          } catch { /* fallthrough */ }
          socket.close();
        })();
        return;
      }
      // 认证后：chat:send 走限频，其余消息直通
      let type: string | undefined;
      try { type = JSON.parse(data.toString())?.type; } catch { /* 交给下游丢弃 */ }
      if (type === "chat:send" && !chatRateOk()) {
        socket.send(JSON.stringify({
          type: "chat:error",
          channel: "world",
          message: "发言太频繁，请稍后再试",
        }));
        return;
      }
      storage.wsMessage(userId!, data.toString());
    });

    socket.on("close", () => {
      clearTimeout(authDeadline);
      if (userId) storage.wsDisconnect(userId);
    });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 Server running on port ${env.PORT}`);

  // ===== Graceful Shutdown =====
  const SHUTDOWN_TIMEOUT = 15_000; // 15 秒强制退出超时
  let isShuttingDown = false;

  async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n⏳ Received ${signal}, starting graceful shutdown...`);

    // 设置强制退出定时器，防止 shutdown 卡住
    const forceTimer = setTimeout(() => {
      console.error("❌ Graceful shutdown timed out, forcing exit.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
    forceTimer.unref();

    try {
      // 关闭 Fastify（停止接受新连接，等待已有请求完成）
      await app.close();
      console.log("✅ HTTP server closed.");

      // 关闭数据库连接池
      await storage.close();
      console.log("✅ Database pool closed.");

      console.log("👋 Shutdown complete.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during shutdown:", err);
      process.exit(1);
    }
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
