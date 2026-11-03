import type { EnhancedContentPack } from "./types";

/**
 * 已开放的战斗关卡白名单——与 frontend/src/gameplay/encounters.ts 的 OPEN_ZONE_IDS
 * 保持同步：关卡开放门槛是美术资产就绪度（无插图的怪不发货），后端独立校验防止
 * API 直调绕过前端 zoneDoors 进入未发布区域。新增开放区域时两边同时加 id。
 */
export const OPEN_ZONE_IDS: readonly string[] = [
  "forest",
  "mine",
  "swamp",
  "snow",
  "volcano",
  "abyss",
  "celestial",
  "rift",
  "inferno",
  "genesis",
  "omega",
];

/** 怪物所属的关卡；内容包里没有归属任何关卡的怪返回 undefined（旧 act_combat 路径的怪不受区域门限制）。 */
export function stageForMonster(pack: EnhancedContentPack, monsterId: string) {
  return (pack.stages as Array<{ id: string; monsters?: string[] }> | undefined)?.find(
    (s) => Array.isArray(s.monsters) && s.monsters.includes(monsterId)
  );
}

/** 怪物是否位于已开放关卡。归属未发布关卡的怪禁止开战。 */
export function isMonsterInOpenZone(pack: EnhancedContentPack, monsterId: string): boolean {
  const stage = stageForMonster(pack, monsterId);
  return !stage || OPEN_ZONE_IDS.includes(stage.id);
}

/** 关卡 id 是否已开放（组队活动按 stageId 选关时用）。 */
export function isStageOpen(stageId: string): boolean {
  return OPEN_ZONE_IDS.includes(stageId);
}
