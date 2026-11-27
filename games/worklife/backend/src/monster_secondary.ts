import { levelAccuracy, type DamageType, type SecondaryStats } from "./combat_secondary";

/**
 * 怪物的次级属性按「区域底子 + 体型」推出来，写进内容包的怪物条目
 * （accuracy / evasion / physResist / elemResist / damageType）。
 * 战斗只读内容包里的数；combat_secondary.test.ts 守着「内容包 = 这里推出来的值」，改这里要重新写入内容包。
 *
 * 闪避写成同级命中的比例：0.03 表示同级玩家约有 3% 的普攻落空。抗性每 10 点约 5% 伤害。
 * 森林是教学区，没有闪避与抗性。
 */
export type ZoneSecondary = {
  evasion: number;
  phys: number;
  elem: number;
  /** 体型修正的倍率（森林、矿山一场只打几下，差一下就差很多，所以为 0；沼泽减半）。 */
  archetypeScale: number;
  /** 用元素伤害的怪物，其余为物理。 */
  elemental: readonly string[];
};

export const ZONE_SECONDARY: Readonly<Record<string, ZoneSecondary>> = {
  forest: { evasion: 0, phys: 0, elem: 0, archetypeScale: 0, elemental: [] },
  // 岩石与矿物：怕元素
  mine: { evasion: 0.005, phys: 0, elem: -3, archetypeScale: 0, elemental: ["crystal_bat", "magma_worm"] },
  // 滑溜、有毒
  swamp: { evasion: 0.015, phys: -1, elem: 2, archetypeScale: 0.5, elemental: ["poison_frog", "mud_elemental", "vine_snake", "ghost_light", "swamp_boss"] },
  snow: { evasion: 0.005, phys: 0, elem: 3, archetypeScale: 1, elemental: ["frost_imp", "ice_golem", "snow_harpy", "snow_boss"] },
  volcano: { evasion: 0.005, phys: 0, elem: 4, archetypeScale: 1, elemental: ["lava_slug", "fire_bat", "magma_titan", "flame_wraith", "inferno_drake", "volcano_boss"] },
  // 半虚半实，不好打中
  abyss: { evasion: 0.02, phys: -1, elem: 3, archetypeScale: 1, elemental: ["void_specter", "nightmare_weaver", "abyss_boss"] },
  celestial: { evasion: 0.01, phys: 3, elem: 0, archetypeScale: 1, elemental: ["light_sprite", "seraph_sentinel", "archon", "celestial_boss"] },
  // 位置飘忽
  rift: { evasion: 0.025, phys: 0, elem: 0, archetypeScale: 1, elemental: ["chrono_phantom", "temporal_wyrm", "reality_render", "rift_boss"] },
  inferno: { evasion: 0.01, phys: 1, elem: 4, archetypeScale: 1, elemental: ["hellhound", "flame_imp", "lava_titan", "infernal_dragon", "inferno_boss"] },
  genesis: { evasion: 0.015, phys: 3, elem: 1, archetypeScale: 1, elemental: ["star_seraph", "light_avatar", "divine_phoenix", "genesis_boss"] },
  omega: { evasion: 0.02, phys: 2, elem: 2, archetypeScale: 1, elemental: ["void_devourer", "entropy_beast", "reality_eater", "cosmic_horror", "omega_boss"] },
};

/** 敏捷型多闪避；肉盾型物抗高、怕元素；首领略微全面。 */
export const ARCHETYPE_SECONDARY: Readonly<Record<string, { evasion?: number; phys?: number; elem?: number }>> = {
  fast: { evasion: 0.03 },
  tank: { phys: 5, elem: -5 },
  boss: { evasion: 0.01, phys: 2, elem: 2 },
};

export function monsterSecondaryFor(
  monster: { id: string; level?: number; archetype?: string },
  zoneId: string
): Partial<SecondaryStats> & { accuracy: number; damageType?: DamageType } {
  const zone = ZONE_SECONDARY[zoneId] ?? ZONE_SECONDARY.forest;
  const body = ARCHETYPE_SECONDARY[String(monster.archetype || "")] || {};
  const accuracy = levelAccuracy(Number(monster.level || 1));
  const evasion = Math.round(accuracy * (zone.evasion + (body.evasion || 0) * zone.archetypeScale));
  const physResist = Math.round(zone.phys + (body.phys || 0) * zone.archetypeScale);
  const elemResist = Math.round(zone.elem + (body.elem || 0) * zone.archetypeScale);
  return {
    accuracy,
    ...(evasion ? { evasion } : {}),
    ...(physResist ? { physResist } : {}),
    ...(elemResist ? { elemResist } : {}),
    ...(zone.elemental.includes(monster.id) ? { damageType: "elemental" as const } : {}),
  };
}
