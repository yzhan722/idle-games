import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import {
  CIRCLE_ACTIONS,
  CIRCLE_ERROR_TEXT,
  CIRCLE_NAME_MAX,
  CIRCLE_READ_LIMIT,
  CIRCLE_SEARCH_LIMIT,
  CIRCLE_TARGET_ACTIONS,
  CIRCLE_WRITE_LIMIT,
  type CircleOutcome,
} from "../circle";

const operationId = z.string().min(1).max(128).optional();
const createBody = z.object({ name: z.string().max(CIRCLE_NAME_MAX * 4), operationId }).strict();
const actionBody = z
  .object({
    action: z.enum(CIRCLE_ACTIONS),
    circleId: z.string().uuid().optional(),
    targetUserId: z.string().uuid().optional(),
    operationId,
  })
  .strict();
const searchQuery = z.object({ q: z.string().max(CIRCLE_NAME_MAX * 4).default("") }).strict();

/** 同好会（circle.ts）。写操作带 operationId 时断网重试只执行一次；成败都回最新的「我的同好会」。 */
export async function circleRoutes(app: FastifyInstance, storage: Storage) {
  const userIdOf = (req: FastifyRequest) => (req as any).userId as string | undefined;
  /** 回执里只存成败，不存别人的编号。 */
  const brief = (o: CircleOutcome) => (o.ok ? { ok: true as const } : { ok: false as const, error: o.error });

  const answer = async (reply: FastifyReply, userId: string, result: { ok: boolean; error?: string }) => {
    const home = await storage.getCircleHome({ userId, now: new Date() });
    if (!result.ok) {
      const code = result.error as keyof typeof CIRCLE_ERROR_TEXT;
      return reply.status(400).send({ error: code, message: CIRCLE_ERROR_TEXT[code] ?? "操作失败", home });
    }
    return reply.send({ ok: true, home });
  };

  app.get("/circle", { config: { rateLimit: CIRCLE_READ_LIMIT } }, async (req, reply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send({ ok: true, home: await storage.getCircleHome({ userId, now: new Date() }) });
  });

  /** 团榜：会名与成员总等级之和（只算能上真人榜的成员），缓存与名次规则同真人榜。 */
  app.get("/circle/board", { config: { rateLimit: CIRCLE_READ_LIMIT } }, async (req, reply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send(await storage.getCircleBoard({ userId, now: new Date() }));
  });

  app.get("/circle/search", { config: { rateLimit: CIRCLE_READ_LIMIT } }, async (req, reply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const { q } = searchQuery.parse(req.query ?? {});
    return reply.send({ ok: true, circles: await storage.searchCircles({ query: q, limit: CIRCLE_SEARCH_LIMIT }) });
  });

  app.post("/circle/create", { config: { rateLimit: CIRCLE_WRITE_LIMIT } }, async (req, reply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = createBody.parse(req.body ?? {});
    const { result } = await storage.deduplicateOperation({
      userId,
      operationId: body.operationId,
      operationPayload: { route: "circle/create", name: body.name },
      run: async () => brief(await storage.createCircle({ userId, name: body.name, now: new Date() })),
    });
    return answer(reply, userId, result);
  });

  app.post("/circle/action", { config: { rateLimit: CIRCLE_WRITE_LIMIT } }, async (req, reply) => {
    const userId = userIdOf(req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = actionBody.parse(req.body ?? {});
    if (CIRCLE_TARGET_ACTIONS.includes(body.action) && !body.targetUserId) {
      return reply.status(400).send({ error: "user_not_found", message: CIRCLE_ERROR_TEXT.user_not_found });
    }
    if ((body.action === "apply" || body.action === "accept" || body.action === "decline" || body.action === "cancel_apply") && !body.circleId) {
      return reply.status(400).send({ error: "circle_not_found", message: CIRCLE_ERROR_TEXT.circle_not_found });
    }
    const { operationId: opId, ...payload } = body;
    const { result } = await storage.deduplicateOperation({
      userId,
      operationId: opId,
      operationPayload: { route: "circle/action", ...payload },
      run: async () => brief(await storage.circleAction({ userId, ...payload, now: new Date() })),
    });
    return answer(reply, userId, result);
  });
}
