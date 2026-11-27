import type { EnhancedPlayerState } from "./types";
import { MAX_SKILL_LEVEL, xpForLevel } from "./growth_curves";

/**
 * 升级经验曲线的存档迁移。存档里存的是「等级 + 本级内经验」，所以换曲线时等级不动，
 * 本级内经验按原来的百分比换算到新曲线，玩家看到的进度条位置不变。
 * 强化等级、房屋等级、装备、战斗技能书等级不受影响，原样保留。
 * 任务点同批换算：谢礼门槛由 50 点改为 40 点，已攒的点数按比例折算，已可领的谢礼仍可领。
 */
export const CURRENT_CURVE_VERSION = 2;

/** 第 1 版曲线（2026-11 之前的存档），只用于换算，不再用于升级判定。 */
export function legacyXpForLevelV1(level: number): number {
  if (level < 1) return 0;
  if (level >= MAX_SKILL_LEVEL) return Infinity;
  const at15 = Math.floor(40 * Math.pow(15, 1.35));
  if (level <= 15) return Math.floor(40 * Math.pow(level, 1.35));
  const at30 = Math.floor(at15 + 65 * Math.pow(15, 1.65));
  if (level <= 30) return Math.floor(at15 + 65 * Math.pow(level - 15, 1.65));
  const at100 = Math.floor(at30 + 56 * Math.pow(70, 1.96));
  if (level <= 100) return Math.floor(at30 + 56 * Math.pow(level - 30, 1.96));
  const d = level - 100;
  return Math.floor(at100 + 9500 * d + 110 * Math.pow(d, 2.15));
}

/** 换算一条技能的进度，返回新对象（不改传入的对象）。等级只会不变，或因旧经验溢出而上升。 */
export function rescaleSkillProgress<T extends { level: number; xp: number }>(skill: T): T {
  if (!skill || !Number.isFinite(skill.level) || !Number.isFinite(skill.xp) || skill.xp <= 0) return skill;
  let { level, xp } = skill;
  // 旧档里偶尔有已经攒够却没结算的经验，先按旧曲线升完，避免换算时丢掉
  let need = legacyXpForLevelV1(level);
  while (level < MAX_SKILL_LEVEL && need > 0 && xp >= need) {
    xp -= need;
    level += 1;
    need = legacyXpForLevelV1(level);
  }
  const target = xpForLevel(level);
  // 满级或脏等级：没有「本级百分比」可算，经验原样留着
  if (!Number.isFinite(need) || need <= 0 || !Number.isFinite(target)) return { ...skill, level, xp };
  const scaled = Math.round((xp / need) * target * 1000) / 1000;
  return { ...skill, level, xp: Math.min(scaled, target - 0.001) };
}

function rescaleAll<T extends Record<string, { level: number; xp: number }>>(skills: T): T {
  return Object.fromEntries(Object.entries(skills).map(([id, s]) => [id, rescaleSkillProgress(s)])) as T;
}

/**
 * 一次性迁移：没有版本号的存档视为第 1 版。重复调用不会再改数值。
 * 技能表整体换成新对象：结算会对存档做浅拷贝，原地改会让没写回的那份被换算两次。
 */
export function migratePlayerCurves(player: EnhancedPlayerState): boolean {
  if ((player.curveVersion ?? 1) >= CURRENT_CURVE_VERSION) return false;
  if (player.skills) player.skills = rescaleAll(player.skills);
  if (player.combatSkills) player.combatSkills = rescaleAll(player.combatSkills);
  const points = Number(player.tasksState?.points);
  if (player.tasksState && Number.isFinite(points) && points > 0) {
    player.tasksState = { ...player.tasksState, points: Math.ceil((points * 4) / 5) };
  }
  player.curveVersion = CURRENT_CURVE_VERSION;
  return true;
}

/** 换算一条技能的进度回第 1 版曲线：等级不动，本级百分比不变。 */
function revertSkillProgress<T extends { level: number; xp: number }>(skill: T): T {
  if (!skill || !Number.isFinite(skill.level) || !Number.isFinite(skill.xp) || skill.xp <= 0) return skill;
  const need = xpForLevel(skill.level);
  const target = legacyXpForLevelV1(skill.level);
  if (!Number.isFinite(need) || need <= 0 || !Number.isFinite(target) || target <= 0) return skill;
  return { ...skill, xp: Math.min(Math.round((skill.xp / need) * target * 1000) / 1000, target - 0.001) };
}

/**
 * migratePlayerCurves 的逆运算，只给回滚脚本用（backend/scripts/curve-rollback.ts）。
 * 去掉版本号，所以再升级回来时会自动重新换算，中间旧版本打出来的经验也按旧曲线算，不会混。
 */
export function revertPlayerCurves(player: EnhancedPlayerState): boolean {
  if ((player.curveVersion ?? 1) < CURRENT_CURVE_VERSION) return false;
  const all = <T extends Record<string, { level: number; xp: number }>>(skills: T): T =>
    Object.fromEntries(Object.entries(skills).map(([id, sk]) => [id, revertSkillProgress(sk)])) as T;
  if (player.skills) player.skills = all(player.skills);
  if (player.combatSkills) player.combatSkills = all(player.combatSkills);
  const points = Number(player.tasksState?.points);
  if (player.tasksState && Number.isFinite(points) && points > 0) {
    player.tasksState = { ...player.tasksState, points: Math.floor((points * 5) / 4) };
  }
  delete player.curveVersion;
  return true;
}
