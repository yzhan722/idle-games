import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { Storage } from "../storage";
import { hashGuestResumeToken, newGuestResumeToken } from "../guest_resume";

const guestBody = z.object({
  deviceId: z.string().min(1).optional(),
  resumeToken: z.string().min(1).optional(),
});

function sessionToken(app: FastifyInstance, userId: string) {
  return app.jwt.sign({ sub: userId }, { expiresIn: "30d" });
}

async function userIdFromBearer(app: FastifyInstance, req: FastifyRequest): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = app.jwt.verify<{ sub: string }>(auth.slice("Bearer ".length));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function authRoutes(app: FastifyInstance, storage: Storage) {
  app.post("/auth/guest", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = guestBody.parse((req.body ?? {}) as unknown);

    if (body.resumeToken) {
      const user = await storage.findUserByResumeTokenHash(hashGuestResumeToken(body.resumeToken));
      if (!user || user.googleSub) {
        return reply.status(401).send({ error: "invalid_guest_resume_token" });
      }
      return reply.send({
        userId: user.id,
        token: sessionToken(app, user.id),
        resumeToken: body.resumeToken,
      });
    }

    // deviceId is accepted for old clients and is not a recovery key.
    const user = await storage.createGuestUser();
    const resumeToken = newGuestResumeToken();
    await storage.setGuestResumeTokenHash(user.id, hashGuestResumeToken(resumeToken));
    return reply.send({
      userId: user.id,
      token: sessionToken(app, user.id),
      resumeToken,
    });
  });

  app.post("/auth/guest/resume-token", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await userIdFromBearer(app, req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });
    if (user.googleSub) return reply.status(403).send({ error: "guest_resume_unavailable" });
    const resumeToken = newGuestResumeToken();
    await storage.setGuestResumeTokenHash(user.id, hashGuestResumeToken(resumeToken));
    return reply.send({
      userId: user.id,
      token: sessionToken(app, user.id),
      resumeToken,
    });
  });

  app.post("/auth/bind/google", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    
    const body = z
      .object({ googleSub: z.string().min(1) })
      .parse((req.body ?? {}) as unknown);

    await storage.bindGoogle(userId, body.googleSub);
    const token = app.jwt.sign({ sub: userId, google: true }, { expiresIn: "30d" });

    return reply.send({ userId, token });
  });
}
