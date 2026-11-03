export type ProfessionId = "woodcutter" | "blacksmith" | "farmer" | "chef" | "tailor" | "alchemist";

export interface ProfessionPerkDef {
  id: ProfessionId;
  traitName: string;
  shortTag: string;
  combatAndUtilityDesc: string;
  masteryDesc: string;
}

/**
 * 轻量级无膨胀职业专长定义（前后端同口径）：
 * 1. 本职专精（Lv.5 起）：当主职业与正在执行的采集/制作技能对口时，速度 +5%，且每满 5 级额外 +1% 效率（最高 +10%）。
 * 2. 职业独有特质（1 级即生效，不改动基础攻防血，零数值膨胀）：
 *    - 伐木工：工具耐久磨损 -50%，森林区域战斗金币 +15%
 *    - 铁匠：战斗中全身装备耐久磨损 -40%
 *    - 农夫：脱战生命自然恢复速度 +50%（40秒回满）
 *    - 厨师：食物与料理生命恢复量 +20%
 *    - 裁缝：采集与战斗稀有掉落率（Rare Find）+15%
 *    - 炼金术师：药剂与饮品增益持续时间 +25%
 */
export const PROFESSION_PERKS: Record<ProfessionId, ProfessionPerkDef> = {
  woodcutter: {
    id: "woodcutter",
    traitName: "林场老手",
    shortTag: "工具磨损 -50% · 森林金币 +15%",
    combatAndUtilityDesc: "采集/制作工具耐久磨损 -50%，森林战斗金币 +15%",
    masteryDesc: "本职（伐木/木工）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  blacksmith: {
    id: "blacksmith",
    traitName: "淬火养护",
    shortTag: "战斗装备耐久磨损 -40%",
    combatAndUtilityDesc: "战斗中全身武器与防具耐久磨损 -40%",
    masteryDesc: "本职（挖矿/锻造）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  farmer: {
    id: "farmer",
    traitName: "大地生机",
    shortTag: "脱战生命恢复速度 +50%",
    combatAndUtilityDesc: "脱战后生命自然恢复速度 +50%（40 秒回满）",
    masteryDesc: "本职（种植/畜牧）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  chef: {
    id: "chef",
    traitName: "主厨秘方",
    shortTag: "料理与食物回血量 +20%",
    combatAndUtilityDesc: "战斗进食与日常食用料理恢复生命值 +20%",
    masteryDesc: "本职（钓鱼/烹饪）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  tailor: {
    id: "tailor",
    traitName: "寻宝巧手",
    shortTag: "采集与战斗稀有掉率 +15%",
    combatAndUtilityDesc: "采集伴生与怪物稀有掉落率（Rare Find）+15%",
    masteryDesc: "本职（采集/缝纫）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  alchemist: {
    id: "alchemist",
    traitName: "药效延展",
    shortTag: "药剂与饮品增益时长 +25%",
    combatAndUtilityDesc: "饮用药剂/饮品获得的增益持续时间 +25%",
    masteryDesc: "本职（水晶/炼金）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
};

export const MASTERY_MIN_LEVEL = 5;
export const MASTERY_SPEED_MUL = 1.05;
export const MASTERY_MAX_EFF_PCT = 10;

export function professionMasteryBonuses(
  activeClassId: string | undefined,
  skillId: string | undefined,
  skillLevel: number,
  gatherByProf: Record<string, string>,
  craftByProf: Record<string, string>
): { active: boolean; speedMul: number; efficiencyPct: number } {
  if (!activeClassId || !skillId || skillLevel < MASTERY_MIN_LEVEL) {
    return { active: false, speedMul: 1, efficiencyPct: 0 };
  }
  const matches = gatherByProf[activeClassId] === skillId || craftByProf[activeClassId] === skillId;
  if (!matches) return { active: false, speedMul: 1, efficiencyPct: 0 };
  return {
    active: true,
    speedMul: MASTERY_SPEED_MUL,
    efficiencyPct: Math.min(MASTERY_MAX_EFF_PCT, Math.floor(skillLevel / 5)),
  };
}
