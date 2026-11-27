import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { createMemoryStorage } from "./storage_memory";
import { progressionRoutes } from "./routes/progression";
import { progression2Routes } from "./routes/progression2";
import { mapThrownError } from "./http_errors";
import {
  ELF_BONUS_CAPS,
  ELF_EXPEDITION_SLOT,
  ELF_FAVOR_CAP,
  ELF_FAVOR_TIERS,
  ELF_FULL_BOARD_BONUS,
  MINE_CARTS,
  MINE_DEPTHS,
  MINE_HAULS_PER_LAYER_PER_DAY,
  MINE_LAYERS,
  deliverElfCommission,
  dispatchMineCart,
  doPrestige,
  ensureAirshipTrade,
  ensureCaravanTrade,
  ensureDwarfMine,
  ensureElfWaystation,
  getDwarfElfInfo,
  getElfBoard,
  getElfExpeditionCounters,
  getElfWaystationBonuses,
  getMineHaulMs,
  getMineHaulYield,
  getMineVein,
  mineDayIndex,
  mineDayKey,
  mineDayKeyFromIndex,
  performReincarnation,
  upgradeMineCart,
  upgradeMineDepth,
} from "./progression2";
import { playerBuildExtras } from "./hp_combat";
import { defaultEnhancedPlayerState, ensurePlayerExtensions, getActionRates } from "./storage";

const pack = packJson as EnhancedContentPack;
/** 历史时刻：2026 年 7 月 8 日（东八区 17:00），与墙钟日期不同，确保「无参 ensure 不按墙钟推进」的断言有意义。 */
const T0 = new Date("2026-07-08T09:00:00.000Z");
const DAY_MS = 86_400_000;
const T0_DAY = mineDayIndex(T0);
const at = (dayIdx: number, hourUtc8 = 12, minute = 0) => new Date(dayIdx * DAY_MS + (hourUtc8 - 8) * 3_600_000 + minute * 60_000);
const snap = (s: EnhancedPlayerState) => JSON.stringify([s.inventory, s.dwarfMine ?? null, s.elfWaystation ?? null]);
const action = (id: string) => (pack.actions as any[]).find((a) => a.id === id);

/** 采矿练到 level 级的矿工（金币充足）。 */
function miner(level = 1, gold = 1_000_000) {
  const s = defaultEnhancedPlayerState(pack.version);
  (s.skills as any).skill_blacksmith.level = level;
  s.inventory.gold = gold;
  return s;
}

/** 第一个「指定层品位为 grade」的东八区日（从 T0 起往后找）。 */
function dayWithGrade(layer: number, grade: string, from = T0_DAY) {
  for (let d = from; d < from + 2000; d++) if (getMineVein(d, layer).grade === grade) return d;
  throw new Error(`no ${grade} day for layer ${layer}`);
}

async function routeFixture(patch?: (state: EnhancedPlayerState) => void) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`wl17-mine-${randomUUID()}`);
  const initial = await storage.getOrCreatePlayerState(user.id, pack.version);
  patch?.(initial);
  await storage.savePlayerState(user.id, initial);

  const handlers = new Map<string, any>();
  const app = {
    get(p: string, fn: any) {
      handlers.set(`GET ${p}`, fn);
    },
    post(p: string, fn: any) {
      handlers.set(`POST ${p}`, fn);
    },
    delete(p: string, fn: any) {
      handlers.set(`DELETE ${p}`, fn);
    },
  };
  await progressionRoutes(app as any, storage, pack);
  await progression2Routes(app as any, storage, pack);

  async function invoke(method: "GET" | "POST", p: string, body?: Record<string, unknown>, overrideUserId?: string | null) {
    let statusCode = 200;
    const reply = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      send(payload: any) {
        return { statusCode, payload };
      },
    };
    try {
      const handler = handlers.get(`${method} ${p}`);
      assert.ok(handler, `Missing route handler: ${method} ${p}`);
      const effectiveUser = overrideUserId === undefined ? user.id : overrideUserId;
      const res = await handler({ userId: effectiveUser, body: body ?? {} }, reply);
      if (res && typeof res === "object" && "statusCode" in res && "payload" in res) return res;
      return { statusCode, payload: res };
    } catch (error) {
      const mapped = mapThrownError(error);
      return reply.status(mapped.status).send(mapped.body);
    }
  }

  return { storage, userId: user.id, invoke };
}

describe("WL-17 Dwarf Mine & Elf Waystation backend mechanics & routes", () => {
  it("loads old saves with safe defaults (no gifts, no bonus) and sanitizes dirty mine / waystation data", () => {
    const old = defaultEnhancedPlayerState(pack.version);
    ensurePlayerExtensions(old);
    assert.equal(old.dwarfMine, undefined, "old saves are not touched until the panel opens");
    assert.equal(old.elfWaystation, undefined);
    const chop = action("act_chop_wood_t1");
    const base = getActionRates(old, pack, chop, T0);

    const fresh = defaultEnhancedPlayerState(pack.version);
    const dm = ensureDwarfMine(fresh, T0);
    assert.deepEqual(
      { dayKey: dm.dayKey, depth: dm.depth, cart: dm.cartLevel, haul: dm.haul, hauls: dm.haulsToday },
      { dayKey: mineDayKey(T0), depth: 1, cart: 1, haul: null, hauls: {} }
    );
    const ew = ensureElfWaystation(fresh, T0);
    assert.deepEqual(
      { dayKey: ew.dayKey, favor: ew.favor, tier: ew.boardTier, done: ew.completed, base: ew.expeditionBase },
      { dayKey: mineDayKey(T0), favor: 0, tier: 0, done: [], base: { caravan_runs: 0, relic_surveys: 0, airship_voyages: 0 } }
    );
    assert.deepEqual(fresh.inventory, old.inventory, "opening the mine / meeting the elves gifts nothing");
    const after = getActionRates(fresh, pack, chop, T0);
    assert.equal(after.speedMul, base.speedMul);
    assert.equal(after.xpMul, base.xpMul);
    assert.equal(after.efficiencyPct, base.efficiencyPct);
    assert.deepEqual(playerBuildExtras(fresh), playerBuildExtras(old), "the waystation never touches combat");

    // no-arg ensure never reads the wall clock: invalid keys fall back to the epoch, not to today
    const blank = defaultEnhancedPlayerState(pack.version);
    assert.equal(ensureDwarfMine(blank).dayKey, "1970-01-01");
    assert.equal(ensureElfWaystation(blank).dayKey, "1970-01-01");

    const dirty = defaultEnhancedPlayerState(pack.version);
    (dirty as any).dwarfMine = {
      dayKey: "2026-02-30",
      depth: 99,
      cartLevel: -3,
      haulsToday: { "1": 9, "3": 1, "7": 1, x: 2 },
      haul: { layer: 4, dayKey: "2026-07-08", startedAt: T0.toISOString(), returnsAt: "2099-01-01T00:00:00.000Z" },
      totalHauls: 3,
      bonanzaHauls: 50,
      totalOre: "lots",
      lastHaul: { layer: 1, oreId: "ore_9", grade: "rich" },
    };
    const d = ensureDwarfMine(dirty);
    assert.equal(d.dayKey, "1970-01-01");
    assert.equal(d.depth, MINE_DEPTHS.length, "depth clamps to the deepest shaft");
    assert.equal(d.cartLevel, 1);
    assert.deepEqual(d.haulsToday, { "1": MINE_HAULS_PER_LAYER_PER_DAY, "3": 1 });
    assert.ok(d.haul);
    assert.equal(Date.parse(d.haul!.returnsAt) - Date.parse(d.haul!.startedAt), getMineHaulMs(4, 1), "return time recomputed, not trusted");
    assert.equal(d.bonanzaHauls, 3, "bonanza hauls never exceed total hauls");
    assert.equal(d.totalOre, 0);
    assert.equal(d.lastHaul, null, "ore_9 is not a layer-1 vein");
    (dirty as any).dwarfMine.depth = 2;
    assert.equal(ensureDwarfMine(dirty).haul, null, "a haul below the shaft depth is dropped");

    (dirty as any).caravanTrade = { totalRunsCompleted: 7 };
    (dirty as any).elfWaystation = {
      dayKey: "nope",
      boardTier: 9,
      completed: [2, 2, 5, "1", 0],
      expeditionBase: { caravan_runs: -4, relic_surveys: "x" },
      favor: 120,
      totalCommissions: 2,
      fullBoards: 9,
      lastCommission: { commissionId: "elf_moon", slot: 1 },
    };
    const e = ensureElfWaystation(dirty);
    assert.equal(e.dayKey, "1970-01-01");
    assert.equal(e.boardTier, 2, "board tier never above the current favor tier");
    assert.deepEqual(e.completed, [0, 2]);
    assert.deepEqual(e.expeditionBase, { caravan_runs: 7, relic_surveys: 0, airship_voyages: 0 }, "dirty baselines fall back to the live counters");
    assert.equal(e.fullBoards, 2);
    assert.equal(e.lastCommission, null);
    (dirty as any).elfWaystation.favor = 1e12;
    assert.equal(ensureElfWaystation(dirty).favor, ELF_FAVOR_CAP);
  });

  it("returns hauls, rolls the vein map and posts a new board only on an explicit now", () => {
    const s = miner(1);
    ensureDwarfMine(s, T0);
    const res = dispatchMineCart(s, pack, 1, T0);
    assert.equal(res.ok, true, res.reason);
    const y = getMineHaulYield(T0_DAY, 1, 1);
    assert.equal(res.oreQty, y.oreQty);
    const back = T0.getTime() + getMineHaulMs(1, 1);
    const before = snap(s);
    ensurePlayerExtensions(s);
    ensureDwarfMine(s);
    assert.equal(snap(s), before, "no-arg ensure never returns a haul by the wall clock");
    ensureDwarfMine(s, new Date(back - 1));
    assert.ok(s.dwarfMine!.haul, "still underground one ms early");
    const ore0 = s.inventory[y.oreId] || 0;
    ensureDwarfMine(s, new Date(back), pack);
    assert.equal(s.dwarfMine!.haul, null);
    assert.equal(s.inventory[y.oreId], ore0 + y.oreQty, "ore lands straight in the backpack");
    assert.equal(s.dwarfMine!.totalHauls, 1);
    assert.equal(s.dwarfMine!.lastHaul!.at, new Date(back).toISOString(), "timestamp is the real return time");
    assert.ok(s.logs.some((l) => l.text.includes("满载而归") && l.text.includes(packItemName(y.oreId))));
    assert.deepEqual(s.dwarfMine!.haulsToday, { "1": 1 });
    // the day only rolls forward on an explicit later now (clock rollback never rewinds)
    ensureDwarfMine(s, at(T0_DAY - 3));
    assert.equal(s.dwarfMine!.dayKey, mineDayKey(T0));
    ensureDwarfMine(s, at(T0_DAY + 1, 0, 1));
    assert.equal(s.dwarfMine!.dayKey, mineDayKeyFromIndex(T0_DAY + 1));
    assert.deepEqual(s.dwarfMine!.haulsToday, {}, "every layer refills at UTC+8 midnight");

    // a haul dispatched before midnight returns after it and still pays yesterday's vein
    const n = miner(1);
    const late = at(T0_DAY, 23, 58);
    ensureDwarfMine(n, late);
    assert.equal(dispatchMineCart(n, pack, 1, late).ok, true);
    const yy = getMineHaulYield(T0_DAY, 1, 1);
    ensureDwarfMine(n, new Date(late.getTime() + getMineHaulMs(1, 1)));
    assert.equal(n.inventory[yy.oreId], yy.oreQty);
    assert.equal(n.dwarfMine!.dayKey, mineDayKeyFromIndex(T0_DAY + 1));

    // the waystation posts tomorrow's board only on an explicit now
    const w = miner(1);
    const ew = ensureElfWaystation(w, T0);
    ew.favor = 210;
    ew.completed = [0, 1];
    ensureElfWaystation(w);
    assert.deepEqual(w.elfWaystation!.completed, [0, 1]);
    assert.equal(w.elfWaystation!.boardTier, 0, "the board keeps the tier it was posted at");
    ensureCaravanTrade(w, T0).totalRunsCompleted = 4;
    ensureElfWaystation(w, at(T0_DAY + 1, 0, 0));
    assert.equal(w.elfWaystation!.dayKey, mineDayKeyFromIndex(T0_DAY + 1));
    assert.deepEqual(w.elfWaystation!.completed, []);
    assert.equal(w.elfWaystation!.boardTier, 3, "the new board is posted at the current favor tier");
    assert.equal(w.elfWaystation!.expeditionBase.caravan_runs, 4, "the new baseline is the live caravan counter");
  });

  it("dispatches carts by shaft depth, real mining level and daily reserve, paying real ore; rejects without mutation", () => {
    const s = miner(1);
    ensureDwarfMine(s, T0);
    const reject = (fn: () => { ok: boolean; reason?: string }, re: RegExp) => {
      const before = snap(s);
      const r = fn();
      assert.equal(r.ok, false);
      assert.match(r.reason!, re);
      assert.equal(snap(s), before, `rejected without mutation: ${r.reason}`);
    };
    reject(() => dispatchMineCart(s, pack, 2, T0), /还没掘进/);
    reject(() => dispatchMineCart(s, pack, 9, T0), /未知的矿层/);
    reject(() => dispatchMineCart(s, pack, 1, T0, "2026-07-07"), /日期已更替/);
    s.dwarfMine!.depth = 3;
    reject(() => dispatchMineCart(s, pack, 2, T0), /采矿等级 24/);
    (s.skills as any).skill_blacksmith.level = 30;
    assert.equal(dispatchMineCart(s, pack, 2, T0).ok, true);
    reject(() => dispatchMineCart(s, pack, 1, T0), /矿车还在第 2 层/);
    let t = T0.getTime() + getMineHaulMs(2, 1);
    assert.equal(dispatchMineCart(s, pack, 2, new Date(t)).ok, true, "the cart returns and goes straight back down");
    t += getMineHaulMs(2, 1);
    ensureDwarfMine(s, new Date(t));
    reject(() => dispatchMineCart(s, pack, 2, new Date(t)), /储量已采完/);
    assert.equal(s.dwarfMine!.totalHauls, 2);

    // every grade pays capacity × yield% in real ore; rich / bonanza veins add the layer's forging by-product
    for (const grade of ["lean", "common", "rich", "bonanza"] as const) {
      const d = dayWithGrade(3, grade);
      const p = miner(60);
      ensureDwarfMine(p, at(d, 9)).depth = 3;
      p.dwarfMine!.cartLevel = 4;
      const r = dispatchMineCart(p, pack, 3, at(d, 9));
      assert.equal(r.ok, true, r.reason);
      const yld = getMineHaulYield(d, 3, 4);
      ensureDwarfMine(p, new Date(at(d, 9).getTime() + getMineHaulMs(3, 4)));
      assert.equal(p.inventory[yld.oreId], Math.floor((MINE_CARTS[3].capacity * { lean: 70, common: 100, rich: 135, bonanza: 180 }[grade]) / 100));
      assert.equal(p.inventory.obsidian_chunk || 0, { lean: 0, common: 0, rich: 1, bonanza: 3 }[grade]);
      assert.ok(MINE_LAYERS[2].ores.includes(yld.oreId));
      // the ore feeds the existing forging recipes
      assert.ok((pack.actions as any[]).some((a) => a.skillId === "skill_smithing" && (a.consumes || []).some((c: any) => c.itemId === yld.oreId)));
    }
  });

  it("digs the shaft and upgrades the cart with real crafted goods; the cart cannot be refitted underground", () => {
    const s = miner(80, 20_000);
    ensureDwarfMine(s, T0);
    const r0 = upgradeMineDepth(s, pack, T0);
    assert.equal(r0.ok, false);
    assert.match(r0.reason!, /材料不足：加固木板 ×20（现有 0）/);
    Object.assign(s.inventory, { lumber_2: 25, ingot_2: 30, lumber_1: 12 });
    assert.equal(upgradeMineDepth(s, pack, T0).ok, true);
    assert.equal(s.dwarfMine!.depth, 2);
    assert.equal(s.inventory.gold, 20_000 - MINE_DEPTHS[1].costGold);
    assert.equal(s.inventory.lumber_2, 5);
    assert.equal(s.inventory.ingot_2, 15);
    assert.equal(dispatchMineCart(s, pack, 1, T0).ok, true);
    const busy = upgradeMineCart(s, pack, T0);
    assert.match(busy.reason!, /井下/);
    const back = new Date(T0.getTime() + getMineHaulMs(1, 1));
    const ok = upgradeMineCart(s, pack, back);
    assert.equal(ok.ok, true, ok.reason);
    assert.equal(ok.capacity, MINE_CARTS[1].capacity);
    assert.equal(s.inventory.lumber_1, undefined, "used-up materials leave the backpack");
    assert.ok(getMineHaulMs(1, 2) < getMineHaulMs(1, 1), "a better cart is faster");
    s.inventory.gold = 1;
    assert.match(upgradeMineCart(s, pack, back).reason!, /金币不足/);
    s.dwarfMine!.depth = MINE_DEPTHS.length;
    assert.match(upgradeMineDepth(s, pack, back).reason!, /最深/);
    s.dwarfMine!.cartLevel = MINE_CARTS.length;
    assert.match(upgradeMineCart(s, pack, back).reason!, /最高等级/);
  });

  it("posts a daily board from real gather actions and existing expedition counters, pays favor + gold and the full-board bonus", () => {
    const s = miner(1, 0);
    const ew = ensureElfWaystation(s, T0);
    const board = getElfBoard(T0_DAY, 0);
    const [g0, g1] = board.gather;
    assert.notEqual(g0.id, g1.id, "two different gather commissions");
    for (const g of board.gather) assert.equal(g.minTier, 0);
    const reject = (slot: number, re: RegExp) => {
      const before = snap(s);
      const r = deliverElfCommission(s, pack, slot, T0);
      assert.equal(r.ok, false);
      assert.match(r.reason!, re);
      assert.equal(snap(s), before);
    };
    reject(0, /不足/);
    reject(3, /未知的委托栏位/);
    s.inventory[g0.itemId] = g0.qty + 2;
    assert.match(deliverElfCommission(s, pack, 0, T0, "2026-07-01").reason!, /日期已更替/);
    const r0 = deliverElfCommission(s, pack, 0, T0);
    assert.equal(r0.ok, true, r0.reason);
    assert.equal(s.inventory[g0.itemId], 2, "the gathered goods are handed over");
    assert.equal(s.inventory.gold, g0.gold);
    assert.equal(ew.favor, g0.favor);
    reject(0, /已经完成/);
    // expedition: only runs completed after the board was posted count (real caravan counter, no new counter)
    ensureCaravanTrade(s, T0);
    ensureAirshipTrade(s, T0);
    const x = board.expedition;
    reject(ELF_EXPEDITION_SLOT, /远征进度不足/);
    const field = { caravan_runs: () => (s.caravanTrade!.totalRunsCompleted += x.target), relic_surveys: () => ((s as any).astralRelics = { totalSurveys: x.target }), airship_voyages: () => (s.airshipTrade!.totalVoyages += x.target) }[x.sourceId];
    field();
    assert.equal(getElfExpeditionCounters(s)[x.sourceId], x.target);
    const rx = deliverElfCommission(s, pack, ELF_EXPEDITION_SLOT, T0);
    assert.equal(rx.ok, true, rx.reason);
    s.inventory[g1.itemId] = (s.inventory[g1.itemId] || 0) + g1.qty;
    const r1 = deliverElfCommission(s, pack, 1, T0);
    assert.equal(r1.ok, true);
    assert.equal(r1.bonusFavor, ELF_FULL_BOARD_BONUS, "the third commission of the day clears the board");
    assert.equal(ew.favor, g0.favor + x.favor + g1.favor + ELF_FULL_BOARD_BONUS);
    assert.equal(ew.fullBoards, 1);
    assert.equal(ew.totalCommissions, 3);
    assert.equal(s.inventory.gold, g0.gold + x.gold + g1.gold);
    assert.ok(s.logs.some((l) => l.text.includes("今日委托全部完成")));
    // favor tiers unlock richer pools on the next day's board
    ew.favor = 400;
    ensureElfWaystation(s, at(T0_DAY + 1, 8));
    assert.equal(ew.boardTier, 4);
    const rich = getElfBoard(T0_DAY + 1, 4);
    assert.ok(rich.gather.every((g) => g.minTier <= 4));
    const info = getDwarfElfInfo(s, pack, at(T0_DAY + 1, 9));
    assert.equal(info.elf.commissions.length, 3);
    assert.equal(info.elf.commissions[0].kind, "gather");
    assert.equal(info.elf.commissions[2].kind, "expedition");
    assert.equal(info.elf.favor.name, "精灵挚友");
  });

  it("wires capped favor bonuses into getActionRates for gathering only (speed / efficiency / xp), never combat or crafting", () => {
    const base = miner(1);
    const fan = miner(1);
    ensureElfWaystation(fan, T0).favor = ELF_FAVOR_TIERS[ELF_FAVOR_TIERS.length - 1].minFavor;
    const b = getElfWaystationBonuses(fan);
    assert.deepEqual(
      { s: b.gatherSpeedPct, e: b.gatherEfficiencyPct, x: b.gatherXpPct },
      { s: ELF_BONUS_CAPS.gatherSpeedPct, e: ELF_BONUS_CAPS.gatherEfficiencyPct, x: ELF_BONUS_CAPS.gatherXpPct }
    );
    for (const id of ["act_chop_wood_t1", "act_mine_ore_t1", "act_fish_river_t1"]) {
      const a = action(id);
      const r0 = getActionRates(base, pack, a, T0);
      const r1 = getActionRates(fan, pack, a, T0);
      assert.ok(Math.abs(r1.speedMul / r0.speedMul - 1.05) < 1e-9, `${id} speed`);
      assert.ok(Math.abs(r1.xpMul / r0.xpMul - 1.03) < 1e-9, `${id} xp`);
      assert.equal(r1.efficiencyPct - r0.efficiencyPct, 4, `${id} efficiency`);
      assert.ok(r1.speedSources.some((x: any) => x.label.includes("精灵林地驿站")));
    }
    for (const id of ["act_smelt_ingot_t1", "act_craft_lumber_t1"]) {
      const a = action(id);
      const r0 = getActionRates(base, pack, a, T0);
      const r1 = getActionRates(fan, pack, a, T0);
      assert.equal(r1.speedMul, r0.speedMul, `${id} crafting untouched`);
      assert.equal(r1.xpMul, r0.xpMul);
      assert.equal(r1.efficiencyPct, r0.efficiencyPct);
    }
    const fight = (pack.actions as any[]).find((a) => String(a.id).startsWith("act_combat_"));
    assert.equal(getActionRates(fan, pack, fight, T0).speedMul, getActionRates(base, pack, fight, T0).speedMul);
    assert.deepEqual(playerBuildExtras(fan), playerBuildExtras(base));
    (fan.elfWaystation as any).favor = 1e15;
    assert.equal(getElfWaystationBonuses(fan).gatherSpeedPct, ELF_BONUS_CAPS.gatherSpeedPct, "dirty favor never exceeds the cap");
  });

  it("keeps shaft depth, cart, vein progress and forest favor through doPrestige / performReincarnation, but the cart underground is lost", () => {
    const s = miner(60);
    const dm = ensureDwarfMine(s, T0);
    dm.depth = 3;
    dm.cartLevel = 4;
    assert.equal(dispatchMineCart(s, pack, 3, T0).ok, true);
    const ew = ensureElfWaystation(s, T0);
    ew.favor = 260;
    ew.completed = [1];
    s.combatLevel = 60;
    const snapElf = structuredClone(s.elfWaystation);
    const bonus = getElfWaystationBonuses(s);
    assert.equal(doPrestige(s).ok, true);
    assert.equal(s.dwarfMine!.depth, 3);
    assert.equal(s.dwarfMine!.cartLevel, 4);
    assert.equal(s.dwarfMine!.haul, null, "ore in the cart cannot smuggle wealth into the next life");
    assert.deepEqual(s.dwarfMine!.haulsToday, { "3": 1 }, "today's reserve is not refilled by rebirth");
    assert.deepEqual(s.elfWaystation, snapElf);
    assert.deepEqual(getElfWaystationBonuses(s), bonus);
    assert.ok(s.logs.some((l) => l.text.includes("在途矿车里的矿石")));
    // the new life must re-train mining before the deep layers open again
    const deep = dispatchMineCart(s, pack, 3, new Date(T0.getTime() + 60_000));
    assert.equal(deep.ok, false);
    assert.match(deep.reason!, /采矿等级 48/);
    s.combatLevel = 60;
    s.skills.woodcutting = { level: 55, xp: 0 } as any;
    assert.equal(performReincarnation(s).ok, true);
    assert.equal(s.dwarfMine!.depth, 3);
    assert.deepEqual(s.elfWaystation, snapElf);
  });

  it("keeps the WL-17 backend logic off the wall clock (explicit now only)", () => {
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "progression2/dwarf_elf.ts"), "utf8");
    const wl17 = src.slice(src.indexOf("矮人地底矿脉 & 精灵林地驿站 (WL-17)"));
    assert.ok(wl17.length > 10_000);
    assert.equal(/Date\.now\(/.test(wl17), false);
    assert.equal(/new Date\(\)/.test(wl17), false);
    assert.equal(/Math\.random/.test(wl17), false);
    assert.equal(/now: Date = new Date\(\)/.test(wl17), false, "every WL-17 command takes an explicit now");
  });

  it("exposes GET /progression2/mine and POST mine/* + elf/commission with auth guard, strict zod schemas, server-side checks and stateRevision 409", async () => {
    const now = new Date();
    const fx = await routeFixture((s) => {
      s.inventory.gold = 50_000;
      (s.skills as any).skill_blacksmith.level = 30;
    });
    for (const [p, body] of [
      ["/progression2/mine/haul", { layer: 1 }],
      ["/progression2/mine/depth", {}],
      ["/progression2/mine/cart", {}],
      ["/progression2/elf/commission", { slot: 0 }],
    ] as const) {
      assert.equal((await fx.invoke("POST", p, body as any, null)).statusCode, 401, p);
    }
    assert.equal((await fx.invoke("GET", "/progression2/mine", undefined, null)).statusCode, 401);

    const initial = await fx.invoke("GET", "/progression2/mine");
    assert.equal(initial.statusCode, 200);
    assert.equal(initial.payload.mine.dayKey, mineDayKey(now));
    assert.equal(initial.payload.mine.layers.length, MINE_LAYERS.length);
    assert.equal(initial.payload.mine.layers[0].canHaul, true);
    assert.equal(initial.payload.mine.layers[1].block, "需掘进到第 2 层");
    assert.ok(initial.payload.mine.layers[0].ores[0].smelt, "ores link to the existing smelting recipe");
    assert.equal(initial.payload.elf.dayKey, mineDayKey(now));
    assert.equal(initial.payload.elf.commissions.length, 3);
    assert.equal(initial.payload.bonuses.gatherSpeedPct, 0);
    const rev0 = initial.payload.stateRevision;
    const persisted = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.ok(persisted.dwarfMine && persisted.elfWaystation, "first GET persists both new states");

    const bad = [
      ["/progression2/mine/haul", { layer: 0 }],
      ["/progression2/mine/haul", { layer: 7 }],
      ["/progression2/mine/haul", { layer: 1.5 }],
      ["/progression2/mine/haul", { layer: "1" }],
      ["/progression2/mine/haul", { layer: 1, ore: "ore_12" }],
      ["/progression2/mine/haul", { layer: 1, dayKey: "today" }],
      ["/progression2/mine/depth", { depth: 6 }],
      ["/progression2/mine/cart", { level: 5 }],
      ["/progression2/elf/commission", { slot: 3 }],
      ["/progression2/elf/commission", { slot: -1 }],
      ["/progression2/elf/commission", { slot: 0, favor: 999 }],
      ["/progression2/elf/commission", {}],
    ] as const;
    for (const [p, body] of bad) {
      const r = await fx.invoke("POST", p, body as any);
      assert.ok(r.statusCode >= 400 && r.statusCode < 500, `${p} ${JSON.stringify(body)} → ${r.statusCode}`);
    }
    assert.equal((await fx.invoke("POST", "/progression2/mine/haul", { layer: 2 })).statusCode, 400, "shaft not dug yet");
    assert.equal((await fx.invoke("POST", "/progression2/mine/depth", {})).statusCode, 400, "no materials");
    assert.equal((await fx.invoke("POST", "/progression2/elf/commission", { slot: 0 })).statusCode, 400, "nothing to hand over");

    const latest = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    const haul = await fx.invoke("POST", "/progression2/mine/haul", { layer: 1, dayKey: initial.payload.mine.dayKey, expectedRevision: latest.stateRevision });
    assert.equal(haul.statusCode, 200, JSON.stringify(haul.payload));
    assert.equal(haul.payload.haul.layer, 1);
    assert.equal(haul.payload.mine.mine.haul.layer, 1);
    assert.equal(haul.payload.mine.mine.layers[0].haulsLeft, MINE_HAULS_PER_LAYER_PER_DAY - 1);
    const rev1 = haul.payload.stateRevision;
    assert.ok(rev1 > rev0);
    const stale = await fx.invoke("POST", "/progression2/mine/cart", { expectedRevision: rev0 });
    assert.equal(stale.statusCode, 409);
    assert.equal((await fx.invoke("POST", "/progression2/mine/haul", { layer: 1 })).statusCode, 400, "the cart is underground");

    // hand over a real gather commission
    const g0 = initial.payload.elf.commissions[0];
    const rich = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    rich.inventory[g0.itemId] = g0.qty;
    await fx.storage.savePlayerState(fx.userId, rich);
    const done = await fx.invoke("POST", "/progression2/elf/commission", { slot: 0, dayKey: initial.payload.elf.dayKey });
    assert.equal(done.statusCode, 200, JSON.stringify(done.payload));
    assert.equal(done.payload.commission.favor, g0.favor);
    assert.equal(done.payload.mine.elf.completedCount, 1);
    assert.equal(done.payload.mine.elf.favor.total, g0.favor);
    assert.equal(done.payload.inventory[g0.itemId], undefined);
    const again = await fx.invoke("POST", "/progression2/elf/commission", { slot: 0 });
    assert.equal(again.statusCode, 400);
    assert.match(String(again.payload.error), /已经完成/);

    const saved = await fx.storage.getOrCreatePlayerState(fx.userId, pack.version);
    assert.equal(saved.dwarfMine?.haul?.layer, 1);
    assert.deepEqual(saved.elfWaystation?.completed, [0]);
    assert.equal(getDwarfElfInfo(saved, pack, now).mine.haulsToday, 1);
  });
});

function packItemName(id: string) {
  return ((pack.items as any[]).find((i) => i.id === id)?.name as string) || id;
}
