import { randFloat } from "./utils.js";

/**
 * Idle-game 特性（非官方图鉴 Ability 复刻）。
 * 效果挂在队伍「最佳值」或单只萌灵上，由 gameplay_fun 统一读取。
 */
export const ABILITIES = Object.freeze({
  earlyBird: { name: "晨练迷", desc: "训练经验 +5%", key: "trainExpBonus", val: 0.05 },
  loneWolf: { name: "独行", desc: "单独训练经验 +8%", key: "soloTrainExpBonus", val: 0.08 },
  pickup: { name: "拾球手", desc: "捕获时 10% 概率不消耗球", key: "ballSaveChance", val: 0.1 },
  synchronize: { name: "同频", desc: "研究速度 +3%", key: "researchSpeedBonus", val: 0.03 },
  thickFat: { name: "圆滚滚", desc: "饱腹恢复 +10%", key: "satietyRegenBonus", val: 0.1 },
  pressure: { name: "开路先锋", desc: "远征时间 -5%", key: "expeditionTimeBonus", val: 0.05 },
  cuteCharm: { name: "人见人爱", desc: "亲密度获取 +5%", key: "affectionBonus", val: 0.05 },
  harvest: { name: "丰收手", desc: "资源产量 +3%", key: "resProdBonus", val: 0.03 },
  keenEye: { name: "慧眼", desc: "图鉴产量加成 +2%", key: "dexBonusExtra", val: 0.02 },
  sturdy: { name: "皮实", desc: "PvE 受到伤害 -5%", key: "defDamageReduce", val: 0.05 },
  hustle: { name: "闲不住", desc: "遭遇充能恢复 +10%", key: "encounterRechargeBonus", val: 0.1 },
  illuminate: { name: "提灯者", desc: "高级遭遇未捕获偏好 +10%", key: "advEncMissingBonus", val: 0.1 },
  naturalCure: { name: "暖窝", desc: "繁殖速度 +5%", key: "breedSpeedBonus", val: 0.05 },
  stickyHold: { name: "囤囤鼠", desc: "资源上限 +2%", key: "resCapBonus", val: 0.02 },
  runAway: { name: "溜得快", desc: "逃跑必定成功", key: "alwaysEscape", val: 1 },
  gluttony: { name: "细嚼慢咽", desc: "饱腹消耗 -5%", key: "satietyDecayReduce", val: 0.05 },
  innerFocus: { name: "不气馁", desc: "捕获失败保底积累 +20%", key: "pityAccelBonus", val: 0.2 },
  hugePower: { name: "铆足劲", desc: "战力统计 +8%", key: "pvePowerBonus", val: 0.08 },
  hyperCutter: { name: "尖爪", desc: "PvE 造成伤害 +5%", key: "pveDamageBonus", val: 0.05 },
  compoundEyes: { name: "眼观八方", desc: "队伍捕获率 +4%", key: "catchRateBonus", val: 0.04 },
});

export const ABILITY_IDS = Object.freeze(Object.keys(ABILITIES));

/** 旧版「性格即被动」→ 新特性 id，用于存档迁移 */
export const LEGACY_NATURE_TO_ABILITY = Object.freeze({
  adamant: "earlyBird",
  lonely: "loneWolf",
  timid: "pickup",
  serious: "synchronize",
  relaxed: "thickFat",
  impish: "pressure",
  jolly: "cuteCharm",
  calm: "harvest",
  modest: "keenEye",
  bold: "sturdy",
  hasty: "hustle",
  naive: "illuminate",
  mild: "naturalCure",
  lax: "stickyHold",
  naughty: "runAway",
  gentle: "gluttony",
  hardy: "innerFocus",
  docile: "innerFocus",
  bashful: "innerFocus",
  quirky: "innerFocus",
  brave: "hyperCutter",
  quiet: "synchronize",
  rash: "earlyBird",
  sassy: "sturdy",
  careful: "pickup",
});

export function getAbilityInfo(abilityId) {
  if (typeof abilityId !== "string") return null;
  return ABILITIES[abilityId] || null;
}

export function rollAbility() {
  const i = Math.floor(randFloat() * ABILITY_IDS.length);
  return ABILITY_IDS[Math.max(0, Math.min(ABILITY_IDS.length - 1, i))];
}

/** Resolve passive effect object for a mon (ability preferred; legacy nature fallback). */
export function monPassive(mon) {
  const ab = getAbilityInfo(mon?.ability);
  if (ab) return ab;
  const legacyId = LEGACY_NATURE_TO_ABILITY[mon?.nature];
  return legacyId ? ABILITIES[legacyId] : null;
}

export function ensureMonAbility(mon) {
  if (!mon || typeof mon !== "object") return null;
  if (getAbilityInfo(mon.ability)) return mon.ability;
  const fromNature = LEGACY_NATURE_TO_ABILITY[mon.nature];
  mon.ability = fromNature && ABILITIES[fromNature] ? fromNature : rollAbility();
  return mon.ability;
}
