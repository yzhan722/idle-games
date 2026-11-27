/**
 * 区域难度档位（WL-G3，单人战斗）：普通 / 困难 / 噩梦。
 *
 * - 前后端各有一份逐字相同的拷贝：backend/src/zone_tiers.ts 与 frontend/src/gameplay/zoneTiers.ts。
 *   scripts/zone-tiers-parity.test.ts 会比对两份文件，改一边必须同步另一边。
 * - 只改现有怪物的数值：不加怪、不加掉落物、不加货币。普通档原样返回传入的怪物，旧存档的结算逐位不变。
 * - 越高档主要是打人更疼、更难命中，生命只多一点：打得过的人每小时多拿一两成经验，打不过的人死得更多、反而更少。
 * - 设计目标与离线核对见 docs/design/COMBAT_SECONDARY.md「区域难度档位」。只放纯函数，不引用其他模块。
 */

export const ZONE_TIER_COUNT = 3;
export const ZONE_TIER_NAMES = ["普通", "困难", "噩梦"] as const;

/** 全部参数。每一项都是「每高一档」的增量，第 t 档 = 1 + 增量 × t（闪避、抗性是加多少）。 */
export const ZONE_TIER_RULES = {
  /** 怪物生命。 */
  hp: 0.005,
  /** 怪物攻击。 */
  atk: 0.3,
  /** 怪物闪避：自身命中的比例。 */
  evasion: 0.003,
  /** 怪物物抗、元抗各加几点。 */
  resist: 1,
  /** 经验：首档、次档（不是等差，封顶见测试）。 */
  xp: [0, 0.25, 0.33],
  /** 掉率（稀有掉落与掉落表）。 */
  drop: [0, 0.2, 0.3],
  /** 战败后多久重生：越高档歇得越久，打不过的档才不会靠「死得快」占便宜。普通档就是原来的 30 秒。 */
  respawnMs: [30_000, 75_000, 90_000],
  /** 开放要在这个区域的上一档累计击杀多少只。 */
  unlockKills: [0, 100, 200],
} as const;

/** 收拢成合法的档位；旧存档没有这个字段，按普通算。 */
export function clampTier(tier: unknown): number {
  const t = Math.floor(Number(tier));
  return Number.isFinite(t) ? Math.max(0, Math.min(ZONE_TIER_COUNT - 1, t)) : 0;
}

export function tierRespawnMs(tier: unknown): number {
  return ZONE_TIER_RULES.respawnMs[clampTier(tier)];
}

type TierMonster = {
  hp?: unknown;
  atk?: unknown;
  xp?: unknown;
  accuracy?: unknown;
  evasion?: unknown;
  physResist?: unknown;
  elemResist?: unknown;
  rareChance?: unknown;
  drops?: unknown;
};

/** 某一档下的怪物。普通档返回同一个对象。 */
export function tierMonster<M extends TierMonster>(monster: M, rawTier: unknown): M & { tier?: number } {
  const t = clampTier(rawTier);
  if (t === 0) return monster;
  const r = ZONE_TIER_RULES;
  const num = (v: unknown) => Number(v || 0);
  const drop = 1 + r.drop[t];
  return {
    ...monster,
    tier: t,
    hp: Math.round(num(monster.hp) * (1 + r.hp * t)),
    atk: Math.round(num(monster.atk) * (1 + r.atk * t)),
    xp: Math.round(num(monster.xp) * (1 + r.xp[t]) * 10) / 10,
    evasion: num(monster.evasion) + Math.round(num(monster.accuracy) * r.evasion * t),
    physResist: num(monster.physResist) + r.resist * t,
    elemResist: num(monster.elemResist) + r.resist * t,
    ...(num(monster.rareChance) > 0 ? { rareChance: Math.min(1, num(monster.rareChance) * drop) } : {}),
    ...(Array.isArray(monster.drops)
      ? { drops: monster.drops.map((d: { chance?: unknown }) => ({ ...d, chance: Math.min(1, num(d?.chance) * drop) })) }
      : {}),
  };
}

export type ZoneTierStats =
  | { killsByMonster?: Record<string, number>; zoneTierKills?: Record<string, number[]> }
  | null
  | undefined;

/** 这个区域某一档的累计击杀。普通档用现成的逐怪击杀数（含组队、含更高档），更高档另计。 */
export function zoneTierKills(stats: ZoneTierStats, zone: { id: string; monsters: readonly string[] }, tier: number): number {
  if (tier <= 0) return zone.monsters.reduce((sum, id) => sum + Math.max(0, Number(stats?.killsByMonster?.[id] || 0)), 0);
  return Math.max(0, Number(stats?.zoneTierKills?.[zone.id]?.[tier - 1] || 0));
}

/** 开放这一档还差多少只；0 = 已开放。更高档要求前面每一档都已开放。 */
export function zoneTierKillsLeft(stats: ZoneTierStats, zone: { id: string; monsters: readonly string[] }, tier: number): number {
  let left = 0;
  for (let t = 1; t <= clampTier(tier); t++) left = Math.max(left, ZONE_TIER_RULES.unlockKills[t] - zoneTierKills(stats, zone, t - 1));
  return Math.max(0, left);
}

/** 实际会用的档位：选的那一档没开放就退回最高的已开放档。 */
export function effectiveTier(stats: ZoneTierStats, zone: { id: string; monsters: readonly string[] }, selected: unknown): number {
  let t = clampTier(selected);
  while (t > 0 && zoneTierKillsLeft(stats, zone, t) > 0) t -= 1;
  return t;
}
