import type { EnhancedContentPack, EnhancedPlayerState } from "./types";
import { appendLog, ensurePlayerExtensions, GATHER_SKILL_FOR_CRAFT } from "./storage";

/**
 * MWI 房屋 (Houses): one room per skill. Every level costs gold plus that skill's own materials
 * (a sink for the things you gather anyway) and pays back as a permanent bonus to the skill.
 * Profession rooms: +1% XP and +1% efficiency per level. 训练场 (combat): +1% combat XP and
 * +1% rare find per level. Eight levels each.
 */
export const HOUSE_MAX_LEVEL = 8;
export const HOUSE_XP_PER_LEVEL = 0.01;
export const HOUSE_EFFICIENCY_PER_LEVEL = 1; // percent points
export const HOUSE_RARE_FIND_PER_LEVEL = 1; // percent points

export type HouseRoomDef = {
  id: string;
  name: string;
  /** `skill_<profession>` or "skill_combat". */
  skillId: string;
  blurb: string;
  emoji: string;
  /** Materials per level (clamped at the last entry when the list is shorter). */
  materials: string[];
};

export const HOUSE_ROOMS: HouseRoomDef[] = [
  // 材料按等级逐项列出：levels 1-2 → [0], 3-4 → [1], 5-6 → [2], 7-8 → [3]（每带两级）。
  // 8 项的列表（炼金室）则每级一种材料。
  { id: "lumber_yard", name: "木料场", skillId: "skill_woodcutter", blurb: "伐木 / 木工", emoji: "🌲", materials: ["wood_1", "wood_2", "wood_3", "wood_4"] },
  { id: "forge", name: "锻炉间", skillId: "skill_blacksmith", blurb: "挖矿 / 锻造", emoji: "⚒️", materials: ["ore_1", "ore_2", "ore_3", "ore_4"] },
  { id: "barn", name: "牲口棚", skillId: "skill_farmer", blurb: "种植 / 畜牧", emoji: "🐄", materials: ["fiber_1", "wool", "egg", "milk"] },
  { id: "kitchen", name: "厨房", skillId: "skill_chef", blurb: "钓鱼 / 烹饪", emoji: "🍲", materials: ["fish_river", "shrimp", "fish_sea", "fish_lake"] },
  { id: "sewing_room", name: "缝纫间", skillId: "skill_tailor", blurb: "采集 / 缝纫", emoji: "🧵", materials: ["fiber_1", "fiber_2", "fiber_3", "fiber_4"] },
  { id: "laboratory", name: "炼金室", skillId: "skill_alchemist", blurb: "水晶 / 炼金", emoji: "⚗️", materials: ["crystal_1", "crystal_2", "crystal_3", "crystal_4", "crystal_5", "crystal_6", "crystal_7", "crystal_8"] },
  { id: "training_ground", name: "训练场", skillId: "skill_combat", blurb: "战斗经验 / 稀有发现", emoji: "🎯", materials: ["wood_1", "ore_1", "lumber_1", "ingot_1"] },
];

export const HOUSE_ROOM_BY_ID: Record<string, HouseRoomDef> = Object.fromEntries(HOUSE_ROOMS.map((r) => [r.id, r]));

export type HouseState = { rooms: Record<string, number> };

export function ensureHouse(player: EnhancedPlayerState): HouseState {
  ensurePlayerExtensions(player);
  if (!player.house) player.house = { rooms: {} };
  return player.house;
}

export function roomLevel(player: EnhancedPlayerState, roomId: string): number {
  return Math.max(0, Math.min(HOUSE_MAX_LEVEL, Number(player.house?.rooms?.[roomId] || 0)));
}

export function roomForSkill(skillId: string): HouseRoomDef | undefined {
  // 采集/生产技能拆分后：职业房间同时加成两侧（生产技能映射回其采集技能）
  const canonical = GATHER_SKILL_FOR_CRAFT[skillId] || skillId;
  return HOUSE_ROOMS.find((r) => r.skillId === canonical);
}

/** Level of the room that boosts `skillId` (0 when none built). */
export function houseLevelForSkill(player: EnhancedPlayerState, skillId: string): number {
  const room = roomForSkill(skillId);
  return room ? roomLevel(player, room.id) : 0;
}

export type HouseCost = { gold: number; materials: Array<{ itemId: string; qty: number }> };

/** Cost of upgrading `roomId` from `level − 1` to `level`. */
export function roomUpgradeCost(room: HouseRoomDef, level: number): HouseCost {
  // 材料按两级一带取：levels 1-2 → [0]，3-4 → [1]，5-6 → [2]，7-8 → [3]；
  // 8 项材料的房间（炼金室）则每级一种——高阶水晶由此获得用途。
  const band = Math.min(room.materials.length - 1, room.materials.length >= 8 ? level - 1 : Math.floor((level - 1) / 2));
  return {
    gold: 200 * level * level,
    materials: [{ itemId: room.materials[band], qty: 10 + 10 * level }],
  };
}

export function totalHouseLevel(player: EnhancedPlayerState): number {
  return HOUSE_ROOMS.reduce((sum, r) => sum + roomLevel(player, r.id), 0);
}

export function upgradeRoom(
  player: EnhancedPlayerState,
  pack: EnhancedContentPack,
  roomId: string
): { ok: boolean; error?: string; level?: number; cost?: HouseCost } {
  const room = HOUSE_ROOM_BY_ID[roomId];
  if (!room) return { ok: false, error: "unknown_room" };
  const house = ensureHouse(player);
  const current = roomLevel(player, roomId);
  if (current >= HOUSE_MAX_LEVEL) return { ok: false, error: "max_level" };
  const next = current + 1;
  const cost = roomUpgradeCost(room, next);
  const items = (pack.items as Array<{ id: string }>).map((i) => i.id);
  for (const m of cost.materials) {
    if (!items.includes(m.itemId)) return { ok: false, error: `unknown_material:${m.itemId}` };
    if ((player.inventory[m.itemId] || 0) < m.qty) return { ok: false, error: "missing_materials", cost };
  }
  if ((player.inventory.gold || 0) < cost.gold) return { ok: false, error: "no_gold", cost };
  player.inventory.gold -= cost.gold;
  player.stats!.totalGoldSpent += cost.gold;
  for (const m of cost.materials) {
    player.inventory[m.itemId] -= m.qty;
    if (player.inventory[m.itemId] <= 0) delete player.inventory[m.itemId];
  }
  house.rooms[roomId] = next;
  appendLog(player, `${room.name}升到 ${next} 级`);
  return { ok: true, level: next, cost };
}

export function houseView(player: EnhancedPlayerState, pack: EnhancedContentPack) {
  ensureHouse(player);
  const names = new Map((pack.items as Array<{ id: string; name?: string }>).map((i) => [i.id, i.name || i.id]));
  return {
    totalLevel: totalHouseLevel(player),
    maxLevel: HOUSE_MAX_LEVEL,
    rooms: HOUSE_ROOMS.map((r) => {
      const level = roomLevel(player, r.id);
      const next = level < HOUSE_MAX_LEVEL ? roomUpgradeCost(r, level + 1) : undefined;
      return {
        ...r,
        level,
        bonus:
          r.skillId === "skill_combat"
            ? { combatXpPct: level * HOUSE_XP_PER_LEVEL * 100, rareFindPct: level * HOUSE_RARE_FIND_PER_LEVEL }
            : { xpPct: level * HOUSE_XP_PER_LEVEL * 100, efficiencyPct: level * HOUSE_EFFICIENCY_PER_LEVEL },
        nextCost: next
          ? {
              gold: next.gold,
              materials: next.materials.map((m) => ({ ...m, name: names.get(m.itemId) || m.itemId, have: player.inventory[m.itemId] || 0 })),
              affordable: (player.inventory.gold || 0) >= next.gold && next.materials.every((m) => (player.inventory[m.itemId] || 0) >= m.qty),
            }
          : undefined,
      };
    }),
  };
}
