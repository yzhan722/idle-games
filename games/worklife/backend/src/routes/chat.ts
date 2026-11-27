import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import { REPORT_CHANNELS, REPORT_KEEP_DAYS, REPORT_REASONS } from "../chat_moderation";
import { adminKeyMatches } from "../retention_metrics";

/** 举报按账号每分钟 5 次（日上限另在 reportGate）；管理接口按 IP 限次，防止试密钥。 */
const REPORT_ROUTE_LIMIT = { max: 5, timeWindow: "1 minute" };
const ADMIN_ROUTE_LIMIT = { max: 10, timeWindow: "1 minute", keyGenerator: (req: FastifyRequest) => `chat-reports:${req.ip}` };

const target = z.string().min(1).max(64);
const blockBody = z.object({ targetUserId: target, blocked: z.boolean() }).strict();
const reportBody = z.object({ targetUserId: target, reason: z.enum(REPORT_REASONS), channel: z.enum(REPORT_CHANNELS) }).strict();
const adminQuery = z
  .object({
    days: z.coerce.number().int().min(1).max(REPORT_KEEP_DAYS).default(7),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .strict();

/** 聊天屏蔽与举报（规则见 chat_moderation.ts）。 */
export async function chatRoutes(app: FastifyInstance, storage: Storage) {
  app.get("/chat/blocks", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    reply.header("cache-control", "no-store");
    return reply.send({ blocked: await storage.getChatBlocks(userId) });
  });

  app.post("/chat/block", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    const body = blockBody.parse(req.body ?? {});
    const res = await storage.setChatBlock({ userId, targetUserId: body.targetUserId, blocked: body.blocked });
    if (!res.ok) {
      const message = res.error === "too_many" ? "屏蔽名单满了，先解除几个" : res.error === "self" ? "不能屏蔽自己" : "找不到这个玩家";
      return reply.status(400).send({ error: res.error, message });
    }
    return reply.send({ ok: true, blocked: await storage.getChatBlocks(userId) });
  });

  app.post("/chat/report", { config: { rateLimit: REPORT_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    const body = reportBody.parse(req.body ?? {});
    const res = await storage.reportChat({ reporterId: userId, targetUserId: body.targetUserId, reason: body.reason, channel: body.channel, now: new Date() });
    if (!res.ok) {
      if (res.error === "report_limited") return reply.status(429).send({ error: res.error, message: "今天举报次数用完了，明天再试" });
      return reply.status(400).send({ error: res.error, message: res.error === "self" ? "不能举报自己" : "找不到这个玩家" });
    }
    // 重复举报也回「已收到」，不另记一条
    return reply.send({ ok: true });
  });

  /** 管理查看：请求头 x-admin-key 对上 REPORTS_ADMIN_KEY 才给；没配或不对一律 404。 */
  app.get("/admin/chat-reports", { config: { rateLimit: ADMIN_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!adminKeyMatches(req.headers["x-admin-key"], process.env.REPORTS_ADMIN_KEY)) return reply.status(404).send({ error: "not_found" });
    reply.header("cache-control", "no-store");
    const { days, limit } = adminQuery.parse(req.query ?? {});
    const now = new Date();
    await storage.purgeChatReports(now);
    const since = new Date(now.getTime() - days * 24 * 3600_000);
    return reply.send({ keepDays: REPORT_KEEP_DAYS, reports: await storage.listChatReports({ since, limit }) });
  });
}
