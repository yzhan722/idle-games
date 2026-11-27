import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { DELETE_CONFIRM_TEXT } from "./account_deletion";
import { defaultCombatSkills } from "./combat_skills";
import { mapThrownError } from "./http_errors";
import { isPublicApiPath } from "./http_public_path";
import { ensurePresetParties, PARTY_BOT_PROFILES } from "./party_bots";
import {
  METRIC_EVENTS,
  METRICS_KEEP_DAYS,
  PRIVACY_DRAFT,
  SESSION_GAP_MS,
  buildReport,
  createRetentionMetrics,
  metricsAvailable,
  metricsKeyMatches,
  milestones,
  sessionBucket,
  statsConsent,
  utcDay,
  type MetricRow,
} from "./retention_metrics";
import { authRoutes, metricsRoutes, progressionRoutes } from "./routes";
import { defaultEnhancedPlayerState } from "./storage";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;
const KEY = "metrics_test_key_at_least_24_characters";
const T0 = Date.parse("2026-11-01T10:00:00.000Z");
const DAY = 24 * 3600_000;
const at = (ms: number) => new Date(T0 + ms);

function mk(over: Partial<{ kills: number; level: number; last: number; shareStats: boolean; prestige: number }> = {}): EnhancedPlayerState {
  const st = defaultEnhancedPlayerState(pack.version);
  st.stats!.firstPlayedAt = at(0).toISOString();
  st.stats!.totalKills = over.kills ?? 0;
  st.combatSkills = defaultCombatSkills(over.level ?? 1);
  st.lastSimulatedAt = at(over.last ?? 0).toISOString();
  st.settings = { soundEnabled: true, animationsEnabled: true, compactMode: false, notificationsEnabled: true, shareStats: over.shareStats };
  if (over.prestige) st.prestige = { count: over.prestige, points: 1, spentPoints: 0, astrolabe: {} } as EnhancedPlayerState["prestige"];
  return st;
}

function tracker(opts: { enabled?: boolean; draft?: boolean } = {}) {
  const written: MetricRow[] = [];
  const t = createRetentionMetrics({
    write: async (rows) => { written.push(...rows); },
    enabled: () => opts.enabled ?? true,
    draft: opts.draft ?? false,
  });
  const count = (event: string) => written.filter((r) => r.event === event).reduce((n, r) => n + r.count, 0);
  return { t, written, count };
}

afterEach(() => {
  delete process.env.METRICS_ADMIN_KEY;
});

describe("匿名统计：默认关", () => {
  it("草案期：没选过就是关；自己开了才算开；正式版默认开、自己能关", () => {
    assert.equal(PRIVACY_DRAFT, true);
    assert.equal(statsConsent(undefined), false);
    assert.equal(statsConsent({}), false);
    assert.equal(statsConsent({ shareStats: true }), true);
    assert.equal(statsConsent({}, false), true);
    assert.equal(statsConsent({ shareStats: false }, false), false);
  });

  it("没配密钥或密钥太短：完全不采集", async () => {
    for (const env of [{}, { METRICS_ADMIN_KEY: "" }, { METRICS_ADMIN_KEY: "short" }]) {
      assert.equal(metricsAvailable(env as NodeJS.ProcessEnv), false);
      assert.equal(metricsKeyMatches("short", env as NodeJS.ProcessEnv), false);
      assert.equal(metricsKeyMatches("", env as NodeJS.ProcessEnv), false);
    }
    const random = "q7Zk2mXw9TfB4sRvL8nYc1Hd";
    assert.equal(metricsAvailable({ METRICS_ADMIN_KEY: random } as NodeJS.ProcessEnv), true);
    const weak = ["a".repeat(40), "ab".repeat(20), " ".repeat(30), "a_long_random_string_of_24_or_more_characters", "change_me_change_me_please_now", "example-key-for-the-metrics-page", "Password12345678901234567890"];
    for (const key of weak) {
      const env = { METRICS_ADMIN_KEY: key } as NodeJS.ProcessEnv;
      assert.equal(metricsAvailable(env), false, key);
      assert.equal(metricsKeyMatches(key, env), false, key);
    }
    assert.equal(metricsAvailable({ METRICS_ADMIN_KEY: random, JWT_SECRET: random } as NodeJS.ProcessEnv), false, "不能和登录签名密钥共用");
    const sample = /# METRICS_ADMIN_KEY=(\S+)/.exec(fs.readFileSync(path.join(__dirname, "../.env.example"), "utf8"))![1];
    assert.equal(metricsAvailable({ METRICS_ADMIN_KEY: sample } as NodeJS.ProcessEnv), false, "照抄示例不算配过");

    const env = { METRICS_ADMIN_KEY: KEY } as NodeJS.ProcessEnv;
    assert.equal(metricsKeyMatches(KEY, env), true);
    for (const bad of [undefined, "", KEY + "x", KEY.slice(0, -1), [KEY], 1]) assert.equal(metricsKeyMatches(bad, env), false);

    const { t, written } = tracker({ enabled: false });
    t.registered(at(0));
    t.observe({ userId: "u", before: mk(), after: mk({ kills: 1, shareStats: true }), now: at(0) });
    await t.flush(at(DAY), true);
    assert.deepEqual(written, []);
  });

  it("草案期没开的玩家：里程碑、时长、注册都不记；中途关掉，正在计的时长也丢掉", async () => {
    const off = tracker({ draft: true });
    off.t.registered(at(0));
    off.t.observe({ userId: "u", before: mk(), after: mk({ kills: 1 }), now: at(0) });
    await off.t.flush(at(DAY), true);
    assert.deepEqual(off.written, []);

    const on = tracker({ draft: true });
    on.t.observe({ userId: "u", before: mk(), after: mk({ kills: 1, shareStats: true }), now: at(0) });
    on.t.observe({ userId: "u", before: mk({ kills: 1 }), after: mk({ kills: 1, shareStats: false }), now: at(60_000) });
    await on.t.flush(at(DAY), true);
    assert.deepEqual(on.written.map((r) => r.event), ["first_battle"], "关掉之前发生的照记，时长不记");
  });
});

describe("匿名统计：事件", () => {
  it("首战、首个 10 级：各只在跨过去那一次；转生后重练不再算", () => {
    assert.deepEqual(milestones(mk(), mk({ kills: 1 }), at(1000)), ["first_battle"]);
    assert.deepEqual(milestones(mk({ kills: 1 }), mk({ kills: 2 }), at(1000)), []);
    assert.deepEqual(milestones(mk({ kills: 5, level: 9 }), mk({ kills: 5, level: 10 }), at(1000)), ["first_level10"]);
    assert.deepEqual(milestones(mk({ kills: 5, level: 10 }), mk({ kills: 5, level: 11 }), at(1000)), []);
    assert.deepEqual(milestones(mk({ kills: 5, level: 9, prestige: 1 }), mk({ kills: 5, level: 10, prestige: 1 }), at(1000)), []);
    const life = mk({ kills: 1 });
    Object.values(life.skills)[0].level = 10;
    assert.deepEqual(milestones(mk({ kills: 1 }), life, at(1000)), ["first_level10"], "生活技能也算");
  });

  it("第 1 / 7 日回访：按首次游玩起的 24 小时算，当天只认第一次", () => {
    const go = (last: number, now: number) => milestones(mk({ last }), mk({ last: now }), at(now));
    assert.deepEqual(go(0, 0.9 * DAY), []);
    assert.deepEqual(go(0.2 * DAY, 1.1 * DAY), ["return_d1"]);
    assert.deepEqual(go(1.1 * DAY, 1.5 * DAY), []);
    assert.deepEqual(go(0.2 * DAY, 2.1 * DAY), [], "第 2 天才回来不算次日");
    assert.deepEqual(go(0.2 * DAY, 7.5 * DAY), ["return_d7"]);
    assert.deepEqual(go(3 * DAY, 7.0 * DAY), ["return_d7"]);
    assert.deepEqual(go(7.1 * DAY, 7.2 * DAY), []);
    assert.deepEqual(go(3 * DAY, 30 * DAY), []);
    const broken = mk();
    broken.lastSimulatedAt = "not a date";
    assert.deepEqual(milestones(broken, mk(), at(DAY * 1.5)), []);
  });

  it("里程碑记在首次游玩那天名下；同一步被两个请求看到只记一次；写出去的内容里没有玩家编号", async () => {
    const { t, written } = tracker();
    const userId = "11111111-2222-3333-4444-555555555555";
    for (let i = 0; i < 3; i++) t.observe({ userId, before: mk({ last: 0.2 * DAY }), after: mk({ last: 0.2 * DAY }), now: at(1.1 * DAY + i) });
    await t.flush(at(1.1 * DAY + 10));
    assert.deepEqual(written, [{ day: "2026-11-01", event: "return_d1", count: 1 }]);
    await t.flush(at(3 * DAY), true);
    for (const row of written) {
      assert.deepEqual(Object.keys(row).sort(), ["count", "day", "event"]);
      assert.match(row.day, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(METRIC_EVENTS.includes(row.event));
    }
    assert.equal(JSON.stringify(written).includes("1111"), false);
  });

  it("在线时长：隔 10 分钟没动静算结束，按六档计；注销的丢掉", async () => {
    assert.deepEqual([0, 59_999, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000, 9e9].map(sessionBucket),
      ["session_0_1", "session_0_1", "session_1_5", "session_5_15", "session_15_30", "session_30_60", "session_60_plus", "session_60_plus"]);
    const { t, written, count } = tracker();
    const see = (userId: string, ms: number) => t.observe({ userId, before: mk({ kills: 1, last: ms }), after: mk({ kills: 1, last: ms }), now: at(ms) });
    for (let m = 0; m <= 20; m++) see("a", m * 60_000);
    see("gone", 0);
    t.forget("gone");
    await t.flush(at(20 * 60_000 + SESSION_GAP_MS));
    assert.deepEqual(written, [], "刚好 10 分钟还不算结束");
    see("a", 20 * 60_000 + SESSION_GAP_MS + 1);
    await t.flush(at(40 * 60_000), true);
    assert.equal(count("session_15_30"), 1, "20 分钟那一段");
    assert.equal(count("session_0_1"), 1, "后面重新开始的一段");
    assert.equal(written.reduce((n, r) => n + r.count, 0), 2);
  });

  it("系统队友不记", async () => {
    const storage = createMemoryStorage();
    const { t, written } = tracker();
    storage.setStateObserver(t.observe);
    await ensurePresetParties(storage, pack);
    await t.flush(new Date(Date.now() + DAY), true);
    assert.deepEqual(written, [], `${PARTY_BOT_PROFILES.length} 个陪练升到 10 级以上也不算`);
    await storage.close();
  });

  it("写库失败：计数留着，下次补上，不重不漏", async () => {
    let fail = true;
    const rows: MetricRow[] = [];
    const t = createRetentionMetrics({ enabled: () => true, draft: false, write: async (r) => { if (fail) throw new Error("db down"); rows.push(...r); } });
    t.registered(at(0));
    await assert.rejects(() => t.flush(at(0)), /db down/);
    t.registered(at(1));
    fail = false;
    await t.flush(at(2));
    assert.deepEqual(rows, [{ day: "2026-11-01", event: "register", count: 2 }]);
    await t.flush(at(3));
    assert.equal(rows.length, 1);
  });
});

describe("匿名统计：汇总", () => {
  it("按天、合计、比例；没过完的批次不进回访率；不认识的事件与早于起点的行忽略", () => {
    const row = (day: string, event: string, count: number) => ({ day, event, count }) as MetricRow;
    const now = new Date("2026-11-20T00:00:00Z");
    const report = buildReport([
      row("2026-10-01", "register", 99),
      row("2026-11-02", "register", 10),
      row("2026-11-02", "first_battle", 8),
      row("2026-11-02", "return_d1", 4),
      row("2026-11-02", "return_d7", 1),
      row("2026-11-19", "register", 10),
      row("2026-11-19", "first_battle", 2),
      row("2026-11-19", "hacked", 5),
    ], "2026-11-01", now);
    assert.deepEqual(report.days.map((d) => d.day), ["2026-11-02", "2026-11-19"]);
    assert.equal(report.totals.register, 20);
    assert.deepEqual(report.rates, { firstBattle: 0.5, level10: 0, day1: 0.4, day7: 0.1 });
    assert.deepEqual(buildReport([], "2026-11-01", now).rates, { firstBattle: null, level10: null, day1: null, day7: null });
  });
});

describe("匿名统计：存储与接口（进程内 inject）", () => {
  async function setup(opts: { persistPath?: string; draft?: boolean } = {}) {
    const storage = createMemoryStorage(opts.persistPath ? { persistPath: opts.persistPath } : undefined);
    const metrics = createRetentionMetrics({ write: (rows, now) => storage.bumpMetrics(rows, now), draft: opts.draft ?? true });
    storage.setStateObserver(metrics.observe);
    const app = Fastify({ logger: false });
    app.setErrorHandler((error, _req, reply) => {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    });
    await app.register(jwt, { secret: "retention_metrics_test_secret_32_chars" });
    await app.register(rateLimit, { max: 1000, timeWindow: "1 minute", errorResponseBuilder: () => ({ error: "rate_limited", statusCode: 429 }) });
    await metricsRoutes(app, storage);
    await authRoutes(app, storage, { registered: metrics.registered, deleted: metrics.forget });
    app.addHook("preHandler", async (req, reply) => {
      if (isPublicApiPath(req.url)) return;
      try {
        (req as any).userId = app.jwt.verify<{ sub: string }>(String(req.headers.authorization).slice(7)).sub;
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    });
    await progressionRoutes(app, storage, pack, { statsOff: metrics.optedOut });
    const admin = (key?: string, q = "") => app.inject({ method: "GET", url: `/admin/metrics${q}`, headers: key ? { "x-admin-key": key } : {} });
    return { storage, metrics, app, admin };
  }

  it("没配密钥 404；配了之后没带、带错也是 404；带对才给数据；参数越界 400；按次数限流", async () => {
    const { storage, app, admin } = await setup();
    try {
      assert.equal((await admin()).statusCode, 404);
      assert.equal((await admin(KEY)).statusCode, 404);
      process.env.METRICS_ADMIN_KEY = KEY;
      assert.equal((await admin()).statusCode, 404);
      const wrong = await admin("wrong_key_that_is_also_long_enough");
      assert.equal(wrong.statusCode, 404);
      assert.deepEqual(wrong.json(), { error: "not_found" });
      const today = utcDay(new Date());
      await storage.bumpMetrics([{ day: today, event: "register", count: 3 }], new Date());
      const ok = await admin(KEY);
      assert.equal(ok.statusCode, 200);
      assert.equal(ok.json().totals.register, 3);
      assert.equal((await admin(KEY, "?days=0")).statusCode, 400);
      assert.equal((await admin(KEY, `?days=${METRICS_KEEP_DAYS + 1}`)).statusCode, 400);
      assert.equal((await admin(KEY, "?user=1")).statusCode, 400);
      let last = 0;
      for (let i = 0; i < 5; i++) last = (await admin("guess")).statusCode;
      assert.equal(last, 429, "一分钟最多试 10 次");
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("注册 → 设置里打开 → 打赢第一场：草案期只有打开之后的才进表；注销不影响已汇总的人数", async () => {
    process.env.METRICS_ADMIN_KEY = KEY;
    const { storage, metrics, app, admin } = await setup();
    try {
      const reg = (await app.inject({ method: "POST", url: "/auth/register", payload: { username: "stats_player", password: "correct horse" } })).json() as { userId: string; token: string };
      const auth = { authorization: `Bearer ${reg.token}` };
      const before = (await app.inject({ method: "GET", url: "/progression/settings", headers: auth })).json();
      assert.deepEqual(before.stats, { available: true, on: false });
      await storage.executePlayerCommand({ userId: reg.userId, now: new Date(), contentPack: pack, apply: (s) => { s.stats!.totalKills = 0; return {}; } });
      const on = (await app.inject({ method: "POST", url: "/progression/settings", headers: auth, payload: { shareStats: true } })).json();
      assert.equal(on.settings.shareStats, true);
      await storage.executePlayerCommand({ userId: reg.userId, now: new Date(), contentPack: pack, apply: (s) => { s.stats!.totalKills = 1; return {}; } });
      const after = (await app.inject({ method: "POST", url: "/progression/settings", headers: auth, payload: { soundEnabled: false } })).json();
      assert.equal(after.settings.shareStats, true, "改别的设置不会把它改掉");
      await metrics.flush(new Date(), true);
      const totals = (await admin(KEY)).json().totals;
      assert.deepEqual([totals.register, totals.first_battle, totals.session_0_1], [0, 1, 1]);
      assert.equal((await app.inject({ method: "POST", url: "/auth/account/delete", headers: auth, payload: { password: "correct horse" } })).statusCode, 200);
      assert.equal((await admin(KEY)).json().totals.first_battle, 1);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("在设置里关掉就马上停：之后没有别的请求，正在计的时长也不会再写进库", async () => {
    process.env.METRICS_ADMIN_KEY = KEY;
    const { storage, metrics, app, admin } = await setup();
    try {
      const reg = (await app.inject({ method: "POST", url: "/auth/register", payload: { username: "stats_player3", password: "correct horse" } })).json() as { userId: string; token: string };
      const auth = { authorization: `Bearer ${reg.token}` };
      const set = (shareStats: boolean) => app.inject({ method: "POST", url: "/progression/settings", headers: auth, payload: { shareStats } });
      const play = () => storage.executePlayerCommand({ userId: reg.userId, now: new Date(), contentPack: pack, apply: () => ({}) });
      await set(true);
      await play();
      await set(false);
      await metrics.flush(new Date(Date.now() + DAY), true);
      const totals = (await admin(KEY)).json().totals as Record<string, number>;
      assert.equal(Object.values(totals).reduce((a, b) => a + b, 0), 0);
      await set(true);
      await play();
      await metrics.flush(new Date(Date.now() + DAY), true);
      assert.equal((await admin(KEY)).json().totals.session_0_1, 1, "再打开从头计");
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("试密钥按 IP 计数：换着带登录凭证也绕不过；结果不许缓存", async () => {
    process.env.METRICS_ADMIN_KEY = KEY;
    const { storage, app } = await setup();
    try {
      const ok = await app.inject({ method: "GET", url: "/admin/metrics", headers: { "x-admin-key": KEY } });
      assert.equal(ok.headers["cache-control"], "no-store");
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) {
        const guest = app.jwt.sign({ sub: `guest-${i}` });
        codes.push((await app.inject({ method: "GET", url: "/admin/metrics", headers: { "x-admin-key": `guess-${i}`, authorization: `Bearer ${guest}` } })).statusCode);
      }
      assert.equal(codes.at(-1), 429);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("正式版默认参与：游客与账号注册各记一次，重新登录不记", async () => {
    process.env.METRICS_ADMIN_KEY = KEY;
    const { storage, metrics, app, admin } = await setup({ draft: false });
    try {
      const guest = (await app.inject({ method: "POST", url: "/auth/guest", payload: {} })).json() as { resumeToken: string; token: string };
      await app.inject({ method: "POST", url: "/auth/guest", payload: { resumeToken: guest.resumeToken } });
      const account = { username: "stats_player2", password: "correct horse" };
      await app.inject({ method: "POST", url: "/auth/register", payload: account });
      await app.inject({ method: "POST", url: "/auth/register", payload: account });
      await app.inject({ method: "POST", url: "/auth/login", payload: account });
      await metrics.flush(new Date(), true);
      assert.equal((await admin(KEY)).json().totals.register, 2);
      const gone = await app.inject({ method: "POST", url: "/auth/account/delete", headers: { authorization: `Bearer ${guest.token}` }, payload: { confirmText: DELETE_CONFIRM_TEXT } });
      assert.equal(gone.statusCode, 200);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("文件存储重启后还在；超过保留天数的清掉；旧快照没有这一项也能读", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worklife-metrics-"));
    const file = path.join(dir, "mem.json");
    const now = new Date();
    const oldDay = utcDay(new Date(now.getTime() - (METRICS_KEEP_DAYS + 2) * DAY));
    try {
      let storage = createMemoryStorage({ persistPath: file });
      await storage.bumpMetrics([{ day: utcDay(now), event: "register", count: 2 }, { day: oldDay, event: "register", count: 9 }], now);
      await storage.close();
      storage = createMemoryStorage({ persistPath: file });
      assert.deepEqual(await storage.readMetrics({ since: "2000-01-01" }), [{ day: utcDay(now), event: "register", count: 2 }]);
      await storage.close();
      const snap = JSON.parse(fs.readFileSync(file, "utf8"));
      delete snap.metricsDaily;
      fs.writeFileSync(file, JSON.stringify(snap));
      storage = createMemoryStorage({ persistPath: file });
      assert.deepEqual(await storage.readMetrics({ since: "2000-01-01" }), []);
      await storage.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("观察者抛错不影响存档", async () => {
    const storage = createMemoryStorage();
    storage.setStateObserver(() => { throw new Error("boom"); });
    const user = await storage.createGuestUser();
    const st = await storage.getOrCreatePlayerState(user.id, pack.version);
    const original = console.error;
    console.error = () => undefined;
    try {
      assert.ok(await storage.simulateToNow({ userId: user.id, state: st, now: new Date(), contentPack: pack }));
    } finally {
      console.error = original;
      await storage.close();
    }
  });

  it("迁移、schema、init 三处一致，表里没有玩家列", () => {
    for (const p of ["database/migrations/006_metrics_daily.sql", "database/schema.sql", "src/storage_pg.ts"]) {
      const src = fs.readFileSync(path.join(__dirname, "..", p), "utf8");
      const block = /CREATE TABLE IF NOT EXISTS metrics_daily \(([\s\S]*?)\n\s*\)/.exec(src)?.[1];
      assert.ok(block, p);
      assert.deepEqual(block!.split("\n").map((l) => l.trim().split(/\s+/)[0]).filter(Boolean), ["day", "event", "count", "PRIMARY"], p);
    }
  });
});
