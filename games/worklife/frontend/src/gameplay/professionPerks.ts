export type ProfessionId = "woodcutter" | "blacksmith" | "farmer" | "chef" | "tailor" | "alchemist";

export interface ProfessionPerkDef {
  id: ProfessionId;
  traitName: string;
  shortTag: string;
  combatAndUtilityDesc: string;
  masteryDesc: string;
}

export const PROFESSION_PERKS: Record<ProfessionId, ProfessionPerkDef> = {
  woodcutter: {
    id: "woodcutter",
    traitName: "林场老手",
    shortTag: "工具磨损 -50% · 单人森林金币 +15%",
    combatAndUtilityDesc: "采集/制作工具耐久磨损 -50%，单人森林战斗金币 +15%",
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
    shortTag: "食物与生命药水回血 +20%",
    combatAndUtilityDesc: "食物、料理与生命药水回血量 +20%",
    masteryDesc: "本职（钓鱼/烹饪）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  tailor: {
    id: "tailor",
    traitName: "寻宝巧手",
    shortTag: "战斗稀有掉率 +15%",
    combatAndUtilityDesc: "怪物稀有掉落率 +15%",
    masteryDesc: "本职（采集/缝纫）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
  alchemist: {
    id: "alchemist",
    traitName: "药效延展",
    shortTag: "食物与药剂增益时长 +25%",
    combatAndUtilityDesc: "食物、药剂与饮品增益持续时间 +25%",
    masteryDesc: "本职（水晶/炼金）5 级起速度 +5%，每 5 级效率 +1%（最高 +10%）",
  },
};

export function getProfessionPerk(id?: string): ProfessionPerkDef {
  return PROFESSION_PERKS[(id as ProfessionId) || "woodcutter"] || PROFESSION_PERKS.woodcutter;
}
