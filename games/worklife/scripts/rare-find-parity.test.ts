import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ASTRAL_CURATOR_TIERS, GUILD_BOUNTY_AFFIXES, GUILD_TRIAL_PACTS, SACRED_RELIC_PEDESTALS, STAR_EMBLEMS } from "../backend/src/progression2";
import { RARE_FIND, rareFindMult, rareFindText, soloRareFindMult, soloRarePct } from "../backend/src/rare_find";
import { ASTRAL_CURATOR_TIERS as FE_TIERS, SACRED_RELIC_PEDESTALS as FE_RELICS } from "../frontend/src/gameplay/astralRelics";
import { GUILD_TRIAL_PACTS as FE_PACTS, STAR_EMBLEMS as FE_EMBLEMS } from "../frontend/src/gameplay/skyForge";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const pcts = (rows: ReadonlyArray<{ rareFindPct?: number }>) => rows.map((r) => r.rareFindPct ?? 0);
const uniq = (xs: number[]) => [...new Set(xs)];

describe("稀有发现：两层，写多少算多少", () => {
  it("两份公式逐字相同；两边三样来源的数值相同，而且都没有超过 30%", () => {
    assert.equal(read("../frontend/src/gameplay/rareFind.ts"), read("../backend/src/rare_find.ts"));
    assert.deepEqual(pcts(FE_TIERS as any), pcts(ASTRAL_CURATOR_TIERS as any));
    for (const [fe, be] of [[FE_RELICS, SACRED_RELIC_PEDESTALS], [FE_EMBLEMS, STAR_EMBLEMS]] as any) {
      for (let i = 0; i < be.length; i++) assert.deepEqual(JSON.stringify(fe[i]).match(/"rareFindPct":[\d.]+/g), JSON.stringify(be[i]).match(/"rareFindPct":[\d.]+/g), be[i].id);
    }
    for (let i = 0; i < GUILD_TRIAL_PACTS.length; i++) assert.equal((FE_PACTS as any)[i].boons.rareFindPct, (GUILD_TRIAL_PACTS as any)[i].boons.rareFindPct);
    const all = JSON.stringify([ASTRAL_CURATOR_TIERS, SACRED_RELIC_PEDESTALS, STAR_EMBLEMS, GUILD_TRIAL_PACTS, GUILD_BOUNTY_AFFIXES]).match(/"rareFindPct":([\d.]+)/g)!.map((x) => Number(x.split(":")[1]));
    assert.ok(all.length > 15 && Math.max(...all) <= 30, String(Math.max(...all)));
  });

  it("界面写法就是结算用的两个数", () => {
    assert.equal(rareFindText(26), "+26% · 单人再 +31.2%");
    assert.equal(soloRarePct(42), 50.4);
    assert.equal(soloRareFindMult(50 + 42, 42), rareFindMult(92) * rareFindMult(50.4));
    assert.equal(rareFindMult(30), 1.3);
    // 逐件相加 = 合计，不因取整跑偏
    for (const [a, b] of [[16, 26], [19, 8], [6, 14], [25, 3]]) assert.ok(Math.abs(soloRarePct(a) + soloRarePct(b) - soloRarePct(a + b)) < 1e-9);
    assert.equal(RARE_FIND.soloFactor, 1.2);
  });

  it("全部组合：单人与乘两次的旧算法差 ≤ 10%，组队与旧算法完全相同", () => {
    const affix = [0, ...GUILD_BOUNTY_AFFIXES.flatMap((a: any) => [a.activeModifiers.rareFindPct, a.lingeringModifiers.rareFindPct]).filter(Boolean)] as number[];
    const of = (x: unknown) => (JSON.stringify(x).match(/"rareFindPct":([\d.]+)/g) ?? []).map((s) => Number(s.split(":")[1]));
    const tiers = uniq([0, ...of(ASTRAL_CURATOR_TIERS)]);
    const chalice = uniq([0, ...of(SACRED_RELIC_PEDESTALS)]);
    const bow = uniq([0, ...of(STAR_EMBLEMS)]);
    const pact = uniq([0, ...of(GUILD_TRIAL_PACTS)]);
    assert.deepEqual([tiers.length, chalice.length, bow.length, pact.length, uniq(affix).length], [6, 6, 6, 2, 3]);
    let low = 1;
    let high = 1;
    for (const A of affix) for (const t of tiers) for (const c of chalice) for (const b of bow) for (const p of pact) for (const O of [0, 8, 18, 30, 50, 80, 120]) {
      const [R, F] = [t + c, b + p];
      const total = O + A + R + F;
      // 改前：加进通用层之后，流派倍率里又各乘一遍
      const before = (1 + total / 100) * (1 + A / 100) * (1 + R / 100) * (1 + F / 100);
      const ratio = soloRareFindMult(total, A + R + F) / before;
      low = Math.min(low, ratio);
      high = Math.max(high, ratio);
      assert.equal(rareFindMult(total), 1 + total / 100);
    }
    assert.ok(low >= 0.9 && high <= 1.1, `${low} ~ ${high}`);
    if (process.env.BALANCE_DEBUG) console.log("单人 / 改前", low, high);
  });
});
