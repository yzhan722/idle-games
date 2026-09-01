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
  skillsRoutes,
  enhancementRoutes,
  tradingRoutes,
  partyRoutes,
  equipmentRoutes,
  progressionRoutes,
  progression2Routes,
  systemsRoutes,
} from "./routes";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().optional(),
});

// 开发环境允许使用默认密钥
if (process.env.NODE_ENV !== "production" && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev_secret_key_minimum_32_characters_long";
}

const env = envSchema.parse(process.env);
const contentPack = enhancedContentPack as EnhancedContentPack;

async function requireAuth(app: FastifyInstance, req: FastifyRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = auth.slice("Bearer ".length);
  const payload = app.jwt.verify<{ sub: string }>(token);
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
    // Zod 校验错误（请求参数非法）
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "请求参数不合法",
        details: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      });
    }
    // Fastify 内置校验错误
    if ((error as any).validation) {
      return reply.status(400).send({ error: "invalid_request", message: "请求参数不合法" });
    }
    // 业务层抛出的已知错误（约定以 code 形式抛出）
    const msg = String((error as any)?.message || "");
    if (msg === "state_not_found") {
      return reply.status(404).send({ error: "state_not_found", message: "玩家状态不存在，请重新进入游戏" });
    }
    if (msg === "state_version_conflict") {
      // 并发写冲突：客户端应丢弃本地缓存并以最新状态重试
      return reply.status(409).send({ error: "state_version_conflict", message: "状态已被其他请求更新，请重试" });
    }
    if (msg === "Unauthorized") {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    // 其余未知错误：记录日志，返回通用 500
    req.log.error(error);
    return reply.status(500).send({ error: "internal_error", message: "服务器内部错误，请稍后重试" });
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

  // 全局限流：防止接口被刷（按 IP 计数）。/health 等公开探活路由不限流。
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: (req) => req.url.startsWith("/health"),
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
  app.get("/content", async () => contentPack);

  // 认证路由（不需要 token）
  await authRoutes(app, storage);

  // 需要认证的路由 - 添加 preHandler
  // 用精确路径匹配（剥离 query 后比对 pathname），避免 startsWith 前缀匹配
  // 导致 /auth/guest-xxx 之类的路径被误判为公开而绕过鉴权（越权风险）。
  const publicPaths = new Set(["/health", "/content", "/auth/guest", "/ws"]);
  app.addHook("preHandler", async (req, reply) => {
    const pathname = (req.url.split("?", 1)[0] || "/").replace(/\/+$/, "") || "/";
    const isPublic = publicPaths.has(pathname);
    if (!isPublic) {
      try {
        await requireAuth(app, req);
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
  });

  // 注册功能路由
  await playerRoutes(app, storage, contentPack);
  await skillsRoutes(app, storage, contentPack);
  await enhancementRoutes(app, storage, contentPack);
  await tradingRoutes(app, storage, contentPack);
  await partyRoutes(app, storage, contentPack);
  await equipmentRoutes(app, storage, contentPack);
  await progressionRoutes(app, storage, contentPack);
  await progression2Routes(app, storage, contentPack);
  await systemsRoutes(app, storage, contentPack);

  // 物品列表 API
  app.get("/items/all", async () => {
    const items = (contentPack as any).items || [];
    return {
      materials: items.filter((item: any) => item.type === "material"),
      weapons: items.filter((item: any) => item.type === "weapon" || item.type === "offhand"),
      armor: items.filter((item: any) => item.type === "armor"),
      consumables: items.filter((item: any) => item.type === "consumable" || item.type === "food"),
      all: items,
    };
  });


  // WebSocket 路由
  app.get("/ws", { websocket: true }, (connection: any, req: FastifyRequest) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token") ?? "";

    let userId: string | null = null;
    try {
      const payload = app.jwt.verify<{ sub: string }>(token);
      userId = payload.sub;
    } catch {
      connection.socket.close();
      return;
    }

    if (!userId) {
      connection.socket.close();
      return;
    }

    storage.wsConnect(userId, connection);

    connection.socket.on("message", (data: any) => {
      storage.wsMessage(userId!, data.toString());
    });

    connection.socket.on("close", () => {
      storage.wsDisconnect(userId!);
    });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 Server running on port ${env.PORT}`);

  // ===== 定时任务：过期挂单清理（每 5 分钟执行一次） =====
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  const cleanupTimer = setInterval(async () => {
    try {
      const count = await storage.cleanupExpiredListings();
      if (count > 0) {
        app.log.info(`[cron] Cleaned up ${count} expired market listings.`);
      }
    } catch (err) {
      app.log.error({ err }, "[cron] Failed to cleanup expired listings");
    }
  }, CLEANUP_INTERVAL);
  cleanupTimer.unref(); // 不阻止进程退出

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
      // 停止定时任务
      clearInterval(cleanupTimer);

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
