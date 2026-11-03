export const COMBAT_SKILL_LABEL: Record<string, string> = {
  stamina: '耐力',
  intelligence: '智力',
  attack: '攻击',
  defense: '防御',
  melee: '近战',
  ranged: '远程',
  magic: '魔法',
}

export type ActiveTab =
  | 'logging'
  | 'woodworking'
  | 'mining'
  | 'smithing'
  | 'farming'
  | 'husbandry'
  | 'fishing'
  | 'cooking'
  | 'gathering'
  | 'tailoring'
  | 'crystal_mining'
  | 'alchemy'
  | 'adventure'
  | 'enhance'
  | 'trading'
  | 'party'
  | 'character'
  | 'inventory'
  | 'tasks'
  | 'houses'

export interface CurrentActivity {
  name: string
  output: string
  duration: number // 秒
  mark?: string
  actionId?: string
}

export type ProfessionId = 'woodcutter' | 'blacksmith' | 'farmer' | 'chef' | 'tailor' | 'alchemist'

export interface ProfessionConfig {
  id: ProfessionId
  name: string
  icon: string
  skill: string
  craftSkill: string
  gatherName: string
  gatherTab: ActiveTab
  craftName: string
  craftTab: ActiveTab
}

export const PROFESSIONS: Record<ProfessionId, ProfessionConfig> = {
  woodcutter: {
    id: 'woodcutter',
    name: '伐木工',
    icon: '🪓',
    skill: 'skill_woodcutter',
    craftSkill: 'skill_woodworking',
    gatherName: '伐木',
    gatherTab: 'logging',
    craftName: '木工',
    craftTab: 'woodworking',
  },
  blacksmith: {
    id: 'blacksmith',
    name: '铁匠',
    icon: '⚒️',
    skill: 'skill_blacksmith',
    craftSkill: 'skill_smithing',
    gatherName: '挖矿',
    gatherTab: 'mining',
    craftName: '锻造',
    craftTab: 'smithing',
  },
  farmer: {
    id: 'farmer',
    name: '农夫',
    icon: '🌾',
    skill: 'skill_farmer',
    craftSkill: 'skill_husbandry',
    gatherName: '种植',
    gatherTab: 'farming',
    craftName: '畜牧',
    craftTab: 'husbandry',
  },
  chef: {
    id: 'chef',
    name: '厨师',
    icon: '👨‍🍳',
    skill: 'skill_chef',
    craftSkill: 'skill_cooking',
    gatherName: '钓鱼',
    gatherTab: 'fishing',
    craftName: '烹饪',
    craftTab: 'cooking',
  },
  tailor: {
    id: 'tailor',
    name: '裁缝',
    icon: '🧵',
    skill: 'skill_tailor',
    craftSkill: 'skill_tailoring',
    gatherName: '采集',
    gatherTab: 'gathering',
    craftName: '缝纫',
    craftTab: 'tailoring',
  },
  alchemist: {
    id: 'alchemist',
    name: '炼金术师',
    icon: '🧪',
    skill: 'skill_alchemist',
    craftSkill: 'skill_alchemy',
    gatherName: '水晶',
    gatherTab: 'crystal_mining',
    craftName: '炼金',
    craftTab: 'alchemy',
  },
}

// 树木数据 - 等级要求: 1, 20, 35, 50, 65, 80, 100
export const trees = [
  { id: 'poplar', actionId: 'act_chop_wood_t1', name: '路边的小白杨', icon: '🌱', desc: '最卑微的树，异世界到处都是', level: 1, xp: 10, output: '平平无奇原木', outputRange: '1', rare: '小树枝', rareChance: 2, time: 5 },
  { id: 'fir', actionId: 'act_chop_wood_t2', name: '嘴硬的铁杉', icon: '🌲', desc: '木质坚硬的铁杉树', level: 20, xp: 20, output: '坚硬原木', outputRange: '1', rare: '铁杉果', rareChance: 3, time: 10 },
  { id: 'willow', actionId: 'act_chop_wood_t3', name: '极度社恐的垂柳', icon: '🌿', desc: '总是低着头的垂柳树', level: 35, xp: 30, output: '柔韧原木', outputRange: '1', rare: '柳枝', rareChance: 5, time: 15 },
  { id: 'birch', actionId: 'act_chop_wood_t4', name: '健身中的桦树', icon: '🌳', desc: '树干笔直全是肌肉', level: 50, xp: 40, output: '白桦原木', outputRange: '1', rare: '桦树皮', rareChance: 4, time: 20 },
  { id: 'rosewood', actionId: 'act_chop_wood_t5', name: '自带滤镜幻霞木', icon: '🌸', desc: '树中"网红"', level: 65, xp: 50, output: '幻霞原木', outputRange: '1', rare: '霞光碎片', rareChance: 3, time: 25 },
  { id: 'cypress', actionId: 'act_chop_wood_t6', name: '老板级别的古龙柏', icon: '🎄', desc: '威严的古老龙柏', level: 80, xp: 60, output: '龙柏原木', outputRange: '1', rare: '龙鳞', rareChance: 2, time: 30 },
  { id: 'divine', actionId: 'act_chop_wood_t7', name: '想退休的界外神木', icon: '✨', desc: '传说中的神木', level: 100, xp: 80, output: '神木原木', outputRange: '1', rare: '神木精华', rareChance: 1, time: 40 },
  { id: 'starwood', actionId: 'act_chop_wood_t8', name: '云端上的星辰木', icon: '🌠', desc: '生长于云端，木纹流转着星光', level: 105, xp: 90, output: '星辰木', outputRange: '1', rare: '星尘', rareChance: 1, time: 50 },
  { id: 'eternalwood', actionId: 'act_chop_wood_t9', name: '世界之树永恒神木', icon: '🌳', desc: '传说中世界之树的枝干，永不腐朽', level: 115, xp: 120, output: '永恒神木', outputRange: '1', rare: '世界碎片', rareChance: 1, time: 60 },
  { id: 'hellfirewood', actionId: 'act_chop_wood_t10', name: '炼狱业火焚天树', icon: '🔥', desc: '燃烧着不灭业火的炼狱古木，触之成灰', level: 125, xp: 160, output: '炼狱焚天木', outputRange: '1', rare: '世界碎片', rareChance: 1, time: 72 },
  { id: 'genesiswood', actionId: 'act_chop_wood_t11', name: '创世初生神树', icon: '🌟', desc: '诞生于创世之初的神树，蕴含本源之力', level: 135, xp: 200, output: '创世神木', outputRange: '1', rare: '创世之种', rareChance: 1, time: 85 },
  { id: 'omegawood', actionId: 'act_chop_wood_t12', name: '万界终焉之木', icon: '🌑', desc: '生长于世界尽头的终焉之木，超越时空', level: 145, xp: 260, output: '终焉之木', outputRange: '1', rare: '万界之心', rareChance: 1, time: 98 },
]

// 矿石数据 - 等级要求: 1, 20, 35, 50, 65, 80, 100
export const ores = [
  { id: 'copper', actionId: 'act_mine_ore_t1', name: '铜矿脉', desc: '最常见的矿石，到处都是', level: 1, xp: 10, output: '铜矿石', outputRange: '1', rare: '碎石', rareChance: 2, time: 5 },
  { id: 'iron', actionId: 'act_mine_ore_t2', name: '铁矿脉', desc: '坚硬的铁矿石', level: 20, xp: 20, output: '铁矿石', outputRange: '1', rare: '铁矿渣', rareChance: 3, time: 10 },
  { id: 'silver', actionId: 'act_mine_ore_t3', name: '银矿脉', desc: '闪闪发光的银矿石', level: 35, xp: 30, output: '银矿石', outputRange: '1', rare: '银矿渣', rareChance: 5, time: 15 },
  { id: 'gold', actionId: 'act_mine_ore_t4', name: '金矿脉', desc: '珍贵的金矿石', level: 50, xp: 40, output: '金矿石', outputRange: '1', rare: '金矿渣', rareChance: 4, time: 20 },
  { id: 'platinum', actionId: 'act_mine_ore_t5', name: '白金矿脉', desc: '稀有的白金矿石', level: 65, xp: 50, output: '白金矿石', outputRange: '1', rare: '白金碎片', rareChance: 3, time: 25 },
  { id: 'mithril', actionId: 'act_mine_ore_t6', name: '秘银矿脉', desc: '传说中的秘银矿石', level: 80, xp: 60, output: '秘银矿石', outputRange: '1', rare: '秘银精华', rareChance: 2, time: 30 },
  { id: 'adamantite', actionId: 'act_mine_ore_t7', name: '精金矿脉', desc: '最坚硬的矿石', level: 100, xp: 80, output: '精金矿石', outputRange: '1', rare: '精金之心', rareChance: 1, time: 40 },
  { id: 'darkiron', actionId: 'act_mine_ore_t8', name: '玄铁矿脉', desc: '深埋地心的玄铁，沉重而坚不可摧', level: 110, xp: 100, output: '玄铁矿石', outputRange: '1', rare: '玄铁碎片', rareChance: 1, time: 55 },
  { id: 'divinemithril', actionId: 'act_mine_ore_t9', name: '神域秘银矿脉', desc: '只存在于神域的秘银，锅造神器的根本', level: 120, xp: 130, output: '神域秘银', outputRange: '1', rare: '秘银精华', rareChance: 1, time: 65 },
  { id: 'hellfireore', actionId: 'act_mine_ore_t10', name: '炼狱业火矿脉', desc: '蕴含炼狱业火的矿石，灼热无比', level: 125, xp: 160, output: '业火矿石', outputRange: '1', rare: '炼狱之核', rareChance: 1, time: 72 },
  { id: 'genesisore', actionId: 'act_mine_ore_t11', name: '创世本源矿脉', desc: '凝聚创世本源能量的矿石，闪耀神辉', level: 135, xp: 200, output: '本源矿石', outputRange: '1', rare: '神性精华', rareChance: 1, time: 85 },
  { id: 'omegaore', actionId: 'act_mine_ore_t12', name: '万界终焉矿脉', desc: '从世界尽头开采的终极矿石，无坚不摧', level: 145, xp: 260, output: '终焉矿石', outputRange: '1', rare: '万界之心', rareChance: 1, time: 98 },
]

// 农作物数据 - 等级要求: 1, 35, 65, 100
export const crops = [
  { id: 'cotton', actionId: 'act_plant_cotton_t1', name: '棉花田', desc: '柔软的棉花田', level: 1, xp: 10, output: '棉花', outputRange: '2', rare: '棉花种子', rareChance: 5, time: 8 },
  { id: 'wheat', actionId: 'act_plant_flax_t2', name: '亚麻田', desc: '优质的亚麻田', level: 20, xp: 30, output: '亚麻', outputRange: '2', rare: '亚麻籽', rareChance: 4, time: 15 },
  { id: 'rice', actionId: 'act_plant_silk_t3', name: '蚕桑园', desc: '产出丝绸纤维的蚕桑', level: 35, xp: 50, output: '丝绸纤维', outputRange: '2', rare: '金蚕丝', rareChance: 3, time: 25 },
  { id: 'magic_herb', actionId: 'act_plant_magic_t4', name: '魔法植物园', desc: '蕴含魔力的纤维植物', level: 50, xp: 40, output: '魔法纤维', outputRange: '2', rare: '草药精华', rareChance: 2, time: 24 },
  { id: 'star_cotton', actionId: 'act_plant_fiber_t5', name: '星辰棉田', desc: '吸收星光生长的星辰棉', level: 65, xp: 55, output: '星辰纤维', outputRange: '2', rare: '星尘', rareChance: 2, time: 28 },
  { id: 'void_flax', actionId: 'act_plant_fiber_t6', name: '虚空麻田', desc: '在虚空缝隙中生长的麻', level: 80, xp: 65, output: '虚空纤维', outputRange: '2', rare: '虚空碎片', rareChance: 2, time: 32 },
  { id: 'holy_herb', actionId: 'act_plant_fiber_t7', name: '神圣灵草园', desc: '沐浴圣光的神圣灵草', level: 100, xp: 85, output: '神圣纤维', outputRange: '2', rare: '神木精华', rareChance: 1, time: 40 },
  { id: 'starshine_grass', actionId: 'act_plant_fiber_t8', name: '星辉蛛草园', desc: '叶片闪耀星辉的蛛丝草', level: 110, xp: 100, output: '星辉蛛丝', outputRange: '2', rare: '星尘', rareChance: 1, time: 50 },
  { id: 'rune_grass', actionId: 'act_plant_fiber_t9', name: '神纹灵草园', desc: '叶脉浮现神纹的灵草', level: 120, xp: 130, output: '神纹灵丝', outputRange: '2', rare: '世界碎片', rareChance: 1, time: 60 },
  { id: 'meteor_grass', actionId: 'act_plant_fiber_t10', name: '星陨神草园', desc: '由陨星之力滋养的神草', level: 125, xp: 160, output: '星陨神丝', outputRange: '2', rare: '炼狱之核', rareChance: 1, time: 72 },
  { id: 'genesis_grass', actionId: 'act_plant_fiber_t11', name: '创世圣草园', desc: '诞生于创世之力的圣草', level: 135, xp: 200, output: '创世圣丝', outputRange: '2', rare: '神性精华', rareChance: 1, time: 85 },
  { id: 'omega_grass', actionId: 'act_plant_fiber_t12', name: '寰宇梵草园', desc: '超越时空的终极梵草', level: 145, xp: 260, output: '寰宇梵丝', outputRange: '2', rare: '万界之心', rareChance: 1, time: 98 },
]

// 钓鱼数据 - 等级要求: 1, 35, 65
export const fishingSpots = [
  { id: 'river', actionId: 'act_fish_river_t1', name: '清澈小河', desc: '平静的河流，适合新手', level: 1, xp: 10, output: '河鱼', outputRange: '1', rare: '河虾', rareChance: 10, time: 6 },
  { id: 'ocean', actionId: 'act_fish_sea_t2', name: '无尽海洋', desc: '波涛汹涌的大海', level: 20, xp: 20, output: '海鱼', outputRange: '1', rare: '龙虾', rareChance: 3, time: 12 },
  { id: 'lake', actionId: 'act_fish_t3', name: '深邃湖泊', desc: '深不见底的湖泊', level: 35, xp: 35, output: '湖鱼', outputRange: '1', rare: '珍珠', rareChance: 5, time: 16 },
  { id: 'deepsea', actionId: 'act_fish_t4', name: '幽暗深海', desc: '漆黑幽深的海域', level: 50, xp: 45, output: '深海鱼', outputRange: '1', rare: '深海珍珠', rareChance: 3, time: 20 },
  { id: 'abyss_sea', actionId: 'act_fish_t5', name: '渊海深处', desc: '潜伏巨鱼的深渊海域', level: 65, xp: 55, output: '渊海巨鱼', outputRange: '1', rare: '渊海之鳞', rareChance: 2, time: 25 },
  { id: 'frost_sea', actionId: 'act_fish_t6', name: '寒霜水域', desc: '冰封的极寒水域', level: 80, xp: 65, output: '寒霜冰鱼', outputRange: '1', rare: '寒冰结晶', rareChance: 2, time: 30 },
  { id: 'lava_sea', actionId: 'act_fish_t7', name: '熔岩火湖', desc: '炽热的岩浆湖泊', level: 100, xp: 85, output: '熔岩火鱼', outputRange: '1', rare: '火焰精华', rareChance: 1, time: 40 },
  { id: 'star_sea', actionId: 'act_fish_t8', name: '星界之海', desc: '漂浮于星界的发光水域', level: 110, xp: 100, output: '星界游鱼', outputRange: '1', rare: '星尘', rareChance: 1, time: 50 },
  { id: 'dragon_abyss', actionId: 'act_fish_t9', name: '龙渊深潭', desc: '盘踞神鱼的龙渊', level: 120, xp: 130, output: '龙渊神鱼', outputRange: '1', rare: '龙鳞', rareChance: 1, time: 60 },
]

// 纤维采集数据 - 等级要求: 1, 35, 65
export const fiberSpots = [
  { id: 'cotton_wild', actionId: 'act_gather_fiber_t1', name: '野生棉花', desc: '野外的棉花丛', level: 1, xp: 10, output: '棉花', outputRange: '1', rare: '棉絮', rareChance: 5, time: 5 },
  { id: 'linen', actionId: 'act_gather_fiber_t2', name: '亚麻田', desc: '优质的亚麻纤维', level: 35, xp: 30, output: '亚麻', outputRange: '1', rare: '亚麻籽', rareChance: 4, time: 15 },
  { id: 'silk', actionId: 'act_gather_fiber_t3', name: '丝绸蚕茧', desc: '珍贵的丝绸纤维', level: 65, xp: 50, output: '丝绸纤维', outputRange: '1', rare: '金蚕丝', rareChance: 3, time: 25 },
]

// 水晶采集数据 - 等级要求: 1, 35, 65
export const crystalSpots = [
  { id: 'crystal_small', actionId: 'act_mine_crystal_t1', name: '微光水晶矿', desc: '散发微弱光芒的水晶矿', level: 1, xp: 10, output: '微光水晶', outputRange: '1', rare: '水晶碎片', rareChance: 5, time: 6 },
  { id: 'crystal_medium', actionId: 'act_mine_crystal_t2', name: '辉光水晶矿', desc: '闪耀着光芒的水晶矿', level: 35, xp: 30, output: '辉光水晶', outputRange: '1', rare: '水晶核心', rareChance: 4, time: 15 },
  { id: 'crystal_large', actionId: 'act_mine_crystal_t3', name: '圣光水晶矿', desc: '神圣的水晶矿脉', level: 65, xp: 50, output: '圣光水晶', outputRange: '1', rare: '水晶之心', rareChance: 3, time: 25 },
  { id: 'crystal_star', actionId: 'act_mine_crystal_t8', name: '星界水晶矿', desc: '汲取星辰之力的水晶，蕴含磅礴魔力', level: 105, xp: 95, output: '星界水晶', outputRange: '1', rare: '星界碎片', rareChance: 2, time: 55 },
  { id: 'crystal_eternal', actionId: 'act_mine_crystal_t9', name: '永恒之心矿', desc: '凝聚永恒能量的水晶之心，创世的火种', level: 115, xp: 130, output: '永恒之心', outputRange: '1', rare: '永恒碎片', rareChance: 1, time: 65 },
  { id: 'crystal_hellfire', actionId: 'act_mine_crystal_t10', name: '炼狱业火晶矿', desc: '封存炼狱业火的晶体，蕴含毁灭之力', level: 125, xp: 165, output: '业火水晶', outputRange: '1', rare: '炼狱之核', rareChance: 1, time: 72 },
  { id: 'crystal_genesis', actionId: 'act_mine_crystal_t11', name: '创世本源晶矿', desc: '创世之初凝结的本源晶体，光华夺目', level: 135, xp: 205, output: '本源水晶', outputRange: '1', rare: '神性精华', rareChance: 1, time: 85 },
  { id: 'crystal_omega', actionId: 'act_mine_crystal_t12', name: '万界终焉晶矿', desc: '世界尽头的终极水晶，蕴含寰宇之力', level: 145, xp: 265, output: '终焉水晶', outputRange: '1', rare: '万界之心', rareChance: 1, time: 98 },
]

export const GATHER_FLAVOR_BY_ACTION: Record<string, { cardId: string; desc: string; title: string }> = Object.fromEntries(
  [...trees, ...ores, ...crops, ...fishingSpots, ...fiberSpots, ...crystalSpots].map((c) => [c.actionId, { cardId: c.id, desc: c.desc, title: c.name }])
)

export const GATHER_PAGES: Record<string, { skillId: string; title: string; blurb: string; profession: ProfessionId }> = {
  logging: { skillId: 'skill_woodcutter', title: '伐木', blurb: '砍伐各种树木，收集木材资源', profession: 'woodcutter' },
  mining: { skillId: 'skill_blacksmith', title: '挖矿', blurb: '挖掘各种矿石，收集珍贵的矿物资源', profession: 'blacksmith' },
  farming: { skillId: 'skill_farmer', title: '种植与饲养', blurb: '种植纤维作物、饲养牲畜，收获纺织原料与食材', profession: 'farmer' },
  fishing: { skillId: 'skill_chef', title: '钓鱼', blurb: '钓取各种鱼类和虾类，获取新鲜食材', profession: 'chef' },
  gathering: { skillId: 'skill_tailor', title: '采集', blurb: '采集棉花和羊毛，收集纺织原料', profession: 'tailor' },
  crystal_mining: { skillId: 'skill_alchemist', title: '水晶', blurb: '采集和分解水晶，获取魔法材料', profession: 'alchemist' },
}

export const CRAFT_PAGES: Record<string, { title: string; blurb: string; profession: ProfessionId }> = {
  woodworking: { title: '木工', blurb: '加工原木成木板，制作木质武器、装备和工具', profession: 'woodcutter' },
  smithing: { title: '锻造', blurb: '精炼矿石成金属锭，打造战士装备、工具和武器', profession: 'blacksmith' },
  husbandry: { title: '畜牧', blurb: '加工农牧产出，制作农夫的工具与布甲', profession: 'farmer' },
  cooking: { title: '烹饪', blurb: '烹饪美味的食物和饮料，提供战斗增益和工作效率', profession: 'chef' },
  tailoring: { title: '缝纫', blurb: '加工羊毛和纱线，制作职业装备和战斗装备', profession: 'tailor' },
  alchemy: { title: '炼金', blurb: '调制药水与灵药，打造魔法法杖与饰品', profession: 'alchemist' },
}

export const CRAFT_CATEGORY_LABELS: Record<string, string> = {
  materials: '材料',
  weapons: '武器',
  equipment: '防具',
  consumables: '消耗品',
  accessories: '饰品',
}

export function activityMarkFromAction(actionId: string): string {
  const id = actionId.toLowerCase()
  if (id.includes("combat")) return "战"
  if (id.includes("craft") || id.includes("cook") || id.includes("smith") || id.includes("tailor") || id.includes("alch")) return "制"
  if (id.includes("chop") || id.includes("logging")) return "伐"
  if (id.includes("crystal")) return "晶"
  if (id.includes("mine")) return "矿"
  if (id.includes("farm") || id.includes("plant") || id.includes("crop")) return "农"
  if (id.includes("fish")) return "渔"
  if (id.includes("gather")) return "采"
  return "工"
}

export const UI_SLOT_TO_EQ: Record<string, "main_hand" | "off_hand" | "head" | "chest" | "legs" | "feet" | "hands" | "accessory1" | "accessory2" | "tool"> = {
  mainhand: "main_hand",
  offhand: "off_hand",
  head: "head",
  chest: "chest",
  legs: "legs",
  feet: "feet",
  hands: "hands",
  accessory1: "accessory1",
  accessory2: "accessory2",
  tool: "tool",
}

export const EQUIP_SLOTS = {
  left: [
    { id: 'mainhand', name: '主手', icon: '⚔️', type: 'weapon' },
    { id: 'chest', name: '上衣', icon: '👕', type: 'armor' },
    { id: 'legs', name: '裤子', icon: '👖', type: 'armor' },
    { id: 'feet', name: '鞋子', icon: '👟', type: 'armor' },
    { id: 'hands', name: '手套', icon: '🧤', type: 'armor' },
  ],
  right: [
    { id: 'tool', name: '工具', icon: '🪓', type: 'tool' },
    { id: 'offhand', name: '副手', icon: '🛡️', type: 'shield' },
    { id: 'head', name: '帽子', icon: '🎩', type: 'armor' },
    { id: 'accessory1', name: '饰品', icon: '💍', type: 'accessory' },
    { id: 'accessory2', name: '饰品', icon: '📿', type: 'accessory' },
  ],
}

export const PRODUCTION_TEAS: Array<{
  id: string
  name: string
  tag: string
  desc: string
  craftSource: string
  buffId: string
}> = [
  {
    id: 'tea_spirit',
    name: '灵茶',
    tag: '经验 +12%',
    desc: '由【烹饪 Lv.40】使用灵草×2窨制而成，饮用后 10 分钟内所有技能经验获取 +12%',
    craftSource: '烹饪 Lv.40 制作',
    buffId: 'buff_tea_spirit',
  },
  {
    id: 'potion_craft_focus',
    name: '专注药剂',
    tag: '采制速度 +20%',
    desc: '由【炼金 Lv.12】使用辉光水晶×2调制而成，饮用后 10 分钟内采集与制作速度 +20%',
    craftSource: '炼金 Lv.12 制作',
    buffId: 'buff_focus',
  },
  {
    id: 'potion_scholar',
    name: '智者药剂',
    tag: '全经验 +25%',
    desc: '由【炼金 Lv.20】使用圣光水晶×2、元素核心×1调制而成，饮用后 15 分钟内所有经验获取 +25%',
    craftSource: '炼金 Lv.20 制作',
    buffId: 'buff_scholar',
  },
  {
    id: 'potion_fortune',
    name: '幸运药剂',
    tag: '金币/产出 +25%',
    desc: '由【炼金 Lv.20】使用圣光水晶×2、幽灵精华×1调制而成，饮用后 15 分钟内金币收益 +25%',
    craftSource: '炼金 Lv.20 制作',
    buffId: 'buff_fortune',
  },
]

export function getTierName(tier: number): string {
  const tierNames: Record<number, string> = {
    1: '普通',
    2: '优质',
    3: '精品',
    4: '稀有',
    5: '珍贵',
    6: '传说',
    7: '神话',
    8: '太古',
    9: '神赐',
    10: '炼狱',
    11: '创世',
    12: '终焉',
  }
  return tierNames[tier] || '未知'
}

const LEGACY_ITEM_INFO_MAP: Record<string, { name: string; tier: number; type: string; description: string }> = {
  wood_1: { name: '平平无奇原木', tier: 1, type: 'material', description: '最基础的木材' },
  wood_2: { name: '坚硬原木', tier: 2, type: 'material', description: '品质不错的木材' },
  wood_3: { name: '柔韧原木', tier: 3, type: 'material', description: '柔韧的木材' },
  wood_4: { name: '白桦原木', tier: 4, type: 'material', description: '白桦木材' },
  wood_5: { name: '幻霞原木', tier: 5, type: 'material', description: '幻霞木材' },
  wood_6: { name: '龙柏原木', tier: 6, type: 'material', description: '龙柏木材' },
  wood_7: { name: '神木原木', tier: 7, type: 'material', description: '神木材料' },
  lumber_1: { name: '标准木板', tier: 1, type: 'material', description: '加工过的木板' },
  lumber_2: { name: '加固木板', tier: 2, type: 'material', description: '坚固的木板' },
  lumber_3: { name: '柔韧木板', tier: 3, type: 'material', description: '柔韧的木板' },
  lumber_4: { name: '承重木块', tier: 4, type: 'material', description: '承重木块' },
  lumber_5: { name: '附魔木块', tier: 5, type: 'material', description: '附魔木块' },
  lumber_6: { name: '龙纹木芯', tier: 6, type: 'material', description: '龙纹木芯' },
  lumber_7: { name: '世界精华板', tier: 7, type: 'material', description: '世界精华板' },
  ore_1: { name: '铜矿石', tier: 1, type: 'material', description: '基础矿石' },
  ore_2: { name: '铁矿石', tier: 2, type: 'material', description: '常见矿石' },
  ore_3: { name: '银矿石', tier: 3, type: 'material', description: '珍贵矿石' },
  ore_4: { name: '金矿石', tier: 4, type: 'material', description: '稀有矿石' },
  ore_5: { name: '白金矿石', tier: 5, type: 'material', description: '高级矿石' },
  ore_6: { name: '秘银矿石', tier: 6, type: 'material', description: '传说矿石' },
  ore_7: { name: '精金矿石', tier: 7, type: 'material', description: '神话矿石' },
  ingot_1: { name: '铜锭', tier: 1, type: 'material', description: '冶炼的铜锭' },
  ingot_2: { name: '铁锭', tier: 2, type: 'material', description: '冶炼的铁锭' },
  ingot_3: { name: '银锭', tier: 3, type: 'material', description: '冶炼的银锭' },
  ingot_4: { name: '金锭', tier: 4, type: 'material', description: '冶炼的金锭' },
  ingot_5: { name: '白金锭', tier: 5, type: 'material', description: '冶炼的白金锭' },
  ingot_6: { name: '秘银锭', tier: 6, type: 'material', description: '冶炼的秘银锭' },
  ingot_7: { name: '精金锭', tier: 7, type: 'material', description: '冶炼的精金锭' },
  fiber_1: { name: '棉花', tier: 1, type: 'material', description: '基础纤维' },
  fiber_2: { name: '亚麻', tier: 2, type: 'material', description: '优质纤维' },
  fiber_3: { name: '丝绸纤维', tier: 3, type: 'material', description: '精品纤维' },
  fiber_4: { name: '魔法纤维', tier: 4, type: 'material', description: '魔法纤维' },
  fiber_5: { name: '星辰纤维', tier: 5, type: 'material', description: '星辰纤维' },
  fiber_6: { name: '虚空纤维', tier: 6, type: 'material', description: '虚空纤维' },
  fiber_7: { name: '神圣纤维', tier: 7, type: 'material', description: '神圣纤维' },
  yarn_1: { name: '棉线', tier: 1, type: 'material', description: '基础线材' },
  yarn_2: { name: '亚麻线', tier: 2, type: 'material', description: '优质线材' },
  yarn_3: { name: '丝线', tier: 3, type: 'material', description: '精品线材' },
  yarn_4: { name: '魔法丝线', tier: 4, type: 'material', description: '魔法线材' },
  yarn_5: { name: '星辰丝线', tier: 5, type: 'material', description: '星辰线材' },
  yarn_6: { name: '虚空丝线', tier: 6, type: 'material', description: '虚空线材' },
  yarn_7: { name: '神圣丝线', tier: 7, type: 'material', description: '神圣线材' },
  crystal_1: { name: '微光水晶', tier: 1, type: 'material', description: '基础水晶' },
  crystal_2: { name: '辉光水晶', tier: 2, type: 'material', description: '发光水晶' },
  crystal_3: { name: '耀光水晶', tier: 3, type: 'material', description: '闪耀水晶' },
  crystal_4: { name: '炽光水晶', tier: 4, type: 'material', description: '炽热水晶' },
  crystal_5: { name: '圣光水晶', tier: 5, type: 'material', description: '神圣水晶' },
  crystal_6: { name: '神光水晶', tier: 6, type: 'material', description: '神之水晶' },
  crystal_7: { name: '创世水晶', tier: 7, type: 'material', description: '创世水晶' },
  crystal_raw: { name: '原始水晶', tier: 1, type: 'material', description: '未加工的水晶' },
  meat_raw: { name: '生肉', tier: 1, type: 'material', description: '新鲜的生肉' },
  milk: { name: '牛奶', tier: 1, type: 'material', description: '新鲜牛奶' },
  egg: { name: '鸡蛋', tier: 1, type: 'material', description: '新鲜鸡蛋' },
  fish_1: { name: '河鱼', tier: 1, type: 'material', description: '淡水鱼' },
  fish_2: { name: '海鱼', tier: 2, type: 'material', description: '海水鱼' },
  shrimp_1: { name: '河虾', tier: 1, type: 'material', description: '淡水虾' },
  fruits: { name: '水果', tier: 1, type: 'material', description: '新鲜水果' },
  food_cooked: { name: '熟食', tier: 1, type: 'consumable', description: '烹饪好的食物' },
  weapon_wooden_sword: { name: '木头短剑', tier: 1, type: 'weapon', description: '新手练习用的木剑' },
  weapon_iron_sword: { name: '铁剑', tier: 2, type: 'weapon', description: '锋利的铁剑' },
  weapon_steel_axe: { name: '钢斧', tier: 3, type: 'weapon', description: '沉重的钢斧' },
  weapon_magic_staff: { name: '魔法法杖', tier: 4, type: 'weapon', description: '蕴含魔力的法杖' },
}

export function resolveItemInfo(itemId: string, contentPack?: any): { name: string; tier: number; type: string; description: string } {
  const pack = contentPack?.items?.find((i: any) => i.id === itemId)
  const legacy = LEGACY_ITEM_INFO_MAP[itemId]
  if (pack) {
    return {
      name: pack.name || legacy?.name || itemId,
      tier: Number(pack.tier ?? legacy?.tier ?? 0),
      type: pack.type || legacy?.type || 'unknown',
      description: pack.description || legacy?.description || '',
    }
  }
  return legacy || { name: itemId, tier: 0, type: 'unknown', description: '未知物品' }
}

const ITEM_ICON_MAP: Record<string, string> = {
  wood_1: '🪵', wood_2: '🌳', wood_3: '🌲', wood_4: '🌿', wood_5: '✨', wood_6: '🐉', wood_7: '🌟',
  lumber_1: '📋', lumber_2: '🪚', lumber_3: '🔧', lumber_4: '⚒️', lumber_5: '✨', lumber_6: '🐲', lumber_7: '🌌',
  ore_1: '🟤', ore_2: '⚫', ore_3: '⚪', ore_4: '🟡', ore_5: '💎', ore_6: '🔮', ore_7: '⭐',
  ingot_1: '🟫', ingot_2: '⬛', ingot_3: '⬜', ingot_4: '🟨', ingot_5: '💍', ingot_6: '🔷', ingot_7: '🌟',
  fiber_1: '🌾', fiber_2: '🌱', fiber_3: '🕸️', fiber_4: '✨', fiber_5: '⭐', fiber_6: '🌌', fiber_7: '👼',
  yarn_1: '🧶', yarn_2: '🪢', yarn_3: '🕷️', yarn_4: '✨', yarn_5: '⭐', yarn_6: '🌌', yarn_7: '👼',
  crystal_1: '💎', crystal_2: '💠', crystal_3: '🔷', crystal_4: '🔥', crystal_5: '☀️', crystal_6: '🌟', crystal_7: '🌌',
  crystal_raw: '🪨',
  meat_raw: '🥩', milk: '🥛', egg: '🥚', fish_1: '🐟', fish_2: '🐠', shrimp_1: '🦐', fruits: '🍎', food_cooked: '🍖',
  weapon_wooden_sword: '🗡️', weapon_iron_sword: '⚔️', weapon_steel_axe: '🪓', weapon_magic_staff: '🪄',
  potion_hp_t1: '❤️', potion_hp_t2: '❤️‍🔥', potion_hp_t3: '💖', potion_hp_t4: '👑',
  potion_mp_t1: '💧', potion_mp_t2: '🔷', potion_mp_t3: '💠', potion_mp_t4: '🌌',
  potion_battle_fury: '🔥', potion_iron_skin: '🛡️',
  potion_arcane_surge: '✨', potion_guardian_elixir: '⚔️', potion_craft_focus: '🍵', potion_fortune: '🍀',
  potion_scholar: '📖', potion_berserk: '⚡', food_simple: '🍖', drink_basic: '🍹', tea_spirit: '🍵',
  book_smash: '📕', book_minor_heal: '📗', book_brace: '📘',
  book_cleave: '⚔️', book_taunt: '🎯', book_arrow_rain: '🏹',
  book_group_heal: '💖', book_meteor_storm: '☄️', book_war_aura: '🚩',
}

export function getItemIcon(itemId: string): string {
  return ITEM_ICON_MAP[itemId] || '📦'
}

const NAME_TO_ID_MAP: Record<string, string> = {
  平平无奇原木: 'wood_1',
  坚硬原木: 'wood_2',
  柔韧原木: 'wood_3',
  白桦原木: 'wood_4',
  幻霞原木: 'wood_5',
  龙柏原木: 'wood_6',
  神木原木: 'wood_7',
  标准木板: 'lumber_1',
  加固木板: 'lumber_2',
  柔韧木板: 'lumber_3',
  承重木块: 'lumber_4',
  附魔木块: 'lumber_5',
  龙纹木芯: 'lumber_6',
  世界精华板: 'lumber_7',
}

export function resolveRequiredItemId(itemName: string, contentPack?: any): string {
  return NAME_TO_ID_MAP[itemName] || contentPack?.items?.find((i: any) => i.name === itemName)?.id || itemName
}
