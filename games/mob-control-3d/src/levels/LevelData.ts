import { THEME_ORDER, ThemeId } from '../game/SceneThemes';

export type GateOp = 'add' | 'mul' | 'sub' | 'div' | 'giant_jelly' | 'frost_shield';

export type GateStyle = 'blue' | 'gold' | 'mega' | 'hazard' | 'jelly' | 'frost';

export interface GateConfig {
  id: string;
  x: number;
  z: number;
  width: number;
  op: GateOp;
  value: number;
  style: GateStyle;
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface WallConfig {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height?: number;
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface GearConfig {
  id: string;
  x: number;
  z: number;
  radius: number;
  hp: number; // Number of troopers needed to Jam & Destroy the grinder gear
  moveRangeX?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export type TerrainZoneType = 'speed_belt' | 'jump_pad' | 'toxic_mire' | 'heal_sanctuary';

export interface TerrainZoneConfig {
  id: string;
  type: TerrainZoneType;
  x: number;
  z: number;
  width: number;
  length: number;
}

export interface BumperConfig {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface SideNestConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  name: string;
  rewardGold: number;
}

export interface BarrelConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
}

export interface BossSubTowerConfig {
  id: string;
  side: 'left' | 'right';
  name: string;
  x: number;
  z: number;
  hp: number;
  rewardGold: number;
}

export interface CandyVaultConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  rewardGold: number;
  rewardShards: number;
  name: string;
  isGrand?: boolean;
}

export type MapArchetype =
  | 'cascade_scurve'
  | 'grinder_gauntlet'
  | 'twin_matrix'
  | 'zigzag_fortress'
  | 'trilane_siege'
  | 'chaos_overdrive'
  | 'pinball_plaza'
  | 'hourglass_choke'
  | 'diamond_citadel'
  | 'conveyor_labyrinth';

export interface LevelConfig {
  id: number;
  seed: number;
  themeId: ThemeId;
  archetype: MapArchetype;
  archetypeName: string;
  isMilestoneBoss: boolean;
  isMiniBoss: boolean;
  isMegaBoss: boolean;
  isBonusHeist?: boolean;
  bonusHeistDurationSec?: number;
  candyVaults?: CandyVaultConfig[];
  isEndlessDefense?: boolean;
  name: string;
  subtitle: string;
  bossName: string;
  bossMaxHp: number;
  enemySpawnInterval: number; // seconds between red horde bursts
  enemyBurstCount: number;    // red units per burst
  initialRedPrewarm: number;  // initial vanguard in front of Boss Gate
  bruteSpawnInterval: number; // giant yellow mutant brutes interval (0 = none)
  rewardGold: number;
  gates: GateConfig[];
  walls: WallConfig[];
  gears: GearConfig[];
  nests: SideNestConfig[];
  barrels: BarrelConfig[];
  zones: TerrainZoneConfig[];
  bumpers: BumperConfig[];
  bossSubTowers: BossSubTowerConfig[];
}

export const TOTAL_SELECTABLE_STAGES = 50;

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 123456789;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  public chance(prob: number): boolean {
    return this.next() < prob;
  }
}

const BOSS_ROSTER = [
  '集团厂房总管 (STEAMWORKS DIRECTOR)',
  '重锤锅炉督军 (BOILER FOREMAN)',
  '双涡轮齿轮厂长 (TWIN-GEAR MAGNATE)',
  '铁甲蒸汽巨匠 (IRONCLAD ENGINEER)',
  '皇家发条大亨 (CLOCKWORK BARON)',
  '黄铜礼帽董事长 (BRASS SYNDICATE CEO)',
  '高压汽笛总督 (WHISTLE OVERSEER)',
  '焦糖熔炉总管 (FURNACE WARDEN)',
  '蒸汽广播主脑 (MEGAPHONE DIRECTOR)',
  '红砖要塞总工程师 (CITADEL ARCHITECT)',
] as const;

const MINI_BOSS_ROSTER = [
  '工坊先锋 · 巨型扳手领班 (STAGE 5 MINI BOSS)',
  '黑油主管 · 高压阀门督军 (STAGE 15 MINI BOSS)',
  '齿轮处刑官 · 重装铆钉巨汉 (STAGE 25 MINI BOSS)',
  '广播督察长 · 扩音蒸汽领主 (STAGE 35 MINI BOSS)',
  '涡轮总领班 · 超压发条巨匠 (STAGE 45 MINI BOSS)',
] as const;

const MEGA_BOSS_ROSTER = [
  '集团董事 · 红砖巨型总厂长 (STAGE 10 MEGA BOSS)',
  '蒸汽霸主 · 黄金齿轮大亨 (STAGE 20 MEGA BOSS)',
  '熔炉总帅 · 百吨发条巨神 (STAGE 30 MEGA BOSS)',
  '财团首脑 · 皇家蒸汽总督 (STAGE 40 MEGA BOSS)',
  '终极厂长 · 无尽工坊最高总裁 (STAGE 50 MEGA BOSS)',
] as const;

const NEST_NAMES = [
  '副厂抓捕哨站',
  '铆钉保安岗亭',
  '高压油罐分站',
  '厂区广播岗楼',
  '发条巡逻车库',
  '红砖警卫分厂',
  '蒸汽补给站台',
] as const;

const ARCHETYPE_INFO: Record<
  MapArchetype,
  { title: string; tag: string; desc: string }
> = {
  cascade_scurve: {
    title: '三段蛇形 · 传送带街区',
    tag: '三段S弯+传送带',
    desc: '三层交错胡桃木弹簧挡板搭配侧翼加速传送带与弹球柱，借弯道分流冲向高倍横幅门！',
  },
  grinder_gauntlet: {
    title: '巡弋蒸汽炉 · 飞跃突围',
    tag: '移动锅炉+跳板',
    desc: '双巡弋高压蒸汽锅炉封锁中场，善用侧翼弹簧跳板飞跃挡板直取倍增门！',
  },
  twin_matrix: {
    title: '菱形广场 · 双翼回廊',
    tag: '菱形花坛+双翼',
    desc: '中央菱形木栏将石板桥一分为三，穿行内环应援舞台或借外环传送带包抄集团厂房！',
  },
  zigzag_fortress: {
    title: '五折工坊 · 动感滑门街区',
    tag: '折线木栏+滑门',
    desc: '多层弹簧木挡板与横向滑动闸门交替开合，把握滑门间隙切入金色倍增横幅！',
  },
  trilane_siege: {
    title: '三路分流 · 传送带与油污',
    tag: '三路异构工坊',
    desc: '左中右三路分别设有加速传送带、弹簧跳板与黏滞黑油污，因地制宜分兵破敌！',
  },
  chaos_overdrive: {
    title: '工坊弹球阵 · 嘉年华决战区',
    tag: '弹球柱+动态门',
    desc: '多座黄铜弹球柱与滑动木栏交织成热闹街区，撞击弹柱触发多路散射增殖！',
  },
  pinball_plaza: {
    title: '蒸汽弹球台 · 偏转漏斗',
    tag: 'V型导流+弹球台',
    desc: 'V型胡桃木导流板将波波团汇入五柱黄铜弹球台，自动弹射分流至两侧高倍黄金门！',
  },
  hourglass_choke: {
    title: '沙漏街口 · 飞跃天桥',
    tag: '沙漏街口+跳板',
    desc: '双向收窄的沙漏街口布满礼花炸药桶与油污，亦可走外侧跳板凌空飞跃街口！',
  },
  diamond_citadel: {
    title: '双菱花坛 · 交叉应援网',
    tag: '双菱迷宫+舞台',
    desc: '前后两座菱形木栏构筑四向分流街区，占领中心应援光环持续回血推进！',
  },
  conveyor_labyrinth: {
    title: '极速传送迷宫 · 动感回旋',
    tag: '双滑门+传送迷宫',
    desc: '双层滑动木闸配合长距加速传送带与黄铜弹柱，打造节奏多变的欢乐攻防战！',
  },
};

/**
 * Generates a balanced, tactical procedural map for any stage number (1 to Unlimited).
 * Gate values are strictly bounded (+1~+3 for blue gates, x2~x3 for gold gates, x3~x4 for elite purple gates).
 */
export function generateDynamicLevel(stageNumber: number, customSeed?: number): LevelConfig {
  const safeStage = Math.max(1, Math.floor(stageNumber));
  const seed =
    customSeed !== undefined
      ? customSeed
      : Math.floor(Date.now() % 1000000) + safeStage * 9973 + Math.floor(Math.random() * 89999);
  const rng = new SeededRNG(seed);

  // Steeper progressive difficulty curve: fair Stage 1, scaling sharply into intense mid-to-late-game battles
  const difficultyScale = Math.pow(1.13, Math.min(safeStage - 1, 35)) + (safeStage - 1) * 0.16;
  const bossMaxHp = Math.round((950 + (safeStage - 1) * 235) * Math.pow(1.135, Math.min(safeStage - 1, 40)));
  const enemySpawnInterval = Math.max(
    0.42,
    Number((1.12 * Math.pow(0.955, Math.min(safeStage - 1, 35))).toFixed(3))
  );
  const enemyBurstCount = Math.min(18, Math.round(4 + (safeStage - 1) * 0.58));
  const initialRedPrewarm = Math.min(60, Math.round(11 + (safeStage - 1) * 3.0));
  const bruteSpawnInterval =
    safeStage === 1
      ? 11.5
      : Math.max(4.4, Number((10.6 * Math.pow(0.935, Math.min(safeStage - 1, 30))).toFixed(2)));
  const rewardGold = Math.round(125 * difficultyScale);

  const allArchetypes: MapArchetype[] = [
    'cascade_scurve',
    'grinder_gauntlet',
    'twin_matrix',
    'zigzag_fortress',
    'trilane_siege',
    'chaos_overdrive',
    'pinball_plaza',
    'hourglass_choke',
    'diamond_citadel',
    'conveyor_labyrinth',
  ];
  const archetype: MapArchetype = rng.pick(allArchetypes);

  const info = ARCHETYPE_INFO[archetype];
  const bossName = BOSS_ROSTER[(safeStage - 1 + rng.int(0, 2)) % BOSS_ROSTER.length];

  const gates: GateConfig[] = [];
  const walls: WallConfig[] = [];
  const gears: GearConfig[] = [];
  const nests: SideNestConfig[] = [];
  const zones: TerrainZoneConfig[] = [];
  const bumpers: BumperConfig[] = [];

  const mirror = rng.chance(0.5) ? -1 : 1;
  const baseGearHp = Math.min(20, Math.round(5 + safeStage * 0.8));
  const baseNestHp = Math.round((110 + (safeStage - 1) * 24) * Math.pow(1.07, Math.min(safeStage - 1, 25)));
  const baseNestGold = Math.round(75 * difficultyScale);
  const hazSubVal = Math.min(8, 6 + Math.floor((safeStage - 1) / 5));

  const pfx = `s${safeStage}_${seed % 1000}`;

  if (archetype === 'cascade_scurve') {
    const ladderX = 6.8 * mirror;
    const flankX = -6.4 * mirror;

    gates.push(
      {
        id: `${pfx}_center_trap`,
        x: 0,
        z: 14.8,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_lad_0`,
        x: ladderX,
        z: 12.6,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.35,
      },
      {
        id: `${pfx}_flank_0`,
        x: flankX,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: rng.int(2, 3),
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_lad_2`,
        x: ladderX - 0.8 * mirror,
        z: 4.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_sc_exit`,
        x: -2.6 * mirror,
        z: -3.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.5,
        movePhase: 0,
      },
      {
        id: `${pfx}_sc_haz2`,
        x: 4.8 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.4,
        moveSpeed: 1.5,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_mega`,
        x: 0,
        z: -8.8,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.6,
        movePhase: 0.4,
      }
    );

    // 3-Tier Serpentine S-Curve Baffles + Dynamic Sliding Center Gate Wall
    walls.push(
      { x1: 4.8 * mirror, z1: 9.2, x2: -1.4 * mirror, z2: 6.4 },
      { x1: -4.8 * mirror, z1: 3.8, x2: 1.4 * mirror, z2: 1.0 },
      { x1: 4.4 * mirror, z1: -1.6, x2: -1.0 * mirror, z2: -4.4 },
      { x1: -6.8 * mirror, z1: 8.8, x2: -6.8 * mirror, z2: 5.2 }
    );

    zones.push(
      { id: `${pfx}_zb1`, type: 'speed_belt', x: -6.2 * mirror, z: 8.5, width: 2.8, length: 5.5 },
      { id: `${pfx}_zb2`, type: 'speed_belt', x: 6.2 * mirror, z: 2.2, width: 2.8, length: 5.5 },
      { id: `${pfx}_zm1`, type: 'toxic_mire', x: 2.2 * mirror, z: 4.6, width: 3.2, length: 2.8 }
    );

    bumpers.push(
      { id: `${pfx}_bmp1`, x: -2.4 * mirror, z: 6.0, radius: 0.85 },
      { id: `${pfx}_bmp2`, x: 2.4 * mirror, z: 0.6, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_gear_1`,
      x: -7.2 * mirror,
      z: -1.2,
      radius: 1.85,
      hp: baseGearHp,
      moveRangeX: 1.4,
      moveSpeed: 1.5,
    });

    nests.push({
      id: `${pfx}_nest_1`,
      x: -7.8 * mirror,
      z: -6.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'grinder_gauntlet') {
    gates.push(
      {
        id: `${pfx}_haz_entry`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_g1_l`,
        x: -6.2 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
        movePhase: 0.8,
      },
      {
        id: `${pfx}_g1_r`,
        x: 6.2 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
        movePhase: 2.4,
      },
      {
        id: `${pfx}_g2`,
        x: 4.6 * mirror,
        z: 6.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.55,
        movePhase: 0.5,
      },
      {
        id: `${pfx}_g3`,
        x: -4.6 * mirror,
        z: 1.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.5,
        movePhase: 1.2,
      },
      {
        id: `${pfx}_haz_mid`,
        x: 4.8 * mirror,
        z: -2.8,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.6,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_mega`,
        x: -1.5 * mirror,
        z: -8.2,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.65,
        movePhase: 0,
      }
    );

    // Central spine wall + angled chicane wings + sliding front barrier
    walls.push(
      { x1: 0, z1: 8.2, x2: 0, z2: -1.8 },
      { x1: -8.2 * mirror, z1: 7.4, x2: -4.8 * mirror, z2: 5.2 },
      { x1: 8.2 * mirror, z1: 4.2, x2: 4.8 * mirror, z2: 2.0 },
      { x1: -2.2, z1: -5.2, x2: 2.2, z2: -5.2, moveRangeX: 3.2, moveSpeed: 1.35, movePhase: 0.5 }
    );

    // Jump pads let troops vault over the grinder gears!
    zones.push(
      { id: `${pfx}_jp1`, type: 'jump_pad', x: -6.4 * mirror, z: 8.2, width: 2.6, length: 2.2 },
      { id: `${pfx}_jp2`, type: 'jump_pad', x: 6.4 * mirror, z: 4.8, width: 2.6, length: 2.2 },
      { id: `${pfx}_hs1`, type: 'heal_sanctuary', x: -3.2 * mirror, z: -4.2, width: 3.4, length: 3.2 }
    );

    bumpers.push(
      { id: `${pfx}_bmp1`, x: 0, z: 9.4, radius: 0.9 },
      { id: `${pfx}_bmp2`, x: -3.2 * mirror, z: 3.5, radius: 0.8 }
    );

    gears.push(
      {
        id: `${pfx}_gr1`,
        x: 5.4 * mirror,
        z: 2.2,
        radius: 1.9,
        hp: baseGearHp,
        moveRangeX: 1.8,
        moveSpeed: 1.45,
        movePhase: 0,
      },
      {
        id: `${pfx}_gr2`,
        x: -5.4 * mirror,
        z: 5.8,
        radius: 1.9,
        hp: baseGearHp,
        moveRangeX: 1.8,
        moveSpeed: 1.45,
        movePhase: 3.14,
      }
    );

    nests.push({
      id: `${pfx}_nest_1`,
      x: 7.2 * mirror,
      z: -8.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'twin_matrix') {
    gates.push(
      {
        id: `${pfx}_m0_trap`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_m1_l`,
        x: -6.0,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
        movePhase: 0,
      },
      {
        id: `${pfx}_m1_r`,
        x: 6.0,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
        movePhase: 3.14,
      },
      {
        id: `${pfx}_m2_l`,
        x: -5.6,
        z: 5.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.5,
        movePhase: 0.7,
      },
      {
        id: `${pfx}_m2_r`,
        x: 5.6,
        z: 5.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.5,
        movePhase: 2.3,
      },
      {
        id: `${pfx}_m3_pos`,
        x: -3.2 * mirror,
        z: -2.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.2,
        moveSpeed: 1.6,
        movePhase: 1.4,
      },
      {
        id: `${pfx}_m3_haz`,
        x: 4.5 * mirror,
        z: -2.8,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.6,
        moveSpeed: 1.6,
        movePhase: 4.5,
      },
      {
        id: `${pfx}_m4`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.6,
        moveSpeed: 1.65,
        movePhase: 0.5,
      }
    );

    // Central Diamond Island Citadel (4 angled diamond walls with open top/bottom vertex channels!)
    walls.push(
      { x1: -1.4, z1: 7.4, x2: -4.2, z2: 3.2 },
      { x1: 1.4, z1: 7.4, x2: 4.2, z2: 3.2 },
      { x1: -4.2, z1: 1.6, x2: -1.4, z2: -2.4 },
      { x1: 4.2, z1: 1.6, x2: 1.4, z2: -2.4 }
    );

    zones.push(
      { id: `${pfx}_hs_core`, type: 'heal_sanctuary', x: 0, z: 2.4, width: 3.6, length: 4.2 },
      { id: `${pfx}_sb_l`, type: 'speed_belt', x: -6.8, z: 1.5, width: 2.4, length: 5.2 },
      { id: `${pfx}_sb_r`, type: 'speed_belt', x: 6.8, z: 1.5, width: 2.4, length: 5.2 }
    );

    bumpers.push(
      { id: `${pfx}_bmp_top`, x: 0, z: 8.8, radius: 0.85 },
      { id: `${pfx}_bmp_bot`, x: 0, z: -4.2, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_gr_c`,
      x: 0,
      z: 6.2,
      radius: 1.75,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_nl`,
      x: -7.8 * mirror,
      z: -5.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'zigzag_fortress') {
    // 4-tier zig-zag fortress with 2 dynamic sliding blast doors!
    walls.push(
      { x1: -5.4 * mirror, z1: 9.0, x2: 0.8 * mirror, z2: 6.6 },
      { x1: 5.4 * mirror, z1: 4.4, x2: -0.8 * mirror, z2: 2.0 },
      { x1: -5.2 * mirror, z1: -0.4, x2: 0.8 * mirror, z2: -2.8 },
      { x1: -1.8, z1: -5.4, x2: 1.8, z2: -5.4, moveRangeX: 3.5, moveSpeed: 1.5, movePhase: 0 }
    );

    gates.push(
      {
        id: `${pfx}_z_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_z1`,
        x: -6.2 * mirror,
        z: 12.4,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_z2`,
        x: 6.2 * mirror,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.6,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_z3`,
        x: 5.4 * mirror,
        z: 5.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_z4`,
        x: -5.2 * mirror,
        z: -2.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_z_haz1`,
        x: 4.5 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.6,
      },
      {
        id: `${pfx}_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.6,
        movePhase: 0,
      }
    );

    zones.push(
      { id: `${pfx}_jp_z1`, type: 'jump_pad', x: -2.5 * mirror, z: 8.6, width: 2.5, length: 2.2 },
      { id: `${pfx}_tm_z1`, type: 'toxic_mire', x: 2.5 * mirror, z: 1.2, width: 3.4, length: 2.8 },
      { id: `${pfx}_sb_z1`, type: 'speed_belt', x: -6.2 * mirror, z: 3.0, width: 2.6, length: 4.8 }
    );

    bumpers.push({ id: `${pfx}_zbmp1`, x: 2.6 * mirror, z: 6.2, radius: 0.85 });

    gears.push({
      id: `${pfx}_zg1`,
      x: -7.0 * mirror,
      z: 4.2,
      radius: 1.9,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_zn1`,
      x: -7.6 * mirror,
      z: -8.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'trilane_siege') {
    // Segmented 3-lane highway with cross-switching gaps & angled entry splitters!
    walls.push(
      { x1: -3.6, z1: 9.8, x2: -3.6, z2: 4.2 },
      { x1: -3.6, z1: 1.8, x2: -3.6, z2: -3.8 },
      { x1: 3.6, z1: 9.8, x2: 3.6, z2: 4.2 },
      { x1: 3.6, z1: 1.8, x2: 3.6, z2: -3.8 },
      { x1: -2.0, z1: 11.2, x2: -3.6, z2: 9.8 },
      { x1: 2.0, z1: 11.2, x2: 3.6, z2: 9.8 }
    );

    zones.push(
      { id: `${pfx}_tl_sb`, type: 'speed_belt', x: -6.4 * mirror, z: 2.5, width: 3.0, length: 9.5 },
      { id: `${pfx}_tl_jp`, type: 'jump_pad', x: 0, z: 7.2, width: 3.0, length: 2.4 },
      { id: `${pfx}_tl_hs`, type: 'heal_sanctuary', x: 0, z: -1.5, width: 3.4, length: 3.4 },
      { id: `${pfx}_tl_tm`, type: 'toxic_mire', x: 6.4 * mirror, z: 1.2, width: 3.2, length: 5.2 }
    );

    bumpers.push(
      { id: `${pfx}_tl_b1`, x: -3.6, z: 3.0, radius: 0.78 },
      { id: `${pfx}_tl_b2`, x: 3.6, z: 3.0, radius: 0.78 }
    );

    gates.push(
      {
        id: `${pfx}_tl_c1`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_tl_c2`,
        x: 0,
        z: 3.2,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.4,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_tl_l_0`,
        x: -6.8 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_tl_l_1`,
        x: -6.8 * mirror,
        z: 4.5,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_tl_r1`,
        x: 6.8 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.2,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_tl_r2`,
        x: 6.8 * mirror,
        z: 4.5,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
        movePhase: 2.2,
      },
      {
        id: `${pfx}_tl_mega`,
        x: -1.8 * mirror,
        z: -8.4,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.6,
        movePhase: 0,
      },
      {
        id: `${pfx}_tl_fhaz`,
        x: 5.0 * mirror,
        z: -3.2,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.4,
        moveSpeed: 1.55,
        movePhase: 3.14,
      }
    );

    gears.push({
      id: `${pfx}_tl_gc`,
      x: 0,
      z: 9.6,
      radius: 1.75,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_tl_nest`,
      x: 7.5 * mirror,
      z: -4.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'pinball_plaza') {
    // NEW ARCHETYPE 7: Arcade Pinball Funnel + 5 Electromagnetic Bumpers + Side Speed Tracks!
    walls.push(
      { x1: -8.4, z1: 9.6, x2: -3.2, z2: 5.8 },
      { x1: 8.4, z1: 9.6, x2: 3.2, z2: 5.8 },
      { x1: -2.6, z1: -1.8, x2: -6.2, z2: -5.4 },
      { x1: 2.6, z1: -1.8, x2: 6.2, z2: -5.4 }
    );

    bumpers.push(
      { id: `${pfx}_pb1`, x: 0, z: 5.2, radius: 0.95 },
      { id: `${pfx}_pb2`, x: -2.6, z: 2.6, radius: 0.9 },
      { id: `${pfx}_pb3`, x: 2.6, z: 2.6, radius: 0.9 },
      { id: `${pfx}_pb4`, x: -4.6, z: -0.2, radius: 0.85 },
      { id: `${pfx}_pb5`, x: 4.6, z: -0.2, radius: 0.85 }
    );

    zones.push(
      { id: `${pfx}_pb_sb1`, type: 'speed_belt', x: -6.8, z: 1.8, width: 2.5, length: 6.0 },
      { id: `${pfx}_pb_sb2`, type: 'speed_belt', x: 6.8, z: 1.8, width: 2.5, length: 6.0 },
      { id: `${pfx}_pb_hs`, type: 'heal_sanctuary', x: 0, z: -0.2, width: 3.6, length: 3.2 }
    );

    gates.push(
      {
        id: `${pfx}_pb_haz0`,
        x: 0,
        z: 13.4,
        width: 3.4,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.8,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_l1`,
        x: -5.8,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 3,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_r1`,
        x: 5.8,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 3,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_pb_l2`,
        x: -6.0,
        z: -2.4,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_pb_r2`,
        x: 6.0,
        z: -2.4,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_pb_mega`,
        x: 0,
        z: -8.6,
        width: 5.4,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    nests.push({
      id: `${pfx}_pb_nest`,
      x: 7.6 * mirror,
      z: -7.5,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'hourglass_choke') {
    // NEW ARCHETYPE 8: Hourglass Constriction Choke (> <) + Flank Jump Pads over the Choke!
    walls.push(
      { x1: -8.2, z1: 8.8, x2: -2.5, z2: 3.2 },
      { x1: 8.2, z1: 8.8, x2: 2.5, z2: 3.2 },
      { x1: -2.5, z1: 0.4, x2: -7.8, z2: -4.8 },
      { x1: 2.5, z1: 0.4, x2: 7.8, z2: -4.8 }
    );

    zones.push(
      { id: `${pfx}_hg_tm`, type: 'toxic_mire', x: 0, z: 1.8, width: 3.8, length: 3.6 },
      { id: `${pfx}_hg_jp1`, type: 'jump_pad', x: -6.2, z: 6.8, width: 2.8, length: 2.4 },
      { id: `${pfx}_hg_jp2`, type: 'jump_pad', x: 6.2, z: 6.8, width: 2.8, length: 2.4 },
      { id: `${pfx}_hg_sb`, type: 'speed_belt', x: 0, z: -4.2, width: 3.2, length: 5.0 }
    );

    bumpers.push(
      { id: `${pfx}_hg_b1`, x: -3.6, z: -2.2, radius: 0.85 },
      { id: `${pfx}_hg_b2`, x: 3.6, z: -2.2, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_hg_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.7,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_l1`,
        x: -6.2,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_r1`,
        x: 6.2,
        z: 12.0,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_hg_mid`,
        x: 0,
        z: 4.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.2,
        moveSpeed: 1.45,
      },
      {
        id: `${pfx}_hg_l2`,
        x: -5.4 * mirror,
        z: -2.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.6,
        moveSpeed: 1.55,
      },
      {
        id: `${pfx}_hg_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.2,
        moveSpeed: 1.6,
      }
    );

    gears.push({
      id: `${pfx}_hg_g1`,
      x: 5.6 * mirror,
      z: 1.8,
      radius: 1.85,
      hp: baseGearHp,
    });

    nests.push({
      id: `${pfx}_hg_n1`,
      x: -7.5 * mirror,
      z: -7.2,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'diamond_citadel') {
    // NEW ARCHETYPE 9: Twin Staggered Diamond Islands + Sliding Blast Door + Dual Sanctuaries!
    walls.push(
      // Rear Diamond Island (centered at x = -3.0 * mirror, z = 6.2)
      { x1: -3.0 * mirror, z1: 9.0, x2: -5.6 * mirror, z2: 6.2 },
      { x1: -3.0 * mirror, z1: 9.0, x2: -0.4 * mirror, z2: 6.2 },
      { x1: -5.6 * mirror, z1: 5.4, x2: -3.0 * mirror, z2: 2.8 },
      { x1: -0.4 * mirror, z1: 5.4, x2: -3.0 * mirror, z2: 2.8 },
      // Front Diamond Island (centered at x = 3.0 * mirror, z = -1.2)
      { x1: 3.0 * mirror, z1: 1.6, x2: 0.4 * mirror, z2: -1.2 },
      { x1: 3.0 * mirror, z1: 1.6, x2: 5.6 * mirror, z2: -1.2 },
      { x1: 0.4 * mirror, z1: -2.0, x2: 3.0 * mirror, z2: -4.6 },
      { x1: 5.6 * mirror, z1: -2.0, x2: 3.0 * mirror, z2: -4.6 }
    );

    zones.push(
      { id: `${pfx}_dc_sb1`, type: 'speed_belt', x: 4.8 * mirror, z: 6.0, width: 2.8, length: 5.6 },
      { id: `${pfx}_dc_sb2`, type: 'speed_belt', x: -4.8 * mirror, z: -1.4, width: 2.8, length: 5.6 },
      { id: `${pfx}_dc_hs`, type: 'heal_sanctuary', x: 0, z: 2.2, width: 3.4, length: 3.0 }
    );

    bumpers.push(
      { id: `${pfx}_dc_b1`, x: 0, z: 9.2, radius: 0.85 },
      { id: `${pfx}_dc_b2`, x: 0, z: -4.8, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_dc_haz0`,
        x: 0,
        z: 13.4,
        width: 3.5,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_l1`,
        x: -6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_r1`,
        x: 6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.4,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_dc_g1`,
        x: 4.8 * mirror,
        z: 5.8,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_dc_g2`,
        x: -4.8 * mirror,
        z: -1.6,
        width: 4.6,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.5,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_dc_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    nests.push({
      id: `${pfx}_dc_n1`,
      x: 7.6 * mirror,
      z: -7.0,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else if (archetype === 'conveyor_labyrinth') {
    // NEW ARCHETYPE 10: Dual Dynamic Sliding Blast Doors + Multi-Belt Labyrinth + Jump Pads!
    walls.push(
      { x1: -2.4, z1: 7.6, x2: 2.4, z2: 7.6, moveRangeX: 3.8, moveSpeed: 1.45, movePhase: 0 },
      { x1: -2.4, z1: 0.6, x2: 2.4, z2: 0.6, moveRangeX: 3.8, moveSpeed: 1.45, movePhase: 3.14 },
      { x1: -6.8 * mirror, z1: 4.8, x2: -2.8 * mirror, z2: 2.8 },
      { x1: 6.8 * mirror, z1: -2.2, x2: 2.8 * mirror, z2: -4.2 }
    );

    zones.push(
      { id: `${pfx}_cl_sb1`, type: 'speed_belt', x: -5.8 * mirror, z: 8.8, width: 2.8, length: 4.8 },
      { id: `${pfx}_cl_sb2`, type: 'speed_belt', x: 5.8 * mirror, z: 3.6, width: 2.8, length: 5.2 },
      { id: `${pfx}_cl_jp1`, type: 'jump_pad', x: 0, z: 9.4, width: 2.8, length: 2.2 },
      { id: `${pfx}_cl_tm1`, type: 'toxic_mire', x: -4.6 * mirror, z: -2.6, width: 3.4, length: 3.2 }
    );

    bumpers.push(
      { id: `${pfx}_cl_b1`, x: 2.4 * mirror, z: 4.2, radius: 0.85 },
      { id: `${pfx}_cl_b2`, x: -2.4 * mirror, z: -2.8, radius: 0.85 }
    );

    gates.push(
      {
        id: `${pfx}_cl_haz0`,
        x: 0,
        z: 13.4,
        width: 3.5,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.7,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_l1`,
        x: -6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_r1`,
        x: 6.2,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_cl_g1`,
        x: 5.4 * mirror,
        z: 4.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_cl_g2`,
        x: -5.4 * mirror,
        z: -1.8,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_cl_mega`,
        x: 0,
        z: -8.6,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.4,
        moveSpeed: 1.65,
      }
    );

    gears.push({
      id: `${pfx}_cl_gr1`,
      x: 0,
      z: -4.2,
      radius: 1.85,
      hp: baseGearHp,
      moveRangeX: 2.2,
      moveSpeed: 1.5,
    });

    nests.push({
      id: `${pfx}_cl_n1`,
      x: -7.6 * mirror,
      z: -6.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  } else {
    // chaos_overdrive: Honeycomb Pinball + Dynamic Barrier + Composite Arena
    gates.push(
      {
        id: `${pfx}_co_haz0`,
        x: 0,
        z: 13.4,
        width: 3.6,
        op: 'sub',
        value: hazSubVal,
        style: 'hazard',
        moveRangeX: 0.65,
        moveSpeed: 1.4,
        movePhase: 0,
      },
      {
        id: `${pfx}_co_l_0`,
        x: -6.4 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_co_r_0`,
        x: 6.4 * mirror,
        z: 12.2,
        width: 4.8,
        op: 'add',
        value: 2,
        style: 'blue',
        moveRangeX: 1.5,
        moveSpeed: 1.4,
      },
      {
        id: `${pfx}_co_l_1`,
        x: -5.8 * mirror,
        z: 5.4,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 1.8,
        moveSpeed: 1.5,
      },
      {
        id: `${pfx}_co_c2`,
        x: 3.6 * mirror,
        z: 2.2,
        width: 4.8,
        op: 'mul',
        value: 2,
        style: 'gold',
        moveRangeX: 2.4,
        moveSpeed: 1.55,
        movePhase: 1.2,
      },
      {
        id: `${pfx}_co_haz2`,
        x: -4.5 * mirror,
        z: -2.6,
        width: 3.4,
        op: 'div',
        value: 2,
        style: 'hazard',
        moveRangeX: 1.5,
        moveSpeed: 1.55,
        movePhase: 4.3,
      },
      {
        id: `${pfx}_co_mega`,
        x: 0,
        z: -8.4,
        width: 5.2,
        op: 'mul',
        value: 3,
        style: 'mega',
        moveRangeX: 3.6,
        moveSpeed: 1.65,
        movePhase: 0,
      }
    );

    walls.push(
      { x1: -4.2 * mirror, z1: 8.6, x2: -1.8 * mirror, z2: 3.2 },
      { x1: 4.2 * mirror, z1: 6.2, x2: 1.8 * mirror, z2: 0.8 },
      { x1: -2.8 * mirror, z1: -0.8, x2: 1.2 * mirror, z2: -3.6 },
      { x1: -2.0, z1: -5.5, x2: 2.0, z2: -5.5, moveRangeX: 3.2, moveSpeed: 1.55, movePhase: 1.0 }
    );

    zones.push(
      { id: `${pfx}_co_sb`, type: 'speed_belt', x: 6.4 * mirror, z: 7.2, width: 2.6, length: 5.0 },
      { id: `${pfx}_co_jp`, type: 'jump_pad', x: -6.2 * mirror, z: 2.2, width: 2.6, length: 2.2 },
      { id: `${pfx}_co_hs`, type: 'heal_sanctuary', x: 0, z: 4.8, width: 3.2, length: 3.0 }
    );

    bumpers.push(
      { id: `${pfx}_co_b1`, x: 0, z: 8.2, radius: 0.88 },
      { id: `${pfx}_co_b2`, x: -2.8 * mirror, z: 1.0, radius: 0.85 },
      { id: `${pfx}_co_b3`, x: 3.2 * mirror, z: -2.2, radius: 0.85 }
    );

    gears.push({
      id: `${pfx}_co_g1`,
      x: 6.2 * mirror,
      z: -2.4,
      radius: 1.9,
      hp: baseGearHp,
      moveRangeX: 1.6,
      moveSpeed: 1.4,
    });

    nests.push({
      id: `${pfx}_co_n1`,
      x: 7.8 * mirror,
      z: -6.8,
      hp: baseNestHp,
      name: rng.pick(NEST_NAMES),
      rewardGold: baseNestGold,
    });
  }

  const themeId: ThemeId = THEME_ORDER[(safeStage - 1) % THEME_ORDER.length];
  const isMegaBoss = safeStage % 10 === 0;
  const isMiniBoss = safeStage % 10 === 5;
  const isMilestoneBoss = isMegaBoss || isMiniBoss || safeStage % 4 === 0;

  // MC-1: Inject Tactical Functional Gates ("果冻巨化门" & "糖霜护盾门") with automatic clearance validation
  const isClearForSpecialGate = (gx: number, gz: number, gw: number, moveRange = 0.8): boolean => {
    for (const g of gates) {
      const zGap = Math.abs(gz - g.z);
      const xSpan = (gw + g.width) * 0.5 + moveRange + (g.moveRangeX || 0) + 0.75;
      if (zGap < 2.25 && Math.abs(gx - g.x) < xSpan) return false;
    }
    for (const w of walls) {
      const padX = (w.moveRangeX || 0) + gw * 0.5 + 0.65;
      const minX = Math.min(w.x1, w.x2) - padX;
      const maxX = Math.max(w.x1, w.x2) + padX;
      const minZ = Math.min(w.z1, w.z2) - 1.0;
      const maxZ = Math.max(w.z1, w.z2) + 1.0;
      if (gx >= minX && gx <= maxX && gz >= minZ && gz <= maxZ) return false;
    }
    for (const gr of gears) {
      const padX = (gr.moveRangeX || 0) + gr.radius + gw * 0.5 + 0.65;
      if (Math.abs(gx - gr.x) < padX && Math.abs(gz - gr.z) < gr.radius + 1.15) return false;
    }
    for (const bm of bumpers) {
      if (Math.abs(gz - bm.z) < bm.radius + 1.1 && Math.abs(gx - bm.x) < bm.radius + gw * 0.5 + 0.6) {
        return false;
      }
    }
    return true;
  };

  const jellyCandidateSlots: Array<[number, number]> = [
    [-3.8 * mirror, 8.6],
    [3.8 * mirror, 8.6],
    [-5.2 * mirror, 6.8],
    [5.2 * mirror, 6.8],
    [0, 7.6],
    [-4.6 * mirror, 0.2],
    [4.6 * mirror, 0.2],
    [-6.2 * mirror, 9.6],
  ];
  for (const [jx, jz] of jellyCandidateSlots) {
    if (isClearForSpecialGate(jx, jz, 3.8, 0.75)) {
      gates.push({
        id: `${pfx}_jelly_giant`,
        x: Number(jx.toFixed(2)),
        z: jz,
        width: 3.8,
        op: 'giant_jelly',
        value: 2,
        style: 'jelly',
        moveRangeX: 0.75,
        moveSpeed: 1.28,
        movePhase: 0.6,
      });
      break;
    }
  }
  if (!gates.some((g) => g.op === 'giant_jelly')) {
    gates.push({
      id: `${pfx}_jelly_giant`,
      x: Number((-5.8 * mirror).toFixed(2)),
      z: 9.8,
      width: 3.6,
      op: 'giant_jelly',
      value: 2,
      style: 'jelly',
      moveRangeX: 0.6,
      moveSpeed: 1.25,
      movePhase: 0.6,
    });
  }

  const frostCandidateSlots: Array<[number, number]> = [
    [3.8 * mirror, 6.6],
    [-3.8 * mirror, 6.6],
    [5.2 * mirror, 3.2],
    [-5.2 * mirror, 3.2],
    [0, 2.8],
    [4.8 * mirror, -5.8],
    [-4.8 * mirror, -5.8],
    [6.2 * mirror, 9.6],
  ];
  for (const [fx, fz] of frostCandidateSlots) {
    if (isClearForSpecialGate(fx, fz, 3.8, 0.75)) {
      gates.push({
        id: `${pfx}_frost_shield`,
        x: Number(fx.toFixed(2)),
        z: fz,
        width: 3.8,
        op: 'frost_shield',
        value: 1,
        style: 'frost',
        moveRangeX: 0.75,
        moveSpeed: 1.32,
        movePhase: 2.1,
      });
      break;
    }
  }
  if (!gates.some((g) => g.op === 'frost_shield')) {
    gates.push({
      id: `${pfx}_frost_shield`,
      x: Number((5.8 * mirror).toFixed(2)),
      z: 6.2,
      width: 3.6,
      op: 'frost_shield',
      value: 1,
      style: 'frost',
      moveRangeX: 0.6,
      moveSpeed: 1.3,
      movePhase: 2.1,
    });
  }
  const finalRewardGold = isMegaBoss
    ? Math.round(rewardGold * 2.5)
    : isMiniBoss
      ? Math.round(rewardGold * 1.85)
      : isMilestoneBoss
        ? Math.round(rewardGold * 1.65)
        : rewardGold;
  const resolvedBossName = isMegaBoss
    ? MEGA_BOSS_ROSTER[(Math.floor(safeStage / 10) - 1) % MEGA_BOSS_ROSTER.length]
    : isMiniBoss
      ? MINI_BOSS_ROSTER[Math.floor((safeStage - 5) / 10) % MINI_BOSS_ROSTER.length]
      : bossName;

  // Spawn 2-4 Explosive Plasma Barrels along the mid-field battlefront for chain-reaction crowd clearing!
  // Automatically validates clearance against walls (including sliding doors), gears, gates, and bumpers!
  const barrels: BarrelConfig[] = [];
  const candidateSlots: Array<[number, number]> = [
    [-3.2 * mirror, 2.2],
    [3.4 * mirror, -0.8],
    [-4.8 * mirror, -4.2],
    [4.8 * mirror, -4.2],
    [0, 1.2],
    [-2.6 * mirror, -3.4],
    [2.6 * mirror, 3.8],
    [-5.6 * mirror, 0.8],
    [5.6 * mirror, 0.8],
    [0, -6.8],
  ];
  const isPointClearForBarrel = (px: number, pz: number): boolean => {
    for (const w of walls) {
      const padX = (w.moveRangeX || 0) + 1.15;
      const minX = Math.min(w.x1, w.x2) - padX;
      const maxX = Math.max(w.x1, w.x2) + padX;
      const minZ = Math.min(w.z1, w.z2) - 1.15;
      const maxZ = Math.max(w.z1, w.z2) + 1.15;
      if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) return false;
    }
    for (const gr of gears) {
      const padX = (gr.moveRangeX || 0) + gr.radius + 1.2;
      if (Math.abs(px - gr.x) < padX && Math.abs(pz - gr.z) < gr.radius + 1.2) return false;
    }
    for (const g of gates) {
      if (Math.abs(pz - g.z) < 1.35 && Math.abs(px - g.x) < g.width * 0.5 + (g.moveRangeX || 0) + 0.9) {
        return false;
      }
    }
    for (const bm of bumpers) {
      if (Math.hypot(px - bm.x, pz - bm.z) < bm.radius + 1.35) return false;
    }
    for (const existing of barrels) {
      if (Math.hypot(px - existing.x, pz - existing.z) < 2.6) return false;
    }
    return true;
  };

  const barrelCount = isMilestoneBoss ? 4 : rng.int(2, 3);
  const barrelHp = Math.min(8, 3 + Math.floor(safeStage / 4));
  for (const [bx, bz] of candidateSlots) {
    if (barrels.length >= barrelCount) break;
    const tx = bx + rng.range(-0.35, 0.35);
    const tz = bz + rng.range(-0.3, 0.3);
    if (isPointClearForBarrel(tx, tz)) {
      barrels.push({
        id: `${pfx}_barrel_${barrels.length}`,
        x: Number(tx.toFixed(2)),
        z: Number(tz.toFixed(2)),
        hp: barrelHp,
      });
    }
  }

  const scaledBossMaxHp = isMegaBoss
    ? Math.round(bossMaxHp * 1.9)
    : isMiniBoss
      ? Math.round(bossMaxHp * 1.42)
      : isMilestoneBoss
        ? Math.round(bossMaxHp * 1.2)
        : bossMaxHp;

  const bossSubTowers: BossSubTowerConfig[] = [];
  if (isMegaBoss || isMiniBoss) {
    const subHp = Math.max(85, Math.round(scaledBossMaxHp * (isMegaBoss ? 0.24 : 0.2)));
    const subGold = Math.max(25, Math.round(finalRewardGold * 0.16));
    bossSubTowers.push(
      {
        id: `subtower_left_${safeStage}`,
        side: 'left',
        name: '左翼蒸汽护盾塔',
        x: -6.2,
        z: -13.8,
        hp: subHp,
        rewardGold: subGold,
      },
      {
        id: `subtower_right_${safeStage}`,
        side: 'right',
        name: '右翼蒸汽护盾塔',
        x: 6.2,
        z: -13.8,
        hp: subHp,
        rewardGold: subGold,
      }
    );
  }

  return {
    id: safeStage,
    seed,
    themeId,
    archetype,
    archetypeName: isMegaBoss
      ? `👑十关机制大Boss · ${info.tag}`
      : isMiniBoss
        ? `👹五关先锋小Boss · ${info.tag}`
        : isMilestoneBoss
          ? `⚡超频决战 · ${info.tag}`
          : info.tag,
    isMilestoneBoss,
    isMiniBoss,
    isMegaBoss,
    name: isMegaBoss
      ? `第 ${safeStage} 关：👑 ${resolvedBossName}`
      : isMiniBoss
        ? `第 ${safeStage} 关：👹 ${resolvedBossName}`
        : `第 ${safeStage} 关：${info.title}`,
    subtitle: `[随机地形 #${seed % 10000}] ${info.desc}`,
    bossName: resolvedBossName,
    bossMaxHp: scaledBossMaxHp,
    enemySpawnInterval: isMegaBoss
      ? Number(Math.max(0.36, enemySpawnInterval * 0.82).toFixed(3))
      : isMiniBoss
        ? Number(Math.max(0.38, enemySpawnInterval * 0.9).toFixed(3))
        : enemySpawnInterval,
    enemyBurstCount: isMegaBoss
      ? Math.min(22, enemyBurstCount + 3)
      : isMiniBoss
        ? Math.min(20, enemyBurstCount + 2)
        : enemyBurstCount,
    initialRedPrewarm,
    bruteSpawnInterval,
    rewardGold: finalRewardGold,
    gates,
    walls,
    gears,
    nests,
    barrels,
    zones,
    bumpers,
    bossSubTowers,
  };
}

export function generateCandyVaultBonusLevel(milestoneStage: number): LevelConfig {
  const safeMilestone = Math.max(5, Math.floor(milestoneStage));
  const tier = Math.max(1, Math.floor(safeMilestone / 5));
  const themeId = THEME_ORDER[(tier - 1) % THEME_ORDER.length];
  const candyVaults: CandyVaultConfig[] = [
    {
      id: 'vault_left_front',
      x: -5.6,
      z: -7.0,
      hp: 150 + tier * 45,
      rewardGold: 420 + tier * 140,
      rewardShards: 1,
      name: '焦糖储蓄金库',
    },
    {
      id: 'vault_center_front',
      x: 0,
      z: -6.4,
      hp: 180 + tier * 55,
      rewardGold: 520 + tier * 160,
      rewardShards: 1,
      name: '皇家蜂蜜金库',
    },
    {
      id: 'vault_right_front',
      x: 5.6,
      z: -7.0,
      hp: 150 + tier * 45,
      rewardGold: 420 + tier * 140,
      rewardShards: 1,
      name: '焦糖储蓄金库',
    },
    {
      id: 'vault_left_grand',
      x: -3.8,
      z: -12.0,
      hp: 230 + tier * 70,
      rewardGold: 680 + tier * 200,
      rewardShards: 2,
      name: '太妃至尊金库塔',
      isGrand: true,
    },
    {
      id: 'vault_right_grand',
      x: 3.8,
      z: -12.0,
      hp: 230 + tier * 70,
      rewardGold: 680 + tier * 200,
      rewardShards: 2,
      name: '星糖至尊金库塔',
      isGrand: true,
    },
  ];

  return {
    id: safeMilestone,
    seed: 77700 + safeMilestone,
    themeId,
    archetype: 'chaos_overdrive',
    archetypeName: '25s 限时暴爽奖励关 · 零红军干扰',
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    isBonusHeist: true,
    bonusHeistDurationSec: 25,
    candyVaults,
    name: `糖果金库大劫案（第 ${safeMilestone} 关奖励）`,
    subtitle: '25 秒零红军暴爽狂欢！穿过高倍门轰碎糖果金库塔，狂爆金币与时装碎片！',
    bossName: '至尊糖果总金库',
    bossMaxHp: 720 + tier * 240,
    enemySpawnInterval: 999,
    enemyBurstCount: 0,
    initialRedPrewarm: 0,
    bruteSpawnInterval: 0,
    rewardGold: 850 + tier * 250,
    gates: [
      { id: 'bh_g1', x: -4.2, z: 9.2, width: 4.8, op: 'mul', value: 3, style: 'gold', moveRangeX: 2.6, moveSpeed: 1.45, movePhase: 0 },
      { id: 'bh_g2', x: 4.2, z: 9.2, width: 4.8, op: 'add', value: 8, style: 'blue', moveRangeX: 2.6, moveSpeed: 1.45, movePhase: Math.PI },
      { id: 'bh_g3', x: -3.8, z: 3.4, width: 4.6, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 2.8, moveSpeed: 1.3, movePhase: 0.7 },
      { id: 'bh_g4', x: 3.8, z: 3.4, width: 4.8, op: 'mul', value: 4, style: 'mega', moveRangeX: 2.8, moveSpeed: 1.3, movePhase: 3.84 },
      { id: 'bh_g5', x: 0, z: -1.8, width: 5.8, op: 'mul', value: 3, style: 'gold', moveRangeX: 4.2, moveSpeed: 1.65, movePhase: 1.57 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [],
    zones: [
      { id: 'bh_belt_l', type: 'speed_belt', x: -3.6, z: 6.3, width: 4.8, length: 4.2 },
      { id: 'bh_belt_r', type: 'speed_belt', x: 3.6, z: 6.3, width: 4.8, length: 4.2 },
    ],
    bumpers: [],
    bossSubTowers: [],
  };
}

export function generateEndlessDefenseLevel(): LevelConfig {
  return {
    id: 1,
    seed: 88888,
    themeId: THEME_ORDER[0],
    archetype: 'trilane_siege',
    archetypeName: '无尽工坊保卫战 · 波次递增生存',
    isMilestoneBoss: false,
    isMiniBoss: false,
    isMegaBoss: false,
    isEndlessDefense: true,
    name: '无尽工坊保卫战',
    subtitle: '死守底部泡泡站防线！抵御红军狂潮与突变巨汉无尽波次，刷新个人最佳勋章！',
    bossName: '深渊突变裂隙',
    bossMaxHp: 999999,
    enemySpawnInterval: 2.0,
    enemyBurstCount: 4,
    initialRedPrewarm: 6,
    bruteSpawnInterval: 7.2,
    rewardGold: 0,
    gates: [
      { id: 'ed_g1', x: -4.4, z: 10.2, width: 4.4, op: 'mul', value: 2, style: 'gold', moveRangeX: 2.4, moveSpeed: 1.25, movePhase: 0 },
      { id: 'ed_g2', x: 4.4, z: 10.2, width: 4.4, op: 'add', value: 6, style: 'blue', moveRangeX: 2.4, moveSpeed: 1.25, movePhase: Math.PI },
      { id: 'ed_g3', x: -4.2, z: 3.2, width: 4.4, op: 'giant_jelly', value: 2, style: 'jelly', moveRangeX: 2.6, moveSpeed: 1.15, movePhase: 0.9 },
      { id: 'ed_g4', x: 4.2, z: 3.2, width: 4.4, op: 'frost_shield', value: 1, style: 'frost', moveRangeX: 2.6, moveSpeed: 1.15, movePhase: 4.04 },
      { id: 'ed_g5', x: 0, z: -3.2, width: 5.0, op: 'sub', value: 5, style: 'hazard', moveRangeX: 4.0, moveSpeed: 1.4, movePhase: 1.57 },
    ],
    walls: [],
    gears: [],
    nests: [],
    barrels: [
      { id: 'ed_br_l', x: -5.4, z: -0.4, hp: 18 },
      { id: 'ed_br_r', x: 5.4, z: -0.4, hp: 18 },
    ],
    zones: [
      { id: 'ed_heal', type: 'heal_sanctuary', x: 0, z: 6.8, width: 5.4, length: 3.6 },
    ],
    bumpers: [],
    bossSubTowers: [],
  };
}
