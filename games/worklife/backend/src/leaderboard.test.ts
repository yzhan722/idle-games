import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { defaultCombatSkills, totalLevelOf } from "./combat_skills";
import { mapThrownError } from "./http_errors";
import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_TTL_MS,
  SYSTEM_DEVICES,
  countHigher,
  createRankCache,
  isSystemAccount,
  rankEntry,
  rankName,
  rankScores,
  scoreLabel,
  sortRows,
  withRanks,
  zoneLabel,
  zoneScore,
  type RankRow,
} from "./leaderboard";
import { MARKET_NPC_DEVICE_ID } from "./market_presets";
import { PARTY_BOT_PROFILES, ensurePresetParties } from "./party_bots";
import { canonicalName, isPlainDisplayName, isReservedName, maskAccountName } from "./display_name";
import { doPrestige } from "./progression2";
import { leaderboardRoutes, progressionRoutes } from "./routes";
import { defaultEnhancedPlayerState } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import { OPEN_ZONE_IDS } from "./zones";

const pack = packJson as unknown as EnhancedContentPack;
const guest = { guestDeviceId: "guest_11111111-1111-1111-1111-111111111111" };

function mk(name: string | undefined, level = 1): EnhancedPlayerState {
  const st = defaultEnhancedPlayerState(pack.version);
  st.settings = { soundEnabled: true, animationsEnabled: true, compactMode: false, notificationsEnabled: true, ...(name ? { playerName: name } : {}) };
  st.combatSkills = defaultCombatSkills(level);
  st.combatLevel = level;
  return st;
}

describe("真人榜：上榜条件", () => {
  it("只列起过名字的；默认名、编号样的名字、控制符、标签字符都不列", () => {
    assert.equal(rankName(mk("砍柴的阿福")), "砍柴的阿福");
    assert.equal(rankName(mk("  阿福  ")), "阿福");
    for (const bad of [undefined, "", "   ", "玩家_a1b2c3", "deadbeef", "guest_12", "player-7", "<b>阿福</b>", "阿‮福", "阿\u0007福", "阿\"福", "一二三四五六七八九十一二三四五六七"]) {
      assert.equal(rankName(mk(bad)), null, JSON.stringify(bad));
    }
    assert.equal(rankEntry(mk(undefined), guest), "no_name");
  });

  it("系统账号不列：组队陪练、市场补给站；真人的设备名不会撞上", () => {
    for (const bot of PARTY_BOT_PROFILES) assert.equal(isSystemAccount({ guestDeviceId: bot.deviceId }), true, bot.deviceId);
    assert.equal(isSystemAccount({ guestDeviceId: "party_bot_extra_3" }), true);
    assert.equal(isSystemAccount({ guestDeviceId: MARKET_NPC_DEVICE_ID }), true);
    assert.equal(SYSTEM_DEVICES.exact, MARKET_NPC_DEVICE_ID);
    assert.equal(isSystemAccount(guest), false);
    assert.equal(isSystemAccount({ guestDeviceId: null }), false);
    assert.equal(rankEntry(mk("村口砍树王", 6), { guestDeviceId: "party_bot_wood" }), "excluded");
    assert.equal(rankEntry(mk("阿福"), null), "excluded");
  });

  it("数值不合法不列：等级越界、小数、负数、NaN、经验无穷、最高记录越界", () => {
    const breakers: Array<(s: EnhancedPlayerState) => void> = [
      (s) => { s.combatSkills!.melee.level = 201; },
      (s) => { s.combatSkills!.melee.level = -3; },
      (s) => { s.combatSkills!.melee.level = 3.5; },
      (s) => { s.combatSkills!.attack.xp = Number.POSITIVE_INFINITY; },
      (s) => { s.combatSkills!.attack.xp = -1; },
      (s) => { Object.values(s.skills)[0].level = Number.NaN; },
      (s) => { (Object.values(s.skills)[0] as { level: unknown }).level = "99"; },
      (s) => { s.combatLevel = 999; },
      (s) => { s.stats!.highestCombatLevel = 100_000; },
      (s) => { s.stats!.bestTotalLevel = 1e9; },
    ];
    for (const [i, broken] of breakers.entries()) {
      const st = mk("阿福", 10);
      broken(st);
      assert.equal(rankScores(st), null, `第 ${i} 种`);
      assert.equal(rankEntry(st, guest), "excluded");
    }
  });

  it("旧存档：没有 combatSkills / bestTotalLevel / zoneTierKills 也能算", () => {
    const st = mk("阿福");
    delete (st as { combatSkills?: unknown }).combatSkills;
    st.combatLevel = 12;
    st.stats!.highestCombatLevel = 5;
    const scores = rankScores(st)!;
    assert.equal(scores.combat, 12);
    assert.equal(scores.total, Object.values(st.skills).reduce((n, s) => n + (s.level || 1), 0) + 12 * 7);
    assert.equal(scores.zone, 0);
  });
});

describe("真人榜：分数", () => {
  it("总等级与顶栏同一算法；战斗等级取历史最高", () => {
    const st = mk("阿福", 20);
    assert.equal(rankScores(st)!.total, totalLevelOf(st));
    assert.equal(rankScores(st)!.combat, 20);
    st.stats!.highestCombatLevel = 33;
    assert.equal(rankScores(st)!.combat, 33);
    const header = fs.readFileSync(path.join(__dirname, "../../frontend/src/components/NewGameInterface.tsx"), "utf8");
    assert.match(header, /Number\(s\?\.level \|\| 1\)/, "顶栏的总等级算法变了就要同步 totalLevelOf");
  });

  it("转生不掉榜：转生前的总等级、战斗等级留着", () => {
    const st = mk("阿福", 80);
    for (const s of Object.values(st.skills)) s.level = 60;
    st.stats!.highestCombatLevel = 80;
    const before = rankScores(st)!;
    assert.equal(doPrestige(st).ok, true);
    const after = rankScores(st)!;
    assert.equal(st.combatLevel, 1);
    assert.deepEqual([after.total, after.combat], [before.total, before.combat]);
    for (const s of Object.values(st.skills)) s.level = 1;
    assert.equal(rankScores(st)!.total, before.total);
  });

  it("最远区域：先比区域再比难度档，按击杀算", () => {
    const st = mk("阿福");
    const stage = (id: string) => pack.stages.find((s) => s.id === id)!;
    const kill = (id: string) => ((st.stats!.killsByMonster[(stage(id) as { monsters: string[] }).monsters[0]] = 1));
    assert.equal(zoneLabel(0), "还没出发");
    kill("forest");
    assert.equal(rankScores(st)!.zone, zoneScore(0, 0));
    st.stats!.zoneTierKills = { forest: [5, 2] };
    assert.equal(rankScores(st)!.zone, zoneScore(0, 2));
    assert.equal(zoneLabel(rankScores(st)!.zone), `${(stage("forest") as { name: string }).name} · 噩梦`);
    kill("mine");
    assert.equal(rankScores(st)!.zone, zoneScore(1, 0), "下一个区域的普通档高过上一个区域的噩梦档");
    assert.equal(zoneLabel(zoneScore(1, 0)), (stage("mine") as { name: string }).name);
    const last = OPEN_ZONE_IDS.length - 1;
    kill(OPEN_ZONE_IDS[last]);
    assert.equal(rankScores(st)!.zone, zoneScore(last, 0));
    assert.equal(scoreLabel("combat", 7), "7 级");
  });

  it("排序、同分同名次、二分计数", () => {
    const rows: RankRow[] = sortRows([
      { userId: "c", name: "丙", score: 5 },
      { userId: "a", name: "甲", score: 9 },
      { userId: "d", name: "丁", score: 1 },
      { userId: "b", name: "乙", score: 5 },
    ]);
    assert.deepEqual(rows.map((r) => r.userId), ["a", "b", "c", "d"]);
    assert.deepEqual(withRanks(rows).map((r) => r.rank), [1, 2, 2, 4]);
    for (const s of [0, 1, 4, 5, 8, 9, 10]) assert.equal(countHigher(rows, s), rows.filter((r) => r.score > s).length);
    assert.equal(countHigher([], 3), 0);
  });
});

describe("名字规则：注入、看不见的字、冒充、打码", () => {
  const cp = (...codes: number[]) => String.fromCodePoint(...codes);
  it("看不见的字、残缺代理对、私用区、行段分隔、叠字符、反斜杠都不收；正常的中日泰文和表情照收", () => {
    const bad = [
      cp(0x3164), cp(0x3164) + "阿福", "阿" + cp(0x2800) + "福", cp(0xffa0), cp(0x115f), "阿" + cp(0x2028) + "福", "阿" + cp(0xd800), cp(0xe000) + "福",
      "阿" + cp(0x200b) + "福", "a" + cp(0x301, 0x302, 0x303, 0x304), cp(0x301, 0x302), "阿\\福", "阿/福", "阿`福", "a&lt<", " ", "",
    ];
    for (const name of bad) assert.equal(isPlainDisplayName(name), false, JSON.stringify(name));
    for (const ok of ["砍柴的阿福", "ゆきの", "ที่รัก", "Zoë", "小明" + cp(0x1f431), "a", "阿福 二号"]) assert.equal(isPlainDisplayName(ok), true, ok);
  });

  it("系统账号、官方口吻的名字不收，换全角、空格、标点也不行；只是包含这些字的不算", () => {
    for (const name of ["商会补给站", "商会 补给站", "商会·补给站", "★商会补给站★", "系统", "ＧＭ", "Admin", "管理员", PARTY_BOT_PROFILES[0].name, `${PARTY_BOT_PROFILES[0].name}！`]) {
      assert.equal(isReservedName(name), true, name);
      assert.equal(rankName(mk(name)), null, name);
    }
    for (const name of ["商会补给站的常客", "不是系统", "gmx", "★★★"]) assert.equal(isReservedName(name), false, name);
    assert.equal(rankName(mk("ｐｌａｙｅｒ＿１２３")), null, "全角的默认名也不列");
  });

  it("名字等于登录账号名：大小写、全半角、空格不同也算，榜上只露第一个字；不同的照常", () => {
    assert.equal(canonicalName(" Ａlice 01"), "alice01");
    assert.equal(maskAccountName("alice01", "Alice01"), "a＊＊");
    assert.equal(maskAccountName("ａｌｉｃｅ０１", "alice01"), "ａ＊＊");
    assert.equal(maskAccountName("a", "A"), "＊＊", "账号名只有一个字就全遮");
    assert.equal(maskAccountName("阿福", "alice01"), "阿福");
    assert.equal(maskAccountName("阿福", null), "阿福");
    const st = mk("alice01", 5);
    assert.equal((rankEntry(st, { guestDeviceId: null, username: "alice01" }) as { name: string }).name, "a＊＊");
    assert.equal(st.settings!.playerName, "alice01", "只影响展示，存档不动");
    assert.equal(rankName(st), "alice01");
  });
});

describe("真人榜：缓存与节流", () => {
  function counting() {
    const calls = { top: 0, count: 0 };
    let fail = false;
    const source = {
      async top() { calls.top += 1; if (fail) throw new Error("db down"); return [{ userId: "u1", name: "甲", score: 5 }]; },
      async countAbove() { calls.count += 1; return 3; },
    };
    return { calls, source, setFail: (v: boolean) => { fail = v; } };
  }
  const entry = { name: "乙", total: 4, combat: 2, zone: 0 };
  const at = (ms: number) => new Date(1_700_000_000_000 + ms);

  it("一分钟内不管多少人、多少次、是否并发，每个榜只查一次；同分的名次也只查一次", async () => {
    const { calls, source } = counting();
    const cache = createRankCache(source);
    await Promise.all(Array.from({ length: 50 }, (_, i) => cache.view({ board: "total", userId: `p${i}`, entry, now: at(i) })));
    assert.deepEqual(calls, { top: 1, count: 1 });
    await cache.view({ board: "combat", userId: "p", entry, now: at(100) });
    assert.deepEqual(calls, { top: 2, count: 2 }, "不同的榜各查各的");
    await cache.view({ board: "total", userId: "p", entry, now: at(LEADERBOARD_TTL_MS + 1) });
    assert.deepEqual(calls, { top: 3, count: 3 });
  });

  it("没上榜的人不查名次；清空后重新取；查询失败不留在缓存里", async () => {
    const { calls, source, setFail } = counting();
    const cache = createRankCache(source);
    const view = await cache.view({ board: "total", userId: "p", entry: "no_name", now: at(0) });
    assert.deepEqual(view.me, { listed: false, reason: "no_name" });
    assert.deepEqual(calls, { top: 1, count: 0 });
    cache.clear();
    setFail(true);
    await assert.rejects(() => cache.view({ board: "total", userId: "p", entry, now: at(1) }), /db down/);
    setFail(false);
    assert.equal((await cache.view({ board: "total", userId: "p", entry, now: at(2) })).entries.length, 1);
    assert.equal(calls.top, 3);
  });

  it("刚改名的人：自己那一行马上是新名字，别人最多再等一个 TTL", async () => {
    const { source } = counting();
    const cache = createRankCache(source);
    const renamed = { ...entry, name: "新名字" };
    assert.equal((await cache.view({ board: "total", userId: "u1", entry: renamed, now: at(0) })).entries[0].name, "新名字");
    assert.equal((await cache.view({ board: "total", userId: "u2", entry, now: at(1) })).entries[0].name, "甲");
  });

  it("刚改回默认名的人，缓存里的旧名字对自己不再显示", async () => {
    const { source } = counting();
    const cache = createRankCache(source);
    assert.equal((await cache.view({ board: "total", userId: "u1", entry, now: at(0) })).entries[0].me, true);
    assert.equal((await cache.view({ board: "total", userId: "u1", entry: "no_name", now: at(1) })).entries.length, 0);
  });
});

describe("真人榜：接口（进程内 inject）", () => {
  async function setup() {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.setErrorHandler((error, _req, reply) => {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    });
    await app.register(jwt, { secret: "leaderboard_test_secret_32_characters" });
    await app.register(rateLimit, { max: 1000, timeWindow: "1 minute", keyGenerator: (req) => String(req.headers["x-user"] ?? "ip"), errorResponseBuilder: () => ({ error: "rate_limited", statusCode: 429 }) });
    app.addHook("preHandler", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await leaderboardRoutes(app, storage, pack);
    const get = (userId: string, board?: string) =>
      app.inject({ method: "GET", url: `/leaderboard${board ? `?board=${board}` : ""}`, headers: { "x-user": userId } });
    const player = async (name: string | undefined, level: number) => {
      const user = await storage.createGuestUser();
      const st = await storage.getOrCreatePlayerState(user.id, pack.version);
      Object.assign(st, { settings: mk(name).settings, combatSkills: defaultCombatSkills(level), combatLevel: level });
      await storage.savePlayerState(user.id, st);
      return user.id;
    };
    return { storage, app, get, player };
  }

  it("前 100 名 + 自己的名次；游客默认名、系统队友、异常数据都不在里面；不带任何玩家编号", async () => {
    const { storage, app, get, player } = await setup();
    try {
      const ids: string[] = [];
      for (let i = 1; i <= LEADERBOARD_LIMIT + 5; i++) ids.push(await player(`勇者${i}号甲`, i));
      const nameless = await player(undefined, 150);
      await player("玩家_abcdef", 160);
      const cheater = await player("开挂的人", 10);
      const cs = await storage.getOrCreatePlayerState(cheater, pack.version);
      cs.combatSkills!.melee.level = 5000;
      await ensurePresetParties(storage, pack);

      const res = await get(ids[0], "combat");
      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.equal(body.board, "combat");
      assert.equal(body.entries.length, LEADERBOARD_LIMIT);
      assert.deepEqual([body.entries[0].rank, body.entries[0].name, body.entries[0].label], [1, "勇者105号甲", "105 级"]);
      assert.deepEqual(body.me, { listed: true, rank: 105, score: 1, label: "1 级" });
      assert.equal(body.entries.some((e: { me: boolean }) => e.me), false);
      for (const bot of PARTY_BOT_PROFILES) assert.equal(body.entries.some((e: { name: string }) => e.name === bot.name), false, bot.name);
      assert.equal(body.entries.some((e: { name: string }) => ["开挂的人", "玩家_abcdef"].includes(e.name)), false);
      for (const id of [...ids, nameless, cheater]) assert.equal(res.body.includes(id), false, "不回传任何玩家编号");
      assert.deepEqual(Object.keys(body.entries[0]).sort(), ["label", "me", "name", "rank", "score"]);

      const top = (await get(ids[104], "combat")).json();
      assert.equal(top.entries[0].me, true);
      assert.equal(top.me.rank, 1);
      assert.deepEqual((await get(nameless)).json().me, { listed: false, reason: "no_name" });
      assert.deepEqual((await get(cheater)).json().me, { listed: false, reason: "excluded" });
      assert.equal((await get(ids[0], "zone")).json().entries.length, 0, "哪里都没打过就没有区域名次");
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("注销的人立刻从榜上消失，后面的人名次前移", async () => {
    const { storage, app, get, player } = await setup();
    try {
      const a = await player("第一名甲", 50);
      const b = await player("第二名乙", 40);
      assert.equal((await get(b, "combat")).json().me.rank, 2);
      await storage.deleteAccount(a, new Date());
      const after = (await get(b, "combat")).json();
      assert.deepEqual(after.entries.map((e: { name: string }) => e.name), ["第二名乙"]);
      assert.equal(after.me.rank, 1);
      assert.equal((await get(a, "combat")).statusCode, 401);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("游客转正：角色名还在榜上、名次不变；账号名正好等于角色名的立刻打码，别人看到的也是", async () => {
    const { storage, app, get, player } = await setup();
    try {
      const a = await player("wanderer77", 50);
      const b = await player("第二名乙", 40);
      assert.deepEqual((await get(b, "combat")).json().entries.map((e: { name: string }) => e.name), ["wanderer77", "第二名乙"]);
      await storage.bindPassword(a, "Wanderer77", "hash");
      const after = (await get(b, "combat")).json();
      assert.deepEqual(after.entries.map((e: { name: string }) => e.name), ["w＊＊", "第二名乙"]);
      assert.equal(after.me.rank, 2);
      assert.equal(JSON.stringify(after).toLowerCase().includes("wanderer77"), false);
      assert.equal((await storage.getOrCreatePlayerState(a, pack.version)).settings?.playerName, "wanderer77", "存档里的名字不动");
      await storage.bindPassword(b, "login_name_b", "hash");
      assert.deepEqual((await get(a, "combat")).json().entries.map((e: { name: string }) => e.name), ["w＊＊", "第二名乙"]);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("设置接口：看不见的名字和系统专用名存不进去，正常名字和清空照常", async () => {
    const storage = createMemoryStorage();
    const app = Fastify({ logger: false });
    app.setErrorHandler((error, _req, reply) => {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    });
    app.addHook("preHandler", async (req) => { (req as any).userId = req.headers["x-user"]; });
    await progressionRoutes(app, storage, pack);
    try {
      const user = await storage.createGuestUser();
      const rename = (playerName: string | null) =>
        app.inject({ method: "POST", url: "/progression/settings", headers: { "x-user": user.id }, payload: { playerName } });
      for (const bad of [String.fromCodePoint(0x3164), "商会补给站", "系统", "阿\\福", "阿" + String.fromCodePoint(0xe000)]) {
        assert.equal((await rename(bad)).statusCode, 400, JSON.stringify(bad));
      }
      assert.equal((await rename("砍柴的阿福")).json().settings.playerName, "砍柴的阿福");
      assert.equal((await rename("")).json().settings.playerName, undefined);
      assert.equal((await rename(null)).statusCode, 200);
    } finally {
      await app.close();
      await storage.close();
    }
  });

  it("没登录 401、榜名写错 400、多余参数 400、一分钟 30 次之后 429", async () => {
    const { storage, app, get, player } = await setup();
    try {
      assert.equal((await app.inject({ method: "GET", url: "/leaderboard" })).statusCode, 401);
      const a = await player("阿福大侠", 5);
      assert.equal((await get(a, "gold")).statusCode, 400);
      assert.equal((await app.inject({ method: "GET", url: "/leaderboard?board=total&limit=99999", headers: { "x-user": a } })).statusCode, 400);
      let last = 0;
      for (let i = 0; i < 31; i++) last = (await get(a)).statusCode;
      assert.equal(last, 429);
      const b = await player("阿贵大侠", 5);
      assert.equal((await get(b)).statusCode, 200, "按玩家计数，互不影响");
    } finally {
      await app.close();
      await storage.close();
    }
  });
});

describe("真人榜：PostgreSQL 建表一致、查询走索引列", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  it("迁移、schema、init 三处都有表和三条降序索引", () => {
    for (const p of ["database/migrations/005_player_rankings.sql", "database/schema.sql", "src/storage_pg.ts"]) {
      const src = read(p);
      for (const part of ["CREATE TABLE IF NOT EXISTS player_rankings", "idx_player_rankings_total ON player_rankings(total_level DESC, user_id)", "idx_player_rankings_combat ON player_rankings(combat_level DESC, user_id)", "idx_player_rankings_zone ON player_rankings(zone_score DESC, user_id)", "REFERENCES users(id) ON DELETE CASCADE"]) {
        assert.ok(src.includes(part), `${p} 缺 ${part}`);
      }
      assert.ok(src.includes("CREATE TABLE IF NOT EXISTS data_backfills"), `${p} 缺 data_backfills`);
    }
  });
  it("补老存档：做完才记完成（中途重启会再补）；不盖掉刚存的新分数；个别人出错或注销不中断；先换算再算分", () => {
    const src = read("src/storage_pg.ts");
    const block = src.slice(src.indexOf("async function backfillRankings"), src.indexOf("const userLocks"));
    assert.ok(block.includes('"SELECT 1 FROM data_backfills WHERE name = $1"'));
    assert.equal(block.includes("SELECT 1 FROM player_rankings LIMIT 1"), false, "表里有一行不等于补完了");
    assert.ok(block.indexOf("migratePlayerCurves(") > 0 && block.indexOf("migratePlayerCurves(") < block.indexOf("rankWriteOf("));
    assert.ok(block.includes('insertRanking(r.user_id, row, "DO NOTHING")'));
    assert.ok(block.includes('"23503"'));
    assert.ok(/if \(!failed\) await pool\.query\("INSERT INTO data_backfills/.test(block));
    assert.ok(block.includes("LIMIT 200"));
  });
  it("分数在保存的当下就算好，不等前一条写完；榜单按账号名打码", () => {
    const src = read("src/storage_pg.ts");
    assert.ok(src.includes("rankPending.set(userId, rankWriteOf(state))"));
    assert.ok(src.includes("maskAccountName(r.name, r.username)"));
  });
  it("榜单查询只碰 player_rankings，不扫 player_states；写入排除系统账号", () => {
    const src = read("src/storage_pg.ts");
    const block = src.slice(src.indexOf("const rankCache"), src.indexOf("const rankWritten"));
    assert.equal(block.includes("player_states"), false);
    assert.ok(block.includes("LIMIT $1"));
    assert.ok(src.includes("SYSTEM_DEVICES.prefix, SYSTEM_DEVICES.exact"));
    assert.ok(/COMMIT"\);\s+for \(const \[userId, state\] of txTouched/.test(src), "事务提交之后才更新榜");
  });
});
