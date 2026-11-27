/** 各赛道模式与专属场景的调参常量（从 World3D.ts 原样搬出，不依赖 Three.js）。 */

/** MC-12: Glacier sled course tuning (snow overlay tiling, deck seats, icicle fall window, avalanche trigger). */
export const SLED_SNOW_PLANE_LEN = 46;
export const SLED_SNOW_REPEAT_V = 6;
export const SLED_SNOW_TILE_M = SLED_SNOW_PLANE_LEN / SLED_SNOW_REPEAT_V;
export const SLED_DECK_SEATS = 20;
export const SLED_TUBE_COLS = 9;
/** Bridge deck half length (deck spans z -22.5..22.5): treadmill scenery & course items stay over it. */
export const SLED_DECK_HALF = 21.5;
export const SLED_SCENERY_SPAN = 44;
export const SLED_ICICLE_FALL_START = 34;
export const SLED_ICICLE_LAND_AT = 13;
export const SLED_AVALANCHE_ROLL_START = 40;

/** MC-13: Lava jump tuning (squad formation, platform height, landing margin, hazard telegraph windows). */
export const LAVA_COL_SPACING = 0.55;
export const LAVA_ROW_SPACING = 0.6;
export const LAVA_MAX_COLS = 7;
export const LAVA_PLATFORM_TOP = 0.42;
export const LAVA_LAND_MARGIN = 0.2;
export const LAVA_ERUPT_TELEGRAPH = 32;
export const LAVA_ERUPT_AT = 3.0;
export const LAVA_ROCK_FALL_START = 30;
export const LAVA_ROCK_LAND_AT = 9;
export const LAVA_HIST_STEP = 0.15;
export const LAVA_HIST_LEN = 96;
export const LAVA_TEX_REPEAT_V = 4;
export const LAVA_TEX_TILE_M = SLED_SNOW_PLANE_LEN / LAVA_TEX_REPEAT_V;

/** MC-14: Asteroid dash tuning (low-gravity float, squad front offset, hazard telegraph windows, star field). */
export const AST_FLOAT_BASE = 0.3;
export const AST_FRONT_OFFSET = 0.9;
export const AST_METEOR_TELEGRAPH = 36;
export const AST_METEOR_IMPACT_AT = 2.2;
export const AST_METEOR_FALL_H = 22;
export const AST_BELT_HALF_DEPTH = 0.8;
export const AST_TRACK_REPEAT_V = 5;
export const AST_TRACK_TILE_M = SLED_SNOW_PLANE_LEN / AST_TRACK_REPEAT_V;
export const AST_STAR_CELL = 30;
export const AST_STARS_PER_CELL = 110;
/** MC-15: Haunted-castle night run tuning (squad front offset, marching bob, ghost wake range, wall depth, floor tiling). */
export const PK_FRONT_OFFSET = 0.9;
export const PK_RIDE_BASE = 0.04;
export const PK_GHOST_WAKE = 32;
export const PK_WALL_HALF_DEPTH = 0.7;
export const PK_FLOOR_REPEAT_V = 5;
export const PK_FLOOR_TILE_M = SLED_SNOW_PLANE_LEN / PK_FLOOR_REPEAT_V;
export const PK_STAR_CELL = 30;
export const PK_STARS_PER_CELL = 70;
/** MC-15: Background ambience of the night castle (also asserted by the self-check). */
export const PK_NIGHT_SKY = 0x120c2c;
/** MC-16: Desert pyramid tomb run tuning (squad front offset, running bob, floor tiling, dust cells, wall height). */
export const PY_FRONT_OFFSET = 0.9;
export const PY_RIDE_BASE = 0.04;
export const PY_FLOOR_REPEAT_V = 5;
export const PY_FLOOR_TILE_M = SLED_SNOW_PLANE_LEN / PY_FLOOR_REPEAT_V;
export const PY_DUST_CELL = 30;
export const PY_DUST_PER_CELL = 60;
/** MC-16: Sunset desert sky behind the pyramids (also asserted by the self-check). */
export const PY_DESERT_SKY = 0xf2b46b;
/** MC-17: Jungle temple vine-swing tuning (squad front offset, running bob, floor tiling, firefly cells, canopy beam). */
export const JG_FRONT_OFFSET = 0.9;
export const JG_RIDE_BASE = 0.04;
export const JG_FLOOR_REPEAT_V = 5;
export const JG_FLOOR_TILE_M = SLED_SNOW_PLANE_LEN / JG_FLOOR_REPEAT_V;
export const JG_FIREFLY_CELL = 30;
export const JG_FIREFLIES_PER_CELL = 55;
/** Height of the canopy beam the vines hang from, and the vine length down to the grab handle. */
export const JG_BEAM_Y = 8.6;
export const JG_VINE_LEN = 7.3;
/** MC-17: Misty jungle sky behind the temple (also asserted by the self-check). */
export const JG_JUNGLE_SKY = 0x8fd3b6;
/** MC-16 / MC-17: Tint of the far valley floor (dune sea / jungle valley below the viaduct) per dedicated scene. */
export type DedicatedSceneKind = 'none' | 'night_castle' | 'desert' | 'jungle' | 'pirate';
export const DEDICATED_ABYSS_TINT: Record<DedicatedSceneKind, number> = {
  none: 0xffffff,
  night_castle: 0x2a2152,
  desert: 0xf1c27d,
  jungle: 0x3f8f63,
  pirate: 0x2a86c8,
};
/** MC-18: Sunny open-sea sky behind the pirate fleet (also asserted by the self-check). */
export const PR_SEA_SKY = 0x7cc8f2;
/** MC-14: lobby room decor corners (x, z, rotY) around the trophy turntable. */
export const DECOR_SLOT_POS: Array<[number, number, number]> = [
  [-2.45, -1.6, 0.55],
  [2.45, -1.6, -0.55],
  [-1.98, 1.05, 0.35],
  [1.98, 1.05, -0.35],
];
