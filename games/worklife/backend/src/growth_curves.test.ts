import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMBAT_MAIN_SHARE,
  COMBAT_SUPPORT_POOL,
  COMBAT_SUPPORT_SHARE,
  ENHANCE_BONUS,
  ENHANCE_CHANCE,
  ENHANCE_CRAFT,
  ENHANCE_MAX_LEVEL,
  ENHANCE_XP,
  ENRAGE,
  MASTERY_EFFICIENCY,
  MAX_SKILL_LEVEL,
  combatLevelOf,
  enhanceAttemptXp,
  enhanceBaseChance,
  enhanceBonusPct,
  enhanceCraftFactor,
  enhanceFinalChance,
  enrageDamageMult,
  enrageStacksAt,
  levelTimeSeconds,
  masteryEfficiencyPct,
  xpForLevel,
  xpPacePerSecond,
} from "./growth_curves";

const near = (actual: number, expected: number, tolerance: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual}（目标 ${expected} ± ${tolerance}）`);

describe("升级经验曲线", () => {
  it("边界：1 级以下不用经验，满级永远升不动", () => {
    assert.equal(xpForLevel(0), 0);
    assert.equal(xpForLevel(MAX_SKILL_LEVEL), Infinity);
    assert.ok(Number.isFinite(xpForLevel(MAX_SKILL_LEVEL - 1)));
  });

  it("设计目标：首次升级 20 秒，Lv10 约 5 分钟，Lv50 约 1.5 小时，Lv100 约 6.5 小时", () => {
    near(levelTimeSeconds(1), 20, 0.001, "Lv1 秒数");
    near(levelTimeSeconds(10) / 60, 5, 0.3, "Lv10 分钟");
    near(levelTimeSeconds(50) / 3600, 1.5, 0.1, "Lv50 小时");
    near(levelTimeSeconds(100) / 3600, 6.5, 0.2, "Lv100 小时");
    for (const level of [1, 10, 50, 100, 199]) {
      near(xpForLevel(level), levelTimeSeconds(level) * xpPacePerSecond(level), 0.5, `Lv${level} = 时间 × 速率`);
    }
  });

  it("全程严格递增，没有平台也没有断崖", () => {
    for (let level = 2; level < MAX_SKILL_LEVEL; level++) {
      const step = xpForLevel(level) - xpForLevel(level - 1);
      assert.ok(step > 0, `Lv${level} 没有涨`);
      if (level >= 10) {
        const growth = xpForLevel(level) / xpForLevel(level - 1);
        assert.ok(growth < 1.25, `Lv${level} 一级跳了 ${growth.toFixed(2)} 倍`);
      }
    }
    // 斜率也只增不减：不会出现「越练越快」的区间（整数取整允许 ±1）
    for (let level = 3; level < MAX_SKILL_LEVEL; level++) {
      const step = xpForLevel(level) - xpForLevel(level - 1);
      const prev = xpForLevel(level - 1) - xpForLevel(level - 2);
      assert.ok(step >= prev - 1, `Lv${level} 斜率回落`);
    }
  });
});

describe("熟练效率", () => {
  it("没高出需求就没有；逐级增加但每级加得越来越少，永远不到上限", () => {
    assert.equal(masteryEfficiencyPct(0), 0);
    assert.equal(masteryEfficiencyPct(-5), 0);
    assert.equal(masteryEfficiencyPct(Number.NaN), 0);
    for (let d = 1; d < MAX_SKILL_LEVEL; d++) {
      assert.ok(masteryEfficiencyPct(d) > masteryEfficiencyPct(d - 1), `高出 ${d} 级`);
      assert.ok(masteryEfficiencyPct(d) < MASTERY_EFFICIENCY.ceilingPct);
    }
    assert.ok(masteryEfficiencyPct(1) - masteryEfficiencyPct(0) > masteryEfficiencyPct(100) - masteryEfficiencyPct(99));
  });

  it("设计目标：高出一整阶（12 级）+20%，高出 halfLevels 级正好一半上限", () => {
    near(masteryEfficiencyPct(12), 20, 0.1, "一整阶");
    assert.equal(masteryEfficiencyPct(MASTERY_EFFICIENCY.halfLevels), MASTERY_EFFICIENCY.ceilingPct / 2);
  });
});

describe("强化曲线", () => {
  const levels = Array.from({ length: ENHANCE_MAX_LEVEL }, (_, i) => i + 1);

  it("属性加成：+0 为 0，+20 恰好封顶，每级增量按固定比例变大", () => {
    assert.equal(enhanceBonusPct(0), 0);
    assert.equal(enhanceBonusPct(ENHANCE_MAX_LEVEL), ENHANCE_BONUS.maxPct);
    assert.equal(enhanceBonusPct(-3), 0);
    for (const n of levels.slice(1)) {
      const inc = enhanceBonusPct(n) - enhanceBonusPct(n - 1);
      const prev = enhanceBonusPct(n - 1) - enhanceBonusPct(n - 2);
      assert.ok(inc > 0);
      near(inc / prev, 1 + ENHANCE_BONUS.stepGrowth, 0.06, `+${n} 增量比`); // 0.1 取整带来的误差
    }
  });

  it("基础成功率：从 first 逐级下降、不出现台阶、不低于 floor", () => {
    assert.equal(enhanceBaseChance(1), ENHANCE_CHANCE.first);
    for (const t of levels.slice(1)) {
      assert.ok(enhanceBaseChance(t) < enhanceBaseChance(t - 1), `+${t}`);
      assert.ok(enhanceBaseChance(t) > ENHANCE_CHANCE.floor);
    }
    assert.equal(enhanceBaseChance(99), enhanceBaseChance(ENHANCE_MAX_LEVEL));
  });

  it("手艺系数：等级相等为 1，随强化等级上升、随物品等级下降，全程光滑、没有折角", () => {
    for (const lv of [1, 30, 100]) assert.equal(enhanceCraftFactor(lv, lv), 1);
    const floor = 1 - ENHANCE_CRAFT.lagCost;
    for (const item of [1, 12, 60, 150]) {
      for (let skill = 2; skill <= MAX_SKILL_LEVEL; skill++) {
        const gain = enhanceCraftFactor(skill, item) - enhanceCraftFactor(skill - 1, item);
        assert.ok(gain > 0 && gain <= ENHANCE_CRAFT.lagCost / item + 0.001, `强化 ${skill} / 物品 ${item}`);
        assert.ok(enhanceCraftFactor(skill, item) > floor && enhanceCraftFactor(skill, item) < 1 + ENHANCE_CRAFT.aheadReach);
      }
    }
    for (const skill of [1, 40, 120, 200]) for (let item = 2; item <= 150; item++) {
      assert.ok(enhanceCraftFactor(skill, item) < enhanceCraftFactor(skill, item - 1), `强化 ${skill} / 物品 ${item}`);
    }
    // 斜率逐步变化：在相等处附近每走 0.02 级，斜率变化都很小
    const slope = (x: number) => (enhanceCraftFactor(x + 0.001, 60) - enhanceCraftFactor(x - 0.001, 60)) / 0.002;
    for (let x = 58; x < 62; x += 0.02) assert.ok(Math.abs(slope(x + 0.02) - slope(x)) < 0.0004, `x=${x}`);
  });

  it("最终成功率始终在 (0, finalCap]，工具只会帮忙", () => {
    for (const t of levels) for (const skill of [1, 50, 200]) for (const item of [1, 60, 150]) {
      const bare = enhanceFinalChance(t, skill, item);
      const tooled = enhanceFinalChance(t, skill, item, 0.02);
      assert.ok(bare > 0 && bare <= ENHANCE_CRAFT.finalCap);
      assert.ok(tooled >= bare);
      assert.equal(enhanceFinalChance(t, skill, item, -1), bare, "负的工具加成按 0 算");
    }
  });

  type ChanceAt = (target: number) => number;
  /** 失败归零时，从 +0 走到 +n 的期望次数。 */
  const unprotected = (n: number, chance: ChanceAt = enhanceBaseChance) =>
    levels.slice(0, n).reduce((e, t) => (e + 1) / chance(t), 0);
  /** 失败降 1 级时，从 +0 走到 +n 的期望次数。 */
  const protectedRun = (n: number, chance: ChanceAt = enhanceBaseChance) => {
    let step = 0;
    let total = 0;
    for (const t of levels.slice(0, n)) {
      const p = chance(t);
      step = (1 + (1 - p) * step) / p;
      total += step;
    }
    return total;
  };

  it("设计目标（强化等级 = 物品等级）：裸强 +5 约 100 次，用定纹镜 +10 约 1040 次", () => {
    near(unprotected(5), 102, 2, "裸强 +5");
    near(protectedRun(10), 1040, 15, "定纹镜 +10");
    for (const n of levels.slice(1)) {
      if (n >= 3) assert.ok(protectedRun(n) < unprotected(n), `+${n} 用镜总归更省次数`); // +2 及以下两种失败都回 +0
      const growth = protectedRun(n) / protectedRun(n - 1);
      assert.ok(growth < 3.3, `+${n} 的期望次数是上一级的 ${growth.toFixed(2)} 倍`);
    }
  });

  /**
   * 锁住中后期追求：每种代表情形走到 +5 / +10 / +15 / +20 的期望次数必须落在区间内。
   * 上限 = 换曲线之前的期望（不许比以前难），下限 = 它的 70%（不许明显变容易）。
   */
  const MILESTONES = [5, 10, 15, 20];
  const ENHANCER_T1 = 0.008; // 内容包 tool_enhancer_t1.enhanceSuccess
  const EXPECTED_ATTEMPTS = [
    { who: "刚入门", skill: 7, item: 13, tool: 0,
      bare: [[254, 361], [158_000, 224_000], [2.41e8, 3.43e8], [3.68e11, 5.24e11]],
      mirror: [[120, 170], [13_900, 19_700], [5.14e6, 7.33e6], [2.12e9, 3.01e9]] },
    { who: "手艺只有一半", skill: 31, item: 61, tool: 0,
      bare: [[277, 395], [190_000, 270_000], [3.21e8, 4.57e8], [5.41e11, 7.71e11]],
      mirror: [[132, 187], [17_500, 24_800], [7.38e6, 1.05e7], [3.46e9, 4.93e9]] },
    { who: "正好够", skill: 61, item: 61, tool: 0,
      bare: [[80.7, 115], [13_700, 19_400], [5.61e6, 8.01e6], [2.31e9, 3.29e9]],
      mirror: [[37.2, 53], [749, 1060], [42_400, 60_400], [2.93e6, 4.17e6]] },
    { who: "正好够，带初级强化器", skill: 61, item: 61, tool: ENHANCER_T1,
      bare: [[78.7, 112], [12_900, 18_400], [5.16e6, 7.35e6], [2.06e9, 2.93e9]],
      mirror: [[36.3, 51.7], [704, 1000], [38_100, 54_300], [2.52e6, 3.58e6]] },
    { who: "高出 50 级", skill: 111, item: 61, tool: 0,
      bare: [[72.7, 103], [10_900, 15_500], [3.96e6, 5.64e6], [1.44e9, 2.05e9]],
      mirror: [[33.6, 47.9], [581, 829], [27_200, 38_800], [1.57e6, 2.24e6]] },
    { who: "顶级装备、高出 50 级", skill: 159, item: 109, tool: 0,
      bare: [[72.7, 103], [10_900, 15_500], [3.96e6, 5.64e6], [1.44e9, 2.05e9]],
      mirror: [[33.6, 47.9], [581, 829], [27_200, 38_800], [1.57e6, 2.24e6]] },
  ];

  it("期望次数不比以前难、也不明显变容易（低 / 中 / 高强化等级，裸强与全程用镜）", () => {
    for (const row of EXPECTED_ATTEMPTS) {
      const chance: ChanceAt = (t) => enhanceFinalChance(t, row.skill, row.item, row.tool);
      MILESTONES.forEach((n, i) => {
        for (const [how, value, range] of [
          ["裸强", unprotected(n, chance), row.bare[i]],
          ["用镜", protectedRun(n, chance), row.mirror[i]],
        ] as Array<[string, number, number[]]>) {
          assert.ok(value >= range[0] && value <= range[1], `${row.who} ${how} +${n}: ${value.toPrecision(4)} 不在 ${range.join("～")}`);
        }
      });
    }
  });

  it("等级差一样时，高阶物品与低阶物品的难度接近（不会在某一阶突然变难）", () => {
    const at = (item: number, how: (n: number, c: ChanceAt) => number, n: number) =>
      how(n, (t) => enhanceFinalChance(t, item, item));
    for (const item of [1, 13, 37, 85, 133, 150]) for (const n of MILESTONES) {
      near(at(item, unprotected, n) / at(61, unprotected, n), 1, 1e-6, `物品 ${item} +${n} 裸强`);
      near(at(item, protectedRun, n) / at(61, protectedRun, n), 1, 1e-6, `物品 ${item} +${n} 用镜`);
    }
  });

  it("强化经验：失败也有份，期望收益不低于同级标准修炼的六成半", () => {
    for (const item of [1, 30, 60, 120]) for (const t of [1, 5, 10, 20]) {
      const ok = enhanceAttemptXp(item, t, true);
      const fail = enhanceAttemptXp(item, t, false);
      near(fail / ok, ENHANCE_XP.failShare, 0.01, "失败占比");
      const p = enhanceBaseChance(t);
      const expected = p * ok + (1 - p) * fail;
      const standard = ENHANCE_XP.attemptSec * xpPacePerSecond(item);
      assert.ok(expected >= standard * 0.65, `物品 ${item} +${t}: ${expected.toFixed(0)} < ${standard.toFixed(0)}`);
    }
  });
});

describe("战斗经验与战斗等级", () => {
  it("份额合计为 1，主修拿得比任何一项辅修多", () => {
    near(COMBAT_MAIN_SHARE + COMBAT_SUPPORT_POOL, 1, 1e-12, "合计");
    near(COMBAT_SUPPORT_SHARE * 4, COMBAT_SUPPORT_POOL, 1e-12, "四项辅修");
    assert.ok(COMBAT_MAIN_SHARE > COMBAT_SUPPORT_SHARE);
  });

  it("五项相等时就是那个等级；任何一项提升都不会让战斗等级下降；不超过最高的一项", () => {
    for (let l = 1; l <= MAX_SKILL_LEVEL; l++) assert.equal(combatLevelOf([l, l, l, l], l), l);
    const samples = [
      [[1, 1, 1, 1], 1],
      [[18, 18, 18, 18], 30],
      [[90, 12, 40, 40], 55],
      [[1, 1, 1, 1], 200],
      [[200, 1, 1, 1], 1],
    ] as Array<[number[], number]>;
    for (const [support, dmg] of samples) {
      const base = combatLevelOf(support, dmg);
      assert.ok(base >= 1 && base <= Math.max(...support, dmg));
      support.forEach((_, i) => {
        const up = support.map((v, j) => (j === i ? v + 1 : v));
        assert.ok(combatLevelOf(up, dmg) >= base);
      });
      assert.ok(combatLevelOf(support, dmg + 1) >= base);
      // 加权二次均值不低于同权重的算术均值：专精的人不吃亏
      const [top, ...rest] = [...support, dmg].sort((a, b) => b - a);
      const arithmetic = (8 * top + rest.reduce((s, v) => s + v, 0)) / 12;
      assert.ok(base >= Math.floor(arithmetic));
    }
  });
});

describe("狂暴", () => {
  it("两倍预期时长之前不触发；首领更晚；层数封顶；倍率复利递增", () => {
    assert.equal(enrageStacksAt(ENRAGE.normalMs - 1, false), 0);
    assert.equal(enrageStacksAt(ENRAGE.normalMs, false), 1);
    assert.equal(enrageStacksAt(ENRAGE.bossMs - 1, true), 0);
    assert.equal(enrageStacksAt(ENRAGE.bossMs, true), 1);
    assert.equal(enrageStacksAt(-5, false), 0);
    assert.equal(enrageStacksAt(1e12, false), ENRAGE.maxStacks);
    assert.equal(enrageDamageMult(0), 1);
    for (let s = 1; s <= ENRAGE.maxStacks; s++) near(enrageDamageMult(s) / enrageDamageMult(s - 1), 1 + ENRAGE.step, 1e-9, `${s} 层`);
    assert.equal(enrageDamageMult(99), enrageDamageMult(ENRAGE.maxStacks));
    near(enrageDamageMult(ENRAGE.maxStacks), 3, 0.2, "满层约 3 倍");
  });
});
