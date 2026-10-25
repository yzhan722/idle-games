import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGame } from '../contexts/GameContext'
import { useAuth } from '../hooks/useAuth'
import { EnhancementPanel } from './EnhancementPanel'
import { SkillTreePanel } from './SkillTreePanel'
import { PartyPanel, type PartyCombatHeaderInfo } from './PartyPanel'
import { GameChatPanel } from './GameChatPanel'
import { SkillSidebar } from './SkillSidebar'
import { MobileNavBar } from './MobileNavBar'
import { navIdForAction, visibleSkillNav, recommendedSkillNavIds, tabForNavId, SKILL_NAV } from '../gameplay/skillNav'
import { SkillActionList } from './SkillActionList'
import { CraftRecipeList, stripCraftVerb, type CraftRecipeView } from './CraftRecipeList'
import { CombatPotionBar } from './CombatPotionBar'
import { MonsterSceneBackdrop } from './MonsterSceneBackdrop'
import { skillActionRows, type SkillActionRow } from '../gameplay/skillActions'
import { t1Url } from '../assets/t1/manifest'
import { GameHeader } from './GameHeader'
import { PlayerRightPanel } from './PlayerRightPanel'
import { apiClient } from '../services/api'
import { chatWs, ChatMsg } from '../services/websocket'
import { logger } from '../utils/logger'
import { getItemName, registerItemNames } from '../utils/itemNames'
import { T1Art, T1ItemIcon, characterArtId } from './T1Art'
import { AchievementsPanel, DailyQuestsPanel, SettingsPanel } from './ProgressionPanels'
import { CheckInModal } from './SystemPanels'
import { PrestigePanel } from './AdvancementPanels'

import { useToast } from './Toast'
import { CharacterCreate } from './CharacterCreate'
import { getProfessionPerk } from '../gameplay/professionPerks'
import { TutorialGuide } from './TutorialGuide'
import { NextGoalBar } from './NextGoalBar'
import { ActionQueueBar } from './ActionQueueBar'
import { ActionRatesPanel } from './ActionRatesPanel'
import type { ActionPreview } from '../services/api'
import { CharacterSheet } from './CharacterSheet'
import { encounterStages, zoneDoors } from '../gameplay/encounters'
import { nextChapter1Goal, chapter1Complete } from '../gameplay/chapter1'
import { CHAPTER1_MONSTERS } from '../gameplay/ia'
import { COMBAT_SKILL_KEYS, abilitySlotCount, activeSetBonuses, combatSheetFromPack, equippedWeaponAtk, mainCombatSkill } from '../gameplay/combatSheet'
import { enhancementStatMultiplier, toolEffectLine } from '../gameplay/enhancement'
import { previewAbilities } from '../gameplay/fightPreview'
import { AbilityLoadoutPanel } from './AbilityLoadoutPanel'
import { AbilityBar, describeTrigger } from './AbilityBar'
import { InventoryPage } from './InventoryPage'
import { TasksPage } from './TasksPage'
import { HousesPage } from './HousesPage'
import { MarketItemGrid } from './MarketItemGrid'
import { MarketMyOrders } from './MarketMyOrders'
import type { AbilityDef } from '../types/game'
import { craftWhy, missingMaterials } from '../gameplay/craftPreview'
import { xpToNextLevel } from '../gameplay/xp'
import { archetypeLabel, encounterRewardLine, mechanicEntries } from '../gameplay/encounterLabels'
import { mechanicLogMatcher } from '../gameplay/bossMechanics'
import { playGameSound, setGameSoundEnabled } from '../gameplay/sound'
import './NewGameInterface.css'

const COMBAT_SKILL_LABEL: Record<string, string> = { stamina: '耐力', intelligence: '智力', attack: '攻击', defense: '防御', melee: '近战', ranged: '远程', magic: '魔法' }

type ActiveTab = 'logging' | 'woodworking' | 'mining' | 'smithing' | 'farming' | 'husbandry' | 'fishing' | 'cooking' | 'gathering' | 'tailoring' | 'crystal_mining' | 'alchemy' | 'adventure' | 'enhance' | 'skills' | 'trading' | 'party' | 'character' | 'inventory' | 'tasks' | 'houses'

// 当前活动状态
interface CurrentActivity {
  name: string
  output: string
  duration: number // 秒
  mark?: string
  actionId?: string // 用于和服务端 lifeActionState 对齐（队列自动切换动作时前端要跟着换）
}

// T1 主视觉走 frontend/src/assets/t1；CardArt 只作无资源时的 fallback。
// 怪物 / 地图战斗数值来自 shared content pack（encounterStages），禁止在本文件再维护一份。

// 树木数据 - 等级要求: 1, 20, 35, 50, 65, 80, 100
const trees = [
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
const ores = [
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
const crops = [
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
const fishingSpots = [
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
const fiberSpots = [
  { id: 'cotton_wild', actionId: 'act_gather_fiber_t1', name: '野生棉花', desc: '野外的棉花丛', level: 1, xp: 10, output: '棉花', outputRange: '1', rare: '棉絮', rareChance: 5, time: 5 },
  { id: 'linen', actionId: 'act_gather_fiber_t2', name: '亚麻田', desc: '优质的亚麻纤维', level: 35, xp: 30, output: '亚麻', outputRange: '1', rare: '亚麻籽', rareChance: 4, time: 15 },
  { id: 'silk', actionId: 'act_gather_fiber_t3', name: '丝绸蚕茧', desc: '珍贵的丝绸纤维', level: 65, xp: 50, output: '丝绸纤维', outputRange: '1', rare: '金蚕丝', rareChance: 3, time: 25 },
]

// 水晶采集数据 - 等级要求: 1, 35, 65
const crystalSpots = [
  { id: 'crystal_small', actionId: 'act_mine_crystal_t1', name: '微光水晶矿', desc: '散发微弱光芒的水晶矿', level: 1, xp: 10, output: '微光水晶', outputRange: '1', rare: '水晶碎片', rareChance: 5, time: 6 },
  { id: 'crystal_medium', actionId: 'act_mine_crystal_t2', name: '辉光水晶矿', desc: '闪耀着光芒的水晶矿', level: 35, xp: 30, output: '辉光水晶', outputRange: '1', rare: '水晶核心', rareChance: 4, time: 15 },
  { id: 'crystal_large', actionId: 'act_mine_crystal_t3', name: '圣光水晶矿', desc: '神圣的水晶矿脉', level: 65, xp: 50, output: '圣光水晶', outputRange: '1', rare: '水晶之心', rareChance: 3, time: 25 },
  { id: 'crystal_star', actionId: 'act_mine_crystal_t8', name: '星界水晶矿', desc: '汲取星辰之力的水晶，蕴含磅礴魔力', level: 105, xp: 95, output: '星界水晶', outputRange: '1', rare: '星界碎片', rareChance: 2, time: 55 },
  { id: 'crystal_eternal', actionId: 'act_mine_crystal_t9', name: '永恒之心矿', desc: '凝聚永恒能量的水晶之心，创世的火种', level: 115, xp: 130, output: '永恒之心', outputRange: '1', rare: '永恒碎片', rareChance: 1, time: 65 },
  { id: 'crystal_hellfire', actionId: 'act_mine_crystal_t10', name: '炼狱业火晶矿', desc: '封存炼狱业火的晶体，蕴含毁灭之力', level: 125, xp: 165, output: '业火水晶', outputRange: '1', rare: '炼狱之核', rareChance: 1, time: 72 },
  { id: 'crystal_genesis', actionId: 'act_mine_crystal_t11', name: '创世本源晶矿', desc: '创世之初凝结的本源晶体，光华夺目', level: 135, xp: 205, output: '本源水晶', outputRange: '1', rare: '神性精华', rareChance: 1, time: 85 },
  { id: 'crystal_omega', actionId: 'act_mine_crystal_t12', name: '万界终焉晶矿', desc: '世界尽头的终极水晶，蕴含寰宇之力', level: 145, xp: 265, output: '终焉水晶', outputRange: '1', rare: '万界之心', rareChance: 1, time: 98 },
]

  // 制作物品数据 - 按职业分类
// (legacy hard-coded craftItems removed — recipes now come from the content pack)

// 采集页只从内容包读等级/时长/经验/产出；上面的本地表只提供卡片 id、描述和 T1 美术 id（flavor）。
const GATHER_FLAVOR_BY_ACTION: Record<string, { cardId: string; desc: string; title: string }> = Object.fromEntries(
  [...trees, ...ores, ...crops, ...fishingSpots, ...fiberSpots, ...crystalSpots].map((c) => [c.actionId, { cardId: c.id, desc: c.desc, title: c.name }])
)

// 六个采集页：tab → 技能。农夫的种植页同时列出 act_plant_*（种植）与 act_raise_*（饲养），畜牧页是他的生产页。
const GATHER_PAGES: Record<string, { skillId: string; title: string; blurb: string; profession: string }> = {
  logging: { skillId: 'skill_woodcutter', title: '伐木', blurb: '砍伐各种树木，收集木材资源', profession: 'woodcutter' },
  mining: { skillId: 'skill_blacksmith', title: '挖矿', blurb: '挖掘各种矿石，收集珍贵的矿物资源', profession: 'blacksmith' },
  farming: { skillId: 'skill_farmer', title: '种植与饲养', blurb: '种植纤维作物、饲养牲畜，收获纺织原料与食材', profession: 'farmer' },
  fishing: { skillId: 'skill_chef', title: '钓鱼', blurb: '钓取各种鱼类和虾类，获取新鲜食材', profession: 'chef' },
  gathering: { skillId: 'skill_tailor', title: '采集', blurb: '采集棉花和羊毛，收集纺织原料', profession: 'tailor' },
  crystal_mining: { skillId: 'skill_alchemist', title: '水晶', blurb: '采集和分解水晶，获取魔法材料', profession: 'alchemist' },
}

// 装备槽位
function activityMarkFromAction(actionId: string): string {
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

const UI_SLOT_TO_EQ: Record<string, "main_hand" | "off_hand" | "head" | "chest" | "legs" | "feet" | "hands" | "accessory1" | "accessory2" | "tool"> = {
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

const equipSlots = {
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
  ]
}

export default function NewGameInterface() {
  const { playerState, loading, refreshPlayerState, startLifeAction, stopAction } = useGame()
  const { user } = useAuth()
  const toast = useToast()
  const prevCombatRef = useRef<{
    enemyHp: number;
    playerHp: number;
    guardActive: boolean;
    wrathActive: boolean;
    outcome?: string;
    logLen: number;
    heavyReady: boolean;
    startedAt?: number;
  } | null>(null)
  const prevLevelsRef = useRef<{ combat: number; wood: number } | null>(null)
  const prevUnlockRef = useRef<{ craft: boolean; adventure: boolean } | null>(null)

  const [customPlayerName, setCustomPlayerName] = useState<string | null>(null)
  const [customPlayerGender, setCustomPlayerGender] = useState<string | null>(null)
  const [customPlayerAvatar, setCustomPlayerAvatar] = useState<string | null>(null)
  useEffect(() => {
    void apiClient.getSettings().then((res: { settings?: { soundEnabled?: boolean; animationsEnabled?: boolean; compactMode?: boolean; playerName?: string; gender?: string; avatar?: string } }) => {
      const s = res.settings
      setGameSoundEnabled(s?.soundEnabled !== false)
      document.body.classList.toggle("no-animations", s?.animationsEnabled === false)
      document.body.classList.toggle("compact-mode", !!s?.compactMode)
      setCustomPlayerName(s?.playerName || null)
      if (s?.gender) setCustomPlayerGender(s.gender === 'secret' ? 'animal' : s.gender)
      if (s?.avatar) setCustomPlayerAvatar(s.avatar)
    }).catch(() => undefined)
  }, [])
  // 玩家展示名：优先自定义角色名（存档里的 settings.playerName），其次注册账号名，最后按用户 id 派生
  const fallbackName = user?.username || (user?.id ? `玩家_${String(user.id).slice(0, 6)}` : '玩家')
  const playerName = customPlayerName || fallbackName
  const rawGender = customPlayerGender || playerState?.settings?.gender || 'male'
  const playerGender: 'male' | 'female' | 'animal' = rawGender === 'female' ? 'female' : (rawGender === 'animal' || rawGender === 'secret') ? 'animal' : 'male'
  const playerAvatar = customPlayerAvatar || playerState?.settings?.avatar
  const renamePlayer = useCallback(async (name: string) => {
    const trimmed = name.trim().slice(0, 16)
    await apiClient.updateSettings({ playerName: trimmed || null })
    setCustomPlayerName(trimmed || null)
  }, [])
  const changePlayerAvatar = useCallback(async (avatar: string) => {
    setCustomPlayerAvatar(avatar)
    await apiClient.updateSettings({ avatar }).catch(() => undefined)
    void refreshPlayerState()
  }, [refreshPlayerState])
  const [activeTab, setActiveTab] = useState<ActiveTab>('logging')

  // 进度系统弹窗：成就 / 每日任务 / 设置 / 签到 / 转生
  const [progPanel, setProgPanel] = useState<null | 'achievements' | 'daily' | 'settings' | 'checkin' | 'prestige'>(null)
  // 顶栏角标：可领取数量
  const [claimableCount, setClaimableCount] = useState(0)
  // 顶栏角标：今日是否可签到
  const [checkInAvailable, setCheckInAvailable] = useState(false)
  // 离线收益弹窗（服务端报告）
  
  // 轮询可领取的成就/每日任务数量，用于顶栏角标提醒
  const refreshClaimable = useCallback(async () => {
    try {
      const [ach, daily, checkin]: any[] = await Promise.all([
        apiClient.getAchievements().catch(() => ({ achievements: [] })),
        apiClient.getDailyQuests().catch(() => ({ quests: [] })),
        apiClient.getCheckIn().catch(() => ({ canCheckIn: false }))
      ])
      const achCount = (ach.achievements || []).filter((a: any) => a.unlocked && !a.claimed).length
      const dailyCount = (daily.quests || []).filter((q: any) => q.completed && !q.claimed).length
      setClaimableCount(achCount + dailyCount)
      setCheckInAvailable(!!checkin.canCheckIn)
    } catch { /* 忽略 */ }
  }, [])

  useEffect(() => {
    void refreshClaimable()
    const timer = window.setInterval(() => { void refreshClaimable() }, 30000)
    return () => { window.clearInterval(timer) }
  }, [refreshClaimable])

  // 调试：监控组件是否重新挂载
  useEffect(() => {
    logger.debug('🔄 NewGameInterface mounted/remounted');
    return () => {
      logger.debug('❌ NewGameInterface unmounting');
    };
  }, []);
  
  const [selectedMap, setSelectedMap] = useState('forest')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'monster' | 'tree' | 'craft' | 'item' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [craftCategory, setCraftCategory] = useState<string>('materials')
  const [showSellModal, setShowSellModal] = useState(false)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(10)
  const [selectedTradingItem, setSelectedTradingItem] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'sell' | 'buy'>('sell')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<{id: string, quantity: number, price: number, type: 'sell' | 'buy'} | null>(null)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [repairingItemId, setRepairingItemId] = useState<string | null>(null)
  const [tradingOrders, setTradingOrders] = useState<any[]>([])
  const [tradingOrdersLoading, setTradingOrdersLoading] = useState(false)
  const tradingOrdersReqRef = useRef(0) // 递增即作废仍在途的旧列表请求，防旧结果覆盖新单
  const [currentProfession, setCurrentProfession] = useState<'woodcutter' | 'blacksmith' | 'farmer' | 'chef' | 'tailor' | 'alchemist'>('woodcutter')
  const [showProfessionModal, setShowProfessionModal] = useState(false)
  const classHydratedRef = useRef(false)

  useEffect(() => {
    if (!showProfessionModal && !(selectedItem && modalType)) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showProfessionModal) setShowProfessionModal(false)
      if (selectedItem && modalType) {
        setSelectedItem(null)
        setModalType(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showProfessionModal, selectedItem, modalType])

  useEffect(() => {
    const id = playerState?.activeClassId
    if (!id || classHydratedRef.current) return
    if (['woodcutter', 'blacksmith', 'farmer', 'chef', 'tailor', 'alchemist'].includes(id)) {
      setCurrentProfession(id as typeof currentProfession)
      classHydratedRef.current = true
    }
  }, [playerState?.activeClassId])
  
  // 内容包状态 - 从后端API加载
  const [contentPack, setContentPack] = useState<any>(null)
  const [contentPackLoading, setContentPackLoading] = useState(true)
  const adventureStages = useMemo(() => encounterStages(contentPack), [contentPack])
  const isChapter1Done = Boolean(playerState && chapter1Complete(playerState))
  const selectedEncounters = useMemo(() => {
    const all = adventureStages.find((stage) => stage.id === selectedMap)?.encounters ?? []
    // Chapter 1 keeps the four tutorial cards; afterwards the whole zone is listed (MWI) with
    // the real difficulty forecast on each card, so the harder forest monsters become the
    // post-chapter content until the mine opens.
    if (playerState && !isChapter1Done) {
      return all.filter((encounter) => (CHAPTER1_MONSTERS as readonly string[]).includes(encounter.id))
    }
    const bossLast = (a: { isBoss?: boolean }, b: { isBoss?: boolean }) => Number(!!a.isBoss) - Number(!!b.isBoss)
    return [...all].sort(bossLast)
  }, [adventureStages, selectedMap, isChapter1Done, Boolean(playerState)])
  
  // 道具列表状态 - 用于交易所
  const [allItems, setAllItems] = useState<any>(null)
  const [itemsLoading, setItemsLoading] = useState(true)
  
  // 聊天相关状态 —— 接入 WebSocket 实时通信
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatChannel, setChatChannel] = useState<'world' | 'profession' | 'party' | 'private'>('world')
  // 私聊目标：点消息里的玩家名设置；未选择时私聊频道不可发送
  const [privateTarget, setPrivateTarget] = useState<{ id: string; name: string } | null>(null)
  // 窄屏（≤768px）下聊天默认收起，避免底部抽屉遮挡主内容
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  // 移动端底栏：采集 / 生产 / 更多 三组以抽屉列出技能行
  const [mobileSheet, setMobileSheet] = useState<'gathering' | 'production' | 'more' | null>(null)
  // 冒险页的战斗配置（技能槽 / 食物 / 饮品）默认收成一行摘要
  const [showCombatConfig, setShowCombatConfig] = useState(false)
  // 交易行物品格的行情（最低卖价 / 最高收购）在自己的挂单变化后重新拉取
  const [marketRefreshKey, setMarketRefreshKey] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    world: 0,
    profession: 0,
    party: 0,
    private: 0
  })
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const chatChannelRef = useRef(chatChannel)
  chatChannelRef.current = chatChannel

  // WebSocket 连接管理
  useEffect(() => {
    const token = apiClient.getToken()
    if (!token) return
    chatWs.connect(token)
    return () => { chatWs.disconnect() }
  }, [user])

  // 监听 WebSocket 消息
  useEffect(() => {
    const unsubMsg = chatWs.onMessage((msg: ChatMsg) => {
      setChatMessages(prev => [...prev.slice(-99), msg])
      if (msg.channel === 'private' && !msg.isSelf && msg.sender && msg.type === 'message') {
        setPrivateTarget((prev) => prev || { id: msg.sender, name: msg.senderName || msg.sender })
      }
      // 如果消息不在当前频道，增加未读计数
      if (msg.channel !== chatChannelRef.current && msg.type === 'message') {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.channel]: (prev[msg.channel] || 0) + 1
        }))
      }
    })
    const unsubStatus = chatWs.onStatus((status) => {
      setWsStatus(status)
    })
    return () => { unsubMsg(); unsubStatus() }
  }, [])

  // 服务端定向通知（市场成交/强化委托/队伍事件）→ Toast + 玩家状态刷新。
  // 通知一律意味着服务端状态已变（金币/物品/队伍关系），刷新本地副本。
  useEffect(() => {
    return chatWs.onNotify((n) => {
      const item = typeof n.itemId === 'string' ? getItemName(n.itemId) : ''
      switch (n.kind) {
        case 'market:sale':
          toast.reward(`市集售出 ${item}×${n.quantity}，+${n.gold} 金币`)
          setMarketRefreshKey((k) => k + 1)
          break
        case 'order:filled':
          toast.reward(`订单成交：${item}×${n.quantity}，+${n.gold} 金币`)
          setMarketRefreshKey((k) => k + 1)
          break
        case 'party:invite':
          toast.info('收到组队邀请，前往「组队」页查看')
          break
        case 'party:kicked':
          toast.info('你已被移出队伍')
          break
        case 'party:leader':
          toast.success('你已成为队长')
          break
        case 'party:leader_changed':
          toast.info('队长已更换')
          break
        case 'party:member_joined':
          toast.info('有新队员加入')
          break
        case 'party:activity_completed':
          toast.reward('队伍活动已结算')
          break
        case 'party:party_disbanded':
          toast.info('队伍已解散')
          break
        case 'enhancement:service_request':
          toast.info(`收到强化委托${item ? `：${item}` : ''}`)
          break
        case 'enhancement:service_completed':
          if (n.success) toast.success('委托的强化成功')
          else toast.info(`委托的强化失败${n.failureReason ? `：${n.failureReason}` : ''}`)
          break
        case 'enhancement:service_rejected':
          toast.info(`强化委托被拒绝${n.message ? `：${n.message}` : ''}`)
          break
        default:
          break
      }
      void refreshPlayerState()
    })
  }, [toast, refreshPlayerState])
  
  // 右侧边栏状态
  const [rightPanelView, setRightPanelView] = useState<'character' | 'inventory'>('character')
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false)
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<string | null>(null)
  const [showEquipSelector, setShowEquipSelector] = useState(false)

  useEffect(() => {
    if (!showEquipSelector) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowEquipSelector(false)
      setSelectedEquipSlot(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showEquipSelector])
  
  // 背包筛选和搜索状态
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'material' | 'weapon' | 'armor' | 'consumable'>('all')
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventorySortBy, setInventorySortBy] = useState<'default' | 'name' | 'tier' | 'count'>('default')
  
  // 制作相关状态
  const [craftQuantity, setCraftQuantity] = useState(1)
  const [favoriteRecipes, setFavoriteRecipes] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [partyTargetStageId, setPartyTargetStageId] = useState<string | null>(null)
  const [partyCombatInfo, setPartyCombatInfo] = useState<PartyCombatHeaderInfo | null>(null)

  useEffect(() => {
    if (!playerState) return
    if (!playerState.activePartyActivity && partyCombatInfo?.active) {
      setPartyCombatInfo(null)
    }
  }, [playerState, playerState?.activePartyActivity, partyCombatInfo?.active])
  
  // 职业配置 - 每个职业有采集和生产两条技能，经验与等级相互独立
  const professions = {
    woodcutter: {
      id: 'woodcutter',
      name: '伐木工',
      icon: '🪓',
      skill: 'skill_woodcutter',
      craftSkill: 'skill_woodworking',
      gatherName: '伐木',
      gatherTab: 'logging' as ActiveTab,
      craftName: '木工',
      craftTab: 'woodworking' as ActiveTab,
    },
    blacksmith: {
      id: 'blacksmith',
      name: '铁匠',
      icon: '⚒️',
      skill: 'skill_blacksmith',
      craftSkill: 'skill_smithing',
      gatherName: '挖矿',
      gatherTab: 'mining' as ActiveTab,
      craftName: '锻造',
      craftTab: 'smithing' as ActiveTab,
    },
    farmer: {
      id: 'farmer',
      name: '农夫',
      icon: '🌾',
      skill: 'skill_farmer',
      craftSkill: 'skill_husbandry',
      gatherName: '种植',
      gatherTab: 'farming' as ActiveTab,
      craftName: '畜牧',
      craftTab: 'husbandry' as ActiveTab,
    },
    chef: {
      id: 'chef',
      name: '厨师',
      icon: '👨‍🍳',
      skill: 'skill_chef',
      craftSkill: 'skill_cooking',
      gatherName: '钓鱼',
      gatherTab: 'fishing' as ActiveTab,
      craftName: '烹饪',
      craftTab: 'cooking' as ActiveTab,
    },
    tailor: {
      id: 'tailor',
      name: '裁缝',
      icon: '🧵',
      skill: 'skill_tailor',
      craftSkill: 'skill_tailoring',
      gatherName: '采集',
      gatherTab: 'gathering' as ActiveTab,
      craftName: '缝纫',
      craftTab: 'tailoring' as ActiveTab,
    },
    alchemist: {
      id: 'alchemist',
      name: '炼金术师',
      icon: '🧪',
      skill: 'skill_alchemist',
      craftSkill: 'skill_alchemy',
      gatherName: '水晶',
      gatherTab: 'crystal_mining' as ActiveTab,
      craftName: '炼金',
      craftTab: 'alchemy' as ActiveTab,
    },
  }

  /** "伐木/木工" for a profession skill id (采集或生产均可); undefined for non-profession skills. */
  const professionLabel = (skillId?: string): string | undefined => {
    const prof = skillId ? Object.values(professions).find((p) => p.skill === skillId || p.craftSkill === skillId) : undefined
    return prof ? [prof.gatherName, prof.craftName].filter(Boolean).join('/') : undefined
  }

  // 升级所需经验：与服务端同一条曲线（gameplay/xp.ts，参数为当前等级）
  const getXpForLevel = xpToNextLevel;
  
  // 获取当前职业信息
  const getCurrentProfession = () => professions[currentProfession]
  // 技能树面板用的职业等级 = 采集/生产两侧最高者（与后端解锁门槛一致）；若当前正处于生产标签页或生产动作，则优先显示生产经验
  const getCurrentSkill = () => {
    const p = getCurrentProfession()
    const gather = playerState?.skills?.[p.skill]
    const craft = playerState?.skills?.[p.craftSkill]
    if (!gather && !craft) return { level: 1, xp: 0 }
    if (['woodworking', 'smithing', 'husbandry', 'cooking', 'tailoring', 'alchemy'].includes(activeTab) && craft && (craft.level || 1) >= (gather?.level || 1)) {
      return craft
    }
    if ((craft?.level || 0) > (gather?.level || 0)) return craft!
    if ((craft?.level || 0) === (gather?.level || 0) && (craft?.xp || 0) > (gather?.xp || 0)) return craft!
    return gather || craft!
  }
  
  // 判断是否正在战斗某个怪物
  const isCurrentlyFighting = (monsterId: string): boolean => {
    if (
      playerState?.hpCombat &&
      (!playerState.hpCombat.outcome || Boolean(playerState.hpCombat.nextFightAt))
    ) {
      return playerState.hpCombat.monsterId === monsterId
    }
    if (!battleState || !battleState.isActive) return false;
    return battleState.monster.id === monsterId;
  };
  
  // 发送聊天消息（通过 WebSocket）
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return
    if (chatChannel === 'private' && !privateTarget) {
      setChatMessages(prev => [...prev.slice(-99), {
        id: `local_err_${Date.now()}`,
        type: 'error' as const,
        channel: 'private',
        sender: '系统',
        content: '先点击玩家名字选择私聊对象',
        ts: new Date().toISOString(),
      }])
      return
    }
    const sent = chatWs.send(chatChannel, chatInput.trim(), chatChannel === 'private' ? privateTarget!.id : undefined)
    if (!sent) {
      // WebSocket 未连接，显示本地提示
      setChatMessages(prev => [...prev.slice(-99), {
        id: `local_err_${Date.now()}`,
        type: 'error' as const,
        channel: chatChannel,
        sender: '系统',
        content: '消息发送失败，连接已断开',
        ts: new Date().toISOString(),
      }])
    }
    setChatInput('')
    setShowEmojiPicker(false)
  }, [chatInput, chatChannel, privateTarget])
  
  // 插入表情
  const insertEmoji = (emoji: string) => {
    setChatInput(prev => prev + emoji)
    setShowEmojiPicker(false)
  }
  
  // 切换频道时清除未读计数
  const switchChannel = (channel: 'world' | 'profession' | 'party' | 'private') => {
    setChatChannel(channel)
    setUnreadCounts(prev => ({ ...prev, [channel]: 0 }))
  }

  // 点消息里的玩家名 → 切到私聊频道并锁定对象
  const startPrivateChat = useCallback((target: { id: string; name: string }) => {
    if (!target.id || target.id === user?.id) return
    setPrivateTarget(target)
    switchChannel('private')
  }, [user])

  const openEquipSelector = (slotId: string) => {
    if (slotId !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法更换战斗装备（请先停止战斗）')
      return
    }
    setSelectedEquipSlot(slotId)
    setShowEquipSelector(true)
  }
  
  // 装备物品
  const equipItem = async (itemId: string) => {
    if (!selectedEquipSlot) return
    if (selectedEquipSlot !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法更换战斗装备（请先停止战斗）')
      return
    }
    try {
      apiClient.clearCache()
      await apiClient.equipItem(UI_SLOT_TO_EQ[selectedEquipSlot], itemId)
      await refreshPlayerState()
      playGameSound("equip")
      toast.success('已装备')
    } catch (e: any) {
      toast.error(e?.message || '装备失败')
    } finally {
      setShowEquipSelector(false)
      setSelectedEquipSlot(null)
    }
  }

  const unequipSlot = async (slotId: string) => {
    if (slotId !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法卸下战斗装备（请先停止战斗）')
      return
    }
    try {
      apiClient.clearCache()
      await apiClient.unequipItem(UI_SLOT_TO_EQ[slotId])
      await refreshPlayerState()
    } catch (e: any) {
      toast.error(e?.message || '卸下失败')
    }
  }
  
  const getEquippedItemId = (uiSlot: string): string | undefined => {
    const key = UI_SLOT_TO_EQ[uiSlot]
    const val = (playerState?.equipment as any)?.[key]
    if (typeof val !== 'string' || !val) return undefined
    if (playerState?.inventory && (playerState.inventory[val] || 0) <= 0) return undefined
    return val
  }

  // 获取可装备的物品列表（根据槽位类型过滤）
  const getEquippableItems = (slotId: string) => {
    if (!playerState?.inventory || !contentPack?.items) return []
    const matches = (item: any) => {
      if (slotId === 'tool') return typeof item.toolFor === 'string' && item.toolFor.length > 0
      if (slotId === 'mainhand') return item.type === 'weapon'
      if (slotId === 'offhand') return item.type === 'offhand' || item.type === 'shield' || String(item.id).includes('shield')
      if (slotId === 'accessory1' || slotId === 'accessory2') return item.type === 'accessory' || item.slot === 'accessory'
      const want = slotId === 'head' ? 'head' : slotId
      return item.slot === want || (item.type === 'armor' && item.slot === want)
    }
    return Object.entries(playerState.inventory)
      .filter(([id, count]) => id !== 'gold' && (count || 0) > 0)
      .map(([id, count]) => {
        const item = contentPack.items.find((i: any) => i.id === id)
        return item ? { ...item, count } : null
      })
      .filter((item): item is any => !!item && matches(item))
  }
  
  // 筛选和排序背包物品
  const getFilteredInventoryItems = () => {
    if (!playerState?.inventory) return []
    
    let items = Object.entries(playerState.inventory)
      .filter(([key, value]) => key !== 'gold' && (value || 0) > 0)
      .map(([itemId, count]) => ({
        itemId,
        count,
        ...getItemInfo(itemId)
      }))
    
    // 按类型筛选
    if (inventoryFilter !== 'all') {
      items = items.filter(item => {
        if (inventoryFilter === 'armor') {
          return item.type === 'armor' || item.type === 'offhand' || item.type === 'shield' || item.type === 'accessory'
        }
        if (inventoryFilter === 'consumable') {
          return item.type === 'consumable' || item.type === 'food' || item.type === 'book'
        }
        return item.type === inventoryFilter
      })
    }
    
    // 按名称搜索
    if (inventorySearch.trim()) {
      const searchLower = inventorySearch.toLowerCase()
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) || item.itemId.toLowerCase().includes(searchLower)
      )
    }
    
    // 排序
    switch (inventorySortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'tier':
        items.sort((a, b) => b.tier - a.tier)
        break
      case 'count':
        items.sort((a, b) => b.count - a.count)
        break
      default:
        // 默认排序（按添加顺序）
        break
    }
    
    return items
  }
  
  // 整理背包（按品质排序）
  const organizeInventory = () => {
    setInventorySortBy('tier')
  }
  
  // 切换收藏配方
  const toggleFavoriteRecipe = (recipeId: string) => {
    setFavoriteRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }
  
  // 从内容包获取指定职业（默认当前职业）的制作配方
  const getCraftRecipesFromContentPack = (category: string, profOverride?: string) => {
    if (!contentPack || !contentPack.actions) return []
    const targetProf = (profOverride && profOverride in professions ? profOverride : currentProfession) as keyof typeof professions
    const professionSkillId = `skill_${targetProf}`
    const craftSkillId = professions[targetProf].craftSkill
    // 技能树/强化解锁挂在采集技能（职业锚点）上；配方本身属于生产技能
    const unlocked = playerState?.skills?.[professionSkillId]?.unlockedRecipes || []
    const armorCraftUnlocked = unlocked.includes('woodcutter_armor_crafting')
    const ARMOR_ACTIONS = new Set(['act_craft_wood_chest', 'act_craft_wood_legs', 'act_craft_wood_boots', 'act_craft_wood_gloves'])

    // 过滤出当前职业的制作配方（生产技能下的动作即制作配方）
    const recipes = contentPack.actions.filter((action: any) =>
      action.skillId === craftSkillId &&
      (!ARMOR_ACTIONS.has(action.id) || armorCraftUnlocked)
    )
    
    // 按产出物品类型分类。厨师/炼金的产出是 consumable，之前的分类表没有这一项，导致两页永远为空。
    const categorizedRecipes: Record<string, any[]> = {
      materials: [],
      weapons: [],
      equipment: [],
      consumables: [],
      accessories: [],
    }
    
    recipes.forEach((recipe: any) => {
      // 根据产出物品判断类别
      const outputItem = recipe.yields[0].itemId
      if (!outputItem) return
      
      // 查找物品信息
      const itemInfo = contentPack.items.find((item: any) => item.id === outputItem)
      if (!itemInfo) return
      // MWI: every recipe is listed from minute one; rows above the skill level render locked with
      // "再升 N 级解锁", and the chapter-1 goal bar does the guiding.
      
      // 转换为前端格式
      const formattedRecipe = {
        id: recipe.id,
        name: stripCraftVerb(recipe.name),
        output: outputItem,
        outputCount: recipe.yields[0].qty || 1,
        requires: recipe.consumes.map((consume: any) => ({
          item: consume.itemId,
          count: consume.qty
        })),
        time: recipe.duration / 1000, // 转换为秒
        xp: recipe.xp,
        level: recipe.requirements.skillLevel || 1,
        tier: itemInfo.tier || 1,
        type: itemInfo.type,
        atk: itemInfo.atk,
        mag: itemInfo.mag,
        def: itemInfo.def,
        hp: itemInfo.hp,
        toolFor: itemInfo.toolFor,
        toolSpeed: itemInfo.toolSpeed,
        enhanceSuccess: itemInfo.enhanceSuccess,
        desc: itemInfo.description || recipe.description,
      }
      
      // 分类
      if (itemInfo.type === 'weapon') {
        categorizedRecipes.weapons.push(formattedRecipe)
      } else if (itemInfo.type === 'armor' || itemInfo.type === 'offhand' || itemInfo.type === 'shield') {
        categorizedRecipes.equipment.push(formattedRecipe)
      } else if (itemInfo.type === 'consumable' || itemInfo.type === 'food') {
        categorizedRecipes.consumables.push(formattedRecipe)
      } else if (itemInfo.type === 'accessory') {
        categorizedRecipes.accessories.push(formattedRecipe)
      } else {
        categorizedRecipes.materials.push(formattedRecipe)
      }
    })
    
    if (category === '__all__') return Object.values(categorizedRecipes).flat()
    return categorizedRecipes[category] || []
  }

  // 生产页的分类标签：只显示当前职业真的有配方的分类
  const CRAFT_CATEGORY_LABELS: Record<string, string> = {
    materials: '材料', weapons: '武器', equipment: '防具', consumables: '消耗品', accessories: '饰品',
  }
  const craftCategoriesFor = (profOverride?: string): string[] => {
    const targetProf = profOverride || currentProfession
    // 厨师/炼金以消耗品为主业，放最前
    const order = targetProf === 'chef' || targetProf === 'alchemist'
      ? ['consumables', 'materials', 'weapons', 'equipment', 'accessories']
      : ['materials', 'weapons', 'equipment', 'consumables', 'accessories']
    return order.filter((c) => getCraftRecipesFromContentPack(c, targetProf).length > 0)
  }
  
  // 计算最大可制作数量
  const getMaxCraftableQuantity = (recipe: any): number => {
    if (!recipe.requires || !playerState?.inventory) return 0
    
    let maxQuantity = 5000
    for (const req of recipe.requires) {
      const itemId = getRequiredItemId(req.item)
      const available = playerState.inventory?.[itemId] || 0
      const possibleQuantity = Math.floor(available / req.count)
      maxQuantity = Math.min(maxQuantity, possibleQuantity)
    }
    
    return Math.max(0, maxQuantity)
  }
  
  // 处理回车发送
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }
  
  // 战斗相关状态
  const [battleState, setBattleState] = useState<{
    isActive: boolean;
    monster: any;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    playerCastTime: number; // 玩家读条进度（0-3000ms）
    enemyCastTime: number; // 敌人读条进度（0-3000ms）
    playerCastDuration: number; // 玩家读条总时长（默认3000ms）
    enemyCastDuration: number; // 敌人读条总时长（默认3000ms）
    battleLog: string[];
    battleCount: number; // 连续战斗次数
    isPlayerDead: boolean; // 玩家是否死亡
    drops: Array<{ itemId: string; name: string; qty: number }>; // 服务端实际发放的稀有掉落
  } | null>(null)
  const combatTimingRef = useRef<{
    syncPerfNow: number;
    playerCooldownMs: number;
    enemyCooldownMs: number;
    playerIntervalMs: number;
    enemyIntervalMs: number;
  } | null>(null)
  const [combatNow, setCombatNow] = useState(() => Date.now())

  useEffect(() => {
    const hp = playerState?.hpCombat
    if (!hp) {
      combatTimingRef.current = null
      setBattleState(null)
      return
    }
    const playerIntervalMs = Math.max(200, hp.playerIntervalMs || 2400)
    const enemyIntervalMs = Math.max(200, hp.enemyIntervalMs || 3000)
    combatTimingRef.current = {
      syncPerfNow: performance.now(),
      playerCooldownMs: hp.playerCooldownMs || 0,
      enemyCooldownMs: hp.enemyCooldownMs || 0,
      playerIntervalMs,
      enemyIntervalMs,
    }
    setCombatNow(Date.now())
    const prev = prevCombatRef.current
    const isNewFight = Boolean(prev && ((hp.startedAt && prev.startedAt && hp.startedAt !== prev.startedAt) || (prev.outcome && !hp.outcome)))
    const showFullSpawnFirst = isNewFight && !hp.outcome && hp.enemyHp < hp.enemyMaxHp
    const allEncounters = adventureStages.flatMap((s) => s.encounters)
    const matchedEncounter = selectedEncounters.find((e) => e.id === hp.monsterId) || allEncounters.find((e) => e.id === hp.monsterId)
    const baseState = {
      isActive: !hp.outcome,
      monster: {
        id: hp.monsterId,
        name: hp.monsterName,
        icon: matchedEncounter?.icon,
        isBoss: Boolean(matchedEncounter?.isBoss || hp.monsterId.endsWith('_boss')),
        xp: matchedEncounter?.xp || 0,
        gold: matchedEncounter?.gold || 0,
        level: matchedEncounter?.level || 1,
      },
      playerHp: hp.playerHp,
      playerMaxHp: hp.playerMaxHp,
      enemyHp: showFullSpawnFirst ? hp.enemyMaxHp : hp.enemyHp,
      enemyMaxHp: hp.enemyMaxHp,
      playerCastTime: hp.playerCooldownMs,
      enemyCastTime: hp.enemyCooldownMs,
      playerCastDuration: playerIntervalMs,
      enemyCastDuration: enemyIntervalMs,
      battleLog: hp.log,
      battleCount: (hp.streak || 0) + 1,
      isPlayerDead: hp.outcome === 'loss',
      drops: hp.drops || [],
    }
    setBattleState(baseState)
    if (showFullSpawnFirst) {
      const timerId = window.setTimeout(() => {
        setBattleState((curr) => (curr && curr.isActive ? { ...curr, enemyHp: hp.enemyHp } : curr))
      }, 150)
      return () => window.clearTimeout(timerId)
    }
  }, [playerState?.hpCombat])

  // Smoothly interpolate combat attack cast bars and ability cooldowns at 20fps between 1s server polls,
  // and keep combatNow ticking at 1Hz out of combat so active buff duration bars on the adventure map stay live.
  useEffect(() => {
    const inFastCombatLoop = Boolean(
      battleState?.isActive ||
        (playerState?.hpCombat?.outcome && playerState?.hpCombat?.nextFightAt)
    )
    if (!inFastCombatLoop) {
      const slowId = window.setInterval(() => setCombatNow(Date.now()), 1000)
      return () => window.clearInterval(slowId)
    }
    const id = window.setInterval(() => {
      setCombatNow(Date.now())
      const timing = combatTimingRef.current
      if (!timing || !battleState?.isActive) return
      const dt = Math.max(0, performance.now() - timing.syncPerfNow)
      const nextPlayerCast = Math.min(timing.playerIntervalMs, timing.playerCooldownMs + dt)
      const nextEnemyCast = Math.min(timing.enemyIntervalMs, timing.enemyCooldownMs + dt)
      setBattleState((prev) =>
        prev && prev.isActive
          ? {
              ...prev,
              playerCastTime: nextPlayerCast,
              enemyCastTime: nextEnemyCast,
            }
          : prev
      )
    }, 50)
    return () => window.clearInterval(id)
  }, [battleState?.isActive, playerState?.hpCombat?.outcome, playerState?.hpCombat?.nextFightAt])

  // MWI timed enhancing: attempts land on the server every interval; poll so the page keeps up.
  useEffect(() => {
    if (!(playerState?.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome)) return
    const id = window.setInterval(() => {
      void refreshPlayerState()
    }, 1000)
    return () => window.clearInterval(id)
  }, [playerState?.mode, playerState?.enhanceRun?.nextAttemptAt, playerState?.enhanceRun?.outcome, refreshPlayerState])

  useEffect(() => {
    if (!playerState?.hpCombat) return
    // Keep polling while fighting, and while a finished fight (win intermission or death respawn) waits to auto-repeat.
    const awaitingRepeat = !!playerState.hpCombat.outcome && !!playerState.hpCombat.nextFightAt
    if (playerState.hpCombat.outcome && !awaitingRepeat) return
    const id = window.setInterval(() => {
      void refreshPlayerState()
    }, 1000)
    let nextTimer: number | undefined
    if (awaitingRepeat && playerState.hpCombat.nextFightAt) {
      const waitMs = Math.max(25, playerState.hpCombat.nextFightAt - Date.now() + 30)
      nextTimer = window.setTimeout(() => {
        void refreshPlayerState()
      }, waitMs)
    }
    return () => {
      window.clearInterval(id)
      if (nextTimer !== undefined) window.clearTimeout(nextTimer)
    }
  }, [playerState?.hpCombat?.monsterId, playerState?.hpCombat?.outcome, playerState?.hpCombat?.nextFightAt, refreshPlayerState])

  useEffect(() => {
    const hp = playerState?.hpCombat
    if (!hp) {
      prevCombatRef.current = null
      return
    }
    const prev = prevCombatRef.current
    const heavyReadyNow = Date.now() >= (hp.heavyChopReadyAt || 0)
    if (prev) {
      const isNewFight = Boolean((hp.startedAt && prev.startedAt && hp.startedAt !== prev.startedAt) || (prev.outcome && !hp.outcome))
      const baselineEnemyHp = isNewFight ? hp.enemyMaxHp : prev.enemyHp
      const baselinePlayerHp = isNewFight ? hp.playerMaxHp : prev.playerHp
      if (hp.enemyHp < baselineEnemyHp) {
        const addedCount = Math.max(1, hp.log.length - (isNewFight ? 0 : prev.logLen))
        const newLines = hp.log.slice(-addedCount)
        const heavy = newLines.some((l) => l.includes("重劈"))
        playGameSound(heavy ? "skill" : "combat-hit")
        pushDamageFloat("enemy", baselineEnemyHp - hp.enemyHp, heavy)
        shake("enemy")
      }
      if (hp.playerHp < baselinePlayerHp) {
        playGameSound("combat-hit")
        pushDamageFloat("player", baselinePlayerHp - hp.playerHp, false)
        shake("player")
      }
      if ((hp.guardActive && !prev.guardActive) || (hp.wrathActive && !prev.wrathActive)) {
        playGameSound("boss-phase")
      }
      if (heavyReadyNow && !prev.heavyReady && !hp.outcome) {
        playGameSound("skill-ready")
      }
      if (hp.outcome === "win" && prev.outcome !== "win") {
        const isBossFight = hp.monsterId.endsWith("_boss") || adventureStages.some((s) => s.encounters.some((e) => e.id === hp.monsterId && e.isBoss))
        playGameSound(isBossFight ? "boss-win" : "victory")
        if (hp.drops && hp.drops.length > 0) window.setTimeout(() => playGameSound("rare-drop"), 350)
        setShowVictoryFx(true)
        window.setTimeout(() => setShowVictoryFx(false), 1200)
        setBuildModalDelayDone(false)
        window.setTimeout(() => setBuildModalDelayDone(true), 1500)
      }
    }
    prevCombatRef.current = {
      enemyHp: hp.enemyHp,
      playerHp: hp.playerHp,
      guardActive: hp.guardActive,
      wrathActive: hp.wrathActive,
      outcome: hp.outcome,
      logLen: hp.log.length,
      heavyReady: heavyReadyNow,
      startedAt: hp.startedAt,
    }
  }, [playerState?.hpCombat])

  useEffect(() => {
    if (!playerState) return
    const combat = playerState.combatLevel || 1
    const totalSkillLv = Object.values(playerState.skills || {}).reduce((sum, s) => sum + (s?.level || 1), 0)
    if (prevLevelsRef.current) {
      if (combat > prevLevelsRef.current.combat || totalSkillLv > prevLevelsRef.current.wood) {
        playGameSound("level-up")
      }
    }
    prevLevelsRef.current = { combat, wood: totalSkillLv }
  }, [playerState?.combatLevel, playerState?.skills])

  useEffect(() => {
    if (!playerState) return
    const craft =
      (playerState.inventory.wood_1 || 0) > 0 ||
      (playerState.inventory.lumber_1 || 0) > 0 ||
      (playerState.stats?.totalGathered || 0) > 0
    const adventure = playerState.equipment?.main_hand === "weapon_wooden_sword"
    if (prevUnlockRef.current) {
      if ((craft && !prevUnlockRef.current.craft) || (adventure && !prevUnlockRef.current.adventure)) {
        playGameSound("unlock")
      }
    }
    prevUnlockRef.current = { craft, adventure }
  }, [playerState?.inventory?.wood_1, playerState?.inventory?.lumber_1, playerState?.stats?.totalGathered, playerState?.equipment?.main_hand])
  
  // 状态栏相关状态
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null)
  const [progress, setProgress] = useState(0)
  const lastRefreshTimeRef = useRef(0) // 使用ref记录上次刷新时间，避免触发重渲染
  const isStoppingRef = useRef(false) // 标记是否正在停止活动
  
  // 奖励通知状态
  const [rewardNotification] = useState<{
    show: boolean;
    xp: number;
    gold: number;
    key: number;
  }>({ show: false, xp: 0, gold: 0, key: 0 })

  // 战斗伤害飘字：由服务端 hpCombat 两次快照的 HP 差值驱动（1s 轮询内多次命中会合并成一条）
  const [damageFloats, setDamageFloats] = useState<Array<{
    id: number;
    target: 'player' | 'enemy';
    damage: number;
    isCrit: boolean;
  }>>([])
  const floatIdRef = useRef(0)
  const pushDamageFloat = useCallback((target: 'player' | 'enemy', damage: number, isCrit: boolean) => {
    const id = ++floatIdRef.current
    setDamageFloats((prev) => [...prev.slice(-5), { id, target, damage, isCrit }])
    window.setTimeout(() => setDamageFloats((prev) => prev.filter((f) => f.id !== id)), 900)
  }, [])

  // 战斗受击震动状态
  const [hitShake, setHitShake] = useState<{ player: boolean; enemy: boolean }>({ player: false, enemy: false })
  const shake = useCallback((target: 'player' | 'enemy') => {
    setHitShake((prev) => ({ ...prev, [target]: true }))
    window.setTimeout(() => setHitShake((prev) => ({ ...prev, [target]: false })), 320)
  }, [])

  // 胜利特效状态
  const [showVictoryFx, setShowVictoryFx] = useState(false)

  // 胜利奖励先亮 1.5 秒，再弹"选择你的第一刀"，两个高光时刻不互相遮
  const [buildModalDelayDone, setBuildModalDelayDone] = useState(true)

  // 采集/制作周期完成闪光
  const [cycleCompleteFlash, setCycleCompleteFlash] = useState(false)
  
  // 强制重新渲染的状态
  const [forceUpdate] = useState(0)

  // 加载内容包
  useEffect(() => {
    const loadContentPack = async () => {
      try {
        setContentPackLoading(true)
        const pack = await apiClient.getContentPack()
        setContentPack(pack)
        registerItemNames(pack?.items)
        logger.debug('✅ 内容包加载成功', pack)
      } catch (error) {
        logger.error('❌ 加载内容包失败', error)
      } finally {
        setContentPackLoading(false)
      }
    }
    loadContentPack()
  }, [])

  // 加载道具列表（用于交易行）
  useEffect(() => {
    const loadAllItems = async () => {
      try {
        setItemsLoading(true)
        const items = await apiClient.getAllItems()
        setAllItems(items)
        logger.debug('✅ 道具列表加载成功:', items)
      } catch (error) {
        logger.error('❌ 加载道具列表失败:', error)
      } finally {
        setItemsLoading(false)
      }
    }
    loadAllItems()
  }, [])

  // 加载选中物品的订单
  useEffect(() => {
    if (!selectedTradingItem) {
      setTradingOrders([]);
      return;
    }

    const reqId = ++tradingOrdersReqRef.current;
    const loadOrders = async () => {
      try {
        setTradingOrdersLoading(true);
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        if (tradingOrdersReqRef.current === reqId) setTradingOrders(orders);
        logger.debug('✅ 订单加载成功:', orders);
      } catch (error) {
        logger.error('❌ 加载订单失败:', error);
        if (tradingOrdersReqRef.current === reqId) setTradingOrders([]);
      } finally {
        setTradingOrdersLoading(false);
      }
    };

    loadOrders();
  }, [selectedTradingItem]);

  // 页面加载时恢复活动状态
  useEffect(() => {
    if (!playerState || !contentPack) return;
    
    // 如果正在停止活动，不要恢复
    if (isStoppingRef.current) {
      logger.debug('⏭️ 跳过恢复：正在停止活动');
      return;
    }
    
    // 如果前端已经有活动状态，不需要恢复
    if (currentActivity || battleState) {
      logger.debug('⏭️ 跳过恢复：前端已有状态', { currentActivity: !!currentActivity, battleState: !!battleState });
      return;
    }
    
    logger.debug('🔍 检查是否需要恢复活动状态', { 
      mode: playerState.mode, 
      lifeActionState: playerState.lifeActionState,
      currentActivity: currentActivity,
      battleState: battleState
    });
    
    // 战斗与生活互斥：若处于单人战斗（含连战等待中）或组队副本战斗，禁止恢复生活动作
    const inSoloCombat = Boolean(
      playerState.hpCombat &&
        (!playerState.hpCombat.outcome || (playerState.combatLoadout?.autoRepeat && playerState.hpCombat.nextFightAt))
    );
    const inPartyCombat = Boolean(playerState.activePartyActivity || partyCombatInfo?.active);
    if (inSoloCombat || inPartyCombat) {
      if (currentActivity) {
        setCurrentActivity(null);
        setProgress(0);
      }
      return;
    }

    // 检查后端是否有正在进行的活动
    if (playerState.mode === 'life_action' && playerState.lifeActionState) {
      const actionId = playerState.lifeActionState.actionId;
      const startedAt = new Date(playerState.lifeActionState.startedAt);
      
      // 跳过战斗活动（战斗活动的ID以act_combat_开头）
      if (actionId.startsWith('act_combat_')) {
        logger.debug('⚠️ 跳过恢复战斗活动:', actionId);
        return;
      }
      
      // 从contentPack中查找对应的action信息
      const action = contentPack.actions.find((a: any) => a.id === actionId);
      if (action) {
        logger.debug('⚠️ 准备恢复活动:', action.name, 'actionId:', actionId);
        const durationMs =
          playerState.lifeActionState.effectiveDurationMs && playerState.lifeActionState.effectiveDurationMs > 0
            ? playerState.lifeActionState.effectiveDurationMs
            : action.duration;
        
        // 恢复活动状态
        const activityInfo: CurrentActivity = {
          name: action.name,
          output: action.yields[0].itemId ? getItemNameById(action.yields[0].itemId) : '未知',
          duration: Math.round((durationMs / 1000) * 100) / 100, // 转换为秒（保留实际有效时长精度）
          mark: activityMarkFromAction(actionId),
          actionId,
        };
        
        setCurrentActivity(activityInfo);
        
        // 计算当前进度
        const now = new Date();
        const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
        const currentProgress = ((elapsedMs % durationMs) / durationMs) * 100;
        
        setProgress(Math.min(currentProgress, 100));
        logger.debug('✅ 恢复活动状态', activityInfo, '进度:', currentProgress.toFixed(2) + '%');
      } else {
        logger.debug('⚠️ 未找到活动定义', actionId);
      }
    } else {
      logger.debug('ℹ️ 后端无活动状态，mode:', playerState.mode);
    }
  }, [playerState, contentPack, currentActivity, battleState]);

  // 服务端说"空闲"时前端不能再转进度环（批量制作做完、材料耗尽、别处停止都会走到这里）。
  // 开始请求进行中除外：此时 playerState 还没拿到新的 life_action。
  useEffect(() => {
    if (!playerState || !currentActivity || actionLoading) return;
    const inSoloCombat = Boolean(
      playerState.hpCombat &&
        (!playerState.hpCombat.outcome || (playerState.combatLoadout?.autoRepeat && playerState.hpCombat.nextFightAt))
    );
    const inPartyCombat = Boolean(playerState.activePartyActivity || partyCombatInfo?.active);
    if (playerState.mode !== 'life_action' || !playerState.lifeActionState || inSoloCombat || inPartyCombat) {
      setCurrentActivity(null);
      setProgress(0);
      return;
    }
    // 队列在服务端切到了下一个动作：清掉旧的，让恢复逻辑按新动作重建进度环
    if (currentActivity.actionId && playerState.lifeActionState.actionId !== currentActivity.actionId) {
      setCurrentActivity(null);
      setProgress(0);
      return;
    }
    // 同步服务端计算出的实际有效耗时（含工具加速、职业专精、房屋与Buff加成）
    const effMs = playerState.lifeActionState.effectiveDurationMs;
    if (effMs && effMs > 0) {
      const effSec = Math.round((effMs / 1000) * 100) / 100;
      if (Math.abs(currentActivity.duration - effSec) > 0.01) {
        setCurrentActivity((prev) => (prev ? { ...prev, duration: effSec } : prev));
      }
    }
  }, [playerState?.mode, playerState?.lifeActionState?.actionId, playerState?.lifeActionState?.effectiveDurationMs, playerState?.lifeActionState, currentActivity, actionLoading]);

  // 进度条循环动画：使用 requestAnimationFrame 以 ~30fps (0.1% 精度) 平滑更新顶部进度环与列表行进度条
  useEffect(() => {
    // 战斗时不显示进度条
    if (battleState?.isActive) {
      setProgress(0);
      return;
    }
    
    if (!currentActivity) {
      setProgress(0);
      return;
    }

    const duration = Math.max(200, currentActivity.duration * 1000); // 转换为毫秒
    const startedAt = performance.now() - (progress / 100) * duration;
    let animationFrameId = 0;
    let lastPaintedProgress = Math.round(progress * 10) / 10;
    let lastPaintAt = 0;

    let lastCycleBucket = Math.floor((performance.now() - startedAt) / duration);

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startedAt);
      const cycleProgress = Math.round((((elapsed % duration) / duration) * 100) * 10) / 10;

      if (cycleProgress !== lastPaintedProgress && (now - lastPaintAt >= 32 || cycleProgress < lastPaintedProgress)) {
        lastPaintedProgress = cycleProgress;
        lastPaintAt = now;
        setProgress(cycleProgress);
      }

      // 检测周期完成，触发闪光效果
      const currentBucket = Math.floor(elapsed / duration);
      if (currentBucket > lastCycleBucket) {
        lastCycleBucket = currentBucket;
        setCycleCompleteFlash(true);
        playGameSound(currentActivity.mark === "制" ? "craft-complete" : "gather-complete");
        if (flashTimerId !== null) window.clearTimeout(flashTimerId);
        flashTimerId = window.setTimeout(() => setCycleCompleteFlash(false), 600);
      }

      if (elapsed >= duration) {
        const refreshBucket = Math.floor(elapsed / duration);
        const refreshKey = startedAt + refreshBucket * duration;
        if (refreshKey > lastRefreshTimeRef.current) {
          lastRefreshTimeRef.current = refreshKey;
          void refreshPlayerState();
          // 客户端计时器可能比服务端结算早几十毫秒；补一次刷新，避免库存永远慢一个周期
          if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
          refreshTimerId = window.setTimeout(() => { void refreshPlayerState(); }, 600);
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    let flashTimerId: number | null = null;
    let refreshTimerId: number | null = null;
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (flashTimerId !== null) window.clearTimeout(flashTimerId);
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
    };
  }, [currentActivity, battleState?.isActive, refreshPlayerState]);

  // 打开制作弹窗前先拉一次最新状态：弹窗里的"最大"和材料计数直接读 playerState，
  // 采集进行中时前端库存可能比服务端慢一个周期。
  const openCraftModal = (item: any) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）");
      return;
    }
    setSelectedItem(item);
    setModalType('craft');
    setCraftQuantity(1);
    void refreshPlayerState();
  };

  // ---- 采集页（内容包驱动，银河奶牛式动作列表）----
  const openGatherRow = (row: SkillActionRow) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）");
      return;
    }
    const a = row.action
    const flavor = GATHER_FLAVOR_BY_ACTION[a.id]
    const out = row.primaryYield
    // 采集弹窗沿用 selectedItem 结构；等级/时长/经验/产出全部来自内容包，而不是本地表
    setSelectedItem({
      id: flavor?.cardId || a.id,
      actionId: a.id,
      name: flavor?.title || a.name,
      desc: flavor?.desc || '',
      icon: '',
      level: row.requiredLevel,
      xp: a.xp,
      output: out ? getItemNameById(out.itemId) : '',
      outputItemId: out?.itemId,
      outputRange: out ? String(out.qty) : '1',
      time: Math.round(a.duration / 100) / 10,
      rare: '',
      rareChance: 0,
    })
    setModalType('tree')
    setGatherQuantity(null)
  }
  const gatherArtIds = new Set(
    [...trees, ...ores, ...crops, ...fishingSpots, ...fiberSpots, ...crystalSpots]
      .map((c) => c.id)
      .filter((id) => !!t1Url(`trees/${id}`))
  )
  const renderGatherPage = (tab: keyof typeof GATHER_PAGES) => {
    if (!playerState) return null
    const cfg = GATHER_PAGES[tab]
    const skillLevel = playerState.skills?.[cfg.skillId]?.level || 1
    const rows = skillActionRows(contentPack?.actions as any, cfg.skillId, 'gathering', skillLevel, {
      cardIdByActionId: Object.fromEntries(Object.entries(GATHER_FLAVOR_BY_ACTION).map(([k, v]) => [k, v.cardId])),
      titleByActionId: Object.fromEntries(Object.entries(GATHER_FLAVOR_BY_ACTION).map(([k, v]) => [k, v.title])),
    })
    const skillName = professions[cfg.profession as keyof typeof professions]?.gatherName || cfg.title
    const isCombatLock = Boolean(
      playerState.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    )
    return (
      <div className={`logging-layout skill-page${isCombatLock ? ' combat-disabled-page' : ''}`} data-skill-page={tab}>
        <div className="page-header">
          <h2 className="section-title">{cfg.title} <span className="skill-page-level">Lv.{skillLevel}</span></h2>
          <div className="page-info"><p>{cfg.blurb}</p></div>
          <button
            type="button"
            className="header-menu-btn skill-tree-entry"
            onClick={() => { setCurrentProfession(cfg.profession as typeof currentProfession); setActiveTab('skills') }}
          >
            🌳 技能树
          </button>
        </div>
        {isCombatLock && (
          <div className="combat-lock-banner">
            ⚔️ 当前正在战斗中，所有生产与生活技能已锁定置灰（请先在顶部停止战斗）
          </div>
        )}
        {contentPackLoading ? (
          <div className="loading-message">加载中...</div>
        ) : (
          <SkillActionList
            rows={rows}
            skillName={skillName}
            skillLevel={skillLevel}
            runningActionId={playerState.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined}
            runningStartedAt={playerState.mode === 'life_action' ? playerState.lifeActionState?.startedAt : undefined}
            runningProgress={playerState.mode === 'life_action' ? progress : undefined}
            runningEffectiveDurationMs={playerState.mode === 'life_action' ? playerState.lifeActionState?.effectiveDurationMs : undefined}
            artIds={gatherArtIds}
            nameOf={getItemNameById}
            iconOf={getItemIcon}
            onOpen={openGatherRow}
            onQuickToggle={quickToggleRow}
            hintFor={(row) => (row.action.id === 'act_chop_wood_t1' && !chapterDone ? goalMaterialHint() : null)}
          />
        )}
      </div>
    )
  }

  // ---- 生产页（银河奶牛式配方列表；分类按产出类型自动生成）----
  const CRAFT_PAGES: Record<string, { title: string; blurb: string; profession: string }> = {
    woodworking: { title: '木工', blurb: '加工原木成木板，制作木质武器、装备和工具', profession: 'woodcutter' },
    smithing: { title: '锻造', blurb: '精炼矿石成金属锭，打造战士装备、工具和武器', profession: 'blacksmith' },
    husbandry: { title: '畜牧', blurb: '加工农牧产出，制作农夫的工具与布甲', profession: 'farmer' },
    cooking: { title: '烹饪', blurb: '烹饪美味的食物和饮料，提供战斗增益和工作效率', profession: 'chef' },
    tailoring: { title: '缝纫', blurb: '加工羊毛和纱线，制作职业装备和战斗装备', profession: 'tailor' },
    alchemy: { title: '炼金', blurb: '调制药水与灵药，打造魔法法杖与饰品', profession: 'alchemist' },
  }
  const renderCraftPage = (tab: keyof typeof CRAFT_PAGES) => {
    if (!playerState) return null
    const cfg = CRAFT_PAGES[tab]
    const skillId = professions[cfg.profession as keyof typeof professions].craftSkill
    const skillLevel = playerState.skills?.[skillId]?.level || 1
    const cats = craftCategoriesFor(cfg.profession)
    const active = cats.includes(craftCategory) ? craftCategory : (cats[0] || 'materials')
    const recipes = getCraftRecipesFromContentPack(active, cfg.profession).filter((r: any) => !showFavoritesOnly || favoriteRecipes.has(r.id))
    const skillName = professions[cfg.profession as keyof typeof professions]?.craftName || cfg.title
    const isCombatLock = Boolean(
      playerState.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    )
    return (
      <div className={`crafting-layout skill-page${isCombatLock ? ' combat-disabled-page' : ''}`} data-skill-page={tab}>
        <div className="page-header">
          <h2 className="section-title">{cfg.title} <span className="skill-page-level">Lv.{skillLevel}</span></h2>
          <div className="page-info"><p>{cfg.blurb}</p></div>
          <button
            type="button"
            className="header-menu-btn skill-tree-entry"
            onClick={() => { setCurrentProfession(cfg.profession as typeof currentProfession); setActiveTab('skills') }}
          >
            🌳 技能树
          </button>
        </div>
        {isCombatLock && (
          <div className="combat-lock-banner">
            ⚔️ 当前正在战斗中，所有生产与生活技能已锁定置灰（请先在顶部停止战斗）
          </div>
        )}
        <div className="craft-header-controls">
          <div className="craft-categories">
            {cats.map((c) => (
              <button key={c} className={`category-btn ${active === c ? 'active' : ''}`} onClick={() => setCraftCategory(c)}>
                {CRAFT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <button
            className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? '显示全部' : '只看收藏'}
          >
            {showFavoritesOnly ? '★收藏' : '☆收藏'}
          </button>
        </div>
        {contentPackLoading ? (
          <div className="loading-message">加载中...</div>
        ) : (
          <CraftRecipeList
            recipes={recipes}
            skillName={skillName}
            skillLevel={skillLevel}
            inventory={playerState.inventory}
            runningActionId={playerState.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined}
            runningStartedAt={playerState.mode === 'life_action' ? playerState.lifeActionState?.startedAt : undefined}
            runningProgress={playerState.mode === 'life_action' ? progress : undefined}
            runningEffectiveDurationMs={playerState.mode === 'life_action' ? playerState.lifeActionState?.effectiveDurationMs : undefined}
            favorites={favoriteRecipes}
            nameOf={getItemNameById}
            iconOf={getItemIcon}
            resolveItemId={getRequiredItemId}
            whyLine={(r) => {
              const out: any = contentPack?.items?.find((i: any) => i.id === r.output)
              if (out?.toolFor) {
                const line = toolEffectLine(out, professionLabel(out.toolFor))
                return line ? `工具：${line}` : ''
              }
              const why = craftWhy({ id: r.output, atk: r.atk, def: r.def, hp: r.hp }, combatSheet, { equippedMainAtk: weaponAtk, outputEquipped: Object.values(playerState.equipment || {}).includes(r.output) })
              return why === '做成之后会进背包。' ? '' : why
            }}
            onOpen={(r) => openCraftModal(r)}
            onToggleFavorite={toggleFavoriteRecipe}
            onQuickToggle={quickToggleCraft}
          />
        )}
        {showFavoritesOnly && recipes.length === 0 && (
          <div className="no-favorites"><div className="empty-icon">☆</div><p>还没有收藏的配方</p><p className="hint-text">点配方右侧的星星收藏</p></div>
        )}
      </div>
    )
  }

  // ---- 动作面板收益预览（服务端真值）----
  const [actionPreview, setActionPreview] = useState<ActionPreview | null>(null);
  const [actionPreviewLoading, setActionPreviewLoading] = useState(false);
  const previewActionId: string | null =
    selectedItem && modalType === 'tree' ? selectedItem.actionId || null
    : selectedItem && modalType === 'craft' ? selectedItem.id || null
    : null;
  useEffect(() => {
    if (!previewActionId) { setActionPreview(null); return; }
    let cancelled = false;
    setActionPreviewLoading(true);
    apiClient.getActionPreview(previewActionId)
      .then((p) => { if (!cancelled) setActionPreview(p); })
      .catch(() => { if (!cancelled) setActionPreview(null); })
      .finally(() => { if (!cancelled) setActionPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [previewActionId, playerState?.skills, playerState?.equipment]);

  // ---- 行动队列（银河奶牛式）----
  const ACTION_QUEUE_MAX = 5;
  const [gatherQuantity, setGatherQuantity] = useState<number | null>(null); // null = 无限
  const actionNameOf = (actionId: string) =>
    contentPack?.actions?.find((a: any) => a.id === actionId)?.name || actionId;
  const isCombatLockoutActive = () =>
    Boolean(
      playerState?.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState?.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    );

  const queueAction = async (actionId: string, quantity?: number) => {
    if (isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）');
      return;
    }
    try {
      const name = actionNameOf(actionId);
      const wasIdle = playerState?.mode !== 'life_action';
      await apiClient.queueAction(actionId, quantity);
      apiClient.clearCache();
      await refreshPlayerState();
      setSelectedItem(null);
      setModalType(null);
      toast.success(wasIdle ? `已开始「${name}」` : `已加入队列：「${name}」${quantity ? ` ×${quantity}` : ''}`);
    } catch (e: any) {
      toast.error(e?.message || '加入队列失败');
    }
  };
  const removeQueued = async (id: string) => {
    try { await apiClient.removeQueuedAction(id); apiClient.clearCache(); await refreshPlayerState(); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };
  const moveQueued = async (id: string, direction: 'up' | 'down') => {
    try { await apiClient.moveQueuedAction(id, direction); apiClient.clearCache(); await refreshPlayerState(); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };
  const clearQueue = async () => {
    try { await apiClient.clearActionQueue(); apiClient.clearCache(); await refreshPlayerState(); toast.info('队列已清空'); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };

  const startAction = async (actionId: string, activityInfo: CurrentActivity, quantity?: number) => {
    if (isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）');
      return;
    }
    logger.debug('🚀 startAction called with:', actionId, activityInfo, quantity);
    try {
      setActionLoading(true)
      
      // 如果有任何活动，先清除前端状态
      if (currentActivity) {
        logger.debug('🔄 清除旧的采集活动');
        isStoppingRef.current = true;
        setCurrentActivity(null);
        setProgress(0);
        // 同一时间只能做一件事：告诉玩家刚才那件被停了
        if (currentActivity.actionId ? currentActivity.actionId !== actionId : currentActivity.name !== activityInfo.name) {
          toast.info(`已停止「${currentActivity.name}」，开始「${activityInfo.name}」`);
        }
      }
      const inSoloCombat = Boolean(
        battleState ||
          (playerState?.hpCombat &&
            (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
      );
      if (inSoloCombat) {
        logger.debug('🔄 清除战斗状态');
        isStoppingRef.current = true;
        setBattleState(null);
        await apiClient.fleeHpCombat().catch(() => undefined);
      }
      
      // 调用后端停止旧生活活动（如果有）
      if (currentActivity) {
        await stopAction();
      }
      
      logger.debug('🚀 开始新活动:', actionId);
      // 清除停止标记，允许新活动
      isStoppingRef.current = false;
      const result = await startLifeAction(actionId, quantity)
      logger.debug('📡 startLifeAction result:', result);
      const effMs = (result as any)?.lifeActionState?.effectiveDurationMs;
      const effSec = effMs && effMs > 0 ? Math.round((effMs / 1000) * 100) / 100 : activityInfo.duration;
      
      // 设置新的前端状态
      logger.debug('📝 Setting currentActivity:', activityInfo);
      setCurrentActivity({ ...activityInfo, duration: effSec, actionId })
      setProgress(0)
      
      setSelectedItem(null)
      setModalType(null)
      
      logger.debug('✅ 新活动已开始', activityInfo);
    } catch (error) {
      logger.error('❌ 开始活动失败', error)
      isStoppingRef.current = false;
      toast.error('开始活动失败: ' + (error as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  // 停止当前生活动作（顶部活动条与卡片快捷 ■ 共用）
  const stopCurrentActivity = async () => {
    try {
      logger.debug('🛑 停止采集活动');
      isStoppingRef.current = true;
      setCurrentActivity(null);
      setProgress(0);
      await stopAction();
      logger.debug('✅ 采集活动已停止');
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    } catch (error) {
      logger.error('停止活动失败:', error);
      isStoppingRef.current = false;
    }
  }

  // 卡片快捷开关：点 ▶ 直接开始不限次动作，点 ■ 停止——不必先开弹窗
  const runningLifeActionId = () =>
    playerState?.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined
  const quickToggleRow = (row: SkillActionRow) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）")
      return
    }
    if (runningLifeActionId() === row.action.id) {
      void stopCurrentActivity()
      return
    }
    const a = row.action
    const out = row.primaryYield
    void startAction(a.id, {
      name: GATHER_FLAVOR_BY_ACTION[a.id]?.title || a.name,
      output: out ? getItemNameById(out.itemId) : '',
      duration: Math.round(a.duration / 100) / 10,
      mark: activityMarkFromAction(a.id),
    })
  }
  const quickToggleCraft = (r: CraftRecipeView) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）")
      return
    }
    if (runningLifeActionId() === r.id) {
      void stopCurrentActivity()
      return
    }
    void startAction(r.id, {
      name: r.name,
      output: getItemNameById(r.output),
      duration: r.time,
      mark: '制',
    })
  }

  // 开始自动战斗
  const startBattle = async (monster: any) => {
    if (!playerState) return;
    
    // 战斗与生活互斥：开始战斗前清除任何进行中的生活动作
    if (currentActivity || playerState.mode === 'life_action') {
      logger.debug('🔄 清除采集/生活活动以开始战斗');
      isStoppingRef.current = true;
      setCurrentActivity(null);
      setProgress(0);
      await stopAction().catch(() => undefined);
    }
    
    try {
      isStoppingRef.current = false;
      await apiClient.startHpCombat(monster.id);
      await refreshPlayerState();
      setSelectedItem(null);
      setModalType(null);
      logger.debug('✅ 开始战斗', monster.name);
    } catch (error) {
      logger.error('Failed to start battle:', error);
      isStoppingRef.current = false;
      toast.error('开始战斗失败: ' + (error as Error).message);
    }
  };

  // 停止战斗（同时支持单人战斗与组队首领副本）
  const stopBattle = async () => {
    try {
      logger.debug('🛑 停止战斗');
      isStoppingRef.current = true;
      setBattleState(null);
      const activePartyId =
        partyCombatInfo?.partyId ||
        playerState?.activePartyActivity?.partyId ||
        playerState?.partyState?.partyId;
      if ((partyCombatInfo?.active || playerState?.activePartyActivity) && activePartyId) {
        setPartyCombatInfo(null);
        await apiClient.cancelPartyActivity(activePartyId).catch(() => undefined);
      }
      if (playerState?.hpCombat) {
        await apiClient.fleeHpCombat().catch(() => undefined);
      }
      await refreshPlayerState();
      logger.debug('✅ 战斗已停止');
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    } catch (error) {
      logger.error('停止战斗失败:', error);
      isStoppingRef.current = false;
    }
  };

  // 创建交易订单
  const handleCreateOrder = async () => {
    if (!selectedTradingItem || orderSubmitting) return;
    setOrderSubmitting(true);

    try {
      await apiClient.createTradingOrder({
        itemId: selectedTradingItem,
        quantity: sellQuantity,
        price: sellPrice,
        type: orderType
      });

      // 刷新订单列表（递增序号，作废仍在途的旧列表请求，防旧结果覆盖新单）
      tradingOrdersReqRef.current++;
      const orders = await apiClient.getTradingOrders(selectedTradingItem);
      setTradingOrders(orders);
      setMarketRefreshKey((k) => k + 1);

      // 刷新玩家状态
      await refreshPlayerState();

      // 关闭弹窗
      setShowSellModal(false);
      setSellQuantity(1);
      setSellPrice(10);

      toast.success(`${orderType === 'sell' ? '出售单' : '收购单'}创建成功！`);
    } catch (error: any) {
      logger.error('创建订单失败:', error);
      toast.error('创建订单失败: ' + (error.message || '未知错误'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  // 购买/出售吃单
  const handleBuyOrder = async () => {
    if (!selectedOrder || orderSubmitting) return;
    const isSellingToBid = selectedOrder.type === 'buy';
    setOrderSubmitting(true);

    try {
      await apiClient.buyFromOrder(selectedOrder.id, purchaseQuantity);

      // 刷新订单列表（递增序号，作废仍在途的旧列表请求，防旧结果覆盖新单）
      if (selectedTradingItem) {
        tradingOrdersReqRef.current++;
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        setTradingOrders(orders);
      }
      setMarketRefreshKey((k) => k + 1);

      // 刷新玩家状态
      await refreshPlayerState();

      // 关闭弹窗
      setShowPurchaseModal(false);
      setSelectedOrder(null);
      setPurchaseQuantity(1);

      toast.success(isSellingToBid ? '出售成功！' : '购买成功！');
    } catch (error: any) {
      logger.error(isSellingToBid ? '出售失败:' : '购买失败:', error);
      toast.error((isSellingToBid ? '出售失败: ' : '购买失败: ') + (error.message || '未知错误'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  // HP、胜负和重试都只服从服务端 hpCombat；前端不再伪造复活或自动续战。

  if (loading || !playerState) {
    return (
      <div className="game-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  const chapterGoal = nextChapter1Goal(playerState)
  const chapterDone = chapter1Complete(playerState)
  const hasFirstGather =
    (playerState.inventory.wood_1 || 0) > 0 ||
    (playerState.inventory.lumber_1 || 0) > 0 ||
    (playerState.stats?.totalGathered || 0) > 0
  const hasSwordOn = playerState.equipment?.main_hand === "weapon_wooden_sword"
  const combatSheet = combatSheetFromPack(playerState, contentPack?.items, contentPack?.equipmentSets)
  const setBonuses = activeSetBonuses(playerState.equipment as any, contentPack?.equipmentSets)
  const weaponAtk = equippedWeaponAtk(playerState, contentPack?.items)
  // 技能目录来自 /content（与服务端同一份定义）；未加载时退回内置的重劈
  const abilityCatalog: AbilityDef[] | undefined = contentPack?.abilities
  const equippedAbilities = previewAbilities(playerState.abilityLoadout, playerState.abilities, abilityCatalog, abilitySlotCount(playerState))
  const fightInfo = (m: any) => ({
    isBoss: !!m?.isBoss || String(m?.id || '').endsWith('_boss'),
    kills: playerState.stats?.killsByMonster?.[m?.id] || 0,
  })
  // 当前章节目标还差多少原木/木板，挂在白杨卡和采集弹窗上
  const goalMaterialHint = (): string | null => {
    const wood = playerState.inventory.wood_1 || 0
    const lumber = playerState.inventory.lumber_1 || 0
    const forBoards = (boards: number) => {
      const boardsLeft = Math.max(0, boards - lumber)
      if (boardsLeft === 0) return '木板够了，去制作'
      const woodNeed = boardsLeft * 2
      return wood >= woodNeed ? `原木够做 ${boardsLeft} 块板了，去制作` : `原木 ${wood}/${woodNeed}`
    }
    switch (chapterGoal.id) {
      case 'chop': return '砍 1 根就行'
      case 'board': return wood >= 2 ? '原木够了，去制作木板' : `原木 ${wood}/2`
      case 'sword': return forBoards(3)
      case 'chest': return forBoards(6)
      default: return null
    }
  }
  /** The monster's rare drop as a real pack item (the pack names it by id or by display name). */
  const rareItemOf = (m: any): { id: string; name: string } | null => {
    const rare = typeof m?.rare === 'string' ? m.rare : ''
    if (!rare || !(Number(m?.rareChance) > 0)) return null
    const item = contentPack?.items?.find((i: any) => i.id === rare || i.name === rare)
    return item ? { id: item.id, name: item.name || rare } : null
  }
  // 左栏（银河奶牛式技能列表）：17 行从第一分钟起全部可见，第一章相关的四行只打"推荐"标签
  const sidebarItems = visibleSkillNav(chapterDone)
  const sidebarRecommended = recommendedSkillNavIds(chapterDone)
  // MWI total level: every skill row's level added up (professions + enhancing + seven combat skills)
  const totalLevel =
    Object.values(playerState.skills || {}).reduce((sum: number, s: any) => sum + Number(s?.level || 1), 0) +
    (playerState.combatSkills
      ? Object.values(playerState.combatSkills).reduce((sum, s) => sum + Number(s?.level || 1), 0)
      : (playerState.combatLevel || 1) * 7)
  // MWI attention badges: claimable tasks (+1 when the gift is ready)
  const navBadges: Record<string, number | undefined> = {
    tasks: (playerState.taskSummary?.ready || 0) + (playerState.taskSummary?.giftReady ? 1 : 0) || undefined,
  }
  const combatSkillRows = playerState.combatSkills as Record<string, { level: number; xp: number }> | undefined
  const soloCombatActive = Boolean(
    battleState?.isActive ||
      (playerState.hpCombat &&
        (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
  )
  const partyCombatActive = Boolean(playerState.activePartyActivity || partyCombatInfo?.active)
  const headerBattleActive = soloCombatActive || partyCombatActive

  const sidebarLocked = new Set<string>()
  if (!hasFirstGather) sidebarLocked.add("woodworking")
  if (!hasSwordOn) sidebarLocked.add("adventure")
  if (headerBattleActive) {
    for (const s of SKILL_NAV) {
      if (s.group === "gathering" || s.group === "production") {
        sidebarLocked.add(s.id)
      }
    }
  }
  const onNavLocked = (id: string) => {
    if (headerBattleActive) {
      const navItem = SKILL_NAV.find((s) => s.id === id)
      if (navItem && (navItem.group === "gathering" || navItem.group === "production")) {
        toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）")
        return
      }
    }
    if (id === "woodworking") toast.info("先砍到第一根木头，制作才会打开")
    if (id === "adventure") toast.info("先穿上木头短剑，再进森林")
  }
  const onNavSelect = (id: string) => {
    // 点某个职业的技能页时同时切换"当前职业"，这样右栏与制作分类跟着走
    const item = SKILL_NAV.find((s) => s.id === id)
    if (item?.profession && item.profession !== currentProfession) {
      setCurrentProfession(item.profession as any)
      void apiClient.setActiveClass(item.profession).catch(() => undefined)
    }
    // 战斗技能行（耐力 / 智力 / …）只是进度读数，统一打开冒险页
    setActiveTab(tabForNavId(id) as ActiveTab)
  }
  const resolvedPartyCombatDisplay = (() => {
    if (!partyCombatActive) return null
    if (partyCombatInfo?.active && partyCombatInfo.title) {
      return {
        title: partyCombatInfo.title,
        subtitle: partyCombatInfo.subtitle || '组队自动战斗',
      }
    }
    const rawStageId = playerState.activePartyActivity?.stageId || partyCombatInfo?.stageId || 'forest'
    const stageAliases: Record<string, string> = {
      stage_1: 'forest',
      stage_2: 'mine',
      stage_3: 'swamp',
      stage_4: 'snow',
      stage_forest: 'forest',
      stage_mine: 'mine',
      stage_swamp: 'swamp',
      stage_snow: 'snow',
      stage_volcano: 'volcano',
    }
    const normStageId = stageAliases[rawStageId] || rawStageId
    const stg = (contentPack?.stages as any[] | undefined)?.find((s) => s.id === normStageId)
    const stageName = stg?.name || '组队首领副本'
    const bossId =
      playerState.activePartyActivity?.raidBossId ||
      ((stg?.monsters || []) as string[]).find((id) => String(id).endsWith('_boss'))
    const bossMonster = (contentPack?.monsters as any[] | undefined)?.find((m) => m.id === bossId)
    const bossName = playerState.activePartyActivity?.raidBossName || bossMonster?.name
    return {
      title: bossName ? `${stageName} · 讨伐【${bossName}】` : stageName,
      subtitle: '组队自动战斗',
    }
  })()
  const headerBattleName = partyCombatActive
    ? resolvedPartyCombatDisplay?.title
    : battleState?.monster?.name || playerState.hpCombat?.monsterName || '战斗中'
  const headerBattleSubtitle = partyCombatActive
    ? resolvedPartyCombatDisplay?.subtitle
    : playerState.hpCombat?.outcome === 'loss' && playerState.hpCombat?.nextFightAt
      ? '重伤休整 · 准备再战'
      : playerState.hpCombat?.outcome === 'win' && playerState.hpCombat?.nextFightAt
        ? '连续自动战斗 · 索敌中'
        : '连续自动战斗'

  const runningAction = playerState.mode === 'life_action' && playerState.lifeActionState && !headerBattleActive
    ? contentPack?.actions?.find((a: any) => a.id === playerState.lifeActionState!.actionId)
    : soloCombatActive && playerState.hpCombat
      ? { id: 'act_combat_' + playerState.hpCombat.monsterId, skillId: 'skill_combat' }
      : undefined
  const runningNavId = playerState.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome
    ? 'enhance'
    : partyCombatActive
      ? 'party'
      : navIdForAction(runningAction as any)

  // 获取品质名称
  const getTierName = (tier: number): string => {
    const tierNames: Record<number, string> = {
      1: '普通',
      2: '优质',
      3: '精品',
      4: '稀有',
      5: '珍贵',
      6: '传说',
      7: '神话'
    };
    return tierNames[tier] || '未知';
  };

  // 获取物品信息的辅助函数
  const getItemInfo = (itemId: string) => {
    // 基础物品信息映射
    const itemInfoMap: Record<string, { name: string; tier: number; type: string; description: string }> = {
      // 原木类
      'wood_1': { name: '平平无奇原木', tier: 1, type: 'material', description: '最基础的木材' },
      'wood_2': { name: '坚硬原木', tier: 2, type: 'material', description: '品质不错的木材' },
      'wood_3': { name: '柔韧原木', tier: 3, type: 'material', description: '柔韧的木材' },
      'wood_4': { name: '白桦原木', tier: 4, type: 'material', description: '白桦木材' },
      'wood_5': { name: '幻霞原木', tier: 5, type: 'material', description: '幻霞木材' },
      'wood_6': { name: '龙柏原木', tier: 6, type: 'material', description: '龙柏木材' },
      'wood_7': { name: '神木原木', tier: 7, type: 'material', description: '神木材料' },
      
      // 木板类
      'lumber_1': { name: '标准木板', tier: 1, type: 'material', description: '加工过的木板' },
      'lumber_2': { name: '加固木板', tier: 2, type: 'material', description: '坚固的木板' },
      'lumber_3': { name: '柔韧木板', tier: 3, type: 'material', description: '柔韧的木板' },
      'lumber_4': { name: '承重木块', tier: 4, type: 'material', description: '承重木块' },
      'lumber_5': { name: '附魔木块', tier: 5, type: 'material', description: '附魔木块' },
      'lumber_6': { name: '龙纹木芯', tier: 6, type: 'material', description: '龙纹木芯' },
      'lumber_7': { name: '世界精华板', tier: 7, type: 'material', description: '世界精华板' },
      
      // 矿石类
      'ore_1': { name: '铜矿石', tier: 1, type: 'material', description: '基础矿石' },
      'ore_2': { name: '铁矿石', tier: 2, type: 'material', description: '常见矿石' },
      'ore_3': { name: '银矿石', tier: 3, type: 'material', description: '珍贵矿石' },
      'ore_4': { name: '金矿石', tier: 4, type: 'material', description: '稀有矿石' },
      'ore_5': { name: '白金矿石', tier: 5, type: 'material', description: '高级矿石' },
      'ore_6': { name: '秘银矿石', tier: 6, type: 'material', description: '传说矿石' },
      'ore_7': { name: '精金矿石', tier: 7, type: 'material', description: '神话矿石' },
      
      // 金属锭类
      'ingot_1': { name: '铜锭', tier: 1, type: 'material', description: '冶炼的铜锭' },
      'ingot_2': { name: '铁锭', tier: 2, type: 'material', description: '冶炼的铁锭' },
      'ingot_3': { name: '银锭', tier: 3, type: 'material', description: '冶炼的银锭' },
      'ingot_4': { name: '金锭', tier: 4, type: 'material', description: '冶炼的金锭' },
      'ingot_5': { name: '白金锭', tier: 5, type: 'material', description: '冶炼的白金锭' },
      'ingot_6': { name: '秘银锭', tier: 6, type: 'material', description: '冶炼的秘银锭' },
      'ingot_7': { name: '精金锭', tier: 7, type: 'material', description: '冶炼的精金锭' },
      
      // 纤维类
      'fiber_1': { name: '棉花', tier: 1, type: 'material', description: '基础纤维' },
      'fiber_2': { name: '亚麻', tier: 2, type: 'material', description: '优质纤维' },
      'fiber_3': { name: '丝绸纤维', tier: 3, type: 'material', description: '精品纤维' },
      'fiber_4': { name: '魔法纤维', tier: 4, type: 'material', description: '魔法纤维' },
      'fiber_5': { name: '星辰纤维', tier: 5, type: 'material', description: '星辰纤维' },
      'fiber_6': { name: '虚空纤维', tier: 6, type: 'material', description: '虚空纤维' },
      'fiber_7': { name: '神圣纤维', tier: 7, type: 'material', description: '神圣纤维' },
      
      // 线材类
      'yarn_1': { name: '棉线', tier: 1, type: 'material', description: '基础线材' },
      'yarn_2': { name: '亚麻线', tier: 2, type: 'material', description: '优质线材' },
      'yarn_3': { name: '丝线', tier: 3, type: 'material', description: '精品线材' },
      'yarn_4': { name: '魔法丝线', tier: 4, type: 'material', description: '魔法线材' },
      'yarn_5': { name: '星辰丝线', tier: 5, type: 'material', description: '星辰线材' },
      'yarn_6': { name: '虚空丝线', tier: 6, type: 'material', description: '虚空线材' },
      'yarn_7': { name: '神圣丝线', tier: 7, type: 'material', description: '神圣线材' },
      
      // 水晶类
      'crystal_1': { name: '微光水晶', tier: 1, type: 'material', description: '基础水晶' },
      'crystal_2': { name: '辉光水晶', tier: 2, type: 'material', description: '发光水晶' },
      'crystal_3': { name: '耀光水晶', tier: 3, type: 'material', description: '闪耀水晶' },
      'crystal_4': { name: '炽光水晶', tier: 4, type: 'material', description: '炽热水晶' },
      'crystal_5': { name: '圣光水晶', tier: 5, type: 'material', description: '神圣水晶' },
      'crystal_6': { name: '神光水晶', tier: 6, type: 'material', description: '神之水晶' },
      'crystal_7': { name: '创世水晶', tier: 7, type: 'material', description: '创世水晶' },
      'crystal_raw': { name: '原始水晶', tier: 1, type: 'material', description: '未加工的水晶' },
      
      // 食物类
      'meat_raw': { name: '生肉', tier: 1, type: 'material', description: '新鲜的生肉' },
      'milk': { name: '牛奶', tier: 1, type: 'material', description: '新鲜牛奶' },
      'egg': { name: '鸡蛋', tier: 1, type: 'material', description: '新鲜鸡蛋' },
      'fish_1': { name: '河鱼', tier: 1, type: 'material', description: '淡水鱼' },
      'fish_2': { name: '海鱼', tier: 2, type: 'material', description: '海水鱼' },
      'shrimp_1': { name: '河虾', tier: 1, type: 'material', description: '淡水虾' },
      'fruits': { name: '水果', tier: 1, type: 'material', description: '新鲜水果' },
      'food_cooked': { name: '熟食', tier: 1, type: 'consumable', description: '烹饪好的食物' },
      
      // 武器类
      'weapon_wooden_sword': { name: '木头短剑', tier: 1, type: 'weapon', description: '新手练习用的木剑' },
      'weapon_iron_sword': { name: '铁剑', tier: 2, type: 'weapon', description: '锋利的铁剑' },
      'weapon_steel_axe': { name: '钢斧', tier: 3, type: 'weapon', description: '沉重的钢斧' },
      'weapon_magic_staff': { name: '魔法法杖', tier: 4, type: 'weapon', description: '蕴含魔力的法杖' },
    };
    
    const pack = contentPack?.items?.find((i: any) => i.id === itemId);
    const legacy = itemInfoMap[itemId];
    if (pack) {
      return {
        name: pack.name || legacy?.name || itemId,
        tier: Number(pack.tier ?? legacy?.tier ?? 0),
        type: pack.type || legacy?.type || 'unknown',
        description: pack.description || legacy?.description || '',
      };
    }
    return legacy || { name: itemId, tier: 0, type: 'unknown', description: '未知物品' };
  };

  // 获取物品图标的辅助函数
  const getItemIcon = (itemId: string) => {
    const iconMap: Record<string, string> = {
      // 原木类
      'wood_1': '🪵', 'wood_2': '🌳', 'wood_3': '🌲', 'wood_4': '🌿', 'wood_5': '✨', 'wood_6': '🐉', 'wood_7': '🌟',
      
      // 木板类
      'lumber_1': '📋', 'lumber_2': '🪚', 'lumber_3': '🔧', 'lumber_4': '⚒️', 'lumber_5': '✨', 'lumber_6': '🐲', 'lumber_7': '🌌',
      
      // 矿石类
      'ore_1': '🟤', 'ore_2': '⚫', 'ore_3': '⚪', 'ore_4': '🟡', 'ore_5': '💎', 'ore_6': '🔮', 'ore_7': '⭐',
      
      // 金属锭类
      'ingot_1': '🟫', 'ingot_2': '⬛', 'ingot_3': '⬜', 'ingot_4': '🟨', 'ingot_5': '💍', 'ingot_6': '🔷', 'ingot_7': '🌟',
      
      // 纤维类
      'fiber_1': '🌾', 'fiber_2': '🌱', 'fiber_3': '🕸️', 'fiber_4': '✨', 'fiber_5': '⭐', 'fiber_6': '🌌', 'fiber_7': '👼',
      
      // 线材类
      'yarn_1': '🧶', 'yarn_2': '🪢', 'yarn_3': '🕷️', 'yarn_4': '✨', 'yarn_5': '⭐', 'yarn_6': '🌌', 'yarn_7': '👼',
      
      // 水晶类
      'crystal_1': '💎', 'crystal_2': '💠', 'crystal_3': '🔷', 'crystal_4': '🔥', 'crystal_5': '☀️', 'crystal_6': '🌟', 'crystal_7': '🌌',
      'crystal_raw': '🪨',
      
      // 食物类
      'meat_raw': '🥩', 'milk': '🥛', 'egg': '🥚', 'fish_1': '🐟', 'fish_2': '🐠', 'shrimp_1': '🦐', 'fruits': '🍎', 'food_cooked': '🍖',
      
      // 武器类
      'weapon_wooden_sword': '🗡️', 'weapon_iron_sword': '⚔️', 'weapon_steel_axe': '🪓', 'weapon_magic_staff': '🪄',
      // 药剂类
      'potion_hp_t1': '❤️', 'potion_hp_t2': '❤️‍🔥', 'potion_hp_t3': '💖', 'potion_hp_t4': '👑',
      'potion_mp_t1': '💧', 'potion_mp_t2': '🔷', 'potion_mp_t3': '💠', 'potion_mp_t4': '🌌',
      'potion_battle_fury': '🔥', 'potion_iron_skin': '🛡️',
      'potion_arcane_surge': '✨', 'potion_guardian_elixir': '⚔️', 'potion_craft_focus': '🧪', 'potion_fortune': '🍀',
      'potion_scholar': '📖', 'potion_berserk': '⚡', 'food_simple': '🍖', 'drink_basic': '🍹',
    };
    
    return iconMap[itemId] || '📦';
  };

  // 将制作需求中的中文名称映射到物品ID
  const getRequiredItemId = (itemName: string): string => {
    const nameToIdMap: Record<string, string> = {
      '平平无奇原木': 'wood_1',
      '坚硬原木': 'wood_2',
      '柔韧原木': 'wood_3',
      '白桦原木': 'wood_4',
      '幻霞原木': 'wood_5',
      '龙柏原木': 'wood_6',
      '神木原木': 'wood_7',
      '标准木板': 'lumber_1',
      '加固木板': 'lumber_2',
      '柔韧木板': 'lumber_3',
      '承重木块': 'lumber_4',
      '附魔木块': 'lumber_5',
      '龙纹木芯': 'lumber_6',
      '世界精华板': 'lumber_7',
    };
    
    return nameToIdMap[itemName] || contentPack?.items?.find((i: any) => i.name === itemName)?.id || itemName;
  };

  // 根据物品ID获取中文名称
  const getItemNameById = (itemId: string): string => {
    if (!contentPack?.items) return itemId;
    const item = contentPack.items.find((i: any) => i.id === itemId);
    return item?.name || itemId;
  };

  return (
    <div className="game-container">
      <GameHeader
        playerMode={playerState.mode}
        currentActivity={currentActivity}
        batchRemaining={playerState.lifeActionState?.remaining}
        batchTotal={playerState.lifeActionState?.quantity}
        battleActive={headerBattleActive}
        battleMonsterName={headerBattleName}
        battleSubtitle={headerBattleSubtitle}
        enhanceRun={playerState.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome
          ? {
              itemName: getItemNameById(playerState.enhanceRun.itemId),
              level: Number(playerState.equipment?.enhancementLevels?.[playerState.enhanceRun.itemId] || 0),
              target: playerState.enhanceRun.targetLevel,
              nextAttemptAt: playerState.enhanceRun.nextAttemptAt,
              intervalMs: playerState.enhanceRun.intervalMs,
            }
          : null}
        onStopEnhance={async () => {
          try {
            apiClient.clearCache()
            await apiClient.stopEnhanceRun()
            await refreshPlayerState()
          } catch (e: any) { toast.error(e?.message || '停止失败') }
        }}
        cycleCompleteFlash={cycleCompleteFlash}
        activeTab={activeTab}
        progress={progress}
        onStopActivity={stopCurrentActivity}
        onStopBattle={stopBattle}
        rewardNotification={rewardNotification}
        onOpenProg={(id) => setProgPanel(id)}
        claimableCount={claimableCount}
        checkInAvailable={checkInAvailable}
        gold={playerState.inventory.gold || 0}
        totalLevel={totalLevel}
        chapterComplete={chapter1Complete(playerState)}
      />
      <NextGoalBar
        goal={chapterGoal}
        goLabel={chapterGoal.id === "complete" ? (claimableCount > 0 ? `领工钱 ${claimableCount}` : "看成就") : undefined}
        onGo={() => {
          if (chapterGoal.id === "complete") {
            setProgPanel("achievements")
            return
          }
          if (chapterGoal.tab === "character") {
            setActiveTab("character")
            return
          }
          setActiveTab(chapterGoal.tab)
        }}
      />
      <ActionQueueBar
        queue={playerState.activityQueue || []}
        max={ACTION_QUEUE_MAX}
        current={
          playerState.mode === 'life_action' && playerState.lifeActionState && !headerBattleActive
            ? {
                name: actionNameOf(playerState.lifeActionState.actionId),
                quantity: playerState.lifeActionState.quantity,
                remaining: playerState.lifeActionState.remaining,
              }
            : null
        }
        nameOf={actionNameOf}
        durationOf={(actionId) => {
          const act = contentPack?.actions?.find((a: any) => a.id === actionId)
          return act?.duration ? act.duration / 1000 : 0
        }}
        onRemove={removeQueued}
        onMove={moveQueued}
        onClear={clearQueue}
      />

      {/* 主内容区域 */}
      <div className="game-main-layout">
        <SkillSidebar
          items={sidebarItems}
          activeTab={activeTab}
          runningId={runningNavId}
          skills={playerState.skills as any}
          combat={{ level: playerState.combatLevel || 1, xp: playerState.combatXp || 0 }}
          combatSkills={combatSkillRows}
          lockedIds={sidebarLocked}
          recommendedIds={sidebarRecommended}
          badges={navBadges}
          onLocked={onNavLocked}
          onSelect={onNavSelect}
        />
        <MobileNavBar
          activeTab={activeTab}
          runningId={runningNavId}
          skills={playerState.skills as any}
          combat={{ level: playerState.combatLevel || 1, xp: playerState.combatXp || 0 }}
          combatSkills={combatSkillRows}
          recommendedIds={sidebarRecommended}
          lockedIds={sidebarLocked}
          badges={navBadges}
          openSheet={mobileSheet}
          onOpenSheet={setMobileSheet}
          onLocked={onNavLocked}
          onSelect={onNavSelect}
        />

        <GameChatPanel
          expanded={isChatExpanded}
          onToggle={() => setIsChatExpanded(!isChatExpanded)}
          channel={chatChannel}
          onSwitchChannel={switchChannel}
          privateTarget={privateTarget}
          onPrivateChat={startPrivateChat}
          unread={unreadCounts}
          professionIcon={getCurrentProfession().icon}
          wsStatus={wsStatus}
          messages={chatMessages}
          input={chatInput}
          onInput={setChatInput}
          onSend={sendChatMessage}
          onKeyPress={handleChatKeyPress}
          showEmojiPicker={showEmojiPicker}
          onToggleEmoji={() => setShowEmojiPicker(!showEmojiPicker)}
          onInsertEmoji={insertEmoji}
        />

        
        {/* 游戏内容 */}
        <main className="game-content">
        {/* 冒险页面 */}
        {activeTab === 'adventure' && (
          <div className={`adventure-layout${battleState ? ' combat-open' : ''}`}>
            {!battleState && (
              <div className="adventure-command-bar">
                <div className="adventure-command-top">
                  <div className="adventure-zone-bar">
                    <h2 className="section-title adventure-title">冒险</h2>
                    <div className="adventure-zone-tabs" role="tablist" aria-label="区域选择">
                      {zoneDoors(adventureStages, chapterDone).open.map((map) => (
                        <button
                          key={map.id}
                          type="button"
                          onClick={() => setSelectedMap(map.id)}
                          className={`map-btn ${selectedMap === map.id ? 'active' : ''}`}
                        >
                          {map.name}
                        </button>
                      ))}
                      {zoneDoors(adventureStages, chapterDone).locked && (
                        <button
                          type="button"
                          className="map-btn locked"
                          disabled
                          title={chapterDone ? "更远的路。先在前面的区域站稳。" : "第一章结束后才会开放"}
                        >
                          {`${zoneDoors(adventureStages, chapterDone).locked!.name}（未开放）`}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="adventure-status-right">
                    <CombatHpChip
                      maxHp={combatSheet.hp}
                      combatHp={playerState.combatHp}
                      combatHpAt={playerState.combatHpAt}
                      activeClassId={playerState.activeClassId}
                    />
                  </div>
                </div>

                {!playerState.equipment?.main_hand && (
                  <div className="page-info adventure-hint-banner">
                    <p>
                      还没装备武器。去制作做一把短剑，再点角色穿上。
                      <button
                        type="button"
                        className="header-menu-btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          setCurrentProfession('woodcutter');
                          setActiveTab('woodworking');
                          setCraftCategory('weapons');
                          setIsRightPanelExpanded(true);
                          void apiClient.setActiveClass('woodcutter').catch(() => undefined);
                        }}
                      >
                        去做武器
                      </button>
                    </p>
                  </div>
                )}
                {chapterGoal.id === 'chest' && !!playerState.equipment?.main_hand && !playerState.equipment?.chest && (
                  <div className="page-info adventure-hint-banner">
                    <p>
                      武器有了，但林子里的小猴和寄居蟹可不好惹。先去木工做出木制胸甲，再到角色穿上。
                      <button
                        type="button"
                        className="header-menu-btn"
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          setCurrentProfession('woodcutter');
                          setActiveTab('woodworking');
                          setCraftCategory('equipment');
                          setIsRightPanelExpanded(true);
                          void apiClient.setActiveClass('woodcutter').catch(() => undefined);
                        }}
                      >
                        去做护甲
                      </button>
                    </p>
                  </div>
                )}

                <div className="adventure-tactical-dock">
                  <div className="tactical-dock-group tactical-potions-group">
                    <span className="tactical-dock-label">🧪 战斗补给</span>
                    <CombatPotionBar
                      loadout={playerState.combatLoadout}
                      items={contentPack?.items as any}
                      inventory={playerState.inventory}
                      equipment={playerState.equipment as any}
                      activeBuffs={playerState.activeBuffs}
                      playerHp={playerState.combatHp ?? combatSheet.hp}
                      playerMaxHp={combatSheet.hp}
                      playerMp={combatSheet.mp ?? 50}
                      playerMaxMp={combatSheet.mp ?? 50}
                      now={combatNow}
                      iconOf={getItemIcon}
                      onChangeLoadout={async (next) => {
                        try {
                          apiClient.clearCache()
                          await apiClient.setCombatLoadout(next)
                          await refreshPlayerState()
                        } catch (e: any) {
                          toast.error(e?.message || '保存药剂槽失败')
                        }
                      }}
                      onManualConsume={async (itemId) => {
                        try {
                          apiClient.clearCache()
                          const res = await apiClient.consumeItem(itemId)
                          await refreshPlayerState()
                          const parts: string[] = []
                          if (res?.healed?.hp) parts.push(`+${res.healed.hp} 生命`)
                          if (res?.healed?.mp) parts.push(`+${res.healed.mp} 魔力`)
                          if (res?.buff?.name) parts.push(`激活「${res.buff.name}」`)
                          toast.success(`已饮用 ${res?.itemName || getItemNameById(itemId)}${parts.length ? `（${parts.join(' · ')}）` : ''}`)
                        } catch (e: any) {
                          toast.error(e?.message || '饮用药剂失败')
                        }
                      }}
                      onQuickBuyPotion={async (itemId, qty) => {
                        try {
                          apiClient.clearCache()
                          await apiClient.shopBuy(itemId, qty)
                          await refreshPlayerState()
                          toast.success(`购买成功：${getItemNameById(itemId)} ×${qty}`)
                          return true
                        } catch (e: any) {
                          toast.error(e?.message || '金币不足或购买失败')
                          return false
                        }
                      }}
                    />
                  </div>

                  <div className="tactical-dock-divider" aria-hidden="true" />

                  <div className="tactical-dock-group tactical-skills-group">
                    <span className="tactical-dock-label">✨ 自动技能</span>
                    <div className="tactical-skill-chain">
                      {equippedAbilities.length > 0 ? (
                        equippedAbilities.map((a, idx) => (
                          <span key={a.def.id} className="tactical-skill-pill">
                            {idx > 0 && <em className="tactical-skill-arrow">→</em>}
                            <b>{a.def.name}</b>
                            {a.level > 1 && <small>Lv.{a.level}</small>}
                          </span>
                        ))
                      ) : (
                        <span className="tactical-skill-empty">未装备技能</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="header-menu-btn combat-config-toggle"
                      aria-expanded={showCombatConfig}
                      onClick={() => setShowCombatConfig((v) => !v)}
                    >
                      {showCombatConfig ? '收起技能' : '⚙️ 配置技能'}
                    </button>
                  </div>
                </div>

                {showCombatConfig && (
                  <div className="combat-config-body">
                    <AbilityLoadoutPanel
                      catalog={abilityCatalog}
                      known={playerState.abilities}
                      loadout={playerState.abilityLoadout}
                      slotCount={abilitySlotCount(playerState)}
                      intelligenceLevel={playerState.combatSkills?.intelligence?.level || 1}
                      compact
                      onChange={async (slots) => {
                        try {
                          apiClient.clearCache()
                          await apiClient.setAbilityLoadout(slots)
                          await refreshPlayerState()
                        } catch (e: any) {
                          toast.error(e?.message || '保存技能配置失败')
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 战斗状态时显示战斗界面 */}
            {battleState ? (
              <div className="battle-full-screen">
                <div className="battle-status-panel-center">
                  <div className="battle-header">
                    <div className="battle-title-section">
                      <h3>战斗</h3>
                      <div className="battle-stats-compact">
                        {(playerState.hpCombat?.streak || 0) > 0 && (
                          <>
                            <span className="battle-count">连胜 {playerState.hpCombat?.streak}</span>
                            <span className="battle-separator">|</span>
                          </>
                        )}
                        <span className="battle-earnings">
                          胜利奖励 {battleState.monster.xp || 0} XP · {battleState.monster.gold || 0} 金
                        </span>
                        <span className="battle-separator">|</span>
                        <span className="battle-auto">连续战斗中</span>
                      </div>
                    </div>
                    <button className="btn-back" onClick={stopBattle}>
                      ← 返回
                    </button>
                  </div>
                  
                  <div className="battle-display-center">
                    {/* 胜利特效覆盖层 */}
                    {showVictoryFx && (
                      <div className="victory-fx-overlay" aria-hidden="true" />
                    )}
                    <div className={`battle-entity player-entity${hitShake.player ? ' entity-hit' : ''}`}>
                      <div className="entity-name">{playerName}</div>
                      <div className="entity-level">Lv.{playerState.combatLevel || 1}</div>
                      <div className={`entity-avatar${hitShake.player ? ' avatar-shake' : ''}`}>
                        <MonsterSceneBackdrop
                          monsterId="slime"
                          mapId={battleState.monster.map || selectedMap}
                          variant="avatar"
                        />
                        <T1Art kind="character" id={characterArtId(currentProfession || "woodcutter", playerGender)} alt="" />
                      </div>
                      {/* 玩家伤害飘字 */}
                      <div className="damage-float-container">
                        {damageFloats.filter(d => d.target === 'player').map(d => (
                          <span key={d.id} className={`damage-float damage-taken${d.isCrit ? ' crit' : ''}`}>
                            -{d.damage}
                          </span>
                        ))}
                      </div>
                      <div className="hp-bar">
                        <div className="hp-label-enhanced">
                          <span>HP</span>
                          <span className="hp-percentage" style={{
                            color: battleState.playerHp / battleState.playerMaxHp > 0.5 ? '#4CAF50' : 
                                   battleState.playerHp / battleState.playerMaxHp > 0.2 ? '#FFC107' : '#f44336'
                          }}>
                            {Math.round((battleState.playerHp / battleState.playerMaxHp) * 100)}%
                          </span>
                        </div>
                        <div className="hp-container">
                          <div 
                            className="hp-fill player-hp" 
                            style={{ 
                              width: `${Math.max(0, (battleState.playerHp / battleState.playerMaxHp) * 100)}%`,
                              background: battleState.playerHp / battleState.playerMaxHp > 0.5 ? 
                                'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)' :
                                battleState.playerHp / battleState.playerMaxHp > 0.2 ?
                                'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)' :
                                'linear-gradient(90deg, #f44336 0%, #EF5350 100%)'
                            }}
                          ></div>
                        </div>
                        <div className="hp-numbers">{battleState.playerHp}/{battleState.playerMaxHp}</div>
                      </div>
                      {/* 魔力（MWI）：技能消耗，普攻回蓝 */}
                      {(playerState.hpCombat?.playerMaxMp || 0) > 0 && (
                        <div className="mp-bar" aria-label="魔力">
                          <div className="mp-container">
                            <div
                              className="mp-fill"
                              style={{ width: `${Math.max(0, Math.min(100, ((playerState.hpCombat!.playerMp || 0) / (playerState.hpCombat!.playerMaxMp || 1)) * 100))}%` }}
                            />
                          </div>
                          <div className="mp-numbers">
                            MP {playerState.hpCombat!.playerMp ?? 0}/{playerState.hpCombat!.playerMaxMp} ({Math.round(((playerState.hpCombat!.playerMp || 0) / Math.max(1, playerState.hpCombat!.playerMaxMp || 1)) * 100)}%)
                          </div>
                        </div>
                      )}
                      {/* 玩家读条（战斗结束后清零，不残留半截充能态） */}
                      <div className={`cast-bar${battleState.isActive && battleState.playerCastTime / battleState.playerCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                        <div className="cast-container">
                          <div 
                            className="cast-fill player-cast" 
                            style={{ width: `${battleState.isActive ? Math.max(0, Math.min(100, (battleState.playerCastTime / battleState.playerCastDuration) * 100)) : 0}%` }}
                          ></div>
                        </div>
                        <div className="cast-time">
                          {battleState.isActive
                            ? `${(battleState.playerCastTime / 1000).toFixed(1)}s / ${(battleState.playerCastDuration / 1000).toFixed(1)}s (${Math.min(100, Math.floor((battleState.playerCastTime / Math.max(1, battleState.playerCastDuration)) * 100))}%)`
                            : `${(battleState.playerCastDuration / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>

                    <div className="battle-vs-center">
                      <div className={`vs-text${showVictoryFx ? ' vs-victory' : ''}`}>VS</div>
                      <div className="turn-indicator">
                        {!battleState.isActive && battleState.enemyHp <= 0 ? '胜利' :
                         !battleState.isActive && battleState.playerHp <= 0 ? '失败' :
                         '战斗中'}
                      </div>
                    </div>

                    <div className={`battle-entity enemy-entity${hitShake.enemy ? ' entity-hit' : ''}`}>
                      <div className="entity-name">{battleState.monster.name}</div>
                      <div className="entity-level">Lv.{battleState.monster.level}</div>
                      <div className={`entity-avatar${hitShake.enemy ? " avatar-shake" : ""}${battleState.monster.isBoss ? " is-boss-art" : ""}`}>
                        <MonsterSceneBackdrop
                          monsterId={battleState.monster.id}
                          mapId={battleState.monster.map || selectedMap}
                          isBoss={battleState.monster.isBoss}
                          variant="avatar"
                        />
                        <T1Art kind="monster" id={battleState.monster.id} fallback={battleState.monster.icon || ''} alt="" />
                      </div>
                      {/* 敌人伤害飘字 */}
                      <div className="damage-float-container">
                        {damageFloats.filter(d => d.target === 'enemy').map(d => (
                          <span key={d.id} className={`damage-float damage-dealt${d.isCrit ? ' crit' : ''}`}>
                            -{d.damage}
                          </span>
                        ))}
                      </div>
                      <div className="hp-bar">
                        <div className="hp-label-enhanced">
                          <span>HP</span>
                          <span className="hp-percentage" style={{
                            color: battleState.enemyHp / battleState.enemyMaxHp > 0.5 ? '#f44336' : 
                                   battleState.enemyHp / battleState.enemyMaxHp > 0.2 ? '#FF9800' : '#4CAF50'
                          }}>
                            {Math.round((battleState.enemyHp / battleState.enemyMaxHp) * 100)}%
                          </span>
                        </div>
                        <div className="hp-container">
                          <div 
                            className="hp-fill enemy-hp" 
                            style={{ 
                              width: `${Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100)}%`,
                              background: battleState.enemyHp / battleState.enemyMaxHp > 0.5 ? 
                                'linear-gradient(90deg, #f44336 0%, #EF5350 100%)' :
                                battleState.enemyHp / battleState.enemyMaxHp > 0.2 ?
                                'linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)' :
                                'linear-gradient(90deg, #4CAF50 0%, #66BB6A 100%)'
                            }}
                          ></div>
                        </div>
                        <div className="hp-numbers">{battleState.enemyHp}/{battleState.enemyMaxHp}</div>
                      </div>
                      {/* 敌人读条（战斗结束后清零） */}
                      <div className={`cast-bar${battleState.isActive && battleState.enemyCastTime / battleState.enemyCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                        <div className="cast-container">
                          <div 
                            className="cast-fill enemy-cast" 
                            style={{ width: `${battleState.isActive ? Math.max(0, Math.min(100, (battleState.enemyCastTime / battleState.enemyCastDuration) * 100)) : 0}%` }}
                          ></div>
                        </div>
                        <div className="cast-time">
                          {battleState.isActive
                            ? `${(battleState.enemyCastTime / 1000).toFixed(1)}s / ${(battleState.enemyCastDuration / 1000).toFixed(1)}s (${Math.min(100, Math.floor((battleState.enemyCastTime / Math.max(1, battleState.enemyCastDuration)) * 100))}%)`
                            : `${(battleState.enemyCastDuration / 1000).toFixed(1)}s`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MWI battle statistics: cumulative stats from the start of combat */}
                  {(() => {
                    const rs = playerState?.hpCombat?.runStats ?? {
                      startedAt: playerState?.hpCombat?.startedAt || combatNow,
                      kills: 0,
                      xp: 0,
                      gold: 0,
                      loot: {} as Record<string, number>,
                    }
                    const deaths = playerState?.hpCombat?.deaths ?? 0
                    const startMs = rs.startedAt || playerState?.hpCombat?.startedAt || combatNow
                    const elapsedMs = Math.max(0, combatNow - startMs)
                    const totalSecs = Math.max(0, Math.floor(elapsedMs / 1000))
                    const hrs = Math.floor(totalSecs / 3600)
                    const mins = Math.floor((totalSecs % 3600) / 60)
                    const secs = totalSecs % 60
                    const durationText = hrs > 0
                      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                    const lootEntries = Object.entries(rs.loot || {})
                    return (
                      <div className="battle-run-stats" aria-label="战斗累计统计">
                        <span className="run-stat">
                          <small>战斗时长</small>
                          <strong>{durationText}</strong>
                        </span>
                        <span className="run-stat">
                          <small>累计击杀</small>
                          <strong>{rs.kills.toLocaleString()}</strong>
                        </span>
                        <span className="run-stat">
                          <small>死亡次数</small>
                          <strong className={deaths > 0 ? 'stat-danger-val' : ''}>{deaths}</strong>
                        </span>
                        <span className="run-stat">
                          <small>累计经验</small>
                          <strong>+{Math.round(rs.xp).toLocaleString()}</strong>
                        </span>
                        <span className="run-stat">
                          <small>累计金币</small>
                          <strong>+{Math.round(rs.gold).toLocaleString()}</strong>
                        </span>
                        <span className="run-stat run-loot">
                          <small>累计掉落</small>
                          {lootEntries.length === 0 ? (
                            <strong>暂无</strong>
                          ) : (
                            <span className="run-loot-list">
                              {lootEntries.map(([id, qty]) => (
                                <span className="run-loot-chip" key={id} title={`${getItemNameById(id)} ×${qty}`}>
                                  <T1ItemIcon itemId={id} fallback={getItemIcon(id)} alt="" />
                                  <span className="run-loot-name">{getItemNameById(id)}</span>
                                  <b>×{qty}</b>
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })()}

                  <div className="battle-controls-center">
                    {!battleState.isActive && battleState.enemyHp <= 0 && battleState.playerHp > 0 && !battleState.isPlayerDead && (
                      <div className="auto-continue-info">
                        <div className="victory-text">战斗胜利</div>
                        <div className="victory-rewards">
                          <span className="reward-item">+{battleState.monster.xp} 经验</span>
                          <span className="reward-item">+{battleState.monster.gold} 金币</span>
                          {battleState.drops.map((d) => (
                            <span className="reward-item reward-drop" key={d.itemId}>
                              <T1ItemIcon itemId={d.itemId} fallback={getItemIcon(d.itemId)} alt="" />
                              +{d.qty} {d.name}
                            </span>
                          ))}
                        </div>
                        {playerState.hpCombat?.xpGained && (() => {
                          const main = mainCombatSkill(playerState)
                          const paid = Object.keys(playerState.hpCombat!.xpGained!).filter((k) => (playerState.hpCombat!.xpGained![k] || 0) > 0)
                          const order = [main, 'stamina', 'intelligence', 'attack', 'defense', 'melee', 'ranged', 'magic']
                            .filter((k, i, arr) => arr.indexOf(k) === i && paid.includes(k))
                          return (
                            <div className="victory-xp-split" aria-label="经验分配">
                              {order.map((k) => (
                                <span className={`xp-chip${k === main ? ' main' : ''}`} key={k}>
                                  {COMBAT_SKILL_LABEL[k]} +{playerState.hpCombat!.xpGained![k] ?? 0}
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                        {(playerState.hpCombat?.consumed?.length || 0) > 0 && (
                          <div className="victory-consumed">
                            本场用掉：{playerState.hpCombat!.consumed!.map((c) => `${c.name} ×${c.qty}`).join('、')}
                          </div>
                        )}
                        {playerState.hpCombat?.nextFightAt ? (
                          <>
                            <div className="auto-text">
                              {Math.max(0, Math.ceil((playerState.hpCombat.nextFightAt - Date.now()) / 1000))} 秒后自动开始下一场（连胜 {playerState.hpCombat.streak || 0}）
                            </div>
                            <button className="btn-stop-large" onClick={stopBattle}>
                              停止战斗
                            </button>
                          </>
                        ) : (
                          <div className="victory-actions">
                            <button className="btn-continue-large" onClick={() => startBattle(battleState.monster)}>
                              继续战斗
                            </button>
                            <button className="btn-stop-large" onClick={stopBattle}>
                              返回
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {battleState.isPlayerDead && (
                      <div className="revive-info">
                        <div className="death-text">战斗失败</div>
                        {playerState.hpCombat?.nextFightAt ? (
                          <>
                            <div className="revive-countdown">
                              <div className="countdown-text">
                                {Math.max(0, Math.ceil((playerState.hpCombat.nextFightAt - Date.now()) / 1000))} 秒后重生，继续挑战 {battleState.monster.name}
                                {(playerState.hpCombat.deaths || 0) > 0 ? `（本轮已阵亡 ${playerState.hpCombat.deaths} 次）` : ''}
                              </div>
                              <div className="countdown-hint">
                                连续输说明配置不够：{playerState.equipment?.chest ? '试试换构筑、配食物槽，或先打更软的怪。' : '先做一件木制胸甲，再配一格食物。'}
                              </div>
                            </div>
                            <button className="btn-stop-large" onClick={stopBattle}>
                              停止战斗
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="revive-countdown">
                              <div className="countdown-hint">
                                连续阵亡已达上限，自动停止战斗以保护装备耐久。调整装备或补给后再战。
                              </div>
                            </div>
                            <div className="victory-actions">
                              <button className="btn-continue-large" onClick={() => startBattle(battleState.monster)}>
                                重新挑战
                              </button>
                              <button className="btn-stop-large" onClick={stopBattle}>
                                返回
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {battleState.isActive && !battleState.isPlayerDead && (
                      <div className="battle-progress">
                        {playerState?.hpCombat?.guardActive && (
                          <div className="progress-text">格挡中 — 用重劈破防</div>
                        )}
                        {playerState?.hpCombat?.wrathActive && (
                          <div className="progress-text">自然之怒</div>
                        )}
                        {(playerState?.hpCombat?.enrageStacks || 0) > 0 && (
                          <div className="progress-text enrage">狂暴 ×{playerState!.hpCombat!.enrageStacks}（怪物伤害 +{(playerState!.hpCombat!.enrageStacks || 0) * 10}%）</div>
                        )}
                        <AbilityBar
                          abilities={equippedAbilities}
                          readyAt={(id) => (id === 'heavy_chop' ? playerState.hpCombat?.heavyChopReadyAt || 0 : playerState.hpCombat?.abilityReadyAt?.[id] || 0)}
                          now={combatNow}
                          mp={playerState.hpCombat?.playerMp ?? combatSheet.mp ?? 0}
                          maxMp={playerState.hpCombat?.playerMaxMp ?? combatSheet.mp ?? 0}
                          guardActive={!!playerState.hpCombat?.guardActive}
                          disabled={!playerState.hpCombat || !!playerState.hpCombat.outcome}
                        />
                        <button className="btn-stop-small" onClick={stopBattle}>
                          停止战斗
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 银河奶牛式常驻战斗药剂与补给栏：HP药 + MP药 + 3格状态药 + 一键手动喝药与随身买药 */}
                  <CombatPotionBar
                    inCombat
                    loadout={playerState.combatLoadout}
                    items={contentPack?.items as any}
                    inventory={playerState.inventory}
                    equipment={playerState.equipment as any}
                    activeBuffs={playerState.activeBuffs}
                    playerHp={battleState.playerHp}
                    playerMaxHp={battleState.playerMaxHp}
                    playerMp={playerState.hpCombat?.playerMp ?? combatSheet.mp ?? 0}
                    playerMaxMp={playerState.hpCombat?.playerMaxMp ?? combatSheet.mp ?? 0}
                    foodReadyAt={playerState.hpCombat?.foodReadyAt}
                    mpReadyAt={playerState.hpCombat?.mpReadyAt}
                    now={combatNow}
                    iconOf={getItemIcon}
                    onChangeLoadout={async (next) => {
                      try {
                        apiClient.clearCache()
                        await apiClient.setCombatLoadout(next)
                        await refreshPlayerState()
                      } catch (e: any) {
                        toast.error(e?.message || '保存药剂槽失败')
                      }
                    }}
                    onManualConsume={async (itemId) => {
                      try {
                        apiClient.clearCache()
                        const res = await apiClient.consumeItem(itemId)
                        await refreshPlayerState()
                        const parts: string[] = []
                        if (res?.healed?.hp) parts.push(`+${res.healed.hp} 生命`)
                        if (res?.healed?.mp) parts.push(`+${res.healed.mp} 魔力`)
                        if (res?.buff?.name) parts.push(`激活「${res.buff.name}」`)
                        toast.success(`已饮用 ${res?.itemName || getItemNameById(itemId)}${parts.length ? `（${parts.join(' · ')}）` : ''}`)
                      } catch (e: any) {
                        toast.error(e?.message || '饮用药剂失败')
                      }
                    }}
                    onQuickBuyPotion={async (itemId, qty) => {
                      try {
                        apiClient.clearCache()
                        await apiClient.shopBuy(itemId, qty)
                        await refreshPlayerState()
                        toast.success(`购买成功：${getItemNameById(itemId)} ×${qty}`)
                        return true
                      } catch (e: any) {
                        toast.error(e?.message || '金币不足或购买失败')
                        return false
                      }
                    }}
                  />

                  <div className="battle-log-center">
                    <h4>📜 战斗记录</h4>
                    <div className="log-content">
                      {battleState.battleLog.map((log, index) => {
                        const mechanic = mechanicLogMatcher(adventureStages.flatMap((s) => s.encounters).find((e) => e.id === battleState.monster.id)?.mechanicDefs)(log)
                        const phase = mechanic === 'warn' || /举起树皮盾|自然之怒|蓄力举盾|震碎|破防/.test(log)
                        const hazard = !phase && mechanic === 'hazard'
                        const heavy = !phase && !hazard && log.includes('重劈')
                        const potion = !phase && !hazard && (/🧪|吃了|喝下了/.test(log))
                        const drop = log.startsWith('掉落')
                        const end = /被击败了|你被击败/.test(log)
                        const cls = phase ? ' log-phase' : hazard ? ' log-hazard' : potion ? ' log-potion' : heavy ? ' log-heavy' : drop ? ' log-drop' : end ? ' log-end' : ''
                        return (
                          <div key={`${battleState.battleCount}-${index}`} className={`log-entry${cls}`}>
                            {log}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 非战斗状态显示怪物选择 */
              <div className="adventure-content">
                <div className="monster-grid">
                  {selectedEncounters.map((monster) => {
                    const info = fightInfo(monster);
                    return (
                      <div
                        key={monster.id}
                        className={`monster-card ${isCurrentlyFighting(monster.id) ? 'active' : ''} ${monster.isBoss ? 'boss' : ''}`}
                        onClick={() => { 
                          setSelectedItem(monster); 
                          setModalType('monster'); 
                        }}
                      >
                        <div className="card-image">
                          <MonsterSceneBackdrop
                            monsterId={monster.id}
                            mapId={monster.map || selectedMap}
                            isBoss={monster.isBoss}
                            variant="card"
                          />
                          <div className="placeholder-img monster-placeholder">
                            <T1Art kind="monster" id={monster.id} fallback={monster.icon || ''} alt="" />
                          </div>
                          {info.kills > 0 && <div className="card-kills">已击败 ×{info.kills}</div>}
                        </div>
                        <div className="card-title">{monster.name}</div>
                        <div className="card-identity">Lv.{monster.level}</div>
                        <div className="card-reward">{encounterRewardLine(monster)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'character' && (
          <CharacterSheet
            playerName={playerName}
            totalLevel={totalLevel}
            combatLevel={playerState.combatLevel || 1}
            sheet={combatSheet}
            activeClassId={currentProfession}
            activeClassName={getCurrentProfession().name}
            playerGender={playerGender}
            playerAvatar={playerAvatar}
            onChangeAvatar={changePlayerAvatar}
            onOpenProfessionModal={chapterDone ? () => setShowProfessionModal(true) : undefined}
            mainSkill={mainCombatSkill(playerState)}
            focusSkill={(() => {
              // mirrors backend focusedCombatSkill: first equipped accessory with a focusSkill wins
              const eq = playerState.equipment as { accessory1?: string; accessory2?: string; durability?: Record<string, number> } | undefined
              for (const id of [eq?.accessory1, eq?.accessory2]) {
                if (!id || (playerState.inventory?.[id] || 0) <= 0) continue
                const dur = eq?.durability?.[id]
                if (typeof dur === 'number' && Number.isFinite(dur) && dur <= 0) continue
                const def: any = contentPack?.items?.find((it: any) => it.id === id)
                if (def?.focusSkill) return String(def.focusSkill)
              }
              return undefined
            })()}
            combatSkills={COMBAT_SKILL_KEYS.map((id) => ({
              id,
              name: COMBAT_SKILL_LABEL[id],
              blurb: (contentPack?.combatSkills as Array<{ id: string; blurb: string }> | undefined)?.find((c) => c.id === id)?.blurb || '',
              level: playerState.combatSkills?.[id]?.level || 1,
              xp: playerState.combatSkills?.[id]?.xp || 0,
            }))}
            abilities={Object.entries(playerState.abilities || {}).map(([id, st]) => {
              const def = abilityCatalog?.find((a) => a.id === id)
              const slot = (playerState.abilityLoadout || []).find((s) => s.abilityId === id)
              return {
                id,
                name: def?.name || id,
                level: st.level,
                xp: st.xp,
                equipped: Boolean(slot),
                blurb: def?.blurb,
                cooldownMs: def?.cooldownMs,
                mpCost: def?.mpCost,
                damageMult: def?.damageMult,
                healPct: def?.healPct,
                guardMult: def?.guardMult,
                durationMs: def?.durationMs,
                breaksGuard: def?.breaksGuard,
                levelStep: def?.levelStep,
                triggerText: slot ? describeTrigger(slot.trigger) : undefined,
              }
            })}
            slots={[...equipSlots.left, ...equipSlots.right].map((s, _i, arr) => {
              const itemId = getEquippedItemId(s.id)
              const def: any = itemId ? contentPack?.items?.find((it: any) => it.id === itemId) : undefined
              const dup = arr.filter((x) => x.name === s.name).length > 1
              const tool = s.id === 'tool'
              const enh = itemId ? Number(playerState.equipment?.enhancementLevels?.[itemId] || 0) : 0
              const mult = enhancementStatMultiplier(enh, def)
              const effective = (n: number) => Math.round(n * mult * 10) / 10
              const dur = itemId ? playerState.equipment?.durability?.[itemId] : undefined
              const maxDur = itemId ? (playerState.equipment?.maxDurability?.[itemId] || 100) : 100
              const durRecorded = typeof dur === 'number' && Number.isFinite(dur)
              const durabilityPct = durRecorded ? Math.max(0, Math.min(100, Math.round((dur / maxDur) * 1000) / 10)) : undefined
              const broken = durRecorded && dur <= 0
              const repairCost = durRecorded ? Math.ceil((maxDur - Math.max(0, dur)) * 0.5) : undefined
              return {
                id: s.id,
                name: s.name,
                icon: s.icon,
                ariaLabel: dup ? `${s.name} ${arr.filter((x) => x.name === s.name).indexOf(s) + 1}` : undefined,
                itemId,
                itemName: itemId ? `${getItemNameById(itemId)}${enh ? ` +${enh}` : ''}` : '',
                durabilityPct,
                broken,
                repairCost,
                available: !itemId && getEquippableItems(s.id).length > 0,
                effect: tool
                  ? toolEffectLine(def, professionLabel(def?.toolFor), enh)
                  : def ? [def.atk ? `攻击 +${effective(def.atk)}` : '', def.mag ? `魔力伤害 +${effective(def.mag)}` : '', def.def ? `防御 +${effective(def.def)}` : '', def.hp ? `生命 +${effective(def.hp)}` : ''].filter(Boolean).join(' · ') : '',
                hint: tool ? '斧头、锤子等工具：加快对应技能，不参与战斗' : undefined,
              }
            })}
            onOpenSlot={(slotId) => openEquipSelector(slotId)}
            onRepairItem={async (itemId) => {
              if (repairingItemId) return
              setRepairingItemId(itemId)
              try {
                apiClient.clearCache()
                await apiClient.repairEquipment(itemId, 'full')
                toast.success('装备已修理')
                await refreshPlayerState()
              } catch (e: any) {
                toast.error(e?.message || '修理失败')
              } finally {
                setRepairingItemId(null)
              }
            }}
            onRepairAll={async () => {
              if (repairingItemId) return
              const damagedIds = [...equipSlots.left, ...equipSlots.right]
                .map((s) => getEquippedItemId(s.id))
                .filter((id): id is string => {
                  if (!id) return false
                  const d = playerState.equipment?.durability?.[id]
                  const maxD = playerState.equipment?.maxDurability?.[id] || 100
                  return typeof d === 'number' && Number.isFinite(d) && d < maxD
                })
              const uniqueIds = [...new Set(damagedIds)]
              if (!uniqueIds.length) return
              setRepairingItemId('__all__')
              try {
                apiClient.clearCache()
                for (const id of uniqueIds) {
                  await apiClient.repairEquipment(id, 'full')
                }
                toast.success(`已全部修理（${uniqueIds.length} 件装备）`)
                await refreshPlayerState()
              } catch (e: any) {
                toast.error(e?.message || '修理失败')
              } finally {
                setRepairingItemId(null)
              }
            }}
            repairingItemId={repairingItemId}
            setBonuses={setBonuses}
          />
        )}

        {/* 背包页（银河奶牛式分组物品格） */}
        {activeTab === 'inventory' && (
          <InventoryPage
            rows={Object.entries(playerState.inventory)
              .filter(([key, value]) => key !== 'gold' && (value || 0) > 0)
              .map(([itemId, count]) => ({ itemId, count: Number(count), ...getItemInfo(itemId) }))}
            gold={playerState.inventory.gold || 0}
            packItems={contentPack?.items}
            equippedIds={new Set(Object.values(playerState.equipment || {}).filter((v): v is string => typeof v === 'string'))}
            enhancementLevels={playerState.equipment?.enhancementLevels}
            iconOf={getItemIcon}
            onOpen={(row) => {
              setSelectedItem({ ...row, id: row.itemId })
              setModalType('item')
            }}
          />
        )}

        {/* 任务板（银河奶牛式：按冷却发放的技能任务 + 代币商店） */}
        {activeTab === 'tasks' && (
          <TasksPage
            actions={contentPack?.actions}
            iconOf={getItemIcon}
            gold={playerState.inventory.gold || 0}
            progressKey={`${playerState.stats?.totalActions || 0}:${playerState.stats?.totalKills || 0}`}
            onGoldChange={() => { void refreshPlayerState() }}
          />
        )}

        {/* 房屋（银河奶牛式：每技能一间房，材料沉没换永久加成） */}
        {activeTab === 'houses' && (
          <HousesPage
            iconOf={getItemIcon}
            gold={playerState.inventory.gold || 0}
            refreshKey={JSON.stringify(playerState.inventory)}
            onChanged={() => { void refreshPlayerState() }}
          />
        )}

        {/* 伐木页面 */}
        {activeTab === 'logging' && renderGatherPage('logging')}

        {/* 伐木厂 - 木工页面 */}
        {activeTab === 'woodworking' && renderCraftPage('woodworking')}

        {/* 铁匠 - 挖矿页面 */}
        {activeTab === 'mining' && renderGatherPage('mining')}

        {/* 铁匠 - 锻造页面 */}
        {activeTab === 'smithing' && renderCraftPage('smithing')}

        {/* 农夫 - 畜牧页面 */}
        {activeTab === 'husbandry' && renderCraftPage('husbandry')}

        {/* 厨师 - 烹饪页面 */}
        {activeTab === 'cooking' && renderCraftPage('cooking')}

        {/* 裁缝 - 缝纫页面 */}
        {activeTab === 'tailoring' && renderCraftPage('tailoring')}

        {/* 炼金术师 - 炼金页面 */}
        {activeTab === 'alchemy' && renderCraftPage('alchemy')}

        {/* 农夫 - 种植页面 */}
        {activeTab === 'farming' && renderGatherPage('farming')}

        {/* 厨师 - 钓鱼页面 */}
        {activeTab === 'fishing' && renderGatherPage('fishing')}

        {/* 裁缝 - 采集页面 */}
        {activeTab === 'gathering' && renderGatherPage('gathering')}

        {/* 炼金术师 - 水晶页面 */}
        {activeTab === 'crystal_mining' && renderGatherPage('crystal_mining')}

        {/* 背包页面 */}
        {/* 装备强化页面 */}
        {activeTab === 'enhance' && (
          <div className={headerBattleActive ? 'combat-disabled-page' : undefined}>
            {headerBattleActive && (
              <div className="combat-lock-banner" role="status">
                ⚔️ 当前正在战斗中，生产与生活技能已锁定（请先在顶部停止战斗）
              </div>
            )}
            <EnhancementPanel 
              playerState={playerState} 
              contentItems={contentPack?.items}
              combatLocked={headerBattleActive}
              onRefresh={refreshPlayerState}
            />
          </div>
        )}

        <div style={{ display: activeTab === 'party' ? 'contents' : 'none' }}>
          <PartyPanel
            initialStageId={partyTargetStageId}
            onConsumeInitialStage={() => setPartyTargetStageId(null)}
            onCombatStatusChange={setPartyCombatInfo}
          />
        </div>

        {/* 技能树页面 */}
        {activeTab === 'skills' && (
          <SkillTreePanel 
            playerState={playerState} 
            onRefresh={refreshPlayerState}
            currentProfession={currentProfession}
            onBack={() => setActiveTab(getCurrentProfession().gatherTab)}
          />
        )}
        
        {/* 交易页面 */}
        {activeTab === 'trading' && (
          <div className="trading-layout">
            {itemsLoading ? (
              <div className="loading-screen">
                <div>⏳ 加载道具数据中...</div>
              </div>
            ) : !selectedTradingItem ? (
              /* 物品列表页 */
              <>
                <div className="page-header">
                  <h2 className="section-title">交易行</h2>
                  <div className="page-info">
                    <p>玩家之间买卖任何物品：直接吃掉最优挂单，或按自己的价格挂出售单 / 收购单。商会补给站亦常年以高于店价的溢价供应基础资源，保障新手起步循环。成交按卖方所得收 5% 税。</p>
                  </div>
                </div>
                <MarketItemGrid
                  groups={[
                    { id: 'materials', title: '材料', emoji: '📦', items: allItems?.materials || [] },
                    { id: 'weapons', title: '武器', emoji: '⚔️', items: allItems?.weapons || [] },
                    { id: 'armor', title: '防具', emoji: '🛡️', items: [...(allItems?.armor || []), ...((allItems?.all || []).filter((i: any) => (i.type === 'offhand' || i.type === 'shield') && !(allItems?.armor || []).some((a: any) => a.id === i.id)))] },
                    { id: 'accessories', title: '饰品', emoji: '💍', items: (allItems?.all || []).filter((i: any) => i.type === 'accessory') },
                    { id: 'tools', title: '工具', emoji: '🪓', items: (allItems?.all || []).filter((i: any) => !!i.toolFor) },
                    { id: 'consumables', title: '消耗品', emoji: '🍖', items: allItems?.consumables || [] },
                    { id: 'books', title: '技能书', emoji: '📖', items: (allItems?.all || []).filter((i: any) => i.type === 'book') },
                  ]}
                  inventory={playerState.inventory}
                  iconOf={getItemIcon}
                  onPick={(id) => setSelectedTradingItem(id)}
                  refreshKey={marketRefreshKey}
                />
                <MarketMyOrders nameOf={getItemNameById} refreshKey={marketRefreshKey} onChanged={() => { setMarketRefreshKey((k) => k + 1); void refreshPlayerState() }} />
              </>
            ) : (
              /* 物品详情页 */
              <>
                <div className="trading-detail-header">
                  <button 
                    className="btn-back-trading"
                    onClick={() => setSelectedTradingItem(null)}
                  >
                    ← 返回列表
                  </button>
                  <div className="trading-detail-title">
                    <span className="detail-icon item-icon-compact"><T1ItemIcon itemId={selectedTradingItem} fallback={getItemIcon(selectedTradingItem)} alt="" /></span>
                    <span className="detail-name">{getItemInfo(selectedTradingItem).name}</span>
                    <span className="detail-tier">{getTierName(getItemInfo(selectedTradingItem).tier)}</span>
                    <span className="detail-owned">拥有 {playerState.inventory[selectedTradingItem] || 0}</span>
                    {(() => {
                      const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price)
                      const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price)
                      const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0)
                      return (
                        <span className="detail-market">
                          {asks.length ? `最低卖价 ${Math.min(...asks)}` : '无卖单'} · {bids.length ? `最高收购 ${Math.max(...bids)}` : '无收购'}{shop ? ` · 店价 ${shop}` : ''}
                        </span>
                      )
                    })()}
                  </div>
                  <div className="trading-detail-actions">
                    <button 
                      className="btn-create-order sell"
                      disabled={(playerState.inventory[selectedTradingItem] || 0) <= 0}
                      title={(playerState.inventory[selectedTradingItem] || 0) <= 0 ? '背包中没有该物品可出售' : undefined}
                      onClick={() => {
                        setOrderType('sell');
                        setSellQuantity(1);
                        const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price);
                        const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0);
                        if (asks.length) setSellPrice(Math.max(1, Math.min(...asks)));
                        else if (shop > 0) setSellPrice(Math.max(1, shop * 2));
                        setShowSellModal(true);
                      }}
                    >
                      📤 挂出售单
                    </button>
                    <button 
                      className="btn-create-order buy"
                      onClick={() => {
                        setOrderType('buy');
                        setSellQuantity(1);
                        const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price);
                        const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0);
                        if (bids.length) setSellPrice(Math.max(1, Math.max(...bids)));
                        else if (shop > 0) setSellPrice(Math.max(1, shop));
                        setShowSellModal(true);
                      }}
                    >
                      📥 挂收购单
                    </button>
                  </div>
                </div>
                
                <div className="trading-orders-container">
                  {/* 出售单列表 */}
                  <div className="orders-column">
                    <div className="orders-header sell">
                      <h3>📤 出售单</h3>
                      <span className="orders-hint">价格从低到高</span>
                    </div>
                    <div className="orders-list">
                      {tradingOrdersLoading ? (
                        <div className="orders-loading">加载中...</div>
                      ) : (
                        <>
                          {tradingOrders.filter(order => order.type === 'sell').sort((a, b) => a.price - b.price).slice(0, 5).map(order => (
                            <div key={order.id} className="order-item-compact sell">
                              <span className="order-quantity">
                                x{order.quantity}
                                {order.username === '商会补给站' && <small style={{ marginLeft: 6, opacity: 0.72, fontSize: '0.75rem' }}>商会预设</small>}
                              </span>
                              <span className="order-price">{order.price} 💰</span>
                            </div>
                          ))}
                          {tradingOrders.filter(order => order.type === 'sell').length === 0 && (
                            <div className="orders-empty">
                              <div className="empty-text">暂无出售单</div>
                            </div>
                          )}
                          {tradingOrders.filter(order => order.type === 'sell' && order.userId !== user?.id).length > 0 && (
                            <button 
                              className="btn-quick-buy"
                              onClick={() => {
                                const sellOrders = tradingOrders.filter(order => order.type === 'sell' && order.userId !== user?.id).sort((a, b) => a.price - b.price);
                                if (sellOrders.length > 0) {
                                  setSelectedOrder(sellOrders[0]);
                                  setPurchaseQuantity(1);
                                  setShowPurchaseModal(true);
                                }
                              }}
                            >
                              💰 购买
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 收购单列表 */}
                  <div className="orders-column">
                    <div className="orders-header buy">
                      <h3>📥 收购单</h3>
                      <span className="orders-hint">价格从高到低</span>
                    </div>
                    <div className="orders-list">
                      {tradingOrdersLoading ? (
                        <div className="orders-loading">加载中...</div>
                      ) : (
                        <>
                          {tradingOrders.filter(order => order.type === 'buy').sort((a, b) => b.price - a.price).slice(0, 5).map(order => (
                            <div key={order.id} className="order-item-compact buy">
                              <span className="order-quantity">
                                x{order.quantity}
                                {order.username === '商会补给站' && <small style={{ marginLeft: 6, opacity: 0.72, fontSize: '0.75rem' }}>商会预设</small>}
                              </span>
                              <span className="order-price">{order.price} 💰</span>
                            </div>
                          ))}
                          {tradingOrders.filter(order => order.type === 'buy').length === 0 && (
                            <div className="orders-empty">
                              <div className="empty-text">暂无收购单</div>
                            </div>
                          )}
                          {tradingOrders.filter(order => order.type === 'buy' && order.userId !== user?.id).length > 0 && (
                            <button 
                              className="btn-quick-sell"
                              onClick={() => {
                                const buyOrders = tradingOrders.filter(order => order.type === 'buy' && order.userId !== user?.id).sort((a, b) => b.price - a.price);
                                if (buyOrders.length > 0) {
                                  setSelectedOrder(buyOrders[0]);
                                  setPurchaseQuantity(1);
                                  setShowPurchaseModal(true);
                                }
                              }}
                            >
                              📦 出售
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <MarketMyOrders
                  nameOf={getItemNameById}
                  refreshKey={marketRefreshKey}
                  onChanged={() => {
                    setMarketRefreshKey((k) => k + 1);
                    void refreshPlayerState();
                  }}
                />
              </>
            )}
          </div>
        )}
      </main>
      
      <PlayerRightPanel
        expanded={isRightPanelExpanded}
        onToggle={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
        playerName={playerName}
        playerAvatar={playerAvatar}
        playerGender={playerGender}
        onRename={renamePlayer}
        onOpenProfessionModal={() => setShowProfessionModal(true)}
        profession={{ ...getCurrentProfession(), id: currentProfession }}
        professionSkill={getCurrentSkill()}
        combatLevel={playerState.combatLevel || 1}
        combatXp={playerState.combatXp || 0}
        gold={playerState.inventory.gold || 0}
        forceUpdate={forceUpdate}
        getXpForLevel={getXpForLevel}
        view={rightPanelView}
        onView={setRightPanelView}
        equipSlots={equipSlots}
        onOpenEquipSelector={openEquipSelector}
        onUnequipSlot={unequipSlot}
        getEquippedItemId={getEquippedItemId}
        getItemNameById={getItemNameById}
        combatSheet={combatSheet}
        allowProfessionSwitch={chapterDone}
        inventoryKindCount={Object.keys(playerState.inventory).filter(key => key !== 'gold' && (playerState.inventory[key] || 0) > 0).length}
        inventoryItems={getFilteredInventoryItems()}
        onOrganize={organizeInventory}
        inventorySearch={inventorySearch}
        onSearch={setInventorySearch}
        inventoryFilter={inventoryFilter}
        onFilter={setInventoryFilter}
        inventorySortBy={inventorySortBy}
        onSort={(value) => setInventorySortBy(value as any)}
        getItemIcon={getItemIcon}
        onSelectInventoryItem={(item) => {
          setSelectedItem({ ...item, id: item.itemId });
          setModalType('item');
        }}
      />
      </div>

      {/* 装备选择器弹窗 */}
      {showEquipSelector && selectedEquipSlot && (
        <div className="modal-overlay" onClick={() => { setShowEquipSelector(false); setSelectedEquipSlot(null); }}>
          <div className="modal-content equip-selector-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="关闭"
              onClick={() => { setShowEquipSelector(false); setSelectedEquipSlot(null); }}
            >
              ✕
            </button>
            <h3 className="modal-title">
                选择装备 - {[...equipSlots.left, ...equipSlots.right].find(s => s.id === selectedEquipSlot)?.name ?? ''}
            </h3>
            
            <div className="equip-selector-content">
              {getEquippableItems(selectedEquipSlot).length === 0 ? (
                <div className="no-equipment">
                  <div className="no-equipment-icon">📦</div>
                  <p>背包中没有可装备的物品</p>
                  <p className="hint-text">通过制作或战斗获取装备</p>
                </div>
              ) : (
                <>
                <p className="modal-desc equip-hint">点一件即可装备</p>
                <div className="equippable-items-grid">
                  {getEquippableItems(selectedEquipSlot).map((item: any) => {
                    const currentEqId = getEquippedItemId(selectedEquipSlot);
                    const equipped = currentEqId === item.id;
                    const curDef: any = currentEqId ? contentPack?.items?.find((it: any) => it.id === currentEqId) : undefined;
                    const itemEnh = Number(playerState.equipment?.enhancementLevels?.[item.id] || 0);
                    const curEnh = currentEqId ? Number(playerState.equipment?.enhancementLevels?.[currentEqId] || 0) : 0;
                    const itemMult = enhancementStatMultiplier(itemEnh, item);
                    const curMult = enhancementStatMultiplier(curEnh, curDef);
                    const eff = (v: number | undefined, m: number) => Math.round((v || 0) * m * 10) / 10;
                    const atkDiff = Math.round((eff(item.atk, itemMult) - eff(curDef?.atk, curMult)) * 10) / 10;
                    const magDiff = Math.round((eff(item.mag, itemMult) - eff(curDef?.mag, curMult)) * 10) / 10;
                    const defDiff = Math.round((eff(item.def, itemMult) - eff(curDef?.def, curMult)) * 10) / 10;
                    const hpDiff = Math.round((eff(item.hp, itemMult) - eff(curDef?.hp, curMult)) * 10) / 10;
                    return (
                    <div 
                      key={item.id}
                      className={`equippable-item${equipped ? ' equipped' : ''}`}
                      role="button"
                      onClick={() => { if (!equipped) equipItem(item.id); }}
                    >
                      <div className="item-icon-large">
                        <T1ItemIcon itemId={item.id} fallback={getItemIcon(item.id)} alt="" />
                      </div>
                      <div className="item-name">{item.name}{itemEnh > 0 ? ` +${itemEnh}` : ''}</div>
                      <div className="item-stats">
                        {selectedEquipSlot === 'tool' && item.toolFor ? (
                          <span>{toolEffectLine(item, professionLabel(item.toolFor), itemEnh)}</span>
                        ) : (
                          <>
                            {item.atk && <span>攻击 +{eff(item.atk, itemMult)}</span>}
                            {item.mag && <span>魔法 +{eff(item.mag, itemMult)}</span>}
                            {item.def && <span>防御 +{eff(item.def, itemMult)}</span>}
                            {item.hp && <span>生命 +{eff(item.hp, itemMult)}</span>}
                          </>
                        )}
                      </div>
                      {!equipped && selectedEquipSlot !== 'tool' && (atkDiff !== 0 || magDiff !== 0 || defDiff !== 0 || hpDiff !== 0) && (
                        <div className="equip-delta-row">
                          {atkDiff !== 0 && <span className={`equip-delta ${atkDiff > 0 ? 'up' : 'down'}`}>攻{atkDiff > 0 ? `+${atkDiff}` : atkDiff}</span>}
                          {magDiff !== 0 && <span className={`equip-delta ${magDiff > 0 ? 'up' : 'down'}`}>魔{magDiff > 0 ? `+${magDiff}` : magDiff}</span>}
                          {defDiff !== 0 && <span className={`equip-delta ${defDiff > 0 ? 'up' : 'down'}`}>防{defDiff > 0 ? `+${defDiff}` : defDiff}</span>}
                          {hpDiff !== 0 && <span className={`equip-delta ${hpDiff > 0 ? 'up' : 'down'}`}>血{hpDiff > 0 ? `+${hpDiff}` : hpDiff}</span>}
                        </div>
                      )}
                      <div className="item-cta">{equipped ? '已装备' : '装备'}</div>
                    </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
            
            <div className="modal-actions">
              {getEquippedItemId(selectedEquipSlot) && (
                <button
                  className="btn-secondary"
                  onClick={() => { void unequipSlot(selectedEquipSlot); setShowEquipSelector(false); setSelectedEquipSlot(null); }}
                >
                  卸下
                </button>
              )}
              <button 
                className="btn-secondary"
                onClick={() => { setShowEquipSelector(false); setSelectedEquipSlot(null); }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedItem && modalType && (
        <div className="modal-overlay" onClick={() => { setSelectedItem(null); setModalType(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="关闭"
              onClick={() => { setSelectedItem(null); setModalType(null); }}
            >
              ✕
            </button>
            {modalType === 'monster' && (() => {
              const info = fightInfo(selectedItem);
              return (
              <>
                <h3 className="modal-title">{selectedItem.name}</h3>
                <div className="modal-image monster-modal-scene">
                  <MonsterSceneBackdrop
                    monsterId={selectedItem.id}
                    mapId={selectedItem.map || selectedMap}
                    isBoss={selectedItem.isBoss}
                    variant="modal"
                  />
                  <div className="placeholder-img monster-placeholder large">
                    <T1Art kind="monster" id={selectedItem.id} fallback={selectedItem.icon || ''} alt="" />
                  </div>
                </div>
                <p className="modal-desc">{selectedItem.desc}</p>
                
                <div className="modal-stats">
                  <div className="stat-line"><span>身份</span><span>Lv.{selectedItem.level} · {archetypeLabel(selectedItem.archetype)}</span></div>
                  <div className="stat-line"><span>生命</span><span>{selectedItem.hp}</span></div>
                  <div className="stat-line"><span>攻击</span><span>{selectedItem.atk}</span></div>
                  <div className="stat-line"><span>防御</span><span>{selectedItem.def}</span></div>
                  <div className="stat-line"><span>经验奖励</span><span>{selectedItem.xp} XP</span></div>
                  <div className="stat-line"><span>金币奖励</span><span>{selectedItem.gold} 金币</span></div>
                  {mechanicEntries(selectedItem.mechanics, selectedItem.mechanicDefs).map(({ id, label, desc }) => (
                    <div className="stat-line stat-mechanic" key={id}>
                      <span>机制</span>
                      <span>{label}{desc && <small className="mechanic-desc">{desc}</small>}</span>
                    </div>
                  ))}
                  {(() => {
                    const rare = rareItemOf(selectedItem)
                    return rare ? (
                      <div className="stat-line">
                        <span>稀有掉落</span>
                        <span className="stat-drop">
                          <T1ItemIcon itemId={rare.id} fallback={getItemIcon(rare.id)} alt="" />
                          {rare.name} ({Math.round(selectedItem.rareChance * 100)}%)
                        </span>
                      </div>
                    ) : null
                  })()}
                  {(selectedItem.drops || []).map((d: { itemId: string; chance: number }) => (
                    <div className="stat-line" key={d.itemId}>
                      <span>掉落</span>
                      <span className="stat-drop">
                        <T1ItemIcon itemId={d.itemId} fallback={getItemIcon(d.itemId)} alt="" />
                        {getItemNameById(d.itemId)} ({Math.round(d.chance * 100)}%)
                      </span>
                    </div>
                  ))}
                  {info.kills > 0 && (
                    <div className="stat-line"><span>战绩</span><span>已击败 {info.kills} 次</span></div>
                  )}
                </div>
                <div className="modal-actions">
                  {selectedItem.isBoss ? (
                    <button
                      className="btn-action"
                      onClick={() => {
                        setPartyTargetStageId(selectedMap);
                        setSelectedItem(null);
                        setModalType(null);
                        setActiveTab('party');
                      }}
                    >
                      👥 前往组队挑战首领（前9波群怪 · 第10波BOSS）
                    </button>
                  ) : (
                    <button 
                      className="btn-action"
                      onClick={() => startBattle(selectedItem)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? '准备中...' : '开始战斗'}
                    </button>
                  )}
                </div>
              </>
              );
            })()}
            {modalType === 'tree' && (
              <>
                <h3 className="modal-title">{selectedItem.name}</h3>
                <div className="modal-image">
                  <div className="placeholder-img tree-placeholder large">
                    <T1Art kind="tree" id={selectedItem.id} fallback={selectedItem.icon || ''} alt="" />
                  </div>
                </div>
                <p className="modal-desc">{selectedItem.desc}</p>
                {selectedItem.id === 'poplar' && goalMaterialHint() && (
                  <p className="craft-need-line">本步目标：{goalMaterialHint()}</p>
                )}
                <div className="modal-stats">
                  <div className="stat-line"><span>等级需求</span><span>Lv.{selectedItem.level} {getCurrentProfession().gatherName}</span></div>
                  <div className="stat-line"><span>经验奖励</span><span>{selectedItem.xp} <span className="tag">XP</span></span></div>
                  <div className="stat-line"><span>采集产出</span><span>{selectedItem.outputRange} <span className="tag">{selectedItem.outputItemId ? getItemNameById(selectedItem.outputItemId) : getItemNameById(selectedItem.output)}</span></span></div>
                  {(() => {
                    // 只展示内容包里真实存在的概率产出；本地表里的装饰性 rare 字段不再显示
                    const packAction = contentPack?.actions?.find((a: any) => a.id === selectedItem.actionId);
                    const rareYield = packAction?.yields?.find((y: any) => typeof y.chance === 'number' && y.chance > 0 && y.chance < 1);
                    if (!rareYield) return null;
                    return (
                      <div className="stat-line"><span>稀有掉落</span><span>{rareYield.qty || 1} <span className="tag">{getItemNameById(rareYield.itemId)}</span> {(rareYield.chance * 100).toFixed(rareYield.chance * 100 < 1 ? 1 : 0)}%</span></div>
                    );
                  })()}
                  <div className="stat-line"><span>单次耗时</span><span>{actionPreview ? (actionPreview.effectiveDurationMs / 1000).toFixed(2) : selectedItem.time} 秒</span></div>
                </div>
                {playerState.mode === 'life_action' && playerState.lifeActionState?.actionId === selectedItem.actionId && (
                  <div className="modal-live-progress" aria-label="当前生产进度">
                    <div className="modal-live-progress-head">
                      <span>当前采集进度</span>
                      <strong>{Math.floor(progress)}%</strong>
                    </div>
                    <div className="skill-xp-bar">
                      <div className="skill-xp-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, transition: 'none' }} />
                    </div>
                  </div>
                )}
                <ActionRatesPanel preview={actionPreview} loading={actionPreviewLoading} />
                {(() => {
                  const packAction = contentPack?.actions?.find((a: any) => a.id === selectedItem.actionId);
                  const reqSkillId = packAction?.skillId || `skill_${currentProfession}`;
                  const currentSkillLevel = playerState.skills?.[reqSkillId]?.level || 1;
                  const hasLevel = currentSkillLevel >= selectedItem.level;
                  const queueFull = (playerState.activityQueue?.length || 0) >= ACTION_QUEUE_MAX;
                  const presets: Array<number | null> = [null, 10, 50, 100];
                  
                  return (
                    <div className="modal-actions gather-actions">
                      <div className="gather-quantity" role="group" aria-label="采集次数">
                        <span className="gather-quantity-label">次数</span>
                        {presets.map((p) => (
                          <button
                            key={p === null ? 'inf' : p}
                            type="button"
                            className={`qty-chip${gatherQuantity === p ? ' active' : ''}`}
                            onClick={() => setGatherQuantity(p)}
                          >
                            {p === null ? '∞' : p}
                          </button>
                        ))}
                        <input
                          type="number"
                          className="quantity-input qty-custom"
                          min={1}
                          max={5000}
                          placeholder="自定"
                          value={gatherQuantity !== null && !presets.includes(gatherQuantity) ? gatherQuantity : ''}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setGatherQuantity(Number.isFinite(v) && v > 0 ? Math.min(5000, v) : null);
                          }}
                        />
                      </div>
                      <div className="gather-buttons">
                        <button 
                          className={`btn-action ${hasLevel ? '' : 'disabled'}`}
                          onClick={() => {
                            if (hasLevel) {
                              startAction(selectedItem.actionId, {
                                name: selectedItem.name || '采集',
                                output: selectedItem.output,
                                duration: selectedItem.time,
                                mark: activityMarkFromAction(selectedItem.actionId || 'chop'),
                              }, gatherQuantity ?? undefined);
                            }
                          }}
                          disabled={actionLoading || !hasLevel}
                        >
                          {actionLoading ? '开始中...' : 
                           !hasLevel ? `需要等级${selectedItem.level}` : 
                           gatherQuantity ? `开始采集 ×${gatherQuantity}` : '开始采集'}
                        </button>
                        <button
                          className="btn-secondary btn-queue"
                          disabled={actionLoading || !hasLevel || queueFull}
                          title={queueFull ? `队列最多 ${ACTION_QUEUE_MAX} 项` : '当前动作结束后自动开始'}
                          onClick={() => queueAction(selectedItem.actionId, gatherQuantity ?? undefined)}
                        >
                          {queueFull ? '队列已满' : '加入队列'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            {modalType === 'craft' && (
              <>
                <div className="modal-header-with-favorite">
                  <h3 className="modal-title">{selectedItem.name}</h3>
                  <button 
                    className={`btn-favorite ${favoriteRecipes.has(selectedItem.id) ? 'active' : ''}`}
                    onClick={() => toggleFavoriteRecipe(selectedItem.id)}
                    title={favoriteRecipes.has(selectedItem.id) ? '取消收藏' : '收藏配方'}
                  >
                    {favoriteRecipes.has(selectedItem.id) ? '★' : '☆'}
                  </button>
                </div>
                
                <div className="modal-image">
                  <div className="placeholder-img craft-placeholder large">
                    <T1Art kind="craft" id={selectedItem.output || selectedItem.id} fallback="" alt="" />
                  </div>
                </div>
                {selectedItem.desc ? <p className="modal-desc">{selectedItem.desc}</p> : null}
                {(() => {
                  const whyText = craftWhy({ id: selectedItem.output, atk: selectedItem.atk, def: selectedItem.def, hp: selectedItem.hp }, combatSheet, { equippedMainAtk: weaponAtk, outputEquipped: Object.values(playerState.equipment || {}).includes(selectedItem.output) });
                  return whyText && whyText !== selectedItem.desc ? <p className="craft-why-line">{whyText}</p> : null;
                })()}
                <p className="craft-need-line">{missingMaterials(selectedItem.requires || [], playerState.inventory, getItemNameById)}</p>
                {playerState.mode === 'life_action' && playerState.lifeActionState?.actionId === selectedItem.id && (
                  <div className="modal-live-progress" aria-label="当前制作进度">
                    <div className="modal-live-progress-head">
                      <span>当前制作进度</span>
                      <strong>{Math.floor(progress)}%</strong>
                    </div>
                    <div className="skill-xp-bar">
                      <div className="skill-xp-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, transition: 'none' }} />
                    </div>
                  </div>
                )}
                <ActionRatesPanel preview={actionPreview} loading={actionPreviewLoading} />
                
                <div className="modal-stats">
                  <div className="stat-line">
                    <span>技能需求</span>
                    <span className={`skill-requirement ${(playerState.skills[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level ? 'satisfied' : 'missing'}`}>
                      Lv.{selectedItem.level} {getCurrentProfession().craftName}
                      {(playerState.skills[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level ? ' ✓' : ' ✗'}
                    </span>
                  </div>
                  
                  <div className="materials-section">
                    <div className="section-title">材料需求 (×{craftQuantity})</div>
                    {selectedItem.requires.map((req: any, i: number) => {
                      const requiredItemId = getRequiredItemId(req.item);
                      const available = playerState.inventory[requiredItemId] || 0;
                      const needed = req.count * craftQuantity;
                      const hasEnough = available >= needed;
                      return (
                        <div key={i} className={`stat-line material-req ${hasEnough ? 'satisfied' : 'missing'}`}>
                          <span className="material-info">
                            <span className="material-icon item-icon-compact">
                              <T1ItemIcon itemId={requiredItemId} fallback={getItemIcon(requiredItemId)} alt="" />
                            </span>
                            {getItemNameById(requiredItemId)}
                          </span>
                          <span className="material-count">
                            {available}/{needed} {hasEnough ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="rewards-section">
                    <div className="section-title">制作奖励 (×{craftQuantity})</div>
                    <div className="stat-line"><span>经验奖励</span><span>{selectedItem.xp * craftQuantity} <span className="tag">XP</span></span></div>
                    <div className="stat-line"><span>制作产出</span><span>{craftQuantity * (selectedItem.outputCount || 1)} <span className="tag">{getItemNameById(selectedItem.output)}</span></span></div>
                    {(selectedItem.atk || selectedItem.mag || selectedItem.def || selectedItem.hp || selectedItem.stats) && (
                      <div className="stat-line">
                        <span>装备属性</span>
                        <span>
                          {(selectedItem.atk ?? selectedItem.stats?.atk) ? `攻击+${selectedItem.atk ?? selectedItem.stats?.atk} ` : ''}
                          {(selectedItem.mag ?? selectedItem.stats?.mag) ? `魔力+${selectedItem.mag ?? selectedItem.stats?.mag} ` : ''}
                          {(selectedItem.def ?? selectedItem.stats?.def) ? `防御+${selectedItem.def ?? selectedItem.stats?.def} ` : ''}
                          {(selectedItem.hp ?? selectedItem.stats?.hp) ? `生命+${selectedItem.hp ?? selectedItem.stats?.hp} ` : ''}
                          {selectedItem.stats?.spd ? `速度+${selectedItem.stats.spd}%` : ''}
                        </span>
                      </div>
                    )}
                    {selectedItem.rare && (
                      <div className="stat-line"><span>稀有奖励</span><span>随机 <span className="tag">{getItemNameById(selectedItem.rare)}</span></span></div>
                    )}
                    <div className="stat-line"><span>预计耗时</span><span>{actionPreview ? Math.round((actionPreview.effectiveDurationMs / 1000) * craftQuantity * 10) / 10 : Math.round(selectedItem.time * craftQuantity * 10) / 10} 秒</span></div>
                  </div>
                </div>
                
                {(() => {
                  const hasLevel = (playerState.skills?.[getCurrentProfession().craftSkill]?.level || 1) >= selectedItem.level;
                  const hasMaterials = selectedItem.requires.every((req: any) => {
                    const requiredItemId = getRequiredItemId(req.item);
                    return (playerState.inventory[requiredItemId] || 0) >= (req.count * craftQuantity);
                  });
                  const canCraft = hasLevel && hasMaterials && craftQuantity > 0;
                  const maxCraftable = getMaxCraftableQuantity(selectedItem);
                  
                  return (
                    <div className="craft-actions">
                      <div className="craft-quantity-section">
                        <div className="quantity-header">
                          <span className="quantity-label">制作数量</span>
                          <span className="quantity-max">
                            按现有材料最多 {maxCraftable} 个
                          </span>
                        </div>
                        <div className="quantity-controls">
                          <button 
                            className="btn-quantity"
                            onClick={() => setCraftQuantity(Math.max(1, craftQuantity - 1))}
                            disabled={craftQuantity <= 1}
                          >
                            -
                          </button>
                          <input 
                            type="number"
                            className="quantity-input"
                            value={craftQuantity}
                            onChange={(e) => {
                              // 允许超过现有材料：排队时材料可以由前面的动作产出，立即开始时按钮会提示材料不足
                              const val = parseInt(e.target.value) || 1
                              setCraftQuantity(Math.max(1, Math.min(5000, val)))
                            }}
                            min="1"
                            max={5000}
                          />
                          <button 
                            className="btn-quantity"
                            onClick={() => setCraftQuantity(Math.min(5000, craftQuantity + 1))}
                            disabled={craftQuantity >= 5000}
                          >
                            +
                          </button>
                          <button 
                            className="btn-quantity-max"
                            onClick={() => setCraftQuantity(Math.max(1, maxCraftable))}
                            disabled={maxCraftable <= 1 || craftQuantity >= maxCraftable}
                          >
                            最大
                          </button>
                        </div>
                      </div>
                      <div className="gather-buttons craft-buttons">
                        <button 
                          className={`btn-action ${canCraft ? 'craftable' : 'disabled'}`}
                          onClick={() => {
                            if (canCraft) {
                              // selectedItem.id 已是完整配方 ID（如 act_craft_lumber_t1），不要再加前缀
                              startAction(selectedItem.id, {
                                name: selectedItem.name || `制作 ×${craftQuantity}`,
                                output: selectedItem.output,
                                // 进度环按单件周期走；批量剩余件数由服务端 lifeActionState.remaining 提供
                                duration: selectedItem.time,
                                mark: '制',
                              }, craftQuantity);
                              setCraftQuantity(1); // 重置数量
                            }
                          }}
                          disabled={actionLoading || !canCraft}
                        >
                          {actionLoading ? '制作中...' : 
                           !hasLevel ? `需要等级${selectedItem.level}` :
                           !hasMaterials ? '材料不足' : 
                           `开始制作 ×${craftQuantity}`}
                        </button>
                        {(() => {
                          const queueFull = (playerState.activityQueue?.length || 0) >= ACTION_QUEUE_MAX;
                          return (
                            <button
                              className="btn-secondary btn-queue"
                              disabled={actionLoading || !hasLevel || queueFull || craftQuantity < 1}
                              title={queueFull ? `队列最多 ${ACTION_QUEUE_MAX} 项` : '当前动作结束后自动开始；材料可以由前面的动作产出'}
                              onClick={() => queueAction(selectedItem.id, craftQuantity)}
                            >
                              {queueFull ? '队列已满' : `加入队列 ×${craftQuantity}`}
                            </button>
                          );
                        })()}
                      </div>
                      
                      {!canCraft && (
                        <div className="craft-hint">
                          {!hasLevel && <p>🎯 提升{getCurrentProfession().craftName}等级到{selectedItem.level} 级</p>}
                          {hasLevel && !hasMaterials && <p>📦 材料不够时可以先加入队列，等前面的采集/制作把材料做出来</p>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {modalType === 'item' && (() => {
              // 以内容包为准：背包条目里没有 atk/def/value，之前显示的"攻击力 +0"是从背包条目读的
              const packItem: any = contentPack?.items?.find((i: any) => i.id === selectedItem.id) || {};
              const type: string = packItem.type || selectedItem.type;
              const typeLabel =
                type === 'material' ? '材料'
                : type === 'weapon' ? '武器'
                : type === 'armor' ? '防具'
                : type === 'offhand' || type === 'shield' ? '副手'
                : type === 'accessory' ? '饰品'
                : type === 'consumable' || type === 'food' ? '消耗品'
                : type === 'book' ? '技能书'
                : '其他';
              const bookAbility: AbilityDef | undefined = type === 'book' ? abilityCatalog?.find((a) => a.id === packItem.abilityId) : undefined;
              const bookKnown = bookAbility ? playerState.abilities?.[bookAbility.id] : undefined;
              const learnFromDetail = async () => {
                try {
                  apiClient.clearCache();
                  const res: any = await apiClient.learnBook(selectedItem.id);
                  playGameSound('unlock');
                  const lr = res?.learnResult;
                  toast.success(lr?.learned ? `学会了「${bookAbility?.name || ''}」！已放进技能槽（如有空位）` : lr?.leveledTo ? `「${bookAbility?.name}」升到 ${lr.leveledTo} 级` : `重读《${bookAbility?.name}》，技能经验 +50`);
                  await refreshPlayerState();
                  close();
                } catch (e: any) {
                  toast.error(e?.message || '阅读失败');
                }
              };
              const eq = (playerState.equipment || {}) as Record<string, any>;
              const eqKey: 'main_hand' | 'chest' | 'head' | 'legs' | 'feet' | 'hands' | 'off_hand' | 'accessory1' | 'accessory2' | undefined =
                type === 'weapon' ? 'main_hand'
                : type === 'offhand' || type === 'shield' || packItem.slot === 'off_hand' ? 'off_hand'
                : type === 'accessory'
                  ? (eq.accessory1 === selectedItem.id
                      ? 'accessory1'
                      : eq.accessory2 === selectedItem.id
                        ? 'accessory2'
                        : !eq.accessory1
                          ? 'accessory1'
                          : !eq.accessory2
                            ? 'accessory2'
                            : 'accessory1')
                : type === 'armor' ? ((packItem.slot as any) || 'chest')
                : undefined;
              const equippedHere = !!eqKey && eq[eqKey] === selectedItem.id;
              const curEqId = eqKey ? (eq[eqKey] as string | undefined) : undefined;
              const curEqDef: any = curEqId ? contentPack?.items?.find((i: any) => i.id === curEqId) : undefined;
              const itemEnh = Number(playerState.equipment?.enhancementLevels?.[selectedItem.id] || 0);
              const curEnh = curEqId ? Number(playerState.equipment?.enhancementLevels?.[curEqId] || 0) : 0;
              const itemMult = enhancementStatMultiplier(itemEnh, packItem);
              const curMult = enhancementStatMultiplier(curEnh, curEqDef);
              const eff = (v: number | undefined, m: number) => Math.round((v || 0) * m * 10) / 10;
              const atkDiff = eqKey && !equippedHere ? Math.round((eff(packItem.atk, itemMult) - eff(curEqDef?.atk, curMult)) * 10) / 10 : 0;
              const magDiff = eqKey && !equippedHere ? Math.round((eff(packItem.mag, itemMult) - eff(curEqDef?.mag, curMult)) * 10) / 10 : 0;
              const defDiff = eqKey && !equippedHere ? Math.round((eff(packItem.def, itemMult) - eff(curEqDef?.def, curMult)) * 10) / 10 : 0;
              const hpDiff = eqKey && !equippedHere ? Math.round((eff(packItem.hp, itemMult) - eff(curEqDef?.hp, curMult)) * 10) / 10 : 0;
              const effect = packItem.effect || {};
              const effectParts: string[] = [];
              if (effect.hp) effectParts.push(`恢复 ${effect.hp} 生命`);
              if (effect.mp) effectParts.push(`恢复 ${effect.mp} 魔力`);
              if (effect.buff?.name) effectParts.push(`增益「${effect.buff.name}」${effect.buff.durationSec ? ` ${Math.round(effect.buff.durationSec / 60)} 分钟` : ''}`);
              const close = () => { setSelectedItem(null); setModalType(null); };
              const equipFromDetail = async () => {
                if (!eqKey) return;
                if (isCombatLockoutActive()) {
                  toast.info('当前正在战斗中，无法更换或卸下战斗装备（请先停止战斗）');
                  return;
                }
                try {
                  apiClient.clearCache();
                  if (equippedHere) {
                    await apiClient.unequipItem(eqKey);
                    toast.info('已卸下');
                  } else {
                    await apiClient.equipItem(eqKey, selectedItem.id);
                    playGameSound('equip');
                    toast.success('已装备');
                  }
                  await refreshPlayerState();
                  close();
                } catch (e: any) {
                  toast.error(e?.message || (equippedHere ? '卸下失败' : '装备失败'));
                }
              };
              const useFromDetail = async () => {
                try {
                  apiClient.clearCache();
                  const res: any = await apiClient.consumeItem(selectedItem.id);
                  toast.success(res?.buff ? `使用 ${selectedItem.name}，获得增益「${res.buff.name}」` : `使用了 ${selectedItem.name}`);
                  await refreshPlayerState();
                  close();
                } catch (e: any) {
                  toast.error(e?.message || '使用失败');
                }
              };
              return (
              <>
                <h3 className="modal-title">
                  {selectedItem.name}
                  {itemEnh > 0 ? <span className="modal-enh-badge"> +{itemEnh}</span> : null}
                </h3>
                <div className="modal-image">
                  <div className="item-icon-large">
                    <T1ItemIcon itemId={selectedItem.id} fallback={getItemIcon(selectedItem.id)} alt="" />
                  </div>
                </div>
                <p className="modal-desc">{packItem.description || selectedItem.description || '暂无描述'}</p>
                <div className="modal-stats">
                  <div className="stat-line"><span>类型</span><span>{typeLabel}</span></div>
                  <div className="stat-line"><span>品质</span><span>{getTierName(packItem.tier ?? selectedItem.tier)}</span></div>
                  <div className="stat-line"><span>数量</span><span>{selectedItem.count}</span></div>
                  {typeof packItem.atk === 'number' && (
                    <div className="stat-line">
                      <span>攻击</span>
                      <span>
                        +{eff(packItem.atk, itemMult)}
                        {atkDiff !== 0 && (
                          <em className={`equip-delta ${atkDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({atkDiff > 0 ? `+${atkDiff}` : atkDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.mag === 'number' && (
                    <div className="stat-line">
                      <span>魔法</span>
                      <span>
                        +{eff(packItem.mag, itemMult)}
                        {magDiff !== 0 && (
                          <em className={`equip-delta ${magDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({magDiff > 0 ? `+${magDiff}` : magDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.def === 'number' && (
                    <div className="stat-line">
                      <span>防御</span>
                      <span>
                        +{eff(packItem.def, itemMult)}
                        {defDiff !== 0 && (
                          <em className={`equip-delta ${defDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({defDiff > 0 ? `+${defDiff}` : defDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {typeof packItem.hp === 'number' && (
                    <div className="stat-line">
                      <span>生命</span>
                      <span>
                        +{eff(packItem.hp, itemMult)}
                        {hpDiff !== 0 && (
                          <em className={`equip-delta ${hpDiff > 0 ? 'up' : 'down'}`} style={{ marginLeft: 6 }}>
                            ({hpDiff > 0 ? `+${hpDiff}` : hpDiff})
                          </em>
                        )}
                      </span>
                    </div>
                  )}
                  {effectParts.length > 0 && (
                    <div className="stat-line"><span>效果</span><span>{effectParts.join(' · ')}</span></div>
                  )}
                  {typeof packItem.value === 'number' && (
                    <div className="stat-line"><span>商店售价</span><span>{packItem.value} 金币</span></div>
                  )}
                  {equippedHere && (
                    <div className="stat-line"><span>状态</span><span>已装备</span></div>
                  )}
                  {bookAbility && (
                    <div className="stat-line"><span>技能</span><span>{bookAbility.name}{bookKnown ? `（已学会 Lv.${bookKnown.level}）` : '（未学会）'}</span></div>
                  )}
                </div>
                <div className="modal-actions">
                  {(type === 'consumable' || type === 'food') && (
                    <button className="btn-action craftable" onClick={useFromDetail}>
                      使用
                    </button>
                  )}
                  {type === 'book' && (
                    <button className="btn-action craftable" onClick={learnFromDetail}>
                      {bookKnown ? '重读（技能经验 +50）' : '阅读并学会'}
                    </button>
                  )}
                  {eqKey && (
                    <button className={`btn-action ${equippedHere ? '' : 'craftable'}`} onClick={equipFromDetail}>
                      {equippedHere ? '卸下' : type === 'weapon' ? '装备到主手' : type === 'offhand' || type === 'shield' ? '装备到副手' : type === 'accessory' ? '佩戴饰品' : '穿上'}
                    </button>
                  )}
                  {packItem.toolFor && (
                    <button
                      className={`btn-action ${(playerState.equipment as any)?.tool === selectedItem.id ? '' : 'craftable'}`}
                      onClick={async () => {
                        try {
                          apiClient.clearCache();
                          if ((playerState.equipment as any)?.tool === selectedItem.id) {
                            await apiClient.unequipItem('tool');
                            toast.info('已卸下工具');
                          } else {
                            await apiClient.equipItem('tool', selectedItem.id);
                            playGameSound('equip');
                            toast.success(`已装备为工具：${toolEffectLine(packItem, professionLabel(packItem.toolFor), Number(playerState.equipment?.enhancementLevels?.[selectedItem.id] || 0))}`);
                          }
                          await refreshPlayerState();
                          close();
                        } catch (e: any) {
                          toast.error(e?.message || '操作失败');
                        }
                      }}
                    >
                      {(playerState.equipment as any)?.tool === selectedItem.id
                        ? '卸下工具'
                        : `装备为工具（${toolEffectLine(packItem, professionLabel(packItem.toolFor), itemEnh)}）`}
                    </button>
                  )}
                  <button className="btn-secondary" onClick={close}>
                    关闭
                  </button>
                </div>
              </>
              );
            })()}
          </div>
        </div>
      )}
      
      {/* 上架物品弹窗 */}
      {showSellModal && (
        <div className="modal-overlay" onClick={() => { setShowSellModal(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              aria-label="关闭"
              onClick={() => setShowSellModal(false)}
            >
              ✕
            </button>
            <h3 className="modal-title">
              {orderType === 'sell' ? '📤 挂出售单' : '📥 挂收购单'}
              {selectedTradingItem && ` - ${getItemInfo(selectedTradingItem).name}`}
            </h3>
            <div className="sell-form">
              <div className="form-group">
                <label className="form-label">
                  <span>{orderType === 'sell' ? '出售数量' : '收购数量'}</span>
                  {selectedTradingItem && orderType === 'sell' && (
                    <span className="form-hint">
                      （拥有 {playerState.inventory[selectedTradingItem] || 0}）
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="form-input"
                    style={{ flex: 1 }}
                    min="1"
                    max={orderType === 'sell' && selectedTradingItem ? (playerState.inventory[selectedTradingItem] || 0) : undefined}
                    value={sellQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxQty = orderType === 'sell' && selectedTradingItem 
                        ? (playerState.inventory[selectedTradingItem] || 0)
                        : 999999;
                      setSellQuantity(Math.max(1, Math.min(value, maxQty)));
                    }}
                  />
                  {orderType === 'sell' && selectedTradingItem && (
                    <button 
                      type="button"
                      className="btn-max"
                      onClick={() => {
                        const maxQty = playerState.inventory[selectedTradingItem] || 0;
                        setSellQuantity(Math.max(1, maxQty));
                      }}
                    >
                      最大
                    </button>
                  )}
                </div>
                {selectedTradingItem && (
                  <div className="sell-preset-chips">
                    {[1, 5, 10, 50].map((n) => {
                      const maxQty = orderType === 'sell' ? (playerState.inventory[selectedTradingItem] || 1) : 999999;
                      if (n > maxQty && n !== 1) return null;
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`qty-chip${sellQuantity === n ? ' active' : ''}`}
                          onClick={() => setSellQuantity(Math.min(maxQty, n))}
                        >
                          ×{n}
                        </button>
                      );
                    })}
                    {orderType === 'sell' && (playerState.inventory[selectedTradingItem] || 0) >= 4 && (
                      <button
                        type="button"
                        className="qty-chip"
                        onClick={() => setSellQuantity(Math.max(1, Math.floor((playerState.inventory[selectedTradingItem] || 0) / 2)))}
                      >
                        半仓
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <span>单价（金币）</span>
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  min="1"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Math.max(1, parseInt(e.target.value) || 1))}
                />
                {selectedTradingItem && (() => {
                  const asks = tradingOrders.filter((o) => o.type === 'sell').map((o) => o.price);
                  const bids = tradingOrders.filter((o) => o.type === 'buy').map((o) => o.price);
                  const shop = Number(contentPack?.items?.find((i: any) => i.id === selectedTradingItem)?.value || 0);
                  const bestAsk = asks.length ? Math.min(...asks) : 0;
                  const bestBid = bids.length ? Math.max(...bids) : 0;
                  return (
                    <div className="sell-preset-chips">
                      {shop > 0 && (
                        <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, shop))}>
                          店价 {shop}
                        </button>
                      )}
                      {bestAsk > 0 && (
                        <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, bestAsk))}>
                          最低卖 {bestAsk}
                        </button>
                      )}
                      {bestBid > 0 && (
                        <button type="button" className="qty-chip" onClick={() => setSellPrice(Math.max(1, bestBid))}>
                          最高买 {bestBid}
                        </button>
                      )}
                      <button type="button" className="qty-chip" onClick={() => setSellPrice((p) => Math.max(1, Math.floor(p * 0.95)))}>
                        -5%
                      </button>
                      <button type="button" className="qty-chip" onClick={() => setSellPrice((p) => Math.max(1, Math.ceil(p * 1.05)))}>
                        +5%
                      </button>
                    </div>
                  );
                })()}
              </div>
              
              <div className="sell-summary">
                <div className="summary-row">
                  <span>总{orderType === 'sell' ? '价' : '金额'}</span>
                  <span className="summary-value gold">{sellQuantity * sellPrice} 💰</span>
                </div>
                {orderType === 'sell' && (
                  <>
                    <div className="summary-row">
                      <span>手续费(5%)</span>
                      <span className="summary-value">{Math.floor(sellQuantity * sellPrice * 0.05)} 💰</span>
                    </div>
                    <div className="summary-row total">
                      <span>实际收入</span>
                      <span className="summary-value gold">{sellQuantity * sellPrice - Math.floor(sellQuantity * sellPrice * 0.05)} 💰</span>
                    </div>
                  </>
                )}
                {orderType === 'buy' && (
                  <div className="summary-row total">
                    <span>需要支付</span>
                    <span className="summary-value gold">{sellQuantity * sellPrice} 💰</span>
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-action"
                  disabled={
                    (orderType === 'sell' && selectedTradingItem && sellQuantity > (playerState.inventory[selectedTradingItem] || 0)) ||
                    (orderType === 'buy' && sellQuantity * sellPrice > (playerState.inventory.gold || 0))
                  }
                  onClick={handleCreateOrder}
                >
                  确认挂单
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowSellModal(false);
                    setSellQuantity(1);
                    setSellPrice(10);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 购买/出售弹窗 */}
      {showPurchaseModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => { setShowPurchaseModal(false); setPurchaseQuantity(1); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {selectedOrder.type === 'sell' ? '💰 购买物品' : '📦 出售物品'}
              {selectedTradingItem && ` - ${getItemInfo(selectedTradingItem).name}`}
            </h3>
            <div className="sell-form">
              <div className="form-group">
                <label className="form-label">
                  <span>{selectedOrder.type === 'sell' ? '购买数量' : '出售数量'}</span>
                  <span className="form-hint">
                    （订单数量 {selectedOrder.quantity}）
                  </span>
                  {selectedOrder.type === 'buy' && selectedTradingItem && (
                    <span className="form-hint">
                      （拥有 {playerState.inventory[selectedTradingItem] || 0}）
                    </span>
                  )}
                </label>
                <input 
                  type="number" 
                  className="form-input"
                  min="1"
                  max={selectedOrder.type === 'buy' && selectedTradingItem 
                    ? Math.min(selectedOrder.quantity, playerState.inventory[selectedTradingItem] || 0)
                    : selectedOrder.quantity}
                  value={purchaseQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const maxQty = selectedOrder.type === 'buy' && selectedTradingItem
                      ? Math.min(selectedOrder.quantity, playerState.inventory[selectedTradingItem] || 0)
                      : selectedOrder.quantity;
                    setPurchaseQuantity(Math.max(1, Math.min(value, maxQty)));
                  }}
                />
              </div>
              
              <div className="sell-summary">
                <div className="summary-row">
                  <span>单价</span>
                  <span className="summary-value">{selectedOrder.price} 💰</span>
                </div>
                {selectedOrder.type === 'buy' && (
                  <>
                    <div className="summary-row">
                      <span>总价</span>
                      <span className="summary-value gold">{purchaseQuantity * selectedOrder.price} 💰</span>
                    </div>
                    <div className="summary-row">
                      <span>手续费(5%)</span>
                      <span className="summary-value">{Math.floor(purchaseQuantity * selectedOrder.price * 0.05)} 💰</span>
                    </div>
                  </>
                )}
                <div className="summary-row total">
                  <span>{selectedOrder.type === 'sell' ? '总支付' : '实际收入'}</span>
                  <span className="summary-value gold">
                    {selectedOrder.type === 'sell'
                      ? purchaseQuantity * selectedOrder.price
                      : purchaseQuantity * selectedOrder.price - Math.floor(purchaseQuantity * selectedOrder.price * 0.05)} 💰
                  </span>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-action"
                  disabled={
                    orderSubmitting ||
                    !!(
                      (selectedOrder.type === 'sell' && purchaseQuantity * selectedOrder.price > (playerState.inventory.gold || 0)) ||
                      (selectedOrder.type === 'buy' && selectedTradingItem && purchaseQuantity > (playerState.inventory[selectedTradingItem] || 0))
                    )
                  }
                  onClick={handleBuyOrder}
                >
                  {orderSubmitting ? '处理中...' : `确认${selectedOrder.type === 'sell' ? '购买' : '出售'}`}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setPurchaseQuantity(1);
                    setSelectedOrder(null);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 职业切换弹窗 */}
      {showProfessionModal && (
        <div className="modal-overlay" onClick={() => setShowProfessionModal(false)}>
          <div className="modal-content profession-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              type="button"
              onClick={() => setShowProfessionModal(false)}
              aria-label="关闭"
            >
              ✕
            </button>
            <h3 className="modal-title">选择职业</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <p className="modal-subtitle" style={{ margin: 0 }}>
                {chapterDone ? "点当前职业可关闭；点其他职业会跳到对应采集页" : "第一章只做伐木工。矿山的门还没开。"}
              </p>
            </div>
            
            <div className="profession-grid">
              {Object.values(professions).filter((prof) => chapterDone || prof.id === "woodcutter").map((prof) => {
                const skill = playerState.skills[prof.skill] || { level: 1, xp: 0 };
                const craft = playerState.skills[prof.craftSkill] || { level: 1, xp: 0 };
                const isCurrent = prof.id === currentProfession;
                const nextLevelXp = getXpForLevel(Math.max(skill.level, craft.level));
                const lead = skill.level >= craft.level ? skill : craft;
                const xpProgress = Number.isFinite(nextLevelXp) && nextLevelXp > 0 ? (lead.xp / nextLevelXp) * 100 : 100;
                
                return (
                  <div
                    key={prof.id}
                    className={`profession-card ${isCurrent ? 'current' : ''}`}
                    onClick={() => {
                      if (isCurrent) {
                        setShowProfessionModal(false);
                        return;
                      }
                      setCurrentProfession(prof.id as any);
                      setActiveTab(prof.gatherTab);
                      setShowProfessionModal(false);
                      void apiClient.setActiveClass(prof.id).catch((e: any) => {
                        toast.error(e?.message || '切换职业失败');
                      });
                    }}
                  >
                    {isCurrent && <div className="current-badge">当前</div>}
                    <div className="profession-icon" style={{ height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <T1Art kind="character" id={characterArtId(prof.id, playerGender)} fallback={prof.icon} alt={prof.name} />
                    </div>
                    <div className="profession-name">{prof.icon} {prof.name}</div>
                    <div className="profession-level">{prof.gatherName} Lv.{skill.level} · {prof.craftName} Lv.{craft.level}</div>
                    
                    {/* 经验进度条 */}
                    <div className="profession-xp-bar">
                      <div 
                        className="profession-xp-fill"
                        style={{ width: `${Math.min(100, xpProgress)}%` }}
                      ></div>
                    </div>
                    <div className="profession-xp-text">
                      {lead === skill ? prof.gatherName : prof.craftName}经验 {Math.floor(lead.xp)}/{Number.isFinite(nextLevelXp) ? nextLevelXp : 'MAX'} ({Math.floor(Math.min(100, xpProgress))}%)
                    </div>
                    
                    {/* 技能提示与职业专长 */}
                    <div className="profession-skills">
                      <span className="skill-tag">{prof.gatherName}</span>
                      <span className="skill-tag">{prof.craftName}</span>
                    </div>
                    <div className="profession-perk-box">
                      <div className="profession-perk-title">
                        【{getProfessionPerk(prof.id).traitName}】{getProfessionPerk(prof.id).shortTag}
                      </div>
                      <div className="profession-perk-sub">
                        本职5级起：速度+5% · 每5级效率+1%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="profession-tips">
              <div className="tip-text">点当前职业关闭，点其他职业切换并进入采集页</div>
            </div>
          </div>
        </div>
      )}

      {/* 进度系统弹窗 */}
      {progPanel === 'achievements' && (
        <AchievementsPanel
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onGoldChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'daily' && (
        <DailyQuestsPanel
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onGoldChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'settings' && (
        <SettingsPanel onClose={() => setProgPanel(null)} />
      )}
      {(playerState?.stats?.totalKills ?? 0) >= 1 && !playerState?.chapter1Build && buildModalDelayDone && (
        <div className="modal-overlay">
          <div className="modal-content build-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">选择你的第一刀</h3>
            <p className="modal-desc">这一选择会改变之后的森林战斗，只能选一次。</p>
            <button
              className="btn-action skill-action build-option"
              disabled={actionLoading}
              onClick={async () => {
                if (actionLoading) return;
                setActionLoading(true);
                try {
                  await apiClient.chooseChapterBuild('sharpened_edge');
                  apiClient.clearCache();
                  playGameSound("unlock");
                  await refreshPlayerState();
                } catch (e: any) {
                  toast.error(e?.message || '选择流派失败');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <T1Art kind="skills" id="sharpened_edge" alt="" />
              <span className="build-copy">
                <strong>开刃 — 攻击 +4</strong>
                <small>进攻型：显著提升普攻与重劈伤害，加快清怪节奏</small>
              </span>
            </button>
            <button
              className="btn-action skill-action build-option"
              style={{ marginTop: 8 }}
              disabled={actionLoading}
              onClick={async () => {
                if (actionLoading) return;
                setActionLoading(true);
                try {
                  await apiClient.chooseChapterBuild('thick_bark');
                  apiClient.clearCache();
                  playGameSound("unlock");
                  await refreshPlayerState();
                } catch (e: any) {
                  toast.error(e?.message || '选择流派失败');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <T1Art kind="skills" id="thick_bark" alt="" />
              <span className="build-copy">
                <strong>厚树皮 — 生命 +20 · 防御 +4</strong>
                <small>稳健型：提升生命上限与防御减伤，面对强敌更耐打</small>
              </span>
            </button>
          </div>
        </div>
      )}
      {progPanel === 'checkin' && (
        <CheckInModal
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'prestige' && (
        <PrestigePanel
          onClose={() => setProgPanel(null)}
          onChange={() => {
            apiClient.clearCache();
            setCurrentActivity(null);
            setBattleState(null);
            void refreshPlayerState();
          }}
        />
      )}

      {/* 首次建角：无 characterCreated 标记的存档一律补一次 */}
      {playerState && !playerState.settings?.characterCreated && (
        <CharacterCreate
          classes={Object.values(professions).map((p) => ({ id: p.id, name: p.name, icon: p.icon, gatherName: p.gatherName, craftName: p.craftName }))}
          currentName={playerName}
          currentClassId={playerState.activeClassId || 'woodcutter'}
          onDone={(res) => {
            if (res?.name) setCustomPlayerName(res.name);
            if (res?.gender) setCustomPlayerGender(res.gender);
            if (res?.avatar) setCustomPlayerAvatar(res.avatar);
            if (res?.classId) setCurrentProfession(res.classId as any);
            void refreshPlayerState();
          }}
        />
      )}
      {/* 开场三步引导：建角完成后、看过为止 */}
      {playerState?.settings?.characterCreated && !playerState.settings.tutorialDone && (
        <TutorialGuide onDone={() => { void refreshPlayerState(); }} />
      )}
    </div>
  )
}


/** Persistent combat HP chip — wounds carry between fights, pool refills over ~60s out of combat. */
function CombatHpChip({ maxHp, combatHp, combatHpAt, activeClassId }: { maxHp: number; combatHp?: number; combatHpAt?: number; activeClassId?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const spanSec = activeClassId === 'farmer' ? 40 : 60
  const baseHp = combatHp === undefined ? maxHp : Math.min(Math.max(0, combatHp), maxHp)
  const curExact =
    baseHp < maxHp && combatHpAt !== undefined
      ? Math.min(maxHp, baseHp + (Math.max(0, now - combatHpAt) / (spanSec * 1000)) * maxHp)
      : baseHp
  const cur = Math.min(maxHp, Math.floor(curExact))
  if (cur >= maxHp) return null
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (curExact / maxHp) * 100)) : 100
  const secsLeft = Math.max(1, Math.ceil(((maxHp - curExact) / maxHp) * spanSec))
  return (
    <div className="page-info combat-hp-chip" title="战斗血量会跨场保留；脱战后约 1 分钟回满">
      <p>❤️ 生命值 <b>{cur}</b> / {maxHp} ({Math.floor(pct)}%) · 回血中（约 {secsLeft}s 回满）</p>
      <div className="combat-hp-chip-bar" aria-hidden="true">
        <div className="combat-hp-chip-fill" style={{ width: `${pct.toFixed(1)}%` }} />
      </div>
    </div>
  )
}
