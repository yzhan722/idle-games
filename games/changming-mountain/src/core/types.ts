/** 三种基础火：晨火、青火、霜火。 */
export type Flame = "dawn" | "verdant" | "frost";
/** 光色：三种纯色，三种两两混色，一种三色归白，以及无光。 */
export type Hue = Flame | "spring" | "jade" | "clear" | "white" | "dark";
export type ResourceId = "oil" | "star" | "insight" | "wish";
export type Terrain = "rock" | "ridge" | "pine" | "spring";
export type Resources = Record<ResourceId, number>;

export interface Slot {
  id: number;
  terrace: number;
  index: number;
  /** 横向坐标，相邻台阶错半格。 */
  x: number;
  terrain: Terrain;
  /** 距左右山边的格数，0 为最外。 */
  depth: number;
  neighbors: number[];
}

export interface Lamp {
  flame: Flame;
  level: number;
  /** 烟灰，0 干净，越高越暗，不会让灯丢失。 */
  soot: number;
}

export interface Disciple {
  id: string;
  slot: number | null;
  xp: number;
  level: number;
}

export interface TideState {
  phase: "calm" | "surge";
  /** 当前阶段还剩多少秒。 */
  left: number;
  index: number;
  /** 本次涨潮里是否有灯新积了灰。 */
  sooted: boolean;
}

export interface VigilState {
  armed: boolean;
  /** 涨潮期间条件是否一直满足。 */
  holding: boolean;
}

export interface GameState {
  version: number;
  /** 已进行的游戏秒数。 */
  time: number;
  res: Resources;
  lamps: (Lamp | null)[];
  disciples: Disciple[];
  terraces: number;
  realm: number;
  /** 已见过的灯谱。 */
  seen: string[];
  /** 已记下（生效）的灯谱。 */
  inscribed: string[];
  tide: TideState;
  vigil: VigilState;
  nightsHeld: number;
  nights: number;
  /** 灯油供应充足度，0.5～1。 */
  fuel: number;
  savedAt: number;
}

export type GameEvent =
  | { type: "tideStart"; index: number }
  /** lit 亮着的灯数，breached 没挡住的灯数，soot 其中最重的灰，star 头一夜落下的星屑。 */
  | { type: "tideEnd"; index: number; held: boolean; wish: number; lit: number; breached: number; soot: number; star: number }
  | { type: "patternSeen"; id: string }
  | { type: "joined"; id: string }
  | { type: "discipleLevel"; id: string; level: number }
  | { type: "vigilFailed"; reason: string }
  | { type: "realm"; realm: number };

export type ActionResult = { ok: true } | { ok: false; reason: string };
