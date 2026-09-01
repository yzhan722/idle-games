import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Storage } from "../storage";

export async function authRoutes(app: FastifyInstance, storage: Storage) {
  app.post("/auth/guest", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({ deviceId: z.string().min(1).optional() })
      .parse((req.body ?? {}) as unknown);

    const deviceId = body.deviceId ?? `guest_${randomUUID()}`;
    const user = await storage.findOrCreateGuestUser(deviceId);
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });

    return reply.send({ userId: user.id, token });
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
