/**
 * 成长曲线：本项目自己推导的数值都在这里，参数只写一处。
 *
 * - 前后端各有一份逐字相同的拷贝：backend/src/growth_curves.ts 与 frontend/src/gameplay/growthCurves.ts。
 *   scripts/growth-curves-parity.test.ts 会比对两份文件，改一边必须同步另一边。
 * - 每条曲线的设计目标、取值理由见 docs/design/OWN_CURVES.md。
 * - 只放纯函数，不引用其他模块。
 */

/** 全部技能（职业 / 战斗 / 强化）的等级上限。 */
export const MAX_SKILL_LEVEL = 200;

// ---------------------------------------------------------------------------
// 1. 升级经验 = 这一级打算花多少秒 × 这一级的标准经验速率
// ---------------------------------------------------------------------------

/**
 * 升一级的目标耗时（秒，无任何加成、做当前最高阶动作）：perLevelSec·L + longTailSec·(L−1)^longTailExp
 * 目标：Lv1 = 20 秒（砍 4 次小白杨），Lv10 ≈ 5 分钟，Lv50 ≈ 1.5 小时，Lv100 ≈ 6.5 小时。
 */
export const LEVEL_TIME = { perLevelSec: 20, longTailSec: 0.69, longTailExp: 2.25 } as const;

/** 内容包里最高阶动作的经验速率（经验/秒）按等级的二次近似：base + linear·(L−1) + quadratic·(L−1)² */
export const XP_PACE = { base: 2, linear: 0.025, quadratic: 0.0006 } as const;

export function levelTimeSeconds(level: number): number {
  const over = Math.max(0, level - 1);
  return LEVEL_TIME.perLevelSec * level + LEVEL_TIME.longTailSec * Math.pow(over, LEVEL_TIME.longTailExp);
}

export function xpPacePerSecond(level: number): number {
  const over = Math.max(0, level - 1);
  return XP_PACE.base + XP_PACE.linear * over + XP_PACE.quadratic * over * over;
}

/** 从 level 升到 level+1 所需经验。1 级以下为 0，满级为 Infinity。 */
export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level >= MAX_SKILL_LEVEL) return Infinity;
  return Math.round(levelTimeSeconds(level) * xpPacePerSecond(level));
}

// ---------------------------------------------------------------------------
// 2. 熟练效率：等级高出动作需求越多，白送的次数越多，逐级递减
// ---------------------------------------------------------------------------

/** 饱和曲线 ceilingPct·d/(d+halfLevels)：高出一整阶（12 级）+20%，高出 halfLevels 级拿到一半，永远到不了 ceilingPct。 */
export const MASTERY_EFFICIENCY = { ceilingPct: 220, halfLevels: 120 } as const;

/** 等级高出需求 levelsOver 级时的效率（百分点，保留 1 位小数）。 */
export function masteryEfficiencyPct(levelsOver: number): number {
  if (!(levelsOver > 0)) return 0;
  const raw = (MASTERY_EFFICIENCY.ceilingPct * levelsOver) / (levelsOver + MASTERY_EFFICIENCY.halfLevels);
  return Math.round(raw * 10) / 10;
}

// ---------------------------------------------------------------------------
// 3. 装备强化
// ---------------------------------------------------------------------------

export const ENHANCE_MAX_LEVEL = 20;

/**
 * 属性加成：每级增量比上一级多 stepGrowth（等比），+20 合计 maxPct（原属性翻一倍，约等于换一整阶装备）。
 */
export const ENHANCE_BONUS = { stepGrowth: 0.05, maxPct: 100 } as const;

/** +level 的属性加成（百分点，保留 1 位小数）。 */
export function enhanceBonusPct(level: number): number {
  const n = Math.max(0, Math.min(ENHANCE_MAX_LEVEL, Math.floor(level)));
  const g = 1 + ENHANCE_BONUS.stepGrowth;
  const share = (Math.pow(g, n) - 1) / (Math.pow(g, ENHANCE_MAX_LEVEL) - 1);
  return Math.round(ENHANCE_BONUS.maxPct * share * 10) / 10;
}

/**
 * 基础成功率：从 first 出发按 decay 等比滑向 floor，逐级下降、没有台阶。
 * 目标（强化等级 = 物品等级）：裸强 +5 期望约 100 次（20 秒一次，约 34 分钟）；
 * 全程用定纹镜时 +10 期望约 1040 次（约 5.8 小时），+15、+20 是长线目标（约 5 万次、390 万次）。
 */
export const ENHANCE_CHANCE = { first: 0.52, floor: 0.28, decay: 0.84 } as const;

export function enhanceBaseChance(targetLevel: number): number {
  const t = Math.max(1, Math.min(ENHANCE_MAX_LEVEL, Math.floor(targetLevel)));
  return ENHANCE_CHANCE.floor + (ENHANCE_CHANCE.first - ENHANCE_CHANCE.floor) * Math.pow(ENHANCE_CHANCE.decay, t - 1);
}

/**
 * 手艺系数：等级相等时为 1。把「差多少」拆成落后的比例 behind 与领先的级数 ahead，两者由同一条双曲线给出
 * （knee 是拐弯的圆滑程度），所以整条曲线处处光滑、没有折角。
 * 落后：完全不会时只剩 1 − lagCost；领先：每级加一点、越高越慢，永远到不了 aheadReach。
 * 最终成功率封顶 finalCap，永远留一点悬念。
 */
export const ENHANCE_CRAFT = { lagCost: 0.5, knee: 0.006, aheadReach: 0.8, aheadHalf: 1450, finalCap: 0.95 } as const;

export function enhanceCraftFactor(enhancingLevel: number, itemLevel: number): number {
  const skill = Math.max(1, enhancingLevel);
  const item = Math.max(1, itemLevel);
  const gap = (skill - item) / item;
  const bend = Math.sqrt(gap * gap + ENHANCE_CRAFT.knee * ENHANCE_CRAFT.knee) - ENHANCE_CRAFT.knee;
  const behind = (bend - gap) / 2;
  const ahead = (item * (bend + gap)) / 2;
  return 1 - ENHANCE_CRAFT.lagCost * behind + (ENHANCE_CRAFT.aheadReach * ahead) / (ahead + ENHANCE_CRAFT.aheadHalf);
}

/** 最终成功率 = 基础 ×（手艺系数 + 工具加成），封顶 finalCap。 */
export function enhanceFinalChance(targetLevel: number, enhancingLevel: number, itemLevel: number, toolBonus = 0): number {
  const raw = enhanceBaseChance(targetLevel) * (enhanceCraftFactor(enhancingLevel, itemLevel) + Math.max(0, toolBonus));
  return Math.max(0, Math.min(ENHANCE_CRAFT.finalCap, raw));
}

/**
 * 强化经验：一次尝试 = attemptSec 秒的标准修炼（物品等级对应的经验速率），
 * 目标每高一级再加 perTarget 倍；失败拿 failShare。
 */
export const ENHANCE_XP = { attemptSec: 20, perTarget: 0.6, failShare: 0.35 } as const;

export function enhanceAttemptXp(itemLevel: number, targetLevel: number, success: boolean): number {
  const weight = 1 + ENHANCE_XP.perTarget * Math.max(0, targetLevel - 1);
  const full = ENHANCE_XP.attemptSec * xpPacePerSecond(Math.max(1, itemLevel)) * weight;
  return Math.round(full * (success ? 1 : ENHANCE_XP.failShare) * 10) / 10;
}

// ---------------------------------------------------------------------------
// 4. 战斗经验分配与战斗等级
// ---------------------------------------------------------------------------

/** 一次击杀的经验分 20 份：武器主修 8 份，四项辅修各 3 份；训练护符把 12 份辅修全部改给一项。 */
export const COMBAT_XP_PARTS = { main: 8, eachSupport: 3, supports: 4 } as const;
const COMBAT_XP_TOTAL = COMBAT_XP_PARTS.main + COMBAT_XP_PARTS.eachSupport * COMBAT_XP_PARTS.supports;
export const COMBAT_MAIN_SHARE = COMBAT_XP_PARTS.main / COMBAT_XP_TOTAL;
export const COMBAT_SUPPORT_SHARE = COMBAT_XP_PARTS.eachSupport / COMBAT_XP_TOTAL;
export const COMBAT_SUPPORT_POOL = (COMBAT_XP_PARTS.eachSupport * COMBAT_XP_PARTS.supports) / COMBAT_XP_TOTAL;

/** 战斗等级里最高一项与其余四项的平方权重（8 : 1 : 1 : 1 : 1，合计 12）。 */
export const COMBAT_LEVEL_WEIGHTS = { top: 8, other: 1 } as const;

/**
 * 战斗等级：四项辅修 + 最强伤害系共五项，取加权二次均值后向下取整。
 * 二次均值让专精的人不被短板拖低；五项相等时正好等于那个等级。
 */
export function combatLevelOf(supportLevels: readonly number[], bestDamageLevel: number): number {
  const sorted = [...supportLevels, bestDamageLevel].sort((a, b) => b - a);
  const [top, ...others] = sorted;
  const { top: wTop, other: wOther } = COMBAT_LEVEL_WEIGHTS;
  const squares = wTop * top * top + others.reduce((sum, l) => sum + wOther * l * l, 0);
  return Math.max(1, Math.floor(Math.sqrt(squares / (wTop + wOther * others.length))));
}

// ---------------------------------------------------------------------------
// 5. 拖延惩罚（狂暴）
// ---------------------------------------------------------------------------

/**
 * 普通战斗预期 2 分钟内、首领战 6 分钟内结束；超过两倍预期才开始狂暴，之后每层复利，最多 maxStacks 层（约 3 倍）。
 */
export const ENRAGE = { normalMs: 4 * 60_000, bossMs: 12 * 60_000, step: 0.15, maxStacks: 8 } as const;

export function enrageStacksAt(elapsedMs: number, isBoss: boolean): number {
  const interval = isBoss ? ENRAGE.bossMs : ENRAGE.normalMs;
  return Math.min(ENRAGE.maxStacks, Math.floor(Math.max(0, elapsedMs) / interval));
}

/** 狂暴层数对应的怪物伤害倍率。 */
export function enrageDamageMult(stacks: number): number {
  return Math.pow(1 + ENRAGE.step, Math.max(0, Math.min(ENRAGE.maxStacks, stacks)));
}
