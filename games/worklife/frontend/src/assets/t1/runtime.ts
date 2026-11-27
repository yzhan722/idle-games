/**
 * 运行时要用的那一小部分：文件后缀优先级、键名、显示方式。
 * 美术合同（contract.ts，几百条说明）只给测试和脚本用，不进网页脚本。
 */

export const T1_EXTENSION_PRIORITY = ["webp", "png", "svg"] as const;
export type T1Extension = (typeof T1_EXTENSION_PRIORITY)[number];

export type ArtProfile = "icon" | "item" | "illustration";

/** 由目录决定；与合同里逐条写的 profile 一致（scripts/art-size.test.ts 守着）。 */
export function profileForKey(key: string): ArtProfile {
  if (key.startsWith("character/") || key.startsWith("monsters/") || key.startsWith("trees/") || key.startsWith("gather/")) {
    return "illustration";
  }
  if (key.startsWith("ui/") || key.startsWith("skills/")) {
    return "icon";
  }
  return "item";
}

/**
 * 暂借的物品图：六种区域精华（gameplay/zoneEssence.ts）还没有自己的图，先用意思最近的材料图。
 * 待补图登记在 C:Project_workloopart-debt.md；补上 materials/<id> 后删掉对应一行。
 */
export const ITEM_ART_ALIAS: Readonly<Record<string, string>> = {
  essence_forest: "materials/flower_spirit",
  essence_mine: "materials/elemental_core",
  essence_snow: "materials/frost_shard",
  essence_abyss: "materials/abyss_core",
  essence_celestial: "materials/angel_tear",
  essence_inferno: "materials/hellfire_ember",
};

const CRAFT_OUTPUT: Record<string, string> = {
  act_craft_lumber_t1: "materials/lumber_1",
  act_craft_weapon_wooden_sword: "equipment/weapon_wooden_sword",
  act_craft_wood_chest: "equipment/armor_wood_chest",
};

/** Folder for an item id: gear → equipment, edibles → consumables, everything else → materials. */
export function itemFolderFor(itemId: string): "equipment" | "consumables" | "materials" {
  if (
    /^(weapon|armor|tool|shield|offhand|accessory|ring|amulet|pendant|crown|charm)_/.test(itemId) ||
    /_(ring|amulet|pendant)$/.test(itemId) ||
    /^(sovereign|omega)_crown$/.test(itemId)
  ) {
    return "equipment";
  }
  if (/^(food|potion|drink|elixir|dish)_/.test(itemId)) return "consumables";
  return "materials";
}

export function t1KeyFor(kind: string, id: string): string | undefined {
  if (kind === "ui") return `ui/${id}`;
  if (kind === "tree") return `trees/${id}`;
  if (kind === "monster") return `monsters/${id}`;
  if (kind === "character") return `character/${id}`;
  if (kind === "skills") return `skills/${id}`;
  if (kind === "craft") return CRAFT_OUTPUT[id] || `${itemFolderFor(id)}/${id}`;
  if (kind === "equipment") return `equipment/${id}`;
  if (kind === "materials") return ITEM_ART_ALIAS[id] || `materials/${id}`;
  if (kind === "item") return id === "gold" ? "ui/gold" : ITEM_ART_ALIAS[id] || `${itemFolderFor(id)}/${id}`;
  return `${kind}/${id}`;
}
