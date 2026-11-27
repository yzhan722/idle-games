/**
 * 主战役难度曲线（纯函数，不依赖 Three.js / DOM）：LevelData.generateDynamicLevel 用它出关卡，
 * scripts/campaign_sim.mjs 用它画 1～60 关的曲线。
 */

export interface CampaignCurve {
  difficultyScale: number;
  bossMaxHp: number;
  enemySpawnInterval: number;
  enemyBurstCount: number;
  initialRedPrewarm: number;
  bruteSpawnInterval: number;
  rewardGold: number;
}

/**
 * 敌人指数成长的步数（每步血 ×1.135、攻 ×1.095）。
 * 1～31 关每关 1 步，32～51 关每关半步，51 关起封顶 40 步（原来是每关 1 步、41 关硬封顶，曲线在 41 关有折点）。
 */
export function enemyGrowthSteps(stage: number): number {
  const s = Math.max(0, stage - 1);
  return s <= 30 ? s : Math.min(40, 30 + (s - 30) * 0.5);
}

export function campaignCurve(safeStage: number): CampaignCurve {
  // Steeper progressive difficulty curve: fair Stage 1, scaling sharply into intense mid-to-late-game battles
  const difficultyScale = Math.pow(1.13, Math.min(safeStage - 1, 35)) + (safeStage - 1) * 0.16;
  return {
    difficultyScale,
    bossMaxHp: Math.round((950 + (safeStage - 1) * 235) * Math.pow(1.135, enemyGrowthSteps(safeStage))),
    enemySpawnInterval: Math.max(
      0.42,
      Number((1.12 * Math.pow(0.955, Math.min(safeStage - 1, 35))).toFixed(3))
    ),
    enemyBurstCount: Math.min(18, Math.round(4 + (safeStage - 1) * 0.58)),
    initialRedPrewarm: Math.min(60, Math.round(11 + (safeStage - 1) * 3.0)),
    bruteSpawnInterval:
      safeStage === 1
        ? 11.5
        : Math.max(4.4, Number((10.6 * Math.pow(0.935, Math.min(safeStage - 1, 30))).toFixed(2))),
    rewardGold: Math.round(125 * difficultyScale),
  };
}

/**
 * 小 Boss（逢 5）/ 大 Boss（逢 10）关的出兵强化。
 * 每波加兵按比例（原来固定 +2 / +3，前期一波只有 6～9 只，5 / 10 / 20 关的尖峰比后面的 Boss 关明显更陡）。
 */
export function bossStageSpawns(
  base: Pick<CampaignCurve, 'enemySpawnInterval' | 'enemyBurstCount'>,
  isMegaBoss: boolean,
  isMiniBoss: boolean
): { enemySpawnInterval: number; enemyBurstCount: number } {
  return {
    enemySpawnInterval: isMegaBoss
      ? Number(Math.max(0.36, base.enemySpawnInterval * 0.88).toFixed(3))
      : isMiniBoss
        ? Number(Math.max(0.38, base.enemySpawnInterval * 0.9).toFixed(3))
        : base.enemySpawnInterval,
    enemyBurstCount: isMegaBoss
      ? Math.min(22, Math.round(base.enemyBurstCount * 1.17))
      : isMiniBoss
        ? Math.min(20, Math.round(base.enemyBurstCount * 1.11))
        : base.enemyBurstCount,
  };
}

/** 敌塔血量倍率：大 Boss / 小 Boss / 每 4 关决战。 */
export function bossHpMultiplier(isMegaBoss: boolean, isMiniBoss: boolean, isMilestoneBoss: boolean): number {
  return isMegaBoss ? 1.9 : isMiniBoss ? 1.42 : isMilestoneBoss ? 1.2 : 1;
}
