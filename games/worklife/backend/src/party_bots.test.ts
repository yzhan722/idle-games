import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import { partyRoutes } from "./routes/party";
import { isGarbledOrDefaultName, isGarbledPartyName } from "./party_bots";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

function createMockApp() {
  const handlers = new Map<string, (req: any, reply: any) => Promise<any>>();
  return {
    handlers,
    get(path: string, fn: any) { handlers.set(`GET ${path}`, fn); },
    post(path: string, fn: any) { handlers.set(`POST ${path}`, fn); },
  };
}

async function callRoute(
  app: ReturnType<typeof createMockApp>,
  method: "GET" | "POST",
  path: string,
  opts: { userId?: string; body?: any; query?: any }
) {
  const fn = app.handlers.get(`${method} ${path}`);
  assert.ok(fn, `route ${method} ${path} not registered`);
  let statusCode = 200;
  let payload: any;
  const reply = {
    status(c: number) { statusCode = c; return reply; },
    send(p: any) { payload = p; return reply; },
  };
  await fn({ userId: opts.userId, body: opts.body, query: opts.query }, reply);
  return { statusCode, payload };
}

describe("party_bots — Chinese nicknames, auto-ready bots, and player combat start", () => {
  it("lists preset bot parties with Chinese names and no garbled IDs", async () => {
    const storage = createMemoryStorage();
    const app = createMockApp();
    await partyRoutes(app as any, storage, contentPack);

    const player = await storage.findOrCreateGuestUser("human-tester-1");
    await storage.getOrCreatePlayerState(player.id, contentPack.version);

    const listRes = await callRoute(app, "GET", "/party/list", { userId: player.id });
    assert.equal(listRes.statusCode, 200);
    const parties = listRes.payload.parties as any[];
    assert.ok(parties.length >= 4, `expected at least 4 preset bot parties, got ${parties.length}`);

    for (const p of parties) {
      assert.equal(isGarbledPartyName(p.name), false, `party name should not be garbled: ${p.name}`);
      assert.equal(isGarbledOrDefaultName(p.leaderName), false, `leaderName should be Chinese: ${p.leaderName}`);
    }

    await storage.close();
  });

  it("joining a bot party promotes player to leader, keeps bots auto-ready, and lets player ready & start combat", async () => {
    const storage = createMemoryStorage();
    const app = createMockApp();
    await partyRoutes(app as any, storage, contentPack);

    const player = await storage.findOrCreateGuestUser("human-tester-2");
    await storage.getOrCreatePlayerState(player.id, contentPack.version);

    const listRes = await callRoute(app, "GET", "/party/list", { userId: player.id });
    const targetParty = listRes.payload.parties[0];
    assert.ok(targetParty);

    const joinRes = await callRoute(app, "POST", "/party/join", {
      userId: player.id,
      body: { partyId: targetParty.id },
    });
    assert.equal(joinRes.statusCode, 200);
    const joinedParty = joinRes.payload;
    assert.equal(joinedParty.leaderId, player.id, "human player should become leader when joining bot party");

    const botMembers = joinedParty.members.filter((m: any) => m.userId !== player.id);
    assert.ok(botMembers.length >= 1, "party should have bot members");
    for (const b of botMembers) {
      assert.equal(b.isBot, true, "bot member should have isBot=true");
      assert.equal(b.isReady, true, "bot member must be auto-ready");
      assert.equal(isGarbledOrDefaultName(b.displayName), false, `bot displayName must be Chinese: ${b.displayName}`);
    }

    // Player clicks Ready
    const readyRes = await callRoute(app, "POST", "/party/ready", {
      userId: player.id,
      body: { partyId: targetParty.id, ready: true },
    });
    assert.equal(readyRes.statusCode, 200);
    assert.equal(readyRes.payload.party.allReady, true, "allReady should be true once player readies");

    // Player starts combat activity
    const firstStage = (contentPack.stages as any[])[0].id as string;
    const startRes = await callRoute(app, "POST", "/party/start-activity", {
      userId: player.id,
      body: {
        partyId: targetParty.id,
        activityType: "combat",
        stageId: firstStage,
        durationMinutes: 15,
      },
    });
    assert.equal(startRes.statusCode, 200);
    assert.equal(startRes.payload.success, true);

    await storage.close();
  });

  it("allows player to recruit Chinese-named bot teammates who join auto-ready", async () => {
    const storage = createMemoryStorage();
    const app = createMockApp();
    await partyRoutes(app as any, storage, contentPack);

    const player = await storage.findOrCreateGuestUser("human-tester-3");
    await storage.getOrCreatePlayerState(player.id, contentPack.version);

    const createRes = await callRoute(app, "POST", "/party/create", {
      userId: player.id,
      body: {},
    });
    assert.equal(createRes.statusCode, 200);
    const partyId = createRes.payload.id;

    const recruitRes = await callRoute(app, "POST", "/party/recruit-bot", {
      userId: player.id,
      body: { partyId },
    });
    assert.equal(recruitRes.statusCode, 200);
    assert.equal(recruitRes.payload.success, true);
    assert.equal(recruitRes.payload.party.members.length, 2);
    const bot = recruitRes.payload.party.members.find((m: any) => m.userId !== player.id);
    assert.ok(bot);
    assert.equal(bot.isBot, true);
    assert.equal(bot.isReady, true);
    assert.equal(isGarbledOrDefaultName(bot.displayName), false);

    await storage.close();
  });
});
