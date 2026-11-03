// 物品名称映射表
export const itemNameMap: Record<string, string> = {
  // 货币
  'gold': '金币',
  
  // 木材系列
  'wood_1': '普通原木',
  'wood_2': '优质原木', 
  'wood_3': '精品原木',
  'wood_4': '稀有原木',
  'wood_5': '珍贵原木',
  'wood_6': '传说原木',
  'wood_7': '神话原木',
  
  'lumber_1': '普通木板',
  'lumber_2': '优质木板',
  'lumber_3': '精品木板', 
  'lumber_4': '稀有木板',
  'lumber_5': '珍贵木板',
  'lumber_6': '传说木板',
  'lumber_7': '神话木板',

  'weapon_wooden_sword': '木头短剑',
  'weapon_wooden_bow': '木质长弓',
  'weapon_iron_sword': '铁剑',
  'weapon_steel_axe': '钢斧',
  'armor_wood_chest': '木制胸甲',
  'armor_wood_legs': '木制护腿',
  'armor_wood_boots': '木制靴子',
  'armor_wood_gloves': '木制手套',
  
  // 矿石系列
  'ore_1': '铜矿石',
  'ore_2': '铁矿石',
  'ore_3': '银矿石',
  'ore_4': '金矿石',
  'ore_5': '白金矿石',
  'ore_6': '秘银矿石',
  'ore_7': '精金矿石',
  
  'ingot_1': '铜锭',
  'ingot_2': '铁锭',
  'ingot_3': '银锭',
  'ingot_4': '金锭',
  'ingot_5': '白金锭',
  'ingot_6': '秘银锭',
  'ingot_7': '精金锭',
  
  // 纤维系列
  'fiber_1': '棉花',
  'fiber_2': '亚麻',
  'fiber_3': '丝绸纤维',
  'fiber_4': '魔法纤维',
  'fiber_5': '星辰纤维',
  'fiber_6': '虚空纤维',
  'fiber_7': '神圣纤维',
  
  'yarn_1': '棉线',
  'yarn_2': '亚麻线',
  'yarn_3': '丝线',
  'yarn_4': '魔法丝线',
  'yarn_5': '星辰丝线',
  'yarn_6': '虚空丝线',
  'yarn_7': '神圣丝线',
  
  // 水晶系列
  'crystal_1': '微光水晶',
  'crystal_2': '辉光水晶',
  'crystal_3': '耀光水晶',
  'crystal_4': '炽光水晶',
  'crystal_5': '圣光水晶',
  'crystal_6': '神光水晶',
  'crystal_7': '创世水晶',
  'crystal_raw': '原始水晶',
  
  // 食物系列
  'meat_raw': '生肉',
  'milk': '牛奶',
  'egg': '鸡蛋',
  'fish_1': '河鱼',
  'fish_2': '海鱼',
  'shrimp_1': '河虾',
  'fruits': '水果',
  'food_cooked': '熟食',
  
  // 兼容旧名称
  'cotton': '棉花',
  'wool_1': '羊毛',
  'wool_2': '优质羊毛',
  'wool_3': '精品羊毛'
}

// 技能名称映射表
export const skillNameMap: Record<string, string> = {
  'skill_woodcutter': '伐木技艺',
  'skill_blacksmith': '挖矿技艺',
  'skill_farmer': '农牧技艺',
  'skill_chef': '钓鱼技艺',
  'skill_tailor': '采集技艺',
  'skill_alchemist': '采晶技艺',
  'skill_woodworking': '木工技艺',
  'skill_smithing': '锻造技艺',
  'skill_husbandry': '畜牧技艺',
  'skill_cooking': '烹饪技艺',
  'skill_tailoring': '缝纫技艺',
  'skill_alchemy': '炼金技艺',
  'skill_enhancing': '强化'
}

// 职业名称映射表
export const professionNameMap: Record<string, string> = {
  'woodcutter': '伐木工',
  'blacksmith': '铁匠',
  'farmer': '农民',
  'chef': '厨师',
  'tailor': '裁缝',
  'alchemist': '炼金术师'
}

// 运行时注册表：内容包加载后把所有物品名灌进来。内容包是唯一真源，上面的静态表只做兜底
// （静态表里有些名字已经和内容包不一致，例如 wood_1 在内容包里叫“平平无奇原木”）。
const packItemNames = new Map<string, string>()

export function registerItemNames(items: Array<{ id: string; name?: string }> | undefined | null) {
  if (!Array.isArray(items)) return
  for (const item of items) {
    if (item && typeof item.id === 'string' && typeof item.name === 'string' && item.name) {
      packItemNames.set(item.id, item.name)
    }
  }
}

// 获取物品中文名称
export function getItemName(itemId: string): string {
  return packItemNames.get(itemId) || itemNameMap[itemId] || itemId
}

// 获取技能中文名称
export function getSkillName(skillId: string): string {
  return skillNameMap[skillId] || skillId
}

// 获取职业中文名称
export function getProfessionName(professionId: string): string {
  return professionNameMap[professionId] || professionId
}

// 获取简化的技能名称（去掉"技艺"后缀）
export function getSimpleSkillName(skillId: string): string {
  const fullName = getSkillName(skillId)
  return fullName.replace('技艺', '')
}