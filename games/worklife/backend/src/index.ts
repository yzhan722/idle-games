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
      if (body.scene === "chapter-complete") {
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
