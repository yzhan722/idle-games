import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Storage } from "../storage";
import { UsernameTaken } from "../storage";
import { hashGuestResumeToken, newGuestResumeToken } from "../guest_resume";
import type { UserRecord } from "../types";

const guestBody = z.object({
  deviceId: z.string().min(1).optional(),
  resumeToken: z.string().min(1).optional(),
}).strict();

const accountBody = z.object({
  username: z
    .string()
    .trim()
    .min(1, "username_too_short")
    .max(32, "username_too_long")
    .refine((u) => !/[\u0000-\u001F\u007F]/.test(u), "username_invalid"),
  // 允许含空格的真实密码，但整串空白不算密码
  password: z
    .string()
    .min(4, "password_too_short")
    .max(72, "password_too_long")
    .refine((p) => p.trim().length > 0, "password_blank"),
}).strict();

function parseAccountInput(raw: unknown, reply: FastifyReply): { username: string; password: string } | null {
  const parsed = accountBody.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const msg = issue?.message || "invalid_request";
  if (msg === "username_too_short" || msg === "username_too_long" || msg === "username_invalid") {
    reply.status(400).send({ error: "username_invalid", message: "账号名长度需为 1-32 个字符" });
    return null;
  }
  if (msg === "password_too_short" || msg === "password_too_long" || msg === "password_blank") {
    reply.status(400).send({ error: "password_invalid", message: "密码长度至少需要 4 位字符" });
    return null;
  }
  reply.status(400).send({ error: "invalid_request", message: "请输入有效的账号和密码" });
  return null;
}

const googleIdTokenBody = z.object({
  idToken: z.string().min(1).max(8192),
}).strict();

/** scrypt$N$r$p$salt$hash —— 无外部依赖的口令散列 */
function hashPassword(password: string): string {
  const N = 16384, r = 8, p = 1;
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const calc = scryptSync(password, salt, 64, { N: +n, r: +r, p: +p });
  const expect = Buffer.from(hash, "hex");
  return calc.length === expect.length && timingSafeEqual(calc, expect);
}

/** 登录时对不存在用户做等时校验用的合法散列（对应随机口令，永远验不过） */
const DUMMY_PASSWORD_HASH = `scrypt$16384$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;

type GoogleVerifyResult =
  | { ok: true; sub: string }
  | { ok: false; reason: "not_configured" | "invalid_token" };

/**
 * 用 Google tokeninfo 端点验签 idToken 并核对 aud。
 * 未配置 GOOGLE_CLIENT_ID 时绝不相信客户端自报的 sub（旧实现就是裸信 → 假认证）。
 */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleVerifyResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return { ok: false, reason: "invalid_token" };
    const data = (await res.json()) as { aud?: string; sub?: string; exp?: string };
    if (data.aud !== clientId || !data.sub) return { ok: false, reason: "invalid_token" };
    if (data.exp && Number(data.exp) * 1000 < Date.now()) return { ok: false, reason: "invalid_token" };
    return { ok: true, sub: String(data.sub) };
  } catch {
    return { ok: false, reason: "invalid_token" };
  }
}

function sessionToken(app: FastifyInstance, user: Pick<UserRecord, "id" | "authVersion">) {
  return app.jwt.sign({ sub: user.id, av: user.authVersion ?? 1 }, { expiresIn: "30d" });
}

async function userIdFromBearer(app: FastifyInstance, storage: Storage, req: FastifyRequest): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = app.jwt.verify<{ sub: string; av?: number }>(auth.slice("Bearer ".length));
    if (!payload.sub) return null;
    const user = await storage.getUser(payload.sub);
    if (!user || payload.av !== (user.authVersion ?? 1)) return null;
    return user.id;
  } catch {
    return null;
  }
}

/** 认证接口单独限流：注册/登录是刷号和爆破面 */
const AUTH_ROUTE_LIMIT = { max: 20, timeWindow: "1 minute" };

export async function authRoutes(app: FastifyInstance, storage: Storage) {
  app.post("/auth/guest", { config: { rateLimit: AUTH_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = guestBody.parse((req.body ?? {}) as unknown);

    if (body.resumeToken) {
      const user = await storage.findUserByResumeTokenHash(hashGuestResumeToken(body.resumeToken));
      if (!user || user.googleSub) {
        return reply.status(401).send({ error: "invalid_guest_resume_token" });
      }
      return reply.send({
        userId: user.id,
        token: sessionToken(app, user),
        resumeToken: body.resumeToken,
      });
    }

    // deviceId is accepted for old clients and is not a recovery key.
    const user = await storage.createGuestUser();
    const resumeToken = newGuestResumeToken();
    await storage.setGuestResumeTokenHash(user.id, hashGuestResumeToken(resumeToken));
    return reply.send({
      userId: user.id,
      token: sessionToken(app, user),
      resumeToken,
    });
  });

  app.post("/auth/guest/resume-token", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await userIdFromBearer(app, storage, req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });
    if (user.googleSub) return reply.status(403).send({ error: "guest_resume_unavailable" });
    const resumeToken = newGuestResumeToken();
    await storage.setGuestResumeTokenHash(user.id, hashGuestResumeToken(resumeToken));
    return reply.send({
      userId: user.id,
      token: sessionToken(app, user),
      resumeToken,
    });
  });

  /** 登出即吊销：此后所有已签发 JWT（含本请求的）失效 */
  app.post("/auth/logout", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await userIdFromBearer(app, storage, req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    await storage.invalidateSessions(userId);
    return reply.send({ ok: true });
  });

  /** 查询当前登录账号信息 */
  app.get("/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await userIdFromBearer(app, storage, req);
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return reply.status(401).send({ error: "Unauthorized" });
    return reply.send({ userId: user.id, username: user.username ?? null });
  });

  /** Google 登录：验签 idToken → 按 sub 找已绑定账号 */
  app.post("/auth/google", { config: { rateLimit: AUTH_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = googleIdTokenBody.parse((req.body ?? {}) as unknown);
    const verified = await verifyGoogleIdToken(body.idToken);
    if (!verified.ok) {
      return reply.status(verified.reason === "not_configured" ? 501 : 401).send({
        error: verified.reason === "not_configured" ? "google_not_configured" : "invalid_google_token",
        message: verified.reason === "not_configured" ? "服务端未配置 Google 登录" : undefined,
      });
    }
    const user = await storage.findUserByGoogleSub(verified.sub);
    if (!user) return reply.status(404).send({ error: "google_not_bound", message: "该 Google 账号尚未绑定游戏账号" });
    return reply.send({ userId: user.id, token: sessionToken(app, user) });
  });

  app.post("/auth/bind/google", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const body = googleIdTokenBody.parse((req.body ?? {}) as unknown);
    const verified = await verifyGoogleIdToken(body.idToken);
    if (!verified.ok) {
      return reply.status(verified.reason === "not_configured" ? 501 : 401).send({
        error: verified.reason === "not_configured" ? "google_not_configured" : "invalid_google_token",
        message: verified.reason === "not_configured" ? "服务端未配置 Google 登录" : undefined,
      });
    }

    try {
      await storage.bindGoogle(userId, verified.sub);
    } catch (error) {
      if (error instanceof Error && error.message === "google_sub_already_bound") {
        return reply.status(409).send({ error: "google_sub_already_bound", message: "该 Google 账号已绑定其他账号" });
      }
      throw error;
    }
    // bindGoogle 已递增 authVersion，重读用户签发新会话（本请求的旧 token 即刻失效）
    const user = await storage.getUser(userId);
    const token = sessionToken(app, user!);
    return reply.send({ userId, token });
  });

  // ---- 账号密码：注册 / 登录 / 给现有账号补绑 ----
  app.post("/auth/register", { config: { rateLimit: AUTH_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = parseAccountInput(req.body, reply);
    if (!body) return;
    try {
      const user = await storage.createPasswordUser(body.username, hashPassword(body.password));
      return reply.send({ userId: user.id, token: sessionToken(app, user), username: user.username });
    } catch (error) {
      if (error instanceof UsernameTaken) {
        // 如果玩家在注册页输入了自己已注册的账号和正确密码，直接幂等登录进入游戏
        const existing = await storage.findUserByUsername(body.username);
        if (existing && verifyPassword(body.password, existing.passwordHash)) {
          return reply.send({ userId: existing.id, token: sessionToken(app, existing), username: existing.username });
        }
        return reply.status(409).send({ error: "username_taken", message: "该账号名已被注册，请直接登录或更换账号名" });
      }
      throw error;
    }
  });

  app.post("/auth/login", { config: { rateLimit: AUTH_ROUTE_LIMIT } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = parseAccountInput(req.body, reply);
    if (!body) return;
    const user = await storage.findUserByUsername(body.username);
    // 用户不存在时也跑一次 scrypt，避免用响应时差探测用户名是否存在
    const stored = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    if (!verifyPassword(body.password, stored)) {
      if (!user) {
        return reply.status(401).send({ error: "user_not_found", message: "该账号尚未注册，请先切换到「注册账号」创建" });
      }
      return reply.status(401).send({ error: "invalid_credentials", message: "密码不正确，请检查密码后重试" });
    }
    return reply.send({ userId: user!.id, token: sessionToken(app, user!), username: user!.username });
  });

  app.post("/auth/bind/password", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = (req as any).userId as string;
    if (!userId) return reply.status(401).send({ error: "Unauthorized" });
    const body = parseAccountInput(req.body, reply);
    if (!body) return;
    // 已绑定账号的用户不得再绑第二个用户名——此前可无限换绑，
    // 同一账号挂多个登录名且旧名悬空，账号体系变成一对多。
    const current = await storage.getUser(userId);
    if (current?.username) return reply.status(409).send({ error: "already_bound", message: "账号已绑定用户名，如需更换请先解绑" });
    try {
      await storage.bindPassword(userId, body.username, hashPassword(body.password));
    } catch (error) {
      if (error instanceof UsernameTaken) return reply.status(409).send({ error: "username_taken", message: "该账号名已被占用" });
      throw error;
    }
    // 绑定吊销了旧会话（authVersion++），必须发新 token，否则绑定请求就是该会话的绝唱；
    // 同时轮换游客恢复 token，旧设备上的 resumeToken 不再能绕过密码直登。
    const user = await storage.getUser(userId);
    const resumeToken = newGuestResumeToken();
    await storage.setGuestResumeTokenHash(userId, hashGuestResumeToken(resumeToken));
    return reply.send({ ok: true, userId, username: body.username, token: sessionToken(app, user!), resumeToken });
  });
}
