import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../contexts/GameContext'
import { useAuth } from '../hooks/useAuth'
import { EnhancementPanel } from './EnhancementPanel'
import { SkillTreePanel } from './SkillTreePanel'
import { PartyPanel } from './PartyPanel'
import { GameChatPanel } from './GameChatPanel'
import { GameActionNav } from './GameActionNav'
import { GameHeader } from './GameHeader'
import { PlayerRightPanel } from './PlayerRightPanel'
import { playCombatHit, playCombatWin } from '../utils/combatAudio'
import { apiClient } from '../services/api'
import { chatWs, ChatMsg } from '../services/websocket'
import { logger } from '../utils/logger'
import { getItemName } from '../utils/itemNames'
import CardArt from './CardArt'
import { AchievementsPanel, DailyQuestsPanel, StatsPanel, SettingsPanel } from './ProgressionPanels'
import { BuffsPanel, ShopPanel, CheckInModal } from './SystemPanels'
import { ReputationPanel, BountiesPanel, PrestigePanel } from './AdvancementPanels'
import { OfflineModal, OfflineSummary } from './OfflineModal'
import { useToast } from './Toast'
import './NewGameInterface.css'

type ActiveTab = 'logging' | 'woodworking' | 'mining' | 'smithing' | 'farming' | 'husbandry' | 'fishing' | 'cooking' | 'gathering' | 'tailoring' | 'crystal_mining' | 'alchemy' | 'adventure' | 'enhance' | 'skills' | 'trading' | 'party'

// 当前活动状态
interface CurrentActivity {
  name: string
  output: string
  duration: number // 秒
  mark?: string
}

// 卡片素材已改用纯 SVG 矢量组件 CardArt（见 ./CardArt.tsx），不再依赖位图路径。

// 怪物数据 - 按地图分组
const monstersByMap: Record<string, any[]> = {
  forest: [
    { id: 'slime', name: '果冻史莱姆', icon: '🟢', desc: '半透明生物，头顶一朵小花，性格温和', level: 1, xp: 10, gold: '10', rare: '微光水晶', rareChance: 0.5, hp: 100, atk: 8, def: 5, map: 'forest' },
    { id: 'caterpillar', name: '瞌睡毛毛虫', icon: '🐛', desc: '总是在打瞌睡的毛毛虫，动作缓慢', level: 2, xp: 12, gold: '12', rare: '棉花', rareChance: 0.5, hp: 125, atk: 10, def: 6, map: 'forest' },
    { id: 'monkey', name: '捣蛋小猴', icon: '🐵', desc: '喜欢恶作剧的小猴子，行动敏捷', level: 3, xp: 14, gold: '14', rare: '水果', rareChance: 0, hp: 150, atk: 12, def: 7, map: 'forest' },
    { id: 'mushroom', name: '生气蘑菇怪', icon: '🍄', desc: '看起来很生气的蘑菇，会释放孢子', level: 4, xp: 16, gold: '16', rare: '辉光水晶', rareChance: 0.3, hp: 180, atk: 14, def: 8, map: 'forest' },
    { id: 'bee', name: '路痴小蜜蜂', icon: '🐝', desc: '经常迷路的小蜜蜂，但很勤劳', level: 5, xp: 18, gold: '18', rare: '微光水晶', rareChance: 0.5, hp: 210, atk: 16, def: 9, map: 'forest' },
    { id: 'crab', name: '铁壳寄居蟹', icon: '🦀', desc: '壳特别坚硬的寄居蟹，防御力很高', level: 6, xp: 20, gold: '20', rare: '铜矿石', rareChance: 0.5, hp: 250, atk: 18, def: 12, map: 'forest' },
    { id: 'forest_boss', name: '森林管家(BOSS)', icon: '🦌', desc: '守护森林的强大存在，拥有古老的智慧', level: 10, xp: 100, gold: '200', rare: '创世水晶', rareChance: 0.1, hp: 500, atk: 80, def: 50, isBoss: true, map: 'forest' },
  ],
  mine: [
    { id: 'rock_golem', name: '碎石傀儡', icon: '🗿', desc: '由矿石碎片组成的生物，移动时发出叮当声', level: 11, xp: 22, gold: '22', rare: '铁矿石', rareChance: 0.5, hp: 120, atk: 20, def: 14, map: 'mine' },
    { id: 'crystal_bat', name: '水晶蝙蝠', icon: '🦇', desc: '翅膀闪烁着水晶光芒的蝙蝠', level: 12, xp: 24, gold: '24', rare: '辉光水晶', rareChance: 0.5, hp: 135, atk: 22, def: 15, map: 'mine' },
    { id: 'ore_rat', name: '矿石鼠', icon: '🐀', desc: '喜欢啃食矿石的大老鼠，牙齿特别锋利', level: 13, xp: 26, gold: '26', rare: '银矿石', rareChance: 0.5, hp: 150, atk: 24, def: 16, map: 'mine' },
    { id: 'magma_worm', name: '岩浆虫', icon: '🪱', desc: '生活在地底深处的虫子，身体滚烫', level: 14, xp: 28, gold: '28', rare: '耀光水晶', rareChance: 0.3, hp: 165, atk: 26, def: 17, map: 'mine' },
    { id: 'iron_spider', name: '钢铁蜘蛛', icon: '🕷️', desc: '外壳坚硬如铁的蜘蛛，八条腿力大无穷', level: 15, xp: 30, gold: '30', rare: '金矿石', rareChance: 0.5, hp: 180, atk: 28, def: 18, map: 'mine' },
    { id: 'gem_thief', name: '宝石大盗', icon: '🦎', desc: '专门偷宝石的狡猾生物，动作敏捷', level: 16, xp: 32, gold: '32', rare: '白金矿石', rareChance: 0.5, hp: 195, atk: 30, def: 20, map: 'mine' },
    { id: 'mine_boss', name: '矿山霸主(BOSS)', icon: '🐉', desc: '统治整个矿山的强大存在，全身覆盖着珍贵矿石', level: 20, xp: 200, gold: '400', rare: '秘银矿石', rareChance: 0.1, hp: 1000, atk: 160, def: 100, isBoss: true, map: 'mine' },
  ],
  swamp: [
    { id: 'poison_frog', name: '毒雾青蛙', icon: '🐸', desc: '会喷射毒雾的青蛙，皮肤五颜六色', level: 21, xp: 34, gold: '34', rare: '毒囊', rareChance: 0, hp: 210, atk: 32, def: 22, map: 'swamp' },
    { id: 'swamp_zombie', name: '沼泽僵尸', icon: '🧟', desc: '从沼泽中爬出的僵尸，动作迟缓但力量惊人', level: 22, xp: 36, gold: '36', rare: '腐烂之心', rareChance: 0, hp: 225, atk: 34, def: 23, map: 'swamp' },
    { id: 'mud_elemental', name: '泥浆元素', icon: '💩', desc: '由沼泽泥浆凝聚而成的元素生物', level: 23, xp: 38, gold: '38', rare: '元素核心', rareChance: 0, hp: 240, atk: 36, def: 24, map: 'swamp' },
    { id: 'vine_snake', name: '藤蔓毒蛇', icon: '🐍', desc: '伪装成藤蔓的毒蛇，擅长偷袭', level: 24, xp: 40, gold: '40', rare: '蛇毒', rareChance: 0, hp: 255, atk: 38, def: 25, map: 'swamp' },
    { id: 'ghost_light', name: '鬼火幽灵', icon: '👻', desc: '漂浮在沼泽上的神秘鬼火，会迷惑旅人', level: 25, xp: 42, gold: '42', rare: '幽灵精华', rareChance: 0, hp: 270, atk: 40, def: 26, map: 'swamp' },
    { id: 'swamp_troll', name: '沼泽巨魔', icon: '👹', desc: '身材高大的巨魔，力大无穷但头脑简单', level: 26, xp: 44, gold: '44', rare: '巨魔之力', rareChance: 0, hp: 285, atk: 42, def: 28, map: 'swamp' },
    { id: 'swamp_boss', name: '沼泽之王(BOSS)', icon: '🐊', desc: '沼泽深处的恐怖存在，掌控着整片沼泽的生死', level: 30, xp: 300, gold: '600', rare: '沼泽王冠', rareChance: 0.2, hp: 1500, atk: 240, def: 150, isBoss: true, map: 'swamp' },
  ],
  snow: [
    { id: 'snow_wolf', name: '冰原雪狼', icon: '🐺', desc: '在暴风雪中穿行的雪狼，毛皮厚实、爪牙锋利', level: 31, xp: 84, gold: '78', rare: '寒霜结晶', rareChance: 0.5, hp: 1103, atk: 169, def: 110, map: 'snow' },
    { id: 'frost_imp', name: '霜冻小妖', icon: '🧊', desc: '会施放冰冻法术的淘气小妖，行踪飘忽', level: 33, xp: 89, gold: '83', rare: '寒霜结晶', rareChance: 0.5, hp: 1180, atk: 180, def: 117, map: 'snow' },
    { id: 'ice_golem', name: '寒冰傀儡', icon: '🗿', desc: '由万年寒冰凝聚而成的傀儡，防御惊人', level: 35, xp: 94, gold: '87', rare: '玄冰核心', rareChance: 0.3, hp: 1257, atk: 190, def: 124, map: 'snow' },
    { id: 'snow_harpy', name: '雪羽鹰身女妖', icon: '🦅', desc: '盘旋在雪峰间的女妖，振翅可掀起暴风雪', level: 37, xp: 99, gold: '91', rare: '雪羽', rareChance: 0.4, hp: 1336, atk: 200, def: 131, map: 'snow' },
    { id: 'frozen_knight', name: '冰封骑士', icon: '⚔️', desc: '被永冻封印的古代骑士，剑意森寒', level: 39, xp: 104, gold: '96', rare: '冰封战甲碎片', rareChance: 0.3, hp: 1415, atk: 211, def: 138, map: 'snow' },
    { id: 'yeti', name: '暴雪雪人', icon: '🦣', desc: '盘踞雪山深处的巨型雪人，力大无穷', level: 42, xp: 111, gold: '102', rare: '雪人之心', rareChance: 0.3, hp: 1534, atk: 226, def: 148, map: 'snow' },
    { id: 'snow_boss', name: '霜冠雪魔(BOSS)', icon: '❄️', desc: '统御整座雪山的远古霜魔，所到之处万物冰封', level: 45, xp: 1062, gold: '981', rare: '霜冠之核', rareChance: 0.15, hp: 10758, atk: 436, def: 269, isBoss: true, map: 'snow' },
  ],
  volcano: [
    { id: 'lava_slug', name: '熔岩鼻涕虫', icon: '🐌', desc: '在岩浆中缓慢爬行的软体生物，体表滚烫', level: 46, xp: 120, gold: '111', rare: '炽焰碎片', rareChance: 0.5, hp: 1696, atk: 247, def: 161, map: 'volcano' },
    { id: 'fire_bat', name: '烈焰蝙蝠', icon: '🦇', desc: '翅膀燃着火焰的蝙蝠，俯冲时拖出火光', level: 48, xp: 125, gold: '116', rare: '炽焰碎片', rareChance: 0.5, hp: 1778, atk: 258, def: 168, map: 'volcano' },
    { id: 'cinder_hound', name: '余烬猎犬', icon: '🐕', desc: '由余烬凝成的猎犬，奔跑时火星四溅', level: 50, xp: 130, gold: '120', rare: '余烬之牙', rareChance: 0.4, hp: 1860, atk: 268, def: 175, map: 'volcano' },
    { id: 'magma_titan', name: '岩浆泰坦', icon: '🌋', desc: '从熔岩中崛起的巨人，每一步都震得大地颤抖', level: 52, xp: 135, gold: '124', rare: '熔岩核心', rareChance: 0.3, hp: 1943, atk: 278, def: 182, map: 'volcano' },
    { id: 'flame_wraith', name: '烈焰怨灵', icon: '👻', desc: '葬身火海者的怨念所化，缠绕着不灭之火', level: 55, xp: 142, gold: '131', rare: '怨灵余火', rareChance: 0.3, hp: 2068, atk: 294, def: 192, map: 'volcano' },
    { id: 'inferno_drake', name: '炼狱火龙', icon: '🐉', desc: '盘踞火山口的火龙，吐息可融化钢铁', level: 58, xp: 149, gold: '138', rare: '火龙之鳞', rareChance: 0.25, hp: 2195, atk: 310, def: 202, map: 'volcano' },
    { id: 'volcano_boss', name: '烈焰魔君(BOSS)', icon: '🔥', desc: '熔岩深渊的统治者，传说其苏醒之日山河尽燃', level: 60, xp: 1386, gold: '1278', rare: '魔君之冠', rareChance: 0.15, hp: 14820, atk: 576, def: 355, isBoss: true, map: 'volcano' },
  ],
  abyss: [
    { id: 'shadow_crawler', name: '暗影爬虫', icon: '🕷️', desc: '在幽影深渊蠕动的暗影生物，潜伏于黑暗之中', level: 61, xp: 156, gold: '144', rare: '暗影之丝', rareChance: 0.4, hp: 2323, atk: 325, def: 212, map: 'abyss' },
    { id: 'void_specter', name: '虚空幽魂', icon: '👻', desc: '从虚空缝隙渗出的幽魂，触碰即蚀骨', level: 63, xp: 161, gold: '149', rare: '暗影之丝', rareChance: 0.4, hp: 2409, atk: 336, def: 219, map: 'abyss' },
    { id: 'dread_knight', name: '恐惧骑士', icon: '⚔️', desc: '被虚空腐蚀的堕落骑士，散发令人窒息的恐惧', level: 65, xp: 166, gold: '153', rare: '虚空裂片', rareChance: 0.4, hp: 2496, atk: 346, def: 226, map: 'abyss' },
    { id: 'abyss_maw', name: '深渊巨口', icon: '🕳️', desc: '深渊本身张开的巨口，吞噬一切靠近之物', level: 68, xp: 173, gold: '160', rare: '虚空裂片', rareChance: 0.4, hp: 2626, atk: 362, def: 236, map: 'abyss' },
    { id: 'nightmare_weaver', name: '梦魇织者', icon: '🕸️', desc: '编织噩梦的恐怖存在，让人深陷幻境', level: 71, xp: 180, gold: '166', rare: '深渊之核', rareChance: 0.4, hp: 2758, atk: 377, def: 246, map: 'abyss' },
    { id: 'void_behemoth', name: '虚空巨兽', icon: '🦖', desc: '体型庞大的虚空巨兽，每一步都撕裂空间', level: 74, xp: 188, gold: '173', rare: '深渊之核', rareChance: 0.4, hp: 2891, atk: 393, def: 257, map: 'abyss' },
    { id: 'abyss_boss', name: '虚空领主(BOSS)', icon: '🌑', desc: '幽影深渊的至高统治者，凝视它会坠入永夜', level: 75, xp: 1710, gold: '1575', rare: '虚空王冠', rareChance: 0.15, hp: 19084, atk: 716, def: 442, isBoss: true, map: 'abyss' },
  ],
  celestial: [
    { id: 'light_sprite', name: '圣光精灵', icon: '🧚', desc: '苍穹天界的圣洁精灵，散发柔和的光辉', level: 76, xp: 192, gold: '177', rare: '天界羽翼', rareChance: 0.4, hp: 2981, atk: 403, def: 263, map: 'celestial' },
    { id: 'sky_guardian', name: '天穹守卫', icon: '🛡️', desc: '镇守天界之门的守卫，盔甲闪耀圣辉', level: 78, xp: 197, gold: '182', rare: '天界羽翼', rareChance: 0.4, hp: 3071, atk: 414, def: 270, map: 'celestial' },
    { id: 'radiant_griffin', name: '辉耀狮鹫', icon: '🦅', desc: '翱翔天界的狮鹫，羽翼洒落金色光芒', level: 80, xp: 202, gold: '186', rare: '圣辉金', rareChance: 0.35, hp: 3161, atk: 424, def: 277, map: 'celestial' },
    { id: 'seraph_sentinel', name: '炽天哨兵', icon: '😇', desc: '六翼炽天使形态的哨兵，圣光灼目', level: 83, xp: 209, gold: '193', rare: '圣辉金', rareChance: 0.35, hp: 3297, atk: 440, def: 287, map: 'celestial' },
    { id: 'divine_colossus', name: '神圣巨像', icon: '🗿', desc: '由天界圣石铸成的巨像，守护着神域', level: 86, xp: 216, gold: '199', rare: '天使之泪', rareChance: 0.3, hp: 3434, atk: 455, def: 297, map: 'celestial' },
    { id: 'archon', name: '执政天神', icon: '👼', desc: '掌管天界秩序的执政天神，威严不可侵犯', level: 89, xp: 224, gold: '206', rare: '天使之泪', rareChance: 0.3, hp: 3573, atk: 471, def: 308, map: 'celestial' },
    { id: 'celestial_boss', name: '堕落天使(BOSS)', icon: '🪽', desc: '坠入黑暗的天使，光明与堕落在其身上交织', level: 90, xp: 2034, gold: '1872', rare: '堕落光环', rareChance: 0.15, hp: 23524, atk: 857, def: 529, isBoss: true, map: 'celestial' },
  ],
  rift: [
    { id: 'chrono_phantom', name: '时之幻影', icon: '⏳', desc: '游离于时间之外的幻影，时隐时现', level: 91, xp: 228, gold: '210', rare: '时之尘', rareChance: 0.35, hp: 3666, atk: 481, def: 314, map: 'rift' },
    { id: 'paradox_beast', name: '悖论之兽', icon: '🌀', desc: '由时空悖论诞生的怪物，存在本身即矛盾', level: 93, xp: 233, gold: '215', rare: '时之尘', rareChance: 0.35, hp: 3759, atk: 492, def: 321, map: 'rift' },
    { id: 'rift_stalker', name: '裂隙潜行者', icon: '👁️', desc: '穿梭于时空裂隙的潜行者，难以捉摸', level: 95, xp: 238, gold: '219', rare: '裂境结晶', rareChance: 0.3, hp: 3853, atk: 502, def: 328, map: 'rift' },
    { id: 'temporal_wyrm', name: '时空巨龙', icon: '🐉', desc: '盘踞时空乱流的巨龙，吐息可逆转时光', level: 98, xp: 245, gold: '226', rare: '裂境结晶', rareChance: 0.3, hp: 3994, atk: 518, def: 338, map: 'rift' },
    { id: 'void_emperor', name: '虚空帝王', icon: '👑', desc: '统御无数虚空的帝王，力量近乎神祇', level: 101, xp: 252, gold: '232', rare: '时空精华', rareChance: 0.25, hp: 4136, atk: 533, def: 348, map: 'rift' },
    { id: 'reality_render', name: '现实撕裂者', icon: '💥', desc: '能撕裂现实本身的存在，所到之处世界崩坏', level: 104, xp: 260, gold: '239', rare: '时空精华', rareChance: 0.25, hp: 4280, atk: 549, def: 359, map: 'rift' },
    { id: 'rift_boss', name: '时空主宰(BOSS)', icon: '🌌', desc: '掌控过去与未来的终极主宰，世界的终焉与起源', level: 105, xp: 2358, gold: '2169', rare: '主宰之心', rareChance: 0.15, hp: 28132, atk: 997, def: 615, isBoss: true, map: 'rift' },
  ],
  inferno: [
    { id: 'hellhound', name: '炼狱地狱犬', icon: '🐕', desc: '守卫炼狱之门的三头地狱犬，吐息焚尽一切', level: 106, xp: 264, gold: '243', rare: '炼狱余烬', rareChance: 0.4, hp: 4376, atk: 559, def: 365, map: 'inferno' },
    { id: 'flame_imp', name: '烈焰小鬼', icon: '👺', desc: '成群结队的烈焰小鬼，狡诈而凶残', level: 108, xp: 269, gold: '248', rare: '炼狱余烬', rareChance: 0.4, hp: 4472, atk: 570, def: 372, map: 'inferno' },
    { id: 'soul_reaper', name: '噬魂收割者', icon: '💀', desc: '收割亡魂的死神仆从，镰刀勾魂', level: 110, xp: 274, gold: '252', rare: '堕魂结晶', rareChance: 0.4, hp: 4569, atk: 580, def: 379, map: 'inferno' },
    { id: 'lava_titan', name: '熔岩泰坦', icon: '🌋', desc: '由熔岩凝聚的巨人，每步震碎大地', level: 112, xp: 279, gold: '256', rare: '堕魂结晶', rareChance: 0.4, hp: 4667, atk: 590, def: 386, map: 'inferno' },
    { id: 'infernal_dragon', name: '炼狱火龙', icon: '🐲', desc: '盘踞炼狱核心的火龙，焰息可熔金', level: 114, xp: 284, gold: '261', rare: '炼狱之核', rareChance: 0.4, hp: 4764, atk: 601, def: 393, map: 'inferno' },
    { id: 'doom_bringer', name: '末日使者', icon: '☄️', desc: '宣告末日降临的使者，所至之处生灵涂炭', level: 116, xp: 288, gold: '265', rare: '炼狱之核', rareChance: 0.4, hp: 4863, atk: 611, def: 399, map: 'inferno' },
    { id: 'archfiend', name: '深渊魔将', icon: '😈', desc: '统领恶魔军团的深渊魔将，杀气滔天', level: 118, xp: 293, gold: '270', rare: '炼狱之核', rareChance: 0.4, hp: 4961, atk: 622, def: 406, map: 'inferno' },
    { id: 'hell_sovereign', name: '地狱亲王', icon: '👹', desc: '统御一方炼狱的亲王，威压令人窒息', level: 119, xp: 296, gold: '272', rare: '魔神王冠', rareChance: 0.4, hp: 5011, atk: 627, def: 410, map: 'inferno' },
    { id: 'inferno_boss', name: '炼狱魔神(BOSS)', icon: '🔥', desc: '永劫炼狱的至高魔神，号令亿万恶魔', level: 120, xp: 2682, gold: '2466', rare: '魔神王冠', rareChance: 0.4, hp: 32890, atk: 1138, def: 702, map: 'inferno', isBoss: true },
  ],
  genesis: [
    { id: 'star_seraph', name: '星辰炽天使', icon: '🌟', desc: '降临人间的星辰炽天使，圣光普照', level: 121, xp: 300, gold: '276', rare: '创世之光', rareChance: 0.4, hp: 5110, atk: 637, def: 416, map: 'genesis' },
    { id: 'cosmic_guardian', name: '寰宇守护者', icon: '🛡️', desc: '守护寰宇秩序的守护者，坚不可摧', level: 123, xp: 305, gold: '281', rare: '创世之光', rareChance: 0.4, hp: 5209, atk: 648, def: 423, map: 'genesis' },
    { id: 'light_avatar', name: '圣光化身', icon: '✨', desc: '圣光凝聚的化身，净化一切邪祟', level: 125, xp: 310, gold: '285', rare: '神性精华', rareChance: 0.4, hp: 5309, atk: 658, def: 430, map: 'genesis' },
    { id: 'creation_golem', name: '创世魔像', icon: '🗿', desc: '由创世之力塑造的魔像，守护神域', level: 127, xp: 315, gold: '289', rare: '神性精华', rareChance: 0.4, hp: 5409, atk: 668, def: 437, map: 'genesis' },
    { id: 'divine_phoenix', name: '神圣不死鸟', icon: '🦅', desc: '浴火重生的神圣不死鸟，永恒不灭', level: 129, xp: 320, gold: '294', rare: '创世之种', rareChance: 0.4, hp: 5510, atk: 679, def: 444, map: 'genesis' },
    { id: 'astral_judge', name: '星界审判者', icon: '⚖️', desc: '裁决众生命运的星界审判者，公正威严', level: 131, xp: 324, gold: '298', rare: '创世之种', rareChance: 0.4, hp: 5611, atk: 689, def: 450, map: 'genesis' },
    { id: 'demigod', name: '半神祭司', icon: '🧎', desc: '触及神之领域的半神祭司，神通广大', level: 133, xp: 329, gold: '303', rare: '创世之种', rareChance: 0.4, hp: 5713, atk: 700, def: 457, map: 'genesis' },
    { id: 'genesis_herald', name: '创世先知', icon: '📯', desc: '预言创世降临的先知，洞悉天机', level: 134, xp: 332, gold: '305', rare: '神之心脏', rareChance: 0.4, hp: 5764, atk: 705, def: 461, map: 'genesis' },
    { id: 'genesis_boss', name: '创世之神(BOSS)', icon: '🌅', desc: '开天辟地的创世之神，万物的起源', level: 135, xp: 3006, gold: '2763', rare: '神之心脏', rareChance: 0.4, hp: 37798, atk: 1278, def: 789, map: 'genesis', isBoss: true },
  ],
  omega: [
    { id: 'void_devourer', name: '虚空吞噬者', icon: '🕳️', desc: '吞噬一切的虚空巨兽，连光都无法逃脱', level: 136, xp: 336, gold: '309', rare: '终焉碎片', rareChance: 0.4, hp: 5866, atk: 715, def: 467, map: 'omega' },
    { id: 'entropy_beast', name: '熵增之兽', icon: '🌀', desc: '携带熵增之力的怪物，所触皆腐朽', level: 138, xp: 341, gold: '314', rare: '终焉碎片', rareChance: 0.4, hp: 5968, atk: 726, def: 474, map: 'omega' },
    { id: 'reality_eater', name: '现实啖食者', icon: '👄', desc: '啖食现实本身的存在，世界为之崩坏', level: 140, xp: 346, gold: '318', rare: '永恒结晶', rareChance: 0.4, hp: 6071, atk: 736, def: 481, map: 'omega' },
    { id: 'dimension_lord', name: '维度领主', icon: '🌌', desc: '统御无数维度的领主，操纵空间法则', level: 142, xp: 351, gold: '322', rare: '永恒结晶', rareChance: 0.4, hp: 6174, atk: 746, def: 488, map: 'omega' },
    { id: 'cosmic_horror', name: '寰宇恐惧', icon: '👁️', desc: '凝视即陷疯狂的寰宇恐惧，超越认知', level: 144, xp: 356, gold: '327', rare: '寰宇精华', rareChance: 0.4, hp: 6277, atk: 757, def: 495, map: 'omega' },
    { id: 'world_ender', name: '世界终结者', icon: '💥', desc: '终结一个世界的存在，灭世于弹指', level: 146, xp: 360, gold: '331', rare: '寰宇精华', rareChance: 0.4, hp: 6381, atk: 767, def: 501, map: 'omega' },
    { id: 'paradox_god', name: '悖论之神', icon: '♾️', desc: '由悖论诞生的神祇，存在本身即矛盾', level: 148, xp: 365, gold: '336', rare: '寰宇精华', rareChance: 0.4, hp: 6486, atk: 778, def: 508, map: 'omega' },
    { id: 'omega_herald', name: '终焉传令者', icon: '📢', desc: '宣告万界终焉的传令者，丧钟敲响', level: 149, xp: 368, gold: '338', rare: '万界之心', rareChance: 0.4, hp: 6538, atk: 783, def: 512, map: 'omega' },
    { id: 'omega_boss', name: '万界终焉(BOSS)', icon: '🌑', desc: '掌控所有世界命运的终极存在，世界的终结与起源', level: 150, xp: 3330, gold: '3060', rare: '万界之心', rareChance: 0.4, hp: 42835, atk: 1418, def: 876, map: 'omega', isBoss: true },
  ],
}

// 地图数据
const maps = [
  { id: 'forest', name: '呼呼大睡森林' },
  { id: 'mine', name: '叮当响矿山' },
  { id: 'swamp', name: '雾蒙蒙沼泽' },
  { id: 'snow', name: '冰封雪山' },
  { id: 'volcano', name: '熔岩深渊' },
  { id: 'abyss', name: '幽影深渊' },
  { id: 'celestial', name: '苍穹天界' },
  { id: 'rift', name: '时空裂境' },
  { id: 'inferno', name: '永劫炼狱' },
  { id: 'genesis', name: '创世神域' },
  { id: 'omega', name: '万界终焉' },
]

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

const UI_SLOT_TO_EQ: Record<string, "main_hand" | "off_hand" | "head" | "chest" | "legs" | "feet" | "accessory1" | "accessory2"> = {
  mainhand: "main_hand",
  offhand: "off_hand",
  head: "head",
  chest: "chest",
  legs: "legs",
  feet: "feet",
  accessory1: "accessory1",
  accessory2: "accessory2",
}

const equipSlots = {
  left: [
    { id: 'mainhand', name: '主手', icon: '⚔️', type: 'weapon' },
    { id: 'chest', name: '上衣', icon: '👕', type: 'armor' },
    { id: 'legs', name: '裤子', icon: '👖', type: 'armor' },
    { id: 'feet', name: '鞋子', icon: '👟', type: 'armor' },
  ],
  right: [
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
  // 玩家展示名：基于用户 id 派生一个稳定的名字（无独立昵称系统时的兜底）
  const playerName = user?.id ? `玩家_${String(user.id).slice(0, 6)}` : '玩家'
  const [activeTab, setActiveTab] = useState<ActiveTab>('adventure')

  // 进度系统弹窗：成就 / 每日任务 / 统计 / 设置 / 增益 / 商店 / 签到 / 声望 / 赏金 / 转生
  const [progPanel, setProgPanel] = useState<null | 'achievements' | 'daily' | 'stats' | 'settings' | 'buffs' | 'shop' | 'checkin' | 'reputation' | 'bounties' | 'prestige'>(null)
  // 顶栏角标：可领取数量
  const [claimableCount, setClaimableCount] = useState(0)
  // 顶栏角标：今日是否可签到
  const [checkInAvailable, setCheckInAvailable] = useState(false)
  // 离线收益弹窗
  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null)
  const offlineCheckedRef = useRef(false)
  
  // 轮询可领取的成就/每日任务数量，用于顶栏角标提醒
  useEffect(() => {
    let cancelled = false
    const refreshClaimable = async () => {
      try {
        const [ach, daily, checkin]: any[] = await Promise.all([
          apiClient.getAchievements().catch(() => ({ achievements: [] })),
          apiClient.getDailyQuests().catch(() => ({ quests: [] })),
          apiClient.getCheckIn().catch(() => ({ canCheckIn: false }))
        ])
        if (cancelled) return
        const achCount = (ach.achievements || []).filter((a: any) => a.unlocked && !a.claimed).length
        const dailyCount = (daily.quests || []).filter((q: any) => q.completed && !q.claimed).length
        setClaimableCount(achCount + dailyCount)
        setCheckInAvailable(!!checkin.canCheckIn)
      } catch { /* 忽略 */ }
    }
    refreshClaimable()
    const timer = window.setInterval(refreshClaimable, 30000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [])

  // 离线收益检测：基于本地上次活跃时间，结合后端结算日志展示“欢迎回来”弹窗
  useEffect(() => {
    if (offlineCheckedRef.current) return
    if (!playerState) return
    offlineCheckedRef.current = true

    const KEY = 'worklife:lastActiveAt'
    const prev = Number(localStorage.getItem(KEY) || '0')
    const now = Date.now()
    const offlineMs = prev > 0 ? now - prev : 0

    // 离线超过 5 分钟才展示
    if (offlineMs > 5 * 60 * 1000) {
      const min = Math.floor(offlineMs / 60000)
      const h = Math.floor(min / 60)
      const durationText = h > 0 ? `${h} 小时 ${min % 60} 分钟` : `${min} 分钟`
      // 从后端日志中提取“离线期间”收益行，并按动作+物品聚合，避免出现重复多行
      const logs: Array<{ text: string }> = (playerState as any).logs || []
      const offlineLogs = logs
        .filter((l) => typeof l.text === 'string' && l.text.includes('离线期间'))
        .slice(-8)
        .map((l) => l.text)

      // 聚合：累加同一动作的完成次数与各物品数量
      // 日志格式示例：离线期间完成 23 次 砍伐小白杨，获得：wood_1 x23, ...
      const agg = new Map<string, { cycles: number; items: Map<string, number> }>()
      const orderedActions: string[] = []
      for (const text of offlineLogs) {
        const m = text.match(/完成\s*(\d+)\s*次\s*(.+?)，获得：(.+)$/)
        if (!m) continue
        const cycles = parseInt(m[1], 10) || 0
        const actionName = m[2].trim()
        const rewardPart = m[3]
        if (!agg.has(actionName)) {
          agg.set(actionName, { cycles: 0, items: new Map() })
          orderedActions.push(actionName)
        }
        const entry = agg.get(actionName)!
        entry.cycles += cycles
        for (const piece of rewardPart.split(/,\s*/)) {
          const im = piece.trim().match(/^(.+?)\s*x\s*(\d+)$/)
          if (!im) continue
          const itemId = im[1].trim()
          const qty = parseInt(im[2], 10) || 0
          entry.items.set(itemId, (entry.items.get(itemId) || 0) + qty)
        }
      }

      let lines: string[]
      if (orderedActions.length > 0) {
        lines = orderedActions.map((name) => {
          const e = agg.get(name)!
          const rewardText = Array.from(e.items.entries())
            .map(([id, q]) => `${getItemName(id)} ×${q}`)
            .join('，')
          return `完成 ${e.cycles} 次「${name}」，获得 ${rewardText}`
        })
      } else if (playerState.mode === 'life_action') {
        lines = ['离开时仍有正在进行的打工，进度会继续结算']
      } else {
        lines = []
      }
      setOfflineSummary({ durationText, lines })
    }

    // 心跳：定期写入活跃时间，离开页面也记录
    const beat = () => localStorage.setItem(KEY, String(Date.now()))
    beat()
    const hb = window.setInterval(beat, 20000)
    const onHide = () => beat()
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(hb)
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [playerState])

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
  const [tradingOrders, setTradingOrders] = useState<any[]>([])
  const [tradingOrdersLoading, setTradingOrdersLoading] = useState(false)
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
  
  // 道具列表状态 - 用于交易所
  const [allItems, setAllItems] = useState<any>(null)
  const [itemsLoading, setItemsLoading] = useState(true)
  
  // 聊天相关状态 —— 接入 WebSocket 实时通信
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatChannel, setChatChannel] = useState<'world' | 'profession' | 'party'>('world')
  // 窄屏（≤768px）下聊天默认收起，避免底部抽屉遮挡主内容
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    world: 0,
    profession: 0,
    party: 0
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
  
  // 职业配置 - 每个职业有采集和加工两个技能，共享同一个等级和经验
  const professions = {
    woodcutter: { 
      id: 'woodcutter', 
      name: '伐木工', 
      icon: '🪓', 
      skill: 'skill_woodcutter',
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
      gatherName: '水晶',
      gatherTab: 'crystal_mining' as ActiveTab,
      craftName: '炼金',
      craftTab: 'alchemy' as ActiveTab,
    },
  }
  
  // 计算升级所需经验值（指数增长）
  const getXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    const baseXp = 100;
    const exponent = 1.5;
    return Math.floor(baseXp * Math.pow(level - 1, exponent));
  };
  
  // 获取当前职业信息
  const getCurrentProfession = () => professions[currentProfession]
  const getCurrentSkill = () => playerState?.skills?.[getCurrentProfession().skill] || { level: 1, xp: 0 }
  
  // 判断是否正在采集某个资源
  const isCurrentlyGathering = (resourceId: string): boolean => {
    if (!currentActivity || !playerState?.lifeActionState) return false;
    const actionId = playerState.lifeActionState.actionId;
    // 检查actionId是否包含resourceId
    return actionId.includes(resourceId);
  };

  // 判断是否正在战斗某个怪物
  const isCurrentlyFighting = (monsterId: string): boolean => {
    if (!battleState || !battleState.isActive) return false;
    return battleState.monster.id === monsterId;
  };
  
  // 发送聊天消息（通过 WebSocket）
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return
    const sent = chatWs.send(chatChannel, chatInput.trim())
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
  }, [chatInput, chatChannel])
  
  // 插入表情
  const insertEmoji = (emoji: string) => {
    setChatInput(prev => prev + emoji)
    setShowEmojiPicker(false)
  }
  
  // 切换频道时清除未读计数
  const switchChannel = (channel: 'world' | 'profession' | 'party') => {
    setChatChannel(channel)
    setUnreadCounts(prev => ({ ...prev, [channel]: 0 }))
  }
  
  // 计算战斗胜率
  const calculateWinRate = (playerLevel: number, enemyLevel: number): number => {
    const levelDiff = playerLevel - enemyLevel
    if (levelDiff >= 5) return 95
    if (levelDiff >= 3) return 85
    if (levelDiff >= 1) return 70
    if (levelDiff === 0) return 50
    if (levelDiff >= -2) return 35
    if (levelDiff >= -4) return 20
    return 10
  }
  
  // 获取胜率颜色
  const getWinRateColor = (winRate: number): string => {
    if (winRate >= 80) return '#4CAF50'
    if (winRate >= 60) return '#8BC34A'
    if (winRate >= 40) return '#FFC107'
    if (winRate >= 20) return '#FF9800'
    return '#f44336'
  }
  
  // 获取胜率文本
  const getWinRateText = (winRate: number): string => {
    if (winRate >= 80) return '轻松'
    if (winRate >= 60) return '有利'
    if (winRate >= 40) return '均势'
    if (winRate >= 20) return '困难'
    return '危险'
  }
  
  // 打开装备选择器
  const openEquipSelector = (slotId: string) => {
    setSelectedEquipSlot(slotId)
    setShowEquipSelector(true)
  }
  
  // 装备物品
  const equipItem = async (itemId: string) => {
    if (!selectedEquipSlot) return
    try {
      apiClient.clearCache()
      await apiClient.equipItem(UI_SLOT_TO_EQ[selectedEquipSlot], itemId)
      await refreshPlayerState()
      toast.success('已装备')
    } catch (e: any) {
      toast.error(e?.message || '装备失败')
    } finally {
      setShowEquipSelector(false)
      setSelectedEquipSlot(null)
    }
  }

  const unequipSlot = async (slotId: string) => {
    try {
      apiClient.clearCache()
      await apiClient.unequipItem(UI_SLOT_TO_EQ[slotId])
      await refreshPlayerState()
    } catch (e: any) {
      toast.error(e?.message || '卸下失败')
    }
  }
  
  // 计算装备属性加成
  const calculateEquipmentBonus = () => {
    const bonus = { atk: 0, def: 0, hp: 0, mp: 0 }
    const eq = playerState?.equipment as Record<string, unknown> | undefined
    if (!eq || !contentPack?.items) return bonus
    for (const [slot, itemId] of Object.entries(eq)) {
      if (typeof itemId !== 'string') continue
      if (slot === 'enhancementLevels' || slot === 'durability' || slot === 'maxDurability') continue
      const item = contentPack.items.find((i: any) => i.id === itemId)
      if (!item) continue
      if (item.atk) bonus.atk += Number(item.atk) || 0
      if (item.def) bonus.def += Number(item.def) || 0
      if (item.hp) bonus.hp += Number(item.hp) || 0
      if (item.mp) bonus.mp += Number(item.mp) || 0
    }
    return bonus
  }
  
  const getEquippedItemId = (uiSlot: string): string | undefined => {
    const key = UI_SLOT_TO_EQ[uiSlot]
    const val = (playerState?.equipment as any)?.[key]
    return typeof val === 'string' && val ? val : undefined
  }

  // 获取可装备的物品列表（根据槽位类型过滤）
  const getEquippableItems = (slotId: string) => {
    if (!playerState?.inventory || !contentPack?.items) return []
    const matches = (item: any) => {
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
      items = items.filter(item => item.type === inventoryFilter)
    }
    
    // 按名称搜索
    if (inventorySearch.trim()) {
      const searchLower = inventorySearch.toLowerCase()
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower)
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
  
  // 从内容包获取当前职业的制作配方
  const getCraftRecipesFromContentPack = (category: string) => {
    if (!contentPack || !contentPack.actions) return []
    
    const professionSkillId = `skill_${currentProfession}`
    const unlocked = playerState?.skills?.[professionSkillId]?.unlockedRecipes || []
    const armorCraftUnlocked = unlocked.includes('woodcutter_armor_crafting')
    const ARMOR_ACTIONS = new Set(['act_craft_wood_chest', 'act_craft_wood_legs', 'act_craft_wood_boots', 'act_craft_wood_gloves'])
    
    // 过滤出当前职业的制作配方（有consumes的就是制作配方）
    const recipes = contentPack.actions.filter((action: any) => 
      action.skillId === professionSkillId && 
      action.consumes && 
      action.consumes.length > 0 &&
      (!ARMOR_ACTIONS.has(action.id) || armorCraftUnlocked)
    )
    
    // 按类别分类
    const categorizedRecipes: any = {
      materials: [],
      weapons: [],
      equipment: []
    }
    
    recipes.forEach((recipe: any) => {
      // 根据产出物品判断类别
      const outputItem = recipe.yields[0].itemId
      if (!outputItem) return
      
      // 查找物品信息
      const itemInfo = contentPack.items.find((item: any) => item.id === outputItem)
      if (!itemInfo) return
      
      // 转换为前端格式
      const formattedRecipe = {
        id: recipe.id,
        name: recipe.name,
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
        type: itemInfo.type
      }
      
      // 分类
      if (itemInfo.type === 'weapon') {
        categorizedRecipes.weapons.push(formattedRecipe)
      } else if (itemInfo.type === 'armor') {
        categorizedRecipes.equipment.push(formattedRecipe)
      } else {
        categorizedRecipes.materials.push(formattedRecipe)
      }
    })
    
    return categorizedRecipes[category] || []
  }
  
  // 计算最大可制作数量
  const getMaxCraftableQuantity = (recipe: any): number => {
    if (!recipe.requires || !playerState?.inventory) return 0
    
    let maxQuantity = 999
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
    reviveCountdown: number; // 复活倒计时（秒）
  } | null>(null)
  
  // 状态栏相关状态
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null)
  const [progress, setProgress] = useState(0)
  const lastRefreshTimeRef = useRef(0) // 使用ref记录上次刷新时间，避免触发重渲染
  const isStoppingRef = useRef(false) // 标记是否正在停止活动
  
  // 奖励通知状态
  const [rewardNotification, setRewardNotification] = useState<{
    show: boolean;
    xp: number;
    gold: number;
    key: number;
  }>({ show: false, xp: 0, gold: 0, key: 0 })

  // 战斗伤害飘字状态
  const [damageFloats, setDamageFloats] = useState<Array<{
    id: number;
    target: 'player' | 'enemy';
    damage: number;
    isCrit: boolean;
  }>>([])

  // 战斗受击震动状态
  const [hitShake, setHitShake] = useState<{ player: boolean; enemy: boolean }>({ player: false, enemy: false })

  // 胜利特效状态
  const [showVictoryFx, setShowVictoryFx] = useState(false)

  // 采集/制作周期完成闪光
  const [cycleCompleteFlash, setCycleCompleteFlash] = useState(false)
  
  // 强制重新渲染的状态
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // 上一次的等级（用于检测升级）
  const [prevLevels, setPrevLevels] = useState<{
    profession: number;
    combat: number;
  }>({ profession: 1, combat: 1 })

  // 加载内容包
  useEffect(() => {
    const loadContentPack = async () => {
      try {
        setContentPackLoading(true)
        const pack = await apiClient.getContentPack()
        setContentPack(pack)
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

    const loadOrders = async () => {
      try {
        setTradingOrdersLoading(true);
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        setTradingOrders(orders);
        logger.debug('✅ 订单加载成功:', orders);
      } catch (error) {
        logger.error('❌ 加载订单失败:', error);
        setTradingOrders([]);
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
        
        // 恢复活动状态
        const activityInfo: CurrentActivity = {
          name: action.name,
          output: action.yields[0].itemId ? getItemNameById(action.yields[0].itemId) : '未知',
          duration: Math.floor(action.duration / 1000), // 转换为秒
          mark: activityMarkFromAction(actionId),
        };
        
        setCurrentActivity(activityInfo);
        
        // 计算当前进度
        const now = new Date();
        const elapsedMs = now.getTime() - startedAt.getTime();
        const durationMs = action.duration;
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

  // 进度条循环动画：使用 requestAnimationFrame 按需提交状态，避免 50ms 定时器持续触发 React 重渲染
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

    const duration = currentActivity.duration * 1000; // 转换为毫秒
    const startedAt = performance.now() - (progress / 100) * duration;
    let animationFrameId = 0;
    let lastPaintedProgress = Math.floor(progress);

    let lastCycleBucket = Math.floor((performance.now() - startedAt) / duration);

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const cycleProgress = Math.floor(((elapsed % duration) / duration) * 100);

      if (cycleProgress !== lastPaintedProgress) {
        lastPaintedProgress = cycleProgress;
        setProgress(cycleProgress);
      }

      // 检测周期完成，触发闪光效果
      const currentBucket = Math.floor(elapsed / duration);
      if (currentBucket > lastCycleBucket) {
        lastCycleBucket = currentBucket;
        setCycleCompleteFlash(true);
        setTimeout(() => setCycleCompleteFlash(false), 600);
      }

      if (elapsed >= duration) {
        const refreshBucket = Math.floor(elapsed / duration);
        const refreshKey = startedAt + refreshBucket * duration;
        if (refreshKey > lastRefreshTimeRef.current) {
          lastRefreshTimeRef.current = refreshKey;
          void refreshPlayerState();
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentActivity, battleState?.isActive, refreshPlayerState]);

  const startAction = async (actionId: string, activityInfo: CurrentActivity, quantity?: number) => {
    logger.debug('🚀 startAction called with:', actionId, activityInfo, quantity);
    try {
      setActionLoading(true)
      
      // 如果有任何活动，先清除前端状态
      if (currentActivity) {
        logger.debug('🔄 清除旧的采集活动');
        isStoppingRef.current = true;
        setCurrentActivity(null);
        setProgress(0);
      }
      if (battleState) {
        logger.debug('🔄 清除战斗状态');
        isStoppingRef.current = true;
        setBattleState(null);
      }
      
      // 调用后端停止旧活动（如果有）
      if (currentActivity || battleState) {
        await stopAction();
      }
      
      logger.debug('🚀 开始新活动:', actionId);
      // 清除停止标记，允许新活动
      isStoppingRef.current = false;
      const result = await startLifeAction(actionId, quantity)
      logger.debug('📡 startLifeAction result:', result);
      
      // 设置新的前端状态
      logger.debug('📝 Setting currentActivity:', activityInfo);
      setCurrentActivity(activityInfo)
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

  // 开始自动战斗
  const startBattle = async (monster: any) => {
    if (!playerState) return;
    
    // 如果有采集活动，先清除前端状态
    if (currentActivity) {
      logger.debug('🔄 清除采集活动以开始战斗');
      isStoppingRef.current = true;
      setCurrentActivity(null);
      setProgress(0);
      await stopAction();
    }
    
    try {
      const actionId = `act_combat_${monster.id}`;
      // 清除停止标记，允许新活动
      isStoppingRef.current = false;
      await startLifeAction(actionId);
      
      const playerLevel = playerState?.combatLevel || 1;
      const playerMaxHp = 50 + (playerLevel - 1) * 10;
      const enemyMaxHp = monster.hp || (30 + (monster.level - 1) * 15);

      const inheritedPlayerHp = battleState?.playerHp || playerMaxHp;

      requestAnimationFrame(() => {
        setBattleState({
          isActive: true,
          monster,
          playerHp: Math.min(inheritedPlayerHp, playerMaxHp),
          playerMaxHp,
          enemyHp: enemyMaxHp,
          enemyMaxHp,
          playerCastTime: 0,
          enemyCastTime: 0,
          playerCastDuration: 3000,
          enemyCastDuration: 3000,
          battleLog: [`开始战斗！${playerName} VS ${monster.name}`],
          battleCount: (battleState?.battleCount || 0) + 1,
          isPlayerDead: false,
          reviveCountdown: 0
        });
      });

      setSelectedItem(null);
      setModalType(null);
      
      logger.debug('✅ 开始战斗', monster.name);
    } catch (error) {
      logger.error('Failed to start battle:', error);
      isStoppingRef.current = false;
      toast.error('开始战斗失败: ' + (error as Error).message);
    }
  };

  // 停止战斗
  const stopBattle = async () => {
    try {
      logger.debug('🛑 停止战斗');
      // 设置停止标记
      isStoppingRef.current = true;
      // 先清除前端状态
      setBattleState(null);
      // 再调用后端API
      await stopAction();
      logger.debug('✅ 战斗已停止');
      // 延迟清除标记
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    } catch (error) {
      logger.error('停止战斗失败:', error);
      // 即使API调用失败，也保持前端状态清除
      isStoppingRef.current = false;
    }
  };

  // 创建交易订单
  const handleCreateOrder = async () => {
    if (!selectedTradingItem) return;

    try {
      await apiClient.createTradingOrder({
        itemId: selectedTradingItem,
        quantity: sellQuantity,
        price: sellPrice,
        type: orderType
      });

      // 刷新订单列表
      const orders = await apiClient.getTradingOrders(selectedTradingItem);
      setTradingOrders(orders);

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
    }
  };

  // 购买订单
  const handleBuyOrder = async () => {
    if (!selectedOrder) return;

    try {
      await apiClient.buyFromOrder(selectedOrder.id, purchaseQuantity);

      // 刷新订单列表
      if (selectedTradingItem) {
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        setTradingOrders(orders);
      }

      // 刷新玩家状态
      await refreshPlayerState();

      // 关闭弹窗
      setShowPurchaseModal(false);
      setSelectedOrder(null);
      setPurchaseQuantity(1);

      toast.success('购买成功！');
    } catch (error: any) {
      logger.error('购买失败:', error);
      toast.error('购买失败: ' + (error.message || '未知错误'));
    }
  };

  // 复活倒计时逻辑
  useEffect(() => {
    if (!battleState || !battleState.isPlayerDead) return;
    
    if (battleState.reviveCountdown > 0) {
      const timer = setTimeout(() => {
        setBattleState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            reviveCountdown: prev.reviveCountdown - 1
          };
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (battleState.reviveCountdown === 0 && battleState.isPlayerDead) {
      const playerLevel = playerState?.skills?.skill_woodcutter?.level || 1;
      const playerMaxHp = 50 + (playerLevel - 1) * 10;
      
      requestAnimationFrame(() => {
        setBattleState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            playerHp: playerMaxHp,
            isPlayerDead: false,
            isActive: true,
            turn: 'player',
            battleLog: [...prev.battleLog, `${playerName} 复活了！满血满蓝重新投入战斗！`]
          };
        });
      });
    }
  }, [battleState?.isPlayerDead, battleState?.reviveCountdown, playerState]);

  // 自动继续战斗的逻辑
  useEffect(() => {
    if (!battleState || battleState.isActive) return;
    if (battleState.enemyHp > 0 || battleState.playerHp <= 0) return;

    const actionId = `act_combat_${battleState.monster.id}`;
    const combatAction = contentPack?.actions?.find((a: any) => a.id === actionId);
    const waitMs = combatAction?.duration ?? 5000;

    const autoTimer = setTimeout(async () => {
      if (!playerState) return;
      
      try {
        await startLifeAction(actionId);
        await refreshPlayerState();
        
        const playerLevel = playerState.combatLevel || 1;
        const playerMaxHp = 50 + (playerLevel - 1) * 10;
        const enemyMaxHp = battleState.monster.hp || (30 + (battleState.monster.level - 1) * 15);

        requestAnimationFrame(() => {
          setBattleState(prev => {
            if (!prev) return null;
            const inheritedPlayerHp = prev.playerHp;
            return {
              ...prev,
              playerHp: Math.min(inheritedPlayerHp, playerMaxHp),
              enemyHp: enemyMaxHp,
              playerCastTime: 0,
              enemyCastTime: 0,
              battleLog: [`第${prev.battleCount + 1}场战斗开始！${playerName} VS ${prev.monster.name}`],
              isActive: true,
              battleCount: prev.battleCount + 1
            };
          });
        });
      } catch (error) {
        logger.error('Failed to start auto battle:', error);
        setBattleState(null);
      }
    }, waitMs);

    return () => clearTimeout(autoTimer);
  }, [battleState?.isActive, battleState?.enemyHp, battleState?.playerHp, battleState?.monster?.id, playerState?.combatLevel, startLifeAction, refreshPlayerState, contentPack]);

  useEffect(() => {
    if (!playerState) return;
    
    // 获取当前职业技能等级
    const currentSkillId = `skill_${currentProfession}`;
    const currentProfessionLevel = playerState.skills?.[currentSkillId]?.level || 1;
    const currentCombatLevel = playerState.combatLevel || 1;
    
    // 静默更新等级记录（不显示动画）
    if (currentProfessionLevel !== prevLevels.profession) {
      setPrevLevels(prev => ({ ...prev, profession: currentProfessionLevel }));
    }
    
    if (currentCombatLevel !== prevLevels.combat) {
      setPrevLevels(prev => ({ ...prev, combat: currentCombatLevel }));
    }
  }, [playerState?.skills, playerState?.combatLevel, currentProfession]);

  // 移除战斗中的频繁刷新，避免画面闪烁
  // 战斗结束后会自动刷新玩家状态
  // useEffect(() => {
  //   if (!battleState) return;
  //   
  //   const refreshTimer = setInterval(() => {
  //     refreshPlayerState();
  //   }, 3000);
  //   
  //   return () => clearInterval(refreshTimer);
  // }, [battleState, refreshPlayerState]);

  // 读条制战斗逻辑：降低状态提交频率，按真实时间差推进，长时间挂机更省 CPU
  useEffect(() => {
    if (!battleState || !battleState.isActive || battleState.isPlayerDead) return;
    if (!playerState) return;
    if (battleState.playerHp <= 0 || battleState.enemyHp <= 0) return;

    const playerLevel = playerState.combatLevel || 1;
    const gear = calculateEquipmentBonus();
    const playerAtk = 5 + (playerLevel - 1) * 1 + gear.atk;
    const playerDef = gear.def;
    const enemyAtk = battleState.monster.atk || (12 + (battleState.monster.level - 1) * 4);
    const enemyDef = battleState.monster.def || (8 + (battleState.monster.level - 1) * 3);

    const intervalMs = 100;
    let lastTick = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const deltaTime = Math.min(now - lastTick, 500);
      lastTick = now;

      setBattleState(prev => {
        if (!prev || !prev.isActive || prev.playerHp <= 0 || prev.enemyHp <= 0 || prev.isPlayerDead) {
          return prev;
        }

        const nextPlayerCastTime = Math.min(prev.playerCastTime + deltaTime, prev.playerCastDuration);
        const nextEnemyCastTime = Math.min(prev.enemyCastTime + deltaTime, prev.enemyCastDuration);
        const playerReady = nextPlayerCastTime >= prev.playerCastDuration && prev.playerCastTime < prev.playerCastDuration;
        const enemyReady = nextEnemyCastTime >= prev.enemyCastDuration && prev.enemyCastTime < prev.enemyCastDuration;

        if (!playerReady && !enemyReady) {
          return {
            ...prev,
            playerCastTime: nextPlayerCastTime,
            enemyCastTime: nextEnemyCastTime,
          };
        }

        const newState = {
          ...prev,
          playerCastTime: nextPlayerCastTime,
          enemyCastTime: nextEnemyCastTime,
        };

        // 玩家攻击
        if (playerReady) {
          const baseDamage = Math.max(1, playerAtk - Math.floor(enemyDef / 2));
          const calculatedDamage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4));
          const actualDamage = Math.min(calculatedDamage, prev.enemyHp); // 实际造成的伤害不能超过剩余HP
          const isCrit = Math.random() < 0.15; // 15% 暴击几率
          const finalDamage = isCrit ? Math.floor(actualDamage * 1.5) : actualDamage;
          newState.enemyHp = Math.max(0, prev.enemyHp - finalDamage);
          newState.battleLog = [...prev.battleLog.slice(-4), `${playerName} 攻击 ${prev.monster.name}，造成 ${finalDamage} 点伤害${isCrit ? '（暴击！）' : ''}！`];
          
          // 触发伤害飘字和震动
          const floatId = Date.now() + Math.random();
          setDamageFloats(f => [...f, { id: floatId, target: 'enemy', damage: finalDamage, isCrit }]);
          setHitShake(s => ({ ...s, enemy: true }));
          playCombatHit(isCrit);
          setTimeout(() => {
            setDamageFloats(f => f.filter(d => d.id !== floatId));
            setHitShake(s => ({ ...s, enemy: false }));
          }, 800);
          
          newState.playerCastTime = 0;
          
          if (newState.enemyHp <= 0) {
            newState.battleLog = [...newState.battleLog, `${prev.monster.name} 被击败了！等待奖励结算..`];
            newState.isActive = false;
            // 触发胜利特效
            setShowVictoryFx(true);
            playCombatWin();
            setTimeout(() => setShowVictoryFx(false), 2500);
            
            const actionDuration = Math.max(5000, prev.monster.level * 1000);
            
            setTimeout(async () => {
              try {
                await refreshPlayerState();
                
                setTimeout(async () => {
                  await refreshPlayerState();
                  setForceUpdate(prev => prev + 1);
                  
                  setRewardNotification({
                    show: true,
                    xp: prev.monster.xp,
                    gold: prev.monster.gold,
                    key: Date.now()
                  });
                  
                  setBattleState(current => {
                    if (!current) return null;
                    return {
                      ...current,
                      battleLog: [...current.battleLog.slice(0, -1), 
                        `${prev.monster.name} 被击败了！获得 ${prev.monster.xp} 经验和 ${prev.monster.gold} 金币！`]
                    };
                  });
                  
                  setTimeout(() => {
                    setRewardNotification(prev => ({ ...prev, show: false }));
                  }, 3000);
                }, 500);
                
              } catch (error) {
                logger.error('刷新状态失败', error);
              }
            }, actionDuration);
          }
        }

        // 敌人攻击 - 使用newState.battleLog而不是prev.battleLog
        if (newState.enemyCastTime >= newState.enemyCastDuration && prev.enemyCastTime < prev.enemyCastDuration) {
          const baseDamage = Math.max(1, enemyAtk - Math.floor(playerDef / 2));
          const calculatedDamage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4));
          const actualDamage = Math.min(calculatedDamage, prev.playerHp); // 实际造成的伤害不能超过剩余HP
          newState.playerHp = Math.max(0, prev.playerHp - actualDamage);
          newState.battleLog = [...newState.battleLog.slice(-4), `${prev.monster.name} 攻击 ${playerName}，造成 ${actualDamage} 点伤害！`];
          
          // 触发伤害飘字和震动
          const floatId2 = Date.now() + Math.random();
          setDamageFloats(f => [...f, { id: floatId2, target: 'player', damage: actualDamage, isCrit: false }]);
          setHitShake(s => ({ ...s, player: true }));
          setTimeout(() => {
            setDamageFloats(f => f.filter(d => d.id !== floatId2));
            setHitShake(s => ({ ...s, player: false }));
          }, 800);
          
          newState.enemyCastTime = 0;
          
          if (newState.playerHp <= 0) {
            newState.battleLog = [...newState.battleLog, `${playerName} 被击败了...将在60秒后复活`];
            newState.isActive = false;
            newState.isPlayerDead = true;
            newState.reviveCountdown = 60;
          }
        }

        return newState;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [battleState?.isActive, battleState?.isPlayerDead, battleState?.playerHp, battleState?.enemyHp, playerState?.combatLevel, playerState?.equipment]);

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

  // 根据当前职业动态生成标签（移除角色和背包，它们现在在右侧边栏）
  const tabs = [
    { id: getCurrentProfession().gatherTab, name: getCurrentProfession().gatherName },
    { id: getCurrentProfession().craftTab, name: getCurrentProfession().craftName },
    { id: 'adventure' as const, name: '冒险' },
    { id: 'enhance' as const, name: '强化' },
    { id: 'skills' as const, name: '技能' },
    { id: 'trading' as const, name: '交易' },
    { id: 'party' as const, name: '组队' },
  ].map((tab) => ({ ...tab, icon: tab.name.charAt(0) }))

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
    
    return itemInfoMap[itemId] || { name: itemId, tier: 0, type: 'unknown', description: '未知物品' };
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
    
    return nameToIdMap[itemName] || itemName;
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
        battleActive={!!battleState?.isActive}
        battleMonsterName={battleState?.monster?.name}
        cycleCompleteFlash={cycleCompleteFlash}
        activeTab={activeTab}
        progress={progress}
        onStopActivity={async () => {
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
        }}
        onStopBattle={stopBattle}
        rewardNotification={rewardNotification}
        onOpenProg={(id) => setProgPanel(id)}
        claimableCount={claimableCount}
        checkInAvailable={checkInAvailable}
        gold={playerState.inventory.gold || 0}
      />

      {/* 主内容区域 */}
      <div className="game-main-layout">
        <GameActionNav
          tabs={tabs}
          activeTab={activeTab}
          onSelect={(id) => setActiveTab(id as ActiveTab)}
        />

        <GameChatPanel
          expanded={isChatExpanded}
          onToggle={() => setIsChatExpanded(!isChatExpanded)}
          channel={chatChannel}
          onSwitchChannel={switchChannel}
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
          <div className="adventure-layout">
            <div className="page-header">
              <h2 className="section-title">冒险</h2>
              {!playerState.equipment?.main_hand && (
                <div className="page-info">
                  <p>
                    还没装备武器。去木工做一把短剑，再点右侧装备栏穿上。
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
              {!!playerState.equipment?.main_hand && !playerState.equipment?.chest && (
                <div className="page-info">
                  <p>
                    {playerState.skills?.skill_woodcutter?.unlockedRecipes?.includes('woodcutter_armor_crafting')
                      ? '武器有了，上衣还空着。去木工做木制胸甲，再点右侧穿上。'
                      : '武器有了。先在技能树解锁「木制装备制作」，再去做胸甲。'}
                    <button
                      type="button"
                      className="header-menu-btn"
                      style={{ marginLeft: 8 }}
                      onClick={() => {
                        setCurrentProfession('woodcutter');
                        void apiClient.setActiveClass('woodcutter').catch(() => undefined);
                        if (playerState.skills?.skill_woodcutter?.unlockedRecipes?.includes('woodcutter_armor_crafting')) {
                          setActiveTab('woodworking');
                          setCraftCategory('equipment');
                          setIsRightPanelExpanded(true);
                        } else {
                          setActiveTab('skills');
                        }
                      }}
                    >
                      {playerState.skills?.skill_woodcutter?.unlockedRecipes?.includes('woodcutter_armor_crafting')
                        ? '去做护甲'
                        : '去解锁'}
                    </button>
                  </p>
                </div>
              )}
            </div>

            {/* 战斗状态时显示战斗界面 */}
            {battleState ? (
              <div className="battle-full-screen">
                <div className="battle-status-panel-center">
                  <div className="battle-header">
                    <div className="battle-title-section">
                      <h3>战斗</h3>
                      <div className="battle-stats-compact">
                        <span className="battle-count">第{battleState.battleCount}场</span>
                        <span className="battle-separator">|</span>
                        <span className="battle-earnings">
                          累计: ⭐{battleState.monster.xp * (battleState.battleCount - 1)} 
                          💰{battleState.monster.gold * (battleState.battleCount - 1)}
                        </span>
                      </div>
                    </div>
                    <button className="btn-back" onClick={stopBattle}>
                      ← 返回
                    </button>
                  </div>
                  
                  {/* 胜率预测 */}
                  {battleState.battleCount === 1 && (
                    <div className="win-rate-prediction" style={{ 
                      borderColor: getWinRateColor(calculateWinRate(playerState.combatLevel || 1, battleState.monster.level))
                    }}>
                      <div className="prediction-label">胜率预测</div>
                      <div className="prediction-value" style={{ 
                        color: getWinRateColor(calculateWinRate(playerState.combatLevel || 1, battleState.monster.level))
                      }}>
                        {calculateWinRate(playerState.combatLevel || 1, battleState.monster.level)}%
                      </div>
                      <div className="prediction-text" style={{ 
                        color: getWinRateColor(calculateWinRate(playerState.combatLevel || 1, battleState.monster.level))
                      }}>
                        {getWinRateText(calculateWinRate(playerState.combatLevel || 1, battleState.monster.level))}
                      </div>
                    </div>
                  )}
                  
                  <div className="battle-display-center">
                    {/* 胜利特效覆盖层 */}
                    {showVictoryFx && (
                      <div className="victory-fx-overlay">
                        <div className="victory-particles">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <span key={i} className="particle" style={{
                              left: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 0.5}s`,
                              animationDuration: `${1 + Math.random() * 1.5}s`
                            }}>✨</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={`battle-entity player-entity${hitShake.player ? ' entity-hit' : ''}`}>
                      <div className="entity-name">{playerName}</div>
                      <div className="entity-level">Lv.{playerState.combatLevel || 1}</div>
                      <div className={`entity-avatar${hitShake.player ? ' avatar-shake' : ''}`}>👤</div>
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
                      {/* 玩家读条 */}
                      <div className={`cast-bar${battleState.playerCastTime / battleState.playerCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                        <div className="cast-container">
                          <div 
                            className="cast-fill player-cast" 
                            style={{ width: `${Math.max(0, (battleState.playerCastTime / battleState.playerCastDuration) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="cast-time">{(battleState.playerCastTime / 1000).toFixed(1)}s / {(battleState.playerCastDuration / 1000).toFixed(1)}s</div>
                      </div>
                    </div>

                    <div className="battle-vs-center">
                      <div className={`vs-text${showVictoryFx ? ' vs-victory' : ''}`}>VS</div>
                      <div className="turn-indicator">
                        {!battleState.isActive && battleState.enemyHp <= 0 ? '🎉 胜利!' :
                         !battleState.isActive && battleState.playerHp <= 0 ? '💀 失败' :
                         '⚔️ 战斗中'}
                      </div>
                    </div>

                    <div className={`battle-entity enemy-entity${hitShake.enemy ? ' entity-hit' : ''}`}>
                      <div className="entity-name">{battleState.monster.name}</div>
                      <div className="entity-level">Lv.{battleState.monster.level}</div>
                      <div className={`entity-avatar${hitShake.enemy ? ' avatar-shake' : ''}`}>{battleState.monster.icon || '🐾'}</div>
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
                      {/* 敌人读条 */}
                      <div className={`cast-bar${battleState.enemyCastTime / battleState.enemyCastDuration > 0.8 ? ' cast-nearly-ready' : ''}`}>
                        <div className="cast-container">
                          <div 
                            className="cast-fill enemy-cast" 
                            style={{ width: `${Math.max(0, (battleState.enemyCastTime / battleState.enemyCastDuration) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="cast-time">{(battleState.enemyCastTime / 1000).toFixed(1)}s / {(battleState.enemyCastDuration / 1000).toFixed(1)}s</div>
                      </div>
                    </div>
                  </div>

                  <div className="battle-controls-center">
                    {!battleState.isActive && battleState.enemyHp <= 0 && battleState.playerHp > 0 && !battleState.isPlayerDead && (
                      <div className="auto-continue-info">
                        <div className="victory-text">战斗胜利</div>
                        <div className="victory-rewards">
                          <span className="reward-item">+{battleState.monster.xp} 经验</span>
                          <span className="reward-item">+{battleState.monster.gold} 金币</span>
                        </div>
                        <div className="auto-text">
                          {battleState.battleLog[battleState.battleLog.length - 1]?.includes('等待奖励结算') ? 
                            '正在结算奖励...' : 
                            `${Math.round((contentPack?.actions?.find((a: any) => a.id === `act_combat_${battleState.monster.id}`)?.duration ?? 5000) / 1000)}秒后自动开始第${battleState.battleCount + 1}场战斗...`
                          }
                        </div>
                        <button className="btn-stop-large" onClick={stopBattle}>
                          停止战斗
                        </button>
                      </div>
                    )}
                    {battleState.isPlayerDead && (
                      <div className="revive-info">
                        <div className="death-text">💀 {playerName} 阵亡</div>
                        <div className="revive-countdown">
                          {battleState.reviveCountdown > 0 ? (
                            <>
                              <div className="countdown-text">复活倒计时: {battleState.reviveCountdown} 秒</div>
                              <div className="countdown-hint">怪物状态保持不变，复活后满血满蓝继续战斗</div>
                            </>
                          ) : (
                            <div className="reviving-text">正在复活...</div>
                          )}
                        </div>
                        <button className="btn-stop-large" onClick={stopBattle}>
                          放弃战斗
                        </button>
                      </div>
                    )}
                    {!battleState.isActive && battleState.playerHp <= 0 && !battleState.isPlayerDead && (
                      <button className="btn-stop-large" onClick={stopBattle}>
                        结束战斗
                      </button>
                    )}
                    {battleState.isActive && !battleState.isPlayerDead && (
                      <div className="battle-progress">
                        <div className="progress-text">自动战斗进行中...</div>
                        <button className="btn-stop-small" onClick={stopBattle}>
                          停止战斗
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="battle-log-center">
                    <h4>📜 战斗记录</h4>
                    <div className="log-content">
                      {battleState.battleLog.map((log, index) => (
                        <div key={`${battleState.battleCount}-${index}`} className="log-entry">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 非战斗状态显示怪物选择 */
              <div className="adventure-content">
                <div className="map-sidebar">
                  <h3>区域</h3>
                  {maps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMap(map.id)}
                      className={`map-btn ${selectedMap === map.id ? 'active' : ''}`}
                    >
                      {map.name}
                    </button>
                  ))}
                </div>
                
                <div className="monster-grid">
          {(monstersByMap[selectedMap] || []).map((monster) => {
                    return (
                      <div
                        key={monster.id}
                        className={`monster-card ${isCurrentlyFighting(monster.id) ? 'active' : ''} ${monster.isBoss ? 'boss' : ''}`}
                        onClick={() => { 
                          setSelectedItem(monster); 
                          setModalType('monster'); 
                        }}
                      >
                        <div className="card-title">{monster.name}</div>
                        <div className="card-image">
                          <div className="placeholder-img monster-placeholder">
                            <CardArt kind="monster" id={monster.id} fallback={monster.icon || '🐾'} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 角色页面 */}
        {/* 伐木页面 */}
        {activeTab === 'logging' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">伐木</h2>
              <div className="page-info">
                <p>砍伐各种树木，收集木材资源</p>
              </div>
            </div>
            <div className="tree-grid">
              {trees.map((tree) => (
                <div
                  key={tree.id}
                  className={`tree-card ${isCurrentlyGathering(tree.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(tree); setModalType('tree'); }}
                >
                  <div className="card-title">{tree.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">
                      <CardArt kind="tree" id={tree.id} fallback={tree.icon || '🌳'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 伐木厂 - 木工页面 */}
        {activeTab === 'woodworking' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">木工</h2>
              <div className="page-info">
                <p>加工原木成木板，制作木质武器、装备和工具</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'materials' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('materials')}
                >
                  材料
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'weapons' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('weapons')}
                >
                  武器
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'equipment' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('equipment')}
                >
                  装备
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">
                        <CardArt kind="craft" id={item.id} fallback="🔨" />
                      </div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
              {!contentPackLoading && !showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).length === 0 && (
                <div className="no-favorites">
                  <p>暂无可用配方</p>
                  <p className="hint-text">内容包加载失败，或当前职业没有该分类配方</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 铁匠 - 挖矿页面 */}
        {activeTab === 'mining' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">挖矿</h2>
              <div className="page-info">
                <p>挖掘各种矿石，收集珍贵的矿物资源</p>
              </div>
            </div>
            <div className="tree-grid">
              {ores.map((ore) => (
                <div
                  key={ore.id}
                  className={`tree-card ${isCurrentlyGathering(ore.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(ore); setModalType('tree'); }}
                >
                  <div className="card-title">{ore.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">
                      <CardArt kind="tree" id={ore.id} fallback="⛏️" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 铁匠 - 锻造页面 */}
        {activeTab === 'smithing' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">锻造</h2>
              <div className="page-info">
                <p>精炼矿石成金属锭，打造战士装备、工具和武器</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'materials' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('materials')}
                >
                  材料
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'weapons' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('weapons')}
                >
                  武器
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'equipment' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('equipment')}
                >
                  装备
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">⚒️</div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 农夫 - 畜牧页面 */}
        {activeTab === 'husbandry' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">畜牧</h2>
              <div className="page-info">
                <p>饲养动物，获取羊毛、肉类、牛奶和鸡蛋</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'materials' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('materials')}
                >
                  材料
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'food' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('food')}
                >
                  🍖 食物
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">🐑</div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 厨师 - 烹饪页面 */}
        {activeTab === 'cooking' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">烹饪</h2>
              <div className="page-info">
                <p>烹饪美味的食物和饮料，提供战斗增益和工作效率</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'food' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('food')}
                >
                  🍖 食物
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'drinks' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('drinks')}
                >
                  🍹 饮料
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">🍳</div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 裁缝 - 缝纫页面 */}
        {activeTab === 'tailoring' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">缝纫</h2>
              <div className="page-info">
                <p>加工羊毛成毛线，制作职业装备和战斗装备</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'materials' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('materials')}
                >
                  材料
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'equipment' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('equipment')}
                >
                  装备
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">🧵</div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 炼金术师 - 炼金页面 */}
        {activeTab === 'alchemy' && (
          <div className="crafting-layout">
            <div className="page-header">
              <h2 className="section-title">炼金</h2>
              <div className="page-info">
                <p>制作生命和魔力药水，打造魔法法杖</p>
              </div>
            </div>
            
            <div className="craft-header-controls">
              <div className="craft-categories">
                <button 
                  className={`category-btn ${craftCategory === 'potions' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('potions')}
                >
                  🧪 药水
                </button>
                <button 
                  className={`category-btn ${craftCategory === 'materials' ? 'active' : ''}`}
                  onClick={() => setCraftCategory('materials')}
                >
                  材料
                </button>
              </div>
              
              <button 
                className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                title={showFavoritesOnly ? '显示全部' : '只看收藏'}
              >
                {showFavoritesOnly ? '★收藏' : '☆收藏'}
              </button>
            </div>
            
            <div className="craft-grid">
              {contentPackLoading ? (
                <div className="loading-message">加载中...</div>
              ) : (
                getCraftRecipesFromContentPack(craftCategory)
                  .filter((item: any) => !showFavoritesOnly || favoriteRecipes.has(item.id))
                  .map((item: any) => (
                  <div
                    key={item.id}
                    className={`craft-card ${favoriteRecipes.has(item.id) ? 'favorited' : ''}`}
                    onClick={() => { setSelectedItem(item); setModalType('craft'); setCraftQuantity(1); }}
                  >
                    {favoriteRecipes.has(item.id) && (
                      <div className="favorite-badge">★</div>
                    )}
                    <div className="card-title">{item.name}</div>
                    <div className="card-image">
                      <div className="placeholder-img craft-placeholder">🧪</div>
                    </div>
                    <div className="card-level">Lv.{item.level}</div>
                  </div>
                ))
              )}
              {!contentPackLoading && showFavoritesOnly && getCraftRecipesFromContentPack(craftCategory).filter((item: any) => favoriteRecipes.has(item.id)).length === 0 && (
                <div className="no-favorites">
                  <div className="empty-icon">☆</div>
                  <p>还没有收藏的配方</p>
                  <p className="hint-text">点击配方详情中的星星收藏</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 农夫 - 种植页面 */}
        {activeTab === 'farming' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">种植</h2>
              <div className="page-info">
                <p>种植棉花和水果，收获丰富的农产品</p>
              </div>
            </div>
            <div className="tree-grid">
              {crops.map((crop) => (
                <div
                  key={crop.id}
                  className={`tree-card ${isCurrentlyGathering(crop.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(crop); setModalType('tree'); }}
                >
                  <div className="card-title">{crop.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">🌱</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 厨师 - 钓鱼页面 */}
        {activeTab === 'fishing' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">钓鱼</h2>
              <div className="page-info">
                <p>钓取各种鱼类和虾类，获取新鲜食材</p>
              </div>
            </div>
            <div className="tree-grid">
              {fishingSpots.map((spot) => (
                <div
                  key={spot.id}
                  className={`tree-card ${isCurrentlyGathering(spot.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(spot); setModalType('tree'); }}
                >
                  <div className="card-title">{spot.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">🎣</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 裁缝 - 采集页面 */}
        {activeTab === 'gathering' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">采集</h2>
              <div className="page-info">
                <p>采集棉花和羊毛，收集纺织原料</p>
              </div>
            </div>
            <div className="tree-grid">
              {fiberSpots.map((spot) => (
                <div
                  key={spot.id}
                  className={`tree-card ${isCurrentlyGathering(spot.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(spot); setModalType('tree'); }}
                >
                  <div className="card-title">{spot.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">🧺</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 炼金术师 - 水晶页面 */}
        {activeTab === 'crystal_mining' && (
          <div className="logging-layout">
            <div className="page-header">
              <h2 className="section-title">水晶采集</h2>
              <div className="page-info">
                <p>采集和分解水晶，获取魔法材料</p>
              </div>
            </div>
            <div className="tree-grid">
              {crystalSpots.map((spot) => (
                <div
                  key={spot.id}
                  className={`tree-card ${isCurrentlyGathering(spot.id) ? 'active' : ''}`}
                  onClick={() => { setSelectedItem(spot); setModalType('tree'); }}
                >
                  <div className="card-title">{spot.name}</div>
                  <div className="card-image">
                    <div className="placeholder-img tree-placeholder">💎</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 背包页面 */}
        {/* 装备强化页面 */}
        {activeTab === 'enhance' && (
          <EnhancementPanel 
            playerState={playerState} 
            onRefresh={refreshPlayerState}
          />
        )}

        {activeTab === 'party' && <PartyPanel />}

        {/* 技能树页面 */}
        {activeTab === 'skills' && (
          <SkillTreePanel 
            playerState={playerState} 
            onRefresh={refreshPlayerState}
            currentProfession={currentProfession}
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
                  <h2 className="section-title">交易所</h2>
                  <div className="page-info">
                    <p>选择物品查看交易详情</p>
                  </div>
                </div>
                
                {/* 物品分类 */}
                <div className="trading-categories">
                  {/* 材料分类 */}
                  <div className="category-section">
                    <h3 className="category-title">材料</h3>
                    <div className="trading-item-grid">
                      {allItems.materials && allItems.materials.length > 0 ? (
                        allItems.materials.map((item: any) => (
                          <div 
                            key={item.id}
                            className="trading-item-card"
                            onClick={() => setSelectedTradingItem(item.id)}
                          >
                            <div className="trading-item-icon">{getItemIcon(item.id)}</div>
                            <div className="trading-item-name">{item.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="trading-empty-hint">
                          <div className="empty-icon">📦</div>
                          <div className="empty-text">暂无材料</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 武器分类 */}
                  <div className="category-section">
                    <h3 className="category-title">武器</h3>
                    <div className="trading-item-grid">
                      {allItems.weapons && allItems.weapons.length > 0 ? (
                        allItems.weapons.map((item: any) => (
                          <div 
                            key={item.id}
                            className="trading-item-card"
                            onClick={() => setSelectedTradingItem(item.id)}
                          >
                            <div className="trading-item-icon">{getItemIcon(item.id)}</div>
                            <div className="trading-item-name">{item.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="trading-empty-hint">
                          <div className="empty-icon">⚔️</div>
                          <div className="empty-text">暂无武器</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 装备分类 */}
                  <div className="category-section">
                    <h3 className="category-title">装备</h3>
                    <div className="trading-item-grid">
                      {allItems.armor && allItems.armor.length > 0 ? (
                        allItems.armor.map((item: any) => (
                          <div 
                            key={item.id}
                            className="trading-item-card"
                            onClick={() => setSelectedTradingItem(item.id)}
                          >
                            <div className="trading-item-icon">{getItemIcon(item.id)}</div>
                            <div className="trading-item-name">{item.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="trading-empty-hint">
                          <div className="empty-icon">🛡️</div>
                          <div className="empty-text">暂无装备</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 消耗品分类 */}
                  <div className="category-section">
                    <h3 className="category-title">消耗品</h3>
                    <div className="trading-item-grid">
                      {allItems.consumables && allItems.consumables.length > 0 ? (
                        allItems.consumables.map((item: any) => (
                          <div 
                            key={item.id}
                            className="trading-item-card"
                            onClick={() => setSelectedTradingItem(item.id)}
                          >
                            <div className="trading-item-icon">{getItemIcon(item.id)}</div>
                            <div className="trading-item-name">{item.name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="trading-empty-hint">
                          <div className="empty-icon">🍖</div>
                          <div className="empty-text">暂无消耗品</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                    <span className="detail-icon">{getItemIcon(selectedTradingItem)}</span>
                    <span className="detail-name">{getItemInfo(selectedTradingItem).name}</span>
                    <span className="detail-tier">{getTierName(getItemInfo(selectedTradingItem).tier)}</span>
                  </div>
                  <div className="trading-detail-actions">
                    <button 
                      className="btn-create-order sell"
                      onClick={() => { setOrderType('sell'); setShowSellModal(true); }}
                    >
                      📤 挂出售单
                    </button>
                    <button 
                      className="btn-create-order buy"
                      onClick={() => { setOrderType('buy'); setShowSellModal(true); }}
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
                              <span className="order-quantity">x{order.quantity}</span>
                              <span className="order-price">{order.price} 💰</span>
                            </div>
                          ))}
                          {tradingOrders.filter(order => order.type === 'sell').length === 0 && (
                            <div className="orders-empty">
                              <div className="empty-text">暂无出售单</div>
                            </div>
                          )}
                          {tradingOrders.filter(order => order.type === 'sell').length > 0 && (
                            <button 
                              className="btn-quick-buy"
                              onClick={() => {
                                const sellOrders = tradingOrders.filter(order => order.type === 'sell').sort((a, b) => a.price - b.price);
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
                              <span className="order-quantity">x{order.quantity}</span>
                              <span className="order-price">{order.price} 💰</span>
                            </div>
                          ))}
                          {tradingOrders.filter(order => order.type === 'buy').length === 0 && (
                            <div className="orders-empty">
                              <div className="empty-text">暂无收购单</div>
                            </div>
                          )}
                          {tradingOrders.filter(order => order.type === 'buy').length > 0 && (
                            <button 
                              className="btn-quick-sell"
                              onClick={() => {
                                const buyOrders = tradingOrders.filter(order => order.type === 'buy').sort((a, b) => b.price - a.price);
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
              </>
            )}
          </div>
        )}
      </main>
      
      <PlayerRightPanel
        expanded={isRightPanelExpanded}
        onToggle={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
        playerName={playerName}
        onOpenProfessionModal={() => setShowProfessionModal(true)}
        profession={getCurrentProfession()}
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
        equipmentBonus={calculateEquipmentBonus()}
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
                <div className="equippable-items-grid">
                  {getEquippableItems(selectedEquipSlot).map((item: any) => (
                    <div 
                      key={item.id}
                      className="equippable-item"
                      onClick={() => equipItem(item.id)}
                    >
                      <div className="item-icon-large">{getItemIcon(item.id)}</div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-stats">
                        {item.atk && <span>⚔️ +{item.atk}</span>}
                        {item.def && <span>🛡️ +{item.def}</span>}
                      </div>
                    </div>
                  ))}
                </div>
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
            {modalType === 'monster' && (
              <>
                <h3 className="modal-title">{selectedItem.name}</h3>
                <div className="modal-image">
                  <div className="placeholder-img monster-placeholder large">
                    <CardArt kind="monster" id={selectedItem.id} fallback={selectedItem.icon || '🐾'} />
                  </div>
                </div>
                <p className="modal-desc">{selectedItem.desc}</p>
                
                <div className="modal-stats">
                  <div className="stat-line"><span>经验奖励</span><span>{selectedItem.xp} XP</span></div>
                  <div className="stat-line"><span>金币奖励</span><span>{selectedItem.gold} 金币</span></div>
                  {selectedItem.rare && selectedItem.rareChance > 0 && (
                    <div className="stat-line">
                      <span>稀有掉落</span>
                      <span>{selectedItem.rare} ({(selectedItem.rareChance * 100).toFixed(2)}%)</span>
                    </div>
                  )}
                </div>
                
                <button 
                  className="btn-action"
                  onClick={() => startBattle(selectedItem)}
                  disabled={actionLoading}
                >
                  {actionLoading ? '准备中...' : selectedItem.isBoss ? '挑战BOSS' : '开始战斗'}
                </button>
              </>
            )}
            {modalType === 'tree' && (
              <>
                <h3 className="modal-title">{selectedItem.name}</h3>
                <div className="modal-image">
                  <div className="placeholder-img tree-placeholder large">
                    <CardArt kind="tree" id={selectedItem.id} fallback={selectedItem.icon || '🌳'} />
                  </div>
                </div>
                <p className="modal-desc">{selectedItem.desc}</p>
                <div className="modal-stats">
                  <div className="stat-line"><span>需求</span><span>lv{selectedItem.level}{getCurrentProfession().name}</span></div>
                  <div className="stat-line"><span>产出</span><span>{selectedItem.xp} <span className="tag">XP</span></span></div>
                  <div className="stat-line"><span></span><span>{selectedItem.outputRange} <span className="tag">{getItemNameById(selectedItem.output)}</span></span></div>
                  {selectedItem.rare && selectedItem.rareChance > 0 && (
                    <div className="stat-line"><span>稀有</span><span>1 <span className="tag">{getItemNameById(selectedItem.rare)}</span> {(selectedItem.rareChance * 100).toFixed(2)}%</span></div>
                  )}
                  <div className="stat-line"><span>时间</span><span>{selectedItem.time} 秒</span></div>
                </div>
                {(() => {
                  const currentSkillLevel = playerState.skills[`skill_${currentProfession}`].level || 1;
                  const hasLevel = currentSkillLevel >= selectedItem.level;
                  
                  return (
                    <button 
                      className={`btn-action ${hasLevel ? '' : 'disabled'}`}
                      onClick={() => {
                        if (hasLevel) {
                          startAction(selectedItem.actionId, {
                            name: selectedItem.name || '采集',
                            output: selectedItem.output,
                            duration: selectedItem.time,
                            mark: activityMarkFromAction(selectedItem.actionId || 'chop'),
                          });
                        }
                      }}
                      disabled={actionLoading || !hasLevel}
                    >
                      {actionLoading ? '开始中...' : 
                       !hasLevel ? `需要等级${selectedItem.level}` : 
                       '开始采集'}
                    </button>
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
                    <CardArt kind="craft" id={selectedItem.id} fallback="🔨" />
                  </div>
                </div>
                <p className="modal-desc">{selectedItem.desc}</p>
                
                {/* 批量制作数量选择 */}
                <div className="craft-quantity-section">
                  <div className="quantity-header">
                    <span className="quantity-label">制作数量:</span>
                    <span className="quantity-max">
                      最多可制作 {getMaxCraftableQuantity(selectedItem)} 个
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
                        const val = parseInt(e.target.value) || 1
                        setCraftQuantity(Math.max(1, Math.min(getMaxCraftableQuantity(selectedItem), val)))
                      }}
                      min="1"
                      max={getMaxCraftableQuantity(selectedItem)}
                    />
                    <button 
                      className="btn-quantity"
                      onClick={() => setCraftQuantity(Math.min(getMaxCraftableQuantity(selectedItem), craftQuantity + 1))}
                      disabled={craftQuantity >= getMaxCraftableQuantity(selectedItem)}
                    >
                      +
                    </button>
                    <button 
                      className="btn-quantity-max"
                      onClick={() => setCraftQuantity(getMaxCraftableQuantity(selectedItem))}
                      disabled={craftQuantity >= getMaxCraftableQuantity(selectedItem)}
                    >
                      最大
                    </button>
                  </div>
                </div>
                
                <div className="modal-stats">
                  <div className="stat-line">
                    <span>技能需求</span>
                    <span className={`skill-requirement ${(playerState.skills[`skill_${currentProfession}`].level || 1) >= selectedItem.level ? 'satisfied' : 'missing'}`}>
                      Lv.{selectedItem.level} {getCurrentProfession().name} 
                      {(playerState.skills[`skill_${currentProfession}`].level || 1) >= selectedItem.level ? ' ✓' : ' ✗'}
                    </span>
                  </div>
                  
                  <div className="materials-section">
                    <div className="section-title">材料需求(×{craftQuantity}):</div>
                    {selectedItem.requires.map((req: any, i: number) => {
                      const requiredItemId = getRequiredItemId(req.item);
                      const available = playerState.inventory[requiredItemId] || 0;
                      const needed = req.count * craftQuantity;
                      const hasEnough = available >= needed;
                      return (
                        <div key={i} className={`stat-line material-req ${hasEnough ? 'satisfied' : 'missing'}`}>
                          <span className="material-info">
                            <span className="material-icon">{getItemIcon(requiredItemId)}</span>
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
                    <div className="section-title">制作奖励 (×{craftQuantity}):</div>
                    <div className="stat-line"><span>经验</span><span>{selectedItem.xp * craftQuantity} <span className="tag">XP</span></span></div>
                    <div className="stat-line"><span>产出</span><span>{craftQuantity} <span className="tag">{getItemNameById(selectedItem.output)}</span></span></div>
                    {selectedItem.stats && (
                      <div className="stat-line">
                        <span>属性</span>
                        <span>
                          {selectedItem.stats.atk && `攻击+${selectedItem.stats.atk} `}
                          {selectedItem.stats.mag && `魔力+${selectedItem.stats.mag} `}
                          {selectedItem.stats.def && `防御+${selectedItem.stats.def} `}
                          {selectedItem.stats.hp && `生命+${selectedItem.stats.hp} `}
                          {selectedItem.stats.spd && `速度+${selectedItem.stats.spd}%`}
                        </span>
                      </div>
                    )}
                    {selectedItem.rare && (
                      <div className="stat-line"><span>稀有奖励</span><span>随机 <span className="tag">{getItemNameById(selectedItem.rare)}</span></span></div>
                    )}
                    <div className="stat-line"><span>总耗时</span><span>{selectedItem.time * craftQuantity} 秒</span></div>
                  </div>
                </div>
                
                {(() => {
                  const hasLevel = (playerState.skills[`skill_${currentProfession}`].level || 1) >= selectedItem.level;
                  const hasMaterials = selectedItem.requires.every((req: any) => {
                    const requiredItemId = getRequiredItemId(req.item);
                    return (playerState.inventory[requiredItemId] || 0) >= (req.count * craftQuantity);
                  });
                  const canCraft = hasLevel && hasMaterials && craftQuantity > 0;
                  
                  return (
                    <div className="craft-actions">
                      <button 
                        className={`btn-action ${canCraft ? 'craftable' : 'disabled'}`}
                        onClick={() => {
                          if (canCraft) {
                            // selectedItem.id 已是完整配方 ID（如 act_craft_lumber_t1），不要再加前缀
                            startAction(selectedItem.id, {
                              name: selectedItem.name || `制作 ×${craftQuantity}`,
                              output: selectedItem.output,
                              duration: selectedItem.time * craftQuantity,
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
                      
                      {!canCraft && (
                        <div className="craft-hint">
                          {!hasLevel && <p>🎯 提升{getCurrentProfession().name}等级到{selectedItem.level} 级</p>}
                          {hasLevel && !hasMaterials && <p>📦 收集所需材料后即可制作</p>}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {modalType === 'item' && (
              <>
                <h3 className="modal-title">{selectedItem.name}</h3>
                <div className="modal-image">
                  <div className="item-icon-large">{getItemIcon(selectedItem.id)}</div>
                </div>
                <p className="modal-desc">{selectedItem.description || '暂无描述'}</p>
                <div className="modal-stats">
                  <div className="stat-line"><span>类型</span><span>{selectedItem.type === 'material' ? '材料' : selectedItem.type === 'weapon' ? '武器' : selectedItem.type === 'consumable' ? '消耗品' : '其他'}</span></div>
                  <div className="stat-line"><span>品质</span><span>{getTierName(selectedItem.tier)}</span></div>
                  <div className="stat-line"><span>数量</span><span>{selectedItem.count}</span></div>
                  {selectedItem.type === 'weapon' && (
                    <div className="stat-line"><span>攻击力</span><span>+{selectedItem.atk || 0}</span></div>
                  )}
                  {selectedItem.type === 'consumable' && (
                    <div className="stat-line"><span>效果</span><span>恢复生命值</span></div>
                  )}
                </div>
                <div className="modal-actions">
                  {selectedItem.type === 'consumable' && (
                    <button className="btn-action" disabled>
                      使用物品 (开发中)
                    </button>
                  )}
                  {selectedItem.type === 'weapon' && (
                    <button className="btn-action" disabled>
                      装备武器 (开发中)
                    </button>
                  )}
                  <button 
                    className="btn-secondary" 
                    onClick={() => { setSelectedItem(null); setModalType(null); }}
                  >
                    关闭
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* 上架物品弹窗 */}
      {showSellModal && (
        <div className="modal-overlay" onClick={() => { setShowSellModal(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                      className="btn-max"
                      onClick={() => {
                        const maxQty = playerState.inventory[selectedTradingItem] || 0;
                        setSellQuantity(maxQty);
                      }}
                    >
                      最大
                    </button>
                  )}
                </div>
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
                      <span className="summary-value gold">{Math.floor(sellQuantity * sellPrice * 0.95)} 💰</span>
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
                <div className="summary-row total">
                  <span>总{selectedOrder.type === 'sell' ? '支付' : '收入'}</span>
                  <span className="summary-value gold">{purchaseQuantity * selectedOrder.price} 💰</span>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-action"
                  disabled={
                    !!(
                      (selectedOrder.type === 'sell' && purchaseQuantity * selectedOrder.price > (playerState.inventory.gold || 0)) ||
                      (selectedOrder.type === 'buy' && selectedTradingItem && purchaseQuantity > (playerState.inventory[selectedTradingItem] || 0))
                    )
                  }
                  onClick={handleBuyOrder}
                >
                  确认{selectedOrder.type === 'sell' ? '购买' : '出售'}
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
            <div className="modal-header-with-favorite">
              <h3 className="modal-title">选择职业</h3>
              <button className="prog-close" type="button" onClick={() => setShowProfessionModal(false)} aria-label="关闭">
                关闭
              </button>
            </div>
            <p className="modal-subtitle">点当前职业可关闭；点其他职业会跳到对应采集页</p>
            
            <div className="profession-grid">
              {Object.values(professions).map((prof) => {
                const skill = playerState.skills[prof.skill] || { level: 1, xp: 0 };
                const isCurrent = prof.id === currentProfession;
                const nextLevelXp = getXpForLevel(skill.level + 1);
                const xpProgress = nextLevelXp > 0 ? (skill.xp / nextLevelXp) * 100 : 0;
                
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
                    <div className="profession-icon">{prof.icon}</div>
                    <div className="profession-name">{prof.name}</div>
                    <div className="profession-level">Lv.{skill.level}</div>
                    
                    {/* 经验进度条 */}
                    <div className="profession-xp-bar">
                      <div 
                        className="profession-xp-fill"
                        style={{ width: `${Math.min(100, xpProgress)}%` }}
                      ></div>
                    </div>
                    <div className="profession-xp-text">
                      {Math.round(xpProgress)}%
                    </div>
                    
                    {/* 技能提示 */}
                    <div className="profession-skills">
                      <span className="skill-tag">{prof.gatherName}</span>
                      <span className="skill-tag">{prof.craftName}</span>
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
          onClose={() => setProgPanel(null)}
          onGoldChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'daily' && (
        <DailyQuestsPanel
          onClose={() => setProgPanel(null)}
          onGoldChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'stats' && (
        <StatsPanel onClose={() => setProgPanel(null)} />
      )}
      {progPanel === 'settings' && (
        <SettingsPanel onClose={() => setProgPanel(null)} />
      )}
      {progPanel === 'buffs' && (
        <BuffsPanel
          onClose={() => setProgPanel(null)}
          onChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'shop' && (
        <ShopPanel
          onClose={() => setProgPanel(null)}
          onChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'checkin' && (
        <CheckInModal
          onClose={() => setProgPanel(null)}
          onChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'reputation' && (
        <ReputationPanel onClose={() => setProgPanel(null)} />
      )}
      {progPanel === 'bounties' && (
        <BountiesPanel
          onClose={() => setProgPanel(null)}
          onChange={() => { refreshPlayerState(); }}
        />
      )}
      {progPanel === 'prestige' && (
        <PrestigePanel
          onClose={() => setProgPanel(null)}
          onChange={() => { refreshPlayerState(); }}
        />
      )}

      {/* 离线收益弹窗 */}
      {offlineSummary && (
        <OfflineModal
          summary={offlineSummary}
          onClose={() => {
            setOfflineSummary(null)
            if (offlineSummary.lines.length > 0) {
              toast.reward('离线收益已结算')
            }
          }}
        />
      )}
    </div>
  )
}

