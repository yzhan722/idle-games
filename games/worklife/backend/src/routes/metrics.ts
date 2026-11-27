import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import { METRICS_KEEP_DAYS, buildReport, metricsKeyMatches, utcDay } from "../retention_metrics";

/** 按 IP 限次，防止试密钥；全局限流对登录用户按账号计数，多开几个游客号就能绕过，这里单独按 IP。 */
const METRICS_ROUTE_LIMIT = { max: 10, timeWindow: "1 minute", keyGenerator: (req: FastifyRequest) => `metrics:${req.ip}` };

const query = z.object({ days: z.coerce.number().int().min(1).max(METRICS_KEEP_DAYS).default(30) }).strict();

/** 留存统计的管理接口：请求头 x-admin-key 对上 METRICS_ADMIN_KEY 才给；没配或不对一律 404。 */
export async function metricsRoutes(app: FastifyInstance, storage: Storage) {
  app.get("/admin/metrics", { config: { rateLimit: METRICS_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!metricsKeyMatches(req.headers["x-admin-key"])) return reply.status(404).send({ error: "not_found" });
    reply.header("cache-control", "no-store");
    const { days } = query.parse(req.query ?? {});
    const now = new Date();
    const since = utcDay(new Date(now.getTime() - (days - 1) * 24 * 3600_000));
    return reply.send(buildReport(await storage.readMetrics({ since }), since, now));
  });
}
