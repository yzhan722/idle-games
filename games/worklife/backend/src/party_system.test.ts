import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage } from "./storage_memory";
import { PlayerCommandOperationMismatch } from "./player_commands";
import enhancedContentPack from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, Party } from "./types";

const contentPack = enhancedContentPack as EnhancedContentPack;

async function ctx(storage: ReturnType<typeof createMemoryStorage>, name: string) {
  const user = await storage.findOrCreateGuestUser(name);
  const state = await storage.getOrCreatePlayerState(user.id, "1.0.0");
  return { user, state };
}

function fakeSocket() {
  const messages: any[] = [];
  return {
    messages,
    send(text: string) {
      messages.push(JSON.parse(text));
    },
  };
}

/** 让进行中的活动立即到期（getPartyForUser 浅拷贝共享 currentActivity 引用） */
async function expireActivity(storage: ReturnType<typeof createMemoryStorage>, userId: string) {
  const party = (await storage.getPartyForUser({ userId })) as Party;
  assert.ok(party?.currentActivity, "no activity to expire");
  party.currentActivity!.endsAt = new Date(Date.now() - 1000).toISOString();
}

const ANY_STAGE = (contentPack.stages as any[])[0]?.id as string;
const ANY_MONSTER_STAGE = (contentPack.stages as any[]).find((s: any) => (s.monsters?.length ?? 0) > 0);

describe("party — operation deduplication", () => {
  it("returns stored receipt for a repeated operationId instead of re-running", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "dd-user");
    a.state.inventory.gold = 100;
    let runs = 0;
    const first = await storage.deduplicateOperation({
      userId: a.user.id, operationId: "op-1", operationPayload: { n: 1 },
      run: async () => { runs++; return { ok: true }; },
    });
    const second = await storage.deduplicateOperation({
      userId: a.user.id, operationId: "op-1", operationPayload: { n: 1 },
      run: async () => { runs++; return { ok: true }; },
    });
    assert.equal(runs, 1);
    assert.equal(first.deduplicated, false);
    assert.equal(second.deduplicated, true);
    await storage.close();
  });

  it("rejects a reused operationId with a different payload", async () => {
    const storage = createMemoryStorage();
    const a = await ctx(storage, "dd-mismatch");
    await storage.deduplicateOperation({
      userId: a.user.id, operationId: "op-x", operationPayload: { n: 1 },
      run: async () => "done",
    });
    await assert.rejects(
      () => storage.deduplicateOperation({
        userId: a.user.id, operationId: "op-x", operationPayload: { n: 2 },
        run: async () => "done",
      }),
      (e) => e instanceof PlayerCommandOperationMismatch
    );
    await storage.close();
  });
});

describe("party — discovery, invites, management", () => {
  it("listParties hides full parties", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "d-lead");
    const party = await storage.createParty({ userId: lead.user.id, name: "小队A" });
    let list = await storage.listParties({});
    assert.equal(list.some(p => p.id === party.id), true);
    for (let i = 0; i < 5; i++) {
      const m = await ctx(storage, `d-m${i}`);
      await storage.joinParty({ userId: m.user.id, partyId: party.id });
    }
    list = await storage.listParties({});
    assert.equal(list.some(p => p.id === party.id), false);
    await storage.close();
  });

  it("invite → accept joins the party; decline removes the invite", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "i-lead");
    const target = await ctx(storage, "i-target");
    const other = await ctx(storage, "i-other");
    const party = await storage.createParty({ userId: lead.user.id });

    const inv = await storage.inviteToParty({ userId: lead.user.id, partyId: party.id, targetUserId: target.user.id });
    assert.equal(inv.success, true);
    assert.equal((target.state.partyInvites || []).some(i => i.partyId === party.id), true);

    // 非邀请对象不能接受
    await assert.rejects(
      () => storage.acceptPartyInvite({ userId: other.user.id, partyId: party.id }),
      /invite_not_found/
    );

    const joined = await storage.acceptPartyInvite({ userId: target.user.id, partyId: party.id });
    assert.equal(joined.members.length, 2);
    assert.equal((target.state.partyInvites || []).some(i => i.partyId === party.id), false);
    assert.equal(target.state.partyState?.partyId, party.id);

    // decline：邀请后再拒绝，邀请消失且不入队
    const t2 = await ctx(storage, "i-decline");
    await storage.inviteToParty({ userId: lead.user.id, partyId: party.id, targetUserId: t2.user.id });
    const dec = await storage.declinePartyInvite({ userId: t2.user.id, partyId: party.id });
    assert.equal(dec.success, true);
    assert.equal(t2.state.partyState, undefined);
    await storage.close();
  });

  it("expired invites are rejected and cleaned", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "x-lead");
    const target = await ctx(storage, "x-target");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.inviteToParty({ userId: lead.user.id, partyId: party.id, targetUserId: target.user.id });
    target.state.partyInvites![0].invitedAt = new Date(Date.now() - 25 * 3600_000).toISOString();
    await assert.rejects(
      () => storage.acceptPartyInvite({ userId: target.user.id, partyId: party.id }),
      /invite_expired/
    );
    assert.equal((target.state.partyInvites || []).length, 0);
    await storage.close();
  });

  it("kick removes member and clears their partyState; only leader can kick", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "k-lead");
    const m1 = await ctx(storage, "k-m1");
    const m2 = await ctx(storage, "k-m2");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.joinParty({ userId: m1.user.id, partyId: party.id });
    await storage.joinParty({ userId: m2.user.id, partyId: party.id });

    const notLeader = await storage.kickPartyMember({ userId: m1.user.id, partyId: party.id, memberId: m2.user.id });
    assert.equal(notLeader.success, false);

    const kicked = await storage.kickPartyMember({ userId: lead.user.id, partyId: party.id, memberId: m2.user.id });
    assert.equal(kicked.success, true);
    assert.equal(m2.state.partyState, undefined);
    const after = await storage.getPartyForUser({ userId: lead.user.id });
    assert.equal(after?.members.some(m => m.userId === m2.user.id), false);
    await storage.close();
  });

  it("transfer leadership swaps roles on both sides", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "t-lead");
    const m1 = await ctx(storage, "t-m1");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.joinParty({ userId: m1.user.id, partyId: party.id });

    const res = await storage.transferPartyLeadership({ userId: lead.user.id, partyId: party.id, memberId: m1.user.id });
    assert.equal(res.success, true);
    assert.equal(m1.state.partyState?.isLeader, true);
    assert.equal(lead.state.partyState?.isLeader, false);
    const after = await storage.getPartyForUser({ userId: m1.user.id });
    assert.equal(after?.leaderId, m1.user.id);
    // 老队长可以正常离队而不解散
    const left = await storage.leaveParty({ userId: lead.user.id, partyId: party.id });
    assert.equal(left.success, true);
    await storage.close();
  });
});

describe("party — timed contribution activities", () => {
  it("rejects start without stageId for combat/raid and rejects unknown stageId", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "a-lead");
    const party = await storage.createParty({ userId: lead.user.id });

    const noStage = await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "combat", contentPack,
    });
    assert.equal(noStage.success, false);
    assert.match(noStage.message ?? "", /关卡/);

    const badStage = await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "raid", stageId: "stage_nonexistent", contentPack,
    });
    assert.equal(badStage.success, false);
    await storage.close();
  });

  it("cannot complete before endsAt; cancel clears the activity", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "t2-lead");
    const party = await storage.createParty({ userId: lead.user.id });
    const started = await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "group_craft", durationMinutes: 30, contentPack,
    });
    assert.equal(started.success, true);

    const early = await storage.completePartyActivity({ userId: lead.user.id, partyId: party.id, contentPack });
    assert.equal(early.success, false);
    assert.match(early.message ?? "", /尚未结束/);

    const cancelled = await storage.cancelPartyActivity({ userId: lead.user.id, partyId: party.id });
    assert.equal(cancelled.success, true);
    const after = await storage.getPartyForUser({ userId: lead.user.id });
    assert.equal(after?.currentActivity, undefined);
    await storage.close();
  });

  it("splits rewards by contribution — idle members get nothing", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "c-lead");
    const worker = await ctx(storage, "c-worker");
    const idle = await ctx(storage, "c-idle");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.joinParty({ userId: worker.user.id, partyId: party.id });
    await storage.joinParty({ userId: idle.user.id, partyId: party.id });

    const started = await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "combat", stageId: ANY_STAGE,
      durationMinutes: 30, contentPack,
    });
    assert.equal(started.success, true);

    // 活动期间：只有 worker 产生了贡献（baseline 已开始时快照）
    (worker.state.stats as any).totalKills = ((worker.state.stats as any).totalKills || 0) + 10;
    (lead.state.stats as any).totalKills = ((lead.state.stats as any).totalKills || 0) + 5;

    const workerGold0 = worker.state.inventory.gold || 0;
    const idleGold0 = idle.state.inventory.gold || 0;

    await expireActivity(storage, lead.user.id);
    const done = await storage.completePartyActivity({ userId: lead.user.id, partyId: party.id, contentPack });
    assert.equal(done.success, true);

    const workerGain = (worker.state.inventory.gold || 0) - workerGold0;
    const idleGain = (idle.state.inventory.gold || 0) - idleGold0;
    assert.ok(workerGain > 0, `worker should earn gold, got ${workerGain}`);
    assert.equal(idleGain, 0, "idle member must earn nothing — contribution gating");
    // worker 击杀数是 leader 两倍 → 分成也约两倍
    const leadGain = done.rewards![lead.user.id]?.gold ?? 0;
    assert.equal(done.rewards![worker.user.id]?.gold, workerGain);
    assert.ok(workerGain > leadGain, `worker (${workerGain}) should out-earn leader (${leadGain})`);
    await storage.close();
  });

  it("raid activities reward boss kill contribution with a bigger pool", async () => {
    assert.ok(ANY_MONSTER_STAGE, "need a stage with monsters in content pack");
    const bossIds: string[] = ANY_MONSTER_STAGE.monsters;
    const boss = (contentPack.monsters as any[]).find(m => m.id === bossIds[bossIds.length - 1]);
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "r-lead");
    const hunter = await ctx(storage, "r-hunter");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.joinParty({ userId: hunter.user.id, partyId: party.id });

    const started = await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "raid", stageId: ANY_MONSTER_STAGE.id,
      durationMinutes: 15, contentPack,
    });
    assert.equal(started.success, true);
    const activity = (await storage.getPartyForUser({ userId: lead.user.id }))?.currentActivity;
    const raidBossId = activity?.raidBossId;
    assert.ok(raidBossId, "raid activity must resolve a raid boss");

    // hunter 杀了 3 只 raid boss
    const stats = hunter.state.stats as any;
    stats.killsByMonster = { ...(stats.killsByMonster || {}), [raidBossId!]: ((stats.killsByMonster || {})[raidBossId!] || 0) + 3 };
    stats.totalKills = (stats.totalKills || 0) + 3;

    const hunterGold0 = hunter.state.inventory.gold || 0;
    await expireActivity(storage, lead.user.id);
    const done = await storage.completePartyActivity({ userId: lead.user.id, partyId: party.id, contentPack });
    assert.equal(done.success, true);
    const hunterGain = (hunter.state.inventory.gold || 0) - hunterGold0;
    assert.ok(hunterGain > 0, `raid hunter should earn, got ${hunterGain}`);
    assert.equal(done.rewards![lead.user.id], undefined, "no-contribution leader earns nothing");
    await storage.close();
  });

  it("zero-contribution activity pays out nothing", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "z-lead");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.startPartyActivity({
      userId: lead.user.id, partyId: party.id, activityType: "combat", stageId: ANY_STAGE, durationMinutes: 30, contentPack,
    });
    await expireActivity(storage, lead.user.id);
    const done = await storage.completePartyActivity({ userId: lead.user.id, partyId: party.id, contentPack });
    assert.equal(done.success, true);
    assert.deepEqual(done.rewards, {});
    await storage.close();
  });
});

describe("party — presence and notifications", () => {
  it("wsConnect/wsDisconnect writes member isOnline", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "w-lead");
    const m1 = await ctx(storage, "w-m1");
    const party = await storage.createParty({ userId: lead.user.id });
    await storage.joinParty({ userId: m1.user.id, partyId: party.id });

    // 内存侧 join 时 isOnline 快照为 true；下线应变 false
    const sock = fakeSocket();
    storage.wsConnect(m1.user.id, { socket: sock });
    let partyNow = await storage.getPartyForUser({ userId: lead.user.id });
    assert.equal(partyNow?.members.find(m => m.userId === m1.user.id)?.isOnline, true);

    storage.wsDisconnect(m1.user.id);
    partyNow = await storage.getPartyForUser({ userId: lead.user.id });
    assert.equal(partyNow?.members.find(m => m.userId === m1.user.id)?.isOnline, false);
    await storage.close();
  });

  it("invite delivers a notify message over ws to the target", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "n-lead");
    const target = await ctx(storage, "n-target");
    const party = await storage.createParty({ userId: lead.user.id });
    const sock = fakeSocket();
    storage.wsConnect(target.user.id, { socket: sock });
    sock.messages.length = 0;

    await storage.inviteToParty({ userId: lead.user.id, partyId: party.id, targetUserId: target.user.id });
    assert.equal(
      sock.messages.some(m => m.type === "notify" && m.kind === "party:invite" && m.partyId === party.id),
      true,
      `expected party:invite notify, got ${JSON.stringify(sock.messages)}`
    );
    await storage.close();
  });

  it("order fill pushes a notify to the order owner", async () => {
    const storage = createMemoryStorage();
    const seller = await ctx(storage, "n-seller");
    const buyer = await ctx(storage, "n-buyer");
    seller.state.inventory.wood_1 = 50;
    buyer.state.inventory.gold = 10000;
    const sock = fakeSocket();
    storage.wsConnect(seller.user.id, { socket: sock });
    sock.messages.length = 0;

    const order = await storage.createTradingOrder({
      userId: seller.user.id, itemId: "wood_1", quantity: 10, price: 5, type: "sell",
    });
    sock.messages.length = 0;
    const res = await storage.executeTrade({ buyerId: buyer.user.id, orderId: order.id, quantity: 4 });
    assert.equal(res.success, true);
    assert.equal(
      sock.messages.some(m => m.type === "notify" && m.kind === "order:filled" && m.gold === 20),
      true,
      `expected order:filled notify, got ${JSON.stringify(sock.messages)}`
    );
    await storage.close();
  });

  it("joining a party auto-subscribes the online member to the party channel", async () => {
    const storage = createMemoryStorage();
    const lead = await ctx(storage, "j-lead");
    const m1 = await ctx(storage, "j-m1");
    const party = await storage.createParty({ userId: lead.user.id });
    const sock = fakeSocket();
    storage.wsConnect(m1.user.id, { socket: sock });
    await storage.joinParty({ userId: m1.user.id, partyId: party.id });
    sock.messages.length = 0;

    // 队里另一人离队的广播应当送达新成员（证明已在 party 频道）
    const m2 = await ctx(storage, "j-m2");
    await storage.joinParty({ userId: m2.user.id, partyId: party.id });
    await storage.leaveParty({ userId: m2.user.id, partyId: party.id });
    assert.equal(
      sock.messages.some(m => m.type === "party:event" && m.event === "member_left" && m.memberId === m2.user.id),
      true,
      `expected member_left broadcast, got ${JSON.stringify(sock.messages)}`
    );
    await storage.close();
  });
});
