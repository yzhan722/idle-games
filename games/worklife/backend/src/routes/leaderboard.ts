import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import type { EnhancedContentPack } from "../types";
import { RANK_BOARDS, rankEntry } from "../leaderboard";

/** 榜单本身有一分钟缓存，这里只防脚本连刷。 */
const LEADERBOARD_ROUTE_LIMIT = { max: 30, timeWindow: "1 minute" };

const query = z.object({ board: z.enum(RANK_BOARDS).default("total") }).strict();

export async function leaderboardRoutes(app: FastifyInstance, storage: Storage, contentPack: EnhancedContentPack) {
  app.get("/leaderboard", { config: { rateLimit: LEADERBOARD_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const { board } = query.parse(req.query ?? {});
    const user = await storage.getUser(userId);
    const state = await storage.getOrCreatePlayerState(userId, contentPack.version || "1.0.0");
    return reply.send(await storage.getLeaderboard({ board, userId, entry: rankEntry(state, user), now: new Date() }));
  });
}
