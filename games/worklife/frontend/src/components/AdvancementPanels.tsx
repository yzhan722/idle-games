// 进阶系统的面板，一个面板一个文件放在 advancement/，打开时才下载；本文件只做按需加载的包装和样式引入。
// 样式仍随主界面一起加载：里面混有顶栏等常驻元素的规则，拆开会改变层叠先后。
import type { ComponentProps } from 'react';
import { lazyPanel } from './lazyPanel';
import './ProgressionPanels.css';
import './SystemPanels.css';
import './AdvancementPanels.css';
import './T1UiIcons.css';

type Reputation = typeof import('./advancement/ReputationPanel').ReputationPanel;
type Prestige = typeof import('./advancement/PrestigePanel').PrestigePanel;
type Heritage = typeof import('./advancement/HeritageWorkshopPanel').HeritageWorkshopPanel;
type Caravan = typeof import('./advancement/CaravanTradePanel').CaravanTradePanel;
type Cauldron = typeof import('./advancement/AlchemyCauldronPanel').AlchemyCauldronPanel;
type Relics = typeof import('./advancement/AstralRelicsPanel').AstralRelicsPanel;
type Forge = typeof import('./advancement/SkyForgePanel').SkyForgePanel;
type Harbor = typeof import('./advancement/HarborDerbyPanel').HarborDerbyPanel;
type Academy = typeof import('./advancement/AcademyFestivalPanel').AcademyFestivalPanel;
type Arena = typeof import('./advancement/SkyArenaTownPanel').SkyArenaTownPanel;
type Ranch = typeof import('./advancement/BeastWeatherPanel').BeastWeatherPanel;
type Tavern = typeof import('./advancement/BardTavernChroniclePanel').BardTavernChroniclePanel;

export const ReputationPanel = lazyPanel<ComponentProps<Reputation>>('声望与军需官商店', 'ReputationPanel', () => import('./advancement/ReputationPanel'));
export const PrestigePanel = lazyPanel<ComponentProps<Prestige>>('转生与传承星盘', 'PrestigePanel', () => import('./advancement/PrestigePanel'));
export const HeritageWorkshopPanel = lazyPanel<ComponentProps<Heritage>>('铭纹附魔台与共鸣图鉴', 'HeritageWorkshopPanel', () => import('./advancement/HeritageWorkshopPanel'));
export const CaravanTradePanel = lazyPanel<ComponentProps<Caravan>>('远征商队与契约柜台', 'CaravanTradePanel', () => import('./advancement/CaravanTradePanel'));
export const AlchemyCauldronPanel = lazyPanel<ComponentProps<Cauldron>>('奇美拉魔药釜与共鸣槽', 'AlchemyCauldronPanel', () => import('./advancement/AlchemyCauldronPanel'));
export const AstralRelicsPanel = lazyPanel<ComponentProps<Relics>>('遗迹勘探与圣物陈列馆', 'AstralRelicsPanel', () => import('./advancement/AstralRelicsPanel'));
export const SkyForgePanel = lazyPanel<ComponentProps<Forge>>('天空锻炉与秘境契约', 'SkyForgePanel', () => import('./advancement/SkyForgePanel'));
export const HarborDerbyPanel = lazyPanel<ComponentProps<Harbor>>('港湾垂钓大赛与水族馆', 'HarborDerbyPanel', () => import('./advancement/HarborDerbyPanel'));
export const AcademyFestivalPanel = lazyPanel<ComponentProps<Academy>>('冒险者学院与四季节庆', 'AcademyFestivalPanel', () => import('./advancement/AcademyFestivalPanel'));
export const SkyArenaTownPanel = lazyPanel<ComponentProps<Arena>>('天空竞技场与公会城镇', 'SkyArenaTownPanel', () => import('./advancement/SkyArenaTownPanel'));
export const BeastWeatherPanel = lazyPanel<ComponentProps<Ranch>>('契约魔兽牧场与天候观星塔', 'BeastWeatherPanel', () => import('./advancement/BeastWeatherPanel'));
export const BardTavernChroniclePanel = lazyPanel<ComponentProps<Tavern>>('吟游诗人酒馆', 'BardTavernChroniclePanel', () => import('./advancement/BardTavernChroniclePanel'));
export type { TavernPanelTab } from './advancement/BardTavernChroniclePanel';
