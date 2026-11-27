import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import {
  ACCURACY,
  MISS,
  MISS_FULL,
  RESIST,
  SECONDARY_KEYS,
  hitPct,
  levelAccuracy,
  matchupLine,
  missBp,
  playerAccuracy,
  resistMult,
  secondaryLine,
  sumSecondary,
  swingMeter,
} from "./combat_secondary";
import { ZONE_SECONDARY, monsterSecondaryFor } from "./monster_secondary";
import { hitDamage, monsterCombatant, playerCombatant, type Combatant } from "./first_hour_combat";
import { getEquippedSecondaryStats } from "./storage";
import { createMemoryStorage } from "./storage_memory";
import { startHpCombat, tickHpCombat } from "./hp_combat";
import { enhancementStatMultiplier } from "./enhancement_math";
import { OPEN_ZONE_IDS } from "./zones";

const pack = packJson as unknown as EnhancedContentPack;
const P = packJson as any;
const T0 = new Date("2026-09-03T00:00:00.000Z");
const fightPack = {
  ...P,
  actions: P.actions.map((a: any) => (String(a.id).startsWith("act_combat_") ? { ...a, requirements: {} } : a)),
} as EnhancedContentPack;

describe("命中与闪避", () => {
  it("落空率随对方闪避上升、随我方命中下降，封底 1 − cap，没有闪避就必中", () => {
    assert.equal(missBp(500, 0), 0);
    assert.equal(missBp(500, undefined), 0);
    assert.equal(missBp(undefined, 50), 0, "没有命中数值的对手必中");
    for (let eva = 1; eva < 5000; eva += 37) {
      assert.ok(missBp(500, eva + 37) > missBp(500, eva), `闪避 ${eva}`);
      assert.ok(missBp(500, eva) < MISS.cap * MISS_FULL);
    }
    for (let acc = 100; acc < 3000; acc += 100) assert.ok(missBp(acc + 100, 60) <= missBp(acc, 60), `命中 ${acc}`);
    assert.ok(missBp(1, 1e9) <= MISS.cap * MISS_FULL, "再悬殊也有 1 − cap 的命中");
    // r 很小时落空率约等于 r：3% 的闪避约落空 3%
    assert.ok(Math.abs(missBp(1000, 30) / 100 - 3) < 0.2);
    assert.equal(hitPct(1000, 0), 100);
  });

  it("落空条：长期落空比例等于落空率，且最多差一次", () => {
    for (const bp of [0, 120, 300, 1500, 4999, 6000]) {
      let meter: number | undefined;
      let misses = 0;
      for (let i = 1; i <= 1000; i++) {
        const r = swingMeter(meter, bp);
        meter = r.meter;
        if (r.miss) misses += 1;
        assert.ok(Math.abs(misses - (i * bp) / MISS_FULL) <= 1, `${bp}bp 第 ${i} 次`);
      }
    }
  });

  it("玩家命中只看战斗等级、攻击技能和加成；等级够得上的怪最多落空一成的一半", () => {
    assert.equal(playerAccuracy(1, 1), levelAccuracy(1));
    assert.equal(playerAccuracy(50, 1), ACCURACY.base + ACCURACY.perLevel * 50);
    assert.ok(playerAccuracy(50, 20, 30) > playerAccuracy(50, 20));
    for (const m of P.monsters) {
      const bp = missBp(playerAccuracy(m.level, 1), m.evasion);
      assert.ok(bp <= 530, `${m.id}: 同级落空 ${bp / 100}%`);
    }
  });
});

describe("抗性", () => {
  it("正抗性减伤、负抗性增伤，对称、单调、到不了上限", () => {
    assert.equal(resistMult(0), 1);
    assert.equal(resistMult(undefined), 1);
    for (let p = 1; p < 400; p++) {
      assert.ok(resistMult(p) < resistMult(p - 1));
      assert.ok(resistMult(p) > 1 - RESIST.cap);
      assert.ok(Math.abs(resistMult(p) + resistMult(-p) - 2) < 1e-12);
    }
    assert.ok(Math.abs(resistMult(10) - 0.953) < 0.001, "10 点约 5%");
  });

  it("伤害按攻击方的伤害类型吃对应抗性", () => {
    const base: Combatant = { name: "t", hp: 100, atk: 1000, def: 0, intervalMs: 2000, incomingDamageMult: 1, outgoingDamageMult: 1 };
    const wall: Combatant = { ...base, physResist: 40, elemResist: -40 };
    assert.ok(hitDamage({ ...base, damageType: "physical" }, wall) < 1000);
    assert.ok(hitDamage({ ...base, damageType: "elemental" }, wall) > 1000);
    assert.equal(hitDamage(base, { ...base }), 1000, "没有次级属性的对手（竞技场擂主等）和以前一样");
  });
});

describe("数据：怪物按区域推出，装备与食物只加在已有条目上", () => {
  it("内容包里的怪物数值等于公式推出来的值", () => {
    assert.deepEqual(Object.keys(ZONE_SECONDARY).sort(), [...OPEN_ZONE_IDS].sort(), "每个区域都有底子");
    const ids = new Set(P.monsters.map((m: any) => m.id));
    for (const z of Object.values(ZONE_SECONDARY)) for (const id of z.elemental) assert.ok(ids.has(id), id);
    for (const stage of P.stages) {
      for (const id of stage.monsters) {
        const m = P.monsters.find((x: any) => x.id === id);
        const expected = monsterSecondaryFor(m, stage.id) as Record<string, unknown>;
        for (const key of [...SECONDARY_KEYS, "damageType"]) assert.equal(m[key], expected[key], `${id}.${key}`);
      }
    }
  });

  it("教学区没有闪避与抗性；往后的区域每个都有自己的特点", () => {
    const forest = P.stages.find((s: any) => s.id === "forest").monsters.map((id: string) => P.monsters.find((m: any) => m.id === id));
    for (const m of forest) for (const key of ["evasion", "physResist", "elemResist", "damageType"]) assert.equal(m[key], undefined, `${m.id}.${key}`);
    const later = Object.entries(ZONE_SECONDARY).filter(([id]) => id !== "forest").map(([, z]) => JSON.stringify([z.evasion, z.phys, z.elem]));
    assert.equal(new Set(later).size, later.length, "没有两个区域完全一样");
  });

  it("面板一行文字：只写有影响的项", () => {
    assert.equal(secondaryLine(undefined), "");
    assert.equal(secondaryLine({ accuracy: 18, elemResist: -4 }), "命中 +18 · 元抗 -4");
    assert.equal(matchupLine({ accuracy: 110 }, {}), "命中 100%");
    const line = matchupLine(
      { accuracy: 600, evasion: 30, physResist: 0, elemResist: 10, damageType: "physical" },
      { accuracy: 600, evasion: 18, physResist: 8, elemResist: 0, damageType: "elemental" }
    );
    assert.match(line, /^命中 97\.1% · 伤害 -3\.8% · 闪避 4\.6% · 受伤 -4\.7%$/);
  });

  it("装备合计：按强化倍率放大、合计后取整，损坏与背包里没有的不算", async () => {
    const storage = createMemoryStorage();
    const user = await storage.findOrCreateGuestUser(`sec-${Math.random()}`);
    const state = (await storage.getOrCreatePlayerState(user.id, pack.version)) as any;
    state.inventory.weapon_wooden_bow = 1;
    state.inventory.armor_leather_chest = 1;
    state.equipment.main_hand = "weapon_wooden_bow";
    state.equipment.chest = "armor_leather_chest";
    const bow = P.items.find((i: any) => i.id === "weapon_wooden_bow");
    const leather = P.items.find((i: any) => i.id === "armor_leather_chest");
    assert.deepEqual(getEquippedSecondaryStats(state, pack), { accuracy: bow.accuracy, evasion: leather.evasion, physResist: 0, elemResist: 0 });
    state.equipment.enhancementLevels = { weapon_wooden_bow: 10 };
    const mult = enhancementStatMultiplier(10, bow);
    assert.equal(getEquippedSecondaryStats(state, pack).accuracy, Math.round(bow.accuracy * mult));
    state.equipment.durability = { weapon_wooden_bow: 0 };
    assert.equal(getEquippedSecondaryStats(state, pack).accuracy, 0, "损坏不算");
    delete state.inventory.armor_leather_chest;
    assert.equal(getEquippedSecondaryStats(state, pack).evasion, 0, "背包里没有不算");
    assert.deepEqual(sumSecondary([]), { accuracy: 0, evasion: 0, physResist: 0, elemResist: 0 });
    const pc = playerCombatant(state, pack);
    assert.equal(pc.damageType, "physical");
    await storage.close();
  });
});

async function freshPlayer(level: number, equipment: Record<string, string> = {}) {
  const storage = createMemoryStorage();
  const user = await storage.findOrCreateGuestUser(`sec-fight-${Math.random()}`);
  const state = (await storage.getOrCreatePlayerState(user.id, pack.version)) as any;
  state.combatLevel = level;
  state.combatSkills = undefined;
  for (const [slot, id] of Object.entries(equipment)) {
    state.equipment[slot] = id;
    state.inventory[id] = 1;
  }
  return { storage, state };
}

function withMonster(id: string, patch: Record<string, unknown>): EnhancedContentPack {
  return { ...fightPack, monsters: P.monsters.map((m: any) => (m.id === id ? { ...m, ...patch } : m)) } as EnhancedContentPack;
}

function runFight(state: any, p: EnhancedContentPack, id: string) {
  state.hpCombat = startHpCombat(state, p, id, T0);
  const lines: string[] = [];
  let ms = 0;
  while (!state.hpCombat.outcome && ms < 600_000) {
    tickHpCombat(state, p, new Date(T0.getTime() + ms + 1000), 1000, () => 0.99);
    ms += 1000;
    lines.push(state.hpCombat.log[state.hpCombat.log.length - 1]);
  }
  return { ms, lines, enc: state.hpCombat };
}

describe("服务端战斗", () => {
  it("闪避高的怪会让普攻落空、战斗变长，但技能必中，也永远打得死", async () => {
    const plain = await freshPlayer(30, { main_hand: "weapon_steel_axe" });
    const a = runFight(plain.state, withMonster("iron_spider", { evasion: 0, physResist: 0, atk: 1 }), "iron_spider");
    const dodgy = await freshPlayer(30, { main_hand: "weapon_steel_axe" });
    const b = runFight(dodgy.state, withMonster("iron_spider", { evasion: 4000, physResist: 0, atk: 1 }), "iron_spider");
    assert.equal(a.enc.outcome, "win");
    assert.equal(b.enc.outcome, "win");
    assert.ok(b.ms > a.ms * 1.2, `${a.ms} → ${b.ms}`);
    assert.ok(b.lines.some((l) => l === "普通攻击落空"));
    assert.ok(!a.lines.some((l) => l === "普通攻击落空"));
    await plain.storage.close();
    await dodgy.storage.close();
  });

  it("玩家的闪避与抗性真的少挨打", async () => {
    const hpLeft = async (patch: Record<string, unknown>) => {
      const { storage, state } = await freshPlayer(40);
      const items = P.items.map((i: any) => (i.id === "armor_steel_chest" ? { ...i, def: 0, physResist: 0, ...patch } : i));
      state.equipment.chest = "armor_steel_chest";
      state.inventory.armor_steel_chest = 1;
      const p = { ...withMonster("iron_spider", { hp: 900 }), items } as EnhancedContentPack;
      const r = runFight(state, p, "iron_spider");
      await storage.close();
      return { left: r.enc.playerHp as number, lines: r.lines };
    };
    const plain = await hpLeft({});
    const evasive = await hpLeft({ evasion: 120 });
    const tough = await hpLeft({ physResist: 60 });
    assert.ok(evasive.left > plain.left, "闪避");
    assert.ok(evasive.lines.some((l) => l.startsWith("你闪开了")));
    assert.ok(tough.left > plain.left, "物抗");
  });

  it("首领的蓄力重击躲不掉", async () => {
    const { storage, state } = await freshPlayer(60, { main_hand: "weapon_steel_axe" });
    const items = P.items.map((i: any) => (i.id === "weapon_steel_axe" ? { ...i, evasion: 1_000_000 } : i));
    const p = { ...withMonster("mine_boss", { hp: 20_000 }), items } as EnhancedContentPack;
    const r = runFight(state, p, "mine_boss");
    const label = (P.bossMechanics as any[]).find((d) => d.kind === "charge").label;
    assert.ok(r.lines.some((l) => l.includes(`（${label}）`)) || r.enc.log.some((l: string) => l.includes(`（${label}）`)), "蓄力重击命中了");
    await storage.close();
  });

  it("打到一半的旧战斗没有落空条字段，接着打不出错", async () => {
    const { storage, state } = await freshPlayer(20, { main_hand: "weapon_steel_axe" });
    state.hpCombat = startHpCombat(state, fightPack, "crystal_bat", T0);
    delete state.hpCombat.playerMissMeter;
    delete state.hpCombat.enemyMissMeter;
    tickHpCombat(state, fightPack, new Date(T0.getTime() + 60_000), 60_000, () => 0.99);
    assert.ok(Number.isFinite(state.hpCombat.playerHp) && Number.isFinite(state.hpCombat.enemyHp));
    assert.equal(monsterCombatant({ id: "ghost", hp: 10, atk: 1 }).accuracy, 0, "没写命中的怪必中");
    await storage.close();
  });
});
