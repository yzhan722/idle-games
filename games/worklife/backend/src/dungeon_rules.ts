/**
 * 单人地下城（WL-G3）：选一个打通过的区域和已开放的档位，连打固定几波，末波是该区域首领。
 *
 * - 前后端各有一份逐字相同的拷贝：backend/src/dungeon_rules.ts 与 frontend/src/gameplay/dungeonRules.ts。
 *   scripts/dungeon-essence-parity.test.ts 会比对两份文件，改一边必须同步另一边。
 * - 参数只写在这里；设计与平衡核对见 docs/design/COMBAT_SECONDARY.md「单人地下城」。只放纯函数，不引用其他模块。
 * - 每一波就是一场普通的单人战斗（同一套结算），所以经验、金币、掉落按波累加；全通再从这几波怪物
 *   已有的稀有掉落里按掉率加权抽 1 件作通关奖励。不加怪、不加物品、不加货币。
 */

export const DUNGEON_RULES = {
  /** 一共几波；最后一波是首领。 */
  waves: 5,
  /** 两波之间歇多久（可吃已带的食物药剂，生命只按脱战速度回一点）。比连续战斗的 3 秒长：一趟不该比连打同样几只怪快太多。 */
  waveBreakMs: 10_000,
  /** 每天（东八区）能开几次。 */
  runsPerDay: 3,
  /** 两次结算相隔超过这么久就当离线：地下城按已过的波数结束，不在没人看着时往下打。 */
  offlineGapMs: 90_000,
} as const;

export type DungeonMonster = { id: string; level?: unknown; isBoss?: unknown; rare?: unknown; rareChance?: unknown };

const isBossMonster = (m: DungeonMonster) => Boolean(m.isBoss) || String(m.id).endsWith("_boss");

/** 区域的首领 id；没有首领的区域返回 undefined（不能开地下城）。 */
export function dungeonBossId(zoneMonsters: readonly DungeonMonster[]): string | undefined {
  return zoneMonsters.find(isBossMonster)?.id;
}

/** 波次：区域里最强的几只普通怪按等级从低到高，最后一波是首领。 */
export function dungeonWaves(zoneMonsters: readonly DungeonMonster[]): string[] {
  const boss = dungeonBossId(zoneMonsters);
  if (!boss) return [];
  const normals = zoneMonsters
    .filter((m) => !isBossMonster(m))
    .map((m, i) => ({ id: m.id, level: Number(m.level) || 0, i }))
    .sort((a, b) => a.level - b.level || a.i - b.i);
  return [...normals.slice(-(DUNGEON_RULES.waves - 1)).map((m) => m.id), boss];
}

/** 打通过 = 这个区域的首领至少击败过一次（单人、组队都算）。 */
export function dungeonZoneCleared(
  stats: { killsByMonster?: Record<string, number> } | null | undefined,
  zoneMonsters: readonly DungeonMonster[]
): boolean {
  const boss = dungeonBossId(zoneMonsters);
  return !!boss && Number(stats?.killsByMonster?.[boss] || 0) > 0;
}

/** 每日次数按哪一天算：东八区日期 YYYY-MM-DD（与任务板、签到同一条切日线）。 */
export function dungeonDay(nowMs: number): string {
  return new Date(nowMs + 8 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * 次数记在哪一天：一般就是今天。系统时间往回拨（存档里的日期比今天晚，最多晚 1 天）时仍记在存档那一天，
 * 不因为回拨多出 3 次；晚 1 天以上当坏数据，从今天重新算，免得一次错的时间把人锁好几天。
 */
export function dungeonCountDay(daily: { day?: string } | null | undefined, today: string): string {
  const day = typeof daily?.day === "string" ? daily.day : "";
  if (!(day > today)) return today;
  const ahead = (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
  return ahead <= 1 ? day : today;
}

/** 今天还能开几次。`daily` 是存档里的 { day, runs }，跨天自动归零；旧存档没有这个字段 = 一次没开过。 */
export function dungeonRunsLeft(daily: { day?: string; runs?: number } | null | undefined, today: string): number {
  const used = daily?.day === dungeonCountDay(daily, today) ? Math.max(0, Math.floor(Number(daily.runs) || 0)) : 0;
  return Math.max(0, DUNGEON_RULES.runsPerDay - used);
}

/** 通关奖励的候选：各波怪物已有的稀有掉落，权重 = 各自的掉率。合并同一种物品。 */
export function dungeonClearPool(waveMonsters: readonly DungeonMonster[]): Array<{ rare: string; weight: number }> {
  const pool = new Map<string, number>();
  for (const m of waveMonsters) {
    const rare = typeof m.rare === "string" ? m.rare : "";
    const w = Number(m.rareChance) || 0;
    if (rare && w > 0) pool.set(rare, (pool.get(rare) || 0) + w);
  }
  return [...pool.entries()].map(([rare, weight]) => ({ rare, weight }));
}

/** 用一个 [0, 1) 的数从候选里挑一件。 */
export function pickClearReward(pool: ReadonlyArray<{ rare: string; weight: number }>, roll: number): string | undefined {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  if (!(total > 0)) return undefined;
  let x = Math.max(0, Math.min(0.999999, roll)) * total;
  for (const p of pool) {
    if (x < p.weight) return p.rare;
    x -= p.weight;
  }
  return pool[pool.length - 1].rare;
}
