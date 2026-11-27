import type { Flame, Hue, ResourceId, Terrain } from "./types.ts";

export const SAVE_VERSION = 1;
export const STEP = 1;
export const OFFLINE_CAP = 8 * 3600;

/** from、flames：从哪来，一句话和要用的火。 */
export const RESOURCES: Record<ResourceId, { name: string; hint: string; from: string; flames: Flame[] }> = {
  oil: { name: "灯油", hint: "点灯、养灯要用", from: "青火照着弟子就有", flames: ["verdant"] },
  star: { name: "星屑", hint: "升灯要用", from: "霜火照着弟子就有", flames: ["frost"] },
  insight: { name: "悟", hint: "记灯谱、修山台要用", from: "晨火照着弟子就有", flames: ["dawn"] },
  wish: { name: "愿", hint: "突破境界要用", from: "三种火同照一人，或守住一夜", flames: ["dawn", "verdant", "frost"] },
};

export const FLAMES: Record<Flame, { name: string; terrain: Terrain }> = {
  dawn: { name: "晨火", terrain: "ridge" },
  verdant: { name: "青火", terrain: "pine" },
  frost: { name: "霜火", terrain: "spring" },
};
export const FLAME_IDS: Flame[] = ["dawn", "verdant", "frost"];

export const TERRAIN_NAME: Record<Terrain, string> = {
  rock: "石台",
  ridge: "迎风脊",
  pine: "老松下",
  spring: "寒泉边",
};

/** 每单位光量每秒的产出。 */
export const HUES: Record<Hue, { name: string; mix: number; yields: Partial<Record<ResourceId, number>> }> = {
  dark: { name: "无光", mix: 0, yields: {} },
  dawn: { name: "晨光", mix: 1, yields: { insight: 0.1 } },
  verdant: { name: "青光", mix: 1, yields: { oil: 0.42 } },
  frost: { name: "霜光", mix: 1, yields: { star: 0.14 } },
  spring: { name: "春晓", mix: 2, yields: { insight: 0.07, oil: 0.26 } },
  jade: { name: "碧寒", mix: 2, yields: { oil: 0.26, star: 0.09 } },
  clear: { name: "霁色", mix: 2, yields: { insight: 0.07, star: 0.09 } },
  white: { name: "归白", mix: 3, yields: { wish: 0.0032, insight: 0.02, star: 0.02 } },
};

/** 光随灯位距离衰减：本位、邻位、隔一位、隔两位。 */
export const FALLOFF = [1, 0.6, 0.25, 0.12];
export const LINE_FALLOFF = 0.42;
export const BASE_RANGE = 2;
export const FAR_LEVEL = 4;
export const TERRAIN_BOOST = 1.3;
export const MIX_SHARE = 0.35;
export const BLENDER_SHARE = 0.2;
export const MIN_LIGHT = 0.15;

export const LAMP_MAX_LEVEL = 5;
export const LAMP_POWER_STEP = 0.45;
export const LAMP_UPKEEP = 0.07;
export const KEEPER_OIL = 0.5;
/** 拆灯退回投入的几成。 */
export const REFUND = 0.5;

export type TraitId = "quiet" | "duster" | "steady" | "thrifty" | "nocturnal" | "farsight" | "gregarious" | "blender";
export const TRAITS: Record<TraitId, { name: string; text: string }> = {
  quiet: { name: "喜静", text: "邻位没有别的弟子时，所得 ×1.25" },
  duster: { name: "拂尘", text: "邻位的灯，烟灰散得快三倍" },
  steady: { name: "勤恳", text: "所得 ×1.1" },
  thrifty: { name: "惜油", text: "邻位的灯，耗油减半" },
  nocturnal: { name: "夜行", text: "涨潮时，所得 ×2" },
  farsight: { name: "望远", text: "能借到更远一位的光" },
  gregarious: { name: "合群", text: "邻位每有一名弟子，所得 +15%" },
  blender: { name: "调色", text: "较弱的火也能参与混色" },
};

export interface DiscipleDef {
  id: string;
  name: string;
  note: string;
  likes: Hue[];
  dislikes: Hue[];
  traits: [TraitId, TraitId];
  joins: string;
}

export const DISCIPLES: DiscipleDef[] = [
  {
    id: "ayan",
    name: "阿檐",
    note: "在檐下听了十年雨，说灯芯响的时候山也在说话。",
    likes: ["dawn", "spring"],
    dislikes: ["frost"],
    traits: ["quiet", "duster"],
    joins: "一开始就在",
  },
  {
    id: "shilou",
    name: "石漏",
    note: "从前在山下刻漏房当差，一滴油也舍不得洒。",
    likes: ["verdant", "jade"],
    dislikes: ["dawn"],
    traits: ["steady", "thrifty"],
    joins: "修好第二层山台",
  },
  {
    id: "tingshuang",
    name: "听霜",
    note: "只在夜里说话。说黑潮来的时候，星落得最多。",
    likes: ["frost", "clear"],
    dislikes: ["spring"],
    traits: ["nocturnal", "farsight"],
    joins: "记下第一张灯谱",
  },
  {
    id: "douqing",
    name: "豆青",
    note: "染坊长大的孩子，总想把三种火调成一种从没见过的颜色。",
    likes: ["spring", "white"],
    dislikes: ["verdant"],
    traits: ["gregarious", "blender"],
    joins: "修好第三层山台",
  },
];

export interface PatternDef {
  id: string;
  name: string;
  shape: string;
  effect: string;
  cost: number;
}
export const PATTERNS: PatternDef[] = [
  { id: "line", name: "一线", shape: "同一层连着三盏同色灯", effect: "这三盏灯照到隔一位的光更亮", cost: 25 },
  { id: "tripod", name: "鼎足", shape: "三盏不同色的灯两两相邻", effect: "这三盏灯亮度 ×1.25", cost: 45 },
  { id: "facing", name: "对望", shape: "弟子夹在两盏同色灯正中", effect: "该弟子所得 ×1.3", cost: 70 },
  { id: "stairs", name: "连阶", shape: "连着三层各一盏同色灯，层层相邻", effect: "这三盏灯耗油减半", cost: 100 },
];

export interface TerraceDef {
  name: string;
  terrain: Terrain[];
  cost: Partial<Record<ResourceId, number>>;
}
export const TERRACES: TerraceDef[] = [
  { name: "山脚台", terrain: ["rock", "pine", "rock", "rock", "spring", "rock", "rock"], cost: {} },
  { name: "听松台", terrain: ["rock", "rock", "ridge", "pine", "rock", "rock"], cost: { oil: 90 } },
  { name: "寒泉台", terrain: ["ridge", "rock", "rock", "spring", "rock"], cost: { oil: 700, star: 100, insight: 90 } },
];

/** 小样只做前两重境界，全作七重。 */
export const REALMS = ["点灯", "明窍", "守夜", "照山", "通明", "燃星", "长明"];
export const SLICE_REALM = 1;
export const VIGIL_HUES = 3;
export const VIGIL_COST = 18;

export const TIDE_FIRST = 240;
export const TIDE_CALM = 180;
export const TIDE_SURGE = 20;
export const TIDE_BASE = 0.9;
/** 第一夜轻一点，新手提示教的摆法（人居中、两灯夹人）刚好挡得住；第二夜起照旧。 */
export const TIDE_GENTLE = 0.8;
export const TIDE_GROWTH = 0.08;
export const TIDE_CAP = 1.8;
export const TIDE_DEPTH = [1, 0.6, 0.3, 0.15];
export const TIDE_SOOT = 0.5;
export const SOOT_MAX = 0.6;
export const SOOT_DECAY = 0.004;
export const DUSTER_RATE = 3;
export const WIPE_AMOUNT = 0.2;
export const NIGHT_WISH = 0.5;
/** 至少几盏灯才算守住。 */
export const HOLD_LAMPS = 3;
/** 第一次黑潮退去时落下的星屑。第六盏灯起要星屑，没点过霜火的人会永远停在五盏；这一份够点第六、七盏，或升一次灯。 */
export const FIRST_STAR = 5;

export const XP_RATE = 0.05;
export const XP_BASE = 6;
export const XP_GROWTH = 1.6;
export const LEVEL_BONUS = 0.12;
export const DISCIPLE_MAX_LEVEL = 10;
